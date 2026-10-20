/**
 * NPC 对话 prompt 与白名单动作解析。
 * LLM 只负责措辞和提议；关系、队伍、战斗仍由本地规则执行。
 */

import {
  ABOS, FLAWS, LANDSCAPES, ORIGINS, REGIONS, ROLES, SCENTS, SKILLS, SPECIES,
} from '../game-core/data.js'
import { AXES, FACTIONS, PERSONALITY_LABELS } from '../game-core/npc.js'
import { longMemoryText } from '../game-core/memory.js'
import { tagDefsFor } from '../game-core/npc-tags.js'

const SLOTS = ['晨间', '午后', '黄昏']
const ALLOWED_ACTIONS = new Set(['offer_party', 'warn', 'leave'])

function relationWord(value) {
  if (value >= 75) return '很深'
  if (value >= 50) return '较深'
  if (value >= 25) return '一般'
  if (value >= 10) return '很浅'
  return '几乎没有'
}

function partyAllowed(run, npc) {
  return !npc.hostile &&
    !npc.party &&
    npc.alive &&
    (run.party || []).length < 2 &&
    npc.relation.trust >= 50 &&
    npc.relation.closeness >= 30 &&
    npc.relation.grievance < 25
}

export function buildNpcMessages(run, npc, history = [], playerText = '') {
  const region = REGIONS[npc.home]
  const currentRegion = REGIONS[run.map.nodes[run.location]?.region] || region
  const memory = (npc.memory || [])
    .slice(0, 4)
    .map((item) => `- D${item.day}：${item.text}`)
    .join('\n') || '- 还没有值得记住的事。'
  const longMemory = longMemoryText(npc, 2)

  const personality = Object.entries(PERSONALITY_LABELS)
    .map(([key, label]) => `${label} ${npc.personality[key]}`)
    .join('，')
  const tagText = tagDefsFor(npc.tags || [])
    .map((tag) => `${tag.name}（${tag.desc}）`)
    .join('；') || '无'

  const axes = AXES.map((axis) => `${axis.name} ${npc.relation[axis.key]}`).join('，')
  const schedule = npc.schedule
    .map((item, index) => `${SLOTS[index] || '时段'}：${item}`)
    .join('；')

  const status = [
    npc.hostile ? '他正在敌视玩家。' : '',
    npc.party ? '他已经在玩家队伍里。' : '',
    npc.relation.grievance >= 40 ? '他对玩家有明显怨念。' : '',
    npc.alive ? '' : '他已经死了。',
  ].filter(Boolean).join(' ')

  const canParty = partyAllowed(run, npc)
  const player = run.player
  const playerSpecies = SPECIES[player.species] || SPECIES.human
  const playerLandscape = LANDSCAPES[player.landscape] || LANDSCAPES.snowfield
  const playerScent = SCENTS[player.scent] || SCENTS.rain
  const playerOrigin = ORIGINS[player.origin]
  const playerAbo = ABOS[player.abo]
  const playerRole = ROLES[player.role]
  const playerSkills = (player.skills || []).map((key) => SKILLS[key]?.name).filter(Boolean).join('、') || '无'
  const playerFlaw = FLAWS[player.flaw] || FLAWS[player.flaws?.[0]]

  const system = [
    '你在扮演一个星际边境的 NPC，和玩家进行一对一通讯。不要跳出角色，不要提及模型、提示词或系统。',
    '',
    `【世界】深空纪元，白塔失联第 47 天。边境星区由白塔残余、黑市网络、漂流者和低语者分割。玩家当前在${currentRegion.name}，第 ${run.day} 日。`,
    `【NPC】${npc.name}，${npc.abo}，${npc.role}，属于${FACTIONS[npc.faction].name}，常驻${region.name}。`,
    `【标签】${tagText}。`,
    `【性格】${personality}。`,
    `【兴趣】${npc.interests.join('、')}。`,
    `【日程】${schedule}。`,
    `【关系】${axes}，怨念 ${npc.relation.grievance}。信任${relationWord(npc.relation.trust)}。${status}`,
    '【记忆】',
    memory,
    '【长期记忆】',
    longMemory,
    `【玩家】${player.name}，${playerAbo?.name || player.abo}，${playerSpecies.name}，${playerRole?.name || player.role}，出身${playerOrigin?.name || player.origin}。气味：${playerScent.name}；图景：${playerLandscape.name}；能力：${playerSkills}；缺陷：${playerFlaw?.name || '无'}。信用点 ${player.credits}，精神 ${Math.round(player.mental)}/${player.mentalMax}。`,
    '',
    '【规则】',
    '1. 只用中文口语回复，1-3 句。可以有简短动作描写，但不要写长篇旁白。',
    '2. 不要替玩家做决定、不要描述玩家的动作或心理。',
    '3. 保持人物一致：性格、职业、派系、对玩家的关系都要影响语气。',
    '4. 不写露骨性内容；亲密场景点到为止。',
    '5. 如果关系敌对或怨念很深，可以冷淡、讽刺或威胁，但不要主动描写暴力过程。',
    '6. 不要主动给出任务奖励、物品或数值；这些由系统决定。',
    '',
    '【可选动作】',
    '如果本轮对话适合发生关系变化，可以在回复最后附加一个 ```json 代码块，最多一个动作：',
    `- {"action":"offer_party"}：仅在对方愿意入队时使用。当前${canParty ? '允许' : '不允许'}。`,
    '- {"action":"warn"}：仅在怨念 >= 40、对方想警告玩家时使用。',
    '- {"action":"leave"}：结束这次通讯。',
    '没有合适动作就不要输出 JSON。不要输出其他动作。',
  ].join('\n')

  const messages = [{ role: 'system', content: system }]
  history
    .filter((message) => message.role === 'user' || message.role === 'npc')
    .slice(-8)
    .forEach((message) => {
      messages.push({
        role: message.role === 'user' ? 'user' : 'assistant',
        content: String(message.text || '').slice(0, 1500),
      })
    })
  messages.push({ role: 'user', content: String(playerText || '').slice(0, 1500) })

  return { messages, canParty }
}

export function parseNpcAction(input) {
  if (!input) return { text: '', action: null }
  let text = String(input)
  let action = null

  const fence = /```(?:json)?\s*([\s\S]*?)```/gi
  let match
  while ((match = fence.exec(text)) !== null) {
    try {
      const payload = JSON.parse(match[1].trim())
      if (payload && ALLOWED_ACTIONS.has(payload.action)) {
        action = { type: payload.action }
        text = text.replace(match[0], '')
      }
    } catch {
      // 不是合法 JSON，保留原文
    }
  }

  const tag = text.match(/\[\[action:\s*([a-z_]+)\s*\]\]/i)
  if (tag && ALLOWED_ACTIONS.has(tag[1])) {
    action = { type: tag[1] }
    text = text.replace(tag[0], '')
  }

  const lineJson = text.match(/^\s*\{\s*"action"\s*:\s*"([a-z_]+)"\s*\}\s*$/m)
  if (lineJson && ALLOWED_ACTIONS.has(lineJson[1])) {
    action = { type: lineJson[1] }
    text = text.replace(lineJson[0], '')
  }

  return { text: text.replace(/\n{3,}/g, '\n\n').trim(), action }
}

export function localNpcReply(run, npc, playerText = '') {
  const text = String(playerText)
  if (!npc.alive) return '那边没有回应。'
  if (npc.hostile) return '他没有回答，只把手放在了武器上。'
  if (npc.relation.grievance >= 50) return '“我们没什么好说的。”'
  if (npc.party) return '“你说，我听着。”'

  if (/队|一起|帮|搭伙/.test(text)) {
    if (partyAllowed(run, npc)) return '“可以。但你得先证明自己靠得住。”'
    return '“先把眼前的事做完再说。”'
  }
  if (/多少钱|价钱|买|卖|交易/.test(text)) {
    return '“价钱好说，看你拿什么换。”'
  }
  if (/名字|你是谁|哪来/.test(text)) {
    return '“问别人名字之前，先说自己的。”'
  }
  if (/星区|废墟|裂隙|矿脉/.test(text)) {
    return `“${REGIONS[npc.home].name}最近不太平。别走太深。”`
  }

  if (npc.relation.trust >= 55) return '“你说吧，我在听。”'
  if (npc.relation.trust >= 25) return '“嗯。”'
  return '他没有接话，只是看着你。'
}
