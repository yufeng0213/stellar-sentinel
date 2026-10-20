<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { loreStatusFor } from '../game/lore.js'
import { useNpcPage } from '../composables/useNpcPage.js'

const { game, npc, backNpc } = useNpcPage()
const loreTierId = ref('public')
const loreBusy = ref(false)
const loreError = ref('')
const llmReady = ref(null)

const loreInfo = computed(() => (npc.value ? loreStatusFor(npc.value, loreTierId.value) : null))

watch(npc, (value) => {
  if (value) loreTierId.value = loreStatusFor(value).selected.id
}, { immediate: true })

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

function selectTier(tierId) {
  if (!loreInfo.value?.tiers.some((tier) => tier.id === tierId)) return
  loreTierId.value = tierId
  loreError.value = ''
}

async function discover() {
  if (!npc.value || loreBusy.value) return
  if (llmReady.value === null) await checkLlm()
  loreBusy.value = true
  loreError.value = ''
  const result = await game.discoverNpcLore(npc.value.id, loreTierId.value, llmReady.value === true)
  loreBusy.value = false
  if (result.ok) {
    loreTierId.value = result.entry.tier
    if (result.error) loreError.value = result.error
    game.notify(result.source === 'llm' ? '档案已更新' : '本地档案已补全', 'good')
  } else {
    loreError.value = result.message
    game.notify(result.message, 'bad')
  }
}
</script>

<template>
  <div v-if="npc && loreInfo" class="run-page lore-page">
    <section class="panel page-head">
      <RouterLink :to="backNpc" class="back-link">← {{ npc.name }}</RouterLink>
      <p class="kicker">ARCHIVE · DISCOVERY</p>
      <h2>探知档案</h2>
      <p class="hint">每次只展开一条。阶段由信任与亲近解锁，已经看过的内容会保存在存档里。</p>
    </section>

    <section class="panel lore-panel">
      <div class="lore-tiers">
        <button
          v-for="tier in loreInfo.tiers"
          :key="tier.id"
          type="button"
          class="lore-tier"
          :class="{ 'is-on': loreTierId === tier.id, 'is-locked': !tier.unlocked }"
          @click="selectTier(tier.id)"
        >
          <span>{{ tier.name }}</span>
          <em>{{ tier.used }}/{{ tier.slots.length }}</em>
        </button>
      </div>

      <p v-if="!loreInfo.selected.unlocked" class="lore-note">
        需要信任 {{ loreInfo.selected.trust }}、亲近 {{ loreInfo.selected.closeness }}。当前：信任
        {{ npc.relation.trust }}，亲近 {{ npc.relation.closeness }}。
      </p>
      <p v-else-if="loreInfo.selected.remaining === 0" class="lore-note">这一层已经看完了。可以切换到其他已解锁层级。</p>
      <p v-else class="lore-note">这一层还能探知 {{ loreInfo.selected.remaining }} 条。每次只会展开一段。</p>

      <button
        type="button"
        class="btn btn-primary discover-btn"
        :disabled="loreBusy || !loreInfo.selected.unlocked || loreInfo.selected.remaining === 0"
        @click="discover"
      >
        {{ loreBusy ? '正在拼合…' : !loreInfo.selected.unlocked ? '尚未解锁' : loreInfo.selected.remaining > 0 ? `探知 · ${loreInfo.selected.name}` : '这一层已看完' }}
      </button>

      <p v-if="loreError" class="lore-error">本地补全原因：{{ loreError }}</p>

      <article v-if="loreInfo.latest" class="lore-entry">
        <div class="lore-entry-head">
          <span class="kicker">{{ loreInfo.latest.tierName }} · {{ loreInfo.latest.slotLabel }} · D{{ loreInfo.latest.day }}</span>
          <span class="tag" :class="loreInfo.latest.source === 'llm' ? 'cyan' : 'jade'">
            {{ loreInfo.latest.source === 'llm' ? '模型记录' : '本地档案' }}
          </span>
        </div>
        <p>{{ loreInfo.latest.text }}</p>
        <span class="lore-count">已探知 {{ loreInfo.total }} 条</span>
      </article>
      <p v-else class="empty">这一层还没有展开任何记录。</p>
    </section>
  </div>
</template>

<style scoped>
.lore-page { gap: 12px; }
.page-head { padding: 16px; }
.back-link { display: inline-flex; margin-bottom: 10px; color: var(--dim); font-family: var(--mono); font-size: max(var(--ui-min), calc(9px * var(--ui-scale))); }
.page-head h2 { margin-top: 4px; font-size: max(var(--ui-min), calc(26px * var(--ui-scale))); font-weight: 300; letter-spacing: .08em; }
.lore-panel { padding: 16px; }
.lore-tiers { display: flex; flex-wrap: wrap; gap: 5px; }
.lore-tier { display: inline-flex; align-items: center; gap: 5px; min-height: 32px; padding: 0 9px; border: 1px solid var(--line); border-radius: 7px; background: transparent; color: var(--dim); font-size: max(var(--ui-min), calc(10px * var(--ui-scale))); cursor: pointer; }
.lore-tier em { color: var(--dim); font-family: var(--mono); font-size: max(var(--ui-min), calc(8px * var(--ui-scale))); font-style: normal; }
.lore-tier.is-on { border-color: rgba(185, 164, 255, .48); background: rgba(185, 164, 255, .1); color: var(--violet); }
.lore-tier.is-on em { color: var(--violet); }
.lore-tier.is-locked { opacity: .4; }
.lore-note { margin-top: 14px; color: var(--dim); font-size: max(var(--ui-min), calc(10px * var(--ui-scale))); line-height: 1.7; }
.discover-btn { margin-top: 12px; }
.lore-error { margin-top: 8px; color: var(--red); font-size: max(var(--ui-min), calc(9px * var(--ui-scale))); }
.lore-entry { margin-top: 16px; padding: 14px; border: 1px solid rgba(124, 231, 255, .16); border-radius: 10px; background: rgba(4, 8, 13, .42); }
.lore-entry-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.lore-entry p { margin-top: 8px; color: var(--muted); font-size: max(var(--ui-min), calc(12px * var(--ui-scale))); line-height: 1.85; }
.lore-count { display: block; margin-top: 8px; color: var(--dim); font-family: var(--mono); font-size: max(var(--ui-min), calc(8px * var(--ui-scale))); text-align: right; }
.empty { margin-top: 18px; color: var(--dim); font-size: max(var(--ui-min), calc(10px * var(--ui-scale))); text-align: center; }
</style>
