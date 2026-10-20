<script setup>
import { computed, onMounted } from 'vue'
import { ITEMS, RECIPES } from '../game-core/data.js'
import { cityPrice } from '../game-core/city.js'
import { useGameStore } from '../stores/game.js'

const game = useGameStore()
const run = computed(() => game.run)
const city = computed(() => run.value?.city || null)
const medicines = computed(() => RECIPES.filter((recipe) => recipe.type === 'use'))
const stock = computed(() => city.value?.clinic || [])

onMounted(() => game.enterCity())

function price(offer) {
  return cityPrice(run.value, offer)
}

function buy(index) {
  const result = game.buyCityOffer('clinic', index)
  if (result.ok) game.notify(`买下${result.name} · ${result.price} 信用点`, 'good')
}

function heal() {
  const result = game.healCity()
  if (result.ok) game.notify(`处理完毕 · ${result.cost} 信用点`, 'good')
}

function craft(recipe) {
  const result = game.craftRecipe(recipe.id)
  if (result.ok) game.notify(`制成 ${recipe.name}`, 'good')
}

function matsText(recipe) {
  return Object.entries(recipe.mats)
    .map(([key, count]) => `${ITEMS[key]?.name || key}×${count}`)
    .join(' · ')
}
</script>

<template>
  <div v-if="run" class="run-page clinic-page">
    <section class="panel clinic-head">
      <div>
        <RouterLink :to="{ name: 'city', params: { runId: run.id } }" class="back-link">← 空港</RouterLink>
        <p class="kicker">CLINIC · D{{ run.day }}</p>
        <h2>诊所</h2>
        <p class="hint">处理伤口，恢复精神，或者把材料煮成能救命的东西。</p>
      </div>
      <div class="clinic-vitals">
        <span class="tag jade">生命 {{ Math.round(run.player.hp) }} / {{ run.player.hpMax }}</span>
        <span class="tag amber">精神 {{ Math.round(run.player.mental) }} / {{ run.player.mentalMax }}</span>
      </div>
    </section>

    <section class="panel clinic-section">
      <div class="clinic-row">
        <div>
          <h3>处理伤口</h3>
          <p>恢复 35% 生命和 25% 精神。每天一次。</p>
        </div>
        <button type="button" class="btn btn-primary" :disabled="run.player.credits < 34 || city?.healDay === run.day" @click="heal">
          {{ city?.healDay === run.day ? '今天已处理' : '治疗 · 34' }}
        </button>
      </div>
    </section>

    <section class="panel clinic-section">
      <h3>药柜</h3>
      <div class="clinic-stock">
        <article v-for="(offer, index) in stock" :key="offer.id" class="clinic-item">
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

    <section class="panel clinic-section">
      <h3>制药</h3>
      <p class="hint">消耗 1 行动点和材料。失败会损失材料。</p>
      <div class="recipe-list">
        <article v-for="recipe in medicines" :key="recipe.id" class="recipe">
          <div>
            <b>{{ recipe.name }}</b>
            <span>{{ matsText(recipe) }} · DC {{ recipe.dc }}</span>
          </div>
          <button type="button" class="btn btn-sm" :disabled="!game.canCraft(recipe) || run.ap < 1" @click="craft(recipe)">
            {{ game.canCraft(recipe) ? '制作' : '材料不足' }}
          </button>
        </article>
      </div>
    </section>
  </div>
</template>

<style scoped>
.clinic-page { gap: 12px; max-width: 1100px; }
.clinic-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; padding: 18px; }
.back-link { display: inline-flex; margin-bottom: 9px; color: var(--dim); font-family: var(--mono); font-size: max(var(--ui-min), calc(9px * var(--ui-scale))); }
.clinic-head h2 { margin-top: 3px; font-size: max(var(--ui-min), calc(30px * var(--ui-scale))); font-weight: 300; letter-spacing: .08em; }
.clinic-vitals { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 5px; }
.clinic-section { padding: 15px 16px; }
.clinic-section h3 { margin-bottom: 8px; font-size: max(var(--ui-min), calc(14px * var(--ui-scale))); font-weight: 500; }
.clinic-section .hint { margin-top: 3px; }
.clinic-row { display: flex; align-items: center; justify-content: space-between; gap: 14px; }
.clinic-row p { margin-top: 3px; color: var(--muted); font-size: max(var(--ui-min), calc(10px * var(--ui-scale))); }
.clinic-stock { display: flex; flex-direction: column; gap: 5px; }
.clinic-item { display: flex; align-items: center; gap: 9px; padding: 8px 9px; border: 1px solid var(--line); border-radius: 9px; background: rgba(5, 10, 16, .4); }
.offer-glyph { display: grid; place-items: center; width: 30px; height: 30px; flex: none; border: 1px solid rgba(124, 231, 255, .2); border-radius: 7px; color: var(--cyan); }
.clinic-item div { flex: 1; min-width: 0; }
.clinic-item b { display: block; font-size: max(var(--ui-min), calc(11px * var(--ui-scale))); font-weight: 500; }
.clinic-item span { display: block; color: var(--dim); font-size: max(var(--ui-min), calc(8px * var(--ui-scale))); }
.clinic-item em { color: var(--amber); font-family: var(--mono); font-size: max(var(--ui-min), calc(9px * var(--ui-scale))); font-style: normal; }
.recipe-list { display: flex; flex-direction: column; gap: 5px; margin-top: 10px; }
.recipe { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 8px 9px; border: 1px solid var(--line); border-radius: 9px; }
.recipe b { display: block; font-size: max(var(--ui-min), calc(11px * var(--ui-scale))); font-weight: 500; }
.recipe span { display: block; margin-top: 2px; color: var(--dim); font-family: var(--mono); font-size: max(var(--ui-min), calc(8px * var(--ui-scale))); }
@media (max-width: 600px) {
  .clinic-head { flex-direction: column; padding: 14px; }
  .clinic-vitals { justify-content: flex-start; }
  .clinic-row { align-items: flex-start; flex-direction: column; }
}
</style>
