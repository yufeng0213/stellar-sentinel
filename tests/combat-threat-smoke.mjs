/**
 * 战斗压力：幕数、连胜、循环、敌人缩放与回合压力。
 */

import { randomDraft } from '../src/game-core/character.js'
import { combatThreat, scaleEnemiesForThreat } from '../src/game-core/combat-difficulty.js'
import { createBattle, endTurn } from '../src/game-core/combat.js'
import { createRun } from '../src/game-core/run.js'

const errors = []
const check = (condition, label) => { if (!condition) errors.push(label) }

const run = createRun(randomDraft(), 'COMBAT-THREAT-TEST')
const node = Object.values(run.map.nodes).find((item) => item.type === 'battle' || item.type === 'elite')
if (node) {
  const low = combatThreat(run, { ...node, act: 1 })
  const high = combatThreat(run, { ...node, act: 3 })
  check(high.score > low.score, '高幕数没有提高战斗压力')
  run.stats.battlesWon = 20
  const winThreat = combatThreat(run, { ...node, act: 1 })
  check(winThreat.score > low.score, '连胜没有提高战斗压力')
  run.mapCycle = 2
  check(combatThreat(run, { ...node, act: 1 }).score >= winThreat.score, '地图循环没有提高战斗压力')
  run.mapCycle = 0
  run.stats.battlesWon = 0

  const enemies = scaleEnemiesForThreat(
    [{ hp: 20, hpMax: 20, attack: 5 }],
    { hpScale: 1.5, attackBonus: 2 }
  )
  check(enemies[0].hpMax === 30 && enemies[0].attack === 7, '敌人缩放不正确')

  const battle = createBattle(run, { ...node, id: `${node.id}-threat`, act: 3 })
  check(battle.threat?.score > 0, '战斗没有记录压力')
  check(battle.enemies[0].hpMax >= node.enemy.hp, '战斗敌人没有按压力缩放')
}

const pressureRun = createRun(randomDraft(), 'COMBAT-PRESSURE-TEST')
const pressureNode = Object.values(pressureRun.map.nodes).find((item) => item.type === 'battle')
if (pressureNode) {
  const battle = createBattle(pressureRun, { ...pressureNode, id: 'pressure-node', act: 1 })
  battle.round = 7
  battle.enemies = [battle.enemies[0]]
  battle.enemies[0].intent = { type: 'attack', value: 5 }
  battle.guard = 0
  pressureRun.player.hp = 100
  pressureRun.player.hpMax = 100
  endTurn(battle, pressureRun)
  check(pressureRun.player.hp <= 93, '长回合没有施加战斗压力')
}

console.log(JSON.stringify({ ok: errors.length === 0, errors }, null, 2))
if (errors.length) process.exit(1)
