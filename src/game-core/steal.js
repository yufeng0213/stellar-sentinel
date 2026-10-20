/**
 * 敏捷玩法：扒窃 NPC 与商店。
 * 判定完全本地、可复现；LLM 不参与。
 */

import { ITEMS } from './data.js'
import {
  addItem, addLog, effectiveAttr, getNode, makeGear,
} from './run.js'
import { createRng } from './rng.js'

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

function nextRng(run, tag) {
  run.rollCount = (run.rollCount || 0) + 1
  return createRng(`${run.seed}:${tag}:${run.day}:${run.rollCount}`)
}

function agilityBonus(run) {
  const skill = run.player.skills?.includes('steal') ? 2 : 0
  const perk = run.player.perks?.steal || 0
  const luck = Math.floor((effectiveAttr(run, 'luck') || 0) / 4) + (run.player.perks?.luckCheck || 0)
  return effectiveAttr(run, 'agi') + skill + perk + luck
}

function rollSteal(run, dc) {
  const rng = nextRng(run, 'steal')
  const die = 1 + Math.floor(rng.next() * 20)
  const bonus = agilityBonus(run)
  const total = die + bonus
  const crit = die === 20
  const fumble = die === 1
  return {
    rng,
    die,
    bonus,
    dc,
    total,
    crit,
    fumble,
    success: crit || (!fumble && total >= dc),
  }
}

export function stealFromNpc(run, npcId) {
  const npc = run.npcs?.[npcId]
  if (!npc || !npc.alive) return { ok: false, message: '找不到这个人' }
  if (npc.stolenDay === run.day) return { ok: false, message: '今天已经试过了，再动手会被盯上' }

  npc.stolenDay = run.day
  const dc = 12 + (npc.relation.trust < 25 ? 1 : 0) + (npc.personality.curiosity > 65 ? 2 : 0) + (npc.hostile ? 3 : 0)
  const check = rollSteal(run, dc)
  const rollText = `敏捷 d20(${check.die}) + ${check.bonus} = ${check.total}｜DC ${dc}`

  if (check.success) {
    let loot = ''
    if (check.rng.chance(0.55)) {
      const credits = 8 + check.rng.int(0, 20)
      run.player.credits += credits
      loot = `${credits} 信用点`
    } else {
      const item = check.rng.pick(['scrap', 'chip', 'ration', 'stim'])
      addItem(run, item, 1)
      loot = `${ITEMS[item].name} ×1`
    }

    npc.stolen = (npc.stolen || 0) + 1
    run.flags.stolen = (run.flags.stolen || 0) + 1
    addLog(run, `扒窃 · ${npc.name}｜${rollText} → 成功。摸走 ${loot}。`, 'good')
    return {
      ok: true,
      success: true,
      text: `你从他身上摸走了 ${loot}。他没有察觉。`,
      check,
    }
  }

  const grievance = 15 + (check.fumble ? 10 : 0)
  npc.relation.grievance = clamp(npc.relation.grievance + grievance, 0, 100)
  npc.relation.trust = Math.max(0, npc.relation.trust - 8)
  npc.relation.closeness = Math.max(0, npc.relation.closeness - 3)
  if (npc.relation.grievance >= 60 || npc.personality.aggression >= 60) npc.hostile = true
  npc.memory.unshift({ day: run.day, text: '你试图偷他的东西。' })
  if (npc.memory.length > 8) npc.memory.length = 8

  addLog(run, `扒窃 · ${npc.name}｜${rollText} → 失败。怨念 +${grievance}。`, 'bad')
  return {
    ok: true,
    success: false,
    text: check.fumble
      ? '你的手刚伸出去就被他扣住了。他记住了你的脸。'
      : '他侧过身，你的手落空了。他什么都没说，但眼神变了。',
    check,
  }
}

export function stealFromShop(run, nodeId, index) {
  const node = getNode(run, nodeId)
  if (!node || node.type !== 'shop') return { ok: false, message: '这里不是交易点' }
  if (run.location !== nodeId) return { ok: false, message: '先抵达节点' }
  if (run.cleared.includes(nodeId)) return { ok: false, message: '摊位已经收起来了' }

  const raw = node.stock?.[index]
  if (!raw) return { ok: false, message: '没有这件商品' }
  const offer = typeof raw === 'string' ? { kind: 'item', key: raw, price: 30, stock: 1 } : raw
  if (offer.stock <= 0) return { ok: false, message: '已经卖完了' }

  const region = node.region
  const dc = 12 + (region === 'rift' ? 3 : region === 'silence' ? 3 : region === 'mine' ? 2 : 1) +
    (offer.kind === 'gear' ? 2 : 0)
  const check = rollSteal(run, dc)
  const rollText = `敏捷 d20(${check.die}) + ${check.bonus} = ${check.total}｜DC ${dc}`

  if (check.success) {
    run.flags.stolen = (run.flags.stolen || 0) + 1

    if (offer.kind === 'gear') {
      const gear = makeGear(run, offer.key, offer.quality || '标准')
      run.gear.push(gear)
      if (!run.equipment[gear.slot]) run.equipment[gear.slot] = gear.uid
      if (typeof raw === 'string') node.stock[index] = { ...offer, stock: 0 }
      else raw.stock -= 1
      addLog(run, `顺手牵羊｜${rollText} → 成功。顺走 ${gear.name}。`, 'good')
      return { ok: true, success: true, text: `你顺走了 ${gear.name}，摊主还在低头算账。`, check }
    }

    addItem(run, offer.key, 1)
    if (typeof raw === 'string') node.stock[index] = { ...offer, stock: 0 }
    else raw.stock -= 1
    addLog(run, `顺手牵羊｜${rollText} → 成功。顺走 ${ITEMS[offer.key].name}。`, 'good')
    return { ok: true, success: true, text: `你顺走了 ${ITEMS[offer.key].name}。`, check }
  }

  const lost = Math.min(25, run.player.credits)
  run.player.credits -= lost
  run.player.mental = clamp(run.player.mental - 4, 0, run.player.mentalMax)
  run.nodeState[nodeId] = { resolved: true, alerted: true, text: '摊主看见了你，收起了货。' }
  if (!run.cleared.includes(nodeId)) run.cleared.push(nodeId)
  addLog(run, `顺手牵羊｜${rollText} → 失败。摊主收摊，损失 ${lost} 信用点。`, 'bad')

  return {
    ok: true,
    success: false,
    text: check.fumble
      ? '你碰倒了货架。摊主抓起手边的工具，你只能先退开。'
      : '摊主抬头看了你一眼，把货往柜台里收了收。',
    check,
  }
}
