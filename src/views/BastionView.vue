<script setup>

import { computed } from 'vue'
import {
  BASTION_FACILITIES,
  bastionStatus,
  canInviteNpc,
  residentMood,
} from '../game-core/bastion.js'
import { npcList } from '../game-core/npc.js'
import { useGameStore } from '../stores/game.js'

const game = useGameStore()
const run = computed(() => game.run)
const bastion = computed(() => (run.value ? bastionStatus(run.value) : null))
const residents = computed(() => (bastion.value?.residents || [])
  .map((id) => run.value?.npcs?.[id])
  .filter(Boolean))
const facilities = computed(() => BASTION_FACILITIES.map((facility) => ({
  ...facility,
  npc: run.value?.npcs?.[bastion.value?.assignments?.[facility.id]] || null,
})))
const event = computed(() => bastion.value?.pendingEvent || null)
const residentsWithMood = computed(() => residents.value.map((npc) => ({ npc, mood: residentMood(npc) })))
const candidates = computed(() => {
  if (!run.value) return []
  return npcList(run.value)
    .filter((npc) => !bastion.value?.residents.includes(npc.id))
    .map((npc) => ({ npc, check: canInviteNpc(run.value, npc) }))
    .filter((item) => item.check.ok)
    .slice(0, 8)
})

function assign(facility, event) {
  const value = event.target.value || null
  game.assignBastion(facility.id, value)
}

function invite(item) {
  const result = game.inviteToBastion(item.npc.id)
  if (result.ok) game.notify(`${item.npc.name} 已入住渡鸦号`, 'good')
}

function remove(npc) {
  const result = game.removeFromBastion(npc.id)
  if (result.ok) game.notify(`${npc.name} 离开了据点`, 'info')
}

function rest() {
  const result = game.restAtBastion()
  if (result.ok && !result.event) game.notify('据点休整完成', 'good')
}

function resolveEvent(choice) {
  const result = game.resolveBastionEvent(event.value.id, choice.id)
  if (result.ok) game.notify('据点事件已处理', 'good')
}

</script>

<template>
  <div v-if="run && bastion" class="run-page bastion-page">
    <section class="panel bastion-head">
      <div>
        <RouterLink :to="{ name: 'city', params: { runId: run.id } }" class="back-link">← 城市</RouterLink>
        <p class="kicker">ARK · HOME BASE</p>
        <h1>{{ bastion.name }}</h1>
        <p class="hint">这不是一座公共城市。只有你亲自邀请的人，才会住进这里。</p>
        <div class="bastion-tags">
          <span class="tag cyan">居民 {{ bastion.residentCount }} / {{ bastion.capacity }}</span>
          <span class="tag" :class="run.ap > 0 ? 'amber' : 'jade'">AP {{ run.ap }} / {{ run.apMax }}</span>
          <span class="tag violet">休整日 D{{ bastion.lastRestDay || '—' }}</span>
        </div>
      </div>
      <span class="bastion-glyph">⌂</span>
    </section>

    <section class="panel resident-box">
      <div class="section-head">
        <div>
          <p class="kicker">RESIDENTS</p>
          <h2>据点成员</h2>
        </div>
        <span class="hint">从 NPC 资料页或下方候选邀请</span>
      </div>
      <div v-if="residents.length" class="resident-list">
        <article v-for="entry in residentsWithMood" :key="entry.npc.id" class="resident-row">
          <div class="resident-info">
            <b>{{ entry.npc.name }}</b>
            <span>{{ entry.npc.archetype?.name || '未分类' }} · 信任 {{ entry.npc.relation?.trust || 0 }} · 亲近 {{ entry.npc.relation?.closeness || 0 }}</span>
            <div class="needs-line">
              <span>安全 {{ entry.npc.bastionNeeds?.safety ?? 70 }}</span>
              <span>归属 {{ entry.npc.bastionNeeds?.belonging ?? 60 }}</span>
              <span>意义 {{ entry.npc.bastionNeeds?.purpose ?? 60 }}</span>
              <em :class="`is-${entry.mood.color}`">{{ entry.mood.label }} {{ entry.mood.score }}</em>
            </div>
          </div>
          <div class="resident-actions">
            <em v-if="entry.npc.lover">恋人</em>
            <em v-else-if="entry.npc.quarrel?.active">冷战中</em>
            <button type="button" class="btn btn-sm btn-ghost" @click="remove(entry.npc)">离开</button>
          </div>
        </article>
      </div>
      <p v-else class="empty-hint">据点还没有人。邀请一个你信任的人，这里才会开始像一个家。</p>
    </section>

    <section v-if="event" class="panel bastion-event">
      <div class="event-head">
        <div>
          <p class="kicker">BASTION EVENT · {{ event.type.toUpperCase() }}</p>
          <h2>{{ event.title }}</h2>
        </div>
        <span class="tag" :class="bastion.tension >= 55 ? 'red' : bastion.tension >= 35 ? 'amber' : 'jade'">
          气氛 {{ bastion.tension }}
        </span>
      </div>
      <p class="event-text">{{ event.text }}</p>
      <div class="event-choices">
        <button v-for="choice in event.choices" :key="choice.id" type="button" class="btn btn-sm" @click="resolveEvent(choice)">
          {{ choice.label }}
        </button>
      </div>
    </section>

    <section v-if="candidates.length" class="panel candidate-box">
      <div class="section-head">
        <div>
          <p class="kicker">INVITATIONS</p>
          <h2>可邀请</h2>
        </div>
      </div>
      <div class="candidate-list">
        <article v-for="item in candidates" :key="item.npc.id" class="candidate-row">
          <div>
            <b>{{ item.npc.name }}</b>
            <span>{{ item.npc.archetype?.name || '未分类' }} · 信任 {{ item.npc.relation?.trust || 0 }}</span>
          </div>
          <button type="button" class="btn btn-sm" :disabled="!bastion.hasSpace" @click="invite(item)">邀请</button>
        </article>
      </div>
    </section>

    <section class="panel facility-box">
      <div class="section-head">
        <div>
          <p class="kicker">FACILITIES</p>
          <h2>设施与值班</h2>
        </div>
        <span class="hint">每个设施一名居民</span>
      </div>
      <div class="facility-grid">
        <article v-for="facility in facilities" :key="facility.id" class="facility-card">
          <div class="facility-top">
            <b>{{ facility.name }}</b>
            <span>{{ facility.npc?.name || '空缺' }}</span>
          </div>
          <p>{{ facility.desc }}</p>
          <em>{{ facility.output }}</em>
          <select :value="bastion.assignments[facility.id] || ''" @change="assign(facility, $event)">
            <option value="">— 空缺 —</option>
            <option v-for="npc in residents" :key="npc.id" :value="npc.id">{{ npc.name }}</option>
          </select>
        </article>
      </div>
    </section>

    <section class="panel rest-box">
      <div>
        <p class="kicker">DOWNTIME</p>
        <h3>据点休整</h3>
        <p>消耗完行动点后，安排一次休整。值班居民会产出物资，匹配设施的人会做得更好。</p>
      </div>
      <button type="button" class="btn btn-primary" :disabled="run.ap > 0 || bastion.lastRestDay === run.day || !residents.length" @click="rest">
        {{ run.ap > 0 ? '还有行动点' : bastion.lastRestDay === run.day ? '今天已休整' : '休整 · 结算设施' }}
      </button>
    </section>

    <section v-if="bastion.lastReport?.length" class="panel report-box">
      <p class="kicker">LAST REPORT · D{{ bastion.lastRestDay }}</p>
      <p v-for="line in bastion.lastReport" :key="line">{{ line }}</p>
    </section>
  </div>
</template>

<style scoped>

.bastion-page { display: flex; flex-direction: column; gap: 12px; padding-bottom: 28px; max-width: 1100px; }
.bastion-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; padding: 18px; }
.back-link { display: inline-flex; margin-bottom: 8px; color: var(--dim); font-family: var(--mono); font-size: max(var(--ui-min), calc(9px * var(--ui-scale))); }
.bastion-head h1 { margin-top: 4px; font-size: max(var(--ui-min), calc(32px * var(--ui-scale))); font-weight: 300; letter-spacing: .1em; }
.bastion-glyph { color: var(--cyan); font-size: max(var(--ui-min), calc(52px * var(--ui-scale))); opacity: .6; }
.bastion-tags { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 10px; }
.section-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; }
.section-head h2 { margin-top: 3px; font-size: max(var(--ui-min), calc(18px * var(--ui-scale))); font-weight: 400; }
.resident-box, .candidate-box, .facility-box { padding: 14px; }
.resident-list, .candidate-list { display: flex; flex-direction: column; gap: 5px; margin-top: 10px; }
.resident-row, .candidate-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 9px 10px; border: 1px solid var(--line); border-radius: 8px; background: rgba(5, 10, 16, .36); }
.resident-info { min-width: 0; }
.resident-row b, .candidate-row b { font-size: max(var(--ui-min), calc(11px * var(--ui-scale))); font-weight: 500; }
.resident-actions { display: flex; align-items: center; gap: 7px; flex-shrink: 0; }
.needs-line { display: flex; flex-wrap: wrap; align-items: center; gap: 7px; margin-top: 5px; color: var(--dim); font-family: var(--mono); font-size: max(var(--ui-min), calc(8px * var(--ui-scale))); }
.needs-line em { font-style: normal; }
.needs-line .is-jade { color: var(--jade); }
.needs-line .is-cyan { color: var(--cyan); }
.needs-line .is-amber { color: var(--amber); }
.needs-line .is-red { color: var(--red); }
.bastion-event { padding: 14px 16px; border-color: rgba(255, 196, 107, .35); background: rgba(255, 196, 107, .035); }
.event-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; }
.event-head h2 { margin-top: 3px; font-size: max(var(--ui-min), calc(18px * var(--ui-scale))); font-weight: 400; }
.event-text { margin-top: 8px; white-space: pre-line; color: var(--muted); font-size: max(var(--ui-min), calc(10px * var(--ui-scale))); line-height: 1.75; }
.event-choices { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 11px; }
.resident-row span, .candidate-row span { display: block; margin-top: 2px; color: var(--dim); font-family: var(--mono); font-size: max(var(--ui-min), calc(8.5px * var(--ui-scale))); }
.resident-row em { color: var(--violet); font-family: var(--mono); font-size: max(var(--ui-min), calc(8px * var(--ui-scale))); font-style: normal; }
.empty-hint { margin-top: 10px; color: var(--dim); font-size: max(var(--ui-min), calc(9.5px * var(--ui-scale))); line-height: 1.7; }
.facility-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 7px; margin-top: 10px; }
.facility-card { display: flex; flex-direction: column; gap: 6px; padding: 10px; border: 1px solid var(--line); border-radius: 8px; background: rgba(5, 10, 16, .38); }
.facility-top { display: flex; align-items: baseline; justify-content: space-between; gap: 5px; }
.facility-top b { font-size: max(var(--ui-min), calc(11px * var(--ui-scale))); font-weight: 500; }
.facility-top span { color: var(--cyan); font-family: var(--mono); font-size: max(var(--ui-min), calc(8px * var(--ui-scale))); }
.facility-card p { flex: 1; color: var(--muted); font-size: max(var(--ui-min), calc(9px * var(--ui-scale))); line-height: 1.55; }
.facility-card em { color: var(--jade); font-family: var(--mono); font-size: max(var(--ui-min), calc(8px * var(--ui-scale))); font-style: normal; }
.facility-card select { height: 28px; border: 1px solid var(--line); border-radius: 6px; background: rgba(5, 10, 16, .8); color: var(--ink); font-size: max(var(--ui-min), calc(9px * var(--ui-scale))); }
.rest-box { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 14px 16px; }
.rest-box h3 { margin-top: 3px; font-size: max(var(--ui-min), calc(18px * var(--ui-scale))); font-weight: 400; }
.rest-box p { margin-top: 4px; color: var(--muted); font-size: max(var(--ui-min), calc(9.5px * var(--ui-scale))); line-height: 1.6; }
.report-box { padding: 12px 14px; }
.report-box p:not(.kicker) { margin-top: 4px; color: var(--muted); font-size: max(var(--ui-min), calc(9.5px * var(--ui-scale))); line-height: 1.65; }
@media (max-width: 800px) {
  .bastion-head { flex-direction: column; }
  .facility-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .rest-box { align-items: flex-start; flex-direction: column; }
}
@media (max-width: 480px) {
  .facility-grid { grid-template-columns: 1fr; }
}
</style>
