/**
 * 社交圈与论坛的本地骨架、评论和状态。
 */

import { randomDraft } from '../src/game-core/character.js'
import { createRun } from '../src/game-core/run.js'
import {
  addForumComment,
  addMoment,
  ensureForumSeed,
  ensureSocial,
  localForumPost,
  localForumReply,
  localMomentFor,
  replaceMomentText,
  tickSocial,
} from '../src/game-core/social.js'

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
tickSocial(run)
check(Array.isArray(social.moments) && Array.isArray(social.forumPosts), '社交状态不完整')

console.log(JSON.stringify({
  ok: errors.length === 0,
  moments: social.moments.length,
  forumPosts: social.forumPosts.length,
  errors,
}, null, 2))

if (errors.length) process.exit(1)
