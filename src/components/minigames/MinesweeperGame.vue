<script setup>
import { computed, onMounted, ref } from 'vue'

const props = defineProps({ challenge: { type: Object, required: true }, active: { type: Boolean, default: true } })
const emit = defineEmits(['score', 'done'])
const size = computed(() => Math.max(5, Math.min(8, props.challenge.config?.size || 6)))
const mineCount = computed(() => Math.max(4, Math.min(10, props.challenge.config?.mines || 6)))
const cells = ref([])
const score = ref(0)
const flagMode = ref(false)
const finished = ref(false)
const placed = ref(false)

function indexOf(x, y) {
  return y * size.value + x
}

function neighbors(index) {
  const x = index % size.value
  const y = Math.floor(index / size.value)
  const result = []
  for (let dy = -1; dy <= 1; dy += 1) {
    for (let dx = -1; dx <= 1; dx += 1) {
      if (!dx && !dy) continue
      const nx = x + dx
      const ny = y + dy
      if (nx >= 0 && nx < size.value && ny >= 0 && ny < size.value) result.push(indexOf(nx, ny))
    }
  }
  return result
}

function start() {
  cells.value = Array.from({ length: size.value * size.value }, (_, index) => ({
    id: index,
    mine: false,
    revealed: false,
    flagged: false,
    count: 0,
  }))
  score.value = 0
  finished.value = false
  flagMode.value = false
  placed.value = false
  emit('score', 0)
}

function placeMines(safeIndex) {
  const mineSet = new Set()
  while (mineSet.size < mineCount.value) {
    const index = Math.floor(Math.random() * cells.value.length)
    if (index !== safeIndex) mineSet.add(index)
  }
  mineSet.forEach((index) => { cells.value[index].mine = true })
  cells.value.forEach((cell) => {
    cell.count = neighbors(cell.id).filter((id) => cells.value[id].mine).length
  })
  placed.value = true
}

function reveal(index) {
  if (!props.active || finished.value) return
  if (!placed.value) placeMines(index)
  const cell = cells.value[index]
  if (!cell || cell.revealed || cell.flagged) return
  if (cell.mine) {
    cell.revealed = true
    cells.value.forEach((item) => { if (item.mine) item.revealed = true })
    finished.value = true
    emit('done')
    return
  }
  const queue = [index]
  while (queue.length) {
    const currentIndex = queue.shift()
    const current = cells.value[currentIndex]
    if (!current || current.revealed || current.flagged || current.mine) continue
    current.revealed = true
    score.value += 10
    if (current.count === 0) queue.push(...neighbors(currentIndex))
  }
  emit('score', score.value)
  if (score.value >= props.challenge.target) {
    finished.value = true
    emit('done')
  }
}

function click(index) {
  if (flagMode.value) {
    if (!props.active || finished.value) return
    const cell = cells.value[index]
    if (cell && !cell.revealed) {
      cell.flagged = !cell.flagged
      cells.value = [...cells.value]
    }
    return
  }
  reveal(index)
}

const revealedSafe = computed(() => cells.value.filter((cell) => cell.revealed && !cell.mine).length)

onMounted(start)
</script>

<template>
  <div class="mines-game">
    <div class="mines-top">
      <span>已翻开 {{ revealedSafe }}</span>
      <button type="button" class="mines-mode" :class="{ 'is-on': flagMode }" @click="flagMode = !flagMode">
        {{ flagMode ? '标记模式' : '翻开模式' }}
      </button>
    </div>
    <div class="mines-grid" :style="{ '--mines-cols': size }">
      <button
        v-for="cell in cells"
        :key="cell.id"
        type="button"
        class="mine-cell"
        :class="{ 'is-open': cell.revealed, 'is-mine': cell.revealed && cell.mine, 'is-flag': cell.flagged }"
        @click="click(cell.id)"
      >
        {{ cell.revealed ? (cell.mine ? '✹' : cell.count || '') : cell.flagged ? '⚑' : '' }}
      </button>
    </div>
    <p class="mini-note">翻开目标数量的安全格，别碰雷。</p>
  </div>
</template>

<style scoped>
.mines-game { width: 100%; }
.mines-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 7px; color: var(--dim); font-family: var(--mono); font-size: max(var(--ui-min), calc(8.5px * var(--ui-scale))); }
.mines-mode { padding: 3px 7px; border: 1px solid var(--line); border-radius: 5px; background: transparent; color: var(--dim); font: inherit; cursor: pointer; }
.mines-mode.is-on { border-color: rgba(255,196,107,.45); color: var(--amber); }
.mines-grid { display: grid; grid-template-columns: repeat(var(--mines-cols), 1fr); gap: 3px; width: min(100%, 280px); margin: 0 auto; }
.mine-cell { display: grid; place-items: center; aspect-ratio: 1; border: 1px solid var(--line); border-radius: 4px; background: rgba(5,10,16,.7); color: var(--muted); font-family: var(--mono); font-size: 12px; cursor: pointer; }
.mine-cell.is-open { border-color: rgba(124,231,255,.18); background: rgba(124,231,255,.06); color: var(--cyan); }
.mine-cell.is-mine { border-color: rgba(255,138,138,.5); background: rgba(255,138,138,.16); color: var(--red); }
.mine-cell.is-flag { color: var(--amber); }
.mini-note { margin-top: 8px; color: var(--dim); font-size: max(var(--ui-min), calc(8px * var(--ui-scale))); text-align: center; }
</style>
