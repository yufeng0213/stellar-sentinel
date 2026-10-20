<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import {
  CALIBRATION_BRANCHES,
  calibrationNodeStatus,
  calibrationSummary,
} from '../game-core/calibration.js'
import { useGameStore } from '../stores/game.js'

const game = useGameStore()
const router = useRouter()
const run = computed(() => game.run)
const summary = computed(() => (run.value ? calibrationSummary(run.value) : null))
const branches = computed(() => Object.values(CALIBRATION_BRANCHES).map((branch) => ({
  ...branch,
  nodes: branch.nodes.map((node) => calibrationNodeStatus(run.value, node.id)),
})))

const EFFECT_LABELS = {
  firstAttack: '首击伤害',
  armor: '破甲伤害',
  execute: '处决伤害',
  shield: '开局护盾',
  counter: '开局反击',
  mentalResist: '侵蚀抗性',
  psi: '灵能伤害',
  travelMental: '移动精神消耗',
  social: '社交判定',
  credits: '战斗信用点',
  healing: '消耗品恢复',
  nightEye: '夜间视野',
  discount: '商店折扣',
  startAp: '开局 AP',
}

function unlock(node) {
  const result = game.unlockCalibration(node.id)
  if (result.ok) game.notify(`校准完成 · ${node.name}`, 'good')
}

function back() {
  if (!run.value) return
  router.push({ name: 'city', params: { runId: run.value.id } })
}
</script>

<template>
  <div v-if="run && summary" class="run-page calibration-page">
    <section class="panel calibration-head">
      <div>
        <button type="button" class="back-link" @click="back">← 空港</button>
        <p class="kicker">CALIBRATION · MINDSET</p>
        <h1>校准</h1>
        <p class="hint">不靠刷经验。校准点来自开局、首次精英、首领和章节完成，把装备、牌组和探索风格连起来。</p>
      </div>
      <div class="calibration-points">
        <b>{{ summary.points }}</b>
        <span>可用校准点</span>
      </div>
    </section>

    <section class="panel effect-panel">
      <div>
        <p class="kicker">ACTIVE EFFECTS · {{ summary.unlocked }} / {{ summary.total }}</p>
        <div class="effect-tags">
          <span v-for="(value, key) in summary.effects" :key="key" class="tag cyan">
            {{ EFFECT_LABELS[key] || key }} +{{ value }}
          </span>
          <span v-if="!Object.keys(summary.effects).length" class="tag">还没有校准效果</span>
        </div>
      </div>
      <p class="hint">每个节点消耗 1 点。节点只能按分支顺序解锁。</p>
    </section>

    <section class="branch-grid">
      <article v-for="branch in branches" :key="branch.id" class="panel branch" :class="`branch-${branch.id}`">
        <header>
          <span class="kicker">{{ branch.name }} · {{ branch.nodes.filter((node) => node.unlocked).length }} / {{ branch.nodes.length }}</span>
          <h2>{{ branch.name }}</h2>
          <p>{{ branch.desc }}</p>
        </header>

        <div class="node-list">
          <div
            v-for="node in branch.nodes"
            :key="node.id"
            class="node"
            :class="{ 'is-on': node.unlocked, 'is-locked': !node.unlocked && !node.prereqOk }"
          >
            <span class="node-mark">{{ node.unlocked ? '◉' : '○' }}</span>
            <div class="node-body">
              <b>{{ node.name }}</b>
              <p>{{ node.desc }}</p>
              <small v-if="!node.unlocked && !node.prereqOk">需要先解锁前置节点</small>
            </div>
            <button
              v-if="!node.unlocked"
              type="button"
              class="btn btn-sm"
              :disabled="!node.canUnlock"
              @click="unlock(node)"
            >
              校准
            </button>
            <span v-else class="tag jade">已校准</span>
          </div>
        </div>
      </article>
    </section>
  </div>
</template>

<style scoped>
.calibration-page { gap: 12px; max-width: 1200px; }
.calibration-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; padding: 20px; }
.back-link { margin-bottom: 9px; padding: 0; border: 0; background: none; color: var(--dim); font-family: var(--mono); font-size: max(var(--ui-min), calc(9px * var(--ui-scale))); cursor: pointer; }
.calibration-head h1 { margin-top: 3px; font-size: max(var(--ui-min), calc(36px * var(--ui-scale))); font-weight: 300; letter-spacing: .1em; }
.calibration-points { flex: none; min-width: 120px; padding: 12px 16px; border: 1px solid rgba(124, 231, 255, .3); border-radius: 12px; background: rgba(124, 231, 255, .06); text-align: center; }
.calibration-points b { display: block; color: var(--cyan); font-family: var(--mono); font-size: max(var(--ui-min), calc(30px * var(--ui-scale))); font-weight: 300; }
.calibration-points span { display: block; margin-top: 3px; color: var(--dim); font-family: var(--mono); font-size: max(var(--ui-min), calc(8px * var(--ui-scale))); }
.effect-panel { display: flex; align-items: flex-start; justify-content: space-between; gap: 14px; padding: 14px 16px; }
.effect-tags { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 8px; }
.branch-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
.branch { padding: 16px; }
.branch header h2 { margin-top: 3px; font-size: max(var(--ui-min), calc(22px * var(--ui-scale))); font-weight: 400; }
.branch header p { margin-top: 4px; color: var(--muted); font-size: max(var(--ui-min), calc(10px * var(--ui-scale))); line-height: 1.6; }
.branch-sentinel { border-color: rgba(255, 138, 138, .22); }
.branch-guide { border-color: rgba(185, 164, 255, .22); }
.branch-survival { border-color: rgba(124, 231, 175, .22); }
.node-list { display: flex; flex-direction: column; gap: 6px; margin-top: 14px; }
.node { display: flex; align-items: flex-start; gap: 8px; padding: 9px 10px; border: 1px solid var(--line); border-radius: 9px; background: rgba(5, 10, 16, .4); }
.node.is-on { border-color: rgba(124, 231, 255, .3); background: rgba(124, 231, 255, .05); }
.node.is-locked { opacity: .48; }
.node-mark { flex: none; color: var(--dim); font-family: var(--mono); font-size: max(var(--ui-min), calc(13px * var(--ui-scale))); line-height: 1.4; }
.node.is-on .node-mark { color: var(--cyan); }
.node-body { flex: 1; min-width: 0; }
.node-body b { display: block; font-size: max(var(--ui-min), calc(11px * var(--ui-scale))); font-weight: 500; }
.node-body p { margin-top: 2px; color: var(--muted); font-size: max(var(--ui-min), calc(9px * var(--ui-scale))); line-height: 1.5; }
.node-body small { display: block; margin-top: 3px; color: var(--dim); font-family: var(--mono); font-size: max(var(--ui-min), calc(8px * var(--ui-scale))); }
.node .btn, .node .tag { flex: none; }
@media (max-width: 900px) {
  .calibration-head { flex-direction: column; padding: 15px; }
  .effect-panel { flex-direction: column; }
  .branch-grid { grid-template-columns: 1fr; }
}
</style>
