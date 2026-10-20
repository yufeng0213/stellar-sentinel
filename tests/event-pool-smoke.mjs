/**
 * 随机事件池：通用坏事件、Omega/向导/Alpha 身份事件。
 */

import { randomDraft } from '../src/game-core/character.js'
import { createRun } from '../src/game-core/run.js'

const errors = []
const check = (condition, label) => { if (!condition) errors.push(label) }

const CONDITIONAL = {
  omega_pressure: 'omega',
  omega_market: 'omega',
  guide_demand: 'guide',
  alpha_challenge: 'alpha',
}
const BAD_EVENTS = new Set(['mugging', 'beating', 'checkpoint', 'pipeburst', 'olddebt', 'nightterror'])
const seen = new Set()
const badSeen = new Set()
const wrongProfile = []

for (let index = 0; index < 80; index += 1) {
  const draft = randomDraft()
  draft.abo = index % 2 === 0 ? 'omega' : 'alpha'
  draft.role = index % 3 === 0 ? 'guide' : 'sentinel'
  const run = createRun(draft, `EVENT-POOL-${index}`)
  Object.values(run.map.nodes)
    .filter((node) => node.type === 'event')
    .forEach((node) => {
      const id = node.event.templateId
      seen.add(id)
      if (BAD_EVENTS.has(id)) badSeen.add(id)
      const need = CONDITIONAL[id]
      if (need && need !== draft.abo && need !== draft.role) {
        wrongProfile.push({ id, abo: draft.abo, role: draft.role })
      }
    })
}

check([...badSeen].length >= 4, '通用坏事件覆盖不足')
check([...seen].some((id) => CONDITIONAL[id] === 'omega'), '没有生成 Omega 事件')
check([...seen].some((id) => CONDITIONAL[id] === 'guide'), '没有生成向导事件')
check(wrongProfile.length === 0, '生成了与角色不匹配的身份事件')

if (errors.length) {
  console.error('FAILED')
  errors.forEach((error) => console.error(' -', error))
  process.exit(1)
}

console.log(JSON.stringify({
  ok: true,
  eventTypes: [...seen].sort(),
  badEvents: [...badSeen].sort(),
  conditionalCount: [...seen].filter((id) => CONDITIONAL[id]).length,
}, null, 2))
