/**
 * 探索点：分层深入、AP 消耗、奖励/风险与最终清理。
 */

import { randomDraft } from '../src/game-core/character.js'
import { completeSiteGuardian, createRun, exploreSite, resolveSiteEncounter, siteEncounterFor } from '../src/game-core/run.js'
import { generateNpcEvents, resolveInboxEvent } from '../src/game-core/npc-events.js'
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
const blocked = exploreSite(run, site.id)
check(!blocked.ok && blocked.encounter, '深层遭遇没有拦住探索')
const encounter = siteEncounterFor(site)
const encounterChoice = encounter.id === 'guardian'
  ? encounter.choices.find((choice) => choice.id === 'talk')
  : encounter.id === 'trap'
    ? encounter.choices.find((choice) => choice.id === 'bypass')
    : encounter.choices.find((choice) => choice.id === 'question')
const encounterResult = resolveSiteEncounter(run, site.id, encounterChoice.id)
check(encounterResult.ok, '深层遭遇处理失败')
check(run.nodeState[site.id].encounterDone, '深层遭遇没有记录完成')
const third = exploreSite(run, site.id)
check(third.ok && third.depth === 3, '第三层探索失败')
check(third.cleared && run.cleared.includes(site.id), '探索点到底后没有标记清理')
check(!exploreSite(run, site.id).ok, '探索点可以无限深入')

const guardRun = createRun(randomDraft(), 'SITE-GUARD-TEST')
const guardSite = Object.values(guardRun.map.nodes).find((node) => node.type === 'site')
guardSite.site.encounter = 'guardian'
guardRun.location = guardSite.id
guardRun.nodeState[guardSite.id] = { depth: 2 }
const guardFight = resolveSiteEncounter(guardRun, guardSite.id, 'fight')
check(guardFight.ok && guardFight.battle === true, '守门者没有进入战斗')
check(!guardRun.nodeState[guardSite.id].encounterDone, '守门者战斗前就标记完成')
const guardDone = completeSiteGuardian(guardRun, guardSite.id)
check(guardDone.ok && guardRun.nodeState[guardSite.id].encounterDone, '守门者战斗后没有完成遭遇')

const survivorRun = createRun(randomDraft(), 'SITE-SURVIVOR-TEST')
const survivorSite = Object.values(survivorRun.map.nodes).find((node) => node.type === 'site')
survivorSite.site.encounter = 'survivor'
survivorRun.location = survivorSite.id
survivorRun.nodeState[survivorSite.id] = { depth: 2 }
survivorRun.inv.ration = 2
const rescue = resolveSiteEncounter(survivorRun, survivorSite.id, 'rescue')
check(rescue.ok && rescue.survivor, '幸存者没有加入空港')
const survivor = rescue.survivor
check(survivor.survivor === true, '幸存者没有标记')
check(survivor.survivorFollowUpDay >= survivorRun.day, '幸存者没有后续日期')
survivorRun.day = survivor.survivorFollowUpDay
generateNpcEvents(survivorRun, { force: true })
const survivorEvent = survivorRun.inbox.find((event) => event.type === 'survivor' && event.npcId === survivor.id)
check(!!survivorEvent, '幸存者没有触发专属后续')
if (survivorEvent) {
  const resolved = resolveInboxEvent(survivorRun, survivorEvent.id, 'listen')
  check(resolved.ok, '幸存者后续处理失败')
  check(survivor.survivorFollowUpDone === true, '幸存者后续没有标记完成')
}

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
