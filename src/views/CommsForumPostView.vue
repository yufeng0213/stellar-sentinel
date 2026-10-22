<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import CommsPageHeader from '../components/CommsPageHeader.vue'
import { useGameStore } from '../stores/game.js'

const game = useGameStore()
const route = useRoute()
const run = computed(() => game.run)
const postId = computed(() => String(route.params.postId || ''))
const post = computed(() => (run.value?.social?.forumPosts || []).find((item) => item.id === postId.value) || null)
const draft = ref('')
const replying = ref(false)
const loading = ref(false)

async function ensureLoaded() {
  if (!run.value) return
  if (!(run.value.social?.forumPosts || []).length) {
    loading.value = true
    await game.refreshForumPost(false)
    loading.value = false
  }
}

async function reply() {
  if (!post.value || replying.value) return
  const text = draft.value.trim()
  if (!text) return
  replying.value = true
  const result = await game.replyForumPost(post.value.id, text, true)
  replying.value = false
  if (result.ok) draft.value = ''
}

onMounted(ensureLoaded)
</script>

<template>
  <div v-if="run" class="run-page">
    <CommsPageHeader
      kicker="COMMS · FORUM"
      title="帖子"
      back-to="comms-forum"
      back-label="论坛"
    />

    <section v-if="post" class="panel forum-detail-panel">
      <div class="forum-meta">
        <span class="forum-channel">r/空港</span>
        <span>·</span>
        <span>{{ post.authorName || '匿名' }}</span>
        <span>·</span>
        <span>D{{ post.day }}</span>
      </div>
      <h3>{{ post.title }}</h3>
      <p class="forum-body">{{ post.body }}</p>
      <div v-if="post.tags?.length" class="forum-tags">
        <span v-for="tag in post.tags" :key="tag">#{{ tag }}</span>
      </div>

      <div class="forum-comment-head">
        <b>{{ post.comments?.length || 0 }} 条回应</b>
        <span>按时间排序</span>
      </div>
      <div v-if="post.comments?.length" class="forum-comments">
        <div v-for="comment in post.comments" :key="comment.id" class="forum-comment" :class="comment.authorType">
          <b>{{ comment.authorName || '匿名' }}</b>
          <span>{{ comment.text }}</span>
        </div>
      </div>
      <p v-else class="forum-empty">还没有人回应。</p>

      <div class="forum-input">
        <input
          v-model="draft"
          maxlength="240"
          :placeholder="replying ? '正在等回复…' : '写一条评论…'"
          :disabled="replying"
          @keyup.enter="reply"
        />
        <button type="button" class="btn btn-sm btn-primary" :disabled="replying || !draft.trim()" @click="reply">
          {{ replying ? '…' : '回复' }}
        </button>
      </div>
    </section>

    <section v-else class="panel forum-missing">
      <p class="empty">{{ loading ? '正在载入帖子…' : '这个帖子已经不存在了。' }}</p>
    </section>
  </div>
</template>

<style scoped>
.forum-detail-panel { padding: 12px; }
.forum-meta { display: flex; flex-wrap: wrap; align-items: center; gap: 4px; color: var(--dim); font-family: var(--mono); font-size: max(var(--ui-min), calc(8px * var(--ui-scale))); }
.forum-channel { color: var(--amber); }
.forum-detail-panel h3 { margin-top: 7px; font-size: max(var(--ui-min), calc(19px * var(--ui-scale))); font-weight: 500; line-height: 1.3; }
.forum-body { margin-top: 8px; color: var(--muted); font-size: max(var(--ui-min), calc(10px * var(--ui-scale))); line-height: 1.72; white-space: pre-wrap; }
.forum-tags { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 7px; color: var(--cyan); font-family: var(--mono); font-size: max(var(--ui-min), calc(8px * var(--ui-scale))); }
.forum-comment-head { display: flex; justify-content: space-between; gap: 8px; margin-top: 14px; padding-top: 9px; border-top: 1px solid var(--line); color: var(--dim); font-family: var(--mono); font-size: max(var(--ui-min), calc(8px * var(--ui-scale))); }
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
.forum-missing { padding: 10px; }
.empty { padding: 26px; color: var(--dim); text-align: center; }
</style>
