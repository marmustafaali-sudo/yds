/* YDS365 Kelime Çalışması — basit şifre kapısı.
   NOT: Bu istemci tarafı bir engeldir, gerçek güvenlik değil (kaynak koddan aşılabilir).
   Gerçek koruma için Cloudflare Access kullan. Şifre yalnızca SHA-256 özeti olarak tutulur. */
(function () {
  "use strict";

  var SKEY = "yds.auth.ok";
  var SHA = "6a15494189d60c00097371bd0e0dd16a78944bb8113d6ae94b0146582b0f5916";
  var DJB2 = 1924868869;

  document.addEventListener("DOMContentLoaded", function () {
    var gate = document.getElementById("authGate");
    if (!gate) return;

    // Native (Capacitor) kabuğunda şifre kapısı yok — cihaz zaten kullanıcının.
    if (window.Capacitor && typeof window.Capacitor.isNativePlatform === "function"
        && window.Capacitor.isNativePlatform()) {
      if (gate.parentNode) gate.parentNode.removeChild(gate);
      return;
    }

    var ok = false;
    try { ok = sessionStorage.getItem(SKEY) === "1"; } catch (e) {}
    if (ok) { gate.parentNode.removeChild(gate); return; }

    var form = document.getElementById("authForm");
    var input = document.getElementById("authPass");
    var err = document.getElementById("authErr");
    if (input) input.focus();

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      check(input.value).then(function (pass) {
        if (pass) {
          try { sessionStorage.setItem(SKEY, "1"); } catch (e2) {}
          gate.parentNode.removeChild(gate);
        } else {
          err.textContent = "Şifre yanlış.";
          input.select();
        }
      });
    });
  });

  function djb2(s) {
    var h = 5381;
    for (var i = 0; i < s.length; i++) h = (((h << 5) + h + s.charCodeAt(i)) >>> 0);
    return h;
  }

  function check(val) {
    val = String(val || "");
    if (window.crypto && window.crypto.subtle && window.TextEncoder) {
      try {
        return window.crypto.subtle.digest("SHA-256", new TextEncoder().encode(val))
          .then(function (buf) {
            var hex = Array.prototype.map.call(new Uint8Array(buf), function (b) {
              return ("0" + b.toString(16)).slice(-2);
            }).join("");
            return hex === SHA;
          })
          .catch(function () { return djb2(val) === DJB2; });
      } catch (e) { /* aşağıya düş */ }
    }
    return Promise.resolve(djb2(val) === DJB2);
  }
})();
