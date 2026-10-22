/**
 * NPC 通讯录：交换联系方式、后台主动消息与未读红点。
 */

import { createRng } from './rng.js'

const BACKGROUND_LINES = {
  gloomy_ghost: ['“今天空港很吵。你那边安静吗。”', '“窗边的位置还空着。只是告诉你一声。”'],
  dry_ghost: ['“货到了。你要的那份我留着。”', '“没事。确认一下你还在。”'],
  jiahao: ['“今天修好了一个小东西。等你回来给你看。”', '“你上次说的那件事，我记着。”'],
  sunshine: ['“今天有好好吃饭吗？没有的话我给你留一份。”', '“看到一朵很奇怪的云。拍不下来，只能讲给你听。”'],
  tycoon: ['“行程我空出来了。你什么时候到。”', '“有件事想当面说。不急，但别太久。”'],
  tsundere: ['“谁在等你了。只是刚好有空。”', '“你今天最好别又失约。”'],
  madman: ['“我想到一个非常糟糕的主意。等你回来再执行。”', '“今天没炸东西。真的。”'],
  yandere: ['“你今天回来得会比昨天晚吗。”', '“我没有在等你。只是没睡。”'],
  cold_elite: ['“确认一下你还安全。”', '“档案里有一页和你的航线对上了。回来再说。”'],
  loyal_dog: ['“你回来了吗？我今天一直在这里。”', '“门口留了灯。你不用急着赶。”'],
  schemer: ['“听说你最近在星图上跑得很勤。我这边有点消息。”', '“有件事想和你交换。你会有兴趣的。”'],
  homemaker: ['“药带了吗？外面降温了。”', '“饭在锅里。回来自己热。”'],
  tease: ['“这么久才回。是不是在想怎么回我？”', '“你最近很忙。忙到连骗我都没时间了。”'],
  rough: ['“活着就回个话。”', '“今天练过了吗。别偷懒。”'],
  default: ['“今天空港的风很大。你那边呢？”', '“看到一件你会喜欢的东西。回来再说。”', '“没什么事。只是想起你。”'],
}

export function ensureNpcContact(npc) {
  if (!npc) return false
  if (typeof npc.contact !== 'boolean') npc.contact = !npc.visitor
  if (typeof npc.unread !== 'number') npc.unread = 0
  return npc.contact
}

export function isContact(run, npc) {
  if (!npc) return false
  if (npc.contact === true) return true
  return npc.contact === undefined && !npc.visitor
}

export function contactList(run) {
  return Object.values(run?.npcs || {}).filter((npc) => (
    npc.alive &&
    !npc.life?.leftCity &&
    isContact(run, npc) &&
    (npc.contact === true || npc.active !== false)
  )).sort((a, b) => {
    if (Boolean(a.pinned) !== Boolean(b.pinned)) return a.pinned ? -1 : 1
    const aDay = lastNpcMessage(run, a.id)?.day || 0
    const bDay = lastNpcMessage(run, b.id)?.day || 0
    if (aDay !== bDay) return bDay - aDay
    return a.name.localeCompare(b.name, 'zh-CN')
  })
}

export function exchangeContact(run, npcId) {
  const npc = run?.npcs?.[npcId]
  if (!npc || !npc.alive) return { ok: false, message: '他无法回应' }
  if (isContact(run, npc)) return { ok: false, message: '你们已经交换过联系方式了' }
  npc.contact = true
  npc.contactDay = run.day
  npc.unread = 0
  npc.relation.trust = Math.min(100, (npc.relation.trust || 0) + 3)
  if (!run.npcChats) run.npcChats = {}
  const chats = run.npcChats[npc.id] || (run.npcChats[npc.id] = [])
  if (!chats.length) {
    chats.push({
      role: 'npc',
      text: '“这是我的频道。别弄丢。”',
      day: run.day,
      contactIntro: true,
    })
  }
  return { ok: true, npc, text: `${npc.name} 把频道号写给了你。通讯录里多了一个人。` }
}

export function lastNpcMessage(run, npcId) {
  const messages = run?.npcChats?.[npcId] || []
  return [...messages].reverse().find((message) => !message.streaming) || null
}

export function unreadCount(run) {
  return contactList(run)
    .filter((npc) => !npc.muted)
    .reduce((sum, npc) => sum + (npc.unread || 0), 0)
}

export function toggleContactPin(run, npcId) {
  const npc = run?.npcs?.[npcId]
  if (!npc) return { ok: false }
  npc.pinned = !npc.pinned
  return { ok: true, pinned: npc.pinned }
}

export function toggleContactMute(run, npcId) {
  const npc = run?.npcs?.[npcId]
  if (!npc) return { ok: false }
  npc.muted = !npc.muted
  if (npc.muted) npc.unread = 0
  return { ok: true, muted: npc.muted }
}

export function deleteContact(run, npcId) {
  const npc = run?.npcs?.[npcId]
  if (!npc) return { ok: false }
  npc.contact = false
  npc.pinned = false
  npc.muted = false
  npc.unread = 0
  npc.contactDeletedDay = run.day
  if (run.npcChats) delete run.npcChats[npcId]
  return { ok: true }
}

export function markNpcRead(run, npcId) {
  const npc = run?.npcs?.[npcId]
  if (!npc) return
  npc.unread = 0
}

export function sendBackgroundMessages(run, options = {}) {
  if (!run?.npcs) return []
  const rng = createRng(`${run.seed}:npc-background:${run.day}`)
  const contacts = contactList(run).filter((npc) => !npc.hostile)
  if (!contacts.length) return []
  if (!options.force && !rng.chance(0.4)) return []
  const count = options.force ? 1 : rng.int(1, Math.min(2, contacts.length))
  const sent = []
  const pool = rng.shuffle(contacts)
  for (let index = 0; index < count && index < pool.length; index += 1) {
    const npc = pool[index]
    if (!run.npcChats) run.npcChats = {}
    const chats = run.npcChats[npc.id] || (run.npcChats[npc.id] = [])
    const lines = BACKGROUND_LINES[npc.archetype?.id] || BACKGROUND_LINES.default
    const line = rng.pick(lines)
    const message = {
      role: 'npc',
      text: line,
      day: run.day,
      background: true,
    }
    chats.push(message)
    if (chats.length > 30) chats.splice(0, chats.length - 30)
    npc.unread = (npc.unread || 0) + 1
    sent.push({ npc, message })
  }
  return sent
}
