/**
 * 浏览器端的流式对话客户端。
 * 只把消息发给本地服务端代理，API Key 不会进入前端。
 */

export async function streamNpcChat(messages, onDelta, signal) {
  const response = await fetch('./api/llm/chat', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ messages, temperature: 0.85 }),
    signal,
  })

  if (!response.ok) {
    let detail = ''
    try {
      const data = await response.json()
      detail = data.error || data.message || ''
    } catch {
      detail = ''
    }
    throw new Error(`HTTP ${response.status}${detail ? `：${detail}` : ''}`)
  }

  if (!response.body) throw new Error('服务端没有返回流式响应')

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let full = ''
  let finished = false

  while (!finished) {
    const { value, done } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })

    let index
    while ((index = buffer.indexOf('\n\n')) >= 0) {
      const chunk = buffer.slice(0, index)
      buffer = buffer.slice(index + 2)
      const line = chunk.split('\n').find((item) => item.startsWith('data:'))
      if (!line) continue
      const data = line.slice(5).trim()
      if (!data) continue
      if (data === '[DONE]') {
        finished = true
        break
      }

      let payload
      try {
        payload = JSON.parse(data)
      } catch {
        continue
      }
      if (payload.error) throw new Error(payload.error)
      if (payload.delta) {
        full += payload.delta
        onDelta(payload.delta)
      }
    }
  }

  return full
}
