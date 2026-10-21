/**
 * Boss 多阶段与情报：阶段阈值、弱点/抗性、黑市情报与首杀/重复奖励。
 */

import { randomDraft } from '../src/game-core/character.js'
import { createRun } from '../src/game-core/run.js'
import { createBattle, applyBossPhase, resolveBattle } from '../src/game-core/combat.js'
import { buyBlackMarketIntel } from '../src/game-core/city.js'

const errors = []
const check = (condition, label) => { if (!condition) errors.push(label) }

const run = createRun(randomDraft(), 'BOSS-TEST')
const bossNode = Object.values(run.map.nodes).find((node) => node.type === 'boss')
check(!!bossNode, '没有 Boss 节点')
check(!!bossNode?.enemy?.bossId, 'Boss 没有档案 ID')
check(bossNode?.enemy?.phases?.length >= 2, 'Boss 没有多阶段数据')
check(!!bossNode?.enemy?.weakness && !!bossNode?.enemy?.resistance, 'Boss 缺少弱点或抗性')

const battle = createBattle(run, bossNode)
const boss = battle.enemies[0]
check(boss.phase === 0, 'Boss 初始阶段错误')
const beforeAttack = boss.attack
const beforeArmor = boss.armor
const beforeGuard = boss.guard
boss.hp = Math.floor(boss.hpMax * 0.6)
const changed = applyBossPhase(battle, boss)
check(changed && boss.phase > 0, 'Boss 没有进入下一阶段')
check(boss.attack > beforeAttack || boss.armor > beforeArmor || boss.guard > beforeGuard, 'Boss 阶段切换没有强化')
check(battle.log.some((entry) => entry.text.includes('阶段') || entry.text.includes('外壳') || entry.text.includes('回声') || entry.text.includes('装甲')), '阶段切换没有战斗日志')

run.player.credits = 200
const intel = buyBlackMarketIntel(run)
check(intel.ok, '黑市情报购买失败')
check(run.story.flags.bossIntel === true, '黑市情报没有标记 Boss 情报')
check(run.story.flags.bossWeakness === bossNode.enemy.weakness, '情报弱点与 Boss 不一致')
check(run.story.flags.bossPhases.length === bossNode.enemy.phases.length, '情报没有记录 Boss 阶段')

const rewardBattle = createBattle(run, bossNode)
rewardBattle.status = 'won'
rewardBattle.enemies.forEach((enemy) => { enemy.downed = true })
const first = resolveBattle(run, rewardBattle, 'disarm')
check(first.ok, 'Boss 首杀结算失败')
check(first.reward.bossRecord?.first === true, '首杀没有标记 first')
check(run.bossKills[bossNode.id] === 1, '首杀计数错误')

rewardBattle.status = 'won'
const repeat = resolveBattle(run, rewardBattle, 'disarm')
check(repeat.ok, 'Boss 重复结算失败')
check(repeat.reward.bossRecord?.first === false, '重复击杀仍被标记为首杀')
check(run.bossKills[bossNode.id] === 2, '重复击杀计数错误')

console.log(JSON.stringify({
  ok: errors.length === 0,
  boss: bossNode.enemy.name,
  weakness: bossNode.enemy.weakness,
  resistance: bossNode.enemy.resistance,
  phases: bossNode.enemy.phases.length,
  intel: run.story.flags.bossPhases,
  first: first.reward.bossRecord,
  repeat: repeat.reward.bossRecord,
  errors,
}, null, 2))

if (errors.length) process.exit(1)
