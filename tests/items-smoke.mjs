/**
 * 消耗品生效、提示字段与小礼物赠送。
 */

import { randomDraft } from '../src/game-core/character.js'
import { createRun } from '../src/game-core/run.js'
import { applyConsumable } from '../src/game-core/run.js'
import { GIFT_KEYS, ITEMS } from '../src/game-core/data.js'
import { giftToNpc } from '../src/game-core/npc.js'

const errors = []
const check = (condition, label) => { if (!condition) errors.push(label) }

const run = createRun(randomDraft(), 'ITEM-TEST')
run.player.hp = Math.max(1, run.player.hpMax - 40)
run.player.mental = Math.max(1, run.player.mentalMax - 40)
run.inv.medkit = 1
const beforeHp = run.player.hp
const used = applyConsumable(run, 'medkit', ITEMS.medkit)
check(used.ok, '医疗包使用失败')
check(used.changes?.hp > 0, '医疗包没有返回生命变化')
check(run.player.hp > beforeHp, '医疗包没有恢复生命')
check((run.inv.medkit || 0) === 0, '医疗包没有扣除')

check(GIFT_KEYS.length >= 6, '小礼物数量不足')
check(GIFT_KEYS.every((key) => ITEMS[key]?.kind === 'gift'), '小礼物类型不正确')
check(GIFT_KEYS.every((key) => !ITEMS[key].effect), '小礼物不应该有效果')
check(ITEMS.stim.useHint.includes('战斗外'), '稳定剂缺少使用时机提示')
check(ITEMS.ration.useHint.includes('生命'), '营养膏缺少效果提示')

const npc = Object.values(run.npcs)[0]
run.inv.pebble = 1
const gift = giftToNpc(run, npc.id, 'pebble')
check(gift.ok, '小礼物赠送失败')
check((run.inv.pebble || 0) === 0, '小礼物送出后没有扣除')
check(gift.reply.length > 5, '小礼物没有回复')

if (errors.length) {
  console.error('FAILED')
  errors.forEach((error) => console.error(' -', error))
  process.exit(1)
}

console.log(JSON.stringify({
  ok: true,
  heal: used.changes,
  gifts: GIFT_KEYS.length,
  giftReply: gift.reply,
}, null, 2))
