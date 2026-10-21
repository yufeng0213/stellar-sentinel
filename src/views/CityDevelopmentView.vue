<script setup>

import { computed } from 'vue'
import {
  cityInfluence,
  facilityStatuses,
  pactStatuses,
  projectStatuses,
} from '../game-core/city-development.js'
import { useGameStore } from '../stores/game.js'

const game = useGameStore()
const run = computed(() => game.run)
const city = computed(() => run.value?.cities?.[run.value?.activeCityId] || null)
const facilities = computed(() => (run.value ? facilityStatuses(run.value) : []))
const projects = computed(() => (run.value ? projectStatuses(run.value) : []))
const pacts = computed(() => (run.value ? pactStatuses(run.value) : []))
const influences = computed(() => (run.value ? cityInfluence(run.value) : []))

function upgrade(facility) {
  const result = game.upgradeCityFacility(facility.id)
  if (result.ok) game.notify(`${facility.name} 升到 Lv.${result.level}`, 'good')
}

function build(project) {
  const result = game.completeCityProject(project.id)
  if (result.ok) game.notify(`${project.name} 完成`, 'good')
}

function sign(pact) {
  const result = game.chooseCityPact(pact.id)
  if (result.ok) game.notify(`${pact.name} 已生效`, 'good')
}

</script>

<template>
  <div v-if="run" class="run-page development-page">
    <section class="panel development-head">
      <div>
        <RouterLink :to="{ name: 'city', params: { runId: run.id } }" class="back-link">← 城市</RouterLink>
        <p class="kicker">CITY DEVELOPMENT</p>
        <h1>{{ city?.name || '白塔空港' }}</h1>
        <p class="hint">设施升级提供长期便利；派系项目会改变这座城市，并提升对应派系影响力。</p>
      </div>
      <span class="tag amber">信用点 {{ run.player.credits }}</span>
    </section>

    <section class="panel influence-box">
      <div class="section-head">
        <div>
          <p class="kicker">INFLUENCE</p>
          <h2>派系影响力</h2>
        </div>
      </div>
      <div class="influence-list">
        <article v-for="influence in influences" :key="influence.faction" class="influence-row">
          <div>
            <b>{{ influence.name }}</b>
            <span>{{ influence.projectDone ? '城市项目已完成' : '等待投资' }}</span>
          </div>
          <em>{{ influence.influence }}</em>
        </article>
      </div>
    </section>

    <section class="panel pact-box">
      <div class="section-head">
        <div>
          <p class="kicker">CITY PACT</p>
          <h2>城市盟约</h2>
        </div>
        <span class="hint">每座城市只能选择一次</span>
      </div>
      <div class="pact-grid">
        <article
          v-for="pact in pacts"
          :key="pact.id"
          class="pact-card"
          :class="{ 'is-chosen': pact.chosen, 'is-locked': pact.locked }"
        >
          <div class="pact-top">
            <b>{{ pact.name }}</b>
            <span class="tag" :class="pact.chosen ? 'jade' : pact.canChoose ? 'violet' : 'muted'">
              {{ pact.chosen ? '已签订' : pact.locked ? '已排斥' : pact.factionName }}
            </span>
          </div>
          <p>{{ pact.desc }}</p>
          <span class="pact-reward">{{ pact.rewardText }}</span>
          <div class="pact-req">
            <span :class="{ ok: pact.rep >= 30 }">声望 {{ pact.rep }} / 30</span>
            <span :class="{ ok: pact.projectDone }">{{ pact.projectDone ? '项目已完成' : '需要对应城市项目' }}</span>
          </div>
          <button
            type="button"
            class="btn btn-sm"
            :disabled="pact.chosen || pact.locked || !pact.canChoose"
            @click="sign(pact)"
          >
            {{ pact.chosen ? '盟约生效中' : pact.locked ? '被其他盟约排斥' : pact.canChoose ? '签订盟约' : '条件不足' }}
          </button>
        </article>
      </div>
    </section>

    <section class="panel facility-box">
      <div class="section-head">
        <div>
          <p class="kicker">FACILITIES</p>
          <h2>城市设施</h2>
        </div>
        <span class="hint">最高 Lv.3</span>
      </div>
      <div class="facility-grid">
        <article v-for="facility in facilities" :key="facility.id" class="facility-card">
          <div class="facility-top">
            <b>{{ facility.name }}</b>
            <span class="tag" :class="facility.maxed ? 'jade' : 'cyan'">Lv.{{ facility.level }} / {{ facility.max }}</span>
          </div>
          <p>{{ facility.desc }}</p>
          <span class="facility-effect">{{ facility.effectText }}</span>
          <button
            type="button"
            class="btn btn-sm"
            :disabled="facility.maxed || run.player.credits < facility.cost.credits || (run.inv.scrap || 0) < facility.cost.scrap"
            @click="upgrade(facility)"
          >
            {{ facility.maxed ? '已满级' : `升级 · ${facility.cost.credits} 信用点 + ${facility.cost.scrap} 废料` }}
          </button>
        </article>
      </div>
    </section>

    <section class="panel project-box">
      <div class="section-head">
        <div>
          <p class="kicker">FACTION PROJECTS</p>
          <h2>城市项目</h2>
        </div>
      </div>
      <div class="project-list">
        <article v-for="project in projects" :key="project.id" class="project-row" :class="{ 'is-done': project.done }">
          <div class="project-main">
            <div class="project-title">
              <b>{{ project.name }}</b>
              <span class="tag" :class="project.done ? 'jade' : project.canClaim ? 'violet' : 'muted'">
                {{ project.done ? '已完成' : project.factionName }}
              </span>
            </div>
            <p>{{ project.desc }}</p>
            <span class="project-reward">{{ project.rewardText }}</span>
            <div class="project-req">
              <span :class="{ ok: project.repOk }">声望 {{ project.rep }} / 30</span>
              <span :class="{ ok: project.itemOk }">{{ project.cost.count }} 件物品 · 持有 {{ project.itemCount }}</span>
              <span :class="{ ok: project.creditsOk }">{{ project.cost.credits }} 信用点</span>
            </div>
          </div>
          <button
            type="button"
            class="btn btn-sm"
            :disabled="project.done || !project.canClaim"
            @click="build(project)"
          >
            {{ project.done ? '已完成' : project.canClaim ? '启动项目' : '条件不足' }}
          </button>
        </article>
      </div>
    </section>

    <p class="hint development-note">
      设施与项目按城市保存；进入矿脉站后可以单独发展另一座城市。
    </p>
  </div>
</template>

<style scoped>

.development-page { display: flex; flex-direction: column; gap: 12px; padding-bottom: 28px; max-width: 1100px; }
.development-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; padding: 18px; }
.back-link { display: inline-flex; margin-bottom: 8px; color: var(--dim); font-family: var(--mono); font-size: max(var(--ui-min), calc(9px * var(--ui-scale))); }
.development-head h1 { margin-top: 4px; font-size: max(var(--ui-min), calc(30px * var(--ui-scale))); font-weight: 300; letter-spacing: .08em; }
.section-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; }
.section-head h2 { margin-top: 3px; font-size: max(var(--ui-min), calc(18px * var(--ui-scale))); font-weight: 400; }
.influence-box, .facility-box, .project-box, .pact-box { padding: 14px; }
.pact-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 7px; margin-top: 10px; }
.pact-card { display: flex; flex-direction: column; gap: 6px; padding: 10px; border: 1px solid var(--line); border-radius: 8px; background: rgba(5, 10, 16, .4); }
.pact-card.is-chosen { border-color: rgba(138, 222, 184, .4); background: rgba(138, 222, 184, .05); }
.pact-card.is-locked { opacity: .45; border-style: dashed; }
.pact-top { display: flex; align-items: baseline; justify-content: space-between; gap: 5px; }
.pact-top b { font-size: max(var(--ui-min), calc(11px * var(--ui-scale))); font-weight: 500; }
.pact-card p { flex: 1; color: var(--muted); font-size: max(var(--ui-min), calc(9px * var(--ui-scale))); line-height: 1.55; }
.pact-reward { color: var(--violet); font-family: var(--mono); font-size: max(var(--ui-min), calc(8px * var(--ui-scale))); }
.pact-req { display: flex; flex-wrap: wrap; gap: 6px; color: var(--dim); font-family: var(--mono); font-size: max(var(--ui-min), calc(8px * var(--ui-scale))); }
.pact-req .ok { color: var(--cyan); }
.pact-card .btn { height: 28px; padding: 0 7px; font-size: max(var(--ui-min), calc(8px * var(--ui-scale))); }
.influence-list { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 7px; margin-top: 10px; }
.influence-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 9px; border: 1px solid var(--line); border-radius: 8px; }
.influence-row b { display: block; font-size: max(var(--ui-min), calc(10px * var(--ui-scale))); font-weight: 500; }
.influence-row span { display: block; margin-top: 2px; color: var(--dim); font-family: var(--mono); font-size: max(var(--ui-min), calc(8px * var(--ui-scale))); }
.influence-row em { color: var(--violet); font-family: var(--mono); font-size: max(var(--ui-min), calc(18px * var(--ui-scale))); font-style: normal; }
.facility-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 7px; margin-top: 10px; }
.facility-card { display: flex; flex-direction: column; gap: 6px; padding: 10px; border: 1px solid var(--line); border-radius: 8px; background: rgba(5, 10, 16, .4); }
.facility-top { display: flex; align-items: baseline; justify-content: space-between; gap: 4px; }
.facility-top b { font-size: max(var(--ui-min), calc(11px * var(--ui-scale))); font-weight: 500; }
.facility-card p { flex: 1; color: var(--muted); font-size: max(var(--ui-min), calc(9px * var(--ui-scale))); line-height: 1.55; }
.facility-effect { color: var(--jade); font-family: var(--mono); font-size: max(var(--ui-min), calc(8px * var(--ui-scale))); }
.facility-card .btn { height: 28px; padding: 0 7px; font-size: max(var(--ui-min), calc(8px * var(--ui-scale))); }
.project-list { display: flex; flex-direction: column; gap: 6px; margin-top: 10px; }
.project-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 11px; border: 1px solid var(--line); border-radius: 8px; }
.project-row.is-done { border-color: rgba(138, 222, 184, .22); background: rgba(138, 222, 184, .035); }
.project-main { min-width: 0; }
.project-title { display: flex; align-items: center; gap: 6px; }
.project-title b { font-size: max(var(--ui-min), calc(12px * var(--ui-scale))); font-weight: 500; }
.project-main p { margin-top: 3px; color: var(--muted); font-size: max(var(--ui-min), calc(9px * var(--ui-scale))); line-height: 1.6; }
.project-reward { display: block; margin-top: 3px; color: var(--jade); font-family: var(--mono); font-size: max(var(--ui-min), calc(8px * var(--ui-scale))); }
.project-req { display: flex; flex-wrap: wrap; gap: 7px; margin-top: 5px; color: var(--dim); font-family: var(--mono); font-size: max(var(--ui-min), calc(8px * var(--ui-scale))); }
.project-req .ok { color: var(--cyan); }
.development-note { padding: 0 4px; }
@media (max-width: 800px) {
  .development-head { flex-direction: column; }
  .influence-list, .facility-grid, .pact-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .project-row { align-items: flex-start; flex-direction: column; }
}
@media (max-width: 480px) {
  .influence-list, .facility-grid, .pact-grid { grid-template-columns: 1fr; }
}
</style>
