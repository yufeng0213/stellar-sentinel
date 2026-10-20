/**
 * 结局收集的本地持久化。
 */

import { mergeEndingRecord } from '../game-core/ending.js'

const KEY = 'ss.endings'

export function readEndingCollection() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

export function recordEnding(record) {
  const next = mergeEndingRecord(readEndingCollection(), record)
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    // 浏览器禁用存储时，本次收集仍然能在当前页面显示
  }
  return next
}

export function endingCount(collection) {
  return Object.keys(collection || {}).length
}
