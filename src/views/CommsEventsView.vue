<script setup>
import { computed } from 'vue'
import CommsPageHeader from '../components/CommsPageHeader.vue'
import { useGameStore } from '../stores/game.js'

const game = useGameStore()
const run = computed(() => game.run)
const events = computed(() => run.value?.worldEvents || [])
const weekly = computed(() => run.value?.weekly?.summary || '')
</script>

<template>
  <div v-if="run" class="run-page">
    <CommsPageHeader
      kicker="COMMS · EVENTS"
      title="世界动态"
      hint="你不在场时，星区也在继续运转。"
    >
      <span class="tag cyan">{{ events.length }} 条</span>
    </CommsPageHeader>

    <section class="panel events-panel">
      <div v-if="weekly" class="weekly-card">
        <p class="kicker">WEEKLY REPORT</p>
        <p>{{ weekly }}</p>
      </div>
      <div v-if="events.length" class="world-list">
        <article v-for="(event, index) in events" :key="`${event.day}-${index}`" class="world-row">
          <span class="world-day">D{{ event.day }}</span>
          <p>{{ event.text }}</p>
        </article>
      </div>
      <p v-else class="empty">星区暂时安静。</p>
    </section>
  </div>
</template>

<style scoped>
.events-panel { padding: 10px; }
.weekly-card { margin-bottom: 9px; padding: 9px; border: 1px solid rgba(255,196,107,.25); border-radius: 8px; background: rgba(255,196,107,.03); }
.weekly-card p:not(.kicker) { margin-top: 4px; color: var(--muted); font-size: max(var(--ui-min), calc(9.5px * var(--ui-scale))); line-height: 1.65; }
.world-list { display: flex; flex-direction: column; }
.world-row { display: flex; gap: 9px; padding: 8px 0; border-bottom: 1px solid var(--line); }
.world-day { flex: none; color: var(--dim); font-family: var(--mono); font-size: max(var(--ui-min), calc(8px * var(--ui-scale))); }
.world-row p { color: var(--muted); font-size: max(var(--ui-min), calc(9.5px * var(--ui-scale))); line-height: 1.55; }
.empty { padding: 26px; color: var(--dim); text-align: center; }
</style>
