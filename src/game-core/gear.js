/**
 * 装备词条、套装与强化。
 * 装备仍然是主成长线：更好的图纸、词条和强化共同决定战斗表现。
 */

import { GEAR, GEAR_AFFIXES, GEAR_SETS, RECIPES } from './data.js'
import { createRng } from './rng.js'

const QUALITY_ORDER = ['粗糙', '标准', '精良', '原型']

export function ensureGear(run) {
  if (!run) return []
  if (!Array.isArray(run.gear)) run.gear = []
  run.gear.forEach((gear) => {
    const base = GEAR[gear.key]
    if (!base) return
    if (!gear.setId) gear.setId = base.setId || null
    if (!gear.tier) gear.tier = gearTierFor(gear.key)
    if (!Array.isArray(gear.affixes)) gear.affixes = rollGearAffixes(run, gear.key, gear.quality, gear.tier)
    if (typeof gear.upgradeLevel !== 'number') gear.upgradeLevel = 0
  })
  return run.gear
}

export function equippedGear(run) {
  return Object.values(run?.equipment || {})
    .map((uid) => (run.gear || []).find((item) => item.uid === uid))
    .filter(Boolean)
}

export function gearTierFor(key) {
  const recipe = RECIPES.find((item) => item.out === key)
  if (recipe?.tier) return recipe.tier
  return 'standard'
}

export function rollGearAffixes(run, key, quality, tier = gearTierFor(key)) {
  const count = quality === '粗糙'
    ? 0
    : quality === '精良' || tier === 'prototype'
      ? 2
      : 1
  if (!count) return []
  const rng = createRng(`${run.seed}:affix:${run.gear.length}:${key}:${quality}`)
  const pool = Object.keys(GEAR_AFFIXES)
  return rng.shuffle(pool).slice(0, count).map((id) => ({ id, ...GEAR_AFFIXES[id] }))
}

export function gearSetState(run) {
  const counts = {}
  equippedGear(run).forEach((gear) => {
    const setId = gear.setId || GEAR[gear.key]?.setId
    if (!setId || !GEAR_SETS[setId]) return
    counts[setId] = (counts[setId] || 0) + 1
  })
  return Object.entries(GEAR_SETS)
    .map(([id, set]) => {
      const count = counts[id] || 0
      return {
        id,
        name: set.name,
        count,
        two: count >= 2 ? set.two : null,
        four: count >= 4 ? set.four : null,
      }
    })
    .filter((set) => set.count > 0)
}

export function gearEffects(run) {
  const total = {}
  const add = (effects = {}) => {
    Object.entries(effects).forEach(([key, value]) => {
      total[key] = (total[key] || 0) + value
    })
  }
  equippedGear(run).forEach((gear) => {
    ;(gear.affixes || []).forEach((affix) => add(affix.effect))
  })
  gearSetState(run).forEach((set) => {
    if (set.two) add(set.two.effect)
    if (set.four) add(set.four.effect)
  })
  return total
}

export function upgradeCost(gear) {
  const level = QUALITY_ORDER.indexOf(gear?.quality || '标准')
  if (level < 0 || level >= QUALITY_ORDER.length - 1) return null
  return {
    credits: 35 + level * 30,
    scrap: 1 + level,
    nextQuality: QUALITY_ORDER[level + 1],
  }
}

export function upgradeGear(run, uid) {
  const gear = (run?.gear || []).find((item) => item.uid === uid)
  if (!gear) return { ok: false, message: '找不到这件装备' }
  const cost = upgradeCost(gear)
  if (!cost) return { ok: false, message: '这件装备已经到顶了' }
  if (run.player.credits < cost.credits) return { ok: false, message: '信用点不足' }
  if ((run.inv.scrap || 0) < cost.scrap) return { ok: false, message: `还需要 ${cost.scrap} 块合金废料` }

  run.player.credits -= cost.credits
  run.inv.scrap -= cost.scrap
  if (run.inv.scrap <= 0) delete run.inv.scrap
  gear.quality = cost.nextQuality
  gear.upgradeLevel = (gear.upgradeLevel || 0) + 1
  const attrKeys = Object.keys(gear.bonus || {})
  if (attrKeys.length) {
    const key = attrKeys[(gear.upgradeLevel - 1) % attrKeys.length]
    gear.bonus[key] = (gear.bonus[key] || 0) + 1
  }
  if (!gear.affixes?.length && cost.nextQuality !== '粗糙') {
    gear.affixes = rollGearAffixes(run, gear.key, cost.nextQuality, gear.tier)
  }
  return { ok: true, gear, cost }
}
