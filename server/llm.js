/**
 * LLM 配置与连通性测试。
 * Key 只保存在服务端，接口永远不会回传明文。
 */

import { kvStore } from './store.js'

const CONFIG_KEY = 'llm.config'
const TIMEOUT_MS = 15000

const DEFAULTS = {
  provider: 'openai',
  baseURL: 'https://api.openai.com/v1',
  model: 'gpt-4o-mini',
  temperature: 0.8,
}

const PROVIDER_HINTS = {
  openai: { label: 'OpenAI 兼容', defaultBase: 'https://api.openai.com/v1' },
  anthropic: { label: 'Anthropic', defaultBase: 'https://api.anthropic.com/v1' },
  ollama: { label: 'Ollama 本地', defaultBase: 'http://127.0.0.1:11434' },
}

function clamp(value, min, max, fallback) {
  const number = Number(value)
  if (!Number.isFinite(number)) return fallback
  return Math.min(max, Math.max(min, number))
}

function cleanBaseURL(value) {
  return String(value || '').trim().replace(/\/+$/, '')
}

function maskKey(key) {
  if (!key) return ''
  const text = String(key)
  if (text.length <= 8) return '****'
  return `${text.slice(0, 4)}****${text.slice(-4)}`
}

function makeProfileId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID().slice(0, 8)
  return `p${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`
}

function profileFrom(source, fallback = {}) {
  const provider = Object.prototype.hasOwnProperty.call(PROVIDER_HINTS, source.provider)
    ? source.provider
    : (fallback.provider || DEFAULTS.provider)
  return {
    id: source.id || fallback.id || makeProfileId(),
    name: String(source.name || fallback.name || '未命名方案').trim().slice(0, 40) || '未命名方案',
    provider,
    baseURL: cleanBaseURL(source.baseURL ?? fallback.baseURL ?? DEFAULTS.baseURL) || DEFAULTS.baseURL,
    model: String(source.model ?? fallback.model ?? DEFAULTS.model).trim() || DEFAULTS.model,
    temperature: clamp(source.temperature ?? fallback.temperature, 0, 2, DEFAULTS.temperature),
    apiKey: source.apiKey === undefined || source.apiKey === ''
      ? (fallback.apiKey || '')
      : String(source.apiKey).trim(),
  }
}

function normalizeState(raw = {}) {
  const state = raw && typeof raw === 'object' ? { ...raw } : {}
  const legacy = profileFrom(state, { id: 'default', name: '默认方案' })
  if (!Array.isArray(state.profiles) || !state.profiles.length) {
    state.profiles = [legacy]
  } else {
    state.profiles = state.profiles.map((profile) => profileFrom(profile, legacy))
  }
  if (!state.activeProfileId || !state.profiles.some((profile) => profile.id === state.activeProfileId)) {
    state.activeProfileId = state.profiles[0].id
  }
  const active = state.profiles.find((profile) => profile.id === state.activeProfileId) || state.profiles[0]
  // 根字段继续表示当前激活方案，兼容原有 chat / test 读取。
  state.provider = active.provider
  state.baseURL = active.baseURL
  state.model = active.model
  state.temperature = active.temperature
  state.apiKey = active.apiKey
  return state
}

function readStored() {
  const stored = kvStore.get(CONFIG_KEY)
  return normalizeState(stored && typeof stored === 'object' ? stored : {})
}

function publicProfile(profile, activeId) {
  return {
    id: profile.id,
    name: profile.name,
    provider: profile.provider,
    baseURL: profile.baseURL,
    model: profile.model,
    temperature: profile.temperature,
    hasKey: Boolean(profile.apiKey),
    keyPreview: maskKey(profile.apiKey),
    active: profile.id === activeId,
  }
}

export function publicConfig() {
  const stored = readStored()
  const config = { ...DEFAULTS, ...stored }
  const active = stored.profiles.find((profile) => profile.id === stored.activeProfileId) || stored.profiles[0]
  return {
    provider: config.provider,
    baseURL: config.baseURL,
    model: config.model,
    temperature: config.temperature,
    hasKey: Boolean(active?.apiKey),
    keyPreview: maskKey(active?.apiKey),
    activeProfileId: active?.id || '',
    profileName: active?.name || '默认方案',
    profiles: stored.profiles.map((profile) => publicProfile(profile, stored.activeProfileId)),
    providers: Object.keys(PROVIDER_HINTS).map((key) => ({
      key,
      label: PROVIDER_HINTS[key].label,
      defaultBase: PROVIDER_HINTS[key].defaultBase,
    })),
  }
}

export async function saveConfig(payload = {}) {
  const state = readStored()
  const requestedId = payload.profileId || state.activeProfileId
  const existing = state.profiles.find((profile) => profile.id === requestedId)
  const baseFallback = existing || state.profiles.find((profile) => profile.id === state.activeProfileId) || state.profiles[0]
  const fallback = payload.createNew ? { ...baseFallback, apiKey: '' } : baseFallback
  const next = profileFrom({
    ...fallback,
    ...payload,
    id: payload.createNew ? makeProfileId() : requestedId,
    name: payload.name || (payload.createNew ? '新方案' : fallback.name),
  }, fallback)

  if (payload.createNew || !existing) {
    state.profiles.push(next)
  } else {
    state.profiles = state.profiles.map((profile) => (profile.id === next.id ? next : profile))
  }
  state.activeProfileId = next.id
  state.provider = next.provider
  state.baseURL = next.baseURL
  state.model = next.model
  state.temperature = next.temperature
  state.apiKey = next.apiKey

  await kvStore.set(CONFIG_KEY, state)
  return publicConfig()
}

export async function activateProfile(profileId) {
  const state = readStored()
  const profile = state.profiles.find((item) => item.id === profileId)
  if (!profile) return { ok: false, message: '方案不存在' }
  state.activeProfileId = profile.id
  state.provider = profile.provider
  state.baseURL = profile.baseURL
  state.model = profile.model
  state.temperature = profile.temperature
  state.apiKey = profile.apiKey
  await kvStore.set(CONFIG_KEY, state)
  return { ok: true, config: publicConfig() }
}

export async function deleteProfile(profileId) {
  const state = readStored()
  if (state.profiles.length <= 1) return { ok: false, message: '至少保留一个方案' }
  const exists = state.profiles.some((profile) => profile.id === profileId)
  if (!exists) return { ok: false, message: '方案不存在' }
  state.profiles = state.profiles.filter((profile) => profile.id !== profileId)
  if (state.activeProfileId === profileId) {
    state.activeProfileId = state.profiles[0].id
    const active = state.profiles[0]
    state.provider = active.provider
    state.baseURL = active.baseURL
    state.model = active.model
    state.temperature = active.temperature
    state.apiKey = active.apiKey
  }
  await kvStore.set(CONFIG_KEY, state)
  return { ok: true, config: publicConfig() }
}

export async function listModels(overrides = {}) {
  const state = readStored()
  const active = state.profiles.find((profile) => profile.id === state.activeProfileId) || state.profiles[0]
  const provider = Object.prototype.hasOwnProperty.call(PROVIDER_HINTS, overrides.provider)
    ? overrides.provider
    : active.provider
  const base = cleanBaseURL(overrides.baseURL || active.baseURL)
  const apiKey = overrides.apiKey ? String(overrides.apiKey).trim() : active.apiKey
  if (!base) return { ok: false, message: '缺少 Base URL' }
  if (provider !== 'ollama' && !apiKey) return { ok: false, message: '缺少 API Key' }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    let url
    let headers = { 'content-type': 'application/json' }
    if (provider === 'ollama') {
      url = `${base}/api/tags`
    } else if (provider === 'anthropic') {
      url = `${base}/models`
      headers = { ...headers, 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' }
    } else {
      url = `${base}/models`
      headers = { ...headers, authorization: `Bearer ${apiKey}` }
    }
    const response = await fetch(url, { headers, signal: controller.signal })
    const text = await response.text()
    if (!response.ok) return { ok: false, message: `拉取失败 HTTP ${response.status}：${text.slice(0, 160)}` }
    let data = {}
    try {
      data = JSON.parse(text)
    } catch {
      return { ok: false, message: '模型列表返回的不是合法 JSON' }
    }
    const raw = provider === 'ollama' ? (data.models || []) : (data.data || data.models || [])
    const models = raw
      .map((item) => {
        if (typeof item === 'string') return { id: item, name: item }
        const id = item.id || item.name || item.model || ''
        return id ? { id, name: item.name || id } : null
      })
      .filter(Boolean)
    return { ok: true, models, provider }
  } catch (error) {
    const message = error.name === 'AbortError' ? '拉取超时（15 秒）' : error.message
    return { ok: false, message: `拉取失败：${message}` }
  } finally {
    clearTimeout(timer)
  }
}

function buildRequest(config) {
  const base = cleanBaseURL(config.baseURL)
  const messages = [{ role: 'user', content: '只回复 OK 两个字母。' }]

  if (config.provider === 'anthropic') {
    return {
      url: `${base}/messages`,
      headers: {
        'content-type': 'application/json',
        'x-api-key': config.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: {
        model: config.model,
        max_tokens: 16,
        messages,
      },
    }
  }

  if (config.provider === 'ollama') {
    return {
      url: `${base}/api/chat`,
      headers: { 'content-type': 'application/json' },
      body: { model: config.model, messages, stream: false },
    }
  }

  return {
    url: `${base}/chat/completions`,
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${config.apiKey}`,
    },
    body: {
      model: config.model,
      messages,
      max_tokens: 16,
      temperature: 0,
      stream: false,
    },
  }
}

function extractText(config, data) {
  if (config.provider === 'anthropic') {
    return (data.content || []).map((part) => part.text || '').join('')
  }
  if (config.provider === 'ollama') {
    return data.message?.content || ''
  }
  return data.choices?.[0]?.message?.content || ''
}

export async function testConfig(overrides = {}) {
  const stored = readStored()
  const config = { ...DEFAULTS, ...stored }

  if (overrides.provider) config.provider = overrides.provider
  if (overrides.baseURL) config.baseURL = cleanBaseURL(overrides.baseURL)
  if (overrides.model) config.model = String(overrides.model).trim()
  if (overrides.apiKey) config.apiKey = String(overrides.apiKey).trim()

  if (!config.baseURL) return { ok: false, message: '缺少 Base URL' }
  if (config.provider !== 'ollama' && !config.apiKey) return { ok: false, message: '缺少 API Key' }

  const { url, headers, body } = buildRequest(config)
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  const started = Date.now()

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    })
    const latency = Date.now() - started
    const text = await response.text()

    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        latency,
        message: `连接失败 HTTP ${response.status}：${text.slice(0, 180)}`,
      }
    }

    let data = {}
    try {
      data = JSON.parse(text)
    } catch {
      return { ok: false, latency, message: '返回内容不是合法 JSON' }
    }

    return {
      ok: true,
      latency,
      model: config.model,
      reply: extractText(config, data).slice(0, 80),
    }
  } catch (error) {
    const message = error.name === 'AbortError' ? '请求超时（15 秒）' : error.message
    return { ok: false, message: `连接失败：${message}` }
  } finally {
    clearTimeout(timer)
  }
}

function buildChatRequest(config, messages, temperature) {
  const base = cleanBaseURL(config.baseURL)
  const temp = clamp(temperature, 0, 2, config.temperature)
  const system = messages
    .filter((message) => message.role === 'system')
    .map((message) => message.content)
    .join('\n\n')

  const conversation = messages
    .filter((message) => message.role !== 'system')
    .map((message) => ({
      role: message.role === 'assistant' ? 'assistant' : 'user',
      content: String(message.content || '').slice(0, 100000),
    }))

  if (config.provider === 'anthropic') {
    return {
      mode: 'anthropic',
      url: `${base}/messages`,
      headers: {
        'content-type': 'application/json',
        'x-api-key': config.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: {
        model: config.model,
        system,
        messages: conversation,
        max_tokens: 8192,
        temperature: temp,
        stream: true,
      },
    }
  }

  if (config.provider === 'ollama') {
    return {
      mode: 'ollama',
      url: `${base}/api/chat`,
      headers: { 'content-type': 'application/json' },
      body: {
        model: config.model,
        messages: system ? [{ role: 'system', content: system }, ...conversation] : conversation,
        stream: true,
        options: { temperature: temp, num_predict: 8192 },
      },
    }
  }

  return {
    mode: 'openai',
    url: `${base}/chat/completions`,
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${config.apiKey}`,
    },
    body: {
      model: config.model,
      messages: system ? [{ role: 'system', content: system }, ...conversation] : conversation,
      max_tokens: 8192,
      temperature: temp,
      stream: true,
    },
  }
}

/**
 * 流式对话。逐段回调 onDelta，返回完整文本。
 * Key 只在服务端读取，永不下发。
 */
export async function streamChat({ messages, temperature }, onDelta, signal) {
  const stored = readStored()
  const config = { ...DEFAULTS, ...stored }

  if (config.provider !== 'ollama' && !config.apiKey) {
    throw new Error('缺少 API Key，请先在设置页配置')
  }

  const request = buildChatRequest(config, messages, temperature)
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 180000)
  const abort = () => controller.abort()
  if (signal) signal.addEventListener('abort', abort)

  let full = ''
  try {
    const response = await fetch(request.url, {
      method: 'POST',
      headers: request.headers,
      body: JSON.stringify(request.body),
      signal: controller.signal,
    })

    if (!response.ok) {
      const text = await response.text()
      throw new Error(`HTTP ${response.status}：${text.slice(0, 180)}`)
    }
    if (!response.body) throw new Error('模型没有返回可读流')

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let finished = false

    while (!finished) {
      const { value, done } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })

      let lineEnd
      while ((lineEnd = buffer.indexOf('\n')) >= 0) {
        let line = buffer.slice(0, lineEnd).trim()
        buffer = buffer.slice(lineEnd + 1)
        if (!line || line.startsWith('event:')) continue
        if (line.startsWith('data:')) line = line.slice(5).trim()
        if (!line) continue
        if (line === '[DONE]') {
          finished = true
          break
        }
        if (!line.startsWith('{')) continue

        let payload
        try {
          payload = JSON.parse(line)
        } catch {
          continue
        }
        if (payload.error) {
          throw new Error(payload.error.message || '模型返回错误')
        }

        let delta = ''
        if (request.mode === 'anthropic') {
          if (payload.type === 'content_block_delta') delta = payload.delta?.text || ''
        } else if (request.mode === 'ollama') {
          delta = payload.message?.content || ''
        } else {
          delta = payload.choices?.[0]?.delta?.content || ''
        }

        if (delta) {
          full += delta
          onDelta(delta)
        }
      }
    }

    // 少数兼容网关最后一行不带换行；补处理残留缓冲，避免最后几句被截掉。
    if (buffer.trim()) {
      let tail = buffer.trim()
      if (tail.startsWith('data:')) tail = tail.slice(5).trim()
      if (tail !== '[DONE]' && tail.startsWith('{')) {
        try {
          const payload = JSON.parse(tail)
          let delta = ''
          if (request.mode === 'anthropic') {
            if (payload.type === 'content_block_delta') delta = payload.delta?.text || ''
          } else if (request.mode === 'ollama') {
            delta = payload.message?.content || ''
          } else {
            delta = payload.choices?.[0]?.delta?.content || ''
          }
          if (delta) {
            full += delta
            onDelta(delta)
          }
        } catch {
          // 残留内容不是完整 JSON 时忽略
        }
      }
    }

    return full
  } catch (error) {
    if (error.name === 'AbortError') throw new Error('请求超时或被取消')
    throw error
  } finally {
    clearTimeout(timer)
    if (signal) signal.removeEventListener('abort', abort)
  }
}
