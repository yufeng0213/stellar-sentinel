/**
 * NPC 世界：性格、四轴关系、自主日程、NPC-NPC 关系网。
 * 只做模拟，不写长篇文案；对白在 Phase 5 交给 LLM。
 */

import { GIFT_KEYS, ITEMS, ORIGINS, REGIONS, SCENTS } from './data.js'
import {
  TAGS,
  TAG_BY_ID,
  aggregateTagEffects,
  playerTagKeys,
  tagAffinity,
} from './npc-tags.js'
import { applyNpcArchetype, ensureNpcArchetype, pickNpcArchetype } from './npc-archetypes.js'
import { expeditionEffects } from './expedition.js'
import { buildNpcNamePool, nextNpcName } from './npc-names.js'
import { clearAmbiguous, ensureNpcStage, noteNpcInteraction, relationStageInfo, relationStageOf } from './npc-stages.js'
import { createRng } from './rng.js'

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

export const FACTIONS = {
  tower: { name: '白塔残余', color: 'cyan' },
  market: { name: '黑市网络', color: 'amber' },
  drifters: { name: '漂流者', color: 'jade' },
  whisper: { name: '低语者', color: 'violet' },
}

export const INTERESTS = ['交易', '传闻', '武器', '星图', '共鸣', '遗物', '植物', '机械', '旧技术', '冥想']

export const PERSONALITY_LABELS = {
  aggression: '攻击性',
  generosity: '慷慨',
  curiosity: '好奇',
  loyalty: '忠诚',
  grudge: '记仇',
}

export const AXES = [
  { key: 'trust', name: '信任' },
  { key: 'respect', name: '尊重' },
  { key: 'closeness', name: '亲近' },
  { key: 'fear', name: '畏惧' },
]

const ITEM_TAGS = {
  scrap: ['机械'],
  chip: ['旧技术', '传闻'],
  ore: ['机械', '星图'],
  cold: ['旧技术', '共鸣'],
  spore: ['植物', '冥想'],
  resin: ['植物', '冥想'],
  shard: ['遗物', '共鸣'],
  stim: ['冥想'],
  ration: ['交易'],
  fiber: ['植物', '机械'],
  alloy: ['机械', '武器'],
  relic: ['遗物', '共鸣'],
  anti: ['冥想'],
  medkit: ['植物'],
  pebble: ['遗物', '冥想'],
  postcard: ['传闻', '星图'],
  bell: ['冥想'],
  button: ['旧技术'],
  dice: ['交易'],
  flower: ['植物'],
  toy: ['机械'],
  letter: ['传闻'],
}

const ITEM_VALUE = {
  scrap: 8,
  chip: 12,
  ore: 14,
  cold: 15,
  spore: 10,
  resin: 12,
  shard: 22,
  stim: 12,
  ration: 8,
  fiber: 10,
  alloy: 15,
  relic: 20,
  anti: 14,
  medkit: 14,
  pebble: 4,
  postcard: 5,
  bell: 5,
  button: 3,
  dice: 4,
  flower: 6,
  toy: 6,
  letter: 7,
}

const ORIGIN_INTERESTS = {
  colonist: ['机械', '植物'],
  cadet: ['旧技术', '传闻'],
  broker: ['交易', '传闻'],
  survivor: ['遗物', '共鸣'],
}

const CATEGORY_INTERESTS = {
  军事: ['武器', '星图'],
  技术: ['机械', '旧技术'],
  地下: ['交易', '传闻'],
  劳作: ['机械', '植物'],
  信仰: ['遗物', '冥想'],
  荒野: ['星图', '植物'],
  学院: ['旧技术', '传闻'],
}

const TRAIT_INTERESTS = {
  nose: '植物',
  hands: '机械',
  dealer: '交易',
  night: '传闻',
  resonance: '共鸣',
  calm: '冥想',
}

const ORIGIN_FACTION = {
  colonist: 'drifters',
  cadet: 'tower',
  broker: 'market',
  survivor: 'whisper',
}

const ROLE_POOL = [
  { role: '掮客', faction: 'market', interests: ['交易', '传闻'], home: 'dock', aggr: 32, gen: 68, cur: 55, loy: 38, grudge: 48 },
  { role: '退役哨兵', faction: 'tower', interests: ['武器', '星图'], home: 'dock', aggr: 68, gen: 34, cur: 42, loy: 74, grudge: 55 },
  { role: '未登记向导', faction: 'drifters', interests: ['共鸣', '遗物'], home: 'rift', aggr: 22, gen: 54, cur: 78, loy: 46, grudge: 28 },
  { role: '机械师', faction: 'drifters', interests: ['机械', '旧技术'], home: 'ruins', aggr: 38, gen: 52, cur: 62, loy: 60, grudge: 35 },
  { role: '拾荒者', faction: 'drifters', interests: ['星图', '机械'], home: 'mine', aggr: 52, gen: 40, cur: 50, loy: 30, grudge: 40 },
  { role: '信使', faction: 'market', interests: ['传闻', '星图'], home: 'dock', aggr: 30, gen: 48, cur: 70, loy: 42, grudge: 32 },
  { role: '走私客', faction: 'market', interests: ['交易', '武器'], home: 'mine', aggr: 58, gen: 45, cur: 48, loy: 35, grudge: 50 },
  { role: '医师', faction: 'tower', interests: ['冥想', '植物'], home: 'grove', aggr: 20, gen: 62, cur: 55, loy: 66, grudge: 25 },
  { role: '赏金猎人', faction: 'tower', interests: ['武器', '传闻'], home: 'ruins', aggr: 76, gen: 30, cur: 45, loy: 52, grudge: 60 },
  { role: '低语者祭司', faction: 'whisper', interests: ['遗物', '共鸣'], home: 'rift', aggr: 28, gen: 50, cur: 80, loy: 58, grudge: 45 },
  { role: '采集者', faction: 'drifters', interests: ['植物', '星图'], home: 'grove', aggr: 34, gen: 56, cur: 58, loy: 50, grudge: 30 },
  { role: '旧塔技工', faction: 'tower', interests: ['旧技术', '机械'], home: 'dock', aggr: 40, gen: 44, cur: 60, loy: 68, grudge: 38 },
  { role: '商队护卫', faction: 'market', interests: ['武器', '交易'], home: 'ruins', aggr: 62, gen: 38, cur: 45, loy: 56, grudge: 46 },
  { role: '旧塔书记', faction: 'tower', interests: ['旧技术', '传闻'], home: 'dock', aggr: 22, gen: 50, cur: 66, loy: 72, grudge: 22 },
  { role: '拾荒童', faction: 'drifters', interests: ['机械', '星图'], home: 'mine', aggr: 26, gen: 55, cur: 76, loy: 34, grudge: 26 },
]

const FIXED_NPCS = [
  {
    name: '灰雀', abo: 'beta', role: '掮客', faction: 'market', home: 'dock',
    interests: ['交易', '传闻'], personality: { aggression: 30, generosity: 70, curiosity: 55, loyalty: 35, grudge: 50 },
    schedule: ['在三号货舱算账', '去矿脉收货', '在空港酒吧听消息'],
    tags: ['blackmarket', 'suspicious', 'patient', 'trader', 'gossip', 'keycollector', 'marketloyal'],
  },
  {
    name: '叶卡', abo: 'alpha', role: '退役哨兵', faction: 'tower', home: 'dock',
    interests: ['武器', '星图'], personality: { aggression: 70, generosity: 34, curiosity: 42, loyalty: 76, grudge: 55 },
    schedule: ['在旧哨站擦枪', '沿废墟巡逻', '守着空港的北门'],
    tags: ['soldier', 'brave', 'protective', 'guard', 'scarred', 'towerloyal', 'loyal'],
  },
  {
    name: '回声', abo: 'omega', role: '未登记向导', faction: 'drifters', home: 'rift',
    interests: ['共鸣', '遗物'], personality: { aggression: 20, generosity: 55, curiosity: 82, loyalty: 45, grudge: 26 },
    schedule: ['在裂隙边缘冥想', '听精神回声', '在静默区等人'],
    tags: ['curious', 'aloof', 'researcher', 'sensitivepsionics', 'lostfamily', 'whisperloyal', 'solo'],
  },
]

function playerInterests(run) {
  const origin = ORIGINS[run.player.origin]
  const tags = new Set(ORIGIN_INTERESTS[run.player.origin] || CATEGORY_INTERESTS[origin?.category] || [])
  run.player.traits.forEach((trait) => {
    const tag = TRAIT_INTERESTS[trait]
    if (tag) tags.add(tag)
  })
  return [...tags]
}

function playerAggression(run) {
  const abo = { alpha: 60, beta: 50, omega: 42 }[run.player.abo] || 50
  const role = run.player.role === 'sentinel' ? 6 : -4
  const origin = run.player.origin === 'survivor' ? 6 : 0
  return clamp(abo + role + origin, 0, 100)
}

function memoryLine(run, npc) {
  const region = REGIONS[npc.home]
  return [
    `常在${region.name}活动。`,
    `对${npc.interests[0]}很在意。`,
    `${FACTIONS[npc.faction].name}的人。`,
  ][run.day % 3]
}

const TAG_SLOTS = ['background', 'personality', 'personality', 'profession', 'quirk', 'social']

function tagConflicts(def, chosen) {
  return chosen.some((other) => (
    def.conflicts.includes(other.id) ||
    other.conflicts.includes(def.id) ||
    def.excludes.includes(other.id) ||
    other.excludes.includes(def.id)
  ))
}

function weightedTag(rng, category, chosen) {
  const pool = TAGS.filter((def) => def.category === category && !chosen.includes(def.id))
  if (!pool.length) return null
  const weights = pool.map((def) => Math.max(1, 4 - def.rarity))
  const total = weights.reduce((sum, weight) => sum + weight, 0)
  let roll = rng.next() * total
  for (let index = 0; index < pool.length; index += 1) {
    roll -= weights[index]
    if (roll <= 0) return pool[index]
  }
  return pool[pool.length - 1]
}

function pickNpcTags(rng, seedRole) {
  if (seedRole?.tags?.length) return [...new Set(seedRole.tags)].slice(0, 8)

  const chosen = []
  const add = (category) => {
    for (let attempt = 0; attempt < 14; attempt += 1) {
      const def = weightedTag(rng, category, chosen)
      if (!def) break
      if (tagConflicts(def, chosen.map((id) => TAG_BY_ID[id]))) continue
      chosen.push(def.id)
      return true
    }
    const fallback = rng.shuffle(
      TAGS.filter((def) => (
        def.category === category &&
        !chosen.includes(def.id) &&
        !tagConflicts(def, chosen.map((id) => TAG_BY_ID[id]))
      ))
    )[0]
    if (!fallback) return false
    chosen.push(fallback.id)
    return true
  }

  TAG_SLOTS.forEach(add)
  if (chosen.length < 7 && rng.chance(0.45)) add('shadow')
  if (chosen.length < 7 && rng.chance(0.35)) add('values')
  if (chosen.length < 5) {
    add('quirk')
    add('values')
    add('body')
  }

  if (!chosen.some((id) => TAG_BY_ID[id]?.category === 'social')) {
    const social = TAGS.find((def) => (
      def.category === 'social' &&
      !chosen.includes(def.id) &&
      !tagConflicts(def, chosen.map((id) => TAG_BY_ID[id]))
    ))
    if (social) chosen[chosen.length - 1] = social.id
  }

  return chosen.slice(0, 7)
}

function makeNpc(run, rng, id, seedRole, name) {
  const base = seedRole || rng.pick(ROLE_POOL)
  const tags = pickNpcTags(rng, seedRole)
  const tagEffects = aggregateTagEffects(tags)

  const personality = seedRole && seedRole.personality
    ? { ...seedRole.personality }
    : {
        aggression: clamp(base.aggr + rng.int(-12, 12), 5, 95),
        generosity: clamp(base.gen + rng.int(-12, 12), 5, 95),
        curiosity: clamp(base.cur + rng.int(-12, 12), 5, 95),
        loyalty: clamp(base.loy + rng.int(-12, 12), 5, 95),
        grudge: clamp(base.grudge + rng.int(-12, 12), 5, 95),
      }

  Object.entries(tagEffects.personality).forEach(([key, value]) => {
    personality[key] = clamp((personality[key] ?? 50) + value, 0, 100)
  })

  const baseInterests = seedRole?.interests
    ? [...seedRole.interests]
    : [...base.interests, rng.pick(INTERESTS)]
  const tagInterests = tags.flatMap((tagId) => TAG_BY_ID[tagId]?.interests || [])
  const interests = [...new Set([...baseInterests, ...tagInterests])]

  const abo = seedRole?.abo || rng.pick(['alpha', 'beta', 'beta', 'omega'])
  const home = seedRole?.home || base.home
  const faction = seedRole?.faction || base.faction

  const overlap = interests.filter((interest) => playerInterests(run).includes(interest)).length
  const compat = 100 - Math.abs(personality.aggression - playerAggression(run))
  const factionBonus = ORIGIN_FACTION[run.player.origin] === faction ? 7 : 0
  const scent = SCENTS[run.player.scent]
  const scentBonus = scent?.faction === faction ? 5 : scent?.faction ? -2 : 0
  const perkBias = run.player.perks?.npcBias || 0
  const empathyBonus = run.player.skills?.includes('empathy') ? 2 : 0
  const tagMatch = tagAffinity(playerTagKeys(run), tags)
  const bias = clamp(
    Math.round(
      (compat - 55) * 0.32 + overlap * 9 + factionBonus + scentBonus + perkBias +
      empathyBonus + (tagMatch.score >= 0 ? tagMatch.score * 0.35 : tagMatch.score * 1.4) + rng.int(-16, 16)
    ),
    -46,
    48
  )

  const relationBonus = tagEffects.relation

  const npc = {
    id,
    name,
    abo,
    role: base.role,
    faction,
    home,
    tags,
    tagEffects,
    tagBias: tagMatch.score,
    personality,
    interests,
    schedule: seedRole?.schedule || [
      base.interests[0] === '交易' ? '在空港看货' : `在${REGIONS[home].name}活动`,
      base.interests[1] === '武器' ? '检查装备' : '打听消息',
      '回到自己的落脚点',
    ],
    relation: {
      trust: clamp(Math.round(18 + bias * 0.55 + rng.int(-4, 6) + (relationBonus.trust || 0)), 2, 72),
      respect: clamp(Math.round(20 + bias * 0.25 + rng.int(0, 10) + (relationBonus.respect || 0)), 5, 66),
      closeness: clamp(Math.round(8 + bias * 0.4 + rng.int(0, 6) + (relationBonus.closeness || 0)), 0, 62),
      fear: clamp(Math.round(relationBonus.fear || 0), 0, 30),
      grievance: clamp(Math.max(0, -bias) + rng.int(0, 6) + (relationBonus.grievance || 0), 0, 46),
    },
    bias,
    memory: [
      { day: 1, text: `${TAG_BY_ID[tags[0]]?.name || '标签'}：${TAG_BY_ID[tags[0]]?.desc || ''}` },
      { day: 1, text: memoryLine(run, { home, interests, faction }) },
    ],
    party: false,
    hostile: false,
    alive: true,
    talkedDay: 0,
    giftLog: [],
    bag: {},
    credits: 30,
    tradeLog: [],
    wanted: null,
    gear: {},
    injured: false,
    lover: false,
    loverSince: 0,
    confessed: false,
    confessedDay: 0,
    ambiguous: false,
    ambiguousSince: 0,
    stageHistory: [],
    strain: 0,
    lastInteractionDay: 1,
    quarrel: null,
    lore: { entries: [] },
    longMemory: [],
    personaDone: [],
    combat: {
      hp: Math.max(8, 20 + Math.round(personality.aggression / 8) + rng.int(0, 8) + (tagEffects.combat.hp || 0)),
      morale: Math.max(4, 12 + Math.round(personality.loyalty / 10) + rng.int(0, 6) + (tagEffects.combat.morale || 0)),
      attack: Math.max(1, 4 + Math.round(personality.aggression / 18) + rng.int(0, 3) + (tagEffects.combat.attack || 0)),
      traits: [
        personality.aggression > 60 ? 'aggressive' : personality.curiosity > 68 ? 'psychic' : 'guarded',
      ],
    },
  }

  if (seedRole) {
    npc.schedule = [...seedRole.schedule]
  }

  applyNpcArchetype(npc, pickNpcArchetype(run, id, name, tags))
  return npc
}

export const DEFAULT_NPC_COUNT = 18

export function createNpcWorld(run, count = DEFAULT_NPC_COUNT) {
  const rng = createRng(`${run.seed}:npcs`)
  const total = Math.min(1000, Math.max(1, Number(count) || DEFAULT_NPC_COUNT))
  const npcs = {}
  const names = buildNpcNamePool(rng)
  const usedNames = new Set(FIXED_NPCS.map((npc) => npc.name))

  for (let index = 0; index < total; index += 1) {
    const id = `npc-${index + 1}`
    const seedRole = FIXED_NPCS[index] || null
    const name = seedRole?.name || nextNpcName(names, usedNames, index)
    const npc = makeNpc(run, rng, id, seedRole, name)
    npc.tier = index < 24 ? 'core' : index < 100 ? 'active' : 'background'
    npcs[id] = npc
  }

  const edges = []
  const list = Object.values(npcs)
  const maxDegree = total > 60 ? 4 : Infinity
  const targetEdges = Math.min(1600, Math.max(36, Math.ceil(total * 1.8)))
  const degrees = new Map()
  for (let i = 0; i < list.length; i += 1) {
    for (let j = i + 1; j < list.length; j += 1) {
      if (edges.length >= targetEdges) break
      const a = list[i]
      const b = list[j]
      if (maxDegree !== Infinity && ((degrees.get(a.id) || 0) >= maxDegree || (degrees.get(b.id) || 0) >= maxDegree)) continue
      if (a.faction !== b.faction && a.home !== b.home && !rng.chance(0.28)) continue
      const affinity = tagAffinity(a.tags, b.tags)
      const overlap = a.interests.filter((interest) => b.interests.includes(interest)).length
      const trust = clamp(
        Math.round(30 + affinity.score + (a.faction === b.faction ? 8 : 0) + overlap * 3 + rng.int(-8, 8)),
        0,
        88
      )
      const closeness = clamp(Math.round(15 + affinity.score * 0.5 + rng.int(0, 30)), 0, 80)
      const rivalry = clamp(Math.round(20 - affinity.score * 0.6 + rng.int(0, 20)), 0, 80)
      const roll = rng.next()
      let kind = 'friend'
      if (roll < 0.035) kind = 'family'
      else if (roll < 0.065) kind = 'lover'
      else if (rivalry > 55) kind = 'rival'
      else if (trust < 32) kind = 'acquaintance'
      edges.push({
        a: a.id,
        b: b.id,
        trust: kind === 'lover' || kind === 'family' ? Math.max(trust, 55) : trust,
        closeness: kind === 'lover' || kind === 'family' ? Math.max(closeness, 65) : closeness,
        rivalry: kind === 'lover' || kind === 'family' ? Math.min(rivalry, 18) : rivalry,
        affinity: affinity.score,
        kind,
      })
      degrees.set(a.id, (degrees.get(a.id) || 0) + 1)
      degrees.set(b.id, (degrees.get(b.id) || 0) + 1)
    }
    if (edges.length >= targetEdges) break
  }

  if (run.player.flaws?.includes('feud') || run.player.flaw === 'feud') {
    const target = list.slice().sort((a, b) => b.personality.aggression - a.personality.aggression)[0]
    if (target) {
      target.relation.grievance = 65
      target.relation.trust = Math.min(target.relation.trust, 8)
      target.hostile = true
      target.memory.unshift({ day: 1, text: '你欠他一笔还没还的账。' })
    }
  }

  return {
    npcs,
    npcEdges: edges,
    npcCount: total,
    party: [],
    worldEvents: [],
    pendingAmbush: null,
  }
}

export function ensureNpcTags(run) {
  if (!run?.npcs) return run
  const rng = createRng(`${run.seed}:npc-tags-migrate`)
  Object.values(run.npcs).forEach((npc) => {
    if (!npc.bag || typeof npc.bag !== 'object') npc.bag = {}
    if (typeof npc.credits !== 'number') npc.credits = 30
    if (!Array.isArray(npc.tradeLog)) npc.tradeLog = []
    if (npc.wanted === undefined) npc.wanted = null
    if (!npc.gear || typeof npc.gear !== 'object') npc.gear = {}
    if (typeof npc.injured !== 'boolean') npc.injured = false
    if (typeof npc.lover !== 'boolean') npc.lover = false
    if (typeof npc.loverSince !== 'number') npc.loverSince = 0
    if (typeof npc.confessed !== 'boolean') npc.confessed = false
    if (typeof npc.confessedDay !== 'number') npc.confessedDay = 0
    if (!Array.isArray(npc.personaDone)) npc.personaDone = []
    if (!npc.tier) npc.tier = 'core'
    ensureNpcStage(npc, run.day)
    ensureNpcArchetype(run, npc)
    if (npc.tags?.length) return
    const seedRole = FIXED_NPCS.find((item) => item.name === npc.name) || null
    npc.tags = pickNpcTags(rng, seedRole)
    npc.tagEffects = aggregateTagEffects(npc.tags)
    npc.tagBias = tagAffinity(playerTagKeys(run), npc.tags).score
    if (!npc.memory) npc.memory = []
    if (!npc.lore || !Array.isArray(npc.lore.entries)) npc.lore = { entries: [] }
    if (!Array.isArray(npc.longMemory)) npc.longMemory = []
  })
  ;(run.npcEdges || []).forEach((edge) => {
    if (typeof edge.affinity !== 'number') {
      const a = run.npcs[edge.a]
      const b = run.npcs[edge.b]
      if (a && b) edge.affinity = tagAffinity(a.tags || [], b.tags || []).score
    }
    if (!edge.kind) {
      if (edge.rivalry >= 55) edge.kind = 'rival'
      else if (edge.closeness >= 60 && edge.trust >= 55) edge.kind = 'friend'
      else edge.kind = 'acquaintance'
    }
  })
  return run
}

function nextNpcId(run) {
  let index = 1
  while (run.npcs?.[`npc-${index}`]) index += 1
  return `npc-${index}`
}

export function spawnCityNpc(run, cityId = 'dock', index = 0, options = {}) {
  if (!run?.npcs) return null
  const rng = createRng(`${run.seed}:city:${cityId}:npc:${index}:${options.salt || ''}`)
  const usedNames = new Set(Object.values(run.npcs).map((npc) => npc.name))
  const names = buildNpcNamePool(rng)
  const name = nextNpcName(names, usedNames, index)
  const id = nextNpcId(run)
  const npc = makeNpc(run, rng, id, null, name)
  npc.visitor = Boolean(options.visitor)
  npc.cityId = cityId
  npc.active = true
  npc.tier = options.tier || 'active'
  npc.joinedDay = run.day
  npc.home = options.home || 'dock'
  npc.schedule = options.schedule || ['在空港闲逛', '去市场找活干', '在城门附近等消息']
  run.npcs[id] = npc

  const others = Object.values(run.npcs).filter((other) => (
    other.id !== id && other.active !== false
  ))
  rng.shuffle(others).slice(0, options.edges ?? 3).forEach((other) => {
    const affinity = tagAffinity(npc.tags || [], other.tags || []).score
    run.npcEdges = run.npcEdges || []
    run.npcEdges.push({
      a: id,
      b: other.id,
      trust: clamp(Math.round(28 + affinity * 0.8 + rng.int(-5, 8)), 0, 80),
      closeness: clamp(Math.round(12 + affinity * 0.4 + rng.int(0, 18)), 0, 70),
      rivalry: clamp(Math.round(16 - affinity * 0.5 + rng.int(0, 14)), 0, 70),
      affinity,
      kind: 'acquaintance',
    })
  })

  return npc
}

export function spawnVisitor(run, index = 0) {
  const refresh = run?.city?.refreshCount || 0
  return spawnCityNpc(run, 'dock', index, {
    visitor: true,
    salt: `visitor:${refresh}`,
    schedule: ['在空港酒馆看人', '去市场找活干', '在城门附近等消息'],
  })
}

export function npcList(run) {
  return Object.values(run.npcs || {}).filter((npc) => npc.active !== false)
}

export function factionName(key) {
  return FACTIONS[key]?.name || key
}

const TREE_LABELS = {
  lover: '恋人',
  family: '亲人',
  friend: '好友',
  rival: '对手',
  acquaintance: '熟人',
}

export function npcRelationTree(run, npcId) {
  const npc = run?.npcs?.[npcId]
  if (!npc) return null
  const categories = {
    lover: [],
    family: [],
    friend: [],
    rival: [],
    acquaintance: [],
  }

  ;(run.npcEdges || []).forEach((edge) => {
    if (edge.a !== npcId && edge.b !== npcId) return
    const otherId = edge.a === npcId ? edge.b : edge.a
    const other = run.npcs?.[otherId]
    if (!other || other.active === false) return
    const kind = categories[edge.kind] ? edge.kind : 'acquaintance'
    categories[kind].push({ npc: other, edge, kind })
  })

  const playerNode = {
    npc: {
      id: 'player',
      name: run.player.name,
      abo: run.player.abo,
      role: '你',
      faction: 'player',
      home: 'dock',
    },
    edge: null,
    kind: npc.lover ? 'lover' : 'player',
  }
  if (npc.lover) categories.lover.unshift(playerNode)

  Object.values(categories).forEach((items) => {
    items.sort((left, right) => (
      (right.edge?.closeness || 0) - (left.edge?.closeness || 0) ||
      (right.edge?.trust || 0) - (left.edge?.trust || 0)
    ))
  })

  return {
    npc,
    player: playerNode,
    categories: Object.entries(categories)
      .map(([id, items]) => ({ id, label: TREE_LABELS[id], items }))
      .filter((category) => category.items.length),
    all: Object.values(categories).flat(),
  }
}

export function romanceStatus(run, npcId) {
  const npc = run?.npcs?.[npcId]
  if (!npc) return null
  const lovers = Object.values(run.npcs || {}).filter((item) => item.alive && item.lover)
  const stage = relationStageOf(npc)
  const available = stage.id === 'ambiguous' &&
    !npc.lover &&
    !npc.quarrel?.active &&
    npc.alive &&
    !npc.hostile &&
    npc.relation.trust >= 50 &&
    npc.relation.closeness >= 60 &&
    !['commitmentphobe', 'solo'].some((tag) => (npc.tags || []).includes(tag))
  return {
    available,
    lover: Boolean(npc.lover),
    stage: stage.id,
    stageName: stage.name,
    stageInfo: relationStageInfo(npc),
    lovers: lovers.length,
    otherLovers: lovers.filter((item) => item.id !== npc.id).length,
  }
}

export function confessToNpc(run, npcId) {
  const npc = run?.npcs?.[npcId]
  if (!npc) return { ok: false, message: '找不到这个人' }
  const status = romanceStatus(run, npcId)
  if (status.lover) return { ok: false, message: '你们已经是恋人了' }
  if (status.stage !== 'ambiguous') return { ok: false, message: '关系还没到暧昧阶段，先把话说开一点' }
  if (npc.quarrel?.active) return { ok: false, message: '你们还在冷战中，先把这件事解决' }
  if (!status.available) return { ok: false, message: '信任或亲近还不够，或者对方不打算谈这件事' }

  const rng = createRng(`${run.seed}:confess:${npcId}:${run.rollCount}`)
  run.rollCount += 1
  const roll = rng.int(1, 20)
  const soc = run.player.attrs?.soc || 0
  const bonus = Math.floor(npc.relation.closeness / 10) + Math.floor(npc.relation.trust / 20)
  const dc = status.otherLovers ? 15 : 12
  const total = roll + soc + bonus
  const accepted = roll === 20 || (roll !== 1 && total >= dc)

  npc.confessed = true
  npc.confessedDay = run.day
  if (accepted) {
    npc.lover = true
    npc.loverSince = run.day
    npc.romance = true
    npc.relation.closeness = clamp(npc.relation.closeness + 8, 0, 100)
    npc.relation.trust = clamp(npc.relation.trust + 4, 0, 100)
    run.flags = run.flags || {}
    run.flags.lover = { npcId: npc.id, day: run.day }
    return {
      ok: true,
      accepted: true,
      roll,
      total,
      dc,
      text: '你把话说完了。他沉默了一会儿，然后说：“好。”',
    }
  }

  npc.relation.closeness = clamp(npc.relation.closeness - 4, 0, 100)
  npc.relation.grievance = clamp(npc.relation.grievance + 2, 0, 100)
  return {
    ok: true,
    accepted: false,
    roll,
    total,
    dc,
    text: '他听懂了，但没有立刻回答。最后只说：“再给我一点时间。”',
  }
}

export function breakUpWithNpc(run, npcId) {
  const npc = run?.npcs?.[npcId]
  if (!npc?.lover) return { ok: false, message: '你们现在不是恋人' }
  npc.lover = false
  npc.loverSince = 0
  npc.confessed = true
  npc.confessedDay = run.day
  npc.breakupDay = run.day
  npc.quarrel = null
  clearAmbiguous(npc, run.day)
  npc.relation.closeness = clamp(npc.relation.closeness - 20, 0, 100)
  npc.relation.trust = clamp(npc.relation.trust - 8, 0, 100)
  npc.relation.grievance = clamp(npc.relation.grievance + 10, 0, 100)
  return { ok: true, text: '你把关系停在了这里。他没有挽留，只是把门关得很轻。' }
}

function pushEvent(run, text, kind = 'info') {
  if (!Array.isArray(run.worldEvents)) run.worldEvents = []
  run.worldEvents.unshift({ day: run.day, text, kind })
  if (run.worldEvents.length > 40) run.worldEvents.length = 40
}

function addMemory(npc, day, text) {
  npc.memory.unshift({ day, text })
  if (npc.memory.length > 8) npc.memory.length = 8
}

function markSocial(run, npcId, kind, delta) {
  run.flags = run.flags || {}
  run.flags.lastSocial = { npcId, kind, delta, day: run.day }
}

export function giftToNpc(run, npcId, itemId) {
  const npc = run.npcs?.[npcId]
  if (!npc || !npc.alive) return { ok: false, message: '找不到这个人' }
  if (!ITEMS[itemId] || (run.inv[itemId] || 0) < 1) return { ok: false, message: '你没有这件东西' }
  if (npc.hostile) return { ok: false, message: '他现在不想收你的东西' }

  const recent = npc.giftLog.filter((entry) => run.day - entry.day <= 2)
  const saturation = Math.min(0.8, recent.length * 0.22)
  const matches = (ITEM_TAGS[itemId] || []).filter((tag) => npc.interests.includes(tag)).length
  const interestFactor = matches > 0 ? 1.65 : 0.55
  const biasFactor = clamp(1 + npc.bias / 100, 0.55, 1.4)
  const base = ITEM_VALUE[itemId] || 10

  let gain = Math.round(base * interestFactor * biasFactor * (1 - saturation))
  if (npc.bias < -18 && base >= 18) gain = Math.min(gain, 2)

  run.inv[itemId] -= 1
  if (run.inv[itemId] <= 0) delete run.inv[itemId]
  if (!npc.bag) npc.bag = {}
  npc.bag[itemId] = (npc.bag[itemId] || 0) + 1
  npc.giftLog.unshift({ day: run.day, itemId })
  if (npc.giftLog.length > 12) npc.giftLog.length = 12

  const relation = npc.relation
  relation.closeness = clamp(relation.closeness + gain, 0, 100)
  relation.trust = clamp(relation.trust + Math.ceil(gain / 3), 0, 100)
  relation.respect = clamp(relation.respect + Math.floor(gain / 4), 0, 100)

  let reply = gain >= 8
    ? '他收下了，态度明显松了一点。'
    : gain > 0
      ? '他收下了，但没有多说什么。'
      : '他看了一眼，把东西推了回来。'

  if (matches > 0) {
    reply = '他挑了下眉，这东西正合他的兴趣。'
  }
  if (ITEMS[itemId].kind === 'gift') {
    reply = matches > 0
      ? '他拿着看了很久，像是想起了什么。'
      : '他收下了，嘴角动了一下。'
  }
  if (npc.bias < -18 && base >= 18) {
    relation.grievance = clamp(relation.grievance + 4, 0, 100)
    reply = '他收下了，但把这当成收买。'
  }

  addMemory(npc, run.day, `你送了 ${ITEMS[itemId].name}。`)
  markSocial(run, npcId, 'gift', gain)
  noteNpcInteraction(npc, run.day)
  return { ok: true, gain, reply }
}

function tradeBasePrice(itemId) {
  const item = ITEMS[itemId]
  if (!item) return 10
  if (item.kind === 'use') return 35
  if (item.kind === 'gift') return 12
  return 22
}

export function npcTradeOffers(run, npcId) {
  const npc = run?.npcs?.[npcId]
  if (!npc) return []
  return Object.keys(npc.bag || {})
    .filter((itemId) => (npc.bag[itemId] || 0) > 0 && ITEMS[itemId])
    .filter((itemId) => !(npc.injured && ['medkit', 'ration'].includes(itemId)))
    .map((itemId) => ({
      itemId,
      ...ITEMS[itemId],
      count: npc.bag[itemId],
      price: Math.max(4, Math.round(tradeBasePrice(itemId) * (1 - npc.relation.closeness / 400))),
    }))
}

export function buyFromNpc(run, npcId, itemId) {
  const npc = run?.npcs?.[npcId]
  if (!npc || !npc.alive) return { ok: false, message: '找不到这个人' }
  if (npc.hostile) return { ok: false, message: '他现在不想和你做买卖' }
  const offer = npcTradeOffers(run, npcId).find((item) => item.itemId === itemId)
  if (!offer) return { ok: false, message: '他没有这件东西' }
  if (run.player.credits < offer.price) return { ok: false, message: '信用点不足' }
  run.player.credits -= offer.price
  npc.credits = (npc.credits || 0) + offer.price
  npc.bag[itemId] -= 1
  if (npc.bag[itemId] <= 0) delete npc.bag[itemId]
  run.inv[itemId] = (run.inv[itemId] || 0) + 1
  npc.relation.trust = clamp(npc.relation.trust + 1, 0, 100)
  return { ok: true, item: offer, credits: offer.price }
}

export function sellToNpc(run, npcId, itemId) {
  const npc = run?.npcs?.[npcId]
  if (!npc || !npc.alive) return { ok: false, message: '找不到这个人' }
  if (npc.hostile) return { ok: false, message: '他现在不想和你做买卖' }
  if ((run.inv[itemId] || 0) < 1 || !ITEMS[itemId]) return { ok: false, message: '你没有这件东西' }
  const price = Math.max(2, Math.floor(tradeBasePrice(itemId) * 0.55))
  if ((npc.credits || 0) < price) return { ok: false, message: '他身上没有足够的信用点' }
  run.inv[itemId] -= 1
  if (run.inv[itemId] <= 0) delete run.inv[itemId]
  run.player.credits += price
  npc.credits -= price
  npc.bag[itemId] = (npc.bag[itemId] || 0) + 1
  npc.relation.closeness = clamp(npc.relation.closeness + 1, 0, 100)
  return { ok: true, itemId, name: ITEMS[itemId].name, credits: price }
}

export function ensureNpcWanted(run, npc, force = false) {
  if (!npc) return null
  if (!force && npc.wanted?.day === run.day && npc.wanted?.status === 'open') return npc.wanted
  const rng = createRng(`${run.seed}:wanted:${npc.id}:${run.day}`)
  const candidates = Object.keys(ITEMS).filter((itemId) => {
    const item = ITEMS[itemId]
    if (!item || !['mat', 'gift', 'use'].includes(item.kind)) return false
    return !(npc.injured && ['medkit', 'ration'].includes(itemId))
  })
  const itemId = rng.pick(candidates)
  npc.wanted = itemId ? {
    itemId,
    price: Math.max(6, Math.round(tradeBasePrice(itemId) * 1.2)),
    day: run.day,
    status: 'open',
  } : null
  return npc.wanted
}

export function fulfillNpcWanted(run, npcId) {
  const npc = run?.npcs?.[npcId]
  if (!npc || !npc.alive) return { ok: false, message: '找不到这个人' }
  if (npc.hostile) return { ok: false, message: '他现在不想和你做买卖' }
  const wanted = ensureNpcWanted(run, npc)
  if (!wanted || wanted.status !== 'open') return { ok: false, message: '他今天没有收购单' }
  if ((run.inv[wanted.itemId] || 0) < 1) return { ok: false, message: `你没有${ITEMS[wanted.itemId].name}` }
  if ((npc.credits || 0) < wanted.price) return { ok: false, message: '他身上的信用点不够' }
  run.inv[wanted.itemId] -= 1
  if (run.inv[wanted.itemId] <= 0) delete run.inv[wanted.itemId]
  run.player.credits += wanted.price
  npc.credits -= wanted.price
  npc.bag[wanted.itemId] = (npc.bag[wanted.itemId] || 0) + 1
  npc.wanted = { ...wanted, status: 'done' }
  npc.relation.trust = clamp(npc.relation.trust + 2, 0, 100)
  return { ok: true, itemId: wanted.itemId, name: ITEMS[wanted.itemId].name, credits: wanted.price }
}

export function npcCombatStats(npc) {
  const base = npc?.combat || { hp: 20, morale: 10, attack: 4 }
  const bonus = Object.values(npc?.gear || {}).reduce((sum, gear) => {
    Object.entries(gear?.bonus || {}).forEach(([key, value]) => { sum[key] = (sum[key] || 0) + value })
    return sum
  }, {})
  return {
    hp: Math.round(base.hp + (bonus.vit || 0) * 4 + (bonus.wil || 0) * 2),
    morale: Math.round(base.morale + (bonus.wil || 0)),
    attack: Math.round(base.attack + (bonus.per || 0) * 0.5 + (bonus.tec || 0) * 0.5 + (bonus.psi || 0) * 0.5),
    traits: [...(base.traits || [])],
  }
}

export function giveNpcGear(run, npcId, uid) {
  const npc = run?.npcs?.[npcId]
  if (!npc || !npc.alive) return { ok: false, message: '找不到这个人' }
  const index = (run.gear || []).findIndex((gear) => gear.uid === uid)
  if (index < 0) return { ok: false, message: '你没有这件装备' }
  const gear = run.gear[index]
  const previous = npc.gear?.[gear.slot]
  run.gear.splice(index, 1)
  if (run.equipment?.[gear.slot] === uid) run.equipment[gear.slot] = null
  if (previous) run.gear.push(previous)
  npc.gear = npc.gear || {}
  npc.gear[gear.slot] = gear
  npc.relation.trust = clamp(npc.relation.trust + 3, 0, 100)
  npc.relation.closeness = clamp(npc.relation.closeness + 2, 0, 100)
  return { ok: true, gear, previous: previous || null }
}

export const TALK_TOPICS = {
  life: { label: '近况', trust: 2, closeness: 1 },
  interest: { label: '兴趣', trust: 1, closeness: 2 },
  district: { label: '星区', trust: 0, closeness: 1, respect: 1 },
  probe: { label: '试探', trust: -1, closeness: 0, fear: 2 },
}

export function talkToNpc(run, npcId, topic = 'life') {
  const npc = run.npcs?.[npcId]
  if (!npc || !npc.alive) return { ok: false, message: '找不到这个人' }
  if (npc.talkedDay === run.day) return { ok: false, message: '今天已经聊过了' }
  if (npc.hostile) return { ok: false, message: '他把手放在了武器上。' }

  const meta = TALK_TOPICS[topic] || TALK_TOPICS.life
  const rng = createRng(`${run.seed}:talk:${npcId}:${run.day}:${topic}`)
  npc.talkedDay = run.day

  const relation = npc.relation
  const interestMatch = topic === 'interest' &&
    npc.interests.some((interest) => playerInterests(run).includes(interest))

  const empathy = (run.player.skills?.includes('empathy') ? 1 : 0) +
    (run.player.perks?.empathy || 0) +
    (run.player.traits?.includes('resonance') ? 1 : 0)
  relation.trust = clamp(relation.trust + meta.trust + (interestMatch ? 2 : 0) + empathy, 0, 100)
  relation.closeness = clamp(relation.closeness + meta.closeness + (interestMatch ? 1 : 0), 0, 100)
  if (meta.respect) relation.respect = clamp(relation.respect + meta.respect, 0, 100)
  if (meta.fear) relation.fear = clamp(relation.fear + meta.fear, 0, 100)

  const lines = {
    life: [
      `“最近？${REGIONS[npc.home].name}没什么新鲜的。”`,
      '“能活一天算一天。”',
      `“${FACTIONS[npc.faction].name}最近动作很多，你小心点。”`,
    ],
    interest: interestMatch
      ? [`“你也对${npc.interests[0]}感兴趣？”他明显来了精神。`]
      : [`“${npc.interests[0]}？说说看。”`, '“这个我不太懂，但可以听。”'],
    district: [
      `“${REGIONS[npc.home].name}的边界最近不太稳。”`,
      '“别在裂谷里待太久。”',
    ],
    probe: [
      '“你问得太多了。”',
      '“有些名字，说出来就会有人死。”',
    ],
  }

  let reply = rng.pick(lines[topic] || lines.life)
  if (relation.grievance > 55) reply = '“我们没什么好说的。”'

  let reveal = null
  if (topic === 'probe' && rng.chance(0.45)) {
    const edge = (run.npcEdges || []).find((item) => item.a === npcId || item.b === npcId)
    if (edge) {
      const otherId = edge.a === npcId ? edge.b : edge.a
      const other = run.npcs[otherId]
      if (other) reveal = `他提到了${other.name}。`
    }
  }

  addMemory(npc, run.day, `你们聊了${meta.label}。`)
  markSocial(run, npcId, 'talk', (meta.trust || 0) + (meta.closeness || 0))
  noteNpcInteraction(npc, run.day)
  return { ok: true, reply: reveal ? `${reply} ${reveal}` : reply, topic: meta.label }
}

export function intimidateNpc(run, npcId) {
  const npc = run.npcs?.[npcId]
  if (!npc || !npc.alive) return { ok: false, message: '找不到这个人' }

  const relation = npc.relation
  relation.fear = clamp(relation.fear + 10 + (run.player.perks?.fear || 0), 0, 100)
  relation.respect = clamp(relation.respect + 3, 0, 100)
  relation.trust = clamp(relation.trust - 6, 0, 100)
  relation.closeness = clamp(relation.closeness - 4, 0, 100)
  relation.grievance = clamp(relation.grievance + 12, 0, 100)
  markSocial(run, npcId, 'intimidate', -6)

  if (relation.grievance >= 60 && !npc.hostile) {
    npc.hostile = true
    pushEvent(run, `${npc.name} 记住了你。`, 'bad')
  }

  addMemory(npc, run.day, '你威胁了他。')
  return { ok: true, reply: '他没有退，但手已经按在武器上了。' }
}

export function apologizeToNpc(run, npcId) {
  const npc = run.npcs?.[npcId]
  if (!npc || !npc.alive) return { ok: false, message: '找不到这个人' }
  if (run.player.credits < 40) return { ok: false, message: '需要 40 信用点' }

  run.player.credits -= 40
  const relation = npc.relation
  relation.grievance = clamp(relation.grievance - 15, 0, 100)
  relation.trust = clamp(relation.trust + 3, 0, 100)
  if (relation.grievance < 35) npc.hostile = false
  addMemory(npc, run.day, '你道了歉。')
  return { ok: true, reply: '他收下了信用点，态度没有变好，但也没有更坏。' }
}

export function canInviteToParty(run, npcId) {
  const npc = run.npcs?.[npcId]
  if (!npc) return { ok: false, reason: '找不到这个人' }
  if (!npc.alive) return { ok: false, reason: '他已经不在了' }
  if (npc.hostile) return { ok: false, reason: '他正在敌视你' }
  if (npc.party) return { ok: false, reason: '他已经在队伍里' }
  if ((run.party || []).length >= 2) return { ok: false, reason: '队伍已满' }
  if (npc.relation.trust < 50) return { ok: false, reason: '信任不足（需要 50）' }
  if (npc.relation.closeness < 30) return { ok: false, reason: '还不够熟（亲近需要 30）' }
  if (npc.relation.grievance >= 25) return { ok: false, reason: '他还在记恨你' }
  return { ok: true }
}

export function inviteToParty(run, npcId) {
  const npc = run.npcs?.[npcId]
  const check = canInviteToParty(run, npcId)
  if (!check.ok) return { ok: false, message: check.reason }

  npc.party = true
  if (!Array.isArray(run.party)) run.party = []
  run.party.push(npcId)
  npc.relation.closeness = clamp(npc.relation.closeness + 4, 0, 100)
  addMemory(npc, run.day, '他加入了你的队伍。')
  pushEvent(run, `${npc.name} 加入了你的队伍。`, 'good')
  return { ok: true, reply: '他点了点头，跟在你身后。' }
}

export function leaveParty(run, npcId) {
  const npc = run.npcs?.[npcId]
  if (!npc || !npc.party) return { ok: false, message: '他不在队伍里' }

  npc.party = false
  run.party = (run.party || []).filter((id) => id !== npcId)
  npc.relation.trust = clamp(npc.relation.trust - 5, 0, 100)
  addMemory(npc, run.day, '他离开了队伍。')
  pushEvent(run, `${npc.name} 离开了你的队伍。`, 'info')
  return { ok: true, reply: '他没说什么，转身走了。' }
}

export function applyNpcBattleOutcome(run, npcId, choice) {
  const npc = run.npcs?.[npcId]
  if (!npc) return

  const relation = npc.relation
  if (choice === 'spare') {
    npc.hostile = false
    relation.trust = clamp(relation.trust + 6, 0, 100)
    relation.grievance = clamp(relation.grievance - 25, 0, 100)
    relation.fear = clamp(relation.fear + 4, 0, 100)
    addMemory(npc, run.day, '你放过了他。')
  } else if (choice === 'disarm') {
    relation.respect = clamp(relation.respect + 5, 0, 100)
    relation.trust = clamp(relation.trust - 5, 0, 100)
  } else if (choice === 'interrogate') {
    relation.fear = clamp(relation.fear + 8, 0, 100)
    relation.trust = clamp(relation.trust - 10, 0, 100)
  } else if (choice === 'recruit') {
    npc.hostile = false
    relation.grievance = clamp(relation.grievance - 20, 0, 100)
    relation.trust = clamp(relation.trust + 10, 0, 100)
    if ((run.party || []).length < 2) {
      npc.party = true
      if (!Array.isArray(run.party)) run.party = []
      run.party.push(npcId)
    }
    addMemory(npc, run.day, '你招募了他。')
  } else if (choice === 'execute') {
    npc.alive = false
    npc.party = false
    run.party = (run.party || []).filter((id) => id !== npcId)
    addMemory(npc, run.day, '你杀了他。')
    run.flags.ruthless = (run.flags.ruthless || 0) + 1
  }
  if (relation.grievance < 35) npc.hostile = false
}

export function resolveAmbushPeacefully(run, npcId) {
  const npc = run.npcs?.[npcId]
  if (!npc) return { ok: false }
  const credits = Math.min(60, Math.round(run.player.credits * 0.2))
  run.player.credits -= credits
  run.player.mental = clamp(run.player.mental - 6, 0, run.player.mentalMax)
  npc.relation.grievance = clamp(npc.relation.grievance - 10, 0, 100)
  run.pendingAmbush = null
  pushEvent(run, `你给了 ${npc.name} ${credits} 信用点，他没有再动手。`, 'bad')
  addMemory(npc, run.day, '你退让了。')
  return { ok: true, credits }
}

export function startAmbush(run, npcId) {
  const npc = run.npcs?.[npcId]
  if (!npc) return null
  run.pendingAmbush = null
  return npc
}

export function tickWorld(run) {
  if (!run.npcs) return []
  const rng = createRng(`${run.seed}:world:${run.day}`)
  const events = []
  const push = (text, kind = 'info') => {
    events.push(text)
    pushEvent(run, text, kind)
  }

  Object.values(run.npcs).forEach((npc) => {
    if (!npc.alive) return
    npc.activity = npc.schedule[(run.day + Number(npc.id.split('-')[1])) % npc.schedule.length]
    if (npc.tier === 'background') return
    if (npc.lover || npc.ambiguous) {
      ensureNpcStage(npc)
      const gap = run.day - (npc.lastInteractionDay || run.day)
      if (npc.quarrel?.active) {
        npc.strain = clamp(npc.strain + 1, 0, 100)
      } else if (gap >= 2) {
        npc.strain = clamp(npc.strain + Math.min(6, gap) + (expeditionEffects(run).strain || 0), 0, 100)
      } else {
        npc.strain = Math.max(0, npc.strain - 2)
      }
    }
  })

  rng.shuffle(Object.values(run.npcs).filter((npc) => npc.alive))
    .slice(0, 2)
    .forEach((npc) => {
      if (npc.activity) push(`${npc.name} ${npc.activity}。`)
    })

  ;(run.npcEdges || []).forEach((edge) => {
    if (!rng.chance(0.35)) return
    const a = run.npcs[edge.a]
    const b = run.npcs[edge.b]
    if (!a?.alive || !b?.alive) return
    if (typeof edge.affinity !== 'number') edge.affinity = tagAffinity(a.tags || [], b.tags || []).score
    const targetTrust = clamp(45 + edge.affinity * 1.2, 0, 100)
    edge.trust = clamp(edge.trust + Math.round((targetTrust - edge.trust) * 0.08) + rng.int(-2, 3), 0, 100)
    edge.rivalry = clamp(edge.rivalry + Math.round(-edge.affinity * 0.08) + rng.int(-2, 2), 0, 100)
    if (edge.trust > 78 && rng.chance(0.3)) {
      push(`${a.name} 和 ${b.name} 走得更近了。`, 'good')
    } else if (edge.rivalry > 70 && rng.chance(0.3)) {
      push(`${a.name} 和 ${b.name} 起了冲突。`, 'bad')
    }
  })

  const social = run.flags?.lastSocial
  if (social && run.day - social.day <= 1) {
    const edges = (run.npcEdges || []).filter((edge) => edge.a === social.npcId || edge.b === social.npcId)
    const targets = rng.shuffle(edges).slice(0, 2)
    targets.forEach((edge) => {
      const otherId = edge.a === social.npcId ? edge.b : edge.a
      const other = run.npcs[otherId]
      if (!other?.alive) return
      const delta = social.delta >= 0 ? (edge.trust > 55 ? 2 : 1) : (edge.rivalry > 50 ? -3 : -1)
      other.relation.trust = clamp(other.relation.trust + delta, 0, 100)
    })
    run.flags.lastSocial = null
  }

  Object.values(run.npcs).forEach((npc) => {
    if (!npc.alive || npc.active === false) return
    if (!npc.bag) npc.bag = {}
    ensureNpcWanted(run, npc)
    if (npc.injured) {
      const medicine = ['medkit', 'ration'].find((key) => (npc.bag[key] || 0) > 0)
      if (medicine) {
        npc.bag[medicine] -= 1
        if (npc.bag[medicine] <= 0) delete npc.bag[medicine]
        npc.injured = false
        push(`${npc.name} 受了伤，用掉了你送的${ITEMS[medicine].name}。`, 'good')
      } else {
        push(`${npc.name} 带着伤${npc.activity || '在空港'}走动。`, 'info')
      }
    } else if (rng.chance(0.12)) {
      npc.injured = true
      push(`${npc.name} ${npc.activity || '在空港'}时受了伤。`, 'bad')
    } else if (rng.chance(0.1)) {
      const gift = rng.pick(GIFT_KEYS)
      npc.bag[gift] = (npc.bag[gift] || 0) + 1
      push(`${npc.name} ${npc.activity || '在空港'}时捡到了${ITEMS[gift].name}。`, 'info')
    }
  })

  let trades = 0
  rng.shuffle(run.npcEdges || []).forEach((edge) => {
    if (trades >= 2 || !rng.chance(0.18)) return
    const a = run.npcs[edge.a]
    const b = run.npcs[edge.b]
    if (!a?.alive || !b?.alive || a.active === false || b.active === false) return
    const seller = (a.bag && Object.keys(a.bag).length) ? a : (b.bag && Object.keys(b.bag).length) ? b : null
    const buyer = seller === a ? b : a
    if (!seller || !buyer) return
    const itemId = rng.pick(Object.keys(seller.bag).filter((key) => ITEMS[key] && !(seller.injured && ['medkit', 'ration'].includes(key))))
    if (!itemId || !seller.bag[itemId]) return
    const price = Math.max(2, Math.round(tradeBasePrice(itemId) * (edge.kind === 'family' || edge.kind === 'lover' ? 0.65 : 0.9)))
    if ((buyer.credits || 0) < price) return
    seller.bag[itemId] -= 1
    if (seller.bag[itemId] <= 0) delete seller.bag[itemId]
    buyer.bag[itemId] = (buyer.bag[itemId] || 0) + 1
    seller.credits = (seller.credits || 0) + price
    buyer.credits = (buyer.credits || 0) - price
    seller.tradeLog = seller.tradeLog || []
    buyer.tradeLog = buyer.tradeLog || []
    seller.tradeLog.unshift({ day: run.day, itemId, credits: price, with: buyer.id })
    buyer.tradeLog.unshift({ day: run.day, itemId, credits: -price, with: seller.id })
    trades += 1
    push(`${seller.name} 把${ITEMS[itemId].name}卖给了${buyer.name}，收了 ${price} 信用点。`, 'info')
  })

  let duels = 0
  rng.shuffle(run.npcEdges || []).forEach((edge) => {
    if (duels >= 1 || edge.rivalry < 55 || !rng.chance(0.12)) return
    const a = run.npcs[edge.a]
    const b = run.npcs[edge.b]
    if (!a?.alive || !b?.alive || a.active === false || b.active === false) return
    const statsA = npcCombatStats(a)
    const statsB = npcCombatStats(b)
    const scoreA = statsA.attack + rng.int(1, 12) + Math.round(edge.trust / 20)
    const scoreB = statsB.attack + rng.int(1, 12) + Math.round(edge.trust / 20)
    if (scoreA === scoreB) return
    const winner = scoreA > scoreB ? a : b
    const loser = winner === a ? b : a
    loser.injured = true
    winner.credits = (winner.credits || 0) + 6
    loser.credits = Math.max(0, (loser.credits || 0) - 6)
    edge.rivalry = clamp(edge.rivalry + 6, 0, 100)
    edge.trust = clamp(edge.trust - 4, 0, 100)
    duels += 1
    push(`${winner.name} 和 ${loser.name} 在空港外动了手。${loser.name}受了伤，${winner.name}拿走了 6 信用点。`, 'bad')
  })

  Object.values(run.npcs).forEach((npc) => {
    if (!npc.alive || !npc.stolen) return
    if (!rng.chance(0.45)) return
    const count = npc.stolen
    npc.stolen = 0
    npc.relation.grievance = clamp(npc.relation.grievance + 8 + count * 4, 0, 100)
    npc.relation.trust = Math.max(0, npc.relation.trust - 6)
    if (npc.relation.grievance >= 60) npc.hostile = true
    push(`${npc.name} 发现东西少了，开始怀疑你。`, 'bad')
  })

  if (run.pendingAmbush) {
    // 已有未处理的伏击，不再叠加
  } else {
    Object.values(run.npcs).forEach((npc) => {
      if (!npc.alive) return
      if (npc.relation.grievance >= 60) npc.hostile = true
      if (npc.relation.grievance < 30) npc.hostile = false
      if (!npc.hostile || !rng.chance(0.4)) return

      if (run.pendingAmbush) return

      if (npc.personality.aggression >= 60) {
        run.pendingAmbush = npc.id
        push(`${npc.name} 在你的路上等着。`, 'bad')
      } else if (rng.chance(0.55)) {
        const items = Object.keys(run.inv || {}).filter((key) => ITEMS[key])
        if (items.length) {
          const item = rng.pick(items)
          run.inv[item] -= 1
          if (run.inv[item] <= 0) delete run.inv[item]
          push(`${npc.name} 拿走了你的 ${ITEMS[item].name}。`, 'bad')
        } else {
          const credits = Math.min(30, run.player.credits)
          run.player.credits -= credits
          push(`${npc.name} 摸走了你 ${credits} 信用点。`, 'bad')
        }
      } else {
        run.player.mental = clamp(run.player.mental - 4, 0, run.player.mentalMax)
        push(`${npc.name} 堵住你，警告了一顿。`, 'bad')
      }
    })
  }

  ;[...(run.party || [])].forEach((id) => {
    const npc = run.npcs[id]
    if (!npc) return
    if (npc.relation.trust < 35 || npc.relation.grievance > 35) {
      npc.party = false
      run.party = run.party.filter((member) => member !== id)
      push(`${npc.name} 离开了你的队伍。`, 'bad')
    }
  })

  return events
}
