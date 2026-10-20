/**
 * NPC 探知档案测试：阶段解锁、逐条生成、本地降级文本、存档保留。
 */

import { randomDraft } from '../src/game-core/character.js'
import { createRun } from '../src/game-core/run.js'
import {
  LORE_TIERS,
  buildLoreMessages,
  localLore,
  loreStatusFor,
  loreTarget,
  stripLore,
} from '../src/game/lore.js'
import { serializeRun, validateRun } from '../src/game/save.js'

const errors = []
const check = (condition, label) => { if (!condition) errors.push(label) }

check(LORE_TIERS.length === 5, '探知层级不是 5')
check(LORE_TIERS.every((tier) => tier.slots.length === 3), '每层不是 3 条')
check(LORE_TIERS.reduce((sum, tier) => sum + tier.slots.length, 0) === 15, '总条目不是 15')

const run = createRun(randomDraft(), 'LORE-TEST')
const npc = run.npcs['npc-1']
check(npc.lore && Array.isArray(npc.lore.entries), 'NPC 没有档案结构')
check(npc.lore.entries.length === 0, '创建时不应预生成档案')

npc.relation.trust = 0
npc.relation.closeness = 0
let status = loreStatusFor(npc)
check(status.selected.id === 'public' && status.selected.unlocked, '公开档案没有解锁')
check(!status.tiers.find((tier) => tier.id === 'familiar').unlocked, '低关系时熟悉层不应解锁')
check(status.latest === null, '初始不应有已探知条目')

const publicTarget = loreTarget(npc, 'public')
check(publicTarget.ok && publicTarget.slot.id === 'origin', '公开档案第一条不是来处')
const lockedTarget = loreTarget(npc, 'familiar')
check(lockedTarget.ok === false, '未解锁层级仍可探知')

const messages = buildLoreMessages(run, npc, publicTarget.tier, publicTarget.slot)
check(messages.messages.length === 2, '档案 prompt 不是两段')
check(messages.messages[0].content.includes('70-140'), '档案 prompt 缺少长度约束')
check(messages.messages[1].content.includes('本次条目'), '档案 prompt 缺少条目说明')

const local = localLore(run, npc, publicTarget.tier, publicTarget.slot)
check(typeof local === 'string' && local.length > 10, '本地档案文本为空')
check(stripLore('档案：这是测试').includes('这是测试'), '档案清理没有去掉前缀')
check(stripLore('```\n档案：这是测试\n```').includes('这是测试'), '档案清理误删了代码块内容')

npc.lore.entries.push({
  id: 'public-origin',
  tier: 'public',
  tierName: '公开档案',
  slot: 'origin',
  slotLabel: '来处',
  text: local,
  day: run.day,
  source: 'local',
})
status = loreStatusFor(npc, 'public')
check(status.selected.used === 1 && status.selected.remaining === 2, '探知后计数不正确')
check(status.latest?.text === local, '最新档案没有返回')

npc.relation.trust = 30
npc.relation.closeness = 20
status = loreStatusFor(npc)
check(status.tiers.find((tier) => tier.id === 'familiar').unlocked, '关系达标后熟悉层没有解锁')

npc.relation.trust = 90
npc.relation.closeness = 90
status = loreStatusFor(npc)
check(status.tiers.every((tier) => tier.unlocked), '高关系没有解锁全部层级')

const imported = validateRun(JSON.parse(serializeRun(run)))
check(imported.ok, '带探知档案的存档校验失败')
check(imported.run.npcs['npc-1'].lore.entries.length === 1, '存档导入后档案丢失')

if (errors.length) {
  console.error('FAILED')
  errors.forEach((error) => console.error(' -', error))
  process.exit(1)
}

console.log(JSON.stringify({
  ok: true,
  tiers: LORE_TIERS.map((tier) => ({ id: tier.id, name: tier.name, slots: tier.slots.length, trust: tier.trust, closeness: tier.closeness })),
  entry: status.latest,
}, null, 2))
