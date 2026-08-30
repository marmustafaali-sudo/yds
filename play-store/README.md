# Google Play — yükleme paketi

**YDS365 Kelime Çalışması** için Play Console'a girilecek her şey bu klasörde.
Uygulama kodu repo kökünde; burası yalnızca mağaza malzemeleri.

| Uygulama adı | `YDS365 Kelime Çalışması` |
|---|---|
| Paket kimliği (appId) | `app.yds365.kelime` — **ilk yüklemeden sonra kalıcı** |
| Sürüm | versionCode `1`, versionName `1.0.0` |
| Kategori | Eğitim (Education) |
| Ücret | Ücretsiz, reklam yok, uygulama içi satın alma yok |
| Hedef kitle | 13+ (yetişkin sınav adayları); içerik her yaşa uygun |
| Gizlilik politikası | https://yds.pages.dev/privacy.html |

## Klasör içeriği

```
play-store/
├── README.md                         → bu dosya (adım adım akış)
├── data-safety.md                    → "Veri güvenliği" formu cevapları  ← ÖNEMLİ
├── content-rating.md                 → içerik derecelendirme (IARC) cevapları
├── privacy-policy.html               → gizlilik politikası (repo kökündeki privacy.html kopyası)
├── listing/
│   ├── store-listing-tr.md           → uygulama adı, kısa/uzun açıklama, iletişim
│   ├── graphics/
│   │   ├── icon-512.png              → 512×512 mağaza ikonu
│   │   └── feature-graphic-1024x500.png
│   └── screenshots/
│       └── README.md                 → ekran görüntüsü gereksinimleri + nasıl çekilir
└── build/
    └── BUILD-AAB.md                  → imzalı .aab üretimi (keystore + bundleRelease)
        app-release.aab               → (üretince buraya kopyala; git'e girmez)
```

## Sıra

1. **AAB üret** — `build/BUILD-AAB.md`. Çıkan `app-release.aab` dosyasını `build/` içine koy.
2. **Play Console → Uygulama oluştur** — ad `YDS365 Kelime Çalışması`, dil Türkçe, ücretsiz.
3. **Mağaza kaydı** — `listing/store-listing-tr.md` metinlerini yapıştır, `listing/graphics/` görsellerini yükle, en az 2 telefon ekran görüntüsü ekle (`listing/screenshots/`).
4. **Veri güvenliği formu** — `data-safety.md` (hepsi "hayır / veri toplanmıyor").
5. **İçerik derecelendirme** — `content-rating.md` cevaplarıyla anketi doldur.
6. **Gizlilik politikası URL'si** — yukarıdaki bağlantı; sayfanın yayında olduğunu doğrula.
7. **Sürüm → Kapalı test (Internal testing)** — AAB'yi yükle, kendi cihazında dene.
8. Sorun yoksa **Üretim (Production)** kanalına gönder.

> Not: Play App Signing açık bırak (varsayılan). Yükleme anahtarını (`.jks`) ve
> parolalarını güvenli yerde sakla — kaybolursa güncelleme gönderilemez.
