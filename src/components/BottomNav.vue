<script setup>
import { computed } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { unreadCount } from '../game-core/npc-contact.js'
import { useGameStore } from '../stores/game.js'

const route = useRoute()
const game = useGameStore()
const runId = route.params.runId
const unread = computed(() => (game.run ? unreadCount(game.run) : 0))

const items = [
  { key: 'map', label: '星图' },
  { key: 'inventory', label: '背包' },
  { key: 'forge', label: '锻造' },
  { key: 'comms', label: '通讯' },
  { key: 'character', label: '角色' },
]

const commsRoutes = [
  'comms', 'comms-messages', 'comms-inbox', 'comms-social', 'comms-forum', 'comms-forum-post',
  'comms-roster', 'comms-network', 'comms-events', 'comms-section',
  'npc', 'npc-lore', 'npc-memory', 'npc-gift', 'npc-chat', 'npc-story', 'npc-network', 'npc-trade',
]

function isOn(key) {
  if (key === 'comms') return commsRoutes.includes(route.name)
  return route.name === key
}
</script>

<template>
  <nav class="bottom-nav" aria-label="主导航">
    <RouterLink
      v-for="item in items"
      :key="item.key"
      :to="{ name: item.key, params: { runId } }"
      :class="{ 'is-on': isOn(item.key) }"
      :aria-label="item.label"
    >
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <template v-if="item.key === 'map'">
          <circle cx="10" cy="10" r="7.2" />
          <path d="M13.2 6.8l-1.9 4.5-4.5 1.9 1.9-4.5z" />
        </template>
        <template v-else-if="item.key === 'inventory'">
          <path d="M3.5 7.2h13l.9 9.3H2.6z" />
          <path d="M7.2 7.2V5.4a2.8 2.8 0 015.6 0v1.8" />
        </template>
        <template v-else-if="item.key === 'forge'">
          <path d="M3 17l6.4-6.4" />
          <path d="M6.2 4.6l9.2 9.2-2.4 2.4-9.2-9.2z" />
          <path d="M14.5 3.2l2.3 2.3" />
        </template>
        <template v-else-if="item.key === 'comms'">
          <path d="M3.2 4.8h13.6v9H8.4l-3.8 2.6v-2.6H3.2z" />
          <path d="M6.8 8.4h6.4" />
        </template>
        <template v-else>
          <circle cx="10" cy="6.8" r="3" />
          <path d="M4.2 17c.9-3.1 3-4.4 5.8-4.4s4.9 1.3 5.8 4.4" />
        </template>
      </svg>
      <span>{{ item.label }}</span>
      <span v-if="item.key === 'comms' && unread" class="nav-unread">{{ unread > 9 ? '9+' : unread }}</span>
    </RouterLink>
  </nav>
</template>

<style scoped>
.bottom-nav a { position: relative; }
.nav-unread {
  position: absolute;
  top: 2px;
  right: 12px;
  display: grid;
  place-items: center;
  min-width: 15px;
  height: 15px;
  padding: 0 4px;
  border-radius: 8px;
  background: var(--red);
  color: #090b0f;
  font-family: var(--mono);
  font-size: 8px;
  font-weight: 700;
}
</style>
