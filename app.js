/* YDS Kelime Çalışma — statik, çerçevesiz. Veri: words.json, ilerleme: localStorage. */
(function () {
  "use strict";

  var LS_LEARNED = "yds.learned.v1";
  var LS_BEST = "yds.quizBest.v1";
  var LS_WORDS_OVERRIDE = "yds.words.override.v1";
  var LS_POST_QUEUE = "yds.postQueue.v1";
  var LS_POST_START = "yds.postStart.v1";

  var state = {
    words: [],
    view: "list",
    level: "all",
    search: "",
    onlyUnlearned: false,
    learned: loadSet(LS_LEARNED),
    // card
    cardDeck: [],
    cardIndex: 0,
    // quiz
    quiz: null
  };

  var el = {};

  document.addEventListener("DOMContentLoaded", init);

  function init() {
    cacheEls();
    bindEls();
    var ov = loadJSON(LS_WORDS_OVERRIDE, null);
    if (ov && ov.words && ov.words.length) {
      bootWords(ov.words, "yüklenen veri (" + ov.words.length + " kelime)");
      return;
    }
    fetch("words.json")
      .then(function (r) { return r.json(); })
      .then(function (data) { bootWords(data.words || [], null); })
      .catch(function () {
        el.wordList.innerHTML = '<li class="empty">words.json yüklenemedi. Yerel sunucu ile açın (README).</li>';
      });
  }

  function bootWords(arr, note) {
    state.words = arr.slice();
    window.YDSWords = state.words;
    document.dispatchEvent(new CustomEvent("yds:words"));
    renderAll();
    if (note && el.dataMsg) el.dataMsg.textContent = "Kaynak: " + note;
  }

  function cacheEls() {
    el.tabs = document.querySelectorAll(".tab");
    el.views = {
      list: document.getElementById("view-list"),
      card: document.getElementById("view-card"),
      quiz: document.getElementById("view-quiz"),
      post: document.getElementById("view-post")
    };
    el.search = document.getElementById("search");
    el.levelFilter = document.getElementById("levelFilter");
    el.onlyUnlearned = document.getElementById("onlyUnlearned");
    el.wordList = document.getElementById("wordList");
    el.listCount = document.getElementById("listCount");
    el.progressFill = document.getElementById("progressFill");
    el.progressText = document.getElementById("progressText");
    // card
    el.flashcard = document.getElementById("flashcard");
    el.cardStage = document.getElementById("cardStage");
    el.cardEmpty = document.getElementById("cardEmpty");
    el.cardLevelFront = document.getElementById("cardLevelFront");
    el.cardWordFront = document.getElementById("cardWordFront");
    el.cardPosFront = document.getElementById("cardPosFront");
    el.cardTr = document.getElementById("cardTr");
    el.cardExEn = document.getElementById("cardExEn");
    el.cardExTr = document.getElementById("cardExTr");
    el.cardSyn = document.getElementById("cardSyn");
    el.cardKnow = document.getElementById("cardKnow");
    el.cardDontKnow = document.getElementById("cardDontKnow");
    el.cardFlip = document.getElementById("cardFlip");
    el.cardPrev = document.getElementById("cardPrev");
    el.cardNext = document.getElementById("cardNext");
    el.cardPos = document.getElementById("cardPos");
    el.cardShuffle = document.getElementById("cardShuffle");
    // quiz
    el.quizIntro = document.getElementById("quizIntro");
    el.quizRun = document.getElementById("quizRun");
    el.quizResult = document.getElementById("quizResult");
    el.quizStart = document.getElementById("quizStart");
    el.quizProgress = document.getElementById("quizProgress");
    el.quizScore = document.getElementById("quizScore");
    el.quizLevel = document.getElementById("quizLevel");
    el.quizWord = document.getElementById("quizWord");
    el.quizOptions = document.getElementById("quizOptions");
    el.quizNext = document.getElementById("quizNext");
    el.quizFinal = document.getElementById("quizFinal");
    el.quizBest = document.getElementById("quizBest");
    el.quizWrong = document.getElementById("quizWrong");
    el.quizRetry = document.getElementById("quizRetry");
    // veri paneli
    el.dataExportWords = document.getElementById("dataExportWords");
    el.dataExportAll = document.getElementById("dataExportAll");
    el.dataImport = document.getElementById("dataImport");
    el.dataReset = document.getElementById("dataReset");
    el.dataMsg = document.getElementById("dataMsg");
  }

  function bindEls() {
    el.tabs.forEach(function (t) {
      t.addEventListener("click", function () { setView(t.getAttribute("data-view")); });
    });
    el.search.addEventListener("input", function () {
      state.search = el.search.value.trim().toLowerCase();
      renderList();
    });
    el.levelFilter.addEventListener("click", function (e) {
      var b = e.target.closest(".chip");
      if (!b) return;
      state.level = b.getAttribute("data-level");
      el.levelFilter.querySelectorAll(".chip").forEach(function (c) {
        c.classList.toggle("is-active", c === b);
      });
      renderCurrentView();
    });
    el.onlyUnlearned.addEventListener("change", function () {
      state.onlyUnlearned = el.onlyUnlearned.checked;
      renderCurrentView();
    });

    // card
    el.flashcard.addEventListener("click", flipCard);
    el.cardFlip.addEventListener("click", flipCard);
    el.cardKnow.addEventListener("click", function () { markCard(true); });
    el.cardDontKnow.addEventListener("click", function () { markCard(false); });
    el.cardPrev.addEventListener("click", function () { moveCard(-1); });
    el.cardNext.addEventListener("click", function () { moveCard(1); });
    el.cardShuffle.addEventListener("click", function () { buildDeck(true); showCard(); });

    // quiz
    el.quizStart.addEventListener("click", startQuiz);
    el.quizRetry.addEventListener("click", startQuiz);
    el.quizNext.addEventListener("click", nextQuizQuestion);

    // veri paneli
    if (el.dataExportWords) el.dataExportWords.addEventListener("click", exportWords);
    if (el.dataExportAll) el.dataExportAll.addEventListener("click", exportAll);
    if (el.dataImport) el.dataImport.addEventListener("change", function () {
      if (el.dataImport.files && el.dataImport.files[0]) importFile(el.dataImport.files[0]);
      el.dataImport.value = "";
    });
    if (el.dataReset) el.dataReset.addEventListener("click", resetData);
  }

  /* ---------- veri: dışa / içe aktarma ---------- */

  function downloadJSON(obj, name) {
    var blob = new Blob([JSON.stringify(obj, null, 2)], { type: "application/json" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  }

  function safeLS(k) {
    try { return localStorage.getItem(k) || ""; } catch (e) { return ""; }
  }

  function exportWords() {
    downloadJSON({
      meta: { title: "YDS Kelime", exportedAt: new Date().toISOString(), count: state.words.length },
      words: state.words
    }, "words.json");
    if (el.dataMsg) el.dataMsg.textContent = "words.json indirildi — repoya koyup GitHub'a push et.";
  }

  function exportAll() {
    downloadJSON({
      app: "yds-kelime",
      version: 1,
      exportedAt: new Date().toISOString(),
      words: state.words,
      schedule: {
        startDate: safeLS(LS_POST_START),
        queue: loadJSON(LS_POST_QUEUE, [])
      },
      progress: { learned: state.learned, quizBest: loadJSON(LS_BEST, {}) }
    }, "yds-yedek-" + new Date().toISOString().slice(0, 10) + ".json");
    if (el.dataMsg) el.dataMsg.textContent = "Tam yedek indirildi.";
  }

  function normalizeWords(arr) {
    var out = [];
    arr.forEach(function (w, i) {
      if (!w || !w.en) return;
      out.push({
        id: w.id != null ? w.id : i + 1,
        en: String(w.en),
        pos: w.pos || "",
        level: /^(A2|B1|B2|C1)$/.test(w.level) ? w.level : "B1",
        tr: Array.isArray(w.tr) ? w.tr : (w.tr ? [String(w.tr)] : []),
        example_en: w.example_en || "",
        example_tr: w.example_tr || "",
        synonyms: Array.isArray(w.synonyms) ? w.synonyms : []
      });
    });
    return out;
  }

  function importFile(file) {
    var reader = new FileReader();
    reader.onload = function () {
      var data;
      try { data = JSON.parse(reader.result); }
      catch (e) { el.dataMsg.textContent = "Geçersiz JSON dosyası."; return; }

      var msgs = [];
      if (Array.isArray(data.words) && data.words.length) {
        var clean = normalizeWords(data.words);
        if (clean.length) {
          saveJSON(LS_WORDS_OVERRIDE, { words: clean });
          msgs.push(clean.length + " kelime");
        }
      }
      if (data.schedule) {
        if (typeof data.schedule.startDate === "string" && data.schedule.startDate) {
          try { localStorage.setItem(LS_POST_START, data.schedule.startDate); } catch (e) {}
        }
        if (Array.isArray(data.schedule.queue)) {
          saveJSON(LS_POST_QUEUE, data.schedule.queue);
        }
        msgs.push("takvim");
      }
      if (data.progress && data.progress.learned) {
        saveJSON(LS_LEARNED, data.progress.learned);
        if (data.progress.quizBest) saveJSON(LS_BEST, data.progress.quizBest);
        msgs.push("ilerleme");
      }

      if (!msgs.length) {
        el.dataMsg.textContent = "Tanınan alan yok (beklenen: words / schedule / progress).";
        return;
      }
      el.dataMsg.textContent = "Yüklendi: " + msgs.join(", ") + ". Sayfa yenileniyor…";
      setTimeout(function () { location.reload(); }, 800);
    };
    reader.readAsText(file);
  }

  function resetData() {
    try { localStorage.removeItem(LS_WORDS_OVERRIDE); } catch (e) {}
    if (el.dataMsg) el.dataMsg.textContent = "Varsayılan words.json'a dönülüyor…";
    setTimeout(function () { location.reload(); }, 500);
  }

  /* ---------- filtering ---------- */

  function filtered() {
    return state.words.filter(function (w) {
      if (state.level !== "all" && w.level !== state.level) return false;
      if (state.onlyUnlearned && state.learned[w.id]) return false;
      if (state.search) {
        var hay = (w.en + " " + (w.tr || []).join(" ") + " " + (w.synonyms || []).join(" ")).toLowerCase();
        if (hay.indexOf(state.search) === -1) return false;
      }
      return true;
    });
  }

  /* ---------- views ---------- */

  function setView(v) {
    state.view = v;
    el.tabs.forEach(function (t) {
      t.classList.toggle("is-active", t.getAttribute("data-view") === v);
    });
    Object.keys(el.views).forEach(function (k) {
      el.views[k].classList.toggle("is-active", k === v);
    });
    var controls = document.querySelector(".controls");
    if (controls) controls.hidden = (v === "post");
    renderCurrentView();
  }

  function renderCurrentView() {
    if (state.view === "list") renderList();
    else if (state.view === "card") { buildDeck(false); showCard(); }
    else if (state.view === "quiz") resetQuizToIntro();
  }

  function renderAll() {
    renderProgress();
    renderCurrentView();
  }

  function renderProgress() {
    var total = state.words.length;
    var done = state.words.filter(function (w) { return state.learned[w.id]; }).length;
    el.progressText.textContent = done + " / " + total + " öğrenildi";
    el.progressFill.style.width = total ? (done / total * 100) + "%" : "0%";
  }

  /* ---------- list ---------- */

  function renderList() {
    var rows = filtered();
    el.listCount.textContent = rows.length + " kelime gösteriliyor";
    el.wordList.innerHTML = "";
    if (!rows.length) {
      el.wordList.innerHTML = '<li class="empty">Eşleşen kelime yok.</li>';
      return;
    }
    var frag = document.createDocumentFragment();
    rows.forEach(function (w) {
      frag.appendChild(listItem(w));
    });
    el.wordList.appendChild(frag);
  }

  function listItem(w) {
    var li = document.createElement("li");
    li.className = "word-item" + (state.learned[w.id] ? " is-learned" : "");

    var row = document.createElement("div");
    row.className = "word-row";
    row.appendChild(span("word-en", w.en));
    row.appendChild(span("word-pos", w.pos || ""));
    row.appendChild(span("badge " + w.level, w.level));
    li.appendChild(row);

    li.appendChild(span("word-tr", (w.tr || []).join(", ")));

    var toggle = document.createElement("button");
    toggle.className = "word-toggle";
    toggle.textContent = "Örnek cümle ▾";
    li.appendChild(toggle);

    var ex = document.createElement("div");
    ex.className = "word-ex";
    ex.hidden = true;
    ex.innerHTML =
      '<div class="en">' + esc(w.example_en || "") + "</div>" +
      '<div class="tr">' + esc(w.example_tr || "") + "</div>" +
      ((w.synonyms && w.synonyms.length)
        ? '<div class="syn">eş anlamlı: ' + esc(w.synonyms.join(", ")) + "</div>" : "");
    li.appendChild(ex);

    toggle.addEventListener("click", function () {
      ex.hidden = !ex.hidden;
      toggle.textContent = ex.hidden ? "Örnek cümle ▾" : "Örnek cümle ▴";
    });

    var check = document.createElement("label");
    check.className = "learn-check";
    var cb = document.createElement("input");
    cb.type = "checkbox";
    cb.checked = !!state.learned[w.id];
    cb.addEventListener("change", function () {
      setLearned(w.id, cb.checked);
      li.classList.toggle("is-learned", cb.checked);
    });
    check.appendChild(cb);
    check.appendChild(document.createTextNode("Öğrendim"));
    li.appendChild(check);

    return li;
  }

  /* ---------- flashcards ---------- */

  function buildDeck(shuffle) {
    var pool = filtered();
    if (shuffle) pool = shuffled(pool);
    state.cardDeck = pool;
    if (state.cardIndex >= pool.length) state.cardIndex = 0;
  }

  function showCard() {
    var deck = state.cardDeck;
    var hasCards = deck.length > 0;
    el.cardEmpty.hidden = hasCards;
    el.cardStage.hidden = !hasCards;
    el.cardShuffle.hidden = !hasCards;
    document.querySelector(".card-actions").hidden = !hasCards;
    document.querySelector(".card-nav").hidden = !hasCards;
    if (!hasCards) return;

    if (state.cardIndex >= deck.length) state.cardIndex = deck.length - 1;
    var w = deck[state.cardIndex];
    el.flashcard.classList.remove("is-flipped");
    el.cardLevelFront.textContent = w.level;
    el.cardWordFront.textContent = w.en;
    el.cardPosFront.textContent = w.pos || "";
    el.cardTr.textContent = (w.tr || []).join(", ");
    el.cardExEn.textContent = w.example_en || "";
    el.cardExTr.textContent = w.example_tr || "";
    el.cardSyn.textContent = (w.synonyms && w.synonyms.length) ? "eş anlamlı: " + w.synonyms.join(", ") : "";
    el.cardPos.textContent = (state.cardIndex + 1) + " / " + deck.length;
  }

  function flipCard() {
    if (!state.cardDeck.length) return;
    el.flashcard.classList.toggle("is-flipped");
  }

  function moveCard(delta) {
    if (!state.cardDeck.length) return;
    state.cardIndex = (state.cardIndex + delta + state.cardDeck.length) % state.cardDeck.length;
    showCard();
  }

  function markCard(known) {
    if (!state.cardDeck.length) return;
    var w = state.cardDeck[state.cardIndex];
    setLearned(w.id, known);
    if (state.cardIndex < state.cardDeck.length - 1) {
      state.cardIndex++;
    }
    // öğrenilmişleri gizliyorsak deste küçülebilir
    if (state.onlyUnlearned) {
      buildDeck(false);
    }
    showCard();
  }

  /* ---------- quiz ---------- */

  var QUIZ_INTRO_TEXT = "Seçili seviyeden 10 soruluk çoktan seçmeli test. İngilizce kelimenin Türkçe anlamını seç.";

  function resetQuizToIntro() {
    el.quizIntro.hidden = false;
    el.quizRun.hidden = true;
    el.quizResult.hidden = true;
    el.quizIntro.querySelector("p").textContent = QUIZ_INTRO_TEXT;
  }

  function startQuiz() {
    var pool = filtered();
    if (pool.length < 4) {
      el.quizIntro.hidden = false;
      el.quizRun.hidden = true;
      el.quizResult.hidden = true;
      el.quizIntro.querySelector("p").textContent =
        "Bu filtrede en az 4 kelime gerekli (şu an " + pool.length + "). Filtreyi genişletin.";
      return;
    }
    var n = Math.min(10, pool.length);
    var questions = shuffled(pool).slice(0, n).map(function (w) {
      return { word: w, options: makeOptions(w, pool), answered: false, correct: false };
    });
    state.quiz = { questions: questions, index: 0, score: 0, wrong: [] };
    el.quizIntro.hidden = true;
    el.quizResult.hidden = true;
    el.quizRun.hidden = false;
    renderQuizQuestion();
  }

  function makeOptions(correctWord, pool) {
    var correctText = (correctWord.tr || []).join(", ");
    var distractors = shuffled(pool.filter(function (w) { return w.id !== correctWord.id; }))
      .slice(0, 3)
      .map(function (w) { return (w.tr || []).join(", "); });
    return shuffled([correctText].concat(distractors)).map(function (text) {
      return { text: text, isCorrect: text === correctText };
    });
  }

  function renderQuizQuestion() {
    var q = state.quiz.questions[state.quiz.index];
    el.quizProgress.textContent = (state.quiz.index + 1) + " / " + state.quiz.questions.length;
    el.quizScore.textContent = "Doğru: " + state.quiz.score;
    el.quizLevel.textContent = q.word.level;
    el.quizWord.textContent = q.word.en;
    el.quizNext.hidden = true;
    el.quizOptions.innerHTML = "";
    q.options.forEach(function (opt) {
      var b = document.createElement("button");
      b.className = "quiz-opt";
      b.textContent = opt.text;
      b.addEventListener("click", function () { answerQuiz(opt, b); });
      el.quizOptions.appendChild(b);
    });
  }

  function answerQuiz(opt, btn) {
    var q = state.quiz.questions[state.quiz.index];
    if (q.answered) return;
    q.answered = true;
    q.correct = opt.isCorrect;
    var buttons = el.quizOptions.querySelectorAll(".quiz-opt");
    buttons.forEach(function (b) {
      b.disabled = true;
      if (b.textContent === (q.word.tr || []).join(", ")) b.classList.add("correct");
    });
    if (opt.isCorrect) {
      state.quiz.score++;
      setLearned(q.word.id, true);
    } else {
      btn.classList.add("wrong");
      state.quiz.wrong.push(q.word);
    }
    el.quizScore.textContent = "Doğru: " + state.quiz.score;
    el.quizNext.hidden = false;
    el.quizNext.textContent =
      state.quiz.index === state.quiz.questions.length - 1 ? "Sonucu gör" : "Sonraki";
  }

  function nextQuizQuestion() {
    if (state.quiz.index < state.quiz.questions.length - 1) {
      state.quiz.index++;
      renderQuizQuestion();
    } else {
      finishQuiz();
    }
  }

  function finishQuiz() {
    el.quizRun.hidden = true;
    el.quizResult.hidden = false;
    var total = state.quiz.questions.length;
    var score = state.quiz.score;
    el.quizFinal.textContent = score + " / " + total;

    var best = loadJSON(LS_BEST, {});
    var key = state.level;
    var pct = Math.round(score / total * 100);
    var prevPct = best[key] ? best[key].pct : -1;
    if (pct > prevPct) {
      best[key] = { pct: pct, score: score, total: total, date: new Date().toISOString().slice(0, 10) };
      saveJSON(LS_BEST, best);
      el.quizBest.textContent = "Yeni rekor! (" + labelLevel(key) + ")";
    } else {
      el.quizBest.textContent = "En iyi (" + labelLevel(key) + "): %" + best[key].pct;
    }

    el.quizWrong.innerHTML = "";
    if (state.quiz.wrong.length) {
      state.quiz.wrong.forEach(function (w) {
        var d = document.createElement("div");
        d.className = "qw";
        d.innerHTML = "<b>" + esc(w.en) + "</b> — <span>" + esc((w.tr || []).join(", ")) + "</span>";
        el.quizWrong.appendChild(d);
      });
    } else {
      el.quizWrong.innerHTML = '<div class="qw">Hepsi doğru! 🎉</div>';
    }
    renderProgress();
  }

  /* ---------- persistence ---------- */

  function setLearned(id, val) {
    if (val) state.learned[id] = 1;
    else delete state.learned[id];
    saveJSON(LS_LEARNED, state.learned);
    renderProgress();
  }

  function loadSet(key) { return loadJSON(key, {}); }

  function loadJSON(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) { return fallback; }
  }

  function saveJSON(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {}
  }

  /* ---------- helpers ---------- */

  function span(cls, text) {
    var s = document.createElement("span");
    s.className = cls;
    s.textContent = text;
    return s;
  }

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  function shuffled(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function labelLevel(k) { return k === "all" ? "Hepsi" : k; }
})();
