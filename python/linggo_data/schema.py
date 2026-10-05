"""Standard transit entities. Every imported source is mapped onto one of these."""

# field: (type, required). Types: id, str, float, int, time, datetime, coords.
ENTITIES = {
    "stops": {
        "label": "站点",
        "key": ["stop_id"],
        "fields": {
            "stop_id": ("id", True),
            "stop_name": ("str", False),
            "lon": ("float", True),
            "lat": ("float", True),
        },
    },
    "routes": {
        "label": "线路与方向",
        "key": ["route_id", "direction"],
        "fields": {
            "route_id": ("id", True),
            "route_name": ("str", False),
            "direction": ("id", False),
            "geometry": ("coords", False),
        },
    },
    "route_stops": {
        "label": "线路站序",
        "key": ["route_id", "direction", "seq"],
        "fields": {
            "route_id": ("id", True),
            "route_name": ("str", False),
            "direction": ("id", False),
            "seq": ("int", True),
            "stop_id": ("id", True),
            "stop_name": ("str", False),
            "lon": ("float", False),
            "lat": ("float", False),
        },
    },
    "trips": {
        "label": "时刻表（计划班次）",
        "key": ["trip_id"],
        "fields": {
            "trip_id": ("id", False),
            "route_id": ("id", True),
            "direction": ("id", False),
            "departure_time": ("time", True),
            "arrival_time": ("time", False),
            "service_id": ("id", False),
        },
    },
    "ridership": {
        "label": "分时段客流",
        "key": None,
        "fields": {
            "route_id": ("id", True),
            "direction": ("id", False),
            "stop_id": ("id", False),
            "time_bin": ("str", True),
            "boardings": ("float", True),
            "alightings": ("float", False),
        },
    },
    "od": {
        "label": "OD",
        "key": None,
        "fields": {
            "origin_stop_id": ("id", True),
            "dest_stop_id": ("id", True),
            "time_bin": ("str", False),
            "count": ("float", True),
        },
    },
    "demand": {
        "label": "需求（逐笔请求）",
        "key": ["request_id"],
        "fields": {
            "request_id": ("id", False),
            "request_time": ("datetime", True),
            "o_lon": ("float", True),
            "o_lat": ("float", True),
            "d_lon": ("float", True),
            "d_lat": ("float", True),
            "passengers": ("int", False),
        },
    },
    "gps": {
        "label": "车辆 GPS",
        "key": None,
        "fields": {
            "vehicle_id": ("id", True),
            "time": ("datetime", True),
            "lon": ("float", True),
            "lat": ("float", True),
            "route_id": ("id", False),
        },
    },
    "vehicles": {
        "label": "车辆",
        "key": ["vehicle_id"],
        "fields": {
            "vehicle_id": ("id", True),
            "capacity": ("int", False),
            "depot_id": ("id", False),
        },
    },
    "depots": {
        "label": "车场",
        "key": ["depot_id"],
        "fields": {
            "depot_id": ("id", True),
            "depot_name": ("str", False),
            "lon": ("float", True),
            "lat": ("float", True),
        },
    },
}

# Column-name synonyms used only to *suggest* a mapping; the user confirms it.
SYNONYMS = {
    "stop_id": ["stop_id", "stopid", "站点编号", "站点id", "站点代码", "站编号", "stop_code"],
    "stop_name": ["stop_name", "name_cn", "stop_cn", "站点名称", "站名", "站点", "name"],
    "route_id": ["route_id", "routeid", "线路编号", "线路id", "线路代码", "line_id", "route_code"],
    "route_name": ["route_name", "route_cn", "线路名称", "线路", "线路名", "line_name", "route_short_name"],
    "direction": ["direction", "direction_id", "方向", "上下行", "dir"],
    "seq": ["seq", "sequence", "stop_sequence", "站点序号", "站序", "序号", "order"],
    "lon": ["lon", "lng", "longitude", "经度", "x", "stop_lon", "__x"],
    "lat": ["lat", "latitude", "纬度", "y", "stop_lat", "__y"],
    "geometry": ["__geometry", "geometry", "shape"],
    "trip_id": ["trip_id", "班次编号", "班次", "trip"],
    "departure_time": ["departure_time", "发车时间", "出发时间", "计划发车时间", "dep_time", "time"],
    "arrival_time": ["arrival_time", "到达时间", "计划到达时间", "arr_time", "终点到达时间"],
    "service_id": ["service_id", "服务日", "日期类型"],
    "time_bin": ["time_bin", "时段", "小时", "hour", "period"],
    "boardings": ["boardings", "上车人数", "上客", "on", "board"],
    "alightings": ["alightings", "下车人数", "下客", "off", "alight"],
    "origin_stop_id": ["origin_stop_id", "o_stop", "起点站", "上车站点", "o"],
    "dest_stop_id": ["dest_stop_id", "d_stop", "终点站", "下车站点", "d"],
    "count": ["count", "人数", "客流", "volume", "flow", "trips"],
    "request_id": ["request_id", "order_id", "订单编号", "订单id", "id"],
    "request_time": ["request_time", "order_time", "下单时间", "请求时间", "time"],
    "o_lon": ["o_lon", "o_lng", "起点经度", "pickup_lon", "origin_lon"],
    "o_lat": ["o_lat", "起点纬度", "pickup_lat", "origin_lat"],
    "d_lon": ["d_lon", "d_lng", "终点经度", "dropoff_lon", "dest_lon"],
    "d_lat": ["d_lat", "终点纬度", "dropoff_lat", "dest_lat"],
    "passengers": ["passengers", "人数", "乘客数", "pax"],
    "vehicle_id": ["vehicle_id", "车辆编号", "车牌号", "车牌", "车辆id", "bus_id"],
    "time": ["time", "gps_time", "时间", "定位时间", "timestamp"],
    "capacity": ["capacity", "座位数", "载客量", "核载"],
    "depot_id": ["depot_id", "车场编号", "停车场编号", "车场"],
    "depot_name": ["depot_name", "车场名称", "停车场名称", "name"],
}

TRANSFORMS = {
    "": "原值",
    "wkt_lon": "WKT 点取经度",
    "wkt_lat": "WKT 点取纬度",
    "seq_hundreds": "站序百位作为方向",
}

CRS = ["WGS84", "GCJ02", "BD09"]  # plus "EPSG:<code>" for projected sources

# What the map, analysis and algorithms need, by readiness group.
NEEDS = {
    "routes": ["routes", "route_stops"],
    "stops": ["stops"],
    "timetable": ["trips"],
    "ridership": ["ridership", "od"],
}
