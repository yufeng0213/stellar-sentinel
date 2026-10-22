/**
 * 小游戏挑战框架。
 * 当前先接一个方块堆叠游戏，后续可以往注册表里继续加新玩法。
 */

import { createRng } from './rng.js'

export const MINIGAME_TYPES = {
  blocks: {
    id: 'blocks',
    name: '方块堆叠',
    hint: '移动、旋转并消行。达到目标分数才能完成当前动作。',
    baseTarget: 260,
    baseDuration: 38,
  },
}

export function challengeFor(run, context = {}) {
  const rng = createRng(`${run.seed}:minigame:${context.kind || 'action'}:${context.nodeId || context.npcId || ''}:${run.day}:${run.rollCount || 0}`)
  const types = Object.values(MINIGAME_TYPES)
  const type = rng.pick(types)
  const theft = context.kind === 'steal_shop' || context.kind === 'steal_npc'
  const baseTarget = type.baseTarget + (theft ? 80 : 0) + Math.min(120, (run.day - 1) * 6)
  const target = Math.round(baseTarget / 10) * 10 + rng.int(0, 3) * 10
  const duration = Math.max(25, type.baseDuration - (theft ? 3 : 0) + rng.int(-4, 5))
  return {
    id: `mg-${run.day}-${context.kind || 'action'}-${rng.int(1000, 9999)}`,
    game: type.id,
    name: type.name,
    hint: type.hint,
    target,
    duration,
    kind: context.kind || 'action',
    context: { ...context },
    createdAt: Date.now(),
  }
}

export function shouldOfferMiniGame(run, kind) {
  if (!run) return false
  if (run.miniGames?.disabled) return false
  if (run.pendingMiniGame) return false
  if (kind === 'steal_shop' || kind === 'steal_npc') return true
  if (kind === 'gather') {
    const rng = createRng(`${run.seed}:minigame-chance:${run.day}:${run.rollCount || 0}`)
    return rng.chance(0.5)
  }
  return false
}

export function miniGameSuccess(challenge, score) {
  return Boolean(challenge) && Number(score) >= Number(challenge.target)
}

export function challengeLabel(challenge) {
  if (!challenge) return ''
  const kind = challenge.kind === 'gather'
    ? '采集'
    : challenge.kind === 'steal_shop'
      ? '商店扒窃'
      : challenge.kind === 'steal_npc'
        ? 'NPC 扒窃'
        : '行动'
  return `${kind} · ${challenge.name}`
}
