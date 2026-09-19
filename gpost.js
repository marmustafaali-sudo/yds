/* Günlük / İş İngilizcesi — Instagram post üretici. post.js ile aynı görsel
   sistem (arka plan, tipografi, MARGIN) ama ayrı kelime seti (gwords.json) ve
   ayrı localStorage anahtarları; post.js'e dokunmaz, bağımsız çalışır. */
(function () {
  "use strict";

  var W = 1080, H = 1350;
  var MARGIN = 150;
  var TEXT_W = W - MARGIN * 2;

  var STORY_H = 1920;
  var STORY_OFFSET_Y = (STORY_H - H) / 2;

  var QKEY = "gen.postQueue.v1";
  var SKEY = "gen.postStart.v1";
  var HKEY = "gen.captionHashtags.v1";
  var DEFAULT_HASHTAGS = "#ingilizce #ingilizceöğren #dailyenglish #businessenglish " +
    "#vocabulary #englishvocabulary #ingilizcekelime #kelime #dilöğren #studyenglish " +
    "#englishlearning #speakenglish #workplaceenglish #professionalenglish";
  var DAY = 86400000;

  var els = {};
  var words = [];
  var current = null;
  var bgImg = null;
  var fontsReady = false;
  var renderQueued = false;
  var queue = [];
  var off = null, offCtx = null;
  var offS = null, offSCtx = null;

  document.addEventListener("DOMContentLoaded", function () {
    cache();
    if (!els.canvas) return; // view yoksa (ör. eski sürüm) sessizce çık
    bind();
    loadAssets();
    off = document.createElement("canvas");
    off.width = W;
    off.height = H;
    offCtx = off.getContext("2d");
    offS = document.createElement("canvas");
    offS.width = W;
    offS.height = STORY_H;
    offSCtx = offS.getContext("2d");
    loadQueue();
    loadStart();
    renderQueue();
    els.captionHashtags.value = loadHashtags();
    loadWords();
  });

  function loadWords() {
    fetch("gwords.json")
      .then(function (r) { return r.json(); })
      .then(function (data) { setWords((data && data.words) || []); })
      .catch(function () {
        els.select.innerHTML = '<option>gwords.json yüklenemedi</option>';
      });
  }

  function cache() {
    els.canvas = document.getElementById("gPostCanvas");
    if (!els.canvas) return;
    els.ctx = els.canvas.getContext("2d");
    els.select = document.getElementById("gPostWordSelect");
    els.prev = document.getElementById("gPostPrev");
    els.next = document.getElementById("gPostNext");
    els.random = document.getElementById("gPostRandom");
    els.download = document.getElementById("gPostDownload");
    els.downloadStory = document.getElementById("gPostDownloadStory");
    els.fWord = document.getElementById("gfWord");
    els.fTr = document.getElementById("gfTr");
    els.fExEn = document.getElementById("gfExEn");
    els.fExTr = document.getElementById("gfExTr");
    els.fMark = document.getElementById("gfMark");
    els.qAdd = document.getElementById("gPostQueueAdd");
    els.qBulk = document.getElementById("gPostQueueBulk");
    els.qBulkLevel = document.getElementById("gPostBulkLevel");
    els.qList = document.getElementById("gPostQueueList");
    els.qCount = document.getElementById("gPostQueueCount");
    els.qDownload = document.getElementById("gPostQueueDownload");
    els.qClear = document.getElementById("gPostQueueClear");
    els.startDate = document.getElementById("gPostStartDate");
    els.today = document.getElementById("gPostToday");
    els.todayLabel = document.getElementById("gPostTodayLabel");
    els.todayDownload = document.getElementById("gPostTodayDownload");
    els.todayDownloadStory = document.getElementById("gPostTodayDownloadStory");
    els.captionText = document.getElementById("gCaptionText");
    els.captionHashtags = document.getElementById("gCaptionHashtags");
    els.captionRegen = document.getElementById("gCaptionRegen");
    els.captionCopy = document.getElementById("gCaptionCopy");
  }

  function bind() {
    els.select.addEventListener("change", function () {
      var w = words[+els.select.value];
      if (w) { current = w; fillFields(w); render(); renderCaption(); }
    });
    els.prev.addEventListener("click", function () { step(-1); });
    els.next.addEventListener("click", function () { step(1); });
    els.random.addEventListener("click", function () {
      if (!words.length) return;
      els.select.value = Math.floor(Math.random() * words.length);
      els.select.dispatchEvent(new Event("change"));
    });
    ["fWord", "fTr", "fExEn", "fExTr", "fMark"].forEach(function (k) {
      els[k].addEventListener("input", render);
    });
    els.download.addEventListener("click", download);
    els.downloadStory.addEventListener("click", downloadStory);

    els.captionRegen.addEventListener("click", renderCaption);
    els.captionCopy.addEventListener("click", copyCaption);
    els.captionHashtags.addEventListener("input", function () {
      saveHashtags(els.captionHashtags.value);
      renderCaption();
    });

    els.qAdd.addEventListener("click", function () { addModel(model()); });
    els.qBulk.addEventListener("click", function () { bulkAdd(els.qBulkLevel.value); });
    els.qDownload.addEventListener("click", downloadQueue);
    els.qClear.addEventListener("click", function () {
      if (!queue.length) return;
      queue = [];
      saveQueue();
      renderQueue();
    });
    els.startDate.addEventListener("change", function () { saveStart(); renderQueue(); });
    els.todayDownload.addEventListener("click", function () {
      var i = todayIdx();
      if (i >= 0 && i < queue.length) downloadOne(queue[i], i);
    });
    els.todayDownloadStory.addEventListener("click", function () {
      var i = todayIdx();
      if (i >= 0 && i < queue.length) downloadOneStory(queue[i], i);
    });
  }

  function loadAssets() {
    if (window.YDSBackground) {
      window.YDSBackground.getImage(function (img) { bgImg = img; render(); });
    } else {
      bgImg = new Image();
      bgImg.onload = function () { render(); };
      bgImg.onerror = function () { render(); };
      bgImg.src = "ydbackground.jpg";
    }
    document.addEventListener("yds:bgchange", function (e) {
      bgImg = e.detail.image;
      render();
    });

    var specs = [
      '700 118px "Playfair Display"',
      '500 50px "Playfair Display"',
      'italic 500 50px "Playfair Display"',
      'italic 400 32px "Playfair Display"'
    ];
    if (document.fonts && document.fonts.load) {
      Promise.all(specs.map(function (s) { return document.fonts.load(s).catch(function () {}); }))
        .then(function () { return document.fonts.ready; })
        .then(function () { fontsReady = true; render(); })
        .catch(function () { fontsReady = true; render(); });
    } else {
      fontsReady = true;
    }
  }

  function setWords(list) {
    words = list.slice();
    els.select.innerHTML = "";
    words.forEach(function (w, i) {
      var o = document.createElement("option");
      o.value = i;
      o.textContent = w.en + "  (" + w.level + ")";
      els.select.appendChild(o);
    });
    if (words.length) {
      current = words[0];
      els.select.value = 0;
      fillFields(current);
      renderCaption();
    }
    render();
  }

  function step(delta) {
    if (!words.length) return;
    var i = (+els.select.value + delta + words.length) % words.length;
    els.select.value = i;
    els.select.dispatchEvent(new Event("change"));
  }

  function fillFields(w) {
    els.fWord.value = w.en;
    els.fTr.value = (w.tr || []).join(", ");
    els.fExEn.value = w.example_en || "";
    els.fExTr.value = w.example_tr || "";
  }

  function model() {
    return {
      word: (els.fWord.value || "").trim(),
      tr: (els.fTr.value || "").trim(),
      exEn: (els.fExEn.value || "").trim(),
      exTr: (els.fExTr.value || "").trim(),
      mark: (els.fMark.value || "").trim()
    };
  }

  function render() {
    if (renderQueued) return;
    renderQueued = true;
    requestAnimationFrame(function () {
      renderQueued = false;
      draw(model());
    });
  }

  function drawBackground(ctx, hh) {
    hh = hh || H;
    ctx.clearRect(0, 0, W, hh);

    if (bgImg && bgImg.complete && bgImg.naturalWidth) {
      drawCover(ctx, bgImg, W, hh);
    } else {
      ctx.fillStyle = "#15205f";
      ctx.fillRect(0, 0, W, hh);
    }

    ctx.fillStyle = "rgba(9,13,44,0.12)";
    ctx.fillRect(0, 0, W, hh);

    var g = ctx.createLinearGradient(0, hh * 0.30, 0, hh);
    g.addColorStop(0, "rgba(5,8,26,0)");
    g.addColorStop(0.45, "rgba(5,8,26,0.45)");
    g.addColorStop(0.75, "rgba(4,6,22,0.80)");
    g.addColorStop(1, "rgba(3,5,18,0.94)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, hh);

    var vg = ctx.createRadialGradient(W / 2, hh * 0.42, hh * 0.30, W / 2, hh * 0.5, hh * 0.75);
    vg.addColorStop(0, "rgba(0,0,0,0)");
    vg.addColorStop(1, "rgba(0,0,0,0.32)");
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, W, hh);
  }

  function draw(m, ctx, skipBg) {
    ctx = ctx || els.ctx;
    if (!skipBg) drawBackground(ctx);

    var serif = '"Playfair Display", Georgia, "Times New Roman", serif';
    ctx.textBaseline = "alphabetic";

    ctx.shadowColor = "rgba(0,0,0,0.55)";
    ctx.shadowBlur = 16;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 3;

    if (m.mark) {
      ctx.font = "700 56px " + serif;
      ctx.fillStyle = "rgba(255,255,255,0.22)";
      ctx.fillText(m.mark, MARGIN, 162);
    }

    var word = m.word.toLowerCase();
    if (word && word.slice(-1) !== ".") word += ".";
    var wordSize = fitFont(ctx, word, "700", serif, 118, 62, TEXT_W);
    var y = 756;
    ctx.font = "700 " + wordSize + "px " + serif;
    ctx.fillStyle = "#ffffff";
    ctx.fillText(word, MARGIN, y);

    if (m.tr) {
      y += 92;
      ctx.font = "italic 500 50px " + serif;
      ctx.fillStyle = "rgba(255,255,255,0.96)";
      y = wrapText(ctx, m.tr, MARGIN, y, TEXT_W, 66);
    }

    if (m.exEn || m.exTr) {
      y += 42;
      ctx.shadowBlur = 6;
      ctx.fillStyle = "rgba(255,255,255,0.5)";
      ctx.fillRect(MARGIN, y, 72, 3);
      ctx.shadowBlur = 16;
      y += 44;
    }

    if (m.exEn) {
      ctx.font = "italic 400 33px " + serif;
      ctx.fillStyle = "rgba(255,255,255,0.88)";
      y = wrapText(ctx, m.exEn, MARGIN, y, TEXT_W, 47);
      y += 12;
    }
    if (m.exTr) {
      ctx.font = "400 30px " + serif;
      ctx.fillStyle = "rgba(255,255,255,0.68)";
      y = wrapText(ctx, m.exTr, MARGIN, y, TEXT_W, 44);
    }

    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
  }

  function drawCover(ctx, img, w, h) {
    var scale = Math.max(w / img.naturalWidth, h / img.naturalHeight);
    var dw = img.naturalWidth * scale;
    var dh = img.naturalHeight * scale;
    ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
  }

  function fitFont(ctx, text, weight, family, start, min, maxW) {
    var size = start;
    while (size > min) {
      ctx.font = weight + " " + size + "px " + family;
      if (ctx.measureText(text).width <= maxW) break;
      size -= 4;
    }
    return size;
  }

  function wrapText(ctx, text, x, y, maxW, lh) {
    var parts = String(text).split(/\s+/);
    var line = "";
    for (var i = 0; i < parts.length; i++) {
      var test = line ? line + " " + parts[i] : parts[i];
      if (ctx.measureText(test).width > maxW && line) {
        ctx.fillText(line, x, y);
        line = parts[i];
        y += lh;
      } else {
        line = test;
      }
    }
    if (line) { ctx.fillText(line, x, y); y += lh; }
    return y;
  }

  function drawStory(m, ctx) {
    drawBackground(ctx, STORY_H);
    ctx.save();
    ctx.translate(0, STORY_OFFSET_Y);
    draw(m, ctx, true);
    ctx.restore();
  }

  function download() {
    var m = model();
    els.canvas.toBlob(function (blob) {
      if (!blob) return;
      var a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "genel-" + slug(m.word || "post") + ".png";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
    }, "image/png");
  }

  function downloadStory() {
    var m = model();
    drawStory(m, offSCtx);
    offS.toBlob(function (blob) {
      if (!blob) return;
      var a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "genel-hikaye-" + slug(m.word || "post") + ".png";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
    }, "image/png");
  }

  function slug(s) {
    return String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "post";
  }

  /* ---------- Instagram açıklaması (caption) + hashtag ---------- */

  function loadHashtags() {
    try {
      var v = localStorage.getItem(HKEY);
      if (v && v.trim()) return v;
    } catch (e) {}
    return DEFAULT_HASHTAGS;
  }

  function saveHashtags(v) {
    try { localStorage.setItem(HKEY, v); } catch (e) {}
  }

  function buildCaption(m) {
    if (!m || !m.word) return "";
    var word = m.word.trim().toLowerCase();
    var lines = [];
    lines.push("📚 Bugünün kelimesi: " + word);
    if (m.tr) lines.push("🇹🇷 " + m.tr);
    lines.push("");
    if (m.exEn) lines.push("💬 " + m.exEn);
    if (m.exTr) lines.push("🔎 " + m.exTr);
    lines.push("");
    lines.push("Günlük hayatta ve iş yerinde en çok kullanılan İngilizce kelimeler 🎯");
    lines.push("Profildeki linkten kelime çalışma uygulamasını dene 👆");
    var tags = (els.captionHashtags.value || DEFAULT_HASHTAGS).trim();
    if (tags) { lines.push(""); lines.push(tags); }
    return lines.join("\n");
  }

  function renderCaption() {
    if (!els.captionText) return;
    els.captionText.value = buildCaption(model());
  }

  function copyCaption() {
    var text = els.captionText.value;
    if (!text) return;
    var done = function () {
      els.captionCopy.textContent = "✓ Kopyalandı";
      els.captionCopy.classList.add("is-copied");
      setTimeout(function () {
        els.captionCopy.textContent = "📋 Kopyala";
        els.captionCopy.classList.remove("is-copied");
      }, 1600);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(function () { fallbackCopy(text, done); });
    } else {
      fallbackCopy(text, done);
    }
  }

  function fallbackCopy(text, done) {
    try {
      els.captionText.focus();
      els.captionText.select();
      document.execCommand("copy");
      done();
    } catch (e) {}
  }

  /* ---------- günlük takvim (post kuyruğu) ---------- */

  function loadQueue() {
    try {
      var raw = localStorage.getItem(QKEY);
      queue = raw ? JSON.parse(raw) : [];
    } catch (e) { queue = []; }
    if (!Array.isArray(queue)) queue = [];
  }

  function saveQueue() {
    try { localStorage.setItem(QKEY, JSON.stringify(queue)); } catch (e) {}
  }

  function isoLocal(d) {
    var m = d.getMonth() + 1, day = d.getDate();
    return d.getFullYear() + "-" + (m < 10 ? "0" : "") + m + "-" + (day < 10 ? "0" : "") + day;
  }

  function loadStart() {
    var v = "";
    try { v = localStorage.getItem(SKEY) || ""; } catch (e) {}
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) v = isoLocal(new Date());
    els.startDate.value = v;
  }

  function saveStart() {
    try { localStorage.setItem(SKEY, els.startDate.value || ""); } catch (e) {}
  }

  function startMidnight() {
    var v = els.startDate && els.startDate.value;
    var d = /^\d{4}-\d{2}-\d{2}$/.test(v) ? new Date(v + "T00:00:00") : new Date();
    if (isNaN(d.getTime())) d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  }

  function dateForIndex(i) {
    return new Date(startMidnight() + i * DAY);
  }

  function todayIdx() {
    var now = new Date();
    var t = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    return Math.round((t - startMidnight()) / DAY);
  }

  function fmtDate(d) {
    try {
      return d.toLocaleDateString("tr-TR", { day: "numeric", month: "short", weekday: "short" });
    } catch (e) {
      return isoLocal(d);
    }
  }

  function addModel(m) {
    if (!m || !m.word) return;
    var key = m.word.toLowerCase();
    for (var i = 0; i < queue.length; i++) {
      if ((queue[i].word || "").toLowerCase() === key) {
        queue[i] = m;
        saveQueue();
        renderQueue();
        return;
      }
    }
    queue.push(m);
    saveQueue();
    renderQueue();
  }

  function bulkAdd(level) {
    var mark = (els.fMark.value || "").trim();
    words.forEach(function (w) {
      if (level !== "all" && w.level !== level) return;
      addModel({
        word: w.en,
        tr: (w.tr || []).join(", "),
        exEn: w.example_en || "",
        exTr: w.example_tr || "",
        mark: mark
      });
    });
  }

  function loadModelToFields(m) {
    els.fWord.value = m.word || "";
    els.fTr.value = m.tr || "";
    els.fExEn.value = m.exEn || "";
    els.fExTr.value = m.exTr || "";
    els.fMark.value = m.mark || "";
    render();
    renderCaption();
  }

  function renderQueue() {
    if (!els.qList) return;
    var ti = todayIdx();
    els.qCount.textContent = queue.length + " gün";
    els.qList.innerHTML = "";
    queue.forEach(function (m, i) {
      var li = document.createElement("li");
      li.className = "post-queue-item" + (i === ti ? " is-today" : "");

      var t = document.createElement("span");
      t.className = "pqi-text";
      t.textContent = fmtDate(dateForIndex(i)) + " · " + m.word;

      var open = document.createElement("button");
      open.className = "btn-ghost pqi-btn";
      open.textContent = "Aç";
      open.addEventListener("click", function () { loadModelToFields(m); });

      var dl = document.createElement("button");
      dl.className = "btn-ghost pqi-btn";
      dl.textContent = "↓";
      dl.addEventListener("click", function () { downloadOne(m, i); });

      var rm = document.createElement("button");
      rm.className = "btn-ghost pqi-btn";
      rm.textContent = "✕";
      rm.addEventListener("click", function () {
        queue.splice(i, 1);
        saveQueue();
        renderQueue();
      });

      li.appendChild(t);
      li.appendChild(open);
      li.appendChild(dl);
      li.appendChild(rm);
      els.qList.appendChild(li);
    });
    els.qDownload.disabled = queue.length === 0;

    if (ti >= 0 && ti < queue.length) {
      els.today.hidden = false;
      els.todayLabel.textContent =
        "Bugün (" + fmtDate(new Date()) + ") · gün " + (ti + 1) + ": " + queue[ti].word;
    } else {
      els.today.hidden = true;
    }
  }

  function downloadOne(m, idx) {
    if (!m || !m.word) return;
    draw(m, offCtx);
    off.toBlob(function (blob) {
      if (!blob) return;
      var a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "genel-" + pad2(idx + 1) + "-" + slug(m.word || "post") + ".png";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
    }, "image/png");
  }

  function downloadOneStory(m, idx) {
    if (!m || !m.word) return;
    drawStory(m, offSCtx);
    offS.toBlob(function (blob) {
      if (!blob) return;
      var a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "genel-hikaye-" + pad2(idx + 1) + "-" + slug(m.word || "post") + ".png";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
    }, "image/png");
  }

  function pad2(n) { return (n < 10 ? "0" : "") + n; }

  function downloadQueue() {
    if (!queue.length) return;
    var i = 0;
    els.qDownload.disabled = true;
    els.qClear.disabled = true;

    function step() {
      if (i >= queue.length) {
        els.qDownload.disabled = false;
        els.qClear.disabled = false;
        els.qDownload.textContent = "Tüm takvimi tek seferde indir";
        return;
      }
      var m = queue[i];
      els.qDownload.textContent = "İndiriliyor… " + (i + 1) + " / " + queue.length;
      draw(m, offCtx);
      off.toBlob(function (blob) {
        if (blob) {
          var a = document.createElement("a");
          a.href = URL.createObjectURL(blob);
          a.download = "genel-" + pad2(i + 1) + "-" + slug(m.word || "post") + ".png";
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
        }
        i++;
        setTimeout(step, 450);
      }, "image/png");
    }
    step();
  }
})();
