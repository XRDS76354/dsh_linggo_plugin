---
feature: workbench-ui-redesign
status: delivered
updated: 2026-10-06
branch: codex/workbench-ui-map
commits: 
---

# LingGo 三栏工作台视觉与交互重设计

## Report

**What was built** — 三栏工作台按 DSH 原生 chrome × LingGo 地图浅玻璃浮层重做：左栏会话主视觉、数据 chip、48px 图标轨；地图统一玻璃工具条 + 线路左抽屉 + 详情右 peek + 紧凑站点气泡 + 回放底栏；默认比例 272 / 地图 flex（优先 ≥560）/ 400，折叠与最大化保留原生对话。保留模型选择、草稿、工具记录、取消、权限守卫、双页交接与双版本兼容。

**Verification** — `npm run build` 通过；`npm test` 25 项（21 pass / 4 skipped / 0 fail）；`scripts/browser-workbench.py` 在隔离 profile 上通过 600 线路列表/详情/显隐/拖拽/最大化/1920·1440·1024·800 与回放截图。同尺寸对照见 `artifacts/ui-redesign/compare/before-after-1920.png` 等，不进入发行包。

**Journey log**
- 默认比例从 264/420 调整为 272/400 后，`layout-map.test.mjs` 与 browser 脚本的 Home 复位断言需同步。
- DSH 首启 API Key 对话框会拦截 Playwright 点击；测试侧用「稍后配置」+ MutationObserver 清障，不改产品代码。
- `/tmp` 下既有 runtime 可复用，但隔离 home 放在仓库 `artifacts/ui-redesign/` 以免污染用户 profile。
- 地图工具条统计 chip 用现有 `map.summary`，不新增虚构里程/客流字段。

## [S1] Problem
当前三栏工作台视觉层级弱、密度失衡、留白无节奏：左栏会话/数据/任务平铺密排，折叠后空壳；中栏线路浮层大白卡压图，工具栏样式不统一；三栏比例与最大化语义不清，窄屏体验差。目标以 DSH 原生侧栏 chrome 与 LingGo 地图本体为参考（不以现有插件截图为设计目标）改善视觉层级、比例、留白与地图交互，并保留全部 DSH 原生能力。

## [S2] Design

### 视觉锚点
- 风格：DeepSeek Harness 原生侧栏（灰底、留白、整宽圆角主按钮、安静图标导航）× LingGo 地图浅玻璃浮层。
- 色板（沿用 DSH token）：侧栏 `#F6F7F9`、面 `#FFFFFF`、线 `#E4E6EB`、墨 `#1F2329`/`#646A73`/`#8F959E`、强调 `#3C6DF0`。
- 字阶：13px 正文 / 12px 次要 / 11px 注释；禁用 10px 元信息。会话标题 13px/500；区块标题 12px/600。

### 左栏（项目 / 会话 / 数据 / 任务）
- 品牌行安静对齐 DSH；主 CTA「＋ 新建展示会话」整宽圆角。
- 手风琴权重：会话默认展开为主视觉；数据版本、任务、交接默认折叠或紧凑。
- 会话行 ≥40px：标题 + 11px 日期；选中浅蓝底 + 左侧 2px accent。
- 数据树 28px 行、缩进导线、状态右侧安静 chip。
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

## [S3] Out of Scope
- 不改算法、数据导入、Python 环境、打包白名单逻辑（除必要样式类名）。
- 不新增图表、客流统计、虚构里程/轨迹。
- 不做 Windows/Linux/原生桌面实机验收（沿用已有待验证项）。
- 不提交、不合并、不推送。

## Tasks
- [x] T1: 重写左栏视觉层级与折叠交互 — acceptance: 会话主视觉、数据树导线与 chip、默认折叠策略、48px 图标轨生效，无 10px 元信息 (covers: S2)
- [x] T2: 重做中栏地图工具条、线路左抽屉、详情 peek、气泡与回放底栏 — acceptance: 工具条统一、浮层不再居中压图、宽屏地图可视 ≥55% (covers: S2)
- [x] T3: 调整三栏默认比例、拖拽/折叠/最大化/窄屏 — acceptance: 272/560+/400，maximize 保留对话不卸载，<900 标签切换可用 (covers: S2; depends: T1, T2)
- [x] T4: 构建、测试、实际运行并产出同尺寸对照截图，更新 docs/workbench-ui.md — acceptance: npm test 通过，截图对照落盘，文档记录新交互 (covers: S2)
