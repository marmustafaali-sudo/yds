/* YDS365 — statik site + /api/leaderboard/* için hafif Worker katmanı.
   /api/leaderboard dışındaki HER istek aynen eskisi gibi statik dosyalara
   (env.ASSETS) düşer; bu app'in ilk sunucu kodu olduğu için davranış
   değişikliğini bu dosyaya hapsediyoruz.

   Lider tablosu: sadece telefon appinde (native), opt-in. Kimlik cihazda
   üretilen anonim bir UUID + kullanıcının seçtiği takma ad — hesap yok.
   Haftalık "sıfırlama" otomatik: iso_week her SUNUCU tarafında hesaplanır
   (Türkiye saati, sabit UTC+3), her yeni hafta yeni bir satır demek. */

var CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
};

var UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
var MAX_SUBMIT_JUMP = 5000; // tek submit'te makul tavan (gerçek maksimumun belirgin üstünde)
var MIN_SUBMIT_GAP_MS = 3000; // art arda submit'leri engelle

export default {
  async fetch(request, env, ctx) {
    var url = new URL(request.url);
    if (url.pathname.startsWith("/api/leaderboard/")) {
      if (request.method === "OPTIONS") {
        return new Response(null, { status: 204, headers: CORS_HEADERS });
      }
      try {
        return await route(request, env, url);
      } catch (e) {
        return json({ error: "server_error" }, 500);
      }
    }
    return env.ASSETS.fetch(request);
  }
};

function route(request, env, url) {
  var path = url.pathname.replace(/^\/api\/leaderboard/, "");
  if (path === "/join" && request.method === "POST") return handleJoin(request, env);
  if (path === "/submit" && request.method === "POST") return handleSubmit(request, env);
  if (path === "/top" && request.method === "GET") return handleTop(request, env, url);
  if (path === "/me" && request.method === "GET") return handleMe(request, env, url);
  if (path === "/leave" && request.method === "POST") return handleLeave(request, env);
  return json({ error: "not_found" }, 404);
}

/* ---------- ISO hafta (Türkiye saati, sabit UTC+3) ---------- */

var TURKEY_OFFSET_MS = 3 * 60 * 60 * 1000;

function isoWeekTurkey(date) {
  var t = new Date(date.getTime() + TURKEY_OFFSET_MS);
  var d = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate()));
  var dayNum = (d.getUTCDay() + 6) % 7; // Pazartesi=0 … Pazar=6
  d.setUTCDate(d.getUTCDate() - dayNum + 3); // o haftanın Perşembesi
  var firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  var firstDayNum = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDayNum + 3);
  var week = 1 + Math.round((d - firstThursday) / 604800000);
  return d.getUTCFullYear() + "-W" + (week < 10 ? "0" : "") + week;
}

/* ---------- doğrulama yardımcıları ---------- */

function isValidDeviceId(v) {
  return typeof v === "string" && UUID_RE.test(v);
}
function cleanNickname(v) {
  if (typeof v !== "string") return null;
  var n = v.replace(/[\u0000-\u001f\u007f<>]/g, "").trim();
  if (n.length < 2 || n.length > 20) return null;
  return n;
}
function isValidPoints(v) {
  return typeof v === "number" && isFinite(v) && v >= 0 && Math.floor(v) === v;
}

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: Object.assign({ "content-type": "application/json" }, CORS_HEADERS)
  });
}

async function readJSON(request) {
  try { return await request.json(); } catch (e) { return null; }
}

/* ---------- /join ---------- */

async function handleJoin(request, env) {
  var body = await readJSON(request);
  if (!body) return json({ error: "bad_request" }, 400);
  var deviceId = body.deviceId;
  var nickname = cleanNickname(body.nickname);
  if (!isValidDeviceId(deviceId)) return json({ error: "bad_device_id" }, 400);
  if (!nickname) return json({ error: "bad_nickname" }, 400);

  var isoWeek = isoWeekTurkey(new Date());
  var now = Date.now();

  var existing = await env.DB.prepare(
    "SELECT points FROM leaderboard_scores WHERE device_id = ? AND iso_week = ?"
  ).bind(deviceId, isoWeek).first();

  if (existing) {
    await env.DB.prepare(
      "UPDATE leaderboard_scores SET nickname = ?, updated_at = ? WHERE device_id = ? AND iso_week = ?"
    ).bind(nickname, now, deviceId, isoWeek).run();
    return json({ ok: true, isoWeek: isoWeek, nickname: nickname, points: existing.points });
  }

  await env.DB.prepare(
    "INSERT INTO leaderboard_scores (device_id, iso_week, nickname, points, created_at, updated_at) VALUES (?, ?, ?, 0, ?, ?)"
  ).bind(deviceId, isoWeek, nickname, now, now).run();
  return json({ ok: true, isoWeek: isoWeek, nickname: nickname, points: 0 });
}

/* ---------- /submit ---------- */

async function handleSubmit(request, env) {
  var body = await readJSON(request);
  if (!body) return json({ error: "bad_request" }, 400);
  var deviceId = body.deviceId;
  var nickname = cleanNickname(body.nickname);
  var points = body.points;
  if (!isValidDeviceId(deviceId)) return json({ error: "bad_device_id" }, 400);
  if (!nickname) return json({ error: "bad_nickname" }, 400);
  if (!isValidPoints(points)) return json({ error: "bad_points" }, 400);

  var isoWeek = isoWeekTurkey(new Date());
  var now = Date.now();

  var existing = await env.DB.prepare(
    "SELECT points, updated_at FROM leaderboard_scores WHERE device_id = ? AND iso_week = ?"
  ).bind(deviceId, isoWeek).first();

  if (!existing) {
    // join yapılmadan submit geldi — bu haftaya yeni satır olarak başlatılır (clamp uygulanır).
    var clamped0 = Math.min(points, MAX_SUBMIT_JUMP);
    await env.DB.prepare(
      "INSERT INTO leaderboard_scores (device_id, iso_week, nickname, points, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)"
    ).bind(deviceId, isoWeek, nickname, clamped0, now, now).run();
    return finishSubmit(env, deviceId, isoWeek, clamped0);
  }

  if (now - existing.updated_at < MIN_SUBMIT_GAP_MS) {
    return finishSubmit(env, deviceId, isoWeek, existing.points);
  }

  var jump = points - existing.points;
  var accepted = jump > MAX_SUBMIT_JUMP ? existing.points + MAX_SUBMIT_JUMP : points;
  var merged = Math.max(existing.points, accepted); // monotonic merge — asla geriye gitmez

  await env.DB.prepare(
    "UPDATE leaderboard_scores SET points = ?, nickname = ?, updated_at = ? WHERE device_id = ? AND iso_week = ?"
  ).bind(merged, nickname, now, deviceId, isoWeek).run();

  return finishSubmit(env, deviceId, isoWeek, merged);
}

async function finishSubmit(env, deviceId, isoWeek, points) {
  var rankRow = await env.DB.prepare(
    "SELECT COUNT(*) AS n FROM leaderboard_scores WHERE iso_week = ? AND points > ?"
  ).bind(isoWeek, points).first();
  var totalRow = await env.DB.prepare(
    "SELECT COUNT(*) AS n FROM leaderboard_scores WHERE iso_week = ?"
  ).bind(isoWeek).first();
  return json({
    ok: true, isoWeek: isoWeek, points: points,
    rank: (rankRow ? rankRow.n : 0) + 1,
    totalPlayers: totalRow ? totalRow.n : 1
  });
}

/* ---------- /top ---------- */

async function handleTop(request, env, url) {
  var limit = parseInt(url.searchParams.get("limit"), 10);
  if (!limit || limit < 1 || limit > 100) limit = 50;
  var isoWeek = isoWeekTurkey(new Date());

  var rows = await env.DB.prepare(
    "SELECT nickname, points FROM leaderboard_scores WHERE iso_week = ? ORDER BY points DESC, updated_at ASC LIMIT ?"
  ).bind(isoWeek, limit).all();

  var entries = (rows.results || []).map(function (r, i) {
    return { rank: i + 1, nickname: r.nickname, points: r.points };
  });
  return json({ isoWeek: isoWeek, entries: entries });
}

/* ---------- /me ---------- */

async function handleMe(request, env, url) {
  var deviceId = url.searchParams.get("deviceId");
  if (!isValidDeviceId(deviceId)) return json({ error: "bad_device_id" }, 400);
  var isoWeek = isoWeekTurkey(new Date());

  var row = await env.DB.prepare(
    "SELECT points FROM leaderboard_scores WHERE device_id = ? AND iso_week = ?"
  ).bind(deviceId, isoWeek).first();

  if (!row) return json({ isoWeek: isoWeek, joined: false });
  return finishSubmit(env, deviceId, isoWeek, row.points);
}

/* ---------- /leave ---------- */

async function handleLeave(request, env) {
  var body = await readJSON(request);
  if (!body) return json({ error: "bad_request" }, 400);
  var deviceId = body.deviceId;
  if (!isValidDeviceId(deviceId)) return json({ error: "bad_device_id" }, 400);
  var isoWeek = isoWeekTurkey(new Date());
  await env.DB.prepare(
    "DELETE FROM leaderboard_scores WHERE device_id = ? AND iso_week = ?"
  ).bind(deviceId, isoWeek).run();
  return json({ ok: true });
}
