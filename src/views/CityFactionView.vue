<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { factionFavorMissionStatuses } from '../game-core/faction-favor-chain.js'
import { factionStatuses } from '../game-core/faction.js'
import { useGameStore } from '../stores/game.js'

const game = useGameStore()
const router = useRouter()
const run = computed(() => game.run)
const statuses = computed(() => (run.value ? factionStatuses(run.value) : []))
const favorMissions = computed(() => (
  run.value ? factionFavorMissionStatuses(run.value).filter((mission) => mission.status === 'active') : []
))

function claim(status) {
  const result = game.claimFactionFavor(status.id)
  if (result.ok) game.notify(`领到${status.name}补给 · ${result.credits} 信用点`, 'good')
}

function doFavor(mission, choice) {
  const result = game.resolveFactionFavor(mission.factionId, choice.id)
  if (!result.ok) return
  if (result.factionNodeId && run.value) {
    router.push({ name: 'map', params: { runId: run.value.id } })
    return
  }
  game.notify(result.done ? '派系差事完成' : '差事推进', 'good')
}
</script>

<template>
  <div v-if="run" class="run-page faction-page">
    <section class="panel faction-head">
      <div>
        <RouterLink :to="{ name: 'city', params: { runId: run.id } }" class="back-link">← 空港</RouterLink>
        <p class="kicker">FACTIONS · AIRPORT</p>
        <h2>派系</h2>
        <p class="hint">你和四个派系的关系会改变空港愿意给你什么。友善以上可以领取每日补给。</p>
      </div>
      <span class="tag cyan">信用点 {{ run.player.credits }}</span>
    </section>

    <section v-if="favorMissions.length" class="panel favor-chain">
      <div class="favor-chain-head">
        <p class="kicker">FACTION FAVOR · ACTIVE</p>
        <h2>派系差事</h2>
        <p>人情已经变成了具体的事。做完之前，名单上的名字不会消失。</p>
      </div>
      <article v-for="mission in favorMissions" :key="mission.factionId" class="favor-mission">
        <div class="favor-mission-top">
          <div>
            <p class="kicker">{{ mission.factionName }} · STAGE {{ mission.stage + 1 }} / {{ mission.total }}</p>
            <h3>{{ mission.step.title }}</h3>
          </div>
          <span class="tag violet">{{ mission.name }}</span>
        </div>
        <p class="favor-text">{{ mission.step.text }}</p>
        <div class="favor-choices">
          <button
            v-for="choice in mission.step.choices"
            :key="choice.id"
            type="button"
            class="favor-choice"
            @click="doFavor(mission, choice)"
          >
            <b>{{ choice.label }}</b>
            <span>{{ choice.desc }}</span>
          </button>
        </div>
      </article>
    </section>

    <section class="faction-grid">
      <article v-for="status in statuses" :key="status.id" class="faction-card">
        <div class="faction-top">
          <div>
            <span class="kicker">{{ status.level }}</span>
            <h3>{{ status.name }}</h3>
          </div>
          <span class="faction-score" :class="`is-${status.color}`">{{ status.score > 0 ? '+' : '' }}{{ status.score }}</span>
        </div>
        <p class="faction-desc">{{ status.desc }}</p>
        <div class="faction-bar"><i :style="{ width: `${status.progress}%` }"></i></div>
        <p class="faction-creed">“{{ status.creed }}”</p>
        <div class="faction-bottom">
          <span class="faction-favor">
            {{ status.score >= 10 ? (status.favorDay === run.day ? '今日补给已领取' : '可领取每日补给') : '友善后开放补给' }}
          </span>
          <button type="button" class="btn btn-sm" :disabled="status.score < 10 || status.favorDay === run.day" @click="claim(status)">
            领取补给
          </button>
          <RouterLink :to="{ name: 'city-faction', params: { runId: run.id, factionId: status.id } }" class="text-link">
            详情 →
          </RouterLink>
        </div>
      </article>
    </section>
  </div>
</template>

<style scoped>
.faction-page { gap: 12px; max-width: 1200px; }
.faction-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; padding: 18px; }
.back-link { display: inline-flex; margin-bottom: 9px; color: var(--dim); font-family: var(--mono); font-size: max(var(--ui-min), calc(9px * var(--ui-scale))); }
.faction-head h2 { margin-top: 3px; font-size: max(var(--ui-min), calc(30px * var(--ui-scale))); font-weight: 300; letter-spacing: .08em; }
.favor-chain { padding: 15px 16px; border-color: rgba(185, 164, 255, .3); background: rgba(185, 164, 255, .035); }
.favor-chain-head h2 { margin-top: 3px; color: var(--violet); font-size: max(var(--ui-min), calc(22px * var(--ui-scale))); font-weight: 300; }
.favor-chain-head p:not(.kicker) { margin-top: 3px; color: var(--muted); font-size: max(var(--ui-min), calc(9.5px * var(--ui-scale))); line-height: 1.6; }
.favor-mission { margin-top: 10px; padding-top: 10px; border-top: 1px solid var(--line); }
.favor-mission-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; }
.favor-mission h3 { margin-top: 3px; font-size: max(var(--ui-min), calc(17px * var(--ui-scale))); font-weight: 500; }
.favor-text { margin-top: 5px; white-space: pre-line; color: var(--muted); font-size: max(var(--ui-min), calc(9.5px * var(--ui-scale))); line-height: 1.65; }
.favor-choices { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px; margin-top: 9px; }
.favor-choice { display: flex; flex-direction: column; gap: 4px; padding: 9px; border: 1px solid var(--line); border-radius: 8px; background: rgba(5, 10, 16, .4); color: var(--ink); text-align: left; cursor: pointer; }
.favor-choice:hover { border-color: rgba(185, 164, 255, .45); background: rgba(185, 164, 255, .05); }
.favor-choice b { font-size: max(var(--ui-min), calc(10px * var(--ui-scale))); font-weight: 500; }
.favor-choice span { color: var(--muted); font-size: max(var(--ui-min), calc(8.5px * var(--ui-scale))); line-height: 1.5; }
.faction-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 9px; }
.faction-card { padding: 16px; border: 1px solid var(--line); border-radius: 13px; background: linear-gradient(155deg, rgba(16, 28, 40, .82), rgba(5, 10, 16, .68)); }
.faction-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; }
.faction-top h3 { margin-top: 3px; font-size: max(var(--ui-min), calc(20px * var(--ui-scale))); font-weight: 400; letter-spacing: .06em; }
.faction-score { font-family: var(--mono); font-size: max(var(--ui-min), calc(18px * var(--ui-scale))); }
.faction-score.is-red { color: var(--red); }
.faction-score.is-amber { color: var(--amber); }
.faction-score.is-muted { color: var(--muted); }
.faction-score.is-cyan { color: var(--cyan); }
.faction-score.is-jade { color: var(--jade); }
.faction-score.is-violet { color: var(--violet); }
.faction-desc { margin-top: 9px; color: var(--muted); font-size: max(var(--ui-min), calc(10px * var(--ui-scale))); line-height: 1.7; }
.faction-bar { height: 5px; margin-top: 12px; border-radius: 3px; background: rgba(255, 255, 255, .07); overflow: hidden; }
.faction-bar i { display: block; height: 100%; border-radius: inherit; background: linear-gradient(90deg, rgba(124, 231, 255, .35), var(--cyan)); transition: width .3s ease; }
.faction-creed { margin-top: 8px; color: var(--dim); font-family: var(--mono); font-size: max(var(--ui-min), calc(9px * var(--ui-scale))); }
.faction-bottom { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-top: 12px; padding-top: 10px; border-top: 1px solid var(--line); }
.faction-favor { color: var(--dim); font-size: max(var(--ui-min), calc(8.5px * var(--ui-scale))); }
.text-link { color: var(--cyan); font-family: var(--mono); font-size: max(var(--ui-min), calc(8.5px * var(--ui-scale))); white-space: nowrap; }
@media (max-width: 750px) {
  .faction-head { flex-direction: column; padding: 14px; }
  .faction-grid, .favor-choices { grid-template-columns: 1fr; }
}
</style>
