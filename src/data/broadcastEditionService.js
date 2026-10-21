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
  quotes,
  todayFullStr,
  slotTitle,
  customAgenda = null,
  tone = 'analytical',
  portfolioContext = null
) => {
  const {
    fmt,
    brent = { price: 80, change: 0 },
    gold = { price: 4200, change: 0 },
    silver = { price: 60, change: 0 },
    dxy = { price: 102.5, change: 0 },
    us10y = { price: 4.15, change: 0 },
    sp500 = { price: 7650, change: 0 },
    nasdaq = { price: 30500, change: 0 },
    bist100 = { price: 12200, change: 0 },
    btc = { price: 86500, change: 0 },
    currentUsdTry = 49.03,
    gramAltinTL = 6600
  } = quotes;

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

Bugünkü yayınımızda "${t1}" başlığı altında sermaye koruma kalkanımızı, altın ve likit nakit tamponumuzu nasıl konumlandırmamız gerektiğini 9 slaytlık brifingimizle ayrıntılı olarak inceleyeceğiz.`;
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
      return `Üçüncü masamızda küresel merkez bankaları ve Türkiye'nin faiz kalkanını kıyaslıyoruz.

Fed tarafında politika faizi yüzde 3.75 - 4.00 bandında seyrederken, vadeli piyasalarda bir sonraki toplantı için 25 baz puanlık indirim beklentisi ağırlığını koruyor. Türkiye'de ise TCMB'nin yüzde 50 politika faizi, gerileyen enflasyon trendiyle birlikte pozitif reel getiri alanı açmış durumdadır.

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

Yurt içi yatırımcı için Kapalıçarşı gram altının ${fmt(gramAltinTL, 0)} TL seviyesinde sunduğu çifte kalkan (hem ons hem dolar primi) devalüasyon riskine karşı en sağlam sigortadır. Portföyümüzde gram altın ağırlığını korumaya devam ediyoruz.`;
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
      const portText = portfolioContext && portfolioContext.totalVal
        ? `Kendi portföyümüzde toplam değerimiz ${portfolioContext.sym}${fmt(portfolioContext.totalVal)} seviyesindedir. Yüzde %${portfolioContext.shieldRatio} oranındaki Kur Kalkanımız (Gram Altın + PPF + Nakit) piyasadaki dalgalanmalara karşı tam koruma sağlamaktadır.`
        : `Portföyümüzde yüzde 35 oranındaki Kur Kalkanımız (Gram Altın, PPF ve Serbest Nakit) piyasa dalgalanmalarına karşı tam koruma sağlamaktadır.`;

      if (tone === 'youtube') {
        return `Ve yayınımızın kapanışında altın kurallarımızı hatırlayalım: ${portText}

Asla tek kademede tüm nakdi tüketmeyin. Destek seviyelerinde kademeli giriş, teyit alındığında ekleme ve her zaman kenarda "kuru barut" bulundurma kuralımıza sadık kalıyoruz.

Değerli dostlar, yayını faydalı bulduysanız videoyu beğenmeyi, kanalımıza abone olmayı ve zili açmayı lütfen unutmayın. Kendi portföy dağılımınızı ve sorularınızı yorumlara yazın, hepsini yanıtlıyorum. Yarınki yayında görüşmek üzere, bol kazançlar!`;
      }

      if (tone === 'defensive') {
        return `Kapanışta risk yönetimi prensiplerimizi yineliyoruz: ${portText}

Piyasa belirsizliklerinde en kritik varlık anaparanızdır. FOMO'ya kapılmadan, 3 kademeli alım disipliniyle ve kur kalkanınızı eksiltmeden pozisyonlarınızı koruyun.

Disiplinli kalan ve riskini yöneten yatırımcı uzun vadede her zaman kazanacaktır. Sağlıklı ve başarılı seanslar dileriz.`;
      }

      // Default: Analytical
      return `Günün 9 slaytlık piyasa brifingini tamamlarken stratejik tablomuzu özetliyoruz: ${portText}

Önümüzdeki günlerde açıklanacak bilançolar ve küresel merkez bankaları kararları yakından izlenecektir. Portföy disiplinini ve kurumsal nakit yönetimini elden bırakmadan yatırımlarınızı yönlendirmenizi tavsiye ederiz.

Bir sonraki ${slotTitle} bültenimizde görüşmek üzere, iyi günler ve başarılı yatırımlar dileriz.`;
    }

    default:
      return '';
  }
};
