# 三栏工作台与地图升级（0.1.1-alpha.1）

## 使用与设置

左侧：品牌、项目选择和“＋”新建项目；展示会话支持搜索、日期分组和独立滚动；当前数据版本显示能力和行数；版本历史、完成任务历史默认折叠；任务标题旁显示运行及失败数量。底部交接按钮打开摘要与上下文预览，经确认只保存交接，沿用两个 DSH 版本各自的草稿行为。

分隔线拖动、方向键（Shift 为 40px）调整、双击 / Home 复位。左栏 264px（220–420）；对话 420px（320–760 且不超过视口 60%）。中栏至少 400px；先压缩对话，不足再临时收起左栏。低于 900px 用项目／地图／对话切换。最大化和折叠只改变几何与可见性，不卸载原生对话。布局与区块开合保存在 `linggo.layout.v1` / `linggo.section.*`，底图保存在 `linggo.map.provider`；不会写 DSH 官方布局键。响应式压缩不保存为用户宽度。

地图首次选择高德→百度→画布（按配置可用性）；其后记住底图。高德使用 `amap://styles/whitesmoke`；百度使用 JSAPI 4.0 和通用浅色 JSON，不要求账户 StyleID。供应商切换保留 WGS84 地理范围、线路显隐和选择；栏宽改变只更新尺寸。离散缩放级别和投影差异可能使两家底图边界略有差异。

在“设置”保存：

| 字段 | 用途 |
|---|---|
| `amapKey` | 高德 Web JS Key |
| `amapSecurityCode` | 高德安全密钥 |
| `baiduAK` | 百度浏览器端 AK，开启 JSAPI 4.0 并允许实际页面来源 |
| `python` | 已有 Python 隔离环境解释器 |

以上保存于 `$DSH_HOME/linggo/settings.json`（0600）。部分字段更新保留其他已有配置；明确保存空值才删除该字段。不新增模型或地图密钥环境变量。浏览器 SDK 必须接收浏览器密钥，请在供应商控制台设置来源限制。不要把密钥放入项目共享配置。更换已加载的密钥后刷新。加载失败提示并回退画布，可重试和切换，不覆盖底图偏好。

显示统一使用 WGS84→GCJ02；百度在首次地图创建之前设置 `BMap.coordType`，运行中不改变全局坐标系。遇到已有冲突坐标系拒绝启用该底图。遵循 [百度加载文档](https://lbs.baidu.com/docs/jsapi?title=jsapi4/guide/concepts/load)、[GCJ02 配置](https://lbs.baidu.com/docs/jsapi?title=jsapi4/guide/map/gcj02) 与 [公共 Map API](https://lbs.baidu.com/jsapi/refdoc/v4/classes/BMap.Map.html)。

## 地图操作与实现

- 三种适配器共用 render / resize / project / getViewport / setViewport / destroy 和选择事件；地图状态、浮层与适配器从 `data.jsx` 拆至 `map-view.jsx`、`map-model.js`、`map-adapters.js`。框架几何仍由 `compat-client.js` 设置。
- 地图宽度（不是视口宽度）达到 900px 时控制浮层与线路卡可共存，否则使用互斥抽屉；站点气泡与已有结果回放留在地图内。
- 搜索线路名、ID、起终点；可显示／隐藏全部或单线。选择隐藏线路会显示它，其他线路继续保留。原始方向原样呈现，站序定位保持高亮。
- 线路显示当前版本班次数；无时刻表显示未知。几何区分导入线路几何和站间连接，不把后者称为贴路轨迹。不新增客流统计图表。
- 地图覆盖物和画布均可点击线路、站点；详情仅由 React 文本渲染。聚合站点点击放大，选中线路站点不聚合。
- 删除前端 200 条列表、400 个方向的截断；虚拟滚动显示全部已发布线路，地图按视野和像素分辨率裁剪、简化与聚合。选中对象不被视野裁剪。后端 5000 方向上限仍显式告知，未扩大服务端发布范围。
- 项目／版本组件按身份重建，异步数据和地图 SDK 结果有失效检查；旧动作仅列入历史，须显式点击。修复仅有线路几何时的范围计算。数据算法的其他审查项不在本次修改范围。

## 验收记录与限制

2026-10-06，macOS / Node.js 22.23.1 / Edge headless，独立官方 DSH `0.2.0-rc.2`、`0.2.1-alpha.1` profile，不修改官方源码或用户 profile。测试数据为脚本生成的 600 条虚构线路、1200 个站点，只留隔离目录；不进入产品或发行包。

| 检查 | 结果 |
|---|---|
| 构建、JS 25 项（含真实 Python 集成）、Python 33 项 | 通过 |
| 两版安装器兼容与真实工具权限拒绝 | 通过 |
| 两版 Web 流式回复、工具记录、停止、双页面交接、保留已有开发草稿 | 通过 |
| 1920 / 1440 / 1024 / 800px、CSS 125% 缩放、无页面横向溢出 | 通过；不等同原生桌面或浏览器菜单缩放验收 |
| 拖动、键盘、复位、折叠、最大化、刷新恢复、窄屏返回宽屏 | 两版通过；生成中保留未发送草稿、恢复后可停止 |
| 600 条列表末尾、起终点搜索、显隐、画布线路命中、线路／站点详情 | 通过 |
| 真实高德灰白 SDK，600 个实际 Polyline、隐藏 0 个、选择隐藏线后 1 个 | 两版通过，使用本机密钥，无密钥输出 |
| 百度公开接口契约：创建前 GCJ、样式 JSON、600 个覆盖物、事件、尺寸、销毁、网络失败 | 测试替身通过；不能替代真实 SDK 验收 |
| 两版官方卸载、入口 / API 消失、用户项目状态保留 | 通过；卸载后两版 Web 官方布局恢复，样式几何清理有自动化测试 |
| 后端重连，当前页面不刷新继续操作 | 两版通过 |
| 原生对话草稿及生成中布局操作 | 两版通过；折叠 / 最大化 / 窄屏后保留草稿并可取消 |
| 已有 DRT 结果底部回放 | 两版 Web 验证，实验假设仍明确标注 |
| 百度真实浅色底图 | 待验证：本机已检查设置中缺少 `baiduAK` |
| 原生桌面、Windows / Linux、浏览器菜单缩放 | 未实测，不标记支持 |

补充操作验证以最终实际运行结果为准，仍需在真实百度 AK 配置后复核底图、坐标对齐、事件和回放。地图服务鉴权失败或网络加载失败的原因以供应商控制台和浏览器网络面板为准，界面不会输出密钥或完整 SDK URL。

复现入口：

```sh
npm run build
LINGGO_TEST_PYTHON=/absolute/path/to/python npm test
python -m unittest discover -s python/tests
npm run test:compat -- /absolute/path/to/rc2-runtime /absolute/path/to/alpha1-runtime
python scripts/browser-workbench.py /absolute/path/to/host.log /absolute/path/to/isolated-home --shots /absolute/path/to/screenshots --real-maps
python scripts/browser-map-adapters.py /absolute/path/to/host.log /absolute/path/to/isolated-home
python scripts/browser-compat.py /absolute/path/to/host.log /absolute/path/to/isolated-home --shots /absolute/path/to/screenshots
```

旧版最后一条添加 `--legacy`。脚本只用于预先配置好的隔离测试 profile；不对用户 profile 运行。安装包不包含脚本夹具、数据、地图截图或凭据。开发修改客户端后 `npm run build`，更新隔离 profile 中安装的构建文件并刷新展示页；Host 修改需重启对应 profile，不需要重建官方 DSH。
