/**
 * 战败回城：不卡死，推进一天，换地图，保留角色与背包。
 */

import { randomDraft } from '../src/game-core/character.js'
import { createBattle } from '../src/game-core/combat.js'
import { createRun, retreatAfterDefeat } from '../src/game-core/run.js'
import { validateRun } from '../src/game/save.js'

const errors = []
const check = (condition, label) => { if (!condition) errors.push(label) }

const run = createRun(randomDraft(), 'RETREAT-TEST')
const battleNode = Object.values(run.map.nodes).find((node) => ['battle', 'elite'].includes(node.type))
check(!!battleNode, '没有战斗节点可用')
const oldMapSeed = run.map.seed
const oldDay = run.day
run.inv.scrap = 3
run.quests = [{
  id: 'retreat-quest',
  npcId: 'npc-1',
  nodeId: 'n1-0',
  nodeTitle: '旧战场',
  status: 'active',
  deadline: 6,
  reward: { credits: 10, itemId: 'scrap' },
}]
if (battleNode) {
  run.battle = createBattle(run, battleNode)
  run.battle.status = 'lost'
}
run.player.hp = 1
run.player.mental = 1

const result = retreatAfterDefeat(run)
check(result.ok, '战败回城失败')
check(run.day === oldDay + 1, '回城没有推进一天')
check(run.map.seed !== oldMapSeed, '回城没有重排地图')
check(run.location === run.map.startId, '回城没有回到起点')
check(run.cleared.length === 1 && run.cleared[0] === run.map.startId, '回城没有重置探索进度')
check(run.battle === null, '回城后仍残留战斗')
check(run.player.hp > 1 && run.player.mental > 1, '回城没有恢复生命/精神')
check(run.inv.scrap === 3, '回城丢失背包')
check(run.defeats === 1, '没有记录战败次数')
check(run.quests[0].status === 'failed', '旧地图约定没有失效')

const imported = validateRun(JSON.parse(JSON.stringify(run)))
check(imported.ok, '回城后的存档校验失败')
check(imported.run.defeats === 1, '存档没有保留战败次数')

if (errors.length) {
  console.error('FAILED')
  errors.forEach((error) => console.error(' -', error))
  process.exit(1)
}

console.log(JSON.stringify({
  ok: true,
  day: run.day,
  oldMapSeed,
  newMapSeed: run.map.seed,
  hp: run.player.hp,
  mental: run.player.mental,
  defeats: run.defeats,
}, null, 2))
