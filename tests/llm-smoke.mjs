/**
 * LLM 对话冒烟测试：prompt 结构、动作白名单解析、本地降级对白。
 * 不调用真实模型。
 */

import { newDraft } from '../src/game-core/character.js'
import { createRun } from '../src/game-core/run.js'
import { buildNpcMessages, localNpcReply, parseNpcAction } from '../src/game/prompt.js'

const errors = []
const check = (condition, label) => { if (!condition) errors.push(label) }

function draft() {
  const d = newDraft()
  d.name = '对话测试'
  d.abo = 'omega'
  d.role = 'guide'
  d.origin = 'broker'
  d.attrs = { per: 6, vit: 5, psi: 7, tec: 5, soc: 7, wil: 6 }
  d.traits = ['dealer', 'resonance']
  return d
}

const run = createRun(draft(), 'LLM-TEST-01')
const npc = Object.values(run.npcs)[0]
npc.relation.trust = 55
npc.relation.closeness = 35
npc.relation.grievance = 0
npc.hostile = false

const history = [
  { role: 'user', text: '你好。' },
  { role: 'npc', text: '“有事？”' },
]
const { messages, canParty } = buildNpcMessages(run, npc, history, '最近星区怎么样？')

check(messages[0].role === 'system', '第一条不是 system')
check(messages[0].content.includes(npc.name), 'system 里没有 NPC 名字')
check(messages[0].content.includes(run.player.name), 'system 里没有玩家名字')
check(messages[0].content.includes('offer_party'), 'system 里没有动作白名单')
check(messages[0].content.includes('warn'), 'system 里没有 warn 规则')
check(messages.at(-1).role === 'user', '最后一条不是玩家消息')
check(messages.at(-1).content === '最近星区怎么样？', '玩家消息不正确')
check(messages.length === 4, '历史消息数量不正确')
check(canParty === true, '满足条件时 canParty 不正确')

const parsed = parseNpcAction('“可以，但别拖后腿。”\n```json\n{"action":"offer_party"}\n```')
check(parsed.action?.type === 'offer_party', '没有解析出 offer_party')
check(!parsed.text.includes('json'), '动作块没有被移除')

const warned = parseNpcAction('“别逼我。”[[action:warn]]')
check(warned.action?.type === 'warn', '没有解析出 warn')
check(warned.text === '“别逼我。”', '标签没有被移除')

const bad = parseNpcAction('```json\n{"action":"attack"}\n```')
check(bad.action === null, '白名单外的动作被接受了')

check(localNpcReply(run, { ...npc, hostile: true }, '你好').includes('武器'), '敌对本地对白不正确')
check(localNpcReply(run, npc, '一起走吗？').includes('证明'), '组队本地对白不正确')

if (errors.length) {
  console.error('FAILED')
  errors.forEach((error) => console.error(' -', error))
  process.exit(1)
}

console.log(JSON.stringify({
  ok: true,
  messages: messages.map((message) => message.role),
  canParty,
  parsed: parsed.action,
  warned: warned.action,
}, null, 2))
