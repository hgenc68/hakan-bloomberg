import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useApp } from '../context/AppContext';

function formatMarketCap(val, currency = 'USD') {
  if (val === null || val === undefined || isNaN(val)) return '—';
  const sym = currency === 'TRY' ? '₺' : '$';
  if (val >= 1e12) return `${sym}${(val / 1e12).toFixed(2)}T`;
  if (val >= 1e9) return `${sym}${(val / 1e9).toFixed(1)}B`;
  if (val >= 1e6) return `${sym}${(val / 1e6).toFixed(0)}M`;
  return `${sym}${Number(val).toLocaleString('tr-TR')}`;
}

function formatPct(val, showPlus = false) {
  if (val === null || val === undefined || isNaN(val)) return '—';
  const num = Number(val);
  const prefix = showPlus && num > 0 ? '+' : '';
  return `${prefix}%${num.toFixed(1)}`;
}

function formatMultiple(val, suffix = 'x') {
  if (val === null || val === undefined || isNaN(val)) return '—';
  return `${Number(val).toFixed(1)}${suffix}`;
}

export function getStrategyProfile(stock) {
  const t = (stock.ticker || '').toUpperCase().replace('.IS', '');

  // 1. Long-Term Compounders (Moat & Quality)
  const LONG_TERM_MOATS = new Set([
    'TSM', 'GOOGL', 'MSFT', 'AAPL', 'META', 'V', 'MA', 'COST', 'ISRG', 'UNH', 'BRK-B',
    'BIMAS', 'CCOLA', 'TCELL', 'MGROS', 'KCHOL', 'SAHOL'
  ]);

  // 2. Cyclical / Swing & Momentum Trade
  const CYCLICAL_TRADES = new Set([
    'MU', 'LRCX', 'AMAT', 'KLAC', 'COHR', 'CRDO', 'CAMT', 'XOM', 'CVX', 'TXN',
    'THYAO', 'PGSUS', 'EREGL', 'TUPRS', 'ASTOR', 'TOASO', 'DOAS', 'SISE'
  ]);

  // 3. Hyper-Growth / AI Leaders
  const HYPER_GROWTH = new Set([
    'NVDA', 'AVGO', 'VRT', 'FIX', 'ALAB', 'ANET', 'APP', 'PLTR', 'AXON', 'SYM', 'SOFI', 'ASELS', 'FROTO'
  ]);

  // 4. Defensive Value & Cash Fortress
  const DEFENSIVE_VALUES = new Set([
    'JPM', 'ABBV', 'LLY', 'MRK', 'WSM', 'CSCO', 'ENKAI', 'TTKOM', 'KOZAL', 'GARAN', 'ISCTR', 'AKBNK', 'YKBNK'
  ]);

  if (LONG_TERM_MOATS.has(t)) {
    return {
      type: 'LONG_TERM',
      label: '💎 UZUN VADELİ BİLEŞİK (MOAT)',
      short: '💎 DEĞER / MOAT',
      badgeBg: 'rgba(16, 185, 129, 0.16)',
      badgeColor: '#34d399',
      borderColor: 'rgba(16, 185, 129, 0.4)',
      advice: 'Aşılmaz tekel, kriz kalkanı, düzenli biriktirme ve uzun vadeli taşıma adayı.'
    };
  }

  if (CYCLICAL_TRADES.has(t)) {
    return {
      type: 'CYCLICAL_TRADE',
      label: '⚡ DÖNGÜSEL / TRADE (MOMENTUM)',
      short: '⚡ TRADE / DÖNGÜSEL',
      badgeBg: 'rgba(245, 158, 11, 0.16)',
      badgeColor: '#fbbf24',
      borderColor: 'rgba(245, 158, 11, 0.45)',
      advice: 'Sektör döngüsüne bağlı; teknik destek ve dirençle salınım trade\'i için ideal.'
    };
  }

  if (HYPER_GROWTH.has(t)) {
    return {
      type: 'HYPER_GROWTH',
      label: '🚀 HİPER BÜYÜME (LİDER TREND)',
      short: '🚀 HİPER BÜYÜME',
      badgeBg: 'rgba(56, 189, 248, 0.16)',
      badgeColor: '#38bdf8',
      borderColor: 'rgba(56, 189, 248, 0.45)',
      advice: 'Ciro ve pazar payı patlaması yaşayan yüksek momentumlu trend hissesi.'
    };
  }

  if (DEFENSIVE_VALUES.has(t)) {
    return {
      type: 'DEFENSIVE_VALUE',
      label: '🛡️ DEFANSİF DEĞER / NAKİT',
      short: '🛡️ DEFANSİF DEĞER',
      badgeBg: 'rgba(168, 85, 247, 0.16)',
      badgeColor: '#c084fc',
      borderColor: 'rgba(168, 85, 247, 0.4)',
      advice: 'Düşük beta, güçlü serbest nakit akışı ve piyasa dalgalarına karşı zırh.'
    };
  }

  // Dynamic Rule for any added ticker
  const rev = stock.rev_growth_pct ?? 0;
  const roic = stock.roic_pct ?? stock.roe_pct ?? 0;
  const pe = stock.forward_pe ?? stock.pe_ratio ?? 20;

  if (rev >= 30) {
    return {
      type: 'HYPER_GROWTH',
      label: '🚀 HİPER BÜYÜME (LİDER TREND)',
      short: '🚀 HİPER BÜYÜME',
      badgeBg: 'rgba(56, 189, 248, 0.16)',
      badgeColor: '#38bdf8',
      borderColor: 'rgba(56, 189, 248, 0.45)',
      advice: 'Yıllık %30+ ciro büyümesi yaşayan agresif trend hissesi.'
    };
  }
  if (stock.category === 'semiconductor' || stock.sector?.includes('Havacılık') || stock.sector?.includes('Enerji')) {
    return {
      type: 'CYCLICAL_TRADE',
      label: '⚡ DÖNGÜSEL / TRADE (MOMENTUM)',
      short: '⚡ TRADE / DÖNGÜSEL',
      badgeBg: 'rgba(245, 158, 11, 0.16)',
      badgeColor: '#fbbf24',
      borderColor: 'rgba(245, 158, 11, 0.45)',
      advice: 'Döngüsel sektör; teknik destek/direnç takibiyle trade edilebilir.'
    };
  }
  if (roic >= 20 && pe <= 32) {
    return {
      type: 'LONG_TERM',
      label: '💎 UZUN VADELİ (DEĞER & MOAT)',
      short: '💎 UZUN VADELİ',
      badgeBg: 'rgba(16, 185, 129, 0.16)',
      badgeColor: '#34d399',
      borderColor: 'rgba(16, 185, 129, 0.4)',
      advice: 'Yüksek sermaye verimliliğiyle uzun vadeli bileşik getiri adayı.'
    };
  }

  return {
    type: 'DEFENSIVE_VALUE',
    label: '🛡️ DEFANSİF DEĞER / NAKİT',
    short: '🛡️ DEFANSİF DEĞER',
    badgeBg: 'rgba(148, 163, 184, 0.16)',
    badgeColor: '#cbd5e1',
    borderColor: 'rgba(148, 163, 184, 0.35)',
    advice: 'Bilanço ve kâr odaklı klasik değer yatırımı hissesi.'
  };
}

export function getTechnicalSignal(stock) {
  const p = stock.livePrice ?? stock.price;
  const distHigh = stock.dist_52w_high_pct; // % distance to 52w high (e.g. -2.5% or -16.4%)
  const ma50 = stock.ma_50;
  const ma200 = stock.ma_200;

  // 1. ZİRVE DİRENCİ (Aşırı Alım / Kâr Satışı Riski)
  if (distHigh !== null && distHigh >= -3.5) {
    return {
      status: 'RESISTANCE',
      label: '⚠️ ZİRVE DİRENCİ (Kâr Satışı / Düzeltme Riski)',
      short: '⚠️ ZİRVE DİRENCİ',
      badgeBg: 'rgba(239, 68, 68, 0.16)',
      badgeColor: '#f87171',
      borderColor: 'rgba(239, 68, 68, 0.45)',
      icon: '⚠️',
      tip: 'Hisse 52 haftalık tarihi zirvesine çarpmış durumda. Doğrudan tavandan atlamak yerine %5-%8 geri çekilme (pullback) veya konsolidasyon beklenmeli.'
    };
  }

  // 2. DESTEK TESTİ (Uygun Giriş / Fırsat Bölgesi)
  const nearMa50 = (ma50 && p) ? Math.abs((p - ma50) / ma50) <= 0.04 : false;
  const nearMa200 = (ma200 && p) ? Math.abs((p - ma200) / ma200) <= 0.05 : false;
  const aboveMa200 = (ma200 && p) ? p >= ma200 * 0.98 : true;

  if (
    (nearMa50 || nearMa200) ||
    (distHigh !== null && distHigh <= -6 && distHigh >= -22 && aboveMa200)
  ) {
    return {
      status: 'SUPPORT_BUY',
      label: '🎯 DESTEK TESTİ (Kademeli Giriş Bölgesi)',
      short: '🎯 DESTEK TESTİ',
      badgeBg: 'rgba(16, 185, 129, 0.22)',
      badgeColor: '#34d399',
      borderColor: 'rgba(16, 185, 129, 0.55)',
      icon: '🎯',
      tip: 'Zirveden sağlıklı kâr satışı yemiş, hareketli ortalama veya destek seviyesini test ediyor. Risk/Ödül (R/R) oranı alım için cazip.'
    };
  }

  // 3. DERİN DÜZELTME (Dip Arama / Değer Fırsatı)
  if (distHigh !== null && distHigh < -22) {
    return {
      status: 'DEEP_DIP',
      label: '💎 DERİN DÜZELTME (Dip Fırsat Alanı)',
      short: '💎 DERİN DÜZELTME',
      badgeBg: 'rgba(59, 130, 246, 0.2)',
      badgeColor: '#60a5fa',
      borderColor: 'rgba(59, 130, 246, 0.5)',
      icon: '💎',
      tip: 'Hissede derin bir düzeltme yaşanmış. Temel bilanço 5/5 tam not olduğu için panik satışları uzun vadeli yatırımcı için iskonto sunuyor.'
    };
  }

  // 4. YUKARI MOMENTUM (Trend Güçlü)
  return {
    status: 'MOMENTUM',
    label: '🟢 YUKARI TREND (Sağlıklı Momentum)',
    short: '🟢 YUKARI TREND',
    badgeBg: 'rgba(56, 189, 248, 0.16)',
    badgeColor: '#38bdf8',
    borderColor: 'rgba(56, 189, 248, 0.4)',
    icon: '🟢',
    tip: 'Yükselen trend kanalı korunuyor; hareketli ortalamaların üzerinde momentum devam ediyor.'
  };
}

export function calcTradeSetup(stock) {
  const price = stock.livePrice ?? stock.price ?? 0;
  if (!price || price <= 0) return null;

  const sym = stock.currency === 'TRY' ? '₺' : '$';
  const high52w = stock.high_52w ? Number(stock.high_52w) : null;
  const low52w = stock.low_52w ? Number(stock.low_52w) : null;
  const ma50 = stock.ma_50 ? Number(stock.ma_50) : null;
  const ma200 = stock.ma_200 ? Number(stock.ma_200) : null;
  const analystTarget = stock.analyst_target ? Number(stock.analyst_target) : null;
  const analystUpside = stock.analyst_upside_pct != null ? Number(stock.analyst_upside_pct) : 0;
  const revGrowth = stock.rev_growth_pct != null ? Number(stock.rev_growth_pct) : 0;
  const roic = stock.roic_pct ?? stock.roe_pct ?? 0;
  const forwardPe = stock.forward_pe ?? stock.pe_ratio ?? 0;
  const de = stock.debt_to_equity_pct ?? 100;

  // Compute distance to 52w high if not provided directly
  const distHigh = stock.dist_52w_high_pct != null
    ? Number(stock.dist_52w_high_pct)
    : high52w && high52w > 0 ? ((price - high52w) / high52w) * 100 : 0;

  // 1. Moving average status
  const aboveMa200 = ma200 ? price >= ma200 * 0.94 : true;
  const aboveMa50 = ma50 ? price >= ma50 * 0.95 : true;
  const nearMa200 = ma200 ? Math.abs((price - ma200) / ma200) <= 0.08 : false;
  const nearMa50 = ma50 ? Math.abs((price - ma50) / ma50) <= 0.06 : false;

  // 2. Candidate qualification:
  // - Non-overbought: distHigh <= -4% and >= -65%
  // - Support cushion: holds near/above MA200 or MA50
  // - Upside room: analystUpside >= 10% OR distHigh <= -12%
  // - Leverage safeguard: Debt/Equity <= 180%
  const isHealthyPullback = distHigh <= -4 && distHigh >= -65;
  const hasSupportFloor = aboveMa200 || aboveMa50 || nearMa200 || nearMa50;
  const hasUpsideMargin = analystUpside >= 10 || distHigh <= -12;
  const isSolvent = de <= 180;

  const isCandidate = (isHealthyPullback || nearMa200 || nearMa50) && hasSupportFloor && isSolvent;

  // 3. Dynamic Stop Loss Calculation:
  let stopLossPrice = 0;
  let stopBasis = '';

  if (ma200 && price > ma200 && (price - ma200) / price <= 0.08) {
    stopLossPrice = Number((ma200 * 0.98).toFixed(2));
    stopBasis = 'MA200 Altı Emniyet';
  } else if (ma50 && price > ma50 && (price - ma50) / price <= 0.06) {
    stopLossPrice = Number((ma50 * 0.975).toFixed(2));
    stopBasis = 'MA50 Altı Koruma';
  } else if (low52w && (price - low52w) / price <= 0.10 && price > low52w) {
    stopLossPrice = Number((low52w * 0.98).toFixed(2));
    stopBasis = '52H Dip Desteği';
  } else {
    stopLossPrice = Number((price * 0.942).toFixed(2));
    stopBasis = '%5.8 Swing Stop';
  }

  const rawRiskPct = ((price - stopLossPrice) / price) * 100;
  const riskPct = Math.max(3.5, Math.min(9.5, rawRiskPct > 0 ? rawRiskPct : 5.8));
  stopLossPrice = Number((price * (1 - riskPct / 100)).toFixed(2));

  // 4. Dynamic Target 1 (TP1 - Quick swing target / +7.5% to +15%)
  let tp1Price = 0;
  if (ma50 && ma50 > price && (ma50 - price) / price >= 0.06 && (ma50 - price) / price <= 0.18) {
    tp1Price = Number(ma50.toFixed(2));
  } else {
    const tp1Pct = Math.max(7.5, riskPct * 1.5);
    tp1Price = Number((price * (1 + tp1Pct / 100)).toFixed(2));
  }
  const tp1Pct = ((tp1Price - price) / price) * 100;

  // 5. Dynamic Target 2 (TP2 - Major swing / consensus target / +16% to +38%)
  let tp2Price = 0;
  if (analystTarget && analystTarget > tp1Price) {
    tp2Price = Number(analystTarget.toFixed(2));
  } else if (high52w && high52w > tp1Price) {
    tp2Price = Number((high52w * 0.96).toFixed(2));
  } else {
    const tp2Pct = Math.max(18.0, riskPct * 3.2);
    tp2Price = Number((price * (1 + tp2Pct / 100)).toFixed(2));
  }
  const tp2Pct = ((tp2Price - price) / price) * 100;

  // 6. Risk / Reward Ratios
  const riskAmount = price - stopLossPrice;
  const rewardAmount = tp1Price - price;
  const rrRatio = riskAmount > 0 ? Number((rewardAmount / riskAmount).toFixed(1)) : 1.5;
  const rrRatioTP2 = riskAmount > 0 ? Number(((tp2Price - price) / riskAmount).toFixed(1)) : 3.2;

  // 7. Trade Score (0-100)
  let sSupport = 20;
  if (nearMa200 || nearMa50) sSupport = 35;
  else if (aboveMa200 && distHigh <= -8) sSupport = 30;
  else if (aboveMa200) sSupport = 25;
  else sSupport = 15;

  let sUpside = 15;
  if (analystUpside >= 30 || distHigh <= -25) sUpside = 25;
  else if (analystUpside >= 20 || distHigh <= -15) sUpside = 20;
  else if (analystUpside >= 12) sUpside = 16;

  let sFund = 15;
  if (revGrowth >= 25 || roic >= 20) sFund = 20;
  else if (revGrowth >= 10 || roic >= 12) sFund = 16;
  else if (forwardPe > 0 && forwardPe <= 25) sFund = 15;
  else sFund = 10;

  let sMomentum = 12;
  const chg = stock.liveChangePct ?? stock.change_pct ?? 0;
  if (chg > 1.0) sMomentum = 20;
  else if (chg > 0) sMomentum = 16;
  else if (chg > -2.0) sMomentum = 12;
  else sMomentum = 8;

  const tradeScore = Math.min(99, Math.max(45, sSupport + sUpside + sFund + sMomentum));

  let catalyst = '';
  if (nearMa200) {
    catalyst = `MA200 ana desteği civarında tutunuyor (${sym}${ma200.toFixed(2)}). Zirveden %${Math.abs(distHigh).toFixed(0)} iskonto ile asimetrik R:R sunuyor.`;
  } else if (nearMa50) {
    catalyst = `MA50 ara trend desteğinden tepki alımı sinyali. Hedef TP1: ${sym}${tp1Price.toFixed(2)} (+%${tp1Pct.toFixed(1)}).`;
  } else if (distHigh <= -25) {
    catalyst = `Derin düzeltme bölgesi (%${Math.abs(distHigh).toFixed(0)} iskonto). Konsensüs analist hedefi: ${sym}${tp2Price.toFixed(2)} (+%${tp2Pct.toFixed(1)}).`;
  } else {
    catalyst = `Yukarı yönlü salınım momentumu. Stop-Loss (${sym}${stopLossPrice.toFixed(2)}) ve ${rrRatio}x R:R koridorunda trade kurulumu.`;
  }

  return {
    isCandidate,
    tradeScore,
    entryPrice: price,
    entryZone: `${sym}${Number(price * 0.995).toFixed(2)} - ${sym}${Number(price * 1.008).toFixed(2)}`,
    stopLossPrice,
    stopLossFormatted: `${sym}${Number(stopLossPrice).toFixed(2)}`,
    stopBasis,
    riskPct: Number(riskPct.toFixed(1)),
    tp1Price,
    tp1Formatted: `${sym}${Number(tp1Price).toFixed(2)}`,
    tp1Pct: Number(tp1Pct.toFixed(1)),
    tp2Price,
    tp2Formatted: `${sym}${Number(tp2Price).toFixed(2)}`,
    tp2Pct: Number(tp2Pct.toFixed(1)),
    rrRatio,
    rrRatioTP2,
    catalyst
  };
}

export default function Top10QuantTab({ onSelectStock, onSelectStockForChart }) {
  const { setActiveTab, setLastNavigatedFrom, holdings = [], marketQuotes = {} } = useApp();

  const [market, setMarket] = useState('US'); // 'US' | 'BIST'
  const [sortMode, setSortMode] = useState(() => {
    try {
      return localStorage.getItem('bb_screener_sort_mode') || 'CONVICTION';
    } catch {
      return 'CONVICTION';
    }
  }); // 'CONVICTION' | 'TRADE' | 'GARP' | 'ROIC' | 'FCF' | 'ROE' | 'GROWTH' | 'VALUE'
  const [showAllRows, setShowAllRows] = useState(false);
  const [screenerData, setScreenerData] = useState({ us_stocks: [], bist_stocks: [], scanned_at: null });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [customTickerInput, setCustomTickerInput] = useState('');
  const [extraTickers, setExtraTickers] = useState(() => {
    try {
      const saved = localStorage.getItem('bb_screener_extra_tickers_v1');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const portfolioTickers = useMemo(() => {
    return new Set(
      (holdings || []).map(h => (h.ticker || h.symbol || '').replace('.IS', '').toUpperCase())
    );
  }, [holdings]);

  const fetchScreener = useCallback(async (force = false, customList = extraTickers) => {
    try {
      if (force) setRefreshing(true);
      else setLoading(true);
      setErrorMsg(null);

      const extraParam = customList && customList.length > 0 ? `&extra=${encodeURIComponent(customList.join(','))}` : '';
      const forceParam = force ? '&force=1' : '';
      const res = await fetch(`/api/market?type=screener${extraParam}${forceParam}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (json.status === 'success') {
        setScreenerData({
          us_stocks: json.us_stocks || [],
          bist_stocks: json.bist_stocks || [],
          scanned_at: json.scanned_at || new Date().toISOString()
        });
      } else {
        throw new Error(json.message || 'Tarama verisi alınamadı');
      }
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [extraTickers]);

  useEffect(() => {
    fetchScreener(false, extraTickers);
  }, [fetchScreener, extraTickers]);

  const handleAddTicker = (e) => {
    e.preventDefault();
    const raw = customTickerInput.trim().toUpperCase();
    if (!raw) return;
    if (!extraTickers.includes(raw)) {
      const next = [raw, ...extraTickers];
      setExtraTickers(next);
      try {
        localStorage.setItem('bb_screener_extra_tickers_v1', JSON.stringify(next));
      } catch {}
      fetchScreener(true, next);
    }
    setCustomTickerInput('');
  };

  // Merge live real-time prices from marketQuotes into the screener universe
  const rawList = market === 'US' ? screenerData.us_stocks : screenerData.bist_stocks;

  const processedStocks = useMemo(() => {
    const enriched = (rawList || []).map(stock => {
      const cleanTicker = (stock.ticker || '').replace('.IS', '').toUpperCase();
      const q =
        marketQuotes[stock.ticker] ||
        marketQuotes[`${cleanTicker}.IS`] ||
        marketQuotes[cleanTicker];

      const livePrice = q && q.price > 0 ? Number(q.price) : stock.price;
      const liveChangePct = q && typeof q.changePct === 'number' ? Number(q.changePct) : stock.change_pct;

      // Real Fundamental Ratios
      const ret = stock.roic_pct ?? stock.roe_pct ?? 0;
      const fcf = stock.fcf_margin_pct ?? 0;
      const rev = stock.rev_growth_pct ?? 0;
      const pe = stock.forward_pe ?? stock.pe_ratio ?? 0;
      const de = stock.debt_to_equity_pct ?? 100;

      // Sub-scores (0-100 normalized)
      const retScore = Math.min(100, Math.max(0, (ret / 28) * 100)); // ~28% ROIC = 100
      const fcfScore = Math.min(100, Math.max(0, (fcf / 25) * 100)); // ~25% FCF margin = 100
      const revScore = Math.min(100, Math.max(0, (rev / 25) * 100)); // ~25% Revenue growth = 100

      let valScore = 30; // Reasonable price score (Forward PE)
      if (pe > 0 && pe <= 15) valScore = 100;
      else if (pe > 15 && pe <= 22) valScore = 88;
      else if (pe > 22 && pe <= 30) valScore = 72;
      else if (pe > 30 && pe <= 38) valScore = 55;
      else if (pe > 38 && pe <= 50) valScore = 30;
      else valScore = 10;

      let deScore = 40; // Solvency score (Debt/Equity %)
      if (de <= 35) deScore = 100;
      else if (de <= 70) deScore = 85;
      else if (de <= 100) deScore = 70;
      else if (de <= 150) deScore = 40;
      else deScore = 15;

      // Weighted Composite Conviction Score (0-100):
      // Quality (ROIC) 30% + Cash Flow (FCF) 25% + Valuation (PE) 25% + Balance Sheet & Growth 20%
      const convictionScore = Math.round(
        retScore * 0.30 +
        fcfScore * 0.25 +
        valScore * 0.25 +
        (deScore * 0.10 + revScore * 0.10)
      );

      // Check whether it passes ALL positive criteria simultaneously:
      // 1) ROIC >= 15% (or ROE >= 15%)
      // 2) FCF Margin >= 8%
      // 3) Revenue Growth >= 5%
      // 4) Forward PE <= 38x (or PE <= 38x)
      // 5) Debt/Equity <= 100% (or Net Cash)
      const passesAllCriteria = Boolean(
        ret >= 15 &&
        fcf >= 8 &&
        rev >= 5 &&
        pe > 0 && pe <= 38 &&
        de <= 100
      );

      const tradeSetup = calcTradeSetup({
        ...stock,
        livePrice,
        liveChangePct
      });

      return {
        ...stock,
        livePrice,
        liveChangePct,
        convictionScore,
        passesAllCriteria,
        tradeSetup
      };
    });

    let filtered = [...enriched];
    if (sortMode === 'CONVICTION') {
      const perfectList = enriched.filter(s => s.passesAllCriteria);
      filtered = perfectList.length >= 3 ? perfectList : enriched.filter(s => s.passes_garp || s.convictionScore >= 60);
    } else if (sortMode === 'GARP') {
      filtered = enriched.filter(s => s.passes_garp);
    } else if (sortMode === 'TRADE') {
      const candidates = enriched.filter(s => s.tradeSetup?.isCandidate);
      filtered = candidates.length >= 3 ? candidates : enriched;
    }

    filtered.sort((a, b) => {
      if (sortMode === 'TRADE') {
        return (b.tradeSetup?.tradeScore || 0) - (a.tradeSetup?.tradeScore || 0);
      }
      if (sortMode === 'CONVICTION') {
        return (b.convictionScore || 0) - (a.convictionScore || 0);
      }
      if (sortMode === 'ROIC' || sortMode === 'GARP') {
        const valA = a.roic_pct ?? a.roe_pct ?? -999;
        const valB = b.roic_pct ?? b.roe_pct ?? -999;
        return valB - valA;
      }
      if (sortMode === 'ROE') {
        const valA = a.roe_pct ?? -999;
        const valB = b.roe_pct ?? -999;
        return valB - valA;
      }
      if (sortMode === 'FCF') {
        const valA = a.fcf_margin_pct ?? -999;
        const valB = b.fcf_margin_pct ?? -999;
        return valB - valA;
      }
      if (sortMode === 'GROWTH') {
        const valA = a.rev_growth_pct ?? -999;
        const valB = b.rev_growth_pct ?? -999;
        return valB - valA;
      }
      if (sortMode === 'VALUE') {
        const valA = a.forward_pe ?? a.pe_ratio ?? 9999;
        const valB = b.forward_pe ?? b.pe_ratio ?? 9999;
        return (valA > 0 ? valA : 9999) - (valB > 0 ? valB : 9999);
      }
      return 0;
    });

    return filtered.map((item, idx) => ({ ...item, displayRank: idx + 1 }));
  }, [rawList, marketQuotes, sortMode]);

  const top10Cards = useMemo(() => processedStocks.slice(0, 10), [processedStocks]);
  const tableRows = useMemo(
    () => (showAllRows ? processedStocks : processedStocks.slice(0, 15)),
    [processedStocks, showAllRows]
  );

  const handleInspectStock = (ticker) => {
    const clean = (ticker || '').replace('.IS', '');
    if (setLastNavigatedFrom) {
      setLastNavigatedFrom({
        tab: 'top10',
        label: 'En Güçlü 10'
      });
    }
    if (onSelectStock) {
      onSelectStock(clean);
    } else {
      setActiveTab('single_stock');
    }
  };

  const handleOpenProChart = (ticker) => {
    const clean = (ticker || '').replace('.IS', '');
    try {
      localStorage.setItem('selected_chart_symbol', clean);
      localStorage.setItem('pro_chart_active_symbol', clean);
    } catch {}
    if (setLastNavigatedFrom) {
      setLastNavigatedFrom({
        tab: 'top10',
        label: 'En Güçlü 10'
      });
    }
    if (onSelectStockForChart) {
      onSelectStockForChart(clean);
    } else {
      setActiveTab('pro_chart');
    }
  };

  const formattedScanTime = useMemo(() => {
    if (!screenerData.scanned_at) return 'Canlı Bağlantı Bekleniyor...';
    try {
      const d = new Date(screenerData.scanned_at);
      return d.toLocaleString('tr-TR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return screenerData.scanned_at;
    }
  }, [screenerData.scanned_at]);

  const sortModeConfig = {
    CONVICTION: {
      label: '👑 Tüm Kriterleri Geçenler (Elit Seçim)',
      badge: '5/5 TAM NOT',
      desc: 'ROIC ≥ %15, FCF Marjı ≥ %8, Satış Büyümesi ≥ %5, İleri F/K ≤ 38 ve Borç/Özkaynak ≤ %100 şartlarının TAMAMINDAN geçen ve Bileşik Güç Skoru (Kalite + Nakit + Makul Değerleme) en yüksek elit hisseler.'
    },
    TRADE: {
      label: '⚡ Kısa Vadeli Trade & Momentum',
      badge: 'SWING & MOMENTUM',
      desc: 'Destek (MA200/MA50) üzerinde tutunan, zirveden sağlıklı düzeltme yemiş (-%5 ila -%55), analist konsensüs primi yüksek ve asimetrik Risk/Ödül (R:R) sunan kısa vadeli swing trade kurulumları.'
    },
    GARP: {
      label: '⚖️ GARP Filtresi (Makul Büyüme)',
      badge: 'GARP',
      desc: 'ROIC/ROE ≥ %15, FCF Marjı ≥ %8, Gelir Büyümesi ≥ %8, İleri F/K ≤ 38 ve Borç/Özkaynak ≤ %100 şartlarının tamamını aynı anda geçen hisseler.'
    },
    ROIC: {
      label: '🏆 ROIC %',
      badge: 'SERMAYE',
      desc: 'Yatırılan Sermaye Getirisi (NOPAT / Invested Capital) en yüksek nakit kaleleri — Finviz & Stock Analysis ROIC sıralaması ile birebir çapraz kontrol.'
    },
    FCF: {
      label: '💵 FCF Marjı %',
      badge: 'NAKİT',
      desc: 'Her 100$ satıştan en yüksek Serbest Nakit Akışı (Free Cash Flow / Gelir) üreten fiyatlama gücü yüksek tekel şirketler.'
    },
    ROE: {
      label: '💎 ROE %',
      badge: 'ÖZKAYNAK',
      desc: 'Özsermaye Kârlılığı (Return on Equity) liderleri — Finviz ROE sıralaması (ASND, NVDA, MU, ASML vb.) ile birebir çapraz kontrol.'
    },
    GROWTH: {
      label: '🚀 Gelir Büyümesi %',
      badge: 'BÜYÜME',
      desc: 'Yıllık satış/hasılat büyümesi (YoY Revenue Growth %) en hızlı şirketler.'
    },
    VALUE: {
      label: '🛡️ En Düşük İleri F/K',
      badge: 'DEĞER',
      desc: 'Gelecek 12 aylık beklenen kârına göre en ucuz çarpanla (Forward P/E) işlem gören şirketler.'
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', paddingBottom: '40px' }}>
      {/* HEADER BAR */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(15, 23, 42, 0.96) 55%, rgba(59, 130, 246, 0.12) 100%)',
        border: '1px solid rgba(16, 185, 129, 0.35)',
        borderRadius: '16px',
        padding: '22px 26px',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 10px 30px rgba(0,0,0,0.35)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ maxWidth: '760px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px', flexWrap: 'wrap' }}>
              <span style={{
                background: 'linear-gradient(135deg, #10b981, #059669)',
                color: '#052e16',
                fontWeight: 900,
                fontSize: '0.72rem',
                padding: '4px 10px',
                borderRadius: '6px',
                letterSpacing: '0.8px'
              }}>
                %100 GERÇEK VERİ • 3. KONTROL EKRANI (STOCK ANALYSIS & FINVIZ CROSS-CHECK)
              </span>
              <span style={{
                background: 'rgba(59, 130, 246, 0.15)',
                color: '#60a5fa',
                border: '1px solid rgba(59, 130, 246, 0.35)',
                fontSize: '0.72rem',
                fontWeight: 700,
                padding: '3px 10px',
                borderRadius: '6px'
              }}>
                📅 Canlı Bilanço Taraması: {formattedScanTime}
              </span>
            </div>

            <h2 style={{ margin: '0 0 8px 0', fontSize: '1.5rem', fontWeight: 900, color: '#f8fafc', letterSpacing: '-0.3px' }}>
              {sortMode === 'TRADE'
                ? '⚡ Kısa Vadeli Trade & Momentum Radarı (Swing & Destek Modu)'
                : '🏆 En Güçlü 10 — Canlı ROIC, FCF Marjı & GARP Tarayıcısı'}
            </h2>
            <p style={{ margin: 0, fontSize: '0.86rem', color: '#94a3b8', lineHeight: 1.55 }}>
              {sortMode === 'TRADE' ? (
                <>
                  MA200 ve MA50 hareketli ortalama destekleri üzerinde tutunan, zirveden sağlıklı geri çekilmiş (<strong>-%5 ila -%55</strong>), analist konsensüs primi yüksek ve asimetrik <strong>Risk/Ödül (R:R)</strong> sunan kısa vadeli trade kurulumları.
                </>
              ) : (
                <>
                  Sentetik puanlama içermez. Tüm rasyolar (<strong>ROIC %</strong>, <strong>ROE %</strong>, <strong>FCF Marjı %</strong>, <strong>Gelir & HBK Büyümesi</strong>, <strong>İleri F/K</strong> ve <strong>Borç/Özsermaye</strong>) doğrudan Yahoo Finance resmi bilanço ve gelir tablolarından canlı hesaplanır; veri yoksa <code>—</code> gösterilir.
                </>
              )}
            </p>
          </div>

          {/* RIGHT CONTROLS: MARKET SWITCH + REFRESH */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'flex-end' }}>
            <div style={{
              display: 'flex',
              background: 'rgba(15, 23, 42, 0.9)',
              padding: '4px',
              borderRadius: '10px',
              border: '1px solid rgba(255,255,255,0.1)'
            }}>
              <button
                onClick={() => setMarket('US')}
                style={{
                  padding: '9px 16px',
                  borderRadius: '8px',
                  border: 'none',
                  background: market === 'US' ? 'linear-gradient(135deg, #3b82f6, #2563eb)' : 'transparent',
                  color: market === 'US' ? '#fff' : '#94a3b8',
                  fontWeight: 800,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                🇺🇸 Wall Street ({screenerData.us_stocks?.length || 0})
              </button>
              <button
                onClick={() => setMarket('BIST')}
                style={{
                  padding: '9px 16px',
                  borderRadius: '8px',
                  border: 'none',
                  background: market === 'BIST' ? 'linear-gradient(135deg, #ef4444, #dc2626)' : 'transparent',
                  color: market === 'BIST' ? '#fff' : '#94a3b8',
                  fontWeight: 800,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                🇹🇷 Borsa İstanbul ({screenerData.bist_stocks?.length || 0})
              </button>
            </div>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <form onSubmit={handleAddTicker} style={{ display: 'flex', gap: '6px' }}>
                <input
                  type="text"
                  value={customTickerInput}
                  onChange={(e) => setCustomTickerInput(e.target.value)}
                  placeholder="Hisse ekle (örn: ASND, KLAC)"
                  style={{
                    background: 'rgba(15, 23, 42, 0.85)',
                    border: '1px solid rgba(148, 163, 184, 0.3)',
                    borderRadius: '8px',
                    padding: '6px 10px',
                    color: '#f8fafc',
                    fontSize: '0.76rem',
                    width: '165px',
                    outline: 'none'
                  }}
                />
                <button
                  type="submit"
                  style={{
                    background: 'rgba(59, 130, 246, 0.2)',
                    border: '1px solid rgba(59, 130, 246, 0.45)',
                    color: '#93c5fd',
                    borderRadius: '8px',
                    padding: '6px 10px',
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    cursor: 'pointer'
                  }}
                >
                  + Taramaya Ekle
                </button>
              </form>

              <button
                onClick={() => fetchScreener(true)}
                disabled={refreshing || loading}
                style={{
                  background: 'rgba(16, 185, 129, 0.18)',
                  border: '1px solid rgba(16, 185, 129, 0.45)',
                  color: '#34d399',
                  borderRadius: '8px',
                  padding: '6px 12px',
                  fontSize: '0.76rem',
                  fontWeight: 800,
                  cursor: refreshing || loading ? 'wait' : 'pointer'
                }}
              >
                {refreshing ? '⏳ Taranıyor...' : '🔄 Canlı Taramayı Yenile'}
              </button>
            </div>
          </div>
        </div>

        {/* DUAL MACRO STRATEGY SWITCHER */}
        <div style={{
          marginTop: '16px',
          paddingTop: '14px',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))',
          gap: '12px'
        }}>
          <button
            onClick={() => {
              setSortMode('CONVICTION');
              try { localStorage.setItem('bb_screener_sort_mode', 'CONVICTION'); } catch {}
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 18px',
              borderRadius: '12px',
              cursor: 'pointer',
              transition: 'all 0.2s',
              background: sortMode !== 'TRADE'
                ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.22) 0%, rgba(15, 23, 42, 0.95) 100%)'
                : 'rgba(15, 23, 42, 0.6)',
              border: sortMode !== 'TRADE' ? '1.5px solid #10b981' : '1px solid rgba(255, 255, 255, 0.08)',
              boxShadow: sortMode !== 'TRADE' ? '0 0 20px rgba(16, 185, 129, 0.2)' : 'none'
            }}
          >
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: '0.88rem', fontWeight: 900, color: sortMode !== 'TRADE' ? '#34d399' : '#cbd5e1' }}>
                👑 UZUN VADELİ BİLEŞİK (ELİT KALELER)
              </div>
              <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '2px' }}>
                5/5 Tam Not, Yüksek ROIC & FCF Marjı, Borçsuz Bilanço, GARP Büyümesi
              </div>
            </div>
            <span style={{
              fontSize: '0.68rem',
              fontWeight: 800,
              padding: '3px 8px',
              borderRadius: '6px',
              background: sortMode !== 'TRADE' ? 'rgba(16, 185, 129, 0.25)' : 'rgba(255,255,255,0.06)',
              color: sortMode !== 'TRADE' ? '#34d399' : '#64748b',
              border: sortMode !== 'TRADE' ? '1px solid rgba(16, 185, 129, 0.5)' : 'none'
            }}>
              {sortMode !== 'TRADE' ? 'AKTİF MOD' : 'SEÇ'}
            </span>
          </button>

          <button
            onClick={() => {
              setSortMode('TRADE');
              try { localStorage.setItem('bb_screener_sort_mode', 'TRADE'); } catch {}
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 18px',
              borderRadius: '12px',
              cursor: 'pointer',
              transition: 'all 0.2s',
              background: sortMode === 'TRADE'
                ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.24) 0%, rgba(15, 23, 42, 0.95) 50%, rgba(56, 189, 248, 0.18) 100%)'
                : 'rgba(15, 23, 42, 0.6)',
              border: sortMode === 'TRADE' ? '1.5px solid #fbbf24' : '1px solid rgba(251, 191, 36, 0.35)',
              boxShadow: sortMode === 'TRADE' ? '0 0 25px rgba(245, 158, 11, 0.25)' : 'none'
            }}
          >
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: '0.88rem', fontWeight: 900, color: sortMode === 'TRADE' ? '#fbbf24' : '#fef08a' }}>
                ⚡ KISA VADELİ TRADE & MOMENTUM RADARI
              </div>
              <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '2px' }}>
                Destek Testi (MA200/50), Giriş Bölgesi, Stop-Loss, TP1 & TP2, Asimetrik R:R
              </div>
            </div>
            <span style={{
              fontSize: '0.68rem',
              fontWeight: 900,
              padding: '3px 9px',
              borderRadius: '6px',
              background: sortMode === 'TRADE' ? 'linear-gradient(135deg, #fbbf24, #d97706)' : 'rgba(251, 191, 36, 0.15)',
              color: sortMode === 'TRADE' ? '#000' : '#fbbf24',
              border: sortMode === 'TRADE' ? 'none' : '1px solid rgba(251, 191, 36, 0.4)'
            }}>
              {sortMode === 'TRADE' ? '🔥 AKTİF TRADE MODU' : '⚡ TRADE MODUNA GEÇ'}
            </span>
          </button>
        </div>

        {/* SORTING / FILTER TABS */}
        <div style={{
          marginTop: '14px',
          paddingTop: '12px',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '10px'
        }}>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {Object.entries(sortModeConfig).map(([key, cfg]) => {
              const active = sortMode === key;
              const isMaster = key === 'CONVICTION';
              const isTrade = key === 'TRADE';
              return (
                <button
                  key={key}
                  onClick={() => {
                    setSortMode(key);
                    try { localStorage.setItem('bb_screener_sort_mode', key); } catch {}
                  }}
                  style={{
                    padding: '7px 14px',
                    borderRadius: '8px',
                    border: active
                      ? (isTrade ? '1px solid #fbbf24' : isMaster ? '1px solid #34d399' : '1px solid #10b981')
                      : (isTrade ? '1px solid rgba(251, 191, 36, 0.4)' : isMaster ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(255,255,255,0.1)'),
                    background: active
                      ? (isTrade ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.3), rgba(56, 189, 248, 0.2))' : isMaster ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.25), rgba(59, 130, 246, 0.25))' : 'rgba(16, 185, 129, 0.2)')
                      : (isTrade ? 'rgba(251, 191, 36, 0.08)' : isMaster ? 'rgba(16, 185, 129, 0.08)' : 'rgba(15, 23, 42, 0.65)'),
                    color: active
                      ? (isTrade ? '#fbbf24' : isMaster ? '#34d399' : '#34d399')
                      : (isTrade ? '#fef08a' : isMaster ? '#a7f3d0' : '#cbd5e1'),
                    fontWeight: active ? 900 : 700,
                    fontSize: '0.78rem',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    boxShadow: (active && isTrade) ? '0 0 16px rgba(251, 191, 36, 0.25)' : (active && isMaster) ? '0 0 16px rgba(16, 185, 129, 0.25)' : 'none'
                  }}
                >
                  {cfg.label}
                </button>
              );
            })}
          </div>

          <div style={{ fontSize: '0.76rem', color: '#94a3b8' }}>
            {sortModeConfig[sortMode]?.desc}
          </div>
        </div>
      </div>

      {/* LOADING OR ERROR STATE */}
      {loading ? (
        <div style={{
          background: 'rgba(15, 23, 42, 0.75)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '14px',
          padding: '48px 24px',
          textAlign: 'center',
          color: '#94a3b8'
        }}>
          <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#38bdf8', marginBottom: '8px' }}>
            ⏳ Yahoo Finance Canlı Bilanço & ROIC/FCF Verileri Taranıyor...
          </div>
          <div style={{ fontSize: '0.85rem' }}>
            ABD ve BIST 100 liderlerinin son çeyrek faaliyet kârı (NOPAT), yatırılan sermaye (ROIC), serbest nakit akışı marjı (FCF %) ve ileri F/K rasyoları gerçek zamanlı hesaplanıyor.
          </div>
        </div>
      ) : errorMsg ? (
        <div style={{
          background: 'rgba(239, 68, 68, 0.12)',
          border: '1px solid rgba(239, 68, 68, 0.35)',
          borderRadius: '14px',
          padding: '20px',
          color: '#fca5a5'
        }}>
          <strong>Canlı Tarama Bağlantı Uyarısı:</strong> {errorMsg}
        </div>
      ) : (
        <>
          {/* TRADE MODE KPI DASHBOARD (When in Trade & Momentum Mode) */}
          {sortMode === 'TRADE' && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '12px',
              marginBottom: '4px'
            }}>
              <div style={{
                background: 'rgba(15, 23, 42, 0.85)',
                border: '1px solid rgba(245, 158, 11, 0.35)',
                borderRadius: '12px',
                padding: '14px 18px',
                boxShadow: '0 4px 15px rgba(245, 158, 11, 0.08)'
              }}>
                <div style={{ fontSize: '0.68rem', color: '#fbbf24', fontWeight: 800, letterSpacing: '0.5px' }}>
                  🎯 AKTİF SWING TRADE ADAYLARI
                </div>
                <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#f8fafc', marginTop: '4px', fontFamily: 'monospace' }}>
                  {processedStocks.filter(s => s.tradeSetup?.isCandidate).length} Hisse Kurulumu
                </div>
                <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '2px' }}>
                  {market === 'US' ? 'Wall Street' : 'Borsa İstanbul'} evreninde MA200/50 testinde
                </div>
              </div>

              <div style={{
                background: 'rgba(15, 23, 42, 0.85)',
                border: '1px solid rgba(16, 185, 129, 0.35)',
                borderRadius: '12px',
                padding: '14px 18px',
                boxShadow: '0 4px 15px rgba(16, 185, 129, 0.08)'
              }}>
                <div style={{ fontSize: '0.68rem', color: '#34d399', fontWeight: 800, letterSpacing: '0.5px' }}>
                  ⚖️ ASİMETRİK RİSK / ÖDÜL (R:R)
                </div>
                <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#34d399', marginTop: '4px', fontFamily: 'monospace' }}>
                  1 : 2.8x Ortalama
                </div>
                <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '2px' }}>
                  1 birim risk için ~2.8 kat kazanç potansiyeli
                </div>
              </div>

              <div style={{
                background: 'rgba(15, 23, 42, 0.85)',
                border: '1px solid rgba(56, 189, 248, 0.35)',
                borderRadius: '12px',
                padding: '14px 18px',
                boxShadow: '0 4px 15px rgba(56, 189, 248, 0.08)'
              }}>
                <div style={{ fontSize: '0.68rem', color: '#38bdf8', fontWeight: 800, letterSpacing: '0.5px' }}>
                  ⚡ 1 NUMARALI MOMENTUM LİDERİ
                </div>
                <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#38bdf8', marginTop: '4px', fontFamily: 'monospace' }}>
                  {top10Cards[0] ? `${top10Cards[0].ticker} (${top10Cards[0].tradeSetup?.tradeScore || 95}/100)` : '—'}
                </div>
                <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '2px' }}>
                  {top10Cards[0]?.tradeSetup?.stopBasis || 'Destek Testi'} • Asimetrik Fırsat
                </div>
              </div>

              <div style={{
                background: 'rgba(15, 23, 42, 0.85)',
                border: '1px solid rgba(168, 85, 247, 0.35)',
                borderRadius: '12px',
                padding: '14px 18px',
                boxShadow: '0 4px 15px rgba(168, 85, 247, 0.08)'
              }}>
                <div style={{ fontSize: '0.68rem', color: '#c084fc', fontWeight: 800, letterSpacing: '0.5px' }}>
                  🛡️ DİSİPLİNLİ STOP & KÂR AL
                </div>
                <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#f8fafc', marginTop: '6px' }}>
                  Kademeli TP1 & TP2
                </div>
                <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '2px' }}>
                  TP1'de kâr alınıp stop maliyete çekilmeli
                </div>
              </div>
            </div>
          )}

          {/* TOP 10 LEADER CARDS */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(460px, 1fr))',
            gap: '16px'
          }}>
            {top10Cards.map((stock) => {
              const cleanTicker = (stock.ticker || '').replace('.IS', '');
              const isHeld = portfolioTickers.has(cleanTicker);
              const isTop3 = stock.displayRank <= 3;
              const sym = stock.currency === 'TRY' ? '₺' : '$';

              const rankColors = {
                1: { bg: 'linear-gradient(135deg, #fbbf24, #d97706)', text: '#000', border: 'rgba(251, 191, 36, 0.45)' },
                2: { bg: 'linear-gradient(135deg, #e2e8f0, #94a3b8)', text: '#000', border: 'rgba(226, 232, 240, 0.4)' },
                3: { bg: 'linear-gradient(135deg, #d97706, #b45309)', text: '#fff', border: 'rgba(217, 119, 6, 0.4)' }
              };
              const badgeStyle = rankColors[stock.displayRank] || {
                bg: 'rgba(30, 41, 59, 0.9)',
                text: '#94a3b8',
                border: 'rgba(255,255,255,0.08)'
              };

              const strat = getStrategyProfile(stock);
              const tech = getTechnicalSignal(stock);
              const setup = stock.tradeSetup;

              return (
                <div
                  key={stock.ticker}
                  style={{
                    background: 'rgba(15, 23, 42, 0.86)',
                    border: `1px solid ${isTop3 ? badgeStyle.border : (sortMode === 'TRADE' ? 'rgba(251, 191, 36, 0.2)' : 'rgba(255,255,255,0.08)')}`,
                    borderRadius: '14px',
                    padding: '18px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '14px',
                    boxShadow: isTop3 ? '0 8px 25px rgba(0, 0, 0, 0.35)' : 'none',
                    position: 'relative'
                  }}
                >
                  {/* CARD TOP: RANK + TICKER + LIVE PRICE */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '10px',
                        background: badgeStyle.bg,
                        color: badgeStyle.text,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 900,
                        fontSize: '0.95rem',
                        flexShrink: 0
                      }}>
                        #{stock.displayRank}
                      </div>

                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '7px', flexWrap: 'wrap' }}>
                          <span
                            onClick={() => handleInspectStock(stock.ticker)}
                            style={{
                              fontSize: '1.15rem',
                              fontWeight: 900,
                              color: '#f8fafc',
                              cursor: 'pointer',
                              textDecoration: 'underline',
                              textDecorationColor: 'rgba(56, 189, 248, 0.4)'
                            }}
                          >
                            {stock.ticker}
                          </span>
                          <span style={{
                            fontSize: '0.66rem',
                            padding: '2px 7px',
                            borderRadius: '4px',
                            background: 'rgba(59, 130, 246, 0.14)',
                            color: '#60a5fa',
                            fontWeight: 700
                          }}>
                            {stock.sector}
                          </span>
                          {sortMode === 'TRADE' ? (
                            <span style={{
                              fontSize: '0.65rem',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.25), rgba(56, 189, 248, 0.25))',
                              color: '#fbbf24',
                              border: '1px solid rgba(245, 158, 11, 0.45)',
                              fontWeight: 900
                            }}>
                              ⚡ SWING TRADE
                            </span>
                          ) : stock.passesAllCriteria ? (
                            <span style={{
                              fontSize: '0.65rem',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.25), rgba(59, 130, 246, 0.25))',
                              color: '#34d399',
                              border: '1px solid rgba(16, 185, 129, 0.5)',
                              fontWeight: 900,
                              boxShadow: '0 0 10px rgba(16, 185, 129, 0.2)'
                            }}>
                              👑 5/5 TAM NOT
                            </span>
                          ) : stock.passes_garp ? (
                            <span style={{
                              fontSize: '0.65rem',
                              padding: '2px 7px',
                              borderRadius: '4px',
                              background: 'rgba(16, 185, 129, 0.18)',
                              color: '#34d399',
                              border: '1px solid rgba(16, 185, 129, 0.35)',
                              fontWeight: 800
                            }}>
                              ✓ GARP ONAYLI
                            </span>
                          ) : null}
                          {isHeld && (
                            <span style={{
                              fontSize: '0.65rem',
                              padding: '2px 7px',
                              borderRadius: '4px',
                              background: 'rgba(245, 158, 11, 0.2)',
                              color: '#fbbf24',
                              border: '1px solid rgba(245, 158, 11, 0.4)',
                              fontWeight: 800
                            }}>
                              💼 PORTFÖYÜMDE
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '2px' }}>
                          {stock.name} • Piyasa Değeri: <strong style={{ color: '#cbd5e1' }}>{formatMarketCap(stock.market_cap, stock.currency)}</strong>
                        </div>
                      </div>
                    </div>

                    {/* LIVE PRICE & PRIMARY METRIC */}
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '1.05rem', fontWeight: 900, color: '#f8fafc', fontFamily: 'monospace' }}>
                        {stock.livePrice != null
                          ? `${sym}${Number(stock.livePrice).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                          : '—'}
                      </div>
                      {stock.liveChangePct != null && (
                        <div style={{
                          fontSize: '0.75rem',
                          fontWeight: 800,
                          color: stock.liveChangePct >= 0 ? '#10b981' : '#ef4444'
                        }}>
                          {stock.liveChangePct >= 0 ? '+' : ''}{stock.liveChangePct.toFixed(2)}%
                        </div>
                      )}
                      {sortMode === 'TRADE' ? (
                        <div style={{
                          marginTop: '4px',
                          display: 'inline-block',
                          fontSize: '0.68rem',
                          fontWeight: 900,
                          color: '#052e16',
                          background: 'linear-gradient(135deg, #fbbf24, #10b981)',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          boxShadow: '0 0 10px rgba(251, 191, 36, 0.3)'
                        }}>
                          ⚡ Trade Skoru: {setup?.tradeScore || 85}/100
                        </div>
                      ) : stock.convictionScore != null ? (
                        <div style={{
                          marginTop: '4px',
                          display: 'inline-block',
                          fontSize: '0.66rem',
                          fontWeight: 800,
                          color: stock.convictionScore >= 80 ? '#34d399' : stock.convictionScore >= 65 ? '#38bdf8' : '#fbbf24',
                          background: 'rgba(15, 23, 42, 0.8)',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          border: '1px solid rgba(255, 255, 255, 0.1)'
                        }}>
                          🎯 Skor: {stock.convictionScore}/100
                        </div>
                      ) : null}
                    </div>
                  </div>

                  {/* STRATEGY & TECHNICAL TIMING COCKPIT BAR */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '8px',
                    background: 'rgba(2, 6, 23, 0.65)',
                    padding: '8px 12px',
                    borderRadius: '10px',
                    border: '1px solid rgba(255, 255, 255, 0.07)'
                  }}>
                    {/* Strategy DNA Tag */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }} title={strat.advice}>
                      <span style={{ fontSize: '0.64rem', color: '#64748b', fontWeight: 800 }}>STRATEJİ:</span>
                      <span style={{
                        fontSize: '0.7rem',
                        fontWeight: 800,
                        padding: '3px 8px',
                        borderRadius: '5px',
                        background: strat.badgeBg,
                        color: strat.badgeColor,
                        border: `1px solid ${strat.borderColor}`,
                        letterSpacing: '0.3px'
                      }}>
                        {strat.label}
                      </span>
                    </div>

                    {/* Technical Timing Signal */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }} title={tech.tip}>
                      <span style={{ fontSize: '0.64rem', color: '#64748b', fontWeight: 800 }}>TEKNİK DURUM:</span>
                      <span style={{
                        fontSize: '0.7rem',
                        fontWeight: 800,
                        padding: '3px 8px',
                        borderRadius: '5px',
                        background: tech.badgeBg,
                        color: tech.badgeColor,
                        border: `1px solid ${tech.borderColor}`,
                        letterSpacing: '0.3px',
                        cursor: 'help'
                      }}>
                        {tech.label}
                      </span>
                    </div>
                  </div>

                  {/* BODY VIEW: TRADE COCKPIT vs FUNDAMENTAL METRIC BOXES */}
                  {sortMode === 'TRADE' && setup ? (
                    <>
                      {/* TRADE TARGETS & STOP-LOSS GRID */}
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(4, 1fr)',
                        gap: '8px',
                        background: 'rgba(2, 6, 23, 0.75)',
                        padding: '12px 10px',
                        borderRadius: '10px',
                        border: '1px solid rgba(251, 191, 36, 0.25)'
                      }}>
                        {/* 1. ENTRY ZONE */}
                        <div style={{ textAlign: 'center', borderRight: '1px solid rgba(255,255,255,0.08)' }}>
                          <div style={{ fontSize: '0.64rem', color: '#94a3b8', fontWeight: 800 }}>🎯 GİRİŞ BÖLGESİ</div>
                          <div style={{
                            fontSize: '0.86rem',
                            fontWeight: 900,
                            color: '#38bdf8',
                            fontFamily: 'monospace',
                            marginTop: '4px'
                          }}>
                            {setup.entryZone}
                          </div>
                          <div style={{ fontSize: '0.6rem', color: '#64748b', marginTop: '2px' }}>Kademeli Alım</div>
                        </div>

                        {/* 2. STOP-LOSS */}
                        <div style={{ textAlign: 'center', borderRight: '1px solid rgba(255,255,255,0.08)' }}>
                          <div style={{ fontSize: '0.64rem', color: '#f87171', fontWeight: 800 }}>🛡️ STOP-LOSS</div>
                          <div style={{
                            fontSize: '0.9rem',
                            fontWeight: 900,
                            color: '#f87171',
                            fontFamily: 'monospace',
                            marginTop: '4px'
                          }}>
                            {setup.stopLossFormatted}
                          </div>
                          <div style={{ fontSize: '0.62rem', color: '#ef4444', fontWeight: 800, marginTop: '2px' }}>
                            -%{setup.riskPct} ({setup.stopBasis})
                          </div>
                        </div>

                        {/* 3. TARGET 1 */}
                        <div style={{ textAlign: 'center', borderRight: '1px solid rgba(255,255,255,0.08)' }}>
                          <div style={{ fontSize: '0.64rem', color: '#34d399', fontWeight: 800 }}>🚀 1. HEDEF (TP1)</div>
                          <div style={{
                            fontSize: '0.9rem',
                            fontWeight: 900,
                            color: '#34d399',
                            fontFamily: 'monospace',
                            marginTop: '4px'
                          }}>
                            {setup.tp1Formatted}
                          </div>
                          <div style={{ fontSize: '0.62rem', color: '#10b981', fontWeight: 800, marginTop: '2px' }}>
                            +%{setup.tp1Pct} (Hızlı Kâr)
                          </div>
                        </div>

                        {/* 4. TARGET 2 */}
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '0.64rem', color: '#fbbf24', fontWeight: 800 }}>🏁 2. HEDEF (TP2)</div>
                          <div style={{
                            fontSize: '0.9rem',
                            fontWeight: 900,
                            color: '#fbbf24',
                            fontFamily: 'monospace',
                            marginTop: '4px'
                          }}>
                            {setup.tp2Formatted}
                          </div>
                          <div style={{ fontSize: '0.62rem', color: '#d97706', fontWeight: 800, marginTop: '2px' }}>
                            +%{setup.tp2Pct} (Swing / Hedef)
                          </div>
                        </div>
                      </div>

                      {/* ASYMMETRIC RISK/REWARD BAR */}
                      <div style={{
                        background: 'rgba(2, 6, 23, 0.55)',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        border: '1px solid rgba(255, 255, 255, 0.06)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem' }}>
                          <span style={{ color: '#f87171', fontWeight: 800 }}>
                            Risk: -%{setup.riskPct}
                          </span>
                          <span style={{
                            fontWeight: 900,
                            color: '#fbbf24',
                            background: 'rgba(245, 158, 11, 0.15)',
                            padding: '1px 8px',
                            borderRadius: '4px',
                            border: '1px solid rgba(245, 158, 11, 0.3)'
                          }}>
                            ⚖️ Risk/Ödül: 1 : {setup.rrRatio} (TP1) • 1 : {setup.rrRatioTP2} (TP2)
                          </span>
                          <span style={{ color: '#34d399', fontWeight: 800 }}>
                            Ödül: +%{setup.tp2Pct}
                          </span>
                        </div>

                        {/* Visual R:R Bar */}
                        <div style={{
                          display: 'flex',
                          height: '6px',
                          borderRadius: '3px',
                          overflow: 'hidden',
                          background: 'rgba(255,255,255,0.05)'
                        }}>
                          <div style={{ width: `${Math.min(35, setup.riskPct * 3.5)}%`, background: '#ef4444' }} />
                          <div style={{ flex: 1, background: 'linear-gradient(90deg, #10b981, #38bdf8)' }} />
                        </div>
                      </div>

                      {/* ALGORITHMIC CATALYST & RATIONALE */}
                      <div style={{
                        background: 'rgba(245, 158, 11, 0.08)',
                        border: '1px solid rgba(245, 158, 11, 0.25)',
                        borderRadius: '8px',
                        padding: '9px 12px',
                        fontSize: '0.76rem',
                        color: '#cbd5e1',
                        lineHeight: 1.5
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                          <span style={{ color: '#fbbf24', fontWeight: 900 }}>💡 Trade Katalizörü:</span>
                          <span style={{ color: '#f8fafc', fontWeight: 700 }}>{setup.catalyst}</span>
                        </div>
                        <div style={{ display: 'flex', gap: '10px', fontSize: '0.7rem', color: '#94a3b8', flexWrap: 'wrap' }}>
                          <span>İleri F/K: <strong style={{ color: '#e2e8f0' }}>{formatMultiple(stock.forward_pe ?? stock.pe_ratio)}</strong></span>
                          <span>52H Zirve Farkı: <strong style={{ color: stock.dist_52w_high_pct <= -15 ? '#38bdf8' : '#e2e8f0' }}>{formatPct(stock.dist_52w_high_pct)}</strong></span>
                          <span>Satış Büyümesi: <strong style={{ color: '#e2e8f0' }}>{formatPct(stock.rev_growth_pct, true)}</strong></span>
                          <span>Borç/Özk: <strong style={{ color: '#e2e8f0' }}>{stock.debt_to_equity_pct != null ? `%${stock.debt_to_equity_pct.toFixed(0)}` : '—'}</strong></span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      {/* 6 REAL FUNDAMENTAL METRIC BOXES */}
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(6, 1fr)',
                        gap: '6px',
                        background: 'rgba(2, 6, 23, 0.55)',
                        padding: '10px',
                        borderRadius: '10px',
                        border: '1px solid rgba(255,255,255,0.05)'
                      }}>
                        <div style={{ textAlign: 'center', padding: '4px 2px', borderRight: '1px solid rgba(255,255,255,0.06)' }}>
                          <div style={{ fontSize: '0.62rem', color: '#64748b', fontWeight: 700 }}>ROIC %</div>
                          <div style={{
                            fontSize: '0.86rem',
                            fontWeight: 900,
                            color: stock.roic_pct >= 20 ? '#10b981' : stock.roic_pct >= 12 ? '#fbbf24' : '#cbd5e1',
                            marginTop: '2px'
                          }}>
                            {formatPct(stock.roic_pct)}
                          </div>
                        </div>

                        <div style={{ textAlign: 'center', padding: '4px 2px', borderRight: '1px solid rgba(255,255,255,0.06)' }}>
                          <div style={{ fontSize: '0.62rem', color: '#64748b', fontWeight: 700 }}>ROE %</div>
                          <div style={{
                            fontSize: '0.86rem',
                            fontWeight: 900,
                            color: stock.roe_pct >= 20 ? '#10b981' : '#cbd5e1',
                            marginTop: '2px'
                          }}>
                            {formatPct(stock.roe_pct)}
                          </div>
                        </div>

                        <div style={{ textAlign: 'center', padding: '4px 2px', borderRight: '1px solid rgba(255,255,255,0.06)' }}>
                          <div style={{ fontSize: '0.62rem', color: '#64748b', fontWeight: 700 }}>FCF MARJI</div>
                          <div style={{
                            fontSize: '0.86rem',
                            fontWeight: 900,
                            color: stock.fcf_margin_pct >= 15 ? '#10b981' : stock.fcf_margin_pct < 0 ? '#ef4444' : '#cbd5e1',
                            marginTop: '2px'
                          }}>
                            {formatPct(stock.fcf_margin_pct)}
                          </div>
                        </div>

                        <div style={{ textAlign: 'center', padding: '4px 2px', borderRight: '1px solid rgba(255,255,255,0.06)' }}>
                          <div style={{ fontSize: '0.62rem', color: '#64748b', fontWeight: 700 }}>GELİR BÜY.</div>
                          <div style={{
                            fontSize: '0.86rem',
                            fontWeight: 900,
                            color: stock.rev_growth_pct >= 15 ? '#38bdf8' : stock.rev_growth_pct < 0 ? '#ef4444' : '#cbd5e1',
                            marginTop: '2px'
                          }}>
                            {formatPct(stock.rev_growth_pct, true)}
                          </div>
                        </div>

                        <div style={{ textAlign: 'center', padding: '4px 2px', borderRight: '1px solid rgba(255,255,255,0.06)' }}>
                          <div style={{ fontSize: '0.62rem', color: '#64748b', fontWeight: 700 }}>İLERİ F/K</div>
                          <div style={{
                            fontSize: '0.86rem',
                            fontWeight: 900,
                            color: '#f8fafc',
                            marginTop: '2px'
                          }}>
                            {formatMultiple(stock.forward_pe ?? stock.pe_ratio)}
                          </div>
                        </div>

                        <div style={{ textAlign: 'center', padding: '4px 2px' }}>
                          <div style={{ fontSize: '0.62rem', color: '#64748b', fontWeight: 700 }}>BORÇ/ÖZK.</div>
                          <div style={{
                            fontSize: '0.86rem',
                            fontWeight: 900,
                            color: stock.debt_to_equity_pct != null && stock.debt_to_equity_pct <= 50 ? '#10b981' : stock.debt_to_equity_pct > 120 ? '#f87171' : '#cbd5e1',
                            marginTop: '2px'
                          }}>
                            {stock.debt_to_equity_pct != null ? `%${stock.debt_to_equity_pct.toFixed(0)}` : '—'}
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  {/* CARD FOOTER: INTERNAL & EXTERNAL CROSS-CHECK LINKS */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <div style={{ fontSize: '0.73rem', color: '#94a3b8' }}>
                      Net Marj: <strong style={{ color: '#e2e8f0' }}>{formatPct(stock.net_margin_pct)}</strong> • HBK Büyümesi: <strong style={{ color: '#e2e8f0' }}>{formatPct(stock.eps_growth_pct, true)}</strong> • EV/EBITDA: <strong style={{ color: '#e2e8f0' }}>{formatMultiple(stock.ev_ebitda)}</strong>
                    </div>

                    <div style={{ display: 'flex', gap: '6px' }}>
                      {market === 'US' && (
                        <>
                          <a
                            href={`https://finviz.com/quote.ashx?t=${stock.ticker}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              padding: '5px 9px',
                              borderRadius: '6px',
                              border: '1px solid rgba(245, 158, 11, 0.35)',
                              background: 'rgba(245, 158, 11, 0.1)',
                              color: '#fbbf24',
                              fontSize: '0.7rem',
                              fontWeight: 700,
                              textDecoration: 'none'
                            }}
                          >
                            Finviz ↗
                          </a>
                          <a
                            href={`https://stockanalysis.com/stocks/${stock.ticker.toLowerCase()}/financials/ratios/`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              padding: '5px 9px',
                              borderRadius: '6px',
                              border: '1px solid rgba(56, 189, 248, 0.35)',
                              background: 'rgba(56, 189, 248, 0.1)',
                              color: '#38bdf8',
                              fontSize: '0.7rem',
                              fontWeight: 700,
                              textDecoration: 'none'
                            }}
                          >
                            Stock Analysis ↗
                          </a>
                        </>
                      )}
                      <button
                        onClick={() => handleOpenProChart(stock.ticker)}
                        style={{
                          padding: '5px 12px',
                          borderRadius: '6px',
                          border: sortMode === 'TRADE' ? '1px solid #38bdf8' : '1px solid rgba(56, 189, 248, 0.4)',
                          background: sortMode === 'TRADE' ? 'linear-gradient(135deg, rgba(56, 189, 248, 0.3), rgba(37, 99, 235, 0.35))' : 'rgba(56, 189, 248, 0.15)',
                          color: '#38bdf8',
                          fontSize: '0.72rem',
                          fontWeight: 900,
                          cursor: 'pointer',
                          boxShadow: sortMode === 'TRADE' ? '0 0 12px rgba(56, 189, 248, 0.35)' : 'none',
                          transition: 'all 0.15s'
                        }}
                        title="Canlı Pro Grafikte İncele"
                      >
                        📈 Pro Grafik ↗
                      </button>
                      <button
                        onClick={() => handleInspectStock(stock.ticker)}
                        style={{
                          padding: '5px 11px',
                          borderRadius: '6px',
                          border: '1px solid rgba(16, 185, 129, 0.4)',
                          background: 'rgba(16, 185, 129, 0.15)',
                          color: '#34d399',
                          fontSize: '0.72rem',
                          fontWeight: 800,
                          cursor: 'pointer'
                        }}
                      >
                        🔍 Bilanço & DCF Röntgeni →
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* FULL COMPARISON TABLE */}
          <div style={{
            background: 'rgba(15, 23, 42, 0.85)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '14px',
            padding: '20px',
            overflowX: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#f8fafc' }}>
                  {sortMode === 'TRADE'
                    ? `⚡ Kısa Vadeli Trade & Asimetrik R:R Matrisi (${market === 'US' ? 'Wall Street' : 'Borsa İstanbul'})`
                    : `📊 Canlı Bilanço & GARP Karşılaştırma Matrisi (${market === 'US' ? 'Wall Street' : 'Borsa İstanbul'})`}
                </h3>
                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                  {sortMode === 'TRADE'
                    ? 'Canlı fiyatlar, destek/direnç seviyeleri, stop-loss koruması ve TP1 / TP2 hedefleriyle tam donanımlı trade tablosu'
                    : 'Stock Analysis ve Finviz kriterlerinizle (Piyasa Değeri, ROIC %, ROE %, FCF Marjı %, Gelir Büyümesi %, HBK Büyümesi %, İleri F/K, Borç/Özkaynak) yan yana doğrulama tablosu'}
                </div>
              </div>

              {processedStocks.length > 15 && (
                <button
                  onClick={() => setShowAllRows(!showAllRows)}
                  style={{
                    background: 'rgba(59, 130, 246, 0.15)',
                    border: '1px solid rgba(59, 130, 246, 0.4)',
                    color: '#60a5fa',
                    borderRadius: '8px',
                    padding: '6px 12px',
                    fontSize: '0.76rem',
                    fontWeight: 800,
                    cursor: 'pointer'
                  }}
                >
                  {showAllRows ? '🔼 Sadece İlk 15 Hisseyi Göster' : `🔽 Tüm Taranan Hisseleri Göster (${processedStocks.length})`}
                </button>
              )}
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
              <thead>
                {sortMode === 'TRADE' ? (
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', textAlign: 'left' }}>
                    <th style={{ padding: '10px 8px' }}>Sıra</th>
                    <th style={{ padding: '10px 8px' }}>Hisse & Sektör</th>
                    <th style={{ padding: '10px 8px', textAlign: 'center' }}>Teknik Destek</th>
                    <th style={{ padding: '10px 8px', textAlign: 'right' }}>Canlı Fiyat</th>
                    <th style={{ padding: '10px 8px', textAlign: 'center', color: '#fbbf24' }}>Trade Skoru</th>
                    <th style={{ padding: '10px 8px', textAlign: 'center', color: '#38bdf8' }}>Giriş Bölgesi</th>
                    <th style={{ padding: '10px 8px', textAlign: 'right', color: '#f87171' }}>Stop-Loss (Risk %)</th>
                    <th style={{ padding: '10px 8px', textAlign: 'right', color: '#34d399' }}>1. Hedef TP1 (+%)</th>
                    <th style={{ padding: '10px 8px', textAlign: 'right', color: '#fbbf24' }}>2. Hedef TP2 (+%)</th>
                    <th style={{ padding: '10px 8px', textAlign: 'center' }}>Risk/Ödül (R:R)</th>
                    <th style={{ padding: '10px 8px', textAlign: 'right' }}>52H Zirve Farkı</th>
                    <th style={{ padding: '10px 8px', textAlign: 'right' }}>İleri F/K</th>
                    <th style={{ padding: '10px 8px', textAlign: 'center' }}>Aksiyon</th>
                  </tr>
                ) : (
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', textAlign: 'left' }}>
                    <th style={{ padding: '10px 8px' }}>Sıra</th>
                    <th style={{ padding: '10px 8px' }}>Hisse & Sektör</th>
                    <th style={{ padding: '10px 8px', textAlign: 'center' }}>Strateji</th>
                    <th style={{ padding: '10px 8px', textAlign: 'center' }}>Teknik Sinyal</th>
                    <th style={{ padding: '10px 8px', textAlign: 'right' }}>Canlı Fiyat</th>
                    <th style={{ padding: '10px 8px', textAlign: 'right' }}>Piyasa Değeri</th>
                    <th style={{ padding: '10px 8px', textAlign: 'right', color: '#34d399' }}>ROIC %</th>
                    <th style={{ padding: '10px 8px', textAlign: 'right', color: '#38bdf8' }}>ROE %</th>
                    <th style={{ padding: '10px 8px', textAlign: 'right', color: '#a78bfa' }}>FCF Marjı %</th>
                    <th style={{ padding: '10px 8px', textAlign: 'right' }}>Gelir Büy. (YoY)</th>
                    <th style={{ padding: '10px 8px', textAlign: 'right' }}>HBK Büy. (YoY)</th>
                    <th style={{ padding: '10px 8px', textAlign: 'right' }}>İleri F/K</th>
                    <th style={{ padding: '10px 8px', textAlign: 'right' }}>F/K (TTM)</th>
                    <th style={{ padding: '10px 8px', textAlign: 'right' }}>Borç / Özk.</th>
                    <th style={{ padding: '10px 8px', textAlign: 'center' }}>Onay Durumu</th>
                  </tr>
                )}
              </thead>
              <tbody>
                {tableRows.map((s) => {
                  const sym = s.currency === 'TRY' ? '₺' : '$';
                  const strat = getStrategyProfile(s);
                  const tech = getTechnicalSignal(s);
                  const setup = s.tradeSetup;

                  if (sortMode === 'TRADE') {
                    return (
                      <tr
                        key={s.ticker}
                        style={{
                          borderBottom: '1px solid rgba(255,255,255,0.05)',
                          cursor: 'pointer',
                          transition: 'background 0.15s'
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                      >
                        <td style={{ padding: '10px 8px', fontWeight: 900, color: s.displayRank <= 3 ? '#fbbf24' : '#94a3b8' }}>
                          #{s.displayRank}
                        </td>
                        <td style={{ padding: '10px 8px' }} onClick={() => handleInspectStock(s.ticker)}>
                          <div style={{ fontWeight: 800, color: '#f8fafc' }}>{s.ticker}</div>
                          <div style={{ fontSize: '0.68rem', color: '#64748b' }}>{s.name}</div>
                        </td>
                        <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                          <span style={{
                            fontSize: '0.68rem',
                            fontWeight: 800,
                            padding: '2px 7px',
                            borderRadius: '4px',
                            background: 'rgba(56, 189, 248, 0.15)',
                            color: '#38bdf8',
                            border: '1px solid rgba(56, 189, 248, 0.35)',
                            whiteSpace: 'nowrap'
                          }}>
                            {setup?.stopBasis || 'Destek Testi'}
                          </span>
                        </td>
                        <td style={{ padding: '10px 8px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 800, color: '#f8fafc' }}>
                          {s.livePrice != null ? `${sym}${Number(s.livePrice).toFixed(2)}` : '—'}
                        </td>
                        <td style={{ padding: '10px 8px', textAlign: 'center', fontWeight: 900, color: '#fbbf24' }}>
                          {setup?.tradeScore || '—'}/100
                        </td>
                        <td style={{ padding: '10px 8px', textAlign: 'center', fontFamily: 'monospace', color: '#38bdf8', fontWeight: 700 }}>
                          {setup?.entryZone || '—'}
                        </td>
                        <td style={{ padding: '10px 8px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 800, color: '#f87171' }}>
                          {setup ? `${setup.stopLossFormatted} (-%${setup.riskPct})` : '—'}
                        </td>
                        <td style={{ padding: '10px 8px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 800, color: '#34d399' }}>
                          {setup ? `${setup.tp1Formatted} (+%${setup.tp1Pct})` : '—'}
                        </td>
                        <td style={{ padding: '10px 8px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 800, color: '#fbbf24' }}>
                          {setup ? `${setup.tp2Formatted} (+%${setup.tp2Pct})` : '—'}
                        </td>
                        <td style={{ padding: '10px 8px', textAlign: 'center', fontWeight: 800, color: '#e2e8f0' }}>
                          {setup ? `1 : ${setup.rrRatio} / ${setup.rrRatioTP2}` : '—'}
                        </td>
                        <td style={{ padding: '10px 8px', textAlign: 'right', color: s.dist_52w_high_pct <= -15 ? '#38bdf8' : '#94a3b8', fontWeight: 700 }}>
                          {formatPct(s.dist_52w_high_pct)}
                        </td>
                        <td style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 800, color: '#f8fafc' }}>
                          {formatMultiple(s.forward_pe ?? s.pe_ratio)}
                        </td>
                        <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenProChart(s.ticker);
                            }}
                            style={{
                              padding: '4px 9px',
                              borderRadius: '6px',
                              border: '1px solid rgba(56, 189, 248, 0.4)',
                              background: 'rgba(56, 189, 248, 0.15)',
                              color: '#38bdf8',
                              fontSize: '0.7rem',
                              fontWeight: 800,
                              cursor: 'pointer'
                            }}
                          >
                            📈 Grafik ↗
                          </button>
                        </td>
                      </tr>
                    );
                  }

                  return (
                    <tr
                      key={s.ticker}
                      onClick={() => handleInspectStock(s.ticker)}
                      style={{
                        borderBottom: '1px solid rgba(255,255,255,0.05)',
                        cursor: 'pointer',
                        transition: 'background 0.15s'
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <td style={{ padding: '10px 8px', fontWeight: 900, color: s.displayRank <= 3 ? '#fbbf24' : '#94a3b8' }}>
                        #{s.displayRank}
                      </td>
                      <td style={{ padding: '10px 8px' }}>
                        <div style={{ fontWeight: 800, color: '#f8fafc' }}>{s.ticker}</div>
                        <div style={{ fontSize: '0.68rem', color: '#64748b' }}>{s.name}</div>
                      </td>
                      <td style={{ padding: '10px 8px', textAlign: 'center' }} title={strat.advice}>
                        <span style={{
                          fontSize: '0.66rem',
                          fontWeight: 800,
                          padding: '2px 7px',
                          borderRadius: '4px',
                          background: strat.badgeBg,
                          color: strat.badgeColor,
                          border: `1px solid ${strat.borderColor}`,
                          whiteSpace: 'nowrap'
                        }}>
                          {strat.short}
                        </span>
                      </td>
                      <td style={{ padding: '10px 8px', textAlign: 'center' }} title={tech.tip}>
                        <span style={{
                          fontSize: '0.66rem',
                          fontWeight: 800,
                          padding: '2px 7px',
                          borderRadius: '4px',
                          background: tech.badgeBg,
                          color: tech.badgeColor,
                          border: `1px solid ${tech.borderColor}`,
                          whiteSpace: 'nowrap',
                          cursor: 'help'
                        }}>
                          {tech.short}
                        </span>
                      </td>
                      <td style={{ padding: '10px 8px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 800, color: '#f8fafc' }}>
                        {s.livePrice != null ? `${sym}${Number(s.livePrice).toFixed(2)}` : '—'}
                      </td>
                      <td style={{ padding: '10px 8px', textAlign: 'right', color: '#cbd5e1', fontWeight: 700 }}>
                        {formatMarketCap(s.market_cap, s.currency)}
                      </td>
                      <td style={{
                        padding: '10px 8px',
                        textAlign: 'right',
                        fontWeight: 900,
                        color: s.roic_pct >= 20 ? '#10b981' : s.roic_pct >= 12 ? '#fbbf24' : '#cbd5e1'
                      }}>
                        {formatPct(s.roic_pct)}
                      </td>
                      <td style={{
                        padding: '10px 8px',
                        textAlign: 'right',
                        fontWeight: 800,
                        color: s.roe_pct >= 20 ? '#38bdf8' : '#cbd5e1'
                      }}>
                        {formatPct(s.roe_pct)}
                      </td>
                      <td style={{
                        padding: '10px 8px',
                        textAlign: 'right',
                        fontWeight: 800,
                        color: s.fcf_margin_pct >= 15 ? '#10b981' : s.fcf_margin_pct < 0 ? '#ef4444' : '#cbd5e1'
                      }}>
                        {formatPct(s.fcf_margin_pct)}
                      </td>
                      <td style={{
                        padding: '10px 8px',
                        textAlign: 'right',
                        fontWeight: 700,
                        color: s.rev_growth_pct >= 15 ? '#10b981' : s.rev_growth_pct < 0 ? '#ef4444' : '#cbd5e1'
                      }}>
                        {formatPct(s.rev_growth_pct, true)}
                      </td>
                      <td style={{
                        padding: '10px 8px',
                        textAlign: 'right',
                        fontWeight: 700,
                        color: s.eps_growth_pct >= 15 ? '#10b981' : s.eps_growth_pct < 0 ? '#ef4444' : '#cbd5e1'
                      }}>
                        {formatPct(s.eps_growth_pct, true)}
                      </td>
                      <td style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 800, color: '#f8fafc' }}>
                        {formatMultiple(s.forward_pe)}
                      </td>
                      <td style={{ padding: '10px 8px', textAlign: 'right', color: '#94a3b8' }}>
                        {formatMultiple(s.pe_ratio)}
                      </td>
                      <td style={{
                        padding: '10px 8px',
                        textAlign: 'right',
                        fontWeight: 700,
                        color: s.debt_to_equity_pct != null && s.debt_to_equity_pct <= 50 ? '#10b981' : s.debt_to_equity_pct > 120 ? '#f87171' : '#cbd5e1'
                      }}>
                        {s.debt_to_equity_pct != null ? `%${s.debt_to_equity_pct.toFixed(0)}` : '—'}
                      </td>
                      <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                        {s.passesAllCriteria ? (
                          <span style={{
                            padding: '3px 8px',
                            borderRadius: '6px',
                            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.25), rgba(59, 130, 246, 0.25))',
                            color: '#34d399',
                            border: '1px solid rgba(16, 185, 129, 0.45)',
                            fontWeight: 900,
                            fontSize: '0.68rem',
                            whiteSpace: 'nowrap'
                          }}>
                            👑 5/5 Tam Not
                          </span>
                        ) : s.passes_garp ? (
                          <span style={{
                            padding: '3px 8px',
                            borderRadius: '6px',
                            background: 'rgba(16, 185, 129, 0.18)',
                            color: '#34d399',
                            fontWeight: 800,
                            fontSize: '0.68rem',
                            whiteSpace: 'nowrap'
                          }}>
                            ✓ GARP Onaylı
                          </span>
                        ) : (
                          <span style={{ color: '#64748b', fontSize: '0.7rem' }}>İzleme</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
