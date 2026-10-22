<script setup>
import { computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import CommsPageHeader from '../components/CommsPageHeader.vue'
import { contactList, lastNpcMessage, unreadCount } from '../game-core/npc-contact.js'
import { useGameStore } from '../stores/game.js'

const game = useGameStore()
const route = useRoute()
const router = useRouter()
const run = computed(() => game.run)
const contacts = computed(() => (run.value ? contactList(run.value) : []))
const unread = computed(() => (run.value ? unreadCount(run.value) : 0))
const runId = computed(() => route.params.runId)

onMounted(() => {
  game.enhanceBackgroundMessages(true)
})

function last(npc) {
  return lastNpcMessage(run.value, npc.id)
}

function preview(npc) {
  return last(npc)?.text || '还没有消息。'
}

function time(npc) {
  const message = last(npc)
  return message?.day ? `D${message.day}` : '新联系人'
}

function openChat(npc) {
  game.markNpcRead(npc.id)
  router.push({ name: 'npc-chat', params: { runId: runId.value, npcId: npc.id }, query: { from: 'messages' } })
}

function pin(npc) {
  game.pinNpcContact(npc.id)
}

function mute(npc) {
  game.muteNpcContact(npc.id)
}

function remove(npc) {
  if (!window.confirm(`删除与 ${npc.name} 的对话？`)) return
  game.removeNpcContact(npc.id)
}
</script>

<template>
  <div v-if="run" class="run-page">
    <CommsPageHeader
      kicker="COMMS · MESSAGES"
      title="对话"
      hint="交换过联系方式的人会留在这里。红点是还没读的消息。"
    >
      <span class="tag amber">{{ unread }} 未读</span>
    </CommsPageHeader>

    <section class="panel messages-panel">
      <div v-if="contacts.length" class="contact-list">
        <div
          v-for="npc in contacts"
          :key="npc.id"
          class="contact-row"
          :class="{ 'has-unread': npc.unread > 0, 'is-muted': npc.muted }"
        >
          <button type="button" class="contact-open" @click="openChat(npc)">
            <span class="contact-ava">{{ npc.name.slice(0, 1) }}</span>
            <span class="contact-main">
              <span class="contact-line">
                <b>{{ npc.name }}<span v-if="npc.pinned" class="pin-mark">置顶</span><span v-if="npc.muted" class="pin-mark muted">免打扰</span></b>
                <em>{{ time(npc) }}</em>
              </span>
              <span class="contact-preview">{{ preview(npc) }}</span>
            </span>
            <span v-if="npc.unread && !npc.muted" class="unread-dot">{{ npc.unread > 9 ? '9+' : npc.unread }}</span>
          </button>
          <span class="contact-actions">
            <button type="button" class="contact-action" @click="pin(npc)">{{ npc.pinned ? '取消置顶' : '置顶' }}</button>
            <button type="button" class="contact-action" @click="mute(npc)">{{ npc.muted ? '取消免打扰' : '免打扰' }}</button>
            <button type="button" class="contact-action danger" @click="remove(npc)">删除</button>
          </span>
        </div>
      </div>
      <p v-else class="empty">还没有联系人。去酒馆找坐在窗边的人聊聊，交换联系方式。</p>
    </section>
  </div>
</template>

<style scoped>
.messages-panel { padding: 10px; }
.contact-list { display: flex; flex-direction: column; gap: 6px; }
.contact-row { display: flex; align-items: stretch; gap: 4px; border: 1px solid var(--line); border-radius: 10px; background: rgba(5, 10, 16, .45); }
.contact-row:hover { border-color: rgba(124, 231, 255, .3); background: rgba(124, 231, 255, .035); }
.contact-row.has-unread { border-color: rgba(255, 138, 138, .28); }
.contact-row.is-muted { opacity: .68; }
.contact-open { display: flex; align-items: center; gap: 9px; flex: 1; min-width: 0; padding: 9px 4px 9px 10px; border: 0; background: transparent; color: var(--ink); text-align: left; cursor: pointer; }
.contact-ava { display: grid; place-items: center; width: 34px; height: 34px; flex: none; border: 1px solid rgba(124, 231, 255, .28); border-radius: 50%; color: var(--cyan); }
.contact-main { flex: 1; min-width: 0; }
.contact-line { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; }
.contact-line b { font-size: max(var(--ui-min), calc(11px * var(--ui-scale))); font-weight: 500; }
.contact-line em { color: var(--dim); font-family: var(--mono); font-size: max(var(--ui-min), calc(8px * var(--ui-scale))); font-style: normal; }
.pin-mark { margin-left: 5px; color: var(--amber); font-family: var(--mono); font-size: max(var(--ui-min), calc(7px * var(--ui-scale))); font-weight: 400; }
.pin-mark.muted { color: var(--dim); }
.contact-preview { display: block; margin-top: 2px; overflow: hidden; color: var(--muted); font-size: max(var(--ui-min), calc(9px * var(--ui-scale))); text-overflow: ellipsis; white-space: nowrap; }
.contact-actions { display: flex; flex-direction: column; justify-content: center; gap: 2px; padding: 5px 7px 5px 0; }
.contact-action { padding: 1px 4px; border: 0; background: transparent; color: var(--dim); font-family: var(--mono); font-size: max(var(--ui-min), calc(7px * var(--ui-scale))); cursor: pointer; }
.contact-action:hover { color: var(--cyan); }
.contact-action.danger:hover { color: var(--red); }
.unread-dot { display: grid; place-items: center; min-width: 18px; height: 18px; padding: 0 5px; border-radius: 9px; background: var(--red); color: #090b0f; font-family: var(--mono); font-size: max(var(--ui-min), calc(8px * var(--ui-scale))); font-weight: 600; }
.empty { padding: 26px; color: var(--dim); text-align: center; }
</style>
