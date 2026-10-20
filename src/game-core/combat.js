/**
 * 卡牌化回合制战斗。
 * 不做战棋，也不做集换式卡池：手牌来自角色当前的动作池。
 * 规则全部在本地，LLM 不参与命中、伤害与士气。
 */

import { GIFT_KEYS, ITEMS, REGIONS } from './data.js'
import { addLog, effectiveAttr } from './run.js'
import { createRng } from './rng.js'

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))
const hasTrait = (run, key) => run.player.traits.includes(key)

function hasGear(run, key) {
  return Object.keys(run.equipment).some((slot) => {
    const uid = run.equipment[slot]
    if (!uid) return false
    return run.gear.find((item) => item.uid === uid)?.key === key
  })
}

function battleRng(battle) {
  const rng = createRng(`${battle.seed}:${battle.rollCount}`)
  battle.rollCount += 1
  return rng
}

function roll(battle) {
  return 1 + Math.floor(battleRng(battle).next() * 20)
}

export const CARDS = {
  strike: {
    key: 'strike', name: '突刺', cost: 1, type: 'attack', attr: 'vit', power: 7,
    desc: '体魄判定，稳定的一击。',
  },
  quick: {
    key: 'quick', name: '快斩', cost: 1, type: 'attack', attr: 'per', power: 3, hits: 2,
    desc: '两段轻击，适合剥开护盾。',
  },
  heavy: {
    key: 'heavy', name: '重击', cost: 2, type: 'attack', attr: 'vit', power: 13, accuracy: -2,
    desc: '高伤害，命中略低。',
  },
  bleed: {
    key: 'bleed', name: '割裂', cost: 1, type: 'attack', attr: 'per', power: 5,
    status: { bleed: { damage: 3, turns: 3 } },
    desc: '造成流血，持续 3 回合。',
  },
  sunder: {
    key: 'sunder', name: '破甲', cost: 1, type: 'attack', attr: 'vit', power: 6, defenseDown: 2,
    desc: '命中后永久降低目标 2 点防御。',
  },
  bash: {
    key: 'bash', name: '盾击', cost: 2, type: 'attack', attr: 'vit', power: 5, stun: 1,
    desc: '击晕目标，让它跳过下一次行动。',
  },
  execute: {
    key: 'execute', name: '处决', cost: 2, type: 'attack', attr: 'vit', power: 9, execute: true,
    desc: '目标生命低于 35% 时伤害翻倍。',
  },
  aim: {
    key: 'aim', name: '瞄准', cost: 1, type: 'buff', focus: 2, draw: 1,
    desc: '获得 2 专注，抽 1 张牌。',
  },
  guard: {
    key: 'guard', name: '格挡', cost: 1, type: 'defense', block: 6,
    desc: '获得 6 点护盾，优先吸收伤害。',
  },
  barrier: {
    key: 'barrier', name: '屏障', cost: 2, type: 'defense', block: 10, mental: 4,
    desc: '护盾 10，并稳定 4 点精神。',
  },
  counter: {
    key: 'counter', name: '反击姿态', cost: 1, type: 'defense', block: 2, counter: 5,
    desc: '下一次被攻击时反击 5 点。',
  },
  smoke: {
    key: 'smoke', name: '烟雾', cost: 1, type: 'defense', evasion: 4,
    desc: '本回合受到的攻击伤害 -4。',
  },
  adrenaline: {
    key: 'adrenaline', name: '肾上腺素', cost: 0, type: 'utility', hp: -6, ap: 1,
    desc: '损失 6 生命，获得 1 AP。',
  },
  psi: {
    key: 'psi', name: '精神压制', cost: 1, type: 'psi', attr: 'psi', morale: 8, mental: 3,
    desc: '灵能判定，削减士气；自身精神 -3。',
  },
  overload: {
    key: 'overload', name: '过载', cost: 2, type: 'psi', all: true, morale: 5, mental: 5,
    desc: '对所有敌人造成 5 点士气伤害；精神 -5。',
  },
  resonance: {
    key: 'resonance', name: '共振爆发', cost: 2, type: 'psi', attr: 'psi', morale: 12, mental: 4,
    desc: '高额士气伤害，需要灵能判定。',
  },
  lullaby: {
    key: 'lullaby', name: '安眠曲', cost: 2, type: 'psi', attr: 'psi', morale: 4, lullaby: true,
    desc: '目标士气低于 40% 时直接投降，否则士气 -4。',
  },
  soothe: {
    key: 'soothe', name: '安抚', cost: 1, type: 'heal', mental: 8,
    desc: '稳定自己的精神图景。',
  },
  meditate: {
    key: 'meditate', name: '冥想', cost: 1, type: 'heal', mental: 10, draw: 1,
    desc: '恢复 10 点精神，抽 1 张牌。',
  },
  parley: {
    key: 'parley', name: '谈判', cost: 2, type: 'social', attr: 'soc', morale: 7,
    desc: '交际判定，削减士气；士气崩溃会投降。',
  },
  patch: {
    key: 'patch', name: '急救', cost: 1, type: 'heal', hp: 8,
    desc: '处理伤口，恢复生命。',
  },
  assist: {
    key: 'assist', name: '同伴支援', cost: 1, type: 'attack', attr: 'per', power: 6,
    desc: '队伍成员补上一击。只有组队时才会进入牌堆。',
  },
}

export const BASE_DECK = [
  'strike', 'strike', 'strike',
  'quick', 'heavy', 'bleed', 'sunder', 'bash', 'execute',
  'aim', 'guard', 'guard', 'barrier', 'counter', 'smoke', 'adrenaline',
  'psi', 'psi', 'overload', 'resonance', 'lullaby',
  'soothe', 'meditate', 'parley', 'patch',
]

export const CARD_TYPES = {
  attack: '攻击',
  buff: '战术',
  defense: '防御',
  psi: '灵能',
  heal: '恢复',
  social: '交涉',
  utility: '战术',
}

export const INTENTS = {
  attack: { label: '攻击', color: 'red' },
  psychic: { label: '精神侵蚀', color: 'violet' },
  drain: { label: '精神汲取', color: 'violet' },
  steal: { label: '偷窃', color: 'amber' },
  guard: { label: '戒备', color: 'cyan' },
  buff: { label: '强化', color: 'amber' },
  summon: { label: '召唤', color: 'violet' },
  flee: { label: '撤退', color: 'muted' },
  warn: { label: '警告', color: 'muted' },
}

const ENEMY_DEFENSE = 12

function makeEnemyEntity(base, index, { minion = false, defense = ENEMY_DEFENSE } = {}) {
  const traits = minion ? ['minion'] : [...(base.traits || [])]
  const hpMax = minion ? Math.max(8, Math.ceil(base.hp * 0.55)) : base.hp
  const moraleMax = minion ? Math.max(6, Math.ceil(base.morale * 0.6)) : base.morale

  return {
    id: `e${index}`,
    name: minion ? `${base.name} · 随从` : base.name,
    hp: hpMax,
    hpMax,
    morale: moraleMax,
    moraleMax,
    attack: minion ? Math.max(3, base.attack - 2) : base.attack,
    defense,
    baseDefense: defense,
    armor: traits.includes('armored') ? 2 : 0,
    traits,
    intent: null,
    guard: !minion && traits.includes('guarded') ? 3 : 0,
    status: {},
    stun: 0,
    downed: false,
    surrendered: false,
    fled: false,
    enraged: false,
  }
}

function makeEnemies(run, node) {
  const base = node.enemy || {
    name: '未登记目标', hp: 16, morale: 14, attack: 5, traits: [],
  }
  const defense = ENEMY_DEFENSE + (node.type === 'boss' ? 2 : node.type === 'elite' ? 1 : 0)
  const enemies = [makeEnemyEntity(base, 0, { defense })]

  const extra = node.type === 'elite' ? 1 : node.type === 'boss' ? 1 : 0
  for (let index = 0; index < extra; index += 1) {
    enemies.push(makeEnemyEntity(base, index + 1, { minion: true }))
  }

  return enemies
}

function chooseIntent(battle, enemy) {
  const rng = battleRng(battle)
  let pool

  if (enemy.traits.includes('summoner')) {
    pool = ['summon', 'attack', 'guard', 'buff']
  } else if (enemy.traits.includes('psychic')) {
    pool = ['psychic', 'drain', 'attack', 'warn']
  } else if (enemy.traits.includes('coward')) {
    pool = enemy.morale <= enemy.moraleMax * 0.3
      ? ['flee', 'flee', 'attack', 'steal']
      : ['attack', 'attack', 'steal', 'warn']
  } else if (enemy.traits.includes('guarded')) {
    pool = ['guard', 'attack', 'buff', 'warn']
  } else if (enemy.traits.includes('aggressive')) {
    pool = ['attack', 'attack', 'buff', 'steal']
  } else if (enemy.traits.includes('minion')) {
    pool = ['attack', 'attack', 'steal', 'warn']
  } else {
    pool = ['attack', 'attack', 'guard', 'steal', 'warn']
  }

  if (battle.enemies.filter((item) => !item.downed && !item.surrendered && !item.fled).length >= 3) {
    pool = pool.filter((type) => type !== 'summon')
  }

  const type = rng.pick(pool)
  const value = type === 'attack'
    ? enemy.attack + rng.int(0, 2)
    : type === 'psychic' || type === 'drain'
      ? Math.max(3, Math.ceil(enemy.attack * 0.7) + rng.int(0, 1))
      : 0

  return { type, value }
}

function addBattleLog(battle, text, kind = 'info') {
  battle.log.push({ text, kind })
  if (battle.log.length > 40) battle.log.shift()
}

function shuffleDiscardIntoDraw(battle) {
  if (!battle.discard.length) return false
  const rng = battleRng(battle)
  battle.drawPile = rng.shuffle(battle.discard)
  battle.discard = []
  return true
}

function drawCards(battle, count) {
  for (let index = 0; index < count; index += 1) {
    if (!battle.drawPile.length) {
      const hasCards = shuffleDiscardIntoDraw(battle)
      if (!hasCards) break
    }
    if (battle.hand.length >= 6) break
    battle.hand.push(battle.drawPile.pop())
  }
}

function ensureAttack(battle) {
  if (!battle.hand.length) return
  const hasAttack = battle.hand.some((key) => CARDS[key]?.type === 'attack')
  if (!hasAttack) battle.hand[0] = 'strike'
}

function activeEnemies(battle) {
  return battle.enemies.filter((enemy) => !enemy.downed && !enemy.surrendered && !enemy.fled)
}

function markNodeResolved(run, battle, state) {
  run.nodeState[battle.nodeId] = state
  if (!battle.nodeId.startsWith('ambush-') && !run.cleared.includes(battle.nodeId)) {
    run.cleared.push(battle.nodeId)
  }
}

function applyDefeat(run, battle) {
  battle.status = 'lost'
  const lost = Math.floor(run.player.credits * 0.25)
  run.player.credits -= lost
  run.player.hp = 1
  run.player.mental = Math.max(8, Math.ceil(run.player.mentalMax * 0.2))
  markNodeResolved(run, battle, { resolved: true, failed: true })
  battle.defeat = { credits: lost }
  addBattleLog(battle, `你失去了意识。${lost} 信用点散落在黑暗里。`, 'bad')
  addLog(run, `战斗失败：${battle.nodeId}。损失 ${lost} 信用点。`, 'bad')
}

function checkEnd(battle, run) {
  if (battle.status !== 'active') return battle.status
  if (run.player.hp <= 0 || run.player.mental <= 0) {
    applyDefeat(run, battle)
    return battle.status
  }
  if (activeEnemies(battle).length === 0) {
    battle.status = 'won'
    battle.wonByMorale = battle.enemies.every((enemy) => enemy.surrendered || enemy.downed || enemy.fled) &&
      battle.enemies.some((enemy) => enemy.surrendered)
    addBattleLog(battle, '对方失去战意。轮到你了。', 'good')
    addLog(run, '战斗结束。你赢了。', 'story')
  }
  return battle.status
}

function damageEnemy(battle, enemy, damage, moraleDamage = 0) {
  if (enemy.downed || enemy.surrendered || enemy.fled) return

  let remaining = Math.max(0, damage - (enemy.armor || 0))
  if (remaining < damage && enemy.armor) {
    addBattleLog(battle, `${enemy.name} 的护甲抵消了 ${damage - remaining} 点伤害。`, 'info')
  }
  if (enemy.guard > 0) {
    const absorbed = Math.min(enemy.guard, remaining)
    enemy.guard -= absorbed
    remaining -= absorbed
    if (absorbed) addBattleLog(battle, `${enemy.name} 的戒备吸收了 ${absorbed} 点伤害。`, 'info')
  }

  if (remaining > 0) enemy.hp = clamp(enemy.hp - remaining, 0, enemy.hpMax)
  if (moraleDamage) enemy.morale = clamp(enemy.morale - moraleDamage, 0, enemy.moraleMax)

  if (enemy.hp <= 0) {
    enemy.downed = true
    addBattleLog(battle, `${enemy.name} 失去了战斗能力。`, 'good')
  }
  if (enemy.morale <= 0 && !enemy.downed) {
    enemy.surrendered = true
    addBattleLog(battle, `${enemy.name} 放下了武器。`, 'good')
  }
}

export function createBattle(run, node) {
  const seed = `${run.seed}:battle:${node.id}`
  const rng = createRng(`${seed}:setup`)
  const deck = [...BASE_DECK]
  const party = Array.isArray(run.party) ? run.party.slice(0, 2) : []
  party.forEach(() => deck.push('assist'))

  const battle = {
    nodeId: node.id,
    nodeType: node.type,
    seed,
    rollCount: 0,
    round: 1,
    ap: 3,
    apMax: 3,
    guard: 0,
    focus: 0,
    evasion: 0,
    counter: 0,
    firstStrikeUsed: false,
    hand: [],
    drawPile: rng.shuffle(deck),
    discard: [],
    enemies: makeEnemies(run, node),
    summonBase: node.enemy || { name: '碎片', hp: 12, morale: 8, attack: 3, traits: [] },
    summonCount: 0,
    log: [],
    status: 'active',
    wonByMorale: false,
    defeat: null,
    reward: null,
  }

  battle.enemies.forEach((enemy) => {
    enemy.intent = chooseIntent(battle, enemy)
  })

  drawCards(battle, 4)
  ensureAttack(battle)
  addBattleLog(battle, `遭遇：${battle.enemies.map((enemy) => enemy.name).join('、')}。`, 'story')
  addLog(run, `你在 ${node.title} 遭遇了 ${battle.enemies.map((enemy) => enemy.name).join('、')}。`, 'story')
  return battle
}

function rollSkill(battle, run, attrKey, bonus, target) {
  const rng = battleRng(battle)
  const die = 1 + Math.floor(rng.next() * 20)
  const attr = effectiveAttr(run, attrKey) + bonus
  const total = die + attr
  const crit = die === 20
  const hit = crit || (die !== 1 && total >= target.defense)
  return { rng, die, attr, total, crit, hit }
}

function applyStatus(enemy, key, effect) {
  if (!enemy.status) enemy.status = {}
  enemy.status[key] = { ...effect }
}

function attackDamage(card, check, target, weapon, bonus = 0) {
  let damage = card.power + (weapon ? 2 : 0) + bonus + check.rng.int(0, 2)
  if (card.hits) damage *= card.hits
  damage += Math.floor(check.attr / 3)
  if (check.crit) damage *= 2
  if (card.execute && target.hp / target.hpMax <= 0.35) damage *= 2
  return damage
}

export function playCard(battle, run, handIndex, targetIndex = 0) {
  if (!battle || battle.status !== 'active') return { ok: false, message: '战斗已经结束' }
  const cardKey = battle.hand[handIndex]
  const card = CARDS[cardKey]
  if (!card) return { ok: false, message: '这张牌不存在' }
  if (battle.ap < card.cost) return { ok: false, message: '行动点不足' }

  const enemies = activeEnemies(battle)
  const target = enemies[targetIndex] || enemies[0] || null
  const needsTarget = card.type === 'attack' || card.type === 'social' || (card.type === 'psi' && !card.all)
  if (needsTarget && !target) return { ok: false, message: '没有可攻击的目标' }

  const equippedWeapon = hasGear(run, 'blade')
  const equippedHead = hasGear(run, 'visor')
  const equippedBody = hasGear(run, 'robe')

  battle.ap -= card.cost
  battle.hand.splice(handIndex, 1)
  battle.discard.push(cardKey)

  if (card.type === 'attack') {
    const rng = battleRng(battle)
    const die = 1 + Math.floor(rng.next() * 20)
    const attr = effectiveAttr(run, card.attr || 'vit')
    const accuracy = (card.accuracy || 0) + battle.focus +
      (hasTrait(run, 'nose') ? 1 : 0) +
      (hasTrait(run, 'night') ? 1 : 0)
    const total = die + attr + accuracy
    const crit = die === 20
    const hit = crit || (die !== 1 && total >= target.defense)
    const check = { rng, die, attr, accuracy, total, crit, hit }

    if (hit) {
      let situational = 0
      if ((run.player.perks?.firstStrike || 0) && !battle.firstStrikeUsed) {
        situational += run.player.perks.firstStrike
        battle.firstStrikeUsed = true
      }
      if ((run.player.perks?.lowHpDamage || 0) && run.player.hp < run.player.hpMax * 0.5) {
        situational += run.player.perks.lowHpDamage
      }
      const damage = attackDamage(card, check, target, equippedWeapon, situational)
      damageEnemy(battle, target, damage)

      if (card.status && !target.downed) {
        Object.keys(card.status).forEach((key) => {
          applyStatus(target, key, card.status[key])
        })
        addBattleLog(battle, `${target.name} 陷入${card.status.bleed ? '流血' : '异常'}。`, 'good')
      }
      if (card.defenseDown && !target.downed) {
        target.defense = Math.max(6, target.defense - card.defenseDown)
        addBattleLog(battle, `${target.name} 的防御降低了 ${card.defenseDown}。`, 'good')
      }
      if (card.stun && !target.downed) {
        target.stun = Math.max(target.stun || 0, card.stun)
        addBattleLog(battle, `${target.name} 被击晕了。`, 'good')
      }

      addBattleLog(battle, `${card.name} 命中：${die}+${attr} vs ${target.defense}，造成 ${damage} 伤害。`, 'good')
      if (card.execute && target.hp / target.hpMax <= 0.35) {
        addBattleLog(battle, '处决加成生效。', 'good')
      }
      battle.focus = 0
    } else {
      addBattleLog(battle, `${card.name} 落空：${die}+${attr}+${accuracy} vs ${target.defense}。`, 'bad')
      battle.focus = 0
    }
  } else if (card.type === 'buff') {
    const gain = (card.focus || 2) + (equippedHead ? 1 : 0)
    battle.focus += gain
    if (card.draw) drawCards(battle, card.draw)
    addBattleLog(battle, `你调整呼吸，获得 ${gain} 点专注。`, 'info')
  } else if (card.type === 'defense') {
    const block = (card.block || 0) + (equippedBody ? 2 : 0)
    battle.guard += block
    if (card.counter) battle.counter += card.counter
    if (card.evasion) battle.evasion += card.evasion
    if (card.mental) {
      run.player.mental = clamp(run.player.mental + card.mental, 0, run.player.mentalMax)
    }
    const parts = []
    if (block) parts.push(`护盾 +${block}`)
    if (card.counter) parts.push(`反击 +${card.counter}`)
    if (card.evasion) parts.push(`闪避 +${card.evasion}`)
    if (card.mental) parts.push(`精神 +${card.mental}`)
    addBattleLog(battle, `${card.name}：${parts.join('，')}。`, 'info')
  } else if (card.type === 'utility') {
    if (card.hp) {
      run.player.hp = card.hp < 0
        ? Math.max(1, run.player.hp + card.hp)
        : clamp(run.player.hp + card.hp, 0, run.player.hpMax)
    }
    if (card.ap) battle.ap = Math.min(5, battle.ap + card.ap)
    addBattleLog(battle, `${card.name}：生命 ${card.hp}，AP +${card.ap || 0}。`, 'good')
  } else if (card.type === 'psi') {
    const moraleBonus = hasTrait(run, 'resonance') ? 2 : 0

    if (card.all) {
      const targets = activeEnemies(battle)
      targets.forEach((enemy) => {
        damageEnemy(battle, enemy, 0, card.morale + moraleBonus)
      })
      addBattleLog(battle, `过载扩散到 ${targets.length} 个目标，士气 -${card.morale + moraleBonus}。`, 'good')
    } else {
      const check = rollSkill(battle, run, card.attr, equippedHead ? 1 : 0, target)
      if (check.hit) {
        if (card.lullaby && target.morale <= target.moraleMax * 0.4) {
          target.morale = 0
          target.surrendered = true
          addBattleLog(battle, `${target.name} 在安眠曲里放下了武器。`, 'good')
        } else {
          const moraleDamage = card.morale + moraleBonus
          damageEnemy(battle, target, 0, moraleDamage)
          addBattleLog(battle, `${card.name} 命中：士气 -${moraleDamage}。`, 'good')
        }
      } else {
        addBattleLog(battle, `${card.name} 被挡了回来：${check.die}+${check.attr} vs ${target.defense}。`, 'bad')
      }
    }

    if (card.mental) {
      const cost = Math.max(0, card.mental - (hasTrait(run, 'calm') ? 1 : 0))
      run.player.mental = clamp(run.player.mental - cost, 0, run.player.mentalMax)
      if (cost) addBattleLog(battle, `精神 -${cost}。`, 'bad')
    }
  } else if (card.type === 'heal') {
    if (card.hp) {
      const heal = card.hp + (equippedBody ? 2 : 0) + (run.player.skills?.includes('medicine') ? 2 : 0)
      run.player.hp = clamp(run.player.hp + heal, 0, run.player.hpMax)
      addBattleLog(battle, `生命 +${heal}。`, 'good')
    }
    if (card.mental) {
      const heal = card.mental + (equippedBody ? 3 : 0) + (hasTrait(run, 'resonance') ? 2 : 0)
      run.player.mental = clamp(run.player.mental + heal, 0, run.player.mentalMax)
      addBattleLog(battle, `精神 +${heal}。`, 'good')
    }
    if (card.draw) drawCards(battle, card.draw)
  } else if (card.type === 'social') {
    const socialBonus = (hasTrait(run, 'dealer') ? 1 : 0) + (run.player.skills?.includes('intimidate') ? 1 : 0)
    const check = rollSkill(battle, run, card.attr, socialBonus, target)
    if (check.hit) {
      const moraleDamage = card.morale +
        (hasTrait(run, 'dealer') ? 2 : 0) +
        (run.player.skills?.includes('intimidate') ? 2 : 0)
      damageEnemy(battle, target, 0, moraleDamage)
      addBattleLog(battle, `谈判奏效：${target.name} 士气 -${moraleDamage}。`, 'good')
    } else {
      addBattleLog(battle, `对方不吃这一套：${check.die}+${check.attr} vs ${target.defense}。`, 'bad')
    }
  }

  checkEnd(battle, run)
  return { ok: true, card: cardKey }
}

export function endTurn(battle, run) {
  if (!battle || battle.status !== 'active') return { ok: false }

  battle.discard.push(...battle.hand)
  battle.hand = []

  battle.enemies.forEach((enemy) => {
    if (enemy.downed || enemy.surrendered || enemy.fled) return
    if (!enemy.status) enemy.status = {}

    const bleed = enemy.status.bleed
    if (bleed) {
      damageEnemy(battle, enemy, bleed.damage)
      addBattleLog(battle, `${enemy.name} 流血，生命 -${bleed.damage}。`, 'good')
      bleed.turns -= 1
      if (bleed.turns <= 0) delete enemy.status.bleed
    }
    if (enemy.downed || enemy.surrendered) return

    if (enemy.stun > 0) {
      enemy.stun -= 1
      addBattleLog(battle, `${enemy.name} 还在眩晕中，无法行动。`, 'good')
      return
    }

    const intent = enemy.intent || { type: 'attack', value: enemy.attack }

    if (intent.type === 'attack') {
      let damage = intent.value
      if (battle.evasion > 0) {
        const dodged = Math.min(battle.evasion, damage)
        battle.evasion -= dodged
        damage -= dodged
        if (dodged) addBattleLog(battle, `烟雾让你避开了 ${dodged} 点伤害。`, 'info')
      }
      if (battle.guard > 0) {
        const absorbed = Math.min(battle.guard, damage)
        battle.guard -= absorbed
        damage -= absorbed
        if (absorbed) addBattleLog(battle, `护盾吸收 ${absorbed} 点伤害。`, 'info')
      }
      if (damage > 0) {
        run.player.hp = clamp(run.player.hp - damage, 0, run.player.hpMax)
        addBattleLog(battle, `${enemy.name} 攻击，生命 -${damage}。`, 'bad')
      }
      if (battle.counter > 0 && !enemy.downed) {
        addBattleLog(battle, `反击姿态造成 ${battle.counter} 点伤害。`, 'good')
        damageEnemy(battle, enemy, battle.counter)
        battle.counter = 0
      }
    } else if (intent.type === 'psychic' || intent.type === 'drain') {
      const reduction = (hasGear(run, 'charm') ? 1 : 0) + (run.player.perks?.mentalResist || 0)
      const damage = Math.max(1, intent.value - reduction)
      run.player.mental = clamp(run.player.mental - damage, 0, run.player.mentalMax)
      addBattleLog(battle, `${enemy.name} 的${intent.type === 'drain' ? '汲取' : '精神侵蚀'}，精神 -${damage}。`, 'bad')
      if (intent.type === 'drain') {
        enemy.hp = clamp(enemy.hp + Math.ceil(damage / 2), 0, enemy.hpMax)
      }
    } else if (intent.type === 'steal') {
      const stolen = Math.min(30, run.player.credits)
      run.player.credits -= stolen
      addBattleLog(battle, `${enemy.name} 摸走了 ${stolen} 信用点。`, 'bad')
    } else if (intent.type === 'guard') {
      enemy.guard += 3
      addBattleLog(battle, `${enemy.name} 进入戒备。`, 'info')
    } else if (intent.type === 'buff') {
      enemy.attack += 2
      addBattleLog(battle, `${enemy.name} 的气势变强了，攻击 +2。`, 'bad')
    } else if (intent.type === 'summon') {
      if (activeEnemies(battle).length < 3) {
        battle.summonCount += 1
        const summonBase = battle.summonBase || { name: '碎片', hp: 12, morale: 8, attack: 3, traits: [] };
        const minion = makeEnemyEntity(summonBase, battle.enemies.length, { minion: true })
        minion.name = `${summonBase.name} · 碎片 ${battle.summonCount}`
        minion.intent = chooseIntent(battle, minion)
        battle.enemies.push(minion)
        addBattleLog(battle, `${enemy.name} 召唤了 ${minion.name}。`, 'bad')
      } else {
        addBattleLog(battle, `${enemy.name} 想召唤，但空间不够。`, 'info')
      }
    } else if (intent.type === 'flee') {
      enemy.fled = true
      addBattleLog(battle, `${enemy.name} 退出了战斗。`, 'info')
    } else if (intent.type === 'warn') {
      battle.focus = Math.max(0, battle.focus - 2)
      addBattleLog(battle, `${enemy.name} 发出警告，你的专注 -2。`, 'info')
    }
  })

  battle.enemies.forEach((enemy) => {
    if (enemy.downed || enemy.surrendered || enemy.fled || enemy.hp <= 0) return
    if (enemy.traits.includes('regenerator') && enemy.hp < enemy.hpMax) {
      const heal = Math.min(3, enemy.hpMax - enemy.hp)
      enemy.hp += heal
      addBattleLog(battle, `${enemy.name} 修复了 ${heal} 点生命。`, 'bad')
    }
    if (enemy.traits.includes('frenzy') && !enemy.enraged && enemy.hp <= enemy.hpMax * 0.5) {
      enemy.attack += 2
      enemy.enraged = true
      addBattleLog(battle, `${enemy.name} 进入狂暴，攻击 +2。`, 'bad')
    }
  })

  const regen = run.player.perks?.regen || 0
  if (regen && run.player.hp > 0 && run.player.hp < run.player.hpMax) {
    run.player.hp = clamp(run.player.hp + regen, 0, run.player.hpMax)
    addBattleLog(battle, `共生组织修复了 ${regen} 点生命。`, 'good')
  }

  if (checkEnd(battle, run) !== 'active') return { ok: true }

  battle.round += 1
  battle.ap = battle.apMax
  battle.guard = 0
  battle.focus = 0
  battle.evasion = 0
  battle.counter = 0
  battle.enemies.forEach((enemy) => {
    if (!enemy.downed && !enemy.surrendered && !enemy.fled) {
      enemy.intent = chooseIntent(battle, enemy)
    }
  })
  drawCards(battle, 4)
  ensureAttack(battle)
  addBattleLog(battle, `第 ${battle.round} 回合。`, 'info')
  return { ok: true }
}

export function fleeBattle(run, battle) {
  if (!battle || battle.status !== 'active') return { ok: false }
  battle.status = 'fled'
  run.player.mental = clamp(run.player.mental - 8, 0, run.player.mentalMax)
  markNodeResolved(run, battle, { resolved: true, fled: true })
  addLog(run, `你从 ${battle.nodeId} 撤离了。精神 -8。`, 'bad')
  return { ok: true }
}

export function resolveBattle(run, battle, choice) {
  if (!battle || battle.status !== 'won') return { ok: false, message: '战斗还没有结束' }

  const node = run.map.nodes[battle.nodeId]
  const region = node ? REGIONS[node.region] : null
  const baseReward = 30 + battle.round * 4 + (battle.nodeType === 'boss' ? 60 : battle.nodeType === 'elite' ? 25 : 0)
  const surrendered = battle.enemies.some((enemy) => enemy.surrendered)
  const boss = battle.nodeType === 'boss'

  let credits = 0
  let mental = 0
  let text = ''

  if (choice === 'spare') {
    credits = Math.round(baseReward * 0.2)
    mental = 6
    text = '你收起武器，示意他们离开。'
    run.flags.mercy = (run.flags.mercy || 0) + 1
  } else if (choice === 'disarm') {
    credits = baseReward
    text = '你缴下了他们的装备，换成一笔信用点。'
    const rng = battleRng(battle)
    if (region && rng.chance(0.5)) {
      const item = rng.pick(region.items)
      run.inv[item] = (run.inv[item] || 0) + 1
      text += ` 你还找到了一份 ${ITEMS[item].name}。`
    }
    if (rng.chance(0.18)) {
      const gift = rng.pick(GIFT_KEYS)
      run.inv[gift] = (run.inv[gift] || 0) + 1
      text += ` 你还顺手收起了 ${ITEMS[gift].name}。`
    }
  } else if (choice === 'interrogate') {
    credits = Math.round(baseReward * 0.7)
    text = '你问出了一些坐标和名字。'
    run.flags.intel = (run.flags.intel || 0) + 1
  } else if (choice === 'recruit') {
    if (!surrendered) return { ok: false, message: '对方没有投降，无法招募' }
    if (boss) return { ok: false, message: '首领不会跟你走' }
    credits = 0
    mental = 4
    text = '对方犹豫了一会儿，跟在了你后面。'
    run.flags.recruit = battle.enemies.find((enemy) => enemy.surrendered)?.name || '未登记目标'
  } else if (choice === 'execute') {
    credits = Math.round(baseReward * 1.4)
    mental = -10
    text = '你确保没有人能再站起来。'
    run.flags.ruthless = (run.flags.ruthless || 0) + 1
  } else {
    return { ok: false, message: '未知处置' }
  }

  run.player.credits += credits
  run.player.mental = clamp(run.player.mental + mental, 0, run.player.mentalMax)
  markNodeResolved(run, battle, { resolved: true, outcome: choice })

  battle.reward = { choice, credits, mental, text }
  addLog(run, `${text}${credits ? ` 信用点 +${credits}。` : ''}`, 'story')
  return { ok: true, reward: battle.reward }
}
