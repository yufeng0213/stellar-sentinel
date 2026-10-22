/**
 * 小游戏挑战框架。
 * 每个玩法只负责生成自己的目标和棋盘参数，渲染在独立组件里。
 */

import { createRng } from './rng.js'

export const MINIGAME_TYPES = {
  blocks: {
    id: 'blocks',
    name: '方块堆叠',
    hint: '移动、旋转并消行。达到目标分数才能完成当前动作。',
    create(rng, run, theft) {
      const base = 260 + (theft ? 80 : 0) + Math.min(120, (run.day - 1) * 6)
      return {
        target: Math.round(base / 10) * 10 + rng.int(0, 3) * 10,
        duration: Math.max(25, 38 - (theft ? 3 : 0) + rng.int(-4, 5)),
      }
    },
  },
  game2048: {
    id: 'game2048',
    name: '2048',
    hint: '合并相同数字，尽量在时间内拿到高分。',
    create(rng, run, theft) {
      const base = 900 + (theft ? 260 : 0) + Math.min(650, (run.day - 1) * 35)
      return {
        target: Math.round(base / 50) * 50 + rng.int(0, 4) * 50,
        duration: 42 + rng.int(-4, 5),
        config: {},
      }
    },
  },
  memory: {
    id: 'memory',
    name: '翻翻乐',
    hint: '记住牌面，找出所有成对的符号。',
    create(rng, run, theft) {
      const pairs = theft ? 8 : 6 + (run.day >= 8 ? 1 : 0)
      return {
        target: pairs * 100,
        duration: 30 + rng.int(-4, 6),
        config: { pairs },
      }
    },
  },
  minesweeper: {
    id: 'minesweeper',
    name: '扫雷',
    hint: '翻开安全格，避开地雷。可以先使用标记模式。',
    create(rng, run, theft) {
      const size = theft ? 7 : 6
      const mines = theft ? 8 : 5
      const safe = size * size - mines
      return {
        target: Math.ceil(safe * 0.65) * 10,
        duration: 38 + rng.int(-5, 5),
        config: { size, mines },
      }
    },
  },
  pipe: {
    id: 'pipe',
    name: '接水管',
    hint: '旋转管道，把左上角的信号接到右下角。',
    create(rng, run) {
      return {
        target: 1000,
        duration: 40 + rng.int(-5, 5),
        config: { size: 5 },
      }
    },
  },
  code: {
    id: 'code',
    name: '密码破译',
    hint: '根据位置和颜色反馈，猜出四位密码。',
    create(rng, run) {
      return {
        target: 1000,
        duration: 45 + rng.int(-5, 5),
        config: { attempts: 6 },
      }
    },
  },
  frequency: {
    id: 'frequency',
    name: '频率锁定',
    hint: '在指针进入绿区时锁定，完成足够次数的命中。',
    create(rng, run) {
      const waves = 5
      return {
        target: 300,
        duration: 32 + rng.int(-4, 5),
        config: { waves },
      }
    },
  },
}

export function challengeFor(run, context = {}) {
  const rng = createRng(`${run.seed}:minigame:${context.kind || 'action'}:${context.nodeId || context.npcId || ''}:${run.day}:${run.rollCount || 0}`)
  const types = Object.values(MINIGAME_TYPES)
  const type = rng.pick(types)
  const theft = context.kind === 'steal_shop' || context.kind === 'steal_npc'
  const config = type.create(rng, run, theft) || {}
  return {
    id: `mg-${run.day}-${context.kind || 'action'}-${rng.int(1000, 9999)}`,
    game: type.id,
    name: type.name,
    hint: type.hint,
    target: config.target,
    duration: config.duration,
    config: config.config || {},
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
