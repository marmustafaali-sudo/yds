/* YDS365 Kelime Çalışması — Soru Postu üretici (gerçek YDS sorularından,
   questions.json). post.js'in ikinci bölümü: kelime yerine gerçek soru +
   şıklar; görselde cevap YOK (takipçi tahmin etsin), cevap sadece Instagram
   açıklaması kutusunda (hashtag'in olduğu yerde) gösteriliyor. */
(function () {
  "use strict";

  var W = 1080, H = 1350;
  // Aynı güvenli marj mantığı (bkz. post.js) — Instagram kırpmasına karşı.
  var MARGIN = 150;
  var TEXT_W = W - MARGIN * 2;

  var STORY_H = 1920;
  var STORY_OFFSET_Y = (STORY_H - H) / 2;

  var serif = '"Playfair Display", Georgia, "Times New Roman", serif';

  var els = {};
  var questions = [];
  var examLabel = "";
  var current = null;
  var bgImg = null;
  var fontsReady = false;
  var renderQueued = false;
  var off = null, offCtx = null;
  var offS = null, offSCtx = null;

  document.addEventListener("DOMContentLoaded", function () {
    cache();
    bind();
    loadAssets();
    off = document.createElement("canvas");
    off.width = W; off.height = H;
    offCtx = off.getContext("2d");
    offS = document.createElement("canvas");
    offS.width = W; offS.height = STORY_H;
    offSCtx = offS.getContext("2d");

    fetch("questions.json")
      .then(function (r) { return r.json(); })
      .then(function (data) {
        examLabel = (data.meta && data.meta.exam) || "YDS";
        setQuestions(data.questions || []);
      })
      .catch(function () {
        if (els.hint) els.hint.textContent = "questions.json yüklenemedi. Yerel sunucu ile açın.";
      });
  });

  function cache() {
    els.canvas = document.getElementById("qCanvas");
    els.ctx = els.canvas.getContext("2d");
    els.select = document.getElementById("qSelect");
    els.prev = document.getElementById("qPrev");
    els.next = document.getElementById("qNext");
    els.random = document.getElementById("qRandom");
    els.download = document.getElementById("qDownload");
    els.downloadStory = document.getElementById("qDownloadStory");
    els.captionText = document.getElementById("qCaptionText");
    els.captionRegen = document.getElementById("qCaptionRegen");
    els.captionCopy = document.getElementById("qCaptionCopy");
    els.hint = document.querySelector("#view-qpost .post-hint");
  }

  function bind() {
    els.select.addEventListener("change", function () {
      current = questions[+els.select.value];
      render();
      renderCaption();
    });
    els.prev.addEventListener("click", function () { step(-1); });
    els.next.addEventListener("click", function () { step(1); });
    els.random.addEventListener("click", function () {
      if (!questions.length) return;
      els.select.value = Math.floor(Math.random() * questions.length);
      els.select.dispatchEvent(new Event("change"));
    });
    els.download.addEventListener("click", download);
    els.downloadStory.addEventListener("click", downloadStory);
    els.captionRegen.addEventListener("click", renderCaption);
    els.captionCopy.addEventListener("click", copyCaption);
  }

  function loadAssets() {
    bgImg = new Image();
    bgImg.onload = function () { render(); };
    bgImg.onerror = function () { render(); };
    bgImg.src = "ydbackground.jpg";

    var specs = [
      '700 44px "Playfair Display"',
      '500 34px "Playfair Display"',
      'italic 500 30px "Playfair Display"',
      '700 32px "Playfair Display"'
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

  function step(delta) {
    if (!questions.length) return;
    var i = (+els.select.value + delta + questions.length) % questions.length;
    els.select.value = i;
    els.select.dispatchEvent(new Event("change"));
  }

  function setQuestions(list) {
    questions = list.slice();
    els.select.innerHTML = "";
    questions.forEach(function (q, i) {
      var o = document.createElement("option");
      o.value = i;
      o.textContent = "Soru " + q.id + " (" + typeLabel(q.type) + ")";
      els.select.appendChild(o);
    });
    if (questions.length) {
      current = questions[0];
      els.select.value = 0;
      render();
      renderCaption();
    }
  }

  function typeLabel(t) {
    return ({
      cloze: "boşluk doldurma",
      paragraph_cloze: "parça — boşluk",
      sentence_completion: "cümle tamamlama",
      translation_en_tr: "çeviri EN→TR",
      translation_tr_en: "çeviri TR→EN",
      reading: "okuma parçası",
      dialogue: "diyalog tamamlama",
      restatement: "eş anlam / restatement",
      gap_sentence: "parça — cümle tamamlama",
      irrelevant_sentence: "anlam bütünlüğü"
    })[t] || t;
  }

  // Soru tipine göre: üstte gösterilecek "parça" (varsa) + asıl soru cümlesi/talimatı.
  function displayParts(q) {
    switch (q.type) {
      case "paragraph_cloze":
        return { passage: q.passage, stem: "Numaralı boşluğu (" + q.blank + ") en uygun şekilde tamamlayan seçenek hangisidir?" };
      case "gap_sentence":
        return { passage: q.passage, stem: "Parçada boş bırakılan yeri en uygun şekilde tamamlayan cümle hangisidir?" };
      case "irrelevant_sentence":
        return { passage: q.passage, stem: "Bu parçada anlatımın akışını bozan cümle hangisidir?" };
      case "dialogue":
        return { passage: q.passage, stem: "Diyalogda boş bırakılan yeri en uygun şekilde tamamlayan seçenek hangisidir?" };
      case "reading":
        return { passage: q.passage, stem: q.question };
      case "translation_en_tr":
        return { passage: q.question, stem: "Bu cümlenin Türkçe çevirisi olarak en uygun seçenek hangisidir?" };
      case "translation_tr_en":
        return { passage: q.question, stem: "Bu cümlenin İngilizce çevirisi olarak en uygun seçenek hangisidir?" };
      case "restatement":
        return { passage: q.question, stem: "Bu cümleye anlamca en yakın seçenek hangisidir?" };
      default: // cloze, sentence_completion
        return { passage: null, stem: q.question };
    }
  }

  function render() {
    if (renderQueued) return;
    renderQueued = true;
    requestAnimationFrame(function () {
      renderQueued = false;
      if (current) draw(els.ctx, current);
    });
  }

  /* ---------- ortak arka plan (post.js ile aynı görsel dil) ---------- */
  function drawBackground(ctx, hh) {
    hh = hh || H;
    ctx.clearRect(0, 0, W, hh);
    if (bgImg && bgImg.complete && bgImg.naturalWidth) {
      var scale = Math.max(W / bgImg.naturalWidth, hh / bgImg.naturalHeight);
      var dw = bgImg.naturalWidth * scale, dh = bgImg.naturalHeight * scale;
      ctx.drawImage(bgImg, (W - dw) / 2, (hh - dh) / 2, dw, dh);
    } else {
      ctx.fillStyle = "#15205f";
      ctx.fillRect(0, 0, W, hh);
    }
    ctx.fillStyle = "rgba(9,13,44,0.30)";
    ctx.fillRect(0, 0, W, hh);
    var g = ctx.createLinearGradient(0, 0, 0, hh);
    g.addColorStop(0, "rgba(4,6,22,0.55)");
    g.addColorStop(0.5, "rgba(4,6,22,0.60)");
    g.addColorStop(1, "rgba(3,5,18,0.72)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, hh);
  }

  // metni "\n" paragraflarına saygı göstererek + kelime kelime sarar
  function wrapMultiline(ctx, text, maxW) {
    var paras = String(text).split("\n");
    var lines = [];
    paras.forEach(function (p, idx) {
      if (!p) { lines.push(""); return; }
      var words = p.split(/\s+/);
      var line = "";
      for (var i = 0; i < words.length; i++) {
        var test = line ? line + " " + words[i] : words[i];
        if (ctx.measureText(test).width > maxW && line) {
          lines.push(line);
          line = words[i];
        } else line = test;
      }
      if (line) lines.push(line);
    });
    return lines;
  }

  // Bir kademedeki font boyutuyla metnin sarılmış satırlarını + yüksekliğini hesaplar.
  function measureBlock(ctx, text, weight, size, maxW, lhRatio) {
    ctx.font = weight + " " + size + "px " + serif;
    var lines = wrapMultiline(ctx, text, maxW);
    var lh = size * lhRatio;
    return { size: size, lines: lines, lh: lh, height: lines.length * lh };
  }

  function measureOptions(ctx, options, size, maxW, lhRatio) {
    var letters = ["A", "B", "C", "D", "E"];
    ctx.font = "500 " + size + "px " + serif;
    var lh = size * lhRatio;
    var gap = lh * 0.35;
    var blocks = letters.map(function (L) {
      return wrapMultiline(ctx, L + ")  " + (options[L] || ""), maxW);
    });
    var totalLines = blocks.reduce(function (n, b) { return n + b.length; }, 0);
    return { size: size, blocks: blocks, lh: lh, gap: gap, height: totalLines * lh + 4 * gap };
  }

  // Parça + soru cümlesi + şıkları TEK bir "kademe" listesi üzerinden BİRLİKTE
  // küçülterek dikeyde taşmayı önler (her blok ayrı ayrı küçültülürse toplam
  // yine de sığmayabiliyordu — uzun okuma parçası + uzun şıklar kombinasyonu
  // canvas'ın altından taşıyordu).
  var TIERS = [
    { passage: 30, stem: 40, opt: 32 },
    { passage: 28, stem: 36, opt: 30 },
    { passage: 26, stem: 33, opt: 28 },
    { passage: 24, stem: 30, opt: 26 },
    { passage: 22, stem: 27, opt: 24 },
    { passage: 20, stem: 25, opt: 22 },
    { passage: 18, stem: 23, opt: 20 },
    { passage: 16, stem: 21, opt: 18 }
  ];

  function layout(ctx, parts, options, maxW, available) {
    var gap = 34;
    var best = null;
    for (var i = 0; i < TIERS.length; i++) {
      var t = TIERS[i];
      var p = parts.passage ? measureBlock(ctx, parts.passage, "500", t.passage, maxW, 1.42) : null;
      var s = measureBlock(ctx, parts.stem, "700", t.stem, maxW, 1.28);
      var o = measureOptions(ctx, options, t.opt, maxW - 8, 1.3);
      var total = (p ? p.height + gap : 0) + s.height + gap + o.height;
      best = { passage: p, stem: s, opt: o, gap: gap, total: total };
      if (total <= available || i === TIERS.length - 1) break;
    }
    return best;
  }

  function draw(ctx, q, skipBg, hh) {
    hh = hh || H;
    if (!skipBg) drawBackground(ctx, hh);

    var parts = displayParts(q);
    ctx.textBaseline = "alphabetic";
    ctx.shadowColor = "rgba(0,0,0,0.6)";
    ctx.shadowBlur = 14;
    ctx.shadowOffsetY = 2;

    var y = MARGIN + 20;

    // üst etiket
    ctx.font = "italic 500 30px " + serif;
    ctx.fillStyle = "rgba(255,255,255,0.72)";
    ctx.fillText((examLabel || "YDS") + " · Soru " + q.id, MARGIN, y);
    y += 56;

    var bottomLimit = hh - MARGIN - 10;
    var available = bottomLimit - y;
    var L = layout(ctx, parts, q.options, TEXT_W, available);

    // kısa sorularda (çok az metin) altta boşluk kalmasın diye içeriği
    // dikeyde ortala; uzun sorularda zaten pay neredeyse doluyor, etkisi yok
    var slack = available - L.total;
    if (slack > 0) y += slack * 0.5;

    if (L.passage) {
      ctx.font = "500 " + L.passage.size + "px " + serif;
      ctx.fillStyle = "rgba(255,255,255,0.92)";
      L.passage.lines.forEach(function (line) {
        y += L.passage.lh;
        ctx.fillText(line, MARGIN, y);
      });
      y += L.gap;
    }

    ctx.font = "700 " + L.stem.size + "px " + serif;
    ctx.fillStyle = "#ffffff";
    L.stem.lines.forEach(function (line) {
      y += L.stem.lh;
      ctx.fillText(line, MARGIN, y);
    });
    y += L.gap;

    ctx.fillStyle = "rgba(255,255,255,0.94)";
    ctx.font = "500 " + L.opt.size + "px " + serif;
    L.opt.blocks.forEach(function (lines) {
      lines.forEach(function (line) {
        y += L.opt.lh;
        ctx.fillText(line, MARGIN, y);
      });
      y += L.opt.gap;
    });

    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
  }

  function drawStory(q, ctx) {
    drawBackground(ctx, STORY_H);
    ctx.save();
    ctx.translate(0, STORY_OFFSET_Y);
    draw(ctx, q, true, H);
    ctx.restore();
  }

  function slug(s) {
    return String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "soru";
  }

  function download() {
    if (!current) return;
    els.canvas.toBlob(function (blob) {
      if (!blob) return;
      var a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "yds-soru-" + current.id + ".png";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
    }, "image/png");
  }

  function downloadStory() {
    if (!current) return;
    drawStory(current, offSCtx);
    offS.toBlob(function (blob) {
      if (!blob) return;
      var a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "yds-soru-hikaye-" + current.id + ".png";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
    }, "image/png");
  }

  /* ---------- Instagram açıklaması: hashtag yerine CEVAP ---------- */

  function buildCaption(q) {
    if (!q) return "";
    var parts = displayParts(q);
    var lines = [];
    lines.push("🧠 " + (examLabel || "YDS") + " · Soru " + q.id);
    lines.push("");
    if (parts.passage) { lines.push(parts.passage); lines.push(""); }
    lines.push(parts.stem);
    lines.push("");
    ["A", "B", "C", "D", "E"].forEach(function (L) {
      lines.push(L + ") " + q.options[L]);
    });
    lines.push("");
    lines.push("✅ Doğru cevap: " + q.answer + ") " + q.options[q.answer]);
    lines.push("");
    lines.push("Her gün 1 soru pratiği için profildeki linkten kelime çalışma uygulamasını dene 👆");
    return lines.join("\n");
  }

  function renderCaption() {
    if (!els.captionText) return;
    els.captionText.value = buildCaption(current);
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
})();
