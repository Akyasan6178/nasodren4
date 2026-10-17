/* =====================================================================
   İÇERİK: sağlık ipuçları (başlık, metin)
   NS4-03: main.ts'ten birebir taşındı. Metinler değiştirilmemelidir;
   içerik değişiklikleri ayrı bir editoryal/tıbbi onay sürecine tabidir.
   ===================================================================== */
export type Tip = readonly [title: string, body: string];

export const TIPS: readonly Tip[] = [
  ['Paranazal sinüsler', 'Kafatasındaki hava dolu boşluklardır: maksiller (yanak), frontal (alın), etmoid (gözler arası) ve sfenoid (kafa tabanı).'],
  ['Tıkanıklık nasıl olur?', 'Sinüzitte mukoza zarı iltihaplanır ve sinüs ağızları (ostiumlar) tıkanabilir. Yüzde baskı, baş ağrısı ve koku kaybı görülebilir.'],
  ['Sıklamen', 'Cyclamen europaeum L., Primulaceae familyasından yumrulu bir bitkidir. Yumrusu saponin içerir; ekstresinin burun mukozasında ozmotik etkiyle mukus akışını artırdığı bildirilmektedir.'],
  ['Kullanım süresine dikkat', 'Dekonjestan burun spreylerinin önerilenden uzun kullanımı, tıkanıklığın daha şiddetli geri dönmesine (rinitis medikamentoza) yol açabilir. Prospektüsteki süreye uyun.'],
  ['Ne zaman hekime gitmeli?', '10 günü aşan, ateşle seyreden, göz çevresinde şişlik yapan ya da giderek kötüleşen şikâyetlerde bir hekime başvurun.'],
  ['Sıvı tüketimi', 'Gün içinde yeterli sıvı almak ve burnu tuzlu suyla yıkamak mukusun akışkan kalmasına yardımcı olabilir.']
];
