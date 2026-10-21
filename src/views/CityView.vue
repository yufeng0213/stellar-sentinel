<script setup>
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { cityPopulation } from '../game-core/city.js'
import { activeEscorts } from '../game-core/escort.js'
import { wantedStatus } from '../game-core/wanted.js'
import { useGameStore } from '../stores/game.js'

const game = useGameStore()
const router = useRouter()
const run = computed(() => game.run)
const city = computed(() => run.value?.city || null)
const cityMeta = computed(() => (run.value ? run.value.cities?.[run.value.activeCityId] : null))
const population = computed(() => (run.value ? cityPopulation(run.value, run.value.activeCityId || 'dock') : { total: 0, visitors: 0 }))
const visitors = computed(() => (city.value?.visitorIds || [])
  .map((id) => run.value?.npcs?.[id])
  .filter((npc) => npc && npc.active !== false))
const escorts = computed(() => (run.value ? activeEscorts(run.value) : []))
const wanted = computed(() => (run.value ? wantedStatus(run.value) : { active: false }))

onMounted(() => game.enterCity())

function open(name) {
  if (!run.value) return
  router.push({ name, params: { runId: run.value.id } })
}

function returnDock() {
  const result = game.returnToDock()
  if (result.ok) game.notify('回到白塔空港', 'good')
}

function finishEscort(escort) {
  const result = game.completeEscort(escort.npcId)
  if (result.ok) game.notify(`护送完成 · ${result.credits} 信用点`, 'good')
}

function payWanted() {
  const result = game.payWanted()
  if (result.ok) game.notify('通缉记录已清除', 'good')
}
</script>

<template>
  <div v-if="run" class="run-page city-page">
    <section class="panel city-hero">
      <div>
        <p class="kicker">{{ cityMeta?.name === '白塔空港' || !cityMeta ? 'SAFE HARBOR' : 'FRONTIER POST' }} · D{{ run.day }}</p>
        <h1>{{ cityMeta?.name || '白塔空港' }}</h1>
        <p class="hint">{{ cityMeta?.name === '白塔空港' ? '远征之间的落脚点。市场、酒馆、诊所和城门都在步行范围内。' : '边境聚落。这里有自己的本地人口、访客和物资。' }}</p>
        <div class="city-tags">
          <span class="tag cyan">信用点 {{ run.player.credits }}</span>
          <span class="tag jade">生命 {{ Math.round(run.player.hp) }} / {{ run.player.hpMax }}</span>
          <span class="tag amber">精神 {{ Math.round(run.player.mental) }} / {{ run.player.mentalMax }}</span>
          <span class="tag violet">本地人口 {{ population.total }}</span>
          <RouterLink to="/archive" class="tag">星区档案</RouterLink>
          <button v-if="run.activeCityId !== 'dock'" type="button" class="btn btn-sm" @click="returnDock">回空港</button>
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

    <section v-if="escorts.length" class="panel escort-box">
      <div class="escort-head">
        <div>
          <p class="kicker">ESCORT · ACTIVE</p>
          <h3>有人等着你送他回诊所</h3>
        </div>
        <span class="tag amber">{{ escorts.length }} 项</span>
      </div>
      <div class="escort-list">
        <article v-for="escort in escorts" :key="escort.id" class="escort-row">
          <div>
            <b>{{ run.npcs[escort.npcId]?.name || '某人' }}</b>
            <span>D{{ escort.deadline }} 前送到诊所 · 奖励 {{ escort.reward }} 信用点</span>
          </div>
          <button type="button" class="btn btn-sm btn-primary" @click="finishEscort(escort)">送到诊所</button>
        </article>
      </div>
    </section>

    <section v-if="wanted.active" class="panel wanted-banner">
      <div>
        <p class="kicker">WANTED · {{ wanted.cityName }}</p>
        <h3>通缉等级 {{ wanted.level }}</h3>
        <p>{{ wanted.reason }} · 城市价格 +{{ Math.round(wanted.priceMarkup * 100) }}% · 3 天后自动降低</p>
      </div>
      <button type="button" class="btn btn-sm" :disabled="run.player.credits < wanted.fine" @click="payWanted">
        缴纳罚金 · {{ wanted.fine }}
      </button>
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
        <em>{{ visitors.length }} / {{ population.total }} 位本地人 →</em>
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
      <button type="button" class="city-card" @click="open('story-main')">
        <span class="city-glyph">✧</span>
        <b>主线</b>
        <p>查看当前章节、目标和已经完成的章节。</p>
        <em>CH{{ run.story?.chapter || 1 }} {{ run.story?.title || '失联的白塔' }} →</em>
      </button>
      <button type="button" class="city-card" @click="open('city-quests')">
        <span class="city-glyph">▦</span>
        <b>任务板</b>
        <p>每天三张委托。交材料、清理航线，换信用点。</p>
        <em>查看委托 →</em>
      </button>
      <button type="button" class="city-card" @click="open('city-blackmarket')">
        <span class="city-glyph">◈</span>
        <b>黑市</b>
        <p>不问来路的货，以及一份关于白塔的情报。</p>
        <em>进入黑市 →</em>
      </button>
      <button type="button" class="city-card" @click="open('city-development')">
        <span class="city-glyph">▧</span>
        <b>城市发展</b>
        <p>升级诊所、市场、锻造和通讯；用派系项目改变这座城市。</p>
        <em>查看长期项目 →</em>
      </button>
      <button type="button" class="city-card" @click="open('city-factions')">
        <span class="city-glyph">⌘</span>
        <b>派系</b>
        <p>白塔、黑市、漂流者、低语者。关系会改变空港愿意给你什么。</p>
        <em>查看声望 →</em>
      </button>
      <button type="button" class="city-card" @click="open('calibration')">
        <span class="city-glyph">⌬</span>
        <b>校准</b>
        <p>用里程碑获得的校准点，把装备、牌组和探索风格连起来。</p>
        <em>{{ run.calibration?.points || 0 }} 点可用 →</em>
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
.escort-box { padding: 14px 16px; border-color: rgba(255, 196, 107, .3); background: rgba(255, 196, 107, .045); }
.escort-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; }
.escort-head h3 { margin-top: 3px; font-size: max(var(--ui-min), calc(16px * var(--ui-scale))); font-weight: 400; }
.escort-list { display: flex; flex-direction: column; gap: 5px; margin-top: 10px; }
.escort-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 8px 9px; border: 1px solid var(--line); border-radius: 8px; background: rgba(5, 10, 16, .4); }
.escort-row b { display: block; font-size: max(var(--ui-min), calc(11px * var(--ui-scale))); font-weight: 500; }
.escort-row span { display: block; margin-top: 2px; color: var(--dim); font-size: max(var(--ui-min), calc(9px * var(--ui-scale))); }
.wanted-banner { display: flex; align-items: center; justify-content: space-between; gap: 14px; padding: 12px 15px; border-color: rgba(255, 138, 138, .35); background: rgba(255, 138, 138, .04); }
.wanted-banner h3 { margin-top: 3px; color: var(--red); font-size: max(var(--ui-min), calc(16px * var(--ui-scale))); font-weight: 500; }
.wanted-banner p:not(.kicker) { margin-top: 3px; color: var(--muted); font-size: max(var(--ui-min), calc(9px * var(--ui-scale))); line-height: 1.6; }
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
