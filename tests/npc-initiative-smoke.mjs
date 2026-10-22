/**
 * NPC 每日主动事件：申请入队、申请入住方舟。
 */

import { randomDraft } from '../src/game-core/character.js'
import { createRun } from '../src/game-core/run.js'
import { buildNpcInitiative, resolveInboxEvent } from '../src/game-core/npc-events.js'

const errors = []
const check = (condition, label) => { if (!condition) errors.push(label) }
const pickNpc = (run) => Object.values(run.npcs).find((npc) => (
  npc.alive &&
  npc.active !== false &&
  !npc.tags?.includes('solo')
))

const partyRun = createRun(randomDraft(), 'NPC-INITIATIVE-PARTY-TEST')
const partyNpc = pickNpc(partyRun)
if (partyNpc) {
  partyNpc.relation.trust = 65
  partyNpc.relation.closeness = 45
  partyNpc.relation.grievance = 0
  const partyOffer = buildNpcInitiative(partyRun, 'party_offer')
  check(partyOffer?.type === 'party_offer', '没有生成主动入队事件')
  if (partyOffer) {
    partyRun.inbox.unshift(partyOffer)
    const accepted = resolveInboxEvent(partyRun, partyOffer.id, 'accept')
    check(accepted.ok, '主动入队处理失败')
    check((partyRun.party || []).includes(partyOffer.npcId), 'NPC 没有加入队伍')
  }
}

const bastionRun = createRun(randomDraft(), 'NPC-INITIATIVE-BASTION-TEST')
const bastionNpc = pickNpc(bastionRun)
if (bastionNpc) {
  bastionNpc.relation.trust = 65
  bastionNpc.relation.grievance = 0
  const bastionOffer = buildNpcInitiative(bastionRun, 'bastion_offer')
  check(bastionOffer?.type === 'bastion_offer', '没有生成主动入住事件')
  if (bastionOffer) {
    bastionRun.inbox.unshift(bastionOffer)
    const accepted = resolveInboxEvent(bastionRun, bastionOffer.id, 'accept')
    check(accepted.ok, '主动入住处理失败')
    check(bastionRun.bastion.residents.includes(bastionOffer.npcId), 'NPC 没有加入据点')
  }
}

console.log(JSON.stringify({
  ok: errors.length === 0,
  party: partyRun.party?.length || 0,
  residents: bastionRun.bastion?.residents?.length || 0,
  errors,
}, null, 2))

if (errors.length) process.exit(1)
