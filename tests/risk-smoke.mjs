/**
 * 高危节点：地图风险、敌人强化、额外奖励与卡牌奖励。
 */

import { randomDraft } from '../src/game-core/character.js'
import { createRun } from '../src/game-core/run.js'
import { NODE_RISKS } from '../src/game-core/data.js'
import { createBattle, resolveBattle } from '../src/game-core/combat.js'

const errors = []
const check = (condition, label) => { if (!condition) errors.push(label) }

const run = createRun(randomDraft(), 'RISK-TEST')
const node = Object.values(run.map.nodes).find((item) => item.type === 'battle' || item.type === 'elite')
check(!!node, '没有战斗节点')
if (!node) {
  console.log(JSON.stringify({ ok: false, errors }))
  process.exit(1)
}

node.risk = { ...NODE_RISKS.patrol }
const battle = createBattle(run, node)
const enemy = battle.enemies[0]
check(battle.risk?.id === 'patrol', '战斗没有记录风险')
check(enemy.attack >= (node.enemy.attack + NODE_RISKS.patrol.enemyAttack), '高危敌人攻击没有提高')
check(battle.enemies.length >= 2, '高危巡逻没有额外敌人')

const beforeCredits = run.player.credits
const beforeScrap = run.inv.scrap || 0
battle.status = 'won'
battle.enemies.forEach((item) => { item.downed = true })
const result = resolveBattle(run, battle, 'disarm')
check(result.ok, '高危战斗结算失败')
check(run.player.credits >= beforeCredits + NODE_RISKS.patrol.credits, '高危额外信用点没有发放')
check((run.inv.scrap || 0) >= beforeScrap + 1, '高危额外废料没有发放')
check(result.reward.text.includes('高危'), '高危结算没有提示')

const cacheRun = createRun(randomDraft(), 'RISK-CACHE')
const cacheNode = Object.values(cacheRun.map.nodes).find((item) => item.type === 'battle' || item.type === 'elite')
cacheNode.risk = { ...NODE_RISKS.cache }
const cacheBattle = createBattle(cacheRun, cacheNode)
cacheBattle.status = 'won'
cacheBattle.enemies.forEach((item) => { item.downed = true })
const cacheResult = resolveBattle(cacheRun, cacheBattle, 'disarm')
check(cacheResult.ok, '遗存富集结算失败')
check(cacheResult.reward.cardChoices.length === 4, '遗存富集没有提供四选一')

console.log(JSON.stringify({
  ok: errors.length === 0,
  attack: enemy.attack,
  enemies: battle.enemies.length,
  reward: result.reward.credits,
  cards: cacheResult.reward.cardChoices.length,
  errors,
}, null, 2))

if (errors.length) process.exit(1)
