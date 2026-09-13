# Uygulamayı ileride nasıl güncellerim?

Bu dosya, aradan zaman geçtikten sonra Claude Code ile devam etmek için
hatırlatmadır. Claude'un kalıcı hafızası da var ama asıl kayıt burasıdır —
her önemli değişiklikten sonra bu dosyayı güncel tut.

## 1. Terminalde oturumu başlat

```
cd "C:\Users\Ali\Desktop\YAPAY ZEKA\ydsapp"
claude
```

Sonra tek cümle yeter, örn:
- "ydsapp'i güncelleyeceğiz, testteki kelimelerde şu hatayı düzeltelim"
- "yeni kelime ekleyelim ve yeni sürüm çıkaralım"

Claude `ydsapp-project` hafıza dosyasını okur; bu repo dosyasını da
göstererek bağlamı hızlıca hatırlatabilirsin:
"NASIL-GUNCELLENIR.md ve play-store/UPLOAD-PLAN.md'yi oku".

## 2. Projenin sabitleri (değişmez)

| Şey | Değer |
|---|---|
| appId (kalıcı) | `app.yds365.kelime` |
| Uygulama adı | YDS365 Kelime Çalışması |
| Keystore | `C:\Users\Ali\yds365-upload-key.jks` |
| Keystore alias | `yds365-upload` |
| Store + key parola | `yds365-Kelime-upload-2026` |
| Keystore ayarı | `android/keystore.properties` (gitignored, makinede duruyor) |
| Gizlilik politikası | https://marmustafaali-sudo.github.io/yds/privacy.html |
| Gizlilik e-postası | maramazanoglu78@gmail.com |
| Play geliştirici e-postası | mar.mustafa.ali@gmail.com |
| GitHub | github.com/marmustafaali-sudo/yds |
| JDK (build için) | `C:\Program Files\Eclipse Adoptium\jdk-21.0.12.101-hotspot` |
| YDS sınav tarihi (varsayılan sayaç) | 2026-11-22 |

## 3. Kod değişikliği yapmak

Web dosyaları repo kökünde: `index.html`, `app.js`, `daily.js`, `post.js`,
`auth.js`, `mobile.js`, `styles.css`, `words.json`. Android build bunları
`www/` içine kopyalar (`scripts/copy-web.mjs`). Yeni bir dosya eklersen
`copy-web.mjs` içindeki `FILES` dizisine de ekle.

Kelime eklemek/düzeltmek: `words.json` (şema:
`{id, en, pos, level, tr[], example_en, example_tr, synonyms[]}`).

## 4. Yeni sürüm çıkarma (her güncellemede)

1. `android/app/build.gradle` içinde:
   - `versionCode` → bir artır (şu an 4, sıradaki 5)
   - `versionName` → yükselt (şu an "1.3.0", örn "1.4.0")
2. Build:
   ```
   cd "C:\Users\Ali\Desktop\YAPAY ZEKA\ydsapp"
   npm run build:android
   cd android
   $env:JAVA_HOME="C:\Program Files\Eclipse Adoptium\jdk-21.0.12.101-hotspot"
   .\gradlew.bat bundleRelease
   ```
   Çıktı: `android/app/build/outputs/bundle/release/app-release.aab`
   → `play-store/build/app-release.aab` konumuna kopyalanır.
3. (İsteğe bağlı) Telefonda test:
   ```
   .\gradlew.bat assembleRelease
   adb install -r app\build\outputs\apk\release\app-release.apk
   ```
   Kablosuz ADB kopmuşsa: `adb connect 192.168.1.145:<port>` (port için
   `adb mdns services`). İlk kez imza değişmişse önce
   `adb uninstall app.yds365.kelime`.
4. `git add -A && git commit && git push`
5. Sürüm notu yaz (tr-TR, kısa madde listesi).

## 5. Play Console'a yükleme

Adım adım: `play-store/UPLOAD-PLAN.md`.

Kısa yol: Play Console → **Test ve yayınlama** → istediğin kanal
(Kapalı test / Prod) → **Yeni sürüm oluştur** → `app-release.aab` sürükle
→ sürüm notu → Kaydet → Gözden geçir → Yayınla.

Mağaza metinleri: `play-store/listing/store-listing-tr.md`
Ekran görüntüleri: `play-store/listing/screenshots/`
Veri güvenliği / içerik derecelendirmesi cevapları: `play-store/*.md`

## 6. Değişiklikten sonra

- Bu dosyayı güncelle (yeni versionCode/versionName, ne değişti).
- Claude'a "hafızanı güncelle" de → `ydsapp-project` hafızasına işler.
