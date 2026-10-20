<script setup>
import { computed, onMounted } from 'vue'
import { ITEMS } from '../game-core/data.js'
import { cityPrice } from '../game-core/city.js'
import { useGameStore } from '../stores/game.js'

const game = useGameStore()
const run = computed(() => game.run)
const city = computed(() => run.value?.city || null)
const market = computed(() => city.value?.market || [])

onMounted(() => game.enterCity())

function price(offer) {
  return cityPrice(run.value, offer)
}

function buy(index) {
  const result = game.buyCityOffer('market', index)
  if (result.ok) game.notify(`买下${result.name} · ${result.price} 信用点`, 'good')
}
</script>

<template>
  <div v-if="run" class="run-page shop-page">
    <section class="panel shop-head">
      <div>
        <RouterLink :to="{ name: 'city', params: { runId: run.id } }" class="back-link">← 空港</RouterLink>
        <p class="kicker">MARKET · D{{ run.day }}</p>
        <h2>市场</h2>
        <p class="hint">酒、营养膏、材料与药品。摊主每天换一批货，卖完不补。</p>
      </div>
      <div class="shop-wallet">
        <span>信用点</span>
        <b>{{ run.player.credits }}</b>
      </div>
    </section>

    <section class="panel shop-list">
      <div v-if="market.length" class="offers">
        <article v-for="(offer, index) in market" :key="offer.id" class="offer">
          <span class="offer-glyph">{{ ITEMS[offer.key]?.glyph }}</span>
          <div class="offer-main">
            <b>{{ ITEMS[offer.key]?.name }}</b>
            <span>{{ ITEMS[offer.key]?.note }}</span>
          </div>
          <div class="offer-buy">
            <em>{{ price(offer) }} 信用点</em>
            <small>库存 {{ offer.stock }}</small>
            <button type="button" class="btn btn-sm" :disabled="offer.stock <= 0 || run.player.credits < price(offer)" @click="buy(index)">
              {{ offer.stock <= 0 ? '售罄' : '购买' }}
            </button>
          </div>
        </article>
      </div>
      <p v-else class="empty">今天市场没有开张。</p>

      <div class="shop-links">
        <RouterLink :to="{ name: 'inventory', params: { runId: run.id } }" class="text-link">查看背包 →</RouterLink>
        <RouterLink :to="{ name: 'city-tavern', params: { runId: run.id } }" class="text-link">去酒馆 →</RouterLink>
      </div>
    </section>
  </div>
</template>

<style scoped>
.shop-page { gap: 12px; max-width: 1100px; }
.shop-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; padding: 18px; }
.back-link { display: inline-flex; margin-bottom: 9px; color: var(--dim); font-family: var(--mono); font-size: max(var(--ui-min), calc(9px * var(--ui-scale))); }
.shop-head h2 { margin-top: 3px; font-size: max(var(--ui-min), calc(28px * var(--ui-scale))); font-weight: 300; letter-spacing: .08em; }
.shop-wallet { text-align: right; }
.shop-wallet span { display: block; color: var(--dim); font-family: var(--mono); font-size: max(var(--ui-min), calc(8px * var(--ui-scale))); }
.shop-wallet b { color: var(--amber); font-family: var(--mono); font-size: max(var(--ui-min), calc(22px * var(--ui-scale))); font-weight: 400; }
.shop-list { padding: 14px; }
.offers { display: flex; flex-direction: column; gap: 6px; }
.offer { display: flex; align-items: center; gap: 10px; padding: 10px; border: 1px solid var(--line); border-radius: 10px; background: rgba(5, 10, 16, .42); }
.offer-glyph { display: grid; place-items: center; width: 34px; height: 34px; flex: none; border: 1px solid rgba(124, 231, 255, .22); border-radius: 8px; color: var(--cyan); font-size: max(var(--ui-min), calc(15px * var(--ui-scale))); }
.offer-main { flex: 1; min-width: 0; }
.offer-main b { display: block; font-size: max(var(--ui-min), calc(12px * var(--ui-scale))); font-weight: 500; }
.offer-main span { display: block; margin-top: 2px; color: var(--dim); font-size: max(var(--ui-min), calc(9px * var(--ui-scale))); line-height: 1.55; }
.offer-buy { display: flex; flex-direction: column; align-items: flex-end; gap: 1px; flex: none; }
.offer-buy em { color: var(--amber); font-family: var(--mono); font-size: max(var(--ui-min), calc(11px * var(--ui-scale))); font-style: normal; }
.offer-buy small { color: var(--dim); font-family: var(--mono); font-size: max(var(--ui-min), calc(8px * var(--ui-scale))); }
.shop-links { display: flex; justify-content: space-between; gap: 10px; margin-top: 14px; }
.text-link { color: var(--cyan); font-family: var(--mono); font-size: max(var(--ui-min), calc(9px * var(--ui-scale))); }
.empty { padding: 22px; color: var(--dim); text-align: center; }
@media (max-width: 600px) {
  .shop-head { padding: 14px; }
  .offer { align-items: flex-start; flex-wrap: wrap; }
  .offer-buy { width: 100%; flex-direction: row; align-items: center; justify-content: flex-end; gap: 8px; }
}
</style>
