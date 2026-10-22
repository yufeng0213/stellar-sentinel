<script setup>
/*
 * 世界论坛：列表像 Reddit，点进帖子后才展开正文和讨论。
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
const activePostId = ref(null)

const activePost = computed(() => posts.value.find((post) => post.id === activePostId.value) || null)

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

function openPost(post) {
  activePostId.value = post.id
  source.value = ''
}

function closePost() {
  activePostId.value = null
}

function replyCount(post) {
  return post?.comments?.length || 0
}

function preview(post) {
  return String(post?.body || '').replace(/\s+/g, ' ').slice(0, 72)
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
    <template v-if="activePost">
      <div class="forum-detail-head">
        <button type="button" class="forum-back" @click="closePost">← 返回论坛</button>
        <button type="button" class="btn btn-sm" :disabled="loading" @click="refresh">
          {{ loading ? '…' : '刷新' }}
        </button>
      </div>

      <article class="forum-detail">
        <div class="forum-meta">
          <span class="forum-channel">r/空港</span>
          <span>·</span>
          <span>{{ activePost.authorName || '匿名' }}</span>
          <span>·</span>
          <span>D{{ activePost.day }}</span>
        </div>
        <h3>{{ activePost.title }}</h3>
        <p class="forum-body">{{ activePost.body }}</p>
        <div v-if="activePost.tags?.length" class="forum-tags">
          <span v-for="tag in activePost.tags" :key="tag">#{{ tag }}</span>
        </div>

        <div class="forum-comment-head">
          <b>{{ replyCount(activePost) }} 条回应</b>
          <span>{{ source || '按时间排序' }}</span>
        </div>
        <div v-if="activePost.comments?.length" class="forum-comments">
          <div
            v-for="comment in activePost.comments"
            :key="comment.id"
            class="forum-comment"
            :class="comment.authorType"
          >
            <b>{{ comment.authorName || '匿名' }}</b>
            <span>{{ comment.text }}</span>
          </div>
        </div>
        <p v-else class="forum-empty">还没有人回应。</p>

        <div class="forum-input">
          <input
            v-model="drafts[activePost.id]"
            maxlength="240"
            :placeholder="replying === activePost.id ? '正在等回复…' : '写一条评论…'"
            :disabled="replying === activePost.id"
            @keyup.enter="reply(activePost)"
          />
          <button
            type="button"
            class="btn btn-sm btn-primary"
            :disabled="replying === activePost.id || !drafts[activePost.id]?.trim()"
            @click="reply(activePost)"
          >
            {{ replying === activePost.id ? '…' : '回复' }}
          </button>
        </div>
      </article>
    </template>

    <template v-else>
      <div class="forum-head">
        <div>
          <p class="kicker">WORLD FORUM · {{ source || 'r/空港' }}</p>
          <h3>空港论坛</h3>
          <p class="hint">边境的消息、传闻和抱怨。点进帖子看完整讨论。</p>
        </div>
        <button type="button" class="btn btn-sm" :disabled="loading" @click="refresh">
          {{ loading ? '…' : '刷新' }}
        </button>
      </div>

      <div v-if="posts.length" class="forum-list">
        <article
          v-for="post in posts"
          :key="post.id"
          class="forum-item"
          role="button"
          tabindex="0"
          @click="openPost(post)"
          @keyup.enter="openPost(post)"
        >
          <div class="forum-vote">
            <b>{{ replyCount(post) }}</b>
            <span>回应</span>
          </div>
          <div class="forum-item-main">
            <div class="forum-meta">
              <span class="forum-channel">r/空港</span>
              <span>·</span>
              <span>{{ post.authorName || '匿名' }}</span>
              <span>·</span>
              <span>D{{ post.day }}</span>
            </div>
            <h4>{{ post.title }}</h4>
            <p class="forum-preview">{{ preview(post) }}</p>
            <div v-if="post.tags?.length" class="forum-tags">
              <span v-for="tag in post.tags" :key="tag">#{{ tag }}</span>
            </div>
          </div>
          <span class="forum-arrow" aria-hidden="true">›</span>
        </article>
      </div>
      <p v-else class="empty">论坛还没有帖子。刷新一下。</p>
    </template>
  </section>
</template>

<style scoped>
.forum-panel { padding: 12px; }
.forum-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; padding: 2px 2px 10px; }
.forum-head h3 { margin-top: 2px; font-size: max(var(--ui-min), calc(18px * var(--ui-scale))); font-weight: 400; }
.forum-head .hint { margin-top: 3px; max-width: 32ch; }
.forum-list { display: flex; flex-direction: column; gap: 7px; }
.forum-item { display: flex; align-items: flex-start; gap: 9px; padding: 9px 8px; border: 1px solid var(--line); border-radius: 8px; background: rgba(5, 10, 16, .42); cursor: pointer; }
.forum-item:hover, .forum-item:focus-visible { border-color: rgba(124, 231, 255, .32); background: rgba(124, 231, 255, .035); outline: none; }
.forum-vote { display: flex; flex-direction: column; align-items: center; justify-content: center; min-width: 30px; color: var(--dim); font-family: var(--mono); font-size: max(var(--ui-min), calc(8px * var(--ui-scale))); }
.forum-vote b { color: var(--cyan); font-size: max(var(--ui-min), calc(13px * var(--ui-scale))); font-weight: 500; }
.forum-item-main { flex: 1; min-width: 0; }
.forum-meta { display: flex; flex-wrap: wrap; align-items: center; gap: 4px; color: var(--dim); font-family: var(--mono); font-size: max(var(--ui-min), calc(8px * var(--ui-scale))); }
.forum-channel { color: var(--amber); }
.forum-item h4 { margin-top: 4px; color: var(--ink); font-size: max(var(--ui-min), calc(13px * var(--ui-scale))); font-weight: 500; line-height: 1.35; }
.forum-preview { margin-top: 3px; overflow: hidden; color: var(--muted); font-size: max(var(--ui-min), calc(9px * var(--ui-scale))); line-height: 1.5; text-overflow: ellipsis; white-space: nowrap; }
.forum-arrow { align-self: center; color: var(--dim); font-size: 20px; }
.forum-detail-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 0 2px 9px; }
.forum-back { padding: 3px 0; border: 0; background: transparent; color: var(--cyan); font-family: var(--mono); font-size: max(var(--ui-min), calc(9px * var(--ui-scale))); cursor: pointer; }
.forum-detail { padding: 12px; border: 1px solid var(--line); border-radius: 9px; background: rgba(5, 10, 16, .42); }
.forum-detail h3 { margin-top: 6px; font-size: max(var(--ui-min), calc(18px * var(--ui-scale))); font-weight: 500; line-height: 1.3; }
.forum-body { margin-top: 7px; color: var(--muted); font-size: max(var(--ui-min), calc(10px * var(--ui-scale))); line-height: 1.7; white-space: pre-wrap; }
.forum-tags { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px; color: var(--cyan); font-family: var(--mono); font-size: max(var(--ui-min), calc(8px * var(--ui-scale))); }
.forum-comment-head { display: flex; justify-content: space-between; gap: 8px; margin-top: 13px; padding-top: 9px; border-top: 1px solid var(--line); color: var(--dim); font-family: var(--mono); font-size: max(var(--ui-min), calc(8px * var(--ui-scale))); }
.forum-comment-head b { color: var(--ink); font-weight: 500; }
.forum-comments { display: flex; flex-direction: column; gap: 7px; margin-top: 8px; }
.forum-comment { padding: 7px 8px; border-left: 2px solid var(--line); color: var(--muted); font-size: max(var(--ui-min), calc(9px * var(--ui-scale))); line-height: 1.6; }
.forum-comment b { display: block; margin-bottom: 2px; color: var(--dim); font-weight: 500; }
.forum-comment.player { border-left-color: rgba(255, 196, 107, .45); background: rgba(255, 196, 107, .025); }
.forum-comment.player b { color: var(--amber); }
.forum-empty { margin-top: 10px; color: var(--dim); font-size: max(var(--ui-min), calc(9px * var(--ui-scale))); }
.forum-input { display: flex; gap: 5px; margin-top: 10px; }
.forum-input input { flex: 1; min-width: 0; height: 34px; padding: 0 9px; border: 1px solid var(--line); border-radius: 7px; background: rgba(4, 8, 13, .7); color: var(--ink); font-size: max(var(--ui-min), calc(10px * var(--ui-scale))); outline: none; }
.forum-input input:focus { border-color: rgba(124, 231, 255, .42); }
.empty { padding: 26px; color: var(--dim); text-align: center; }
</style>
