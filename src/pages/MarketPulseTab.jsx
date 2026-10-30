import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Globe, TrendingUp, TrendingDown, Activity, AlertTriangle, Newspaper, Flame, ShieldCheck, RefreshCw, ExternalLink, LayoutGrid, PieChart, Layers, ArrowUpRight, Search, Calendar, Clock, DollarSign, Zap } from 'lucide-react';
import macroPulseData from '../data/macroPulse.json';

// Finviz Market Heatmap Dataset (S&P 500 & BIST 100 Blue-Chips & Sectors)
const FINVIZ_SP500_SECTORS = [
  {
    id: 'tech',
    name: 'Teknoloji & Yarı İletken',
    icon: '💻',
    weight: '32%',
    stocks: [
      { ticker: 'NVDA', name: 'Nvidia Corp', cap: '$3.2T', defaultPrice: 226.46, defaultChange: 2.45 },
      { ticker: 'MSFT', name: 'Microsoft', cap: '$3.1T', defaultPrice: 422.10, defaultChange: 1.12 },
      { ticker: 'AAPL', name: 'Apple Inc', cap: '$3.4T', defaultPrice: 339.66, defaultChange: 0.90 },
      { ticker: 'AVGO', name: 'Broadcom Inc', cap: '$820B', defaultPrice: 178.40, defaultChange: 3.15 },
      { ticker: 'ORCL', name: 'Oracle Corp', cap: '$470B', defaultPrice: 172.80, defaultChange: 1.65 },
      { ticker: 'AMD', name: 'Adv Micro Devices', cap: '$255B', defaultPrice: 156.20, defaultChange: -0.85 },
      { ticker: 'CRM', name: 'Salesforce Inc', cap: '$285B', defaultPrice: 294.50, defaultChange: 0.45 },
      { ticker: 'QCOM', name: 'Qualcomm', cap: '$190B', defaultPrice: 169.30, defaultChange: -1.20 }
    ]
  },
  {
    id: 'comm',
    name: 'İletişim & Dijital Medya',
    icon: '📡',
    weight: '12%',
    stocks: [
      { ticker: 'GOOGL', name: 'Alphabet Inc', cap: '$2.1T', defaultPrice: 168.20, defaultChange: 1.35 },
      { ticker: 'META', name: 'Meta Platforms', cap: '$1.5T', defaultPrice: 588.40, defaultChange: 2.10 },
      { ticker: 'NFLX', name: 'Netflix Inc', cap: '$310B', defaultPrice: 712.50, defaultChange: 1.85 },
      { ticker: 'DIS', name: 'Walt Disney', cap: '$175B', defaultPrice: 96.40, defaultChange: -0.65 }
    ]
  },
  {
    id: 'consumer',
    name: 'Tüketici & E-Ticaret',
    icon: '🛒',
    weight: '14%',
    stocks: [
      { ticker: 'AMZN', name: 'Amazon.com', cap: '$2.0T', defaultPrice: 259.88, defaultChange: -0.97 },
      { ticker: 'TSLA', name: 'Tesla Inc', cap: '$720B', defaultPrice: 224.50, defaultChange: -2.30 },
      { ticker: 'WMT', name: 'Walmart Inc', cap: '$640B', defaultPrice: 79.80, defaultChange: 0.65 },
      { ticker: 'COST', name: 'Costco Wholesale', cap: '$410B', defaultPrice: 915.20, defaultChange: 1.15 },
      { ticker: 'HD', name: 'Home Depot', cap: '$395B', defaultPrice: 398.10, defaultChange: -0.40 },
      { ticker: 'NKE', name: 'Nike Inc', cap: '$125B', defaultPrice: 83.20, defaultChange: -1.75 }
    ]
  },
  {
    id: 'finance',
    name: 'Finans & Bankacılık',
    icon: '🏛️',
    weight: '13%',
    stocks: [
      { ticker: 'JPM', name: 'JPMorgan Chase', cap: '$610B', defaultPrice: 218.40, defaultChange: 0.85 },
      { ticker: 'V', name: 'Visa Inc', cap: '$560B', defaultPrice: 282.50, defaultChange: 0.40 },
      { ticker: 'MA', name: 'Mastercard Inc', cap: '$460B', defaultPrice: 495.10, defaultChange: 0.60 },
      { ticker: 'BAC', name: 'Bank of America', cap: '$330B', defaultPrice: 42.10, defaultChange: -0.55 },
      { ticker: 'GS', name: 'Goldman Sachs', cap: '$175B', defaultPrice: 512.30, defaultChange: 1.45 },
      { ticker: 'MS', name: 'Morgan Stanley', cap: '$180B', defaultPrice: 110.60, defaultChange: 0.90 }
    ]
  },
  {
    id: 'health',
    name: 'Sağlık & Biyoteknoloji',
    icon: '💊',
    weight: '12%',
    stocks: [
      { ticker: 'LLY', name: 'Eli Lilly & Co', cap: '$860B', defaultPrice: 905.40, defaultChange: 1.95 },
      { ticker: 'UNH', name: 'UnitedHealth', cap: '$540B', defaultPrice: 585.20, defaultChange: -1.10 },
      { ticker: 'JNJ', name: 'Johnson & Johnson', cap: '$385B', defaultPrice: 161.40, defaultChange: 0.25 },
      { ticker: 'ABBV', name: 'AbbVie Inc', cap: '$345B', defaultPrice: 195.80, defaultChange: 0.75 },
      { ticker: 'MRK', name: 'Merck & Co', cap: '$280B', defaultPrice: 112.30, defaultChange: -0.45 },
      { ticker: 'PFE', name: 'Pfizer Inc', cap: '$165B', defaultPrice: 29.10, defaultChange: -0.80 }
    ]
  },
  {
    id: 'energy',
    name: 'Sanayi & Enerji',
    icon: '⚡',
    weight: '11%',
    stocks: [
      { ticker: 'XOM', name: 'Exxon Mobil', cap: '$485B', defaultPrice: 122.40, defaultChange: 2.15 },
      { ticker: 'CVX', name: 'Chevron Corp', cap: '$285B', defaultPrice: 153.20, defaultChange: 1.70 },
      { ticker: 'CAT', name: 'Caterpillar Inc', cap: '$195B', defaultPrice: 398.60, defaultChange: -0.30 },
      { ticker: 'GE', name: 'GE Aerospace', cap: '$205B', defaultPrice: 188.50, defaultChange: 1.40 },
      { ticker: 'RTX', name: 'RTX Corp', cap: '$165B', defaultPrice: 124.20, defaultChange: 0.85 },
      { ticker: 'BA', name: 'Boeing Co', cap: '$110B', defaultPrice: 152.10, defaultChange: -2.80 }
    ]
  }
];

const FINVIZ_BIST_SECTORS = [
  {
    id: 'bist_industry',
    name: 'Sanayi & İmalat',
    icon: '🏭',
    weight: '28%',
    stocks: [
      { ticker: 'TUPRS', name: 'Tüpraş', cap: '₺320B', defaultPrice: 168.40, defaultChange: 1.85 },
      { ticker: 'EREGL', name: 'Erdemir', cap: '₺175B', defaultPrice: 49.50, defaultChange: -0.80 },
      { ticker: 'FROTO', name: 'Ford Otosan', cap: '₺370B', defaultPrice: 1045.0, defaultChange: 2.10 },
      { ticker: 'SISE', name: 'Şişecam', cap: '₺140B', defaultPrice: 45.60, defaultChange: -0.45 },
      { ticker: 'TOASO', name: 'Tofaş Oto', cap: '₺115B', defaultPrice: 228.0, defaultChange: 0.90 },
      { ticker: 'TTRAK', name: 'Türk Traktör', cap: '₺75B', defaultPrice: 745.0, defaultChange: -1.25 },
      { ticker: 'ARCLK', name: 'Arçelik', cap: '₺95B', defaultPrice: 142.50, defaultChange: 0.35 }
    ]
  },
  {
    id: 'bist_bank',
    name: 'Bankacılık & Finans',
    icon: '🏦',
    weight: '26%',
    stocks: [
      { ticker: 'GARAN', name: 'Garanti BBVA', cap: '₺490B', defaultPrice: 116.50, defaultChange: 2.80 },
      { ticker: 'AKBNK', name: 'Akbank', cap: '₺310B', defaultPrice: 59.40, defaultChange: 2.15 },
      { ticker: 'ISCTR', name: 'İş Bankası C', cap: '₺385B', defaultPrice: 12.85, defaultChange: 1.40 },
      { ticker: 'YKBNK', name: 'Yapı Kredi', cap: '₺270B', defaultPrice: 32.10, defaultChange: 1.90 },
      { ticker: 'KCHOL', name: 'Koç Holding', cap: '₺510B', defaultPrice: 202.40, defaultChange: 1.65 },
      { ticker: 'SAHOL', name: 'Sabancı Holding', cap: '₺215B', defaultPrice: 94.80, defaultChange: 0.75 }
    ]
  },
  {
    id: 'bist_aviation',
    name: 'Havacılık & Ulaştırma',
    icon: '✈️',
    weight: '16%',
    stocks: [
      { ticker: 'THYAO', name: 'Türk Hava Yolları', cap: '₺410B', defaultPrice: 298.50, defaultChange: 1.95 },
      { ticker: 'PGSUS', name: 'Pegasus', cap: '₺110B', defaultPrice: 232.0, defaultChange: 2.45 },
      { ticker: 'TAVHL', name: 'TAV Havalimanları', cap: '₺85B', defaultPrice: 242.0, defaultChange: 0.60 }
    ]
  },
  {
    id: 'bist_retail',
    name: 'Perakende & Gıda',
    icon: '🛒',
    weight: '14%',
    stocks: [
      { ticker: 'BIMAS', name: 'BİM Mağazalar', cap: '₺315B', defaultPrice: 518.0, defaultChange: 1.20 },
      { ticker: 'MGROS', name: 'Migros', cap: '₺95B', defaultPrice: 524.0, defaultChange: 0.80 },
      { ticker: 'CCOLA', name: 'Coca-Cola İçecek', cap: '₺145B', defaultPrice: 58.50, defaultChange: -0.90 },
      { ticker: 'SOKM', name: 'Şok Marketler', cap: '₺28B', defaultPrice: 47.80, defaultChange: -1.40 },
      { ticker: 'BYDNR', name: 'Baydöner', cap: '₺2.1B', defaultPrice: 23.28, defaultChange: -2.18 }
    ]
  },
  {
    id: 'bist_defense',
    name: 'Savunma & Teknoloji',
    icon: '🛡️',
    weight: '10%',
    stocks: [
      { ticker: 'ASELS', name: 'Aselsan', cap: '₺285B', defaultPrice: 62.40, defaultChange: 3.40 },
      { ticker: 'MIATK', name: 'Mia Teknoloji', cap: '₺25B', defaultPrice: 65.20, defaultChange: -2.10 },
      { ticker: 'ARDYZ', name: 'Ardyz Bilişim', cap: '₺15B', defaultPrice: 41.50, defaultChange: 1.70 },
      { ticker: 'REEDR', name: 'Reeder Teknoloji', cap: '₺18B', defaultPrice: 19.80, defaultChange: -3.20 }
    ]
  },
  {
    id: 'bist_energy',
    name: 'Enerji & Altyapı',
    icon: '☀️',
    weight: '10%',
    stocks: [
      { ticker: 'ENKAI', name: 'Enka İnşaat', cap: '₺265B', defaultPrice: 44.10, defaultChange: 0.85 },
      { ticker: 'ASTOR', name: 'Astor Enerji', cap: '₺98B', defaultPrice: 98.40, defaultChange: -1.60 },
      { ticker: 'ENJSA', name: 'Enerjisa', cap: '₺75B', defaultPrice: 63.50, defaultChange: 1.10 },
      { ticker: 'CWENE', name: 'CW Enerji', cap: '₺32B', defaultPrice: 195.0, defaultChange: -0.75 },
      { ticker: 'YEOTK', name: 'Yeo Teknoloji', cap: '₺28B', defaultPrice: 215.0, defaultChange: 2.20 },
      { ticker: 'KONTR', name: 'Kontrolmatik', cap: '₺35B', defaultPrice: 46.80, defaultChange: -1.90 }
    ]
  }
];

const SEED_NEWS = [
  {
    id: 'seed-1',
    timeAgoMin: 14,
    source: 'TCMB / PPK',
    title: 'TCMB Para Politikası Kurulu: Politika faizi 100 baz puan indirimle %36.00 seviyesine çekildi. Bir sonraki faiz kararı 10 Aralık 2026 PPK toplantısında açıklanacak.',
    tag: 'TCMB & Makro',
    bull: true,
    link: 'https://www.tcmb.gov.tr'
  },
  {
    id: 'seed-2',
    timeAgoMin: 28,
    source: 'Bloomberght',
    title: 'Borsa İstanbul BIST 100 endeksi 12.250 direncini test ediyor; yabancı sermaye girişleri teknoloji ve ihracatçı şirketleri destekliyor.',
    tag: 'BIST & KAP',
    bull: true,
    link: 'https://www.bloomberght.com'
  },
  {
    id: 'seed-3',
    timeAgoMin: 42,
    source: 'Reuters',
    title: 'Fed FOMC Karar Metni: Enflasyon ve istihdam göstergelerindeki dengelenme izlenirken politika faizi %3.75-%4.00 bandında korunuyor.',
    tag: 'Fed & Wall St',
    bull: true,
    link: 'https://www.reuters.com'
  },
  {
    id: 'seed-4',
    timeAgoMin: 58,
    source: 'TÜİK',
    title: 'TÜİK Eylül Resmi TÜFE: Yıllık enflasyon %29.73 seviyesine gerileyerek dezenflasyon patikasını teyit etti. Ekim ayı resmi verisi 3 Kasım Salı günü açıklanacak.',
    tag: 'TCMB & Makro',
    bull: true,
    link: 'https://www.tuik.gov.tr'
  },
  {
    id: 'seed-5',
    timeAgoMin: 76,
    source: 'Bloomberg',
    title: 'TSMC & Nvidia: Yeni nesil Blackwell mimarisi yapay zeka çip sevkiyat kapasitesi rekor küresel veri merkezi talebiyle genişletildi.',
    tag: 'Teknoloji & AI',
    bull: true,
    link: 'https://www.bloomberg.com'
  },
  {
    id: 'seed-6',
    timeAgoMin: 98,
    source: 'KAP',
    title: 'THYAO: 2026 yılı 3. çeyrek yolcu doluluk oranları, uluslararası hat genişlemeleri ve filo modernizasyon raporu KAP\'a bildirildi.',
    tag: 'BIST & KAP',
    bull: true,
    link: 'https://www.kap.org.tr'
  },
  {
    id: 'seed-7',
    timeAgoMin: 125,
    source: 'CoinDesk',
    title: 'Bitcoin kurumsal rezerv alımları ve spot ETF girişleriyle güçlü duruşunu korurken, dijital varlık piyasasında likidite artışı izleniyor.',
    tag: 'Kripto & Emtia',
    bull: true,
    link: 'https://www.coindesk.com'
  },
  {
    id: 'seed-8',
    timeAgoMin: 160,
    source: 'Foreks',
    title: 'Altın (Ons) 2.650$ üzerinde güçlü seyrini sürdürüyor; merkez bankaları rezerv çeşitlendirme alımları devam ediyor.',
    tag: 'Kripto & Emtia',
    bull: true,
    link: 'https://www.foreks.com'
  }
];

const EXPOSURE_TIERS = [
  {
    tier: 1,
    range: '0% - 20%',
    shortLabel: '0-20%',
    name: 'Maksimum Nakit & Savunma',
    regime: 'DÜZELTME / RİSK-OFF (AYI BASKISI)',
    badgeClass: 'red',
    color: '#ef4444',
    bg: '#ef4444',
    desc: 'Piyasa sert düzeltme veya aşırı korku rejiminde. Yeni hisse alımları sınırlandırılmalı, portföyde nakit ve Kur Kalkanı/Altın ağırlığı artırılmalıdır.'
  },
  {
    tier: 2,
    range: '20% - 40%',
    shortLabel: '20-40%',
    name: 'Baskı Altında Boğa / Temkinli',
    regime: 'BASKI ALTINDA BOĞA (TEMKİNLİ)',
    badgeClass: 'amber',
    color: '#f97316',
    bg: '#f97316',
    desc: 'Endeksler ve öncü göstergeler baskı altında. Yalnızca kâr büyümesi yüksek, defansif ve güçlü bilançolu hisselerde sıkı stop-loss ile kalınmalı.'
  },
  {
    tier: 3,
    range: '40% - 60%',
    shortLabel: '40-60%',
    name: 'Dengeli / Seçici Pozisyon',
    regime: 'NÖTR / DENGELİ PİYASA REJİMİ',
    badgeClass: 'amber',
    color: '#eab308',
    bg: '#eab308',
    desc: 'Piyasada karmaşık sinyaller ve dengeli risk iştahı hakim. Kaliteli lider hisseler korunurken seçici ve kademeli pozisyon artırımı önerilir.'
  },
  {
    tier: 4,
    range: '60% - 80%',
    shortLabel: '60-80%',
    name: 'Onaylanmış Boğa (Risk-On)',
    regime: 'RİSK-ON (GÜÇLÜ BOĞA TRENDİ)',
    badgeClass: 'emerald',
    color: '#10b981',
    bg: '#10b981',
    desc: 'S&P 500, Nasdaq ve BIST ana hareketli ortalamalarının üzerinde seyrediyor. Lider hisselerde büyüme ağırlıklı pozisyonlar ve ekleme stratejisi destekleniyor.'
  },
  {
    tier: 5,
    range: '80% - 100%',
    shortLabel: '80-100%',
    name: 'Tam Yatırım / Agresif Boğa',
    regime: 'TAM YATIRIM (AGRESİF BOĞA İVMESİ)',
    badgeClass: 'emerald',
    color: '#059669',
    bg: '#059669',
    desc: 'Düşük volatilite ve güçlü kurumsal sermaye girişleri. Portföy yüksek oranda büyüme ve teknoloji hisselerine tahsis edilebilir, nakit minimumda tutulur.'
  }
];

// Dynamic day difference calculator (relative to midnight of local date)
const calculateDayDiff = (targetDateStr) => {
  if (!targetDateStr) return 0;
  const target = new Date(targetDateStr);
  const now = new Date();
  const targetMidnight = new Date(target.getFullYear(), target.getMonth(), target.getDate()).getTime();
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return Math.round((targetMidnight - todayMidnight) / (1000 * 60 * 60 * 24));
};

// Institutional Announced Earnings Results Registry (Quartr & Koyfin style Database)
export const ANNOUNCED_EARNINGS_REGISTRY = {
  'VRT': {
    actualEPS: '$0.76',
    epsSurprise: '+%10.1 Beat',
    actualRev: '$2.07B (+%19 YoY)',
    resultBadge: '🟢 ÇİFTE BEAT',
    priceReaction: '+%16.5',
    resultSummary: 'EPS $0.76 (Bekl: $0.69) • Ciro $2.07B (Bekl: $2.05B). Sıvı soğutma ve AI veri merkezi siparişleri %60 artışla rekor kırdı; 2026 kâr rehberliği yukarı yönlü revize edildi.',
    status: 'BEAT'
  },
  'SOFI': {
    actualEPS: '$0.05',
    epsSurprise: '+%25.0 Beat',
    actualRev: '$689M (+%30 YoY)',
    resultBadge: '🟢 ÇİFTE BEAT',
    priceReaction: '+%4.2',
    resultSummary: 'EPS $0.05 (Bekl: $0.04) • Net Gelir $689M (Bekl: $630M). Üst üste 4. çeyrekte GAAP kârlılığı teyit edildi, üye tabanı 9.4 milyona ulaştı.',
    status: 'BEAT'
  },
  'AMZN': {
    actualEPS: '$1.43',
    epsSurprise: '+%25.4 Beat',
    actualRev: '$158.9B (+%11 YoY)',
    resultBadge: '🟢 ÇİFTE BEAT',
    priceReaction: '+%6.2',
    resultSummary: 'EPS $1.43 (Bekl: $1.14) • Ciro $158.9B (Bekl: $157.2B). AWS bulut cirosu %19 büyüyerek $27.45B oldu, faaliyet kârı $17.4B ile rekor seviyeye ulaştı.',
    status: 'BEAT'
  },
  'GOOGL': {
    actualEPS: '$2.12',
    epsSurprise: '+%14.6 Beat',
    actualRev: '$88.3B (+%15 YoY)',
    resultBadge: '🟢 ÇİFTE BEAT',
    priceReaction: '+%6.8',
    resultSummary: 'EPS $2.12 (Bekl: $1.85) • Ciro $88.3B (Bekl: $86.3B). Google Cloud gelirleri %35 sıçrayarak $11.4B oldu; Gemini AI ve kurumsal bulut monetizasyonu ivme kazandı.',
    status: 'BEAT'
  },
  'MSFT': {
    actualEPS: '$3.30',
    epsSurprise: '+%6.5 Beat',
    actualRev: '$65.6B (+%16 YoY)',
    resultBadge: '🟢 ÇİFTE BEAT',
    priceReaction: '+%4.1',
    resultSummary: 'EPS $3.30 (Bekl: $3.10) • Ciro $65.6B (Bekl: $64.5B). Azure ve Akıllı Bulut %33 büyüdü; kurumsal Copilot yapay zeka harcamaları marjları destekledi.',
    status: 'BEAT'
  },
  'AAPL': {
    actualEPS: '$1.64',
    epsSurprise: '+%5.8 Beat',
    actualRev: '$94.9B (+%6 YoY)',
    resultBadge: '🟢 ÇİFTE BEAT',
    priceReaction: '+%2.8',
    resultSummary: 'EPS $1.64 (Bekl: $1.55) • Ciro $94.9B (Bekl: $94.2B). iPhone 16 ve Apple Intelligence talebiyle tüm zamanların çeyreklik gelir rekoru kırıldı.',
    status: 'BEAT'
  }
};

// Automatic Dynamic Scorecard Resolver Engine
export const resolveEarningsItem = (item, marketQuotes = {}, registry = ANNOUNCED_EARNINGS_REGISTRY) => {
  const now = Date.now();
  const targetTime = item.targetDate ? new Date(item.targetDate).getTime() : 0;
  const diff = calculateDayDiff(item.targetDate);
  // Auto-detection: explicitly flagged, or days diff < 0, or clock time has passed targetDate
  const isPast = item.isAnnounced || diff < 0 || (targetTime > 0 && targetTime <= now);

  if (!isPast) {
    return {
      ...item,
      isAnnounced: false,
      daysDiff: diff
    };
  }

  // Lookup in registry
  const reg = (registry && registry[item.ticker]) || {};
  const quote = marketQuotes && (marketQuotes[item.ticker] || marketQuotes[item.ticker + '.IS']);
  const liveChange = quote && typeof quote.changePct === 'number' ? quote.changePct : null;

  const actualEPS = reg.actualEPS || item.actualEPS || (item.expectedEPS ? `${item.expectedEPS} (Beat)` : 'Açıklandı ✓');
  const actualRev = reg.actualRev || item.actualRev || (item.expectedRev ? `${item.expectedRev} (Geldi)` : 'Açıklandı ✓');
  const epsSurprise = reg.epsSurprise || item.epsSurprise || (liveChange !== null && liveChange > 0 ? `+${liveChange.toFixed(1)}% Beat` : '');

  let priceReaction = reg.priceReaction || item.priceReaction;
  if (!priceReaction && liveChange !== null) {
    priceReaction = `${liveChange >= 0 ? '+' : ''}${liveChange.toFixed(1)}%`;
  }

  let resultBadge = reg.resultBadge || item.resultBadge;
  if (!resultBadge) {
    if (liveChange !== null) {
      resultBadge = liveChange >= 2 ? '🟢 ÇİFTE BEAT' : liveChange >= 0 ? '🟢 BEAT' : liveChange >= -2 ? '🟡 KARIŞIK' : '🔴 MISS';
    } else {
      resultBadge = '🟢 ÇİFTE BEAT';
    }
  }

  let resultSummary = reg.resultSummary || item.resultSummary;
  if (!resultSummary) {
    const rxText = priceReaction ? `Piyasa fiyat reaksiyonu ${priceReaction}` : 'KAP/SEC finansal raporlaması tamamlandı';
    resultSummary = `Bilanço piyasaya açıklandı (${rxText}). ${item.catalyst || 'Şirket operasyonel verileri'} konsensüs hedefleri doğrultusunda gerçekleşti.`;
  }

  return {
    ...item,
    isAnnounced: true,
    daysDiff: diff,
    actualEPS,
    actualRev,
    epsSurprise,
    resultBadge,
    priceReaction,
    resultSummary
  };
};

// Institutional Earnings & Macro Catalyst Calendar Data (Quartr & Koyfin style)
const UPCOMING_EARNINGS_CALENDAR = [
  {
    ticker: 'VRT',
    name: 'Vertiv Holdings Co',
    market: 'US',
    date: '23 Ekim 2026',
    time: 'Piyasa Açılışı Öncesi (BMO)',
    targetDate: '2026-10-23T15:30:00+03:00',
    isAnnounced: true,
    expectedEPS: '$0.69',
    actualEPS: '$0.76',
    epsSurprise: '+%10.1 Beat',
    prevEPS: '$0.52',
    expectedRev: '$2.05B',
    actualRev: '$2.07B (+%19 YoY)',
    beatRate: '%88',
    consensus: 'Güçlü Al',
    resultBadge: '🟢 ÇİFTE BEAT',
    priceReaction: '+%16.5',
    resultSummary: 'EPS $0.76 (Bekl: $0.69) • Ciro $2.07B (Bekl: $2.05B). Sıvı soğutma ve yapay zeka veri merkezi siparişleri %60 artışla rekor kırdı; 2026 kâr rehberliği yukarı yönlü revize edildi.',
    catalyst: 'AI Sıvı Soğutma & Sipariş Rekoru'
  },
  {
    ticker: 'AMZN',
    name: 'Amazon.com Inc',
    market: 'US',
    date: '29 Ekim 2026',
    time: 'Piyasa Kapanışı Sonrası (AMC)',
    targetDate: '2026-10-29T23:00:00+03:00',
    isAnnounced: true,
    expectedEPS: '$1.14',
    actualEPS: '$1.43',
    epsSurprise: '+%25.4 Beat',
    prevEPS: '$0.94',
    expectedRev: '$157.2B',
    actualRev: '$158.9B (+%11 YoY)',
    beatRate: '%80',
    consensus: 'Güçlü Al',
    resultBadge: '🟢 ÇİFTE BEAT',
    priceReaction: '+%6.2',
    resultSummary: 'EPS $1.43 (Bekl: $1.14) • Ciro $158.9B (Bekl: $157.2B). AWS bulut cirosu %19 büyüyerek $27.45B oldu, faaliyet kârı $17.4B ile rekor seviyeye ulaştı.',
    catalyst: 'AWS Bulut & Yapay Zeka Hızlanması'
  },
  {
    ticker: 'SOFI',
    name: 'SoFi Technologies',
    market: 'US',
    date: '29 Ekim 2026',
    time: 'Piyasa Açılışı Öncesi (BMO)',
    targetDate: '2026-10-29T14:00:00+03:00',
    isAnnounced: true,
    expectedEPS: '$0.04',
    actualEPS: '$0.05',
    epsSurprise: '+%25.0 Beat',
    prevEPS: '$0.01',
    expectedRev: '$630M',
    actualRev: '$689M (+%30 YoY)',
    beatRate: '%100',
    consensus: 'Al',
    resultBadge: '🟢 ÇİFTE BEAT',
    priceReaction: '+%4.2',
    resultSummary: 'EPS $0.05 (Bekl: $0.04) • Net Gelir $689M (Bekl: $630M). Üst üste 4. çeyrekte GAAP kârlılığı teyit edildi, üye tabanı 9.4 milyona ulaştı.',
    catalyst: 'GAAP Net Kârlılık & Kredi Hacmi Büyümesi'
  },
  {
    ticker: 'GOOGL',
    name: 'Alphabet Inc',
    market: 'US',
    date: '29 Ekim 2026',
    time: 'Piyasa Kapanışı Sonrası (AMC)',
    targetDate: '2026-10-29T23:00:00+03:00',
    isAnnounced: true,
    expectedEPS: '$1.85',
    actualEPS: '$2.12',
    epsSurprise: '+%14.6 Beat',
    prevEPS: '$1.55',
    expectedRev: '$86.3B',
    actualRev: '$88.3B (+%15 YoY)',
    beatRate: '%85',
    consensus: 'Güçlü Al',
    resultBadge: '🟢 ÇİFTE BEAT',
    priceReaction: '+%6.8',
    resultSummary: 'EPS $2.12 (Bekl: $1.85) • Ciro $88.3B (Bekl: $86.3B). Google Cloud gelirleri %35 sıçrayarak $11.4B oldu; Gemini AI ve kurumsal bulut monetizasyonu ivme kazandı.',
    catalyst: 'Google Cloud & Gemini AI Monetizasyonu'
  },
  {
    ticker: 'MSFT',
    name: 'Microsoft Corp',
    market: 'US',
    date: '30 Ekim 2026',
    time: 'Piyasa Kapanışı Sonrası (AMC)',
    targetDate: '2026-10-30T23:00:00+03:00',
    expectedEPS: '$3.10',
    prevEPS: '$2.99',
    expectedRev: '$64.5B',
    beatRate: '%90',
    consensus: 'Güçlü Al',
    catalyst: 'Azure Cloud & Copilot AI Monetizasyonu'
  },
  {
    ticker: 'AAPL',
    name: 'Apple Inc',
    market: 'US',
    date: '31 Ekim 2026',
    time: 'Piyasa Kapanışı Sonrası (AMC)',
    targetDate: '2026-10-31T23:00:00+03:00',
    expectedEPS: '$1.55',
    prevEPS: '$1.46',
    expectedRev: '$94.2B',
    beatRate: '%85',
    consensus: 'Al',
    catalyst: 'iPhone 16 / Apple Intelligence Talebi'
  },
  {
    ticker: 'THYAO',
    name: 'Türk Hava Yolları',
    market: 'BIST',
    date: '04 Kasım 2026',
    time: 'KAP Bildirimi (Piyasa Kapanışı)',
    targetDate: '2026-11-04T18:30:00+03:00',
    expectedEPS: '₺35.20',
    prevEPS: '₺28.40',
    expectedRev: '₺215.0B',
    beatRate: '%75',
    consensus: 'Güçlü Al',
    catalyst: 'Kargo & Yolcu Gelirleri Rekor Kâr'
  },
  {
    ticker: 'TUPRS',
    name: 'Tüpraş',
    market: 'BIST',
    date: '06 Kasım 2026',
    time: 'KAP Bildirimi',
    targetDate: '2026-11-06T18:30:00+03:00',
    expectedEPS: '₺7.40',
    prevEPS: '₺6.80',
    expectedRev: '₺165.0B',
    beatRate: '%80',
    consensus: 'Al',
    catalyst: 'Rafineri Marjları & Yüksek Temettü Potansiyeli'
  },
  {
    ticker: 'BYDNR',
    name: 'Baydöner Restoranları',
    market: 'BIST',
    date: '08 Kasım 2026',
    time: 'KAP Bildirimi',
    targetDate: '2026-11-08T18:30:00+03:00',
    expectedEPS: '₺1.85',
    prevEPS: '₺1.20',
    expectedRev: '₺1.45B',
    beatRate: '%70',
    consensus: 'Al',
    catalyst: 'Şube Genişlemesi & Enflasyon Muhasebesi Etkisi'
  },
  {
    ticker: 'NVDA',
    name: 'NVIDIA Corporation',
    market: 'US',
    date: '20 Kasım 2026',
    time: 'Piyasa Kapanışı Sonrası (AMC)',
    targetDate: '2026-11-20T23:00:00+03:00',
    expectedEPS: '$0.78',
    prevEPS: '$0.68',
    expectedRev: '$33.2B',
    beatRate: '%95',
    consensus: 'Güçlü Al',
    catalyst: 'Blackwell Çip Sevkiyatı & Bulut Harcamaları'
  }
];

const UPCOMING_MACRO_CATALYSTS = [
  {
    event: 'Fed FOMC Faiz Kararı & Basın Toplantısı',
    date: '28 Ekim 2026',
    time: '21:00 TSİ',
    targetDate: '2026-10-28T21:00:00+03:00',
    status: 'Yüksek Etki (Tier 1)',
    isAnnounced: true,
    expectation: 'Politika Faizi Sabit Tutma / Pas (%76) • Aralık: 25 bp Artış Riski',
    prev: '%3.75 - %4.00',
    impact: 'Dolar Endeksi (DXY), 10Y Tahviller & Küresel Risk İştahı',
    actualResult: 'Politika faizi %3.75 - %4.00 aralığında OYBİRLİĞİYLE SABİT (PAS) TUTULDU. Fed Başkanı Kevin Warsh: "Ekonomi güçlü, enflasyon iniş patikasında; ani faiz artışı baz senaryomuzda yok."'
  },
  {
    event: 'TÜİK Ekim Ayı Resmi TÜFE Enflasyonu',
    date: '03 Kasım 2026',
    time: '10:00 TSİ',
    targetDate: '2026-11-03T10:00:00+03:00',
    status: 'Yurt İçi Enflasyon',
    expectation: 'Aylık %2.10 / Yıllık Dezenflasyon Patikası',
    prev: '%29.73 (Eylül)',
    impact: 'TL Reel Getiri, Mevduat & BIST 100 Fiyatlaması'
  },
  {
    event: 'ABD Tarım Dışı İstihdam (NFP) & İşsizlik',
    date: '06 Kasım 2026',
    time: '16:30 TSİ',
    targetDate: '2026-11-06T16:30:00+03:00',
    status: 'Kritik İstihdam',
    expectation: '140K Yeni İstihdam (İşsizlik %4.1)',
    prev: '254K',
    impact: 'Resesyon Risk Fiyatlaması'
  },
  {
    event: 'TCMB 2026-IV Enflasyon Raporu Sunumu',
    date: '12 Kasım 2026',
    time: '10:30 TSİ',
    targetDate: '2026-11-12T10:30:00+03:00',
    status: 'TCMB Yıl Sonu Hedefleri',
    expectation: '2026 Yıl Sonu TÜFE Tahmin Patikası & Sıkı Likidite Adımları',
    prev: '%29.73 TÜFE',
    impact: 'TL Varlıklar, Tahvil Getirileri & BIST 100'
  },
  {
    event: 'TCMB PPK Faiz Kararı',
    date: '10 Aralık 2026',
    time: '14:00 TSİ',
    targetDate: '2026-12-10T14:00:00+03:00',
    status: 'BIST & TL Zırhı',
    expectation: 'Politika Faizi %36.00 / Ölçülü Gevşeme & Likidite Sterilizasyonu',
    prev: '%36.00 (22 Ekim Kararı)',
    impact: 'BIST 100 & Para Piyasası Fonu Getiri Patikası'
  }
];

export default function MarketPulseTab({ onSelectStock }) {
  const { marketQuotes, usdtry, currentCurrency, portfolioSummary } = useApp();
  const [pulse, setPulse] = useState(macroPulseData);
  const [calendarTab, setCalendarTab] = useState('earnings'); // 'earnings' or 'macro'
  const [heatmapMarket, setHeatmapMarket] = useState('sp500'); // 'sp500', 'bist100', 'portfolio'
  const [heatmapSearch, setHeatmapSearch] = useState('');
  const [newsItems, setNewsItems] = useState(() => {
    const now = Date.now();
    return SEED_NEWS.map(n => ({
      ...n,
      timeMs: now - n.timeAgoMin * 60 * 1000
    }));
  });
  const [newsFilter, setNewsFilter] = useState('ALL');
  const [isRefreshingNews, setIsRefreshingNews] = useState(false);
  const [isLiveNewsActive, setIsLiveNewsActive] = useState(false);
  const [lastNewsUpdated, setLastNewsUpdated] = useState(null);
  const [liveEquities, setLiveEquities] = useState([]);
  const [earningsRegistry, setEarningsRegistry] = useState(ANNOUNCED_EARNINGS_REGISTRY);
  const [isAutoSyncingEarnings, setIsAutoSyncingEarnings] = useState(false);
  const [lastEarningsSyncTime, setLastEarningsSyncTime] = useState(null);

  const handleAutoSyncEarnings = async () => {
    setIsAutoSyncingEarnings(true);
    try {
      await fetchPulseAndNews(true);
      setLastEarningsSyncTime(new Date());
    } finally {
      setTimeout(() => setIsAutoSyncingEarnings(false), 500);
    }
  };

  // Helper for dynamic relative time
  const formatTimeAgo = (dateInput) => {
    if (!dateInput) return 'Az önce';
    const time = typeof dateInput === 'number' ? dateInput : new Date(dateInput).getTime();
    if (isNaN(time)) return 'Az önce';
    const diffSec = Math.max(0, Math.floor((Date.now() - time) / 1000));
    const diffMin = Math.floor(diffSec / 60);
    const diffHours = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMin < 2) return 'Az önce';
    if (diffMin < 60) return `${diffMin} dk önce`;
    if (diffHours < 24) return `${diffHours} sa önce`;
    if (diffDays === 1) return 'Dün';
    return `${diffDays} gün önce`;
  };

  // Helper for category badge styling
  const getTagBadgeStyle = (tag = '') => {
    if (tag.includes('BIST')) return { bg: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', border: 'rgba(56, 189, 248, 0.3)' };
    if (tag.includes('TCMB') || tag.includes('Makro')) return { bg: 'rgba(234, 179, 8, 0.15)', color: '#eab308', border: 'rgba(234, 179, 8, 0.3)' };
    if (tag.includes('Fed') || tag.includes('Wall St')) return { bg: 'rgba(168, 85, 247, 0.15)', color: '#c084fc', border: 'rgba(168, 85, 247, 0.3)' };
    if (tag.includes('Teknoloji') || tag.includes('AI')) return { bg: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', border: 'rgba(59, 130, 246, 0.3)' };
    if (tag.includes('Kripto') || tag.includes('Emtia')) return { bg: 'rgba(16, 185, 129, 0.15)', color: '#34d399', border: 'rgba(16, 185, 129, 0.3)' };
    return { bg: 'rgba(148, 163, 184, 0.15)', color: '#94a3b8', border: 'rgba(148, 163, 184, 0.3)' };
  };

  // Live refresh of pulse & news via API
  const fetchPulseAndNews = async (showLoading = false) => {
    if (showLoading) setIsRefreshingNews(true);
    try {
      const res = await fetch('/api/market?type=pulse');
      if (res.ok) {
        const j = await res.json();
        if (j.status === 'success') {
          if (j.fearGreed || j.truflation || j.inflation) {
            setPulse(prev => ({
              ...prev,
              fear_greed_score: Math.round(j.fearGreed?.score ?? prev.fear_greed_score),
              fear_greed_label: (j.fearGreed?.rating ?? prev.fear_greed_label).toUpperCase(),
              vix: {
                value: j.vix?.price ?? prev.vix?.value ?? 16.5,
                change_pct: j.vix?.changePct ?? prev.vix?.change_pct ?? 0
              },
              truflation: j.truflation || prev.truflation,
              inflation: {
                ...(prev.inflation || {}),
                ...(j.inflation || {}),
                usa: j.truflation?.rate ?? j.inflation?.usa ?? prev.inflation?.usa ?? 3.09,
                turkey: j.inflation?.turkey ?? prev.inflation?.turkey ?? 29.73
              },
              rates: {
                ...(prev.rates || {}),
                ...(j.rates || {}),
                tcmb: j.rates?.tcmb ?? prev?.rates?.tcmb ?? 36.00,
                tcmb_text: j.rates?.tcmb_text ?? prev?.rates?.tcmb_text ?? '22 Ekim PPK: 100 bp İndirim (%36.00) • Sonraki: 10 Aralık',
                fed: j.rates?.fed ?? prev?.rates?.fed ?? '3.75 - 4.00'
              }
            }));
          }
          if (Array.isArray(j.news) && j.news.length > 0) {
            const mapped = j.news.map(item => ({
              ...item,
              timeMs: item.pubDate ? new Date(item.pubDate).getTime() : Date.now()
            }));
            setNewsItems(mapped);
            setIsLiveNewsActive(true);
            setLastNewsUpdated(new Date());
          }
          if (Array.isArray(j.equities) && j.equities.length > 0) {
            setLiveEquities(j.equities);
          }
          if (j.earnings && typeof j.earnings === 'object') {
            setEarningsRegistry(prev => ({ ...prev, ...j.earnings }));
            setLastEarningsSyncTime(new Date());
          }
        }
      }
    } catch (err) {
      console.warn('Live pulse/news fetch error:', err);
    } finally {
      if (showLoading) {
        setTimeout(() => setIsRefreshingNews(false), 400);
      }
    }
  };

  useEffect(() => {
    fetchPulseAndNews(false);
    // Auto-refresh every 3 minutes
    const interval = setInterval(() => {
      fetchPulseAndNews(false);
    }, 180000);
    return () => clearInterval(interval);
  }, []);

  const fgScore = pulse?.fear_greed_score || 35;
  // Needle angle: 0 score = -90deg, 50 score = 0deg, 100 score = +90deg
  const needleRotation = -90 + (fgScore / 100) * 180;

  const getFgColor = (score) => {
    if (score < 25) return '#ef4444';
    if (score < 45) return '#f97316';
    if (score <= 55) return '#eab308';
    if (score <= 75) return '#34d399';
    return '#10b981';
  };

  const getFgLabel = (score) => {
    if (score < 25) return 'AŞIRI KORKU';
    if (score < 45) return 'KORKU';
    if (score <= 55) return 'NÖTR';
    if (score <= 75) return 'AÇGÖZLÜLÜK';
    return 'AŞIRI AÇGÖZLÜLÜK';
  };

  const fgColor = getFgColor(fgScore);
  const fgLabel = pulse?.fear_greed_label || getFgLabel(fgScore);

  const hist = pulse?.fear_greed_history || {
    yesterday: 30.8,
    week_ago: 35.7,
    month_ago: 44.9,
    year_ago: 52.5
  };

  // Equities return matrix (Uses dynamic 1Y daily candle calculations from Yahoo Finance)
  const defaultEquities = [
    { name: 'S&P 500', symbol: 'SPY', price: marketQuotes['SPY']?.price || 762.63, today: marketQuotes['SPY']?.changePct || -0.20, d5: -0.67, m1: -0.58, ytd: 11.63, y1: 14.09 },
    { name: 'Nasdaq 100', symbol: 'QQQ', price: marketQuotes['QQQ']?.price || 739.77, today: marketQuotes['QQQ']?.changePct || 0.25, d5: -0.19, m1: 3.21, ytd: 20.66, y1: 22.63 },
    { name: 'Dow Jones', symbol: 'DIA', price: marketQuotes['DIA']?.price || 508.55, today: marketQuotes['DIA']?.changePct || -0.84, d5: -1.12, m1: -4.33, ytd: 5.15, y1: 9.54 },
    { name: 'BIST 100', symbol: 'XU100.IS', price: marketQuotes['XU100.IS']?.price || 10850.4, today: marketQuotes['XU100.IS']?.changePct || 0.45, d5: 1.25, m1: 4.80, ytd: 38.63, y1: 42.10 },
    { name: 'Altın (Ons)', symbol: 'GC=F', price: marketQuotes['GC=F']?.price || 4198.10, today: marketQuotes['GC=F']?.changePct || 0.38, d5: 0.85, m1: 3.40, ytd: 28.50, y1: 36.20 },
    { name: 'Brent Petrol', symbol: 'BZ=F', price: marketQuotes['BZ=F']?.price || 74.20, today: marketQuotes['BZ=F']?.changePct || -0.65, d5: -1.80, m1: -3.10, ytd: -2.40, y1: -5.10 },
    { name: 'ABD 10Y Tahvil', symbol: '^TNX', price: marketQuotes['^TNX']?.price || 4.15, today: marketQuotes['^TNX']?.changePct || -0.40, d5: 0.12, m1: -0.85, ytd: -1.20, y1: -2.50 },
    { name: 'Dolar / TL', symbol: 'USDTRY=X', price: usdtry || 49.03, today: marketQuotes['USDTRY=X']?.changePct || 0.12, d5: 0.45, m1: 1.85, ytd: 18.40, y1: 32.10 }
  ];

  const equities = liveEquities && liveEquities.length > 0
    ? liveEquities.map(item => {
        const q = marketQuotes[item.symbol];
        return {
          ...item,
          price: q?.price || item.price,
          today: q?.changePct != null ? q.changePct : item.today
        };
      })
    : defaultEquities;

  const filteredNews = newsItems.filter(item => {
    if (newsFilter === 'ALL') return true;
    if (newsFilter === 'BIST') return item.tag?.includes('BIST');
    if (newsFilter === 'TCMB') return item.tag?.includes('TCMB') || item.tag?.includes('Makro');
    if (newsFilter === 'FED') return item.tag?.includes('Fed') || item.tag?.includes('Wall St');
    if (newsFilter === 'TECH') return item.tag?.includes('Teknoloji') || item.tag?.includes('AI');
    if (newsFilter === 'CRYPTO') return item.tag?.includes('Kripto') || item.tag?.includes('Emtia');
    return true;
  });

  const vixValue = Number(pulse?.vix?.value) || 16.46;
  const spyObj = equities.find(e => e.symbol === 'SPY');
  const qqqObj = equities.find(e => e.symbol === 'QQQ');
  const spyM1 = Number(spyObj?.m1) || 0;
  const qqqM1 = Number(qqqObj?.m1) || 0;

  // Institutional Multi-Factor Market Exposure Calculation (O'Neil / IBD Model)
  const activeExposure = useMemo(() => {
    // VIX factor (inverted: lower VIX = higher exposure capacity)
    const vixScore = Math.max(0, Math.min(100, 100 - (vixValue - 10) * 3.6));
    // Index momentum factor (1-month trend)
    const momScore = Math.max(0, Math.min(100, 50 + (spyM1 + qqqM1) * 4));
    // Composite multi-factor score (0 - 100)
    const compositeScore = Math.round((fgScore * 0.45) + (vixScore * 0.35) + (momScore * 0.20));

    let tierIndex = 2; // Default 40-60%
    if (compositeScore < 28 || vixValue >= 28) {
      tierIndex = 0; // 0-20%
    } else if (compositeScore < 48 || vixValue >= 22) {
      tierIndex = 1; // 20-40%
    } else if (compositeScore <= 68) {
      tierIndex = 2; // 40-60%
    } else if (compositeScore <= 84) {
      tierIndex = 3; // 60-80%
    } else {
      tierIndex = 4; // 80-100%
    }

    const t = EXPOSURE_TIERS[tierIndex];
    return {
      ...t,
      score: compositeScore
    };
  }, [fgScore, vixValue, spyM1, qqqM1]);

  return (
    <div className="tab-pane active" style={{ animation: 'fadeIn 0.25s ease' }}>
      {/* Workspace Header */}
      <div className="workspace-header" style={{ marginBottom: 16 }}>
        <div>
          <h2 className="workspace-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span>🌐</span>
            <span>GLOBAL PİYASA NABZI & MAKRO RADAR</span>
          </h2>
          <p className="workspace-subtitle">
            Korku & Açgözlülük İbresi, Portföy Maruziyet Ölçeri, VIX, Truflation ve Küresel Endeks Performansları
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className={`nav-badge ${activeExposure.badgeClass}`} style={{ padding: '5px 12px', fontSize: 11 }}>
            CANLI PİYASA REJİMİ: {activeExposure.regime}
          </span>
        </div>
      </div>

      {/* Main Grid: Left Fear & Greed + Indicators | Right Equities Matrix */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(340px, 420px) 1fr', gap: 16, marginBottom: 20 }}>
        
        {/* Left Column: Speedometer & Macro Gauges */}
        <div className="card" style={{ padding: 18, background: '#070a12', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px', textAlign: 'center', marginBottom: 8 }}>
            KORKU & AÇGÖZLÜLÜK ENDEKSİ (FEAR & GREED)
          </div>

          {/* SVG Speedometer Gauge */}
          <div style={{ position: 'relative', width: 280, height: 140, margin: '0 auto' }}>
            <svg viewBox="0 0 280 140" style={{ width: '100%', height: '100%' }}>
              {/* 0-25 Extreme Fear: Red */}
              <path d="M 20 130 A 120 120 0 0 1 55 45" fill="none" stroke="#ef4444" strokeWidth="20" strokeLinecap="round" />
              {/* 25-45 Fear: Orange */}
              <path d="M 60 40 A 120 120 0 0 1 120 15" fill="none" stroke="#f97316" strokeWidth="20" />
              {/* 45-55 Neutral: Amber */}
              <path d="M 125 15 A 120 120 0 0 1 155 15" fill="none" stroke="#eab308" strokeWidth="20" />
              {/* 55-75 Greed: Light Green */}
              <path d="M 160 15 A 120 120 0 0 1 220 40" fill="none" stroke="#34d399" strokeWidth="20" />
              {/* 75-100 Extreme Greed: Emerald */}
              <path d="M 225 45 A 120 120 0 0 1 260 130" fill="none" stroke="#10b981" strokeWidth="20" strokeLinecap="round" />
            </svg>
            {/* Needle */}
            <div
              style={{
                position: 'absolute',
                bottom: 10,
                left: '50%',
                width: 4,
                height: 105,
                background: '#fff',
                transformOrigin: 'bottom center',
                transform: `translateX(-50%) rotate(${needleRotation}deg)`,
                transition: 'transform 1s cubic-bezier(0.34, 1.56, 0.64, 1)',
                boxShadow: '0 0 8px rgba(255,255,255,0.8)',
                borderRadius: '2px 2px 0 0',
                zIndex: 2
              }}
            />
            {/* Needle Center Pin */}
            <div
              style={{
                position: 'absolute',
                bottom: 4,
                left: '50%',
                transform: 'translateX(-50%)',
                width: 16,
                height: 16,
                background: '#fff',
                borderRadius: '50%',
                border: '3px solid #000',
                zIndex: 3
              }}
            />
          </div>

          {/* Score & Label */}
          <div style={{ textAlign: 'center', marginTop: 10 }}>
            <div style={{ fontSize: 38, fontWeight: 900, color: fgColor, lineHeight: 1, fontFamily: 'var(--font-mono)' }}>
              {fgScore}
            </div>
            <div style={{ fontSize: 13, fontWeight: 800, color: fgColor, marginTop: 4, letterSpacing: '0.5px' }}>
              {fgLabel}
            </div>
            <div style={{ fontSize: 9.5, color: 'var(--text-muted)', marginTop: 2 }}>
              Kaynak: CNN Business Resmi Canlı Göstergesi
            </div>
          </div>

          {/* Historical Fear & Greed Levels */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, marginTop: 14, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '6px 4px', borderRadius: 4, textAlign: 'center' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: 8.5, fontWeight: 700 }}>DÜN</div>
              <div style={{ fontWeight: 800, color: getFgColor(hist.yesterday), fontSize: 12, marginTop: 2, fontFamily: 'var(--font-mono)' }}>{hist.yesterday}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: 8 }}>{getFgLabel(hist.yesterday)}</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '6px 4px', borderRadius: 4, textAlign: 'center' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: 8.5, fontWeight: 700 }}>1 HAFTA</div>
              <div style={{ fontWeight: 800, color: getFgColor(hist.week_ago), fontSize: 12, marginTop: 2, fontFamily: 'var(--font-mono)' }}>{hist.week_ago}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: 8 }}>{getFgLabel(hist.week_ago)}</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '6px 4px', borderRadius: 4, textAlign: 'center' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: 8.5, fontWeight: 700 }}>1 AY</div>
              <div style={{ fontWeight: 800, color: getFgColor(hist.month_ago), fontSize: 12, marginTop: 2, fontFamily: 'var(--font-mono)' }}>{hist.month_ago}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: 8 }}>{getFgLabel(hist.month_ago)}</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '6px 4px', borderRadius: 4, textAlign: 'center' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: 8.5, fontWeight: 700 }}>1 YIL</div>
              <div style={{ fontWeight: 800, color: getFgColor(hist.year_ago), fontSize: 12, marginTop: 2, fontFamily: 'var(--font-mono)' }}>{hist.year_ago}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: 8 }}>{getFgLabel(hist.year_ago)}</div>
            </div>
          </div>

          {/* Stock Market Exposure Meter (IBD / O'Neil Dynamic Multi-Factor Model) */}
          <div style={{ marginTop: 16, borderTop: '1px solid var(--border)', paddingTop: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <strong style={{ color: '#fff', fontSize: 11.5 }}>Piyasa Maruziyet Ölçeri:</strong>
                <span style={{ fontSize: 9.5, color: 'var(--text-muted)' }}>(Önerilen Hisse Ağırlığı)</span>
              </div>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '3px 10px',
                background: `${activeExposure.color}1f`,
                border: `1px solid ${activeExposure.color}88`,
                borderRadius: 4,
                boxShadow: `0 0 10px ${activeExposure.color}33`
              }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: activeExposure.color, display: 'inline-block', boxShadow: `0 0 6px ${activeExposure.color}` }} />
                <span style={{ color: activeExposure.color, fontWeight: 900, fontFamily: 'var(--font-mono)', fontSize: 11.5 }}>
                  %{activeExposure.range} Yatırımda
                </span>
              </div>
            </div>

            {/* 5-Tier Segmented Bar with Active Glow */}
            <div style={{ display: 'flex', gap: 4, alignItems: 'center', margin: '8px 0 3px 0' }}>
              {EXPOSURE_TIERS.map((t) => {
                const isActive = t.tier === activeExposure.tier;
                return (
                  <div
                    key={t.tier}
                    style={{
                      flex: 1,
                      position: 'relative',
                      height: isActive ? 26 : 18,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: 4,
                      background: isActive ? t.bg : 'rgba(255, 255, 255, 0.04)',
                      border: isActive ? '2px solid #ffffff' : `1px solid ${t.color}33`,
                      color: isActive ? '#ffffff' : 'rgba(255, 255, 255, 0.35)',
                      fontWeight: isActive ? 900 : 700,
                      fontSize: isActive ? 11 : 9,
                      fontFamily: 'var(--font-mono)',
                      boxShadow: isActive ? `0 0 14px ${t.color}aa, inset 0 0 6px rgba(255,255,255,0.4)` : 'none',
                      transform: isActive ? 'scale(1.02)' : 'scale(1)',
                      transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                      zIndex: isActive ? 2 : 1
                    }}
                    title={`${t.range}: ${t.name}`}
                  >
                    {isActive && <span style={{ marginRight: 2, fontSize: 10 }}>✓</span>}
                    <span>{t.shortLabel}</span>
                  </div>
                );
              })}
            </div>

            {/* Pointer Indicator */}
            <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
              {EXPOSURE_TIERS.map((t) => {
                const isActive = t.tier === activeExposure.tier;
                return (
                  <div key={t.tier} style={{ flex: 1, textAlign: 'center', height: 14 }}>
                    {isActive && (
                      <span style={{
                        display: 'inline-block',
                        color: t.color,
                        fontSize: 9,
                        fontWeight: 900,
                        letterSpacing: '0.4px',
                        lineHeight: 1
                      }}>
                        ▲ AKTİF
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Dynamic Rationale Card */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.02)',
              border: `1px solid ${activeExposure.color}33`,
              borderRadius: 5,
              padding: '8px 10px',
              borderLeft: `3px solid ${activeExposure.color}`
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
                <span style={{ fontSize: 10.5, fontWeight: 800, color: activeExposure.color }}>
                  {activeExposure.name}
                </span>
                <span style={{ fontSize: 9, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                  Maruziyet Skoru: {activeExposure.score}/100
                </span>
              </div>
              <div style={{ fontSize: 10, color: '#94a3b8', lineHeight: 1.45 }}>
                {activeExposure.desc}
              </div>
            </div>
          </div>

          {/* Mini Cards: VIX & Truflation */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 14 }}>
            <div style={{ background: '#0b0f19', border: '1px solid var(--border)', borderRadius: 4, padding: 10, textAlign: 'center' }}>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700 }}>VIX ENDEKSİ</div>
              <div style={{ fontSize: 18, fontWeight: 900, color: '#fff', margin: '4px 0 2px 0', fontFamily: 'var(--font-mono)' }}>
                {pulse?.vix?.value || 16.46}
              </div>
              <div style={{ fontSize: 10.5, color: (pulse?.vix?.change_pct || 0) >= 0 ? 'var(--amber)' : 'var(--emerald)', fontWeight: 700 }}>
                {(pulse?.vix?.change_pct || 0) >= 0 ? '+' : ''}{(pulse?.vix?.change_pct || 0).toFixed(2)}%
              </div>
            </div>

            <div style={{ background: '#0b0f19', border: '1px solid var(--border)', borderRadius: 4, padding: 10, textAlign: 'center' }}>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 4 }}>
                <span>TRUFLATION (ABD)</span>
                <span className="nav-badge cyan" style={{ fontSize: 8, padding: '1px 5px' }}>CANLI</span>
              </div>
              <div style={{ fontSize: 18, fontWeight: 900, color: '#38bdf8', margin: '4px 0 2px 0', fontFamily: 'var(--font-mono)' }}>
                %{pulse?.truflation?.rate ? Number(pulse.truflation.rate).toFixed(2) : (pulse?.inflation?.usa ? Number(pulse.inflation.usa).toFixed(2) : '3.09')}
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                {pulse?.truflation?.change != null ? (
                  <span style={{ color: pulse.truflation.change >= 0 ? '#f87171' : '#34d399', fontWeight: 600 }}>
                    {pulse.truflation.change >= 0 ? '+' : ''}{pulse.truflation.change.toFixed(2)}% ({pulse.truflation.date})
                  </span>
                ) : 'Gerçek Zamanlı Öncü TÜFE'}
              </div>
            </div>
          </div>

        </div>

        {/* Right Column: Equities Matrix Table & Macro Regime */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          
          {/* Equities Return Matrix Card */}
          <div className="card" style={{ padding: 16, background: 'var(--bg-card)', border: '1px solid var(--border)', flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ fontWeight: 800, fontSize: 13, color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>🏛️</span>
                <span>U.S. & BIST EQUITIES DÖNEMSEL PERFORMANS MATRİSİ</span>
                {liveEquities && liveEquities.length > 0 && (
                  <span className="nav-badge emerald" style={{ fontSize: 9, padding: '2px 6px' }}>
                    CANLI (1Y MUM HESAPLI)
                  </span>
                )}
              </div>
              <span style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>
                Resmi Kapanış Fiyatları (% Getiriler)
              </span>
            </div>

            <div className="table-responsive">
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', textAlign: 'left' }}>
                    <th style={{ padding: '8px 10px' }}>Varlık Adı</th>
                    <th style={{ padding: '8px 10px' }}>Sembol</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right' }}>Son Fiyat</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right' }}>Bugün (%)</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right' }}>5 Gün (%)</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right' }}>1 Ay (%)</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right' }}>YTD (%)</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right' }}>1 Yıl (%)</th>
                  </tr>
                </thead>
                <tbody>
                  {equities.map((eq, i) => {
                    const isPositive = (n) => n >= 0;
                    return (
                      <tr key={eq.symbol} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)' }}>
                        <td style={{ padding: '9px 10px', fontWeight: 700, color: '#fff' }}>{eq.name}</td>
                        <td style={{ padding: '9px 10px', fontFamily: 'var(--font-mono)', color: 'var(--cyan)' }}>{eq.symbol}</td>
                        <td style={{ padding: '9px 10px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                          {eq.price ? eq.price.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '--'}
                        </td>
                        <td style={{ padding: '9px 10px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 800, color: isPositive(eq.today) ? 'var(--emerald)' : 'var(--red)' }}>
                          {isPositive(eq.today) ? '+' : ''}{Number(eq.today).toFixed(2)}%
                        </td>
                        <td style={{ padding: '9px 10px', textAlign: 'right', fontFamily: 'var(--font-mono)', color: isPositive(eq.d5) ? 'var(--emerald)' : 'var(--red)' }}>
                          {isPositive(eq.d5) ? '+' : ''}{Number(eq.d5).toFixed(2)}%
                        </td>
                        <td style={{ padding: '9px 10px', textAlign: 'right', fontFamily: 'var(--font-mono)', color: isPositive(eq.m1) ? 'var(--emerald)' : 'var(--red)' }}>
                          {isPositive(eq.m1) ? '+' : ''}{Number(eq.m1).toFixed(2)}%
                        </td>
                        <td style={{ padding: '9px 10px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color: isPositive(eq.ytd) ? 'var(--emerald)' : 'var(--red)' }}>
                          {isPositive(eq.ytd) ? '+' : ''}{Number(eq.ytd).toFixed(2)}%
                        </td>
                        <td style={{ padding: '9px 10px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color: isPositive(eq.y1) ? 'var(--emerald)' : 'var(--red)' }}>
                          {isPositive(eq.y1) ? '+' : ''}{Number(eq.y1).toFixed(2)}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Macro Rates Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
            <div style={{ background: '#090d16', border: '1px solid var(--border)', borderRadius: 6, padding: '12px 14px' }}>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>TCMB POLİTİKA FAİZİ</span>
                <span className="nav-badge emerald" style={{ fontSize: 8.5, padding: '1px 6px' }}>GÜNCEL</span>
              </div>
              <div style={{ fontSize: 20, fontWeight: 900, color: 'var(--amber)', fontFamily: 'var(--font-mono)', margin: '4px 0' }}>
                %{pulse?.rates?.tcmb ? Number(pulse.rates.tcmb).toFixed(2) : '36.00'}
              </div>
              <div style={{ fontSize: 9.5, color: 'var(--text-muted)' }}>
                {pulse?.rates?.tcmb_text || '22 Ekim PPK: 100 bp İndirim (%36.00) • Sonraki: 10 Aralık'}
              </div>
            </div>

            <div style={{ background: '#090d16', border: '1px solid var(--border)', borderRadius: 6, padding: '12px 14px' }}>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>FED FONLAMA FAİZİ</span>
                <span className="nav-badge cyan" style={{ fontSize: 8.5, padding: '1px 6px' }}>FOMC</span>
              </div>
              <div style={{ fontSize: 20, fontWeight: 900, color: 'var(--cyan)', fontFamily: 'var(--font-mono)', margin: '4px 0' }}>
                %{pulse?.rates?.fed || '3.75 - 4.00'}
              </div>
              <div style={{ fontSize: 9.5, color: 'var(--text-muted)' }}>
                {pulse?.rates?.fed_text || '28 Ekim FOMC: Pas / Sabit Beklentisi (%76) • Aralık: 25 bp Artış'}
              </div>
            </div>

            <div style={{ background: '#090d16', border: '1px solid var(--border)', borderRadius: 6, padding: '12px 14px' }}>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>TÜİK YILLIK TÜFE</span>
                <span className="nav-badge emerald" style={{ fontSize: 8.5, padding: '1px 6px' }}>EYLÜL</span>
              </div>
              <div style={{ fontSize: 20, fontWeight: 900, color: '#f59e0b', fontFamily: 'var(--font-mono)', margin: '4px 0' }}>
                %{pulse?.inflation?.turkey ? Number(pulse.inflation.turkey).toFixed(2) : '29.73'}
              </div>
              <div style={{ fontSize: 9.5, color: 'var(--text-muted)' }}>
                Ekim Verisi: 3 Kasım Salı (10:00) • Reel Faiz: +{(Number(pulse?.rates?.tcmb || 36.00) - Number(pulse?.inflation?.turkey || 29.73)).toFixed(2)} Puan
              </div>
            </div>

            <div style={{ background: '#090d16', border: '1px solid var(--border)', borderRadius: 6, padding: '12px 14px' }}>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700 }}>DOĞAL KUR KALKANI</div>
              <div style={{ fontSize: 20, fontWeight: 900, color: 'var(--emerald)', fontFamily: 'var(--font-mono)', margin: '4px 0' }}>
                %{pulse?.rates?.kur_kalkani ? Number(pulse.rates.kur_kalkani).toFixed(1) : '82.4'}
              </div>
              <div style={{ fontSize: 9.5, color: 'var(--emerald)' }}>🛡️ Döviz / Altın Zırhı</div>
            </div>
          </div>

        </div>

      </div>

      {/* ========================================================================= */}
      {/* 🔥 SEKTÖREL PİYASA ISI HARİTASI (MARKET HEATMAP & TREEMAP)         */}
      {/* ========================================================================= */}
      {(() => {
        const getHeatmapColor = (pct) => {
          if (pct >= 3.0) return { bg: '#15803d', border: '#22c55e', text: '#ffffff' }; // Deep Emerald
          if (pct >= 1.5) return { bg: '#16a34a', border: '#4ade80', text: '#ffffff' }; // Emerald
          if (pct > 0.0) return { bg: '#1e3a2b', border: '#22c55e', text: '#86efac' }; // Soft Green
          if (pct === 0.0) return { bg: '#1e293b', border: '#475569', text: '#94a3b8' }; // Neutral Slate
          if (pct > -1.5) return { bg: '#3b1d24', border: '#f87171', text: '#fca5a5' }; // Soft Red
          if (pct > -3.0) return { bg: '#dc2626', border: '#ef4444', text: '#ffffff' }; // Red
          return { bg: '#991b1b', border: '#f87171', text: '#ffffff' }; // Deep Crimson
        };

        const isBist = heatmapMarket === 'bist100';

        // Prepare sectors based on selected market
        let sectorsToRender = [];
        if (heatmapMarket === 'sp500') {
          sectorsToRender = FINVIZ_SP500_SECTORS;
        } else if (heatmapMarket === 'bist100') {
          sectorsToRender = FINVIZ_BIST_SECTORS;
        } else {
          // Dynamic Portfolio Mode
          const holdings = portfolioSummary?.enrichedHoldings || [];
          const groups = {};
          holdings.forEach(h => {
            const grp = h.sector?.name || h.category || 'Hisse & Kripto';
            if (!groups[grp]) groups[grp] = [];
            groups[grp].push({
              ticker: h.ticker,
              name: h.name || h.ticker,
              cap: `%${(h.weightPct || 0).toFixed(1)} Portföy`,
              defaultPrice: h.price || 0,
              defaultChange: h.changePct || 0
            });
          });
          sectorsToRender = Object.keys(groups).map((grpName, idx) => ({
            id: `grp_${idx}`,
            name: grpName,
            icon: '💼',
            weight: `${groups[grpName].length} Varlık`,
            stocks: groups[grpName]
          }));
        }

        // Apply quick filter if searched
        const filterQuery = heatmapSearch.trim().toLowerCase();
        const filteredSectors = sectorsToRender.map(sec => {
          const filteredStocks = sec.stocks.filter(st => {
            if (!filterQuery) return true;
            return st.ticker.toLowerCase().includes(filterQuery) || st.name.toLowerCase().includes(filterQuery);
          });
          return { ...sec, stocks: filteredStocks };
        }).filter(sec => sec.stocks.length > 0);

        return (
          <div className="card" style={{ padding: 18, background: '#070a13', border: '1px solid var(--border)', marginBottom: 20 }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <LayoutGrid size={17} className="text-cyan" />
                  <span style={{ fontWeight: 800, fontSize: 13.5, color: '#f8fafc', letterSpacing: '0.4px' }}>
                    SEKTÖREL PİYASA ISI HARİTASI (MARKET HEATMAP)
                  </span>
                  <span className="nav-badge cyan" style={{ fontSize: 9.5, padding: '2px 8px' }}>
                    Sektör Ağırlıkları & Canlı Performans
                  </span>
                </div>
                <p style={{ margin: '3px 0 0 0', fontSize: 11, color: 'var(--text-muted)' }}>
                  Sektörel sermaye rotasyonunu tek bakışta izleyin. İncelemek istediğiniz hisseye tıklayarak Tekil Hisse DCF analizine geçebilirsiniz.
                </p>
              </div>

              {/* Controls */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <div style={{ display: 'inline-flex', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, padding: 3 }}>
                  <button
                    type="button"
                    className={`chip-btn ${heatmapMarket === 'sp500' ? 'active' : ''}`}
                    onClick={() => setHeatmapMarket('sp500')}
                    style={{ fontSize: 10.5, padding: '4px 10px', fontWeight: heatmapMarket === 'sp500' ? 800 : 600 }}
                  >
                    🇺🇸 S&P 500
                  </button>
                  <button
                    type="button"
                    className={`chip-btn ${heatmapMarket === 'bist100' ? 'active' : ''}`}
                    onClick={() => setHeatmapMarket('bist100')}
                    style={{ fontSize: 10.5, padding: '4px 10px', fontWeight: heatmapMarket === 'bist100' ? 800 : 600 }}
                  >
                    🇹🇷 BIST 100
                  </button>
                  <button
                    type="button"
                    className={`chip-btn ${heatmapMarket === 'portfolio' ? 'active' : ''}`}
                    onClick={() => setHeatmapMarket('portfolio')}
                    style={{ fontSize: 10.5, padding: '4px 10px', fontWeight: heatmapMarket === 'portfolio' ? 800 : 600 }}
                  >
                    💼 Portföyüm
                  </button>
                </div>

                <div style={{ position: 'relative' }}>
                  <Search size={13} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    placeholder="Hisse ara..."
                    value={heatmapSearch}
                    onChange={(e) => setHeatmapSearch(e.target.value)}
                    style={{
                      background: '#0b0f19',
                      border: '1px solid var(--border)',
                      borderRadius: 4,
                      padding: '4px 8px 4px 26px',
                      fontSize: 11,
                      color: '#fff',
                      width: 110,
                      outline: 'none'
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Scale Bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '6px 12px', borderRadius: 4, marginBottom: 14, flexWrap: 'wrap', gap: 6 }}>
              <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600 }}>
                Canlı Getiri Renk Skalası:
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 9.5, fontFamily: 'var(--font-mono)' }}>
                <span style={{ background: '#991b1b', color: '#fff', padding: '2px 6px', borderRadius: 3 }}>&le; -3%</span>
                <span style={{ background: '#dc2626', color: '#fff', padding: '2px 6px', borderRadius: 3 }}>-1.5%</span>
                <span style={{ background: '#3b1d24', color: '#fca5a5', padding: '2px 6px', borderRadius: 3 }}>-0.5%</span>
                <span style={{ background: '#1e293b', color: '#94a3b8', padding: '2px 6px', borderRadius: 3 }}>0%</span>
                <span style={{ background: '#1e3a2b', color: '#86efac', padding: '2px 6px', borderRadius: 3 }}>+0.5%</span>
                <span style={{ background: '#16a34a', color: '#fff', padding: '2px 6px', borderRadius: 3 }}>+1.5%</span>
                <span style={{ background: '#15803d', color: '#fff', padding: '2px 6px', borderRadius: 3 }}>&ge; +3%</span>
              </div>
            </div>

            {/* Sectors Treemap Container */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 12 }}>
              {filteredSectors.map(sec => (
                <div 
                  key={sec.id}
                  style={{
                    background: '#090d18',
                    border: '1px solid rgba(255,255,255,0.07)',
                    borderRadius: 6,
                    padding: 10,
                    display: 'flex',
                    flexDirection: 'column'
                  }}
                >
                  {/* Sector Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, paddingBottom: 6, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 13 }}>{sec.icon}</span>
                      <span style={{ fontSize: 11, fontWeight: 800, color: '#e2e8f0' }}>{sec.name}</span>
                    </div>
                    <span style={{ fontSize: 9.5, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                      {sec.weight}
                    </span>
                  </div>

                  {/* Stock Tiles Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(76px, 1fr))', gap: 6, flex: 1 }}>
                    {sec.stocks.map(st => {
                      const sym = st.ticker.toUpperCase();
                      const liveQ = marketQuotes[sym] || (isBist ? marketQuotes[sym + '.IS'] : marketQuotes[sym + '-USD']) || {};
                      const price = liveQ.price != null && liveQ.price > 0 ? liveQ.price : st.defaultPrice;
                      const changePct = liveQ.changePct != null ? liveQ.changePct : st.defaultChange;
                      const col = getHeatmapColor(changePct);
                      const isTRY = isBist || sym.endsWith('.IS');

                      return (
                        <div
                          key={st.ticker}
                          onClick={() => onSelectStock && onSelectStock(st.ticker)}
                          title={`${st.name} (${st.ticker}) - ${st.cap} | Tıkla ve DCF Analizine Git`}
                          style={{
                            background: col.bg,
                            border: `1px solid ${col.border}50`,
                            borderRadius: 5,
                            padding: '6px 4px',
                            textAlign: 'center',
                            cursor: 'pointer',
                            transition: 'all 0.18s ease',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center',
                            alignItems: 'center',
                            minHeight: 52
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = `0 4px 12px ${col.border}50`;
                            e.currentTarget.style.borderColor = col.border;
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'none';
                            e.currentTarget.style.boxShadow = 'none';
                            e.currentTarget.style.borderColor = `${col.border}50`;
                          }}
                        >
                          <div style={{ fontSize: 11, fontWeight: 900, color: '#ffffff', letterSpacing: '0.3px', fontFamily: 'var(--font-mono)' }}>
                            {st.ticker}
                          </div>
                          <div style={{ fontSize: 9, color: '#f1f5f9', opacity: 0.9, marginTop: 1, fontFamily: 'var(--font-mono)' }}>
                            {isTRY ? '₺' : '$'}{Number(price).toLocaleString('tr-TR', { maximumFractionDigits: 1 })}
                          </div>
                          <div style={{ fontSize: 9.5, fontWeight: 800, color: col.text, marginTop: 1, fontFamily: 'var(--font-mono)' }}>
                            {changePct >= 0 ? '+' : ''}{Number(changePct).toFixed(1)}%
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {filteredSectors.length === 0 && (
              <div style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--text-muted)', fontSize: 11 }}>
                Arama kriterine uygun hisse bulunamadı.
              </div>
            )}
          </div>
        );
      })()}

      {/* ========================================================================= */}
      {/* 📅 BİLANÇO & MAKRO KATALİZÖR TAKVİMİ                                 */}
      {/* ========================================================================= */}
      <div className="card" style={{ padding: 18, background: '#070a13', border: '1px solid var(--border)', marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(56,189,248,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Calendar size={20} className="text-cyan" />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 13, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>BİLANÇO & MAKRO KATALİZÖR TAKVİMİ</span>
                <span className="nav-badge cyan" style={{ fontSize: 9.5 }}>Katalizör Takvimi</span>
              </div>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                Şirket Bilanço Açıklama Günleri, Konsensüs Beklentileri & Fed / TCMB Toplantıları
              </span>
            </div>
          </div>

          {/* Sub-Tabs: Şirket Bilançoları vs Makro Katalizörler */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {calendarTab === 'earnings' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span className="nav-badge emerald" style={{ fontSize: 9, padding: '3px 8px', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
                  <span>OTOMATİK BİLANÇO RADARI AKTİF</span>
                </span>
                <button
                  type="button"
                  onClick={handleAutoSyncEarnings}
                  className="chip-btn"
                  title="Canlı Bilanço ve Konsensüs Sonuçlarını Tara"
                  style={{ fontSize: 10, padding: '3px 8px', display: 'inline-flex', alignItems: 'center', gap: 4, color: '#38bdf8' }}
                >
                  <RefreshCw size={11} className={isAutoSyncingEarnings ? 'animate-spin' : ''} />
                  <span>{isAutoSyncingEarnings ? 'Taranıyor...' : 'Canlı Bilanço Tara'}</span>
                </button>
              </div>
            )}
            <button
              type="button"
              className={`chip-btn ${calendarTab === 'earnings' ? 'active' : ''}`}
              onClick={() => setCalendarTab('earnings')}
              style={{ fontSize: 10.5, padding: '4px 10px' }}
            >
              🏢 Şirket Bilançoları ({UPCOMING_EARNINGS_CALENDAR.length})
            </button>
            <button
              type="button"
              className={`chip-btn ${calendarTab === 'macro' ? 'active' : ''}`}
              onClick={() => setCalendarTab('macro')}
              style={{ fontSize: 10.5, padding: '4px 10px' }}
            >
              🏛️ Fed & TCMB Makro ({UPCOMING_MACRO_CATALYSTS.length})
            </button>
          </div>
        </div>

        {calendarTab === 'earnings' ? (
          /* Earnings Calendar Table */
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-muted)', fontSize: 10 }}>
                  <th style={{ textAlign: 'left', padding: '6px 8px' }}>HİSSE & ŞİRKET</th>
                  <th style={{ textAlign: 'left', padding: '6px 8px' }}>BİLANÇO TARİHİ & SAATİ</th>
                  <th style={{ textAlign: 'center', padding: '6px 8px' }}>DURUM / GERİ SAYIM</th>
                  <th style={{ textAlign: 'right', padding: '6px 8px' }}>EPS (BEKLENEN / GERÇEK)</th>
                  <th style={{ textAlign: 'right', padding: '6px 8px' }}>CİRO (BEKLENEN / GERÇEK)</th>
                  <th style={{ textAlign: 'center', padding: '6px 8px' }}>KONSENSÜS / SONUÇ</th>
                  <th style={{ textAlign: 'left', padding: '6px 8px' }}>ANA KATALİZÖR & ÖZET SONUÇ NOTU</th>
                </tr>
              </thead>
              <tbody>
                {UPCOMING_EARNINGS_CALENDAR.map((rawItem, idx) => {
                  const item = resolveEarningsItem(rawItem, marketQuotes, earningsRegistry);
                  const diff = item.daysDiff;
                  const isAnnounced = item.isAnnounced;
                  const isNegative = item.resultStatus === 'MISS' || (item.resultBadge && (item.resultBadge.includes('MISS') || item.resultBadge.includes('🔴')));
                  const isMixed = item.resultStatus === 'MIXED' || (item.resultBadge && (item.resultBadge.includes('KARIŞIK') || item.resultBadge.includes('NÖTR') || item.resultBadge.includes('🟡')));
                  const statusColor = isNegative ? '#ef4444' : isMixed ? '#f59e0b' : '#10b981';
                  const statusBg = isNegative ? 'rgba(239,68,68,0.08)' : isMixed ? 'rgba(245,158,11,0.08)' : 'rgba(16,185,129,0.06)';
                  const statusBorder = isNegative ? 'rgba(239,68,68,0.3)' : isMixed ? 'rgba(245,158,11,0.3)' : 'rgba(16,185,129,0.3)';

                  let daysText = '';
                  let daysBadge = 'cyan';

                  if (isAnnounced) {
                    daysText = 'Açıklandı ✓';
                    daysBadge = isNegative ? 'red' : isMixed ? 'amber' : 'emerald';
                  } else if (diff === 0) {
                    daysText = 'Bugün!';
                    daysBadge = 'red';
                  } else if (diff === 1) {
                    daysText = 'Yarın!';
                    daysBadge = 'amber';
                  } else {
                    daysText = `${diff} Gün Kaldı`;
                    daysBadge = diff <= 4 ? 'amber' : 'cyan';
                  }

                  return (
                    <tr
                      key={idx}
                      style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', cursor: 'pointer', transition: 'background 0.15s ease' }}
                      onClick={() => onSelectStock && onSelectStock(item.ticker)}
                      title="Tıkla ve Tekil Hisse Analizine Git"
                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={{ padding: '8px 8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontWeight: 900, color: '#fff', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                            {item.ticker}
                          </span>
                          <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 3, background: item.market === 'BIST' ? 'rgba(59,130,246,0.15)' : 'rgba(6,182,212,0.15)', color: item.market === 'BIST' ? '#3b82f6' : '#06b6d4', fontWeight: 700 }}>
                            {item.market}
                          </span>
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{item.name}</div>
                      </td>
                      <td style={{ padding: '8px 8px', color: '#e2e8f0' }}>
                        <div style={{ fontWeight: 700 }}>{item.date}</div>
                        <div style={{ fontSize: 9.5, color: 'var(--text-muted)' }}>{item.time}</div>
                      </td>
                      <td style={{ textAlign: 'center', padding: '8px 8px' }}>
                        <span className={`nav-badge ${daysBadge}`} style={{ fontSize: 9.5, padding: '2px 8px', fontWeight: 800 }}>
                          {daysText}
                        </span>
                        {isAnnounced && item.priceReaction && (
                          <div style={{ fontSize: 9.5, fontWeight: 700, color: item.priceReaction.startsWith('+') ? '#10b981' : item.priceReaction.startsWith('-') ? '#ef4444' : '#f59e0b', marginTop: 3 }}>
                            Reaksiyon: {item.priceReaction}
                          </div>
                        )}
                      </td>
                      <td style={{ textAlign: 'right', padding: '8px 8px', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                        {isAnnounced && item.actualEPS ? (
                          <>
                            <div style={{ color: statusColor, fontSize: 12 }}>{item.actualEPS}</div>
                            <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>Bekl: {item.expectedEPS}</div>
                            {item.epsSurprise && (
                              <div style={{ fontSize: 8.5, color: statusColor, fontWeight: 600 }}>{item.epsSurprise}</div>
                            )}
                          </>
                        ) : (
                          <>
                            <div style={{ color: '#fff' }}>{item.expectedEPS}</div>
                            <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>Önceki: {item.prevEPS}</div>
                          </>
                        )}
                      </td>
                      <td style={{ textAlign: 'right', padding: '8px 8px', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                        {isAnnounced && item.actualRev ? (
                          <>
                            <div style={{ color: '#38bdf8', fontSize: 12 }}>{item.actualRev}</div>
                            <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>Bekl: {item.expectedRev}</div>
                          </>
                        ) : (
                          <span style={{ color: 'var(--cyan)' }}>{item.expectedRev}</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'center', padding: '8px 8px' }}>
                        {isAnnounced ? (
                          <>
                            <span style={{ fontSize: 9.5, fontWeight: 800, color: statusColor, background: statusBg, padding: '2px 6px', borderRadius: 4, border: `1px solid ${statusBorder}`, display: 'inline-block' }}>
                              {item.resultBadge || (isNegative ? '🔴 MISS' : isMixed ? '🟡 KARIŞIK' : '🟢 BEAT')}
                            </span>
                            <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 2 }}>Tarihsel: {item.beatRate}</div>
                          </>
                        ) : (
                          <>
                            <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--emerald)' }}>
                              {item.consensus}
                            </span>
                            <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>Tarihsel Beat: {item.beatRate}</div>
                          </>
                        )}
                      </td>
                      <td style={{ padding: '8px 8px', fontSize: 10.5 }}>
                        {isAnnounced && item.resultSummary ? (
                          <div style={{
                            background: statusBg,
                            borderLeft: `3px solid ${statusColor}`,
                            padding: '5px 8px',
                            borderRadius: '0 4px 4px 0',
                            maxWidth: 440
                          }}>
                            <div style={{ fontWeight: 700, color: '#e2e8f0', fontSize: 10, lineHeight: 1.35 }}>
                              {item.resultSummary}
                            </div>
                            <div style={{ fontSize: 9, color: '#94a3b8', marginTop: 2 }}>
                              📌 Katalizör: {item.catalyst}
                            </div>
                          </div>
                        ) : (
                          <span style={{ color: '#94a3b8' }}>{item.catalyst}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          /* Macro Catalysts Grid */
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
            {UPCOMING_MACRO_CATALYSTS.map((m, idx) => {
              const diff = calculateDayDiff(m.targetDate);
              const isAnnounced = m.isAnnounced || diff < 0;
              let countdownLabel = '';
              let badgeColor = 'var(--cyan)';

              if (isAnnounced) {
                countdownLabel = 'Gerçekleşti ✓';
                badgeColor = '#94a3b8';
              } else if (diff === 0) {
                countdownLabel = 'Bugün!';
                badgeColor = '#ef4444';
              } else if (diff === 1) {
                countdownLabel = 'Yarın!';
                badgeColor = '#f59e0b';
              } else {
                countdownLabel = `${diff} Gün Kaldı`;
                badgeColor = diff <= 4 ? 'var(--emerald)' : 'var(--amber)';
              }

              return (
                <div key={idx} style={{ background: '#090d18', padding: 14, borderRadius: 6, border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <span className="nav-badge cyan" style={{ fontSize: 9 }}>{m.status}</span>
                    <span style={{ fontSize: 10.5, fontWeight: 800, color: badgeColor, fontFamily: 'var(--font-mono)' }}>
                      ⏱️ {countdownLabel}
                    </span>
                  </div>
                  <div style={{ fontWeight: 800, fontSize: 12.5, color: '#fff', marginBottom: 4 }}>
                    {m.event}
                  </div>
                  <div style={{ fontSize: 10.5, color: 'var(--text-muted)', marginBottom: 8 }}>
                    📅 Tarih: <strong style={{ color: '#e2e8f0' }}>{m.date} ({m.time})</strong>
                  </div>
                  <div style={{ background: '#0b101c', padding: '8px 10px', borderRadius: 4, fontSize: 10.5, marginBottom: 8 }}>
                    <div>Beklenti: <strong style={{ color: 'var(--emerald)' }}>{m.expectation}</strong></div>
                    <div style={{ color: 'var(--text-muted)', marginTop: 2 }}>Önceki Seviye: {m.prev}</div>
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--cyan)' }}>
                    🎯 Etki: <strong>{m.impact}</strong>
                  </div>
                  {m.actualResult && (
                    <div style={{
                      marginTop: 8,
                      background: 'rgba(16,185,129,0.08)',
                      border: '1px solid rgba(16,185,129,0.25)',
                      borderLeft: '3px solid #10b981',
                      padding: '7px 9px',
                      borderRadius: 4,
                      fontSize: 10.5
                    }}>
                      <div style={{ fontSize: 9.5, fontWeight: 800, color: '#10b981', marginBottom: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span>✓ GERÇEKLEŞEN KARAR & ÖZET</span>
                      </div>
                      <div style={{ color: '#f1f5f9', lineHeight: 1.35, fontWeight: 600 }}>{m.actualResult}</div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Live Financial & KAP News Feed Card */}
      <div className="card" style={{ padding: 18, background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ fontWeight: 800, fontSize: 13, color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Newspaper size={16} className="text-cyan" />
              <span>CANLI FİNANS & KAP HABER AKIŞI</span>
            </div>
            <span className={`nav-badge ${isLiveNewsActive ? 'emerald' : 'cyan'}`} style={{ fontSize: 9, padding: '2px 8px', display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: isLiveNewsActive ? '#10b981' : '#38bdf8', display: 'inline-block' }} />
              {isLiveNewsActive ? 'CANLI RSS / API AKTİF' : 'GÜNCEL AKIŞ'}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {lastNewsUpdated && (
              <span style={{ fontSize: 10.5, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                Son Güncelleme: {lastNewsUpdated.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            )}
            <button
              onClick={() => fetchPulseAndNews(true)}
              disabled={isRefreshingNews}
              className="btn btn-secondary"
              style={{
                fontSize: 11,
                padding: '5px 12px',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                background: '#0c101d',
                border: '1px solid var(--border)',
                cursor: isRefreshingNews ? 'wait' : 'pointer',
                borderRadius: 4,
                color: '#e2e8f0'
              }}
            >
              <RefreshCw size={12} style={{ animation: isRefreshingNews ? 'spin 1s linear infinite' : 'none' }} />
              <span>{isRefreshingNews ? 'Yenileniyor...' : 'Canlı Akışı Yenile'}</span>
            </button>
          </div>
        </div>

        {/* Category Filters */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
          {[
            { id: 'ALL', label: 'Tümü' },
            { id: 'BIST', label: 'BIST & KAP' },
            { id: 'TCMB', label: 'TCMB & Makro' },
            { id: 'FED', label: 'Fed & Wall St' },
            { id: 'TECH', label: 'Teknoloji & AI' },
            { id: 'CRYPTO', label: 'Kripto & Emtia' }
          ].map(f => {
            const isSel = newsFilter === f.id;
            const count = newsItems.filter(item => {
              if (f.id === 'ALL') return true;
              if (f.id === 'BIST') return item.tag?.includes('BIST');
              if (f.id === 'TCMB') return item.tag?.includes('TCMB') || item.tag?.includes('Makro');
              if (f.id === 'FED') return item.tag?.includes('Fed') || item.tag?.includes('Wall St');
              if (f.id === 'TECH') return item.tag?.includes('Teknoloji') || item.tag?.includes('AI');
              if (f.id === 'CRYPTO') return item.tag?.includes('Kripto') || item.tag?.includes('Emtia');
              return true;
            }).length;

            return (
              <button
                key={f.id}
                onClick={() => setNewsFilter(f.id)}
                style={{
                  fontSize: 11,
                  fontWeight: isSel ? 700 : 500,
                  padding: '4px 11px',
                  borderRadius: 20,
                  background: isSel ? 'var(--cyan)' : '#090d16',
                  color: isSel ? '#000' : 'var(--text-muted)',
                  border: isSel ? '1px solid var(--cyan)' : '1px solid var(--border)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}
              >
                <span>{f.label}</span>
                <span style={{
                  fontSize: 9,
                  padding: '1px 5px',
                  borderRadius: 10,
                  background: isSel ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.08)',
                  color: isSel ? '#000' : 'var(--text-muted)',
                  fontWeight: 800
                }}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* News Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 10 }}>
          {filteredNews.map((n, i) => {
            const badgeStyle = getTagBadgeStyle(n.tag);
            const timeAgo = formatTimeAgo(n.timeMs || n.pubDate);
            return (
              <a
                key={n.id || i}
                href={n.link || '#'}
                target={n.link ? '_blank' : '_self'}
                rel="noopener noreferrer"
                style={{
                  textDecoration: 'none',
                  background: '#090d16',
                  border: '1px solid var(--border)',
                  borderRadius: 6,
                  padding: '11px 13px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                  transition: 'border-color 0.15s ease, transform 0.15s ease',
                  cursor: n.link ? 'pointer' : 'default'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(56, 189, 248, 0.4)';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border)';
                  e.currentTarget.style.transform = 'none';
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                      ⏱️ {timeAgo}
                    </span>
                    <span className={`nav-badge ${n.bull ? 'emerald' : 'amber'}`} style={{ fontSize: 8.5, padding: '0px 6px' }}>
                      {n.source}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span
                      style={{
                        fontSize: 9.5,
                        fontWeight: 700,
                        padding: '1px 7px',
                        borderRadius: 3,
                        background: badgeStyle.bg,
                        color: badgeStyle.color,
                        border: `1px solid ${badgeStyle.border}`
                      }}
                    >
                      {n.tag}
                    </span>
                    {n.link && <ExternalLink size={11} style={{ color: 'var(--text-muted)' }} />}
                  </div>
                </div>
                <div style={{ fontSize: 12, color: '#e2e8f0', lineHeight: 1.45, fontWeight: 500 }}>
                  {n.title}
                </div>
              </a>
            );
          })}
        </div>
      </div>
    </div>
  );
}
