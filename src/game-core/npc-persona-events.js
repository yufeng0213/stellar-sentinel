/**
 * 人设专属事件：每个原型一条只在信任达到后出现的短事件。
 * 文案只写相处方式和边界，不写露骨或胁迫内容。
 */

export const PERSONA_EVENTS = {
  gloomy_ghost: {
    id: 'persona_gloomy',
    minTrust: 25,
    title: '门外的影子',
    text: '门缝下面多了一张折起来的纸。你打开门，走廊尽头只有一盏灯在闪。纸上写着一行字：“今天风大，窗关好。”',
    choices: [
      { id: 'keep', label: '把纸收起来', outcome: { text: '你把纸折好放进口袋。第二天，他没有问起。', closeness: 5, trust: 2 } },
      { id: 'ask', label: '去问他', outcome: { text: '你敲了门。他隔着门说“不是我”，但门一直没有关上。', closeness: 3, trust: 1, mental: -1 } },
    ],
  },
  dry_ghost: {
    id: 'persona_dry',
    minTrust: 25,
    title: '顺路',
    text: '他靠在空港的闸门边，脚边放着一只不大的箱子。“顺路。你走不走？”箱子上的封条写着你的名字。',
    choices: [
      { id: 'join', label: '跟他走', outcome: { text: '他拎起箱子走在你前面，脚步不快，刚好让你跟上。', closeness: 5, trust: 3, itemId: 'ration' } },
      { id: 'decline', label: '自己走', outcome: { text: '你说不用。他没有坚持，只把箱子留在原地。', closeness: -2, mental: 1 } },
    ],
  },
  jiahao: {
    id: 'persona_jiahao',
    minTrust: 20,
    title: '他准备了一个开场',
    text: '他站在空港背光的地方，黑色口罩拉得很高，手里转着一枚旧芯片。“你来了。”他顿了一下，像是在等背景音乐。',
    choices: [
      { id: 'play', label: '配合他', outcome: { text: '你没有拆穿。他把芯片递给你，说这是“入场券”，耳朵有点红。', closeness: 4, trust: 2, itemId: 'chip' } },
      { id: 'tease', label: '说他很中二', outcome: { text: '他卡了两秒，把口罩拉得更高。“……你懂什么。”但芯片还是塞给了你。', closeness: 3, trust: 1, itemId: 'chip' } },
    ],
  },
  sunshine: {
    id: 'persona_sunshine',
    minTrust: 20,
    title: '留了一份热的',
    text: '他把一只还温着的饭盒推过来。“今天多做了。你要是不吃，我就只能自己吃两顿。”',
    choices: [
      { id: 'share', label: '坐下来一起吃', outcome: { text: '你们分掉了那份饭。他一直在讲今天遇到的琐事，没有问你为什么回来得这么晚。', closeness: 5, trust: 2, mental: 4 } },
      { id: 'take', label: '带走', outcome: { text: '你说还有事。他把饭盒盖好，又塞给你一包药。', closeness: 2, trust: 1, itemId: 'stim' } },
    ],
  },
  tycoon: {
    id: 'persona_tycoon',
    minTrust: 30,
    title: '已经安排好了',
    text: '一辆车停在闸门外。他站在车边，没有问你要不要。“路已经清过了。上车。”',
    choices: [
      { id: 'accept', label: '上车', outcome: { text: '车里很暖。他没有说话，只在你坐下后把路线改成了你要去的地方。', closeness: 4, trust: 3 } },
      { id: 'refuse', label: '自己走', outcome: { text: '你说不用。他看了你一会儿，让司机把车开走，自己留了下来。', closeness: 1, trust: 2, mental: 2 } },
    ],
  },
  tsundere: {
    id: 'persona_tsundere',
    minTrust: 20,
    title: '不是给你的',
    text: '桌上多了一只盒子。他头也不抬：“别人放错的。你不要就扔了。”盒子里是你上次提过一嘴的东西。',
    choices: [
      { id: 'accept', label: '收下', outcome: { text: '你说谢谢。他“嗯”了一声，耳根有点红，还是没有抬头。', closeness: 4, trust: 2, itemId: 'stim' } },
      { id: 'tease', label: '问他是不是特意买的', outcome: { text: '他立刻否认，语速快得不像平时。盒子还是留在了你手里。', closeness: 3, trust: 1, itemId: 'stim' } },
    ],
  },
  madman: {
    id: 'persona_madman',
    minTrust: 25,
    title: '半夜的方案',
    text: '他半夜敲开你的门，摊开一张画满箭头的地图。“我想到了。我们从通风井进去，不会有人发现。”他眼睛很亮。',
    choices: [
      { id: 'listen', label: '听他讲完', outcome: { text: '你听他讲了半小时，最后把最危险的那一段划掉。他居然同意了。', closeness: 4, trust: 3, mental: -3 } },
      { id: 'stop', label: '劝他别去', outcome: { text: '他把地图卷起来，说“你胆子变小了”。但第二天没有出发。', closeness: 1, trust: 2 } },
    ],
  },
  yandere: {
    id: 'persona_yandere',
    minTrust: 35,
    title: '你今天去哪了',
    text: '他坐在你门口，像是在那里坐了很久。“我没有别的意思。”他说得很轻，“只是想知道你今天去了哪里。”',
    choices: [
      { id: 'reassure', label: '解释并留下来', outcome: { text: '你把今天的路线说了一遍。他听得很认真，最后只是说“下次告诉我一声”。', closeness: 4, trust: 3 } },
      { id: 'boundary', label: '划清边界', outcome: { text: '你说你需要自己的空间。他沉默了很久，最后点头，但手指一直扣着门框。', closeness: 1, trust: 4, grievance: 3 } },
    ],
  },
  cold_elite: {
    id: 'persona_cold',
    minTrust: 25,
    title: '一份记录',
    text: '他把一张写满字的纸放在桌上。“你上次问的那件事。我查过了。”纸上连时间、地点和不确定的部分都标得很清楚。',
    choices: [
      { id: 'thank', label: '认真道谢', outcome: { text: '你把纸收好，认真说了谢谢。他点了下头，像是不太习惯。', closeness: 3, trust: 3 } },
      { id: 'ask', label: '问他为什么帮你', outcome: { text: '他看了你一会儿。“顺手。”他说完就转身去整理别的记录。', closeness: 4, trust: 2 } },
    ],
  },
  loyal_dog: {
    id: 'persona_loyal',
    minTrust: 20,
    title: '等了很久',
    text: '他在你回来的路上等着，手里攥着一盏小灯。“我以为你今天不回来了。”他说完又立刻补了一句，“我不是催你。”',
    choices: [
      { id: 'stay', label: '陪他走回去', outcome: { text: '你们慢慢走回去。他一路都在说今天发生的小事，脚步比平时轻。', closeness: 5, trust: 2 } },
      { id: 'apologize', label: '说明天会早一点', outcome: { text: '他点头，把灯递给你。“那你拿着。晚上路黑。”', closeness: 3, trust: 3, itemId: 'stim' } },
    ],
  },
  schemer: {
    id: 'persona_schemer',
    minTrust: 30,
    title: '一笔交易',
    text: '他把一张叠得很整齐的纸条推过来。“有人愿意出钱买你明天的路线。我没卖。”他停了一下，“但我想知道你会怎么处理。”',
    choices: [
      { id: 'trust', label: '告诉他实话', outcome: { text: '你把路线改了。他笑了一下，像是终于得到想要的答案。', closeness: 3, trust: 4 } },
      { id: 'guard', label: '不透露', outcome: { text: '你把纸条收起来，没有回答。他点头，像是早就料到了。', closeness: 1, trust: 2, mental: -1 } },
    ],
  },
  homemaker: {
    id: 'persona_homemaker',
    minTrust: 20,
    title: '药和饭',
    text: '他把一只保温盒和一板药放在你面前。“先吃饭。药饭后吃。”他没有问你去了哪里，只把筷子摆好了。',
    choices: [
      { id: 'eat', label: '坐下来吃', outcome: { text: '你把饭吃完，药也吃了。他收走空盒，像是完成了一件很重要的事。', closeness: 5, trust: 2, hp: 6 } },
      { id: 'take', label: '带着路上吃', outcome: { text: '你说赶时间。他把药塞进你口袋，又叮嘱了一遍剂量。', closeness: 2, trust: 2, itemId: 'medkit' } },
    ],
  },
  tease: {
    id: 'persona_tease',
    minTrust: 25,
    title: '猜猜我在哪',
    text: '通讯里只有呼吸声。过了一会儿，他才开口：“猜猜我在哪。”背景里有空港广播的回音。',
    choices: [
      { id: 'play', label: '陪他猜', outcome: { text: '你故意猜错两次。他笑了一声，从你身后的柱子旁走出来。', closeness: 5, trust: 1 } },
      { id: 'ignore', label: '说正事', outcome: { text: '你问他有什么事。他安静了两秒，说“没有”，然后挂断了。', closeness: -3 } },
    ],
  },
  rough: {
    id: 'persona_rough',
    minTrust: 20,
    title: '别磨蹭',
    text: '他站在门口，肩上挎着两只包。“外面不太平。走，我送你一段。”他没有问你要不要。',
    choices: [
      { id: 'go', label: '跟上', outcome: { text: '他走在前面，替你挡开了路上的人。到地方后只说了句“下次别走这边”。', closeness: 4, trust: 3 } },
      { id: 'refuse', label: '不用送', outcome: { text: '你说自己可以。他看了你一眼，把其中一只包扔给你，还是跟在了后面。', closeness: 2, trust: 2, itemId: 'ration' } },
    ],
  },
}

export function personaEventFor(npc) {
  const id = npc?.archetype?.id
  return id ? PERSONA_EVENTS[id] || null : null
}
