/**
 * 小游戏挑战：随机目标、时长、动作预检与强制结果。
 */

import { randomDraft } from '../src/game-core/character.js'
import { challengeFor, miniGameSuccess, shouldOfferMiniGame } from '../src/game-core/minigames.js'
import { gather } from '../src/game-core/run.js'
import { createRun } from '../src/game-core/run.js'

const errors = []
const check = (condition, label) => { if (!condition) errors.push(label) }

const run = createRun(randomDraft(), 'MINIGAME-TEST')
const challenge = challengeFor(run, { kind: 'steal_shop', nodeId: 'shop-1', index: 0 })
check(challenge.game === 'blocks', '没有生成方块挑战')
check(challenge.target >= 300, '扒窃目标过低')
check(challenge.duration >= 21 && challenge.duration <= 45, '挑战时长越界')
check(!miniGameSuccess(challenge, challenge.target - 10), '未达目标却判定成功')
check(miniGameSuccess(challenge, challenge.target), '达到目标却没有判定成功')
check(shouldOfferMiniGame(run, 'steal_shop'), '商店扒窃没有触发小游戏')
check(challenge.context.kind === 'steal_shop', '小游戏没有记录上下文')

const again = challengeFor(run, { kind: 'steal_shop', nodeId: 'shop-1', index: 0 })
check(again.target === challenge.target, '同状态小游戏目标不确定')

const gatherNode = Object.values(run.map.nodes).find((node) => node.type === 'gather')
if (gatherNode) {
  run.location = gatherNode.id
  run.ap = 8
  const success = gather(run, gatherNode.id, { forceSuccess: true })
  check(success.ok && success.gains && Object.keys(success.gains).length > 0, '小游戏成功没有获得采集物')
  run.ap = 8
  const failed = gather(run, gatherNode.id, { forceFailure: true })
  check(failed.ok && (!failed.gains || !Object.keys(failed.gains).length), '小游戏失败仍然获得采集物')
}

console.log(JSON.stringify({ ok: errors.length === 0, errors }, null, 2))
if (errors.length) process.exit(1)
