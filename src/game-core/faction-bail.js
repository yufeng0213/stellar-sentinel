/**
 * 派系保释：高声望派系可以替玩家交保，但会消耗声望并留下一笔人情。
 */

import { ensureArrest } from './arrest.js'
import { adjustReputation, factionStatuses } from './faction.js'
import { clearWanted, ensureWanted } from './wanted.js'

export function factionBailOptions(run) {
  const arrest = ensureArrest(run)
  if (!arrest.active) return []
  const wanted = ensureWanted(run)
  return factionStatuses(run).map((status) => ({
    ...status,
    canBail: status.score >= 30,
    repCost: status.score >= 60 ? 8 : 12,
    wantedLevel: wanted.level,
  }))
}

export function factionBail(run, factionId) {
  const arrest = ensureArrest(run)
  if (!arrest.active) return { ok: false, message: '你没有被拘留' }
  const status = factionStatuses(run).find((item) => item.id === factionId)
  if (!status) return { ok: false, message: '没有这个派系' }
  if (status.score < 30) return { ok: false, message: `需要 ${status.name} 声望 30` }
  const repCost = status.score >= 60 ? 8 : 12
  adjustReputation(run, factionId, -repCost, '派系保释')
  const wantedLevel = ensureWanted(run).level
  clearWanted(run)
  arrest.active = false
  arrest.releasedDay = run.day
  arrest.method = `faction:${factionId}`
  run.factionFavors = run.factionFavors || {}
  run.factionFavors[factionId] = run.day
  return {
    ok: true,
    faction: status,
    repCost,
    wantedLevel,
    text: `${status.name}的人来了一趟拘留室。你没有付保释金，但欠了他们一个人情。`,
  }
}
