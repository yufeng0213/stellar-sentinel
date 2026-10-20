# 星穹哨向 · Stellar Sentinel

星际背景的哨兵 / 向导 RPG。**Phase 0–6 已完成，角色深度、NPC 标签、主动事件 P2、探知档案、事件叙述与长期记忆已完成**：路由化的手机优先界面、五步角色创建、程序化星区、采集、事件选择、交易、背包、锻造、卡牌战斗、NPC 标签与关系网、LLM 流式对话，以及存档导入导出。

剩余的内容扩充与增强项见 [`PLAN.md`](./PLAN.md)。

- 前端：Vue 3 + Vite + Vue Router + Pinia
- 后端：Express，静态资源、存档 KV、LLM 配置代理
- 规则：`src/game-core/`，纯 JS，固定随机种子
- 端口：前端 `5174`，接口 / 容器 `3003`

## 运行

需要 Node 20+。

```bash
npm install
npm run dev
```

打开 `http://localhost:5174`。生产模式：

```bash
npm run build
npm start
```

## 已实现

- **路由化界面**：hash 路由，手机底部导航在星图 / 背包 / 锻造 / 通讯 / 角色之间整屏切换，返回键可用。
- **五步角色创建**：身份（人种 / ABO / 气味）→ 职业与 26 种出身 → 图景与 11 项能力 → 8 项属性与 10 项缺陷 → 12 项特质与确认。支持随机开局与读档。
- **角色深度**：8 项属性（含敏捷与机缘）、22 点分配；缺陷换取点数；图景提供先手、低血增伤、精神抗性、再生等被动；气味、人种、能力与缺陷会改变 NPC 的第一印象。
- **桌面可读性**：窗口宽度 ≥900px 时界面按 1.5 倍缩放、字号最低 14px，内容宽度扩到 1450px；手机仍保持紧凑布局。
- **页面拆分**：通讯拆成收件箱 / 名册 / 关系网 / 动态四个路由；NPC 资料、探知档案、记忆、赠送、对话各自独立页面，不再全部堆在一个弹窗里。
- **地下城地图**：星图改为从左往右推进的房间格，节点之间留有明显间距，用直角折线连接；横向滑动查看整层，当前房间自动居中，已探索 / 可前往 / 未连通状态直接落在格子上。
- **战败回城**：战斗失败不再卡死。角色会被拖回空港，推进到第二天并恢复部分生命/精神，星图重新排布，背包、关系与角色成长保留。
- **开局剧情**：10 个醒来场景（冷冻舱、坠毁舰桥、雨夜巷口、矿难废墟、白塔地下层、边境列车、孢雾林、静默教堂、黑市诊所、沙暴哨站）；本地开场立即显示，模型可展开更具体的感官叙述；开场选择接第一次 d20 判定，结果写回存档。
- **空港城市**：独立地点页面的市场 / 酒馆 / 诊所 / 城门；买酒、材料、药品，按配方制药，治疗，购买每日货架；酒馆访客可花信用点刷新，新 NPC 带标签、关系和关系网，旧访客离开。
- **主线章节**：4 章目标链「失联的白塔 → 黑市的价码 → 塔下的矿脉 → 门」，按清理节点、购买情报、清理首领推进；第四章集齐情报、首领记录与门钥，经过两段判定后选择推开门或合上，记录结局；主线页面显示完成条件与章节列表。
- **结局后日谈与收集**：开门/关门 × 判定成功次数得到 4 个结局；结局后生成包含最近 NPC、信用点、战败和地穴名的后日谈；结局记录保存在浏览器 `localStorage`，标题页和独立结局收集页显示解锁数量、首次/最近一次抵达。
- **派系声望**：白塔 / 黑市 / 漂流者 / 低语者四派系，交谈、送礼、城市委托、黑市情报与访客故事都会改变声望；友善后可每天领取对应派系补给。
- **派系任务链与声望商店**：每派系 3 步任务链，按 10 / 30 / 60 声望解锁；可以用信用点 + 声望在派系详情页兑换专属补给。
- **访客个人剧情**：4 套三阶段访客故事（欠债、失踪搭档、离开空港、替人送货），按信任、亲近和信用点解锁，结尾给奖励并提升该 NPC 派系声望。
- **地穴命名**：本地组合名 + 模型命名候选；名字只改变显示，不影响节点、掉落或难度；战败换图时自动重掷。
- **城市扩展**：任务板每日 3 张交付/清理委托；黑市出售稀有材料与白塔情报；酒馆可打听每日传闻，访客也会进入日常事件池。
- **战斗动画**：出牌斩击、灵能闪光、护盾环、敌人受击抖动、玩家受击、敌方突进、胜利 / 失败入场动画。
- **音效**：Web Audio 实时合成，不需要音频资源文件；按钮与链接点击、战斗出牌、受击、敌方回合、胜利/失败、撤离都有声音。标题、HUD 和战斗页都能一键静音，偏好保存在 localStorage；默认音量已调高。
- **程序化星区**：每个种子生成 10 层、3 幕、约 22 个节点；7 个区域各有配色与掉落，包含采集 / 遭遇 / 事件 / 交易 / 休整 / 首领节点。
- **行动点与判定**：移动、采集消耗 AP；d20 + 属性 + 特质 + 装备对抗 DC，可在任意节点扎营恢复。
- **敏捷玩法**：可对 NPC 或商店扒窃，d20 + 敏捷 + 能力 + 机缘；成功拿走物品或信用点，失败会结怨、惊动摊主。议价、急救、追踪、机械等能力也会进入对应判定。
- **事件与交易**：10 类事件、每类多个选项与检定结果；交易点有商品、价格与库存，可以花信用点买材料、消耗品和装备。
- **卡牌战斗**：21 种动作、25 张起始牌组；3 AP、敌方意图预告、流血 / 眩晕 / 破甲 / 护盾 / 专注 / 闪避 / 反击；敌人有护甲、再生、召唤、狂暴与撤退。打崩士气后可放过、缴械、审问、招募或下狠手。
- **NPC 自主活动**：18 名 NPC，每人带 5–7 个标签，各自有性格、兴趣、派系、日程与记忆；四轴关系（信任/尊重/亲近/畏惧）+ 怨念，送礼会饱和，初始印象天然有高有低。
- **NPC 标签**：126 个标签，分出身 / 性格 / 信念 / 职业 / 怪癖 / 关系 / 身体 / 阴影 8 类；标签会改写五轴性格、初始关系、战斗数值、兴趣、事件权重和 NPC 之间的相容度。玩家也会从人种、出身、图景、缺陷、能力和特质派生标签，影响 NPC 的第一印象。
- **NPC 主动事件**：每日 1–2 条、每周 1 条大事件；信息、送礼、求助、邀请、靠近、冲突、八卦按标签、关系和冷却加权；收件箱可直接处理，接受邀请会在地图上生成约定节点与奖励。
- **探知档案**：NPC 详情里的「探知 · 公开档案」按钮才生成，不预生成；5 个关系阶段、每人 15 条，阶段锁定，每次只展开一条；优先用 LLM，没有 Key 或失败时回退本地档案。
- **事件细读与长期记忆**：收件箱事件可点「细读」，按需生成 2–3 句叙述；每周结束自动把直接互动整理成 NPC 长期记忆，并注入对话与探知 prompt。
- **关系网与队伍**：NPC 之间有独立关系，标签相容度决定天然亲近或冲突，每日扎营会自主活动、关系漂移、传播八卦；信任足够可组队，队员会在战斗中提供「同伴支援」；交恶会警告、偷窃甚至伏击。
- **LLM 流式对话**：NPC 详情页有独立聊天面板；人格、四轴关系、日程和记忆会进入 prompt，回复逐字流式显示；没有 Key 或请求失败时自动降级为本地对白。
- **行为白名单**：模型只能提议 `offer_party` / `warn` / `leave`，由本地规则校验后执行；不能直接改数值。
- **背包与锻造**：材料、消耗品、装备、品质（粗糙 / 标准 / 精良），装备加成直接进入判定。
- **存档管理**：当前存档可导出 JSON、导入旧存档、删除本局；导入时会校验并补全 NPC 世界、聊天记录与调用预算。
- **LLM 配置**：OpenAI 兼容 / Anthropic / Ollama；服务端保存 Key、掩码回传、连通性测试；流式输出上限 1600 tokens，并处理没有结尾空行 / `[DONE]` 的最后一帧，避免长剧情被截断。
- **日志**：判定与拾取记录在角色页可以看到。

## 路由

| 路径 | 页面 |
| --- | --- |
| `/` | 标题 |
| `/create` | 角色创建向导 |
| `/settings/llm` | LLM 配置 |
| `/run/:runId/map` | 星图与节点行动 |
| `/run/:runId/battle/:nodeId` | 卡牌战斗 |
| `/run/:runId/inventory` | 背包与装备 |
| `/run/:runId/forge` | 锻造 |
| `/run/:runId/comms` | NPC 名册、四轴关系、关系网、每日动态与 LLM 对话 |
| `/run/:runId/character` | 角色卡与日志 |

## 测试

```bash
npm test             # 规则层 + 战斗 + NPC + 对话 + 世界 + 角色
npm run test:core    # 地图确定性、移动、采集、锻造
npm run test:combat  # 出牌、回合、胜负、撤离、处置
npm run test:npc     # 初始倾向、送礼饱和、交谈、组队、交恶、每日 tick
npm run test:llm     # prompt 结构、动作白名单、本地降级对白
npm run test:stream  # SSE 最后一帧、无 [DONE] 时的完整拼接
npm run test:world   # 事件选择、交易购买、存档导入迁移
npm run test:chargen # 26 出身、点数、随机开局、扒窃与存档迁移
npm run test:tags    # 126 标签、生成组合、相容度、旧档补全
npm run test:events  # 每日/周事件、收件箱处理、约定完成
npm run test:lore    # 探知阶段、逐条档案、本地降级与存档
npm run test:narrative # 长期记忆、prompt 注入、事件细读与本地降级
npm run test:retreat  # 战败回城、推进一天、地图重排与存档
npm run test:story    # 10 个醒来场景、开场、第一次判定与存档
npm run test:city     # 市场、诊所、酒馆访客刷新与城市存档
npm run test:mainline # 主线章节、地穴命名、任务板、黑市与传闻
npm run test:door     # 第四章门钥、两段判定、结局与存档
npm run test:ending   # 4 个结局、后日谈与结局收集计数
npm run test:faction  # 派系声望、任务链、声望商店与补给
npm run test:visitorStory # 访客三阶段剧情、奖励与存档
```

## LLM 配置

在 `/settings/llm` 选择 provider，填写 Base URL、模型名与 API Key，点击「测试连接」。

- Key 只写入服务端 `data/kv.json`，前端只拿到掩码与 `hasKey`
- 接口：`GET/PUT /api/llm/config`、`POST /api/llm/test`、`POST /api/llm/chat`（SSE 流式）
- 模型只负责对白、描述与行为提议，不参与数值判定
- 每局对话预算 120 次；无 Key、超时或请求失败时自动使用本地对白
- 如果服务暴露到公网，请自行加访问控制或改用环境变量注入

## 目录

```
.
├─ src/
│  ├─ App.vue
│  ├─ main.js
│  ├─ router/index.js
│  ├─ stores/game.js
│  ├─ game-core/
│  │  ├─ rng.js            # 种子随机
│  │  ├─ data.js           # 属性、ABO、物品、区域
│  │  ├─ chargen-data.js   # 人种 / 26 出身 / 图景 / 气味 / 能力 / 缺陷 / 特质
│  │  ├─ character.js      # 角色创建与派生
│  │  ├─ procgen.js        # 程序化星图
│  │  ├─ run.js            # 移动、采集、锻造、事件
│  │  ├─ combat.js         # 卡牌战斗与处置
│  │  ├─ steal.js          # 敏捷扒窃判定
│  │  ├─ npc-tags.js       # 126 个 NPC 标签与相容度
│  │  ├─ npc-events.js     # 每日/周事件、收件箱与约定
│  │  ├─ memory.js         # 每周长期记忆摘要
│  │  ├─ story.js          # 10 个醒来场景、开场、章节与第一次判定
│  │  ├─ city.js           # 市场、诊所、任务板、黑市、访客与城市状态
│  │  ├─ door.js           # 第四章门钥、判定与结局
│  │  ├─ ending.js         # 4 个结局、后日谈与收集合并
│  │  ├─ faction.js        # 派系声望、任务链、商店与每日补给
│  │  ├─ visitor-story.js  # 访客三阶段个人剧情
│  │  ├─ dungeon.js        # 地穴本地命名与重置
│  │  └─ npc.js            # 性格、关系、日程与关系网
│  ├─ game/
│  │  ├─ prompt.js         # NPC 人格 prompt 与动作解析
│  │  ├─ lore.js           # 探知档案阶段、prompt 与本地文本
│  │  ├─ narrative.js      # 事件细读 prompt 与本地叙述
│  │  ├─ story.js          # 开局 LLM prompt、文本清理
│  │  ├─ dungeon.js        # 地穴命名 prompt 与文本清理
│  │  ├─ collection.js     # 结局收集 localStorage
│  │  ├─ llm.js            # 浏览器端 SSE 流式对话
│  │  └─ save.js           # 存档导入校验与序列化
│  ├─ views/               # 标题 / 创建 / 星图 / 背包 / 锻造 / 通讯 / 角色 / LLM
│  ├─ components/BottomNav.vue
│  ├─ components/SoundToggle.vue
│  ├─ audio.js            # Web Audio 音效与静音偏好
│  └─ style.css
├─ server/
│  ├─ index.js             # 静态资源 / api / SPA 兜底
│  ├─ llm.js               # provider 适配与掩码
│  └─ store.js             # KV 原子写
├─ prototype/
│  └─ interaction.html     # 早期单文件交互原型（仅作参照）
├─ PLAN.md
├─ Dockerfile
└─ docker-compose.yml
```

## 约定

1. **规则与叙事分开**：`game-core` 不读 DOM、不调用网络、不写文案。
2. **随机可复现**：规则层只用 `createRng(seed)`，同种子同操作得到同一结果。
3. **AI 不碰数值**：LLM 只生成文本或提交受白名单约束的行为提议。
4. **存档可序列化**：当前使用 localStorage，已支持导入导出；服务端同步仍待做。

## 下一步

- 主线：新周目、结局后继承与后续章节
- NPC 池：访客长期关系、离队事件与更多个人剧情
- 城市：更多地点页面、派系专属结局与声望折扣
- 角色与玩法：出身专属事件、能力专属分支、偷窃/议价技能树
- 移动端：左右滑动切页
- 存档：服务端同步与多存档管理
- 细节见 [`PLAN.md`](./PLAN.md)

## Docker 部署

默认按子路径 `/stellar-sentinel/` 部署，容器端口 **3003**。

```bash
docker compose up -d --build
docker compose ps
```

容器内直接访问：

- `http://127.0.0.1:3003/stellar-sentinel/`
- 健康检查：`http://127.0.0.1:3003/api/health`

存档保存在宿主机 `./data/kv.json`（挂载到容器 `/data`），备份时整个 `data` 目录拷走即可。

### 域名与 Nginx

如果域名的根路径已经被其他站点占用，在 Nginx 里增加一个 `/stellar-sentinel/` 的 location 即可，示例见：

```
deploy/nginx.stellar-sentinel.conf
```

关键配置：

```nginx
location = /stellar-sentinel {
    return 301 /stellar-sentinel/;
}

location /stellar-sentinel/ {
    proxy_pass http://127.0.0.1:3003;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_buffering off;
    proxy_cache off;
    proxy_read_timeout 300s;
}
```

`proxy_buffering off` 必须保留，否则 LLM 的 SSE 流式回复会被 Nginx 缓冲。

### 环境变量

| 变量 | 默认 | 说明 |
| --- | --- | --- |
| `PORT` | `3003` | 容器监听端口 |
| `BASE_PATH` | `/stellar-sentinel` | 子路径部署；设为空则部署在根路径 |
| `DATA_DIR` | `/data` | 存档目录 |
| `TZ` | `Asia/Shanghai` | 时区 |

### 只用 Docker，不用 Compose

```bash
docker build -t stellar-sentinel:latest .
docker run -d --name stellar-sentinel \
  -p 3003:3003 \
  -e PORT=3003 \
  -e BASE_PATH=/stellar-sentinel \
  -e DATA_DIR=/data \
  -v $(pwd)/data:/data \
  stellar-sentinel:latest
```

### 直接访问根路径

容器同时兼容根路径和 `/stellar-sentinel/`。如果 Nginx 选择剥掉前缀再转发，也可以正常工作；此时 `BASE_PATH` 可以留空。
