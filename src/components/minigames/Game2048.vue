<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

const props = defineProps({ challenge: { type: Object, required: true }, active: { type: Boolean, default: true } })
const emit = defineEmits(['score', 'done'])
const SIZE = 4
const board = ref(empty())
const score = ref(0)
const moved = ref(false)

function empty() {
  return Array.from({ length: SIZE }, () => Array(SIZE).fill(0))
}

function addTile() {
  const cells = []
  board.value.forEach((row, y) => row.forEach((value, x) => {
    if (!value) cells.push({ x, y })
  }))
  if (!cells.length) return
  const cell = cells[Math.floor(Math.random() * cells.length)]
  board.value[cell.y][cell.x] = Math.random() < 0.9 ? 2 : 4
}

function start() {
  board.value = empty()
  score.value = 0
  addTile()
  addTile()
  emit('score', 0)
}

function moveRow(row) {
  const values = row.filter(Boolean)
  const merged = []
  for (let index = 0; index < values.length; index += 1) {
    if (values[index] === values[index + 1]) {
      merged.push(values[index] * 2)
      score.value += values[index] * 2
      index += 1
    } else {
      merged.push(values[index])
    }
  }
  while (merged.length < SIZE) merged.push(0)
  return merged
}

function move(direction) {
  if (!props.active) return
  const before = JSON.stringify(board.value)
  let next = board.value.map((row) => [...row])
  for (let index = 0; index < SIZE; index += 1) {
    let line = []
    if (direction === 'left' || direction === 'right') {
      line = next[index]
      if (direction === 'right') line = [...line].reverse()
      line = moveRow(line)
      if (direction === 'right') line = [...line].reverse()
      next[index] = line
    } else {
      line = next.map((row) => row[index])
      if (direction === 'down') line = [...line].reverse()
      line = moveRow(line)
      if (direction === 'down') line = [...line].reverse()
      next.forEach((row, rowIndex) => { row[index] = line[rowIndex] })
    }
  }
  board.value = next
  moved.value = JSON.stringify(board.value) !== before
  if (moved.value) {
    addTile()
    emit('score', score.value)
    if (!canMove()) emit('done')
  }
}

function canMove() {
  return board.value.some((row, y) => row.some((value, x) => (
    !value ||
    (x + 1 < SIZE && board.value[y][x + 1] === value) ||
    (y + 1 < SIZE && board.value[y + 1][x] === value)
  )))
}

const tiles = computed(() => board.value.flatMap((row, y) => row.map((value, x) => ({
  key: `${y}-${x}`,
  value,
  active: value > 0,
}))))

function onKey(event) {
  if (!props.active) return
  const map = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down' }
  if (!map[event.key]) return
  event.preventDefault()
  move(map[event.key])
}

onMounted(() => {
  start()
  window.addEventListener('keydown', onKey)
})
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <div class="game2048">
    <div class="grid2048">
      <span v-for="tile in tiles" :key="tile.key" class="tile2048" :class="tile.value ? `v${Math.min(tile.value, 2048)}` : ''">
        {{ tile.value || '' }}
      </span>
    </div>
    <div class="controls2048">
      <button type="button" class="mini-btn" @click="move('left')">←</button>
      <button type="button" class="mini-btn" @click="move('up')">↑</button>
      <button type="button" class="mini-btn" @click="move('down')">↓</button>
      <button type="button" class="mini-btn" @click="move('right')">→</button>
    </div>
    <p class="mini-note">方向键或按钮合并数字，目标分数 {{ challenge.target }}</p>
  </div>
</template>

<style scoped>
.game2048 { width: 100%; }
.grid2048 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 5px; width: min(100%, 280px); aspect-ratio: 1; margin: 0 auto; padding: 6px; border: 1px solid rgba(124,231,255,.2); border-radius: 9px; background: rgba(2,7,12,.9); }
.tile2048 { display: grid; place-items: center; border-radius: 5px; background: rgba(124,231,255,.05); color: var(--ink); font-family: var(--mono); font-size: 13px; }
.tile2048.v2 { background: #173342; color: #c8f6ff; }
.tile2048.v4 { background: #1f4a51; color: #dffcff; }
.tile2048.v8 { background: #286a63; color: #effffa; }
.tile2048.v16 { background: #7b6531; color: #fff4cc; }
.tile2048.v32 { background: #8d4f2f; color: #ffe6d1; }
.tile2048.v64 { background: #963d45; color: #ffe1e3; }
.tile2048.v128, .tile2048.v256, .tile2048.v512, .tile2048.v1024, .tile2048.v2048 { background: var(--amber); color: #171008; font-weight: 700; }
.controls2048 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 5px; margin-top: 9px; }
.mini-btn { height: 34px; border: 1px solid var(--line); border-radius: 7px; background: rgba(5,10,16,.6); color: var(--ink); font-size: 15px; cursor: pointer; }
.mini-note { margin-top: 7px; color: var(--dim); font-size: max(var(--ui-min), calc(8px * var(--ui-scale))); text-align: center; }
</style>
