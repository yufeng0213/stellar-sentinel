/**
 * 城市控制方：谁控制空港，市场、任务、巡逻和 NPC 态度就会不同。
 */

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

export function applyControlAttitudes(run, cityId, control) {
  if (!run?.npcs || !control) return { supporters: [], opponents: [] }
  const info = cityControlInfo(control)
  const residents = Object.values(run.npcs).filter((npc) => (
    npc.alive &&
    npc.active !== false &&
    !npc.life?.leftCity &&
    (npc.cityId === cityId || (!npc.cityId && cityId === 'dock'))
  ))
  const supporters = []
  const opponents = []
  residents.forEach((npc) => {
    if (control === 'council') {
      npc.relation.trust = Math.min(100, (npc.relation.trust || 0) + 2)
      npc.controlStance = '观望'
      return
    }
    if (control === 'crew') {
      npc.relation.trust = Math.max(0, (npc.relation.trust || 0) - 3)
      npc.controlStance = '疏远'
      opponents.push(npc.name)
      return
    }
    if (npc.faction === control) {
      npc.relation.trust = Math.min(100, (npc.relation.trust || 0) + 6)
      npc.relation.grievance = Math.max(0, (npc.relation.grievance || 0) - 2)
      npc.controlStance = '支持'
      supporters.push(npc.name)
    } else if (npc.faction) {
      npc.relation.trust = Math.max(0, (npc.relation.trust || 0) - 4)
      npc.controlStance = '不满'
      opponents.push(npc.name)
    }
  })
  if (run.city) {
    run.city.controlAttitudes = {
      day: run.day,
      control,
      supporters,
      opponents,
      text: info?.attitude || '',
    }
  }
  return { supporters, opponents }
}
