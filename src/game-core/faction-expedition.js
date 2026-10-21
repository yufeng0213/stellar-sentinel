/**
 * 派系远征：星图上的三段连续节点。
 * 接触点 → 敌方据点 → 善后，最后改变城市控制方与派系声望。
 */

import { adjustReputation } from './faction.js'
import { FACTION_FAVOR_CHAINS, FACTION_FAVOR_ENEMIES } from './faction-favor-chain.js'

const FACTION_NAMES = {
  tower: '白塔残余',
  market: '黑市网络',
  drifters: '漂流者',
  whisper: '低语者',
}

const EXACTIONS = {
  tower: { approach: '旧塔的清道夫把入口封了。', aftermath: '白塔的人已经在门外等着接手。' },
  market: { approach: '仓库外有两个护卫，正在核对货单。', aftermath: '市场的人带着账本来了。' },
  drifters: { approach: '矿道深处还有东西在动。', aftermath: '漂流者想在这里留下一盏灯。' },
  whisper: { approach: '静默室的门没有锁，但里面有人。', aftermath: '低语者站在门口，等你决定这里归谁。' },
}

export function createFactionExpedition(run, factionId, choiceId) {
  if (!run?.map?.nodes || !run.location) return { ok: false, message: '当前没有星图' }
  const current = run.map.nodes[run.location]
  const enemy = FACTION_FAVOR_ENEMIES[factionId]
  const chain = FACTION_FAVOR_CHAINS[factionId]
  if (!current || !enemy || !chain) return { ok: false, message: '没有这个派系远征' }

  const layerIndex = run.map.layers.findIndex((ids) => ids.includes(run.location))
  const layer = Math.max(0, layerIndex)
  const chainId = `faction-expedition-${factionId}-${choiceId}-${run.day}`
  let suffix = ''
  while (Object.keys(run.map.nodes).some((id) => id.startsWith(chainId + suffix))) suffix += 'a'
  const base = `${chainId}${suffix}`
  const downstream = [...(current.next || [])]
  const factionName = FACTION_NAMES[factionId] || '派系'

  const common = {
    type: 'faction',
    region: current.region,
    accent: current.accent,
    act: current.act,
    subtitle: `派系远征 · ${factionName}`,
    factionExpedition: {
      chainId,
      factionId,
      choiceId,
      name: chain.name,
    },
  }

  const approachId = `${base}-approach`
  const battleId = `${base}-battle`
  const aftermathId = `${base}-aftermath`

  const approach = {
    ...common,
    id: approachId,
    title: `${chain.name} · 接触点`,
    text: EXACTIONS[factionId]?.approach || '前面就是派系标出的地点。',
    factionExpedition: { ...common.factionExpedition, step: 'approach', nextId: battleId },
    next: [battleId],
    prev: [current.id],
  }
  const battle = {
    ...common,
    id: battleId,
    title: enemy.name,
    text: `地点里只剩下${enemy.name}。它没有退路，你也没有。`,
    enemy: {
      name: enemy.name,
      hp: enemy.hp,
      morale: enemy.morale,
      attack: enemy.attack,
      traits: [...enemy.traits],
    },
    factionExpedition: { ...common.factionExpedition, step: 'battle', nextId: aftermathId },
    next: [aftermathId],
    prev: [approachId],
  }
  const aftermath = {
    ...common,
    id: aftermathId,
    title: `${chain.name} · 善后`,
    text: EXACTIONS[factionId]?.aftermath || '事情办完了。现在要决定这里归谁。',
    factionExpedition: { ...common.factionExpedition, step: 'aftermath' },
    next: downstream,
    prev: [battleId],
  }

  run.map.nodes[approachId] = approach
  run.map.nodes[battleId] = battle
  run.map.nodes[aftermathId] = aftermath
  if (!run.map.layers[layer]) run.map.layers[layer] = []
  ;[approachId, battleId, aftermathId].forEach((id) => {
    if (!run.map.layers[layer].includes(id)) run.map.layers[layer].push(id)
  })
  if (!Array.isArray(current.next)) current.next = []
  if (!current.next.includes(approachId)) current.next.push(approachId)
  return { ok: true, nodes: [approach, battle, aftermath], node: approach }
}

export function resolveFactionExpeditionApproach(run, nodeId, choiceId) {
  const node = run.map.nodes?.[nodeId]
  if (!node?.factionExpedition || node.factionExpedition.step !== 'approach') {
    return { ok: false, message: '这里不是接触点' }
  }
  if (run.location !== nodeId) return { ok: false, message: '先抵达节点' }
  if (node.cleared) return { ok: false, message: '这里已经处理过了' }
  let text = ''
  if (choiceId === 'scout') {
    run.player.mental = Math.max(0, run.player.mental - 2)
    text = '你绕到侧面，记下了门口守卫换班的时间。再往前走时，脚步轻了一点。'
  } else if (choiceId === 'press') {
    run.player.hp = Math.max(1, run.player.hp - 4)
    text = '你从正门走进去。有人喊了一声，但没有人真的拦你。'
  } else {
    return { ok: false, message: '没有这个选择' }
  }
  node.cleared = true
  if (!run.cleared.includes(nodeId)) run.cleared.push(nodeId)
  run.nodeState[nodeId] = { resolved: true, text }
  return { ok: true, node, text }
}

export function resolveFactionExpeditionOutcome(run, nodeId, choiceId) {
  const node = run.map.nodes?.[nodeId]
  const info = node?.factionExpedition
  if (!info || info.step !== 'aftermath') return { ok: false, message: '这里不是善后节点' }
  if (run.location !== nodeId) return { ok: false, message: '先抵达节点' }
  if (node.cleared) return { ok: false, message: '这里已经处理过了' }
  const factionId = info.factionId
  let text = ''
  let credits = 0
  if (choiceId === 'faction') {
    adjustReputation(run, factionId, 12, '派系远征')
    if (run.city) {
      run.city.controlledBy = factionId
      run.city.influence = { ...(run.city.influence || {}) }
      run.city.influence[factionId] = (run.city.influence[factionId] || 0) + 15
      run.city.factionExpedition = {
        day: run.day,
        factionId,
        outcome: 'faction',
        text: `${FACTION_NAMES[factionId]}接管了这里。`,
      }
    }
    text = `你把地点交给${FACTION_NAMES[factionId]}。他们的人来得很快，像是早就知道门在哪里。城市控制权转到他们手里。`
  } else if (choiceId === 'city') {
    adjustReputation(run, factionId, 3, '派系远征')
    credits = 25
    run.player.credits += credits
    run.player.mental = Math.min(run.player.mentalMax, run.player.mental + 4)
    if (run.city) {
      run.city.controlledBy = 'council'
      run.city.factionExpedition = {
        day: run.day,
        factionId,
        outcome: 'city',
        text: '城市议会接管了这里。',
      }
    }
    text = '你没有让派系独占这里。城市议会接管了地点，派系的人不太高兴，但也没有翻脸。'
  } else if (choiceId === 'crew') {
    adjustReputation(run, factionId, -5, '派系远征')
    credits = 40
    run.player.credits += credits
    run.inv.scrap = (run.inv.scrap || 0) + 3
    if (run.city) {
      run.city.controlledBy = 'crew'
      run.city.factionExpedition = {
        day: run.day,
        factionId,
        outcome: 'crew',
        text: '方舟接管了这里。',
      }
    }
    text = '你把能搬走的东西都带回了方舟。这里暂时归你，但派系不会忘记这件事。'
  } else {
    return { ok: false, message: '没有这个选择' }
  }
  node.cleared = true
  if (!run.cleared.includes(nodeId)) run.cleared.push(nodeId)
  run.nodeState[nodeId] = { resolved: true, text }
  return { ok: true, node, text, credits }
}

export function completeFactionExpedition(run, nodeId) {
  const node = run.map.nodes?.[nodeId]
  if (!node?.factionExpedition) return { ok: false }
  node.cleared = true
  if (!run.cleared.includes(nodeId)) run.cleared.push(nodeId)
  run.nodeState[nodeId] = { resolved: true, text: '派系远征已经解决。' }
  return { ok: true, node }
}
