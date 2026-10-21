/**
 * 方舟据点：邀请 NPC 入住、安排设施、休整产出。
 * 据点状态跨城市保存，和 run.city 分开。
 */

export const BASTION_FACILITIES = [
  {
    id: 'clinic',
    name: '医疗舱',
    desc: '让住在这里的人处理伤口、稳定精神。',
    output: '生命 +8 · 精神 +5',
    fit: ['sunshine', 'homemaker', 'jiahao'],
  },
  {
    id: 'workshop',
    name: '工坊',
    desc: '拆解、修补、把废料变成能用的东西。',
    output: '信用点 +12 · 废料 +1',
    fit: ['rough', 'tycoon', 'dry_ghost'],
  },
  {
    id: 'archive',
    name: '档案室',
    desc: '整理旧芯片与航行记录，找出还有用的坐标。',
    output: '旧世芯片 +1',
    fit: ['cold_elite', 'schemer', 'gloomy_ghost'],
  },
  {
    id: 'garden',
    name: '温室',
    desc: '在封闭舱里种一点能吃的东西。',
    output: '营养膏 +2 · 精神 +3',
    fit: ['sunshine', 'homemaker', 'loyal_dog'],
  },
]

export function createBastionState() {
  return {
    name: '渡鸦号',
    capacity: 4,
    residents: [],
    assignments: {},
    lastRestDay: 0,
    lastReport: [],
  }
}

export function ensureBastion(run) {
  if (!run) return createBastionState()
  if (!run.bastion || typeof run.bastion !== 'object') run.bastion = createBastionState()
  const bastion = run.bastion
  if (typeof bastion.name !== 'string') bastion.name = '渡鸦号'
  if (typeof bastion.capacity !== 'number') bastion.capacity = 4
  if (!Array.isArray(bastion.residents)) bastion.residents = []
  if (!bastion.assignments || typeof bastion.assignments !== 'object') bastion.assignments = {}
  if (typeof bastion.lastRestDay !== 'number') bastion.lastRestDay = 0
  if (!Array.isArray(bastion.lastReport)) bastion.lastReport = []
  return bastion
}

export function bastionStatus(run) {
  const bastion = ensureBastion(run)
  return {
    ...bastion,
    residentCount: bastion.residents.length,
    hasSpace: bastion.residents.length < bastion.capacity,
  }
}

export function canInviteNpc(run, npc) {
  if (!run || !npc) return { ok: false, reason: '找不到这个人' }
  const bastion = ensureBastion(run)
  if (!npc.alive) return { ok: false, reason: '他无法回应' }
  if (npc.hostile) return { ok: false, reason: '他还在敌视你' }
  if (bastion.residents.includes(npc.id)) return { ok: false, reason: '他已经在据点里' }
  if (bastion.residents.length >= bastion.capacity) {
    return { ok: false, reason: '据点没有空位' }
  }
  if (npc.tags?.includes('solo')) return { ok: false, reason: '他习惯独来独往，不会住进据点' }
  const threshold = npc.lover || npc.relation?.closeness >= 45
    ? 10
    : npc.tags?.includes('loyal')
      ? 15
      : 25
  if ((npc.relation?.trust || 0) < threshold) {
    return { ok: false, reason: `信任还不够（需要 ${threshold}）`, threshold }
  }
  return { ok: true, reason: '', threshold }
}

export function inviteNpcToBastion(run, npcId) {
  const npc = run?.npcs?.[npcId]
  const check = canInviteNpc(run, npc)
  if (!check.ok) return { ok: false, message: check.reason }
  const bastion = ensureBastion(run)
  bastion.residents.push(npc.id)
  npc.bastionResident = true
  npc.bastionSince = run.day
  return { ok: true, npc, threshold: check.threshold }
}

export function removeNpcFromBastion(run, npcId) {
  const bastion = ensureBastion(run)
  const index = bastion.residents.indexOf(npcId)
  if (index < 0) return { ok: false, message: '他不在据点里' }
  bastion.residents.splice(index, 1)
  Object.keys(bastion.assignments).forEach((facilityId) => {
    if (bastion.assignments[facilityId] === npcId) delete bastion.assignments[facilityId]
  })
  const npc = run.npcs?.[npcId]
  if (npc) {
    npc.bastionResident = false
    npc.bastionSince = 0
  }
  return { ok: true }
}

export function assignBastionFacility(run, facilityId, npcId) {
  const bastion = ensureBastion(run)
  if (!BASTION_FACILITIES.some((facility) => facility.id === facilityId)) {
    return { ok: false, message: '没有这项设施' }
  }
  if (npcId && !bastion.residents.includes(npcId)) {
    return { ok: false, message: '他还没有加入据点' }
  }
  Object.keys(bastion.assignments).forEach((id) => {
    if (bastion.assignments[id] === npcId) delete bastion.assignments[id]
  })
  if (npcId) bastion.assignments[facilityId] = npcId
  else delete bastion.assignments[facilityId]
  return { ok: true, facilityId, npcId: npcId || null }
}

function matchesFit(npc, facility) {
  return Boolean(npc?.archetype?.id && facility.fit.includes(npc.archetype.id))
}

export function restBastion(run) {
  const bastion = ensureBastion(run)
  if (run.ap > 0) return { ok: false, message: '还有行动点，先完成这次远征' }
  if (bastion.lastRestDay === run.day) return { ok: false, message: '今天已经在据点休整过了' }
  const staffed = BASTION_FACILITIES.filter((facility) => bastion.assignments[facility.id])
  if (!staffed.length) return { ok: false, message: '还没有人负责设施，先去邀请 NPC 并安排工作' }

  const report = []
  staffed.forEach((facility) => {
    const npc = run.npcs?.[bastion.assignments[facility.id]]
    if (!npc?.alive) return
    const fit = matchesFit(npc, facility)
    if (facility.id === 'clinic') {
      run.player.hp = Math.min(run.player.hpMax, run.player.hp + (fit ? 12 : 8))
      run.player.mental = Math.min(run.player.mentalMax, run.player.mental + (fit ? 8 : 5))
      report.push(`${facility.name}：${npc.name}处理了伤口${fit ? '，动作很稳' : ''}。`)
    } else if (facility.id === 'workshop') {
      const credits = fit ? 18 : 12
      const scrap = fit ? 2 : 1
      run.player.credits += credits
      run.inv.scrap = (run.inv.scrap || 0) + scrap
      report.push(`${facility.name}：${npc.name}修好了几件旧东西，信用点 +${credits}，废料 +${scrap}。`)
    } else if (facility.id === 'archive') {
      const chips = fit ? 2 : 1
      run.inv.chip = (run.inv.chip || 0) + chips
      report.push(`${facility.name}：${npc.name}从旧记录里翻出 ${chips} 枚旧世芯片。`)
    } else if (facility.id === 'garden') {
      const rations = fit ? 3 : 2
      run.inv.ration = (run.inv.ration || 0) + rations
      run.player.mental = Math.min(run.player.mentalMax, run.player.mental + (fit ? 5 : 3))
      report.push(`${facility.name}：${npc.name}收了一批营养膏，精神也稳定了一些。`)
    }
  })
  bastion.lastRestDay = run.day
  bastion.lastReport = report
  return { ok: true, report }
}
