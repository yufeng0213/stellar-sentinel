/**
 * 角色创建与派生数值。
 * 纯函数：输入草稿，输出可存档的角色对象。
 */

import {
  ABOS, ATTRS, BASE_ATTR, FLAWS, LANDSCAPES, NAMES, ORIGINS, ROLES,
  SCENTS, SKILLS, SPECIES, TRAITS, FREE_POINTS,
} from './data.js'

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

export function newDraft() {
  return {
    name: '',
    abo: 'beta',
    role: 'sentinel',
    origin: 'colonist',
    species: 'human',
    landscape: 'snowfield',
    scent: 'rain',
    flaw: 'oldwound',
    attrs: ATTRS.reduce((acc, item) => {
      acc[item.key] = BASE_ATTR
      return acc
    }, {}),
    skills: [],
    traits: [],
  }
}

export function flawOf(draft) {
  return FLAWS[draft?.flaw] || null
}

export function freePointsOf(draft) {
  return FREE_POINTS + (flawOf(draft)?.points || 0)
}

export function modsOf(draft) {
  const out = {}
  const sources = [
    ABOS[draft?.abo]?.mod,
    ROLES[draft?.role]?.mod,
    ORIGINS[draft?.origin]?.mod,
    SPECIES[draft?.species]?.mod,
    LANDSCAPES[draft?.landscape]?.mod,
    SCENTS[draft?.scent]?.mod,
    flawOf(draft)?.mod,
  ]

  sources.forEach((src) => {
    if (!src) return
    Object.keys(src).forEach((key) => {
      out[key] = (out[key] || 0) + src[key]
    })
  })
  return out
}

function mergePerks(sources) {
  const out = {}
  sources.forEach((src) => {
    if (!src) return
    Object.keys(src).forEach((key) => {
      const value = src[key]
      if (typeof value === 'number') out[key] = (out[key] || 0) + value
      else if (typeof value === 'boolean') out[key] = out[key] || value
      else out[key] = value
    })
  })
  return out
}

export function perksOf(draft) {
  return mergePerks([
    ORIGINS[draft?.origin]?.perk,
    SPECIES[draft?.species]?.perk,
    LANDSCAPES[draft?.landscape]?.perk,
    ...(draft?.traits || []).map((key) => TRAITS[key]?.perk),
    flawOf(draft)?.perk,
  ])
}

export function finalAttrs(draft) {
  const base = ATTRS.reduce((acc, item) => {
    acc[item.key] = BASE_ATTR
    return acc
  }, {})
  const out = { ...base, ...(draft?.attrs || {}) }
  const mods = modsOf(draft)
  Object.keys(mods).forEach((key) => {
    if (!(key in out)) return
    out[key] = clamp((out[key] || 0) + mods[key], 1, 14)
  })
  return out
}

export function pointsUsed(draft) {
  return ATTRS.reduce((sum, item) => (
    sum + Math.max(0, (draft.attrs[item.key] || BASE_ATTR) - BASE_ATTR)
  ), 0)
}

export function pointsLeft(draft) {
  return freePointsOf(draft) - pointsUsed(draft)
}

export function traitsOf(draft) {
  return (draft.traits || []).map((key) => TRAITS[key]).filter(Boolean)
}

export function skillsOf(draft) {
  return (draft.skills || []).map((key) => SKILLS[key]).filter(Boolean)
}

export function hasSkill(draft, key) {
  return (draft?.skills || []).includes(key)
}

export function buildPreview(draft) {
  const attrs = finalAttrs(draft)
  const abo = ABOS[draft.abo] || ABOS.beta
  const role = ROLES[draft.role] || ROLES.sentinel
  const origin = ORIGINS[draft.origin] || ORIGINS.colonist
  const species = SPECIES[draft.species] || SPECIES.human
  const landscape = LANDSCAPES[draft.landscape] || LANDSCAPES.snowfield
  const flaw = flawOf(draft)
  const perks = perksOf(draft)

  const hpMax = Math.max(
    20,
    40 + attrs.vit * 5 +
      (species.hp || 0) +
      (landscape.hp || 0) +
      (flaw?.hp || 0) +
      (perks.hp || 0)
  )

  const mentalMax = Math.max(
    20,
    100 + attrs.psi * 2 +
      (abo.mental || 0) +
      (role.mental || 0) +
      (species.mental || 0) +
      (landscape.mental || 0) +
      (flaw?.mental || 0) +
      (perks.mental || 0)
  )

  const credits = Math.max(
    0,
    (origin.credits || 0) + (flaw?.credits || 0) + (perks.credits || 0)
  )

  return {
    attrs,
    hpMax,
    mentalMax,
    credits,
    items: { ...(origin.items || {}) },
    perks,
    flaw,
  }
}

export function isValidDraft(draft) {
  return pointsLeft(draft) === 0 &&
    (draft.skills || []).length === 2 &&
    (draft.traits || []).length === 2 &&
    Boolean(flawOf(draft))
}

export function buildCharacter(draft) {
  const preview = buildPreview(draft)
  const perkKeys = preview.perks || {}
  return {
    name: (draft.name || '').trim() || '无名者',
    abo: draft.abo,
    role: draft.role,
    origin: draft.origin,
    species: draft.species,
    landscape: draft.landscape,
    scent: draft.scent,
    flaw: draft.flaw,
    flaws: draft.flaw ? [draft.flaw] : [],
    skills: [...(draft.skills || [])],
    traits: [...(draft.traits || [])],
    attrs: preview.attrs,
    hp: preview.hpMax,
    hpMax: preview.hpMax,
    mental: preview.mentalMax,
    mentalMax: preview.mentalMax,
    credits: preview.credits,
    perks: { ...perkKeys },
  }
}

function pick(list, rng) {
  return list[Math.floor(rng() * list.length)]
}

function pickTwo(keys, rng) {
  const first = pick(keys, rng)
  const second = pick(keys.filter((key) => key !== first), rng)
  return [first, second]
}

export function randomDraft() {
  let state = Date.now() >>> 0
  const rng = () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }

  const draft = newDraft()
  draft.name = pick(NAMES, rng)
  draft.abo = pick(Object.keys(ABOS), rng)
  draft.role = pick(Object.keys(ROLES), rng)
  draft.origin = pick(Object.keys(ORIGINS), rng)
  draft.species = pick(Object.keys(SPECIES), rng)
  draft.landscape = pick(Object.keys(LANDSCAPES), rng)
  draft.scent = pick(Object.keys(SCENTS), rng)
  draft.flaw = pick(Object.keys(FLAWS), rng)
  draft.skills = pickTwo(Object.keys(SKILLS), rng)
  draft.traits = pickTwo(Object.keys(TRAITS), rng)

  let left = freePointsOf(draft)
  let guard = 0
  while (left > 0 && guard < 500) {
    const pool = ATTRS.filter((item) => draft.attrs[item.key] < 10)
    if (!pool.length) break
    draft.attrs[pick(pool, rng).key] += 1
    left -= 1
    guard += 1
  }

  return draft
}
