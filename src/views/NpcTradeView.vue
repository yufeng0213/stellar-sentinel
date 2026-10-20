<script setup>
import { computed, onMounted, ref } from 'vue'
import { ITEMS } from '../game-core/data.js'
import { ensureNpcWanted, npcTradeOffers } from '../game-core/npc.js'
import { useNpcPage } from '../composables/useNpcPage.js'

const { game, run, npc, backNpc } = useNpcPage()
const reply = ref('')
const offers = computed(() => (run.value && npc.value ? npcTradeOffers(run.value, npc.value.id) : []))
const wanted = computed(() => (npc.value?.wanted?.status === 'open' ? npc.value.wanted : null))

onMounted(() => {
  if (run.value && npc.value) ensureNpcWanted(run.value, npc.value)
})
const sellItems = computed(() => {
  if (!run.value) return []
  return Object.keys(run.value.inv || {})
    .filter((key) => ITEMS[key] && run.value.inv[key] > 0)
    .map((key) => ({
      key,
      ...ITEMS[key],
      count: run.value.inv[key],
      price: Math.max(2, Math.floor((ITEMS[key].kind === 'use' ? 35 : ITEMS[key].kind === 'gift' ? 12 : 22) * 0.55)),
    }))
})

function buy(offer) {
  const result = game.buyFromNpc(npc.value.id, offer.itemId)
  reply.value = result.ok ? `你买下了${result.item.name}。` : result.message
  if (result.ok) game.notify(`买下 ${result.item.name}`, 'good')
}

function sell(item) {
  const result = game.sellToNpc(npc.value.id, item.key)
  reply.value = result.ok ? `你卖出了${result.name}，得到 ${result.credits} 信用点。` : result.message
  if (result.ok) game.notify(`卖出 ${result.name}`, 'good')
}

function fulfillWanted() {
  const result = game.fulfillNpcWanted(npc.value.id)
  reply.value = result.ok ? `你满足了收购单，得到 ${result.credits} 信用点。` : result.message
  if (result.ok) game.notify(`收购单完成 · ${result.name}`, 'good')
}
</script>

<template>
  <div v-if="npc && run" class="run-page npc-trade-page">
    <section class="panel trade-head">
      <div>
        <RouterLink :to="backNpc" class="back-link">← {{ npc.name }}</RouterLink>
        <p class="kicker">TRADE · {{ npc.name }}</p>
        <h1>交易</h1>
        <p class="hint">NPC 也有自己的信用点和背包。关系越好，他给你的价格越低；买卖也会改变关系。</p>
      </div>
      <div class="trade-wallet">
        <span class="tag amber">你 {{ run.player.credits }} 信用点</span>
        <span class="tag jade">他 {{ npc.credits || 0 }} 信用点</span>
      </div>
    </section>

    <section v-if="wanted" class="panel wanted-card">
      <div>
        <p class="kicker">BUY ORDER · D{{ run.day }}</p>
        <h3>他想收：{{ ITEMS[wanted.itemId]?.name }}</h3>
        <p>他今天在收{{ ITEMS[wanted.itemId]?.name }}，愿意出 {{ wanted.price }} 信用点。你持有 {{ run.inv[wanted.itemId] || 0 }} 件。</p>
      </div>
      <button type="button" class="btn btn-primary" :disabled="(run.inv[wanted.itemId] || 0) < 1 || (npc.credits || 0) < wanted.price" @click="fulfillWanted">
        卖给他 · {{ wanted.price }}
      </button>
    </section>

    <section class="panel trade-block">
      <div class="section-head">
        <div>
          <p class="kicker">HIS STOCK</p>
          <h2>他的背包</h2>
        </div>
        <span class="tag">信任 {{ npc.relation.trust }} · 亲近 {{ npc.relation.closeness }}</span>
      </div>
      <div v-if="offers.length" class="trade-list">
        <article v-for="offer in offers" :key="offer.itemId" class="trade-row">
          <span class="trade-glyph">{{ offer.glyph }}</span>
          <div>
            <b>{{ offer.name }} ×{{ offer.count }}</b>
            <small>{{ offer.note }}</small>
          </div>
          <em>{{ offer.price }} 信用点</em>
          <button type="button" class="btn btn-sm" :disabled="run.player.credits < offer.price" @click="buy(offer)">买下</button>
        </article>
      </div>
      <p v-else class="empty">他现在没有可以卖的东西。</p>
    </section>

    <section class="panel trade-block">
      <div class="section-head">
        <div>
          <p class="kicker">SELL TO HIM</p>
          <h2>卖给他</h2>
        </div>
        <span class="tag">他最多出 {{ npc.credits || 0 }}</span>
      </div>
      <div v-if="sellItems.length" class="trade-list">
        <article v-for="item in sellItems" :key="item.key" class="trade-row">
          <span class="trade-glyph">{{ item.glyph }}</span>
          <div>
            <b>{{ item.name }} ×{{ item.count }}</b>
            <small>{{ item.note }}</small>
          </div>
          <em>{{ item.price }} 信用点</em>
          <button type="button" class="btn btn-sm" :disabled="(npc.credits || 0) < item.price" @click="sell(item)">卖出</button>
        </article>
      </div>
      <p v-else class="empty">背包里没有可以卖的东西。</p>
      <p v-if="reply" class="reply">{{ reply }}</p>
    </section>
  </div>
</template>

<style scoped>
.npc-trade-page { gap: 12px; max-width: 1000px; }
.trade-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; padding: 18px; }
.back-link { display: inline-flex; margin-bottom: 9px; color: var(--dim); font-family: var(--mono); font-size: max(var(--ui-min), calc(9px * var(--ui-scale))); }
.trade-head h1 { margin-top: 3px; font-size: max(var(--ui-min), calc(32px * var(--ui-scale))); font-weight: 300; letter-spacing: .1em; }
.trade-wallet { display: flex; flex-wrap: wrap; gap: 6px; }
.wanted-card { display: flex; align-items: center; justify-content: space-between; gap: 14px; padding: 15px 16px; border-color: rgba(255, 196, 107, .28); background: rgba(255, 196, 107, .045); }
.wanted-card h3 { margin-top: 3px; color: var(--amber); font-size: max(var(--ui-min), calc(18px * var(--ui-scale))); font-weight: 400; }
.wanted-card p { margin-top: 3px; color: var(--muted); font-size: max(var(--ui-min), calc(10px * var(--ui-scale))); line-height: 1.6; }
.trade-block { padding: 16px; }
.section-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; }
.section-head h2 { margin-top: 3px; font-size: max(var(--ui-min), calc(18px * var(--ui-scale))); font-weight: 400; }
.trade-list { display: flex; flex-direction: column; gap: 5px; margin-top: 12px; }
.trade-row { display: flex; align-items: center; gap: 10px; padding: 9px 10px; border: 1px solid var(--line); border-radius: 9px; background: rgba(5, 10, 16, .4); }
.trade-glyph { display: grid; place-items: center; width: 28px; height: 28px; flex: none; border: 1px solid rgba(124, 231, 255, .2); border-radius: 6px; color: var(--cyan); }
.trade-row > div { flex: 1; min-width: 0; }
.trade-row b { display: block; font-size: max(var(--ui-min), calc(11px * var(--ui-scale))); font-weight: 500; }
.trade-row small { display: block; margin-top: 2px; color: var(--dim); font-size: max(var(--ui-min), calc(9px * var(--ui-scale))); line-height: 1.4; }
.trade-row em { flex: none; color: var(--amber); font-family: var(--mono); font-style: normal; font-size: max(var(--ui-min), calc(9px * var(--ui-scale))); }
.reply { margin-top: 12px; padding: 9px 11px; border-left: 2px solid rgba(124, 231, 255, .3); background: rgba(124, 231, 255, .04); color: var(--muted); font-size: max(var(--ui-min), calc(10px * var(--ui-scale))); line-height: 1.7; }
.empty { padding: 18px; color: var(--dim); font-size: max(var(--ui-min), calc(10px * var(--ui-scale))); text-align: center; }
@media (max-width: 700px) {
  .trade-head { flex-direction: column; padding: 14px; }
  .trade-row { align-items: flex-start; flex-wrap: wrap; }
}
</style>
