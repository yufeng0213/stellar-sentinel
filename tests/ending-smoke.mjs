/**
 * 结局后日谈与结局收集。
 */

import { randomDraft } from '../src/game-core/character.js'
import { createRun } from '../src/game-core/run.js'
import { buyDoorKey, ensureCity } from '../src/game-core/city.js'
import { resolveDoorFinale, resolveDoorStep } from '../src/game-core/door.js'
import { ENDINGS, endingFor, localEpilogue, mergeEndingRecord } from '../src/game-core/ending.js'
import { validateRun } from '../src/game/save.js'

const errors = []
const check = (condition, label) => { if (!condition) errors.push(label) }

check(ENDINGS.length === 4, '结局数量不是 4')
check(endingFor('open', 2).id === 'open_clear', '开门 + 全成功结局错误')
check(endingFor('open', 1).id === 'open_dark', '开门 + 失败结局错误')
check(endingFor('close', 2).id === 'close_clear', '关门 + 全成功结局错误')
check(endingFor('close', 0).id === 'close_scar', '关门 + 失败结局错误')

const run = createRun(randomDraft(), 'ENDING-TEST')
run.player.credits = 300
run.story.chapter = 4
run.story.flags.intel = true
run.story.flags.boss_signal = true
run.day = 9
run.defeats = 2
ensureCity(run)
buyDoorKey(run)
resolveDoorStep(run)
resolveDoorStep(run)
const finale = resolveDoorFinale(run, 'open')
check(finale.ok, '开门结局失败')
check(run.door.endingId === 'open_clear' || run.door.endingId === 'open_dark', '门没有写入结局 ID')
check(!!run.epilogue?.text, '没有生成后日谈')
check(run.epilogue.text.includes('第 9 天'), '后日谈没有日期')
check(run.epilogue.text.includes('信用点'), '后日谈没有资源')
check(run.story.flags.endingId === run.door.endingId, '主线没有记录结局 ID')

const direct = localEpilogue(run, 'close_scar')
check(direct.includes('半句话'), '指定结局后日谈缺少对应文本')

const first = mergeEndingRecord({}, {
  id: 'open_clear', title: '灯还亮着', runId: run.id, day: 9, choice: 'open', successes: 2, at: 100,
})
check(first.open_clear.count === 1, '结局首次收集计数错误')
check(first.open_clear.firstAt === 100, '结局首次收集时间错误')
const second = mergeEndingRecord(first, {
  id: 'open_clear', title: '灯还亮着', runId: run.id, day: 11, choice: 'open', successes: 2, at: 200,
})
check(second.open_clear.count === 2, '结局重复收集没有累加')
check(second.open_clear.firstAt === 100 && second.open_clear.lastAt === 200, '结局收集时间被覆盖')

const imported = validateRun(JSON.parse(JSON.stringify(run)))
check(imported.ok, '结局存档校验失败')
check(imported.run.epilogue?.endingId === run.door.endingId, '存档没有保留后日谈')
check(imported.run.door?.endingId === run.door.endingId, '存档没有保留结局 ID')

if (errors.length) {
  console.error('FAILED')
  errors.forEach((error) => console.error(' -', error))
  process.exit(1)
}

console.log(JSON.stringify({
  ok: true,
  endings: ENDINGS.length,
  endingId: run.door.endingId,
  epilogue: run.epilogue.text.slice(0, 30),
  collection: second.open_clear.count,
}, null, 2))
