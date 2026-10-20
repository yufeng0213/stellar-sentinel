<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  ABOS, ATTRS, ATTR_MAX, ATTR_NAME, BASE_ATTR, FLAWS, ITEMS, LANDSCAPES, NAMES,
  ORIGINS, ORIGIN_CATEGORIES, ROLES, SCENTS, SKILLS, SPECIES, TRAITS,
} from '../game-core/data.js'
import {
  buildPreview, finalAttrs, freePointsOf, isValidDraft, modsOf, newDraft, pointsLeft, randomDraft,
} from '../game-core/character.js'
import { useGameStore } from '../stores/game.js'

const router = useRouter()
const game = useGameStore()

const draft = reactive(newDraft())
const step = ref(0)
const hasSave = ref(false)
const originCategory = ref('全部')

const steps = ['身份', '道路', '图景', '属性', '确认']
const left = computed(() => pointsLeft(draft))
const totalPoints = computed(() => freePointsOf(draft))
const preview = computed(() => buildPreview(draft))
const mods = computed(() => modsOf(draft))
const attrs = computed(() => finalAttrs(draft))
const last = computed(() => step.value === 4)
const needSkills = computed(() => 2 - draft.skills.length)
const needTraits = computed(() => 2 - draft.traits.length)
const flaw = computed(() => FLAWS[draft.flaw] || null)
const origin = computed(() => ORIGINS[draft.origin] || ORIGINS.colonist)
const species = computed(() => SPECIES[draft.species] || SPECIES.human)
const landscape = computed(() => LANDSCAPES[draft.landscape] || LANDSCAPES.snowfield)
const scent = computed(() => SCENTS[draft.scent] || SCENTS.rain)
const role = computed(() => ROLES[draft.role] || ROLES.sentinel)
const abo = computed(() => ABOS[draft.abo] || ABOS.beta)

const speciesList = Object.values(SPECIES)
const scentList = Object.values(SCENTS)
const landscapeList = Object.values(LANDSCAPES)
const skillList = Object.values(SKILLS)
const flawList = Object.values(FLAWS)
const traitList = Object.values(TRAITS)
const roleList = Object.values(ROLES)

const originCats = ['全部', ...ORIGIN_CATEGORIES]
const originList = computed(() => {
  const all = Object.values(ORIGINS)
  if (originCategory.value === '全部') return all
  return all.filter((item) => item.category === originCategory.value)
})

const factionLabels = {
  tower: '白塔残余',
  market: '黑市网络',
  drifters: '漂流者',
  whisper: '低语者',
}

const nextText = computed(() => {
  if (!last.value) return '下一步'
  if (left.value > 0) return `还有 ${left.value} 点`
  if (left.value < 0) return `超支 ${-left.value} 点`
  if (needSkills.value > 0) return `还需 ${needSkills.value} 项能力`
  if (needTraits.value > 0) return `还需 ${needTraits.value} 项特质`
  return '进入星区'
})

const hint = computed(() => ([
  '人种改写身体，ABO 改写倾向，气味改写别人对你的第一判断。',
  '职业是你的行动方式，出身是你的起点。26 种出身会带来不同物资与被动。',
  needSkills.value > 0 ? `还需选择 ${needSkills.value} 项能力` : '能力已选满。',
  left.value === 0 ? '属性已分配完毕，缺陷会额外提供点数。' : (left.value > 0 ? `还剩 ${left.value} 点属性` : `超支 ${-left.value} 点`),
  needTraits.value > 0 ? `还需选择 ${needTraits.value} 项特质` : '准备完毕，可以进入星区。',
][step.value]))

onMounted(() => {
  hasSave.value = game.hasSave()
})

function modText(mod) {
  if (!mod) return '无属性修正'
  const text = Object.entries(mod)
    .filter(([, value]) => value)
    .map(([key, value]) => `${ATTR_NAME[key] || key}${value > 0 ? '+' : ''}${value}`)
    .join(' · ')
  return text || '无属性修正'
}

function itemList(items) {
  return Object.entries(items || {}).map(([key, count]) => ({
    key,
    count,
    name: ITEMS[key]?.name || key,
  }))
}

function setSpecies(key) { draft.species = key }
function setAbo(key) { draft.abo = key }
function setScent(key) { draft.scent = key }
function setRole(key) { draft.role = key }
function setOrigin(key) { draft.origin = key }
function setLandscape(key) { draft.landscape = key }
function setFlaw(key) { draft.flaw = key }

function incAttr(key) {
  if (left.value <= 0 || draft.attrs[key] >= ATTR_MAX) return
  draft.attrs[key] += 1
}

function decAttr(key) {
  if (draft.attrs[key] <= BASE_ATTR) return
  draft.attrs[key] -= 1
}

function toggleSkill(key) {
  const index = draft.skills.indexOf(key)
  if (index >= 0) {
    draft.skills.splice(index, 1)
    return
  }
  if (draft.skills.length >= 2) {
    game.notify('最多选择 2 项能力', 'bad')
    return
  }
  draft.skills.push(key)
}

function toggleTrait(key) {
  const index = draft.traits.indexOf(key)
  if (index >= 0) {
    draft.traits.splice(index, 1)
    return
  }
  if (draft.traits.length >= 2) {
    game.notify('最多选择 2 项特质', 'bad')
    return
  }
  draft.traits.push(key)
}

function randomName() {
  draft.name = NAMES[Math.floor(Math.random() * NAMES.length)]
}

function randomize() {
  Object.assign(draft, randomDraft())
  step.value = 4
  game.notify('已生成一套随机开局', 'good')
}

function prev() {
  if (step.value > 0) step.value -= 1
}

function next() {
  if (step.value === 2 && draft.skills.length !== 2) {
    game.notify('请选择 2 项能力', 'bad')
    return
  }
  if (step.value === 3) {
    if (!flaw.value) {
      game.notify('请选择 1 项缺陷', 'bad')
      return
    }
    if (left.value !== 0) {
      game.notify(left.value > 0 ? '还有属性点未分配' : '属性点超支', 'bad')
      return
    }
  }
  if (!last.value) {
    step.value += 1
    return
  }
  if (!isValidDraft(draft)) {
    game.notify('请完成属性、能力、缺陷与特质选择', 'bad')
    return
  }
  const run = game.newRun(draft)
  router.push({ name: 'map', params: { runId: run.id } })
}

function resume() {
  const run = game.resume()
  if (!run) return game.notify('没有找到存档', 'bad')
  router.push({ name: 'map', params: { runId: run.id } })
}

function backToTitle() {
  router.push('/')
}
</script>

<template>
  <div class="create-shell">
    <div class="wizard">
      <header class="wizard-head">
        <button type="button" class="brand brand-btn" @click="backToTitle">
          <span class="sigil" aria-hidden="true"><i></i></span>
          <span class="brand-text">
            <b>角色创建</b>
            <small>STELLAR SENTINEL</small>
          </span>
        </button>
        <div class="wizard-actions">
          <button v-if="hasSave" type="button" class="btn btn-ghost btn-sm" @click="resume">读档</button>
          <button type="button" class="btn btn-ghost btn-sm" @click="randomize">随机开局</button>
        </div>
      </header>

      <div class="wsteps">
        <span
          v-for="(item, index) in steps"
          :key="item"
          class="wstep"
          :class="{ 'is-done': index < step, 'is-on': index === step }"
          :data-num="String(index + 1).padStart(2, '0')"
        >
          <span class="wstep-full">{{ String(index + 1).padStart(2, '0') }} {{ item }}</span>
        </span>
      </div>
      <div class="wizard-progress"><i :style="{ width: `${((step + 1) / steps.length) * 100}%` }"></i></div>

      <div class="wizard-body">
        <!-- 01 身份 -->
        <section v-if="step === 0" class="step">
          <p class="kicker">STEP 01 / 05 · IDENTITY</p>
          <h2 class="step-title">在星区里，<em>你是谁？</em></h2>
          <p class="step-sub">人种决定身体与感官，ABO 决定信息素倾向，气味决定别人第一眼怎么判断你。</p>

          <label class="field name-field">
            <span>代号</span>
            <div class="name-row">
              <input v-model="draft.name" maxlength="10" placeholder="输入你的代号" autocomplete="off" />
              <button type="button" class="btn btn-ghost btn-sm" @click="randomName">随机</button>
            </div>
          </label>

          <div class="section-head">
            <span><b>人种</b><em>SPECIES</em></span>
            <span class="tag cyan">{{ species.name }}</span>
          </div>
          <div class="pick-grid species-grid">
            <button
              v-for="item in speciesList"
              :key="item.key"
              type="button"
              class="pick"
              :class="{ 'is-on': draft.species === item.key }"
              @click="setSpecies(item.key)"
            >
              <span class="pick-top"><b>{{ item.name }}</b><em>{{ item.code }}</em></span>
              <span class="pick-tag">{{ item.tag }}</span>
              <p>{{ item.desc }}</p>
              <span class="pick-foot">{{ modText(item.mod) }} · {{ item.perkText }}</span>
            </button>
          </div>

          <div class="section-head">
            <span><b>第二性别</b><em>ABO</em></span>
            <span class="tag amber">{{ abo.code }} {{ abo.name }}</span>
          </div>
          <div class="abo-grid">
            <button
              v-for="item in ABOS"
              :key="item.key"
              type="button"
              class="abo"
              :class="{ 'is-on': draft.abo === item.key }"
              :style="{ '--accent': item.accent }"
              @click="setAbo(item.key)"
            >
              <span class="abo-top">
                <span class="abo-letter">{{ item.code }}</span>
                <b>{{ item.name }}</b>
                <span class="abo-tag">{{ item.tag }}</span>
              </span>
              <p>{{ item.desc }}</p>
            </button>
          </div>

          <div class="section-head">
            <span><b>信息素气味</b><em>SCENT</em></span>
            <span class="tag">{{ scent.name }}</span>
          </div>
          <div class="pick-grid scent-grid">
            <button
              v-for="item in scentList"
              :key="item.key"
              type="button"
              class="pick pick-sm"
              :class="{ 'is-on': draft.scent === item.key }"
              @click="setScent(item.key)"
            >
              <span class="pick-top">
                <b>{{ item.name }}</b>
                <em>{{ item.faction ? factionLabels[item.faction] : '无派系' }}</em>
              </span>
              <p>{{ item.desc }}</p>
              <span class="pick-foot">{{ modText(item.mod) }}</span>
            </button>
          </div>
        </section>

        <!-- 02 职业与出身 -->
        <section v-else-if="step === 1" class="step">
          <p class="kicker">STEP 02 / 05 · PATH</p>
          <h2 class="step-title">你带着什么<em>来到这里？</em></h2>
          <p class="step-sub">职业决定行动方式，出身决定起始物资、信用点和一项被动。26 种出身分布在不同圈层。</p>

          <div class="section-head">
            <span><b>职业</b><em>ROLE</em></span>
            <span class="tag">{{ role.name }}</span>
          </div>
          <div class="role-grid">
            <button
              v-for="item in roleList"
              :key="item.key"
              type="button"
              class="role"
              :class="{ 'is-on': draft.role === item.key }"
              @click="setRole(item.key)"
            >
              <span class="role-mark">{{ item.code }}</span>
              <span class="role-body">
                <b>{{ item.name }}</b>
                <p>{{ item.desc }}</p>
              </span>
            </button>
          </div>

          <div class="section-head">
            <span><b>出身</b><em>ORIGIN</em></span>
            <span class="tag amber">{{ origin.category }} · {{ origin.code }}</span>
          </div>
          <div class="chips">
            <button
              v-for="cat in originCats"
              :key="cat"
              type="button"
              class="chip"
              :class="{ 'is-on': originCategory === cat }"
              @click="originCategory = cat"
            >{{ cat }}</button>
          </div>
          <div class="pick-detail">
            <div class="detail-head">
              <b>{{ origin.name }}</b>
              <span class="tag amber">{{ origin.category }}</span>
            </div>
            <p>{{ origin.desc }}</p>
            <div class="detail-rows">
              <span>{{ modText(origin.mod) }}</span>
              <span>信用点 {{ origin.credits }}</span>
              <span>{{ origin.perkText }}</span>
            </div>
            <div class="sum-items">
              <span v-for="item in itemList(origin.items)" :key="item.key" class="tag">
                {{ item.name }} ×{{ item.count }}
              </span>
            </div>
          </div>
        <div class="origin-grid">
            <button
              v-for="item in originList"
              :key="item.key"
              type="button"
              class="origin"
              :class="{ 'is-on': draft.origin === item.key }"
              @click="setOrigin(item.key)"
            >
              <b>{{ item.name }}</b>
              <span>{{ item.desc }}</span>
            </button>
          </div>

          </section>

        <!-- 03 图景与能力 -->
        <section v-else-if="step === 2" class="step">
          <p class="kicker">STEP 03 / 05 · MIND</p>
          <h2 class="step-title">你的精神<em>长什么样？</em></h2>
          <p class="step-sub">图景是被动倾向，能力是主动玩法。能力选 2 项，会直接进入判定与对话。</p>
          <div class="step-status">
            <span class="tag cyan">{{ landscape.name }}</span>
            <span class="tag" :class="needSkills === 0 ? 'jade' : 'amber'">能力 {{ draft.skills.length }} / 2</span>
          </div>

          <div class="section-head">
            <span><b>精神图景</b><em>LANDSCAPE</em></span>
            <span class="tag cyan">{{ landscape.name }}</span>
          </div>
          <div class="pick-grid landscape-grid">
            <button
              v-for="item in landscapeList"
              :key="item.key"
              type="button"
              class="pick"
              :class="{ 'is-on': draft.landscape === item.key }"
              @click="setLandscape(item.key)"
            >
              <span class="pick-top"><b>{{ item.name }}</b><em>{{ item.code }}</em></span>
              <span class="pick-tag">{{ item.tag }}</span>
              <p>{{ item.desc }}</p>
              <span class="pick-foot">{{ modText(item.mod) }} · {{ item.perkText }}</span>
            </button>
          </div>

          <div class="section-head">
            <span><b>能力</b><em>SKILLS · 选 2</em></span>
            <span class="tag" :class="needSkills === 0 ? 'jade' : 'amber'">
              {{ draft.skills.length }} / 2
            </span>
          </div>
          <div class="skill-grid">
            <button
              v-for="item in skillList"
              :key="item.key"
              type="button"
              class="skill"
              :class="{ 'is-on': draft.skills.includes(item.key) }"
              @click="toggleSkill(item.key)"
            >
              <span class="skill-head">
                <b>{{ item.name }}</b>
                <span class="tag">{{ ATTR_NAME[item.attr] }}</span>
              </span>
              <p>{{ item.desc }}</p>
            </button>
          </div>
        </section>

        <!-- 04 属性与缺陷 -->
        <section v-else-if="step === 3" class="step">
          <p class="kicker">STEP 04 / 05 · BODY & BURDEN</p>
          <h2 class="step-title">分配你的<em>属性与缺陷</em></h2>
          <p class="step-sub">基础 3 点，8 项属性。缺陷会额外给点数，也会带来真实代价。敏捷用于潜行与扒窃，机缘影响暴击与意外。</p>

          <div class="points-head">
            <span>剩余点数</span>
            <b :class="{ bad: left < 0 }">{{ left }}<small>/ {{ totalPoints }}</small></b>
          </div>

          <div class="attr-editor">
            <div v-for="attr in ATTRS" :key="attr.key" class="arow">
              <div class="arow-name">
                <b>{{ attr.name }}</b>
                <span>{{ attr.desc }}</span>
              </div>
              <div class="arow-bar">
                <i :style="{ width: `${Math.min(100, Math.max(4, ((draft.attrs[attr.key] + (mods[attr.key] || 0)) / 14) * 100))}%` }"></i>
              </div>
              <div class="arow-ctl">
                <button type="button" :disabled="draft.attrs[attr.key] <= BASE_ATTR" @click="decAttr(attr.key)">−</button>
                <b>{{ draft.attrs[attr.key] }}</b>
                <em>{{ mods[attr.key] ? `${mods[attr.key] > 0 ? '+' : ''}${mods[attr.key]}` : '' }}</em>
                <button
                  type="button"
                  :disabled="draft.attrs[attr.key] >= ATTR_MAX || left <= 0"
                  @click="incAttr(attr.key)"
                >+</button>
              </div>
            </div>
          </div>

          <div class="section-head">
            <span><b>缺陷</b><em>FLAW · 选 1</em></span>
            <span class="tag" :class="flaw ? 'red' : 'amber'">+{{ flaw?.points || 0 }} 点</span>
          </div>
          <div class="flaw-grid">
            <button
              v-for="item in flawList"
              :key="item.key"
              type="button"
              class="flaw"
              :class="{ 'is-on': draft.flaw === item.key }"
              @click="setFlaw(item.key)"
            >
              <span class="flaw-top"><b>{{ item.name }}</b><em>+{{ item.points }}</em></span>
              <p>{{ item.desc }}</p>
            </button>
          </div>
          <p v-if="left < 0" class="bad-note">属性点超支。减少一些属性，或换一个点数更低的缺陷。</p>
        </section>

        <!-- 05 特质与确认 -->
        <section v-else class="step">
          <p class="kicker">STEP 05 / 05 · CONFIRM</p>
          <h2 class="step-title">最后，<em>两个标签</em></h2>
          <p class="step-sub">特质会直接改写判定。选两个，然后进入星区。</p>

          <div class="summary">
            <div>
              <div class="sum-id">
                <span class="sum-ava">{{ (draft.name || '无').slice(0, 1) }}</span>
                <div>
                  <b>{{ draft.name || '无名者' }}</b>
                  <p>{{ species.name }} · {{ abo.name }} · {{ role.name }} · {{ origin.name }}</p>
                </div>
              </div>
              <div class="sum-attrs">
                <div v-for="attr in ATTRS" :key="attr.key">
                  <span>{{ attr.name }}</span>
                  <b>{{ attrs[attr.key] }}</b>
                </div>
              </div>
            </div>
            <div>
              <div class="sum-row"><span>气味 / 图景</span><b>{{ scent.name }} / {{ landscape.name }}</b></div>
              <div class="sum-row"><span>缺陷</span><b class="red-text">{{ flaw?.name || '无' }}</b></div>
              <div class="sum-row"><span>生命 / 精神</span><b>{{ preview.hpMax }} / {{ preview.mentalMax }}</b></div>
              <div class="sum-row"><span>信用点</span><b>{{ preview.credits }}</b></div>
              <div class="sum-items">
                <span v-for="item in itemList(preview.items)" :key="item.key" class="tag">
                  {{ item.name }} ×{{ item.count }}
                </span>
                <span v-for="key in draft.skills" :key="key" class="tag cyan">{{ SKILLS[key].name }}</span>
                <span v-for="key in draft.traits" :key="key" class="tag jade">{{ TRAITS[key].name }}</span>
              </div>
            </div>
          </div>
        <div class="trait-grid">
            <button
              v-for="item in traitList"
              :key="item.key"
              type="button"
              class="trait"
              :class="{ 'is-on': draft.traits.includes(item.key) }"
              @click="toggleTrait(item.key)"
            >
              <i></i>
              <span>
                <b>{{ item.name }}</b>
                <span>{{ item.desc }}</span>
              </span>
            </button>
          </div>

          </section>

        <div v-if="step < 4" class="mini-profile">
          <span class="kicker">DRAFT</span>
          <span class="tag amber">{{ abo.code }} {{ abo.name }}</span>
          <span class="tag cyan">{{ species.name }}</span>
          <span class="tag">{{ role.name }}</span>
          <span class="tag">{{ origin.name }}</span>
          <span class="tag jade">{{ left }} 点可用</span>
        </div>
      </div>

      <footer class="wizard-foot">
        <button type="button" class="btn btn-ghost" :disabled="step === 0" @click="prev">上一步</button>
        <div class="wizard-hint">{{ hint }}</div>
        <button type="button" class="btn btn-primary" @click="next">{{ nextText }}</button>
      </footer>
    </div>
  </div>
</template>

<style scoped>
.create-shell {
  height: 100dvh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  padding-top: max(20px, env(safe-area-inset-top));
  padding-bottom: max(20px, env(safe-area-inset-bottom));
  overflow: hidden;
}

.wizard {
  width: min(1000px, 100%);
  max-height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding: 18px 24px 16px;
  border-radius: 24px;
  border: 1px solid var(--line);
  background:
    radial-gradient(700px 300px at 85% -10%, rgba(124, 231, 255, 0.09), transparent 65%),
    linear-gradient(170deg, rgba(11, 19, 28, 0.94), rgba(4, 8, 13, 0.96));
  box-shadow: 0 40px 120px -40px #000, inset 0 1px 0 rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(20px);
  overflow: hidden;
}

.wizard-head { flex: none; display: flex; align-items: center; justify-content: space-between; gap: 12px; padding-bottom: 12px; }
.brand-btn { border: 0; background: transparent; padding: 0; text-align: left; cursor: pointer; }
.wizard-actions { display: flex; gap: 6px; flex: none; }

.wsteps { display: flex; gap: 5px; flex: none; }
.wstep {
  padding: 4px 9px;
  border: 1px solid var(--line);
  border-radius: 999px;
  color: var(--dim);
  font-family: var(--mono);
  font-size: 9.5px;
  letter-spacing: 0.06em;
  white-space: nowrap;
}
.wstep.is-done { border-color: rgba(138, 222, 184, .26); color: rgba(138, 222, 184, .8); }
.wstep.is-on { border-color: rgba(255, 196, 107, .5); background: rgba(255, 196, 107, .12); color: var(--amber); }

.wizard-progress { flex: none; height: 2px; margin: 8px 0 0; background: rgba(126, 196, 224, .08); border-radius: 2px; overflow: hidden; }
.wizard-progress i { display: block; height: 100%; background: linear-gradient(90deg, var(--cyan), var(--amber)); transition: width .35s ease; }

.wizard-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  display: flex;
  flex-direction: column;
  padding: 18px 2px 8px;
}
.step { width: 100%; animation: step-in .25s ease; }
@keyframes step-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }

.step-title { margin-top: 6px; font-size: clamp(22px, 3vw, 30px); font-weight: 300; line-height: 1.3; letter-spacing: 0.06em; }
.step-title em { color: var(--amber); font-style: normal; }
.step-sub { margin-top: 6px; max-width: 52em; color: var(--muted); font-size: 12px; line-height: 1.8; }
.step-status { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 7px; }

.name-field { margin-top: 16px; }
.name-row { display: flex; gap: 8px; }
.name-row input { flex: 1; min-width: 0; }
.name-row .btn { flex: none; height: 40px; }

.section-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
  margin-top: 18px;
  padding-bottom: 5px;
  border-bottom: 1px solid var(--line);
}
.section-head > span:first-child { display: flex; align-items: baseline; gap: 8px; }
.section-head b { font-size: 12px; font-weight: 500; letter-spacing: 0.14em; }
.section-head em { color: var(--dim); font-family: var(--mono); font-size: 8px; font-style: normal; letter-spacing: 0.12em; }

.pick-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; margin-top: 10px; }
.species-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
.scent-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.landscape-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }

.pick {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px 11px;
  border: 1px solid var(--line);
  border-radius: 11px;
  background: rgba(5, 10, 16, .5);
  text-align: left;
  cursor: pointer;
  transition: border-color .16s ease, background .16s ease;
}
.pick.is-on { border-color: rgba(124, 231, 255, .45); background: rgba(124, 231, 255, .07); }
.pick-top { display: flex; align-items: baseline; justify-content: space-between; gap: 6px; }
.pick-top b { font-size: 12px; font-weight: 500; letter-spacing: 0.08em; }
.pick-top em { color: var(--dim); font-family: var(--mono); font-size: 8px; font-style: normal; white-space: nowrap; }
.pick-tag { color: var(--amber); font-family: var(--mono); font-size: 8px; }
.pick p { color: var(--muted); font-size: 9.5px; line-height: 1.6; }
.pick-foot { margin-top: auto; padding-top: 3px; color: var(--dim); font-size: 8.5px; line-height: 1.5; }

.abo-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; margin-top: 10px; }
.abo {
  display: flex; flex-direction: column; gap: 4px;
  padding: 10px 11px;
  border: 1px solid var(--line);
  border-radius: 11px;
  background: rgba(5, 10, 16, .55);
  text-align: left;
  cursor: pointer;
}
.abo-top { display: flex; align-items: center; gap: 7px; }
.abo-letter {
  display: grid; place-items: center;
  width: 25px; height: 25px;
  flex: none;
  border: 1px solid rgba(var(--accent), .35);
  border-radius: 8px;
  background: rgba(var(--accent), .08);
  color: rgb(var(--accent));
  font-family: var(--mono);
  font-size: 12px;
}
.abo b { font-size: 12px; font-weight: 600; letter-spacing: 0.06em; }
.abo-tag { margin-left: auto; color: var(--dim); font-family: var(--mono); font-size: 8px; white-space: nowrap; }
.abo p { color: var(--muted); font-size: 9.5px; line-height: 1.6; }
.abo.is-on { border-color: rgba(var(--accent), .55); background: linear-gradient(165deg, rgba(var(--accent), .12), rgba(var(--accent), .02)); }

.role-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; margin-top: 10px; }
.role {
  display: flex; align-items: flex-start; gap: 10px;
  padding: 11px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: rgba(5, 10, 16, 0.55);
  text-align: left;
  cursor: pointer;
}
.role-mark {
  display: grid; place-items: center;
  width: 32px; height: 32px;
  flex: none;
  border: 1px solid rgba(124, 231, 255, .28);
  border-radius: 9px;
  color: var(--cyan);
  font-family: var(--mono);
}
.role-body b { font-size: 12.5px; font-weight: 600; letter-spacing: 0.06em; }
.role-body p { margin-top: 2px; color: var(--muted); font-size: 10px; line-height: 1.6; }
.role.is-on { border-color: rgba(124, 231, 255, .45); background: rgba(124, 231, 255, .07); }

.chips { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 9px; }
.chip {
  padding: 3px 9px;
  border: 1px solid var(--line);
  border-radius: 999px;
  background: transparent;
  color: var(--dim);
  font-size: 9px;
  cursor: pointer;
}
.chip.is-on { border-color: rgba(255, 196, 107, .42); background: rgba(255, 196, 107, .1); color: var(--amber); }

.origin-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px; margin-top: 8px; }
.origin {
  display: flex; flex-direction: column; align-items: flex-start; gap: 1px;
  padding: 8px 10px;
  border: 1px solid var(--line);
  border-radius: 9px;
  background: rgba(5, 10, 16, 0.45);
  text-align: left;
  cursor: pointer;
}
.origin b { font-size: 11.5px; font-weight: 500; letter-spacing: 0.04em; }
.origin span { color: var(--dim); font-size: 9px; line-height: 1.5; }
.origin.is-on { border-color: rgba(255, 196, 107, .45); background: rgba(255, 196, 107, .07); }

.pick-detail {
  margin-top: 12px;
  padding: 11px 12px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: linear-gradient(165deg, rgba(255, 196, 107, .06), rgba(4, 8, 13, .4));
}
.detail-head { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; }
.detail-head b { font-size: 13px; font-weight: 500; letter-spacing: 0.06em; }
.pick-detail p { margin-top: 3px; color: var(--muted); font-size: 10px; line-height: 1.7; }
.detail-rows { display: flex; flex-wrap: wrap; gap: 5px 12px; margin-top: 6px; color: var(--dim); font-size: 9px; }

.skill-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px; margin-top: 10px; }
.skill {
  display: flex; flex-direction: column; gap: 3px;
  padding: 9px 10px;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: rgba(5, 10, 16, .5);
  text-align: left;
  cursor: pointer;
}
.skill-head { display: flex; align-items: baseline; justify-content: space-between; gap: 6px; }
.skill-head b { font-size: 11.5px; font-weight: 500; letter-spacing: 0.05em; }
.skill p { color: var(--dim); font-size: 9px; line-height: 1.6; }
.skill.is-on { border-color: rgba(138, 222, 184, .42); background: rgba(138, 222, 184, .07); }

.points-head {
  display: flex; align-items: baseline; justify-content: space-between;
  margin-top: 14px; padding: 10px 12px;
  border: 1px solid var(--line);
  border-radius: 11px;
  background: rgba(5, 10, 16, .5);
}
.points-head span { color: var(--muted); font-size: 10.5px; }
.points-head b { color: var(--amber); font-family: var(--mono); font-size: 20px; font-weight: 400; line-height: 1; }
.points-head b.bad { color: var(--red); }
.points-head b small { margin-left: 4px; color: var(--dim); font-size: 9px; }

.attr-editor { margin-top: 4px; }
.arow { display: grid; grid-template-columns: 80px minmax(0, 1fr) auto; align-items: center; gap: 10px; padding: 6px 2px; border-bottom: 1px dashed rgba(126, 196, 224, .1); }
.arow:last-child { border-bottom: 0; }
.arow-name b { display: block; font-size: 11.5px; font-weight: 500; letter-spacing: 0.1em; line-height: 1.4; }
.arow-name span { display: block; color: var(--dim); font-size: 8.5px; }
.arow-bar { height: 3px; border-radius: 3px; background: rgba(255, 255, 255, .06); overflow: hidden; }
.arow-bar i { display: block; height: 100%; background: linear-gradient(90deg, rgba(124, 231, 255, .4), var(--cyan)); }
.arow-ctl { display: flex; align-items: center; gap: 5px; }
.arow-ctl button {
  display: grid; place-items: center;
  width: 27px; height: 27px;
  border: 1px solid var(--line);
  border-radius: 7px;
  background: transparent;
  color: var(--muted);
  cursor: pointer;
}
.arow-ctl button:disabled { opacity: .25; cursor: not-allowed; }
.arow-ctl b { width: 20px; text-align: center; font-family: var(--mono); font-size: 13px; font-weight: 400; }
.arow-ctl em { min-width: 18px; color: var(--jade); font-family: var(--mono); font-size: 9px; font-style: normal; }

.flaw-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px; margin-top: 9px; }
.flaw {
  display: flex; flex-direction: column; gap: 2px;
  padding: 8px 10px;
  border: 1px solid rgba(255, 138, 138, .16);
  border-radius: 9px;
  background: rgba(255, 138, 138, .03);
  text-align: left;
  cursor: pointer;
}
.flaw-top { display: flex; align-items: baseline; justify-content: space-between; gap: 6px; }
.flaw-top b { color: var(--ink); font-size: 11px; font-weight: 500; }
.flaw-top em { color: var(--red); font-family: var(--mono); font-size: 9px; font-style: normal; }
.flaw p { color: var(--dim); font-size: 9px; line-height: 1.55; }
.flaw.is-on { border-color: rgba(255, 138, 138, .45); background: rgba(255, 138, 138, .08); }
.bad-note { margin-top: 8px; color: var(--red); font-size: 9.5px; }

.trait-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px; margin-top: 12px; }
.trait {
  display: flex; align-items: center; gap: 8px;
  padding: 8px 10px;
  border: 1px solid var(--line);
  border-radius: 9px;
  background: rgba(5, 10, 16, .5);
  text-align: left;
  cursor: pointer;
}
.trait i { width: 5px; height: 5px; flex: none; border-radius: 50%; background: var(--dim); }
.trait b { display: block; font-size: 10.5px; font-weight: 500; }
.trait span { display: block; color: var(--dim); font-size: 8.5px; line-height: 1.45; }
.trait.is-on { border-color: rgba(138, 222, 184, .42); background: rgba(138, 222, 184, .07); }
.trait.is-on i { background: var(--jade); box-shadow: 0 0 8px var(--jade); }
.trait.is-on::after { content: "✓"; margin-left: auto; color: var(--jade); font-family: var(--mono); font-size: 10px; }

.summary {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.1fr);
  gap: 12px;
  margin-top: 12px;
  padding: 12px;
  border: 1px solid var(--line);
  border-radius: 13px;
  background: radial-gradient(500px 160px at 100% 0%, rgba(124, 231, 255, .08), transparent 70%), rgba(5, 10, 16, .55);
}
.sum-id { display: flex; align-items: center; gap: 9px; margin-bottom: 9px; }
.sum-ava {
  display: grid; place-items: center;
  width: 34px; height: 34px;
  flex: none;
  border: 1px solid rgba(124, 231, 255, .32);
  border-radius: 10px;
  background: rgba(124, 231, 255, .08);
  color: var(--cyan);
  font-size: 14px;
}
.sum-id b { display: block; font-size: 13px; font-weight: 500; letter-spacing: 0.06em; }
.sum-id p { color: var(--muted); font-size: 9px; line-height: 1.5; }
.sum-attrs { display: grid; grid-template-columns: repeat(4, 1fr); gap: 4px; }
.sum-attrs div { padding: 4px 6px; border: 1px solid var(--line); border-radius: 6px; background: rgba(3, 7, 11, .5); }
.sum-attrs span { display: block; color: var(--dim); font-size: 8px; }
.sum-attrs b { font-family: var(--mono); font-size: 12px; font-weight: 400; }
.sum-row { display: flex; justify-content: space-between; gap: 8px; padding: 2px 0; font-size: 9.5px; }
.sum-row span { color: var(--dim); flex: none; }
.sum-row b { font-family: var(--mono); font-weight: 500; text-align: right; }
.red-text { color: var(--red); }
.sum-items { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 5px; }

.mini-profile { display: flex; align-items: center; flex-wrap: wrap; gap: 5px; margin-top: auto; padding-top: 14px; }

.wizard-foot { flex: none; display: flex; align-items: center; gap: 10px; padding-top: 10px; border-top: 1px solid var(--line); }
.wizard-hint { flex: 1; min-width: 0; overflow: hidden; color: var(--dim); font-family: var(--mono); font-size: 9.5px; text-align: center; white-space: nowrap; text-overflow: ellipsis; }
.wizard-foot .btn { min-width: 92px; }
.wizard-foot .btn-primary { min-width: 132px; }

@media (max-width: 899px) {
  .create-shell { padding: 10px; padding-top: max(10px, env(safe-area-inset-top)); padding-bottom: max(10px, env(safe-area-inset-bottom)); }
  .wizard { height: 100%; max-height: none; padding: 14px 14px 12px; border-radius: 18px; }
  .wizard-head { padding-bottom: 9px; }
  .wstep { padding: 3px 6px; font-size: 8.5px; }
  .wstep-full { display: none; }
  .wstep::after { content: attr(data-num); }
  .wizard-body { padding: 14px 0 6px; }
  .step-title { font-size: 21px; }
  .step-sub { font-size: 11.5px; }
  .pick-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px; }
  .species-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .scent-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .landscape-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .abo-grid { grid-template-columns: 1fr; gap: 6px; }
  .abo { padding: 9px 10px; }
  .role-grid { gap: 6px; }
  .origin-grid { gap: 5px; }
  .arow { grid-template-columns: 72px minmax(0, 1fr) auto; gap: 8px; }
  .summary { grid-template-columns: 1fr; gap: 9px; }
  .wizard-hint { display: none; }
  .wizard-foot .btn { flex: 1; }
  .wizard-foot .btn-primary { flex: 1.4; }
  .field input { font-size: 16px; }
}

@media (max-width: 480px) {
  .pick p { font-size: 9px; }
  .pick-foot { font-size: 8px; }
  .skill-grid { grid-template-columns: 1fr; }
  .flaw-grid { grid-template-columns: 1fr; }
  .trait-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .sum-attrs { grid-template-columns: repeat(4, 1fr); }
  .pick-detail { padding: 9px 10px; }
}
</style>
