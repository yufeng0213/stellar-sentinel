/**
 * NPC 规模与名字库：中文/英文名字唯一性、500 NPC 生成、稀疏关系图。
 */

import { randomDraft } from '../src/game-core/character.js'
import { createRun } from '../src/game-core/run.js'
import { createNpcWorld, npcList } from '../src/game-core/npc.js'

const errors = []
const check = (condition, label) => { if (!condition) errors.push(label) }

const run = createRun(randomDraft(), 'SCALE-TEST')
const defaultList = npcList(run)
check(defaultList.length === 18, '默认 NPC 数量错误')
check(new Set(defaultList.map((npc) => npc.name)).size === 18, '默认 NPC 名字重复')

const world = createNpcWorld(run, 500)
const list = Object.values(world.npcs)
check(list.length === 500, '没有生成 500 个 NPC')
check(new Set(list.map((npc) => npc.name)).size === 500, '500 NPC 名字有重复')
check(list.some((npc) => /^[A-Z][a-z]+/.test(npc.name)), '名字库没有英文名')
check(list.filter((npc) => npc.tier === 'core').length === 24, '核心 NPC 分层错误')
check(list.filter((npc) => npc.tier === 'background').length > 0, '没有背景 NPC 分层')
check(world.npcEdges.length <= 1600, '关系边数量过高')
const degree = new Map()
world.npcEdges.forEach((edge) => {
  degree.set(edge.a, (degree.get(edge.a) || 0) + 1)
  degree.set(edge.b, (degree.get(edge.b) || 0) + 1)
})
check([...degree.values()].every((value) => value <= 4), '存在超过 4 条关系的 NPC')

const same = createNpcWorld(run, 500)
check(list[42].name === Object.values(same.npcs)[42].name, '同一 seed 的名字不确定')

console.log(JSON.stringify({
  ok: errors.length === 0,
  defaultCount: defaultList.length,
  scaleCount: list.length,
  uniqueNames: new Set(list.map((npc) => npc.name)).size,
  englishExample: list.find((npc) => /^[A-Z][a-z]+/.test(npc.name))?.name,
  edges: world.npcEdges.length,
  maxDegree: Math.max(...degree.values(), 0),
  errors,
}, null, 2))

if (errors.length) process.exit(1)
