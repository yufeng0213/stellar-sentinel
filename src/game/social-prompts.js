/**
 * 社交圈 / 论坛 / 后台消息的 LLM 提示。
 * 只让模型写内容，不碰数值、关系或任务状态。
 */

import { REGIONS } from '../game-core/data.js'
import { factionName } from '../game-core/npc.js'
import { tagDefsFor } from '../game-core/npc-tags.js'

function npcProfile(npc, run) {
  const tags = tagDefsFor(npc.tags || []).map((tag) => tag.name).slice(0, 8)
  const memories = (npc.longMemory || []).slice(-3).map((entry) => entry.text).filter(Boolean)
  return [
    `姓名：${npc.name}`,
    `派系：${factionName(npc.faction)}`,
    `家乡：${REGIONS[npc.home]?.name || '空港'}`,
    `性格标签：${tags.join('、') || '没有明显标签'}`,
    `与玩家关系：信任 ${npc.relation?.trust ?? 0}，亲近 ${npc.relation?.closeness ?? 0}，怨念 ${npc.relation?.grievance ?? 0}`,
    npc.lover ? '玩家是他的恋人。' : '',
    memories.length ? `最近记忆：${memories.join('；')}` : '',
    `今天是第 ${run.day} 天。`,
  ].filter(Boolean).join('\n')
}

export function recentActionSummary(run) {
  const logs = (run.log || []).slice(0, 6).map((entry) => entry.text).filter(Boolean)
  const worlds = (run.worldEvents || []).slice(0, 6).map((entry) => entry.text).filter(Boolean)
  const cleared = (run.cleared || []).slice(-5).map((id) => run.map?.nodes?.[id]?.title).filter(Boolean)
  const activeQuests = (run.quests || []).filter((quest) => quest.status === 'active').map((quest) => quest.nodeTitle)
  return [...new Set([...logs, ...worlds, ...cleared, ...activeQuests])].slice(0, 8)
}

export function buildMomentMessages(run, npc) {
  return {
    messages: [
      {
        role: 'system',
        content: [
          '你在为一个星际边境 RPG 写 NPC 的社交圈动态。',
          '只输出 1 条中文动态，像推特或朋友圈，不要解释，不要加引号。',
          '内容必须符合这个人的人设、派系、记忆和当前关系。',
          '可以写日常、暗示、抱怨、看到的东西、对玩家的含蓄提及。',
          '最后另起一行给 1–3 个 #标签，例如 #空港日常 #旧芯片。',
          '不要写玩家不知道的私密事实，不要替玩家做决定。',
          '控制在 80 个汉字以内。',
          '',
          npcProfile(npc, run),
        ].join('\n'),
      },
      {
        role: 'user',
        content: '写一条他今天会发在社交圈里的动态。',
      },
    ],
  }
}

export function buildBackgroundMessageMessages(run, npc) {
  return {
    messages: [
      {
        role: 'system',
        content: [
          '你在写一个星际边境 RPG 中 NPC 主动发给玩家的私聊消息。',
          '只输出一条中文消息，不要解释，不要写旁白，不要加引号。',
          '语气要符合人物标签、派系、与玩家的关系和最近记忆。',
          '可以是问候、分享日常、含蓄关心、试探、提到一件小事。',
          '不要写系统提示，不要写选项，不要替玩家回复。',
          '控制在 60 个汉字以内。',
          '',
          npcProfile(npc, run),
        ].join('\n'),
      },
      {
        role: 'user',
        content: '写一条他会在后台主动发给玩家的消息。',
      },
    ],
  }
}

export function buildForumPostMessages(run) {
  const actions = recentActionSummary(run)
  return {
    messages: [
      {
        role: 'system',
        content: [
          '你在为一个星际边境 RPG 写匿名论坛的新帖子。',
          '只输出中文帖子正文，不要标题，不要解释，不要加引号。',
          '世界观是边境空港、旧白塔、黑市、漂流者、低语者、矿脉站。',
          '内容应该像居民随手发的观察、传闻、警告或提问，有具体细节。',
          '必须从下面的「最近发生的事」中选一件作为讨论引子。',
          '不要直接点名玩家，可以写「有人」「那个跑星图的人」「昨晚那支队伍」。',
          '你可以猜测、质疑、担心或抱怨这件事带来的影响。',
          '控制在 120 个汉字以内。',
          `今天是第 ${run.day} 天。`,
          '',
          actions.length ? `最近发生的事：\n- ${actions.join('\n- ')}` : '最近没有特别的事，写一条空港日常观察。',
        ].join('\n'),
      },
      { role: 'user', content: '写一条今天论坛上会出现的新帖子，让它和最近发生的事有关。' },
    ],
  }
}

export function buildMomentCommentMessages(run, moment, commentText, npc) {
  return {
    messages: [
      {
        role: 'system',
        content: [
          '你在为一个星际边境 RPG 写 NPC 对玩家社交圈评论的回复。',
          '只输出一条中文回复，不要解释，不要旁白，不要加引号。',
          '语气必须符合这个人的人设、派系、与玩家的关系，以及这条动态的内容。',
          '可以简短回应、嘴硬、关心、试探或转移话题。',
          '不要写系统提示，不要替玩家说话。',
          '控制在 60 个汉字以内。',
          '',
          npcProfile(npc, run),
          '',
          `动态：${moment.text}`,
          `玩家评论：${commentText}`,
        ].join('\n'),
      },
      { role: 'user', content: '写一条对这条评论的回复。' },
    ],
  }
}

export function buildForumReplyMessages(run, post, commentText, npc) {
  const profile = npc
    ? npcProfile(npc, run)
    : '你是一个在空港论坛常年活跃的匿名居民。你说话简短，知道一些边境传闻。'
  return {
    messages: [
      {
        role: 'system',
        content: [
          '你在为一个星际边境 RPG 写论坛回复。',
          '只输出一条中文回复，不要解释，不要加引号。',
          '回复要像论坛用户，简短、有具体反应，可以质疑、补充或提醒。',
          '不要写系统提示，不要替玩家说话。',
          '控制在 80 个汉字以内。',
          '',
          profile,
          '',
          `帖子标题：${post.title}`,
          `帖子内容：${post.body}`,
        ].join('\n'),
      },
      { role: 'user', content: `玩家评论：${commentText}\n写一条回复。` },
    ],
  }
}

export function parseSocialText(raw, fallback) {
  let text = String(raw || '').trim()
  if (!text) return { text: fallback, tags: [] }
  text = text.replace(/^```[a-z]*|```$/g, '').trim()
  text = text.replace(/^(动态|帖子|回复)[:：]\s*/i, '')
  const tags = [...text.matchAll(/#([^\s#，。！？、]+)/g)]
    .map((match) => match[1].trim())
    .filter(Boolean)
    .slice(0, 4)
  const body = text.replace(/#([^\s#，。！？、]+)/g, '').replace(/\s+/g, ' ').trim()
  return {
    text: body.slice(0, 300) || fallback,
    tags: [...new Set(tags)],
    raw: text.slice(0, 600),
  }
}
