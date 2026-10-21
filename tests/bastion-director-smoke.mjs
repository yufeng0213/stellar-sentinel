/**
 * 据点压力导演：平静 / 紧张 / 混乱三类事件。
 */

import { randomDraft } from '../src/game-core/character.js'
import { createRun } from '../src/game-core/run.js'
import { npcList } from '../src/game-core/npc.js'
import {
  assignBastionFacility,
  buildBastionEvent,
  ensureBastion,
  inviteNpcToBastion,
  queueBastionChain,
  resolveBastionEvent,
} from '../src/game-core/bastion.js'

const errors = []
const check = (condition, label) => { if (!condition) errors.push(label) }

function makeRun(seed, wanted = 0) {
  const run = createRun(randomDraft(), seed)
  const npc = npcList(run).find((item) => !item.tags?.includes('solo'))
  npc.relation.trust = 60
  npc.relation.closeness = 50
  ensureBastion(run)
  inviteNpcToBastion(run, npc.id)
  npc.bastionSince = run.day
  npc.bastionPersonaDone = []
  assignBastionFacility(run, 'clinic', npc.id)
  run.wanted = { level: wanted, cityId: 'dock', reason: '测试', sinceDay: run.day, fine: 0 }
  return { run, npc }
}

const calm = makeRun('DIRECTOR-CALM', 0)
const calmEvent = buildBastionEvent(calm.run)
check(calm.run.bastion.pressure === 'calm', '低压力没有进入平静')
check(['visitor', 'windfall'].includes(calmEvent?.type), '平静事件类型错误')

const tense = makeRun('DIRECTOR-TENSE', 1)
const tenseEvent = buildBastionEvent(tense.run)
check(tense.run.bastion.pressure === 'tense', '通缉没有进入紧张')
check(['quarrel', 'homesick', 'injury', 'faction_pressure'].includes(tenseEvent?.type), '紧张事件类型错误')

const chaos = makeRun('DIRECTOR-CHAOS', 3)
const chaosEvent = buildBastionEvent(chaos.run)
check(chaos.run.bastion.pressure === 'chaos', '三级通缉没有进入混乱')
check(['raid', 'defect', 'fire', 'theft'].includes(chaosEvent?.type), '混乱事件类型错误')

if (chaosEvent) {
  chaos.run.bastion.pendingEvent = chaosEvent
  const resolved = resolveBastionEvent(chaos.run, chaosEvent.id, chaosEvent.choices[0].id)
  check(resolved.ok, '混乱事件处理失败')
  check(resolved.text.length > 0, '混乱事件没有结果文本')
}

queueBastionChain(chaos.run, 'raid_mark', chaos.npc.id, 1)
chaos.run.bastion.pendingEvent = null
chaos.run.day += 2
const chainEvent = buildBastionEvent(chaos.run)
check(chainEvent?.type === 'chain', '后续事件链没有生成')
if (chainEvent) {
  chaos.run.bastion.pendingEvent = chainEvent
  const chainResolved = resolveBastionEvent(chaos.run, chainEvent.id, chainEvent.choices[0].id)
  check(chainResolved.ok, '后续事件链处理失败')
  check(!chaos.run.bastion.chains.some((chain) => chain.id === chainEvent.chainId), '后续事件链没有清除')
}

const archived = makeRun('DIRECTOR-ARCHIVE', 0)
const archivedEvent = buildBastionEvent(archived.run)
check(archivedEvent?.type === 'visitor' || archivedEvent?.type === 'windfall', '平静事件没有保存到状态')

console.log(JSON.stringify({
  ok: errors.length === 0,
  calm: calmEvent?.type,
  tense: tenseEvent?.type,
  chaos: chaosEvent?.type,
  errors,
}, null, 2))

if (errors.length) process.exit(1)
