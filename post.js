/* YDS Kelime — Instagram post üretici (Faz 2+3).
   1080x1350 canvas, ydbackground.jpg + koyu katman + serif metin. örnek.jpg düzeni. */
(function () {
  "use strict";

  var W = 1080, H = 1350;
  var MARGIN = 96;
  var TEXT_W = W - MARGIN - 90;

  var QKEY = "yds.postQueue.v1";
  var SKEY = "yds.postStart.v1";
  var DAY = 86400000;

  var els = {};
  var words = [];
  var current = null;
  var bgImg = null;
  var fontsReady = false;
  var renderQueued = false;
  var queue = [];
  var off = null, offCtx = null;

  document.addEventListener("DOMContentLoaded", function () {
    cache();
    bind();
    loadAssets();
    off = document.createElement("canvas");
    off.width = W;
    off.height = H;
    offCtx = off.getContext("2d");
    loadQueue();
    loadStart();
    renderQueue();
    renderCd();
    if (window.YDSWords && window.YDSWords.length) {
      setWords(window.YDSWords);
    } else {
      document.addEventListener("yds:words", function () { setWords(window.YDSWords || []); }, { once: true });
    }
  });

  function cache() {
    els.canvas = document.getElementById("postCanvas");
    els.ctx = els.canvas.getContext("2d");
    els.select = document.getElementById("postWordSelect");
    els.prev = document.getElementById("postPrev");
    els.next = document.getElementById("postNext");
    els.random = document.getElementById("postRandom");
    els.download = document.getElementById("postDownload");
    els.fWord = document.getElementById("fWord");
    els.fTr = document.getElementById("fTr");
    els.fExEn = document.getElementById("fExEn");
    els.fExTr = document.getElementById("fExTr");
    els.fMark = document.getElementById("fMark");
    els.qAdd = document.getElementById("postQueueAdd");
    els.qBulk = document.getElementById("postQueueBulk");
    els.qBulkLevel = document.getElementById("postBulkLevel");
    els.qList = document.getElementById("postQueueList");
    els.qCount = document.getElementById("postQueueCount");
    els.qDownload = document.getElementById("postQueueDownload");
    els.qClear = document.getElementById("postQueueClear");
    els.startDate = document.getElementById("postStartDate");
    els.today = document.getElementById("postToday");
    els.todayLabel = document.getElementById("postTodayLabel");
    els.todayDownload = document.getElementById("postTodayDownload");
    els.cdLabel = document.getElementById("cdLabel");
    els.cdDate = document.getElementById("cdDate");
    els.cdInfo = document.getElementById("cdInfo");
    els.cdCanvas = document.getElementById("cdCanvas");
    els.cdCtx = els.cdCanvas.getContext("2d");
    els.cdDownload = document.getElementById("cdDownload");
  }

  function bind() {
    els.select.addEventListener("change", function () {
      var w = words[+els.select.value];
      if (w) { current = w; fillFields(w); render(); }
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

    els.cdLabel.addEventListener("input", renderCd);
    els.cdDate.addEventListener("input", renderCd);
    els.cdDate.addEventListener("change", renderCd);
    els.cdDownload.addEventListener("click", downloadCd);
  }

  function loadAssets() {
    bgImg = new Image();
    bgImg.onload = function () { render(); renderCd(); };
    bgImg.onerror = function () { render(); renderCd(); };
    bgImg.src = "ydbackground.jpg";

    var specs = [
      '700 118px "Playfair Display"',
      '700 400px "Playfair Display"',
      '500 74px "Playfair Display"',
      '500 50px "Playfair Display"',
      'italic 500 50px "Playfair Display"',
      'italic 400 32px "Playfair Display"'
    ];
    if (document.fonts && document.fonts.load) {
      Promise.all(specs.map(function (s) { return document.fonts.load(s).catch(function () {}); }))
        .then(function () { return document.fonts.ready; })
        .then(function () { fontsReady = true; render(); renderCd(); })
        .catch(function () { fontsReady = true; render(); renderCd(); });
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

  // ortak arka plan: İznik deseni cover + koyu alt gradyan + vinyet
  function drawBackground(ctx) {
    ctx.clearRect(0, 0, W, H);

    if (bgImg && bgImg.complete && bgImg.naturalWidth) {
      drawCover(ctx, bgImg, W, H);
    } else {
      ctx.fillStyle = "#15205f";
      ctx.fillRect(0, 0, W, H);
    }

    ctx.fillStyle = "rgba(9,13,44,0.12)";
    ctx.fillRect(0, 0, W, H);

    var g = ctx.createLinearGradient(0, H * 0.30, 0, H);
    g.addColorStop(0, "rgba(5,8,26,0)");
    g.addColorStop(0.45, "rgba(5,8,26,0.45)");
    g.addColorStop(0.75, "rgba(4,6,22,0.80)");
    g.addColorStop(1, "rgba(3,5,18,0.94)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    var vg = ctx.createRadialGradient(W / 2, H * 0.42, H * 0.30, W / 2, H * 0.5, H * 0.75);
    vg.addColorStop(0, "rgba(0,0,0,0)");
    vg.addColorStop(1, "rgba(0,0,0,0.32)");
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, W, H);
  }

  function draw(m, ctx) {
    ctx = ctx || els.ctx;
    drawBackground(ctx);

    var serif = '"Playfair Display", Georgia, "Times New Roman", serif';
    ctx.textBaseline = "alphabetic";

    // tüm metin için okunurluk gölgesi
    ctx.shadowColor = "rgba(0,0,0,0.55)";
    ctx.shadowBlur = 16;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 3;

    // filigran (sol üst)
    if (m.mark) {
      ctx.font = "700 56px " + serif;
      ctx.fillStyle = "rgba(255,255,255,0.22)";
      ctx.fillText(m.mark, MARGIN, 162);
    }

    // kelime — büyük serif, küçük harf + nokta
    var word = m.word.toLowerCase();
    if (word && word.slice(-1) !== ".") word += ".";
    var wordSize = fitFont(ctx, word, "700", serif, 118, 62, TEXT_W);
    var y = 756;
    ctx.font = "700 " + wordSize + "px " + serif;
    ctx.fillStyle = "#ffffff";
    ctx.fillText(word, MARGIN, y);

    // Türkçe anlam — italik serif
    if (m.tr) {
      y += 92;
      ctx.font = "italic 500 50px " + serif;
      ctx.fillStyle = "rgba(255,255,255,0.96)";
      y = wrapText(ctx, m.tr, MARGIN, y, 820, 66);
    }

    // ince çizgi
    if (m.exEn || m.exTr) {
      y += 42;
      ctx.shadowBlur = 6;
      ctx.fillStyle = "rgba(255,255,255,0.5)";
      ctx.fillRect(MARGIN, y, 72, 3);
      ctx.shadowBlur = 16;
      y += 44;
    }

    // örnek cümle EN
    if (m.exEn) {
      ctx.font = "italic 400 33px " + serif;
      ctx.fillStyle = "rgba(255,255,255,0.88)";
      y = wrapText(ctx, m.exEn, MARGIN, y, 860, 47);
      y += 12;
    }
    // örnek cümle TR
    if (m.exTr) {
      ctx.font = "400 30px " + serif;
      ctx.fillStyle = "rgba(255,255,255,0.68)";
      y = wrapText(ctx, m.exTr, MARGIN, y, 860, 44);
    }

    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
  }

  // ratio'dan bağımsız güvenli "cover": kısa kenarı doldur, taşan kısmı ortala
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

  // metni satırlara böl, çizer, son satırın alt y'sini döndürür
  function wrapText(ctx, text, x, y, maxW, lh) {
    var words = String(text).split(/\s+/);
    var line = "";
    for (var i = 0; i < words.length; i++) {
      var test = line ? line + " " + words[i] : words[i];
      if (ctx.measureText(test).width > maxW && line) {
        ctx.fillText(line, x, y);
        line = words[i];
        y += lh;
      } else {
        line = test;
      }
    }
    if (line) { ctx.fillText(line, x, y); y += lh; }
    return y;
  }

  function download() {
    var m = model();
    els.canvas.toBlob(function (blob) {
      if (!blob) return;
      var a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "yds-" + slug(m.word || "post") + ".png";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
    }, "image/png");
  }

  function slug(s) {
    return String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "post";
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

  // aynı kelime varsa günceller, yoksa ekler
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
      a.download = "yds-" + pad2(idx + 1) + "-" + slug(m.word || "post") + ".png";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
    }, "image/png");
  }

  function pad2(n) { return (n < 10 ? "0" : "") + n; }

  // kuyruğu tek tek offscreen canvas'a çizip sırayla indirir
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
          a.download = "yds-" + pad2(i + 1) + "-" + slug(m.word || "post") + ".png";
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

  /* ---------- geri sayım postu ---------- */

  var cdQueued = false;

  function daysUntil(iso) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(iso || "")) return null;
    var ex = new Date(iso + "T00:00:00");
    if (isNaN(ex.getTime())) return null;
    var now = new Date();
    var t0 = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    var t1 = new Date(ex.getFullYear(), ex.getMonth(), ex.getDate()).getTime();
    return Math.round((t1 - t0) / DAY);
  }

  function fmtLong(iso) {
    var d = new Date(iso + "T00:00:00");
    if (isNaN(d.getTime())) return iso || "";
    try {
      return d.toLocaleDateString("tr-TR", {
        day: "numeric", month: "long", year: "numeric", weekday: "long"
      });
    } catch (e) { return iso || ""; }
  }

  function updateCdInfo() {
    var days = daysUntil(els.cdDate.value);
    if (days === null) { els.cdInfo.textContent = "Geçerli bir tarih seç."; return; }
    els.cdInfo.textContent = fmtLong(els.cdDate.value) + " · " +
      (days > 0 ? days + " gün kaldı" : days === 0 ? "sınav bugün" : "sınav geçti");
  }

  function renderCd() {
    if (!els.cdCtx) return;
    updateCdInfo();
    if (cdQueued) return;
    cdQueued = true;
    requestAnimationFrame(function () {
      cdQueued = false;
      drawCountdown();
    });
  }

  function drawCountdown() {
    var ctx = els.cdCtx;
    drawBackground(ctx);

    // orta bandı biraz daha koyulaştır (metin ortada)
    var mg = ctx.createLinearGradient(0, H * 0.16, 0, H * 0.88);
    mg.addColorStop(0, "rgba(4,6,22,0)");
    mg.addColorStop(0.5, "rgba(4,6,22,0.55)");
    mg.addColorStop(1, "rgba(4,6,22,0)");
    ctx.fillStyle = mg;
    ctx.fillRect(0, 0, W, H);

    var serif = '"Playfair Display", Georgia, "Times New Roman", serif';
    var label = (els.cdLabel.value || "YDS").trim() || "YDS";
    var days = daysUntil(els.cdDate.value);

    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.shadowColor = "rgba(0,0,0,0.6)";
    ctx.shadowBlur = 24;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 4;

    var cx = W / 2;
    var red = "#e4322b";

    if (days === null) {
      ctx.font = "italic 500 52px " + serif;
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      ctx.fillText("Sınav tarihi seç", cx, H / 2);
      cdReset(ctx);
      return;
    }

    if (days <= 0) {
      ctx.fillStyle = "rgba(255,255,255,0.96)";
      ctx.font = "500 84px " + serif;
      ctx.fillText(label + " sınavı", cx, H * 0.47);
      ctx.fillStyle = red;
      ctx.font = "700 132px " + serif;
      ctx.shadowBlur = 34;
      ctx.fillText(days === 0 ? "bugün!" : "geçti", cx, H * 0.60);
      cdReset(ctx);
      return;
    }

    // üst satır
    ctx.fillStyle = "rgba(255,255,255,0.96)";
    ctx.font = "500 74px " + serif;
    ctx.fillText(label + " sınavına", cx, H * 0.34);

    // büyük sayı — kırmızı
    var numSize = fitFont(ctx, String(days), "700", serif, 400, 150, W - 150);
    ctx.font = "700 " + numSize + "px " + serif;
    ctx.fillStyle = red;
    ctx.shadowBlur = 36;
    ctx.fillText(String(days), cx, H * 0.585);
    ctx.shadowBlur = 24;

    // alt satır
    ctx.fillStyle = "rgba(255,255,255,0.96)";
    ctx.font = "500 74px " + serif;
    ctx.fillText("gün kaldı !", cx, H * 0.70);

    // tarih
    ctx.fillStyle = "rgba(255,255,255,0.62)";
    ctx.font = "italic 400 34px " + serif;
    ctx.fillText(fmtLong(els.cdDate.value), cx, H * 0.785);

    cdReset(ctx);
  }

  function cdReset(ctx) {
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    ctx.textAlign = "left";
  }

  function downloadCd() {
    var days = daysUntil(els.cdDate.value);
    els.cdCanvas.toBlob(function (blob) {
      if (!blob) return;
      var a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "yds-geri-sayim-" + (days != null && days > 0 ? days + "-gun" : "post") + ".png";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
    }, "image/png");
  }
})();
