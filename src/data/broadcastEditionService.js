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
  tone = 'analytical',
  pinnedNews = []
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

Şimdi kemerleri bağlayın; 10 slaytlık brifingimizle sıcak haberlerden enerjiden teknolojiye, Wall Street'ten Borsa İstanbul'a kadar paranın rotasını adım adım takip ediyoruz!`;
      }

      if (tone === 'defensive') {
        return `Değerli yatırımcılar, ${slotTitle} analizimize hoş geldiniz. Bugün ${todayFullStr}. Piyasada fırsatlar kadar risklerin de masada olduğu, temkinli ve disiplinli hareket edilmesi gereken bir konjonktürdeyiz.

Canlı göstergelerimize baktığımızda; ABD 10 yıllık tahvil getirisi yüzde ${fmt(us10y.price, 2)} seviyesinde ve Dolar Endeksi DXY ${fmt(dxy.price, 2)} bandında. ${marketMood} ${bistMood}

Bugünkü yayınımızda "${t1}" başlığı altında piyasayı hareketlendiren son haberleri, yatırımcıların sermaye koruma stratejilerini ve altın-nakit dengesini 10 slaytlık brifingimizle ayrıntılı olarak inceleyeceğiz.`;
      }

      // Default: Analytical (Bloomberg style)
      return `İyi seanslar değerli izleyiciler, ${slotTitle} bültenimize hoş geldiniz. Bugün ${todayFullStr}. Küresel ve yerel piyasalarda sermaye akışlarını, günün sıcak haber katalizörlerini ve faiz patikasını masaya yatırıyoruz.

Günün açılış göstergelerinde ${marketMood} BIST 100 endeksi ise ${fmt(bist100.price, 0)} puanda işlem görüyor. Dolar endeksi DXY ${fmt(dxy.price, 2)} seviyesinde gücünü korurken, ons altın $${fmt(gold.price, 0)} bandında, gram altın ise ${fmt(gramAltinTL, 0)} lirada alıcı buluyor.

Gündemimizin ilk sırasında "${t1}", ardından "${t2}" ve şirket haberleri var. 10 slaytlık profesyonel brifingimizle canlı piyasa turumuza başlıyoruz.`;
    }

    // -------------------------------------------------------------------------
    // SLIDE 2: GÜNCEL HABERLER & PİYASA KATALİZÖRLERİ (BIST 30, SİYASET & GLOBAL)
    // -------------------------------------------------------------------------
    case 2: {
      const safePinned = Array.isArray(pinnedNews) ? pinnedNews : [];
      const trNews = safePinned.filter(n => n.region === 'TR');
      const globalNews = safePinned.filter(n => n.region !== 'TR');

      const speakNewsItem = (item) => {
        const cleanTitle = (item.title || '').trim().replace(/\.+$/, '');
        const tickerPart = Array.isArray(item.tickers) && item.tickers.length > 0
          ? ` (${item.tickers.slice(0, 2).join(', ')} odağında)`
          : '';
        const sourcePart = item.source ? `${item.source} kaynaklı gelişmede ` : '';
        const effectPhrase = item.sentiment === 'bear'
          ? 'hisse ve endeks fiyatlamalarında temkinli duruşa ve satış baskısına yol açıyor.'
          : item.sentiment === 'bull'
            ? 'piyasada alıcılı beklentiyi ve pozitif ayrışmayı destekliyor.'
            : 'piyasa aktörleri tarafından yön belirleyici olarak yakından izleniyor.';
        const notePart = item.impactNote && item.impactNote.trim()
          ? ` ${item.impactNote.trim()}${item.impactNote.trim().endsWith('.') ? '' : '.'}`
          : '';
        return `• ${sourcePart}"${cleanTitle}"${tickerPart} — bu başlık ${effectPhrase}${notePart}`;
      };

      const trBlock = trNews.length > 0
        ? `Yurt içi cephede BIST 30 ve ekonomi gündemine baktığımızda:\n${trNews.slice(0, 3).map(speakNewsItem).join('\n')}`
        : `Yurt içi tarafta BIST 100 (${fmt(bist100.price, 0)} puan) üzerinde "${t3}" başlığı ve bilanço dönemi ayrışmaları yakından izleniyor.`;

      const globalBlock = globalNews.length > 0
        ? `ABD ve küresel piyasalara yön veren sıcak başlıklarda ise:\n${globalNews.slice(0, 3).map(speakNewsItem).join('\n')}`
        : `Küresel cephede Wall Street ve teknoloji devleri tarafında "${t1}" ile siyasi/makro başlıklar risk iştahını şekillendiriyor.`;

      if (tone === 'youtube') {
        return `Ve şimdi ekran başına biraz daha yaklaşın dostlar! İkinci slaytımızda bugün piyasalarda sert hareketlere ve ayrışmalara neden olan güncel haber masamızı açıyoruz.

${trBlock}

${globalBlock}

Dostlar unutmayın; bu haberler kısa vadeli oynaklık yaratabilir ancak bizim pusulamız haberin şirketin bilançosuna ve nakit akışına kalıcı etkisi olup olmadığıdır. Paylaştığımız tüm başlıklar bilgi ve farkındalık amaçlıdır, kesinlikle yatırım tavsiyesi değildir.`;
      }

      if (tone === 'defensive') {
        return `İkinci slaytımızda günün yüksek etkili haber akışını sermaye koruma ve risk yönetimi süzgecinden geçiriyoruz.

${trBlock}

${globalBlock}

Yatırımcıların bu tip ani haber şoklarında panik kararlar yerine hacim, teknik destek seviyeleri ve bilanço gerçekliğini beklemeleri hayati önem taşır. Anlatılan gelişmeler genel piyasa değerlendirmesidir, yatırım tavsiyesi niteliği taşımaz (YTD).`;
      }

      return `İkinci slaytımızda Borsa İstanbul'dan Wall Street'e, ekonomi yönetiminden şirket spesifik şoklara kadar piyasaları bugün hareketlendiren canlı haber katalizörlerini değerlendiriyoruz.

${trBlock}

${globalBlock}

Özetle fiyatlamalar yalnızca endeks ortalamalarından değil, bu şirket ve politika bazlı ayrışmalardan besleniyor. Değerlendirmelerimiz bilgilendirme kapsamındadır (YTD).`;
    }

    // -------------------------------------------------------------------------
    // SLIDE 3: JEOPOLİTİK RİSKLER & ENERJİ KORİDORLARI
    // -------------------------------------------------------------------------
    case 3: {
      const oilTrend = isBrentGreen
        ? `Brent petrolün varili bugün yüzde ${fmt(brent.change, 2)} artışla $${fmt(brent.price, 2)} seviyesine tırmanırken, ABD tipi WTI ham petrol $${fmt(wti.price, 2)} seviyesinde işlem görüyor.`
        : `Brent petrol bugün yüzde ${fmt(Math.abs(brent.change), 2)} değişimle $${fmt(brent.price, 2)} bandında, ABD tipi WTI ham petrol ise $${fmt(wti.price, 2)} seviyesinde dengeleniyor.`;

      const oilSpread = Math.abs((brent.price || 0) - (wti.price || 0));

      return `Üçüncü slaytımızda küresel jeopolitik tansiyon ve enerji koridorlarına odaklanıyoruz. ${oilTrend} Brent-WTI makası varil başına $${fmt(oilSpread, 2)} seviyesinde seyrediyor.

Hürmüz Boğazı ve Kızıldeniz lojistiğindeki gelişmeler deniz taşımacılığı navlun maliyetlerini belirlerken, enerji fiyatlarındaki bu seyir manşet enflasyon ve merkez bankalarının faiz patikası açısından yakından izleniyor.

Bu ortamda rafineri marjları ve enerji hisseleri takip edilirken, kurumsal sermaye enflasyona karşı doğal bir kalkan vazifesi gören emtialara ve serbest nakit akışı güçlü şirketlere odaklanmayı sürdürüyor.`;
    }

    // -------------------------------------------------------------------------
    // SLIDE 4: MERKEZ BANKALARI, ENFLASYON & REEL FAİZ KALKANI
    // -------------------------------------------------------------------------
    case 4: {
      const netRealYield = ((Number(tcmbRate) || 36) - (Number(turkeyCPI) || 29.73)).toFixed(2);
      const fedMeetingLbl = customAgenda?.fedRate?.meetingDate || 'Aralık FOMC';
      const fedDomLbl = customAgenda?.fedRate?.dominant || 'Faizi Sabit Tutma (Pas)';
      const fedProbVal = customAgenda?.fedRate?.prob ?? 76;
      return `Dördüncü masamızda küresel merkez bankaları ve Türkiye'nin faiz kalkanını kıyaslıyoruz.

Fed tarafında politika faizi yüzde ${fedRate} bandında korunurken, vadeli piyasalarda ${fedMeetingLbl} toplantısında yüzde ${fedProbVal} olasılıkla "${fedDomLbl}" senaryosu fiyatlanıyor. Türkiye'de ise TCMB'nin yüzde ${fmt(tcmbRate, 2)} politika faizi, yüzde ${fmt(turkeyCPI, 2)} yıllık enflasyon oranıyla birlikte artı ${netRealYield} puanlık güçlü bir pozitif reel getiri kalkanı sunmaya devam ediyor.

Bu pozitif reel faiz tamponu, Dolar/TL'nin ${fmt(currentUsdTry, 2)} lira seviyesinde dengeli kalmasını destekliyor. Para piyasası fonları (PPF) ve likit nakit tamponları, piyasa dalgalanmalarında portföyler için emniyet kemeri işlevi görüyor.`;
    }

    // -------------------------------------------------------------------------
    // SLIDE 5: WALL STREET, BİLANÇO DÖNEMİ & YAPAY ZEKA
    // -------------------------------------------------------------------------
    case 5: {
      const spMove = isSPGreen
        ? `S&P 500 endeksi ${fmt(sp500.price, 0)} puanda (günlük +%${fmt(sp500.change, 2)}) seyrederken Nasdaq 100 ${fmt(nasdaq.price, 0)} puanda (günlük ${nasdaq.change >= 0 ? '+' : ''}%${fmt(nasdaq.change, 2)}) işlem görüyor.`
        : `S&P 500 ${fmt(sp500.price, 0)} puanda (%${fmt(sp500.change, 2)}) ve teknoloji ağırlıklı Nasdaq 100 ${fmt(nasdaq.price, 0)} puanda (%${fmt(nasdaq.change, 2)}) kâr realizasyonlarını karşılıyor.`;

      return `Beşinci durağımızda Wall Street ve yapay zeka ekosistemindeki sermaye döngüsünü masaya yatırıyoruz. ${spMove}

Büyük teknoloji devlerinin yıllık 200 milyar doları aşan AI Capex sermaye harcamaları çip, optik ağ ve veri merkezi üreticilerine güçlü nakit akışı sağlamaya devam ediyor.

Piyasada genel endeks yükselişinden ziyade yatırdığı sermayeden yüksek getiri (ROIC) ve serbest nakit akışı (FCF) üretebilen, değerlemesi makul kalan şirketlerin pozitif ayrıştığı seçici bir dönemdeyiz.`;
    }

    // -------------------------------------------------------------------------
    // SLIDE 6: KIYMETLİ MADENLER: ONS ALTIN & GÜMÜŞ
    // -------------------------------------------------------------------------
    case 6: {
      const goldSupport = Math.round((gold.price * 0.975) / 10) * 10;
      const goldRes = Math.round((gold.price * 1.025) / 10) * 10;
      const goldComment = isGoldGreen
        ? `Ons altın bugün yüzde ${fmt(gold.change, 2)} primle $${fmt(gold.price, 0)} seviyesinde gücünü kanıtlıyor.`
        : `Ons altın $${fmt(gold.price, 0)} seviyesinde ($${fmt(goldSupport, 0)} ana destek ve $${fmt(goldRes, 0)} direnç koridorunda) kurumsal tabanını koruyor.`;

      return `Altıncı slaytımızda emtia ve güvenli liman masasına, altın ve gümüşe geçiyoruz! ${goldComment} Ons gümüş ise $${fmt(silver.price, 2)} seviyesinde endüstriyel taleple destekleniyor.

Altın/gümüş rasyosu ${(gold.price / (silver.price || 60)).toFixed(1)}x seviyesinde dengelenirken, merkez bankalarının kesintisiz fiziki külçe alımları altındaki geri çekilmeleri kurumsal alımla karşılıyor.

Yurt içi yatırımcı için Kapalıçarşı gram altının ${fmt(gramAltinTL, 0)} TL seviyesinde sunduğu çifte kalkan (hem ons hem dolar çarpanı) enflasyon riskine karşı önemli bir denge unsuru olmaya devam ediyor.`;
    }

    // -------------------------------------------------------------------------
    // SLIDE 7: DXY & TAHVİL VERİM EĞRİSİ
    // -------------------------------------------------------------------------
    case 7: {
      const spreadBp = Math.round(((us10y.price || 0) - (us2y.price || 0)) * 100);
      const spreadStr = `${spreadBp >= 0 ? '+' : ''}${spreadBp} baz puan`;
      return `Yedinci slaytımızda paranın nabzını tutan tahvil ve döviz piyasasına bakıyoruz. Dolar endeksi DXY ${fmt(dxy.price, 3)} seviyesinde küresel rezerv para gücünü yansıtıyor.

ABD 10 yıllık tahvil faizi yüzde ${fmt(us10y.price, 3)} ve 2 yıllık faiz yüzde ${fmt(us2y.price, 3)} seviyesinde; 2Y/10Y getiri eğrisi farkı ${spreadStr} olarak ölçülüyor.

Dolar/TL'nin ${fmt(currentUsdTry, 2)} liradaki kontrollü seyrinde ise yüzde ${fmt(tcmbRate, 2)} seviyesindeki politika faizi ve pozitif reel getiri dengesi belirleyici olmaya devam ediyor.`;
    }

    // -------------------------------------------------------------------------
    // SLIDE 8: KRİPTO & SPOT ETF LİKİDİTESİ
    // -------------------------------------------------------------------------
    case 8: {
      const btcMove = (btc.change ?? 0) >= 0 ? `+ yüzde ${fmt(btc.change, 2)}` : `- yüzde ${fmt(Math.abs(btc.change), 2)}`;
      const btcSup = Math.floor((btc.price * 0.96) / 500) * 500;
      const btcRes = Math.ceil((btc.price * 1.025) / 500) * 500;
      return `Sekizinci slaytımızda dijital varlıklar ve kripto likiditesi masada. Bitcoin $${fmt(btc.price, 0)} seviyesinde (${btcMove}) işlem görürken, teknik olarak $${fmt(btcSup, 0)} destek tabanı ile $${fmt(btcRes, 0)} direnç koridoru takip ediliyor.

Ethereum $${fmt(eth.price, 0)} bandında (ETH/BTC: ${(eth.price / (btc.price || 86000)).toFixed(4)}) seyrederken, TOTAL3 altcoin piyasa büyüklüğü $${fmt(total3.price, 1)} milyar dolar seviyesinde bulunuyor.`;
    }

    // -------------------------------------------------------------------------
    // SLIDE 9: BORSA İSTANBUL & BIST 100 DİNAMİKLERİ
    // -------------------------------------------------------------------------
    case 9: {
      const bistSup = Math.floor((bist100.price * 0.97) / 100) * 100;
      const bistRes = Math.ceil((bist100.price * 1.03) / 100) * 100;
      const bistMove = isBistGreen
        ? `Endeks bugün yüzde ${fmt(bist100.change, 2)} primle ${fmt(bist100.price, 0)} puan seviyesinde işlem görüyor.`
        : `Endeks bugün ${fmt(bist100.price, 0)} puanda yüzde ${fmt(Math.abs(bist100.change), 2)} değişimle ${fmt(bistSup, 0)} destek ve ${fmt(bistRes, 0)} direnç bandında dengeleniyor.`;

      return `Dokuzuncu slaytımızda kendi evimize, Borsa İstanbul'a dönüyoruz. ${bistMove}

BIST 100 endeksi dolar bazında $${fmt(bist100.price / (currentUsdTry || 49), 0)} seviyesinde işlem görürken, gelişmekte olan piyasalara kıyasla çarpan bazında iskonto taşımaya devam ediyor.

Bilanço döneminde şirket bazlı kâr ve serbest nakit akışı ayrışmaları hızlanırken, döviz geliri olan ve özsermaye kârlılığı yüksek şirketler ön plana çıkıyor.`;
    }

    // -------------------------------------------------------------------------
    // SLIDE 10: YATIRIMCI PUSULASI & PORTFÖY STRATEJİSİ
    // -------------------------------------------------------------------------
    case 10: {
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
      return `Günün 10 slaytlık piyasa brifingini tamamlarken stratejik çerçeveyi özetliyoruz: ${portText}

Önümüzdeki günlerde açıklanacak bilançolar ve küresel merkez bankaları kararları yakından izlenecektir. Piyasa aktörleri açısından portföy disiplinini, çeşitlendirmeyi ve kurumsal nakit yönetimini gözetmek bu süreçte öne çıkan başlıklar arasında yer almaktadır. Yayındaki değerlendirmeler genel bilgilendirme niteliğinde olup yatırım danışmanlığı kapsamında değildir.

Bir sonraki ${slotTitle} bültenimizde görüşmek üzere, iyi günler ve başarılı piyasalar dileriz.`;
    }

    default:
      return '';
  }
};
