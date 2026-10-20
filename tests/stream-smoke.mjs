/**
 * SSE 流式解析：最后一帧没有空行、没有 [DONE] 时也不能吞字。
 */

import { streamNpcChat } from '../src/game/llm.js'

const encoder = new TextEncoder()
const errors = []
const check = (condition, label) => { if (!condition) errors.push(label) }

globalThis.fetch = async () => new Response(new ReadableStream({
  start(controller) {
    controller.enqueue(encoder.encode('data: {"delta":"前半段。"}\n\n'))
    controller.enqueue(encoder.encode('data: {"delta":"后半段。"}'))
    controller.close()
  },
}), { status: 200, headers: { 'content-type': 'text/event-stream' } })

const deltas = []
const full = await streamNpcChat([{ role: 'user', content: '测试' }], (delta) => deltas.push(delta))
check(full === '前半段。后半段。', `完整文本错误：${full}`)
check(deltas.length === 2, '没有收到两段增量')

if (errors.length) {
  console.error('FAILED')
  errors.forEach((error) => console.error(' -', error))
  process.exit(1)
}

console.log(JSON.stringify({ ok: true, full, deltas: deltas.length }, null, 2))
