/* YDS Kelime — native (Capacitor) köprüsü.
   Web'de HİÇBİR ŞEY yapmaz. Sadece Android/iOS kabuğunda çalışır.
   app.js ve post.js'e dokunmadan:
     - şifre kapısını atlar (auth.js zaten kontrol ediyor, bu yedek)
     - Post sekmesini gizler (.is-native gövde sınıfı + styles.css)
     - durum çubuğu / açılış ekranı / geri tuşu
     - <a download> tıklamalarını yakalayıp native "Paylaş" sayfasına yönlendirir */
(function () {
  "use strict";

  var C = window.Capacitor;
  if (!C || typeof C.isNativePlatform !== "function" || !C.isNativePlatform()) return;

  var P = C.Plugins || {};

  function onReady(fn) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", fn, { once: true });
    } else {
      fn();
    }
  }

  onReady(function () {
    document.body.classList.add("is-native");

    // --- durum çubuğu ---
    try {
      if (P.StatusBar) {
        P.StatusBar.setBackgroundColor({ color: "#0f172a" });
        P.StatusBar.setStyle({ style: "DARK" }); // koyu zemin -> açık ikonlar
      }
    } catch (e) {}

    // --- geri tuşu: Liste'de değilsek Liste'ye dön, Liste'deysek çık ---
    try {
      if (P.App && P.App.addListener) {
        P.App.addListener("backButton", function () {
          var active = document.querySelector(".tab.is-active");
          var view = active && active.getAttribute("data-view");
          if (view && view !== "card") {
            var homeTab = document.querySelector('.tab[data-view="card"]');
            if (homeTab) homeTab.click();
          } else if (P.App.exitApp) {
            P.App.exitApp();
          }
        });
      }
    } catch (e) {}
  });

  // --- açılış ekranını sayfa yüklenince kapat ---
  window.addEventListener("load", function () {
    try { if (P.SplashScreen) P.SplashScreen.hide(); } catch (e) {}
  });

  // --- <a download> -> Filesystem + Share ---
  document.addEventListener(
    "click",
    function (e) {
      var a = e.target && e.target.closest ? e.target.closest("a[download]") : null;
      if (!a) return;
      var href = a.href;
      var name = a.getAttribute("download") || "dosya";
      if (!href) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      shareBlobUrl(href, name);
    },
    true // capture: app.js/post.js kendi tıklamasını tetiklemeden önce yakala
  );

  function shareBlobUrl(url, name) {
    fetch(url)
      .then(function (r) { return r.blob(); })
      .then(function (blob) { return toBase64(blob); })
      .then(function (base64) {
        if (!P.Filesystem) throw new Error("Filesystem yok");
        return P.Filesystem.writeFile({
          path: name,
          data: base64,
          directory: "CACHE",
          recursive: true,
        });
      })
      .then(function (res) {
        var uri = res && res.uri;
        if (!uri) return;
        if (!P.Share) return;
        return P.Share.share({ title: name, files: [uri] });
      })
      .catch(function (err) {
        // Paylaşım iptal edilirse sessiz geç; gerçek hatada uyar
        var msg = (err && err.message) || "";
        if (/cancel/i.test(msg)) return;
        try { alert("Dosya paylaşılamadı: " + msg); } catch (e) {}
      });
  }

  function toBase64(blob) {
    return new Promise(function (resolve, reject) {
      var fr = new FileReader();
      fr.onerror = function () { reject(fr.error || new Error("okuma hatası")); };
      fr.onload = function () {
        var s = String(fr.result || "");
        var i = s.indexOf(",");
        resolve(i >= 0 ? s.slice(i + 1) : s);
      };
      fr.readAsDataURL(blob);
    });
  }
})();
