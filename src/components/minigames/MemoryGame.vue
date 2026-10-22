<script setup>
import { computed, onMounted, ref } from 'vue'

const props = defineProps({ challenge: { type: Object, required: true }, active: { type: Boolean, default: true } })
const emit = defineEmits(['score', 'done'])
const symbols = ['✦', '◈', '⌁', '✧', '⌖', '⟡', '◇', '⊹']
const cards = ref([])
const flipped = ref([])
const matched = ref([])
const locked = ref(false)
const score = ref(0)

const pairs = computed(() => cards.value.length / 2)

function shuffle(items) {
  const copy = [...items]
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const target = Math.floor(Math.random() * (index + 1))
    ;[copy[index], copy[target]] = [copy[target], copy[index]]
  }
  return copy
}

function start() {
  const count = Math.max(6, Math.min(8, props.challenge.config?.pairs || 6))
  const deck = []
  for (let index = 0; index < count; index += 1) {
    deck.push({ id: `${index}-a`, symbol: symbols[index % symbols.length] })
    deck.push({ id: `${index}-b`, symbol: symbols[index % symbols.length] })
  }
  cards.value = shuffle(deck)
  flipped.value = []
  matched.value = []
  score.value = 0
  emit('score', 0)
}

function flip(card) {
  if (!props.active || locked.value || flipped.value.includes(card.id) || matched.value.includes(card.id)) return
  flipped.value.push(card.id)
  if (flipped.value.length < 2) return
  const [first, second] = flipped.value.map((id) => cards.value.find((item) => item.id === id))
  if (first.symbol === second.symbol) {
    matched.value.push(first.id, second.id)
    score.value += 100
    emit('score', score.value)
    flipped.value = []
    if (matched.value.length === cards.value.length) emit('done')
  } else {
    locked.value = true
    setTimeout(() => {
      flipped.value = []
      locked.value = false
    }, 520)
  }
}

function isVisible(card) {
  return flipped.value.includes(card.id) || matched.value.includes(card.id)
}

onMounted(start)
</script>

<template>
  <div class="memory-game">
    <div class="memory-grid" :style="{ '--memory-cols': pairs > 6 ? 4 : 4 }">
      <button
        v-for="card in cards"
        :key="card.id"
        type="button"
        class="memory-card"
        :class="{ 'is-open': isVisible(card), 'is-matched': matched.includes(card.id) }"
        @click="flip(card)"
      >
        {{ isVisible(card) ? card.symbol : '·' }}
      </button>
    </div>
    <p class="mini-note">找出 {{ pairs }} 对符号 · 已找到 {{ matched.length / 2 }} 对</p>
  </div>
</template>

<style scoped>
.memory-game { width: 100%; }
.memory-grid { display: grid; grid-template-columns: repeat(var(--memory-cols), 1fr); gap: 6px; width: min(100%, 280px); margin: 0 auto; }
.memory-card { display: grid; place-items: center; aspect-ratio: 1; border: 1px solid var(--line); border-radius: 8px; background: rgba(5,10,16,.7); color: var(--dim); font-size: 24px; cursor: pointer; transition: transform .14s ease, border-color .14s ease; }
.memory-card.is-open { border-color: rgba(124,231,255,.4); background: rgba(124,231,255,.09); color: var(--cyan); }
.memory-card.is-matched { border-color: rgba(255,196,107,.45); background: rgba(255,196,107,.08); color: var(--amber); transform: scale(.96); }
.mini-note { margin-top: 8px; color: var(--dim); font-size: max(var(--ui-min), calc(8px * var(--ui-scale))); text-align: center; }
</style>
