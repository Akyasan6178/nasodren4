# NS4-46 · Sekiz bölüm ve sanal oyuncu testiyle zorluk (P1)

Tarih: 2026-11-12. NS4-45'in (zorlaşan dalgalar) devamı; aynı kural seti `sinus-dalga-v1` (henüz yayınlanmadı).

## 1. İstek ve kararlar

- **Kullanıcı testi:** "2–3. bölümde zorlanmadım."
- **Kullanıcı isteği:** "Kendin test et; Tetris bilen ve bilmeyen gözüyle, zorluk ve bölüm tasarımı açısından."
- **Yeni görseller:** `bolumler` klasörüne boşluk görselleri eklendi; toplam 8 bölüm olacak.

Kararlar (2026-11-12):

| Konu      | Karar                                                                                                                                                                               |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Bölümler  | 1–2 burun boşluğu, 3–4 yanak (maxillary), 5–6 gözler arası (etmoid), 7–8 alın (frontal); her çiftte önce sol, sonra sağ. Kafa tabanı (sfenoid) kalktı. "Sol" ekranda soldaki taraf. |
| Görseller | Yalnızca bölüm geçiş kartında.                                                                                                                                                      |
| Zorluk    | Sanal oyuncu testindeki P1 paketi 8 bölüme uyarlanarak uygulandı.                                                                                                                   |

## 2. Sanal oyuncu testi

Motoru insan hızında oynayan dört profil yazıldı. Simülatör proje dışında, oturumun geçici klasöründe duruyor; istenirse `tools/` altına alınabilir.

- **Uzman:** saniyede 1,7 parça.
- **Tetris bilen:** saniyede 1,1 parça.
- **Ara sıra oynayan:** saniyede 0,8 parça.
- **Hiç bilmeyen:** saniyede 0,4 parça.

Ortak davranış:

- Parça, karar ve tuş süreleri boyunca yerçekimiyle düşmeye devam eder.
- Usta ve orta profiller bilinen Dellacherie değerlendirmesiyle oynar; acemi "alçak kal, boşluk açma" mantığıyla oynar ve sık hata yapar.
- Güçler, fark edilme olasılığıyla kullanılır.

### 4 bölümlü eski durumdaki bulgular

1. **Bilen biri bölümlerde dalga görmüyordu.** Bölümler 6–30 saniye sürüyordu, ilk dalga ise 1. dakikadaydı. Dalgalar kapatıldığında sonuçlar neredeyse değişmedi. Kullanıcının "2–3. bölüm kolay" hissinin nedeni buydu.
2. **"10 dakika" hedefine kimse ulaşmıyordu.** Serbest nefeste, satır başına artan klasik hız yüzünden 3–4 dakikada parçalar anında düşüyordu.
3. **Asıl zorluk aracı hız.** Tek karelik dalgalar uzman için zayıf baskıydı.
4. **Hiç bilmeyenin 2. bölümde takılması tasarımdan değil.** Aynı profil sade Tetris'te de ~3 dakika dayanıyor.

### P1 paketi

- Bölüm saatinde ilk adım 15. saniyede, sonrakiler her 30 saniyede.
- Satırdan gelen hız seviye 6'da durur. Sonrası yalnızca saatten gelir: her hızlanmada +0,5, tavan seviye 14.
- Dalga en çok 10 tek kare + 5 virüs.
- Gri sıra sayıları yeniden ayarlandı.

## 3. Sonuç (80 oyun / profil)

| Profil           | Ortalama süre | Nerede kaybediyor                                           |
| ---------------- | ------------- | ----------------------------------------------------------- |
| Uzman            | 14,7 dk       | 8 bölüm ~1,5 dk, Serbest nefeste ~13 dk                     |
| Tetris bilen     | 11,2 dk       | 8 bölüm ~2 dk, Serbest nefeste ~9 dk                        |
| Ara sıra oynayan | 7,2 dk        | 2.–8. bölüm ve Serbest nefese yayılmış (en çok 4.–6. bölüm) |
| Hiç bilmeyen     | 4,1 dk        | 1.–5. bölüm (en çok 2.–3.); sade Tetris'teki sınırına yakın |

Karşılaştırma (dalgalar ve saatten gelen hız kapalı): uzman ve bilen 25 dakikanın sonuna kadar yaşıyor, yani dalgalar ve hızlanma artık gerçekten iş görüyor.

## 4. Bölüm yapısı (`src/config/gameConfig.ts` `ROOMS`)

| #   | Bölüm                  | Gri sıra | Kanal | Ek boşluk | İlk dalga | Bölüm başı hız |
| --- | ---------------------- | -------- | ----- | --------- | --------- | -------------- |
| 1   | Sol burun boşluğu      | 2        | 1     | 0         | 1 + 1     | +0             |
| 2   | Sağ burun boşluğu      | 3        | 1     | 0         | 1 + 1     | +0,25          |
| 3   | Sol yanak sinüsü       | 3        | 1     | 0         | 2 + 1     | +0,5           |
| 4   | Sağ yanak sinüsü       | 4        | 2     | 0         | 2 + 1     | +0,75          |
| 5   | Sol gözler arası sinüs | 5        | 2     | 0         | 2 + 1     | +1             |
| 6   | Sağ gözler arası sinüs | 6        | 2     | 0         | 3 + 1     | +1,25          |
| 7   | Sol alın sinüsü        | 6        | 2     | 1         | 3 + 1     | +1,5           |
| 8   | Sağ alın sinüsü        | 8        | 2     | 1         | 3 + 1     | +1,5           |

- Bütün bölümlerde her hızlanma +0,5 seviye. Serbest nefes 8. bölümün satırını ve saatini sürdürür.
- 1.–3. bölümde 3 ya da daha az gri sıra var. Sıklamen gücü (oyun başına tek kullanım) bu bölümleri tek basışta açabilir; acemiye bilinçli bir yardım. Test, kuralı 4+ sıralı bölümler için korur.
- Bölüm bonusu: 1000 × bölüm sırası × seviye. Sunucu sınırı 8 bölüme göre güncellendi.

## 5. Görünüm

- **Geçiş kartı:** görseli olan bölümlerde (yanak sol/sağ, alın sol/sağ) haritanın yerine boşluğun görseli çıkar.
  - Görselin renkleri değiştirilmez; yalnızca çerçeve basınç renginden turkuaza döner ve görsel hafifçe aydınlanır.
  - Kaynaklar `art/bolumler/` altında; `python tools/bolumler/prepare_bolumler.py` boşluğun çevresinden kırpıp ~7 KB WebP yazar (`public/images/bolumler/`).
- **Görseli olmayan bölümler** (burun sol/sağ, gözler arası sol/sağ) yüz haritasını gösterir. Görsel gelirse `ROOM_ART`'a (`src/content/rooms.ts`) bir satır eklenir. `art/bolumler/etmoid sinus.png` bir şema olduğu için kullanılmadı.
- **Kart başlığı:** burun bölümlerinde "Burun açıldı!" (burun boşluğu bir sinüs değil), diğerlerinde "Sinüs açıldı!".
- **Yüz haritası** (kullanıcı isteği: "etmoid sinus.png'deki çizimler gibi"): kartta ve final ekranında yüz, kullanıcının şemasından üretilir (`python tools/bolumler/trace_map.py --svg`, `index.html` içindeki iki haritayı yeniden yazar; `--preview` kontrol görüntüsü verir).
  - Şekiller renkten ayıklanır: alın (yeşil), gözler arası (mavi-leylak), yanak (mor), burun boşluğu (beyaz kontur).
  - Sağ burun boşluğu ve sağ yanak, sol tarafın burun bölmesine göre aynasıdır: şemada sağ burun ayrı çizilmemiş, sağ yanağın üstüne etiket biniyor.
  - Kaşlar, göz kapakları, göz akı, iris ve göz bebeği, burun delikleri de şemadan alınır; burun ucunda kullanıcının sıklamen çiçeği (`cicek-fusya`) durur.
  - Kapalı bölüm şemadaki renginde (`--map-*` tokenları), açılan ve açık bölüm turkuaz, sıradaki bölüm sıklamen kenarlıdır.
  - Not: alın sinüsünün yeşili şemadan geliyor; eski "yeşil yok" kuralına kullanıcının çizimi gereği bir istisna.
- **Duvar şekilleri** türden gelir:
  - sağ taraf sol tarafın aynasıdır;
  - yeni burun şekli dar bir geçit, dış duvarda üç kıvrım (konka), iç duvar düz;
  - alın şekli simetrik olduğu için sol ve sağ aynı görünür.
- **Ton ve müzik** türden gelir (sol ve sağ aynı). `data-room` artık tür adını taşır (`burun | yanak | etmoid | alin | free`).
- **Başlangıç bildirimi:** "N. oda · …" yerine "N. bölüm · …".

## 6. Yayın öncesi

- Supabase:
  - `scoreRules.ts`: `rooms: 8`;
  - NS4-45'teki `sinus-dalga-v1` migration'ı;
  - Edge Function yeniden yayını.
- İçerik incelemesi:
  - 8 bölüm adı;
  - "Burun açıldı!";
  - "N. bölüm · …".

## 7. Doğrulama

- Typecheck, lint, format ve build temiz; 1019 test yeşil.
- Testi güncellenenler: oda ve duvar testleri, harita kartı (8 bölge, görsel/harita geçişi), müzik tonu (tür tablosu), yerçekimi (seviye 6 sınırı), dalga tablosu (`tests/game/waves.test.ts`).
- Headless Edge ekran görüntüleri:
  - 1. bölüm başı (2 sıra, burun duvarı);
  - burun kartı (harita, "Burun açıldı!");
  - yanak ve alın kartları (görsel, çerçeve geçişi);
  - final ekranı (8 bölge açık).
