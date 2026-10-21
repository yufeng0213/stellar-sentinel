/**
 * 偷窃败露反应：性格、关系和敌对/赠礼分支。
 */

import { randomDraft } from '../src/game-core/character.js'
import { createRun } from '../src/game-core/run.js'
import { npcList } from '../src/game-core/npc.js'
import { stealFromNpc, theftReaction } from '../src/game-core/steal.js'

const errors = []
const check = (condition, label) => { if (!condition) errors.push(label) }

const makeNpc = (overrides = {}) => ({
  relation: { trust: 20, closeness: 20, grievance: 0 },
  personality: { aggression: 20, loyalty: 30 },
  archetype: { id: 'cold_elite' },
  ...overrides,
})

check(theftReaction(makeNpc()) === 'warn', '普通关系没有警告反应')
check(theftReaction(makeNpc({
  relation: { trust: 65, closeness: 60, grievance: 0 },
})) === 'gift', '高信任关系没有赠礼反应')
check(theftReaction(makeNpc({ archetype: { id: 'sunshine' } })) === 'gift', '阳光人设没有赠礼反应')
check(theftReaction(makeNpc({
  personality: { aggression: 70, loyalty: 30 },
})) === 'fight', '高攻击性没有战斗反应')
check(theftReaction(makeNpc({
  relation: { trust: 80, closeness: 70, grievance: 60 },
})) === 'fight', '高怨念没有覆盖高信任')

function findFailure(npc, configure) {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    const run = createRun(randomDraft(), `THEFT-${attempt}`)
    const target = npcList(run)[0]
    target.lover = false
    target.quarrel = null
    target.relation.trust = 20
    target.relation.closeness = 20
    target.relation.grievance = 0
    target.personality.aggression = 20
    target.personality.loyalty = 30
    configure(target)
    target.stolenDay = 0
    run.rollCount = attempt
    const result = stealFromNpc(run, target.id)
    if (result.ok && !result.success) return { result, target }
  }
  return null
}

const gift = findFailure(null, (npc) => {
  npc.lover = true
  npc.relation.trust = 70
  npc.personality.aggression = 0
})
check(gift?.result.reaction === 'gift', '高信任偷窃失败没有赠礼分支')
check(gift?.result.text.length > 0, '赠礼分支没有文本')

const fight = findFailure(null, (npc) => {
  npc.lover = false
  npc.relation.trust = 10
  npc.personality.aggression = 80
  npc.archetype = { id: 'rough', name: '糙汉' }
})
check(fight?.result.reaction === 'fight', '高攻击偷窃失败没有战斗分支')
check(fight?.result.fight === true, '战斗分支没有 fight 标记')
check(fight?.target.hostile === true, '战斗分支没有把 NPC 设为敌对')

console.log(JSON.stringify({
  ok: errors.length === 0,
  gift: gift?.result.reaction,
  fight: fight?.result.reaction,
  errors,
}, null, 2))

if (errors.length) process.exit(1)
