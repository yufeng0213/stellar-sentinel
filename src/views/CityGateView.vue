<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { doorSeals } from '../game-core/door.js'
import { chapterStatus } from '../game-core/story.js'
import { useGameStore } from '../stores/game.js'

const game = useGameStore()
const router = useRouter()
const run = computed(() => game.run)
const status = computed(() => (run.value ? chapterStatus(run.value) : null))
const seals = computed(() => (run.value ? doorSeals(run.value) : null))
const dungeon = computed(() => run.value?.dungeon || null)

function renameDungeon(useLlm) {
  const result = game.renameDungeon(useLlm)
  if (result?.ok) game.notify(`地穴命名为：${result.name}`, 'good')
}

function enter() {
  if (!run.value) return
  router.push({ name: 'map', params: { runId: run.value.id } })
}
</script>

<template>
  <div v-if="run" class="run-page gate-page">
    <section class="panel gate-hero">
      <div>
        <RouterLink :to="{ name: 'city', params: { runId: run.id } }" class="back-link">← 空港</RouterLink>
        <p class="kicker">GATE · DEPARTURE</p>
        <h1>城门</h1>
        <p class="hint">星区在城外。带够补给，确认队伍，然后重新走上那条重复的坐标。</p>
      </div>
      <span class="gate-glyph">⌁</span>
    </section>

    <section class="panel gate-objective">
      <span class="kicker">MAIN OBJECTIVE · CH{{ status?.current }}</span>
      <h3>{{ status?.title || '失联的白塔' }}</h3>
      <p>{{ status?.objective }}</p>
      <div class="gate-objective-actions">
        <span class="tag" :class="status?.complete ? 'jade' : 'amber'">{{ status?.complete ? '目标已完成' : '进行中' }}</span>
        <RouterLink :to="{ name: 'story-main', params: { runId: run.id } }" class="text-link">查看主线 →</RouterLink>
      </div>
      <div v-if="status?.current === 4" class="gate-seals">
        <span v-for="seal in seals?.seals" :key="seal.id" class="tag" :class="seal.ok ? 'jade' : 'amber'">
          {{ seal.ok ? '◈' : '◇' }} {{ seal.name }}
        </span>
        <RouterLink v-if="seals?.complete" :to="{ name: 'story-door', params: { runId: run.id } }" class="btn btn-sm">
          {{ run.door?.opened ? '查看结局' : '前往门' }} →
        </RouterLink>
      </div>
    </section>

    <section class="panel gate-dungeon">
      <div>
        <span class="kicker">DUNGEON DESIGNATION</span>
        <h3>{{ dungeon?.name || '未命名地穴' }}</h3>
        <p class="hint">{{ dungeon?.source === 'llm' ? '模型命名' : '本地命名' }} · 名字不改变节点、掉落或难度。</p>
      </div>
      <div class="gate-dungeon-actions">
        <button type="button" class="btn btn-sm" @click="renameDungeon(true)">让模型命名</button>
        <button type="button" class="btn btn-ghost btn-sm" @click="renameDungeon(false)">本地重掷</button>
      </div>
    </section>

    <section class="panel gate-status">
      <div><span>信用点</span><b>{{ run.player.credits }}</b></div>
      <div><span>行动点</span><b>{{ run.ap }} / {{ run.apMax }}</b></div>
      <div><span>生命</span><b>{{ Math.round(run.player.hp) }} / {{ run.player.hpMax }}</b></div>
      <div><span>精神</span><b>{{ Math.round(run.player.mental) }} / {{ run.player.mentalMax }}</b></div>
    </section>

    <section class="panel gate-actions">
      <button type="button" class="btn btn-primary" @click="enter">进入星区 →</button>
      <RouterLink :to="{ name: 'city-market', params: { runId: run.id } }" class="btn btn-ghost">再去市场</RouterLink>
      <RouterLink :to="{ name: 'city-clinic', params: { runId: run.id } }" class="btn btn-ghost">再去诊所</RouterLink>
    </section>
  </div>
</template>

<style scoped>
.gate-page { gap: 12px; max-width: 1100px; }
.gate-hero { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; padding: 20px; }
.back-link { display: inline-flex; margin-bottom: 9px; color: var(--dim); font-family: var(--mono); font-size: max(var(--ui-min), calc(9px * var(--ui-scale))); }
.gate-hero h1 { margin-top: 3px; font-size: max(var(--ui-min), calc(38px * var(--ui-scale))); font-weight: 300; letter-spacing: .1em; }
.gate-glyph { color: var(--cyan); font-size: max(var(--ui-min), calc(54px * var(--ui-scale))); line-height: 1; opacity: .65; }
.gate-objective { padding: 16px; }
.gate-objective h3 { margin-top: 4px; font-size: max(var(--ui-min), calc(18px * var(--ui-scale))); font-weight: 400; }
.gate-objective p { margin-top: 4px; color: var(--muted); font-size: max(var(--ui-min), calc(11px * var(--ui-scale))); line-height: 1.7; }
.gate-objective-actions { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-top: 10px; }
.gate-seals { display: flex; flex-wrap: wrap; align-items: center; gap: 5px; margin-top: 10px; padding-top: 10px; border-top: 1px solid var(--line); }
.text-link { color: var(--cyan); font-family: var(--mono); font-size: max(var(--ui-min), calc(9px * var(--ui-scale))); }
.gate-dungeon { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 15px 16px; }
.gate-dungeon h3 { margin-top: 3px; color: var(--cyan); font-size: max(var(--ui-min), calc(20px * var(--ui-scale))); font-weight: 400; letter-spacing: .06em; }
.gate-dungeon-actions { display: flex; flex-wrap: wrap; gap: 5px; }
.gate-status { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; padding: 14px; }
.gate-status div { padding: 9px 10px; border: 1px solid var(--line); border-radius: 9px; background: rgba(5, 10, 16, .38); }
.gate-status span { display: block; color: var(--dim); font-family: var(--mono); font-size: max(var(--ui-min), calc(8px * var(--ui-scale))); }
.gate-status b { display: block; margin-top: 3px; color: var(--ink); font-family: var(--mono); font-size: max(var(--ui-min), calc(14px * var(--ui-scale))); font-weight: 400; }
.gate-actions { display: flex; flex-wrap: wrap; gap: 7px; padding: 14px; }
@media (max-width: 600px) {
  .gate-hero { padding: 15px; }
  .gate-status { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .gate-dungeon { align-items: flex-start; flex-direction: column; }
}
</style>
