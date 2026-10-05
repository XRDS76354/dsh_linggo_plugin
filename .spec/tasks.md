# 实施任务

正式任务29项；按阶段一验收后进入阶段二至四。状态不可用构建成功代替产品验收。

| ID | 任务 | 需求 | 设计 | 状态 | 验证 |
|---|---|---|---|---|---|
| TSK-01 | 创建独立仓库与 bundle | REQ-01 | design.md §D1 | 已实现 | 官方 plugin add |
| TSK-02 | 注册独立页面入口及条件样式 | REQ-01 | design.md §D1 | 已验证 | 双页截图 |
| TSK-03 | 在真实 ToolRuntime 验证工具拒绝 | REQ-02 | design.md §D1 | 已验证 | runtime.test.mjs |
| TSK-04 | 验证原生回复、工具、取消与重连 | REQ-02 | design.md §D1 | 已验证（停止按钮为原生功能，未单测） | 浏览器与临时会话 |
| TSK-05 | 实现桌面到认证浏览器的共享 Host 桥接 | REQ-01 | design.md §D1 | 已实现，待桌面验收 | 桌面实际安装 |
| TSK-06 | 持久化独立项目目录 | REQ-03 | design.md §D2 | 已验证 | store.test.mjs |
| TSK-07 | 保存开发摘要及确认交互 | REQ-03 | design.md §D2 | 已验证 | RPC、界面预览 |
| TSK-08 | 实现项目会话筛选、恢复和交接会话复用 | REQ-03 | design.md §D2 | 已验证 | 两项目切换 |
| TSK-09 | 定义标准数据实体及能力清单 | REQ-04 | design.md §D3 | 待实现 | schema 校验 |
| TSK-10 | 实现表格读取与字段预览 | REQ-04 | design.md §D3 | 待实现 | CSV/TSV/Excel样例 |
| TSK-11 | 实现 GIS 读取和 CPTOND 映射 | REQ-04 | design.md §D3 | 待实现 | 本地真实数据 |
| TSK-12 | 实现 GTFS 读取与关联校验 | REQ-04 | design.md §D3 | 待实现 | 虚构测试夹具 |
| TSK-13 | 实现 PostGIS 只读提取 | REQ-04 | design.md §D3 | 待实现 | 临时数据库集成测试 |
| TSK-14 | 实现映射向导及智能体样例预览 | REQ-05 | design.md §D3 | 待实现 | 浏览器验收 |
| TSK-15 | 实现原子数据版本和失败回滚 | REQ-06 | design.md §D3 | 待实现 | 中断故障测试 |
| TSK-16 | 实现高德配置和线路站点图层 | REQ-07 | design.md §D4 | 待实现 | 坐标抽验 |
| TSK-17 | 实现 GPS/OD/结果分片与回放 | REQ-07 | design.md §D4 | 待实现 | 缺失能力测试 |
| TSK-18 | 实现地图工具与历史动作去重 | REQ-07 | design.md §D4 | 待实现 | 跨项目隔离 |
| TSK-19 | 实现确认、后台运行和取消清理 | REQ-07 | design.md §D4 | 待实现 | 进程故障测试 |
| TSK-20 | 抽取 DRT 通用内核及参数 | REQ-08 | design.md §D5 | 待实现 | 约束独立校验 |
| TSK-21 | 实现给定时刻表配车 | REQ-09 | design.md §D5 | 待实现 | 已知最小配车案例 |
| TSK-22 | 实现客流班次生成与缺口报告 | REQ-09 | design.md §D5 | 待实现 | 不可行情景 |
| TSK-23 | 实现显式实验需求生成 | REQ-10 | design.md §D5 | 待实现 | 同种子复现 |
| TSK-24 | 实现 Python 模板、校验和注册 | REQ-11 | design.md §D5 | 待实现 | 第三方模板运行 |
| TSK-25 | 编写并验证五类工作流程 Skills | REQ-11 | design.md §D5 | 待实现 | 从数据到 DIY 演练 |
| TSK-26 | 实现发行白名单检查 | REQ-12 | design.md §D6 | 已实现 | check:package |
| TSK-27 | 实现隔离 Python 初始化与诊断 | REQ-12 | design.md §D6 | 待实现 | 干净机器 |
| TSK-28 | 补齐三平台安装升级卸载验证 | REQ-12 | design.md §D6 | 待实现 | CI 与实机记录 |
| TSK-29 | 完成来源许可和公开前内容审计 | REQ-12 | design.md §D6 | 待实现 | 发行包/历史检查 |

新增任务沿用上述六列；大型条目实施时拆为单层、可独立验证的30–60分钟工作单元。
