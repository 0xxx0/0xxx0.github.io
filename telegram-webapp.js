/* HOUSEBUS — Telegram Mini App compatibility adapter.
 *
 * Smallest possible adapter: it does nothing at all unless the page is actually
 * running inside a Telegram WebView, so the ordinary browser version of every
 * page keeps working byte-for-byte (no third-party request is made outside
 * Telegram).
 *
 * Provides:
 *   - Telegram WebApp SDK initialisation (loaded only when in Telegram)
 *   - theme variables mapped onto CSS custom properties
 *   - expand / fullscreen behaviour
 *   - safe back + close integration
 *   - HOUSEBUS.sendIntent(...) — the typed action-intent return path
 *
 * It deliberately knows nothing about Home Assistant: no HA URL, no token, no
 * service call. Intents are semantic operation names only; the private polling
 * bot verifies identity, policy-checks, maps the canonical object and executes.
 */
(function () {
  "use strict";

  var inTelegram = /(^|[#&?])(tgWebAppData|tgWebAppVersion|tgWebAppPlatform)=/.test(location.hash + location.search)
    || !!(window.Telegram && window.Telegram.WebApp);

  var root = document.documentElement;
  root.setAttribute("data-surface", inTelegram ? "telegram" : "web");

  var HOUSEBUS = window.HOUSEBUS || {};
  window.HOUSEBUS = HOUSEBUS;
  HOUSEBUS.inTelegram = inTelegram;

  function init() {
    var wa = window.Telegram && window.Telegram.WebApp;
    if (!wa) return;
    HOUSEBUS.wa = wa;

    try { wa.ready(); } catch (e) {}
    try { wa.expand(); } catch (e) {}
    try { if (wa.isVersionAtLeast && wa.isVersionAtLeast("8.0")) wa.requestFullscreen && wa.requestFullscreen(); } catch (e) {}
    try { wa.disableVerticalSwipes && wa.disableVerticalSwipes(); } catch (e) {}

    // ---- theme variables -> CSS custom properties
    var tp = wa.themeParams || {};
    var map = {
      "--tg-bg": tp.bg_color, "--tg-secondary-bg": tp.secondary_bg_color,
      "--tg-text": tp.text_color, "--tg-hint": tp.hint_color,
      "--tg-link": tp.link_color, "--tg-button": tp.button_color,
      "--tg-button-text": tp.button_text_color, "--tg-header": tp.header_bg_color
    };
    Object.keys(map).forEach(function (k) { if (map[k]) root.style.setProperty(k, map[k]); });
    root.setAttribute("data-tg-theme", (wa.colorScheme || "dark"));
    try { wa.setHeaderColor && wa.setHeaderColor("bg_color"); } catch (e) {}

    // ---- viewport height (Telegram's viewport is not the browser's)
    function vh() { root.style.setProperty("--tg-vh", (wa.viewportStableHeight || wa.viewportHeight || window.innerHeight) + "px"); }
    vh();
    try { wa.onEvent && wa.onEvent("viewportChanged", vh); } catch (e) { window.addEventListener("resize", vh); }

    // ---- safe back / close
    try {
      if (wa.BackButton) {
        wa.BackButton.onClick(function () {
          if (history.length > 1) history.back(); else wa.close();
        });
      }
    } catch (e) {}
    HOUSEBUS.close = function () { try { wa.close(); } catch (e) {} };

    document.dispatchEvent(new CustomEvent("housebus:ready", { detail: { surface: "telegram" } }));
  }

  /* Typed action intent return path.
   * operation: allowlisted semantic name (e.g. "fan.set", "light.toggle")
   * object:    canonical object id  (e.g. "living.fan")
   * value:     optional value       (e.g. "medium")
   * Never send HA tokens, HA URLs, or raw service calls from here. */
  HOUSEBUS.sendIntent = function (operation, object, value) {
    var payload = { schema: "house-intent/v1", operation: operation, object: object };
    if (value !== undefined && value !== null) payload.value = value;
    var wa = window.Telegram && window.Telegram.WebApp;
    if (!wa || typeof wa.sendData !== "function") {
      return { ok: false, reason: "not-in-telegram" };
    }
    try {
      wa.sendData(JSON.stringify(payload));
      return { ok: true, payload: payload };
    } catch (e) {
      return { ok: false, reason: String(e && e.message || e) };
    }
  };

  if (inTelegram && !(window.Telegram && window.Telegram.WebApp)) {
    // Telegram appends the launch payload to the fragment; load the SDK once.
    var s = document.createElement("script");
    s.src = "https://telegram.org/js/telegram-web-app.js";
    s.onload = init;
    document.head.appendChild(s);
  } else if (inTelegram) {
    init();
  }
})();
