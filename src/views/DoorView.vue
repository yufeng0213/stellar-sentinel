<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { ATTR_NAME } from '../game-core/data.js'
import { DOOR_SEALS, doorStatus } from '../game-core/door.js'
import { useGameStore } from '../stores/game.js'

const game = useGameStore()
const router = useRouter()
const run = computed(() => game.run)
const status = computed(() => (run.value ? doorStatus(run.value) : null))

function step() {
  const result = game.resolveDoorStep()
  if (result.ok) game.notify(result.success ? '门回应了你' : '门拒绝了这一段', result.success ? 'good' : 'bad')
}

function finale(choice) {
  const result = game.resolveDoorFinale(choice)
  if (result.ok) game.notify('门已经打开', 'good')
}

function back() {
  if (!run.value) return
  router.push({ name: 'city', params: { runId: run.value.id } })
}

function toBlackMarket() {
  if (!run.value) return
  router.push({ name: 'city-blackmarket', params: { runId: run.value.id } })
}
</script>

<template>
  <div v-if="run && status" class="run-page door-page">
    <section class="panel door-hero">
      <div>
        <button type="button" class="back-link" @click="back">← 空港</button>
        <p class="kicker">FINAL CHAPTER · THE DOOR</p>
        <h1>门</h1>
        <p class="hint">矿脉尽头没有房间，只有一扇不该存在的门。</p>
      </div>
      <span class="door-glyph">▥</span>
    </section>

    <section class="panel seal-box">
      <div class="seal-head">
        <div>
          <span class="kicker">SEALS</span>
          <h3>{{ status.complete ? '三枚门钥齐全' : '门还需要回应' }}</h3>
        </div>
        <span class="tag" :class="status.complete ? 'jade' : 'amber'">{{ status.complete ? '可以开门' : '缺少门钥' }}</span>
      </div>
      <div class="seal-grid">
        <div v-for="seal in status.seals" :key="seal.id" class="seal" :class="{ 'is-ok': seal.ok }">
          <span>{{ seal.ok ? '◈' : '◇' }}</span>
          <div>
            <b>{{ seal.name }}</b>
            <p>{{ seal.ok ? '已取得' : seal.hint }}</p>
          </div>
        </div>
      </div>
      <button v-if="!status.seals[2]?.ok" type="button" class="btn btn-sm" @click="toBlackMarket">去黑市找门钥 →</button>
    </section>

    <section v-if="status.opened" class="panel door-ending">
      <span class="kicker">ENDING · {{ status.ending === 'close' ? '合上' : '推开' }}</span>
      <p>{{ status.node.endingText }}</p>
      <div class="door-actions">
        <button type="button" class="btn btn-primary" @click="back">回到空港</button>
        <RouterLink :to="{ name: 'story-main', params: { runId: run.id } }" class="btn btn-ghost">查看主线</RouterLink>
      </div>
    </section>

    <template v-else-if="status.complete">
      <section class="panel door-narrative">
        <span class="kicker">THE DOOR · STEP {{ Math.min(status.stage + 1, 3) }} / 3</span>
        <p v-if="status.step">{{ status.step.prompt }}</p>
        <p v-else>门已经等你很久了。它没有再设置新的问题，只是把最后的选择留给你。</p>
        <button v-if="status.step" type="button" class="btn btn-primary" @click="step">
          {{ status.step.name }} · {{ ATTR_NAME[status.step.attr] }} DC {{ status.step.dc }}
        </button>
      </section>

      <section v-if="status.node.checks.length" class="panel check-list">
        <h3>门的回应</h3>
        <article v-for="check in status.node.checks" :key="check.id" class="check-row" :class="{ 'is-good': check.success, 'is-bad': !check.success }">
          <div>
            <b>{{ check.name }}</b>
            <p>{{ check.text }}</p>
          </div>
          <span>{{ check.success ? '成功' : '失败' }} · d20 {{ check.roll }} + {{ check.total - check.roll }} / DC {{ check.dc }}</span>
        </article>
      </section>

      <section v-if="status.canChoose" class="panel door-choice">
        <span class="kicker">FINAL CHOICE</span>
        <p>门已经不再拒绝你。推开门，或者把它重新合上。</p>
        <div class="door-actions">
          <button type="button" class="btn btn-primary" @click="finale('open')">推开门</button>
          <button type="button" class="btn btn-ghost" @click="finale('close')">把门合上</button>
        </div>
      </section>
    </template>

    <section v-else class="panel door-locked">
      <span class="kicker">THE DOOR REMAINS SHUT</span>
      <p>三枚门钥还没有集齐。先去黑市拿到门钥，再来这里。</p>
      <button type="button" class="btn btn-primary" @click="back">回到空港</button>
    </section>
  </div>
</template>

<style scoped>
.door-page { gap: 12px; max-width: 1000px; }
.door-hero { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; padding: 20px; }
.back-link { padding: 0; border: 0; background: transparent; color: var(--dim); font-family: var(--mono); font-size: max(var(--ui-min), calc(9px * var(--ui-scale))); cursor: pointer; }
.door-hero h1 { margin-top: 4px; font-size: max(var(--ui-min), calc(42px * var(--ui-scale))); font-weight: 300; letter-spacing: .16em; }
.door-glyph { color: var(--violet); font-size: max(var(--ui-min), calc(52px * var(--ui-scale))); opacity: .7; }
.seal-box { padding: 15px 16px; }
.seal-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
.seal-head h3 { margin-top: 3px; font-size: max(var(--ui-min), calc(17px * var(--ui-scale))); font-weight: 400; }
.seal-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 6px; margin: 12px 0; }
.seal { display: flex; gap: 8px; padding: 9px; border: 1px solid var(--line); border-radius: 9px; background: rgba(5, 10, 16, .4); opacity: .55; }
.seal.is-ok { opacity: 1; border-color: rgba(138, 222, 184, .3); }
.seal > span { color: var(--dim); font-size: max(var(--ui-min), calc(15px * var(--ui-scale))); }
.seal.is-ok > span { color: var(--jade); }
.seal b { display: block; font-size: max(var(--ui-min), calc(11px * var(--ui-scale))); font-weight: 500; }
.seal p { margin-top: 2px; color: var(--dim); font-size: max(var(--ui-min), calc(8.5px * var(--ui-scale))); line-height: 1.5; }
.door-narrative { padding: 16px; }
.door-narrative p { margin: 8px 0 14px; color: var(--muted); font-size: max(var(--ui-min), calc(12px * var(--ui-scale))); line-height: 1.85; }
.check-list { padding: 15px 16px; }
.check-list h3 { margin-bottom: 8px; font-size: max(var(--ui-min), calc(14px * var(--ui-scale))); font-weight: 500; }
.check-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 14px; padding: 8px 0; border-bottom: 1px solid rgba(255, 255, 255, .05); }
.check-row b { font-size: max(var(--ui-min), calc(11px * var(--ui-scale))); font-weight: 500; }
.check-row p { margin-top: 2px; color: var(--muted); font-size: max(var(--ui-min), calc(10px * var(--ui-scale))); line-height: 1.6; }
.check-row span { flex: none; color: var(--dim); font-family: var(--mono); font-size: max(var(--ui-min), calc(8px * var(--ui-scale))); }
.check-row.is-good span { color: var(--jade); }
.check-row.is-bad span { color: var(--red); }
.door-choice { padding: 16px; border-color: rgba(185, 164, 255, .3); background: rgba(185, 164, 255, .045); }
.door-choice p { margin: 5px 0 14px; color: var(--muted); font-size: max(var(--ui-min), calc(11px * var(--ui-scale))); line-height: 1.7; }
.door-ending { padding: 18px; border-color: rgba(255, 196, 107, .25); background: rgba(255, 196, 107, .04); }
.door-ending p { margin: 9px 0 16px; color: var(--ink); font-size: max(var(--ui-min), calc(13px * var(--ui-scale))); line-height: 1.9; }
.door-actions { display: flex; flex-wrap: wrap; gap: 6px; }
.door-locked { padding: 20px; }
.door-locked p { margin: 6px 0 14px; color: var(--muted); font-size: max(var(--ui-min), calc(11px * var(--ui-scale))); line-height: 1.7; }
@media (max-width: 650px) {
  .seal-grid { grid-template-columns: 1fr; }
  .check-row { flex-direction: column; gap: 3px; }
  .door-hero { padding: 15px; }
}
</style>
