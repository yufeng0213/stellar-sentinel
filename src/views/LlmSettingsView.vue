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
const profiles = ref([])
const activeProfileId = ref('')
const profileName = ref('默认方案')
const isNewProfile = ref(false)
const apiKey = ref('')
const models = ref([])
const loading = ref(false)
const saving = ref(false)
const modelsLoading = ref(false)
const status = ref(null)

const base = './api/llm'

function applyConfig(data) {
  if (!data) return
  providers.value = data.providers || providers.value
  profiles.value = data.profiles || profiles.value
  activeProfileId.value = data.activeProfileId || ''
  profileName.value = data.profileName || '默认方案'
  Object.assign(config, {
    provider: data.provider,
    baseURL: data.baseURL,
    model: data.model,
    temperature: data.temperature,
    hasKey: data.hasKey,
    keyPreview: data.keyPreview,
  })
  apiKey.value = ''
}

async function load() {
  loading.value = true
  try {
    const response = await fetch(`${base}/config`)
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const data = await response.json()
    applyConfig(data)
    isNewProfile.value = false
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

function newProfile() {
  isNewProfile.value = true
  activeProfileId.value = ''
  profileName.value = '新方案'
  apiKey.value = ''
  models.value = []
  status.value = { kind: 'loading', text: '正在编辑新方案，保存后会加入方案列表。' }
}

async function switchProfile(event) {
  const profileId = event.target.value
  if (!profileId || profileId === activeProfileId.value) return
  saving.value = true
  try {
    const response = await fetch(`${base}/activate`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ profileId }),
    })
    const data = await response.json()
    if (!response.ok || !data.ok) throw new Error(data.message || `HTTP ${response.status}`)
    applyConfig(data.config)
    isNewProfile.value = false
    models.value = []
    status.value = { kind: 'ok', text: `已切换到「${profileName.value}」。` }
  } catch (error) {
    status.value = { kind: 'bad', text: `切换失败：${error.message}` }
  } finally {
    saving.value = false
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
        profileId: isNewProfile.value ? undefined : activeProfileId.value,
        createNew: isNewProfile.value,
        name: profileName.value,
        provider: config.provider,
        baseURL: config.baseURL,
        model: config.model,
        temperature: Number(config.temperature),
        apiKey: apiKey.value,
      }),
    })
    const data = await response.json()
    if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`)
    applyConfig(data.config)
    isNewProfile.value = false
    status.value = { kind: 'ok', text: `方案「${profileName.value}」已保存并启用。` }
  } catch (error) {
    status.value = { kind: 'bad', text: `保存失败：${error.message}` }
  } finally {
    saving.value = false
  }
}

async function removeProfile() {
  if (!activeProfileId.value || profiles.value.length <= 1) return
  if (!window.confirm(`删除方案「${profileName.value}」？`)) return
  saving.value = true
  try {
    const response = await fetch(`${base}/profiles/${encodeURIComponent(activeProfileId.value)}`, {
      method: 'DELETE',
    })
    const data = await response.json()
    if (!response.ok || !data.ok) throw new Error(data.message || `HTTP ${response.status}`)
    applyConfig(data.config)
    models.value = []
    status.value = { kind: 'ok', text: `方案已删除，当前使用「${profileName.value}」。` }
  } catch (error) {
    status.value = { kind: 'bad', text: `删除失败：${error.message}` }
  } finally {
    saving.value = false
  }
}

async function fetchModels() {
  modelsLoading.value = true
  status.value = { kind: 'loading', text: '正在拉取模型列表…' }
  try {
    const response = await fetch(`${base}/models`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        provider: config.provider,
        baseURL: config.baseURL,
        apiKey: apiKey.value,
      }),
    })
    const data = await response.json()
    if (!response.ok || !data.ok) throw new Error(data.message || `HTTP ${response.status}`)
    models.value = data.models || []
    status.value = {
      kind: 'ok',
      text: `拉到 ${models.value.length} 个模型${models.value.length ? '，可从输入框下拉选择' : ''}。`,
    }
    if (models.value.length && !models.value.some((model) => model.id === config.model)) {
      config.model = models.value[0].id
    }
  } catch (error) {
    status.value = { kind: 'bad', text: `拉取模型失败：${error.message}` }
  } finally {
    modelsLoading.value = false
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

        <div class="profile-bar">
          <label class="profile-select">
            <span>配置方案</span>
            <select :value="activeProfileId" :disabled="isNewProfile || saving" @change="switchProfile">
              <option v-if="isNewProfile" value="">新方案（未保存）</option>
              <option v-for="profile in profiles" :key="profile.id" :value="profile.id">
                {{ profile.name }}{{ profile.hasKey ? '' : ' · 无 Key' }}
              </option>
            </select>
          </label>
          <label class="profile-name">
            <span>方案名称</span>
            <input v-model.trim="profileName" maxlength="40" placeholder="例如：主力模型 / 备用模型" />
          </label>
          <div class="profile-actions">
            <button type="button" class="btn btn-sm" :disabled="saving" @click="newProfile">新建方案</button>
            <button
              type="button"
              class="btn btn-sm"
              :disabled="saving || isNewProfile || profiles.length <= 1"
              @click="removeProfile"
            >
              删除
            </button>
          </div>
        </div>

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
            <div class="model-row">
              <input
                v-model.trim="config.model"
                list="llm-model-list"
                placeholder="gpt-4o-mini"
                autocomplete="off"
              />
              <button type="button" class="btn btn-sm" :disabled="modelsLoading || saving" @click.prevent="fetchModels">
                {{ modelsLoading ? '…' : '拉取' }}
              </button>
            </div>
            <datalist id="llm-model-list">
              <option v-for="model in models" :key="model.id" :value="model.id">{{ model.name }}</option>
            </datalist>
            <small v-if="models.length">已拉取 {{ models.length }} 个模型，可直接选择或手动输入。</small>
            <small v-else>可直接输入模型名，或按当前 Provider 拉取。</small>
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
            {{ saving ? '保存中…' : isNewProfile ? '保存为新方案' : '保存并启用' }}
          </button>
          <button type="button" class="btn" :disabled="status?.kind === 'loading' || saving" @click="test">
            测试连接
          </button>
          <button type="button" class="btn" :disabled="modelsLoading || saving" @click="fetchModels">
            {{ modelsLoading ? '拉取中…' : '拉取模型' }}
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
h1 { margin-top: 6px; font-size: max(var(--ui-min), calc(24px * var(--ui-scale))); font-weight: 300; letter-spacing: 0.1em; }
.lede { margin-top: 6px; color: var(--muted); font-size: max(var(--ui-min), calc(12px * var(--ui-scale))); line-height: 1.8; }

.profile-bar {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) auto;
  align-items: end;
  gap: 10px;
  margin-top: 18px;
  padding: 12px;
  border: 1px solid rgba(124, 231, 255, .18);
  border-radius: 10px;
  background: rgba(124, 231, 255, .025);
}
.profile-select, .profile-name { display: flex; flex-direction: column; gap: 5px; min-width: 0; }
.profile-select span, .profile-name span { color: var(--dim); font-family: var(--mono); font-size: max(var(--ui-min), calc(8.5px * var(--ui-scale))); }
.profile-actions { display: flex; gap: 5px; }
.model-row { display: flex; gap: 6px; }
.model-row input { flex: 1; min-width: 0; }
.model-row .btn { flex: none; }
@media (max-width: 640px) {
  .profile-bar { grid-template-columns: 1fr; align-items: stretch; }
  .profile-actions { justify-content: flex-end; }
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
  margin-top: 20px;
}
.span-2 { grid-column: 1 / -1; }
.form-grid input[type="range"] { padding: 0; height: 26px; accent-color: var(--cyan); background: transparent; border: 0; }

.actions { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; margin-top: 20px; }
.api-state { font-family: var(--mono); font-size: max(var(--ui-min), calc(9.5px * var(--ui-scale))); color: var(--dim); }
.api-state.bad { color: var(--red); }
.api-state.ok { color: var(--jade); }

.status-box {
  margin-top: 14px;
  padding: 10px 12px;
  border: 1px solid var(--line);
  border-radius: 10px;
  font-size: max(var(--ui-min), calc(11px * var(--ui-scale)));
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
.note b { color: var(--muted); font-size: max(var(--ui-min), calc(11px * var(--ui-scale))); font-weight: 500; }
.note p { margin-top: 4px; color: var(--dim); font-size: max(var(--ui-min), calc(10px * var(--ui-scale))); line-height: 1.8; }
.note code { color: var(--muted); font-family: var(--mono); }

@media (max-width: 640px) {
  .settings-shell { padding: 14px 12px 30px; padding-top: max(14px, env(safe-area-inset-top)); }
  .settings-panel { padding: 16px 14px; border-radius: 16px; }
  h1 { font-size: max(var(--ui-min), calc(21px * var(--ui-scale))); }
  .form-grid { grid-template-columns: 1fr; gap: 11px; margin-top: 16px; }
  .span-2 { grid-column: auto; }
  .settings-head .brand-text small { display: none; }
  .field input, .field select { font-size: max(var(--ui-min), calc(16px * var(--ui-scale))); }
}
</style>
