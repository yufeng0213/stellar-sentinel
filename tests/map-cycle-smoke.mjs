/**
 * 地图收尾：击败关底 Boss 后，即使还有 AP 也能扎营并重排星图。
 */

import { randomDraft } from '../src/game-core/character.js'
import { camp, createRun, isMapExhausted } from '../src/game-core/run.js'

const errors = []
const check = (condition, label) => { if (!condition) errors.push(label) }

const run = createRun(randomDraft(), 'MAP-CYCLE-TEST')
const oldMapSeed = run.mapSeed
const bossId = run.map.bossId
run.location = bossId
run.ap = 3
run.cleared.push(bossId)
check(isMapExhausted(run), '关底 Boss 清理后没有识别为地图收尾')

const result = camp(run)
check(result.ok && result.refreshed, '地图收尾时扎营失败')
check(run.day === 2, '地图收尾扎营没有推进日期')
check(run.ap === run.apMax, '地图收尾扎营没有恢复 AP')
check(run.mapSeed !== oldMapSeed, '地图收尾没有重排星图')
check(run.location === run.map.startId, '重排后没有回到起点')
check(!isMapExhausted(run), '重排后仍被判定为地图收尾')
check(run.mapCycle === 1, '没有记录地图循环次数')

const normal = createRun(randomDraft(), 'MAP-CAMP-BLOCK-TEST')
normal.ap = 3
check(!camp(normal).ok, '普通地图还有 AP 时允许扎营')

console.log(JSON.stringify({
  ok: errors.length === 0,
  day: run.day,
  mapCycle: run.mapCycle,
  errors,
}, null, 2))

if (errors.length) process.exit(1)
