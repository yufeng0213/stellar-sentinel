/**
 * NPC 标签系统测试：数量、引用完整性、生成组合、相容度、旧存档补全。
 */

import {
  TAG_BY_ID,
  TAG_CATEGORIES,
  TAG_GROUPS,
  TAGS,
  aggregateTagEffects,
  playerTagKeys,
  tagAffinity,
} from '../src/game-core/npc-tags.js'
import { randomDraft } from '../src/game-core/character.js'
import { createRun } from '../src/game-core/run.js'
import { ensureNpcTags } from '../src/game-core/npc.js'
import { serializeRun, validateRun } from '../src/game/save.js'

const errors = []
const check = (condition, label) => { if (!condition) errors.push(label) }

check(TAGS.length >= 120, '标签数量少于 120')
check(Object.keys(TAG_CATEGORIES).length === 8, '标签分类不是 8 类')
check(new Set(TAGS.map((tag) => tag.id)).size === TAGS.length, '标签 ID 有重复')

const categories = TAGS.reduce((acc, tag) => {
  acc[tag.category] = (acc[tag.category] || 0) + 1
  return acc
}, {})
check(categories.background >= 18, '出身标签不足 18')
check(categories.personality >= 26, '性格标签不足 26')
check(categories.values >= 14, '信念标签不足 14')
check(categories.profession >= 20, '职业标签不足 20')
check(categories.quirk >= 16, '怪癖标签不足 16')
check(categories.social >= 12, '关系标签不足 12')
check(categories.body >= 10, '身体标签不足 10')
check(categories.shadow >= 10, '阴影标签不足 10')

const interests = new Set(['交易', '传闻', '武器', '星图', '共鸣', '遗物', '植物', '机械', '旧技术', '冥想'])
const invalid = []
TAGS.forEach((tag) => {
  if (!tag.desc || !tag.prompt) invalid.push(`${tag.id}:desc`)
  if (!TAG_CATEGORIES[tag.category]) invalid.push(`${tag.id}:category`)
  if (tag.conflicts.includes(tag.id) || tag.excludes.includes(tag.id)) invalid.push(`${tag.id}:self`)
  tag.likes.concat(tag.dislikes, tag.conflicts, tag.excludes).forEach((token) => {
    if (token.startsWith('group:')) {
      if (!TAG_GROUPS[token.slice(6)]) invalid.push(`${tag.id}:${token}`)
    } else if (!TAG_BY_ID[token]) {
      invalid.push(`${tag.id}:${token}`)
    }
  })
  tag.interests.forEach((interest) => {
    if (!interests.has(interest)) invalid.push(`${tag.id}:interest:${interest}`)
  })
})
check(invalid.length === 0, `标签引用无效：${invalid.slice(0, 5).join('、')}`)

const draft = randomDraft()
draft.name = '标签测试'
const run = createRun(draft, 'TAG-TEST')
const list = Object.values(run.npcs)
check(list.length === 18, 'NPC 数量不是 18')

list.forEach((npc) => {
  check(Array.isArray(npc.tags), `${npc.name} 没有标签`)
  check(npc.tags.length >= 5 && npc.tags.length <= 7, `${npc.name} 标签数量不在 5-7`)
  check(new Set(npc.tags).size === npc.tags.length, `${npc.name} 标签重复`)
  check(npc.tags.every((id) => TAG_BY_ID[id]), `${npc.name} 有未知标签`)
  check(npc.tags.some((id) => TAG_BY_ID[id]?.category === 'social'), `${npc.name} 没有社交标签`)
  check(npc.tagEffects && typeof npc.tagEffects === 'object', `${npc.name} 没有 tagEffects`)
  check(typeof npc.tagBias === 'number', `${npc.name} 没有 tagBias`)

  const defs = npc.tags.map((id) => TAG_BY_ID[id])
  for (let i = 0; i < defs.length; i += 1) {
    for (let j = i + 1; j < defs.length; j += 1) {
      const left = defs[i]
      const right = defs[j]
      check(
        !left.conflicts.includes(right.id) &&
        !right.conflicts.includes(left.id) &&
        !left.excludes.includes(right.id) &&
        !right.excludes.includes(left.id),
        `${npc.name} 生成了冲突标签 ${left.id}/${right.id}`
      )
    }
  }
})

check(run.npcs['npc-1'].tags.includes('gossip'), '灰雀缺少关系标签')
check(run.npcs['npc-2'].tags.includes('brave'), '叶卡缺少性格标签')
check(run.npcs['npc-3'].tags.includes('whisperloyal'), '回声缺少信念标签')

const first = run.npcs['npc-1'].tags
const same = createRun(draft, 'TAG-TEST').npcs['npc-1'].tags
check(JSON.stringify(first) === JSON.stringify(same), '同 seed 标签不一致')

const affinity = tagAffinity(first, run.npcs['npc-2'].tags)
check(affinity.score === tagAffinity(run.npcs['npc-2'].tags, first).score, '标签相容度不对称')
check(affinity.score >= -35 && affinity.score <= 35, '标签相容度越界')

const hot = aggregateTagEffects(['hotblooded'])
check(hot.personality.aggression === 18, '标签性格效果没有聚合')
const playerTags = playerTagKeys(run)
check(playerTags.length > 0, '玩家没有派生标签')
check(playerTags.every((id) => TAG_BY_ID[id]), '玩家标签引用无效')

check((run.npcEdges || []).length > 0, '没有 NPC 关系边')
check((run.npcEdges || []).every((edge) => typeof edge.affinity === 'number'), '关系边缺少标签相容度')

const legacy = JSON.parse(JSON.stringify(run))
delete legacy.npcs['npc-4'].tags
delete legacy.npcs['npc-4'].tagEffects
delete legacy.npcEdges[0].affinity
ensureNpcTags(legacy)
check(Array.isArray(legacy.npcs['npc-4'].tags) && legacy.npcs['npc-4'].tags.length >= 5, '旧 NPC 没有补全标签')
check(typeof legacy.npcEdges[0].affinity === 'number', '旧关系边没有补全相容度')

const imported = validateRun(JSON.parse(serializeRun(run)))
check(imported.ok, '带标签的存档校验失败')
check(imported.run.npcs['npc-1'].tags.length >= 5, '存档导入后标签丢失')

if (errors.length) {
  console.error('FAILED')
  errors.forEach((error) => console.error(' -', error))
  process.exit(1)
}

console.log(JSON.stringify({
  ok: true,
  tags: TAGS.length,
  categories,
  npcs: list.length,
  sample: list.slice(0, 3).map((npc) => ({ name: npc.name, tags: npc.tags })),
  affinity,
  playerTags,
}, null, 2))
