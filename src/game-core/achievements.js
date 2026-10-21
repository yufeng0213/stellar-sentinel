/**
 * 星区档案：跨周目成就与局内统计。
 * 规则层只负责判断达成，不接触 localStorage。
 */

export const ACHIEVEMENT_CATEGORIES = {
  expedition: { name: '远征', color: 'cyan' },
  relation: { name: '关系', color: 'violet' },
  city: { name: '城市', color: 'amber' },
  build: { name: '构筑', color: 'jade' },
}

export function createStats() {
  return {
    battlesWon: 0,
    elites: 0,
    bosses: 0,
    bossPhaseWins: 0,
    lowMentalWins: 0,
    noCompanionBoss: 0,
    bossIntelWins: 0,
    noGearElite: 0,
    maxHit: 0,
    dates: 0,
    reconciles: 0,
    quarrels: 0,
    promisesKept: 0,
    promisesBroken: 0,
    citiesVisited: [],
  }
}

export function ensureStats(run) {
  if (!run) return createStats()
  if (!run.stats || typeof run.stats !== 'object') run.stats = createStats()
  const defaults = createStats()
  Object.entries(defaults).forEach(([key, value]) => {
    if (run.stats[key] === undefined) run.stats[key] = Array.isArray(value) ? [] : value
  })
  if (!Array.isArray(run.stats.citiesVisited)) run.stats.citiesVisited = []
  if (!Array.isArray(run.achievementSeen)) run.achievementSeen = []
  return run.stats
}

function anyNpc(run, predicate) {
  return Object.values(run?.npcs || {}).some((npc) => npc.alive && predicate(npc))
}

function totalPopulation(run) {
  return Object.values(run?.cities || {}).reduce((sum, city) => sum + (city.npcIds?.length || 0), 0)
}

function allDeckUpgraded(run) {
  const deck = run?.deck || []
  return deck.length > 0 && deck.every((key) => String(key).endsWith('+'))
}

export const ACHIEVEMENTS = [
  {
    id: 'first_elite',
    category: 'expedition',
    title: '第一次越线',
    desc: '击败一名精英目标。',
    condition: (run) => ensureStats(run).elites > 0,
  },
  {
    id: 'first_boss',
    category: 'expedition',
    title: '残骸里的回声',
    desc: '首次击败区域首领。',
    condition: (run) => ensureStats(run).bosses > 0,
  },
  {
    id: 'boss_phase',
    category: 'expedition',
    title: '外壳之后',
    desc: '让首领进入下一阶段，并最终击败它。',
    condition: (run) => ensureStats(run).bossPhaseWins > 0,
  },
  {
    id: 'low_mental_win',
    category: 'expedition',
    title: '只剩一口气',
    desc: '在精神低于 10 时赢下一场战斗。',
    condition: (run) => ensureStats(run).lowMentalWins > 0,
  },
  {
    id: 'lone_boss',
    category: 'expedition',
    title: '一个人也能到',
    desc: '不带任何同伴击败首领。',
    condition: (run) => ensureStats(run).noCompanionBoss > 0,
  },
  {
    id: 'boss_intel_win',
    category: 'expedition',
    title: '情报生效',
    desc: '购买首领情报后击败首领。',
    condition: (run) => ensureStats(run).bossIntelWins > 0,
  },
  {
    id: 'first_ambiguous',
    category: 'relation',
    title: '话到嘴边',
    desc: '让一段关系进入暧昧阶段。',
    condition: (run) => anyNpc(run, (npc) => npc.ambiguous),
  },
  {
    id: 'first_lover',
    category: 'relation',
    title: '不是误会',
    desc: '确认第一段恋人关系。',
    condition: (run) => anyNpc(run, (npc) => npc.lover),
  },
  {
    id: 'first_date',
    category: 'relation',
    title: '灯下见',
    desc: '完成一次约会。',
    condition: (run) => ensureStats(run).dates > 0,
  },
  {
    id: 'first_reconcile',
    category: 'relation',
    title: '把话说完',
    desc: '从一次冷战中和解。',
    condition: (run) => ensureStats(run).reconciles > 0,
  },
  {
    id: 'first_promise',
    category: 'relation',
    title: '说到做到',
    desc: '履行一次约定。',
    condition: (run) => ensureStats(run).promisesKept > 0,
  },
  {
    id: 'second_city',
    category: 'city',
    title: '另一处灯火',
    desc: '进入第二座城市。',
    condition: (run) => ensureStats(run).citiesVisited.length >= 2,
  },
  {
    id: 'population_30',
    category: 'city',
    title: '人声',
    desc: '让城市总人口达到 30。',
    condition: (run) => totalPopulation(run) >= 30,
  },
  {
    id: 'small_deck',
    category: 'build',
    title: '少即是多',
    desc: '在牌组不超过 10 张时赢下一场战斗。',
    condition: (run) => ensureStats(run).battlesWon > 0 && (run.deck?.length || 0) <= 10,
  },
  {
    id: 'all_upgraded',
    category: 'build',
    title: '每一张都磨过',
    desc: '让当前牌组的所有牌都完成升级。',
    condition: (run) => allDeckUpgraded(run),
  },
  {
    id: 'no_gear_elite',
    category: 'build',
    title: '空手上路',
    desc: '不穿任何装备击败一名精英目标。',
    condition: (run) => ensureStats(run).noGearElite > 0,
  },
]

export const ACHIEVEMENT_BY_ID = Object.fromEntries(ACHIEVEMENTS.map((item) => [item.id, item]))

export function checkAchievements(run) {
  ensureStats(run)
  const unlocked = []
  ACHIEVEMENTS.forEach((achievement) => {
    if (run.achievementSeen.includes(achievement.id)) return
    let reached = false
    try {
      reached = Boolean(achievement.condition(run))
    } catch {
      reached = false
    }
    if (!reached) return
    run.achievementSeen.push(achievement.id)
    unlocked.push(achievement)
  })
  return unlocked
}
