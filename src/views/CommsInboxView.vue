<script setup>
import { computed, ref } from 'vue'
import CommsPageHeader from '../components/CommsPageHeader.vue'
import { EVENT_TYPES } from '../game-core/npc-events.js'
import { useGameStore } from '../stores/game.js'

const game = useGameStore()
const run = computed(() => game.run)
const inbox = computed(() => (run.value?.inbox || []).filter((event) => event.status === 'pending'))
const narratingId = ref('')

function npcName(id) {
  return run.value?.npcs?.[id]?.name || '某人'
}

function tone(type) {
  return EVENT_TYPES[type]?.color || 'muted'
}

function resolve(event, choiceId) {
  const result = game.resolveInbox(event.id, choiceId)
  if (result.ok) game.notify(result.text, 'good')
}

async function narrate(event) {
  if (narratingId.value) return
  narratingId.value = event.id
  const result = await game.narrateInboxEvent(event.id, true)
  narratingId.value = ''
  if (result.ok) game.notify(result.source === 'llm' ? '叙述已展开' : '本地叙述已展开', 'good')
  else game.notify(result.message, 'bad')
}
</script>

<template>
  <div v-if="run" class="run-page">
    <CommsPageHeader
      kicker="COMMS · INBOX"
      title="收件箱"
      hint="每天结束会有人来找你。每周会有一件更大的事。"
    >
      <span class="tag amber">{{ inbox.length }} 待处理</span>
    </CommsPageHeader>

    <section class="panel inbox-panel">
      <div v-if="inbox.length" class="inbox-list">
        <article v-for="event in inbox" :key="event.id" class="inbox-card" :class="`is-${tone(event.type)}`">
          <header>
            <span class="tag" :class="tone(event.type)">{{ EVENT_TYPES[event.type]?.label || event.type }}</span>
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
          <button v-else type="button" class="btn btn-ghost btn-sm" :disabled="narratingId === event.id" @click="narrate(event)">
            {{ narratingId === event.id ? '展开中…' : '细读' }}
          </button>
          <div class="inbox-actions">
            <button v-for="choice in event.choices" :key="choice.id" type="button" class="btn btn-sm" @click="resolve(event, choice.id)">
              {{ choice.label }}
            </button>
          </div>
        </article>
      </div>
      <p v-else class="empty">暂时没有待处理的消息。去星图上继续走吧。</p>
    </section>
  </div>
</template>

<style scoped>
.inbox-panel { padding: 10px; }
.inbox-list { display: flex; flex-direction: column; gap: 8px; }
.inbox-card { padding: 10px; border: 1px solid var(--line); border-radius: 9px; background: rgba(5, 10, 16, .45); }
.inbox-card.is-red { border-color: rgba(255, 138, 138, .3); }
.inbox-card.is-amber { border-color: rgba(255, 196, 107, .28); }
.inbox-card header { display: flex; align-items: center; flex-wrap: wrap; gap: 5px; }
.inbox-day { color: var(--dim); font-family: var(--mono); font-size: max(var(--ui-min), calc(8px * var(--ui-scale))); }
.inbox-card h4 { margin-top: 6px; font-size: max(var(--ui-min), calc(13px * var(--ui-scale))); font-weight: 500; }
.inbox-card p { margin-top: 4px; color: var(--muted); font-size: max(var(--ui-min), calc(9.5px * var(--ui-scale))); line-height: 1.62; }
.inbox-narrative { margin-top: 6px; padding: 7px 8px; border-left: 2px solid rgba(124,231,255,.3); background: rgba(124,231,255,.025); }
.inbox-narrative .tag { margin-top: 5px; }
.inbox-actions { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 8px; }
.empty { padding: 26px; color: var(--dim); text-align: center; }
</style>
