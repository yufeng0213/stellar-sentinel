/**
 * 角色创建静态数据：人种、图景、气味、能力、缺陷、出身、特质。
 * 纯数据，不依赖运行时。
 */

export const ORIGIN_CATEGORIES = ['军事', '技术', '地下', '劳作', '信仰', '荒野', '学院']

export const SPECIES = {
  human: {
    key: 'human', name: '边境人类', code: 'H-01', tag: '适应 · 兼容',
    mod: { luck: 1 }, hp: 0, mental: 0,
    perk: { npcBias: 2 }, perkText: '与所有派系都能说上话，初始印象 +2',
    desc: '没有特异器官，也没有明显短板。能在任何舱段活下去。',
  },
  starfolk: {
    key: 'starfolk', name: '星裔', code: 'H-02', tag: '共鸣 · 敏感',
    mod: { psi: 1, wil: 1 }, hp: 0, mental: 10,
    perk: { npcBias: 1 }, perkText: '精神上限 +10，初始印象 +1',
    desc: '皮肤下有淡蓝色的星图纹路。情绪稳定时，它们会缓慢流动。',
  },
  miner: {
    key: 'miner', name: '深岩矿民', code: 'H-03', tag: '耐压 · 夜视',
    mod: { vit: 2, per: -1 }, hp: 10, mental: 0,
    perk: { nightVision: true, gather: 1 }, perkText: '夜间不受罚，采集 +1，生命 +10',
    desc: '在矿脉里长大，眼睛对黑暗比对光更熟悉。',
  },
  symbiote: {
    key: 'symbiote', name: '共生体', code: 'H-04', tag: '再生 · 异质',
    mod: { vit: 1, psi: 1, soc: -1 }, hp: 6, mental: 0,
    perk: { regen: 2 }, perkText: '每回合恢复 2 生命，生命 +6',
    desc: '体内住着一段温和的菌丝。它替你修补伤口，也偶尔替你做梦。',
  },
  construct: {
    key: 'construct', name: '旧塔造物', code: 'H-05', tag: '构造 · 抗侵蚀',
    mod: { tec: 2, wil: 1, soc: -1 }, hp: 0, mental: -10,
    perk: { mentalResist: 1, craft: 1 }, perkText: '精神伤害 -1，锻造 +1',
    desc: '旧塔流水线上最后一批没有销毁的型号。你记得自己被编号的那天。',
  },
  drifter: {
    key: 'drifter', name: '漂流民', code: 'H-06', tag: '轻步 · 顺手',
    mod: { agi: 2, per: 1, vit: -1 }, hp: -4, mental: 0,
    perk: { steal: 1 }, perkText: '扒窃 +1，生命 -4',
    desc: '在废弃船舱之间搬过太多次家，已经习惯只带走能塞进外套的东西。',
  },
}

export const LANDSCAPES = {
  snowfield: {
    key: 'snowfield', name: '雪原', code: 'L-01', tag: '安静 · 稳定',
    mod: { wil: 1 }, hp: 0, mental: 10,
    perk: { calm: 1 }, perkText: '精神上限 +10，精神消耗更容易被压住',
    desc: '你的图景是一片没有边界的雪。声音传得很远，但没有人回答。',
  },
  deepsea: {
    key: 'deepsea', name: '深海', code: 'L-02', tag: '共感 · 下沉',
    mod: { psi: 1, soc: -1 }, hp: 0, mental: 5,
    perk: { empathy: 1 }, perkText: '更容易读懂别人，交涉判定 +1',
    desc: '你站在一片漆黑的海底。所有情绪都从上方缓慢落下来。',
  },
  burning: {
    key: 'burning', name: '燃烧之城', code: 'L-03', tag: '爆发 · 焦躁',
    mod: { vit: 1 }, hp: 5, mental: 0,
    perk: { firstStrike: 2 }, perkText: '每场战斗第一次攻击 +2 伤害',
    desc: '街道一直在烧。你学会在火里分辨方向，也学会先动手。',
  },
  starmap: {
    key: 'starmap', name: '无垠星图', code: 'L-04', tag: '方向 · 机缘',
    mod: { per: 1, luck: 1 }, hp: 0, mental: 0,
    perk: { gather: 1 }, perkText: '采集 +1，机缘判定更稳',
    desc: '你的图景是一张不断展开的星图。每一条线都通向某个可能。',
  },
  hive: {
    key: 'hive', name: '蜂巢', code: 'L-05', tag: '群体 · 回响',
    mod: { soc: 1 }, hp: 0, mental: 0,
    perk: { npcBias: 2 }, perkText: '初始印象 +2',
    desc: '无数个细小的声音同时说话。你很难独处，也很难被真正孤立。',
  },
  library: {
    key: 'library', name: '静默图书馆', code: 'L-06', tag: '秩序 · 技艺',
    mod: { tec: 1 }, hp: 0, mental: 5,
    perk: { craft: 1 }, perkText: '锻造 +1，精神上限 +5',
    desc: '书架一直延伸到看不见的地方。每本书都记得借阅者的名字。',
  },
  wound: {
    key: 'wound', name: '未愈的伤口', code: 'L-07', tag: '痛感 · 反击',
    mod: { wil: 1 }, hp: -5, mental: 0,
    perk: { lowHpDamage: 2 }, perkText: '生命低于一半时，攻击 +2 伤害',
    desc: '你的图景是一道没有缝合的裂口。越疼的时候，你越清醒。',
  },
  void: {
    key: 'void', name: '虚空', code: 'L-08', tag: '深渊 · 低语',
    mod: { psi: 1 }, hp: 0, mental: -15,
    perk: { fear: 1 }, perkText: '威胁与威慑更有效，精神上限 -15',
    desc: '那里什么都没有，但什么都没有的地方，也会回望你。',
  },
}

export const SCENTS = {
  metal: {
    key: 'metal', name: '冷金属', code: 'SC-01', faction: 'tower', mod: { vit: 1 },
    desc: '像刚拆封的枪械。白塔的人会下意识放松一点。',
  },
  spore: {
    key: 'spore', name: '孢子', code: 'SC-02', faction: 'drifters', mod: { psi: 1 },
    desc: '潮湿、微甜，带一点发光菌的味道。',
  },
  rain: {
    key: 'rain', name: '雨后石', code: 'SC-03', faction: null, mod: { wil: 1 },
    desc: '干净、冷、没有攻击性。很少有人讨厌这种味道。',
  },
  ozone: {
    key: 'ozone', name: '臭氧', code: 'SC-04', faction: 'whisper', mod: { psi: 1 },
    desc: '像雷暴前的空气。靠近的人会觉得自己被看穿。',
  },
  paper: {
    key: 'paper', name: '旧纸', code: 'SC-05', faction: 'tower', mod: { tec: 1 },
    desc: '干燥的纤维和灰尘。旧塔档案室的味道。',
  },
  citrus: {
    key: 'citrus', name: '血橙', code: 'SC-06', faction: 'market', mod: { soc: 1 },
    desc: '酸甜、明亮，在沉闷的舱室里很显眼。',
  },
  smoke: {
    key: 'smoke', name: '焦油', code: 'SC-07', faction: 'market', mod: { agi: 1 },
    desc: '燃烧过的塑料和廉价烟草。适合混在人群里。',
  },
  cedar: {
    key: 'cedar', name: '雪松', code: 'SC-08', faction: 'drifters', mod: { wil: 1 },
    desc: '木质、微苦，像旧时代的家具。',
  },
  salt: {
    key: 'salt', name: '海盐', code: 'SC-09', faction: null, mod: { per: 1 },
    desc: '咸、湿、带着远方的风。会让哨兵多看你一眼。',
  },
  ember: {
    key: 'ember', name: '余烬', code: 'SC-10', faction: 'whisper', mod: { vit: 1 },
    desc: '灰烬和热气。靠近时，像有什么东西刚刚熄灭。',
  },
}

export const SKILLS = {
  steal: {
    key: 'steal', name: '扒窃', code: 'K-01', attr: 'agi',
    desc: '可从 NPC 或商店扒窃，判定 +2。失败会留下痕迹。',
  },
  lockpick: {
    key: 'lockpick', name: '开锁', code: 'K-02', attr: 'agi',
    desc: '开锁、拆解机关与潜入判定 +2。',
  },
  medicine: {
    key: 'medicine', name: '急救', code: 'K-03', attr: 'tec',
    desc: '治疗与急救 +2，战斗中的恢复牌效果更好。',
  },
  intimidate: {
    key: 'intimidate', name: '威吓', code: 'K-04', attr: 'soc',
    desc: '威胁与强压谈判 +2，更容易让对方让步。',
  },
  tracking: {
    key: 'tracking', name: '追踪', code: 'K-05', attr: 'per',
    desc: '采集、追踪与发现伏击 +2。',
  },
  mechanics: {
    key: 'mechanics', name: '机械', code: 'K-06', attr: 'tec',
    desc: '锻造、修理与拆解机械 +2。',
  },
  hacking: {
    key: 'hacking', name: '入侵', code: 'K-07', attr: 'tec',
    desc: '终端、旧协议与电子锁 +2。',
  },
  empathy: {
    key: 'empathy', name: '共情', code: 'K-08', attr: 'psi',
    desc: '对话与安抚 +2，更容易让 NPC 开口。',
  },
  stealth: {
    key: 'stealth', name: '潜行', code: 'K-09', attr: 'agi',
    desc: '潜行、躲避与脱离伏击 +2。',
  },
  barter: {
    key: 'barter', name: '议价', code: 'K-10', attr: 'soc',
    desc: '商店价格 -10%，出售更划算。',
  },
  lore: {
    key: 'lore', name: '旧世学', code: 'K-11', attr: 'wil',
    desc: '事件、遗物与旧协议判定 +2。',
  },
}

export const FLAWS = {
  oldwound: {
    key: 'oldwound', name: '旧伤', points: 4, hp: -12,
    desc: '一段没长好的伤口。生命上限 -12，换取 4 点属性。',
  },
  nerves: {
    key: 'nerves', name: '神经过敏', points: 4, mental: -12,
    desc: '太容易被声音惊醒。精神上限 -12，换取 4 点属性。',
  },
  greed: {
    key: 'greed', name: '贪财', points: 4, credits: -40, perk: { price: 0.1 },
    desc: '信用点 -40，商店价格 +10%。你很难空手离开交易点。',
  },
  feud: {
    key: 'feud', name: '仇家', points: 5, perk: { feud: 1 },
    desc: '开局有一名 NPC 已经记恨你。换取 5 点属性。',
  },
  addiction: {
    key: 'addiction', name: '药物依赖', points: 4, mental: -8, perk: { consume: -0.25 },
    desc: '消耗品效果 -25%，精神上限 -8。没有稳定剂时手会抖。',
  },
  nightblind: {
    key: 'nightblind', name: '夜盲', points: 4, mod: { per: -1 }, perk: { nightPenalty: -1 },
    desc: '感知 -1，夜间判定额外 -1。换取 4 点属性。',
  },
  tremor: {
    key: 'tremor', name: '手抖', points: 4, mod: { tec: -1 }, perk: { steal: -1 },
    desc: '技艺 -1，扒窃 -1。精细动作总差一点。',
  },
  pheromone: {
    key: 'pheromone', name: '信息素紊乱', points: 4, mod: { soc: -1 },
    perk: { npcBias: -4 },
    desc: '交际 -1，NPC 初始印象 -4。你的气味总在错误的时候出现。',
  },
  oath: {
    key: 'oath', name: '失信者', points: 5, credits: -80,
    desc: '信用点 -80。有些门不会再为你打开。换取 5 点属性。',
  },
  tinnitus: {
    key: 'tinnitus', name: '耳鸣', points: 4, mental: -8, mod: { per: -1 },
    desc: '感知 -1，精神上限 -8。安静的时候最响。',
  },
}

export const TRAITS = {
  nose: { key: 'nose', name: '敏锐嗅觉', desc: '采集判定 +1' },
  hands: { key: 'hands', name: '精密手指', desc: '锻造判定 +1' },
  calm: { key: 'calm', name: '冷静脉冲', desc: '精神消耗 -1' },
  dealer: { key: 'dealer', name: '谈判专家', desc: '交涉判定 +1' },
  night: { key: 'night', name: '夜行者', desc: '夜间不再受罚，反而 +1' },
  resonance: { key: 'resonance', name: '共鸣体质', desc: '对话好感 +1' },
  lucky: { key: 'lucky', name: '幸运儿', desc: '机缘判定 +1', perk: { luckCheck: 1 } },
  thick: { key: 'thick', name: '皮糙肉厚', desc: '生命上限 +8', perk: { hp: 8 } },
  empath: { key: 'empath', name: '共情者', desc: 'NPC 初始印象 +3', perk: { npcBias: 3 } },
  scavenger: { key: 'scavenger', name: '拾荒本能', desc: '采集判定 +1', perk: { gather: 1 } },
  slippery: { key: 'slippery', name: '手脚干净', desc: '扒窃判定 +1', perk: { steal: 1 } },
  ironstomach: { key: 'ironstomach', name: '铁胃', desc: '消耗品效果 +20%', perk: { consume: 0.2 } },
}

export const ORIGINS = {
  colonist: {
    key: 'colonist', name: '殖民舰遗孤', code: 'O-01', category: '劳作',
    mod: { vit: 1 }, credits: 80, items: { scrap: 2, ration: 1 },
    perk: { gather: 1 }, perkText: '采集 +1',
    desc: '会拆东西，也会忍饿。',
  },
  cadet: {
    key: 'cadet', name: '白塔学员', code: 'O-02', category: '学院',
    mod: { psi: 1 }, credits: 120, items: { stim: 1, chip: 1 },
    perk: { mental: 5 }, perkText: '精神上限 +5',
    desc: '协议成了没人认领的遗产。',
  },
  broker: {
    key: 'broker', name: '黑市掮客', code: 'O-03', category: '地下',
    mod: { soc: 1 }, credits: 260, items: { chip: 2, ration: 1 },
    perk: { barter: 0.1 }, perkText: '商店价格 -10%',
    desc: '认识每一扇后门。',
  },
  survivor: {
    key: 'survivor', name: '裂隙生还者', code: 'O-04', category: '荒野',
    mod: { wil: 1 }, credits: 60, items: { shard: 1, stim: 1 },
    perk: { mental: 10 }, perkText: '精神上限 +10',
    desc: '你去过裂谷，并且回来了。',
  },
  miner: {
    key: 'miner', name: '矿脉童工', code: 'O-05', category: '劳作',
    mod: { vit: 2, per: -1 }, credits: 90, items: { ore: 2, ration: 1 },
    perk: { hp: 8 }, perkText: '生命上限 +8',
    desc: '在矿脉里长大，知道石头什么时候会响。',
  },
  groveguide: {
    key: 'groveguide', name: '孢雾林向导', code: 'O-06', category: '荒野',
    mod: { per: 1, psi: 1 }, credits: 70, items: { spore: 2, resin: 1 },
    perk: { gather: 1 }, perkText: '采集 +1',
    desc: '能听懂孢子云的方向。',
  },
  archivist: {
    key: 'archivist', name: '旧塔书记', code: 'O-07', category: '学院',
    mod: { tec: 1, wil: 1 }, credits: 110, items: { chip: 1, fiber: 1 },
    perk: { craft: 1 }, perkText: '锻造 +1',
    desc: '替旧塔整理过没人读的档案。',
  },
  guard: {
    key: 'guard', name: '商队护卫', code: 'O-08', category: '军事',
    mod: { vit: 1, soc: 1 }, credits: 140, items: { scrap: 2, ration: 1 },
    perk: { hp: 8 }, perkText: '生命上限 +8',
    desc: '护送过三支没能全部回来的商队。',
  },
  smuggler: {
    key: 'smuggler', name: '走私船大副', code: 'O-09', category: '地下',
    mod: { agi: 1, soc: 1 }, credits: 220, items: { chip: 1, stim: 1 },
    perk: { barter: 0.1 }, perkText: '商店价格 -10%',
    desc: '知道哪条航线没有登记。',
  },
  hunter: {
    key: 'hunter', name: '赏金猎人', code: 'O-10', category: '军事',
    mod: { per: 1, vit: 1 }, credits: 150, items: { scrap: 1, chip: 1 },
    perk: { tracking: 1 }, perkText: '追踪 +1',
    desc: '靠赏金活过边境的冬天。',
  },
  medic: {
    key: 'medic', name: '战地医师', code: 'O-11', category: '技术',
    mod: { tec: 1, wil: 1 }, credits: 130, items: { stim: 2 },
    perk: { medicine: 1 }, perkText: '急救 +1',
    desc: '在战场上学会先看呼吸，再看伤口。',
  },
  welder: {
    key: 'welder', name: '舰船焊工', code: 'O-12', category: '技术',
    mod: { tec: 2 }, credits: 120, items: { scrap: 2, alloy: 1 },
    perk: { craft: 1 }, perkText: '锻造 +1',
    desc: '船体上的每一道缝都摸过。',
  },
  priest: {
    key: 'priest', name: '低语者祭司', code: 'O-13', category: '信仰',
    mod: { psi: 1, wil: 1 }, credits: 100, items: { shard: 1 },
    perk: { fear: 1 }, perkText: '威慑 +1',
    desc: '低语者说，沉默也是一种祷词。',
  },
  scavenger: {
    key: 'scavenger', name: '拾荒者', code: 'O-14', category: '荒野',
    mod: { per: 1, luck: 1 }, credits: 70, items: { scrap: 2, chip: 1 },
    perk: { gather: 1 }, perkText: '采集 +1',
    desc: '在别人不要的东西里找明天。',
  },
  signal: {
    key: 'signal', name: '通信兵', code: 'O-15', category: '军事',
    mod: { tec: 1, per: 1 }, credits: 130, items: { chip: 2 },
    perk: { hack: 1 }, perkText: '入侵 +1',
    desc: '听过白塔最后一秒的载波。',
  },
  deserter: {
    key: 'deserter', name: '逃兵', code: 'O-16', category: '军事',
    mod: { agi: 1, wil: 1 }, credits: 50, items: { ration: 1, stim: 1 },
    perk: { stealth: 1 }, perkText: '潜行 +1',
    desc: '从队列里消失，比想象中容易。',
  },
  sample: {
    key: 'sample', name: '实验室样本', code: 'O-17', category: '学院',
    mod: { psi: 2, vit: -1 }, credits: 60, items: { stim: 2 },
    perk: { mental: 10 }, perkText: '精神上限 +10',
    desc: '编号比名字更早属于你。',
  },
  clone: {
    key: 'clone', name: '克隆劳工', code: 'O-18', category: '劳作',
    mod: { vit: 2, soc: -1 }, credits: 40, items: { ration: 2 },
    perk: { hp: 10 }, perkText: '生命上限 +10',
    desc: '同一批培养槽里，你是唯一睁眼的。',
  },
  fighter: {
    key: 'fighter', name: '黑市拳手', code: 'O-19', category: '地下',
    mod: { vit: 1, agi: 1 }, credits: 100, items: { ration: 1 },
    perk: { fear: 1 }, perkText: '威慑 +1',
    desc: '黑市拳台的规矩只有一条：别倒。',
  },
  cartographer: {
    key: 'cartographer', name: '星图测绘员', code: 'O-20', category: '学院',
    mod: { per: 1, tec: 1 }, credits: 150, items: { chip: 1, ore: 1 },
    perk: { tracking: 1 }, perkText: '追踪 +1',
    desc: '画过星区，也画过不存在的航线。',
  },
  cook: {
    key: 'cook', name: '厨房帮工', code: 'O-21', category: '劳作',
    mod: { soc: 1, luck: 1 }, credits: 90, items: { ration: 3 },
    perk: { barter: 0.1 }, perkText: '商店价格 -10%',
    desc: '能让最难缠的人坐下来吃饭。',
  },
  teacher: {
    key: 'teacher', name: '旧世教师', code: 'O-22', category: '学院',
    mod: { wil: 1, soc: 1 }, credits: 100, items: { chip: 1 },
    perk: { npcBias: 2 }, perkText: 'NPC 初始印象 +2',
    desc: '教过一群不会再长大的孩子。',
  },
  mortician: {
    key: 'mortician', name: '殡仪员', code: 'O-23', category: '信仰',
    mod: { wil: 1, psi: 1 }, credits: 80, items: { resin: 1 },
    perk: { mental: 10 }, perkText: '精神上限 +10',
    desc: '替死者合眼，也替他们保守秘密。',
  },
  intel: {
    key: 'intel', name: '情报贩子', code: 'O-24', category: '地下',
    mod: { soc: 1, per: 1 }, credits: 240, items: { chip: 2 },
    perk: { barter: 0.1 }, perkText: '商店价格 -10%',
    desc: '消息比信用点保值。',
  },
  ecologist: {
    key: 'ecologist', name: '生态修复员', code: 'O-25', category: '荒野',
    mod: { per: 1, tec: 1 }, credits: 110, items: { spore: 2, fiber: 1 },
    perk: { gather: 1 }, perkText: '采集 +1',
    desc: '试着让穹顶重新呼吸。',
  },
  nameless: {
    key: 'nameless', name: '无名漂流者', code: 'O-26', category: '荒野',
    mod: { luck: 1, agi: 1 }, credits: 30, items: { scrap: 1, ration: 1 },
    perk: { stealth: 1 }, perkText: '潜行 +1',
    desc: '没有档案，也没有欠谁的。',
  },
}
