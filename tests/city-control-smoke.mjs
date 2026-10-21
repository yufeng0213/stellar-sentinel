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
import {
  controlReactionStatuses,
  resolveControlReactionEvent,
} from '../src/game-core/control-reactions.js'

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
check(attitudes.avengers.length > 0, '高攻击性 NPC 没有报复反应')
run.player.credits = 500
run.day = 2
const revengeEvent = controlReactionStatuses(run).find((event) => event.type === 'revenge')
check(!!revengeEvent, '报复没有生成后续事件')
if (revengeEvent) {
  const revengeResult = resolveControlReactionEvent(run, revengeEvent.id, 'pay')
  check(revengeResult.ok, '报复后续处理失败')
  check(run.pendingAmbush === null, '报复后续没有解除伏击')
}

const defectRun = createRun(randomDraft(), 'CITY-CONTROL-DEFECT-TEST')
const defector = Object.values(defectRun.npcs).find((npc) => npc.alive && npc.faction === 'tower')
if (defector) {
  defector.cityId = 'dock'
  defector.relation.trust = 60
  defector.relation.grievance = 0
  defector.personality.aggression = 10
  defector.personality.loyalty = 20
  const defectAttitudes = applyControlAttitudes(defectRun, 'dock', 'market')
  check(defectAttitudes.defectors.includes(defector.name), '高信任 NPC 没有投靠')
  defectRun.day = 3
  const defectEvent = controlReactionStatuses(defectRun).find((event) => event.type === 'defect')
  check(!!defectEvent, '投靠没有生成后续事件')
  if (defectEvent) check(resolveControlReactionEvent(defectRun, defectEvent.id, 'trust').ok, '投靠后续处理失败')
}

const leaveRun = createRun(randomDraft(), 'CITY-CONTROL-LEAVE-TEST')
const leaver = Object.values(leaveRun.npcs).find((npc) => npc.alive && npc.faction === 'tower')
if (leaver) {
  leaver.cityId = 'dock'
  leaver.relation.trust = 0
  leaver.relation.grievance = 0
  leaver.personality.aggression = 10
  leaver.personality.loyalty = 20
  const leaveAttitudes = applyControlAttitudes(leaveRun, 'dock', 'market')
  check(leaveAttitudes.leavers.includes(leaver.name), '低信任 NPC 没有离开')
  check(leaver.active === false, '离开的 NPC 没有退出城市')
  leaveRun.day = 4
  const leaveEvent = controlReactionStatuses(leaveRun).find((event) => event.type === 'leave')
  check(!!leaveEvent, '离开没有生成后续事件')
  if (leaveEvent) {
    const invite = resolveControlReactionEvent(leaveRun, leaveEvent.id, 'invite')
    check(invite.ok && leaver.active === true, '请回离开 NPC 失败')
  }
}

console.log(JSON.stringify({
  ok: errors.length === 0,
  supporters: attitudes.supporters.length,
  opponents: attitudes.opponents.length,
  errors,
}, null, 2))

if (errors.length) process.exit(1)
