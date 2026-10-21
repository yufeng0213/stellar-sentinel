/**
 * 城市控制方：市场、巡逻、任务倾向与 NPC 态度。
 */

import { randomDraft } from '../src/game-core/character.js'
import { createRun } from '../src/game-core/run.js'
import { cityDevelopmentEffects } from '../src/game-core/city-development.js'
import {
  applyControlAttitudes,
  CITY_CONTROL_INFO,
  cityControlInfo,
} from '../src/game-core/city-control.js'

const errors = []
const check = (condition, label) => { if (!condition) errors.push(label) }

const run = createRun(randomDraft(), 'CITY-CONTROL-TEST')
run.activeCityId = 'dock'
run.city.controlledBy = 'market'
check(cityDevelopmentEffects(run).marketStock >= 2, '黑市控制没有增加市场库存')
check(cityControlInfo('market')?.preferredQuest === 'deliver', '黑市控制没有任务倾向')
check(CITY_CONTROL_INFO.tower.effects.patrol === 1, '白塔控制没有巡逻')

run.city.controlledBy = 'tower'
check(cityDevelopmentEffects(run).patrol >= 1, '白塔控制没有生成巡逻')
check(cityDevelopmentEffects(run).intelDiscount >= 10, '白塔控制没有情报折扣')

const residents = Object.values(run.npcs).filter((npc) => npc.alive && npc.active !== false)
const marketNpc = residents.find((npc) => npc.faction === 'market')
const towerNpc = residents.find((npc) => npc.faction === 'tower')
if (marketNpc) marketNpc.cityId = 'dock'
if (towerNpc) towerNpc.cityId = 'dock'
const marketTrust = marketNpc?.relation.trust || 0
const towerTrust = towerNpc?.relation.trust || 0
const attitudes = applyControlAttitudes(run, 'dock', 'market')
check(attitudes.supporters.length > 0, '控制方没有支持者')
check(marketNpc && marketNpc.relation.trust >= marketTrust, '同派系 NPC 信任没有变化')
check(towerNpc && towerNpc.relation.trust <= towerTrust, '敌对 NPC 信任没有下降')
check(run.city.controlAttitudes?.control === 'market', '城市没有记录 NPC 态度')

console.log(JSON.stringify({
  ok: errors.length === 0,
  supporters: attitudes.supporters.length,
  opponents: attitudes.opponents.length,
  errors,
}, null, 2))

if (errors.length) process.exit(1)
