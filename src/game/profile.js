/**
 * 跨周目档案：成就与累计记录。
 * 与 run 存档分开，避免新开一局丢失。
 */

import { readEndingCollection } from './collection.js'

const KEY = 'ss.profile'

export function readProfile() {
  let profile = null
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) profile = JSON.parse(raw)
  } catch {
    profile = null
  }
  if (!profile || typeof profile !== 'object') profile = {}
  if (!profile.achievements || typeof profile.achievements !== 'object') profile.achievements = {}
  if (!profile.counters || typeof profile.counters !== 'object') profile.counters = {}
  profile.endings = profile.endings || readEndingCollection()
  return profile
}

export function writeProfile(profile) {
  try {
    localStorage.setItem(KEY, JSON.stringify(profile))
  } catch {
    // 浏览器禁用存储时仍允许本次游戏运行
  }
  return profile
}

export function unlockAchievements(ids, day = 1) {
  const profile = readProfile()
  const unlocked = []
  ids.forEach((id) => {
    if (!id || profile.achievements[id]) return
    profile.achievements[id] = { day, unlockedAt: Date.now() }
    unlocked.push(id)
  })
  if (unlocked.length) writeProfile(profile)
  return unlocked
}

export function achievementCount(profile = readProfile()) {
  return Object.keys(profile.achievements || {}).length
}

export function mergeEndingsIntoProfile() {
  const profile = readProfile()
  profile.endings = readEndingCollection()
  writeProfile(profile)
  return profile
}
