<script setup>
import { computed, onMounted } from 'vue'
import { visitorStoryStatus } from '../game-core/visitor-story.js'
import { useNpcPage } from '../composables/useNpcPage.js'

const { game, run, npc, backNpc } = useNpcPage()
const status = computed(() => (run.value && npc.value ? visitorStoryStatus(run.value, npc.value) : null))

onMounted(() => {
  // 首次打开时把访客故事写进当前 run；下次进入会保留阶段。
  if (status.value) game.save()
})

function advance() {
  if (!npc.value) return
  const result = game.advanceVisitorStory(npc.value.id)
  if (result.ok) {
    game.notify(result.completed ? '这段故事结束了' : '故事推进了一节', 'good')
  }
}
</script>

<template>
  <div v-if="npc" class="run-page visitor-story-page">
    <section class="panel story-head">
      <div>
        <RouterLink :to="backNpc" class="back-link">← {{ npc.name }}</RouterLink>
        <p class="kicker">VISITOR STORY · {{ status?.template?.id?.toUpperCase() || 'UNKNOWN' }}</p>
        <h1>{{ status?.template?.title || '没有故事' }}</h1>
        <p class="hint">{{ status?.template?.hook }}</p>
      </div>
      <span class="tag" :class="status?.completed ? 'jade' : 'amber'">{{ status?.completed ? '已完成' : `第 ${(status?.stage || 0) + 1} / 3 节` }}</span>
    </section>

    <section v-if="status" class="panel stage-list">
      <article
        v-for="(step, index) in status.template.steps"
        :key="step.name"
        class="stage-row"
        :class="{ 'is-current': index === status.stage, 'is-done': index < status.stage, 'is-locked': index > status.stage }"
      >
        <span class="stage-no">{{ index + 1 }}</span>
        <div>
          <b>{{ step.name }}</b>
          <p>{{ index <= status.stage ? step.text : '还没有走到这里。' }}</p>
          <span v-if="step.cost" class="stage-cost">需要 {{ step.cost }} 信用点</span>
        </div>
        <span class="stage-state">{{ index < status.stage ? '完成' : index === status.stage ? (status.completed ? '完成' : '当前') : '未解锁' }}</span>
      </article>
    </section>

    <section v-if="status && !status.completed" class="panel story-action">
      <div>
        <span class="kicker">NEXT</span>
        <p v-if="!status.canAdvance">
          需要信任 {{ status.stage === 0 ? 15 : status.stage === 1 ? 35 : 55 }}<template v-if="status.stage === 1"> 和 {{ status.cost }} 信用点</template><template v-if="status.stage === 2">、亲近 35</template>。
          当前信任 {{ status.trust }}，亲近 {{ status.closeness }}。
        </p>
        <p v-else>{{ status.step?.text }}</p>
      </div>
      <button type="button" class="btn btn-primary" :disabled="!status.canAdvance" @click="advance">
        {{ status.step?.name || '继续' }}
      </button>
    </section>

    <section v-else-if="status?.completed" class="panel story-action is-done">
      <span class="kicker">STORY COMPLETE</span>
      <p>这段故事已经结束。{{ npc.name }}会记得你替他做过的事。</p>
      <RouterLink :to="backNpc" class="btn btn-primary">回到资料</RouterLink>
    </section>
  </div>
</template>

<style scoped>
.visitor-story-page { gap: 12px; max-width: 900px; }
.story-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; padding: 18px; }
.back-link { display: inline-flex; margin-bottom: 9px; color: var(--dim); font-family: var(--mono); font-size: max(var(--ui-min), calc(9px * var(--ui-scale))); }
.story-head h1 { margin-top: 4px; font-size: max(var(--ui-min), calc(30px * var(--ui-scale))); font-weight: 300; letter-spacing: .08em; }
.stage-list { padding: 14px 16px; }
.stage-row { display: flex; align-items: flex-start; gap: 10px; padding: 10px 0; border-bottom: 1px solid rgba(255, 255, 255, .05); opacity: .5; }
.stage-row.is-current { opacity: 1; border-color: rgba(255, 196, 107, .28); }
.stage-row.is-done { opacity: .75; }
.stage-no { display: grid; place-items: center; width: 24px; height: 24px; flex: none; border: 1px solid var(--line); border-radius: 50%; color: var(--dim); font-family: var(--mono); font-size: max(var(--ui-min), calc(9px * var(--ui-scale))); }
.stage-row.is-current .stage-no { border-color: var(--amber); color: var(--amber); }
.stage-row.is-done .stage-no { border-color: rgba(138, 222, 184, .5); color: var(--jade); }
.stage-row b { font-size: max(var(--ui-min), calc(12px * var(--ui-scale))); font-weight: 500; }
.stage-row p { margin-top: 2px; color: var(--muted); font-size: max(var(--ui-min), calc(10px * var(--ui-scale))); line-height: 1.65; }
.stage-cost { display: block; margin-top: 3px; color: var(--amber); font-family: var(--mono); font-size: max(var(--ui-min), calc(8px * var(--ui-scale))); }
.stage-state { flex: none; color: var(--dim); font-family: var(--mono); font-size: max(var(--ui-min), calc(8px * var(--ui-scale))); }
.story-action { display: flex; align-items: center; justify-content: space-between; gap: 14px; padding: 15px 16px; }
.story-action p { margin-top: 4px; color: var(--muted); font-size: max(var(--ui-min), calc(10px * var(--ui-scale))); line-height: 1.7; }
.story-action.is-done { border-color: rgba(138, 222, 184, .3); }
@media (max-width: 650px) {
  .story-head { flex-direction: column; padding: 14px; }
  .story-action { align-items: flex-start; flex-direction: column; }
}
</style>
