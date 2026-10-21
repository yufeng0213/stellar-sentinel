<script setup>

import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { dateView } from '../game-core/date-story.js'
import { useGameStore } from '../stores/game.js'

const game = useGameStore()
const route = useRoute()
const router = useRouter()
const nodeId = String(route.params.nodeId)
const reply = ref('')
const run = computed(() => game.run)
const view = computed(() => (run.value ? dateView(run.value, nodeId) : null))

function choose(choice) {
  if (!view.value) return
  const result = game.chooseDate(nodeId, choice.id)
  reply.value = result.text || result.message || ''
}

function finish() {
  if (!view.value) return
  const result = game.finishDate(nodeId)
  if (result.ok) router.push({ name: 'map', params: { runId: route.params.runId } })
}

function backMap() {
  router.push({ name: 'map', params: { runId: route.params.runId } })
}

</script>

<template>
  <div class="date-page">
    <div class="date-glow" aria-hidden="true"></div>

    <header class="date-top">
      <button type="button" class="back-link" @click="backMap">← 星图</button>
      <span class="kicker">DATE · {{ view ? `SCENE ${view.index + 1}/${view.total}` : 'UNAVAILABLE' }}</span>
    </header>

    <main v-if="view" class="date-main">
      <section class="date-card">
        <div class="date-head">
          <div class="date-avatar">{{ view.npc.archetype?.glyph || view.npc.name.slice(0, 1) }}</div>
          <div>
            <p class="kicker">{{ view.npc.archetype?.name || 'NPC' }} · {{ view.npc.role }}</p>
            <h1>{{ view.npc.name }}</h1>
            <p class="date-tagline">{{ view.npc.archetype?.tagline || '在空港的灯下见一面。' }}</p>
          </div>
          <span class="tag" :class="view.npc.lover ? 'red' : 'violet'">{{ view.npc.lover ? '恋人' : '约会' }}</span>
        </div>

        <div class="date-progress">
          <i v-for="(_, index) in view.scenes" :key="index" :class="{ 'is-done': index < view.index, 'is-current': index === view.index }"></i>
        </div>

        <template v-if="!view.done && view.scene">
          <p class="scene-title">{{ view.scene.title }}</p>
          <p class="scene-text">{{ view.scene.text }}</p>
          <p v-if="reply" class="scene-reply">{{ reply }}</p>

          <div class="date-choices">
            <button
              v-for="choice in view.scene.choices"
              :key="choice.id"
              type="button"
              class="date-choice"
              @click="choose(choice)"
            >
              <b>{{ choice.label }}</b>
              <span>{{ choice.text }}</span>
            </button>
          </div>
        </template>

        <template v-else>
          <p class="scene-title">这次约会到这里</p>
          <p class="scene-text">{{ reply || '你们谁都没有先提离开，但夜色已经深了。' }}</p>
          <button type="button" class="btn btn-primary btn-block" @click="finish">结束这次约会</button>
        </template>
      </section>
    </main>

    <main v-else class="date-main">
      <section class="date-card date-empty">
        <p class="kicker">DATE · LOST</p>
        <h1>这个约会节点已经失效了</h1>
        <p class="scene-text">约定可能已经过期，或者被其他事情打断了。</p>
        <button type="button" class="btn btn-primary btn-block" @click="backMap">返回星图</button>
      </section>
    </main>
  </div>
</template>

<style scoped>

.date-page {
  position: relative;
  min-height: 100vh;
  overflow: hidden;
  background:
    radial-gradient(700px 380px at 50% -10%, rgba(185, 164, 255, .16), transparent 70%),
    radial-gradient(500px 300px at 100% 100%, rgba(124, 231, 255, .1), transparent 70%),
    #05090f;
}
.date-glow {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background-image: radial-gradient(rgba(255, 255, 255, .12) 1px, transparent 1px);
  background-size: 48px 48px;
  opacity: .14;
}
.date-top {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: min(860px, calc(100% - 32px));
  margin: 0 auto;
  padding: 20px 0 10px;
}
.date-top .back-link { border: 0; background: none; color: var(--muted); cursor: pointer; font: inherit; }
.date-main {
  position: relative;
  z-index: 1;
  display: flex;
  justify-content: center;
  padding: 28px 16px 50px;
}
.date-card {
  width: min(760px, 100%);
  padding: clamp(20px, 4vw, 38px);
  border: 1px solid rgba(185, 164, 255, .24);
  border-radius: 18px;
  background:
    linear-gradient(145deg, rgba(185, 164, 255, .07), transparent 45%),
    rgba(7, 13, 20, .88);
  box-shadow: 0 28px 100px rgba(0, 0, 0, .48);
  backdrop-filter: blur(8px);
}
.date-head { display: flex; align-items: center; gap: 12px; }
.date-avatar {
  display: grid;
  place-items: center;
  width: 52px;
  height: 52px;
  flex: none;
  border: 1px solid rgba(185, 164, 255, .44);
  border-radius: 14px;
  color: var(--violet);
  font-size: max(var(--ui-min), calc(23px * var(--ui-scale)));
}
.date-head h1 { margin-top: 2px; font-size: max(var(--ui-min), calc(26px * var(--ui-scale))); font-weight: 300; letter-spacing: .08em; }
.date-head .tag { margin-left: auto; }
.date-tagline { margin-top: 3px; color: var(--muted); font-family: var(--mono); font-size: max(var(--ui-min), calc(9px * var(--ui-scale))); }
.date-progress { display: flex; gap: 5px; margin-top: 24px; }
.date-progress i { display: block; flex: 1; height: 3px; border-radius: 3px; background: rgba(255, 255, 255, .08); transition: background .3s; }
.date-progress i.is-done { background: rgba(185, 164, 255, .45); }
.date-progress i.is-current { background: var(--violet); box-shadow: 0 0 12px rgba(185, 164, 255, .45); }
.scene-title { margin-top: 26px; color: var(--violet); font-family: var(--mono); font-size: max(var(--ui-min), calc(10px * var(--ui-scale))); letter-spacing: .16em; text-transform: uppercase; }
.scene-text { margin-top: 10px; color: var(--ink); font-size: max(var(--ui-min), calc(15px * var(--ui-scale))); line-height: 1.95; white-space: pre-wrap; }
.scene-reply { margin-top: 12px; padding: 10px 12px; border-left: 2px solid rgba(124, 231, 255, .4); background: rgba(124, 231, 255, .04); color: var(--muted); font-size: max(var(--ui-min), calc(11px * var(--ui-scale))); line-height: 1.8; }
.date-choices { display: flex; flex-direction: column; gap: 8px; margin-top: 24px; }
.date-choice {
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: 100%;
  padding: 12px 14px;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: rgba(5, 10, 16, .5);
  color: var(--ink);
  text-align: left;
  cursor: pointer;
  transition: border-color .2s, background .2s, transform .2s;
}
.date-choice:hover { border-color: rgba(185, 164, 255, .5); background: rgba(185, 164, 255, .06); transform: translateY(-1px); }
.date-choice b { font-size: max(var(--ui-min), calc(12px * var(--ui-scale))); font-weight: 500; }
.date-choice span { color: var(--muted); font-size: max(var(--ui-min), calc(9.5px * var(--ui-scale))); line-height: 1.55; }
.date-empty h1 { margin-top: 12px; font-weight: 300; }
.date-empty .btn { margin-top: 20px; }
@media (max-width: 560px) {
  .date-head { align-items: flex-start; }
  .date-head .tag { display: none; }
}
</style>
