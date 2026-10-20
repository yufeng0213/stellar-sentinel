/**
 * NPC 探知档案：点击后按关系阶段逐条生成。
 * 不预生成；LLM 只负责写这一段，阶段、条目与解锁由本地规则决定。
 */

import { REGIONS } from '../game-core/data.js'
import { longMemoryText } from '../game-core/memory.js'
import { PERSONALITY_LABELS } from '../game-core/npc.js'
import { tagDefsFor } from '../game-core/npc-tags.js'

export const LORE_TIERS = [
  {
    id: 'public',
    name: '公开档案',
    trust: 0,
    closeness: 0,
    slots: [
      { id: 'origin', label: '来处', prompt: '他从哪里来，为什么留在这片星区' },
      { id: 'routine', label: '日常', prompt: '他每天怎么过，常出现在哪里' },
      { id: 'voice', label: '说话方式', prompt: '他说话时的习惯、停顿或口头禅' },
    ],
  },
  {
    id: 'familiar',
    name: '熟悉的片段',
    trust: 25,
    closeness: 15,
    slots: [
      { id: 'past', label: '过去', prompt: '一段他不主动提的过去' },
      { id: 'habit', label: '习惯', prompt: '一个别人不太注意的小习惯' },
      { id: 'people', label: '在意的人', prompt: '他心里挂着的某个人或某段关系' },
    ],
  },
  {
    id: 'trusted',
    name: '信任的证词',
    trust: 45,
    closeness: 30,
    slots: [
      { id: 'secret', label: '秘密', prompt: '一件没有写进登记表的事' },
      { id: 'fear', label: '恐惧', prompt: '他真正害怕失去或面对的东西' },
      { id: 'goal', label: '正在做的事', prompt: '他眼下真正想完成的事' },
    ],
  },
  {
    id: 'close',
    name: '亲近的侧影',
    trust: 65,
    closeness: 50,
    slots: [
      { id: 'opinion', label: '对你的看法', prompt: '他没有直接说出口的对玩家的看法' },
      { id: 'softspot', label: '柔软的地方', prompt: '他不太承认的温柔或动摇' },
      { id: 'unsaid', label: '没说完的话', prompt: '一句他一直没说出口的话' },
    ],
  },
  {
    id: 'bonded',
    name: '交心的底片',
    trust: 80,
    closeness: 70,
    slots: [
      { id: 'wound', label: '最深的伤', prompt: '最深的一道伤，以及它留下的影响' },
      { id: 'wish', label: '真正的愿望', prompt: '如果不用考虑生存，他真正想做什么' },
      { id: 'cannotlose', label: '不能失去', prompt: '他现在最不能失去的东西' },
    ],
  },
]

export const LORE_TIER_BY_ID = Object.fromEntries(LORE_TIERS.map((tier) => [tier.id, tier]))

export function loreStatusFor(npc, tierId = null) {
  const entries = npc?.lore?.entries || []
  const relation = npc?.relation || { trust: 0, closeness: 0 }

  const tiers = LORE_TIERS.map((tier) => {
    const unlocked = tier.id === 'public' ||
      (relation.trust >= tier.trust && relation.closeness >= tier.closeness)
    const used = entries.filter((entry) => entry.tier === tier.id).length
    return {
      ...tier,
      unlocked,
      used,
      remaining: unlocked ? Math.max(0, tier.slots.length - used) : 0,
    }
  })

  let selected = tiers.find((tier) => tier.id === tierId)
  if (!selected) {
    selected = [...tiers].reverse().find((tier) => tier.unlocked && tier.remaining > 0) ||
      [...tiers].reverse().find((tier) => tier.unlocked) ||
      tiers[0]
  }

  const latest = entries.filter((entry) => entry.tier === selected.id).slice(-1)[0] || null
  const nextLocked = tiers.find((tier) => !tier.unlocked) || null

  return {
    tiers,
    selected,
    latest,
    nextLocked,
    total: entries.length,
  }
}

export function loreTarget(npc, tierId = null) {
  const status = loreStatusFor(npc, tierId)
  const tier = status.selected
  if (!tier.unlocked) {
    return {
      ok: false,
      message: `还不足以探知：需要信任 ${tier.trust}、亲近 ${tier.closeness}`,
    }
  }
  if (tier.remaining <= 0) return { ok: false, message: '这一层已经看完了' }
  const slot = tier.slots[tier.used]
  if (!slot) return { ok: false, message: '这一层已经看完了' }
  return { ok: true, tier, slot, status }
}

export function buildLoreMessages(run, npc, tier, slot) {
  const region = REGIONS[npc.home]
  const tags = tagDefsFor(npc.tags || [])
  const existing = (npc.lore?.entries || [])
    .filter((entry) => entry.tier === tier.id)
    .map((entry) => `- ${entry.slotLabel || entry.slot}：${entry.text}`)
    .join('\n') || '- 无'

  const personality = Object.entries(PERSONALITY_LABELS)
    .map(([key, label]) => `${label} ${npc.personality[key]}`)
    .join('，')
  const longMemory = longMemoryText(npc, 2)

  const system = [
    '你是《星穹哨向》的档案员，负责根据 NPC 的标签、关系与既有记录，补写一小段人物档案。',
    '只输出一段 70-140 字的中文正文，不要标题、列表、代码块、引号或解释。',
    '不要写数值、奖励或系统信息；不要替玩家行动；不要写露骨性内容。',
    '如果已有档案，不要重复或矛盾，只补充新的侧面。',
  ].join('\n')

  const user = [
    `【NPC】${npc.name}，${npc.abo}，${npc.role}，属于${npc.faction}，常驻${region?.name || npc.home}。`,
    `【标签】${tags.map((tag) => `${tag.name}（${tag.desc}）`).join('；') || '无'}。`,
    `【性格】${personality}。`,
    `【关系】信任 ${npc.relation.trust}，尊重 ${npc.relation.respect}，亲近 ${npc.relation.closeness}，畏惧 ${npc.relation.fear}，怨念 ${npc.relation.grievance}。`,
    `【玩家】${run.player.name}，${run.player.abo}，${run.player.role}。`,
    `【本次层级】${tier.name}。`,
    `【本次条目】${slot.label}：${slot.prompt}。`,
    '【长期记忆】',
    longMemory,
    '【已有档案】',
    existing,
    '【要求】写这一段档案，保持和标签、关系一致；不要直接复述标签名。',
  ].join('\n')

  return {
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
  }
}

export function localLore(run, npc, tier, slot) {
  const region = REGIONS[npc.home]
  const tags = tagDefsFor(npc.tags || [])
  const first = tags[0]
  const second = tags[1]
  const memory = npc.memory?.[0]?.text || ''
  const place = region?.name || npc.home

  const lines = {
    'public-origin': `${npc.name}常年在${place}活动，登记的公开身份是${npc.role}。${first?.desc || '关于他的来历，档案里只有很少几行。'}`,
    'public-routine': `他的一天大多围着${npc.interests?.[0] || '自己的事'}转。${npc.schedule?.[0] || `他常出现在${place}。`}`,
    'public-voice': `他说话${npc.personality.aggression > 60 ? '直接，句子短，不喜欢绕弯' : '不算快，常用停顿观察对方的反应'}。${first?.prompt || ''}`,
    'familiar-past': `他不太主动提过去。${first?.desc || ''} 只有在话题碰到${npc.interests?.[0] || '某个旧名字'}时，他才会多说两句。`,
    'familiar-habit': `他有一个不太起眼的习惯：${second?.desc || '总把东西放在伸手就能拿到的地方'}。熟悉之后，才会发现他一直在这么做。`,
    'familiar-people': `他嘴上很少提人，但${memory || `在${place}有人和他保持着固定的联系`}。他记得谁帮过他，也记得谁没有。`,
    'trusted-secret': `有一件事没有写进登记表：${second?.desc || '他曾经做过一个让自己后悔的选择'}。他没有否认，只是不愿把细节说全。`,
    'trusted-fear': `他真正害怕的不是死，而是${first?.desc ? '再次回到那种没人可等的处境' : '自己判断错了人'}。所以他总留一条退路。`,
    'trusted-goal': `他眼下最想完成的，是把自己的位置从${place}挪开。${npc.interests?.[1] ? `他一直在为${npc.interests[1]}做准备。` : '具体要去哪里，他还没说。'}`,
    'close-opinion': `他对你的看法比说出口的复杂。信任已经到了 ${npc.relation.trust}，但他仍会在你靠近时先观察一秒，再决定要不要让开。`,
    'close-softspot': `他不太承认自己会心软。可你提到${npc.interests?.[0] || '某件小事'}时，他的语气会慢下来，像是怕说重了。`,
    'close-unsaid': `有一句话他一直没说。也许和${place}有关，也许和某个已经不在了的人有关。他把它留在每次道别之前。`,
    'bonded-wound': `最深的那道伤不是身上的。${first?.desc || '他曾经失去过一个自己没能留住的人'}。从那以后，他习惯先做好最坏的准备。`,
    'bonded-wish': `如果不用考虑生存，他想离开${place}，去看看${npc.interests?.[0] || '星图边缘'}。这个愿望他从未对别人完整说过。`,
    'bonded-cannotlose': `他现在最不能失去的，是${second?.desc ? '自己好不容易建立起来的那点信任' : '一个还愿意等他回来的人'}。所以他才会在离开前反复确认。`,
  }

  return lines[`${tier.id}-${slot.id}`] ||
    `${npc.name}的档案里多了一段模糊的记录。${first?.desc || '关于他的过去，仍有空白。'}`
}

export function stripLore(text) {
  return String(text || '')
    .replace(/```[a-zA-Z]*\s*/g, '')
    .replace(/```/g, '')
    .replace(/^["“]|["”]$/g, '')
    .replace(/^\s*档案[:：]\s*/, '')
    .trim()
    .slice(0, 500)
}
