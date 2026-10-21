/**
 * 约定与失约：NPC 会请求一次见面或一件东西；答应后进入约定列表。
 * 到期未履行会伤关系，并生成失约事件。
 */

import { ITEMS } from './data.js'
import { noteNpcInteraction } from './npc-stages.js'

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

const GIFT_BY_INTEREST = {
  交易: 'ration',
  传闻: 'chip',
  武器: 'alloy',
  星图: 'ore',
  共鸣: 'shard',
  遗物: 'relic',
  植物: 'spore',
  机械: 'scrap',
  旧技术: 'chip',
  冥想: 'stim',
}

export const PROMISE_TYPES = {
  visit: { label: '见面', days: 2, desc: '在约定期限内去看他。' },
  gift: { label: '带东西', days: 3, desc: '把对方想要的东西带过去。' },
}

export function createPromiseState() {
  return { promises: [] }
}

export function ensurePromises(run) {
  if (!run) return []
  if (!Array.isArray(run.promises)) run.promises = []
  return run.promises
}

export function giftForNpc(npc) {
  for (const interest of npc?.interests || []) {
    if (GIFT_BY_INTEREST[interest]) return GIFT_BY_INTEREST[interest]
  }
  return 'ration'
}

export function openPromises(run, npcId = null) {
  ensurePromises(run)
  return run.promises.filter((promise) => (
    promise.status === 'open' && (!npcId || promise.npcId === npcId)
  ))
}

export function createPromise(run, npc, type = 'visit') {
  if (!run || !npc?.alive) return { ok: false, message: '找不到这个人' }
  const open = openPromises(run, npc.id)
  if (open.length) return { ok: false, message: '已经有一个没完成的约定了' }
  const meta = PROMISE_TYPES[type] || PROMISE_TYPES.visit
  const itemId = type === 'gift' ? giftForNpc(npc) : null
  const promise = {
    id: `promise-${run.seed}-${run.promises.length + 1}-${npc.id}`,
    npcId: npc.id,
    type,
    itemId,
    createdDay: run.day,
    deadline: run.day + meta.days,
    status: 'open',
  }
  run.promises.push(promise)
  npc.lastPromiseDay = run.day
  return { ok: true, promise, meta, item: itemId ? ITEMS[itemId] : null }
}

export function fulfillPromise(run, promiseId) {
  ensurePromises(run)
  const promise = run.promises.find((item) => item.id === promiseId)
  if (!promise) return { ok: false, message: '找不到这个约定' }
  if (promise.status !== 'open') return { ok: false, message: '这个约定已经结束了' }
  if (promise.deadline < run.day) return { ok: false, message: '这个约定已经过期了' }
  const npc = run.npcs?.[promise.npcId]
  if (!npc?.alive) return { ok: false, message: '对方已经不在了' }

  if (promise.type === 'gift') {
    if ((run.inv[promise.itemId] || 0) < 1) {
      return { ok: false, message: `你还没有${ITEMS[promise.itemId]?.name || '约定的东西'}` }
    }
    run.inv[promise.itemId] -= 1
    if (run.inv[promise.itemId] <= 0) delete run.inv[promise.itemId]
  }

  promise.status = 'done'
  promise.doneDay = run.day
  npc.relation.trust = clamp(npc.relation.trust + 4, 0, 100)
  npc.relation.closeness = clamp(npc.relation.closeness + 3, 0, 100)
  npc.relation.grievance = clamp(npc.relation.grievance - 3, 0, 100)
  npc.strain = Math.max(0, (npc.strain || 0) - 10)
  noteNpcInteraction(npc, run.day, 6)
  return {
    ok: true,
    promise,
    text: promise.type === 'gift'
      ? `你把${ITEMS[promise.itemId]?.name || '东西'}带给了${npc.name}。他收下时没有多说什么，但明显松了口气。`
      : `你去见了${npc.name}。这次没有迟到，他也没有再提上次的事。`,
  }
}

export function expirePromises(run) {
  ensurePromises(run)
  const broken = []
  run.promises.forEach((promise) => {
    if (promise.status !== 'open' || promise.deadline >= run.day) return
    const npc = run.npcs?.[promise.npcId]
    promise.status = 'broken'
    promise.brokenDay = run.day
    if (npc?.alive) {
      npc.relation.trust = clamp(npc.relation.trust - 6, 0, 100)
      npc.relation.closeness = clamp(npc.relation.closeness - 7, 0, 100)
      npc.relation.grievance = clamp(npc.relation.grievance + 8, 0, 100)
      npc.strain = clamp((npc.strain || 0) + 10, 0, 100)
    }
    broken.push({ promise, npc })
  })
  return broken
}
