(() => {
  "use strict";

  // Approximate reference center; NOT a surveyed administrative centroid.
  // Shanghai municipal geographic extent:
  // https://english.shanghai.gov.cn/en-Overview/20231209/705180b43f794c1ca43f4d1ddaa049a2.html
  const CITY_CENTER = Object.freeze([31.2304, 121.4737]);
  const CITY_BOUNDS = Object.freeze([[30 + 40 / 60, 120 + 51 / 60], [31 + 53 / 60, 122 + 12 / 60]]);
  const MIN_ZOOM = 5;
  const MAX_ZOOM = 18;

  const $ = (id) => document.getElementById(id);
  const status = $("map-status");
  const statusText = $("map-status-text");
  const fallback = $("map-fallback");

  function setStatus(state, message) {
    if (!status || !statusText) return;
    status.dataset.state = state;
    statusText.textContent = message;
  }

  function setUnavailable(message) {
    setStatus("error", message);
    if (fallback) fallback.hidden = false;
    document.querySelector(".map-frame")?.classList.add("has-error");
    for (const id of ["zoom-in", "zoom-out", "city-center", "city-extent", "copy-coordinates"]) {
      const button = $(id);
      if (button) button.disabled = true;
    }
  }

  if (!window.L || typeof window.L.map !== "function") {
    setUnavailable("Leaflet 地图库加载失败；可前往官方地图服务。");
    return;
  }

  let map;
  try {
    map = window.L.map("map", {
      center: CITY_CENTER,
      zoom: 12,
      minZoom: MIN_ZOOM,
      maxZoom: MAX_ZOOM,
      zoomControl: false,
      attributionControl: true,
      keyboard: true,
      scrollWheelZoom: true,
      preferCanvas: false
    });
  } catch {
    setUnavailable("无法初始化地图，请检查浏览器环境。");
    return;
  }

  let tileErrors = 0;
  const tiles = window.L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
    minZoom: MIN_ZOOM,
    maxZoom: MAX_ZOOM,
    maxNativeZoom: 18,
    keepBuffer: 1,
    updateWhenIdle: true
    // Normal browser caching applies. Never bulk-prefetch OSMF tiles.
    // Do not set restrictive referrer policy or Cache-Control: no-cache.
  });
  tiles.on("loading", () => {
    tileErrors = 0;
    setStatus("loading", "正在加载 OpenStreetMap 底图…");
  });
  tiles.on("tileerror", () => {
    tileErrors += 1;
    setStatus("warning", "部分地图瓦片加载失败。可继续使用或查看官方地图。");
  });
  tiles.on("load", () => {
    if (tileErrors > 0) {
      setStatus("warning", "部分瓦片无法加载；底图服务未完全可用。");
    } else {
      setStatus("ready", "底图加载完成 · 仅供地理参考");
    }
  });
  tiles.addTo(map);

  window.L.control.scale({ imperial: false, maxWidth: 110, position: "bottomleft" }).addTo(map);
  window.L.circleMarker(CITY_CENTER, {
    radius: 8,
    color: "#fefefe",
    weight: 3,
    fillColor: "#236d5b",
    fillOpacity: 0.97
  })
    .addTo(map)
    .bindPopup('<div class="popup-title">上海参考中心点</div><div class="popup-note">31.2304° N，121.4737° E<br>示意定位点，非行政中心或精密测绘坐标。</div>');

  function updateView() {
    const center = map.getCenter();
    const latitude = $("latitude");
    const longitude = $("longitude");
    const zoom = $("zoom-level");
    if (latitude) latitude.textContent = center.lat.toFixed(4) + "° " + (center.lat >= 0 ? "N" : "S");
    if (longitude) longitude.textContent = Math.abs(center.lng).toFixed(4) + "° " + (center.lng >= 0 ? "E" : "W");
    if (zoom) zoom.textContent = String(map.getZoom());
    if ($("zoom-in")) $("zoom-in").disabled = map.getZoom() >= map.getMaxZoom();
    if ($("zoom-out")) $("zoom-out").disabled = map.getZoom() <= map.getMinZoom();
  }

  map.on("moveend zoomend", updateView);
  updateView();

  $("zoom-in")?.addEventListener("click", () => map.zoomIn());
  $("zoom-out")?.addEventListener("click", () => map.zoomOut());
  $("city-center")?.addEventListener("click", () => {
    map.setView(CITY_CENTER, 12, { animate: false });
    setStatus("ready", "已返回上海参考中心视图");
  });
  $("city-extent")?.addEventListener("click", () => {
    map.fitBounds(CITY_BOUNDS, { padding: [25, 25], animate: false });
    setStatus("ready", "已显示上海经纬度参考范围（非法定行政边界）");
  });

  $("copy-coordinates")?.addEventListener("click", async () => {
    const center = map.getCenter();
    const coordinates = center.lat.toFixed(6) + ", " + center.lng.toFixed(6);
    try {
      if (!navigator.clipboard?.writeText) throw new Error("clipboard unavailable");
      await navigator.clipboard.writeText(coordinates);
      setStatus("ready", "已复制 WGS84 参考坐标：" + coordinates);
    } catch {
      setStatus("warning", "浏览器未授予剪贴板权限。请手动复制左侧坐标。");
    }
  });
})();
