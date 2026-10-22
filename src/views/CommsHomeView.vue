<script setup>
import { computed } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import CommsPageHeader from '../components/CommsPageHeader.vue'
import { contactList, unreadCount } from '../game-core/npc-contact.js'
import { useGameStore } from '../stores/game.js'

const game = useGameStore()
const route = useRoute()
const router = useRouter()
const run = computed(() => game.run)
const ambushNpc = computed(() => (
  run.value?.pendingAmbush ? run.value.npcs?.[run.value.pendingAmbush] || null : null
))
const unread = computed(() => (run.value ? unreadCount(run.value) : 0))
const pending = computed(() => (run.value?.inbox || []).filter((event) => event.status === 'pending').length)
const contacts = computed(() => (run.value ? contactList(run.value) : []))
const moments = computed(() => run.value?.social?.moments?.length || 0)
const forum = computed(() => run.value?.social?.forumPosts?.length || 0)
const world = computed(() => run.value?.worldEvents?.length || 0)
const runId = computed(() => route.params.runId)

function settleAmbush() {
  const result = game.settleAmbush()
  if (result.ok) game.notify(`你退让了，支付 ${result.credits} 信用点`, 'bad')
}

function fightAmbush() {
  const nodeId = game.startAmbushBattle()
  if (nodeId && run.value) router.push({ name: 'battle', params: { runId: run.value.id, nodeId } })
}

const apps = computed(() => [
  { key: 'messages', to: 'comms-messages', icon: '✉', label: '对话', hint: `${contacts.value.length} 个联系人`, count: unread.value },
  { key: 'inbox', to: 'comms-inbox', icon: '!', label: '收件箱', hint: '每日事件与约定', count: pending.value },
  { key: 'social', to: 'comms-social', icon: '◈', label: '社交圈', hint: '他们最近在做什么', count: moments.value },
  { key: 'forum', to: 'comms-forum', icon: '#', label: '论坛', hint: '空港与边境的讨论', count: forum.value },
  { key: 'roster', to: 'comms-roster', icon: '◎', label: '名册', hint: '你认识的人', count: 0 },
  { key: 'network', to: 'comms-network', icon: '⌘', label: '关系网', hint: 'NPC 之间的关系', count: 0 },
  { key: 'events', to: 'comms-events', icon: '✧', label: '世界动态', hint: '星区正在发生的事', count: world.value },
])
</script>

<template>
  <div v-if="run" class="run-page comms-home">
    <CommsPageHeader
      kicker="COMMS · HOME"
      title="通讯"
      hint="像一个真正的终端：每个应用都有独立页面。"
      back-to="map"
      back-label="地图"
    >
      <span class="tag cyan">{{ contacts.length }} 联系人</span>
    </CommsPageHeader>

    <section v-if="ambushNpc" class="panel ambush-card">
      <div>
        <b>{{ ambushNpc.name }} 在你回来的路上等着。</b>
        <p>可以还手，也可以退让。退让会损失一部分信用点。</p>
      </div>
      <div class="ambush-actions">
        <button type="button" class="btn btn-sm" @click="settleAmbush">退让</button>
        <button type="button" class="btn btn-sm btn-primary" @click="fightAmbush">还手</button>
      </div>
    </section>

    <section class="comms-app-grid">
      <RouterLink
        v-for="app in apps"
        :key="app.key"
        :to="{ name: app.to, params: { runId } }"
        class="comms-app"
      >
        <span class="app-icon">{{ app.icon }}</span>
        <span class="app-body">
          <b>{{ app.label }}</b>
          <small>{{ app.hint }}</small>
        </span>
        <span v-if="app.count" class="app-count">{{ app.count > 99 ? '99+' : app.count }}</span>
      </RouterLink>
    </section>

    <section class="panel comms-home-tip">
      <p class="kicker">QUICK NOTE</p>
      <p>对话里可以置顶、免打扰或删除联系人。论坛点进帖子才会展开完整讨论。</p>
    </section>
  </div>
</template>

<style scoped>
.comms-home { display: flex; flex-direction: column; gap: 10px; }
.comms-app-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
.comms-app { position: relative; display: flex; align-items: center; gap: 10px; min-height: 68px; padding: 11px 12px; border: 1px solid var(--line); border-radius: 12px; background: linear-gradient(145deg, rgba(124,231,255,.055), rgba(5,10,16,.4)); color: var(--ink); text-decoration: none; }
.comms-app:hover { border-color: rgba(124,231,255,.32); background: rgba(124,231,255,.06); }
.app-icon { display: grid; place-items: center; width: 30px; height: 30px; flex: none; border: 1px solid rgba(124,231,255,.28); border-radius: 9px; color: var(--cyan); font-family: var(--mono); font-size: 15px; }
.app-body { display: flex; flex-direction: column; min-width: 0; }
.app-body b { font-size: max(var(--ui-min), calc(13px * var(--ui-scale))); font-weight: 500; }
.app-body small { margin-top: 2px; overflow: hidden; color: var(--dim); font-size: max(var(--ui-min), calc(8.5px * var(--ui-scale))); text-overflow: ellipsis; white-space: nowrap; }
.app-count { position: absolute; top: 7px; right: 8px; display: grid; place-items: center; min-width: 17px; height: 17px; padding: 0 4px; border-radius: 9px; background: var(--red); color: #090b0f; font-family: var(--mono); font-size: 8px; font-weight: 700; }
.ambush-card { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 10px 12px; border-color: rgba(255,138,138,.3); background: rgba(255,138,138,.035); }
.ambush-card b { font-size: max(var(--ui-min), calc(10.5px * var(--ui-scale))); font-weight: 500; }
.ambush-card p { margin-top: 3px; color: var(--muted); font-size: max(var(--ui-min), calc(8.5px * var(--ui-scale))); line-height: 1.5; }
.ambush-actions { display: flex; flex: none; gap: 4px; }
.comms-home-tip { padding: 11px 12px; }
.comms-home-tip p:not(.kicker) { margin-top: 4px; color: var(--muted); font-size: max(var(--ui-min), calc(9.5px * var(--ui-scale))); line-height: 1.6; }
@media (min-width: 560px) {
  .comms-app-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
}
</style>
