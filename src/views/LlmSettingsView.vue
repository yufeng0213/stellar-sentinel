<script setup>
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const config = reactive({
  provider: 'openai',
  baseURL: 'https://api.openai.com/v1',
  model: 'gpt-4o-mini',
  temperature: 0.8,
  hasKey: false,
  keyPreview: '',
})
const providers = ref([])
const apiKey = ref('')
const loading = ref(false)
const saving = ref(false)
const status = ref(null)

const base = './api/llm'

async function load() {
  loading.value = true
  try {
    const response = await fetch(`${base}/config`)
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const data = await response.json()
    providers.value = data.providers || []
    Object.assign(config, {
      provider: data.provider,
      baseURL: data.baseURL,
      model: data.model,
      temperature: data.temperature,
    })
    config.hasKey = data.hasKey
    config.keyPreview = data.keyPreview
    status.value = null
  } catch (error) {
    status.value = { kind: 'bad', text: `无法读取配置：${error.message}。请确认 API 服务已启动。` }
  } finally {
    loading.value = false
  }
}

function changeProvider(event) {
  const next = event.target.value
  const previous = providers.value.find((item) => item.key === config.provider)
  const target = providers.value.find((item) => item.key === next)
  config.provider = next
  if (target && (!config.baseURL || config.baseURL === previous?.defaultBase)) {
    config.baseURL = target.defaultBase
  }
}

async function save() {
  saving.value = true
  status.value = null
  try {
    const response = await fetch(`${base}/config`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        provider: config.provider,
        baseURL: config.baseURL,
        model: config.model,
        temperature: Number(config.temperature),
        apiKey: apiKey.value,
      }),
    })
    const data = await response.json()
    if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`)
    providers.value = data.config.providers || providers.value
    config.hasKey = data.config.hasKey
    config.keyPreview = data.config.keyPreview
    apiKey.value = ''
    status.value = { kind: 'ok', text: '配置已保存到服务端。' }
  } catch (error) {
    status.value = { kind: 'bad', text: `保存失败：${error.message}` }
  } finally {
    saving.value = false
  }
}

async function test() {
  status.value = { kind: 'loading', text: '正在请求模型…' }
  try {
    const response = await fetch(`${base}/test`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        provider: config.provider,
        baseURL: config.baseURL,
        model: config.model,
        temperature: Number(config.temperature),
        apiKey: apiKey.value,
      }),
    })
    const data = await response.json()
    if (data.ok) {
      status.value = {
        kind: 'ok',
        text: `连接成功 · ${data.model} · ${data.latency}ms${data.reply ? ` · 回复「${data.reply.trim()}」` : ''}`,
      }
    } else {
      status.value = {
        kind: 'bad',
        text: `${data.message || '连接失败'}${data.status ? `（HTTP ${data.status}）` : ''}`,
      }
    }
  } catch (error) {
    status.value = { kind: 'bad', text: `连接失败：${error.message}` }
  }
}

onMounted(load)
</script>

<template>
  <div class="settings-shell">
    <div class="settings-wrap">
      <header class="settings-head">
        <button type="button" class="brand brand-btn" @click="router.push('/')">
          <span class="sigil" aria-hidden="true"><i></i></span>
          <span class="brand-text">
            <b>星穹哨向</b>
            <small>STELLAR SENTINEL</small>
          </span>
        </button>
        <button type="button" class="btn btn-ghost btn-sm" @click="router.push('/')">返回标题</button>
      </header>

      <section class="panel settings-panel">
        <p class="kicker">SETTINGS · LLM</p>
        <h1>叙事模型接入</h1>
        <p class="lede">
          模型只负责对白、描述与行为提议，不参与数值判定。API Key 保存在服务端，不会回传到浏览器。
        </p>

        <div class="form-grid">
          <label class="field">
            <span>Provider</span>
            <select :value="config.provider" @change="changeProvider">
              <option v-for="item in providers" :key="item.key" :value="item.key">
                {{ item.label }}
              </option>
            </select>
          </label>

          <label class="field">
            <span>Model</span>
            <input v-model.trim="config.model" placeholder="gpt-4o-mini" autocomplete="off" />
          </label>

          <label class="field span-2">
            <span>Base URL</span>
            <input v-model.trim="config.baseURL" placeholder="https://api.openai.com/v1" autocomplete="off" />
            <small>OpenAI 兼容接口填到 /v1；Ollama 填到端口。不要带结尾斜杠。</small>
          </label>

          <label class="field span-2">
            <span>API Key</span>
            <input
              v-model="apiKey"
              type="password"
              autocomplete="new-password"
              :placeholder="config.hasKey ? `已保存：${config.keyPreview}（留空保持不变）` : '输入 API Key'"
            />
            <small v-if="config.hasKey">服务端已有密钥。留空保存不会覆盖，填入新值则替换。</small>
            <small v-else>还没有保存密钥。Ollama 本地模型可以留空。</small>
          </label>

          <label class="field span-2">
            <span>Temperature · {{ Number(config.temperature).toFixed(1) }}</span>
            <input v-model.number="config.temperature" type="range" min="0" max="2" step="0.1" />
            <small>越高越自由，越低越稳定。角色对白建议 0.7–0.9。</small>
          </label>
        </div>

        <div class="actions">
          <button type="button" class="btn btn-primary" :disabled="saving" @click="save">
            {{ saving ? '保存中…' : '保存配置' }}
          </button>
          <button type="button" class="btn" :disabled="status?.kind === 'loading'" @click="test">
            测试连接
          </button>
          <span class="api-state" :class="status?.kind">
            {{ loading ? '读取配置…' : '' }}
          </span>
        </div>

        <div v-if="status" class="status-box" :class="status.kind">
          {{ status.text }}
        </div>

        <div class="note">
          <b>安全说明</b>
          <p>
            密钥写入服务端 <code>data/kv.json</code>，接口只返回掩码与 hasKey。
            如果把这个服务暴露到公网，请自行加访问控制或改用环境变量注入。
          </p>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.settings-shell {
  height: 100dvh;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 22px 20px 40px;
  padding-top: max(22px, env(safe-area-inset-top));
}
.settings-wrap { width: min(780px, 100%); margin: 0 auto; }

.settings-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--line);
  margin-bottom: 18px;
}
.brand-btn { border: 0; background: transparent; padding: 0; cursor: pointer; text-align: left; }

.settings-panel { padding: 22px 24px 20px; }
h1 { margin-top: 6px; font-size: 24px; font-weight: 300; letter-spacing: 0.1em; }
.lede { margin-top: 6px; color: var(--muted); font-size: 12px; line-height: 1.8; }

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
  margin-top: 20px;
}
.span-2 { grid-column: 1 / -1; }
.form-grid input[type="range"] { padding: 0; height: 26px; accent-color: var(--cyan); background: transparent; border: 0; }

.actions { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; margin-top: 20px; }
.api-state { font-family: var(--mono); font-size: 9.5px; color: var(--dim); }
.api-state.bad { color: var(--red); }
.api-state.ok { color: var(--jade); }

.status-box {
  margin-top: 14px;
  padding: 10px 12px;
  border: 1px solid var(--line);
  border-radius: 10px;
  font-size: 11px;
  line-height: 1.7;
  word-break: break-word;
}
.status-box.ok { border-color: rgba(138, 222, 184, .35); color: var(--jade); background: rgba(138, 222, 184, .06); }
.status-box.bad { border-color: rgba(255, 138, 138, .35); color: var(--red); background: rgba(255, 138, 138, .05); }
.status-box.loading { border-color: rgba(124, 231, 255, .3); color: var(--cyan); }

.note {
  margin-top: 20px;
  padding-top: 14px;
  border-top: 1px dashed var(--line);
}
.note b { color: var(--muted); font-size: 11px; font-weight: 500; }
.note p { margin-top: 4px; color: var(--dim); font-size: 10px; line-height: 1.8; }
.note code { color: var(--muted); font-family: var(--mono); }

@media (max-width: 640px) {
  .settings-shell { padding: 14px 12px 30px; padding-top: max(14px, env(safe-area-inset-top)); }
  .settings-panel { padding: 16px 14px; border-radius: 16px; }
  h1 { font-size: 21px; }
  .form-grid { grid-template-columns: 1fr; gap: 11px; margin-top: 16px; }
  .span-2 { grid-column: auto; }
  .settings-head .brand-text small { display: none; }
  .field input, .field select { font-size: 16px; }
}
</style>
