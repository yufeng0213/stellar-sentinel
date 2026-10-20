<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { factionChainStatus, factionShopOffers, factionStatus } from '../game-core/faction.js'
import { useGameStore } from '../stores/game.js'

const route = useRoute()
const router = useRouter()
const game = useGameStore()
const run = computed(() => game.run)
const id = computed(() => String(route.params.factionId || ''))
const status = computed(() => (run.value ? factionStatus(run.value, id.value) : null))
const chain = computed(() => (run.value ? factionChainStatus(run.value, id.value) : null))
const shop = computed(() => factionShopOffers(id.value))

function back() {
  if (!run.value) return
  router.push({ name: 'city-factions', params: { runId: run.value.id } })
}

function claim() {
  const result = game.claimFactionChain(id.value)
  if (result.ok) game.notify(result.completed ? `${status.value.name}任务链完成` : '派系任务推进了一步', 'good')
}

function buy(offer) {
  const result = game.buyFactionShop(id.value, offer.index)
  if (result.ok) game.notify(`用声望换到 ${result.name}`, 'good')
}
</script>

<template>
  <div v-if="run && status" class="run-page faction-detail-page">
    <section class="panel detail-head">
      <div>
        <button type="button" class="back-link" @click="back">← 派系</button>
        <p class="kicker">{{ status.level }} · {{ status.score > 0 ? '+' : '' }}{{ status.score }}</p>
        <h1>{{ status.name }}</h1>
        <p class="hint">{{ status.desc }}</p>
      </div>
      <div class="detail-progress">
        <div class="faction-bar"><i :style="{ width: `${status.progress}%` }"></i></div>
        <span>“{{ status.creed }}”</span>
      </div>
    </section>

    <section class="panel chain-box">
      <div class="section-head">
        <div>
          <p class="kicker">FACTION CHAIN</p>
          <h2>任务链</h2>
        </div>
        <span class="tag" :class="chain?.completed ? 'jade' : 'amber'">{{ chain?.completed ? '已完成' : `第 ${(chain?.stage || 0) + 1} / 3 步` }}</span>
      </div>
      <div class="chain-list">
        <article
          v-for="(step, index) in chain?.chain"
          :key="step.title"
          class="chain-row"
          :class="{ 'is-current': index === chain.stage, 'is-done': index < chain.stage, 'is-locked': index > chain.stage }"
        >
          <span class="chain-no">{{ index + 1 }}</span>
          <div>
            <b>{{ step.title }}</b>
            <p>{{ step.desc }}</p>
            <span v-if="index === chain.stage" class="chain-req">
              需要 {{ step.rep }} 声望
              <template v-if="step.type === 'deliver'"> · {{ step.need }} 件物品</template>
              <template v-if="step.type === 'pay'"> · {{ step.cost }} 信用点</template>
              <template v-if="step.type === 'clear' && chain.target"> · 清理「{{ chain.target.title }}」</template>
            </span>
          </div>
          <span class="chain-state">{{ index < chain.stage ? '完成' : index === chain.stage ? (chain.objectiveDone ? '可交付' : '进行中') : '未解锁' }}</span>
        </article>
      </div>
      <button v-if="chain && !chain.completed" type="button" class="btn btn-primary" :disabled="!chain.canClaim" @click="claim">
        {{ chain.canClaim ? '交付当前任务 →' : (chain.repOk ? '目标还未完成' : `需要 ${chain.step?.rep} 声望`) }}
      </button>
      <p v-else class="hint">这条任务链已经完成。</p>
    </section>

    <section class="panel shop-box">
      <div class="section-head">
        <div>
          <p class="kicker">REPUTATION SHOP</p>
          <h2>声望商店</h2>
        </div>
        <span class="tag amber">信用点 {{ run.player.credits }}</span>
      </div>
      <div class="shop-list">
        <article v-for="offer in shop" :key="offer.key" class="shop-row">
          <div>
            <b>{{ offer.name }}</b>
            <span>需要 {{ offer.min }} 声望</span>
          </div>
          <em>{{ offer.price }} 信用点 + {{ offer.rep }} 声望</em>
          <button type="button" class="btn btn-sm" :disabled="status.score < offer.min || status.score < offer.rep || run.player.credits < offer.price" @click="buy(offer)">
            兑换
          </button>
        </article>
      </div>
    </section>
  </div>
</template>

<style scoped>
.faction-detail-page { gap: 12px; max-width: 1000px; }
.detail-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 18px; padding: 20px; }
.back-link { padding: 0; border: 0; background: transparent; color: var(--dim); font-family: var(--mono); font-size: max(var(--ui-min), calc(9px * var(--ui-scale))); cursor: pointer; }
.detail-head h1 { margin-top: 3px; font-size: max(var(--ui-min), calc(38px * var(--ui-scale))); font-weight: 300; letter-spacing: .08em; }
.detail-head .hint { margin-top: 5px; max-width: 52em; }
.detail-progress { width: 220px; flex: none; text-align: right; }
.detail-progress .faction-bar { height: 5px; border-radius: 3px; background: rgba(255, 255, 255, .07); overflow: hidden; }
.detail-progress .faction-bar i { display: block; height: 100%; background: linear-gradient(90deg, rgba(124, 231, 255, .35), var(--cyan)); }
.detail-progress span { display: block; margin-top: 6px; color: var(--dim); font-family: var(--mono); font-size: max(var(--ui-min), calc(8px * var(--ui-scale))); }
.chain-box, .shop-box { padding: 16px; }
.section-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; }
.section-head h2 { margin-top: 3px; font-size: max(var(--ui-min), calc(18px * var(--ui-scale))); font-weight: 400; }
.chain-list { margin: 12px 0; }
.chain-row { display: flex; align-items: flex-start; gap: 10px; padding: 10px 0; border-bottom: 1px solid rgba(255, 255, 255, .05); opacity: .5; }
.chain-row.is-current { opacity: 1; border-color: rgba(255, 196, 107, .28); }
.chain-row.is-done { opacity: .72; }
.chain-no { display: grid; place-items: center; width: 24px; height: 24px; flex: none; border: 1px solid var(--line); border-radius: 50%; color: var(--dim); font-family: var(--mono); font-size: max(var(--ui-min), calc(9px * var(--ui-scale))); }
.chain-row.is-current .chain-no { border-color: var(--amber); color: var(--amber); }
.chain-row.is-done .chain-no { border-color: rgba(138, 222, 184, .5); color: var(--jade); }
.chain-row b { font-size: max(var(--ui-min), calc(12px * var(--ui-scale))); font-weight: 500; }
.chain-row p { margin-top: 2px; color: var(--muted); font-size: max(var(--ui-min), calc(10px * var(--ui-scale))); line-height: 1.6; }
.chain-req { display: block; margin-top: 3px; color: var(--amber); font-family: var(--mono); font-size: max(var(--ui-min), calc(8px * var(--ui-scale))); }
.chain-state { flex: none; color: var(--dim); font-family: var(--mono); font-size: max(var(--ui-min), calc(8px * var(--ui-scale))); }
.shop-list { display: flex; flex-direction: column; gap: 5px; margin-top: 10px; }
.shop-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 9px; border: 1px solid var(--line); border-radius: 9px; background: rgba(5, 10, 16, .4); }
.shop-row div { flex: 1; }
.shop-row b { display: block; font-size: max(var(--ui-min), calc(11px * var(--ui-scale))); font-weight: 500; }
.shop-row span { display: block; color: var(--dim); font-family: var(--mono); font-size: max(var(--ui-min), calc(8px * var(--ui-scale))); }
.shop-row em { color: var(--amber); font-family: var(--mono); font-size: max(var(--ui-min), calc(8.5px * var(--ui-scale))); font-style: normal; }
@media (max-width: 650px) {
  .detail-head { flex-direction: column; padding: 15px; }
  .detail-progress { width: 100%; text-align: left; }
  .shop-row { align-items: flex-start; flex-wrap: wrap; }
}
</style>
