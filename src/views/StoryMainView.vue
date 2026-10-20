<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { MAIN_CHAPTERS, chapterStatus } from '../game-core/story.js'
import { useGameStore } from '../stores/game.js'

const game = useGameStore()
const router = useRouter()
const run = computed(() => game.run)
const status = computed(() => (run.value ? chapterStatus(run.value) : null))

function advance() {
  if (!run.value) return
  const result = game.advanceMainChapter()
  if (result.ok) game.notify(`进入第 ${result.chapter} 章：${result.title}`, 'good')
}

function back() {
  if (!run.value) return
  router.push({ name: 'city', params: { runId: run.value.id } })
}
</script>

<template>
  <div v-if="run && status" class="run-page main-story-page">
    <section class="panel main-head">
      <div>
        <button type="button" class="back-link" @click="back">← 空港</button>
        <p class="kicker">MAIN STORY · CH{{ status.current }} / {{ status.total }}</p>
        <h1>{{ status.title }}</h1>
        <p class="hint">{{ status.objective }}</p>
      </div>
      <div class="main-progress">
        <span class="tag" :class="status.complete ? 'jade' : 'amber'">
          {{ status.complete ? '目标已完成' : '进行中' }}
        </span>
        <span class="tag cyan">已探索 {{ run.cleared.length }} 节点</span>
      </div>
    </section>

    <section class="panel main-objective">
      <span class="kicker">OBJECTIVE</span>
      <p>{{ status.hint }}</p>
      <button v-if="status.complete && status.current < MAIN_CHAPTERS.length" type="button" class="btn btn-primary" @click="advance">
        推进到下一章 →
      </button>
      <p v-else-if="status.complete" class="hint">这一章已经完成，后续章节还在写。</p>
      <p v-else class="hint">完成目标后回到这里推进主线。</p>
    </section>

    <section class="panel chapter-list">
      <h3>章节</h3>
      <article
        v-for="chapter in MAIN_CHAPTERS"
        :key="chapter.number"
        class="chapter-row"
        :class="{ 'is-current': chapter.number === status.current, 'is-done': chapter.number < status.current }"
      >
        <span class="chapter-no">CH{{ chapter.number }}</span>
        <div>
          <b>{{ chapter.title }}</b>
          <p>{{ chapter.objective }}</p>
        </div>
        <span class="chapter-state">
          {{ chapter.number < status.current ? '已完成' : chapter.number === status.current ? (status.complete ? '待推进' : '当前') : '未解锁' }}
        </span>
      </article>
    </section>
  </div>
</template>

<style scoped>
.main-story-page { gap: 12px; max-width: 1100px; }
.main-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; padding: 20px; }
.back-link { padding: 0; border: 0; background: transparent; color: var(--dim); font-family: var(--mono); font-size: max(var(--ui-min), calc(9px * var(--ui-scale))); cursor: pointer; }
.main-head h1 { margin-top: 4px; font-size: max(var(--ui-min), calc(36px * var(--ui-scale))); font-weight: 300; letter-spacing: .08em; }
.main-head .hint { margin-top: 5px; max-width: 58em; }
.main-progress { display: flex; flex-direction: column; align-items: flex-end; gap: 5px; flex: none; }
.main-objective { padding: 16px; }
.main-objective p { margin: 5px 0 14px; color: var(--muted); font-size: max(var(--ui-min), calc(11px * var(--ui-scale))); line-height: 1.7; }
.chapter-list { padding: 16px; }
.chapter-list h3 { margin-bottom: 10px; font-size: max(var(--ui-min), calc(14px * var(--ui-scale))); font-weight: 500; }
.chapter-row { display: flex; align-items: flex-start; gap: 10px; padding: 9px 0; border-bottom: 1px solid rgba(255, 255, 255, .05); opacity: .5; }
.chapter-row.is-current { opacity: 1; }
.chapter-row.is-done { opacity: .72; }
.chapter-no { flex: none; width: 38px; color: var(--dim); font-family: var(--mono); font-size: max(var(--ui-min), calc(9px * var(--ui-scale))); }
.chapter-row b { font-size: max(var(--ui-min), calc(12px * var(--ui-scale))); font-weight: 500; }
.chapter-row p { margin-top: 2px; color: var(--dim); font-size: max(var(--ui-min), calc(9px * var(--ui-scale))); line-height: 1.55; }
.chapter-state { flex: none; color: var(--dim); font-family: var(--mono); font-size: max(var(--ui-min), calc(8px * var(--ui-scale))); }
.chapter-row.is-current .chapter-state { color: var(--amber); }
@media (max-width: 700px) {
  .main-head { flex-direction: column; }
  .main-progress { align-items: flex-start; }
}
</style>
