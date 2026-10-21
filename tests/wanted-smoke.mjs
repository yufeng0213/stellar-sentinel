/**
 * 城市通缉：等级、价格惩罚、罚金与自动衰减。
 */

import { randomDraft } from '../src/game-core/character.js'
import { createRun } from '../src/game-core/run.js'
import { cityPrice, ensureCity } from '../src/game-core/city.js'
import {
  decayWanted,
  ensureWanted,
  payWanted,
  raiseWanted,
  wantedPriceMarkup,
  wantedStatus,
} from '../src/game-core/wanted.js'
import { factionInterveneWanted, wantedFactionOptions } from '../src/game-core/wanted-faction.js'

const errors = []
const check = (condition, label) => { if (!condition) errors.push(label) }

const run = createRun(randomDraft(), 'WANTED-TEST')
const city = ensureCity(run)
run.player.credits = 500
ensureWanted(run)
check(wantedStatus(run).active === false, '初始不应被通缉')

raiseWanted(run, 'dock', '商店扒窃败露', 1)
const status = wantedStatus(run)
check(status.active && status.level === 1, '通缉等级没有提高')
check(status.fine > 0, '通缉没有罚金')
check(wantedPriceMarkup(run) === 0.05, '通缉价格惩罚错误')
const offer = city.market[0]
const beforePrice = cityPrice(run, offer)
run.wanted.level = 0
const normalPrice = cityPrice(run, offer)
check(beforePrice >= normalPrice, '通缉没有提高价格')

run.wanted.level = 1
raiseWanted(run, 'dock', '再次败露', 1)
check(run.wanted.level === 2, '通缉等级没有叠加')
const fine = run.wanted.fine
const paid = payWanted(run)
check(paid.ok && paid.fine === fine, '缴纳罚金失败')
check(run.wanted.level === 0, '罚金没有清除通缉')
check(run.player.credits === 500 - fine, '罚金扣除错误')

raiseWanted(run, 'dock', '第三次败露', 1)
run.day += 3
decayWanted(run)
check(run.wanted.level === 0, '通缉没有按时间衰减')

run.player.credits = 500
run.reputation.tower = 65
raiseWanted(run, 'dock', '白塔出面', 2)
const helpers = wantedFactionOptions(run)
check(helpers.some((item) => item.id === 'tower' && item.canClear), '白塔没有撤销案件选项')
const cleared = factionInterveneWanted(run, 'tower')
check(cleared.ok && cleared.cleared, '高声望派系没有撤销案件')
check(run.wanted.level === 0, '派系消案没有清除通缉')
check(run.reputation.tower < 65, '派系消案没有消耗声望')

run.reputation.market = 30
run.player.credits = 500
raiseWanted(run, 'dock', '市场出面', 2)
const reduced = factionInterveneWanted(run, 'market')
check(reduced.ok && reduced.level === 1, '低声望派系没有降低通缉等级')

console.log(JSON.stringify({
  ok: errors.length === 0,
  fine,
  priceBefore: beforePrice,
  priceNormal: normalPrice,
  errors,
}, null, 2))

if (errors.length) process.exit(1)
