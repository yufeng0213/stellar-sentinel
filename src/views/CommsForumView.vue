<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import CommsPageHeader from '../components/CommsPageHeader.vue'
import { useGameStore } from '../stores/game.js'

const game = useGameStore()
const route = useRoute()
const router = useRouter()
const run = computed(() => game.run)
const posts = computed(() => run.value?.social?.forumPosts || [])
const loading = ref(false)
const runId = computed(() => route.params.runId)

function preview(post) {
  return String(post?.body || '').replace(/\s+/g, ' ').slice(0, 78)
}

async function refresh() {
  if (loading.value) return
  loading.value = true
  const result = await game.refreshForumPost(true)
  loading.value = false
  if (result.ok && result.source !== 'llm') game.notify('模型没有返回内容，先用本地帖子', '')
}

function open(post) {
  router.push({ name: 'comms-forum-post', params: { runId: runId.value, postId: post.id } })
}

onMounted(async () => {
  if (!posts.value.length) await game.refreshForumPost(false)
})
</script>

<template>
  <div v-if="run" class="run-page">
    <CommsPageHeader
      kicker="COMMS · FORUM"
      title="空港论坛"
      hint="边境的消息、传闻和抱怨。点进帖子看完整讨论。"
    >
      <button type="button" class="btn btn-sm" :disabled="loading" @click="refresh">
        {{ loading ? '…' : '刷新' }}
      </button>
    </CommsPageHeader>

    <section class="panel forum-list-panel">
      <div v-if="posts.length" class="forum-list">
        <article
          v-for="post in posts"
          :key="post.id"
          class="forum-item"
          role="button"
          tabindex="0"
          @click="open(post)"
          @keyup.enter="open(post)"
        >
          <div class="forum-vote">
            <b>{{ post.comments?.length || 0 }}</b>
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
    </section>
  </div>
</template>

<style scoped>
.forum-list-panel { padding: 10px; }
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
.forum-tags { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 5px; color: var(--cyan); font-family: var(--mono); font-size: max(var(--ui-min), calc(8px * var(--ui-scale))); }
.forum-arrow { align-self: center; color: var(--dim); font-size: 20px; }
.empty { padding: 26px; color: var(--dim); text-align: center; }
</style>
