"""Read-only original pure kernel fixture; source Git blob 8532e46b2aa394554b2042c343e820146c2d4f15. Not packaged."""
MAX_RIDE_FACTOR=1.6
MAX_RIDE_SLACK_MIN=10
DWELL_S=20.0
HOLD_S=60.0
W_RIDE=0.3
W_DRIVE=0.05

class Order:
    __slots__ = ('oid', 'p', 'd', 'pax', 'req', 'mode', 'base_min', 'direct', 'walk_s', 'max_ride', 'veh', 'board_t', 'drop_t')

    def __init__(self, oid, p, d, pax, req, mode, base_min, direct, walk_s):
        self.oid = oid
        self.p = p
        self.d = d
        self.pax = pax
        self.req = req
        self.mode = mode
        self.base_min = base_min
        self.direct = direct
        self.walk_s = walk_s
        self.max_ride = max(direct * MAX_RIDE_FACTOR, direct + MAX_RIDE_SLACK_MIN * 60)
        self.veh = None
        self.board_t = None
        self.drop_t = None

class Visit:
    __slots__ = ('stop', 'arr', 'dep', 'pickups', 'dropoffs')

    def __init__(self, stop):
        self.stop = stop
        self.arr = 0.0
        self.dep = 0.0
        self.pickups = []
        self.dropoffs = []

class Vehicle:
    __slots__ = ('vid', 'row', 'free_t', 'route', 'onboard', 'departed', 'depart_t', 'drive_s', 'dist_m', 'served', 'load', 'loaded_dist_m', 'history', 'log', 'home')

    def __init__(self, vid, depot_row, t0):
        self.log = None
        self.vid = vid
        self.row = depot_row
        self.free_t = t0
        self.route = []
        self.onboard = []
        self.departed = False
        self.depart_t = 0.0
        self.drive_s = 0.0
        self.dist_m = 0.0
        self.loaded_dist_m = 0.0
        self.served = 0
        self.load = 0
        self.history = 0

def schedule(tt, anchor_row, anchor_t, load0, visits):
    """从锚点推算 visit 序列的 arr/dep/载客。返回 (arrs, deps, loads, drive_s)。"""
    arrs, deps, loads = ([], [], [])
    row, t, load = (anchor_row, anchor_t, load0)
    drive = 0.0
    for v in visits:
        leg = tt[row][v.stop]
        t += leg
        drive += leg
        latest_req = 0.0
        for o in v.pickups:
            if o.req > latest_req:
                latest_req = o.req
        dep = (t if t > latest_req else latest_req) + DWELL_S
        for o in v.dropoffs:
            load -= o.pax
        for o in v.pickups:
            load += o.pax
        arrs.append(t)
        deps.append(dep)
        loads.append(load)
        row, t = (v.stop, dep)
    return (arrs, deps, loads, drive)

def check_and_score(visits, arrs, deps, loads, drive, seats, wait_cap):
    """约束校验 + 等待优先目标值。违反约束返回 None。"""
    obj = 0.0
    board = {}
    for v, arr, load in zip(visits, arrs, loads):
        if load > seats:
            return None
        for o in v.pickups:
            bt = arr if arr > o.req else o.req
            if bt - o.req > wait_cap:
                return None
            obj += bt - o.req
            board[o.oid] = bt
        for o in v.dropoffs:
            bt = board.get(o.oid, o.board_t)
            if bt is not None:
                ride = arr - bt
                if ride > o.max_ride:
                    return None
                obj += W_RIDE * ride
    return obj + W_DRIVE * drive

def advance(veh, t, tt, dist):
    """把车辆推进到时刻 t：完成 arr<=t 的 visit。"""
    while veh.route and veh.route[0].arr <= t:
        v = veh.route.pop(0)
        leg_t = tt[veh.row][v.stop]
        leg_d = dist[veh.row][v.stop]
        if veh.log is not None:
            veh.log.append({'from': veh.row, 'to': v.stop, 'dep': v.arr - leg_t, 'arr': v.arr, 'vdep': v.dep, 'load_leg': veh.load, 'board': [(o.oid, o.pax) for o in v.pickups], 'alight': [(o.oid, o.pax) for o in v.dropoffs]})
        veh.drive_s += leg_t
        veh.dist_m += leg_d
        if veh.load > 0:
            veh.loaded_dist_m += leg_d
        for o in v.dropoffs:
            o.drop_t = v.arr
            veh.load -= o.pax
            veh.onboard.remove(o)
            veh.served += 1
        for o in v.pickups:
            o.board_t = v.arr if v.arr > o.req else o.req
            veh.load += o.pax
            veh.onboard.append(o)
        veh.row = v.stop
        veh.free_t = v.dep
        veh.history += 1
    if not veh.route:
        veh.departed = False
        veh.depart_t = 0.0
        if veh.free_t < t:
            veh.free_t = t

def anchor_of(veh):
    return veh.free_t if veh.free_t > veh.depart_t else veh.depart_t

def try_insert(tt, veh, order, now, seats, wait_cap, policy):
    """返回 (cost, i, j, attach) 或 None。attach=True 表示 B 的同站捎带。"""
    route = veh.route
    L = len(route)
    executing = L > 0 and veh.departed and (now >= veh.depart_t)
    if veh.departed:
        anchor_t = anchor_of(veh)
    else:
        anchor_t = veh.free_t if veh.free_t > now else now
        if policy == 'B':
            anchor_t += HOLD_S
    if policy == 'B' and executing:
        best = None
        for i in range(L):
            if route[i].stop != order.p:
                continue
            bt = route[i].arr if route[i].arr > order.req else order.req
            if bt - order.req > wait_cap or route[i].arr < order.req - DWELL_S:
                break
            for j in range(i + 1, L):
                if route[j].stop != order.d:
                    continue
                route[i].pickups.append(order)
                route[j].dropoffs.append(order)
                arrs, deps, loads, drive = schedule(tt, veh.row, anchor_t, veh.load, route)
                score = check_and_score(route, arrs, deps, loads, drive, seats, wait_cap)
                route[i].pickups.pop()
                route[j].dropoffs.pop()
                if score is not None:
                    cost = bt - order.req
                    if best is None or cost < best[0]:
                        best = (cost, i, j, True)
            break
        return best
    i_min = 1 if executing else 0
    if executing:
        lb_row, lb_t = (route[0].stop, route[0].dep)
    else:
        lb_row, lb_t = (veh.row, anchor_t)
    if lb_t + tt[lb_row][order.p] > order.req + wait_cap:
        return None
    if route:
        arrs0, deps0, loads0, drive0 = schedule(tt, veh.row, anchor_t, veh.load, route)
        base = check_and_score(route, arrs0, deps0, loads0, drive0, seats, wait_cap)
        if base is None:
            base = 0.0
    else:
        base = 0.0
    vp = Visit(order.p)
    vp.pickups.append(order)
    vd = Visit(order.d)
    vd.dropoffs.append(order)
    best = None
    for i in range(i_min, L + 1):
        head = route[:i] + [vp]
        for j in range(i, L + 1):
            visits = head + route[i:j] + [vd] + route[j:]
            arrs, deps, loads, drive = schedule(tt, veh.row, anchor_t, veh.load, visits)
            score = check_and_score(visits, arrs, deps, loads, drive, seats, wait_cap)
            if score is None:
                continue
            cost = score - base
            if best is None or cost < best[0]:
                best = (cost, i, j, False)
    return best

def commit_insert(tt, veh, order, ins, now, policy):
    cost, i, j, attach = ins
    if attach:
        veh.route[i].pickups.append(order)
        veh.route[j].dropoffs.append(order)
    else:
        vp = Visit(order.p)
        vp.pickups.append(order)
        vd = Visit(order.d)
        vd.dropoffs.append(order)
        veh.route[i:i] = [vp]
        veh.route[j + 1:j + 1] = [vd]
        if not veh.departed:
            veh.depart_t = now + (HOLD_S if policy == 'B' else 0.0)
            veh.departed = True
            if veh.free_t < now:
                veh.free_t = now
    order.veh = veh.vid
    arrs, deps, _, _ = schedule(tt, veh.row, anchor_of(veh), veh.load, veh.route)
    for v, a, d in zip(veh.route, arrs, deps):
        v.arr = a
        v.dep = d
