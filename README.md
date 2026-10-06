# LingGo × DeepSeek Harness

公交工作台插件，目标是把用户自己的公交数据接入地图、DSH 智能体和可替换调度算法。

**第一至第三阶段已在 macOS Web 验收；还不是完整公交产品。** 已实现官方 bundle、独立三栏展示页、按项目隔离的展示/开发会话、开发交接、Host 侧工具限制、数据导入向导、不可变数据版本、内置画布地图与高德适配、智能体查询与地图联动、DRT／配车／班次生成三类内置算法、自定义 Python 算法注册、结果回放与五份工作流程 Skills。打包、隔离 Python 初始化与跨平台验证在第四阶段完成。双版本验收见 [兼容记录](docs/compatibility.md)；分阶段验收详见 [验收记录](docs/verification.md) 和 [任务清单](.spec/tasks.md)。不提供地区数据或产品演示数据。

## 开发安装

要求 Node.js 22.19+（在 Node 22.23.1 验证）、官方 DSH `0.2.0-rc.2` 或 `0.2.1-alpha.1`。无需修改 DSH 源码。

```sh
npm ci
npm run build
npm test
dsh --profile linggo --from-default-profile web --help
dsh plugin --profile linggo add /absolute/path/to/dsh_linggo_plugin
dsh --profile linggo --port 3180 --no-open
```

使用 DSH 启动时打印的认证 URL 打开页面。在左侧栏点击“公交工作台”，再点击“打开三栏工作台”；原页面仍为 DSH 开发页。在三栏页创建项目（一个城市或区域一个项目），点击“新建展示会话”。原生 DSH 负责模型、消息、工具记录与流式响应，模型凭据仍在 DSH 内配置。

展示会话只开放 `linggo_status`、`linggo_query`（只读查询当前数据版本）、`linggo_map`（在中间地图显示线路/站点）、`linggo_algorithms`、`linggo_propose_run`、`linggo_results` 和 `skill`；开发会话继续使用用户的 DSH 工具权限。工具限制由 Host 根据持久会话目录执行，不由页面按钮决定。

三栏页的开发交接需要预览并确认后才保存。DSH 开发页的“公交工作台”面板列出交接；打开时进入该项目的开发工作区。`0.2.1-alpha.1` 使用原生接口预填草稿；`0.2.0-rc.2` 展示完整交接内容，先点击“复制交接内容”，再打开开发会话粘贴。已有草稿会保留，两种方式均不会自动发送。再次打开会回到同一个开发会话。已知限制见[验收记录](docs/verification.md#已知限制)。

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
3. 选择表、目标数据类型（站点、线路、线路站序、时刻表、车辆、场站、GPS、客流、OD 等）、源坐标系（WGS84/GCJ02/BD09/EPSG）和合并方式，逐列确认字段映射。系统只做建议；方向不会从站序自动推断，混合上下行的数据需显式指定方向列或转换。
4. “预览映射结果”显示读入、保留、重复与丢弃原因和样例；确认后才在后台导入，可随时取消。改动映射后必须重新预览。
5. 成功导入生成新的不可变数据版本（统一存为 WGS84），可在左侧切换版本。失败或取消不会留下半成品。

地图默认使用内置画布；在“设置”中填写高德 Web JS Key 与安全密钥后切换为高德底图（显示时转换为 GCJ02）。质量警告（例如疑似混合上下行、远离主要范围的站点）显示在地图上方。

## 运行调度算法

“分析”页按当前项目的数据版本运行算法，结果不可变并可在中间地图回放。

内置算法：

- **DRT 动态插入**：把需求按车辆依次插入既有线路/站点序列，尊重车载容量、最长等待、最长乘车与直达时间倍率。无逐笔需求时可用“实验生成”需求（按种子复现，结果标记为实验）。
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

运行状态保存于 `$DSH_HOME/linggo`，默认 `~/.dsh/linggo`：项目按随机 ID 隔离展示与开发目录，数据版本位于 `projects/<id>/data/versions`，运行结果位于 `projects/<id>/results/<resultId>/result.json`，注册的自定义算法位于 `projects/<id>/algorithms/<id>.py`（权限 0600），设置（含高德密钥）位于 `settings.json`（权限 0600）。插件只读源文件，不把用户数据写入插件源码目录；PostGIS 连接串不写入版本记录。启动时清理中断运行留下的暂存目录和未登记的结果目录。

```sh
dsh plugin --profile linggo remove dsh-linggo-plugin
```

重启后入口与 Host 工具移除，项目状态保留。当前开发修改后执行 `npm run build` 并重启测试 profile；尚未提供插件专用监听启动器。

## 打包

```sh
npm run build
npm run check:package
npm pack
```

发行白名单仅包含构建文件、Python 数据模块与依赖清单、Python 初始化脚本、bundle 配置、Skill 文档、算法模板、README、许可证与兼容说明。`check:package` 会拒绝任何白名单外文件；当前发行包 32 个文件（含双版本兼容验收记录）、约 300 KB，不含数据、日志、凭据或本机路径。源码安装使用仓库中的 lockfile。

从发行包安装（不经源码目录）：

```sh
dsh plugin --profile <profile> add ./dsh-linggo-plugin-0.1.0-alpha.2.tgz
export DSH_HOME=<该 profile 的 DSH_HOME>
node <安装目录>/node_modules/dsh-linggo-plugin/scripts/setup-python.mjs
```

`dsh plugin add` 需要 pnpm 在 PATH 上；没有 pnpm 时可先 `corepack enable pnpm`。Python 环境创建在 `$DSH_HOME/linggo/venv`，与插件目录分离，升级或重装插件不需要重建。

## 许可证与第三方

自研代码 MIT，见 [LICENSE](LICENSE)。发行包不内联第三方源码：Host 与客户端分别以 `external` 打包（客户端依赖 DSH 提供的 React），第三方依赖在安装时从公开发布源获取，仍按其自身许可证使用。

- 运行时 Python 依赖（`python/requirements.txt`）：pandas（BSD-3-Clause）、openpyxl（MIT）、pyshp（MIT）、pyproj（MIT）；可选 PostGIS 驱动 psycopg（LGPL-3.0）。
- 构建期 Node 依赖（`devDependencies`）：esbuild（MIT）。不随发行包分发。

CPTOND 与地区原始数据不随插件分发，也不因此获得再分发授权；本仓库不包含任何地区数据。

## DSH 兼容维护

`src/compat-client.js` 集中封装工作区、展示会话、开发交接和页面挂载；`src/compat-host.js` 检查权限守卫及认证连接能力。草稿功能按实际 API 检测，不按版本号猜测。旧版不调用 `setDraft` 覆盖原生输入，不通过 DOM 或 localStorage 注入内容。

发行版仅声明经过验证的两个 DSH 版本，不使用 `*` 或无上限范围。DSH/Cordis 及客户端服务所属包列为可选 peer（由 DSH 提供）；缺少必要 API 会明确拒绝启用。缺少 Host `tools.guard` 时不注册业务工具或接口。新增版本须在独立运行目录和独立 `DSH_HOME` 验证，不能替换正在运行的宿主依赖。

```sh
npm run build
LINGGO_TEST_PYTHON=/absolute/path/to/python npm test
npm run test:compat -- /absolute/path/to/rc2-runtime /absolute/path/to/alpha1-runtime
```

两处 runtime 应分别通过官方 npm 包安装精确版本。`test:compat` 验证官方兼容检查及真实工具执行守卫；页面挂载、交接、流式对话、停止和卸载另用 `scripts/browser-compat.py` 检查。兼容范围不是对未来 DSH 版本的承诺，新增版本须补充证据。

## 后续阶段

1. ~~DSH 集成~~（已完成，桌面待验收）。
2. ~~数据导入、数据版本、地图与质量检查~~（已完成，PostGIS 和高德底图待实机验收）。
3. ~~DRT、常规公交配车/客流班次、实验场景、Python 算法接口和 Skills~~（已完成，见上）。
4. ~~预构建发行包、隔离 Python 初始化、发行前审计与许可说明~~（已完成）；三平台安装验证仅覆盖 macOS，Windows/Linux 为待办。
