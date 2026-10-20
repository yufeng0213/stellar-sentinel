<script setup>
import { computed, onMounted } from 'vue'
import { ITEMS } from '../game-core/data.js'
import { useGameStore } from '../stores/game.js'

const game = useGameStore()
const run = computed(() => game.run)
const city = computed(() => run.value?.city || null)
const quests = computed(() => city.value?.quests || [])

onMounted(() => game.enterCity())

function claim(quest) {
  const result = game.claimCityQuest(quest.id)
  if (result.ok) game.notify(`委托完成 · +${result.reward} 信用点`, 'good')
}

function canClaim(quest) {
  if (quest.status !== 'open') return false
  if (quest.type === 'deliver') return (run.value?.inv?.[quest.key] || 0) >= quest.need
  if (quest.type === 'clear') return run.value?.cleared?.includes(quest.nodeId)
  return false
}

function requirement(quest) {
  if (quest.type === 'deliver') {
    return `需要 ${ITEMS[quest.key]?.name || quest.key} ×${quest.need}（持有 ${run.value?.inv?.[quest.key] || 0}）`
  }
  if (quest.type === 'clear') return `目标：${quest.nodeTitle || '未处理节点'}`
  return ''
}
</script>

<template>
  <div v-if="run" class="run-page quest-page">
    <section class="panel quest-head">
      <div>
        <RouterLink :to="{ name: 'city', params: { runId: run.id } }" class="back-link">← 空港</RouterLink>
        <p class="kicker">BOUNTY BOARD · D{{ run.day }}</p>
        <h2>任务板</h2>
        <p class="hint">空港每天贴出三张委托。完成后再来交付，奖励直接进信用点。</p>
      </div>
      <span class="tag amber">信用点 {{ run.player.credits }}</span>
    </section>

    <section class="panel quest-list">
      <article v-for="quest in quests" :key="quest.id" class="quest-item" :class="{ 'is-done': quest.status === 'done' }">
        <div class="quest-main">
          <div class="quest-title">
            <b>{{ quest.title }}</b>
            <span class="tag" :class="quest.type === 'clear' ? 'violet' : 'jade'">{{ quest.type === 'clear' ? '探索' : '交付' }}</span>
          </div>
          <p>{{ quest.desc }}</p>
          <span class="quest-req">{{ requirement(quest) }}</span>
        </div>
        <div class="quest-reward">
          <em>+{{ quest.reward }}</em>
          <button type="button" class="btn btn-sm" :disabled="!canClaim(quest)" @click="claim(quest)">
            {{ quest.status === 'done' ? '已完成' : canClaim(quest) ? '交付' : '未完成' }}
          </button>
        </div>
      </article>
      <p v-if="!quests.length" class="empty">今天没有新的委托。</p>
    </section>
  </div>
</template>

<style scoped>
.quest-page { gap: 12px; max-width: 1000px; }
.quest-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 14px; padding: 18px; }
.back-link { display: inline-flex; margin-bottom: 9px; color: var(--dim); font-family: var(--mono); font-size: max(var(--ui-min), calc(9px * var(--ui-scale))); }
.quest-head h2 { margin-top: 3px; font-size: max(var(--ui-min), calc(30px * var(--ui-scale))); font-weight: 300; letter-spacing: .08em; }
.quest-list { padding: 14px; display: flex; flex-direction: column; gap: 7px; }
.quest-item { display: flex; align-items: center; justify-content: space-between; gap: 14px; padding: 12px; border: 1px solid var(--line); border-radius: 10px; background: rgba(5, 10, 16, .4); }
.quest-item.is-done { opacity: .58; }
.quest-main { flex: 1; min-width: 0; }
.quest-title { display: flex; align-items: center; gap: 6px; }
.quest-title b { font-size: max(var(--ui-min), calc(12px * var(--ui-scale))); font-weight: 500; }
.quest-main p { margin-top: 3px; color: var(--muted); font-size: max(var(--ui-min), calc(10px * var(--ui-scale))); }
.quest-req { display: block; margin-top: 5px; color: var(--dim); font-family: var(--mono); font-size: max(var(--ui-min), calc(8px * var(--ui-scale))); }
.quest-reward { display: flex; flex-direction: column; align-items: flex-end; gap: 5px; flex: none; }
.quest-reward em { color: var(--amber); font-family: var(--mono); font-size: max(var(--ui-min), calc(13px * var(--ui-scale))); font-style: normal; }
.empty { padding: 24px; color: var(--dim); text-align: center; }
@media (max-width: 600px) {
  .quest-head { flex-direction: column; }
  .quest-item { align-items: flex-start; flex-direction: column; }
  .quest-reward { flex-direction: row; align-items: center; }
}
</style>
