/**
 * 地图约会节点：三段式 AVG 场景。
 * 文案按 NPC 人设区分，选择会改变关系和关系压力，不写露骨内容。
 */

import { ensureStats } from './achievements.js'
import { noteNpcInteraction } from './npc-stages.js'

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

const OPENERS = {
  gloomy_ghost: '他比约定时间早到，站在灯照不到的地方。看到你之后，他只说了一句：“你来了。”',
  dry_ghost: '他已经在桌边坐下了，面前放着两杯水。“不用猜，我替你点了。”',
  jiahao: '他今天把口罩摘了，头发显然认真整理过。“我没有准备很久。”他说，眼神却一直看别处。',
  sunshine: '他远远朝你挥手，桌上已经摆好了两份吃的。“我怕你饿，就先点了。”',
  tycoon: '整间店安静得不太正常。他替你拉开椅子：“路上没有麻烦吧。”',
  tsundere: '他先到了，却假装在看别处。“我只是刚好路过。你要坐就坐。”',
  madman: '他选了一个能看到整条街的位置，桌上摊着一张画满箭头的纸。“今天不聊危险的事。大概。”',
  yandere: '他坐在靠门的位置，看到你时明显松了一口气。“我一直在数时间。”',
  cold_elite: '他把一份刚整理好的记录放在桌边，像是随手带来的。“今天不谈工作。”',
  loyal_dog: '他提前到了很久，看到你时立刻站起来，又觉得自己太明显，慢慢坐回去。',
  schemer: '他替你点了喝的，温度刚好。“我猜你会来。看来猜对了。”',
  homemaker: '桌上放着一只保温盒。“外面冷，先吃点热的。”',
  tease: '他撑着下巴看你走过来。“你迟到了三分钟。我差点以为你不来了。”',
  rough: '他靠在外面的墙边，看到你后把烟按灭。“进去。外面风大。”',
  default: '他比约定时间早到。看到你之后，他没有催，只把旁边的椅子拉开。',
}

const MIDDLES = {
  gloomy_ghost: '他很少抬头，但你说的每一句他都接得住。窗外有人经过时，他下意识往你这边挡了一下。',
  dry_ghost: '他说话不绕弯，连关心都很直接。“最近是不是没睡好。”他没有等你回答，就把水推近了一点。',
  jiahao: '他讲了一个准备很久的故事，讲到一半发现自己说快了，停下来问你：“是不是很无聊。”',
  sunshine: '他说起今天遇到的小事，笑得停不下来，然后又突然认真地问你：“你最近真的还好吗。”',
  tycoon: '他没有谈生意，也没有看通讯。只是在你停顿的时候，安静地等你说完。',
  tsundere: '他嘴上说着“随便”，却记得你上次提过的每一件小事。你看向他时，他立刻移开视线。',
  madman: '他开始讲一个很离谱的计划，讲到兴奋处眼睛发亮，然后突然压低声音：“你会不会觉得我太麻烦。”',
  yandere: '他反复确认你今天的安排，问得很轻，像是怕你嫌他烦。你说“不会”时，他才慢慢放松。',
  cold_elite: '他大多时候在听。你停下来时，他会准确接上你刚才没说出口的那半句。',
  loyal_dog: '他一直在找话题，怕冷场。你看向他时，他会立刻笑，像是被允许靠近一点。',
  schemer: '他绕了几次，终于问到重点：“你最近，最常想起的人是谁。”',
  homemaker: '他把桌上的东西摆得很整齐，问你明天想吃什么，又问了一遍才记下来。',
  tease: '他故意把一句话说得很慢，等你看他。你不上钩，他就自己笑了。',
  rough: '他不太会聊细的东西，但你说累的时候，他把椅子往你那边挪了一点，没有再问。',
  default: '他听得很认真。你停下来的时候，他没有急着接话，只把水杯往你那边推了推。',
}

const CLOSERS = {
  gloomy_ghost: '走到门口时，他停了一下。“下次……也可以再来。”',
  dry_ghost: '他把你送到路口，没有问下一次，只说：“到了给我发个消息。”',
  jiahao: '他站在灯下，终于把口罩拉下来。“今天还行吧。我是说……我表现得还行吧。”',
  sunshine: '他朝你挥手，走出几步又回头。“下次还来吗？”',
  tycoon: '车停在路边，他没有催你上车。“你决定。今晚不用赶。”',
  tsundere: '他把外套递给你，嘴上说“别感冒了，麻烦”，手却没有收回去。',
  madman: '他把那张地图折好塞进口袋。“下次带你去看个更疯的。你可以拒绝。”',
  yandere: '他站在门口没有动。“你回去之后，会告诉我吗。”',
  cold_elite: '他替你拉开门，动作很轻。“路上小心。”',
  loyal_dog: '他跟着你走到路口，终于停下。“那我明天还能见到你吗？”',
  schemer: '他替你叫了车，关门前说：“今天我没有试探你。你可以相信这一句。”',
  homemaker: '他把保温盒收好，又递给你一小包药。“回去记得吃。”',
  tease: '他往后退了一步，笑着看你。“不送你了。不然我会想再留你一会儿。”',
  rough: '他把你送到门口，站了一会儿。“进去吧。下次别走夜路。”',
  default: '他在门口停下。“今天到这里。”停了一下，又补了一句，“下次也可以。”',
}

export const DATE_CHOICES = [
  [
    { id: 'sit', label: '在他旁边坐下', effect: { closeness: 3, trust: 1 }, text: '你坐近了一点。他没有移开，只把桌上的东西往旁边收了收。' },
    { id: 'tease', label: '先开个玩笑', effect: { closeness: 2, mental: 2 }, text: '你开了个不太高明的玩笑。他愣了一下，还是笑了。' },
    { id: 'quiet', label: '安静地坐一会儿', effect: { mental: 3 }, text: '你们安静了一会儿。外面的声音很远，桌上的灯很稳。' },
  ],
  [
    { id: 'honest', label: '说一点真心话', effect: { trust: 4, closeness: 2 }, text: '你把最近的事说了一点。他没有打断，也没有急着给建议。' },
    { id: 'joke', label: '把话题岔开', effect: { closeness: 1, mental: 1 }, text: '你把话题带到别处。他顺着你，没有追问。' },
    { id: 'ask', label: '问他最近怎么样', effect: { trust: 2, closeness: 3 }, text: '你把问题推回给他。他想了想，第一次没有用一句“没事”带过。' },
  ],
  [
    { id: 'stay', label: '再待一会儿', effect: { closeness: 4, strain: -8 }, text: '你多留了一会儿。谁都没有提时间。' },
    { id: 'walk', label: '一起走回去', effect: { closeness: 2, trust: 1 }, text: '你们沿着空港的灯走回去，脚步不快。' },
  ],
]

export function ensureDateState(run) {
  if (!run) return {}
  if (!run.dates || typeof run.dates !== 'object') run.dates = {}
  return run.dates
}

function dateKey(npc) {
  return npc?.archetype?.id || 'default'
}

export function dateScenes(npc) {
  const key = dateKey(npc)
  const lover = Boolean(npc?.lover)
  return [
    {
      id: 'arrival',
      title: '赴约',
      text: `${OPENERS[key] || OPENERS.default}${lover ? '\n\n你们已经不是第一次见面了，但他还是提前到了。' : ''}`,
      choices: DATE_CHOICES[0],
    },
    {
      id: 'talk',
      title: '坐一会儿',
      text: MIDDLES[key] || MIDDLES.default,
      choices: DATE_CHOICES[1],
    },
    {
      id: 'closing',
      title: '夜色',
      text: `${CLOSERS[key] || CLOSERS.default}${lover ? '\n\n他没有先松开你的手。' : ''}`,
      choices: DATE_CHOICES[2],
    },
  ]
}

export function ensureDate(run, nodeId) {
  const node = run?.map?.nodes?.[nodeId]
  if (!node?.date) return null
  const dates = ensureDateState(run)
  if (!dates[nodeId]) {
    dates[nodeId] = {
      npcId: node.date.npcId,
      promiseId: node.date.promiseId || null,
      scene: 0,
      choices: [],
      done: false,
    }
  }
  return dates[nodeId]
}

export function dateView(run, nodeId) {
  const state = ensureDate(run, nodeId)
  const node = run?.map?.nodes?.[nodeId]
  if (!state || !node) return null
  const npc = run.npcs?.[state.npcId]
  if (!npc) return null
  const scenes = dateScenes(npc)
  const scene = scenes[state.scene] || null
  return {
    state,
    node,
    npc,
    scenes,
    scene,
    index: state.scene,
    total: scenes.length,
    done: state.done,
  }
}

export function chooseDateOption(run, nodeId, choiceId) {
  const view = dateView(run, nodeId)
  if (!view) return { ok: false, message: '这个约会节点已经失效了' }
  if (view.state.done) return { ok: false, message: '这次约会已经结束了' }
  const choice = view.scene?.choices.find((item) => item.id === choiceId)
  if (!choice) return { ok: false, message: '没有这个选项' }
  const npc = view.npc
  const effect = choice.effect || {}
  if (effect.trust) npc.relation.trust = clamp(npc.relation.trust + effect.trust, 0, 100)
  if (effect.closeness) npc.relation.closeness = clamp(npc.relation.closeness + effect.closeness, 0, 100)
  if (effect.mental) run.player.mental = clamp(run.player.mental + effect.mental, 0, run.player.mentalMax)
  if (effect.strain) npc.strain = Math.max(0, (npc.strain || 0) + effect.strain)
  view.state.choices.push(choice.id)
  view.state.scene += 1
  if (view.state.scene >= view.scenes.length) view.state.done = true
  noteNpcInteraction(npc, run.day, 4)
  return {
    ok: true,
    text: choice.text,
    done: view.state.done,
    next: view.state.done ? null : view.scenes[view.state.scene],
  }
}

export function finishDate(run, nodeId) {
  const view = dateView(run, nodeId)
  if (!view || !view.state.done) return { ok: false, message: '这次约会还没有结束' }
  const { npc } = view
  ensureStats(run).dates += 1
  const promise = (run.promises || []).find((item) => item.id === view.state.promiseId)
  if (promise && promise.status === 'open') {
    promise.status = 'done'
    promise.doneDay = run.day
    npc.relation.trust = clamp(npc.relation.trust + 4, 0, 100)
    npc.relation.closeness = clamp(npc.relation.closeness + 5, 0, 100)
    npc.relation.grievance = clamp(npc.relation.grievance - 3, 0, 100)
    npc.strain = Math.max(0, (npc.strain || 0) - 12)
  }
  run.cleared = run.cleared || []
  if (!run.cleared.includes(nodeId)) run.cleared.push(nodeId)
  run.nodeState = run.nodeState || {}
  run.nodeState[nodeId] = { resolved: true, text: view.scenes.at(-1)?.text || '' }
  view.node.date.done = true
  return {
    ok: true,
    npcId: npc.id,
    text: `${npc.name}的约会结束了。`,
  }
}
