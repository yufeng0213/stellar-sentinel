/**
 * 静态数据：角色、物品、区域、配方。
 * 纯数据，不依赖任何运行时环境。
 */

export const ATTRS = [
  { key: 'per', name: '感知', desc: '侦查 · 采集' },
  { key: 'vit', name: '体魄', desc: '耐受 · 生命' },
  { key: 'agi', name: '敏捷', desc: '潜行 · 扒窃' },
  { key: 'psi', name: '灵能', desc: '屏障 · 安抚' },
  { key: 'tec', name: '技艺', desc: '锻造 · 入侵' },
  { key: 'soc', name: '交际', desc: '交涉 · 议价' },
  { key: 'wil', name: '意志', desc: '抵抗侵蚀' },
  { key: 'luck', name: '机缘', desc: '暴击 · 意外' },
]

export const ATTR_NAME = ATTRS.reduce((acc, item) => {
  acc[item.key] = item.name
  return acc
}, {})

export const BASE_ATTR = 3
export const FREE_POINTS = 18
export const ATTR_MAX = 10

export const ABOS = {
  alpha: {
    key: 'alpha', name: 'Alpha', code: 'α', tag: '威慑 · 强信息素', accent: '255,196,107',
    mod: { vit: 1, soc: 1 }, mental: 0,
    desc: '信息素烈度偏高，压制与号令是本能。旁人会先退半步，再听你说话。',
    scent: '烈度 82 · 威慑型',
  },
  beta: {
    key: 'beta', name: 'Beta', code: 'β', tag: '稳态 · 抗干扰', accent: '124,231,255',
    mod: { per: 1, wil: 1 }, mental: 0,
    desc: '信息素平稳，不引人注意，也不容易被牵着走。边境星区里，活下来的多是 Beta。',
    scent: '烈度 41 · 稳态型',
  },
  omega: {
    key: 'omega', name: 'Omega', code: 'Ω', tag: '共鸣 · 高敏', accent: '185,164,255',
    mod: { psi: 1, per: 1 }, mental: -10,
    desc: '你能听见别人精神图景里的杂音。共鸣是天赋，也是一道一直没长好的伤口。',
    scent: '烈度 67 · 共鸣型',
  },
}

export const ROLES = {
  sentinel: {
    key: 'sentinel', name: '哨兵', code: 'S', mark: 'S-01',
    mod: { per: 1 }, mental: -10, gather: 1,
    desc: '五感外放，采集与追踪更强，但精神更容易过载。',
  },
  guide: {
    key: 'guide', name: '向导', code: 'G', mark: 'G-02',
    mod: { psi: 1 }, mental: 0, psiCheck: 1,
    desc: '能走进别人的精神图景。安抚、屏障，也可能在深处留下东西。',
  },
}

export { ORIGINS, TRAITS, SPECIES, LANDSCAPES, SCENTS, SKILLS, FLAWS, ORIGIN_CATEGORIES } from './chargen-data.js'

export const ITEMS = {
  scrap: { name: '合金废料', kind: 'mat', glyph: '▤', note: '船体残片，锻炉的底料。' },
  chip: { name: '旧世芯片', kind: 'mat', glyph: '▦', note: '还能读出半段失效协议。' },
  ore: { name: '星髓矿', kind: 'mat', glyph: '◆', note: '冷光在矿石内部缓慢流动。' },
  cold: { name: '冷晶', kind: 'mat', glyph: '◇', note: '低于环境温度，从不融化。' },
  spore: { name: '荧光孢', kind: 'mat', glyph: '✳', note: '呼吸时会微微发亮。' },
  resin: { name: '琥珀树脂', kind: 'mat', glyph: '⬢', note: '向导做屏障的基材。' },
  shard: { name: '裂隙结晶', kind: 'mat', glyph: '✦', note: '靠近时，精神图景会起波纹。' },
  fiber: { name: '纤维束', kind: 'mat', glyph: '≋', note: '从孢雾林里抽出的韧性纤维。' },
  alloy: { name: '合金板', kind: 'mat', glyph: '▥', note: '从船体上切下来的整块装甲。' },
  relic: { name: '遗物碎片', kind: 'mat', glyph: '✧', note: '不属于这个时代的合金。' },
  stim: { name: '稳定剂', kind: 'use', glyph: '✚', effect: { mental: 25 }, useHint: '战斗外使用 · 精神 +25', note: '压住过载的神经。精神低时判定会变差，出发前或回城后使用。' },
  ration: { name: '营养膏', kind: 'use', glyph: '▣', effect: { hp: 18, mental: 5 }, useHint: '战斗外使用 · 生命 +18 / 精神 +5', note: '味道像纸板，但有用。用来补一点生命和精神。' },
  anti: { name: '抗侵蚀剂', kind: 'use', glyph: '✜', effect: { mental: 35 }, useHint: '战斗外使用 · 精神 +35', note: '压住低语，代价是短暂耳鸣。精神恢复量比稳定剂更高。' },
  medkit: { name: '医疗包', kind: 'use', glyph: '⊞', effect: { hp: 30 }, useHint: '战斗外使用 · 生命 +30', note: '旧塔制式，纱布已经发黄。战斗结束后用来处理伤口。' },
  wine: { name: '空港私酿', kind: 'use', glyph: '♨', effect: { mental: 12, hp: 4 }, useHint: '战斗外使用 · 精神 +12 / 生命 +4', note: '酒吧最便宜的暖身酒，喝下去像吞了一小团火。' },
  pebble: { name: '光滑小石头', kind: 'gift', glyph: '○', note: '没有用途，只是摸着很舒服。可以送人。', giftTags: ['遗物'] },
  postcard: { name: '旧明信片', kind: 'gift', glyph: '▭', note: '边角卷曲，背面没有字。可以送人。', giftTags: ['传闻', '星图'] },
  bell: { name: '小铜铃', kind: 'gift', glyph: '♧', note: '摇起来声音很轻，像很远的地方在响。可以送人。', giftTags: ['冥想'] },
  button: { name: '褪色纽扣', kind: 'gift', glyph: '◌', note: '从某件旧制服上掉下来的，线头还在。可以送人。', giftTags: ['旧技术'] },
  dice: { name: '磨圆的骰子', kind: 'gift', glyph: '⬡', note: '点数已经看不清了，但重心很稳。可以送人。', giftTags: ['交易'] },
  flower: { name: '干花', kind: 'gift', glyph: '✿', note: '夹在旧书里，颜色居然还在。可以送人。', giftTags: ['植物'] },
  toy: { name: '铁皮小兽', kind: 'gift', glyph: '♘', note: '发条还能转两圈，然后自己倒下。可以送人。', giftTags: ['机械'] },
  letter: { name: '没有地址的信', kind: 'gift', glyph: '✉', note: '封口没有拆过，也许不该拆。可以送人。', giftTags: ['传闻'] },
}

export const GIFT_KEYS = ['pebble', 'postcard', 'bell', 'button', 'dice', 'flower', 'toy', 'letter']

export const GEAR = {
  blade: { name: '共鸣刃', slot: 'weapon', bonus: { per: 1 }, setId: 'tower', note: '刃口会随心跳轻微震动。' },
  visor: { name: '感知面罩', slot: 'head', bonus: { per: 2 }, setId: 'tower', note: '把过量的信息过滤成线条。' },
  robe: { name: '向导长袍', slot: 'body', bonus: { psi: 2, soc: 1 }, setId: 'tower', note: '内衬缝着旧塔的屏蔽丝。' },
  gloves: { name: '锻工手套', slot: 'hands', bonus: { tec: 2 }, setId: 'drifters', note: '掌心的老茧比甲片可靠。' },
  charm: { name: '裂隙护符', slot: 'trinket', bonus: { wil: 2 }, setId: 'whisper', note: '一小块不会熄灭的黑。' },
  cloak: { name: '静默披风', slot: 'body', bonus: { per: 1, wil: 1 }, setId: 'drifters', note: '走起来没有声音。' },
  scope: { name: '长距瞄具', slot: 'head', bonus: { per: 1, tec: 1 }, setId: 'drifters', note: '把远处的轮廓拉近。' },
  coil: { name: '共振线圈', slot: 'trinket', bonus: { psi: 2 }, setId: 'drifters', note: '贴着皮肤时会轻轻发热。' },
  bracers: { name: '合金护腕', slot: 'hands', bonus: { vit: 1, tec: 1 }, setId: 'tower', note: '挡过一刀，凹痕还在。' },
  aegis: { name: '塔卫重盾', slot: 'body', bonus: { vit: 2, wil: 1 }, setId: 'tower', note: '从白塔门框上拆下来的整块装甲。' },
  void: { name: '裂隙切割器', slot: 'weapon', bonus: { per: 2, psi: 2 }, setId: 'whisper', note: '刃口附近的光会轻微弯折。' },
}

export const GEAR_GLYPH = {
  blade: '†', visor: '◉', robe: '▧', gloves: '⬡', charm: '✦',
  cloak: '⌁', scope: '⊙', coil: '∿', bracers: '⊓', aegis: '▣', void: '⟡',
}

export const GEAR_SETS = {
  tower: {
    name: '白塔制式',
    items: ['blade', 'visor', 'robe', 'bracers', 'aegis'],
    two: { name: '白塔协议', desc: '战斗开始获得 4 点护盾。', effect: { shield: 4 } },
    four: { name: '封锁线', desc: '对首领造成的伤害 +2。', effect: { boss: 2 } },
  },
  drifters: {
    name: '漂流者套装',
    items: ['gloves', 'cloak', 'scope', 'coil'],
    two: { name: '拾荒本能', desc: '战斗信用点收益 +20%。', effect: { credits: 0.2 } },
    four: { name: '无主之地', desc: '每回合第一张攻击牌伤害 +2。', effect: { firstAttack: 2 } },
  },
  whisper: {
    name: '低语者遗物',
    items: ['charm', 'void'],
    two: { name: '静默共鸣', desc: '受到的侵蚀伤害 -1。', effect: { mentalResist: 1 } },
    four: { name: '回声', desc: '暂未开放。', effect: {} },
  },
}

export const GEAR_AFFIXES = {
  ferocious: { name: '凶猛', desc: '攻击牌伤害 +2', effect: { attack: 2 } },
  bulwark: { name: '壁垒', desc: '战斗开始获得 3 点护盾', effect: { shield: 3 } },
  hunter: { name: '猎首', desc: '对首领造成的伤害 +3', effect: { boss: 3 } },
  resolute: { name: '坚忍', desc: '精神低于 30 时攻击伤害 +2', effect: { lowMental: 2 } },
  scavenger: { name: '拾荒', desc: '战斗信用点收益 +15%', effect: { credits: 0.15 } },
  warded: { name: '静默护壁', desc: '受到的侵蚀伤害 -1', effect: { mentalResist: 1 } },
}
export const SLOTS = { weapon: '主手', head: '头部', body: '身体', hands: '手部', trinket: '饰品' }

export const RECIPES = [
  { id: 'blade', out: 'blade', name: '共鸣刃', type: 'gear', dc: 14, mats: { ore: 2, scrap: 2 } },
  { id: 'visor', out: 'visor', name: '感知面罩', type: 'gear', dc: 15, mats: { cold: 2, chip: 1 } },
  { id: 'robe', out: 'robe', name: '向导长袍', type: 'gear', dc: 14, mats: { resin: 2, spore: 2 } },
  { id: 'gloves', out: 'gloves', name: '锻工手套', type: 'gear', dc: 13, mats: { scrap: 2, resin: 1 } },
  { id: 'charm', out: 'charm', name: '裂隙护符', type: 'gear', dc: 16, mats: { shard: 1, cold: 1 } },
  { id: 'stim', out: 'stim', name: '稳定剂 ×2', type: 'use', dc: 11, mats: { spore: 1, resin: 1 }, qty: 2 },
  { id: 'anti', out: 'anti', name: '抗侵蚀剂', type: 'use', dc: 12, mats: { spore: 2, resin: 1 }, qty: 1 },
  { id: 'medkit', out: 'medkit', name: '医疗包', type: 'use', dc: 12, mats: { fiber: 2, resin: 1 }, qty: 1 },
  { id: 'cloak', out: 'cloak', name: '静默披风', type: 'gear', dc: 14, mats: { fiber: 3, spore: 2 } },
  { id: 'scope', out: 'scope', name: '长距瞄具', type: 'gear', dc: 15, mats: { alloy: 2, chip: 1 } },
  { id: 'coil', out: 'coil', name: '共振线圈', type: 'gear', dc: 16, mats: { shard: 1, cold: 2 } },
  { id: 'bracers', out: 'bracers', name: '合金护腕', type: 'gear', dc: 13, mats: { alloy: 2, scrap: 2 } },
  { id: 'aegis', out: 'aegis', name: '塔卫重盾', type: 'gear', tier: 'prototype', source: 'boss', dc: 17, mats: { alloy: 3, relic: 1, cold: 1 } },
  { id: 'void', out: 'void', name: '裂隙切割器', type: 'gear', tier: 'prototype', source: 'boss', dc: 18, mats: { shard: 2, cold: 2, relic: 1 } },
]

export const BOSS_BLUEPRINT = 'void'

export const REGIONS = {
  dock: {
    id: 'dock', name: '白塔空港', accent: '124,231,255', danger: 0,
    desc: '停摆的检疫闸口、还亮着的自动售货机，和一群不肯离开的人。',
    items: ['scrap', 'chip', 'ration', 'stim'],
    titles: {
      gather: ['废弃储物柜', '售货机残骸', '停摆的行李转盘'],
      battle: ['醉酒的拾荒者', '失控的清洁机'],
      event: ['广播塔', '无人检疫口'],
      shop: ['三号货舱', '拾荒者摊位'],
      rest: ['旧舱室'],
    },
  },
  ruins: {
    id: 'ruins', name: '锈带废墟', accent: '255,196,107', danger: 1,
    desc: '一整支殖民舰队的坟场。风穿过断裂的舱壁，像有人在远处念名字。',
    items: ['scrap', 'chip', 'resin', 'stim', 'alloy'],
    titles: {
      gather: ['断裂船体', '旧医疗舱', '信号塔残骸'],
      battle: ['盘踞者', '巡逻无人机'],
      event: ['半截求救信号', '还亮着的舷窗'],
      shop: ['拾荒者营地'],
      rest: ['密封隔舱'],
    },
  },
  mine: {
    id: 'mine', name: '深岩矿脉', accent: '179,164,255', danger: 2,
    desc: '自动化钻机还在工作，没有人下令让它们停下。岩壁里的光会跟着你的呼吸明灭。',
    items: ['ore', 'cold', 'scrap', 'shard', 'alloy'],
    titles: {
      gather: ['星髓露头', '冷晶簇', '塌方层'],
      battle: ['矿机守卫', '岩层里的东西'],
      event: ['钻机日志', '被封住的竖井'],
      shop: ['矿工补给点'],
      rest: ['干燥的矿洞'],
    },
  },
  grove: {
    id: 'grove', name: '孢雾林', accent: '138,222,184', danger: 2,
    desc: '货舱里漏出来的实验菌株，在废弃穹顶下长成了一片森林。发光的孢子像慢速的雪。',
    items: ['spore', 'resin', 'shard', 'ration', 'fiber'],
    titles: {
      gather: ['荧光菌床', '树脂淤积', '孢子云深处'],
      battle: ['孢化体', '群集的食腐者'],
      event: ['会呼吸的穹顶', '菌丝里的名字'],
      shop: ['林间交换点'],
      rest: ['干燥的树洞'],
    },
  },
  rift: {
    id: 'rift', name: '黑曜裂谷', accent: '255,138,138', danger: 3,
    desc: '空间在这里折了一道。读数全部无效，通讯延迟七秒，而你的精神图景里有人在敲门。',
    items: ['shard', 'cold', 'chip', 'relic'],
    titles: {
      gather: ['裂隙边缘', '黑曜断崖', '静默区'],
      battle: ['回声体', '不该存在的东西'],
      event: ['七秒延迟', '门'],
      shop: ['边界商人'],
      rest: ['不存在的房间'],
    },
  },
  wreck: {
    id: 'wreck', name: '旧战场', accent: '214,170,116', danger: 2,
    desc: '两支舰队在这里互相烧了三天。装甲板还保持着被掀开的形状。',
    items: ['alloy', 'scrap', 'chip', 'cold'],
    titles: {
      gather: ['烧穿的装甲', '弹药舱残骸', '断裂的舰桥'],
      battle: ['失控的战争机器', '残存的自动炮塔'],
      event: ['未爆弹', '阵亡名单'],
      shop: ['随军补给车'],
      rest: ['半塌的掩体'],
    },
  },
  silence: {
    id: 'silence', name: '静默带', accent: '160,150,190', danger: 3,
    desc: '所有声音都被吸走了。你只能靠心跳判断自己还活着。',
    items: ['relic', 'cold', 'shard', 'fiber'],
    titles: {
      gather: ['无声的祭坛', '失重的碎片', '没有影子的房间'],
      battle: ['静默行者', '被遗忘的哨兵'],
      event: ['没有回声的井', '第二颗心'],
      shop: ['边界交换所'],
      rest: ['沉默的舱室'],
    },
  },
}

export const BASE_DECK = [
  'strike', 'strike', 'strike',
  'quick', 'heavy', 'bleed', 'sunder', 'bash', 'execute',
  'aim', 'guard', 'guard', 'barrier', 'counter', 'smoke', 'adrenaline',
  'psi', 'psi', 'overload', 'resonance', 'lullaby',
  'soothe', 'meditate', 'parley', 'patch',
]

export const BOSS_PROFILES = [
  {
    id: 'rift_core',
    name: '裂隙核心',
    hp: 56,
    morale: 40,
    weakness: 'psi',
    resistance: 'vit',
    traits: ['psychic', 'guarded'],
    mechanic: '外壳会分两阶段崩解；灵能压制有效，体魄攻击被外壳削弱。',
    phases: [
      { at: 0.66, name: '外壳崩解', text: '外壳裂开，核心暴露。攻击 +2，护甲 +1。', attack: 2, armor: 1, intents: ['psychic', 'drain', 'attack'] },
      { at: 0.33, name: '核心过载', text: '核心开始过载，攻击 +3，进入狂暴。', attack: 3, traits: ['frenzy'], intents: ['psychic', 'attack', 'drain', 'summon'] },
    ],
  },
  {
    id: 'silent_choir',
    name: '无声合唱',
    hp: 60,
    morale: 46,
    weakness: 'soc',
    resistance: 'psi',
    traits: ['psychic', 'summoner'],
    mechanic: '它用低语分裂出回声；交涉能削减士气，灵能攻击被抗性削弱。',
    phases: [
      { at: 0.7, name: '回声分裂', text: '合唱分成多道回声。攻击 +1，开始召唤随从。', attack: 1, traits: ['summoner'], intents: ['summon', 'psychic', 'attack'] },
      { at: 0.35, name: '齐声', text: '所有回声同时开口。攻击 +2，士气恢复。', attack: 2, morale: 8, intents: ['psychic', 'drain', 'attack'] },
    ],
  },
  {
    id: 'tower_echo',
    name: '白塔残响',
    hp: 64,
    morale: 38,
    weakness: 'tec',
    resistance: 'per',
    traits: ['armored', 'guarded'],
    mechanic: '残响会不断修复装甲；技艺攻击能拆开结构，感知攻击被干扰。',
    phases: [
      { at: 0.65, name: '装甲闭合', text: '残响合拢装甲。护甲 +2，戒备 +2。', armor: 2, guard: 2, intents: ['guard', 'attack', 'buff'] },
      { at: 0.3, name: '塔心暴露', text: '塔心暴露，但残响开始自毁。攻击 +2。', attack: 2, intents: ['attack', 'guard', 'psychic'] },
    ],
  },
]

export const NODE_TYPES = {
  start: { name: '起点', glyph: '◉' },
  gather: { name: '采集', glyph: '◆' },
  battle: { name: '遭遇', glyph: '⚔' },
  elite: { name: '精英', glyph: '✶' },
  event: { name: '事件', glyph: '◇' },
  date: { name: '约会', glyph: '♡' },
  shop: { name: '交易', glyph: '◈' },
  rest: { name: '休整', glyph: '☾' },
  boss: { name: '首领', glyph: '✷' },
}

export const NAMES = ['凛', '灰原', '祁', '洛', '沙', '银', '渡', '栖', '南', '零', '夜见', '白鸦']
