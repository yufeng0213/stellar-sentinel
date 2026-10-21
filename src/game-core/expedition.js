/**
 * 远征契约与星区词条：每局开局的风险/收益组合。
 * 规则层只生成与结算，不依赖 Vue。
 */

import { createRng } from './rng.js'

export const EXPEDITION_CONTRACTS = {
  hunter: {
    id: 'hunter',
    title: '追猎',
    desc: '击败一名精英目标。',
    goal: 1,
    rewardText: '80 信用点 · 2 废料',
  },
  survey: {
    id: 'survey',
    title: '测绘',
    desc: '清理四个星图节点。',
    goal: 4,
    rewardText: '60 信用点 · 1 旧世芯片',
  },
  bond: {
    id: 'bond',
    title: '同行',
    desc: '完成一次约会。',
    goal: 1,
    rewardText: '40 信用点 · 精神 +8',
  },
}

export const EXPEDITION_MODIFIERS = {
  fog: {
    id: 'fog',
    name: '雾潮',
    desc: '命中 -1；战斗后的卡牌奖励变为四选一。',
    effects: { accuracy: -1, cardRewardBonus: 1 },
  },
  famine: {
    id: 'famine',
    name: '饥荒',
    desc: '战斗治疗 -30%；战斗信用点 +25%。',
    effects: { healingPct: -0.3, creditPct: 0.25 },
  },
  echo: {
    id: 'echo',
    name: '回声',
    desc: '灵能牌士气伤害 +2；敌人攻击 +1。',
    effects: { psiMorale: 2, enemyAttack: 1 },
  },
  watch: {
    id: 'watch',
    name: '监视',
    desc: '商店价格 +15%；城市委托信用点 +20%。',
    effects: { shopPrice: 0.15, questCredit: 0.2 },
  },
  scarcity: {
    id: 'scarcity',
    name: '物资短缺',
    desc: '采集产出 +1；市场商品 -1。',
    effects: { gatherBonus: 1, marketStock: -1 },
  },
  strain: {
    id: 'strain',
    name: '低语',
    desc: '关系压力 +2/天；每日 NPC 事件 +1。',
    effects: { strain: 2, eventBonus: 1 },
  },
}

const MODIFIER_IDS = Object.keys(EXPEDITION_MODIFIERS)

export function createExpeditionState(seed = '') {
  const rng = createRng(`${seed}:expedition`)
  const offers = rng.shuffle(Object.keys(EXPEDITION_CONTRACTS))
  const modifiers = rng.shuffle(MODIFIER_IDS).slice(0, 2)
  return {
    offers,
    contract: null,
    modifiers,
    base: null,
    status: 'pending',
    completed: false,
    completedDay: 0,
    reward: null,
  }
}

export function ensureExpedition(run) {
  if (!run) return null
  if (!run.expedition || typeof run.expedition !== 'object') {
    run.expedition = createExpeditionState(run.seed || '')
  }
  const expedition = run.expedition
  if (!Array.isArray(expedition.offers)) expedition.offers = Object.keys(EXPEDITION_CONTRACTS)
  if (!Array.isArray(expedition.modifiers)) expedition.modifiers = []
  if (!expedition.status) expedition.status = expedition.contract ? 'active' : 'pending'
  if (typeof expedition.completed !== 'boolean') expedition.completed = false
  return expedition
}

export function expeditionEffects(run) {
  const modifiers = run?.expedition?.modifiers || []
  const effects = {}
  modifiers.forEach((id) => {
    const definition = EXPEDITION_MODIFIERS[id]
    Object.entries(definition?.effects || {}).forEach(([key, value]) => {
      effects[key] = (effects[key] || 0) + value
    })
  })
  return effects
}

export function chooseExpeditionContract(run, contractId) {
  if (!run?.expedition) return { ok: false, message: '还没有远征契约' }
  if (run.expedition.status !== 'pending') return { ok: false, message: '远征契约已经选定' }
  if (!EXPEDITION_CONTRACTS[contractId]) return { ok: false, message: '没有这张契约' }
  run.expedition.contract = contractId
  run.expedition.status = 'active'
  run.expedition.base = {
    elites: run.stats?.elites || 0,
    cleared: run.cleared?.length || 0,
    dates: run.stats?.dates || 0,
  }
  return { ok: true, contract: EXPEDITION_CONTRACTS[contractId] }
}

export function expeditionProgress(run) {
  const expedition = run?.expedition
  if (!expedition?.contract) return { current: 0, goal: 0, id: null }
  const definition = EXPEDITION_CONTRACTS[expedition.contract]
  const base = expedition.base || {}
  if (expedition.contract === 'hunter') {
    return {
      id: expedition.contract,
      current: Math.max(0, (run.stats?.elites || 0) - (base.elites || 0)),
      goal: definition.goal,
    }
  }
  if (expedition.contract === 'survey') {
    return {
      id: expedition.contract,
      current: Math.max(0, (run.cleared?.length || 0) - (base.cleared || 0)),
      goal: definition.goal,
    }
  }
  return {
    id: expedition.contract,
    current: Math.max(0, (run.stats?.dates || 0) - (base.dates || 0)),
    goal: definition.goal,
  }
}

function grantReward(run, contractId) {
  const rewards = []
  if (contractId === 'hunter') {
    run.player.credits += 80
    run.inv.scrap = (run.inv.scrap || 0) + 2
    rewards.push('信用点 +80', '废料 +2')
  } else if (contractId === 'survey') {
    run.player.credits += 60
    run.inv.chip = (run.inv.chip || 0) + 1
    rewards.push('信用点 +60', '旧世芯片 +1')
  } else {
    run.player.credits += 40
    run.player.mental = Math.min(run.player.mentalMax, run.player.mental + 8)
    rewards.push('信用点 +40', '精神 +8')
  }
  return rewards
}

export function checkExpedition(run) {
  const expedition = run?.expedition
  if (!expedition || expedition.status !== 'active') {
    return { ok: true, completed: false, progress: expeditionProgress(run) }
  }
  const progress = expeditionProgress(run)
  if (progress.current < progress.goal) {
    return { ok: true, completed: false, progress }
  }
  const definition = EXPEDITION_CONTRACTS[expedition.contract]
  const rewards = grantReward(run, expedition.contract)
  expedition.status = 'complete'
  expedition.completed = true
  expedition.completedDay = run.day
  expedition.reward = rewards
  return {
    ok: true,
    completed: true,
    progress,
    contract: definition,
    rewards,
  }
}
