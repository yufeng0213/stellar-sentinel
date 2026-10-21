/**
 * 巡逻队逮捕与保释。
 */

import { randomDraft } from '../src/game-core/character.js'
import { createRun, travel } from '../src/game-core/run.js'
import { bailPlayer, ensureArrest } from '../src/game-core/arrest.js'
import { factionBail, factionBailOptions } from '../src/game-core/faction-bail.js'
import { maybeTriggerPatrol, resolvePatrolCheck } from '../src/game-core/patrol.js'
import { raiseWanted } from '../src/game-core/wanted.js'

const errors = []
const check = (condition, label) => { if (!condition) errors.push(label) }

const run = createRun(randomDraft(), 'ARREST-TEST')
run.city.reconstruction = { completed: true, policy: 'fortify' }
run.player.credits = 500
raiseWanted(run, 'dock', '商店扒窃败露', 2)
ensureArrest(run)
maybeTriggerPatrol(run)
const surrendered = resolvePatrolCheck(run, 'surrender')
check(surrendered.ok && run.arrest.active, '束手就擒没有进入拘留')
check(run.arrest.bail > 0, '保释金没有设置')
check(!run.patrolCheck.pending, '逮捕后盘查没有结束')

const current = run.map.nodes[run.location]
const nextId = current?.next?.[0]
if (nextId) {
  const blocked = travel(run, nextId)
  check(!blocked.ok && blocked.message.includes('拘留'), '拘留中没有阻止旅行')
}

const bail = bailPlayer(run)
check(bail.ok, '保释失败')
check(!run.arrest.active, '保释后仍在拘留')
check(run.wanted.level === 0, '保释后通缉没有清除')
check(run.player.credits < 500, '保释没有扣信用点')

const relicRun = createRun(randomDraft(), 'ARREST-RELIC-TEST')
relicRun.city.reconstruction = { completed: true, policy: 'fortify' }
raiseWanted(relicRun, 'dock', '再次败露', 1)
ensureArrest(relicRun)
maybeTriggerPatrol(relicRun)
resolvePatrolCheck(relicRun, 'surrender')
relicRun.inv.relic = 1
const relicBail = bailPlayer(relicRun, 'relic')
check(relicBail.ok && !relicRun.arrest.active, '遗物抵押保释失败')
check((relicRun.inv.relic || 0) === 0, '遗物抵押没有消耗遗物')

const factionRun = createRun(randomDraft(), 'ARREST-FACTION-TEST')
factionRun.city.reconstruction = { completed: true, policy: 'fortify' }
factionRun.reputation.tower = 70
raiseWanted(factionRun, 'dock', '派系保释测试', 2)
ensureArrest(factionRun)
maybeTriggerPatrol(factionRun)
resolvePatrolCheck(factionRun, 'surrender')
const options = factionBailOptions(factionRun)
const tower = options.find((item) => item.id === 'tower')
check(tower?.canBail, '高声望派系没有保释选项')
const repBefore = factionRun.reputation.tower
const factionResult = factionBail(factionRun, 'tower')
check(factionResult.ok && !factionRun.arrest.active, '派系保释没有解除拘留')
check(factionRun.wanted.level === 0, '派系保释没有清除通缉')
check(factionRun.reputation.tower < repBefore, '派系保释没有消耗声望')
check(factionRun.factionFavors.tower === factionRun.day, '派系保释没有留下人情')

console.log(JSON.stringify({
  ok: errors.length === 0,
  bail: bail.bail,
  errors,
}, null, 2))

if (errors.length) process.exit(1)
