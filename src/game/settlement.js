/**
 * 每日结算夜报：本地事实已经算完，LLM 只负责把当天的事件写成一段空港夜报。
 */

export function settlementEventTexts(events = []) {
  return (events || [])
    .map((event) => (typeof event === 'string' ? event : event?.text))
    .filter(Boolean)
    .slice(0, 12)
}

export function localSettlementReport(run, events = []) {
  const lines = settlementEventTexts(events)
  const dungeon = run?.dungeon?.name || '星图边缘'
  const lover = Object.values(run?.npcs || {}).find((npc) => npc.alive && npc.lover)
  const party = (run?.party || [])
    .map((id) => run.npcs?.[id]?.name)
    .filter(Boolean)
  const parts = [
    `第 ${run?.day || 1} 天，空港的灯在${dungeon === '星图边缘' ? '夜里' : `${dungeon}上方`}亮着。`,
  ]
  if (lines.length) parts.push(lines.slice(0, 4).join(' '))
  else parts.push('这一夜没有新的消息，只有货运电梯在远处反复升降。')
  if (lover) parts.push(`${lover.name}在散场之后还留了一会儿。`)
  if (party.length) parts.push(`队伍里的${party.join('、')}各自回了落脚点。`)
  parts.push('明天还会有新的事发生。')
  return parts.join('')
}

export function buildSettlementMessages(run, events = []) {
  const lines = settlementEventTexts(events)
  const lovers = Object.values(run?.npcs || {})
    .filter((npc) => npc.alive && npc.lover)
    .map((npc) => npc.name)
  const party = (run?.party || [])
    .map((id) => run.npcs?.[id]?.name)
    .filter(Boolean)
  const system = [
    '你是《星穹哨向》空港夜报的叙事者。',
    '把已经发生的本地事件写成一段冷峻、具体、克制的夜报，180-320 个中文字符。',
    '不要新增事实、奖励、数值或未发生的事件；不要替玩家行动；不要写露骨性内容。',
    '只输出正文，不要标题、列表、代码块或解释。',
  ].join('\n')
  const user = [
    `【日期】第 ${run?.day || 1} 天`,
    `【当前地穴】${run?.dungeon?.name || '未命名星区'}`,
    `【玩家】${run?.player?.name || '你'}`,
    `【信用点】${run?.player?.credits || 0}`,
    `【队伍】${party.join('、') || '无'}`,
    `【恋人】${lovers.join('、') || '无'}`,
    '【当天事件】',
    lines.length ? lines.map((line) => `- ${line}`).join('\n') : '- 没有新的消息。',
    '【要求】按时间顺序写成空港夜晚的一段见闻；可以写声音、灯光、谁在等谁，但不要改变事件事实。',
  ].join('\n')
  return {
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
  }
}

export function stripSettlementReport(text) {
  return String(text || '')
    .replace(/```[a-zA-Z]*\s*/g, '')
    .replace(/```/g, '')
    .replace(/^["“]|["”]$/g, '')
    .replace(/^\s*(夜报|空港夜报)[:：]\s*/, '')
    .trim()
    .slice(0, 2000)
}
