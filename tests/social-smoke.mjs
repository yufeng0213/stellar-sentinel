/**
 * 恋人关系、表白事件、NPC 关系树、随身背包与自主使用。
 */

import { randomDraft } from '../src/game-core/character.js'
import { createRun } from '../src/game-core/run.js'
import {
  breakUpWithNpc,
  buyFromNpc,
  ensureNpcWanted,
  fulfillNpcWanted,
  giftToNpc,
  giveNpcGear,
  npcCombatStats,
  npcRelationTree,
  npcTradeOffers,
  romanceStatus,
  sellToNpc,
  tickWorld,
} from '../src/game-core/npc.js'
import { completeEscort, startEscort } from '../src/game-core/escort.js'
import { resolveInboxEvent } from '../src/game-core/npc-events.js'
import { buildSettlementMessages, localSettlementReport } from '../src/game/settlement.js'
import { validateRun } from '../src/game/save.js'

const errors = []
const check = (condition, label) => { if (!condition) errors.push(label) }

const run = createRun(randomDraft(), 'SOCIAL-TEST')
const npc = Object.values(run.npcs)[0]
npc.relation.trust = 70
npc.relation.closeness = 70
npc.lover = false
npc.confessed = false
npc.alive = true
npc.hostile = false

const confession = {
  id: 'social-confession',
  day: run.day,
  week: 1,
  npcId: npc.id,
  type: 'confession',
  status: 'pending',
  title: `${npc.name} 想问你一件事`,
  text: '“我们这样算什么？”',
  payload: { confession: true },
  choices: [
    { id: 'accept', label: '我们试试' },
    { id: 'decline', label: '还是做朋友' },
  ],
}
run.inbox.push(confession)
const accepted = resolveInboxEvent(run, confession.id, 'accept')
check(accepted.ok, '接受表白失败')
check(npc.lover === true, '接受表白后没有成为恋人')
check(npc.loverSince === run.day, '恋人日期没有记录')

const tree = npcRelationTree(run, npc.id)
check(tree && tree.categories.some((category) => category.id === 'lover'), '关系树没有恋人分支')
check(tree.categories.some((category) => category.items.some((item) => item.npc.id === 'player')), '关系树里没有玩家恋人节点')

run.inv.pebble = 1
const gift = giftToNpc(run, npc.id, 'pebble')
check(gift.ok, '送小礼物失败')
check(npc.bag.pebble === 1, 'NPC 没有把礼物放进背包')

npc.injured = true
npc.bag.medkit = 1
tickWorld(run)
check(npc.injured === false, 'NPC 受伤后没有自己使用医疗包')
check(!npc.bag.medkit, 'NPC 使用医疗包后没有扣除')

const other = Object.values(run.npcs).find((item) => item.id !== npc.id)
other.lover = true
other.relation.trust = 65
other.relation.closeness = 65
check(romanceStatus(run, other.id).lover, '恋爱状态没有识别恋人')
const jealousy = {
  id: 'social-jealousy',
  day: run.day,
  week: 1,
  npcId: npc.id,
  type: 'jealousy',
  status: 'pending',
  title: `${npc.name} 闻到了别人身上的味道`,
  text: '“你最近是不是也去了别人那里？”',
  payload: { otherId: other.id },
  choices: [{ id: 'honest', label: '坦白' }, { id: 'deny', label: '否认' }],
}
run.inbox.push(jealousy)
const jealousyResult = resolveInboxEvent(run, jealousy.id, 'honest')
check(jealousyResult.ok, '吃醋事件处理失败')
check(npc.relation.grievance > 0, '坦白后没有产生怨念')

const broken = breakUpWithNpc(run, other.id)
check(broken.ok && other.lover === false, '分手没有解除恋人关系')

const reportEvents = [{ text: '霜在城门附近等你。' }, { text: '叶卡在废墟巡逻时受了伤。' }]
const localReport = localSettlementReport(run, reportEvents)
check(localReport.includes('第 1 天'), '本地夜报缺少日期')
check(localReport.includes('霜'), '本地夜报没有使用事件')
const reportPrompt = buildSettlementMessages(run, reportEvents)
check(reportPrompt.messages.length === 2, '夜报 prompt 不是两段')
check(reportPrompt.messages[1].content.includes('叶卡'), '夜报 prompt 缺少事件')

npc.injured = false
npc.credits = 100
npc.bag.medkit = 1
const offers = npcTradeOffers(run, npc.id)
check(offers.some((offer) => offer.itemId === 'medkit'), 'NPC 交易列表没有背包物品')
run.player.credits = 100
const bought = buyFromNpc(run, npc.id, 'medkit')
check(bought.ok && (run.inv.medkit || 0) === 1, '从 NPC 购买失败')
check(npc.credits > 100, 'NPC 没有收到信用点')
run.player.credits = 0
const sold = sellToNpc(run, npc.id, 'medkit')
check(sold.ok && run.player.credits > 0, '卖给 NPC 失败')
check((npc.bag.medkit || 0) === 1, 'NPC 没有收下卖出的物品')

npc.injured = true
run.inv.medkit = 1
const medicineEvent = {
  id: 'social-medicine',
  day: run.day,
  week: 1,
  npcId: npc.id,
  type: 'favor',
  status: 'pending',
  title: `${npc.name} 想请你帮忙`,
  text: '需要医疗包',
  payload: { kind: 'medicine', itemId: 'medkit' },
  choices: [{ id: 'accept', label: '给他药' }, { id: 'decline', label: '拒绝' }],
}
run.inbox.push(medicineEvent)
const helped = resolveInboxEvent(run, medicineEvent.id, 'accept')
check(helped.ok, '医疗求助处理失败')
check(npc.injured === false, '医疗求助没有治好 NPC')
check((run.inv.medkit || 0) === 0, '医疗求助没有扣除医疗包')

run.inv.pebble = 1
ensureNpcWanted(run, npc, true)
npc.wanted = { itemId: 'pebble', price: 12, day: run.day, status: 'open' }
npc.credits = 50
const wantedResult = fulfillNpcWanted(run, npc.id)
check(wantedResult.ok && run.player.credits >= 12, 'NPC 收购单没有完成')
check(!run.inv.pebble, 'NPC 收购单没有扣除物品')

const gear = { uid: 'test-blade', key: 'blade', name: '共鸣刃', slot: 'weapon', bonus: { per: 2 }, quality: '标准' }
run.gear.push(gear)
const beforeAttack = npcCombatStats(npc).attack
const gaveGear = giveNpcGear(run, npc.id, gear.uid)
check(gaveGear.ok && npc.gear.weapon?.uid === gear.uid, '装备没有送给 NPC')
check(!run.gear.some((item) => item.uid === gear.uid), '送出的装备还在玩家背包')
check(npcCombatStats(npc).attack >= beforeAttack, 'NPC 装备没有影响战斗属性')

npc.injured = true
const escort = startEscort(run, npc.id)
check(escort.ok, '护送任务没有创建')
const escortDone = completeEscort(run, npc.id)
check(escortDone.ok && npc.injured === false, '护送没有让 NPC 伤愈')

const imported = validateRun(JSON.parse(JSON.stringify(run)))
check(imported.ok, '社交状态存档校验失败')
check(imported.run.npcs[npc.id].lover === true, '存档没有保留恋人状态')
check(imported.run.npcs[npc.id].bag && Object.keys(imported.run.npcs[npc.id].bag).length > 0, '存档没有保留 NPC 背包变化')

if (errors.length) {
  console.error('FAILED')
  errors.forEach((error) => console.error(' -', error))
  process.exit(1)
}

console.log(JSON.stringify({
  ok: true,
  lover: npc.lover,
  tree: tree.categories.map((category) => [category.label, category.items.length]),
  bag: npc.bag,
  injured: npc.injured,
}, null, 2))
