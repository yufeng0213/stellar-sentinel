/**
 * 对话触发的社交动态 / 论坛讨论。
 * 只负责识别意图、判断人物是否会公开表达，以及本地兜底文本。
 */

import { createRng } from './rng.js'

const BREAKUP_PATTERNS = [
  /分手/,
  /结束关系/,
  /到此为止/,
  /别再找我/,
  /不想再见到你/,
  /我们算了吧/,
  /以后不要联系/,
]

const NEGATIVE_BREAKUP = [
  /不要分手/,
  /不想分手/,
  /别分手/,
  /不是要分手/,
  /不要结束/,
]

const CONFESSION_PATTERNS = [
  /喜欢你/,
  /爱你/,
  /在一起/,
  /做我恋人/,
  /想和你在一起/,
  /跟我走吧/,
]

const INSULT_PATTERNS = [
  /滚开/,
  /滚/,
  /讨厌你/,
  /恨你/,
  /闭嘴/,
  /废物/,
  /恶心/,
  /不想理你/,
]

const APOLOGY_PATTERNS = [
  /对不起/,
  /抱歉/,
  /原谅我/,
  /是我不对/,
]

const INTIMATE_PATTERNS = [
  /想你/,
  /抱抱/,
  /亲一下/,
  /今晚见/,
  /想见你/,
]

function matches(text, patterns) {
  return patterns.some((pattern) => pattern.test(text))
}

export function detectChatSocialTrigger(npc, text) {
  const content = String(text || '').trim()
  if (!content) return null
  if (matches(content, NEGATIVE_BREAKUP)) return null

  if (matches(content, BREAKUP_PATTERNS) && (npc?.lover || (npc?.relation?.closeness || 0) >= 40)) {
    return { type: 'breakup', label: '结束关系', tone: 'hurt' }
  }
  if (matches(content, CONFESSION_PATTERNS) && !npc?.lover) {
    return { type: 'confession', label: '表达心意', tone: 'soft' }
  }
  if (matches(content, INSULT_PATTERNS)) {
    return { type: 'insult', label: '冲突', tone: 'angry' }
  }
  if (matches(content, APOLOGY_PATTERNS) && (npc?.relation?.grievance || 0) > 0) {
    return { type: 'apology', label: '道歉', tone: 'soft' }
  }
  if (matches(content, INTIMATE_PATTERNS) && (npc?.relation?.closeness || 0) >= 35) {
    return { type: 'intimate', label: '靠近', tone: 'soft' }
  }
  return null
}

function socialTagScore(npc) {
  const tags = new Set(npc?.tags || [])
  let score = 0
  if (tags.has('gossip')) score += 3
  if (tags.has('dramatic')) score += 3
  if (tags.has('romantic')) score += 2
  if (tags.has('jealous')) score += 2
  if (tags.has('vain')) score += 2
  if (tags.has('flirt')) score += 2
  if (tags.has('loveatfirstsight')) score += 2
  if (tags.has('aloof')) score -= 3
  if (tags.has('solo')) score -= 2
  if (tags.has('stoic')) score -= 2
  if (tags.has('shy')) score -= 1
  return score
}

export function socialPostChance(npc, trigger) {
  const base = trigger?.type === 'breakup'
    ? 0.52
    : trigger?.type === 'confession'
      ? 0.58
      : trigger?.type === 'insult'
        ? 0.44
        : trigger?.type === 'apology'
          ? 0.26
          : 0.34
  const tagModifier = socialTagScore(npc) * 0.045
  const personality = npc?.personality || {}
  const expressive = ((personality.aggression || 0) + (personality.curiosity || 0) + (personality.generosity || 0)) / 300
  return Math.max(0.04, Math.min(0.95, base + tagModifier + expressive * 0.12))
}

export function shouldNpcPostAboutChat(run, npc, trigger, salt = '') {
  if (!trigger || !npc) return false
  if (trigger.type === 'breakup' && !npc.lover && (npc.relation?.closeness || 0) < 40) return false
  const rng = createRng(`${run.seed}:chat-social:${run.day}:${npc.id}:${trigger.type}:${salt}`)
  return rng.chance(socialPostChance(npc, trigger))
}

export function shouldNpcPostForumAboutChat(run, npc, trigger, salt = '') {
  if (!trigger || !npc) return false
  const tags = new Set(npc.tags || [])
  const forumPersona = tags.has('gossip') || tags.has('dramatic') || tags.has('vain')
  const base = forumPersona ? 0.46 : 0.12
  const rng = createRng(`${run.seed}:chat-forum:${run.day}:${npc.id}:${trigger.type}:${salt}`)
  return rng.chance(base)
}

export function localChatMomentText(npc, trigger) {
  const lines = {
    breakup: [
      '有些关系结束得很轻。只有关门的声音比平时大一点。',
      '今天不太想说话。空港的风一直从门缝里进来。',
      '把该收的东西收好了。柜子空出一格。',
    ],
    confession: [
      '有人说了句话。我还没想好要怎么回。',
      '今天的光很淡。适合把一些事想清楚。',
      '心跳有点快。可能是走得太急了。',
    ],
    insult: [
      '今天不打算解释。有些人只适合隔着一条街说话。',
      '空港很吵。正好不用听清某些话。',
      '把门关上了。外面的事明天再说。',
    ],
    apology: [
      '有些话说出口以后，空气会轻一点。',
      '今天没有那么生气了。只是还需要一点时间。',
    ],
    intimate: [
      '今天的空港比平时安静。适合早点回去。',
      '有人在等我。这件事不用写得太明白。',
      '留了一盏灯。没有别的意思。',
    ],
  }
  const pool = lines[trigger?.type] || lines.breakup
  return pool[(npc?.name?.length || 0) % pool.length]
}

export function localChatForumPost(npc, trigger) {
  const title = trigger?.type === 'breakup'
    ? '酒馆门口今天有点安静'
    : trigger?.type === 'insult'
      ? '最近空港的火气是不是有点大'
      : '有人知道昨晚那件事吗'
  const body = trigger?.type === 'breakup'
    ? '有人看见两个人站在门口，谁都没有先走。后来其中一个把门关上了。没有吵架，但比吵架还难受。'
    : trigger?.type === 'insult'
      ? '今天在酒馆听见有人被赶出来。具体说了什么没听清。最近这种事好像变多了。'
      : '昨晚有人在通讯频道里说了很久。今天再问，已经没人愿意提。'
  return { title, body }
}
