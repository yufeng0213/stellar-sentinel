/**
 * 社交圈与论坛：世界在没有玩家输入时也会产生新帖子和新评论。
 * 本地先生成确定性的骨架，LLM 只负责把文字写得更像具体的人。
 */

import { REGIONS } from './data.js'
import { createRng } from './rng.js'

const MOMENT_LINES = {
  gloomy_ghost: ['今天没有去酒馆。窗边那盏灯还亮着。', '空港的风比昨天更冷。有人把旧毯子挂在了门口。'],
  dry_ghost: ['市场来了一批新货。价格还没谈拢。', '有人问我最近有没有见到你。我说没有。'],
  jiahao: ['修好了一个旧中继器。还能用。', '今天的饭做得比平时多一点。'],
  sunshine: ['在旧码头看到一只很胖的猫。它不怕人。', '今天的天空是那种很薄的蓝。适合出门。'],
  tycoon: ['新的账本到了。封面比里面值钱。', '有人想用一张旧地图换我的时间。我拒绝了。'],
  tsundere: ['路过你常去的地方。没有特意停。', '今天谁也没有等。只是刚好站在门口。'],
  madman: ['在废料堆里找到一块会发光的板子。暂时没炸。', '我有个想法。等试验完再告诉你。'],
  yandere: ['你今天应该会回来吧。', '把你的杯子洗了。放回了原来的位置。'],
  cold_elite: ['旧档案里有一条记录对不上。', '今天没有异常。只是确认一下。'],
  loyal_dog: ['门口的灯我留着。', '今天一直在。没有走远。'],
  schemer: ['有人在高价收旧芯片。最好别急着卖。', '听说边境又换了一面旗。'],
  homemaker: ['汤在锅里。回来记得热。', '外面降温了。药放在桌上。'],
  tease: ['今天很安静。安静得有点不像空港。', '你不在的时候，消息都显得很慢。'],
  rough: ['练了一下午。手还在抖。', '有活就叫我。别一个人扛。'],
  default: ['今天空港有一点吵。远处像是在卸货。', '看到一条不太确定的消息。先记下来。', '没什么事。只是觉得今天过得很快。'],
}

const FORUM_SEEDS = [
  {
    authorName: '空港广播站',
    title: '今天凌晨，旧灯塔又亮了一次',
    body: '没有人承认是谁接上的电。附近的人说只亮了十几秒。上一次出现这种情况，是在边境战争开始前。',
    tags: ['空港', '异象'],
  },
  {
    authorName: '矿脉站值守',
    title: '矿脉站临时封闭东侧通道',
    body: '东侧通道出现了新的塌方。暂时没有人员伤亡。需要经过的商队请改走旧铁路线。',
    tags: ['矿脉站', '通行'],
  },
  {
    authorName: '市场行情板',
    title: '旧芯片价格连续第三天上涨',
    body: '黑市在收。白塔也在收。有人说和地下的那扇门有关，但没有人拿出证据。',
    tags: ['市场', '旧芯片'],
  },
  {
    authorName: '边境来信',
    title: '有人看见一辆没有标识的车队',
    body: '车队在夜里穿过了废弃检查站。车上盖着防水布。巡逻队没有追上。',
    tags: ['边境', '传闻'],
  },
  {
    authorName: '酒馆角落',
    title: '关于新来那批人的一点观察',
    body: '他们不太说话，但会问很多关于旧航线的问题。其中一个左手一直戴着半截手套。',
    tags: ['酒馆', '新面孔'],
  },
  {
    authorName: '低语者频道',
    title: '如果你今晚听见有人叫你的名字',
    body: '不要立刻回答。先确认声音是从门外，还是从你自己的图景里传来的。',
    tags: ['低语者', '精神'],
  },
]

const FORUM_REPLIES = [
  '我也听说了。最好别一个人去。',
  '这条消息先留着。等明天看看还有没有人提。',
  '看起来像是有人故意放出来的。',
  '如果你要去，记得带上灯。',
  '空港最近确实不太对劲。',
  '感谢记录。至少现在有人知道这件事。',
  '这件事和上周那批货有关吗？',
]

export function createSocialState() {
  return {
    moments: [],
    forumPosts: [],
    lastMomentDay: 0,
    lastMomentLlmDay: 0,
    lastForumDay: 0,
    lastForumLlmDay: 0,
    momentSeq: 0,
    forumSeq: 0,
    commentSeq: 0,
    likes: {},
  }
}

export function ensureSocial(run) {
  if (!run) return createSocialState()
  if (!run.social || typeof run.social !== 'object') run.social = createSocialState()
  const social = run.social
  if (!Array.isArray(social.moments)) social.moments = []
  if (!Array.isArray(social.forumPosts)) social.forumPosts = []
  if (!social.likes || typeof social.likes !== 'object') social.likes = {}
  ;['lastMomentDay', 'lastMomentLlmDay', 'lastForumDay', 'lastForumLlmDay', 'momentSeq', 'forumSeq', 'commentSeq'].forEach((key) => {
    if (typeof social[key] !== 'number') social[key] = 0
  })
  return social
}

export function localMomentFor(npc, run, rng = createRng(`${run.seed}:moment:${npc.id}:${run.day}`)) {
  const lines = MOMENT_LINES[npc.archetype?.id] || MOMENT_LINES.default
  const line = rng.pick(lines)
  const tags = []
  if (npc.home && REGIONS[npc.home]) tags.push(REGIONS[npc.home].name)
  if (npc.faction) tags.push({ tower: '白塔', market: '黑市', drifters: '漂流者', whisper: '低语者' }[npc.faction] || npc.faction)
  if (npc.lover) tags.push('今晚')
  if (rng.chance(0.35)) tags.push('空港日常')
  return {
    id: `moment-${run.day}-${npc.id}-${++run.social.momentSeq}`,
    npcId: npc.id,
    name: npc.name,
    text: line,
    tags: [...new Set(tags)].slice(0, 4),
    day: run.day,
    likes: rng.int(0, 12),
    comments: [],
    source: 'local',
  }
}

export function addMoment(run, moment) {
  const social = ensureSocial(run)
  social.moments.unshift(moment)
  if (social.moments.length > 40) social.moments.length = 40
  social.lastMomentDay = run.day
  return moment
}

export function addMomentComment(run, momentId, comment) {
  const social = ensureSocial(run)
  const moment = social.moments.find((item) => item.id === momentId)
  if (!moment) return null
  moment.comments = Array.isArray(moment.comments) ? moment.comments : []
  moment.comments.push(comment)
  if (moment.comments.length > 20) moment.comments.shift()
  return comment
}

export function localMomentReply(run, moment, commentText, rng = createRng(`${run.seed}:moment-reply:${moment.id}:${run.day}`)) {
  const replies = [
    '看到了。你居然会回这条。',
    '嗯。今天空港的风确实很大。',
    '你那边也这样吗？',
    '我只是随手写的。没想到你会看见。',
    '下次见面再说。',
    '别担心。我这边还好。',
  ]
  return {
    id: `moment-comment-${run.day}-${++ensureSocial(run).commentSeq}`,
    authorType: 'npc',
    authorId: moment.npcId || null,
    authorName: moment.name || '某人',
    text: rng.pick(replies),
    day: run.day,
    replyTo: commentText || null,
  }
}

export function generateLocalMoment(run, rng = createRng(`${run.seed}:social:${run.day}`)) {
  const social = ensureSocial(run)
  if (social.lastMomentDay === run.day) return null
  const candidates = Object.values(run.npcs || {}).filter((npc) => (
    npc.alive &&
    npc.active !== false &&
    !npc.life?.leftCity &&
    !npc.hostile &&
    npc.contact !== false
  ))
  if (!candidates.length) return null
  const npc = rng.pick(candidates)
  return addMoment(run, localMomentFor(npc, run, rng))
}

export function localForumPost(run, rng = createRng(`${run.seed}:forum:${run.day}`)) {
  const social = ensureSocial(run)
  const seed = rng.pick(FORUM_SEEDS)
  const post = {
    id: `forum-${run.day}-${++social.forumSeq}`,
    authorType: 'world',
    authorId: null,
    authorName: seed.authorName,
    title: seed.title,
    body: seed.body,
    tags: seed.tags,
    day: run.day,
    comments: [],
    source: 'local',
  }
  post.comments.push(localForumReply(run, post, '', rng))
  social.forumPosts.unshift(post)
  social.lastForumDay = run.day
  if (social.forumPosts.length > 30) social.forumPosts.length = 30
  return post
}

export function ensureForumSeed(run) {
  const social = ensureSocial(run)
  if (social.forumPosts.length) return null
  return localForumPost(run)
}

export function localForumReply(run, post, commentText, rng = createRng(`${run.seed}:forum-reply:${post.id}:${run.day}`)) {
  const reply = rng.pick(FORUM_REPLIES)
  return {
    id: `forum-comment-${run.day}-${++ensureSocial(run).commentSeq}`,
    authorType: 'world',
    authorId: null,
    authorName: '匿名频道',
    text: reply,
    day: run.day,
    replyTo: commentText || null,
  }
}

export function addForumComment(run, postId, comment) {
  const social = ensureSocial(run)
  const post = social.forumPosts.find((item) => item.id === postId)
  if (!post) return null
  post.comments.push(comment)
  if (post.comments.length > 30) post.comments.shift()
  return comment
}

export function tickSocial(run, rng = createRng(`${run.seed}:social-tick:${run.day}`)) {
  const social = ensureSocial(run)
  ensureForumSeed(run)
  if (social.lastMomentDay !== run.day && rng.chance(0.55)) generateLocalMoment(run, rng)
  if (run.day - (social.lastForumDay || 0) >= 2) localForumPost(run, rng)
  return social
}

export function replaceMomentText(run, momentId, text, tags = null) {
  const social = ensureSocial(run)
  const moment = social.moments.find((item) => item.id === momentId)
  if (!moment) return null
  moment.text = clampText(text, 240)
  moment.source = 'llm'
  if (Array.isArray(tags) && tags.length) moment.tags = tags.slice(0, 5)
  return moment
}

export function clampText(text, max = 600) {
  return String(text || '').replace(/\s+/g, ' ').trim().slice(0, max)
}
