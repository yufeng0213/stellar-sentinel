/**
 * 战斗压力：不是单纯堆血量，而是让战斗随着幕数、连胜和时间变紧。
 * 数值保持确定性，方便复现与测试。
 */

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

export function combatThreat(run, node) {
  const act = Math.max(1, node?.act || 1)
  const wins = run?.stats?.battlesWon || 0
  const day = Math.max(1, run?.day || 1)
  const cycles = Math.max(0, run?.mapCycle || 0)
  const score = clamp(
    0.04 +
    (act - 1) * 0.28 +
    Math.min(0.35, wins * 0.014) +
    Math.min(0.3, (day - 1) * 0.009) +
    cycles * 0.16,
    0,
    1
  )
  return {
    score,
    hpScale: 1 + score * 1.15,
    attackBonus: Math.floor(score * 7),
    pressureEvery: 3,
    label: score >= 0.7 ? '极高' : score >= 0.45 ? '高' : score >= 0.22 ? '上升' : '稳定',
  }
}

export function scaleEnemiesForThreat(enemies, threat) {
  if (!Array.isArray(enemies) || !threat) return enemies
  return enemies.map((enemy) => {
    const hpMax = Math.max(1, Math.round(enemy.hpMax * threat.hpScale))
    const attack = Math.max(1, enemy.attack + threat.attackBonus)
    return {
      ...enemy,
      hp: hpMax,
      hpMax,
      attack,
    }
  })
}

export function threatBonus(score) {
  return Math.max(0, Math.round(score * 100))
}
