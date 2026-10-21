/**
 * 派系出面消案：用城市声望和信用点降低通缉等级。
 */

import { adjustReputation, factionStatuses } from './faction.js'
import { clearWanted, ensureWanted, reduceWanted } from './wanted.js'

export function wantedFactionOptions(run) {
  const wanted = ensureWanted(run)
  return factionStatuses(run).map((status) => {
    const cost = 20 + wanted.level * 10
    const repCost = wanted.level >= 3 ? 12 : 8
    return {
      ...status,
      canHelp: wanted.level > 0 && status.score >= 30,
      canClear: wanted.level > 0 && status.score >= 60,
      cost,
      repCost,
    }
  })
}

export function factionInterveneWanted(run, factionId) {
  const wanted = ensureWanted(run)
  if (!wanted.level) return { ok: false, message: '你目前没有被通缉' }
  const status = factionStatuses(run).find((item) => item.id === factionId)
  if (!status) return { ok: false, message: '没有这个派系' }
  if (status.score < 30) return { ok: false, message: `需要 ${status.name} 声望 30` }
  const cost = 20 + wanted.level * 10
  if (run.player.credits < cost) return { ok: false, message: `需要 ${cost} 信用点` }
  const repCost = wanted.level >= 3 ? 12 : 8
  const clear = status.score >= 60
  run.player.credits -= cost
  adjustReputation(run, factionId, -repCost, '派系出面消案')
  if (clear) clearWanted(run)
  else reduceWanted(run, 1)
  return {
    ok: true,
    faction: status,
    cost,
    repCost,
    cleared: clear,
    level: run.wanted.level,
  }
}
