<script setup>
import { computed, onMounted } from 'vue'
import { REGIONS } from '../game-core/data.js'
import { factionName } from '../game-core/npc.js'
import { tagDefsFor } from '../game-core/npc-tags.js'
import { useGameStore } from '../stores/game.js'

const game = useGameStore()
const run = computed(() => game.run)
const city = computed(() => run.value?.city || null)
const visitors = computed(() => (city.value?.visitorIds || [])
  .map((id) => run.value?.npcs?.[id])
  .filter((npc) => npc && npc.active !== false))
const hasWine = computed(() => (run.value?.inv?.wine || 0) > 0)

function drink() {
  const result = game.consume('wine')
  if (result.ok) game.notify('一杯空港私酿下肚，精神暖了一点。', 'good')
}

onMounted(() => game.enterCity())

function tagsOf(npc) {
  return tagDefsFor(npc?.tags || []).slice(0, 4)
}

function refresh() {
  const result = game.refreshCityVisitors()
  if (result.ok) game.notify(`新的访客来了 · ${result.cost} 信用点`, 'good')
}
</script>

<template>
  <div v-if="run" class="run-page tavern-page">
    <section class="panel tavern-head">
      <div>
        <RouterLink :to="{ name: 'city', params: { runId: run.id } }" class="back-link">← 空港</RouterLink>
        <p class="kicker">TAVERN · D{{ run.day }}</p>
        <h2>酒馆</h2>
        <p class="hint">今天坐在窗边的几个人。关系不熟也能聊，熟客会记得你说过的话。</p>
      </div>
      <div class="tavern-actions">
        <span class="tag amber">信用点 {{ run.player.credits }}</span>
        <button v-if="hasWine" type="button" class="btn btn-sm" @click="drink">来一杯私酿</button>
        <button type="button" class="btn btn-sm" :disabled="run.player.credits < 12" @click="refresh">换一批访客 · 12</button>
      </div>
    </section>

    <section class="visitor-grid">
      <RouterLink
        v-for="npc in visitors"
        :key="npc.id"
        :to="{ name: 'npc', params: { runId: run.id, npcId: npc.id } }"
        class="visitor-card"
      >
        <div class="visitor-top">
          <span class="visitor-ava">{{ npc.name.slice(0, 1) }}</span>
          <span class="visitor-tags">
            <span v-for="tag in tagsOf(npc)" :key="tag.id" class="tag">{{ tag.name }}</span>
          </span>
        </div>
        <h3>{{ npc.name }}</h3>
        <p>{{ factionName(npc.faction) }} · {{ REGIONS[npc.home]?.name || '空港' }}</p>
        <div class="visitor-relations">
          <span>信任 <b>{{ npc.relation.trust }}</b></span>
          <span>亲近 <b>{{ npc.relation.closeness }}</b></span>
        </div>
        <span class="visitor-go">去聊两句 →</span>
      </RouterLink>
      <div v-if="!visitors.length" class="panel empty">酒馆今天很安静。换一批访客试试。</div>
    </section>

    <p class="tavern-note">访客是临时出现在空港的人。他们也有标签、性格和关系网，会参与之后的事件。</p>
  </div>
</template>

<style scoped>
.tavern-page { gap: 12px; max-width: 1450px; }
.tavern-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; padding: 18px; }
.back-link { display: inline-flex; margin-bottom: 9px; color: var(--dim); font-family: var(--mono); font-size: max(var(--ui-min), calc(9px * var(--ui-scale))); }
.tavern-head h2 { margin-top: 3px; font-size: max(var(--ui-min), calc(30px * var(--ui-scale))); font-weight: 300; letter-spacing: .08em; }
.tavern-actions { display: flex; flex-wrap: wrap; align-items: center; justify-content: flex-end; gap: 5px; }
.visitor-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 9px; }
.visitor-card { padding: 14px; border: 1px solid var(--line); border-radius: 13px; background: linear-gradient(155deg, rgba(16, 28, 40, .82), rgba(5, 10, 16, .68)); color: var(--ink); transition: border-color .16s ease, transform .16s ease; }
.visitor-top { display: flex; align-items: flex-start; gap: 8px; }
.visitor-ava { display: grid; place-items: center; width: 38px; height: 38px; flex: none; border: 1px solid rgba(124, 231, 255, .3); border-radius: 10px; color: var(--cyan); font-size: max(var(--ui-min), calc(16px * var(--ui-scale))); }
.visitor-tags { display: flex; flex-wrap: wrap; gap: 3px; }
.visitor-card h3 { margin-top: 10px; font-size: max(var(--ui-min), calc(19px * var(--ui-scale))); font-weight: 400; letter-spacing: .06em; }
.visitor-card p { margin-top: 2px; color: var(--dim); font-size: max(var(--ui-min), calc(9px * var(--ui-scale))); }
.visitor-relations { display: flex; gap: 10px; margin-top: 12px; color: var(--dim); font-family: var(--mono); font-size: max(var(--ui-min), calc(8px * var(--ui-scale))); }
.visitor-relations b { color: var(--muted); font-weight: 500; }
.visitor-go { display: block; margin-top: 12px; color: var(--amber); font-family: var(--mono); font-size: max(var(--ui-min), calc(9px * var(--ui-scale))); }
.tavern-note { color: var(--dim); font-size: max(var(--ui-min), calc(10px * var(--ui-scale))); text-align: center; }
.empty { padding: 30px; color: var(--dim); text-align: center; }
@media (hover: hover) {
  .visitor-card:hover { border-color: rgba(124, 231, 255, .4); transform: translateY(-2px); }
}
@media (max-width: 900px) {
  .tavern-head { flex-direction: column; }
  .tavern-actions { justify-content: flex-start; }
  .visitor-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@media (max-width: 520px) {
  .visitor-grid { grid-template-columns: 1fr; }
}
</style>
