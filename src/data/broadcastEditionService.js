// Broadcast Studio Daily Edition & Dynamic Spoken Script Service
// Anchored dynamically to live quotes, macro events, news headlines & tone customization.

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
    description: 'Banka vs Sanayi Ayrışması, Kurumsal Destek Tabanı ve Bilanço Dinamikleri',
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
  const dayIndex = now.getDay();
  
  const dayNames = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];
  const dayName = dayNames[dayIndex];
  const todayFullStr = `${now.getDate()} ${now.toLocaleDateString('tr-TR', { month: 'long' })} ${now.getFullYear()} ${dayName}`;

  const autoThemeIndex = (dayIndex + (isAfter1600 ? 1 : 0) + customShift) % BROADCAST_THEMES.length;
  
  let activeTheme = BROADCAST_THEMES[autoThemeIndex];
  if (manualThemeId && manualThemeId !== 'auto') {
    const found = BROADCAST_THEMES.find(t => t.id === manualThemeId);
    if (found) activeTheme = found;
  }

  const slotTitle = isAfter1600 
    ? '16:00 Ana Yayın Edisyonu (ABD Seansı & Kapanış Özeti)'
    : 'Sabah & Seans Öncesi Piyasa Hazırlık Edisyonu';

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

/**
 * Intelligent Dynamic Turkish Broadcast Script Engine
 * Incorporates today's actual live prices, percentage changes, market direction,
 * customized tone ('analytical', 'youtube', 'defensive'), live news and portfolio context.
 */
export const generateDailyScript = (
  slideId,
  theme,
  quotes = {},
  todayFullStr = '',
  slotTitle = '',
  customAgenda = null,
  tone = 'analytical'
) => {
  const safeQuotes = quotes && typeof quotes === 'object' ? quotes : {};
  const {
    fmt = (v, d = 2) => (Number(v) || 0).toLocaleString('tr-TR', { minimumFractionDigits: d, maximumFractionDigits: d }),
    brent = { price: 80, change: 0 },
    wti = { price: 75, change: 0 },
    gold = { price: 4200, change: 0 },
    silver = { price: 60, change: 0 },
    dxy = { price: 102.5, change: 0 },
    us10y = { price: 4.15, change: 0 },
    us2y = { price: 4.42, change: 0 },
    sp500 = { price: 7650, change: 0 },
    nasdaq = { price: 30500, change: 0 },
    dow = { price: 44000, change: 0 },
    bist100 = { price: 12200, change: 0 },
    btc = { price: 86500, change: 0 },
    eth = { price: 2650, change: 0 },
    total3 = { price: 750, change: 0 },
    currentUsdTry = 49.03,
    gramAltinTL = 6600,
    tcmbRate = 36.00,
    turkeyCPI = 29.73,
    fedRate = '3.75 - 4.00'
  } = safeQuotes;

  const isSPGreen = (sp500.change ?? 0) >= 0;
  const isNasdaqGreen = (nasdaq.change ?? 0) >= 0;
  const isBistGreen = (bist100.change ?? 0) >= 0;
  const isGoldGreen = (gold.change ?? 0) >= 0;
  const isBrentGreen = (brent.change ?? 0) >= 0;

  const t1 = customAgenda?.topic1?.title || 'Küresel Likidite ve Merkez Bankaları Faiz Patikası';
  const t2 = customAgenda?.topic2?.title || 'Jeopolitik Riskler, Enerji Koridorları ve Petrol Fiyatları';
  const t3 = customAgenda?.topic3?.title || 'Borsa İstanbul ve Wall Street Bilanço Dinamikleri';

  switch (slideId) {
    // -------------------------------------------------------------------------
    // SLIDE 1: AÇILIŞ & MAKRO NABIZ
    // -------------------------------------------------------------------------
    case 1: {
      const marketMood = isSPGreen
        ? `Wall Street tarafında S&P 500 (${fmt(sp500.price, 0)}) ve Nasdaq (${fmt(nasdaq.price, 0)}) yeşil bölgede alıcılı bir rüzgarla işlem görüyor.`
        : `Wall Street cephesinde S&P 500 (${fmt(sp500.price, 0)}) ve Nasdaq (${fmt(nasdaq.price, 0)}) tarafında kâr realizasyonları ve temkinli bir geri çekilme yaşanıyor.`;

      const bistMood = isBistGreen
        ? `Borsa İstanbul BIST 100 endeksi ${fmt(bist100.price, 0)} puanda güçlü alımlarla seansını sürdürüyor.`
        : `Borsa İstanbul tarafında endeks ${fmt(bist100.price, 0)} puanda kurumsal taban arayışında.`;

      if (tone === 'youtube') {
        return `Selamlar değerli dostlar, ekran başına ve bugünkü özel yayınımıza hepiniz hoş geldiniz! Bugün ${todayFullStr}. Piyasalar son derece kritik fiyatlamalara sahne oluyor.

${marketMood} Yurt içinde ise ${bistMood} Masamızda bugün 3 ana manşetimiz var: Birincisi "${t1}", ikincisi "${t2}" ve üçüncüsü "${t3}". 

Ons altın $${fmt(gold.price, 0)} ile zirveleri test ederken, Kapalıçarşı'da gram altın ${fmt(gramAltinTL, 0)} lirada tarihi koruma kalkanını sürdürüyor. Dolar/TL ise ${fmt(currentUsdTry, 2)} seviyesinde dengeli. 

Şimdi kemerleri bağlayın; 9 slaytlık brifingimizle enerjiden teknolojiye, Wall Street'ten Borsa İstanbul'a kadar paranın rotasını adım adım takip ediyoruz!`;
      }

      if (tone === 'defensive') {
        return `Değerli yatırımcılar, ${slotTitle} analizimize hoş geldiniz. Bugün ${todayFullStr}. Piyasada fırsatlar kadar risklerin de masada olduğu, temkinli ve disiplinli hareket edilmesi gereken bir konjonktürdeyiz.

Canlı göstergelerimize baktığımızda; ABD 10 yıllık tahvil getirisi yüzde ${fmt(us10y.price, 2)} seviyesinde ve Dolar Endeksi DXY ${fmt(dxy.price, 2)} bandında. ${marketMood} ${bistMood}

Bugünkü yayınımızda "${t1}" başlığı altında yatırımcıların sermaye koruma stratejilerini, altın ve likit nakit tamponunu nasıl konumlandırması gerektiğini 9 slaytlık brifingimizle ayrıntılı olarak inceleyeceğiz.`;
      }

      // Default: Analytical (Bloomberg style)
      return `İyi seanslar değerli izleyiciler, ${slotTitle} bültenimize hoş geldiniz. Bugün ${todayFullStr}. Küresel ve yerel piyasalarda sermaye akışlarını, faiz patikasını ve günün manşetlerini masaya yatırıyoruz.

Günün açılış göstergelerinde ${marketMood} BIST 100 endeksi ise ${fmt(bist100.price, 0)} puanda işlem görüyor. Dolar endeksi DXY ${fmt(dxy.price, 2)} seviyesinde gücünü korurken, ons altın $${fmt(gold.price, 0)} bandında, gram altın ise ${fmt(gramAltinTL, 0)} lirada alıcı buluyor.

Gündemimizin ilk sırasında "${t1}", ardından "${t2}" ve şirket bilançoları var. 9 slaytlık profesyonel brifingimizle canlı piyasa turumuza başlıyoruz.`;
    }

    // -------------------------------------------------------------------------
    // SLIDE 2: JEOPOLİTİK RİSKLER & ENERJİ KORİDORLARI
    // -------------------------------------------------------------------------
    case 2: {
      const oilTrend = isBrentGreen
        ? `Brent petrolün varili bugün yüzde ${fmt(brent.change, 2)} artışla $${fmt(brent.price, 2)} seviyesine tırmandı.`
        : `Brent petrol bugün yüzde ${fmt(Math.abs(brent.change), 2)} geri çekilmeyle $${fmt(brent.price, 2)} bandında dengeleniyor.`;

      return `İkinci slaytımızda küresel jeopolitik tansiyon ve enerji koridorlarına odaklanıyoruz. ${oilTrend}

Hürmüz Boğazı ve Kızıldeniz lojistiğindeki gerginlikler deniz taşımacılığı navlun maliyetlerini yukarıda tutuyor. Enerji fiyatlarındaki bu dalgalanma manşet enflasyonun yapışkan kalmasına neden olarak küresel merkez bankalarının faiz indirim adımlarını temkinli atmasına yol açıyor.

Bu ortamda rafineri marjları ve enerji hisseleri yakından izlenirken, akıllı sermaye enflasyona karşı doğal bir kalkan vazifesi gören emtialara ve nakit akışı güçlü şirketlere park etmeyi sürdürüyor.`;
    }

    // -------------------------------------------------------------------------
    // SLIDE 3: MERKEZ BANKALARI, ENFLASYON & REEL FAİZ KALKANI
    // -------------------------------------------------------------------------
    case 3: {
      const netRealYield = ((Number(tcmbRate) || 36) - (Number(turkeyCPI) || 29.73)).toFixed(2);
      return `Üçüncü masamızda küresel merkez bankaları ve Türkiye'nin faiz kalkanını kıyaslıyoruz.

Fed tarafında politika faizi yüzde ${fedRate} bandında korunurken, vadeli piyasalarda 28 Ekim FOMC toplantısında faizin sabit tutulması (pas geçilmesi), Aralık toplantısı için ise enflasyon seyrine bağlı 25 baz puanlık faiz artışı veya şahin duruş ihtimali masada tutuluyor. Türkiye'de ise TCMB'nin yüzde ${tcmbRate} politika faizi, yüzde ${turkeyCPI} enflasyon oranıyla birlikte artı ${netRealYield} puanlık güçlü bir pozitif reel getiri kalkanı sunmaya devam ediyor.

Bu pozitif reel faiz tamponu, Dolar/TL'nin ${fmt(currentUsdTry, 2)} lira civarında spekülatif ataklardan uzak kalmasını sağlıyor. Para piyasası fonları (PPF) ve nakit tamponları, piyasa dalgalanmalarında portföyler için emniyet kemeri işlevi görüyor.`;
    }

    // -------------------------------------------------------------------------
    // SLIDE 4: WALL STREET, BİLANÇO DÖNEMİ & YAPAY ZEKA
    // -------------------------------------------------------------------------
    case 4: {
      const spMove = isSPGreen
        ? `S&P 500 endeksi ${fmt(sp500.price, 0)} puanda zirveye yakın seyrederken Nasdaq ${fmt(nasdaq.price, 0)} puanda teknoloji devleriyle ralliye katılıyor.`
        : `S&P 500 ${fmt(sp500.price, 0)} puanda ve teknoloji ağırlıklı Nasdaq ${fmt(nasdaq.price, 0)} puanda kâr realizasyonlarını karşılıyor.`;

      return `Dördüncü durağımızda Wall Street ve yapay zeka ekosistemindeki devasa sermaye döngüsünü masaya yatırıyoruz. ${spMove}

Büyük teknoloji devlerinin yıllık 200 milyar doları aşan AI Capex sermaye harcamaları çip ve veri merkezi üreticilerine can suyu olmaya devam ediyor. Takvimimizde Vertiv, Amazon, Microsoft, Apple ve ardından Nvidia'nın üçüncü çeyrek bilançoları yaklaşıyor. 

Piyasada genel endeks yükselişinden ziyade serbest nakit akışı (FCF) üretebilen ve değerlemesi makul kalan şirketlerin pozitif ayrışacağı seçici bir döneme giriyoruz.`;
    }

    // -------------------------------------------------------------------------
    // SLIDE 5: KIYMETLİ MADENLER: ONS ALTIN & GÜMÜŞ
    // -------------------------------------------------------------------------
    case 5: {
      const goldComment = isGoldGreen
        ? `Ons altın bugün yüzde ${fmt(gold.change, 2)} primle $${fmt(gold.price, 0)} seviyesinde tarihi gücünü kanıtlıyor.`
        : `Ons altın $${fmt(gold.price, 0)} seviyesinde güçlü kurumsal tabanını koruyor.`;

      return `Ve bugünkü analizimizin kalbine geldik: Altın ve gümüş masası! ${goldComment} Ons gümüş ise $${fmt(silver.price, 2)} seviyesinde endüstriyel taleple destekleniyor.

Altın/gümüş rasyosu ${(gold.price / (silver.price || 60)).toFixed(1)}x civarında dengelenirken, merkez bankalarının kesintisiz fiziki külçe alımları altındaki geri çekilmeleri anında kurumsal alımla karşılıyor.

Yurt içi yatırımcı için Kapalıçarşı gram altının ${fmt(gramAltinTL, 0)} TL seviyesinde sunduğu çifte kalkan (hem ons hem dolar primi) devalüasyon riskine karşı en sağlam sigortadır. Portföylerde gram altın ve kıymetli maden dengesini korumak kritik bir strateji olmaya devam ediyor.`;
    }

    // -------------------------------------------------------------------------
    // SLIDE 6: DXY & TAHVİL VERİM EĞRİSİ
    // -------------------------------------------------------------------------
    case 6: {
      return `Altıncı slaytımızda paranın nabzını tutan tahvil ve döviz piyasasına bakıyoruz. Dolar endeksi DXY ${fmt(dxy.price, 2)} seviyesinde küresel rezerv para gücünü yansıtıyor.

ABD 10 yıllık tahvil faizi yüzde ${fmt(us10y.price, 2)} ve 2 yıllık faiz yüzde ${fmt(us2y.price, 2)} seviyesinde. Getiri eğrisindeki pozitif eğim piyasanın resesyon korkusunu geride bıraktığını gösteriyor. 

Dolar/TL'nin ${fmt(currentUsdTry, 2)} liradaki kontrollü seyrinde ise TL bazlı faiz getirisi döviz kuru artış hızının üzerinde kalmaya devam ediyor.`;
    }

    // -------------------------------------------------------------------------
    // SLIDE 7: KRİPTO & SPOT ETF LİKİDİTESİ
    // -------------------------------------------------------------------------
    case 7: {
      const btcMove = (btc.change ?? 0) >= 0 ? `+ yüzde ${fmt(btc.change, 2)}` : `- yüzde ${fmt(Math.abs(btc.change), 2)}`;
      return `Yedinci slaytımızda dijital varlıklar ve kripto likiditesi masada. Bitcoin $${fmt(btc.price, 0)} seviyesinde ${btcMove} değişimle işlem görürken, kurumsal spot ETF girişleri hacim tabanını sağlamlaştırıyor.

Ethereum $${fmt(eth.price, 0)} bandında seyrederken piyasada sermayenin seçici olarak lider kripto varlıklarda toplandığını görüyoruz. Borsa rezervlerinin son yılların en düşük seviyelerinde kalması olası talep şoklarında yukarı yönlü esnekliği diri tutuyor.`;
    }

    // -------------------------------------------------------------------------
    // SLIDE 8: BORSA İSTANBUL & BIST 100 DİNAMİKLERİ
    // -------------------------------------------------------------------------
    case 8: {
      const bistMove = isBistGreen
        ? `Endeks bugün yüzde ${fmt(bist100.change, 2)} primle ${fmt(bist100.price, 0)} puan seviyesine yükselerek kurumsal tabanını güçlendirdi.`
        : `Endeks bugün ${fmt(bist100.price, 0)} puanda yüzde ${fmt(Math.abs(bist100.change), 2)} geri çekilmeyle destek testini sürdürüyor.`;

      return `Kendi evimize, Borsa İstanbul'a dönüyoruz. ${bistMove}

BIST 100 endeksi gelişmekte olan piyasalara kıyasla çarpan bazında cazip iskonto taşımaya devam ediyor. Bankacılık sektörü güçlü sermaye yapısıyla destek sağlarken, döviz kazancı olan ihracatçı sanayi şirketleri kur şoklarına karşı doğal kalkan sunuyor.

Bilanço sezonunun başlamasıyla birlikte şirket bazlı kâr ayrışmaları hızlanacaktır; endeksin geneli yerine nakit üreten hisselerde kalmak kritik önemdedir.`;
    }

    // -------------------------------------------------------------------------
    // SLIDE 9: YATIRIMCI PUSULASI & PORTFÖY STRATEJİSİ
    // -------------------------------------------------------------------------
    case 9: {
      const portText = `Piyasa dalgalanmalarında disiplini korumak adına varlık dağılımında likit nakit ve emtia tamponunun (Para Piyasası Fonu, kısa vadeli getiri araçları ve altın rezervi) dengeli tutulması, olası geri çekilmelerde kurumsal fırsatları değerlendirebilmek açısından izlenen temel savunma yaklaşımlarındandır.`;

      if (tone === 'youtube') {
        return `Ve yayınımızın kapanışında genel risk prensiplerimizi özetleyelim: ${portText}

Piyasa genelinde tüm likiditeyi tek seferde tüketmek yerine; kademeli adımlarla ilerlemek ve kenarda daima likit bir pay bulundurmak riskleri sınırlandırmak adına sıkça tercih edilen bir yaklaşımdır. Her zaman altını çizdiğimiz gibi buradaki hiçbir değerlendirme yatırım tavsiyesi değildir (YTD); kendi risk profilinize ve hedeflerinize göre kararlarınızı oluşturmanız esastır.

Değerli dostlar, yayını faydalı bulduysanız videoyu beğenmeyi, kanalımıza abone olmayı ve zili açmayı lütfen unutmayın. Siz de piyasa hakkındaki genel görüşlerinizi ve sorularınızı yorumlara yazın, hepsini tek tek yanıtlıyorum. Yarınki yayında görüşmek üzere, bol kazançlar!`;
      }

      if (tone === 'defensive') {
        return `Kapanışta risk yönetimi ilkelerini yineliyoruz: ${portText}

Piyasa dalgalanmalarında ve belirsizlik dönemlerinde anaparayı koruma refleksi her zaman öne çıkar. Aceleci işlemler yerine piyasa dengelenmelerini izlemek ve likit nakit tamponunu korumak risk yönetiminin temel unsurlarındandır. Yayınımızda yer alan tüm analiz ve grafikler eğitim amaçlı olup kesinlikle kişisel yatırım tavsiyesi niteliği taşımamaktadır (YTD). Sağlıklı ve başarılı seanslar dileriz.`;
      }

      // Default: Analytical
      return `Günün 9 slaytlık piyasa brifingini tamamlarken stratejik çerçeveyi özetliyoruz: ${portText}

Önümüzdeki günlerde açıklanacak bilançolar ve küresel merkez bankaları kararları yakından izlenecektir. Piyasa aktörleri açısından portföy disiplinini, çeşitlendirmeyi ve kurumsal nakit yönetimini gözetmek bu süreçte öne çıkan başlıklar arasında yer almaktadır. Yayındaki değerlendirmeler genel bilgilendirme niteliğinde olup yatırım danışmanlığı kapsamında değildir.

Bir sonraki ${slotTitle} bültenimizde görüşmek üzere, iyi günler ve başarılı piyasalar dileriz.`;
    }

    default:
      return '';
  }
};
