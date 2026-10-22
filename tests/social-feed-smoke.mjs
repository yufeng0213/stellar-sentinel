/**
 * 社交圈与论坛的本地骨架、评论和状态。
 */

import { randomDraft } from '../src/game-core/character.js'
import { createRun } from '../src/game-core/run.js'
import {
  addForumComment,
  addMoment,
  addMomentComment,
  ensureForumSeed,
  ensureSocial,
  forumCommentators,
  localForumNpcComment,
  localForumPost,
  localForumReply,
  localMomentFor,
  localMomentNpcComment,
  localMomentReply,
  replaceMomentText,
  socialCommentators,
  tickSocial,
} from '../src/game-core/social.js'
import { buildForumPostMessages, recentActionSummary } from '../src/game/social-prompts.js'

const errors = []
const check = (condition, label) => { if (!condition) errors.push(label) }

const run = createRun(randomDraft(), 'SOCIAL-FEED-TEST')
const social = ensureSocial(run)
const npc = Object.values(run.npcs).find((item) => item.alive && item.active !== false)
if (npc) {
  const moment = addMoment(run, localMomentFor(npc, run))
  check(social.moments.some((item) => item.id === moment.id), '社交动态没有写入')
  replaceMomentText(run, moment.id, '这是一条 AI 写过的动态 #空港 #测试', ['空港', '测试'])
  const updated = social.moments.find((item) => item.id === moment.id)
  check(updated.text.includes('AI') && updated.source === 'llm', '社交动态没有被 AI 文本替换')
  check(updated.tags.length >= 1, '社交动态没有标签')
  const playerComment = {
    id: 'moment-player-comment',
    authorType: 'player',
    authorName: '你',
    text: '今天风确实很大。',
    day: run.day,
  }
  addMomentComment(run, moment.id, playerComment)
  const momentReply = localMomentReply(run, moment, playerComment.text)
  addMomentComment(run, moment.id, momentReply)
  check(updated.comments?.length === 2, '社交动态评论或回复没有写入')
  check(momentReply.authorType === 'npc', '社交动态回复作者错误')
  const commentators = socialCommentators(run, npc, 2)
  check(commentators.length > 0, '没有找到动态评论者')
  if (commentators[0]) {
    const otherComment = localMomentNpcComment(run, moment, commentators[0].npc, commentators[0].tone)
    addMomentComment(run, moment.id, otherComment)
    check(updated.comments.length >= 3, '第二个 NPC 评论没有写入')
    check(otherComment.tone, 'NPC 评论没有情绪标记')
  }
}

ensureForumSeed(run)
const post = localForumPost(run)
check(post && social.forumPosts.some((item) => item.id === post.id), '论坛帖子没有写入')
const comment = {
  id: 'test-comment',
  authorType: 'player',
  authorName: '你',
  text: '我也看见了。',
  day: run.day,
}
addForumComment(run, post.id, comment)
check(post.comments.some((item) => item.id === comment.id), '论坛评论没有写入')
const reply = localForumReply(run, post, comment.text)
check(reply.text.length > 0, '论坛回复为空')
const forumNpcs = forumCommentators(run, 2)
check(forumNpcs.length > 0, '没有找到论坛评论者')
if (forumNpcs[0]) {
  addForumComment(run, post.id, localForumNpcComment(run, post, forumNpcs[0].npc, forumNpcs[0].tone))
  check(post.comments.length >= 2, '论坛 NPC 评论没有写入')
}
run.log.unshift({ t: `D${run.day}`, text: '你在矿脉站击倒了一台旧战争机器。', kind: 'good' })
const actionSummary = recentActionSummary(run)
check(actionSummary.some((line) => line.includes('旧战争机器')), '最近行动没有进入论坛上下文')
const forumPrompt = buildForumPostMessages(run).messages.map((message) => message.content).join('\n')
check(forumPrompt.includes('旧战争机器'), '论坛 AI 提示没有带入最近行动')
tickSocial(run)
check(Array.isArray(social.moments) && Array.isArray(social.forumPosts), '社交状态不完整')

console.log(JSON.stringify({
  ok: errors.length === 0,
  moments: social.moments.length,
  forumPosts: social.forumPosts.length,
  errors,
}, null, 2))

if (errors.length) process.exit(1)
