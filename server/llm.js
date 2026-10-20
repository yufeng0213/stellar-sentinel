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

function readStored() {
  const stored = kvStore.get(CONFIG_KEY)
  return stored && typeof stored === 'object' ? stored : {}
}

export function publicConfig() {
  const stored = readStored()
  const config = { ...DEFAULTS, ...stored }
  return {
    provider: config.provider,
    baseURL: config.baseURL,
    model: config.model,
    temperature: config.temperature,
    hasKey: Boolean(stored.apiKey),
    keyPreview: maskKey(stored.apiKey),
    providers: Object.keys(PROVIDER_HINTS).map((key) => ({
      key,
      label: PROVIDER_HINTS[key].label,
      defaultBase: PROVIDER_HINTS[key].defaultBase,
    })),
  }
}

export async function saveConfig(payload = {}) {
  const stored = readStored()
  const provider = Object.prototype.hasOwnProperty.call(PROVIDER_HINTS, payload.provider)
    ? payload.provider
    : (stored.provider || DEFAULTS.provider)

  const next = {
    provider,
    baseURL: cleanBaseURL(payload.baseURL ?? stored.baseURL ?? DEFAULTS.baseURL) || DEFAULTS.baseURL,
    model: String(payload.model ?? stored.model ?? DEFAULTS.model).trim() || DEFAULTS.model,
    temperature: clamp(payload.temperature ?? stored.temperature, 0, 2, DEFAULTS.temperature),
    // 空字符串表示“保持原 key 不变”
    apiKey: payload.apiKey === undefined || payload.apiKey === '' ? (stored.apiKey || '') : String(payload.apiKey).trim(),
  }

  await kvStore.set(CONFIG_KEY, next)
  return publicConfig()
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
      content: String(message.content || '').slice(0, 4000),
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
        max_tokens: 1600,
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
        options: { temperature: temp, num_predict: 1600 },
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
      max_tokens: 1600,
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
  const timer = setTimeout(() => controller.abort(), 90000)
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
