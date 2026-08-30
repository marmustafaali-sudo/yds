# Veri güvenliği formu — cevaplar

Play Console → **Uygulama içeriği → Veri güvenliği**. Aşağıdaki cevaplar
uygulamanın gerçek davranışıyla birebir uyumludur (bkz. `privacy-policy.html`).

## Özet

**Uygulama hiçbir kullanıcı verisi toplamaz veya paylaşmaz.**
Tamamen çevrimdışı çalışır; hesap yok, giriş yok, sunucu yok, analitik/reklam SDK'sı yok.

## Form adımları

### 1. Veri toplama ve paylaşımı
- **Uygulamanız kullanıcı verisi topluyor mu ya da paylaşıyor mu?** → **Hayır**

  (Çalışma ilerlemesi — öğrenilen kelimeler, test rekoru, günlük hedef, tekrar
  takvimi — yalnızca cihazda `localStorage` içinde tutulur. "Toplama", Google
  tanımına göre verinin cihazdan çıkıp bir sunucuya iletilmesidir; burada böyle
  bir aktarım yoktur.)

Bu soruya "Hayır" denince aşağıdaki bölümler otomatik atlanır. Yine de referans için:

### 2. Güvenlik uygulamaları (sorulursa)
- Veri aktarımda şifreleniyor mu? → **Uygulanamaz** (aktarılan veri yok)
- Kullanıcı verisinin silinmesini talep etme yolu var mı? → **Uygulanamaz**
  (Toplanan veri yok. Cihazdaki yerel veriler uygulama kaldırılınca silinir.)

### 3. Veri türleri
Hiçbiri seçilmez:
- Konum — hayır
- Kişisel bilgiler (ad, e-posta, kimlik) — hayır
- Finansal bilgiler — hayır
- Kişiler / rehber — hayır
- Uygulama etkinliği / analitiği — hayır
- Cihaz veya diğer tanımlayıcılar (ID) — hayır
- Fotoğraf / video / ses / dosyalar — hayır
- Sağlık ve fitness — hayır
- Mesajlar — hayır

## İzinler (referans)

`AndroidManifest.xml` içinde tanımlı izinler:

| İzin | Neden | Veri toplama? |
|---|---|---|
| `INTERNET` | Capacitor/WebView varsayılanı; uygulama çevrimdışı çalışır, ağ isteği yapmaz | Hayır |
| `POST_NOTIFICATIONS` | Kullanıcı açarsa günlük çalışma hatırlatması (yalnızca **yerel** bildirim) | Hayır |

Yerel bildirimler cihazda planlanır; hiçbir push sunucusu veya jeton kullanılmaz.
