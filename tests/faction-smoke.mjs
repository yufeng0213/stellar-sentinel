/**
 * 派系声望、每日补给与城市委托声望。
 */

import { randomDraft } from '../src/game-core/character.js'
import { createRun } from '../src/game-core/run.js'
import { ensureCity, claimCityQuest } from '../src/game-core/city.js'
import {
  FACTION_IDS,
  adjustReputation,
  ensureReputation,
  factionStatus,
  claimFactionFavor,
  reputationLevel,
} from '../src/game-core/faction.js'
import { validateRun } from '../src/game/save.js'

const errors = []
const check = (condition, label) => { if (!condition) errors.push(label) }

const run = createRun(randomDraft(), 'FACTION-TEST')
ensureReputation(run)
check(FACTION_IDS.every((id) => run.reputation[id] === 0), '初始声望不是 0')
check(reputationLevel(0).name === '中立', '0 声望不是中立')
check(reputationLevel(-50).name === '敌对', '负声望等级错误')
check(reputationLevel(65).name === '同盟', '高声望等级错误')

adjustReputation(run, 'market', 12, '测试')
check(run.reputation.market === 12, '声望增加失败')
check(factionStatus(run, 'market').level === '友善', '友善等级解锁失败')

run.player.credits = 100
const favor = claimFactionFavor(run, 'market')
check(favor.ok, '友善派系补给失败')
check(favor.credits > 0, '补给没有信用点')
check(!claimFactionFavor(run, 'market').ok, '同一天可以重复领补给')

const city = ensureCity(run)
const quest = city.quests.find((item) => item.faction)
check(!!quest, '城市委托没有派系')
if (quest) {
  if (quest.type === 'deliver') {
    run.inv[quest.key] = (run.inv[quest.key] || 0) + quest.need
  } else {
    run.cleared.push(quest.nodeId)
  }
  const before = run.reputation[quest.faction]
  const claimed = claimCityQuest(run, quest.id)
  check(claimed.ok, '带派系委托交付失败')
  check(run.reputation[quest.faction] === before + 5, '委托没有增加派系声望')
}

const imported = validateRun(JSON.parse(JSON.stringify(run)))
check(imported.ok, '派系存档校验失败')
check(imported.run.reputation.market === run.reputation.market, '存档没有保留声望')

if (errors.length) {
  console.error('FAILED')
  errors.forEach((error) => console.error(' -', error))
  process.exit(1)
}

console.log(JSON.stringify({
  ok: true,
  reputation: run.reputation,
  level: factionStatus(run, 'market').level,
  favor,
  questFaction: quest?.faction,
}, null, 2))
