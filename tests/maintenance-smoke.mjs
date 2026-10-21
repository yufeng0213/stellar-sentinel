/**
 * 关系维护：争吵、和解、争宠与冷战门槛。
 */

import { randomDraft } from '../src/game-core/character.js'
import { createRun } from '../src/game-core/run.js'
import { generateNpcEvents, resolveInboxEvent } from '../src/game-core/npc-events.js'
import { noteNpcInteraction } from '../src/game-core/npc-stages.js'
import { npcList, romanceStatus, tickWorld } from '../src/game-core/npc.js'

const errors = []
const check = (condition, label) => { if (!condition) errors.push(label) }

const run = createRun(randomDraft(), 'MAINTENANCE-TEST')
const npc = npcList(run)[0]
npc.lover = false
npc.loverSince = 0
npc.ambiguous = true
npc.relation.trust = 65
npc.relation.closeness = 70
npc.relation.grievance = 0
npc.strain = 30
npc.lastInteractionDay = run.day
npc.quarrel = null
run.inbox = []
run.lastEventDay = 0

const generated = generateNpcEvents(run, { force: true })
const quarrel = generated.find((event) => event.type === 'quarrel')
check(!!quarrel, '高压力恋人没有触发争吵')
if (quarrel) {
  const result = resolveInboxEvent(run, quarrel.id, 'apologize')
  check(result.ok, '争吵事件结算失败')
  check(npc.quarrel?.active === true, '争吵后没有进入冷战')
  check(!romanceStatus(run, npc.id).available, '冷战中仍然可以表白')
}

run.day += 1
run.lastEventDay = 0
const nextDay = generateNpcEvents(run, { force: true })
const reconcile = nextDay.find((event) => event.type === 'reconcile')
check(!!reconcile, '冷战第二天没有生成和解事件')
if (reconcile) {
  const result = resolveInboxEvent(run, reconcile.id, 'apologize')
  check(result.ok, '和解事件结算失败')
  check(npc.quarrel === null, '和解后冷战没有解除')
  check(romanceStatus(run, npc.id).available, '和解后仍然不能表白')
}

npc.strain = 0
npc.lastInteractionDay = run.day - 3
tickWorld(run)
check(npc.strain > 0, '长时间不互动没有增加关系压力')
noteNpcInteraction(npc, run.day)
check(npc.strain === 0, '互动没有降低关系压力')

const other = npcList(run).find((item) => item.id !== npc.id)
other.lover = true
other.ambiguous = true
other.relation.closeness = 50
npc.quarrel = null
const rivalry = {
  id: 'maintenance-rivalry',
  day: run.day,
  week: 1,
  npcId: npc.id,
  type: 'rivalry',
  status: 'pending',
  title: '他不想再猜了',
  text: '你最近总和他在一起。',
  payload: { otherId: other.id },
  choices: [
    { id: 'favor', label: '偏向这边' },
    { id: 'reassure', label: '两边都安抚' },
    { id: 'boundary', label: '把边界说清楚' },
  ],
}
run.inbox.push(rivalry)
const rivalryResult = resolveInboxEvent(run, rivalry.id, 'reassure')
check(rivalryResult.ok, '争宠事件结算失败')
check(npc.relation.closeness > 70, '争宠安抚没有提高亲近')

console.log(JSON.stringify({
  ok: errors.length === 0,
  quarrel: Boolean(quarrel),
  reconciled: npc.quarrel === null,
  strain: npc.strain,
  rivalry: rivalryResult.text,
  errors,
}, null, 2))

if (errors.length) process.exit(1)
