/**
 * 设防巡逻队盘查：触发、证件、逃跑/战斗与通缉降低。
 */

import { randomDraft } from '../src/game-core/character.js'
import { createRun } from '../src/game-core/run.js'
import {
  completePatrolBattle,
  ensurePatrolCheck,
  maybeTriggerPatrol,
  resolvePatrolCheck,
} from '../src/game-core/patrol.js'
import { raiseWanted } from '../src/game-core/wanted.js'

const errors = []
const check = (condition, label) => { if (!condition) errors.push(label) }

const run = createRun(randomDraft(), 'PATROL-TEST')
run.city.reconstruction = { completed: true, policy: 'fortify' }
run.player.credits = 500
raiseWanted(run, 'dock', '测试通缉', 2)
ensurePatrolCheck(run)

check(maybeTriggerPatrol(run), '设防城市没有触发巡逻盘查')
check(run.patrolCheck.pending, '巡逻盘查没有挂起')
const first = resolvePatrolCheck(run, 'papers')
check(first.ok && !run.patrolCheck.pending, '出示证件没有结束盘查')
check(run.wanted.level === 1, '出示证件没有降低通缉')
check(run.player.credits < 500, '出示证件没有消耗信用点')

run.day += 1
check(maybeTriggerPatrol(run), '第二天没有再次触发巡逻盘查')
const fight = resolvePatrolCheck(run, 'fight')
check(fight.ok && fight.battle, '动手没有进入战斗')
const done = completePatrolBattle(run)
check(done.ok && !run.patrolCheck.pending, '巡逻战斗后没有结束盘查')
check(run.wanted.level === 0, '巡逻战斗后没有降低通缉')

const safeRun = createRun(randomDraft(), 'PATROL-SAFE-TEST')
raiseWanted(safeRun, 'dock', '普通通缉', 1)
check(!maybeTriggerPatrol(safeRun), '无巡逻城市触发了盘查')

console.log(JSON.stringify({
  ok: errors.length === 0,
  wanted: run.wanted.level,
  errors,
}, null, 2))

if (errors.length) process.exit(1)
