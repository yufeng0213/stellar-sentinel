/**
 * 事件、交易与存档导入冒烟测试。
 * 运行：npm run test:world
 */

import { newDraft } from '../src/game-core/character.js'
import { buyShop, createRun, resolveEventChoice } from '../src/game-core/run.js'
import { generateRunMap } from '../src/game-core/procgen.js'
import { serializeRun, validateRun } from '../src/game/save.js'

const errors = []
const check = (condition, label) => { if (!condition) errors.push(label) }

function draft() {
  const d = newDraft()
  d.name = '世界测试'
  d.abo = 'beta'
  d.role = 'sentinel'
  d.origin = 'colonist'
  d.attrs = { per: 7, vit: 6, psi: 5, tec: 6, soc: 5, wil: 6 }
  d.traits = ['nose', 'hands']
  return d
}

const map = generateRunMap('WORLD-01')
const nodes = Object.values(map.nodes)
check(nodes.filter((node) => node.type === 'event').every((node) => node.event?.choices?.length >= 2), '事件节点缺少选项')
check(nodes.filter((node) => node.type === 'event').every((node) => node.title === node.event.title), '事件节点标题与事件标题不一致')
check(nodes.filter((node) => node.type === 'shop').every((node) => node.stock?.length >= 2), '交易节点缺少商品')
check(nodes.filter((node) => node.type === 'shop').every((node) => node.stock.every((offer) => offer.price > 0)), '商品价格异常')

const run = createRun(draft(), 'WORLD-01')
const eventNode = Object.values(run.map.nodes).find((node) => node.type === 'event')
check(!!eventNode, '没有生成事件节点')

run.location = eventNode.id
const choice = eventNode.event.choices[0]
const eventResult = resolveEventChoice(run, eventNode.id, choice.id)
check(eventResult.ok, '事件结算失败')
check(run.cleared.includes(eventNode.id), '事件完成后节点没有标记')
check(typeof eventResult.text === 'string' && eventResult.text.length > 0, '事件没有返回结果文本')

// 同 seed、同选择，结果一致
const a = createRun(draft(), 'WORLD-DET')
const b = createRun(draft(), 'WORLD-DET')
const ea = Object.values(a.map.nodes).find((node) => node.type === 'event')
if (ea) {
  const eb = b.map.nodes[ea.id]
  a.location = ea.id
  b.location = eb.id
  const ca = ea.event.choices[0]
  const cb = eb.event.choices[0]
  resolveEventChoice(a, ea.id, ca.id)
  resolveEventChoice(b, eb.id, cb.id)
  check(
    JSON.stringify([a.player.credits, a.player.mental, a.player.hp, a.inv, a.flags]) ===
    JSON.stringify([b.player.credits, b.player.mental, b.player.hp, b.inv, b.flags]),
    '同 seed 事件结果不一致'
  )
}

// 交易
const shopNode = Object.values(run.map.nodes).find((node) => node.type === 'shop')
if (shopNode) {
  run.location = shopNode.id
  run.player.credits = 2000
  const beforeCredits = run.player.credits
  const offer = shopNode.stock[0]
  const price = offer.price
  const stockBefore = offer.stock
  const beforeGear = run.gear.length
  const beforeInv = JSON.stringify(run.inv)

  const bought = buyShop(run, shopNode.id, 0)
  check(bought.ok, '购买失败')
  check(run.player.credits === beforeCredits - price, '购买没有扣信用点')
  check(shopNode.stock[0].stock === stockBefore - 1, '库存没有减少')
  check(run.gear.length > beforeGear || JSON.stringify(run.inv) !== beforeInv, '购买没有增加物品')

  while (shopNode.stock[0].stock > 0 && run.player.credits >= offer.price) {
    buyShop(run, shopNode.id, 0)
  }
  check(buyShop(run, shopNode.id, 0).ok === false, '卖完后仍可购买')

  run.player.credits = 0
  check(buyShop(run, shopNode.id, 1).ok === false, '信用点不足仍可购买')
}

// 存档导入
const json = serializeRun(run)
const imported = validateRun(JSON.parse(json))
check(imported.ok, '存档导入校验失败')
check(imported.run.id === run.id, '导入后 ID 不一致')
check(Object.keys(imported.run.npcs).length === 18, '导入后 NPC 丢失')

const invalid = validateRun({ id: 'x' })
check(invalid.ok === false, '无效存档被接受')

const legacy = JSON.parse(json)
delete legacy.npcs
delete legacy.npcChats
delete legacy.llm
const migrated = validateRun(legacy)
check(migrated.ok, '旧存档迁移失败')
check(Object.keys(migrated.run.npcs).length === 18, '旧存档没有补全 NPC')

if (errors.length) {
  console.error('FAILED')
  errors.forEach((error) => console.error(' -', error))
  process.exit(1)
}

console.log(JSON.stringify({
  ok: true,
  event: { node: eventNode.id, choice: choice.id, result: eventResult.text, success: eventResult.success },
  shop: shopNode ? { node: shopNode.id, offers: shopNode.stock.length } : 'none',
  save: { id: imported.run.id, npcs: Object.keys(imported.run.npcs).length },
}, null, 2))
