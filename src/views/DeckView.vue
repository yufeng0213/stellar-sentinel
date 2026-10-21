<script setup>

import { computed } from 'vue'
import {
  CARD_TYPES,
  DECK_REMOVE_COST,
  DECK_UPGRADE_COST,
  deckEntries,
} from '../game-core/combat.js'
import { useGameStore } from '../stores/game.js'

const game = useGameStore()
const run = computed(() => game.run)
const entries = computed(() => (run.value ? deckEntries(run.value) : []))
const deckSize = computed(() => run.value?.deck?.length || 0)
const totalCost = computed(() => entries.value.reduce((sum, entry) => sum + entry.card.cost * entry.count, 0))

function upgrade(entry) {
  if (entry.upgradableIndex === undefined) return
  const result = game.upgradeDeckCard(entry.upgradableIndex)
  if (result.ok) game.notify(`${result.name} 升级完成`, 'good')
}

function remove(entry) {
  const result = game.removeDeckCard(entry.removeIndex)
  if (result.ok) game.notify(`${result.name} 已从牌组移除`, 'good')
}

function upgradeText(entry) {
  if (entry.upgradableIndex === undefined) return '全部已升级'
  return `${DECK_UPGRADE_COST.credits} 信用点 / ${DECK_UPGRADE_COST.scrap} 废料`
}

</script>

<template>
  <div v-if="run" class="run-page deck-page">
    <section class="panel deck-head">
      <div>
        <p class="kicker">DECK · CONSTRUCTION</p>
        <h1>牌组</h1>
        <p class="hint">战斗胜利后可以选牌；在这里升级或删除卡牌，控制牌组厚度和费用。</p>
      </div>
      <div class="deck-stats">
        <span><b>{{ deckSize }}</b> 张</span>
        <span><b>{{ totalCost }}</b> 总费用</span>
        <span><b>{{ run.player.credits }}</b> 信用点</span>
        <span><b>{{ run.inv.scrap || 0 }}</b> 废料</span>
      </div>
    </section>

    <section class="panel deck-list">
      <article v-for="entry in entries" :key="entry.baseKey" class="deck-row">
        <div class="deck-main">
          <div class="deck-title">
            <b>{{ entry.card.name }}</b>
            <span class="deck-cost">{{ entry.card.cost }}</span>
            <span class="tag">{{ CARD_TYPES[entry.card.type] }}</span>
            <span v-if="entry.count > 1" class="deck-count">×{{ entry.count }}</span>
            <span v-if="entry.upgradedCount" class="tag jade">已升级 {{ entry.upgradedCount }}</span>
          </div>
          <p>{{ entry.card.desc }}</p>
        </div>
        <div class="deck-actions">
          <button type="button" class="btn btn-sm" :disabled="entry.upgradableIndex === undefined || run.player.credits < DECK_UPGRADE_COST.credits || (run.inv.scrap || 0) < DECK_UPGRADE_COST.scrap" @click="upgrade(entry)">
            升级 · {{ upgradeText(entry) }}
          </button>
          <button type="button" class="btn btn-sm" :disabled="deckSize <= 5 || run.player.credits < DECK_REMOVE_COST.credits" @click="remove(entry)">
            删除 · {{ DECK_REMOVE_COST.credits }}
          </button>
        </div>
      </article>
    </section>

    <p class="hint deck-foot">升级一张牌只影响当前这一份。删除会永久移出本局牌组；至少保留 5 张。</p>
  </div>
</template>

<style scoped>

.deck-page { display: flex; flex-direction: column; gap: 12px; }
.deck-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; padding: 16px; }
.deck-head h1 { margin-top: 4px; font-size: max(var(--ui-min), calc(25px * var(--ui-scale))); font-weight: 300; letter-spacing: .08em; }
.deck-stats { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 6px; }
.deck-stats span { padding: 5px 8px; border: 1px solid var(--line); border-radius: 7px; color: var(--dim); font-family: var(--mono); font-size: max(var(--ui-min), calc(8.5px * var(--ui-scale))); }
.deck-stats b { color: var(--cyan); font-weight: 400; }
.deck-list { padding: 12px; }
.deck-row { display: flex; align-items: center; justify-content: space-between; gap: 14px; padding: 10px 8px; border-bottom: 1px solid var(--line); }
.deck-row:last-child { border-bottom: 0; }
.deck-main { min-width: 0; }
.deck-title { display: flex; align-items: center; flex-wrap: wrap; gap: 5px; }
.deck-title b { font-size: max(var(--ui-min), calc(12px * var(--ui-scale))); font-weight: 500; }
.deck-cost { display: grid; place-items: center; width: 18px; height: 18px; border: 1px solid rgba(124, 231, 255, .3); border-radius: 50%; color: var(--cyan); font-family: var(--mono); font-size: max(var(--ui-min), calc(8px * var(--ui-scale))); }
.deck-count { color: var(--violet); font-family: var(--mono); font-size: max(var(--ui-min), calc(9px * var(--ui-scale))); }
.deck-main p { margin-top: 4px; color: var(--muted); font-size: max(var(--ui-min), calc(9.5px * var(--ui-scale))); line-height: 1.55; }
.deck-actions { display: flex; flex: none; flex-direction: column; gap: 4px; }
.deck-foot { padding: 0 4px 18px; }
@media (max-width: 700px) {
  .deck-head { flex-direction: column; }
  .deck-stats { justify-content: flex-start; }
  .deck-row { align-items: flex-start; flex-direction: column; }
  .deck-actions { width: 100%; flex-direction: row; }
  .deck-actions .btn { flex: 1; }
}
</style>
