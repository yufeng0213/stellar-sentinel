/**
 * 事件叙述：玩家在收件箱点「细读」时，才把结构化事件扩写成正文。
 * 事实、奖励和关系变化仍由本地事件对象决定。
 */

import { ITEMS, REGIONS } from '../game-core/data.js'
import { tagDefsFor } from '../game-core/npc-tags.js'

const TONE = {
  message: '像一条压低了声音的通讯',
  gift: '带着一点笨拙的善意',
  favor: '不太好开口',
  quest: '压着兴奋，也压着风险',
  romance: '比平时更慢，也更轻',
  conflict: '每个字都留着退路',
  gossip: '像在说一件不该被第三个人听见的事',
}

export function buildEventNarrativeMessages(run, event, npc) {
  const region = REGIONS[npc.home]
  const tags = tagDefsFor(npc.tags || [])
  const payload = event.payload || {}
  const detail = []

  if (payload.itemId && ITEMS[payload.itemId]) detail.push(`物品：${ITEMS[payload.itemId].name}`)
  if (payload.credits) detail.push(`信用点：${payload.credits}`)
  if (payload.nodeTitle) detail.push(`约定目标：${payload.nodeTitle}`)
  if (payload.amount) detail.push(`索赔：${payload.amount}`)

  const system = [
    '你是《星穹哨向》的叙事者，负责把一条已经确定的事件扩写成沉浸式短正文。',
    '只输出 2-3 句中文，不写标题、列表、代码块或数值；不要改变事件事实、奖励和结果。',
    '不要替玩家行动或做决定；不要写露骨性内容；不要直接复述标签名。',
  ].join('\n')

  const user = [
    `【事件】${event.title}（${event.type}）`,
    `【原始信息】${event.text}`,
    `【NPC】${npc.name}，${npc.abo}，${npc.role}，属于${npc.faction}，常驻${region?.name || npc.home}。`,
    `【标签】${tags.map((tag) => `${tag.name}（${tag.desc}）`).join('；') || '无'}。`,
    `【关系】信任 ${npc.relation.trust}，亲近 ${npc.relation.closeness}，畏惧 ${npc.relation.fear}，怨念 ${npc.relation.grievance}。`,
    `【语气】${TONE[event.type] || '平静'}`,
    detail.length ? `【细节】${detail.join('；')}。` : '',
    `【玩家】${run.player.name}，${run.player.abo}，${run.player.role}。`,
    '【要求】用 NPC 的标签和当前关系决定语气；写这一条事件被展开后的画面。',
  ].filter(Boolean).join('\n')

  return {
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
  }
}

export function localEventNarrative(run, event, npc) {
  const region = REGIONS[npc.home]
  const tags = tagDefsFor(npc.tags || [])
  const first = tags[0]
  const place = region?.name || npc.home

  const lines = {
    message: `${npc.name}的声音从频道里传来，背景里有很轻的电流声。“${event.text.replace(/^["“]|["”]$/g, '')}”他没有等你的回答，频道就暗了下去。`,
    gift: `他把东西推过来时没有看你的眼睛。${event.text} 你注意到他的手指在边缘停了一下，像是还有话没说。`,
    favor: `他提起这件事的时候，先看了一眼别处。${event.text} 在${place}，开口求人从来不是一件轻松的事。`,
    quest: `他把星图铺在台面上，指尖停在一个没有名字的坐标。“${event.text.replace(/^["“]|["”]$/g, '')}”他没有催你，但也没有把星图收起来。`,
    romance: `他约你的时候，语气比平时轻。${event.text} 你能听出他在等一个不确定的答案。`,
    conflict: `他挡在你面前，先没有提高声音。${event.text} ${first ? `以他的性子，这已经算是克制。` : '但你知道这件事不会就这么过去。'}`,
    gossip: `他把声音压得很低，像是怕被货舱里的其他人听见。${event.text} 说完之后，他观察着你的反应。`,
  }

  return lines[event.type] ||
    `${event.text} ${npc.name}没有再多解释，但这句话在${place}的噪音里留了一会儿。`
}

export function stripNarrative(text) {
  return String(text || '')
    .replace(/```[a-zA-Z]*\s*/g, '')
    .replace(/```/g, '')
    .replace(/^["“]|["”]$/g, '')
    .replace(/^\s*叙述[:：]\s*/, '')
    .trim()
    .slice(0, 500)
}
