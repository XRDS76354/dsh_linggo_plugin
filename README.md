# LingGo × DeepSeek Harness

公交工作台插件，目标是把用户自己的公交数据接入地图、DSH 智能体和可替换调度算法。

**当前为第一阶段集成预览，不是完整公交产品。** 已实现官方 bundle、Web 独立入口、项目目录、开发交接记录和展示会话工具限制。地图、数据导入、调度、Skills、桌面到浏览器桥接仍未完成。详见 [验收记录](docs/verification.md) 和 [任务清单](.spec/tasks.md)。不提供地区数据或产品演示数据。

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

使用 DSH 启动时打印的认证 URL 打开页面。点击“公交工作台”在新页面打开三栏预览；原页面仍为 DSH。创建项目后点击“新建展示会话”。原生 DSH 负责模型、消息、工具记录与流式响应，模型凭据仍在 DSH 内配置。

目前展示会话只开放 `linggo_status`，它会明确报告未接入数据；开发会话继续使用用户的 DSH 工具权限。工具限制由 Host 根据持久会话目录执行，不由页面按钮决定。

三栏中的开发摘要需要预览、确认保存。DSH 页面通过“开发交接”打开独立开发会话并复制摘要，用户粘贴检查后发送。这个预览实现尚未支持数据版本引用和已有开发会话重用。

## 数据位置和卸载

运行状态保存于 `$DSH_HOME/linggo`，默认 `~/.dsh/linggo`。项目按随机 ID 隔离展示与开发目录。不要把用户数据写入插件源码目录。

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

发行白名单仅包含构建文件、bundle 配置、README、许可证与兼容说明。源码安装使用仓库中的 lockfile。请勿将本预览包描述为可完成数据或调度流程的正式版。

## 后续阶段

1. 完成 Web/桌面原生对话与双页面验收。
2. CSV/TSV/Excel、GeoJSON/Shapefile、GTFS 和 PostGIS 只读导入，数据版本、地图与质量检查。
3. DRT、常规公交配车/客流班次、实验场景、Python 算法接口和 Skills。
4. 预构建版本、隔离 Python 初始化、跨平台验证与公开发布检查。

自研代码 MIT；第三方软件仍按自身许可证使用。CPTOND 与地区原始数据不随插件分发，也不因此获得再分发授权。
