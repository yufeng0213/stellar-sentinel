/**
 * 关系阶段：陌生 → 熟悉 → 好感 → 暧昧 → 恋人。
 */

import { randomDraft } from '../src/game-core/character.js'
import { createRun } from '../src/game-core/run.js'
import { NPC_ARCHETYPES } from '../src/game-core/npc-archetypes.js'
import { STAGE_EVENTS } from '../src/game-core/npc-stage-events.js'
import { relationStageInfo, relationStageOf } from '../src/game-core/npc-stages.js'
import { npcList, romanceStatus } from '../src/game-core/npc.js'
import { generateNpcEvents, resolveInboxEvent } from '../src/game-core/npc-events.js'
import { validateRun } from '../src/game/save.js'

const errors = []
const check = (condition, label) => { if (!condition) errors.push(label) }

const run = createRun(randomDraft(), 'STAGE-TEST')
const npc = npcList(run)[0]
npc.relation.trust = 0
npc.relation.closeness = 0
npc.ambiguous = false
npc.lover = false
check(relationStageOf(npc).id === 'stranger', '初始阶段不是陌生')

npc.relation.trust = 16
npc.relation.closeness = 6
check(relationStageOf(npc).id === 'familiar', '没有进入熟悉')

npc.relation.trust = 36
npc.relation.closeness = 21
check(relationStageOf(npc).id === 'goodwill', '没有进入好感')
check(relationStageInfo(npc).canBond, '好感期没有标记可试探')
check(!romanceStatus(run, npc.id).available, '好感期不应该直接可以表白')

npc.relation.trust = 60
npc.relation.closeness = 65
check(!romanceStatus(run, npc.id).available, '未进入暧昧不应该可以表白')

const definition = STAGE_EVENTS[npc.archetype.id]
check(!!definition, '当前原型没有好感期事件')
if (definition) {
  const event = {
    id: 'stage-bond-test',
    day: run.day,
    week: 1,
    npcId: npc.id,
    type: 'bond',
    status: 'pending',
    title: definition.title,
    text: definition.text,
    payload: { stageEventId: definition.id },
    choices: definition.choices.map((choice) => ({ id: choice.id, label: choice.label })),
  }
  run.inbox.push(event)
  const result = resolveInboxEvent(run, event.id, definition.choices[0].id)
  check(result.ok, '好感期事件结算失败')
  check(npc.ambiguous === true, '接受试探后没有进入暧昧')
  check(relationStageOf(npc).id === 'ambiguous', '阶段没有变成暧昧')
  check(romanceStatus(run, npc.id).available, '暧昧期不能表达心意')
}

npc.lover = true
check(relationStageOf(npc).id === 'lover', '恋人阶段错误')

const guaranteedRun = createRun(randomDraft(), 'STAGE-GUARANTEED')
const guaranteedNpc = npcList(guaranteedRun)[0]
guaranteedNpc.relation.trust = 40
guaranteedNpc.relation.closeness = 24
guaranteedNpc.ambiguous = false
guaranteedNpc.lover = false
guaranteedRun.inbox = []
guaranteedRun.lastEventDay = 0
const generated = generateNpcEvents(guaranteedRun, { force: true })
check(generated.some((event) => event.type === 'bond'), '好感期没有被保证生成试探事件')

for (const archetype of NPC_ARCHETYPES) {
  check(!!STAGE_EVENTS[archetype.id], `${archetype.name} 缺少好感期事件`)
}

const imported = validateRun(JSON.parse(JSON.stringify(run)))
check(imported.ok, '关系阶段存档校验失败')
check(imported.run.npcs[npc.id].ambiguous === true, '存档没有保留暧昧状态')

console.log(JSON.stringify({
  ok: errors.length === 0,
  stage: relationStageOf(npc).name,
  archetypes: NPC_ARCHETYPES.length,
  events: Object.keys(STAGE_EVENTS).length,
  errors,
}, null, 2))

if (errors.length) process.exit(1)
