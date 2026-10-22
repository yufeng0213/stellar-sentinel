/**
 * 聊天触发的社交动态与论坛帖子。
 */

import { randomDraft } from '../src/game-core/character.js'
import { createRun } from '../src/game-core/run.js'
import {
  detectChatSocialTrigger,
  localChatForumPost,
  localChatMomentText,
  socialPostChance,
} from '../src/game-core/social-triggers.js'
import {
  buildChatTriggeredForumMessages,
  buildChatTriggeredMomentMessages,
} from '../src/game/social-prompts.js'

const errors = []
const check = (condition, label) => { if (!condition) errors.push(label) }

const run = createRun(randomDraft(), 'CHAT-SOCIAL-TEST')
const npc = Object.values(run.npcs).find((item) => item.alive && item.active !== false)
if (npc) {
  npc.lover = true
  npc.relation.closeness = 60
  const breakup = detectChatSocialTrigger(npc, '我们分手吧。')
  check(breakup?.type === 'breakup', '没有识别分手对话')
  check(!detectChatSocialTrigger(npc, '不要分手，我只是有点生气。'), '否定句误触分手')
  check(detectChatSocialTrigger(npc, '我今天真的很讨厌你。')?.type === 'insult', '没有识别冲突对话')

  npc.tags = [...(npc.tags || []), 'gossip', 'dramatic']
  check(socialPostChance(npc, breakup) > 0.3, '爱表达 NPC 的发帖概率过低')
  check(localChatMomentText(npc, breakup).length > 0, '本地聊天动态为空')
  const localForum = localChatForumPost(npc, breakup)
  check(localForum.title && localForum.body, '本地聊天论坛帖为空')

  const momentPrompt = buildChatTriggeredMomentMessages(run, npc, breakup, '我们分手吧。', '好。')
    .messages.map((message) => message.content).join('\n')
  check(momentPrompt.includes('分手') && momentPrompt.includes(npc.name), '动态 prompt 没有带入对话背景')
  const forumPrompt = buildChatTriggeredForumMessages(run, npc, breakup, '我们分手吧。', '好。')
    .messages.map((message) => message.content).join('\n')
  check(forumPrompt.includes('分手') && forumPrompt.includes('匿名'), '论坛 prompt 没有带入对话背景')
}

console.log(JSON.stringify({ ok: errors.length === 0, errors }, null, 2))
if (errors.length) process.exit(1)
