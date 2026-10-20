<script setup>
import { useNpcPage } from '../composables/useNpcPage.js'

const { npc, backNpc } = useNpcPage()
</script>

<template>
  <div v-if="npc" class="run-page memory-page">
    <section class="panel page-head">
      <RouterLink :to="backNpc" class="back-link">← {{ npc.name }}</RouterLink>
      <p class="kicker">MEMORY · ARCHIVE</p>
      <h2>记忆</h2>
      <p class="hint">短期印象来自最近发生的事；长期记忆在每周结束自动整理。</p>
    </section>

    <section class="panel memory-block">
      <h3>最近记得的事</h3>
      <div v-if="npc.memory?.length" class="memory-list">
        <div v-for="(item, index) in npc.memory" :key="index" class="memory-row">
          <span>D{{ item.day }}</span>
          <p>{{ item.text }}</p>
        </div>
      </div>
      <p v-else class="empty">还没有值得记住的事。</p>
    </section>

    <section class="panel memory-block">
      <h3>长期记忆</h3>
      <div v-if="npc.longMemory?.length" class="memory-list">
        <div v-for="entry in [...npc.longMemory].reverse()" :key="entry.week" class="memory-row is-long">
          <span>W{{ entry.week }} · D{{ entry.day }}</span>
          <p>{{ entry.text }}</p>
        </div>
      </div>
      <p v-else class="empty">每周结束时会自动整理这一周发生的事。</p>
    </section>
  </div>
</template>

<style scoped>
.memory-page { gap: 12px; }
.page-head { padding: 16px; }
.back-link { display: inline-flex; margin-bottom: 10px; color: var(--dim); font-family: var(--mono); font-size: max(var(--ui-min), calc(9px * var(--ui-scale))); }
.page-head h2 { margin-top: 4px; font-size: max(var(--ui-min), calc(26px * var(--ui-scale))); font-weight: 300; letter-spacing: .08em; }
.memory-block { padding: 16px; }
.memory-block h3 { margin-bottom: 12px; font-size: max(var(--ui-min), calc(14px * var(--ui-scale))); font-weight: 500; }
.memory-list { display: flex; flex-direction: column; gap: 8px; }
.memory-row { padding: 9px 11px; border-left: 2px solid rgba(124, 231, 255, .25); background: rgba(5, 10, 16, .35); }
.memory-row.is-long { border-color: rgba(185, 164, 255, .35); }
.memory-row span { color: var(--dim); font-family: var(--mono); font-size: max(var(--ui-min), calc(8px * var(--ui-scale))); }
.memory-row p { margin-top: 3px; color: var(--muted); font-size: max(var(--ui-min), calc(11px * var(--ui-scale))); line-height: 1.7; }
.empty { padding: 18px; color: var(--dim); font-size: max(var(--ui-min), calc(10px * var(--ui-scale))); text-align: center; }
</style>
