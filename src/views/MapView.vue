<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ATTR_NAME, GEAR, ITEMS, NODE_TYPES, REGIONS, SITE_APPROACHES, SITE_ENCOUNTERS, SKILLS } from '../game-core/data.js'
import { EXPEDITION_CONTRACTS, EXPEDITION_MODIFIERS, expeditionProgress } from '../game-core/expedition.js'
import { localSettlementReport } from '../game/settlement.js'
import { combatThreat } from '../game-core/combat-difficulty.js'
import { useGameStore } from '../stores/game.js'

const game = useGameStore()
const router = useRouter()
const run = computed(() => game.run)
const current = computed(() => game.current)
const selectedId = ref(null)
const dungeonBoard = ref(null)
const settling = ref(null)
const nightReport = ref('')
const reportBusy = ref(false)
let settleTimer = null
const selectedThreat = computed(() => (
  run.value && selected.value ? combatThreat(run.value, selected.value) : null
))

const mapExhausted = computed(() => {
  const value = run.value
  const bossId = value?.map?.bossId
  if (!bossId) return false
  const defeated = (value.cleared || []).includes(bossId) || (value.bossKills?.[bossId] || 0) > 0
  return defeated && value.location === bossId
})

const ACT_NAMES = {
  1: '第一幕 · 白塔的余烬',
  2: '第二幕 · 更深的低语',
  3: '第三幕 · 门',
}

const selected = computed(() => (selectedId.value ? game.node(selectedId.value) : null))
const selectedType = computed(() => (selected.value ? NODE_TYPES[selected.value.type] : null))
const selectedRegion = computed(() => (selected.value ? REGIONS[selected.value.region] : null))
const selectedState = computed(() => (selected.value ? stateOf(selected.value.id) : 'locked'))
const selectedCleared = computed(() => (selected.value ? run.value.cleared.includes(selected.value.id) : false))
const remaining = computed(() => (selected.value ? game.remaining(selected.value) : 0))
const eventResult = ref(null)
const shopResult = ref('')
const shopOffers = computed(() => {
  const stock = selected.value?.stock
  if (!Array.isArray(stock)) return []
  return stock.map((offer) => (
    typeof offer === 'string' ? { kind: 'item', key: offer, price: 30, stock: 1 } : offer
  ))
})

const region = computed(() => (current.value ? REGIONS[current.value.region] : null))
const actTitle = computed(() => ACT_NAMES[run.value?.act] || '星区')

const clearedCount = computed(() => run.value?.cleared.length || 0)
const reachableIds = computed(() => new Set(current.value?.next || []))
const expedition = computed(() => run.value?.expedition || null)
const expeditionContract = computed(() => (
  expedition.value?.contract ? EXPEDITION_CONTRACTS[expedition.value.contract] : null
))
const expeditionModifiers = computed(() => (expedition.value?.modifiers || [])
  .map((id) => EXPEDITION_MODIFIERS[id])
  .filter(Boolean))
const expeditionState = computed(() => (run.value ? expeditionProgress(run.value) : { current: 0, goal: 0 }))
const expeditionPending = computed(() => expedition.value?.status === 'pending')
const siteEncounter = computed(() => {
  const node = selected.value
  if (!node || node.type !== 'site' || !node.site?.encounter) return null
  const state = run.value?.nodeState?.[node.id]
  if ((state?.depth || 0) !== 2 || state?.encounterDone) return null
  return SITE_ENCOUNTERS[node.site.encounter] || SITE_ENCOUNTERS.guardian
})

function chooseExpedition(id) {
  game.chooseExpedition(id)
}

const DUNGEON = {
  padX: 64,
  colGap: 228,
  tileW: 132,
  tileH: 78,
  height: 468,
}

const dungeonPositions = computed(() => {
  if (!run.value) return {}
  const layers = run.value.map.layers
  const positions = {}

  layers.forEach((layerIds, layerIndex) => {
    const count = layerIds.length
    const ys = count === 1
      ? [DUNGEON.height / 2]
      : count === 2
        ? [DUNGEON.height * 0.34, DUNGEON.height * 0.68]
        : [DUNGEON.height * 0.2, DUNGEON.height * 0.5, DUNGEON.height * 0.8]
    layerIds.forEach((nodeId, slot) => {
      positions[nodeId] = {
        x: DUNGEON.padX + DUNGEON.tileW / 2 + layerIndex * DUNGEON.colGap,
        y: ys[slot] ?? DUNGEON.height / 2,
        layer: layerIndex,
      }
    })
  })

  return positions
})

const dungeonWidth = computed(() => {
  const columns = run.value?.map.layers.length || 1
  return DUNGEON.padX * 2 + DUNGEON.tileW + (columns - 1) * DUNGEON.colGap
})

const dungeonNodes = computed(() => (run.value?.map.layers || [])
  .flat()
  .map((nodeId) => {
    const node = run.value.map.nodes[nodeId]
    const position = dungeonPositions.value[nodeId]
    return node && position ? { node, ...position } : null
  })
  .filter(Boolean)
  .sort((left, right) => left.layer - right.layer))

const dungeonLines = computed(() => {
  if (!run.value) return []
  const lines = []
  Object.values(run.value.map.nodes).forEach((node) => {
    const from = dungeonPositions.value[node.id]
    if (!from) return
    ;(node.next || []).forEach((nextId) => {
      const to = dungeonPositions.value[nextId]
      if (!to) return
      const startX = from.x + DUNGEON.tileW / 2
      const endX = to.x - DUNGEON.tileW / 2
      const midX = (startX + endX) / 2
      lines.push({
        id: `${node.id}-${nextId}`,
        d: `M ${startX} ${from.y} H ${midX} V ${to.y} H ${endX}`,
        active: run.value.location === node.id || reachableIds.value.has(nextId),
        cleared: run.value.cleared.includes(nextId),
      })
    })
  })
  return lines
})

function scrollToCurrent() {
  const board = dungeonBoard.value
  const currentId = run.value?.location
  if (!board || !currentId) return
  const tile = board.querySelector(`[data-node="${currentId}"]`)
  if (!tile) return
  const boardRect = board.getBoundingClientRect()
  const tileRect = tile.getBoundingClientRect()
  board.scrollLeft += tileRect.left - boardRect.left - (board.clientWidth - tile.clientWidth) / 2
}

onMounted(() => nextTick(scrollToCurrent))
watch(() => run.value?.location, () => nextTick(scrollToCurrent))

function stateOf(nodeId) {
  if (!run.value) return 'locked'
  if (run.value.location === nodeId) return 'current'
  if (run.value.cleared.includes(nodeId)) return 'cleared'
  if (reachableIds.value.has(nodeId)) return 'reachable'
  return 'locked'
}

function stateLabel(nodeId) {
  return {
    current: '当前位置',
    cleared: '已探索',
    reachable: '可前往',
    locked: '未连通',
  }[stateOf(nodeId)]
}

function layerHasCurrent(layerIds) {
  return layerIds.includes(run.value?.location)
}

function questAt(nodeId) {
  return (run.value?.quests || []).find((quest) => quest.status === 'active' && quest.nodeId === nodeId)
}

function openNode(nodeId) {
  eventResult.value = null
  shopResult.value = ''
  const state = stateOf(nodeId)
  if (state === 'reachable') {
    const result = game.travelTo(nodeId)
    if (!result.ok) return
    selectedId.value = nodeId
    return
  }
  if (state === 'locked') {
    const node = game.node(nodeId)
    if (!node) return
    if (!run.value.visited.includes(nodeId)) {
      game.notify('这条航线没有连通', 'bad')
      return
    }
  }
  selectedId.value = nodeId
}

function closeSheet() {
  selectedId.value = null
  eventResult.value = null
  shopResult.value = ''
}

function doGather() {
  if (!selected.value) return
  const result = game.gatherAt(selected.value.id)
  if (!result.ok) return
  if (result.gains && Object.keys(result.gains).length) {
    game.notify(Object.keys(result.gains).map((key) => `${ITEMS[key].name} ×${result.gains[key]}`).join('、'), 'good')
  } else {
    game.notify('什么也没找到', '')
  }
}

function doSite(approach) {
  if (!selected.value) return
  const result = game.exploreSiteAt(selected.value.id, approach.id)
  if (!result.ok) return
  if (result.cleared) game.notify('探索点已到底', 'good')
}

function startFactionExpedition() {
  if (!selected.value || !run.value) return
  const nodeId = game.startFactionExpeditionBattle(selected.value.id)
  if (!nodeId) return
  router.push({ name: 'battle', params: { runId: run.value.id, nodeId } })
}

function factionApproach(choice) {
  if (!selected.value) return
  game.resolveFactionExpeditionApproach(selected.value.id, choice)
}

function factionOutcome(choice) {
  if (!selected.value) return
  game.resolveFactionExpeditionOutcome(selected.value.id, choice)
}

function siteDc(approach) {
  if (!selected.value) return 0
  const depth = run.value?.nodeState?.[selected.value.id]?.depth || 0
  return (selected.value.site?.dc || 11) + depth * 2 + (approach.dcMod || 0)
}

function siteAttr(approach) {
  if (approach.id === 'force') return selected.value?.site?.attr || 'per'
  return approach.attr
}

function siteEncounterDc(choice) {
  if (!selected.value) return 0
  return (selected.value.site?.dc || 11) + 5 + (choice.dcMod || 0)
}

function doSiteEncounter(choice) {
  if (!selected.value) return
  const result = game.resolveSiteEncounterAt(selected.value.id, choice.id)
  if (!result.ok) return
  if (result.battleNodeId && run.value) {
    router.push({ name: 'battle', params: { runId: run.value.id, nodeId: result.battleNodeId } })
    return
  }
  game.notify(result.reward || '深层遭遇已处理', result.success ? 'good' : 'bad')
}

function doEvent() {
  if (!selected.value) return
  game.resolveEventAt(selected.value.id)
}

function doEventChoice(choiceId) {
  if (!selected.value) return
  const result = game.chooseEventChoice(selected.value.id, choiceId)
  if (result.ok) {
    eventResult.value = { text: result.text, success: result.success }
  }
}

function offerName(offer) {
  if (!offer) return ''
  if (offer.kind === 'gear') {
    const gear = GEAR[offer.key]
    return `${gear?.name || offer.key}${offer.quality ? ` · ${offer.quality}` : ''}`
  }
  return ITEMS[offer.key]?.name || offer.key
}

function offerGlyph(offer) {
  if (!offer) return '·'
  if (offer.kind === 'gear') return '⚒'
  return ITEMS[offer.key]?.glyph || '·'
}

function doBuy(index) {
  if (!selected.value) return
  const result = game.buyShopAt(selected.value.id, index)
  if (result.ok) game.notify(`买下 ${offerName(result.offer)}`, 'good')
}

function priceOf(offer) {
  return game.shopPrice(offer)
}

function doSteal(index) {
  if (!selected.value) return
  const result = game.stealShopAt(selected.value.id, index)
  if (result.ok) {
    shopResult.value = result.text
    game.notify(result.success ? '顺手牵羊成功' : '被摊主发现了', result.success ? 'good' : 'bad')
  }
}

function doRest() {
  if (!selected.value) return
  game.restAt(selected.value.id)
}

function doSkip() {
  if (!selected.value) return
  game.skipAt(selected.value.id)
}

function goDate() {
  if (!selected.value || !run.value) return
  router.push({ name: 'date', params: { runId: run.value.id, nodeId: selected.value.id } })
}

function goCityNode() {
  if (!selected.value || !run.value) return
  const result = game.visitCity(selected.value.id)
  if (result.ok) router.push({ name: 'city', params: { runId: run.value.id } })
}

function goBattle() {
  if (!selected.value || !run.value) return
  const nodeId = selected.value.id
  if (run.value.battle && run.value.battle.nodeId !== nodeId) {
    game.notify('先处理当前战斗', 'bad')
    return
  }
  const battle = game.ensureBattle(nodeId)
  if (!battle) return
  closeSheet()
  router.push({ name: 'battle', params: { runId: run.value.id, nodeId } })
}

function camp() {
  if (!run.value || settling.value) return
  const before = run.value.worldEvents?.length || 0
  const result = game.makeCamp()
  if (!result?.ok) return
  game.enhanceBackgroundMessages(true)
  game.autoRefreshForumPost()
  selectedId.value = run.value.location
  const events = (run.value.worldEvents || []).slice(0, Math.max(0, (run.value.worldEvents?.length || 0) - before)).slice(0, 10)
  settling.value = { progress: 0, phase: '扫描空港', done: false, events }
  nightReport.value = localSettlementReport(run.value, events)
  reportBusy.value = false
  clearInterval(settleTimer)
  settleTimer = setInterval(() => {
    if (!settling.value) return
    settling.value.progress = Math.min(100, settling.value.progress + 7)
    settling.value.phase = settling.value.progress < 35
      ? '扫描空港'
      : settling.value.progress < 70
        ? '推断 NPC 行动'
        : '整理新事件'
    if (settling.value.progress >= 100) {
      settling.value.done = true
      clearInterval(settleTimer)
      settleTimer = null
    }
  }, 80)
}

function closeSettle() {
  settling.value = null
  nightReport.value = ''
  reportBusy.value = false
  clearInterval(settleTimer)
  settleTimer = null
}

async function writeNightReport() {
  if (!settling.value || reportBusy.value) return
  reportBusy.value = true
  const result = await game.generateSettlementReport(settling.value.events.map((event) => event.text), true)
  nightReport.value = result.text || nightReport.value
  reportBusy.value = false
  if (result.error) game.notify(`夜报使用本地版本：${result.error}`, 'bad')
}

onBeforeUnmount(() => clearInterval(settleTimer))

function goCity() {
  if (!run.value) return
  router.push({ name: 'city', params: { runId: run.value.id } })
}

function nextNodes(node) {
  return (node.next || []).map((id) => game.node(id)).filter(Boolean)
}
</script>

<template>
  <div v-if="run" class="run-page">
    <section class="map-head panel" :style="{ '--accent': region?.accent }">
      <div class="head-copy">
        <p class="kicker">EXPEDITION · {{ run.dungeon?.name || run.seed }}</p>
        <h2>{{ actTitle }}</h2>
        <p class="sub">
          {{ region?.name }} · 已探索 {{ clearedCount }} / {{ run.map.layers.flat().length }} 节点
        </p>
      </div>
      <div class="head-actions">
        <span v-if="run.story" class="tag violet">主线 {{ run.story.chapter }} · {{ run.story.title }}</span>
        <span class="tag cyan">AP {{ run.ap }} / {{ run.apMax }}</span>
        <button type="button" class="btn btn-sm" @click="goCity">回城</button>
        <button
          type="button"
          class="btn btn-sm"
          :disabled="run.ap > 0 && !mapExhausted"
          :title="mapExhausted ? '星图已经清理，扎营会重排下一张星图' : '消耗完行动点后扎营'"
          @click="camp"
        >
          {{ mapExhausted ? '扎营 · 重排星图' : '扎营' }}
        </button>
      </div>
    </section>

    <section v-if="expeditionContract" class="panel expedition-bar" :class="{ 'is-complete': expedition?.completed }">
      <div class="expedition-main">
        <p class="kicker">EXPEDITION CONTRACT</p>
        <b>{{ expeditionContract.title }}</b>
        <span>{{ expeditionContract.desc }}</span>
      </div>
      <div class="expedition-progress">
        <b>{{ Math.min(expeditionState.current, expeditionState.goal) }} / {{ expeditionState.goal }}</b>
        <span>{{ expedition?.completed ? '已完成' : '进行中' }}</span>
      </div>
      <div class="expedition-mods">
        <span v-for="modifier in expeditionModifiers" :key="modifier.id" class="modifier-chip" :title="modifier.desc">
          {{ modifier.name }}
        </span>
      </div>
    </section>

    <section class="map-board panel">
      <div class="board-head">
        <span class="kicker">DUNGEON · {{ run.map.layers.length }} 个房间层</span>
        <span class="hint">从左往右推进 · 横向滑动查看整层 · 直角连线即通路</span>
      </div>

      <div ref="dungeonBoard" class="dungeon-board">
        <div
          class="dungeon-inner"
          :style="{ width: `${dungeonWidth}px`, height: `${DUNGEON.height}px` }"
        >
          <svg
            class="dungeon-links"
            :viewBox="`0 0 ${dungeonWidth} ${DUNGEON.height}`"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <path
              v-for="line in dungeonLines"
              :key="line.id"
              :d="line.d"
              fill="none"
              :class="{ 'is-active': line.active, 'is-cleared': line.cleared }"
            />
          </svg>

          <span
            v-for="(layerIds, index) in run.map.layers"
            :key="`floor-${index}`"
            class="dungeon-floor"
            :style="{ left: `${dungeonPositions[layerIds[0]]?.x || 0}px` }"
          >F{{ index + 1 }}</span>

          <button
            v-for="entry in dungeonNodes"
            :key="entry.node.id"
            type="button"
            class="dungeon-tile"
            :data-node="entry.node.id"
            :class="[
              `is-${stateOf(entry.node.id)}`,
              { 'is-quest': questAt(entry.node.id), 'is-act-end': entry.layer === run.map.layers.length - 1, 'is-risk': entry.node.risk },
            ]"
            :style="{ left: `${entry.x}px`, top: `${entry.y}px`, '--accent': entry.node.accent }"
            @click="openNode(entry.node.id)"
          >
            <span class="dt-top">
              <span class="dt-glyph">{{ NODE_TYPES[entry.node.type].glyph }}</span>
              <span class="dt-floor">F{{ entry.layer + 1 }}</span>
              <span v-if="questAt(entry.node.id)" class="dt-quest">约</span>
              <span v-if="entry.node.risk" class="dt-risk">危</span>
            </span>
            <b>{{ entry.node.title }}</b>
            <span class="dt-meta">{{ REGIONS[entry.node.region].name }} · {{ NODE_TYPES[entry.node.type].name }}</span>
            <span class="dt-state">{{ stateLabel(entry.node.id) }}</span>
          </button>
        </div>
      </div>
    </section>

    <p class="map-note">
      星图由种子 <span class="mono">{{ run.mapSeed || run.seed }}</span> 生成。横向滑动查看整层；
      战败后会被拖回空港，第二天星图重新排布。
    </p>

    <Teleport to="body">
      <div v-if="expeditionPending && expedition" class="settle-backdrop expedition-backdrop">
        <div class="expedition-pick">
          <p class="kicker">EXPEDITION · CONTRACT</p>
          <h2>选择这次远征的目标</h2>
          <p class="hint">目标决定额外奖励。星区词条会同时影响这一局。</p>
          <div class="contract-grid">
            <button
              v-for="id in expedition.offers"
              :key="id"
              type="button"
              class="contract-card"
              @click="chooseExpedition(id)"
            >
              <span class="kicker">{{ id.toUpperCase() }}</span>
              <b>{{ EXPEDITION_CONTRACTS[id].title }}</b>
              <p>{{ EXPEDITION_CONTRACTS[id].desc }}</p>
              <em>{{ EXPEDITION_CONTRACTS[id].rewardText }}</em>
            </button>
          </div>
          <div class="modifier-list">
            <span class="kicker">星区词条</span>
            <span v-for="modifier in expeditionModifiers" :key="modifier.id" class="modifier-chip" :title="modifier.desc">
              {{ modifier.name }} · {{ modifier.desc }}
            </span>
          </div>
        </div>
      </div>
      <Transition name="sheet">
        <div v-if="settling" class="settle-backdrop">
          <div class="settle-card">
            <p class="kicker">DAY SETTLEMENT · CPU</p>
            <h2>{{ settling.done ? '空港更新完毕' : '空港正在重新计算' }}</h2>
            <p class="settle-sub">
              {{ settling.done ? `第 ${run.day} 天，${settling.events.length} 条新动态。` : `${settling.phase} · 正在推断 NPC 之间发生了什么` }}
            </p>
            <div class="settle-bar"><i :style="{ width: `${settling.progress}%` }"></i></div>
            <div class="settle-meter"><span>{{ settling.phase }}</span><b>{{ settling.progress }}%</b></div>
            <div v-if="settling.done" class="settle-events">
              <p v-for="(event, index) in settling.events" :key="index">{{ event.text }}</p>
              <p v-if="!settling.events.length" class="empty">这一夜很安静。</p>
            </div>
            <div v-if="settling.done && nightReport" class="night-report">
              <p class="kicker">NIGHT REPORT · 空港夜报</p>
              <p>{{ nightReport }}</p>
            </div>
            <div v-if="settling.done" class="settle-actions">
              <button type="button" class="btn btn-ghost" :disabled="reportBusy" @click="writeNightReport">
                {{ reportBusy ? '正在写夜报…' : '让模型写成夜报' }}
              </button>
              <button type="button" class="btn btn-primary" @click="closeSettle">进入第二天</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <Teleport to="body">
      <Transition name="sheet">
        <div v-if="selected" class="sheet-backdrop" @click.self="closeSheet">
          <div class="sheet" :style="{ '--accent': selectedRegion?.accent }">
            <header class="sheet-head">
              <div>
                <p class="kicker">{{ NODE_TYPES[selected.type].name }} · {{ selectedType?.glyph }}</p>
                <h3>{{ selected.title }}</h3>
                <p class="sub">{{ selected.subtitle }}</p>
                <p v-if="questAt(selected.id)" class="quest-hint">
                  约定：和 {{ run.npcs[questAt(selected.id).npcId]?.name || '某人' }} 一起探索，D{{ questAt(selected.id).deadline }} 前完成。
                </p>
              </div>
              <button type="button" class="icon-btn" aria-label="关闭" @click="closeSheet">✕</button>
            </header>

            <div class="sheet-body">
              <div class="sheet-tags">
                <span class="tag" :class="{
                  cyan: selectedState === 'current',
                  amber: selectedState === 'reachable',
                  jade: selectedState === 'cleared',
                }">{{ stateLabel(selected.id) }}</span>
                <span v-if="selected.type === 'gather'" class="tag">剩余 {{ remaining }} 次</span>
                <span v-if="selected.type === 'boss'" class="tag red">首领</span>
                <span v-if="selected.type === 'boss' && run.story?.flags?.bossIntel" class="tag amber">
                  弱点 {{ ATTR_NAME[run.story.flags.bossWeakness] || '未知' }}
                </span>
                <span v-if="selected.type === 'boss' && run.story?.flags?.bossIntel && run.story.flags.bossResistance" class="tag">
                  抗性 {{ ATTR_NAME[run.story.flags.bossResistance] || '未知' }}
                </span>
                <span v-if="selected.risk" class="tag red">高危 · {{ selected.risk.name }}</span>
              </div>

              <div v-if="selected.risk" class="risk-box">
                <b>{{ selected.risk.name }}</b>
                <p>{{ selected.risk.desc }}</p>
                <span>{{ selected.risk.rewardText }}</span>
              </div>

              <!-- 采集 -->
              <template v-if="selected.type === 'gather'">
                <div class="kv">
                  <div><span>判定</span><b>{{ selected.attr?.toUpperCase() }} · DC {{ selected.dc }}</b></div>
                  <div><span>产出</span><b>{{ selected.yields.map((y) => ITEMS[y.item].name).join(' / ') }}</b></div>
                </div>
                <button
                  v-if="selectedState === 'current'"
                  type="button"
                  class="btn btn-primary btn-block"
                  :disabled="remaining <= 0 || run.ap < 1"
                  @click="doGather"
                >
                  {{ remaining <= 0 ? '已采空' : '采集 · AP 1' }}
                </button>
              </template>

              <!-- 探索点 -->
              <template v-else-if="selected.type === 'site'">
                <p class="event-title">{{ selected.title }}</p>
                <p class="story">这里可以继续往下走。每深入一层都要消耗 1 点行动点，判定难度也会提高。</p>
                <div class="kv">
                  <div><span>深度</span><b>{{ run.nodeState[selected.id]?.depth || 0 }} / {{ selected.site?.maxDepth || 3 }}</b></div>
                  <div><span>判定</span><b>{{ ATTR_NAME[selected.site?.attr] }} · DC {{ (selected.site?.dc || 11) + (run.nodeState[selected.id]?.depth || 0) * 2 }}</b></div>
                </div>
                <p v-if="selected.site?.coreLoot" class="site-loot">
                  最深处可能留下：{{ ITEMS[selected.site.coreLoot]?.name || selected.site.coreLoot }}
                </p>
                <div v-if="siteEncounter" class="site-encounter">
                  <p class="kicker">DEEP ENCOUNTER · {{ selected.site.encounter.toUpperCase() }}</p>
                  <h3>{{ siteEncounter.title }}</h3>
                  <p class="event-text">{{ siteEncounter.text }}</p>
                  <div class="site-encounter-choices">
                    <button
                      v-for="choice in siteEncounter.choices"
                      :key="choice.id"
                      type="button"
                      class="site-approach"
                      :disabled="run.ap < 1"
                      @click="doSiteEncounter(choice)"
                    >
                      <b>{{ choice.label }}</b>
                      <span v-if="choice.attr">{{ ATTR_NAME[choice.attr] }} · DC {{ siteEncounterDc(choice) }}</span>
                      <em>{{ choice.desc }}</em>
                    </button>
                  </div>
                </div>
                <div v-else-if="selectedState === 'current' && !selectedCleared" class="site-approaches">
                  <button
                    v-for="approach in SITE_APPROACHES"
                    :key="approach.id"
                    type="button"
                    class="site-approach"
                    :disabled="run.ap < 1"
                    @click="doSite(approach)"
                  >
                    <b>{{ approach.name }}</b>
                    <span>{{ ATTR_NAME[siteAttr(approach)] || '未知' }} · DC {{ siteDc(approach) }}</span>
                    <em>{{ approach.reward }}</em>
                    <small>{{ approach.risk }}</small>
                  </button>
                </div>
                <p v-else-if="selectedCleared" class="hint">这里已经被探索到底了。</p>
              </template>

              <!-- 派系远征 -->
              <template v-else-if="selected.type === 'faction'">
                <p class="event-title">{{ selected.title }}</p>
                <p class="story">{{ selected.text || '派系的人把地点标在了星图上。这里没有谈判的余地，只能进去把事办完。' }}</p>
                <div class="kv">
                  <div v-if="selected.enemy"><span>敌方</span><b>{{ selected.enemy.name }}</b></div>
                  <div><span>阶段</span><b>{{ selected.factionExpedition?.step === 'approach' ? '接触点' : selected.factionExpedition?.step === 'battle' ? '敌方据点' : '善后' }}</b></div>
                  <div><span>状态</span><b>{{ selectedCleared ? '已解决' : '未解决' }}</b></div>
                </div>

                <div v-if="selectedState === 'current' && !selectedCleared && selected.factionExpedition?.step === 'approach'" class="site-approaches">
                  <button type="button" class="site-approach" @click="factionApproach('scout')">
                    <b>先摸清外围</b>
                    <span>精神 -2 · 更安全</span>
                  </button>
                  <button type="button" class="site-approach" @click="factionApproach('press')">
                    <b>直接从正门进去</b>
                    <span>生命 -4 · 更快</span>
                  </button>
                </div>

                <button
                  v-else-if="selectedState === 'current' && !selectedCleared && selected.factionExpedition?.step === 'battle'"
                  type="button"
                  class="btn btn-primary btn-block"
                  @click="startFactionExpedition"
                >
                  进入敌方据点
                </button>

                <div v-else-if="selectedState === 'current' && !selectedCleared && selected.factionExpedition?.step === 'aftermath'" class="site-approaches">
                  <button type="button" class="site-approach" @click="factionOutcome('faction')">
                    <b>交给派系</b>
                    <span>派系声望 +12 · 城市控制权转移</span>
                  </button>
                  <button type="button" class="site-approach" @click="factionOutcome('city')">
                    <b>让城市议会接管</b>
                    <span>信用点 +25 · 控制权归城市</span>
                  </button>
                  <button type="button" class="site-approach" @click="factionOutcome('crew')">
                    <b>把物资带回方舟</b>
                    <span>信用点 +40 · 废料 +3 · 派系声望 -5</span>
                  </button>
                </div>

                <p v-else-if="selectedCleared" class="hint">这里的差事已经解决。</p>
                <p v-else class="hint">先抵达这个节点。</p>
              </template>

              <!-- 约会 -->
              <template v-else-if="selected.type === 'date'">
                <p class="event-title">{{ selected.date?.npcId ? run.npcs[selected.date.npcId]?.name : '某人' }} 在等你</p>
                <p class="story">这是一次私人约定。赴约后进入独立剧情，不会消耗行动点。</p>
                <button
                  v-if="selectedState === 'current' && !selectedCleared"
                  type="button"
                  class="btn btn-primary btn-block"
                  @click="goDate"
                >
                  赴约
                </button>
                <p v-else-if="selectedCleared" class="hint">这次约会已经结束了。</p>
              </template>

              <!-- 事件 -->
              <template v-else-if="selected.type === 'event'">
                <template v-if="selected.event?.choices">
                  <p class="event-title">{{ selected.event.title }}</p>
                  <p class="story">{{ selected.event.text }}</p>
                  <div v-if="selectedState === 'current' && !selectedCleared" class="event-choices">
                    <button
                      v-for="choice in selected.event.choices"
                      :key="choice.id"
                      type="button"
                      class="event-choice"
                      @click="doEventChoice(choice.id)"
                    >
                      <span class="ec-main">
                        <b>{{ choice.label }}</b>
                        <span>{{ choice.desc }}</span>
                      </span>
                      <span v-if="choice.attr" class="tag">{{ ATTR_NAME[choice.attr] }} DC {{ choice.dc }}</span>
                      <span v-if="choice.skill" class="tag jade">{{ SKILLS[choice.skill].name }} +2</span>
                    </button>
                  </div>
                  <div
                    v-if="eventResult || selectedCleared"
                    class="event-result"
                    :class="{ bad: eventResult?.success === false }"
                  >
                    {{ eventResult?.text || run.nodeState[selected.id]?.text || '这里已经没有什么了。' }}
                  </div>
                </template>
                <template v-else>
                  <p class="story">读数在这里聚成一团，像是有什么东西正在等你触碰。</p>
                  <button
                    v-if="selectedState === 'current' && !selectedCleared"
                    type="button"
                    class="btn btn-primary btn-block"
                    @click="doEvent"
                  >
                    调查
                  </button>
                </template>
              </template>

              <!-- 城市 -->
              <template v-else-if="selected.type === 'city'">
                <p class="event-title">{{ selected.cityName || selected.title }}</p>
                <p class="story">边境聚落。这里有自己的本地人口、访客、市场和诊所。</p>
                <div class="kv">
                  <div><span>本地人口</span><b>{{ selected.populationTarget || 14 }} 人</b></div>
                  <div><span>服务</span><b>市场 · 酒馆 · 诊所</b></div>
                </div>
                <button
                  v-if="selectedState === 'current'"
                  type="button"
                  class="btn btn-primary btn-block"
                  @click="goCityNode"
                >
                  进入城市
                </button>
              </template>

              <!-- 休整 -->
              <template v-else-if="selected.type === 'rest'">
                <div class="kv">
                  <div><span>恢复</span><b>生命 +{{ selected.heal }} · 精神 +{{ selected.mental }}</b></div>
                </div>
                <button
                  v-if="selectedState === 'current' && !selectedCleared"
                  type="button"
                  class="btn btn-primary btn-block"
                  @click="doRest"
                >
                  休整
                </button>
              </template>

              <!-- 战斗 -->
              <template v-else-if="['battle', 'elite', 'boss'].includes(selected.type)">
                <div class="enemy">
                  <span class="enemy-glyph">⚔</span>
                  <div>
                    <b>{{ selected.enemy?.name }}</b>
                    <p>生命 {{ selected.enemy?.hp }} · 士气 {{ selected.enemy?.morale }} · 攻击 {{ selected.enemy?.attack }}</p>
                    <p v-if="selectedThreat?.score > 0.02" class="threat-line">
                      战斗压力 {{ selectedThreat.label }} · 敌方生命 +{{ Math.round(selectedThreat.score * 115) }}% ·
                      攻击 +{{ selectedThreat.attackBonus }}
                    </p>
                  </div>
                </div>
                <p class="story">
                  进入战斗会切换到独立页面。打崩士气后可以选择放过、缴械、审问或招募；
                  失败会损失 25% 信用点。
                </p>
                <button
                  v-if="!selectedCleared && (selectedState === 'current' || run.battle?.nodeId === selected.id)"
                  type="button"
                  class="btn btn-primary btn-block"
                  @click="goBattle"
                >
                  {{ run.battle?.nodeId === selected.id ? '继续战斗' : '进入战斗' }}
                </button>
                <button
                  v-if="selectedState === 'current' && selected.type !== 'boss' && !selectedCleared"
                  type="button"
                  class="btn btn-block"
                  @click="doSkip"
                >
                  绕开 · 放弃奖励
                </button>
                <p v-if="selected.type === 'boss' && !selectedCleared" class="hint">
                  首领无法绕开。
                </p>
                <p v-if="selected.type === 'boss' && run.story?.flags?.bossIntel" class="hint">
                  {{ run.story.flags.bossMechanic }} · {{ run.story.flags.bossPhases?.length || 0 }} 个阶段
                </p>
              </template>

              <!-- 交易 / 起点 -->
              <template v-else-if="selected.type === 'shop'">
                <div class="shop-wallet">
                  <span>你的信用点</span>
                  <b>{{ run.player.credits }}</b>
                </div>
                <div v-if="shopOffers.length" class="offers">
                  <div v-for="(offer, index) in shopOffers" :key="index" class="offer">
                    <span class="offer-glyph">{{ offerGlyph(offer) }}</span>
                    <span class="offer-main">
                      <b>{{ offerName(offer) }}</b>
                      <span>{{ offer.kind === 'gear' ? '装备' : '物资' }} · 库存 {{ offer.stock }}</span>
                    </span>
                    <span class="offer-actions">
                      <button
                        type="button"
                        class="btn btn-sm"
                        :disabled="selectedCleared || offer.stock <= 0 || run.player.credits < priceOf(offer)"
                        @click="doBuy(index)"
                      >
                        {{ priceOf(offer) }} 点
                      </button>
                      <button
                        type="button"
                        class="btn btn-ghost btn-sm"
                        :disabled="selectedCleared || offer.stock <= 0"
                        title="敏捷判定；失败会惊动摊主"
                        @click="doSteal(index)"
                      >
                        扒
                      </button>
                    </span>
                  </div>
                </div>
                <p v-else class="story">摊位上什么都没有。</p>
                <p v-if="shopResult" class="shop-result">{{ shopResult }}</p>
                <button
                  v-if="selectedState === 'current' && !selectedCleared"
                  type="button"
                  class="btn btn-block"
                  @click="doSkip"
                >离开</button>
                <p v-else class="hint">摊位已经收起来了。</p>
              </template>

              <template v-else>
                <p class="story">远征从这里开始。你还可以回头，但星图只会向前。</p>
              </template>

              <div v-if="nextNodes(selected).length" class="next-list">
                <span class="hint">航线通往</span>
                <div class="chips">
                  <button
                    v-for="node in nextNodes(selected)"
                    :key="node.id"
                    type="button"
                    class="chip-btn"
                    @click="openNode(node.id)"
                  >
                    {{ node.title }}
                  </button>
                </div>
              </div>

              <p v-if="selectedState === 'current' && ['battle', 'shop'].includes(selected.type)" class="hint">
                绕开后节点会被标记为已处理。
              </p>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.map-head {
  position: relative;
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px 14px;
  padding: 16px 18px;
  min-width: 0;
  overflow: hidden;
}
.map-head::after {
  content: "";
  position: absolute;
  right: -80px;
  bottom: -140px;
  width: 300px;
  height: 300px;
  border-radius: 50%;
  background: radial-gradient(circle at 35% 30%, rgba(var(--accent), .28), transparent 68%);
  opacity: .7;
  pointer-events: none;
}
.head-copy { position: relative; z-index: 1; min-width: 0; }
.head-copy h2 { margin-top: 4px; font-size: max(var(--ui-min), calc(20px * var(--ui-scale))); font-weight: 300; letter-spacing: 0.1em; }
.sub { margin-top: 3px; color: var(--muted); font-size: max(var(--ui-min), calc(10.5px * var(--ui-scale))); }
.head-actions { position: relative; z-index: 1; display: flex; align-items: center; gap: 6px; flex: none; }

.map-board { padding: 14px; min-width: 0; }
.board-head { display: flex; flex-wrap: wrap; align-items: baseline; justify-content: space-between; gap: 4px 10px; padding: 0 2px 10px; }
.board-head .hint { font-size: max(var(--ui-min), calc(9.5px * var(--ui-scale))); }

.dungeon-board {
  position: relative;
  height: auto;
  overflow-x: auto;
  overflow-y: hidden;
  padding: 18px 14px 26px;
  border: 1px solid rgba(126, 196, 224, .1);
  border-radius: 14px;
  background:
    linear-gradient(rgba(124, 231, 255, .028) 1px, transparent 1px),
    linear-gradient(90deg, rgba(124, 231, 255, .028) 1px, transparent 1px),
    radial-gradient(120% 80% at 50% 100%, rgba(124, 231, 255, .07), transparent 58%),
    rgba(3, 7, 12, .5);
  background-size: 28px 28px, 28px 28px, 100% 100%, 100% 100%;
  scrollbar-width: thin;
}
.dungeon-inner {
  position: relative;
  min-width: 100%;
}
.dungeon-links { position: absolute; inset: 0; z-index: 0; width: 100%; height: 100%; overflow: visible; }
.dungeon-links path {
  stroke: rgba(126, 196, 224, .16);
  stroke-width: 1.5;
  vector-effect: non-scaling-stroke;
  transition: stroke .2s ease;
}
.dungeon-links path.is-cleared { stroke: rgba(138, 222, 184, .5); }
.dungeon-links path.is-active {
  stroke: rgba(255, 196, 107, .82);
  stroke-width: 2;
  filter: drop-shadow(0 0 4px rgba(255, 196, 107, .65));
}
.dungeon-floor {
  position: absolute;
  bottom: 0;
  z-index: 1;
  color: rgba(126, 196, 224, .3);
  font-family: var(--mono);
  font-size: max(var(--ui-min), calc(8px * var(--ui-scale)));
  letter-spacing: .14em;
  transform: translateX(-50%);
}

.dungeon-tile {
  position: absolute;
  z-index: 2;
  width: 132px;
  min-height: 78px;
  padding: 7px 8px;
  border: 1px solid var(--line);
  border-left: 3px solid rgb(var(--accent));
  border-radius: 10px;
  background:
    linear-gradient(150deg, rgba(18, 29, 40, .92), rgba(5, 10, 16, .96));
  color: var(--ink);
  text-align: left;
  cursor: pointer;
  transform: translate(-50%, -50%);
  transition: border-color .16s ease, background .16s ease, opacity .16s ease, box-shadow .16s ease;
}
.dt-top { display: flex; align-items: center; gap: 4px; }
.dt-glyph { color: rgb(var(--accent)); font-size: max(var(--ui-min), calc(12px * var(--ui-scale))); }
.dt-floor {
  margin-left: auto;
  color: var(--dim);
  font-family: var(--mono);
  font-size: max(var(--ui-min), calc(7px * var(--ui-scale)));
}
.dt-quest {
  padding: 0 3px;
  border: 1px solid rgba(185, 164, 255, .4);
  border-radius: 3px;
  color: var(--violet);
  font-family: var(--mono);
  font-size: max(var(--ui-min), calc(7px * var(--ui-scale)));
}
.dt-risk {
  padding: 0 3px;
  border: 1px solid rgba(255, 138, 138, .5);
  border-radius: 3px;
  color: var(--red);
  font-family: var(--mono);
  font-size: max(var(--ui-min), calc(7px * var(--ui-scale)));
}
.dungeon-tile.is-risk { border-color: rgba(255, 138, 138, .52); }
.site-loot { margin-top: 8px; color: var(--violet); font-family: var(--mono); font-size: max(var(--ui-min), calc(8.5px * var(--ui-scale))); }
.site-encounter { margin-top: 10px; padding: 10px; border: 1px solid rgba(255, 196, 107, .3); border-radius: 9px; background: rgba(255, 196, 107, .04); }
.site-encounter h3 { margin-top: 3px; color: var(--amber); font-size: max(var(--ui-min), calc(16px * var(--ui-scale))); font-weight: 500; }
.site-encounter .event-text { margin-top: 5px; white-space: pre-line; color: var(--muted); font-size: max(var(--ui-min), calc(9.5px * var(--ui-scale))); line-height: 1.65; }
.site-encounter-choices { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 6px; margin-top: 9px; }
.site-encounter-choices .site-approach em { color: var(--muted); font-style: normal; line-height: 1.4; }
.site-approaches { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 6px; margin-top: 10px; }
.site-approach { display: flex; flex-direction: column; align-items: flex-start; gap: 4px; padding: 9px; border: 1px solid var(--line); border-radius: 8px; background: rgba(5, 10, 16, .42); color: var(--ink); text-align: left; cursor: pointer; }
.site-approach:hover { border-color: rgba(124, 231, 255, .4); background: rgba(124, 231, 255, .05); }
.site-approach b { font-size: max(var(--ui-min), calc(11px * var(--ui-scale))); font-weight: 500; }
.site-approach span { color: var(--cyan); font-family: var(--mono); font-size: max(var(--ui-min), calc(8px * var(--ui-scale))); }
.site-approach em { color: var(--jade); font-family: var(--mono); font-size: max(var(--ui-min), calc(8px * var(--ui-scale))); font-style: normal; }
.site-approach small { color: var(--dim); font-size: max(var(--ui-min), calc(8px * var(--ui-scale))); line-height: 1.4; }
@media (max-width: 600px) {
  .site-approaches, .site-encounter-choices { grid-template-columns: 1fr; }
}
.risk-box { margin-top: 8px; padding: 8px 10px; border: 1px solid rgba(255, 138, 138, .28); border-radius: 8px; background: rgba(255, 138, 138, .045); }
.risk-box b { color: var(--red); font-size: max(var(--ui-min), calc(10px * var(--ui-scale))); font-weight: 500; }
.risk-box p { margin-top: 3px; color: var(--muted); font-size: max(var(--ui-min), calc(9px * var(--ui-scale))); line-height: 1.55; }
.risk-box span { display: block; margin-top: 4px; color: var(--amber); font-family: var(--mono); font-size: max(var(--ui-min), calc(8px * var(--ui-scale))); }
.dungeon-tile b {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin-top: 3px;
  font-size: max(var(--ui-min), calc(11px * var(--ui-scale)));
  font-weight: 500;
  line-height: 1.28;
  letter-spacing: .02em;
}
.dt-meta {
  display: block;
  margin-top: 2px;
  overflow: hidden;
  color: var(--dim);
  font-size: max(var(--ui-min), calc(7.5px * var(--ui-scale)));
  text-overflow: ellipsis;
  white-space: nowrap;
}
.dt-state {
  display: block;
  margin-top: 4px;
  color: var(--dim);
  font-family: var(--mono);
  font-size: max(var(--ui-min), calc(6.5px * var(--ui-scale)));
  letter-spacing: .06em;
}

.dungeon-tile.is-locked { opacity: .38; }
.dungeon-tile.is-cleared { opacity: .62; }
.dungeon-tile.is-cleared .dt-state { color: var(--jade); }
.dungeon-tile.is-current {
  border-color: rgba(124, 231, 255, .62);
  border-left-color: var(--cyan);
  background: linear-gradient(150deg, rgba(27, 55, 70, .94), rgba(5, 12, 18, .98));
  box-shadow: 0 0 28px -8px rgba(124, 231, 255, .65);
  transform: translate(-50%, -50%) scale(1.04);
}
.dungeon-tile.is-current .dt-state { color: var(--cyan); }
.dungeon-tile.is-reachable {
  border-color: rgba(255, 196, 107, .55);
  box-shadow: 0 0 18px -10px rgba(255, 196, 107, .8);
}
.dungeon-tile.is-reachable .dt-state { color: var(--amber); }
.dungeon-tile.is-quest { border-color: rgba(185, 164, 255, .55); }
.dungeon-tile.is-act-end { border-left-color: var(--red); }
.dungeon-tile.is-act-end .dt-state { color: var(--red); }
@media (hover: hover) {
  .dungeon-tile:hover { border-color: var(--line-2); background: rgba(20, 34, 46, .95); }
  .dungeon-tile.is-reachable:hover { border-color: rgba(255, 196, 107, .9); }
}

.layers { display: flex; flex-direction: column; min-width: 0; }
.act-divider {
  display: flex;
  align-items: center;
  gap: 9px;
  margin: 12px 2px 8px;
  color: var(--dim);
  font-family: var(--mono);
  font-size: max(var(--ui-min), calc(9px * var(--ui-scale)));
  letter-spacing: 0.16em;
}
.act-divider:first-child { margin-top: 2px; }
.act-divider i { flex: 1; height: 1px; background: var(--line); }

.layer-row { display: flex; align-items: stretch; gap: 10px; padding: 3px 0; }
.layer-row.is-here .layer-no { color: var(--cyan); }
.layer-no {
  width: 20px;
  flex: none;
  padding-top: 10px;
  color: var(--dim);
  font-family: var(--mono);
  font-size: max(var(--ui-min), calc(8.5px * var(--ui-scale)));
  text-align: center;
}
.layer-nodes { flex: 1; display: flex; flex-wrap: wrap; gap: 7px; min-width: 0; }

.node-card {
  flex: 0 0 268px;
  min-width: 0;
  padding: 9px 11px;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: rgba(5, 10, 16, .45);
  text-align: left;
  cursor: pointer;
  transition: border-color .16s ease, background .16s ease, opacity .16s ease;
}
.nc-top { display: flex; align-items: center; justify-content: space-between; gap: 6px; }
.nc-glyph { color: rgb(var(--accent)); font-size: max(var(--ui-min), calc(12px * var(--ui-scale))); }
.nc-state { color: var(--dim); font-family: var(--mono); font-size: max(var(--ui-min), calc(8px * var(--ui-scale))); letter-spacing: 0.04em; }
.node-card b { display: block; margin-top: 4px; font-size: max(var(--ui-min), calc(12px * var(--ui-scale))); font-weight: 500; letter-spacing: 0.04em; }
.nc-meta { display: block; margin-top: 2px; color: var(--dim); font-size: max(var(--ui-min), calc(9px * var(--ui-scale))); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.node-card.is-locked { opacity: .34; }
.node-card.is-cleared { opacity: .58; }
.node-card.is-cleared .nc-state { color: var(--jade); }
.node-card.is-current {
  border-color: rgba(124, 231, 255, .5);
  background: rgba(124, 231, 255, .08);
  box-shadow: 0 0 22px -10px rgba(124, 231, 255, .7);
}
.node-card.is-current .nc-state { color: var(--cyan); }
.node-card.is-reachable {
  border-color: rgba(255, 196, 107, .42);
  background: rgba(255, 196, 107, .05);
}
.node-card.is-reachable .nc-state { color: var(--amber); }
.node-card.is-quest { border-color: rgba(185, 164, 255, .45); }
.nc-quest {
  margin-left: auto;
  padding: 0 4px;
  border: 1px solid rgba(185, 164, 255, .35);
  border-radius: 3px;
  color: var(--violet);
  font-family: var(--mono);
  font-size: max(var(--ui-min), calc(7.5px * var(--ui-scale)));
}
.quest-hint {
  margin-top: 5px;
  color: var(--violet);
  font-size: max(var(--ui-min), calc(9px * var(--ui-scale)));
  line-height: 1.6;
}
@media (hover: hover) {
  .node-card:hover { border-color: var(--line-2); }
  .node-card.is-reachable:hover { border-color: rgba(255, 196, 107, .7); }
}

.map-note { padding: 2px 4px 10px; color: var(--dim); font-size: max(var(--ui-min), calc(9.5px * var(--ui-scale))); line-height: 1.8; }
.expedition-bar { display: flex; align-items: center; gap: 12px; padding: 10px 13px; border-color: rgba(185, 164, 255, .2); }
.expedition-bar.is-complete { border-color: rgba(138, 222, 184, .3); }
.expedition-main { display: flex; flex-direction: column; gap: 2px; min-width: 160px; }
.expedition-main b { font-size: max(var(--ui-min), calc(13px * var(--ui-scale))); font-weight: 500; }
.expedition-main span { color: var(--muted); font-size: max(var(--ui-min), calc(9px * var(--ui-scale))); }
.expedition-progress { display: flex; flex-direction: column; align-items: center; padding: 0 10px; border-left: 1px solid var(--line); }
.expedition-progress b { color: var(--cyan); font-family: var(--mono); font-size: max(var(--ui-min), calc(14px * var(--ui-scale))); font-weight: 400; }
.expedition-progress span { color: var(--dim); font-family: var(--mono); font-size: max(var(--ui-min), calc(8px * var(--ui-scale))); }
.expedition-mods { display: flex; flex-wrap: wrap; gap: 4px; margin-left: auto; }
.modifier-chip { padding: 3px 6px; border: 1px solid rgba(185, 164, 255, .25); border-radius: 5px; color: var(--violet); font-family: var(--mono); font-size: max(var(--ui-min), calc(8px * var(--ui-scale))); }
.expedition-backdrop { z-index: 170; }
.expedition-pick { width: min(760px, 92vw); max-height: 88vh; overflow: auto; padding: 18px; border: 1px solid rgba(185, 164, 255, .3); border-radius: 14px; background: var(--panel); box-shadow: 0 30px 80px rgba(0, 0, 0, .6); }
.expedition-pick h2 { margin-top: 5px; font-size: max(var(--ui-min), calc(24px * var(--ui-scale))); font-weight: 300; letter-spacing: .08em; }
.contract-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 7px; margin-top: 14px; }
.contract-card { display: flex; flex-direction: column; align-items: flex-start; gap: 5px; padding: 12px; border: 1px solid var(--line); border-radius: 9px; background: rgba(5, 10, 16, .45); color: var(--ink); text-align: left; cursor: pointer; }
.contract-card:hover { border-color: rgba(185, 164, 255, .45); background: rgba(185, 164, 255, .07); }
.contract-card b { font-size: max(var(--ui-min), calc(16px * var(--ui-scale))); font-weight: 500; }
.contract-card p { flex: 1; color: var(--muted); font-size: max(var(--ui-min), calc(9.5px * var(--ui-scale))); line-height: 1.6; }
.contract-card em { color: var(--jade); font-family: var(--mono); font-size: max(var(--ui-min), calc(8.5px * var(--ui-scale))); font-style: normal; }
.modifier-list { display: flex; flex-wrap: wrap; align-items: center; gap: 5px; margin-top: 14px; padding-top: 10px; border-top: 1px solid var(--line); }
.modifier-list .modifier-chip { max-width: 100%; }
@media (max-width: 700px) {
  .expedition-bar { align-items: flex-start; flex-wrap: wrap; }
  .expedition-mods { width: 100%; margin-left: 0; }
  .contract-grid { grid-template-columns: 1fr; }
}

/* 节点详情 */
.sheet-backdrop {
  position: fixed;
  inset: 0;
  z-index: 120;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: 0;
  background: rgba(2, 5, 9, .72);
  backdrop-filter: blur(8px);
}
.sheet {
  width: min(560px, 100%);
  max-height: 86dvh;
  display: flex;
  flex-direction: column;
  border: 1px solid var(--line-2);
  border-radius: 20px 20px 0 0;
  background:
    radial-gradient(500px 240px at 90% -10%, rgba(var(--accent), .14), transparent 65%),
    linear-gradient(170deg, rgba(11, 19, 28, .98), rgba(4, 8, 13, .99));
  box-shadow: 0 -30px 80px -30px #000;
  overflow: hidden;
}
.sheet-head {
  flex: none;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 16px 10px;
  border-bottom: 1px solid var(--line);
}
.sheet-head h3 { margin-top: 3px; font-size: max(var(--ui-min), calc(18px * var(--ui-scale))); font-weight: 400; letter-spacing: 0.08em; }
.sheet-body {
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 12px 16px calc(18px + env(safe-area-inset-bottom));
}
.sheet-tags { display: flex; flex-wrap: wrap; gap: 5px; margin-bottom: 10px; }

.kv { display: flex; flex-direction: column; gap: 5px; margin-bottom: 12px; }
.kv > div { display: flex; justify-content: space-between; gap: 10px; padding: 4px 0; border-bottom: 1px dashed var(--line); font-size: max(var(--ui-min), calc(10.5px * var(--ui-scale))); }
.kv span { color: var(--dim); }
.kv b { font-weight: 500; text-align: right; }

.story { margin-bottom: 12px; color: var(--muted); font-size: max(var(--ui-min), calc(11px * var(--ui-scale))); line-height: 1.8; }
.sheet .btn + .btn { margin-top: 6px; }

.event-title { margin-bottom: 4px; color: var(--ink); font-size: max(var(--ui-min), calc(12.5px * var(--ui-scale))); letter-spacing: 0.06em; }
.event-choices { display: flex; flex-direction: column; gap: 5px; margin-bottom: 10px; }
.event-choice {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 5px 8px;
  padding: 9px 10px;
  border: 1px solid var(--line);
  border-radius: 9px;
  background: rgba(5, 10, 16, .5);
  text-align: left;
  cursor: pointer;
}
.ec-main { min-width: 0; }
.ec-main b { display: block; font-size: max(var(--ui-min), calc(11.5px * var(--ui-scale))); font-weight: 500; }
.ec-main span { display: block; margin-top: 1px; color: var(--dim); font-size: max(var(--ui-min), calc(9px * var(--ui-scale))); line-height: 1.5; }
.event-choice .tag { flex: none; }
.event-result {
  padding: 9px 10px;
  border: 1px solid rgba(138, 222, 184, .28);
  border-radius: 9px;
  background: rgba(138, 222, 184, .06);
  color: var(--jade);
  font-size: max(var(--ui-min), calc(10.5px * var(--ui-scale)));
  line-height: 1.7;
}
.event-result.bad {
  border-color: rgba(255, 138, 138, .3);
  background: rgba(255, 138, 138, .05);
  color: var(--red);
}

.shop-wallet {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 8px;
  padding: 6px 9px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: rgba(5, 10, 16, .45);
  font-size: max(var(--ui-min), calc(10px * var(--ui-scale)));
}
.shop-wallet span { color: var(--dim); }
.shop-wallet b { color: var(--amber); font-family: var(--mono); font-size: max(var(--ui-min), calc(13px * var(--ui-scale))); font-weight: 500; }
.offers { display: flex; flex-direction: column; gap: 5px; margin-bottom: 10px; }
.offer {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 9px;
  border: 1px solid var(--line);
  border-radius: 9px;
  background: rgba(5, 10, 16, .42);
}
.offer-glyph {
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  flex: none;
  border: 1px solid rgba(124, 231, 255, .2);
  border-radius: 6px;
  color: var(--cyan);
  font-size: max(var(--ui-min), calc(10px * var(--ui-scale)));
}
.offer-main { flex: 1; min-width: 0; }
.offer-main b { display: block; font-size: max(var(--ui-min), calc(10.5px * var(--ui-scale))); font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.offer-main span { display: block; color: var(--dim); font-size: max(var(--ui-min), calc(8.5px * var(--ui-scale))); }
.offer .btn { flex: none; height: 26px; padding: 0 8px; font-size: max(var(--ui-min), calc(9.5px * var(--ui-scale))); }
.offer-actions { display: flex; gap: 3px; flex: none; }
.offer-actions .btn { height: 26px; padding: 0 7px; font-size: max(var(--ui-min), calc(9px * var(--ui-scale))); }
.shop-result {
  margin: -2px 0 9px;
  padding: 8px 10px;
  border: 1px solid rgba(255, 196, 107, .25);
  border-radius: 8px;
  background: rgba(255, 196, 107, .05);
  color: var(--amber);
  font-size: max(var(--ui-min), calc(10px * var(--ui-scale)));
  line-height: 1.6;
}
@media (hover: hover) {
  .event-choice:hover { border-color: var(--line-2); background: rgba(124, 231, 255, .05); }
}

.enemy {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
  padding: 10px 12px;
  border: 1px solid rgba(255, 138, 138, .22);
  border-radius: 11px;
  background: rgba(255, 138, 138, .05);
}
.enemy-glyph {
  display: grid;
  place-items: center;
  width: 34px; height: 34px;
  flex: none;
  border-radius: 9px;
  background: rgba(255, 138, 138, .1);
  color: var(--red);
}
.enemy b { font-size: max(var(--ui-min), calc(12px * var(--ui-scale))); font-weight: 500; }
.enemy p { margin-top: 2px; color: var(--dim); font-family: var(--mono); font-size: max(var(--ui-min), calc(8.5px * var(--ui-scale))); }
.enemy .threat-line { color: var(--red); }

.next-list { margin-top: 14px; padding-top: 12px; border-top: 1px solid var(--line); }
.chips { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 5px; }
.chip-btn {
  padding: 3px 8px;
  border: 1px solid var(--line);
  border-radius: 999px;
  background: transparent;
  color: var(--muted);
  font-size: max(var(--ui-min), calc(9.5px * var(--ui-scale)));
  cursor: pointer;
}
@media (hover: hover) {
  .chip-btn:hover { color: var(--cyan); border-color: var(--line-2); }
}

.sheet-enter-active, .sheet-leave-active { transition: opacity .2s ease; }
.sheet-enter-active .sheet, .sheet-leave-active .sheet { transition: transform .24s cubic-bezier(.22, .61, .36, 1); }
.sheet-enter-from, .sheet-leave-to { opacity: 0; }
.sheet-enter-from .sheet, .sheet-leave-to .sheet { transform: translateY(24px); }

.settle-backdrop {
  position: fixed;
  inset: 0;
  z-index: 140;
  display: grid;
  place-items: center;
  padding: 20px;
  background: rgba(2, 5, 9, .78);
  backdrop-filter: blur(6px);
}
.settle-card {
  width: min(560px, 100%);
  padding: 24px;
  border: 1px solid rgba(124, 231, 255, .28);
  border-radius: 16px;
  background:
    radial-gradient(420px 180px at 20% 0, rgba(124, 231, 255, .1), transparent 70%),
    rgba(7, 14, 21, .97);
  box-shadow: 0 24px 80px rgba(0, 0, 0, .55);
}
.settle-card h2 { margin-top: 5px; font-size: max(var(--ui-min), calc(24px * var(--ui-scale))); font-weight: 300; letter-spacing: .06em; }
.settle-sub { margin-top: 6px; color: var(--muted); font-size: max(var(--ui-min), calc(10px * var(--ui-scale))); }
.settle-bar { height: 8px; margin-top: 20px; overflow: hidden; border-radius: 5px; background: rgba(255, 255, 255, .07); }
.settle-bar i { display: block; height: 100%; border-radius: inherit; background: linear-gradient(90deg, rgba(124, 231, 255, .45), var(--cyan)); transition: width .12s linear; box-shadow: 0 0 16px rgba(124, 231, 255, .45); }
.settle-meter { display: flex; justify-content: space-between; margin-top: 7px; color: var(--dim); font-family: var(--mono); font-size: max(var(--ui-min), calc(8px * var(--ui-scale))); }
.settle-events { max-height: 220px; margin: 14px 0; overflow-y: auto; border-top: 1px solid var(--line); border-bottom: 1px solid var(--line); padding: 8px 0; }
.settle-events p { padding: 4px 0; color: var(--muted); font-size: max(var(--ui-min), calc(10px * var(--ui-scale))); line-height: 1.55; }
.settle-events .empty { color: var(--dim); text-align: center; }
.night-report { margin: 0 0 12px; padding: 12px; border: 1px solid rgba(185, 164, 255, .26); border-radius: 9px; background: rgba(185, 164, 255, .05); }
.night-report p:last-child { margin-top: 5px; color: var(--muted); font-size: max(var(--ui-min), calc(10px * var(--ui-scale))); line-height: 1.75; white-space: pre-wrap; }
.settle-actions { display: flex; align-items: center; justify-content: flex-end; gap: 6px; }
@media (min-width: 900px) {
  .sheet-backdrop { align-items: center; padding: 20px; }
  .sheet { border-radius: 20px; }
  .sheet-body { padding-bottom: 18px; }
}

@media (max-width: 899px) {
  .map-head { padding: 13px 14px; }
  .head-copy h2 { font-size: max(var(--ui-min), calc(17px * var(--ui-scale))); }
  .head-actions { flex-direction: row; align-items: center; gap: 6px; }
  .map-board { padding: 11px; }
  .dungeon-board { padding: 14px 8px 22px; }
  .dungeon-tile { width: 108px; min-height: 70px; padding: 6px; }
  .dungeon-tile b { font-size: max(var(--ui-min), calc(10px * var(--ui-scale))); }
  .dt-meta { font-size: max(var(--ui-min), calc(7px * var(--ui-scale))); }
  .layer-row { gap: 6px; }
  .layer-nodes { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 5px; }
  .layer-nodes.is-single { grid-template-columns: 1fr; }
  .node-card { flex: none; width: 100%; padding: 8px 9px; }
  .node-card b { font-size: max(var(--ui-min), calc(11px * var(--ui-scale))); }
  .nc-meta { font-size: max(var(--ui-min), calc(8px * var(--ui-scale))); }
}
</style>
