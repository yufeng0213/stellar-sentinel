<script setup>
import { ref } from 'vue'
import { isSoundOn, play, toggleSound } from '../audio.js'

const on = ref(isSoundOn())

function toggle() {
  if (on.value) play('tap')
  on.value = toggleSound()
  if (on.value) play('tap')
}
</script>

<template>
  <button
    type="button"
    class="icon-btn sound-toggle"
    :class="{ 'is-off': !on }"
    :title="on ? '关闭音效' : '打开音效'"
    :aria-label="on ? '关闭音效' : '打开音效'"
    data-sound="none"
    @click="toggle"
  >
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
      <path d="M4 8h3l4-3v10l-4-3H4z" />
      <path v-if="on" d="M13.5 7.5c1 1 1 4 0 5M16 5.5c2.2 2.2 2.2 6.8 0 9" />
      <path v-else d="M3.5 3.5l13 13" />
    </svg>
  </button>
</template>

<style scoped>
.sound-toggle { flex: none; }
.sound-toggle.is-off { color: var(--dim); opacity: .62; }
</style>
