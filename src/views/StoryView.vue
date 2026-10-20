<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ATTR_NAME } from '../game-core/data.js'
import { AWAKENINGS, getAwakening, localOpening } from '../game-core/story.js'
import { useGameStore } from '../stores/game.js'

const router = useRouter()
const game = useGameStore()
const run = computed(() => game.run)
const story = computed(() => run.value?.story || null)
const awakening = computed(() => getAwakening(story.value?.awakening))
const opening = computed(() => story.value?.opening || null)
const choiceResult = computed(() => story.value?.choice || null)
const llmReady = ref(null)
const busy = ref(false)
const error = ref('')

onMounted(checkLlm)

async function checkLlm() {
  try {
    const response = await fetch('./api/llm/config')
    const data = await response.json()
    llmReady.value = Boolean(data.hasKey) || data.provider === 'ollama'
  } catch {
    llmReady.value = false
  }
}

async function begin(id) {
  const result = game.startStoryAwakening(id)
  if (!result.ok) {
    game.notify(result.message, 'bad')
    return
  }
  error.value = ''
  if (llmReady.value === null) await checkLlm()
  if (llmReady.value === true) generateOpening()
}

async function generateOpening() {
  if (busy.value || !awakening.value) return
  if (llmReady.value === null) await checkLlm()
  busy.value = true
  error.value = ''
  const result = await game.generateStoryOpening(llmReady.value === true)
  busy.value = false
  if (result.ok && result.source === 'llm') {
    game.notify('模型展开了开场', 'good')
  } else if (result.error) {
    error.value = result.error
  }
}

function choose(id) {
  if (choiceResult.value) return
  const result = game.resolveStoryChoice(id)
  if (!result.ok) {
    game.notify(result.message, 'bad')
    return
  }
  game.notify(result.success ? '判定成功' : '判定失败', result.success ? 'good' : 'bad')
}

function enterMap() {
  if (!run.value) return
  router.push({ name: 'city', params: { runId: run.value.id } })
}

function toTitle() {
  router.push('/')
}
</script>

<template>
  <div v-if="run" class="run-page story-page">
    <section v-if="!awakening" class="panel story-select">
      <header class="story-head">
        <div>
          <p class="kicker">PROLOGUE · WAKE</p>
          <h1>你在哪里醒来？</h1>
          <p class="hint">选择一个开场。场景决定第一段叙述、第一个判定和初始线索，不会改变角色数值。</p>
        </div>
        <button type="button" class="btn btn-ghost btn-sm" @click="toTitle">回到标题</button>
      </header>

      <div class="wake-grid">
        <button
          v-for="scene in AWAKENINGS"
          :key="scene.id"
          type="button"
          class="wake-card"
          @click="begin(scene.id)"
        >
          <span class="wake-glyph">{{ scene.glyph }}</span>
          <span class="wake-copy">
            <b>{{ scene.name }}</b>
            <small>{{ scene.place }}</small>
            <p>{{ scene.tone }}</p>
          </span>
          <span class="wake-go">醒来 →</span>
        </button>
      </div>
    </section>

    <template v-else>
      <section class="panel story-opening">
        <header class="story-head">
          <div>
            <p class="kicker">CHAPTER {{ story.chapter }} · {{ story.title }}</p>
            <h1>{{ awakening.place }}</h1>
            <p class="sub">{{ awakening.name }} · {{ awakening.tags.join(' / ') }}</p>
          </div>
          <div class="story-actions">
            <span class="tag" :class="opening?.source === 'llm' ? 'cyan' : 'jade'">
              {{ opening?.source === 'llm' ? '模型开场' : '本地开场' }}
            </span>
            <button type="button" class="btn btn-sm" :disabled="busy || llmReady === false" @click="generateOpening">
              {{ busy ? '展开中…' : llmReady === false ? '本地开场' : '让模型展开' }}
            </button>
            <button type="button" class="btn btn-ghost btn-sm" @click="enterMap">跳过</button>
          </div>
        </header>

        <article class="opening-text">
          <p>{{ opening?.text || localOpening(run, awakening) }}</p>
          <span class="opening-mark">白塔静默 · 第 {{ run.day }} 天</span>
        </article>

        <p v-if="error" class="opening-error">模型展开失败，已保留本地开场：{{ error }}</p>

        <div v-if="!choiceResult" class="opening-choices">
          <p class="kicker">你首先要做什么？</p>
          <button
            v-for="choice in awakening.choices"
            :key="choice.id"
            type="button"
            class="opening-choice"
            @click="choose(choice.id)"
          >
            <b>{{ choice.label }}</b>
            <span>{{ ATTR_NAME[choice.attr] }} DC {{ choice.dc }}<template v-if="choice.skill"> · 能力加成</template></span>
          </button>
        </div>

        <div v-else class="opening-result">
          <div class="opening-roll">
            <span :class="choiceResult.success ? 'is-good' : 'is-bad'">
              {{ choiceResult.success ? '判定成功' : '判定失败' }}
            </span>
            <em>d20 {{ choiceResult.roll }} + 属性 = {{ choiceResult.total }} / DC {{ choiceResult.dc }}</em>
          </div>
          <p>{{ choiceResult.text }}</p>
          <button type="button" class="btn btn-primary" @click="enterMap">进入空港 →</button>
        </div>
      </section>

      <section class="panel story-objective">
        <span class="kicker">MAIN OBJECTIVE</span>
        <p>{{ story.objective }}</p>
      </section>
    </template>
  </div>
</template>

<style scoped>
.story-page { gap: 12px; max-width: 1500px; }
.story-select, .story-opening { padding: 18px; }
.story-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 14px; }
.story-head h1 { margin-top: 4px; font-size: max(var(--ui-min), calc(30px * var(--ui-scale))); font-weight: 300; letter-spacing: .08em; }
.story-head .hint { margin-top: 5px; max-width: 64em; }
.story-actions { display: flex; align-items: center; flex-wrap: wrap; justify-content: flex-end; gap: 5px; }
.wake-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 8px; margin-top: 16px; }
.wake-card {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  min-height: 116px;
  padding: 12px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: linear-gradient(150deg, rgba(16, 27, 38, .78), rgba(5, 10, 16, .6));
  color: var(--ink);
  text-align: left;
  cursor: pointer;
  transition: border-color .16s ease, transform .16s ease, background .16s ease;
}
.wake-glyph {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  flex: none;
  border: 1px solid rgba(124, 231, 255, .28);
  border-radius: 9px;
  color: var(--cyan);
  font-size: max(var(--ui-min), calc(16px * var(--ui-scale)));
}
.wake-copy { min-width: 0; flex: 1; }
.wake-copy b { display: block; font-size: max(var(--ui-min), calc(13px * var(--ui-scale))); font-weight: 500; }
.wake-copy small { display: block; margin-top: 2px; color: var(--dim); font-family: var(--mono); font-size: max(var(--ui-min), calc(9px * var(--ui-scale))); }
.wake-copy p { margin-top: 6px; color: var(--muted); font-size: max(var(--ui-min), calc(10px * var(--ui-scale))); line-height: 1.65; }
.wake-go { align-self: flex-end; flex: none; color: var(--amber); font-family: var(--mono); font-size: max(var(--ui-min), calc(9px * var(--ui-scale))); }
.opening-text {
  margin-top: 16px;
  padding: 16px;
  border-left: 2px solid rgba(124, 231, 255, .36);
  background: linear-gradient(90deg, rgba(124, 231, 255, .055), transparent);
}
.opening-text p { max-width: 72em; color: var(--ink); font-size: max(var(--ui-min), calc(14px * var(--ui-scale))); line-height: 2; white-space: pre-wrap; }
.opening-mark { display: block; margin-top: 10px; color: var(--dim); font-family: var(--mono); font-size: max(var(--ui-min), calc(8px * var(--ui-scale))); letter-spacing: .08em; }
.opening-error { margin-top: 10px; color: var(--red); font-size: max(var(--ui-min), calc(10px * var(--ui-scale))); }
.opening-choices { margin-top: 18px; }
.opening-choice {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
  width: 100%;
  margin-top: 6px;
  padding: 10px 12px;
  border: 1px solid var(--line);
  border-radius: 9px;
  background: rgba(5, 10, 16, .42);
  color: var(--ink);
  text-align: left;
  cursor: pointer;
}
.opening-choice b { font-size: max(var(--ui-min), calc(12px * var(--ui-scale))); font-weight: 500; }
.opening-choice span { flex: none; color: var(--dim); font-family: var(--mono); font-size: max(var(--ui-min), calc(8px * var(--ui-scale))); }
.opening-result { margin-top: 18px; padding: 14px; border: 1px solid rgba(124, 231, 255, .18); border-radius: 11px; background: rgba(4, 8, 13, .42); }
.opening-roll { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; }
.opening-roll span { font-family: var(--mono); font-size: max(var(--ui-min), calc(11px * var(--ui-scale))); }
.opening-roll .is-good { color: var(--jade); }
.opening-roll .is-bad { color: var(--red); }
.opening-roll em { color: var(--dim); font-family: var(--mono); font-size: max(var(--ui-min), calc(8px * var(--ui-scale))); font-style: normal; }
.opening-result p { margin: 9px 0 14px; color: var(--muted); font-size: max(var(--ui-min), calc(12px * var(--ui-scale))); line-height: 1.8; }
.story-objective { padding: 12px 16px; }
.story-objective p { margin-top: 4px; color: var(--muted); font-size: max(var(--ui-min), calc(11px * var(--ui-scale))); }
@media (hover: hover) {
  .wake-card:hover { border-color: rgba(124, 231, 255, .38); background: rgba(18, 34, 46, .9); transform: translateY(-2px); }
  .opening-choice:hover { border-color: var(--line-2); background: rgba(124, 231, 255, .06); }
}
@media (max-width: 700px) {
  .story-select, .story-opening { padding: 13px; }
  .story-head { flex-direction: column; }
  .story-head h1 { font-size: max(var(--ui-min), calc(24px * var(--ui-scale))); }
  .story-actions { justify-content: flex-start; }
  .wake-grid { grid-template-columns: 1fr; }
  .opening-choice { align-items: flex-start; flex-direction: column; gap: 3px; }
}
</style>
