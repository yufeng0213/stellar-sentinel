/**
 * 开局剧情：10 个醒来场景、本地开场、第一次判定与存档。
 */

import { randomDraft } from '../src/game-core/character.js'
import { createRun } from '../src/game-core/run.js'
import {
  AWAKENINGS,
  getAwakening,
  localOpening,
  resolveOpeningChoice,
  startAwakening,
} from '../src/game-core/story.js'
import { buildStoryOpeningMessages, stripStoryOpening } from '../src/game/story.js'
import { validateRun } from '../src/game/save.js'

const errors = []
const check = (condition, label) => { if (!condition) errors.push(label) }

check(AWAKENINGS.length >= 10, '醒来场景不足 10 个')
check(new Set(AWAKENINGS.map((item) => item.id)).size === AWAKENINGS.length, '醒来场景 ID 重复')
check(AWAKENINGS.every((item) => item.opening && item.choices.length >= 2), '有场景缺少开场或选项')

const run = createRun(randomDraft(), 'STORY-TEST')
check(run.story?.stage === 'select', '新远征没有进入场景选择')
check(!run.story.awakening, '新远征不应预选场景')

const scene = AWAKENINGS[0]
const started = startAwakening(run, scene.id)
check(started.ok, '选择醒来场景失败')
check(run.story.stage === 'opening', '选择场景后没有进入开场')
check(run.story.awakening === scene.id, '没有记录醒来场景')
check(run.story.opening?.source === 'local', '没有生成本地开场')
check(run.story.opening?.text.includes(run.player.name), '本地开场没有角色名')

const opening = localOpening(run, scene)
check(opening.includes(scene.place), '本地开场没有地点')

const choice = scene.choices[0]
const result = resolveOpeningChoice(run, choice.id)
check(result.ok, '第一次判定失败')
check(run.story.stage === 'done', '判定后没有结束开场')
check(run.story.choice?.id === choice.id, '没有记录选择')
check(typeof run.story.choice.success === 'boolean', '判定结果不是布尔值')
check(run.rollCount === 1, '判定没有消耗 rollCount')
check(run.story.flags[choice.id] === result.success, '判定 flag 不一致')

const again = resolveOpeningChoice(run, scene.choices[1].id)
check(!again.ok, '开场结束后还能再次判定')

const saved = validateRun(JSON.parse(JSON.stringify(run)))
check(saved.ok, '带剧情的存档校验失败')
check(saved.run.story?.awakening === scene.id, '存档没有保留醒来场景')
check(saved.run.story?.choice?.id === choice.id, '存档没有保留判定')

const awakening = getAwakening(scene.id)
const { messages } = buildStoryOpeningMessages(run, awakening)
const prompt = messages.map((item) => item.content).join('\n')
check(prompt.includes(scene.place), 'LLM prompt 缺少场景')
check(prompt.includes(run.player.name), 'LLM prompt 缺少角色名')
check(prompt.includes('180–260'), 'LLM prompt 缺少长度要求')
check(!stripStoryOpening('```\n开场：你醒了。\n```').includes('```'), '开场文本没有清理代码块')
check(stripStoryOpening('开场：你醒了。').includes('你醒了'), '开场文本清理误删正文')

if (errors.length) {
  console.error('FAILED')
  errors.forEach((error) => console.error(' -', error))
  process.exit(1)
}

console.log(JSON.stringify({
  ok: true,
  scenes: AWAKENINGS.length,
  selected: scene.id,
  result: { success: result.success, roll: result.roll, total: result.total, dc: result.dc },
}, null, 2))
