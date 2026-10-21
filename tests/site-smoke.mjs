/**
 * 探索点：分层深入、AP 消耗、奖励/风险与最终清理。
 */

import { randomDraft } from '../src/game-core/character.js'
import { createRun, exploreSite } from '../src/game-core/run.js'
import { NODE_TYPES, SITE_APPROACHES } from '../src/game-core/data.js'

const errors = []
const check = (condition, label) => { if (!condition) errors.push(label) }

const run = createRun(randomDraft(), 'SITE-TEST')
const site = Object.values(run.map.nodes).find((node) => node.type === 'site')
check(!!site, '地图没有生成探索点')
check(NODE_TYPES.site?.name === '探索点', '探索点节点类型没有注册')
if (!site) {
  console.log(JSON.stringify({ ok: false, errors }))
  process.exit(1)
}
check(site.site?.maxDepth === 3, '探索点没有三层深度')
check(SITE_APPROACHES.length === 3, '探索方式不是三种')

run.location = site.id
run.ap = 3
const first = exploreSite(run, site.id)
check(first.ok && first.depth === 1, '第一层探索失败')
check(run.ap === 2, '探索没有消耗行动点')
const second = exploreSite(run, site.id)
check(second.ok && second.depth === 2, '第二层探索失败')
const third = exploreSite(run, site.id)
check(third.ok && third.depth === 3, '第三层探索失败')
check(third.cleared && run.cleared.includes(site.id), '探索点到底后没有标记清理')
check(!exploreSite(run, site.id).ok, '探索点可以无限深入')

const scanRun = createRun(randomDraft(), 'SITE-SCAN-TEST')
const scanSite = Object.values(scanRun.map.nodes).find((node) => node.type === 'site')
scanRun.location = scanSite.id
scanRun.ap = 1
const scan = exploreSite(scanRun, scanSite.id, 'scan')
check(scan.ok && scan.approach.id === 'scan', '扫描探索方式没有生效')
check(scanRun.nodeState[scanSite.id].depth === 1, '扫描没有推进深度')

console.log(JSON.stringify({
  ok: errors.length === 0,
  depth: run.nodeState[site.id]?.depth,
  cleared: run.cleared.includes(site.id),
  errors,
}, null, 2))

if (errors.length) process.exit(1)
