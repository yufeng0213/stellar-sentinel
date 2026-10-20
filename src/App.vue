<script setup>
import { RouterView } from 'vue-router'
import { useGameStore } from './stores/game.js'

const game = useGameStore()
game.checkHealth()
</script>

<template>
  <RouterView />

  <div class="toasts">
    <Transition name="toast">
      <div v-if="game.toast" :key="game.toast.id" class="toast" :class="game.toast.kind">
        {{ game.toast.message }}
      </div>
    </Transition>
  </div>
</template>
