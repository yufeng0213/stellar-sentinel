/**
 * 第四章「门」：三枚门钥、两段判定与最终选择。
 * 门内结局由本地判定决定，文本不依赖模型。
 */

import { createRng } from './rng.js'

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

export const DOOR_SEALS = [
  { id: 'intel', name: '黑市情报', hint: '在空港黑市购买白塔信号源情报。' },
  { id: 'signal', name: '首领记录', hint: '清理当前星图的首领节点。' },
  { id: 'key', name: '门钥', hint: '第四章开始后，在黑市购买门钥。' },
]

export const DOOR_STEPS = [
  {
    id: 'protocol',
    name: '读取门上的旧协议',
    attr: 'tec',
    dc: 13,
    skill: 'hacking',
    prompt: '门框内侧刻着一层被覆盖的旧协议。你可以把接口接上去，听它把最后一句话说完。',
    success: '旧协议在屏幕上展开：门不是用来关住东西的，是用来记住谁进去过。',
    failure: '协议烧穿了接口。你只看见半行字，剩下的被电流吃掉了。',
  },
  {
    id: 'resonance',
    name: '让图景与门共鸣',
    attr: 'psi',
    dc: 14,
    skill: 'empathy',
    prompt: '门后传来极轻的呼吸声。它不像活人，更像一段一直没结束的梦。',
    success: '你的图景贴上冰冷的门面。门内有什么东西回应了你，像一只手抵在另一侧。',
    failure: '共鸣在最后一刻断开。你听见自己的名字从门后传来，声音很近。',
  },
]

export function createDoorState() {
  return {
    stage: 0,
    checks: [],
    opened: false,
    ending: null,
    day: 0,
  }
}

export function ensureDoor(run) {
  if (!run) return null
  if (!run.door || typeof run.door !== 'object') run.door = createDoorState()
  if (!Array.isArray(run.door.checks)) run.door.checks = []
  if (typeof run.door.stage !== 'number') run.door.stage = 0
  return run.door
}

export function doorSeals(run) {
  const flags = run?.story?.flags || {}
  const seals = [
    { ...DOOR_SEALS[0], ok: !!flags.intel },
    {
      ...DOOR_SEALS[1],
      ok: !!flags.boss_signal || !!flags.chapter_3_done || !!(
        run.map?.bossId && (run.cleared || []).includes(run.map.bossId)
      ),
    },
    { ...DOOR_SEALS[2], ok: !!flags.doorKey },
  ]
  return { seals, complete: seals.every((seal) => seal.ok) }
}

export function doorStatus(run) {
  const door = ensureDoor(run)
  const sealState = doorSeals(run)
  return {
    ...sealState,
    node: door,
    stage: door.stage,
    step: DOOR_STEPS[door.stage] || null,
    canBegin: sealState.complete && door.stage === 0,
    canChoose: sealState.complete && door.stage >= DOOR_STEPS.length && !door.opened,
    opened: door.opened,
    ending: door.ending,
  }
}

function checkAttr(run, key) {
  const value = run?.player?.attrs?.[key]
  return typeof value === 'number' ? value : 3
}

export function resolveDoorStep(run) {
  ensureDoor(run)
  const sealState = doorSeals(run)
  if (!sealState.complete) return { ok: false, message: '三枚门钥还没有集齐' }
  if (run.door.opened) return { ok: false, message: '门已经开过了' }
  const step = DOOR_STEPS[run.door.stage]
  if (!step) return { ok: false, message: '门前已经没有需要处理的东西' }

  const bonus = step.skill && run.player.skills?.includes(step.skill) ? 2 : 0
  const rng = createRng(`${run.seed}:door:${run.door.stage}:${run.rollCount}`)
  const roll = 1 + Math.floor(rng.next() * 20)
  const total = roll + checkAttr(run, step.attr) + bonus
  const success = roll === 20 || (roll !== 1 && total >= step.dc)
  run.rollCount += 1
  if (!success) run.player.mental = clamp(run.player.mental - 8, 0, run.player.mentalMax)

  const text = success ? step.success : step.failure
  run.door.stage += 1
  run.door.checks.push({
    id: step.id,
    name: step.name,
    success,
    roll,
    total,
    dc: step.dc,
    text,
  })
  return { ok: true, success, text, roll, total, dc: step.dc, step }
}

export function resolveDoorFinale(run, choice) {
  ensureDoor(run)
  const sealState = doorSeals(run)
  if (!sealState.complete) return { ok: false, message: '三枚门钥还没有集齐' }
  if (run.door.opened) return { ok: false, message: '门已经开过了' }
  if (run.door.stage < DOOR_STEPS.length) return { ok: false, message: '门还没有完全回应你' }
  if (!['open', 'close'].includes(choice)) return { ok: false, message: '没有这个选择' }

  const successes = run.door.checks.filter((check) => check.success).length
  let text = ''
  if (choice === 'close') {
    text = successes === DOOR_STEPS.length
      ? '你把门重新合上。门内的呼吸停了。白塔的灯一盏一盏熄下去，像终于有人替它做了决定。'
      : '你把门合上。门缝里还有半句话没有说完，但它已经不再重要。你转身走下矿脉，身后传来很轻的一声锁响。'
  } else if (successes === DOOR_STEPS.length) {
    text = '门向两侧退开。里面没有房间，只有一条朝下延伸的路，和路尽头一盏还亮着的灯。白塔的信号源就在那里。'
  } else {
    text = '门向两侧退开。里面没有房间，只有一段没有尽头的夜。你听见自己的脚步从很远的地方传来，像是有人已经在里面等你。'
  }

  run.door.opened = true
  run.door.ending = choice
  run.door.endingText = text
  run.door.day = run.day
  run.story = run.story || {}
  run.story.flags = run.story.flags || {}
  run.story.flags.door_opened = true
  run.story.flags.ending = choice
  return { ok: true, choice, successes, text }
}
