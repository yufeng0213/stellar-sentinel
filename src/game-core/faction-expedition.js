/**
 * 派系远征节点：把差事战斗放到星图上，而不是在城市页直接开打。
 */

import { FACTION_FAVOR_CHAINS, FACTION_FAVOR_ENEMIES } from './faction-favor-chain.js'

export function createFactionExpedition(run, factionId, choiceId) {
  if (!run?.map?.nodes || !run.location) return { ok: false, message: '当前没有星图' }
  const current = run.map.nodes[run.location]
  const enemy = FACTION_FAVOR_ENEMIES[factionId]
  const chain = FACTION_FAVOR_CHAINS[factionId]
  if (!current || !enemy || !chain) return { ok: false, message: '没有这个派系远征' }

  const layerIndex = run.map.layers.findIndex((ids) => ids.includes(run.location))
  const layer = Math.max(0, layerIndex)
  let nodeId = `faction-expedition-${factionId}-${choiceId}-${run.day}`
  while (run.map.nodes[nodeId]) nodeId = `${nodeId}-a`

  const downstream = [...(current.next || [])]
  const node = {
    id: nodeId,
    type: 'faction',
    region: current.region,
    accent: current.accent,
    act: current.act,
    title: chain.name,
    subtitle: `派系远征 · ${factionId === 'tower' ? '白塔残余' : factionId === 'market' ? '黑市网络' : factionId === 'drifters' ? '漂流者' : '低语者'}`,
    enemy: {
      name: enemy.name,
      hp: enemy.hp,
      morale: enemy.morale,
      attack: enemy.attack,
      traits: [...enemy.traits],
    },
    factionExpedition: {
      factionId,
      choiceId,
      name: chain.name,
    },
    next: downstream,
    prev: [current.id],
  }

  run.map.nodes[nodeId] = node
  if (!run.map.layers[layer]) run.map.layers[layer] = []
  if (!run.map.layers[layer].includes(nodeId)) run.map.layers[layer].push(nodeId)
  if (!Array.isArray(current.next)) current.next = []
  if (!current.next.includes(nodeId)) current.next.push(nodeId)
  return { ok: true, node }
}

export function completeFactionExpedition(run, nodeId) {
  const node = run.map.nodes?.[nodeId]
  if (!node?.factionExpedition) return { ok: false }
  node.cleared = true
  if (!run.cleared.includes(nodeId)) run.cleared.push(nodeId)
  run.nodeState[nodeId] = { resolved: true, text: '派系远征已经解决。' }
  return { ok: true, node }
}
