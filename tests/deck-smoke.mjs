/**
 * 牌组构筑：初始牌组、战后奖励、升级、删除与战斗使用。
 */

import { randomDraft } from '../src/game-core/character.js'
import { createRun } from '../src/game-core/run.js'
import {
  BASE_DECK,
  addDeckCard,
  cardDef,
  cardRewardChoices,
  createBattle,
  deckEntries,
  ensureDeck,
  playCard,
  removeDeckCard,
  resolveBattle,
  upgradeDeckCard,
} from '../src/game-core/combat.js'

const errors = []
const check = (condition, label) => { if (!condition) errors.push(label) }

const run = createRun(randomDraft(), 'DECK-TEST')
check(Array.isArray(run.deck) && run.deck.length === BASE_DECK.length, '初始牌组错误')
check(ensureDeck(run) === run.deck, 'ensureDeck 没有返回当前牌组')

run.player.credits = 200
run.inv.scrap = 3
const strikeIndex = run.deck.indexOf('strike')
const upgraded = upgradeDeckCard(run, strikeIndex)
check(upgraded.ok, '卡牌升级失败')
check(run.deck[strikeIndex] === 'strike+', '升级后牌组没有替换卡牌')
check(cardDef('strike+').power > cardDef('strike').power, '升级卡牌伤害没有提高')
check((run.inv.scrap || 0) === 2, '卡牌升级没有消耗废料')

const beforeRemove = run.deck.length
const removed = removeDeckCard(run, run.deck.indexOf('guard'))
check(removed.ok && run.deck.length === beforeRemove - 1, '删卡失败')
const added = addDeckCard(run, 'barrier')
check(added.ok && run.deck.includes('barrier'), '添加卡牌失败')

const entries = deckEntries(run)
check(entries.some((entry) => entry.baseKey === 'strike' && entry.count >= 2), '牌组分组错误')

const node = {
  id: 'deck-node',
  type: 'elite',
  region: 'ruins',
  title: '牌组测试',
  enemy: { name: '测试体', hp: 40, morale: 20, attack: 4, traits: [] },
}
const battle = createBattle(run, node)
check(battle.hand.length === 4, '战斗没有使用牌组手牌')
check(battle.hand.every((key) => cardDef(key)), '手牌包含无效卡牌')

const choices = cardRewardChoices(run, { ...battle, nodeType: 'elite', round: 2 })
check(choices.length === 3, '战后奖励不是三选一')
check(new Set(choices.map((card) => card.key)).size === 3, '战后奖励有重复卡牌')

battle.status = 'won'
const outcome = resolveBattle(run, battle, 'disarm')
check(outcome.ok, '战斗结算失败')
check(outcome.reward.cardChoices.length === 3, '战斗奖励没有卡牌选择')

// 升级后的牌确实能被打出
const upgradedBattle = createBattle(run, { ...node, id: 'deck-node-2' })
upgradedBattle.hand = ['strike+']
upgradedBattle.ap = 3
const played = playCard(upgradedBattle, run, 0, 0)
check(played.ok, '升级卡牌无法打出')

console.log(JSON.stringify({
  ok: errors.length === 0,
  deck: run.deck.length,
  upgraded: run.deck.includes('strike+'),
  reward: outcome.reward.cardChoices.map((card) => card.key),
  errors,
}, null, 2))

if (errors.length) process.exit(1)
