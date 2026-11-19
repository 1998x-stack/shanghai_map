import { setTimeout as sleep } from "node:timers/promises";
const baseUrl = new URL(process.env.SMOKE_BASE_URL || "http://127.0.0.1:8765/");
if (!["localhost", "127.0.0.1"].includes(baseUrl.hostname)) {
  throw new Error("Smoke test is local-only; no automated bulk map requests to third-party providers.");
}
const routes = [
  ["/", "text/html"],
  ["/index.html", "text/html"],
  ["/script.js", "javascript"],
  ["/style.css", "text/css"],
  ["/health.json", "application/json"]
];
let ready = false;
for (let attempt = 0; attempt < 35; attempt++) {
  try {
    const res = await fetch(new URL("/health.json", baseUrl), { signal: AbortSignal.timeout(1500) });
    if (res.status === 200) { ready = true; break; }
  } catch { /* server may still be starting */ }
  await sleep(200);
}
if (!ready) throw new Error("Local static server did not become ready");
let failures = 0;
for (const [path, type] of routes) {
  try {
    const response = await fetch(new URL(path, baseUrl), { signal: AbortSignal.timeout(5000), redirect: "manual" });
    const contentType = response.headers.get("content-type") || "";
    if (response.status !== 200 || !contentType.includes(type)) throw new Error("HTTP " + response.status + " " + contentType);
    if (path === "/health.json") {
      const json = await response.json();
      if (json.scope !== "static-build-only" || json.checksExternalTiles !== false) {
        throw new Error("static probe incorrectly asserts tile availability");
      }
    } else if (path === "/") {
      const html = await response.text();
      if (!html.includes('id="map"') || !html.includes("OpenStreetMap")) {
        throw new Error("main HTML missing expected map sections");
      }
    }
    console.log("PASS", path, response.status);
  } catch (e) {
    failures++;
    console.error("FAIL", path, e.message);
  }
}
if (failures) process.exitCode = 1;
else console.log("PASS: static HTTP smoke test (" + routes.length + " paths). No map tiles fetched.");
