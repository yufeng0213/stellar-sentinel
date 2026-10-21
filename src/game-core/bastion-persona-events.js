/**
 * 据点居民专属事件：每种人设一条，只会在对应 NPC 入住后出现一次。
 */

export const BASTION_PERSONA_EVENTS = {
  gloomy_ghost: {
    id: 'gloomy_name',
    title: '阴影里的旧名字',
    text: '他站在舱室最暗的角落，像是在等灯自己熄灭。\n\n“我以前不叫这个。”他说，“你想听吗？”',
    choices: [
      { id: 'listen', label: '听他说完', text: '你听完了那个名字。他没有要求你记住，但第二天开始，他会在你进门时抬头。', effects: { needs: { belonging: 14, safety: 4 }, relation: { trust: 5 } } },
      { id: 'space', label: '不追问', text: '你没有追问。他点了点头，退回阴影里，像是松了口气。', effects: { needs: { belonging: 4, purpose: 2 } } },
    ],
  },
  dry_ghost: {
    id: 'dry_drink',
    title: '一杯没有温度的酒',
    text: '他把酒瓶放在桌上，杯子里没有倒酒。\n\n“我不确定自己还能不能喝。”他说，“但可以陪你坐一会儿。”',
    choices: [
      { id: 'share', label: '陪他喝一杯', text: '你们把酒分了。他喝得很慢，最后说：“味道还是不对。”但杯子空了。', effects: { needs: { belonging: 12 }, relation: { closeness: 4 }, items: { wine: -1 } } },
      { id: 'talk', label: '只聊天', text: '你们没有碰酒。他讲了几个不好笑的笑话，气氛反而松了下来。', effects: { needs: { belonging: 8, purpose: 3 }, relation: { trust: 3 } } },
    ],
  },
  jiahao: {
    id: 'jiahao_repair',
    title: '嘉豪又把东西拆坏了',
    text: '工坊里传来一声闷响。嘉豪站在一地零件中间，手里还攥着扳手。\n\n“这次我真的知道怎么装回去。”',
    choices: [
      { id: 'help', label: '蹲下来一起修', text: '你们花了一晚上把东西装回去。多了两颗螺丝，但至少能用了。', effects: { needs: { purpose: 12, belonging: 6 }, items: { scrap: 1 } } },
      { id: 'watch', label: '让他自己来', text: '你没有接手。他折腾到很晚，最后真的修好了，只是手上多了几道口子。', effects: { needs: { purpose: 8, safety: -4 }, relation: { trust: 3 } } },
    ],
  },
  sunshine: {
    id: 'sunshine_meal',
    title: '多出来的一人份',
    text: '阳光小太阳端着一锅东西站在门口：\n\n“我做多了。真的只是做多了。”',
    choices: [
      { id: 'eat', label: '坐下来一起吃', text: '味道一般，但他一直在看你有没有吃完。', effects: { needs: { belonging: 12, purpose: 5 }, relation: { closeness: 3 } } },
      { id: 'rest', label: '让他先休息', text: '你把锅接过来，让他去睡。他嘴上说不用，脚步却很快。', effects: { needs: { safety: 10, belonging: 4 } } },
    ],
  },
  tycoon: {
    id: 'tycoon_equipment',
    title: '一笔不太划算的投资',
    text: '霸总把一份设备清单推过来。\n\n“医疗舱该换了。我出钱，你签字。”',
    choices: [
      { id: 'accept', label: '接受投资', text: '新设备第二天就送到了。他没有提回报，只问了一句：“够用吗？”', effects: { credits: -30, needs: { purpose: 12, safety: 8 }, relation: { trust: 4 } } },
      { id: 'decline', label: '先不换', text: '你把清单收起来。他看了你一会儿，没再说什么。', effects: { needs: { purpose: -5, belonging: -3 } } },
    ],
  },
  tsundere: {
    id: 'tsundere_room',
    title: '“我才不是来道谢的”',
    text: '傲娇站在门口，手里拿着一块刚修好的护板。\n\n“别误会。只是顺手。你这里太破了。”',
    choices: [
      { id: 'accept', label: '收下护板', text: '你接过护板。他转身就走，走到一半又提醒你：“装在左边。”', effects: { needs: { belonging: 10, purpose: 5 }, relation: { closeness: 4 } } },
      { id: 'tease', label: '问他是不是担心你', text: '他耳根红了，嘴上说你自作多情，但没有把护板拿回去。', effects: { needs: { belonging: 7 }, relation: { closeness: 6, trust: -1 } } },
    ],
  },
  madman: {
    id: 'madman_experiment',
    title: '一个非常糟糕的主意',
    text: '疯批把三根线接在一起，火花照亮了他的脸。\n\n“如果成功，我们能省一半能源。如果失败……”他耸了耸肩。',
    choices: [
      { id: 'allow', label: '让他试', text: '实验成功了。据点跳了三次闸，但他笑得像过年。', effects: { needs: { purpose: 14, safety: -5 }, items: { scrap: 2 } } },
      { id: 'stop', label: '把线拔掉', text: '你拔掉了线。他没有生气，只是把零件收好：“下次我会做得更安全。”', effects: { needs: { safety: 10, purpose: -2 }, relation: { trust: 3 } } },
    ],
  },
  yandere: {
    id: 'yandere_watch',
    title: '“你今天回来得很晚”',
    text: '病娇坐在门边，灯没开。\n\n“我不是在等你。”他说，“只是刚好没睡。”',
    choices: [
      { id: 'reassure', label: '告诉他你回来了', text: '你在他旁边坐下。他靠得很近，最后说：“下次早点。”', effects: { needs: { belonging: 14 }, relation: { closeness: 5 } } },
      { id: 'boundary', label: '把边界说清楚', text: '你告诉他你会回来，但不需要有人守在门口。他听完，点了点头。', effects: { needs: { belonging: 4, safety: 4 }, relation: { trust: 5, closeness: -2 } } },
    ],
  },
  cold_elite: {
    id: 'cold_structure',
    title: '承重墙上的裂缝',
    text: '清冷高岭指着舱壁：\n\n“这条裂缝在扩大。你们一直没发现。”',
    choices: [
      { id: 'fix', label: '立刻安排修补', text: '修补花了一整天。裂缝止住了，他在旁边记下了每一个步骤。', effects: { needs: { purpose: 12, safety: 10 }, relation: { trust: 4 } } },
      { id: 'later', label: '先记录下来', text: '他合上记录本，没有再提醒。裂缝还在那里。', effects: { needs: { purpose: -5, safety: -4 } } },
    ],
  },
  loyal_dog: {
    id: 'loyal_wait',
    title: '门口的那盏灯',
    text: '忠犬奶狗坐在舱门口，灯一直亮着。\n\n“我怕你回来的时候看不见路。”',
    choices: [
      { id: 'invite', label: '让他进来等', text: '他跟着你进门，在沙发边坐下。灯关了，但没有人先睡。', effects: { needs: { belonging: 13, safety: 5 }, relation: { closeness: 4 } } },
      { id: 'rest', label: '让他去休息', text: '你把灯留给他，让他回去睡。他走了两步，又回头看了你一眼。', effects: { needs: { safety: 9, belonging: 3 } } },
    ],
  },
  schemer: {
    id: 'schemer_network',
    title: '一张不该存在的名单',
    text: '腹黑把一张纸折好，推到你面前。\n\n“空港里有人替我们记着账。我可以让他们闭嘴，也可以让他们继续记。”',
    choices: [
      { id: 'use', label: '让名单继续存在', text: '名单被收了回去。你知道这不是结束，只是开始。', effects: { needs: { purpose: 13 }, relation: { trust: 3 }, credits: 15 } },
      { id: 'burn', label: '把名单烧掉', text: '纸在火里卷起来。他看了很久，最后说：“你比我干净。”', effects: { needs: { purpose: 4, safety: 5 }, relation: { trust: 5 } } },
    ],
  },
  homemaker: {
    id: 'homemaker_clean',
    title: '被重新摆过的房间',
    text: '靠谱人夫把你的东西按颜色重新排了一遍。\n\n“你原来的放法不好找。”他说，“我改了一点。”',
    choices: [
      { id: 'thanks', label: '谢谢他', text: '他明显松了口气，又开始检查下一张桌子。', effects: { needs: { belonging: 10, purpose: 8 }, relation: { closeness: 3 } } },
      { id: 'own', label: '说自己来', text: '他停下手，把东西放回原处：“好。你说了算。”', effects: { needs: { belonging: 3, purpose: -3 }, relation: { trust: 2 } } },
    ],
  },
  tease: {
    id: 'tease_question',
    title: '“你更喜欢谁？”',
    text: '钓系靠在门边，语气像在开玩笑。\n\n“别紧张。我只是想知道，你会不会认真回答。”',
    choices: [
      { id: 'play', label: '顺着他的话', text: '你回了一句更过分的话。他笑了，没再追问。', effects: { needs: { belonging: 9 }, relation: { closeness: 5 } } },
      { id: 'honest', label: '认真回答', text: '你认真说了。他沉默了一会儿，反而先移开了视线。', effects: { needs: { belonging: 6 }, relation: { trust: 5, closeness: 2 } } },
    ],
  },
  rough: {
    id: 'rough_spar',
    title: '“来，练一场”',
    text: '糙汉把护具扔给你。\n\n“别整天坐着。你反应慢了。”',
    choices: [
      { id: 'spar', label: '和他练一场', text: '你被摔了两次，但最后一次撑住了。他咧嘴笑了一下。', effects: { needs: { purpose: 12, safety: -4 }, relation: { trust: 4 } } },
      { id: 'rest', label: '今天不练', text: '他把护具收起来，没有勉强：“行。明天。”', effects: { needs: { safety: 8, purpose: 2 } } },
    ],
  },
}

export function bastionPersonaEventFor(npc) {
  if (!npc?.archetype?.id) return null
  return BASTION_PERSONA_EVENTS[npc.archetype.id] || null
}
