# NS4-09 · Oyun dönüşümü: "Sıklamen'in Sinüs Macerası"

Bu görev oyunu herkesin anlayacağı, karakterli ve öğretici bir maceraya dönüştürür. Girdi: `Alternatif Tetris ve Oyunlaştırma Araştırması.pdf` ve ürün geri bildirimi. Geri bildirimin istekleri şunlardı: anlaşılır olsun, her kitleye eğlenceli gelsin, ana karakter sıklamen çiçeği olsun, oyuncu sinüsün içindeymiş ve orayı temizliyormuş gibi hissetsin, bilgi kartları çıksın.

## 1. Süreç ve alınan kararlar

**İlk deneme (geri alındı).** Araştırmadaki Sandtrix fikriyle bir kum/tane motoru kuruldu. Kural şuydu: aynı renk soldan sağa birleşince akar. Geri bildirim bunun **anlaşılır olmadığını** gösterdi. Soyut bir renk kuralı ilk 10 saniyede kavranmıyor. Tane motoru kaldırıldı.

**Son tasarım.** Evrensel olarak bilinen kural geri geldi: "sırayı doldur, sıra temizlensin". Üzerine hedefli bir yapı kuruldu. Her bölüm tıkanmış bir sinüsle başlar ve oyuncu onu açar. Benzer örnekler:

- Dr. Mario: şişedeki virüsleri temizleyince bölüm biter.
- Tetris'in "dig" modu: alttaki çöp satırlarını kazarak temizlersin.

| İstek                    | Karşılık                                                                                                                                                                                                                                                                            |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Anlaşılır                | Tek cümlelik hedef: "Tıkanıklığı temizle". İlk bölüm 2 sıra, geniş kuyu. Güçler kademeli açılır (1. bölümde yok, 2. bölümde Sıklamen, 3. bölümde sentetik açıcı).                                                                                                                   |
| Ana karakter Sıklamen    | Ekranda hep duran, yüzü ve kalp yaprak kolları olan çiçek. Konuşarak öğretir, tepki verir (sevinir, endişelenir, üzülür, hapşırır gibi güç kullanır). Gücü dolunca "Bana dokun!" der; güç butonu karakterin kendisidir.                                                             |
| Sinüsün içindeyiz        | Tahta koyu mukoza tonunda bir boşluk: kenarlarda mukoza kıvrımları, dalga gibi çırpınan **siller** (metakronal dalga), yükselen hava kabarcıkları, tabanda **ostium**. Tıkaç yapışkan, kabarcıklı mukus; içinde yaramaz mikroplar. Bölüm bitince ostium açılır, ışık ve hava dolar. |
| Eğlenceli, akılda kalıcı | Sinüs haritası (yüz çiziminde açılan sinüsler boyanır), 3 yıldız, mikrop patlatma, karakter tepkileri, kart koleksiyonu.                                                                                                                                                            |
| Bilgi kartları           | 13 kart. Bölüm sonunda (8 kart) ve oyun içi ilk anlarda (5 kart) açılır, "Bilgi kartlarım" albümünde birikir. Oyunu bölmez: kart sonuç ekranında gösterilir, oyun içinde yalnızca kısa bildirim çıkar.                                                                              |

### Araştırmadan alınanlar ve bilerek alınmayanlar

**Alınanlar:**

- Dr. Mario benzeri "hastalığı temizle" hedefi.
- CellCraft'taki kademeli öğretim.
- Octalysis dengesi: Sıklamen gücü emekle kazanılır (beyaz şapka); sentetik açıcı anlık rahatlama ile gecikmeli bedel getirir (dozlu siyah şapka).
- SDT çerçevesi:
  - özerklik: bölüm seçimi, gücü ne zaman kullanacağın;
  - yetkinlik: yıldızlar, kademeli zorluk;
  - ilişkisellik: karakterle bağ.

**Önceki turda da reddedilip burada da uygulanmayanlar:**

- **"İlacı sıkınca oyunda güç açılır" fikri.** Bu, kullanımı ödüllendirir: gereğinden sık kullanım riski taşır, beyan doğrulanamaz ve tanıtım mevzuatı açısından sorunludur.
- **Yan etkileri zafer gibi sunmak.**
- **Sayısal etkinlik iddiaları.**

## 2. Oyun kuralları

| Konu           | Kural                                                                                                                                                                                                              |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Bölüm          | Alttan `rows` sıra tıkaç (değer 9), içinde `germs` mikrop (değer 10). Her sırada `holes` yan yana boşluk. Boşluklar 2–4 sıra boyunca aynı sütunda durur ("kuyu"). Yerleşim tohumludur: bölüm her denemede aynıdır. |
| Kazanma        | Bütün tıkaç temizlenince `won` + `stagecomplete`. Yıldız: parça sayısı ≤ par → 3, ≤ 1,5×par → 2, değilse 1.                                                                                                        |
| Kaybetme       | Yığın tepeye ulaşırsa "Sinüs yeniden tıkandı" ekranı çıkar ve "Tekrar dene" ile bölüm baştan başlar.                                                                                                               |
| Hız            | Bölüm tanımında sabit (seviye 1–4); bölüm içinde seviye atlanmaz.                                                                                                                                                  |
| Mikrop         | Satırla birlikte temizlenir; mikrop başına `100 × seviye` puan, "puf" efekti, karakter sevinci.                                                                                                                    |
| Sıklamen gücü  | 8 temizlenen satırda dolar (`cycChargeLines`). Dolu alt 3 sırayı eritir (`cycRows`), 20 sn ×2. Tekrar kullanılabilir. Serbest oyun %50 şarjla başlar.                                                              |
| Sentetik açıcı | Değişmedi: %35 tıkanıklıkta açılır, alt 3 sıra; 2. kullanımdan itibaren rebound.                                                                                                                                   |
| Serbest oyun   | Önceki sonsuz oyun (seviye, T-spin, kombo, rozetler) aynen korunur.                                                                                                                                                |

### Bölümler (`src/content/stages.ts`)

| #   | Sinüs         | Sıra | Kuyu | Mikrop | Hız | Par | Güç                    | Kart                  |
| --- | ------------- | ---- | ---- | ------ | --- | --- | ---------------------- | --------------------- |
| 1   | Maksiller 1/2 | 2    | 2    | 1      | 1   | 8   | yok                    | Yanak sinüsü          |
| 2   | Maksiller 2/2 | 5    | 2    | 2      | 1   | 7   | Sıklamen (dolu başlar) | Silyalar              |
| 3   | Frontal 1/2   | 5    | 1    | 3      | 1   | 16  | + sentetik             | Alın sinüsü           |
| 4   | Frontal 2/2   | 6    | 2    | 3      | 2   | 20  | ikisi                  | Sinüsler ne işe yarar |
| 5   | Etmoid 1/2    | 6    | 1    | 4      | 2   | 18  | ikisi                  | Gözler arası petek    |
| 6   | Etmoid 2/2    | 7    | 2    | 5      | 3   | 22  | ikisi                  | Çoğu zaman virüs      |
| 7   | Sfenoid 1/2   | 7    | 1    | 5      | 3   | 25  | ikisi                  | En derindeki sinüs    |
| 8   | Sfenoid 2/2   | 8    | 1    | 6      | 4   | 28  | ikisi                  | Ne zaman hekime       |

### Kalibrasyon

Kalibrasyon proje dışındaki bir betikle, El-Tetris benzeri sezgisel bir botla yapıldı. Her ayarda 12 oyun oynandı. `noise` değeri insan hatasını taklit eden rastgelelik miktarıdır.

1. **İlk tasarım:** boşluklar her sırada rastgele yerdeydi. Gürültülü bot **hiçbir bölümü geçemedi**; yalnızca I parçası tek hücrelik bir kuyuya girebiliyordu.
2. **Kuyu yapısı:** 2–4 sıralık hizalı kuyular ve ilk bölümlerde 2 hücre genişlik getirildi.
3. **Güç ayarı:** Sıklamen gücü 4 sıradan 3 sıraya indi, şarj eşiği 6 satırdan 8 satıra çıktı. 4 sıralık güç bölümleri tek hamlede bitiriyordu.
4. **Son durum:** gürültüsüz ve orta gürültülü botlar bütün bölümlerde 10–12/12 kazanıyor. Yüksek gürültüde (neredeyse rastgele oynayan) kazanma oranı 3/12 ile 12/12 arasında. Par değerleri gürültüsüz botun ortalamasına göre ayarlandı.

## 3. Bilgi kartları (`src/content/cards.ts`)

Kart içerikleri NHS, CDC, Cleveland Clinic, AAO-HNS/CHOP, FDA, RHS ve ASPCA kaynaklarından derlendi; her kartta kaynak adı görünür. Araştırmadan gelen önemli düzeltmeler:

- **İyileşme süresi:** akut sinüzit için "2 hafta" değil, "birkaç hafta" kullanıldı (NHS: 4 hafta içinde).
- **Doğrulanamayanlar kartlara girmedi:** günlük mukus miktarı ve frontal sinüsün kesin gelişme yaşı.
- **Sıklamen kartı:** yalnızca botanik ve güvenlik bilgisi içerir ("yumrusu zehirlidir"). Piyasada sıklamen ekstreli spreyler bulunduğu için hiçbir etkinlik iddiası yoktur.
- **Burun yıkama kartı:** musluk suyu yerine steril ya da kaynatılıp soğutulmuş su kullanılması uyarısı eklendi (FDA).

| Durum                                                    | Kartlar                                                     |
| -------------------------------------------------------- | ----------------------------------------------------------- |
| `approved` (onaylı ipucu metniyle birebir)               | Kullanım süresine dikkat (rebound), Ne zaman hekime gitmeli |
| `review` (**yayın öncesi tıbbi/editoryal onay gerekli**) | Diğer 11 kart                                               |

Açılış koşulları:

- Bölüm sonları: 8 kart.
- İlk Sıklamen gücü kullanımı: "Sıklamen" kartı.
- İlk rebound: "Kullanım süresine dikkat" kartı. Bu kart sessiz açılır; böylece aynı anda çıkan onaylı rebound uyarısının üzerine yazmaz.
- Serbest oyunda 10, 25 ve 50 satır: Belirtiler, Bol su, Koku kartları.

## 4. Mimari değişiklikler

| Dosya                                               | Değişiklik                                                                                                                                                                                   |
| --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/game/Game.ts`                                  | `reset({ mode, stage })`, tıkaç sayımı (`clogLeft`, `germsLeft`, `progress`), `win()`, şarjlı sıklamen (`cycCharge`, `cycUses`, `charge()`), mikrop puanı. Tahta dışı değer `9 → OUT (255)`. |
| `src/game/stages.ts`                                | **Yeni.** Tohumlu tıkaç ve mikrop yerleşimi.                                                                                                                                                 |
| `src/game/rng.ts`                                   | **Yeni.** mulberry32.                                                                                                                                                                        |
| `src/content/stages.ts`, `src/content/cards.ts`     | **Yeni.** Bölümler, sinüs adları, kartlar.                                                                                                                                                   |
| `src/rendering/decor.ts`                            | **Yeni.** Sinüs boşluğu dekoru (siller, kıvrımlar, kabarcıklar, ostium).                                                                                                                     |
| `src/rendering/GameView.ts`, `textures.ts`          | Mukus tıkacı ve mikrop dokuları, mikrop kıpırdaması ve patlaması, karakterden sprey, bölüm sonu efekti, `resetFx()`.                                                                         |
| `src/ui/hero.ts`                                    | **Yeni.** Sıklamen SVG'si, ruh hali, güç halkası, konuşma balonu.                                                                                                                            |
| `src/ui/cards.ts`                                   | **Yeni.** Kart görünümü, albüm, kart açma.                                                                                                                                                   |
| `src/ui/screens.ts`, `hud.ts`, `powerups.ts`        | Başlangıç menüsü, harita, bölüm sonu, bölüm paneli (sinüs adı, açıklık çubuğu, kalan mikrop), güç durumları.                                                                                 |
| `src/app/lifecycle.ts`, `events.ts`, `bootstrap.ts` | İki mod, bölüm sonu akışı, karakter tepkileri, kartlar.                                                                                                                                      |
| `src/rendering/layout.ts`                           | `btnCyc` artık karakter: portrede alt çubuğun ortasında, yatayda sol sütunda büyük.                                                                                                          |
| `index.html`, `src/styles.css`                      | Yeni ekranlar (harita, bölüm sonu, albüm, kart) ve karakter animasyonları. Oyun tahtası tokenı mukoza tonuna döndü; yeni renkler `:root` tokenlarında.                                       |

## 5. Sözleşme değişiklikleri

- **Analitik:** mevcut olayların alanları değişmedi. `game_start` ve `game_over` artık **yalnızca serbest oyunda** gönderiliyor. Yeni olaylar ve değerler:
  - `stage_start`: stage, attempt
  - `stage_complete`: stage, stars, pieces, score, dur_s
  - `stage_fail`: stage, reason, pieces, progress, dur_s
  - `card_unlock` ve `card_view`: id
  - CTA yerleşimi `stage_complete`

  Analitik ekibine bildirilmeli.

- **Kalıcı veri (`fn_meta`):** isteğe bağlı `stages` (bölüm başına 0–3 yıldız) ve `cards` alanları eklendi. Eski kayıtlar olduğu gibi geçerlidir ve yeniden yazılmaz.
- **Game olayları:** `germs`, `cycready`, `stagecomplete` eklendi; mevcut olaylar değişmedi.

## 6. İnceleme gerektirenler

1. `review` durumundaki 11 bilgi kartı.
2. Sıklamen'in konuşmaları (`src/content/stages.ts` ve `src/app/events.ts`) ile "Nasıl oynanır" metni.
3. Karakterin adı. Şu an "Sıklamen". Marka bir isim isterse metinlerde tek tek değiştirilmeli.
4. Sıklamen ile sentetik açıcı karşıtlığı (önceki sürümden devam). Tanıtım mevzuatı açısından değerlendirilmeli.

## 7. Doğrulama

- Typecheck, lint, format (satır sonu ayrımı gözetilmeden), **194 test** ve build geçti.
- Yeni testler:
  - `tests/game/stages.test.ts`: tıkaç yerleşimi, kazanma, yıldız, mikrop, güç kısıtları, içerik.
  - `tests/ui/adventure.test.ts`: bölüm akışı, kayıt, analitik, kart içeriği.
  - Kayıt şeması testleri.
- Headless smoke (Playwright + Edge; 390×844 dokunmatik ve 1280×800): başlangıç, harita, 1. bölümün oynanıp kazanılması, bölüm sonu ve kart, 2. bölümde güç kullanımı, oyun sonu, albüm, kart ayrıntısı. Sayfa ve konsol hatası yok.

## 8. Açık işler

- Gerçek oyuncularla zorluk ayarı: par değerleri ve hızlar, `stage_*` olay verisiyle güncellenmeli.
- Renk körlüğü için blok desenleri.
- Karakter için seslendirme veya daha zengin animasyon (Lottie/Spine).
- Sinüs başına arka plan çeşitliliği.
- Bölüm 8 sonrası "bütün sinüsler açık" kutlama sahnesi.
