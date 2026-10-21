/**
 * 城市长期发展：设施升级、派系项目、影响力与效果。
 */

import { randomDraft } from '../src/game-core/character.js'
import { createRun } from '../src/game-core/run.js'
import { ensureCity } from '../src/game-core/city.js'
import {
  CITY_PROJECTS,
  cityDevelopmentEffects,
  cityInfluence,
  completeCityProject,
  ensureCityDevelopment,
  facilityStatuses,
  projectStatuses,
  upgradeCityFacility,
} from '../src/game-core/city-development.js'

const errors = []
const check = (condition, label) => { if (!condition) errors.push(label) }

const run = createRun(randomDraft(), 'CITY-LONG-TEST')
run.player.credits = 500
run.inv.scrap = 20
const city = ensureCity(run)
ensureCityDevelopment(city)
check(facilityStatuses(run).length === 4, '城市设施不是 4 项')
check(projectStatuses(run).length === 4, '城市项目不是 4 个')

const upgrade = upgradeCityFacility(run, 'dock', 'clinic')
check(upgrade.ok && city.upgrades.clinic === 1, '诊所升级失败')
check(cityDevelopmentEffects(run).healPct === 0.1, '诊所效果没有生效')
check(city.playerCredits !== undefined || run.player.credits < 500, '升级没有扣信用点')

const marketUpgrade = upgradeCityFacility(run, 'dock', 'market')
check(marketUpgrade.ok && city.upgrades.market === 1, '市场升级失败')
check(cityDevelopmentEffects(run).marketDiscount >= 0.03, '市场价格效果没有生效')

run.reputation.tower = 30
run.inv.chip = 1
run.player.credits = 500
const completed = completeCityProject(run, 'dock', 'tower_beacon')
check(completed.ok, '白塔信标项目失败')
check(city.projects.tower_beacon === true, '项目完成状态没有写入')
check(city.influence.tower >= 20, '项目没有提升派系影响力')
check(cityDevelopmentEffects(run).intelDiscount >= 20, '项目效果没有生效')
check(cityInfluence(run).some((item) => item.faction === 'tower' && item.projectDone), '影响力列表没有项目状态')

const second = completeCityProject(run, 'dock', 'tower_beacon')
check(!second.ok, '项目可以重复完成')
const project = CITY_PROJECTS.tower_beacon
check(project.cost.item === 'chip' && project.cost.count === 1, '项目成本定义错误')

console.log(JSON.stringify({
  ok: errors.length === 0,
  clinic: city.upgrades.clinic,
  market: city.upgrades.market,
  project: city.projects.tower_beacon,
  effects: cityDevelopmentEffects(run),
  influence: cityInfluence(run),
  errors,
}, null, 2))

if (errors.length) process.exit(1)
