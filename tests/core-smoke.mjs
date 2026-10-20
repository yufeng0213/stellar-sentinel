/**
 * 规则层冒烟测试：地图确定性、移动、采集、锻造、装备。
 * 运行：npm run test:core
 */

import { newDraft } from '../src/game-core/character.js'
import { generateRunMap } from '../src/game-core/procgen.js'
import { craft, createRun, gather, makeGear, travel, toggleEquip } from '../src/game-core/run.js'

const errors = []
const check = (condition, label) => { if (!condition) errors.push(label) }

function draft() {
  const d = newDraft()
  d.name = '测试员'
  d.abo = 'beta'
  d.role = 'sentinel'
  d.origin = 'broker'
  d.attrs = { per: 6, vit: 6, psi: 6, tec: 6, soc: 6, wil: 6 }
  d.traits = ['nose', 'calm']
  return d
}

const a = generateRunMap('SEED-ALPHA')
const b = generateRunMap('SEED-ALPHA')
check(JSON.stringify(a) === JSON.stringify(b), '同 seed 地图不一致')
check(Object.keys(a.nodes).length === a.layers.flat().length, '节点索引与层数不一致')

const c = generateRunMap('SEED-BETA')
check(JSON.stringify(a) !== JSON.stringify(c), '不同 seed 生成了同一张图')

const run = createRun(draft(), 'SEED-ALPHA')
check(run.map.nodes[run.location].type === 'start', '起点不是 start')

const current = run.map.nodes[run.location]
const next = current.next.map((id) => run.map.nodes[id])
check(next.length > 0, '起点没有出路')

const gatherNode = next.find((node) => node.type === 'gather') || next[0]
const moved = travel(run, gatherNode.id)
check(moved.ok, '移动失败')
check(run.ap === 7, '移动没有扣 AP')

if (gatherNode.type === 'gather') {
  const before = run.ap
  const result = gather(run, gatherNode.id)
  check(result.ok, '采集失败')
  check(run.ap === before - 1, '采集没有扣 AP')

  let guard = 0
  while (run.ap > 0 && guard < 8) {
    const nextResult = gather(run, gatherNode.id)
    guard += 1
    if (!nextResult.ok) break
  }
  check(run.cleared.includes(gatherNode.id), '采空后节点没有标记完成')
}

run.ap = 8
run.inv = { ore: 9, scrap: 9, resin: 9, spore: 9, chip: 9, cold: 9 }
const crafted = craft(run, 'blade')
check(crafted.ok, '锻造失败')
check(run.gear.length === 1, '装备没有进入背包')
if (run.gear[0]) {
  check(run.equipment.weapon === run.gear[0].uid, '锻造后没有自动装备')
  toggleEquip(run, run.gear[0].uid)
  check(run.equipment.weapon === null, '卸下装备失败')
}

// 同 seed、同操作序列，掉落与日志一致
const r1 = createRun(draft(), 'DETERMINISM')
const r2 = createRun(draft(), 'DETERMINISM')
const target = Object.values(r1.map.nodes).find((node) => node.type === 'gather')
let deterministic = 'skip'
if (target) {
  r1.location = target.id
  r2.location = target.id
  const g1 = gather(r1, target.id)
  const g2 = gather(r2, target.id)
  deterministic = JSON.stringify(g1.gains) === JSON.stringify(g2.gains) ? 'same' : 'different'
  check(deterministic === 'same', '同 seed 采集结果不一致')
  check(JSON.stringify(r1.log) === JSON.stringify(r2.log), '同 seed 日志不一致')
}

const extra = makeGear(run, 'visor', '精良')
check(extra.bonus.per === 3, '精良品质加成不正确')

if (errors.length) {
  console.error('FAILED')
  errors.forEach((error) => console.error(' -', error))
  process.exit(1)
}

console.log(JSON.stringify({
  ok: true,
  nodes: Object.keys(a.nodes).length,
  layers: a.layers.map((layer) => layer.length),
  gather: gatherNode.title,
  gear: run.gear.map((gear) => `${gear.name}:${gear.quality}`),
  deterministic,
}, null, 2))
