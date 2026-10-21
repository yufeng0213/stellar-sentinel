/**
 * 约会节点：从约定生成地图节点，三段 AVG 选择与完成结算。
 */

import { randomDraft } from '../src/game-core/character.js'
import { createRun } from '../src/game-core/run.js'
import { npcList } from '../src/game-core/npc.js'
import { createPromise } from '../src/game-core/npc-promises.js'
import { chooseDateOption, dateView, finishDate } from '../src/game-core/date-story.js'
import { validateRun } from '../src/game/save.js'

const errors = []
const check = (condition, label) => { if (!condition) errors.push(label) }

const run = createRun(randomDraft(), 'DATE-TEST')
const npc = npcList(run)[0]
npc.relation.trust = 40
npc.relation.closeness = 30
npc.strain = 10

const promise = createPromise(run, npc, 'visit')
check(promise.ok, '约会约定创建失败')
check(!!promise.dateNode, '没有生成约会地图节点')
const nodeId = promise.dateNode?.id
const node = run.map.nodes[nodeId]
check(node?.type === 'date', '地图节点类型不是约会')
check(node?.date?.npcId === npc.id, '约会节点没有绑定 NPC')

const first = dateView(run, nodeId)
check(first?.scene?.choices.length >= 3, '第一幕没有选项')
check(first.scene.text.length > 0, '第一幕没有文本')
const chosen = chooseDateOption(run, nodeId, first.scene.choices[0].id)
check(chosen.ok, '第一幕选项失败')
check(dateView(run, nodeId).index === 1, '第一幕没有推进')

const second = dateView(run, nodeId)
chooseDateOption(run, nodeId, second.scene.choices[0].id)
const third = dateView(run, nodeId)
chooseDateOption(run, nodeId, third.scene.choices[0].id)
const ended = dateView(run, nodeId)
check(ended.state.done, '第三幕后约会没有结束')

const beforeTrust = npc.relation.trust
const finished = finishDate(run, nodeId)
check(finished.ok, '约会完成结算失败')
check(promise.promise.status === 'done', '约会完成后约定没有完成')
check(run.cleared.includes(nodeId), '约会节点没有标记完成')
check(node.date.done === true, '约会节点没有记录完成')
check(npc.relation.trust >= beforeTrust, '约会没有提升信任')

const imported = validateRun(JSON.parse(JSON.stringify(run)))
check(imported.ok, '约会存档校验失败')
check(imported.run.dates?.[nodeId]?.done === true, '存档没有保留约会状态')

console.log(JSON.stringify({
  ok: errors.length === 0,
  nodeId,
  scenes: first.total,
  promise: promise.promise.status,
  cleared: run.cleared.includes(nodeId),
  errors,
}, null, 2))

if (errors.length) process.exit(1)
