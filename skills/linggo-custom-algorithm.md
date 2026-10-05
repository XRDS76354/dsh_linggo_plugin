# LingGo 自定义 Python 算法

用户可以注册自己的 Python 算法，与内置算法使用同一接口和同一校验器。

1. 复制模板：{{PYTHON_DIR}}/templates/linggo_algorithm.py
   - META：id、name、kind（drt | fleet | tripgen | custom）、description、inputs（标准数据类型及是否必需）、params（integer / number / boolean / string / enum，带 default、min、max、label）。
   - run(inputs, params, ctx)：inputs 为字符串列的 pandas DataFrame；ctx.progress(0..1, 消息)、ctx.km、ctx.travel_s 可用；返回结果字典。kind 为 drt / fleet / tripgen 时结果字段要符合内置校验器（参考模板与内置算法 linggo_data/drt.py、fleet.py、tripgen.py）。
2. 本地自检（虚构夹具数据，或指定项目数据版本目录）：
   在 {{PYTHON_DIR}} 目录下用插件的 Python 运行
   python -m linggo_data.selfcheck 你的文件.py [--version-dir 数据版本目录] [--params '{"fleet_size": 8}']
   开发会话里数据版本目录在 LingGo 数据目录的 projects/<项目>/data/versions/<版本>。
3. 注册：在工作台“分析”页选择“注册算法”，填写文件路径，查看完整源代码和 SHA-256 后确认。文件之后被修改会拒绝运行，需要重新注册。

安全提示必须告诉用户：接口与结果校验不等于代码安全。注册的代码以用户自己的权限在本机运行，没有沙箱；只注册自己写的或已审阅的代码。
展示会话不能编写代码；需要写算法时建议“交接给开发工作台”。
