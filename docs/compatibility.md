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

- 原生桌面窗口、操作系统协议唤起、Windows/Linux 尚未独立验收。当前桌面 `rc.2` 的安装版本限制已修正，但不能把 Web 验收写成原生桌面验收。
- 未重新验证外部模型供应商。数据与算法审查中的既有问题仍需单独修复。
- 三栏 CSS 依赖官方框架的 DOM 锚点，每个新增支持版本都需浏览器复核。
- 不使用版本豁免、不移除 Host 权限限制、不修改用户模型及凭据配置。
