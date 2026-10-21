/**
 * 派系人情债务：登记、还钱、帮忙、延期与拒绝。
 */

import { randomDraft } from '../src/game-core/character.js'
import { createRun } from '../src/game-core/run.js'
import {
  ensureFactionDebts,
  factionDebtStatuses,
  registerFactionDebt,
  resolveFactionDebt,
} from '../src/game-core/faction-debt.js'

const errors = []
const check = (condition, label) => { if (!condition) errors.push(label) }

const run = createRun(randomDraft(), 'FACTION-DEBT-TEST')
run.player.credits = 500
run.inv.scrap = 10
run.reputation.tower = 60
ensureFactionDebts(run)
registerFactionDebt(run, 'tower', { day: run.day, dueDay: run.day + 2, wantedLevel: 2 })
check(factionDebtStatuses(run).length === 1, '人情没有登记')
const debt = factionDebtStatuses(run)[0]
check(debt.name === '白塔残余' && debt.amount > 0, '人情状态错误')

const repay = resolveFactionDebt(run, 'tower', 'repay')
check(repay.ok, '还钱失败')
check(run.player.credits < 500, '还钱没有扣信用点')
check(factionDebtStatuses(run).length === 0, '还钱后人情没有清除')

const favorRun = createRun(randomDraft(), 'FACTION-DEBT-FAVOR-TEST')
favorRun.inv.scrap = 5
favorRun.reputation.market = 40
registerFactionDebt(favorRun, 'market', { wantedLevel: 1 })
const favor = resolveFactionDebt(favorRun, 'market', 'favor')
check(favor.ok && favorRun.inv.scrap === 3, '帮派系做事没有消耗废料')
check(factionDebtStatuses(favorRun).length === 0, '帮忙后人情没有清除')

const refuseRun = createRun(randomDraft(), 'FACTION-DEBT-REFUSE-TEST')
refuseRun.reputation.whisper = 50
registerFactionDebt(refuseRun, 'whisper', { wantedLevel: 1 })
const refuse = resolveFactionDebt(refuseRun, 'whisper', 'refuse')
check(refuse.ok, '拒绝人情失败')
check(refuseRun.reputation.whisper < 50, '拒绝人情没有降低声望')

console.log(JSON.stringify({
  ok: errors.length === 0,
  amount: debt.amount,
  errors,
}, null, 2))

if (errors.length) process.exit(1)
