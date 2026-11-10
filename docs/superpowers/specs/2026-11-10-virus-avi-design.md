# Virüs Avı modu · Tasarım (NS4-44)

Tarih: 2026-11-10. Durum: kullanıcı onayladı (2026-11-10).

## 1. Amaç ve neden

Ferah Nefes'e, düşen kapsüllerle tahtadaki virüslerin temizlendiği ikinci bir oyun modu ekliyoruz: **Virüs Avı**. Türün bilinen mekaniğinden (iki hücreli kapsül, önceden yerleştirilmiş virüsler, 4'lü dizince silinme, virüs bitince bölüm sonu) esinlenir. Kullanıcının tek ve kesin isteği: **renk eşleşme şartı yok.** Renge göre eşleşme oyunu zorlaştırıyor; burada renk sadece görünüştür, aynı sırada ya da sütunda kesintisiz 4 dolu hücre yeterlidir.

Modu ilk kez açan oyuncuya, oyunun kendi karakteri **Doktor Elif** kısa ve uygulamalı bir öğretici gösterir. Öğretici her seferinde çıkmaz.

Kullanıcı, kendi virüs görsellerini `public/images/virüsler/` klasörüne ekledi (`bacteria.png`, `bacteria2.png`, `bacteria3.png`). Bunlar oyunun tarzına uyarlanacak.

## 2. Hedefler

- Ana menüden girilen, kendi kuralı, tahtası ve oyun sonu olan, tek oyunculu bir mod.
- Renksiz 4'lü kuralı, zincirleme düşme ve bölüm ilerlemesi.
- Tahtanın yanında, üç virüs türünü canlı gösteren ve onlara tepki verdiren bir **lens paneli**.
- Doktor Elif'in anlattığı, her adımı oyuncunun gerçekten yaparak geçtiği tek seferlik öğretici.
- Skorlar ayrı bir yerel rekor listesinde.

## 3. Hedef olmayanlar (bu işte yapılmayacak)

- Global skor tablosu (Supabase, Edge Function, migration). Mod dengesi oturduktan sonra ayrı bir iş olarak ele alınacak.
- Çok oyunculu Virüs Avı.
- Bu modda Sıklamen, Hapşırık, Spray, Sinüzit Atağı, odalar, Beklet ve gizemli "?" sıradaki kartı.
- Renk eşleşme kuralı (seçenek olarak bile eklenmeyecek).

## 4. Kaçınılacaklar (çalışsa bile başarısızlık sayılır)

- **Belli bir oyunun kopyası olmak.** Mod "Dr. Mario" adını, Mario'yu, kafa aynasını, bıyıklı doktor tipini, o oyunun büyüteç sahnesini ve dans koreografisini, müziğini, kapsül renk üçlüsünü (kırmızı/sarı/mavi) ve bölüm/hız formüllerini birebir taşımaz. Mekanik tür olarak kullanılır; görünüm, karakter, sayılar ve isimler bizim olur.
- **İğrenç görüntü.** Yeşil-sarı tonlar, ıslak doku, "sümük" sözcüğü, korkutucu dişler yok (yol haritası kuralı). Virüsler sevimli olmalı.
- **Tıbbi iddia ya da ürün önerisi.** Doktor Elif yalnızca oyunu anlatır. Hiçbir ilaç, sprey ya da tedavi önermez veya ima etmez.
- **Klasik modu bozmak.** Klasik oyunun kuralı, skoru, çok oyunculu tekrar üretilebilirliği ve mevcut testleri değişmemeli.

## 5. Kısıtlar (projenin çalışma kuralları)

- Görev numarası **NS4-44**. `docs/NS4-44-VIRUS-AVI.md` raporu, testler ve bitişte `npm run check` (typecheck, lint, format, test, build) temiz olmalı.
- Renkler yalnızca `src/styles.css` `:root` tokenı olarak tanımlanır (tema testi). PIXI tarafında da mevcut token okuma yolu kullanılır.
- Görünür metinler sade, gündelik Türkçe olur; tıbbi ya da teknik jargon kullanılmaz (NS4-43). Yeni metinler `tests/helpers/inventory.ts` ve içerik güvenliği testine bilinçli olarak eklenir.
- Hareketi azalt ayarı, dikey/yatay yerleşim, klavye ve dokunma, ekran okuyucu etiketleri mevcut ekranlardaki düzeyde desteklenir.
- Görseller kullanıcının kaynak görsellerinden üretilir (sıfırdan çizim değil). Üretim betikleri `tools/blocks/` örneğindeki gibi `tools/viruses/` altında durur, kaynak dosyalar silinmez.
- **Görsel onay noktaları:** (1) boyanmış virüsler, (2) Doktor Elif'in son çizimi, (3) kapsül görünümü. Her biri oyuna bağlanmadan önce kullanıcıya gösterilir ve onayı alınır (renkli bloklar kuralı).
- Görsel doğrulama: `npx vite --port 5199` + scratchpad'e kurulan `playwright-core@1.48.2`, `channel: 'msedge'`. Projeye bağımlılık eklenmez, iş bitince 5199 kapatılır.

## 6. Yaklaşımlar

| Yaklaşım                                  | Özet                                                                                                                                                       | Artı                                                                     | Eksi                                                                                                                      |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| **1. Ayrı motor ve ayrı çizim (seçildi)** | `src/virus/` altında yeni kural motoru (`VirusGame`) ve tahta çizimi (`VirusView`). Menü, ayarlar, ses, yerleşim, kontroller, arka plan ve efektler ortak. | Klasik moda ve çok oyunculuya dokunmaz; kurallar tek başına test edilir. | Daha çok yeni kod.                                                                                                        |
| 2. Mevcut motora mod bayrağı              | Kapsül yeni parça tipi, virüs yeni hücre türü; `Game.ts` içine eklenir.                                                                                    | Daha az dosya.                                                           | Oda, atak, Spray, sıklamen kurallarının hepsine mod kontrolü; ana oyunda ve çok oyunculu eşitlikte gerileme riski yüksek. |
| 3. Ayrı sayfa                             | Kendi HTML girişi olan bağımsız mini oyun.                                                                                                                 | Tam yalıtım.                                                             | Menü, ayar ve sesin kopyası; tutarsız deneyim. Elendi.                                                                    |

Kullanıcı 1'i seçti: ana oyun yeni bitti ve yayına hazırlanıyor, yeni mod onu riske atmamalı.

Mekanik için de üç seçenek konuşuldu: **A) kapsül + renksiz 4'lü (seçildi)**, B) Tetris parçaları + virüslü satırı tamamlama (mevcut odalara fazla benziyor), C) virüsü kapsülle sarma (ilk bakışta anlaşılmaz).

## 7. Kullanıcının kararları

### 7.1 Oynanış (A)

- Yukarıdan **iki hücreli kapsül** düşer. Kontroller klasik modla aynı: kaydır, döndür (iki yön), yavaş indir, anında bırak. **Beklet yok.** Sıradaki kapsül düz gösterilir ("?" kartı yok).
- Bir **sırada ya da sütunda kesintisiz 4 veya daha fazla dolu hücre** (kapsül yarısı ya da virüs) oluşunca, o dizilerdeki bütün hücreler aynı anda silinir. **Renk fark etmez.** Dizideki virüsler yok olur.
- Silmeden sonra altı boşalan kapsül parçaları düşer. Düşüş yeni 4'lüler oluşturursa onlar da silinir: **zincir**.
- Bütün virüsler temizlenince bölüm biter. Sonraki bölümde virüs sayısı ve hız artar.
- Yeni kapsül tahtaya giremezse oyun biter.
- **Her bölümün süresi vardır (kaybetme kuralı, 2026-11-10'da kullanıcı seçti).** Renksiz 4'lü kuralı tahtanın dolmasını neredeyse imkânsız kıldığından asıl kaybetme yolu süredir. Süre biterse oyun biter (`time` sebebi) ve skor kaydedilir. Bölüm bitince kalan süre bonus puana dönüşür. Süre HUD'da görünür. Mola, oyun sonu, bölüm geçişi ve öğretici sırasında süre durur. Öğretici bölümünde süre yoktur.

### 7.2 Lens paneli

- Bilgisayar ve yatay ekranda tahtanın **solunda** büyük, yuvarlak bir lens. Dikey telefonda üst HUD şeridinde küçük bir lens. Görünüm, HUD'un cam panelleriyle aynı tarzdadır; büyüteç sapı ya da o oyunun sahne düzeni kullanılmaz.
- Tahtadaki her virüs üç türden biridir. Lensteki her virüs kendi türünü temsil eder ve yanında kalan sayıyı gösterir.
- Tepkiler: hafif sallanma; kendi türünden bir virüs silinince irkilme; süre azalınca ya da tahta dolmaya başlayınca kıs kıs gülme; kendi türünün sonuncusu da silinince "pop" ile kaybolma; yeni bölümde üçünün geri gelmesi. Hareketi azalt açıkken sallanma ve sarsılma olmaz, tepkiler kısa ifade/opaklık değişimiyle verilir.

### 7.3 Virüs görselleri

- Üç görsel, yeniden çizilmeden, oyunun **leylak, pembe ve bordo** tonlarına boyanır (`--color-pressure`, `--color-pressure-soft`, `--color-cyclamen`, `--color-cyclamen-strong` ailesi). Yeşil kalmaz.
- **Güncelleme (2026-11-10, kullanıcı onayı 1):** tek gözlü virüs (`virus-1`) kullanıcı isteğiyle **yeşil** kalır ("tatlı dursun, virüs olduğu belli olsun"). Limon/sarı-yeşil değil, temiz yaprak yeşili (ton 128°); diğer ikisi pembe ve bordo. Ağız içleri her üçünde koyu bordo. Doktor Elif dört pozuyla onaylandı (onay 2).
- `bacteria2`'nin kızgın kaşları ve sivri dişleri yumuşatılır; sevimli ya da şaşkın bir ifadeye çevrilir.
- Aynı görseller hem lenste hem tahta hücrelerinde kullanılır.

### 7.4 Doktor Elif

- Seçilen taslak: `.superpowers/brainstorm/1632-1794339190/content/doktor-taslaklari.html`, kart A. Genç, güler yüzlü kadın doktor; topuz saç, beyaz önlük, turkuaz forma, turkuaz steteskop, yakada nazar boncuğu.
- Oyunun tarzında, gölgeli ve temiz çizgili son hâli çizilir. Dört ifade: **selam, gösterme, alkış, "oops".**
- Doktor figürü ve Elif'in bütün cümleleri hukuki inceleme listesine eklenir (ilaç tanıtımında sağlık mesleği mensubu kullanımı riski). `docs/YOL-HARITASI.md` bölüm 3.4'e işlenir.

### 7.5 Öğretici

- **Yalnızca modu ilk kez oynayana** çıkar. Tamamlanınca **ya da atlanınca** kalıcı olarak "görüldü" sayılır ve bir daha kendiliğinden çıkmaz. Kayıt, klasik öğreticiden ayrı bir anahtardadır.
- "Nasıl oynanır" ekranından istenince yeniden izlenebilir.
- Elif ekranın kenarından konuşma balonuyla anlatır; oyun durdurulup uzun anlatım yapılmaz. Her adım, oyuncu o eylemi yapınca geçilir. "Atla" butonu her zaman görünür.
- Adımlar:
  1. **Selam:** "Merhaba, ben Doktor Elif! Sinüsteki virüsleri birlikte temizleyelim."
  2. **Kapsül:** "Kapsülü kaydır ve döndür." Kaydırma ya da döndürme yapılınca geçilir.
  3. **Dörtlü:** "Renk fark etmez! Yan yana ya da üst üste 4 tane diz, patlasın." İlk silme olunca geçilir.
  4. **Virüs:** "Virüsü dörtlünün içine al." İlk virüs yok olunca geçilir; Elif alkışlar.
  5. **Lens:** Elif lensi gösterir: "Buradaki üç arkadaşın hepsi kaybolunca bölüm biter. Kolay gelsin!"
- Öğretici kolay, ayrı bir tahtada oynanır: az virüs, yavaş hız.

### 7.6 Menü ve skor

- Ana menüde "Oyna" butonunun altında **"Virüs Avı"** butonu.
- Skorlar yalnızca yerel: kendi kural seti (`virus-avi-v1`, `RULESET_RE`'ye uyar) ile mevcut yerel skor deposuna yazılır. Skor ekranının yerel sekmesinde Klasik / Virüs Avı ayrımı vardır. Virüs Avı oyunları için global gönderim paneli gösterilmez.

## 8. Önerdiğim ve kullanıcının "senin önerilerinle" diyerek kabul ettiği kararlar

Bunlar kullanıcıya önerildi ve itiraz görmedi; uygulamada değiştirilecekse kullanıcıya sorulur.

- Tahta klasik modla aynı boyutta: 10 sütun, 20 görünür sıra (`COLS`, `VIS`). Ekran yerleşimi (`computeLayout`), HUD ve dokunma alanları aynen kullanılır.
- Puan virüs başına verilir ve zincirde katlanır.
- Bölüm sonunda tahta tamamen temizlenir, yeni bölüm temiz tahtada başlar.

## 8a. Gözden geçirme sonrası verilen kararlar (Claude'un kararı; kullanıcı belgeyi okurken kontrol eder)

- **Virüs görsellerinde düzenleme sınırı:** Kullanıcı "oyuna yakışacak tasarımlara çevirebilirsin" dedi. Siluet, gövde şekli ve dikenler korunur. Yüz bölgesi (göz, kaş, ağız, dişler) yeniden boyanabilir; parlaklık ve kabarcıklar ıslak görünmeyecek ölçüde azaltılabilir. Üç görseldeki dişler de (`bacteria.png` iki diş, `bacteria3.png` diş sırası) yumuşatılır. Sonuç onay noktası (1)'de kullanıcıya gösterilir.
- **Elif'in ilk cümlesi:** "Sinüsteki virüsleri birlikte temizleyelim" cümlesi, tedavi ima ettiği için şu cümleyle değiştirildi: "Merhaba, ben Doktor Elif! Hadi bu yaramaz virüsleri tahtadan temizleyelim." Elif'in hiçbir cümlesi sinüs, burun, hastalık ya da iyileşmeden söz etmez.
- **Elif değiştirilebilir anlatıcı:** Öğretici ve oyun sonu, anlatıcıyı tek bir yerden alır (görsel + ad). Hukuk incelemesi doktor figürüne itiraz ederse, kural koduna dokunmadan başka bir anlatıcıya geçilebilir. Yayın öncesi hukuk incelemesi, yol haritasındaki diğer metinlerle birlikte yapılır; geliştirme bunu beklemez.
- **Son bölüm:** Mod **20 bölümdür** (`GAME_RULES.maxLevel` ile uyumlu, yerel skor doğrulaması değişmez). 20. bölüm temizlenince klasikteki final gibi "Bütün virüsler temiz!" ekranı gelir ve oyun `complete` sebebiyle biter; skor kaydedilir.

## 9. Kurucuya bırakılanlar (makul varsayılanlarla)

Aşağıdaki sayılar başlangıç değeridir; oyun denemesinden sonra kullanıcıyla birlikte ayarlanacak. Hepsi tek bir yapılandırma nesnesinde durmalı.

- **Kapsül:** yatay doğar, üst sıranın ortasında (sütun 4–5). Döndürmede duvara çarparsa bir hücre sola, sonra sağa kaydırma denenir. Kilitlenme gecikmesi ve en çok sıfırlama sayısı klasik `CFG` değerleriyle aynı.
- **Kapsül yarılarının rengi:** yalnızca görünüş. Sıklamen karo sanatından seçilen 3–4 düz (bitkisiz) renkten rastgele. Görünüm onay noktası (3).
- **Zincirde düşme kuralı:** virüsler hiç düşmez. Bütün kalan kapsül (iki yarı bağlı) birlikte düşer: yatay kapsül yalnızca iki yarısının da altı boşsa, dikey kapsül alt yarısının altı boşsa düşer. Tek kalan yarı kendi başına düşer. Düşme hücre hücre ve animasyonlu; her yerleşmeden sonra 4'lü kontrolü yeniden yapılır.
- **Virüs yerleşimi:** tohumlu rastgele (oyun başına bir tohum, testte sabitlenebilir). Virüsler alt sıralardan başlayıp en çok belirli bir yüksekliğe kadar dağılır. Başlangıçta hiçbir sırada ya da sütunda kesintisiz 4 dolu hücre olmaz (kendiliğinden silinmesin). Üç tür olabildiğince eşit dağılır. Başlangıç önerisi: virüs sayısı `min(6 + 4·(bölüm−1), 60)`, yükseklik sınırı `min(8 + ⌊bölüm/2⌋, 13)` sıra.
- **Hız:** bölümle kısalan düşme aralığı (örn. 800 ms'den bölüm başına %8 azalarak, en az 120 ms).
- **Puan:** virüs başına `100 × bölüm × zincir çarpanı` (1., 2., 3., 4.+ zincir için 1, 2, 4, 8). Virüssüz silmeler puan vermez. Bölüm sonu bonusu `500 × bölüm`, süre bonusu `10 × kalan tam saniye × bölüm`. Skorun `maxPlausibleScore` sınırını aşmadığı bir testle denetlenir; aşıyorsa formül ya da yerel doğrulama bu mod için ayarlanır (Edge Function'a dokunulmaz).
- **Süre:** bölüm süresi `min(45 + 5 × virüs sayısı, 300)` saniye (1. bölüm 75 sn). Satır silme ve zincir animasyonlarında süre akmaya devam eder; yalnızca §7.1'deki durumlarda durur. Son 15 saniyede süre göstergesi uyarı rengine geçer (hareketi azaltta nabız yok) ve lensteki virüsler kıs kıs güler.
- **Zorluk notu:** renk şartı olmadığından ilk bölümler çok kolay olabilir. Ayar düğmeleri: virüs sayısı, yükseklik, hız. Gerekirse sonraki bölümlerde 4 yerine 5'li kuralı da bir düğme olarak eklenebilir; varsayılan 4.
- **Kontrol katmanı:** `InputController` bugün doğrudan `Game`'e bağlı. Ortak, küçük bir kontrol arayüzü (`move`, `rotate`, `softStep`, `hardDrop`, isteğe bağlı `hold`, `softDrop` bayrağı, `state`) çıkarılır ve aktif modun motoru verilir. Klasik davranış birebir korunur; Beklet ve güç tuşları Virüs Avı'nda hiçbir şey yapmaz, butonları gizlenir.
- **Çizim:** `VirusView` aynı PIXI uygulamasında kendi kabında çalışır. Tahta çerçevesi ve arka plan klasik görünümle aynı görünmeli. Ortak çizim kodunun nasıl paylaşılacağı (çıkarma ya da yeniden kullanma) kurucunun kararı; klasik görünüm değişmemeli.
- **HUD:** Virüs Avı'nda skor, bölüm, kalan virüs, sıradaki kapsül ve lens görünür. Tıkanıklık kartı, atak barı, güç ve Beklet butonları gizlenir.
- **Ses:** mevcut efektler kullanılır; virüs patlaması için mevcut sentez tarzında yeni kısa bir ses. Oyun müziği "Nefes", tıkanıklık yerine tahtanın doluluk oranıyla beslenir.
- **Elif'in çizimi:** SVG olarak, öğretici katmanında DOM'da gösterilir (yerleşim `tutorialRect`'e göre). "Oops" ifadesi Virüs Avı oyun sonu ekranında kullanılır.
- **Öğretici tahtası:** öğretici bölümünde oyun bitmez. Tahta dolarsa sessizce yeniden kurulur. Öğretici tamamlanınca ya da atlanınca 1. bölüm temiz tahtada başlar.
- **Oyun sonu ekranı:** ulaşılan bölüm, temizlenen virüs, skor ve bu moddaki rekor. "Tekrar" Virüs Avı'nı yeniden başlatır.
- **Analitik:** mod alanı ya da `virus_*` olayları; mevcut şema ve testler güncellenir, yeni olay adları yol haritasının etiket yöneticisi listesine eklenir.

## 10. Doğrulama

- Birim testleri: doğma ve top-out, döndürme ve duvar kaydırması, renksiz 4'lü (yatay, dikey, kesişen, 5+), virüsün düşmemesi, bağlı/kopuk kapsül düşme kuralı, zincir ve çarpan, bölüm sonu, başlangıçta 4'lü olmayan yerleşim, tohumla aynı sonuç, puan.
- Öğretici: tek seferlik kayıt (tamamla ve atla), yeniden izleme, adım geçişleri.
- Arayüz: menü butonu, HUD gizleme/gösterme, skor ayrımı, global panelin gizlenmesi, içerik güvenliği ve envanter.
- Klasik mod: bütün mevcut testler değişmeden geçer.
- Tarayıcı: 390×844, 844×390, 1366×768, 1920×1080; klavye ve dokunma; mola/devam; yeniden boyutlandırma; hareketi azalt; konsol hatası yok.

## 11. Ek: oyun denemesi sonrası değişiklikler (2026-11-11, kullanıcı onayı)

Kullanıcı modu denedikten sonra şunları istedi. Belli bir oyunun kendine özgü görüntüsü (ilaç şişesi tahta, doktorun kenardan hap fırlatması, o oyunun virüs dansı) birebir kopyalanmaz; aşağıdaki özgün karşılıklar kullanıcıyla kararlaştırıldı.

- **Virüs renkleri:** yeşil (tek gözlü, aynı), **kırmızı** (`virus-2`), **sarı** (`virus-3`). Sarı canlı güneş sarısı; sümüğü çağrıştıran yeşilimsi-sarı değil. Ağız içleri koyu bordo.
- **Animasyonlu virüsler:** kullanıcının görsellerine küçük kollar ve bacaklar eklenir (`tools/viruses` betiği, kare kare çizim). Sağa sola sallanır, kol/bacak sallar; bazı karelerde yüz tepkisi (göz kırpma, irkilme). **Güncelleme (kullanıcı, 2026-11-11):** kollu bacaklı dans eden virüsler yalnızca soldaki lenste; tahtadaki virüsler sade görsellerdir. **Onay noktası 4.**
- **Öğretici:** "Devam" zorunlu değil. Selam ve lens adımları okuma süresinden sonra kendiliğinden geçer (selam 4 sn, lens 5 sn); buton hızlı geçmek için durur.
- **Yerleşim:** bilgisayar/yatayda sol sütun: üstte skor kartı, altında lens. Portrede lens üst şeritte kalır.
- **Tahta çerçevesi (A):** ağzı açık, ölçü çizgili **laboratuvar beheri**. Oyun alanı (10 × 20) aynı; yalnızca çerçeve/süs değişir. **Onay noktası 5.**
- **Doktor Elif ve damlalık:** Elif tahtanın yanında durur (yatayda sağ sütunun altında, portrede alt şeritte). Tahtanın üst ortasında bir damlalık vardır; her yeni kapsülde Elif düğmeye basar (poz + damlalık sıkışır), kapsül oradan düşer. Bölüm temizlenince sevinir (alkış), son 15 saniyede telaşlanır (oops + titreme). Öğretici açıkken yan Elif gizlenir (kartta zaten var). Onay noktası 5'te birlikte gösterilir.
- **Müzik:** bu moda özel özgün, hareketli bir parça (sentez, oyunun tarzında). Son 15 saniyede hızlanır. Bu modda tıkanıklık süzgeci (boğuk ses) uygulanmaz.
- **Kapsülü indirme:** ↓ bir kez = tam bir sıra; basılı tutunca kısa bekleme sonrası sabit hızla sıra sıra. Klasik mod etkilenmez.
- **Oyun sonu:** Elif oyun sonu ekranında kalır (kullanıcı kararı); sağlık bağlantısıyla eşleşmesi hukuk listesinde.
- **Kaynak görseller** `art/virusler/` klasörüne taşınır ve commit edilir (build'e girmez).

## 12. Ek: ikinci oyun denemesi (2026-11-11, kullanıcı)

- **Elif sağ üstte**, "Sıradaki" paneli kalkar. Sıradaki kapsül Elif'in kaldırdığı parmağın ucunda durur (yeni poz `tut`). Yeni kapsül gerekince parmaktan yumuşak bir yay çizerek **damlalığa** zıplar, damlalık sıkışır, kapsül ucundan tahtaya girer (oyun zamanlaması değişmez; yalnızca görsel uçuş). Doktorun kapsülü doğrudan tahtaya fırlatması o oyunun imza sahnesi olduğu için kopyalanmaz; damlalık üzerinden geçiş bizim karşılığımızdır. Elif öğreticide de görünür (öğretici kartındaki küçük Elif kalkar, kart onun konuşma balonu olur).
- **Lens virüsleri:** kendi türünden biri patlayınca **yere yatıp ağlar** (gözyaşı, sarsılma); arada **dalga geçer** (gözler kısılı gülme, eller başın yanında); son saniyelerde daha sık. Türün sonuncusu patlarsa önce ağlar, sonra kaybolur. Sayı rozetleri kalkar. Şeritte 8 kare: 4 dans, kırpma, irkilme, ağlama, dalga.
- **Süre ve kalan virüs** yazıları büyür.
- Müzik onaylandı.
