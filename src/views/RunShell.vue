<script setup>
import { computed, ref } from 'vue'
import { RouterView, useRoute, useRouter } from 'vue-router'
import { useGameStore } from '../stores/game.js'
import BottomNav from '../components/BottomNav.vue'
import SoundToggle from '../components/SoundToggle.vue'

const game = useGameStore()
const router = useRouter()
const route = useRoute()
const savedFlash = ref(false)

const run = computed(() => game.run)
const isBattle = computed(() => route.name === 'battle')
const isStory = computed(() => route.name === 'story')
const isDate = computed(() => route.name === 'date')
const pips = computed(() => {
  if (!game.run) return []
  return Array.from({ length: game.run.apMax }, (_, index) => ({
    on: index < game.run.ap,
    low: game.run.ap <= 2,
  }))
})

function saveNow() {
  game.save()
  savedFlash.value = true
  setTimeout(() => { savedFlash.value = false }, 1500)
  game.notify('已存档', 'good')
}

function exitRun() {
  game.save()
  router.push('/')
}
</script>

<template>
  <div class="app-shell">
    <header v-if="!isBattle && !isDate" class="hud">
      <div class="brand">
        <span class="sigil" aria-hidden="true"><i></i></span>
        <div class="brand-text">
          <b>星穹哨向</b>
          <small>STELLAR SENTINEL</small>
        </div>
      </div>

      <div v-if="run" class="hud-stats">
        <div class="hud-stat">
          <span>星历</span>
          <b>D{{ run.day }} · {{ game.time }}</b>
        </div>
        <div class="hud-stat">
          <span>行动点</span>
          <b><span class="ap-pips"><i v-for="(pip, index) in pips" :key="index" :class="{ on: pip.on, low: pip.low }"></i></span></b>
        </div>
        <div class="hud-stat">
          <span>信用点</span>
          <b><em>{{ run.player.credits }}</em></b>
        </div>
      </div>

      <div class="hud-actions">
        <span class="save-hint" :class="{ flash: savedFlash }">{{ savedFlash ? '已保存' : '自动存档' }}</span>
        <SoundToggle />
        <button type="button" class="icon-btn" title="存档" @click="saveNow">
          <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
            <path d="M4 3h9l3 3v11H4z"/><path d="M7 3v5h6V3"/><path d="M7 13h6"/>
          </svg>
        </button>
        <button type="button" class="icon-btn" title="回到标题" @click="exitRun">
          <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
            <path d="M8 4H4v12h4"/><path d="M12 6l4 4-4 4"/><path d="M16 10H8"/>
          </svg>
        </button>
      </div>
    </header>

    <main class="run-main" :class="{ 'is-battle': isBattle }">
      <RouterView v-if="run" />
      <div v-else class="missing">正在载入远征…</div>
    </main>

    <BottomNav v-if="run && !isBattle && !isStory && !isDate" />
  </div>
</template>

<style scoped>
.missing {
  align-self: center;
  color: var(--dim);
  font-family: var(--mono);
  font-size: max(var(--ui-min), calc(11px * var(--ui-scale)));
}
</style>
