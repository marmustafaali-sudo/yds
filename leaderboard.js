/* YDS365 Kelime Çalışması — haftalık lider tablosu (opt-in, sadece telefon appi).
   Kimlik: cihazda üretilen anonim UUID + kullanıcının seçtiği takma ad, hesap
   yok. Katılmayan hiçbir cihazdan hiçbir istek atılmaz. "Seviye" sekmesinde,
   önceki geçmiş-sınav grafiğinin yerinde yaşar. Metrik: Test sekmesindeki
   mevcut puan sistemi ("doğru + hızlı + seri"), haftalık kümülatif toplam. */
(function () {
  "use strict";

  var C = window.Capacitor;
  if (!C || typeof C.isNativePlatform !== "function" || !C.isNativePlatform()) return;

  var API_BASE = "https://yds.mar-mustafa-ali.workers.dev/api/leaderboard";

  var LS_OPT_IN = "yds.lb.optIn.v1";
  var LS_DEVICE_ID = "yds.lb.deviceId.v1";
  var LS_NICKNAME = "yds.lb.nickname.v1";
  var LS_WEEK_POINTS = "yds.lb.weekPoints.v1"; // {isoWeek, points}
  var LS_LAST_SUBMIT = "yds.lb.lastSubmitAt.v1";
  var LS_LAST_KNOWN = "yds.lb.lastKnownRank.v1"; // {isoWeek, points, rank, totalPlayers}

  var SUBMIT_MIN_GAP_MS = 60000; // gerçek network çağrısını en az bu kadar seyrelt
  var DEBOUNCE_MS = 5000; // art arda gelen quizFinished'leri birleştir

  var els = {};
  var debounceTimer = null;

  document.addEventListener("DOMContentLoaded", function () {
    cache();
    render();
    document.addEventListener("yds:quizFinished", onQuizFinished);
  });

  function cache() {
    els.host = document.getElementById("levelStatus"); // aynı barındırıcıyı paylaşıyoruz (placement.js ile birlikte)
    els.section = document.getElementById("leaderboardSection");
    els.list = document.getElementById("leaderboardList");
    els.meRow = document.getElementById("leaderboardMe");
  }

  /* ---------- ISO hafta (client'ta sadece UX için — güvenlik sınırı sunucuda) ---------- */

  var TURKEY_OFFSET_MS = 3 * 60 * 60 * 1000;
  function isoWeekTurkey(date) {
    var t = new Date(date.getTime() + TURKEY_OFFSET_MS);
    var d = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate()));
    var dayNum = (d.getUTCDay() + 6) % 7;
    d.setUTCDate(d.getUTCDate() - dayNum + 3);
    var firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
    var firstDayNum = (firstThursday.getUTCDay() + 6) % 7;
    firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDayNum + 3);
    var week = 1 + Math.round((d - firstThursday) / 604800000);
    return d.getUTCFullYear() + "-W" + (week < 10 ? "0" : "") + week;
  }

  /* ---------- durum ---------- */

  function isOptedIn() {
    return load(LS_OPT_IN, false) === true;
  }
  function uuidv4() {
    if (window.crypto && window.crypto.randomUUID) return window.crypto.randomUUID();
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
      var r = (Math.random() * 16) | 0, v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  function weekPoints() {
    var wp = load(LS_WEEK_POINTS, null);
    var thisWeek = isoWeekTurkey(new Date());
    if (!wp || wp.isoWeek !== thisWeek) { wp = { isoWeek: thisWeek, points: 0 }; save(LS_WEEK_POINTS, wp); }
    return wp;
  }

  /* ---------- katıl ---------- */

  function join(nickname) {
    var deviceId = load(LS_DEVICE_ID, null) || uuidv4();
    save(LS_DEVICE_ID, deviceId);
    return fetchJSON(API_BASE + "/join", {
      method: "POST",
      body: { deviceId: deviceId, nickname: nickname }
    }).then(function (res) {
      if (!res || !res.ok) throw new Error("join_failed");
      save(LS_OPT_IN, true);
      save(LS_NICKNAME, nickname);
      render();
      refreshMe();
      refreshTop();
    });
  }

  function leave() {
    var deviceId = load(LS_DEVICE_ID, null);
    save(LS_OPT_IN, false);
    render();
    if (!deviceId) return;
    fetchJSON(API_BASE + "/leave", { method: "POST", body: { deviceId: deviceId } }).catch(function () {});
  }

  /* ---------- puan biriktirme + gönderim ---------- */

  function onQuizFinished(e) {
    if (!isOptedIn()) return;
    var pts = (e && e.detail && e.detail.points) || 0;
    if (pts <= 0) return;
    var wp = weekPoints();
    wp.points += pts;
    save(LS_WEEK_POINTS, wp);

    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(maybeSubmit, DEBOUNCE_MS);
  }

  function maybeSubmit() {
    debounceTimer = null;
    if (!isOptedIn()) return;
    var lastAt = load(LS_LAST_SUBMIT, 0);
    if (Date.now() - lastAt < SUBMIT_MIN_GAP_MS) return; // sıradaki quizFinished tekrar dener
    submitNow();
  }

  function submitNow() {
    var deviceId = load(LS_DEVICE_ID, null);
    var nickname = load(LS_NICKNAME, null);
    if (!deviceId || !nickname) return;
    var wp = weekPoints();
    save(LS_LAST_SUBMIT, Date.now());
    fetchJSON(API_BASE + "/submit", {
      method: "POST",
      body: { deviceId: deviceId, nickname: nickname, points: wp.points }
    }).then(function (res) {
      if (!res || !res.ok) return;
      save(LS_LAST_KNOWN, { isoWeek: res.isoWeek, points: res.points, rank: res.rank, totalPlayers: res.totalPlayers });
      renderMe();
      refreshTop();
    }).catch(function () {});
  }

  function refreshMe() {
    var deviceId = load(LS_DEVICE_ID, null);
    if (!deviceId) return;
    fetchJSON(API_BASE + "/me?deviceId=" + encodeURIComponent(deviceId), { method: "GET" })
      .then(function (res) {
        if (!res || res.joined === false) return;
        save(LS_LAST_KNOWN, { isoWeek: res.isoWeek, points: res.points, rank: res.rank, totalPlayers: res.totalPlayers });
        renderMe();
      }).catch(function () {});
  }

  function refreshTop() {
    if (!els.list) return;
    fetchJSON(API_BASE + "/top?limit=50", { method: "GET" })
      .then(function (res) {
        if (!res || !res.entries) return;
        renderTop(res.entries);
      }).catch(function () {});
  }

  /* ---------- ağ yardımcısı ---------- */

  function fetchJSON(url, opts) {
    var controller = (typeof AbortController !== "undefined") ? new AbortController() : null;
    var timer = controller ? setTimeout(function () { controller.abort(); }, 8000) : null;
    var init = {
      method: opts.method,
      headers: { "content-type": "application/json" },
      signal: controller ? controller.signal : undefined
    };
    if (opts.body) init.body = JSON.stringify(opts.body);
    return fetch(url, init).then(function (r) { return r.json(); }).finally(function () {
      if (timer) clearTimeout(timer);
    });
  }

  /* ---------- render: "Seviye" sekmesindeki lider tablosu bölümü ---------- */

  function render() {
    if (!els.section) return;
    els.section.innerHTML = "";
    if (!isOptedIn()) {
      els.section.appendChild(joinCard());
    } else {
      els.section.appendChild(joinedHead());
      var meRow = div("lb-me");
      meRow.id = "leaderboardMe";
      els.section.appendChild(meRow);
      var list = div("lb-list");
      list.id = "leaderboardList";
      els.section.appendChild(list);
      cache(); // meRow/list yeniden oluşturuldu, id referanslarını tazele
      renderMe();
      refreshTop();
    }
  }

  function joinCard() {
    var card = div("level-card");
    card.appendChild(elText("h2", null, "Haftalık Lider Tablosu"));
    card.appendChild(elText("p", null,
      "Uygulamayı kullanan herkesle haftalık test puanına göre yarış. Katılmak isteğe bağlı: " +
      "sadece bir takma ad seçtiğinde cihazından anonim bir kimlik + takma adın + o haftaki puanın gönderilir."));
    var input = document.createElement("input");
    input.type = "text";
    input.className = "lb-nick-input";
    input.placeholder = "Takma adın (2-20 karakter)";
    input.maxLength = 20;
    card.appendChild(input);
    var btnEl = btn("btn btn-good btn-wide", "Lider Tablosuna Katıl");
    var msg = elText("p", "lb-msg", "");
    btnEl.addEventListener("click", function () {
      var name = (input.value || "").trim();
      if (name.length < 2) { msg.textContent = "Takma ad en az 2 karakter olmalı."; return; }
      btnEl.disabled = true;
      msg.textContent = "";
      join(name).catch(function () {
        msg.textContent = "Katılamadı, internetini kontrol edip tekrar dene.";
        btnEl.disabled = false;
      });
    });
    card.appendChild(btnEl);
    card.appendChild(msg);
    return card;
  }

  function joinedHead() {
    var head = div("lb-head");
    head.appendChild(elText("h3", "lb-title", "Bu haftanın sıralaması"));
    var leaveBtn = btn("lb-leave", "Ayrıl");
    leaveBtn.addEventListener("click", leave);
    head.appendChild(leaveBtn);
    return head;
  }

  function renderMe() {
    var el = document.getElementById("leaderboardMe");
    if (!el) return;
    var known = load(LS_LAST_KNOWN, null);
    var wp = weekPoints();
    if (!known || known.isoWeek !== wp.isoWeek) {
      el.textContent = "Bu hafta " + wp.points + " puan — ilk gönderim birazdan yapılacak.";
      return;
    }
    el.innerHTML = "";
    el.appendChild(elText("span", "lb-me-rank", "#" + known.rank));
    el.appendChild(elText("span", "lb-me-points", known.points + " puan"));
    el.appendChild(elText("span", "lb-me-total", known.totalPlayers + " kişi arasında"));
  }

  function renderTop(entries) {
    var list = document.getElementById("leaderboardList");
    if (!list) return;
    list.innerHTML = "";
    if (!entries.length) {
      list.appendChild(elText("p", "lb-empty", "Bu hafta henüz kimse puan göndermedi — ilk sen ol."));
      return;
    }
    entries.forEach(function (e) {
      var row = div("lb-row");
      row.appendChild(elText("span", "lb-rank", "#" + e.rank));
      row.appendChild(elText("span", "lb-nick", e.nickname));
      row.appendChild(elText("span", "lb-pts", e.points + " puan"));
      list.appendChild(row);
    });
  }

  /* ---------- localStorage + küçük DOM yardımcıları ---------- */

  function load(key, fallback) {
    try { var raw = localStorage.getItem(key); return raw != null ? JSON.parse(raw) : fallback; }
    catch (e) { return fallback; }
  }
  function save(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {}
  }
  function div(cls) {
    var d = document.createElement("div");
    if (cls) d.className = cls;
    return d;
  }
  function elText(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    e.textContent = text;
    return e;
  }
  function btn(cls, text) {
    var b = document.createElement("button");
    b.type = "button";
    b.className = cls;
    b.textContent = text;
    return b;
  }
})();
