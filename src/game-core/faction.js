/**
 * 派系声望：白塔、黑市、漂流者、低语者。
 * 声望来自和该派系 NPC 的交流、城市委托与剧情推进。
 */

import { ITEMS } from './data.js'
import { FACTIONS } from './npc.js'

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
  return { reputation, factionFavors: {} }
}

export function ensureReputation(run) {
  if (!run) return null
  if (!run.reputation || typeof run.reputation !== 'object') run.reputation = {}
  FACTION_IDS.forEach((id) => {
    if (typeof run.reputation[id] !== 'number') run.reputation[id] = 0
  })
  if (!run.factionFavors || typeof run.factionFavors !== 'object') run.factionFavors = {}
  return run.reputation
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
