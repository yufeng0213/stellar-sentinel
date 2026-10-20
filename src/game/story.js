/**
 * 开局剧情的 LLM 提示与文本清理。
 * LLM 只写氛围和感官，不生成选项、不修改数值。
 */

import { ABOS, FLAWS, LANDSCAPES, ORIGINS, SCENTS, SPECIES } from '../game-core/data.js'
import { localOpening } from '../game-core/story.js'

const nameOf = (table, key, fallback = '未知') => table?.[key]?.name || fallback

export function buildStoryOpeningMessages(run, awakening) {
  const player = run.player
  const lines = [
    '你在写一款星际哨兵/向导 RPG 的开场。',
    '用第二人称“你”，写 400–700 个中文字符。',
    '只写角色醒来时的感官、环境、身体状态和眼前的具体细节。',
    '不要写数值、选项、判定结果，不要替玩家做决定，不要使用 Markdown。',
    '结尾停在一个让人想继续探索的细节上。',
    '',
    `【醒来地点】${awakening.place}`,
    `【场景】${awakening.name}`,
    `【氛围】${awakening.tone}`,
    `【可用细节】${awakening.details.join('；')}`,
    `【角色】${player.name}，${nameOf(SPECIES, player.species)}，${nameOf(ABOS, player.abo)}，${nameOf(ORIGINS, player.origin)}`,
    `【气味】${nameOf(SCENTS, player.scent)}`,
    `【精神图景】${nameOf(LANDSCAPES, player.landscape)}`,
    `【缺陷】${player.flaw ? nameOf(FLAWS, player.flaw) : '无'}`,
    `【能力】${(player.skills || []).join('、') || '无'}`,
    `【世界】白塔失联第 47 天，边境星区由白塔残余、黑市网络、漂流者和低语者分割。`,
    `【本地开场参考】${localOpening(run, awakening)}`,
    '',
    '直接输出开场正文，不要标题。',
  ]
  return {
    messages: [
      { role: 'system', content: '你擅长写冷峻、具体、克制的科幻开场。只输出正文。' },
      { role: 'user', content: lines.join('\n') },
    ],
  }
}

export function stripStoryOpening(text) {
  return String(text || '')
    .replace(/```[a-zA-Z]*\s*/g, '')
    .replace(/```/g, '')
    .replace(/^[\s"“”']+|[\s"“”']+$/g, '')
    .replace(/^\s*开场[:：]\s*/, '')
    .trim()
    .slice(0, 4000)
}
