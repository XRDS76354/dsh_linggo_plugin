# LingGo 线网查询与地图

工具：
- linggo_status：当前项目、数据版本、各类数据行数、缺失项和导入警告。
- linggo_query：按实体读取行，可按 route_id / direction / stop_id 等精确过滤，最多 200 行。
- linggo_map：show_route（route_id，可选 direction）、show_stop（stop_id）、show_run（结果 runId）、show_all、clear。

做法：
1. 用户提到线路名而不是编号时，先用 linggo_query 查 routes 找到 route_id，再 show_route。
2. 统计类问题（站点数、线路长度、班次数）只根据查询结果回答，并说明使用的数据版本。
3. 查询结果被截断时如实说明，不要外推。
4. 导入警告（单方向线路、离群站点、坐标系疑问）会影响分析结论，回答时要提及。


安装内置地图演示包含八条真实线路、固定种子模拟运营及匿名既有 DRT 片段。按 provenance 分别说明来源，模拟需求不可称为观测数据。规范快照查询和五份预计算结果可无需 Python 使用；后续真实导入、自定义算法及重跑仍需用户配置环境、预览并确认。内置管理接口只供插件 UI 使用，不属于展示智能体工具。

路网使用 network_nodes（node_id、lon、lat）与 network_edges（edge_id、from_node_id、to_node_id、length_m、travel_time_s、可选 highway/geometry）。OD 支持 origin_stop_id / dest_stop_id / time_bin 过滤；linggo_map show_od 显示一组需求流向。

地图演示的线路与站点是已确认的真实最小线网；运营、客流与 OD 为固定种子模拟。查询和结果要说明来源，不得称为实测。客流分析按 day_type / route_id / direction / time_bin 筛选，避免把三日型相加。
