/**
 * 开局剧情：场景、醒来地点、开场文本与第一次判定。
 * 这里只做本地结构；LLM 只负责把结构写得更具体，不改数值。
 */

import { ORIGINS } from './data.js'
import { createRng } from './rng.js'

export const STORY_CHAPTER = {
  id: 'white-tower',
  number: 1,
  title: '失联的白塔',
  objective: '沿着重复的坐标，找到白塔失联前留下的信号源。',
}

const scene = (id, name, place, region, glyph, tone, details, opening, choices, tags = []) => ({
  id,
  name,
  place,
  region,
  glyph,
  tone,
  details,
  opening,
  choices,
  tags,
})

export const AWAKENINGS = [
  scene(
    'cryo',
    '冷冻舱',
    '白塔空港 · 医疗层',
    'dock',
    '❄',
    '冷白色的灯管在头顶嗡嗡作响，空气里全是消毒水和解冻液的味道。',
    ['舱门上的编号被刮掉了一半', '隔间外传来拖拽金属的声音', '你的手腕上有一道旧针孔'],
    '你缓缓睁开双眼，眼前是白塔空港医疗层灰白色的天花板。解冻液顺着指缝往下滴，你想不起自己为什么躺在这里，只记得一个重复的坐标。',
    [
      { id: 'listen', label: '屏住呼吸，听外面的动静', attr: 'per', dc: 12, skill: 'stealth', success: '你听见拖拽声停在门外，接着是两声很轻的敲击。有人知道你醒了。', failure: '你只听见自己的心跳。门外的声音忽然消失了。' },
      { id: 'force', label: '直接推开舱门', attr: 'vit', dc: 11, success: '舱门被推开一条缝，走廊尽头的应急灯正好亮起。', failure: '舱门卡住了。你用力过猛，手掌被金属边缘划开。' },
    ],
    ['冷冻舱', '失忆', '白塔空港']
  ),
  scene(
    'wreck',
    '坠毁舰桥',
    '锈红海 · 断桅舰',
    'wreck',
    '✦',
    '倾斜的舰桥窗外，锈红色的海面一直烧到天边。',
    ['导航台还在闪，屏幕上反复出现同一个坐标', '座椅上绑着一具早已风干的尸体', '地板下传来某种东西爬过的声音'],
    '你在一艘半截插进浅海的旧舰上醒来。警报已经停了很久，只有导航台还在重复那段坐标。你想不起自己的名字，但手先摸到了座椅旁的应急刀。',
    [
      { id: 'log', label: '调出导航台最后一条记录', attr: 'tec', dc: 13, skill: 'hacking', success: '记录里只剩一句话：不要相信白塔的回收队。', failure: '导航台冒出火花，最后一条记录被烧成了空白。' },
      { id: 'below', label: '掀开地板，看看下面是什么', attr: 'per', dc: 12, success: '你在电缆夹层里找到一只防水袋，里面有一枚旧钥匙。', failure: '地板下只有海水和一团缠住的线缆。你退开时，听见它动了一下。' },
    ],
    ['坠毁', '旧舰', '锈红海']
  ),
  scene(
    'rain',
    '雨夜巷口',
    '白塔空港 · 黑市下层',
    'dock',
    '☂',
    '雨水从生锈的遮棚边缘连成线，霓虹灯把整条巷子染成浑浊的紫色。',
    ['巷口有人把风', '你口袋里只有半张被雨泡烂的通行证', '远处的广播在重复宵禁通知'],
    '你在一间关了门的铺子后巷醒来，脸上全是雨水。通行证上的照片被水泡得看不清，只有姓氏还剩一笔。巷口有人压着声音说话，像是在等谁。',
    [
      { id: 'listen', label: '贴着墙听他们说什么', attr: 'per', dc: 12, skill: 'lore', success: '你听见“白塔的货”和“今晚就动手”。他们把你也算进去了。', failure: '雨声太大，你只捕捉到半句威胁。' },
      { id: 'walk', label: '低着头从巷口走出去', attr: 'agi', dc: 11, skill: 'stealth', success: '你混进夜班人群，没人回头。', failure: '有人叫住了你。他的手已经按在腰后。' },
    ],
    ['雨夜', '黑市', '通行证']
  ),
  scene(
    'mine',
    '矿难废墟',
    '深岩矿脉 · 三号竖井',
    'mine',
    '⛏',
    '粉尘悬浮在矿灯的光柱里，塌方后的碎石一直堆到腰高。',
    ['安全帽上写着别人的编号', '通风管里传来断断续续的敲击声', '你的靴底沾着尚未干透的泥'],
    '你在矿难后的三号竖井醒来。头顶的岩层还在响，矿灯一闪一闪。你不记得自己是怎么下来的，但记得这里不该有人还活着。',
    [
      { id: 'knock', label: '敲击通风管回应', attr: 'wil', dc: 12, success: '敲击声停了片刻，然后用同样的节奏回了你三下。还有活人。', failure: '敲击声骤然停止，碎石深处传来一声叹息。' },
      { id: 'climb', label: '沿着塌方边缘往上爬', attr: 'vit', dc: 13, success: '你抓住一根旧钢梁，爬到了上一层平台。', failure: '脚下的碎石滑开，你摔回井底，膝盖传来钝痛。' },
    ],
    ['矿难', '深岩', '求救']
  ),
  scene(
    'tower',
    '白塔地下层',
    '白塔 · 静默档案库',
    'silence',
    '▣',
    '档案库的灯只亮了一排，成排的金属柜像沉默的墓碑。',
    ['最里面的柜门开着', '地面上有一道拖拽过的血迹', '空气里有旧纸和冷金属的味道'],
    '你在一排档案柜之间醒来。白塔的静默档案库本该只有授权人员能进，可你的手环还亮着访客权限。你想不起是谁给了你这个权限。',
    [
      { id: 'file', label: '查看开着的那只档案柜', attr: 'per', dc: 13, skill: 'lore', success: '柜子里只剩一张借阅卡，签名是你的名字。日期是今天。', failure: '柜子已经空了。你翻动夹层时，听见身后的门轻轻合上。' },
      { id: 'light', label: '关掉手环，摸黑往出口走', attr: 'agi', dc: 12, skill: 'stealth', success: '你贴着柜子走到门口，巡逻灯的频率刚好错开。', failure: '手环的余光暴露了你。走廊尽头有人停下了脚步。' },
    ],
    ['白塔', '档案库', '权限']
  ),
  scene(
    'train',
    '边境列车',
    '边境线 · 第七节车厢',
    'ruins',
    '▤',
    '列车在夜里行驶，窗外只有偶尔闪过的信号灯和荒地。',
    ['车厢里没有其他乘客', '你的车票上印着一个陌生名字', '广播说下一站不停车'],
    '你在一列不知开往哪里的边境列车上醒来。窗外没有站台，只有不断后退的黑色荒地。车票上的名字不是你的，但照片是你。',
    [
      { id: 'brake', label: '拉下紧急制动', attr: 'tec', dc: 13, skill: 'mechanics', success: '列车尖叫着减速，你在车门打开前跳进了荒地。', failure: '制动杆纹丝不动。广播里的声音停顿了一秒，开始念你的名字。' },
      { id: 'next', label: '走向下一节车厢', attr: 'wil', dc: 12, success: '最后一节车厢里坐着一个等你的人。他抬起头，像是早就知道你会来。', failure: '你推开车门，下一节车厢的灯在你踏进去的瞬间全灭了。' },
    ],
    ['列车', '边境', '陌生名字']
  ),
  scene(
    'spore',
    '孢雾林',
    '孢雾林 · 采集营地',
    'grove',
    '❧',
    '孢子在低处浮动，呼吸面罩的滤芯已经快撑不住了。',
    ['营地里的火堆还有余温', '采集箱被撬开，里面的样本不见了', '林子里有东西在跟着你'],
    '你在孢雾林的采集营地醒来。面罩上的计时器只剩二十分钟，营地被人翻过，火堆却还是热的。你想不起自己是采集者，还是被采集的那个。',
    [
      { id: 'track', label: '沿着被踩倒的孢子草追', attr: 'per', dc: 13, skill: 'tracking', success: '脚印通向一处分岔，那里有人留下了一枚白塔徽章。', failure: '孢子草很快恢复原状，你失去了方向。' },
      { id: 'mask', label: '先回营地找备用滤芯', attr: 'tec', dc: 12, success: '你在工具箱底层找到一只未拆封的滤芯，刚好够你走出林子。', failure: '工具箱是空的。计时器又跳了一分钟。' },
    ],
    ['孢雾林', '采集', '追逐']
  ),
  scene(
    'chapel',
    '静默教堂',
    '低语者礼拜堂 · 地下祷告室',
    'silence',
    '✧',
    '祷告室里没有回声，连呼吸都像被墙面吞掉。',
    ['长椅上放着一件叠好的外衣', '祭坛上点着七支蜡烛', '你的名字被刻在最后一排木椅上'],
    '你在低语者的地下祷告室醒来。这里安静得过分，连心跳都显得冒犯。最后一排木椅上刻着你的名字，笔迹很新。',
    [
      { id: 'pray', label: '在祭坛前坐下，听静默', attr: 'wil', dc: 13, success: '静默里浮出一个声音。它说：白塔的门还开着。', failure: '你听见自己的耳鸣。七支蜡烛同时暗了一瞬。' },
      { id: 'search', label: '检查那件叠好的外衣', attr: 'per', dc: 12, success: '外衣内衬缝着一枚旧钥匙和一张手绘星图。', failure: '外衣上只有一股冷金属味。你翻遍口袋，什么也没找到。' },
    ],
    ['低语者', '静默', '钥匙']
  ),
  scene(
    'clinic',
    '黑市诊所',
    '白塔空港 · 后巷手术室',
    'dock',
    '✚',
    '手术灯没关，器械盘里的血已经干成深褐色。',
    ['你的手臂上还插着输液针', '病历本翻到最后一页', '门外有人在和诊所老板争吵'],
    '你在黑市诊所的手术台上醒来。输液针还插在手臂上，病历本翻到最后一页，上面写着“记忆清除未完成”。门外的人正在为你的费用争吵。',
    [
      { id: 'read', label: '拔掉针，先看病历', attr: 'per', dc: 12, skill: 'medicine', success: '病历里夹着一张转账单，付款人一栏写着白塔。', failure: '你只来得及看清“未完成”三个字，门外的争吵停了。' },
      { id: 'escape', label: '从后窗翻出去', attr: 'agi', dc: 11, skill: 'stealth', success: '你落在后巷的垃圾箱上，没人追出来。', failure: '后窗卡住了。诊所老板推门进来时，你正站在窗台上。' },
    ],
    ['诊所', '记忆清除', '黑市']
  ),
  scene(
    'sand',
    '沙暴哨站',
    '边境线 · 废弃气象站',
    'ruins',
    '◌',
    '沙暴把气象站的外墙打得噼啪作响，备用电源只够再撑几个小时。',
    ['无线电里有人在呼叫同一个编号', '观测日志停在三天前', '门外停着一辆没熄火的越野车'],
    '你在边境线的废弃气象站醒来。沙暴封住了门，无线电却还在重复呼叫一个编号，正好是你手环上刻着的数字。门外有一辆车，引擎还是热的。',
    [
      { id: 'radio', label: '回应无线电', attr: 'soc', dc: 12, skill: 'communication', success: '对面沉默了几秒，然后说：终于有人醒了。', failure: '你按下通话键，对面却开始播放一段不属于任何人的呼吸声。' },
      { id: 'outside', label: '顶着沙暴去检查那辆车', attr: 'vit', dc: 13, success: '车里没有人，后座放着一只标着你的名字的医疗箱。', failure: '你被沙暴逼回门口，车灯的余晖里似乎站着一个人。' },
    ],
    ['沙暴', '气象站', '无线电']
  ),
]

export const AWAKENING_BY_ID = Object.fromEntries(AWAKENINGS.map((item) => [item.id, item]))

export function createStoryState() {
  return {
    chapter: STORY_CHAPTER.number,
    title: STORY_CHAPTER.title,
    objective: STORY_CHAPTER.objective,
    awakening: null,
    stage: 'select',
    opening: null,
    choice: null,
    flags: {},
  }
}

export function getAwakening(id) {
  return AWAKENING_BY_ID[id] || null
}

export function localOpening(run, awakening) {
  if (!awakening) return ''
  const name = run?.player?.name || '你'
  const origin = ORIGINS[run?.player?.origin]?.name
  return `${awakening.place}。${awakening.opening}\n\n你试着回想自己的名字。${name}${origin ? `，来自${origin}` : ''}。这个答案像是别人塞给你的。${awakening.tone}`
}

export function startAwakening(run, id) {
  const awakening = getAwakening(id)
  if (!awakening) return { ok: false, message: '没有这个醒来地点' }
  run.story = {
    ...createStoryState(),
    ...(run.story || {}),
    awakening: id,
    stage: 'opening',
    opening: {
      text: localOpening(run, awakening),
      source: 'local',
      day: run.day,
    },
    choice: null,
  }
  return { ok: true, awakening }
}

function checkAttr(run, key) {
  const value = run?.player?.attrs?.[key]
  return typeof value === 'number' ? value : 3
}

export function resolveOpeningChoice(run, choiceId) {
  const awakening = getAwakening(run?.story?.awakening)
  if (!awakening) return { ok: false, message: '还没有选择醒来地点' }
  if (run.story.stage !== 'opening') return { ok: false, message: '这段开场已经结束' }
  const choice = awakening.choices.find((item) => item.id === choiceId)
  if (!choice) return { ok: false, message: '没有这个选项' }

  const bonus = choice.skill && run.player.skills?.includes(choice.skill) ? 2 : 0
  const rng = createRng(`${run.seed}:story:${run.rollCount}`)
  const roll = 1 + Math.floor(rng.next() * 20)
  const total = roll + checkAttr(run, choice.attr) + bonus
  const success = roll === 20 || (roll !== 1 && total >= choice.dc)
  run.rollCount += 1

  const text = success ? choice.success : choice.failure
  run.story.stage = 'done'
  run.story.flags[choice.id] = success
  run.story.choice = {
    id: choice.id,
    label: choice.label,
    success,
    roll,
    total,
    dc: choice.dc,
    text,
  }
  return {
    ok: true,
    success,
    text,
    roll,
    total,
    dc: choice.dc,
    choice: run.story.choice,
  }
}
