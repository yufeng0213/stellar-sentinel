<script setup>
/*
 * 通用小游戏遮罩。当前实现方块堆叠；后续可以在 minigames.js 注册新玩法。
 */
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useGameStore } from '../stores/game.js'

const game = useGameStore()
const router = useRouter()
const pending = computed(() => game.run?.pendingMiniGame || null)
const COLS = 10
const ROWS = 16
const SHAPES = [
  { shape: [[1, 1, 1, 1]], color: 'cyan' },
  { shape: [[1, 1], [1, 1]], color: 'amber' },
  { shape: [[0, 1, 0], [1, 1, 1]], color: 'violet' },
  { shape: [[1, 0], [1, 0], [1, 1]], color: 'jade' },
  { shape: [[0, 1, 1], [1, 1, 0]], color: 'red' },
  { shape: [[1, 1, 0], [0, 1, 1]], color: 'blue' },
]

const board = ref(emptyBoard())
const piece = ref(null)
const score = ref(0)
const remaining = ref(0)
const finished = ref(false)
const lastClear = ref('')
let clock = null
let fall = null
let keyboardBound = false

function emptyBoard() {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(null))
}

function randomShape() {
  return SHAPES[Math.floor(Math.random() * SHAPES.length)]
}

function collides(shape, px, py) {
  return shape.some((row, y) => row.some((cell, x) => {
    if (!cell) return false
    const nx = px + x
    const ny = py + y
    return nx < 0 || nx >= COLS || ny >= ROWS || (ny >= 0 && board.value[ny]?.[nx])
  }))
}

function spawn() {
  const next = randomShape()
  const startX = Math.floor((COLS - next.shape[0].length) / 2)
  if (collides(next.shape, startX, 0)) {
    finish(false)
    return
  }
  piece.value = { ...next, x: startX, y: 0 }
}

function rotate() {
  if (!piece.value || finished.value) return
  const shape = piece.value.shape[0].map((_, index) => piece.value.shape.map((row) => row[index]).reverse())
  if (!collides(shape, piece.value.x, piece.value.y)) piece.value.shape = shape
}

function move(dx) {
  if (!piece.value || finished.value) return
  if (!collides(piece.value.shape, piece.value.x + dx, piece.value.y)) piece.value.x += dx
}

function stepDown() {
  if (!piece.value || finished.value) return
  if (!collides(piece.value.shape, piece.value.x, piece.value.y + 1)) {
    piece.value.y += 1
    return
  }
  lock()
}

function lock() {
  const current = piece.value
  if (!current) return
  current.shape.forEach((row, y) => row.forEach((cell, x) => {
    if (!cell) return
    const ny = current.y + y
    const nx = current.x + x
    if (ny >= 0 && ny < ROWS && nx >= 0 && nx < COLS) board.value[ny][nx] = current.color
  }))
  let cleared = 0
  for (let y = ROWS - 1; y >= 0; y -= 1) {
    if (board.value[y].every(Boolean)) {
      board.value.splice(y, 1)
      board.value.unshift(Array(COLS).fill(null))
      cleared += 1
      y += 1
    }
  }
  if (cleared) {
    score.value += cleared * 100
    lastClear.value = cleared > 1 ? `双行消除 +${cleared * 100}` : `消行 +100`
  }
  piece.value = null
  spawn()
}

function hardDrop() {
  if (!piece.value || finished.value) return
  while (piece.value && !collides(piece.value.shape, piece.value.x, piece.value.y + 1)) {
    piece.value.y += 1
  }
  lock()
}

const displayCells = computed(() => {
  const view = board.value.map((row) => [...row])
  if (piece.value) {
    piece.value.shape.forEach((row, y) => row.forEach((cell, x) => {
      if (!cell) return
      const ny = piece.value.y + y
      const nx = piece.value.x + x
      if (view[ny]?.[nx] === null) view[ny][nx] = piece.value.color
    }))
  }
  return view.flatMap((row, y) => row.map((cell, x) => ({ key: `${y}-${x}`, color: cell })))
})

function clearTimers() {
  if (clock) clearInterval(clock)
  if (fall) clearInterval(fall)
  clock = null
  fall = null
}

function finish(aborted) {
  if (finished.value || !pending.value) return
  finished.value = true
  clearTimers()
  const result = game.completeMiniGame({ score: score.value, aborted })
  if (result?.result?.battleNodeId && game.run) {
    router.push({ name: 'battle', params: { runId: game.run.id, nodeId: result.result.battleNodeId } })
  }
}

function start(challenge) {
  if (!challenge) return
  clearTimers()
  finished.value = false
  board.value = emptyBoard()
  score.value = 0
  lastClear.value = ''
  remaining.value = challenge.duration
  spawn()
  clock = setInterval(() => {
    remaining.value -= 1
    if (remaining.value <= 0) finish(false)
  }, 1000)
  fall = setInterval(stepDown, 480)
}

function onKey(event) {
  if (!pending.value || finished.value) return
  if (event.key === 'ArrowLeft') { event.preventDefault(); move(-1) }
  else if (event.key === 'ArrowRight') { event.preventDefault(); move(1) }
  else if (event.key === 'ArrowDown') { event.preventDefault(); stepDown() }
  else if (event.key === 'ArrowUp') { event.preventDefault(); rotate() }
  else if (event.key === ' ') { event.preventDefault(); hardDrop() }
}

watch(pending, (challenge) => {
  if (!challenge) {
    clearTimers()
    return
  }
  if (!keyboardBound) {
    window.addEventListener('keydown', onKey)
    keyboardBound = true
  }
  start(challenge)
}, { immediate: true })

onBeforeUnmount(() => {
  clearTimers()
  if (keyboardBound) window.removeEventListener('keydown', onKey)
})
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

          <div class="mini-board" :style="{ '--mini-cols': COLS }">
            <span
              v-for="cell in displayCells"
              :key="cell.key"
              class="mini-cell"
              :class="cell.color ? `is-${cell.color}` : ''"
            />
          </div>

          <p class="mini-clear">{{ lastClear }}</p>
          <div class="mini-controls">
            <button type="button" class="mini-btn" @click="move(-1)">←</button>
            <button type="button" class="mini-btn" @click="rotate">↻</button>
            <button type="button" class="mini-btn" @click="move(1)">→</button>
            <button type="button" class="mini-btn wide" @click="stepDown">↓</button>
            <button type="button" class="mini-btn wide primary" @click="hardDrop">落下</button>
          </div>
          <p class="mini-note">方向键移动 / ↑旋转 / 空格落下 · 时间结束或堆到顶部即结算</p>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.mini-backdrop { position: fixed; inset: 0; z-index: 120; display: grid; place-items: center; padding: 14px; background: rgba(1, 4, 8, .82); backdrop-filter: blur(12px); }
.mini-panel { width: min(360px, 100%); padding: 14px; border: 1px solid var(--line-2); border-radius: 18px; background: radial-gradient(500px 240px at 80% -10%, rgba(124,231,255,.1), transparent 65%), #060b12; box-shadow: 0 24px 80px rgba(0,0,0,.55); }
.mini-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; }
.mini-head h2 { margin-top: 3px; font-size: max(var(--ui-min), calc(20px * var(--ui-scale))); font-weight: 400; letter-spacing: .08em; }
.mini-head .hint { margin-top: 3px; }
.mini-close { width: 26px; height: 26px; padding: 0; border: 1px solid var(--line); border-radius: 50%; background: transparent; color: var(--dim); font-size: 18px; line-height: 1; cursor: pointer; }
.mini-stats { display: flex; justify-content: space-between; gap: 8px; margin: 12px 0 8px; padding: 7px 9px; border: 1px solid var(--line); border-radius: 8px; color: var(--dim); font-family: var(--mono); font-size: max(var(--ui-min), calc(9px * var(--ui-scale))); }
.mini-stats b { color: var(--cyan); font-weight: 500; }
.mini-board { display: grid; grid-template-columns: repeat(var(--mini-cols), 1fr); gap: 2px; width: min(100%, 292px); aspect-ratio: 10 / 16; margin: 0 auto; padding: 4px; border: 1px solid rgba(124,231,255,.2); border-radius: 8px; background: rgba(2, 7, 12, .9); }
.mini-cell { min-height: 0; border-radius: 2px; background: rgba(124,231,255,.045); }
.mini-cell.is-cyan { background: var(--cyan); box-shadow: 0 0 7px rgba(124,231,255,.35); }
.mini-cell.is-amber { background: var(--amber); }
.mini-cell.is-violet { background: var(--violet); }
.mini-cell.is-jade { background: var(--jade); }
.mini-cell.is-red { background: var(--red); }
.mini-cell.is-blue { background: #6ea8ff; }
.mini-clear { min-height: 18px; margin-top: 7px; color: var(--amber); font-family: var(--mono); font-size: max(var(--ui-min), calc(8.5px * var(--ui-scale))); text-align: center; }
.mini-controls { display: grid; grid-template-columns: repeat(4, 1fr); gap: 5px; margin-top: 4px; }
.mini-btn { height: 34px; border: 1px solid var(--line); border-radius: 7px; background: rgba(5,10,16,.6); color: var(--ink); font-size: 16px; cursor: pointer; }
.mini-btn.wide { grid-column: span 1; font-size: max(var(--ui-min), calc(9px * var(--ui-scale))); }
.mini-btn.primary { border-color: rgba(255,196,107,.45); color: var(--amber); }
.mini-note { margin-top: 7px; color: var(--dim); font-size: max(var(--ui-min), calc(8px * var(--ui-scale))); text-align: center; }
.mini-enter-active, .mini-leave-active { transition: opacity .18s ease; }
.mini-enter-from, .mini-leave-to { opacity: 0; }
@media (max-width: 380px) {
  .mini-panel { padding: 10px; }
  .mini-board { width: min(100%, 250px); }
}
</style>
