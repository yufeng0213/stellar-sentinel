/**
 * 结局后日谈与结局收集的纯规则部分。
 * 结局只由“开门/关门”和两段判定的成功次数决定。
 */

export const ENDINGS = [
  {
    id: 'open_clear',
    title: '灯还亮着',
    choice: 'open',
    tone: 'hope',
    summary: '你推开门，门后有一条朝下的路和一盏还亮着的灯。',
    collection: '门后的灯没有熄灭。你带着白塔的信号源回到空港，第一次觉得那条重复的坐标不是陷阱，而是有人在等你。',
  },
  {
    id: 'open_dark',
    title: '没有尽头的夜',
    choice: 'open',
    tone: 'eerie',
    summary: '你推开门，门后没有房间，只有一段没有尽头的夜。',
    collection: '你走进门后的夜。空港的人后来只记得那天矿脉深处多了一盏灯，却没人再见过你。',
  },
  {
    id: 'close_clear',
    title: '替它做了决定',
    choice: 'close',
    tone: 'quiet',
    summary: '你把门合上，白塔的灯一盏一盏熄下去。',
    collection: '你替白塔做了决定。矿脉恢复安静，空港的夜晚照常亮起，只有你知道门后曾经有过呼吸。',
  },
  {
    id: 'close_scar',
    title: '半句话',
    choice: 'close',
    tone: 'scar',
    summary: '你合上门，门缝里的半句话没有说完。',
    collection: '你合上门，但那半句话跟着你回了空港。每次夜里起风，你都会听见它停在同一个地方。',
  },
]

export const ENDING_BY_ID = Object.fromEntries(ENDINGS.map((ending) => [ending.id, ending]))

export function endingFor(choice, successes) {
  const clear = Number(successes) >= 2
  if (choice === 'close') return clear ? ENDING_BY_ID.close_clear : ENDING_BY_ID.close_scar
  return clear ? ENDING_BY_ID.open_clear : ENDING_BY_ID.open_dark
}

export function getEnding(id) {
  return ENDING_BY_ID[id] || null
}

function closestNpc(run) {
  const npcs = Object.values(run?.npcs || {}).filter((npc) => npc.active !== false && npc.alive !== false)
  if (!npcs.length) return null
  return npcs.sort((left, right) => (
    (right.relation?.closeness || 0) - (left.relation?.closeness || 0) ||
    (right.relation?.trust || 0) - (left.relation?.trust || 0)
  ))[0]
}

export function localEpilogue(run, endingId) {
  const ending = getEnding(endingId)
  if (!ending) return ''
  const npc = closestNpc(run)
  const party = (run?.party || []).map((id) => run.npcs?.[id]?.name).filter(Boolean)
  const credits = run?.player?.credits ?? 0
  const day = run?.day ?? 1
  const defeats = run?.defeats || 0
  const dungeon = run?.dungeon?.name || '那道门'

  const opening = {
    open_clear: `你从矿脉走回空港时，天已经亮了。${dungeon}的门在你身后合拢，但灯还亮着。`,
    open_dark: `你没有立刻回城。${dungeon}的门开着，门后的夜跟着你走了很久，直到空港的灯一盏一盏出现在远处。`,
    close_clear: `你合上门，矿脉重新安静下来。${dungeon}的旧协议在身后停住，像终于有人替它做了决定。`,
    close_scar: `你合上门，但门缝里的半句话没有散。${dungeon}的走廊在你身后沉默下去，只有你的脚步还在回响。`,
  }[ending.id]

  const company = npc
    ? `${npc.name}在城门附近等你。${party.length > 1 ? `队伍里还有${party.filter((name) => name !== npc.name).join('、')}。` : ''}`
    : '城门附近没有认识的人。你独自走回空港，把门留在身后。'

  const ledger = `第 ${day} 天，你带着 ${credits} 信用点回来。${defeats ? `这趟远征里你倒下过 ${defeats} 次。` : '这一趟没有让你倒下。'}`

  return [
    opening,
    company,
    ledger,
    ending.collection,
  ].join('\n\n')
}

export function mergeEndingRecord(collection, record) {
  const next = { ...(collection || {}) }
  const previous = next[record.id]
  next[record.id] = {
    id: record.id,
    title: record.title,
    count: (previous?.count || 0) + 1,
    firstAt: previous?.firstAt || record.at || Date.now(),
    lastAt: record.at || Date.now(),
    firstDay: previous?.firstDay ?? record.day ?? 0,
    lastDay: record.day ?? 0,
    runId: record.runId || previous?.runId || '',
    choice: record.choice,
    successes: record.successes,
  }
  return next
}
