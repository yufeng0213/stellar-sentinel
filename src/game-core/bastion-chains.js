/**
 * 据点后续事件链：一次选择留下的东西，过几天会回来。
 */

export const BASTION_CHAINS = {
  raid_mark: {
    id: 'raid_mark',
    title: '外沿上的刻痕',
    text: '袭击者留下的刻痕还在舱壁上。今天早上，刻痕旁边多了一小段新鲜的划痕。\n\n他们回来过。',
    choices: [
      {
        id: 'track',
        label: '顺着痕迹追出去',
        text: '你在废土里找到了一枚旧芯片。对方没有走远。',
        effects: { items: { chip: 1 }, needs: { purpose: 8, safety: -3 } },
      },
      {
        id: 'fortify',
        label: '加固外沿',
        text: '你们把舱壁补厚了一层。今晚的风声听起来没那么近了。',
        effects: { credits: -20, needs: { safety: 12 } },
      },
    ],
  },
  defect_letter: {
    id: 'defect_letter',
    title: '没有寄出的信',
    text: '那个曾经想走的人留下了一封信，没有封口。\n\n“如果你看到这个，说明我还是没走成。”',
    choices: [
      {
        id: 'read',
        label: '读完它',
        text: '你读完了。他没有回来要那封信，但第二天主动去了设施。',
        effects: { needs: { belonging: 12, purpose: 5 }, relation: { trust: 4 } },
      },
      {
        id: 'return',
        label: '把信还给他',
        text: '你把信放在他门口。晚上他来敲门，只说了一句“谢谢”。',
        effects: { needs: { belonging: 8 }, relation: { closeness: 4 } },
      },
    ],
  },
  fire_wire: {
    id: 'fire_wire',
    title: '烧焦的线',
    text: '维修队从温室夹层里抽出一段烧焦的线。\n\n断口很整齐，不像是自然老化。',
    choices: [
      {
        id: 'investigate',
        label: '查清楚是谁动的',
        text: '你没有找到人，但所有人都知道你在查。温室暂时安静了。',
        effects: { needs: { safety: 8, belonging: -3 }, credits: 10 },
      },
      {
        id: 'replace',
        label: '整套换掉，不再追究',
        text: '新线路装好了。账单很贵，但至少不会再从同一个地方烧起来。',
        effects: { credits: -25, needs: { safety: 10, purpose: 4 } },
      },
    ],
  },
  visitor_crate: {
    id: 'visitor_crate',
    title: '访客留下的箱子',
    text: '那个访客走后，储物舱角落里多了一只箱子。\n\n箱子上没有锁，也没有名字。',
    choices: [
      {
        id: 'open',
        label: '打开它',
        text: '里面是几枚旧芯片和一张写着坐标的纸。坐标指向矿脉站。',
        effects: { items: { chip: 2 }, needs: { purpose: 7 } },
      },
      {
        id: 'store',
        label: '登记入库',
        text: '箱子被封存。没有人知道里面是什么，但账面上多了一笔。',
        effects: { credits: 12, needs: { safety: 4 } },
      },
    ],
  },
  faction_return: {
    id: 'faction_return',
    title: '名单上的第二个名字',
    text: '穿制服的人没有再来。但今天，名单上的第二个名字被人用红笔圈了出来。\n\n那个人就住在你的据点里。',
    choices: [
      {
        id: 'stand',
        label: '继续保他',
        text: '你没有把人交出去。夜里，据点门口多了一双没有离开的脚印。',
        effects: { needs: { purpose: 12, safety: -5 }, relation: { trust: 5 } },
      },
      {
        id: 'hide',
        label: '把他转移到别处',
        text: '你安排他暂时离开。事情冷了下来，但据点里少了一个人。',
        effects: { needs: { safety: 9, belonging: -5 }, credits: -10 },
      },
    ],
  },
}

export function bastionChainEvent(chain) {
  const definition = BASTION_CHAINS[chain?.id]
  if (!definition) return null
  return {
    ...definition,
    id: `bastion-${chain.dueDay}-chain-${chain.id}`,
    type: 'chain',
    chainId: chain.id,
    npcId: chain.npcId,
    queuedDay: chain.queuedDay,
    dueDay: chain.dueDay,
  }
}
