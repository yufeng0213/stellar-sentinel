/**
 * 吃醋对峙链：吃醋的 NPC 先去警告另一个 NPC，对方再来找玩家告状。
 */

import { createRng } from './rng.js'

const clamp = (value, min = 0, max = 100) => Math.min(max, Math.max(min, value))

function hasTag(npc, tag) {
  return Boolean(npc?.tags?.includes(tag) || npc?.tagIds?.includes(tag))
}

function pushWorld(run, text, kind = 'story') {
  if (!Array.isArray(run.worldEvents)) run.worldEvents = []
  run.worldEvents.unshift({ day: run.day, text, kind })
  if (run.worldEvents.length > 60) run.worldEvents.length = 60
}

function findEdge(run, aId, bId) {
  let edge = (run.npcEdges || []).find((item) => (
    (item.a === aId && item.b === bId) || (item.a === bId && item.b === aId)
  ))
  if (!edge) {
    edge = {
      a: aId,
      b: bId,
      kind: 'acquaintance',
      trust: 30,
      closeness: 20,
      rivalry: 30,
      affinity: 0,
    }
    run.npcEdges = run.npcEdges || []
    run.npcEdges.push(edge)
  }
  return edge
}

function rivalCandidates(run, jealous) {
  return Object.values(run.npcs || {})
    .filter((npc) => (
      npc.id !== jealous.id &&
      npc.alive &&
      npc.active !== false &&
      !npc.life?.leftCity &&
      (npc.lover || npc.ambiguous)
    ))
    .sort((a, b) => (b.relation?.closeness || 0) - (a.relation?.closeness || 0))
}

export function startJealousyConfrontation(run, jealousId, rivalId) {
  const jealous = run.npcs?.[jealousId]
  const rival = run.npcs?.[rivalId]
  if (!jealous || !rival || !jealous.alive || !rival.alive) return { ok: false, message: '当事人不在了' }
  if (jealous.id === rival.id) return { ok: false }
  if (!(jealous.lover || jealous.ambiguous)) return { ok: false, message: '这个人还没有吃醋的理由' }

  run.jealousyChains = Array.isArray(run.jealousyChains) ? run.jealousyChains : []
  const existing = run.jealousyChains.find((chain) => (
    !chain.resolved &&
    ((chain.jealousId === jealousId && chain.rivalId === rivalId) ||
      (chain.jealousId === rivalId && chain.rivalId === jealousId))
  ))
  if (existing) return { ok: true, chain: existing, event: null }

  const edge = findEdge(run, jealous.id, rival.id)
  const chain = {
    id: `jealousy-${jealous.id}-${rival.id}-${run.day}`,
    day: run.day,
    jealousId: jealous.id,
    rivalId: rival.id,
    resolved: false,
    resolvedDay: 0,
    choice: null,
  }
  run.jealousyChains.push(chain)
  rival.relation.grievance = clamp(rival.relation.grievance + 6)
  rival.relation.trust = clamp(rival.relation.trust - 3)
  jealous.relation.grievance = clamp(jealous.relation.grievance - 2)
  edge.rivalry = clamp(edge.rivalry + 8)
  edge.trust = clamp(edge.trust - 3)
  pushWorld(
    run,
    `${jealous.name} 在空港外拦住 ${rival.name}，警告他离你远一点。${rival.name} 没有当场答应。`,
    'bad'
  )

  const event = {
    id: `jealousy-report-${chain.id}`,
    day: run.day,
    week: Math.floor((run.day - 1) / 7) + 1,
    npcId: rival.id,
    type: 'jealousy_report',
    status: 'pending',
    title: `${rival.name} 来找你`,
    text: `${rival.name} 站在门口，先看了看走廊。\n\n“${jealous.name} 今天在空港外拦住我。他让我离你远一点。”\n\n他没有问你要站在哪一边，但他在等。`,
    payload: { chainId: chain.id, jealousId: jealous.id, rivalId: rival.id },
    choices: [
      { id: 'side_rival', label: '站在告状的人这边' },
      { id: 'side_jealous', label: '先去找吃醋的人' },
      { id: 'mediate', label: '把两个人叫到一起' },
      { id: 'boundary', label: '让两个人各自划清边界' },
    ],
  }
  return { ok: true, chain, event }
}

export function processJealousyConfrontation(run) {
  if (!run?.npcs) return null
  run.jealousyChains = Array.isArray(run.jealousyChains) ? run.jealousyChains : []
  if (run.inbox?.some((event) => event.status === 'pending' && event.type === 'jealousy_report')) return null
  if (run.jealousyChains.some((chain) => !chain.resolved)) return null

  const rng = createRng(`${run.seed}:jealousy:${run.day}`)
  const jealousCandidates = Object.values(run.npcs).filter((npc) => (
    npc.alive &&
    npc.active !== false &&
    !npc.life?.leftCity &&
    !npc.quarrel?.active &&
    (npc.lover || npc.ambiguous) &&
    rivalCandidates(run, npc).length
  ))
  if (!jealousCandidates.length) return null
  const jealous = rng.pick(jealousCandidates)
  const rival = rng.pick(rivalCandidates(run, jealous))
  const chance = 0.14 + (hasTag(jealous, 'jealous') ? 0.24 : 0) + Math.min(0.2, (jealous.strain || 0) / 400)
  if (!rng.chance(chance)) return null
  return startJealousyConfrontation(run, jealous.id, rival.id)
}

export function resolveJealousyReport(run, event, choiceId) {
  const chain = (run.jealousyChains || []).find((item) => item.id === event.payload?.chainId)
  if (!chain || chain.resolved) return { error: '这场对峙已经结束了' }
  const jealous = run.npcs?.[chain.jealousId]
  const rival = run.npcs?.[chain.rivalId]
  if (!jealous || !rival) return { error: '当事人已经不在空港' }
  const edge = findEdge(run, jealous.id, rival.id)
  let text = ''

  if (choiceId === 'side_rival') {
    rival.relation.trust = clamp(rival.relation.trust + 6)
    rival.relation.closeness = clamp(rival.relation.closeness + 3)
    jealous.relation.grievance = clamp(jealous.relation.grievance + 12)
    jealous.relation.closeness = clamp(jealous.relation.closeness - 4)
    edge.rivalry = clamp(edge.rivalry + 10)
    text = `你选择站在${rival.name}这边。${jealous.name}没有当场发作，只是把这件事记了下来。`
  } else if (choiceId === 'side_jealous') {
    jealous.relation.trust = clamp(jealous.relation.trust + 6)
    jealous.relation.closeness = clamp(jealous.relation.closeness + 3)
    rival.relation.grievance = clamp(rival.relation.grievance + 8)
    rival.relation.closeness = clamp(rival.relation.closeness - 2)
    edge.rivalry = clamp(edge.rivalry + 6)
    text = `你去找了${jealous.name}。他听完之后安静下来，但${rival.name}那边不会没有感觉。`
  } else if (choiceId === 'mediate') {
    jealous.relation.trust = clamp(jealous.relation.trust + 3)
    rival.relation.trust = clamp(rival.relation.trust + 3)
    jealous.relation.grievance = clamp(jealous.relation.grievance - 5)
    rival.relation.grievance = clamp(rival.relation.grievance - 5)
    edge.rivalry = clamp(edge.rivalry - 12)
    edge.trust = clamp(edge.trust + 4)
    run.player.mental = Math.max(0, run.player.mental - 2)
    text = '你把两个人叫到一起。话没有说得很好看，但至少没有人再替对方编故事。'
  } else if (choiceId === 'boundary') {
    jealous.relation.trust = clamp(jealous.relation.trust + 2)
    rival.relation.trust = clamp(rival.relation.trust + 2)
    jealous.relation.closeness = clamp(jealous.relation.closeness - 2)
    rival.relation.closeness = clamp(rival.relation.closeness - 2)
    edge.rivalry = clamp(edge.rivalry - 5)
    text = '你把边界说清楚了。两个人都没有完全满意，但都知道下一次不能再越过去。'
  } else {
    return { error: '没有这个选择' }
  }

  chain.resolved = true
  chain.resolvedDay = run.day
  chain.choice = choiceId
  pushWorld(run, `${rival.name} 来找你谈 ${jealous.name} 的事。${text}`, 'story')
  return text
}
