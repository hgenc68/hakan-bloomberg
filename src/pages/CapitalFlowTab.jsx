import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, registerables } from 'chart.js';
import {
  Waves,
  TrendingUp,
  TrendingDown,
  Activity,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  Compass,
  ArrowRight,
  ArrowUpRight,
  ArrowDownRight,
  Percent,
  Sliders,
  Sparkles,
  PieChart,
  BarChart3,
  Layers,
  CheckCircle2,
  Zap,
  Info,
  ExternalLink
} from 'lucide-react';

ChartJS.register(...registerables);

// Core Asset Class Definitions & Instruments
const ASSET_BUCKETS = [
  {
    id: 'equities',
    name: 'Hisse Senetleri & Büyüme',
    subtitle: 'S&P 500, Nasdaq, BIST 100',
    icon: '🏢',
    color: '#38bdf8', // Sky Blue
    bgRgba: 'rgba(56, 189, 248, 0.12)',
    borderRgba: 'rgba(56, 189, 248, 0.35)',
    symbols: [
      { ticker: 'SPY', name: 'S&P 500 ETF', weight: 0.45 },
      { ticker: 'QQQ', name: 'Nasdaq 100 ETF', weight: 0.35 },
      { ticker: 'XU100.IS', name: 'BIST 100 Endeksi', weight: 0.20 }
    ],
    roleDesc: 'Risk İştahı & Ekonomik Büyüme Sermayesi'
  },
  {
    id: 'metals',
    name: 'Değerli Madenler & Emtia',
    subtitle: 'Ons Altın, Gümüş, Bakır, Petrol',
    icon: '🛡️',
    color: '#fbbf24', // Gold / Amber
    bgRgba: 'rgba(251, 191, 36, 0.12)',
    borderRgba: 'rgba(251, 191, 36, 0.35)',
    symbols: [
      { ticker: 'GLD', name: 'SPDR Altın ETF', weight: 0.50 },
      { ticker: 'SI=F', name: 'Gümüş Vadeli', weight: 0.25 },
      { ticker: 'HG=F', name: 'Bakır (Dr. Copper)', weight: 0.15 },
      { ticker: 'CL=F', name: 'Ham Petrol (WTI)', weight: 0.10 }
    ],
    roleDesc: 'Enflasyon Kalkanı & Jeopolitik Güvenli Liman'
  },
  {
    id: 'bonds',
    name: 'Tahvil & Sabit Getiri',
    subtitle: '20+ Yıl Hazine (TLT), HYG, LQD',
    icon: '📜',
    color: '#a855f7', // Purple
    bgRgba: 'rgba(168, 85, 247, 0.12)',
    borderRgba: 'rgba(168, 85, 247, 0.35)',
    symbols: [
      { ticker: 'TLT', name: '20+ Yıl ABD Hazine ETF', weight: 0.50 },
      { ticker: 'HYG', name: 'Yüksek Getirili Kredi (Risk)', weight: 0.25 },
      { ticker: 'LQD', name: 'Yatırım Dereceli Şirket Tahvili', weight: 0.25 }
    ],
    roleDesc: 'Resesyon Koruma & Faiz İndirimi Fiyatlaması'
  },
  {
    id: 'crypto',
    name: 'Kripto & Dijital Beta',
    subtitle: 'Bitcoin, Ethereum',
    icon: '⚡',
    color: '#10b981', // Emerald
    bgRgba: 'rgba(16, 185, 129, 0.12)',
    borderRgba: 'rgba(16, 185, 129, 0.35)',
    symbols: [
      { ticker: 'BTC-USD', name: 'Bitcoin (BTC)', weight: 0.70 },
      { ticker: 'ETH-USD', name: 'Ethereum (ETH)', weight: 0.30 }
    ],
    roleDesc: 'Küresel Finansal Likidite Taşkını & Yüksek Beta'
  },
  {
    id: 'cash',
    name: 'Nakit & Dolar Gücü',
    subtitle: 'DXY Dolar Endeksi, USD/TRY, Kısa Tahvil (BIL)',
    icon: '💵',
    color: '#e2e8f0', // Silver / White
    bgRgba: 'rgba(226, 232, 240, 0.12)',
    borderRgba: 'rgba(226, 232, 240, 0.35)',
    symbols: [
      { ticker: 'DX-Y.NYB', name: 'Dolar Endeksi (DXY)', weight: 0.60 },
      { ticker: 'BIL', name: '1-3 Ay Hazine Bono (Nakit)', weight: 0.20 },
      { ticker: 'USDTRY=X', name: 'Dolar / Türk Lirası', weight: 0.20 }
    ],
    roleDesc: 'Nakit Sıkılaşması & Savunma Kalkanı'
  }
];

// All symbols required for candles
const ALL_SYMBOLS = [
  'SPY', 'QQQ', 'XU100.IS',
  'GLD', 'SI=F', 'HG=F', 'CL=F',
  'TLT', 'HYG', 'LQD',
  'BTC-USD', 'ETH-USD',
  'DX-Y.NYB', 'BIL', 'USDTRY=X'
];

const TIMEFRAMES = [
  { id: '1d', label: '1G', sub: 'Bugün', days: 1 },
  { id: '1w', label: '1H', sub: '5 Gün', days: 5 },
  { id: '1m', label: '1A', sub: '21 Gün', days: 21 },
  { id: '3m', label: '3A', sub: '63 Gün', days: 63 },
  { id: '6m', label: '6A', sub: '126 Gün', days: 126 },
  { id: 'ytd', label: 'YTD', sub: '2026', days: 250 }
];

export default function CapitalFlowTab({ onSelectStock }) {
  const { portfolioSummary, currentCurrency, usdtry } = useApp();
  const isTRY = currentCurrency === 'try';
  const sym = isTRY ? '₺' : '$';

  const [timeframe, setTimeframe] = useState('1w');
  const [viewMode, setViewMode] = useState('overview'); // 'overview' | 'race' | 'ratios' | 'tactical'
  const [candles, setCandles] = useState({});
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Fetch candles for all symbols
  const fetchAllFlowCandles = useCallback(async (force = false) => {
    setLoading(true);
    const results = {};
    try {
      // Check cached candles in sessionStorage if not forced
      if (!force) {
        try {
          const cached = sessionStorage.getItem('bloomberg_capital_flow_candles');
          const cacheTime = Number(sessionStorage.getItem('bloomberg_capital_flow_time') || 0);
          if (cached && Date.now() - cacheTime < 60000) {
            const parsed = JSON.parse(cached);
            if (Object.keys(parsed).length >= ALL_SYMBOLS.length - 2) {
              setCandles(parsed);
              setLastUpdated(new Date(cacheTime));
              setLoading(false);
              return;
            }
          }
        } catch (e) {}
      }

      // Batch fetch candles in chunks of 5
      const batchSize = 5;
      for (let i = 0; i < ALL_SYMBOLS.length; i += batchSize) {
        const batch = ALL_SYMBOLS.slice(i, i + batchSize);
        await Promise.all(
          batch.map(async (s) => {
            try {
              const res = await fetch(`/api/market?type=candles&symbol=${encodeURIComponent(s)}&interval=1d`);
              if (res.ok) {
                const json = await res.json();
                if (Array.isArray(json.candles) && json.candles.length > 0) {
                  results[s] = json.candles;
                }
              }
            } catch (err) {
              console.warn(`Candle fetch failed for ${s}:`, err);
            }
          })
        );
      }

      setCandles(results);
      setLastUpdated(new Date());
      try {
        sessionStorage.setItem('bloomberg_capital_flow_candles', JSON.stringify(results));
        sessionStorage.setItem('bloomberg_capital_flow_time', String(Date.now()));
      } catch (e) {}
    } catch (e) {
      console.error('Error fetching flow candles:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllFlowCandles();
  }, [fetchAllFlowCandles]);

  // Compute returns for any symbol across the selected timeframe
  const computeSymbolReturn = useCallback((ticker, tfId) => {
    const list = candles[ticker];
    if (!list || list.length < 2) return 0;

    const len = list.length;
    const lastClose = Number(list[len - 1].close || list[len - 1].price || 0);
    if (!lastClose) return 0;

    if (tfId === '1d') {
      const prevClose = Number(list[len - 2].close || list[len - 2].price || lastClose);
      return prevClose > 0 ? ((lastClose - prevClose) / prevClose) * 100 : 0;
    }

    if (tfId === 'ytd') {
      // Find candle closest to Jan 1, 2026
      const ytdCandle = list.find(c => String(c.time).startsWith('2026-01')) || list[0];
      const startClose = Number(ytdCandle?.close || lastClose);
      return startClose > 0 ? ((lastClose - startClose) / startClose) * 100 : 0;
    }

    const tfObj = TIMEFRAMES.find(t => t.id === tfId) || TIMEFRAMES[1];
    const lookback = Math.min(tfObj.days, len - 1);
    const startCandle = list[len - 1 - lookback] || list[0];
    const startClose = Number(startCandle?.close || lastClose);
    return startClose > 0 ? ((lastClose - startClose) / startClose) * 100 : 0;
  }, [candles]);

  // Calculate Asset Buckets Returns & Velocity
  const bucketMetrics = useMemo(() => {
    return ASSET_BUCKETS.map(bucket => {
      let compositeReturn = 0;
      let totalWeight = 0;

      const symbolStats = bucket.symbols.map(item => {
        const ret = computeSymbolReturn(item.ticker, timeframe);
        const candleList = candles[item.ticker] || [];
        const lastCandle = candleList[candleList.length - 1] || {};
        const price = Number(lastCandle.close || 0);

        compositeReturn += ret * item.weight;
        totalWeight += item.weight;

        return {
          ...item,
          returnPct: ret,
          price: price
        };
      });

      const finalReturn = totalWeight > 0 ? compositeReturn / totalWeight : 0;

      // Classification
      let flowStatus = 'neutral';
      let flowBadge = '⚖️ Nötr Akış';
      let badgeClass = 'text-slate-400';

      if (finalReturn > 1.2) {
        flowStatus = 'strong_inflow';
        flowBadge = '🟢 Güçlü Sermaye Girişi';
        badgeClass = 'text-emerald-400';
      } else if (finalReturn > 0.2) {
        flowStatus = 'mild_inflow';
        flowBadge = '🟢 Ilımlı Giriş';
        badgeClass = 'text-emerald-300';
      } else if (finalReturn < -1.2) {
        flowStatus = 'strong_outflow';
        flowBadge = '🔴 Güçlü Sermaye Çıkışı';
        badgeClass = 'text-rose-400';
      } else if (finalReturn < -0.2) {
        flowStatus = 'mild_outflow';
        flowBadge = '🔴 Çıkış Baskısı';
        badgeClass = 'text-rose-300';
      }

      return {
        ...bucket,
        returnPct: finalReturn,
        flowStatus,
        flowBadge,
        badgeClass,
        symbolStats
      };
    });
  }, [computeSymbolReturn, timeframe, candles]);

  // Sort buckets by return to determine Inflow Leader and Outflow Laggard
  const sortedBuckets = useMemo(() => {
    return [...bucketMetrics].sort((a, b) => b.returnPct - a.returnPct);
  }, [bucketMetrics]);

  const inflowLeader = sortedBuckets[0];
  const outflowLaggard = sortedBuckets[sortedBuckets.length - 1];

  // Algorithmic Macro Market Regime Detection
  const marketRegime = useMemo(() => {
    const eqRet = bucketMetrics.find(b => b.id === 'equities')?.returnPct || 0;
    const metRet = bucketMetrics.find(b => b.id === 'metals')?.returnPct || 0;
    const bndRet = bucketMetrics.find(b => b.id === 'bonds')?.returnPct || 0;
    const cryRet = bucketMetrics.find(b => b.id === 'crypto')?.returnPct || 0;
    const cshRet = bucketMetrics.find(b => b.id === 'cash')?.returnPct || 0;

    // Likidite & Risk İştahı Skoru (0 - 100)
    // Positive eq & crypto adds to score; strong cash & metals (defensive flight) lowers it
    let score = 50 + (eqRet * 4) + (cryRet * 2) - (metRet * 3) - (cshRet * 4) + (bndRet * 1.5);
    score = Math.max(5, Math.min(95, Math.round(score)));

    let regimeId = 'balanced';
    let title = '⚖️ DENGELİ / SEÇİCİ ROTASYON';
    let sub = 'Sermaye belirli bir varlık sınıfında kümelenmiyor; dengeli ve seçici hisse/varlık bazlı geçişler hakim.';
    let color = '#38bdf8';
    let bg = 'rgba(56, 189, 248, 0.1)';
    let tacticalAdvice = 'Mevcut dengeli varlık dağılımınızı koruyun; aşırı kaldıraç veya tek yönlü risk almaktan kaçının.';

    if (cryRet > 0.5 && eqRet > 0.2 && (eqRet > bndRet || cryRet > metRet)) {
      regimeId = 'risk_on';
      title = '🚀 RİSK-ON (BOLLUK & BÜYÜME REJİMİ)';
      sub = 'Küresel sermaye riskli varlıklara ve büyümeye koşuyor. Borsa ve Kripto liderlik ediyor, likidite genişliyor.';
      color = '#10b981';
      bg = 'rgba(16, 185, 129, 0.12)';
      tacticalAdvice = 'Büyüme hisselerinde ve teknoloji pozisyonlarında kârların koşmasına izin verin. Nakit oranını minimuma çekebilirsiniz.';
    } else if (metRet > 0.5 && (bndRet > eqRet || (eqRet < 0 && cryRet < 0))) {
      regimeId = 'risk_off';
      title = '🛡️ RİSK-OFF (GÜVENLİ LİMANA KAÇIŞ)';
      sub = 'Piyasada korku ve koruma refleksi hakim. Para hisselerden ve kriptodan kaçıp Altın, Değerli Madenler ve Tahvillere sığınıyor.';
      color = '#fbbf24';
      bg = 'rgba(251, 191, 36, 0.12)';
      tacticalAdvice = 'Hisse ağırlıklarında kâr realizasyonu yapın; Altın ve PPF/Nakit kalkanınızı güçlendirerek portföyü defansa çekin.';
    } else if (metRet > 1.5 && eqRet < -0.3 && bndRet < -0.3) {
      regimeId = 'stagflation';
      title = '🌪️ STAGFLASYON & EMTİA ŞOKU';
      sub = 'Enflasyon ve faiz baskısıyla kâğıt varlıklar (Hisse & Tahvil) erirken para somut emtiaya ve reel madenlere hücum ediyor.';
      color = '#f97316';
      bg = 'rgba(249, 115, 22, 0.12)';
      tacticalAdvice = 'Enflasyona dirençli reel varlıklara (Altın, Emtia, İhracatçı Sanayi) ağırlık verin; uzun vadeli tahvillerden uzak durun.';
    } else if (cshRet > 0.8 && eqRet < -0.5 && cryRet < -0.5 && metRet <= 0.2) {
      regimeId = 'cash_is_king';
      title = '💵 CASH IS KING (LİKİT SIKILAŞMA)';
      sub = 'Dolar Endeksi ve risksiz faiz yükseliyor. Küresel piyasalarda tüm riskli varlıklar satılarak nakde geçiş yaşanıyor.';
      color = '#ef4444';
      bg = 'rgba(239, 68, 68, 0.12)';
      tacticalAdvice = 'Nakit ve Para Piyasası Fonu (PPF) oranını azamiye çıkarın; piyasa taban yapana kadar yeni büyük alımları kademelendirin.';
    }

    return {
      regimeId,
      title,
      sub,
      color,
      bg,
      score,
      tacticalAdvice
    };
  }, [bucketMetrics]);

  // 5 Intermarket Relative Ratios (John Murphy Framework)
  const intermarketRatios = useMemo(() => {
    const pairs = [
      {
        id: 'spy_tlt',
        name: 'Hisse / Tahvil Oranı',
        symbolA: 'SPY',
        symbolB: 'TLT',
        desc: 'Risk İştahı vs. Resesyon Korkusu',
        bullishDesc: 'Sermaye tahvilden çıkıp borsaya koşuyor (Risk İştahı Yüksek)',
        bearishDesc: 'Sermaye borsadan kaçıp güvenli tahvillere sığınıyor (Defansif Kaçış)'
      },
      {
        id: 'spy_gld',
        name: 'Hisse / Altın Oranı',
        symbolA: 'SPY',
        symbolB: 'GLD',
        desc: 'Kâğıt Varlıklar vs. Somut Güvenli Liman',
        bullishDesc: 'Finansal büyüme ve kârlılık somut altından daha cazip',
        bearishDesc: 'Küresel sermaye kâğıt hisselerden çıkıp somut altına göç ediyor'
      },
      {
        id: 'btc_gld',
        name: 'Kripto / Altın Oranı',
        symbolA: 'BTC-USD',
        symbolB: 'GLD',
        desc: 'Dijital Likidite Beta vs. Klasik Sığınak',
        bullishDesc: 'Piyasada çılgın spekülatif likidite ve risk alma iştahı var',
        bearishDesc: 'Yatırımcılar spekülatif kripto yerine geleneksel altın zırhını tercih ediyor'
      },
      {
        id: 'copper_gold',
        name: 'Bakır / Altın Oranı (Dr. Copper)',
        symbolA: 'HG=F',
        symbolB: 'GLD',
        desc: 'Reel Sanayi Büyümesi vs. Kriz Barometresi',
        bullishDesc: 'Sanayi üretimi ve küresel ekonomik aktivite canlı',
        bearishDesc: 'Küresel sanayi durgunluğu veya jeopolitik kriz fiyatlanıyor'
      },
      {
        id: 'credit_stress',
        name: 'Kredi Güveni (HYG / LQD)',
        symbolA: 'HYG',
        symbolB: 'LQD',
        desc: 'Yüksek Getirili Kredi vs. Güvenli Şirket Tahvili',
        bullishDesc: 'Kredi piyasasında güven tam; şirket iflas riski fiyatlanmıyor',
        bearishDesc: '⚠️ Kredi piyasası sıkılaşıyor! (Borsa düşüşlerinden 2-3 hafta önce uyarır)'
      }
    ];

    return pairs.map(p => {
      const listA = candles[p.symbolA] || [];
      const listB = candles[p.symbolB] || [];

      if (listA.length < 20 || listB.length < 20) {
        return {
          ...p,
          currentRatio: 0,
          changePct: 0,
          status: 'neutral',
          signal: 'Veri Yükleniyor'
        };
      }

      // Build aligned ratio timeseries by matching dates
      const mapB = {};
      listB.forEach(c => { mapB[c.time] = Number(c.close || 0); });

      const ratioSeries = [];
      listA.forEach(cA => {
        const valB = mapB[cA.time];
        const valA = Number(cA.close || 0);
        if (valA > 0 && valB > 0) {
          ratioSeries.push({ time: cA.time, ratio: valA / valB });
        }
      });

      if (ratioSeries.length < 20) {
        return {
          ...p,
          currentRatio: 0,
          changePct: 0,
          status: 'neutral',
          signal: 'Yetersiz Seri'
        };
      }

      const rLen = ratioSeries.length;
      const currentRatio = ratioSeries[rLen - 1].ratio;

      // Period change based on timeframe
      const tfObj = TIMEFRAMES.find(t => t.id === timeframe) || TIMEFRAMES[1];
      const lookback = tfObj.id === '1d' ? 1 : Math.min(tfObj.days, rLen - 1);
      const startRatio = ratioSeries[rLen - 1 - lookback]?.ratio || ratioSeries[0].ratio;
      const changePct = startRatio > 0 ? ((currentRatio - startRatio) / startRatio) * 100 : 0;

      // 20-day Moving Average of the ratio
      const maWindow = Math.min(20, rLen);
      let sum = 0;
      for (let i = rLen - maWindow; i < rLen; i++) {
        sum += ratioSeries[i].ratio;
      }
      const ma20 = sum / maWindow;
      const isAboveMA = currentRatio >= ma20;

      let status = 'neutral';
      let signal = 'Nötr / Yatay';
      let signalColor = '#94a3b8';

      if (changePct > 0.5 && isAboveMA) {
        status = 'bullish';
        signal = `📈 ${p.symbolA} Lehine Güçlü Giriş`;
        signalColor = '#10b981';
      } else if (changePct < -0.5 && !isAboveMA) {
        status = 'bearish';
        signal = `📉 ${p.symbolB} Lehine Kaçış`;
        signalColor = '#ef4444';
      }

      return {
        ...p,
        currentRatio,
        changePct,
        ma20,
        isAboveMA,
        status,
        signal,
        signalColor,
        activeDesc: status === 'bullish' ? p.bullishDesc : (status === 'bearish' ? p.bearishDesc : 'İki varlık arasında dengeli rotasyon devam ediyor.')
      };
    });
  }, [candles, timeframe]);

  // Tactical Asset Allocation (TAA) Engine for User's Portfolio
  const tacticalPortfolio = useMemo(() => {
    const holdings = portfolioSummary?.enrichedHoldings || [];
    const totalVal = Number(isTRY ? portfolioSummary?.totalValTRY : portfolioSummary?.totalValUSD) || 1;
    const goldVal = Number(isTRY ? portfolioSummary?.totalGoldValTRY : (portfolioSummary?.totalGoldValUSD || 0)) || 0;
    const ppfVal = Number(isTRY ? portfolioSummary?.ppfBalanceTRY : (portfolioSummary?.ppfBalanceTRY / (usdtry || 49.03))) || 0;
    const cashVal = Number(isTRY ? portfolioSummary?.totalFreeCashTRY : (portfolioSummary?.totalFreeCashTRY / (usdtry || 49.03))) || 0;

    let stockVal = 0;
    let cryptoVal = 0;

    holdings.forEach(h => {
      const v = Number(isTRY ? h.valTRY : h.valUSD) || 0;
      const t = String(h.type || '').toLowerCase();
      if (t.includes('kripto') || h.ticker?.includes('BTC') || h.ticker?.includes('ETH')) {
        cryptoVal += v;
      } else if (!t.includes('altın') && !h.ticker?.includes('XAUT')) {
        stockVal += v;
      }
    });

    const safeCash = ppfVal + cashVal;

    const wStock = (stockVal / totalVal) * 100;
    const wGold = (goldVal / totalVal) * 100;
    const wCrypto = (cryptoVal / totalVal) * 100;
    const wCash = (safeCash / totalVal) * 100;

    // Model target weights based on Active Market Regime
    let target = { stock: 55, gold: 20, cash: 20, crypto: 5 };

    if (marketRegime.regimeId === 'risk_on') {
      target = { stock: 65, gold: 12, cash: 13, crypto: 10 };
    } else if (marketRegime.regimeId === 'risk_off') {
      target = { stock: 40, gold: 35, cash: 22, crypto: 3 };
    } else if (marketRegime.regimeId === 'stagflation') {
      target = { stock: 35, gold: 40, cash: 22, crypto: 3 };
    } else if (marketRegime.regimeId === 'cash_is_king') {
      target = { stock: 30, gold: 25, cash: 43, crypto: 2 };
    }

    const rows = [
      {
        name: 'Hisse Senetleri & Borsa',
        icon: '🏢',
        currentVal: stockVal,
        currentWeight: wStock,
        targetWeight: target.stock,
        diff: wStock - target.stock,
        color: '#38bdf8'
      },
      {
        name: 'Değerli Madenler (Altın/Gümüş)',
        icon: '🛡️',
        currentVal: goldVal,
        currentWeight: wGold,
        targetWeight: target.gold,
        diff: wGold - target.gold,
        color: '#fbbf24'
      },
      {
        name: 'Nakit, PPF & Kısa Tahvil',
        icon: '💵',
        currentVal: safeCash,
        currentWeight: wCash,
        targetWeight: target.cash,
        diff: wCash - target.cash,
        color: '#e2e8f0'
      },
      {
        name: 'Kripto & Yüksek Beta',
        icon: '⚡',
        currentVal: cryptoVal,
        currentWeight: wCrypto,
        targetWeight: target.crypto,
        diff: wCrypto - target.crypto,
        color: '#10b981'
      }
    ];

    return {
      totalVal,
      rows,
      target
    };
  }, [portfolioSummary, isTRY, usdtry, marketRegime]);

  // Chart.js Data for Cross-Asset Race
  const chartData = useMemo(() => {
    // Find common date labels
    const refCandles = candles['SPY'] || candles['GLD'] || [];
    if (refCandles.length === 0) return { labels: [], datasets: [] };

    const tfObj = TIMEFRAMES.find(t => t.id === timeframe) || TIMEFRAMES[1];
    let lookback = tfObj.days;
    if (timeframe === '1d') lookback = 2;
    if (timeframe === 'ytd') lookback = 250;

    const sliceCount = Math.min(lookback, refCandles.length);
    const dateSlice = refCandles.slice(-sliceCount);
    const labels = dateSlice.map(c => {
      const parts = String(c.time).split('-');
      return parts.length >= 3 ? `${parts[2]}.${parts[1]}` : c.time;
    });

    const datasets = ASSET_BUCKETS.map(bucket => {
      // Use main representative symbol for the line curve
      const mainSymbol = bucket.symbols[0].ticker;
      const sCandles = candles[mainSymbol] || [];
      const sSlice = sCandles.slice(-sliceCount);

      if (sSlice.length === 0) return null;

      const basePrice = Number(sSlice[0]?.close || sSlice[0]?.price || 1);
      const dataPoints = sSlice.map(c => {
        const p = Number(c.close || c.price || basePrice);
        return Number((((p - basePrice) / basePrice) * 100).toFixed(2));
      });

      return {
        label: bucket.name,
        data: dataPoints,
        borderColor: bucket.color,
        backgroundColor: bucket.bgRgba,
        borderWidth: 2.2,
        pointRadius: 0,
        pointHoverRadius: 5,
        tension: 0.25,
        fill: false
      };
    }).filter(Boolean);

    return {
      labels,
      datasets
    };
  }, [candles, timeframe]);

  const chartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false
    },
    plugins: {
      legend: {
        position: 'top',
        align: 'end',
        labels: {
          boxWidth: 12,
          boxHeight: 12,
          usePointStyle: true,
          pointStyle: 'circle',
          color: '#cbd5e1',
          font: { family: 'monospace', size: 11, weight: '600' }
        }
      },
      tooltip: {
        backgroundColor: 'rgba(7, 10, 19, 0.95)',
        titleColor: '#f8fafc',
        bodyColor: '#e2e8f0',
        borderColor: 'rgba(255, 255, 255, 0.15)',
        borderWidth: 1,
        padding: 12,
        titleFont: { family: 'monospace', size: 12, weight: 'bold' },
        bodyFont: { family: 'monospace', size: 11 },
        callbacks: {
          label: (ctx) => {
            const val = ctx.parsed.y;
            const sign = val > 0 ? '+' : '';
            return ` ${ctx.dataset.label}: ${sign}${val.toFixed(2)}%`;
          }
        }
      }
    },
    scales: {
      x: {
        grid: { color: 'rgba(255, 255, 255, 0.04)' },
        ticks: { color: '#64748b', font: { family: 'monospace', size: 10 } }
      },
      y: {
        grid: { color: 'rgba(255, 255, 255, 0.06)' },
        ticks: {
          color: '#94a3b8',
          font: { family: 'monospace', size: 10 },
          callback: (v) => `${v > 0 ? '+' : ''}${v}%`
        }
      }
    }
  }), []);

  return (
    <div className="capital-flow-tab" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* 1. HEADER & CONTROL TOOLBAR */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 12,
        paddingBottom: 14,
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 38,
            height: 38,
            borderRadius: 8,
            background: 'linear-gradient(135deg, rgba(0, 229, 255, 0.2), rgba(16, 185, 129, 0.2))',
            border: '1px solid rgba(0, 229, 255, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#00e5ff'
          }}>
            <Waves size={22} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h1 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#f8fafc', margin: 0, letterSpacing: '-0.02em' }}>
                SERMAYE AKIŞI & LİKİDİTE RADARI
              </h1>
              <span style={{
                background: 'rgba(0, 229, 255, 0.15)',
                color: '#00e5ff',
                fontSize: '0.68rem',
                fontWeight: 800,
                padding: '2px 8px',
                borderRadius: 4,
                border: '1px solid rgba(0, 229, 255, 0.3)'
              }}>
                ROTASYON & REJİM MOTORU
              </span>
            </div>
            <p style={{ fontSize: '0.78rem', color: '#94a3b8', margin: '3px 0 0 0' }}>
              Küresel likiditenin hangi varlık havuzuna aktığını ölçen kurumsal sermaye göçü ve taktiksel pozisyonlama kokpiti.
            </p>
          </div>
        </div>

        {/* Toolbar Controls: Timeframe & Refresh */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {/* Sub-view Switcher */}
          <div style={{
            display: 'flex',
            background: 'rgba(0,0,0,0.4)',
            padding: 3,
            borderRadius: 6,
            border: '1px solid rgba(255,255,255,0.08)'
          }}>
            {[
              { id: 'overview', label: 'Genel Bakış', icon: Waves },
              { id: 'race', label: 'Varlık Yarışı', icon: BarChart3 },
              { id: 'ratios', label: '5 Altın Oran', icon: Sliders },
              { id: 'tactical', label: 'Taktiksel Portföy', icon: PieChart }
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = viewMode === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setViewMode(tab.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    padding: '6px 11px',
                    fontSize: '0.74rem',
                    fontWeight: isActive ? 800 : 600,
                    borderRadius: 4,
                    border: 'none',
                    cursor: 'pointer',
                    background: isActive ? 'rgba(0, 229, 255, 0.2)' : 'transparent',
                    color: isActive ? '#00e5ff' : '#94a3b8',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <Icon size={13} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Timeframe Buttons */}
          <div style={{
            display: 'flex',
            background: 'rgba(0,0,0,0.4)',
            padding: 3,
            borderRadius: 6,
            border: '1px solid rgba(255,255,255,0.08)'
          }}>
            {TIMEFRAMES.map(tf => {
              const isActive = timeframe === tf.id;
              return (
                <button
                  key={tf.id}
                  type="button"
                  onClick={() => setTimeframe(tf.id)}
                  style={{
                    padding: '5px 9px',
                    fontSize: '0.72rem',
                    fontWeight: isActive ? 800 : 600,
                    borderRadius: 4,
                    border: 'none',
                    cursor: 'pointer',
                    background: isActive ? '#f59e0b' : 'transparent',
                    color: isActive ? '#000' : '#cbd5e1',
                    fontFamily: 'monospace',
                    transition: 'all 0.15s ease'
                  }}
                  title={tf.sub}
                >
                  {tf.label}
                </button>
              );
            })}
          </div>

          {/* Refresh Button */}
          <button
            type="button"
            onClick={() => fetchAllFlowCandles(true)}
            disabled={loading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              padding: '6px 10px',
              fontSize: '0.74rem',
              fontWeight: 700,
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: 6,
              color: '#e2e8f0',
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
            title="Verileri canlı güncelle"
          >
            <RefreshCw size={13} className={loading ? 'spin' : ''} />
            <span style={{ fontFamily: 'monospace' }}>{loading ? 'Yükleniyor...' : 'Yenile'}</span>
          </button>
        </div>
      </div>

      {/* 2. DOMINANT REGIME & CAPITAL FLOW COCKPIT BANNER */}
      <div style={{
        background: `linear-gradient(135deg, ${marketRegime.bg}, rgba(11, 17, 32, 0.85))`,
        border: `1px solid ${marketRegime.color}40`,
        borderRadius: 10,
        padding: '16px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        boxShadow: `0 8px 24px -6px ${marketRegime.color}25`
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#94a3b8', letterSpacing: '0.06em' }}>
                AKTİF PİYASA REJİMİ & LİKİDİTE TEŞHİSİ ({TIMEFRAMES.find(t => t.id === timeframe)?.sub.toUpperCase()})
              </span>
              <span style={{
                background: marketRegime.color,
                color: '#000',
                fontSize: '0.66rem',
                fontWeight: 900,
                padding: '2px 7px',
                borderRadius: 3
              }}>
                CANLI ROTASYON
              </span>
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 900, color: marketRegime.color, letterSpacing: '-0.01em' }}>
              {marketRegime.title}
            </div>
            <div style={{ fontSize: '0.82rem', color: '#e2e8f0', maxWidth: 780, lineHeight: 1.45 }}>
              {marketRegime.sub}
            </div>
          </div>

          {/* Liquidity & Sentiment Meter Gauge */}
          <div style={{
            background: 'rgba(0, 0, 0, 0.45)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: 8,
            padding: '10px 16px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 6,
            minWidth: 200
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', fontSize: '0.72rem', color: '#94a3b8', fontWeight: 700 }}>
              <span>Risk İştahı Skoru</span>
              <span style={{ fontFamily: 'monospace', fontWeight: 900, color: marketRegime.color }}>
                {marketRegime.score} / 100
              </span>
            </div>
            {/* Visual Meter Bar */}
            <div style={{ width: '100%', height: 7, background: 'rgba(255, 255, 255, 0.1)', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{
                width: `${marketRegime.score}%`,
                height: '100%',
                background: `linear-gradient(90deg, #ef4444 0%, #fbbf24 45%, #10b981 100%)`,
                transition: 'width 0.4s ease'
              }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', fontSize: '0.62rem', color: '#64748b' }}>
              <span>Savunma (Korku)</span>
              <span>Nötr</span>
              <span>Coşku (Risk-On)</span>
            </div>
          </div>
        </div>

        {/* Quick Inflow Leader & Outflow Laggard Bar */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 12,
          paddingTop: 10,
          borderTop: '1px solid rgba(255, 255, 255, 0.08)'
        }}>
          {/* Leader */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(16, 185, 129, 0.08)',
            border: '1px solid rgba(16, 185, 129, 0.25)',
            borderRadius: 6,
            padding: '8px 12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: '1.2rem' }}>{inflowLeader?.icon}</span>
              <div>
                <div style={{ fontSize: '0.68rem', color: '#86efac', fontWeight: 700 }}>EN ÇOK SERMAYE ÇEKEN</div>
                <div style={{ fontSize: '0.84rem', fontWeight: 800, color: '#f8fafc' }}>{inflowLeader?.name}</div>
              </div>
            </div>
            <span style={{
              fontFamily: 'monospace',
              fontWeight: 900,
              fontSize: '1rem',
              color: '#10b981'
            }}>
              +{inflowLeader?.returnPct.toFixed(2)}%
            </span>
          </div>

          {/* Laggard */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            borderRadius: 6,
            padding: '8px 12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: '1.2rem' }}>{outflowLaggard?.icon}</span>
              <div>
                <div style={{ fontSize: '0.68rem', color: '#fca5a5', fontWeight: 700 }}>SERMAYENİN KAÇTIĞI HAVUZ</div>
                <div style={{ fontSize: '0.84rem', fontWeight: 800, color: '#f8fafc' }}>{outflowLaggard?.name}</div>
              </div>
            </div>
            <span style={{
              fontFamily: 'monospace',
              fontWeight: 900,
              fontSize: '1rem',
              color: '#ef4444'
            }}>
              {outflowLaggard?.returnPct > 0 ? '+' : ''}{outflowLaggard?.returnPct.toFixed(2)}%
            </span>
          </div>
        </div>
      </div>

      {/* 3. MAIN CONTENT BASED ON VIEW MODE */}

      {/* VIEW 1: OVERVIEW & 5 ASSET CLASS CARDS */}
      {viewMode === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Compass size={16} style={{ color: '#00e5ff' }} />
              <h2 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#f8fafc', margin: 0 }}>
                5 BÜYÜK SERMAYE HAVUZU (VARLIK SINIFI AKIŞ MATRİSİ)
              </h2>
            </div>
            <span style={{ fontSize: '0.74rem', color: '#64748b', fontFamily: 'monospace' }}>
              Seçili Dönem: {TIMEFRAMES.find(t => t.id === timeframe)?.sub}
            </span>
          </div>

          {/* 5 Cards Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
            gap: 12
          }}>
            {sortedBuckets.map((bucket, idx) => {
              const isPositive = bucket.returnPct >= 0;
              return (
                <div
                  key={bucket.id}
                  style={{
                    background: '#0a0e1a',
                    border: `1px solid ${bucket.returnPct > 0 ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                    borderRadius: 8,
                    padding: '14px 14px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: 12,
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                >
                  {/* Top Rank Badge */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: '1.4rem' }}>{bucket.icon}</span>
                      <div>
                        <div style={{ fontSize: '0.86rem', fontWeight: 800, color: '#f8fafc' }}>
                          {bucket.name}
                        </div>
                        <div style={{ fontSize: '0.68rem', color: '#64748b' }}>
                          {bucket.roleDesc}
                        </div>
                      </div>
                    </div>
                    <span style={{
                      fontSize: '0.68rem',
                      fontWeight: 800,
                      padding: '2px 6px',
                      borderRadius: 4,
                      background: 'rgba(255,255,255,0.06)',
                      color: '#94a3b8',
                      fontFamily: 'monospace'
                    }}>
                      #{idx + 1}
                    </span>
                  </div>

                  {/* Flow Return & Velocity Bar */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600 }}>Dönemsel Net Akış</span>
                      <span style={{
                        fontFamily: 'monospace',
                        fontWeight: 900,
                        fontSize: '1.25rem',
                        color: isPositive ? '#10b981' : '#ef4444'
                      }}>
                        {isPositive ? '+' : ''}{bucket.returnPct.toFixed(2)}%
                      </span>
                    </div>

                    {/* Progress velocity track */}
                    <div style={{
                      width: '100%',
                      height: 5,
                      background: 'rgba(255,255,255,0.06)',
                      borderRadius: 3,
                      margin: '6px 0 10px 0',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        width: `${Math.min(100, Math.max(8, Math.abs(bucket.returnPct) * 12))}%`,
                        height: '100%',
                        background: isPositive ? '#10b981' : '#ef4444',
                        borderRadius: 3,
                        transition: 'width 0.3s ease'
                      }} />
                    </div>

                    <div style={{
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      color: isPositive ? '#86efac' : '#fca5a5'
                    }}>
                      {bucket.flowBadge}
                    </div>
                  </div>

                  {/* Internal Asset Components */}
                  <div style={{
                    paddingTop: 8,
                    borderTop: '1px solid rgba(255,255,255,0.06)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 4
                  }}>
                    {bucket.symbolStats.map(s => (
                      <div
                        key={s.ticker}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          fontSize: '0.72rem',
                          fontFamily: 'monospace'
                        }}
                      >
                        <span style={{ color: '#cbd5e1' }}>{s.ticker}</span>
                        <span style={{
                          color: s.returnPct >= 0 ? '#10b981' : '#ef4444',
                          fontWeight: 700
                        }}>
                          {s.returnPct >= 0 ? '+' : ''}{s.returnPct.toFixed(2)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick Cross-Asset Mini Summary Banner */}
          <div style={{
            background: '#090d18',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 8,
            padding: '14px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Info size={18} style={{ color: '#38bdf8' }} />
              <div>
                <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#f8fafc' }}>
                  Sermaye Rotasyonu Kuralı (Ray Dalio & John Murphy İlkesi)
                </div>
                <div style={{ fontSize: '0.74rem', color: '#94a3b8' }}>
                  Para hiçbir zaman yok olmaz; bir havuzdan diğerine göç eder. Enflasyon veya kriz anlarında Altın ve Emtiaya, faiz indirimlerinde Hisselere ve Kriptoya akar.
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setViewMode('tactical')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '7px 14px',
                background: 'rgba(0, 229, 255, 0.15)',
                border: '1px solid rgba(0, 229, 255, 0.4)',
                borderRadius: 6,
                color: '#00e5ff',
                fontSize: '0.76rem',
                fontWeight: 800,
                cursor: 'pointer'
              }}
            >
              <span>Portföyünüzü Bu Rejime Uyarla</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* VIEW 2: CROSS-ASSET RACE CHART */}
      {viewMode === 'race' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h2 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#f8fafc', margin: 0 }}>
                KÜRESEL LİKİDİTE YARIŞI (GÖRECELİ GETİRİ % GRAFİĞİ)
              </h2>
              <p style={{ fontSize: '0.74rem', color: '#94a3b8', margin: '2px 0 0 0' }}>
                Seçilen dönemin başlangıç noktasından (0%) bugüne kadar 5 varlık sınıfının sermaye çekme yarışı.
              </p>
            </div>
            <div style={{ display: 'flex', gap: 8, fontSize: '0.72rem', fontFamily: 'monospace' }}>
              <span style={{ color: '#38bdf8' }}>● Hisse (SPY)</span>
              <span style={{ color: '#fbbf24' }}>● Altın (GLD)</span>
              <span style={{ color: '#a855f7' }}>● Tahvil (TLT)</span>
              <span style={{ color: '#10b981' }}>● Kripto (BTC)</span>
              <span style={{ color: '#e2e8f0' }}>● Dolar (DXY)</span>
            </div>
          </div>

          <div style={{
            background: '#070a13',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: 8,
            padding: '16px 14px',
            height: 380
          }}>
            <Line data={chartData} options={chartOptions} />
          </div>
        </div>
      )}

      {/* VIEW 3: 5 INTERMARKET RELATIVE RATIOS */}
      {viewMode === 'ratios' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <h2 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#f8fafc', margin: 0 }}>
              5 ALTIN ÇAPRAZ ORAN (INTERMARKET RATIOS)
            </h2>
            <p style={{ fontSize: '0.74rem', color: '#94a3b8', margin: '2px 0 0 0' }}>
              Paranın yönünü netleştiren en güçlü göstergeler çapraz rasyolardır. 20 günlük hareketli ortalamasına göre trend yönü test edilir.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 12 }}>
            {intermarketRatios.map(r => {
              const isUp = r.changePct >= 0;
              return (
                <div
                  key={r.id}
                  style={{
                    background: '#0a0e1a',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: 8,
                    padding: '14px 16px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: 12
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: '0.92rem', fontWeight: 900, color: '#f8fafc' }}>
                          {r.name}
                        </span>
                        <span style={{
                          fontSize: '0.66rem',
                          fontFamily: 'monospace',
                          color: '#00e5ff',
                          background: 'rgba(0, 229, 255, 0.1)',
                          padding: '1px 5px',
                          borderRadius: 3
                        }}>
                          {r.symbolA} / {r.symbolB}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: 2 }}>
                        {r.desc}
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontFamily: 'monospace', fontSize: '1.05rem', fontWeight: 900, color: '#e2e8f0' }}>
                        {r.currentRatio > 0 ? r.currentRatio.toFixed(3) : '—'}
                      </div>
                      <div style={{
                        fontFamily: 'monospace',
                        fontSize: '0.74rem',
                        fontWeight: 800,
                        color: isUp ? '#10b981' : '#ef4444'
                      }}>
                        {isUp ? '+' : ''}{r.changePct.toFixed(2)}%
                      </div>
                    </div>
                  </div>

                  {/* Signal Box */}
                  <div style={{
                    background: 'rgba(0, 0, 0, 0.4)',
                    border: `1px solid ${r.signalColor}40`,
                    borderRadius: 6,
                    padding: '8px 10px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 3
                  }}>
                    <div style={{ fontSize: '0.76rem', fontWeight: 800, color: r.signalColor }}>
                      {r.signal}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: '#cbd5e1', lineHeight: 1.35 }}>
                      {r.activeDesc}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW 4: TACTICAL ASSET ALLOCATION (TAA) COCKPIT */}
      {viewMode === 'tactical' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <div>
              <h2 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#f8fafc', margin: 0 }}>
                TAKTIKSEL PORTFÖY POZİSYONLAMA (TAA) KOKPİTİ
              </h2>
              <p style={{ fontSize: '0.74rem', color: '#94a3b8', margin: '2px 0 0 0' }}>
                Mevcut portföyünüzün varlık dağılımı ile aktif makro rejimin tavsiye ettiği kurumsal hedef dağılım kıyası.
              </p>
            </div>
            <div style={{
              background: 'rgba(0,0,0,0.4)',
              border: '1px solid rgba(255,255,255,0.08)',
              padding: '6px 12px',
              borderRadius: 6,
              fontSize: '0.76rem',
              fontFamily: 'monospace',
              color: '#94a3b8'
            }}>
              Konsolide Portföy Değeri: <strong style={{ color: '#f8fafc' }}>{sym}{Math.round(tacticalPortfolio.totalVal).toLocaleString('tr-TR')}</strong>
            </div>
          </div>

          {/* Action Advice Box */}
          <div style={{
            background: 'rgba(16, 185, 129, 0.08)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: 8,
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: 12
          }}>
            <Sparkles size={20} style={{ color: '#10b981', flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#86efac' }}>
                Algoritmik Rejim Tavsiyesi: {marketRegime.title}
              </div>
              <div style={{ fontSize: '0.76rem', color: '#e2e8f0', marginTop: 2 }}>
                {marketRegime.tacticalAdvice}
              </div>
            </div>
          </div>

          {/* Asset Allocation Table */}
          <div style={{
            background: '#070a13',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: 8,
            overflow: 'hidden'
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
              <thead>
                <tr style={{ background: '#0a0e1a', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', color: '#94a3b8', textAlign: 'left' }}>
                  <th style={{ padding: '10px 14px' }}>Varlık Sınıfı</th>
                  <th style={{ padding: '10px 14px', textAlign: 'right' }}>Mevcut Değer</th>
                  <th style={{ padding: '10px 14px', textAlign: 'right' }}>Mevcut Pay %</th>
                  <th style={{ padding: '10px 14px', textAlign: 'right' }}>Rejim Hedefi %</th>
                  <th style={{ padding: '10px 14px', textAlign: 'center' }}>Sapma & Taktiksel Aksiyon</th>
                </tr>
              </thead>
              <tbody>
                {tacticalPortfolio.rows.map(row => {
                  const isOver = row.diff > 3.0;
                  const isUnder = row.diff < -3.0;
                  const isBalanced = !isOver && !isUnder;

                  return (
                    <tr key={row.name} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                      <td style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, color: '#f8fafc' }}>
                        <span>{row.icon}</span>
                        <span>{row.name}</span>
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: '#e2e8f0' }}>
                        {sym}{Math.round(row.currentVal).toLocaleString('tr-TR')}
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 800, color: row.color }}>
                        %{row.currentWeight.toFixed(1)}
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 800, color: '#94a3b8' }}>
                        %{row.targetWeight.toFixed(1)}
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                        {isOver && (
                          <span style={{
                            background: 'rgba(239, 68, 68, 0.15)',
                            color: '#ef4444',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            padding: '3px 8px',
                            borderRadius: 4,
                            fontSize: '0.72rem',
                            fontWeight: 800
                          }}>
                            🚨 +%{row.diff.toFixed(1)} Fazla (Kâr Al / Azalt)
                          </span>
                        )}
                        {isUnder && (
                          <span style={{
                            background: 'rgba(251, 191, 36, 0.15)',
                            color: '#fbbf24',
                            border: '1px solid rgba(251, 191, 36, 0.3)',
                            padding: '3px 8px',
                            borderRadius: 4,
                            fontSize: '0.72rem',
                            fontWeight: 800
                          }}>
                            🛡️ %{Math.abs(row.diff).toFixed(1)} Eksik (Kalkanı Güçlendir)
                          </span>
                        )}
                        {isBalanced && (
                          <span style={{
                            background: 'rgba(16, 185, 129, 0.15)',
                            color: '#10b981',
                            border: '1px solid rgba(16, 185, 129, 0.3)',
                            padding: '3px 8px',
                            borderRadius: 4,
                            fontSize: '0.72rem',
                            fontWeight: 800
                          }}>
                            🟢 İdeal / Dengeli
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
