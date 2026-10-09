# 验收记录

日期：2026-10-05。状态：第一阶段（DSH 集成）、第二阶段（数据导入与地图）和第三阶段（算法、结果与 Skills）已通过 macOS Web 验收；第四阶段见任务清单。

环境：macOS (darwin)，Node.js 22.23.1，npm 官方 DSH 0.2.1-alpha.1 安装于隔离运行目录，独立 `DSH_HOME` 与 `linggo-test` profile，插件以 link 方式加入 profile。浏览器为 Microsoft Edge headless（Playwright），1440×900 与 800×900。模型为测试 profile 中 DSH 配置的 DeepSeek-V41-Flash。

## 浏览器实测通过

- 认证重定向保留 `#linggo=1`，去除 token；三栏布局：左侧项目/会话/数据/任务/交接，中间地图与分析区（无数据时列出缺失数据），右侧原生 DSH 对话。DSH 侧栏、右侧栏和拖拽手柄在展示页隐藏，对话输入框可点击。
- 创建项目、切换项目；切换到没有会话的项目时显示遮罩，"恢复最近的展示会话"恢复本项目会话。历史列表只显示当前项目的展示会话，标题随会话更新。
- 真实模型流式回复：模型调用 `linggo_status` 并返回项目名称、ID、数据就绪状态与缺失项。展示会话中模型看不到 bash 等工具，回复拒绝执行并提示使用开发交接。Host guard 最终拒绝由 runtime.test.mjs 在真实 ToolRuntime 中验证。
- 开发交接：填写摘要 → 预览（项目、数据版本、情景、结果引用、来源会话）→ 确认保存。DSH 开发页侧栏"公交工作台"面板列出交接；"打开开发会话并填入草稿"进入项目开发工作区，草稿填入原生输入框且未发送；状态记录 devSessionId 和 openedAt；"回到开发会话"复用同一会话，openedAt 不变，草稿保留。
- 窄屏 800px：顶部"工作区/对话"切换，两个视图均可用。
- Host 重启：页面保持打开，重连后可继续创建项目，对话输入可用。
- 卸载：将插件移出 profile 后重启，开发页入口、样式和 `/api/linggo.*`（404）消失，`#linggo=1` 不再出现工作台；`$DSH_HOME/linggo` 下项目保留。恢复后重启，工作台正常。卸载通过编辑 profile package.json 模拟，因为本机无 pnpm，`dsh plugin remove` 无法运行。
- 控制台无错误。

## 第二阶段浏览器实测（本地真实数据，不入库）

数据通过本地路径引用，未复制进仓库或发行包。Python 3.13 隔离环境由 `npm run setup:python` 创建。

- CPTOND 南通 Shapefile（`nantong_bus_stops.shp`）：自动建议为“线路站序”，字段与 WGS84 正确；预览 500/500；确认导入约 2 秒；1065 条线路、7769 个站点，画布地图显示全网，可拖动、缩放、点选站点。
- 临港 `线路站点.xlsx`（独立项目）：识别 WKT 坐标列并建议 `wkt_lon/wkt_lat`；预览读入 500、保留 370、重复 130；导入后 101 条线路、1985 个站点。地图上方警告“72 条线路只有一个方向但大量站名重复出现”和“45 个站点远离主要范围”（含已知的异地 7 路），地图按主要范围取景，不再被异地站点压缩。
- 向导：改动映射后预览清除、需重新预览；未预览或映射变化后的确认被 Host 拒绝；任务列表显示进度、完成与取消。
- 真实模型回合：展示智能体依次调用 `linggo_status`、`linggo_query`（routes、route_stops）、`linggo_map`（show_route 临港9路、show_stop 洋溢港路新北村委），中间地图实时高亮线路与站点，提示框显示方向与站数，“智能体地图操作”列表可点击重放。控制台无错误。

## 第三阶段浏览器实测（本地真实数据，不入库）

- “分析”页：列出内置 DRT 动态插入、常规公交配车、客流班次生成；参数表单按 META 生成，缺失数据在预览中列出（临港项目缺时刻表，故配车预览被拒绝并提示“缺少必需数据：时刻表”）。
- DRT 实验需求批量对比：需求来源“实验生成”，300 笔、种子 1、07:00–09:00，参数对比“车辆数”填 `8, 16` → 预览显示输入数据行数、参数值与实验数据提示 → 确认运行（2 组）→ 后台任务完成，结果列表出现两条记录（服务率 29.3%／16.7%，均“通过”约束校验）。
- 结果详情：关键指标、约束校验、假设（含“45 个远离主要范围的站点未用作实验需求起讫点”）；“在地图上回放”把结果图层叠到中间地图，时间轴 07:02–08:54 可拖动、可播放，在途车辆计数正确（16/16），DRT 轨迹按车辆着色、未服务需求以红叉显示。
- 修正后的实验需求：45 个远离主要范围的站点（如 104810、104811）不再作为实验需求的起讫点，服务率、平均乘车时间与回放时间窗随之回到合理量级（16 车 29.3%、平均乘车 39.31 分钟）。修正前这些站点导致平均乘车 119.75 分钟、回放延伸到 19:45。
- 展示会话智能体：真实模型回合中模型调用 `linggo_algorithms`、`linggo_propose_run`（6 车 / 12 车两组对比），建议出现在“分析”页并附“来自展示会话智能体”与理由；模型明确说明确认前不会运行、它无法代用户启动。用户在页面上预览并确认后两组运行完成，模型随后用 `linggo_results` 读取结果并比较服务率（15.5% vs 30.0%），再用 `linggo_map` 的 `show_run` 请求回放服务率更高的一组。“智能体地图操作”列表出现“显示结果 DRT 动态插入”，点击后结果图层载入，时间轴从 07:02 起、车辆计数正确。
- 控制台无错误。

## 第四阶段实测（发行包安装，macOS）

在一个全新的 `DSH_HOME`（`/private/tmp/linggo-stage4`）中从 `npm pack` 产物安装，不使用源码 link：

- `npm pack` 产物 31 个文件、310734 字节；`check:package` 通过，白名单外文件会被拒绝。
- `dsh plugin --profile linggo-test add dsh-linggo-plugin-0.1.0-alpha.1.tgz` 安装成功，profile 依赖解析为 `file:...tgz`，`node_modules/dsh-linggo-plugin` 是 pnpm 从 tarball 解出的真实副本而非符号链接；`lib/`、`python/`、`python/templates/`、`skills/` 全部随包安装。
- 本机无 pnpm，`dsh plugin add` 报 `pnpm ENOENT`；用 `corepack prepare pnpm@9 --activate` 提供 pnpm 后可正常安装。profile 内的 `pnpm-workspace.yaml` 需要 `ignore-workspace-root-check=true` 才允许把依赖加到根。
- 在全新 home 中运行安装目录内的 `scripts/setup-python.mjs`：创建 `$DSH_HOME/linggo/venv`（Python 3.13.3），从清华镜像安装 pandas 3.0.6、numpy 2.5.3、openpyxl 3.1.5、pyshp 3.1.6、pyproj 3.8.0。
- 用该新环境运行仓库中的 Python 测试（32 项）全部通过——即发行包声明的依赖范围在新版本 pandas 3.x 上仍然成立，不是只在开发机的 pandas 2.x 上通过。
- 发行包内的 worker 以插件的方式（`PYTHONPATH=<pkg>/python python -m linggo_data`）运行：`doctor` 报告 pandas/openpyxl/shapefile/pyproj 可用、psycopg 未装；`algorithms` 列出三个内置算法；用程序生成的虚构夹具跑 DRT 得到 40 笔需求服务 33 笔（82.5%）、校验 0 违规，`result.json` 正常写出。
- 该全新 profile 启动 Host 后，`scripts/smoke-host.py` 全部通过：认证引导、未认证 401、项目目录隔离、交接校验；浏览器打开工作台正常渲染，空数据项目的“分析”页给出“当前项目还没有数据版本。先导入数据，再运行算法。”，控制台无错误。
- 未重新验证：由于是空 home，未走一遍完整的导入→算法→回放；该流程已在第三阶段用真实本地数据验证。

## 自动测试

`npm test` 15 项通过（数据项需 `LINGGO_TEST_PYTHON` 指向含依赖的 Python，否则跳过）：路径识别（项目、旧目录、兄弟目录、穿越、相对路径、符号链接与大小写变体）、真实 ToolRuntime 拒绝、跨实例并发创建、交接校验/打开/归档、schema 1 迁移与拒绝新版本、陈旧锁恢复、客户端模块工厂；预览令牌校验→导入→版本发布→工具查询/地图动作（含会话归属与非展示目录隔离）；40 万行导入取消后无版本、无 staging 残留；算法参数清洗（未知参数、类型、上下界、枚举）、展示会话策略允许分析类工具而拒绝 bash/write/edit、五份 Skill 注册且无未替换占位符、建议→预览→确认→结果全流程（无效参数与未确认不运行、令牌或参数变化被拒）、配车缺时刻表被拒、自定义算法 SHA 变化被拒与失败不留副本。

`npm run test:python` 32 项通过：CSV/TSV/Excel/GeoJSON/Shapefile/GTFS 读取（程序生成的虚构夹具）、坐标系转换、WKT、时间解析、去重与丢弃统计、追加/替换合并、关联检查、方向不从站序推断、混合上下行与远离站点警告；DRT 约束满足与校验器可发现违规、实验需求可复现且避开远离站点；配车最少用车（已知案例、仅允许空驶时更少、随机实例与贪心最优一致、校验器拒绝接续不足）；班次生成间隔合规与不可行情景报告缺口；自定义算法模板运行、改动文件被拒、接口与参数校验。

## 已知限制

- 终端：DSH 用户终端属于用户能力，不经过智能体沙箱和审批。展示页隐藏右侧栏，但这不是权限边界。
- 当前会话选择保存在同源 localStorage `dsh.sessions.current`，展示页和开发页共享；开发页刷新后可能恢复到展示会话。展示会话中的工具限制仍由 Host 执行。
- 展示会话需要工作区才能输入，所以每个项目有一个"LingGo · 项目 · 展示"工作区，会出现在开发页工作区列表中。
- 空白展示会话的工作区选择器仍可切换到其他工作区；切换后会话不再属于展示目录，工作台显示遮罩，不会放开工具。
- 原生桌面窗口和协议唤起未独立验收；本次 Windows 使用已支持的官方 `0.2.0-rc.2` Web 宿主验证插件安装、启用和页面。
- 未单独验证"停止生成"按钮（原生 DSH 功能，插件未改动）。
- Windows 安装与数据通信已补充实机记录，见下文；Linux 实机仍未验证，新增 CI 配置尚不代表已通过 CI。原生桌面窗口和协议唤起也不在本次 Windows Web 验收范围内。
- 发行包安装需要 pnpm 在 PATH 上（或用 corepack 提供），否则 `dsh plugin add` 失败；该提示来自 DSH 而非插件。
- 结果目录的发布用同项目内的 `rename`；若把 `$DSH_HOME/linggo` 的 results 目录单独挂到别的文件系统上会失效（默认布局不受影响）。
- 高德底图未在浏览器验证（本机无 Key）；无 Key 或加载失败时回退内置画布，已验证回退路径。
- PostGIS 只读提取有实现和参数校验，未连接真实数据库运行。
- 上下行不自动拆分：临港等混合编码数据需用户在映射中指定方向，或在第三阶段用算法拆分。
- 地图一次最多绘制有限条线路（超出时标记截断）；GPS/客流/OD 的时间回放尚未实现，智能体可查询这些表。
- 算法行驶时间按直线距离 × 绕行系数 ÷ 平均车速估算，不是路网最短路；DRT 车辆从需求重心出发（无车场表时不使用车场）。绝对服务率不应作为真实运营指标，只用于同口径相对比较。
- 实验结果：`demand_source=synthetic` 的需求由种子生成，结果标记为实验并写明假设，不能当作观测需求。
- 自定义算法只有接口、参数和结果校验（`custom` 类型无内置校验器），没有沙箱；安全责任在注册者。
- 智能体提交的运行建议只存在内存中，Host 重启后丢失；结果本身已落盘。
- 高德底图上的结果回放图层未实机验证（本机无 Key）；内置画布的 DRT 回放已验证，配车回放绘制逻辑与 DRT 共用同一时间轴。
- 客流班次生成未在本机真实数据上跑通（临港项目无时刻表与分时段客流），只覆盖程序生成的虚构夹具；真实数据下的班次与缺口报告待有数据时复核。

## Windows 安装与数据通信修复

日期：2026-10-09。插件：`0.1.1-alpha.2`。环境：Windows、Node.js 24.21.0、Python 3.12.14 隔离 venv、pandas 3.0.6、Microsoft Edge headless。安装测试分别使用 pnpm 11.25.0 和桌面版内置 pnpm 11.7.0，两种安装来源均通过。官方 DSH `0.2.0-rc.2` 与 `0.2.1-alpha.1` 分别安装到项目内的隔离运行目录；没有修改正在使用的桌面 profile 或读取其模型凭据。

### 故障与修复

- 原安装日志记录 GitHub 依赖安装成功，但仓库 `.gitignore` 排除了 `lib/`，没有安装构建脚本。修复前 `npm pack --dry-run --json --ignore-scripts` 的 32 个文件中不含两个 JS 入口；这足以导致 Host 导入失败。修复后构建文件随仓库交付，新增 Windows/Linux CI 的源码一致性检查；不引入 `prepare`、`prepack` 或安装构建授权。
- Windows 下原包检查脚本 `execFileSync("npm", …)` 报 `ENOENT`。现在优先通过 Node 执行 npm CLI，独立运行时兼容 Windows 命令包装器；检查打包不执行生命周期脚本，同时拒绝缺少必要运行文件的包。
- Python 原输出可包含裸 `NaN`。新增统一严格 JSON 边界：嵌套数值 NaN/正负无穷转换为 null，字符串 `"NaN"` 保留，布尔值和正常数值保持语义。通信、地图、manifest 与算法结果均采用严格序列化；Node 对非法 JSON 明确报告协议错误，不输出原始数据载荷。

### 已通过的验证

| 检查 | 结果 |
|---|---|
| Node 回归 | 36 项通过、0 跳过；显式设置 `LINGGO_TEST_PYTHON` 与 `LINGGO_REQUIRE_PYTHON=1` |
| Python 回归 | 35 项通过 |
| 构建一致性 | `npm run check:build` 通过，两个入口与源码一致 |
| Windows 包检查 | 直接运行及 npm CLI 路径通过；空格、中文、单引号路径通过；缺失 JS/Python 入口、JSON 模块、bundle 或白名单外文件被拒 |
| 两版 DSH API | `test:compat` 的官方安装兼容检查、真实工具权限守卫均通过 |
| 官方 rc.2 的 `.tgz` 安装 | 安装后必要文件齐全、bundle 自动登记、Host 成功启用 |
| 官方 rc.2 的 Git 源安装 | 当前改动复制到独立本地 Git 仓库，按 Git URL 安装通过；依赖仅新增插件包，无安装构建脚本 |
| 两种安装后的 Edge 页面 | 认证进入工作台、Python 依赖诊断、无 shapes/完整 shapes/部分缺失 shapes 的 GTFS 检查→预览→确认→发布→地图读取通过；每例 2 条线路、2 个站点，几何数量分别为 0/2/1；零未捕获异常 |
| worker 异常路径 | 真实 Python→Node 的嵌套非有限数值转换及结果文件 JSON 解析通过；非法标准输出明确拒绝，不泄露测试载荷 |
| 导入原子性 | 预览后损坏 GTFS 源文件导致导入失败，无发布版本、无 staging 残留 |

实机安装测试使用含空格、中文和单引号的独立 `DSH_HOME`，只生成虚构公交数据。浏览器验收为隔离宿主设置已完成的初始向导状态，没有调用外部模型。安装日志与截图保留在项目 `.local/` 验证目录，不进入 Git 仓库或发行包。

### 复现入口与边界

```powershell
npm ci
npm run check:build
npm run check:package
npm run pack:release
$env:LINGGO_TEST_PYTHON = "C:\test-home\linggo\venv\Scripts\python.exe"
$env:LINGGO_REQUIRE_PYTHON = "1"
npm test
$env:PYTHONPATH = "$PWD\python"
$env:PYTHONUTF8 = "1"
& $env:LINGGO_TEST_PYTHON -m unittest discover -s python/tests
npm run test:compat -- C:\isolated-rc2-runtime C:\isolated-alpha1-runtime
```

安装步骤见 README 的 Windows PowerShell 部分。Git 源测试验证的是未推送修复的本地 Git 快照；远程 GitHub 安装必须等这些改动（包括 `lib/`）提交并推送后才能获得修复。此次不发布远程版本、不修改用户桌面 profile，不把原生窗口、外部地图供应商、真实运营数据或 Linux 运行写成已验收。
