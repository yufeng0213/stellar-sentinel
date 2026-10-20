/**
 * 图纸、装备词条、套装与强化。
 */

import { randomDraft } from '../src/game-core/character.js'
import { createRun, makeGear } from '../src/game-core/run.js'
import { unlockBossBlueprint, ensureBlueprints, recipeKnown } from '../src/game-core/blueprint.js'
import { gearEffects, gearSetState, upgradeCost, upgradeGear } from '../src/game-core/gear.js'
import { validateRun } from '../src/game/save.js'

const errors = []
const check = (condition, label) => { if (!condition) errors.push(label) }

const run = createRun(randomDraft(), 'GEAR-TEST')
const blade = makeGear(run, 'blade', '精良')
check(!!blade.setId, '装备没有套装标记')
check(blade.affixes.length === 2, '精良装备没有两个词条')
check(blade.tier === 'standard', '基础装备阶级错误')
run.gear.push(blade)

const visor = makeGear(run, 'visor', '标准')
run.gear.push(visor)
run.equipment.weapon = blade.uid
run.equipment.head = visor.uid
const sets = gearSetState(run)
check(sets.some((set) => set.id === 'tower' && set.count === 2), '套装计数错误')
check(sets.find((set) => set.id === 'tower')?.two, '两件套没有激活')
check((gearEffects(run).shield || 0) > 0, '套装/词条护盾没有生效')

run.player.credits = 200
run.inv.scrap = 10
const cost = upgradeCost(blade)
check(!!cost, '精良装备没有强化费用')
const beforeQuality = blade.quality
const upgraded = upgradeGear(run, blade.uid)
check(upgraded.ok && blade.quality !== beforeQuality, '装备强化失败')
check(blade.upgradeLevel === 1, '强化等级没有记录')

ensureBlueprints(run)
check(recipeKnown(run, 'blade'), '基础图纸没有掌握')
check(!recipeKnown(run, 'void'), '原型图纸不应初始掌握')
const unlocked = unlockBossBlueprint(run)
check(unlocked.ok && recipeKnown(run, 'void'), 'Boss 图纸没有解锁')

const imported = validateRun(JSON.parse(JSON.stringify(run)))
check(imported.ok, '装备存档校验失败')
check(imported.run.blueprints.includes('void'), '存档没有保留图纸')
check(imported.run.gear[0].affixes.length > 0, '存档没有保留装备词条')

if (errors.length) {
  console.error('FAILED')
  errors.forEach((error) => console.error(' -', error))
  process.exit(1)
}

console.log(JSON.stringify({
  ok: true,
  affixes: blade.affixes.map((affix) => affix.name),
  sets: sets.map((set) => [set.name, set.count]),
  quality: blade.quality,
  blueprints: run.blueprints,
}, null, 2))
