/**
 * 战斗冒烟测试：出牌、回合推进、胜负、撤离、处置与确定性。
 * 运行：npm run test:combat
 */

import { newDraft } from '../src/game-core/character.js'
import { CARDS, createBattle, endTurn, fleeBattle, playCard, resolveBattle } from '../src/game-core/combat.js'
import { createRun } from '../src/game-core/run.js'

const errors = []
const check = (condition, label) => { if (!condition) errors.push(label) }

function draft() {
  const d = newDraft()
  d.name = '战斗测试'
  d.abo = 'beta'
  d.role = 'sentinel'
  d.origin = 'broker'
  d.attrs = { per: 6, vit: 7, psi: 6, tec: 5, soc: 6, wil: 6 }
  d.traits = ['nose', 'calm']
  return d
}

function battleNodeOf(run) {
  const found = Object.values(run.map.nodes).find((node) => node.type === 'battle' || node.type === 'elite')
  if (found) return found
  const synthetic = {
    id: 'test-battle',
    type: 'battle',
    region: 'ruins',
    title: '测试遭遇',
    enemy: { name: '拾荒者', hp: 18, morale: 14, attack: 5, traits: [] },
  }
  run.map.nodes[synthetic.id] = synthetic
  return synthetic
}

const run = createRun(draft(), 'COMBAT-01')
const node = battleNodeOf(run)
const battle = createBattle(run, node)

check(battle.hand.length === 4, '初始手牌不是 4 张')
check(battle.ap === 3, '初始 AP 不是 3')
check(battle.enemies.length >= 1, '没有敌人')
check(battle.enemies.every((enemy) => enemy.intent), '敌人没有意图')

for (let round = 0; round < 25 && battle.status === 'active'; round += 1) {
  let index = 0
  while (index < battle.hand.length && battle.status === 'active') {
    const card = CARDS[battle.hand[index]]
    if (card && card.cost <= battle.ap) {
      const result = playCard(battle, run, index, 0)
      check(result.ok, `出牌失败：${card.key}`)
    } else {
      index += 1
    }
  }
  if (battle.status === 'active') endTurn(battle, run)
}

check(['won', 'lost'].includes(battle.status), '战斗没有结束')
check(run.player.hp >= 0 && run.player.hp <= run.player.hpMax, '生命越界')
check(run.player.mental >= 0 && run.player.mental <= run.player.mentalMax, '精神越界')

let outcome = null
if (battle.status === 'won') {
  const result = resolveBattle(run, battle, 'disarm')
  check(result.ok, '胜利处置失败')
  check(run.cleared.includes(battle.nodeId), '胜利后节点没有标记完成')
  outcome = result.reward
} else {
  check(run.cleared.includes(battle.nodeId), '失败后节点没有标记完成')
}

// 撤离
const fleeRun = createRun(draft(), 'COMBAT-02')
const fleeNode = battleNodeOf(fleeRun)
const fleeState = createBattle(fleeRun, fleeNode)
const mentalBefore = fleeRun.player.mental
const fled = fleeBattle(fleeRun, fleeState)
check(fled.ok, '撤离失败')
check(fleeState.status === 'fled', '撤离状态不正确')
check(fleeRun.player.mental === mentalBefore - 8, '撤离没有扣精神')
check(fleeRun.cleared.includes(fleeNode.id), '撤离后节点没有标记完成')

// 新机制：流血、肾上腺素、击晕、过载、召唤
const mechRun = createRun(draft(), 'COMBAT-MECH')
const mechBase = battleNodeOf(mechRun)
const mech = createBattle(mechRun, {
  ...mechBase,
  id: 'mech-node',
  type: 'battle',
  enemy: { name: '装甲测试体', hp: 60, morale: 40, attack: 5, traits: ['armored'] },
})
mech.ap = 4
mech.hand = ['bleed', 'adrenaline', 'bash', 'overload']
const mechTarget = mech.enemies[0]
playCard(mech, mechRun, 0, 0)
check(mechTarget.status?.bleed?.turns === 3, '流血没有施加')
playCard(mech, mechRun, 0, 0)
check(mech.ap === 4, '肾上腺素没有增加 AP')
playCard(mech, mechRun, 0, 0)
check(mechTarget.stun >= 1, '盾击没有击晕')
const moraleBefore = mechTarget.morale
playCard(mech, mechRun, 0, 0)
check(mechTarget.morale < moraleBefore, '过载没有削减士气')

const summonRun = createRun(draft(), 'COMBAT-SUMMON')
const summonBase = battleNodeOf(summonRun)
const summon = createBattle(summonRun, {
  ...summonBase,
  id: 'summon-node',
  type: 'battle',
  enemy: { name: '召唤者', hp: 50, morale: 30, attack: 5, traits: ['summoner'] },
})
summon.enemies[0].intent = { type: 'summon', value: 0 }
endTurn(summon, summonRun)
check(summon.enemies.length === 2, '召唤没有生成随从')

// 确定性：同一 run/node 的初始状态一致
const d1 = createRun(draft(), 'COMBAT-03')
const d2 = createRun(draft(), 'COMBAT-03')
const n1 = battleNodeOf(d1)
const n2 = d2.map.nodes[n1.id]
const b1 = createBattle(d1, n1)
const b2 = createBattle(d2, n2)
check(JSON.stringify(b1.hand) === JSON.stringify(b2.hand), '同 seed 初始手牌不一致')
check(JSON.stringify(b1.enemies.map((e) => e.intent)) === JSON.stringify(b2.enemies.map((e) => e.intent)), '同 seed 敌人意图不一致')

if (errors.length) {
  console.error('FAILED')
  errors.forEach((error) => console.error(' -', error))
  process.exit(1)
}

console.log(JSON.stringify({
  ok: true,
  result: battle.status,
  rounds: battle.round,
  outcome,
  remainingHp: Math.round(run.player.hp),
  remainingMental: Math.round(run.player.mental),
  deterministicHand: b1.hand,
}, null, 2))
