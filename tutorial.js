/* YDS365 Kelime Çalışması — ilk açılışta küçük kullanım turu.
   Gerçek arayüz elemanlarını "hayali dokunma" animasyonuyla işaret eder.
   Bir kez gösterilir (localStorage), her koşulda "yds:tutorialdone" olayını yayınlar
   ki placement.js seviye belirleme davetini ondan sonra göstersin. */
(function () {
  "use strict";

  // Sadece telefon appinde (Capacitor native) çalışır — web'de klasik arayüz zaten
  // görünür durumda, ayrı bir kullanım turuna gerek yok.
  var C = window.Capacitor;
  if (!C || typeof C.isNativePlatform !== "function" || !C.isNativePlatform()) return;

  var LS_SEEN = "yds.tutorialSeen.v1";

  var STEPS = [
    { sel: "#flashcard", text: "Kelimenin anlamını görmek için karta dokun." },
    { sel: ".card-stage-row", text: "Ok butonlarıyla kelimeler arasında geç." },
    { sel: "#cardHintBtn", text: "Zorlanırsan ipucu iste." },
    { sel: ".tabs", text: "Test çöz ya da tüm kelimeleri Liste'de gör." },
    { sel: ".progress", text: "Ne kadar ilerlediğini burada takip edebilirsin." }
  ];

  var overlay = null, spot = null, tap = null, caption = null;
  var activeSteps = [];
  var stepIndex = 0;

  document.addEventListener("DOMContentLoaded", function () {
    var retake = document.getElementById("tutorialRetake");
    if (retake) retake.addEventListener("click", function () {
      if (overlay) return;
      var kartTab = document.querySelector('.tab[data-view="card"]');
      if (kartTab) kartTab.click();
      setTimeout(function () { build(); start(); }, 250);
    });
    waitForAuth(function () {
      var seen = false;
      try { seen = localStorage.getItem(LS_SEEN) === "1"; } catch (e) {}
      var cardView = document.getElementById("view-card");
      if (seen || !cardView || !cardView.classList.contains("is-active")) {
        finish(false);
        return;
      }
      // Kelimeler henüz gelmediyse kart boş/gizli olabilir (yanlış konumda
      // spotlight göstermeyelim) — gerçek kart içeriği render olana kadar bekle.
      waitForWords(function () {
        setTimeout(function () { build(); start(); }, 350);
      });
    });
  });

  function waitForAuth(cb) {
    if (!document.getElementById("authGate")) { cb(); return; }
    document.addEventListener("yds:authok", cb, { once: true });
  }

  function waitForWords(cb) {
    if (window.YDSWords && window.YDSWords.length) { cb(); return; }
    document.addEventListener("yds:words", cb, { once: true });
  }

  function build() {
    overlay = document.createElement("div");
    overlay.className = "tutorial-overlay";
    spot = document.createElement("div");
    spot.className = "tutorial-spot";
    tap = document.createElement("div");
    tap.className = "tutorial-tap";
    caption = document.createElement("div");
    caption.className = "tutorial-caption";
    overlay.appendChild(spot);
    overlay.appendChild(tap);
    overlay.appendChild(caption);
    overlay.addEventListener("click", function (e) { if (e.target === overlay) next(); });
    document.body.appendChild(overlay);
    window.addEventListener("resize", onResize);
  }

  function onResize() { if (overlay) renderStep(); }

  function start() {
    activeSteps = STEPS.filter(function (s) { return !!document.querySelector(s.sel); });
    if (!activeSteps.length) { finish(true); return; }
    stepIndex = 0;
    renderStep();
  }

  function renderStep() {
    var s = activeSteps[stepIndex];
    var el = s && document.querySelector(s.sel);
    if (!s || !el) { next(); return; }

    var r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) { next(); return; } // gizli/render olmamış eleman — atla
    var pad = 8;
    spot.style.left = (r.left - pad) + "px";
    spot.style.top = (r.top - pad) + "px";
    spot.style.width = (r.width + pad * 2) + "px";
    spot.style.height = (r.height + pad * 2) + "px";
    tap.style.left = (r.left + r.width / 2) + "px";
    tap.style.top = (r.top + r.height / 2) + "px";

    caption.innerHTML = "";
    var p = document.createElement("p");
    p.textContent = s.text;
    var row = document.createElement("div");
    row.className = "tutorial-row";
    var skip = document.createElement("button");
    skip.type = "button";
    skip.className = "tutorial-skip";
    skip.textContent = "Atla";
    skip.addEventListener("click", function () { finish(true); });
    var go = document.createElement("button");
    go.type = "button";
    go.className = "tutorial-next";
    go.textContent = stepIndex === activeSteps.length - 1 ? "Bitti" : "İleri";
    go.addEventListener("click", next);
    row.appendChild(skip);
    row.appendChild(go);
    caption.appendChild(p);
    caption.appendChild(row);

    var capTop = r.bottom + 16;
    if (capTop + 150 > window.innerHeight) capTop = Math.max(16, r.top - 150);
    caption.style.top = capTop + "px";
  }

  function next() {
    stepIndex++;
    if (stepIndex >= activeSteps.length) { finish(true); return; }
    renderStep();
  }

  function finish(mark) {
    if (mark) { try { localStorage.setItem(LS_SEEN, "1"); } catch (e) {} }
    window.removeEventListener("resize", onResize);
    if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
    overlay = null;
    document.dispatchEvent(new CustomEvent("yds:tutorialdone"));
  }
})();
