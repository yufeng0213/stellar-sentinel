/**
 * 吃醋对峙链：警告 → 告状 → 玩家裁决。
 */

import { randomDraft } from '../src/game-core/character.js'
import { createRun } from '../src/game-core/run.js'
import { startJealousyConfrontation } from '../src/game-core/npc-jealousy.js'
import { resolveInboxEvent } from '../src/game-core/npc-events.js'

const errors = []
const check = (condition, label) => { if (!condition) errors.push(label) }

const run = createRun(randomDraft(), 'JEALOUSY-CHAIN-TEST')
const npcs = Object.values(run.npcs).filter((npc) => npc.alive && npc.active !== false)
const jealous = npcs[0]
const rival = npcs[1]
if (jealous && rival) {
  jealous.lover = true
  rival.lover = true
  jealous.relation.closeness = 70
  rival.relation.closeness = 60
  const started = startJealousyConfrontation(run, jealous.id, rival.id)
  check(started.ok && started.chain, '没有生成吃醋对峙')
  check(started.event?.type === 'jealousy_report', '没有生成告状事件')
  check(run.worldEvents.some((event) => event.text.includes('警告')), '没有记录警告事件')
  if (started.event) {
    run.inbox.unshift(started.event)
    const resolved = resolveInboxEvent(run, started.event.id, 'mediate')
    check(resolved.ok, '告状事件处理失败')
    check(started.chain.resolved === true, '对峙链没有结束')
    check(run.inbox.find((event) => event.id === started.event.id)?.status === 'resolved', '告状事件没有标记完成')
    check(jealous.relation.trust > 0 && rival.relation.trust > 0, '调解没有提升双方信任')
  }
}

console.log(JSON.stringify({
  ok: errors.length === 0,
  chains: run.jealousyChains?.length || 0,
  errors,
}, null, 2))

if (errors.length) process.exit(1)
