<script setup>

import { computed } from 'vue'
import { ACHIEVEMENTS, ACHIEVEMENT_CATEGORIES } from '../game-core/achievements.js'
import { readProfile } from '../game/profile.js'

const profile = readProfile()
const unlocked = computed(() => profile.achievements || {})
const unlockedCount = computed(() => Object.keys(unlocked.value).length)
const groups = computed(() => Object.entries(ACHIEVEMENT_CATEGORIES).map(([id, meta]) => ({
  id,
  ...meta,
  items: ACHIEVEMENTS.filter((item) => item.category === id),
  count: ACHIEVEMENTS.filter((item) => item.category === id && unlocked.value[item.id]).length,
})))
</script>

<template>
  <div class="run-page archive-page">
    <section class="panel archive-head">
      <div>
        <RouterLink to="/" class="back-link">← 返回标题</RouterLink>
        <p class="kicker">ARCHIVE · STELLAR SENTINEL</p>
        <h1>星区档案</h1>
        <p class="hint">跨周目记录。成就只记录你做过的事，不提供战斗数值。</p>
      </div>
      <div class="archive-total">
        <b>{{ unlockedCount }}</b>
        <span>/ {{ ACHIEVEMENTS.length }}</span>
        <small>已解锁</small>
      </div>
    </section>

    <section class="archive-stats">
      <div><span>远征</span><b>{{ groups.find((g) => g.id === 'expedition')?.count || 0 }}</b></div>
      <div><span>关系</span><b>{{ groups.find((g) => g.id === 'relation')?.count || 0 }}</b></div>
      <div><span>城市</span><b>{{ groups.find((g) => g.id === 'city')?.count || 0 }}</b></div>
      <div><span>构筑</span><b>{{ groups.find((g) => g.id === 'build')?.count || 0 }}</b></div>
    </section>

    <section v-for="group in groups" :key="group.id" class="panel archive-group">
      <div class="archive-group-head">
        <h2>{{ group.name }}</h2>
        <span class="tag" :class="group.color">{{ group.count }} / {{ group.items.length }}</span>
      </div>
      <div class="archive-grid">
        <article v-for="item in group.items" :key="item.id" class="archive-card" :class="{ 'is-locked': !unlocked[item.id] }">
          <div class="archive-card-top">
            <b>{{ item.title }}</b>
            <span>{{ unlocked[item.id] ? '已解锁' : '未解锁' }}</span>
          </div>
          <p>{{ item.desc }}</p>
          <small v-if="unlocked[item.id]">D{{ unlocked[item.id].day }} 记录</small>
          <small v-else>继续远征以留下记录。</small>
        </article>
      </div>
    </section>

    <section class="panel archive-note">
      <p class="kicker">RUN STATS</p>
      <p>本档案不保存单局进度，只保存成就、结局与长期记录。当前档案包含 {{ unlockedCount }} 条记录。</p>
    </section>
  </div>
</template>

<style scoped>

.archive-page { display: flex; flex-direction: column; gap: 12px; padding-bottom: 30px; }
.archive-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 18px; padding: 18px; }
.archive-head h1 { margin-top: 6px; font-size: max(var(--ui-min), calc(30px * var(--ui-scale))); font-weight: 300; letter-spacing: .1em; }
.archive-total { display: flex; align-items: baseline; gap: 4px; color: var(--cyan); }
.archive-total b { font-size: max(var(--ui-min), calc(38px * var(--ui-scale))); font-weight: 300; }
.archive-total span { color: var(--dim); font-family: var(--mono); }
.archive-total small { width: 100%; color: var(--dim); font-family: var(--mono); font-size: max(var(--ui-min), calc(8px * var(--ui-scale))); text-align: right; }
.archive-stats { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 7px; }
.archive-stats div { display: flex; justify-content: space-between; padding: 10px 12px; border: 1px solid var(--line); border-radius: 8px; background: rgba(6, 12, 18, .5); }
.archive-stats span { color: var(--dim); font-family: var(--mono); font-size: max(var(--ui-min), calc(9px * var(--ui-scale))); }
.archive-stats b { color: var(--cyan); font-family: var(--mono); font-weight: 400; }
.archive-group { padding: 14px; }
.archive-group-head { display: flex; align-items: center; justify-content: space-between; }
.archive-group-head h2 { font-size: max(var(--ui-min), calc(16px * var(--ui-scale))); font-weight: 400; }
.archive-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 6px; margin-top: 10px; }
.archive-card { padding: 10px; border: 1px solid rgba(124, 231, 255, .2); border-radius: 8px; background: rgba(124, 231, 255, .035); }
.archive-card.is-locked { opacity: .48; border-style: dashed; }
.archive-card-top { display: flex; align-items: baseline; justify-content: space-between; gap: 6px; }
.archive-card-top b { font-size: max(var(--ui-min), calc(11px * var(--ui-scale))); font-weight: 500; }
.archive-card-top span { color: var(--cyan); font-family: var(--mono); font-size: max(var(--ui-min), calc(8px * var(--ui-scale))); white-space: nowrap; }
.archive-card.is-locked .archive-card-top span { color: var(--dim); }
.archive-card p { margin-top: 5px; color: var(--muted); font-size: max(var(--ui-min), calc(9px * var(--ui-scale))); line-height: 1.6; }
.archive-card small { display: block; margin-top: 6px; color: var(--dim); font-family: var(--mono); font-size: max(var(--ui-min), calc(8px * var(--ui-scale))); }
.archive-note { padding: 12px 14px; color: var(--muted); font-size: max(var(--ui-min), calc(9px * var(--ui-scale))); line-height: 1.7; }
.archive-note p + p { margin-top: 4px; }
@media (max-width: 760px) {
  .archive-head { flex-direction: column; }
  .archive-stats { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .archive-grid { grid-template-columns: 1fr; }
}
</style>
