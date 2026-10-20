/**
 * 空港城市层：市场、诊所、酒馆访客与休息服务。
 * 不改变远征地图，只提供安全据点和可重复访问的地点页面。
 */

import { ITEMS } from './data.js'
import { spawnVisitor } from './npc.js'
import { createRng } from './rng.js'

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

const MARKET_POOL = [
  { key: 'ration', price: 16 },
  { key: 'wine', price: 12 },
  { key: 'stim', price: 38 },
  { key: 'anti', price: 46 },
  { key: 'medkit', price: 52 },
  { key: 'scrap', price: 10 },
  { key: 'chip', price: 24 },
  { key: 'ore', price: 28 },
  { key: 'resin', price: 18 },
  { key: 'fiber', price: 18 },
]

const CLINIC_POOL = [
  { key: 'stim', price: 34 },
  { key: 'anti', price: 42 },
  { key: 'medkit', price: 48 },
]

export function createCityState() {
  return {
    marketDay: 0,
    clinicDay: 0,
    market: [],
    clinic: [],
    visitorIds: [],
    refreshCount: 0,
    healDay: 0,
  }
}

function makeOffers(rng, pool, count, ensureKey = null) {
  const picked = rng.shuffle(pool).slice(0, count)
  if (ensureKey && !picked.some((entry) => entry.key === ensureKey)) {
    const required = pool.find((entry) => entry.key === ensureKey)
    if (required) picked[0] = required
  }
  return picked.map((entry) => ({
    id: `${entry.key}-${rng.int(100, 999)}`,
    key: entry.key,
    price: entry.price,
    stock: entry.key === 'wine' ? 6 : rng.int(1, 3),
  }))
}

export function ensureCity(run) {
  if (!run) return null
  if (!run.city || typeof run.city !== 'object') run.city = createCityState()
  const city = run.city
  if (!Array.isArray(city.market)) city.market = []
  if (!Array.isArray(city.clinic)) city.clinic = []
  if (!Array.isArray(city.visitorIds)) city.visitorIds = []
  if (typeof city.refreshCount !== 'number') city.refreshCount = 0
  if (typeof city.healDay !== 'number') city.healDay = 0

  if (city.marketDay !== run.day) {
    city.market = makeOffers(createRng(`${run.seed}:market:${run.day}`), MARKET_POOL, 6, 'wine')
    city.marketDay = run.day
  }
  if (city.clinicDay !== run.day) {
    city.clinic = makeOffers(createRng(`${run.seed}:clinic:${run.day}`), CLINIC_POOL, 3)
    city.clinicDay = run.day
  }
  if (!city.visitorIds.length) {
    city.visitorIds = Array.from({ length: 3 }, (_, index) => spawnVisitor(run, index)?.id).filter(Boolean)
  }
  return city
}

export function cityVisitors(run) {
  ensureCity(run)
  return (run.city.visitorIds || [])
    .map((id) => run.npcs?.[id])
    .filter((npc) => npc && npc.active !== false)
}

export function cityPrice(run, offer) {
  const discount = (run.player.skills?.includes('barter') ? 0.1 : 0) + (run.player.perks?.barter || 0)
  const markup = run.player.perks?.price || 0
  return Math.max(1, Math.round((offer?.price || 0) * (1 - discount + markup)))
}

export function buyCityOffer(run, section, index) {
  const city = ensureCity(run)
  const offers = section === 'clinic' ? city.clinic : city.market
  const offer = offers?.[index]
  if (!offer || !ITEMS[offer.key]) return { ok: false, message: '没有这件商品' }
  if (offer.stock <= 0) return { ok: false, message: '已经卖完了' }
  const price = cityPrice(run, offer)
  if (run.player.credits < price) return { ok: false, message: '信用点不足' }

  run.player.credits -= price
  run.inv[offer.key] = (run.inv[offer.key] || 0) + 1
  offer.stock -= 1
  return { ok: true, key: offer.key, name: ITEMS[offer.key].name, price }
}

export function healAtClinic(run) {
  const city = ensureCity(run)
  if (city.healDay === run.day) return { ok: false, message: '今天已经在诊所处理过了' }
  const cost = 34
  if (run.player.credits < cost) return { ok: false, message: '需要 34 信用点' }
  run.player.credits -= cost
  run.player.hp = clamp(run.player.hp + Math.ceil(run.player.hpMax * 0.35), 0, run.player.hpMax)
  run.player.mental = clamp(run.player.mental + Math.ceil(run.player.mentalMax * 0.25), 0, run.player.mentalMax)
  city.healDay = run.day
  return { ok: true, cost }
}

export function refreshCityVisitors(run) {
  const city = ensureCity(run)
  const cost = 12
  if (run.player.credits < cost) return { ok: false, message: '需要 12 信用点' }

  run.player.credits -= cost
  ;(city.visitorIds || []).forEach((id) => {
    const npc = run.npcs?.[id]
    if (npc && !npc.party) npc.active = false
  })
  city.refreshCount += 1
  city.visitorIds = Array.from({ length: 3 }, (_, index) => spawnVisitor(run, index)?.id).filter(Boolean)
  return { ok: true, cost, visitors: cityVisitors(run) }
}
