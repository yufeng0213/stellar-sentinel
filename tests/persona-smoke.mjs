/**
 * 人设专属事件：每个原型一条事件、选项可结算、只触发一次。
 */

import { randomDraft } from '../src/game-core/character.js'
import { createRun } from '../src/game-core/run.js'
import { NPC_ARCHETYPES } from '../src/game-core/npc-archetypes.js'
import { PERSONA_EVENTS } from '../src/game-core/npc-persona-events.js'
import { EVENT_TYPES, resolveInboxEvent } from '../src/game-core/npc-events.js'
import { ensureNpcTags, npcList } from '../src/game-core/npc.js'

const errors = []
const check = (condition, label) => { if (!condition) errors.push(label) }

check(EVENT_TYPES.persona?.label === '专属', '缺少专属事件类型')

let count = 0
for (const archetype of NPC_ARCHETYPES) {
  const definition = PERSONA_EVENTS[archetype.id]
  check(!!definition, `${archetype.name} 没有专属事件`)
  if (!definition) continue
  check(definition.title.length > 0 && definition.text.length > 0, `${archetype.name} 专属事件文案为空`)
  check(definition.choices.length >= 2, `${archetype.name} 专属事件选项不足`)
  count += 1
}

const run = createRun(randomDraft(), 'PERSONA-TEST')
ensureNpcTags(run)
const npc = npcList(run)[0]
npc.relation.trust = 90
npc.relation.closeness = 70

for (const archetype of NPC_ARCHETYPES) {
  const definition = PERSONA_EVENTS[archetype.id]
  if (!definition) continue
  npc.personaDone = []
  const event = {
    id: `persona-${archetype.id}`,
    day: run.day,
    week: 1,
    npcId: npc.id,
    type: 'persona',
    status: 'pending',
    title: definition.title,
    text: definition.text,
    payload: { personaId: definition.id },
    choices: definition.choices.map((choice) => ({ id: choice.id, label: choice.label })),
  }
  run.inbox.push(event)
  const choice = definition.choices[0]
  const result = resolveInboxEvent(run, event.id, choice.id)
  check(result.ok, `${archetype.name} 专属事件结算失败`)
  check(npc.personaDone.includes(definition.id), `${archetype.name} 专属事件没有标记完成`)
  check(event.status === 'resolved', `${archetype.name} 专属事件没有关闭`)
}

const imported = createRun(randomDraft(), 'PERSONA-SAVE')
check(Array.isArray(imported.npcs[npcList(imported)[0].id].personaDone), '新 NPC 缺少 personaDone')

if (errors.length) {
  console.error('FAILED')
  errors.forEach((error) => console.error(' -', error))
  process.exit(1)
}

console.log(JSON.stringify({
  ok: true,
  archetypes: NPC_ARCHETYPES.length,
  personas: count,
  resolved: NPC_ARCHETYPES.length,
}, null, 2))
