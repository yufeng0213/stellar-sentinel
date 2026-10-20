<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ATTR_NAME, GEAR, ITEMS, NODE_TYPES, REGIONS, SKILLS } from '../game-core/data.js'
import { useGameStore } from '../stores/game.js'

const game = useGameStore()
const router = useRouter()
const run = computed(() => game.run)
const current = computed(() => game.current)
const selectedId = ref(null)

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
  game.makeCamp()
}

function nextNodes(node) {
  return (node.next || []).map((id) => game.node(id)).filter(Boolean)
}
</script>

<template>
  <div v-if="run" class="run-page">
    <section class="map-head panel" :style="{ '--accent': region?.accent }">
      <div class="head-copy">
        <p class="kicker">EXPEDITION · {{ run.seed }}</p>
        <h2>{{ actTitle }}</h2>
        <p class="sub">
          {{ region?.name }} · 已探索 {{ clearedCount }} / {{ run.map.layers.flat().length }} 节点
        </p>
      </div>
      <div class="head-actions">
        <span class="tag cyan">AP {{ run.ap }} / {{ run.apMax }}</span>
        <button type="button" class="btn btn-sm" :disabled="run.ap > 0" @click="camp">扎营</button>
      </div>
    </section>

    <section class="map-board panel">
      <div class="board-head">
        <span class="kicker">STAR MAP</span>
        <span class="hint">点击相邻节点前往 · 采集消耗 1 AP</span>
      </div>

      <div class="layers">
        <template v-for="(layerIds, index) in run.map.layers" :key="index">
          <div v-if="index === 0 || run.map.nodes[layerIds[0]].act !== run.map.nodes[run.map.layers[index - 1][0]].act" class="act-divider">
            <span>ACT {{ run.map.nodes[layerIds[0]].act }}</span>
            <i></i>
          </div>

          <div class="layer-row" :class="{ 'is-here': layerHasCurrent(layerIds) }">
            <span class="layer-no">{{ String(index + 1).padStart(2, '0') }}</span>
            <div class="layer-nodes" :class="{ 'is-single': layerIds.length === 1 }">
              <button
                v-for="nodeId in layerIds"
                :key="nodeId"
                type="button"
                class="node-card"
                :class="[`is-${stateOf(nodeId)}`, { 'is-quest': questAt(nodeId) }]"
                :style="{ '--accent': run.map.nodes[nodeId].accent }"
                @click="openNode(nodeId)"
              >
                <span class="nc-top">
                  <span class="nc-glyph">{{ NODE_TYPES[run.map.nodes[nodeId].type].glyph }}</span>
                  <span v-if="questAt(nodeId)" class="nc-quest">约</span>
                  <span class="nc-state">{{ stateLabel(nodeId) }}</span>
                </span>
                <b>{{ run.map.nodes[nodeId].title }}</b>
                <span class="nc-meta">
                  {{ REGIONS[run.map.nodes[nodeId].region].name }} · {{ NODE_TYPES[run.map.nodes[nodeId].type].name }}
                </span>
              </button>
            </div>
          </div>
        </template>
      </div>
    </section>

    <p class="map-note">
      星图由种子 <span class="mono">{{ run.seed }}</span> 生成。战斗、交易与事件节点在后续阶段接入；
      当前可以采集、调查事件、休整，或绕开战斗节点。
    </p>

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
                  </div>
                </div>
                <p class="story">
                  进入战斗会切换到独立页面。打崩士气后可以选择放过、缴械、审问或招募；
                  失败会损失 25% 信用点。
                </p>
                <button
                  v-if="selectedState === 'current' && !selectedCleared"
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
  .layer-row { gap: 6px; }
  .layer-nodes { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 5px; }
  .layer-nodes.is-single { grid-template-columns: 1fr; }
  .node-card { flex: none; width: 100%; padding: 8px 9px; }
  .node-card b { font-size: max(var(--ui-min), calc(11px * var(--ui-scale))); }
  .nc-meta { font-size: max(var(--ui-min), calc(8px * var(--ui-scale))); }
}
</style>
