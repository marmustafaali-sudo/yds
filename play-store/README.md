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
| Gizlilik politikası | https://marmustafaali-sudo.github.io/yds/privacy.html |

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

Adım adım tam plan: **`UPLOAD-PLAN.md`** (kutucuklu, her Console ekranında ne girileceğiyle).

Özet:
1. **Aşama 0 — Hazırlık**: Play Console hesabı (25 $, kimlik onayı 1–3 gün) · gizlilik URL'si canlı · keystore üret · imzalı AAB · ekran görüntüleri
2. **Aşama 1** — Console'da uygulamayı oluştur
3. **Aşama 2** — Uygulama içeriği formları (`data-safety.md`, `content-rating.md`)
4. **Aşama 3** — Mağaza kaydı (`listing/`)
5. **Aşama 4** — Kapalı test sürümü (AAB yükle)
6. **Aşama 5** — Cihazda test
7. **Aşama 6** — Üretime yükselt, yayına sun

> Not: Play App Signing açık bırak (varsayılan). Yükleme anahtarını (`.jks`) ve
> parolalarını güvenli yerde sakla — kaybolursa güncelleme gönderilemez.
