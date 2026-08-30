# Ekran görüntüleri

Play Console gereksinimleri (telefon):
- **En az 2, en fazla 8** adet
- PNG veya JPEG, 24-bit (alfa yok)
- Kenar uzunluğu 320–3840 px, en/boy oranı en fazla 2:1
- Öneri: gerçek cihaz çözünürlüğü, ör. **1080×2340** (dikey)

## Ne gösterilmeli (sıra önerisi)

1. **Kart** ekranı — bir kelime açık, örnek cümleyle
2. **Test** — soru + 30 sn sayaç çubuğu görünür
3. **Sonuç ekranı** — halka grafik, puan, "Yeni rekor"
4. **Liste** — seviye süzgeci + birkaç kelime
5. **Bugün** — günlük hedef çubuğu + "Tekrar: N kelime hazır"

(Post sekmesi native uygulamada gizli — ekran görüntüsüne girmez.)

## Nasıl çekilir

### Emülatör (Android Studio)
```
npm run open:android
# Android Studio > Device Manager > yeni sanal cihaz (ör. Pixel 6, API 34)
# Uygulamayı çalıştır > emülatör araç çubuğundaki kamera simgesi ile kaydet
```

### Fiziksel cihaz (USB hata ayıklama açık)
```
"%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe" exec-out screencap -p > 01-kart.png
```
veya cihazda güç + ses kısma tuşları.

Çekilen dosyaları bu klasöre `01-kart.png`, `02-test.png` ... şeklinde koy.

## Hazır ekran görüntüleri (2026-08-30)

Cihazdan çekilip 1080×2160'a (2:1, Play uyumlu) kırpıldı:

| Dosya | İçerik |
|---|---|
| `1-bugun-geri-sayim.png` | Bugün kartı + YDS geri sayımı + günlük hedef |
| `2-kart-degerlendirme.png` | Flashcard + Unuttum / Zor / Kolay + kademeli ipucu |
| `3-kart-hafiza-kancasi.png` | Kart arka yüzü + "Hafıza kancası ekle" |
| `4-test-bosluk-doldur.png` | Test — cümlede boşluk doldurma (cloze) sorusu |
| `5-test-cevap-puan.png` | Test — doğru cevap + puan + seri |

Not: bu 5 görsel lale arka planı eklenmeden önce çekildi (özellikler doğru,
sadece zemin düz). İstersen telefondan yeni ekran görüntüsü alıp aynı adlarla
değiştir; Play Console'da güncellemesi kolay.
