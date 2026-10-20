/**
 * 派系声望：白塔、黑市、漂流者、低语者。
 * 声望来自和该派系 NPC 的交流、城市委托与剧情推进。
 */

import { ITEMS } from './data.js'
import { FACTIONS } from './npc.js'
import { createRng } from './rng.js'

export const FACTION_IDS = ['tower', 'market', 'drifters', 'whisper']

export const FACTION_INFO = {
  tower: {
    name: FACTIONS.tower.name,
    color: 'cyan',
    desc: '白塔失联后留下的回收队与档案员。他们还在守着旧秩序。',
    creed: '记录、回收、封存。',
    favor: ['stim', 'medkit'],
  },
  market: {
    name: FACTIONS.market.name,
    color: 'amber',
    desc: '空港的货舱、摊位和借贷人。没有他们，补给撑不过一周。',
    creed: '先谈价，再谈别的。',
    favor: ['ration', 'wine'],
  },
  drifters: {
    name: FACTIONS.drifters.name,
    color: 'jade',
    desc: '矿脉、废墟和断桅舰之间的拾荒者。他们知道哪条路还能走。',
    creed: '不留下名字，只留下路。',
    favor: ['scrap', 'chip'],
  },
  whisper: {
    name: FACTIONS.whisper.name,
    color: 'violet',
    desc: '低语者的静默教团。他们听得见别人不愿听见的东西。',
    creed: '安静，然后听。',
    favor: ['anti', 'cold'],
  },
}

export const FACTION_CHAINS = {
  tower: [
    { type: 'deliver', key: 'chip', need: 1, rep: 10, reward: 30, item: 'stim', title: '旧档案回收', desc: '交回一枚还能读出协议的旧世芯片。' },
    { type: 'clear', rep: 30, reward: 40, item: 'medkit', title: '清掉失联信号', desc: '把一处未处理的事件节点从星图上划掉。' },
    { type: 'deliver', key: 'relic', need: 1, rep: 60, reward: 80, item: 'cold', title: '交回遗物', desc: '把不属于这个时代的遗物碎片带回白塔。' },
  ],
  market: [
    { type: 'deliver', key: 'ration', need: 1, rep: 10, reward: 25, item: 'wine', title: '先垫一批货', desc: '市场需要一份营养膏周转。' },
    { type: 'pay', cost: 40, rep: 30, reward: 50, title: '清一笔旧账', desc: '替市场平掉一笔不大不小的旧账。' },
    { type: 'deliver', key: 'chip', need: 1, rep: 60, reward: 90, item: 'relic', title: '带一件硬货回来', desc: '把一枚旧世芯片交给市场的收货人。' },
  ],
  drifters: [
    { type: 'deliver', key: 'scrap', need: 2, rep: 10, reward: 30, item: 'fiber', title: '补一段路', desc: '交两块合金废料，给拾荒者补一段栈道。' },
    { type: 'clear', rep: 30, reward: 45, item: 'ore', title: '清一条路', desc: '清理一处采集或事件节点。' },
    { type: 'deliver', key: 'fiber', need: 2, rep: 60, reward: 80, item: 'shard', title: '把路标带回来', desc: '交两束纤维，让下一条路能被记住。' },
  ],
  whisper: [
    { type: 'deliver', key: 'spore', need: 2, rep: 10, reward: 30, item: 'anti', title: '带一份静默', desc: '低语者需要两份荧光孢做静默剂。' },
    { type: 'clear', rep: 30, reward: 45, item: 'cold', title: '让一处安静', desc: '处理一处还在发出声音的节点。' },
    { type: 'deliver', key: 'shard', need: 1, rep: 60, reward: 80, item: 'relic', title: '把回声交回去', desc: '把裂隙结晶交给静默教堂。' },
  ],
}

export const FACTION_SHOP = {
  tower: [
    { key: 'stim', price: 30, rep: 2, min: 10 },
    { key: 'medkit', price: 50, rep: 3, min: 30 },
  ],
  market: [
    { key: 'wine', price: 20, rep: 1, min: 10 },
    { key: 'ration', price: 15, rep: 1, min: 10 },
  ],
  drifters: [
    { key: 'chip', price: 40, rep: 2, min: 10 },
    { key: 'scrap', price: 15, rep: 1, min: 10 },
  ],
  whisper: [
    { key: 'anti', price: 45, rep: 2, min: 10 },
    { key: 'cold', price: 50, rep: 3, min: 30 },
  ],
}

const LEVELS = [
  { min: -100, name: '敌对', color: 'red' },
  { min: -39, name: '冷淡', color: 'amber' },
  { min: -9, name: '中立', color: 'muted' },
  { min: 10, name: '友善', color: 'cyan' },
  { min: 30, name: '信任', color: 'jade' },
  { min: 60, name: '同盟', color: 'violet' },
]

export function createReputationState() {
  const reputation = {}
  FACTION_IDS.forEach((id) => { reputation[id] = 0 })
  return { reputation, factionFavors: {}, factionChains: {} }
}

export function ensureReputation(run) {
  if (!run) return null
  if (!run.reputation || typeof run.reputation !== 'object') run.reputation = {}
  FACTION_IDS.forEach((id) => {
    if (typeof run.reputation[id] !== 'number') run.reputation[id] = 0
  })
  if (!run.factionFavors || typeof run.factionFavors !== 'object') run.factionFavors = {}
  if (!run.factionChains || typeof run.factionChains !== 'object') run.factionChains = {}
  return run.reputation
}

function pickChainTargets(run) {
  const used = new Set()
  Object.values(run.factionChains || {}).forEach((state) => {
    Object.values(state.targets || {}).forEach((id) => used.add(id))
  })
  return Object.values(run.map?.nodes || {}).filter((node) => (
    node &&
    ['gather', 'event'].includes(node.type) &&
    !run.cleared.includes(node.id) &&
    !used.has(node.id)
  ))
}

export function ensureFactionChains(run) {
  ensureReputation(run)
  FACTION_IDS.forEach((id) => {
    if (!run.factionChains[id]) {
      run.factionChains[id] = { stage: 0, targets: {}, completed: false, completedDay: 0 }
    }
    const state = run.factionChains[id]
    if (!state.targets || typeof state.targets !== 'object') state.targets = {}
    if (typeof state.stage !== 'number') state.stage = 0
    if (typeof state.completed !== 'boolean') state.completed = false
    FACTION_CHAINS[id].forEach((step, index) => {
      if (step.type !== 'clear' || state.targets[index]) return
      const rng = createRng(`${run.seed}:faction-target:${id}:${index}`)
      const targets = pickChainTargets(run)
      const target = targets.length ? rng.pick(targets) : null
      if (target) state.targets[index] = target.id
    })
  })
  return run.factionChains
}

export function factionChainStatus(run, id) {
  ensureFactionChains(run)
  const state = run.factionChains[id]
  const chain = FACTION_CHAINS[id] || []
  const step = chain[state.stage] || null
  if (!step) return { id, chain, stage: state.stage, completed: true, canClaim: false, step: null }
  const status = factionStatus(run, id)
  const targetId = state.targets[state.stage]
  const target = targetId ? run.map?.nodes?.[targetId] : null
  let objectiveDone = false
  if (step.type === 'deliver') objectiveDone = (run.inv[step.key] || 0) >= step.need
  if (step.type === 'pay') objectiveDone = (run.player.credits || 0) >= step.cost
  if (step.type === 'clear') objectiveDone = !!targetId && run.cleared.includes(targetId)
  return {
    id,
    chain,
    state,
    step,
    stage: state.stage,
    status,
    target,
    repOk: status.score >= step.rep,
    objectiveDone,
    canClaim: !state.completed && status.score >= step.rep && objectiveDone,
    completed: state.completed,
  }
}

export function claimFactionChain(run, id) {
  const progress = factionChainStatus(run, id)
  if (!progress.step) return { ok: false, message: '这条任务链已经完成' }
  if (progress.status.score < progress.step.rep) return { ok: false, message: `需要 ${progress.step.rep} 声望` }
  if (!progress.objectiveDone) {
    if (progress.step.type === 'deliver') return { ok: false, message: `还需要 ${progress.step.need} 个${ITEMS[progress.step.key]?.name || progress.step.key}` }
    if (progress.step.type === 'pay') return { ok: false, message: `需要 ${progress.step.cost} 信用点` }
    return { ok: false, message: '目标节点还没有清理' }
  }
  const step = progress.step
  if (step.type === 'deliver') run.inv[step.key] -= step.need
  if (step.type === 'pay') run.player.credits -= step.cost
  run.player.credits += step.reward || 0
  if (step.item && ITEMS[step.item]) run.inv[step.item] = (run.inv[step.item] || 0) + 1
  adjustReputation(run, id, 4 + progress.stage * 2, '派系任务链')
  progress.state.stage += 1
  if (progress.state.stage >= FACTION_CHAINS[id].length) {
    progress.state.completed = true
    progress.state.completedDay = run.day
  }
  return { ok: true, step, stage: progress.state.stage, completed: progress.state.completed }
}

export function factionShopOffers(id) {
  return (FACTION_SHOP[id] || []).map((offer, index) => ({ ...offer, index, name: ITEMS[offer.key]?.name }))
}

export function buyFactionShopItem(run, id, index) {
  const status = factionStatus(run, id)
  const offer = FACTION_SHOP[id]?.[index]
  if (!offer) return { ok: false, message: '没有这件商品' }
  if (status.score < offer.min) return { ok: false, message: `需要 ${offer.min} 声望` }
  if (status.score < offer.rep) return { ok: false, message: '声望不足' }
  if (run.player.credits < offer.price) return { ok: false, message: '信用点不足' }
  run.player.credits -= offer.price
  adjustReputation(run, id, -offer.rep, '派系商店')
  run.inv[offer.key] = (run.inv[offer.key] || 0) + 1
  return { ok: true, offer, name: ITEMS[offer.key]?.name }
}

export function reputationLevel(score) {
  let current = LEVELS[0]
  LEVELS.forEach((level) => {
    if (score >= level.min) current = level
  })
  return current
}

export function factionStatus(run, id) {
  ensureReputation(run)
  const score = run.reputation[id] || 0
  const level = reputationLevel(score)
  return {
    id,
    ...FACTION_INFO[id],
    score,
    level: level.name,
    color: level.color,
    progress: Math.max(0, Math.min(100, (score + 100) / 2)),
    favorDay: run.factionFavors?.[id] || 0,
  }
}

export function adjustReputation(run, id, delta, reason = '') {
  if (!FACTION_INFO[id]) return { ok: false }
  ensureReputation(run)
  const before = run.reputation[id]
  run.reputation[id] = Math.max(-100, Math.min(100, before + Number(delta || 0)))
  run.flags = run.flags || {}
  run.flags.lastReputation = {
    faction: id,
    delta: run.reputation[id] - before,
    reason,
    day: run.day,
  }
  return { ok: true, before, after: run.reputation[id], delta: run.reputation[id] - before }
}

export function claimFactionFavor(run, id) {
  const status = factionStatus(run, id)
  if (!status.name) return { ok: false, message: '没有这个派系' }
  if (status.score < 10) return { ok: false, message: '需要友善声望' }
  if (status.favorDay === run.day) return { ok: false, message: '今天已经领过了' }
  const items = status.favor || []
  items.forEach((itemId) => {
    if (ITEMS[itemId]) run.inv[itemId] = (run.inv[itemId] || 0) + 1
  })
  const credits = status.score >= 60 ? 30 : status.score >= 30 ? 18 : 8
  run.player.credits += credits
  run.factionFavors = run.factionFavors || {}
  run.factionFavors[id] = run.day
  return {
    ok: true,
    items: items.map((itemId) => ITEMS[itemId]?.name).filter(Boolean),
    credits,
    level: status.level,
  }
}

export function factionStatuses(run) {
  return FACTION_IDS.map((id) => factionStatus(run, id))
}
