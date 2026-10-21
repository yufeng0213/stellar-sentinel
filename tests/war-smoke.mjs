/**
 * 边境战争：城市盟约 → 集结 → 营地 → 敌方据点 → 城市结算。
 */

import { randomDraft } from '../src/game-core/character.js'
import { createRun } from '../src/game-core/run.js'
import {
  chooseWarCamp,
  chooseWarPrep,
  completeWarBattle,
  ensureWar,
  settleBorderWar,
  startBorderWar,
  warAvailable,
  warBattleEnemy,
} from '../src/game-core/border-war.js'
import {
  completeReconstruction,
  reconstructionStatus,
  startReconstruction,
} from '../src/game-core/city-reconstruction.js'

const errors = []
const check = (condition, label) => { if (!condition) errors.push(label) }

const run = createRun(randomDraft(), 'WAR-TEST')
run.player.credits = 300
run.inv.scrap = 10
run.city.pact = 'tower'
ensureWar(run)
check(warAvailable(run), '有盟约但不能开始边境战争')

const start = startBorderWar(run)
check(start.ok && run.borderWar.active, '边境战争没有开始')
check(run.borderWar.stage === 1, '边境战争没有进入集结')
check(start.war.lastText.length > 0, '边境战争没有开场文本')

const prep = chooseWarPrep(run, 'vanguard')
check(prep.ok && run.borderWar.stage === 2, '集结没有推进到营地')
const camp = chooseWarCamp(run, 'talk')
check(camp.ok && run.borderWar.stage === 3, '营地没有推进到据点')
check(run.player.mental > 0, '营地谈话没有恢复精神')

const enemy = warBattleEnemy(run)
check(enemy.hp > 0 && enemy.name.length > 0, '边境敌人没有生成')
const battle = completeWarBattle(run)
check(battle.ok && run.borderWar.stage === 4, '战斗胜利没有推进到结算')

const repBefore = run.reputation.tower
const settle = settleBorderWar(run, 'faction')
check(settle.ok, '边境战争结算失败')
check(!run.borderWar.active && run.borderWar.completedDay > 0, '边境战争没有结束')
check(run.reputation.tower > repBefore, '选择派系没有提升声望')
check(run.inv.relic >= 1, '边境战争没有独特奖励')
check(settle.reward.includes('遗物'), '边境奖励文本错误')
check(run.city.warAftermath?.outcome === 'faction', '城市没有记录战争后果')
check(run.city.controlledBy === 'tower', '城市控制权没有改变')
check(run.borderWar.aftermath?.stanceChanges?.length > 0, 'NPC 没有对战争结果表态')
check(Array.isArray(run.borderWar.aftermath?.migrantsOut), '迁出名单缺失')
check(run.borderWar.aftermath?.injured?.length === 1, '战争伤者没有记录')
check(run.city.reconstruction?.stage === 0, '城市没有进入重建准备')

run.inv.ration = 4
const rebuild = startReconstruction(run, 'relief')
check(rebuild.ok && run.city.reconstruction.stage === 1, '重建没有开始')
check(reconstructionStatus(run).ready === false, '重建过早可完成')
run.day = run.city.reconstruction.dueDay
const rebuildDone = completeReconstruction(run, 'relief')
check(rebuildDone.ok && run.city.reconstruction.completed, '重建没有完成')
check(run.city.reconstructionResult?.policy === 'relief', '重建结果没有记录')

console.log(JSON.stringify({
  ok: errors.length === 0,
  enemy: enemy.name,
  stage: run.borderWar.stage,
  reward: settle.reward,
  errors,
}, null, 2))

if (errors.length) process.exit(1)
