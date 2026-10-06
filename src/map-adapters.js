import BaiduLoader from "@baidumap/jsapi-loader";
import {
  gcj,
  wgs,
  bounds,
  visibleScene,
  hitLine,
  routeColor,
  STOP_RADIUS,
  STOP_RADIUS_SELECTED,
} from "./map-model.js";
import { drawOverlay } from "./analysis.jsx";
let amapLoad, amapKey, amapCode, baiduKey;
function loadAmap(settings) {
  if (
    amapKey &&
    (amapKey !== settings.amapKey ||
      amapCode !== (settings.amapSecurityCode ?? ""))
  )
    return Promise.reject(Error("reload"));
  if (window.AMap) return Promise.resolve(window.AMap);
  if (amapLoad) return amapLoad;
  amapKey = settings.amapKey;
  amapCode = settings.amapSecurityCode ?? "";
  amapLoad = new Promise((resolve, reject) => {
    window._AMapSecurityConfig = { securityJsCode: amapCode };
    const script = document.createElement("script");
    let done = false;
    const finish = (ok) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      script.onload = script.onerror = null;
      if (ok) resolve(window.AMap);
      else {
        script.remove();
        reject(Error("network"));
      }
    };
    const timer = setTimeout(() => finish(false), 15000);
    script.src =
      "https://webapi.amap.com/maps?v=2.0&key=" +
      encodeURIComponent(settings.amapKey);
    script.onload = () => finish(!!window.AMap);
    script.onerror = () => finish(false);
    document.head.append(script);
  }).catch((e) => {
    amapLoad = null;
    amapKey = null;
    throw e;
  });
  return amapLoad;
}
// Soft gray basemap with enough contrast for route polylines to read on top.
// Slightly deeper land/water/green than a near-white canvas; roads stay light.
// Soft gray basemap. IMPORTANT: do not paint featureType "all" geometry —
// that flattens roads/buildings into the land color and the map looks blank.
// Style land only, then give roads/boundaries/labels their own tokens.
const lightStyle = [
  { featureType: "land", elementType: "geometry", stylers: { color: "#e6eaed" } },
  { featureType: "water", elementType: "geometry", stylers: { color: "#b7d2e0" } },
  { featureType: "green", elementType: "geometry", stylers: { color: "#c5d8bf" } },
  { featureType: "building", elementType: "geometry", stylers: { color: "#d5dce2" } },
  {
    featureType: "highway",
    elementType: "geometry",
    stylers: { color: "#ffffff", "visibility": "on" },
  },
  {
    featureType: "highway",
    elementType: "geometry.stroke",
    stylers: { color: "#c5ccd2" },
  },
  {
    featureType: "arterial",
    elementType: "geometry",
    stylers: { color: "#f7f8f9", "visibility": "on" },
  },
  {
    featureType: "arterial",
    elementType: "geometry.stroke",
    stylers: { color: "#d0d6db" },
  },
  {
    featureType: "local",
    elementType: "geometry",
    stylers: { color: "#f2f4f5", "visibility": "on" },
  },
  {
    featureType: "local",
    elementType: "geometry.stroke",
    stylers: { color: "#dce1e5" },
  },
  {
    featureType: "railway",
    elementType: "geometry",
    stylers: { color: "#c5ccd2", "visibility": "on" },
  },
  {
    featureType: "boundary",
    elementType: "geometry",
    stylers: { color: "#9aa7b2", "visibility": "on" },
  },
  {
    featureType: "boundary",
    elementType: "geometry.stroke",
    stylers: { color: "#8a97a3" },
  },
  {
    featureType: "manmade",
    elementType: "geometry",
    stylers: { color: "#d5dce2" },
  },
  {
    featureType: "all",
    elementType: "labels.text.fill",
    stylers: { color: "#3d4a55", "visibility": "on" },
  },
  {
    featureType: "all",
    elementType: "labels.text.stroke",
    stylers: { color: "#e6eaed", weight: 2 },
  },
  {
    featureType: "all",
    elementType: "labels.icon",
    stylers: { "visibility": "on" },
  },
  // Keep district/city names; drop only noisy POI icons.
  { featureType: "poi", elementType: "labels.icon", stylers: { "visibility": "off" } },
  { featureType: "poi", elementType: "labels.text.fill", stylers: { color: "#6b7782" } },
];
// Each adapter owns its map, listeners and overlays. The caller owns geographic state.
export async function createMapAdapter(
  engine,
  host,
  settings,
  { onSelect, onChange, isActive = () => true },
) {
  let scene = null,
    disposed = false,
    rendered = null,
    objects = [],
    listeners = [],
    raf,
    motionRaf,
    lastBase = null;
  const native = document.createElement("div");
  native.className = "linggo-native-map";
  const canvas = document.createElement("canvas");
  canvas.className = "linggo-render-map";
  let map,
    SDK,
    view = { cx: 0, cy: 0, s: 1000, k: 1 },
    initial = false;
  try {
    if (engine === "amap") {
      SDK = await loadAmap(settings);
      if (!isActive()) throw Error("cancelled");
      host.append(native);
      map = new SDK.Map(native, {
        mapStyle: "amap://styles/whitesmoke",
        zoom: 11,
        center: [105, 35],
        viewMode: "2D",
        resizeEnable: true,
        rotateEnable: false,
        pitchEnable: false,
      });
    }
    if (engine === "baidu") {
      if (baiduKey && baiduKey !== settings.baiduAK) throw Error("reload");
      const preexisting = !!window.BMap;
      SDK = await BaiduLoader.load({
        ak: settings.baiduAK,
        version: "4.0",
        timeout: 15000,
      }).catch(() => {
        throw Error("network");
      });
      if (!isActive()) throw Error("cancelled");
      if (
        preexisting &&
        SDK.coordType !== undefined &&
        SDK.coordType !== window.BMAP_COORD_GCJ02
      )
        throw Error("coordinates");
      SDK.coordType = window.BMAP_COORD_GCJ02;
      baiduKey = settings.baiduAK;
      host.append(native);
      map = new SDK.Map(native, {
        enableAutoResize: true,
        fixCenterWhenResize: true,
        enableRotate: false,
        enableTilt: false,
        enableMapClick: false,
      });
      map.centerAndZoom(new SDK.Point(105, 35), 11);
      map.enableScrollWheelZoom();
      map.setMapStyle({ styleJson: lightStyle });
    }
  } catch (e) {
    map?.destroy?.();
    native.remove();
    canvas.remove();
    throw e;
  }
  host.append(canvas);
  if (engine === "canvas") {
    native.remove();
    canvas.style.pointerEvents = "auto";
    canvas.style.touchAction = "none";
  } else canvas.style.pointerEvents = "none";
  const width = () => host.clientWidth || 1,
    height = () => host.clientHeight || 1;
  const project = (p) => {
    if (engine === "canvas")
      return [
        (p[0] - view.cx) * view.s * view.k + width() / 2,
        (view.cy - p[1]) * view.s + height() / 2,
      ];
    const q = gcj(p),
      pt =
        engine === "amap"
          ? map.lngLatToContainer(q)
          : map.pointToPixel(new SDK.Point(...q));
    return [pt.x ?? pt.getX(), pt.y ?? pt.getY()];
  };
  const unproject = (p) => {
    if (engine === "canvas")
      return [
        view.cx + (p[0] - width() / 2) / (view.s * view.k),
        view.cy - (p[1] - height() / 2) / view.s,
      ];
    const q =
      engine === "amap"
        ? map.containerToLngLat(p)
        : map.pixelToPoint(new SDK.Pixel(...p));
    return wgs([q.lng ?? q.getLng(), q.lat ?? q.getLat()]);
  };
  const getViewport = () =>
    bounds([unproject([0, height()]), unproject([width(), 0])]);
  function setViewport(box, fit = true) {
    if (!box) return;
    initial = true;
    if (engine === "canvas") {
      view = {
        cx: (box[0] + box[2]) / 2,
        cy: (box[1] + box[3]) / 2,
        k: Math.cos(((box[1] + box[3]) * Math.PI) / 360),
        s: 1,
      };
      view.s = Math.min(
        (width() * (fit ? 0.84 : 1)) /
          Math.max((box[2] - box[0]) * view.k, 1e-6),
        (height() * (fit ? 0.84 : 1)) / Math.max(box[3] - box[1], 1e-6),
        2e6,
      );
    } else if (engine === "amap") {
      map.setBounds(
        new SDK.Bounds(gcj(box.slice(0, 2)), gcj(box.slice(2, 4))),
        false,
        fit ? [40, 40, 40, 40] : [0, 0, 0, 0],
      );
    } else
      map.setViewport(
        [
          new SDK.Point(...gcj(box.slice(0, 2))),
          new SDK.Point(...gcj(box.slice(2, 4))),
        ],
        {
          margins: fit ? [40, 40, 40, 40] : [0, 0, 0, 0],
          enableAnimation: false,
        },
      );
    schedule();
  }
  const listen = (target, event, fn) => {
    engine === "amap"
      ? target.on(event, fn)
      : target.addEventListener(event, fn);
    listeners.push(() =>
      engine === "amap"
        ? target.off(event, fn)
        : target.removeEventListener(event, fn),
    );
  };
  const clearObjects = () => {
    for (const o of objects)
      engine === "amap" ? map.remove(o) : map.removeOverlay(o);
    objects = [];
    listeners.splice(0).forEach((fn) => fn());
  };
  const pickStop = (cluster) => {
    if (cluster.ids.length === 1) onSelect({ stopId: cluster.ids[0] });
    else {
      const pts = cluster.ids
        .map((id) => scene.model.stops.get(id))
        .map((s) => [s[2], s[3]]);
      const b = bounds(pts);
      const pad = 0.0006;
      setViewport([b[0] - pad, b[1] - pad, b[2] + pad, b[3] + pad]);
    }
  };
  function draw() {
    if (
      disposed ||
      !scene ||
      !initial ||
      !host.clientWidth ||
      !host.clientHeight
    )
      return;
    const w = width(),
      ht = height(),
      dpr = window.devicePixelRatio || 1;
    canvas.width = w * dpr;
    canvas.height = ht * dpr;
    const g = canvas.getContext("2d");
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, w, ht);
    const viewport = [...getViewport(), w, ht].join(",");
    const baseChanged =
      engine === "canvas" ||
      !lastBase ||
      lastBase.model !== scene.model ||
      lastBase.visible !== scene.visible ||
      lastBase.selection !== scene.selection ||
      lastBase.viewport !== viewport;
    if (baseChanged) {
      rendered = visibleScene(scene, project, getViewport());
      if (engine !== "canvas") clearObjects();
      for (const l of rendered.lines) {
        if (l.path.length < 2) continue;
        const selected =
          l.id === scene.selection.routeId &&
          (scene.selection.direction == null ||
            scene.selection.direction === l.dir);
        const color = routeColor(l.id),
          weight = selected ? 4 : 1.7,
          opacity = scene.selection.routeId ? (selected ? 1 : 0.25) : 0.65;
        if (engine === "canvas") {
          g.strokeStyle = color;
          g.lineWidth = weight;
          g.globalAlpha = opacity;
          g.beginPath();
          l.path.forEach((p, i) => {
            const [x, y] = project(p);
            i ? g.lineTo(x, y) : g.moveTo(x, y);
          });
          g.stroke();
          g.globalAlpha = 1;
        } else {
          const path = l.path.map(gcj),
            o =
              engine === "amap"
                ? new SDK.Polyline({
                    path,
                    strokeColor: color,
                    strokeWeight: weight,
                    strokeOpacity: opacity,
                    zIndex: selected ? 20 : 10,
                  })
                : new SDK.Polyline(
                    path.map((p) => new SDK.Point(...p)),
                    {
                      strokeColor: color,
                      strokeWeight: weight,
                      strokeOpacity: opacity,
                    },
                  );
          listen(o, "click", () =>
            onSelect({ routeId: l.id, direction: l.dir }),
          );
          engine === "amap" ? map.add(o) : map.addOverlay(o);
          objects.push(o);
        }
      }
      for (const st of rendered.stops) {
        const [x, y] = project(st.point),
          r = st.selected ? STOP_RADIUS_SELECTED : STOP_RADIUS,
          color = st.selected ? "#4275dc" : "#71808a";
        if (engine === "canvas") {
          g.fillStyle = "#fff";
          g.strokeStyle = color;
          g.lineWidth = 1.25;
          g.beginPath();
          g.arc(x, y, r, 0, Math.PI * 2);
          g.fill();
          g.stroke();
        } else {
          const p = gcj(st.point);
          let o;
          if (engine === "amap")
            o = new SDK.CircleMarker({
              center: p,
              radius: r,
              fillColor: "#fff",
              strokeColor: color,
              strokeWeight: 1.25,
              fillOpacity: 1,
              zIndex: 30,
            });
          else {
            // Keep on-screen size fixed: convert the pixel radius at draw time.
            const px = map.pixelToPoint(new SDK.Pixel(x + r, y));
            const radius = map.getDistance(new SDK.Point(...p), px);
            o = new SDK.Circle(new SDK.Point(...p), radius, {
              fillColor: "#fff",
              fillOpacity: 1,
              strokeColor: color,
              strokeWeight: 1.25,
            });
          }
          listen(o, "click", () => pickStop(st));
          engine === "amap" ? map.add(o) : map.addOverlay(o);
          objects.push(o);
        }
      }
      lastBase = {
        model: scene.model,
        visible: scene.visible,
        selection: scene.selection,
        viewport,
      };
    }
    if (scene.overlay) drawOverlay(g, project, scene.overlay, scene.time);
    onChange?.();
  }
  function schedule() {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(draw);
  }
  let drag = null;
  const down = (e) => {
    if (engine !== "canvas") return;
    drag = { x: e.clientX, y: e.clientY, view: { ...view }, moved: false };
    canvas.setPointerCapture(e.pointerId);
  };
  const move = (e) => {
    if (!drag) return;
    const dx = e.clientX - drag.x,
      dy = e.clientY - drag.y;
    drag.moved ||= Math.abs(dx) + Math.abs(dy) > 3;
    view.cx = drag.view.cx - dx / (view.s * view.k);
    view.cy = drag.view.cy + dy / view.s;
    schedule();
  };
  const up = (e) => {
    if (!drag) return;
    const d = drag;
    drag = null;
    if (canvas.hasPointerCapture(e.pointerId))
      canvas.releasePointerCapture(e.pointerId);
    if (d.moved) return;
    const rect = canvas.getBoundingClientRect(),
      p = [e.clientX - rect.left, e.clientY - rect.top];
    const st = rendered?.stops.find(
      (s) => Math.hypot(...project(s.point).map((n, i) => n - p[i])) < 9,
    );
    if (st) pickStop(st);
    else {
      const l = hitLine(p, rendered?.lines ?? [], project);
      if (l) onSelect({ routeId: l.id, direction: l.dir });
    }
  };
  const wheel = (e) => {
    if (engine !== "canvas") return;
    e.preventDefault();
    const rect = canvas.getBoundingClientRect(),
      p = [e.clientX - rect.left, e.clientY - rect.top],
      q = unproject(p);
    view.s = Math.max(5, Math.min(2e6, view.s * (e.deltaY < 0 ? 1.25 : 0.8)));
    view.cx = q[0] - (p[0] - width() / 2) / (view.s * view.k);
    view.cy = q[1] + (p[1] - height() / 2) / view.s;
    schedule();
  };
  canvas.addEventListener("pointerdown", down);
  canvas.addEventListener("pointermove", move);
  canvas.addEventListener("pointerup", up);
  canvas.addEventListener("pointercancel", () => (drag = null));
  canvas.addEventListener("wheel", wheel, { passive: false });
  // Keep map-level listeners separate from overlay listeners rebuilt by render.
  const mapListeners = [];
  if (map) {
    for (const event of ["moveend", "zoomend", "resize"]) {
      const fn = () => schedule();
      engine === "amap" ? map.on(event, fn) : map.addEventListener(event, fn);
      mapListeners.push(() =>
        engine === "amap"
          ? map.off(event, fn)
          : map.removeEventListener(event, fn),
      );
    }
    // Native base overlays move with the SDK. Only repaint replay/anchors during
    // animation; rebuild clipped base objects once the interaction finishes.
    for (const event of engine === "amap"
      ? ["mapmove", "zoomchange"]
      : ["moving", "zooming"]) {
      const fn = () => {
        cancelAnimationFrame(motionRaf);
        motionRaf = requestAnimationFrame(() => {
          if (disposed || !scene) return;
          const g = canvas.getContext("2d");
          g.clearRect(0, 0, width(), height());
          if (scene.overlay) drawOverlay(g, project, scene.overlay, scene.time);
          onChange?.();
        });
      };
      engine === "amap" ? map.on(event, fn) : map.addEventListener(event, fn);
      mapListeners.push(() =>
        engine === "amap"
          ? map.off(event, fn)
          : map.removeEventListener(event, fn),
      );
    }
  }
  const resize = () => {
    if (map) {
      if (engine === "baidu") map.checkResize();
    }
    schedule();
  };
  return {
    render(next) {
      scene = next;
      schedule();
    },
    resize,
    project,
    getViewport,
    setViewport,
    destroy() {
      disposed = true;
      cancelAnimationFrame(raf);
      cancelAnimationFrame(motionRaf);
      if (map) {
        clearObjects();
        mapListeners.forEach((fn) => fn());
        map.destroy?.();
      }
      canvas.remove();
      native.remove();
      scene = null;
    },
  };
}
