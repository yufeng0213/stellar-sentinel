<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const props = defineProps({
  kicker: { type: String, default: 'COMMS' },
  title: { type: String, required: true },
  hint: { type: String, default: '' },
  backTo: { type: String, default: 'comms' },
  backLabel: { type: String, default: '通讯' },
})
const route = useRoute()
const router = useRouter()
const runId = computed(() => route.params.runId)

function back() {
  router.push({ name: props.backTo, params: { runId: runId.value } })
}
</script>

<template>
  <header class="comms-page-head">
    <button type="button" class="comms-back" @click="back">← {{ backLabel }}</button>
    <div class="comms-page-title">
      <p class="kicker">{{ kicker }}</p>
      <h2>{{ title }}</h2>
      <p v-if="hint" class="hint">{{ hint }}</p>
    </div>
    <slot />
  </header>
</template>

<style scoped>
.comms-page-head { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; align-items: start; gap: 10px; padding: 10px 2px 11px; }
.comms-back { align-self: start; padding: 0; border: 0; background: transparent; color: var(--dim); font-family: var(--mono); font-size: max(var(--ui-min), calc(9px * var(--ui-scale))); cursor: pointer; white-space: nowrap; }
.comms-back:hover { color: var(--cyan); }
.comms-page-title h2 { margin-top: 2px; font-size: max(var(--ui-min), calc(21px * var(--ui-scale))); font-weight: 400; letter-spacing: .06em; }
.comms-page-title .hint { margin-top: 3px; max-width: 34ch; }
@media (max-width: 480px) {
  .comms-page-head { gap: 7px; padding-top: 8px; }
  .comms-page-title h2 { font-size: max(var(--ui-min), calc(19px * var(--ui-scale))); }
}
</style>
