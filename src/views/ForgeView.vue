<script setup>
import { computed } from 'vue'
import { GEAR, ITEMS, RECIPES } from '../game-core/data.js'
import { blueprintTierLabel, recipeKnown, recipeSourceLabel } from '../game-core/blueprint.js'
import { useGameStore } from '../stores/game.js'

const game = useGameStore()
const run = computed(() => game.run)

function materialState(recipe) {
  return Object.keys(recipe.mats).map((key) => {
    const need = recipe.mats[key]
    const have = run.value?.inv[key] || 0
    return { key, name: ITEMS[key]?.name || key, need, have, enough: have >= need }
  })
}

function canCraft(recipe) {
  return !!run.value &&
    recipeKnown(run.value, recipe.id) &&
    run.value.ap > 0 &&
    materialState(recipe).every((item) => item.enough)
}

function known(recipe) {
  return !!run.value && recipeKnown(run.value, recipe.id)
}

function craft(recipe) {
  const result = game.craftRecipe(recipe.id)
  if (!result.ok) return
  game.notify(`锻造成功 · ${result.quality}`, 'good')
}

function craftNote(recipe) {
  const item = recipe.type === 'gear' ? GEAR[recipe.out] : ITEMS[recipe.out]
  return item?.note || ''
}
</script>

<template>
  <div v-if="run" class="run-page">
    <section class="panel forge">
      <header class="forge-head">
        <div>
          <p class="kicker">FORGE</p>
          <h2>锻造工坊</h2>
          <p class="hint">随身工具包 · 品质由技艺判定决定（粗糙 / 标准 / 精良，强化可到原型）</p>
        </div>
        <span class="tag cyan">AP {{ run.ap }} / {{ run.apMax }}</span>
      </header>

      <div class="recipe-list">
        <article v-for="recipe in RECIPES" :key="recipe.id" class="recipe" :class="{ 'is-locked': !known(recipe) }">
          <span class="r-glyph">⚒</span>
          <div class="r-body">
            <div class="r-top">
              <b>{{ recipe.name }}</b>
              <span>{{ known(recipe) ? `技艺 DC ${recipe.dc}` : '未掌握图纸' }} · {{ blueprintTierLabel(recipe) }}</span>
            </div>
            <p class="r-note">{{ known(recipe) ? craftNote(recipe) : `${recipeSourceLabel(recipe)} · 取得图纸后才能锻造` }}</p>
            <div class="mats">
              <span
                v-for="mat in materialState(recipe)"
                :key="mat.key"
                class="mat"
                :class="{ lack: !mat.enough }"
              >
                {{ mat.name }} {{ mat.have }}/{{ mat.need }}
              </span>
            </div>
          </div>
          <button
            type="button"
            class="btn btn-sm"
            :disabled="!canCraft(recipe)"
            @click="craft(recipe)"
          >
            {{ known(recipe) ? '锻造' : '未掌握' }}
          </button>
        </article>
      </div>

      <p class="footnote">
        锻造消耗 1 AP。未掌握的图纸会显示来源，击败首领后才能锻造原型装备。材料不足时按钮不可用；失败会消耗材料。
      </p>
    </section>
  </div>
</template>

<style scoped>
.forge { padding: 18px; }
.forge-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
.forge-head h2 { margin-top: 3px; font-size: max(var(--ui-min), calc(19px * var(--ui-scale))); font-weight: 400; letter-spacing: 0.1em; }
.forge-head .hint { margin-top: 3px; }

.recipe-list { display: flex; flex-direction: column; gap: 7px; margin-top: 14px; }
.recipe.is-locked { opacity: .48; border-style: dashed; }
.recipe {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 11px;
  border: 1px solid var(--line);
  border-radius: 11px;
  background: rgba(5, 10, 16, .45);
}
.r-glyph {
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  flex: none;
  border: 1px solid rgba(255, 196, 107, .22);
  border-radius: 8px;
  color: rgba(255, 196, 107, .85);
  font-size: max(var(--ui-min), calc(12px * var(--ui-scale)));
}
.r-body { flex: 1; min-width: 0; }
.r-top { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; }
.r-top b { font-size: max(var(--ui-min), calc(12px * var(--ui-scale))); font-weight: 500; letter-spacing: 0.05em; }
.r-top span { color: var(--dim); font-family: var(--mono); font-size: max(var(--ui-min), calc(9px * var(--ui-scale))); white-space: nowrap; }
.r-note { margin-top: 1px; color: var(--dim); font-size: max(var(--ui-min), calc(9.5px * var(--ui-scale))); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.mats { display: flex; flex-wrap: wrap; gap: 3px; margin-top: 5px; }
.mat {
  padding: 1px 5px;
  border: 1px solid var(--line);
  border-radius: 4px;
  color: var(--muted);
  font-family: var(--mono);
  font-size: max(var(--ui-min), calc(9px * var(--ui-scale)));
  white-space: nowrap;
}
.mat.lack { border-color: rgba(255, 138, 138, .28); color: var(--red); }
.recipe .btn { flex: none; }
.footnote { margin-top: 12px; color: var(--dim); font-size: max(var(--ui-min), calc(9.5px * var(--ui-scale))); line-height: 1.8; }

@media (max-width: 899px) {
  .forge { padding: 14px; }
  .forge-head h2 { font-size: max(var(--ui-min), calc(17px * var(--ui-scale))); }
  .recipe { padding: 9px 10px; gap: 8px; }
  .r-note { display: none; }
  .r-top b { font-size: max(var(--ui-min), calc(11.5px * var(--ui-scale))); }
  .recipe .btn { height: 27px; padding: 0 9px; font-size: max(var(--ui-min), calc(10.5px * var(--ui-scale))); }
}
</style>
