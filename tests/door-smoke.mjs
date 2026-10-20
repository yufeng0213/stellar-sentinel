/**
 * 第四章：三枚门钥、两段判定、最终选择与存档。
 */

import { randomDraft } from '../src/game-core/character.js'
import { createRun } from '../src/game-core/run.js'
import { buyDoorKey, ensureCity } from '../src/game-core/city.js'
import { DOOR_STEPS, doorSeals, doorStatus, resolveDoorFinale, resolveDoorStep } from '../src/game-core/door.js'
import { chapterStatus } from '../src/game-core/story.js'
import { validateRun } from '../src/game/save.js'

const errors = []
const check = (condition, label) => { if (!condition) errors.push(label) }

const run = createRun(randomDraft(), 'DOOR-TEST')
run.player.credits = 300
run.story.chapter = 4
run.story.flags.intel = true
run.story.flags.boss_signal = true
ensureCity(run)

const beforeKey = doorSeals(run)
check(!beforeKey.complete, '没有门钥时门不应该齐全')
check(!resolveDoorStep(run).ok, '没有门钥时不应该能判定')

const key = buyDoorKey(run)
check(key.ok, '购买门钥失败')
check(run.story.flags.doorKey, '门钥没有写入 flag')
check(run.player.credits === 300 - 80, '门钥没有扣信用点')
check(buyDoorKey(run).ok === false, '门钥可以重复购买')

const seals = doorSeals(run)
check(seals.complete, '三枚门钥没有集齐')
check(doorStatus(run).canBegin, '门没有进入可开始状态')

const first = resolveDoorStep(run)
check(first.ok, '第一段门判定失败')
check(run.door.stage === 1, '第一段判定后 stage 不对')
const second = resolveDoorStep(run)
check(second.ok, '第二段门判定失败')
check(run.door.stage === 2, '第二段判定后 stage 不对')
check(run.door.checks.length === DOOR_STEPS.length, '门判定记录不完整')

const finale = resolveDoorFinale(run, 'open')
check(finale.ok, '开门失败')
check(run.door.opened, '门没有标记为打开')
check(run.story.flags.door_opened, '门结局没有写入主线 flag')
check(chapterStatus(run).complete, '第四章没有完成')
check(run.door.endingText.includes('门'), '结局文本为空')

const imported = validateRun(JSON.parse(JSON.stringify(run)))
check(imported.ok, '门存档校验失败')
check(imported.run.door?.opened === true, '存档没有保留门状态')
check(imported.run.story?.flags?.door_opened === true, '存档没有保留门结局')

if (errors.length) {
  console.error('FAILED')
  errors.forEach((error) => console.error(' -', error))
  process.exit(1)
}

console.log(JSON.stringify({
  ok: true,
  checks: run.door.checks.map((entry) => ({ id: entry.id, success: entry.success })),
  ending: run.door.ending,
  door: run.door.endingText.slice(0, 24),
}, null, 2))
