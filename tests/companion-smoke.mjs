/**
 * 同伴参战：支援牌、关系变体、受伤/冷战、被动与战斗使用。
 */

import { randomDraft } from '../src/game-core/character.js'
import { createRun } from '../src/game-core/run.js'
import { npcList } from '../src/game-core/npc.js'
import {
  companionParty,
  createBattle,
  deckEntries,
  playCard,
} from '../src/game-core/combat.js'

const errors = []
const check = (condition, label) => { if (!condition) errors.push(label) }

const run = createRun(randomDraft(), 'COMPANION-TEST')
const npc = npcList(run)[0]
npc.alive = true
npc.active = true
npc.archetype = { id: 'tycoon', name: '霸总', glyph: '▦' }
npc.relation.trust = 70
npc.relation.closeness = 60
npc.lover = true
npc.injured = false
npc.quarrel = null
run.party = [npc.id]

const party = companionParty(run)
check(party.length === 1, '同伴小队没有识别成员')
check(party[0].cardKey.endsWith('+'), '高关系同伴没有使用强化支援牌')
check(party[0].card.name.includes('提前清场'), '同伴支援牌不匹配')

const node = {
  id: 'companion-node',
  type: 'battle',
  region: 'ruins',
  title: '同伴测试',
  enemy: { name: '测试体', hp: 30, morale: 20, attack: 3, traits: [] },
}
const battle = createBattle(run, node)
check(battle.deck?.includes(party[0].cardKey) || battle.drawPile.includes(party[0].cardKey) || battle.hand.includes(party[0].cardKey), '支援牌没有进入战斗牌堆')
check(battle.companions.length === 1, '战斗没有记录同伴')
check(battle.companions[0].cardName.includes('提前清场'), '战斗同伴支援牌错误')
check(battle.guard >= 3, '同伴被动护盾没有生效')

battle.hand = [party[0].cardKey]
battle.ap = 3
const beforeGuard = battle.guard
const played = playCard(battle, run, 0, 0)
check(played.ok, '同伴支援牌无法打出')
check(battle.guard > beforeGuard, '同伴支援牌没有提供护盾')
check(battle.log.some((entry) => entry.text.includes('霸总')), '同伴战斗台词没有进日志')

npc.injured = true
const injured = companionParty(run)[0]
check(injured.cardKey === 'comp_injured', '受伤同伴没有换成带伤支援')
check(!injured.card.name.includes('提前清场'), '受伤同伴仍然使用完整支援')

npc.injured = false
npc.quarrel = { active: true }
const distant = companionParty(run)[0]
check(distant.cardKey === 'comp_distant', '冷战同伴没有换成冷淡支援')

npc.quarrel = null
npc.lover = false
npc.relation.trust = 30
npc.relation.closeness = 20
const normal = companionParty(run)[0]
check(!normal.cardKey.endsWith('+'), '低关系同伴仍然使用强化支援')

const entries = deckEntries(run)
check(entries.length > 0, '牌组查看受到同伴支援牌影响')

console.log(JSON.stringify({
  ok: errors.length === 0,
  party: party[0].cardKey,
  injured: injured.cardKey,
  distant: distant.cardKey,
  normal: normal.cardKey,
  guard: battle.guard,
  errors,
}, null, 2))

if (errors.length) process.exit(1)
