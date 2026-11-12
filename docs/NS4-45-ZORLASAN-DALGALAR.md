# NS4-45 · Zorlaşan dalgalar (Virüs Avı modu yerine)

> **NS4-46 ile güncellendi (2026-11-12):** 8 bölüm; adımlar 15 sn sonra her 30 sn; satırdan gelen hız seviye 6'da durur; tablo ve sonuçlar için [NS4-46-SEKIZ-BOLUM.md](NS4-46-SEKIZ-BOLUM.md). Aşağıdaki 60 sn / 4 bölüm tabloları tarihseldir.

Tarih: 2026-11-12. Kural seti: `sinus-dalga-v1` (önceki `sinus-attack-spray-v1`). Çok oyunculu protokol sürümü 3.

## 1. İstek

Müşteri notu (özet): oyunda iki değişken baskı olsun: **ekstra gelen bloklar ve virüsler**, bir de **hız**. İkisi de belli aralıklarla zorlaşsın. Bloklar 1., 3., 5., 7. dakikalarda gelsin, hız 2., 4., 6. dakikalarda artsın. 4. bölümde bu çok net hissedilsin (ör. 1. dakikada 2 tek kare + 1 virüs, sonra 3 + 1 …). Oynanamayacak kadar zor olmasın ama 10 dakika dayanmak zor olsun.

Kullanıcı kararları (2026-11-12):

| Soru                    | Karar                                                                                                                            |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Virüs Avı modu (NS4-44) | **Koddan tamamen kaldırıldı.** Virüs görselleri (`public/images/virus/virus-1..3.webp`) klasik moddaki virüs hücresi için kaldı. |
| Ritim                   | **Dönüşümlü:** tek dakikalar dalga, çift dakikalar hızlanma.                                                                     |
| Virüs                   | **Yüzlü engel hücresi:** tek kare gibi yukarıdan düşer, satırı tamamlanınca silinir, ek puan verir.                              |
| "Aşama"                 | **Bölüm** (1. bölüm Yanak … 4. bölüm Kafa tabanı). Saat her bölümde baştan başlar, şiddet bölüm numarasıyla artar.               |

## 2. Kural

- **Bölüm saati:** aktif oynanışta ilerler (mola, satır temizleme, drenaj, oda geçişi, oyun sonu: durur). Her 60 saniyede bir adım atar.
  - Tek adımlar (1, 3, 5 … dk): **virüs dalgası**.
  - Çift adımlar (2, 4, 6 … dk): **hızlanma**.
- **Saat sıfırlama:** her yeni bölümde saat, adım sayısı ve hız payı sıfırlanır. 4. bölümden sonraki **Serbest nefes**, 4. bölümün saatiyle sürer (sıfırlanmaz). Yeni oyun her şeyi sıfırlar.
- **Dalga:** tek kareler ve virüsler rastgele sırayla rastgele sütunlara düşer ve o sütunun yığın tepesine oturur (tahtanın üstünden düşme animasyonu, hareketi azaltta yerinde belirir).
  - Düşmediği yerler: hava kanalı ve oda sıralarının üstünde en üst kanalın sütunu (oda her zaman açılabilir kalır), düşen parçanın hücreleri, gizli sıralar, sırayı tam dolduracak hücre (dalga kendiliğinden satır silmez).
  - Yer kalmazsa daha az düşer; dalga oyunu tek başına bitirmez (taşma, parçanın sığmamasıyla olur).
- **Hızlanma:** seviyeye bir "hız payı" eklenir; yerçekimi `seviye + hız payı` ile hesaplanır, en çok seviye 13'e kadar hızlanır (seviye zaten üstündeyse seviye geçerli). **Seviye ve satır değişmez:** skor sunucu doğrulaması seviyeyi satırdan hesaplar.
- **Virüs:** tahtada gri hücre gibi davranır (board değeri 8), kaynağı `ORIGIN.virus + tür` (0 yeşil, 1 kırmızı, 2 sarı). Oda hedefi, Sıklamen çekirdeği ve Sıklamen gücü saymaz; Spray hedefler; oda geçişinde türüyle yeni odaya taşınır.
- **Puan:** dalga hücresi (tek kare ya da virüs) içeren satır artık **normal satır gibi** puanlanır, satır/seviye/kombo sayar ve Spray'i doldurur. Eski "atak satırı puansız" kuralı, alttan satır itme kalkınca gereksiz kaldı ve kaldırıldı. Satır temizlemesiyle silinen her virüs **100 × seviye** ek puan verir (×2 sıklamen çarpanı uygulanmaz).
- **Alttan satır itme yok:** eski Sinüzit Atağı'nın gri satırı ve 3 dağınık grisi bu kuralla değişti.

## 3. Tablo (`src/game/pressure.ts`, tek ayar yeri)

Kullanıcı testi (2026-11-12): "2-3. bölümde zorlanmadım". Bölümler kısa sürdüğü için oyuncu bölüm başına çoğu zaman tek dalga görüyordu. Bu yüzden bölüm başı hız payı eklendi (bölüme girer girmez daha hızlı), ilk dalgalar büyütüldü ve hız tavanı 13'ten 11'e indi.

| Bölüm                      | İlk dalga (tek kare + virüs) | Bölüm başı hız | Hızlanma başına |
| -------------------------- | ---------------------------- | -------------- | --------------- |
| 1. Yanak                   | 1 + 1                        | +0             | +0,5 seviye     |
| 2. Gözler arası            | 2 + 1                        | +1             | +0,75 seviye    |
| 3. Alın                    | 3 + 1                        | +1,5           | +0,75 seviye    |
| 4. Kafa tabanı (+ Serbest) | 3 + 1                        | +1,5           | +1 seviye       |

Her yeni dalgada tek kare +1, virüs her 2 dalgada +1 (en çok 7 tek kare, 4 virüs). 4. bölümün akışı (müşteri örneğinden bir kare fazla):

| Dakika | 1     | 2   | 3     | 4   | 5     | 6   | 7     | 8   | 9     | 10  |
| ------ | ----- | --- | ----- | --- | ----- | --- | ----- | --- | ----- | --- |
| Olay   | 3 + 1 | +1  | 4 + 1 | +1  | 5 + 2 | +1  | 6 + 2 | +1  | 7 + 3 | +1  |

İniş süresi (ms; bir sıra), seviye 4'teki oyuncu için:

| Bölüm | Başı | 2. dk | 4. dk | 10. dk |
| ----- | ---- | ----- | ----- | ------ |
| 1     | 473  | 411   | 355   | 223    |
| 2     | 355  | 283   | 223   | 103    |
| 3     | 306  | 242   | 190   | 86     |
| 4     | 306  | 223   | 160   | 53     |

Tavan seviye 11 (~43 ms). Test: tavan 40 ms'nin, 4. bölümde 10. dakikada seviye 4 oyuncu 50 ms'nin üstünde.

## 4. Görünüm ve geri bildirim

- **Virüs hücresi** (`src/rendering/virusArt.ts`): yumuşak leylak zemin + kullanıcının virüs görseli; görsel yüklenmezse yuvarlak + iki göz. Tek kare, eski atak grisi gibi köşesinde turuncu işaretli gri bulutçuk.
- **Bar** (tahtanın altında/yanında): saatin ilerlemesi. Sıradaki adım dalgaysa turuncu-kırmızı, hızlanmaysa sıklamen (`.speed`). Ekran okuyucu adı "Sıradaki: virüs dalgası" / "Sıradaki: hızlanma".
- **Bildirimler** (`src/content/waves.ts`): "Virüs dalgası! · Virüslü satırı sil, ek puan kap", "Hızlanıyor! · Bloklar daha hızlı iniyor", "Virüs temizlendi · +N" (birden çoksa "N virüs temizlendi · +N"). Dalgada kısa ışıma, sarsıntı (hareketi azaltta yok), sert bırakma sesi ve titreşim; hızlanmada seviye sesi.

## 5. Analitik

- **Yeni:** `wave_dropped` (`wave`, `singles`, `viruses`, `room`, `level`), `speed_up` (`steps`, `room`, `level`), `virus_cleared` (`viruses`, `room`, `level`).
- **Kaldırılan:** `sinus_attack_row_added`.
- **Anlamı değişen:**
  - `sinus_attack_started` artık dalga başlangıcıdır.
  - `attack_line_cleared` dalga hücreli satırdır ve artık puanlıdır; bu satırlar `first_drain`'e de yazılır.

## 6. Virüs Avı'nın kaldırılması

- **Silinenler:** `src/virus/`, `tests/virus/`, `src/dev/virusDemo.ts`, kollu-bacaklı dans şeritleri (`virus-*-sheet.webp`, `tools/viruses/sheet.py`), tasarım ve plan belgeleri (`docs/superpowers/…virus-avi…`).
- **Ortak dosyalar** Virüs Avı öncesi (`9c8b217`) hâline döndü: `index.html`, `bootstrap.ts`, `SoundManager.ts`, `music.ts`, `InputController.ts`, `localScores.ts`, `styles.css`, `analytics.ts`, `platform.ts`, `scoresView.ts` ve ilgili testler.
- **Etkiler:**
  - mod seçici, Doktor Elif, Virüs Avı müziği ve yerel `virus-avi-v1` listesi yok;
  - eski yerel kayıtlar silinmedi, yalnızca gösterilmiyor;
  - `virus_*` analitik olayları yok.
- **Geri getirmek gerekirse:** kod git geçmişinde duruyor (`7571a6a` ve öncesi).

## 7. Yayın öncesi

- Supabase: `supabase/migrations/20261112000000_tetris_ruleset_sinus_dalga.sql` uygulanmalı ve `tetris-submit-score` Edge Function yeniden yayınlanmalı (`RULESET = 'sinus-dalga-v1'`, skor üst sınırına virüs bonusu eklendi).
- Etiket yöneticisi: 5. bölümdeki olay değişiklikleri.
- İçerik incelemesi listesine: 4. bölümdeki üç bildirim ve bar adları.

## 8. Doğrulama

- `npm run check`: typecheck, lint, format, 1012 test, build temiz. (Tüm depoda `prettier --check`, bu işte dokunulmayan CRLF satır sonlu bazı belgeleri işaretliyor; değiştirilen dosyalar temiz.)
- Yeni testler:
  - `tests/game/waves.test.ts`: tablo, müşteri örneği, bölüm sıfırlaması, Serbest nefes, hız tavanı, seviyenin değişmemesi.
  - `tests/game/sinusAttack.test.ts` yeniden yazıldı: düşme kuralları, virüs türü, puan ve bonus, taşıma, determinizm, skor üst sınırı.
- Headless Edge ekran görüntüsü (4. bölüm, dört dalga): virüsler ve tek kareler doğru yerde; bar hızlanmayı gösteriyor; "Hızlanıyor!" bildirimi okunuyor.

## 9. Ayar için

Tempo cihazda denenip `PRESSURE` (`src/game/pressure.ts`) tablosuyla ayarlanır: bölüm satırları, `singlesGrowth`, `virusEvery`, `maxSingles`, `maxViruses`, `gravityCap`, `virusBonus`. Adım süresi `SINUS.attackMs` (60 sn). Geliştirmede:

- `__fn.sinus.step()`: saatin sıradaki adımını hemen atar.
- `__fn.sinus.attack()`: bir dalga düşürür.
- `__fn.sinus.state()`: sıradaki adım, hız payı, iniş süresi ve virüs sayıları.
