<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

const props = defineProps({ challenge: { type: Object, required: true }, active: { type: Boolean, default: true } })
const emit = defineEmits(['score', 'done'])
const position = ref(0)
const direction = ref(1)
const zone = ref(46)
const width = ref(12)
const score = ref(0)
const waves = ref(0)
const totalWaves = computed(() => props.challenge.config?.waves || 5)
const hit = ref('')
let timer = null

function randomZone() {
  zone.value = 12 + Math.random() * 70
  width.value = 8 + Math.random() * 10
}

function tick() {
  if (!props.active) return
  position.value += direction.value * 2.6
  if (position.value >= 100) {
    position.value = 100
    direction.value = -1
  } else if (position.value <= 0) {
    position.value = 0
    direction.value = 1
  }
}

function lock() {
  if (!props.active || waves.value >= totalWaves.value) return
  const distance = Math.abs(position.value - zone.value)
  if (distance <= width.value / 2) {
    score.value += 100
    hit.value = '锁定成功 +100'
  } else if (distance <= width.value) {
    score.value += 40
    hit.value = '边缘命中 +40'
  } else {
    hit.value = '没有命中'
  }
  waves.value += 1
  emit('score', score.value)
  if (waves.value >= totalWaves.value) {
    emit('done')
    return
  }
  randomZone()
}

function onKey(event) {
  if (event.key === ' ' || event.key === 'Enter') {
    event.preventDefault()
    lock()
  }
}

onMounted(() => {
  randomZone()
  timer = setInterval(tick, 30)
  window.addEventListener('keydown', onKey)
})
onBeforeUnmount(() => {
  if (timer) clearInterval(timer)
  window.removeEventListener('keydown', onKey)
})
</script>

<template>
  <div class="freq-game">
    <div class="freq-bar">
      <span class="freq-zone" :style="{ left: `${zone - width / 2}%`, width: `${width}%` }" />
      <span class="freq-mark" :style="{ left: `${position}%` }" />
    </div>
    <div class="freq-actions">
      <button type="button" class="freq-lock" :disabled="!active" @click="lock">锁定</button>
      <span>{{ waves }} / {{ totalWaves }}</span>
    </div>
    <p class="freq-hit">{{ hit }}</p>
    <p class="mini-note">在绿区按下锁定，命中 5 次中的目标次数。</p>
  </div>
</template>

<style scoped>
.freq-game { width: 100%; }
.freq-bar { position: relative; height: 44px; margin: 18px 0 12px; border: 1px solid var(--line); border-radius: 8px; background: linear-gradient(90deg, rgba(124,231,255,.04), rgba(255,196,107,.05)); overflow: hidden; }
.freq-zone { position: absolute; top: 0; bottom: 0; background: rgba(124,231,255,.2); border-left: 1px solid rgba(124,231,255,.5); border-right: 1px solid rgba(124,231,255,.5); }
.freq-mark { position: absolute; top: -4px; bottom: -4px; width: 3px; margin-left: -1px; background: var(--amber); box-shadow: 0 0 10px rgba(255,196,107,.7); }
.freq-actions { display: flex; align-items: center; justify-content: center; gap: 12px; color: var(--dim); font-family: var(--mono); font-size: max(var(--ui-min), calc(9px * var(--ui-scale))); }
.freq-lock { height: 34px; padding: 0 20px; border: 1px solid rgba(255,196,107,.45); border-radius: 7px; background: rgba(255,196,107,.08); color: var(--amber); cursor: pointer; }
.freq-hit { min-height: 18px; margin-top: 8px; color: var(--cyan); font-family: var(--mono); font-size: max(var(--ui-min), calc(8.5px * var(--ui-scale))); text-align: center; }
.mini-note { margin-top: 5px; color: var(--dim); font-size: max(var(--ui-min), calc(8px * var(--ui-scale))); text-align: center; }
</style>
