# 双版本兼容验收

日期：2026-10-06。插件：`dsh-linggo-plugin@0.1.0-alpha.2`。

## 支持范围

| 官方 DSH | 安装与 Host | Web 页面 | 开发交接 |
|---|---|---|---|
| `0.2.0-rc.2` | 发行包安装及真实权限守卫通过 | Edge 宽屏、窄屏、原生对话通过 | 展示完整内容，复制后打开开发会话粘贴 |
| `0.2.1-alpha.1` | 发行包安装及真实权限守卫通过 | Edge 宽屏、窄屏、原生对话通过 | 原生草稿初始化；已有草稿保留 |

仅声明以上两个版本。能力检测用于选择已经验证的实现，不能替代安装器的兼容声明，也不代表自动支持未来版本。

## 改动

- `compat-client.js` 封装工作区、会话、交接及 Slots 挂载；布局锚点集中声明。
- 新版检测 `conversation.input.requestDraftInitialization`。旧版不调用 `setDraft`、不操作原生输入 DOM 或 localStorage，采用显式复制/粘贴。
- 两版均展示可选择的完整交接内容；剪贴板权限受限时仍可手动复制。两版均不自动发送。
- `compat-host.js` 在文件初始化和业务注册前检查工具守卫与认证传输 API；缺失时拒绝激活。
- DSH/Cordis 及客户端服务所属包声明为由宿主提供的可选 peer，避免安装插件时额外下载另一版本的宿主 API；开发用工具包仍精确固定为 alpha.1。
- 没有修改官方 DSH、Python 数据实体或调度算法。

## 复现与证据

环境：macOS，Node.js 22.23.1，Microsoft Edge headless / Playwright。两个官方 npm 版本分别安装到独立运行目录和独立 `DSH_HOME`，不使用用户桌面 profile。

1. 基线 15 项 JavaScript 测试通过；修改后 20 项通过，Python 集成项未跳过。新增用例覆盖旧版降级、新版保留草稿、阻止初始化、项目会话创建及缺失权限守卫。
2. `test:compat` 使用两版真实 ToolRuntime 执行编码工具，验证展示会话在工具执行前被拒绝；官方 `evaluatePluginCompatibility` 接受两个版本并拒绝未验证版本。
3. 从实际 tarball 用官方 `dsh plugin add` 安装，两版均只增加插件包，没有混装 DSH API 依赖。认证引导、未认证 401、项目隔离、交接引用校验通过。
4. 浏览器检查 1440×900 和 800×900；展示页与开发页独立、原生输入/模型选择保留。流式文本、工具调用及记录、取消后“已停止”和会话退出运行状态均通过。DSH 可保留停止按钮以表示暂停中的回合，因此不以按钮消失作为取消成功条件。
5. 原页面保持打开并重启各自的测试 Host，连接恢复后可继续创建项目；不刷新页面、不再次交换认证 URL。
6. 用官方插件管理命令卸载并重启：浏览器 boot manifest 中插件模块消失，业务 API 返回 404，项目与交接状态保留。
7. 旧版：复制完整交接后打开开发会话，输入框未被改写，粘贴由用户操作；新版：原生预填。两版复用开发会话，已有未发送草稿保留，没有自动发送；浏览器无未捕获异常。

上述模型链路使用 `tests/fixtures/compat-provider.py` 的本地确定性 OpenAI SSE 服务，验证官方协议、工具和取消路径，没有调用外部模型，也没有使用用户凭据。虚构测试内容只存在于隔离 profile，不进入产品入口或发行包。

源码中的可复用检查入口：

```sh
npm run build
LINGGO_TEST_PYTHON=/absolute/path/to/python npm test
npm run test:compat -- /absolute/path/to/rc2-runtime /absolute/path/to/alpha1-runtime
python tests/fixtures/compat-provider.py --port 3260
python scripts/browser-compat.py /absolute/path/to/host.log /absolute/path/to/test-home \
  --legacy --shots /absolute/path/to/screenshots
```

新版浏览器测试省略 `--legacy`。测试 profile 需先配置本地模型路由，运行脚本前应检查源码；不能对用户 profile 或真实业务会话直接运行。

## 限制

- 原生桌面窗口、操作系统协议唤起尚未独立验收；不能把 Web 验收写成原生桌面验收。Windows 后续安装、启动与数据通信验收见[2026-10-09 修复记录](verification.md#windows-安装与数据通信修复)，Linux 实机仍待验收。
- 未重新验证外部模型供应商。数据与算法审查中的既有问题仍需单独修复。
- 三栏 CSS 依赖官方框架的 DOM 锚点，每个新增支持版本都需浏览器复核。
- 不使用版本豁免、不移除 Host 权限限制、不修改用户模型及凭据配置。


## 2026-10-11 先前最小合成演示回归（已由地图版替代）

在两版官方 DSH 的独立 home 从实际 tarball 安装。无模型凭据、无地图密钥、配置不可用 Python 时，两条原生演示会话可见，开场明确标识插件内置说明；OD/客流、四份真实预设、A/B 路网回放、配车、四种视口与草稿行为通过。安装只新增插件包，不另装宿主 API。

原生消息 producer 保留 `linggo-demo` 来源；两版默认隐藏 ordinary Context，插件以公共 `uiConversation.events` 和 `conversation.chat.node` 注册自己的介绍节点。未覆盖原生聊天、输入、模型或工具渲染器。新增可选 peer `@deepseek-ai/dsh-llm` 使用 Host 已有的消息构造函数。

两版真实 ToolRuntime 守卫与安装兼容通过；使用本地确定性 SSE provider 的流式、工具记录、取消、双页交接和既有草稿保留通过。左栏与 600 条线路的原生布局/地图回归通过。alpha.1 上实测显式环境初始化回到参数预览，确认重跑与随包结果一致。此次不扩大支持版本；原生桌面窗口及 Windows/Linux 实机仍未重新验收。

详情与合成数据/内核基线见 [演示规格](compose/spec/demo-minimal-drt-v2.md)。截图和日志在 `artifacts/demo-tests/`，不随包分发。


## 2026-10-11 真实线网地图演示回归

本轮在两版独立 home 从 tarball 安装真实线网地图版。冷安装无 Python、模型凭据和地图密钥：地图默认八条真实线路，客流/OD/计划车辆、匿名既有 DRT 与模拟 A/B、五份结果、车辆点击/详情/事件、四种视口通过，没有自动模型请求或依赖下载。

两版官方 Web 的原生流式回复、工具记录、取消、草稿保留、双页交接及同浏览器重连通过。600 线路旧地图（含关闭旧 DRT 后再次选线）和左栏回归通过。alpha.1 的显式 Python 初始化回到预览、用户确认后重跑一致通过。安装兼容及真实 ToolRuntime 守卫通过；不扩大支持版本。

JS 50 项、Python 44 项无跳过通过，原始/适配 A/B 内核在实际演示矩阵上结果一致；四份模拟重跑及 META 一致。演示资产 450,257 字节，发行包文件/匿名字段白名单通过。

本轮截图和日志位于 `artifacts/map-demo/`，具体范围及未验收项目见 [地图演示规格](compose/spec/demo-minimal-drt-v2.md#本轮验证记录)。未重新验收真实地图密钥服务、原生桌面窗口、Windows/Linux 实机；未提交、推送或发布。


## 2026-10-12 数据清理与智能体批量导入

schema 5 迁移兼容旧记录；展示会话只增加项目查询与批量导入四个工具，shell、任意写入与算法直接运行仍由 Host 守卫禁止。导入来源从 source.kind=user 的原生消息和会话目录绑定，真实会话身份使用 agent.id（兼容 Session.id／旧测试适配字段）。

两版独立 profile 从实际 tarball 离线安装，并通过原生展示对话调用准备／提交／状态工具，自动刷新地图及原人工导入验收；删除确认／撤销／清空、任务终态隐藏恢复和四种视口通过。59 项 JS、51 项 Python 测试及实际 ToolRuntime、原生 Web 流式／工具／取消／草稿／双页交接、左栏和 600 线路／旧回放回归通过；两版同浏览器 Host 重启重连通过。详情见 [数据管理规格](compose/spec/data-management-batch-import.md#验证记录)。不将 Web 验收写成原生桌面或外部服务验收。


### 本地链接更新后的管理接口 404

2026-10-12 实际桌面环境出现前端已更新、Host 仍加载旧模块的情况，删除预览返回 HTTP 404；运行状态仍为 schema 4。通过应用菜单正常退出并重新打开后，schema 5 已加载，现有项目／数据集保留；实际 Host 的删除预览成功返回关联计数，未调用删除接口。新增管理接口的 transport 404 提示应完整重启 Host，再重新打开工作台，而非显示原始网络错误或自动重试。

本次构建、61 项 JS 测试、发行检查通过。浏览器控制连接超时，未完成用户页面确认弹窗的自动验证；后台预览通过，已有两版隔离 Web 的删除确认／取消验收保持有效。
