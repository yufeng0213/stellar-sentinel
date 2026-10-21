/**
 * 战后城市重建：选择方向、等待施工、验收结果。
 * 重建不是资源换数值，而是决定城市接下来站在哪一边。
 */

const clamp = (value, min = 0, max = 100) => Math.min(max, Math.max(min, value))

export const RECONSTRUCTION_POLICIES = {
  fortify: {
    id: 'fortify',
    name: '设防重建',
    desc: '先修墙、设岗，让城市能挡住下一次战争。',
    costText: '20 废料',
    result: '城市会变得更安全，但街上的人会觉得自己住在军营里。',
    effects: { healPct: 0.05, mentalHeal: 2, marketStock: -1 },
  },
  relief: {
    id: 'relief',
    name: '民生重建',
    desc: '先修诊所和住房，把伤者接回来。',
    costText: '30 信用点 · 2 营养膏',
    result: '城市会恢复得更慢，但居民会记得是谁把他们接回来的。',
    effects: { healPct: 0.1, mentalHeal: 6 },
  },
  open: {
    id: 'open',
    name: '开放重建',
    desc: '不设防，也不独占，让市场自己恢复。',
    costText: '无',
    result: '城市会更快恢复交易，但控制方对这里的掌握会更弱。',
    effects: { marketStock: 2, marketDiscount: 0.05 },
  },
}

export function createReconstructionState() {
  return {
    stage: 0,
    policy: null,
    startedDay: 0,
    dueDay: 0,
    completedDay: 0,
    completed: false,
    result: null,
    log: [],
  }
}

export function ensureReconstruction(city) {
  if (!city) return null
  if (!city.reconstruction || typeof city.reconstruction !== 'object') {
    city.reconstruction = createReconstructionState()
  }
  const state = city.reconstruction
  if (typeof state.stage !== 'number') state.stage = 0
  if (typeof state.startedDay !== 'number') state.startedDay = 0
  if (typeof state.dueDay !== 'number') state.dueDay = 0
  if (typeof state.completed !== 'boolean') state.completed = false
  if (!Array.isArray(state.log)) state.log = []
  if (state.completed && state.stage < 3) state.stage = 3
  return state
}

export function reconstructionStatus(run) {
  const city = run?.city
  if (!city?.warAftermath) return null
  const state = ensureReconstruction(city)
  return {
    ...state,
    ready: state.stage === 1 && run.day >= state.dueDay,
    waitingDays: state.stage === 1 ? Math.max(0, state.dueDay - run.day) : 0,
    policyInfo: state.policy ? RECONSTRUCTION_POLICIES[state.policy] : null,
  }
}

export function startReconstruction(run, policyId) {
  const city = run?.city
  if (!city?.warAftermath) return { ok: false, message: '这座城市还没有经历战争' }
  const state = ensureReconstruction(city)
  if (state.stage !== 0) return { ok: false, message: '重建已经开始了' }
  const policy = RECONSTRUCTION_POLICIES[policyId]
  if (!policy) return { ok: false, message: '没有这个重建方向' }

  if (policyId === 'fortify' && (run.inv.scrap || 0) < 20) {
    return { ok: false, message: '需要 20 废料' }
  }
  if (policyId === 'relief') {
    if (run.player.credits < 30) return { ok: false, message: '需要 30 信用点' }
    if ((run.inv.ration || 0) < 2) return { ok: false, message: '需要 2 营养膏' }
  }

  if (policyId === 'fortify') run.inv.scrap -= 20
  if (policyId === 'relief') {
    run.player.credits -= 30
    run.inv.ration -= 2
  }

  state.policy = policyId
  state.stage = 1
  state.startedDay = run.day
  state.dueDay = run.day + 2
  state.log.push(`D${run.day} 重建方向：${policy.name}。`)
  if (policyId === 'fortify' && city.controlledBy) {
    city.influence = { ...(city.influence || {}) }
    city.influence[city.controlledBy] = (city.influence[city.controlledBy] || 0) + 10
  }
  if (policyId === 'relief') {
    const injured = city.warAftermath?.injuredIds || []
    injured.forEach((id) => {
      const npc = run.npcs?.[id]
      if (npc) npc.injured = false
    })
  }
  return {
    ok: true,
    state,
    policy,
    text: `${policy.name}开始。${policy.result}`,
  }
}

export function completeReconstruction(run, choiceId = 'hold') {
  const city = run?.city
  if (!city?.warAftermath) return { ok: false, message: '这座城市还没有经历战争' }
  const state = ensureReconstruction(city)
  if (state.stage !== 1) return { ok: false, message: '重建还没有开始' }
  if (run.day < state.dueDay) return { ok: false, message: `还需要等待 ${state.dueDay - run.day} 天` }
  const policy = RECONSTRUCTION_POLICIES[state.policy]
  if (!policy) return { ok: false, message: '重建方向丢失' }

  let text = ''
  let returned = null
  if (choiceId === 'relief') {
    if (run.player.credits < 20) return { ok: false, message: '需要 20 信用点' }
    run.player.credits -= 20
    run.player.mental = Math.min(run.player.mentalMax, run.player.mental + 6)
    const migrants = city.warAftermath?.migrantIds || []
    const migrantId = migrants.find((id) => run.npcs?.[id]?.alive)
    if (migrantId) {
      const npc = run.npcs[migrantId]
      npc.active = true
      npc.cityId = run.activeCityId || 'dock'
      npc.activity = '回到了城市'
      npc.relation.trust = clamp(npc.relation.trust + 4)
      if (!Array.isArray(city.npcIds)) city.npcIds = []
      if (!city.npcIds.includes(npc.id)) city.npcIds.push(npc.id)
      returned = npc
      text = '你把一个迁出的人接了回来。他站在城门口，很久没有往里走。'
    } else {
      text = '你留出了一笔安置费。没有迁出的人回来，但留下的人知道这里还能住。'
    }
  } else {
    if (choiceId === 'hold') {
      text = state.policy === 'fortify'
        ? '城墙修好了。夜里有人巡逻，街上的人说话也轻了一些。'
        : '市场重新开了。没有人再提战争，但每个人都在看新的价牌。'
      run.player.credits += 12
    } else {
      text = '你没有继续投入。重建停在了一个能住人的程度。'
      run.player.mental = Math.min(run.player.mentalMax, run.player.mental + 4)
    }
  }

  state.stage = 3
  state.completed = true
  state.completedDay = run.day
  state.result = choiceId
  state.log.push(`D${run.day} 重建完成：${text}`)
  city.reconstructionResult = {
    day: run.day,
    policy: state.policy,
    choice: choiceId,
    returnedNpcId: returned?.id || null,
    text,
  }
  if (returned) {
    city.warAftermath.migrantIds = (city.warAftermath.migrantIds || []).filter((id) => id !== returned.id)
    city.warAftermath.migrantsOut = (city.warAftermath.migrantsOut || []).filter((name) => name !== returned.name)
  }
  return { ok: true, state, policy, text, returned }
}
