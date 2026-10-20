<script setup>
import { computed, ref } from 'vue'
import { ITEMS } from '../game-core/data.js'
import { useNpcPage } from '../composables/useNpcPage.js'

const { game, run, npc, backNpc } = useNpcPage()
const reply = ref('')

const giftItems = computed(() => {
  if (!run.value) return []
  return Object.keys(run.value.inv)
    .filter((key) => ITEMS[key] && run.value.inv[key] > 0)
    .map((key) => ({ key, ...ITEMS[key], count: run.value.inv[key] }))
    .sort((a, b) => b.count - a.count)
})

function give(itemId) {
  if (!npc.value) return
  const result = game.giftNpc(npc.value.id, itemId)
  reply.value = result.reply || result.message || ''
  if (result.ok) game.notify(result.gain > 0 ? `好感变化 +${result.gain}` : '他没什么反应', result.gain > 0 ? 'good' : '')
}
</script>

<template>
  <div v-if="npc" class="run-page gift-page">
    <section class="panel page-head">
      <RouterLink :to="backNpc" class="back-link">← {{ npc.name }}</RouterLink>
      <p class="kicker">GIFT · EXCHANGE</p>
      <h2>赠送</h2>
      <p class="hint">兴趣匹配的物品效果更好。重复赠送会饱和，别把同一个东西塞满他的背包。</p>
    </section>

    <section class="panel gift-block">
      <div class="gift-meta">
        <span class="tag cyan">信任 {{ npc.relation.trust }}</span>
        <span class="tag jade">亲近 {{ npc.relation.closeness }}</span>
        <span class="tag">兴趣：{{ npc.interests.join(' / ') }}</span>
      </div>
      <div v-if="giftItems.length" class="gift-grid">
        <button v-for="item in giftItems" :key="item.key" type="button" class="gift" @click="give(item.key)">
          <span class="i-glyph">{{ item.glyph }}</span>
          <span>{{ item.name }} ×{{ item.count }}</span>
        </button>
      </div>
      <p v-else class="empty">背包里没有可以送的东西。</p>
      <p v-if="reply" class="reply">{{ reply }}</p>
    </section>
  </div>
</template>

<style scoped>
.gift-page { gap: 12px; }
.page-head { padding: 16px; }
.back-link { display: inline-flex; margin-bottom: 10px; color: var(--dim); font-family: var(--mono); font-size: max(var(--ui-min), calc(9px * var(--ui-scale))); }
.page-head h2 { margin-top: 4px; font-size: max(var(--ui-min), calc(26px * var(--ui-scale))); font-weight: 300; letter-spacing: .08em; }
.gift-block { padding: 16px; }
.gift-meta { display: flex; flex-wrap: wrap; gap: 5px; margin-bottom: 12px; }
.gift-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 7px; }
.gift { display: flex; align-items: center; gap: 8px; padding: 9px 10px; border: 1px solid var(--line); border-radius: 9px; background: rgba(5, 10, 16, .42); color: var(--ink); font-size: max(var(--ui-min), calc(10px * var(--ui-scale))); text-align: left; cursor: pointer; }
.gift:hover { border-color: var(--line-2); }
.i-glyph { display: grid; place-items: center; width: 26px; height: 26px; flex: none; border: 1px solid rgba(124, 231, 255, .2); border-radius: 6px; color: var(--cyan); }
.reply { margin-top: 12px; padding: 9px 11px; border-left: 2px solid rgba(124, 231, 255, .3); background: rgba(124, 231, 255, .04); color: var(--muted); font-size: max(var(--ui-min), calc(10px * var(--ui-scale))); line-height: 1.7; }
.empty { padding: 18px; color: var(--dim); font-size: max(var(--ui-min), calc(10px * var(--ui-scale))); text-align: center; }
</style>
