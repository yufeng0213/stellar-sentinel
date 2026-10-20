/**
 * 地穴命名的 LLM 提示与清理。
 */

import { generateDungeonName } from '../game-core/dungeon.js'

export function buildDungeonNameMessages(run) {
  return {
    messages: [
      {
        role: 'system',
        content: '你给星际废墟里的地穴起名。只输出一个名字，不要解释，不要 Markdown。',
      },
      {
        role: 'user',
        content: [
          '为一张远征星图起一个地穴名字。',
          '2–8 个中文字符，可以带一个“·”分段。',
          '气质冷峻、具体，像旧时代留下来的设施名。',
          '不要用“地穴”“副本”“关卡”“冒险”这类游戏词。',
          '当前星图种子：' + (run?.mapSeed || run?.seed || '未知'),
          '示例：静默回廊 · 下层、锈红竖井、无光菌巢、白塔档案库。',
          '只输出名字。',
        ].join('\n'),
      },
    ],
  }
}

export function stripDungeonName(text) {
  const raw = String(text || '')
    .replace(/```[a-zA-Z]*\s*/g, '')
    .replace(/```/g, '')
    .split(/\r?\n/)[0]
    .replace(/^[\s"“”'‘’]+|[\s"“”'‘’]+$/g, '')
    .replace(/[。！？!?，,、；;：:]+/g, '')
    .trim()
  return raw.slice(0, 14)
}

export function fallbackDungeonName(run) {
  return generateDungeonName(run, `llm-fallback:${run?.day || 1}`)
}
