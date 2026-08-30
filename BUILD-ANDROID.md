# YDS365 Kelime Çalışması — Android derleme

Capacitor ile mevcut web uygulamasını saran native Android projesi.
Web dosyaları repo kökünde kalır (Cloudflare Pages), `www/` sadece derleme çıktısıdır.

## Gereksinimler (bu makinede kurulu)

- Node 24, npm
- Android Studio + Android SDK (`%LOCALAPPDATA%\Android\Sdk`)
- **JDK 21** — `C:\Users\Ali\jdk-21`
  (Android Studio'nun paket JBR'si sürüm 25; Gradle 8.14 onu desteklemiyor.)
  `~/.gradle/gradle.properties` içinde `org.gradle.java.home` ile ayarlı, hem
  Android Studio hem komut satırı bunu kullanır.

## Web değişikliğini native'e taşıma

`index.html / app.js / post.js / styles.css / words.json` değiştikten sonra:

```
npm run build:android
```

`www/` yeniden üretilir ve `npx cap sync android` çalışır.

## Debug APK

```
npm run build:android
cd android
.\gradlew.bat assembleDebug
```

Çıktı: `android/app/build/outputs/apk/debug/app-debug.apk`

Cihaza kur (USB hata ayıklama açık) / emülatöre:
```
"%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe" install -r app-debug.apk
```

Android Studio ile açmak için: `npm run open:android`

## Sürüm (Play Store) — AAB

### 1. Yükleme anahtarı (bir kez, KULLANICI çalıştırır)

```
"C:\Program Files\Android\Android Studio\jbr\bin\keytool" -genkeypair -v ^
  -keystore C:\Users\Ali\yds-upload-key.jks -keyalg RSA -keysize 2048 ^
  -validity 10000 -alias yds-upload
```

> Bu `.jks` dosyası + parolaları GÜVENLİ yedekle. Kaybedersen uygulamayı bir daha
> güncelleyemezsin (Play App Signing'e geçmediysen).

### 2. `android/keystore.properties` (gitignored — repoya girmez)

```
storeFile=C:/Users/Ali/yds-upload-key.jks
storePassword=<parola>
keyAlias=yds-upload
keyPassword=<parola>
```

`build.gradle` bu dosya varsa release'i otomatik imzalar, yoksa imzasız derler.

### 3. AAB üret

```
cd android
.\gradlew.bat bundleRelease
```

Çıktı: `android/app/build/outputs/bundle/release/app-release.aab` → Play Console'a yükle.

## Sürüm numarası

`android/app/build.gradle` → `versionCode` (her yüklemede +1) ve `versionName`.

## Play Store kontrol listesi

Tüm mağaza malzemeleri ayrı klasörde: **`play-store/`** (metinler, grafikler,
Veri Güvenliği + içerik derecelendirme cevapları, AAB adımları).

- [ ] Google Play Console hesabı (25 $ tek sefer)
- [x] Nihai `appId`: **`app.yds365.kelime`** (ilk yüklemeden sonra sabit)
- [x] Uygulama adı: **YDS365 Kelime Çalışması**
- [ ] Ekran görüntüleri (cihazdan) — bkz. `play-store/listing/screenshots/`
- [x] 512×512 ikon + 1024×500 öne çıkan görsel — `play-store/listing/graphics/`
- [ ] İçerik derecelendirme anketi — cevaplar `play-store/content-rating.md`
- [ ] "Veri güvenliği" formu → **veri toplanmıyor** — `play-store/data-safety.md`
- [x] Gizlilik politikası URL'si: `https://marmustafaali-sudo.github.io/yds/privacy.html`
- [ ] Önce "Internal testing" kanalına yükleyip cihazda dene
