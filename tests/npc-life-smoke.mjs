/**
 * NPC 自主人生：目标、需求、派系晋升、离城/归来与死亡继承。
 */

import { randomDraft } from '../src/game-core/character.js'
import { createRun } from '../src/game-core/run.js'
import { npcList } from '../src/game-core/npc.js'
import { ensureNpcLife, lifeTick, npcLifeStatus } from '../src/game-core/npc-life.js'

const errors = []
const check = (condition, label) => { if (!condition) errors.push(label) }

const run = createRun(randomDraft(), 'NPC-LIFE-TEST')
const npc = npcList(run).find((item) => item.tier === 'core')
const life = ensureNpcLife(run, npc)
check(!!life.goal && !!life.needs, 'NPC 没有初始化人生状态')
check(npcLifeStatus(npc, run).goal.name.length > 0, 'NPC 没有目标显示')

life.goal = 'status'
life.progress = 100
const promotion = lifeTick(run)
check(life.factionRank > 0, '派系晋升没有提升等级')
check(promotion.some((text) => text.includes('升了一级')), '派系晋升没有事件')

life.needs.purpose = 0
life.lowNeedDays.purpose = 3
const leave = lifeTick(run)
check(life.leftCity === true && npc.active === false, '意义过低没有离城')
check(leave.some((text) => text.includes('离开了空港')), '离城没有事件')

life.returnDay = run.day
const returned = lifeTick(run)
check(life.leftCity === false && npc.active === true, '离城 NPC 没有回来')
check(returned.some((text) => text.includes('回到了空港')), '归来没有事件')

const heir = npcList(run).find((item) => item.id !== npc.id && item.alive && item.tier === 'core')
if (heir) {
  npc.credits = 30
  npc.bag = { chip: 1 }
  ensureNpcLife(run, heir)
  npc.life.needs.safety = 0
  npc.life.lowNeedDays.safety = 6
  let died = false
  for (let day = 0; day < 40 && !died; day += 1) {
    run.day += 1
    npc.life.needs.safety = 0
    npc.life.lowNeedDays.safety = 6
    lifeTick(run)
    died = npc.alive === false
  }
  check(died, '长期低安全没有触发死亡')
  if (died) check(npc.life.heirId || run.player.credits >= 0, '死亡没有处理继承')
}

console.log(JSON.stringify({
  ok: errors.length === 0,
  goal: life.goal,
  rank: life.factionRank,
  died: npc.alive === false,
  errors,
}, null, 2))

if (errors.length) process.exit(1)
