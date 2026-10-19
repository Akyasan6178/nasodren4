# NS4-17 · Ses, müzik, haptik ve erişilebilirlik

Bu görevde değişmeyenler:

- görünür metinler ve sağlık içeriği;
- oyun mekanikleri, skorlar ve süreler;
- bloklar ve NS4-15 görsel efektleri.

Yeni bağımlılık veya ses dosyası eklenmedi; ses hâlâ Web Audio sentezidir (`src/audio/SoundManager.ts`).

## 1. Ses efektleri

| Olay                 | Önce                                | Şimdi                                                                                                                    |
| -------------------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Hareket / döndürme   | her adımda (ARR 33 ms)              | 50 / 45 ms'den sık tekrar çalınmaz; art arda gelenler kısık. Kazanç 0,035 → 0,026 / 0,05 → 0,036                         |
| Lock                 | 110 ms, 160→80 Hz                   | 80 ms, 170→110 Hz kısa “tok”                                                                                             |
| Hard drop            | hard + lock üst üste                | yalnızca hard: 170 ms, 110→42 Hz derin darbe + aşağı inen hava sesi. Hard drop'u izleyen kilitlenmede lock sesi çalınmaz |
| Normal drenaj (1–3)  | nefes + damlalar                    | aynı dil, biraz daha yumuşak                                                                                             |
| Tetris (Ozmotik)     | akor                                | yavaş açılan geniş akor (12 ms yerine 120 ms atak); müzik kısa süre kısılır                                              |
| T-spin (Nörorefleks) | Tetris'e benzer akor                | ayrı dil: kısa nefes, hızlı yükselen üçgen arpej, yüksek kıvılcım tınıları. Satırsız T-spin'de küçük arpej               |
| Sıklamen             | nefes + 10 damla + akor             | en yumuşak an: uzun, düşük kazançlı nefes, 8 seyrek damla, 350 ms atakla açılan akor (~1,9 sn); müzik en çok kısılır     |
| Sentetik             | 0,35 sn nefes + kare ton            | ≤ 0,2 sn: sprey “pşt” ve iki mekanik tık                                                                                 |
| Rebound              | iki üçgen ton                       | aynı dil, kazanç 0,08 → 0,065 / 0,06                                                                                     |
| Garbage gelişi       | rebound uyarısı her satırda yeniden | kendi kısa, kısık alçak darbesi                                                                                          |

Büyük anlarda (Tetris, T-spin, sıklamen, sentetik) ortam müziği 0,3–1,4 sn için %30–50 kısılır (ducking), sonra geri gelir.

## 2. Ortam müziği

- **Seviye:** 0,32 → 0,26.
- **Oturum yapısı:** her başlatma kendi oturum veri yolunu (bus) kurar. Durunca:
  - bus söner;
  - rüzgâr gürültüsü, iki LFO ve akor osilatörleri 1,4 sn sonra durur;
  - bağlantılar kesilir.

  Önceden gürültü ve LFO'lar müzik kapalıyken de sonsuza dek çalışıyordu.

- **Zamanlayıcı:** her an en çok bir akor zamanlayıcısı vardır. Yeni oyunda eski zamanlayıcı veya düğüm kalmaz.
- **Geçişler:**

  | Geçiş       | Müzik   |
  | ----------- | ------- |
  | Başlat      | açılır  |
  | Pause       | kapanır |
  | Resume      | açılır  |
  | Oyun sonu   | kapanır |
  | Tekrar oyna | açılır  |
  | Ana menü    | kapanır |

  Art arda çağrılar çift başlatmaz.

- **Müzik ayarı kapalı:** hiçbir müzik düğümü veya zamanlayıcı oluşmaz. Ayar panelinden açılınca hemen başlar.

## 3. Tarayıcı davranışı

- **İlk açılış:** AudioContext yalnızca `unlock()` ile, kullanıcı etkileşiminde açılır. Sayfa açılışında veya fare hareketinde açılmaz.
- **Hata dayanıklılığı:**
  - Context oluşturulamazsa (destek yok, politika veya sınır) oyun sessiz sürer; çağrılar hata vermez.
  - `resume()` reddedilirse yakalanır ve bir sonraki etkileşimde yeniden denenir.
- **Sekme gizlenince:** oyun eskisi gibi otomatik molaya girer ve context askıya alınır. Görünür olunca context sürer; oyun Mola ekranında bekler.
- **Blur:** otomatik mola davranışı korunur.

## 4. Haptik

| Olay             | Önce                                                          | Şimdi                                         |
| ---------------- | ------------------------------------------------------------- | --------------------------------------------- |
| Lock             | 12                                                            | 10                                            |
| Hard drop        | 24 + 12 (lock da tetikleniyor, ikinci çağrı ilkini kesiyordu) | 22 (tek)                                      |
| Drenaj 1 / 2 / 3 | 18 / [12,30,24] / [10,30,18,26,36]                            | 16 / [12,40,16] / [12,36,22]                  |
| Tetris           | 9 parçalı, 270 ms                                             | [14,36,20,36,34] 140 ms                       |
| Sıklamen         | 9 parçalı, 258 ms                                             | yumuşak yükselen [8,50,10,50,14,50,20] 202 ms |
| Sentetik         | [40,30,40]                                                    | [28,24,28]                                    |
| Rebound          | yok                                                           | [24,60,24]                                    |
| Garbage          | 30 (sabit sayı)                                               | 18 (`HAPTIC.garbage`)                         |
| Oyun sonu        | 610 ms                                                        | [60,60,120,80,200] 520 ms                     |

- Sürekli hareketler (kaydırma, döndürme, yumuşak indirme) titreşim üretmez.
- Ayar kapalıyken hiçbir `vibrate` çağrısı yapılmaz.
- `navigator` veya `vibrate` yoksa ya da çağrı hata atarsa sessizce yok sayılır.
- Reduced motion tercihi titreşimi ve sesi etkilemez; haptik yalnızca kendi ayarına bağlıdır.

## 5. Erişilebilirlik

- **Rozetler:**
  - Liste semantiği kullanılır (`role="list"` / `listitem`).
  - Her rozette görünmeyen bir durum metni vardır (`.sr-only`): “kazanıldı”, “bu oyunda kazanıldı”, “kilitli”. Ekran okuyucu “Ozmotik usta, bu oyunda kazanıldı” biçiminde okur.
  - Açıklama ipucu (`title`) ad öğesine taşındı. Liste öğesinde olsaydı Chrome erişilebilir adı açıklamayla değiştiriyordu (tarayıcı ağacında doğrulandı).
  - Görünür metin ve görünüm değişmedi: Oyun sonu ekranı 7 görünümde `e6f42bb` ile 0 piksel farklı.
- **Ayarlar ilk odak: ilk ayar kontrolü (Ses efektleri).** Gerekçe:
  - Ayarlar anında kaydedilir; “Kaydet” fiilen “kapat” işlevi görür.
  - Önceden Kaydet'e odaklanınca Tab sayfa gövdesine çıkıyor, ardından ilk kontrole dönüyordu.
  - Kullanıcı ayar değiştirmek için açtığından ilk kontrol daha doğru başlangıçtır. Tab sırası: Ses efektleri → Ortam müziği → Titreşim → Hayalet parça → DAS → ARR → FPS → Kaydet.
  - Escape ve geri dönüşte odak, açan butona döner (değişmedi).
- **Erişilebilir adlar:**

  | Kontrol        | Ad             | Açıklama                                                                   |
  | -------------- | -------------- | -------------------------------------------------------------------------- |
  | Ses efektleri  | Ses efektleri  | —                                                                          |
  | Ortam müziği   | Ortam müziği   | —                                                                          |
  | Hayalet parça  | Hayalet parça  | —                                                                          |
  | Titreşim       | Titreşim       | Destekleyen Android cihazlarda / Bu cihaz/tarayıcı titreşimi desteklemiyor |
  | DAS, ARR       | DAS, ARR       | açıklama ve değer                                                          |
  | FPS göstergesi | FPS göstergesi | Performans testi için                                                      |
  - Önceden ad ve açıklama tek ada birleşiyordu; artık `aria-labelledby` / `aria-describedby` ile ayrı.
  - Kaydırıcı değeri ekran okuyucuya birimiyle okunur (`aria-valuetext`, ör. “167 ms”).

- **Görsel geri bildirim:** durum yalnızca sesle veya titreşimle aktarılmaz. Rebound (popup + kırmızı-turuncu çerçeve), garbage (alt bant), sıklamen ve sentetik efektleri bağlı kalır.

## 6. Dev ses/haptik gösterimi

Yalnızca development'ta, tarayıcı konsolunda `__fn.sfx` vardır (`src/dev/audioDemo.ts`):

```js
__fn.sfx.play('cyc'); // move, rotate, hold, lock, hard, drain1-3, tetris, tspin, tspin0, cyc, syn, rebound, garbage, level, over
__fn.sfx.all(); // bütün sesler ~1 sn arayla
__fn.sfx.haptic('tetris'); // lock, hard, drain1-3, tetris, cyc, syn, rebound, garbage, over
__fn.sfx.state(); // { context, unlocked, unsupported, musicOn, musicSources }
```

- Kendiliğinden hiçbir şey başlatmaz. Ses için AudioContext'in kullanıcı etkileşimiyle açılmış olması gerekir (önce “Oyna”ya tıklayın veya bir tuşa basın). Titreşim için sayfanın etkileşim almış olması gerekir; aksi halde yalnızca bir uyarı metni döner.
- Oyundaki ses ve titreşim ayarlarına uyar.
- Storage'a yazmaz. Production paketinde yer almaz.

## 7. Testler

Toplam **477 test** (NS4-16: 440; +37).

| Dosya                            | Test | Kapsam                                                                                                                                                                                                                                                                                                                                                |
| -------------------------------- | ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tests/audio/sound.test.ts`      | 14   | context yalnızca unlock ile; suspended → resume; reddedilen resume; desteklenmeyen ortam; ses/müzik ayarları; tek zamanlayıcı ve hızlı aç/kapa; durunca kaynakların durması ve bağlantıların kesilmesi; müzik kısma; sekme gizleme; hareket/döndürme seyreltmesi; lock/hard ayrımı; sentetik kısa, sıklamen en uzun; garbage < rebound                |
| `tests/ui/audio-haptics.test.ts` | 23   | her olayın doğru ses yöntemini ve haptik desenini bir kez çağırması; hard drop'ta lock sesi/titreşimi yok; sürekli harekette titreşim yok; haptik açık/kapalı/desteksiz; desen süreleri; reduced motion bağımsızlığı; lifecycle boyunca müzik; rozet erişilebilirliği; Ayarlar odak sırası, adlar, `aria-valuetext`; görsel geri bildirimin korunması |

Ortak taklit: `tests/helpers/fakeAudio.ts`. Güncellenen testler:

- `tests/ui/focus.test.ts`: Ayarlar ilk odağı.
- `tests/ui/supporting-screens.test.ts`: yeni erişilebilirlik öznitelikleri ve rozet yapısı.

## 8. Doğrulama

| Komut           | Sonuç                                                    |
| --------------- | -------------------------------------------------------- |
| `npm run check` | geçti (typecheck, lint, format, 32 dosya 477/477, build) |

Headless tarayıcıda (Playwright + Chromium 153; gerçek cihaz yok, hoparlör/titreşim motoru dinlenmedi), proje dışındaki betiklerle:

| Kontrol                                                    | Sonuç                           |
| ---------------------------------------------------------- | ------------------------------- |
| Ses/haptik probu                                           | dev 25/25, production 21/21     |
| Smoke                                                      | dev 104/104, production 104/104 |
| Klavye Tab                                                 | dev ve production 34/34         |
| Öğretici                                                   | dev ve production 61/61         |
| Dokunma                                                    | 36/36                           |
| Ana menü erişilebilirlik                                   | 35/35                           |
| Yardımcı ekran denetimi (7 görünüm)                        | 126/126                         |
| Ayarlar / Nasıl oynanır klavye-dokunma ve dev gösterimleri | 16/16                           |
| HUD denetimi (7 görünüm)                                   | sorun yok                       |

- **Ses/haptik probu** (`AudioContext`, zamanlayıcılar ve `navigator.vibrate` sayfa başında izlendi; `--autoplay-policy=user-gesture-required`):
  - etkileşimden önce context yok; Oyna tıklamasında bir context açılıyor;
  - 60 Escape ve 15 buton pause/resume sonrasında tek müzik zamanlayıcısı;
  - sekme gizlenince mola ve askı, görünür olunca devam; blur molası;
  - hard drop tek desen (22);
  - ses kapalıyken ses düğümü, müzik kapalıyken müzik zamanlayıcısı yok; ayardan açılınca anında çalışıyor ve kalıcı;
  - haptik kapalıyken titreşim yok; desteksiz ortamda hata yok ve doğru not;
  - reduced motion altında ses ve titreşim çalışıyor;
  - yalnızca dev'de: oyun sonu ve hızlı yeni oyun, ana menü, gösterim.
- **Smoke:** sayfa ve konsol hatası, başarısız istek yok; production'da `__fn` yok.
- **Tarayıcı erişilebilirlik ağacı:** rozet öğeleri “ad, durum” olarak okunuyor; ayar kontrollerinin adları ve açıklamaları doğru.
- **Görsel eşitlik** (`e6f42bb` ile; tohumlu):
  - Oyun sonu ve Nasıl oynanır 0 px.
  - Mola kartında görünür fark yok; fark arka plandaki oyun görüntüsünde.
  - Ayarlar'da tek fark, odağın ilk satıra taşınmasından gelen 2 px'lik `focus-within` çizgisi.

**Mekanik referanslar** değişmedi: +138, +1732, +3800, 538 / 638 / 738.

**Paket farkı** (`e6f42bb`'ye göre):

| Dosya | Fark                                         |
| ----- | -------------------------------------------- |
| JS    | 531,45 → 534,26 kB (+2,81 kB; gzip +0,86 kB) |
| CSS   | +0,25 kB                                     |
| HTML  | +0,72 kB                                     |

`legacy/Ferah Nefes · Sinüs Bulmacası.html` SHA-256 değeri değişmedi.
