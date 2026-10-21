/**
 * 星区档案：统计默认值、16 条成就条件与去重。
 */

import { randomDraft } from '../src/game-core/character.js'
import { createRun } from '../src/game-core/run.js'
import {
  ACHIEVEMENTS,
  ACHIEVEMENT_CATEGORIES,
  checkAchievements,
  ensureStats,
} from '../src/game-core/achievements.js'

const errors = []
const check = (condition, label) => { if (!condition) errors.push(label) }

const run = createRun(randomDraft(), 'ACHIEVEMENT-TEST')
check(ACHIEVEMENTS.length === 16, '成就数量不是 16')
check(Object.keys(ACHIEVEMENT_CATEGORIES).length === 4, '成就分类不是 4 类')
check(ensureStats(run).battlesWon === 0, '初始统计不为 0')

let unlocked = checkAchievements(run)
check(unlocked.length === 0, '初始不应解锁成就')

run.stats.elites = 1
unlocked = checkAchievements(run)
check(unlocked.some((item) => item.id === 'first_elite'), '精英成就没有解锁')
check(unlocked.filter((item) => item.id === 'first_elite').length === 1, '成就重复返回')
check(checkAchievements(run).length === 0, '已解锁成就没有去重')

run.stats.battlesWon = 1
run.stats.bosses = 1
run.stats.bossPhaseWins = 1
run.stats.noCompanionBoss = 1
run.stats.bossIntelWins = 1
run.stats.lowMentalWins = 1
run.stats.noGearElite = 1
run.stats.dates = 1
run.stats.reconciles = 1
run.stats.promisesKept = 1
run.stats.citiesVisited = ['dock', 'outpost']
run.cities = {
  dock: { npcIds: Array.from({ length: 20 }, (_, index) => `npc-${index}`) },
  outpost: { npcIds: Array.from({ length: 14 }, (_, index) => `npc-${20 + index}`) },
}
run.deck = ['strike+', 'guard+']
const all = checkAchievements(run)
check(all.length >= 10, '批量成就解锁数量不足')
check(all.some((item) => item.id === 'all_upgraded'), '全升级成就没有解锁')
check(all.some((item) => item.id === 'second_city'), '第二城市成就没有解锁')
check(all.some((item) => item.id === 'population_30'), '人口成就没有解锁')
check(all.some((item) => item.id === 'boss_phase'), '阶段首领成就没有解锁')

run.stats.citiesVisited = ['dock']
run.deck = ['strike', 'guard']
run.stats.battlesWon = 1
run.achievementSeen = []
const small = checkAchievements(run)
check(small.some((item) => item.id === 'small_deck'), '小牌组成就没有解锁')

const oldRun = { npcs: {}, deck: [] }
ensureStats(oldRun)
check(oldRun.stats && Array.isArray(oldRun.stats.citiesVisited) && Array.isArray(oldRun.achievementSeen), '旧存档没有补统计字段')

console.log(JSON.stringify({
  ok: errors.length === 0,
  total: ACHIEVEMENTS.length,
  unlocked: all.map((item) => item.id),
  errors,
}, null, 2))

if (errors.length) process.exit(1)
