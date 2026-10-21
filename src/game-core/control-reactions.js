/**
 * 控制方反应后续：投靠、离开、报复会在几天后回来。
 */

import { createRng } from './rng.js'

const clamp = (value, min = 0, max = 100) => Math.min(max, Math.max(min, value))

const REACTION_LABELS = {
  defect: '投靠',
  leave: '离开',
  revenge: '报复',
}

export function ensureControlReactionEvents(run) {
  if (!run) return []
  if (!Array.isArray(run.controlReactionEvents)) run.controlReactionEvents = []
  return run.controlReactionEvents
}

export function scheduleControlReactionFollowUps(run, cityId, reactions = []) {
  const events = ensureControlReactionEvents(run)
  const pendingTypes = new Set(events.filter((event) => event.status === 'pending').map((event) => `${event.npcId}:${event.type}`))
  reactions.forEach((reaction) => {
    const key = `${reaction.npcId}:${reaction.type}`
    if (!['defect', 'leave', 'revenge'].includes(reaction.type)) return
    if (pendingTypes.has(key)) return
    if (events.filter((event) => event.status === 'pending').length >= 6) return
    const dueIn = reaction.type === 'revenge' ? 1 : reaction.type === 'defect' ? 2 : 3
    const event = {
      id: `control-${reaction.type}-${reaction.npcId}-${run.day}`,
      type: reaction.type,
      npcId: reaction.npcId,
      name: reaction.name,
      cityId,
      day: run.day,
      dueDay: run.day + dueIn,
      status: 'pending',
      resolvedDay: 0,
      choice: null,
      text: reaction.text,
    }
    events.push(event)
    pendingTypes.add(key)
  })
  return events
}

export function controlReactionStatuses(run) {
  return ensureControlReactionEvents(run)
    .filter((event) => event.status === 'pending')
    .map((event) => ({
      ...event,
      label: REACTION_LABELS[event.type] || event.type,
      due: run.day >= event.dueDay,
      daysLeft: Math.max(0, event.dueDay - run.day),
    }))
}

export function controlReactionChoices(event) {
  if (event.type === 'defect') {
    return [
      { id: 'trust', label: '接受他的投靠', desc: '信任 +5，城市影响力 +5。' },
      { id: 'test', label: '让他先证明自己', desc: '不消耗资源，信任 -2。' },
    ]
  }
  if (event.type === 'leave') {
    return [
      { id: 'invite', label: '请他回来', desc: '恢复城市居民身份，信任 +4。' },
      { id: 'ignore', label: '让他走', desc: '保持离开状态，什么也不会发生。' },
    ]
  }
  return [
    { id: 'talk', label: '和他谈谈', desc: '交涉判定。成功解除敌对，失败可能进入战斗。' },
    { id: 'pay', label: '给一笔钱', desc: '支付 30 信用点，解除敌对。' },
    { id: 'fight', label: '先动手', desc: '进入真实战斗。' },
  ]
}

function finish(run, event, choiceId, text) {
  event.status = 'done'
  event.choice = choiceId
  event.resolvedDay = run.day
  event.text = text
  return { ok: true, event, text }
}

function rejoinCity(run, event) {
  const npc = run.npcs?.[event.npcId]
  if (!npc || !npc.alive) return null
  npc.active = true
  npc.cityId = event.cityId
  npc.life = npc.life || {}
  npc.life.leftCity = false
  npc.life.returnDay = 0
  npc.controlStance = '回归'
  const city = run.cities?.[event.cityId] || run.city
  if (city) {
    if (!Array.isArray(city.npcIds)) city.npcIds = []
    if (!city.npcIds.includes(npc.id)) city.npcIds.push(npc.id)
  }
  return npc
}

export function resolveControlReactionEvent(run, eventId, choiceId) {
  const event = ensureControlReactionEvents(run).find((item) => item.id === eventId)
  if (!event || event.status !== 'pending') return { ok: false, message: '这件事已经过去了' }
  const npc = run.npcs?.[event.npcId]
  if (!npc || !npc.alive) return { ok: false, message: '当事人已经不在了' }
  if (run.day < event.dueDay) return { ok: false, message: `还需要等待 ${event.dueDay - run.day} 天` }

  if (event.type === 'defect') {
    if (choiceId === 'trust') {
      npc.relation.trust = clamp(npc.relation.trust + 5)
      if (run.city) {
        run.city.influence = { ...(run.city.influence || {}) }
        run.city.influence[npc.faction] = (run.city.influence[npc.faction] || 0) + 5
      }
      return finish(run, event, choiceId, `${npc.name} 正式站到了你这一边。他说以后不会再轻易换边。`)
    }
    npc.relation.trust = clamp(npc.relation.trust - 2)
    return finish(run, event, choiceId, `${npc.name} 没有得到明确答复。他记住了这次沉默。`)
  }

  if (event.type === 'leave') {
    if (choiceId === 'invite') {
      const returned = rejoinCity(run, event)
      if (!returned) return { ok: false, message: '他已经无法回来' }
      npc.relation.trust = clamp(npc.relation.trust + 4)
      return finish(run, event, choiceId, `你让人把 ${npc.name} 找了回来。他站在城门口，没有先开口。`)
    }
    return finish(run, event, choiceId, `你没有去找 ${npc.name}。他的位置很快被别的人填上了。`)
  }

  if (event.type === 'revenge') {
    if (choiceId === 'pay') {
      if (run.player.credits < 30) return { ok: false, message: '需要 30 信用点' }
      run.player.credits -= 30
      npc.hostile = false
      npc.relation.grievance = clamp(npc.relation.grievance - 12)
      run.pendingAmbush = null
      return finish(run, event, choiceId, `你给了 ${npc.name} 30 信用点。他收了钱，暂时没有再出现。`)
    }
    if (choiceId === 'talk') {
      run.rollCount = (run.rollCount || 0) + 1
      const rng = createRng(`${run.seed}:control-reaction:${run.day}:${event.npcId}:${run.rollCount}`)
      const die = rng.int(1, 20)
      const attr = run.player.attrs?.soc || 0
      if (die === 20 || (die !== 1 && die + attr >= 14)) {
        npc.hostile = false
        npc.relation.grievance = clamp(npc.relation.grievance - 10)
        run.pendingAmbush = null
        return finish(run, event, choiceId, `你和 ${npc.name} 谈了很久。他最后没有再提那件事。`)
      }
      npc.relation.grievance = clamp(npc.relation.grievance + 6)
      return finish(run, event, choiceId, `${npc.name} 没有接受你的解释。他走的时候，手一直放在口袋里。`)
    }
    if (choiceId === 'fight') {
      return { ok: true, battle: true, event, npcId: npc.id, text: `你先动了手。${npc.name} 没有退。` }
    }
  }

  return { ok: false, message: '没有这个选择' }
}

export function completeControlReactionBattle(run, eventId) {
  const event = ensureControlReactionEvents(run).find((item) => item.id === eventId)
  if (!event || event.status !== 'pending') return { ok: false }
  const npc = run.npcs?.[event.npcId]
  if (npc) {
    npc.hostile = false
    npc.relation.grievance = clamp(npc.relation.grievance - 20)
    npc.controlStance = '屈服'
  }
  run.pendingAmbush = null
  return finish(run, event, 'fight', '战斗结束了。对方没有再站起来，也没有再放下什么话。')
}
