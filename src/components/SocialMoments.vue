<script setup>
/*
 * 社交圈：NPC 的日常动态。发布由 LLM 生成，失败时保留本地骨架。
 */
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useGameStore } from '../stores/game.js'

const game = useGameStore()
const router = useRouter()
const run = computed(() => game.run)
const moments = computed(() => run.value?.social?.moments || [])
const loading = ref(false)
const source = ref('')
const drafts = reactive({})
const replying = ref('')

async function refresh(useLlm = true) {
  if (loading.value) return
  loading.value = true
  const result = await game.generateSocialMoments(useLlm)
  loading.value = false
  if (result.ok) {
    source.value = result.source === 'llm' ? 'LLM 已更新' : '本地生成'
    if (result.source !== 'llm') game.notify('模型没有返回内容，先用本地动态', '')
  }
}

function openNpc(moment) {
  if (!moment?.npcId || !run.value) return
  router.push({ name: 'npc', params: { runId: run.value.id, npcId: moment.npcId } })
}

function like(moment) {
  game.likeSocialMoment(moment.id)
}

async function comment(moment) {
  if (replying.value === moment.id) return
  const text = String(drafts[moment.id] || '').trim()
  if (!text) return
  replying.value = moment.id
  const result = await game.replySocialMoment(moment.id, text, true)
  replying.value = ''
  if (result.ok) {
    drafts[moment.id] = ''
    source.value = result.source === 'llm' ? 'AI 回复' : '本地回复'
  }
}

onMounted(() => {
  const social = run.value?.social
  if (social?.lastMomentLlmDay !== run.value?.day) refresh()
})
</script>

<template>
  <section class="panel moments-panel">
    <div class="moments-head">
      <div>
        <p class="kicker">SOCIAL CIRCLE · {{ source || 'LIVE FEED' }}</p>
        <h3>社交圈</h3>
        <p class="hint">你认识的人在空港和星区里过着他们自己的日子。</p>
      </div>
      <button type="button" class="btn btn-sm" :disabled="loading" @click="refresh(true)">
        {{ loading ? '正在生成…' : '刷新动态' }}
      </button>
    </div>

    <div v-if="moments.length" class="moment-list">
      <article v-for="moment in moments" :key="moment.id" class="moment-card">
        <header class="moment-top">
          <button type="button" class="moment-author" @click="openNpc(moment)">
            <span class="moment-ava">{{ (moment.name || '某人').slice(0, 1) }}</span>
            <span>
              <b>{{ moment.name || '某人' }}</b>
              <em>D{{ moment.day }} · {{ moment.source === 'llm' ? 'AI' : '本地' }}</em>
            </span>
          </button>
          <span class="tag">{{ moment.triggerLabel ? `对话 · ${moment.triggerLabel}` : moment.npcId ? '联系人' : '空港' }}</span>
        </header>
        <p class="moment-text">{{ moment.text }}</p>
        <div v-if="moment.tags?.length" class="moment-tags">
          <span v-for="tag in moment.tags" :key="tag">#{{ tag }}</span>
        </div>
        <div v-if="moment.comments?.length" class="moment-comments">
          <div v-for="comment in moment.comments" :key="comment.id" class="moment-comment" :class="comment.authorType">
            <b>{{ comment.authorName || '某人' }}</b>
            <span>{{ comment.text }}</span>
          </div>
        </div>
        <div class="moment-input">
          <input
            v-model="drafts[moment.id]"
            maxlength="160"
            :placeholder="replying === moment.id ? '正在等回复…' : '评论这条动态…'"
            :disabled="replying === moment.id"
            @keyup.enter="comment(moment)"
          />
          <button
            type="button"
            class="btn btn-sm"
            :disabled="replying === moment.id || !drafts[moment.id]?.trim()"
            @click="comment(moment)"
          >
            {{ replying === moment.id ? '…' : '评论' }}
          </button>
        </div>
        <footer class="moment-foot">
          <button type="button" class="moment-like" @click="like(moment)">♡ {{ moment.likes || 0 }}</button>
          <span>{{ moment.comments?.length || 0 }} 条回应</span>
        </footer>
      </article>
    </div>
    <p v-else class="empty">社交圈还没有新动态。刷新一下，看看空港今天发生了什么。</p>
  </section>
</template>

<style scoped>
.moments-panel { padding: 12px; }
.moments-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; padding: 3px 3px 10px; }
.moments-head h3 { margin-top: 2px; font-size: max(var(--ui-min), calc(18px * var(--ui-scale))); font-weight: 400; }
.moments-head .hint { margin-top: 3px; }
.moment-list { display: flex; flex-direction: column; gap: 7px; }
.moment-card { padding: 11px 12px; border: 1px solid var(--line); border-radius: 11px; background: rgba(5, 10, 16, .48); }
.moment-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; }
.moment-author { display: flex; align-items: center; gap: 8px; padding: 0; border: 0; background: transparent; color: var(--ink); text-align: left; cursor: pointer; }
.moment-ava { display: grid; place-items: center; width: 30px; height: 30px; border: 1px solid rgba(124, 231, 255, .28); border-radius: 50%; color: var(--cyan); font-size: max(var(--ui-min), calc(11px * var(--ui-scale))); }
.moment-author b { display: block; font-size: max(var(--ui-min), calc(11px * var(--ui-scale))); font-weight: 500; }
.moment-author em { display: block; margin-top: 2px; color: var(--dim); font-family: var(--mono); font-size: max(var(--ui-min), calc(8px * var(--ui-scale))); font-style: normal; }
.moment-text { margin-top: 8px; color: var(--muted); font-size: max(var(--ui-min), calc(10px * var(--ui-scale))); line-height: 1.7; }
.moment-tags { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px; color: var(--cyan); font-family: var(--mono); font-size: max(var(--ui-min), calc(8px * var(--ui-scale))); }
.moment-comments { display: flex; flex-direction: column; gap: 4px; margin-top: 7px; padding-top: 6px; border-top: 1px solid var(--line); }
.moment-comment { color: var(--muted); font-size: max(var(--ui-min), calc(9px * var(--ui-scale))); line-height: 1.5; }
.moment-comment b { margin-right: 6px; color: var(--dim); font-weight: 500; }
.moment-comment.player b { color: var(--amber); }
.moment-input { display: flex; gap: 5px; margin-top: 6px; }
.moment-input input { flex: 1; min-width: 0; height: 30px; padding: 0 8px; border: 1px solid var(--line); border-radius: 7px; background: rgba(4, 8, 13, .7); color: var(--ink); font-size: max(var(--ui-min), calc(9.5px * var(--ui-scale))); outline: none; }
.moment-input input:focus { border-color: rgba(124, 231, 255, .42); }
.moment-foot { display: flex; align-items: center; justify-content: space-between; margin-top: 8px; padding-top: 7px; border-top: 1px solid var(--line); color: var(--dim); font-family: var(--mono); font-size: max(var(--ui-min), calc(8px * var(--ui-scale))); }
.moment-like { border: 0; background: transparent; color: var(--red); font: inherit; cursor: pointer; }
.empty { padding: 26px; color: var(--dim); text-align: center; }
</style>
