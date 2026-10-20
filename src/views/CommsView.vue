<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { REGIONS, ITEMS } from '../game-core/data.js'
import {
  AXES,
  PERSONALITY_LABELS,
  canInviteToParty,
  factionName,
  npcList,
} from '../game-core/npc.js'
import { TAG_CATEGORIES, tagDefsFor } from '../game-core/npc-tags.js'
import { EVENT_TYPES } from '../game-core/npc-events.js'
import { loreStatusFor } from '../game/lore.js'
import { useGameStore } from '../stores/game.js'

const game = useGameStore()
const router = useRouter()

const run = computed(() => game.run)
const npcs = computed(() => (run.value ? npcList(run.value) : []))
const tagsOf = (npc) => tagDefsFor(npc?.tags || [])
const inbox = computed(() => (run.value?.inbox || []).filter((event) => event.status === 'pending'))
const pendingInboxCount = computed(() => inbox.value.length)
const weeklySummary = computed(() => run.value?.weekly?.summary || '')
const activeQuests = computed(() => (run.value?.quests || []).filter((quest) => quest.status === 'active'))
const loreInfo = computed(() => (selected.value ? loreStatusFor(selected.value, loreTierId.value) : null))
const tab = ref('roster')
const selectedId = ref(null)
const detailOpen = ref(false)
const giftOpen = ref(false)
const reply = ref('')
const chatOpen = ref(false)
const chatInput = ref('')
const chatLog = ref(null)
const llmReady = ref(null)
const loreTierId = ref('public')
const loreBusy = ref(false)
const loreError = ref('')
const narratingId = ref('')

const selected = computed(() => {
  const found = npcs.value.find((npc) => npc.id === selectedId.value)
  return found || npcs.value[0] || null
})

const chatMessages = computed(() => {
  if (!run.value || !selected.value) return []
  return run.value.npcChats?.[selected.value.id] || []
})

const chatStreaming = computed(() => chatMessages.value.some((message) => message.streaming))
const chatRemaining = computed(() => {
  const llm = run.value?.llm
  if (!llm) return 0
  return Math.max(0, llm.maxCalls - llm.calls)
})

const inviteCheck = computed(() => (
  selected.value ? canInviteToParty(run.value, selected.value.id) : { ok: false, reason: '' }
))

const ambushNpc = computed(() => {
  if (!run.value?.pendingAmbush) return null
  return run.value.npcs?.[run.value.pendingAmbush] || null
})

const partyNames = computed(() => (run.value?.party || [])
  .map((id) => run.value.npcs?.[id]?.name)
  .filter(Boolean))

const giftItems = computed(() => {
  if (!run.value) return []
  return Object.keys(run.value.inv)
    .filter((key) => ITEMS[key] && run.value.inv[key] > 0)
    .map((key) => ({ key, ...ITEMS[key], count: run.value.inv[key] }))
    .sort((a, b) => b.count - a.count)
})

const edges = computed(() => {
  if (!run.value) return []
  return [...(run.value.npcEdges || [])]
    .filter((edge) => run.value.npcs[edge.a] && run.value.npcs[edge.b])
    .sort((left, right) => right.trust - left.trust)
})

function openDetail(npc) {
  if (!npc) return
  selectedId.value = npc.id
  reply.value = ''
  giftOpen.value = false
  loreTierId.value = loreStatusFor(npc).selected.id
  loreError.value = ''
  detailOpen.value = true
  checkLlm()
}

function selectLoreTier(tierId) {
  if (!loreInfo.value?.tiers.some((tier) => tier.id === tierId)) return
  loreTierId.value = tierId
  loreError.value = ''
}

async function doLore() {
  if (!selected.value || loreBusy.value) return
  if (llmReady.value === null) await checkLlm()
  loreBusy.value = true
  loreError.value = ''
  const result = await game.discoverNpcLore(selected.value.id, loreTierId.value, llmReady.value === true)
  loreBusy.value = false
  if (result.ok) {
    loreTierId.value = result.entry.tier
    if (result.error) loreError.value = result.error
    game.notify(result.source === 'llm' ? '档案已更新' : '本地档案已补全', 'good')
  } else {
    loreError.value = result.message
    game.notify(result.message, 'bad')
  }
}

function closeDetail() {
  detailOpen.value = false
  giftOpen.value = false
  reply.value = ''
}

function openChat(npc) {
  if (!npc) return
  selectedId.value = npc.id
  detailOpen.value = false
  giftOpen.value = false
  chatOpen.value = true
  chatInput.value = ''
  checkLlm()
  nextTick(scrollChat)
}

function closeChat() {
  chatOpen.value = false
  chatInput.value = ''
}

async function checkLlm() {
  try {
    const response = await fetch('./api/llm/config')
    const data = await response.json()
    llmReady.value = Boolean(data.hasKey) || data.provider === 'ollama'
  } catch {
    llmReady.value = false
  }
}

function scrollChat() {
  const element = chatLog.value
  if (element) element.scrollTop = element.scrollHeight
}

async function sendChat() {
  const text = chatInput.value.trim()
  if (!text || !selected.value || chatStreaming.value) return
  chatInput.value = ''
  await nextTick()
  scrollChat()
  const result = await game.sendNpcChat(selected.value.id, text)
  await nextTick()
  scrollChat()
  if (result?.fallback) {
    game.notify(result.error ? `本地对白：${result.error}` : '使用本地对白', '')
  }
}

watch(
  () => chatMessages.value.map((message) => message.text).join('|'),
  () => nextTick(scrollChat)
)

function axisPercent(value) {
  return Math.max(0, Math.min(100, value))
}

function doGift(itemId) {
  if (!selected.value) return
  const result = game.giftNpc(selected.value.id, itemId)
  reply.value = result.reply || result.message || ''
  if (result.ok) {
    giftOpen.value = false
    game.notify(result.gain > 0 ? `好感变化 +${result.gain}` : '他没什么反应', result.gain > 0 ? 'good' : '')
  }
}

function doTalk(topic) {
  if (!selected.value) return
  const result = game.talkNpc(selected.value.id, topic)
  reply.value = result.reply || result.message || ''
}

function doThreat() {
  if (!selected.value) return
  const result = game.threatenNpc(selected.value.id)
  reply.value = result.reply || result.message || ''
  game.notify('你选择了威胁', 'bad')
}

function doSteal() {
  if (!selected.value) return
  const result = game.stealNpc(selected.value.id)
  reply.value = result.text || result.message || ''
  if (result.ok) {
    game.notify(result.success ? '扒窃成功' : '被发现了', result.success ? 'good' : 'bad')
  }
}

function doApologize() {
  if (!selected.value) return
  const result = game.apologizeNpc(selected.value.id)
  reply.value = result.reply || result.message || ''
}

function doInvite() {
  if (!selected.value) return
  const result = game.inviteNpc(selected.value.id)
  reply.value = result.reply || result.message || ''
  if (result.ok) game.notify('已加入队伍', 'good')
}

function doLeave() {
  if (!selected.value) return
  const result = game.leaveNpc(selected.value.id)
  reply.value = result.reply || result.message || ''
}

function settleAmbush() {
  const result = game.settleAmbush()
  if (result.ok) {
    game.notify(`你退让了，支付 ${result.credits} 信用点`, 'bad')
    reply.value = ''
  }
}

function fightAmbush() {
  const nodeId = game.startAmbushBattle()
  if (!nodeId || !run.value) return
  detailOpen.value = false
  router.push({ name: 'battle', params: { runId: run.value.id, nodeId } })
}

function openEdge(edge) {
  const npc = run.value?.npcs?.[edge.a]
  if (npc) openDetail(npc)
}

function npcName(id) {
  return run.value?.npcs?.[id]?.name || '某人'
}

function eventTone(type) {
  return EVENT_TYPES[type]?.color || 'muted'
}

function eventCardTone(type) {
  return `is-${eventTone(type)}`
}

function resolveInbox(event, choiceId) {
  const result = game.resolveInbox(event.id, choiceId)
  if (result.ok) game.notify(result.text, 'good')
}

async function narrateEvent(event) {
  if (!event || narratingId.value) return
  if (llmReady.value === null) await checkLlm()
  narratingId.value = event.id
  const result = await game.narrateInboxEvent(event.id, llmReady.value === true)
  narratingId.value = ''
  if (result.ok) {
    game.notify(result.source === 'llm' ? '叙述已展开' : '本地叙述已展开', 'good')
  } else {
    game.notify(result.message, 'bad')
  }
}
</script>

<template>
  <div v-if="run" class="run-page">
    <section class="panel comms-head">
      <div>
        <p class="kicker">COMMS · RELATIONS</p>
        <h2>通讯与关系</h2>
        <p class="hint">
          每个人都有自己的日程与关系网。扎营推进一天后，他们会自己行动。
        </p>
      </div>
      <div class="head-meta">
        <span class="tag cyan">{{ npcs.length }} 人</span>
        <span class="tag amber">队伍 {{ partyNames.length }} / 2</span>
      </div>
    </section>

    <div v-if="ambushNpc" class="ambush">
      <div>
        <b>{{ ambushNpc.name }} 在你回来的路上等着。</b>
        <p>可以还手，也可以退让。退让会损失一部分信用点。</p>
      </div>
      <div class="ambush-actions">
        <button type="button" class="btn btn-sm" @click="settleAmbush">退让</button>
        <button type="button" class="btn btn-sm btn-primary" @click="fightAmbush">还手</button>
      </div>
    </div>

    <nav class="comms-tabs">
      <button type="button" :class="{ 'is-on': tab === 'inbox' }" @click="tab = 'inbox'">
        收件箱
        <span v-if="pendingInboxCount" class="tab-count">{{ pendingInboxCount }}</span>
      </button>
      <button type="button" :class="{ 'is-on': tab === 'roster' }" @click="tab = 'roster'">名册</button>
      <button type="button" :class="{ 'is-on': tab === 'network' }" @click="tab = 'network'">关系网</button>
      <button type="button" :class="{ 'is-on': tab === 'events' }" @click="tab = 'events'">动态</button>
    </nav>

    <section v-if="tab === 'inbox'" class="panel inbox-panel">
      <div class="inbox-head">
        <div>
          <h3>消息与约定</h3>
          <p class="hint">每天结束会有人来找你。每周会有一件更大的事。</p>
        </div>
        <span class="tag amber">{{ pendingInboxCount }} 条待处理</span>
      </div>

      <div v-if="inbox.length" class="inbox-list">
        <article
          v-for="event in inbox"
          :key="event.id"
          class="inbox-card"
          :class="eventCardTone(event.type)"
        >
          <header>
            <span class="tag" :class="eventTone(event.type)">{{ EVENT_TYPES[event.type]?.label || event.type }}</span>
            <span class="inbox-day">D{{ event.day }} · {{ npcName(event.npcId) }}</span>
            <span v-if="event.weekly" class="tag violet">本周</span>
          </header>
          <h4>{{ event.title }}</h4>
          <p>{{ event.text }}</p>
          <div v-if="event.narrative" class="inbox-narrative">
            <p>{{ event.narrative }}</p>
            <span class="tag" :class="event.narrativeSource === 'llm' ? 'cyan' : 'jade'">
              {{ event.narrativeSource === 'llm' ? '模型叙述' : '本地叙述' }}
            </span>
          </div>
          <button
            v-else
            type="button"
            class="btn btn-ghost btn-sm inbox-narrate"
            :disabled="narratingId === event.id"
            @click="narrateEvent(event)"
          >
            {{ narratingId === event.id ? '展开中…' : '细读' }}
          </button>
          <div class="inbox-actions">
            <button
              v-for="choice in event.choices"
              :key="choice.id"
              type="button"
              class="btn btn-sm"
              @click="resolveInbox(event, choice.id)"
            >
              {{ choice.label }}
            </button>
          </div>
        </article>
      </div>
      <p v-else class="inbox-empty">收件箱是空的。扎营推进一天，会有人给你发消息。</p>

      <div v-if="weeklySummary" class="weekly-card">
        <span class="kicker">WEEKLY · D{{ run.weekly?.day }}</span>
        <p>{{ weeklySummary }}</p>
      </div>

      <div v-if="activeQuests.length" class="quest-box">
        <h4>进行中的约定</h4>
        <div v-for="quest in activeQuests" :key="quest.id" class="quest-row">
          <span>{{ npcName(quest.npcId) }}</span>
          <b>{{ quest.nodeTitle }}</b>
          <em>D{{ quest.deadline }} 前</em>
        </div>
      </div>
    </section>

    <section v-if="tab === 'roster'" class="panel roster-panel">
      <div class="roster-grid">
        <button
          v-for="npc in npcs"
          :key="npc.id"
          type="button"
          class="roster-card"
          :class="{ 'is-dead': !npc.alive, 'is-hostile': npc.hostile }"
          @click="openDetail(npc)"
        >
          <span class="rc-ava">{{ npc.name.slice(0, 1) }}</span>
          <span class="rc-main">
            <span class="rc-line">
              <b>{{ npc.name }}</b>
              <em>{{ npc.abo }} · {{ npc.role }}</em>
            </span>
            <span class="rc-sub">{{ factionName(npc.faction) }} · {{ REGIONS[npc.home].name }}</span>
            <span class="rc-tags">
              <span
                v-for="tag in tagsOf(npc).slice(0, 3)"
                :key="tag.id"
                class="npc-tag"
                :class="`is-${tag.category}`"
              >{{ tag.name }}</span>
            </span>
            <span class="rc-bar"><i :style="{ width: `${axisPercent(npc.relation.trust)}%` }"></i></span>
          </span>
          <span class="rc-tags">
            <span v-if="npc.party" class="tag jade">队伍</span>
            <span v-else-if="npc.hostile" class="tag red">敌视</span>
          </span>
        </button>
      </div>
      <p class="hint roster-hint">点击人物查看四轴关系、兴趣与日程。</p>
    </section>

    <section v-else-if="tab === 'network'" class="panel network">
      <div v-if="edges.length" class="edge-list">
        <button v-for="(edge, index) in edges" :key="index" type="button" class="edge" @click="openEdge(edge)">
          <span class="edge-names">
            <b>{{ run.npcs[edge.a].name }}</b>
            <i>↔</i>
            <b>{{ run.npcs[edge.b].name }}</b>
          </span>
          <span class="edge-bars">
            <span class="bar"><i :style="{ width: `${axisPercent(edge.trust)}%` }"></i></span>
            <span v-if="edge.rivalry > 50" class="tag red">对立</span>
            <span v-else-if="edge.trust > 70" class="tag jade">亲近</span>
          </span>
        </button>
      </div>
      <div v-else class="empty">他们之间还没有形成稳定的关系。</div>
      <p class="hint network-hint">关系会随每日行动漂移，也会受到你的行为影响。</p>
    </section>

    <section v-else class="panel events">
      <div v-if="run.worldEvents?.length" class="event-list">
        <div v-for="(event, index) in run.worldEvents.slice(0, 24)" :key="index" class="event" :class="event.kind">
          <span class="event-day">D{{ event.day }}</span>
          <p>{{ event.text }}</p>
        </div>
      </div>
      <div v-else class="empty">还没有发生什么。扎营推进一天，NPC 会开始自己行动。</div>
    </section>

    <Teleport to="body">
      <Transition name="sheet">
        <div v-if="detailOpen && selected" class="sheet-backdrop" @click.self="closeDetail">
          <div class="npc-sheet">
            <header class="npc-sheet-head">
              <div class="npc-sheet-id">
                <span class="npc-ava">{{ selected.name.slice(0, 1) }}</span>
                <div>
                  <p class="kicker">{{ factionName(selected.faction) }} · {{ REGIONS[selected.home].name }}</p>
                  <h3>{{ selected.name }}</h3>
                  <p class="sub">{{ selected.abo }} · {{ selected.role }}</p>
                </div>
              </div>
              <button type="button" class="icon-btn" aria-label="关闭" @click="closeDetail">✕</button>
            </header>

            <div class="npc-sheet-body">
              <div class="sheet-tags">
                <span v-if="selected.party" class="tag jade">队伍中</span>
                <span v-if="selected.hostile" class="tag red">敌视</span>
                <span v-if="!selected.alive" class="tag red">已死亡</span>
                <span v-if="selected.bias >= 20" class="tag cyan">初次印象不错</span>
                <span v-else-if="selected.bias <= -15" class="tag">初次印象很差</span>
              </div>

              <h4 class="sec-title">关系</h4>
              <div class="axes">
                <div v-for="axis in AXES" :key="axis.key" class="axis-row">
                  <span>{{ axis.name }}</span>
                  <span class="bar"><i :style="{ width: `${axisPercent(selected.relation[axis.key])}%` }"></i></span>
                  <b>{{ selected.relation[axis.key] }}</b>
                </div>
                <div class="axis-row is-grievance">
                  <span>怨念</span>
                  <span class="bar"><i :style="{ width: `${axisPercent(selected.relation.grievance)}%` }"></i></span>
                  <b>{{ selected.relation.grievance }}</b>
                </div>
              </div>
              <div class="tag-affinity" :class="{ bad: (selected.tagBias || 0) < 0 }">
                标签契合 {{ (selected.tagBias || 0) > 0 ? '+' : '' }}{{ selected.tagBias || 0 }}
              </div>

              <h4 class="sec-title">探知详情</h4>
              <div v-if="loreInfo" class="lore-box">
                <div class="lore-tiers">
                  <button
                    v-for="tier in loreInfo.tiers"
                    :key="tier.id"
                    type="button"
                    class="lore-tier"
                    :class="{ 'is-on': loreTierId === tier.id, 'is-locked': !tier.unlocked }"
                    @click="selectLoreTier(tier.id)"
                  >
                    <span>{{ tier.name }}</span>
                    <em>{{ tier.used }}/{{ tier.slots.length }}</em>
                  </button>
                </div>

                <p v-if="!loreInfo.selected.unlocked" class="lore-note">
                  需要信任 {{ loreInfo.selected.trust }}、亲近 {{ loreInfo.selected.closeness }}。当前：信任
                  {{ selected.relation.trust }}，亲近 {{ selected.relation.closeness }}。
                </p>
                <p v-else-if="loreInfo.selected.remaining === 0" class="lore-note">
                  这一层已经看完了。可以切换到其他已解锁层级，或继续提升关系。
                </p>
                <p v-else class="lore-note">
                  这一层还能探知 {{ loreInfo.selected.remaining }} 条。每次只会展开一段。
                </p>

                <button
                  type="button"
                  class="btn btn-sm btn-primary lore-btn"
                  :disabled="loreBusy || !loreInfo.selected.unlocked || loreInfo.selected.remaining === 0"
                  @click="doLore"
                >
                  {{ loreBusy ? '正在拼合…' : !loreInfo.selected.unlocked ? '尚未解锁' : loreInfo.selected.remaining > 0 ? `探知 · ${loreInfo.selected.name}` : '这一层已看完' }}
                </button>

                <p v-if="loreError" class="lore-error">本地补全原因：{{ loreError }}</p>

                <div v-if="loreInfo.latest" class="lore-entry">
                  <div class="lore-entry-head">
                    <span class="kicker">{{ loreInfo.latest.tierName }} · {{ loreInfo.latest.slotLabel }} · D{{ loreInfo.latest.day }}</span>
                    <span class="tag" :class="loreInfo.latest.source === 'llm' ? 'cyan' : 'jade'">
                      {{ loreInfo.latest.source === 'llm' ? '模型记录' : '本地档案' }}
                    </span>
                  </div>
                  <p>{{ loreInfo.latest.text }}</p>
                  <span class="lore-count">已探知 {{ loreInfo.total }} 条</span>
                </div>
              </div>

              <h4 class="sec-title">标签</h4>
              <div class="tag-list">
                <div
                  v-for="tag in tagsOf(selected)"
                  :key="tag.id"
                  class="tag-item"
                  :class="`is-${tag.category}`"
                >
                  <div class="tag-item-head">
                    <b>{{ tag.name }}</b>
                    <span>{{ TAG_CATEGORIES[tag.category]?.label || tag.category }}</span>
                  </div>
                  <p>{{ tag.desc }}</p>
                </div>
              </div>

              <h4 class="sec-title">性格与兴趣</h4>
              <div class="personality">
                <span v-for="(label, key) in PERSONALITY_LABELS" :key="key">
                  {{ label }} <b>{{ selected.personality[key] }}</b>
                </span>
              </div>
              <div class="chips">
                <span v-for="interest in selected.interests" :key="interest" class="tag">{{ interest }}</span>
              </div>

              <h4 class="sec-title">日程</h4>
              <div class="schedule">
                <p v-for="(item, index) in selected.schedule" :key="index">
                  <span>{{ ['晨间', '午后', '黄昏'][index] || '时段' }}</span>{{ item }}
                </p>
              </div>

              <h4 class="sec-title">记忆</h4>
              <div class="memory">
                <p v-for="(item, index) in selected.memory.slice(0, 4)" :key="index">
                  <span>D{{ item.day }}</span>{{ item.text }}
                </p>
              </div>

              <h4 class="sec-title">长期记忆</h4>
              <div class="long-memory">
                <div
                  v-for="entry in (selected.longMemory || []).slice(-3)"
                  :key="entry.week"
                  class="long-memory-item"
                >
                  <span class="kicker">W{{ entry.week }} · D{{ entry.day }}</span>
                  <p>{{ entry.text }}</p>
                </div>
                <p v-if="!selected.longMemory?.length" class="hint">每周结束时会自动整理这一周发生的事。</p>
              </div>

              <p v-if="reply" class="reply">{{ reply }}</p>

              <div class="npc-actions">
                <button type="button" class="btn btn-sm btn-primary" :disabled="!selected.alive" @click="openChat(selected)">
                  对话
                </button>
                <button type="button" class="btn btn-sm" :disabled="!selected.alive || selected.hostile" @click="giftOpen = !giftOpen">
                  赠送
                </button>
                <button type="button" class="btn btn-sm" :disabled="!selected.alive || selected.hostile" @click="doTalk('life')">
                  近况
                </button>
                <button type="button" class="btn btn-sm" :disabled="!selected.alive || selected.hostile" @click="doTalk('interest')">
                  兴趣
                </button>
                <button type="button" class="btn btn-sm" :disabled="!selected.alive || selected.hostile" @click="doTalk('probe')">
                  试探
                </button>
                <button
                  v-if="!selected.party"
                  type="button"
                  class="btn btn-sm"
                  :disabled="!inviteCheck.ok"
                  :title="inviteCheck.reason"
                  @click="doInvite"
                >
                  组队
                </button>
                <button v-else type="button" class="btn btn-sm" @click="doLeave">离队</button>
                <button
                  type="button"
                  class="btn btn-sm"
                  :disabled="!selected.alive || selected.hostile"
                  title="敏捷判定；有扒窃能力时 +2"
                  @click="doSteal"
                >
                  扒窃
                </button>
                <button type="button" class="btn btn-sm" :disabled="!selected.alive || selected.hostile" @click="doThreat">
                  威胁
                </button>
                <button type="button" class="btn btn-sm" :disabled="!selected.alive" @click="doApologize">
                  道歉 · 40
                </button>
              </div>

              <div v-if="giftOpen" class="gift-box">
                <p class="hint">选一件东西。兴趣匹配的物品效果更好，重复赠送会饱和。</p>
                <div v-if="giftItems.length" class="gift-grid">
                  <button
                    v-for="item in giftItems"
                    :key="item.key"
                    type="button"
                    class="gift"
                    @click="doGift(item.key)"
                  >
                    <span class="i-glyph">{{ item.glyph }}</span>
                    <span>{{ item.name }} ×{{ item.count }}</span>
                  </button>
                </div>
                <p v-else class="hint">背包里没有可以送的东西。</p>
              </div>

              <p v-if="!selected.party" class="hint party-hint">
                组队需要信任 50、亲近 30，队伍上限 2 人。队员会在战斗牌堆里加入「同伴支援」。
              </p>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <Teleport to="body">
      <Transition name="chat">
        <div v-if="chatOpen && selected" class="chat-backdrop" @click.self="closeChat">
          <div class="chat-panel">
            <header class="chat-head">
              <div class="chat-id">
                <span class="npc-ava">{{ selected.name.slice(0, 1) }}</span>
                <div>
                  <p class="kicker">{{ factionName(selected.faction) }} · {{ REGIONS[selected.home].name }}</p>
                  <h3>{{ selected.name }}</h3>
                </div>
              </div>
              <div class="chat-meta">
                <span class="tag cyan">信任 {{ selected.relation.trust }}</span>
                <span class="tag" :class="llmReady === false ? 'amber' : 'jade'">
                  {{ llmReady === false ? '本地对白' : llmReady ? 'LLM 已就绪' : '检查中' }}
                </span>
                <button type="button" class="icon-btn" aria-label="关闭" @click="closeChat">✕</button>
              </div>
            </header>

            <div ref="chatLog" class="chat-log">
              <div v-if="!chatMessages.length" class="chat-empty">
                <p>频道已经接通。</p>
                <p class="hint">可以直接说话。语气会受性格、派系与当前关系影响。</p>
              </div>
              <div
                v-for="(message, index) in chatMessages"
                :key="index"
                class="chat-msg"
                :class="message.role"
              >
                <div class="bubble">
                  <p>{{ message.text }}<span v-if="message.streaming" class="cursor">▍</span></p>
                  <span v-if="message.fallback" class="tag">本地</span>
                </div>
              </div>
            </div>

            <footer class="chat-foot">
              <div v-if="llmReady === false" class="chat-note">
                未配置模型，发送后会使用本地对白。
                <RouterLink to="/settings/llm">去配置</RouterLink>
              </div>
              <div class="chat-input">
                <input
                  v-model="chatInput"
                  maxlength="300"
                  placeholder="说点什么…"
                  :disabled="chatStreaming"
                  @keyup.enter="sendChat"
                />
                <button
                  type="button"
                  class="btn btn-primary"
                  :disabled="!chatInput.trim() || chatStreaming"
                  @click="sendChat"
                >
                  {{ chatStreaming ? '…' : '发送' }}
                </button>
              </div>
              <p class="chat-budget">本局剩余模型调用 {{ chatRemaining }} 次</p>
            </footer>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.comms-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 18px;
}
.comms-head h2 { margin-top: 3px; font-size: max(var(--ui-min), calc(20px * var(--ui-scale))); font-weight: 400; letter-spacing: 0.1em; }
.comms-head .hint { margin-top: 3px; max-width: 48em; }
.head-meta { display: flex; gap: 5px; flex-wrap: wrap; justify-content: flex-end; }

.ambush {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
  padding: 11px 13px;
  border: 1px solid rgba(255, 138, 138, .32);
  border-radius: 12px;
  background: rgba(255, 138, 138, .06);
}
.ambush b { color: var(--red); font-size: max(var(--ui-min), calc(12px * var(--ui-scale))); font-weight: 500; }
.ambush p { margin-top: 2px; color: var(--muted); font-size: max(var(--ui-min), calc(9.5px * var(--ui-scale))); }
.ambush-actions { display: flex; gap: 5px; }

.comms-tabs { display: flex; gap: 4px; }
.comms-tabs button {
  height: 30px;
  padding: 0 14px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: transparent;
  color: var(--dim);
  font-size: max(var(--ui-min), calc(11px * var(--ui-scale)));
  cursor: pointer;
}
.comms-tabs button.is-on { border-color: rgba(124, 231, 255, .3); background: rgba(124, 231, 255, .08); color: var(--cyan); }
.tab-count {
  display: inline-grid;
  place-items: center;
  min-width: 15px;
  height: 15px;
  margin-left: 4px;
  padding: 0 3px;
  border-radius: 8px;
  background: var(--red);
  color: #1a0507;
  font-family: var(--mono);
  font-size: max(var(--ui-min), calc(8px * var(--ui-scale)));
}

.inbox-panel { padding: 13px; }
.inbox-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; margin-bottom: 10px; }
.inbox-head h3 { font-size: max(var(--ui-min), calc(14px * var(--ui-scale))); font-weight: 400; }
.inbox-list { display: flex; flex-direction: column; gap: 7px; }
.inbox-card {
  padding: 10px 11px;
  border: 1px solid var(--line);
  border-left: 2px solid var(--line);
  border-radius: 10px;
  background: rgba(5, 10, 16, .45);
}
.inbox-card header { display: flex; align-items: center; flex-wrap: wrap; gap: 5px; }
.inbox-day { color: var(--dim); font-family: var(--mono); font-size: max(var(--ui-min), calc(8px * var(--ui-scale))); }
.inbox-card h4 { margin-top: 5px; font-size: max(var(--ui-min), calc(12px * var(--ui-scale))); font-weight: 500; }
.inbox-card p { margin-top: 3px; color: var(--muted); font-size: max(var(--ui-min), calc(10px * var(--ui-scale))); line-height: 1.7; }
.inbox-actions { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 8px; }
.inbox-actions .btn { height: 28px; padding: 0 10px; font-size: max(var(--ui-min), calc(9.5px * var(--ui-scale))); }
.inbox-narrate { margin-top: 5px; height: 26px; padding: 0 8px; font-size: max(var(--ui-min), calc(9px * var(--ui-scale))); }
.inbox-narrative {
  margin-top: 6px;
  padding: 7px 8px;
  border-left: 2px solid rgba(124, 231, 255, .3);
  border-radius: 0 6px 6px 0;
  background: rgba(124, 231, 255, .04);
}
.inbox-narrative p { margin-top: 0; color: var(--muted); font-size: max(var(--ui-min), calc(10px * var(--ui-scale))); line-height: 1.7; }
.inbox-narrative .tag { margin-top: 4px; }
.inbox-empty { padding: 18px 4px; color: var(--dim); font-size: max(var(--ui-min), calc(10px * var(--ui-scale))); text-align: center; }
.inbox-card.is-cyan { border-left-color: rgba(124, 231, 255, .5); }
.inbox-card.is-jade { border-left-color: rgba(138, 222, 184, .5); }
.inbox-card.is-amber { border-left-color: rgba(255, 196, 107, .5); }
.inbox-card.is-violet { border-left-color: rgba(185, 164, 255, .55); }
.inbox-card.is-red { border-left-color: rgba(255, 138, 138, .55); }
.weekly-card {
  margin-top: 10px;
  padding: 10px;
  border: 1px solid rgba(185, 164, 255, .22);
  border-radius: 9px;
  background: rgba(185, 164, 255, .05);
}
.weekly-card p { margin-top: 4px; color: var(--muted); font-size: max(var(--ui-min), calc(10px * var(--ui-scale))); line-height: 1.7; }
.quest-box { margin-top: 10px; padding-top: 8px; border-top: 1px solid var(--line); }
.quest-box h4 { color: var(--dim); font-family: var(--mono); font-size: max(var(--ui-min), calc(9px * var(--ui-scale))); letter-spacing: .1em; }
.quest-row {
  display: flex;
  align-items: baseline;
  gap: 7px;
  padding: 5px 0;
  border-bottom: 1px solid rgba(255, 255, 255, .04);
  font-size: max(var(--ui-min), calc(9px * var(--ui-scale)));
}
.quest-row span { color: var(--cyan); }
.quest-row b { flex: 1; font-weight: 400; color: var(--ink); }
.quest-row em { color: var(--amber); font-family: var(--mono); font-size: max(var(--ui-min), calc(8px * var(--ui-scale))); font-style: normal; }

.roster-panel { padding: 12px; }
.roster-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px; }
.roster-card {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 9px 10px;
  border: 1px solid var(--line);
  border-radius: 11px;
  background: rgba(5, 10, 16, .45);
  text-align: left;
  cursor: pointer;
  transition: border-color .16s ease, background .16s ease;
}
.roster-card.is-hostile { border-color: rgba(255, 138, 138, .24); }
.roster-card.is-dead { opacity: .35; }
.rc-ava {
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  flex: none;
  border: 1px solid rgba(185, 164, 255, .28);
  border-radius: 50%;
  background: rgba(185, 164, 255, .07);
  color: var(--violet);
  font-size: max(var(--ui-min), calc(11px * var(--ui-scale)));
}
.rc-main { flex: 1; min-width: 0; }
.rc-line { display: flex; align-items: baseline; gap: 6px; }
.rc-line b { font-size: max(var(--ui-min), calc(12px * var(--ui-scale))); font-weight: 500; }
.rc-line em { color: var(--dim); font-family: var(--mono); font-size: max(var(--ui-min), calc(8px * var(--ui-scale))); font-style: normal; white-space: nowrap; }
.rc-sub { display: block; color: var(--dim); font-size: max(var(--ui-min), calc(8.5px * var(--ui-scale))); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.rc-bar { display: block; height: 3px; margin-top: 4px; border-radius: 3px; background: rgba(255, 255, 255, .06); overflow: hidden; }
.rc-bar i { display: block; height: 100%; background: linear-gradient(90deg, rgba(124, 231, 255, .35), var(--cyan)); }
.rc-tags { display: flex; flex-wrap: wrap; gap: 3px; margin-top: 3px; }
.npc-tag {
  padding: 1px 4px;
  border: 1px solid var(--line);
  border-radius: 3px;
  color: var(--muted);
  font-family: var(--mono);
  font-size: max(var(--ui-min), calc(7.5px * var(--ui-scale)));
  line-height: 1.45;
}
.npc-tag.is-background, .npc-tag.is-body { border-color: rgba(124, 231, 255, .24); color: var(--cyan); }
.npc-tag.is-personality { border-color: rgba(255, 196, 107, .24); color: var(--amber); }
.npc-tag.is-values { border-color: rgba(185, 164, 255, .26); color: var(--violet); }
.npc-tag.is-profession { border-color: rgba(138, 222, 184, .24); color: var(--jade); }
.npc-tag.is-quirk { border-color: var(--line); color: var(--dim); }
.npc-tag.is-social, .npc-tag.is-shadow { border-color: rgba(255, 138, 138, .24); color: var(--red); }

.tag-affinity {
  margin-top: 6px;
  padding: 3px 7px;
  border: 1px solid rgba(138, 222, 184, .24);
  border-radius: 5px;
  color: var(--jade);
  font-family: var(--mono);
  font-size: max(var(--ui-min), calc(8px * var(--ui-scale)));
  text-align: center;
}
.tag-affinity.bad { border-color: rgba(255, 138, 138, .26); color: var(--red); }
.lore-box {
  padding: 9px;
  border: 1px solid rgba(185, 164, 255, .18);
  border-radius: 10px;
  background:
    linear-gradient(150deg, rgba(185, 164, 255, .055), rgba(5, 10, 16, .3));
}
.lore-tiers { display: flex; flex-wrap: wrap; gap: 4px; }
.lore-tier {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 26px;
  padding: 0 7px;
  border: 1px solid var(--line);
  border-radius: 6px;
  background: transparent;
  color: var(--dim);
  font-size: max(var(--ui-min), calc(9px * var(--ui-scale)));
  cursor: pointer;
}
.lore-tier span { white-space: nowrap; }
.lore-tier em { color: var(--dim); font-family: var(--mono); font-size: max(var(--ui-min), calc(7.5px * var(--ui-scale))); font-style: normal; }
.lore-tier.is-on { border-color: rgba(185, 164, 255, .45); background: rgba(185, 164, 255, .1); color: var(--violet); }
.lore-tier.is-on em { color: var(--violet); }
.lore-tier.is-locked { opacity: .42; }
.lore-note { margin-top: 7px; color: var(--dim); font-size: max(var(--ui-min), calc(9px * var(--ui-scale))); line-height: 1.6; }
.lore-btn { margin-top: 8px; }
.lore-error { margin-top: 6px; color: var(--red); font-size: max(var(--ui-min), calc(8.5px * var(--ui-scale))); line-height: 1.5; }
.lore-entry {
  margin-top: 9px;
  padding: 8px 9px;
  border: 1px solid rgba(124, 231, 255, .16);
  border-radius: 8px;
  background: rgba(4, 8, 13, .4);
}
.lore-entry-head { display: flex; align-items: center; justify-content: space-between; gap: 6px; }
.lore-entry p { margin-top: 5px; color: var(--muted); font-size: max(var(--ui-min), calc(10px * var(--ui-scale))); line-height: 1.75; }
.lore-count { display: block; margin-top: 5px; color: var(--dim); font-family: var(--mono); font-size: max(var(--ui-min), calc(7.5px * var(--ui-scale))); text-align: right; }
.tag-list { display: flex; flex-direction: column; gap: 4px; }
.tag-item {
  padding: 6px 8px;
  border-left: 2px solid var(--line);
  border-radius: 0 7px 7px 0;
  background: rgba(5, 10, 16, .35);
}
.tag-item-head { display: flex; align-items: baseline; justify-content: space-between; gap: 6px; }
.tag-item-head b { color: var(--ink); font-size: max(var(--ui-min), calc(10px * var(--ui-scale))); font-weight: 500; }
.tag-item-head span { color: var(--dim); font-family: var(--mono); font-size: max(var(--ui-min), calc(7.5px * var(--ui-scale))); }
.tag-item p { margin-top: 1px; color: var(--muted); font-size: max(var(--ui-min), calc(9px * var(--ui-scale))); line-height: 1.55; }
.tag-item.is-background, .tag-item.is-body { border-color: rgba(124, 231, 255, .35); }
.tag-item.is-personality { border-color: rgba(255, 196, 107, .38); }
.tag-item.is-values { border-color: rgba(185, 164, 255, .38); }
.tag-item.is-profession { border-color: rgba(138, 222, 184, .38); }
.tag-item.is-social, .tag-item.is-shadow { border-color: rgba(255, 138, 138, .38); }

.roster-hint { margin-top: 10px; text-align: center; }

.network { padding: 12px; }
.edge-list { display: flex; flex-direction: column; gap: 4px; }
.edge {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 8px 10px;
  border: 1px solid var(--line);
  border-radius: 9px;
  background: rgba(5, 10, 16, .4);
  cursor: pointer;
}
.edge-names { display: flex; align-items: baseline; gap: 6px; font-size: max(var(--ui-min), calc(10.5px * var(--ui-scale))); }
.edge-names b { font-weight: 500; }
.edge-names i { color: var(--dim); font-style: normal; }
.edge-bars { display: flex; align-items: center; gap: 7px; flex: none; width: 42%; }
.edge-bars .bar { flex: 1; height: 3px; }
.edge-bars .bar i { background: linear-gradient(90deg, rgba(185, 164, 255, .35), var(--violet)); }
.network-hint { margin-top: 10px; text-align: center; }

.events { padding: 12px; }
.event-list { display: flex; flex-direction: column; gap: 4px; }
.event { display: flex; gap: 8px; padding: 6px 0; border-bottom: 1px dashed var(--line); }
.event-day { flex: none; width: 30px; color: var(--dim); font-family: var(--mono); font-size: max(var(--ui-min), calc(8px * var(--ui-scale))); }
.event p { color: var(--muted); font-size: max(var(--ui-min), calc(10.5px * var(--ui-scale))); line-height: 1.7; }
.event.bad p { color: var(--red); }
.event.good p { color: var(--jade); }

.empty {
  padding: 28px 12px;
  border: 1px dashed rgba(126, 196, 224, .14);
  border-radius: 12px;
  color: var(--dim);
  font-size: max(var(--ui-min), calc(10.5px * var(--ui-scale)));
  text-align: center;
  line-height: 1.8;
}

/* 详情 */
.sheet-backdrop {
  position: fixed;
  inset: 0;
  z-index: 120;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  background: rgba(2, 5, 9, .74);
  backdrop-filter: blur(8px);
}
.npc-sheet {
  width: min(560px, 100%);
  max-height: 90dvh;
  display: flex;
  flex-direction: column;
  border: 1px solid var(--line-2);
  border-radius: 20px 20px 0 0;
  background:
    radial-gradient(500px 220px at 88% -10%, rgba(185, 164, 255, .12), transparent 65%),
    linear-gradient(170deg, rgba(11, 19, 28, .98), rgba(4, 8, 13, .99));
  box-shadow: 0 -30px 80px -30px #000;
  overflow: hidden;
}
.npc-sheet-head {
  flex: none;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  padding: 15px 16px 10px;
  border-bottom: 1px solid var(--line);
}
.npc-sheet-id { display: flex; align-items: center; gap: 10px; }
.npc-ava {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  flex: none;
  border: 1px solid rgba(185, 164, 255, .34);
  border-radius: 50%;
  background: rgba(185, 164, 255, .08);
  color: var(--violet);
  font-size: max(var(--ui-min), calc(15px * var(--ui-scale)));
}
.npc-sheet-id h3 { margin-top: 2px; font-size: max(var(--ui-min), calc(18px * var(--ui-scale))); font-weight: 400; letter-spacing: 0.08em; }
.npc-sheet-id .sub { color: var(--muted); font-size: max(var(--ui-min), calc(10px * var(--ui-scale))); }
.npc-sheet-body { overflow-y: auto; padding: 12px 16px calc(18px + env(safe-area-inset-bottom)); }
.sheet-tags { display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 4px; }

.sec-title {
  margin: 13px 0 6px;
  color: var(--dim);
  font-family: var(--mono);
  font-size: max(var(--ui-min), calc(8.5px * var(--ui-scale)));
  font-weight: 500;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}
.axes { display: flex; flex-direction: column; gap: 4px; }
.axis-row { display: grid; grid-template-columns: 34px minmax(0, 1fr) 24px; align-items: center; gap: 8px; }
.axis-row > span:first-child { color: var(--muted); font-size: max(var(--ui-min), calc(9.5px * var(--ui-scale))); }
.axis-row .bar { height: 4px; }
.axis-row .bar i { background: linear-gradient(90deg, rgba(124, 231, 255, .35), var(--cyan)); }
.axis-row.is-grievance .bar i { background: linear-gradient(90deg, rgba(255, 138, 138, .35), var(--red)); }
.axis-row b { text-align: right; font-family: var(--mono); font-size: max(var(--ui-min), calc(10px * var(--ui-scale))); font-weight: 500; }

.personality { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 4px; }
.personality span { padding: 4px 6px; border: 1px solid var(--line); border-radius: 6px; color: var(--dim); font-size: max(var(--ui-min), calc(8.5px * var(--ui-scale))); }
.personality b { color: var(--muted); font-family: var(--mono); font-weight: 500; }
.chips { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 5px; }

.schedule, .memory { display: flex; flex-direction: column; gap: 3px; }
.schedule p, .memory p { color: var(--muted); font-size: max(var(--ui-min), calc(9.5px * var(--ui-scale))); line-height: 1.6; }
.schedule span, .memory span { margin-right: 7px; color: var(--dim); font-family: var(--mono); font-size: max(var(--ui-min), calc(8px * var(--ui-scale))); }
.long-memory { display: flex; flex-direction: column; gap: 6px; }
.long-memory-item {
  padding: 6px 8px;
  border-left: 2px solid rgba(185, 164, 255, .28);
  border-radius: 0 6px 6px 0;
  background: rgba(185, 164, 255, .035);
}
.long-memory-item p { margin-top: 2px; color: var(--muted); font-size: max(var(--ui-min), calc(9px * var(--ui-scale))); line-height: 1.6; }

.reply {
  margin-top: 10px;
  padding: 8px 10px;
  border: 1px solid rgba(185, 164, 255, .22);
  border-radius: 8px;
  background: rgba(185, 164, 255, .06);
  color: #ded7ff;
  font-size: max(var(--ui-min), calc(10.5px * var(--ui-scale)));
  line-height: 1.7;
}

.npc-actions { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 12px; padding-top: 10px; border-top: 1px solid var(--line); }
.npc-actions .btn { flex: 0 0 auto; }

.gift-box {
  margin-top: 10px;
  padding: 10px;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: rgba(4, 8, 13, .5);
}
.gift-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 5px; margin-top: 6px; }
.gift {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 6px 8px;
  border: 1px solid var(--line);
  border-radius: 7px;
  background: transparent;
  color: var(--muted);
  font-size: max(var(--ui-min), calc(9.5px * var(--ui-scale)));
  text-align: left;
  cursor: pointer;
}
.gift .i-glyph {
  display: grid;
  place-items: center;
  width: 22px;
  height: 22px;
  flex: none;
  border: 1px solid rgba(124, 231, 255, .2);
  border-radius: 5px;
  color: var(--cyan);
  font-size: max(var(--ui-min), calc(9px * var(--ui-scale)));
}
.party-hint { margin-top: 10px; }

.sheet-enter-active, .sheet-leave-active { transition: opacity .2s ease; }
.sheet-enter-active .npc-sheet, .sheet-leave-active .npc-sheet { transition: transform .24s cubic-bezier(.22, .61, .36, 1); }
.sheet-enter-from, .sheet-leave-to { opacity: 0; }
.sheet-enter-from .npc-sheet, .sheet-leave-to .npc-sheet { transform: translateY(24px); }

/* 对话 */
.chat-backdrop {
  position: fixed;
  inset: 0;
  z-index: 170;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: rgba(2, 5, 9, .82);
  backdrop-filter: blur(12px);
}
.chat-panel {
  width: min(640px, 100%);
  height: min(760px, 88dvh);
  display: flex;
  flex-direction: column;
  border: 1px solid var(--line-2);
  border-radius: 20px;
  background:
    radial-gradient(600px 260px at 90% -10%, rgba(124, 231, 255, .08), transparent 65%),
    linear-gradient(170deg, rgba(11, 19, 28, .99), rgba(4, 8, 13, .99));
  box-shadow: 0 40px 100px -30px #000;
  overflow: hidden;
}
.chat-head {
  flex: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 13px 15px;
  border-bottom: 1px solid var(--line);
}
.chat-id { display: flex; align-items: center; gap: 9px; }
.chat-id .npc-ava { width: 36px; height: 36px; font-size: max(var(--ui-min), calc(13px * var(--ui-scale))); }
.chat-id h3 { margin-top: 2px; font-size: max(var(--ui-min), calc(16px * var(--ui-scale))); font-weight: 400; letter-spacing: 0.08em; }
.chat-meta { display: flex; align-items: center; flex-wrap: wrap; justify-content: flex-end; gap: 5px; }
.chat-log {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 14px;
}
.chat-empty { margin: auto; text-align: center; color: var(--muted); font-size: max(var(--ui-min), calc(11px * var(--ui-scale))); line-height: 1.9; }
.chat-empty .hint { margin-top: 4px; }
.chat-msg { display: flex; }
.chat-msg.user { justify-content: flex-end; }
.chat-msg.npc { justify-content: flex-start; }
.chat-msg.system { justify-content: center; }
.bubble {
  max-width: 82%;
  padding: 8px 11px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: rgba(5, 10, 16, .62);
}
.chat-msg.user .bubble {
  border-color: rgba(124, 231, 255, .26);
  background: rgba(124, 231, 255, .09);
  border-bottom-right-radius: 4px;
}
.chat-msg.npc .bubble { border-bottom-left-radius: 4px; }
.chat-msg.system .bubble {
  max-width: 100%;
  border-style: dashed;
  border-radius: 999px;
  background: transparent;
  text-align: center;
}
.bubble p { white-space: pre-wrap; overflow-wrap: anywhere; font-size: max(var(--ui-min), calc(11.5px * var(--ui-scale))); line-height: 1.8; }
.chat-msg.system .bubble p { color: var(--dim); font-family: var(--mono); font-size: max(var(--ui-min), calc(9px * var(--ui-scale))); }
.bubble .tag { margin-top: 5px; }
.cursor { display: inline-block; margin-left: 1px; color: var(--cyan); animation: blink 1s steps(2) infinite; }
@keyframes blink { 50% { opacity: 0; } }

.chat-foot {
  flex: none;
  padding: 10px 13px calc(11px + env(safe-area-inset-bottom));
  border-top: 1px solid var(--line);
  background: rgba(4, 8, 13, .62);
}
.chat-note { margin-bottom: 7px; color: var(--amber); font-size: max(var(--ui-min), calc(9.5px * var(--ui-scale))); line-height: 1.6; }
.chat-note a { color: var(--cyan); text-decoration: underline; }
.chat-input { display: flex; gap: 6px; }
.chat-input input {
  flex: 1;
  min-width: 0;
  height: 38px;
  padding: 0 11px;
  border: 1px solid var(--line);
  border-radius: 9px;
  background: rgba(4, 8, 13, .75);
  color: var(--ink);
  font-size: max(var(--ui-min), calc(12px * var(--ui-scale)));
  outline: none;
}
.chat-input input:focus { border-color: rgba(124, 231, 255, .4); }
.chat-budget { margin-top: 5px; color: var(--dim); font-family: var(--mono); font-size: max(var(--ui-min), calc(8px * var(--ui-scale))); text-align: right; }

.chat-enter-active, .chat-leave-active { transition: opacity .18s ease; }
.chat-enter-active .chat-panel, .chat-leave-active .chat-panel { transition: transform .22s ease; }
.chat-enter-from, .chat-leave-to { opacity: 0; }
.chat-enter-from .chat-panel, .chat-leave-to .chat-panel { transform: translateY(14px) scale(.99); }

@media (min-width: 900px) {
  .roster-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .sheet-backdrop { align-items: center; padding: 20px; }
  .npc-sheet { width: min(720px, 100%); border-radius: 20px; }
  .npc-sheet-body { padding-bottom: 18px; }
  .chat-panel { width: min(760px, 100%); }
}

@media (max-width: 480px) {
  .roster-grid { grid-template-columns: 1fr; }
  .comms-head h2 { font-size: max(var(--ui-min), calc(18px * var(--ui-scale))); }
  .personality { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}

@media (max-width: 640px) {
  .chat-backdrop { padding: 0; align-items: stretch; }
  .chat-panel {
    width: 100%;
    height: 100dvh;
    max-height: none;
    border: 0;
    border-radius: 0;
    padding-top: env(safe-area-inset-top);
  }
  .chat-log { padding: 12px 10px; }
  .bubble { max-width: 88%; }
  .chat-input input { height: 42px; font-size: max(var(--ui-min), calc(16px * var(--ui-scale))); }
  .chat-input .btn { height: 42px; }
  .chat-meta .tag { font-size: max(var(--ui-min), calc(8.5px * var(--ui-scale))); }
}
</style>
