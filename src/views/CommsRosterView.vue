<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import CommsPageHeader from '../components/CommsPageHeader.vue'
import { REGIONS } from '../game-core/data.js'
import { factionName, npcList } from '../game-core/npc.js'
import { tagDefsFor } from '../game-core/npc-tags.js'
import { useGameStore } from '../stores/game.js'

const game = useGameStore()
const route = useRoute()
const router = useRouter()
const run = computed(() => game.run)
const npcs = computed(() => (run.value ? npcList(run.value) : []))
const runId = computed(() => route.params.runId)

function tagsOf(npc) {
  return tagDefsFor(npc?.tags || []).slice(0, 3)
}

function open(npc) {
  router.push({ name: 'npc', params: { runId: runId.value, npcId: npc.id } })
}
</script>

<template>
  <div v-if="run" class="run-page">
    <CommsPageHeader
      kicker="COMMS · ROSTER"
      title="名册"
      hint="每个人都有自己的标签、日程与关系网。"
    >
      <span class="tag cyan">{{ npcs.length }} 人</span>
    </CommsPageHeader>

    <section class="panel roster-panel">
      <div class="roster-grid">
        <button
          v-for="npc in npcs"
          :key="npc.id"
          type="button"
          class="roster-card"
          :class="{ 'is-dead': !npc.alive, 'is-hostile': npc.hostile }"
          @click="open(npc)"
        >
          <span class="rc-ava">{{ npc.name.slice(0, 1) }}</span>
          <span class="rc-main">
            <span class="rc-line">
              <b>{{ npc.name }}</b>
              <em>{{ npc.abo }} · {{ npc.role }}</em>
            </span>
            <span class="rc-sub">{{ factionName(npc.faction) }} · {{ REGIONS[npc.home]?.name || '未知' }}</span>
            <span class="rc-tags">
              <span v-for="tag in tagsOf(npc)" :key="tag.id" class="npc-tag" :class="`is-${tag.category}`">{{ tag.name }}</span>
            </span>
          </span>
          <span class="rc-badges">
            <span v-if="npc.party" class="tag jade">队伍</span>
            <span v-if="npc.bastionResident" class="tag violet">方舟</span>
            <span v-if="npc.hostile" class="tag red">敌对</span>
          </span>
        </button>
      </div>
    </section>
  </div>
</template>

<style scoped>
.roster-panel { padding: 10px; }
.roster-grid { display: grid; grid-template-columns: 1fr; gap: 7px; }
.roster-card { display: flex; align-items: flex-start; gap: 9px; width: 100%; padding: 9px; border: 1px solid var(--line); border-radius: 9px; background: rgba(5, 10, 16, .42); color: var(--ink); text-align: left; cursor: pointer; }
.roster-card:hover { border-color: rgba(124, 231, 255, .3); }
.roster-card.is-dead { opacity: .45; }
.roster-card.is-hostile { border-color: rgba(255, 138, 138, .28); }
.rc-ava { display: grid; place-items: center; width: 34px; height: 34px; flex: none; border: 1px solid rgba(124, 231, 255, .28); border-radius: 50%; color: var(--cyan); }
.rc-main { flex: 1; min-width: 0; }
.rc-line { display: flex; align-items: baseline; gap: 6px; }
.rc-line b { font-size: max(var(--ui-min), calc(12px * var(--ui-scale))); font-weight: 500; }
.rc-line em { overflow: hidden; color: var(--dim); font-family: var(--mono); font-size: max(var(--ui-min), calc(7.5px * var(--ui-scale))); font-style: normal; text-overflow: ellipsis; white-space: nowrap; }
.rc-sub { display: block; margin-top: 2px; color: var(--muted); font-size: max(var(--ui-min), calc(8.5px * var(--ui-scale))); }
.rc-tags { display: flex; flex-wrap: wrap; gap: 3px; margin-top: 4px; }
.rc-badges { display: flex; flex-direction: column; align-items: flex-end; gap: 3px; }
@media (min-width: 560px) {
  .roster-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
</style>
