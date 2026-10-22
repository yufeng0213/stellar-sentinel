<script setup>
import { computed, onMounted, ref } from 'vue'

const props = defineProps({ challenge: { type: Object, required: true }, active: { type: Boolean, default: true } })
const emit = defineEmits(['score', 'done'])
const size = computed(() => Math.max(4, Math.min(6, props.challenge.config?.size || 5)))
const cells = ref([])
const score = ref(0)
const solved = ref(false)

const N = 1
const E = 2
const S = 4
const W = 8
const OPPOSITE = { [N]: S, [E]: W, [S]: N, [W]: E }
const DELTA = { [N]: [0, -1], [E]: [1, 0], [S]: [0, 1], [W]: [-1, 0] }

function idx(x, y) {
  return y * size.value + x
}

function rotateMask(mask, turn) {
  let result = mask
  for (let index = 0; index < turn % 4; index += 1) {
    result = ((result << 1) | (result >> 3)) & 15
  }
  return result
}

function makeMasks() {
  const masks = Array.from({ length: size.value * size.value }, () => 0)
  let x = 0
  let y = 0
  while (x < size.value - 1 || y < size.value - 1) {
    const choices = []
    if (x < size.value - 1) choices.push([1, 0, E, W])
    if (y < size.value - 1) choices.push([0, 1, S, N])
    const [dx, dy, out, back] = choices[Math.floor(Math.random() * choices.length)]
    const from = idx(x, y)
    const to = idx(x + dx, y + dy)
    masks[from] |= out
    masks[to] |= back
    x += dx
    y += dy
  }
  for (let index = 0; index < masks.length; index += 1) {
    if (masks[index]) continue
    masks[index] = 1 << Math.floor(Math.random() * 4)
  }
  return masks
}

function start() {
  const masks = makeMasks()
  cells.value = masks.map((mask, index) => ({
    id: index,
    mask,
    turn: Math.floor(Math.random() * 4),
    fixed: index === 0 || index === masks.length - 1,
  }))
  score.value = 0
  solved.value = false
  emit('score', 0)
  if (connected()) {
    cells.value[1] && (cells.value[1].turn = (cells.value[1].turn + 1) % 4)
  }
}

function rotate(index) {
  if (!props.active || solved.value) return
  const cell = cells.value[index]
  if (!cell || cell.fixed) return
  cell.turn = (cell.turn + 1) % 4
  cells.value[index] = { ...cell }
  if (connected()) {
    solved.value = true
    score.value = 1000
    emit('score', 1000)
    emit('done')
  }
}

function connected() {
  const visited = new Set([0])
  const queue = [0]
  while (queue.length) {
    const currentIndex = queue.shift()
    const cell = cells.value[currentIndex]
    const mask = rotateMask(cell.mask, cell.turn)
    const x = currentIndex % size.value
    const y = Math.floor(currentIndex / size.value)
    for (const dir of [N, E, S, W]) {
      if (!(mask & dir)) continue
      const [dx, dy] = DELTA[dir]
      const nx = x + dx
      const ny = y + dy
      if (nx < 0 || nx >= size.value || ny < 0 || ny >= size.value) continue
      const next = idx(nx, ny)
      if (visited.has(next)) continue
      const nextMask = rotateMask(cells.value[next].mask, cells.value[next].turn)
      if (!(nextMask & OPPOSITE[dir])) continue
      visited.add(next)
      queue.push(next)
    }
  }
  return visited.has(cells.value.length - 1)
}

function glyph(cell) {
  const mask = rotateMask(cell.mask, cell.turn)
  const count = [N, E, S, W].filter((dir) => mask & dir).length
  if (count === 4) return '╋'
  if (count === 3) return (mask & E) && (mask & S) && (mask & W) ? '┫' : (mask & W) && (mask & S) && (mask & N) ? '┣' : (mask & N) && (mask & E) && (mask & W) ? '┻' : '┳'
  if (count === 2) {
    if ((mask & N) && (mask & S)) return '┃'
    if ((mask & E) && (mask & W)) return '━'
    if ((mask & N) && (mask & E)) return '┗'
    if ((mask & N) && (mask & W)) return '┛'
    if ((mask & S) && (mask & E)) return '┏'
    return '┓'
  }
  return '┃'
}

onMounted(start)
</script>

<template>
  <div class="pipe-game">
    <div class="pipe-grid" :style="{ '--pipe-cols': size }">
      <button
        v-for="cell in cells"
        :key="cell.id"
        type="button"
        class="pipe-cell"
        :class="{ 'is-end': cell.fixed }"
        @click="rotate(cell.id)"
      >
        {{ glyph(cell) }}
      </button>
    </div>
    <p class="mini-note">旋转管道，把左上角的信号接到右下角。</p>
  </div>
</template>

<style scoped>
.pipe-game { width: 100%; }
.pipe-grid { display: grid; grid-template-columns: repeat(var(--pipe-cols), 1fr); gap: 4px; width: min(100%, 280px); margin: 10px auto; }
.pipe-cell { display: grid; place-items: center; aspect-ratio: 1; border: 1px solid var(--line); border-radius: 5px; background: rgba(5,10,16,.75); color: var(--cyan); font-size: 25px; line-height: 1; cursor: pointer; }
.pipe-cell.is-end { border-color: rgba(255,196,107,.45); color: var(--amber); background: rgba(255,196,107,.06); }
.pipe-cell:hover { border-color: rgba(124,231,255,.45); }
.mini-note { margin-top: 5px; color: var(--dim); font-size: max(var(--ui-min), calc(8px * var(--ui-scale))); text-align: center; }
</style>
