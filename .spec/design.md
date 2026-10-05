# 架构基线与目标设计

2026-10-05；6个设计区域。明确区分现状与待实现设计。

## D1 插件与页面（REQ-01、REQ-02）
现状：bundle 激活 Host 和 Client。官方客户端模块工厂装载 `lib/client.js`；`shell.overlay` 放置公交区域，原生 Conversation 留在原布局中；仅 `#linggo=1` 使用三栏样式。Host 的 ToolRuntime guard 根据持久 session.header.cwd 最终拒绝非白名单工具。源码：src/index.js、src/client.jsx、src/policy.js。桌面外部浏览器地址通过共享 Host 的 webServer.port 和 connection.authenticatedUrl 生成；#linggo=1 区分页面，避免认证重定向清除查询参数。展示页 CSS 隐藏 DSH 侧栏、右侧栏和拖拽手柄（保留网格位置），左侧 64% 放工作台。展示会话属于项目专用展示工作区（DSH 输入框要求会话有工作区）。Host 在 agent/created 时对展示会话执行 tools.restrict 并注入系统提示段；guard 为最终裁决。桌面实际点击未验证。

## D2 项目和交接（REQ-03）
现状：Store 串行更新并原子替换 state.json。项目 UUID 区分 presentation/development 目录。共享 Connection Fetch 层承载官方 RPC envelope，声明 launch/state/createProject/directory/handoff/handoffOpened/handoffArchive 端点。state.json schema 2，跨进程 state.lock。交接保存摘要、经同项目校验的数据版本/情景/结果引用、来源会话，以及首次打开的开发会话（复用）。展示页按项目筛选和恢复展示会话。源码：src/store.js、src/index.js。

## D3 数据管线（REQ-04、REQ-05、REQ-06）
目标：Python 分块读取 CSV/TSV/Excel、GeoJSON/Shapefile、GTFS，PostGIS 在只读事务中提取表或视图。来源→映射→质量预览→确认→暂存版本→原子发布。标准数据按线路方向、站序、站点、几何、时刻表、客流、OD、需求、GPS、车辆及车场分类；明确坐标、时区、单位、口径。数据库凭据不进入分享配置。尚无实现，不依赖原项目固定地区脚本。

## D4 地图与任务（REQ-07）
目标：高德适配器从项目数据计算范围；分片加载轨迹。工具结果携带 projectId/versionId/actionId/entityRef，实时动作去重；历史结果仅显式点击。导入及计算任务先确认，输出在完成校验后提交；取消清理子进程与暂存产物。尚无实现。

## D5 算法（REQ-08、REQ-09、REQ-10、REQ-11）
目标：Python 进程读固定版本输入、参数及种子，写声明结果及日志。DRT 动态插单独立校验等待/乘车/容量；常规公交分给定班次配车、客流班次生成两种模式，不做司机和跨线路任务。算法清单声明 ID、版本、参数和所需能力；接口校验不等于代码安全。Skills 只指导调用。尚无实现。

## D6 发布与生命周期（REQ-12）
现状：files 白名单、npm pack 检查、自研 MIT、无地区数据。停用移除 Cordis effects，保留用户目录。目标：预构建发行版、独立 Python 初始化、三平台 CI、升级及卸载测试。相关实现：package.json、scripts/build.mjs、scripts/check-package.mjs。
