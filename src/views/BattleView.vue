<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { CARDS, CARD_TYPES, INTENTS } from '../game-core/combat.js'
import { REGIONS } from '../game-core/data.js'
import { play as playSound, cardSound } from '../audio.js'
import SoundToggle from '../components/SoundToggle.vue'
import { useGameStore } from '../stores/game.js'

const game = useGameStore()
const route = useRoute()
const router = useRouter()
const nodeId = String(route.params.nodeId)

const targetIndex = ref(0)
const fleeOpen = ref(false)
const fx = ref(null)
let fxTimer = null

function triggerFx(type, target = -1, label = '') {
  if (fxTimer) clearTimeout(fxTimer)
  fx.value = { type, target, label, id: Date.now() }
  fxTimer = setTimeout(() => { fx.value = null }, 520)
}

const run = computed(() => game.run)
const battle = computed(() => game.battle)
const node = computed(() => (run.value ? run.value.map.nodes[nodeId] : null))
const region = computed(() => (node.value ? REGIONS[node.value.region] : null))

const TRAIT_LABELS = {
  aggressive: '好战',
  psychic: '精神侵蚀',
  guarded: '戒备',
  minion: '随从',
  coward: '怯懦',
  armored: '护甲',
  regenerator: '再生',
  summoner: '召唤',
  frenzy: '狂暴',
}

const targetIdx = computed(() => {
  if (!battle.value) return 0
  const enemies = battle.value.enemies
  const current = enemies[targetIndex.value]
  if (current && !current.downed && !current.surrendered) return targetIndex.value
  return enemies.findIndex((enemy) => !enemy.downed && !enemy.surrendered)
})

const canAct = computed(() => battle.value?.status === 'active')

const surrendered = computed(() => !!battle.value?.enemies.some((enemy) => enemy.surrendered))
const isBoss = computed(() => battle.value?.nodeType === 'boss')

onMounted(() => {
  const created = game.ensureBattle(nodeId)
  if (!created) {
    router.replace({ name: 'map', params: { runId: run.value?.id } })
    return
  }
  playSound('battle')
  if (battle.value?.status === 'won') playSound('victory')
  if (battle.value?.status === 'lost') playSound('defeat')
})

function hpPct(entity, max) {
  return Math.max(0, Math.min(100, (entity / max) * 100))
}

function intentLabel(enemy) {
  const intent = enemy.intent
  if (!intent) return '—'
  const meta = INTENTS[intent.type]
  if (!meta) return '—'
  if (intent.type === 'attack' || intent.type === 'psychic' || intent.type === 'drain') {
    return `${meta.label} ${intent.value}`
  }
  return meta.label
}

function intentColor(enemy) {
  return `is-${INTENTS[enemy.intent?.type]?.color || 'muted'}`
}

function traitsOf(enemy) {
  return enemy.traits
    .filter((trait) => trait !== 'minion')
    .slice(0, 3)
    .map((trait) => TRAIT_LABELS[trait] || trait)
}

function statusTags(enemy) {
  const tags = []
  if (enemy.armor) tags.push(`护甲 ${enemy.armor}`)
  if (enemy.guard) tags.push(`护盾 ${enemy.guard}`)
  if (enemy.status?.bleed) tags.push(`流血 ${enemy.status.bleed.turns}`)
  if (enemy.stun) tags.push('眩晕')
  if (enemy.baseDefense && enemy.defense < enemy.baseDefense) tags.push(`破防 ${enemy.baseDefense - enemy.defense}`)
  if (enemy.enraged) tags.push('狂暴')
  if (enemy.fled) tags.push('已撤退')
  return tags
}

function selectEnemy(index) {
  const enemy = battle.value?.enemies[index]
  if (!enemy || enemy.downed || enemy.surrendered || enemy.fled) return
  targetIndex.value = index
}

function play(index) {
  if (!battle.value || !canAct.value) return
  const card = CARDS[battle.value.hand[index]]
  const beforeHp = run.value.player.hp
  const result = game.playBattleCard(index, targetIdx.value)
  if (!result?.ok) return
  const effect = card?.type === 'attack' ? 'slash' : card?.type || 'card'
  triggerFx(effect, targetIdx.value, card?.name || '')
  playSound(cardSound(card))
  if (battle.value?.status === 'won') {
    setTimeout(() => {
      triggerFx('victory', -1, '战斗结束')
      playSound('victory')
    }, 140)
  } else if (run.value.player.hp < beforeHp) {
    setTimeout(() => {
      triggerFx('player-hurt', -1, '受击')
      playSound('hurt')
    }, 100)
  }
}

function endTurn() {
  if (!battle.value || !canAct.value) return
  const beforeHp = run.value.player.hp
  const result = game.endBattleTurn()
  if (!result?.ok) return
  triggerFx('enemy', -1, '敌方行动')
  playSound('enemy')
  if (run.value.player.hp < beforeHp) {
    setTimeout(() => {
      triggerFx('player-hurt', -1, '受击')
      playSound('hurt')
    }, 180)
  }
  if (battle.value?.status === 'won') {
    setTimeout(() => {
      triggerFx('victory', -1, '战斗结束')
      playSound('victory')
    }, 160)
  }
  if (battle.value?.status === 'lost') {
    setTimeout(() => {
      triggerFx('defeat', -1, '倒下了')
      playSound('defeat')
    }, 160)
  }
}

function confirmFlee() {
  triggerFx('flee', -1, '撤离')
  playSound('flee')
  game.fleeBattle()
  fleeOpen.value = false
  router.push({ name: 'map', params: { runId: run.value?.id } })
}

function choose(choice) {
  const result = game.resolveBattleChoice(choice)
  if (!result.ok) return
  router.push({ name: 'map', params: { runId: run.value?.id } })
}

function leaveBattle() {
  game.leaveBattle()
  router.push({ name: 'map', params: { runId: run.value?.id } })
}
</script>

<template>
  <div
    v-if="battle"
    class="battle-page"
    :class="{
      'is-shaking': fx?.type === 'slash' || fx?.type === 'enemy',
      'is-victory': fx?.type === 'victory',
      'is-defeat': fx?.type === 'defeat',
    }"
  >
    <div v-if="fx" :key="fx.id" class="battle-fx" :class="`fx-${fx.type}`" aria-hidden="true">
      <span class="fx-label">{{ fx.label }}</span>
      <span class="fx-line"></span>
    </div>

    <header class="b-top">
      <div class="b-title">
        <p class="kicker">ENCOUNTER · {{ region?.name }}</p>
        <h1>{{ node?.title }}</h1>
      </div>
      <div class="b-meta">
        <span class="tag cyan">第 {{ battle.round }} 回合</span>
        <span class="tag amber">AP {{ battle.ap }}</span>
        <SoundToggle />
        <button type="button" class="icon-btn" title="撤离" @click="fleeOpen = true">✕</button>
      </div>
    </header>

    <div class="b-stage">
      <div class="enemy-row" :class="{ 'is-attacking': fx?.type === 'enemy' }">
        <button
          v-for="(enemy, index) in battle.enemies"
          :key="enemy.id"
          type="button"
          class="enemy"
          :class="{
            'is-selected': index === targetIdx,
            'is-out': enemy.downed || enemy.surrendered || enemy.fled,
            'is-hit': fx?.target === index,
          }"
          @click="selectEnemy(index)"
        >
          <span class="e-intent" :class="intentColor(enemy)">
            {{ enemy.surrendered ? '已投降' : enemy.downed ? '失去战力' : intentLabel(enemy) }}
          </span>
          <span class="e-name">{{ enemy.name }}</span>
          <span class="e-traits">
            <span v-for="trait in traitsOf(enemy)" :key="trait" class="e-trait">{{ trait }}</span>
          </span>
          <span v-if="statusTags(enemy).length" class="e-status">
            <span v-for="tag in statusTags(enemy)" :key="tag">{{ tag }}</span>
          </span>

          <span class="e-bar-label"><span>生命</span><em>{{ enemy.hp }} / {{ enemy.hpMax }}</em></span>
          <span class="bar hp"><i :style="{ width: `${hpPct(enemy.hp, enemy.hpMax)}%` }"></i></span>
          <span class="e-bar-label"><span>士气</span><em>{{ enemy.morale }} / {{ enemy.moraleMax }}</em></span>
          <span class="bar amber"><i :style="{ width: `${hpPct(enemy.morale, enemy.moraleMax)}%` }"></i></span>
        </button>
      </div>

    </div>

    <div class="b-log">
      <p v-for="(entry, index) in battle.log.slice(-3)" :key="index" :class="entry.kind">
        {{ entry.text }}
      </p>
    </div>

    <div class="b-player" :class="{ 'is-hurt': fx?.type === 'player-hurt' }">
      <div class="p-vital">
        <span class="p-label">生命 <em>{{ Math.round(run.player.hp) }} / {{ run.player.hpMax }}</em></span>
        <span class="bar hp"><i :style="{ width: `${hpPct(run.player.hp, run.player.hpMax)}%` }"></i></span>
      </div>
      <div class="p-vital">
        <span class="p-label">精神 <em>{{ Math.round(run.player.mental) }} / {{ run.player.mentalMax }}</em></span>
        <span class="bar mental" :class="{ low: run.player.mental < 30 }"><i :style="{ width: `${hpPct(run.player.mental, run.player.mentalMax)}%` }"></i></span>
      </div>
      <div class="p-buffs">
        <span class="tag">护盾 {{ battle.guard }}</span>
        <span class="tag cyan">专注 {{ battle.focus }}</span>
        <span v-if="battle.evasion" class="tag jade">闪避 {{ battle.evasion }}</span>
        <span v-if="battle.counter" class="tag amber">反击 {{ battle.counter }}</span>
      </div>
    </div>

    <div class="b-hand">
      <button
        v-for="(key, index) in battle.hand"
        :key="`${key}-${index}`"
        type="button"
        class="card"
        :class="{ 'is-disabled': canAct && battle.ap < CARDS[key].cost }"
        :disabled="!canAct || battle.ap < CARDS[key].cost"
        data-sound="none"
        @click="play(index)"
      >
        <span class="c-cost">{{ CARDS[key].cost }}</span>
        <b>{{ CARDS[key].name }}</b>
        <p>{{ CARDS[key].desc }}</p>
        <span class="c-type">{{ CARD_TYPES[CARDS[key].type] }}</span>
      </button>
      <p v-if="!battle.hand.length" class="empty-hand">手牌用尽，结束回合。</p>
    </div>

    <div class="b-actions">
      <span class="hint">护盾在本回合内吸收伤害 · 专注提升下一次攻击</span>
      <button type="button" class="btn btn-primary" :disabled="!canAct" @click="endTurn">结束回合</button>
    </div>

    <!-- 撤离确认 -->
    <div v-if="fleeOpen" class="result-backdrop" @click.self="fleeOpen = false">
      <div class="result-panel">
        <p class="kicker">WITHDRAW</p>
        <h2>撤离战斗？</h2>
        <p class="result-note">你会失去 8 点精神，并放弃这里的奖励。节点会被标记为已处理。</p>
        <div class="result-actions">
          <button type="button" class="btn btn-ghost" @click="fleeOpen = false">继续战斗</button>
          <button type="button" class="btn btn-primary" @click="confirmFlee">确认撤离</button>
        </div>
      </div>
    </div>

    <!-- 胜利处置 -->
    <div v-if="battle.status === 'won'" class="result-backdrop">
      <div class="result-panel">
        <p class="kicker">VICTORY</p>
        <h2>战斗结束</h2>
        <p class="result-note">
          {{ surrendered ? '有人放下了武器。你可以决定怎么处置。' : '所有人都失去了战斗能力。' }}
        </p>

        <div class="choices">
          <button type="button" class="choice" @click="choose('spare')">
            <b>放过</b><span>精神 +6 · 少量信用点 · 留下善意</span>
          </button>
          <button type="button" class="choice" @click="choose('disarm')">
            <b>缴械</b><span>信用点 · 可能获得材料</span>
          </button>
          <button type="button" class="choice" @click="choose('interrogate')">
            <b>审问</b><span>情报 · 少量信用点</span>
          </button>
          <button type="button" class="choice" :disabled="!surrendered || isBoss" @click="choose('recruit')">
            <b>招募</b>
            <span>{{ isBoss ? '首领不会跟你走' : surrendered ? '加入队伍 · 成为同伴' : '需要对方投降' }}</span>
          </button>
          <button type="button" class="choice is-dark" @click="choose('execute')">
            <b>下狠手</b><span>更多信用点 · 精神 -10 · 留下恶名</span>
          </button>
        </div>

        <p class="result-note dim">处置会写进这一局的记录，并影响后续 NPC 与派系态度。</p>
      </div>
    </div>

    <!-- 战败 -->
    <div v-if="battle.status === 'lost'" class="result-backdrop">
      <div class="result-panel">
        <p class="kicker">DOWN</p>
        <h2>你倒下了</h2>
        <p class="result-note">
          损失 {{ battle.defeat?.credits || 0 }} 信用点。你在节点旁醒来，耳鸣了很久。
        </p>
        <div class="result-actions">
          <button type="button" class="btn btn-primary" @click="leaveBattle">返回星图</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.battle-page {
  position: relative;
  height: 100%;
  width: 100%;
  max-width: 1080px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px 14px calc(10px + env(safe-area-inset-bottom));
  padding-top: max(10px, env(safe-area-inset-top));
  overflow: hidden;
}
.battle-page.is-shaking { animation: battle-shake .32s cubic-bezier(.36, .07, .19, .97); }
.battle-fx { position: absolute; inset: 0; z-index: 35; pointer-events: none; overflow: hidden; }
.battle-fx .fx-label {
  position: absolute;
  left: 50%;
  top: 23%;
  transform: translate(-50%, -50%);
  padding: 4px 10px;
  border: 1px solid rgba(124, 231, 255, .35);
  border-radius: 5px;
  background: rgba(4, 8, 13, .72);
  color: var(--cyan);
  font-family: var(--mono);
  font-size: max(var(--ui-min), calc(10px * var(--ui-scale)));
  letter-spacing: .12em;
  white-space: nowrap;
  animation: fx-label .52s ease-out both;
}
.fx-line {
  position: absolute;
  left: 50%;
  top: 50%;
  display: block;
  pointer-events: none;
}
.fx-slash .fx-line {
  width: 150%;
  height: 2px;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,.95), rgba(124,231,255,.6), transparent);
  box-shadow: 0 0 18px rgba(124, 231, 255, .7);
  transform: translate(-50%, -50%) rotate(-20deg);
  animation: fx-slash .34s ease-out both;
}
.fx-psychic .fx-line {
  width: 120%;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(185,164,255,.9), transparent);
  box-shadow: 0 0 24px rgba(185, 164, 255, .8);
  transform: translate(-50%, -50%) rotate(72deg);
  animation: fx-psychic .45s ease-out both;
}
.fx-guard .fx-line, .fx-heal .fx-line {
  width: 150px;
  height: 150px;
  border: 2px solid rgba(138, 222, 184, .8);
  border-radius: 50%;
  box-shadow: 0 0 42px rgba(138, 222, 184, .32), inset 0 0 30px rgba(138, 222, 184, .16);
  transform: translate(-50%, -50%);
  animation: fx-ring .5s ease-out both;
}
.fx-psychic .fx-label { border-color: rgba(185, 164, 255, .45); color: var(--violet); }
.fx-guard .fx-label, .fx-heal .fx-label { border-color: rgba(138, 222, 184, .4); color: var(--jade); }
.fx-enemy .fx-line {
  width: 100%;
  height: 100%;
  background: radial-gradient(circle at 50% 50%, transparent 28%, rgba(255, 138, 138, .16) 74%, rgba(255, 138, 138, .3));
  transform: none;
  animation: fx-flash .42s ease-out both;
}
.fx-enemy .fx-label, .fx-player-hurt .fx-label, .fx-defeat .fx-label { border-color: rgba(255, 138, 138, .45); color: var(--red); }
.fx-player-hurt .fx-line {
  width: 100%;
  height: 100%;
  background: radial-gradient(circle at 50% 66%, rgba(255, 138, 138, .28), transparent 52%);
  animation: fx-flash .42s ease-out both;
}
.fx-victory .fx-line {
  width: 100%;
  height: 100%;
  background: radial-gradient(circle at 50% 45%, rgba(255, 196, 107, .22), transparent 60%);
  animation: fx-flash .6s ease-out both;
}
.fx-victory .fx-label { border-color: rgba(255, 196, 107, .5); color: var(--amber); }
.fx-defeat .fx-line { width: 100%; height: 100%; background: rgba(80, 10, 14, .2); animation: fx-flash .6s ease-out both; }
.fx-flee .fx-line { width: 100%; height: 100%; background: radial-gradient(circle, transparent 20%, rgba(124, 231, 255, .1)); animation: fx-flash .4s ease-out both; }
.enemy.is-hit { animation: enemy-hit .38s cubic-bezier(.36, .07, .19, .97); border-color: rgba(255, 138, 138, .65); }
.enemy-row.is-attacking { animation: enemy-lunge .42s ease-out; }
.b-player.is-hurt { animation: player-hurt .42s cubic-bezier(.36, .07, .19, .97); border-color: rgba(255, 138, 138, .5); }
.battle-page.is-victory .result-panel, .battle-page.is-defeat .result-panel { animation: result-rise .45s ease-out both; }

@keyframes battle-shake {
  0%, 100% { transform: translateX(0); }
  20% { transform: translateX(-5px); }
  40% { transform: translateX(4px); }
  60% { transform: translateX(-3px); }
  80% { transform: translateX(2px); }
}
@keyframes enemy-hit {
  0%, 100% { transform: translateX(0); filter: none; }
  20% { transform: translateX(-7px) rotate(-1deg); filter: brightness(1.8); }
  45% { transform: translateX(5px); }
  70% { transform: translateX(-3px); }
}
@keyframes enemy-lunge {
  0%, 100% { transform: translateY(0); }
  35% { transform: translateY(-7px) scale(1.02); }
  65% { transform: translateY(2px); }
}
@keyframes player-hurt {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-6px); background: rgba(255, 138, 138, .12); }
  55% { transform: translateX(5px); }
  80% { transform: translateX(-2px); }
}
@keyframes fx-slash {
  0% { opacity: 0; transform: translate(-50%, -50%) rotate(-20deg) scaleX(.2); }
  25% { opacity: 1; }
  100% { opacity: 0; transform: translate(-50%, -50%) rotate(-20deg) scaleX(1.05); }
}
@keyframes fx-psychic {
  0% { opacity: 0; transform: translate(-50%, -50%) rotate(72deg) scaleX(.1); }
  35% { opacity: 1; }
  100% { opacity: 0; transform: translate(-50%, -50%) rotate(72deg) scaleX(1.1); }
}
@keyframes fx-ring {
  0% { opacity: 0; transform: translate(-50%, -50%) scale(.45); }
  30% { opacity: 1; }
  100% { opacity: 0; transform: translate(-50%, -50%) scale(1.35); }
}
@keyframes fx-flash {
  0% { opacity: 0; }
  25% { opacity: 1; }
  100% { opacity: 0; }
}
@keyframes fx-label {
  0% { opacity: 0; transform: translate(-50%, -42%) scale(.9); }
  25%, 70% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
  100% { opacity: 0; transform: translate(-50%, -58%) scale(.98); }
}
@keyframes result-rise {
  0% { opacity: 0; transform: translateY(14px) scale(.98); }
  100% { opacity: 1; transform: translateY(0) scale(1); }
}

.b-top { flex: none; display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; }
.b-title h1 { margin-top: 2px; font-size: max(var(--ui-min), calc(19px * var(--ui-scale))); font-weight: 300; letter-spacing: 0.08em; }
.b-meta { display: flex; align-items: center; gap: 5px; flex-wrap: wrap; justify-content: flex-end; }

.b-stage {
  position: relative;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.b-stage::before {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    radial-gradient(60% 46% at 50% 42%, rgba(124, 231, 255, .055), transparent 72%),
    repeating-linear-gradient(to bottom, rgba(255, 255, 255, .02) 0 1px, transparent 1px 4px);
  mask-image: radial-gradient(circle at 50% 45%, #000, transparent 80%);
}
.b-stage::after {
  content: "";
  position: absolute;
  left: 50%;
  top: 50%;
  width: min(74%, 520px);
  aspect-ratio: 1.7;
  transform: translate(-50%, -50%);
  border: 1px solid rgba(124, 231, 255, .08);
  border-radius: 50%;
  box-shadow:
    inset 0 0 70px rgba(124, 231, 255, .04),
    0 0 60px rgba(124, 231, 255, .03);
  pointer-events: none;
}
.enemy-row {
  position: relative;
  z-index: 1;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: stretch;
  align-content: center;
  justify-content: center;
  padding: 4px;
}
.enemy {
  position: relative;
  flex: 1 1 160px;
  max-width: 250px;
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 11px;
  border: 1px solid var(--line);
  border-radius: 13px;
  background:
    radial-gradient(160px 100px at 80% 0%, rgba(255, 138, 138, .08), transparent 70%),
    rgba(5, 10, 16, .55);
  text-align: left;
  cursor: pointer;
  transition: border-color .16s ease, background .16s ease, opacity .16s ease;
}
.enemy.is-selected { border-color: rgba(124, 231, 255, .5); box-shadow: 0 0 24px -12px rgba(124, 231, 255, .8); }
.enemy.is-out { opacity: .38; cursor: default; }
.e-intent {
  align-self: flex-start;
  padding: 2px 7px;
  border: 1px solid var(--line);
  border-radius: 999px;
  font-family: var(--mono);
  font-size: max(var(--ui-min), calc(8.5px * var(--ui-scale)));
  letter-spacing: 0.04em;
}
.e-intent.is-red { border-color: rgba(255, 138, 138, .36); color: var(--red); }
.e-intent.is-violet { border-color: rgba(185, 164, 255, .36); color: var(--violet); }
.e-intent.is-amber { border-color: rgba(255, 196, 107, .36); color: var(--amber); }
.e-intent.is-cyan { border-color: rgba(124, 231, 255, .3); color: var(--cyan); }
.e-intent.is-muted { color: var(--dim); }
.e-name { font-size: max(var(--ui-min), calc(13px * var(--ui-scale))); font-weight: 500; letter-spacing: 0.04em; }
.e-traits { display: flex; gap: 3px; flex-wrap: wrap; min-height: 14px; }
.e-trait { color: var(--dim); font-family: var(--mono); font-size: max(var(--ui-min), calc(8px * var(--ui-scale))); }
.e-status { display: flex; flex-wrap: wrap; gap: 3px; margin: 1px 0; }
.e-status span {
  padding: 1px 4px;
  border: 1px solid rgba(255, 196, 107, .24);
  border-radius: 3px;
  color: var(--amber);
  font-family: var(--mono);
  font-size: max(var(--ui-min), calc(7.5px * var(--ui-scale)));
}
.e-bar-label { display: flex; justify-content: space-between; gap: 6px; margin-top: 2px; color: var(--dim); font-size: max(var(--ui-min), calc(8.5px * var(--ui-scale))); }
.e-bar-label em { font-family: var(--mono); font-style: normal; }
.enemy .bar { height: 4px; }

.b-log {
  position: relative;
  z-index: 1;
  flex: none;
  min-height: 48px;
  max-height: 66px;
  overflow: hidden;
  padding: 7px 10px;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: rgba(4, 8, 13, .62);
}
.b-log p { color: var(--muted); font-size: max(var(--ui-min), calc(10px * var(--ui-scale))); line-height: 1.55; }
.b-log p.good { color: var(--jade); }
.b-log p.bad { color: var(--red); }
.b-log p.story { color: var(--ink); }

.b-player {
  flex: none;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  padding: 8px 11px;
  border: 1px solid var(--line);
  border-radius: 11px;
  background: rgba(5, 10, 16, .5);
}
.p-label { display: flex; justify-content: space-between; gap: 6px; color: var(--dim); font-size: max(var(--ui-min), calc(9px * var(--ui-scale))); }
.p-label em { color: var(--muted); font-family: var(--mono); font-style: normal; }
.p-vital .bar { height: 5px; margin-top: 4px; }
.p-buffs { display: flex; gap: 4px; }

.b-hand {
  flex: none;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 6px;
  width: 100%;
}
.card {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-height: 112px;
  padding: 9px 9px 8px;
  border: 1px solid var(--line-2);
  border-radius: 12px;
  background:
    radial-gradient(140px 90px at 90% 0%, rgba(255, 196, 107, .12), transparent 70%),
    linear-gradient(165deg, rgba(20, 32, 45, .95), rgba(6, 11, 17, .98));
  text-align: left;
  cursor: pointer;
  transition: transform .14s ease, border-color .14s ease, opacity .14s ease;
}
@media (hover: hover) {
  .card:hover:not(:disabled) { transform: translateY(-3px); border-color: rgba(255, 196, 107, .55); }
}
.card:disabled, .card.is-disabled { opacity: .38; cursor: not-allowed; }
.c-cost {
  position: absolute;
  top: 7px;
  right: 7px;
  display: grid;
  place-items: center;
  width: 19px;
  height: 19px;
  border-radius: 50%;
  background: rgba(255, 196, 107, .16);
  color: var(--amber);
  font-family: var(--mono);
  font-size: max(var(--ui-min), calc(10px * var(--ui-scale)));
}
.card b { padding-right: 22px; font-size: max(var(--ui-min), calc(12.5px * var(--ui-scale))); font-weight: 500; letter-spacing: 0.04em; }
.card p {
  flex: 1;
  color: var(--dim);
  font-size: max(var(--ui-min), calc(9px * var(--ui-scale)));
  line-height: 1.6;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.c-type { color: rgba(124, 231, 255, .65); font-family: var(--mono); font-size: max(var(--ui-min), calc(8px * var(--ui-scale))); letter-spacing: 0.1em; }
.empty-hand { grid-column: 1 / -1; color: var(--dim); font-size: max(var(--ui-min), calc(10px * var(--ui-scale))); text-align: center; padding: 14px 0; }

.b-actions { flex: none; display: flex; align-items: center; gap: 10px; }
.b-actions .hint { flex: 1; }
.b-actions .btn { min-width: 120px; }

/* 结果面板 */
.result-backdrop {
  position: fixed;
  inset: 0;
  z-index: 150;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 18px;
  background: rgba(2, 5, 9, .78);
  backdrop-filter: blur(10px);
}
.result-panel {
  width: min(520px, 100%);
  max-height: 90dvh;
  overflow-y: auto;
  padding: 20px;
  border: 1px solid var(--line-2);
  border-radius: 20px;
  background:
    radial-gradient(500px 240px at 90% -10%, rgba(255, 196, 107, .1), transparent 65%),
    linear-gradient(170deg, rgba(12, 20, 29, .98), rgba(4, 8, 13, .99));
  box-shadow: 0 40px 100px -30px #000;
}
.result-panel h2 { margin-top: 4px; font-size: max(var(--ui-min), calc(24px * var(--ui-scale))); font-weight: 300; letter-spacing: 0.1em; }
.result-note { margin-top: 6px; color: var(--muted); font-size: max(var(--ui-min), calc(11px * var(--ui-scale))); line-height: 1.8; }
.result-note.dim { margin-top: 12px; color: var(--dim); font-size: max(var(--ui-min), calc(10px * var(--ui-scale))); }

.choices { display: flex; flex-direction: column; gap: 6px; margin-top: 14px; }
.choice {
  display: flex;
  align-items: baseline;
  gap: 10px;
  padding: 10px 12px;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: rgba(5, 10, 16, .5);
  text-align: left;
  cursor: pointer;
}
.choice b { flex: none; width: 46px; font-size: max(var(--ui-min), calc(12px * var(--ui-scale))); font-weight: 500; }
.choice span { color: var(--dim); font-size: max(var(--ui-min), calc(9.5px * var(--ui-scale))); line-height: 1.6; }
.choice:disabled { opacity: .35; cursor: not-allowed; }
.choice.is-dark { border-color: rgba(255, 138, 138, .25); }
.choice.is-dark b { color: var(--red); }
@media (hover: hover) {
  .choice:hover:not(:disabled) { border-color: var(--line-2); background: rgba(124, 231, 255, .06); }
}

.result-actions { display: flex; gap: 7px; justify-content: flex-end; margin-top: 16px; }

@media (max-width: 899px) {
  .battle-page { padding: 9px 10px calc(9px + env(safe-area-inset-bottom)); padding-top: max(9px, env(safe-area-inset-top)); gap: 7px; }
  .b-title h1 { font-size: max(var(--ui-min), calc(16px * var(--ui-scale))); }
  .b-meta .tag { font-size: max(var(--ui-min), calc(8.5px * var(--ui-scale))); }
  .enemy-row { grid-template-columns: repeat(auto-fit, minmax(132px, 1fr)); }
  .enemy { padding: 9px; }
  .e-name { font-size: max(var(--ui-min), calc(12px * var(--ui-scale))); }
  .b-player { grid-template-columns: 1fr 1fr; gap: 7px; padding: 7px 9px; }
  .p-buffs { grid-column: 1 / -1; }
  .card { min-height: 104px; padding: 8px 7px; }
  .card b { font-size: max(var(--ui-min), calc(11.5px * var(--ui-scale))); }
  .card p { font-size: max(var(--ui-min), calc(8.5px * var(--ui-scale))); -webkit-line-clamp: 2; }
  .b-actions .hint { display: none; }
  .b-actions .btn { flex: 1; }
  .result-panel { padding: 16px; border-radius: 16px; }
  .result-panel h2 { font-size: max(var(--ui-min), calc(21px * var(--ui-scale))); }
}

@media (max-width: 430px) {
  .b-hand { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .card { min-height: 96px; }
  .card b { font-size: max(var(--ui-min), calc(12px * var(--ui-scale))); }
  .card p { font-size: max(var(--ui-min), calc(9px * var(--ui-scale))); -webkit-line-clamp: 2; }
  .enemy-row { align-content: center; }
  .enemy { flex-basis: 200px; }
}
</style>
