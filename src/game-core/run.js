/**
 * 单局流程：创建角色、在节点图上移动、采集、休整、锻造。
 * 所有判定都由 seed + rollCount 决定，可复现。
 */

import { ABOS, ATTR_NAME, BASE_DECK, GEAR, GIFT_KEYS, ITEMS, ORIGINS, RECIPES, REGIONS, ROLES } from './data.js'
import { buildCharacter } from './character.js'
import { createNpcWorld, tickWorld } from './npc.js'
import { completeQuestsAt, generateNpcEvents } from './npc-events.js'
import { createRng } from './rng.js'
import { generateRunMap, makeSeed } from './procgen.js'
import { createStats } from './achievements.js'
import { createBlueprintState, recipeKnown } from './blueprint.js'
import { calibrationEffects, createCalibrationState } from './calibration.js'
import { createCityState } from './city.js'
import { createDoorState } from './door.js'
import { createEscortState } from './escort.js'
import { createPromiseState } from './npc-promises.js'
import { ensureDateState } from './date-story.js'
import { generateDungeonName, resetDungeon } from './dungeon.js'
import { createReputationState } from './faction.js'
import { gearTierFor, rollGearAffixes } from './gear.js'
import { createStoryState } from './story.js'

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

export function timeLabel(run) {
  const ap = run?.ap ?? 8
  if (ap >= 6) return '晨间'
  if (ap >= 4) return '午后'
  if (ap >= 2) return '黄昏'
  return '深夜'
}

export function addLog(run, text, kind = 'info') {
  run.log.unshift({ t: `D${run.day} · ${timeLabel(run)}`, text, kind })
  if (run.log.length > 200) run.log.length = 200
}

function actionRng(run) {
  const rng = createRng(`${run.seed}:${run.rollCount}`)
  run.rollCount += 1
  return rng
}

function hasTrait(run, key) {
  return run.player.traits.includes(key)
}

export function gearBonus(run, attrKey) {
  let sum = 0
  Object.keys(run.equipment).forEach((slot) => {
    const uid = run.equipment[slot]
    if (!uid) return
    const gear = run.gear.find((item) => item.uid === uid)
    if (gear) sum += gear.bonus[attrKey] || 0
  })
  return sum
}

export function attrTotal(run, attrKey) {
  return run.player.attrs[attrKey] + gearBonus(run, attrKey)
}

export function effectiveAttr(run, attrKey) {
  return attrTotal(run, attrKey) + (run.player.mental < 30 ? -2 : 0)
}

function nightMod(run) {
  if (timeLabel(run) !== '深夜') return 0
  if (hasTrait(run, 'night')) return 1
  if (run.player.species === 'miner' || run.player.perks?.nightVision || calibrationEffects(run).nightEye) return 0
  return -1 + (run.player.perks?.nightPenalty || 0)
}

function traitBonus(run, kind) {
  let bonus = 0
  if (kind === 'gather') {
    if (hasTrait(run, 'nose')) bonus += 1
    if (run.player.skills?.includes('tracking')) bonus += 2
    bonus += run.player.perks?.gather || 0
  }
  if (kind === 'forge') {
    if (hasTrait(run, 'hands')) bonus += 1
    if (run.player.skills?.includes('mechanics')) bonus += 2
    bonus += run.player.perks?.craft || 0
  }
  if (kind === 'social') {
    if (hasTrait(run, 'dealer')) bonus += 1
    if (run.player.skills?.includes('empathy')) bonus += 2
    bonus += calibrationEffects(run).social || 0
  }
  return bonus
}

function roleGatherBonus(run) {
  return run.player.role === 'sentinel' ? 1 : 0
}

export function addItem(run, itemId, count = 1) {
  run.inv[itemId] = (run.inv[itemId] || 0) + count
}

export function takeItem(run, itemId, count = 1) {
  if ((run.inv[itemId] || 0) < count) return false
  run.inv[itemId] -= count
  if (run.inv[itemId] <= 0) delete run.inv[itemId]
  return true
}

export function hasMats(run, recipe) {
  return Object.keys(recipe.mats).every((itemId) => (run.inv[itemId] || 0) >= recipe.mats[itemId])
}

export function makeGear(run, key, quality) {
  const base = GEAR[key]
  const delta = quality === '精良' ? 1 : quality === '粗糙' ? -1 : 0
  const bonus = {}
  Object.keys(base.bonus).forEach((attrKey) => {
    bonus[attrKey] = Math.max(0, base.bonus[attrKey] + delta)
  })
  const tier = gearTierFor(key)
  return {
    uid: `g-${run.seed}-${run.gear.length + 1}`,
    key,
    name: base.name,
    slot: base.slot,
    setId: base.setId || null,
    tier,
    affixes: rollGearAffixes(run, key, quality, tier),
    upgradeLevel: 0,
    bonus,
    quality,
    note: base.note,
  }
}

export function createRun(draft, seedInput) {
  const seed = String(seedInput || makeSeed()).toUpperCase()
  const player = buildCharacter(draft)
  const map = generateRunMap(seed, player)
  const origin = ORIGINS[player.origin]

  const run = {
    version: 4,
    id: seed,
    seed,
    createdAt: Date.now(),
    player,
    deck: [...BASE_DECK],
    bossKills: {},
    stats: createStats(),
    achievementSeen: [],
    day: 1,
    ap: 8,
    apMax: 8,
    location: map.startId,
    act: 1,
    map,
    mapSeed: map.seed,
    defeats: 0,
    story: createStoryState(),
    city: createCityState(),
    door: createDoorState(),
    escorts: createEscortState(),
    ...createPromiseState(),
    dates: ensureDateState({}),
    ...createBlueprintState(),
    calibration: createCalibrationState(),
    ...createReputationState(),
    dungeon: { name: generateDungeonName({ seed, mapSeed: map.seed }), source: 'local', day: 1 },
    visited: [map.startId],
    cleared: [map.startId],
    nodeState: {},
    inv: { ...origin.items },
    gear: [],
    equipment: { weapon: null, head: null, body: null, hands: null, trinket: null },
    rollCount: 0,
    log: [],
    flags: {},
    npcChats: {},
    llm: { calls: 0, maxCalls: 120 },
    inbox: [],
    eventCooldowns: {},
    eventPity: {},
    quests: [],
    weekly: null,
    lastEventDay: 0,
  }

  Object.assign(run, createNpcWorld(run))

  addLog(run, `${player.name}，${ABOS[player.abo].name} · ${ROLES[player.role].name}。你在空港的检疫闸门醒来。`, 'story')
  addLog(run, '白塔仍然沉默。频道里只有一个重复的坐标。', 'story')
  return run
}

export function getNode(run, nodeId) {
  return run.map.nodes[nodeId] || null
}

export function currentNode(run) {
  return getNode(run, run.location)
}

export function isCleared(run, nodeId) {
  return run.cleared.includes(nodeId)
}

export function nodeRemaining(run, node) {
  if (!node || node.type !== 'gather') return 0
  const state = run.nodeState[node.id] || {}
  return Math.max(0, (node.charges || 1) - (state.taken || 0))
}

export function reachableNodes(run) {
  const current = currentNode(run)
  if (!current) return []
  return current.next.map((id) => getNode(run, id)).filter(Boolean)
}

export function travel(run, nodeId) {
  const node = getNode(run, nodeId)
  if (!node) return { ok: false, message: '目标不存在' }
  const current = currentNode(run)
  if (!current.next.includes(nodeId)) return { ok: false, message: '这条航线没有连通' }
  if (run.ap < 1) return { ok: false, message: '行动点不足，先扎营' }

  run.ap -= 1
  run.location = nodeId
  run.act = node.act
  if (!run.visited.includes(nodeId)) run.visited.push(nodeId)

  const region = REGIONS[node.region]
  const toll = region.danger >= 3 ? 4 : region.danger >= 2 ? 2 : 0
  if (toll && !run.cleared.includes(nodeId)) {
    run.player.mental = clamp(run.player.mental - toll, 0, run.player.mentalMax)
    addLog(run, `穿越 ${region.name} 的边界，精神稳定度 -${toll}。`, 'info')
  }
  addLog(run, `你抵达 ${node.title}。`, 'story')

  handleCollapse(run)

  return { ok: true, node }
}

function handleCollapse(run) {
  if (run.player.mental > 0) return false
  run.player.hp = Math.max(1, run.player.hp - 10)
  run.player.mental = Math.floor(run.player.mentalMax * 0.3)
  run.ap = run.apMax
  run.day += 1
  tickWorld(run)
  generateNpcEvents(run)
  addLog(run, '精神图景崩解。你在临时营地里醒来，耳鸣了很久。', 'bad')
  return true
}

function rollCheck(run, label, attrKey, dc, bonus = 0) {
  const rng = actionRng(run)
  const roll = 1 + Math.floor(rng.next() * 20)
  const attr = effectiveAttr(run, attrKey)
  const total = roll + attr + bonus
  const crit = roll === 20
  const fumble = roll === 1
  const success = crit || (!fumble && total >= dc)
  const bonusText = bonus ? (bonus > 0 ? ` +${bonus}` : ` ${bonus}`) : ''

  addLog(
    run,
    `${label}｜${ATTR_NAME[attrKey]} d20(${roll}) + ${attr}${bonusText} = ${total}｜DC ${dc} → ${success ? '成功' : '失败'}${crit ? '（大成功）' : fumble ? '（大失败）' : ''}`,
    success ? 'good' : 'bad'
  )

  return { roll, attr, total, crit, fumble, success, rng }
}

export function gather(run, nodeId) {
  const node = getNode(run, nodeId)
  if (!node || node.type !== 'gather') return { ok: false, message: '这里没有可采集的东西' }
  if (run.location !== nodeId) return { ok: false, message: '先抵达节点' }
  if (run.ap < 1) return { ok: false, message: '行动点不足' }
  if (nodeRemaining(run, node) <= 0) return { ok: false, message: '这个节点已经被采空' }

  run.ap -= 1
  const state = run.nodeState[nodeId] || { taken: 0 }
  state.taken += 1
  run.nodeState[nodeId] = state

  const bonus = traitBonus(run, 'gather') + roleGatherBonus(run) + nightMod(run)
  const check = rollCheck(run, `采集 · ${node.title}`, node.attr, node.dc, bonus)

  const rng = actionRng(run)
  const gains = {}
  if (check.success) {
    node.yields.forEach((yieldItem) => {
      const count = rng.int(yieldItem.qty[0], yieldItem.qty[1])
      gains[yieldItem.item] = (gains[yieldItem.item] || 0) + count
    })
    // 采集时偶尔会翻出一件没有属性、但适合送人的小东西。
    if (rng.chance(0.18)) {
      const gift = rng.pick(GIFT_KEYS)
      gains[gift] = (gains[gift] || 0) + 1
    }
  } else if (check.total >= node.dc - 3) {
    gains[node.yields[0].item] = 1
  }

  Object.keys(gains).forEach((itemId) => addItem(run, itemId, gains[itemId]))
  if (Object.keys(gains).length) {
    addLog(run, `获得 ${Object.keys(gains).map((itemId) => `${ITEMS[itemId].name} ×${gains[itemId]}`).join('、')}。`, 'good')
  } else {
    addLog(run, '只刮下一点尘土。', 'info')
  }

  const region = REGIONS[node.region]
  const cost = Math.max(
    0,
    region.danger -
      (hasTrait(run, 'calm') ? 1 : 0) -
      (run.player.perks?.calm || 0) -
      (calibrationEffects(run).travelMental || 0)
  )
  if (cost) {
    run.player.mental = clamp(run.player.mental - cost, 0, run.player.mentalMax)
    addLog(run, `精神稳定度 -${cost}。`, 'info')
  }
  handleCollapse(run)

  if (state.taken >= (node.charges || 1) && !run.cleared.includes(nodeId)) {
    run.cleared.push(nodeId)
  }
  if (run.cleared.includes(nodeId)) completeQuestsAt(run, nodeId)

  return { ok: true, gains, check, remaining: nodeRemaining(run, node) }
}

export function resolveEvent(run, nodeId) {
  const node = getNode(run, nodeId)
  if (!node || node.type !== 'event') return { ok: false, message: '这里没有事件' }
  if (run.location !== nodeId) return { ok: false, message: '先抵达节点' }
  if (isCleared(run, nodeId)) return { ok: false, message: '这里已经没什么了' }

  run.nodeState[nodeId] = { resolved: true }
  run.cleared.push(nodeId)
  completeQuestsAt(run, nodeId)
  addLog(run, node.event.text, 'story')

  if (node.event.reward.credits) {
    run.player.credits += node.event.reward.credits
    addLog(run, `获得 ${node.event.reward.credits} 信用点。`, 'good')
  }
  if (node.event.reward.mental) {
    run.player.mental = clamp(run.player.mental + node.event.reward.mental, 0, run.player.mentalMax)
    addLog(run, `精神稳定度 ${node.event.reward.mental}。`, node.event.reward.mental > 0 ? 'good' : 'bad')
  }
  return { ok: true }
}

function applyEventOutcome(run, outcome, success) {
  if (!outcome) return
  if (outcome.credits) {
    run.player.credits = Math.max(0, run.player.credits + outcome.credits)
  }
  if (outcome.mental) {
    run.player.mental = clamp(run.player.mental + outcome.mental, 0, run.player.mentalMax)
  }
  if (outcome.hp) {
    run.player.hp = clamp(run.player.hp + outcome.hp, 1, run.player.hpMax)
  }
  if (outcome.itemKey) {
    addItem(run, outcome.itemKey, outcome.itemCount || 1)
  }
  if (outcome.flag) {
    run.flags[outcome.flag] = (run.flags[outcome.flag] || 0) + 1
  }
  if (outcome.text) {
    addLog(run, outcome.text, success === false ? 'bad' : success === true ? 'good' : 'story')
  }
}

export function resolveEventChoice(run, nodeId, choiceId) {
  const node = getNode(run, nodeId)
  if (!node || node.type !== 'event') return { ok: false, message: '这里没有事件' }
  if (run.location !== nodeId) return { ok: false, message: '先抵达节点' }
  if (isCleared(run, nodeId)) return { ok: false, message: '这里已经没什么了' }
  if (!node.event?.choices) return resolveEvent(run, nodeId)

  const choice = node.event.choices.find((item) => item.id === choiceId)
  if (!choice) return { ok: false, message: '没有这个选项' }

  let outcome = choice.outcome || choice.success
  let success = null

  if (choice.attr) {
    const skillBonus = choice.skill && run.player.skills?.includes(choice.skill) ? 2 : 0
    const check = rollCheck(run, `事件 · ${node.event.title} · ${choice.label}`, choice.attr, choice.dc, skillBonus)
    success = check.success
    outcome = check.success ? choice.success : choice.failure
  }

  applyEventOutcome(run, outcome, success)
  run.nodeState[nodeId] = {
    resolved: true,
    choice: choiceId,
    success,
    text: outcome?.text || '',
  }
  if (!run.cleared.includes(nodeId)) run.cleared.push(nodeId)
  completeQuestsAt(run, nodeId)
  handleCollapse(run)

  return {
    ok: true,
    success,
    text: outcome?.text || '',
    choice: choiceId,
  }
}

export function shopPrice(run, offer) {
  const discount = (run.player.skills?.includes('barter') ? 0.1 : 0) +
    (run.player.perks?.barter || 0) +
    (calibrationEffects(run).discount || 0)
  const markup = run.player.perks?.price || 0
  return Math.max(1, Math.round((offer?.price || 0) * (1 - discount + markup)))
}

export function buyShop(run, nodeId, index) {
  const node = getNode(run, nodeId)
  if (!node || node.type !== 'shop') return { ok: false, message: '这里不是交易点' }
  if (run.location !== nodeId) return { ok: false, message: '先抵达节点' }
  if (isCleared(run, nodeId)) return { ok: false, message: '摊位已经收起来了' }

  const raw = node.stock?.[index]
  if (!raw) return { ok: false, message: '没有这件商品' }
  const offer = typeof raw === 'string'
    ? { kind: 'item', key: raw, price: 30, stock: 1 }
    : raw
  if (offer.stock <= 0) return { ok: false, message: '已经卖完了' }
  const price = shopPrice(run, offer)
  if (run.player.credits < price) return { ok: false, message: '信用点不足' }

  run.player.credits -= price
  if (offer.kind === 'gear') {
    const gear = makeGear(run, offer.key, offer.quality || '标准')
    run.gear.push(gear)
    if (!run.equipment[gear.slot]) run.equipment[gear.slot] = gear.uid
    addLog(run, `买下 ${gear.name}（${gear.quality}）。`, 'good')
  } else {
    addItem(run, offer.key, 1)
    addLog(run, `买下 ${ITEMS[offer.key].name}。`, 'good')
  }

  if (typeof raw === 'string') {
    node.stock[index] = { ...offer, stock: 0 }
  } else {
    raw.stock -= 1
  }

  return { ok: true, offer }
}

export function restAtNode(run, nodeId) {
  const node = getNode(run, nodeId)
  if (!node || node.type !== 'rest') return { ok: false, message: '这里不能休整' }
  if (run.location !== nodeId) return { ok: false, message: '先抵达节点' }
  if (isCleared(run, nodeId)) return { ok: false, message: '已经休息过了' }

  run.nodeState[nodeId] = { resolved: true }
  run.cleared.push(nodeId)
  run.player.hp = clamp(run.player.hp + node.heal, 0, run.player.hpMax)
  run.player.mental = clamp(run.player.mental + node.mental, 0, run.player.mentalMax)
  addLog(run, '你在这里休息了一会儿。附近的线路安静下来。', 'good')
  return { ok: true }
}

/** 战败不是死局：被拖回空港，第二天换一张星图重新出发。 */
export function retreatAfterDefeat(run) {
  if (!run) return { ok: false, message: '没有远征记录' }
  run.defeats = (run.defeats || 0) + 1
  run.day += 1
  run.ap = run.apMax
  run.player.hp = Math.max(1, Math.ceil(run.player.hpMax * 0.65))
  run.player.mental = Math.max(1, Math.ceil(run.player.mentalMax * 0.65))

  const mapSeed = `${run.seed}:RETREAT:${run.day}:${run.defeats}`
  const map = generateRunMap(mapSeed, run.player)
  run.map = map
  run.mapSeed = mapSeed
  resetDungeon(run)
  run.location = map.startId
  run.act = 1
  run.visited = [map.startId]
  run.cleared = [map.startId]
  run.nodeState = {}
  run.battle = null
  run.pendingAmbush = null

  run.quests = (run.quests || []).map((quest) => (
    quest.status === 'active'
      ? { ...quest, status: 'failed', completedDay: run.day, result: '星图重排，约定失效' }
      : quest
  ))
  run.inbox = (run.inbox || []).map((event) => (
    event.status === 'pending' && event.type === 'quest'
      ? { ...event, status: 'expired', resolvedDay: run.day, result: '星图重排，邀约失效' }
      : event
  ))

  tickWorld(run)
  generateNpcEvents(run)
  addLog(run, '你被拖回空港。第二天醒来，星图已经重排。', 'bad')
  return { ok: true, day: run.day, mapSeed }
}

export function camp(run) {
  if (run.ap > 0) return { ok: false, message: '还有行动点，不必扎营' }
  run.day += 1
  run.ap = run.apMax
  run.player.hp = clamp(run.player.hp + Math.ceil(run.player.hpMax * 0.25), 0, run.player.hpMax)
  run.player.mental = clamp(run.player.mental + 20, 0, run.player.mentalMax)
  tickWorld(run)
  generateNpcEvents(run)
  addLog(run, '你在节点旁扎营。睡得很浅，但足够继续。', 'story')
  return { ok: true }
}

/** Phase 3 之前：战斗 / 交易节点允许绕开，保证地图可以推进。 */
export function skipNode(run, nodeId) {
  const node = getNode(run, nodeId)
  if (!node) return { ok: false, message: '目标不存在' }
  if (run.location !== nodeId) return { ok: false, message: '先抵达节点' }
  if (node.type === 'boss') return { ok: false, message: '首领无法绕开' }
  if (isCleared(run, nodeId)) return { ok: false, message: '已经处理过了' }
  run.nodeState[nodeId] = { resolved: true, skipped: true }
  run.cleared.push(nodeId)
  completeQuestsAt(run, nodeId)
  addLog(run, `你避开了 ${node.title}，没有留下痕迹。`, 'info')
  return { ok: true }
}

function checkQuality(total, dc, crit) {
  const margin = total - dc
  if (crit || margin >= 6) return '精良'
  if (margin >= 2) return '标准'
  return '粗糙'
}

export function craft(run, recipeId) {
  const recipe = RECIPES.find((item) => item.id === recipeId)
  if (!recipe) return { ok: false, message: '没有这个配方' }
  if (!recipeKnown(run, recipeId)) return { ok: false, message: '还没有掌握这张图纸' }
  if (run.ap < 1) return { ok: false, message: '行动点不足' }
  if (!hasMats(run, recipe)) return { ok: false, message: '材料不足' }

  run.ap -= 1
  Object.keys(recipe.mats).forEach((itemId) => takeItem(run, itemId, recipe.mats[itemId]))

  const check = rollCheck(run, `锻造 · ${recipe.name}`, 'tec', recipe.dc, traitBonus(run, 'forge') + nightMod(run))
  if (!check.success) {
    addLog(run, '淬火失败，材料在炉里耗尽了。', 'bad')
    return { ok: false, message: '锻造失败', check }
  }

  const quality = checkQuality(check.total, recipe.dc, check.crit)
  if (recipe.type === 'use') {
    addItem(run, recipe.out, recipe.qty || 1)
    addLog(run, `锻造成功：${ITEMS[recipe.out].name} ×${recipe.qty || 1}（${quality}）。`, 'good')
  } else {
    const gear = makeGear(run, recipe.out, quality)
    run.gear.push(gear)
    if (!run.equipment[gear.slot]) run.equipment[gear.slot] = gear.uid
    addLog(run, `锻造成功：${gear.name}（${quality}）。`, 'good')
  }
  return { ok: true, quality, check }
}

export function toggleEquip(run, uid) {
  const gear = run.gear.find((item) => item.uid === uid)
  if (!gear) return
  run.equipment[gear.slot] = run.equipment[gear.slot] === uid ? null : uid
}

export function applyConsumable(run, itemId, itemDef) {
  if (!takeItem(run, itemId, 1)) return { ok: false, message: '没有这个物品' }
  const effect = itemDef.effect || {}
  const multiplier = 1 + (run.player.perks?.consume || 0)
  const healingBonus = calibrationEffects(run).healing || 0
  const changes = { hp: 0, mental: 0 }
  if (effect.hp) {
    const before = run.player.hp
    const heal = Math.round(effect.hp * multiplier + healingBonus)
    run.player.hp = clamp(run.player.hp + heal, 0, run.player.hpMax)
    changes.hp = Math.round(run.player.hp - before)
  }
  if (effect.mental) {
    const before = run.player.mental
    const heal = Math.round(effect.mental * multiplier + healingBonus)
    run.player.mental = clamp(run.player.mental + heal, 0, run.player.mentalMax)
    changes.mental = Math.round(run.player.mental - before)
  }
  const parts = []
  if (changes.hp) parts.push(`生命 ${changes.hp > 0 ? '+' : ''}${changes.hp}`)
  if (changes.mental) parts.push(`精神 ${changes.mental > 0 ? '+' : ''}${changes.mental}`)
  addLog(run, `使用 ${itemDef.name}：${parts.length ? parts.join('，') : '状态已满'}。`, 'good')
  return { ok: true, changes }
}
