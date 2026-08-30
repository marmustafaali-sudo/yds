# YDS365 Kelime Çalışması — Play Store yükleme planı

Adım adım. Kutucukları işaretleyerek ilerle. Kod tarafı hazır; kalanlar aşağıda.

## Durum

| | |
|---|---|
| [x] | Uygulama adı + appId sabit: `app.yds365.kelime` (kalıcı) |
| [x] | 512 ikon + 1024×500 öne çıkan görsel — `listing/graphics/` |
| [x] | Mağaza metinleri — `listing/store-listing-tr.md` |
| [x] | Veri güvenliği + içerik derecelendirme cevapları hazır |
| [ ] | Play Console hesabı (25 $ + kimlik doğrulama) |
| [x] | Gizlilik politikası canlı URL — `https://marmustafaali-sudo.github.io/yds/privacy.html` |
| [ ] | Yükleme anahtarı (keystore) |
| [ ] | İmzalı AAB |
| [ ] | Ekran görüntüleri (en az 2, telefon) |

---

## AŞAMA 0 — Hazırlık (Console'dan önce; paralel yürür)

### 0.1 — Play Console hesabı  ⏳ bekleme kalemi, İLK bunu başlat
- https://play.google.com/console → **Create account** → hesap tipi **Kendim / bireysel**
- 25 $ tek seferlik ödeme
- **Kimlik doğrulama**: kimlik + adres yüklenir; bireysel hesapta onay **1–3 gün** sürebilir
- Yeni bireysel geliştiriciler için Google, üretime çıkmadan önce **kapalı testte
  en az 12 tester × 14 gün** isteyebilir. Hesap açılınca panelde yazan güncel
  şartı birlikte kontrol ederiz.

### 0.2 — Gizlilik politikasını yayına al  ✅ HAZIR
- GitHub Pages ile yayında: **`https://marmustafaali-sudo.github.io/yds/privacy.html`**
- Kaynak: `docs/` klasörü (`main` dalı), repo public.
- Değişince: `privacy.html` → `docs/index.html` + `docs/privacy.html` kopyala, push et; Pages otomatik günceller.

### 0.3 — Yükleme anahtarı üret  (SEN çalıştırırsın, tek sefer)
Bu oturumda `!` ile:
```
! & "C:\Program Files\Android\Android Studio\jbr\bin\keytool.exe" -genkeypair -v -keystore C:\Users\Ali\yds365-upload-key.jks -keyalg RSA -keysize 2048 -validity 10000 -alias yds365-upload
```
- İki parola sorar (store + key) — **aynısını gir ve bir yere kaydet**.
- "first and last name" alanına bir şey yaz (ör. `YDS365`), diğerlerini Enter'la geç, sonda `yes`.
- `.jks` dosyasını + parolaları güvenli yedekle (bulut + yerel). **Kaybedersen
  bir daha güncelleme gönderemezsin.**

### 0.4 — keystore.properties
`android/keystore.properties` oluştur (git'e girmez):
```
storeFile=C:/Users/Ali/yds365-upload-key.jks
storePassword=BURAYA_STORE_PAROLASI
keyAlias=yds365-upload
keyPassword=BURAYA_KEY_PAROLASI
```

### 0.5 — İmzalı AAB derle
```
! cd "C:\Users\Ali\Desktop\YAPAY ZEKA\ydsapp"; npm run build:android
! cd "C:\Users\Ali\Desktop\YAPAY ZEKA\ydsapp\android"; .\gradlew.bat bundleRelease
```
Çıktı: `android/app/build/outputs/bundle/release/app-release.aab`
→ `play-store/build/` içine kopyala (git'e girmez).

### 0.6 — Ekran görüntüleri  (en az 2, telefon dikey)
- Emülatör (Android Studio) veya USB'li cihaz — `listing/screenshots/README.md`.
- Sıra önerisi: **Kart → Test (sayaç görünür) → Sonuç ekranı → Liste → Bugün**.
- ~1080×2340; `listing/screenshots/01-kart.png` ... olarak kaydet.

---

## AŞAMA 1 — Uygulamayı oluştur
Console → **Uygulama oluştur**
- Uygulama adı: `YDS365 Kelime Çalışması`
- Varsayılan dil: **Türkçe (tr-TR)**
- Tür: **Uygulama** · Fiyat: **Ücretsiz** (sonradan ücretliye çevrilemez)
- Bildirim / politika onay kutuları

---

## AŞAMA 2 — "Uygulama içeriği" formları
Sol menü → **Politika → Uygulama içeriği**. Sırayla:

| Form | Cevap |
|---|---|
| Gizlilik politikası | 0.2'deki URL |
| Uygulama erişimi | Tüm işlevler kısıtlama olmadan kullanılabilir (giriş yok) |
| Reklamlar | Hayır, reklam yok |
| İçerik derecelendirmesi | Anketi `content-rating.md` ile doldur → Herkes / 3+ |
| Hedef kitle | Yaş grubu **13+**; çocuklara yönelik değil |
| Haberler uygulaması | Hayır |
| COVID-19 izleme | Hayır |
| Veri güvenliği | `data-safety.md` → hiçbir veri toplanmıyor/paylaşılmıyor |
| Devlet uygulaması | Hayır |
| Finansal özellikler | Hayır |

---

## AŞAMA 3 — Mağaza kaydı
Sol menü → **Büyüt → Mağaza varlığı → Ana mağaza kaydı**.
`listing/store-listing-tr.md` içeriğini yapıştır:
- Uygulama adı · kısa açıklama (≤80) · tam açıklama
- Uygulama simgesi → `graphics/icon-512.png`
- Öne çıkan görsel → `graphics/feature-graphic-1024x500.png`
- Telefon ekran görüntüleri → 0.6'daki dosyalar (en az 2)
- Kategori: **Eğitim** · iletişim e-postası · (isteğe bağlı web sitesi)

---

## AŞAMA 4 — Sürüm: önce KAPALI TEST
Sol menü → **Test → Kapalı test → Yeni sürüm oluştur**
- **Play App Signing**: açık bırak (öneri)
- `app-release.aab` yükle (versionCode 1, versionName 1.0.0)
- Sürüm notları (tr-TR): `İlk sürüm.`
- **Tester listesi**: e-posta listesi oluştur, kendini + tanıdıklarını ekle
  (bireysel hesap 12 tester şartı buradan sağlanır)
- Kaydet → İncele → Kapalı teste sun
- Testerlara çıkan **katılım linkini** paylaş; onlar Play'den kurar

---

## AŞAMA 5 — Cihazda gerçek test
- Katılım linkiyle Play'den kur
- Gez: Kart / Test (30 sn sayaç, puan, sonuç halkası) / Liste (arama, filtre) /
  Bugün (hedef, tekrar, bildirim izni) · uçak modunda da çalışmalı
- Hata → düzelt → `versionCode` +1 → yeni AAB → yeni kapalı test sürümü

---

## AŞAMA 6 — Üretime çıkar
- 12 tester × 14 gün şartı (varsa) dolunca Console "Üretime hazır" der
- **Üretim → Yeni sürüm** → kapalı testteki sürümü yükselt (promote)
- Ülkeler: tümü ya da yalnızca Türkiye
- İncele → **Yayına sun**. Google incelemesi birkaç saat–birkaç gün.

---

## Notlar
- `versionName` kullanıcıya görünür ("1.0.0"); `versionCode` her yüklemede artan tam sayı.
- İlk üretim sürümünden sonra `appId` değiştirilemez — `app.yds365.kelime` kesin.
- AAB imzası: kaybolan upload key Play App Signing açıksa sıfırlanabilir; kapalıysa uygulama güncellenemez.
