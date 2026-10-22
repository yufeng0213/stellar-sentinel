<script setup>
/*
 * 世界论坛：本地生成世界帖子骨架，LLM 负责重写正文与回复。
 */
import { computed, onMounted, reactive, ref } from 'vue'
import { useGameStore } from '../stores/game.js'

const game = useGameStore()
const run = computed(() => game.run)
const posts = computed(() => run.value?.social?.forumPosts || [])
const loading = ref(false)
const replying = ref('')
const drafts = reactive({})
const source = ref('')

async function refresh() {
  if (loading.value) return
  loading.value = true
  const result = await game.refreshForumPost(true)
  loading.value = false
  if (result.ok) {
    source.value = result.source === 'llm' ? 'AI 新帖' : '本地新帖'
    if (result.source !== 'llm') game.notify('模型没有返回内容，先用本地帖子', '')
  }
}

async function reply(post) {
  if (replying.value === post.id) return
  const text = String(drafts[post.id] || '').trim()
  if (!text) return
  replying.value = post.id
  const result = await game.replyForumPost(post.id, text, true)
  replying.value = ''
  if (result.ok) {
    drafts[post.id] = ''
    source.value = result.source === 'llm' ? 'AI 回复' : '本地回复'
  }
}

onMounted(async () => {
  if (!posts.value.length) {
    await game.refreshForumPost(false)
  }
})
</script>

<template>
  <section class="panel forum-panel">
    <div class="forum-head">
      <div>
        <p class="kicker">WORLD FORUM · {{ source || 'LIVE BOARD' }}</p>
        <h3>世界论坛</h3>
        <p class="hint">空港、矿脉站和边境的人都在这里说话。有些消息比官方频道更早。</p>
      </div>
      <button type="button" class="btn btn-sm" :disabled="loading" @click="refresh">
        {{ loading ? '正在刷新…' : '刷新帖子' }}
      </button>
    </div>

    <div v-if="posts.length" class="forum-list">
      <article v-for="post in posts" :key="post.id" class="forum-post">
        <header class="forum-post-head">
          <div>
            <span class="forum-author">{{ post.authorName || '匿名' }}</span>
            <span class="forum-day">D{{ post.day }} · {{ post.source === 'llm' ? 'AI' : '本地' }}</span>
          </div>
          <span class="tag">{{ post.triggerLabel ? `对话 · ${post.triggerLabel}` : post.tags?.[0] || '世界' }}</span>
        </header>
        <h4>{{ post.title }}</h4>
        <p class="forum-body">{{ post.body }}</p>
        <div v-if="post.tags?.length" class="forum-tags">
          <span v-for="tag in post.tags" :key="tag">#{{ tag }}</span>
        </div>

        <div v-if="post.comments?.length" class="forum-comments">
          <div v-for="comment in post.comments" :key="comment.id" class="forum-comment" :class="comment.authorType">
            <b>{{ comment.authorName || '匿名' }}</b>
            <span>{{ comment.text }}</span>
          </div>
        </div>

        <div class="forum-input">
          <input
            v-model="drafts[post.id]"
            maxlength="240"
            :placeholder="replying === post.id ? '正在等回复…' : '写一条评论…'"
            :disabled="replying === post.id"
            @keyup.enter="reply(post)"
          />
          <button
            type="button"
            class="btn btn-sm btn-primary"
            :disabled="replying === post.id || !drafts[post.id]?.trim()"
            @click="reply(post)"
          >
            {{ replying === post.id ? '…' : '回复' }}
          </button>
        </div>
      </article>
    </div>
    <p v-else class="empty">论坛还没有帖子。刷新一下。</p>
  </section>
</template>

<style scoped>
.forum-panel { padding: 12px; }
.forum-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; padding: 3px 3px 10px; }
.forum-head h3 { margin-top: 2px; font-size: max(var(--ui-min), calc(18px * var(--ui-scale))); font-weight: 400; }
.forum-head .hint { margin-top: 3px; }
.forum-list { display: flex; flex-direction: column; gap: 8px; }
.forum-post { padding: 12px; border: 1px solid var(--line); border-radius: 10px; background: rgba(5, 10, 16, .48); }
.forum-post-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; }
.forum-author { color: var(--cyan); font-size: max(var(--ui-min), calc(10px * var(--ui-scale))); }
.forum-day { margin-left: 6px; color: var(--dim); font-family: var(--mono); font-size: max(var(--ui-min), calc(8px * var(--ui-scale))); }
.forum-post h4 { margin-top: 6px; font-size: max(var(--ui-min), calc(14px * var(--ui-scale))); font-weight: 500; }
.forum-body { margin-top: 4px; color: var(--muted); font-size: max(var(--ui-min), calc(10px * var(--ui-scale))); line-height: 1.7; }
.forum-tags { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px; color: var(--cyan); font-family: var(--mono); font-size: max(var(--ui-min), calc(8px * var(--ui-scale))); }
.forum-comments { margin-top: 9px; padding-top: 8px; border-top: 1px solid var(--line); display: flex; flex-direction: column; gap: 5px; }
.forum-comment { color: var(--muted); font-size: max(var(--ui-min), calc(9px * var(--ui-scale))); line-height: 1.55; }
.forum-comment b { margin-right: 6px; color: var(--dim); font-weight: 500; }
.forum-comment.player b { color: var(--amber); }
.forum-input { display: flex; gap: 5px; margin-top: 8px; }
.forum-input input { flex: 1; min-width: 0; height: 32px; padding: 0 9px; border: 1px solid var(--line); border-radius: 7px; background: rgba(4, 8, 13, .7); color: var(--ink); font-size: max(var(--ui-min), calc(10px * var(--ui-scale))); outline: none; }
.forum-input input:focus { border-color: rgba(124, 231, 255, .42); }
.empty { padding: 26px; color: var(--dim); text-align: center; }
</style>
