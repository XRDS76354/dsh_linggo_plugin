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
