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

const BLACKMARKET_POOL = [
  { key: 'relic', price: 120 },
  { key: 'shard', price: 95 },
  { key: 'cold', price: 70 },
  { key: 'chip', price: 55 },
  { key: 'wine', price: 30 },
]

const QUEST_POOL = [
  { type: 'deliver', key: 'scrap', need: 2, reward: 32, title: '补一批船壳', desc: '码头要两块合金废料。' },
  { type: 'deliver', key: 'fiber', need: 2, reward: 28, title: '缝补货网', desc: '酒馆老板需要两束纤维。' },
  { type: 'deliver', key: 'spore', need: 3, reward: 36, title: '孢雾样本', desc: '诊所想收三份荧光孢。' },
  { type: 'clear', reward: 44, title: '清理航线', desc: '把一处未处理的节点从星图上划掉。' },
]

const RUMORS = [
  '白塔的回收队昨晚又少了一艘船。',
  '黑市在收旧世芯片，价格比上周高了一倍。',
  '有人在静默带听见了不属于活人的声音。',
  '城门那边新贴了一张悬赏，没人敢接。',
  '如果你要去深处，别相信没有影子的向导。',
]

export function createCityState() {
  return {
    marketDay: 0,
    clinicDay: 0,
    blackmarketDay: 0,
    questsDay: 0,
    market: [],
    clinic: [],
    blackmarket: [],
    quests: [],
    visitorIds: [],
    refreshCount: 0,
    healDay: 0,
    intelBought: false,
    doorKeyBought: false,
    rumorDay: 0,
    lastRumor: '',
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

function makeQuests(run) {
  const rng = createRng(`${run.seed}:quests:${run.day}`)
  const targets = Object.values(run.map?.nodes || {}).filter((node) => (
    node &&
    node.id !== run.location &&
    ['gather', 'event'].includes(node.type) &&
    !run.cleared.includes(node.id)
  ))
  const target = targets.length ? rng.pick(targets) : null
  return rng.shuffle(QUEST_POOL)
    .slice(0, 3)
    .map((template, index) => {
      if (template.type === 'clear' && !target) return null
      return {
        id: `city-quest-${run.day}-${index}`,
        type: template.type,
        title: template.title,
        desc: template.desc,
        reward: template.reward,
        key: template.key || null,
        need: template.need || 0,
        nodeId: template.type === 'clear' ? target.id : null,
        nodeTitle: template.type === 'clear' ? target.title : null,
        status: 'open',
      }
    })
    .filter(Boolean)
}

export function ensureCity(run) {
  if (!run) return null
  if (!run.city || typeof run.city !== 'object') run.city = createCityState()
  const city = run.city
  if (!Array.isArray(city.market)) city.market = []
  if (!Array.isArray(city.clinic)) city.clinic = []
  if (!Array.isArray(city.blackmarket)) city.blackmarket = []
  if (!Array.isArray(city.quests)) city.quests = []
  if (!Array.isArray(city.visitorIds)) city.visitorIds = []
  if (typeof city.refreshCount !== 'number') city.refreshCount = 0
  if (typeof city.healDay !== 'number') city.healDay = 0
  if (typeof city.rumorDay !== 'number') city.rumorDay = 0
  if (!city.lastRumor) city.lastRumor = ''
  if (typeof city.intelBought !== 'boolean') city.intelBought = false
  if (typeof city.doorKeyBought !== 'boolean') city.doorKeyBought = false

  if (city.marketDay !== run.day) {
    city.market = makeOffers(createRng(`${run.seed}:market:${run.day}`), MARKET_POOL, 6, 'wine')
    city.marketDay = run.day
  }
  if (city.clinicDay !== run.day) {
    city.clinic = makeOffers(createRng(`${run.seed}:clinic:${run.day}`), CLINIC_POOL, 3)
    city.clinicDay = run.day
  }
  if (city.blackmarketDay !== run.day) {
    city.blackmarket = makeOffers(createRng(`${run.seed}:blackmarket:${run.day}`), BLACKMARKET_POOL, 3)
    city.blackmarketDay = run.day
  }
  if (city.questsDay !== run.day) {
    city.quests = makeQuests(run)
    city.questsDay = run.day
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
  const offers = section === 'clinic' ? city.clinic : section === 'blackmarket' ? city.blackmarket : city.market
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

export function claimCityQuest(run, questId) {
  const city = ensureCity(run)
  const quest = (city.quests || []).find((item) => item.id === questId)
  if (!quest || quest.status !== 'open') return { ok: false, message: '这张委托已经处理过了' }

  if (quest.type === 'deliver') {
    if ((run.inv[quest.key] || 0) < quest.need) {
      return { ok: false, message: `还需要 ${quest.need} 个${ITEMS[quest.key]?.name || quest.key}` }
    }
    run.inv[quest.key] -= quest.need
  } else if (quest.type === 'clear') {
    if (!run.cleared.includes(quest.nodeId)) return { ok: false, message: '目标节点还没有处理' }
  } else {
    return { ok: false, message: '未知委托' }
  }

  run.player.credits += quest.reward
  quest.status = 'done'
  return { ok: true, quest, reward: quest.reward }
}

export function buyBlackMarketIntel(run) {
  const city = ensureCity(run)
  if (city.intelBought) return { ok: false, message: '你已经买过这份情报了' }
  const cost = 60
  if (run.player.credits < cost) return { ok: false, message: '需要 60 信用点' }
  run.player.credits -= cost
  city.intelBought = true
  run.story = run.story || {}
  run.story.flags = run.story.flags || {}
  run.story.flags.intel = true
  return {
    ok: true,
    cost,
    text: '摊主把一枚旧芯片推过来：白塔的信号源不在塔里，在塔下面的旧矿脉。',
  }
}

export function buyDoorKey(run) {
  const city = ensureCity(run)
  if ((run.story?.chapter || 1) < 4) return { ok: false, message: '门钥要等到第四章才会出现在黑市' }
  if (run.story?.flags?.doorKey || city.doorKeyBought) return { ok: false, message: '你已经拿到门钥了' }
  const cost = 80
  if (run.player.credits < cost) return { ok: false, message: '需要 80 信用点' }
  run.player.credits -= cost
  city.doorKeyBought = true
  run.story.flags = run.story.flags || {}
  run.story.flags.doorKey = true
  return {
    ok: true,
    cost,
    text: '摊主把一枚没有齿的钥匙放在柜台上：它开的不是锁，是门。',
  }
}

export function tavernRumor(run) {
  const city = ensureCity(run)
  if (city.rumorDay === run.day && city.lastRumor) {
    return { ok: true, text: city.lastRumor, cached: true }
  }
  const visitors = cityVisitors(run)
  if (!visitors.length) return { ok: false, message: '酒馆里没有可以打听的人' }
  const rng = createRng(`${run.seed}:rumor:${run.day}`)
  const npc = rng.pick(visitors)
  const text = `${npc.name}压低声音：${rng.pick(RUMORS)}`
  npc.relation.trust = clamp(npc.relation.trust + 1, 0, 100)
  npc.relation.closeness = clamp(npc.relation.closeness + 1, 0, 100)
  city.rumorDay = run.day
  city.lastRumor = text
  return { ok: true, text, npcName: npc.name }
}
