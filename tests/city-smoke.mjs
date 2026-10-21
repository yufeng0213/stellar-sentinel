/**
 * 空港城市：市场、诊所、酒馆访客刷新与存档。
 */

import { randomDraft } from '../src/game-core/character.js'
import { createRun } from '../src/game-core/run.js'
import {
  buyCityOffer,
  cityPopulation,
  cityVisitors,
  createCityState,
  ensureCity,
  healAtClinic,
  refreshCityVisitors,
} from '../src/game-core/city.js'
import { npcList } from '../src/game-core/npc.js'
import { validateRun } from '../src/game/save.js'

const errors = []
const check = (condition, label) => { if (!condition) errors.push(label) }

const run = createRun(randomDraft(), 'CITY-TEST')
run.player.credits = 300
const city = ensureCity(run)
check(city.market.length >= 5, '市场没有生成足够的商品')
check(city.clinic.length === 3, '诊所没有生成 3 件药品')
check(city.visitorIds.length === 3, '酒馆没有生成 3 位访客')
check(cityVisitors(run).length === 3, '访客列表不一致')
check(city.market.some((offer) => offer.key === 'wine'), '市场没有酒')
check(run.npcs[city.visitorIds[0]]?.visitor === true, '访客没有标记 visitor')
check(npcList(run).some((npc) => npc.id === city.visitorIds[0]), '访客没有进入名册')
check(cityPopulation(run, 'dock').total === 20, '空港本地人口不是 20')
const populationBeforeRefresh = Object.keys(run.npcs).length

const wineIndex = city.market.findIndex((offer) => offer.key === 'wine')
const wine = city.market[wineIndex]
const beforeCredits = run.player.credits
const bought = buyCityOffer(run, 'market', wineIndex)
check(bought.ok, '买酒失败')
check(bought.key === 'wine', '买到的不是酒')
check(run.player.credits === beforeCredits - bought.price, '购买没有扣信用点')
check((run.inv.wine || 0) === 1, '酒没有进背包')
check(wine.stock === 5, '库存没有减少')

const oldVisitors = [...city.visitorIds]
const refresh = refreshCityVisitors(run)
check(refresh.ok, '刷新访客失败')
check(city.visitorIds.length === 3, '刷新后访客数量不对')
check(city.visitorIds.every((id) => !oldVisitors.includes(id)), '刷新后仍是旧访客')
check(oldVisitors.every((id) => run.npcs[id].active === false), '旧访客没有离开')
check(city.refreshCount === 1, '刷新次数没有增加')
check(Object.keys(run.npcs).length === populationBeforeRefresh, '刷新访客又生成了新 NPC')
check(cityPopulation(run, 'dock').visitors === 3, '人口池访客数量错误')

run.player.hp = 10
const hpBefore = run.player.hp
const healed = healAtClinic(run)
check(healed.ok, '诊所治疗失败')
check(run.player.hp > hpBefore, '治疗没有恢复生命')
check(!healAtClinic(run).ok, '同一天可以重复治疗')

const imported = validateRun(JSON.parse(JSON.stringify(run)))
check(imported.ok, '城市存档校验失败')
check(imported.run.city?.visitorIds.length === 3, '存档没有保留访客')
check(imported.run.city?.market.length >= 5, '存档没有保留市场')

const fresh = createRun(randomDraft(), 'CITY-TEST-2')
check(fresh.city?.market?.length === 0, '城市应该按需初始化')
const first = ensureCity(fresh)
const keysA = first.market.map((offer) => offer.key).join('|')
const fresh2 = createRun(randomDraft(), 'CITY-TEST-2')
const first2 = ensureCity(fresh2)
const keysB = first2.market.map((offer) => offer.key).join('|')
check(keysA === keysB, '同 seed 市场货架不一致')
check(typeof createCityState().refreshCount === 'number', '城市初始状态不完整')

if (errors.length) {
  console.error('FAILED')
  errors.forEach((error) => console.error(' -', error))
  process.exit(1)
}

console.log(JSON.stringify({
  ok: true,
  market: city.market.length,
  clinic: city.clinic.length,
  visitors: city.visitorIds.length,
  refreshCount: city.refreshCount,
  credits: run.player.credits,
}, null, 2))
