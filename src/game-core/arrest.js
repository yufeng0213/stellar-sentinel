/**
 * 城市拘留与保释：巡逻队盘查后可以被带走。
 */

import { clearWanted, ensureWanted } from './wanted.js'

export function createArrestState() {
  return {
    active: false,
    cityId: 'dock',
    day: 0,
    bail: 0,
    reason: '',
    releasedDay: 0,
    method: null,
  }
}

export function ensureArrest(run) {
  if (!run) return createArrestState()
  if (!run.arrest || typeof run.arrest !== 'object') run.arrest = createArrestState()
  const arrest = run.arrest
  if (typeof arrest.active !== 'boolean') arrest.active = false
  if (typeof arrest.cityId !== 'string') arrest.cityId = run.activeCityId || 'dock'
  if (typeof arrest.day !== 'number') arrest.day = 0
  if (typeof arrest.bail !== 'number') arrest.bail = 0
  if (typeof arrest.reason !== 'string') arrest.reason = ''
  if (typeof arrest.releasedDay !== 'number') arrest.releasedDay = 0
  return arrest
}

export function arrestPlayer(run, reason = '巡逻队盘查') {
  const arrest = ensureArrest(run)
  const wanted = ensureWanted(run)
  const level = Math.max(1, wanted.level)
  arrest.active = true
  arrest.cityId = run.activeCityId || 'dock'
  arrest.day = run.day
  arrest.bail = 40 + level * 35
  arrest.reason = reason
  arrest.releasedDay = 0
  arrest.method = null
  if (run.patrolCheck) {
    run.patrolCheck.pending = false
    run.patrolCheck.resolvedDay = run.day
    run.patrolCheck.choice = 'surrender'
    run.patrolCheck.text = '你被巡逻队带去了拘留室。'
    run.patrolCheck.battle = false
  }
  return { ok: true, arrest, text: `巡逻队给你上了束缚带。保释金 ${arrest.bail} 信用点。` }
}

export function bailPlayer(run, method = 'credits') {
  const arrest = ensureArrest(run)
  if (!arrest.active) return { ok: false, message: '你没有被拘留' }
  if (method === 'relic') {
    if ((run.inv.relic || 0) < 1) return { ok: false, message: '没有可用于抵押的遗物' }
    run.inv.relic -= 1
  } else {
    if (run.player.credits < arrest.bail) return { ok: false, message: `需要 ${arrest.bail} 信用点` }
    run.player.credits -= arrest.bail
  }
  const wantedLevel = ensureWanted(run).level
  clearWanted(run)
  arrest.active = false
  arrest.releasedDay = run.day
  arrest.method = method
  return {
    ok: true,
    method,
    bail: arrest.bail,
    wantedLevel,
    text: method === 'relic'
      ? '你把一件遗物留在拘留室。巡逻队没有再看你第二眼。'
      : `你交了 ${arrest.bail} 信用点。拘留室的门在你身后关上，又打开。`,
  }
}
