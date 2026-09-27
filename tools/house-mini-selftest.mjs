/* HOUSE / FIELD — Telegram Mini App intent channel self-test.
 *
 * Loads the real telegram-webapp.js and house/mini.js into a minimal DOM sandbox
 * and proves, without a browser and without Telegram:
 *
 *   1. browser case  — adapter is INERT: no third-party SDK request, inTelegram=false,
 *                      sendIntent refuses with reason "not-in-telegram"
 *   2. telegram case — adapter activates, HOUSEBUS.sendIntent returns a house-intent/v1
 *                      payload through WebApp.sendData, and the panel renders + wiring
 *                      calls the adapter with a semantic op only
 *   3. wiring        — /house/ actually loads both files and carries the panel element
 *   4. boundary      — no HA URL, token, service call or private address in either file
 *
 * Usage: node tools/house-mini-selftest.mjs
 */
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
let pass = 0, fail = 0;
const ok = (name, cond, detail = "") => {
  if (cond) { pass++; console.log("  PASS  " + name); }
  else { fail++; console.log("  FAIL  " + name + (detail ? "  — " + detail : "")); }
};

/* ---------- minimal DOM ---------- */
function el(tag) {
  return {
    tagName: tag, style: { setProperty(k, v) { this[k] = v; } }, attrs: {}, kids: [], handlers: {},
    className: "", textContent: "", title: "", type: "",
    setAttribute(k, v) { this.attrs[k] = v; },
    getAttribute(k) { return this.attrs[k]; },
    appendChild(c) { this.kids.push(c); return c; },
    addEventListener(t, fn) { (this.handlers[t] = this.handlers[t] || []).push(fn); },
    click() { (this.handlers.click || []).forEach((f) => f({ target: this })); },
    querySelector() { return null; },
    get innerHTML() { return this._h || ""; },
    set innerHTML(v) { this._h = v; },
  };
}

function sandbox({ telegram, hash }) {
  const nodes = { "intent-panel": el("section"), "intent-result": el("p") };
  const document = {
    documentElement: el("html"),
    head: el("head"),
    body: el("body"),
    _scripts: [],
    createElement: el,
    createElementNS: (_, t) => el(t),
    getElementById: (id) => nodes[id] || null,
    querySelector: () => null,
    querySelectorAll: () => [],
    addEventListener() {},
    dispatchEvent(e) { this._last = e; },
  };
  const window = { innerHeight: 800, addEventListener() {} };
  if (telegram) window.Telegram = telegram;
  const ctx = {
    window, document, console,
    location: { hash: hash || "", search: "" },
    history: { length: 1, back() {} },
    CustomEvent: class { constructor(n, d) { this.type = n; this.detail = d; } },
    TextEncoder,
    setTimeout,
  };
  ctx.globalThis = ctx;
  window.HOUSEBUS = undefined;
  return { ctx, nodes, document };
}

const run = (ctx, file) =>
  vm.createContext(Object.assign(ctx, { __file: file })) &&
  vm.runInContext(fs.readFileSync(path.join(ROOT, file), "utf8"), ctx, { filename: file });

/* ---------- 1. browser case: inert ---------- */
console.log("\n[browser / not in Telegram]");
{
  const { ctx, nodes, document } = sandbox({ telegram: null, hash: "" });
  run(ctx, "telegram-webapp.js");
  const hb = ctx.window.HOUSEBUS;
  ok("HOUSEBUS exists", !!hb);
  ok("inTelegram = false", hb.inTelegram === false);
  ok("no third-party SDK <script> injected", document.head.kids.length === 0,
    "injected " + document.head.kids.length);
  ok("documentElement marked data-surface=web", document.documentElement.getAttribute("data-surface") === "web");
  const r = hb.sendIntent("fan.set", "study.fan", "medium");
  ok("sendIntent refuses outside Telegram", r.ok === false && r.reason === "not-in-telegram", JSON.stringify(r));

  run(ctx, "house/mini.js");
  const panel = nodes["intent-panel"];
  ok("panel marked data-state=browser", panel.getAttribute("data-state") === "browser");
  ok("panel says the channel is unavailable here", /unavailable|Mini App/i.test(panel.innerHTML));
}

/* ---------- 2. telegram case: works ---------- */
console.log("\n[telegram mini app]");
{
  let sent = null;
  const wa = {
    ready() { this.readyCalled = true; }, expand() { this.expandCalled = true; },
    viewportStableHeight: 812, colorScheme: "dark", themeParams: { bg_color: "#07090b" },
    isVersionAtLeast: () => true, disableVerticalSwipes() {}, setHeaderColor() {},
    onEvent() {}, close() {},
    sendData(d) { sent = d; },
  };
  const { ctx, nodes, document } = sandbox({ telegram: { WebApp: wa }, hash: "#tgWebAppData=x&tgWebAppVersion=8.0" });
  run(ctx, "telegram-webapp.js");
  const hb = ctx.window.HOUSEBUS;
  ok("inTelegram = true", hb.inTelegram === true);
  ok("SDK ready()/expand() called", wa.readyCalled === true && wa.expandCalled === true);
  ok("data-surface=telegram", document.documentElement.getAttribute("data-surface") === "telegram");
  ok("theme mapped to CSS var", document.documentElement.style["--tg-bg"] === "#07090b",
    JSON.stringify(document.documentElement.style));

  const r = hb.sendIntent("fan.set", "study.fan", "medium");
  ok("sendIntent ok", r.ok === true, JSON.stringify(r));
  const payload = JSON.parse(sent);
  ok("payload schema house-intent/v1", payload.schema === "house-intent/v1");
  ok("payload carries semantic op only", payload.operation === "fan.set" && payload.object === "study.fan" && payload.value === "medium");
  ok("payload carries no HA url/token/service",
    !/http|token|homeassistant|service/i.test(sent), sent);

  run(ctx, "house/mini.js");
  const panel = nodes["intent-panel"];
  ok("panel marked data-state=telegram", panel.getAttribute("data-state") === "telegram");
  const btn = panel.kids.find((k) => k.tagName === "div")?.kids?.find((k) => k.tagName === "button");
  ok("panel renders an action button", !!btn, "children=" + panel.kids.length);
  sent = null;
  if (btn) btn.click();
  const out = JSON.parse(sent || "null");
  ok("button wiring emits a semantic intent", out && out.schema === "house-intent/v1" && out.operation === "house.refresh",
    JSON.stringify(out));
  ok("result line reports the send", /intent sent/.test(nodes["intent-result"]?.textContent || ""),
    nodes["intent-result"]?.textContent);
}

/* ---------- 3. wiring on the canonical root ---------- */
console.log("\n[/house/ wiring]");
{
  const html = fs.readFileSync(path.join(ROOT, "house/index.html"), "utf8");
  ok("loads /telegram-webapp.js", html.includes('src="/telegram-webapp.js"'));
  ok("loads ./mini.js", html.includes('src="./mini.js"'));
  ok("has #intent-panel", html.includes('id="intent-panel"'));
  ok("canonical root, not a second UI", !html.includes("/house/spatial/index.html"));
}

/* ---------- 4. boundary ---------- */
console.log("\n[boundary]");
{
  const files = ["telegram-webapp.js", "house/mini.js", "house/index.html"];
  const bad = [/192\.168\./, /10\.\d+\.\d+\.\d+/, /Bearer\s+[A-Za-z0-9]/, /hass\.io/, /eyJ[A-Za-z0-9_-]{20,}/,
               /homeassistant\.local/, /\/api\/services/];
  let hits = [];
  for (const f of files) {
    const t = fs.readFileSync(path.join(ROOT, f), "utf8");
    for (const re of bad) if (re.test(t)) hits.push(f + " ~ " + re);
  }
  ok("no private address / token / HA service call in changed files", hits.length === 0, hits.join("; "));
  const tg = fs.readFileSync(path.join(ROOT, "telegram-webapp.js"), "utf8");
  ok("third-party SDK fetched only inside Telegram",
    /if \(inTelegram && !\(window\.Telegram/.test(tg));
}

console.log(`\n${fail === 0 ? "PASS" : "FAIL"} — ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
