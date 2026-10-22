import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { tagDefsFor } from '../game-core/npc-tags.js'
import { useGameStore } from '../stores/game.js'

export function useNpcPage() {
  const game = useGameStore()
  const route = useRoute()

  const run = computed(() => game.run)
  const runId = computed(() => String(route.params.runId || ''))
  const npcId = computed(() => String(route.params.npcId || ''))
  const npc = computed(() => run.value?.npcs?.[npcId.value] || null)
  const tags = computed(() => tagDefsFor(npc.value?.tags || []))

  const backComms = computed(() => ({
    name: 'comms-roster',
    params: { runId: runId.value },
  }))
  const backNpc = computed(() => ({
    name: 'npc',
    params: { runId: runId.value, npcId: npcId.value },
  }))

  const axisPercent = (value) => Math.max(0, Math.min(100, Number(value) || 0))

  return {
    game,
    route,
    run,
    runId,
    npcId,
    npc,
    tags,
    backComms,
    backNpc,
    axisPercent,
  }
}
