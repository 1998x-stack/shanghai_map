import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";

const root = new URL("../", import.meta.url);
const read = (path) => readFileSync(new URL(path, root), "utf8");

function setup({ leafletAvailable = true } = {}) {
  const nodes = new Map();
  const node = (id) => {
    if (!nodes.has(id)) nodes.set(id, {
      textContent: "",
      hidden: true,
      disabled: false,
      dataset: {},
      listeners: {},
      addEventListener(type, cb) { this.listeners[type] = cb; },
      click() { return this.listeners.click?.(); }
    });
    return nodes.get(id);
  };
  const statuses = [], tileListeners = {}, mapListeners = {};
  const state = {
    latitude: 31.2304, longitude: 121.4737, zoom: 12,
    tileUrl: null, tileOptions: null, lastBounds: null,
    copied: null, marker: null
  };
  const emit = (event) => { for (const [events, fn] of Object.entries(mapListeners)) {
    if (events.split(" ").includes(event)) fn();
  }};
  const map = {
    getCenter: () => ({ lat: state.latitude, lng: state.longitude }),
    getZoom: () => state.zoom,
    getMaxZoom: () => 18,
    getMinZoom: () => 5,
    on(events, listener) { mapListeners[events] = listener; return this; },
    zoomIn() { state.zoom = Math.min(18, state.zoom + 1); emit("zoomend"); },
    zoomOut() { state.zoom = Math.max(5, state.zoom - 1); emit("zoomend"); },
    setView(coords, zoom) {
      state.latitude = coords[0]; state.longitude = coords[1]; state.zoom = zoom;
      emit("moveend"); emit("zoomend"); return this;
    },
    fitBounds(bounds) { state.lastBounds = bounds; emit("moveend"); return this; }
  };
  const layer = { on(event, cb) { tileListeners[event] = cb; return this; }, addTo() { return this; } };
  const L = {
    map: () => map,
    tileLayer(url, options) { state.tileUrl = url; state.tileOptions = options; return layer; },
    circleMarker(coords) {
      state.marker = coords;
      return { addTo() { return this; }, bindPopup() { return this; } };
    },
    control: { scale: () => ({ addTo() { return this; } }) }
  };
  const document = {
    getElementById: node,
    querySelector: () => ({ classList: { add: () => {} } })
  };
  const context = {
    window: leafletAvailable ? { L } : { },
    document,
    navigator: { clipboard: { async writeText(value) { state.copied = value; } } }
  };
  runInNewContext(read("script.js"), context, { filename: "script.js" });
  return { state, map, emit, nodes, node, status: node("map-status"), tileListeners };
}

test("real tile service URL is policy-compliant and attribution is present", () => {
  const { state } = setup();
  assert.equal(state.tileUrl, "https://tile.openstreetmap.org/{z}/{x}/{y}.png");
  assert.equal(state.tileOptions.updateWhenIdle, true);
  assert.equal(state.tileOptions.keepBuffer, 1);
  assert.match(state.tileOptions.attribution, /OpenStreetMap/);
  assert.deepEqual(Array.from(state.marker), [31.2304, 121.4737]);
});

test("map zoom and pan always update readout, including non-button zoom", () => {
  const { state, emit, node } = setup();
  assert.equal(node("zoom-level").textContent, "12");
  state.latitude = 31.24413;
  state.longitude = 121.50278;
  state.zoom = 14;
  emit("moveend");
  emit("zoomend");
  assert.match(node("latitude").textContent, /31\.2441/);
  assert.match(node("longitude").textContent, /121\.5028/);
  assert.equal(node("zoom-level").textContent, "14");
  node("zoom-in").click();
  assert.equal(node("zoom-level").textContent, "15");
  node("zoom-out").click();
  assert.equal(node("zoom-level").textContent, "14");
});

test("city reference extent is not mistaken for polygon, and reset returns to center", () => {
  const { node, state } = setup();
  node("city-extent").click();
  assert(state.lastBounds && state.lastBounds.length === 2);
  const bounds = state.lastBounds;
  assert(Math.abs(bounds[0][0] - 30.6667) < .0001);
  assert(Math.abs(bounds[1][1] - 122.2) < .0001);
  node("city-center").click();
  assert.equal(node("zoom-level").textContent, "12");
  assert.equal(node("latitude").textContent, "31.2304° N");
});

test("tile errors are surfaced and success never silently hides known failures", () => {
  const { node, status, tileListeners } = setup();
  tileListeners.loading();
  assert.equal(status.dataset.state, "loading");
  tileListeners.tileerror();
  tileListeners.load();
  assert.equal(status.dataset.state, "warning");
  assert.match(node("map-status-text").textContent, /无法加载/);
  tileListeners.loading();
  tileListeners.load();
  assert.equal(status.dataset.state, "ready");
});

test("missing CDN script produces usable fallback, not a blank unresponsive map", () => {
  const { node, status } = setup({ leafletAvailable: false });
  assert.equal(node("map-fallback").hidden, false);
  assert.equal(status.dataset.state, "error");
  for (const id of ["zoom-in", "zoom-out", "city-center", "city-extent", "copy-coordinates"]) {
    assert.equal(node(id).disabled, true);
  }
});

test("coordinate copy contains explicit center coordinates", async () => {
  const { node, state } = setup();
  await node("copy-coordinates").click();
  assert.equal(state.copied, "31.230400, 121.473700");
});

test("HTML provides accessible controls, official citations, and SRI for remote scripts", () => {
  const html = read("index.html");
  assert.match(html, /lang="zh-CN"/);
  assert.match(html, /<main[\s>]/);
  assert.match(html, /role="status"/);
  assert.match(html, /aria-live="polite"/);
  assert.match(html, /id="map-fallback"/);
  assert.match(html, /sha256-p4NxAoJBhIIN\+hmNHrzRCf9tD\/miZyoHS5obTRR9BMY=/);
  assert.match(html, /sha256-20nQCchB9co0qIjJZRGuk2\/Z9VM\+kNiyxNV1lvTlZBo=/);
  assert.match(html, /shanghai\.tianditu\.gov\.cn/);
  assert.match(html, /english\.shanghai\.gov\.cn/);
  assert.doesNotMatch(html, /Population:|26\.32 million|<script\s+src="http:/);
});

test("Vercel headers allow OSM Referer and do not claim backend health", () => {
  const config = JSON.parse(read("vercel.json"));
  const policy = config.headers[0].headers;
  const referrer = policy.find(h => h.key === "Referrer-Policy");
  assert.equal(referrer.value, "strict-origin-when-cross-origin");
  const csp = policy.find(h => h.key === "Content-Security-Policy");
  assert(csp.value.includes("https://tile.openstreetmap.org"));
  assert(csp.value.includes("https://unpkg.com"));
  const health = JSON.parse(read("health.json"));
  assert.equal(health.artifactPresent, true);
  assert.equal(health.checksExternalTiles, false);
  assert.equal(health.checksBrowserInteraction, false);
  assert.equal(health.checksMapCompliance, false);
});
