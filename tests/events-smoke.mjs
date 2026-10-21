/**
 * NPC 主动事件测试：每日生成、同 seed 复现、事件处理、周报、约定与旧档字段。
 */

import { randomDraft } from '../src/game-core/character.js'
import { camp, createRun } from '../src/game-core/run.js'
import {
  EVENT_TYPES,
  completeQuestsAt,
  generateNpcEvents,
  resolveInboxEvent,
} from '../src/game-core/npc-events.js'
import { serializeRun, validateRun } from '../src/game/save.js'

const errors = []
const check = (condition, label) => { if (!condition) errors.push(label) }

const draft = randomDraft()
draft.name = '事件测试'
const run = createRun(draft, 'EVENT-TEST')
run.ap = 0
camp(run)

check(run.day === 2, '扎营没有推进一天')
check(Array.isArray(run.inbox) && run.inbox.length >= 1, '每日没有生成事件')
check(run.inbox.length <= 3, '每日事件超过 3 条（含远征词条加成）')
check(run.inbox.every((event) => EVENT_TYPES[event.type]), '出现了未知事件类型')
check(run.inbox.every((event) => event.status === 'pending'), '新事件不是待处理状态')
check(new Set(run.inbox.map((event) => event.npcId)).size === run.inbox.length, '同一天重复找同一个 NPC')
check(new Set(run.inbox.map((event) => event.type)).size === run.inbox.length, '同一天重复相同事件类型')
check(run.inbox.every((event) => run.npcs[event.npcId]), '事件 NPC 不存在')

const twin = createRun(draft, 'EVENT-TEST')
twin.ap = 0
camp(twin)
check(
  JSON.stringify(run.inbox.map((event) => [event.type, event.npcId, event.id])) ===
  JSON.stringify(twin.inbox.map((event) => [event.type, event.npcId, event.id])),
  '同 seed 每日事件不一致'
)

const message = run.inbox.find((event) => event.type === 'message')
if (message) {
  const before = run.npcs[message.npcId].relation.trust
  const result = resolveInboxEvent(run, message.id, 'reply')
  check(result.ok, '信息事件处理失败')
  check(message.status === 'resolved', '信息事件没有标记完成')
  check(run.npcs[message.npcId].relation.trust >= before, '回复信息没有关系收益')
}

const npc = run.npcs['npc-1']
npc.hostile = false
npc.alive = true
const gift = {
  id: 'test-gift',
  day: run.day,
  npcId: npc.id,
  type: 'gift',
  status: 'pending',
  title: '测试送礼',
  text: '测试',
  payload: { itemId: 'scrap' },
  choices: [{ id: 'accept', label: '收下' }, { id: 'decline', label: '婉拒' }],
}
run.inbox.push(gift)
const beforeScrap = run.inv.scrap || 0
const giftResult = resolveInboxEvent(run, gift.id, 'accept')
check(giftResult.ok && (run.inv.scrap || 0) === beforeScrap + 1, '收下礼物没有增加物品')
check(gift.status === 'resolved', '礼物事件没有标记完成')

const target = Object.values(run.map.nodes).find((node) => (
  ['gather', 'event'].includes(node.type) &&
  node.id !== run.location &&
  !run.cleared.includes(node.id)
))
check(!!target, '没有可用于约定的事件/采集节点')
if (target) {
  const questEvent = {
    id: 'test-quest',
    day: run.day,
    npcId: npc.id,
    type: 'quest',
    status: 'pending',
    title: '测试约定',
    text: '测试',
    payload: {
      nodeId: target.id,
      nodeTitle: target.title,
      region: target.region,
      deadline: run.day + 5,
      reward: { credits: 25, itemId: 'scrap' },
    },
    choices: [{ id: 'accept', label: '一起去' }, { id: 'decline', label: '拒绝' }],
  }
  run.inbox.push(questEvent)
  const beforeCredits = run.player.credits
  const questResult = resolveInboxEvent(run, questEvent.id, 'accept')
  const quest = (run.quests || []).find((item) => item.id === `quest-${questEvent.id}`)
  check(questResult.ok && quest?.status === 'active', '接受邀约没有创建约定')
  completeQuestsAt(run, target.id)
  check(quest?.status === 'done', '到达目标节点没有完成约定')
  check(run.player.credits === beforeCredits + 25, '完成约定没有发奖励')
}

const favor = {
  id: 'test-favor',
  day: run.day,
  npcId: npc.id,
  type: 'favor',
  status: 'pending',
  title: '测试求助',
  text: '测试',
  payload: { kind: 'credits', credits: 99999 },
  choices: [{ id: 'accept', label: '借' }, { id: 'decline', label: '拒绝' }],
}
run.inbox.push(favor)
const favorResult = resolveInboxEvent(run, favor.id, 'accept')
check(favorResult.ok === false && favor.status === 'pending', '资源不足时求助不应被结算')

const weeklyRun = createRun(draft, 'EVENT-WEEK')
weeklyRun.day = 7
weeklyRun.lastEventDay = 0
generateNpcEvents(weeklyRun, { force: true })
check(!!weeklyRun.weekly && typeof weeklyRun.weekly.summary === 'string', '第七天没有生成周报')

const imported = validateRun(JSON.parse(serializeRun(run)))
check(imported.ok, '带事件的存档校验失败')
check(Array.isArray(imported.run.inbox) && Array.isArray(imported.run.quests), '存档导入后事件字段丢失')

if (errors.length) {
  console.error('FAILED')
  errors.forEach((error) => console.error(' -', error))
  process.exit(1)
}

console.log(JSON.stringify({
  ok: true,
  day: run.day,
  inbox: run.inbox.map((event) => ({ type: event.type, npc: run.npcs[event.npcId]?.name, status: event.status })),
  weekly: weeklyRun.weekly,
  quests: run.quests,
}, null, 2))
