/**
 * 远征契约：开局三选一、进度、奖励与星区词条效果。
 */

import { randomDraft } from '../src/game-core/character.js'
import { createRun } from '../src/game-core/run.js'
import {
  EXPEDITION_CONTRACTS,
  checkExpedition,
  chooseExpeditionContract,
  createExpeditionState,
  expeditionEffects,
} from '../src/game-core/expedition.js'

const errors = []
const check = (condition, label) => { if (!condition) errors.push(label) }

const run = createRun(randomDraft(), 'EXPEDITION-TEST')
check(!!run.expedition, '开局没有远征契约')
check(run.expedition.offers.length === 3, '契约不是三选一')
check(run.expedition.modifiers.length === 2, '星区词条不是两个')
check(run.expedition.status === 'pending', '开局契约状态错误')

const chosen = chooseExpeditionContract(run, 'hunter')
check(chosen.ok, '选择追猎契约失败')
check(run.expedition.status === 'active', '契约没有激活')
check(!chooseExpeditionContract(run, 'survey').ok, '可以重复选择契约')

check(run.player.credits >= 0, '初始信用点异常')
const beforeCredits = run.player.credits
run.stats.elites = (run.expedition.base.elites || 0) + 1
const complete = checkExpedition(run)
check(complete.completed, '追猎契约没有完成')
check(run.expedition.completed, '契约完成状态没有写入')
check(run.player.credits === beforeCredits + 80, '追猎奖励信用点错误')
check((run.inv.scrap || 0) >= 2, '追猎奖励废料错误')
check(checkExpedition(run).completed === false, '契约可以重复结算')

const surveyRun = createRun(randomDraft(), 'EXPEDITION-SURVEY')
chooseExpeditionContract(surveyRun, 'survey')
surveyRun.cleared = [...surveyRun.cleared, 'a', 'b', 'c', 'd']
const surveyComplete = checkExpedition(surveyRun)
check(surveyComplete.completed, '测绘契约没有完成')
check((surveyRun.inv.chip || 0) >= 1, '测绘奖励芯片错误')

const bondRun = createRun(randomDraft(), 'EXPEDITION-BOND')
chooseExpeditionContract(bondRun, 'bond')
bondRun.stats.dates = 1
const bondComplete = checkExpedition(bondRun)
check(bondComplete.completed, '同行契约没有完成')
check(bondRun.player.mental > 0, '同行奖励精神错误')

const effectRun = createRun(randomDraft(), 'EXPEDITION-EFFECT')
effectRun.expedition.modifiers = ['fog', 'famine']
const effects = expeditionEffects(effectRun)
check(effects.accuracy === -1, '雾潮命中效果没有生效')
check(effects.cardRewardBonus === 1, '雾潮奖励效果没有生效')
check(effects.healingPct === -0.3, '饥荒治疗效果没有生效')
check(effects.creditPct === 0.25, '饥荒信用点效果没有生效')

const deterministic = createExpeditionState('EXPEDITION-TEST')
check(deterministic.modifiers.join(',') === createExpeditionState('EXPEDITION-TEST').modifiers.join(','), '远征词条不确定')
check(Object.keys(EXPEDITION_CONTRACTS).length === 3, '契约定义数量错误')

console.log(JSON.stringify({
  ok: errors.length === 0,
  offers: run.expedition.offers,
  modifiers: run.expedition.modifiers,
  rewards: run.expedition.reward,
  effects,
  errors,
}, null, 2))

if (errors.length) process.exit(1)
