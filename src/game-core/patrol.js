/**
 * 设防城市的巡逻队盘查。
 * 有通缉、且城市有巡逻效果时，进入城市会触发一次。
 */

import { arrestPlayer, ensureArrest } from './arrest.js'
import { cityDevelopmentEffects } from './city-development.js'
import { createRng } from './rng.js'
import { ensureWanted, raiseWanted, reduceWanted } from './wanted.js'

const clamp = (value, min = 0, max = 100) => Math.min(max, Math.max(min, value))

export function createPatrolCheckState() {
  return {
    pending: false,
    resolvedDay: 0,
    choice: null,
    text: '',
    battle: false,
  }
}

export function ensurePatrolCheck(run) {
  if (!run) return createPatrolCheckState()
  if (!run.patrolCheck || typeof run.patrolCheck !== 'object') run.patrolCheck = createPatrolCheckState()
  const state = run.patrolCheck
  if (typeof state.pending !== 'boolean') state.pending = false
  if (typeof state.resolvedDay !== 'number') state.resolvedDay = 0
  if (typeof state.choice !== 'string') state.choice = null
  if (typeof state.text !== 'string') state.text = ''
  if (typeof state.battle !== 'boolean') state.battle = false
  return state
}

export function maybeTriggerPatrol(run) {
  const state = ensurePatrolCheck(run)
  const wanted = ensureWanted(run)
  if (state.pending || state.battle) return false
  if (ensureArrest(run).active) return false
  if (wanted.level <= 0) return false
  if (state.resolvedDay === run.day) return false
  if ((cityDevelopmentEffects(run).patrol || 0) <= 0) return false
  state.pending = true
  state.choice = null
  state.text = ''
  return true
}

function roll(run, key, dc) {
  run.rollCount = (run.rollCount || 0) + 1
  const rng = createRng(`${run.seed}:patrol:${run.day}:${run.rollCount}`)
  const die = rng.int(1, 20)
  const attr = run.player.attrs?.[key] || 0
  return { die, attr, total: die + attr, success: die === 20 || (die !== 1 && die + attr >= dc), dc }
}

function finish(run, state, choice, text) {
  state.pending = false
  state.resolvedDay = run.day
  state.choice = choice
  state.text = text
  state.battle = false
  return { ok: true, choice, text, wanted: ensureWanted(run) }
}

export function resolvePatrolCheck(run, choiceId) {
  const state = ensurePatrolCheck(run)
  if (!state.pending) return { ok: false, message: '现在没有巡逻队盘查' }
  const wanted = ensureWanted(run)
  if (choiceId === 'papers') {
    const cost = 20 + wanted.level * 10
    if (run.player.credits < cost) return { ok: false, message: `需要 ${cost} 信用点` }
    run.player.credits -= cost
    reduceWanted(run, 1)
    return finish(run, state, choiceId, `你递出证件和 ${cost} 信用点。巡逻队看了很久，最后让开了路。`)
  }
  if (choiceId === 'bluff') {
    const check = roll(run, 'soc', 12 + wanted.level * 2)
    if (check.success) {
      reduceWanted(run, 1)
      return finish(run, state, choiceId, `你说自己只是路过的商队。巡逻队互相看了一眼，放你走了。`)
    }
    raiseWanted(run, run.activeCityId || 'dock', '巡逻队盘查时撒谎', 1)
    return finish(run, state, choiceId, '你的说法前后对不上。巡逻队把手按在了武器上。')
  }
  if (choiceId === 'run') {
    const check = roll(run, 'agi', 12 + wanted.level)
    if (check.success) {
      run.player.mental = clamp(run.player.mental - 3, 0, run.player.mentalMax)
      return finish(run, state, choiceId, '你钻进巷子，翻过两道矮墙。身后的哨声越来越远。')
    }
    run.player.hp = Math.max(1, run.player.hp - 7)
    raiseWanted(run, run.activeCityId || 'dock', '巡逻队盘查时逃跑', 1)
    state.pending = true
    state.choice = 'run'
    state.text = '你没有跑掉。巡逻队堵住了巷口，战斗已经避不开了。'
    return {
      ok: true,
      choice: choiceId,
      run: true,
      battle: true,
      text: state.text,
      wanted: ensureWanted(run),
    }
  }
  if (choiceId === 'surrender') {
    const arrest = arrestPlayer(run, '巡逻队盘查')
    state.pending = false
    state.resolvedDay = run.day
    state.choice = choiceId
    state.text = arrest.text
    return { ok: true, choice: choiceId, arrest: arrest.arrest, text: arrest.text, wanted: ensureWanted(run) }
  }
  if (choiceId === 'fight') {
    state.pending = true
    state.choice = 'fight'
    state.text = '你先动了手。巡逻队的哨声在街道上响成一片。'
    return {
      ok: true,
      choice: choiceId,
      fight: true,
      battle: true,
      text: state.text,
      wanted: ensureWanted(run),
    }
  }
  return { ok: false, message: '没有这个选择' }
}

export function completePatrolBattle(run) {
  const state = ensurePatrolCheck(run)
  reduceWanted(run, 1)
  return finish(run, state, state.choice || 'fight', '巡逻队退走了。城市频道里暂时安静下来，但你知道这件事还没完。')
}
