/**
 * NPC 标签库：出身、性格、信念、职业、怪癖、关系、身体、阴影。
 * 标签只做结构化规则；LLM 只拿标签写背景与对白，不参与数值。
 */

import { ORIGINS } from './data.js'

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

const tag = (id, name, category, rarity, desc, options = {}) => ({
  id,
  name,
  category,
  rarity,
  desc,
  effects: options.effects || {},
  interests: options.interests || [],
  likes: options.likes || [],
  dislikes: options.dislikes || [],
  conflicts: options.conflicts || [],
  excludes: options.excludes || [],
  prompt: options.prompt || desc,
  hidden: options.hidden || false,
})

export const TAG_CATEGORIES = {
  background: { label: '出身', color: 'cyan' },
  personality: { label: '性格', color: 'amber' },
  values: { label: '信念', color: 'violet' },
  profession: { label: '职业', color: 'jade' },
  quirk: { label: '怪癖', color: 'muted' },
  social: { label: '关系', color: 'red' },
  body: { label: '身体', color: 'cyan' },
  shadow: { label: '阴影', color: 'red' },
}

export const TAG_GROUPS = {
  order: ['orderly', 'traditionalist', 'punctual', 'neat'],
  chaos: ['chaotic', 'impulsive', 'gambler', 'sloppy'],
  warm: ['protective', 'optimistic', 'loyal', 'romantic', 'protectivefriend'],
  cold: ['aloof', 'cynical', 'schemer', 'stoic'],
  brave: ['brave', 'hotblooded', 'soldier', 'fighter'],
  timid: ['cowardly', 'suspicious', 'shy'],
  social: ['gossip', 'flirt', 'matchmaker', 'dramatic'],
  solitary: ['aloof', 'solo', 'commitmentphobe'],
  mind: ['sensitivepsionics', 'researcher', 'scholar', 'curious'],
  body: ['fighter', 'soldier', 'hunter', 'brave', 'guard'],
}

export const TAGS = [
  /* ===== 出身 18 ===== */
  tag('shipborn', '舰船孤儿', 'background', 1, '在停摆的殖民舰上长大，熟悉每一道舱门。', {
    interests: ['星图', '机械'], effects: { combat: { hp: 2 }, eventWeight: { quest: 1.2 } }, prompt: '把舰船当成家，对陌生港口没有归属感。',
  }),
  tag('minerborn', '矿难遗孤', 'background', 1, '矿脉塌方后一个人爬了出来。', {
    interests: ['机械', '星图'], effects: { combat: { hp: 4 }, personality: { loyalty: 8 } }, prompt: '不怕黑，但不喜欢太安静的地方。',
  }),
  tag('deserter', '逃兵', 'background', 2, '从某支不再存在的部队里跑了出来。', {
    interests: ['武器', '传闻'], effects: { personality: { aggression: 8, grudge: 10 }, eventWeight: { conflict: 1.3 } }, likes: ['brave'], dislikes: ['towerloyal'], prompt: '对命令和徽章都没有好感。',
  }),
  tag('toweracolyte', '旧塔学徒', 'background', 2, '在旧塔的档案堆里长大，知道很多不该知道的名字。', {
    interests: ['旧技术', '遗物'], effects: { personality: { curiosity: 10 }, relation: { respect: 3 } }, prompt: '习惯先查记录，再相信人。',
  }),
  tag('blackmarket', '黑市养大', 'background', 1, '从小在货舱夹层里替人跑腿。', {
    interests: ['交易', '传闻'], effects: { personality: { curiosity: 6 }, relation: { fear: 2 } }, likes: ['pragmatist'], dislikes: ['orderly'], prompt: '对价格很敏感，对承诺不太当真。',
  }),
  tag('caravankid', '商队之子', 'background', 1, '跟着商队走过很多临时定居点。', {
    interests: ['交易', '星图'], effects: { personality: { generosity: 8 } }, likes: ['easygoing'], prompt: '习惯在路上，也习惯跟陌生人打交道。',
  }),
  tag('refugee', '流亡者', 'background', 2, '家乡在星图上被划掉了。', {
    interests: ['植物', '传闻'], effects: { relation: { trust: -4 }, personality: { grudge: 8 } }, likes: ['protective'], dislikes: ['vain'], prompt: '很少主动提起以前的事。',
  }),
  tag('labsubject', '实验室样本', 'background', 3, '编号比名字更早存在。', {
    interests: ['共鸣', '旧技术'], effects: { combat: { morale: 4 }, personality: { curiosity: 10 } }, prompt: '对身体里的东西保持警惕。',
  }),
  tag('clone', '克隆劳工', 'background', 2, '从同一批培养槽里醒来，活下来的只有几个。', {
    interests: ['机械', '植物'], effects: { combat: { hp: 3 }, personality: { loyalty: 6 } }, likes: ['collectivist'], dislikes: ['individualist'], prompt: '对“独一无二”这件事没有太多执念。',
  }),
  tag('drifter', '漂流者', 'background', 1, '没有固定住所，也没有固定名字。', {
    interests: ['星图', '传闻'], effects: { personality: { curiosity: 8 }, relation: { closeness: -2 } }, likes: ['solo'], dislikes: ['controlling'], prompt: '不喜欢被问“你从哪来”。',
  }),
  tag('preacher', '传教士', 'background', 2, '替某个没有正式名字的信仰传话。', {
    interests: ['冥想', '遗物'], effects: { personality: { loyalty: 8 }, relation: { respect: 4 } }, likes: ['idealist'], dislikes: ['hedonist'], prompt: '说话带比喻，但不强求别人信。',
  }),
  tag('soldier', '士兵', 'background', 1, '在旧战场的泥里待过足够久。', {
    interests: ['武器', '星图'], effects: { personality: { aggression: 10, loyalty: 8 }, combat: { hp: 3 } }, likes: ['brave'], dislikes: ['cowardly'], prompt: '对声音和动静很敏感。',
  }),
  tag('smuggler', '走私客', 'background', 1, '知道哪条航线没有登记。', {
    interests: ['交易', '武器'], effects: { personality: { curiosity: 6 }, eventWeight: { quest: 1.3 } }, likes: ['chaotic'], dislikes: ['guard'], prompt: '习惯把风险说成机会。',
  }),
  tag('scholar', '学者', 'background', 1, '相信记录比记忆可靠。', {
    interests: ['旧技术', '传闻'], effects: { personality: { curiosity: 12 }, relation: { respect: 3 } }, likes: ['group:mind'], dislikes: ['impulsive'], prompt: '说话精确，偶尔显得冷淡。',
  }),
  tag('hunter', '猎人', 'background', 1, '靠追踪和耐心吃饭。', {
    interests: ['植物', '星图'], effects: { personality: { loyalty: 8, aggression: 6 }, combat: { attack: 2 } }, likes: ['patient'], dislikes: ['sloppy'], prompt: '更相信脚印和痕迹，不相信解释。',
  }),
  tag('medic', '医师', 'background', 1, '在缺药的地方学会了怎么让人活下来。', {
    interests: ['冥想', '植物'], effects: { personality: { generosity: 12 } }, likes: ['protective'], dislikes: ['vengeful'], prompt: '会先看伤口，再看脸。',
  }),
  tag('engineer', '工程师', 'background', 1, '相信任何东西都能修，包括人。', {
    interests: ['机械', '旧技术'], effects: { personality: { curiosity: 8 }, combat: { hp: 2 } }, likes: ['mechanic'], dislikes: ['sloppy'], prompt: '碰到坏掉的东西会手痒。',
  }),
  tag('orphan', '无名孤儿', 'background', 1, '登记表上没有父母，也没有出生地。', {
    interests: ['传闻', '机械'], effects: { relation: { trust: -3 }, personality: { grudge: 5 } }, likes: ['loyal'], dislikes: ['vain'], prompt: '对“家”这个词反应很慢。',
  }),

  /* ===== 性格 26 ===== */
  tag('hotblooded', '热血', 'personality', 1, '遇事容易上头，但会为朋友出头。', {
    effects: { personality: { aggression: 18, loyalty: 12 }, relation: { closeness: 3 }, eventWeight: { conflict: 1.4, quest: 1.2 } },
    likes: ['group:brave', 'group:warm'], dislikes: ['group:cold', 'group:timid'], conflicts: ['cowardly'], prompt: '说话直，先动手后动脑。',
  }),
  tag('calm', '冷静', 'personality', 1, '越危险的时候越安静。', {
    effects: { personality: { aggression: -15, curiosity: 4 }, combat: { morale: 3 } },
    likes: ['group:order', 'group:mind'], dislikes: ['group:chaos', 'hotblooded'], conflicts: ['impulsive'], prompt: '语速慢，很少提高音量。',
  }),
  tag('suspicious', '多疑', 'personality', 1, '先假设所有人都在骗他。', {
    effects: { personality: { loyalty: -6, grudge: 8 }, relation: { trust: -4 } },
    likes: ['patient', 'orderly'], dislikes: ['gossip', 'dramatic'], conflicts: ['loveatfirstsight'], prompt: '回答前会停顿，像是在算代价。',
  }),
  tag('romantic', '浪漫', 'personality', 2, '相信有些事比活着重要。', {
    effects: { personality: { generosity: 8 }, eventWeight: { romance: 2, gift: 1.3 } },
    likes: ['group:warm', 'artist'], dislikes: ['pragmatist', 'stoic'], conflicts: ['commitmentphobe'], prompt: '会把普通的事说得很轻。',
  }),
  tag('orderly', '守序', 'personality', 1, '需要规则，也需要别人遵守。', {
    effects: { personality: { loyalty: 8 }, relation: { respect: 3 } },
    likes: ['group:order', 'guard'], dislikes: ['group:chaos', 'thief'], conflicts: ['anarchist'], prompt: '说话有条理，讨厌临时改计划。',
  }),
  tag('chaotic', '混乱', 'personality', 1, '计划是给没有想象力的人准备的。', {
    effects: { personality: { curiosity: 10, loyalty: -6 }, eventWeight: { quest: 1.2, conflict: 1.2 } },
    likes: ['group:chaos', 'artist'], dislikes: ['group:order', 'guard'], conflicts: ['orderly'], prompt: '话题跳得快，喜欢突然改变主意。',
  }),
  tag('neat', '洁癖', 'personality', 1, '受不了灰尘和没摆正的东西。', {
    effects: { personality: { loyalty: 4 }, relation: { respect: 2 } },
    likes: ['orderly', 'punctual'], dislikes: ['sloppy'], conflicts: ['sloppy'], prompt: '会下意识擦掉桌上的灰。',
  }),
  tag('sloppy', '邋遢', 'personality', 1, '东西放得乱，但自己找得到。', {
    effects: { personality: { curiosity: 4, loyalty: -3 } },
    likes: ['chaotic', 'easygoing'], dislikes: ['neat'], conflicts: ['neat'], prompt: '袖口总是脏的，不太在意。',
  }),
  tag('protective', '护短', 'personality', 1, '自己人做错了也先护着。', {
    effects: { personality: { loyalty: 16, generosity: 8 }, eventWeight: { gift: 1.4, favor: 1.3 } },
    likes: ['group:warm', 'guard'], dislikes: ['group:cold', 'wanted'], conflicts: ['betrayed'], prompt: '提到自己人时语气会变软。',
  }),
  tag('vengeful', '记仇', 'personality', 2, '账记得很清楚，什么时候还另说。', {
    effects: { personality: { grudge: 25, loyalty: -4 }, eventWeight: { conflict: 1.6 } },
    likes: ['patient', 'soldier'], dislikes: ['honest', 'easygoing'], conflicts: ['easygoing'], prompt: '会突然提起很久以前的一件小事。',
  }),
  tag('optimistic', '乐观', 'personality', 1, '总觉得下一站会好一点。', {
    effects: { personality: { generosity: 8, grudge: -8 } },
    likes: ['group:warm', 'artist'], dislikes: ['cynical', 'stoic'], conflicts: ['cynical'], prompt: '喜欢用“至少”开头。',
  }),
  tag('cynical', '厌世', 'personality', 1, '不觉得事情会变好，但也不急着死。', {
    effects: { personality: { grudge: 10, generosity: -8 } },
    likes: ['pragmatist', 'stoic'], dislikes: ['optimistic', 'romantic'], conflicts: ['optimistic'], prompt: '回答短，常带一点讽刺。',
  }),
  tag('vain', '虚荣', 'personality', 1, '在意别人怎么看他。', {
    effects: { personality: { loyalty: -4, generosity: 4 }, relation: { respect: 2 } },
    likes: ['artist', 'flirt'], dislikes: ['sloppy', 'humble'], conflicts: ['humble'], prompt: '会不经意地展示自己的东西。',
  }),
  tag('humble', '谦卑', 'personality', 1, '不太愿意谈自己做过什么。', {
    effects: { personality: { generosity: 6 }, relation: { respect: -2 } },
    likes: ['ascetic', 'patient'], dislikes: ['vain', 'dramatic'], conflicts: ['vain'], prompt: '被夸时会移开视线。',
  }),
  tag('controlling', '控制狂', 'personality', 2, '希望每一步都在自己安排里。', {
    effects: { personality: { loyalty: -4, grudge: 6 } },
    likes: ['group:order', 'guard'], dislikes: ['easygoing', 'chaotic'], conflicts: ['anarchist'], prompt: '会追问细节，讨厌“随便”。',
  }),
  tag('easygoing', '随性', 'personality', 1, '大多数事都行，少数事很固执。', {
    effects: { personality: { generosity: 6, grudge: -6 } },
    likes: ['group:chaos', 'sloppy'], dislikes: ['controlling', 'orderly'], conflicts: ['controlling'], prompt: '常用“都行”“看情况”。',
  }),
  tag('brave', '勇敢', 'personality', 1, '不是不怕，是怕了也往前走。', {
    effects: { personality: { aggression: 12, loyalty: 8 }, combat: { morale: 2 } },
    likes: ['group:brave', 'soldier'], dislikes: ['group:timid', 'suspicious'], conflicts: ['cowardly'], prompt: '遇到危险时会先站起来。',
  }),
  tag('cowardly', '怯懦', 'personality', 1, '知道什么时候该跑。', {
    effects: { personality: { aggression: -18, loyalty: -4 }, relation: { fear: 4 } },
    likes: ['patient', 'suspicious'], dislikes: ['group:brave', 'hotblooded'], conflicts: ['brave'], prompt: '说话时会先看出口。',
  }),
  tag('honest', '坦诚', 'personality', 1, '不太会撒谎，也不太会圆场。', {
    effects: { personality: { loyalty: 10 }, relation: { trust: 4 } },
    likes: ['orderly', 'humble'], dislikes: ['schemer', 'gossip'], conflicts: ['schemer'], prompt: '回答很直接，有时让人难堪。',
  }),
  tag('schemer', '算计', 'personality', 2, '每句话都留了后手。', {
    effects: { personality: { curiosity: 8, loyalty: -8 }, eventWeight: { favor: 1.2, conflict: 1.2 } },
    likes: ['pragmatist', 'suspicious'], dislikes: ['honest', 'protective'], conflicts: ['honest'], prompt: '喜欢反问，不先给答案。',
  }),
  tag('patient', '耐心', 'personality', 1, '愿意等，也愿意让别人等。', {
    effects: { personality: { aggression: -8, loyalty: 6 }, combat: { morale: 2 } },
    likes: ['calm', 'stoic'], dislikes: ['impulsive'], conflicts: ['impulsive'], prompt: '说话慢，句子之间有空隙。',
  }),
  tag('impulsive', '冲动', 'personality', 1, '先做了再想。', {
    effects: { personality: { aggression: 10, grudge: -4 }, eventWeight: { quest: 1.3, conflict: 1.2 } },
    likes: ['group:chaos', 'hotblooded'], dislikes: ['patient', 'orderly'], conflicts: ['patient'], prompt: '句子短，动作快。',
  }),
  tag('stoic', '沉默寡言', 'personality', 1, '不太表达，也不太好猜。', {
    effects: { personality: { curiosity: -4, loyalty: 6 }, relation: { closeness: -3 } },
    likes: ['calm', 'soldier'], dislikes: ['dramatic', 'flirt'], conflicts: ['dramatic'], prompt: '只用最少的词回答。',
  }),
  tag('dramatic', '戏剧化', 'personality', 2, '生活需要一点夸张。', {
    effects: { personality: { curiosity: 6, generosity: 4 }, eventWeight: { message: 1.3, romance: 1.3 } },
    likes: ['artist', 'flirt'], dislikes: ['stoic', 'humble'], conflicts: ['stoic'], prompt: '说话有停顿，有重音。',
  }),
  tag('curious', '好奇', 'personality', 1, '想知道门后面是什么。', {
    effects: { personality: { curiosity: 16 }, eventWeight: { quest: 1.4, message: 1.1 } },
    likes: ['group:mind', 'scout'], dislikes: ['traditionalist', 'stoic'], prompt: '会追问“然后呢”。',
  }),
  tag('aloof', '疏离', 'personality', 1, '和别人保持一段距离。', {
    effects: { personality: { loyalty: -2 }, relation: { closeness: -5 }, eventWeight: { message: 0.6 } },
    likes: ['group:solitary', 'researcher'], dislikes: ['group:social', 'romantic'], conflicts: ['loveatfirstsight'], prompt: '不主动开启话题，回答偏短。',
  }),

  /* ===== 信念 14 ===== */
  tag('towerloyal', '白塔旧臣', 'values', 1, '还认白塔的秩序，哪怕白塔已经不在了。', {
    effects: { personality: { loyalty: 10 }, relation: { respect: 3 } }, likes: ['orderly', 'guard'], dislikes: ['anarchist', 'thief'],
  }),
  tag('marketloyal', '黑市的人', 'values', 1, '相信交易比誓言可靠。', {
    effects: { personality: { generosity: 6 }, eventWeight: { gift: 1.2 } }, likes: ['trader', 'smuggler'], dislikes: ['guard', 'towerloyal'],
  }),
  tag('drifterloyal', '漂流者', 'values', 1, '不站队，只帮路上遇到的人。', {
    effects: { personality: { loyalty: 4 } }, likes: ['solo', 'scout'], dislikes: ['controlling', 'towerloyal'],
  }),
  tag('whisperloyal', '低语者', 'values', 2, '听见了别人听不见的东西，并决定留下。', {
    effects: { personality: { curiosity: 8 }, combat: { morale: 3 } }, likes: ['sensitivepsionics', 'researcher'], dislikes: ['guard', 'cynical'],
  }),
  tag('mercenary', '雇佣兵', 'values', 1, '只对合同负责。', {
    effects: { personality: { loyalty: -6, generosity: -4 }, eventWeight: { quest: 1.3 } }, likes: ['fighter', 'pragmatist'], dislikes: ['idealist', 'towerloyal'],
  }),
  tag('idealist', '理想主义', 'values', 2, '相信有些事不该拿来交易。', {
    effects: { personality: { generosity: 10, grudge: 4 } }, likes: ['optimistic', 'preacher'], dislikes: ['cynical', 'mercenary'],
  }),
  tag('pragmatist', '实用主义', 'values', 1, '先看能不能用，再看对不对。', {
    effects: { personality: { curiosity: 6, generosity: -2 } }, likes: ['engineer', 'trader'], dislikes: ['idealist', 'dramatic'],
  }),
  tag('anarchist', '无政府主义', 'values', 2, '任何秩序最后都会变成锁。', {
    effects: { personality: { loyalty: -8, aggression: 6 } }, likes: ['chaotic', 'thief'], dislikes: ['orderly', 'towerloyal'], conflicts: ['orderly'],
  }),
  tag('collectivist', '集体主义', 'values', 1, '一个人活不下来，一群人可以。', {
    effects: { personality: { loyalty: 12, generosity: 6 } }, likes: ['protective', 'teacher'], dislikes: ['individualist', 'mercenary'], conflicts: ['individualist'],
  }),
  tag('individualist', '个人主义', 'values', 1, '先顾好自己，再谈别人。', {
    effects: { personality: { loyalty: -4, curiosity: 4 } }, likes: ['solo', 'mercenary'], dislikes: ['collectivist', 'controlling'], conflicts: ['collectivist'],
  }),
  tag('traditionalist', '守旧', 'values', 1, '旧办法能活到今天，就说明有用。', {
    effects: { personality: { curiosity: -6, loyalty: 6 } }, likes: ['orderly', 'priest'], dislikes: ['progressive', 'chaotic'],
  }),
  tag('progressive', '激进', 'values', 1, '旧东西该被换掉了。', {
    effects: { personality: { curiosity: 10, loyalty: -4 } }, likes: ['curious', 'hacker'], dislikes: ['traditionalist', 'stoic'],
  }),
  tag('hedonist', '享乐主义', 'values', 2, '明天不一定来，今天先过好。', {
    effects: { personality: { generosity: 8, grudge: -6 }, eventWeight: { gift: 1.3, romance: 1.2 } }, likes: ['gambler', 'artist'], dislikes: ['ascetic', 'stoic'],
  }),
  tag('ascetic', '苦修', 'values', 2, '把自己压到最低，才不会被欲望拖走。', {
    effects: { personality: { generosity: -4, loyalty: 8 }, combat: { morale: 3 } }, likes: ['humble', 'patient'], dislikes: ['hedonist', 'vain'],
  }),

  /* ===== 职业 20 ===== */
  tag('trader', '商人', 'profession', 1, '什么都卖，只要价格合适。', {
    interests: ['交易', '传闻'], effects: { personality: { generosity: 8 }, eventWeight: { gift: 1.2 } }, likes: ['marketloyal', 'pragmatist'], dislikes: ['guard', 'idealist'],
  }),
  tag('scout', '侦察兵', 'profession', 1, '先去前面看看，再决定要不要走。', {
    interests: ['星图', '植物'], effects: { personality: { curiosity: 8 }, combat: { attack: 1 } }, likes: ['curious', 'drifterloyal'], dislikes: ['controlling'],
  }),
  tag('physician', '医者', 'profession', 1, '手很稳，话不多。', {
    interests: ['冥想', '植物'], effects: { personality: { generosity: 12 }, eventWeight: { favor: 1.2 } }, likes: ['protective', 'humble'], dislikes: ['vengeful'],
  }),
  tag('mechanic', '机械师', 'profession', 1, '机器比人好懂。', {
    interests: ['机械', '旧技术'], effects: { personality: { curiosity: 6 }, combat: { hp: 2 } }, likes: ['engineer', 'patient'], dislikes: ['sloppy'],
  }),
  tag('fighter', '战士', 'profession', 1, '习惯用身体解决问题。', {
    interests: ['武器', '星图'], effects: { personality: { aggression: 12 }, combat: { attack: 2 } }, likes: ['group:brave'], dislikes: ['group:timid'],
  }),
  tag('pilot', '飞行员', 'profession', 1, '闭着眼也能听出引擎哪里不对。', {
    interests: ['星图', '机械'], effects: { personality: { curiosity: 6 }, eventWeight: { quest: 1.2 } }, likes: ['easygoing', 'scout'], dislikes: ['controlling'],
  }),
  tag('hacker', '黑客', 'profession', 2, '门锁只是另一种对话。', {
    interests: ['旧技术', '传闻'], effects: { personality: { curiosity: 12 } }, likes: ['progressive', 'curious'], dislikes: ['orderly', 'traditionalist'],
  }),
  tag('thief', '窃贼', 'profession', 2, '不拿不属于自己的东西，只拿没人看住的。', {
    interests: ['交易', '传闻'], effects: { personality: { curiosity: 8 }, eventWeight: { conflict: 1.2 } }, likes: ['chaotic', 'pragmatist'], dislikes: ['honest', 'guard'],
  }),
  tag('negotiator', '谈判家', 'profession', 1, '先让对方说，再决定自己说什么。', {
    interests: ['交易', '传闻'], effects: { personality: { generosity: 6 }, eventWeight: { message: 1.2 } }, likes: ['honest', 'patient'], dislikes: ['hotblooded'],
  }),
  tag('cook', '厨师', 'profession', 1, '能用最差的东西做出一顿热饭。', {
    interests: ['植物', '交易'], effects: { personality: { generosity: 12 }, eventWeight: { gift: 1.4 } }, likes: ['easygoing', 'neat'], dislikes: ['sloppy'],
  }),
  tag('artist', '艺术家', 'profession', 2, '把看见的东西换个方式留下来。', {
    interests: ['共鸣', '遗物'], effects: { personality: { curiosity: 10, generosity: 4 }, eventWeight: { romance: 1.3 } }, likes: ['dramatic', 'romantic'], dislikes: ['stoic', 'pragmatist'],
  }),
  tag('teacher', '教师', 'profession', 1, '习惯把复杂的事讲简单。', {
    interests: ['旧技术', '传闻'], effects: { personality: { loyalty: 14 } }, likes: ['patient', 'humble'], dislikes: ['impulsive'],
  }),
  tag('guard', '守卫', 'profession', 1, '站在门口，检查每一个进来的人。', {
    interests: ['武器', '星图'], effects: { personality: { loyalty: 10 }, combat: { hp: 3 } }, likes: ['orderly', 'towerloyal'], dislikes: ['thief', 'anarchist'],
  }),
  tag('tracker', '追踪者', 'profession', 1, '脚印、气味、风向，比人可靠。', {
    interests: ['星图', '植物'], effects: { personality: { loyalty: 8 }, combat: { attack: 1 } }, likes: ['patient', 'scout'], dislikes: ['sloppy'],
  }),
  tag('scavenger', '拾荒者', 'profession', 1, '别人不要的东西，往往还能用。', {
    interests: ['机械', '星图'], effects: { personality: { curiosity: 6, generosity: 4 } }, likes: ['easygoing', 'drifterloyal'], dislikes: ['vain'],
  }),
  tag('researcher', '研究员', 'profession', 2, '问题比答案有意思。', {
    interests: ['旧技术', '共鸣'], effects: { personality: { curiosity: 14 }, relation: { respect: 2 } }, likes: ['group:mind'], dislikes: ['impulsive'],
  }),
  tag('priest', '祭司', 'profession', 2, '替听不见的人说话。', {
    interests: ['遗物', '冥想'], effects: { personality: { loyalty: 8, generosity: 6 }, combat: { morale: 3 } }, likes: ['preacher', 'ascetic'], dislikes: ['hedonist', 'schemer'],
  }),
  tag('runner', '跑货人', 'profession', 1, '货在人在，货丢了人也别回来。', {
    interests: ['交易', '武器'], effects: { personality: { curiosity: 6 }, eventWeight: { quest: 1.2, gift: 1.2 } }, likes: ['smuggler', 'chaotic'], dislikes: ['guard'],
  }),
  tag('drillminer', '钻工', 'profession', 1, '听岩层的声音判断哪里会塌。', {
    interests: ['机械', '星图'], effects: { personality: { loyalty: 6 }, combat: { hp: 4 } }, likes: ['patient', 'drifterloyal'], dislikes: ['vain'],
  }),
  tag('farmer', '农人', 'profession', 1, '种东西的人，通常不急着走。', {
    interests: ['植物', '交易'], effects: { personality: { loyalty: 8, generosity: 8 } }, likes: ['patient', 'collectivist'], dislikes: ['chaotic'],
  }),

  /* ===== 怪癖 16 ===== */
  tag('keycollector', '收集旧钥匙', 'quirk', 1, '口袋里总有一把打不开任何门的钥匙。', {
    interests: ['遗物'], effects: { personality: { curiosity: 4 } }, likes: ['curious'], dislikes: ['sloppy'],
  }),
  tag('machinewhisperer', '给机器起名字', 'quirk', 1, '会认真跟设备说话。', {
    interests: ['机械'], effects: { personality: { curiosity: 6 } }, likes: ['mechanic'], dislikes: ['sloppy'],
  }),
  tag('afraidofsilence', '害怕安静', 'quirk', 2, '太安静的时候会开始自言自语。', {
    effects: { personality: { curiosity: 4, grudge: -4 }, eventWeight: { message: 1.3 } }, likes: ['gossip'], dislikes: ['aloof'],
  }),
  tag('nightowl', '夜行', 'quirk', 1, '白天没精神，晚上很清醒。', {
    effects: { personality: { curiosity: 6 }, combat: { attack: 1 } }, likes: ['curious'], dislikes: ['orderly'],
  }),
  tag('gambler', '赌徒', 'quirk', 2, '喜欢把选择交给概率。', {
    effects: { personality: { curiosity: 8, loyalty: -4 }, eventWeight: { conflict: 1.2, gift: 1.1 } }, likes: ['hedonist', 'chaotic'], dislikes: ['orderly'],
  }),
  tag('teaonly', '只喝热水', 'quirk', 1, '不喝任何带味道的东西。', {
    effects: { personality: { loyalty: 4 } }, likes: ['neat', 'patient'], dislikes: ['sloppy'],
  }),
  tag('planttalker', '和植物说话', 'quirk', 1, '相信植物能听懂。', {
    interests: ['植物'], effects: { personality: { generosity: 6 }, eventWeight: { gift: 1.2 } }, likes: ['farmer', 'patient'], dislikes: ['cynical'],
  }),
  tag('hoarder', '囤积癖', 'quirk', 2, '什么都不敢扔。', {
    effects: { personality: { loyalty: -4 }, eventWeight: { gift: 0.7 } }, likes: ['scavenger'], dislikes: ['neat'],
  }),
  tag('punctual', '守时', 'quirk', 1, '讨厌迟到，也讨厌别人迟到。', {
    effects: { personality: { loyalty: 6 }, relation: { respect: 2 } }, likes: ['group:order'], dislikes: ['sloppy'],
  }),
  tag('superstitious', '迷信', 'quirk', 1, '相信某些数字和方向不能碰。', {
    effects: { personality: { curiosity: 4 }, eventWeight: { message: 1.2 } }, likes: ['priest'], dislikes: ['hacker'],
  }),
  tag('sleepwalker', '梦游', 'quirk', 2, '睡着之后会去一些自己不认识的地方。', {
    effects: { personality: { curiosity: 6 } }, likes: ['nightowl'], dislikes: ['controlling'],
  }),
  tag('ritual', '仪式感', 'quirk', 1, '每天必须按同样的顺序做几件事。', {
    effects: { personality: { loyalty: 4 }, combat: { morale: 2 } }, likes: ['orderly', 'priest'], dislikes: ['chaotic'],
  }),
  tag('hummer', '哼歌', 'quirk', 1, '紧张的时候会哼一段没有名字的调子。', {
    effects: { personality: { generosity: 4 } }, likes: ['artist'], dislikes: ['stoic'],
  }),
  tag('mapmaker', '画地图', 'quirk', 1, '走到哪里都先画一张。', {
    interests: ['星图'], effects: { personality: { curiosity: 8 }, eventWeight: { quest: 1.3 } }, likes: ['scout', 'curious'], dislikes: ['sloppy'],
  }),
  tag('catperson', '猫派', 'quirk', 1, '对猫比对人耐心。', {
    effects: { relation: { closeness: 2 }, personality: { generosity: 4 } }, likes: ['easygoing'], dislikes: ['neat'],
  }),
  tag('oldphotos', '旧照片', 'quirk', 1, '随身带着一张看不清脸的照片。', {
    effects: { personality: { loyalty: 6, grudge: 4 } }, likes: ['romantic', 'lostfamily'], dislikes: ['cynical'],
  }),

  /* ===== 关系 12 ===== */
  tag('slowburn', '慢热', 'social', 1, '不会很快把人当自己人。', {
    effects: { relation: { trust: -4, closeness: -3 }, eventWeight: { romance: 0.4 } }, likes: ['patient', 'suspicious'], dislikes: ['loveatfirstsight'],
  }),
  tag('loveatfirstsight', '一见钟情', 'social', 2, '很容易在第一次见面时动心。', {
    effects: { relation: { closeness: 8 }, eventWeight: { romance: 2 } }, likes: ['romantic', 'artist'], dislikes: ['slowburn'], conflicts: ['aloof'],
  }),
  tag('jealous', '容易吃醋', 'social', 1, '看到你对别人好会不舒服。', {
    effects: { relation: { closeness: 2 }, eventWeight: { message: 1.2 } }, likes: ['loyal'], dislikes: ['flirt', 'gossip'], conflicts: ['flirt'],
  }),
  tag('loyal', '忠诚', 'social', 1, '认定的人会一直站在这边。', {
    effects: { personality: { loyalty: 14 }, relation: { trust: 5 }, eventWeight: { favor: 1.3 } }, likes: ['protective', 'honest'], dislikes: ['schemer'],
  }),
  tag('solo', '独行', 'social', 1, '不习惯跟别人一起行动。', {
    effects: { relation: { closeness: -4 }, eventWeight: { quest: 0.7 } }, likes: ['group:solitary'], dislikes: ['group:social'],
  }),
  tag('attractedtostrength', '慕强', 'social', 1, '对强者有天然的耐心。', {
    effects: { relation: { respect: 6 }, eventWeight: { romance: 1.2 } }, likes: ['fighter', 'brave'], dislikes: ['cowardly'],
  }),
  tag('flirt', '轻浮', 'social', 2, '喜欢试探边界，不太负责。', {
    effects: { relation: { closeness: 4 }, eventWeight: { romance: 1.6, message: 1.2 } }, likes: ['dramatic', 'artist'], dislikes: ['stoic', 'jealous'], conflicts: ['jealous'],
  }),
  tag('shy', '害羞', 'social', 1, '想靠近，但不太敢先开口。', {
    effects: { relation: { closeness: -2 }, eventWeight: { message: 0.7, romance: 0.8 } }, likes: ['patient', 'humble'], dislikes: ['dramatic', 'flirt'],
  }),
  tag('matchmaker', '爱撮合', 'social', 1, '喜欢看别人在一起。', {
    effects: { personality: { generosity: 6 }, eventWeight: { gossip: 1.5, romance: 1.3 } }, likes: ['romantic', 'gossip'], dislikes: ['solo'],
  }),
  tag('gossip', '爱传话', 'social', 1, '知道很多不该知道的事。', {
    effects: { personality: { curiosity: 6 }, eventWeight: { gossip: 1.8, message: 1.2 } }, likes: ['group:social', 'trader'], dislikes: ['aloof', 'stoic'], conflicts: ['aloof'],
  }),
  tag('protectivefriend', '护朋友', 'social', 1, '朋友被欺负时比本人还生气。', {
    effects: { personality: { loyalty: 10, aggression: 4 }, eventWeight: { favor: 1.4, conflict: 1.2 } }, likes: ['loyal', 'protective'], dislikes: ['schemer'],
  }),
  tag('commitmentphobe', '恐承诺', 'social', 2, '一谈到长期关系就想跑。', {
    effects: { relation: { closeness: -2 }, eventWeight: { romance: 0.3 } }, likes: ['solo', 'easygoing'], dislikes: ['romantic', 'loveatfirstsight'], conflicts: ['romantic'],
  }),

  /* ===== 身体 10 ===== */
  tag('sharpnose', '嗅觉敏锐', 'body', 1, '能闻出很多别人闻不到的东西。', {
    interests: ['植物'], effects: { personality: { curiosity: 4 }, combat: { attack: 1 } }, likes: ['tracker'], dislikes: ['neat'],
  }),
  tag('weaklungs', '肺不好', 'body', 2, '跑不了太久，但更懂得节省体力。', {
    effects: { combat: { hp: -3 }, personality: { loyalty: 6 } }, likes: ['patient'], dislikes: ['hotblooded'],
  }),
  tag('cybereye', '义眼', 'body', 1, '一只眼睛看到的东西比另一只多一点。', {
    interests: ['旧技术'], effects: { personality: { curiosity: 4 }, combat: { attack: 1 } }, likes: ['mechanic'], dislikes: ['superstitious'],
  }),
  tag('prosthetic', '义肢', 'body', 1, '旧伤换来的金属肢体。', {
    effects: { combat: { hp: 2, attack: 1 } }, likes: ['engineer'], dislikes: ['vain'],
  }),
  tag('tall', '高个', 'body', 1, '在人群里很显眼。', {
    effects: { combat: { hp: 2, attack: 1 } }, likes: ['fighter'], dislikes: ['small'],
  }),
  tag('small', '瘦小', 'body', 1, '不容易被注意到。', {
    effects: { combat: { hp: -2 }, personality: { curiosity: 4 } }, likes: ['thief'], dislikes: ['tall'],
  }),
  tag('scarred', '疤痕', 'body', 1, '脸上的疤比自我介绍更早到。', {
    effects: { personality: { grudge: 5 }, relation: { fear: 2 } }, likes: ['soldier'], dislikes: ['vain'],
  }),
  tag('insomnia', '失眠', 'body', 1, '夜里醒着的时间比睡着长。', {
    effects: { personality: { grudge: 4, curiosity: 4 }, combat: { morale: -2 } }, likes: ['nightowl'], dislikes: ['calm'],
  }),
  tag('sensitivepsionics', '灵敏感知', 'body', 2, '能感觉到别人情绪里的波纹。', {
    interests: ['共鸣'], effects: { combat: { morale: 4 }, personality: { curiosity: 6 } }, likes: ['group:mind'], dislikes: ['stoic'],
  }),
  tag('immuneboost', '强化免疫', 'body', 1, '在孢子林里活得比多数人久。', {
    effects: { combat: { hp: 3 }, personality: { loyalty: 4 } }, likes: ['physician'], dislikes: ['sloppy'],
  }),

  /* ===== 阴影 10 ===== */
  tag('betrayed', '被背叛过', 'shadow', 2, '对“自己人”这个词有阴影。', {
    effects: { relation: { trust: -8, closeness: -4 }, personality: { grudge: 12 } }, likes: ['patient'], dislikes: ['schemer', 'gossip'], hidden: true,
  }),
  tag('debt', '欠债', 'shadow', 1, '每个月都有人来收一笔钱。', {
    effects: { personality: { generosity: -4 }, eventWeight: { favor: 1.3 } }, likes: ['trader'], dislikes: ['mercenary'], hidden: true,
  }),
  tag('wanted', '被通缉', 'shadow', 2, '名字出现在某张不该出现的名单上。', {
    effects: { relation: { fear: 3 }, eventWeight: { conflict: 1.3 } }, likes: ['thief', 'anarchist'], dislikes: ['guard'], conflicts: ['guard'], hidden: true,
  }),
  tag('lostfamily', '失去家人', 'shadow', 2, '有一个名字再也不会被叫到。', {
    effects: { personality: { grudge: 8, loyalty: 6 }, eventWeight: { romance: 0.8 } }, likes: ['protective', 'romantic'], dislikes: ['cynical'], hidden: true,
  }),
  tag('fearabandon', '害怕被抛下', 'shadow', 2, '会反复确认你还在不在。', {
    effects: { relation: { closeness: 4, trust: -4 }, eventWeight: { message: 1.4 } }, likes: ['loyal', 'protective'], dislikes: ['solo', 'commitmentphobe'], hidden: true,
  }),
  tag('secretcult', '秘密信徒', 'shadow', 2, '会在某些夜晚消失。', {
    effects: { personality: { loyalty: 4 }, eventWeight: { message: 0.8 } }, likes: ['whisperloyal', 'priest'], dislikes: ['towerloyal'], hidden: true,
  }),
  tag('addiction', '依赖药物', 'shadow', 2, '稳定剂不只是稳定精神。', {
    effects: { personality: { loyalty: -4, grudge: 4 }, eventWeight: { favor: 1.2 } }, likes: ['hedonist'], dislikes: ['ascetic'], hidden: true,
  }),
  tag('bloodstain', '手上有人', 'shadow', 3, '有一段经历不能写进登记表。', {
    effects: { personality: { aggression: 8, grudge: 8 } }, likes: ['fighter'], dislikes: ['honest'], hidden: true,
  }),
  tag('hunted', '被追猎', 'shadow', 2, '有人在星图上跟着他。', {
    effects: { personality: { curiosity: 4, grudge: 8 }, eventWeight: { conflict: 1.3, quest: 0.8 } }, likes: ['scout'], dislikes: ['guard'], hidden: true,
  }),
  tag('brokenpromise', '违背过誓言', 'shadow', 1, '答应过的事没有做到。', {
    effects: { relation: { trust: -5 }, personality: { grudge: 6 } }, likes: ['honest'], dislikes: ['schemer'], conflicts: ['schemer'], hidden: true,
  }),
]

export const TAG_BY_ID = Object.fromEntries(TAGS.map((item) => [item.id, item]))

export function tagDefsFor(ids = []) {
  return ids.map((id) => TAG_BY_ID[id]).filter(Boolean)
}

export function tagName(id) {
  return TAG_BY_ID[id]?.name || id
}

function matchesToken(def, token) {
  if (token.startsWith('group:')) {
    const members = TAG_GROUPS[token.slice(6)] || []
    return members.includes(def.id)
  }
  return def.id === token
}

export function tagAffinity(idsA, idsB) {
  const a = tagDefsFor(idsA)
  const b = tagDefsFor(idsB)
  let score = 0
  const reasons = []

  a.forEach((left) => {
    b.forEach((right) => {
      if (left.id === right.id) return
      const liked = left.likes.some((token) => matchesToken(right, token, b)) ||
        right.likes.some((token) => matchesToken(left, token, a))
      if (liked) {
        score += 4
        if (reasons.length < 3) reasons.push(`${left.name}欣赏${right.name}`)
      }

      const disliked = left.dislikes.some((token) => matchesToken(right, token, b)) ||
        right.dislikes.some((token) => matchesToken(left, token, a))
      if (disliked) {
        score -= 6
        if (reasons.length < 3) reasons.push(`${left.name}受不了${right.name}`)
      }

      if (left.conflicts.includes(right.id) || right.conflicts.includes(left.id)) {
        score -= 12
        if (reasons.length < 3) reasons.push(`${left.name}与${right.name}相冲`)
      }
    })
  })

  Object.values(TAG_GROUPS).forEach((members) => {
    const left = a.some((item) => members.includes(item.id))
    const right = b.some((item) => members.includes(item.id))
    if (left && right) score += 2
  })

  return { score: clamp(Math.round(score), -35, 35), reasons: [...new Set(reasons)] }
}

export function aggregateTagEffects(ids = []) {
  const result = { personality: {}, relation: {}, combat: {}, eventWeight: {} }
  tagDefsFor(ids).forEach((def) => {
    Object.entries(def.effects.personality || {}).forEach(([key, value]) => {
      result.personality[key] = (result.personality[key] || 0) + value
    })
    Object.entries(def.effects.relation || {}).forEach(([key, value]) => {
      result.relation[key] = (result.relation[key] || 0) + value
    })
    Object.entries(def.effects.combat || {}).forEach(([key, value]) => {
      result.combat[key] = (result.combat[key] || 0) + value
    })
    Object.entries(def.effects.eventWeight || {}).forEach(([key, value]) => {
      result.eventWeight[key] = (result.eventWeight[key] || 0) + value
    })
  })
  return result
}

const ORIGIN_CATEGORY_TAG = {
  军事: 'soldier',
  技术: 'engineer',
  地下: 'thief',
  劳作: 'minerborn',
  信仰: 'preacher',
  荒野: 'scout',
  学院: 'scholar',
}

const SPECIES_TAG = {
  miner: 'minerborn',
  construct: 'labsubject',
  symbiote: 'sensitivepsionics',
  drifter: 'drifter',
}

const LANDSCAPE_TAG = {
  burning: 'hotblooded',
  deepsea: 'romantic',
  snowfield: 'calm',
  starmap: 'curious',
  hive: 'collectivist',
  library: 'scholar',
  wound: 'scarred',
  void: 'aloof',
}

const FLAW_TAG = {
  oldwound: 'scarred',
  nerve: 'sensitivepsionics',
  addiction: 'addiction',
  feud: 'wanted',
  greed: 'debt',
  nightblind: 'nightowl',
  tremor: 'dramatic',
  pheromone: 'flirt',
  debtor: 'debt',
  oathbreaker: 'brokenpromise',
}

const SKILL_TAG = {
  steal: 'thief',
  lockpick: 'thief',
  hacking: 'hacker',
  medicine: 'physician',
  tracking: 'tracker',
  mechanics: 'mechanic',
  barter: 'trader',
  intimidate: 'fighter',
  empathy: 'protectivefriend',
  lore: 'scholar',
}

const TRAIT_TAG = {
  nose: 'sharpnose',
  hands: 'mechanic',
  calm: 'calm',
  dealer: 'negotiator',
  night: 'nightowl',
  resonance: 'sensitivepsionics',
}

export function playerTagKeys(run) {
  const keys = new Set()
  const player = run.player
  const origin = ORIGINS[player.origin]
  const categoryTag = ORIGIN_CATEGORY_TAG[origin?.category]
  if (categoryTag) keys.add(categoryTag)
  if (SPECIES_TAG[player.species]) keys.add(SPECIES_TAG[player.species])
  if (LANDSCAPE_TAG[player.landscape]) keys.add(LANDSCAPE_TAG[player.landscape])
  ;(player.flaws || []).forEach((flaw) => {
    if (FLAW_TAG[flaw]) keys.add(FLAW_TAG[flaw])
  })
  ;(player.skills || []).forEach((skill) => {
    if (SKILL_TAG[skill]) keys.add(SKILL_TAG[skill])
  })
  ;(player.traits || []).forEach((trait) => {
    if (TRAIT_TAG[trait]) keys.add(TRAIT_TAG[trait])
  })
  return [...keys].filter((id) => TAG_BY_ID[id])
}
