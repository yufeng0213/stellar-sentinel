/**
 * NPC 跨周记忆：每周结束时把这一周的直接互动压成几条要点。
 * 纯本地、确定性；LLM 只在对话/探知时读取，不自动改写。
 */

const MAX_WEEKS = 8

export function weekOf(day) {
  return Math.floor((Math.max(1, day) - 1) / 7) + 1
}

function uniqueLines(lines) {
  const seen = new Set()
  const result = []
  lines.forEach((line) => {
    const text = String(line || '').trim()
    if (!text || seen.has(text)) return
    seen.add(text)
    result.push(text)
  })
  return result
}

function collectBullets(run, npc, start, end) {
  const lines = []

  ;(run.worldEvents || [])
    .filter((entry) => entry.day >= start && entry.day <= end && String(entry.text || '').includes(npc.name))
    .slice(0, 3)
    .forEach((entry) => lines.push(`D${entry.day} ${entry.text}`))

  ;(npc.memory || [])
    .filter((entry) => entry.day >= start && entry.day <= end)
    .slice(0, 3)
    .forEach((entry) => lines.push(`D${entry.day} ${entry.text}`))

  ;(run.npcChats?.[npc.id] || [])
    .filter((message) => message.day >= start && message.day <= end && !message.streaming)
    .slice(-3)
    .forEach((message) => {
      const who = message.role === 'user' ? '你' : npc.name
      lines.push(`D${message.day} ${who}：${String(message.text || '').slice(0, 28)}`)
    })

  ;(run.quests || [])
    .filter((quest) => (
      quest.npcId === npc.id &&
      [quest.createdDay, quest.completedDay].some((day) => day >= start && day <= end)
    ))
    .slice(0, 2)
    .forEach((quest) => {
      const state = quest.status === 'done' ? '完成' : quest.status === 'failed' ? '错过' : '进行中'
      lines.push(`约定「${quest.nodeTitle}」${state}`)
    })

  return uniqueLines(lines).slice(0, 4)
}

export function recordWeeklyMemories(run) {
  if (!run?.npcs) return []
  const week = weekOf(run.day)
  const start = run.day - 6
  const end = run.day
  const recorded = []

  Object.values(run.npcs).forEach((npc) => {
    if (!npc.alive) return
    npc.longMemory = Array.isArray(npc.longMemory) ? npc.longMemory : []
    if (npc.longMemory.some((entry) => entry.week === week)) return

    const bullets = collectBullets(run, npc, start, end)
    const text = bullets.length
      ? bullets.join('；')
      : `这一周你没有和 ${npc.name} 直接接触。`

    const entry = {
      week,
      day: run.day,
      text,
      bullets,
      relation: {
        trust: npc.relation.trust,
        closeness: npc.relation.closeness,
        grievance: npc.relation.grievance,
      },
    }
    npc.longMemory.push(entry)
    if (npc.longMemory.length > MAX_WEEKS) {
      npc.longMemory.splice(0, npc.longMemory.length - MAX_WEEKS)
    }
    recorded.push({ npcId: npc.id, entry })
  })

  return recorded
}

export function longMemoryText(npc, limit = 2) {
  return (npc.longMemory || [])
    .slice(-limit)
    .map((entry) => `- W${entry.week}：${entry.text}`)
    .join('\n') || '- 还没有跨周记忆。'
}
