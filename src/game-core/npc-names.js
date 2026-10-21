/**
 * NPC 名字库：中文短名 + 英文名/姓组合。
 * 生成器只负责提供唯一候选，具体取哪一个仍由 run seed 决定。
 */

export const CHINESE_NAMES = [
  '闻莺', '白矾', '祁夜', '砂原', '陆沉', '阿灰', '南枝', '鹫', '灯', '霜',
  '渡鸦', '旧枪', '米岚', '塔利亚', '七', '迟', '赫', '桥', '砂砾', '白榆',
  '洛', '鸦', '青', '荼', '沈砚', '江迟', '谢无咎', '顾青', '沈鹿', '贺兰',
  '阿箬', '岑野', '宋照', '闻舟', '许砾', '梁声', '黎川', '苏木', '陆灯', '白露',
  '简宁', '殷禾', '沈潮', '顾原', '叶弥', '周烬', '林雾', '唐棠', '秦灰', '余烬',
  '程野', '宋靥', '许渡', '陈默', '季白', '柳青', '温故', '沈砂', '白砚', '林深',
  '洛水', '南星', '北鸦', '阿蛮', '小满', '初九', '无咎', '长夜', '空青', '寒山',
  '拾一', '望舒', '临川', '照野', '知更', '眠山', '听澜', '扶光', '雪见', '鹤川',
]

export const ENGLISH_GIVEN = [
  'Adrian', 'Cass', 'Nyx', 'Vale', 'Rook', 'Sable', 'Wren', 'Juno', 'Silas', 'Mira',
  'Kael', 'Orin', 'Lyra', 'Ronan', 'Soren', 'Vex', 'Iris', 'Dorian', 'Lys', 'Ash',
  'Corin', 'Tessa', 'Nolan', 'Freya', 'Zane', 'Maeve', 'Ezra', 'Selene', 'Cyrus', 'Nova',
  'Elias', 'Raven', 'Theo', 'Ilsa', 'Damon', 'Aya', 'Marcus', 'Lena', 'Kai', 'Noa',
  'Felix', 'Ophelia', 'Hugo', 'Esme', 'Bram', 'Celia', 'Dante', 'Faye', 'Gideon', 'Hela',
  'Ivan', 'Jade', 'Kira', 'Leo', 'Mona', 'Niles', 'Odin', 'Petra', 'Quinn', 'Remy',
  'Sia', 'Talon', 'Una', 'Victor', 'Willa', 'Xan', 'Yara', 'Zara', 'Arden', 'Blair',
  'Cato', 'Dune', 'Eden', 'Flint', 'Gray', 'Hollis', 'Ines', 'Jory', 'Kestrel', 'Lior',
  'Maren', 'Nero', 'Onyx', 'Pike', 'Reed', 'Sol', 'Thane', 'Vesper', 'Wynn', 'Yuki',
]

export const ENGLISH_SURNAMES = [
  'Vale', 'Rook', 'Sable', 'Cross', 'Vane', 'Mercer', 'Hale', 'Quinn', 'Voss', 'Reed',
  'Kade', 'Thorne', 'Wren', 'Ash', 'Dune', 'Grey', 'Locke', 'North', 'Pike', 'Rye',
  'Sol', 'Stern', 'Vey', 'Ward', 'Yale', 'Zero', 'Frost', 'Marr', 'Nox', 'Orr',
]

export const ENGLISH_NAME_COMBOS = [...new Set(ENGLISH_GIVEN.flatMap((given, givenIndex) => (
  ENGLISH_SURNAMES.map((surname) => {
    if (givenIndex % 5 === 0) return `${given} ${surname}`
    if (givenIndex % 5 === 1) return `${given}·${surname}`
    if (givenIndex % 5 === 2) return `${given} ${surname[0]}.`
    if (givenIndex % 5 === 3) return `${given} “${surname}”`
    return `${given}-${surname}`
  })
)))]

export function buildNpcNamePool(rng, englishLimit = 600) {
  const chinese = rng.shuffle(CHINESE_NAMES)
  const english = rng.shuffle(ENGLISH_NAME_COMBOS).slice(0, englishLimit)
  return rng.shuffle([...chinese, ...english])
}

export function nextNpcName(pool, used, fallbackIndex = 0) {
  for (const name of pool) {
    if (!used.has(name)) {
      used.add(name)
      return name
    }
  }
  let index = fallbackIndex
  let name = `无名者-${index + 1}`
  while (used.has(name)) {
    index += 1
    name = `无名者-${index + 1}`
  }
  used.add(name)
  return name
}
