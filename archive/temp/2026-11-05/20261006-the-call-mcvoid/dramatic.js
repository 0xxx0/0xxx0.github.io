/* dramatic.js — the-call v2 module (mahshroom, donor)
 * "hear it" (play/pause) + "save it" (download) per matter card.
 * Audio is pre-generated: dramatic/<card-id>.mp3. Never mic, never upload.
 * API: window.MODULES.push({ id, onMatter(card, el), onEnd(el) })
 */
(function () {
  "use strict";

  var MODULE_ID = "dramatic";
  var MANIFEST_URL = "dramatic/manifest.json";
  var AUDIO_DIR = "dramatic/";

  var manifest = null;      // array of {id, text_snippet, file, seconds, who}
  var manifestTried = false;
  var pending = [];         // [{card, el}] queued until the manifest lands
  var counter = 0;          // onMatter order = deck order fallback
  var currentAudio = null;  // one reading at a time

  function loadManifest() {
    if (manifestTried) return;
    manifestTried = true;
    if (typeof fetch !== "function") return;
    fetch(MANIFEST_URL)
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        if (data && data.length) manifest = data;
        var queue = pending;
        pending = [];
        queue.forEach(function (job) { attach(job.card, job.el); });
      })
      .catch(function () { /* file:// or missing — fall back to id paths */ });
  }

  function stripTags(html) {
    var d = document.createElement("div");
    d.innerHTML = html || "";
    return (d.textContent || "").replace(/\s+/g, " ").trim();
  }

  // Match a card to a manifest entry: id → who → deck order → text prefix.
  function findEntry(card, index) {
    if (!manifest) return null;
    var i, e;
    if (card && card.id != null) {
      var id = String(card.id);
      for (i = 0; i < manifest.length; i++) {
        if (String(manifest[i].id) === id) return manifest[i];
      }
    }
    if (card && card.who) {
      for (i = 0; i < manifest.length; i++) {
        if (manifest[i].who === card.who) return manifest[i];
      }
    }
    if (manifest[index]) return manifest[index];
    if (card && card.text) {
      var plain = stripTags(card.text).slice(0, 60);
      for (i = 0; i < manifest.length; i++) {
        e = manifest[i];
        if (e.text_snippet && e.text_snippet.indexOf(plain) === 0) return e;
      }
    }
    return null;
  }

  function srcFor(card, index) {
    var e = findEntry(card, index);
    if (e && e.file) return e.file;
    var id = e ? e.id : (card && card.id != null ? String(card.id) : (index < 10 ? "0" + index : String(index)));
    return AUDIO_DIR + id + ".mp3";
  }

  function stopCurrent() {
    if (currentAudio) {
      currentAudio.pause();
      try { currentAudio.currentTime = 0; } catch (err) { /* ignore */ }
      if (currentAudio._btn) currentAudio._btn.textContent = "hear it";
      currentAudio = null;
    }
  }

  function attach(card, el) {
    if (!el || el.querySelector(".dramatic-controls")) return;
    var index = counter++;
    var src = srcFor(card, index);

    var bar = document.createElement("div");
    bar.className = "dramatic-controls";

    var hear = document.createElement("button");
    hear.type = "button";
    hear.className = "dramatic-hear";
    hear.textContent = "hear it";

    var save = document.createElement("a");
    save.className = "dramatic-save";
    save.textContent = "save it";
    save.href = src;
    save.setAttribute("download", src.split("/").pop());

    var audio = new Audio(src);
    audio.preload = "none";
    hear.addEventListener("click", function () {
      if (currentAudio === audio && !audio.paused) {
        audio.pause();
        hear.textContent = "hear it";
        return;
      }
      stopCurrent();
      currentAudio = audio;
      audio._btn = hear;
      audio.addEventListener("ended", function () {
        hear.textContent = "hear it";
        if (currentAudio === audio) currentAudio = null;
      }, { once: true });
      audio.play().then(function () {
        hear.textContent = "pause it";
      }).catch(function () {
        hear.textContent = "hear it"; /* autoplay blocked or file missing */
      });
    });

    bar.appendChild(hear);
    bar.appendChild(save);
    el.appendChild(bar);
  }

  var module = {
    id: MODULE_ID,
    onMatter: function (card, el) {
      if (!manifestTried) loadManifest();
      if (manifest) attach(card, el);
      else pending.push({ card: card, el: el });
    },
    onEnd: function (el) {
      stopCurrent();
    }
  };

  window.MODULES = window.MODULES || [];
  window.MODULES.push(module);
})();
