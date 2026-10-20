<script setup>
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useGameStore } from '../stores/game.js'

const game = useGameStore()
const router = useRouter()
const run = computed(() => game.run)
const city = computed(() => run.value?.city || null)
const visitors = computed(() => (city.value?.visitorIds || [])
  .map((id) => run.value?.npcs?.[id])
  .filter((npc) => npc && npc.active !== false))

onMounted(() => game.enterCity())

function open(name) {
  if (!run.value) return
  router.push({ name, params: { runId: run.value.id } })
}
</script>

<template>
  <div v-if="run" class="run-page city-page">
    <section class="panel city-hero">
      <div>
        <p class="kicker">SAFE HARBOR · D{{ run.day }}</p>
        <h1>白塔空港</h1>
        <p class="hint">远征之间的落脚点。市场、酒馆、诊所和城门都在步行范围内。</p>
        <div class="city-tags">
          <span class="tag cyan">信用点 {{ run.player.credits }}</span>
          <span class="tag jade">生命 {{ Math.round(run.player.hp) }} / {{ run.player.hpMax }}</span>
          <span class="tag amber">精神 {{ Math.round(run.player.mental) }} / {{ run.player.mentalMax }}</span>
        </div>
      </div>
      <div class="city-visitors">
        <span class="kicker">IN TOWN</span>
        <div class="visitor-stack">
          <RouterLink
            v-for="npc in visitors"
            :key="npc.id"
            :to="{ name: 'npc', params: { runId: run.id, npcId: npc.id } }"
            class="visitor-chip"
            :title="npc.name"
          >{{ npc.name.slice(0, 1) }}</RouterLink>
          <span v-if="!visitors.length" class="hint">还没有新面孔。</span>
        </div>
      </div>
    </section>

    <section class="city-grid">
      <button type="button" class="city-card" @click="open('city-market')">
        <span class="city-glyph">▤</span>
        <b>市场</b>
        <p>买酒、营养膏、材料和药品。每天补货。</p>
        <em>进入市场 →</em>
      </button>
      <button type="button" class="city-card" @click="open('city-tavern')">
        <span class="city-glyph">♨</span>
        <b>酒馆</b>
        <p>看今天来了哪些新面孔，聊两句，或者花点信用点换一批访客。</p>
        <em>{{ visitors.length }} 位访客 →</em>
      </button>
      <button type="button" class="city-card" @click="open('city-clinic')">
        <span class="city-glyph">✚</span>
        <b>诊所</b>
        <p>处理伤口、恢复精神，或者用材料和配方做药。</p>
        <em>进入诊所 →</em>
      </button>
      <button type="button" class="city-card" @click="open('city-gate')">
        <span class="city-glyph">⌁</span>
        <b>城门</b>
        <p>查看主线目标，带上队伍和补给，重新进入星区。</p>
        <em>准备出发 →</em>
      </button>
    </section>

    <section v-if="run.story" class="panel city-objective">
      <span class="kicker">MAIN OBJECTIVE · CH{{ run.story.chapter }}</span>
      <p>{{ run.story.objective }}</p>
    </section>
  </div>
</template>

<style scoped>
.city-page { gap: 12px; max-width: 1450px; }
.city-hero { display: flex; align-items: flex-start; justify-content: space-between; gap: 20px; padding: 20px; }
.city-hero h1 { margin-top: 3px; font-size: max(var(--ui-min), calc(36px * var(--ui-scale))); font-weight: 300; letter-spacing: .1em; }
.city-hero .hint { margin-top: 5px; max-width: 58em; }
.city-tags { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 12px; }
.city-visitors { min-width: 150px; text-align: right; }
.visitor-stack { display: flex; justify-content: flex-end; gap: 5px; margin-top: 8px; }
.visitor-chip {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border: 1px solid rgba(124, 231, 255, .28);
  border-radius: 9px;
  background: rgba(124, 231, 255, .06);
  color: var(--cyan);
  font-size: max(var(--ui-min), calc(14px * var(--ui-scale)));
}
.city-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 9px; }
.city-card {
  min-height: 170px;
  padding: 16px;
  border: 1px solid var(--line);
  border-radius: 14px;
  background: linear-gradient(155deg, rgba(16, 28, 40, .82), rgba(5, 10, 16, .7));
  color: var(--ink);
  text-align: left;
  cursor: pointer;
  transition: border-color .16s ease, transform .16s ease, background .16s ease;
}
.city-glyph { display: grid; place-items: center; width: 34px; height: 34px; border: 1px solid rgba(124, 231, 255, .25); border-radius: 9px; color: var(--cyan); font-size: max(var(--ui-min), calc(16px * var(--ui-scale))); }
.city-card b { display: block; margin-top: 16px; font-size: max(var(--ui-min), calc(18px * var(--ui-scale))); font-weight: 400; letter-spacing: .08em; }
.city-card p { margin-top: 5px; color: var(--muted); font-size: max(var(--ui-min), calc(10px * var(--ui-scale))); line-height: 1.7; }
.city-card em { display: block; margin-top: 14px; color: var(--amber); font-family: var(--mono); font-size: max(var(--ui-min), calc(9px * var(--ui-scale))); font-style: normal; }
.city-objective { padding: 12px 16px; }
.city-objective p { margin-top: 4px; color: var(--muted); font-size: max(var(--ui-min), calc(11px * var(--ui-scale))); line-height: 1.7; }
@media (hover: hover) {
  .city-card:hover { border-color: rgba(124, 231, 255, .4); background: rgba(20, 37, 50, .9); transform: translateY(-2px); }
}
@media (max-width: 900px) {
  .city-hero { flex-direction: column; padding: 15px; }
  .city-visitors { text-align: left; }
  .visitor-stack { justify-content: flex-start; }
  .city-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@media (max-width: 480px) {
  .city-grid { grid-template-columns: 1fr; }
  .city-hero h1 { font-size: max(var(--ui-min), calc(28px * var(--ui-scale))); }
}
</style>
