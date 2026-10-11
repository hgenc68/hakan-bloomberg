// Sektörel & Tematik Risk Konsantrasyonu ve Pozisyon Limitleri Konfigürasyonu
// Kurumsal Portföy Yönetimi (UCITS 5/10/40 & Barbell Mimarisi Standartları)

export const SECTOR_DEFINITIONS = {
  semiconductor: {
    id: 'semiconductor',
    name: 'Yarı İletken & AI Donanım',
    shortName: 'Yarı İletken',
    icon: '⚡',
    color: '#10b981', // emerald
    targetCapPct: 15.0,
    desc: 'Çip tasarımı, dökümhane, bellek ve AI işlemcileri (NVDA, TSM, DRAM)'
  },
  bigtech_cloud: {
    id: 'bigtech_cloud',
    name: 'Büyük Teknoloji, Bulut & Yazılım',
    shortName: 'Büyük Teknoloji',
    icon: '☁️',
    color: '#38bdf8', // sky
    targetCapPct: 15.0,
    desc: 'Mega-cap platformlar, SaaS, bulut altyapısı ve AI modelleri (MSFT, AMZN, GOOGL)'
  },
  industrials_defense: {
    id: 'industrials_defense',
    name: 'Sanayi, Havacılık & Savunma',
    shortName: 'Sanayi & Savunma',
    icon: '🚀',
    color: '#a855f7', // purple
    targetCapPct: 10.0,
    desc: 'Uzay teknolojisi, savunma sanayii ve ileri imalat (SPCX, ASELS)'
  },
  healthcare: {
    id: 'healthcare',
    name: 'Sağlık & Biyoteknoloji',
    shortName: 'Sağlık & Biyo',
    icon: '🧬',
    color: '#ec4899', // pink
    targetCapPct: 10.0,
    desc: 'Büyük ilaç şirketleri, biyoteknoloji ve medikal çözümler (ABBV, LLY)'
  },
  energy_materials: {
    id: 'energy_materials',
    name: 'Enerji, Rafineri & Emtia',
    shortName: 'Enerji & Emtia',
    icon: '🛢️',
    color: '#f59e0b', // amber
    targetCapPct: 12.0,
    desc: 'Petrol, rafineri, doğal gaz, çelik ve madencilik (TUPRS, EREGL, XOM)'
  },
  consumer_retail: {
    id: 'consumer_retail',
    name: 'Tüketim, Gıda & Perakende',
    shortName: 'Tüketim & Perakende',
    icon: '🛒',
    color: '#84cc16', // lime
    targetCapPct: 10.0,
    desc: 'Market zincirleri, gıda içecek ve restoranlar (BIMAS, BYDNR, CCOLA)'
  },
  mobility_auto: {
    id: 'mobility_auto',
    name: 'Ulaşım, Havayolu & Otomotiv',
    shortName: 'Ulaşım & Oto',
    icon: '✈️',
    color: '#06b6d4', // cyan
    targetCapPct: 10.0,
    desc: 'Havayolu taşımacılığı, otomotiv üretimi ve lojistik (THYAO, FROTO, TSLA)'
  },
  financials: {
    id: 'financials',
    name: 'Finans, Banka & Fintech',
    shortName: 'Finans & Fintech',
    icon: '💳',
    color: '#6366f1', // indigo
    targetCapPct: 10.0,
    desc: 'Ticari bankalar, ödeme altyapıları ve fintech (SOFI, GARAN, JPM)'
  },
  gold_shield: {
    id: 'gold_shield',
    name: 'Kur Kalkanı & Kıymetli Maden',
    shortName: 'Kur Kalkanı',
    icon: '🛡️',
    color: '#fbbf24', // gold
    targetCapPct: 20.0,
    desc: 'Fiziki ve banka altın, gümüş ve kur koruma enstrümanları'
  },
  crypto: {
    id: 'crypto',
    name: 'Kripto & Asimetrik Varlıklar',
    shortName: 'Kripto',
    icon: '💎',
    color: '#c084fc', // violet
    targetCapPct: 5.0,
    desc: 'Bitcoin, Ethereum ve Web3 yüksek getiri potansiyelli varlıklar'
  },
  cash_liquid: {
    id: 'cash_liquid',
    name: 'PPF & Serbest Nakit (Likit Barut)',
    shortName: 'Nakit / PPF',
    icon: '💵',
    color: '#3b82f6', // blue
    targetCapPct: 15.0,
    desc: 'Para piyasası fonları ve anlık dip fırsatları için harcanabilir alım gücü'
  },
  other_equity: {
    id: 'other_equity',
    name: 'Holding, GYO & Çeşitli',
    shortName: 'Holding & Diğer',
    icon: '📊',
    color: '#94a3b8', // slate
    targetCapPct: 10.0,
    desc: 'Çok sektörlü holdingler, GYO ve karma büyüme hisseleri'
  }
};

export const TICKER_SECTOR_MAP = {
  // Yarı İletken & Donanım
  'NVDA': 'semiconductor',
  'TSM': 'semiconductor',
  'DRAM': 'semiconductor',
  'AMD': 'semiconductor',
  'AVGO': 'semiconductor',
  'ARM': 'semiconductor',
  'ASML': 'semiconductor',
  'MU': 'semiconductor',
  'TXN': 'semiconductor',
  'INTC': 'semiconductor',
  'QCOM': 'semiconductor',

  // Büyük Teknoloji & Bulut
  'MSFT': 'bigtech_cloud',
  'AMZN': 'bigtech_cloud',
  'GOOGL': 'bigtech_cloud',
  'GOOG': 'bigtech_cloud',
  'META': 'bigtech_cloud',
  'AAPL': 'bigtech_cloud',
  'ORCL': 'bigtech_cloud',
  'PLTR': 'bigtech_cloud',
  'CRWD': 'bigtech_cloud',
  'SNOW': 'bigtech_cloud',
  'CRM': 'bigtech_cloud',
  'IBM': 'bigtech_cloud',

  // Sağlık & Biyoteknoloji
  'ABBV': 'healthcare',
  'LLY': 'healthcare',
  'JNJ': 'healthcare',
  'MRK': 'healthcare',
  'PFE': 'healthcare',

  // Sanayi, Havacılık & Savunma
  'SPCX': 'industrials_defense',
  'LMT': 'industrials_defense',
  'RTX': 'industrials_defense',
  'BA': 'industrials_defense',
  'ASELS': 'industrials_defense',
  'ASELS.IS': 'industrials_defense',

  // Enerji & Emtia
  'TUPRS': 'energy_materials',
  'TUPRS.IS': 'energy_materials',
  'XOM': 'energy_materials',
  'CVX': 'energy_materials',
  'PETKM': 'energy_materials',
  'PETKM.IS': 'energy_materials',
  'EREGL': 'energy_materials',
  'EREGL.IS': 'energy_materials',
  'KRDMD': 'energy_materials',
  'KRDMD.IS': 'energy_materials',

  // Tüketim & Perakende
  'BIMAS': 'consumer_retail',
  'BIMAS.IS': 'consumer_retail',
  'SOKM': 'consumer_retail',
  'SOKM.IS': 'consumer_retail',
  'MGROS': 'consumer_retail',
  'MGROS.IS': 'consumer_retail',
  'CCOLA': 'consumer_retail',
  'CCOLA.IS': 'consumer_retail',
  'BYDNR': 'consumer_retail',
  'BYDNR.IS': 'consumer_retail',
  'KO': 'consumer_retail',
  'PEP': 'consumer_retail',
  'COST': 'consumer_retail',
  'WMT': 'consumer_retail',

  // Ulaşım, Havayolu & Otomotiv
  'THYAO': 'mobility_auto',
  'THYAO.IS': 'mobility_auto',
  'PGSUS': 'mobility_auto',
  'PGSUS.IS': 'mobility_auto',
  'FROTO': 'mobility_auto',
  'FROTO.IS': 'mobility_auto',
  'TOASO': 'mobility_auto',
  'TOASO.IS': 'mobility_auto',
  'TSLA': 'mobility_auto',

  // Finans & Fintech
  'SOFI': 'financials',
  'GARAN': 'financials',
  'GARAN.IS': 'financials',
  'AKBNK': 'financials',
  'AKBNK.IS': 'financials',
  'ISCTR': 'financials',
  'ISCTR.IS': 'financials',
  'YKBNK': 'financials',
  'YKBNK.IS': 'financials',
  'VAKBN': 'financials',
  'VAKBN.IS': 'financials',
  'HALKB': 'financials',
  'HALKB.IS': 'financials',
  'JPM': 'financials',
  'V': 'financials',
  'MA': 'financials',

  // Holding & Diğer
  'KCHOL': 'other_equity',
  'KCHOL.IS': 'other_equity',
  'SAHOL': 'other_equity',
  'SAHOL.IS': 'other_equity',
  'SISE': 'other_equity',
  'SISE.IS': 'other_equity',
  'ENKAI': 'other_equity',
  'ENKAI.IS': 'other_equity',
  'TRGYO': 'other_equity',
  'TRGYO.IS': 'other_equity',

  // Altın / Kalkan
  'XAUT': 'gold_shield',
  'XAUT-USD': 'gold_shield',
  'GRAM_ALTIN': 'gold_shield',
  'ALTIN': 'gold_shield',

  // Kripto
  'BTC-USD': 'crypto',
  'BTC': 'crypto',
  'ETH-USD': 'crypto',
  'ETH': 'crypto',
  'SOL': 'crypto',
  'SUI': 'crypto',
  'LDO': 'crypto',
  'OP': 'crypto',
  'ARKM': 'crypto',
  'DOGE': 'crypto',
  'BIO-USD': 'crypto'
};

// Kurumsal Konsantrasyon Limitleri
export const DEFAULT_CONCENTRATION_LIMITS = {
  // Tek bir hissenin tüm portföy içindeki önerilen ideal azami payı
  SINGLE_STOCK_SOFT_CAP_PCT: 7.5,
  // Tek bir hissenin tüm portföy içindeki kesin üst sınırı (UCITS kuralı)
  SINGLE_STOCK_HARD_CAP_PCT: 10.0,
  // Bir hissenin kendi ait olduğu varlık sınıfı (örn. ABD Hisse) içindeki azami payı
  CLASS_INTERNAL_MAX_PCT: 25.0
};

export function getTickerSector(ticker, type) {
  if (!ticker) return SECTOR_DEFINITIONS.other_equity;
  const sym = String(ticker).toUpperCase().trim();
  const clean = sym.replace('.IS', '').replace('-USD', '');

  // 1. Explicit ticker check
  if (TICKER_SECTOR_MAP[sym]) return SECTOR_DEFINITIONS[TICKER_SECTOR_MAP[sym]];
  if (TICKER_SECTOR_MAP[clean]) return SECTOR_DEFINITIONS[TICKER_SECTOR_MAP[clean]];

  // 2. Type fallback
  if (type === 'Altın' || type === 'Emtia' || clean === 'XAUT') return SECTOR_DEFINITIONS.gold_shield;
  if (type === 'Kripto') return SECTOR_DEFINITIONS.crypto;
  if (type === 'Nakit' || type === 'PPF') return SECTOR_DEFINITIONS.cash_liquid;

  return SECTOR_DEFINITIONS.other_equity;
}

export const KNOWN_EXPORTERS = new Set(['THYAO', 'FROTO', 'SISE', 'CCOLA', 'PGSUS', 'TOASO', 'TUPRS', 'EREGL', 'ASELS']);
export const KNOWN_CRYPTO = new Set(['BTC', 'ETH', 'SUI', 'OP', 'ARKM', 'DOGE', 'BIO', 'LDO', 'SOL', 'AVAX', 'XRP', 'LINK', 'BNB', 'DOGE-USD', 'BTC-USD', 'ETH-USD', 'BIO-USD']);

/**
 * Bir varlığın Kur Kalkanı'ndaki 6 makro varlık sınıfından hangisine ait olduğunu belirler.
 */
export function getMacroAssetClass(h) {
  if (!h) return 'us_equities_etf';
  const sym = String(h.ticker || h.clean_ticker || h.cleanTicker || '').toUpperCase().trim();
  const clean = sym.replace('.IS', '').replace('-USD', '');
  const type = h.type || '';

  if (type === 'Kripto' || KNOWN_CRYPTO.has(clean) || sym.includes('-USD') || sym.endsWith('USDT')) {
    return 'crypto';
  }
  if (type === 'Altın' || type === 'Emtia' || clean.includes('XAUT') || clean.includes('GOLD') || clean.includes('GRAM') || clean.includes('ALTIN')) {
    return 'gold_metals';
  }
  if (type === 'PPF' || type === 'Nakit' || clean === 'PPF' || clean === 'CASH') {
    return 'cash_ppf';
  }
  if (h.isHoldingUSD || h.currency === 'USD' || ['SPCX', 'DRAM', 'NVDA', 'TSM', 'ABBV', 'AAPL', 'MSFT', 'AMZN', 'GOOGL', 'META', 'SOFI', 'PLTR', 'TSLA', 'AMD', 'AVGO', 'ASML', 'LLY', 'NVO', 'XOM', 'CVX'].includes(clean)) {
    return 'us_equities_etf';
  }
  if (KNOWN_EXPORTERS.has(clean)) {
    return 'bist_export';
  }
  return 'bist_domestic';
}

/**
 * Bir hissenin mevcut portföy risk tavanlarına (Tekil hisse, Sektör ve Varlık Sınıfı)
 * takılıp takılmadığını kurumsal UCITS kurallarına göre analiz eder.
 */
export function evaluateStockConstraints({
  ticker,
  type = 'Hisse',
  holdings = [],
  portfolioSummary = null,
  allocation = null,
  usdtry = 49.03
}) {
  if (!ticker) {
    return {
      status: 'APPROVED',
      level: 'success',
      badgeText: 'KOTA UYGUN',
      badgeColor: 'emerald',
      badgeIcon: '🛡️',
      title: 'Portföy Kotası Uygun',
      warningText: 'Analiz edilen hisse için herhangi bir tavan aşımı tespit edilmedi.',
      recommendation: 'GÜVENLE EKLENEBİLİR',
      actionAllowed: true
    };
  }

  const cleanTarget = String(ticker).toUpperCase().trim().replace('.IS', '').replace('-USD', '');
  const sector = getTickerSector(ticker, type);
  const sectorCap = sector.targetCapPct || 10.0;

  // 1. Aktif Portföy Pozisyonlarını Belirle (Öncelikle zenginleştirilmiş enrichedHoldings listesi)
  const activeHoldings = (portfolioSummary?.enrichedHoldings && portfolioSummary.enrichedHoldings.length > 0)
    ? portfolioSummary.enrichedHoldings
    : (Array.isArray(holdings) && holdings.length > 0 ? holdings : []);

  // Pozisyon değerini TRY cinsinden her senaryoda hatasız hesaplama
  const getHoldingValTRY = (h) => {
    if (!h) return 0;
    if (h.valTRY != null && !isNaN(h.valTRY) && Number(h.valTRY) > 0) return Number(h.valTRY);
    if (h.val_try != null && !isNaN(h.val_try) && Number(h.val_try) > 0) return Number(h.val_try);
    if (h.valUSD != null && !isNaN(h.valUSD) && Number(h.valUSD) > 0) {
      const rate = Number(usdtry) || 49.03;
      return Number(h.valUSD) * rate;
    }
    const shares = Number(h.shares) || 0;
    const price = Number(h.livePriceTRY || h.livePrice || h.current_price || h.currentPrice || h.last_price || h.avg_cost) || 0;
    const isUSD = h.currency === 'USD' || (Number(h.cost_rate) > 1.5) || h.isHoldingUSD;
    const rate = Number(usdtry) || 49.03;
    return isUSD ? (shares * price * rate) : (shares * price);
  };

  // Bir varlığın hedef hisse ile eşleşip eşleşmediğini kontrol eden esnek eşleştirici
  const isHoldingMatch = (h, target) => {
    if (!h || !target) return false;
    const tClean = String(target).toUpperCase().trim().replace('.IS', '').replace('-USD', '');
    const candidates = [
      h.ticker,
      h.clean_ticker,
      h.cleanTicker,
      h.symbol,
      h.clean
    ].filter(Boolean).map(s => String(s).toUpperCase().trim());

    return candidates.some(c => {
      const cClean = c.replace('.IS', '').replace('-USD', '');
      return c === String(target).toUpperCase().trim() || cClean === tClean;
    });
  };

  // 2. Toplam Portföy Değeri (TRY)
  let totalValTRY = Number(portfolioSummary?.totalValTRY) || 0;
  if (!totalValTRY || totalValTRY <= 0) {
    activeHoldings.forEach(h => {
      totalValTRY += getHoldingValTRY(h);
    });
    totalValTRY += Number(portfolioSummary?.totalGoldValTRY) || 0;
    totalValTRY += Number(portfolioSummary?.ppfBalanceTRY) || 0;
    totalValTRY += Number(portfolioSummary?.totalFreeCashTRY) || 0;
  }

  // 3. Sektörel Mevcut Dağılım Hesabı
  let currentSectorValTRY = 0;
  const sectorHoldingsList = [];

  activeHoldings.forEach(h => {
    const hTicker = h.ticker || h.clean_ticker || h.cleanTicker || '';
    const hSector = getTickerSector(hTicker, h.type);
    if (hSector.id === sector.id) {
      const v = getHoldingValTRY(h);
      currentSectorValTRY += v;
      sectorHoldingsList.push({
        ticker: hTicker,
        name: h.name || hTicker,
        valTRY: v,
        shares: h.shares
      });
    }
  });

  if (sector.id === 'gold_shield') {
    currentSectorValTRY += (Number(portfolioSummary?.totalGoldValTRY) || 0);
  } else if (sector.id === 'cash_liquid') {
    currentSectorValTRY += ((Number(portfolioSummary?.ppfBalanceTRY) || 0) + (Number(portfolioSummary?.totalFreeCashTRY) || 0));
  }

  const sectorWeightPct = totalValTRY > 0 ? (currentSectorValTRY / totalValTRY) * 100 : 0;
  const sectorDelta = sectorWeightPct - sectorCap;
  const isSectorBreached = sectorDelta > 0.5;
  const isSectorNearCap = sectorDelta > -1.5 && sectorDelta <= 0.5;
  const sectorRemainingCapPct = Math.max(0, sectorCap - sectorWeightPct);

  // 4. Tek Hisse Mevcut Payı Hesabı
  const existingHolding = activeHoldings.find(h => isHoldingMatch(h, ticker));
  const existingHoldingValTRY = existingHolding ? getHoldingValTRY(existingHolding) : 0;
  const singleStockWeightPct = totalValTRY > 0 ? (existingHoldingValTRY / totalValTRY) * 100 : 0;
  const singleStockSoftCap = DEFAULT_CONCENTRATION_LIMITS.SINGLE_STOCK_SOFT_CAP_PCT; // 7.5%
  const singleStockHardCap = DEFAULT_CONCENTRATION_LIMITS.SINGLE_STOCK_HARD_CAP_PCT; // 10.0%
  const isSingleStockHardBreached = singleStockWeightPct >= singleStockHardCap;
  const isSingleStockSoftBreached = singleStockWeightPct >= singleStockSoftCap;

  // 5. Makro Varlık Sınıfı Hesabı (Kur Kalkanı ile Birebir Uyumlu)
  const isBistStock = ticker.endsWith('.IS') || 
                      type === 'BIST' || 
                      existingHolding?.currency === 'TRY' ||
                      (!existingHolding?.isHoldingUSD && existingHolding?.currency !== 'USD' && [
                        'THYAO', 'TUPRS', 'EREGL', 'FROTO', 'BYDNR', 'BIMAS', 'ASELS', 
                        'KCHOL', 'SISE', 'SAHOL', 'AKBNK', 'GARAN', 'ISCTR', 'YKBNK',
                        'PGSUS', 'CCOLA', 'TOASO', 'TRGYO', 'ENKAI', 'VAKBN', 'HALKB'
                      ].includes(cleanTarget));

  const assetCurrency = existingHolding?.currency || (isBistStock ? 'TRY' : 'USD');
  const targetMacroKey = getMacroAssetClass({ 
    ticker, 
    type: isBistStock ? 'BIST' : type, 
    currency: assetCurrency,
    isHoldingUSD: !isBistStock && assetCurrency === 'USD'
  });
  
  let macroKey = targetMacroKey;
  let macroLabel = 'ABD Hisse & Global';
  let macroTargetPct = 35.0;

  if (targetMacroKey === 'crypto') {
    macroLabel = 'Kripto Varlıklar';
    macroTargetPct = 5.0;
  } else if (targetMacroKey === 'gold_metals') {
    macroLabel = 'Gram Altın & Emtia';
    macroTargetPct = 20.0;
  } else if (targetMacroKey === 'bist_export') {
    macroLabel = 'BIST İhracatçı';
    macroTargetPct = 20.0;
  } else if (targetMacroKey === 'bist_domestic') {
    macroLabel = 'BIST İç Pazar';
    macroTargetPct = 5.0;
  } else if (targetMacroKey === 'cash_ppf') {
    macroLabel = 'PPF & Likit Nakit';
    macroTargetPct = 15.0;
  } else {
    macroKey = 'us_equities_etf';
    macroLabel = 'ABD Hisse & Global';
    macroTargetPct = 35.0;
  }

  let currentMacroValTRY = 0;
  activeHoldings.forEach(h => {
    if (getMacroAssetClass(h) === macroKey) {
      currentMacroValTRY += getHoldingValTRY(h);
    }
  });

  if (macroKey === 'gold_metals') {
    currentMacroValTRY += (Number(portfolioSummary?.totalGoldValTRY) || 0);
  } else if (macroKey === 'cash_ppf') {
    currentMacroValTRY += ((Number(portfolioSummary?.ppfBalanceTRY) || 0) + (Number(portfolioSummary?.totalFreeCashTRY) || 0));
  }

  const macroWeightPct = totalValTRY > 0 ? (currentMacroValTRY / totalValTRY) * 100 : 0;
  const isMacroBreached = macroWeightPct > (macroTargetPct + 3.0);

  // 6. Nihai Karar ve Uyarı Metinleri
  let status = 'APPROVED';
  let badgeText = '';
  let badgeColor = 'emerald';
  let badgeIcon = '🛡️';
  let title = '';
  let warningText = '';
  let recommendation = '';
  let actionAllowed = true;

  if (isSingleStockHardBreached) {
    status = 'HARD_CAP_BREACH';
    badgeColor = 'red';
    badgeIcon = '🚨';
    badgeText = `SERT TAVAN AŞIMI (%${singleStockWeightPct.toFixed(1)})`;
    title = `🚨 Tek Hisse Sert Tavanı Aşıldı (%${singleStockHardCap.toFixed(0)}+ Kurumsal Sınır)`;
    warningText = `Bu hisse tek başına portföyünüzün %${singleStockWeightPct.toFixed(1)}'ini kaplıyor. Kurumsal UCITS risk kuralına (%10 sert tavan) göre yeni alım yapmak risklidir; kâr alarak nakit/altın kalkanını beslemeniz önerilir.`;
    recommendation = 'KÂR REALİZASYONU YAPILMALI (YENİ ALIM KİLİTLİ)';
    actionAllowed = false;
  } else if (isSingleStockSoftBreached) {
    status = 'SOFT_CAP_BREACH';
    badgeColor = 'amber';
    badgeIcon = '⚖️';
    badgeText = `İDEAL TAVAN DOLU (%${singleStockWeightPct.toFixed(1)})`;
    title = `⚖️ Tek Hisse İdeal Tavanı Doldu (%${singleStockSoftCap.toFixed(1)}+ Sınırı)`;
    warningText = `Bu hisse mevcut portföyünüzün %${singleStockWeightPct.toFixed(1)}'ini oluşturuyor (%7.5 ideal tavan sınırında). Yeni lot eklemek hisse risk konsantrasyonunu aşırı artırır.`;
    recommendation = 'YENİ ALIM YAPMAYIN (MEVCUT POZİSYONU KORUYUN)';
    actionAllowed = false;
  } else if (isSectorBreached) {
    status = 'SECTOR_CAP_BREACH';
    badgeColor = 'red';
    badgeIcon = '⚠️';
    badgeText = `SEKTÖR TAVANI AŞILDI (%${sectorWeightPct.toFixed(1)} / %${sectorCap.toFixed(0)})`;
    title = `⚠️ Sektörel Risk Tavanı Aşıldı (%${sectorCap.toFixed(0)} Barajı)`;
    const otherTickers = sectorHoldingsList.filter(item => !isHoldingMatch(item, ticker)).map(i => i.ticker).join(', ');
    warningText = `${sector.name} sektörü portföyünüzde zaten %${sectorWeightPct.toFixed(1)} ağırlığa ulaştı (Tavan: %${sectorCap.toFixed(0)}). Hisse analizi 'GÜÇLÜ AL' olsa dahi, sektörel tavan aşıldığı için yeni alım yapmak portföyün risk dengesini bozar.${otherTickers ? ` Bu hisseye girmek istiyorsanız önce sektördeki diğer varlıklardan (${otherTickers}) kısmi kâr satışı yapıp yer açmalısınız.` : ''}`;
    recommendation = 'SEKTÖR KONSANTRASYON ENGELİ (ÖNCE YER AÇIN)';
    actionAllowed = false;
  } else if (isSectorNearCap) {
    status = 'SECTOR_NEAR_CAP';
    badgeColor = 'amber';
    badgeIcon = '⚖️';
    badgeText = `SEKTÖR TAVANA YAKIN (%${sectorWeightPct.toFixed(1)} / %${sectorCap.toFixed(0)})`;
    title = `⚖️ Sektör Tavanına Çok Yakın (Kalan Kapasite: %${sectorRemainingCapPct.toFixed(1)})`;
    warningText = `${sector.name} sektörü tavana çok yakın seviyede (%${sectorWeightPct.toFixed(1)} / %${sectorCap.toFixed(0)}). Yalnızca küçük sembolik eklemeler yapılabilir, yüklü alım tavanı deler.`;
    recommendation = 'KADEMELİ / KÜÇÜK LOT SINIRI';
    actionAllowed = true;
  } else if (isMacroBreached) {
    status = 'MACRO_OVERWEIGHT';
    badgeColor = 'amber';
    badgeIcon = '⚖️';
    badgeText = `VARLIK SINIFI DOLU (${macroLabel} %${macroWeightPct.toFixed(1)})`;
    title = `⚖️ Varlık Sınıfı Hedefin Üzerinde (${macroLabel})`;
    warningText = `${macroLabel} varlık sınıfı portföyde %${macroWeightPct.toFixed(1)} ile hedef ağırlığın (%${macroTargetPct.toFixed(0)}) üzerindedir. Yeni alım yapılacaksa portföyün nakit veya altın kalkanını tüketmemeye özen gösterilmelidir.`;
    recommendation = 'MAKRO DENGE UYARISI';
    actionAllowed = true;
  } else {
    status = 'APPROVED';
    badgeColor = 'emerald';
    badgeIcon = '🛡️';
    badgeText = `KOTA UYGUN (+%${sectorRemainingCapPct.toFixed(1)} Boşluk)`;
    title = `🟢 Portföy ve Sektör Kotası Uygun`;
    warningText = `Bu hisse portföy risk tavanlarına takılmamaktadır. ${sector.name} sektöründe %${sectorRemainingCapPct.toFixed(1)} boş kapasite mevcuttur. Tek hisse üst sınırı olan %${singleStockSoftCap}'e kadar güvenle pozisyon açılabilir.`;
    recommendation = 'GÜVENLE EKLENEBİLİR (KOTA MÜSAİT)';
    actionAllowed = true;
  }

  return {
    ticker,
    sector,
    sectorValTRY: currentSectorValTRY,
    sectorWeightPct,
    sectorCapPct: sectorCap,
    sectorDelta,
    sectorRemainingCapPct,
    sectorHoldingsList,
    isSectorBreached,
    isSectorNearCap,
    existingHolding,
    singleStockValTRY: existingHoldingValTRY,
    singleStockWeightPct,
    singleStockSoftCap,
    singleStockHardCap,
    isSingleStockHardBreached,
    isSingleStockSoftBreached,
    macroKey,
    macroLabel,
    macroWeightPct,
    macroTargetPct,
    isMacroBreached,
    status,
    level: isSingleStockHardBreached || isSectorBreached ? 'danger' : (isSingleStockSoftBreached || isSectorNearCap || isMacroBreached ? 'warning' : 'success'),
    badgeText,
    badgeColor,
    badgeIcon,
    title,
    warningText,
    recommendation,
    actionAllowed
  };
}

