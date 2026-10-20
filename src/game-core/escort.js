/**
 * 护送求援：受伤 NPC 请玩家把他送回空港诊所。
 * 任务本身只在城市完成，不占用战斗流程。
 */

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

export function createEscortState() {
  return []
}

export function ensureEscorts(run) {
  if (!run) return []
  if (!Array.isArray(run.escorts)) run.escorts = []
  run.escorts.forEach((escort) => {
    if (escort.status !== 'active') return
    if (escort.deadline && run.day > escort.deadline) {
      escort.status = 'failed'
      escort.result = '错过了约定时间'
    }
  })
  return run.escorts
}

export function activeEscorts(run) {
  ensureEscorts(run)
  return (run.escorts || []).filter((escort) => escort.status === 'active')
}

export function startEscort(run, npcId) {
  const npc = run?.npcs?.[npcId]
  if (!npc || !npc.alive) return { ok: false, message: '找不到这个人' }
  if (!npc.injured) return { ok: false, message: '他现在不需要护送' }
  ensureEscorts(run)
  const existing = run.escorts.find((escort) => escort.npcId === npcId && escort.status === 'active')
  if (existing) return { ok: false, message: '你已经在护送他了' }
  const escort = {
    id: `escort-${npcId}-${run.day}`,
    npcId,
    status: 'active',
    startDay: run.day,
    deadline: run.day + 2,
    reward: 35,
  }
  run.escorts.push(escort)
  return { ok: true, escort }
}

export function completeEscort(run, npcId) {
  const npc = run?.npcs?.[npcId]
  if (!npc) return { ok: false, message: '找不到这个人' }
  ensureEscorts(run)
  const escort = run.escorts.find((item) => item.npcId === npcId && item.status === 'active')
  if (!escort) return { ok: false, message: '没有进行中的护送' }
  escort.status = 'done'
  escort.completedDay = run.day
  npc.injured = false
  npc.relation.trust = clamp(npc.relation.trust + 8, 0, 100)
  npc.relation.closeness = clamp(npc.relation.closeness + 5, 0, 100)
  run.player.credits += escort.reward
  return {
    ok: true,
    npcName: npc.name,
    credits: escort.reward,
    text: `你把${npc.name}送进了诊所。医生接手时，他终于松开了扶着墙的手。`,
  }
}
