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
import {
  factionFavorMissionStatuses,
  resolveFactionFavorStep,
} from '../src/game-core/faction-favor-chain.js'

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
check(factionDebtStatuses(favorRun).length === 0, '帮忙后人情没有转为差事')
const mission = factionFavorMissionStatuses(favorRun).find((item) => item.factionId === 'market')
check(mission?.status === 'active', '帮派系做事没有生成任务链')
const step1 = resolveFactionFavorStep(favorRun, 'market', 'guard')
check(step1.ok && step1.mission.stage === 1, '任务链第一段没有推进')
const step2 = resolveFactionFavorStep(favorRun, 'market', 'collect')
check(step2.ok && step2.mission.stage === 2, '任务链第二段没有推进')
const step3 = resolveFactionFavorStep(favorRun, 'market', 'share')
check(step3.ok && step3.done, '任务链没有完成')
check(step3.mission.status === 'done', '任务链完成后没有标记')

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
