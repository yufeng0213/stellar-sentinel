<script setup>
/*
 * 小游戏全屏容器。具体玩法由 minigames/ 下的组件实现。
 */
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useGameStore } from '../stores/game.js'
import BlocksGame from './minigames/BlocksGame.vue'
import Game2048 from './minigames/Game2048.vue'
import MemoryGame from './minigames/MemoryGame.vue'
import MinesweeperGame from './minigames/MinesweeperGame.vue'
import PipeGame from './minigames/PipeGame.vue'
import CodeGame from './minigames/CodeGame.vue'
import FrequencyGame from './minigames/FrequencyGame.vue'

const game = useGameStore()
const router = useRouter()
const pending = computed(() => game.run?.pendingMiniGame || null)
const GAME_COMPONENTS = {
  blocks: BlocksGame,
  game2048: Game2048,
  memory: MemoryGame,
  minesweeper: MinesweeperGame,
  pipe: PipeGame,
  code: CodeGame,
  frequency: FrequencyGame,
}
const gameComponent = computed(() => (pending.value ? GAME_COMPONENTS[pending.value.game] || BlocksGame : null))
const score = ref(0)
const remaining = ref(0)
const finished = ref(false)
let clock = null

function clearClock() {
  if (clock) clearInterval(clock)
  clock = null
}

function finish(aborted = false) {
  if (finished.value || !pending.value) return
  finished.value = true
  clearClock()
  const result = game.completeMiniGame({ score: score.value, aborted })
  if (result?.result?.battleNodeId && game.run) {
    router.push({ name: 'battle', params: { runId: game.run.id, nodeId: result.result.battleNodeId } })
  }
}

function start(challenge) {
  if (!challenge) return
  clearClock()
  finished.value = false
  score.value = 0
  remaining.value = challenge.duration
  clock = setInterval(() => {
    remaining.value -= 1
    if (remaining.value <= 0) finish(false)
  }, 1000)
}

function onScore(value) {
  score.value = Number(value) || 0
}

watch(pending, (challenge) => {
  if (challenge) start(challenge)
  else clearClock()
}, { immediate: true })

onBeforeUnmount(clearClock)
</script>

<template>
  <Teleport to="body">
    <Transition name="mini">
      <div v-if="pending" class="mini-backdrop">
        <section class="mini-panel">
          <header class="mini-head">
            <div>
              <p class="kicker">MINI GAME · {{ pending.name }}</p>
              <h2>{{ pending.kind === 'gather' ? '采集挑战' : '扒窃挑战' }}</h2>
              <p class="hint">{{ pending.hint }}</p>
            </div>
            <button type="button" class="mini-close" title="放弃" @click="finish(true)">×</button>
          </header>

          <div class="mini-stats">
            <span>目标 <b>{{ pending.target }}</b></span>
            <span>得分 <b>{{ score }}</b></span>
            <span>剩余 <b>{{ Math.max(0, remaining) }}s</b></span>
          </div>

          <component
            :is="gameComponent"
            :key="pending.id"
            :challenge="pending"
            :active="!finished"
            @score="onScore"
            @done="finish(false)"
          />
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.mini-backdrop { position: fixed; inset: 0; z-index: 120; display: grid; place-items: center; padding: 14px; background: rgba(1, 4, 8, .82); backdrop-filter: blur(12px); }
.mini-panel { width: min(380px, 100%); max-height: 94dvh; overflow-y: auto; padding: 14px; border: 1px solid var(--line-2); border-radius: 18px; background: radial-gradient(500px 240px at 80% -10%, rgba(124,231,255,.1), transparent 65%), #060b12; box-shadow: 0 24px 80px rgba(0,0,0,.55); }
.mini-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; }
.mini-head h2 { margin-top: 3px; font-size: max(var(--ui-min), calc(20px * var(--ui-scale))); font-weight: 400; letter-spacing: .08em; }
.mini-head .hint { margin-top: 3px; }
.mini-close { width: 26px; height: 26px; padding: 0; border: 1px solid var(--line); border-radius: 50%; background: transparent; color: var(--dim); font-size: 18px; line-height: 1; cursor: pointer; }
.mini-stats { display: flex; justify-content: space-between; gap: 8px; margin: 12px 0 8px; padding: 7px 9px; border: 1px solid var(--line); border-radius: 8px; color: var(--dim); font-family: var(--mono); font-size: max(var(--ui-min), calc(9px * var(--ui-scale))); }
.mini-stats b { color: var(--cyan); font-weight: 500; }
.mini-enter-active, .mini-leave-active { transition: opacity .18s ease; }
.mini-enter-from, .mini-leave-to { opacity: 0; }
@media (max-width: 380px) {
  .mini-panel { padding: 10px; }
}
</style>
