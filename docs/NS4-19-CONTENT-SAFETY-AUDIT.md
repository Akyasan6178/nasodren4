# NS4-19 · Görünür içerik güvenliği denetimi

Bu denetim, oyunda kullanıcıya görünen bütün metinleri envanterler ve sağlık, marka ve CTA açısından değerlendirir.

**Bu görevde hiçbir sağlık metni değiştirilmedi veya üretilmedi.** İnceleme gerektiren ifadeler aşağıda dosya, mevcut metin ve risk notuyla listelenmiştir. Karar ve düzeltme medikal / hukuki onay sürecine aittir.

> Bu doküman hukuki veya tıbbi görüş değildir. Teknik bir ekibin yayın öncesi uzman incelemesine hazırladığı envanter ve risk listesidir.

## 1. Kapsam ve yöntem

- **Envanter:** `tests/helpers/inventory.ts`. `index.html` ekran bölümlerinden ve metin tablosu tutan modüllerden toplanır. 15 alan:
  - ana menü, öğretici, Nasıl oynanır, HUD, güçlendiriciler, mola, ayarlar, oyun sonu;
  - sağlık ipuçları, skor ekranı, global gönderim, hata mesajları, CTA, bildirimler, rozetler.

  Metin tabloları: `src/content/*`, `src/tutorial/steps.ts`, `src/ui/powerups.ts`, `src/ui/scoresView.ts`, `src/ui/submitScore.ts`; popup/toast'lar `src/app/events.ts`, `src/ui/hud.ts`, `src/ui/badges.ts`; ayarlar notu `src/ui/settingsPanel.ts`.

- **Sağlık içerik kaydı:** `src/content/health.ts`. Görünür sağlıkla ilgili 27 metnin her biri için `id`, kullanım yeri (`placement`, `location`), metin, onay durumu ve kaynak notu tutulur.
  - Hiçbir metnin onay kaydı veya kaynağı bu depoda yoktur. Hepsi `approval: 'review_required'`, `source: null` olarak işaretlendi; kaynak uydurulmadı.
  - İpuçları (6) ve sağlık toast'ları (2) çalışma anında bu modülden okunur. Metinler NS4-18 (`93adcf1`) ile birebir aynıdır; testle ve önceki commit'le karşılaştırılarak doğrulandı.
  - `index.html` içindeki statik metinler yerinde kaldı. Kayıt onları envanterler; testler metnin aynen yerinde olduğunu doğrular.
- **Otomatik taramalar** (`tests/content/content-safety.test.ts`):
  - marka adı;
  - satın alma / ürün kullanma çağrısı;
  - teşhis / kesin tedavi vaadi;
  - “doğal = risksiz” bağlamı;
  - sentetik seçenek için aşağılayıcı dil;
  - tıbbi uyarının varlığı;
  - CTA metni, URL ve UTM değerleri.

  Taramalar metni düzeltmez; yalnızca değişikliği yakalar.

## 2. Değiştirilmeden korunan metinler

Bütün görünür metinler NS4-18 ile aynıdır. Bu görevde metin değişikliği yapılmadı:

- `index.html` ve `src/styles.css` bu commit'te değişmedi.
- İpuçları ve iki sağlık toast'u, tek karakter değişmeden `src/content/health.ts`'e taşındı.
- Teknik UI mesajlarında düzeltme gerektiren açık bir hata bulunmadı; hiçbiri değiştirilmedi.

Korunan kritik metinler:

| Metin                                                                                                                                           | Yer                                                   |
| ----------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| Tıbbi uyarı: “Bu oyun bilgilendirme ve eğlence amaçlıdır; tıbbi tavsiye yerine geçmez. Şikâyetleriniz için hekiminize veya eczacınıza danışın.” | ana menü (`#scr-start .fine`)                         |
| CTA: “Sinüs sağlığı rehberi”                                                                                                                    | Mola                                                  |
| CTA: “Rahat nefes rehberini aç”                                                                                                                 | Oyun sonu                                             |
| Oyun sonu sağlık yönlendirmesi                                                                                                                  | `.health p`                                           |
| 6 sağlık ipucu                                                                                                                                  | ana menü / mola / oyun sonu ipucu kutuları (rastgele) |
| Rebound uyarı toast'u                                                                                                                           | ikinci sentetik kullanımda bir kez                    |

## 3. İnceleme gerektiren sağlık ifadeleri

Kodda değiştirilmedi. Öncelik: **Y** yüksek, **O** orta, **D** düşük.

| #   | Öncelik | Dosya / yer                                                                                                             | Mevcut metin                                                                                                                                                                                                                                      | Risk notu                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| --- | ------- | ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Y       | `src/content/health.ts` `tip.cyclamen` (ipucu kutuları)                                                                 | “Cyclamen europaeum L., Primulaceae familyasından yumrulu bir bitkidir. Yumrusu saponin içerir; ekstresinin burun mukozasında ozmotik etkiyle mukus akışını artırdığı bildirilmektedir.”                                                          | Belirli bir bitkisel etken maddenin farmakolojik etkisine dair iddia; kaynak gösterilmemiş. Bir advergame içinde, ilaç/ürün tanıtımı (etken madde üzerinden dolaylı ürün reklamı) olarak değerlendirilebilir. Medikal kaynak ve mevzuat (ilaç / beşeri tıbbi ürün tanıtım kuralları) onayı gerekir.                                                                                                                                                                                     |
| 2   | Y       | `index.html` `#scr-how .map li`; `src/app/events.ts` popup; `src/ui/hud.ts` toast; `src/ui/powerups.ts`                 | “Sıklamen özütü … alt yarıyı yavaşça boşaltır ve 30 sn puanları ikiye katlar.”, “Ozmotik drenaj başladı”, “Sinüslerin dolmaya başladı. Sıklamen özütü hazır.”                                                                                     | Oyun mekaniği, sıklamen özütünü sinüsleri boşaltan bir “güç” olarak sunar; ipucu 1 ile birlikte gerçek bir tedavi etkisi ima edilebilir. Oyun / gerçeklik ayrımının açıklığı değerlendirilmeli.                                                                                                                                                                                                                                                                                         |
| 3   | Y       | `index.html` `#scr-how .map li`, `#syn-sub`; `src/ui/powerups.ts`; `src/app/events.ts`; `src/content/badges.ts` `dogal` | “Sentetik açıcı anında 3 satır açar. Tekrarlarsan tıkanıklık geri teper…”, “Hızlı ama geri tepebilir”, “Hızlı rahatlama”, “Sık kullanım tıkanıklığı geri getirdi”, “Tekrarlarsan geri tepebilir”, rozet “Doğal yol — Sentetik açıcısız 5. seviye” | Bitkisel (sıklamen) ile sentetik dekonjestan arasında örtük bir karşılaştırma var: doğal ödüllendiriliyor, sentetik “geri tepiyor”. Aşağılayıcı veya korkutucu dil yok (tarama temiz). “Doğal” ifadesi risksizlik iddiası içermiyor. Yine de karşılaştırmalı reklam riski ve gerçek ilaç güvenliğiyle karıştırılma olasılığı var. Oyunda rebound, aynı oyundaki 2. kullanımda başlıyor; gerçek hayattaki “uzun süreli kullanım” uyarısından daha kısa bir zaman çizelgesi ima edebilir. |
| 4   | O       | `src/content/health.ts` `toast.rebound`                                                                                 | “Dekonjestanların uzun süreli kullanımı tıkanıklığın geri dönmesine yol açabilir.”                                                                                                                                                                | Tıbben bilinen bir uyarı (rinitis medikamentoza). İfade dengeli; medikal onay ve kaynak notu gerekir.                                                                                                                                                                                                                                                                                                                                                                                   |
| 5   | O       | `src/content/health.ts` `tip.duration`                                                                                  | “Dekonjestan burun spreylerinin önerilenden uzun kullanımı, … (rinitis medikamentoza) yol açabilir. Prospektüsteki süreye uyun.”                                                                                                                  | Ürün kullanım talimatı niteliğinde genel uyarı; medikal onay gerekir.                                                                                                                                                                                                                                                                                                                                                                                                                   |
| 6   | O       | `src/content/health.ts` `tip.doctor`                                                                                    | “10 günü aşan, ateşle seyreden, göz çevresinde şişlik yapan ya da giderek kötüleşen şikâyetlerde bir hekime başvurun.”                                                                                                                            | Klinik yönlendirme (eşikler). Medikal doğrulama gerekir; içerik güvenlik yönünde (hekime yönlendirme).                                                                                                                                                                                                                                                                                                                                                                                  |
| 7   | O       | `src/content/health.ts` `tip.fluids`                                                                                    | “Gün içinde yeterli sıvı almak ve burnu tuzlu suyla yıkamak mukusun akışkan kalmasına yardımcı olabilir.”                                                                                                                                         | Öz bakım önerisi; “olabilir” ile yumuşatılmış. Medikal onay gerekir.                                                                                                                                                                                                                                                                                                                                                                                                                    |
| 8   | O       | `index.html` `#scr-over .health p`                                                                                      | “Gerçek hayatta tıkanıklıkla yaşamak zorunda değilsin. Sinüzit ve rahat nefes hakkında güvenilir bilgiler sağlık portalında.”                                                                                                                     | İlk cümle bir çözüm vaadi gibi okunabilir. CTA ile birlikte bilgi yönlendirmesi olarak kalıyor; ifade onaylanmalı.                                                                                                                                                                                                                                                                                                                                                                      |
| 9   | O       | `index.html` `#scr-how`, `src/app/events.ts`                                                                            | “ozmotik etki”, “Nörorefleks etki”, “Ozmotik etki: dört satır birden”                                                                                                                                                                             | Tıbbi görünümlü oyun terimleri. Gerçek bir “nörorefleks etki” iddiası değil, ama tıbbi terim gibi algılanabilir.                                                                                                                                                                                                                                                                                                                                                                        |
| 10  | D       | `src/content/health.ts` `tip.congestion`, `tip.paranasal`                                                               | sinüzit ve sinüs anatomisi açıklamaları                                                                                                                                                                                                           | Eğitsel içerik. Medikal doğruluk onayı yeterli.                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| 11  | D       | `index.html` `#scr-start .lead`; `#scr-over h2`; `src/app/events.ts`                                                    | “… satırları boşalt, nefesini aç.”, “Sinüslerin tamamen tıkandı”, “Mukus daha hızlı birikiyor”                                                                                                                                                    | Oyun metaforu. Düşük risk; ton onayı.                                                                                                                                                                                                                                                                                                                                                                                                                                                   |

**Ek gözlem (öneri; değişiklik yapılmadı):** tıbbi uyarı yalnızca ana menüde görünür. Sağlık ipuçlarının ve CTA'ların göründüğü Mola ve Oyun sonu ekranlarında uyarı yok. Uyarının bu ekranlarda da gösterilmesi medikal/hukuki ekiple değerlendirilebilir; metin onaylı olmalıdır.

## 4. Kullanıcıya görünür marka taraması

| Kapsam                                                                                                                  | Sonuç                                                                       |
| ----------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `index.html`, bütün `src/**/*.ts` ve production paketi (`dist/`)                                                        | “Nasodren” (veya “naso dren”) geçmiyor (test + paket taraması: 0)           |
| Repo / klasör adı (`nasodren4`) ve `docs/NS4-01-TECHNICAL-INVENTORY.md`                                                 | adı içeriyor; kullanıcıya görünmez ve pakete girmez                         |
| `legacy/` prototip                                                                                                      | adı içermiyor; pakete girmez                                                |
| Oyun adı “Ferah Nefes” ve HUD rozeti “Ferah nefes ×2”                                                                   | marka adı değil; ticari marka çakışması ayrıca hukuken kontrol edilmeli     |
| Satın alma / ürün kullanma çağrısı (“satın al”, “sipariş”, “indirim”, “eczaneden al”, “hemen dene”, “ürünü kullan” vb.) | yok                                                                         |
| Teşhis / kesin tedavi vaadi (“tedavi eder”, “iyileştirir”, “garanti”, “kesin çözüm”, “%100”, “mucize” vb.)              | yok                                                                         |
| Eczacı                                                                                                                  | yalnızca tıbbi uyarıda “danışın” bağlamında; satın alma yönlendirmesi değil |

## 5. CTA ve UTM sonucu

| Yerleşim  | Metin                      | URL                                                                                                                                 |
| --------- | -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Mola      | “Sinüs sağlığı rehberi”    | `https://www.yasasinsaglik.com/?utm_source=ferah_nefes_oyun&utm_medium=advergame&utm_campaign=sinus_bulmaca&utm_content=pause_menu` |
| Oyun sonu | “Rahat nefes rehberini aç” | `…&utm_content=game_over`                                                                                                           |

- Metinler, URL ve UTM değerleri değişmedi (testle doğrulandı).
- Yeni CTA yok (sayfada iki `<a>`). Bağlantılar yeni sekmede açılır (`noopener`).
- Analitik tıklamayı engellemez.
- CTA metinleri “rehber” odaklıdır: bir sağlık bilgisi yönlendirmesidir, satış dili yoktur.
- **Doğrulanamayan:** hedef sitenin (`yasasinsaglik.com`) içeriği ve sahipliği bu görevde açılıp incelenmedi. Sayfanın bilgilendirici sağlık içeriği olduğu, ürün satış sayfası olmadığı yayın öncesi doğrulanmalı.

## 6. Yayın öncesi medikal / hukuki onay gereken alanlar

1. Bütün sağlık ipuçları (6), kaynak notlarıyla (özellikle #1 sıklamen etki iddiası).
2. Sıklamen ve sentetik güç anlatımı ile karşılaştırmalı çerçeve (#2, #3), “Doğal yol” rozeti dahil.
3. Rebound / dekonjestan uyarıları (#4, #5): tıbbi doğruluk ve dil.
4. Oyun sonu sağlık yönlendirmesi ve iki CTA metni (#8); hedef portalın içeriği.
5. Tıbbi uyarının metni ve gösterildiği ekranlar (bölüm 3 ek gözlem).
6. Oyun adı “Ferah Nefes” için ticari marka kontrolü; “ozmotik / nörorefleks” gibi tıbbi görünümlü terimler (#9).
7. Analitik: gerçek bir etiket eklenirse KVKK / GDPR aydınlatma ve rıza (`docs/NS4-19-ANALYTICS-EVENTS.md` bölüm 6); global skor tablosundaki takma adların moderasyonu (NS4-18).

Onaylanan her metin için `src/content/health.ts` içinde `approval: 'approved'` ve `source` alanı doldurulmalı. Metin değişirse ilgili testteki sabit değer de bilinçli olarak güncellenmelidir.

## 7. Envanter (bütün görünür metinler)

Aşağıdaki liste `tests/helpers/inventory.ts` çıktısıdır. `${…}` çalışma anında doldurulan değerdir. Tekrar eden metinler alan içinde bir kez gösterilmiştir.

### Ana menü (7)

- Ferah Nefes
- Sinüslerini tıkayan mukus bloklarını yerleştir, satırları boşalt, nefesini aç.
- Oyna
- Nasıl oynanır
- Ayarlar
- Skorlar
- Bu oyun bilgilendirme ve eğlence amaçlıdır; tıbbi tavsiye yerine geçmez. Şikâyetleriniz için hekiminize veya eczacınıza danışın.

### Öğretici (23)

- Öğretici · 1/6
- Atla
- Tamam
- Kaydır
- ← → ile bloğu sağa ya da sola kaydır.
- Tahtada sağa-sola sürükle: bloğu kaydır.
- Döndür
- ↑ veya X ile döndür (Z: ters yön).
- Tahtaya kısa dokun: blok döner.
- Yavaş indir
- ↓ tuşunu basılı tut: blok yavaşça iner.
- Aşağı doğru yavaşça sürükle.
- Anında bırak
- Boşluk tuşu: blok anında yerine iner.
- Aşağı hızlıca fırlat: blok anında iner.
- Beklet
- C veya Shift: bloğu sonraya beklet.
- Yukarı fırlat ya da Beklet’e dokun.
- Drenaj
- Tam satır = drenaj. Bir satırı tamamen doldur, satır boşalır.
- Kare blok dönmez; sonraki blokla dene.
- Öğretici tamamlandı. İyi oyunlar!
- Öğretici · ${index + 1}/${total}

### Nasıl oynanır (31)

- Nasıl oynanır
- Dokunmatik
- Sağa-sola sürükle
- Bloğu kaydır
- Dokun
- Döndür (tahtanın sol üçte biri: ters yön)
- Aşağı sürükle
- Yavaşça indir
- Aşağı fırlat
- Anında bırak
- Yukarı fırlat
- Beklet
- Klavye
- ← →
- Kaydır
- ↑ / X · Z
- Döndür · ters döndür
- ↓ · Boşluk
- Yavaş indir · anında bırak
- C / Shift
- 1 · 2
- Sıklamen özütü · sentetik açıcı
- Esc / P
- Duraklat
- Oyun alanı bir sinüs boşluğu
- Düşen bloklar biriken mukus; alan dolarsa sinüs tamamen tıkanır.
- Tam satır = drenaj. Dört satır birden: ozmotik etki. T-spin: nörorefleks etki.
- Tıkanıklık yükselince iki destek açılır. Sıklamen özütü oyunda bir kez kullanılır, alt yarıyı yavaşça boşaltır ve 30 sn puanları ikiye katlar.
- Sentetik açıcı anında 3 satır açar. Tekrarlarsan tıkanıklık geri teper: bloklar hızlanır, alttan yeni tıkanıklık yükselir.
- Tamam
- Öğreticiyle oyna

### HUD (11)

- Tıkanıklık
- Beklet
- Sıradaki
- 0
- Nefes sv.
- 1
- Drenaj
- Ferah nefes ×2
- Rebound
- Ferah nefes ×2 · ${m} sn
- Rebound: tıkanıklık geri tepiyor · ${rb} sn

### Güçlendiriciler (18)

- Beklet C / Shift
- Sıklamen özütü Oyunda 1 kez Kilitli
- Sentetik açıcı Hızlı ama geri tepebilir Kilitli
- Sıklamen özütü
- Sentetik açıcı
- Tıkanıklık %35’te açılır
- Hazır · oyunda 1 kez
- Bu oyunda kullanıldı
- Kullanıldı · ×2 etkin
- Hızlı rahatlama
- Hazır · hızlı rahatlama
- Tekrarı rebound yapar
- Rebound sürüyor
- Kilitli
- Hazır
- Kullanıldı
- ×2 etkin
- Rebound riski

### Mola (Pause) (5)

- Mola
- Devam et
- Ayarlar
- Ana menü
- Sinüs sağlığı rehberi

### Ayarlar (16)

- Ayarlar
- Ses
- Ses efektleri
- Ortam müziği
- Oynanış
- Titreşim Destekleyen Android cihazlarda
- Hayalet parça
- İleri ayarlar
- DAS
- Basılı tutunca kayma gecikmesi: ms
- ARR
- Kayma tekrar hızı: ms
- FPS göstergesi
- Performans testi için
- Kaydet
- Bu cihaz/tarayıcı titreşimi desteklemiyor

### Oyun sonu (12)

- Yeni rekor
- Sinüslerin tamamen tıkandı
- Puan
- Drenaj
- Rekor
- Gerçek hayatta tıkanıklıkla yaşamak zorunda değilsin. Sinüzit ve rahat nefes hakkında güvenilir bilgiler sağlık portalında.
- Rahat nefes rehberini aç
- Tekrar oyna
- Ana menü
- Takma ad
- Global tabloya gönder
- 3–16 karakter: harf, rakam, boşluk, - _ .

### Sağlık ipuçları (12)

- Paranazal sinüsler
- Kafatasındaki hava dolu boşluklardır: maksiller (yanak), frontal (alın), etmoid (gözler arası) ve sfenoid (kafa tabanı).
- Tıkanıklık nasıl olur?
- Sinüzitte mukoza zarı iltihaplanır ve sinüs ağızları (ostiumlar) tıkanabilir. Yüzde baskı, baş ağrısı ve koku kaybı görülebilir.
- Sıklamen
- Cyclamen europaeum L., Primulaceae familyasından yumrulu bir bitkidir. Yumrusu saponin içerir; ekstresinin burun mukozasında ozmotik etkiyle mukus akışını artırdığı bildirilmektedir.
- Kullanım süresine dikkat
- Dekonjestan burun spreylerinin önerilenden uzun kullanımı, tıkanıklığın daha şiddetli geri dönmesine (rinitis medikamentoza) yol açabilir. Prospektüsteki süreye uyun.
- Ne zaman hekime gitmeli?
- 10 günü aşan, ateşle seyreden, göz çevresinde şişlik yapan ya da giderek kötüleşen şikâyetlerde bir hekime başvurun.
- Sıvı tüketimi
- Gün içinde yeterli sıvı almak ve burnu tuzlu suyla yıkamak mukusun akışkan kalmasına yardımcı olabilir.

### Skor ekranı (16)

- Skorlar
- Yerel
- Global
- Sıra
- Takma ad
- Skor
- Drenaj
- Henüz kayıtlı oyun yok
- Tekrar dene
- Yenile
- Tamam
- Yükleniyor…
- Henüz skor yok
- Global tablo çevrimdışı
- Global tablo yüklenemedi
- —

### Global skor gönderimi (11)

- Takma ad
- Global tabloya gönder
- 3–16 karakter: harf, rakam, boşluk, - _ .
- Gönderiliyor…
- Global tabloya gönderildi
- Bu oyun zaten gönderilmiş
- Takma ad geçersiz
- Bu skor gönderilemedi
- Çok sık gönderim, biraz sonra tekrar dene
- Gönderilemedi, tekrar dene
- Global tablo çevrimdışı

### Hata mesajları (7)

- Global tablo yüklenemedi
- Global tablo çevrimdışı
- Gönderilemedi, tekrar dene
- Takma ad geçersiz
- Bu skor gönderilemedi
- Çok sık gönderim, biraz sonra tekrar dene
- Bu cihaz/tarayıcı titreşimi desteklemiyor

### CTA (2)

- Sinüs sağlığı rehberi
- Rahat nefes rehberini aç

### Bildirimler (popup / toast) (23)

- Nörorefleks etki
- TETRİS
- Ozmotik etki: dört satır birden
- Art arda ·
- Tek
- Çift
- Üçlü
- <satır adı> drenaj
- Mini
- T-spin
- Kombo ×${e.combo}
- kombo ×${e.combo}
- Sıklamen özütü
- Ozmotik drenaj başladı
- Nefes seviyesi ${lv}
- Mukus daha hızlı birikiyor
- Rebound
- Sık kullanım tıkanıklığı geri getirdi
- 3 satır açıldı
- Tekrarlarsan geri tepebilir
- Dekonjestanların uzun süreli kullanımı tıkanıklığın geri dönmesine yol açabilir.
- Sinüslerin dolmaya başladı. Sıklamen özütü hazır.
- Rozet kazandın: ${BADGES[id].name}

### Rozetler (10)

- Ozmotik usta
- İlk 4 satırlık drenaj
- Nörorefleks uzmanı
- İlk T-spin temizliği
- Akış hali
- 5’li kombo
- Doğal yol
- Sentetik açıcısız 5. seviye
- Derin nefes
- Toplam 100 satır drenaj
