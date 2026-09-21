/* YDS365 — statik site + /api/leaderboard/* için hafif Worker katmanı.
   /api/leaderboard dışındaki HER istek aynen eskisi gibi statik dosyalara
   (env.ASSETS) düşer; bu app'in ilk sunucu kodu olduğu için davranış
   değişikliğini bu satırlara hapsediyoruz. */
export default {
  async fetch(request, env, ctx) {
    var url = new URL(request.url);
    if (url.pathname.startsWith("/api/leaderboard/")) {
      // Rotalar bir sonraki adımda eklenecek.
      return new Response(JSON.stringify({ error: "not_implemented" }), {
        status: 501,
        headers: { "content-type": "application/json" }
      });
    }
    return env.ASSETS.fetch(request);
  }
};
