<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import CommsPageHeader from '../components/CommsPageHeader.vue'
import { useGameStore } from '../stores/game.js'

const game = useGameStore()
const route = useRoute()
const router = useRouter()
const run = computed(() => game.run)
const runId = computed(() => route.params.runId)
const edges = computed(() => {
  if (!run.value) return []
  return [...(run.value.npcEdges || [])]
    .filter((edge) => run.value.npcs[edge.a] && run.value.npcs[edge.b])
    .sort((left, right) => (right.trust || 0) - (left.trust || 0))
})

function name(id) {
  return run.value?.npcs?.[id]?.name || '某人'
}

function open(edge) {
  const npc = run.value?.npcs?.[edge.a]
  if (npc) router.push({ name: 'npc', params: { runId: runId.value, npcId: npc.id } })
}
</script>

<template>
  <div v-if="run" class="run-page">
    <CommsPageHeader
      kicker="COMMS · NETWORK"
      title="关系网"
      hint="NPC 之间的关系会随每日行动漂移。"
    >
      <span class="tag cyan">{{ edges.length }} 条关系</span>
    </CommsPageHeader>

    <section class="panel network-panel">
      <div v-if="edges.length" class="edge-list">
        <button
          v-for="edge in edges"
          :key="`${edge.a}-${edge.b}`"
          type="button"
          class="edge-row"
          :class="{ 'is-rival': (edge.rivalry || 0) >= 50 }"
          @click="open(edge)"
        >
          <span class="edge-people">
            <b>{{ name(edge.a) }}</b>
            <i>↔</i>
            <b>{{ name(edge.b) }}</b>
          </span>
          <span class="edge-meta">
            <span>{{ edge.kind || '熟人' }}</span>
            <span>信任 {{ edge.trust || 0 }}</span>
            <span v-if="edge.rivalry">竞争 {{ edge.rivalry }}</span>
          </span>
        </button>
      </div>
      <p v-else class="empty">还没有登记的关系。</p>
    </section>
  </div>
</template>

<style scoped>
.network-panel { padding: 10px; }
.edge-list { display: flex; flex-direction: column; gap: 6px; }
.edge-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; width: 100%; padding: 9px 10px; border: 1px solid var(--line); border-radius: 8px; background: rgba(5, 10, 16, .42); color: var(--ink); text-align: left; cursor: pointer; }
.edge-row:hover { border-color: rgba(124, 231, 255, .3); }
.edge-row.is-rival { border-color: rgba(255, 138, 138, .24); }
.edge-people { display: flex; align-items: baseline; gap: 6px; min-width: 0; }
.edge-people b { font-size: max(var(--ui-min), calc(10.5px * var(--ui-scale))); font-weight: 500; }
.edge-people i { color: var(--dim); font-style: normal; }
.edge-meta { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 4px 8px; color: var(--dim); font-family: var(--mono); font-size: max(var(--ui-min), calc(8px * var(--ui-scale))); }
.empty { padding: 26px; color: var(--dim); text-align: center; }
</style>
