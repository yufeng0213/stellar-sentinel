/**
 * 校准树：点数、前置节点、效果与存档。
 */

import { randomDraft } from '../src/game-core/character.js'
import { createRun } from '../src/game-core/run.js'
import {
  calibrationEffects,
  calibrationNodeStatus,
  calibrationSummary,
  grantCalibrationPoints,
  unlockCalibrationNode,
} from '../src/game-core/calibration.js'
import { validateRun } from '../src/game/save.js'

const errors = []
const check = (condition, label) => { if (!condition) errors.push(label) }

const run = createRun(randomDraft(), 'CALIBRATION-TEST')
check(run.calibration?.points === 1, '初始校准点错误')
check(!calibrationNodeStatus(run, 'sentinel_breaker').canUnlock, '前置节点没有限制')

const first = unlockCalibrationNode(run, 'sentinel_opening')
check(first.ok, '第一层校准没有解锁')
check(run.calibration.points === 0, '解锁没有扣除校准点')
check(calibrationEffects(run).firstAttack === 2, '校准效果没有生效')

const second = unlockCalibrationNode(run, 'sentinel_breaker')
check(!second.ok, '点数不足仍然解锁了节点')

const reward = grantCalibrationPoints(run, 'boss:test', 2, '首领')
check(reward.ok && run.calibration.points === 2, '里程碑没有给校准点')
check(!grantCalibrationPoints(run, 'boss:test', 2, '首领').ok, '同一里程碑重复结算')

check(unlockCalibrationNode(run, 'sentinel_breaker').ok, '第二层校准没有解锁')
check(calibrationEffects(run).armor === 2, '破甲效果没有生效')
const summary = calibrationSummary(run)
check(summary.unlocked === 2 && summary.total === 15, '校准统计错误')

const imported = validateRun(JSON.parse(JSON.stringify(run)))
check(imported.ok, '校准存档校验失败')
check(imported.run.calibration.nodes.includes('sentinel_opening'), '存档没有保留校准节点')

if (errors.length) {
  console.error('FAILED')
  errors.forEach((error) => console.error(' -', error))
  process.exit(1)
}

console.log(JSON.stringify({
  ok: true,
  points: run.calibration.points,
  nodes: run.calibration.nodes,
  effects: calibrationEffects(run),
}, null, 2))
