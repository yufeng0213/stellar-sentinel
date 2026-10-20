/**
 * 访客个人剧情：三阶段关系门槛、信用点、奖励与派系声望。
 */

import { randomDraft } from '../src/game-core/character.js'
import { createRun } from '../src/game-core/run.js'
import { ensureCity } from '../src/game-core/city.js'
import {
  VISITOR_STORIES,
  advanceVisitorStory,
  ensureVisitorStory,
  visitorStoryStatus,
} from '../src/game-core/visitor-story.js'
import { validateRun } from '../src/game/save.js'

const errors = []
const check = (condition, label) => { if (!condition) errors.push(label) }

const run = createRun(randomDraft(), 'VISITOR-STORY-TEST')
const city = ensureCity(run)
const npc = run.npcs[city.visitorIds[0]]
check(!!npc?.visitor, '没有生成访客')
const story = ensureVisitorStory(run, npc)
check(!!story, '访客没有个人故事')
check(VISITOR_STORIES.some((item) => item.id === story.templateId), '故事模板不在池中')
check(story.stage === 0 && !story.completed, '故事初始阶段错误')

npc.relation.trust = 0
npc.relation.closeness = 0
let status = visitorStoryStatus(run, npc)
check(status.stage === 0, '初始故事状态错误')
check(!status.canAdvance, '低信任不应该能推进')
check(!advanceVisitorStory(run, npc.id).ok, '低信任推故事没有被拒绝')

npc.relation.trust = 15
status = visitorStoryStatus(run, npc)
check(status.canAdvance, '信任 15 没有解锁第一节')
let result = advanceVisitorStory(run, npc.id)
check(result.ok && story.stage === 1, '第一节没有推进到第二节')

npc.relation.trust = 35
run.player.credits = 100
status = visitorStoryStatus(run, npc)
check(status.canAdvance, '信任 35 + 信用点没有解锁第二节')
const creditsBefore = run.player.credits
result = advanceVisitorStory(run, npc.id)
check(result.ok && story.stage === 2, '第二节没有推进到第三节')
check(run.player.credits === creditsBefore - status.cost, '第二节没有扣信用点')

npc.relation.trust = 55
npc.relation.closeness = 35
status = visitorStoryStatus(run, npc)
check(status.canAdvance, '信任 55 / 亲近 35 没有解锁结尾')
const factionBefore = run.reputation[npc.faction]
const creditsFinal = run.player.credits
result = advanceVisitorStory(run, npc.id)
check(result.ok && story.completed, '访客故事没有完成')
check(result.reward?.credits > 0, '访客故事没有奖励')
check(run.player.credits === creditsFinal + (result.reward?.credits || 0), '结尾奖励没有到账')
check(run.reputation[npc.faction] === factionBefore + 8, '结尾没有增加派系声望')
check(!advanceVisitorStory(run, npc.id).ok, '已结束故事还能推进')

const imported = validateRun(JSON.parse(JSON.stringify(run)))
check(imported.ok, '访客故事存档校验失败')
check(imported.run.npcs[npc.id].story?.completed === true, '存档没有保留访客故事')

if (errors.length) {
  console.error('FAILED')
  errors.forEach((error) => console.error(' -', error))
  process.exit(1)
}

console.log(JSON.stringify({
  ok: true,
  story: story.templateId,
  completed: story.completed,
  reward: result.reward,
  faction: npc.faction,
}, null, 2))
