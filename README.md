# LingGo × DeepSeek Harness

公交工作台插件，目标是把用户自己的公交数据接入地图、DSH 智能体和可替换调度算法。

**基础工作台及最小演示已在 macOS Web 验收；还不是完整公交产品。** 已实现官方 bundle、独立三栏展示页、按项目隔离的展示/开发会话、开发交接、Host 侧工具限制、数据导入向导、不可变数据版本、内置画布、高德灰白与百度浅色地图适配、智能体查询与地图联动、DRT／DRT v2／配车／班次生成四个内置算法、自定义 Python 算法注册、结果回放与五份工作流程 Skills。打包、隔离 Python 初始化与跨平台验证在第四阶段完成。双版本验收见 [兼容记录](docs/compatibility.md)；分阶段验收详见 [验收记录](docs/verification.md) 和 [任务清单](.spec/tasks.md)。随包演示仅包含经白名单检查的八条公共线路、模拟运营需求及最小匿名计算片段，不含全量业务数据或原始身份。

## 开发安装

要求 Node.js 22.19+（在 Node 22.23.1 验证）、官方 DSH `0.2.0-rc.2`、`0.2.1-alpha.1` 或 `0.2.1-rc.1`。无需修改 DSH 源码。

GitHub 仓库随附 `lib/index.js` 和 `lib/client.js`，插件管理器安装时直接使用这些构建文件，不运行 `prepare` 或安装构建脚本。修改源码后须重新构建并一同提交 `lib/`；CI 在 Windows/Linux 上通过 `npm run check:build` 检查一致性。

```sh
npm ci
npm run build
npm test
dsh --profile linggo --from-default-profile web --help
dsh plugin --profile linggo add /absolute/path/to/dsh_linggo_plugin
dsh --profile linggo --port 3180 --no-open
```

使用 DSH 启动时打印的认证 URL 打开页面。在左侧栏点击“公交工作台”，再点击“打开三栏工作台”；原页面仍为 DSH 开发页。在三栏页创建项目（一个城市或区域一个项目），点击“新建展示会话”。原生 DSH 负责模型、消息、工具记录与流式响应，模型凭据仍在 DSH 内配置。

展示会话只开放 `linggo_status`、`linggo_query`（只读查询当前数据版本）、`linggo_map`（在中间地图显示线路/站点/OD/结果）、`linggo_algorithms`、`linggo_propose_run`、`linggo_results` 、`linggo_projects`、`linggo_prepare_import`、`linggo_commit_import`、`linggo_import_status` 和 `skill`；导入限定用户明确指定的来源范围，删除接口仅供工作台使用。开发会话继续使用用户的 DSH 工具权限。工具限制由 Host 根据持久会话目录执行，不由页面按钮决定。

三栏页的开发交接需要预览并确认后才保存。DSH 开发页的“公交工作台”面板列出交接；打开时进入该项目的开发工作区。`0.2.1-alpha.1` 使用原生接口预填草稿；`0.2.0-rc.2` 展示完整交接内容，先点击“复制交接内容”，再打开开发会话粘贴。已有草稿会保留，两种方式均不会自动发送。再次打开会回到同一个开发会话。已知限制见[验收记录](docs/verification.md#已知限制)。

## 安装即用的地图演示

首次启用自动建立一个演示项目和两条原生 DSH 会话。展示页直接进入地图，默认显示八条上海真实线路并选中 1009 路；在地图内切换「常规公交 / DRT 调度」，没有独立体验页。没有地图密钥时使用无底图画布，不调用模型、不自动下载 Python。

线网为 CPTOND 上海 1009、1037、1043、1061、1063、1064、1075、1077 的完整最小截取：16 个走向、95 个站点、176 条站序，WGS84。客流、OD、班次和供给按固定种子模拟，三个日型各 48 个半小时时段；各线路与方向有差异，上下客与断面保持守恒。地图中可筛选日型、时段、方向并查看 OD 弦线及沿真实线路的计划车辆回放。

DRT 提供既有匿名计算片段（12:30–13:15、六车、38 笔关联订单）及模拟 A/B 两份结果。片段保留初始载客和跨窗口状态，完成、等待与里程按窗口重新统计；原场景 KPI 单独折叠，不能用其解释六车样例效果。车辆可选中查看下一站、容量、车场、路径与订单事件，时间轴支持倍速与跳时。

四份模拟预计算结果来自实际 DRT v2 A/B、客流班次生成和给定班次配车。配置 Python 后可预览、确认重跑；既有匿名片段不承诺复现原全场景。地图「功能指引」连接数据导入、环境设置、算法分析、自定义算法开发和原生对话交接。

新版不会覆盖旧演示、会话、草稿或开发修改。「更新演示 / 重新创建演示」显式创建新项目。演示资产采用可校验的 gzip/base64 紧凑快照，安装时展开为规范 CSV、查询快照与地图数据；资产上限 1 MiB，发行检查明确限定真实线路和匿名片段字段。详见 [演示规格](docs/compose/spec/demo-minimal-drt-v2.md)。

## 导入自己的数据

数据处理在隔离的 Python 环境中运行（Python 3.10+），不继承 DSH 凭据：

```sh
npm run setup:python                 # 创建 $DSH_HOME/linggo/venv 并安装依赖
npm run setup:python -- --postgis    # 需要 PostGIS 时追加驱动
npm run setup:python -- --index-url https://pypi.tuna.tsinghua.edu.cn/simple
```

也可在工作台“设置”页填写已有 Python 路径，并查看依赖诊断。

1. 在三栏页选择项目，点击“导入数据…”。
2. 填写本机文件路径（CSV、TSV、Excel、GeoJSON、Shapefile、GTFS 目录或 zip），或 PostGIS 连接串和表名，点击“检查数据”。
3. 选择表、目标数据类型（站点、线路、线路站序、时刻表、车辆、场站、GPS、客流、OD、有向路网节点/边等）、源坐标系（WGS84/GCJ02/BD09/EPSG）和合并方式，逐列确认字段映射。系统只做建议；方向不会从站序自动推断，混合上下行的数据需显式指定方向列或转换。
4. “预览映射结果”显示读入、保留、重复与丢弃原因和样例；确认后才在后台导入，可随时取消。改动映射后必须重新预览。
5. 成功导入生成新的不可变数据版本（统一存为 WGS84），可在左侧切换版本。失败或取消不会留下半成品。

地图首次进入优先使用已配置的高德 `amap://styles/whitesmoke` 灰白底图；只有百度 AK 时使用百度 JSAPI 4.0 浅色底图；都未配置时使用纯画布。之后记住用户选择。设置中填写自己的高德 Web JS Key / 安全密钥或百度浏览器 AK；分析数据保留 WGS84，显示时转换为 GCJ02，百度在创建地图前固定 GCJ02。SDK 加载失败时提示、可重试并临时回退画布，不覆盖底图偏好。更换已加载的地图密钥后刷新页面。

两条分隔线可以拖动、用方向键调整（Shift 加速）、双击或 Home 复位；分隔线按钮折叠左右栏。地图与对话可以最大化、还原，原生输入草稿和生成不中断。窄屏自动压缩对话和临时收起左栏，低于 900px 使用项目／地图／对话标签；不会覆盖保存宽度。偏好仅写 `linggo.*` 浏览器键，不影响 DSH 开发页。

线路浮层支持按名称和起终点搜索、单线路显隐、全部显示／隐藏、折叠和虚拟滚动。点击地图上的线路或站点打开详情，站序可定位站点、站点可联动途经线路。选择线路高亮但不隐藏其他线路，选择隐藏线路会恢复显示。地图容器不足 900px 时线路控制和详情为互斥抽屉；回放在底部。缺少时刻表时不把班次数展示为已知零，不虚构里程、客流和道路轨迹。质量提示可展开；后端截断明确提示。完整操作、配置和验收限制见 [工作台升级说明](docs/workbench-ui.md)。

## 运行调度算法

“分析”页按当前项目的数据版本运行算法，结果不可变并可在中间地图回放。

内置算法：

- **DRT 动态插入**：把需求按车辆依次插入既有线路/站点序列，尊重车载容量、最长等待、最长乘车与直达时间倍率。无逐笔需求时可用“实验生成”需求（按种子复现，结果标记为实验）。
- **DRT v2 · 有向路网调度**：原始策略 A 动态插入、B 冻结与批量窗口；使用 `network_nodes` / `network_edges` 的有向最短路，禁行 `motorway` / `motorway_link`。必须提供需求、车辆、车场与路网，不用直线距离替代缺失路网。乘车上限为 `max(直达时间 × 系数, 直达时间 + 余量)`；容量、等待、上下客、轨迹与回场由独立 V2 校验器检查。启用车辆数不能超过车辆表。旧 DRT 与自定义算法仍沿用已有校验器。
- **常规公交配车（给定时刻表）**：把班次串成车辆运行链，求最少用车数并与现有车辆数比较；有到达时间就用，没有则按站序距离 ÷ 车速估算。不允许空驶时该最少用车为最优。
- **客流班次生成**：按分时段客流与首末班、最小/最大间隔生成班次；运力不足时不掩盖，而是报告缺口。

每次运行：选算法与参数 → **预览运行**（列出输入数据行数、缺失的必需数据、参数值和风险提示）→ **确认运行**，以后台任务执行、可取消。结果保存运行时间、算法、关键指标、约束校验与假设，可在“在地图上回放”按时间轴播放车辆轨迹；被拒绝的需求以红叉显示。

智能体（展示会话）只能查询算法、**提交运行建议**和读取结果：建议出现在“分析”页，必须由你预览并确认才会运行，确认前不消耗算力、也不会被启动。

行驶时间与距离按直线距离 × 绕行系数 ÷ 平均车速估算，不走路网最短路；因此相对比较可用，绝对服务率不应当作真实运营指标。

### 自定义 Python 算法

复制 `python/templates/linggo_algorithm.py`，实现 `META` 与 `run(inputs, params, ctx)`，自检：

```sh
python -m linggo_data.selfcheck            # 用程序生成的虚构夹具
python -m linggo_data.selfcheck 你的算法.py   # 检查接口并可试跑
```

在“分析”页填写本机路径 → **查看源代码**（显示 SHA-256、大小与完整代码）→ 勾选“已审阅” → 注册。注册只接受与所查看内容字节一致的同一文件，入库前再次校验 SHA-256。

> **接口校验不等于代码安全。** 自定义算法以你的用户权限在本机运行，没有沙箱；请只注册你自己审阅过的代码。

### 工作流程 Skills

插件注册五份 Skill，展示会话可直接用（也可用 `/linggo-...` 显式调用）：数据导入、线网分析、DRT、配车与班次、自定义算法。每份都写明数据前提、参数口径与安全提示。

## 数据位置和卸载

运行状态保存于 `$DSH_HOME/linggo`，默认 `~/.dsh/linggo`：项目按随机 ID 隔离展示与开发目录，数据版本位于 `projects/<id>/data/versions`，运行结果位于 `projects/<id>/results/<resultId>/result.json`，注册的自定义算法位于 `projects/<id>/algorithms/<id>.py`（权限 0600），设置（含地图密钥）位于 `settings.json`（权限 0600）。插件只读源文件，不把用户数据写入插件源码目录；PostGIS 连接串不写入版本记录。启动时清理中断运行留下的暂存目录和未登记的结果目录。

```sh
dsh plugin --profile linggo remove dsh-linggo-plugin
```

重启后入口与 Host 工具移除，项目状态保留。当前开发修改后执行 `npm run build` 并重启测试 profile；尚未提供插件专用监听启动器。

## 打包

```sh
npm run pack:release
```

`pack:release` 依次构建、检查发行文件并生成 `.tgz`。也可单独运行 `npm run check:build` 检查构建文件是否与源码一致、`npm run check:package` 检查打包内容。后者可直接用 `node scripts/check-package.mjs` 运行，兼容 Windows 的 npm 命令包装器；不会执行打包生命周期脚本。

发行白名单仅包含构建文件、Python 数据模块与依赖清单、Python 初始化脚本、bundle 配置、Skill 文档、算法模板、README、许可证与兼容说明。`check:package` 会拒绝任何白名单外文件，也会拒绝缺少 JS/Python 入口、bundle 配置、初始化脚本或 Skill 文档的包；当前发行包包含双版本兼容、工作台设置与验收说明，不含数据、日志、凭据或本机路径。源码安装使用仓库中的 lockfile。

从发行包安装（不经源码目录）：

```sh
dsh plugin --profile <profile> add ./dsh-linggo-plugin-0.1.1-alpha.3.tgz
export DSH_HOME=<该 profile 的 DSH_HOME>
node <安装目录>/node_modules/dsh-linggo-plugin/scripts/setup-python.mjs
```

`dsh plugin add` 需要 pnpm 在 PATH 上；没有 pnpm 时可先 `corepack enable pnpm`。Python 环境创建在 `$DSH_HOME/linggo/venv`，与插件目录分离，升级或重装插件不需要重建。

### Windows PowerShell 安装与排查

在 DSH 桌面版提供的终端使用与宿主配套的 `dsh`；系统全局安装的旧版 CLI 可能与桌面版不同。下列示例使用独立 `linggo-win` profile，首次创建时使用官方 Web 模板。

```powershell
dsh --profile linggo-win --from-default-profile web --help
# GitHub 安装：修复提交发布后使用，仓库必须包含 lib/ 构建文件。
dsh plugin --profile linggo-win add github:XRDS76354/dsh_linggo_plugin
dsh --profile linggo-win --port 3180 --no-open
```

源码或尚未推送的本地修复可按以下步骤打包安装；路径带空格、中文或单引号时使用双引号。

```powershell
Set-Location "C:\Projects\dsh_linggo_plugin"
npm ci
npm run pack:release
dsh plugin --profile linggo-win add "C:\Projects\dsh_linggo_plugin\dsh-linggo-plugin-0.1.1-alpha.3.tgz"
# 源码目录也可安装：dsh plugin --profile linggo-win add "C:\Projects\dsh_linggo_plugin"
dsh --profile linggo-win --port 3180 --no-open
```

Python 初始化单独进行。先用 `py --list-paths` 查找已安装的解释器，再确认该 `python.exe` 实际存在且版本为 3.10+；`PATH` 上的 Anaconda/Windows 应用别名可能指向其他版本。

```powershell
$env:DSH_HOME = "$env:USERPROFILE\.dsh"
$pluginDir = "$env:DSH_HOME\profiles\linggo-win\node_modules\dsh-linggo-plugin"
& "C:\path\to\python.exe" --version
node "$pluginDir\scripts\setup-python.mjs" --python "C:\path\to\python.exe"
```

桌面 `desktop` profile 用其实际安装目录代替示例中的 `linggo-win`。若此前设置了自定义 `DSH_HOME`，使用启动日志中的实际目录；插件 Python venv 不安装到源码目录。启用插件本身不需要先安装 Python，数据导入和算法运行才需要。

出现 `failed to import` 时先检查安装目录中的 `lib/index.js`、`lib/client.js` 是否存在，并核对宿主版本。数据处理的 JSON 协议问题属于另一阶段：非有限数值会转为 `null`，非法标准输出会明确报“数据进程协议错误”。自定义算法日志应写入 stderr，stdout 留给 worker 的 JSON 事件。

## 许可证与第三方

自研代码 MIT，见 [LICENSE](LICENSE)。Host 依赖和客户端 React 由 DSH 提供。客户端内联百度官方加载器 `@baidumap/jsapi-loader@1.0.0`（MIT），许可与作者说明随包保存于 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。在线地图 SDK 与底图由供应商加载，不随发行包再分发。

- 运行时 Python 依赖（`python/requirements.txt`）：pandas（BSD-3-Clause）、openpyxl（MIT）、pyshp（MIT）、pyproj（MIT）；可选 PostGIS 驱动 psycopg（LGPL-3.0）。
- 构建期 Node 依赖（`devDependencies`）：esbuild（MIT）。esbuild 不随发行包分发；百度加载器随客户端构建内联。

CPTOND 与地区原始数据不随插件分发，也不因此获得再分发授权；本仓库不包含任何地区数据。

## DSH 兼容维护

`src/compat-client.js` 集中封装工作区、展示会话、开发交接和页面挂载；`src/compat-host.js` 检查权限守卫及认证连接能力。草稿功能按实际 API 检测，不按版本号猜测。旧版不调用 `setDraft` 覆盖原生输入，不通过 DOM 或 localStorage 注入内容。

兼容配置统一保存在 `compatibility.json`。`engines.dsh` 与可选 DSH peers 采用同一有上限范围，保留两个旧版并允许 `>=0.2.1-rc.1 <0.2.2-0`；范围内未来版本仅允许尝试，不代表已验收。DSH/Cordis 及客户端服务所属包列为可选 peer（由 DSH 提供）；缺少必要 API 会明确拒绝启用。缺少 Host `tools.guard` 时不注册业务工具或接口。新增版本须在独立运行目录和独立 `DSH_HOME` 验证，不能替换正在运行的宿主依赖。

```sh
npm run build
LINGGO_TEST_PYTHON=/absolute/path/to/python npm test
npm run check:compat
npm run test:compat -- --smoke /absolute/path/to/rc2-runtime /absolute/path/to/alpha1-runtime /absolute/path/to/rc1-runtime
```

三处 runtime 应分别通过官方 npm 包安装精确版本。`test:compat` 验证官方兼容检查及真实工具执行守卫；`--smoke` 额外在临时 home 验证 tarball 安装、启用、认证诊断、卸载及业务状态保留；页面挂载、交接、流式对话、停止和卸载另用 `scripts/browser-compat.py` 检查。兼容范围不是对未来 DSH 版本的承诺，新增版本须补充证据。

## 后续阶段

1. ~~DSH 集成~~（已完成，桌面待验收）。
2. ~~数据导入、数据版本、地图与质量检查~~（已完成，PostGIS 和百度真实底图待实机验收）。
3. ~~DRT、常规公交配车/客流班次、实验场景、Python 算法接口和 Skills~~（已完成，见上）。
4. ~~预构建发行包、隔离 Python 初始化、发行前审计与许可说明~~（已完成）；Windows 安装修复与验证记录见[验收记录](docs/verification.md#windows-安装与数据通信修复)。Linux 实机和原生桌面窗口仍待验收。


### 数据清理与智能体批量导入

左栏数据标题栏的管理图标支持删除所选、清空全部、撤销最近导入；确认弹窗显示关联结果数量。仅删除插件内副本及关联结果，原始文件保留。任务标题栏可隐藏／恢复已完成、失败、已取消任务，运行中任务不能清理。

在展示、开发或普通 DSH 会话中明确要求“导入这个目录的数据”并指定路径，即可调用 `linggo_projects` → `linggo_prepare_import` → `linggo_commit_import` → `linggo_import_status`。默认递归扫描授权目录，整批发布一个快照；未知坐标系、方向、字段冲突会集中询问。无关联项目时建立插件项目及双工作区，成功后更新地图；人工导入向导和 PostGIS 入口保留。无 Python 时需用户显式初始化环境，不自动下载。

状态 schema 5 保留旧项目、数据、会话和草稿；源文件从不改写。详细行为见 [数据管理与导入规格](docs/compose/spec/data-management-batch-import.md)。


本地 `link:` 开发安装更新 `lib/` 后，需完整退出并重新打开 DeepSeek Harness，让 Host 重新加载后台模块；只刷新浏览器可能出现“新版前端／旧版后台”，新增管理 API 返回 404。插件对此提供明确重启提示，不自动重试删除。


### 升级诊断与本地回退

`0.1.1-alpha.3` 增加只读兼容握手及设置页摘要。缺少必要安全接口时拒绝业务初始化；协议不匹配或旧后台没有诊断接口时暂停新写操作，不自动重试导入、删除、运行。构建标识不同但协议和所需能力兼容时可继续使用。摘要不包含路径、业务数据、模型或地图凭据。

先用官方插件管理器更新／重载；若诊断仍指向旧后台或宿主提示重启，再完整退出 DSH 并重新打开工作台。仅刷新浏览器不能替换已加载的 Host 模块。布局锚点不符合预期时释放三栏样式并保留原生页面；本轮不替换现有布局接法。

本地安装：`dsh plugin --profile <profile> add /absolute/path/to/dsh-linggo-plugin-0.1.1-alpha.3.tgz`，也可在插件管理器使用本地包路径。交付包已预构建，不需要安装时执行构建脚本。现有 GitHub 地址在同步前仍提供旧包。

回退前保留兼容诊断和数据备份；仅安装该宿主允许的旧插件包，不删除 `$DSH_HOME/linggo`。旧 `alpha.2` 不支持 `0.2.1-rc.1`，因此不能作为当前新版宿主的强制回退包；不建议降级或改写 DSH 会话日志来迁就它。失败安装由官方管理器恢复 profile 依赖。保留的旧包只用于其原先兼容的隔离环境。

维护者可运行 `npm run compat:upstream -- <精确候选版本>`，只读取官方包、比较 exports 与声明摘要，不执行候选插件代码、不改范围、不发布；随后在隔离 runtime 运行 `test:compat -- --single --candidate`。范围外版本的安装仍被拒绝。CI 的三版矩阵与手动上游检查均已配置，配置不等于 GitHub 上已经运行成功。
