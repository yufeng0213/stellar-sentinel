import { defineStore } from 'pinia'
import { ITEMS } from '../game-core/data.js'
import {
  buyBlackMarketIntel,
  buyCityOffer as buyCityOfferCore,
  buyDoorKey,
  claimCityQuest,
  createCityState,
  ensureCity,
  healAtClinic,
  refreshCityVisitors,
  tavernRumor,
} from '../game-core/city.js'
import { recordEnding } from '../game/collection.js'
import { ensureDoor, resolveDoorFinale, resolveDoorStep } from '../game-core/door.js'
import { endingFor, getEnding, localEpilogue } from '../game-core/ending.js'
import { ensureDungeon, rerollDungeon, setDungeonName } from '../game-core/dungeon.js'
import {
  adjustReputation,
  buyFactionShopItem,
  claimFactionChain,
  claimFactionFavor,
  ensureReputation,
} from '../game-core/faction.js'
import { advanceVisitorStory as advanceVisitorStoryCore } from '../game-core/visitor-story.js'
import { buildDungeonNameMessages, stripDungeonName } from '../game/dungeon.js'
import {
  addLog,
  applyConsumable,
  buyShop as buyShopCore,
  camp,
  craft as craftRun,
  createRun,
  currentNode,
  gather,
  getNode,
  hasMats,
  nodeRemaining,
  reachableNodes,
  restAtNode,
  resolveEvent,
  resolveEventChoice as resolveEventChoiceCore,
  retreatAfterDefeat,
  shopPrice as shopPriceCore,
  skipNode,
  timeLabel,
  toggleEquip,
  travel,
} from '../game-core/run.js'
import {
  createBattle,
  endTurn as endBattleTurnCore,
  fleeBattle as fleeBattleCore,
  playCard as playCardCore,
  resolveBattle as resolveBattleCore,
} from '../game-core/combat.js'
import {
  applyNpcBattleOutcome,
  apologizeToNpc,
  canInviteToParty,
  createNpcWorld,
  ensureNpcTags,
  giftToNpc,
  intimidateNpc,
  inviteToParty as inviteToPartyCore,
  leaveParty as leavePartyCore,
  resolveAmbushPeacefully,
  talkToNpc,
} from '../game-core/npc.js'
import { stealFromNpc, stealFromShop } from '../game-core/steal.js'
import { streamNpcChat } from '../game/llm.js'
import { buildLoreMessages, localLore, loreTarget, stripLore } from '../game/lore.js'
import { buildStoryOpeningMessages, stripStoryOpening } from '../game/story.js'
import { advanceChapter, createStoryState, getAwakening, localOpening, resolveOpeningChoice, startAwakening } from '../game-core/story.js'
import {
  buildEventNarrativeMessages,
  localEventNarrative,
  stripNarrative,
} from '../game/narrative.js'
import { resolveInboxEvent } from '../game-core/npc-events.js'
import { buildNpcMessages, localNpcReply, parseNpcAction } from '../game/prompt.js'
import { serializeRun, validateRun } from '../game/save.js'

const RUN_PREFIX = 'ss.run.'
const LAST_KEY = 'ss.lastRun'

function readRun(id) {
  try {
    return JSON.parse(localStorage.getItem(RUN_PREFIX + id) || 'null')
  } catch {
    return null
  }
}

export const useGameStore = defineStore('game', {
  state: () => ({
    run: null,
    api: 'connecting',
    lastSavedAt: 0,
    toast: null,
    toastTimer: null,
  }),

  getters: {
    player: (state) => state.run?.player || null,
    current: (state) => (state.run ? currentNode(state.run) : null),
    time: (state) => (state.run ? timeLabel(state.run) : '—'),
    hpPct: (state) => (state.run ? Math.round((state.run.player.hp / state.run.player.hpMax) * 100) : 0),
    mentalPct: (state) => (state.run ? Math.round((state.run.player.mental / state.run.player.mentalMax) * 100) : 0),
    reachable: (state) => (state.run ? reachableNodes(state.run) : []),
    battle: (state) => state.run?.battle || null,
  },

  actions: {
    async checkHealth() {
      try {
        const response = await fetch('./api/health')
        const data = await response.json()
        this.api = data.ok ? 'online' : 'offline'
      } catch {
        this.api = 'offline'
      }
    },

    notify(message, kind = '') {
      if (!message) return
      this.toast = { message, kind, id: Date.now() }
      clearTimeout(this.toastTimer)
      this.toastTimer = setTimeout(() => {
        this.toast = null
      }, 2400)
    },

    save() {
      if (!this.run) return
      try {
        localStorage.setItem(RUN_PREFIX + this.run.id, JSON.stringify(this.run))
        localStorage.setItem(LAST_KEY, this.run.id)
        this.lastSavedAt = Date.now()
      } catch {
        this.notify('存档失败：浏览器存储不可用', 'bad')
      }
    },

    lastRunId() {
      try {
        return localStorage.getItem(LAST_KEY)
      } catch {
        return null
      }
    },

    hasSave() {
      const id = this.lastRunId()
      return !!(id && readRun(id))
    },

    resume() {
      const id = this.lastRunId()
      if (!id) return null
      return this.load(id)
    },

    load(id) {
      const stored = readRun(id)
      if (!stored) return null
      if (!stored.npcs || Object.keys(stored.npcs).length === 0) {
        Object.assign(stored, createNpcWorld(stored))
      } else {
        ensureNpcTags(stored)
      }
      Object.values(stored.npcs || {}).forEach((npc) => {
        if (!npc.lore || !Array.isArray(npc.lore.entries)) npc.lore = { entries: [] }
        if (!Array.isArray(npc.longMemory)) npc.longMemory = []
      })
      if (!stored.npcChats) stored.npcChats = {}
      if (!stored.llm) stored.llm = { calls: 0, maxCalls: 120 }
      if (!Array.isArray(stored.inbox)) stored.inbox = []
      if (!Array.isArray(stored.quests)) stored.quests = []
      if (!stored.eventCooldowns || typeof stored.eventCooldowns !== 'object') stored.eventCooldowns = {}
      if (!stored.eventPity || typeof stored.eventPity !== 'object') stored.eventPity = {}
      if (typeof stored.lastEventDay !== 'number') stored.lastEventDay = 0
      if (stored.weekly === undefined) stored.weekly = null
      if (!stored.story || typeof stored.story !== 'object') stored.story = createStoryState()
      if (!stored.city || typeof stored.city !== 'object') stored.city = createCityState()
      ensureDoor(stored)
      ensureDungeon(stored)
      ensureReputation(stored)
      Object.values(stored.npcChats).forEach((messages) => {
        messages.forEach((message) => {
          if (!message.streaming) return
          message.streaming = false
          if (!message.text) message.text = '（连接中断）'
        })
      })
      this.run = stored
      this.save()
      return this.run
    },

    newRun(draft) {
      this.run = createRun(draft)
      this.save()
      return this.run
    },

    startStoryAwakening(id) {
      if (!this.run) return { ok: false, message: '还没有远征' }
      const result = startAwakening(this.run, id)
      if (result.ok) this.save()
      return result
    },

    async generateStoryOpening(useLlm = true) {
      if (!this.run?.story?.awakening) return { ok: false, message: '还没有选择醒来地点' }
      const awakening = getAwakening(this.run.story.awakening)
      if (!awakening) return { ok: false, message: '醒来地点不存在' }
      if (this.run.story.opening?.source === 'llm' && this.run.story.opening.text) {
        return { ok: true, text: this.run.story.opening.text, source: 'llm', cached: true }
      }

      this.run.llm = this.run.llm || { calls: 0, maxCalls: 120 }
      let text = ''
      let source = 'local'
      let error = ''

      if (useLlm && this.run.llm.calls < this.run.llm.maxCalls) {
        const controller = new AbortController()
        const timer = setTimeout(() => controller.abort(), 90000)
        try {
          const { messages } = buildStoryOpeningMessages(this.run, awakening)
          text = await streamNpcChat(messages, () => {}, controller.signal)
          if (stripStoryOpening(text)) {
            source = 'llm'
            this.run.llm.calls += 1
          }
        } catch (cause) {
          error = cause.name === 'AbortError' ? '模型响应超时' : cause.message
          text = ''
          source = 'local'
        } finally {
          clearTimeout(timer)
        }
      } else if (useLlm) {
        error = '本局模型调用预算已用完'
      }

      if (!stripStoryOpening(text)) {
        text = localOpening(this.run, awakening)
        source = 'local'
      }

      this.run.story.opening = {
        text: stripStoryOpening(text),
        source,
        day: this.run.day,
      }
      this.save()
      return { ok: true, text: this.run.story.opening.text, source, error }
    },

    resolveStoryChoice(choiceId) {
      if (!this.run) return { ok: false }
      const result = resolveOpeningChoice(this.run, choiceId)
      if (result.ok) {
        addLog(this.run, result.text, 'story')
        this.save()
      }
      return result
    },

    advanceMainChapter() {
      if (!this.run) return { ok: false }
      const result = advanceChapter(this.run)
      if (result.ok) {
        addLog(this.run, `主线推进：${result.title}。`, 'story')
        this.save()
      } else {
        this.notify(result.message, 'bad')
      }
      return result
    },

    travelTo(nodeId) {
      if (!this.run) return { ok: false }
      const result = travel(this.run, nodeId)
      if (result.ok) this.save()
      else this.notify(result.message, 'bad')
      return result
    },

    gatherAt(nodeId) {
      if (!this.run) return { ok: false }
      const result = gather(this.run, nodeId)
      if (result.ok) this.save()
      else this.notify(result.message, 'bad')
      return result
    },

    resolveEventAt(nodeId) {
      if (!this.run) return { ok: false }
      const result = resolveEvent(this.run, nodeId)
      if (result.ok) this.save()
      else this.notify(result.message, 'bad')
      return result
    },

    chooseEventChoice(nodeId, choiceId) {
      if (!this.run) return { ok: false }
      const result = resolveEventChoiceCore(this.run, nodeId, choiceId)
      if (result.ok) this.save()
      else this.notify(result.message, 'bad')
      return result
    },

    buyShopAt(nodeId, index) {
      if (!this.run) return { ok: false }
      const result = buyShopCore(this.run, nodeId, index)
      if (result.ok) this.save()
      else this.notify(result.message, 'bad')
      return result
    },

    shopPrice(offer) {
      if (!this.run) return offer?.price || 0
      return shopPriceCore(this.run, offer)
    },

    stealNpc(npcId) {
      if (!this.run) return { ok: false }
      const result = stealFromNpc(this.run, npcId)
      if (result.ok) this.save()
      else this.notify(result.message, 'bad')
      return result
    },

    stealShopAt(nodeId, index) {
      if (!this.run) return { ok: false }
      const result = stealFromShop(this.run, nodeId, index)
      if (result.ok) this.save()
      else this.notify(result.message, 'bad')
      return result
    },

    restAt(nodeId) {
      if (!this.run) return { ok: false }
      const result = restAtNode(this.run, nodeId)
      if (result.ok) this.save()
      else this.notify(result.message, 'bad')
      return result
    },

    enterCity() {
      if (!this.run) return null
      ensureCity(this.run)
      this.save()
      return this.run.city
    },

    buyCityOffer(section, index) {
      if (!this.run) return { ok: false }
      const result = buyCityOfferCore(this.run, section, index)
      if (result.ok) this.save()
      else this.notify(result.message, 'bad')
      return result
    },

    healCity() {
      if (!this.run) return { ok: false }
      const result = healAtClinic(this.run)
      if (result.ok) this.save()
      else this.notify(result.message, 'bad')
      return result
    },

    refreshCityVisitors() {
      if (!this.run) return { ok: false }
      const result = refreshCityVisitors(this.run)
      if (result.ok) this.save()
      else this.notify(result.message, 'bad')
      return result
    },

    claimCityQuest(questId) {
      if (!this.run) return { ok: false }
      const result = claimCityQuest(this.run, questId)
      if (result.ok) this.save()
      else this.notify(result.message, 'bad')
      return result
    },

    buyCityIntel() {
      if (!this.run) return { ok: false }
      const result = buyBlackMarketIntel(this.run)
      if (result.ok) this.save()
      else this.notify(result.message, 'bad')
      return result
    },

    buyCityDoorKey() {
      if (!this.run) return { ok: false }
      const result = buyDoorKey(this.run)
      if (result.ok) this.save()
      else this.notify(result.message, 'bad')
      return result
    },

    resolveDoorStep() {
      if (!this.run) return { ok: false }
      const result = resolveDoorStep(this.run)
      if (result.ok) {
        addLog(this.run, result.text, 'story')
        this.save()
      } else {
        this.notify(result.message, 'bad')
      }
      return result
    },

    resolveDoorFinale(choice) {
      if (!this.run) return { ok: false }
      const result = resolveDoorFinale(this.run, choice)
      if (result.ok) {
        recordEnding({
          id: result.endingId,
          title: result.ending.title,
          runId: this.run.id,
          day: this.run.day,
          choice: result.choice,
          successes: result.successes,
          at: Date.now(),
        })
        addLog(this.run, result.text, 'story')
        this.save()
      } else {
        this.notify(result.message, 'bad')
      }
      return result
    },

    ensureEpilogue() {
      if (!this.run?.door?.opened) return null
      if (this.run.epilogue?.text) return this.run.epilogue
      const ending = getEnding(this.run.door.endingId) || endingFor(this.run.door.ending, this.run.door.checks?.filter((check) => check.success).length || 0)
      this.run.epilogue = {
        endingId: ending.id,
        text: localEpilogue(this.run, ending.id),
        source: 'local',
        day: this.run.day,
      }
      this.save()
      return this.run.epilogue
    },

    tavernRumor() {
      if (!this.run) return { ok: false }
      const result = tavernRumor(this.run)
      if (result.ok) this.save()
      else this.notify(result.message, 'bad')
      return result
    },

    async renameDungeon(useLlm = true) {
      if (!this.run) return { ok: false }
      ensureDungeon(this.run)
      if (!useLlm) {
        const result = rerollDungeon(this.run)
        this.save()
        return result
      }

      this.run.llm = this.run.llm || { calls: 0, maxCalls: 120 }
      let name = ''
      let source = 'local'
      let error = ''
      if (this.run.llm.calls < this.run.llm.maxCalls) {
        const controller = new AbortController()
        const timer = setTimeout(() => controller.abort(), 25000)
        try {
          const { messages } = buildDungeonNameMessages(this.run)
          name = stripDungeonName(await streamNpcChat(messages, () => {}, controller.signal))
          if (name) {
            source = 'llm'
            this.run.llm.calls += 1
          }
        } catch (cause) {
          error = cause.name === 'AbortError' ? '模型响应超时' : cause.message
        } finally {
          clearTimeout(timer)
        }
      } else {
        error = '本局模型调用预算已用完'
      }

      if (!name) {
        const result = rerollDungeon(this.run)
        this.save()
        return { ...result, source: 'local', error }
      }
      const result = setDungeonName(this.run, name, source)
      if (!result.ok) {
        const fallback = rerollDungeon(this.run)
        this.save()
        return { ...fallback, source: 'local', error: result.message }
      }
      this.save()
      return { ...result, error }
    },

    skipAt(nodeId) {
      if (!this.run) return { ok: false }
      const result = skipNode(this.run, nodeId)
      if (result.ok) this.save()
      else this.notify(result.message, 'bad')
      return result
    },

    makeCamp() {
      if (!this.run) return { ok: false }
      const result = camp(this.run)
      if (result.ok) this.save()
      else this.notify(result.message, 'bad')
      return result
    },

    craftRecipe(recipeId) {
      if (!this.run) return { ok: false }
      const result = craftRun(this.run, recipeId)
      if (result.ok) this.save()
      else this.notify(result.message, 'bad')
      return result
    },

    equip(uid) {
      if (!this.run) return
      toggleEquip(this.run, uid)
      this.save()
    },

    consume(itemId) {
      if (!this.run) return { ok: false }
      const def = ITEMS[itemId]
      if (!def) return { ok: false }
      const result = applyConsumable(this.run, itemId, def)
      if (result.ok) this.save()
      else this.notify(result.message, 'bad')
      return result
    },

    remaining(node) {
      return this.run ? nodeRemaining(this.run, node) : 0
    },

    node(nodeId) {
      return this.run ? getNode(this.run, nodeId) : null
    },

    canCraft(recipe) {
      return this.run ? hasMats(this.run, recipe) : false
    },

    ensureBattle(nodeId) {
      if (!this.run) return null
      if (this.run.battle && this.run.battle.nodeId === nodeId) return this.run.battle
      const node = getNode(this.run, nodeId)
      if (!node || !['battle', 'elite', 'boss'].includes(node.type)) return null
      if (this.run.cleared.includes(nodeId)) return null
      if (this.run.battle && this.run.battle.nodeId !== nodeId) {
        this.notify('先处理当前战斗', 'bad')
        return null
      }
      if (!this.run.battle) {
        this.run.battle = createBattle(this.run, node)
        this.save()
      }
      return this.run.battle
    },

    playBattleCard(handIndex, targetIndex) {
      if (!this.run?.battle) return { ok: false }
      const result = playCardCore(this.run.battle, this.run, handIndex, targetIndex)
      if (result.ok) this.save()
      else this.notify(result.message, 'bad')
      return result
    },

    endBattleTurn() {
      if (!this.run?.battle) return { ok: false }
      const result = endBattleTurnCore(this.run.battle, this.run)
      this.save()
      return result
    },

    fleeBattle() {
      if (!this.run?.battle) return { ok: false }
      const npcId = this.run.battle.npcId
      const result = fleeBattleCore(this.run, this.run.battle)
      if (result.ok) {
        if (npcId && this.run.npcs?.[npcId]) {
          const npc = this.run.npcs[npcId]
          npc.relation.grievance = Math.min(100, npc.relation.grievance + 8)
          npc.relation.trust = Math.max(0, npc.relation.trust - 4)
        }
        this.run.battle = null
        this.save()
      }
      return result
    },

    resolveBattleChoice(choice) {
      if (!this.run?.battle) return { ok: false }
      const npcId = this.run.battle.npcId
      const result = resolveBattleCore(this.run, this.run.battle, choice)
      if (result.ok) {
        if (npcId && this.run.npcs?.[npcId]) {
          applyNpcBattleOutcome(this.run, npcId, choice)
        }
        this.run.battle = null
        this.save()
      } else {
        this.notify(result.message, 'bad')
      }
      return result
    },

    leaveBattle() {
      if (!this.run?.battle) return { ok: false }
      if (this.run.battle.status === 'lost') {
        const result = retreatAfterDefeat(this.run)
        this.save()
        return result
      }
      if (this.run.battle.status === 'fled') {
        this.run.battle = null
        this.save()
        return { ok: true }
      }
      return { ok: false }
    },

    async discoverNpcLore(npcId, tierId = null, useLlm = true) {
      if (!this.run) return { ok: false, message: '还没有远征' }
      const npc = this.run.npcs?.[npcId]
      if (!npc) return { ok: false, message: '找不到这个人' }
      if (!npc.lore || !Array.isArray(npc.lore.entries)) npc.lore = { entries: [] }

      const target = loreTarget(npc, tierId)
      if (!target.ok) return target

      this.run.llm = this.run.llm || { calls: 0, maxCalls: 120 }
      let text = ''
      let source = 'local'
      let error = ''

      if (useLlm && this.run.llm.calls < this.run.llm.maxCalls) {
        try {
          const { messages } = buildLoreMessages(this.run, npc, target.tier, target.slot)
          text = await streamNpcChat(messages, () => {})
          this.run.llm.calls += 1
          source = 'llm'
        } catch (cause) {
          error = cause.message
          text = ''
          source = 'local'
        }
      } else if (useLlm) {
        error = '本局模型调用预算已用完'
      }

      if (!stripLore(text)) {
        text = localLore(this.run, npc, target.tier, target.slot)
        source = 'local'
      }

      const entry = {
        id: `${target.tier.id}-${target.slot.id}`,
        tier: target.tier.id,
        tierName: target.tier.name,
        slot: target.slot.id,
        slotLabel: target.slot.label,
        text: stripLore(text),
        day: this.run.day,
        source,
      }
      npc.lore.entries.push(entry)
      this.save()
      return { ok: true, entry, source, error }
    },

    giftNpc(npcId, itemId) {
      if (!this.run) return { ok: false }
      const result = giftToNpc(this.run, npcId, itemId)
      if (result.ok) {
        const npc = this.run.npcs?.[npcId]
        if (npc?.faction) adjustReputation(this.run, npc.faction, 2, '送礼')
        this.save()
      }
      return result
    },

    talkNpc(npcId, topic) {
      if (!this.run) return { ok: false }
      const result = talkToNpc(this.run, npcId, topic)
      if (result.ok) {
        const npc = this.run.npcs?.[npcId]
        if (npc?.faction) adjustReputation(this.run, npc.faction, 1, '交谈')
        this.save()
      }
      return result
    },

    adjustFaction(factionId, delta, reason = '') {
      if (!this.run) return { ok: false }
      const result = adjustReputation(this.run, factionId, delta, reason)
      if (result.ok) this.save()
      return result
    },

    claimFactionFavor(factionId) {
      if (!this.run) return { ok: false }
      const result = claimFactionFavor(this.run, factionId)
      if (result.ok) this.save()
      else this.notify(result.message, 'bad')
      return result
    },

    claimFactionChain(factionId) {
      if (!this.run) return { ok: false }
      const result = claimFactionChain(this.run, factionId)
      if (result.ok) this.save()
      else this.notify(result.message, 'bad')
      return result
    },

    buyFactionShop(factionId, index) {
      if (!this.run) return { ok: false }
      const result = buyFactionShopItem(this.run, factionId, index)
      if (result.ok) this.save()
      else this.notify(result.message, 'bad')
      return result
    },

    advanceVisitorStory(npcId) {
      if (!this.run) return { ok: false }
      const result = advanceVisitorStoryCore(this.run, npcId)
      if (result.ok) this.save()
      else this.notify(result.message, 'bad')
      return result
    },

    threatenNpc(npcId) {
      if (!this.run) return { ok: false }
      const result = intimidateNpc(this.run, npcId)
      if (result.ok) this.save()
      return result
    },

    apologizeNpc(npcId) {
      if (!this.run) return { ok: false }
      const result = apologizeToNpc(this.run, npcId)
      if (result.ok) this.save()
      return result
    },

    inviteNpc(npcId) {
      if (!this.run) return { ok: false }
      const result = inviteToPartyCore(this.run, npcId)
      if (result.ok) this.save()
      return result
    },

    leaveNpc(npcId) {
      if (!this.run) return { ok: false }
      const result = leavePartyCore(this.run, npcId)
      if (result.ok) this.save()
      return result
    },

    settleAmbush() {
      const npcId = this.run?.pendingAmbush
      if (!npcId) return { ok: false }
      const result = resolveAmbushPeacefully(this.run, npcId)
      if (result.ok) this.save()
      return result
    },

    resolveInbox(eventId, choiceId) {
      if (!this.run) return { ok: false }
      const result = resolveInboxEvent(this.run, eventId, choiceId)
      if (result.ok) this.save()
      else this.notify(result.message, 'bad')
      return result
    },

    async narrateInboxEvent(eventId, useLlm = true) {
      if (!this.run) return { ok: false, message: '还没有远征' }
      const event = (this.run.inbox || []).find((item) => item.id === eventId)
      if (!event) return { ok: false, message: '找不到这条消息' }
      if (event.narrative) return { ok: true, text: event.narrative, source: event.narrativeSource, cached: true }
      const npc = this.run.npcs?.[event.npcId]
      if (!npc) return { ok: false, message: '联系人已经不在了' }

      this.run.llm = this.run.llm || { calls: 0, maxCalls: 120 }
      let text = ''
      let source = 'local'
      let error = ''

      if (useLlm && this.run.llm.calls < this.run.llm.maxCalls) {
        try {
          const { messages } = buildEventNarrativeMessages(this.run, event, npc)
          text = await streamNpcChat(messages, () => {})
          this.run.llm.calls += 1
          source = 'llm'
        } catch (cause) {
          error = cause.message
          text = ''
          source = 'local'
        }
      } else if (useLlm) {
        error = '本局模型调用预算已用完'
      }

      if (!stripNarrative(text)) {
        text = localEventNarrative(this.run, event, npc)
        source = 'local'
      }

      event.narrative = stripNarrative(text)
      event.narrativeSource = source
      event.narrativeDay = this.run.day
      this.save()
      return { ok: true, text: event.narrative, source, error }
    },

    startAmbushBattle() {
      if (!this.run?.pendingAmbush) return null
      const npc = this.run.npcs?.[this.run.pendingAmbush]
      const current = this.run.map.nodes[this.run.location]
      if (!npc || !current) return null

      const node = {
        id: `ambush-${npc.id}-${this.run.day}`,
        type: 'battle',
        region: current.region,
        accent: current.accent,
        title: `伏击 · ${npc.name}`,
        subtitle: '私人恩怨',
        enemy: {
          name: npc.name,
          hp: npc.combat.hp,
          morale: npc.combat.morale,
          attack: npc.combat.attack,
          traits: [...npc.combat.traits],
        },
      }

      this.run.map.nodes[node.id] = node
      this.run.battle = createBattle(this.run, node)
      this.run.battle.npcId = npc.id
      this.run.pendingAmbush = null
      this.save()
      return node.id
    },

    async sendNpcChat(npcId, text, useLlm = true) {
      const content = String(text || '').trim()
      if (!this.run || !content) return { ok: false }
      const npc = this.run.npcs?.[npcId]
      if (!npc || !npc.alive) return { ok: false, message: '他无法回应' }

      if (!this.run.npcChats) this.run.npcChats = {}
      const chats = this.run.npcChats[npcId] || (this.run.npcChats[npcId] = [])
      const history = [...chats]
      chats.push({ role: 'user', text: content, day: this.run.day })
      if (chats.length > 30) chats.splice(0, chats.length - 30)
      this.run.llm = this.run.llm || { calls: 0, maxCalls: 120 }
      this.save()

      chats.push({ role: 'npc', text: '', streaming: true, day: this.run.day })
      const placeholder = chats[chats.length - 1]
      let full = ''
      let fallback = false
      let errorMessage = ''
      const controller = new AbortController()
      let timeout = setTimeout(() => controller.abort(), 30000)
      const armTimeout = (ms) => {
        clearTimeout(timeout)
        timeout = setTimeout(() => controller.abort(), ms)
      }

      try {
        if (!useLlm) throw new Error('未配置模型')
        if (this.run.llm.calls >= this.run.llm.maxCalls) {
          throw new Error('本局模型调用预算已用完')
        }
        const { messages } = buildNpcMessages(this.run, npc, history, content)
        await streamNpcChat(messages, (delta) => {
          full += delta
          placeholder.text = full
          // 有增量就重置看门狗；流停住 10 秒就结束，避免按钮永远卡在“…” 
          armTimeout(20000)
        }, controller.signal)
        this.run.llm.calls += 1
      } catch (error) {
        errorMessage = error.name === 'AbortError' ? '模型响应超时' : error.message
        // 已经收到正文时只结束流，不再覆盖成“失败”
        if (!full.trim()) fallback = true
      } finally {
        clearTimeout(timeout)
        placeholder.streaming = false
        if (!full.trim()) {
          full = localNpcReply(this.run, npc, content)
          placeholder.text = full
          placeholder.fallback = true
          fallback = true
          if (!errorMessage) errorMessage = '模型没有返回内容'
        }
      }

      const parsed = parseNpcAction(full)
      placeholder.text = parsed.text || (parsed.action ? '（他没有说话。）' : full)

      if (parsed.action) this.applyDialogueAction(npcId, parsed.action)
      this.applyChatEffect(npc, content)
      this.save()
      return { ok: true, fallback, error: errorMessage }
    },

    applyDialogueAction(npcId, action) {
      const npc = this.run?.npcs?.[npcId]
      const chats = this.run?.npcChats?.[npcId]
      if (!npc || !chats) return

      const note = (text) => chats.push({ role: 'system', text, day: this.run.day })

      if (action.type === 'offer_party') {
        const check = canInviteToParty(this.run, npcId)
        if (!check.ok) {
          note(`入队条件不足：${check.reason}`)
          return
        }
        const result = inviteToPartyCore(this.run, npcId)
        note(result.ok ? `${npc.name} 加入了队伍。` : `组队失败：${result.message}`)
      } else if (action.type === 'warn') {
        if (!npc.hostile && npc.relation.grievance < 40) {
          note('他把火气压了下去。')
          return
        }
        npc.relation.fear = Math.min(100, npc.relation.fear + 3)
        npc.relation.trust = Math.max(0, npc.relation.trust - 2)
        npc.relation.grievance = Math.min(100, npc.relation.grievance + 2)
        note('他警告了你。')
      } else if (action.type === 'leave') {
        note('对话结束。')
      }
    },

    applyChatEffect(npc, content) {
      if (!this.run) return
      if (!npc.hostile) {
        if (npc.chatDay !== this.run.day) {
          npc.chatDay = this.run.day
          npc.chatCount = 0
        }
        if ((npc.chatCount || 0) < 2) {
          npc.relation.trust = Math.min(100, npc.relation.trust + 1)
          npc.relation.closeness = Math.min(100, npc.relation.closeness + 1)
          npc.chatCount = (npc.chatCount || 0) + 1
        }
      }
      npc.memory.unshift({ day: this.run.day, text: `对话：${content.slice(0, 18)}` })
      if (npc.memory.length > 8) npc.memory.length = 8
    },

    exportRun() {
      return this.run ? serializeRun(this.run) : null
    },

    importRun(text) {
      let data
      try {
        data = JSON.parse(String(text))
      } catch {
        return { ok: false, message: '存档不是合法 JSON' }
      }
      const result = validateRun(data)
      if (!result.ok) return result
      this.run = result.run
      this.save()
      return { ok: true, id: this.run.id }
    },

    deleteCurrentRun() {
      if (!this.run) return { ok: false }
      const id = this.run.id
      try {
        localStorage.removeItem('ss.run.' + id)
        if (localStorage.getItem('ss.lastRun') === id) {
          localStorage.removeItem('ss.lastRun')
        }
      } catch {
        return { ok: false, message: '浏览器存储不可用' }
      }
      this.run = null
      return { ok: true, id }
    },

    log(text, kind = 'info') {
      if (!this.run) return
      addLog(this.run, text, kind)
      this.save()
    },
  },
})
