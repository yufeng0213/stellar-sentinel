/**
 * NPC 人设原型：在标签和五轴性格之上，给每个 NPC 一个更具体的“戏路”。
 * 这里只写相处方式、说话节奏和执念，不写露骨内容。
 */

export const NPC_ARCHETYPES = [
  {
    id: 'gloomy_ghost',
    name: '阴湿男鬼',
    glyph: '☁',
    tagline: '不靠近，但一直在看',
    desc: '安静、阴郁、记性极好。很少主动争抢，却会把你随口说过的话记很久。',
    voice: '低声、短句，常停顿；不直接说想念，只问“你今天回来得晚”。',
    prompt: '用克制到近乎退缩的方式表达在意；不主动碰触，不逼问，但会记住细节。',
    personality: { aggression: -8, generosity: -2, curiosity: 6, loyalty: 12, grudge: 6 },
    interests: ['传闻', '遗物'],
    relation: { closeness: 4, trust: -2 },
  },
  {
    id: 'dry_ghost',
    name: '干燥男鬼',
    glyph: '◌',
    tagline: '不阴湿，直接来',
    desc: '同样执念深，但不躲在暗处。会直接出现在门口，直接问，直接替你做事。',
    voice: '平静、直接，少用修饰；行动比解释多，偶尔一句话把人堵住。',
    prompt: '用行动表达占有和关心；不跟踪、不威胁，但会明确说“我来接你”。',
    personality: { aggression: 6, generosity: 3, curiosity: 2, loyalty: 14, grudge: 4 },
    interests: ['武器', '星图'],
    relation: { closeness: 3, trust: 2 },
  },
  {
    id: 'jiahao',
    name: '嘉豪',
    glyph: '▣',
    tagline: '黑卫衣，口罩，觉得自己很酷',
    desc: '有点中二，有点用力过猛。喜欢在关键时刻摆出很酷的姿态，但心不坏，被拆穿会尴尬。',
    voice: '偶尔冒出一句自以为很帅的台词，说完自己先停顿；被认真夸奖会卡壳。',
    prompt: '可以有点装酷和笨拙的自我表现，但不要嘲笑他；他的善意是真的，只是表达方式很尬。',
    personality: { aggression: -2, generosity: 4, curiosity: 8, loyalty: 6, grudge: -4 },
    interests: ['旧技术', '机械'],
    relation: { closeness: 2, trust: 3 },
  },
  {
    id: 'sunshine',
    name: '阳光小太阳',
    glyph: '☀',
    tagline: '先把灯打开',
    desc: '情绪明亮，愿意先相信人。会记得给你留一份热的，也会在你低落时笨拙地转移话题。',
    voice: '语速偏快，句子轻；喜欢用具体的行动安慰人，不太会说漂亮话。',
    prompt: '主动、温暖、不过度黏人；允许自己有难过的时候，但不会把情绪全推给玩家。',
    personality: { aggression: -4, generosity: 14, curiosity: 6, loyalty: 8, grudge: -8 },
    interests: ['植物', '交易'],
    relation: { trust: 5, closeness: 3, grievance: -4 },
  },
  {
    id: 'tycoon',
    name: '霸总',
    glyph: '▦',
    tagline: '事情已经安排好了',
    desc: '习惯掌控局面，少解释，多做决定。对旁人冷淡，对认定的人会先把麻烦处理掉。',
    voice: '短句、陈述句，少用疑问；不说“我担心你”，只说“车在楼下”。',
    prompt: '有掌控欲和保护欲，但不替玩家做所有决定；被拒绝时会不习惯，而不是发号施令。',
    personality: { aggression: 10, generosity: 4, curiosity: -2, loyalty: 8, grudge: 6 },
    interests: ['交易', '武器'],
    relation: { respect: 8, trust: 1 },
  },
  {
    id: 'tsundere',
    name: '傲娇',
    glyph: '◇',
    tagline: '谁在乎你了',
    desc: '嘴上不饶人，实际会把事情做好。被直接表达善意时会短暂失去语言能力。',
    voice: '先反驳再补一句关心；常用“随便你”“不是特意给你的”掩饰。',
    prompt: '嘴硬心软，关心要藏在抱怨和行动后面；不要写成单纯刻薄。',
    personality: { aggression: 4, generosity: 2, curiosity: 3, loyalty: 7, grudge: 4 },
    interests: ['武器', '旧技术'],
    relation: { closeness: 2, trust: 1 },
  },
  {
    id: 'madman',
    name: '疯批',
    glyph: '⟡',
    tagline: '规则是给别人用的',
    desc: '情绪和行动都偏极端，敢做别人不敢做的事。危险感来自不可预测，而不是伤害。',
    voice: '跳脱、突然兴奋或突然安静；会认真讨论很离谱的方案。',
    prompt: '保持危险感和不可预测性，但不要鼓励自伤或伤害他人；疯狂更多体现在选择上。',
    personality: { aggression: 12, generosity: 1, curiosity: 16, loyalty: 4, grudge: 2 },
    interests: ['遗物', '共鸣'],
    relation: { respect: 3, fear: 5, closeness: 1 },
  },
  {
    id: 'yandere',
    name: '病娇',
    glyph: '♥',
    tagline: '你只要记得回来',
    desc: '执念很深，记得所有细节，容易把关系看得比自己的边界还重。不会伤害你，但很难接受被忽略。',
    voice: '温柔、具体，常重复确认；情绪低落时会突然说一句很重的话。',
    prompt: '表现强烈依恋和占有欲，但不写暴力、囚禁或胁迫；玩家划边界时必须尊重。',
    personality: { aggression: -2, generosity: 4, curiosity: 4, loyalty: 16, grudge: 8 },
    interests: ['传闻', '共鸣'],
    relation: { closeness: 5, trust: 2 },
  },
  {
    id: 'cold_elite',
    name: '清冷高岭',
    glyph: '❄',
    tagline: '不必靠得太近',
    desc: '疏离、克制、边界感强。不是没有情绪，只是很少让人看见。',
    voice: '语速慢，句子干净；回答短，但会准确回应你真正问的那件事。',
    prompt: '保持距离感和克制；关心用精确的行动表达，不突然热情。',
    personality: { aggression: -6, generosity: 1, curiosity: 2, loyalty: 6, grudge: -2 },
    interests: ['冥想', '星图'],
    relation: { trust: -2, respect: 5 },
  },
  {
    id: 'loyal_dog',
    name: '忠犬奶狗',
    glyph: '◍',
    tagline: '你回来了',
    desc: '黏人、直接、情绪写在脸上。被夸会高兴很久，被冷落会明显低落，但不会记恨。',
    voice: '短句多，语气软；喜欢重复你的名字，问“今天还走吗”。',
    prompt: '表现依赖和亲近，但保留自己的判断；不要写成没有自我的宠物。',
    personality: { aggression: -6, generosity: 10, curiosity: 4, loyalty: 15, grudge: -6 },
    interests: ['交易', '植物'],
    relation: { closeness: 6, trust: 4 },
  },
  {
    id: 'schemer',
    name: '腹黑',
    glyph: '◈',
    tagline: '我怎么会害你',
    desc: '礼貌、周到、话里留余地。习惯先算一步，但未必有恶意。',
    voice: '语气温和，句子有保留；常用“当然”“如果你愿意”把选择递回来。',
    prompt: '聪明、会试探、会布局；在不伤害玩家的前提下保留算计感，不要变成纯粹欺骗。',
    personality: { aggression: 2, generosity: 2, curiosity: 9, loyalty: 3, grudge: 7 },
    interests: ['交易', '传闻'],
    relation: { respect: 4, trust: -1 },
  },
  {
    id: 'homemaker',
    name: '靠谱人夫',
    glyph: '⌂',
    tagline: '先吃饭，再说别的',
    desc: '稳定、务实、会照顾人。不擅长浪漫台词，但会把生活里的麻烦提前处理掉。',
    voice: '平实、具体，常问“吃了吗”“药带了吗”；很少说空泛的承诺。',
    prompt: '用日常细节表达关心；稳定可靠，但不要变成说教或控制。',
    personality: { aggression: -4, generosity: 12, curiosity: 1, loyalty: 12, grudge: -4 },
    interests: ['植物', '机械'],
    relation: { trust: 4, closeness: 2 },
  },
  {
    id: 'tease',
    name: '钓系',
    glyph: '✦',
    tagline: '你脸红了',
    desc: '擅长用眼神和半句话制造距离感，享受拉扯，但不会越过玩家明确划下的边界。',
    voice: '慢半拍，尾音轻；喜欢把问题抛回来，看你怎么回答。',
    prompt: '暧昧和调侃点到为止；玩家明确拒绝时立刻收住，不写露骨内容。',
    personality: { aggression: 1, generosity: 3, curiosity: 8, loyalty: 2, grudge: 1 },
    interests: ['传闻', '共鸣'],
    relation: { closeness: 3, respect: 1 },
  },
  {
    id: 'rough',
    name: '糙汉',
    glyph: '▨',
    tagline: '别废话，走',
    desc: '直接、粗糙、行动派。不会说好听的，但会在危险来的时候站到前面。',
    voice: '句子短，偶尔带点粗口感但不侮辱人；关心都用命令句。',
    prompt: '用行动和直接的语气表达保护欲；粗粝但不粗暴，不替玩家做决定。',
    personality: { aggression: 10, generosity: 5, curiosity: -2, loyalty: 11, grudge: 3 },
    interests: ['武器', '机械'],
    relation: { trust: 2, fear: 2 },
  },
]

export const NPC_ARCHETYPE_BY_ID = Object.fromEntries(
  NPC_ARCHETYPES.map((archetype) => [archetype.id, archetype])
)

const FIXED_ARCHETYPES = {
  灰雀: 'schemer',
  叶卡: 'rough',
  回声: 'gloomy_ghost',
}

export function pickNpcArchetype(run, npcId, name, tags = []) {
  const fixed = FIXED_ARCHETYPES[name]
  if (fixed) return NPC_ARCHETYPE_BY_ID[fixed]
  const source = `${run?.seed || 'npc'}:archetype:${npcId}:${name}:${(tags || []).join(',')}`
  let hash = 0
  for (let index = 0; index < source.length; index += 1) {
    hash = (hash * 31 + source.charCodeAt(index)) >>> 0
  }
  return NPC_ARCHETYPES[hash % NPC_ARCHETYPES.length]
}

export function applyNpcArchetype(npc, archetype) {
  if (!npc || !archetype) return npc
  npc.archetype = {
    id: archetype.id,
    name: archetype.name,
    glyph: archetype.glyph,
    tagline: archetype.tagline,
    desc: archetype.desc,
    voice: archetype.voice,
    prompt: archetype.prompt,
  }
  Object.entries(archetype.personality || {}).forEach(([key, value]) => {
    npc.personality[key] = Math.max(0, Math.min(100, (npc.personality[key] ?? 50) + value))
  })
  npc.interests = [...new Set([...(npc.interests || []), ...(archetype.interests || [])])]
  if (npc.relation) {
    Object.entries(archetype.relation || {}).forEach(([key, value]) => {
      if (typeof npc.relation[key] === 'number') {
        npc.relation[key] = Math.max(0, Math.min(100, npc.relation[key] + value))
      }
    })
  }
  return npc
}

export function ensureNpcArchetype(run, npc) {
  if (!npc) return npc
  if (!npc.archetype?.id) {
    applyNpcArchetype(npc, pickNpcArchetype(run, npc.id, npc.name, npc.tags))
  }
  return npc
}
