/**
 * 约定与失约：答应、履行、过期和失约事件。
 */

import { randomDraft } from '../src/game-core/character.js'
import { createRun } from '../src/game-core/run.js'
import { npcList } from '../src/game-core/npc.js'
import { generateNpcEvents, resolveInboxEvent } from '../src/game-core/npc-events.js'
import {
  createPromise,
  fulfillPromise,
  giftForNpc,
  openPromises,
} from '../src/game-core/npc-promises.js'
import { validateRun } from '../src/game/save.js'

const errors = []
const check = (condition, label) => { if (!condition) errors.push(label) }

const run = createRun(randomDraft(), 'PROMISE-TEST')
const npc = npcList(run)[0]
npc.relation.trust = 40
npc.relation.closeness = 30
npc.strain = 10

const visit = createPromise(run, npc, 'visit')
check(visit.ok, '见面约定创建失败')
check(openPromises(run, npc.id).length === 1, '约定列表没有记录')
const fulfilledVisit = fulfillPromise(run, visit.promise.id)
check(fulfilledVisit.ok, '见面约定履行失败')
check(visit.promise.status === 'done', '见面约定状态错误')
check(npc.relation.trust > 40, '履行约定没有提高信任')

const gift = createPromise(run, npc, 'gift')
check(gift.ok, '礼物约定创建失败')
const itemId = giftForNpc(npc)
run.inv[itemId] = 1
const fulfilledGift = fulfillPromise(run, gift.promise.id)
check(fulfilledGift.ok, '礼物约定履行失败')
check(!run.inv[itemId], '履行礼物约定没有扣除物品')
check(gift.promise.status === 'done', '礼物约定状态错误')

const missed = createPromise(run, npc, 'visit')
check(missed.ok, '过期约定创建失败')
run.day = missed.promise.deadline + 1
run.lastEventDay = 0
const generated = generateNpcEvents(run, { force: true })
const brokenEvent = generated.find((event) => event.type === 'broken') ||
  run.inbox.find((event) => event.type === 'broken')
check(missed.promise.status === 'broken', '过期约定状态错误')
check(npc.relation.grievance > 0, '失约没有增加怨念')
check(!!brokenEvent, '失约没有生成收件箱事件')
if (brokenEvent) {
  const result = resolveInboxEvent(run, brokenEvent.id, 'apologize')
  check(result.ok, '失约事件处理失败')
}

const imported = validateRun(JSON.parse(JSON.stringify(run)))
check(imported.ok, '约定存档校验失败')
check(Array.isArray(imported.run.promises), '存档没有保留约定列表')

console.log(JSON.stringify({
  ok: errors.length === 0,
  promises: run.promises.map((promise) => [promise.type, promise.status]),
  broken: Boolean(brokenEvent),
  errors,
}, null, 2))

if (errors.length) process.exit(1)
