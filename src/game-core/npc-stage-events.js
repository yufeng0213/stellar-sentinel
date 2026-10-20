/**
 * 好感期事件：不同人设表达“想再靠近一点”的方式。
 * 接受后进入暧昧阶段；拒绝不会清空关系，只是暂时停在好感。
 */

export const STAGE_EVENTS = {
  gloomy_ghost: {
    id: 'bond_gloomy',
    minTrust: 35,
    minCloseness: 20,
    title: '他梦到了你的门',
    text: '他隔了很久才回消息，说自己昨晚梦见你站在门口，没有进来。他没有问那是不是真的，只问：“你今天会来吗？”',
    choices: [
      { id: 'step', label: '说会去', outcome: { text: '你说会。他回得很快，只有一个“好”，但之后一直没有关机。', closeness: 6, trust: 2, advance: true } },
      { id: 'retreat', label: '说最近很忙', outcome: { text: '你说最近走不开。他回“嗯”，没有再追问。', closeness: -1 } },
    ],
  },
  dry_ghost: {
    id: 'bond_dry',
    minTrust: 35,
    minCloseness: 20,
    title: '他已经到了',
    text: '他没有提前问，直接出现在你门口。“顺路。”他说。可他手里的东西明显是刚买的，还热着。',
    choices: [
      { id: 'step', label: '让他进来', outcome: { text: '你侧身让开。他进门时没有碰你，只把东西放在桌上，说“趁热”。', closeness: 6, trust: 2, advance: true } },
      { id: 'retreat', label: '说今天不方便', outcome: { text: '你说今天不方便。他点头，把东西留下就走了。', closeness: -1 } },
    ],
  },
  jiahao: {
    id: 'bond_jiahao',
    minTrust: 30,
    minCloseness: 15,
    title: '他练习了很多遍',
    text: '他站在走廊尽头，看到你之后明显卡了一下。“我有个事。”他清了清嗓子，“不是很重要。就是……周末你有没有空。”',
    choices: [
      { id: 'step', label: '说有空', outcome: { text: '他愣了两秒，随即把脸别开。“哦。那行。”口罩上方露出的耳朵有点红。', closeness: 5, trust: 2, advance: true } },
      { id: 'retreat', label: '说还不确定', outcome: { text: '他立刻说“没事，我就随便问问”，然后转身走了。', closeness: -1 } },
    ],
  },
  sunshine: {
    id: 'bond_sunshine',
    minTrust: 30,
    minCloseness: 15,
    title: '想多聊一会儿',
    text: '他明明已经走到门口了，又折回来。“你今晚有空吗？没什么事，就是想多聊一会儿。”',
    choices: [
      { id: 'step', label: '留下来聊', outcome: { text: '你们聊到灯自动调暗。他讲了很多不重要的小事，中间有几次只是看着你笑。', closeness: 6, trust: 2, mental: 3, advance: true } },
      { id: 'retreat', label: '说改天', outcome: { text: '你说改天。他点头，还是笑着，只是走得慢了一点。', closeness: -1 } },
    ],
  },
  tycoon: {
    id: 'bond_tycoon',
    minTrust: 40,
    minCloseness: 20,
    title: '他把今晚空了出来',
    text: '“今晚没有安排。”他说得很平静，像在陈述一项已经决定的事，“你要不要过来。”',
    choices: [
      { id: 'step', label: '答应', outcome: { text: '你答应后，他立刻把后面的安排推掉了。饭桌上没有谈生意，只问了你最近累不累。', closeness: 5, trust: 3, advance: true } },
      { id: 'retreat', label: '说还有事', outcome: { text: '你说还有事。他看了你一会儿，说“下次提前告诉我”，没有拦你。', closeness: -1 } },
    ],
  },
  tsundere: {
    id: 'bond_tsundere',
    minTrust: 30,
    minCloseness: 20,
    title: '你是不是对谁都这样',
    text: '他一直没看你，突然问：“你是不是对谁都这么……随便。”说完自己先皱了下眉，像是后悔问出口。',
    choices: [
      { id: 'step', label: '说只对你这样', outcome: { text: '他猛地抬头，又立刻移开视线。“……哦。”声音比平时轻很多。', closeness: 6, trust: 2, advance: true } },
      { id: 'retreat', label: '反问他为什么在意', outcome: { text: '他立刻说“谁在意了”，然后把话题岔开。', closeness: 1 } },
    ],
  },
  madman: {
    id: 'bond_madman',
    minTrust: 30,
    minCloseness: 20,
    title: '半夜的计划',
    text: '他发来一张画满箭头的地图，后面跟着一句：“如果今晚不睡，你想不想跟我去看点不该看的东西？”',
    choices: [
      { id: 'step', label: '跟他去', outcome: { text: '你们在空港最高处待到天亮。他一直在讲那些疯狂的念头，偶尔停下来确认你还在。', closeness: 6, trust: 2, mental: -3, advance: true } },
      { id: 'retreat', label: '让他早点睡', outcome: { text: '你让他睡觉。他发来一串省略号，最后还是说了晚安。', closeness: -1 } },
    ],
  },
  yandere: {
    id: 'bond_yandere',
    minTrust: 40,
    minCloseness: 25,
    title: '他梦见你走了',
    text: '他坐在床边，像是刚醒。“我梦见你走了。”他停了一下，“我知道只是梦。但你能不能……今天别走太远。”',
    choices: [
      { id: 'step', label: '答应今天留下', outcome: { text: '你说今天不走太远。他松了一口气，慢慢把额头靠在你肩上。', closeness: 6, trust: 3, advance: true } },
      { id: 'retreat', label: '说你需要空间', outcome: { text: '你说需要一点空间。他沉默了很久，最后松开手，说“我知道了”。', closeness: -2, trust: 2 } },
    ],
  },
  cold_elite: {
    id: 'bond_cold',
    minTrust: 35,
    minCloseness: 20,
    title: '没有寄出的记录',
    text: '他递来一份整理好的记录。最后一页夹着一张没有寄出的便条，上面只有一句：“今天也没有见到你。”',
    choices: [
      { id: 'step', label: '把便条收下', outcome: { text: '你把便条折好。他没有解释，只把桌上的另一份记录往你那边推了推。', closeness: 5, trust: 3, advance: true } },
      { id: 'retreat', label: '当作没看见', outcome: { text: '你把记录合上，没有提那张便条。他也当作什么都没有发生。', closeness: -1 } },
    ],
  },
  loyal_dog: {
    id: 'bond_loyal',
    minTrust: 30,
    minCloseness: 20,
    title: '他一直在门口',
    text: '你回来时，他还坐在门口，灯已经快没电了。“我不是在等你。”他说，“就是……想多和你说几句话。”',
    choices: [
      { id: 'step', label: '陪他坐一会儿', outcome: { text: '你在旁边坐下。他立刻往你这边挪了一点，又假装只是换了个姿势。', closeness: 6, trust: 2, advance: true } },
      { id: 'retreat', label: '让他回去休息', outcome: { text: '你让他回去睡。他站起来，走了两步又回头看了你一眼。', closeness: -1 } },
    ],
  },
  schemer: {
    id: 'bond_schemer',
    minTrust: 40,
    minCloseness: 20,
    title: '他试探了一句',
    text: '“你最近和谁走得近？”他问得很随意，手指却在杯沿上停住了。',
    choices: [
      { id: 'step', label: '告诉他实话', outcome: { text: '你说最近最常联系的人是他。他抬眼看了你一会儿，笑了。“这个答案可以。”', closeness: 5, trust: 3, advance: true } },
      { id: 'retreat', label: '反问他为什么问', outcome: { text: '他把问题轻轻推回来，最后谁都没有回答。', closeness: 1 } },
    ],
  },
  homemaker: {
    id: 'bond_homemaker',
    minTrust: 30,
    minCloseness: 20,
    title: '明天想吃什么',
    text: '他一边收拾桌子一边问：“明天想吃什么？”停了一下，又补了一句，“我不是在催你回来。只是可以先准备。”',
    choices: [
      { id: 'step', label: '说明天会回来', outcome: { text: '你说会回来。他点点头，把明天的时间记在了纸上，动作很轻。', closeness: 6, trust: 3, advance: true } },
      { id: 'retreat', label: '说不用准备', outcome: { text: '你说不用特意准备。他应了一声，还是把那张纸留在了桌上。', closeness: -1 } },
    ],
  },
  tease: {
    id: 'bond_tease',
    minTrust: 35,
    minCloseness: 20,
    title: '他只说了一半',
    text: '“我昨天梦到你了。”他说完就停住，等你追问。通讯那头很安静，只有一点笑意。',
    choices: [
      { id: 'step', label: '追问他梦到什么', outcome: { text: '他故意绕了两圈，最后才说：“梦到你主动来找我。”然后安静地等你回答。', closeness: 5, trust: 2, advance: true } },
      { id: 'retreat', label: '不接这个话', outcome: { text: '你换了话题。他顺着你聊下去，只是没有再提那个梦。', closeness: -1 } },
    ],
  },
  rough: {
    id: 'bond_rough',
    minTrust: 30,
    minCloseness: 20,
    title: '他直接问了',
    text: '“你最近是不是总想着我。”他说得像在确认一件工具的位置，问完也没有移开视线。',
    choices: [
      { id: 'step', label: '承认', outcome: { text: '你说差不多。他沉默了两秒，喉结动了一下。“行。知道了。”', closeness: 6, trust: 2, advance: true } },
      { id: 'retreat', label: '说他自作多情', outcome: { text: '你说他自作多情。他哼了一声，转身去检查装备，耳朵却红了。', closeness: 1 } },
    ],
  },
}

export function stageEventFor(npc) {
  const id = npc?.archetype?.id
  return id ? STAGE_EVENTS[id] || null : null
}
