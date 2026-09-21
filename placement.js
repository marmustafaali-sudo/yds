/* YDS365 Kelime Çalışması — haftalık seviye belirleme sınavı.
   "Seviye" adında ayrı bir sekmede yaşar (Kart/Test/Liste ile aynı seviyede):
   A2/B1/B2/C1'den 5'er soru (kelimenin TR anlamını seç, her seferinde havuzdan
   rastgele), sonunda önerilen seviyeyi belirler ve Liste/Test'teki seviye
   filtresini ayarlar. Tamamlandıktan sonra 7 gün kilitli kalır; sekmede kalan
   gün gösterilir. Sekmenin geri kalanı (lider tablosu) leaderboard.js'te. */
(function () {
  "use strict";

  // Sadece telefon appinde (Capacitor native) çalışır — web'de klasik seviye
  // filtresi + arama zaten görünür, ayrı bir sınav akışına gerek yok.
  var C = window.Capacitor;
  if (!C || typeof C.isNativePlatform !== "function" || !C.isNativePlatform()) return;

  var LS_LEVEL = "yds.placementLevel.v1";
  var LS_LAST_DATE = "yds.placementLastDate.v1"; // "YYYY-MM-DD" — en son tamamlanma günü
  var LEVELS = ["A2", "B1", "B2", "C1"];
  var PER_LEVEL = 5;
  var PASS_RATIO = 0.6;
  var LOCK_DAYS = 7;

  var els = {};
  var words = [];
  var quiz = null; // { qs, index, picks: {}, scores: {A2:{correct,total}, ...} }

  document.addEventListener("DOMContentLoaded", function () {
    cache();
    bind();
    if (window.YDSWords && window.YDSWords.length) {
      words = window.YDSWords;
    } else {
      document.addEventListener("yds:words", function () { words = window.YDSWords || []; }, { once: true });
    }
    renderLevelStatus();
  });

  function cache() {
    els.gate = document.getElementById("placementGate");
    els.quiz = document.getElementById("placementQuiz");
    els.result = document.getElementById("placementResult");
    els.exit = document.getElementById("placementExit");
    els.progress = document.getElementById("placementProgress");
    els.levelChip = document.getElementById("placementLevelChip");
    els.barFill = document.getElementById("placementBarFill");
    els.word = document.getElementById("placementWord");
    els.options = document.getElementById("placementOptions");
    els.next = document.getElementById("placementNext");
    els.resultLevel = document.getElementById("placementResultLevel");
    els.resultSub = document.getElementById("placementResultSub");
    els.breakdown = document.getElementById("placementBreakdown");
    els.finish = document.getElementById("placementFinish");
    els.levelStatus = document.getElementById("levelStatus");
  }

  function bind() {
    if (els.exit) els.exit.addEventListener("click", hideGate);
    if (els.next) els.next.addEventListener("click", nextQuestion);
    if (els.finish) els.finish.addEventListener("click", finishAndClose);
  }

  /* ---------- haftalık kilit ---------- */

  function todayISO() {
    var d = new Date();
    var m = d.getMonth() + 1, day = d.getDate();
    return d.getFullYear() + "-" + (m < 10 ? "0" : "") + m + "-" + (day < 10 ? "0" : "") + day;
  }

  function daysSinceLast() {
    var last = load(LS_LAST_DATE, "");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(last)) return Infinity; // hiç yapılmamış
    var a = new Date(last + "T00:00:00");
    var b = new Date(todayISO() + "T00:00:00");
    return Math.round((b - a) / 86400000);
  }

  function isLocked() {
    return daysSinceLast() < LOCK_DAYS;
  }

  /* ---------- "Seviye" sekmesi: durum kartı + geçmiş grafiği ---------- */

  function renderLevelStatus() {
    if (!els.levelStatus) return;
    var since = daysSinceLast();
    var lastLevel = load(LS_LEVEL, null);
    var html;
    if (since >= LOCK_DAYS) {
      html =
        '<div class="level-card level-card-ready">' +
        '<h2>Seviye Belirleme Sınavı</h2>' +
        '<p>A2, B1, B2, C1\'den 5\'er soru (20 soru, ~8 dk). Sonunda önerilen seviyeni görürsün ve kartlar/testler ona göre ayarlanır.</p>' +
        '<div class="placement-levels">' +
        LEVELS.map(function (lv) {
          return '<div class="placement-level-row"><span class="placement-level-chip lvl-' + lv + '">' + lv + '</span><span>5 soru</span></div>';
        }).join("") +
        '</div>' +
        '<button type="button" id="levelStart" class="btn btn-good btn-wide">Teste başla</button>' +
        '</div>';
    } else {
      var remaining = LOCK_DAYS - since;
      html =
        '<div class="level-card level-card-locked">' +
        (lastLevel ? '<span class="placement-level-chip lvl-' + lastLevel + '">' + lastLevel + '</span>' : '') +
        '<p>Şu anki seviyen ' + (lastLevel || "—") + '. Sonraki teste <strong>' + remaining + ' gün</strong> kaldı.</p>' +
        '</div>';
    }
    els.levelStatus.innerHTML = html;
    var startBtn = document.getElementById("levelStart");
    if (startBtn) startBtn.addEventListener("click", startQuiz);
  }

  function showGate() {
    if (els.gate) els.gate.hidden = false;
  }

  function hideGate() {
    if (els.gate) els.gate.hidden = true;
  }

  /* ---------- soru üretimi (gerçek words.json'dan) ---------- */

  function buildQuestions() {
    var byLevel = {};
    LEVELS.forEach(function (lv) { byLevel[lv] = []; });
    var pool = [];
    words.forEach(function (w) {
      if (!w.en || !w.tr || !w.tr.length) return;
      pool.push(w);
      if (byLevel[w.level]) byLevel[w.level].push(w);
    });
    var qs = [];
    LEVELS.forEach(function (lv) {
      shuffled(byLevel[lv]).slice(0, PER_LEVEL).forEach(function (w) {
        qs.push(makeQuestion(w, pool));
      });
    });
    return qs;
  }

  function makeQuestion(w, pool) {
    var correct = w.tr.join(", ");
    var seen = {};
    seen[correct] = true;
    var distractors = [];
    shuffled(pool).some(function (x) {
      if (x.id === w.id) return false;
      var t = (x.tr || []).join(", ");
      if (!t || seen[t]) return false;
      seen[t] = true;
      distractors.push(t);
      return distractors.length >= 3;
    });
    return { level: w.level, word: w.en, correct: correct, options: shuffled([correct].concat(distractors)) };
  }

  function shuffled(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  /* ---------- akış ---------- */

  function startQuiz() {
    var qs = buildQuestions();
    if (!qs.length) return;
    var scores = {};
    LEVELS.forEach(function (lv) { scores[lv] = { correct: 0, total: 0 }; });
    quiz = { qs: qs, index: 0, picks: {}, scores: scores };
    els.result.hidden = true;
    els.quiz.hidden = false;
    showGate();
    renderQuestion();
  }

  function renderQuestion() {
    var q = quiz.qs[quiz.index];
    els.progress.textContent = "Soru " + (quiz.index + 1) + " / " + quiz.qs.length;
    els.levelChip.textContent = q.level;
    els.levelChip.className = "placement-level-chip lvl-" + q.level;
    els.barFill.style.width = Math.round(((quiz.index + 1) / quiz.qs.length) * 100) + "%";
    els.word.textContent = q.word;
    els.options.innerHTML = "";
    var picked = quiz.picks[quiz.index];
    q.options.forEach(function (text) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "placement-opt" + (picked === text ? " is-picked" : "");
      b.textContent = text;
      b.addEventListener("click", function () {
        quiz.picks[quiz.index] = text;
        renderQuestion();
      });
      els.options.appendChild(b);
    });
    els.next.disabled = picked == null;
    els.next.textContent = quiz.index === quiz.qs.length - 1 ? "Sonucu gör" : "İleri";
  }

  function nextQuestion() {
    var q = quiz.qs[quiz.index];
    var picked = quiz.picks[quiz.index];
    if (picked == null) return;
    var s = quiz.scores[q.level];
    s.total++;
    if (picked === q.correct) s.correct++;

    if (quiz.index < quiz.qs.length - 1) {
      quiz.index++;
      renderQuestion();
    } else {
      renderResult();
    }
  }

  function renderResult() {
    var scores = quiz.scores;
    var recommended = "A2";
    var totalCorrect = 0, totalQs = 0;
    LEVELS.forEach(function (lv) {
      var s = scores[lv];
      totalCorrect += s.correct;
      totalQs += s.total;
      if (s.total > 0 && s.correct / s.total >= PASS_RATIO) recommended = lv;
    });

    els.quiz.hidden = true;
    els.result.hidden = false;
    els.resultLevel.textContent = recommended;
    els.resultSub.textContent = totalQs + " sorudan " + totalCorrect + "'ini doğru bildin";

    els.breakdown.innerHTML = "";
    LEVELS.forEach(function (lv) {
      var s = scores[lv];
      var pct = s.total ? Math.round((s.correct / s.total) * 100) : 0;
      var row = document.createElement("div");
      row.className = "placement-bd-row";
      row.innerHTML =
        '<span class="placement-bd-label" style="color:var(--' + lv.toLowerCase() + ')">' + lv + '</span>' +
        '<span class="placement-bd-track"><span class="placement-bd-fill" style="width:' + pct + '%;background:var(--' + lv.toLowerCase() + ')"></span></span>' +
        '<span class="placement-bd-score">' + s.correct + '/' + s.total + '</span>';
      els.breakdown.appendChild(row);
    });

    quiz.recommended = recommended;
  }

  function finishAndClose() {
    var level = (quiz && quiz.recommended) || "A2";
    save(LS_LEVEL, level);
    save(LS_LAST_DATE, todayISO());
    hideGate();
    applyLevel(level);
    renderLevelStatus();
  }

  function applyLevel(level) {
    var chip = document.querySelector('#levelFilter .chip[data-level="' + level + '"]');
    if (chip) chip.click();
  }

  function load(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) { return fallback; }
  }

  function save(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {}
  }
})();
