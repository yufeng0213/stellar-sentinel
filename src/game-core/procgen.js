/**
 * 程序化星区：同一个 seed 必须生成同一张图。
 * 结构为 10 层、3 幕的分支节点图，玩家只能向前移动。
 */

import { REGIONS } from './data.js'
import { createRng } from './rng.js'

const TOTAL_LAYERS = 10
const ACT_OF_LAYER = [1, 1, 1, 1, 2, 2, 2, 3, 3, 3]

const TYPE_WEIGHTS = {
  1: [['gather', 0.42], ['battle', 0.18], ['event', 0.25], ['shop', 0.1], ['rest', 0.05]],
  2: [['gather', 0.3], ['battle', 0.25], ['event', 0.2], ['elite', 0.08], ['shop', 0.09], ['rest', 0.08]],
  3: [['battle', 0.28], ['elite', 0.18], ['event', 0.22], ['gather', 0.18], ['shop', 0.06], ['rest', 0.08]],
}

const FALLBACK_TITLE = {
  gather: '未标记的储藏点',
  battle: '敌意信号',
  event: '异常读数',
  elite: '高危目标',
  shop: '流动摊位',
  rest: '临时营地',
  boss: '裂隙核心',
  start: '检疫闸门',
}

const ATTR_POOL = ['per', 'tec', 'vit', 'psi', 'wil']

function weightedPick(rng, entries) {
  const roll = rng.next()
  let cursor = 0
  for (const [value, weight] of entries) {
    cursor += weight
    if (roll <= cursor) return value
  }
  return entries[entries.length - 1][0]
}

function pickRegion(rng, layer) {
  if (layer === 0) return 'dock'
  if (layer === TOTAL_LAYERS - 1) return 'rift'
  const act = ACT_OF_LAYER[layer]
  const pools = {
    1: ['dock', 'ruins', 'ruins'],
    2: ['ruins', 'wreck', 'mine', 'mine', 'grove'],
    3: ['grove', 'silence', 'rift', 'rift'],
  }
  return rng.pick(pools[act])
}

function makeEnemy(rng, region, type) {
  const names = region.titles.battle || []
  const baseHp = type === 'boss' ? 56 : type === 'elite' ? 32 : 22
  const traits = new Set()

  if (type === 'boss') {
    traits.add('psychic')
    traits.add('guarded')
    traits.add(rng.pick(['armored', 'summoner', 'frenzy']))
  } else if (type === 'elite') {
    traits.add(rng.pick(['armored', 'regenerator', 'summoner']))
    traits.add(rng.pick(['aggressive', 'guarded']))
  } else {
    traits.add(rng.pick(['aggressive', 'guarded', 'coward', 'psychic']))
    if (rng.chance(0.2)) traits.add('armored')
    if (rng.chance(0.1)) traits.add('regenerator')
  }

  return {
    name: type === 'boss' ? '裂隙核心' : (rng.pick(names) || '未登记目标'),
    hp: baseHp + rng.int(0, 6),
    morale: type === 'boss' ? 40 : 18 + rng.int(0, 8),
    attack: 4 + region.danger * 2 + rng.int(0, 3),
    weakness: type === 'boss' ? 'psi' : null,
    traits: [...traits],
  }
}

function makeYields(rng, region) {
  const count = rng.chance(0.4) ? 2 : 1
  const yields = []
  for (let i = 0; i < count; i += 1) {
    const item = rng.pick(region.items)
    const qty = rng.chance(0.25) ? [2, 2] : [1, 1]
    yields.push({ item, qty })
  }
  return yields
}

const EVENT_TEMPLATES = [
  {
    id: 'beacon',
    title: '应急信标',
    text: '一枚旧式信标还在闪。它的频段被人为改过，像是在等某个特定的人。',
    choices: [
      {
        id: 'decode',
        label: '拆解信标',
        desc: '技艺判定，可能拆出还能用的部件',
        attr: 'tec',
        dc: 13,
        success: { text: '你拆出一块还能用的芯片，顺手带走了备用电源。', credits: 30, itemKey: true, itemCount: 1 },
        failure: { text: '信标自毁，灼伤了你的手。', hp: -5, mental: -4 },
      },
      { id: 'leave', label: '绕开', desc: '不碰它', outcome: { text: '你没有停留。' } },
    ],
  },
  {
    id: 'medbay',
    title: '旧医疗舱',
    text: '舱门半开着，里面还亮着一盏应急灯。空气里有消毒剂和霉味。',
    choices: [
      {
        id: 'search',
        label: '翻找药品',
        desc: '感知判定，可能找到稳定剂',
        attr: 'per',
        dc: 12,
        skill: 'medicine',
        success: { text: '你找到两支还能用的稳定剂。', itemKey: 'stim', itemCount: 2, mental: 4 },
        failure: { text: '过滤器里全是孢子，你咳了很久。', hp: -6, mental: -4 },
      },
      {
        id: 'rest',
        label: '在这里喘口气',
        desc: '不检定，恢复少量精神',
        outcome: { text: '你靠着墙坐了一会儿，耳鸣轻了些。', mental: 8 },
      },
    ],
  },
  {
    id: 'crate',
    title: '遗留补给箱',
    text: '箱体被固定在墙里，锁已经锈死。旁边有一串只有进去、没有出来的脚印。',
    choices: [
      {
        id: 'pry',
        label: '撬开箱子',
        desc: '感知判定，可能拿到材料',
        attr: 'per',
        dc: 13,
        skill: 'lockpick',
        success: { text: '箱盖弹开，里面的东西还没坏。', itemKey: true, itemCount: 2, credits: 15 },
        failure: { text: '撬棍打滑，你摔在金属棱角上。', hp: -5 },
      },
      { id: 'leave', label: '离开', desc: '不碰这箱东西', outcome: { text: '你退了出去。' } },
    ],
  },
  {
    id: 'whisper',
    title: '低语频道',
    text: '通讯里没有载波，只有一个很轻的声音在重复你的名字。',
    choices: [
      {
        id: 'listen',
        label: '听下去',
        desc: '意志判定，可能得到情报',
        attr: 'wil',
        dc: 13,
        skill: 'lore',
        success: { text: '你听清了一个坐标，还有一句警告。', mental: 10, flag: 'whisper' },
        failure: { text: '声音钻进了你的图景。你花了很久才把它关掉。', mental: -10 },
      },
      { id: 'close', label: '关掉频道', desc: '不冒精神风险', outcome: { text: '你切断了频道。' } },
    ],
  },
  {
    id: 'patrol',
    title: '无人巡逻',
    text: '两名穿着旧制服的人拦住了你，胸前的徽记已经磨平。',
    choices: [
      {
        id: 'talk',
        label: '交涉',
        desc: '交际判定，可能拿到通行费',
        attr: 'soc',
        dc: 13,
        success: { text: '他们收了你的登记信息，放你过去，还退了一笔押金。', credits: 45 },
        failure: { text: '他们把你按在墙上搜了一遍，什么也没找到才放人。', mental: -6 },
      },
      { id: 'detour', label: '绕路', desc: '不和他们纠缠', outcome: { text: '你从侧面的检修通道绕了过去。' } },
    ],
  },
  {
    id: 'battlefield',
    title: '旧战场',
    text: '烧焦的装甲板铺了一地。有些舱体里还卡着没炸完的弹药。',
    choices: [
      {
        id: 'loot',
        label: '翻找残骸',
        desc: '感知判定，可能找到材料',
        attr: 'per',
        dc: 13,
        success: { text: '你从装甲缝里抽出一块完整的合金板。', itemKey: true, itemCount: 2, credits: 20 },
        failure: { text: '一块残片塌下来，压住了你的腿。', hp: -7 },
      },
      { id: 'leave', label: '离开', desc: '这里不安全', outcome: { text: '你没有久留。' } },
    ],
  },
  {
    id: 'silence',
    title: '静默区',
    text: '所有声音都消失了。你听见自己的心跳，也听见另一个更慢的心跳。',
    choices: [
      {
        id: 'listen',
        label: '停下来听',
        desc: '意志判定，可能获得精神恢复',
        attr: 'wil',
        dc: 14,
        success: { text: '你把自己的呼吸压慢，图景重新稳定下来。', mental: 12, flag: 'silence' },
        failure: { text: '那个心跳贴得太近了。你花了很久才把它推开。', mental: -12 },
      },
      { id: 'hurry', label: '快步穿过', desc: '不在里面停留', outcome: { text: '你低着头走了过去。', mental: -3 } },
    ],
  },
  {
    id: 'signal',
    title: '信号塔',
    text: '塔顶的天线还在缓慢转动，像在找某个已经不存在的东西。',
    choices: [
      {
        id: 'access',
        label: '接入终端',
        desc: '技艺判定，可能拿到旧协议',
        attr: 'tec',
        dc: 14,
        skill: 'hacking',
        success: { text: '你导出了一段旧协议，还有一笔没人领的赏金。', credits: 60, flag: 'signal' },
        failure: { text: '终端过载，白光烧得你眼前发黑。', mental: -7 },
      },
      { id: 'leave', label: '离开', desc: '不碰这台机器', outcome: { text: '你绕开了塔基。' } },
    ],
  },
  {
    id: 'smuggler',
    title: '走私船',
    text: '一艘没有登记的小船半埋在沙里。舱门开着，里面有人刚离开不久。',
    choices: [
      {
        id: 'talk',
        label: '等船主回来',
        desc: '交际判定，谈一笔买卖',
        attr: 'soc',
        dc: 12,
        success: { text: '船主愿意用一批货换你的沉默。', credits: 45, itemKey: true, itemCount: 1 },
        failure: { text: '船主改变主意，朝你开了一枪。', hp: -6, mental: -4 },
      },
      {
        id: 'search',
        label: '直接搜船',
        desc: '感知判定，拿得更多但会结仇',
        attr: 'per',
        dc: 14,
        success: { text: '你拿走了一整箱物资，没人看见。', itemKey: true, itemCount: 2, flag: 'thief' },
        failure: { text: '你碰响了警报，只能空手跑掉。', mental: -5 },
      },
    ],
  },
  {
    id: 'spores',
    title: '孢子潮',
    text: '一阵发光的孢子云正沿着通道推过来。它没有重量，但会钻进呼吸里。',
    choices: [
      {
        id: 'push',
        label: '穿过去',
        desc: '体魄判定，抢在潮头前通过',
        attr: 'vit',
        dc: 13,
        success: { text: '你憋住气冲了过去，还顺手抓了一把孢子。', itemKey: true, itemCount: 2, hp: -3 },
        failure: { text: '你在孢子云里迷了路，咳得站不起来。', hp: -9, mental: -5 },
      },
      { id: 'wait', label: '等它过去', desc: '稳妥，但会消耗时间', outcome: { text: '你退回检修口，等光慢慢散去。', mental: -2 } },
    ],
  },
]

function makeEvent(rng, region) {
  const template = rng.pick(EVENT_TEMPLATES)
  const choices = template.choices.map((choice) => {
    const copy = { ...choice }
    if (copy.success) {
      copy.success = { ...copy.success }
      if (copy.success.itemKey === true) copy.success.itemKey = rng.pick(region.items)
    }
    if (copy.failure) copy.failure = { ...copy.failure }
    if (copy.outcome) copy.outcome = { ...copy.outcome }
    return copy
  })
  return {
    templateId: template.id,
    title: template.title,
    text: template.text,
    choices,
  }
}

function makeStock(rng, region) {
  const gearKeys = ['blade', 'visor', 'robe', 'gloves', 'charm', 'cloak', 'scope', 'coil', 'bracers']
  const mat = rng.pick(region.items)
  return [
    {
      kind: 'item',
      key: mat,
      price: 16 + region.danger * 8 + rng.int(0, 10),
      stock: 1 + rng.int(0, 2),
    },
    {
      kind: 'item',
      key: rng.pick(['stim', 'ration', 'anti', 'medkit']),
      price: 26 + region.danger * 6 + rng.int(0, 8),
      stock: 1,
    },
    {
      kind: 'gear',
      key: rng.pick(gearKeys),
      quality: rng.chance(0.25) ? '精良' : '标准',
      price: 110 + region.danger * 35 + rng.int(0, 40),
      stock: 1,
    },
  ]
}

function makeNode(rng, layer, slot, type) {
  const regionId = pickRegion(rng, layer)
  const region = REGIONS[regionId]
  const act = ACT_OF_LAYER[layer]
  const titleList = type === 'elite'
    ? (region.titles.battle || []).map((name) => `${name} · 精英`)
    : (region.titles[type] || [])
  const title = rng.pick(titleList) || FALLBACK_TITLE[type]

  const node = {
    id: `n${layer}-${slot}`,
    layer,
    slot,
    act,
    type,
    region: regionId,
    title,
    accent: region.accent,
    next: [],
    prev: [],
  }

  if (type === 'start') {
    node.subtitle = '白塔空港 · 安全区'
    node.dc = 0
  } else if (type === 'gather') {
    node.attr = rng.pick(ATTR_POOL)
    node.dc = Math.min(18, 10 + layer + rng.int(0, 2))
    node.charges = 2 + rng.int(0, 1)
    node.yields = makeYields(rng, region)
    node.subtitle = `${region.name} · 可采集`
  } else if (type === 'battle' || type === 'elite' || type === 'boss') {
    node.enemy = makeEnemy(rng, region, type)
    node.subtitle = `${region.name} · ${type === 'boss' ? '区域首领' : type === 'elite' ? '高危目标' : '敌对信号'}`
  } else if (type === 'shop') {
    node.stock = makeStock(rng, region)
    node.subtitle = `${region.name} · 交易`
  } else if (type === 'rest') {
    node.heal = 24 + region.danger * 4
    node.mental = 18 + region.danger * 3
    node.subtitle = `${region.name} · 休整点`
  } else {
    node.subtitle = `${region.name} · 异常`
    node.event = makeEvent(rng, region)
    node.title = node.event.title
  }

  return node
}

function connectLayers(rng, prevIds, nextIds, nodes) {
  prevIds.forEach((prevId) => {
    const prev = nodes[prevId]
    const count = prevId.startsWith('n0-') ? nextIds.length : rng.chance(0.42) ? 2 : 1
    const picks = rng.shuffle(nextIds).slice(0, Math.min(count, nextIds.length))
    picks.forEach((nextId) => {
      if (!prev.next.includes(nextId)) {
        prev.next.push(nextId)
        nodes[nextId].prev.push(prevId)
      }
    })
  })

  // 保证下一层每个节点都可抵达
  nextIds.forEach((nextId) => {
    if (nodes[nextId].prev.length > 0) return
    const from = rng.pick(prevIds)
    nodes[from].next.push(nextId)
    nodes[nextId].prev.push(from)
  })
}

export function generateRunMap(seed) {
  const rng = createRng(seed)
  const nodes = {}
  const layers = []

  for (let layer = 0; layer < TOTAL_LAYERS; layer += 1) {
    let count
    if (layer === 0 || layer === TOTAL_LAYERS - 1) count = 1
    else count = rng.int(2, 3)

    const ids = []
    for (let slot = 0; slot < count; slot += 1) {
      let type
      if (layer === 0) type = 'start'
      else if (layer === TOTAL_LAYERS - 1) type = 'boss'
      else type = weightedPick(rng, TYPE_WEIGHTS[ACT_OF_LAYER[layer]])

      const node = makeNode(rng, layer, slot, type)
      nodes[node.id] = node
      ids.push(node.id)
    }
    layers.push(ids)
  }

  for (let layer = 0; layer < TOTAL_LAYERS - 1; layer += 1) {
    connectLayers(rng, layers[layer], layers[layer + 1], nodes)
  }

  return {
    seed: String(seed),
    layers,
    nodes,
    startId: layers[0][0],
    bossId: layers[TOTAL_LAYERS - 1][0],
    totalLayers: TOTAL_LAYERS,
  }
}

export function makeSeed() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID().slice(0, 8).toUpperCase()
  }
  return `${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`.toUpperCase()
}
