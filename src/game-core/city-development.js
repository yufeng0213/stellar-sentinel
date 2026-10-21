/**
 * 城市长期发展：设施升级、派系项目与影响力。
 * 状态挂在当前城市状态上，跟随 run.cityStates 分城市保存。
 */

import { ITEMS } from './data.js'
import { adjustReputation, factionStatus } from './faction.js'

export const CITY_FACILITIES = [
  {
    id: 'clinic',
    name: '诊所',
    desc: '扩建病房与药品储备。',
    effectText: '每次治疗 +10%',
    effects: { healPct: 0.1 },
    max: 3,
  },
  {
    id: 'market',
    name: '市场',
    desc: '增加摊位，压低进货价。',
    effectText: '商品 +1 / 价格 -3%',
    effects: { marketStock: 1, marketDiscount: 0.03 },
    max: 3,
  },
  {
    id: 'forge',
    name: '锻造间',
    desc: '让卡牌改造更便宜。',
    effectText: '卡牌升级 -5 信用点',
    effects: { forgeDiscount: 5 },
    max: 3,
  },
  {
    id: 'comms',
    name: '通讯塔',
    desc: '接通黑市与旧频道。',
    effectText: '黑市情报 -10 信用点',
    effects: { intelDiscount: 10 },
    max: 3,
  },
]

export const CITY_PROJECTS = {
  tower_beacon: {
    id: 'tower_beacon',
    name: '白塔信标',
    faction: 'tower',
    desc: '在旧塔顶重新点亮一枚信标，让失联的回收队找到回路。',
    effects: { intelDiscount: 20 },
    cost: { credits: 80, item: 'chip', count: 1 },
    rewardText: '黑市情报 -20 信用点 · 白塔影响力 +20',
  },
  market_hub: {
    id: 'market_hub',
    name: '市场联运',
    faction: 'market',
    desc: '把空港的货舱和市场摊位接成一条线。',
    effects: { marketStock: 2, marketDiscount: 0.05 },
    cost: { credits: 70, item: 'ration', count: 2 },
    rewardText: '市场商品 +2 / 价格 -5% · 黑市影响力 +20',
  },
  drifters_road: {
    id: 'drifters_road',
    name: '拾荒路网',
    faction: 'drifters',
    desc: '在废墟间标记出一条不会被风沙埋掉的路。',
    effects: { gatherBonus: 1 },
    cost: { credits: 60, item: 'scrap', count: 3 },
    rewardText: '采集产出 +1 · 漂流者影响力 +20',
  },
  whisper_quiet: {
    id: 'whisper_quiet',
    name: '静默室',
    faction: 'whisper',
    desc: '给低语者留一间不会被频道打扰的房间。',
    effects: { mentalHeal: 8 },
    cost: { credits: 70, item: 'spore', count: 2 },
    rewardText: '诊所精神恢复 +8 · 低语者影响力 +20',
  },
}

export const CITY_PACTS = {
  tower: {
    id: 'tower',
    name: '白塔盟约',
    faction: 'tower',
    project: 'tower_beacon',
    desc: '让白塔回收队进驻空港，换取旧档案与更便宜的 Boss 情报。',
    effects: { intelDiscount: 20, healPct: 0.05 },
    rivals: ['market', 'whisper'],
    rewardText: '黑市情报 -20 · 治疗 +5% · 敌对市场/低语者',
  },
  market: {
    id: 'market',
    name: '市场盟约',
    faction: 'market',
    project: 'market_hub',
    desc: '把空港的货源交给市场公会，换来更多商品和更低价格。',
    effects: { marketStock: 2, marketDiscount: 0.08 },
    rivals: ['tower', 'drifters'],
    rewardText: '市场商品 +2 / 价格 -8% · 敌对白塔/漂流者',
  },
  drifters: {
    id: 'drifters',
    name: '拾荒者盟约',
    faction: 'drifters',
    project: 'drifters_road',
    desc: '公开支持漂流者的路网，让采集队愿意把更多东西带回来。',
    effects: { gatherBonus: 1 },
    rivals: ['market', 'tower'],
    rewardText: '采集产出 +1 · 敌对市场/白塔',
  },
  whisper: {
    id: 'whisper',
    name: '低语者盟约',
    faction: 'whisper',
    project: 'whisper_quiet',
    desc: '允许低语者在空港保留静默室，换取更稳定的精神恢复。',
    effects: { mentalHeal: 12, healPct: 0.05 },
    rivals: ['tower', 'market'],
    rewardText: '诊所精神恢复 +12 / 治疗 +5% · 敌对白塔/市场',
  },
}

export function ensureCityDevelopment(city) {
  if (!city) return null
  if (!city.upgrades || typeof city.upgrades !== 'object') city.upgrades = {}
  if (!city.projects || typeof city.projects !== 'object') city.projects = {}
  if (!city.influence || typeof city.influence !== 'object') city.influence = {}
  if (city.pact === undefined) city.pact = null
  CITY_FACILITIES.forEach((facility) => {
    if (typeof city.upgrades[facility.id] !== 'number') city.upgrades[facility.id] = 0
  })
  return city
}

export function facilityCost(level) {
  return {
    credits: 50 + level * 30,
    scrap: 1 + level,
  }
}

export function cityStateFor(run, cityId = null) {
  if (!run) return null
  const id = cityId || run.activeCityId || 'dock'
  if (run.cityStates?.[id]) return run.cityStates[id]
  if (id === (run.activeCityId || 'dock') && run.city) return run.city
  return null
}

export function cityDevelopmentEffects(run, cityId = null) {
  const city = cityStateFor(run, cityId)
  if (!city) return {}
  ensureCityDevelopment(city)
  const effects = {}
  const add = (source) => {
    Object.entries(source || {}).forEach(([key, value]) => {
      effects[key] = (effects[key] || 0) + value
    })
  }
  CITY_FACILITIES.forEach((facility) => {
    const level = city.upgrades[facility.id] || 0
    if (!level) return
    Object.entries(facility.effects).forEach(([key, value]) => {
      effects[key] = (effects[key] || 0) + value * level
    })
  })
  Object.keys(city.projects).forEach((id) => {
    if (!city.projects[id]) return
    add(CITY_PROJECTS[id]?.effects)
  })
  if (city.pact) add(CITY_PACTS[city.pact]?.effects)
  if (city.reconstruction?.completed) {
    const policy = city.reconstruction.policy
    const policyEffects = {
      fortify: { healPct: 0.05, mentalHeal: 2, marketStock: -1, patrol: 1 },
      relief: { healPct: 0.1, mentalHeal: 6 },
      open: { marketStock: 2, marketDiscount: 0.05 },
    }[policy]
    add(policyEffects)
  }
  return effects
}

export function facilityStatuses(run, cityId = null) {
  const city = cityStateFor(run, cityId)
  if (!city) return []
  ensureCityDevelopment(city)
  return CITY_FACILITIES.map((facility) => {
    const level = city.upgrades[facility.id] || 0
    return {
      ...facility,
      level,
      maxed: level >= facility.max,
      cost: facilityCost(level),
    }
  })
}

export function upgradeCityFacility(run, cityId, facilityId) {
  const city = cityStateFor(run, cityId)
  if (!city) return { ok: false, message: '这里没有可升级的设施' }
  ensureCityDevelopment(city)
  const facility = CITY_FACILITIES.find((item) => item.id === facilityId)
  if (!facility) return { ok: false, message: '没有这项设施' }
  const level = city.upgrades[facilityId] || 0
  if (level >= facility.max) return { ok: false, message: '这项设施已经满级' }
  const cost = facilityCost(level)
  if (run.player.credits < cost.credits) return { ok: false, message: `需要 ${cost.credits} 信用点` }
  if ((run.inv.scrap || 0) < cost.scrap) return { ok: false, message: `需要 ${cost.scrap} 废料` }
  run.player.credits -= cost.credits
  run.inv.scrap -= cost.scrap
  if (run.inv.scrap <= 0) delete run.inv.scrap
  city.upgrades[facilityId] = level + 1
  return { ok: true, facility, level: level + 1, cost }
}

export function projectStatuses(run, cityId = null) {
  const city = cityStateFor(run, cityId)
  if (!city) return []
  ensureCityDevelopment(city)
  return Object.values(CITY_PROJECTS).map((project) => {
    const status = factionStatus(run, project.faction)
    const done = Boolean(city.projects[project.id])
    return {
      ...project,
      factionName: status.name,
      rep: status.score,
      done,
      repOk: status.score >= 30,
      itemCount: run.inv[project.cost.item] || 0,
      itemOk: (run.inv[project.cost.item] || 0) >= project.cost.count,
      creditsOk: run.player.credits >= project.cost.credits,
      canClaim: !done && status.score >= 30 && (run.inv[project.cost.item] || 0) >= project.cost.count && run.player.credits >= project.cost.credits,
    }
  })
}

export function completeCityProject(run, cityId, projectId) {
  const city = cityStateFor(run, cityId)
  if (!city) return { ok: false, message: '这里没有城市项目' }
  ensureCityDevelopment(city)
  const project = CITY_PROJECTS[projectId]
  if (!project) return { ok: false, message: '没有这个城市项目' }
  if (city.projects[projectId]) return { ok: false, message: '这个项目已经完成' }
  const status = factionStatus(run, project.faction)
  if (status.score < 30) return { ok: false, message: `需要 ${status.name} 声望 30` }
  if ((run.inv[project.cost.item] || 0) < project.cost.count) {
    return { ok: false, message: `需要 ${project.cost.count} 个${ITEMS[project.cost.item]?.name || project.cost.item}` }
  }
  if (run.player.credits < project.cost.credits) return { ok: false, message: `需要 ${project.cost.credits} 信用点` }
  run.player.credits -= project.cost.credits
  run.inv[project.cost.item] -= project.cost.count
  city.projects[projectId] = true
  city.influence[project.faction] = (city.influence[project.faction] || 0) + 20
  return { ok: true, project, influence: city.influence[project.faction] }
}

export function pactStatuses(run, cityId = null) {
  const city = cityStateFor(run, cityId)
  if (!city) return []
  ensureCityDevelopment(city)
  return Object.values(CITY_PACTS).map((pact) => {
    const status = factionStatus(run, pact.faction)
    const projectDone = Boolean(city.projects[pact.project])
    const chosen = city.pact === pact.id
    const locked = Boolean(city.pact) && !chosen
    return {
      ...pact,
      factionName: status.name,
      rep: status.score,
      projectDone,
      chosen,
      locked,
      canChoose: !city.pact && status.score >= 30 && projectDone,
    }
  })
}

export function chooseCityPact(run, cityId, pactId) {
  const city = cityStateFor(run, cityId)
  if (!city) return { ok: false, message: '这里没有可以结盟的城市' }
  ensureCityDevelopment(city)
  const pact = CITY_PACTS[pactId]
  if (!pact) return { ok: false, message: '没有这个盟约' }
  if (city.pact) return { ok: false, message: '这座城市已经选择了盟约' }
  const status = factionStatus(run, pact.faction)
  if (status.score < 30) return { ok: false, message: `需要 ${status.name} 声望 30` }
  if (!city.projects[pact.project]) return { ok: false, message: '需要先完成对应城市项目' }
  city.pact = pactId
  city.influence[pact.faction] = (city.influence[pact.faction] || 0) + 25
  adjustReputation(run, pact.faction, 15, `城市盟约：${pact.name}`)
  pact.rivals.forEach((id) => adjustReputation(run, id, -15, `城市盟约：${pact.name}`))
  return { ok: true, pact }
}

export function cityInfluence(run, cityId = null) {
  const city = cityStateFor(run, cityId)
  if (!city) return []
  ensureCityDevelopment(city)
  return Object.keys(CITY_PROJECTS).map((id) => {
    const project = CITY_PROJECTS[id]
    const status = factionStatus(run, project.faction)
    return {
      faction: project.faction,
      name: status.name,
      score: status.score,
      influence: (city.influence[project.faction] || 0) + Math.max(0, status.score),
      projectDone: Boolean(city.projects[id]),
    }
  }).filter((item, index, list) => list.findIndex((other) => other.faction === item.faction) === index)
}
