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

export function theftReaction(npc) {
  const archetype = npc?.archetype?.id || ''
  const trust = npc?.relation?.trust || 0
  const closeness = npc?.relation?.closeness || 0
  const grievance = npc?.relation?.grievance || 0
  const aggression = npc?.personality?.aggression || 0
  const forgiving = npc?.lover ||
    trust >= 60 ||
    closeness >= 55 ||
    ['sunshine', 'loyal_dog', 'homemaker', 'tycoon'].includes(archetype) ||
    (npc?.personality?.loyalty || 0) >= 65
  const volatile = aggression >= 55 ||
    grievance >= 50 ||
    ['rough', 'yandere', 'madman', 'tsundere'].includes(archetype)
  if (forgiving && !volatile) return 'gift'
  if (volatile) return 'fight'
  return 'warn'
}

function giftForTheft(run, npc, check) {
  if (check.rng.chance(0.5)) {
    const credits = 6 + check.rng.int(0, 10)
    run.player.credits += credits
    return { text: `他看了你一会儿，从口袋里摸出 ${credits} 信用点递过来：“缺钱就说。”`, reward: `${credits} 信用点` }
  }
  const item = check.rng.pick(['ration', 'stim', 'scrap'])
  addItem(run, item, 1)
  return { text: `他没有追究，反而把一件${ITEMS[item].name}塞给你：“下次别这样。”`, reward: `${ITEMS[item].name} ×1` }
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

  const reaction = theftReaction(npc)
  const grievance = reaction === 'gift' ? 2 : 15 + (check.fumble ? 10 : 0)
  npc.relation.grievance = clamp(npc.relation.grievance + grievance, 0, 100)
  npc.relation.trust = Math.max(0, npc.relation.trust - (reaction === 'gift' ? 1 : 8))
  npc.relation.closeness = Math.max(0, npc.relation.closeness - (reaction === 'gift' ? 1 : 3))
  npc.memory.unshift({ day: run.day, text: '你试图偷他的东西。' })
  if (npc.memory.length > 8) npc.memory.length = 8

  if (reaction === 'gift') {
    const gift = giftForTheft(run, npc, check)
    addLog(run, `扒窃 · ${npc.name}｜${rollText} → 被发现，但对方没有追究。${gift.reward}。`, 'info')
    return {
      ok: true,
      success: false,
      reaction,
      reward: gift.reward,
      text: `${gift.text}\n\n${check.fumble ? '你的动作很笨拙，他一眼就看见了。' : '他侧过身，看见了你的手。'}`,
      check,
    }
  }

  if (reaction === 'fight') {
    npc.hostile = true
    npc.relation.closeness = Math.max(0, npc.relation.closeness - 4)
    npc.relation.trust = Math.max(0, npc.relation.trust - 4)
    addLog(run, `扒窃 · ${npc.name}｜${rollText} → 被发现，对方动手了。`, 'bad')
    return {
      ok: true,
      success: false,
      reaction,
      fight: true,
      text: check.fumble
        ? '你的手刚伸出去就被他扣住了。他没有给你解释的机会，直接动了手。'
        : '他侧过身，反手抓住了你的手腕。\n\n“你找错人了。”',
      check,
    }
  }

  addLog(run, `扒窃 · ${npc.name}｜${rollText} → 失败。怨念 +${grievance}。`, 'bad')
  return {
    ok: true,
    success: false,
    reaction,
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
