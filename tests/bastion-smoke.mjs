/**
 * 方舟据点：邀请、容量、设施值班与休整产出。
 */

import { randomDraft } from '../src/game-core/character.js'
import { createRun } from '../src/game-core/run.js'
import { npcList } from '../src/game-core/npc.js'
import {
  assignBastionFacility,
  bastionStatus,
  canInviteNpc,
  ensureBastion,
  inviteNpcToBastion,
  removeNpcFromBastion,
  restBastion,
} from '../src/game-core/bastion.js'

const errors = []
const check = (condition, label) => { if (!condition) errors.push(label) }

const run = createRun(randomDraft(), 'BASTION-TEST')
const list = npcList(run)
check(list.length >= 5, 'NPC 数量不足')
ensureBastion(run)
check(bastionStatus(run).residentCount === 0, '据点初始不应有居民')

const first = list.find((npc) => !npc.tags?.includes('solo'))
first.relation.trust = 30
first.relation.closeness = 20
check(canInviteNpc(run, first).ok, '满足条件仍不能邀请')
const invited = inviteNpcToBastion(run, first.id)
check(invited.ok && run.bastion.residents.includes(first.id), '邀请没有加入据点')
check(first.bastionResident === true, 'NPC 没有标记为据点成员')

const assigned = assignBastionFacility(run, 'workshop', first.id)
check(assigned.ok && run.bastion.assignments.workshop === first.id, '设施值班安排失败')

run.ap = 0
const beforeCredits = run.player.credits
const beforeScrap = run.inv.scrap || 0
const rested = restBastion(run)
check(rested.ok, '据点休整失败')
check(rested.report.length === 1, '休整报告数量错误')
check(run.player.credits > beforeCredits, '工坊没有产出信用点')
check((run.inv.scrap || 0) > beforeScrap, '工坊没有产出废料')
check(run.bastion.lastRestDay === run.day, '休整日期没有记录')
check(!restBastion(run).ok, '同一天可以重复休整')

const solo = list.find((npc) => npc.tags?.includes('solo'))
if (solo) {
  solo.relation.trust = 100
  check(!canInviteNpc(run, solo).ok, '独来独往 NPC 可以进入据点')
}

for (const npc of list.filter((item) => item.id !== first.id && !run.bastion.residents.includes(item.id))) {
  if (run.bastion.residents.length >= 4) break
  npc.relation.trust = 60
  npc.relation.closeness = 50
  if (canInviteNpc(run, npc).ok) inviteNpcToBastion(run, npc.id)
}
check(run.bastion.residents.length === 4, '据点容量不是 4')
const extra = list.find((npc) => !run.bastion.residents.includes(npc.id))
extra.relation.trust = 100
check(!canInviteNpc(run, extra).ok, '满员后仍然可以邀请')

removeNpcFromBastion(run, first.id)
check(!run.bastion.residents.includes(first.id), '移出据点失败')
check(!run.bastion.assignments.workshop, '移出后没有清除值班')

console.log(JSON.stringify({
  ok: errors.length === 0,
  residents: run.bastion.residents.length,
  report: rested.report,
  errors,
}, null, 2))

if (errors.length) process.exit(1)
