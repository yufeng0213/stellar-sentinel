<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { npcRelationTree } from '../game-core/npc.js'
import { useNpcPage } from '../composables/useNpcPage.js'

const router = useRouter()
const { run, npc, backNpc } = useNpcPage()
const tree = computed(() => (run.value && npc.value ? npcRelationTree(run.value, npc.value.id) : null))

function goTree(id) {
  if (!run.value || id === 'player') return
  router.push({ name: 'npc-network', params: { runId: run.value.id, npcId: id } })
}
</script>

<template>
  <div v-if="npc && tree" class="run-page npc-network-page">
    <section class="panel network-head">
      <div>
        <RouterLink :to="backNpc" class="back-link">← {{ npc.name }}</RouterLink>
        <p class="kicker">RELATION TREE · {{ npc.name }}</p>
        <h1>关系树</h1>
        <p class="hint">从{{ npc.name }}出发，按恋人和亲人、好友、对手与熟人分叉。直角连线表示一条关系。</p>
      </div>
      <span class="tag red">{{ tree.categories.find((item) => item.id === 'lover')?.items.length || 0 }} 位恋人</span>
    </section>

    <section class="panel tree-panel">
      <div class="tree-root">
        <div class="root-card">
          <span class="root-ava">{{ npc.name.slice(0, 1) }}</span>
          <div>
            <b>{{ npc.name }}</b>
            <span>{{ npc.abo }} · {{ npc.role }}</span>
          </div>
        </div>
        <div class="player-link">
          <span>你</span>
          <i></i>
          <span>{{ npc.lover ? '恋人' : `信任 ${npc.relation.trust} · 亲近 ${npc.relation.closeness}` }}</span>
        </div>
      </div>

      <div v-if="tree.categories.length" class="branch-list">
        <section v-for="category in tree.categories" :key="category.id" class="branch" :class="`branch-${category.id}`">
          <h3>{{ category.label }} <small>{{ category.items.length }}</small></h3>
          <div class="leaf-list">
            <button
              v-for="item in category.items"
              :key="item.npc.id"
              type="button"
              class="leaf"
              :class="{ 'is-player': item.npc.id === 'player' }"
              @click="goTree(item.npc.id)"
            >
              <span class="leaf-ava">{{ item.npc.id === 'player' ? '你' : item.npc.name.slice(0, 1) }}</span>
              <span class="leaf-body">
                <b>{{ item.npc.name }}</b>
                <small>{{ item.npc.role }} · {{ item.npc.abo }}</small>
              </span>
              <span v-if="item.edge" class="leaf-meta">信任 {{ item.edge.trust }} / 亲近 {{ item.edge.closeness }}</span>
            </button>
          </div>
        </section>
      </div>
      <p v-else class="empty">这个人暂时没有可展示的关系。</p>
    </section>
  </div>
</template>

<style scoped>
.npc-network-page { gap: 12px; max-width: 1100px; }
.network-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; padding: 18px; }
.back-link { display: inline-flex; margin-bottom: 9px; color: var(--dim); font-family: var(--mono); font-size: max(var(--ui-min), calc(9px * var(--ui-scale))); }
.network-head h1 { margin-top: 3px; font-size: max(var(--ui-min), calc(32px * var(--ui-scale))); font-weight: 300; letter-spacing: .1em; }
.tree-panel { padding: 20px; }
.tree-root { position: relative; display: flex; flex-direction: column; align-items: center; padding-bottom: 18px; border-bottom: 1px solid var(--line); }
.root-card { display: flex; align-items: center; gap: 12px; min-width: 240px; padding: 12px 16px; border: 1px solid rgba(124, 231, 255, .36); border-radius: 12px; background: rgba(124, 231, 255, .06); }
.root-ava, .leaf-ava { display: grid; place-items: center; width: 34px; height: 34px; border: 1px solid var(--line); border-radius: 8px; color: var(--cyan); font-size: max(var(--ui-min), calc(15px * var(--ui-scale))); }
.root-card b { display: block; font-size: max(var(--ui-min), calc(14px * var(--ui-scale))); font-weight: 500; }
.root-card span { display: block; margin-top: 2px; color: var(--dim); font-family: var(--mono); font-size: max(var(--ui-min), calc(8px * var(--ui-scale))); }
.player-link { display: flex; align-items: center; gap: 8px; margin-top: 12px; color: var(--dim); font-family: var(--mono); font-size: max(var(--ui-min), calc(8px * var(--ui-scale))); }
.player-link i { width: 60px; height: 1px; background: var(--line-2); }
.branch-list { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px 28px; padding-top: 18px; }
.branch { position: relative; padding-left: 20px; border-left: 1px solid rgba(124, 231, 255, .18); }
.branch::before { content: ''; position: absolute; left: -1px; top: 14px; width: 14px; height: 1px; background: rgba(124, 231, 255, .3); }
.branch h3 { margin-bottom: 8px; color: var(--muted); font-family: var(--mono); font-size: max(var(--ui-min), calc(9px * var(--ui-scale))); font-weight: 500; letter-spacing: .1em; }
.branch h3 small { color: var(--dim); }
.branch-lover { border-left-color: rgba(255, 138, 138, .4); }
.branch-lover::before { background: rgba(255, 138, 138, .5); }
.branch-lover h3 { color: var(--red); }
.branch-family { border-left-color: rgba(185, 164, 255, .35); }
.branch-rival { border-left-color: rgba(255, 196, 107, .35); }
.leaf-list { display: flex; flex-direction: column; gap: 5px; }
.leaf { position: relative; display: flex; align-items: center; gap: 8px; padding: 8px; border: 1px solid var(--line); border-radius: 8px; background: rgba(5, 10, 16, .4); color: var(--ink); text-align: left; cursor: pointer; }
.leaf::before { content: ''; position: absolute; left: -21px; top: 50%; width: 20px; height: 1px; background: rgba(124, 231, 255, .2); }
.leaf.is-player { cursor: default; border-color: rgba(255, 138, 138, .3); }
.leaf-body { flex: 1; min-width: 0; }
.leaf-body b { display: block; font-size: max(var(--ui-min), calc(11px * var(--ui-scale))); font-weight: 500; }
.leaf-body small { display: block; margin-top: 2px; color: var(--dim); font-family: var(--mono); font-size: max(var(--ui-min), calc(8px * var(--ui-scale))); }
.leaf-meta { flex: none; color: var(--dim); font-family: var(--mono); font-size: max(var(--ui-min), calc(7.5px * var(--ui-scale))); }
.empty { padding: 24px; color: var(--dim); text-align: center; }
@media (max-width: 700px) {
  .network-head { flex-direction: column; padding: 14px; }
  .branch-list { grid-template-columns: 1fr; }
  .tree-panel { padding: 14px; }
  .leaf-meta { display: none; }
}
</style>
