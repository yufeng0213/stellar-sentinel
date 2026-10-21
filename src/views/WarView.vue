<script setup>

import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { WAR_ENEMIES } from '../game-core/border-war.js'
import { FACTION_INFO } from '../game-core/faction.js'
import { useGameStore } from '../stores/game.js'

const game = useGameStore()
const router = useRouter()
const run = computed(() => game.run)
const war = computed(() => run.value?.borderWar || null)
const faction = computed(() => (war.value?.faction ? FACTION_INFO[war.value.faction] : null))
const enemy = computed(() => WAR_ENEMIES[war.value?.enemy] || WAR_ENEMIES.raider)
const prepLabel = computed(() => ({
  vanguard: '先锋队',
  engineer: '工坊工具',
  medic: '医疗药品',
}[war.value?.prep] || '未选择'))
const campLabel = computed(() => ({
  ambush: '追击斥候',
  fortify: '加固营地',
  talk: '火边谈话',
}[war.value?.camp] || '未选择'))
const active = computed(() => Boolean(war.value?.active))
const completed = computed(() => Boolean(war.value?.completedDay))

function start() {
  game.beginBorderWar()
}

function prep(choice) {
  game.chooseWarPrep(choice)
}

function camp(choice) {
  game.chooseWarCamp(choice)
}

function fight() {
  const nodeId = game.startWarBattle()
  if (nodeId && run.value) {
    router.push({ name: 'battle', params: { runId: run.value.id, nodeId } })
  }
}

function settle(choice) {
  game.settleWar(choice)
}

</script>

<template>
  <div v-if="run && war" class="run-page war-page">
    <section class="panel war-head">
      <div>
        <RouterLink :to="{ name: 'city', params: { runId: run.id } }" class="back-link">← 城市</RouterLink>
        <p class="kicker">BORDER WAR · {{ faction?.name || '盟约边境' }}</p>
        <h1>边境战争</h1>
        <p class="hint">盟约把你推到了一场不属于你的战争里。你可以决定谁接管那片边境，但不可能让所有人都满意。</p>
      </div>
      <span class="war-glyph">⚔</span>
    </section>

    <section class="panel war-status">
      <div><span>阶段</span><b>{{ war.stage }} / 4</b></div>
      <div><span>敌方</span><b>{{ enemy.name }}</b></div>
      <div><span>集结</span><b>{{ prepLabel }}</b></div>
      <div><span>营地</span><b>{{ campLabel }}</b></div>
    </section>

    <section v-if="!active && !completed" class="panel war-start">
      <p class="kicker">WAR BEGINS</p>
      <h2>盟约的边境出了事</h2>
      <p>传令官说，边境据点被一支不属于任何城市的队伍占了。盟约希望你带人过去。</p>
      <p v-if="!run.city?.pact" class="hint is-bad">需要先在城门或城市发展页签订城市盟约。</p>
      <button v-else type="button" class="btn btn-primary" @click="start">接下边境战争</button>
    </section>

    <section v-else-if="active && war.stage === 1" class="panel war-stage">
      <p class="kicker">STAGE 1 · MUSTER</p>
      <h2>集结</h2>
      <p>你可以在出发前决定带什么。</p>
      <div class="war-choices">
        <button type="button" class="war-choice" @click="prep('vanguard')">
          <b>带上最能打的人</b>
          <span>战斗更稳，夜里更容易被看见。</span>
        </button>
        <button type="button" class="war-choice" @click="prep('engineer')">
          <b>带工坊工具</b>
          <span>消耗 2 废料。面对旧机器时更有办法。</span>
        </button>
        <button type="button" class="war-choice" @click="prep('medic')">
          <b>带上医疗舱药品</b>
          <span>消耗 20 信用点。负伤后还能撑住。</span>
        </button>
      </div>
    </section>

    <section v-else-if="active && war.stage === 2" class="panel war-stage">
      <p class="kicker">STAGE 2 · CAMP</p>
      <h2>边境营地</h2>
      <p>天色暗下来。你们在废弃的补给站里生火。</p>
      <div class="war-choices">
        <button type="button" class="war-choice" @click="camp('ambush')">
          <b>主动追出去</b>
          <span>抓住对方斥候，但可能受伤。</span>
        </button>
        <button type="button" class="war-choice" @click="camp('fortify')">
          <b>加固营地</b>
          <span>消耗 2 废料，避免夜里被摸营。</span>
        </button>
        <button type="button" class="war-choice" @click="camp('talk')">
          <b>和同行的人谈谈</b>
          <span>恢复精神，明天的战斗会更稳。</span>
        </button>
      </div>
    </section>

    <section v-else-if="active && war.stage === 3" class="panel war-stage">
      <p class="kicker">STAGE 3 · STRONGHOLD</p>
      <h2>{{ enemy.name }}</h2>
      <p>据点门口只剩一台还在运转的东西。它身后的门没有关。</p>
      <button type="button" class="btn btn-primary" @click="fight">进入敌方据点</button>
    </section>

    <section v-else-if="active && war.stage === 4" class="panel war-stage">
      <p class="kicker">STAGE 4 · AFTERMATH</p>
      <h2>谁来接管这里</h2>
      <p>战斗结束了。边境据点还在冒烟，城市的人正在等你做决定。</p>
      <div class="war-choices">
        <button type="button" class="war-choice" @click="settle('faction')">
          <b>交给盟约派系</b>
          <span>派系声望 +12，城市影响力 +15。</span>
        </button>
        <button type="button" class="war-choice" @click="settle('city')">
          <b>让城市自治</b>
          <span>更多信用点，城市精神稳定。</span>
        </button>
        <button type="button" class="war-choice" @click="settle('crew')">
          <b>把物资带回方舟</b>
          <span>废料 +4，旧芯片 +2。</span>
        </button>
      </div>
    </section>

    <section v-if="completed" class="panel war-result">
      <p class="kicker">WAR COMPLETE · D{{ war.completedDay }}</p>
      <h2>边境安静了</h2>
      <p>{{ war.lastText }}</p>
      <RouterLink :to="{ name: 'city', params: { runId: run.id } }" class="btn btn-primary">回城市</RouterLink>
    </section>
  </div>
</template>

<style scoped>

.war-page { display: flex; flex-direction: column; gap: 12px; padding-bottom: 28px; max-width: 1000px; }
.war-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; padding: 18px; }
.back-link { display: inline-flex; margin-bottom: 8px; color: var(--dim); font-family: var(--mono); font-size: max(var(--ui-min), calc(9px * var(--ui-scale))); }
.war-head h1 { margin-top: 4px; font-size: max(var(--ui-min), calc(34px * var(--ui-scale))); font-weight: 300; letter-spacing: .1em; }
.war-glyph { color: var(--red); font-size: max(var(--ui-min), calc(48px * var(--ui-scale))); opacity: .7; }
.war-status { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 7px; padding: 12px; }
.war-status div { padding: 8px 9px; border: 1px solid var(--line); border-radius: 8px; }
.war-status span { display: block; color: var(--dim); font-family: var(--mono); font-size: max(var(--ui-min), calc(8px * var(--ui-scale))); }
.war-status b { display: block; margin-top: 3px; font-family: var(--mono); font-size: max(var(--ui-min), calc(11px * var(--ui-scale))); font-weight: 400; }
.war-start, .war-stage, .war-result { padding: 16px; }
.war-start h2, .war-stage h2, .war-result h2 { margin-top: 4px; font-size: max(var(--ui-min), calc(22px * var(--ui-scale))); font-weight: 300; }
.war-start p, .war-stage p, .war-result p { margin-top: 4px; color: var(--muted); font-size: max(var(--ui-min), calc(10px * var(--ui-scale))); line-height: 1.7; }
.war-start .btn, .war-result .btn { margin-top: 12px; }
.war-choices { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 7px; margin-top: 12px; }
.war-choice { display: flex; flex-direction: column; gap: 5px; padding: 11px; border: 1px solid var(--line); border-radius: 9px; background: rgba(5, 10, 16, .42); color: var(--ink); text-align: left; cursor: pointer; }
.war-choice:hover { border-color: rgba(255, 138, 138, .4); background: rgba(255, 138, 138, .05); }
.war-choice b { font-size: max(var(--ui-min), calc(12px * var(--ui-scale))); font-weight: 500; }
.war-choice span { color: var(--muted); font-size: max(var(--ui-min), calc(9px * var(--ui-scale))); line-height: 1.55; }
.war-result { border-color: rgba(138, 222, 184, .3); background: rgba(138, 222, 184, .035); }
.war-result p { white-space: pre-line; }
.is-bad { color: var(--red) !important; }
@media (max-width: 700px) {
  .war-head { flex-direction: column; }
  .war-status { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .war-choices { grid-template-columns: 1fr; }
}
</style>
