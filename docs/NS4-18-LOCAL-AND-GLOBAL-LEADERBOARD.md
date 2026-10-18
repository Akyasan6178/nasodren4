# NS4-18 · Yerel ve global yüksek skor tabloları

Kullanıcı hesabı, e-posta veya başka kişisel bilgi olmadan iki tablo eklendi:

1. Cihazda yerel ilk 10.
2. Supabase destekli global ilk 10.

Değişmeyenler: oyun mekanikleri, skorlar, sağlık metinleri, CTA metinleri, URL ve UTM değerleri, bloklar ve efektler. Yeni npm bağımlılığı yok (Supabase SDK kullanılmadı; yalnızca `fetch`).

> **Durum:** Canlı Supabase kurulumu yapılmadı (bu makinede Supabase CLI ve proje bağlantısı yok). SQL, Edge Function ve kurulum rehberi hazır (`docs/NS4-18-SUPABASE-SETUP.md`). Global özellik mock backend ve eksik-env modunda doğrulandı; gerçek bir projeye karşı çalıştırılmadı.

## 1. Yerel skor tablosu

- **Saklama:** `fn_scores` alanında, sürümlü: `{ v: 1, entries: [...] }`. En iyi 10 tamamlanmış oyun tutulur.
- **Kayıt alanları:**

  | Alan              | Açıklama                                |
  | ----------------- | --------------------------------------- |
  | `id`              | oyun başına rastgele UUID               |
  | `nickname`        | takma ad (henüz yoksa boş; listede “—”) |
  | `score`           | skor                                    |
  | `lines`           | drenaj                                  |
  | `level`           | seviye                                  |
  | `durationSeconds` | oyun süresi                             |
  | `recordedAt`      | kayıt zamanı                            |
  | `submitted`       | global tabloya gönderildi mi            |

- **Ne zaman yazılır:** oyun bitince otomatik (`lifecycle.handleGameOver`). Ağa hiçbir şey gönderilmez.
- **Sıralama:** skor azalan. Eşit skorda önce ulaşan, yani daha erken kaydedilen, üstte; sonra kimlik.
- **Tekrar:** aynı oyun iki kez eklenmez. Kimlik her yeni oyunda üretilir; aynı kimlik reddedilir.
- **Doğrulama:** bozuk JSON, yanlış sürüm, geçersiz sayılar veya kimlikler filtrelenir. Geçersiz takma ad boşa çekilir, kayıt korunur.
- **Uyumluluk:** `fn_meta` (`best`, `totalLines`, rozetler) ayrı ve değişmeden kalır; “Rekor” hâlâ `fn_meta.best`'ten gelir.
- **Silme:** ilk sürümde listeyi silme butonu yok.

## 2. Takma ad

- Yalnızca global gönderim için istenir. Cihazda hatırlanır (`fn_nickname`) ve sonraki oyunlarda önceden doldurulur. Yerel kayıtlar da bu adı taşır.
- **Kurallar** (tek kaynak: `supabase/functions/_shared/scoreRules.ts`; istemci, Edge Function ve SQL kısıtları aynı sınırları uygular):
  - NFC'ye çevrilir; baştaki/sondaki boşluklar atılır, iç boşluklar teke iner.
  - Uzunluk 3–16 karakter (Unicode kod noktası; Türkçe harfler tek karakter).
  - İzin verilen: Unicode harf ve rakam, iç kısımda boşluk, `-`, `_`, `.`. Harf veya rakamla başlar ve biter.
  - Reddedilen:
    - kontrol karakterleri (sekme, satır sonu dahil);
    - HTML ve özel işaretler (`< > & " ' /` vb.);
    - görünmez ve biçim karakterleri (sıfır genişlikli boşluk, yön işaretleri);
    - özel kullanım alanı; birleşen işaretler (“zalgo”); emoji.

## 3. Oyun sonu akışı

- **Yerleşim:** “Tekrar oyna” ana eylem olarak kaldı; NS4-16 hiyerarşisi değişmedi. Gönderim formu ana eylemlerin (Tekrar oyna / Ana menü) altında, ipucu kutusunun üstündedir. Kısa yatay ekranda sağ sütundadır.
- **Gönderimi kullanıcı başlatır:** “Takma ad” alanı → “Global tabloya gönder”. Otomatik gönderim yoktur.
- **Durumlar** (canlı bölge; `role="status"`):

  | Durum                           | Metin                                       | Sonra                                                 |
  | ------------------------------- | ------------------------------------------- | ----------------------------------------------------- |
  | Hazır                           | —                                           | —                                                     |
  | Gönderiliyor                    | “Gönderiliyor…”                             | buton kilitli                                         |
  | Başarı                          | “Global tabloya gönderildi”                 | giriş ve buton kilitli; aynı oyun tekrar gönderilemez |
  | Sunucu “zaten gönderilmiş” dedi | “Bu oyun zaten gönderilmiş”                 | kilitli                                               |
  | Sunucu skoru reddetti           | “Bu skor gönderilemedi”                     | kilitli                                               |
  | Geçersiz takma ad               | “Takma ad geçersiz”                         | `aria-invalid`, odak girişte                          |
  | Çok sık                         | “Çok sık gönderim, biraz sonra tekrar dene” | tekrar denenebilir                                    |
  | Ağ hatası / zaman aşımı         | “Gönderilemedi, tekrar dene”                | tekrar denenebilir                                    |
  | Env yok                         | “Global tablo çevrimdışı”                   | giriş ve buton kapalı                                 |

- Ağ hatası oyunu, yerel kaydı ve ekran akışını etkilemez.
- Sağlık metni, CTA metni, URL ve UTM değerleri değişmedi.

## 4. Skorlar ekranı

- **Açılış:** ana menüde tek bir ikincil eylem: **Skorlar**. Ekranda **Yerel** ve **Global** sekmeleri vardır; açılınca Yerel seçili ve odakta.
- **Tablolar:** en çok 10 satır; sütunlar sıra, takma ad, skor, drenaj. Seviye kalabalık olmasın diye gösterilmedi.
- **Global durumları:**

  | Durum              | Gösterim                                    |
  | ------------------ | ------------------------------------------- |
  | Yükleniyor         | “Yükleniyor…” (`aria-busy`)                 |
  | Liste              | tablo + Yenile                              |
  | Boş                | “Henüz skor yok” + Yenile                   |
  | Çevrimdışı         | “Global tablo çevrimdışı” + Tekrar dene     |
  | Hata / zaman aşımı | “Global tablo yüklenemedi” + Tekrar dene    |
  | Env yok            | “Global tablo çevrimdışı” (Tekrar dene yok) |

- **Ne zaman yüklenir:** Global ekran açılışında ilk seçilişte bir kez, sonra yalnızca kullanıcı Yenile veya Tekrar dene derse. Polling ve realtime yoktur.
- **Erişilebilirlik:**
  - Sekmeler WAI-ARIA tablist: ok tuşları ve Home/End; seçili olmayan sekme Tab sırası dışında.
  - Panel odaklanabilir.
  - Tablolarda sütun ve satır başlıkları var (`th scope`).
  - Escape ve Tamam açan butona döner.
- **Responsive:** sabit tablo düzeni kullanılır; uzun takma ad kısaltılır (…). Sayılar sağa hizalıdır. Dokunma hedefleri ≥ 44 px. Telefonda takma ad girişi tam genişlikte, buton altında.
- **Güvenlik:** kullanıcı verisi yalnızca `textContent` ile yazılır (HTML enjeksiyonu yok). Sunucudan gelen satırlar da doğrulanır; geçersiz takma ad veya sayı içeren satır gösterilmez.

Bu görevde eklenen görünür metinlerin tamamı yukarıdaki listelerde ve tablolardadır. Hepsi görevde istenen öğelerdir (Skorlar, sekmeler, liste durumları, takma ad ve gönderim durumları). Sağlıkla ilgili yeni metin yok.

## 5. Global mimari

```
Tarayıcı ──GET  /rest/v1/rpc/get_leaderboard?limit_count=10 ──▶ Postgres fonksiyonu (security definer)
         └─POST /functions/v1/submit-score ───────────────────▶ Edge Function ──(service role)──▶ INSERT
```

- **Okuma:** yalnızca `get_leaderboard` ile; `rank`, `nickname`, `score`, `lines`, `level` döner. Tablo doğrudan okunmaz.
- **Yazma:** yalnızca Edge Function üzerinden; tarayıcıdan tabloya doğrudan insert yoktur.
- **Tarayıcıdaki değerler:** yalnızca public proje URL'si ve publishable/anon anahtar (`apikey` başlığı; eski JWT anon anahtarda ayrıca `Authorization`). Service role yalnızca function ortamındadır.
- **Env yoksa:** `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` eksik veya geçersizse istemci devre dışıdır; ağ isteği atılmaz.
- **İstemci savunmaları:**
  - `https` dışı URL reddedilir (yalnızca `localhost` / `127.0.0.1` için `http`).
  - Yanlışlıkla verilen `sb_secret_` veya service role JWT'si reddedilir.
  - Zaman aşımı 8 sn (`AbortController`).
  - `credentials: 'omit'`, `cache: 'no-store'`.
  - Anahtar, gövde veya yanıt konsola yazılmaz.

## 6. Veritabanı ve RLS

Migration: `supabase/migrations/20261018000000_ns4_18_leaderboard.sql`.

- **Tablo `leaderboard_scores`:** `id`, `nickname`, `score`, `lines`, `level`, `duration_seconds`, `game_hash` (benzersiz), `client_version`, `created_at`.
- **Kısıtlar** (istemci/function ile aynı):
  - takma ad uzunluğu ve yasaklı karakterler;
  - skor 0–10.000.000;
  - satır 0–5.000;
  - seviye 1–20 ve `level = least(20, 1 + lines/10)`;
  - süre 1 sn – 6 sa;
  - `game_hash` 64 hex karakter.
- **Index:** `(score desc, created_at asc, id asc)`.
- **RLS:** etkin ve zorunlu (`force`); politika yok.
- **Yetkiler:** `anon` ve `authenticated` için tablo yetkileri geri alındı; tabloya yalnızca `service_role` `select`/`insert` yapabilir. `get_leaderboard` `security definer`, `search_path = ''`, en çok 50 satır; `anon` yalnızca çalıştırabilir.
- **Kişisel veri yok:** IP, user-agent, e-posta, hesap saklanmaz. `game_hash`, istemcinin rastgele oyun kimliğinin tuzlu SHA-256 özetidir.
- **Dosyada ayrıca:** rollback notu ve kurulum komutları.

## 7. Edge Function güvenliği (`submit-score`)

- **Sıra:** origin → yöntem → içerik türü → boyut → JSON → alan doğrulama → makullük → hız sınırı → tuzlu özet → INSERT.
- **Yöntem:** yalnızca `POST` (`OPTIONS` ön kontrol: 204); diğerleri 405.
- **İçerik türü:** `application/json` (charset kabul); diğerleri 415.
- **Boyut:** en çok 2048 bayt. Beyan edilen ve akıştan okunan boyut ayrı ayrı denetlenir; aşarsa 413.
- **JSON:** bozuksa 400.
- **Alanlar** (422): tam olarak `gameId`, `nickname`, `score`, `lines`, `level`, `durationSeconds`, `clientVersion`; eksik veya fazla alan reddedilir.
  - `gameId`: UUID v4 biçiminde olmalı.
  - Sayılar tamsayı ve aralıkta olmalı. Negatif, ondalık, metin ve NaN/Infinity (JSON'da `null` olur) reddedilir.
  - Takma ad aynı kurallardan geçer; normalize edilmiş hâli kaydedilir.
- **Makullük** (oyun sabitlerinden türetilir; istemciye körü körüne güvenilmez):
  - seviye satırla tutarlı olmalı;
  - süre, satırların temizlenmesi için gereken en kısa süreden (her temizleme ≤ 4 satır, 0,3 sn) uzun olmalı;
  - skor, puan kurallarından türetilen cömert bir üst sınırı aşmamalı (satır başına en yüksek taban × seviye × art arda × sıklamen, kombo, parça başına T-spin/hard drop/sentetik ve tek seferlik sıklamen; saniyede en çok 10 parça).
- **Tekrar:** `sha256(pepper + oyun kimliği)` benzersiz; aynı oyun ikinci kez 409.
- **Hız sınırı:** istemci adresinin tuzlu özeti üzerinden; dakikada 6 istek. Function örneği başına bellek içidir, adres saklanmaz. Daha güçlü bir sınır için `RateLimiter` arayüzü açık entegrasyon noktasıdır. Aşılırsa 429.
- **CORS:** `ALLOWED_ORIGINS` ile sınırlandırılabilir; boşsa her origin.
- **Hata yanıtları:** yalnızca kısa kod döner (`{ ok:false, error:'server' }` vb.); iç ayrıntı, yığın veya secret dönmez. `Cache-Control: no-store`.

## 8. Anti-cheat sınırları

Bu bir **makullük kontrolüdür, tam hile önleme değildir**:

- Oyunda seed veya replay kaydı yok. Sunucu skoru yeniden üretemez; yalnızca tutarlılık ve üst sınır kontrolleri yapar.
- Değiştirilmiş bir istemci, sınırlar içinde kalan sahte bir skoru gönderebilir. Özellikle uzun süreli oyunlarda üst sınır geniştir.
- Hız sınırı örnek başınadır; dağıtık kötüye kullanımı tam engellemez.
- Uygunsuz takma ad için içerik filtresi yok; bakım SQL ile yapılır (kurulum rehberi, bölüm 7).

Güçlü bir çözüm, sunucunun oyunu yeniden oynatabileceği seed + girdi kaydı (replay) gerektirir; bu kapsam dışıdır.

## 9. Ortam değişkenleri

| Değişken                                    | Yer                                    | Açıklama                                    |
| ------------------------------------------- | -------------------------------------- | ------------------------------------------- |
| `VITE_SUPABASE_URL`                         | frontend (`.env.local` / build ortamı) | `https://<ref>.supabase.co`                 |
| `VITE_SUPABASE_PUBLISHABLE_KEY`             | frontend                               | `sb_publishable_…` (veya eski anon anahtar) |
| `SCORE_HASH_PEPPER`                         | function secret                        | özetler için tuz                            |
| `ALLOWED_ORIGINS`                           | function secret (isteğe bağlı)         | izinli origin listesi                       |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | function (Supabase otomatik verir)     | yalnızca sunucu tarafı                      |

`.env.example` yalnızca ilk iki değişkeni boş değerle içerir; `.env` ve `.env.*` Git'e eklenmez.

## 10. Testler

Toplam **628 test** (NS4-17: 477; +151). Haricî Supabase servisine bağlanan unit test yok; ağ katmanı taklit edilir.

| Dosya                                 | Kapsam                                                                                                                                                                                                                                                                                                                                                           |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tests/leaderboard/rules.test.ts`     | oyun sabitleriyle tutarlılık, takma ad kabul/red (HTML, kontrol, görünmez, yön, zalgo, emoji, uzunluk), gövde doğrulama (NaN/Infinity/negatif/ondalık/metin/eksik-fazla alan), makullük                                                                                                                                                                          |
| `tests/leaderboard/local.test.ts`     | ilk 10, eşit skor, tekrar, güncelleme, bozuk storage, `fn_meta` uyumluluğu, takma ad hafızası, UUID                                                                                                                                                                                                                                                              |
| `tests/leaderboard/client.test.ts`    | eksik/geçersiz env, secret anahtar reddi; okuma başarı/boş/hata/çevrimdışı/timeout; gönderim başarı/409/422/429/500/timeout; doğrudan tablo yazımı yok; konsola sızıntı yok                                                                                                                                                                                      |
| `tests/leaderboard/edge.test.ts`      | Edge Function: yöntem, OPTIONS, içerik türü, boyut, JSON, alanlar, makullük, tekrar (409), hız sınırı, origin, hata gizliliği                                                                                                                                                                                                                                    |
| `tests/leaderboard/migration.test.ts` | sütunlar, kısıtlar, index, RLS ve zorunluluk, politika yok, yetkiler, güvenli okuma fonksiyonu, rollback notu, `verify_jwt`, `.env.example`, frontend'de secret yok                                                                                                                                                                                              |
| `tests/ui/leaderboard-ui.test.ts`     | Skorlar sekmeleri (ARIA, klavye), tablolar, global durumlar, yenile/tekrar dene, geç yanıt yarışı, alt ekran odak/Escape; gönderim paneli (çevrimdışı, otomatik gönderim yok, geçersiz ad, başarı ve kilit, hata türleri, yeni oyun yarışı); oyun sonu entegrasyonu (otomatik yerel kayıt, bir kez, ağ isteği yok, storage kapalı); işaretleme ve responsive CSS |

Güncellenen testler: başlangıç ekranı buton listesi (+ Skorlar) ve oyun sonu metni (form ayrı sabitlendi; mevcut metinler aynı).

## 11. Doğrulama

| Komut           | Sonuç                                                                                |
| --------------- | ------------------------------------------------------------------------------------ |
| `npm run check` | geçti (typecheck — Edge Function kodu dahil — lint, format, 38 dosya 628/628, build) |

Headless tarayıcıda (Playwright + Chromium 153; gerçek cihaz yok), proje dışındaki betiklerle:

| Kontrol                                | Sonuç                                                       |
| -------------------------------------- | ----------------------------------------------------------- |
| Skor probu, dev                        | 62/62: eksik env 10 + mock backend 24 + 7 görünüm 28        |
| Skor probu, eksik env (production)     | 10/10                                                       |
| Smoke                                  | dev ve production 104/104                                   |
| Tab                                    | 34/34 (başlangıç: Oyna → Nasıl oynanır → Ayarlar → Skorlar) |
| Öğretici                               | 61/61                                                       |
| Dokunma                                | 36/36                                                       |
| Ana menü erişilebilirlik               | 35/35 (Skorlar 844×390'da kaydırmadan görünür)              |
| Yardımcı ekranlar                      | 126/126                                                     |
| Ayarlar / Nasıl oynanır klavye-dokunma | 16/16                                                       |
| Ses/haptik                             | dev 25/25, production 21/21                                 |
| HUD (7 görünüm)                        | sorun yok                                                   |

- **Eksik env:**
  - Skorlar açılır; Yerel boş durumu görünür; Global “çevrimdışı” görünür ve Tekrar dene yoktur.
  - Oyun sonunda form kapalıdır; yerel skor otomatik kaydedilir ve yeniden yüklemede kalır.
  - Ağa hiç istek gitmez.
- **Mock backend:** gerçek `handler.ts`, Node `--experimental-strip-types` ile çalıştırıldı; okuma için bellek içi RPC kullanıldı.
  - global ilk 10 sıralı;
  - tarayıcı erişilebilirlik ağacında tablo / sütun başlığı / satır başlığı;
  - klavye ile sekme geçişi;
  - 500 → hata + Tekrar dene → toparlanma; boş liste; yükleniyor → 8 sn zaman aşımı;
  - boşta polling yok;
  - oyun sonunda otomatik gönderim yok;
  - geçersiz ad istemcide durur;
  - başarı: satır tuzlu özetle yazılır; yalnızca publishable anahtar gider, `Authorization` gitmez;
  - ikinci gönderim yok; aynı kimlik doğrudan tekrar gönderilince 409; imkânsız skor 422;
  - yeni skor Global listede;
  - hatırlanan ad önceden doldurulur;
  - ağ hatası → tekrar dene → başarı;
  - Tekrar oyna çalışır;
  - konsolda anahtar veya gövde yok. Tarayıcının kendi “Failed to load resource” satırları, testin bilinçli ürettiği 500/409/422 yanıtlarındandır.
- **7 görünüm:**
  - Skorlar (10 yerel / 10 global satır, uzun Türkçe adlar) ve oyun sonu formu kart içinde kalır; yatay taşma yok; ana eylem kaydırmadan görünür.
  - Görüntüler gözle incelendi.
- **Env'li production build** (örnek değerlerle, ayrı klasöre): pakette yalnızca URL ve publishable anahtar var; service role, pepper ve function kodu yok.

**Mekanik referanslar** değişmedi: +138, +1732, +3800, 538 / 638 / 738.

**Paket farkı** (`67bf432`'ye göre):

| Dosya | Fark                                          |
| ----- | --------------------------------------------- |
| JS    | 534,26 → 545,58 kB (+11,32 kB; gzip +3,92 kB) |
| CSS   | +3,61 kB                                      |
| HTML  | +3,62 kB                                      |

`legacy/Ferah Nefes · Sinüs Bulmacası.html` SHA-256 değeri değişmedi.
