/**
 * 校准树：不升级角色等级，用少量节点把装备、牌组和探索风格连起来。
 * 点数只来自里程碑（开局、首领、章节），不需要刷经验。
 */

import { gearSetState } from './gear.js'

export const CALIBRATION_BRANCHES = {
  sentinel: {
    id: 'sentinel',
    name: '哨兵',
    desc: '把每一次出手变得更重、更准。',
    color: 'red',
    nodes: [
      { id: 'sentinel_opening', name: '先手', desc: '每回合第一张攻击牌伤害 +2。', effect: { firstAttack: 2 } },
      { id: 'sentinel_breaker', name: '破甲', desc: '攻击带护甲的目标时伤害 +2。', effect: { armor: 2 } },
      { id: 'sentinel_execution', name: '处决线', desc: '对生命低于 35% 的目标伤害 +2。', effect: { execute: 2 } },
      { id: 'sentinel_counter', name: '反击本能', desc: '战斗开始获得 2 点反击。', effect: { counter: 2 } },
      { id: 'sentinel_veteran', name: '老兵', desc: '战斗开始获得 4 点护盾。', effect: { shield: 4 } },
    ],
  },
  guide: {
    id: 'guide',
    name: '向导',
    desc: '让图景更稳，让精神攻击更锋利。',
    color: 'violet',
    nodes: [
      { id: 'guide_steady', name: '稳图', desc: '受到的侵蚀伤害 -1。', effect: { mentalResist: 1 } },
      { id: 'guide_resonance', name: '共振', desc: '灵能牌伤害 +2。', effect: { psi: 2 } },
      { id: 'guide_barrier', name: '静默壁', desc: '战斗开始获得 3 点护盾。', effect: { shield: 3 } },
      { id: 'guide_calm', name: '低温心', desc: '跨区域移动的精神消耗 -1。', effect: { travelMental: 1 } },
      { id: 'guide_empathy', name: '共感', desc: '社交判定 +2。', effect: { social: 2 } },
    ],
  },
  survival: {
    id: 'survival',
    name: '生存',
    desc: '在空港和废墟之间活得更久一点。',
    color: 'jade',
    nodes: [
      { id: 'survival_scavenger', name: '拾荒者', desc: '战斗信用点收益 +20%。', effect: { credits: 0.2 } },
      { id: 'survival_medic', name: '战地包扎', desc: '消耗品恢复量 +5。', effect: { healing: 5 } },
      { id: 'survival_night', name: '夜眼', desc: '忽略夜间判定惩罚。', effect: { nightEye: 1 } },
      { id: 'survival_barter', name: '会还价', desc: '商店购买价格 -10%。', effect: { discount: 0.1 } },
      { id: 'survival_runner', name: '跑得快', desc: '战斗开始额外获得 1 AP（仅第一回合）。', effect: { startAp: 1 } },
    ],
  },
}

export const CALIBRATION_NODES = Object.values(CALIBRATION_BRANCHES)
  .flatMap((branch) => branch.nodes.map((node, index) => ({
    ...node,
    branch: branch.id,
    branchName: branch.name,
    index,
    requires: index > 0 ? branch.nodes[index - 1].id : null,
    cost: 1,
  })))

export const SYNERGIES = [
  {
    id: 'tower_sentinel',
    name: '白塔壁垒',
    desc: '白塔制式 2 件 + 哨兵 2 节点：战斗开始再获得 2 点护盾。',
    require: { setId: 'tower', pieces: 2, branch: 'sentinel', nodes: 2 },
    effect: { shield: 2 },
  },
  {
    id: 'tower_guide',
    name: '静默装甲',
    desc: '白塔制式 2 件 + 向导 2 节点：受到的侵蚀伤害 -1。',
    require: { setId: 'tower', pieces: 2, branch: 'guide', nodes: 2 },
    effect: { mentalResist: 1 },
  },
  {
    id: 'drifters_survival',
    name: '拾荒路线',
    desc: '漂流者套装 2 件 + 生存 2 节点：战斗信用点收益 +10%。',
    require: { setId: 'drifters', pieces: 2, branch: 'survival', nodes: 2 },
    effect: { credits: 0.1 },
  },
  {
    id: 'drifters_sentinel',
    name: '路边伏击',
    desc: '漂流者套装 2 件 + 哨兵 2 节点：每回合第一张攻击牌伤害 +1。',
    require: { setId: 'drifters', pieces: 2, branch: 'sentinel', nodes: 2 },
    effect: { firstAttack: 1 },
  },
  {
    id: 'whisper_guide',
    name: '低语共振',
    desc: '低语者遗物 2 件 + 向导 2 节点：灵能牌伤害 +2。',
    require: { setId: 'whisper', pieces: 2, branch: 'guide', nodes: 2 },
    effect: { psi: 2 },
  },
  {
    id: 'whisper_survival',
    name: '静默行商',
    desc: '低语者遗物 2 件 + 生存 2 节点：商店价格再 -5%。',
    require: { setId: 'whisper', pieces: 2, branch: 'survival', nodes: 2 },
    effect: { discount: 0.05 },
  },
]

export function activeSynergies(run) {
  const state = ensureCalibration(run)
  const sets = gearSetState(run).reduce((map, set) => {
    map[set.id] = set.count
    return map
  }, {})
  const branches = CALIBRATION_NODES.reduce((map, node) => {
    if (state.nodes.includes(node.id)) map[node.branch] = (map[node.branch] || 0) + 1
    return map
  }, {})
  return SYNERGIES.map((synergy) => {
    const setCount = sets[synergy.require.setId] || 0
    const branchCount = branches[synergy.require.branch] || 0
    return {
      ...synergy,
      active: setCount >= synergy.require.pieces && branchCount >= synergy.require.nodes,
      current: {
        setId: synergy.require.setId,
        pieces: setCount,
        branch: synergy.require.branch,
        nodes: branchCount,
      },
    }
  })
}

export function synergyEffects(run) {
  const effects = {}
  activeSynergies(run).filter((synergy) => synergy.active).forEach((synergy) => {
    Object.entries(synergy.effect || {}).forEach(([key, value]) => {
      effects[key] = (effects[key] || 0) + value
    })
  })
  return effects
}

export function createCalibrationState() {
  return {
    points: 1,
    spent: 0,
    nodes: [],
    milestones: { start: true },
  }
}

export function ensureCalibration(run) {
  if (!run) return null
  if (!run.calibration || typeof run.calibration !== 'object') run.calibration = createCalibrationState()
  const state = run.calibration
  if (typeof state.points !== 'number') state.points = 1
  if (typeof state.spent !== 'number') state.spent = 0
  if (!Array.isArray(state.nodes)) state.nodes = []
  if (!state.milestones || typeof state.milestones !== 'object') state.milestones = { start: true }
  return state
}

export function calibrationEffects(run) {
  const state = ensureCalibration(run)
  const effects = {}
  CALIBRATION_NODES.forEach((node) => {
    if (!state.nodes.includes(node.id)) return
    Object.entries(node.effect || {}).forEach(([key, value]) => {
      effects[key] = (effects[key] || 0) + value
    })
  })
  Object.entries(synergyEffects(run)).forEach(([key, value]) => {
    effects[key] = (effects[key] || 0) + value
  })
  return effects
}

export function calibrationNodeStatus(run, nodeId) {
  const state = ensureCalibration(run)
  const node = CALIBRATION_NODES.find((item) => item.id === nodeId)
  if (!node) return null
  const unlocked = state.nodes.includes(node.id)
  const prereqOk = !node.requires || state.nodes.includes(node.requires)
  return {
    ...node,
    unlocked,
    prereqOk,
    canUnlock: !unlocked && prereqOk && state.points >= node.cost,
  }
}

export function unlockCalibrationNode(run, nodeId) {
  const state = ensureCalibration(run)
  const status = calibrationNodeStatus(run, nodeId)
  if (!status) return { ok: false, message: '没有这个校准节点' }
  if (status.unlocked) return { ok: false, message: '这个节点已经校准过了' }
  if (!status.prereqOk) return { ok: false, message: '需要先完成前置节点' }
  if (state.points < status.cost) return { ok: false, message: '校准点不足' }
  state.points -= status.cost
  state.spent += status.cost
  state.nodes.push(nodeId)
  return { ok: true, node: status, points: state.points }
}

export function grantCalibrationPoints(run, milestone, amount, label = '') {
  const state = ensureCalibration(run)
  if (!milestone) return { ok: false, message: '缺少里程碑' }
  if (state.milestones[milestone]) return { ok: false, message: '这个里程碑已经结算过了' }
  state.milestones[milestone] = { day: run.day, amount, label }
  state.points += amount
  return { ok: true, amount, points: state.points, label }
}

export function calibrationSummary(run) {
  const state = ensureCalibration(run)
  return {
    points: state.points,
    spent: state.spent,
    unlocked: state.nodes.length,
    total: CALIBRATION_NODES.length,
    effects: calibrationEffects(run),
  }
}
