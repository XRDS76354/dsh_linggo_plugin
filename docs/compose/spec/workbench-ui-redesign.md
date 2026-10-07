---
feature: workbench-ui-redesign
status: delivered
updated: 2026-10-07
branch: codex/workbench-ui-map
commits: 
---

# LingGo 三栏工作台视觉与交互重设计

## Report

**Current design** — 三栏工作台按 DSH 原生 chrome × LingGo 地图浅玻璃浮层组织。2026-10-07 的 S6 将左栏重做为项目选择及同级的展示会话 / 数据 / 任务，主操作移入标题栏、列表平铺、默认收起数据和任务，替代此前仅调图标与弱化标题的处理。地图统一玻璃工具条 + 线路左抽屉 + 详情右 peek + 紧凑站点气泡 + 回放底栏；默认比例 272 / 地图 flex（优先 ≥560）/ 400，折叠与最大化保留原生对话。保留模型选择、草稿、工具记录、取消、权限守卫、双页交接与双版本兼容。

**Verification (S6, 2026-10-07)** — 构建通过；30 / 30 项测试通过、0 跳过；官方 `0.2.0-rc.2` / `0.2.1-alpha.1` 的兼容与真实权限守卫、原生对话 / 草稿 / 工具 / 取消 / 双页交接回归通过。两版左栏脚本与 600 线路地图 / 布局回归通过，覆盖 1920 / 1440 / 1024 / 800px。截图保存于 `artifacts/sidebar-ia/{rc2,alpha1}/`，包白名单 34 项通过。任务事件使用测试 RPC 拦截器，数据集使用真实合成文件导入。

**Historical verification (2026-10-06)** — `npm run build` 通过；`npm test` 25 项（21 pass / 4 skipped / 0 fail）；`scripts/browser-workbench.py` 在隔离 profile 上通过 600 线路列表/详情/显隐/拖拽/最大化/1920·1440·1024·800 与回放截图。同尺寸对照见 `artifacts/ui-redesign/compare/before-after-1920.png` 等，不进入发行包。

**Journey log**
- 默认比例从 264/420 调整为 272/400 后，`layout-map.test.mjs` 与 browser 脚本的 Home 复位断言需同步。
- DSH 首启 API Key 对话框会拦截 Playwright 点击；测试侧用「稍后配置」+ MutationObserver 清障，不改产品代码。
- `/tmp` 下既有 runtime 可复用，但隔离 home 放在仓库 `artifacts/ui-redesign/` 以免污染用户 profile。
- 地图工具条统计 chip 用现有 `map.summary`，不新增虚构里程/客流字段。

## [S1] Problem
当前三栏工作台视觉层级弱、密度失衡、留白无节奏：左栏会话/数据/任务平铺密排，折叠后空壳；中栏线路浮层大白卡压图，工具栏样式不统一；三栏比例与最大化语义不清，窄屏体验差。目标以 DSH 原生侧栏 chrome 与 LingGo 地图本体为参考（不以现有插件截图为设计目标）改善视觉层级、比例、留白与地图交互，并保留全部 DSH 原生能力。

## [S2] Design

### 视觉锚点
- 风格：DeepSeek Harness 工作区侧栏（灰底、留白、标题栏图标操作、紧凑单行）× LingGo 地图浅玻璃浮层。
- 色板（沿用 DSH token）：侧栏 `#F6F7F9`、面 `#FFFFFF`、线 `#E4E6EB`、墨 `#1F2329`/`#646A73`/`#8F959E`、强调 `#3C6DF0`。
- 字阶：一级区块标题 14px/500/主文字色；正文 13px / 次要 12px / 注释 11px，禁用 10px 元信息。会话标题 13px/500，时间用弱色。

### 左栏（项目 / 会话 / 数据 / 任务）
- 品牌行、项目选择与新建项目保持紧凑；展示会话、数据、任务为同级一级区块。
- 标题栏 36px，主操作为右侧 28×28px 图标；新建展示会话使用「＋」，导入数据使用导入图标。
- 会话默认展开，32px 单行标题与弱色时间，不加日期分组头；数据默认收起并显示一行摘要，任务仅在新活动或新失败时自动展开。
- 数据集和任务分别平铺列表，无内嵌 SideSection、数据树或重复卡片；默认最近 5 条，当前 / 活动项按 S6 额外保留，通过「显示更多」展开。
- 标题前导图标和箭头共用位置，hover / focus-within 时显示箭头；点击标题切换开合，操作图标不触发折叠。
- 折叠态收成 48px 图标轨 + tooltip，不留大片空白。

### 中栏地图
- 顶部统一玻璃工具条一条：视图模式｜显隐/回放｜底图｜统计 chip。
- 线路浮层改左侧抽屉 280px，可收到 40px 图标轨；不再居中大白卡。
- 线路详情右侧 peek 300px 内部滚动；站点气泡 240px 紧凑锚定卡。
- 回放固定底栏 48px；比例尺/归属右下安静区。
- 宽屏地图可视面积 ≥55%；选中高亮不遮其他线路。

### 三栏比例与交互
- 默认：左 272 ｜ 地图 flex（min 560）｜ 对话 400。
- 最大化地图/对话全幅；侧栏收 48px 轨；原生对话不卸载。
- 分隔条 6px 热区、hover 把手、双击/Home 复位（沿用）。
- <900px：项目/地图/对话标签；列表密度加大。

### 保留（不得回归）
DSH 原生对话、模型选择、草稿、工具记录、取消、权限守卫、双页面交接、双版本兼容。不修改官方 DSH，不复制聊天实现。数据、凭据、地区内容不进发行包。


## [S4] Map stop markers
- Stops can be hidden independently of routes (toolbar toggle 「隐藏站点 / 显示站点」, default visible; preference `linggo.map.showStops`).
- When hidden: no stop circles/markers on canvas or provider maps; route lines remain; stop selection via route detail list still works and shows the bubble.
- Stops pair with route visibility: only stops on currently shown routes are drawn (hidden routes contribute no stop markers; an open stop bubble may stay anchored).
- Marker size is fixed screen-pixel size (r≈3, selected r≈4.5, stroke 1.25–1.5). Size must NOT grow with zoom level or with cluster membership.
- Dense-area aggregation may thin drawing for performance but every drawn marker uses the same fixed radius; no count glyphs that enlarge the hit shape. Click on a thinned cell still resolves to a single stop or zooms only when multiple distinct stops share the cell (existing pickStop behavior), without drawing oversized cluster blobs.
- Selected stop and selected-route stop list remain hittable; canvas hit threshold stays ~9px.

## [S3] Out of Scope
- 不改算法、数据导入、Python 环境、打包白名单逻辑（除必要样式类名）。
- 不新增图表、客流统计、虚构里程/轨迹。
- 不做 Windows/Linux/原生桌面实机验收（沿用已有待验证项）。
- 不提交、不合并、不推送。


## [S5] Map basemap fidelity, paired workspaces, sidebar hierarchy
- Baidu styleJson must not paint `featureType: "all"` geometry (that flattens roads into land). Style `land` only; keep highway/arterial/local/railway/boundary/labels visible so zoom reveals more detail like AMap whitesmoke.
- Creating a project registers **both** presentation and development DSH workspaces immediately (`ensureProjectWorkspaces`), so users see 展示 + 开发 folders without a handoff detour. Disk dirs are already created by `store.createProject`.
- Left sidebar keeps TRAE/Lucide outline icons (24-grid, 2px stroke) for the three peer sections. S6 supersedes the earlier weak 12px labels, large primary action and nested lists: section titles use 14px/500 primary ink, operations live in the header, and content is a compact flat list.

## [S6] 左栏信息架构与视觉层级

### 结构与交互
- `SideSection` 为受控组件（`open/onOpenChange`），支持 `collapsedSummary`；标题按钮具有 `aria-expanded`、`aria-controls`，点击或键盘操作开合，标题栏内图标操作独立。标题 36px 高、14px/500/主文字色；图标操作 28×28px。前导图标与折叠箭头同槽位，标题栏 hover 或键盘焦点进入时替换，不改变布局；区块用留白分组。
- 展示会话保留标题栏搜索和「＋」（tooltip / 可访问名称：新建展示会话）。32px 单行显示标题及右侧弱色时间，无日期分组；最近 5 条普通会话之外保留当前和运行中会话。「显示更多」每次增加 5 条；收起后搜索会展开并聚焦，关闭搜索清空筛选。
- 数据默认收起，仅保留当前数据的一行类型与数量摘要，例如「站点·线路·站序 · 站点 2,097 · 线路 531」；截断时 tooltip 提供全文。展开后直接显示数据集列表，每行包括类型组合、导入时间、当前选中态；每次导入产生一条可独立选择的数据集，类型可以不同。最近 5 条外额外保留当前项；导入仅在标题栏，空态为「尚未导入数据集」。
- 任务默认收起，展开后为同一个列表：活动任务优先，其后最近 5 条历史，最新失败始终保留，其余通过「显示更多」访问。完成项紧凑单行，活动 / 失败项只额外显示必要的进度、取消操作或错误说明，无二级折叠。
- 新建项目仍调用 `ensureProjectWorkspaces` 同时注册展示 / 开发工作区。DSH 原生对话、模型选择、草稿、工具记录、取消、权限守卫、双页面交接与双版本适配不变；地图和布局既有改动不回退。

### 状态与接口
- `useSectionState(id, defaultOpen)` 统一管理 `linggo.section.sessions/data/jobs`，已有合法布尔偏好优先；无偏好时会话开、数据关、任务关。废弃的二级区块键不再读取。
- `linggo.section.jobs.attention.<projectId>` 记录已提示事件：queued / running 共用 `active:<id>`，失败使用 `failed:<id>`。仅当前项目出现新事件时自动展开；进度轮询、完成、取消不改变开合。手动收起后刷新 / 切项目返回不重复提示旧事件；临时空列表不清空已提示记录。
- 切项目、搜索变化或收起对应区块时，列表展开数量复位。当前数据集 ID 失效时与地图一致回退最近数据集。
- 保留 `selectVersion({ projectId, versionId })` 与后端存储字段；「数据集」为用户界面语义变更，不迁移数据、不改 API。

### DSH 源码契约对照

以下路径相对于只读参考仓库 `/Users/xrds/Documents/deepseek-harness`；不修改官方源码。

| LingGo 改动 | DSH 源码契约与采用范围 |
|---|---|
| 36px 标题栏、28×28px 图标操作、键盘焦点 | `packages/client/ui-workspace/src/client/rows/WorkspaceBrowser.module.css`：`.sectionHeader`、`.iconButton`、`.iconButton:focus-visible`，采用尺寸与内侧焦点环 |
| 32px 会话单行、紧凑项目、标题省略、右侧弱色时间 | `packages/client/ui-workspace/src/client/rows/Rows.module.css`：`.sessionRow`（32px）、`.projectRow`（34px）、`.title`、`.time`；LingGo 保持时间至少 11px |
| 默认图标、hover 替换箭头 | 同文件 “Project leading slot: folder by default, expand arrow on row hover.” 注释及 `.projectRow .chevron` / `:hover .folder`；LingGo 扩展至 `:focus-within`，使键盘也可发现折叠 |
| 侧栏背景和主文字色 | `packages/client/ui-sidebar/src/client/SidebarRoot.module.css`：`.root` 的 `--dsw-specific-sidebar-fill`、`--dsw-alias-label-primary` |
| 列表溢出使用「显示更多」 | `WorkspaceBrowser.module.css`：`.sessionOverflowButton`（28px、透明背景、弱色）；`apps/web/tests/expected/workspace-new-session-folding/sidebar.expected.md`：`Show 11 more sessions` |
| 标题栏内新建展示会话 | 同快照中的工作区按钮 `New session in {{workspace}}`；采用工作区内操作，不采用 `SidebarRoot.module.css` 全局 `.newSession` 大按钮 |

一级标题 **14px/500/主文字色是本次 LingGo 的明确产品要求**。DSH `.sectionHeader` 实际使用 `--dsw-alias-label-tertiary`，不把主色中等字重误记为该选择器的原定义。默认 5 条、数据摘要、扁平数据集和任务 attention 持久化同样是 LingGo 的信息架构决策，DSH 提供紧凑行、操作位置与折叠行为参考。

### 本轮验收（2026-10-07 已通过）
- 默认折叠、摘要、键盘与 focus/hover 箭头、标题图标不误触折叠、刷新恢复、收起后搜索与分页复位、数据集切换 / 失效 ID 回退。
- 首次异步任务、新活动、新失败、手动收起后轮询 / 刷新不重开、跨项目隔离、临时空列表保留 attention。
- `npm run build && npm test`（配置已有 `LINGGO_TEST_PYTHON`，不跳过集成项），双版本兼容与原生对话回归，更新旧新建按钮文字定位。
- 隔离 DSH profile 使用合成数据采集默认、hover、展开数据、运行 / 失败、显示更多截图；检查 1920 / 1440 / 1024 / 800px 和发行包内容。只记录实际完成结果，截图、数据与凭据不得进入发行包。

## Tasks
- [x] T1: 初版左栏视觉与折叠交互（2026-10-06）— 后续信息架构由 S6 / T12 替代；48px 图标轨保留 (covers: S2)
- [x] T2: 重做中栏地图工具条、线路左抽屉、详情 peek、气泡与回放底栏 — acceptance: 工具条统一、浮层不再居中压图、宽屏地图可视 ≥55% (covers: S2)
- [x] T3: 调整三栏默认比例、拖拽/折叠/最大化/窄屏 — acceptance: 272/560+/400，maximize 保留对话不卸载，<900 标签切换可用 (covers: S2; depends: T1, T2)
- [x] T4: 构建、测试、实际运行并产出同尺寸对照截图，更新 docs/workbench-ui.md — acceptance: npm test 通过，截图对照落盘，文档记录新交互 (covers: S2)
- [x] T5: 站点图层可隐藏 — acceptance: 工具栏可切换隐藏/显示站点，偏好持久化；隐藏后地图无站点标记，线路仍在 (covers: S4)
- [x] T6: 站点固定小尺寸、不随缩放/聚类变大 — acceptance: 点击与渲染半径为固定像素；聚类不再放大标记；单元测试覆盖 visibleScene/绘制尺寸约定 (covers: S4; depends: T5)
- [x] T7: 站点与线路显隐配对 — acceptance: 仅显示勾选线路的站点；全部隐藏后无站点；选中气泡可暂留 (covers: S4)
- [x] T8: 百度浅灰底图提高对比度 — acceptance: styleJson 陆地/水系/绿地加深，叠线路可读 (covers: S4)

**Journey log (S4)** — 密处改为同尺寸抽稀而非多 ID 聚类气泡；`showStops` 走 scene + `linggo.map.showStops`；站点按 `visible` 线路配对后再抽稀；百度 `lightStyle` 加深陆地/水系/绿地对比度。
- [x] T9: 百度 styleJson 去掉 all/geometry，保留道路/边界/标注 — acceptance: 不再整图同色；道路与地名随缩放出现 (covers: S5)
- [x] T10: 新建项目同步注册展示+开发工作区 — acceptance: createProject 后 DSH 侧栏同时出现两个文件夹 (covers: S5)
- [x] T11: 初版左栏线图标（2026-10-06）— 保留 TRAE 风格图标；标题层级与嵌套结构由 S6 / T12 替代 (covers: S5)

**Journey log (S5)** — 百度空白根因是 `all`+`geometry` 把道路涂成陆地色；建项目时 `ensureProjectWorkspaces` 同时 `workspaces.create` 展示与开发目录；侧栏图标用 `src/icons.jsx`（TRAE/Lucide 24 格 2px 线）。此前弱化标题未解决信息层级问题，S6 将一级标题恢复为清晰主色，并重做操作位置和列表结构。

- [x] T12: 重做同级标题栏、会话列表、数据集和任务信息架构 — acceptance: S6 交互与持久化覆盖，删除二级折叠，保留原生能力 (covers: S6)
- [x] T13: 左栏构建、完整测试、双版本与截图验收 — acceptance: 本轮实际结果及限制写入 `docs/workbench-ui.md`，发行包无测试数据和截图 (covers: S6; depends: T12)
