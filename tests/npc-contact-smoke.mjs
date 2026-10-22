/**
 * NPC 通讯录：交换联系方式、后台消息与未读红点。
 */

import { randomDraft } from '../src/game-core/character.js'
import { createRun } from '../src/game-core/run.js'
import {
  contactList,
  deleteContact,
  exchangeContact,
  lastNpcMessage,
  markNpcRead,
  sendBackgroundMessages,
  toggleContactMute,
  toggleContactPin,
  unreadCount,
} from '../src/game-core/npc-contact.js'

const errors = []
const check = (condition, label) => { if (!condition) errors.push(label) }

const run = createRun(randomDraft(), 'NPC-CONTACT-TEST')
const npc = Object.values(run.npcs).find((item) => item.alive && item.active !== false && !item.visitor)
if (npc) {
  npc.contact = false
  npc.unread = 0
  check(!contactList(run).some((item) => item.id === npc.id), '未交换联系方式的 NPC 出现在通讯录')
  const exchanged = exchangeContact(run, npc.id)
  check(exchanged.ok, '交换联系方式失败')
  check(contactList(run).some((item) => item.id === npc.id), '交换后没有进入通讯录')
  check(run.npcChats[npc.id]?.length > 0, '交换后没有初始对话')
  check(unreadCount(run) === 0, '交换后不应有未读')

  const sent = sendBackgroundMessages(run, { force: true })
  check(sent.length > 0, '后台没有生成 NPC 消息')
  const target = sent[0].npc
  check(target.unread > 0, '后台消息没有未读红点')
  check(unreadCount(run) > 0, '通讯录没有未读计数')
  check(lastNpcMessage(run, target.id)?.text, '没有最后一条消息')

  npc.active = false
  check(contactList(run).some((item) => item.id === npc.id), '联系人离开当前城市后从通讯录消失')

  markNpcRead(run, target.id)
  check(target.unread === 0 && unreadCount(run) === 0, '打开对话后未读没有清零')

  toggleContactPin(run, npc.id)
  check(contactList(run)[0].id === npc.id, '置顶联系人没有排在最前')
  target.unread = 3
  toggleContactMute(run, target.id)
  check(target.muted === true && unreadCount(run) === 0, '免打扰没有屏蔽未读红点')
  deleteContact(run, target.id)
  check(!contactList(run).some((item) => item.id === target.id), '删除联系人后仍在通讯录')
  check(!run.npcChats[target.id], '删除联系人后聊天记录没有清除')
}

console.log(JSON.stringify({
  ok: errors.length === 0,
  contacts: contactList(run).length,
  errors,
}, null, 2))

if (errors.length) process.exit(1)
