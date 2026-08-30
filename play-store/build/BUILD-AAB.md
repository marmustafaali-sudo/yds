# İmzalı AAB üretimi — YDS365 Kelime Çalışması

appId: `app.yds365.kelime` · versionCode `1` · versionName `1.0.0`

Ön koşullar repo kökündeki `BUILD-ANDROID.md` içinde (JDK 21, Android SDK, `JAVA_HOME`).

## 1. Yükleme anahtarı — bir kez, KULLANICI çalıştırır

```
"C:\Program Files\Android\Android Studio\jbr\bin\keytool" -genkeypair -v ^
  -keystore C:\Users\Ali\yds365-upload-key.jks -keyalg RSA -keysize 2048 ^
  -validity 10000 -alias yds365-upload
```

> `.jks` dosyasını ve parolalarını güvenli bir yerde yedekle. Kaybolursa
> (Play App Signing'e geçmediysen) uygulamayı bir daha güncelleyemezsin.
> Play App Signing'i açık bırakman önerilir — o zaman bu yalnızca "yükleme
> anahtarı" olur ve gerekirse sıfırlanabilir.

## 2. `android/keystore.properties` — repoya girmez (gitignored)

```
storeFile=C:/Users/Ali/yds365-upload-key.jks
storePassword=<parola>
keyAlias=yds365-upload
keyPassword=<parola>
```

`android/app/build.gradle` bu dosya varsa release'i otomatik imzalar.

## 3. Web'i senkronla + AAB derle

```
cd "C:\Users\Ali\Desktop\YAPAY ZEKA\ydsapp"
npm run build:android
cd android
.\gradlew.bat bundleRelease
```

Çıktı: `android/app/build/outputs/bundle/release/app-release.aab`

Bu dosyayı `play-store/build/` içine kopyala (git'e girmez) ve Play Console'a yükle.

## Sonraki sürümler

`android/app/build.gradle` → `versionCode` bir artır (2, 3, ...), gerekiyorsa
`versionName` güncelle, sonra 3. adımı tekrar çalıştır.
