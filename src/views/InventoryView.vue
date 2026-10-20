<script setup>
import { computed } from 'vue'
import { ATTRS, GEAR_GLYPH, ITEMS, SLOTS } from '../game-core/data.js'
import { useGameStore } from '../stores/game.js'

const game = useGameStore()
const run = computed(() => game.run)

const materials = computed(() => {
  if (!run.value) return []
  return Object.keys(run.value.inv)
    .filter((key) => ITEMS[key]?.kind === 'mat' && run.value.inv[key] > 0)
    .map((key) => ({ key, ...ITEMS[key], count: run.value.inv[key] }))
})

const consumables = computed(() => {
  if (!run.value) return []
  return Object.keys(run.value.inv)
    .filter((key) => ITEMS[key]?.kind === 'use' && run.value.inv[key] > 0)
    .map((key) => ({ key, ...ITEMS[key], count: run.value.inv[key] }))
})

const gears = computed(() => (run.value ? run.value.gear : []))

function bonusText(bonus) {
  return Object.keys(bonus)
    .filter((key) => bonus[key])
    .map((key) => `${ATTRS.find((attr) => attr.key === key)?.name || key}+${bonus[key]}`)
    .join(' ')
}

function isEquipped(gear) {
  return run.value?.equipment[gear.slot] === gear.uid
}
</script>

<template>
  <div v-if="run" class="run-page">
    <section class="panel bag">
      <header class="bag-head">
        <div>
          <p class="kicker">INVENTORY</p>
          <h2>背包</h2>
          <p class="hint">材料 · 消耗品 · 装备。装备加成会直接进入判定。</p>
        </div>
        <span class="tag cyan">{{ materials.length + consumables.length }} 种物资</span>
      </header>

      <h3 class="sec-label">材料</h3>
      <div v-if="materials.length" class="item-grid">
        <div v-for="item in materials" :key="item.key" class="item" :title="item.note">
          <span class="i-glyph">{{ item.glyph }}</span>
          <span class="i-body">
            <b>{{ item.name }}</b>
            <span>×{{ item.count }}</span>
          </span>
        </div>
      </div>
      <div v-else class="empty">还没有材料。去星图上的采集节点看看。</div>

      <h3 class="sec-label">消耗品</h3>
      <div v-if="consumables.length" class="item-grid">
        <div v-for="item in consumables" :key="item.key" class="item" :title="item.note">
          <span class="i-glyph use">{{ item.glyph }}</span>
          <span class="i-body">
            <b>{{ item.name }}</b>
            <span>×{{ item.count }}</span>
          </span>
          <button type="button" class="i-use" @click="game.consume(item.key)">使用</button>
        </div>
      </div>
      <div v-else class="empty">没有消耗品。</div>

      <h3 class="sec-label">装备</h3>
      <div v-if="gears.length" class="gear-list">
        <div v-for="gear in gears" :key="gear.uid" class="gear" :class="{ 'is-on': isEquipped(gear) }">
          <span class="g-glyph">{{ GEAR_GLYPH[gear.key] }}</span>
          <div class="g-body">
            <b>{{ gear.name }}</b>
            <span class="q" :class="gear.quality === '精良' ? 'q2' : gear.quality === '粗糙' ? 'q0' : 'q1'">{{ gear.quality }}</span>
            <p>{{ SLOTS[gear.slot] }} · {{ gear.note }}</p>
          </div>
          <span class="g-bonus">{{ bonusText(gear.bonus) }}</span>
          <button type="button" class="btn btn-sm" @click="game.equip(gear.uid)">
            {{ isEquipped(gear) ? '卸下' : '装备' }}
          </button>
        </div>
      </div>
      <div v-else class="empty">背包里没有装备。锻造页可以做一把。</div>
    </section>
  </div>
</template>

<style scoped>
.bag { padding: 18px; }
.bag-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
.bag-head h2 { margin-top: 3px; font-size: max(var(--ui-min), calc(19px * var(--ui-scale))); font-weight: 400; letter-spacing: 0.1em; }
.bag-head .hint { margin-top: 3px; }

.sec-label {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 16px 0 8px;
  color: var(--dim);
  font-family: var(--mono);
  font-size: max(var(--ui-min), calc(9px * var(--ui-scale)));
  font-weight: 500;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}
.sec-label::after { content: ""; flex: 1; height: 1px; background: var(--line); }

.item-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(116px, 1fr)); gap: 7px; }
.item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 9px 10px;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: rgba(5, 10, 16, .45);
}
.i-glyph {
  display: grid;
  place-items: center;
  width: 27px;
  height: 27px;
  flex: none;
  border: 1px solid rgba(124, 231, 255, .2);
  border-radius: 7px;
  color: var(--cyan);
  font-size: max(var(--ui-min), calc(11px * var(--ui-scale)));
}
.i-glyph.use { border-color: rgba(255, 196, 107, .28); color: var(--amber); }
.i-body { min-width: 0; flex: 1; }
.i-body b { display: block; font-size: max(var(--ui-min), calc(11px * var(--ui-scale))); font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.i-body span { color: var(--dim); font-family: var(--mono); font-size: max(var(--ui-min), calc(9px * var(--ui-scale))); }
.i-use {
  flex: none;
  height: 24px;
  padding: 0 8px;
  border: 1px solid var(--line);
  border-radius: 6px;
  background: transparent;
  color: var(--muted);
  font-size: max(var(--ui-min), calc(9.5px * var(--ui-scale)));
  cursor: pointer;
}
@media (hover: hover) {
  .i-use:hover { color: var(--amber); border-color: rgba(255, 196, 107, .4); }
}

.gear-list { display: flex; flex-direction: column; gap: 7px; }
.gear {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 11px;
  border: 1px solid var(--line);
  border-radius: 11px;
  background: rgba(5, 10, 16, .45);
}
.gear.is-on { border-color: rgba(124, 231, 255, .3); background: rgba(124, 231, 255, .05); }
.g-glyph {
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  flex: none;
  border: 1px solid var(--line);
  border-radius: 8px;
  color: var(--muted);
  font-size: max(var(--ui-min), calc(12px * var(--ui-scale)));
}
.gear.is-on .g-glyph { border-color: rgba(124, 231, 255, .3); color: var(--cyan); }
.g-body { flex: 1; min-width: 0; }
.g-body b { font-size: max(var(--ui-min), calc(11.5px * var(--ui-scale))); font-weight: 500; }
.g-body .q { margin-left: 5px; font-family: var(--mono); font-size: max(var(--ui-min), calc(9px * var(--ui-scale))); }
.q0 { color: var(--dim); }
.q1 { color: var(--muted); }
.q2 { color: var(--jade); }
.g-body p { margin-top: 1px; color: var(--dim); font-size: max(var(--ui-min), calc(9.5px * var(--ui-scale))); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.g-bonus { flex: none; color: var(--jade); font-family: var(--mono); font-size: max(var(--ui-min), calc(9.5px * var(--ui-scale))); }
.gear .btn { flex: none; }

.empty {
  padding: 22px 12px;
  border: 1px dashed rgba(126, 196, 224, .14);
  border-radius: 12px;
  color: var(--dim);
  font-size: max(var(--ui-min), calc(10.5px * var(--ui-scale)));
  text-align: center;
  line-height: 1.8;
}

@media (max-width: 899px) {
  .bag { padding: 14px; }
  .bag-head h2 { font-size: max(var(--ui-min), calc(17px * var(--ui-scale))); }
  .item-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .g-bonus { display: none; }
}
</style>
