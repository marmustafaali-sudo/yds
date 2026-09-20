/* YDS365 Kelime Çalışması — "Bugün" kartı: günlük hedef + akıllı tekrar (Leitner) + hatırlatma bildirimi.
   Kart ekranının üstünde #dailyCard içine render eder. app.js "yds:studied" olayını dinler. */
(function () {
  "use strict";

  var LS_GOAL  = "yds.dailyGoal.v1";  // number
  var LS_LOG   = "yds.dailyLog.v1";   // { date, ids: [] }
  var LS_SRS   = "yds.srs.v1";        // { wordId: { box, due } }
  var LS_DONE  = "yds.doneDays.v1";   // ["YYYY-MM-DD", ...]  (ileride streak takvimi için)
  var LS_NOTIF = "yds.notif.v1";      // { enabled, time }
  var LS_EXAM_TYPE = "yds.examType.v1"; // "YDS" | "YOKDIL"

  var DEFAULT_GOAL = 15;
  var BOX_DAYS = [0, 1, 3, 7, 16, 35]; // index = kutu (1..5); son kutuda "mezun" olur
  // ÖSYM'nin resmi 2026 sınav takviminden alınmıştır (osym.gov.tr, 2026-09-20).
  // Tarihler her yıl ÖSYM yeni takvimi açıkladığında elle güncellenmeli — sınav
  // takvimini gerçek zamanlı olarak osym.gov.tr'den çekmek istemci tarafında
  // mümkün değil (site tarayıcıdan çapraz-kaynak isteklere izin vermiyor).
  var EXAM_CALENDAR = {
    YDS: ["2026-04-05", "2026-11-22"],
    YOKDIL: ["2026-03-08", "2026-08-02"]
  };
  var NOTIF_ID = 1001;

  var host = null;
  var words = [];
  var review = null; // { list, i, revealed }
  var openPopup = null; // null | "review" | "notif" — sağ üstteki yuvarlak ikonların popup'ı

  document.addEventListener("DOMContentLoaded", function () {
    host = document.getElementById("dailyCard");
    if (!host) return;
    getLog(); // gün değiştiyse sıfırla
    if (window.YDSWords && window.YDSWords.length) words = window.YDSWords;
    document.addEventListener("yds:words", function () {
      words = window.YDSWords || [];
      render();
    });
    document.addEventListener("yds:studied", onStudied);
    initNotif();
    render();
  });

  /* ---------- tarih / depolama yardımcıları ---------- */

  function todayStr() {
    var d = new Date();
    return iso(d);
  }
  function iso(d) {
    var m = d.getMonth() + 1, day = d.getDate();
    return d.getFullYear() + "-" + (m < 10 ? "0" : "") + m + "-" + (day < 10 ? "0" : "") + day;
  }
  function addDays(isoStr, n) {
    var d = new Date(isoStr + "T00:00:00");
    d.setDate(d.getDate() + n);
    return iso(d);
  }
  function load(k, f) {
    try { var r = localStorage.getItem(k); return r ? JSON.parse(r) : f; } catch (e) { return f; }
  }
  function save(k, v) {
    try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {}
  }

  function getGoal() {
    var g = load(LS_GOAL, DEFAULT_GOAL);
    return (typeof g === "number" && g > 0) ? g : DEFAULT_GOAL;
  }

  /* ---------- sınav geri sayımı ---------- */

  function getExamType() {
    var t = load(LS_EXAM_TYPE, "YDS");
    return EXAM_CALENDAR[t] ? t : "YDS";
  }
  function examTypeLabel(t) { return t === "YOKDIL" ? "YÖKDİL" : "YDS"; }
  function getExam() {
    var dates = EXAM_CALENDAR[getExamType()];
    var today = todayStr();
    for (var i = 0; i < dates.length; i++) {
      if (dates[i] >= today) return dates[i];
    }
    return dates[dates.length - 1]; // yılın tüm oturumları geçtiyse sonuncusu "geçti" olarak gösterilir
  }
  function daysToExam(isoStr) {
    var now = new Date(); now.setHours(0, 0, 0, 0);
    var ex = new Date(isoStr + "T00:00:00");
    return Math.round((ex - now) / 86400000);
  }
  function fmtLongDate(isoStr) {
    try {
      return new Date(isoStr + "T00:00:00").toLocaleDateString("tr-TR",
        { day: "numeric", month: "long", year: "numeric" });
    } catch (e) { return isoStr; }
  }
  var headerTypesBound = false;
  function bindHeaderExamTypes() {
    if (headerTypesBound) return;
    var wrap = document.getElementById("headerExamTypes");
    if (!wrap) return;
    headerTypesBound = true;
    wrap.querySelectorAll(".header-exam-type").forEach(function (b) {
      b.addEventListener("click", function () {
        save(LS_EXAM_TYPE, b.getAttribute("data-type"));
        render();
      });
    });
  }

  // <=10 gün kalınca her ekranda header altında sabit, kırmızı yanıp sönen büyük banner;
  // daha uzun vadede header içinde küçük, sakin bir geri sayım satırı gösterilir. Sınav
  // türü (YDS/YÖKDİL) seçimi de "Bugün" kartını şişirmemek için header'da yaşıyor.
  var BANNER_THRESHOLD = 10;
  function renderExamBanner() {
    var wrap = document.getElementById("examBanner");
    var smallEl = document.getElementById("examHeaderCountdown");
    if (!wrap) return;
    bindHeaderExamTypes();
    var exam = getExam();
    var left = daysToExam(exam);
    var type = getExamType();

    var typesEl = document.getElementById("headerExamTypes");
    if (typesEl) {
      typesEl.hidden = false;
      typesEl.querySelectorAll(".header-exam-type").forEach(function (b) {
        b.classList.toggle("is-active", b.getAttribute("data-type") === type);
      });
    }
    type = examTypeLabel(type);

    if (left >= 0 && left <= BANNER_THRESHOLD) {
      var numEl = document.getElementById("examBannerNum");
      var labelEl = document.getElementById("examBannerLabel");
      if (left === 0) {
        numEl.textContent = "Bugün";
        labelEl.textContent = "sınav günü — başarılar!";
      } else {
        numEl.textContent = String(left);
        labelEl.textContent = "gün kaldı";
      }
      document.getElementById("examBannerSub").textContent = type + " · " + fmtLongDate(exam);
      wrap.hidden = false;
      if (smallEl) smallEl.hidden = true;
    } else {
      wrap.hidden = true;
      if (smallEl) {
        if (left > BANNER_THRESHOLD) {
          smallEl.textContent = type + " sınavına " + left + " gün kaldı";
          smallEl.hidden = false;
        } else {
          smallEl.hidden = true; // tüm oturumlar geçti
        }
      }
    }
  }
  function getLog() {
    var l = load(LS_LOG, null);
    if (!l || l.date !== todayStr() || !Array.isArray(l.ids)) {
      l = { date: todayStr(), ids: [] };
      save(LS_LOG, l);
    }
    return l;
  }
  function markDayDone() {
    var done = load(LS_DONE, []);
    if (!Array.isArray(done)) done = [];
    if (done.indexOf(todayStr()) === -1) { done.push(todayStr()); save(LS_DONE, done); }
  }
  function bumpGoal(wordId) {
    var log = getLog();
    if (log.ids.indexOf(wordId) === -1) {
      log.ids.push(wordId);
      save(LS_LOG, log);
      if (log.ids.length >= getGoal()) markDayDone();
    }
  }

  function findWord(id) {
    id = +id;
    for (var i = 0; i < words.length; i++) if (words[i].id === id) return words[i];
    return null;
  }
  function dueList() {
    var srs = load(LS_SRS, {}) || {};
    var t = todayStr();
    return Object.keys(srs)
      .filter(function (id) { return srs[id] && srs[id].due <= t; })
      .map(findWord)
      .filter(Boolean);
  }

  /* ---------- olay: bir kelime çalışıldı ---------- */

  function onStudied(e) {
    var d = (e && e.detail) || {};
    if (d.wordId == null) return;

    bumpGoal(d.wordId);

    if (d.source === "review") { render(); return; } // SRS'i gradeReview zaten işledi

    if (d.grade) {                                    // kart: 3 kademeli değerlendirme
      applyGrade(d.wordId, d.grade);
      render();
      return;
    }

    // eski sinyaller (liste / test): known / correct
    var wrong = (d.known === false) || (d.correct === false);
    var right = (d.known === true) || (d.correct === true);
    var srs = load(LS_SRS, {}) || {};
    var cur = srs[d.wordId];

    if (wrong) {
      srs[d.wordId] = { box: 1, due: addDays(todayStr(), 1) };
      save(LS_SRS, srs);
    } else if (right && cur) {
      advance(srs, d.wordId, cur.box);
      save(LS_SRS, srs);
    }
    render();
  }

  // Unuttum -> yarın · Zor -> kısa aralık, aynı kutu · Kolay -> bir sonraki kutu
  function applyGrade(id, grade) {
    var srs = load(LS_SRS, {}) || {};
    var cur = srs[id] || { box: 1 };
    if (grade === "again") {
      srs[id] = { box: 1, due: addDays(todayStr(), 1) };
    } else if (grade === "hard") {
      var b = Math.max(1, cur.box || 1);
      var full = BOX_DAYS[Math.min(b, BOX_DAYS.length - 1)] || 1;
      srs[id] = { box: b, due: addDays(todayStr(), Math.max(2, Math.round(full / 2))) };
    } else {
      advance(srs, id, cur.box || 1);
    }
    save(LS_SRS, srs);
  }

  function advance(srs, id, box) {
    var nb = box + 1;
    if (nb >= BOX_DAYS.length - 1) { delete srs[id]; }          // mezun
    else { srs[id] = { box: nb, due: addDays(todayStr(), BOX_DAYS[nb]) }; }
  }

  /* ---------- render: ana kart ---------- */

  function render() {
    renderExamBanner();
    if (!host) return;
    if (review) { renderReview(); return; }

    var goal = getGoal();
    var n = getLog().ids.length;
    var pct = Math.min(100, Math.round(n / goal * 100));
    var due = dueList();

    host.textContent = "";

    var head = div("daily-head");
    head.appendChild(span("daily-title", "Bugün"));
    head.appendChild(quickIcons(due));
    host.appendChild(head);

    var goalRow = div("daily-goal");
    var top = div("daily-goal-top");
    top.appendChild(span("daily-goal-label",
      "Günlük hedef  " + n + " / " + goal + " kelime" + (n >= goal ? "  ✓" : "")));
    var step = div("daily-stepper");
    var minus = btn("daily-step", "−");
    minus.setAttribute("aria-label", "Hedefi azalt");
    minus.addEventListener("click", function () { setGoal(goal - 5); });
    var plus = btn("daily-step", "+");
    plus.setAttribute("aria-label", "Hedefi artır");
    plus.addEventListener("click", function () { setGoal(goal + 5); });
    step.appendChild(minus);
    step.appendChild(plus);
    top.appendChild(step);
    goalRow.appendChild(top);

    var track = div("daily-bar");
    var fill = div("daily-bar-fill" + (n >= goal ? " is-done" : ""));
    fill.style.width = pct + "%";
    track.appendChild(fill);
    goalRow.appendChild(track);
    host.appendChild(goalRow);

    if (openPopup === "review") host.appendChild(reviewPopup(due));
    else if (openPopup === "notif" && isNative()) host.appendChild(notifPopup());
  }

  /* ---------- sağ üstteki yuvarlak ikonlar + popup'ları (Tekrar / Hatırlatma) ---------- */

  var ICON_REPEAT =
    '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
    '<path d="M17 2.1l4 4-4 4"></path><path d="M3 12.2v-2a4 4 0 0 1 4-4h12.8"></path>' +
    '<path d="M7 21.9l-4-4 4-4"></path><path d="M21 11.8v2a4 4 0 0 1-4 4H4.2"></path></svg>';
  var ICON_BELL =
    '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
    '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>';

  function togglePopup(name) {
    openPopup = (openPopup === name) ? null : name;
    render();
  }

  function quickIcons(due) {
    var wrap = div("daily-quick");

    var revBtn = btn("daily-quick-icon daily-quick-icon-review" + (openPopup === "review" ? " is-open" : ""), "");
    revBtn.setAttribute("aria-label", "Tekrar");
    revBtn.innerHTML = ICON_REPEAT;
    if (due.length) revBtn.appendChild(span("daily-quick-badge", String(due.length)));
    revBtn.addEventListener("click", function () { togglePopup("review"); });
    wrap.appendChild(revBtn);

    if (isNative()) {
      var n = getNotif();
      var notifBtn = btn("daily-quick-icon daily-quick-icon-notif" +
        (openPopup === "notif" ? " is-open" : "") + (n.enabled ? " is-on" : ""), "");
      notifBtn.setAttribute("aria-label", "Günlük hatırlatma");
      notifBtn.innerHTML = ICON_BELL;
      notifBtn.addEventListener("click", function () { togglePopup("notif"); });
      wrap.appendChild(notifBtn);
    }

    return wrap;
  }

  function popupShell(title) {
    var pop = div("daily-popup");
    var head = div("daily-popup-head");
    head.appendChild(span("daily-popup-title", title));
    var x = btn("daily-popup-close", "✕");
    x.setAttribute("aria-label", "Kapat");
    x.addEventListener("click", function () { openPopup = null; render(); });
    head.appendChild(x);
    pop.appendChild(head);
    return pop;
  }

  function reviewPopup(due) {
    var pop = popupShell("Tekrar");
    if (due.length) {
      pop.appendChild(span("daily-review-label", due.length + " kelime hazır"));
      var start = btn("daily-btn daily-btn-wide", "Başla");
      start.addEventListener("click", function () { startReview(due); });
      pop.appendChild(start);
    } else {
      pop.appendChild(span("daily-review-label daily-muted", "Bugün tekrar edilecek kelime yok"));
    }
    return pop;
  }

  function notifPopup() {
    var pop = popupShell("Günlük hatırlatma");
    pop.appendChild(notifRow());
    return pop;
  }

  function setGoal(v) {
    v = Math.max(5, Math.min(100, v));
    save(LS_GOAL, v);
    render();
  }

  /* ---------- render: tekrar akışı ---------- */

  function startReview(list) {
    review = { list: list.slice(), i: 0, revealed: false };
    openPopup = null;
    render();
  }

  function renderReview() {
    var r = review;
    host.textContent = "";

    if (r.i >= r.list.length) {
      var done = div("daily-review-done");
      done.appendChild(span("", "Tekrar bitti 🎉  " + r.list.length + " kelime"));
      var close = btn("daily-btn", "Kapat");
      close.addEventListener("click", function () { review = null; render(); });
      done.appendChild(close);
      host.appendChild(done);
      return;
    }

    var w = r.list[r.i];

    var head = div("daily-head");
    head.appendChild(span("daily-title", "Tekrar  " + (r.i + 1) + " / " + r.list.length));
    var x = btn("daily-gear", "✕");
    x.setAttribute("aria-label", "Tekrarı kapat");
    x.addEventListener("click", function () { review = null; render(); });
    head.appendChild(x);
    host.appendChild(head);

    var card = div("daily-rcard");
    card.appendChild(span("daily-rword", w.en));
    if (r.revealed) {
      card.appendChild(span("daily-rtr", (w.tr || []).join(", ")));
    } else {
      var show = btn("daily-btn daily-btn-wide", "Anlamı göster");
      show.addEventListener("click", function () { r.revealed = true; renderReview(); });
      card.appendChild(show);
    }
    host.appendChild(card);

    if (r.revealed) {
      var acts = div("daily-ractions");
      var no = btn("daily-btn daily-btn-bad", "Unuttum");
      no.addEventListener("click", function () { gradeReview(w, false); });
      var yes = btn("daily-btn daily-btn-good", "Hatırladım");
      yes.addEventListener("click", function () { gradeReview(w, true); });
      acts.appendChild(no);
      acts.appendChild(yes);
      host.appendChild(acts);
    }
  }

  function gradeReview(w, ok) {
    var srs = load(LS_SRS, {}) || {};
    var cur = srs[w.id] || { box: 1 };
    if (ok) advance(srs, w.id, cur.box);
    else srs[w.id] = { box: 1, due: addDays(todayStr(), 1) };
    save(LS_SRS, srs);

    bumpGoal(w.id); // tekrar da günlük hedefe sayılır
    review.i++;
    review.revealed = false;
    renderReview();
  }

  /* ---------- bildirim (yalnızca native) ---------- */

  function isNative() {
    return !!(window.Capacitor && typeof window.Capacitor.isNativePlatform === "function"
      && window.Capacitor.isNativePlatform());
  }
  function LN() {
    return (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.LocalNotifications) || null;
  }
  function getNotif() {
    var n = load(LS_NOTIF, null);
    if (!n || typeof n.time !== "string") n = { enabled: false, time: "20:00" };
    return n;
  }
  function initNotif() {
    if (!isNative()) return;
    var n = getNotif();
    if (n.enabled) scheduleNotif(n.time); // her açılışta yeniden kur
  }
  function notifRow() {
    var n = getNotif();
    var row = div("daily-notif");

    row.appendChild(span("daily-notif-label", "Saat"));

    var time = document.createElement("input");
    time.type = "time";
    time.className = "daily-time";
    time.value = n.time;
    time.addEventListener("change", function () {
      var nn = getNotif();
      nn.time = /^\d{1,2}:\d{2}$/.test(time.value) ? time.value : "20:00";
      save(LS_NOTIF, nn);
      if (nn.enabled) scheduleNotif(nn.time);
    });
    row.appendChild(time);

    var sw = btn("daily-switch" + (n.enabled ? " is-on" : ""), "");
    sw.setAttribute("role", "switch");
    sw.setAttribute("aria-checked", n.enabled ? "true" : "false");
    var knob = document.createElement("span");
    knob.className = "daily-switch-knob";
    sw.appendChild(knob);
    sw.addEventListener("click", toggleNotif);
    row.appendChild(sw);

    return row;
  }
  function toggleNotif() {
    var n = getNotif();
    var ln = LN();
    if (!ln) return;
    if (n.enabled) {
      n.enabled = false;
      save(LS_NOTIF, n);
      ln.cancel({ notifications: [{ id: NOTIF_ID }] }).catch(function () {});
      render();
      return;
    }
    ln.requestPermissions().then(function (res) {
      if (res && res.display === "granted") {
        n.enabled = true;
        save(LS_NOTIF, n);
        scheduleNotif(n.time);
      }
      render();
    }).catch(function () { render(); });
  }
  function parseHM(s) {
    var m = /^(\d{1,2}):(\d{2})$/.exec(s || "20:00");
    return m ? { hour: +m[1], minute: +m[2] } : { hour: 20, minute: 0 };
  }
  function scheduleNotif(time) {
    var ln = LN();
    if (!ln) return;
    var hm = parseHM(time);
    ln.cancel({ notifications: [{ id: NOTIF_ID }] }).catch(function () {}).then(function () {
      return ln.schedule({
        notifications: [{
          id: NOTIF_ID,
          title: "YDS365 Kelime Çalışması",
          body: "Bugünkü kelime hedefini ve tekrarını unutma 👋",
          schedule: { on: { hour: hm.hour, minute: hm.minute }, repeats: true, allowWhileIdle: true }
        }]
      });
    }).catch(function () {});
  }

  /* ---------- küçük DOM yardımcıları ---------- */

  function div(cls) {
    var d = document.createElement("div");
    d.className = cls;
    return d;
  }
  function span(cls, text) {
    var s = document.createElement("span");
    if (cls) s.className = cls;
    s.textContent = text;
    return s;
  }
  function btn(cls, text) {
    var b = document.createElement("button");
    b.type = "button";
    b.className = cls;
    if (text) b.textContent = text;
    return b;
  }
})();
