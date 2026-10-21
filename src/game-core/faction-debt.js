/**
 * 派系人情债务：保释后欠下的人情，会在几天后回来。
 */

import { adjustReputation, factionStatuses } from './faction.js'
import { createRng } from './rng.js'

export function createFactionDebts() {
  return {}
}

export function ensureFactionDebts(run) {
  if (!run) return {}
  if (!run.factionDebts || typeof run.factionDebts !== 'object') run.factionDebts = createFactionDebts()
  Object.keys(run.factionDebts).forEach((id) => {
    const debt = run.factionDebts[id]
    if (!debt || debt.status !== 'pending') return
    if (typeof debt.dueDay !== 'number') debt.dueDay = (debt.day || run.day) + 5
    if (typeof debt.amount !== 'number') debt.amount = 60 + (debt.wantedLevel || 1) * 20
  })
  return run.factionDebts
}

export function registerFactionDebt(run, factionId, data = {}) {
  ensureFactionDebts(run)
  const debt = {
    factionId,
    day: data.day || run.day,
    dueDay: data.dueDay || run.day + 5,
    amount: data.amount || 60 + (data.wantedLevel || 1) * 20,
    wantedLevel: data.wantedLevel || 1,
    status: 'pending',
    resolvedDay: 0,
    resolution: null,
  }
  run.factionDebts[factionId] = debt
  return debt
}

export function factionDebtStatuses(run) {
  ensureFactionDebts(run)
  return Object.values(run.factionDebts)
    .filter((debt) => debt.status === 'pending')
    .map((debt) => {
      const status = factionStatuses(run).find((item) => item.id === debt.factionId)
      return {
        ...debt,
        name: status?.name || debt.factionId,
        score: status?.score || 0,
        overdue: run.day >= debt.dueDay,
        daysLeft: Math.max(0, debt.dueDay - run.day),
      }
    })
}

function finish(run, debt, resolution, text, extra = {}) {
  debt.status = extra.status || 'resolved'
  debt.resolution = resolution
  debt.resolvedDay = run.day
  return {
    ok: true,
    debt,
    resolution,
    text,
    ...extra,
  }
}

export function resolveFactionDebt(run, factionId, choiceId = 'repay') {
  ensureFactionDebts(run)
  const debt = run.factionDebts[factionId]
  if (!debt || debt.status !== 'pending') return { ok: false, message: '没有这笔人情' }
  const status = factionStatuses(run).find((item) => item.id === factionId)
  if (!status) return { ok: false, message: '这个派系已经不在了' }

  if (choiceId === 'repay') {
    if (run.player.credits < debt.amount) return { ok: false, message: `需要 ${debt.amount} 信用点` }
    run.player.credits -= debt.amount
    adjustReputation(run, factionId, 4, '偿还人情')
    return finish(run, debt, 'repay', `你把 ${debt.amount} 信用点放在桌上。${status.name}的人没有数，直接收了起来。`)
  }

  if (choiceId === 'favor') {
    const cost = 2
    if ((run.inv.scrap || 0) < cost) return { ok: false, message: `需要 ${cost} 废料作为人手` }
    run.inv.scrap -= cost
    adjustReputation(run, factionId, 8, '替派系做事')
    run.factionFavors = run.factionFavors || {}
    run.factionFavors[factionId] = run.day
    return finish(run, debt, 'favor', `你替${status.name}跑了一趟腿。他们没有说谢谢，但把这件事记在了账上。`)
  }

  if (choiceId === 'extend') {
    run.rollCount = (run.rollCount || 0) + 1
    const rng = createRng(`${run.seed}:faction-debt:${run.day}:${factionId}:${run.rollCount}`)
    const die = rng.int(1, 20)
    const attr = run.player.attrs?.soc || 0
    if (die === 20 || (die !== 1 && die + attr >= 14)) {
      debt.dueDay = run.day + 3
      return {
        ok: true,
        debt,
        resolution: 'extend',
        text: `${status.name}的人答应再等三天。你看见他在名单上你的名字旁边画了一个圈。`,
      }
    }
    adjustReputation(run, factionId, -8, '人情延期失败')
    return {
      ok: true,
      debt,
      resolution: 'extend-failed',
      text: '对方没有接受延期。你听见门外有人低声说了一个名字。',
      success: false,
    }
  }

  if (choiceId === 'refuse') {
    adjustReputation(run, factionId, -15, '拒绝偿还人情')
    if (run.city) {
      run.city.influence = { ...(run.city.influence || {}) }
      run.city.influence[factionId] = Math.max(0, (run.city.influence[factionId] || 0) - 10)
    }
    return finish(run, debt, 'refuse', `你没有答应。${status.name}的人看了你很久，最后把名单收了起来。`)
  }

  return { ok: false, message: '没有这个选择' }
}
