/**
 * 角色创建与敏捷玩法测试：数据完整性、点数、随机开局、扒窃判定、存档迁移。
 */

import {
  ATTRS, FLAWS, ITEMS, LANDSCAPES, ORIGINS, SCENTS, SKILLS, SPECIES, TRAITS,
} from '../src/game-core/data.js'
import {
  buildCharacter, freePointsOf, isValidDraft, newDraft, pointsLeft, randomDraft,
} from '../src/game-core/character.js'
import { createRun } from '../src/game-core/run.js'
import { stealFromNpc, stealFromShop } from '../src/game-core/steal.js'
import { serializeRun, validateRun } from '../src/game/save.js'

const errors = []
const check = (condition, label) => { if (!condition) errors.push(label) }

check(Object.keys(ORIGINS).length >= 25, '出身少于 25 个')
check(Object.keys(SPECIES).length >= 6, '人种少于 6 个')
check(Object.keys(LANDSCAPES).length >= 8, '图景少于 8 个')
check(Object.keys(SCENTS).length >= 10, '气味少于 10 个')
check(Object.keys(SKILLS).length >= 10, '能力少于 10 个')
check(Object.keys(FLAWS).length >= 10, '缺陷少于 10 个')
check(Object.keys(TRAITS).length >= 12, '特质少于 12 个')
check(ATTRS.length === 8, '属性不是 8 项')

const attrKeys = new Set(ATTRS.map((item) => item.key))
Object.values(ORIGINS).forEach((origin) => {
  check(origin.items && Object.keys(origin.items).every((key) => ITEMS[key]), `${origin.name} 的起始物品无效`)
  check(Object.keys(origin.mod || {}).every((key) => attrKeys.has(key)), `${origin.name} 的属性修正无效`)
})
Object.values(SPECIES).forEach((item) => check(Object.keys(item.mod || {}).every((key) => attrKeys.has(key)), `${item.name} 的属性修正无效`))
Object.values(LANDSCAPES).forEach((item) => check(Object.keys(item.mod || {}).every((key) => attrKeys.has(key)), `${item.name} 的属性修正无效`))
Object.values(SCENTS).forEach((item) => check(Object.keys(item.mod || {}).every((key) => attrKeys.has(key)), `${item.name} 的属性修正无效`))
Object.values(FLAWS).forEach((item) => check(Object.keys(item.mod || {}).every((key) => attrKeys.has(key)), `${item.name} 的属性修正无效`))

function draft() {
  const d = newDraft()
  d.name = '测试员'
  d.species = 'miner'
  d.abo = 'alpha'
  d.scent = 'metal'
  d.role = 'sentinel'
  d.origin = 'miner'
  d.landscape = 'burning'
  d.flaw = 'oldwound'
  d.skills = ['steal', 'tracking']
  d.traits = ['thick', 'empath']

  let left = pointsLeft(d)
  const keys = ATTRS.map((item) => item.key)
  let index = 0
  while (left > 0 && index < 500) {
    const key = keys[index % keys.length]
    if (d.attrs[key] < 10) {
      d.attrs[key] += 1
      left -= 1
    }
    index += 1
  }
  return d
}

const d = draft()
check(pointsLeft(d) === 0, '属性点没有分配完')
check(freePointsOf(d) === 22, '缺陷点数没有计入')
check(isValidDraft(d), '合法草稿被判定为非法')
check(d.skills.length === 2 && d.traits.length === 2, '能力或特质数量不正确')

const character = buildCharacter(d)
check(character.species === 'miner' && character.landscape === 'burning' && character.scent === 'metal', '角色背景字段丢失')
check(character.attrs.agi !== undefined && character.attrs.luck !== undefined, '敏捷或机缘缺失')
check(character.hpMax > 0 && character.mentalMax > 0, '派生生命或精神异常')
check(character.perks.nightVision === true, '矿民夜视没有进入 perks')
check(character.perks.firstStrike === 2, '燃烧之城先手没有进入 perks')

const random = randomDraft()
check(pointsLeft(random) === 0, '随机开局属性点不为 0')
check(isValidDraft(random), '随机开局不是合法草稿')

// 扒窃：同 seed、同 NPC、同一天结果一致
const runA = createRun(d, 'STEAL-DET')
const runB = createRun(d, 'STEAL-DET')
const stealA = stealFromNpc(runA, 'npc-1')
const stealB = stealFromNpc(runB, 'npc-1')
check(stealA.ok && stealB.ok, '扒窃没有返回结果')
check(stealA.check.die === stealB.check.die && stealA.success === stealB.success, '同 seed 扒窃结果不一致')
check(runA.log.some((entry) => entry.text.includes('扒窃')), '扒窃没有写入日志')

let shopRun = null
let shop = null
for (let attempt = 0; attempt < 20 && !shop; attempt += 1) {
  const candidate = createRun(d, `STEAL-SHOP-${attempt}`)
  const found = Object.values(candidate.map.nodes).find((node) => node.type === 'shop')
  if (found) {
    shopRun = candidate
    shop = found
  }
}
check(!!shop, '20 个种子里都没有生成商店')
if (shop) {
  shopRun.location = shop.id
  shopRun.cleared = shopRun.cleared.filter((id) => id !== shop.id)
  shopRun.player.credits = 500
  const beforeStock = shop.stock[0].stock
  const beforeCredits = shopRun.player.credits
  const result = stealFromShop(shopRun, shop.id, 0)
  check(result.ok, '商店扒窃没有返回结果')
  if (result.success) {
    check(shop.stock[0].stock === beforeStock - 1, '商店扒窃成功但库存未减少')
  } else {
    check(shopRun.player.credits < beforeCredits, '商店扒窃失败但没有扣信用点')
    check(shopRun.cleared.includes(shop.id), '商店扒窃失败但没有收摊')
  }
}

const imported = validateRun(JSON.parse(serializeRun(runA)))
check(imported.ok, '新角色存档校验失败')
check(imported.run.player.skills.includes('steal'), '导入后能力丢失')
check(imported.run.player.species === 'miner', '导入后人种丢失')

if (errors.length) {
  console.error('FAILED')
  errors.forEach((error) => console.error(' -', error))
  process.exit(1)
}

console.log(JSON.stringify({
  ok: true,
  origins: Object.keys(ORIGINS).length,
  attrs: ATTRS.length,
  freePoints: freePointsOf(d),
  character: {
    species: character.species,
    scent: character.scent,
    landscape: character.landscape,
    hpMax: character.hpMax,
    mentalMax: character.mentalMax,
    perks: character.perks,
  },
  steal: { die: stealA.check.die, success: stealA.success, text: stealA.text },
}, null, 2))
