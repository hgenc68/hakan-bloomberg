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
