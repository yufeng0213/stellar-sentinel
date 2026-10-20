<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  ABOS, ATTRS, FLAWS, GEAR_GLYPH, LANDSCAPES, ORIGINS, REGIONS, ROLES,
  SCENTS, SKILLS, SLOTS, SPECIES, TRAITS,
} from '../game-core/data.js'
import { attrTotal, timeLabel } from '../game-core/run.js'
import { useGameStore } from '../stores/game.js'

const game = useGameStore()
const router = useRouter()
const run = computed(() => game.run)
const player = computed(() => run.value?.player)

const abo = computed(() => (player.value ? ABOS[player.value.abo] : null))
const role = computed(() => (player.value ? ROLES[player.value.role] : null))
const origin = computed(() => (player.value ? ORIGINS[player.value.origin] : null))
const species = computed(() => (player.value ? SPECIES[player.value.species] || SPECIES.human : null))
const landscape = computed(() => (player.value ? LANDSCAPES[player.value.landscape] || LANDSCAPES.snowfield : null))
const scent = computed(() => (player.value ? SCENTS[player.value.scent] || SCENTS.rain : null))
const flawDef = computed(() => {
  if (!player.value) return null
  return FLAWS[player.value.flaw] || FLAWS[player.value.flaws?.[0]] || null
})
const skillDefs = computed(() => (player.value?.skills || []).map((key) => SKILLS[key]).filter(Boolean))
const region = computed(() => (run.value ? REGIONS[run.value.map.nodes[run.value.location].region] : null))

const statusTags = computed(() => {
  if (!run.value) return []
  const tags = []
  if (run.value.player.mental < 30) tags.push({ text: '精神疲惫 -2', kind: 'red' })
  if (player.value.traits.includes('night')) tags.push({ text: '夜行者', kind: 'jade' })
  if (run.value.player.mental >= 90) tags.push({ text: '图景清明', kind: 'cyan' })
  return tags
})

const slots = computed(() => {
  if (!run.value) return []
  return Object.keys(SLOTS).map((slot) => {
    const uid = run.value.equipment[slot]
    const gear = uid ? run.value.gear.find((item) => item.uid === uid) : null
    return { slot, label: SLOTS[slot], gear }
  })
})

function bonusText(bonus) {
  return Object.keys(bonus).filter((key) => bonus[key]).map((key) => `${ATTRS.find((a) => a.key === key)?.name || key}+${bonus[key]}`).join(' ')
}

const fileInput = ref(null)
const deleteArmed = ref(false)

function exportSave() {
  if (!run.value) return
  const json = game.exportRun()
  if (!json) return
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `stellar-sentinel-${run.value.seed}.json`
  link.click()
  URL.revokeObjectURL(url)
  game.notify('存档已导出', 'good')
}

function pickImport() {
  fileInput.value?.click()
}

async function onFile(event) {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) return
  const text = await file.text()
  const result = game.importRun(text)
  if (!result.ok) {
    game.notify(result.message, 'bad')
    return
  }
  game.notify('存档已导入', 'good')
  router.push({ name: 'map', params: { runId: result.id } })
}

function requestDelete() {
  deleteArmed.value = true
  setTimeout(() => { deleteArmed.value = false }, 4000)
}

function confirmDelete() {
  const result = game.deleteCurrentRun()
  if (!result.ok) {
    game.notify(result.message || '删除失败', 'bad')
    return
  }
  game.notify('存档已删除', 'good')
  router.push('/')
}

function unequip(gear) {
  if (!gear) return
  game.equip(gear.uid)
}

function saveNow() {
  game.save()
  game.notify('已存档', 'good')
}

function exit() {
  game.save()
  router.push('/')
}
</script>

<template>
  <div v-if="run" class="run-page">
    <section class="panel char-card">
      <header class="char-head">
        <div class="ava">
          {{ player.name.slice(0, 1) }}
          <span class="abo-badge">{{ abo.code }}</span>
        </div>
        <div class="char-id">
          <h2>{{ player.name }}</h2>
          <p>{{ species.name }} · {{ abo.name }} · {{ role.name }} · {{ origin.name }}</p>
          <div class="tags">
            <span class="tag amber">{{ scent.name }}</span>
            <span class="tag cyan">{{ landscape.name }}</span>
            <span v-for="skill in skillDefs" :key="skill.key" class="tag">{{ skill.name }}</span>
            <span v-if="flawDef" class="tag red">{{ flawDef.name }}</span>
            <span v-for="key in player.traits" :key="key" class="tag jade">{{ TRAITS[key].name }}</span>
            <span v-for="tag in statusTags" :key="tag.text" class="tag" :class="tag.kind">{{ tag.text }}</span>
          </div>
        </div>
        <span class="tag cyan">{{ region?.name }}</span>
      </header>

      <div class="vitals">
        <div class="vital">
          <div class="vital-head"><span>生命</span><b>{{ Math.round(player.hp) }} / {{ player.hpMax }}</b></div>
          <div class="bar hp"><i :style="{ width: `${Math.min(100, (player.hp / player.hpMax) * 100)}%` }"></i></div>
        </div>
        <div class="vital">
          <div class="vital-head"><span>精神稳定</span><b>{{ Math.round(player.mental) }} / {{ player.mentalMax }}</b></div>
          <div class="bar mental" :class="{ low: player.mental < 30 }"><i :style="{ width: `${Math.min(100, (player.mental / player.mentalMax) * 100)}%` }"></i></div>
        </div>
      </div>

      <div class="columns">
        <div>
          <h3 class="sec-title">属性 <em>AP {{ run.ap }} / {{ run.apMax }}</em></h3>
          <div class="attr-list">
            <div v-for="attr in ATTRS" :key="attr.key" class="attr-row">
              <span class="name">{{ attr.name }}</span>
              <span class="track"><i :style="{ width: `${Math.min(100, (attrTotal(run, attr.key) / 16) * 100)}%` }"></i></span>
              <b>{{ attrTotal(run, attr.key) }}</b>
              <em>{{ attrTotal(run, attr.key) - player.attrs[attr.key] ? `+${attrTotal(run, attr.key) - player.attrs[attr.key]}` : '' }}</em>
            </div>
          </div>

          <h3 class="sec-title">远征</h3>
          <div class="info-list">
            <div><span>种子</span><b class="mono">{{ run.seed }}</b></div>
            <div><span>星历</span><b>第 {{ run.day }} 日 · {{ timeLabel(run) }}</b></div>
            <div><span>节点</span><b>{{ run.cleared.length }} 已处理</b></div>
            <div><span>信用点</span><b>{{ player.credits }}</b></div>
          </div>
        </div>

        <div>
          <h3 class="sec-title">装备</h3>
          <div class="slots">
            <button
              v-for="item in slots"
              :key="item.slot"
              type="button"
              class="slot"
              :class="{ filled: item.gear }"
              :disabled="!item.gear"
              :title="item.gear ? '点击卸下' : `${item.label}：空`"
              @click="unequip(item.gear)"
            >
              <span class="slot-glyph">{{ item.gear ? GEAR_GLYPH[item.gear.key] : '·' }}</span>
              <span class="slot-name">{{ item.gear ? item.gear.name : '空' }}</span>
              <span class="slot-meta">{{ item.gear ? bonusText(item.gear.bonus) : item.label }}</span>
            </button>
          </div>

          <h3 class="sec-title">出身</h3>
          <p class="origin-text">{{ origin.desc }}</p>
          <p class="origin-text dim">{{ origin.perkText }}。起始物资已并入背包。</p>

          <h3 class="sec-title">背景</h3>
          <div class="info-list">
            <div><span>人种</span><b>{{ species.name }}</b></div>
            <div><span>信息素</span><b>{{ scent.name }} · {{ abo.scent }}</b></div>
            <div><span>图景</span><b>{{ landscape.name }}</b></div>
            <div><span>缺陷</span><b :class="{ 'is-bad': flawDef }">{{ flawDef?.name || '无' }}</b></div>
          </div>
          <p class="origin-text dim">{{ landscape.desc }}</p>
          <p v-if="flawDef" class="origin-text dim">{{ flawDef.desc }}</p>

          <div class="actions">
            <button type="button" class="btn btn-ghost btn-sm" @click="saveNow">存档</button>
            <button type="button" class="btn btn-ghost btn-sm" @click="exportSave">导出</button>
            <button type="button" class="btn btn-ghost btn-sm" @click="pickImport">导入</button>
            <button type="button" class="btn btn-ghost btn-sm" @click="exit">回到标题</button>
            <template v-if="!deleteArmed">
              <button type="button" class="btn btn-ghost btn-sm danger" @click="requestDelete">删除本局</button>
            </template>
            <template v-else>
              <button type="button" class="btn btn-sm danger-solid" @click="confirmDelete">确认删除</button>
              <button type="button" class="btn btn-ghost btn-sm" @click="deleteArmed = false">取消</button>
            </template>
            <input ref="fileInput" type="file" accept="application/json,.json" class="hidden" @change="onFile" />
          </div>
        </div>
      </div>

      <div class="log-section">
        <h3 class="sec-title">最近记录</h3>
        <div class="log-list">
          <div v-for="(entry, index) in run.log.slice(0, 8)" :key="index" class="log-item" :class="entry.kind">
            <span>{{ entry.t }}</span>
            <p>{{ entry.text }}</p>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.char-card { padding: 20px; }
.char-head { display: flex; align-items: center; gap: 13px; padding-bottom: 16px; border-bottom: 1px solid var(--line); }
.ava {
  position: relative;
  display: grid;
  place-items: center;
  width: 56px;
  height: 56px;
  flex: none;
  border: 1px solid rgba(124, 231, 255, .32);
  border-radius: 15px;
  background: radial-gradient(circle at 36% 26%, rgba(124, 231, 255, .2), rgba(6, 12, 18, .9));
  color: var(--cyan);
  font-size: 20px;
}
.abo-badge {
  position: absolute;
  right: -5px;
  bottom: -5px;
  display: grid;
  place-items: center;
  width: 21px;
  height: 21px;
  border: 1px solid rgba(255, 196, 107, .45);
  border-radius: 50%;
  background: #0a1119;
  color: var(--amber);
  font-family: var(--mono);
  font-size: 9px;
}
.char-id { flex: 1; min-width: 0; }
.char-id h2 { font-size: 20px; font-weight: 400; letter-spacing: 0.1em; }
.char-id p { margin-top: 2px; color: var(--muted); font-size: 11px; }
.tags { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 7px; }

.vitals { display: flex; flex-direction: column; gap: 9px; margin-top: 14px; }
.vital-head { display: flex; justify-content: space-between; align-items: baseline; font-size: 10.5px; }
.vital-head span { color: var(--dim); }
.vital-head b { font-family: var(--mono); font-size: 10.5px; font-weight: 500; }

.columns { display: grid; grid-template-columns: minmax(0, 1.15fr) minmax(0, 0.85fr); gap: 22px; margin-top: 18px; }
.sec-title {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin: 14px 0 7px;
  color: var(--dim);
  font-family: var(--mono);
  font-size: 9px;
  font-weight: 500;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}
.sec-title:first-child { margin-top: 0; }
.sec-title em { color: var(--amber); font-style: normal; letter-spacing: 0; }

.attr-list { display: flex; flex-direction: column; gap: 4px; }
.attr-row { display: flex; align-items: center; gap: 8px; }
.attr-row .name { width: 32px; flex: none; color: var(--muted); font-size: 10.5px; }
.attr-row .track { flex: 1; height: 3px; border-radius: 3px; background: rgba(255, 255, 255, .06); overflow: hidden; }
.attr-row .track i { display: block; height: 100%; background: linear-gradient(90deg, rgba(124, 231, 255, .4), var(--cyan)); }
.attr-row b { width: 20px; text-align: right; font-family: var(--mono); font-size: 12px; font-weight: 500; }
.attr-row em { width: 24px; text-align: right; color: var(--jade); font-family: var(--mono); font-size: 9px; font-style: normal; }

.info-list { display: flex; flex-direction: column; gap: 4px; }
.info-list > div { display: flex; justify-content: space-between; gap: 10px; padding: 3px 0; border-bottom: 1px dashed var(--line); font-size: 10.5px; }
.info-list span { color: var(--dim); }
.info-list b { font-weight: 500; text-align: right; }
.info-list b.is-bad { color: var(--red); }

.slots { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 5px; }
.slot {
  display: grid;
  grid-template-columns: 20px minmax(0, 1fr);
  grid-template-rows: auto auto;
  align-items: center;
  gap: 0 6px;
  padding: 8px 9px;
  border: 1px dashed rgba(126, 196, 224, .14);
  border-radius: 9px;
  background: rgba(4, 8, 13, .35);
  color: var(--dim);
  text-align: left;
}
.slot.filled { border: 1px solid rgba(124, 231, 255, .22); color: var(--ink); cursor: pointer; }
.slot-glyph { grid-row: 1 / 3; color: var(--cyan); font-size: 14px; }
.slot-name { font-size: 10px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.slot-meta { color: var(--dim); font-family: var(--mono); font-size: 8px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.origin-text { color: var(--muted); font-size: 10.5px; line-height: 1.8; }
.origin-text + .origin-text { margin-top: 5px; }
.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid var(--line);
}
.actions .danger { border-color: rgba(255, 138, 138, .24); color: var(--red); }
.actions .danger-solid {
  border-color: rgba(255, 138, 138, .5);
  background: rgba(255, 138, 138, .12);
  color: var(--red);
}

.log-section { margin-top: 18px; padding-top: 2px; border-top: 1px solid var(--line); }
.log-list { display: flex; flex-direction: column; gap: 5px; }
.log-item { padding-left: 8px; border-left: 2px solid var(--line); }
.log-item.good { border-color: rgba(138, 222, 184, .42); }
.log-item.bad { border-color: rgba(255, 138, 138, .42); }
.log-item.story { border-color: rgba(185, 164, 255, .5); }
.log-item > span { color: var(--dim); font-family: var(--mono); font-size: 8px; letter-spacing: 0.04em; }
.log-item p { margin-top: 1px; color: var(--muted); font-size: 10px; line-height: 1.7; word-break: break-word; }
.log-item.story p { color: var(--ink); }

@media (max-width: 899px) {
  .char-card { padding: 14px; }
  .char-head { flex-wrap: wrap; }
  .char-id h2 { font-size: 18px; }
  .columns { grid-template-columns: 1fr; gap: 4px; }
  .slots { grid-template-columns: repeat(3, minmax(0, 1fr)); }
}
</style>
