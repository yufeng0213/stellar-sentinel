/**
 * 长期记忆与事件叙述测试：每周摘要、prompt 注入、事件细读 prompt 与本地降级。
 */

import { randomDraft } from '../src/game-core/character.js'
import { createRun } from '../src/game-core/run.js'
import { longMemoryText, recordWeeklyMemories } from '../src/game-core/memory.js'
import { buildNpcMessages } from '../src/game/prompt.js'
import { LORE_TIERS, buildLoreMessages } from '../src/game/lore.js'
import {
  buildEventNarrativeMessages,
  localEventNarrative,
  stripNarrative,
} from '../src/game/narrative.js'
import { serializeRun, validateRun } from '../src/game/save.js'

const errors = []
const check = (condition, label) => { if (!condition) errors.push(label) }

const run = createRun(randomDraft(), 'NARRATIVE-TEST')
run.day = 7
const npc = run.npcs['npc-1']
npc.memory.unshift({ day: 5, text: '你们聊了很久。' })
run.worldEvents.unshift({ day: 6, text: `${npc.name} 在空港等你。`, kind: 'good' })
run.npcChats[npc.id] = [
  { role: 'user', text: '最近怎么样？', day: 4 },
  { role: 'npc', text: '还活着。', day: 4 },
]
run.quests = [{
  id: 'q-test',
  npcId: npc.id,
  nodeId: 'n1-0',
  nodeTitle: '旧战场',
  status: 'done',
  createdDay: 4,
  completedDay: 6,
}]

const recorded = recordWeeklyMemories(run)
const entry = npc.longMemory.find((item) => item.week === 1)
check(Array.isArray(recorded) && recorded.length > 0, '没有记录每周记忆')
check(!!entry, '缺少第一周长期记忆')
check(entry.bullets.length > 0, '长期记忆没有要点')
check(entry.text.includes('旧战场') || entry.text.includes('等'), '长期记忆没有收集事件')
check(entry.relation && typeof entry.relation.trust === 'number', '长期记忆没有关系快照')
check(recordWeeklyMemories(run).length === 0, '同一周重复记录记忆')
check(longMemoryText(npc).includes('W1'), '长期记忆文本缺少周数')

const chatMessages = buildNpcMessages(run, npc, [], '你好')
check(JSON.stringify(chatMessages).includes('【长期记忆】'), '对话 prompt 缺少长期记忆段')
const loreMessages = buildLoreMessages(run, npc, LORE_TIERS[0], LORE_TIERS[0].slots[0])
check(JSON.stringify(loreMessages).includes('【长期记忆】'), '探知 prompt 缺少长期记忆段')

const event = {
  type: 'gift',
  title: '测试送礼',
  text: '他递来一件东西。',
  payload: { itemId: 'scrap' },
}
const narrative = buildEventNarrativeMessages(run, event, npc)
check(narrative.messages.length === 2, '事件叙述 prompt 不是两段')
check(narrative.messages[0].content.includes('4-6 句'), '事件叙述 prompt 缺少长度约束')
check(narrative.messages[1].content.includes('测试送礼'), '事件叙述 prompt 缺少事件标题')
const local = localEventNarrative(run, event, npc)
check(typeof local === 'string' && local.length > 10, '本地事件叙述为空')
check(stripNarrative('```\n叙述：这是测试\n```').includes('这是测试'), '事件叙述清理误删内容')

const imported = validateRun(JSON.parse(serializeRun(run)))
check(imported.ok, '带长期记忆的存档校验失败')
check(imported.run.npcs['npc-1'].longMemory.length > 0, '存档导入后长期记忆丢失')

if (errors.length) {
  console.error('FAILED')
  errors.forEach((error) => console.error(' -', error))
  process.exit(1)
}

console.log(JSON.stringify({
  ok: true,
  memory: entry,
  local,
}, null, 2))
