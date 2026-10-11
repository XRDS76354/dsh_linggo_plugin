# LingGo DRT 动态插入

内置算法 drt_insertion：按请求时间顺序把每笔需求插入现有车辆计划中增加时间最少的位置，满足最长等待、最长乘车（相对直达时间的倍数）、座位数、先上后下约束；结果由独立校验器逐条检查。

需求来源（参数 demand_source）：
- data：使用项目中导入的逐笔需求（demand）。没有该数据时会明确报错，不会默默替换。
- synthetic：按种子在站点之间生成实验需求。结果被标记为“实验”，回答时必须称为实验结果，不能当作真实需求。

车辆与车场：有车辆表 / 车场表时使用；否则按 fleet_size 生成车辆，从需求重心出发，并在假设中注明。
行驶时间 = 直线距离 × 绕行系数 ÷ 平均车速，不是路网最短路。

流程：
1. linggo_algorithms 查看参数与数据是否齐备。
2. linggo_propose_run 提交方案（可用 batch 做多组参数对比，如车队规模 6/8/10），说明理由。用户在“分析”页预览并确认后才运行。
3. 运行结束后 linggo_results 读取服务率、平均等待、车辆利用、拒绝原因与校验结果；linggo_map show_run 在地图上回放车辆轨迹。


## DRT v2 与地图演示

内置 `drt_v2` 是另一套实际内核，保留 A 动态插入 / B 冻结及批量窗口、多车场和原目标函数。需要 stops、demand、vehicles、depots、network_nodes、network_edges；缺失路网必须报告，不用直线估算。启用车辆数量受输入车辆表约束。禁行 motorway / motorway_link，使用有向最短路。乘车上限取 `max(直达时间 × max_ride_factor, 直达时间 + max_ride_slack_min)`；回场、路网轨迹、容量、等待与上下客由专用独立校验器检查。用户算法仍用原独立校验，不能借自定义 ID 获得 V2 信任。

地图演示内有模拟 A/B 预计算结果及既有匿名计算片段，可在无 Python 时用 linggo_results 查询、show_run 回放。使用 linggo_query 的 OD 起讫站点与时段过滤，show_od 可联动流向。比较实际服务率、等待与拒单，不假设 A 永远优于 B。按 provenance 区分真实线网、模拟运营和匿名既有片段。片段 statisticsScope 不支持服务率，不能把 originalScenarioReference 解释为六车样例效果。show_od 支持 route_id、direction、day_type、time_bin；focus_vehicle 和 seek_time 需要当前数据集的 run_id。重跑只提交 proposal；环境初始化是用户界面操作，展示智能体没有 setupPython / ensureDemo / recreateDemo 权限。
