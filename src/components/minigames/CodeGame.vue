<script setup>
import { computed, onMounted, ref } from 'vue'

const props = defineProps({ challenge: { type: Object, required: true }, active: { type: Boolean, default: true } })
const emit = defineEmits(['score', 'done'])
const colors = ['cyan', 'amber', 'violet', 'jade']
const labels = { cyan: '青', amber: '琥珀', violet: '紫', jade: '玉' }
const secret = ref([])
const current = ref([])
const history = ref([])
const attempts = ref(0)
const solved = ref(false)
const maxAttempts = computed(() => props.challenge.config?.attempts || 6)
const score = ref(0)

function start() {
  secret.value = Array.from({ length: 4 }, () => colors[Math.floor(Math.random() * colors.length)])
  current.value = []
  history.value = []
  attempts.value = 0
  solved.value = false
  score.value = 0
  emit('score', 0)
}

function addColor(color) {
  if (!props.active || solved.value || current.value.length >= 4) return
  current.value.push(color)
}

function backspace() {
  if (!props.active || solved.value) return
  current.value.pop()
}

function submit() {
  if (!props.active || solved.value || current.value.length !== 4) return
  const guess = [...current.value]
  let exact = 0
  let partial = 0
  const secretLeft = []
  const guessLeft = []
  guess.forEach((color, index) => {
    if (color === secret.value[index]) exact += 1
    else {
      secretLeft.push(secret.value[index])
      guessLeft.push(color)
    }
  })
  guessLeft.forEach((color) => {
    const index = secretLeft.indexOf(color)
    if (index >= 0) {
      partial += 1
      secretLeft.splice(index, 1)
    }
  })
  history.value.push({ guess, exact, partial })
  attempts.value += 1
  current.value = []
  if (exact === 4) {
    solved.value = true
    score.value = 1000
    emit('score', 1000)
    emit('done')
  } else if (attempts.value >= maxAttempts.value) {
    emit('done')
  }
}

onMounted(start)
</script>

<template>
  <div class="code-game">
    <div class="code-slots">
      <span v-for="(color, index) in current" :key="index" class="code-slot" :class="`is-${color}`">{{ labels[color] }}</span>
      <span v-for="index in 4 - current.length" :key="`empty-${index}`" class="code-slot is-empty">?</span>
    </div>
    <div class="code-palette">
      <button v-for="color in colors" :key="color" type="button" class="code-color" :class="`is-${color}`" @click="addColor(color)">
        {{ labels[color] }}
      </button>
      <button type="button" class="code-back" @click="backspace">删除</button>
      <button type="button" class="code-submit" @click="submit">提交</button>
    </div>
    <div class="code-history">
      <div v-for="(row, index) in history" :key="index" class="code-row">
        <span class="code-row-colors">
          <i v-for="color in row.guess" :key="color + index" :class="`is-${color}`" />
        </span>
        <span>位置 {{ row.exact }} · 颜色 {{ row.partial }}</span>
      </div>
    </div>
    <p class="mini-note">猜出 4 位颜色密码，共 {{ maxAttempts }} 次机会。</p>
  </div>
</template>

<style scoped>
.code-game { width: 100%; }
.code-slots { display: flex; justify-content: center; gap: 6px; margin: 8px 0 10px; }
.code-slot { display: grid; place-items: center; width: 42px; height: 42px; border: 1px solid var(--line); border-radius: 7px; background: rgba(5,10,16,.7); color: var(--ink); font-family: var(--mono); }
.code-slot.is-empty { color: var(--dim); }
.code-slot.is-cyan, .code-color.is-cyan, .code-row-colors i.is-cyan { background: var(--cyan); color: #071018; }
.code-slot.is-amber, .code-color.is-amber, .code-row-colors i.is-amber { background: var(--amber); color: #171008; }
.code-slot.is-violet, .code-color.is-violet, .code-row-colors i.is-violet { background: var(--violet); color: #100b18; }
.code-slot.is-jade, .code-color.is-jade, .code-row-colors i.is-jade { background: var(--jade); color: #06130f; }
.code-palette { display: grid; grid-template-columns: repeat(6, 1fr); gap: 4px; }
.code-color, .code-back, .code-submit { height: 30px; border: 1px solid var(--line); border-radius: 6px; background: rgba(5,10,16,.6); color: var(--ink); font-size: max(var(--ui-min), calc(8px * var(--ui-scale))); cursor: pointer; }
.code-submit { border-color: rgba(255,196,107,.45); color: var(--amber); }
.code-history { display: flex; flex-direction: column; gap: 4px; min-height: 45px; margin-top: 8px; }
.code-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 3px 5px; border-bottom: 1px solid var(--line); color: var(--dim); font-family: var(--mono); font-size: max(var(--ui-min), calc(8px * var(--ui-scale))); }
.code-row-colors { display: flex; gap: 3px; }
.code-row-colors i { width: 12px; height: 12px; border-radius: 3px; }
.mini-note { margin-top: 6px; color: var(--dim); font-size: max(var(--ui-min), calc(8px * var(--ui-scale))); text-align: center; }
</style>
