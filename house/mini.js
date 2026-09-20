/* HOUSE mini app — intent panel.
 *
 * The public page shows capability/system state only (never live household
 * telemetry). When the same page runs as a Telegram Mini App it can also return
 * a small typed ACTION INTENT through Telegram: the private polling bot verifies
 * the sender, policy-checks the operation, maps the canonical object, calls Home
 * Assistant, observes the resulting state and returns a receipt.
 *
 * Nothing here holds an HA token, an HA URL, or a raw service call.
 */
(function () {
  "use strict";
  var HB = window.HOUSEBUS || {};
  var panel = document.getElementById("intent-panel");
  if (!panel) return;

  function label(t, sub) {
    var b = document.createElement("button");
    b.type = "button";
    b.className = "intent";
    b.textContent = t;
    if (sub) b.title = sub;
    return b;
  }

  function send(op, obj, value) {
    var r = HB.sendIntent ? HB.sendIntent(op, obj, value) : { ok: false, reason: "adapter-missing" };
    var out = document.getElementById("intent-result");
    if (out) {
      out.textContent = r.ok
        ? "intent sent · " + op + " " + obj + (value ? " → " + value : "") + " · awaiting receipt"
        : "unavailable here (" + r.reason + ")";
    }
  }

  if (!HB.inTelegram) {
    panel.setAttribute("data-state", "browser");
    panel.innerHTML = '<p class="m">Intent channel is available when this page is opened as a Telegram Mini App. '
      + 'The public page never carries house control authority.</p>';
    return;
  }

  panel.setAttribute("data-state", "telegram");
  var row = document.createElement("div");
  row.className = "intent-row";
  var refresh = label("REFRESH STATE", "ask the bot for current state");
  refresh.addEventListener("click", function () { send("house.refresh", "house"); });
  row.appendChild(refresh);
  panel.appendChild(row);

  var note = document.createElement("p");
  note.className = "m";
  note.textContent = "Allowlisted, reversible operations only. Mechanisms (litter, vacuum, locks) are never remotely actuated.";
  panel.appendChild(note);

  var out = document.createElement("p");
  out.id = "intent-result";
  out.className = "m";
  panel.appendChild(out);
})();
