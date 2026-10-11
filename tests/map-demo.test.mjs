import test from "node:test";
import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import { demoAssets } from "../src/demo.js";
import {
  buildOverlay,
  vehicleState,
  positionAt,
  hitVehicle,
} from "../src/map-replay.js";
import { gcj, wgs } from "../src/map-model.js";

test("approved route pairing, dataset references, distinct profiles and conservation", async () => {
  const { bundle, catalog } = await demoAssets(),
    t = bundle.tables;
  assert.equal(t.stops.length, 95);
  assert.equal(t.routes.length, 16);
  assert.equal(t.route_stops.length, 176);
  assert.deepEqual(
    [...new Set(t.routes.map((r) => r.route_id))],
    ["1009", "1037", "1043", "1061", "1063", "1064", "1075", "1077"],
  );
  assert.equal(
    new Set(bundle.routeSources.map((s) => s.sourceRouteId)).size,
    16,
  );
  const board = new Map(),
    alight = new Map();
  for (const r of t.od) {
    const prefix =
        [r.route_id, r.direction, r.day_type, r.time_bin].join("/") + "/",
      a = prefix + r.origin_stop_id,
      b = prefix + r.dest_stop_id;
    board.set(a, (board.get(a) ?? 0) + +r.count);
    alight.set(b, (alight.get(b) ?? 0) + +r.count);
  }
  for (const r of t.ridership) {
    const k = [r.route_id, r.direction, r.day_type, r.time_bin, r.stop_id].join(
      "/",
    );
    assert.equal(+r.boardings, board.get(k) ?? 0);
    assert.equal(+r.alightings, alight.get(k) ?? 0);
  }
  const stops = new Set(t.stops.map((s) => s.stop_id));
  for (const r of t.route_stops) assert.ok(stops.has(r.stop_id));
  assert.equal(bundle.profiles.length, 48);
  assert.ok(
    new Set(bundle.profiles.map((p) => p.bins.reduce((a, b) => a + b, 0)))
      .size > 20,
  );
  for (const p of bundle.profiles) {
    assert.equal(p.bins.length, 48);
    for (let b = 0; b < 48; b++) {
      const rows = t.ridership.filter(
        (r) =>
          r.route_id === p.routeId &&
          r.direction === p.direction &&
          r.day_type === p.dayType &&
          r.time_bin.slice(0, 5) ===
            new Date(b * 1800000).toISOString().slice(11, 16),
      );
      assert.equal(
        rows.reduce((n, r) => n + +r.boardings, 0),
        p.bins[b],
      );
      assert.equal(
        rows.reduce((n, r) => n + +r.alightings, 0),
        p.bins[b],
      );
      let load = 0;
      for (const [i, r] of rows.entries()) {
        load += +r.boardings - +r.alightings;
        assert.ok(load >= 0);
        if (i < rows.length - 1) assert.equal(load, p.sections[b][i]);
      }
      assert.equal(load, 0);
    }
  }
  assert.equal(catalog.length, 4);
  assert.equal(bundle.results.length, 5);
  assert.ok(
    (await stat(new URL("../demo/bundle.json", import.meta.url))).size +
      (await stat(new URL("../demo/catalog.json", import.meta.url))).size <=
      1024 * 1024,
  );
});
test("anonymous clip bounds, initial occupants, heading, selection and future stop context", async () => {
  const { bundle } = await demoAssets(),
    r = bundle.results.find((r) => r.id === "recorded"),
    o = buildOverlay(
      { kind: "drt", algorithmName: r.algorithmName, provenance: r.provenance },
      r.result,
    );
  assert.deepEqual(o.range, [45000, 47700]);
  assert.equal(o.vehicles.length, 6);
  assert.equal(r.result.summary.associated_orders, 38);
  assert.equal(r.result.summary.carry_in, 4);
  assert.equal(r.result.summary.carry_out, 6);
  assert.equal(r.result.summary.completed_in_window, 32);
  assert.equal(r.result.statisticsScope.serviceRateAvailable, false);
  for (const v of o.vehicles) {
    assert.equal(v.track[0].t, 45000);
    assert.equal(v.track.at(-1).t, 47700);
    const s = vehicleState(v, 45000, o.requests);
    assert.equal(s.load, v.initial_load);
    assert.ok(Number.isFinite(s.heading));
    assert.equal(
      hitVehicle(positionAt(v, 45000), (p) => p, o, 45000)?.id !== undefined,
      true,
    );
    for (const p of v.track) {
      assert.ok(Math.abs(wgs(gcj(p.p))[0] - p.p[0]) < 1e-7);
    }
  }
  const decoded = JSON.stringify(r);
  assert.ok(
    !/V005|V031|V062|V083|V091|V035|20250210|2025-02-10|\/Users\//.test(
      decoded,
    ),
  );
  assert.ok(
    !r.result.requests.some(
      (q) => q.request_id && !q.request_id.startsWith("REC-"),
    ),
  );
});
test("legacy replay preserves unknown occupancy and data-based provenance", () => {
  const overlay = buildOverlay(
    { kind: "drt", algorithmName: "Legacy", synthetic: false },
    {
      vehicles: [
        {
          vehicle_id: "L1",
          start: [121, 31],
          stops: [{ arrive: 100, depart: 110, lon: 121.001, lat: 31 }],
        },
      ],
      requests: [],
    },
  );
  assert.equal(overlay.source, "输入数据计算方案");
  assert.equal(
    vehicleState(overlay.vehicles[0], 100, overlay.requests).load,
    undefined,
  );
});

test("frontend has map-first entry and no standalone demo component", async () => {
  const client = await readFile(
    new URL("../src/client.jsx", import.meta.url),
    "utf8",
  );
  assert.ok(!client.includes("DemoView"));
  assert.ok(!client.includes('tab === "demo"'));
});
