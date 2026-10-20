/**
 * 关系阶段：陌生 → 熟悉 → 好感 → 暧昧 → 恋人。
 * 好感进入暧昧需要一段双方都承认的试探；恋人仍然只能通过表白建立。
 */

export const RELATION_STAGES = [
  { id: 'stranger', name: '陌生', minTrust: 0, minCloseness: 0, color: 'muted', desc: '还只是交换过名字的人。' },
  { id: 'familiar', name: '熟悉', minTrust: 15, minCloseness: 5, color: 'cyan', desc: '会打招呼，会记得你上次说过什么。' },
  { id: 'goodwill', name: '好感', minTrust: 35, minCloseness: 20, color: 'jade', desc: '开始主动找你，但还没有把话说透。' },
  { id: 'ambiguous', name: '暧昧', minTrust: 50, minCloseness: 45, color: 'violet', desc: '有些话已经到了嘴边，谁都没有先承认。' },
  { id: 'lover', name: '恋人', minTrust: 50, minCloseness: 60, color: 'red', desc: '已经说清楚的关系。' },
]

const STAGE_INDEX = Object.fromEntries(RELATION_STAGES.map((stage, index) => [stage.id, index]))

export function ensureNpcStage(npc) {
  if (!npc) return null
  if (typeof npc.ambiguous !== 'boolean') npc.ambiguous = false
  if (!npc.ambiguousSince) npc.ambiguousSince = 0
  if (!Array.isArray(npc.stageHistory)) npc.stageHistory = []
  return npc
}

export function relationStageOf(npc) {
  if (!npc) return RELATION_STAGES[0]
  if (npc.lover) return RELATION_STAGES[STAGE_INDEX.lover]
  if (npc.ambiguous) return RELATION_STAGES[STAGE_INDEX.ambiguous]
  const trust = npc.relation?.trust || 0
  const closeness = npc.relation?.closeness || 0
  let current = RELATION_STAGES[0]
  RELATION_STAGES.slice(1, 3).forEach((stage) => {
    if (trust >= stage.minTrust && closeness >= stage.minCloseness) current = stage
  })
  return current
}

export function relationStageInfo(npc) {
  const current = relationStageOf(npc)
  const index = STAGE_INDEX[current.id]
  const next = RELATION_STAGES[index + 1] || null
  const trust = npc?.relation?.trust || 0
  const closeness = npc?.relation?.closeness || 0
  return {
    ...current,
    index,
    next,
    trust,
    closeness,
    canBond: current.id === 'goodwill' && !npc?.ambiguous && !npc?.lover,
    trustToNext: next ? Math.max(0, next.minTrust - trust) : 0,
    closenessToNext: next ? Math.max(0, next.minCloseness - closeness) : 0,
  }
}

export function markAmbiguous(npc, day) {
  if (!npc || npc.lover) return false
  ensureNpcStage(npc)
  if (npc.ambiguous) return false
  npc.ambiguous = true
  npc.ambiguousSince = day
  npc.stageHistory.push({ stage: 'ambiguous', day })
  return true
}

export function clearAmbiguous(npc, day, stage = 'goodwill') {
  if (!npc) return
  ensureNpcStage(npc)
  npc.ambiguous = false
  npc.ambiguousSince = 0
  npc.stageHistory.push({ stage, day })
}
