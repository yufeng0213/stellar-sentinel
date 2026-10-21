/**
 * 派系差事：帮派系做事不再一键完成，而是三段小任务链。
 */

import { adjustReputation, factionStatuses } from './faction.js'

export const FACTION_FAVOR_CHAINS = {
  tower: {
    name: '白塔的旧账',
    steps: [
      {
        title: '清点旧档案',
        text: '白塔的人把三箱受潮的旧档案推到你面前。\n\n“找出还看得清的那一份。”',
        choices: [
          { id: 'sort', label: '自己翻完', desc: '消耗 1 旧芯片，白塔声望 +4。', cost: { chip: 1 }, effects: { rep: 4 } },
          { id: 'buy', label: '找人代翻', desc: '支付 25 信用点，白塔声望 +3。', cost: { credits: 25 }, effects: { rep: 3 } },
        ],
      },
      {
        title: '护送证人',
        text: '一名旧塔书记愿意开口，但只肯走到北门。\n\n路上有白塔的人，也有不想让他开口的人。',
        choices: [
          { id: 'escort', label: '亲自护送', desc: '消耗 1 营养膏，声望 +5，精神 -3。', cost: { ration: 1 }, effects: { rep: 5, mental: -3 } },
          { id: 'hide', label: '安排一条暗线', desc: '支付 20 信用点，声望 +2。', cost: { credits: 20 }, effects: { rep: 2 } },
        ],
      },
      {
        title: '把名单交回去',
        text: '名单上有些名字被划掉了，有些没有。\n\n白塔的人等着你决定怎么交。',
        choices: [
          { id: 'handover', label: '原样交回', desc: '声望 +8，城市影响力 +10，信用点 +20。', effects: { rep: 8, influence: 10, credits: 20 } },
          { id: 'copy', label: '自己留一份', desc: '声望 +4，旧芯片 +1，城市影响力 +5。', effects: { rep: 4, chip: 1, influence: 5 } },
        ],
      },
    ],
  },
  market: {
    name: '黑市的货单',
    steps: [
      {
        title: '押一趟货',
        text: '市场的人让你跟着一车没有登记的东西穿过空港。\n\n“别问里面是什么。”',
        choices: [
          { id: 'guard', label: '跟到底', desc: '消耗 2 废料，市场声望 +4。', cost: { scrap: 2 }, effects: { rep: 4 } },
          { id: 'pay', label: '出钱买通关', desc: '支付 30 信用点，市场声望 +3。', cost: { credits: 30 }, effects: { rep: 3 } },
        ],
      },
      {
        title: '追一笔账',
        text: '有人欠市场一笔钱，躲进了矿脉站。\n\n市场的人把地址给了你，没有给别的。',
        choices: [
          { id: 'collect', label: '把钱要回来', desc: '信用点 +25，市场声望 +5。', effects: { credits: 25, rep: 5 } },
          { id: 'forgive', label: '替他抹掉', desc: '市场声望 +3，精神 +3。', effects: { rep: 3, mental: 3 } },
        ],
      },
      {
        title: '分账',
        text: '货出手了。桌上摆着三份账本，只有一份是真的。\n\n市场的人让你先选。',
        choices: [
          { id: 'share', label: '按规矩分', desc: '信用点 +30，市场声望 +8。', effects: { credits: 30, rep: 8 } },
          { id: 'invest', label: '把份额投回市场', desc: '城市影响力 +10，市场声望 +5。', effects: { influence: 10, rep: 5 } },
        ],
      },
    ],
  },
  drifters: {
    name: '漂流者的路',
    steps: [
      {
        title: '探一条路',
        text: '漂流者说旧矿道塌了一半，但可能还有一条能走的路。\n\n“你眼睛比我们好。”',
        choices: [
          { id: 'scout', label: '自己走一遍', desc: '精神 -4，漂流者声望 +4。', effects: { mental: -4, rep: 4 } },
          { id: 'hire', label: '雇一个本地向导', desc: '支付 25 信用点，声望 +3。', cost: { credits: 25 }, effects: { rep: 3 } },
        ],
      },
      {
        title: '修一座信标',
        text: '旧信标还能亮，但需要有人爬上去换线路。\n\n下面的人都在看你。',
        choices: [
          { id: 'repair', label: '爬上去修', desc: '消耗 2 废料，声望 +5。', cost: { scrap: 2 }, effects: { rep: 5 } },
          { id: 'salvage', label: '拆了换别的', desc: '旧芯片 +1，声望 +3。', effects: { chip: 1, rep: 3 } },
        ],
      },
      {
        title: '带他们过去',
        text: '路通了。第一支车队准备出发，需要一个认得路的人。',
        choices: [
          { id: 'lead', label: '亲自带路', desc: '信用点 +20，漂流者声望 +8。', effects: { credits: 20, rep: 8 } },
          { id: 'map', label: '把路线交出去', desc: '城市影响力 +8，声望 +4。', effects: { influence: 8, rep: 4 } },
        ],
      },
    ],
  },
  whisper: {
    name: '低语者的静默',
    steps: [
      {
        title: '听一段回声',
        text: '低语者让你在静默室里坐一会儿。\n\n“不用回答，只要听。”',
        choices: [
          { id: 'listen', label: '听完', desc: '精神 -5，低语者声望 +4。', effects: { mental: -5, rep: 4 } },
          { id: 'donate', label: '留下一点供品', desc: '支付 30 信用点，声望 +3。', cost: { credits: 30 }, effects: { rep: 3 } },
        ],
      },
      {
        title: '送一件遗物',
        text: '低语者想要一件还带着回声的旧东西。\n\n“不是收藏。是让它安静下来。”',
        choices: [
          { id: 'deliver', label: '交出一枚旧芯片', desc: '消耗 1 旧芯片，声望 +5。', cost: { chip: 1 }, effects: { rep: 5 } },
          { id: 'study', label: '先自己研究', desc: '精神 -3，声望 +3。', effects: { mental: -3, rep: 3 } },
        ],
      },
      {
        title: '守住静默',
        text: '有人想把静默室改成仓库。低语者没有争辩，只是看着你。',
        choices: [
          { id: 'silence', label: '替他们压下这件事', desc: '信用点 +15，城市影响力 +10，声望 +8。', effects: { credits: 15, influence: 10, rep: 8 } },
          { id: 'reveal', label: '把话挑明', desc: '声望 +4，精神 +4。', effects: { rep: 4, mental: 4 } },
        ],
      },
    ],
  },
}

export function ensureFactionFavorMissions(run) {
  if (!run) return {}
  if (!run.factionFavorMissions || typeof run.factionFavorMissions !== 'object') run.factionFavorMissions = {}
  return run.factionFavorMissions
}

export function startFactionFavorMission(run, factionId) {
  ensureFactionFavorMissions(run)
  if (run.factionFavorMissions[factionId]?.status === 'active') return run.factionFavorMissions[factionId]
  const chain = FACTION_FAVOR_CHAINS[factionId]
  if (!chain) return null
  const mission = {
    factionId,
    name: chain.name,
    stage: 0,
    status: 'active',
    startedDay: run.day,
    completedDay: 0,
    log: [],
  }
  run.factionFavorMissions[factionId] = mission
  return mission
}

export function factionFavorMissionStatuses(run) {
  ensureFactionFavorMissions(run)
  return Object.values(run.factionFavorMissions).map((mission) => {
    const chain = FACTION_FAVOR_CHAINS[mission.factionId]
    return {
      ...mission,
      chain,
      step: chain?.steps?.[mission.stage] || null,
      total: chain?.steps?.length || 0,
      factionName: factionStatuses(run).find((item) => item.id === mission.factionId)?.name || mission.factionId,
    }
  })
}

function hasCost(run, cost = {}) {
  if (cost.credits && run.player.credits < cost.credits) return false
  if (cost.scrap && (run.inv.scrap || 0) < cost.scrap) return false
  if (cost.chip && (run.inv.chip || 0) < cost.chip) return false
  if (cost.ration && (run.inv.ration || 0) < cost.ration) return false
  if (cost.relic && (run.inv.relic || 0) < cost.relic) return false
  return true
}

function payCost(run, cost = {}) {
  if (cost.credits) run.player.credits -= cost.credits
  if (cost.scrap) run.inv.scrap -= cost.scrap
  if (cost.chip) run.inv.chip -= cost.chip
  if (cost.ration) run.inv.ration -= cost.ration
  if (cost.relic) run.inv.relic -= cost.relic
}

function applyEffects(run, factionId, effects = {}) {
  if (effects.rep) adjustReputation(run, factionId, effects.rep, '派系差事')
  if (effects.credits) run.player.credits += effects.credits
  if (effects.chip) run.inv.chip = (run.inv.chip || 0) + effects.chip
  if (effects.scrap) run.inv.scrap = (run.inv.scrap || 0) + effects.scrap
  if (effects.ration) run.inv.ration = (run.inv.ration || 0) + effects.ration
  if (effects.mental) run.player.mental = Math.max(0, Math.min(run.player.mentalMax, run.player.mental + effects.mental))
  if (effects.influence && run.city) {
    run.city.influence = { ...(run.city.influence || {}) }
    run.city.influence[factionId] = (run.city.influence[factionId] || 0) + effects.influence
  }
}

export function resolveFactionFavorStep(run, factionId, choiceId) {
  const mission = ensureFactionFavorMissions(run)[factionId]
  if (!mission || mission.status !== 'active') return { ok: false, message: '没有进行中的派系差事' }
  const chain = FACTION_FAVOR_CHAINS[factionId]
  const step = chain?.steps?.[mission.stage]
  const choice = step?.choices.find((item) => item.id === choiceId)
  if (!choice) return { ok: false, message: '没有这个选择' }
  if (!hasCost(run, choice.cost)) return { ok: false, message: '资源不足' }
  payCost(run, choice.cost)
  applyEffects(run, factionId, choice.effects)
  mission.log.push({ day: run.day, text: choice.label })
  mission.stage += 1
  if (mission.stage >= chain.steps.length) {
    mission.status = 'done'
    mission.completedDay = run.day
    adjustReputation(run, factionId, 6, '派系差事完成')
    return {
      ok: true,
      mission,
      done: true,
      text: `${chain.name}完成了。${factionStatuses(run).find((item) => item.id === factionId)?.name || '派系'}的人终于把你从名单上划掉。`,
    }
  }
  return {
    ok: true,
    mission,
    done: false,
    text: choice.desc,
  }
}
