/**
 * 城市控制方：谁控制空港，市场、任务、巡逻和 NPC 态度就会不同。
 */

import { scheduleControlReactionFollowUps } from './control-reactions.js'

export const CITY_CONTROL_INFO = {
  tower: {
    label: '白塔残余',
    short: '白塔',
    desc: '白塔的回收队接管了街道，旧档案和情报比货物更值钱。',
    effects: { patrol: 1, intelDiscount: 10, marketStock: -1 },
    effectText: '巡逻 +1 · 黑市情报 -10 · 市场库存 -1',
    preferredQuest: 'clear',
    questBonus: 0.12,
    attitude: '支持白塔的人更安心，其他派系的人开始收声。',
  },
  market: {
    label: '黑市网络',
    short: '黑市',
    desc: '市场公会控制了货流，摊位更多，价格也更低。',
    effects: { marketStock: 2, marketDiscount: 0.06 },
    effectText: '市场库存 +2 · 市场价格 -6% · 委托奖励 +10%',
    preferredQuest: 'deliver',
    questBonus: 0.1,
    attitude: '市场的人更愿意开口，理想主义者觉得这里越来越像交易所。',
  },
  drifters: {
    label: '漂流者',
    short: '漂流者',
    desc: '漂流者把空港当成路网的一站，采集队愿意带回更多东西。',
    effects: { gatherBonus: 1, marketStock: 1 },
    effectText: '采集 +1 · 市场库存 +1 · 委托奖励 +8%',
    preferredQuest: 'deliver',
    questBonus: 0.08,
    attitude: '路上的人更自在，白塔的人觉得这里越来越难管。',
  },
  whisper: {
    label: '低语者',
    short: '低语者',
    desc: '低语者在空港保留了静默室，精神恢复更稳定。',
    effects: { mentalHeal: 6, healPct: 0.05 },
    effectText: '精神恢复 +6 · 治疗 +5% · 委托奖励 +8%',
    preferredQuest: 'clear',
    questBonus: 0.08,
    attitude: '低语者的人更安静，市场的人觉得生意变慢了。',
  },
  council: {
    label: '城市议会',
    short: '议会',
    desc: '城市议会试图让所有人都有位置，但没有人真正满意。',
    effects: { marketDiscount: 0.03, healPct: 0.03 },
    effectText: '市场价格 -3% · 治疗 +3% · 委托奖励 +4%',
    preferredQuest: null,
    questBonus: 0.04,
    attitude: '居民对议会保持观望，至少没有人公开反对。',
  },
  crew: {
    label: '方舟',
    short: '方舟',
    desc: '方舟把这里当成补给点，市场萎缩，但你的队伍拿到了更多。',
    effects: { marketStock: -1, marketDiscount: -0.05 },
    effectText: '市场库存 -1 · 市场价格 +5% · 方舟物资 +',
    preferredQuest: 'clear',
    questBonus: 0.06,
    attitude: '居民对你保持距离，市场的人把价格牌翻了一面。',
  },
}

export function cityControlInfo(control) {
  return CITY_CONTROL_INFO[control] || null
}

export function cityControlEffects(control) {
  return cityControlInfo(control)?.effects || {}
}

function leaveCity(run, cityId, npc) {
  const city = run.cities?.[cityId] || run.city
  if (city) {
    city.npcIds = (city.npcIds || []).filter((id) => id !== npc.id)
    city.visitorIds = (city.visitorIds || []).filter((id) => id !== npc.id)
  }
  npc.active = false
  npc.cityId = null
  npc.party = false
  npc.controlStance = '离开'
  npc.life = npc.life || {}
  npc.life.leftCity = true
  npc.life.returnDay = run.day + 5
  run.party = (run.party || []).filter((id) => id !== npc.id)
  if (npc.bastionResident) {
    npc.bastionResident = false
    if (run.bastion) {
      run.bastion.residents = (run.bastion.residents || []).filter((id) => id !== npc.id)
      Object.keys(run.bastion.assignments || {}).forEach((key) => {
        if (run.bastion.assignments[key] === npc.id) delete run.bastion.assignments[key]
      })
    }
  }
}

export function applyControlAttitudes(run, cityId, control) {
  if (!run?.npcs || !control) return { supporters: [], opponents: [], defectors: [], leavers: [], avengers: [] }
  const info = cityControlInfo(control)
  const residents = Object.values(run.npcs).filter((npc) => (
    npc.alive &&
    npc.active !== false &&
    !npc.life?.leftCity &&
    (npc.cityId === cityId || (!npc.cityId && cityId === 'dock'))
  ))
  const supporters = []
  const opponents = []
  const defectors = []
  const leavers = []
  const avengers = []
  const reactions = []
  const factionControl = ['tower', 'market', 'drifters', 'whisper'].includes(control)

  residents.forEach((npc) => {
    const trust = npc.relation?.trust || 0
    const grievance = npc.relation?.grievance || 0
    const aggression = npc.personality?.aggression || 0
    const loyalty = npc.personality?.loyalty || 0

    if (control === 'council') {
      npc.relation.trust = Math.min(100, trust + 2)
      npc.controlStance = '观望'
      return
    }

    if (control === 'crew') {
      if (aggression >= 65 && trust < 30) {
        npc.hostile = true
        npc.controlStance = '报复'
        avengers.push(npc.name)
        if (!run.pendingAmbush) run.pendingAmbush = npc.id
        reactions.push({ npcId: npc.id, name: npc.name, type: 'revenge', text: `${npc.name} 不接受方舟接管，开始在你的路上等着。` })
        return
      }
      if (trust < 20) {
        leaveCity(run, cityId, npc)
        leavers.push(npc.name)
        reactions.push({ npcId: npc.id, name: npc.name, type: 'leave', text: `${npc.name} 收拾东西离开了空港。` })
        return
      }
      npc.relation.trust = Math.max(0, trust - 3)
      npc.controlStance = '疏远'
      opponents.push(npc.name)
      return
    }

    if (npc.faction === control) {
      npc.relation.trust = Math.min(100, trust + 6)
      npc.relation.grievance = Math.max(0, grievance - 2)
      npc.controlStance = '支持'
      supporters.push(npc.name)
      return
    }

    if (factionControl && npc.faction && trust >= 55 && loyalty < 60) {
      npc.faction = control
      npc.controlStance = '投靠'
      npc.relation.trust = Math.min(100, trust + 3)
      defectors.push(npc.name)
      supporters.push(npc.name)
      reactions.push({ npcId: npc.id, name: npc.name, type: 'defect', text: `${npc.name} 转而投靠了${info?.label || control}。` })
      return
    }

    if (aggression >= 60 || grievance >= 45) {
      npc.hostile = true
      npc.controlStance = '报复'
      avengers.push(npc.name)
      if (!run.pendingAmbush) run.pendingAmbush = npc.id
      reactions.push({ npcId: npc.id, name: npc.name, type: 'revenge', text: `${npc.name} 不承认新的控制方，开始准备报复。` })
      return
    }

    if (trust < 25 || loyalty < 35) {
      leaveCity(run, cityId, npc)
      leavers.push(npc.name)
      reactions.push({ npcId: npc.id, name: npc.name, type: 'leave', text: `${npc.name} 不愿意留在这座城市，离开了空港。` })
      return
    }

    npc.relation.trust = Math.max(0, trust - 4)
    npc.controlStance = '不满'
    opponents.push(npc.name)
  })

  scheduleControlReactionFollowUps(run, cityId, reactions)
  if (run.city) {
    run.city.controlAttitudes = {
      day: run.day,
      control,
      supporters,
      opponents,
      defectors,
      leavers,
      avengers,
      reactions,
      text: info?.attitude || '',
    }
  }
  return { supporters, opponents, defectors, leavers, avengers, reactions }
}
