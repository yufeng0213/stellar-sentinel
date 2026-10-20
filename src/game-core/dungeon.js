/**
 * 地穴命名：本地组合 + 可选的模型候选。
 * 名字只负责氛围，不影响地图结构、掉落或难度。
 */

import { createRng } from './rng.js'

const PREFIXES = ['静默', '锈红', '无光', '白塔', '深岩', '孢雾', '虚空', '边境', '断桅', '低温', '回声', '灰烬']
const ROOTS = ['回廊', '竖井', '菌巢', '档案库', '裂谷', '货舱', '教堂', '哨站', '巢穴', '门', '井', '栈道']
const SUFFIXES = ['下层', '深处', '旧区', '残段', '尽头', '东翼', '回收区', '静默带']

export function generateDungeonName(run, salt = '') {
  const rng = createRng(`${run?.seed || 'DUNGEON'}:${run?.mapSeed || ''}:${salt}`)
  const prefix = rng.pick(PREFIXES)
  const root = rng.pick(ROOTS)
  if (rng.chance(0.45)) return `${prefix}${root}`
  return `${prefix}${root} · ${rng.pick(SUFFIXES)}`
}

export function ensureDungeon(run) {
  if (!run) return null
  if (!run.dungeon || typeof run.dungeon !== 'object' || !run.dungeon.name) {
    run.dungeon = {
      name: generateDungeonName(run),
      source: 'local',
      day: run.day,
    }
  }
  return run.dungeon
}

export function setDungeonName(run, name, source = 'local') {
  const clean = String(name || '').trim().replace(/[。！？!?，,、\s]+/g, '')
  if (clean.length < 2 || clean.length > 14) return { ok: false, message: '地穴名字需要在 2–14 个字之间' }
  run.dungeon = {
    name: clean,
    source,
    day: run.day,
  }
  return { ok: true, name: clean, source }
}

export function resetDungeon(run) {
  run.dungeon = {
    name: generateDungeonName(run, `reset:${run.day}:${run.defeats || 0}`),
    source: 'local',
    day: run.day,
  }
  return run.dungeon
}

export function rerollDungeon(run) {
  run.dungeonRerolls = (run.dungeonRerolls || 0) + 1
  return setDungeonName(
    run,
    generateDungeonName(run, `reroll:${run.dungeonRerolls}`),
    'local'
  )
}
