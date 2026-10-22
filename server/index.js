/**
 * 星穹哨向 · 服务端骨架
 * 一个进程同时负责：静态资源托管、存档读写。
 * LLM 代理与立绘库预留在后续阶段接入，接口风格与 empress-dynasty 保持一致。
 */

import express from 'express'
import { existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { kvStore, storePath } from './store.js'
import {
  activateProfile,
  deleteProfile,
  listModels,
  publicConfig,
  saveConfig,
  streamChat,
  testConfig,
} from './llm.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const DIST = join(ROOT, 'dist')
const PORT = Number(process.env.PORT) || 3003
const BASE_PATH = (() => {
  const raw = String(process.env.BASE_PATH || '').trim()
  if (!raw || raw === '/') return ''
  return `/${raw.replace(/^\/+|\/+$/g, '')}`
})()

const app = express()
app.disable('x-powered-by')
app.use(express.json({ limit: '32mb' }))

// 上下文预算可以通过环境变量调高。这里不做“无限”承诺：
// 上游模型仍有上下文窗口，超过窗口会直接失败，所以保留一个很高的安全上限。
// 默认尽量保留完整历史，只有真正超过上限时才从最旧的消息开始裁。
const LLM_MAX_MESSAGES = Number(process.env.LLM_MAX_MESSAGES) || 2000
const LLM_MAX_MESSAGE_CHARS = Number(process.env.LLM_MAX_MESSAGE_CHARS) || 1000000
const LLM_MAX_CONTEXT_CHARS = Number(process.env.LLM_MAX_CONTEXT_CHARS) || 2000000

if (BASE_PATH) {
  app.get(BASE_PATH, (req, res, next) => {
    // Express 默认 strict routing 为 false，/stellar-sentinel/ 也会命中这里
    if (req.path !== BASE_PATH) return next()
    return res.redirect(301, `${BASE_PATH}/`)
  })
  app.use((req, res, next) => {
    if (req.url === BASE_PATH) {
      req.url = '/'
      return next()
    }
    if (req.url.startsWith(`${BASE_PATH}/`)) {
      req.url = req.url.slice(BASE_PATH.length) || '/'
    }
    return next()
  })
}

app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    service: 'stellar-sentinel',
    stage: 'playable-core',
    storage: storePath,
    uptime: Math.round(process.uptime()),
  })
})

/* ===== LLM 配置（key 仅存服务端） ===== */
app.get('/api/llm/config', (req, res) => {
  res.json(publicConfig())
})

app.put('/api/llm/config', async (req, res) => {
  try {
    const config = await saveConfig(req.body || {})
    res.json({ ok: true, config })
  } catch (error) {
    console.error('[llm] 配置保存失败:', error.message)
    res.status(500).json({ ok: false, error: '配置保存失败' })
  }
})

app.post('/api/llm/test', async (req, res) => {
  try {
    const result = await testConfig(req.body || {})
    res.status(result.ok ? 200 : 400).json(result)
  } catch (error) {
    console.error('[llm] 连通性测试失败:', error.message)
    res.status(500).json({ ok: false, message: error.message })
  }
})

app.post('/api/llm/activate', async (req, res) => {
  try {
    const result = await activateProfile(req.body?.profileId)
    res.status(result.ok ? 200 : 400).json(result)
  } catch (error) {
    console.error('[llm] 切换方案失败:', error.message)
    res.status(500).json({ ok: false, message: '切换方案失败' })
  }
})

app.delete('/api/llm/profiles/:profileId', async (req, res) => {
  try {
    const result = await deleteProfile(req.params.profileId)
    res.status(result.ok ? 200 : 400).json(result)
  } catch (error) {
    console.error('[llm] 删除方案失败:', error.message)
    res.status(500).json({ ok: false, message: '删除方案失败' })
  }
})

app.post('/api/llm/models', async (req, res) => {
  try {
    const result = await listModels(req.body || {})
    res.status(result.ok ? 200 : 400).json(result)
  } catch (error) {
    console.error('[llm] 拉取模型失败:', error.message)
    res.status(500).json({ ok: false, message: error.message })
  }
})

app.post('/api/llm/chat', async (req, res) => {
  const allowed = new Set(['system', 'user', 'assistant'])
  const incoming = (Array.isArray(req.body?.messages) ? req.body.messages : [])
    .filter((message) => message && allowed.has(message.role) && typeof message.content === 'string' && message.content.trim())
    .map((message) => ({ role: message.role, content: message.content.slice(0, LLM_MAX_MESSAGE_CHARS) }))

  // 先保住所有 system，再给历史留尽可能多的位置。
  const systemMessages = incoming.filter((message) => message.role === 'system')
  const conversation = incoming
    .filter((message) => message.role !== 'system')
    .slice(-Math.max(1, LLM_MAX_MESSAGES - systemMessages.length))
  const messages = [...systemMessages]
  let usedChars = messages.reduce((sum, message) => sum + message.content.length, 0)
  const kept = []
  for (let index = conversation.length - 1; index >= 0; index -= 1) {
    const message = conversation[index]
    if (usedChars + message.content.length > LLM_MAX_CONTEXT_CHARS) break
    kept.unshift(message)
    usedChars += message.content.length
  }
  messages.push(...kept)

  if (!messages.some((message) => message.role === 'user')) {
    res.status(400).json({ ok: false, error: '缺少玩家消息' })
    return
  }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  })
  res.write(': connected\n\n')

  const controller = new AbortController()
  res.on('close', () => {
    if (!res.writableEnded) controller.abort()
  })

  try {
    await streamChat(
      { messages, temperature: Number(req.body?.temperature) || undefined },
      (delta) => {
        if (!res.writableEnded) res.write(`data: ${JSON.stringify({ delta })}\n\n`)
      },
      controller.signal
    )
    if (!res.writableEnded) {
      res.write('data: [DONE]\n\n')
      res.end()
    }
  } catch (error) {
    console.error('[llm] 对话失败:', error.message)
    if (!res.writableEnded) {
      res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`)
      res.end()
    }
  }
})

app.get('/api/kv', (req, res) => {
  res.json({ keys: kvStore.keys() })
})

app.get('/api/kv/:key', (req, res) => {
  res.json({ value: kvStore.get(req.params.key) })
})

app.put('/api/kv/:key', async (req, res) => {
  try {
    await kvStore.set(req.params.key, req.body?.value ?? null)
    res.json({ ok: true })
  } catch (error) {
    console.error('[api] 存档写入失败:', error.message)
    res.status(500).json({ ok: false, error: '存档写入失败' })
  }
})

app.delete('/api/kv/:key', async (req, res) => {
  try {
    await kvStore.remove(req.params.key)
    res.json({ ok: true })
  } catch (error) {
    console.error('[api] 存档删除失败:', error.message)
    res.status(500).json({ ok: false, error: '存档删除失败' })
  }
})

if (existsSync(DIST)) {
  app.use(express.static(DIST, {
    index: false,
    setHeaders(res, path) {
      if (path.endsWith('index.html')) {
        res.setHeader('Cache-Control', 'no-cache')
      } else if (/\/assets\//.test(path)) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
      }
    },
  }))

  // SPA 兜底（不拦截 /api）
  app.get(/^\/(?!api\/).*/, (req, res) => {
    res.sendFile(join(DIST, 'index.html'))
  })
} else {
  app.get('/', (req, res) => {
    res.type('text/plain').send('尚未构建前端：请先执行 npm run build')
  })
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`星穹哨向 · 服务已启动 http://0.0.0.0:${PORT}${BASE_PATH || ''}/`)
  console.log(`  访问路径: ${BASE_PATH || '/'}`)
  console.log(`  存档文件: ${storePath}`)
})
