<script setup>
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ENDINGS, getEnding } from '../game-core/ending.js'
import { readEndingCollection } from '../game/collection.js'
import { useGameStore } from '../stores/game.js'

const game = useGameStore()
const router = useRouter()
const run = computed(() => game.run)
const epilogue = computed(() => run.value?.epilogue || null)
const ending = computed(() => getEnding(epilogue.value?.endingId || run.value?.door?.endingId))
const collection = computed(() => readEndingCollection())
const unlocked = computed(() => Object.keys(collection.value).length)
const paragraphs = computed(() => String(epilogue.value?.text || '').split(/\n{2,}/).filter(Boolean))
const closest = computed(() => {
  const npcs = Object.values(run.value?.npcs || {}).filter((npc) => npc.active !== false)
  return [...npcs].sort((left, right) => (right.relation?.closeness || 0) - (left.relation?.closeness || 0))[0] || null
})

onMounted(() => {
  game.ensureEpilogue()
})

function city() {
  if (!run.value) return
  router.push({ name: 'city', params: { runId: run.value.id } })
}

function title() {
  router.push('/')
}
</script>

<template>
  <div v-if="run" class="run-page epilogue-page">
    <section class="panel epilogue-head">
      <div>
        <p class="kicker">AFTER THE DOOR · DAY {{ run.day }}</p>
        <h1>{{ ending?.title || '门后' }}</h1>
        <p class="hint">{{ ending?.summary }}</p>
      </div>
      <span class="epilogue-count">{{ unlocked }} / {{ ENDINGS.length }} 结局</span>
    </section>

    <section class="panel epilogue-body">
      <p v-for="(paragraph, index) in paragraphs" :key="index" class="epilogue-p">{{ paragraph }}</p>
      <p v-if="!paragraphs.length" class="hint">后日谈还没有写入。</p>
      <div class="epilogue-mark">—— 白塔之后 ——</div>
    </section>

    <section class="panel epilogue-stats">
      <div><span>结束于</span><b>D{{ run.day }}</b></div>
      <div><span>信用点</span><b>{{ run.player.credits }}</b></div>
      <div><span>最近的人</span><b>{{ closest?.name || '无人' }}</b></div>
      <div><span>战败</span><b>{{ run.defeats || 0 }}</b></div>
    </section>

    <section class="panel epilogue-actions">
      <button type="button" class="btn btn-primary" @click="city">回到空港</button>
      <RouterLink :to="{ name: 'endings' }" class="btn btn-ghost">结局收集</RouterLink>
      <button type="button" class="btn btn-ghost" @click="title">回到标题</button>
    </section>
  </div>
</template>

<style scoped>
.epilogue-page { gap: 12px; max-width: 1000px; }
.epilogue-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; padding: 22px; }
.epilogue-head h1 { margin-top: 4px; font-size: max(var(--ui-min), calc(38px * var(--ui-scale))); font-weight: 300; letter-spacing: .12em; }
.epilogue-head .hint { margin-top: 6px; max-width: 58em; }
.epilogue-count { flex: none; color: var(--violet); font-family: var(--mono); font-size: max(var(--ui-min), calc(10px * var(--ui-scale))); }
.epilogue-body { padding: 20px; }
.epilogue-p { margin: 0 0 16px; color: var(--ink); font-size: max(var(--ui-min), calc(13px * var(--ui-scale))); line-height: 2; }
.epilogue-p:first-child { font-size: max(var(--ui-min), calc(15px * var(--ui-scale))); color: var(--cyan); }
.epilogue-mark { padding-top: 12px; border-top: 1px solid var(--line); color: var(--dim); font-family: var(--mono); font-size: max(var(--ui-min), calc(9px * var(--ui-scale))); letter-spacing: .18em; text-align: center; }
.epilogue-stats { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; padding: 14px; }
.epilogue-stats div { padding: 9px 10px; border: 1px solid var(--line); border-radius: 9px; background: rgba(5, 10, 16, .38); }
.epilogue-stats span { display: block; color: var(--dim); font-family: var(--mono); font-size: max(var(--ui-min), calc(8px * var(--ui-scale))); }
.epilogue-stats b { display: block; margin-top: 3px; color: var(--ink); font-family: var(--mono); font-size: max(var(--ui-min), calc(14px * var(--ui-scale))); font-weight: 400; }
.epilogue-actions { display: flex; flex-wrap: wrap; gap: 7px; padding: 14px; }
@media (max-width: 650px) {
  .epilogue-head { flex-direction: column; padding: 16px; }
  .epilogue-stats { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
</style>
