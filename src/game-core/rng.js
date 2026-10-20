/**
 * 稳定随机数：同一个种子得到同一条序列。
 * 规则层禁止直接使用 Math.random()，避免存档回放和测试不可复现。
 */

export const hashSeed = (input) => {
  const text = String(input ?? '')
  let hash = 2166136261 >>> 0
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

const mulberry32 = (seed) => {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export const createRng = (seed) => {
  const next = mulberry32(hashSeed(seed))

  return {
    next,
    int(min, max) {
      const low = Math.ceil(Math.min(min, max))
      const high = Math.floor(Math.max(min, max))
      return low + Math.floor(next() * (high - low + 1))
    },
    pick(list) {
      if (!Array.isArray(list) || list.length === 0) return null
      return list[Math.floor(next() * list.length)]
    },
    chance(probability) {
      return next() < probability
    },
    shuffle(list) {
      const copy = [...list]
      for (let i = copy.length - 1; i > 0; i -= 1) {
        const j = Math.floor(next() * (i + 1))
        ;[copy[i], copy[j]] = [copy[j], copy[i]]
      }
      return copy
    },
  }
}
