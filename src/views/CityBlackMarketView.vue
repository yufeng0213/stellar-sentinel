<script setup>
import { computed, onMounted } from 'vue'
import { ITEMS } from '../game-core/data.js'
import { cityPrice } from '../game-core/city.js'
import { useGameStore } from '../stores/game.js'

const game = useGameStore()
const run = computed(() => game.run)
const city = computed(() => run.value?.city || null)
const offers = computed(() => city.value?.blackmarket || [])

onMounted(() => game.enterCity())

function price(offer) {
  return cityPrice(run.value, offer)
}

function buy(index) {
  const result = game.buyCityOffer('blackmarket', index)
  if (result.ok) game.notify(`买下${result.name} · ${result.price} 信用点`, 'good')
}

function buyIntel() {
  const result = game.buyCityIntel()
  if (result.ok) game.notify(result.text, 'good')
}
</script>

<template>
  <div v-if="run" class="run-page black-page">
    <section class="panel black-head">
      <div>
        <RouterLink :to="{ name: 'city', params: { runId: run.id } }" class="back-link">← 空港</RouterLink>
        <p class="kicker">BLACK MARKET · NO REFUNDS</p>
        <h2>黑市</h2>
        <p class="hint">这里不问来路，只认信用点。情报比货更贵。</p>
      </div>
      <span class="tag amber">信用点 {{ run.player.credits }}</span>
    </section>

    <section class="panel intel-card" :class="{ 'is-bought': city?.intelBought }">
      <div>
        <span class="kicker">INTEL · WHITE TOWER</span>
        <h3>白塔信号源的位置</h3>
        <p>{{ city?.intelBought ? '你已经拿到这份情报：信号源不在塔里，在塔下面的旧矿脉。' : '摊主说他知道白塔信号源不在塔里。开价 60 信用点。' }}</p>
      </div>
      <button type="button" class="btn btn-primary" :disabled="city?.intelBought || run.player.credits < 60" @click="buyIntel">
        {{ city?.intelBought ? '已购买' : '购买情报 · 60' }}
      </button>
    </section>

    <section class="panel black-list">
      <h3>货架</h3>
      <div class="black-offers">
        <article v-for="(offer, index) in offers" :key="offer.id" class="black-item">
          <span class="offer-glyph">{{ ITEMS[offer.key]?.glyph }}</span>
          <div>
            <b>{{ ITEMS[offer.key]?.name }}</b>
            <span>{{ ITEMS[offer.key]?.note }}</span>
          </div>
          <em>{{ price(offer) }} · 库存 {{ offer.stock }}</em>
          <button type="button" class="btn btn-sm" :disabled="offer.stock <= 0 || run.player.credits < price(offer)" @click="buy(index)">买</button>
        </article>
      </div>
    </section>
  </div>
</template>

<style scoped>
.black-page { gap: 12px; max-width: 1000px; }
.black-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 14px; padding: 18px; }
.back-link { display: inline-flex; margin-bottom: 9px; color: var(--dim); font-family: var(--mono); font-size: max(var(--ui-min), calc(9px * var(--ui-scale))); }
.black-head h2 { margin-top: 3px; font-size: max(var(--ui-min), calc(30px * var(--ui-scale))); font-weight: 300; letter-spacing: .08em; }
.intel-card { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 16px; border-color: rgba(255, 196, 107, .24); background: linear-gradient(150deg, rgba(255, 196, 107, .07), rgba(5, 10, 16, .5)); }
.intel-card h3 { margin-top: 3px; font-size: max(var(--ui-min), calc(17px * var(--ui-scale))); font-weight: 400; }
.intel-card p { margin-top: 4px; color: var(--muted); font-size: max(var(--ui-min), calc(10px * var(--ui-scale))); line-height: 1.65; }
.intel-card.is-bought { opacity: .72; }
.black-list { padding: 15px; }
.black-list h3 { margin-bottom: 9px; font-size: max(var(--ui-min), calc(14px * var(--ui-scale))); font-weight: 500; }
.black-offers { display: flex; flex-direction: column; gap: 5px; }
.black-item { display: flex; align-items: center; gap: 9px; padding: 9px; border: 1px solid var(--line); border-radius: 9px; background: rgba(5, 10, 16, .42); }
.offer-glyph { display: grid; place-items: center; width: 32px; height: 32px; flex: none; border: 1px solid rgba(185, 164, 255, .3); border-radius: 8px; color: var(--violet); }
.black-item div { flex: 1; min-width: 0; }
.black-item b { display: block; font-size: max(var(--ui-min), calc(11px * var(--ui-scale))); font-weight: 500; }
.black-item span { display: block; color: var(--dim); font-size: max(var(--ui-min), calc(8px * var(--ui-scale))); }
.black-item em { color: var(--amber); font-family: var(--mono); font-size: max(var(--ui-min), calc(9px * var(--ui-scale))); font-style: normal; }
@media (max-width: 600px) {
  .black-head { flex-direction: column; }
  .intel-card { align-items: flex-start; flex-direction: column; }
}
</style>
