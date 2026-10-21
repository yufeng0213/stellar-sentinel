<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import SoundToggle from '../components/SoundToggle.vue'
import { ENDINGS } from '../game-core/ending.js'
import { readEndingCollection } from '../game/collection.js'
import { achievementCount, readProfile } from '../game/profile.js'
import { useGameStore } from '../stores/game.js'

const router = useRouter()
const game = useGameStore()
const hasSave = ref(false)
const endingUnlocked = ref(0)
const archiveUnlocked = ref(0)

const apiLabel = computed(() => ({
  online: '链路在线',
  offline: '链路离线',
  connecting: '正在握手',
}[game.api] || '未知'))

onMounted(() => {
  hasSave.value = game.hasSave()
  endingUnlocked.value = Object.keys(readEndingCollection()).length
  archiveUnlocked.value = achievementCount(readProfile())
})

function continueRun() {
  const run = game.resume()
  if (!run) {
    hasSave.value = false
    game.notify('没有找到可用的存档', 'bad')
    return
  }
  const target = ['select', 'opening'].includes(run.story?.stage) ? 'story' : 'map'
  router.push({ name: target, params: { runId: run.id } })
}
</script>

<template>
  <div class="title-shell">
    <div class="title-wrap">
      <section class="title-copy">
        <div class="brand">
          <span class="sigil" aria-hidden="true"><i></i></span>
          <div class="brand-text">
            <b>星穹哨向</b>
            <small>STELLAR SENTINEL</small>
          </div>
        </div>

        <p class="kicker">深空纪元 · 星历 3187 · 白塔失联第 47 天</p>
        <h1>在群星之间，<br><em>找到与你共振的人。</em></h1>
        <p class="lede">
          你是刚从冷冻舱醒来的哨兵或向导。白塔沉默，边境星区在低语，
          而每一次远征的星图，都不会重复。
        </p>

        <div class="actions">
          <button v-if="hasSave" type="button" class="btn btn-primary" @click="continueRun">
            继续远征
          </button>
          <RouterLink to="/create" class="btn" :class="{ 'btn-ghost': hasSave }">
            {{ hasSave ? '新的远征' : '开始新的远征' }}
          </RouterLink>
          <RouterLink to="/endings" class="text-link">结局收集 {{ endingUnlocked }} / {{ ENDINGS.length }}</RouterLink>
          <RouterLink to="/archive" class="text-link">星区档案 {{ archiveUnlocked }}</RouterLink>
          <RouterLink to="/settings/llm" class="text-link">LLM 设置</RouterLink>
          <SoundToggle />
        </div>

        <dl class="telemetry">
          <div>
            <dt>服务链路</dt>
            <dd :class="game.api">{{ apiLabel }}</dd>
          </div>
          <div>
            <dt>存档</dt>
            <dd class="mono">{{ hasSave ? '本地存档已就绪' : '暂无远征记录' }}</dd>
          </div>
          <div>
            <dt>版本</dt>
            <dd class="mono">0.77.0 · EXPEDITION CHAINS</dd>
          </div>
        </dl>
      </section>

      <aside class="title-art" aria-hidden="true">
        <div class="scope">
          <span class="ring ring-a"></span>
          <span class="ring ring-b"></span>
          <span class="ring ring-c"></span>
          <span class="axis axis-x"></span>
          <span class="axis axis-y"></span>
          <span class="sweep"></span>
          <span class="blip blip-a"></span>
          <span class="blip blip-b"></span>
          <span class="blip blip-c"></span>
          <span class="core"></span>
        </div>
        <div class="art-meta">
          <span class="live"><i></i>LIVE</span>
          <span>NAV-05 · 边境星区</span>
        </div>
        <div class="art-lines">
          <p><time>00:12</time><span>白塔信标 · 无响应</span></p>
          <p><time>00:19</time><span>精神图景 · 检测到外来回声</span></p>
          <p><time>00:31</time><span>未登记向导 · 信号强度 37%</span></p>
        </div>
      </aside>
    </div>

    <footer class="title-foot">
      <span>游戏规则在本地运行 · LLM 只负责叙事</span>
      <span class="mono">web :5174 · api :3002</span>
    </footer>
  </div>
</template>

<style scoped>
.title-shell {
  height: 100dvh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 0 28px;
  padding-top: env(safe-area-inset-top);
  padding-bottom: env(safe-area-inset-bottom);
  overflow: hidden;
}

.title-wrap {
  width: min(1180px, 100%);
  margin: 0 auto;
  display: grid;
  grid-template-columns: minmax(0, 1.05fr) minmax(340px, 0.95fr);
  gap: 56px;
  align-items: center;
}

.brand { margin-bottom: 46px; }

.kicker { margin-bottom: 12px; }

h1 {
  font-size: clamp(2.1rem, 4.2vw, 3.7rem);
  font-weight: 300;
  line-height: 1.22;
  letter-spacing: 0.05em;
}
h1 em { color: var(--amber); font-style: normal; text-shadow: 0 0 34px rgba(255, 196, 107, .22); }

.lede {
  max-width: 34em;
  margin-top: 20px;
  color: var(--muted);
  font-size: max(var(--ui-min), calc(13px * var(--ui-scale)));
  line-height: 1.95;
}

.actions { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; margin-top: 28px; }
.text-link {
  margin-left: 6px;
  color: var(--dim);
  font-size: max(var(--ui-min), calc(11.5px * var(--ui-scale)));
  border-bottom: 1px solid transparent;
}
.text-link:hover { color: var(--cyan); border-color: var(--line-2); }

.telemetry {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
  margin-top: 46px;
  padding-top: 16px;
  border-top: 1px solid var(--line);
}
.telemetry dt { color: var(--dim); font-family: var(--mono); font-size: max(var(--ui-min), calc(9px * var(--ui-scale))); letter-spacing: 0.14em; }
.telemetry dd { margin-top: 4px; color: var(--muted); font-size: max(var(--ui-min), calc(11px * var(--ui-scale))); overflow-wrap: anywhere; }
.telemetry dd.online { color: var(--jade); }
.telemetry dd.offline { color: var(--red); }
.telemetry dd.mono { font-family: var(--mono); font-size: max(var(--ui-min), calc(9.5px * var(--ui-scale))); }

.title-art {
  position: relative;
  padding: 16px;
  border: 1px solid var(--line);
  border-radius: 22px;
  background:
    radial-gradient(500px 280px at 50% 28%, rgba(124, 231, 255, .08), transparent 62%),
    linear-gradient(165deg, rgba(13, 23, 34, .82), rgba(5, 9, 14, .9));
  box-shadow: 0 40px 100px -40px #000;
  overflow: hidden;
}
.title-art::before {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(140deg, rgba(124, 231, 255, .08), transparent 35%);
  pointer-events: none;
}

.scope {
  position: relative;
  aspect-ratio: 1.35;
  border: 1px solid rgba(124, 231, 255, .12);
  border-radius: 16px;
  background: radial-gradient(circle at 50% 50%, rgba(124, 231, 255, .1), transparent 62%), #050a10;
  overflow: hidden;
}
.ring {
  position: absolute;
  top: 50%; left: 50%;
  border: 1px solid rgba(124, 231, 255, .16);
  border-radius: 50%;
  transform: translate(-50%, -50%);
}
.ring-a { width: 30%; height: 30%; }
.ring-b { width: 56%; height: 56%; }
.ring-c { width: 82%; height: 82%; }
.axis { position: absolute; background: rgba(124, 231, 255, .1); }
.axis-x { top: 50%; left: 6%; width: 88%; height: 1px; }
.axis-y { top: 6%; left: 50%; width: 1px; height: 88%; }
.sweep {
  position: absolute;
  inset: -20%;
  background: conic-gradient(from 0deg, rgba(124, 231, 255, .22), transparent 24%);
  animation: sweep 7s linear infinite;
}
.core {
  position: absolute;
  top: 50%; left: 50%;
  width: 7px; height: 7px;
  border-radius: 50%;
  background: var(--cyan);
  box-shadow: 0 0 18px var(--cyan);
  transform: translate(-50%, -50%);
}
.blip {
  position: absolute;
  width: 5px; height: 5px;
  border-radius: 50%;
  background: var(--amber);
  box-shadow: 0 0 10px var(--amber);
  animation: blink 3.2s ease-in-out infinite;
}
.blip-a { top: 30%; left: 64%; }
.blip-b { top: 62%; left: 38%; animation-delay: 1.1s; }
.blip-c { top: 46%; left: 78%; animation-delay: 2.2s; }

.art-meta {
  display: flex;
  justify-content: space-between;
  margin-top: 12px;
  color: var(--dim);
  font-family: var(--mono);
  font-size: max(var(--ui-min), calc(9px * var(--ui-scale)));
  letter-spacing: 0.1em;
}
.live { display: inline-flex; align-items: center; gap: 5px; color: var(--jade); }
.live i { width: 4px; height: 4px; border-radius: 50%; background: var(--jade); box-shadow: 0 0 8px var(--jade); }

.art-lines { display: flex; flex-direction: column; gap: 4px; margin-top: 10px; }
.art-lines p {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding-bottom: 4px;
  border-bottom: 1px dashed rgba(126, 196, 224, .1);
  color: var(--muted);
  font-size: max(var(--ui-min), calc(10px * var(--ui-scale)));
}
.art-lines time { color: var(--dim); font-family: var(--mono); font-size: max(var(--ui-min), calc(9px * var(--ui-scale))); }

.title-foot {
  width: min(1180px, 100%);
  margin: 44px auto 0;
  display: flex;
  justify-content: space-between;
  gap: 12px;
  color: var(--dim);
  font-size: max(var(--ui-min), calc(9.5px * var(--ui-scale)));
}

@keyframes sweep { to { transform: rotate(360deg); } }
@keyframes blink { 0%, 100% { opacity: .25; } 45% { opacity: 1; } }

@media (max-width: 900px) {
  .title-shell { padding: 0 18px; justify-content: flex-start; overflow-y: auto; }
  .title-shell::-webkit-scrollbar { width: 0; }
  .title-wrap { grid-template-columns: 1fr; gap: 34px; padding-top: 28px; }
  .brand { margin-bottom: 40px; }
  h1 { font-size: clamp(2rem, 7vw, 2.8rem); }
  .title-art { display: none; }
  .telemetry { margin-top: 34px; }
  .title-foot { margin-top: 28px; padding-bottom: 20px; flex-direction: column; gap: 4px; }
}
</style>
