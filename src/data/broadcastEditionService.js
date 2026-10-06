// Broadcast Studio Daily Edition & Theme Rotation Service
// Updates dynamically anchored to the daily 16:00 milestone, market data & analytical themes.

export const BROADCAST_THEMES = [
  {
    id: 'fed_liquidity',
    title: 'FED, KÜRESEL LİKİDİTE & FAİZ PATİKASI',
    shortName: 'FED & Likidite',
    badge: 'FED & LİKİDİTE RADARI',
    badgeColor: 'cyan',
    icon: '🏛️',
    description: 'Faiz İndirim Beklentileri, Tahvil Getiri Eğrisi ve Doların Küresel Gücü',
    slide1SubTab: 'fed',
    accentColor: '#38bdf8',
    variantIndex: 0
  },
  {
    id: 'geopolitics_energy',
    title: 'JEOPOLİTİK RİSKLER, PETROL & BOĞAZLAR',
    shortName: 'Enerji & Jeopolitik',
    badge: 'ENERJİ & JEOPOLİTİK',
    badgeColor: 'rose',
    icon: '🔥',
    description: 'Hürmüz & Kızıldeniz Koridoru, Navlun Maliyetleri ve Petrol Arz Savaşı',
    slide1SubTab: 'macro',
    accentColor: '#fb7185',
    variantIndex: 1
  },
  {
    id: 'wallstreet_ai',
    title: 'WALL STREET, BİLANÇO DÖNEMİ & YAPAY ZEKA DEVRİMİ',
    shortName: 'Wall St & Yapay Zeka',
    badge: 'WALL ST & AI DÖNGÜSÜ',
    badgeColor: 'emerald',
    icon: '💻',
    description: 'Mag-7 AI Sermaye Harcaması (Capex), Blackwell Çip Döngüsü ve S&P 500 Rallisi',
    slide1SubTab: 'seasonality',
    accentColor: '#34d399',
    variantIndex: 2
  },
  {
    id: 'bist_rotation',
    title: 'BORSA İSTANBUL, SEKTÖREL ROTASYON & DEZENFLASYON',
    shortName: 'Borsa İstanbul',
    badge: 'BORSA İSTANBUL & BIST 100',
    badgeColor: 'amber',
    icon: '🇹🇷',
    description: 'Banka vs Sanayi Ayrışması, 12.200 Tabanı, Düşen CDS ve Yabancı Girişleri',
    slide1SubTab: 'matrix',
    accentColor: '#fbbf24',
    variantIndex: 1
  },
  {
    id: 'metals_haven',
    title: 'DEĞERLİ METALLER, GÜVENLİ LİMAN & KRİPTO LİKİDİTE',
    shortName: 'Altın, Gümüş & Kripto',
    badge: 'ALTIN, GÜMÜŞ & BTC',
    badgeColor: 'gold',
    icon: '🪙',
    description: 'Merkez Bankaları Fiziki Altın Rezervleri, Gümüş Rasyosu ve Spot BTC ETF Girişleri',
    slide1SubTab: 'matrix',
    accentColor: '#f59e0b',
    variantIndex: 2
  }
];

export const resolveEditionState = (manualThemeId = 'auto', customShift = 0) => {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);
  const hour = now.getHours();
  const isAfter1600 = hour >= 16;
  const dayIndex = now.getDay(); // 0: Sunday, 1: Monday, ... 6: Saturday
  
  const dayNames = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];
  const dayName = dayNames[dayIndex];
  const todayFullStr = `${now.getDate()} ${now.toLocaleDateString('tr-TR', { month: 'long' })} ${now.getFullYear()} ${dayName}`;

  // Deterministic daily rotation: day index + milestone offset + manual shift
  const autoThemeIndex = (dayIndex + (isAfter1600 ? 1 : 0) + customShift) % BROADCAST_THEMES.length;
  
  let activeTheme = BROADCAST_THEMES[autoThemeIndex];
  if (manualThemeId && manualThemeId !== 'auto') {
    const found = BROADCAST_THEMES.find(t => t.id === manualThemeId);
    if (found) activeTheme = found;
  }

  const slotTitle = isAfter1600 
    ? '16:00 Ana Yayın Edisyonu (ABD Açılışı & Günlük Kapanış Verileri)'
    : 'Sabah & Seans Öncesi Hazırlık Edisyonu';

  const editionKey = `${dateStr}_${isAfter1600 ? '1600' : 'morning'}_${activeTheme.id}`;

  return {
    dateStr,
    todayFullStr,
    hour,
    isAfter1600,
    slotTitle,
    activeTheme,
    variantIndex: activeTheme.variantIndex % 3,
    editionKey
  };
};

// Natural Spoken Turkish Script Generator for All 9 Slides based on Edition & Live Market Quotes
export const generateDailyScript = (slideId, theme, quotes, todayFullStr, slotTitle) => {
  const {
    fmt,
    brent,
    wti,
    gold,
    silver,
    dxy,
    us10y,
    us2y,
    sp500,
    nasdaq,
    bist100,
    btc,
    total3,
    currentUsdTry,
    gramAltinTL
  } = quotes;

  switch (slideId) {
    case 1:
      if (theme.id === 'fed_liquidity') {
        return `Değerli dostlar, ekran başına ve bugünkü ${slotTitle} yayınımıza hepiniz hoş geldiniz. Bugün ${todayFullStr}. Masamızda küresel faiz patikası ve merkez bankalarının likidite adımları var.

İlk olarak sunumumuzun merkezindeki CME FedWatch ekranına bakalım: Piyasa aylardır 'FED faiz indirecek' söylemiyle meşgul edilirken, canlı veriler mevcut faizin sabit bırakılma olasılığının tam yüzde 78.4 olduğunu gösteriyor. Faiz indirimi ihtimali neredeyse sıfıra yaklaşırken, ABD 10 yıllık tahvil getirisi yüzde ${fmt(us10y.price, 2)} seviyesinde ve Dolar Endeksi DXY ${fmt(dxy.price, 2)} bandında güçleniyor. Bu ortamda likidite kontrolünü elinde tutan yatırımcılar kazanacak.

Şimdi bu kritik küresel makro tablonun hisse senetleri, altın ve döviz üzerindeki doğrudan yansımalarını 9 slaytlık brifingimizle adım adım inceleyelim.`;
      }
      if (theme.id === 'geopolitics_energy') {
        return `Değerli dostlar, ${slotTitle} yayınımıza hoş geldiniz. Bugün ${todayFullStr}. Küresel piyasaların ana gündem maddesi Orta Doğu'daki tansiyon ve enerji sevkiyat boğazları.

Ekranınızdaki canlı göstergelerde Brent petrolün ${fmt(brent.price, 2)} dolar seviyesinde tutunduğunu, ons altının ise ${fmt(gold.price, 0)} dolarda güçlü bir kurumsal taleple korunduğunu görüyoruz. Hürmüz Boğazı ve Kızıldeniz hattındaki navlun primleri manşet enflasyonu diri tutarak merkez bankalarının faiz indirimlerini öteliyor.

Bugünkü özel yayınımızda enerjiden enflasyona, Wall Street'ten Borsa İstanbul'a kadar tüm domino etkilerini adım adım masaya yatırıyoruz.`;
      }
      if (theme.id === 'wallstreet_ai') {
        return `Değerli dostlar, ${slotTitle} analizimize hoş geldiniz. Bugün ${todayFullStr}. Okyanusun ötesinde, Wall Street ve yapay zeka ekosisteminde tarihi bir bilanço ve değerleme dönemine şahitlik ediyoruz.

Ekranda gördüğünüz S&P 500 mevsimsellik eğrisi ve teknoloji ralli grafiği son derece net bir sinyal veriyor: Ekim ayının ilk yarısındaki dalgalanmalar tarihsel olarak yıl sonu rallisinin tabanını hazırlar. S&P 500 ${fmt(sp500.price, 0)} puanda, Nasdaq ${fmt(nasdaq.price, 0)} puanda ve büyük teknoloji devlerinin 200 milyar doları aşan yapay zeka sermaye harcamaları ralliye liderlik ediyor.

Gelin şimdi hem Wall Street devlerini hem de Borsa İstanbul'a yansıyan fırsatları birlikte inceleyelim.`;
      }
      if (theme.id === 'bist_rotation') {
        return `Değerli dostlar, ${slotTitle} yayınımıza hepiniz hoş geldiniz. Bugün ${todayFullStr}. Masamızın merkezinde Borsa İstanbul, sektörel güç ayrışmaları ve Türkiye'nin dezenflasyon süreci var.

BIST 100 endeksinin ${fmt(bist100.price, 0)} puanda 12.200 ana taban seviyesinden kurumsal tepki alımlarıyla karşılaştığını izliyoruz. Yıllık enflasyonun yüzde 49.38'e inmesiyle Türkiye uzun bir aradan sonra pozitif reel faiz bölgesine yerleşti. Bankacılık ve sanayi arasındaki rotasyon ise piyasaya taze soluk getiriyor.

Dolar kurunun ${fmt(currentUsdTry, 2)} lirada dengelendiği bu seansta hangi sektörlerin öne çıktığını 9 slaytlık brifingimizde ayrıntılarıyla aktarıyoruz.`;
      }
      // metals_haven
      return `Değerli dostlar, ${slotTitle} yayınımıza hoş geldiniz. Bugün ${todayFullStr}. Gündemimizin en sıcak başlığı kıymetli madenler, güvenli liman arayışı ve kripto likidite akışları.

Ons altın ${fmt(gold.price, 0)} dolar seviyesinde rekor zirvelerine yakın seyrederken, Kapalıçarşı'da gram altın ${fmt(gramAltinTL, 0)} lira seviyesinde yatırımcısına güçlü bir kalkan sunuyor. Gümüş ${fmt(silver.price, 2)} dolarda sanayi talebiyle diri dururken, Bitcoin ${fmt(btc.price, 0)} dolar bandında kurumsal ETF girişleriyle taban yapıyor.

Piyasalardaki bu sermaye göçünün arka planını ve yatırımcının izlemesi gereken yol haritasını şimdi adım adım konuşuyoruz.`;

    case 2:
      if (theme.variantIndex === 1) {
        return `İkinci durağımızda OPEC+ üretim dengesi ve küresel petrol arz-talep koridorunu inceliyoruz. Suudi Arabistan'ın günlük 9 milyon varillik kotayı koruması ve ABD stratejik petrol rezervlerinin 385 milyon varilde seyretmesi, Brent petrolün ${fmt(brent.price, 2)} dolar bandında tutunmasını sağlıyor. Rafineri marjlarındaki açılma ise akaryakıt fiyatlarını diri tutarak enerji kaynaklı enflasyon baskısını canlı tutuyor.`;
      }
      if (theme.variantIndex === 2) {
        return `Jeopolitik risk endeksimize baktığımızda 142 puan ile yüksek risk bölgesindeyiz. Hürmüz Boğazı ve Kızıldeniz hattında tanker sigorta primlerinin yüzde 28 yükselmesi navlun maliyetlerini yukarı taşıyor. Brent petrol ${fmt(brent.price, 2)} dolarda seyrederken, WTI ham petrolü ${fmt(wti.price, 2)} dolarda bu maliyet artışını fiyatlıyor. Bu iletim zinciri faiz indirimlerini geciktirerek hisse senetleri üzerinde değerleme baskısı oluşturuyor.`;
      }
      return `İkinci slaytımızda deniz ticaretinin can damarı olan stratejik boğazlara bakıyoruz. Günlük 21 milyon varillik petrolün geçtiği Hürmüz Boğazı ve Süveyş yerine Ümit Burnu'ndan dolaşmak zorunda kalan gemiler, sefer sürelerini 12 gün uzattı. Brent petrolün ${fmt(brent.price, 2)} dolar tabanında tutunması tam olarak bu navlun ve arz güvenliği risklerinden kaynaklanıyor.`;

    case 3:
      if (theme.variantIndex === 1) {
        return `Üçüncü slaytımızda merkez bankalarının niceliksel sıkılaşma, yani QT bilançolarını kıyaslıyoruz. Fed bilançosunu 7.1 trilyon dolara indirip piyasadan ayda 60 milyar dolar çekerken, TCMB swap hariç net rezervlerini artı 28 milyar dolara taşıyarak rezerv kalkanını güçlendirdi. Bu durum küresel likiditeyi seçici hale getirirken Türkiye'de kurun ${fmt(currentUsdTry, 2)} lira bandında sakin kalmasını sağlıyor.`;
      }
      if (theme.variantIndex === 2) {
        return `Enflasyonun anatomisine indiğimizde resmi yıllık TÜFE'nin yüzde 49.38 olduğunu görüyoruz. Ancak hizmet enflasyonunun yüzde 72 bandında katı kalması, TCMB'nin faiz indirimi beklentisini Kasım'dan Aralık veya Ocak ayına öteledi. Bu gecikme borsada seçici bir bekle-gör süreci yaratsa da, yüzde 50 politika faizi Türk lirasını korumaya devam ediyor.`;
      }
      return `Merkez bankaları masamıza geldiğimizde Türkiye'nin 3 katmanlı makro kalkanı dikkat çekiyor. Yıllık enflasyonun yüzde 49.38'e inmesiyle TCMB'nin yüzde 50 politika faizi ilk kez pozitif reel getiri sağladı (+%0.62). 5 yıllık CDS primimizin 216 baz puana gerilemesi ve cari dengedeki toparlanma, kur üzerindeki spekülatif baskıları tamamen kırdı.`;

    case 4:
      if (theme.variantIndex === 1) {
        return `Wall Street tarafında büyük teknoloji devlerinin yapay zekaya ayırdığı sermaye harcamaları, yani Capex bütçeleri tarihi zirvelerde. Microsoft, Alphabet, Meta ve Amazon toplamda 205 milyar dolarlık AI altyapı yatırımı yapıyor. Nvidia'nın Blackwell çip sevkiyatları ve veri merkezi enerji yatırımları bu teknoloji rallisinin en güçlü motoru olmaya devam ediyor.`;
      }
      if (theme.variantIndex === 2) {
        return `S&P 500 değerleme çarpanlarına baktığımızda, ileriye dönük F/K çarpanının 21.4 kat olduğunu görüyoruz. Şirket kârlarının yüzde 10 büyümesi değerlemeleri makul kılarken, eşit ağırlıklı S&P 500 endeksinin de ralliye katılması yükselişin genele yayılmaya başladığını kanıtlıyor. S&P ${fmt(sp500.price, 0)} puanda ralli tabanını koruyor.`;
      }
      return `Wall Street ve AI ekosistemine baktığımızda sektör liderlerinin gücünü koruduğunu görüyoruz. Nvidia, Amazon, Alphabet ve Meta'nın güçlü nakit akışları Nasdaq endeksini ${fmt(nasdaq.price, 0)} puana taşırken, yarı iletken ve bulut bilişim sektörleri küresel büyümenin öncüsü konumunda kalmaya devam ediyor.`;

    case 5:
      if (theme.variantIndex === 1) {
        return `Kıymetli madenler masamızda altın/gümüş rasyosu 68 kat seviyesinde dengeleniyor. Ons gümüş ${fmt(silver.price, 2)} dolarda fotovoltaik güneş panelleri ve çip sanayisinin güçlü talebiyle destekleniyor. Ons altının ${fmt(gold.price, 0)} dolarda kalması ise Kapalıçarşı'da gram altını ${fmt(gramAltinTL, 0)} lira seviyesinde tutarak yatırımcısına çifte kalkan sağlıyor.`;
      }
      if (theme.variantIndex === 2) {
        return `Altının yüksek faize rağmen neden düşmediği sorusunun cevabı ekranınızda: ABD 10 yıllık reel faizleri yükselmesine rağmen, Çin ve küresel merkez bankalarının kesintisiz fiziki altın alımları geleneksel modelleri yıktı. Ons altın ${fmt(gold.price, 0)} dolarda tarihi tabanını kurdu; gram altın ise ${fmt(gramAltinTL, 0)} lirada enflasyona karşı ana koruma aracı olmaya devam ediyor.`;
      }
      return `Emtia masamızda ons altının ${fmt(gold.price, 0)} dolarda 4.180 dolar kurumsal destek tabanını sağlama aldığını izliyoruz. Merkez bankalarının rezerv alımları ve jeopolitik güvenli liman primi altını diri tutarken, Kapalıçarşı gram altının ${fmt(gramAltinTL, 0)} lira seviyesindeki seyri yerel yatırımcı için sağlam bir getiri çıpasıdır.`;

    case 6:
      if (theme.variantIndex === 1) {
        return `Dolar endeksi DXY para sepetine baktığımızda, Euro'nun yüzde 57.6 ağırlığıyla belirleyici olduğunu görüyoruz. DXY ${fmt(dxy.price, 3)} seviyesinde gücünü korurken majör para birimleri üzerinde baskı kuruyor. Ancak Türkiye'de yüzde 50'lik politika faizi ve kontrollü kur politikası sayesinde dolar/TL ${fmt(currentUsdTry, 2)} lirada son derece ılımlı bir patikada hareket ediyor.`;
      }
      if (theme.variantIndex === 2) {
        return `Küresel likidite göstergelerimizde Fed'in ters repo bakiyesi 280 milyar dolarda dengelenirken, Hazine genel hesabındaki rezervler bankacılık sistemine güven veriyor. 2 yıllık ve 10 yıllık ABD tahvil makasının pozitif bölgede kalması, resesyon risklerinin geride kaldığını ve piyasanın faiz dengelenmesine odaklandığını teyit ediyor.`;
      }
      return `Tahvil ve döviz cephesinde en önemli teknik gösterge verim eğrisinin normalleşmesidir. 2 yıllık faiz (%${fmt(us2y.price, 2)}) 10 yıllık faizin (%${fmt(us10y.price, 2)}) altına inerek getiri farkını artı 54 baz puana taşıdı. Dolar endeksi ${fmt(dxy.price, 3)} seviyesinde tutunurken Dolar/TL ${fmt(currentUsdTry, 2)} lira ile kontrollü seyrini sürdürüyor.`;

    case 7:
      if (theme.variantIndex === 1) {
        return `Kripto para piyasasında Bitcoin dominansının yüzde 58.8 ile döngü zirvelerine tırmandığını izliyoruz. Bu durum sermayenin rastgele altcoinlere değil, doğrudan Bitcoin ve spot ETF'lere aktığını gösteriyor. Bitcoin ${fmt(btc.price, 0)} dolarda güç toplarken, TOTAL3 hacmimiz ${fmt(total3.price, 1)} milyar dolarda seçici projelere ev sahipliği yapıyor.`;
      }
      if (theme.variantIndex === 2) {
        return `On-chain rezerv analizine baktığımızda, kripto borsalarındaki Bitcoin miktarının 2.1 milyon adet ile son 5 yılın dip seviyesine indiğini görüyoruz. Kurumsal saklama fonları ve ETF'ler dolaşımdaki arzı toplarken, madenci üretim maliyeti olan 64.000 dolar seviyesi Bitcoin'in ${fmt(btc.price, 0)} dolardaki fiyat tabanını destekliyor.`;
      }
      return `Kripto ekosisteminde kurumsal spot ETF girişleri ivmesini koruyor. BlackRock ve Fidelity fonlarına gelen günlük 210 milyon dolarlık kurumsal akış Bitcoin'i ${fmt(btc.price, 0)} dolarda 85.000 tabanında tutuyor. 87.000 dolar direncinin hacimli aşılması durumunda bir sonraki psikolojik durağımız 90.000 dolar kapısı olacaktır.`;

    case 8:
      if (theme.variantIndex === 1) {
        return `Borsa İstanbul cephesinde yabancı takas oranının yüzde 38.6'ya toparlanması ve 5 yıllık CDS primimizin 216 baz puan ile tarihi diplere inmesi endeksi koruyor. Cari fazla desteğiyle BIST 100 endeksi ${fmt(bist100.price, 0)} puanda kurumsal tabanını korurken, bilanço sezonu öncesinde şirket bazlı kâr marjları ayrışıyor.`;
      }
      if (theme.variantIndex === 2) {
        return `BIST 100 çarpanlarını küresel piyasalarla kıyasladığımızda, endeksin 7.4 F/K ile gelişmekte olan piyasalara kıyasla yüzde 44 iskontolu olduğunu görüyoruz. Kredi derecelendirme kuruluşlarının not artırım patikası ve gri listeden çıkış, BIST 100'ün ${fmt(bist100.price, 0)} puanda 12.200 ana tabanında kurumsal talep bulmasını sağlıyor.`;
      }
      return `Kendi evimize, Borsa İstanbul'a döndüğümüzde endeksin ${fmt(bist100.price, 0)} puanda 12.200 ana taban seviyesinden kurumsal tepki alımlarıyla karşılaştığını izliyoruz. Bankacılık sektörü güçlü sermayesiyle öncülük ederken, döviz pozisyonu kuvvetli ihracatçı şirketler tabana destek veriyor. 12.800 direncinin aşılmasıyla yukarıda 13.500 hedefi masada kalacaktır.`;

    case 9:
      if (theme.variantIndex === 1) {
        return `Yayınımızı tamamlarken portföy pusulamızdaki piramit tahsis modelini hatırlayalım. Yüzde 25 likit kalkan (PPF ve mevduat), yüzde 45 çekirdek hisse senetleri, yüzde 20 altın ve gümüş koruması ve yüzde 10 fırsat varlıkları ile piyasa çalkantılarına karşı dayanıklı kalıyoruz. Disiplinli kalan yatırımcı uzun vadede bileşik getirinin gücüyle kazanır.`;
      }
      if (theme.variantIndex === 2) {
        return `Kapanışta 3 kademeli risk yönetimi kuralımızı yineliyoruz: Asla tek kademede tüm nakdi tüketmeyin. Destek testinde yüzde 30, dönüş teyidinde yüzde 40 ve momentum onayında yüzde 30 kademeli alım disipliniyle hareket edin. Portföyünüzde her zaman yüzde 20-25 likit kalkan bulundurarak fırsatları sakince karşılayın.`;
      }
      return `Yayınımızı toparlarken önümüzdeki 48 saatin kritik takvimine bakalım. TÜİK TÜFE verileri, Fed FOMC tutanakları ve ABD istihdam rakamları yakından izlenecek. Piyasalarda dalgalanmalar sürerken altın kuralımız değişmiyor: Asla FOMO'ya kapılmayın, portföyde mutlaka yüzde 20-25 likit kalkan bulundurun ve bilançosu güçlü şirketlerde disiplinli kalın. Kanalımıza abone olmayı ve yorumlarınızı paylaşmayı unutmayın, bir sonraki yayınımızda görüşmek üzere!`;

    default:
      return '';
  }
};
