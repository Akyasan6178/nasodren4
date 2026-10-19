/* =====================================================================
   İÇERİK: bilgi kartları (NS4-09)
   Bölüm sonlarında ve oyun içi ilk anlarda açılır, "Bilgi kartlarım"
   albümünde birikir. Metinler güvenilir kaynaklardan (NHS, CDC, Cleveland
   Clinic, AAO-HNS, FDA, RHS) derlendi; etkinlik iddiası, ürün tanıtımı ve
   doz bilgisi içermez. status 'approved': mevcut onaylı ipucu metni
   (content/tips.ts); 'review': yayın öncesi tıbbi/editoryal onay bekliyor.
   Kimlikler fn_meta.cards içinde saklandığı için değiştirilmemelidir.
   ===================================================================== */
import type { CardId, InfoCard } from '../types/content';

const CC = 'Cleveland Clinic';

export const CARDS: Readonly<Record<CardId, InfoCard>> = {
  maksiller: {
    id: 'maksiller',
    title: 'Yanak sinüsü: en büyüğü',
    body: 'Elmacık kemiklerinin arkasında, gözlerin altındaki maksiller sinüsler en büyük sinüslerimizdir. Küçücük de olsalar doğduğumuz gün zaten oradadırlar!',
    icon: 'sinus',
    source: CC,
    url: 'https://my.clevelandclinic.org/health/body/paranasal-sinuses',
    status: 'review',
  },
  frontal: {
    id: 'frontal',
    title: 'Alın sinüsü geç gelir',
    body: 'Alnındaki frontal sinüsler doğduğunda henüz yoktur. Okul çağına doğru oluşmaya başlar ve ergenlik boyunca büyümeye devam eder.',
    icon: 'skull',
    source: 'CHOP · AAO-HNS',
    url: 'https://www.chop.edu/conditions-diseases/sinusitis-children',
    status: 'review',
  },
  etmoid: {
    id: 'etmoid',
    title: 'Gözler arası petek',
    body: 'Etmoid sinüs tek bir boşluk değildir: iki gözün arasında, peteği andıran çok sayıda küçük hava hücresinden oluşur. Yetişkinlerde her yanda 3 ila 18 hücre olabilir!',
    icon: 'sinus',
    source: CC,
    url: 'https://my.clevelandclinic.org/health/body/ethmoid-sinus',
    status: 'review',
  },
  sfenoid: {
    id: 'sfenoid',
    title: 'En derindeki sinüs',
    body: 'Sfenoid sinüsler burun boşluğunun arka-üst kısmında, neredeyse başın tam ortasında saklanır. Kafatasında en geride duran sinüs budur.',
    icon: 'skull',
    source: CC,
    url: 'https://my.clevelandclinic.org/health/body/sphenoid-sinus',
    status: 'review',
  },
  gorev: {
    id: 'gorev',
    title: 'Sinüsler ne işe yarar?',
    body: 'Bilim insanları bu soruyu hâlâ araştırıyor! Sinüslerin soluduğumuz havayı ısıtıp nemlendirmeye, kafatasını hafifletmeye ve sesimizin tınısına katkı sağladığı düşünülüyor.',
    icon: 'nose',
    source: `${CC} · J Laryngol Otol 2009`,
    url: 'https://my.clevelandclinic.org/health/body/paranasal-sinuses',
    status: 'review',
  },
  mukus: {
    id: 'mukus',
    title: 'Minik süpürgeler: silyalar',
    body: 'Burnu kaplayan mukus toz ve mikropları yakalar. Silya denen minik tüyler dalga gibi çırpınarak bu mukusu boğaza doğru taşır; çoğunu farkına bile varmadan yutarız.',
    icon: 'cilia',
    source: `${CC} · Bull Math Biol 2024`,
    url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC11455677/',
    status: 'review',
  },
  virus: {
    id: 'virus',
    title: 'Çoğu zaman suçlu virüs',
    body: 'Akut sinüzitin çoğu, soğuk algınlığı yapan virüslerden kaynaklanır ve genellikle birkaç hafta içinde kendiliğinden geçer. Antibiyotikler virüslere etki etmez.',
    icon: 'virus',
    source: 'CDC · NHS',
    url: 'https://www.cdc.gov/sinus-infection/about/index.html',
    status: 'review',
  },
  belirti: {
    id: 'belirti',
    title: 'Sinüzit nasıl hissettirir?',
    body: 'Yanakta, göz çevresinde ya da alında basınç ve hassasiyet, tıkalı veya akan burun, koku almada azalma ve baş ağrısı sinüzitin sık görülen belirtilerindendir.',
    icon: 'nose',
    source: 'NHS · CDC',
    url: 'https://www.nhs.uk/conditions/sinusitis-sinus-infection/',
    status: 'review',
  },
  koku: {
    id: 'koku',
    title: 'Burun tıkanınca koku kaybolur mu?',
    body: 'Burun tıkandığında koku alma duyusu geçici olarak azalabilir. Çoğu zaman birkaç hafta ya da ay içinde düzelir; düzelmezse bir doktora danışmak iyi olur.',
    icon: 'nose',
    source: 'NHS',
    url: 'https://www.nhs.uk/symptoms/lost-or-changed-sense-smell/',
    status: 'review',
  },
  su: {
    id: 'su',
    title: 'Bol su, nazik bakım',
    body: 'Dinlenmek ve bol sıvı içmek iyi gelebilir. Tuzlu suyla burun yıkamada musluk suyu değil, steril ya da kaynatılıp soğutulmuş su kullanılır; doğru yöntemi eczacına sor.',
    icon: 'water',
    source: 'NHS · FDA',
    url: 'https://www.fda.gov/consumers/consumer-updates/rinsing-your-sinuses-neti-pots-safe',
    status: 'review',
  },
  siklamen: {
    id: 'siklamen',
    title: 'Sıklamen: dağların çiçeği',
    body: 'Avrupa sıklameni Alpler ve Orta Avrupa ormanlarında yetişir. Bir yumrudan büyür, taç yaprakları geriye ve yukarı kıvrılır. Ama yumrusu zehirlidir, asla yenmez!',
    icon: 'flower',
    source: 'RHS · ASPCA',
    url: 'https://www.rhs.org.uk/plants/5153/Cyclamen-purpurascens/Details',
    status: 'review',
  },
  rebound: {
    id: 'rebound',
    title: 'Kullanım süresine dikkat',
    body: 'Dekonjestan burun spreylerinin önerilenden uzun kullanımı, tıkanıklığın daha şiddetli geri dönmesine (rinitis medikamentoza) yol açabilir. Prospektüsteki süreye uyun.',
    icon: 'spray',
    source: 'Onaylı ipucu',
    url: '',
    status: 'approved',
  },
  hekim: {
    id: 'hekim',
    title: 'Ne zaman hekime gitmeli?',
    body: '10 günü aşan, ateşle seyreden, göz çevresinde şişlik yapan ya da giderek kötüleşen şikâyetlerde bir hekime başvurun.',
    icon: 'doctor',
    source: 'Onaylı ipucu · CDC',
    url: 'https://www.cdc.gov/sinus-infection/about/index.html',
    status: 'approved',
  },
};

/** Albüm sırası (bölüm sırasıyla açılanlar önce). */
export const CARD_ORDER: readonly CardId[] = [
  'maksiller',
  'mukus',
  'frontal',
  'gorev',
  'etmoid',
  'virus',
  'sfenoid',
  'hekim',
  'siklamen',
  'rebound',
  'belirti',
  'su',
  'koku',
];

/** Serbest oyunda toplam temizlenen satıra göre açılan kartlar (oturum içi). */
export const ENDLESS_CARDS: readonly (readonly [lines: number, card: CardId])[] = [
  [10, 'belirti'],
  [25, 'su'],
  [50, 'koku'],
];
