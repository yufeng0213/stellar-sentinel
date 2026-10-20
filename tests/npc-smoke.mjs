/**
 * NPC 世界冒烟测试：生成、初始倾向、送礼饱和、交谈、组队、交恶、每日 tick。
 * 运行：npm run test:npc
 */

import { newDraft } from '../src/game-core/character.js'
import { createBattle } from '../src/game-core/combat.js'
import {
  applyNpcBattleOutcome,
  canInviteToParty,
  createNpcWorld,
  giftToNpc,
  intimidateNpc,
  inviteToParty,
  npcList,
  resolveAmbushPeacefully,
  talkToNpc,
} from '../src/game-core/npc.js'
import { camp, createRun } from '../src/game-core/run.js'

const errors = []
const check = (condition, label) => { if (!condition) errors.push(label) }

function draft() {
  const d = newDraft()
  d.name = '关系测试'
  d.abo = 'beta'
  d.role = 'guide'
  d.origin = 'broker'
  d.attrs = { per: 6, vit: 6, psi: 6, tec: 6, soc: 7, wil: 5 }
  d.traits = ['dealer', 'resonance']
  return d
}

const run = createRun(draft(), 'NPC-TEST-01')
const list = npcList(run)

check(list.length === 18, 'NPC 数量不是 18')
check(list.every((npc) => npc.relation && npc.personality && npc.interests.length), 'NPC 数据不完整')

const biases = list.map((npc) => npc.bias)
check(Math.max(...biases) > 0, '没有初始印象好的 NPC')
check(Math.min(...biases) < 0, '没有初始印象差的 NPC')
check(new Set(list.map((npc) => npc.name)).size === 18, 'NPC 名字重复')

// 同 seed 世界一致
const twin = createRun(draft(), 'NPC-TEST-01')
check(JSON.stringify(twin.npcs) === JSON.stringify(run.npcs), '同 seed 的 NPC 世界不一致')

const npc = list.find((item) => item.interests.includes('遗物') || item.interests.includes('共鸣')) || list[0]
run.inv.shard = 6
npc.bias = 20
npc.relation.grievance = 0
npc.hostile = false

const gift1 = giftToNpc(run, npc.id, 'shard')
const gift2 = giftToNpc(run, npc.id, 'shard')
check(gift1.ok && gift1.gain > 0, '第一次送礼没有获得好感')
check(gift2.ok && gift2.gain < gift1.gain, '送礼没有饱和')
check(gift2.gain >= 0, '送礼出现负收益')

const talk1 = talkToNpc(run, npc.id, 'interest')
const talk2 = talkToNpc(run, npc.id, 'life')
check(talk1.ok, '第一次交谈失败')
check(!talk2.ok, '同一天重复交谈没有被阻止')

npc.relation.trust = 80
npc.relation.closeness = 60
npc.relation.grievance = 0
npc.hostile = false
npc.alive = true
check(canInviteToParty(run, npc.id).ok, '满足条件时无法组队')
const joined = inviteToParty(run, npc.id)
check(joined.ok && run.party.includes(npc.id), '组队状态没有写入')

const battle = createBattle(run, {
  id: `test-${npc.id}`,
  type: 'battle',
  title: '队伍测试',
  region: 'ruins',
  enemy: { name: '测试敌人', hp: 20, morale: 14, attack: 5, traits: [] },
})
check([...battle.hand, ...battle.drawPile].includes('assist'), '组队后战斗牌堆没有同伴支援')

const hostile = list.find((item) => item.id !== npc.id)
hostile.relation.grievance = 55
const threat = intimidateNpc(run, hostile.id)
check(threat.ok, '威胁失败')
check(hostile.relation.grievance >= 60 && hostile.hostile, '威胁没有触发敌视')

run.player.credits = 100
run.pendingAmbush = hostile.id
const peace = resolveAmbushPeacefully(run, hostile.id)
check(peace.ok, '退让失败')
check(run.player.credits < 100, '退让没有扣除信用点')
check(run.pendingAmbush === null, '退让后伏击状态没有清除')

applyNpcBattleOutcome(run, hostile.id, 'spare')
check(hostile.relation.grievance < 60, '放过没有降低怨念')

// 每日 tick：同 seed、同状态得到同样的事件
const a = createRun(draft(), 'NPC-TICK')
const b = createRun(draft(), 'NPC-TICK')
a.ap = 0
b.ap = 0
camp(a)
camp(b)
check(a.day === 2 && b.day === 2, '扎营没有推进日期')
check(JSON.stringify(a.worldEvents) === JSON.stringify(b.worldEvents), '同 seed 的每日事件不一致')
check(a.worldEvents.length > 0, '每日 tick 没有产生任何事件')

if (errors.length) {
  console.error('FAILED')
  errors.forEach((error) => console.error(' -', error))
  process.exit(1)
}

console.log(JSON.stringify({
  ok: true,
  npcs: list.length,
  biasRange: [Math.min(...biases), Math.max(...biases)],
  gift: [gift1.gain, gift2.gain],
  party: run.party.length,
  events: a.worldEvents.slice(0, 3).map((event) => event.text),
}, null, 2))
