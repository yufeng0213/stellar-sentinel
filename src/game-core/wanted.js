/**
 * 城市通缉：商店扒窃败露后的悬赏、价格惩罚与罚金清除。
 */

import { cityDevelopmentEffects } from './city-development.js'

export function createWantedState() {
  return {
    level: 0,
    cityId: 'dock',
    reason: '',
    sinceDay: 0,
    fine: 0,
  }
}

export function ensureWanted(run) {
  if (!run) return createWantedState()
  if (!run.wanted || typeof run.wanted !== 'object') run.wanted = createWantedState()
  const wanted = run.wanted
  if (typeof wanted.level !== 'number') wanted.level = 0
  if (typeof wanted.cityId !== 'string') wanted.cityId = 'dock'
  if (typeof wanted.reason !== 'string') wanted.reason = ''
  if (typeof wanted.sinceDay !== 'number') wanted.sinceDay = 0
  if (typeof wanted.fine !== 'number') wanted.fine = 0
  return wanted
}

function fineFor(level) {
  return 35 + level * 30
}

export function raiseWanted(run, cityId, reason, amount = 1) {
  const wanted = ensureWanted(run)
  wanted.cityId = cityId || run.activeCityId || 'dock'
  wanted.level = Math.max(0, Math.min(3, wanted.level + Math.max(1, amount)))
  wanted.reason = reason || '商店扒窃败露'
  wanted.sinceDay = run.day
  wanted.fine = fineFor(wanted.level)
  return wanted
}

export function wantedStatus(run) {
  const wanted = ensureWanted(run)
  return {
    ...wanted,
    active: wanted.level > 0,
    cityName: run.cities?.[wanted.cityId]?.name || '白塔空港',
    priceMarkup: wanted.level * 0.05,
  }
}

export function clearWanted(run) {
  const wanted = ensureWanted(run)
  wanted.level = 0
  wanted.fine = 0
  wanted.reason = ''
  wanted.sinceDay = 0
  return wanted
}

export function reduceWanted(run, amount = 1) {
  const wanted = ensureWanted(run)
  wanted.level = Math.max(0, wanted.level - Math.max(1, amount))
  if (!wanted.level) {
    wanted.fine = 0
    wanted.reason = ''
    wanted.sinceDay = 0
  } else {
    wanted.fine = fineFor(wanted.level)
    wanted.sinceDay = run.day
  }
  return wanted
}

export function payWanted(run) {
  const wanted = ensureWanted(run)
  if (!wanted.level) return { ok: false, message: '你目前没有被通缉' }
  if (run.player.credits < wanted.fine) return { ok: false, message: `需要 ${wanted.fine} 信用点` }
  const fine = wanted.fine
  run.player.credits -= fine
  clearWanted(run)
  return { ok: true, fine }
}

export function wantedPriceMarkup(run) {
  return ensureWanted(run).level * 0.05
}

export function decayWanted(run) {
  const wanted = ensureWanted(run)
  if (!wanted.level) return wanted
  const patrol = cityDevelopmentEffects(run).patrol || 0
  if (run.day - wanted.sinceDay < (patrol ? 2 : 3)) return wanted
  wanted.level = Math.max(0, wanted.level - 1)
  wanted.sinceDay = run.day
  wanted.fine = wanted.level ? fineFor(wanted.level) : 0
  if (!wanted.level) wanted.reason = ''
  return wanted
}
