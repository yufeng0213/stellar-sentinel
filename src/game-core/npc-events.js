/**
 * NPC 主动事件：每日小事件 + 每周大事件。
 * 事件选择和数值全部本地确定性；文案先用模板，P3 再交给 LLM。
 */

import { ITEMS, REGIONS } from './data.js'
import { recordWeeklyMemories } from './memory.js'
import { activeEscorts, startEscort } from './escort.js'
import { PERSONA_EVENTS, personaEventFor } from './npc-persona-events.js'
import { createRng } from './rng.js'

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

export const EVENT_TYPES = {
  message: { label: '信息', color: 'cyan', base: 30, major: false },
  gift: { label: '送礼', color: 'jade', base: 15, major: true },
  favor: { label: '求助', color: 'amber', base: 15, major: true },
  quest: { label: '邀请', color: 'violet', base: 15, major: true },
  romance: { label: '靠近', color: 'red', base: 8, major: true },
  confession: { label: '表白', color: 'red', base: 10, major: true },
  jealousy: { label: '吃醋', color: 'red', base: 8, major: true },
  escort: { label: '护送', color: 'amber', base: 9, major: true },
  persona: { label: '专属', color: 'violet', base: 8, major: true },
  conflict: { label: '冲突', color: 'red', base: 10, major: true },
  gossip: { label: '八卦', color: 'amber', base: 7, major: false },
}

const GIFT_BY_INTEREST = {
  交易: 'ration',
  传闻: 'chip',
  武器: 'alloy',
  星图: 'ore',
  共鸣: 'shard',
  遗物: 'relic',
  植物: 'spore',
  机械: 'scrap',
  旧技术: 'chip',
  冥想: 'stim',
}

function pushWorld(run, text, kind = 'info') {
  if (!Array.isArray(run.worldEvents)) run.worldEvents = []
  run.worldEvents.unshift({ day: run.day, text, kind })
  if (run.worldEvents.length > 60) run.worldEvents.length = 60
}

function addItem(run, itemId, count = 1) {
  if (!ITEMS[itemId]) return
  run.inv[itemId] = (run.inv[itemId] || 0) + count
}

function takeItem(run, itemId, count = 1) {
  if (!run.inv[itemId] || run.inv[itemId] < count) return false
  run.inv[itemId] -= count
  if (run.inv[itemId] <= 0) delete run.inv[itemId]
  return true
}

function isHostile(npc) {
  return Boolean(npc.hostile)
}

function hasTag(npc, id) {
  return (npc.tags || []).includes(id)
}

function giftItemFor(npc) {
  for (const interest of npc.interests || []) {
    if (GIFT_BY_INTEREST[interest]) return GIFT_BY_INTEREST[interest]
  }
  return 'ration'
}

function favorAsk(run, npc, rng) {
  if (npc.injured) {
    const medicine = ['medkit', 'ration'].find((id) => (run.inv[id] || 0) > 0)
    if (medicine) return { kind: 'medicine', itemId: medicine }
    return { kind: 'credits', credits: 20 + rng.int(0, 15), treatment: true }
  }
  const candidates = Object.keys(run.inv || {}).filter((id) => ITEMS[id])
  if (candidates.length && rng.chance(0.55)) {
    return { kind: 'item', itemId: rng.pick(candidates) }
  }
  return { kind: 'credits', credits: 15 + rng.int(0, 25) }
}

function questTargets(run) {
  const all = run.map.layers
    .flat()
    .map((id) => run.map.nodes[id])
    .filter((node) => (
      node &&
      node.id !== run.location &&
      ['gather', 'event'].includes(node.type) &&
      !run.cleared.includes(node.id)
    ))
  const local = all.filter((node) => node.act === run.act)
  return local.length ? local : all
}

function questTarget(run, rng) {
  const nodes = questTargets(run)
  return nodes.length ? rng.pick(nodes) : null
}

function gossipPartner(run, npc, rng) {
  const edges = (run.npcEdges || []).filter((edge) => edge.a === npc.id || edge.b === npc.id)
  if (!edges.length) return null
  const edge = rng.pick(edges)
  const otherId = edge.a === npc.id ? edge.b : edge.a
  return { edge, other: run.npcs[otherId] }
}

function eventEligible(run, npc, type, rng) {
  if (!npc.alive) return false
  if (type === 'conflict') return npc.relation.grievance >= 35 || npc.hostile
  if (isHostile(npc)) return false

  const relation = npc.relation
  if (type === 'message') return true
  if (type === 'persona') {
    const personaEvent = personaEventFor(npc)
    return !!personaEvent &&
      relation.trust >= personaEvent.minTrust &&
      !(npc.personaDone || []).includes(personaEvent.id)
  }
  if (type === 'gift') return relation.trust >= 10 && (npc.personality.generosity >= 28 || hasTag(npc, 'gift'))
  if (type === 'favor') return relation.trust >= 20
  if (type === 'quest') return relation.trust >= 30 && relation.closeness >= 15 && questTargets(run).length > 0
  if (type === 'romance') {
    return relation.trust >= 40 &&
      relation.closeness >= 55 &&
      !hasTag(npc, 'commitmentphobe') &&
      !hasTag(npc, 'solo')
  }
  if (type === 'confession') {
    return !npc.lover &&
      !npc.confessed &&
      relation.trust >= 50 &&
      relation.closeness >= 60 &&
      !hasTag(npc, 'commitmentphobe') &&
      !hasTag(npc, 'solo')
  }
  if (type === 'jealousy') {
    return npc.lover && Object.values(run.npcs || {}).some((other) => (
      other.id !== npc.id && other.alive && other.lover
    ))
  }
  if (type === 'escort') {
    return npc.injured &&
      relation.trust >= 20 &&
      !activeEscorts(run).some((escort) => escort.npcId === npc.id)
  }
  if (type === 'gossip') return relation.trust >= 10 && (run.npcEdges || []).some((edge) => edge.a === npc.id || edge.b === npc.id)
  return false
}

function eventWeight(run, npc, type) {
  const base = EVENT_TYPES[type]?.base || 5
  const relation = npc.relation
  let weight = base
  weight *= npc.tagEffects?.eventWeight?.[type] || 1

  if (type === 'message') weight *= 1 + relation.trust / 180
  if (type === 'persona') weight *= 1 + relation.closeness / 100
  if (type === 'gift') weight *= 1 + npc.personality.generosity / 160
  if (type === 'favor') weight *= (1 + relation.trust / 150) * (npc.injured ? 2 : 1)
  if (type === 'escort' && npc.injured) weight *= 2.5
  if (type === 'quest') weight *= 1 + relation.trust / 120
  if (type === 'romance') weight *= 1 + relation.closeness / 90
  if (type === 'confession') weight *= 2.2
  if (type === 'conflict') weight *= 1 + relation.grievance / 70
  if (type === 'gossip') weight *= 1 + (hasTag(npc, 'gossip') ? 0.8 : 0)

  const pity = run.eventPity || {}
  if (type === 'romance') weight *= 1 + clamp((run.day - (pity.romance || 0)) / 14, 0, 2)
  if (type === 'quest') weight *= 1 + clamp((run.day - (pity.quest || 0)) / 12, 0, 1.6)

  return Math.max(0.1, weight)
}

function cooldownBlocked(run, npc, type) {
  const cooldowns = run.eventCooldowns || {}
  const lastType = cooldowns[`${npc.id}:${type}`] || 0
  const lastAny = cooldowns[`${npc.id}:*`] || 0
  if (lastType && run.day - lastType < 3) return true
  if (lastAny && run.day - lastAny < 1) return true
  if ((type === 'romance' || type === 'conflict') && lastType && run.day - lastType < 5) return true
  return false
}

function candidates(run, rng, weekly = false) {
  const list = []
  Object.values(run.npcs || {}).forEach((npc) => {
    if (npc.active === false) return
    Object.keys(EVENT_TYPES).forEach((type) => {
      const meta = EVENT_TYPES[type]
      if (weekly && !meta.major) return
      if (cooldownBlocked(run, npc, type)) return
      if (!eventEligible(run, npc, type, rng)) return
      list.push({ npc, type, weight: eventWeight(run, npc, type) * (weekly ? 1.4 : 1) })
    })
  })
  return list
}

function pickWeighted(rng, list) {
  const total = list.reduce((sum, item) => sum + item.weight, 0)
  if (total <= 0) return null
  let roll = rng.next() * total
  for (const item of list) {
    roll -= item.weight
    if (roll <= 0) return item
  }
  return list[list.length - 1]
}

function messageText(npc) {
  const archetype = npc.archetype?.id
  if (archetype === 'gloomy_ghost') return '“你今天回来得比平时晚。”他停了一下，又补了一句，“我没在等。”'
  if (archetype === 'dry_ghost') return '“我在门口。你回来的时候不用绕路。”'
  if (archetype === 'jiahao') return '“刚处理完一点事。”他顿了顿，“不算什么大事。真的。”'
  if (archetype === 'sunshine') return '“今天有好好吃饭吗？没有的话我给你留了一份。”'
  if (archetype === 'tycoon') return '“车已经在楼下了。别让我等太久。”'
  if (archetype === 'tsundere') return '“谁在等你了。只是刚好看到你的消息。”'
  if (archetype === 'tease') return '“这么久才回。是不是在想怎么回我？”'
  if (archetype === 'cold_elite') return '“确认一下你还安全。没有别的事。”'
  if (archetype === 'loyal_dog') return '“你回来了吗？我今天一直在这里。”'
  if (archetype === 'homemaker') return '“药带了吗？外面降温了。”'
  if (archetype === 'rough') return '“还活着就回个话。”'
  if (hasTag(npc, 'gossip')) return `“听说你最近在星图上跑得很勤。我这边有点消息，要不要听？”`
  if (hasTag(npc, 'romantic')) return '“今天的光很淡。你那边还安静吗？”'
  if (hasTag(npc, 'hotblooded')) return '“活着就回个话。别让我去废墟里找你。”'
  if (hasTag(npc, 'aloof')) return '“没什么事。只是确认你还在。”'
  return '“最近怎么样？有空回个话。”'
}

function buildEvent(run, rng, npc, type, weekly = false) {
  const relation = npc.relation
  const day = run.day
  const id = `${weekly ? 'w' : 'd'}-${day}-${type}-${npc.id}-${rng.int(1000, 9999)}`
  const base = {
    id,
    day,
    week: Math.floor((day - 1) / 7) + 1,
    npcId: npc.id,
    type,
    weekly,
    status: 'pending',
    title: '',
    text: '',
    payload: {},
    choices: [],
  }

  if (type === 'message') {
    base.title = `${npc.name} 发来一条信息`
    base.text = messageText(npc)
    base.choices = [
      { id: 'reply', label: '回复' },
      { id: 'ignore', label: '暂不回复' },
    ]
    base.payload = { reply: '收到。' }
  } else if (type === 'persona') {
    const definition = personaEventFor(npc)
    if (!definition) return null
    base.title = definition.title
    base.text = definition.text
    base.payload = { personaId: definition.id }
    base.choices = definition.choices.map((choice) => ({ id: choice.id, label: choice.label }))
  } else if (type === 'gift') {
    const itemId = giftItemFor(npc)
    base.title = `${npc.name} 送来一件东西`
    base.text = `“这个我用不上，你拿着。”他递过来${ITEMS[itemId].name}。`
    base.payload = { itemId }
    base.choices = [
      { id: 'accept', label: '收下' },
      { id: 'decline', label: '婉拒' },
    ]
  } else if (type === 'favor') {
    const ask = favorAsk(run, npc, rng)
    base.payload = ask
    base.title = `${npc.name} 想请你帮忙`
    base.text = ask.kind === 'medicine'
      ? `“我受了点伤……你手上还有${ITEMS[ask.itemId].name}吗？我可以用东西换。”`
      : ask.kind === 'item'
        ? `“你手上那件${ITEMS[ask.itemId].name}，能不能先借我？我很快还。”`
        : `“借我 ${ask.credits} 信用点。${ask.treatment ? '我需要去诊所处理一下伤口。' : '下周之前还你。'}”`
    base.choices = [
      { id: 'accept', label: ask.kind === 'medicine' ? '给他药' : '借给他' },
      { id: 'decline', label: '拒绝' },
    ]
  } else if (type === 'quest') {
    const target = questTarget(run, rng)
    if (!target) return null
    const region = REGIONS[target.region]
    const reward = {
      credits: 30 + (region?.danger || 1) * 12,
      itemId: rng.pick(region?.items || ['scrap']),
    }
    base.title = `${npc.name} 邀你一起探索`
    base.text = `“${region?.name || '附近'}有一个没登记的节点。我一个人不太放心，一起去？”`
    base.payload = {
      nodeId: target.id,
      nodeTitle: target.title,
      region: target.region,
      deadline: day + 5,
      reward,
    }
    base.choices = [
      { id: 'accept', label: '一起去' },
      { id: 'decline', label: '这次不了' },
    ]
  } else if (type === 'romance') {
    const region = REGIONS[npc.home]
    base.title = `${npc.name} 想见你`
    base.text = npc.lover
      ? `“今天没什么事。就是想见你。”${npc.name}在频道里停了一下，又补了一句，“别带别人。”`
      : `“${region?.name || '空港'}的休整点今晚很安静。你要是有空，可以过来。”`
    base.payload = { place: npc.home, lover: Boolean(npc.lover) }
    base.choices = [
      { id: 'accept', label: '赴约' },
      { id: 'decline', label: '改天' },
    ]
  } else if (type === 'confession') {
    base.title = `${npc.name} 想问你一件事`
    base.text = '“我们这样……算是什么？”他没有看你，手指停在桌沿上，像是在等一个会改变什么答案。'
    base.payload = { confession: true }
    base.choices = [
      { id: 'accept', label: '我们试试' },
      { id: 'decline', label: '还是做朋友' },
    ]
  } else if (type === 'jealousy') {
    const other = Object.values(run.npcs || {}).find((item) => (
      item.id !== npc.id && item.alive && item.lover
    ))
    base.title = `${npc.name} 闻到了别人身上的味道`
    base.text = `“你最近……是不是也去了${other?.name || '别人'}那里？”他没有提高声音，但把门挡住了。`
    base.payload = { otherId: other?.id || null }
    base.choices = [
      { id: 'honest', label: '坦白' },
      { id: 'deny', label: '否认' },
    ]
  } else if (type === 'escort') {
    base.title = `${npc.name} 需要你送他回去`
    base.text = '“我走不快……能不能送我回空港诊所？”他靠着墙，伤口没有再流血，但脸色很差。'
    base.payload = { npcId: npc.id, reward: 35 }
    base.choices = [
      { id: 'accept', label: '送他回城' },
      { id: 'decline', label: '让他自己处理' },
    ]
  } else if (type === 'conflict') {
    const amount = Math.min(60, 20 + Math.round(relation.grievance / 2))
    base.title = `${npc.name} 提起了旧账`
    base.text = npc.hostile
      ? `“你以为这件事就这么过去了？”他挡在你面前。`
      : `“上次的事，你还没给个说法。”`
    base.payload = { amount }
    base.choices = [
      { id: 'pay', label: `赔 ${amount} 信用点` },
      { id: 'stand', label: '不退' },
    ]
  } else if (type === 'gossip') {
    const partner = gossipPartner(run, npc, rng)
    if (!partner?.other) return null
    const warm = partner.edge.trust >= 55
    base.title = `${npc.name} 带来一条消息`
    base.text = warm
      ? `“${partner.other.name} 最近总提起你。你们是不是走得很近？”`
      : `“${partner.other.name} 最近在背后说你。你自己留个心。”`
    base.payload = { otherId: partner.other.id, warm }
    base.choices = [
      { id: 'listen', label: '听下去' },
      { id: 'ignore', label: '不感兴趣' },
    ]
  }

  if (!base.text) return null
  return base
}

function markCooldown(run, npc, type) {
  run.eventCooldowns = run.eventCooldowns || {}
  run.eventCooldowns[`${npc.id}:${type}`] = run.day
  run.eventCooldowns[`${npc.id}:*`] = run.day
}

function expireInbox(run) {
  ;(run.inbox || []).forEach((event) => {
    if (event.status !== 'pending') return
    if (run.day - event.day <= 7) return
    event.status = 'expired'
    event.resolvedDay = run.day
    event.result = '这件事已经过去了。'
  })
}

function expireQuests(run) {
  ;(run.quests || []).forEach((quest) => {
    if (quest.status !== 'active' || quest.deadline >= run.day) return
    quest.status = 'failed'
    quest.completedDay = run.day
    const npc = run.npcs[quest.npcId]
    if (npc) {
      npc.relation.trust = clamp(npc.relation.trust - 4, 0, 100)
      npc.relation.grievance = clamp(npc.relation.grievance + 2, 0, 100)
    }
    pushWorld(run, `你没能赶上和 ${npc?.name || '某人'} 的约定。`, 'bad')
  })
}

function weeklySummary(run) {
  const start = run.day - 6
  const recent = (run.worldEvents || [])
    .filter((entry) => entry.day >= start && entry.day <= run.day)
    .slice(0, 8)
  const highlights = recent.filter((entry) => entry.kind === 'good' || entry.kind === 'bad').slice(0, 3)
  const inboxHighlights = (run.inbox || [])
    .filter((event) => event.day >= start && event.day <= run.day)
    .slice(0, 2)
    .map((event) => `${run.npcs?.[event.npcId]?.name || '有人'}的${EVENT_TYPES[event.type]?.label || '消息'}`)
  const parts = [...inboxHighlights, ...highlights.map((entry) => entry.text)]
  const summary = parts.length
    ? `本周：${parts.join('；')}`
    : '本周没有特别的事。星区安静得有点不真实。'
  run.weekly = {
    week: Math.floor((run.day - 1) / 7) + 1,
    day: run.day,
    summary,
    highlights: parts,
  }
  return run.weekly
}

export function generateNpcEvents(run, options = {}) {
  if (!run?.npcs) return []
  run.inbox = run.inbox || []
  run.eventCooldowns = run.eventCooldowns || {}
  run.eventPity = run.eventPity || {}
  run.quests = run.quests || []
  if (run.lastEventDay === run.day && !options.force) return []

  run.lastEventDay = run.day
  expireInbox(run)
  expireQuests(run)

  const rng = createRng(`${run.seed}:npc-events:${run.day}`)
  const created = []
  const dueWeekly = run.day % 7 === 0
  const pendingCount = run.inbox.filter((event) => event.status === 'pending').length
  const usedNpc = new Set()
  const usedTypes = new Set()

  if (pendingCount < 6) {
    const daily = candidates(run, rng, false)
    const count = daily.length && rng.chance(0.35) ? 2 : daily.length ? 1 : 0
    for (let index = 0; index < count; index += 1) {
      const pool = daily.filter((item) => (
        !usedNpc.has(item.npc.id) &&
        !usedTypes.has(item.type)
      ))
      const picked = pickWeighted(rng, pool.length ? pool : daily.filter((item) => !usedNpc.has(item.npc.id)))
      if (!picked) break
      const event = buildEvent(run, rng, picked.npc, picked.type)
      if (!event) continue
      run.inbox.unshift(event)
      markCooldown(run, picked.npc, picked.type)
      usedNpc.add(picked.npc.id)
      usedTypes.add(picked.type)
      created.push(event)
    }
  }

  if (dueWeekly) {
    const weeklyCandidates = candidates(run, rng, true).filter((item) => !usedNpc.has(item.npc.id))
    const picked = pickWeighted(rng, weeklyCandidates)
    if (picked) {
      const event = buildEvent(run, rng, picked.npc, picked.type, true)
      if (event) {
        run.inbox.unshift(event)
        markCooldown(run, picked.npc, picked.type)
        created.push(event)
      }
    }
    weeklySummary(run)
    recordWeeklyMemories(run)
  }

  if (created.some((event) => event.type === 'romance')) run.eventPity.romance = run.day
  if (created.some((event) => event.type === 'quest')) run.eventPity.quest = run.day
  if (run.inbox.length > 12) run.inbox.length = 12
  return created
}

function resolveMessage(run, npc, event, choice) {
  if (choice === 'reply') {
    npc.relation.trust = clamp(npc.relation.trust + 2, 0, 100)
    npc.relation.closeness = clamp(npc.relation.closeness + 1, 0, 100)
    return '你回了消息。他很快发来一个简短的确认。'
  }
  npc.relation.closeness = clamp(npc.relation.closeness - 1, 0, 100)
  return '你没有回复。消息停在那里。'
}

function resolvePersona(run, npc, event, choice) {
  const definition = Object.values(PERSONA_EVENTS).find((item) => item.id === event.payload.personaId)
  const picked = definition?.choices.find((item) => item.id === choice)
  if (!definition || !picked) return { error: '这个专属事件已经失效' }
  const outcome = picked.outcome || {}
  if (typeof outcome.trust === 'number') npc.relation.trust = clamp(npc.relation.trust + outcome.trust, 0, 100)
  if (typeof outcome.closeness === 'number') npc.relation.closeness = clamp(npc.relation.closeness + outcome.closeness, 0, 100)
  if (typeof outcome.grievance === 'number') npc.relation.grievance = clamp(npc.relation.grievance + outcome.grievance, 0, 100)
  if (typeof outcome.fear === 'number') npc.relation.fear = clamp(npc.relation.fear + outcome.fear, 0, 100)
  if (typeof outcome.mental === 'number') run.player.mental = clamp(run.player.mental + outcome.mental, 0, run.player.mentalMax)
  if (typeof outcome.hp === 'number') run.player.hp = clamp(run.player.hp + outcome.hp, 1, run.player.hpMax)
  if (typeof outcome.credits === 'number') run.player.credits = Math.max(0, run.player.credits + outcome.credits)
  if (outcome.itemId) addItem(run, outcome.itemId, outcome.itemCount || 1)
  if (outcome.flag) run.flags[outcome.flag] = (run.flags[outcome.flag] || 0) + 1
  npc.personaDone = [...new Set([...(npc.personaDone || []), definition.id])]
  return outcome.text || '这段对话停在这里。'
}

function resolveGift(run, npc, event, choice) {
  if (choice === 'accept') {
    addItem(run, event.payload.itemId, 1)
    npc.relation.trust = clamp(npc.relation.trust + 3, 0, 100)
    npc.relation.closeness = clamp(npc.relation.closeness + 2, 0, 100)
    return `你收下了${ITEMS[event.payload.itemId].name}。`
  }
  npc.relation.trust = clamp(npc.relation.trust - 2, 0, 100)
  return '你婉拒了。他没有坚持。'
}

function resolveFavor(run, npc, event, choice) {
  if (choice === 'decline') {
    npc.relation.trust = clamp(npc.relation.trust - 2, 0, 100)
    npc.relation.closeness = clamp(npc.relation.closeness - 1, 0, 100)
    return '你拒绝了。他说“没事”，但语气冷了一点。'
  }
  if (event.payload.kind === 'medicine') {
    if (!takeItem(run, event.payload.itemId, 1)) return { error: `你没有${ITEMS[event.payload.itemId].name}` }
    npc.injured = false
    npc.relation.trust = clamp(npc.relation.trust + 7, 0, 100)
    npc.relation.closeness = clamp(npc.relation.closeness + 4, 0, 100)
    return `你把${ITEMS[event.payload.itemId].name}给了他。他当场处理了伤口，动作很熟练。`
  }
  if (event.payload.kind === 'item') {
    if (!takeItem(run, event.payload.itemId, 1)) return { error: `你没有${ITEMS[event.payload.itemId].name}` }
    npc.bag = npc.bag || {}
    npc.bag[event.payload.itemId] = (npc.bag[event.payload.itemId] || 0) + 1
  } else {
    if (run.player.credits < event.payload.credits) return { error: '信用点不足' }
    run.player.credits -= event.payload.credits
    if (event.payload.treatment) npc.injured = false
  }
  npc.relation.trust = clamp(npc.relation.trust + 5, 0, 100)
  npc.relation.closeness = clamp(npc.relation.closeness + 2, 0, 100)
  return '你答应了他。他记下了这件事。'
}

function resolveQuest(run, npc, event, choice) {
  if (choice === 'decline') {
    npc.relation.trust = clamp(npc.relation.trust - 2, 0, 100)
    return '你没有接这个邀约。他点点头，自己去了。'
  }
  if (run.cleared.includes(event.payload.nodeId)) {
    return { error: '这个节点已经被处理了' }
  }
  const quest = {
    id: `quest-${event.id}`,
    npcId: npc.id,
    nodeId: event.payload.nodeId,
    nodeTitle: event.payload.nodeTitle,
    region: event.payload.region,
    deadline: event.payload.deadline,
    reward: event.payload.reward,
    status: 'active',
    createdDay: run.day,
  }
  run.quests = run.quests || []
  run.quests.push(quest)
  npc.relation.trust = clamp(npc.relation.trust + 2, 0, 100)
  return `你答应和他一起去 ${event.payload.nodeTitle}。约定在 D${event.payload.deadline} 前完成。`
}

function resolveRomance(run, npc, event, choice) {
  if (choice === 'accept') {
    npc.relation.closeness = clamp(npc.relation.closeness + 8, 0, 100)
    npc.relation.trust = clamp(npc.relation.trust + 5, 0, 100)
    npc.romance = true
    return '你去赴约了。你们聊了很久，谁都没有先提离开。'
  }
  npc.relation.closeness = clamp(npc.relation.closeness - 3, 0, 100)
  return '你说改天。他笑了笑，没有追问。'
}

function resolveConfession(run, npc, event, choice) {
  if (choice === 'accept') {
    npc.lover = true
    npc.loverSince = run.day
    npc.romance = true
    npc.confessed = true
    npc.confessedDay = run.day
    npc.relation.closeness = clamp(npc.relation.closeness + 10, 0, 100)
    npc.relation.trust = clamp(npc.relation.trust + 6, 0, 100)
    run.flags = run.flags || {}
    run.flags.lover = { npcId: npc.id, day: run.day }
    return '你答应了。他愣了一下，随后把这句话重复了一遍，像是要确认它真的发生了。'
  }
  npc.confessed = true
  npc.confessedDay = run.day
  npc.relation.closeness = clamp(npc.relation.closeness - 6, 0, 100)
  return '你说还是做朋友。他点点头，把没说完的话收了回去。'
}

function resolveJealousy(run, npc, event, choice) {
  if (choice === 'honest') {
    npc.relation.closeness = clamp(npc.relation.closeness - 5, 0, 100)
    npc.relation.grievance = clamp(npc.relation.grievance + 8, 0, 100)
    npc.relation.trust = clamp(npc.relation.trust + 4, 0, 100)
    return '你把事情说清楚了。他听完没有走，只是很久没有再碰你的手。'
  }
  npc.relation.closeness = clamp(npc.relation.closeness - 12, 0, 100)
  npc.relation.grievance = clamp(npc.relation.grievance + 15, 0, 100)
  return '你说没有。他看着你，像是已经知道了答案，但最后什么也没拆穿。'
}

function resolveEscort(run, npc, event, choice) {
  if (choice === 'decline') {
    npc.relation.trust = clamp(npc.relation.trust - 3, 0, 100)
    return '你说现在走不开。他点点头，自己扶着墙往诊所方向去了。'
  }
  const result = startEscort(run, npc.id)
  if (!result.ok) return { error: result.message }
  return `你答应送${npc.name}回空港诊所。到城门后可以完成护送，领取 ${result.escort.reward} 信用点。`
}

function resolveConflict(run, npc, event, choice) {
  if (choice === 'pay') {
    if (run.player.credits < event.payload.amount) return { error: '信用点不足' }
    run.player.credits -= event.payload.amount
    npc.relation.grievance = clamp(npc.relation.grievance - 15, 0, 100)
    if (npc.relation.grievance < 35) npc.hostile = false
    return `你赔了 ${event.payload.amount} 信用点。他没有再说什么。`
  }
  npc.relation.fear = clamp(npc.relation.fear + 5, 0, 100)
  npc.relation.grievance = clamp(npc.relation.grievance + 5, 0, 100)
  if (!run.pendingAmbush && npc.personality.aggression >= 60 && npc.relation.grievance >= 40) {
    run.pendingAmbush = npc.id
  }
  return '你没有退。他盯着你看了很久，最后让开了。'
}

function resolveGossip(run, npc, event, choice) {
  if (choice === 'ignore') return '你没有接话。他识趣地换了话题。'
  npc.relation.trust = clamp(npc.relation.trust + 1, 0, 100)
  const other = run.npcs[event.payload.otherId]
  if (other) {
    other.relation.trust = clamp(other.relation.trust + (event.payload.warm ? 1 : -1), 0, 100)
  }
  return '你听完了。这条消息之后也许会用得上。'
}

export function resolveInboxEvent(run, eventId, choiceId) {
  const event = (run.inbox || []).find((item) => item.id === eventId)
  if (!event) return { ok: false, message: '找不到这条消息' }
  if (event.status !== 'pending') return { ok: false, message: '这条消息已经处理过了' }
  const npc = run.npcs?.[event.npcId]
  if (!npc) return { ok: false, message: '联系人已经不在了' }
  if (!event.choices.some((choice) => choice.id === choiceId)) return { ok: false, message: '没有这个选项' }

  let result = ''
  if (event.type === 'message') result = resolveMessage(run, npc, event, choiceId)
  else if (event.type === 'persona') result = resolvePersona(run, npc, event, choiceId)
  else if (event.type === 'gift') result = resolveGift(run, npc, event, choiceId)
  else if (event.type === 'favor') result = resolveFavor(run, npc, event, choiceId)
  else if (event.type === 'quest') result = resolveQuest(run, npc, event, choiceId)
  else if (event.type === 'romance') result = resolveRomance(run, npc, event, choiceId)
  else if (event.type === 'confession') result = resolveConfession(run, npc, event, choiceId)
  else if (event.type === 'jealousy') result = resolveJealousy(run, npc, event, choiceId)
  else if (event.type === 'escort') result = resolveEscort(run, npc, event, choiceId)
  else if (event.type === 'conflict') result = resolveConflict(run, npc, event, choiceId)
  else if (event.type === 'gossip') result = resolveGossip(run, npc, event, choiceId)

  if (result && typeof result === 'object' && result.error) return { ok: false, message: result.error }

  event.status = 'resolved'
  event.choice = choiceId
  event.resolvedDay = run.day
  event.result = result
  pushWorld(run, `${npc.name}：${result}`, event.type === 'conflict' ? 'bad' : 'info')
  return { ok: true, text: result, npcId: npc.id, type: event.type }
}

export function completeQuestsAt(run, nodeId) {
  const completed = []
  ;(run.quests || []).forEach((quest) => {
    if (quest.status !== 'active' || quest.nodeId !== nodeId) return
    quest.status = 'done'
    quest.completedDay = run.day
    const npc = run.npcs[quest.npcId]
    if (npc) {
      npc.relation.trust = clamp(npc.relation.trust + 6, 0, 100)
      npc.relation.closeness = clamp(npc.relation.closeness + 4, 0, 100)
    }
    run.player.credits += quest.reward.credits
    addItem(run, quest.reward.itemId, 1)
    pushWorld(run, `你完成了和 ${npc?.name || '某人'} 的约定：${quest.nodeTitle}。`, 'good')
    completed.push(quest)
  })
  return completed
}
