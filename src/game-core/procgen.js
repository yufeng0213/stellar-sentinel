/**
 * 程序化星区：同一个 seed 必须生成同一张图。
 * 结构为 10 层、3 幕的分支节点图，玩家只能向前移动。
 */

import { BOSS_PROFILES, NODE_RISKS, REGIONS } from './data.js'
import { createRng } from './rng.js'

const TOTAL_LAYERS = 10
const ACT_OF_LAYER = [1, 1, 1, 1, 2, 2, 2, 3, 3, 3]

const TYPE_WEIGHTS = {
  1: [['gather', 0.42], ['battle', 0.18], ['event', 0.25], ['shop', 0.1], ['rest', 0.05]],
  2: [['gather', 0.27], ['battle', 0.23], ['event', 0.18], ['elite', 0.08], ['site', 0.09], ['shop', 0.07], ['rest', 0.08]],
  3: [['battle', 0.25], ['elite', 0.16], ['event', 0.2], ['gather', 0.15], ['site', 0.1], ['shop', 0.06], ['rest', 0.08]],
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
    const profile = rng.pick(BOSS_PROFILES)
    return {
      name: profile.name,
      hp: profile.hp + rng.int(0, 6),
      morale: profile.morale,
      attack: 6 + region.danger * 2 + rng.int(0, 2),
      weakness: profile.weakness,
      resistance: profile.resistance,
      bossId: profile.id,
      mechanic: profile.mechanic,
      phases: profile.phases.map((phase) => ({ ...phase })),
      phase: 0,
      traits: [...profile.traits],
    }
  }

  if (type === 'elite') {
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
  {
    id: 'mugging',
    title: '被盯上了',
    text: '三个人从废弃舱门后面走出来，没有亮武器，但站位已经把你围住了。“把身上的东西留下。”',
    choices: [
      {
        id: 'handover',
        label: '交钱走人',
        desc: '损失信用点，但不会受伤',
        outcome: { text: '你把能拿出来的信用点都给了他们。他们数了数，让开了路。', credits: -35, mental: -3 },
      },
      {
        id: 'resist',
        label: '硬闯',
        desc: '体魄判定，失败会挨打并丢更多钱',
        attr: 'vit',
        dc: 14,
        success: { text: '你撞开最前面的人，趁机跑出了包围。', mental: 3 },
        failure: { text: '你被按在地上，钱包和口袋都被翻空了。', hp: -8, credits: -25, mental: -4 },
      },
      {
        id: 'sprint',
        label: '转身就跑',
        desc: '感知判定，甩开他们',
        attr: 'per',
        dc: 13,
        success: { text: '你钻进侧面的检修通道，身后的脚步慢了下来。' },
        failure: { text: '你跑错了方向，被堵在死路里挨了一顿。', hp: -5, credits: -20 },
      },
    ],
  },
  {
    id: 'beating',
    title: '巷子里的拳头',
    text: '你只是多看了一眼，对面的人就动了手。没有警告，也没有理由。',
    choices: [
      {
        id: 'fight',
        label: '还手',
        desc: '体魄判定，赢了能抢回一点东西',
        attr: 'vit',
        dc: 14,
        success: { text: '你把他掀翻在地，捡起他掉下的信用点离开。', credits: 18, hp: -2 },
        failure: { text: '你被打到耳鸣，等能站起来时人已经走了。', hp: -9, mental: -6 },
      },
      {
        id: 'curl',
        label: '护住头',
        desc: '不还手，尽量减少伤害',
        outcome: { text: '你护住要害，挨到他们失去兴趣。', hp: -4, mental: -8 },
      },
    ],
  },
  {
    id: 'checkpoint',
    title: '临时关卡',
    text: '两个带枪的人把货箱横在通道中间。“过路费。现在。”',
    choices: [
      {
        id: 'pay',
        label: '交过路费',
        desc: '损失信用点，直接通过',
        outcome: { text: '你交了钱。他们搬开一只箱子，刚好够你侧身过去。', credits: -25 },
      },
      {
        id: 'bluff',
        label: '报一个名字',
        desc: '交际判定，赌他们不认识',
        attr: 'soc',
        dc: 14,
        success: { text: '他们对视了一眼，决定不惹麻烦。', mental: 2 },
        failure: { text: '他们认识那个名字，也知道你不是。你被搜走了钱。', hp: -5, credits: -20 },
      },
      {
        id: 'back',
        label: '退回岔路',
        desc: '绕远，消耗一点精神',
        outcome: { text: '你沿着来时的路退回去，多花了些时间。', mental: -3 },
      },
    ],
  },
  {
    id: 'pipeburst',
    title: '冷却管爆裂',
    text: '头顶的管道先发出尖啸，然后整段炸开。白色的冷雾瞬间吞没了通道。',
    choices: [
      {
        id: 'dash',
        label: '冲过去',
        desc: '体魄判定，抢在管道继续破裂前通过',
        attr: 'vit',
        dc: 13,
        success: { text: '你从冷雾里冲出来，衣服结了一层霜。', hp: -3 },
        failure: { text: '一块管壁砸在你肩上，你差点跪下去。', hp: -10, mental: -3 },
      },
      {
        id: 'patch',
        label: '先关阀门',
        desc: '技艺判定，修好管道还能拆点材料',
        attr: 'tec',
        dc: 14,
        skill: 'mechanics',
        success: { text: '你关掉阀门，拆下几块还能用的金属。', itemKey: true, itemCount: 2 },
        failure: { text: '阀门卡死，你被喷出的冷雾冻伤了手。', hp: -6, mental: -3 },
      },
    ],
  },
  {
    id: 'olddebt',
    title: '旧账',
    text: '一个陌生人在你经过时叫出了你的名字。“你欠的那笔，今天该清了吧。”',
    choices: [
      {
        id: 'pay',
        label: '把钱还了',
        desc: '损失信用点，事情到此为止',
        outcome: { text: '你把钱数给他。他收好，没有再多说一句。', credits: -30 },
      },
      {
        id: 'argue',
        label: '说清楚',
        desc: '交际判定，也许这根本不是你的账',
        attr: 'soc',
        dc: 15,
        success: { text: '他翻了翻记录，发现真的找错了人。', mental: 4 },
        failure: { text: '他不想听解释，只把金额又加了一笔。', credits: -20, mental: -8 },
      },
      {
        id: 'vanish',
        label: '混进人群',
        desc: '感知判定，甩掉他',
        attr: 'per',
        dc: 13,
        success: { text: '你在拐角换了一件外套，他没有再跟上来。' },
        failure: { text: '他一直跟到你的落脚点，记住了你的门。', mental: -7, flag: 'marked' },
      },
    ],
  },
  {
    id: 'nightterror',
    title: '图景里的手',
    text: '你只是闭了一下眼，再睁开时通道变了。墙上有东西在缓慢地呼吸。',
    choices: [
      {
        id: 'endure',
        label: '稳住图景',
        desc: '意志判定，压住这次侵蚀',
        attr: 'wil',
        dc: 14,
        success: { text: '你把自己的呼吸压回正常的节奏，墙上的东西退了下去。', mental: 6 },
        failure: { text: '那只手碰到了你的意识，你听见自己不认识的声音。', mental: -12 },
      },
      {
        id: 'wake',
        label: '强行醒来',
        desc: '立刻脱离，但会留下余震',
        outcome: { text: '你咬破舌尖，逼自己回到现实。耳鸣持续了很久。', mental: -5, hp: -2 },
      },
    ],
  },
  {
    id: 'omega_pressure',
    title: '信息素路障',
    text: '一个 Alpha 把手臂横在通道中间，低头打量你。“Omega 一个人跑到这种地方？”他身后的两个人没有走开。',
    requires: { abo: 'omega' },
    choices: [
      {
        id: 'lower',
        label: '低下头',
        desc: '不反抗，尽快离开',
        outcome: { text: '你压低视线从墙边挤过去，背后传来笑声。', mental: -9, credits: -10 },
      },
      {
        id: 'stand',
        label: '顶回去',
        desc: '意志判定，失败会被压制',
        attr: 'wil',
        dc: 15,
        success: { text: '你没有移开视线。他先觉得没趣，让开了。', mental: 5 },
        failure: { text: '信息素压下来，你的膝盖发软。他们看着你笑。', hp: -5, mental: -12 },
      },
      {
        id: 'slip',
        label: '找空隙走',
        desc: '感知判定，绕开他们',
        attr: 'per',
        dc: 13,
        success: { text: '你从货箱和墙之间挤过去，没有回头。' },
        failure: { text: '你被拽住了背包，挣脱时摔在金属地上。', hp: -4, mental: -6 },
      },
    ],
  },
  {
    id: 'omega_market',
    title: '被认出来了',
    text: '摊主看了看你的颈环，把价格牌翻了一面。“Omega 的话，得加钱。”',
    requires: { abo: 'omega' },
    choices: [
      {
        id: 'buy',
        label: '认下这个价',
        desc: '损失信用点，拿到补给',
        outcome: { text: '你付了高价，拿走了东西。摊主笑得很客气。', credits: -25, itemKey: true, itemCount: 1 },
      },
      {
        id: 'barter',
        label: '谈价',
        desc: '交际判定，争取正常价格',
        attr: 'soc',
        dc: 14,
        success: { text: '你把话题绕回货本身，他最后按原价卖了。', credits: -8, itemKey: true, itemCount: 1 },
        failure: { text: '他叫来旁边的人一起看你的笑话。你空手离开。', mental: -7 },
      },
      {
        id: 'leave',
        label: '不买了',
        desc: '不给他这个机会',
        outcome: { text: '你转身离开。他在背后说了句什么，你没有听清。', mental: -2 },
      },
    ],
  },
  {
    id: 'guide_demand',
    title: '临时疏导',
    text: '两名哨兵拦住你，说感官过载得厉害，要求你进图景帮他们压下去。他们的手已经按在武器上。',
    requires: { role: 'guide' },
    choices: [
      {
        id: 'soothe',
        label: '进图景疏导',
        desc: '损耗精神，换他们放行',
        outcome: { text: '你走进他们的图景，把过载的感官一层层压回去。出来时手指在抖。', mental: -12, credits: 20 },
      },
      {
        id: 'refuse',
        label: '拒绝',
        desc: '意志判定，顶住压力',
        attr: 'wil',
        dc: 15,
        success: { text: '你明确说不。他们对视了一眼，最终还是让开了。', mental: -2 },
        failure: { text: '他们把你按在墙边，逼你做完才放手。', hp: -4, mental: -10 },
      },
      {
        id: 'negotiate',
        label: '谈条件',
        desc: '交际判定，只做最低限度的疏导',
        attr: 'soc',
        dc: 14,
        success: { text: '你只做了最浅的一层，收了一点费用。他们没察觉。', credits: 25, mental: -4 },
        failure: { text: '他们看穿了你，逼你继续。结束时你几乎站不稳。', mental: -9 },
      },
    ],
  },
  {
    id: 'alpha_challenge',
    title: '另一个 Alpha',
    text: '对方没有让路，只是抬起下巴。“你觉得自己能过去？”',
    requires: { abo: 'alpha' },
    choices: [
      {
        id: 'stare',
        label: '压回去',
        desc: '意志判定，谁先移开视线',
        attr: 'wil',
        dc: 14,
        success: { text: '他先移开了视线，侧身让出半步。', mental: 4 },
        failure: { text: '你先眨眼了。他笑着拍了拍你的肩，力道不轻。', mental: -8, hp: -2 },
      },
      {
        id: 'trade',
        label: '谈一笔',
        desc: '交际判定，把对峙变成交易',
        attr: 'soc',
        dc: 14,
        success: { text: '你们各退一步，他甚至还卖了你一点东西。', credits: -10, itemKey: true, itemCount: 1 },
        failure: { text: '他觉得你在示弱，叫手下把你赶了出去。', mental: -6 },
      },
      {
        id: 'walk',
        label: '绕开',
        desc: '不接这个挑战',
        outcome: { text: '你从旁边走过去。他没有拦你，但一直看着。', mental: -2 },
      },
    ],
  },
]

function makeEvent(rng, region, profile = null) {
  const pool = EVENT_TEMPLATES.flatMap((template) => {
    const requires = template.requires || {}
    if (requires.abo && requires.abo !== profile?.abo) return []
    if (requires.role && requires.role !== profile?.role) return []
    // 身份相关事件对匹配角色出现得更多一些，但不独占事件池。
    return template.requires ? [template, template] : [template]
  })
  const template = rng.pick(pool)
  const choices = template.choices.map((choice) => {
    const copy = { ...choice }
    if (copy.success) {
      copy.success = { ...copy.success }
      if (copy.success.itemKey === true) copy.success.itemKey = rng.pick(region.items)
    }
    if (copy.failure) copy.failure = { ...copy.failure }
    if (copy.outcome) {
      copy.outcome = { ...copy.outcome }
      if (copy.outcome.itemKey === true) copy.outcome.itemKey = rng.pick(region.items)
    }
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

function makeNode(rng, layer, slot, type, profile = null) {
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
    if (type === 'boss') node.title = node.enemy.name
    if (type !== 'boss' && rng.chance(0.32)) {
      node.risk = { ...rng.pick(Object.values(NODE_RISKS)) }
    }
    node.subtitle = `${region.name} · ${type === 'boss' ? '区域首领' : type === 'elite' ? '高危目标' : '敌对信号'}${node.risk ? ' · 高危' : ''}`
  } else if (type === 'shop') {
    node.stock = makeStock(rng, region)
    node.subtitle = `${region.name} · 交易`
  } else if (type === 'rest') {
    node.heal = 24 + region.danger * 4
    node.mental = 18 + region.danger * 3
    node.subtitle = `${region.name} · 休整点`
  } else if (type === 'site') {
    const profiles = [
      { name: '半埋的观测站', attr: 'tec', dc: 11, loot: 'chip' },
      { name: '塌陷的矿道', attr: 'vit', dc: 11, loot: 'ore' },
      { name: '无编号的档案库', attr: 'per', dc: 12, loot: 'chip' },
      { name: '静默的回声井', attr: 'psi', dc: 12, loot: 'shard' },
    ]
    const profile = rng.pick(profiles)
    node.title = profile.name
    node.site = {
      ...profile,
      maxDepth: 3,
      coreLoot: region.danger >= 3 ? 'relic' : 'chip',
      encounter: rng.pick(['guardian', 'trap', 'survivor']),
    }
    node.attr = profile.attr
    node.dc = profile.dc
    node.subtitle = `${region.name} · 可深入探索`
  } else if (type === 'city') {
    node.cityId = 'outpost'
    node.cityName = '矿脉站'
    node.title = '矿脉站'
    node.populationTarget = 14
    node.subtitle = `${region.name} · 边境聚落`
  } else {
    node.subtitle = `${region.name} · 异常`
    node.event = makeEvent(rng, region, profile)
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

export function generateRunMap(seed, profile = null) {
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
      else if (layer === 4 && slot === 0) type = 'city'
      else type = weightedPick(rng, TYPE_WEIGHTS[ACT_OF_LAYER[layer]])

      const node = makeNode(rng, layer, slot, type, profile)
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
