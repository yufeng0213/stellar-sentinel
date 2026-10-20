<script setup>
import { computed, onMounted, ref } from 'vue'
import { ENDINGS } from '../game-core/ending.js'
import { readEndingCollection } from '../game/collection.js'

const collection = ref({})
onMounted(() => {
  collection.value = readEndingCollection()
})

const unlocked = computed(() => Object.keys(collection.value).length)

function record(id) {
  return collection.value[id] || null
}

function firstDate(id) {
  const entry = record(id)
  if (!entry?.firstAt) return ''
  return new Date(entry.firstAt).toLocaleDateString()
}
</script>

<template>
  <div class="endings-shell">
    <div class="endings-wrap">
      <header class="endings-head">
        <div>
          <p class="kicker">ARCHIVE · ENDINGS</p>
          <h1>结局收集</h1>
          <p class="lede">门只开一次，但你可以用不同的方式记住它。</p>
        </div>
        <span class="count">{{ unlocked }} / {{ ENDINGS.length }}</span>
      </header>

      <section class="ending-grid">
        <article
          v-for="ending in ENDINGS"
          :key="ending.id"
          class="ending-card"
          :class="[`is-${ending.tone}`, { 'is-locked': !record(ending.id) }]"
        >
          <div class="ending-top">
            <span class="ending-glyph">{{ record(ending.id) ? '◈' : '◇' }}</span>
            <span class="ending-choice">{{ ending.choice === 'open' ? '推开门' : '合上门' }}</span>
          </div>
          <h2>{{ record(ending.id) ? ending.title : '？？？' }}</h2>
          <p v-if="record(ending.id)" class="ending-text">{{ ending.collection }}</p>
          <p v-else class="ending-text">尚未抵达这个结局。</p>
          <div class="ending-meta">
            <span v-if="record(ending.id)">见过 {{ record(ending.id).count }} 次 · {{ firstDate(ending.id) }}</span>
            <span v-else>继续远征以解锁</span>
          </div>
        </article>
      </section>

      <div class="endings-actions">
        <RouterLink to="/" class="btn btn-ghost">回到标题</RouterLink>
      </div>
    </div>
  </div>
</template>

<style scoped>
.endings-shell { min-height: 100vh; padding: 28px; background: radial-gradient(90% 80% at 50% 0, rgba(30, 44, 66, .36), transparent 70%), var(--bg); }
.endings-wrap { width: min(1180px, 100%); margin: 0 auto; }
.endings-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 20px; margin-bottom: 18px; }
.endings-head h1 { margin-top: 4px; font-size: max(var(--ui-min), calc(38px * var(--ui-scale))); font-weight: 300; letter-spacing: .1em; }
.lede { margin-top: 6px; color: var(--muted); font-size: max(var(--ui-min), calc(12px * var(--ui-scale))); }
.count { color: var(--violet); font-family: var(--mono); font-size: max(var(--ui-min), calc(14px * var(--ui-scale))); }
.ending-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
.ending-card { min-height: 210px; padding: 18px; border: 1px solid var(--line); border-radius: 14px; background: linear-gradient(155deg, rgba(16, 28, 40, .82), rgba(5, 10, 16, .7)); }
.ending-card.is-hope { border-color: rgba(255, 196, 107, .3); }
.ending-card.is-eerie { border-color: rgba(185, 164, 255, .35); }
.ending-card.is-quiet { border-color: rgba(124, 231, 255, .28); }
.ending-card.is-scar { border-color: rgba(255, 138, 138, .28); }
.ending-card.is-locked { opacity: .45; }
.ending-top { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.ending-glyph { color: var(--cyan); font-size: max(var(--ui-min), calc(20px * var(--ui-scale))); }
.ending-choice { color: var(--dim); font-family: var(--mono); font-size: max(var(--ui-min), calc(8px * var(--ui-scale))); }
.ending-card h2 { margin-top: 14px; font-size: max(var(--ui-min), calc(22px * var(--ui-scale))); font-weight: 400; letter-spacing: .06em; }
.ending-text { margin-top: 7px; color: var(--muted); font-size: max(var(--ui-min), calc(11px * var(--ui-scale))); line-height: 1.8; }
.ending-meta { margin-top: 14px; color: var(--dim); font-family: var(--mono); font-size: max(var(--ui-min), calc(8px * var(--ui-scale))); }
.endings-actions { margin-top: 18px; }
@media (max-width: 750px) {
  .endings-shell { padding: 16px; }
  .endings-head { flex-direction: column; }
  .ending-grid { grid-template-columns: 1fr; }
}
</style>
