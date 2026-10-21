/**
 * NPC 自主人生：个人目标、需求、派系晋升、结伴、结仇、离城、归来与继承。
 * 只跑 core / active 层，background 不参与每日人生模拟。
 */

import { createRng } from './rng.js'

const clamp = (value, min = 0, max = 100) => Math.min(max, Math.max(min, value))

export const LIFE_GOALS = {
  stability: {
    id: 'stability',
    name: '安稳',
    desc: '把日子过稳，不再被旧事拖走。',
    complete: '他看起来终于像是住下来了。',
  },
  status: {
    id: 'status',
    name: '向上爬',
    desc: '在派系里拿到更多话语权。',
    complete: '他的名字开始出现在派系内部的名单上。',
  },
  bond: {
    id: 'bond',
    name: '寻找归属',
    desc: '想在这里找到一个能并肩的人。',
    complete: '他和另一个人走得很近，至少今晚不再一个人。',
  },
  wander: {
    id: 'wander',
    name: '离开这里',
    desc: '总觉得下一座城会有答案。',
    complete: '他收拾好了行李，但没有立刻走。',
  },
  revenge: {
    id: 'revenge',
    name: '清算旧账',
    desc: '有些账不能一直挂着。',
    complete: '他记住了那个人的名字。',
  },
}

export const FACTION_RANKS = ['外围', '成员', '骨干', '执事', '话事人']

export function ensureNpcLife(run, npc) {
  if (!npc) return null
  if (!npc.life || typeof npc.life !== 'object') {
    const rng = createRng(`${run?.seed || ''}:npc-life:${npc.id}`)
    const tags = npc.tags || []
    const personality = npc.personality || {}
    let goal = 'stability'
    if ((personality.aggression || 0) >= 65 || tags.includes('grudge')) goal = 'revenge'
    else if ((personality.loyalty || 0) >= 70 || tags.includes('loyal')) goal = 'status'
    else if ((personality.curiosity || 0) >= 70 || tags.includes('curious')) goal = 'wander'
    else if (!npc.lover && (npc.relation?.closeness || 0) < 45) goal = 'bond'
    npc.life = {
      goal,
      progress: rng.int(0, 18),
      goalDays: 0,
      needs: { safety: 70, belonging: 60, purpose: 60 },
      lowNeedDays: { safety: 0, belonging: 0, purpose: 0 },
      criticalDays: 0,
      factionRank: 0,
      partnerId: null,
      feudWith: null,
      leftCity: false,
      leftDay: 0,
      returnDay: 0,
      deathDay: 0,
      causeOfDeath: '',
      heirId: null,
    }
  }
  const life = npc.life
  if (!life.needs || typeof life.needs !== 'object') life.needs = { safety: 70, belonging: 60, purpose: 60 }
  Object.keys(life.needs).forEach((key) => { life.needs[key] = clamp(life.needs[key]) })
  if (!life.lowNeedDays || typeof life.lowNeedDays !== 'object') life.lowNeedDays = { safety: 0, belonging: 0, purpose: 0 }
  Object.keys(life.lowNeedDays).forEach((key) => { life.lowNeedDays[key] = Math.max(0, life.lowNeedDays[key] || 0) })
  if (typeof life.factionRank !== 'number') life.factionRank = 0
  if (typeof life.progress !== 'number') life.progress = 0
  if (typeof life.leftCity !== 'boolean') life.leftCity = false
  return life
}

export function npcLifeStatus(npc, run = null) {
  const life = npc?.life
  if (!life) return null
  const needs = life.needs || { safety: 0, belonging: 0, purpose: 0 }
  const average = Math.round((needs.safety + needs.belonging + needs.purpose) / 3)
  return {
    goal: LIFE_GOALS[life.goal] || LIFE_GOALS.stability,
    progress: life.progress || 0,
    needs,
    average,
    rank: FACTION_RANKS[life.factionRank] || FACTION_RANKS[0],
    rankIndex: life.factionRank,
    partner: life.partnerId ? (run?.npcs?.[life.partnerId]?.name || '某人') : null,
    feudWith: life.feudWith,
    feudName: life.feudWith ? (run?.npcs?.[life.feudWith]?.name || '某人') : null,
    leftCity: life.leftCity,
    returnDay: life.returnDay,
  }
}

function removeFromBastion(run, npc) {
  if (!run.bastion) return
  run.bastion.residents = (run.bastion.residents || []).filter((id) => id !== npc.id)
  Object.keys(run.bastion.assignments || {}).forEach((id) => {
    if (run.bastion.assignments[id] === npc.id) delete run.bastion.assignments[id]
  })
  npc.bastionResident = false
}

function closestAlly(run, npc) {
  const edges = (run.npcEdges || []).filter((edge) => edge.a === npc.id || edge.b === npc.id)
  const scored = edges.map((edge) => {
    const other = run.npcs[edge.a === npc.id ? edge.b : edge.a]
    return { npc: other, score: (edge.trust || 0) + (edge.closeness || 0) - (edge.rivalry || 0) }
  }).filter((item) => item.npc?.alive && item.npc.id !== npc.id)
  scored.sort((left, right) => right.score - left.score)
  return scored[0]?.npc || null
}

function killNpc(run, npc, cause) {
  npc.alive = false
  npc.active = false
  npc.deathDay = run.day
  npc.causeOfDeath = cause
  npc.party = false
  run.party = (run.party || []).filter((id) => id !== npc.id)
  removeFromBastion(run, npc)
  const heir = closestAlly(run, npc)
  if (heir) {
    heir.credits = (heir.credits || 0) + (npc.credits || 0)
    heir.bag = heir.bag || {}
    Object.entries(npc.bag || {}).forEach(([key, count]) => {
      heir.bag[key] = (heir.bag[key] || 0) + count
    })
    npc.life.heirId = heir.id
    heir.life = heir.life || null
    return `${npc.name} 没能撑过这个晚上。${heir.name} 收下了他留下的东西。`
  }
  run.player.credits += Math.min(40, npc.credits || 0)
  return `${npc.name} 没能撑过这个晚上。没有人来认领他的遗物。`
}

function leaveCity(run, npc, reason) {
  npc.life.leftCity = true
  npc.life.leftDay = run.day
  npc.life.returnDay = run.day + 4 + (Number(npc.id.split('-')[1]) || 0) % 5
  npc.active = false
  npc.activity = '离开了空港'
  npc.party = false
  run.party = (run.party || []).filter((id) => id !== npc.id)
  removeFromBastion(run, npc)
  return `${npc.name} ${reason}，收拾东西离开了空港。`
}

function resolveGoal(run, npc, rng) {
  const life = npc.life
  const goal = LIFE_GOALS[life.goal] || LIFE_GOALS.stability
  if (life.goal === 'status') {
    life.factionRank = Math.min(FACTION_RANKS.length - 1, life.factionRank + 1)
    life.progress = 0
    life.goalDays = 0
    return `${npc.name} 在派系里升了一级，现在是「${FACTION_RANKS[life.factionRank]}」。`
  }
  if (life.goal === 'bond') {
    const partner = closestAlly(run, npc)
    if (partner && !partner.life?.partnerId) {
      ensureNpcLife(run, partner)
      partner.life.partnerId = npc.id
      life.partnerId = partner.id
      life.progress = 0
      life.goalDays = 0
      return `${npc.name} 和 ${partner.name} 走得很近。至少今晚，他们不再各自回舱。`
    }
    life.progress = 35
    return `${npc.name} 想靠近谁，但还没有找到合适的人。`
  }
  if (life.goal === 'wander') {
    life.progress = 0
    life.goalDays = 0
    return leaveCity(run, npc, '觉得这里没有答案')
  }
  if (life.goal === 'revenge') {
    const target = (run.npcEdges || [])
      .filter((edge) => edge.a === npc.id || edge.b === npc.id)
      .map((edge) => ({ edge, other: run.npcs[edge.a === npc.id ? edge.b : edge.a] }))
      .filter((item) => item.other?.alive && item.other.id !== npc.id)
      .sort((left, right) => (right.edge.rivalry || 0) - (left.edge.rivalry || 0))[0]
    if (target) {
      life.feudWith = target.other.id
      target.other.relation.grievance = clamp((target.other.relation.grievance || 0) + 8)
      life.progress = 0
      life.goalDays = 0
      return `${npc.name} 和 ${target.other.name} 之间的旧账被重新翻了出来。`
    }
    life.progress = 40
    return `${npc.name} 还没找到那个该算账的人。`
  }
  life.needs.safety = clamp(life.needs.safety + 8)
  life.needs.belonging = clamp(life.needs.belonging + 8)
  life.needs.purpose = clamp(life.needs.purpose + 8)
  life.progress = 0
  life.goalDays = 0
  return `${npc.name} 把舱室收拾了一遍。看起来像是打算继续住下去。`
}

export function lifeTick(run) {
  if (!run?.npcs) return []
  const events = []
  const rng = createRng(`${run.seed}:life:${run.day}`)
  const active = Object.values(run.npcs).filter((npc) => npc.tier !== 'background')

  active.forEach((npc) => {
    if (!npc.alive) return
    const life = ensureNpcLife(run, npc)
    if (life.leftCity) {
      if (run.day >= life.returnDay) {
        life.leftCity = false
        life.returnedDay = run.day
        npc.active = true
        npc.activity = '回到了空港'
        events.push(`${npc.name} 又回到了空港。他看起来比离开时更沉默。`)
      }
      return
    }
    if (npc.active === false) return

    const hasPartner = Boolean(life.partnerId && run.npcs[life.partnerId]?.alive)
    const hasClose = (run.npcEdges || []).some((edge) => (
      (edge.a === npc.id || edge.b === npc.id) && edge.closeness >= 55
    ))
    const assigned = run.bastion?.residents?.includes(npc.id)
    const wanted = run.wanted?.level || 0

    life.needs.safety = clamp(life.needs.safety - wanted * 2 - (npc.injured ? 5 : 0) + (hasPartner ? 1 : 0))
    life.needs.belonging = clamp(life.needs.belonging + (hasPartner || hasClose ? 2 : -1) - (npc.quarrel?.active ? 5 : 0))
    life.needs.purpose = clamp(life.needs.purpose + (assigned || life.factionRank > 0 ? 2 : -1) + ((run.party || []).includes(npc.id) ? 2 : 0))

    Object.keys(life.needs).forEach((key) => {
      if (life.needs[key] < 25) life.lowNeedDays[key] += 1
      else life.lowNeedDays[key] = Math.max(0, life.lowNeedDays[key] - 1)
    })

    life.criticalDays = life.needs.safety < 10 ? (life.criticalDays || 0) + 1 : 0
    if (life.criticalDays >= 3 && npc.tier === 'core' && rng.chance(0.2)) {
      events.push(killNpc(run, npc, '长期暴露在危险里'))
      return
    }
    if (life.lowNeedDays.safety >= 3) {
      npc.injured = true
      life.lowNeedDays.safety = 0
      events.push(`${npc.name} 最近总在受伤。他的动作越来越慢。`)
    }
    if (life.lowNeedDays.belonging >= 3 && !npc.quarrel?.active && (npc.lover || npc.ambiguous || hasPartner)) {
      npc.quarrel = { active: true, day: run.day, topic: '生活压力' }
      life.lowNeedDays.belonging = 0
      events.push(`${npc.name} 为了一件小事发了火。那不像他。`)
    }
    if (life.lowNeedDays.purpose >= 4) {
      life.lowNeedDays.purpose = 0
      events.push(leaveCity(run, npc, '觉得自己在这里没有用'))
      return
    }
    const needAverage = (life.needs.safety + life.needs.belonging + life.needs.purpose) / 3
    const gain = needAverage >= 65 ? 5 : needAverage >= 40 ? 3 : 1
    life.progress = clamp(life.progress + gain, 0, 100)
    life.goalDays += 1
    if (life.progress >= 100) {
      events.push(resolveGoal(run, npc, rng))
    }
  })

  return events
}
