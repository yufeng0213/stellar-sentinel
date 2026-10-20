<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ITEMS, REGIONS } from '../game-core/data.js'
import { AXES, PERSONALITY_LABELS, canInviteToParty, factionName, romanceStatus } from '../game-core/npc.js'
import { TAG_CATEGORIES } from '../game-core/npc-tags.js'
import { visitorStoryStatus } from '../game-core/visitor-story.js'
import { useNpcPage } from '../composables/useNpcPage.js'

const router = useRouter()
const { game, run, npc, tags, backComms, axisPercent } = useNpcPage()
const reply = ref('')
const visitorStory = computed(() => (npc.value?.visitor ? visitorStoryStatus(run.value, npc.value) : null))
const bagItems = computed(() => Object.keys(npc.value?.bag || {})
  .filter((key) => ITEMS[key] && npc.value.bag[key] > 0)
  .map((key) => ({ key, ...ITEMS[key], count: npc.value.bag[key] })))
const npcGear = computed(() => Object.values(npc.value?.gear || {}))
const archetype = computed(() => npc.value?.archetype || null)

const inviteCheck = computed(() => (
  npc.value ? canInviteToParty(run.value, npc.value.id) : { ok: false, reason: '' }
))
const romance = computed(() => (run.value && npc.value ? romanceStatus(run.value, npc.value.id) : null))

function go(name) {
  if (!npc.value || !run.value) return
  router.push({ name, params: { runId: run.value.id, npcId: npc.value.id } })
}

function doTalk(topic) {
  if (!npc.value) return
  const result = game.talkNpc(npc.value.id, topic)
  reply.value = result.reply || result.message || ''
}

function doSteal() {
  if (!npc.value) return
  const result = game.stealNpc(npc.value.id)
  reply.value = result.text || result.message || ''
  if (result.ok) game.notify(result.success ? '扒窃成功' : '被发现了', result.success ? 'good' : 'bad')
}

function doThreat() {
  if (!npc.value) return
  const result = game.threatenNpc(npc.value.id)
  reply.value = result.reply || result.message || ''
  game.notify('你选择了威胁', 'bad')
}

function doApologize() {
  if (!npc.value) return
  const result = game.apologizeNpc(npc.value.id)
  reply.value = result.reply || result.message || ''
}

function doInvite() {
  if (!npc.value) return
  const result = game.inviteNpc(npc.value.id)
  reply.value = result.reply || result.message || ''
  if (result.ok) game.notify('已加入队伍', 'good')
}

function doLeave() {
  if (!npc.value) return
  const result = game.leaveNpc(npc.value.id)
  reply.value = result.reply || result.message || ''
}

function doConfess() {
  if (!npc.value) return
  const result = game.confessNpc(npc.value.id)
  reply.value = result.text || result.message || ''
  if (result.ok) game.notify(result.accepted ? '你们开始交往了' : '对方还需要一点时间', result.accepted ? 'good' : '')
}

function doBreakUp() {
  if (!npc.value) return
  const result = game.breakUpNpc(npc.value.id)
  reply.value = result.text || result.message || ''
  if (result.ok) game.notify('关系结束了', 'bad')
}
</script>

<template>
  <div v-if="npc && run" class="run-page npc-page">
    <section class="panel npc-hero">
      <RouterLink :to="backComms" class="back-link">← 名册</RouterLink>
      <div class="hero-main">
        <span class="npc-ava">{{ npc.name.slice(0, 1) }}</span>
        <div>
          <p class="kicker">{{ factionName(npc.faction) }} · {{ REGIONS[npc.home].name }}</p>
          <h2>{{ npc.name }}</h2>
          <p class="sub">{{ npc.abo }} · {{ npc.role }}</p>
          <div class="sheet-tags">
            <span v-if="archetype" class="tag violet">{{ archetype.glyph }} {{ archetype.name }}</span>
            <span v-if="npc.lover" class="tag red">恋人</span>
            <span v-if="npc.party" class="tag jade">队伍中</span>
            <span v-if="npc.hostile" class="tag red">敌视</span>
            <span v-if="npc.injured" class="tag amber">受伤</span>
            <span v-if="!npc.alive" class="tag red">已死亡</span>
            <span v-if="npc.bias >= 20" class="tag cyan">初次印象不错</span>
            <span v-else-if="npc.bias <= -15" class="tag">初次印象很差</span>
          </div>
        </div>
      </div>
    </section>

    <section v-if="archetype" class="panel npc-block archetype-block">
      <div class="archetype-head">
        <span class="archetype-glyph">{{ archetype.glyph }}</span>
        <div>
          <p class="kicker">PERSONA</p>
          <h3>{{ archetype.name }}</h3>
          <p class="archetype-tagline">{{ archetype.tagline }}</p>
        </div>
      </div>
      <p class="archetype-desc">{{ archetype.desc }}</p>
      <p class="hint">说话方式：{{ archetype.voice }}</p>
    </section>

    <section class="panel npc-block">
      <h3>四轴关系</h3>
      <div class="axes">
        <div v-for="axis in AXES" :key="axis.key" class="axis-row">
          <span>{{ axis.name }}</span>
          <span class="bar" :class="`axis-${axis.key}`"><i :style="{ width: `${axisPercent(npc.relation[axis.key])}%` }"></i></span>
          <b>{{ npc.relation[axis.key] }}</b>
        </div>
        <div class="axis-row is-grievance">
          <span>怨念</span>
          <span class="bar axis-grievance"><i :style="{ width: `${axisPercent(npc.relation.grievance)}%` }"></i></span>
          <b>{{ npc.relation.grievance }}</b>
        </div>
      </div>
      <div class="tag-affinity" :class="{ bad: (npc.tagBias || 0) < 0 }">
        标签契合 {{ (npc.tagBias || 0) > 0 ? '+' : '' }}{{ npc.tagBias || 0 }}
      </div>
    </section>

    <section class="panel npc-block">
      <h3>行动</h3>
      <div class="npc-actions">
        <button type="button" class="btn btn-sm btn-primary" :disabled="!npc.alive" @click="go('npc-chat')">对话</button>
        <button type="button" class="btn btn-sm" :disabled="!npc.alive || npc.hostile" @click="go('npc-gift')">赠送</button>
        <button type="button" class="btn btn-sm" :disabled="!npc.alive || npc.hostile" @click="doTalk('life')">近况</button>
        <button type="button" class="btn btn-sm" :disabled="!npc.alive || npc.hostile" @click="doTalk('interest')">兴趣</button>
        <button type="button" class="btn btn-sm" :disabled="!npc.alive || npc.hostile" @click="doTalk('probe')">试探</button>
        <button v-if="!npc.party" type="button" class="btn btn-sm" :disabled="!inviteCheck.ok" :title="inviteCheck.reason" @click="doInvite">组队</button>
        <button v-else type="button" class="btn btn-sm" @click="doLeave">离队</button>
        <button type="button" class="btn btn-sm" :disabled="!npc.alive || npc.hostile" title="敏捷判定；有扒窃能力时 +2" @click="doSteal">扒窃</button>
        <button type="button" class="btn btn-sm" :disabled="!npc.alive || npc.hostile" @click="doThreat">威胁</button>
        <button type="button" class="btn btn-sm" :disabled="!npc.alive" @click="doApologize">道歉 · 40</button>
        <button v-if="romance?.lover" type="button" class="btn btn-sm" @click="doBreakUp">结束关系</button>
        <button v-else-if="romance?.available" type="button" class="btn btn-sm" @click="doConfess">表达心意</button>
      </div>
      <p v-if="reply" class="reply">{{ reply }}</p>
      <p v-if="!npc.party" class="hint">组队需要信任 50、亲近 30，队伍上限 2 人。</p>
    </section>

    <section v-if="bagItems.length" class="panel npc-block">
      <h3>随身物品</h3>
      <p class="hint">他收下的东西。受伤时，如果他带着医疗包或营养膏，会自己使用。</p>
      <div class="bag-chips">
        <span v-for="item in bagItems" :key="item.key" class="tag">{{ item.glyph }} {{ item.name }} ×{{ item.count }}</span>
      </div>
    </section>

    <section v-if="npcGear.length" class="panel npc-block">
      <h3>装备</h3>
      <p class="hint">你送给他的装备会进入他的战斗属性，也会在 NPC 自主冲突中使用。</p>
      <div class="bag-chips">
        <span v-for="gear in npcGear" :key="gear.uid" class="tag cyan">{{ gear.name }} · {{ gear.quality }}</span>
      </div>
    </section>

    <section class="panel npc-block">
      <h3>深入</h3>
      <div class="npc-links">
        <button type="button" class="link-card" @click="go('npc-lore')">
          <b>探知档案</b>
          <span>按关系阶段逐条解锁这个人的过去</span>
        </button>
        <button type="button" class="link-card" @click="go('npc-network')">
          <b>关系树</b>
          <span>恋人和亲人、好友与对手的直角分支</span>
        </button>
        <button type="button" class="link-card" @click="go('npc-trade')">
          <b>交易</b>
          <span>买他的背包，或把东西卖给他</span>
        </button>
        <button type="button" class="link-card" @click="go('npc-memory')">
          <b>记忆</b>
          <span>短期印象与每周长期记忆</span>
        </button>
        <button v-if="visitorStory" type="button" class="link-card" @click="go('npc-story')">
          <b>访客故事</b>
          <span>{{ visitorStory.completed ? '这段故事已经结束' : `第 ${visitorStory.stage + 1} / 3 节 · ${visitorStory.template.title}` }}</span>
        </button>
        <button type="button" class="link-card" @click="go('npc-chat')">
          <b>通讯</b>
          <span>把对话放到单独页面，不再挤在资料里</span>
        </button>
      </div>
    </section>

    <section class="panel npc-block">
      <h3>标签</h3>
      <div class="tag-list">
        <div v-for="tag in tags" :key="tag.id" class="tag-item" :class="`is-${tag.category}`">
          <div class="tag-item-head">
            <b>{{ tag.name }}</b>
            <span>{{ TAG_CATEGORIES[tag.category]?.label || tag.category }}</span>
          </div>
          <p>{{ tag.desc }}</p>
        </div>
      </div>
    </section>

    <section class="panel npc-block">
      <h3>性格与兴趣</h3>
      <div class="personality">
        <span v-for="(label, key) in PERSONALITY_LABELS" :key="key">{{ label }} <b>{{ npc.personality[key] }}</b></span>
      </div>
      <div class="chips">
        <span v-for="interest in npc.interests" :key="interest" class="tag">{{ interest }}</span>
      </div>
    </section>

    <section class="panel npc-block">
      <h3>日程</h3>
      <div class="schedule">
        <p v-for="(item, index) in npc.schedule" :key="index">
          <span>{{ ['晨间', '午后', '黄昏'][index] || '时段' }}</span>{{ item }}
        </p>
      </div>
    </section>
  </div>
</template>

<style scoped>
.npc-page { gap: 12px; }
.back-link { display: inline-flex; margin-bottom: 10px; color: var(--dim); font-family: var(--mono); font-size: max(var(--ui-min), calc(9px * var(--ui-scale))); }
.npc-hero { padding: 16px; }
.hero-main { display: flex; align-items: center; gap: 12px; }
.npc-ava {
  display: grid;
  place-items: center;
  width: 50px;
  height: 50px;
  flex: none;
  border: 1px solid rgba(124, 231, 255, .3);
  border-radius: 14px;
  background: rgba(124, 231, 255, .07);
  color: var(--cyan);
  font-size: max(var(--ui-min), calc(20px * var(--ui-scale)));
}
.npc-hero h2 { margin-top: 2px; font-size: max(var(--ui-min), calc(26px * var(--ui-scale))); font-weight: 300; letter-spacing: .08em; }
.sub { color: var(--dim); font-size: max(var(--ui-min), calc(10px * var(--ui-scale))); }
.sheet-tags { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 7px; }
.npc-block { padding: 14px 16px; }
.npc-block h3 { margin-bottom: 10px; color: var(--ink); font-size: max(var(--ui-min), calc(14px * var(--ui-scale))); font-weight: 500; letter-spacing: .06em; }
.bag-chips { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 8px; }
.archetype-block { border-color: rgba(185, 164, 255, .22); background: rgba(185, 164, 255, .045); }
.archetype-head { display: flex; align-items: center; gap: 10px; }
.archetype-glyph { display: grid; place-items: center; width: 38px; height: 38px; flex: none; border: 1px solid rgba(185, 164, 255, .35); border-radius: 9px; color: var(--violet); font-size: max(var(--ui-min), calc(18px * var(--ui-scale))); }
.archetype-head h3 { margin: 2px 0 0; }
.archetype-tagline { margin-top: 2px; color: var(--violet); font-family: var(--mono); font-size: max(var(--ui-min), calc(9px * var(--ui-scale))); }
.archetype-desc { margin-top: 8px; color: var(--muted); font-size: max(var(--ui-min), calc(10px * var(--ui-scale))); line-height: 1.7; }
.axes { display: flex; flex-direction: column; gap: 5px; }
.axis-row { display: grid; grid-template-columns: 42px minmax(0, 1fr) 28px; align-items: center; gap: 8px; color: var(--muted); font-size: max(var(--ui-min), calc(10px * var(--ui-scale))); }
.axis-row b { color: var(--ink); font-family: var(--mono); font-size: max(var(--ui-min), calc(10px * var(--ui-scale))); font-weight: 500; text-align: right; }
.axis-row .bar { height: 5px; background: rgba(255, 255, 255, .07); }
.axis-row .bar i { display: block; height: 100%; border-radius: inherit; background: var(--cyan); transition: width .35s ease; }
.axis-trust i { background: linear-gradient(90deg, #3f86ad, #7ce7ff); }
.axis-respect i { background: linear-gradient(90deg, #6d5ea8, #b9a4ff); }
.axis-closeness i { background: linear-gradient(90deg, #3fa989, #8adeb8); }
.axis-fear i { background: linear-gradient(90deg, #b27a37, #ffc46b); }
.axis-grievance i { background: linear-gradient(90deg, #a84343, #ff8a8a); }
.axis-row.is-grievance { color: var(--red); }
.tag-affinity {
  margin-top: 10px;
  padding: 5px 8px;
  border: 1px solid rgba(138, 222, 184, .24);
  border-radius: 5px;
  color: var(--jade);
  font-family: var(--mono);
  font-size: max(var(--ui-min), calc(9px * var(--ui-scale)));
  text-align: center;
}
.tag-affinity.bad { border-color: rgba(255, 138, 138, .26); color: var(--red); }
.npc-actions { display: flex; flex-wrap: wrap; gap: 5px; }
.reply { margin-top: 10px; padding: 8px 10px; border-left: 2px solid rgba(124, 231, 255, .3); background: rgba(124, 231, 255, .04); color: var(--muted); font-size: max(var(--ui-min), calc(10px * var(--ui-scale))); line-height: 1.7; }
.npc-links { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
.link-card { padding: 12px; border: 1px solid var(--line); border-radius: 10px; background: rgba(5, 10, 16, .42); text-align: left; cursor: pointer; }
.link-card b { display: block; color: var(--cyan); font-size: max(var(--ui-min), calc(12px * var(--ui-scale))); font-weight: 500; }
.link-card span { display: block; margin-top: 4px; color: var(--dim); font-size: max(var(--ui-min), calc(9px * var(--ui-scale))); line-height: 1.6; }
.tag-list { display: flex; flex-direction: column; gap: 4px; }
.tag-item { padding: 7px 9px; border-left: 2px solid var(--line); border-radius: 0 7px 7px 0; background: rgba(5, 10, 16, .35); }
.tag-item-head { display: flex; align-items: baseline; justify-content: space-between; gap: 6px; }
.tag-item-head b { font-size: max(var(--ui-min), calc(11px * var(--ui-scale))); font-weight: 500; }
.tag-item-head span { color: var(--dim); font-family: var(--mono); font-size: max(var(--ui-min), calc(8px * var(--ui-scale))); }
.tag-item p { margin-top: 1px; color: var(--muted); font-size: max(var(--ui-min), calc(9px * var(--ui-scale))); line-height: 1.55; }
.tag-item.is-background, .tag-item.is-body { border-color: rgba(124, 231, 255, .35); }
.tag-item.is-personality { border-color: rgba(255, 196, 107, .38); }
.tag-item.is-values { border-color: rgba(185, 164, 255, .38); }
.tag-item.is-profession { border-color: rgba(138, 222, 184, .38); }
.tag-item.is-social, .tag-item.is-shadow { border-color: rgba(255, 138, 138, .38); }
.personality { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 6px; color: var(--dim); font-size: max(var(--ui-min), calc(9px * var(--ui-scale))); }
.personality b { color: var(--muted); font-family: var(--mono); font-weight: 500; }
.chips { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 10px; }
.schedule { display: flex; flex-direction: column; gap: 3px; }
.schedule p { color: var(--muted); font-size: max(var(--ui-min), calc(10px * var(--ui-scale))); line-height: 1.6; }
.schedule span { margin-right: 7px; color: var(--dim); font-family: var(--mono); font-size: max(var(--ui-min), calc(8px * var(--ui-scale))); }
@media (max-width: 640px) {
  .npc-links { grid-template-columns: 1fr; }
  .personality { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
</style>
