/**
 * 每日结算：积压事件不会让后续日子完全没有 NPC 事件。
 */

import { randomDraft } from '../src/game-core/character.js'
import { camp, createRun } from '../src/game-core/run.js'

const errors = []
const check = (condition, label) => { if (!condition) errors.push(label) }

const run = createRun(randomDraft(), 'DAILY-SETTLEMENT-TEST')
const withEvents = []
for (let index = 0; index < 8; index += 1) {
  run.ap = 0
  const result = camp(run)
  check(result.ok, `第 ${index + 1} 次扎营失败`)
  const today = run.inbox.filter((event) => event.day === run.day)
  withEvents.push(today.length)
  check(today.length > 0, `第 ${run.day} 天没有新的 NPC 事件`)
  check(run.lastEventDay === run.day, `第 ${run.day} 天没有记录事件结算`)
}

console.log(JSON.stringify({
  ok: errors.length === 0,
  days: withEvents.length,
  newEventsPerDay: withEvents,
  pending: run.inbox.filter((event) => event.status === 'pending').length,
  errors,
}, null, 2))

if (errors.length) process.exit(1)
