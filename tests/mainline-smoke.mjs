/**
 * 主线章节、地穴命名、任务板、黑市情报与酒馆传闻。
 */

import { randomDraft } from '../src/game-core/character.js'
import { createRun } from '../src/game-core/run.js'
import {
  advanceChapter,
  chapterStatus,
  MAIN_CHAPTERS,
} from '../src/game-core/story.js'
import {
  buyBlackMarketIntel,
  claimCityQuest,
  ensureCity,
  tavernRumor,
} from '../src/game-core/city.js'
import { ensureDungeon, rerollDungeon, setDungeonName } from '../src/game-core/dungeon.js'
import { buildDungeonNameMessages, stripDungeonName } from '../src/game/dungeon.js'
import { validateRun } from '../src/game/save.js'

const errors = []
const check = (condition, label) => { if (!condition) errors.push(label) }

const run = createRun(randomDraft(), 'MAIN-TEST')
const dungeon = ensureDungeon(run)
check(dungeon?.name?.length >= 2, '没有生成地穴名')
check(setDungeonName(run, '静默回廊 · 下层', 'llm').ok, '合法地穴名被拒绝')
check(!setDungeonName(run, 'a', 'llm').ok, '过短地穴名没有被拒绝')
rerollDungeon(run)
check(run.dungeon.name.length >= 2, '本地重掷没有生成名字')

const initial = chapterStatus(run)
check(initial.current === 1, '初始章节不是第一章')
check(!initial.complete, '第一章初始状态不应完成')
run.cleared.push('fake-a', 'fake-b')
check(chapterStatus(run).complete, '清理节点后第一章没有完成')
const advanced = advanceChapter(run)
check(advanced.ok && advanced.chapter === 2, '没有推进到第二章')
check(run.story.flags.chapter_1_done, '没有记录第一章完成 flag')
check(!chapterStatus(run).complete, '第二章初始不应完成')

run.story.flags.intel = true
check(chapterStatus(run).complete, '黑市情报没有完成第二章')
check(advanceChapter(run).ok && run.story.chapter === 3, '没有推进到第三章')
run.cleared.push(run.map.bossId)
check(chapterStatus(run).complete, '清理首领后第三章没有完成')
check(advanceChapter(run).ok && run.story.chapter === 4, '没有推进到第四章')

const city = ensureCity(run)
check(city.quests.length > 0, '任务板没有生成委托')
const deliver = city.quests.find((quest) => quest.type === 'deliver')
if (deliver) {
  run.inv[deliver.key] = (run.inv[deliver.key] || 0) + deliver.need
  const before = run.player.credits
  const claimed = claimCityQuest(run, deliver.id)
  check(claimed.ok, '交付委托失败')
  check(run.player.credits === before + deliver.reward, '委托奖励没有到账')
  check(deliver.status === 'done', '委托状态没有完成')
}

check(city.blackmarket.length > 0, '黑市没有货')
run.player.credits = 300
const creditsBefore = run.player.credits
const intel = buyBlackMarketIntel(run)
check(intel.ok, '购买黑市情报失败')
check(run.story.flags.intel, '情报没有写入主线 flag')
check(run.player.credits === creditsBefore - 60, '情报没有扣信用点')

const rumor = tavernRumor(run)
check(rumor.ok && rumor.text.length > 5, '没有生成酒馆传闻')
check(tavernRumor(run).cached, '同一天传闻没有缓存')

const prompt = buildDungeonNameMessages(run).messages.map((item) => item.content).join('\n')
check(prompt.includes('2–8'), '地穴命名 prompt 缺少长度要求')
check(stripDungeonName('```\n静默回廊\n```') === '静默回廊', '地穴名清理失败')

const imported = validateRun(JSON.parse(JSON.stringify(run)))
check(imported.ok, '主线存档校验失败')
check(imported.run.story.chapter === 4, '存档没有保留章节')
check(imported.run.dungeon.name.length >= 2, '存档没有保留地穴名')
check(MAIN_CHAPTERS.length >= 4, '主线章节数量不足')

if (errors.length) {
  console.error('FAILED')
  errors.forEach((error) => console.error(' -', error))
  process.exit(1)
}

console.log(JSON.stringify({
  ok: true,
  chapter: run.story.chapter,
  dungeon: run.dungeon.name,
  quests: city.quests.length,
  blackmarket: city.blackmarket.length,
  rumor: rumor.text,
}, null, 2))
