import test from "node:test";
import assert from "node:assert/strict";
import {
  computeLayout,
  DEFAULT_LAYOUT,
  normalizeLayout,
  readPreference,
} from "../src/layout.js";
import {
  mapModel,
  gcj,
  wgs,
  visibleScene,
  hitLine,
  bounds,
  STOP_RADIUS,
  STOP_RADIUS_SELECTED,
} from "../src/map-model.js";
test("layout respects center and chat minimums, compresses without overwriting preferences", () => {
  for (const width of [900, 1024, 1440, 1920])
    for (const leftWidth of [220, 264, 420])
      for (const chatWidth of [320, 420, 760])
        for (const leftOpen of [true, false])
          for (const chatOpen of [true, false]) {
            const p = { leftWidth, chatWidth, leftOpen, chatOpen },
              before = { ...p },
              g = computeLayout(width, p);
            assert.ok(g.center >= 400);
            assert.ok(g.chat >= (chatOpen ? 320 : 40));
            assert.equal(g.left + g.chat + g.center + 16, width);
            assert.deepEqual(p, before);
          }
  assert.equal(computeLayout(800, DEFAULT_LAYOUT).mobile, true);
  assert.equal(computeLayout(1440, DEFAULT_LAYOUT, "map").center, 1440);
  assert.equal(computeLayout(1440, DEFAULT_LAYOUT, "chat").chat, 1440);
  assert.deepEqual(normalizeLayout(null), DEFAULT_LAYOUT);
  assert.deepEqual(readPreference({ getItem: () => "{broken" }, "x", {}), {});
});
test("all 600 directions remain present; clipping preserves selected objects; line picking", () => {
  const data = {
    stops: [
      ["a", "A", 120, 30],
      ["b", "B", 120.01, 30.01],
    ],
    routes: Array.from({ length: 600 }, (_, i) => ({
      id: "r" + i,
      dir: "out",
      stops: ["a", "b"],
      geometry: [
        [120 + i * 0.01, 30],
        [120 + i * 0.01, 30.01],
      ],
      trips: 0,
    })),
    bbox: [120, 30, 126, 30.01],
  };
  const m = mapModel(data),
    project = ([x, y]) => [(x - 120) * 1000, (y - 30) * 1000],
    scene = {
      model: m,
      visible: new Set(m.routes.keys()),
      selection: { routeId: "r599" },
    };
  assert.equal(m.routeCount, 600);
  assert.equal(visibleScene(scene, project, m.bbox).lines.length, 600);
  const clipped = visibleScene(scene, project, [120, 30, 120.005, 30.01]);
  assert.deepEqual(
    clipped.lines.map((l) => l.id),
    ["r0", "r599"],
  );
  assert.equal(hitLine([0, 5], clipped.lines, project).id, "r0");
  assert.equal(
    visibleScene({ ...scene, visible: new Set() }, project, m.bbox).lines
      .length,
    0,
  );
  // Stops can be hidden independently of routes.
  const hidden = visibleScene({ ...scene, showStops: false }, project, m.bbox);
  assert.equal(hidden.stops.length, 0);
  assert.equal(hidden.lines.length, 600);
  // Drawn stops are single markers at a fixed pixel radius — never multi-id cluster blobs.
  const shown = visibleScene({ ...scene, showStops: true }, project, m.bbox);
  assert.ok(shown.stops.length > 0);
  assert.ok(shown.stops.every((s) => s.ids.length === 1));
  assert.equal(STOP_RADIUS, 3);
  assert.equal(STOP_RADIUS_SELECTED, 4.5);
  // Stops pair with route visibility: only stops on shown routes are drawn.
  const onlyR0 = visibleScene(
    { ...scene, showStops: true, visible: new Set(["r0"]), selection: {} },
    project,
    m.bbox,
  );
  assert.equal(onlyR0.lines.length, 1);
  assert.ok(onlyR0.stops.length > 0);
  assert.ok(onlyR0.stops.every((s) => s.ids[0] === "a" || s.ids[0] === "b"));
  const none = visibleScene(
    { ...scene, showStops: true, visible: new Set(), selection: {} },
    project,
    m.bbox,
  );
  assert.equal(none.stops.length, 0);
  assert.equal(none.lines.length, 0);
  // Open stop bubble stays anchored even when its routes are hidden.
  const bubbled = visibleScene(
    {
      ...scene,
      showStops: true,
      visible: new Set(),
      selection: { stopId: "a" },
    },
    project,
    m.bbox,
  );
  assert.equal(bubbled.stops.length, 1);
  assert.equal(bubbled.stops[0].ids[0], "a");
  assert.equal(bubbled.stops[0].selected, true);
  assert.deepEqual(
    bounds([
      [1, 2],
      [3, 4],
    ]),
    [1, 2, 3, 4],
  );
});
test("display coordinates round trip without changing canonical data", () => {
  const p = [121.5, 31.2];
  const copy = [...p];
  const q = wgs(gcj(p));
  assert.ok(Math.abs(q[0] - p[0]) < 1e-7 && Math.abs(q[1] - p[1]) < 1e-7);
  assert.deepEqual(p, copy);
  assert.deepEqual(gcj([-74, 40]), [-74, 40]);
});

test('presentation geometry and stylesheet disposal restore the official frame',async()=>{
 const {applyPresentationGeometry,installPresentationStyle}=await import('../src/compat-client.js');
 const attrs=new Map(),values=new Map();let removed=false;
 const document={documentElement:{style:{setProperty:(k,v)=>values.set(k,v),removeProperty:k=>values.delete(k)},setAttribute:(k,v)=>attrs.set(k,v),removeAttribute:k=>attrs.delete(k),toggleAttribute:(k,v)=>v?attrs.set(k,''):attrs.delete(k)},head:{append:()=>{}},createElement:()=>({dataset:{},remove:()=>removed=true})};
 const disposeStyle=installPresentationStyle(document,'workbench-only',true);
 const disposeGeometry=applyPresentationGeometry(document,computeLayout(1440,DEFAULT_LAYOUT),{view:'map',focus:'normal',chatOpen:true});
 assert.equal(values.get('--linggo-left'),'272px');assert.equal(attrs.has('data-linggo'),true);
 disposeGeometry();disposeStyle();assert.equal(values.size,0);assert.equal(attrs.size,0);assert.equal(removed,true);
});
