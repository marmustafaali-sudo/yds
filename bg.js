/* YDS365 Kelime Çalışması — post arka planı yöneticisi.
   Ana tema (İznik lale, ydbackground.jpg) varsayılan olarak kalır; kullanıcı
   özel günler için ek arka plan yükleyip seçebilir. post.js + qpost.js bu
   modülden görsel alır, "yds:bgchange" olayını dinleyip yeniden çizer. */
(function () {
  "use strict";

  var CKEY = "yds.customBackgrounds.v1";
  var SKEY = "yds.selectedBackgroundId.v1";
  var MAX_DIM = 1600;

  var DEFAULT_BG = { id: "default", name: "İznik Lale (varsayılan)", url: "ydbackground.jpg" };

  var custom = [];
  var selectedId = "default";
  var cache = {};
  var selects = [], addInputs = [], removeBtns = [], thumbs = [];

  function loadCustom() {
    try {
      var raw = localStorage.getItem(CKEY);
      custom = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(custom)) custom = [];
    } catch (e) { custom = []; }
  }

  function saveCustom() {
    try {
      localStorage.setItem(CKEY, JSON.stringify(custom));
    } catch (e) {
      alert("Arka plan kaydedilemedi (depolama dolu olabilir). Eski bir arka planı silip tekrar dene.");
    }
  }

  function loadSelected() {
    try { selectedId = localStorage.getItem(SKEY) || "default"; } catch (e) { selectedId = "default"; }
  }

  function saveSelected() {
    try { localStorage.setItem(SKEY, selectedId); } catch (e) {}
  }

  function allBgs() {
    return [DEFAULT_BG].concat(custom);
  }

  function findBg(id) {
    var list = allBgs();
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return DEFAULT_BG;
  }

  function customExists(id) {
    for (var i = 0; i < custom.length; i++) if (custom[i].id === id) return true;
    return false;
  }

  function loadImage(bg, cb) {
    if (cache[bg.id] && cache[bg.id].complete && cache[bg.id].naturalWidth) { cb(cache[bg.id]); return; }
    var img = new Image();
    img.onload = function () { cache[bg.id] = img; cb(img); };
    img.onerror = function () { cb(null); };
    img.src = bg.url;
  }

  function getImage(cb) {
    loadImage(findBg(selectedId), cb);
  }

  function select(id) {
    selectedId = id;
    saveSelected();
    renderControls();
    getImage(function (img) {
      document.dispatchEvent(new CustomEvent("yds:bgchange", { detail: { id: id, image: img } }));
    });
  }

  function genId() {
    return "bg" + Date.now() + Math.floor(Math.random() * 1000);
  }

  function addFile(file) {
    if (!file || !/^image\//.test(file.type)) return;
    var reader = new FileReader();
    reader.onload = function () {
      var probe = new Image();
      probe.onload = function () {
        var scale = Math.min(1, MAX_DIM / Math.max(probe.naturalWidth, probe.naturalHeight));
        var w = Math.max(1, Math.round(probe.naturalWidth * scale));
        var h = Math.max(1, Math.round(probe.naturalHeight * scale));
        var c = document.createElement("canvas");
        c.width = w; c.height = h;
        c.getContext("2d").drawImage(probe, 0, 0, w, h);
        var dataUrl = c.toDataURL("image/jpeg", 0.85);
        var name = (file.name || "Arka plan").replace(/\.[a-z0-9]+$/i, "").slice(0, 40) || "Arka plan";
        var entry = { id: genId(), name: name, url: dataUrl };
        custom.push(entry);
        saveCustom();
        renderControls();
        select(entry.id);
      };
      probe.onerror = function () { alert("Görsel okunamadı."); };
      probe.src = reader.result;
    };
    reader.onerror = function () { alert("Dosya okunamadı."); };
    reader.readAsDataURL(file);
  }

  function removeSelected() {
    if (selectedId === "default") return;
    var idx = -1;
    for (var i = 0; i < custom.length; i++) if (custom[i].id === selectedId) { idx = i; break; }
    if (idx === -1) return;
    if (!confirm('"' + custom[idx].name + '" arka planını silmek istediğine emin misin?')) return;
    custom.splice(idx, 1);
    saveCustom();
    delete cache[selectedId];
    select("default");
  }

  function renderControls() {
    var list = allBgs();
    selects.forEach(function (sel) {
      sel.innerHTML = "";
      list.forEach(function (bg) {
        var o = document.createElement("option");
        o.value = bg.id;
        o.textContent = bg.name;
        sel.appendChild(o);
      });
      sel.value = selectedId;
    });
    removeBtns.forEach(function (btn) { btn.disabled = (selectedId === "default"); });
    thumbs.forEach(function (img) { img.src = findBg(selectedId).url; });
  }

  function bind() {
    selects = Array.prototype.slice.call(document.querySelectorAll("[data-bg-select]"));
    addInputs = Array.prototype.slice.call(document.querySelectorAll("[data-bg-add]"));
    removeBtns = Array.prototype.slice.call(document.querySelectorAll("[data-bg-remove]"));
    thumbs = Array.prototype.slice.call(document.querySelectorAll("[data-bg-thumb]"));

    selects.forEach(function (sel) {
      sel.addEventListener("change", function () { select(sel.value); });
    });
    addInputs.forEach(function (inp) {
      inp.addEventListener("change", function () {
        if (inp.files && inp.files[0]) addFile(inp.files[0]);
        inp.value = "";
      });
    });
    removeBtns.forEach(function (btn) {
      btn.addEventListener("click", removeSelected);
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    loadCustom();
    loadSelected();
    if (selectedId !== "default" && !customExists(selectedId)) selectedId = "default";
    bind();
    renderControls();
  });

  window.YDSBackground = {
    getImage: getImage,
    getSelectedId: function () { return selectedId; }
  };
})();
