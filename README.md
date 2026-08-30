# YDS365 Kelime Çalışması

Geçmiş YDS/YÖKDİL sınavlarında sık geçen **100 kelime** için çerçevesiz, statik bir web uygulaması.
Kelime listesi + seviye filtresi + arama, flashcard modu ve 10 soruluk çoktan seçmeli test.
İlerleme (öğrenilen kelimeler, test rekoru) tarayıcıda `localStorage` içinde tutulur — sunucu yok.

## Dosyalar

| Dosya | İçerik |
|---|---|
| `index.html` | Arayüz iskeleti (Liste / Kart / Test / Post + şifre kapısı + veri paneli) |
| `styles.css` | Mobil öncelikli stiller |
| `auth.js` | Basit şifre kapısı (istemci tarafı; şifre SHA-256 özeti olarak) |
| `app.js` | Çalışma mantığı (filtre, flashcard, quiz, kalıcılık, veri içe/dışa aktarma) |
| `post.js` | Instagram post üretici: 1080×1350 canvas, günlük takvim, PNG indirme |
| `words.json` | 100 kelime: `en`, `pos`, `level` (A2–C1), `tr[]`, `example_en`, `example_tr`, `synonyms[]` |
| `ydbackground.jpg` | Post arka planı (İznik çini deseni) |
| `örnek.jpg` | Referans düzen (sadece örnek — kelime konumu için) |

## Sekmeler

- **Liste / Kart / Test** — kelime çalışma.
- **Post** — Instagram postu üretir. Kelime seç (veya alanları elle düzenle) → `ydbackground.jpg`
  üzerinde koyu katman + serif metinle 1080×1350 önizleme → **PNG indir**. Düzen `örnek.jpg`'ye
  göre: küçük harf + noktalı kelime solda alt-orta, altında italik Türkçe anlam, ince çizgi,
  örnek cümle (EN + TR). "Marka / filigran" alanı sol üste soluk yazı koyar (boş bırakılabilir).
  - **Günlük takvim:** günde 1 post. "Bu postu ekle" ile tek tek veya "Seviyeyi ekle" ile bir
    seviyenin tüm kelimelerini kuyruğa atar; sıradaki her kelime bir güne denk gelir. "Başlangıç
    günü" 1. sıranın tarihini belirler. Uygulama "bugünün postu"nu yeşil kutuda gösterir →
    **Bugünün postunu indir** tek PNG verir. Her satırda Aç / ↓ (o günü indir) / ✕. "Tüm takvimi
    tek seferde indir" hepsini `yds-01-kelime.png` biçiminde sırayla indirir (tarayıcı çoklu
    indirme iznini sorabilir). Takvim + başlangıç günü `localStorage`'da (`yds.postQueue.v1`,
    `yds.postStart.v1`).

## Şifre kapısı

Site açılışta şifre sorar. Şifre: **`ali1999.`** — bir oturum boyunca `sessionStorage`'da tutulur
(sekme kapanınca tekrar sorar). Şifreyi değiştirmek için `auth.js` içindeki `SHA` (ve `DJB2`)
sabitlerini yeni şifrenin özetleriyle güncelle:

```bash
node -e "const c=require('crypto');const p='YENİ_ŞİFRE';console.log('sha256',c.createHash('sha256').update(p).digest('hex'));let h=5381;for(const ch of p)h=((h<<5)+h+ch.charCodeAt(0))>>>0;console.log('djb2',h)"
```

> **Uyarı:** Bu istemci tarafı bir engel, gerçek güvenlik değil — kaynak koddan / devtools ile
> aşılabilir. Sitenin gerçekten kapalı olması gerekiyorsa **Cloudflare Access** (Zero Trust →
> Access → Applications) ile e-posta/PIN koruması ekle; `auth.js` yine ikinci bir katman kalır.

## Veri sözleşmesi (site ↔ ileride app)

Üretim sitede yapılır, veri GitHub'a commit edilir, Cloudflare Pages yayınlar, mobil app o
adresten çeker.

- **`words.json`** — tek kaynak. Şema: `{ meta?, words: [{ id, en, pos, level, tr[], example_en, example_tr, synonyms[] }] }`.
  `level` ∈ `A2|B1|B2|C1`. App bunu `https://<site>.pages.dev/words.json` adresinden `fetch` eder.
- **Veri paneli** (sayfa altı "Veri — yedek / aktarım"):
  - **words.json indir** — o anki kelime listesini `words.json` olarak verir → repoya koy, push et.
  - **Tam yedek (JSON)** — `words` + `schedule` (takvim) + `progress` (öğrenilenler, rekorlar).
  - **JSON yükle** — `words` / `schedule` / `progress` alanlarını okur; `words` verilirse
    `localStorage`'a "override" olarak yazılır ve site `words.json` yerine onu kullanır.
  - **Varsayılana dön** — override'ı siler, tekrar `words.json`'a döner.
- Yükleme kalıcı (yeniden yüklemede korunur) ama **tarayıcıya özeldir** — canlı siteyi
  güncellemek için `words.json`'ı indirip repoya commit etmek gerekir.

### Geri sayım postu

Post sekmesinin altında ayrı bölüm: "**YDS sınavına XX gün kaldı !**" — aynı İznik arka planı,
büyük kırmızı serif sayı. "Sınav adı" (YDS/YÖKDİL…) + "Sınav tarihi" alanları; kalan gün otomatik
hesaplanır, canlı önizleme, **Geri sayım PNG indir**. Tarih ÖSYM 2026 takvimine göre ön dolu
(**YDS Sonbahar: 22 Kasım 2026**); ÖSYM değiştirirse alanı güncelle. Kaynak:
<https://sdm.com.tr/yds-takvimi-osym/>, <https://yds.net/osym-2026-sinav-takvimi-aciklandi>

## Yerelde çalıştırma

`fetch('words.json')` ve canvas'a resim çizimi nedeniyle `file://` ile açmak çalışmaz; yerel sunucu gerekir:

```bash
cd ydsapp
python -m http.server 8000
# tarayıcı: http://localhost:8000
```

Alternatif: `npx serve` veya VS Code "Live Server".

## Kelime verisini kontrol

```bash
node -e "const d=require('./words.json');const w=d.words;console.log('toplam',w.length);const c={};w.forEach(x=>c[x.level]=(c[x.level]||0)+1);console.log(c)"
```

## Cloudflare Pages + GitHub pipeline (deploy)

1. Bu klasörü kendi git deposu yap ve GitHub'a gönder:
   ```bash
   cd ydsapp
   git init && git add . && git commit -m "İlk sürüm: YDS kelime çalışma"
   gh repo create ydsapp --public --source=. --push      # veya elle repo açıp remote ekle
   ```
2. Cloudflare Dashboard → **Workers & Pages → Create → Pages → Connect to Git** → `ydsapp` reposunu seç.
3. Build ayarları:
   - **Framework preset:** None
   - **Build command:** (boş)
   - **Build output directory:** `/`
4. Deploy → site `https://<proje-adı>.pages.dev` adresinde yayınlanır.
   Bundan sonra `main` dalına her push otomatik yeniden yayına alınır.

**Günlük akış:** sitede takvim/kelime düzenle → **words.json indir** → repoya kopyala →
`git add words.json && git commit -m "kelime güncelle" && git push` → Cloudflare birkaç dakikada
yeni sürümü yayınlar.

> Not: `gh` / Cloudflare oturumu gerekiyorsa terminalde `! gh auth login` çalıştır.

## Durum / sonraki adımlar

- **Faz 1 — bitti:** kelime çalışma (Liste / Kart / Test).
- **Faz 2–3 — çalışıyor:** Post sekmesi + günlük takvim (günde 1 post, "bugünün postu",
  tek/toplu PNG indirme, `localStorage`). Şifre kapısı + veri içe/dışa aktarma paneli.
  - Açık işler: çoklu kart (carousel 1/3, 2/3…), Playfair yerine özel bir serif,
    arka plan ışık/koyuluk ayarı, Instagram açıklama (caption) metni üretimi.
- **Deploy:** Cloudflare Pages + GitHub (yukarıdaki bölüm) — kullanıcı yapacak.
- **Faz 4:** Mobil uygulama — `words.json`'ı `pages.dev` adresinden çeker (Veri sözleşmesi).
