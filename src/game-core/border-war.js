/**
 * 边境战争：城市盟约后的三阶段远征。
 * 集结 → 营地 → 敌方据点 → 回城结算。
 */

import { ITEMS } from './data.js'
import { adjustReputation } from './faction.js'
import { createRng } from './rng.js'

export const WAR_ENEMIES = {
  raider: {
    id: 'raider',
    name: '边境掠夺者',
    hp: 34,
    morale: 24,
    attack: 6,
    traits: ['aggressive', 'armored'],
  },
  machine: {
    id: 'machine',
    name: '旧战争机器',
    hp: 42,
    morale: 18,
    attack: 7,
    traits: ['armored', 'guarded'],
  },
}

export function createWarState() {
  return {
    active: false,
    stage: 0,
    cityId: 'dock',
    faction: null,
    prep: null,
    camp: null,
    enemy: 'raider',
    startedDay: 0,
    completedDay: 0,
    outcome: null,
    lastText: '',
  }
}

export function ensureWar(run) {
  if (!run) return createWarState()
  if (!run.borderWar || typeof run.borderWar !== 'object') run.borderWar = createWarState()
  const war = run.borderWar
  if (typeof war.active !== 'boolean') war.active = false
  if (typeof war.stage !== 'number') war.stage = 0
  if (typeof war.cityId !== 'string') war.cityId = run.activeCityId || 'dock'
  if (typeof war.enemy !== 'string') war.enemy = 'raider'
  if (typeof war.startedDay !== 'number') war.startedDay = 0
  if (typeof war.completedDay !== 'number') war.completedDay = 0
  if (!Array.isArray(war.report)) war.report = []
  return war
}

export function warAvailable(run) {
  return Boolean(run?.city?.pact && !ensureWar(run).active && !run.borderWar.completedDay)
}

export function startBorderWar(run) {
  const war = ensureWar(run)
  if (war.active) return { ok: false, message: '边境战争正在进行' }
  if (war.completedDay) return { ok: false, message: '这场边境战争已经结束了' }
  const pact = run?.city?.pact
  if (!pact) return { ok: false, message: '需要先签订城市盟约' }
  war.active = true
  war.stage = 1
  war.cityId = run.activeCityId || 'dock'
  war.faction = pact
  war.prep = null
  war.camp = null
  war.enemy = createRng(`${run.seed}:war:${run.day}`).pick(['raider', 'machine'])
  war.startedDay = run.day
  war.outcome = null
  war.lastText = '盟约的传令官把一份边境地图铺在桌上。战争从明天开始。'
  return { ok: true, war }
}

export function chooseWarPrep(run, choiceId) {
  const war = ensureWar(run)
  if (!war.active || war.stage !== 1) return { ok: false, message: '现在不是集结阶段' }
  const choices = {
    vanguard: {
      text: '你带上了最能打的人。队伍走得更快，但也更容易被看见。',
      prep: 'vanguard',
    },
    engineer: {
      text: '你带上了工坊的拆解工具和备用线路。至少不会被一台旧机器挡住。',
      prep: 'engineer',
      scrap: 2,
    },
    medic: {
      text: '你把医疗舱的剩余药品都装进了背包。',
      prep: 'medic',
      credits: 20,
    },
  }
  const choice = choices[choiceId]
  if (!choice) return { ok: false, message: '没有这个集结方式' }
  if (choice.scrap && (run.inv.scrap || 0) < choice.scrap) return { ok: false, message: `需要 ${choice.scrap} 废料` }
  if (choice.credits && run.player.credits < choice.credits) return { ok: false, message: `需要 ${choice.credits} 信用点` }
  if (choice.scrap) run.inv.scrap -= choice.scrap
  if (choice.credits) run.player.credits -= choice.credits
  war.prep = choice.prep
  war.stage = 2
  war.lastText = choice.text
  return { ok: true, war, text: choice.text }
}

export function chooseWarCamp(run, choiceId) {
  const war = ensureWar(run)
  if (!war.active || war.stage !== 2) return { ok: false, message: '现在不是营地阶段' }
  let text = ''
  if (choiceId === 'ambush') {
    const damage = war.prep === 'vanguard' ? 4 : 8
    run.player.hp = Math.max(1, run.player.hp - damage)
    war.camp = 'ambush'
    text = `夜里有人摸营。你带人追出去，抓住了对方的斥候，但自己也挨了一下。生命 -${damage}。`
  } else if (choiceId === 'fortify') {
    if ((run.inv.scrap || 0) < 2) return { ok: false, message: '需要 2 废料加固营地' }
    run.inv.scrap -= 2
    war.camp = 'fortify'
    text = '你们用废料加固了营地。夜里安静得不太正常，但没有人再靠近。'
  } else if (choiceId === 'talk') {
    war.camp = 'talk'
    run.player.mental = Math.min(run.player.mentalMax, run.player.mental + 7)
    text = '你和同行的人在火边坐了很久。没有人提明天的战斗，但每个人都比之前更稳。'
  } else {
    return { ok: false, message: '没有这个营地选择' }
  }
  war.stage = 3
  war.lastText = text
  return { ok: true, war, text }
}

export function warBattleEnemy(run) {
  const war = ensureWar(run)
  const enemy = WAR_ENEMIES[war.enemy] || WAR_ENEMIES.raider
  return { ...enemy, traits: [...enemy.traits] }
}

export function completeWarBattle(run) {
  const war = ensureWar(run)
  if (!war.active || war.stage !== 3) return { ok: false }
  war.stage = 4
  war.lastText = '敌方据点安静了下来。你站在打开的门口，等城市的人来决定下一步。'
  return { ok: true, war }
}

export function settleBorderWar(run, choiceId) {
  const war = ensureWar(run)
  if (!war.active || war.stage !== 4) return { ok: false, message: '现在还不能结算' }
  const faction = war.faction || run.city?.pact
  let text = ''
  let credits = 45
  if (choiceId === 'faction') {
    if (faction) {
      adjustReputation(run, faction, 12, '边境战争')
      if (run.city) {
        run.city.influence = { ...(run.city.influence || {}) }
        run.city.influence[faction] = (run.city.influence[faction] || 0) + 15
      }
    }
    text = '你把据点交给盟约派系接管。他们的人来得很快，像是早就知道门在哪里。'
  } else if (choiceId === 'city') {
    credits += 35
    run.player.mental = Math.min(run.player.mentalMax, run.player.mental + 6)
    text = '你没有让任何派系独占据点。城市的人自己接管了这里，至少今晚，边境安静了下来。'
  } else if (choiceId === 'crew') {
    run.inv.scrap = (run.inv.scrap || 0) + 4
    run.inv.chip = (run.inv.chip || 0) + 2
    text = '你把能搬走的东西都带回了方舟。战争没有赢家，但据点里的人需要这些。'
  } else {
    return { ok: false, message: '没有这个结算方式' }
  }
  run.player.credits += credits
  if (!run.inv.relic) run.inv.relic = 0
  run.inv.relic += 1
  war.active = false
  war.stage = 5
  war.completedDay = run.day
  war.outcome = choiceId
  war.lastText = text
  return {
    ok: true,
    war,
    text,
    credits,
    reward: `信用点 +${credits} · 遗物 +1`,
  }
}
