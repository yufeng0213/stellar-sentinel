/**
 * 第二城市节点：地图城市、独立本地人口、市场与访客。
 */

import { randomDraft } from '../src/game-core/character.js'
import { createRun } from '../src/game-core/run.js'
import {
  cityPopulation,
  cityVisitors,
  ensureCity,
  enterCityNode,
  switchCity,
} from '../src/game-core/city.js'

const errors = []
const check = (condition, label) => { if (!condition) errors.push(label) }

const run = createRun(randomDraft(), 'CITY-NODE-TEST')
const cityNode = Object.values(run.map.nodes).find((node) => node.type === 'city')
check(!!cityNode, '地图没有生成城市节点')
check(cityNode?.cityId === 'outpost', '城市节点没有 cityId')

const before = Object.keys(run.npcs).length
const result = enterCityNode(run, cityNode.id)
check(result.ok, '进入城市节点失败')
check(run.activeCityId === 'outpost', '没有切换到第二城市')
check(run.cities.outpost?.name === '矿脉站', '第二城市名称错误')
check(run.cities.outpost?.npcIds.length === 14, '第二城市本地人口不是 14')
check(Object.keys(run.npcs).length >= before + 14, '第二城市没有生成本地 NPC')
check(cityVisitors(run).length === 3, '第二城市没有访客')
check(run.city.market.length >= 5, '第二城市没有独立市场')
check(cityPopulation(run, 'dock').total === 20, '空港人口池没有保留')
check(run.cityStates.dock && run.cityStates.outpost, '城市状态没有分城市保存')

const back = switchCity(run, 'dock')
check(back.ok && run.activeCityId === 'dock', '没有切回空港')
check(cityPopulation(run, 'dock').total === 20, '切回空港后人口池错误')
check(run.city.market.length >= 5, '切回空港后市场状态错误')

console.log(JSON.stringify({
  ok: errors.length === 0,
  city: run.cities.outpost.name,
  population: run.cities.outpost.npcIds.length,
  visitors: cityVisitors(run).length,
  npm: Object.keys(run.npcs).length,
  errors,
}, null, 2))

if (errors.length) process.exit(1)
