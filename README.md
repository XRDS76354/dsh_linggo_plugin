# LingGo × DeepSeek Harness

公交工作台插件，目标是把用户自己的公交数据接入地图、DSH 智能体和可替换调度算法。

**第一阶段（DSH 集成）和第二阶段（数据导入与地图）已在 macOS Web 验收；还不是完整公交产品。** 已实现官方 bundle、独立三栏展示页、按项目隔离的展示/开发会话、开发交接、Host 侧工具限制、数据导入向导、不可变数据版本、内置画布地图与高德适配、智能体查询与地图联动。调度算法和 Skills 在后续阶段实现。详见 [验收记录](docs/verification.md) 和 [任务清单](.spec/tasks.md)。不提供地区数据或产品演示数据。

## 开发安装

要求 Node.js 22.19+（在 Node 22.23.1 验证）、官方 DSH 0.2.1-alpha.1。无需修改 DSH 源码。

```sh
npm ci
npm run build
npm test
dsh --profile linggo --from-default-profile web --help
dsh plugin --profile linggo add /absolute/path/to/dsh_linggo_plugin
dsh --profile linggo --port 3180 --no-open
```

使用 DSH 启动时打印的认证 URL 打开页面。在左侧栏点击“公交工作台”，再点击“打开三栏工作台”；原页面仍为 DSH 开发页。在三栏页创建项目（一个城市或区域一个项目），点击“新建展示会话”。原生 DSH 负责模型、消息、工具记录与流式响应，模型凭据仍在 DSH 内配置。

展示会话只开放 `linggo_status`、`linggo_query`（只读查询当前数据版本）和 `linggo_map`（在中间地图显示线路/站点）；开发会话继续使用用户的 DSH 工具权限。工具限制由 Host 根据持久会话目录执行，不由页面按钮决定。

三栏页的开发交接需要预览并确认后才保存。DSH 开发页的“公交工作台”面板列出交接；打开时进入该项目的开发工作区并把交接填入原生输入框，不会自动发送。再次打开会回到同一个开发会话。已知限制见[验收记录](docs/verification.md#已知限制)。

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

## 数据位置和卸载

运行状态保存于 `$DSH_HOME/linggo`，默认 `~/.dsh/linggo`：项目按随机 ID 隔离展示与开发目录，数据版本位于 `projects/<id>/data/versions`，设置（含高德密钥）位于 `settings.json`（权限 0600）。插件只读源文件，不把用户数据写入插件源码目录；PostGIS 连接串不写入版本记录。

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

发行白名单仅包含构建文件、Python 数据模块与依赖清单、Python 初始化脚本、bundle 配置、README、许可证与兼容说明。源码安装使用仓库中的 lockfile。请勿将本预览包描述为可完成数据或调度流程的正式版。

## 后续阶段

1. ~~DSH 集成~~（已完成，桌面待验收）。
2. ~~数据导入、数据版本、地图与质量检查~~（已完成，PostGIS 和高德底图待实机验收）。
3. DRT、常规公交配车/客流班次、实验场景、Python 算法接口和 Skills。
4. 预构建版本、隔离 Python 初始化、跨平台验证与公开发布检查。

自研代码 MIT；第三方软件仍按自身许可证使用。CPTOND 与地区原始数据不随插件分发，也不因此获得再分发授权。
