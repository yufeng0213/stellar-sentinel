/**
 * 存档序列化与导入校验。
 * 负责补全旧存档缺失的 NPC 世界、聊天记录与 LLM 预算。
 */

import { createNpcWorld, ensureNpcTags } from '../game-core/npc.js'
import { createCityState } from '../game-core/city.js'
import { ensureDoor } from '../game-core/door.js'
import { ensureStats } from '../game-core/achievements.js'
import { ensureBlueprints } from '../game-core/blueprint.js'
import { ensureCalibration } from '../game-core/calibration.js'
import { ensureDungeon } from '../game-core/dungeon.js'
import { ensureGear } from '../game-core/gear.js'
import { ensureEscorts } from '../game-core/escort.js'
import { ensurePromises } from '../game-core/npc-promises.js'
import { ensureDateState } from '../game-core/date-story.js'
import { ensureReputation } from '../game-core/faction.js'
import { createStoryState } from '../game-core/story.js'

const clone = (value) => JSON.parse(JSON.stringify(value))

function fail(message) {
  return { ok: false, message }
}

export function validateRun(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return fail('不是有效的存档对象')
  }

  let data
  try {
    data = clone(input)
  } catch {
    return fail('存档无法解析')
  }

  if (!data.id || !data.seed) return fail('缺少存档 ID 或种子')
  if (!data.player || typeof data.player !== 'object') return fail('缺少角色数据')
  if (!data.player.attrs || !data.player.name) return fail('角色数据不完整')
  if (!data.map || !Array.isArray(data.map.layers) || !data.map.nodes) return fail('缺少星图数据')

  data.player.species = data.player.species || 'human'
  data.player.landscape = data.player.landscape || 'snowfield'
  data.player.scent = data.player.scent || 'rain'
  data.player.flaw = data.player.flaw || null
  data.player.flaws = Array.isArray(data.player.flaws)
    ? data.player.flaws
    : (data.player.flaw ? [data.player.flaw] : [])
  data.player.skills = Array.isArray(data.player.skills) ? data.player.skills : []
  data.player.traits = Array.isArray(data.player.traits) ? data.player.traits : []
  data.player.perks = data.player.perks || {}
  ;['agi', 'luck'].forEach((key) => {
    if (typeof data.player.attrs[key] !== 'number') data.player.attrs[key] = 4
  })

  const nodeIds = data.map.layers.flat()
  if (!nodeIds.every((id) => data.map.nodes[id])) return fail('星图节点不完整')
  if (!data.map.nodes[data.location]) return fail('当前位置不存在')
  if (!Array.isArray(data.gear) || !data.equipment || !data.inv) return fail('背包数据不完整')

  if (!data.npcs || Object.keys(data.npcs).length === 0) {
    Object.assign(data, createNpcWorld(data))
  } else {
    ensureNpcTags(data)
  }
  Object.values(data.npcs).forEach((npc) => {
    if (!npc.lore || !Array.isArray(npc.lore.entries)) npc.lore = { entries: [] }
    if (!Array.isArray(npc.longMemory)) npc.longMemory = []
  })
  if (!Array.isArray(data.party)) data.party = []
  if (!Array.isArray(data.worldEvents)) data.worldEvents = []
  if (!data.nodeState || typeof data.nodeState !== 'object') data.nodeState = {}
  if (!data.npcChats || typeof data.npcChats !== 'object') data.npcChats = {}
  if (!data.llm || typeof data.llm !== 'object') data.llm = { calls: 0, maxCalls: 120 }
  if (!Array.isArray(data.inbox)) data.inbox = []
  if (!Array.isArray(data.quests)) data.quests = []
  if (!data.eventCooldowns || typeof data.eventCooldowns !== 'object') data.eventCooldowns = {}
  if (!data.eventPity || typeof data.eventPity !== 'object') data.eventPity = {}
  if (typeof data.lastEventDay !== 'number') data.lastEventDay = 0
  if (data.weekly === undefined) data.weekly = null
  if (typeof data.defeats !== 'number') data.defeats = 0
  if (!data.mapSeed && data.map?.seed) data.mapSeed = data.map.seed
  if (!data.story || typeof data.story !== 'object') data.story = createStoryState()
  if (!data.city || typeof data.city !== 'object') data.city = createCityState()
  ensureStats(data)
  ensureBlueprints(data)
  ensureCalibration(data)
  ensureGear(data)
  ensureDoor(data)
  ensureDungeon(data)
  ensureReputation(data)
  ensureEscorts(data)
  ensurePromises(data)
  ensureDateState(data)
  if (!data.story.flags || typeof data.story.flags !== 'object') data.story.flags = {}

  Object.values(data.npcChats).forEach((messages) => {
    if (!Array.isArray(messages)) return
    messages.forEach((message) => {
      if (!message?.streaming) return
      message.streaming = false
      if (!message.text) message.text = '（连接中断）'
    })
  })

  if (data.pendingAmbush && !data.npcs[data.pendingAmbush]) data.pendingAmbush = null
  if (data.battle && data.battle.nodeId && !data.map.nodes[data.battle.nodeId] && !String(data.battle.nodeId).startsWith('ambush-')) {
    data.battle = null
  }

  return { ok: true, run: data }
}

export function serializeRun(run) {
  return JSON.stringify(run, null, 2)
}
