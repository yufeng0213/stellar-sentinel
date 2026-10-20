/**
 * 访客个人剧情：每名临时访客有一条三阶段的小故事。
 * 只用本地结构；关系、物品和派系声望负责推进。
 */

import { ITEMS } from './data.js'
import { adjustReputation } from './faction.js'
import { createRng } from './rng.js'

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

export const VISITOR_STORIES = [
  {
    id: 'debt',
    title: '欠债的人',
    hook: '他欠黑市一笔钱，利息每天都在长。',
    steps: [
      { name: '听他说完', text: '他把欠条摊在桌上，手指一直按着最后一行数字。' },
      { name: '借他一笔', cost: 25, text: '你把信用点推过去。他没有道谢，只是把欠条折得很小。' },
      { name: '替他把债清了', text: '债主收了钱，把欠条撕成两半。他站在巷口，第一次没有急着走。' },
    ],
    reward: { credits: 55, item: 'chip' },
  },
  {
    id: 'missing',
    title: '失踪的搭档',
    hook: '他的搭档在上一趟远征里没有回来。',
    steps: [
      { name: '问清楚最后一条航线', text: '他记得搭档最后停在一个没有名字的节点。' },
      { name: '陪他去找', cost: 25, text: '你们在废墟里走了很久，只找到一枚被烧黑的识别牌。' },
      { name: '把识别牌带回来', text: '他把识别牌收进内袋，像是终于允许自己停下来。' },
    ],
    reward: { credits: 45, item: 'relic' },
  },
  {
    id: 'escape',
    title: '想离开空港的人',
    hook: '他想搭下一班货船离开，但缺一份通行证。',
    steps: [
      { name: '听他说完', text: '他说自己不是逃犯，只是不想再替同一批人搬货。' },
      { name: '替他凑通行费', cost: 25, text: '你把通行费补上。他反复确认了三遍，才把票收好。' },
      { name: '送他到城门', text: '货船起飞时，他没有回头。你看见他把旧工牌留在了闸口。' },
    ],
    reward: { credits: 50, item: 'ration' },
  },
  {
    id: 'package',
    title: '替人带的东西',
    hook: '他有一只不能打开的箱子，要送到城外。',
    steps: [
      { name: '问箱子里是什么', text: '他说不知道，也不想知道。箱子侧面有一道白塔封条。' },
      { name: '帮他避开检查', cost: 25, text: '你带他绕过了巡夜队。箱子一直很轻，轻得不像装着货。' },
      { name: '把箱子送到地方', text: '收货的人只点了点头。他回来后，把封条残片给了你。' },
    ],
    reward: { credits: 60, item: 'cold' },
  },
]

function hashText(text) {
  let hash = 0
  for (let index = 0; index < text.length; index += 1) {
    hash = ((hash << 5) - hash + text.charCodeAt(index)) >>> 0
  }
  return hash
}

export function ensureVisitorStory(run, npc) {
  if (!npc?.visitor) return null
  if (npc.story && VISITOR_STORIES.some((item) => item.id === npc.story.templateId)) return npc.story
  const rng = createRng(`${run.seed}:visitor-story:${npc.id}`)
  const template = VISITOR_STORIES[hashText(`${npc.id}:${(npc.tags || []).join(',')}`) % VISITOR_STORIES.length]
  npc.story = {
    templateId: template.id,
    stage: 0,
    completed: false,
    startedDay: run.day,
    log: [],
  }
  return npc.story
}

export function visitorStoryTemplate(npc) {
  return VISITOR_STORIES.find((item) => item.id === npc?.story?.templateId) || null
}

export function visitorStoryStatus(run, npc) {
  const story = ensureVisitorStory(run, npc)
  const template = visitorStoryTemplate(npc)
  if (!story || !template) return null
  const step = template.steps[story.stage] || null
  const trust = npc.relation?.trust || 0
  const closeness = npc.relation?.closeness || 0
  const cost = step?.cost || 0
  return {
    template,
    story,
    step,
    stage: story.stage,
    completed: story.completed,
    trust,
    closeness,
    cost,
    canAdvance: !story.completed && (
      story.stage === 0 ? trust >= 15
        : story.stage === 1 ? trust >= 35 && (run.player.credits || 0) >= cost
          : trust >= 55 && closeness >= 35
    ),
  }
}

export function advanceVisitorStory(run, npcId) {
  const npc = run?.npcs?.[npcId]
  if (!npc?.visitor) return { ok: false, message: '只有访客有自己的故事' }
  const status = visitorStoryStatus(run, npc)
  if (!status) return { ok: false, message: '找不到这段故事' }
  if (status.completed) return { ok: false, message: '这段故事已经结束了' }
  if (!status.canAdvance) {
    if (status.stage === 1) return { ok: false, message: `需要信任 35 和 ${status.cost} 信用点` }
    return { ok: false, message: status.stage === 0 ? '需要信任 15' : '需要信任 55、亲近 35' }
  }

  const story = npc.story
  const template = status.template
  const step = template.steps[story.stage]
  if (step.cost) run.player.credits -= step.cost

  let text = step.text
  let reward = null
  if (story.stage === 0) {
    npc.relation.trust = clamp(npc.relation.trust + 3, 0, 100)
    npc.relation.closeness = clamp(npc.relation.closeness + 2, 0, 100)
    story.stage = 1
  } else if (story.stage === 1) {
    npc.relation.trust = clamp(npc.relation.trust + 5, 0, 100)
    npc.relation.closeness = clamp(npc.relation.closeness + 3, 0, 100)
    story.stage = 2
  } else {
    story.completed = true
    story.completedDay = run.day
    npc.relation.trust = clamp(npc.relation.trust + 8, 0, 100)
    npc.relation.closeness = clamp(npc.relation.closeness + 6, 0, 100)
    reward = template.reward
    run.player.credits += reward.credits || 0
    if (reward.item && ITEMS[reward.item]) {
      run.inv[reward.item] = (run.inv[reward.item] || 0) + 1
    }
    adjustReputation(run, npc.faction, 8, '访客故事')
    text = `${text}\n\n${npc.name}把这件事记住了。`
  }

  story.log.push({ day: run.day, text })
  return { ok: true, text, stage: story.stage, completed: story.completed, reward }
}
