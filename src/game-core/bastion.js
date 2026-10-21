/**
 * 方舟据点：邀请 NPC 入住、安排设施、休整产出与据点生活事件。
 * 据点状态跨城市保存，和 run.city 分开。
 */

import { bastionChainEvent } from './bastion-chains.js'
import { bastionPersonaEventFor } from './bastion-persona-events.js'
import { createRng } from './rng.js'

const clamp = (value, min = 0, max = 100) => Math.min(max, Math.max(min, value))

export const BASTION_FACILITIES = [
  {
    id: 'clinic',
    name: '医疗舱',
    desc: '让住在这里的人处理伤口、稳定精神。',
    output: '生命 +8 · 精神 +5',
    fit: ['sunshine', 'homemaker', 'jiahao'],
  },
  {
    id: 'workshop',
    name: '工坊',
    desc: '拆解、修补、把废料变成能用的东西。',
    output: '信用点 +12 · 废料 +1',
    fit: ['rough', 'tycoon', 'dry_ghost'],
  },
  {
    id: 'archive',
    name: '档案室',
    desc: '整理旧芯片与航行记录，找出还有用的坐标。',
    output: '旧世芯片 +1',
    fit: ['cold_elite', 'schemer', 'gloomy_ghost'],
  },
  {
    id: 'garden',
    name: '温室',
    desc: '在封闭舱里种一点能吃的东西。',
    output: '营养膏 +2 · 精神 +3',
    fit: ['sunshine', 'homemaker', 'loyal_dog'],
  },
]

export function createBastionState() {
  return {
    name: '渡鸦号',
    capacity: 4,
    residents: [],
    assignments: {},
    lastRestDay: 0,
    lastReport: [],
    pendingEvent: null,
    chains: [],
    tension: 0,
    pressure: 'calm',
  }
}

export function ensureBastion(run) {
  if (!run) return createBastionState()
  if (!run.bastion || typeof run.bastion !== 'object') run.bastion = createBastionState()
  const bastion = run.bastion
  if (typeof bastion.name !== 'string') bastion.name = '渡鸦号'
  if (typeof bastion.capacity !== 'number') bastion.capacity = 4
  if (!Array.isArray(bastion.residents)) bastion.residents = []
  if (!bastion.assignments || typeof bastion.assignments !== 'object') bastion.assignments = {}
  if (typeof bastion.lastRestDay !== 'number') bastion.lastRestDay = 0
  if (!Array.isArray(bastion.lastReport)) bastion.lastReport = []
  if (!Array.isArray(bastion.chains)) bastion.chains = []
  if (bastion.pendingEvent === undefined) bastion.pendingEvent = null
  if (typeof bastion.tension !== 'number') bastion.tension = 0
  if (!['calm', 'tense', 'chaos'].includes(bastion.pressure)) bastion.pressure = 'calm'
  bastion.residents.forEach((npcId) => ensureResidentNeeds(run.npcs?.[npcId]))
  return bastion
}

export function ensureResidentNeeds(npc) {
  if (!npc) return null
  if (!npc.bastionNeeds || typeof npc.bastionNeeds !== 'object') {
    npc.bastionNeeds = { safety: 70, belonging: 60, purpose: 60 }
  }
  npc.bastionNeeds.safety = clamp(npc.bastionNeeds.safety ?? 70)
  npc.bastionNeeds.belonging = clamp(npc.bastionNeeds.belonging ?? 60)
  npc.bastionNeeds.purpose = clamp(npc.bastionNeeds.purpose ?? 60)
  if (!Array.isArray(npc.bastionPersonaDone)) npc.bastionPersonaDone = []
  return npc.bastionNeeds
}

export function residentMood(npc) {
  const needs = ensureResidentNeeds(npc)
  if (!needs) return { score: 0, label: '未知', color: 'muted' }
  const score = Math.round((needs.safety + needs.belonging + needs.purpose) / 3)
  if (score >= 75) return { score, label: '安稳', color: 'jade' }
  if (score >= 55) return { score, label: '平常', color: 'cyan' }
  if (score >= 35) return { score, label: '低落', color: 'amber' }
  return { score, label: '濒临崩溃', color: 'red' }
}

export function bastionTension(run) {
  const bastion = ensureBastion(run)
  const residents = bastion.residents.map((id) => run.npcs?.[id]).filter(Boolean)
  if (!residents.length) {
    bastion.tension = 0
    return 0
  }
  const moods = residents.map((npc) => residentMood(npc).score)
  const lowMood = moods.reduce((sum, score) => sum + Math.max(0, 50 - score), 0)
  const quarrels = residents.filter((npc) => npc.quarrel?.active).length
  const wanted = run.wanted?.level || 0
  const tension = clamp(Math.round(lowMood * 0.5 + quarrels * 18 + wanted * 10 + residents.length * 2), 0, 100)
  bastion.tension = tension
  return tension
}

function updateResidentNeeds(run, bastion) {
  const residents = bastion.residents.map((id) => run.npcs?.[id]).filter(Boolean)
  residents.forEach((npc) => {
    const needs = ensureResidentNeeds(npc)
    const assigned = Object.values(bastion.assignments || {}).includes(npc.id)
    needs.safety = clamp(needs.safety - (run.wanted?.level || 0) * 3)
    needs.belonging = clamp(needs.belonging + (npc.lover ? 3 : 1) - (npc.quarrel?.active ? 8 : 0))
    needs.purpose = clamp(needs.purpose + (assigned ? 6 : -5))
  })
  const withLover = residents.find((npc) => npc.lover)
  if (withLover) withLover.bastionNeeds.belonging = clamp(withLover.bastionNeeds.belonging + 3)
}

export function bastionStatus(run) {
  const bastion = ensureBastion(run)
  return {
    ...bastion,
    residentCount: bastion.residents.length,
    hasSpace: bastion.residents.length < bastion.capacity,
  }
}

export function canInviteNpc(run, npc) {
  if (!run || !npc) return { ok: false, reason: '找不到这个人' }
  const bastion = ensureBastion(run)
  if (!npc.alive) return { ok: false, reason: '他无法回应' }
  if (npc.life?.leftCity || npc.active === false) return { ok: false, reason: '他已经离开空港了' }
  if (npc.hostile) return { ok: false, reason: '他还在敌视你' }
  if (bastion.residents.includes(npc.id)) return { ok: false, reason: '他已经在据点里' }
  if (bastion.residents.length >= bastion.capacity) {
    return { ok: false, reason: '据点没有空位' }
  }
  if (npc.tags?.includes('solo')) return { ok: false, reason: '他习惯独来独往，不会住进据点' }
  const threshold = npc.lover || npc.relation?.closeness >= 45
    ? 10
    : npc.tags?.includes('loyal')
      ? 15
      : 25
  if ((npc.relation?.trust || 0) < threshold) {
    return { ok: false, reason: `信任还不够（需要 ${threshold}）`, threshold }
  }
  return { ok: true, reason: '', threshold }
}

export function inviteNpcToBastion(run, npcId) {
  const npc = run?.npcs?.[npcId]
  const check = canInviteNpc(run, npc)
  if (!check.ok) return { ok: false, message: check.reason }
  const bastion = ensureBastion(run)
  bastion.residents.push(npc.id)
  npc.bastionResident = true
  npc.bastionSince = run.day
  ensureResidentNeeds(npc)
  return { ok: true, npc, threshold: check.threshold }
}

export function removeNpcFromBastion(run, npcId) {
  const bastion = ensureBastion(run)
  const index = bastion.residents.indexOf(npcId)
  if (index < 0) return { ok: false, message: '他不在据点里' }
  bastion.residents.splice(index, 1)
  Object.keys(bastion.assignments).forEach((facilityId) => {
    if (bastion.assignments[facilityId] === npcId) delete bastion.assignments[facilityId]
  })
  const npc = run.npcs?.[npcId]
  if (npc) {
    npc.bastionResident = false
    npc.bastionSince = 0
  }
  return { ok: true }
}

export function assignBastionFacility(run, facilityId, npcId) {
  const bastion = ensureBastion(run)
  if (!BASTION_FACILITIES.some((facility) => facility.id === facilityId)) {
    return { ok: false, message: '没有这项设施' }
  }
  if (npcId && !bastion.residents.includes(npcId)) {
    return { ok: false, message: '他还没有加入据点' }
  }
  Object.keys(bastion.assignments).forEach((id) => {
    if (bastion.assignments[id] === npcId) delete bastion.assignments[id]
  })
  if (npcId) bastion.assignments[facilityId] = npcId
  else delete bastion.assignments[facilityId]
  return { ok: true, facilityId, npcId: npcId || null }
}

function matchesFit(npc, facility) {
  return Boolean(npc?.archetype?.id && facility.fit.includes(npc.archetype.id))
}

function lifeEfficiency(npc) {
  const needs = npc?.life?.needs
  if (!needs) return 1
  const average = (needs.safety + needs.belonging + needs.purpose) / 3
  if (average >= 60) return 1
  if (average >= 35) return 0.75
  return 0.5
}

export function queueBastionChain(run, chainId, npcId = null, dueIn = 2) {
  const bastion = ensureBastion(run)
  if (!Array.isArray(bastion.chains)) bastion.chains = []
  if (bastion.chains.some((chain) => chain.id === chainId)) return null
  if (bastion.chains.length >= 2) bastion.chains.shift()
  const chain = {
    id: chainId,
    npcId: npcId || bastion.residents[0] || null,
    queuedDay: run.day,
    dueDay: run.day + Math.max(1, dueIn),
  }
  bastion.chains.push(chain)
  return chain
}

export function buildBastionEvent(run) {
  const bastion = ensureBastion(run)
  const residents = bastion.residents.map((id) => run.npcs?.[id]).filter(Boolean)
  if (!residents.length) return null
  const rng = createRng(`${run.seed}:bastion-event:${run.day}:${residents.length}`)
  const tension = bastionTension(run)
  const dueChain = (bastion.chains || []).find((chain) => chain.dueDay <= run.day)
  if (dueChain) {
    const chainEvent = bastionChainEvent(dueChain)
    if (chainEvent) return chainEvent
    bastion.chains = bastion.chains.filter((chain) => chain.id !== dueChain.id)
  }
  const persona = residents.find((npc) => {
    const definition = bastionPersonaEventFor(npc)
    return definition &&
      !npc.bastionPersonaDone?.includes(definition.id) &&
      run.day - (npc.bastionSince ?? run.day) >= 1
  })
  if (persona) {
    const definition = bastionPersonaEventFor(persona)
    return {
      ...definition,
      id: `bastion-${run.day}-persona-${definition.id}`,
      type: 'personal',
      personaId: definition.id,
      npcId: persona.id,
    }
  }
  const wanted = run.wanted?.level || 0
  const pressure = tension >= 70 || wanted >= 3 ? 'chaos'
    : tension >= 35 || wanted >= 1 ? 'tense'
      : 'calm'
  bastion.pressure = pressure
  let target = rng.pick(residents)

  if (pressure === 'chaos') {
    const type = rng.pick(['raid', 'defect', 'fire', 'theft'])
    if (type === 'raid') {
      return {
        id: `bastion-${run.day}-raid`,
        type,
        pressure,
        npcId: target.id,
        title: '警报响了一整夜',
        text: '有人摸到了方舟外沿。舱壁被什么东西刮过，声音一直没有停。\n\n值班的人站在门口，等你决定。',
        choices: [
          { id: 'defend', label: '带人守住外沿' },
          { id: 'hide', label: '封闭舱门，先保人' },
          { id: 'pay', label: '丢下一箱物资打发他们' },
        ],
      }
    }
    if (type === 'defect') {
      return {
        id: `bastion-${run.day}-defect`,
        type,
        pressure,
        npcId: target.id,
        title: `${target.name} 收拾好了行李`,
        text: `他站在舱门口，没有看你。\n\n“这里不适合我。”他说，“至少今天不适合。”`,
        choices: [
          { id: 'listen', label: '问他到底发生了什么' },
          { id: 'let_go', label: '让他走' },
          { id: 'promise', label: '答应他一个条件' },
        ],
      }
    }
    if (type === 'fire') {
      return {
        id: `bastion-${run.day}-fire`,
        type,
        pressure,
        npcId: target.id,
        title: '温室短路了',
        text: `警报灯把整条走廊照成红色。温室里有烟，但还没有明火。\n\n${target.name} 站在门口，手里拿着灭火器。`,
        choices: [
          { id: 'fight', label: '冲进去灭火' },
          { id: 'evacuate', label: '先撤人，放弃温室' },
          { id: 'repair', label: '花钱请人连夜修' },
        ],
      }
    }
    return {
      id: `bastion-${run.day}-theft`,
      type: 'theft',
      pressure,
      npcId: target.id,
      title: '储物舱少了一箱东西',
      text: '清单对不上。有人拿走了物资，也可能只是有人忘了登记。\n\n据点里没有人承认。',
      choices: [
        { id: 'investigate', label: '逐个问清楚' },
        { id: 'lockdown', label: '先封锁储物舱' },
        { id: 'ignore', label: '当作损耗处理' },
      ],
    }
  }

  if (pressure === 'calm') {
    const type = rng.pick(['visitor', 'visitor', 'windfall'])
    if (type === 'visitor') {
      return {
        id: `bastion-${run.day}-visitor`,
        type,
        pressure,
        npcId: target.id,
        title: '有人敲了舱门',
        text: '一个自称路过的人站在外面，带着一只旧箱子。\n\n“听说你们这里能换东西。”',
        choices: [
          { id: 'trade', label: '和他换一批物资' },
          { id: 'talk', label: '先请他进来坐坐' },
          { id: 'turn_away', label: '让他离开' },
        ],
      }
    }
    return {
      id: `bastion-${run.day}-windfall`,
      type: 'windfall',
      pressure,
      npcId: target.id,
      title: `${target.name} 找到了一箱旧货`,
      text: `他在储物舱最里面翻出一只没有登记的箱子。\n\n“不是我的。”他说，“但也没人认领。”`,
      choices: [
        { id: 'celebrate', label: '今晚开一桌' },
        { id: 'store', label: '登记入库' },
        { id: 'train', label: '让值班的人研究一下' },
      ],
    }
  }

  const quarrel = residents.find((npc) => npc.quarrel?.active || (npc.relation?.trust || 0) < 25)
  const homesick = residents.find((npc) => (npc.bastionNeeds?.belonging || 60) < 45)
  const injured = residents.find((npc) => (npc.bastionNeeds?.safety || 70) < 45)
  const candidates = []
  if (quarrel) candidates.push('quarrel')
  if (homesick) candidates.push('homesick')
  if (injured || wanted >= 2) candidates.push('injury')
  candidates.push('faction_pressure')
  const type = rng.pick(candidates)
  target = type === 'quarrel' ? quarrel || target
    : type === 'homesick' ? homesick || target
      : type === 'injury' ? injured || target
        : target

  if (type === 'quarrel') {
    return {
      id: `bastion-${run.day}-quarrel`,
      type,
      npcId: target.id,
      title: `${target.name} 把门关上了`,
      text: `${target.name}今天没有去设施。他说“没事”，但没有看你。\n\n据点里的人都听见了那声关门。`,
      choices: [
        { id: 'mediate', label: '把两个人叫到一起' },
        { id: 'listen', label: '单独听他说完' },
        { id: 'ignore', label: '让他自己待着' },
      ],
    }
  }
  if (type === 'homesick') {
    return {
      id: `bastion-${run.day}-homesick`,
      type,
      npcId: target.id,
      title: `${target.name} 在舱门口坐了很久`,
      text: `他没有说想离开，只是把旧地方的坐标反复调出来看。\n\n“这里很好。”他说，“只是有时候太安静了。”`,
      choices: [
        { id: 'listen', label: '坐下来陪他一会儿' },
        { id: 'gift', label: '拿一份营养膏和酒过去' },
        { id: 'space', label: '给他一点自己的空间' },
      ],
    }
  }
  if (type === 'injury') {
    return {
      id: `bastion-${run.day}-injury`,
      type,
      npcId: target.id,
      title: `${target.name} 在搬东西时伤到了手`,
      text: `伤口不深，但他一直没去医疗舱。\n\n“没必要。”他说。你看见他握东西的时候皱了一下眉。`,
      choices: [
        { id: 'treat', label: '带他去医疗舱' },
        { id: 'rest', label: '让他今天休息' },
        { id: 'ignore', label: '先把手头的事做完' },
      ],
    }
  }
  if (type === 'faction_pressure') {
    return {
      id: `bastion-${run.day}-faction-pressure`,
      type,
      pressure,
      npcId: target.id,
      title: '派系的人来敲门',
      text: `一个穿制服的人站在舱门外，手里拿着一份名单。\n\n“你们收留的人里，有一个我们想带走。”`,
      choices: [
        { id: 'comply', label: '配合他们' },
        { id: 'refuse', label: '把门关上' },
        { id: 'bargain', label: '谈一个条件' },
      ],
    }
  }
  return {
    id: `bastion-${run.day}-windfall`,
    type: 'windfall',
    npcId: target.id,
    title: `${target.name} 找到了一箱旧货`,
    text: `他在储物舱最里面翻出一只没有登记的箱子。\n\n“不是我的。”他说，“但也没人认领。”`,
    choices: [
      { id: 'celebrate', label: '今晚开一桌' },
      { id: 'store', label: '登记入库' },
      { id: 'train', label: '让值班的人研究一下' },
    ],
  }
}

export function resolveBastionEvent(run, eventId, choiceId) {
  const bastion = ensureBastion(run)
  const event = bastion.pendingEvent
  if (!event || event.id !== eventId) return { ok: false, message: '这个据点事件已经结束了' }
  const npc = run.npcs?.[event.npcId]
  if (!npc) {
    bastion.pendingEvent = null
    return { ok: false, message: '当事人已经不在据点' }
  }
  const needs = ensureResidentNeeds(npc)
  let text = ''

  if (event.type === 'chain') {
    const choice = event.choices.find((item) => item.id === choiceId)
    if (!choice) return { ok: false, message: '没有这个选项' }
    const effects = choice.effects || {}
    Object.entries(effects.needs || {}).forEach(([key, value]) => {
      needs[key] = clamp((needs[key] || 0) + value)
    })
    Object.entries(effects.relation || {}).forEach(([key, value]) => {
      npc.relation[key] = clamp((npc.relation[key] || 0) + value)
    })
    Object.entries(effects.items || {}).forEach(([key, value]) => {
      run.inv[key] = Math.max(0, (run.inv[key] || 0) + value)
    })
    if (effects.credits) run.player.credits = Math.max(0, run.player.credits + effects.credits)
    bastion.chains = (bastion.chains || []).filter((chain) => chain.id !== event.chainId)
    text = choice.text
  } else if (event.type === 'personal') {
    const choice = event.choices.find((item) => item.id === choiceId)
    if (!choice) return { ok: false, message: '没有这个选项' }
    const effects = choice.effects || {}
    Object.entries(effects.needs || {}).forEach(([key, value]) => {
      needs[key] = clamp((needs[key] || 0) + value)
    })
    Object.entries(effects.relation || {}).forEach(([key, value]) => {
      npc.relation[key] = clamp((npc.relation[key] || 0) + value)
    })
    Object.entries(effects.items || {}).forEach(([key, value]) => {
      run.inv[key] = Math.max(0, (run.inv[key] || 0) + value)
    })
    if (effects.credits) run.player.credits = Math.max(0, run.player.credits + effects.credits)
    if (!npc.bastionPersonaDone.includes(event.personaId)) {
      npc.bastionPersonaDone.push(event.personaId)
    }
    text = choice.text
  } else if (event.type === 'visitor') {
    if (choiceId === 'trade') {
      run.player.credits += 18
      run.inv.scrap = (run.inv.scrap || 0) + 1
      needs.purpose = clamp(needs.purpose + 5)
      text = '你和访客换了一批物资。信用点 +18，废料 +1。'
    } else if (choiceId === 'talk') {
      needs.belonging = clamp(needs.belonging + 9)
      needs.safety = clamp(needs.safety + 3)
      text = '你们让访客进来坐了一会儿。他没有留下名字，但留下了一条附近的航线。'
    } else {
      needs.safety = clamp(needs.safety + 3)
      needs.belonging = clamp(needs.belonging - 4)
      text = '你没有开门。脚步声在舱门外停了一会儿，然后走远了。'
    }
  } else if (event.type === 'raid') {
    if (choiceId === 'defend') {
      run.player.hp = Math.max(1, run.player.hp - 8)
      needs.safety = clamp(needs.safety + 14)
      needs.purpose = clamp(needs.purpose + 8)
      run.player.credits += 10
      text = '你们守住了外沿。有人受了伤，但没有人被带走。'
    } else if (choiceId === 'hide') {
      run.player.credits = Math.max(0, run.player.credits - 15)
      needs.safety = clamp(needs.safety + 5)
      needs.belonging = clamp(needs.belonging - 3)
      text = '你们封死了舱门。外面的声音持续了很久，储物舱少了一点东西。'
    } else {
      run.player.credits = Math.max(0, run.player.credits - 25)
      needs.safety = clamp(needs.safety + 10)
      text = '你丢下一箱物资。脚步声停了，但没有人为这个决定鼓掌。'
    }
  } else if (event.type === 'defect') {
    if (choiceId === 'listen') {
      needs.belonging = clamp(needs.belonging + 14)
      needs.purpose = clamp(needs.purpose + 4)
      npc.relation.trust = clamp(npc.relation.trust + 4)
      text = '你听他说完。他最后把行李放回了柜子里：“再给我一点时间。”'
    } else if (choiceId === 'let_go') {
      removeNpcFromBastion(run, npc.id)
      npc.active = false
      npc.activity = '离开了方舟'
      text = `${npc.name} 走了。没有人拦他，也没有人知道他会去哪里。`
    } else {
      needs.belonging = clamp(needs.belonging + 8)
      needs.purpose = clamp(needs.purpose + 8)
      npc.relation.trust = clamp(npc.relation.trust + 3)
      text = '你答应了一个不算小的条件。他留下来了，但你知道这不是免费的。'
    }
  } else if (event.type === 'fire') {
    if (choiceId === 'fight') {
      run.player.hp = Math.max(1, run.player.hp - 5)
      needs.safety = clamp(needs.safety + 12)
      run.inv.scrap = (run.inv.scrap || 0) + 2
      text = '火被扑灭了。你的手被烫了一下，但温室保住了大半。'
    } else if (choiceId === 'evacuate') {
      needs.safety = clamp(needs.safety + 8)
      needs.purpose = clamp(needs.purpose - 6)
      run.inv.ration = Math.max(0, (run.inv.ration || 0) - 2)
      text = '你们先撤了人。温室烧掉了一部分，但没有人被困在里面。'
    } else {
      run.player.credits = Math.max(0, run.player.credits - 30)
      needs.safety = clamp(needs.safety + 11)
      text = '维修队连夜换了线路。账单不便宜，但警报终于停了。'
    }
  } else if (event.type === 'theft') {
    if (choiceId === 'investigate') {
      needs.purpose = clamp(needs.purpose + 8)
      needs.belonging = clamp(needs.belonging - 3)
      run.player.credits += 8
      text = '你逐个问过去。东西没有全找回来，但有人把多拿的那份放了回去。'
    } else if (choiceId === 'lockdown') {
      needs.safety = clamp(needs.safety + 9)
      needs.belonging = clamp(needs.belonging - 5)
      text = '储物舱被锁上了。没有人再丢东西，但也没有人愿意多说话。'
    } else {
      run.inv.scrap = Math.max(0, (run.inv.scrap || 0) - 2)
      needs.purpose = clamp(needs.purpose - 4)
      text = '你把这次损失记在账上。储物舱里少了一点废料，也少了一点信任。'
    }
  } else if (event.type === 'faction_pressure') {
    if (choiceId === 'comply') {
      needs.safety = clamp(needs.safety + 8)
      needs.belonging = clamp(needs.belonging - 6)
      npc.relation.trust = clamp(npc.relation.trust - 3)
      run.player.credits += 16
      text = '你把名单交了出去。制服的人留下了 16 信用点，没有说谢谢。'
    } else if (choiceId === 'refuse') {
      needs.safety = clamp(needs.safety - 8)
      needs.purpose = clamp(needs.purpose + 11)
      npc.relation.trust = clamp(npc.relation.trust + 6)
      text = '你把门关上了。门外的人敲了三下，然后离开。据点里的人看着你，没有说话。'
    } else {
      run.player.credits = Math.max(0, run.player.credits - 15)
      needs.safety = clamp(needs.safety + 5)
      npc.relation.trust = clamp(npc.relation.trust + 2)
      text = '你谈了一个条件。对方拿走 15 信用点，名单上的人暂时留了下来。'
    }
  } else if (event.type === 'quarrel') {
    if (choiceId === 'mediate') {
      needs.belonging = clamp(needs.belonging + 12)
      needs.safety = clamp(needs.safety + 4)
      npc.relation.trust = clamp(npc.relation.trust + 4)
      npc.quarrel = null
      text = '你把两个人按在同一张桌子旁。话没有一次说完，但门重新开了。'
    } else if (choiceId === 'listen') {
      needs.belonging = clamp(needs.belonging + 8)
      npc.relation.closeness = clamp(npc.relation.closeness + 4)
      text = '你没有替谁说话，只是听完了。他最后说：“明天我会去设施。”'
    } else {
      needs.belonging = clamp(needs.belonging - 8)
      needs.purpose = clamp(needs.purpose - 4)
      npc.relation.grievance = clamp(npc.relation.grievance + 6)
      text = '你让他自己待着。第二天门开着，但那句话还留在舱里。'
    }
  } else if (event.type === 'homesick') {
    if (choiceId === 'listen') {
      needs.belonging = clamp(needs.belonging + 14)
      npc.relation.trust = clamp(npc.relation.trust + 4)
      text = '你陪他坐了一会儿。他没有再提旧地方，只问你下次远征什么时候走。'
    } else if (choiceId === 'gift') {
      run.inv.ration = Math.max(0, (run.inv.ration || 0) - 1)
      run.inv.wine = Math.max(0, (run.inv.wine || 0) - 1)
      needs.belonging = clamp(needs.belonging + 18)
      needs.purpose = clamp(needs.purpose + 4)
      text = '你们分了一份营养膏和酒。他说这不算故乡，但今晚可以算。'
    } else {
      needs.belonging = clamp(needs.belonging - 4)
      text = '你给他留了空间。晚上他回来得很晚，但没有再去看那串坐标。'
    }
  } else if (event.type === 'injury') {
    if (choiceId === 'treat') {
      needs.safety = clamp(needs.safety + 16)
      needs.belonging = clamp(needs.belonging + 6)
      run.player.hp = Math.min(run.player.hpMax, run.player.hp + 4)
      text = '你把他带到医疗舱。伤口处理完，他终于不再逞强。'
    } else if (choiceId === 'rest') {
      needs.safety = clamp(needs.safety + 10)
      needs.purpose = clamp(needs.purpose - 6)
      text = '你让他今天休息。设施少了一个人，但伤口没有继续恶化。'
    } else {
      needs.safety = clamp(needs.safety - 10)
      needs.purpose = clamp(needs.purpose + 2)
      text = '你把活干完了。他的手后来肿了起来，但他说没事。'
    }
  } else if (choiceId === 'celebrate') {
    needs.belonging = clamp(needs.belonging + 14)
    needs.purpose = clamp(needs.purpose + 8)
    text = '你们把箱子里的东西分了。据点里久违地有人笑出了声。'
  } else if (choiceId === 'store') {
    run.player.credits += 24
    run.inv.scrap = (run.inv.scrap || 0) + 2
    needs.purpose = clamp(needs.purpose + 6)
    text = '旧货登记入库。信用点 +24，废料 +2。'
  } else {
    needs.purpose = clamp(needs.purpose + 12)
    needs.safety = clamp(needs.safety + 4)
    text = '值班的人拆了半晚。没有人知道那东西原来做什么，但学到了一点。'
  }

  if (event.type === 'raid' && ['defend', 'hide'].includes(choiceId)) {
    queueBastionChain(run, 'raid_mark', npc.id, 2)
  } else if (event.type === 'defect' && choiceId === 'listen') {
    queueBastionChain(run, 'defect_letter', npc.id, 2)
  } else if (event.type === 'fire' && ['fight', 'repair'].includes(choiceId)) {
    queueBastionChain(run, 'fire_wire', npc.id, 2)
  } else if (event.type === 'visitor' && choiceId === 'trade') {
    queueBastionChain(run, 'visitor_crate', npc.id, 2)
  } else if (event.type === 'faction_pressure' && choiceId === 'refuse') {
    queueBastionChain(run, 'faction_return', npc.id, 1)
  }

  bastion.pendingEvent = null
  bastion.lastReport = [...(bastion.lastReport || []), text]
  bastionTension(run)
  return { ok: true, event, npc, text, needs }
}

export function restBastion(run) {
  const bastion = ensureBastion(run)
  if (bastion.pendingEvent) return { ok: false, message: '先处理据点里正在发生的事' }
  if (run.ap > 0) return { ok: false, message: '还有行动点，先完成这次远征' }
  if (bastion.lastRestDay === run.day) return { ok: false, message: '今天已经在据点休整过了' }
  const staffed = BASTION_FACILITIES.filter((facility) => bastion.assignments[facility.id])
  if (!staffed.length) return { ok: false, message: '还没有人负责设施，先去邀请 NPC 并安排工作' }

  const report = []
  staffed.forEach((facility) => {
    const npc = run.npcs?.[bastion.assignments[facility.id]]
    if (!npc?.alive) return
    const fit = matchesFit(npc, facility)
    const efficiency = lifeEfficiency(npc)
    if (facility.id === 'clinic') {
      const hp = Math.round((fit ? 12 : 8) * efficiency)
      const mental = Math.round((fit ? 8 : 5) * efficiency)
      run.player.hp = Math.min(run.player.hpMax, run.player.hp + hp)
      run.player.mental = Math.min(run.player.mentalMax, run.player.mental + mental)
      report.push(`${facility.name}：${npc.name}处理了伤口${fit ? '，动作很稳' : ''}${efficiency < 1 ? '，但状态不太好' : ''}。`)
    } else if (facility.id === 'workshop') {
      const credits = Math.round((fit ? 18 : 12) * efficiency)
      const scrap = Math.max(1, Math.round((fit ? 2 : 1) * efficiency))
      run.player.credits += credits
      run.inv.scrap = (run.inv.scrap || 0) + scrap
      report.push(`${facility.name}：${npc.name}修好了几件旧东西，信用点 +${credits}，废料 +${scrap}。`)
    } else if (facility.id === 'archive') {
      const chips = Math.max(1, Math.round((fit ? 2 : 1) * efficiency))
      run.inv.chip = (run.inv.chip || 0) + chips
      report.push(`${facility.name}：${npc.name}从旧记录里翻出 ${chips} 枚旧世芯片。`)
    } else if (facility.id === 'garden') {
      const rations = Math.max(1, Math.round((fit ? 3 : 2) * efficiency))
      run.inv.ration = (run.inv.ration || 0) + rations
      run.player.mental = Math.min(run.player.mentalMax, run.player.mental + Math.round((fit ? 5 : 3) * efficiency))
      report.push(`${facility.name}：${npc.name}收了一批营养膏，精神也稳定了一些。`)
    }
  })
  updateResidentNeeds(run, bastion)
  const event = buildBastionEvent(run)
  bastion.lastRestDay = run.day
  bastion.lastReport = report
  bastion.pendingEvent = event
  bastionTension(run)
  return { ok: true, report, event, tension: bastion.tension }
}
