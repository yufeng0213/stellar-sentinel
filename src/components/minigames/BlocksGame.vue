<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

const props = defineProps({
  challenge: { type: Object, required: true },
  active: { type: Boolean, default: true },
})
const emit = defineEmits(['score', 'done'])
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
const lastClear = ref('')
let fall = null

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
    stop()
    emit('done')
    return
  }
  piece.value = { ...next, x: startX, y: 0 }
}

function rotate() {
  if (!piece.value || !props.active) return
  const shape = piece.value.shape[0].map((_, index) => piece.value.shape.map((row) => row[index]).reverse())
  if (!collides(shape, piece.value.x, piece.value.y)) piece.value.shape = shape
}

function move(dx) {
  if (!piece.value || !props.active) return
  if (!collides(piece.value.shape, piece.value.x + dx, piece.value.y)) piece.value.x += dx
}

function stepDown() {
  if (!piece.value || !props.active) return
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
    lastClear.value = cleared > 1 ? `双行消除 +${cleared * 100}` : '消行 +100'
    emit('score', score.value)
  }
  piece.value = null
  spawn()
}

function hardDrop() {
  if (!piece.value || !props.active) return
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

function start() {
  if (!props.active) return
  stop()
  board.value = emptyBoard()
  score.value = 0
  lastClear.value = ''
  spawn()
  emit('score', 0)
  fall = setInterval(stepDown, 480)
}

function stop() {
  if (fall) clearInterval(fall)
  fall = null
}

function onKey(event) {
  if (!props.active) return
  if (event.key === 'ArrowLeft') { event.preventDefault(); move(-1) }
  else if (event.key === 'ArrowRight') { event.preventDefault(); move(1) }
  else if (event.key === 'ArrowDown') { event.preventDefault(); stepDown() }
  else if (event.key === 'ArrowUp') { event.preventDefault(); rotate() }
  else if (event.key === ' ') { event.preventDefault(); hardDrop() }
}

onMounted(() => {
  start()
  window.addEventListener('keydown', onKey)
})
onBeforeUnmount(() => {
  stop()
  window.removeEventListener('keydown', onKey)
})
</script>

<template>
  <div class="blocks-game">
    <div class="blocks-board" :style="{ '--cols': COLS }">
      <span
        v-for="cell in displayCells"
        :key="cell.key"
        class="blocks-cell"
        :class="cell.color ? `is-${cell.color}` : ''"
      />
    </div>
    <p class="blocks-clear">{{ lastClear }}</p>
    <div class="blocks-controls">
      <button type="button" class="mini-btn" @click="move(-1)">←</button>
      <button type="button" class="mini-btn" @click="rotate">↻</button>
      <button type="button" class="mini-btn" @click="move(1)">→</button>
      <button type="button" class="mini-btn" @click="stepDown">↓</button>
      <button type="button" class="mini-btn primary" @click="hardDrop">落下</button>
    </div>
    <p class="mini-note">方向键移动 / ↑旋转 / 空格落下</p>
  </div>
</template>

<style scoped>
.blocks-game { width: 100%; }
.blocks-board { display: grid; grid-template-columns: repeat(var(--cols), 1fr); gap: 2px; width: min(100%, 292px); aspect-ratio: 10 / 16; margin: 0 auto; padding: 4px; border: 1px solid rgba(124,231,255,.2); border-radius: 8px; background: rgba(2, 7, 12, .9); }
.blocks-cell { min-height: 0; border-radius: 2px; background: rgba(124,231,255,.045); }
.blocks-cell.is-cyan { background: var(--cyan); box-shadow: 0 0 7px rgba(124,231,255,.35); }
.blocks-cell.is-amber { background: var(--amber); }
.blocks-cell.is-violet { background: var(--violet); }
.blocks-cell.is-jade { background: var(--jade); }
.blocks-cell.is-red { background: var(--red); }
.blocks-cell.is-blue { background: #6ea8ff; }
.blocks-clear { min-height: 18px; margin-top: 7px; color: var(--amber); font-family: var(--mono); font-size: max(var(--ui-min), calc(8.5px * var(--ui-scale))); text-align: center; }
.blocks-controls { display: grid; grid-template-columns: repeat(5, 1fr); gap: 5px; }
.mini-btn { height: 34px; border: 1px solid var(--line); border-radius: 7px; background: rgba(5,10,16,.6); color: var(--ink); font-size: 15px; cursor: pointer; }
.mini-btn.primary { border-color: rgba(255,196,107,.45); color: var(--amber); font-size: max(var(--ui-min), calc(9px * var(--ui-scale))); }
.mini-note { margin-top: 7px; color: var(--dim); font-size: max(var(--ui-min), calc(8px * var(--ui-scale))); text-align: center; }
</style>
