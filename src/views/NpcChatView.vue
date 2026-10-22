<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { REGIONS } from '../game-core/data.js'
import { factionName } from '../game-core/npc.js'
import { useNpcPage } from '../composables/useNpcPage.js'

const { game, run, npc, chatBack } = useNpcPage()
const chatInput = ref('')
const chatLog = ref(null)
const llmReady = ref(null)

const messages = computed(() => (npc.value ? run.value?.npcChats?.[npc.value.id] || [] : []))
const streaming = computed(() => messages.value.some((message) => message.streaming))

onMounted(() => {
  if (npc.value) game.markNpcRead(npc.value.id)
  checkLlm()
  nextTick(scroll)
})

watch(
  () => messages.value.map((message) => message.text).join('|'),
  () => nextTick(scroll)
)

async function checkLlm() {
  try {
    const response = await fetch('./api/llm/config')
    const data = await response.json()
    llmReady.value = Boolean(data.hasKey) || data.provider === 'ollama'
  } catch {
    llmReady.value = false
  }
}

function scroll() {
  if (chatLog.value) chatLog.value.scrollTop = chatLog.value.scrollHeight
}

async function send() {
  const text = chatInput.value.trim()
  if (!text || !npc.value || streaming.value) return
  if (llmReady.value === null) checkLlm()
  chatInput.value = ''
  await nextTick()
  scroll()
  const result = await game.sendNpcChat(npc.value.id, text, llmReady.value !== false)
  await nextTick()
  scroll()
  if (result?.fallback) {
    game.notify(result.error ? `本地对白：${result.error}` : '使用本地对白', '')
  }
}
</script>

<template>
  <div v-if="npc && run" class="run-page chat-page">
    <section class="panel chat-head">
      <div class="chat-id">
        <RouterLink :to="chatBack" class="back-link">←</RouterLink>
        <span class="npc-ava">{{ npc.name.slice(0, 1) }}</span>
        <div>
          <p class="kicker">{{ factionName(npc.faction) }} · {{ REGIONS[npc.home].name }}</p>
          <h2>{{ npc.name }}</h2>
        </div>
      </div>
      <div class="chat-meta">
        <span class="tag cyan">信任 {{ npc.relation.trust }}</span>
        <span class="tag" :class="llmReady === false ? 'amber' : 'jade'">
          {{ llmReady === false ? '本地对白' : llmReady ? 'LLM 已就绪' : '检查中' }}
        </span>
      </div>
    </section>

    <section ref="chatLog" class="panel chat-log">
      <div v-if="!messages.length" class="chat-empty">
        <p>频道已经接通。</p>
        <p class="hint">可以直接说话。语气会受标签、派系与当前关系影响。</p>
      </div>
      <div v-for="(message, index) in messages" :key="index" class="chat-msg" :class="message.role">
        <div class="bubble">
          <p>{{ message.text }}<span v-if="message.streaming" class="cursor">▍</span></p>
          <span v-if="message.fallback" class="tag">本地</span>
        </div>
      </div>
    </section>

    <footer class="panel chat-foot">
      <div v-if="llmReady === false" class="chat-note">
        未配置模型，发送后会使用本地对白。<RouterLink to="/settings/llm">去配置</RouterLink>
      </div>
      <div class="chat-input">
        <input v-model="chatInput" maxlength="300" placeholder="说点什么…" :disabled="streaming" @keyup.enter="send" />
        <button type="button" class="btn btn-primary" :disabled="!chatInput.trim() || streaming" @click="send">
          {{ streaming ? '…' : '发送' }}
        </button>
      </div>
      <p class="chat-budget">已调用模型 {{ run.llm?.calls || 0 }} 次</p>
    </footer>
  </div>
</template>

<style scoped>
.chat-page { height: 100%; max-width: 900px; gap: 10px; overflow: hidden; }
.chat-head { flex: none; display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 12px 14px; }
.chat-id { display: flex; align-items: center; gap: 9px; min-width: 0; }
.back-link { color: var(--dim); font-family: var(--mono); font-size: max(var(--ui-min), calc(11px * var(--ui-scale))); }
.npc-ava { display: grid; place-items: center; width: 36px; height: 36px; flex: none; border: 1px solid rgba(124, 231, 255, .28); border-radius: 10px; color: var(--cyan); font-size: max(var(--ui-min), calc(15px * var(--ui-scale))); }
.chat-head h2 { margin-top: 1px; font-size: max(var(--ui-min), calc(20px * var(--ui-scale))); font-weight: 300; letter-spacing: .08em; }
.chat-meta { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 4px; }
.chat-log { flex: 1; min-height: 0; overflow-y: auto; overscroll-behavior: contain; padding: 14px; display: flex; flex-direction: column; gap: 8px; }
.chat-empty { margin: auto; color: var(--muted); font-size: max(var(--ui-min), calc(11px * var(--ui-scale))); text-align: center; }
.chat-msg { display: flex; }
.chat-msg.user { justify-content: flex-end; }
.bubble { max-width: 78%; padding: 8px 10px; border: 1px solid var(--line); border-radius: 10px; background: rgba(7, 13, 20, .72); }
.chat-msg.user .bubble { border-color: rgba(255, 196, 107, .25); background: rgba(255, 196, 107, .07); }
.bubble p { color: var(--ink); font-size: max(var(--ui-min), calc(11px * var(--ui-scale))); line-height: 1.7; }
.bubble .tag { margin-top: 4px; }
.cursor { display: inline-block; margin-left: 2px; color: var(--cyan); animation: blink 1s steps(2) infinite; }
.chat-note { color: var(--dim); font-size: max(var(--ui-min), calc(9px * var(--ui-scale))); }
.chat-note a { color: var(--cyan); }
.chat-foot { flex: none; padding: 10px 12px; }
.chat-input { display: flex; gap: 6px; margin-top: 6px; }
.chat-input input { flex: 1; min-width: 0; height: 38px; padding: 0 11px; border: 1px solid var(--line); border-radius: 8px; background: rgba(4, 8, 13, .72); color: var(--ink); font-size: max(var(--ui-min), calc(12px * var(--ui-scale))); outline: none; }
.chat-input input:focus { border-color: rgba(124, 231, 255, .45); }
.chat-budget { margin-top: 6px; color: var(--dim); font-family: var(--mono); font-size: max(var(--ui-min), calc(8px * var(--ui-scale))); text-align: right; }
@keyframes blink { 50% { opacity: 0; } }
@media (max-width: 640px) {
  .chat-page { padding-bottom: 0; }
  .chat-head { padding: 10px; }
  .chat-meta .tag:first-child { display: none; }
  .bubble { max-width: 88%; }
}
</style>
