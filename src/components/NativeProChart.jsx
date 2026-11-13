import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { 
  createChart, 
  CandlestickSeries, 
  LineSeries, 
  HistogramSeries, 
  LineStyle, 
  CrosshairMode,
  createSeriesMarkers
} from 'lightweight-charts';
import { 
  TrendingUp, 
  Sliders, 
  Trash2, 
  Minus, 
  Maximize2, 
  Minimize2, 
  RotateCcw, 
  Plus, 
  Activity, 
  Layers,
  X,
  Cloud,
  List,
  Sun,
  Moon,
  ArrowRight,
  Camera,
  Ruler,
  Square,
  Anchor,
  Shield,
  Columns,
  BarChart2,
  Check,
  Sparkles
} from 'lucide-react';
import { db } from '../firebase';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';

// Math calculation helpers for Indicators
function calcEMA(data, period) {
  if (!data || data.length === 0) return [];
  const k = 2 / (period + 1);
  const ema = [];
  let prev = data[0].close;
  for (let i = 0; i < data.length; i++) {
    if (i === 0) {
      ema.push({ time: data[i].time, value: prev });
    } else {
      const cur = (data[i].close - prev) * k + prev;
      ema.push({ time: data[i].time, value: Number(cur.toFixed(2)) });
      prev = cur;
    }
  }
  return ema;
}

// Simple Moving Average (SMA) calculation helper
function calcSMA(data, period) {
  if (!data || data.length === 0 || period <= 0) return [];
  const res = [];
  let sum = 0;
  for (let i = 0; i < data.length; i++) {
    sum += data[i].close;
    if (i >= period) {
      sum -= data[i - period].close;
    }
    if (i >= period - 1) {
      res.push({
        time: data[i].time,
        value: Number((sum / period).toFixed(2))
      });
    }
  }
  return res;
}

// 2-Color Adaptive Kaufman Moving Average (KAMA Trend) with Volume-Confirmed ER & Dynamic Stop Threshold
// Regimes: 1 = Bullish (#00e676 Vibrant Green), -1 = Bearish (#ef4444 Red)
// Defaults: ER = 10, Fast = 5, Slow = 30, Filter StDev = 20, Filter Multiplier = 2.0 (No signal arrows, no yellow chop color)
export function calcKAMAPro(data, options = {}) {
  if (!data || data.length === 0) {
    return { lineData: [], markers: [], latestState: null };
  }

  const erLen = Math.max(2, Number(options.erLen) || 10);
  const fastLen = Math.max(1, Number(options.fastLen) || 5);
  const slowLen = Math.max(2, Number(options.slowLen) || 30);
  const fltLen = Math.max(2, Number(options.fltLen) || 20);
  const fltMult = options.fltMult !== undefined ? Math.max(0.1, Number(options.fltMult)) : 2.0;
  const upColor = options.upColor || '#00e676';
  const downColor = options.downColor || '#ef4444';

  const fastSC = 2.0 / (fastLen + 1);
  const slowSC = 2.0 / (slowLen + 1);

  const n = data.length;
  const closes = data.map(d => Number(d.close) || 0);
  const volumes = data.map(d => Number(d.volume) || 0);
  const decimals = closes[n - 1] < 0.1 ? 6 : closes[n - 1] < 10 ? 4 : 2;

  // 1. Calculate Efficiency Ratio (ER) with subtle Volume Confirmation and KAMA
  const erArr = new Array(n).fill(0);
  const kama = new Array(n).fill(0);
  const diffArr = new Array(n).fill(0);

  for (let i = 0; i < n; i++) {
    if (i === 0) {
      kama[0] = closes[0];
      erArr[0] = 0.5;
      diffArr[0] = 0;
      continue;
    }

    const lookback = Math.min(i, erLen);
    const change = Math.abs(closes[i] - closes[i - lookback]);
    let volat = 0;
    for (let k = i - lookback + 1; k <= i; k++) {
      volat += Math.abs(closes[k] - closes[k - 1]);
    }

    let er = volat > 1e-9 ? change / volat : 0;

    // Subtle Volume Confirmation: dampens low-volume noise, boosts high-volume institutional moves
    if (volumes[i] > 0 && i >= 10) {
      let volSum = 0;
      const vLen = Math.min(i, 20);
      for (let k = i - vLen + 1; k <= i; k++) volSum += volumes[k];
      const avgVol = volSum / vLen;
      if (avgVol > 0) {
        const relVol = Math.min(1.35, Math.max(0.75, volumes[i] / avgVol));
        er = Math.min(1.0, er * (0.85 + 0.15 * relVol));
      }
    }

    erArr[i] = er;

    const sc = Math.pow(er * (fastSC - slowSC) + slowSC, 2);
    kama[i] = kama[i - 1] + sc * (closes[i] - kama[i - 1]);
    diffArr[i] = kama[i] - kama[i - 1];
  }

  // 2. Kaufman StDev Filter (fltLen = 20, fltMult = 2.0) & 2-State Trend (Green / Red)
  let trend = 1; // 1 = Yükseliş (#00e676), -1 = Düşüş (#ef4444)
  let ext = kama[0];

  const lineData = [];
  let lastStopLevel = kama[0];

  for (let i = 0; i < n; i++) {
    const winStart = Math.max(0, i - fltLen + 1);
    const slice = diffArr.slice(winStart, i + 1);
    const mean = slice.reduce((s, v) => s + v, 0) / slice.length;
    const variance = slice.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / slice.length;
    const stdevDiff = Math.sqrt(variance);

    const filt = fltMult * stdevDiff;

    if (trend === 1) {
      ext = Math.max(ext, kama[i]);
      if (kama[i] < ext - filt && closes[i] < kama[i]) {
        trend = -1;
        ext = kama[i];
      }
    } else {
      ext = Math.min(ext, kama[i]);
      if (kama[i] > ext + filt && closes[i] > kama[i]) {
        trend = 1;
        ext = kama[i];
      }
    }

    const stopLvl = trend === 1 ? Math.min(kama[i], ext - filt) : Math.max(kama[i], ext + filt);
    lastStopLevel = Number(stopLvl.toFixed(decimals));

    const color = trend === 1 ? upColor : downColor;

    lineData.push({
      time: data[i].time,
      value: Number(kama[i].toFixed(decimals)),
      color,
      regime: trend,
      majorDir: trend,
      stopLevel: lastStopLevel,
      er: Number((erArr[i] * 100).toFixed(0))
    });
  }

  const lastPoint = lineData[lineData.length - 1] || null;
  const latestState = lastPoint
    ? {
        value: lastPoint.value,
        regime: lastPoint.regime,
        majorDir: lastPoint.majorDir,
        stopLevel: lastPoint.stopLevel,
        er: lastPoint.er,
        color: lastPoint.color,
        label: lastPoint.regime === 1 ? 'YÜKSELİŞ' : 'DÜŞÜŞ'
      }
    : null;

  return { lineData, markers: [], latestState };
}

// ⚡ 24 RSI & 55 SMA Çift Teyitli Trend Hareketli Ortalaması (2-Bar Teyitli Renkli Çizgi)
// Formül: Fiyat üzerinde 55 HO (SMA/EMA) + 24 RSI & 55 RSI SMA Momentum Teyidi
// Teyit Kuralı: Fiyat HO üstünde 2 bar ardışık kapanış -> Yeşil (#10b981), Fiyat HO altında 2 bar ardışık kapanış -> Kırmızı (#ef4444)
// Fakeout/Tuzak Koruması: Tek barlık sapmalarda önceki teyitli trend korunur.
export function calcTrendMA55(data, options = {}) {
  if (!data || data.length === 0) {
    return { lineData: [], markers: [], latestState: null };
  }

  const maPeriod = Math.max(2, Number(options.trendMaPeriod) || 55);
  const maType = options.trendMaType || 'SMA';
  const rsiPeriod = Math.max(2, Number(options.trendRsiPeriod) || 24);
  const rsiMaPeriod = Math.max(2, Number(options.trendRsiMaPeriod) || 55);
  const confirmBars = Math.max(1, Number(options.trendConfirmBars) || 2);
  const upColor = options.trendUpColor || '#10b981';
  const downColor = options.trendDownColor || '#ef4444';

  const n = data.length;
  const closes = data.map(d => Number(d.close) || 0);
  const decimals = closes[n - 1] < 0.1 ? 6 : closes[n - 1] < 10 ? 4 : 2;

  // 1. Calculate Base Moving Average (55 SMA or EMA) on Price Closes
  const maValues = new Array(n).fill(null);
  if (maType === 'EMA') {
    const k = 2 / (maPeriod + 1);
    let prev = closes[0];
    for (let i = 0; i < n; i++) {
      if (i === 0) {
        prev = closes[0];
      } else {
        prev = (closes[i] - prev) * k + prev;
      }
      if (i >= maPeriod - 1) {
        maValues[i] = prev;
      }
    }
  } else {
    // SMA
    let sum = 0;
    for (let i = 0; i < n; i++) {
      sum += closes[i];
      if (i >= maPeriod) {
        sum -= closes[i - maPeriod];
      }
      if (i >= maPeriod - 1) {
        maValues[i] = sum / maPeriod;
      }
    }
  }

  // 2. Calculate RSI(24) and RSI SMA(55) for momentum confirmation
  const rsiValues = new Array(n).fill(null);
  if (n > rsiPeriod) {
    let gains = 0;
    let losses = 0;
    for (let i = 1; i <= rsiPeriod; i++) {
      const diff = closes[i] - closes[i - 1];
      if (diff >= 0) gains += diff;
      else losses += Math.abs(diff);
    }
    let avgGain = gains / rsiPeriod;
    let avgLoss = losses / rsiPeriod;

    for (let i = rsiPeriod; i < n; i++) {
      if (i > rsiPeriod) {
        const diff = closes[i] - closes[i - 1];
        avgGain = (avgGain * (rsiPeriod - 1) + (diff > 0 ? diff : 0)) / rsiPeriod;
        avgLoss = (avgLoss * (rsiPeriod - 1) + (diff < 0 ? Math.abs(diff) : 0)) / rsiPeriod;
      }
      const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
      const val = avgLoss === 0 ? 100 : 100 - (100 / (1 + rs));
      rsiValues[i] = Number(val.toFixed(2));
    }
  }

  // RSI SMA(55)
  const rsiMaValues = new Array(n).fill(null);
  const validRsis = [];
  for (let i = 0; i < n; i++) {
    if (rsiValues[i] !== null && !isNaN(rsiValues[i])) {
      validRsis.push(rsiValues[i]);
      if (validRsis.length >= rsiMaPeriod) {
        const slice = validRsis.slice(-rsiMaPeriod);
        const sum = slice.reduce((a, b) => a + b, 0);
        rsiMaValues[i] = Number((sum / rsiMaPeriod).toFixed(2));
      }
    }
  }

  // 3. 2-Bar Confirmation State Machine & Multi-Color LineData
  let currentTrend = 1; // 1 = Boğa (#10b981), -1 = Ayı (#ef4444)
  let consecutiveAbove = 0;
  let consecutiveBelow = 0;
  let prevConfirmedTrend = 1;
  const lineData = [];
  const markers = [];

  for (let i = 0; i < n; i++) {
    const ma = maValues[i];
    if (ma === null || isNaN(ma)) {
      continue;
    }

    const close = closes[i];

    if (close > ma) {
      consecutiveAbove++;
      consecutiveBelow = 0;
    } else if (close < ma) {
      consecutiveBelow++;
      consecutiveAbove = 0;
    } else {
      consecutiveAbove = 0;
      consecutiveBelow = 0;
    }

    if (consecutiveAbove >= confirmBars) {
      currentTrend = 1;
    } else if (consecutiveBelow >= confirmBars) {
      currentTrend = -1;
    }

    if (lineData.length > 0 && currentTrend !== prevConfirmedTrend) {
      if (currentTrend === 1) {
        markers.push({
          time: data[i].time,
          position: 'belowBar',
          color: upColor,
          shape: 'arrowUp',
          text: 'AL (2-Bar)'
        });
      } else {
        markers.push({
          time: data[i].time,
          position: 'aboveBar',
          color: downColor,
          shape: 'arrowDown',
          text: 'SAT (2-Bar)'
        });
      }
      prevConfirmedTrend = currentTrend;
    }

    const color = currentTrend === 1 ? upColor : downColor;
    const roundedMa = Number(ma.toFixed(decimals));

    lineData.push({
      time: data[i].time,
      value: roundedMa,
      color,
      trend: currentTrend,
      consecutiveAbove,
      consecutiveBelow,
      rsi: rsiValues[i],
      rsiMa: rsiMaValues[i]
    });
  }

  const lastPoint = lineData[lineData.length - 1] || null;
  const latestClose = closes[n - 1] || 0;
  const latestRsi = lastPoint?.rsi ?? (rsiValues[n - 1] || 50);
  const latestRsiMa = lastPoint?.rsiMa ?? null;
  const rsiConfirmed = latestRsiMa !== null ? (lastPoint?.trend === 1 ? latestRsi >= latestRsiMa : latestRsi <= latestRsiMa) : true;

  const latestState = lastPoint
    ? {
        value: lastPoint.value,
        trend: lastPoint.trend,
        color: lastPoint.trend === 1 ? upColor : downColor,
        consecutiveAbove: lastPoint.consecutiveAbove,
        consecutiveBelow: lastPoint.consecutiveBelow,
        rsi: latestRsi,
        rsiMa: latestRsiMa,
        rsiConfirmed,
        close: latestClose,
        diffPercent: lastPoint.value > 0 ? Number((((latestClose - lastPoint.value) / lastPoint.value) * 100).toFixed(2)) : 0,
        label: lastPoint.trend === 1 ? 'BOĞA (2-BAR TEYİTLİ)' : 'AYI (2-BAR TEYİTLİ)',
        maPeriod,
        rsiPeriod,
        rsiMaPeriod,
        confirmBars
      }
    : null;

  return { lineData, markers, latestState };
}

// Multi-Timeframe (MTF) KAMA Trend Matrix & Decision Compass
export function calcMTFKama(candles, chartInterval = '1G', options = {}) {
  if (!candles || candles.length < 15) return null;

  // Map current interval to [Short-Term, Main, Higher-Timeframe] labels
  const tfLabelsMap = {
    '1S': ['15D', '1S', '4S'],
    '2S': ['30D', '2S', '1G'],
    '4S': ['1S', '4S', '1G'],
    '1G': ['4S', '1G', '1H'],
    '1H': ['1G', '1H', '1A'],
    '1A': ['1H', '1A', '3A'],
    '2A': ['1A', '2A', '6A'],
    '3A': ['1A', '3A', '1Y']
  };
  const [shortLabel, mainLabel, macroLabel] = tfLabelsMap[chartInterval] || ['Kısa', chartInterval, 'Üst'];

  // 1. Short-Term Fast KAMA (captures immediate swing impulse)
  const shortRes = calcKAMAPro(candles, {
    erLen: 6,
    fastLen: 3,
    slowLen: 15,
    fltLen: 14,
    fltMult: 1.4
  });
  const shortDir = shortRes.latestState?.regime || 1;

  // 2. Main Timeframe KAMA
  const mainRes = calcKAMAPro(candles, options);
  const mainDir = mainRes.latestState?.regime || 1;

  // 3. Higher Timeframe (Macro) KAMA via 4-bar bucket resampling
  const macroCandles = resampleCandles(candles, 4);
  const macroRes = calcKAMAPro(macroCandles.length >= 8 ? macroCandles : candles, {
    erLen: Math.max(5, Math.round((options.erLen || 10) * 0.8)),
    fastLen: options.fastLen || 5,
    slowLen: options.slowLen || 30,
    fltLen: Math.max(8, Math.round((options.fltLen || 20) * 0.7)),
    fltMult: options.fltMult ?? 2.0
  });
  const macroDir = macroRes.latestState?.regime || mainDir;

  const bullCount = (shortDir === 1 ? 1 : 0) + (mainDir === 1 ? 1 : 0) + (macroDir === 1 ? 1 : 0);

  let decisionText = '';
  let decisionColor = '#94a3b8';

  if (bullCount === 3) {
    decisionText = 'TAM BOĞA UYUMU (GÜÇLÜ TREND)';
    decisionColor = '#00e676';
  } else if (bullCount === 0) {
    decisionText = 'TAM AYI BASKISI (UZAK DUR)';
    decisionColor = '#ef4444';
  } else if (mainDir === 1 && macroDir === 1 && shortDir === -1) {
    decisionText = 'ANA TREND YUKARI • KISA VADE DÜZELTME (ALIM FIRSATI)';
    decisionColor = '#38bdf8';
  } else if (mainDir === -1 && macroDir === -1 && shortDir === 1) {
    decisionText = 'ANA TREND AŞAĞI • TEPKİ YÜKSELİŞİ (DİKKAT)';
    decisionColor = '#f59e0b';
  } else if (shortDir === 1 && mainDir === 1 && macroDir === -1) {
    decisionText = 'DİPTEN DÖNÜŞ BAŞLANGICI (ÜST DİRENÇ TAKİBİ)';
    decisionColor = '#34d399';
  } else {
    decisionText = 'KARARSIZ / GEÇİŞ BÖLGESİ';
    decisionColor = '#f59e0b';
  }

  return {
    shortLabel,
    mainLabel,
    macroLabel,
    shortDir,
    mainDir,
    macroDir,
    bullCount,
    decisionText,
    decisionColor
  };
}

// Parse any Lightweight Charts time format ('YYYY-MM-DD', { year, month, day }, UNIX sec/ms, numeric string) to UTC ms
export function parseCandleTimeMs(t) {
  if (t === null || t === undefined) return NaN;
  if (typeof t === 'number') {
    if (!Number.isFinite(t)) return NaN;
    return t < 1e11 ? t * 1000 : t;
  }
  if (typeof t === 'object' && t.year) {
    return Date.UTC(Number(t.year), Number(t.month) - 1, Number(t.day));
  }
  const s = String(t).trim();
  if (!s) return NaN;
  if (/^\d+(\.\d+)?$/.test(s)) {
    const num = Number(s);
    if (!Number.isFinite(num)) return NaN;
    return num < 1e11 ? num * 1000 : num;
  }
  return Date.parse(s);
}

// Format chart candle time cleanly for HUD / Settings / Tooltips (matches Lightweight Charts UTC axis)
export function formatAvwapTime(t, chartInterval = '1G', longYear = false) {
  const ms = parseCandleTimeMs(t);
  if (!Number.isFinite(ms)) return t ? String(t) : '';
  const d = new Date(ms);
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const yyyy = String(d.getUTCFullYear());
  const yy = longYear ? yyyy : yyyy.slice(-2);
  const isIntraday = typeof t === 'number' || /^\d+$/.test(String(t).trim()) || (typeof chartInterval === 'string' && chartInterval.includes('S'));
  if (isIntraday) {
    const hh = String(d.getUTCHours()).padStart(2, '0');
    const min = String(d.getUTCMinutes()).padStart(2, '0');
    return `${dd}.${mm}.${yy} ${hh}:${min}`;
  }
  return `${dd}.${mm}.${yy}`;
}

export function formatAvwapPriceExact(p) {
  if (p === null || p === undefined || !Number.isFinite(Number(p))) return '';
  const num = Number(p);
  const abs = Math.abs(num);
  const decimals = abs < 0.1 ? 6 : abs < 10 ? 4 : 2;
  return num.toFixed(decimals);
}

// Resolve calendar-aware search window [startIdx, endIdx] for Auto AVWAP across Crypto (24/7) and Equities (5d/wk)
export function getAvwapWindowBounds(data, chartInterval = '1G', avwapLookback = 'cycle', visibleRange = null) {
  const n = data?.length || 0;
  if (n === 0) return { startIdx: 0, endIdx: 0 };

  const defaultEndIdx = n >= 8 ? n - 3 : n - 1;

  if (avwapLookback === 'visible' && visibleRange && typeof visibleRange.from === 'number' && typeof visibleRange.to === 'number') {
    const clampedFrom = Math.max(0, Math.min(n - 1, Math.floor(visibleRange.from)));
    let clampedTo = Math.max(clampedFrom, Math.min(n - 1, Math.ceil(visibleRange.to)));
    if (clampedTo >= n - 2 && n - 3 >= clampedFrom) {
      clampedTo = n - 3;
    }
    if (clampedTo - clampedFrom >= 2) {
      return { startIdx: clampedFrom, endIdx: clampedTo };
    }
  }

  if (avwapLookback === 'all' || ['1A', '2A', '3A'].includes(chartInterval)) {
    return { startIdx: 0, endIdx: defaultEndIdx };
  }

  let lookbackDays = null;
  if (avwapLookback === '6m') {
    lookbackDays = 180;
  } else if (avwapLookback === '1y') {
    lookbackDays = 365;
  } else {
    const daysByTf = {
      '1S': 45,
      '2S': 90,
      '4S': 150,
      '1G': 365,
      '1H': 730
    };
    lookbackDays = daysByTf[chartInterval] || 365;
  }

  const lastMs = parseCandleTimeMs(data[n - 1]?.time);
  let startIdx = 0;
  if (Number.isFinite(lastMs) && lookbackDays) {
    const cutoffMs = lastMs - lookbackDays * 86400000;
    startIdx = data.findIndex(c => {
      const ms = parseCandleTimeMs(c.time);
      return Number.isFinite(ms) && ms >= cutoffMs;
    });
    if (startIdx === -1) startIdx = 0;
  } else {
    startIdx = Math.max(0, n - 252);
  }

  if (defaultEndIdx - startIdx < 5) {
    startIdx = Math.max(0, Math.min(startIdx, n - 10));
  }
  startIdx = Math.max(0, Math.min(startIdx, defaultEndIdx));

  return { startIdx, endIdx: defaultEndIdx };
}

// Find true Swing Pivot Low / High within [startIdx, endIdx] while validating neighbor bars across full dataset
function findMajorSwingAnchor(data, startIdx, endIdx, type = 'low') {
  const n = data.length;
  const from = Math.max(0, Math.min(startIdx, n - 1));
  const to = Math.max(from, Math.min(endIdx, n - 1));

  for (const rad of [3, 2, 1]) {
    let bestIdx = -1;
    let bestVal = type === 'low' ? Infinity : -Infinity;

    for (let i = from; i <= to; i++) {
      let isPivot = true;
      const leftBound = Math.max(0, i - rad);
      const rightBound = Math.min(n - 1, i + rad);
      for (let j = leftBound; j <= rightBound; j++) {
        if (j === i) continue;
        if (type === 'low' ? data[j].low < data[i].low : data[j].high > data[i].high) {
          isPivot = false;
          break;
        }
      }
      if (!isPivot) continue;

      const candidateVal = type === 'low' ? data[i].low : data[i].high;
      if (type === 'low' ? candidateVal < bestVal : candidateVal > bestVal) {
        bestVal = candidateVal;
        bestIdx = i;
      }
    }

    if (bestIdx !== -1) return bestIdx;
  }

  // Fallback for strictly monotonic segments without an interior pivot
  let extremeIdx = from;
  let extremeVal = type === 'low' ? data[from].low : data[from].high;
  for (let i = from + 1; i <= to; i++) {
    const val = type === 'low' ? data[i].low : data[i].high;
    if (type === 'low' ? val < extremeVal : val > extremeVal) {
      extremeVal = val;
      extremeIdx = i;
    }
  }
  return extremeIdx;
}

function calcSmaAt(data, endBarIdx, period) {
  if (!data || data.length === 0 || endBarIdx < 0 || period <= 0) return null;
  const effEnd = Math.min(data.length - 1, endBarIdx);
  const len = Math.min(period, effEnd + 1);
  if (len <= 0) return null;
  let sum = 0;
  for (let i = effEnd - len + 1; i <= effEnd; i++) {
    sum += Number(data[i].close) || 0;
  }
  return sum / len;
}

// Institutional Trend-Regime Classifier for Smart Auto AVWAP (Decides Swing Low Support vs Swing High Supply Resistance)
export function resolveSmartAvwapDirection(data, startIdx, endIdx, chartInterval = '1G') {
  const n = data?.length || 0;
  const lowIdx = findMajorSwingAnchor(data, startIdx, endIdx, 'low');
  const highIdx = findMajorSwingAnchor(data, startIdx, endIdx, 'high');
  if (n < 5) {
    return {
      direction: 'low',
      lowIdx,
      highIdx,
      anchorIdx: lowIdx,
      decisionReason: 'Yetersiz veri • Varsayılan dip desteği'
    };
  }

  const lastIdx = n - 1;
  const lastClose = Number(data[lastIdx]?.close) || 0;
  const lowPrice = Number(data[lowIdx]?.low) || lastClose;
  const highPrice = Number(data[highIdx]?.high) || lastClose;
  const spanBars = Math.max(1, endIdx - startIdx + 1);
  const barsSinceLow = Math.max(0, lastIdx - lowIdx);
  const barsSinceHigh = Math.max(0, lastIdx - highIdx);
  const minMatureBars = Math.min(10, Math.max(4, Math.floor(spanBars * 0.12)));

  let maxAfterLow = lowPrice;
  for (let i = lowIdx; i <= lastIdx; i++) {
    if (data[i].high > maxAfterLow) maxAfterLow = data[i].high;
  }
  let minAfterHigh = highPrice;
  for (let i = highIdx; i <= lastIdx; i++) {
    if (data[i].low < minAfterHigh) minAfterHigh = data[i].low;
  }

  const postLowRallyPct = lowPrice > 0 ? ((maxAfterLow - lowPrice) / lowPrice) * 100 : 0;
  const postHighDropPct = highPrice > 0 ? ((highPrice - minAfterHigh) / highPrice) * 100 : 0;
  const rangeSpan = Math.max(1e-9, highPrice - lowPrice);
  const rangePos = Math.max(0, Math.min(1, (lastClose - lowPrice) / rangeSpan));
  const rangePosPct = Math.round(rangePos * 100);

  const ma50Len = Math.min(50, Math.max(10, Math.floor(n * 0.5)));
  const ma200Len = n >= 220 ? 200 : Math.max(20, Math.min(160, Math.floor(n * 0.7)));
  const sma20 = calcSmaAt(data, lastIdx, Math.min(20, n));
  const sma50 = calcSmaAt(data, lastIdx, ma50Len);
  const sma200 = calcSmaAt(data, lastIdx, ma200Len);

  const lag50 = Math.min(10, Math.max(2, Math.floor(n * 0.08)));
  const prevSma50 = lastIdx - lag50 + 1 >= ma50Len ? calcSmaAt(data, lastIdx - lag50, ma50Len) : sma50;
  const sma50Rising = sma50 !== null && prevSma50 !== null ? sma50 >= prevSma50 : true;

  const lag200 = Math.min(15, Math.max(3, Math.floor(n * 0.08)));
  const prevSma200 = lastIdx - lag200 + 1 >= ma200Len ? calcSmaAt(data, lastIdx - lag200, ma200Len) : sma200;
  const sma200Rising = sma200 !== null && prevSma200 !== null ? sma200 >= prevSma200 : true;

  const aboveSma50 = sma50 !== null ? lastClose > sma50 : true;
  const aboveSma200 = sma200 !== null ? lastClose > sma200 : true;

  const choose = (dir, reason) => ({
    direction: dir,
    lowIdx,
    highIdx,
    anchorIdx: dir === 'high' ? highIdx : lowIdx,
    decisionReason: reason,
    metrics: {
      rangePosPct,
      barsSinceLow,
      barsSinceHigh,
      postLowRallyPct: Number(postLowRallyPct.toFixed(1)),
      postHighDropPct: Number(postHighDropPct.toFixed(1)),
      aboveSma50,
      aboveSma200,
      sma50Rising,
      sma200Rising
    }
  });

  if (lowIdx === highIdx) {
    return aboveSma50
      ? choose('low', 'Yükselen yapı • Dip destek AVWAP')
      : choose('high', 'Düşüş yapısı • Zirve direnç AVWAP');
  }

  // 1. Pivot Maturity Guard: avoid anchoring onto an immature tail bar when opposite extreme is mature
  const lowMature = barsSinceLow >= minMatureBars;
  const highMature = barsSinceHigh >= minMatureBars;
  if (!highMature && lowMature) {
    return choose('low', `Güncel zirve oluşumu (-${barsSinceHigh} bar) • Ana dipten destek AVWAP`);
  }
  if (!lowMature && highMature) {
    return choose('high', `Yakın tarihli dip arayışı (-${barsSinceLow} bar) • Önceki zirve arz direnci / kırılım referansı`);
  }

  // 2. Primary Uptrend: Price holds above BOTH SMA50 and SMA200
  if (aboveSma50 && aboveSma200 && (lowIdx < highIdx || postLowRallyPct >= 15)) {
    return choose('low', `Yükselen trend (SMA50 & SMA200 üzeri, bant konumu %${rangePosPct}) • Dip destek AVWAP`);
  }

  // 3. Upper-Half Bull Cycle Pullback: Cycle ran Low->High and price defends upper half near/above SMA200
  if (
    lowIdx < highIdx &&
    rangePos >= 0.45 &&
    (aboveSma200 || (sma200Rising && sma200 !== null && lastClose >= sma200 * 0.96))
  ) {
    return choose('low', `Ana yükseliş döngüsü korunuyor (üst yarı %${rangePosPct}, SMA200 desteği) • Dip AVWAP`);
  }

  // 4. Cycle Bottom Reversal & Structural Support Test (High->Low, >=30% bull leg from bottom, spot >= 98% rising SMA200)
  const minCycleBars = String(chartInterval).includes('S') ? 40 : 20;
  if (
    highIdx < lowIdx &&
    barsSinceLow >= minCycleBars &&
    postLowRallyPct >= 30 &&
    sma200 !== null &&
    lastClose >= sma200 * 0.98 &&
    sma200Rising
  ) {
    return choose('low', `Döngü dibinden +%${Math.round(postLowRallyPct)} tepki & yükselen SMA200 desteği • Dip AVWAP`);
  }

  // 5. Bear / Distribution / Breakdown: Below both SMA50 & SMA200 or trapped in lower band with falling SMA50
  if ((!aboveSma50 && !aboveSma200) || (rangePos < 0.45 && !sma50Rising)) {
    return choose('high', `Düşüş / dağıtım baskısı (SMA50/200 altı, bant konumu %${rangePosPct}) • Tepe arz maliyeti AVWAP`);
  }

  // 6. Post-peak supply structure without confirmed SMA200 reversal
  if (highIdx < lowIdx) {
    return choose('high', `Zirveden %${Math.round(postHighDropPct)} geri çekilme sonrası arz baskısı • Tepe direnç AVWAP`);
  }

  // Balanced consolidation fallback
  if (rangePos >= 0.5 && (aboveSma50 || aboveSma200 || (sma20 !== null && lastClose > sma20))) {
    return choose('low', `Denge bandı üst bölgesi (%${rangePosPct}) • Dip destek AVWAP`);
  }
  return choose('high', `Denge bandı alt bölgesi (%${rangePosPct}) • Tepe arz direnci AVWAP`);
}

// Institutional Auto-Anchored VWAP (Smart Trend-Regime Auto or Explicit Swing Low / Swing High)
export function calcAutoAVWAP(data, lookbackOrOptions = 120) {
  if (!data || data.length < 10) return { lineData: [], latest: null };

  const n = data.length;
  const decimals = data[n - 1].close < 0.1 ? 6 : data[n - 1].close < 10 ? 4 : 2;
  const opts = typeof lookbackOrOptions === 'object' && lookbackOrOptions !== null
    ? lookbackOrOptions
    : { lookback: lookbackOrOptions };

  const requestedMode = opts.mode || 'smart';
  const defaultEnd = n >= 8 ? n - 3 : n - 1;
  const startSearch = typeof opts.startIdx === 'number'
    ? Math.max(0, Math.min(opts.startIdx, defaultEnd))
    : Math.max(0, Math.min(n - Math.max(20, opts.lookback || 120), defaultEnd));
  const endSearch = typeof opts.endIdx === 'number'
    ? Math.max(startSearch, Math.min(opts.endIdx, n - 1))
    : defaultEnd;

  const isSmartAuto = requestedMode === 'smart' || requestedMode === 'auto';
  let resolvedMode = requestedMode === 'high' ? 'high' : 'low';
  let anchorIdx;
  let decisionReason = null;

  if (isSmartAuto) {
    const decision = resolveSmartAvwapDirection(data, startSearch, endSearch, opts.chartInterval || '1G');
    resolvedMode = decision.direction;
    anchorIdx = decision.anchorIdx;
    decisionReason = decision.decisionReason;
  } else {
    anchorIdx = findMajorSwingAnchor(data, startSearch, endSearch, resolvedMode);
    decisionReason = resolvedMode === 'high'
      ? 'Kullanıcı tercihi: Sabit Zirve (Arz Direnci)'
      : 'Kullanıcı tercihi: Sabit Dip (Maliyet Desteği)';
  }

  const anchorType = isSmartAuto
    ? (resolvedMode === 'high' ? 'Oto: Zirve (Direnç)' : 'Oto: Dip (Destek)')
    : (resolvedMode === 'high' ? 'Sabit Zirve (Swing High)' : 'Sabit Dip (Swing Low)');
  const anchorPrice = resolvedMode === 'high' ? data[anchorIdx]?.high : data[anchorIdx]?.low;

  let cumPV = 0;
  let cumVol = 0;
  const lineData = [];

  for (let i = anchorIdx; i < n; i++) {
    const c = data[i];
    const typicalPrice = (c.high + c.low + c.close) / 3;
    // Fallback synthetic volume weight if Yahoo returns 0 volume for an index/forex pair
    const vol = c.volume && c.volume > 0 ? c.volume : Math.max(1, Math.abs(c.high - c.low) * 1000);
    cumPV += typicalPrice * vol;
    cumVol += vol;
    const vwap = cumVol > 0 ? cumPV / cumVol : typicalPrice;
    lineData.push({
      time: c.time,
      value: Number(vwap.toFixed(decimals))
    });
  }

  const lastVal = lineData.length > 0 ? lineData[lineData.length - 1].value : null;
  return {
    lineData,
    latest: lastVal !== null
      ? {
          value: lastVal,
          anchorType,
          anchorModeResolved: resolvedMode,
          isSmartAuto,
          decisionReason,
          anchorTime: data[anchorIdx]?.time,
          anchorPrice,
          anchorIdx,
          barCount: lineData.length
        }
      : null
  };
}

// Institutional Volume Profile & Point of Control (POC + Value Area High/Low)
export function calcVolumeProfilePOC(data, lookback = 120, numBins = 28) {
  if (!data || data.length < 10) return null;

  const slice = data.slice(-Math.min(data.length, Math.max(20, lookback)));
  const lastClose = slice[slice.length - 1].close;
  const decimals = lastClose < 0.1 ? 6 : lastClose < 10 ? 4 : 2;

  let minP = Infinity;
  let maxP = -Infinity;
  for (const c of slice) {
    if (c.low < minP) minP = c.low;
    if (c.high > maxP) maxP = c.high;
  }

  if (minP >= maxP || !isFinite(minP) || !isFinite(maxP)) return null;

  const step = (maxP - minP) / numBins;
  const bins = new Array(numBins).fill(0).map((_, idx) => ({
    low: minP + idx * step,
    high: minP + (idx + 1) * step,
    mid: minP + (idx + 0.5) * step,
    volume: 0
  }));

  let totalVol = 0;
  for (const c of slice) {
    const vol = c.volume && c.volume > 0 ? c.volume : Math.max(1, Math.abs(c.high - c.low) * 1000);
    const tp = (c.high + c.low + c.close) / 3;

    // Find bins overlapped by [c.low, c.high]
    const startBin = Math.max(0, Math.min(numBins - 1, Math.floor((c.low - minP) / step)));
    const endBin = Math.max(0, Math.min(numBins - 1, Math.floor((c.high - minP) / step)));
    const count = endBin - startBin + 1;

    for (let b = startBin; b <= endBin; b++) {
      // Weight volume higher near typicalPrice
      const dist = Math.abs(bins[b].mid - tp) / (maxP - minP || 1);
      const weight = Math.max(0.2, 1 - dist * 2);
      const added = (vol / count) * weight;
      bins[b].volume += added;
      totalVol += added;
    }
  }

  let pocIdx = 0;
  for (let i = 1; i < numBins; i++) {
    if (bins[i].volume > bins[pocIdx].volume) {
      pocIdx = i;
    }
  }

  // Calculate 70% Value Area (VAH / VAL) expanding outward from POC
  const targetVol = totalVol * 0.7;
  let accumVol = bins[pocIdx].volume;
  let lowIdx = pocIdx;
  let highIdx = pocIdx;

  while (accumVol < targetVol && (lowIdx > 0 || highIdx < numBins - 1)) {
    const nextLowVol = lowIdx > 0 ? bins[lowIdx - 1].volume : -1;
    const nextHighVol = highIdx < numBins - 1 ? bins[highIdx + 1].volume : -1;
    if (nextHighVol >= nextLowVol && highIdx < numBins - 1) {
      highIdx++;
      accumVol += bins[highIdx].volume;
    } else if (lowIdx > 0) {
      lowIdx--;
      accumVol += bins[lowIdx].volume;
    } else {
      break;
    }
  }

  return {
    poc: Number(bins[pocIdx].mid.toFixed(decimals)),
    vah: Number(bins[highIdx].high.toFixed(decimals)),
    val: Number(bins[lowIdx].low.toFixed(decimals)),
    isAbovePoc: lastClose >= bins[pocIdx].mid
  };
}

function calcBollinger(data, period = 20, multiplier = 2) {
  if (!data || data.length < period) return { upper: [], middle: [], lower: [] };
  const upper = [];
  const middle = [];
  const lower = [];

  for (let i = period - 1; i < data.length; i++) {
    const slice = data.slice(i - period + 1, i + 1);
    const sum = slice.reduce((acc, c) => acc + c.close, 0);
    const sma = sum / period;
    const variance = slice.reduce((acc, c) => acc + Math.pow(c.close - sma, 2), 0) / period;
    const stdDev = Math.sqrt(variance);

    upper.push({ time: data[i].time, value: Number((sma + multiplier * stdDev).toFixed(2)) });
    middle.push({ time: data[i].time, value: Number(sma.toFixed(2)) });
    lower.push({ time: data[i].time, value: Number((sma - multiplier * stdDev).toFixed(2)) });
  }

  return { upper, middle, lower };
}

function calcRSI(data, period = 14) {
  if (!data || data.length === 0) return [];
  if (data.length <= period) {
    return data.map(d => ({ time: d.time }));
  }

  const rsi = [];
  // Add whitespace data for initial bars prior to period so the RSI series
  // perfectly matches the exact same bar indices and timestamps as the candlestick chart!
  for (let i = 0; i < period; i++) {
    rsi.push({ time: data[i].time });
  }

  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= period; i++) {
    const diff = data[i].close - data[i - 1].close;
    if (diff >= 0) gains += diff;
    else losses += Math.abs(diff);
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  for (let i = period; i < data.length; i++) {
    if (i > period) {
      const diff = data[i].close - data[i - 1].close;
      avgGain = (avgGain * (period - 1) + (diff > 0 ? diff : 0)) / period;
      avgLoss = (avgLoss * (period - 1) + (diff < 0 ? Math.abs(diff) : 0)) / period;
    }
    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    const val = avgLoss === 0 ? 100 : 100 - (100 / (1 + rs));
    rsi.push({ time: data[i].time, value: Number(val.toFixed(2)) });
  }

  return rsi;
}

// Calculate Moving Average on RSI series (default 14 SMA)
function calcRsiMA(rsiData, period = 14) {
  if (!rsiData || rsiData.length === 0) return [];
  const result = [];
  const validValues = [];
  for (let i = 0; i < rsiData.length; i++) {
    const item = rsiData[i];
    if (typeof item.value !== 'number' || isNaN(item.value)) {
      result.push({ time: item.time });
      continue;
    }
    validValues.push(item.value);
    if (validValues.length < period) {
      result.push({ time: item.time });
    } else {
      const slice = validValues.slice(-period);
      const sum = slice.reduce((acc, v) => acc + v, 0);
      const avg = Number((sum / period).toFixed(2));
      result.push({ time: item.time, value: avg });
    }
  }
  return result;
}

// Calculate Bullish (PU) and Bearish (NU) Divergences between Price and RSI
function calcDivergences(candles, rsiData, lookbackRadius = 2) {
  if (!candles || !rsiData || candles.length < 20) return { candleMarkers: [], rsiMarkers: [], latest: null };
  const points = [];
  for (let i = 0; i < candles.length; i++) {
    const c = candles[i];
    const r = rsiData[i];
    const rsiVal = (r && typeof r.value === 'number') ? r.value : null;
    points.push({ time: c.time, low: c.low, high: c.high, close: c.close, rsi: rsiVal, idx: i });
  }

  const r = lookbackRadius;
  const pivotLows = [];
  const pivotHighs = [];

  for (let i = r; i < points.length - r; i++) {
    const curr = points[i];
    if (curr.rsi === null) continue;

    let isLow = true;
    for (let j = 1; j <= r; j++) {
      if (points[i - j].low < curr.low || points[i + j].low < curr.low) {
        isLow = false;
        break;
      }
    }
    if (isLow) pivotLows.push(curr);

    let isHigh = true;
    for (let j = 1; j <= r; j++) {
      if (points[i - j].high > curr.high || points[i + j].high > curr.high) {
        isHigh = false;
        break;
      }
    }
    if (isHigh) pivotHighs.push(curr);
  }

  const rawEvents = [];

  // Pozitif Uyumsuzluk (PU / Bullish): Fiyat daha düşük dip, RSI daha yüksek dip
  for (let i = 1; i < pivotLows.length; i++) {
    const curr = pivotLows[i];
    for (let j = i - 1; j >= 0; j--) {
      const prev = pivotLows[j];
      const dist = curr.idx - prev.idx;
      if (dist < 4) continue;
      if (dist > 45) break;

      if (curr.low < prev.low * 0.998 && curr.rsi > prev.rsi + 1.2 && curr.rsi <= 65) {
        rawEvents.push({
          type: 'PU',
          title: 'Pozitif Uyumsuzluk (PU - Alış)',
          time: curr.time,
          idx: curr.idx,
          price: curr.low,
          prevPrice: prev.low,
          rsi: curr.rsi,
          prevRsi: prev.rsi
        });
        break;
      }
    }
  }

  // Negatif Uyumsuzluk (NU / Bearish): Fiyat daha yüksek tepe, RSI daha düşük tepe
  for (let i = 1; i < pivotHighs.length; i++) {
    const curr = pivotHighs[i];
    for (let j = i - 1; j >= 0; j--) {
      const prev = pivotHighs[j];
      const dist = curr.idx - prev.idx;
      if (dist < 4) continue;
      if (dist > 45) break;

      if (curr.high > prev.high * 1.002 && curr.rsi < prev.rsi - 1.2 && curr.rsi >= 35) {
        rawEvents.push({
          type: 'NU',
          title: 'Negatif Uyumsuzluk (NU - Satış)',
          time: curr.time,
          idx: curr.idx,
          price: curr.high,
          prevPrice: prev.high,
          rsi: curr.rsi,
          prevRsi: prev.rsi
        });
        break;
      }
    }
  }

  // Sort raw events by time
  rawEvents.sort((a, b) => (a.time > b.time ? 1 : a.time < b.time ? -1 : 0));

  // Debounce consecutive signals of same type within 5 bars
  const filtered = [];
  for (const ev of rawEvents) {
    const lastSame = filtered.filter(f => f.type === ev.type).pop();
    if (!lastSame || (ev.idx - lastSame.idx) >= 5) {
      filtered.push(ev);
    }
  }

  const candleMarkers = [];
  const rsiMarkers = [];

  for (const ev of filtered) {
    if (ev.type === 'PU') {
      candleMarkers.push({
        time: ev.time,
        position: 'belowBar',
        color: '#10b981',
        shape: 'arrowUp',
        text: 'PU',
        size: 1
      });
      rsiMarkers.push({
        time: ev.time,
        position: 'belowBar',
        color: '#10b981',
        shape: 'circle',
        text: 'PU',
        size: 1
      });
    } else {
      candleMarkers.push({
        time: ev.time,
        position: 'aboveBar',
        color: '#ef4444',
        shape: 'arrowDown',
        text: 'NU',
        size: 1
      });
      rsiMarkers.push({
        time: ev.time,
        position: 'aboveBar',
        color: '#ef4444',
        shape: 'circle',
        text: 'NU',
        size: 1
      });
    }
  }

  const latest = filtered.length > 0 ? filtered[filtered.length - 1] : null;

  return { candleMarkers, rsiMarkers, latest };
}

// Resample 1h candles into 2h or 4h buckets
function resampleCandles(candles, groupSize) {
  if (!candles || candles.length === 0 || groupSize <= 1) return candles;
  const res = [];
  for (let i = 0; i < candles.length; i += groupSize) {
    const chunk = candles.slice(i, i + groupSize);
    if (!chunk.length) continue;
    res.push({
      time: chunk[0].time,
      open: chunk[0].open,
      high: Math.max(...chunk.map(c => c.high)),
      low: Math.min(...chunk.map(c => c.low)),
      close: chunk[chunk.length - 1].close,
      volume: chunk.reduce((s, c) => s + (c.volume || 0), 0)
    });
  }
  return res;
}

// Resample monthly candles into 2-month or 3-month calendar buckets
function resampleMonths(candles, monthsPerBucket = 2) {
  if (!candles || candles.length === 0 || monthsPerBucket <= 1) return candles;
  const groups = new Map();
  for (const c of candles) {
    const parts = String(c.time).split('-');
    if (parts.length >= 2) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1; // 0-indexed month
      const bucket = Math.floor(month / monthsPerBucket);
      const key = `${year}_${bucket}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(c);
    } else {
      const key = c.time;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(c);
    }
  }

  const res = [];
  for (const [, chunk] of groups.entries()) {
    if (!chunk.length) continue;
    res.push({
      time: chunk[0].time,
      open: chunk[0].open,
      high: Math.max(...chunk.map(item => item.high)),
      low: Math.min(...chunk.map(item => item.low)),
      close: chunk[chunk.length - 1].close,
      volume: chunk.reduce((acc, item) => acc + (item.volume || 0), 0)
    });
  }
  return res;
}

// Heikin Ashi Candlestick Calculator
function calcHeikinAshi(candles) {
  if (!candles || candles.length === 0) return [];
  const ha = [];
  let prevHaOpen = (candles[0].open + candles[0].close) / 2;
  let prevHaClose = (candles[0].open + candles[0].high + candles[0].low + candles[0].close) / 4;

  for (let i = 0; i < candles.length; i++) {
    const c = candles[i];
    let haOpen, haClose;
    if (i === 0) {
      haOpen = prevHaOpen;
      haClose = prevHaClose;
    } else {
      haOpen = (prevHaOpen + prevHaClose) / 2;
      haClose = (c.open + c.high + c.low + c.close) / 4;
      prevHaOpen = haOpen;
      prevHaClose = haClose;
    }
    const haHigh = Math.max(c.high, haOpen, haClose);
    const haLow = Math.min(c.low, haOpen, haClose);
    const decimals = c.close < 0.1 ? 6 : c.close < 10 ? 4 : 2;

    ha.push({
      time: c.time,
      open: Number(haOpen.toFixed(decimals)),
      high: Number(haHigh.toFixed(decimals)),
      low: Number(haLow.toFixed(decimals)),
      close: Number(haClose.toFixed(decimals)),
      volume: c.volume || 0
    });
  }
  return ha;
}

// Universal ticker normalizer across aliases (e.g. BTCUSDT -> BTC, BTC-USD -> BTC, THYAO.IS -> THYAO)
export function normalizeTicker(t) {
  if (!t) return '';
  let s = typeof t === 'object' && t !== null ? (t.clean_ticker || t.ticker || '') : String(t);
  s = s.toUpperCase().trim();
  if (s.includes(':')) s = s.split(':')[1];
  s = s.replace('.IS', '');
  if (s.endsWith('USDT')) s = s.slice(0, -4);
  if (s.endsWith('-USD')) s = s.slice(0, -4);
  if (s.endsWith('USD') && !s.includes('-') && !s.includes('=')) s = s.slice(0, -3);
  return s;
}

// Normalize Lightweight Charts time object { year, month, day } to 'YYYY-MM-DD'
function normalizeChartTime(time) {
  if (!time) return null;
  if (typeof time === 'object' && time.year) {
    const m = String(time.month).padStart(2, '0');
    const d = String(time.day).padStart(2, '0');
    return `${time.year}-${m}-${d}`;
  }
  return time;
}

// 🛡️ ATR Bazlı Dinamik İz Süren Stop (Trailing Stop / Chandelier Ratchet)
export function calcTrailingStop(data, options = {}) {
  if (!data || data.length < 5) return { lineData: [], latest: null };
  const atrPeriod = Math.max(3, Number(options.atrPeriod) || 14);
  const atrMult = Math.max(0.5, Number(options.atrMult) || 2.5);
  const n = data.length;
  const decimals = data[n - 1].close < 0.1 ? 6 : data[n - 1].close < 10 ? 4 : 2;

  // 1. True Range (TR)
  const tr = new Array(n).fill(0);
  tr[0] = data[0].high - data[0].low;
  for (let i = 1; i < n; i++) {
    tr[i] = Math.max(
      data[i].high - data[i].low,
      Math.abs(data[i].high - data[i - 1].close),
      Math.abs(data[i].low - data[i - 1].close)
    );
  }

  // 2. Wilder's Smoothed ATR
  const atr = new Array(n).fill(0);
  let trSum = 0;
  const initLen = Math.min(atrPeriod, n);
  for (let i = 0; i < initLen; i++) trSum += tr[i];
  atr[initLen - 1] = trSum / initLen;
  for (let i = initLen; i < n; i++) {
    atr[i] = (atr[i - 1] * (atrPeriod - 1) + tr[i]) / atrPeriod;
  }

  // 3. Dynamic Ratchet Trailing Stop
  let trend = 1; // 1 = Long (trailing below), -1 = Short (trailing above)
  let trailingStop = data[0].low;
  const lineData = [];

  for (let i = 0; i < n; i++) {
    const curAtr = atr[i] || tr[i] || (data[i].high - data[i].low);
    const lookback = Math.min(i + 1, 22);
    let highestHigh = -Infinity;
    let lowestLow = Infinity;
    for (let k = i - lookback + 1; k <= i; k++) {
      if (data[k].high > highestHigh) highestHigh = data[k].high;
      if (data[k].low < lowestLow) lowestLow = data[k].low;
    }

    const longStop = highestHigh - curAtr * atrMult;
    const shortStop = lowestLow + curAtr * atrMult;

    if (trend === 1) {
      if (data[i].close < trailingStop) {
        trend = -1;
        trailingStop = shortStop;
      } else {
        trailingStop = Math.max(trailingStop, longStop);
      }
    } else {
      if (data[i].close > trailingStop) {
        trend = 1;
        trailingStop = longStop;
      } else {
        trailingStop = Math.min(trailingStop, shortStop);
      }
    }

    lineData.push({
      time: data[i].time,
      value: Number(trailingStop.toFixed(decimals)),
      trend,
      color: trend === 1 ? '#10b981' : '#ef4444'
    });
  }

  const last = lineData[lineData.length - 1];
  const lastClose = data[n - 1].close;
  return {
    lineData,
    latest: last ? {
      value: last.value,
      trend: last.trend,
      distPct: lastClose > 0 ? ((last.value - lastClose) / lastClose) * 100 : 0
    } : null
  };
}

// 📊 MACD (12, 26, 9) Osilatörü Hesaplayıcı (Histogram, MACD Line, Signal Line)
export function calcMACD(data, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
  if (!data || data.length < 5) return { macdLine: [], signalLine: [], histogram: [] };
  const fastEMA = calcEMA(data, fastPeriod);
  const slowEMA = calcEMA(data, slowPeriod);

  const fastMap = new Map(fastEMA.map(d => [normalizeChartTime(d.time), d.value]));
  const slowMap = new Map(slowEMA.map(d => [normalizeChartTime(d.time), d.value]));

  const macdLine = [];
  const macdCandleData = [];

  for (const c of data) {
    const t = normalizeChartTime(c.time);
    const f = fastMap.get(t);
    const s = slowMap.get(t);
    if (f !== undefined && s !== undefined) {
      const val = Number((f - s).toFixed(4));
      macdLine.push({ time: c.time, value: val });
      macdCandleData.push({ time: c.time, close: val });
    }
  }

  const signalEMA = calcEMA(macdCandleData, signalPeriod);
  const signalLine = signalEMA.map(d => ({ time: d.time, value: Number(d.value.toFixed(4)) }));
  const sigMap = new Map(signalLine.map(d => [normalizeChartTime(d.time), d.value]));

  const histogram = [];
  for (let i = 0; i < macdLine.length; i++) {
    const m = macdLine[i];
    const t = normalizeChartTime(m.time);
    const sig = sigMap.get(t);
    if (sig !== undefined) {
      const diff = Number((m.value - sig).toFixed(4));
      const prevDiff = i > 0 && histogram[i - 1] ? histogram[i - 1].value : 0;
      histogram.push({
        time: m.time,
        value: diff,
        color: diff >= 0
          ? (diff >= prevDiff ? '#10b981' : '#34d399')
          : (diff <= prevDiff ? '#ef4444' : '#f87171')
      });
    }
  }

  return { macdLine, signalLine, histogram };
}

// ⚓ Kullanıcı Tanımlı Tıklanabilir Çapalı AVWAP (Interactive Anchored VWAP)
export function calcCustomAnchoredVWAP(data, anchorTime, meta = {}) {
  if (!data || data.length === 0 || anchorTime === null || anchorTime === undefined) {
    return { lineData: [], latest: null };
  }
  const n = data.length;
  const targetTs = parseCandleTimeMs(anchorTime);

  let anchorIdx = 0;
  if (Number.isFinite(targetTs)) {
    let minDiff = Infinity;
    for (let i = 0; i < n; i++) {
      const cTs = parseCandleTimeMs(data[i].time);
      if (!Number.isFinite(cTs)) continue;
      const diff = Math.abs(cTs - targetTs);
      if (diff < minDiff) {
        minDiff = diff;
        anchorIdx = i;
      }
    }
  }

  const decimals = data[n - 1].close < 0.1 ? 6 : data[n - 1].close < 10 ? 4 : 2;
  let cumPV = 0;
  let cumVol = 0;
  const lineData = [];

  for (let i = anchorIdx; i < n; i++) {
    const c = data[i];
    const tp = (c.high + c.low + c.close) / 3;
    const vol = c.volume && c.volume > 0 ? c.volume : Math.max(1, Math.abs(c.high - c.low) * 1000);
    cumPV += tp * vol;
    cumVol += vol;
    const vwap = cumVol > 0 ? cumPV / cumVol : tp;
    lineData.push({
      time: c.time,
      value: Number(vwap.toFixed(decimals))
    });
  }

  const lastVal = lineData.length > 0 ? lineData[lineData.length - 1].value : null;
  const resolvedAnchorPrice = meta?.anchorPrice !== undefined && meta?.anchorPrice !== null
    ? meta.anchorPrice
    : data[anchorIdx]?.close;

  return {
    lineData,
    latest: lastVal !== null ? {
      value: lastVal,
      anchorType: meta?.anchorType || 'Özel (Manuel)',
      anchorModeResolved: meta?.anchorModeResolved || 'custom',
      isSmartAuto: false,
      decisionReason: meta?.decisionReason || 'Grafikten kullanıcı tarafından manuel seçilen çapa',
      anchorTime: data[anchorIdx]?.time,
      anchorPrice: resolvedAnchorPrice,
      anchorIdx,
      barCount: lineData.length
    } : null
  };
}

// Unified AVWAP dispatcher across all anchor modes (auto/Rejim, low/Dip, high/Zirve, ytd, custom) and lookback windows
export function computeConfiguredAVWAP(candles, {
  mode = 'auto',
  avwapAnchorTime = null,
  chartInterval = '1G',
  avwapLookback = 'cycle',
  visibleRange = null
} = {}) {
  if (!candles || candles.length === 0) return { lineData: [], latest: null };

  if (mode === 'custom' && avwapAnchorTime !== null && avwapAnchorTime !== undefined) {
    return calcCustomAnchoredVWAP(candles, avwapAnchorTime, {
      anchorType: 'Özel (Manuel)',
      anchorModeResolved: 'custom',
      decisionReason: 'Grafik üzerinde kullanıcı tarafından seçilen özel çapa mumu'
    });
  }

  if (mode === 'ytd') {
    const latestMs = parseCandleTimeMs(candles[candles.length - 1]?.time);
    const targetYear = Number.isFinite(latestMs) ? new Date(latestMs).getUTCFullYear() : new Date().getUTCFullYear();
    const ytdCandle = candles.find(c => {
      const ms = parseCandleTimeMs(c.time);
      return Number.isFinite(ms) && new Date(ms).getUTCFullYear() === targetYear;
    }) || candles[0];
    return calcCustomAnchoredVWAP(candles, ytdCandle.time, {
      anchorType: `YTD (${targetYear})`,
      anchorModeResolved: 'ytd',
      decisionReason: `${targetYear} yılı ilk işlem mumundan yılbaşı kurumsal maliyeti`,
      anchorPrice: ytdCandle.open ?? ytdCandle.close
    });
  }

  const { startIdx, endIdx } = getAvwapWindowBounds(candles, chartInterval, avwapLookback, visibleRange);
  const autoMode = mode === 'high' ? 'high' : mode === 'low' ? 'low' : 'smart';
  return calcAutoAVWAP(candles, {
    mode: autoMode,
    startIdx,
    endIdx,
    chartInterval
  });
}

function buildAvwapAnchorMarker(latestAvwap, color = '#06b6d4') {
  if (!latestAvwap || latestAvwap.anchorTime === null || latestAvwap.anchorTime === undefined) return null;
  const typeStr = String(latestAvwap.anchorType || '');
  const isSmart = Boolean(latestAvwap.isSmartAuto) || typeStr.startsWith('Oto:');
  const isHigh = latestAvwap.anchorModeResolved === 'high' || typeStr.includes('Zirve') || typeStr.includes('Tepe');
  const isDip = latestAvwap.anchorModeResolved === 'low' || typeStr.includes('Dip');
  const text = isSmart
    ? (isHigh ? '⚓ Oto Zirve' : '⚓ Oto Dip')
    : (isHigh ? '⚓ Zirve' : isDip ? '⚓ Dip' : '⚓ Çapa');
  return {
    time: latestAvwap.anchorTime,
    position: isHigh ? 'aboveBar' : 'belowBar',
    color: color || '#06b6d4',
    shape: isHigh ? 'arrowDown' : isDip ? 'arrowUp' : 'circle',
    text,
    size: 1
  };
}

function mergeCandleMarkers(divMarkers, avwapMarker, extraMarkers = []) {
  const combined = [...(divMarkers || []), ...(extraMarkers || [])];
  if (avwapMarker && avwapMarker.time !== null && avwapMarker.time !== undefined) {
    combined.push(avwapMarker);
  }
  combined.sort((a, b) => {
    const ma = parseCandleTimeMs(a.time);
    const mb = parseCandleTimeMs(b.time);
    if (Number.isFinite(ma) && Number.isFinite(mb) && ma !== mb) return ma - mb;
    return 0;
  });
  return combined;
}

// Universal mapping for Macro, Commodity, and Global Index tickers
export const SYMBOL_MAP = {
  // Makro & Endeks Göstergeleri
  'DXY': 'DX-Y.NYB',
  'USDX': 'DX-Y.NYB',
  'DX-Y': 'DX-Y.NYB',
  'DX-Y.NYB': 'DX-Y.NYB',
  'VIX': '^VIX',
  '^VIX': '^VIX',
  'US10Y': '^TNX',
  'US10YR': '^TNX',
  '^TNX': '^TNX',
  'TNX': '^TNX',
  'US02Y': '2YY=F',
  'US2Y': '2YY=F',
  '2YY=F': '2YY=F',
  'US05Y': '^FVX',
  'US5Y': '^FVX',
  '^FVX': '^FVX',
  'US30Y': '^TYX',
  '^TYX': '^TYX',
  'SPX': '^GSPC',
  'SP500': '^GSPC',
  'S&P500': '^GSPC',
  '^GSPC': '^GSPC',
  'NDX': '^IXIC',
  'NASDAQ': '^IXIC',
  'COMP': '^IXIC',
  '^IXIC': '^IXIC',
  '^NDX': '^NDX',
  'DJI': '^DJI',
  'DOW': '^DJI',
  'DJIA': '^DJI',
  '^DJI': '^DJI',
  'RUT': '^RUT',
  'R2000': '^RUT',
  'RUSSELL': '^RUT',
  'RUSSELL2000': '^RUT',
  '^RUT': '^RUT',
  'XU100': 'XU100.IS',
  'BIST100': 'XU100.IS',
  'XU100.IS': 'XU100.IS',
  'XU030': 'XU030.IS',
  'BIST30': 'XU030.IS',
  'XU030.IS': 'XU030.IS',
  // Emtialar
  'UKOIL': 'BZ=F',
  'BRENT': 'BZ=F',
  'BZ=F': 'BZ=F',
  'USOIL': 'CL=F',
  'WTI': 'CL=F',
  'CL=F': 'CL=F',
  'GOLD': 'GC=F',
  'XAUUSD': 'GC=F',
  'GC=F': 'GC=F',
  'SILVER': 'SI=F',
  'XAGUSD': 'SI=F',
  'SI=F': 'SI=F',
  'COPPER': 'HG=F',
  'HG=F': 'HG=F',
  'NATGAS': 'NG=F',
  'NG=F': 'NG=F'
};

// Otomatik Destek - Direnç Pivot Seviyeleri Hesaplayıcı (Genişletilmiş Makro Lookback & Pivot Filtresi)
export function calcAutoSR(data, lookback = 90) {
  if (!data || data.length < 10) return { supports: [], resistances: [] };
  const slice = data.slice(-Math.min(data.length, Math.max(20, lookback)));
  const currentPrice = data[data.length - 1].close;

  // 4 bar sol ve sağ (9 barlık güçlü swing pivot) ile minör günlük gürültüleri filtrele
  const k = 4;
  const pivotHighs = [];
  const pivotLows = [];

  for (let i = k; i < slice.length - k; i++) {
    let isH = true, isL = true;
    for (let j = 1; j <= k; j++) {
      if (slice[i].high < slice[i-j].high || slice[i].high < slice[i+j].high) isH = false;
      if (slice[i].low > slice[i-j].low || slice[i].low > slice[i+j].low) isL = false;
    }
    if (isH) pivotHighs.push(slice[i].high);
    if (isL) pivotLows.push(slice[i].low);
  }

  // Fiyatın en az %1.5 uzağındaki gerçek majör seviyeleri ayıkla
  const resFiltered = pivotHighs.filter(p => p > currentPrice * 1.015).sort((a, b) => a - b);
  const supFiltered = pivotLows.filter(p => p < currentPrice * 0.985).sort((a, b) => b - a);

  // Birbirine çok yakın (%2.5 içinde) seviyeleri tek bir ana kümede birleştir
  const clusterLevels = (levels) => {
    const clusters = [];
    for (const lvl of levels) {
      const match = clusters.find(c => Math.abs(c.price - lvl) / c.price < 0.025);
      if (match) {
        match.count++;
        match.price = (match.price + lvl) / 2;
      } else {
        clusters.push({ price: lvl, count: 1 });
      }
    }
    return clusters.sort((a, b) => b.count - a.count);
  };

  const resClusters = clusterLevels(resFiltered);
  const supClusters = clusterLevels(supFiltered);

  // Grafiği boğmamak için en güçlü 2 majör direnç ve en güçlü 2 majör destek
  const resistances = resClusters.slice(0, 2).map(c => Number(c.price.toFixed(2))).sort((a, b) => a - b);
  const supports = supClusters.slice(0, 2).map(c => Number(c.price.toFixed(2))).sort((a, b) => b - a);

  return { supports, resistances };
}

// Varsayılan Dinamik Fibonacci Seviyeleri (TradingView & Kurumsal Standart: -0.618 Genişleme'den 1.618 Altın Hedefe)
export const DEFAULT_FIB_LEVELS = [
  { ratio: -0.618, label: '-0.618', enabled: true, color: '#06b6d4', lineWidth: 1, lineStyle: 'dashed', desc: 'Hedef Genişleme (Breakout Target)' },
  { ratio: 0.000, label: '0.000', enabled: true, color: '#94a3b8', lineWidth: 1, lineStyle: 'solid', desc: 'Tepe / Dip Uç Noktası' },
  { ratio: 0.236, label: '0.236', enabled: true, color: '#c084fc', lineWidth: 1, lineStyle: 'dotted', desc: 'Hafif Düzeltme' },
  { ratio: 0.382, label: '0.382', enabled: true, color: '#f472b6', lineWidth: 1, lineStyle: 'dotted', desc: 'İlk Önemli Destek/Direnç' },
  { ratio: 0.500, label: '0.500', enabled: true, color: '#ef4444', lineWidth: 2, lineStyle: 'solid', desc: '%50 Denge Seviyesi' },
  { ratio: 0.618, label: '0.618', enabled: true, color: '#f97316', lineWidth: 2, lineStyle: 'solid', desc: 'Altın Oran (Golden Ratio)' },
  { ratio: 0.786, label: '0.786', enabled: true, color: '#38bdf8', lineWidth: 1, lineStyle: 'dotted', desc: 'Derin Düzeltme / Son Savunma' },
  { ratio: 1.000, label: '1.000', enabled: true, color: '#94a3b8', lineWidth: 1, lineStyle: 'solid', desc: 'Dalga Başlangıç Tabanı' },
  { ratio: 1.618, label: '1.618', enabled: true, color: '#10b981', lineWidth: 1, lineStyle: 'dashed', desc: 'Altın Genişleme (Golden Extension)' }
];

// Seviyeleri güvenle birleştirici yardımcı fonksiyon
export function mergeFibLevels(savedLevels) {
  if (!Array.isArray(savedLevels) || savedLevels.length === 0) {
    return DEFAULT_FIB_LEVELS;
  }
  return DEFAULT_FIB_LEVELS.map(def => {
    const found = savedLevels.find(s => {
      const sRatio = typeof s.ratio === 'number' ? s.ratio : parseFloat(s.ratio);
      return Math.abs(sRatio - def.ratio) < 0.005 || String(s.label) === String(def.label);
    });
    if (found) {
      let color = found.color;
      if (color && !color.startsWith('#')) {
        if (color.includes('148, 163, 184')) color = '#94a3b8';
        else if (color.includes('192, 132, 252')) color = '#c084fc';
        else if (color.includes('244, 114, 182')) color = '#f472b6';
        else if (color.includes('6, 182, 212')) color = '#06b6d4';
        else color = def.color;
      }
      return {
        ...def,
        ...found,
        color: color || def.color,
        ratio: def.ratio,
        label: def.label,
        enabled: found.enabled !== false,
        lineWidth: Number(found.lineWidth) || def.lineWidth,
        lineStyle: found.lineStyle || def.lineStyle
      };
    }
    return def;
  });
}

// Otomatik Dinamik Fibonacci Geri Çekilme (Genişletilmiş Makro Döngü Lookback & Hedef Genişlemeleri)
export function calcAutoFib(data, lookback = 180, customLevels = null) {
  if (!data || data.length < 10) return null;
  const slice = data.slice(-Math.min(data.length, Math.max(20, lookback)));
  
  let minLow = Infinity;
  let minLowIdx = -1;
  let maxHigh = -Infinity;
  let maxHighIdx = -1;

  for (let i = 0; i < slice.length; i++) {
    if (slice[i].low < minLow) {
      minLow = slice[i].low;
      minLowIdx = i;
    }
    if (slice[i].high > maxHigh) {
      maxHigh = slice[i].high;
      maxHighIdx = i;
    }
  }

  if (minLow === maxHigh || minLow === Infinity || maxHigh === -Infinity) return null;

  const isUptrend = minLowIdx < maxHighIdx;
  const diff = maxHigh - minLow;

  const activeLevelConfigs = mergeFibLevels(customLevels);

  const levels = activeLevelConfigs
    .filter(lvl => lvl.enabled !== false)
    .map(lvl => {
      const r = typeof lvl.ratio === 'number' ? lvl.ratio : parseFloat(lvl.ratio);
      const price = isUptrend ? (maxHigh - r * diff) : (minLow + r * diff);
      return {
        ratio: String(lvl.ratio),
        label: lvl.label || String(lvl.ratio),
        price: Number(price.toFixed(2)),
        color: lvl.color || '#38bdf8',
        lineWidth: Number(lvl.lineWidth) || 1,
        lineStyle: lvl.lineStyle || 'solid',
        enabled: lvl.enabled !== false,
        desc: lvl.desc || ''
      };
    });

  return { isUptrend, maxHigh, minLow, levels };
}

// ProChartSplitPane: Side-by-side secondary timeframe chart (Çoklu Zaman Dilimi / Split-Screen)
function ProChartSplitPane({
  ticker,
  isBist,
  isLight,
  primaryInterval,
  splitInterval,
  setSplitInterval,
  onClose
}) {
  const containerRef = useRef(null);
  const chartInstanceRef = useRef(null);
  const candlestickSeriesRef = useRef(null);
  const volumeSeriesRef = useRef(null);
  const emaSeriesRef = useRef(null);
  const [candles, setCandles] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);

  const splitIntervalOptions = ['1S', '2S', '4S', '1G', '1H'];

  // Initialize secondary Lightweight Chart
  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const initialWidth = container.clientWidth || 400;
    const initialHeight = container.clientHeight || 400;

    const chart = createChart(container, {
      width: initialWidth,
      height: initialHeight,
      attributionLogo: false,
      layout: {
        attributionLogo: false,
        background: { type: 'solid', color: isLight ? '#ffffff' : '#040711' },
        textColor: isLight ? '#475569' : '#94a3b8',
        fontSize: 10,
        fontFamily: 'Inter, system-ui, monospace'
      },
      grid: {
        vertLines: { color: isLight ? 'rgba(15, 23, 42, 0.06)' : 'rgba(255, 255, 255, 0.03)' },
        horzLines: { color: isLight ? 'rgba(15, 23, 42, 0.06)' : 'rgba(255, 255, 255, 0.03)' }
      },
      timeScale: {
        borderColor: isLight ? '#cbd5e1' : 'rgba(255,255,255,0.08)',
        timeVisible: splitInterval.includes('S'),
        secondsVisible: false,
        rightOffset: 6,
        barSpacing: 8
      },
      rightPriceScale: {
        borderColor: isLight ? '#cbd5e1' : 'rgba(255,255,255,0.08)',
        autoScale: true,
        scaleMargins: { top: 0.08, bottom: 0.18 }
      },
      crosshair: {
        mode: CrosshairMode.Normal
      }
    });

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#10b981',
      downColor: '#ef4444',
      borderVisible: false,
      wickUpColor: '#10b981',
      wickDownColor: '#ef4444',
      priceLineVisible: false,
      lastValueVisible: true
    });

    const volSeries = chart.addSeries(HistogramSeries, {
      color: '#38bdf8',
      priceFormat: { type: 'volume' },
      priceScaleId: 'splitVolume'
    });
    chart.priceScale('splitVolume').applyOptions({
      scaleMargins: { top: 0.82, bottom: 0 }
    });

    const emaSeries = chart.addSeries(LineSeries, {
      color: '#f59e0b',
      lineWidth: 1.5,
      priceLineVisible: false
    });

    chartInstanceRef.current = chart;
    candlestickSeriesRef.current = candleSeries;
    volumeSeriesRef.current = volSeries;
    emaSeriesRef.current = emaSeries;

    // Responsive ResizeObserver to guarantee canvas dimensions match flex container
    const ro = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0 || !chartInstanceRef.current) return;
      const { width: newWidth, height: newHeight } = entries[0].contentRect;
      if (newWidth > 0 && newHeight > 0) {
        chartInstanceRef.current.resize(newWidth, newHeight);
      }
    });
    ro.observe(container);

    return () => {
      ro.disconnect();
      chart.remove();
      chartInstanceRef.current = null;
      candlestickSeriesRef.current = null;
      volumeSeriesRef.current = null;
      emaSeriesRef.current = null;
    };
  }, [isLight]);

  // Fetch candles whenever splitInterval or ticker changes
  useEffect(() => {
    let active = true;
    const fetchSplitData = async () => {
      setIsLoading(true);
      setLoadError(null);

      const rawUpper = (ticker || '').toUpperCase().trim();
      let querySymbol = rawUpper;
      if (SYMBOL_MAP[rawUpper]) {
        querySymbol = SYMBOL_MAP[rawUpper];
      } else if (isBist) {
        querySymbol = rawUpper.endsWith('.IS') ? rawUpper : `${rawUpper}.IS`;
      } else if (rawUpper.endsWith('USDT')) {
        querySymbol = `${rawUpper.slice(0, -4)}-USD`;
      } else if (rawUpper.endsWith('USD') && !rawUpper.includes('-') && !rawUpper.includes('.') && !rawUpper.includes('=')) {
        querySymbol = `${rawUpper.slice(0, -3)}-USD`;
      }

      let yInterval = '1d';
      let yRange = '2y';
      let resampleGroup = 1;
      if (splitInterval === '1H') { yInterval = '1wk'; yRange = '5y'; }
      else if (splitInterval === '1G') { yInterval = '1d'; yRange = '2y'; }
      else if (splitInterval === '4S') { yInterval = '1h'; yRange = '2y'; resampleGroup = 4; }
      else if (splitInterval === '2S') { yInterval = '1h'; yRange = '2y'; resampleGroup = 2; }
      else if (splitInterval === '1S') { yInterval = '1h'; yRange = '2y'; }

      const parseYahooJson = (j) => {
        const timestamps = j?.chart?.result?.[0]?.timestamp || [];
        const q = j?.chart?.result?.[0]?.indicators?.quote?.[0] || {};
        const opens = q.open || [];
        const highs = q.high || [];
        const lows = q.low || [];
        const closes = q.close || [];
        const vols = q.volume || [];
        const isIntraday = (yInterval.includes('m') && !yInterval.includes('mo')) || yInterval.includes('h');
        const parsed = [];

        for (let i = 0; i < timestamps.length; i++) {
          const c = closes[i];
          if (typeof c === 'number' && !isNaN(c) && c > 0) {
            const timeVal = isIntraday ? timestamps[i] : new Date(timestamps[i] * 1000).toISOString().split('T')[0];
            parsed.push({
              time: timeVal,
              open: Number((opens[i] || c).toFixed(2)),
              high: Number((highs[i] || c).toFixed(2)),
              low: Number((lows[i] || c).toFixed(2)),
              close: Number(c.toFixed(2)),
              volume: Number((vols[i] || 0).toFixed(0))
            });
          }
        }
        return parsed;
      };

      let dataCandles = null;

      // 1. Primary: backend /api/market?chart=
      try {
        const res = await fetch(`/api/market?chart=${encodeURIComponent(querySymbol)}&interval=${yInterval}&range=${yRange}`);
        if (res.ok) {
          const json = await res.json();
          if (json?.status === 'success' && Array.isArray(json.candles) && json.candles.length > 0) {
            dataCandles = json.candles;
          }
        }
      } catch (e) {}

      // 2. Secondary: /api/market?type=candles
      if (!dataCandles || dataCandles.length === 0) {
        try {
          const res = await fetch(`/api/market?type=candles&symbol=${encodeURIComponent(querySymbol)}&interval=${yInterval}&range=${yRange}`);
          if (res.ok) {
            const json = await res.json();
            if (Array.isArray(json) && json.length > 0) {
              dataCandles = json;
            } else if (json?.candles && Array.isArray(json.candles) && json.candles.length > 0) {
              dataCandles = json.candles;
            }
          }
        } catch (e) {}
      }

      // 3. Tertiary: direct Yahoo Finance fallback
      if (!dataCandles || dataCandles.length === 0) {
        try {
          const yUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(querySymbol)}?interval=${yInterval}&range=${yRange}`;
          const yResp = await fetch(yUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
          });
          if (yResp.ok) {
            const j = await yResp.json();
            const parsed = parseYahooJson(j);
            if (parsed.length > 0) dataCandles = parsed;
          }
        } catch (e) {}
      }

      let cleanCandles = (dataCandles || []).filter(c => c && typeof c.close === 'number' && !isNaN(c.close));

      if (resampleGroup > 1 && cleanCandles.length > 0) {
        cleanCandles = resampleCandles(cleanCandles, resampleGroup);
      }

      cleanCandles.sort((a, b) => (a.time > b.time ? 1 : a.time < b.time ? -1 : 0));
      const deduplicated = [];
      const seenTimes = new Set();
      for (const item of cleanCandles) {
        if (!seenTimes.has(item.time)) {
          seenTimes.add(item.time);
          deduplicated.push(item);
        }
      }

      if (active) {
        if (deduplicated.length > 0) {
          setCandles(deduplicated);
          if (candlestickSeriesRef.current) {
            candlestickSeriesRef.current.setData(deduplicated);
          }
          if (volumeSeriesRef.current) {
            volumeSeriesRef.current.setData(deduplicated.map(c => ({
              time: c.time,
              value: c.volume,
              color: c.close >= c.open ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)'
            })));
          }
          if (emaSeriesRef.current) {
            const emaData = calcEMA(deduplicated, 20);
            emaSeriesRef.current.setData(emaData);
          }
          if (chartInstanceRef.current) {
            chartInstanceRef.current.timeScale().applyOptions({
              timeVisible: splitInterval.includes('S')
            });
            chartInstanceRef.current.timeScale().fitContent();
          }
        } else {
          setLoadError(`${ticker} için ${splitInterval} verisi yüklenemedi`);
        }
        setIsLoading(false);
      }
    };

    fetchSplitData();
    return () => { active = false; };
  }, [ticker, isBist, splitInterval]);

  const latestCandle = candles[candles.length - 1];

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      width: '100%',
      height: '100%',
      background: isLight ? '#ffffff' : '#040711',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Header bar */}
      <div style={{
        padding: '5px 10px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: isLight ? '#f1f5f9' : 'rgba(8, 12, 24, 0.95)',
        borderBottom: isLight ? '1px solid #cbd5e1' : '1px solid rgba(255,255,255,0.08)',
        fontSize: 11,
        flexShrink: 0,
        zIndex: 5
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontWeight: 800, color: 'var(--cyan)' }}>⊞ Çift Zaman Dilimi:</span>
          <span style={{ fontWeight: 700, color: isLight ? '#0f172a' : '#fff' }}>{ticker}</span>
          {latestCandle && (
            <span style={{ fontFamily: 'monospace', color: latestCandle.close >= latestCandle.open ? '#10b981' : '#ef4444', fontWeight: 700 }}>
              {isBist ? `₺${latestCandle.close}` : `$${latestCandle.close}`}
            </span>
          )}
          <span style={{ fontSize: 9.5, color: '#f59e0b' }}>• 20 EMA</span>
        </div>

        {/* Interval Selector & Close */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {splitIntervalOptions.map(int => (
            <button
              key={int}
              type="button"
              onClick={() => setSplitInterval(int)}
              style={{
                background: splitInterval === int ? (isLight ? '#0284c7' : 'rgba(0, 229, 255, 0.25)') : 'transparent',
                color: splitInterval === int ? (isLight ? '#ffffff' : '#00e5ff') : (isLight ? '#64748b' : '#94a3b8'),
                border: splitInterval === int ? '1px solid var(--cyan)' : '1px solid transparent',
                borderRadius: 4,
                padding: '2px 7px',
                fontSize: 10,
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              {int}
            </button>
          ))}
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: isLight ? '#dc2626' : '#ef4444',
              cursor: 'pointer',
              marginLeft: 6,
              padding: '2px 5px',
              fontWeight: 800
            }}
            title="Çift Görünümü Kapat"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Loading indicator */}
      {isLoading && (
        <div style={{
          position: 'absolute',
          inset: 0,
          background: isLight ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10,
          gap: 8
        }}>
          <div className="spinner" />
          <span style={{ fontSize: 11, color: 'var(--cyan)', fontWeight: 600 }}>
            {ticker} ({splitInterval}) verileri yükleniyor...
          </span>
        </div>
      )}

      {/* Error Retry Box */}
      {loadError && !isLoading && (
        <div style={{
          position: 'absolute',
          inset: 0,
          background: isLight ? 'rgba(255,255,255,0.92)' : 'rgba(4, 7, 17, 0.92)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10,
          gap: 8
        }}>
          <span style={{ fontSize: 11, color: '#f87171', fontWeight: 600 }}>{loadError}</span>
          <button
            type="button"
            onClick={() => setSplitInterval(splitInterval)}
            className="chip-btn"
            style={{ fontSize: 10, padding: '3px 10px' }}
          >
            Yeniden Dene
          </button>
        </div>
      )}

      {/* Chart container */}
      <div 
        ref={containerRef} 
        style={{ 
          flex: 1, 
          width: '100%', 
          height: '100%', 
          minHeight: 280, 
          position: 'relative' 
        }} 
      />
    </div>
  );
}

export default function NativeProChart({
  symbol,
  cleanTicker,
  isBist = false,
  activeHolding = null,
  usdtry = 49.03,
  isFullscreen = false,
  onToggleFullscreen,
  sidebarOpen = true,
  onToggleSidebar,
  sessionTimer = { status: 'open', text: '', badge: '' },
  onOpenAddModal
}) {
  const chartContainerRef = useRef(null);
  const rsiContainerRef = useRef(null);

  // Persistent RSI pane height (TradingView-style resizable panel)
  const [rsiHeight, setRsiHeight] = useState(() => {
    try {
      const saved = localStorage.getItem('terminal_rsi_height');
      if (saved) return Math.max(90, Math.min(500, parseInt(saved) || 165));
    } catch (e) {}
    return 165; // Ferah ve okunaklı 165px varsayılan
  });
  const rsiHeightRef = useRef(rsiHeight);
  rsiHeightRef.current = rsiHeight;

  const isDraggingSplitterRef = useRef(false);
  const splitterStartYRef = useRef(0);
  const splitterStartHeightRef = useRef(165);
  const [isDraggingSplitter, setIsDraggingSplitter] = useState(false);

  const handleSplitterPointerDown = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch (err) {}
    isDraggingSplitterRef.current = true;
    setIsDraggingSplitter(true);
    splitterStartYRef.current = e.clientY;
    splitterStartHeightRef.current = rsiHeightRef.current;
  }, []);

  const handleSplitterPointerMove = useCallback((e) => {
    if (!isDraggingSplitterRef.current) return;
    const deltaY = splitterStartYRef.current - e.clientY;
    const newHeight = Math.max(90, Math.min(480, splitterStartHeightRef.current + deltaY));
    setRsiHeight(newHeight);
    try {
      localStorage.setItem('terminal_rsi_height', String(newHeight));
    } catch (err) {}
  }, []);

  const handleSplitterPointerUp = useCallback((e) => {
    if (!isDraggingSplitterRef.current) return;
    isDraggingSplitterRef.current = false;
    setIsDraggingSplitter(false);
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch (err) {}
  }, []);

  // 📊 Persistent MACD Pane Height & Resizable Splitter
  const [macdHeight, setMacdHeight] = useState(() => {
    try {
      const saved = localStorage.getItem('terminal_macd_height');
      if (saved) return Math.max(80, Math.min(450, parseInt(saved) || 135));
    } catch (e) {}
    return 135;
  });
  const macdHeightRef = useRef(macdHeight);
  macdHeightRef.current = macdHeight;

  const isDraggingMacdSplitterRef = useRef(false);
  const macdSplitterStartYRef = useRef(0);
  const macdSplitterStartHeightRef = useRef(135);
  const [isDraggingMacdSplitter, setIsDraggingMacdSplitter] = useState(false);

  const handleMacdSplitterPointerDown = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch (err) {}
    isDraggingMacdSplitterRef.current = true;
    setIsDraggingMacdSplitter(true);
    macdSplitterStartYRef.current = e.clientY;
    macdSplitterStartHeightRef.current = macdHeightRef.current;
  }, []);

  const handleMacdSplitterPointerMove = useCallback((e) => {
    if (!isDraggingMacdSplitterRef.current) return;
    const deltaY = macdSplitterStartYRef.current - e.clientY;
    const newHeight = Math.max(80, Math.min(450, macdSplitterStartHeightRef.current + deltaY));
    setMacdHeight(newHeight);
    try {
      localStorage.setItem('terminal_macd_height', String(newHeight));
    } catch (err) {}
  }, []);

  const handleMacdSplitterPointerUp = useCallback((e) => {
    if (!isDraggingMacdSplitterRef.current) return;
    isDraggingMacdSplitterRef.current = false;
    setIsDraggingMacdSplitter(false);
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch (err) {}
  }, []);

  const chartInstanceRef = useRef(null);
  const rsiChartInstanceRef = useRef(null);
  const macdContainerRef = useRef(null);
  const macdChartInstanceRef = useRef(null);
  const macdLineSeriesRef = useRef(null);
  const signalLineSeriesRef = useRef(null);
  const histSeriesRef = useRef(null);

  const candlestickSeriesRef = useRef(null);
  const volumeSeriesRef = useRef(null);
  const costPriceLineRef = useRef(null);
  const trailingStopSeriesRef = useRef(null);

  // Auto Analysis Price Lines Refs
  const autoSRLinesRef = useRef([]);
  const autoFibLinesRef = useRef([]);
  const pocLinesRef = useRef([]);

  // Indicator series refs
  const kamaSeriesRef = useRef(null);
  const trendMa55SeriesRef = useRef(null);
  const avwapSeriesRef = useRef(null);
  const ema20SeriesRef = useRef(null);
  const ema50SeriesRef = useRef(null);
  const ema200SeriesRef = useRef(null);
  const bbUpperSeriesRef = useRef(null);
  const bbMiddleSeriesRef = useRef(null);
  const bbLowerSeriesRef = useRef(null);
  const rsiSeriesRef = useRef(null);
  const rsiMaSeriesRef = useRef(null);
  const candleMarkersPluginRef = useRef(null);
  const rsiMarkersPluginRef = useRef(null);

  // Horizontal price lines refs mapping
  const horizontalPriceLinesMapRef = useRef(new Map());

  // Reference to current active candles for range sync calculations (display & raw OHLC)
  const candlesRef = useRef([]);
  const rawCandlesRef = useRef([]);
  const latestDivMarkersRef = useRef([]);
  const latestTrendMarkersRef = useRef([]);
  const avwapVisibleTimerRef = useRef(null);
  const lastAvwapSyncKeyRef = useRef('');
  const chartIntervalRef = useRef('1G');
  const indicatorsRef = useRef(null);
  const indicatorSettingsRef = useRef(null);

  // Persistent user chart view (zoom level & right margin offset)
  const lastViewConfigRef = useRef((() => {
    try {
      const saved = localStorage.getItem('terminal_chart_view_config');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return { barCount: 95, rightOffset: 8 };
  })());

  // Component state
  const [chartInterval, setChartInterval] = useState(() => {
    try { return localStorage.getItem('terminal_chart_interval') || '1G'; } catch (e) { return '1G'; }
  });
  const [candleType, setCandleType] = useState(() => {
    try { return localStorage.getItem('terminal_candle_type') || 'candles'; } catch (e) { return 'candles'; }
  });
  const [candles, setCandles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [hoverData, setHoverData] = useState(null);

  // Dynamic SVG Trendline, Ray, Rectangle, Channel & Anchored VWAP Coordinates state
  const [svgTrendlines, setSvgTrendlines] = useState([]);
  const [svgRays, setSvgRays] = useState([]);
  const [svgRectangles, setSvgRectangles] = useState([]);
  const [svgChannels, setSvgChannels] = useState([]);
  const [svgAnchoredVwaps, setSvgAnchoredVwaps] = useState([]);
  const [svgHorizontals, setSvgHorizontals] = useState([]);
  const [svgMeasurement, setSvgMeasurement] = useState(null);

  const [selectedTrendlineId, setSelectedTrendlineId] = useState(null);
  const [selectedRayId, setSelectedRayId] = useState(null);
  const [selectedRectId, setSelectedRectId] = useState(null);
  const [selectedChannelId, setSelectedChannelId] = useState(null);
  const [selectedAnchoredVwapId, setSelectedAnchoredVwapId] = useState(null);
  const [selectedHorizontalId, setSelectedHorizontalId] = useState(null);

  // Keyboard & selection tracking refs (avoids stale closures)
  const selectedTrendlineIdRef = useRef(selectedTrendlineId);
  selectedTrendlineIdRef.current = selectedTrendlineId;
  const selectedRayIdRef = useRef(selectedRayId);
  selectedRayIdRef.current = selectedRayId;
  const selectedRectIdRef = useRef(selectedRectId);
  selectedRectIdRef.current = selectedRectId;
  const selectedChannelIdRef = useRef(selectedChannelId);
  selectedChannelIdRef.current = selectedChannelId;
  const selectedAnchoredVwapIdRef = useRef(selectedAnchoredVwapId);
  selectedAnchoredVwapIdRef.current = selectedAnchoredVwapId;
  const selectedHorizontalIdRef = useRef(selectedHorizontalId);
  selectedHorizontalIdRef.current = selectedHorizontalId;
  const showDrawingsListRef = useRef(false);
  const activeDrawToolRef = useRef(null);
  const showSettingsModalRef = useRef(false);
  const drawingsListRef = useRef(null);

  const [dragHandleState, setDragHandleState] = useState(null); // { lineId, point, pointerId, curX, curY, curPrice, curTime }
  const [hoveredHandle, setHoveredHandle] = useState(null);

  // Drawing Tools State
  // Modes: null, 'horizontal', 'ray', 'trendline', 'measure', 'rectangle', 'channel', 'anchoredVwap'
  const [activeDrawTool, setActiveDrawTool] = useState(null);
  const [trendStartPoint, setTrendStartPoint] = useState(null); // { time, price, x, y }
  const [rectStartPoint, setRectStartPoint] = useState(null);
  const [channelPoints, setChannelPoints] = useState([]);
  const [measureStartPoint, setMeasureStartPoint] = useState(null);
  const [activeMeasurement, setActiveMeasurement] = useState(null); // { p1, p2, active: true }

  const [mousePreviewPoint, setMousePreviewPoint] = useState(null);
  const [showDrawingsList, setShowDrawingsList] = useState(false);
  showDrawingsListRef.current = showDrawingsList;
  activeDrawToolRef.current = activeDrawTool;

  // 📷 Screenshot Toast & ⊞ Split-Screen State
  const [screenshotToast, setScreenshotToast] = useState(null);
  const [splitView, setSplitView] = useState(() => {
    try { return localStorage.getItem('terminal_split_view') === 'true'; } catch (e) { return false; }
  });
  const [splitInterval, setSplitInterval] = useState(() => {
    try { return localStorage.getItem('terminal_split_interval') || '4S'; } catch (e) { return '4S'; }
  });

  // Chart Theme: 'dark' (Default Bloomberg Dark) | 'light' (Crisp TradingView Light)
  const [chartTheme, setChartTheme] = useState(() => {
    try { return localStorage.getItem('terminal_chart_theme') || 'dark'; } catch (e) { return 'dark'; }
  });
  const isLight = chartTheme === 'light';

  // Modal for Indicator Settings
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  showSettingsModalRef.current = showSettingsModal;
  const [settingsTab, setSettingsTab] = useState('general'); // 'general' | 'fib'
  const [latestDivergence, setLatestDivergence] = useState(null);
  const [latestKamaState, setLatestKamaState] = useState(null);
  const [latestTrendMaState, setLatestTrendMaState] = useState(null);
  const [mtfKamaState, setMtfKamaState] = useState(null);
  const [latestAvwapState, setLatestAvwapState] = useState(null);
  const [latestPocState, setLatestPocState] = useState(null);
  const [latestTrailingStopState, setLatestTrailingStopState] = useState(null);

  // Flags to avoid feedback loop between Firestore subscription and local state updates
  const isApplyingCloudPreferencesRef = useRef(false);
  const isApplyingCloudSettingsRef = useRef(false);
  const isApplyingCloudDrawingsRef = useRef(false);

  // User persistent indicator parameters
  const [indicatorSettings, setIndicatorSettings] = useState(() => {
    try {
      const saved = localStorage.getItem('terminal_indicator_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        const isV3 = parsed.kamaVersion === 3;
        return {
          rsiPeriod: 24,
          rsiMaPeriod: 14,
          ema1Period: parsed.ema1Period || 20,
          ema1Type: parsed.ema1Type || 'EMA',
          ema2Period: parsed.ema2Period || 50,
          ema2Type: parsed.ema2Type || 'SMA',
          ema3Period: parsed.ema3Period || 200,
          ema3Type: parsed.ema3Type || 'SMA',
          bollingerPeriod: 20,
          bollingerStdDev: 2,
          fibLookback: 180,
          srLookback: 90,
          showLevelTitles: false,
          ...parsed,
          kamaVersion: 3,
          kamaErPeriod: isV3 ? (parsed.kamaErPeriod || 10) : 10,
          kamaFastPeriod: isV3 ? (parsed.kamaFastPeriod || 5) : 5,
          kamaSlowPeriod: isV3 ? (parsed.kamaSlowPeriod || 30) : 30,
          kamaFilterPeriod: isV3 ? (parsed.kamaFilterPeriod || 20) : 20,
          kamaFilterMult: isV3 ? (parsed.kamaFilterMult ?? 2) : 2,
          kamaUpColor: parsed.kamaUpColor || '#00e676',
          kamaDownColor: parsed.kamaDownColor || '#ef4444',
          costLineColor: parsed.costLineColor || '#eab308',
          avwapColor: isV3 ? (parsed.avwapColor || '#06b6d4') : '#06b6d4',
          avwapAnchorMode: parsed.avwapAnchorMode || 'auto',
          avwapAnchorTime: parsed.avwapAnchorTime || null,
          avwapLookback: parsed.avwapLookback || 'cycle',
          pocColor: isV3 ? (parsed.pocColor || '#d946ef') : '#d946ef',
          trailingStopPeriod: parsed.trailingStopPeriod || 14,
          trailingStopMult: parsed.trailingStopMult || 2.5,
          trailingStopColor: parsed.trailingStopColor || '#f59e0b',
          macdFastPeriod: parsed.macdFastPeriod || 12,
          macdSlowPeriod: parsed.macdSlowPeriod || 26,
          macdSignalPeriod: parsed.macdSignalPeriod || 9,
          ema1Color: parsed.ema1Color || '#ef4444',
          ema2Color: parsed.ema2Color || '#3b82f6',
          ema3Color: parsed.ema3Color || '#f97316',
          trendMaPeriod: parsed.trendMaPeriod || 55,
          trendMaType: parsed.trendMaType || 'SMA',
          trendRsiPeriod: parsed.trendRsiPeriod || 24,
          trendRsiMaPeriod: parsed.trendRsiMaPeriod || 55,
          trendConfirmBars: parsed.trendConfirmBars || 2,
          trendUpColor: parsed.trendUpColor || '#10b981',
          trendDownColor: parsed.trendDownColor || '#ef4444',
          trendShowMarkers: parsed.trendShowMarkers !== false,
          fibLevels: mergeFibLevels(parsed.fibLevels)
        };
      }
    } catch (e) {}
    return {
      rsiPeriod: 24,
      rsiMaPeriod: 14,
      kamaVersion: 3,
      kamaErPeriod: 10,
      kamaFastPeriod: 5,
      kamaSlowPeriod: 30,
      kamaFilterPeriod: 20,
      kamaFilterMult: 2,
      kamaUpColor: '#00e676',
      kamaDownColor: '#ef4444',
      costLineColor: '#eab308',
      avwapColor: '#06b6d4',
      avwapAnchorMode: 'auto',
      avwapAnchorTime: null,
      avwapLookback: 'cycle',
      pocColor: '#d946ef',
      trailingStopPeriod: 14,
      trailingStopMult: 2.5,
      trailingStopColor: '#f59e0b',
      macdFastPeriod: 12,
      macdSlowPeriod: 26,
      macdSignalPeriod: 9,
      ema1Period: 20,
      ema1Type: 'EMA',
      ema1Color: '#ef4444',
      ema2Period: 50,
      ema2Type: 'SMA',
      ema2Color: '#3b82f6',
      ema3Period: 200,
      ema3Type: 'SMA',
      ema3Color: '#f97316',
      trendMaPeriod: 55,
      trendMaType: 'SMA',
      trendRsiPeriod: 24,
      trendRsiMaPeriod: 55,
      trendConfirmBars: 2,
      trendUpColor: '#10b981',
      trendDownColor: '#ef4444',
      trendShowMarkers: true,
      bollingerPeriod: 20,
      bollingerStdDev: 2,
      fibLookback: 180,
      srLookback: 90,
      showLevelTitles: false,
      fibLevels: DEFAULT_FIB_LEVELS
    };
  });

  // Persistent Active Indicators (Default matches user preferences: KAMA Pro, EMA 50, RSI, Fib active; CostLine off)
  const [indicators, setIndicators] = useState(() => {
    try {
      const saved = localStorage.getItem('terminal_chart_indicators');
      if (saved) return { rsiMa: true, rsiDivergence: true, kama: true, trendMa55: false, avwap: false, vpPoc: false, trailingStop: false, macd: false, ...JSON.parse(saved) };
    } catch (e) {}
    return {
      kama: true,
      trendMa55: false,
      avwap: false,
      vpPoc: false,
      trailingStop: false,
      macd: false,
      ema20: false,
      ema50: true,
      ema200: false,
      bollinger: false,
      volume: true,
      rsi: true,
      rsiMa: true,
      rsiDivergence: true,
      costLine: false,
      autoSR: false,
      autoFib: true
    };
  });

  // Sync volatile settings/state into refs for live chart subscribers (avoids chart recreation)
  chartIntervalRef.current = chartInterval;
  indicatorsRef.current = indicators;
  indicatorSettingsRef.current = indicatorSettings;

  // 1. Subscribe to Firebase Firestore Cloud Preferences (Real-Time Sync between PC & Mobile)
  useEffect(() => {
    const unsubPrefs = onSnapshot(doc(db, 'chart_preferences', 'settings'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data && data.indicators) {
          isApplyingCloudPreferencesRef.current = true;
          const mergedIndicators = {
            rsiMa: true,
            rsiDivergence: true,
            kama: true,
            trendMa55: false,
            avwap: false,
            vpPoc: false,
            trailingStop: false,
            macd: false,
            ...data.indicators
          };
          setIndicators(prev => {
            if (JSON.stringify(prev) !== JSON.stringify(mergedIndicators)) {
              return mergedIndicators;
            }
            return prev;
          });
          try {
            localStorage.setItem('terminal_chart_indicators', JSON.stringify(mergedIndicators));
          } catch (e) {}
        }
        if (data && data.indicatorSettings) {
          isApplyingCloudSettingsRef.current = true;
          const s = data.indicatorSettings;
          const isV3 = s.kamaVersion === 3;
          const mergedSettings = {
            rsiPeriod: 24,
            rsiMaPeriod: 14,
            ema1Period: 20,
            ema2Period: 50,
            ema3Period: 200,
            bollingerPeriod: 20,
            bollingerStdDev: 2,
            fibLookback: 180,
            srLookback: 90,
            showLevelTitles: false,
            ...s,
            kamaVersion: 3,
            kamaErPeriod: isV3 ? (s.kamaErPeriod || 10) : 10,
            kamaFastPeriod: isV3 ? (s.kamaFastPeriod || 5) : 5,
            kamaSlowPeriod: isV3 ? (s.kamaSlowPeriod || 30) : 30,
            kamaFilterPeriod: isV3 ? (s.kamaFilterPeriod || 20) : 20,
            kamaFilterMult: isV3 ? (s.kamaFilterMult ?? 2) : 2,
            kamaUpColor: s.kamaUpColor || '#00e676',
            kamaDownColor: s.kamaDownColor || '#ef4444',
            costLineColor: s.costLineColor || '#eab308',
            avwapColor: isV3 ? (s.avwapColor || '#06b6d4') : '#06b6d4',
            avwapAnchorMode: s.avwapAnchorMode || 'auto',
            avwapAnchorTime: s.avwapAnchorTime ?? null,
            avwapLookback: s.avwapLookback || 'cycle',
            pocColor: isV3 ? (s.pocColor || '#d946ef') : '#d946ef',
            ema1Color: s.ema1Color || '#ef4444',
            ema2Color: s.ema2Color || '#3b82f6',
            ema3Color: s.ema3Color || '#f97316',
            trendMaPeriod: s.trendMaPeriod || 55,
            trendMaType: s.trendMaType || 'SMA',
            trendRsiPeriod: s.trendRsiPeriod || 24,
            trendRsiMaPeriod: s.trendRsiMaPeriod || 55,
            trendConfirmBars: s.trendConfirmBars || 2,
            trendUpColor: s.trendUpColor || '#10b981',
            trendDownColor: s.trendDownColor || '#ef4444',
            trendShowMarkers: s.trendShowMarkers !== false,
            fibLevels: mergeFibLevels(s.fibLevels)
          };
          setIndicatorSettings(prev => {
            if (JSON.stringify(prev) !== JSON.stringify(mergedSettings)) {
              return mergedSettings;
            }
            return prev;
          });
          try {
            localStorage.setItem('terminal_indicator_settings', JSON.stringify(mergedSettings));
          } catch (e) {}
        }
        if (data && data.chartTheme) {
          setChartTheme(data.chartTheme);
          try { localStorage.setItem('terminal_chart_theme', data.chartTheme); } catch (e) {}
        }
        if (data && data.chartInterval) {
          setChartInterval(data.chartInterval);
          try { localStorage.setItem('terminal_chart_interval', data.chartInterval); } catch (e) {}
        }
        if (data && data.candleType) {
          setCandleType(data.candleType);
          try { localStorage.setItem('terminal_candle_type', data.candleType); } catch (e) {}
        }
      }
    }, (err) => {
      console.warn('Firestore preferences subscription error:', err);
    });

    return () => unsubPrefs();
  }, []);

  // Timeframe and Candle Type Action Handlers
  const handleSetChartInterval = useCallback((tf) => {
    setChartInterval(tf);
    try { localStorage.setItem('terminal_chart_interval', tf); } catch (e) {}
    try {
      setDoc(doc(db, 'chart_preferences', 'settings'), {
        chartInterval: tf,
        updatedAt: Date.now()
      }, { merge: true });
    } catch (e) {}
  }, []);

  const handleSetCandleType = useCallback((type) => {
    setCandleType(type);
    try { localStorage.setItem('terminal_candle_type', type); } catch (e) {}
    try {
      setDoc(doc(db, 'chart_preferences', 'settings'), {
        candleType: type,
        updatedAt: Date.now()
      }, { merge: true });
    } catch (e) {}
  }, []);

  const handleToggleTheme = useCallback(() => {
    setChartTheme(prev => {
      const nextTheme = prev === 'dark' ? 'light' : 'dark';
      try { localStorage.setItem('terminal_chart_theme', nextTheme); } catch (e) {}
      try {
        setDoc(doc(db, 'chart_preferences', 'settings'), {
          chartTheme: nextTheme,
          updatedAt: Date.now()
        }, { merge: true });
      } catch (e) {}
      return nextTheme;
    });
  }, []);

  // Dedicated user-action toggle for indicators that updates state, localStorage, and Firestore
  const toggleIndicator = useCallback((key) => {
    setIndicators(prev => {
      const updated = { ...prev, [key]: !prev[key] };
      try {
        localStorage.setItem('terminal_chart_indicators', JSON.stringify(updated));
      } catch (e) {}
      try {
        setDoc(doc(db, 'chart_preferences', 'settings'), {
          indicators: updated,
          updatedAt: Date.now()
        }, { merge: true });
      } catch (err) {
        console.warn('Firestore toggleIndicator error:', err);
      }
      return updated;
    });
  }, []);

  // Dedicated user-action updater for indicator settings
  const updateIndicatorSettings = useCallback((updater) => {
    setIndicatorSettings(prev => {
      const updated = typeof updater === 'function' ? updater(prev) : updater;
      try {
        localStorage.setItem('terminal_indicator_settings', JSON.stringify(updated));
      } catch (e) {}
      try {
        setDoc(doc(db, 'chart_preferences', 'settings'), {
          indicatorSettings: updated,
          updatedAt: Date.now()
        }, { merge: true });
      } catch (err) {
        console.warn('Firestore updateIndicatorSettings error:', err);
      }
      return updated;
    });
  }, []);

  // Fibonacci Seviyeleri Güncelleyici Yardımcıları
  const updateFibLevel = useCallback((index, field, value) => {
    updateIndicatorSettings(prev => {
      const currentLevels = mergeFibLevels(prev.fibLevels);
      const updated = currentLevels.map((lvl, idx) => {
        if (idx === index) {
          return { ...lvl, [field]: value };
        }
        return lvl;
      });
      return { ...prev, fibLevels: updated };
    });
  }, [updateIndicatorSettings]);

  const setAllFibLevels = useCallback((enabledState) => {
    updateIndicatorSettings(prev => {
      const currentLevels = mergeFibLevels(prev.fibLevels);
      const updated = currentLevels.map(lvl => ({ ...lvl, enabled: enabledState }));
      return { ...prev, fibLevels: updated };
    });
  }, [updateIndicatorSettings]);

  const resetFibLevelsToDefault = useCallback(() => {
    updateIndicatorSettings(prev => ({
      ...prev,
      fibLookback: 180,
      showLevelTitles: false,
      fibLevels: DEFAULT_FIB_LEVELS
    }));
  }, [updateIndicatorSettings]);

  // 🛡️ ATR İz Süren Stop Çarpanı Hızlı Döngü (1.5x -> 2.0x -> 2.5x -> 3.0x -> 3.5x)
  const cycleTrailingStopMult = useCallback(() => {
    const presets = [1.5, 2.0, 2.5, 3.0, 3.5];
    updateIndicatorSettings(prev => {
      const current = prev.trailingStopMult ?? 2.5;
      const curIdx = presets.indexOf(current);
      const nextMult = curIdx === -1 ? 2.5 : presets[(curIdx + 1) % presets.length];
      return { ...prev, trailingStopMult: nextMult };
    });
  }, [updateIndicatorSettings]);

  // User persistent drawings per base symbol
  // { horizontals: [], trendlines: [], rays: [], rectangles: [], channels: [], anchoredVwaps: [] }
  const [drawings, setDrawings] = useState({ 
    horizontals: [], 
    trendlines: [], 
    rays: [],
    rectangles: [],
    channels: [],
    anchoredVwaps: []
  });

  const drawingsRef = useRef(drawings);
  drawingsRef.current = drawings;
  const activeMeasurementRef = useRef(activeMeasurement);
  activeMeasurementRef.current = activeMeasurement;

  // Load symbol's drawings from localStorage & Firebase Cloud whenever symbol changes
  // Uses normalized base symbol (e.g. 'BTC' whether ticker is BTCUSDT, BTC-USD, or BTC)
  const baseSymbol = normalizeTicker(cleanTicker || symbol);
  const storageKey = `terminal_drawings_${baseSymbol}`;

  useEffect(() => {
    // 1. Immediate local cache load (0ms latency)
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        setDrawings({
          horizontals: Array.isArray(parsed.horizontals) ? parsed.horizontals : [],
          trendlines: Array.isArray(parsed.trendlines) ? parsed.trendlines : [],
          rays: Array.isArray(parsed.rays) ? parsed.rays : [],
          rectangles: Array.isArray(parsed.rectangles) ? parsed.rectangles : [],
          channels: Array.isArray(parsed.channels) ? parsed.channels : [],
          anchoredVwaps: Array.isArray(parsed.anchoredVwaps) ? parsed.anchoredVwaps : []
        });
      } else {
        setDrawings({ horizontals: [], trendlines: [], rays: [], rectangles: [], channels: [], anchoredVwaps: [] });
      }
    } catch (e) {
      setDrawings({ horizontals: [], trendlines: [], rays: [], rectangles: [], channels: [], anchoredVwaps: [] });
    }
    setActiveDrawTool(null);
    setTrendStartPoint(null);
    setRectStartPoint(null);
    setChannelPoints([]);
    setMeasureStartPoint(null);
    setActiveMeasurement(null);
    setMousePreviewPoint(null);

    if (!baseSymbol) return;

    // 2. Real-Time Cloud Firestore Sync for Drawings
    const unsubDrawings = onSnapshot(doc(db, 'chart_drawings', baseSymbol), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data) {
          const cloudDrawings = {
            horizontals: Array.isArray(data.horizontals) ? data.horizontals : [],
            trendlines: Array.isArray(data.trendlines) ? data.trendlines : [],
            rays: Array.isArray(data.rays) ? data.rays : [],
            rectangles: Array.isArray(data.rectangles) ? data.rectangles : [],
            channels: Array.isArray(data.channels) ? data.channels : [],
            anchoredVwaps: Array.isArray(data.anchoredVwaps) ? data.anchoredVwaps : []
          };
          isApplyingCloudDrawingsRef.current = true;
          setDrawings(cloudDrawings);
          try {
            localStorage.setItem(storageKey, JSON.stringify(cloudDrawings));
          } catch (e) {}
        }
      } else {
        // If not in cloud yet, check if local storage had drawings and upload to cloud
        try {
          const local = localStorage.getItem(storageKey);
          if (local) {
            const parsed = JSON.parse(local);
            const hasDrawings = (parsed.horizontals?.length || 0) + (parsed.trendlines?.length || 0) + (parsed.rays?.length || 0) + (parsed.rectangles?.length || 0) + (parsed.channels?.length || 0) + (parsed.anchoredVwaps?.length || 0) > 0;
            if (hasDrawings) {
              setDoc(doc(db, 'chart_drawings', baseSymbol), {
                horizontals: parsed.horizontals || [],
                trendlines: parsed.trendlines || [],
                rays: parsed.rays || [],
                rectangles: parsed.rectangles || [],
                channels: parsed.channels || [],
                anchoredVwaps: parsed.anchoredVwaps || [],
                updatedAt: Date.now()
              }, { merge: true });
            }
          }
        } catch (e) {}
      }
    }, (err) => {
      console.warn('Firestore drawings subscription error:', err);
    });

    return () => unsubDrawings();
  }, [storageKey, baseSymbol]);

  // Persist drawings to localStorage & Firebase Cloud
  const saveDrawings = useCallback((newDrawings) => {
    setDrawings(newDrawings);
    try {
      localStorage.setItem(storageKey, JSON.stringify(newDrawings));
    } catch (e) {}

    if (baseSymbol) {
      try {
        setDoc(doc(db, 'chart_drawings', baseSymbol), {
          horizontals: newDrawings.horizontals || [],
          trendlines: newDrawings.trendlines || [],
          rays: newDrawings.rays || [],
          rectangles: newDrawings.rectangles || [],
          channels: newDrawings.channels || [],
          anchoredVwaps: newDrawings.anchoredVwaps || [],
          updatedAt: Date.now()
        }, { merge: true });
      } catch (err) {
        console.warn('Firestore saveDrawings error:', err);
      }
    }
  }, [storageKey, baseSymbol]);

  // Helper: Resolve screen X coordinate for any point or time (past, present, or future offset)
  const getCoordinateForPoint = useCallback((pointOrTime) => {
    if (!chartInstanceRef.current || pointOrTime === null || pointOrTime === undefined) return null;
    const timeScale = chartInstanceRef.current.timeScale();
    const activeCandles = candlesRef.current || [];
    if (activeCandles.length === 0) return null;

    const isObject = typeof pointOrTime === 'object';
    const rawTime = isObject && 'time' in pointOrTime ? pointOrTime.time : pointOrTime;
    const logicalOffset = isObject && typeof pointOrTime.logicalOffset === 'number' ? pointOrTime.logicalOffset : 0;

    // 1. If point explicitly has a future logicalOffset (bars beyond the last candle):
    if (logicalOffset > 0) {
      const lastLogical = activeCandles.length - 1;
      const targetLogical = lastLogical + logicalOffset;
      if (typeof timeScale.logicalToCoordinate === 'function') {
        const lx = timeScale.logicalToCoordinate(targetLogical);
        if (lx !== null && !isNaN(lx)) return lx;
      }
      const lastBarX = timeScale.timeToCoordinate(activeCandles[lastLogical].time);
      if (lastBarX !== null && activeCandles.length > 1) {
        const prevBarX = timeScale.timeToCoordinate(activeCandles[lastLogical - 1].time);
        if (prevBarX !== null) {
          const barSpacing = Math.max(1, lastBarX - prevBarX);
          return lastBarX + logicalOffset * barSpacing;
        }
      }
    }

    // 2. Standard Lightweight Charts timeToCoordinate
    let x = timeScale.timeToCoordinate(rawTime);
    if (x !== null) return x;

    // 3. Fallback: If exact time not in current scale (e.g. daily time on weekly/monthly chart or future/past date)
    if (rawTime) {
      try {
        const parseToMs = (t) => {
          if (!t) return NaN;
          if (typeof t === 'number') return t < 1e11 ? t * 1000 : t;
          if (typeof t === 'object' && t.year) return new Date(t.year, t.month - 1, t.day).getTime();
          return new Date(String(t)).getTime();
        };

        const targetMs = parseToMs(rawTime);
        const lastCandle = activeCandles[activeCandles.length - 1];
        const lastMs = parseToMs(lastCandle.time);

        if (!isNaN(targetMs) && !isNaN(lastMs)) {
          // A) Future date beyond the last candle
          if (targetMs > lastMs) {
            const sampleCount = Math.min(10, activeCandles.length - 1);
            const sampleCandle = activeCandles[activeCandles.length - 1 - sampleCount];
            const sampleMs = parseToMs(sampleCandle.time);
            const barDuration = (lastMs - sampleMs) / Math.max(1, sampleCount);
            const futureBars = (targetMs - lastMs) / (barDuration || 86400000);
            const targetLogical = (activeCandles.length - 1) + futureBars;

            if (typeof timeScale.logicalToCoordinate === 'function') {
              const lx = timeScale.logicalToCoordinate(targetLogical);
              if (lx !== null && !isNaN(lx)) return lx;
            }

            const lastBarX = timeScale.timeToCoordinate(lastCandle.time);
            if (lastBarX !== null && activeCandles.length > 1) {
              const prevCandle = activeCandles[activeCandles.length - 2];
              const prevBarX = timeScale.timeToCoordinate(prevCandle.time);
              if (prevBarX !== null) {
                const barSpacing = Math.max(1, lastBarX - prevBarX);
                return lastBarX + futureBars * barSpacing;
              }
            }
          }

          // B) Past date before the first candle in history
          const firstCandle = activeCandles[0];
          const firstMs = parseToMs(firstCandle.time);
          if (!isNaN(firstMs) && targetMs < firstMs) {
            const sampleCount = Math.min(10, activeCandles.length - 1);
            const sampleCandle = activeCandles[sampleCount];
            const sampleMs = parseToMs(sampleCandle.time);
            const barDuration = (sampleMs - firstMs) / Math.max(1, sampleCount);
            const pastBars = (firstMs - targetMs) / (barDuration || 86400000);
            const targetLogical = -pastBars;
            if (typeof timeScale.logicalToCoordinate === 'function') {
              const lx = timeScale.logicalToCoordinate(targetLogical);
              if (lx !== null && !isNaN(lx)) return lx;
            }
          }

          // C) Date between first and last candle: snap to nearest candle (weekend/holiday)
          let closestCandle = activeCandles[0];
          let minDiff = Math.abs(parseToMs(closestCandle.time) - targetMs);
          for (let i = 1; i < activeCandles.length; i++) {
            const c = activeCandles[i];
            const diff = Math.abs(parseToMs(c.time) - targetMs);
            if (diff < minDiff) {
              minDiff = diff;
              closestCandle = c;
            }
          }
          return timeScale.timeToCoordinate(closestCandle.time);
        }
      } catch (e) {}
    }

    return null;
  }, []);

  // Re-calculate SVG trendline & ray pixel coordinates from timeScale and priceScale
  const recalcSvgLines = useCallback(() => {
    if (!chartInstanceRef.current || !candlestickSeriesRef.current) return;
    const timeScale = chartInstanceRef.current.timeScale();
    const series = candlestickSeriesRef.current;
    const activeCandles = candlesRef.current || [];
    const currentDrawings = drawingsRef.current || {};
    const currentMeasurement = activeMeasurementRef.current;

    const getCoordinateForTime = getCoordinateForPoint;

    const lines = (currentDrawings.trendlines || []).map(t => {
      if (!t.p1 || !t.p2) return { ...t, valid: false };

      const x1 = getCoordinateForPoint(t.p1);
      const y1 = series.priceToCoordinate(t.p1.price);
      const x2 = getCoordinateForPoint(t.p2);
      const y2 = series.priceToCoordinate(t.p2.price);
      return {
        ...t,
        x1, y1, x2, y2,
        valid: x1 !== null && y1 !== null && x2 !== null && y2 !== null
      };
    });
    setSvgTrendlines(lines);

    const rayLines = (currentDrawings.rays || []).map(r => {
      if (!r || r.price === undefined || r.price === null) return { ...r, valid: false };
      const y = series.priceToCoordinate(r.price);
      if (y === null || isNaN(y)) return { ...r, valid: false };

      let x1 = getCoordinateForPoint(r);
      const containerWidth = chartContainerRef.current ? chartContainerRef.current.clientWidth : 800;

      if (x1 === null && activeCandles.length > 0 && r.time) {
        try {
          const targetStr = typeof r.time === 'object' && r.time.year 
            ? `${r.time.year}-${String(r.time.month).padStart(2, '0')}-${String(r.time.day).padStart(2, '0')}`
            : String(r.time);
          const targetTs = new Date(targetStr).getTime();
          const firstStr = typeof activeCandles[0].time === 'object' && activeCandles[0].time.year
            ? `${activeCandles[0].time.year}-${String(activeCandles[0].time.month).padStart(2, '0')}-${String(activeCandles[0].time.day).padStart(2, '0')}`
            : String(activeCandles[0].time);
          const firstTs = new Date(firstStr).getTime();
          if (!isNaN(targetTs) && !isNaN(firstTs) && targetTs <= firstTs) {
            x1 = 0; // Starts in past, extends across visible screen
          }
        } catch (e) {}
      }

      if (x1 === null) return { ...r, valid: false };

      return {
        ...r,
        x1,
        y1: y,
        x2: containerWidth,
        y2: y,
        valid: true
      };
    });
    setSvgRays(rayLines);

    // Calculate Persistent Horizontal Lines (full screen width clickable)
    const horizLines = (currentDrawings.horizontals || []).map(h => {
      if (!h || h.price === undefined || h.price === null) return { ...h, valid: false };
      const y = series.priceToCoordinate(h.price);
      if (y === null || isNaN(y)) return { ...h, valid: false };
      const containerWidth = chartContainerRef.current ? chartContainerRef.current.clientWidth : 800;
      return {
        ...h,
        y,
        x1: 0,
        x2: containerWidth,
        valid: true
      };
    });
    setSvgHorizontals(horizLines);

    // Calculate Rectangles
    const rectLines = (currentDrawings.rectangles || []).map(r => {
      if (!r.p1 || !r.p2) return { ...r, valid: false };
      const x1 = getCoordinateForPoint(r.p1);
      const y1 = series.priceToCoordinate(r.p1.price);
      const x2 = getCoordinateForPoint(r.p2);
      const y2 = series.priceToCoordinate(r.p2.price);
      return {
        ...r,
        x1, y1, x2, y2,
        valid: x1 !== null && y1 !== null && x2 !== null && y2 !== null
      };
    });
    setSvgRectangles(rectLines);

    // Calculate Channels
    const chanLines = (currentDrawings.channels || []).map(ch => {
      if (!ch.p1 || !ch.p2 || !ch.p3) return { ...ch, valid: false };
      const x1 = getCoordinateForPoint(ch.p1);
      const y1 = series.priceToCoordinate(ch.p1.price);
      const x2 = getCoordinateForPoint(ch.p2);
      const y2 = series.priceToCoordinate(ch.p2.price);
      const x3 = getCoordinateForPoint(ch.p3);
      const y3 = series.priceToCoordinate(ch.p3.price);
      return {
        ...ch,
        x1, y1, x2, y2, x3, y3,
        valid: x1 !== null && y1 !== null && x2 !== null && y2 !== null && x3 !== null && y3 !== null
      };
    });
    setSvgChannels(chanLines);

    // Calculate Anchored VWAPs (always use raw OHLC so Heikin Ashi smoothing never distorts VWAP)
    const rawCandles = rawCandlesRef.current && rawCandlesRef.current.length > 0 ? rawCandlesRef.current : activeCandles;
    const avLines = (currentDrawings.anchoredVwaps || []).map(av => {
      if (!av.time) return { ...av, valid: false };
      const avwapRes = calcCustomAnchoredVWAP(rawCandles, av.time);
      if (!avwapRes || !avwapRes.lineData || avwapRes.lineData.length === 0) return { ...av, valid: false };

      const points = [];
      for (let i = 0; i < avwapRes.lineData.length; i++) {
        const pt = avwapRes.lineData[i];
        const px = getCoordinateForPoint(pt.time);
        const py = series.priceToCoordinate(pt.value);
        if (px !== null && py !== null) {
          points.push({ x: px, y: py, price: pt.value, time: pt.time });
        }
      }
      if (points.length < 2) return { ...av, valid: false };
      return {
        ...av,
        points,
        startPoint: points[0],
        endPoint: points[points.length - 1],
        valid: true
      };
    });
    setSvgAnchoredVwaps(avLines);

    // Calculate Active Measurement
    if (currentMeasurement && currentMeasurement.p1 && currentMeasurement.p2) {
      const x1 = getCoordinateForPoint(currentMeasurement.p1);
      const y1 = series.priceToCoordinate(currentMeasurement.p1.price);
      const x2 = getCoordinateForPoint(currentMeasurement.p2);
      const y2 = series.priceToCoordinate(currentMeasurement.p2.price);
      if (x1 !== null && y1 !== null && x2 !== null && y2 !== null) {
        let barCount = null;
        if (activeCandles.length > 0) {
          const t1Str = normalizeChartTime(currentMeasurement.p1.time);
          const t2Str = normalizeChartTime(currentMeasurement.p2.time);
          const idx1 = activeCandles.findIndex(c => normalizeChartTime(c.time) === t1Str);
          const idx2 = activeCandles.findIndex(c => normalizeChartTime(c.time) === t2Str);
          if (idx1 >= 0 && idx2 >= 0) {
            barCount = Math.abs(idx2 - idx1);
          } else if (currentMeasurement.p1?.logicalOffset || currentMeasurement.p2?.logicalOffset) {
            const l1 = idx1 >= 0 ? idx1 : (activeCandles.length - 1 + (currentMeasurement.p1?.logicalOffset || 0));
            const l2 = idx2 >= 0 ? idx2 : (activeCandles.length - 1 + (currentMeasurement.p2?.logicalOffset || 0));
            barCount = Math.round(Math.abs(l2 - l1));
          }
        }
        setSvgMeasurement({
          x1, y1, x2, y2,
          price1: currentMeasurement.p1.price,
          price2: currentMeasurement.p2.price,
          barCount
        });
      } else {
        setSvgMeasurement(null);
      }
    } else {
      setSvgMeasurement(null);
    }
  }, [getCoordinateForPoint]);

  // Synchronize Horizontal Drawings on Price Scale
  const syncHorizontalPriceLines = useCallback(() => {
    const series = candlestickSeriesRef.current;
    if (!series) return;

    // Clear previously drawn custom horizontal lines
    horizontalPriceLinesMapRef.current.forEach((lineInstance) => {
      try {
        series.removePriceLine(lineInstance);
      } catch (e) {}
    });
    horizontalPriceLinesMapRef.current.clear();

    // Re-create from persistent drawings
    const currentHorizontals = drawingsRef.current?.horizontals || [];
    currentHorizontals.forEach(h => {
      try {
        const line = series.createPriceLine({
          price: Number(h.price),
          color: h.color || '#38bdf8',
          lineWidth: 2,
          lineStyle: LineStyle.Solid,
          axisLabelVisible: true,
          title: ''
        });
        horizontalPriceLinesMapRef.current.set(h.id, line);
      } catch (e) {}
    });
  }, []);

  // Trigger SVG lines & Horizontal price lines recalculation on drawings, interval, or candle change
  useEffect(() => {
    recalcSvgLines();
    syncHorizontalPriceLines();
    const rId = requestAnimationFrame(() => {
      recalcSvgLines();
      syncHorizontalPriceLines();
    });
    const tId = setTimeout(() => {
      recalcSvgLines();
      syncHorizontalPriceLines();
    }, 150);
    return () => {
      cancelAnimationFrame(rId);
      clearTimeout(tId);
    };
  }, [drawings, activeMeasurement, candles, chartInterval, candleType, recalcSvgLines, syncHorizontalPriceLines]);

  // Fetch candle data for current symbol & interval
  const fetchSymbolCandles = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);

    // Resolve symbol for Yahoo Finance
    const rawUpper = (cleanTicker || symbol || '').toUpperCase().trim();
    let querySymbol = rawUpper;
    if (SYMBOL_MAP[rawUpper]) {
      querySymbol = SYMBOL_MAP[rawUpper];
    } else if (isBist) {
      querySymbol = rawUpper.endsWith('.IS') ? rawUpper : `${rawUpper}.IS`;
    } else if (rawUpper.endsWith('USDT')) {
      querySymbol = `${rawUpper.slice(0, -4)}-USD`;
    } else if (rawUpper.endsWith('USD') && !rawUpper.includes('-') && !rawUpper.includes('.') && !rawUpper.includes('=')) {
      querySymbol = `${rawUpper.slice(0, -3)}-USD`;
    }

    let yInterval = '1d';
    let yRange = '2y';
    let resampleGroup = 1;
    let resampleMonthsCount = 0;

    if (chartInterval === '1H') {
      yInterval = '1wk';
      yRange = '5y';
    } else if (chartInterval === '1A') {
      yInterval = '1mo';
      yRange = '10y';
    } else if (chartInterval === '2A') {
      yInterval = '1mo';
      yRange = '10y';
      resampleMonthsCount = 2;
    } else if (chartInterval === '3A') {
      yInterval = '3mo';
      yRange = '15y';
    } else if (chartInterval === '4S') {
      yInterval = '1h';
      yRange = '2y';
      resampleGroup = 4;
    } else if (chartInterval === '2S') {
      yInterval = '1h';
      yRange = '2y';
      resampleGroup = 2;
    } else if (chartInterval === '1S') {
      yInterval = '1h';
      yRange = '2y';
    }

    try {
      // Helper to parse Yahoo chart JSON
      const parseYahooJson = (j) => {
        const timestamps = j?.chart?.result?.[0]?.timestamp || [];
        const q = j?.chart?.result?.[0]?.indicators?.quote?.[0] || {};
        const opens = q.open || [];
        const highs = q.high || [];
        const lows = q.low || [];
        const closes = q.close || [];
        const vols = q.volume || [];
        const isIntraday = (yInterval.includes('m') && !yInterval.includes('mo')) || yInterval.includes('h');
        const parsed = [];

        for (let i = 0; i < timestamps.length; i++) {
          const c = closes[i];
          if (typeof c === 'number' && !isNaN(c) && c > 0) {
            let timeVal;
            if (isIntraday) {
              timeVal = timestamps[i];
            } else {
              const d = new Date(timestamps[i] * 1000);
              timeVal = d.toISOString().split('T')[0];
            }

            parsed.push({
              time: timeVal,
              open: Number((opens[i] || c).toFixed(2)),
              high: Number((highs[i] || c).toFixed(2)),
              low: Number((lows[i] || c).toFixed(2)),
              close: Number(c.toFixed(2)),
              volume: Number((vols[i] || 0).toFixed(0))
            });
          }
        }
        return parsed;
      };

      let dataCandles = null;

      // Handle synthetic Crypto Market Cap indexes (TOTAL, TOTAL3, OTHERS)
      if (['TOTAL', 'TOTAL2', 'TOTAL3', 'OTHERS', 'TOTALDEFI'].includes(rawUpper)) {
        try {
          const res = await fetch(`/api/market?chart=${encodeURIComponent(rawUpper)}&interval=${yInterval}&range=${yRange}`);
          if (res.ok) {
            const json = await res.json();
            if (json?.status === 'success' && Array.isArray(json.candles) && json.candles.length > 0) {
              dataCandles = json.candles;
            }
          }
        } catch (e) {}

        // Fallback: direct synthesis from BTC and ETH
        if (!dataCandles || dataCandles.length === 0) {
          try {
            const btcUrl = `https://query1.finance.yahoo.com/v8/finance/chart/BTC-USD?interval=${yInterval}&range=${yRange}`;
            const ethUrl = `https://query1.finance.yahoo.com/v8/finance/chart/ETH-USD?interval=${yInterval}&range=${yRange}`;
            const [bResp, eResp] = await Promise.all([
              fetch(btcUrl).then(r => r.ok ? r.json() : null).catch(() => null),
              fetch(ethUrl).then(r => r.ok ? r.json() : null).catch(() => null)
            ]);
            const bCandles = parseYahooJson(bResp);
            const eCandles = parseYahooJson(eResp);
            if (bCandles.length > 0) {
              dataCandles = bCandles.map((b, idx) => {
                const e = eCandles[idx] || { open: b.open / 35, high: b.high / 35, low: b.low / 35, close: b.close / 35 };
                const calcCap = (bVal, eVal) => {
                  const totB = ((bVal * 19.8e6) + (eVal * 120.4e6)) / 0.72 / 1e9;
                  if (rawUpper === 'TOTAL') return totB;
                  if (rawUpper === 'TOTAL2') return totB - ((bVal * 19.8e6) / 1e9);
                  if (rawUpper === 'TOTAL3') return totB * 0.276;
                  if (rawUpper === 'OTHERS') return totB * 0.276 * 0.40;
                  if (rawUpper === 'TOTALDEFI') return totB * 0.033;
                  return totB;
                };
                return {
                  time: b.time,
                  open: Number(calcCap(b.open, e.open).toFixed(2)),
                  high: Number(calcCap(b.high, e.high).toFixed(2)),
                  low: Number(calcCap(b.low, e.low).toFixed(2)),
                  close: Number(calcCap(b.close, e.close).toFixed(2)),
                  volume: Math.round(b.volume * 0.4)
                };
              });
            }
          } catch (e) {}
        }
      }

      // 1. Try internal backend API first
      if (!dataCandles || dataCandles.length === 0) {
        try {
          const res = await fetch(`/api/market?chart=${encodeURIComponent(querySymbol)}&interval=${yInterval}&range=${yRange}`);
          if (res.ok) {
            const json = await res.json();
            if (json?.status === 'success' && Array.isArray(json.candles) && json.candles.length > 0) {
              dataCandles = json.candles;
            }
          }
        } catch (e) {}
      }

      // 2. Direct Yahoo Finance
      if (!dataCandles || dataCandles.length === 0) {
        const directUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(querySymbol)}?interval=${yInterval}&range=${yRange}`;
        try {
          const resp = await fetch(directUrl);
          if (resp.ok) {
            const j = await resp.json();
            const parsed = parseYahooJson(j);
            if (parsed.length > 0) dataCandles = parsed;
          }
        } catch (e) {}
      }

      // 3. Resilient CORS proxy fallback 1 (corsproxy.io)
      if (!dataCandles || dataCandles.length === 0) {
        try {
          const directUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(querySymbol)}?interval=${yInterval}&range=${yRange}`;
          const corsUrl = `https://corsproxy.io/?url=${encodeURIComponent(directUrl)}`;
          const resp = await fetch(corsUrl);
          if (resp.ok) {
            const j = await resp.json();
            const parsed = parseYahooJson(j);
            if (parsed.length > 0) dataCandles = parsed;
          }
        } catch (e) {}
      }

      // 4. Resilient CORS proxy fallback 2 (allorigins.win)
      if (!dataCandles || dataCandles.length === 0) {
        try {
          const directUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(querySymbol)}?interval=${yInterval}&range=${yRange}`;
          const allOriginsUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(directUrl)}`;
          const resp = await fetch(allOriginsUrl);
          if (resp.ok) {
            const j = await resp.json();
            const parsed = parseYahooJson(j);
            if (parsed.length > 0) dataCandles = parsed;
          }
        } catch (e) {}
      }

      // Fallback for 3A: if native 3mo yields nothing, fetch 1mo and group into 3-month buckets
      if ((!dataCandles || dataCandles.length === 0) && chartInterval === '3A') {
        try {
          const directUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(querySymbol)}?interval=1mo&range=10y`;
          const resp = await fetch(directUrl);
          if (resp.ok) {
            const j = await resp.json();
            const parsed = parseYahooJson(j);
            if (parsed.length > 0) {
              dataCandles = resampleMonths(parsed, 3);
            }
          }
        } catch (e) {}
      }

      if (!dataCandles || dataCandles.length === 0) {
        throw new Error(`${cleanTicker || symbol} için mum verisi bulunamadı.`);
      }

      // Resample multi-month if 2A requested
      if (resampleMonthsCount > 1 && dataCandles && dataCandles.length > 0) {
        dataCandles = resampleMonths(dataCandles, resampleMonthsCount);
      }

      // Resample if 2S or 4S requested
      if (resampleGroup > 1 && dataCandles && dataCandles.length > 0) {
        dataCandles = resampleCandles(dataCandles, resampleGroup);
      }

      // Deduplicate and ensure sorted by time
      dataCandles.sort((a, b) => (a.time > b.time ? 1 : a.time < b.time ? -1 : 0));
      const cleanList = [];
      const seenTimes = new Set();
      for (const item of dataCandles) {
        if (!seenTimes.has(item.time)) {
          seenTimes.add(item.time);
          cleanList.push(item);
        }
      }

      setCandles(cleanList);
      setIsLoading(false);
    } catch (err) {
      console.error('NativeProChart fetch error:', err);
      setLoadError(err.message || 'Grafik verisi yüklenemedi.');
      setIsLoading(false);
    }
  }, [cleanTicker, symbol, isBist, chartInterval]);

  // Re-fetch on ticker or interval change
  useEffect(() => {
    fetchSymbolCandles();
  }, [fetchSymbolCandles]);

  // Initialize and Render Chart Instance
  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Clean up previous instance
    if (chartInstanceRef.current) {
      chartInstanceRef.current.remove();
      chartInstanceRef.current = null;
    }
    if (rsiChartInstanceRef.current) {
      rsiChartInstanceRef.current.remove();
      rsiChartInstanceRef.current = null;
    }

    const container = chartContainerRef.current;
    const width = container.clientWidth || 800;
    // Main chart fills the entire height of containerRef (no subtraction, zero gap above RSI)
    const height = container.clientHeight || 480;

    // 1. Create Main Candlestick Chart
    const mainChart = createChart(container, {
      width,
      height,
      attributionLogo: false,
      layout: {
        attributionLogo: false,
        background: { type: 'solid', color: isLight ? '#ffffff' : '#040711' },
        textColor: isLight ? '#475569' : '#94a3b8',
        fontSize: 11,
        fontFamily: 'Inter, system-ui, sans-serif'
      },
      grid: {
        vertLines: { color: isLight ? 'rgba(15, 23, 42, 0.06)' : 'rgba(255, 255, 255, 0.04)' },
        horzLines: { color: isLight ? 'rgba(15, 23, 42, 0.06)' : 'rgba(255, 255, 255, 0.04)' }
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: isLight ? 'rgba(2, 132, 199, 0.45)' : 'rgba(0, 229, 255, 0.4)',
          width: 1,
          style: LineStyle.Dotted
        },
        horzLine: {
          color: isLight ? 'rgba(2, 132, 199, 0.45)' : 'rgba(0, 229, 255, 0.4)',
          width: 1,
          style: LineStyle.Dotted
        }
      },
      rightPriceScale: {
        borderColor: isLight ? '#cbd5e1' : 'rgba(255, 255, 255, 0.1)',
        autoScale: true,
        scaleMargins: {
          top: 0.08,
          bottom: indicators.volume ? 0.22 : 0.05
        }
      },
      timeScale: {
        borderColor: isLight ? '#cbd5e1' : 'rgba(255, 255, 255, 0.1)',
        timeVisible: chartInterval.includes('S'),
        secondsVisible: false,
        rightOffset: 8,
        barSpacing: 9,
        minBarSpacing: 0.5
      }
    });

    chartInstanceRef.current = mainChart;

    // Add Candlestick Series (Temiz Grafik: Güncel fiyatta grafiği kesen yatay çizgi gizli, sağ skalada etiket aktif)
    const candleSeries = mainChart.addSeries(CandlestickSeries, {
      upColor: '#10b981',
      downColor: '#ef4444',
      borderVisible: false,
      wickUpColor: '#10b981',
      wickDownColor: '#ef4444',
      priceLineVisible: false,
      lastValueVisible: true
    });
    candlestickSeriesRef.current = candleSeries;
    candleMarkersPluginRef.current = createSeriesMarkers(candleSeries, []);
    syncHorizontalPriceLines();

    // Add Volume Series (at bottom 20%)
    if (indicators.volume) {
      const volSeries = mainChart.addSeries(HistogramSeries, {
        color: '#38bdf8',
        priceFormat: { type: 'volume' },
        priceScaleId: 'volume_scale'
      });
      mainChart.priceScale('volume_scale').applyOptions({
        scaleMargins: {
          top: 0.8,
          bottom: 0
        }
      });
      volumeSeriesRef.current = volSeries;
    } else {
      volumeSeriesRef.current = null;
    }

    // Add Overlay Indicators (Temiz Y Ekseni: Sadece renkli fiyat rozeti, kalabalık metinler gizli)
    if (indicators.kama) {
      kamaSeriesRef.current = mainChart.addSeries(LineSeries, {
        color: indicatorSettings.kamaUpColor || '#00e676',
        lineWidth: 2.5,
        lineVisible: true,
        priceLineVisible: false,
        lastValueVisible: true,
        title: ''
      });
    } else {
      kamaSeriesRef.current = null;
    }

    // ⚡ 24 RSI & 55 SMA Çift Teyitli Trend HO (2-Bar Teyitli Renkli Çizgi)
    if (indicators.trendMa55) {
      trendMa55SeriesRef.current = mainChart.addSeries(LineSeries, {
        color: indicatorSettings.trendUpColor || '#10b981',
        lineWidth: 2.5,
        lineVisible: true,
        priceLineVisible: false,
        lastValueVisible: true,
        title: ''
      });
    } else {
      trendMa55SeriesRef.current = null;
    }

    if (indicators.avwap) {
      avwapSeriesRef.current = mainChart.addSeries(LineSeries, {
        color: indicatorSettings.avwapColor || '#06b6d4',
        lineWidth: 2,
        lineStyle: LineStyle.Solid,
        priceLineVisible: false,
        lastValueVisible: true,
        title: ''
      });
    } else {
      avwapSeriesRef.current = null;
    }

    if (indicators.ema20) {
      ema20SeriesRef.current = mainChart.addSeries(LineSeries, {
        color: indicatorSettings.ema1Color || '#ef4444',
        lineWidth: 1.5,
        priceLineVisible: false,
        lastValueVisible: true,
        title: ''
      });
    } else {
      ema20SeriesRef.current = null;
    }

    // EMA 50: Trend eğrisi aktif (lineVisible: true), yatay kesikli fiyat çizgisi kapalı (priceLineVisible: false), sağ eksende mavi fiyat etiketi aktif
    if (indicators.ema50) {
      ema50SeriesRef.current = mainChart.addSeries(LineSeries, {
        color: indicatorSettings.ema2Color || '#3b82f6',
        lineWidth: 1.5,
        lineVisible: true,
        priceLineVisible: false,
        lastValueVisible: true,
        title: ''
      });
    } else {
      ema50SeriesRef.current = null;
    }

    if (indicators.ema200) {
      ema200SeriesRef.current = mainChart.addSeries(LineSeries, {
        color: indicatorSettings.ema3Color || '#f97316',
        lineWidth: 2,
        priceLineVisible: false,
        lastValueVisible: true,
        title: ''
      });
    } else {
      ema200SeriesRef.current = null;
    }

    if (indicators.bollinger) {
      bbUpperSeriesRef.current = mainChart.addSeries(LineSeries, {
        color: '#c084fc',
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        priceLineVisible: false,
        lastValueVisible: true,
        title: ''
      });
      bbMiddleSeriesRef.current = mainChart.addSeries(LineSeries, {
        color: '#a855f7',
        lineWidth: 1.5,
        priceLineVisible: false,
        lastValueVisible: true,
        title: ''
      });
      bbLowerSeriesRef.current = mainChart.addSeries(LineSeries, {
        color: '#c084fc',
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        priceLineVisible: false,
        lastValueVisible: true,
        title: ''
      });
    } else {
      bbUpperSeriesRef.current = null;
      bbMiddleSeriesRef.current = null;
      bbLowerSeriesRef.current = null;
    }

    // 🛡️ Add Trailing Stop / Chandelier Exit Series (Dashed stepped line on main chart)
    if (indicators.trailingStop) {
      trailingStopSeriesRef.current = mainChart.addSeries(LineSeries, {
        color: indicatorSettings.trailingStopColor || '#f59e0b',
        lineWidth: 2,
        lineStyle: LineStyle.Dashed,
        priceLineVisible: false,
        lastValueVisible: true,
        title: ''
      });
    } else {
      trailingStopSeriesRef.current = null;
    }

    // 2. Create RSI Sub-Chart (if active, dynamic resizable height, tight against main chart)
    if (indicators.rsi && rsiContainerRef.current) {
      const rsiContainer = rsiContainerRef.current;
      const rsiChart = createChart(rsiContainer, {
        width,
        height: rsiHeightRef.current,
        attributionLogo: false,
        layout: {
          attributionLogo: false,
          background: { type: 'solid', color: isLight ? '#f8fafc' : '#03050c' },
          textColor: '#64748b',
          fontSize: 10
        },
        grid: {
          vertLines: { color: isLight ? 'rgba(15, 23, 42, 0.04)' : 'rgba(255, 255, 255, 0.02)' },
          horzLines: { color: isLight ? 'rgba(15, 23, 42, 0.06)' : 'rgba(255, 255, 255, 0.04)' }
        },
        rightPriceScale: {
          borderColor: isLight ? '#cbd5e1' : 'rgba(255, 255, 255, 0.08)',
          scaleMargins: { top: 0.07, bottom: 0.02 },
          autoScale: true
        },
        timeScale: {
          visible: false,
          borderColor: 'transparent',
          rightOffset: 8,
          barSpacing: 9,
          minBarSpacing: 0.5
        }
      });
      rsiChartInstanceRef.current = rsiChart;

      // RSI Autoscale Info: Alttaki gereksiz ölü boşluğu kaldırır, tabanı 20'ye çekerek RSI'ı aşağı alır
      // 30, 50, 70 seviyeleri daima görünür kalır ve uç hareketlerde taşma yapmadan dinamik esner
      const getRsiAutoscaleInfo = (original) => {
        const res = typeof original === 'function' ? original() : null;
        const minData = res?.priceRange?.minValue ?? 30;
        const maxData = res?.priceRange?.maxValue ?? 70;
        return {
          priceRange: {
            minValue: Math.min(20, Math.floor(minData - 2)),
            maxValue: Math.max(80, Math.ceil(maxData + 2))
          }
        };
      };

      // RSI Serisi: Tabanı 20, tavanı 80 dinamik skala (30, 50, 70 Asla Kaybolmaz), Pembe Çizgi Kapalı, Sağ Değer Açık
      const rsiSeries = rsiChart.addSeries(LineSeries, {
        color: '#ec4899',
        lineWidth: 2,
        priceLineVisible: false, // Pembe noktalı yatay çizgi kapatıldı
        lastValueVisible: true,  // Sağ taraftaki RSI seviyesi rozeti görünür
        title: `RSI (${indicatorSettings.rsiPeriod || 14})`,
        autoscaleInfoProvider: getRsiAutoscaleInfo
      });
      rsiSeriesRef.current = rsiSeries;
      rsiMarkersPluginRef.current = createSeriesMarkers(rsiSeries, []);

      // RSI Moving Average (SMA - Vibrant Yellow #facc15)
      if (indicators.rsiMa) {
        rsiMaSeriesRef.current = rsiChart.addSeries(LineSeries, {
          color: '#facc15',
          lineWidth: 1.5,
          priceLineVisible: false,
          lastValueVisible: true,
          title: `RSI MA (${indicatorSettings.rsiMaPeriod || 14})`,
          autoscaleInfoProvider: getRsiAutoscaleInfo
        });
      } else {
        rsiMaSeriesRef.current = null;
      }

      // Sabit ve Kalıcı RSI Referans Seviyeleri: 70 (Aşırı Alım), 50 (Denge), 30 (Aşırı Satım)
      rsiSeries.createPriceLine({
        price: 70,
        color: '#ef4444',
        lineWidth: 1.5,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: '70'
      });

      rsiSeries.createPriceLine({
        price: 50,
        color: '#94a3b8',
        lineWidth: 1.5,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: '50'
      });

      rsiSeries.createPriceLine({
        price: 30,
        color: '#10b981',
        lineWidth: 1.5,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: '30'
      });
    } else {
      rsiSeriesRef.current = null;
      rsiMaSeriesRef.current = null;
      rsiMarkersPluginRef.current = null;
    }

    // 3. 📊 Create MACD Sub-Chart (if active, dynamic resizable height)
    if (indicators.macd && macdContainerRef.current) {
      const macdContainer = macdContainerRef.current;
      const macdChart = createChart(macdContainer, {
        width,
        height: macdHeightRef.current,
        attributionLogo: false,
        layout: {
          attributionLogo: false,
          background: { type: 'solid', color: isLight ? '#f8fafc' : '#03050c' },
          textColor: '#64748b',
          fontSize: 10
        },
        grid: {
          vertLines: { color: isLight ? 'rgba(15, 23, 42, 0.04)' : 'rgba(255, 255, 255, 0.02)' },
          horzLines: { color: isLight ? 'rgba(15, 23, 42, 0.06)' : 'rgba(255, 255, 255, 0.04)' }
        },
        rightPriceScale: {
          borderColor: isLight ? '#cbd5e1' : 'rgba(255, 255, 255, 0.08)',
          scaleMargins: { top: 0.1, bottom: 0.1 },
          autoScale: true
        },
        timeScale: {
          visible: false,
          borderColor: 'transparent',
          rightOffset: 8,
          barSpacing: 9,
          minBarSpacing: 0.5
        }
      });
      macdChartInstanceRef.current = macdChart;

      // Histogram Series
      const histSeries = macdChart.addSeries(HistogramSeries, {
        priceFormat: { type: 'price', precision: 3, minMove: 0.001 },
        priceScaleId: 'right'
      });
      histSeriesRef.current = histSeries;

      // MACD Line (Cyan)
      const macdLine = macdChart.addSeries(LineSeries, {
        color: '#06b6d4',
        lineWidth: 1.5,
        priceLineVisible: false,
        lastValueVisible: true,
        title: 'MACD'
      });
      macdLineSeriesRef.current = macdLine;

      // Signal Line (Amber)
      const signalLine = macdChart.addSeries(LineSeries, {
        color: '#f59e0b',
        lineWidth: 1.5,
        priceLineVisible: false,
        lastValueVisible: true,
        title: 'Sinyal'
      });
      signalLineSeriesRef.current = signalLine;

      // Zero Reference Line
      macdLine.createPriceLine({
        price: 0,
        color: isLight ? '#cbd5e1' : 'rgba(255, 255, 255, 0.15)',
        lineWidth: 1,
        lineStyle: LineStyle.Dotted,
        axisLabelVisible: false,
        title: ''
      });
    } else {
      macdChartInstanceRef.current = null;
      macdLineSeriesRef.current = null;
      signalLineSeriesRef.current = null;
      histSeriesRef.current = null;
    }

    // Synchronize visible time range between Main, RSI, and MACD Chart & persist user zoom/scroll
    let isSyncingRange = false;

    mainChart.timeScale().subscribeVisibleLogicalRangeChange(range => {
      if (!range) return;

      // Persist user view zoom (barCount) and right offset margin
      const total = candlesRef.current?.length || 0;
      if (total > 0 && typeof range.from === 'number' && typeof range.to === 'number') {
        const barCount = Math.max(15, Math.round(range.to - range.from));
        const offset = Math.round(range.to - (total - 1));
        lastViewConfigRef.current = {
          barCount,
          rightOffset: Math.max(4, Math.min(50, offset > 0 ? offset : 8))
        };
        try {
          localStorage.setItem('terminal_chart_view_config', JSON.stringify(lastViewConfigRef.current));
        } catch (e) {}
      }

      // Live update AVWAP when Scan Window is set to 'visible' (Ekrandaki Alan) without recreating chart
      const curInd = indicatorsRef.current;
      const curSet = indicatorSettingsRef.current;
      const curMode = curSet?.avwapAnchorMode || 'auto';
      if (
        curInd?.avwap &&
        curSet?.avwapLookback === 'visible' &&
        (curMode === 'auto' || curMode === 'low' || curMode === 'high') &&
        rawCandlesRef.current?.length > 0 &&
        avwapSeriesRef.current
      ) {
        if (avwapVisibleTimerRef.current) clearTimeout(avwapVisibleTimerRef.current);
        avwapVisibleTimerRef.current = setTimeout(() => {
          const rawC = rawCandlesRef.current;
          const activeRange = chartInstanceRef.current?.timeScale()?.getVisibleLogicalRange();
          const settingsSnap = indicatorSettingsRef.current;
          if (!rawC || rawC.length === 0 || !activeRange || !avwapSeriesRef.current) return;
          const avwapRes = computeConfiguredAVWAP(rawC, {
            mode: settingsSnap?.avwapAnchorMode || 'auto',
            avwapAnchorTime: settingsSnap?.avwapAnchorTime,
            chartInterval: chartIntervalRef.current,
            avwapLookback: 'visible',
            visibleRange: activeRange
          });
          const syncKey = avwapRes.latest
            ? `${avwapRes.latest.anchorTime}_${avwapRes.latest.anchorType}_${avwapRes.latest.value}_${avwapRes.latest.barCount}`
            : 'none';
          if (syncKey !== lastAvwapSyncKeyRef.current) {
            lastAvwapSyncKeyRef.current = syncKey;
            avwapSeriesRef.current.setData(avwapRes.lineData);
            setLatestAvwapState(avwapRes.latest);
            if (candleMarkersPluginRef.current) {
              const avMarker = buildAvwapAnchorMarker(avwapRes.latest, settingsSnap?.avwapColor || '#06b6d4');
              const merged = mergeCandleMarkers(
                indicatorsRef.current?.rsiDivergence ? latestDivMarkersRef.current : [],
                avMarker
              );
              candleMarkersPluginRef.current.setMarkers(merged);
            }
          }
        }, 90);
      }

      if (isSyncingRange) return;
      isSyncingRange = true;
      try {
        if (rsiChartInstanceRef.current) rsiChartInstanceRef.current.timeScale().setVisibleLogicalRange(range);
        if (macdChartInstanceRef.current) macdChartInstanceRef.current.timeScale().setVisibleLogicalRange(range);
      } catch (e) {}
      isSyncingRange = false;
    });

    if (rsiChartInstanceRef.current) {
      rsiChartInstanceRef.current.timeScale().subscribeVisibleLogicalRangeChange(range => {
        if (isSyncingRange || !range) return;
        isSyncingRange = true;
        try {
          if (chartInstanceRef.current) chartInstanceRef.current.timeScale().setVisibleLogicalRange(range);
          if (macdChartInstanceRef.current) macdChartInstanceRef.current.timeScale().setVisibleLogicalRange(range);
        } catch (e) {}
        isSyncingRange = false;
      });
    }

    if (macdChartInstanceRef.current) {
      macdChartInstanceRef.current.timeScale().subscribeVisibleLogicalRangeChange(range => {
        if (isSyncingRange || !range) return;
        isSyncingRange = true;
        try {
          if (chartInstanceRef.current) chartInstanceRef.current.timeScale().setVisibleLogicalRange(range);
          if (rsiChartInstanceRef.current) rsiChartInstanceRef.current.timeScale().setVisibleLogicalRange(range);
        } catch (e) {}
        isSyncingRange = false;
      });
    }

    // Subscribe to crosshair move for HUD inspection
    mainChart.subscribeCrosshairMove(param => {
      if (!param || !param.time || !param.seriesData) {
        setHoverData(null);
        return;
      }
      const data = param.seriesData.get(candleSeries);
      if (data) {
        setHoverData(data);
      }
    });

    // Subscribe to time scale change to sync SVG trendlines
    mainChart.timeScale().subscribeVisibleLogicalRangeChange(() => {
      recalcSvgLines();
    });
    mainChart.timeScale().subscribeVisibleTimeRangeChange(() => {
      recalcSvgLines();
    });

    // Resize Observer for auto responsive sizing
    const resizeObserver = new ResizeObserver(entries => {
      if (!entries || !entries[0] || !chartInstanceRef.current) return;
      const { width: newWidth, height: newHeight } = entries[0].contentRect;
      if (newWidth > 0 && newHeight > 0) {
        chartInstanceRef.current.resize(newWidth, newHeight);
        if (rsiChartInstanceRef.current && rsiContainerRef.current) {
          rsiChartInstanceRef.current.resize(newWidth, rsiHeightRef.current);
        }
        if (macdChartInstanceRef.current && macdContainerRef.current) {
          macdChartInstanceRef.current.resize(newWidth, macdHeightRef.current);
        }
        recalcSvgLines();
      }
    });

    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      if (avwapVisibleTimerRef.current) {
        clearTimeout(avwapVisibleTimerRef.current);
        avwapVisibleTimerRef.current = null;
      }
      candleMarkersPluginRef.current = null;
      rsiMarkersPluginRef.current = null;
      rsiMaSeriesRef.current = null;
      if (chartInstanceRef.current) {
        chartInstanceRef.current.remove();
        chartInstanceRef.current = null;
      }
      if (rsiChartInstanceRef.current) {
        rsiChartInstanceRef.current.remove();
        rsiChartInstanceRef.current = null;
      }
      if (macdChartInstanceRef.current) {
        macdChartInstanceRef.current.remove();
        macdChartInstanceRef.current = null;
      }
    };
  }, [indicators, indicatorSettings.rsiPeriod, indicatorSettings.rsiMaPeriod, chartInterval, chartTheme]);

  // Dynamic resize of RSI, MACD, and main chart when pane heights change
  useEffect(() => {
    if (rsiChartInstanceRef.current && rsiContainerRef.current) {
      const w = rsiContainerRef.current.clientWidth;
      if (w > 0) {
        rsiChartInstanceRef.current.resize(w, rsiHeight);
      }
    }
    if (macdChartInstanceRef.current && macdContainerRef.current) {
      const w = macdContainerRef.current.clientWidth;
      if (w > 0) {
        macdChartInstanceRef.current.resize(w, macdHeight);
      }
    }
    if (chartInstanceRef.current && chartContainerRef.current) {
      const w = chartContainerRef.current.clientWidth;
      const h = chartContainerRef.current.clientHeight;
      if (w > 0 && h > 0) {
        chartInstanceRef.current.resize(w, h);
      }
    }
    recalcSvgLines();
  }, [rsiHeight, macdHeight]);

  // Push candle data & indicators to series whenever candles update
  useEffect(() => {
    if (!candles || candles.length === 0 || !candlestickSeriesRef.current) return;

    // Standard Candlesticks vs Heikin Ashi
    const dataToRender = candleType === 'heikin_ashi' ? calcHeikinAshi(candles) : candles;

    // 1. Set Candlestick Data
    candlestickSeriesRef.current.setData(dataToRender);

    // 2. Set Volume Data
    if (volumeSeriesRef.current) {
      const volData = dataToRender.map(c => ({
        time: c.time,
        value: c.volume || 0,
        color: c.close >= c.open ? 'rgba(16, 185, 129, 0.45)' : 'rgba(239, 68, 68, 0.45)'
      }));
      volumeSeriesRef.current.setData(volData);
    }

    // 3. Set KAMA Pro (2-Color Adaptive Moving Average), MTF Compass, AVWAP & EMA Series
    const kamaOpts = {
      erLen: indicatorSettings.kamaErPeriod || 10,
      fastLen: indicatorSettings.kamaFastPeriod || 5,
      slowLen: indicatorSettings.kamaSlowPeriod || 30,
      fltLen: indicatorSettings.kamaFilterPeriod || 20,
      fltMult: indicatorSettings.kamaFilterMult ?? 2,
      upColor: indicatorSettings.kamaUpColor || '#00e676',
      downColor: indicatorSettings.kamaDownColor || '#ef4444'
    };

    if (indicators.kama) {
      const kamaRes = calcKAMAPro(dataToRender, kamaOpts);
      if (kamaSeriesRef.current) {
        kamaSeriesRef.current.setData(kamaRes.lineData);
        if (kamaRes.latestState?.color) {
          kamaSeriesRef.current.applyOptions({
            color: kamaRes.latestState.color,
            title: ''
          });
        }
      }
      setLatestKamaState(kamaRes.latestState);
      setMtfKamaState(calcMTFKama(dataToRender, chartInterval, kamaOpts));
    } else {
      setLatestKamaState(null);
      setMtfKamaState(null);
    }

    // ⚡ 2-Bar Teyitli Trend HO (55 SMA & 24 RSI)
    let trendMarkers = [];
    if (indicators.trendMa55) {
      const trendMaOpts = {
        trendMaPeriod: indicatorSettings.trendMaPeriod || 55,
        trendMaType: indicatorSettings.trendMaType || 'SMA',
        trendRsiPeriod: indicatorSettings.trendRsiPeriod || 24,
        trendRsiMaPeriod: indicatorSettings.trendRsiMaPeriod || 55,
        trendConfirmBars: indicatorSettings.trendConfirmBars || 2,
        trendUpColor: indicatorSettings.trendUpColor || '#10b981',
        trendDownColor: indicatorSettings.trendDownColor || '#ef4444'
      };
      const trendRes = calcTrendMA55(dataToRender, trendMaOpts);
      if (trendMa55SeriesRef.current) {
        trendMa55SeriesRef.current.setData(trendRes.lineData);
        if (trendRes.latestState?.color) {
          trendMa55SeriesRef.current.applyOptions({
            color: trendRes.latestState.color,
            title: ''
          });
        }
      }
      setLatestTrendMaState(trendRes.latestState);
      if (indicatorSettings.trendShowMarkers !== false) {
        trendMarkers = trendRes.markers || [];
      }
    } else {
      if (trendMa55SeriesRef.current) {
        trendMa55SeriesRef.current.setData([]);
      }
      setLatestTrendMaState(null);
    }
    latestTrendMarkersRef.current = trendMarkers;

    let avwapAnchorMarker = null;
    if (indicators.avwap && avwapSeriesRef.current) {
      const avColor = indicatorSettings.avwapColor || '#06b6d4';
      avwapSeriesRef.current.applyOptions({ color: avColor });
      const mode = indicatorSettings.avwapAnchorMode || 'auto';
      const lookbackPreset = indicatorSettings.avwapLookback || 'cycle';

      let effectiveVisibleRange = null;
      if (lookbackPreset === 'visible') {
        const curVis = chartInstanceRef.current?.timeScale().getVisibleLogicalRange();
        if (curVis && typeof curVis.from === 'number' && typeof curVis.to === 'number') {
          effectiveVisibleRange = curVis;
        } else {
          const totalBars = candles.length;
          const viewConfig = lastViewConfigRef.current || { barCount: 95, rightOffset: 8 };
          const ro = typeof viewConfig.rightOffset === 'number' ? Math.max(4, viewConfig.rightOffset) : 8;
          const bc = typeof viewConfig.barCount === 'number' ? Math.max(15, viewConfig.barCount) : 95;
          const tTo = totalBars - 1 + ro;
          effectiveVisibleRange = { from: Math.max(0, tTo - bc), to: tTo };
        }
      }

      // Compute AVWAP strictly from raw OHLC candles so Heikin Ashi smoothing never distorts price or pivots
      const avwapRes = computeConfiguredAVWAP(candles, {
        mode,
        avwapAnchorTime: indicatorSettings.avwapAnchorTime,
        chartInterval: chartIntervalRef.current || chartInterval,
        avwapLookback: lookbackPreset,
        visibleRange: effectiveVisibleRange
      });

      avwapSeriesRef.current.setData(avwapRes.lineData);
      setLatestAvwapState(avwapRes.latest);
      lastAvwapSyncKeyRef.current = avwapRes.latest
        ? `${avwapRes.latest.anchorTime}_${avwapRes.latest.anchorType}_${avwapRes.latest.value}_${avwapRes.latest.barCount}`
        : '';
      avwapAnchorMarker = buildAvwapAnchorMarker(avwapRes.latest, avColor);
    } else {
      lastAvwapSyncKeyRef.current = '';
      setLatestAvwapState(null);
    }

    if (ema20SeriesRef.current) {
      const type1 = indicatorSettings.ema1Type || 'EMA';
      ema20SeriesRef.current.applyOptions({ color: indicatorSettings.ema1Color || '#ef4444' });
      const d1 = type1 === 'SMA'
        ? calcSMA(dataToRender, indicatorSettings.ema1Period || 20)
        : calcEMA(dataToRender, indicatorSettings.ema1Period || 20);
      ema20SeriesRef.current.setData(d1);
    }
    if (ema50SeriesRef.current) {
      const type2 = indicatorSettings.ema2Type || 'SMA';
      ema50SeriesRef.current.applyOptions({ color: indicatorSettings.ema2Color || '#3b82f6' });
      const d2 = type2 === 'SMA'
        ? calcSMA(dataToRender, indicatorSettings.ema2Period || 50)
        : calcEMA(dataToRender, indicatorSettings.ema2Period || 50);
      ema50SeriesRef.current.setData(d2);
    }
    if (ema200SeriesRef.current) {
      const type3 = indicatorSettings.ema3Type || 'SMA';
      ema200SeriesRef.current.applyOptions({ color: indicatorSettings.ema3Color || '#f97316' });
      const d3 = type3 === 'SMA'
        ? calcSMA(dataToRender, indicatorSettings.ema3Period || 200)
        : calcEMA(dataToRender, indicatorSettings.ema3Period || 200);
      ema200SeriesRef.current.setData(d3);
    }

    // 4. Set Bollinger Bands with user customizable period & std dev
    if (bbUpperSeriesRef.current && bbMiddleSeriesRef.current && bbLowerSeriesRef.current) {
      const bb = calcBollinger(dataToRender, indicatorSettings.bollingerPeriod || 20, indicatorSettings.bollingerStdDev || 2);
      bbUpperSeriesRef.current.setData(bb.upper);
      bbMiddleSeriesRef.current.setData(bb.middle);
      bbLowerSeriesRef.current.setData(bb.lower);
    }

    // 5. Set RSI Series, RSI MA, and Divergences
    const rsiData = calcRSI(dataToRender, indicatorSettings.rsiPeriod || 14);
    if (rsiSeriesRef.current) {
      rsiSeriesRef.current.setData(rsiData);
    }

    if (rsiMaSeriesRef.current && indicators.rsiMa) {
      const rsiMaData = calcRsiMA(rsiData, indicatorSettings.rsiMaPeriod || 14);
      rsiMaSeriesRef.current.setData(rsiMaData);
    }

    if (indicators.rsiDivergence) {
      const { candleMarkers, rsiMarkers, latest } = calcDivergences(dataToRender, rsiData, 2);
      const divList = candleMarkers || [];
      latestDivMarkersRef.current = divList;
      if (candleMarkersPluginRef.current) {
        candleMarkersPluginRef.current.setMarkers(mergeCandleMarkers(divList, avwapAnchorMarker, trendMarkers));
      }
      if (rsiMarkersPluginRef.current) {
        rsiMarkersPluginRef.current.setMarkers(rsiMarkers || []);
      }
      setLatestDivergence(latest);
    } else {
      latestDivMarkersRef.current = [];
      if (candleMarkersPluginRef.current) {
        candleMarkersPluginRef.current.setMarkers(mergeCandleMarkers([], avwapAnchorMarker, trendMarkers));
      }
      if (rsiMarkersPluginRef.current) {
        rsiMarkersPluginRef.current.setMarkers([]);
      }
      setLatestDivergence(null);
    }

    // 6. Draw / Update Portfolio Cost Line
    if (candlestickSeriesRef.current) {
      if (costPriceLineRef.current) {
        try {
          candlestickSeriesRef.current.removePriceLine(costPriceLineRef.current);
        } catch (e) {}
        costPriceLineRef.current = null;
      }

      // Read normalized cost matching the chart's quotation currency (TRY for BIST, USD for Crypto/US)
      const holdingCost = activeHolding 
        ? (activeHolding.chartUnitCost || activeHolding.holdingCost || activeHolding.avgPrice || activeHolding.costBasis || activeHolding.avg_cost || 0) 
        : 0;

      if (indicators.costLine && holdingCost > 0) {
        const symMark = activeHolding?.chartSymMark || (isBist ? '₺' : '$');
        const costLine = candlestickSeriesRef.current.createPriceLine({
          price: Number(holdingCost),
          color: indicatorSettings.costLineColor || '#eab308', // Portfolio Cost Line
          lineWidth: 2,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: ''
        });
        costPriceLineRef.current = costLine;
      }

      // 7. Auto Support & Resistance Lines (Majör Pivotlar, Temiz Çizgiler)
      try {
        autoSRLinesRef.current.forEach(line => {
          try { candlestickSeriesRef.current.removePriceLine(line); } catch (e) {}
        });
        autoSRLinesRef.current = [];

        if (indicators.autoSR && candles.length > 5) {
          const { supports, resistances } = calcAutoSR(candles, indicatorSettings.srLookback || 90);
          resistances.forEach((rPrice, idx) => {
            const rLine = candlestickSeriesRef.current.createPriceLine({
              price: rPrice,
              color: '#ef4444',
              lineWidth: 1.5,
              lineStyle: LineStyle.Dashed,
              axisLabelVisible: true,
              title: indicatorSettings.showLevelTitles ? `Direnç R${idx + 1}` : ''
            });
            autoSRLinesRef.current.push(rLine);
          });
          supports.forEach((sPrice, idx) => {
            const sLine = candlestickSeriesRef.current.createPriceLine({
              price: sPrice,
              color: '#10b981',
              lineWidth: 1.5,
              lineStyle: LineStyle.Dashed,
              axisLabelVisible: true,
              title: indicatorSettings.showLevelTitles ? `Destek S${idx + 1}` : ''
            });
            autoSRLinesRef.current.push(sLine);
          });
        }
      } catch (err) {
        console.warn('Auto SR drawing error:', err);
      }

      // 8. Auto Fibonacci Retracement Lines (Makro Döngü & Hedef Genişlemeleri - Kişiselleştirilebilir)
      try {
        autoFibLinesRef.current.forEach(line => {
          try { candlestickSeriesRef.current.removePriceLine(line); } catch (e) {}
        });
        autoFibLinesRef.current = [];

        if (indicators.autoFib && candles.length > 10) {
          const fibData = calcAutoFib(
            candles, 
            indicatorSettings.fibLookback || 180,
            indicatorSettings.fibLevels
          );
          if (fibData && fibData.levels) {
            fibData.levels.forEach(lvl => {
              const lineStyleEnum = lvl.lineStyle === 'dashed'
                ? LineStyle.Dashed
                : lvl.lineStyle === 'dotted'
                  ? LineStyle.Dotted
                  : LineStyle.Solid;

              const fibLine = candlestickSeriesRef.current.createPriceLine({
                price: lvl.price,
                color: lvl.color,
                lineWidth: lvl.lineWidth || 1,
                lineStyle: lineStyleEnum,
                axisLabelVisible: true,
                title: indicatorSettings.showLevelTitles ? `Fib ${lvl.label}` : ''
              });
              autoFibLinesRef.current.push(fibLine);
            });
          }
        }
      } catch (err) {
        console.warn('Auto Fib drawing error:', err);
      }

      // 9. Institutional Volume Profile POC (Point of Control - En Yoğun Takas Mıknatısı)
      try {
        pocLinesRef.current.forEach(line => {
          try { candlestickSeriesRef.current.removePriceLine(line); } catch (e) {}
        });
        pocLinesRef.current = [];

        if (indicators.vpPoc && dataToRender.length > 10) {
          const vpData = calcVolumeProfilePOC(dataToRender, 120, 28);
          if (vpData) {
            const pocLine = candlestickSeriesRef.current.createPriceLine({
              price: vpData.poc,
              color: indicatorSettings.pocColor || '#d946ef', // Institutional Volume Profile POC Magnet (Magenta)
              lineWidth: 2,
              lineStyle: LineStyle.Solid,
              axisLabelVisible: true,
              title: ''
            });
            pocLinesRef.current.push(pocLine);
            setLatestPocState(vpData);
          } else {
            setLatestPocState(null);
          }
        } else {
          setLatestPocState(null);
        }
      } catch (err) {
        console.warn('Volume Profile POC drawing error:', err);
      }

      // 10. 🛡️ ATR Bazlı Dinamik İz Süren Stop (Trailing Stop / Chandelier Ratchet)
      try {
        if (indicators.trailingStop && trailingStopSeriesRef.current) {
          if (indicatorSettings.trailingStopColor) {
            trailingStopSeriesRef.current.applyOptions({
              color: indicatorSettings.trailingStopColor
            });
          }
          const trailingRes = calcTrailingStop(dataToRender, {
            atrPeriod: indicatorSettings.trailingStopPeriod || 14,
            atrMult: indicatorSettings.trailingStopMult || 2.5
          });
          trailingStopSeriesRef.current.setData(trailingRes.lineData);
          setLatestTrailingStopState(trailingRes.latest);
        } else {
          if (trailingStopSeriesRef.current) {
            trailingStopSeriesRef.current.setData([]);
          }
          setLatestTrailingStopState(null);
        }
      } catch (err) {
        console.warn('Trailing Stop data update error:', err);
      }

      // 11. 📊 MACD (12, 26, 9) Histogram & Sinyal Çizgileri Güncellemesi
      try {
        if (indicators.macd && histSeriesRef.current && macdLineSeriesRef.current && signalLineSeriesRef.current) {
          const macdRes = calcMACD(
            dataToRender,
            indicatorSettings.macdFastPeriod || 12,
            indicatorSettings.macdSlowPeriod || 26,
            indicatorSettings.macdSignalPeriod || 9
          );
          histSeriesRef.current.setData(macdRes.histogram);
          macdLineSeriesRef.current.setData(macdRes.macdLine);
          signalLineSeriesRef.current.setData(macdRes.signalLine);
        }
      } catch (err) {
        console.warn('MACD data update error:', err);
      }
    }

    // Update active candles refs for range tracking & raw OHLC calculations
    candlesRef.current = dataToRender;
    rawCandlesRef.current = candles;

    // Apply preserved user view with comfortable right offset so the latest candle is never glued to the edge
    const existingRange = chartInstanceRef.current?.timeScale().getVisibleLogicalRange();
    if (existingRange && typeof existingRange.from === 'number' && typeof existingRange.to === 'number') {
      if (rsiChartInstanceRef.current) {
        try { rsiChartInstanceRef.current.timeScale().setVisibleLogicalRange(existingRange); } catch (e) {}
      }
      if (macdChartInstanceRef.current) {
        try { macdChartInstanceRef.current.timeScale().setVisibleLogicalRange(existingRange); } catch (e) {}
      }
    } else {
      const totalBars = dataToRender.length;
      if (totalBars > 0 && chartInstanceRef.current) {
        const viewConfig = lastViewConfigRef.current || { barCount: 95, rightOffset: 8 };
        const rightOffset = typeof viewConfig.rightOffset === 'number' ? Math.max(4, viewConfig.rightOffset) : 8;
        const barCount = typeof viewConfig.barCount === 'number' ? Math.max(15, viewConfig.barCount) : 95;

        const targetTo = totalBars - 1 + rightOffset;
        const targetFrom = Math.max(0, targetTo - barCount);

        chartInstanceRef.current.timeScale().setVisibleLogicalRange({ from: targetFrom, to: targetTo });
        if (rsiChartInstanceRef.current) {
          rsiChartInstanceRef.current.timeScale().setVisibleLogicalRange({ from: targetFrom, to: targetTo });
        }
        if (macdChartInstanceRef.current) {
          macdChartInstanceRef.current.timeScale().setVisibleLogicalRange({ from: targetFrom, to: targetTo });
        }
      }
    }
    syncHorizontalPriceLines();
    requestAnimationFrame(() => {
      recalcSvgLines();
      syncHorizontalPriceLines();
    });
    setTimeout(() => {
      recalcSvgLines();
      syncHorizontalPriceLines();
    }, 150);
  }, [candles, candleType, indicators, indicatorSettings, activeHolding, isBist]);

  // Resolve chart time and future logicalOffset from pixel X coordinate with intelligent future projection
  const resolvePointFromCoordinate = useCallback((x) => {
    if (!chartInstanceRef.current) return { time: null, logicalOffset: 0 };
    const timeScale = chartInstanceRef.current.timeScale();
    const activeCandles = candlesRef.current || [];
    if (activeCandles.length === 0) return { time: null, logicalOffset: 0 };

    const lastCandle = activeCandles[activeCandles.length - 1];
    const lastBarX = timeScale.timeToCoordinate(lastCandle.time);

    // Check if x coordinate is in the future area (beyond the last candle)
    if (lastBarX !== null && x > (lastBarX + 1)) {
      let futureBars = 0;
      if (typeof timeScale.coordinateToLogical === 'function') {
        const logical = timeScale.coordinateToLogical(x);
        if (logical !== null) {
          futureBars = Math.max(0.1, logical - (activeCandles.length - 1));
        }
      }
      if (!futureBars && activeCandles.length > 1) {
        const prevCandle = activeCandles[activeCandles.length - 2];
        const prevBarX = timeScale.timeToCoordinate(prevCandle.time);
        if (prevBarX !== null && lastBarX > prevBarX) {
          const barSpacing = lastBarX - prevBarX;
          futureBars = Math.max(0.1, (x - lastBarX) / barSpacing);
        }
      }
      if (!futureBars) {
        futureBars = 1;
      }

      // Calculate projected future timestamp or date
      const parseToMs = (t) => {
        if (!t) return NaN;
        if (typeof t === 'number') return t < 1e11 ? t * 1000 : t;
        if (typeof t === 'object' && t.year) return new Date(t.year, t.month - 1, t.day).getTime();
        return new Date(String(t)).getTime();
      };

      const lastMs = parseToMs(lastCandle.time);
      let projectedTime = null;

      if (!isNaN(lastMs)) {
        const sampleCount = Math.min(10, activeCandles.length - 1);
        const sampleCandle = activeCandles[activeCandles.length - 1 - sampleCount];
        const sampleMs = parseToMs(sampleCandle.time);
        const barDurationMs = (lastMs - sampleMs) / Math.max(1, sampleCount);
        const projectedMs = lastMs + futureBars * (barDurationMs || 86400000);

        const isIntraday = typeof lastCandle.time === 'number' || (typeof lastCandle.time === 'string' && lastCandle.time.includes(':'));
        if (isIntraday) {
          projectedTime = Math.round(projectedMs / 1000);
        } else {
          const pDate = new Date(projectedMs);
          const yyyy = pDate.getUTCFullYear();
          const mm = String(pDate.getUTCMonth() + 1).padStart(2, '0');
          const dd = String(pDate.getUTCDate()).padStart(2, '0');
          projectedTime = `${yyyy}-${mm}-${dd}`;
        }
      }

      return {
        time: projectedTime || normalizeChartTime(lastCandle.time),
        logicalOffset: Number(futureBars.toFixed(2))
      };
    }

    // Normal case: x is on or before the last candle
    const rawTime = timeScale.coordinateToTime(x);
    if (rawTime) {
      return {
        time: normalizeChartTime(rawTime),
        logicalOffset: 0
      };
    }

    // Fallback: Snap to nearest candle within active series
    let closestCandle = activeCandles[0];
    let minDiff = Infinity;
    for (let i = 0; i < activeCandles.length; i++) {
      const c = activeCandles[i];
      const barX = timeScale.timeToCoordinate(c.time);
      if (barX !== null) {
        const diff = Math.abs(barX - x);
        if (diff < minDiff) {
          minDiff = diff;
          closestCandle = c;
        }
      }
    }

    return {
      time: normalizeChartTime(closestCandle?.time) || null,
      logicalOffset: 0
    };
  }, []);

  // Backwards-compatible resolveTimeFromCoordinate wrapper
  const resolveTimeFromCoordinate = useCallback((x) => {
    return resolvePointFromCoordinate(x).time;
  }, [resolvePointFromCoordinate]);

  // Draggable Trendline Endpoints Handlers (TradingView-style handles)
  const handleEndpointPointerDown = (e, lineId, pointKey) => {
    e.stopPropagation();
    e.preventDefault();

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch (err) {}

    const rect = chartContainerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const y = Math.max(0, Math.min(rect.height, e.clientY - rect.top));

    const price = candlestickSeriesRef.current?.coordinateToPrice(y);
    const pointData = resolvePointFromCoordinate(x);

    setDragHandleState({
      lineId,
      point: pointKey,
      pointerId: e.pointerId,
      curX: x,
      curY: y,
      curPrice: price !== null && !isNaN(price) ? Number(price.toFixed(2)) : null,
      curTime: pointData.time,
      curLogicalOffset: pointData.logicalOffset
    });
    setSelectedTrendlineId(lineId);
  };

  const handleEndpointPointerMove = (e) => {
    if (!dragHandleState) return;
    e.stopPropagation();
    e.preventDefault();

    const rect = chartContainerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const y = Math.max(0, Math.min(rect.height, e.clientY - rect.top));

    const price = candlestickSeriesRef.current?.coordinateToPrice(y);
    const pointData = resolvePointFromCoordinate(x);

    if (price !== null && !isNaN(price)) {
      setDragHandleState(prev => ({
        ...prev,
        curX: x,
        curY: y,
        curPrice: Number(price.toFixed(2)),
        curTime: pointData.time || prev?.curTime,
        curLogicalOffset: pointData.logicalOffset !== undefined ? pointData.logicalOffset : prev?.curLogicalOffset
      }));
    }
  };

  const handleEndpointPointerUp = (e) => {
    if (!dragHandleState) return;
    e.stopPropagation();
    e.preventDefault();

    try {
      e.currentTarget.releasePointerCapture(dragHandleState.pointerId);
    } catch (err) {}

    const { lineId, point, curPrice, curTime, curLogicalOffset } = dragHandleState;
    if (point === 'rayAnchor') {
      if (curPrice !== null && curTime !== null) {
        const updatedRays = (drawings.rays || []).map(r => {
          if (r.id === lineId) {
            return {
              ...r,
              time: curTime,
              price: curPrice,
              logicalOffset: curLogicalOffset || 0
            };
          }
          return r;
        });
        saveDrawings({ ...drawings, rays: updatedRays });
        setTimeout(() => {
          recalcSvgLines();
        }, 40);
      }
      setDragHandleState(null);
      return;
    }

    if (point === 'rectP1' || point === 'rectP2') {
      if (curPrice !== null && curTime !== null) {
        const updatedRects = (drawings.rectangles || []).map(r => {
          if (r.id === lineId) {
            const key = point === 'rectP1' ? 'p1' : 'p2';
            return {
              ...r,
              [key]: {
                time: curTime,
                price: curPrice,
                logicalOffset: curLogicalOffset || 0
              }
            };
          }
          return r;
        });
        saveDrawings({ ...drawings, rectangles: updatedRects });
        setTimeout(() => recalcSvgLines(), 40);
      }
      setDragHandleState(null);
      return;
    }

    if (point === 'chanP1' || point === 'chanP2' || point === 'chanP3') {
      if (curPrice !== null && curTime !== null) {
        const updatedChannels = (drawings.channels || []).map(ch => {
          if (ch.id === lineId) {
            const key = point === 'chanP1' ? 'p1' : (point === 'chanP2' ? 'p2' : 'p3');
            return {
              ...ch,
              [key]: {
                time: curTime,
                price: curPrice,
                logicalOffset: curLogicalOffset || 0
              }
            };
          }
          return ch;
        });
        saveDrawings({ ...drawings, channels: updatedChannels });
        setTimeout(() => recalcSvgLines(), 40);
      }
      setDragHandleState(null);
      return;
    }

    if (point === 'avwapAnchor') {
      if (curPrice !== null && curTime !== null) {
        const updatedAvwaps = (drawings.anchoredVwaps || []).map(av => {
          if (av.id === lineId) {
            return { ...av, time: curTime, price: curPrice };
          }
          return av;
        });
        saveDrawings({ ...drawings, anchoredVwaps: updatedAvwaps });
        setTimeout(() => recalcSvgLines(), 40);
      }
      setDragHandleState(null);
      return;
    }

    if (curPrice !== null && curTime !== null) {
      const updatedTrendlines = (drawings.trendlines || []).map(t => {
        if (t.id === lineId) {
          return {
            ...t,
            [point]: {
              time: curTime,
              price: curPrice,
              logicalOffset: curLogicalOffset || 0
            }
          };
        }
        return t;
      });
      saveDrawings({ ...drawings, trendlines: updatedTrendlines });
      setTimeout(() => {
        recalcSvgLines();
      }, 40);
    }
    setDragHandleState(null);
  };

  // Click & Drawing handler on Chart Container
  const handleChartClick = (e) => {
    if (dragHandleState) return;
    if (selectedTrendlineId) setSelectedTrendlineId(null);
    if (selectedRayId) setSelectedRayId(null);
    if (selectedRectId) setSelectedRectId(null);
    if (selectedChannelId) setSelectedChannelId(null);
    if (selectedAnchoredVwapId) setSelectedAnchoredVwapId(null);
    if (selectedHorizontalId) setSelectedHorizontalId(null);
    setShowDrawingsList(false);

    if (!activeDrawTool || !chartInstanceRef.current || !candlestickSeriesRef.current) return;

    const rect = chartContainerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const price = candlestickSeriesRef.current.coordinateToPrice(y);
    const pointData = resolvePointFromCoordinate(x);
    const clickedTime = pointData.time || (candles[candles.length - 1]?.time);
    const logicalOffset = pointData.logicalOffset || 0;

    if (price === null || isNaN(price)) return;

    if (activeDrawTool === 'horizontal') {
      const newHorizontals = [
        ...(drawings.horizontals || []),
        {
          id: `h_${Date.now()}`,
          price: Number(price.toFixed(2)),
          label: `Destek/Direnç (${Number(price.toFixed(2))})`,
          color: '#38bdf8'
        }
      ];
      saveDrawings({ ...drawings, horizontals: newHorizontals });
      setActiveDrawTool(null);
    } else if (activeDrawTool === 'ray') {
      const newRays = [
        ...(drawings.rays || []),
        {
          id: `ray_${Date.now()}`,
          time: clickedTime,
          price: Number(price.toFixed(2)),
          logicalOffset,
          color: '#38bdf8'
        }
      ];
      saveDrawings({ ...drawings, rays: newRays });
      setActiveDrawTool(null);
      setMousePreviewPoint(null);
    } else if (activeDrawTool === 'trendline') {
      if (!trendStartPoint) {
        // First click sets Point A
        setTrendStartPoint({ time: clickedTime, logicalOffset, price: Number(price.toFixed(2)), x, y });
      } else {
        // Second click sets Point B and completes trendline
        const newTrendlines = [
          ...(drawings.trendlines || []),
          {
            id: `t_${Date.now()}`,
            p1: {
              time: trendStartPoint.time,
              logicalOffset: trendStartPoint.logicalOffset || 0,
              price: trendStartPoint.price
            },
            p2: {
              time: clickedTime,
              logicalOffset,
              price: Number(price.toFixed(2))
            },
            color: '#38bdf8'
          }
        ];
        saveDrawings({ ...drawings, trendlines: newTrendlines });
        setActiveDrawTool(null);
        setTrendStartPoint(null);
        setMousePreviewPoint(null);
        setTimeout(() => recalcSvgLines(), 30);
      }
    } else if (activeDrawTool === 'measure') {
      if (!measureStartPoint) {
        // First click: sets origin anchor
        setMeasureStartPoint({ time: clickedTime, logicalOffset, price: Number(price.toFixed(2)), x, y });
      } else {
        // Second click: locks active measurement
        setActiveMeasurement({
          p1: {
            time: measureStartPoint.time,
            logicalOffset: measureStartPoint.logicalOffset || 0,
            price: measureStartPoint.price,
            x: measureStartPoint.x,
            y: measureStartPoint.y
          },
          p2: {
            time: clickedTime,
            logicalOffset,
            price: Number(price.toFixed(2)),
            x,
            y
          },
          active: true
        });
        setActiveDrawTool(null);
        setMeasureStartPoint(null);
        setMousePreviewPoint(null);
        setTimeout(() => recalcSvgLines(), 30);
      }
    } else if (activeDrawTool === 'rectangle') {
      if (!rectStartPoint) {
        setRectStartPoint({ time: clickedTime, logicalOffset, price: Number(price.toFixed(2)), x, y });
      } else {
        const newRectangles = [
          ...(drawings.rectangles || []),
          {
            id: `rect_${Date.now()}`,
            p1: {
              time: rectStartPoint.time,
              logicalOffset: rectStartPoint.logicalOffset || 0,
              price: rectStartPoint.price
            },
            p2: {
              time: clickedTime,
              logicalOffset,
              price: Number(price.toFixed(2))
            },
            color: '#38bdf8'
          }
        ];
        saveDrawings({ ...drawings, rectangles: newRectangles });
        setActiveDrawTool(null);
        setRectStartPoint(null);
        setMousePreviewPoint(null);
        setTimeout(() => recalcSvgLines(), 30);
      }
    } else if (activeDrawTool === 'channel') {
      if (channelPoints.length === 0) {
        setChannelPoints([{ time: clickedTime, logicalOffset, price: Number(price.toFixed(2)), x, y }]);
      } else if (channelPoints.length === 1) {
        setChannelPoints(prev => [...prev, { time: clickedTime, logicalOffset, price: Number(price.toFixed(2)), x, y }]);
      } else {
        const newChannels = [
          ...(drawings.channels || []),
          {
            id: `chan_${Date.now()}`,
            p1: {
              time: channelPoints[0].time,
              logicalOffset: channelPoints[0].logicalOffset || 0,
              price: channelPoints[0].price
            },
            p2: {
              time: channelPoints[1].time,
              logicalOffset: channelPoints[1].logicalOffset || 0,
              price: channelPoints[1].price
            },
            p3: {
              time: clickedTime,
              logicalOffset,
              price: Number(price.toFixed(2))
            },
            color: '#38bdf8'
          }
        ];
        saveDrawings({ ...drawings, channels: newChannels });
        setActiveDrawTool(null);
        setChannelPoints([]);
        setMousePreviewPoint(null);
        setTimeout(() => recalcSvgLines(), 30);
      }
    } else if (activeDrawTool === 'pickAvwapAnchor') {
      updateIndicatorSettings(prev => ({
        ...prev,
        avwapAnchorMode: 'custom',
        avwapAnchorTime: clickedTime
      }));
      setIndicators(prev => ({ ...prev, avwap: true }));
      setActiveDrawTool(null);
      setMousePreviewPoint(null);
    } else if (activeDrawTool === 'anchoredVwap') {
      const newAnchoredVwaps = [
        ...(drawings.anchoredVwaps || []),
        {
          id: `avwap_${Date.now()}`,
          time: clickedTime,
          price: Number(price.toFixed(2)),
          color: '#06b6d4'
        }
      ];
      saveDrawings({ ...drawings, anchoredVwaps: newAnchoredVwaps });
      setActiveDrawTool(null);
      setMousePreviewPoint(null);
    }
  };

  const handleMouseMove = (e) => {
    if (dragHandleState) {
      handleEndpointPointerMove(e);
      return;
    }
    if (chartContainerRef.current) {
      const rect = chartContainerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const price = candlestickSeriesRef.current?.coordinateToPrice(y);
      const pointData = resolvePointFromCoordinate(x);

      if (
        (activeDrawTool === 'ray') ||
        (activeDrawTool === 'trendline' && trendStartPoint) ||
        (activeDrawTool === 'rectangle' && rectStartPoint) ||
        (activeDrawTool === 'channel' && channelPoints.length > 0) ||
        (activeDrawTool === 'measure' && measureStartPoint)
      ) {
        setMousePreviewPoint({
          x,
          y,
          price,
          time: pointData.time,
          logicalOffset: pointData.logicalOffset
        });
      }
    }
  };

  // Delete specific drawing
  const deleteHorizontal = useCallback((id) => {
    const cur = drawingsRef.current || {};
    const updated = (cur.horizontals || []).filter(h => h.id !== id);
    saveDrawings({ ...cur, horizontals: updated });
    setSelectedHorizontalId(null);
  }, [saveDrawings]);

  const deleteTrendline = useCallback((id) => {
    const cur = drawingsRef.current || {};
    const updated = (cur.trendlines || []).filter(t => t.id !== id);
    saveDrawings({ ...cur, trendlines: updated });
    setSelectedTrendlineId(null);
  }, [saveDrawings]);

  const deleteRay = useCallback((id) => {
    const cur = drawingsRef.current || {};
    const updated = (cur.rays || []).filter(r => r.id !== id);
    saveDrawings({ ...cur, rays: updated });
    setSelectedRayId(null);
  }, [saveDrawings]);

  const deleteRectangle = useCallback((id) => {
    const cur = drawingsRef.current || {};
    const updated = (cur.rectangles || []).filter(r => r.id !== id);
    saveDrawings({ ...cur, rectangles: updated });
    setSelectedRectId(null);
  }, [saveDrawings]);

  const deleteChannel = useCallback((id) => {
    const cur = drawingsRef.current || {};
    const updated = (cur.channels || []).filter(c => c.id !== id);
    saveDrawings({ ...cur, channels: updated });
    setSelectedChannelId(null);
  }, [saveDrawings]);

  const deleteAnchoredVwap = useCallback((id) => {
    const cur = drawingsRef.current || {};
    const updated = (cur.anchoredVwaps || []).filter(av => av.id !== id);
    saveDrawings({ ...cur, anchoredVwaps: updated });
    setSelectedAnchoredVwapId(null);
  }, [saveDrawings]);

  const clearAllDrawings = () => {
    if (window.confirm(`${cleanTicker || symbol} varlığına ait TÜM çizimleri temizlemek istediğinize emin misiniz?`)) {
      saveDrawings({ horizontals: [], trendlines: [], rays: [], rectangles: [], channels: [], anchoredVwaps: [] });
      setActiveMeasurement(null);
      setShowDrawingsList(false);
      setSelectedHorizontalId(null);
      setSelectedTrendlineId(null);
      setSelectedRayId(null);
      setSelectedRectId(null);
      setSelectedChannelId(null);
      setSelectedAnchoredVwapId(null);
    }
  };

  // ⌨️ Keyboard Shortcuts: ESC (Kapat/İptal) & Delete / Backspace (Seçili Çizimi Sil)
  useEffect(() => {
    const handleKeyDown = (e) => {
      const isInput = e.target && (
        e.target.tagName === 'INPUT' ||
        e.target.tagName === 'TEXTAREA' ||
        e.target.tagName === 'SELECT' ||
        e.target.isContentEditable
      );

      // 1. ESC Tuşu: Çizimler listesini kapatır, ayarlar modalını kapatır, aktif çizim modunu iptal eder ve çizim seçimlerini kaldırır
      if (e.key === 'Escape' || e.key === 'Esc') {
        if (showSettingsModalRef.current) {
          setShowSettingsModal(false);
          e.preventDefault();
          return;
        }
        if (isInput) {
          e.target.blur();
          return;
        }
        let handled = false;
        if (showDrawingsListRef.current) {
          setShowDrawingsList(false);
          handled = true;
        }
        if (activeDrawToolRef.current) {
          setActiveDrawTool(null);
          setTrendStartPoint(null);
          setRectStartPoint(null);
          setChannelPoints([]);
          setMeasureStartPoint(null);
          setMousePreviewPoint(null);
          handled = true;
        }
        if (selectedTrendlineIdRef.current) {
          setSelectedTrendlineId(null);
          handled = true;
        }
        if (selectedRayIdRef.current) {
          setSelectedRayId(null);
          handled = true;
        }
        if (selectedRectIdRef.current) {
          setSelectedRectId(null);
          handled = true;
        }
        if (selectedChannelIdRef.current) {
          setSelectedChannelId(null);
          handled = true;
        }
        if (selectedAnchoredVwapIdRef.current) {
          setSelectedAnchoredVwapId(null);
          handled = true;
        }
        if (selectedHorizontalIdRef.current) {
          setSelectedHorizontalId(null);
          handled = true;
        }
        if (activeMeasurementRef.current) {
          setActiveMeasurement(null);
          handled = true;
        }
        if (handled) {
          e.preventDefault();
        }
        return;
      }

      if (isInput) return;

      // 2. Delete / Backspace Tuşu: Üzerine tıklanarak seçilmiş herhangi bir çizimi (Trend, Işın, Yatay Seviye, Bölge, Kanal, AVWAP, Cetvel) anında siler
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedTrendlineIdRef.current) {
          deleteTrendline(selectedTrendlineIdRef.current);
          setSelectedTrendlineId(null);
          e.preventDefault();
        } else if (selectedRayIdRef.current) {
          deleteRay(selectedRayIdRef.current);
          setSelectedRayId(null);
          e.preventDefault();
        } else if (selectedRectIdRef.current) {
          deleteRectangle(selectedRectIdRef.current);
          setSelectedRectId(null);
          e.preventDefault();
        } else if (selectedChannelIdRef.current) {
          deleteChannel(selectedChannelIdRef.current);
          setSelectedChannelId(null);
          e.preventDefault();
        } else if (selectedAnchoredVwapIdRef.current) {
          deleteAnchoredVwap(selectedAnchoredVwapIdRef.current);
          setSelectedAnchoredVwapId(null);
          e.preventDefault();
        } else if (selectedHorizontalIdRef.current) {
          deleteHorizontal(selectedHorizontalIdRef.current);
          setSelectedHorizontalId(null);
          e.preventDefault();
        } else if (activeMeasurementRef.current) {
          setActiveMeasurement(null);
          e.preventDefault();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [deleteTrendline, deleteRay, deleteRectangle, deleteChannel, deleteAnchoredVwap, deleteHorizontal]);

  // 🖱️ Çizimler listesi dışına tıklandığında menüyü otomatik kapat
  useEffect(() => {
    if (!showDrawingsList) return;
    const handleOutsideClick = (e) => {
      if (drawingsListRef.current && !drawingsListRef.current.contains(e.target)) {
        setShowDrawingsList(false);
      }
    };
    window.addEventListener('mousedown', handleOutsideClick);
    return () => window.removeEventListener('mousedown', handleOutsideClick);
  }, [showDrawingsList]);

  // 📷 Tek Tıkla Grafik Görüntüsü Alma & Panoya Kopyalama (Snapshot)
  const handleTakeScreenshot = useCallback(async () => {
    if (!chartInstanceRef.current) return;
    try {
      const chartCanvas = chartInstanceRef.current.takeScreenshot();
      if (!chartCanvas) return;

      const finalCanvas = document.createElement('canvas');
      const w = chartCanvas.width;
      let totalH = chartCanvas.height;

      const rsiCanvas = (indicators.rsi && rsiChartInstanceRef.current)
        ? rsiChartInstanceRef.current.takeScreenshot() : null;
      const macdCanvas = (indicators.macd && macdChartInstanceRef.current)
        ? macdChartInstanceRef.current.takeScreenshot() : null;

      if (rsiCanvas) totalH += rsiCanvas.height;
      if (macdCanvas) totalH += macdCanvas.height;

      finalCanvas.width = w;
      finalCanvas.height = totalH;
      const ctx = finalCanvas.getContext('2d');

      ctx.fillStyle = isLight ? '#ffffff' : '#040711';
      ctx.fillRect(0, 0, w, totalH);

      ctx.drawImage(chartCanvas, 0, 0);

      let currentY = chartCanvas.height;
      if (rsiCanvas) {
        ctx.drawImage(rsiCanvas, 0, currentY);
        currentY += rsiCanvas.height;
      }
      if (macdCanvas) {
        ctx.drawImage(macdCanvas, 0, currentY);
      }

      // Terminal Watermark badge
      ctx.fillStyle = isLight ? 'rgba(2, 132, 199, 0.55)' : 'rgba(0, 229, 255, 0.55)';
      ctx.font = 'bold 12px monospace';
      ctx.fillText(`H2B TERMINAL PRO CHART • ${cleanTicker || symbol} (${chartInterval})`, 16, 24);

      const filename = `ProChart_${cleanTicker || symbol}_${chartInterval}_${new Date().toISOString().slice(0, 10)}.png`;
      const dataUrl = finalCanvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = filename;
      link.href = dataUrl;
      link.click();

      try {
        finalCanvas.toBlob(async (blob) => {
          if (blob && navigator.clipboard && window.ClipboardItem) {
            await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
          }
        });
      } catch (clipErr) {}

      setScreenshotToast('📷 Grafik görüntüsü panoya kopyalandı ve indirildi!');
      setTimeout(() => setScreenshotToast(null), 3500);
    } catch (err) {
      console.warn('Screenshot error:', err);
    }
  }, [cleanTicker, symbol, chartInterval, isLight, indicators.rsi, indicators.macd]);

  // Reset chart zoom level and right-edge margin to clean standard view
  const handleResetView = useCallback(() => {
    lastViewConfigRef.current = { barCount: 95, rightOffset: 8 };
    try {
      localStorage.setItem('terminal_chart_view_config', JSON.stringify(lastViewConfigRef.current));
    } catch (e) {}

    const totalBars = candlesRef.current?.length || 0;
    if (totalBars > 0 && chartInstanceRef.current) {
      const targetTo = totalBars - 1 + 8;
      const targetFrom = Math.max(0, targetTo - 95);
      chartInstanceRef.current.timeScale().setVisibleLogicalRange({ from: targetFrom, to: targetTo });
      if (rsiChartInstanceRef.current) {
        rsiChartInstanceRef.current.timeScale().setVisibleLogicalRange({ from: targetFrom, to: targetTo });
      }
    }
  }, []);

  // Last Candle Details for HUD
  const lastBar = useMemo(() => {
    const dataToUse = candleType === 'heikin_ashi' ? calcHeikinAshi(candles) : candles;
    if (!dataToUse || dataToUse.length === 0) return null;
    return dataToUse[dataToUse.length - 1];
  }, [candles, candleType]);

  const displayBar = hoverData || lastBar;
  const barChangePct = useMemo(() => {
    if (!displayBar || !displayBar.open) return 0;
    return ((displayBar.close - displayBar.open) / displayBar.open) * 100;
  }, [displayBar]);

  // Portfolio PnL for Holding Overlay
  const holdingInfo = useMemo(() => {
    if (!activeHolding) return null;
    const cost = activeHolding.chartUnitCost || activeHolding.holdingCost || activeHolding.avgPrice || activeHolding.avg_cost || 0;
    const shares = activeHolding.shares || activeHolding.quantity || 0;
    const currentPrice = displayBar?.close || activeHolding.currentPrice || cost;
    const pnlPct = cost > 0 ? ((currentPrice - cost) / cost) * 100 : (activeHolding.returnPct || 0);
    const pnlVal = (currentPrice - cost) * shares;
    const symMark = activeHolding.chartSymMark || (isBist ? '₺' : '$');
    const altCostTRY = activeHolding.unitCostTRY || 0;

    return {
      cost,
      altCostTRY,
      shares,
      pnlPct,
      pnlVal,
      symMark,
      isProfit: pnlPct >= 0
    };
  }, [activeHolding, displayBar, isBist]);

  const totalDrawingsCount = 
    (drawings.horizontals?.length || 0) + 
    (drawings.trendlines?.length || 0) + 
    (drawings.rays?.length || 0) + 
    (drawings.rectangles?.length || 0) + 
    (drawings.channels?.length || 0) + 
    (drawings.anchoredVwaps?.length || 0);

  // Dynamic Theme-Aware Styling for Drawing Tools (+ Yatay Seviye, + Yatay Işın, + Trend Çizgisi)
  const getDrawingButtonStyles = (toolType) => {
    const isActive = activeDrawTool === toolType;
    if (isLight) {
      return {
        fontSize: 10,
        padding: '3px 9px',
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        background: isActive ? 'rgba(2, 132, 199, 0.16)' : '#ffffff',
        borderColor: isActive ? '#0284c7' : '#cbd5e1',
        color: isActive ? '#0284c7' : '#1e293b',
        fontWeight: isActive ? 700 : 600,
        boxShadow: isActive ? '0 1px 3px rgba(2, 132, 199, 0.25)' : '0 1px 2px rgba(0,0,0,0.05)',
        cursor: 'pointer',
        transition: 'all 0.15s ease'
      };
    }
    return {
      fontSize: 10,
      padding: '3px 9px',
      display: 'flex',
      alignItems: 'center',
      gap: 4,
      background: isActive ? 'rgba(56, 189, 248, 0.25)' : 'rgba(255,255,255,0.04)',
      borderColor: isActive ? '#38bdf8' : 'rgba(255,255,255,0.16)',
      color: isActive ? '#38bdf8' : '#e2e8f0',
      fontWeight: isActive ? 700 : 600,
      cursor: 'pointer',
      transition: 'all 0.15s ease'
    };
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', background: isLight ? '#f8fafc' : '#040711', color: isLight ? '#0f172a' : '#f8fafc', borderRadius: 8, overflow: 'hidden' }}>
      
      {/* 🌟 TOP TOOLBAR: INDICATORS, TIMEFRAMES & DRAWING CONTROLS */}
      <div 
        style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          flexWrap: 'wrap', 
          gap: 8, 
          padding: '8px 14px', 
          background: isLight ? '#ffffff' : 'rgba(11, 17, 32, 0.95)', 
          borderBottom: isLight ? '1px solid #e2e8f0' : '1px solid rgba(255, 255, 255, 0.08)',
          zIndex: 10
        }}
      >
        {/* Left: Timeframes & Indicators */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          
          {/* ⏱️ Zaman Dilimi Seçici (Sıralı: 1S En Solda -> 3A En Sağda) */}
          <div style={{ display: 'inline-flex', background: isLight ? '#f1f5f9' : 'rgba(0,0,0,0.6)', borderRadius: 5, padding: 2, border: isLight ? '1px solid #cbd5e1' : '1px solid rgba(255,255,255,0.1)' }}>
            {[
              { id: '1S', label: '1S (1 Saatlik)' },
              { id: '2S', label: '2S (2 Saatlik)' },
              { id: '4S', label: '4S (4 Saatlik)' },
              { id: '1G', label: '1G (Günlük)' },
              { id: '1H', label: '1H (Haftalık)' },
              { id: '1A', label: '1A (Aylık)' },
              { id: '2A', label: '2A (2 Aylık)' },
              { id: '3A', label: '3A (3 Aylık / Çeyreklik)' }
            ].map(tf => (
              <button
                key={tf.id}
                type="button"
                onClick={() => handleSetChartInterval(tf.id)}
                className={`chip-btn ${chartInterval === tf.id ? 'active' : ''}`}
                style={{ 
                  fontSize: 10, 
                  padding: '3px 7px', 
                  fontWeight: chartInterval === tf.id ? 700 : 500,
                  background: chartInterval === tf.id ? 'rgba(0, 229, 255, 0.2)' : 'transparent',
                  borderColor: chartInterval === tf.id ? 'var(--cyan)' : 'transparent',
                  color: chartInterval === tf.id ? 'var(--cyan)' : (isLight ? '#64748b' : 'var(--text-muted)')
                }}
                title={`${tf.label} periyoduna geç`}
              >
                {tf.id}
              </button>
            ))}
          </div>

          <div style={{ width: 1, height: 18, background: isLight ? '#cbd5e1' : 'rgba(255,255,255,0.1)', margin: '0 3px' }} />

          {/* 🕯️ Mum Tipi Seçici (Standart vs Heikin Ashi) */}
          <div style={{ display: 'inline-flex', background: isLight ? '#f1f5f9' : 'rgba(0,0,0,0.6)', borderRadius: 5, padding: 2, border: isLight ? '1px solid #cbd5e1' : '1px solid rgba(255,255,255,0.1)' }}>
            <button
              type="button"
              onClick={() => handleSetCandleType('candles')}
              className={`chip-btn ${candleType === 'candles' ? 'active' : ''}`}
              style={{
                fontSize: 10,
                padding: '3px 7px',
                fontWeight: candleType === 'candles' ? 700 : 500,
                background: candleType === 'candles' ? 'rgba(16, 185, 129, 0.2)' : 'transparent',
                borderColor: candleType === 'candles' ? '#10b981' : 'transparent',
                color: candleType === 'candles' ? '#10b981' : (isLight ? '#64748b' : 'var(--text-muted)')
              }}
              title="Klasik Japon Mumları"
            >
              🕯️ Standart
            </button>
            <button
              type="button"
              onClick={() => handleSetCandleType('heikin_ashi')}
              className={`chip-btn ${candleType === 'heikin_ashi' ? 'active' : ''}`}
              style={{
                fontSize: 10,
                padding: '3px 7px',
                fontWeight: candleType === 'heikin_ashi' ? 700 : 500,
                background: candleType === 'heikin_ashi' ? 'rgba(168, 85, 247, 0.2)' : 'transparent',
                borderColor: candleType === 'heikin_ashi' ? '#a855f7' : 'transparent',
                color: candleType === 'heikin_ashi' ? '#a855f7' : (isLight ? '#64748b' : 'var(--text-muted)')
              }}
              title="Heikin Ashi Trend Mumları (Trend yumuşatma ve gürültü filtreleme)"
            >
              🎋 Heikin Ashi
            </button>
          </div>

          <div style={{ width: 1, height: 18, background: isLight ? '#cbd5e1' : 'rgba(255,255,255,0.1)', margin: '0 3px' }} />

          {/* 📊 İndikatör Toggle Butonları */}
          <span style={{ fontSize: 10, fontWeight: 700, color: isLight ? '#475569' : 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 3 }}>
            <Sliders size={12} className="text-cyan" />
            <span>İNDİKATÖRLER:</span>
          </span>

          {/* 🧭 2-Renkli Adaptif Kaufman Hareketli Ortalaması (KAMA Pro) */}
          <button
            type="button"
            onClick={() => toggleIndicator('kama')}
            className="chip-btn"
            style={{
              fontSize: 9.5,
              padding: '2px 8px',
              color: indicators.kama ? (latestKamaState?.color || indicatorSettings.kamaUpColor || '#00e676') : (isLight ? '#64748b' : 'inherit'),
              borderColor: indicators.kama ? (latestKamaState?.color || indicatorSettings.kamaUpColor || '#00e676') : (isLight ? '#cbd5e1' : 'rgba(255,255,255,0.1)'),
              background: indicators.kama
                ? (latestKamaState?.regime === -1
                    ? (indicatorSettings.kamaDownColor ? `${indicatorSettings.kamaDownColor}26` : 'rgba(239, 68, 68, 0.16)')
                    : (indicatorSettings.kamaUpColor ? `${indicatorSettings.kamaUpColor}26` : 'rgba(0, 230, 118, 0.16)'))
                : (isLight ? '#f1f5f9' : 'transparent'),
              fontWeight: indicators.kama ? 700 : 500,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4
            }}
            title="Adaptif Kaufman Hareketli Ortalaması (KAMA Pro - Renkler Ayarlardan Değiştirilebilir)"
          >
            <span>🧭 KAMA Pro</span>
          </button>

          {/* ⚡ 2-Bar Teyitli Trend HO (55 SMA & 24 RSI) */}
          <button
            type="button"
            onClick={() => toggleIndicator('trendMa55')}
            className="chip-btn"
            style={{
              fontSize: 9.5,
              padding: '2px 8px',
              color: indicators.trendMa55 ? (latestTrendMaState?.color || indicatorSettings.trendUpColor || '#10b981') : (isLight ? '#64748b' : 'inherit'),
              borderColor: indicators.trendMa55 ? (latestTrendMaState?.color || indicatorSettings.trendUpColor || '#10b981') : (isLight ? '#cbd5e1' : 'rgba(255,255,255,0.1)'),
              background: indicators.trendMa55
                ? (latestTrendMaState?.trend === -1
                    ? (indicatorSettings.trendDownColor ? `${indicatorSettings.trendDownColor}26` : 'rgba(239, 68, 68, 0.16)')
                    : (indicatorSettings.trendUpColor ? `${indicatorSettings.trendUpColor}26` : 'rgba(16, 185, 129, 0.16)'))
                : (isLight ? '#f1f5f9' : 'transparent'),
              fontWeight: indicators.trendMa55 ? 700 : 500,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4
            }}
            title="⚡ 24 RSI & 55 SMA Çift Teyitli Trend Ortalaması (2-Bar Teyitli: Fiyat > HO Yeşil, Fiyat < HO Kırmızı)"
          >
            <span>⚡ Trend HO (24/55)</span>
            {indicators.trendMa55 && latestTrendMaState && (
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  backgroundColor: latestTrendMaState.color,
                  boxShadow: `0 0 6px ${latestTrendMaState.color}`
                }}
              />
            )}
          </button>

          {/* ⚓ Dip/Tepe/Özel Çapalı Kurumsal Maliyet Eğrisi (Anchored VWAP) */}
          <div style={{ display: 'inline-flex', alignItems: 'center' }}>
            <button
              type="button"
              onClick={() => toggleIndicator('avwap')}
              className="chip-btn"
              style={{
                fontSize: 9.5,
                padding: '2px 7px',
                color: indicators.avwap ? (indicatorSettings.avwapColor || '#06b6d4') : (isLight ? '#64748b' : 'inherit'),
                borderColor: indicators.avwap ? (indicatorSettings.avwapColor || '#06b6d4') : (isLight ? '#cbd5e1' : 'rgba(255,255,255,0.1)'),
                background: indicators.avwap ? `${indicatorSettings.avwapColor || '#06b6d4'}26` : (isLight ? '#f1f5f9' : 'transparent'),
                fontWeight: indicators.avwap ? 700 : 500,
                borderTopRightRadius: indicators.avwap ? 0 : 4,
                borderBottomRightRadius: indicators.avwap ? 0 : 4
              }}
              title={
                indicators.avwap && latestAvwapState?.decisionReason
                  ? `Kurumsal Anchored VWAP • ${latestAvwapState.decisionReason}\n(Özel muma çapa atmak için yanındaki 🎯 Çapa butonuna tıklayın)`
                  : 'Kurumsal Hacim Ağırlıklı Ortalama Maliyet (Akıllı Oto Rejim / Dip / Zirve / Özel)'
              }
            >
              ⚓ AVWAP {(() => {
                if (!indicators.avwap) return '';
                const m = indicatorSettings.avwapAnchorMode || 'auto';
                if (m === 'custom') return '(Özel)';
                if (m === 'ytd') return '(YTD)';
                if (m === 'high') return '(Zirve)';
                if (m === 'low') return '(Dip)';
                return latestAvwapState?.anchorModeResolved === 'high' ? '(Oto: Zirve)' : '(Oto: Dip)';
              })()}
            </button>
            {indicators.avwap && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveDrawTool(prev => prev === 'pickAvwapAnchor' ? null : 'pickAvwapAnchor');
                }}
                className={`chip-btn ${activeDrawTool === 'pickAvwapAnchor' ? 'active' : ''}`}
                style={{
                  fontSize: 9,
                  padding: '2px 6px',
                  marginLeft: -1,
                  borderTopLeftRadius: 0,
                  borderBottomLeftRadius: 0,
                  color: activeDrawTool === 'pickAvwapAnchor' ? '#fff' : (indicatorSettings.avwapColor || '#06b6d4'),
                  borderColor: indicatorSettings.avwapColor || '#06b6d4',
                  background: activeDrawTool === 'pickAvwapAnchor' ? '#06b6d4' : `${indicatorSettings.avwapColor || '#06b6d4'}33`,
                  fontWeight: 700
                }}
                title={activeDrawTool === 'pickAvwapAnchor' ? 'Çapa modu aktif: Grafikte dilediğiniz muma tıklayın!' : 'Çapa Noktasını Değiştir (Grafikte muma tıkla)'}
              >
                {activeDrawTool === 'pickAvwapAnchor' ? '🎯 Muma Tıkla...' : '🎯 Çapa'}
              </button>
            )}
          </div>

          {/* 📊 Hacim Kontrol Noktası (Volume Profile POC - En Yoğun Takas Mıknatısı) */}
          <button
            type="button"
            onClick={() => toggleIndicator('vpPoc')}
            className="chip-btn"
            style={{
              fontSize: 9.5,
              padding: '2px 7px',
              color: indicators.vpPoc ? (indicatorSettings.pocColor || '#d946ef') : (isLight ? '#64748b' : 'inherit'),
              borderColor: indicators.vpPoc ? (indicatorSettings.pocColor || '#d946ef') : (isLight ? '#cbd5e1' : 'rgba(255,255,255,0.1)'),
              background: indicators.vpPoc ? `${indicatorSettings.pocColor || '#d946ef'}26` : (isLight ? '#f1f5f9' : 'transparent'),
              fontWeight: indicators.vpPoc ? 700 : 500
            }}
            title="Hacim Profili Kontrol Noktası (POC - Ekrandaki en yoğun işlem gören fiyat mıknatısı)"
          >
            📊 POC
          </button>

          {/* 🛡️ ATR Dinamik İz Süren Stop (Trailing Stop / Chandelier Ratchet) */}
          <div style={{ display: 'inline-flex', alignItems: 'center' }}>
            <button
              type="button"
              onClick={() => toggleIndicator('trailingStop')}
              className="chip-btn"
              style={{
                fontSize: 9.5,
                padding: '2px 7px',
                color: indicators.trailingStop ? (indicatorSettings.trailingStopColor || '#f59e0b') : (isLight ? '#64748b' : 'inherit'),
                borderColor: indicators.trailingStop ? (indicatorSettings.trailingStopColor || '#f59e0b') : (isLight ? '#cbd5e1' : 'rgba(255,255,255,0.1)'),
                background: indicators.trailingStop ? `${indicatorSettings.trailingStopColor || '#f59e0b'}26` : (isLight ? '#f1f5f9' : 'transparent'),
                fontWeight: indicators.trailingStop ? 700 : 500,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 3,
                borderTopRightRadius: indicators.trailingStop ? 0 : 4,
                borderBottomRightRadius: indicators.trailingStop ? 0 : 4
              }}
              title="ATR Dinamik İz Süren Stop Eğrisi (Chandelier Exit / Kâr Kilidi)"
            >
              <Shield size={10} />
              <span>İz Süren Stop</span>
            </button>
            {indicators.trailingStop && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  cycleTrailingStopMult();
                }}
                className="chip-btn"
                style={{
                  fontSize: 9,
                  padding: '2px 6px',
                  marginLeft: -1,
                  borderTopLeftRadius: 0,
                  borderBottomLeftRadius: 0,
                  color: indicatorSettings.trailingStopColor || '#f59e0b',
                  borderColor: indicatorSettings.trailingStopColor || '#f59e0b',
                  background: `${indicatorSettings.trailingStopColor || '#f59e0b'}33`,
                  fontWeight: 800
                }}
                title="Çarpanı Hızlı Değiştir: 1.5x -> 2.0x -> 2.5x -> 3.0x -> 3.5x (veya Ayarlar'dan seçin)"
              >
                ⚡ {indicatorSettings.trailingStopMult ?? 2.5}x
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => toggleIndicator('ema20')}
            onContextMenu={(e) => {
              e.preventDefault();
              updateIndicatorSettings(prev => ({
                ...prev,
                ema1Type: prev.ema1Type === 'SMA' ? 'EMA' : 'SMA'
              }));
            }}
            className="chip-btn"
            style={{ 
              fontSize: 9.5, 
              padding: '2px 7px', 
              color: indicators.ema20 ? (indicatorSettings.ema1Color || '#ef4444') : (isLight ? '#64748b' : 'inherit'), 
              borderColor: indicators.ema20 ? (indicatorSettings.ema1Color || '#ef4444') : (isLight ? '#cbd5e1' : 'rgba(255,255,255,0.1)'),
              background: indicators.ema20 ? `${indicatorSettings.ema1Color || '#ef4444'}26` : (isLight ? '#f1f5f9' : 'transparent'),
              fontWeight: indicators.ema20 ? 700 : 500
            }}
            title={`${indicatorSettings.ema1Type || 'EMA'} 1 (${indicatorSettings.ema1Period || 20}) - Sol tık: Aç/Kapat, Sağ tık: EMA/SMA geçişi, Ayarlar: Periyot`}
          >
            {indicatorSettings.ema1Type || 'EMA'} {indicatorSettings.ema1Period || 20}
          </button>

          <button
            type="button"
            onClick={() => toggleIndicator('ema50')}
            onContextMenu={(e) => {
              e.preventDefault();
              updateIndicatorSettings(prev => ({
                ...prev,
                ema2Type: prev.ema2Type === 'SMA' ? 'EMA' : 'SMA'
              }));
            }}
            className="chip-btn"
            style={{ 
              fontSize: 9.5, 
              padding: '2px 7px', 
              color: indicators.ema50 ? (indicatorSettings.ema2Color || '#3b82f6') : (isLight ? '#64748b' : 'inherit'), 
              borderColor: indicators.ema50 ? (indicatorSettings.ema2Color || '#3b82f6') : (isLight ? '#cbd5e1' : 'rgba(255,255,255,0.1)'),
              background: indicators.ema50 ? `${indicatorSettings.ema2Color || '#3b82f6'}26` : (isLight ? '#f1f5f9' : 'transparent'),
              fontWeight: indicators.ema50 ? 700 : 500
            }}
            title={`${indicatorSettings.ema2Type || 'SMA'} 2 (${indicatorSettings.ema2Period || 50}) - Sol tık: Aç/Kapat, Sağ tık: EMA/SMA geçişi, Ayarlar: Periyot`}
          >
            {indicatorSettings.ema2Type || 'SMA'} {indicatorSettings.ema2Period || 50}
          </button>

          <button
            type="button"
            onClick={() => toggleIndicator('ema200')}
            onContextMenu={(e) => {
              e.preventDefault();
              updateIndicatorSettings(prev => ({
                ...prev,
                ema3Type: prev.ema3Type === 'SMA' ? 'EMA' : 'SMA'
              }));
            }}
            className="chip-btn"
            style={{ 
              fontSize: 9.5, 
              padding: '2px 7px', 
              color: indicators.ema200 ? (indicatorSettings.ema3Color || '#f97316') : (isLight ? '#64748b' : 'inherit'), 
              borderColor: indicators.ema200 ? (indicatorSettings.ema3Color || '#f97316') : (isLight ? '#cbd5e1' : 'rgba(255,255,255,0.1)'),
              background: indicators.ema200 ? `${indicatorSettings.ema3Color || '#f97316'}26` : (isLight ? '#f1f5f9' : 'transparent'),
              fontWeight: indicators.ema200 ? 700 : 500
            }}
            title={`${indicatorSettings.ema3Type || 'SMA'} 3 (${indicatorSettings.ema3Period || 200}) - Sol tık: Aç/Kapat, Sağ tık: EMA/SMA geçişi, Ayarlar: Periyot`}
          >
            {indicatorSettings.ema3Type || 'SMA'} {indicatorSettings.ema3Period || 200}
          </button>

          <button
            type="button"
            onClick={() => toggleIndicator('bollinger')}
            className="chip-btn"
            style={{ 
              fontSize: 9.5, 
              padding: '2px 7px', 
              color: indicators.bollinger ? '#c084fc' : (isLight ? '#64748b' : 'inherit'), 
              borderColor: indicators.bollinger ? '#c084fc' : (isLight ? '#cbd5e1' : 'rgba(255,255,255,0.1)'),
              background: indicators.bollinger ? 'rgba(192, 132, 252, 0.16)' : (isLight ? '#f1f5f9' : 'transparent'),
              fontWeight: indicators.bollinger ? 700 : 500
            }}
          >
            Bollinger
          </button>

          <button
            type="button"
            onClick={() => toggleIndicator('volume')}
            className="chip-btn"
            style={{ 
              fontSize: 9.5, 
              padding: '2px 7px', 
              color: indicators.volume ? '#38bdf8' : (isLight ? '#64748b' : 'inherit'), 
              borderColor: indicators.volume ? '#38bdf8' : (isLight ? '#cbd5e1' : 'rgba(255,255,255,0.1)'),
              background: indicators.volume ? 'rgba(56, 189, 248, 0.16)' : (isLight ? '#f1f5f9' : 'transparent'),
              fontWeight: indicators.volume ? 700 : 500
            }}
          >
            Hacim
          </button>

          <button
            type="button"
            onClick={() => toggleIndicator('rsi')}
            className="chip-btn"
            style={{ 
              fontSize: 9.5, 
              padding: '2px 7px', 
              color: indicators.rsi ? '#ec4899' : (isLight ? '#64748b' : 'inherit'), 
              borderColor: indicators.rsi ? '#ec4899' : (isLight ? '#cbd5e1' : 'rgba(255,255,255,0.1)'),
              background: indicators.rsi ? 'rgba(236, 72, 153, 0.16)' : (isLight ? '#f1f5f9' : 'transparent'),
              fontWeight: indicators.rsi ? 700 : 500
            }}
          >
            RSI ({indicatorSettings.rsiPeriod || 14})
          </button>

          <button
            type="button"
            onClick={() => toggleIndicator('rsiMa')}
            className="chip-btn"
            style={{ 
              fontSize: 9.5, 
              padding: '2px 7px', 
              color: indicators.rsiMa ? '#facc15' : (isLight ? '#64748b' : 'inherit'), 
              borderColor: indicators.rsiMa ? '#facc15' : (isLight ? '#cbd5e1' : 'rgba(255,255,255,0.1)'),
              background: indicators.rsiMa ? 'rgba(250, 204, 21, 0.15)' : (isLight ? '#f1f5f9' : 'transparent'),
              fontWeight: indicators.rsiMa ? 700 : 500
            }}
            title="RSI Hareketli Ortalaması (Varsayılan 14 SMA)"
          >
            🟡 RSI MA
          </button>

          <button
            type="button"
            onClick={() => toggleIndicator('rsiDivergence')}
            className="chip-btn"
            style={{ 
              fontSize: 9.5, 
              padding: '2px 7px', 
              color: indicators.rsiDivergence ? '#38bdf8' : (isLight ? '#64748b' : 'inherit'), 
              borderColor: indicators.rsiDivergence ? '#38bdf8' : (isLight ? '#cbd5e1' : 'rgba(255,255,255,0.1)'),
              background: indicators.rsiDivergence ? 'rgba(56, 189, 248, 0.15)' : (isLight ? '#f1f5f9' : 'transparent'),
              fontWeight: indicators.rsiDivergence ? 700 : 500
            }}
            title="Pozitif (PU) ve Negatif (NU) RSI Uyumsuzluk Tespiti ve Mum/RSI Ok Sinyalleri"
          >
            ⚡ Uyumsuzluk
          </button>

          {/* 📊 MACD (12, 26, 9) Osilatörü Alt Panel */}
          <button
            type="button"
            onClick={() => toggleIndicator('macd')}
            className="chip-btn"
            style={{
              fontSize: 9.5,
              padding: '2px 7px',
              color: indicators.macd ? '#06b6d4' : (isLight ? '#64748b' : 'inherit'),
              borderColor: indicators.macd ? '#06b6d4' : (isLight ? '#cbd5e1' : 'rgba(255,255,255,0.1)'),
              background: indicators.macd ? 'rgba(6, 182, 212, 0.18)' : (isLight ? '#f1f5f9' : 'transparent'),
              fontWeight: indicators.macd ? 700 : 500,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 3
            }}
            title="MACD (12, 26, 9) Histogram & Sinyal Çizgilerini Aç/Kapat"
          >
            <BarChart2 size={10} />
            <span>MACD</span>
          </button>

          {/* Otomatik Destek - Direnç Toggle */}
          <button
            type="button"
            onClick={() => toggleIndicator('autoSR')}
            className="chip-btn"
            style={{ 
              fontSize: 9.5, 
              padding: '2px 7px', 
              color: indicators.autoSR ? '#10b981' : (isLight ? '#64748b' : 'inherit'), 
              borderColor: indicators.autoSR ? '#10b981' : (isLight ? '#cbd5e1' : 'rgba(255,255,255,0.1)'),
              background: indicators.autoSR ? 'rgba(16, 185, 129, 0.15)' : (isLight ? '#f1f5f9' : 'transparent'),
              fontWeight: indicators.autoSR ? 700 : 500
            }}
            title="Otomatik Destek ve Direnç Seviyeleri (Pivot Kümeleri)"
          >
            🎯 Destek/Direnç
          </button>

          {/* Dinamik Otomatik Fibonacci Toggle & Hızlı Ayar Rozeti */}
          <div style={{ display: 'inline-flex', alignItems: 'center', background: isLight ? '#f1f5f9' : 'rgba(0,0,0,0.6)', borderRadius: 5, padding: '1px 2px', border: `1px solid ${indicators.autoFib ? 'rgba(56, 189, 248, 0.4)' : (isLight ? '#cbd5e1' : 'rgba(255,255,255,0.1)')}` }}>
            <button
              type="button"
              onClick={() => toggleIndicator('autoFib')}
              className="chip-btn"
              style={{ 
                fontSize: 9.5, 
                padding: '2px 7px', 
                color: indicators.autoFib ? '#38bdf8' : (isLight ? '#64748b' : 'inherit'), 
                border: 'none',
                background: indicators.autoFib ? 'rgba(56, 189, 248, 0.2)' : 'transparent',
                fontWeight: indicators.autoFib ? 700 : 500
              }}
              title="Otomatik Dinamik Fibonacci Geri Çekilme & Hedef Seviyelerini Aç/Kapat"
            >
              📐 Dinamik Fib
            </button>
            <button
              type="button"
              onClick={() => {
                setSettingsTab('fib');
                setShowSettingsModal(true);
              }}
              style={{
                background: 'transparent',
                border: 'none',
                color: indicators.autoFib ? '#38bdf8' : (isLight ? '#64748b' : 'var(--text-muted)'),
                cursor: 'pointer',
                padding: '2px 5px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderLeft: `1px solid ${isLight ? '#cbd5e1' : 'rgba(255,255,255,0.1)'}`
              }}
              title="Fibonacci Seviyelerini, Renklerini ve Kalınlıklarını Ayarla"
            >
              <Sliders size={11} />
            </button>
          </div>

          {holdingInfo && (
            <button
              type="button"
              onClick={() => toggleIndicator('costLine')}
              className="chip-btn"
              style={{ 
                fontSize: 9.5, 
                padding: '2px 7px', 
                color: indicators.costLine ? (indicatorSettings.costLineColor || '#eab308') : (isLight ? '#64748b' : 'inherit'), 
                borderColor: indicators.costLine ? (indicatorSettings.costLineColor || '#eab308') : (isLight ? '#cbd5e1' : 'rgba(255,255,255,0.1)'),
                background: indicators.costLine ? `${indicatorSettings.costLineColor || '#eab308'}26` : (isLight ? '#f1f5f9' : 'transparent'),
                fontWeight: indicators.costLine ? 700 : 500
              }}
              title="Portföy maliyet çizgisini grafikte göster/gizle"
            >
              🏷️ Maliyet Çizgisi
            </button>
          )}

          {/* ⚙️ İndikatör Ayarları Butonu */}
          <button
            type="button"
            onClick={() => {
              setSettingsTab('general');
              setShowSettingsModal(true);
            }}
            className="chip-btn"
            style={{ 
              fontSize: 9.5, 
              padding: '2px 7px', 
              color: 'var(--cyan)', 
              borderColor: 'rgba(0, 229, 255, 0.3)',
              display: 'flex',
              alignItems: 'center',
              gap: 3
            }}
            title="İndikatör Periyot ve Analiz Ayarları (RSI, EMA, Fib vb.)"
          >
            <Sliders size={11} />
            <span>Ayarlar</span>
          </button>
        </div>

        {/* Right: Çizim Araçları (Kalıcı) & Çizim Yönetimi */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          
          {/* Yatay Seviye Ekle */}
          <button
            type="button"
            onClick={() => {
              setActiveDrawTool(prev => prev === 'horizontal' ? null : 'horizontal');
              setShowDrawingsList(false);
              setTrendStartPoint(null);
              setRectStartPoint(null);
              setChannelPoints([]);
              setMeasureStartPoint(null);
            }}
            className={`chip-btn ${activeDrawTool === 'horizontal' ? 'active' : ''}`}
            style={getDrawingButtonStyles('horizontal')}
            title="Grafik üzerine tıkla ve kalıcı Destek / Direnç seviyesi yerleştir"
          >
            <Minus size={12} />
            <span>{activeDrawTool === 'horizontal' ? 'Grafiğe Tıklayın...' : '+ Yatay Seviye'}</span>
          </button>

          {/* Yatay Işın (TradingView Tarzı Sağa Uzanan Işın) */}
          <button
            type="button"
            onClick={() => {
              setActiveDrawTool(prev => prev === 'ray' ? null : 'ray');
              setShowDrawingsList(false);
              setTrendStartPoint(null);
              setRectStartPoint(null);
              setChannelPoints([]);
              setMeasureStartPoint(null);
            }}
            className={`chip-btn ${activeDrawTool === 'ray' ? 'active' : ''}`}
            style={getDrawingButtonStyles('ray')}
            title="Yatay Işın: Tıkladığınız noktadan sağa doğru yatay ışın çeker"
          >
            <ArrowRight size={12} />
            <span>{activeDrawTool === 'ray' ? 'Muma Tıklayın...' : '+ Yatay Işın'}</span>
          </button>

          {/* Trend Çizgisi */}
          <button
            type="button"
            onClick={() => {
              setActiveDrawTool(prev => prev === 'trendline' ? null : 'trendline');
              setShowDrawingsList(false);
              setTrendStartPoint(null);
              setRectStartPoint(null);
              setChannelPoints([]);
              setMeasureStartPoint(null);
            }}
            className={`chip-btn ${activeDrawTool === 'trendline' ? 'active' : ''}`}
            style={getDrawingButtonStyles('trendline')}
            title="İki noktaya tıklayarak kalıcı trend çizgisi çizin"
          >
            <TrendingUp size={12} />
            <span>
              {activeDrawTool === 'trendline' 
                ? (trendStartPoint ? 'Bitiş Noktası...' : 'Başlangıç Noktası...') 
                : '+ Trend Çizgisi'}
            </span>
          </button>

          {/* 📦 Arz-Talep / Konsolidasyon Dikdörtgeni */}
          <button
            type="button"
            onClick={() => {
              setActiveDrawTool(prev => prev === 'rectangle' ? null : 'rectangle');
              setShowDrawingsList(false);
              setTrendStartPoint(null);
              setRectStartPoint(null);
              setChannelPoints([]);
              setMeasureStartPoint(null);
            }}
            className={`chip-btn ${activeDrawTool === 'rectangle' ? 'active' : ''}`}
            style={getDrawingButtonStyles('rectangle')}
            title="Arz / Talep / Konsolidasyon Bölgesi Çiz (2 Tıkla Kutu Oluştur)"
          >
            <Square size={11} />
            <span>
              {activeDrawTool === 'rectangle'
                ? (rectStartPoint ? 'Bitiş Köşesi...' : 'Başlangıç Köşesi...')
                : '+ Bölge'}
            </span>
          </button>

          {/* 🛤️ Paralel Kanal */}
          <button
            type="button"
            onClick={() => {
              setActiveDrawTool(prev => prev === 'channel' ? null : 'channel');
              setShowDrawingsList(false);
              setTrendStartPoint(null);
              setRectStartPoint(null);
              setChannelPoints([]);
              setMeasureStartPoint(null);
            }}
            className={`chip-btn ${activeDrawTool === 'channel' ? 'active' : ''}`}
            style={getDrawingButtonStyles('channel')}
            title="Paralel Kanal (3 Tık: Taban Başlangıç, Taban Bitiş, Kanal Genişliği)"
          >
            <TrendingUp size={11} />
            <span>
              {activeDrawTool === 'channel'
                ? (channelPoints.length === 0 ? 'Taban 1. Nokta' : channelPoints.length === 1 ? 'Taban 2. Nokta' : 'Kanal Genişliği')
                : '+ Kanal'}
            </span>
          </button>

          {/* ⚓ Kullanıcı Tanımlı Tıklanabilir Çapalı VWAP */}
          <button
            type="button"
            onClick={() => {
              setActiveDrawTool(prev => prev === 'anchoredVwap' ? null : 'anchoredVwap');
              setShowDrawingsList(false);
              setTrendStartPoint(null);
              setRectStartPoint(null);
              setChannelPoints([]);
              setMeasureStartPoint(null);
            }}
            className={`chip-btn ${activeDrawTool === 'anchoredVwap' ? 'active' : ''}`}
            style={getDrawingButtonStyles('anchoredVwap')}
            title="Kullanıcı Tanımlı Çapalı VWAP: Çapa atmak istediğiniz muma tıklayın"
          >
            <Anchor size={11} />
            <span>{activeDrawTool === 'anchoredVwap' ? 'Muma Tıklayın...' : '+ Çapa VWAP'}</span>
          </button>

          {/* 📐 Ölçüm Cetveli */}
          <button
            type="button"
            onClick={() => {
              setActiveDrawTool(prev => prev === 'measure' ? null : 'measure');
              setShowDrawingsList(false);
              setTrendStartPoint(null);
              setRectStartPoint(null);
              setChannelPoints([]);
              setMeasureStartPoint(null);
            }}
            className={`chip-btn ${activeDrawTool === 'measure' ? 'active' : ''}`}
            style={getDrawingButtonStyles('measure')}
            title="Ölçüm Cetveli: İki nokta arasındaki fiyat farkı, % değişim ve bar sayısını ölçer"
          >
            <Ruler size={11} />
            <span>{activeDrawTool === 'measure' ? (measureStartPoint ? 'Bitiş Noktası...' : 'Başlangıç...') : '📐 Cetvel'}</span>
          </button>

          {/* Çizimlerim Listesi & Temizle */}
          {totalDrawingsCount > 0 && (
            <div style={{ position: 'relative' }} ref={drawingsListRef}>
              <button
                type="button"
                onClick={() => setShowDrawingsList(prev => !prev)}
                className="chip-btn"
                style={{ 
                  fontSize: 10, 
                  padding: '3px 8px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 4, 
                  background: isLight ? 'rgba(2, 132, 199, 0.12)' : 'rgba(56, 189, 248, 0.1)', 
                  borderColor: isLight ? '#0284c7' : '#38bdf8', 
                  color: isLight ? '#0284c7' : '#38bdf8',
                  fontWeight: 700 
                }}
              >
                <span>✏️ Çizimler ({totalDrawingsCount})</span>
              </button>

              {/* Çizimler Açılır Menü */}
              {showDrawingsList && (
                <div 
                  style={{ 
                    position: 'absolute', 
                    top: '100%', 
                    right: 0, 
                    marginTop: 6, 
                    width: 260, 
                    background: isLight ? '#ffffff' : '#090d1a', 
                    border: isLight ? '1px solid #cbd5e1' : '1px solid rgba(56, 189, 248, 0.35)', 
                    borderRadius: 8, 
                    padding: 8, 
                    zIndex: 9999,
                    boxShadow: isLight ? '0 10px 25px rgba(0,0,0,0.12)' : '0 10px 25px rgba(0,0,0,0.8)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, paddingBottom: 4, borderBottom: isLight ? '1px solid #e2e8f0' : '1px solid rgba(255,255,255,0.1)' }}>
                    <span style={{ fontSize: 10.5, fontWeight: 700, color: isLight ? '#0284c7' : '#38bdf8' }}>Kayıtlı Çizimler ({totalDrawingsCount})</span>
                    <button 
                      type="button" 
                      onClick={clearAllDrawings}
                      style={{ background: 'transparent', border: 'none', color: isLight ? '#dc2626' : '#f87171', fontSize: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3, fontWeight: 600 }}
                    >
                      <Trash2 size={11} />
                      <span>Tümünü Sil</span>
                    </button>
                  </div>

                  <div style={{ maxHeight: 220, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {drawings.horizontals.map(h => (
                      <div key={h.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: isLight ? '#f8fafc' : 'rgba(255,255,255,0.03)', border: isLight ? '1px solid #e2e8f0' : 'none', padding: '4px 6px', borderRadius: 4, fontSize: 10 }}>
                        <span style={{ color: isLight ? '#1e293b' : '#cbd5e1' }}>Yatay: <strong>{h.price}</strong></span>
                        <button type="button" onClick={() => deleteHorizontal(h.id)} style={{ background: 'transparent', border: 'none', color: isLight ? '#dc2626' : '#f87171', cursor: 'pointer' }}>
                          <X size={12} />
                        </button>
                      </div>
                    ))}

                    {(drawings.rays || []).map(r => (
                      <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: isLight ? '#f8fafc' : 'rgba(255,255,255,0.03)', border: isLight ? '1px solid #e2e8f0' : 'none', padding: '4px 6px', borderRadius: 4, fontSize: 10 }}>
                        <span style={{ color: isLight ? '#1e293b' : '#cbd5e1' }}>Işın: <strong>{r.price}</strong></span>
                        <button type="button" onClick={() => deleteRay(r.id)} style={{ background: 'transparent', border: 'none', color: isLight ? '#dc2626' : '#f87171', cursor: 'pointer' }}>
                          <X size={12} />
                        </button>
                      </div>
                    ))}

                    {drawings.trendlines.map(t => (
                      <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: isLight ? '#f8fafc' : 'rgba(255,255,255,0.03)', border: isLight ? '1px solid #e2e8f0' : 'none', padding: '4px 6px', borderRadius: 4, fontSize: 10 }}>
                        <span style={{ color: isLight ? '#1e293b' : '#cbd5e1' }}>Trend: {t.p1.price} ➔ {t.p2.price}</span>
                        <button type="button" onClick={() => deleteTrendline(t.id)} style={{ background: 'transparent', border: 'none', color: isLight ? '#dc2626' : '#f87171', cursor: 'pointer' }}>
                          <X size={12} />
                        </button>
                      </div>
                    ))}

                    {(drawings.rectangles || []).map(rect => (
                      <div key={rect.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: isLight ? '#f8fafc' : 'rgba(255,255,255,0.03)', border: isLight ? '1px solid #e2e8f0' : 'none', padding: '4px 6px', borderRadius: 4, fontSize: 10 }}>
                        <span style={{ color: isLight ? '#1e293b' : '#cbd5e1' }}>Bölge: {rect.p1.price} - {rect.p2.price}</span>
                        <button type="button" onClick={() => deleteRectangle(rect.id)} style={{ background: 'transparent', border: 'none', color: isLight ? '#dc2626' : '#f87171', cursor: 'pointer' }}>
                          <X size={12} />
                        </button>
                      </div>
                    ))}

                    {(drawings.channels || []).map(ch => (
                      <div key={ch.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: isLight ? '#f8fafc' : 'rgba(255,255,255,0.03)', border: isLight ? '1px solid #e2e8f0' : 'none', padding: '4px 6px', borderRadius: 4, fontSize: 10 }}>
                        <span style={{ color: isLight ? '#1e293b' : '#cbd5e1' }}>Kanal: {ch.p1.price} ➔ {ch.p2.price}</span>
                        <button type="button" onClick={() => deleteChannel(ch.id)} style={{ background: 'transparent', border: 'none', color: isLight ? '#dc2626' : '#f87171', cursor: 'pointer' }}>
                          <X size={12} />
                        </button>
                      </div>
                    ))}

                    {(drawings.anchoredVwaps || []).map(av => (
                      <div key={av.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: isLight ? '#f8fafc' : 'rgba(255,255,255,0.03)', border: isLight ? '1px solid #e2e8f0' : 'none', padding: '4px 6px', borderRadius: 4, fontSize: 10 }}>
                        <span style={{ color: isLight ? '#1e293b' : '#cbd5e1' }}>Çapa VWAP: {formatAvwapTime(av.time, chartInterval) || av.time}</span>
                        <button type="button" onClick={() => deleteAnchoredVwap(av.id)} style={{ background: 'transparent', border: 'none', color: isLight ? '#dc2626' : '#f87171', cursor: 'pointer' }}>
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 📷 Fotoğraf / Ekran Alıntısı (Snapshot) */}
          <button
            type="button"
            onClick={handleTakeScreenshot}
            className="chip-btn"
            style={{ 
              fontSize: 10, 
              padding: '3px 8px', 
              color: isLight ? '#0284c7' : 'var(--cyan)', 
              borderColor: isLight ? '#cbd5e1' : 'rgba(0, 229, 255, 0.4)',
              background: isLight ? '#ffffff' : 'rgba(0, 229, 255, 0.08)',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              fontWeight: 600
            }}
            title="Tek tıkla grafik görüntüsünü indir ve panoya kopyala"
          >
            <Camera size={11} />
            <span>Fotoğraf</span>
          </button>

          {/* ⊞ Çoklu Zaman Dilimi (Çift Grafik / Split-Screen) */}
          <button
            type="button"
            onClick={() => {
              setSplitView(prev => {
                const next = !prev;
                try { localStorage.setItem('terminal_split_view', String(next)); } catch (e) {}
                return next;
              });
            }}
            className={`chip-btn ${splitView ? 'active' : ''}`}
            style={{ 
              fontSize: 10, 
              padding: '3px 8px', 
              color: splitView ? '#10b981' : (isLight ? '#64748b' : 'var(--text-muted)'), 
              borderColor: splitView ? '#10b981' : (isLight ? '#cbd5e1' : 'rgba(255,255,255,0.15)'),
              background: splitView ? 'rgba(16, 185, 129, 0.16)' : (isLight ? '#ffffff' : 'transparent'),
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              fontWeight: splitView ? 700 : 500
            }}
            title="Çoklu Zaman Dilimi: İki periyodu yan yana aynı ekranda karşılaştırın (Örn: 1G ve 4S)"
          >
            <Columns size={11} />
            <span>{splitView ? '⊞ Çift (Açık)' : '⊞ Çift Görünüm'}</span>
          </button>

          {/* İzleme Listesi Göster / Gizle Toggle Butonu */}
          {onToggleSidebar && (
            <button
              type="button"
              onClick={onToggleSidebar}
              className={`chip-btn ${sidebarOpen ? 'active' : ''}`}
              style={{ 
                fontSize: 10, 
                padding: '3px 8px', 
                color: sidebarOpen ? (isLight ? '#0284c7' : 'var(--cyan)') : (isLight ? '#334155' : 'var(--text-muted)'), 
                borderColor: sidebarOpen ? (isLight ? '#0284c7' : 'var(--cyan)') : (isLight ? '#cbd5e1' : 'rgba(255,255,255,0.1)'),
                background: sidebarOpen ? (isLight ? 'rgba(2, 132, 199, 0.12)' : 'rgba(0, 229, 255, 0.12)') : (isLight ? '#ffffff' : 'transparent'),
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                fontWeight: 600
              }}
              title={sidebarOpen ? 'İzleme Listesini Gizle (Tam Boy Grafik)' : 'İzleme Listesini Aç'}
            >
              <List size={12} />
              <span>Liste</span>
            </button>
          )}

          {/* Görünüm ve Sağ Marj Sıfırlama Butonu */}
          <button
            type="button"
            onClick={handleResetView}
            className="chip-btn"
            style={{ 
              fontSize: 10, 
              padding: '3px 8px', 
              color: isLight ? '#334155' : 'var(--text-muted)', 
              borderColor: isLight ? '#cbd5e1' : 'rgba(255,255,255,0.1)',
              background: isLight ? '#ffffff' : 'transparent',
              display: 'flex', 
              alignItems: 'center', 
              gap: 3,
              fontWeight: 500
            }}
            title="Grafik yakınlaştırmasını ve sağ boşluk marjını standart görünüme sıfırla"
          >
            <RotateCcw size={11} />
            <span>Sıfırla</span>
          </button>

          {/* Tam Ekran Toggle */}
          {onToggleFullscreen && (
            <button
              type="button"
              onClick={onToggleFullscreen}
              className="chip-btn"
              style={{ 
                fontSize: 10, 
                padding: '3px 8px', 
                color: isLight ? '#0284c7' : 'var(--cyan)', 
                borderColor: isLight ? '#cbd5e1' : 'var(--cyan)',
                background: isLight ? '#ffffff' : 'transparent'
              }}
              title={isFullscreen ? 'Tam Ekrandan Çık' : 'Tam Ekrana Geç'}
            >
              {isFullscreen ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
            </button>
          )}

          {/* ☀️ / 🌙 Açık - Koyu Tema Toggle Butonu */}
          <button
            type="button"
            onClick={handleToggleTheme}
            className="chip-btn"
            style={{ 
              fontSize: 10, 
              padding: '3px 8px', 
              color: isLight ? '#d97706' : '#fbbf24', 
              borderColor: isLight ? '#fcd34d' : 'rgba(251, 191, 36, 0.35)',
              background: isLight ? 'rgba(245, 158, 11, 0.12)' : 'rgba(251, 191, 36, 0.08)',
              display: 'flex', 
              alignItems: 'center', 
              gap: 4,
              fontWeight: 600
            }}
            title={isLight ? 'Koyu Temaya Geç (Bloomberg Dark)' : 'Açık Temaya Geç (TradingView Light)'}
          >
            {isLight ? <Moon size={11} /> : <Sun size={11} />}
            <span>{isLight ? '🌙 Koyu' : '☀️ Açık'}</span>
          </button>
        </div>
      </div>

      {/* 🏷️ PORTFOLIO POSITION BANNER (If stock is held in user portfolio) */}
      {holdingInfo && indicators.costLine && (
        <div 
          style={{ 
            background: isLight 
              ? (holdingInfo.isProfit ? '#ecfdf5' : '#fef2f2') 
              : (holdingInfo.isProfit ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)'), 
            borderBottom: isLight 
              ? (holdingInfo.isProfit ? '1px solid #a7f3d0' : '1px solid #fecaca') 
              : `1px solid ${holdingInfo.isProfit ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
            padding: '5px 14px', 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            fontSize: 11,
            fontWeight: 600
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ color: indicatorSettings.costLineColor || '#eab308' }}>💼 PORTFÖYÜNÜZDE:</span>
            <span style={{ color: isLight ? '#0f172a' : '#f8fafc' }}>{holdingInfo.shares} Adet / Lot</span>
            <span style={{ color: isLight ? '#64748b' : '#94a3b8' }}>•</span>
            <span style={{ color: isLight ? '#0f172a' : '#f8fafc' }}>
              Maliyet: <strong style={{ color: indicatorSettings.costLineColor || '#eab308' }}>{holdingInfo.symMark}{holdingInfo.cost.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
              {holdingInfo.symMark === '$' && holdingInfo.altCostTRY > 0 && (
                <span style={{ fontSize: 9.5, color: isLight ? '#64748b' : '#94a3b8', marginLeft: 4 }}>
                  ({holdingInfo.altCostTRY.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} ₺)
                </span>
              )}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ color: holdingInfo.isProfit ? '#10b981' : '#ef4444' }}>
              Pozisyon K/Z: <strong>{holdingInfo.isProfit ? '+' : ''}{holdingInfo.pnlPct.toFixed(2)}%</strong> ({holdingInfo.symMark}{holdingInfo.pnlVal.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
            </span>
            {onOpenAddModal && (
              <button
                type="button"
                onClick={() => onOpenAddModal(cleanTicker)}
                className="chip-btn"
                style={{ fontSize: 9.5, padding: '2px 8px', background: isLight ? '#e2e8f0' : 'rgba(255,255,255,0.06)', color: isLight ? '#0f172a' : 'inherit' }}
              >
                + Alım Ekle
              </button>
            )}
          </div>
        </div>
      )}

      {/* 📈 REAL-TIME HOVER HUD BAR */}
      <div 
        style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          padding: '6px 14px', 
          background: isLight ? '#ffffff' : 'rgba(4, 7, 17, 0.98)', 
          borderBottom: isLight ? '1px solid #e2e8f0' : '1px solid rgba(255, 255, 255, 0.05)',
          fontSize: 11,
          fontFamily: 'monospace'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 800, color: isLight ? '#0284c7' : 'var(--cyan)', fontSize: 13 }}>
            {cleanTicker || symbol}
          </span>

          <span className="nav-badge cyan" style={{ fontSize: 9.5, padding: '1px 6px' }}>
            {chartInterval}
          </span>

          {['TOTAL', 'TOTAL2', 'TOTAL3', 'OTHERS', 'TOTALDEFI'].includes((cleanTicker || symbol || '').toUpperCase()) && (
            <span className="nav-badge amber" style={{ fontSize: 9.5, padding: '1px 7px', background: 'rgba(245, 158, 11, 0.2)', border: '1px solid #f59e0b', color: '#fcd34d' }}>
              ⚡ SENTEZ PİYASA DEĞERİ (BTC & ETH Proxy)
            </span>
          )}

          {candleType === 'heikin_ashi' && (
            <span className="nav-badge" style={{ fontSize: 9.5, padding: '1px 6px', background: 'rgba(168, 85, 247, 0.2)', color: '#c084fc', border: '1px solid rgba(168, 85, 247, 0.4)' }}>
              HEIKIN ASHI
            </span>
          )}

          {indicators.kama && latestKamaState && (
            <span
              className="nav-badge"
              style={{
                fontSize: 9.5,
                padding: '1px 7px',
                background: `${latestKamaState.color}22`,
                color: latestKamaState.color,
                border: `1px solid ${latestKamaState.color}77`,
                fontWeight: 700
              }}
              title={`Adaptif KAMA: ${latestKamaState.value} • Renk Değişim / Stop Eşiği: ${latestKamaState.stopLevel} • Verimlilik (ER): %${latestKamaState.er}`}
            >
              {latestKamaState.regime === 1 ? '🟢' : '🔴'} KAMA ({latestKamaState.value}): {latestKamaState.label} • Stop Eşiği: {latestKamaState.stopLevel}
            </span>
          )}

          {indicators.kama && mtfKamaState && (
            <span
              className="nav-badge"
              style={{
                fontSize: 9.5,
                padding: '1px 7px',
                background: isLight ? '#f1f5f9' : 'rgba(15, 23, 42, 0.85)',
                color: mtfKamaState.decisionColor,
                border: `1px solid ${mtfKamaState.decisionColor}66`,
                fontWeight: 700
              }}
              title={`Çoklu Zaman Dilimi (MTF) KAMA Trend Uyumu: ${mtfKamaState.decisionText}`}
            >
              🧭 {mtfKamaState.shortLabel}:{mtfKamaState.shortDir === 1 ? '🟢' : '🔴'} | {mtfKamaState.mainLabel}:{mtfKamaState.mainDir === 1 ? '🟢' : '🔴'} | {mtfKamaState.macroLabel}:{mtfKamaState.macroDir === 1 ? '🟢' : '🔴'} • {mtfKamaState.decisionText}
            </span>
          )}

          {/* ⚡ 24 RSI & 55 SMA Trend HO HUD Rozeti */}
          {indicators.trendMa55 && latestTrendMaState && (
            <span
              className="nav-badge"
              style={{
                fontSize: 9.5,
                padding: '1px 8px',
                background: `${latestTrendMaState.color}22`,
                color: latestTrendMaState.color,
                border: `1px solid ${latestTrendMaState.color}77`,
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5
              }}
              title={`55 HO Değeri: ${latestTrendMaState.value} • Son Kapanış: ${latestTrendMaState.close} (${latestTrendMaState.diffPercent >= 0 ? '+' : ''}${latestTrendMaState.diffPercent}%) • 2-Bar Teyitli Trend: ${latestTrendMaState.label}\nRSI(24): ${latestTrendMaState.rsi} • RSI SMA(55): ${latestTrendMaState.rsiMa || '-'} (${latestTrendMaState.rsiConfirmed ? 'Momentum Trendi Destekliyor' : 'Momentum Zayıf'})`}
            >
              <span>{latestTrendMaState.trend === 1 ? '🟢' : '🔴'} 55 HO ({latestTrendMaState.value}): {latestTrendMaState.label}</span>
              <span style={{ opacity: 0.6 }}>|</span>
              <span style={{ color: latestTrendMaState.rsiConfirmed ? latestTrendMaState.color : '#f59e0b' }}>
                RSI(24): {latestTrendMaState.rsi} {latestTrendMaState.rsiMa ? `(SMA55: ${latestTrendMaState.rsiMa})` : ''}
              </span>
            </span>
          )}

          {indicators.avwap && latestAvwapState && (() => {
            const anchorShortType = latestAvwapState.anchorType
              ? latestAvwapState.anchorType
                  .replace(/\s*\(Swing .*?\)/i, '')
                  .replace(/\s*\((Destek|Direnç|Manuel)\)/i, '')
                  .replace(/^Sabit\s+/i, '')
                  .trim()
              : 'Çapa';
            const anchorDateShort = formatAvwapTime(latestAvwapState.anchorTime, chartInterval, false);
            const anchorDateFull = formatAvwapTime(latestAvwapState.anchorTime, chartInterval, true);
            const anchorPriceStr = formatAvwapPriceExact(latestAvwapState.anchorPrice);
            const barInfo = latestAvwapState.barCount ? ` (${latestAvwapState.barCount} bar)` : '';
            const reasonLine = latestAvwapState.decisionReason ? `\nKarar: ${latestAvwapState.decisionReason}` : '';
            return (
              <span
                className="nav-badge"
                style={{
                  fontSize: 9.5,
                  padding: '1px 7px',
                  background: `${indicatorSettings.avwapColor || '#06b6d4'}22`,
                  color: indicatorSettings.avwapColor || '#06b6d4',
                  border: `1px solid ${indicatorSettings.avwapColor || '#06b6d4'}66`,
                  fontWeight: 700
                }}
                title={`Çapalı Kurumsal Maliyet (${latestAvwapState.anchorType || 'AVWAP'}): ${latestAvwapState.value}\nÇapa Tarihi: ${anchorDateFull}${barInfo}\nÇapa Seviyesi: ${anchorPriceStr}${reasonLine}`}
              >
                ⚓ AVWAP ({anchorShortType}{anchorDateShort ? ` • ${anchorDateShort}` : ''}{anchorPriceStr ? ` @ ${anchorPriceStr}` : ''}): {latestAvwapState.value}
              </span>
            );
          })()}

          {indicators.vpPoc && latestPocState && (
            <span
              className="nav-badge"
              style={{
                fontSize: 9.5,
                padding: '1px 7px',
                background: `${indicatorSettings.pocColor || '#d946ef'}22`,
                color: indicatorSettings.pocColor || '#d946ef',
                border: `1px solid ${indicatorSettings.pocColor || '#d946ef'}66`,
                fontWeight: 700
              }}
              title={`En Yoğun Hacim Takas Seviyesi (POC): ${latestPocState.poc} • Değer Alanı (VA): ${latestPocState.val} - ${latestPocState.vah}`}
            >
              📊 POC: {latestPocState.poc} ({latestPocState.isAbovePoc ? 'Üzerinde 🟢' : 'Altında 🔴'})
            </span>
          )}

          {indicators.trailingStop && latestTrailingStopState && (
            <span
              className="nav-badge"
              style={{
                fontSize: 9.5,
                padding: '1px 7px',
                background: 'rgba(245, 158, 11, 0.18)',
                color: '#f59e0b',
                border: '1px solid rgba(245, 158, 11, 0.5)',
                fontWeight: 700
              }}
              title={`ATR Dinamik İz Süren Stop: ${latestTrailingStopState.value} • Trend: ${latestTrailingStopState.trend === 1 ? 'Boğa / Altta' : 'Ayı / Üstte'}`}
            >
              🛡️ Stop: {latestTrailingStopState.value} ({latestTrailingStopState.distPct >= 0 ? '+' : ''}{latestTrailingStopState.distPct.toFixed(1)}%)
            </span>
          )}

          {displayBar && (
            <>
              <span style={{ color: isLight ? '#64748b' : '#94a3b8' }}>A: <strong style={{ color: isLight ? '#0f172a' : '#e2e8f0' }}>{displayBar.open?.toFixed(2)}</strong></span>
              <span style={{ color: isLight ? '#64748b' : '#94a3b8' }}>Y: <strong style={{ color: '#10b981' }}>{displayBar.high?.toFixed(2)}</strong></span>
              <span style={{ color: isLight ? '#64748b' : '#94a3b8' }}>D: <strong style={{ color: '#ef4444' }}>{displayBar.low?.toFixed(2)}</strong></span>
              <span style={{ color: isLight ? '#64748b' : '#94a3b8' }}>K: <strong style={{ color: barChangePct >= 0 ? '#10b981' : '#ef4444' }}>{displayBar.close?.toFixed(2)}</strong></span>
              <span style={{ color: barChangePct >= 0 ? '#10b981' : '#ef4444', fontWeight: 700 }}>
                {barChangePct >= 0 ? '+' : ''}{barChangePct.toFixed(2)}%
              </span>
              {displayBar.volume > 0 && (
                <span style={{ color: isLight ? '#64748b' : '#94a3b8' }}>Hacim: <strong style={{ color: isLight ? '#0284c7' : '#38bdf8' }}>{displayBar.volume.toLocaleString('tr-TR')}</strong></span>
              )}
            </>
          )}
        </div>

        {/* Drawing Mode Hint */}
        {activeDrawTool && (
          <div style={{ 
            color: isLight ? '#0369a1' : '#38bdf8', 
            fontSize: 10, 
            display: 'flex', 
            alignItems: 'center', 
            gap: 6,
            background: isLight ? '#e0f2fe' : 'rgba(56, 189, 248, 0.1)',
            padding: '2px 8px',
            borderRadius: 4,
            border: isLight ? '1px solid #7dd3fc' : '1px solid rgba(56, 189, 248, 0.25)',
            fontWeight: 600
          }}>
            <span>✏️ Çizim Modu: {
              activeDrawTool === 'horizontal' 
                ? 'İstediğiniz seviyeye tıklayın' 
                : activeDrawTool === 'ray'
                  ? 'Işının başlayacağı muma tıklayın'
                  : activeDrawTool === 'trendline'
                    ? (trendStartPoint ? 'Bitiş noktasına tıklayın' : 'Başlangıç noktasına tıklayın')
                    : activeDrawTool === 'rectangle'
                      ? (rectStartPoint ? 'Bölgenin bitiş köşesine tıklayın' : 'Bölgenin başlangıç köşesine tıklayın')
                      : activeDrawTool === 'channel'
                        ? (channelPoints.length === 0 ? 'Kanal taban 1. noktasına tıklayın' : channelPoints.length === 1 ? 'Kanal taban 2. noktasına tıklayın' : 'Kanal genişliği için 3. noktaya tıklayın')
                        : activeDrawTool === 'anchoredVwap'
                          ? 'Çapa atmak istediğiniz muma tıklayın'
                          : activeDrawTool === 'pickAvwapAnchor'
                            ? '⚓ AVWAP Çapası: Kurumsal hacim maliyet eğrisinin başlayacağı muma tıklayın'
                            : (measureStartPoint ? 'Ölçüm bitiş noktasına tıklayın' : 'Ölçüm başlangıç noktasına tıklayın')
            }</span>
            <button 
              type="button" 
              onClick={() => { 
                setActiveDrawTool(null); 
                setTrendStartPoint(null); 
                setRectStartPoint(null);
                setChannelPoints([]);
                setMeasureStartPoint(null);
                setMousePreviewPoint(null); 
              }}
              style={{ background: 'transparent', border: 'none', color: isLight ? '#dc2626' : '#f87171', cursor: 'pointer', padding: 0, fontWeight: 700 }}
            >
              (İptal)
            </button>
          </div>
        )}
      </div>

      {/* 📷 Screenshot Success Toast Banner */}
      {screenshotToast && (
        <div style={{
          position: 'fixed',
          top: 18,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 999999,
          background: isLight ? '#0284c7' : 'rgba(0, 229, 255, 0.95)',
          color: isLight ? '#ffffff' : '#040711',
          padding: '8px 18px',
          borderRadius: 8,
          fontSize: 12,
          fontWeight: 700,
          boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          animation: 'fadeIn 0.2s ease-in-out'
        }}>
          <Check size={16} />
          <span>{screenshotToast}</span>
        </div>
      )}

      {/* 📊 MAIN CHART & SPLIT SCREEN CONTAINER */}
      <div style={{ display: 'flex', flex: 1, width: '100%', minHeight: 350, overflow: 'hidden' }}>
        {/* Primary Chart Canvas Wrapper + SVG Overlay */}
        <div 
          style={{ 
            position: 'relative', 
            flex: 1, 
            width: splitView ? '50%' : '100%', 
            height: '100%',
            minHeight: 350, 
            cursor: activeDrawTool ? 'crosshair' : (dragHandleState ? 'grabbing' : 'default'),
            overflow: 'hidden',
            borderRight: splitView ? (isLight ? '2px solid #cbd5e1' : '2px solid rgba(56, 189, 248, 0.3)') : 'none'
          }}
          onClick={handleChartClick}
          onMouseMove={handleMouseMove}
          onPointerUp={handleEndpointPointerUp}
      >
        {/* Loading Spinner */}
        {isLoading && (
          <div 
            style={{ 
              position: 'absolute', 
              inset: 0, 
              background: 'rgba(4, 7, 17, 0.85)', 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              justifyContent: 'center', 
              zIndex: 30,
              gap: 10 
            }}
          >
            <div className="spinner" />
            <span style={{ fontSize: 12, color: 'var(--cyan)', fontWeight: 600 }}>
              {cleanTicker || symbol} verileri yükleniyor...
            </span>
          </div>
        )}

        {/* Load Error Retry Box */}
        {loadError && !isLoading && (
          <div 
            style={{ 
              position: 'absolute', 
              inset: 0, 
              background: 'rgba(4, 7, 17, 0.95)', 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              justifyContent: 'center', 
              zIndex: 30,
              gap: 12 
            }}
          >
            <span style={{ fontSize: 13, color: '#f87171', fontWeight: 600 }}>{loadError}</span>
            <button
              type="button"
              onClick={fetchSymbolCandles}
              className="btn-primary"
              style={{ fontSize: 11, padding: '5px 12px' }}
            >
              Yeniden Dene
            </button>
          </div>
        )}

        {/* Lightweight Charts Canvas Root */}
        <div ref={chartContainerRef} style={{ width: '100%', height: '100%' }} />

        {/* Interactive SVG Overlay for Trendlines */}
        <svg
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            pointerEvents: dragHandleState ? 'all' : 'none',
            zIndex: 15
          }}
          onPointerMove={handleEndpointPointerMove}
          onPointerUp={handleEndpointPointerUp}
        >
          {/* Render Persistent Trendlines */}
          {svgTrendlines.map(t => {
            if (!t.valid) return null;
            const isDraggingP1 = dragHandleState?.lineId === t.id && dragHandleState?.point === 'p1';
            const isDraggingP2 = dragHandleState?.lineId === t.id && dragHandleState?.point === 'p2';
            const isLineActive = dragHandleState?.lineId === t.id;
            
            const x1 = isDraggingP1 ? dragHandleState.curX : t.x1;
            const y1 = isDraggingP1 ? dragHandleState.curY : t.y1;
            const x2 = isDraggingP2 ? dragHandleState.curX : t.x2;
            const y2 = isDraggingP2 ? dragHandleState.curY : t.y2;
            const isSelected = selectedTrendlineId === t.id || isLineActive;
            const color = t.color || '#38bdf8';

            return (
              <g key={t.id}>
                {/* Wide invisible click target for the line body to select/highlight */}
                <line
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="transparent"
                  strokeWidth={14}
                  style={{ cursor: 'pointer', pointerEvents: 'stroke' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedTrendlineId(prev => prev === t.id ? null : t.id);
                    setSelectedRayId(null);
                    setSelectedRectId(null);
                    setSelectedChannelId(null);
                    setSelectedAnchoredVwapId(null);
                    setSelectedHorizontalId(null);
                  }}
                />

                {/* Visible Trendline */}
                <line
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke={color}
                  strokeWidth={isSelected ? 3 : 2}
                  strokeLinecap="round"
                  strokeDasharray={isLineActive ? '4 2' : undefined}
                  style={{ pointerEvents: 'none' }}
                />

                {/* Point A Handle (P1) - Draggable */}
                <g
                  style={{ cursor: isDraggingP1 ? 'grabbing' : 'grab', pointerEvents: 'all' }}
                  onPointerDown={(e) => handleEndpointPointerDown(e, t.id, 'p1')}
                  onMouseEnter={() => setHoveredHandle({ lineId: t.id, point: 'p1' })}
                  onMouseLeave={() => setHoveredHandle(null)}
                >
                  {/* Large invisible hit area (16px radius) so it's super easy to grab on touchpad/mouse */}
                  <circle cx={x1} cy={y1} r={16} fill="transparent" />
                  
                  {/* Outer selection / hover glow ring */}
                  {(isSelected || (hoveredHandle?.lineId === t.id && hoveredHandle?.point === 'p1')) && (
                    <circle
                      cx={x1}
                      cy={y1}
                      r={isDraggingP1 ? 11 : 9}
                      fill="none"
                      stroke={color}
                      strokeWidth={2}
                      opacity={0.8}
                    />
                  )}

                  {/* Main Handle Circle */}
                  <circle
                    cx={x1}
                    cy={y1}
                    r={isDraggingP1 ? 6.5 : (isSelected ? 5.5 : 4.5)}
                    fill={isDraggingP1 ? '#00e5ff' : '#ffffff'}
                    stroke={color}
                    strokeWidth={2}
                  />
                </g>

                {/* Point B Handle (P2) - Draggable */}
                <g
                  style={{ cursor: isDraggingP2 ? 'grabbing' : 'grab', pointerEvents: 'all' }}
                  onPointerDown={(e) => handleEndpointPointerDown(e, t.id, 'p2')}
                  onMouseEnter={() => setHoveredHandle({ lineId: t.id, point: 'p2' })}
                  onMouseLeave={() => setHoveredHandle(null)}
                >
                  {/* Large invisible hit area (16px radius) */}
                  <circle cx={x2} cy={y2} r={16} fill="transparent" />
                  
                  {/* Outer selection / hover glow ring */}
                  {(isSelected || (hoveredHandle?.lineId === t.id && hoveredHandle?.point === 'p2')) && (
                    <circle
                      cx={x2}
                      cy={y2}
                      r={isDraggingP2 ? 11 : 9}
                      fill="none"
                      stroke={color}
                      strokeWidth={2}
                      opacity={0.8}
                    />
                  )}

                  {/* Main Handle Circle */}
                  <circle
                    cx={x2}
                    cy={y2}
                    r={isDraggingP2 ? 6.5 : (isSelected ? 5.5 : 4.5)}
                    fill={isDraggingP2 ? '#00e5ff' : '#ffffff'}
                    stroke={color}
                    strokeWidth={2}
                  />
                </g>

                {/* Floating Mini Action Bar for Selected Trendline */}
                {isSelected && !dragHandleState && (
                  <foreignObject
                    x={Math.max(10, Math.min((chartContainerRef.current?.clientWidth || 800) - 170, (x1 + x2) / 2 - 80))}
                    y={Math.max(10, Math.min(y1, y2) - 36)}
                    width={170}
                    height={32}
                    style={{ overflow: 'visible', pointerEvents: 'all' }}
                  >
                    <div style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      background: isLight ? '#ffffff' : 'rgba(8, 12, 24, 0.96)',
                      border: isLight ? '1px solid #0284c7' : '1px solid rgba(0, 229, 255, 0.4)',
                      borderRadius: 6,
                      padding: '3px 8px',
                      boxShadow: isLight ? '0 4px 16px rgba(0,0,0,0.18)' : '0 4px 16px rgba(0,0,0,0.7)',
                      fontSize: 10,
                      fontFamily: 'monospace',
                      color: isLight ? '#0f172a' : '#fff',
                      userSelect: 'none'
                    }}>
                      <span style={{ color: isLight ? '#0284c7' : 'var(--cyan)', fontWeight: 700 }}>Trend</span>
                      {/* Color Palette Chips */}
                      {['#38bdf8', '#10b981', '#f59e0b', '#ef4444', '#a855f7'].map(c => (
                        <span
                          key={c}
                          onClick={(ev) => {
                            ev.stopPropagation();
                            const updated = (drawings.trendlines || []).map(item => item.id === t.id ? { ...item, color: c } : item);
                            saveDrawings({ ...drawings, trendlines: updated });
                          }}
                          style={{
                            width: 10,
                            height: 10,
                            borderRadius: '50%',
                            background: c,
                            cursor: 'pointer',
                            boxSizing: 'border-box',
                            border: color === c ? (isLight ? '2px solid #0f172a' : '2px solid #fff') : (isLight ? '1px solid rgba(0,0,0,0.2)' : '1px solid rgba(255,255,255,0.2)')
                          }}
                          title="Renk Değiştir"
                        />
                      ))}
                      {/* Quick Delete */}
                      <span
                        onClick={(ev) => {
                          ev.stopPropagation();
                          deleteTrendline(t.id);
                          setSelectedTrendlineId(null);
                        }}
                        style={{
                          cursor: 'pointer',
                          color: isLight ? '#dc2626' : '#ef4444',
                          fontWeight: 800,
                          padding: '0 4px',
                          borderRadius: 3,
                          background: isLight ? '#fee2e2' : 'rgba(239, 68, 68, 0.15)'
                        }}
                        title="Çizgiyi Sil (veya klavyeden Delete tuşuna basın)"
                      >
                        ✕
                      </span>
                    </div>
                  </foreignObject>
                )}

                {/* Live Price Tag HUD during Handle Dragging */}
                {(isDraggingP1 || isDraggingP2) && dragHandleState?.curPrice && (
                  <foreignObject
                    x={(isDraggingP1 ? x1 : x2) + 12}
                    y={(isDraggingP1 ? y1 : y2) - 14}
                    width={130}
                    height={28}
                    style={{ overflow: 'visible', pointerEvents: 'none' }}
                  >
                    <div style={{
                      background: isLight ? '#0284c7' : 'rgba(0, 229, 255, 0.95)',
                      color: isLight ? '#ffffff' : '#06080e',
                      padding: '2px 8px',
                      borderRadius: 4,
                      fontSize: 11,
                      fontWeight: 800,
                      fontFamily: 'monospace',
                      boxShadow: isLight ? '0 4px 12px rgba(2, 132, 199, 0.35)' : '0 4px 12px rgba(0,0,0,0.6)',
                      whiteSpace: 'nowrap'
                    }}>
                      {isDraggingP1 ? 'A: ' : 'B: '}
                      {isBist ? `₺${dragHandleState.curPrice}` : `$${dragHandleState.curPrice}`}
                    </div>
                  </foreignObject>
                )}
              </g>
            );
          })}

          {/* Render Persistent Horizontal Lines (Yatay Destek / Direnç Çizgileri - Tıklanabilir & Silinebilir) */}
          {svgHorizontals.map(h => {
            if (!h.valid) return null;
            const isSelected = selectedHorizontalId === h.id;
            const color = h.color || '#38bdf8';
            const x2 = chartContainerRef.current?.clientWidth || 800;

            return (
              <g key={h.id}>
                {/* Wide invisible click target for selection across full width */}
                <line
                  x1={0}
                  y1={h.y}
                  x2={x2}
                  y2={h.y}
                  stroke="transparent"
                  strokeWidth={14}
                  style={{ cursor: 'pointer', pointerEvents: 'stroke' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedHorizontalId(prev => prev === h.id ? null : h.id);
                    setSelectedTrendlineId(null);
                    setSelectedRayId(null);
                    setSelectedRectId(null);
                    setSelectedChannelId(null);
                    setSelectedAnchoredVwapId(null);
                  }}
                />

                {/* Visible Highlight Line when Selected */}
                {isSelected && (
                  <line
                    x1={0}
                    y1={h.y}
                    x2={x2}
                    y2={h.y}
                    stroke={color}
                    strokeWidth={3}
                    strokeDasharray="6 3"
                    style={{ pointerEvents: 'none', filter: `drop-shadow(0 0 5px ${color})` }}
                  />
                )}

                {/* Floating Mini Action Bar when Horizontal Line is Selected */}
                {isSelected && !dragHandleState && (
                  <foreignObject
                    x={Math.max(10, Math.min(x2 - 180, 40))}
                    y={Math.max(10, h.y - 36)}
                    width={180}
                    height={32}
                    style={{ overflow: 'visible', pointerEvents: 'all' }}
                  >
                    <div style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      background: isLight ? '#ffffff' : 'rgba(8, 12, 24, 0.96)',
                      border: isLight ? '1px solid #0284c7' : '1px solid rgba(0, 229, 255, 0.4)',
                      borderRadius: 6,
                      padding: '3px 8px',
                      boxShadow: isLight ? '0 4px 16px rgba(0,0,0,0.18)' : '0 4px 16px rgba(0,0,0,0.7)',
                      fontSize: 10,
                      fontFamily: 'monospace',
                      color: isLight ? '#0f172a' : '#fff',
                      userSelect: 'none'
                    }}>
                      <span style={{ color: isLight ? '#0284c7' : 'var(--cyan)', fontWeight: 700 }}>Yatay</span>
                      {['#38bdf8', '#10b981', '#f59e0b', '#ef4444', '#a855f7'].map(c => (
                        <span
                          key={c}
                          onClick={(ev) => {
                            ev.stopPropagation();
                            const updated = (drawings.horizontals || []).map(item => item.id === h.id ? { ...item, color: c } : item);
                            saveDrawings({ ...drawings, horizontals: updated });
                          }}
                          style={{
                            width: 10,
                            height: 10,
                            borderRadius: '50%',
                            background: c,
                            cursor: 'pointer',
                            boxSizing: 'border-box',
                            border: color === c ? (isLight ? '2px solid #0f172a' : '2px solid #fff') : (isLight ? '1px solid rgba(0,0,0,0.2)' : '1px solid rgba(255,255,255,0.2)')
                          }}
                          title="Renk Değiştir"
                        />
                      ))}
                      <span
                        onClick={(ev) => {
                          ev.stopPropagation();
                          deleteHorizontal(h.id);
                          setSelectedHorizontalId(null);
                        }}
                        style={{
                          cursor: 'pointer',
                          color: isLight ? '#dc2626' : '#ef4444',
                          fontWeight: 800,
                          padding: '0 4px',
                          borderRadius: 3,
                          background: isLight ? '#fee2e2' : 'rgba(239, 68, 68, 0.15)'
                        }}
                        title="Çizgiyi Sil (veya klavyeden Delete tuşuna basın)"
                      >
                        ✕
                      </span>
                    </div>
                  </foreignObject>
                )}
              </g>
            );
          })}

          {/* Render Persistent Horizontal Rays (TradingView Tarzı Sağa Uzanan Yatay Işınlar) */}
          {svgRays.map(r => {
            if (!r.valid) return null;
            const isDraggingAnchor = dragHandleState?.lineId === r.id && dragHandleState?.point === 'rayAnchor';
            const isLineActive = dragHandleState?.lineId === r.id;
            
            const x1 = isDraggingAnchor ? dragHandleState.curX : r.x1;
            const y1 = isDraggingAnchor ? dragHandleState.curY : r.y1;
            const x2 = chartContainerRef.current?.clientWidth || 800;
            const isSelected = selectedRayId === r.id || isLineActive;
            const color = r.color || '#38bdf8';
            const displayPrice = isDraggingAnchor ? (dragHandleState.curPrice ?? r.price) : r.price;

            return (
              <g key={r.id}>
                {/* Wide invisible click target for selection */}
                <line
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y1}
                  stroke="transparent"
                  strokeWidth={14}
                  style={{ cursor: 'pointer', pointerEvents: 'stroke' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedRayId(prev => prev === r.id ? null : r.id);
                    setSelectedTrendlineId(null);
                    setSelectedRectId(null);
                    setSelectedChannelId(null);
                    setSelectedAnchoredVwapId(null);
                    setSelectedHorizontalId(null);
                  }}
                />

                {/* Visible Horizontal Ray Line */}
                <line
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y1}
                  stroke={color}
                  strokeWidth={isSelected ? 3 : 2}
                  strokeLinecap="round"
                  strokeDasharray={isLineActive ? '4 2' : undefined}
                  style={{ pointerEvents: 'none' }}
                />

                {/* Anchor Point Handle (Draggable) */}
                <g
                  style={{ cursor: isDraggingAnchor ? 'grabbing' : 'grab', pointerEvents: 'all' }}
                  onPointerDown={(e) => handleEndpointPointerDown(e, r.id, 'rayAnchor')}
                  onMouseEnter={() => setHoveredHandle({ lineId: r.id, point: 'rayAnchor' })}
                  onMouseLeave={() => setHoveredHandle(null)}
                >
                  <circle cx={x1} cy={y1} r={16} fill="transparent" />
                  {(isSelected || (hoveredHandle?.lineId === r.id && hoveredHandle?.point === 'rayAnchor')) && (
                    <circle
                      cx={x1}
                      cy={y1}
                      r={isDraggingAnchor ? 11 : 9}
                      fill="none"
                      stroke={color}
                      strokeWidth={2}
                      opacity={0.8}
                    />
                  )}
                  <circle
                    cx={x1}
                    cy={y1}
                    r={isDraggingAnchor ? 6.5 : (isSelected ? 5.5 : 4.5)}
                    fill={isDraggingAnchor ? '#00e5ff' : '#ffffff'}
                    stroke={color}
                    strokeWidth={2}
                  />
                </g>

                {/* Right-edge Price Tag on Y axis */}
                <g style={{ pointerEvents: 'none' }}>
                  <rect
                    x={Math.max(x1 + 10, x2 - 58)}
                    y={y1 - 9}
                    width={56}
                    height={18}
                    rx={3}
                    fill={color}
                    style={{ filter: 'drop-shadow(0px 2px 4px rgba(0,0,0,0.6))' }}
                  />
                  <text
                    x={Math.max(x1 + 10, x2 - 58) + 28}
                    y={y1 + 3.5}
                    fill="#090d1a"
                    fontSize={10}
                    fontWeight={800}
                    fontFamily="monospace"
                    textAnchor="middle"
                  >
                    {isBist ? `₺${displayPrice}` : `$${displayPrice}`}
                  </text>
                </g>

                {/* Floating Mini Action Bar when Ray is Selected */}
                {isSelected && !dragHandleState && (
                  <foreignObject
                    x={Math.max(10, Math.min(x2 - 170, x1 + 15))}
                    y={Math.max(10, y1 - 36)}
                    width={170}
                    height={32}
                    style={{ overflow: 'visible', pointerEvents: 'all' }}
                  >
                    <div style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      background: isLight ? '#ffffff' : 'rgba(8, 12, 24, 0.96)',
                      border: isLight ? '1px solid #0284c7' : '1px solid rgba(0, 229, 255, 0.4)',
                      borderRadius: 6,
                      padding: '3px 8px',
                      boxShadow: isLight ? '0 4px 16px rgba(0,0,0,0.18)' : '0 4px 16px rgba(0,0,0,0.7)',
                      fontSize: 10,
                      fontFamily: 'monospace',
                      color: isLight ? '#0f172a' : '#fff',
                      userSelect: 'none'
                    }}>
                      <span style={{ color: isLight ? '#0284c7' : 'var(--cyan)', fontWeight: 700 }}>Işın</span>
                      {['#38bdf8', '#10b981', '#f59e0b', '#ef4444', '#a855f7'].map(c => (
                        <span
                          key={c}
                          onClick={(ev) => {
                            ev.stopPropagation();
                            const updated = (drawings.rays || []).map(item => item.id === r.id ? { ...item, color: c } : item);
                            saveDrawings({ ...drawings, rays: updated });
                          }}
                          style={{
                            width: 10,
                            height: 10,
                            borderRadius: '50%',
                            background: c,
                            cursor: 'pointer',
                            boxSizing: 'border-box',
                            border: color === c ? (isLight ? '2px solid #0f172a' : '2px solid #fff') : (isLight ? '1px solid rgba(0,0,0,0.2)' : '1px solid rgba(255,255,255,0.2)')
                          }}
                          title="Renk Değiştir"
                        />
                      ))}
                      <span
                        onClick={(ev) => {
                          ev.stopPropagation();
                          deleteRay(r.id);
                          setSelectedRayId(null);
                        }}
                        style={{
                          cursor: 'pointer',
                          color: isLight ? '#dc2626' : '#ef4444',
                          fontWeight: 800,
                          padding: '0 4px',
                          borderRadius: 3,
                          background: isLight ? '#fee2e2' : 'rgba(239, 68, 68, 0.15)'
                        }}
                        title="Işını Sil (veya klavyeden Delete tuşuna basın)"
                      >
                        ✕
                      </span>
                    </div>
                  </foreignObject>
                )}

                {/* Live Price Tag HUD during Anchor Dragging */}
                {isDraggingAnchor && dragHandleState?.curPrice && (
                  <foreignObject
                    x={dragHandleState.curX + 12}
                    y={dragHandleState.curY - 14}
                    width={130}
                    height={28}
                    style={{ overflow: 'visible', pointerEvents: 'none' }}
                  >
                    <div style={{
                      background: isLight ? '#0284c7' : 'rgba(0, 229, 255, 0.95)',
                      color: isLight ? '#ffffff' : '#06080e',
                      padding: '2px 8px',
                      borderRadius: 4,
                      fontSize: 11,
                      fontWeight: 800,
                      fontFamily: 'monospace',
                      boxShadow: isLight ? '0 4px 12px rgba(2, 132, 199, 0.35)' : '0 4px 12px rgba(0,0,0,0.6)',
                      whiteSpace: 'nowrap'
                    }}>
                      {isBist ? `₺${dragHandleState.curPrice}` : `$${dragHandleState.curPrice}`}
                    </div>
                  </foreignObject>
                )}
              </g>
            );
          })}

          {/* Mouse Preview for Active Ray Drawing */}
          {activeDrawTool === 'ray' && mousePreviewPoint && (
            <line
              x1={mousePreviewPoint.x}
              y1={mousePreviewPoint.y}
              x2={chartContainerRef.current?.clientWidth || 800}
              y2={mousePreviewPoint.y}
              stroke={isLight ? '#0284c7' : '#38bdf8'}
              strokeWidth={2}
              strokeDasharray="4 4"
            />
          )}

          {/* Mouse Preview for Active Trendline Drawing */}
          {activeDrawTool === 'trendline' && trendStartPoint && mousePreviewPoint && (() => {
            const startX = getCoordinateForPoint(trendStartPoint) ?? trendStartPoint.x;
            const startY = candlestickSeriesRef.current?.priceToCoordinate(trendStartPoint.price) ?? trendStartPoint.y;
            return (
              <line
                x1={startX}
                y1={startY}
                x2={mousePreviewPoint.x}
                y2={mousePreviewPoint.y}
                stroke={isLight ? '#0284c7' : '#38bdf8'}
                strokeWidth={2}
                strokeDasharray="4 4"
              />
            );
          })()}

          {/* Render Persistent Rectangles (Arz-Talep / Konsolidasyon Bölgeleri) */}
          {svgRectangles.map(r => {
            if (!r.valid) return null;
            const isDraggingP1 = dragHandleState?.lineId === r.id && dragHandleState?.point === 'rectP1';
            const isDraggingP2 = dragHandleState?.lineId === r.id && dragHandleState?.point === 'rectP2';
            const isSelected = selectedRectId === r.id || dragHandleState?.lineId === r.id;
            const color = r.color || '#38bdf8';

            const x1 = isDraggingP1 ? dragHandleState.curX : r.x1;
            const y1 = isDraggingP1 ? dragHandleState.curY : r.y1;
            const x2 = isDraggingP2 ? dragHandleState.curX : r.x2;
            const y2 = isDraggingP2 ? dragHandleState.curY : r.y2;

            const rx = Math.min(x1, x2);
            const ry = Math.min(y1, y2);
            const rw = Math.max(8, Math.abs(x2 - x1));
            const rh = Math.max(6, Math.abs(y2 - y1));

            return (
              <g key={r.id}>
                <rect
                  x={rx}
                  y={ry}
                  width={rw}
                  height={rh}
                  fill={color}
                  fillOpacity={isSelected ? 0.25 : 0.14}
                  stroke={color}
                  strokeWidth={isSelected ? 2 : 1.5}
                  strokeDasharray={dragHandleState?.lineId === r.id ? '4 2' : undefined}
                  rx={3}
                  style={{ cursor: 'pointer', pointerEvents: 'all' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedRectId(prev => prev === r.id ? null : r.id);
                    setSelectedTrendlineId(null);
                    setSelectedRayId(null);
                    setSelectedChannelId(null);
                    setSelectedAnchoredVwapId(null);
                    setSelectedHorizontalId(null);
                  }}
                />

                {/* Point A Handle (P1) */}
                <g
                  style={{ cursor: isDraggingP1 ? 'grabbing' : 'grab', pointerEvents: 'all' }}
                  onPointerDown={(e) => handleEndpointPointerDown(e, r.id, 'rectP1')}
                >
                  <circle cx={x1} cy={y1} r={16} fill="transparent" />
                  {isSelected && <circle cx={x1} cy={y1} r={isDraggingP1 ? 11 : 9} fill="none" stroke={color} strokeWidth={2} opacity={0.8} />}
                  <circle cx={x1} cy={y1} r={isDraggingP1 ? 6.5 : (isSelected ? 5.5 : 4.5)} fill={isDraggingP1 ? '#00e5ff' : '#ffffff'} stroke={color} strokeWidth={2} />
                </g>

                {/* Point B Handle (P2) */}
                <g
                  style={{ cursor: isDraggingP2 ? 'grabbing' : 'grab', pointerEvents: 'all' }}
                  onPointerDown={(e) => handleEndpointPointerDown(e, r.id, 'rectP2')}
                >
                  <circle cx={x2} cy={y2} r={16} fill="transparent" />
                  {isSelected && <circle cx={x2} cy={y2} r={isDraggingP2 ? 11 : 9} fill="none" stroke={color} strokeWidth={2} opacity={0.8} />}
                  <circle cx={x2} cy={y2} r={isDraggingP2 ? 6.5 : (isSelected ? 5.5 : 4.5)} fill={isDraggingP2 ? '#00e5ff' : '#ffffff'} stroke={color} strokeWidth={2} />
                </g>

                {/* Floating Action Bar */}
                {isSelected && !dragHandleState && (
                  <foreignObject
                    x={Math.max(10, Math.min((chartContainerRef.current?.clientWidth || 800) - 180, rx + rw / 2 - 80))}
                    y={Math.max(10, ry - 36)}
                    width={180}
                    height={32}
                    style={{ overflow: 'visible', pointerEvents: 'all' }}
                  >
                    <div style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      background: isLight ? '#ffffff' : 'rgba(8, 12, 24, 0.96)',
                      border: isLight ? '1px solid #0284c7' : '1px solid rgba(0, 229, 255, 0.4)',
                      borderRadius: 6,
                      padding: '3px 8px',
                      boxShadow: isLight ? '0 4px 16px rgba(0,0,0,0.18)' : '0 4px 16px rgba(0,0,0,0.7)',
                      fontSize: 10,
                      fontFamily: 'monospace',
                      color: isLight ? '#0f172a' : '#fff',
                      userSelect: 'none'
                    }}>
                      <span style={{ color: isLight ? '#0284c7' : 'var(--cyan)', fontWeight: 700 }}>Bölge</span>
                      {['#38bdf8', '#10b981', '#f59e0b', '#ef4444', '#a855f7'].map(c => (
                        <span
                          key={c}
                          onClick={(ev) => {
                            ev.stopPropagation();
                            const updated = (drawings.rectangles || []).map(item => item.id === r.id ? { ...item, color: c } : item);
                            saveDrawings({ ...drawings, rectangles: updated });
                          }}
                          style={{
                            width: 10,
                            height: 10,
                            borderRadius: '50%',
                            background: c,
                            cursor: 'pointer',
                            boxSizing: 'border-box',
                            border: color === c ? (isLight ? '2px solid #0f172a' : '2px solid #fff') : '1px solid rgba(255,255,255,0.2)'
                          }}
                          title="Renk Değiştir"
                        />
                      ))}
                      <span
                        onClick={(ev) => {
                          ev.stopPropagation();
                          deleteRectangle(r.id);
                          setSelectedRectId(null);
                        }}
                        style={{
                          cursor: 'pointer',
                          color: isLight ? '#dc2626' : '#ef4444',
                          fontWeight: 800,
                          padding: '0 4px',
                          borderRadius: 3,
                          background: isLight ? '#fee2e2' : 'rgba(239, 68, 68, 0.15)'
                        }}
                        title="Bölgeyi Sil (veya klavyeden Delete tuşuna basın)"
                      >
                        ✕
                      </span>
                    </div>
                  </foreignObject>
                )}
              </g>
            );
          })}

          {/* Render Persistent Parallel Channels (Paralel Kanallar) */}
          {svgChannels.map(ch => {
            if (!ch.valid) return null;
            const isDraggingP1 = dragHandleState?.lineId === ch.id && dragHandleState?.point === 'chanP1';
            const isDraggingP2 = dragHandleState?.lineId === ch.id && dragHandleState?.point === 'chanP2';
            const isDraggingP3 = dragHandleState?.lineId === ch.id && dragHandleState?.point === 'chanP3';
            const isSelected = selectedChannelId === ch.id || dragHandleState?.lineId === ch.id;
            const color = ch.color || '#38bdf8';

            const x1 = isDraggingP1 ? dragHandleState.curX : ch.x1;
            const y1 = isDraggingP1 ? dragHandleState.curY : ch.y1;
            const x2 = isDraggingP2 ? dragHandleState.curX : ch.x2;
            const y2 = isDraggingP2 ? dragHandleState.curY : ch.y2;
            const x3 = isDraggingP3 ? dragHandleState.curX : ch.x3;
            const y3 = isDraggingP3 ? dragHandleState.curY : ch.y3;

            const dx = x2 - x1;
            const dy = y2 - y1;
            const x4 = x3 + dx;
            const y4 = y3 + dy;

            const midX1 = (x1 + x3) / 2;
            const midY1 = (y1 + y3) / 2;
            const midX2 = (x2 + x4) / 2;
            const midY2 = (y2 + y4) / 2;

            return (
              <g key={ch.id}>
                {/* Shaded Channel Body */}
                <polygon
                  points={`${x1},${y1} ${x2},${y2} ${x4},${y4} ${x3},${y3}`}
                  fill={color}
                  fillOpacity={isSelected ? 0.2 : 0.1}
                  style={{ cursor: 'pointer', pointerEvents: 'all' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedChannelId(prev => prev === ch.id ? null : ch.id);
                    setSelectedTrendlineId(null);
                    setSelectedRayId(null);
                    setSelectedRectId(null);
                    setSelectedAnchoredVwapId(null);
                    setSelectedHorizontalId(null);
                  }}
                />

                {/* Baseline Line */}
                <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={isSelected ? 2.5 : 1.5} style={{ pointerEvents: 'none' }} />
                {/* Parallel Line */}
                <line x1={x3} y1={y3} x2={x4} y2={y4} stroke={color} strokeWidth={isSelected ? 2.5 : 1.5} style={{ pointerEvents: 'none' }} />
                {/* Midline (Dashed) */}
                <line x1={midX1} y1={midY1} x2={midX2} y2={midY2} stroke={color} strokeWidth={1} strokeDasharray="4 4" opacity={0.65} style={{ pointerEvents: 'none' }} />

                {/* Point 1 Handle (P1) */}
                <g style={{ cursor: isDraggingP1 ? 'grabbing' : 'grab', pointerEvents: 'all' }} onPointerDown={(e) => handleEndpointPointerDown(e, ch.id, 'chanP1')}>
                  <circle cx={x1} cy={y1} r={16} fill="transparent" />
                  {isSelected && <circle cx={x1} cy={y1} r={isDraggingP1 ? 11 : 9} fill="none" stroke={color} strokeWidth={2} opacity={0.8} />}
                  <circle cx={x1} cy={y1} r={isDraggingP1 ? 6.5 : (isSelected ? 5.5 : 4.5)} fill={isDraggingP1 ? '#00e5ff' : '#ffffff'} stroke={color} strokeWidth={2} />
                </g>

                {/* Point 2 Handle (P2) */}
                <g style={{ cursor: isDraggingP2 ? 'grabbing' : 'grab', pointerEvents: 'all' }} onPointerDown={(e) => handleEndpointPointerDown(e, ch.id, 'chanP2')}>
                  <circle cx={x2} cy={y2} r={16} fill="transparent" />
                  {isSelected && <circle cx={x2} cy={y2} r={isDraggingP2 ? 11 : 9} fill="none" stroke={color} strokeWidth={2} opacity={0.8} />}
                  <circle cx={x2} cy={y2} r={isDraggingP2 ? 6.5 : (isSelected ? 5.5 : 4.5)} fill={isDraggingP2 ? '#00e5ff' : '#ffffff'} stroke={color} strokeWidth={2} />
                </g>

                {/* Point 3 Handle (P3) */}
                <g style={{ cursor: isDraggingP3 ? 'grabbing' : 'grab', pointerEvents: 'all' }} onPointerDown={(e) => handleEndpointPointerDown(e, ch.id, 'chanP3')}>
                  <circle cx={x3} cy={y3} r={16} fill="transparent" />
                  {isSelected && <circle cx={x3} cy={y3} r={isDraggingP3 ? 11 : 9} fill="none" stroke={color} strokeWidth={2} opacity={0.8} />}
                  <circle cx={x3} cy={y3} r={isDraggingP3 ? 6.5 : (isSelected ? 5.5 : 4.5)} fill={isDraggingP3 ? '#00e5ff' : '#ffffff'} stroke={color} strokeWidth={2} />
                </g>

                {/* Floating Action Bar */}
                {isSelected && !dragHandleState && (
                  <foreignObject
                    x={Math.max(10, Math.min((chartContainerRef.current?.clientWidth || 800) - 180, (x1 + x2 + x3 + x4) / 4 - 80))}
                    y={Math.max(10, Math.min(y1, y2, y3, y4) - 36)}
                    width={180}
                    height={32}
                    style={{ overflow: 'visible', pointerEvents: 'all' }}
                  >
                    <div style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      background: isLight ? '#ffffff' : 'rgba(8, 12, 24, 0.96)',
                      border: isLight ? '1px solid #0284c7' : '1px solid rgba(0, 229, 255, 0.4)',
                      borderRadius: 6,
                      padding: '3px 8px',
                      boxShadow: isLight ? '0 4px 16px rgba(0,0,0,0.18)' : '0 4px 16px rgba(0,0,0,0.7)',
                      fontSize: 10,
                      fontFamily: 'monospace',
                      color: isLight ? '#0f172a' : '#fff',
                      userSelect: 'none'
                    }}>
                      <span style={{ color: isLight ? '#0284c7' : 'var(--cyan)', fontWeight: 700 }}>Kanal</span>
                      {['#38bdf8', '#10b981', '#f59e0b', '#ef4444', '#a855f7'].map(c => (
                        <span
                          key={c}
                          onClick={(ev) => {
                            ev.stopPropagation();
                            const updated = (drawings.channels || []).map(item => item.id === ch.id ? { ...item, color: c } : item);
                            saveDrawings({ ...drawings, channels: updated });
                          }}
                          style={{
                            width: 10,
                            height: 10,
                            borderRadius: '50%',
                            background: c,
                            cursor: 'pointer',
                            boxSizing: 'border-box',
                            border: color === c ? (isLight ? '2px solid #0f172a' : '2px solid #fff') : '1px solid rgba(255,255,255,0.2)'
                          }}
                          title="Renk Değiştir"
                        />
                      ))}
                      <span
                        onClick={(ev) => {
                          ev.stopPropagation();
                          deleteChannel(ch.id);
                          setSelectedChannelId(null);
                        }}
                        style={{
                          cursor: 'pointer',
                          color: isLight ? '#dc2626' : '#ef4444',
                          fontWeight: 800,
                          padding: '0 4px',
                          borderRadius: 3,
                          background: isLight ? '#fee2e2' : 'rgba(239, 68, 68, 0.15)'
                        }}
                        title="Kanalı Sil (veya klavyeden Delete tuşuna basın)"
                      >
                        ✕
                      </span>
                    </div>
                  </foreignObject>
                )}
              </g>
            );
          })}

          {/* Render Persistent Custom Anchored VWAPs (Kullanıcı Çapalı VWAP) */}
          {svgAnchoredVwaps.map(av => {
            if (!av.valid || !av.points || av.points.length < 2) return null;
            const isDraggingAnchor = dragHandleState?.lineId === av.id && dragHandleState?.point === 'avwapAnchor';
            const isSelected = selectedAnchoredVwapId === av.id || isDraggingAnchor;
            const color = av.color || '#06b6d4';
            const pathD = 'M ' + av.points.map(p => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' L ');
            const startPt = av.startPoint;
            const endPt = av.endPoint;

            return (
              <g key={av.id}>
                {/* Invisible Click Target */}
                <path
                  d={pathD}
                  fill="none"
                  stroke="transparent"
                  strokeWidth={16}
                  style={{ cursor: 'pointer', pointerEvents: 'stroke' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedAnchoredVwapId(prev => prev === av.id ? null : av.id);
                    setSelectedTrendlineId(null);
                    setSelectedRayId(null);
                    setSelectedRectId(null);
                    setSelectedChannelId(null);
                    setSelectedHorizontalId(null);
                  }}
                />

                {/* Visible AVWAP Line */}
                <path
                  d={pathD}
                  fill="none"
                  stroke={color}
                  strokeWidth={isSelected ? 3 : 2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ pointerEvents: 'none' }}
                />

                {/* Anchor Origin Handle (Draggable) */}
                <g
                  style={{ cursor: isDraggingAnchor ? 'grabbing' : 'grab', pointerEvents: 'all' }}
                  onPointerDown={(e) => handleEndpointPointerDown(e, av.id, 'avwapAnchor')}
                >
                  <circle cx={startPt.x} cy={startPt.y} r={16} fill="transparent" />
                  <circle cx={startPt.x} cy={startPt.y} r={9} fill={isLight ? '#ffffff' : '#040711'} stroke={color} strokeWidth={2} />
                  <text
                    x={startPt.x}
                    y={startPt.y + 3.5}
                    textAnchor="middle"
                    fontSize={10}
                    fill={color}
                    style={{ userSelect: 'none', pointerEvents: 'none', fontWeight: 800 }}
                  >
                    ⚓
                  </text>
                </g>

                {/* Right Edge Price Tag */}
                {endPt && (
                  <g style={{ pointerEvents: 'none' }}>
                    <rect
                      x={Math.max(startPt.x + 10, endPt.x - 72)}
                      y={endPt.y - 9}
                      width={70}
                      height={18}
                      rx={3}
                      fill={color}
                      style={{ filter: 'drop-shadow(0px 2px 4px rgba(0,0,0,0.6))' }}
                    />
                    <text
                      x={Math.max(startPt.x + 10, endPt.x - 72) + 35}
                      y={endPt.y + 3.5}
                      fill="#090d1a"
                      fontSize={9.5}
                      fontWeight={800}
                      fontFamily="monospace"
                      textAnchor="middle"
                    >
                      ⚓ {isBist ? `₺${endPt.price.toFixed(2)}` : `$${endPt.price.toFixed(2)}`}
                    </text>
                  </g>
                )}

                {/* Floating Action Bar */}
                {isSelected && !dragHandleState && (
                  <foreignObject
                    x={Math.max(10, Math.min((chartContainerRef.current?.clientWidth || 800) - 180, startPt.x + 15))}
                    y={Math.max(10, startPt.y - 36)}
                    width={180}
                    height={32}
                    style={{ overflow: 'visible', pointerEvents: 'all' }}
                  >
                    <div style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      background: isLight ? '#ffffff' : 'rgba(8, 12, 24, 0.96)',
                      border: isLight ? '1px solid #0284c7' : '1px solid rgba(0, 229, 255, 0.4)',
                      borderRadius: 6,
                      padding: '3px 8px',
                      boxShadow: isLight ? '0 4px 16px rgba(0,0,0,0.18)' : '0 4px 16px rgba(0,0,0,0.7)',
                      fontSize: 10,
                      fontFamily: 'monospace',
                      color: isLight ? '#0f172a' : '#fff',
                      userSelect: 'none'
                    }}>
                      <span style={{ color: isLight ? '#0284c7' : 'var(--cyan)', fontWeight: 700 }}>Çapa</span>
                      {['#06b6d4', '#38bdf8', '#10b981', '#f59e0b', '#ec4899'].map(c => (
                        <span
                          key={c}
                          onClick={(ev) => {
                            ev.stopPropagation();
                            const updated = (drawings.anchoredVwaps || []).map(item => item.id === av.id ? { ...item, color: c } : item);
                            saveDrawings({ ...drawings, anchoredVwaps: updated });
                          }}
                          style={{
                            width: 10,
                            height: 10,
                            borderRadius: '50%',
                            background: c,
                            cursor: 'pointer',
                            boxSizing: 'border-box',
                            border: color === c ? (isLight ? '2px solid #0f172a' : '2px solid #fff') : '1px solid rgba(255,255,255,0.2)'
                          }}
                          title="Renk Değiştir"
                        />
                      ))}
                      <span
                        onClick={(ev) => {
                          ev.stopPropagation();
                          deleteAnchoredVwap(av.id);
                          setSelectedAnchoredVwapId(null);
                        }}
                        style={{
                          cursor: 'pointer',
                          color: isLight ? '#dc2626' : '#ef4444',
                          fontWeight: 800,
                          padding: '0 4px',
                          borderRadius: 3,
                          background: isLight ? '#fee2e2' : 'rgba(239, 68, 68, 0.15)'
                        }}
                        title="Çapayı Sil (veya klavyeden Delete tuşuna basın)"
                      >
                        ✕
                      </span>
                    </div>
                  </foreignObject>
                )}
              </g>
            );
          })}

          {/* Active Persistent Measurement */}
          {svgMeasurement && (
            <g>
              <rect
                x={Math.min(svgMeasurement.x1, svgMeasurement.x2)}
                y={Math.min(svgMeasurement.y1, svgMeasurement.y2)}
                width={Math.max(4, Math.abs(svgMeasurement.x2 - svgMeasurement.x1))}
                height={Math.max(4, Math.abs(svgMeasurement.y2 - svgMeasurement.y1))}
                fill={svgMeasurement.price2 >= svgMeasurement.price1 ? 'rgba(16, 185, 129, 0.14)' : 'rgba(239, 68, 68, 0.14)'}
                stroke={svgMeasurement.price2 >= svgMeasurement.price1 ? '#10b981' : '#ef4444'}
                strokeWidth={1.5}
                strokeDasharray="4 3"
                rx={4}
              />
              <line
                x1={svgMeasurement.x1}
                y1={svgMeasurement.y1}
                x2={svgMeasurement.x2}
                y2={svgMeasurement.y2}
                stroke={svgMeasurement.price2 >= svgMeasurement.price1 ? '#10b981' : '#ef4444'}
                strokeWidth={1.5}
              />
              <circle cx={svgMeasurement.x1} cy={svgMeasurement.y1} r={4} fill="#ffffff" stroke={svgMeasurement.price2 >= svgMeasurement.price1 ? '#10b981' : '#ef4444'} strokeWidth={2} />
              <circle cx={svgMeasurement.x2} cy={svgMeasurement.y2} r={4} fill="#ffffff" stroke={svgMeasurement.price2 >= svgMeasurement.price1 ? '#10b981' : '#ef4444'} strokeWidth={2} />

              <foreignObject
                x={(svgMeasurement.x1 + svgMeasurement.x2) / 2 - 85}
                y={(svgMeasurement.y1 + svgMeasurement.y2) / 2 - 20}
                width={170}
                height={40}
                style={{ overflow: 'visible', pointerEvents: 'all' }}
              >
                {(() => {
                  const diff = svgMeasurement.price2 - svgMeasurement.price1;
                  const pct = ((diff / svgMeasurement.price1) * 100).toFixed(2);
                  const isPos = diff >= 0;
                  return (
                    <div style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      background: isLight ? '#ffffff' : 'rgba(8, 12, 24, 0.96)',
                      border: `1.5px solid ${isPos ? '#10b981' : '#ef4444'}`,
                      borderRadius: 6,
                      padding: '4px 8px',
                      boxShadow: '0 4px 16px rgba(0,0,0,0.6)',
                      fontFamily: 'monospace',
                      userSelect: 'none'
                    }}>
                      <span style={{
                        fontSize: 11,
                        fontWeight: 800,
                        color: isPos ? '#10b981' : '#ef4444'
                      }}>
                        {isPos ? '+' : ''}{isBist ? `₺${diff.toFixed(2)}` : `$${diff.toFixed(2)}`} ({isPos ? '+' : ''}{pct}%)
                      </span>
                      {svgMeasurement.barCount !== null && (
                        <span style={{ fontSize: 9.5, color: '#94a3b8' }}>• {svgMeasurement.barCount} Bar</span>
                      )}
                      <span
                        onClick={(ev) => {
                          ev.stopPropagation();
                          setActiveMeasurement(null);
                          setSvgMeasurement(null);
                        }}
                        style={{
                          cursor: 'pointer',
                          color: isLight ? '#dc2626' : '#ef4444',
                          fontWeight: 800,
                          padding: '0 4px',
                          borderRadius: 3,
                          background: isLight ? '#fee2e2' : 'rgba(239, 68, 68, 0.15)',
                          fontSize: 10
                        }}
                        title="Ölçümü Kapat"
                      >
                        ✕
                      </span>
                    </div>
                  );
                })()}
              </foreignObject>
            </g>
          )}

          {/* Mouse Preview for Active Measure */}
          {activeDrawTool === 'measure' && measureStartPoint && mousePreviewPoint && (
            <g>
              <rect
                x={Math.min(measureStartPoint.x, mousePreviewPoint.x)}
                y={Math.min(measureStartPoint.y, mousePreviewPoint.y)}
                width={Math.max(4, Math.abs(mousePreviewPoint.x - measureStartPoint.x))}
                height={Math.max(4, Math.abs(mousePreviewPoint.y - measureStartPoint.y))}
                fill="rgba(56, 189, 248, 0.14)"
                stroke="#38bdf8"
                strokeWidth={1.5}
                strokeDasharray="4 3"
                rx={4}
              />
              <line
                x1={measureStartPoint.x}
                y1={measureStartPoint.y}
                x2={mousePreviewPoint.x}
                y2={mousePreviewPoint.y}
                stroke="#38bdf8"
                strokeWidth={1.5}
              />
              <foreignObject
                x={(measureStartPoint.x + mousePreviewPoint.x) / 2 - 75}
                y={(measureStartPoint.y + mousePreviewPoint.y) / 2 - 16}
                width={150}
                height={32}
                style={{ overflow: 'visible', pointerEvents: 'none' }}
              >
                {(() => {
                  const diff = mousePreviewPoint.price - measureStartPoint.price;
                  const pct = ((diff / measureStartPoint.price) * 100).toFixed(2);
                  const isPos = diff >= 0;
                  return (
                    <div style={{
                      background: isPos ? '#10b981' : '#ef4444',
                      color: '#ffffff',
                      padding: '3px 8px',
                      borderRadius: 4,
                      fontSize: 10.5,
                      fontWeight: 800,
                      fontFamily: 'monospace',
                      textAlign: 'center',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
                    }}>
                      {isPos ? '+' : ''}{isBist ? `₺${diff.toFixed(2)}` : `$${diff.toFixed(2)}`} ({isPos ? '+' : ''}{pct}%)
                    </div>
                  );
                })()}
              </foreignObject>
            </g>
          )}

          {/* Mouse Preview for Active Rectangle */}
          {activeDrawTool === 'rectangle' && rectStartPoint && mousePreviewPoint && (() => {
            const startX = getCoordinateForPoint(rectStartPoint) ?? rectStartPoint.x;
            const startY = candlestickSeriesRef.current?.priceToCoordinate(rectStartPoint.price) ?? rectStartPoint.y;
            return (
              <rect
                x={Math.min(startX, mousePreviewPoint.x)}
                y={Math.min(startY, mousePreviewPoint.y)}
                width={Math.max(4, Math.abs(mousePreviewPoint.x - startX))}
                height={Math.max(4, Math.abs(mousePreviewPoint.y - startY))}
                fill="rgba(56, 189, 248, 0.16)"
                stroke={isLight ? '#0284c7' : '#38bdf8'}
                strokeWidth={1.5}
                strokeDasharray="4 4"
                rx={3}
              />
            );
          })()}

          {/* Mouse Preview for Active Channel */}
          {activeDrawTool === 'channel' && channelPoints.length === 1 && mousePreviewPoint && (
            <line
              x1={channelPoints[0].x}
              y1={channelPoints[0].y}
              x2={mousePreviewPoint.x}
              y2={mousePreviewPoint.y}
              stroke={isLight ? '#0284c7' : '#38bdf8'}
              strokeWidth={2}
              strokeDasharray="4 4"
            />
          )}

          {activeDrawTool === 'channel' && channelPoints.length === 2 && mousePreviewPoint && (
            <g>
              <line
                x1={channelPoints[0].x}
                y1={channelPoints[0].y}
                x2={channelPoints[1].x}
                y2={channelPoints[1].y}
                stroke={isLight ? '#0284c7' : '#38bdf8'}
                strokeWidth={2}
              />
              <line
                x1={mousePreviewPoint.x}
                y1={mousePreviewPoint.y}
                x2={mousePreviewPoint.x + (channelPoints[1].x - channelPoints[0].x)}
                y2={mousePreviewPoint.y + (channelPoints[1].y - channelPoints[0].y)}
                stroke={isLight ? '#0284c7' : '#38bdf8'}
                strokeWidth={1.5}
                strokeDasharray="4 4"
              />
            </g>
          )}
        </svg>
        </div>

        {/* ⊞ Secondary Split Screen Pane */}
        {splitView && (
          <div style={{ flex: 1, width: '50%', height: '100%', minHeight: 350, position: 'relative', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <ProChartSplitPane
              ticker={cleanTicker || symbol}
              isBist={isBist}
              isLight={isLight}
              primaryInterval={chartInterval}
              splitInterval={splitInterval}
              setSplitInterval={setSplitInterval}
              onClose={() => setSplitView(false)}
            />
          </div>
        )}
      </div>

      {/* 📉 RSI SUB-CHART (TradingView Tarzı Yeniden Boyutlandırılabilir) */}
      {indicators.rsi && (
        <>
          {/* ↕️ TradingView Tarzı İnteraktif Sürükle-Bırak Yükseklik Ayıracı (Splitter) */}
          <div
            onPointerDown={handleSplitterPointerDown}
            onPointerMove={handleSplitterPointerMove}
            onPointerUp={handleSplitterPointerUp}
            onDoubleClick={() => {
              const nextHeight = rsiHeight >= 220 ? 130 : 230;
              setRsiHeight(nextHeight);
              try { localStorage.setItem('terminal_rsi_height', String(nextHeight)); } catch (e) {}
            }}
            style={{
              height: 7,
              width: '100%',
              cursor: 'row-resize',
              background: isDraggingSplitter ? (isLight ? 'rgba(2, 132, 199, 0.4)' : 'rgba(56, 189, 248, 0.5)') : (isLight ? '#e2e8f0' : 'rgba(255, 255, 255, 0.08)'),
              borderTop: isLight ? '1px solid #cbd5e1' : '1px solid rgba(255, 255, 255, 0.12)',
              borderBottom: isLight ? '1px solid #cbd5e1' : '1px solid rgba(0, 0, 0, 0.6)',
              transition: isDraggingSplitter ? 'none' : 'background 0.15s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              zIndex: 20,
              userSelect: 'none',
              touchAction: 'none'
            }}
            title="TradingView Tarzı Yükseklik Ayarı: Yukarı/Aşağı sürükleyin (Çift tıklama: Genişlet/Daralt)"
          >
            <div style={{
              width: 44,
              height: 3,
              borderRadius: 3,
              background: isDraggingSplitter ? '#38bdf8' : (isLight ? '#94a3b8' : 'rgba(255, 255, 255, 0.4)'),
              boxShadow: isDraggingSplitter ? '0 0 8px rgba(56, 189, 248, 0.8)' : 'none'
            }} />
          </div>

          <div 
            style={{ 
              height: rsiHeight, 
              width: '100%', 
              background: isLight ? '#f8fafc' : '#03050c',
              position: 'relative',
              flexShrink: 0
            }}
          >
            <div 
              style={{ 
                position: 'absolute', 
                top: 4, 
                left: 10, 
                fontSize: 9, 
                color: '#ec4899', 
                fontWeight: 700, 
                zIndex: 5,
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}
            >
              <span>RSI ({indicatorSettings.rsiPeriod || 14})</span>
              {indicators.rsiMa && (
                <span style={{ color: '#facc15' }}>• MA ({indicatorSettings.rsiMaPeriod || 14})</span>
              )}
              <span style={{ color: '#64748b' }}>• 70 / 50 / 30</span>

              {/* Quick in-panel toggles */}
              <button
                type="button"
                onClick={() => toggleIndicator('rsiMa')}
                style={{
                  background: indicators.rsiMa ? 'rgba(250, 204, 21, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                  color: indicators.rsiMa ? '#facc15' : '#94a3b8',
                  border: `1px solid ${indicators.rsiMa ? 'rgba(250, 204, 21, 0.5)' : 'rgba(255, 255, 255, 0.1)'}`,
                  borderRadius: 4,
                  padding: '1px 5px',
                  fontSize: 8.5,
                  cursor: 'pointer',
                  fontWeight: 600
                }}
                title="RSI Hareketli Ortalamasını Aç/Kapat"
              >
                🟡 MA
              </button>

              <button
                type="button"
                onClick={() => toggleIndicator('rsiDivergence')}
                style={{
                  background: indicators.rsiDivergence ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                  color: indicators.rsiDivergence ? '#38bdf8' : '#94a3b8',
                  border: `1px solid ${indicators.rsiDivergence ? 'rgba(56, 189, 248, 0.5)' : 'rgba(255, 255, 255, 0.1)'}`,
                  borderRadius: 4,
                  padding: '1px 5px',
                  fontSize: 8.5,
                  cursor: 'pointer',
                  fontWeight: 600
                }}
                title="RSI Uyumsuzluklarını Aç/Kapat"
              >
                ⚡ Uyumsuzluk
              </button>

              {/* Son Uyumsuzluk Rozeti */}
              {indicators.rsiDivergence && latestDivergence && (
                <span
                  style={{
                    padding: '1px 6px',
                    borderRadius: 4,
                    fontSize: 8.5,
                    fontWeight: 700,
                    backgroundColor: latestDivergence.type === 'PU' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                    color: latestDivergence.type === 'PU' ? '#10b981' : '#ef4444',
                    border: `1px solid ${latestDivergence.type === 'PU' ? '#10b981' : '#ef4444'}`
                  }}
                  title={`Son Sinyal: ${latestDivergence.title} (${latestDivergence.time})`}
                >
                  {latestDivergence.type === 'PU' ? '🟢 Son: PU' : '🔴 Son: NU'}
                </span>
              )}
            </div>

            {/* Sağ Üst Hızlı Yükseklik Seçici Presets */}
            <div
              style={{
                position: 'absolute',
                top: 4,
                right: 75,
                zIndex: 5,
                display: 'flex',
                alignItems: 'center',
                gap: 3
              }}
            >
              <span style={{ fontSize: 8.5, color: '#64748b', marginRight: 2 }}>Boyut:</span>
              {[
                { label: 'S', h: 120, title: 'Kompakt (120px)' },
                { label: 'M', h: 165, title: 'Standart (165px)' },
                { label: 'L', h: 230, title: 'Geniş (230px)' },
                { label: 'XL', h: 320, title: 'Çok Geniş (320px)' }
              ].map(p => {
                const isActive = Math.abs(rsiHeight - p.h) < 25;
                return (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => {
                      setRsiHeight(p.h);
                      try { localStorage.setItem('terminal_rsi_height', String(p.h)); } catch (e) {}
                    }}
                    style={{
                      background: isActive ? 'rgba(56, 189, 248, 0.25)' : 'rgba(255, 255, 255, 0.04)',
                      color: isActive ? '#38bdf8' : '#94a3b8',
                      border: `1px solid ${isActive ? 'rgba(56, 189, 248, 0.5)' : 'rgba(255, 255, 255, 0.08)'}`,
                      borderRadius: 3,
                      padding: '1px 5px',
                      fontSize: 8.5,
                      cursor: 'pointer',
                      fontWeight: isActive ? 700 : 500
                    }}
                    title={p.title}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>

            <div ref={rsiContainerRef} style={{ width: '100%', height: '100%' }} />
          </div>
        </>
      )}

      {/* 📊 MACD SUB-CHART (TradingView Tarzı Yeniden Boyutlandırılabilir) */}
      {indicators.macd && (
        <>
          {/* ↕️ TradingView Tarzı İnteraktif Sürükle-Bırak Yükseklik Ayıracı (Splitter) */}
          <div
            onPointerDown={handleMacdSplitterPointerDown}
            onPointerMove={handleMacdSplitterPointerMove}
            onPointerUp={handleMacdSplitterPointerUp}
            onDoubleClick={() => {
              const nextHeight = macdHeight >= 200 ? 120 : 210;
              setMacdHeight(nextHeight);
              try { localStorage.setItem('terminal_macd_height', String(nextHeight)); } catch (e) {}
            }}
            style={{
              height: 7,
              width: '100%',
              cursor: 'row-resize',
              background: isDraggingMacdSplitter ? (isLight ? 'rgba(2, 132, 199, 0.4)' : 'rgba(56, 189, 248, 0.5)') : (isLight ? '#e2e8f0' : 'rgba(255, 255, 255, 0.08)'),
              borderTop: isLight ? '1px solid #cbd5e1' : '1px solid rgba(255, 255, 255, 0.12)',
              borderBottom: isLight ? '1px solid #cbd5e1' : '1px solid rgba(0, 0, 0, 0.6)',
              transition: isDraggingMacdSplitter ? 'none' : 'background 0.15s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              zIndex: 20,
              userSelect: 'none',
              touchAction: 'none'
            }}
            title="MACD Yükseklik Ayarı: Yukarı/Aşağı sürükleyin (Çift tıklama: Genişlet/Daralt)"
          >
            <div style={{
              width: 44,
              height: 3,
              borderRadius: 3,
              background: isDraggingMacdSplitter ? '#38bdf8' : (isLight ? '#94a3b8' : 'rgba(255, 255, 255, 0.4)'),
              boxShadow: isDraggingMacdSplitter ? '0 0 8px rgba(56, 189, 248, 0.8)' : 'none'
            }} />
          </div>

          <div 
            style={{ 
              height: macdHeight, 
              width: '100%', 
              background: isLight ? '#f8fafc' : '#03050c',
              position: 'relative',
              flexShrink: 0
            }}
          >
            {/* Başlık ve Gösterge Rozeti */}
            <div 
              style={{ 
                position: 'absolute', 
                top: 4, 
                left: 10, 
                fontSize: 9, 
                zIndex: 5,
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}
            >
              <span style={{ color: '#38bdf8', fontWeight: 700 }}>
                MACD ({indicatorSettings.macdFastPeriod || 12}, {indicatorSettings.macdSlowPeriod || 26}, {indicatorSettings.macdSignalPeriod || 9})
              </span>
              <span style={{ color: '#f59e0b', fontWeight: 600 }}>• Sinyal</span>
              <span style={{ color: '#10b981', fontWeight: 600 }}>• Histogram</span>
            </div>

            {/* Sağ Üst Hızlı Boyut Seçiciler */}
            <div
              style={{
                position: 'absolute',
                top: 4,
                right: 75,
                zIndex: 5,
                display: 'flex',
                alignItems: 'center',
                gap: 3
              }}
            >
              <span style={{ fontSize: 8.5, color: '#64748b', marginRight: 2 }}>Boyut:</span>
              {[
                { label: 'S', h: 110, title: 'Kompakt (110px)' },
                { label: 'M', h: 155, title: 'Standart (155px)' },
                { label: 'L', h: 220, title: 'Geniş (220px)' },
                { label: 'XL', h: 300, title: 'Çok Geniş (300px)' }
              ].map(p => {
                const isActive = Math.abs(macdHeight - p.h) < 25;
                return (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => {
                      setMacdHeight(p.h);
                      try { localStorage.setItem('terminal_macd_height', String(p.h)); } catch (e) {}
                    }}
                    style={{
                      background: isActive ? 'rgba(56, 189, 248, 0.25)' : 'rgba(255, 255, 255, 0.04)',
                      color: isActive ? '#38bdf8' : '#94a3b8',
                      border: `1px solid ${isActive ? 'rgba(56, 189, 248, 0.5)' : 'rgba(255, 255, 255, 0.08)'}`,
                      borderRadius: 3,
                      padding: '1px 5px',
                      fontSize: 8.5,
                      cursor: 'pointer',
                      fontWeight: isActive ? 700 : 500
                    }}
                    title={p.title}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>

            <div ref={macdContainerRef} style={{ width: '100%', height: '100%' }} />
          </div>
        </>
      )}

      {/* ℹ️ FOOTER HINT BAR */}
      <div 
        style={{ 
          padding: '4px 12px', 
          background: isLight ? '#f1f5f9' : '#020308', 
          borderTop: isLight ? '1px solid #e2e8f0' : '1px solid rgba(255, 255, 255, 0.05)', 
          fontSize: 9.5, 
          color: isLight ? '#64748b' : 'var(--text-muted)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexShrink: 0
        }}
      >
        <span>
          💡 <strong>Kalıcı Grafik:</strong> Çizdiğiniz tüm trend ve yatay çizgiler varlık bazında tarayıcınızda saklanır. Başka hisseye geçseniz bile asla silinmez.
        </span>
        <span>
          Fare Tekerleği: Yakınlaştır / Uzaklaştır • Sürükle: Geçmişe Kaydır
        </span>
      </div>

      {/* ⚙️ İNDİKATÖR & ANALİZ AYARLARI MODAL POPUP */}
      {showSettingsModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.78)',
            backdropFilter: 'blur(5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999
          }}
          onClick={() => setShowSettingsModal(false)}
        >
          <div
            style={{
              background: isLight ? '#ffffff' : '#090d1a',
              border: isLight ? '1px solid #cbd5e1' : '1px solid rgba(56, 189, 248, 0.35)',
              borderRadius: 12,
              padding: '18px 22px',
              width: settingsTab === 'fib' ? 570 : 510,
              maxWidth: '94vw',
              maxHeight: '90vh',
              boxShadow: isLight ? '0 25px 60px rgba(0,0,0,0.25)' : '0 25px 60px rgba(0,0,0,0.95)',
              color: isLight ? '#0f172a' : '#f8fafc',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              transition: 'width 0.2s ease'
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Başlık */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, borderBottom: isLight ? '1px solid #e2e8f0' : '1px solid rgba(255,255,255,0.08)', paddingBottom: 10, flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Sliders size={18} style={{ color: 'var(--cyan)' }} />
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: isLight ? '#0f172a' : '#f8fafc' }}>
                  İndikatör & Analiz Ayarları
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowSettingsModal(false)}
                style={{ background: 'transparent', border: 'none', color: isLight ? '#64748b' : '#94a3b8', cursor: 'pointer', padding: 4 }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Sekme Seçici (Genel vs Dinamik Fib) */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 14, background: isLight ? '#f1f5f9' : 'rgba(0,0,0,0.4)', padding: 3, borderRadius: 8, border: isLight ? '1px solid #e2e8f0' : '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
              <button
                type="button"
                onClick={() => setSettingsTab('general')}
                style={{
                  flex: 1,
                  padding: '6px 12px',
                  fontSize: 11,
                  fontWeight: settingsTab === 'general' ? 700 : 500,
                  borderRadius: 6,
                  border: 'none',
                  background: settingsTab === 'general' ? 'rgba(0, 229, 255, 0.15)' : 'transparent',
                  color: settingsTab === 'general' ? (isLight ? '#0284c7' : 'var(--cyan)') : (isLight ? '#64748b' : 'var(--text-muted)'),
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  transition: 'all 0.15s ease'
                }}
              >
                <Activity size={13} />
                <span>Genel İndikatörler & Renkler</span>
              </button>
              <button
                type="button"
                onClick={() => setSettingsTab('fib')}
                style={{
                  flex: 1,
                  padding: '6px 12px',
                  fontSize: 11,
                  fontWeight: settingsTab === 'fib' ? 700 : 500,
                  borderRadius: 6,
                  border: 'none',
                  background: settingsTab === 'fib' ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
                  color: settingsTab === 'fib' ? '#38bdf8' : (isLight ? '#64748b' : 'var(--text-muted)'),
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  transition: 'all 0.15s ease'
                }}
              >
                <Sliders size={13} />
                <span>📐 Oto Fibonacci (-0.618 & 1.618)</span>
              </button>
            </div>

            {/* Modal İçerik Gövdesi (Scrollable) */}
            <div style={{ overflowY: 'auto', flex: 1, paddingRight: 6, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {settingsTab === 'general' ? (
                <>
                  {/* 🧭 KAMA Pro (Adaptif Kaufman Hareketli Ortalaması) */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '10px 12px', background: isLight ? '#f0fdf4' : 'rgba(0, 230, 118, 0.06)', border: `1px solid ${isLight ? '#bbf7d0' : 'rgba(0, 230, 118, 0.25)'}`, borderRadius: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                      <div>
                        <div style={{ fontWeight: 700, color: indicatorSettings.kamaUpColor || '#00e676', fontSize: 12 }}>
                          🧭 KAMA Pro (Adaptif Kaufman Ortalaması)
                        </div>
                        <div style={{ fontSize: 9.5, color: isLight ? '#64748b' : '#94a3b8' }}>
                          Gürültü filtreli 2-renkli adaptif trend eğrisi (Yükseliş / Düşüş)
                        </div>
                      </div>

                      {/* KAMA Renk Seçicileri */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span style={{ fontSize: 9.5, fontWeight: 600, color: indicatorSettings.kamaUpColor || '#00e676' }}>🟢 Yükseliş:</span>
                          <input
                            type="color"
                            value={indicatorSettings.kamaUpColor || '#00e676'}
                            onChange={e => updateIndicatorSettings(prev => ({ ...prev, kamaUpColor: e.target.value }))}
                            style={{ width: 24, height: 22, padding: 0, border: '1px solid rgba(255,255,255,0.2)', borderRadius: 4, background: 'transparent', cursor: 'pointer' }}
                            title="KAMA Yükseliş Rengini Seçin"
                          />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span style={{ fontSize: 9.5, fontWeight: 600, color: indicatorSettings.kamaDownColor || '#ef4444' }}>🔴 Düşüş:</span>
                          <input
                            type="color"
                            value={indicatorSettings.kamaDownColor || '#ef4444'}
                            onChange={e => updateIndicatorSettings(prev => ({ ...prev, kamaDownColor: e.target.value }))}
                            style={{ width: 24, height: 22, padding: 0, border: '1px solid rgba(255,255,255,0.2)', borderRadius: 4, background: 'transparent', cursor: 'pointer' }}
                            title="KAMA Düşüş Rengini Seçin"
                          />
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6, paddingTop: 6, borderTop: isLight ? '1px solid #dcfce7' : '1px solid rgba(255,255,255,0.06)' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <span style={{ fontSize: 9, color: isLight ? '#64748b' : '#94a3b8' }}>ER Per.</span>
                        <input
                          type="number"
                          min={2}
                          max={60}
                          value={indicatorSettings.kamaErPeriod || 10}
                          onChange={e => updateIndicatorSettings(prev => ({ ...prev, kamaErPeriod: Math.max(2, parseInt(e.target.value) || 10) }))}
                          style={{ width: '100%', padding: '3px 4px', background: isLight ? '#ffffff' : '#03050c', border: `1px solid ${isLight ? '#cbd5e1' : 'rgba(0, 230, 118, 0.45)'}`, borderRadius: 5, color: isLight ? '#0f172a' : '#fff', textAlign: 'center', fontFamily: 'monospace', fontWeight: 700, fontSize: 11 }}
                          title="Verimlilik Oranı (Efficiency Ratio) Periyodu (Varsayılan: 10)"
                        />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <span style={{ fontSize: 9, color: isLight ? '#64748b' : '#94a3b8' }}>Hızlı Per.</span>
                        <input
                          type="number"
                          min={1}
                          max={30}
                          value={indicatorSettings.kamaFastPeriod || 5}
                          onChange={e => updateIndicatorSettings(prev => ({ ...prev, kamaFastPeriod: Math.max(1, parseInt(e.target.value) || 5) }))}
                          style={{ width: '100%', padding: '3px 4px', background: isLight ? '#ffffff' : '#03050c', border: `1px solid ${isLight ? '#cbd5e1' : 'rgba(0, 230, 118, 0.45)'}`, borderRadius: 5, color: isLight ? '#0f172a' : '#fff', textAlign: 'center', fontFamily: 'monospace', fontWeight: 700, fontSize: 11 }}
                          title="Hızlı Periyot (Varsayılan: 5)"
                        />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <span style={{ fontSize: 9, color: isLight ? '#64748b' : '#94a3b8' }}>Yavaş Per.</span>
                        <input
                          type="number"
                          min={5}
                          max={100}
                          value={indicatorSettings.kamaSlowPeriod || 30}
                          onChange={e => updateIndicatorSettings(prev => ({ ...prev, kamaSlowPeriod: Math.max(5, parseInt(e.target.value) || 30) }))}
                          style={{ width: '100%', padding: '3px 4px', background: isLight ? '#ffffff' : '#03050c', border: `1px solid ${isLight ? '#cbd5e1' : 'rgba(0, 230, 118, 0.45)'}`, borderRadius: 5, color: isLight ? '#0f172a' : '#fff', textAlign: 'center', fontFamily: 'monospace', fontWeight: 700, fontSize: 11 }}
                          title="Yavaş Periyot (Varsayılan: 30)"
                        />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <span style={{ fontSize: 9, color: isLight ? '#64748b' : '#94a3b8' }}>StDev Per.</span>
                        <input
                          type="number"
                          min={2}
                          max={100}
                          value={indicatorSettings.kamaFilterPeriod || 20}
                          onChange={e => updateIndicatorSettings(prev => ({ ...prev, kamaFilterPeriod: Math.max(2, parseInt(e.target.value) || 20) }))}
                          style={{ width: '100%', padding: '3px 4px', background: isLight ? '#ffffff' : '#03050c', border: `1px solid ${isLight ? '#cbd5e1' : 'rgba(56, 189, 248, 0.45)'}`, borderRadius: 5, color: isLight ? '#0f172a' : '#fff', textAlign: 'center', fontFamily: 'monospace', fontWeight: 700, fontSize: 11 }}
                          title="Filtre StDev Periyodu (Varsayılan: 20)"
                        />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <span style={{ fontSize: 9, color: isLight ? '#64748b' : '#94a3b8' }}>Çarpan</span>
                        <input
                          type="number"
                          min={0.1}
                          max={5.0}
                          step={0.1}
                          value={indicatorSettings.kamaFilterMult ?? 2}
                          onChange={e => updateIndicatorSettings(prev => ({ ...prev, kamaFilterMult: Math.max(0.1, parseFloat(e.target.value) || 2) }))}
                          style={{ width: '100%', padding: '3px 4px', background: isLight ? '#ffffff' : '#03050c', border: `1px solid ${isLight ? '#cbd5e1' : 'rgba(245, 158, 11, 0.5)'}`, borderRadius: 5, color: isLight ? '#0f172a' : '#fff', textAlign: 'center', fontFamily: 'monospace', fontWeight: 700, fontSize: 11 }}
                          title="Filtre Çarpanı (Varsayılan: 2)"
                        />
                      </div>
                    </div>
                  </div>

                  {/* ⚡ 24 RSI & 55 SMA Çift Teyitli Trend Ortalaması Ayarları */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '10px 12px', background: isLight ? '#f0fdf4' : 'rgba(16, 185, 129, 0.06)', border: `1px solid ${isLight ? '#bbf7d0' : 'rgba(16, 185, 129, 0.25)'}`, borderRadius: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                      <div>
                        <div style={{ fontWeight: 700, color: indicatorSettings.trendUpColor || '#10b981', fontSize: 12, display: 'flex', alignItems: 'center', gap: 5 }}>
                          <span>⚡ Trend HO (24 RSI & 55 SMA)</span>
                          <span style={{ fontSize: 9.5, padding: '1px 5px', borderRadius: 4, background: 'rgba(16, 185, 129, 0.2)', color: indicatorSettings.trendUpColor || '#10b981' }}>2-Bar Teyitli</span>
                        </div>
                        <div style={{ fontSize: 9.5, color: isLight ? '#64748b' : '#94a3b8' }}>
                          Fiyat &gt; HO üstünde 2 bar: Yeşil Boğa • Fiyat &lt; HO altında 2 bar: Kırmızı Ayı (Fake kırılımlara karşı korumalı)
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span style={{ fontSize: 9, color: isLight ? '#64748b' : '#94a3b8' }}>Boğa:</span>
                          <input
                            type="color"
                            value={indicatorSettings.trendUpColor || '#10b981'}
                            onChange={e => updateIndicatorSettings(prev => ({ ...prev, trendUpColor: e.target.value }))}
                            style={{ width: 22, height: 20, padding: 0, border: 'none', background: 'transparent', cursor: 'pointer' }}
                            title="Boğa / Yükseliş Çizgi Rengi"
                          />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span style={{ fontSize: 9, color: isLight ? '#64748b' : '#94a3b8' }}>Ayı:</span>
                          <input
                            type="color"
                            value={indicatorSettings.trendDownColor || '#ef4444'}
                            onChange={e => updateIndicatorSettings(prev => ({ ...prev, trendDownColor: e.target.value }))}
                            style={{ width: 22, height: 20, padding: 0, border: 'none', background: 'transparent', cursor: 'pointer' }}
                            title="Ayı / Düşüş Çizgi Rengi"
                          />
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(75px, 1fr))', gap: 6, paddingTop: 4, borderTop: isLight ? '1px solid #dcfce7' : '1px solid rgba(255,255,255,0.06)' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <span style={{ fontSize: 9, color: isLight ? '#64748b' : '#94a3b8' }}>HO Periyodu</span>
                        <input
                          type="number"
                          min={5}
                          max={200}
                          value={indicatorSettings.trendMaPeriod || 55}
                          onChange={e => updateIndicatorSettings(prev => ({ ...prev, trendMaPeriod: Math.max(5, parseInt(e.target.value) || 55) }))}
                          style={{ width: '100%', padding: '3px 4px', background: isLight ? '#ffffff' : '#03050c', border: `1px solid ${isLight ? '#cbd5e1' : 'rgba(16, 185, 129, 0.45)'}`, borderRadius: 5, color: isLight ? '#0f172a' : '#fff', textAlign: 'center', fontFamily: 'monospace', fontWeight: 700, fontSize: 11 }}
                          title="Fiyat Hareketli Ortalama Periyodu (Varsayılan: 55)"
                        />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <span style={{ fontSize: 9, color: isLight ? '#64748b' : '#94a3b8' }}>HO Tipi</span>
                        <select
                          value={indicatorSettings.trendMaType || 'SMA'}
                          onChange={e => updateIndicatorSettings(prev => ({ ...prev, trendMaType: e.target.value }))}
                          style={{ width: '100%', padding: '3px 4px', background: isLight ? '#ffffff' : '#03050c', border: `1px solid ${isLight ? '#cbd5e1' : 'rgba(16, 185, 129, 0.45)'}`, borderRadius: 5, color: isLight ? '#0f172a' : '#fff', textAlign: 'center', fontFamily: 'monospace', fontWeight: 700, fontSize: 11 }}
                        >
                          <option value="SMA">SMA</option>
                          <option value="EMA">EMA</option>
                        </select>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <span style={{ fontSize: 9, color: isLight ? '#64748b' : '#94a3b8' }}>Teyit Mumu</span>
                        <input
                          type="number"
                          min={1}
                          max={5}
                          value={indicatorSettings.trendConfirmBars || 2}
                          onChange={e => updateIndicatorSettings(prev => ({ ...prev, trendConfirmBars: Math.max(1, parseInt(e.target.value) || 2) }))}
                          style={{ width: '100%', padding: '3px 4px', background: isLight ? '#ffffff' : '#03050c', border: `1px solid ${isLight ? '#cbd5e1' : 'rgba(16, 185, 129, 0.45)'}`, borderRadius: 5, color: isLight ? '#0f172a' : '#fff', textAlign: 'center', fontFamily: 'monospace', fontWeight: 700, fontSize: 11 }}
                          title="Teyit Mumu Sayısı (Varsayılan: 2 bar üst üste kapanış şartı)"
                        />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <span style={{ fontSize: 9, color: isLight ? '#64748b' : '#94a3b8' }}>RSI Per.</span>
                        <input
                          type="number"
                          min={5}
                          max={50}
                          value={indicatorSettings.trendRsiPeriod || 24}
                          onChange={e => updateIndicatorSettings(prev => ({ ...prev, trendRsiPeriod: Math.max(5, parseInt(e.target.value) || 24) }))}
                          style={{ width: '100%', padding: '3px 4px', background: isLight ? '#ffffff' : '#03050c', border: `1px solid ${isLight ? '#cbd5e1' : 'rgba(56, 189, 248, 0.45)'}`, borderRadius: 5, color: isLight ? '#0f172a' : '#fff', textAlign: 'center', fontFamily: 'monospace', fontWeight: 700, fontSize: 11 }}
                          title="Momentum RSI Periyodu (Varsayılan: 24)"
                        />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <span style={{ fontSize: 9, color: isLight ? '#64748b' : '#94a3b8' }}>RSI HO Per.</span>
                        <input
                          type="number"
                          min={5}
                          max={100}
                          value={indicatorSettings.trendRsiMaPeriod || 55}
                          onChange={e => updateIndicatorSettings(prev => ({ ...prev, trendRsiMaPeriod: Math.max(5, parseInt(e.target.value) || 55) }))}
                          style={{ width: '100%', padding: '3px 4px', background: isLight ? '#ffffff' : '#03050c', border: `1px solid ${isLight ? '#cbd5e1' : 'rgba(245, 158, 11, 0.5)'}`, borderRadius: 5, color: isLight ? '#0f172a' : '#fff', textAlign: 'center', fontFamily: 'monospace', fontWeight: 700, fontSize: 11 }}
                          title="RSI Ortalaması Periyodu (Varsayılan: 55 SMA)"
                        />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontSize: 9, color: isLight ? '#64748b' : '#94a3b8' }}>Sinyal Okları</span>
                        <button
                          type="button"
                          onClick={() => updateIndicatorSettings(prev => ({ ...prev, trendShowMarkers: prev.trendShowMarkers === false }))}
                          className="chip-btn"
                          style={{
                            fontSize: 9.5,
                            padding: '3px 8px',
                            fontWeight: 700,
                            color: indicatorSettings.trendShowMarkers !== false ? '#10b981' : '#64748b',
                            borderColor: indicatorSettings.trendShowMarkers !== false ? '#10b981' : (isLight ? '#cbd5e1' : 'rgba(255,255,255,0.1)'),
                            background: indicatorSettings.trendShowMarkers !== false ? 'rgba(16, 185, 129, 0.15)' : 'transparent'
                          }}
                        >
                          {indicatorSettings.trendShowMarkers !== false ? 'Açık ✓' : 'Kapalı'}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* ⚓ AVWAP (Çapalı Hacim Ağırlıklı Ortalama Fiyat) Ayarları */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '10px 12px', background: isLight ? '#ecfeff' : 'rgba(6, 182, 212, 0.06)', border: `1px solid ${isLight ? '#a5f3fc' : 'rgba(6, 182, 212, 0.25)'}`, borderRadius: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                      <div>
                        <div style={{ fontWeight: 700, color: indicatorSettings.avwapColor || '#06b6d4', fontSize: 12 }}>
                          ⚓ AVWAP (Çapalı Hacim Ağırlıklı Ortalama)
                        </div>
                        <div style={{ fontSize: 9.5, color: isLight ? '#64748b' : '#94a3b8' }}>
                          Kurumsal maliyet başlangıç noktasını belirleyin veya grafikteki herhangi bir muma çapa atın
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 9.5, fontWeight: 600, color: isLight ? '#475569' : '#cbd5e1' }}>Renk:</span>
                        <input
                          type="color"
                          value={indicatorSettings.avwapColor || '#06b6d4'}
                          onChange={e => updateIndicatorSettings(prev => ({ ...prev, avwapColor: e.target.value }))}
                          style={{ width: 24, height: 22, padding: 0, border: 'none', background: 'transparent', cursor: 'pointer' }}
                          title="AVWAP Çizgi Rengi"
                        />
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', paddingTop: 4, borderTop: isLight ? '1px solid #cffafe' : '1px solid rgba(255,255,255,0.06)' }}>
                      <span style={{ fontSize: 9.5, fontWeight: 600, color: isLight ? '#475569' : '#cbd5e1' }}>Çapa Modu:</span>
                      <button
                        type="button"
                        title="Hisse veya coinin trend rejimine göre (SMA50/200, döngü konumu, pivot olgunluğu) otomatik olarak Dip (Destek) veya Zirve (Direnç) çapası seçer"
                        onClick={() => {
                          updateIndicatorSettings(prev => ({ ...prev, avwapAnchorMode: 'auto', avwapAnchorTime: null }));
                          setIndicators(prev => ({ ...prev, avwap: true }));
                        }}
                        className="chip-btn"
                        style={{
                          fontSize: 10,
                          padding: '3px 8px',
                          fontWeight: (indicatorSettings.avwapAnchorMode || 'auto') === 'auto' ? 700 : 500,
                          borderColor: (indicatorSettings.avwapAnchorMode || 'auto') === 'auto' ? '#06b6d4' : (isLight ? '#cbd5e1' : 'rgba(255,255,255,0.1)'),
                          background: (indicatorSettings.avwapAnchorMode || 'auto') === 'auto' ? 'rgba(6, 182, 212, 0.2)' : 'transparent',
                          color: (indicatorSettings.avwapAnchorMode || 'auto') === 'auto' ? '#06b6d4' : (isLight ? '#475569' : '#cbd5e1')
                        }}
                      >
                        🤖 Akıllı Oto (Rejim)
                      </button>
                      <button
                        type="button"
                        title="Rejimden bağımsız olarak seçili tarama penceresindeki en düşük Dip mumuna (Destek AVWAP) çapa atar"
                        onClick={() => {
                          updateIndicatorSettings(prev => ({ ...prev, avwapAnchorMode: 'low', avwapAnchorTime: null }));
                          setIndicators(prev => ({ ...prev, avwap: true }));
                        }}
                        className="chip-btn"
                        style={{
                          fontSize: 10,
                          padding: '3px 8px',
                          fontWeight: indicatorSettings.avwapAnchorMode === 'low' ? 700 : 500,
                          borderColor: indicatorSettings.avwapAnchorMode === 'low' ? '#06b6d4' : (isLight ? '#cbd5e1' : 'rgba(255,255,255,0.1)'),
                          background: indicatorSettings.avwapAnchorMode === 'low' ? 'rgba(6, 182, 212, 0.2)' : 'transparent',
                          color: indicatorSettings.avwapAnchorMode === 'low' ? '#06b6d4' : (isLight ? '#475569' : '#cbd5e1')
                        }}
                      >
                        📉 Sabit Dip
                      </button>
                      <button
                        type="button"
                        title="Rejimden bağımsız olarak seçili tarama penceresindeki en yüksek Zirve mumuna (Arz Direnci AVWAP) çapa atar"
                        onClick={() => {
                          updateIndicatorSettings(prev => ({ ...prev, avwapAnchorMode: 'high', avwapAnchorTime: null }));
                          setIndicators(prev => ({ ...prev, avwap: true }));
                        }}
                        className="chip-btn"
                        style={{
                          fontSize: 10,
                          padding: '3px 8px',
                          fontWeight: indicatorSettings.avwapAnchorMode === 'high' ? 700 : 500,
                          borderColor: indicatorSettings.avwapAnchorMode === 'high' ? '#06b6d4' : (isLight ? '#cbd5e1' : 'rgba(255,255,255,0.1)'),
                          background: indicatorSettings.avwapAnchorMode === 'high' ? 'rgba(6, 182, 212, 0.2)' : 'transparent',
                          color: indicatorSettings.avwapAnchorMode === 'high' ? '#06b6d4' : (isLight ? '#475569' : '#cbd5e1')
                        }}
                      >
                        📈 Sabit Zirve
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          updateIndicatorSettings(prev => ({ ...prev, avwapAnchorMode: 'ytd', avwapAnchorTime: null }));
                          setIndicators(prev => ({ ...prev, avwap: true }));
                        }}
                        className="chip-btn"
                        style={{
                          fontSize: 10,
                          padding: '3px 8px',
                          fontWeight: indicatorSettings.avwapAnchorMode === 'ytd' ? 700 : 500,
                          borderColor: indicatorSettings.avwapAnchorMode === 'ytd' ? '#06b6d4' : (isLight ? '#cbd5e1' : 'rgba(255,255,255,0.1)'),
                          background: indicatorSettings.avwapAnchorMode === 'ytd' ? 'rgba(6, 182, 212, 0.2)' : 'transparent',
                          color: indicatorSettings.avwapAnchorMode === 'ytd' ? '#06b6d4' : (isLight ? '#475569' : '#cbd5e1')
                        }}
                      >
                        📅 YTD (Yılbaşı)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowSettingsModal(false);
                          setActiveDrawTool('pickAvwapAnchor');
                        }}
                        className="chip-btn"
                        style={{
                          fontSize: 10,
                          padding: '3px 8px',
                          fontWeight: indicatorSettings.avwapAnchorMode === 'custom' ? 700 : 600,
                          borderColor: '#06b6d4',
                          background: indicatorSettings.avwapAnchorMode === 'custom' ? 'rgba(6, 182, 212, 0.25)' : 'rgba(6, 182, 212, 0.1)',
                          color: '#06b6d4'
                        }}
                      >
                        🎯 Grafikten Muma Tıkla {indicatorSettings.avwapAnchorMode === 'custom' && indicatorSettings.avwapAnchorTime ? `✓ (${formatAvwapTime(indicatorSettings.avwapAnchorTime, chartInterval)})` : ''}
                      </button>
                    </div>

                    {((indicatorSettings.avwapAnchorMode || 'auto') === 'auto' || indicatorSettings.avwapAnchorMode === 'low' || indicatorSettings.avwapAnchorMode === 'high') && (
                      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'center', paddingTop: 4, borderTop: isLight ? '1px solid #cffafe' : '1px solid rgba(255,255,255,0.06)' }}>
                        <span style={{ fontSize: 9.5, fontWeight: 600, color: isLight ? '#475569' : '#cbd5e1' }}>Tarama Penceresi:</span>
                        {[
                          { id: 'cycle', label: 'Oto (Döngü)', tip: 'Zaman dilimine uygun takvim döngüsü (1S:45g, 4S:150g, 1G:1Y, 1H:2Y)' },
                          { id: '6m', label: '6 Ay', tip: 'Son 6 aylık takvim penceresindeki majör swing dip/zirveye çapa atar' },
                          { id: '1y', label: '1 Yıl', tip: 'Son 1 yıllık takvim penceresindeki majör swing dip/zirveye çapa atar' },
                          { id: 'all', label: 'Tümü', tip: 'Yüklü tüm grafik geçmişindeki en derin dip / en yüksek zirveye çapa atar' },
                          { id: 'visible', label: '👁️ Ekrandaki Alan', tip: 'Yalnızca şu an grafikte görünen mum aralığındaki en dip / zirveye çapa atar' }
                        ].map(opt => {
                          const isActive = (indicatorSettings.avwapLookback || 'cycle') === opt.id;
                          return (
                            <button
                              key={opt.id}
                              type="button"
                              title={opt.tip}
                              onClick={() => {
                                updateIndicatorSettings(prev => ({ ...prev, avwapLookback: opt.id }));
                                setIndicators(prev => ({ ...prev, avwap: true }));
                              }}
                              className="chip-btn"
                              style={{
                                fontSize: 9.5,
                                padding: '2px 7px',
                                fontWeight: isActive ? 700 : 500,
                                borderColor: isActive ? '#06b6d4' : (isLight ? '#cbd5e1' : 'rgba(255,255,255,0.1)'),
                                background: isActive ? 'rgba(6, 182, 212, 0.2)' : 'transparent',
                                color: isActive ? '#06b6d4' : (isLight ? '#475569' : '#cbd5e1')
                              }}
                            >
                              {opt.label}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {indicators.avwap && latestAvwapState && (
                      <div style={{ fontSize: 9.5, color: isLight ? '#0e7490' : '#67e8f9', background: isLight ? 'rgba(6, 182, 212, 0.1)' : 'rgba(6, 182, 212, 0.08)', padding: '5px 8px', borderRadius: 5, fontFamily: 'monospace', display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <div>
                          <strong>Aktif Çapa:</strong> {latestAvwapState.anchorType} • Tarih: {formatAvwapTime(latestAvwapState.anchorTime, chartInterval, true)} • Seviye: {formatAvwapPriceExact(latestAvwapState.anchorPrice)} • AVWAP: {latestAvwapState.value}{latestAvwapState.barCount ? ` (${latestAvwapState.barCount} bar)` : ''}
                        </div>
                        {latestAvwapState.decisionReason && (
                          <div style={{ opacity: 0.92, fontFamily: 'inherit' }}>
                            <strong>Karar Kriteri:</strong> {latestAvwapState.decisionReason}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* 🛡️ İz Süren Stop (ATR Trailing Stop / Kâr Kilidi) */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '10px 12px', background: isLight ? '#fffbeb' : 'rgba(245, 158, 11, 0.06)', border: `1px solid ${isLight ? '#fde68a' : 'rgba(245, 158, 11, 0.25)'}`, borderRadius: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                      <div>
                        <div style={{ fontWeight: 700, color: indicatorSettings.trailingStopColor || '#f59e0b', fontSize: 12 }}>
                          🛡️ İz Süren Stop (ATR Trailing Stop / Kâr Kilidi)
                        </div>
                        <div style={{ fontSize: 9.5, color: isLight ? '#64748b' : '#94a3b8' }}>
                          Volatiliteye duyarlı dinamik kâr koruma ve trend takip kalkanı (Chandelier Exit)
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 9.5, fontWeight: 600, color: isLight ? '#475569' : '#cbd5e1' }}>Renk:</span>
                        <input
                          type="color"
                          value={indicatorSettings.trailingStopColor || '#f59e0b'}
                          onChange={e => updateIndicatorSettings(prev => ({ ...prev, trailingStopColor: e.target.value }))}
                          style={{ width: 24, height: 22, padding: 0, border: 'none', background: 'transparent', cursor: 'pointer' }}
                          title="İz Süren Stop Çizgi Rengi"
                        />
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, paddingTop: 4, borderTop: isLight ? '1px solid #fef3c7' : '1px solid rgba(255,255,255,0.06)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 9.5, fontWeight: 600, color: isLight ? '#475569' : '#cbd5e1' }}>ATR Çarpanı:</span>
                        {[1.5, 2.0, 2.5, 3.0, 3.5].map(mult => (
                          <button
                            key={mult}
                            type="button"
                            onClick={() => updateIndicatorSettings(prev => ({ ...prev, trailingStopMult: mult }))}
                            className="chip-btn"
                            style={{
                              fontSize: 9.5,
                              padding: '2px 7px',
                              fontWeight: (indicatorSettings.trailingStopMult ?? 2.5) === mult ? 800 : 500,
                              borderColor: (indicatorSettings.trailingStopMult ?? 2.5) === mult ? '#f59e0b' : (isLight ? '#cbd5e1' : 'rgba(255,255,255,0.1)'),
                              background: (indicatorSettings.trailingStopMult ?? 2.5) === mult ? 'rgba(245, 158, 11, 0.25)' : 'transparent',
                              color: (indicatorSettings.trailingStopMult ?? 2.5) === mult ? '#f59e0b' : (isLight ? '#475569' : '#cbd5e1')
                            }}
                          >
                            {mult}x
                          </button>
                        ))}
                        <input
                          type="number"
                          min={0.5}
                          max={10.0}
                          step={0.1}
                          value={indicatorSettings.trailingStopMult ?? 2.5}
                          onChange={e => updateIndicatorSettings(prev => ({ ...prev, trailingStopMult: Math.max(0.5, parseFloat(e.target.value) || 2.5) }))}
                          style={{ width: 48, padding: '2px 4px', background: isLight ? '#ffffff' : '#03050c', border: '1px solid rgba(245, 158, 11, 0.5)', borderRadius: 5, color: isLight ? '#0f172a' : '#fff', textAlign: 'center', fontFamily: 'monospace', fontWeight: 700, fontSize: 10.5 }}
                          title="Özel ATR Çarpanı"
                        />
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <span style={{ fontSize: 9.5, fontWeight: 600, color: isLight ? '#475569' : '#cbd5e1' }}>ATR Periyodu:</span>
                        <input
                          type="number"
                          min={5}
                          max={100}
                          value={indicatorSettings.trailingStopPeriod || 14}
                          onChange={e => updateIndicatorSettings(prev => ({ ...prev, trailingStopPeriod: Math.max(5, parseInt(e.target.value) || 14) }))}
                          style={{ width: 48, padding: '2px 4px', background: isLight ? '#ffffff' : '#03050c', border: '1px solid rgba(245, 158, 11, 0.5)', borderRadius: 5, color: isLight ? '#0f172a' : '#fff', textAlign: 'center', fontFamily: 'monospace', fontWeight: 700, fontSize: 10.5 }}
                          title="ATR Volatilite Periyodu (Varsayılan: 14)"
                        />
                        <span style={{ fontSize: 9.5, color: isLight ? '#64748b' : '#94a3b8' }}>bar</span>
                      </div>
                    </div>
                  </div>

                  {/* 🎨 Seviye & Çizgi Renkleri (Maliyet, POC) */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '10px 12px', background: isLight ? '#f8fafc' : 'rgba(255, 255, 255, 0.03)', border: `1px solid ${isLight ? '#e2e8f0' : 'rgba(255, 255, 255, 0.08)'}`, borderRadius: 8 }}>
                    <div style={{ fontWeight: 700, fontSize: 12, color: isLight ? '#0f172a' : '#f8fafc', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span>🎨 Portföy Maliyeti & POC Seviye Renkleri</span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                      {/* 🏷️ Portföy Maliyet Çizgisi */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '6px 8px', background: isLight ? '#ffffff' : 'rgba(0,0,0,0.3)', border: `1px solid ${indicatorSettings.costLineColor || '#eab308'}55`, borderRadius: 6 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: 10, fontWeight: 700, color: indicatorSettings.costLineColor || '#eab308' }}>🏷️ Maliyet Çizgisi</span>
                          <input
                            type="color"
                            value={indicatorSettings.costLineColor || '#eab308'}
                            onChange={e => updateIndicatorSettings(prev => ({ ...prev, costLineColor: e.target.value }))}
                            style={{ width: 22, height: 20, padding: 0, border: 'none', background: 'transparent', cursor: 'pointer' }}
                            title="Portföy Maliyet Çizgisi Rengi"
                          />
                        </div>
                        <span style={{ fontSize: 9, color: isLight ? '#64748b' : '#94a3b8' }}>Ortalama hisse maliyetiniz</span>
                      </div>

                      {/* 📊 POC */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '6px 8px', background: isLight ? '#ffffff' : 'rgba(0,0,0,0.3)', border: `1px solid ${indicatorSettings.pocColor || '#d946ef'}55`, borderRadius: 6 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: 10, fontWeight: 700, color: indicatorSettings.pocColor || '#d946ef' }}>📊 POC Mıknatısı</span>
                          <input
                            type="color"
                            value={indicatorSettings.pocColor || '#d946ef'}
                            onChange={e => updateIndicatorSettings(prev => ({ ...prev, pocColor: e.target.value }))}
                            style={{ width: 22, height: 20, padding: 0, border: 'none', background: 'transparent', cursor: 'pointer' }}
                            title="Volume Profile POC Mıknatıs Rengi"
                          />
                        </div>
                        <span style={{ fontSize: 9, color: isLight ? '#64748b' : '#94a3b8' }}>En yoğun takas seviyesi</span>
                      </div>
                    </div>
                  </div>

                  {/* RSI Periyodu */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 8px', background: isLight ? '#fdf2f8' : 'rgba(236, 72, 153, 0.05)', borderRadius: 6, border: isLight ? '1px solid #fbcfe8' : 'none' }}>
                    <div>
                      <div style={{ fontWeight: 600, color: '#ec4899' }}>RSI Periyodu</div>
                      <div style={{ fontSize: 10, color: isLight ? '#64748b' : '#94a3b8' }}>Varsayılan 14 • Uzun vade ve trend için 24 idealdir</div>
                    </div>
                    <input
                      type="number"
                      min={2}
                      max={100}
                      value={indicatorSettings.rsiPeriod}
                      onChange={e => updateIndicatorSettings(prev => ({ ...prev, rsiPeriod: Math.max(2, parseInt(e.target.value) || 14) }))}
                      style={{ width: 65, padding: '4px 8px', background: isLight ? '#ffffff' : '#03050c', border: '1px solid rgba(236, 72, 153, 0.5)', borderRadius: 6, color: isLight ? '#0f172a' : '#fff', textAlign: 'center', fontFamily: 'monospace', fontWeight: 700 }}
                    />
                  </div>

                  {/* RSI MA Periyodu */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 8px', background: isLight ? '#fefce8' : 'rgba(250, 204, 21, 0.05)', borderRadius: 6, border: isLight ? '1px solid #fef08a' : 'none' }}>
                    <div>
                      <div style={{ fontWeight: 600, color: isLight ? '#ca8a04' : '#facc15' }}>RSI MA (Hareketli Ortalama) Periyodu</div>
                      <div style={{ fontSize: 10, color: isLight ? '#64748b' : '#94a3b8' }}>RSI için yumuşatılmış SMA eğrisi (Varsayılan: 14)</div>
                    </div>
                    <input
                      type="number"
                      min={2}
                      max={100}
                      value={indicatorSettings.rsiMaPeriod || 14}
                      onChange={e => updateIndicatorSettings(prev => ({ ...prev, rsiMaPeriod: Math.max(2, parseInt(e.target.value) || 14) }))}
                      style={{ width: 65, padding: '4px 8px', background: isLight ? '#ffffff' : '#03050c', border: '1px solid rgba(250, 204, 21, 0.5)', borderRadius: 6, color: isLight ? '#0f172a' : '#fff', textAlign: 'center', fontFamily: 'monospace', fontWeight: 700 }}
                    />
                  </div>

                  {/* MA 1 (EMA / SMA) Periyot & Renk */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 8px', background: isLight ? '#fef2f2' : 'rgba(239, 68, 68, 0.05)', borderRadius: 6, border: isLight ? '1px solid #fecaca' : 'none' }}>
                    <div>
                      <div style={{ fontWeight: 600, color: indicatorSettings.ema1Color || '#ef4444' }}>
                        MA 1 ({indicatorSettings.ema1Type || 'EMA'}) - Hızlı Momentum
                      </div>
                      <div style={{ fontSize: 10, color: isLight ? '#64748b' : '#94a3b8' }}>Kısa vadeli trend (Varsayılan: EMA 20)</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {/* EMA / SMA Tipi */}
                      <div style={{ display: 'flex', gap: 2, background: isLight ? '#e2e8f0' : 'rgba(0,0,0,0.4)', padding: 2, borderRadius: 5 }}>
                        <button
                          type="button"
                          onClick={() => updateIndicatorSettings(prev => ({ ...prev, ema1Type: 'EMA' }))}
                          style={{
                            fontSize: 9.5,
                            padding: '2px 7px',
                            borderRadius: 4,
                            border: 'none',
                            cursor: 'pointer',
                            fontWeight: (indicatorSettings.ema1Type || 'EMA') === 'EMA' ? 800 : 500,
                            background: (indicatorSettings.ema1Type || 'EMA') === 'EMA' ? (indicatorSettings.ema1Color || '#ef4444') : 'transparent',
                            color: (indicatorSettings.ema1Type || 'EMA') === 'EMA' ? '#fff' : (isLight ? '#64748b' : '#94a3b8')
                          }}
                        >
                          EMA
                        </button>
                        <button
                          type="button"
                          onClick={() => updateIndicatorSettings(prev => ({ ...prev, ema1Type: 'SMA' }))}
                          style={{
                            fontSize: 9.5,
                            padding: '2px 7px',
                            borderRadius: 4,
                            border: 'none',
                            cursor: 'pointer',
                            fontWeight: indicatorSettings.ema1Type === 'SMA' ? 800 : 500,
                            background: indicatorSettings.ema1Type === 'SMA' ? (indicatorSettings.ema1Color || '#ef4444') : 'transparent',
                            color: indicatorSettings.ema1Type === 'SMA' ? '#fff' : (isLight ? '#64748b' : '#94a3b8')
                          }}
                        >
                          SMA
                        </button>
                      </div>

                      <input
                        type="color"
                        value={indicatorSettings.ema1Color || '#ef4444'}
                        onChange={e => updateIndicatorSettings(prev => ({ ...prev, ema1Color: e.target.value }))}
                        style={{ width: 24, height: 24, padding: 0, border: 'none', background: 'transparent', cursor: 'pointer' }}
                        title="MA 1 Rengini Seçin"
                      />
                      <input
                        type="number"
                        min={2}
                        max={500}
                        value={indicatorSettings.ema1Period}
                        onChange={e => updateIndicatorSettings(prev => ({ ...prev, ema1Period: Math.max(2, parseInt(e.target.value) || 20) }))}
                        style={{ width: 60, padding: '4px 6px', background: isLight ? '#ffffff' : '#03050c', border: `1px solid ${indicatorSettings.ema1Color || '#ef4444'}`, borderRadius: 6, color: isLight ? '#0f172a' : '#fff', textAlign: 'center', fontFamily: 'monospace', fontWeight: 700 }}
                      />
                    </div>
                  </div>

                  {/* MA 2 (EMA / SMA) Periyot & Renk */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 8px', background: isLight ? '#eff6ff' : 'rgba(59, 130, 246, 0.05)', borderRadius: 6, border: isLight ? '1px solid #bfdbfe' : 'none' }}>
                    <div>
                      <div style={{ fontWeight: 600, color: indicatorSettings.ema2Color || '#3b82f6' }}>
                        MA 2 ({indicatorSettings.ema2Type || 'SMA'}) - Orta Vade
                      </div>
                      <div style={{ fontSize: 10, color: isLight ? '#64748b' : '#94a3b8' }}>Trend omurgası (Varsayılan: SMA 50)</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {/* EMA / SMA Tipi */}
                      <div style={{ display: 'flex', gap: 2, background: isLight ? '#e2e8f0' : 'rgba(0,0,0,0.4)', padding: 2, borderRadius: 5 }}>
                        <button
                          type="button"
                          onClick={() => updateIndicatorSettings(prev => ({ ...prev, ema2Type: 'EMA' }))}
                          style={{
                            fontSize: 9.5,
                            padding: '2px 7px',
                            borderRadius: 4,
                            border: 'none',
                            cursor: 'pointer',
                            fontWeight: indicatorSettings.ema2Type === 'EMA' ? 800 : 500,
                            background: indicatorSettings.ema2Type === 'EMA' ? (indicatorSettings.ema2Color || '#3b82f6') : 'transparent',
                            color: indicatorSettings.ema2Type === 'EMA' ? '#fff' : (isLight ? '#64748b' : '#94a3b8')
                          }}
                        >
                          EMA
                        </button>
                        <button
                          type="button"
                          onClick={() => updateIndicatorSettings(prev => ({ ...prev, ema2Type: 'SMA' }))}
                          style={{
                            fontSize: 9.5,
                            padding: '2px 7px',
                            borderRadius: 4,
                            border: 'none',
                            cursor: 'pointer',
                            fontWeight: (indicatorSettings.ema2Type || 'SMA') === 'SMA' ? 800 : 500,
                            background: (indicatorSettings.ema2Type || 'SMA') === 'SMA' ? (indicatorSettings.ema2Color || '#3b82f6') : 'transparent',
                            color: (indicatorSettings.ema2Type || 'SMA') === 'SMA' ? '#fff' : (isLight ? '#64748b' : '#94a3b8')
                          }}
                        >
                          SMA
                        </button>
                      </div>

                      <input
                        type="color"
                        value={indicatorSettings.ema2Color || '#3b82f6'}
                        onChange={e => updateIndicatorSettings(prev => ({ ...prev, ema2Color: e.target.value }))}
                        style={{ width: 24, height: 24, padding: 0, border: 'none', background: 'transparent', cursor: 'pointer' }}
                        title="MA 2 Rengini Seçin"
                      />
                      <input
                        type="number"
                        min={2}
                        max={500}
                        value={indicatorSettings.ema2Period}
                        onChange={e => updateIndicatorSettings(prev => ({ ...prev, ema2Period: Math.max(2, parseInt(e.target.value) || 50) }))}
                        style={{ width: 60, padding: '4px 6px', background: isLight ? '#ffffff' : '#03050c', border: `1px solid ${indicatorSettings.ema2Color || '#3b82f6'}`, borderRadius: 6, color: isLight ? '#0f172a' : '#fff', textAlign: 'center', fontFamily: 'monospace', fontWeight: 700 }}
                      />
                    </div>
                  </div>

                  {/* MA 3 (EMA / SMA) Periyot & Renk */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 8px', background: isLight ? '#fff7ed' : 'rgba(245, 158, 11, 0.05)', borderRadius: 6, border: isLight ? '1px solid #fed7aa' : 'none' }}>
                    <div>
                      <div style={{ fontWeight: 600, color: indicatorSettings.ema3Color || '#f97316' }}>
                        MA 3 ({indicatorSettings.ema3Type || 'SMA'}) - Ana Trend
                      </div>
                      <div style={{ fontSize: 10, color: isLight ? '#64748b' : '#94a3b8' }}>Boğa/Ayı sınırı (Varsayılan: SMA 200)</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {/* EMA / SMA Tipi */}
                      <div style={{ display: 'flex', gap: 2, background: isLight ? '#e2e8f0' : 'rgba(0,0,0,0.4)', padding: 2, borderRadius: 5 }}>
                        <button
                          type="button"
                          onClick={() => updateIndicatorSettings(prev => ({ ...prev, ema3Type: 'EMA' }))}
                          style={{
                            fontSize: 9.5,
                            padding: '2px 7px',
                            borderRadius: 4,
                            border: 'none',
                            cursor: 'pointer',
                            fontWeight: indicatorSettings.ema3Type === 'EMA' ? 800 : 500,
                            background: indicatorSettings.ema3Type === 'EMA' ? (indicatorSettings.ema3Color || '#f97316') : 'transparent',
                            color: indicatorSettings.ema3Type === 'EMA' ? '#fff' : (isLight ? '#64748b' : '#94a3b8')
                          }}
                        >
                          EMA
                        </button>
                        <button
                          type="button"
                          onClick={() => updateIndicatorSettings(prev => ({ ...prev, ema3Type: 'SMA' }))}
                          style={{
                            fontSize: 9.5,
                            padding: '2px 7px',
                            borderRadius: 4,
                            border: 'none',
                            cursor: 'pointer',
                            fontWeight: (indicatorSettings.ema3Type || 'SMA') === 'SMA' ? 800 : 500,
                            background: (indicatorSettings.ema3Type || 'SMA') === 'SMA' ? (indicatorSettings.ema3Color || '#f97316') : 'transparent',
                            color: (indicatorSettings.ema3Type || 'SMA') === 'SMA' ? '#fff' : (isLight ? '#64748b' : '#94a3b8')
                          }}
                        >
                          SMA
                        </button>
                      </div>

                      <input
                        type="color"
                        value={indicatorSettings.ema3Color || '#f97316'}
                        onChange={e => updateIndicatorSettings(prev => ({ ...prev, ema3Color: e.target.value }))}
                        style={{ width: 24, height: 24, padding: 0, border: 'none', background: 'transparent', cursor: 'pointer' }}
                        title="MA 3 Rengini Seçin"
                      />
                      <input
                        type="number"
                        min={2}
                        max={500}
                        value={indicatorSettings.ema3Period}
                        onChange={e => updateIndicatorSettings(prev => ({ ...prev, ema3Period: Math.max(2, parseInt(e.target.value) || 200) }))}
                        style={{ width: 60, padding: '4px 6px', background: isLight ? '#ffffff' : '#03050c', border: `1px solid ${indicatorSettings.ema3Color || '#f97316'}`, borderRadius: 6, color: isLight ? '#0f172a' : '#fff', textAlign: 'center', fontFamily: 'monospace', fontWeight: 700 }}
                      />
                    </div>
                  </div>

                  {/* Bollinger Ayarları */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 8px', background: isLight ? '#faf5ff' : 'rgba(192, 132, 252, 0.05)', borderRadius: 6, border: isLight ? '1px solid #e9d5ff' : 'none' }}>
                    <div>
                      <div style={{ fontWeight: 600, color: '#c084fc' }}>Bollinger Bantları</div>
                      <div style={{ fontSize: 10, color: isLight ? '#64748b' : '#94a3b8' }}>Periyot & Sapma (Varsayılan: 20, 2σ)</div>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <input
                        type="number"
                        min={5}
                        max={100}
                        value={indicatorSettings.bollingerPeriod}
                        onChange={e => updateIndicatorSettings(prev => ({ ...prev, bollingerPeriod: Math.max(5, parseInt(e.target.value) || 20) }))}
                        style={{ width: 45, padding: '4px 6px', background: isLight ? '#ffffff' : '#03050c', border: '1px solid rgba(192, 132, 252, 0.5)', borderRadius: 6, color: isLight ? '#0f172a' : '#fff', textAlign: 'center', fontFamily: 'monospace', fontWeight: 700 }}
                        title="Periyot"
                      />
                      <input
                        type="number"
                        min={1}
                        max={5}
                        step={0.5}
                        value={indicatorSettings.bollingerStdDev}
                        onChange={e => updateIndicatorSettings(prev => ({ ...prev, bollingerStdDev: Math.max(1, parseFloat(e.target.value) || 2) }))}
                        style={{ width: 45, padding: '4px 6px', background: isLight ? '#ffffff' : '#03050c', border: '1px solid rgba(192, 132, 252, 0.5)', borderRadius: 6, color: isLight ? '#0f172a' : '#fff', textAlign: 'center', fontFamily: 'monospace', fontWeight: 700 }}
                        title="Sapma Çarpanı (StdDev)"
                      />
                    </div>
                  </div>

                  {/* Otomatik Destek-Direnç Hassasiyeti */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 8px', background: isLight ? '#f0fdf4' : 'rgba(16, 185, 129, 0.05)', borderRadius: 6, border: isLight ? '1px solid #bbf7d0' : 'none' }}>
                    <div>
                      <div style={{ fontWeight: 600, color: '#10b981' }}>Destek / Direnç Lookback</div>
                      <div style={{ fontSize: 10, color: isLight ? '#64748b' : '#94a3b8' }}>Majör pivot aralığı (Varsayılan: 90 bar ~4.5 ay)</div>
                    </div>
                    <input
                      type="number"
                      min={20}
                      max={500}
                      value={indicatorSettings.srLookback}
                      onChange={e => updateIndicatorSettings(prev => ({ ...prev, srLookback: Math.max(20, parseInt(e.target.value) || 90) }))}
                      style={{ width: 65, padding: '4px 8px', background: isLight ? '#ffffff' : '#03050c', border: '1px solid rgba(16, 185, 129, 0.5)', borderRadius: 6, color: isLight ? '#0f172a' : '#fff', textAlign: 'center', fontFamily: 'monospace', fontWeight: 700 }}
                    />
                  </div>
                </>
              ) : (
                /* 📐 DİNAMİK FIBONACCI AYARLARI */
                <>
                  {/* Fib Üst Kontrol Kutusu */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '10px 12px', background: 'rgba(56, 189, 248, 0.05)', border: '1px solid rgba(56, 189, 248, 0.2)', borderRadius: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                      <div>
                        <div style={{ fontWeight: 700, color: '#38bdf8', fontSize: 12.5 }}>Dinamik Fibonacci Lookback</div>
                        <div style={{ fontSize: 10, color: '#94a3b8' }}>Tepe ve dip pivotlarını tespit etmek için taranan mum sayısı</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <input
                          type="number"
                          min={20}
                          max={1000}
                          value={indicatorSettings.fibLookback || 180}
                          onChange={e => updateIndicatorSettings(prev => ({ ...prev, fibLookback: Math.max(20, parseInt(e.target.value) || 180) }))}
                          style={{ width: 65, padding: '4px 8px', background: '#03050c', border: '1px solid rgba(56, 189, 248, 0.5)', borderRadius: 6, color: '#fff', textAlign: 'center', fontFamily: 'monospace', fontWeight: 700 }}
                        />
                        <span style={{ fontSize: 11, color: '#94a3b8' }}>bar</span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.06)', flexWrap: 'wrap', gap: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 11, color: '#cbd5e1' }}>Çizgi Metinleri:</span>
                        <button
                          type="button"
                          onClick={() => updateIndicatorSettings(prev => ({ ...prev, showLevelTitles: !prev.showLevelTitles }))}
                          className="chip-btn"
                          style={{
                            fontSize: 10,
                            padding: '2px 8px',
                            fontWeight: 700,
                            color: indicatorSettings.showLevelTitles ? '#38bdf8' : '#10b981',
                            borderColor: indicatorSettings.showLevelTitles ? '#38bdf8' : '#10b981',
                            background: indicatorSettings.showLevelTitles ? 'rgba(56, 189, 248, 0.15)' : 'rgba(16, 185, 129, 0.15)'
                          }}
                        >
                          {indicatorSettings.showLevelTitles ? 'Yazılar Açık' : '✓ Sade / Minimal'}
                        </button>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <button
                          type="button"
                          onClick={() => setAllFibLevels(true)}
                          className="chip-btn"
                          style={{ fontSize: 9.5, padding: '2px 7px', color: '#38bdf8', borderColor: 'rgba(56, 189, 248, 0.3)' }}
                          title="Tüm Fibonacci seviyelerini aç"
                        >
                          Tümünü Aç
                        </button>
                        <button
                          type="button"
                          onClick={() => setAllFibLevels(false)}
                          className="chip-btn"
                          style={{ fontSize: 9.5, padding: '2px 7px', color: '#94a3b8', borderColor: 'rgba(255, 255, 255, 0.15)' }}
                          title="Tüm seviyeleri kapat"
                        >
                          Tümünü Kapat
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Seviye Listesi Tablosu */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 8px', fontSize: 10, color: '#64748b', fontWeight: 600 }}>
                      <span>SEVİYE & AÇIKLAMA</span>
                      <span>RENK • KALINLIK • ÇİZGİ TİPİ</span>
                    </div>

                    {mergeFibLevels(indicatorSettings.fibLevels).map((lvl, idx) => (
                      <div
                        key={lvl.label}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '7px 10px',
                          background: lvl.enabled ? 'rgba(255, 255, 255, 0.03)' : 'rgba(255, 255, 255, 0.01)',
                          borderRadius: 8,
                          border: `1px solid ${lvl.enabled ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.03)'}`,
                          opacity: lvl.enabled ? 1 : 0.45,
                          transition: 'all 0.15s ease',
                          gap: 10
                        }}
                      >
                        {/* Sol: Checkbox + Seviye Etiketi + Açıklama */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 160 }}>
                          <input
                            type="checkbox"
                            checked={lvl.enabled}
                            onChange={e => updateFibLevel(idx, 'enabled', e.target.checked)}
                            style={{ cursor: 'pointer', accentColor: lvl.color || 'var(--cyan)', width: 16, height: 16 }}
                            id={`fib-chk-${lvl.label}`}
                          />
                          <label
                            htmlFor={`fib-chk-${lvl.label}`}
                            style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column' }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{
                                fontFamily: 'monospace',
                                fontWeight: 800,
                                fontSize: 12.5,
                                color: lvl.enabled ? (lvl.color || '#fff') : '#64748b'
                              }}>
                                {lvl.label}
                              </span>
                              {(lvl.ratio === -0.618 || lvl.ratio === 0.618 || lvl.ratio === 1.618 || lvl.ratio === 0.5) && (
                                <span style={{
                                  fontSize: 8.5,
                                  padding: '1px 5px',
                                  borderRadius: 4,
                                  background: lvl.ratio === -0.618 ? 'rgba(6, 182, 212, 0.18)' : lvl.ratio === 0.618 ? 'rgba(249, 115, 22, 0.2)' : lvl.ratio === 1.618 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.18)',
                                  color: lvl.ratio === -0.618 ? '#06b6d4' : lvl.ratio === 0.618 ? '#f97316' : lvl.ratio === 1.618 ? '#10b981' : '#ef4444',
                                  fontWeight: 700
                                }}>
                                  {lvl.ratio === -0.618 ? 'Hedef -0.618' : lvl.ratio === 0.618 ? 'Altın Oran' : lvl.ratio === 1.618 ? 'Genişleme 1.618' : '%50 Denge'}
                                </span>
                              )}
                            </div>
                            <span style={{ fontSize: 9.5, color: '#64748b' }}>{lvl.desc}</span>
                          </label>
                        </div>

                        {/* Sağ: Renk Seçici + Kalınlık + Çizgi Stili */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          {/* Renk Seçici */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <input
                              type="color"
                              value={lvl.color.startsWith('#') ? lvl.color : '#94a3b8'}
                              onChange={e => updateFibLevel(idx, 'color', e.target.value)}
                              disabled={!lvl.enabled}
                              style={{
                                width: 26,
                                height: 24,
                                padding: 0,
                                border: '1px solid rgba(255,255,255,0.2)',
                                borderRadius: 4,
                                background: 'transparent',
                                cursor: lvl.enabled ? 'pointer' : 'not-allowed'
                              }}
                              title="Çizgi Rengini Değiştir"
                            />
                            <span style={{ fontFamily: 'monospace', fontSize: 10, color: '#94a3b8', width: 50 }}>
                              {lvl.color}
                            </span>
                          </div>

                          {/* Kalınlık (1px, 2px, 3px) */}
                          <select
                            value={lvl.lineWidth || 1}
                            onChange={e => updateFibLevel(idx, 'lineWidth', parseInt(e.target.value))}
                            disabled={!lvl.enabled}
                            style={{
                              background: '#03050c',
                              border: '1px solid rgba(255,255,255,0.15)',
                              borderRadius: 5,
                              color: '#f8fafc',
                              padding: '3px 6px',
                              fontSize: 10.5,
                              cursor: lvl.enabled ? 'pointer' : 'not-allowed'
                            }}
                            title="Çizgi Kalınlığı"
                          >
                            <option value={1}>1 px</option>
                            <option value={2}>2 px</option>
                            <option value={3}>3 px</option>
                          </select>

                          {/* Çizgi Stili (Düz, Kesikli, Noktalı) */}
                          <select
                            value={lvl.lineStyle || 'solid'}
                            onChange={e => updateFibLevel(idx, 'lineStyle', e.target.value)}
                            disabled={!lvl.enabled}
                            style={{
                              background: '#03050c',
                              border: '1px solid rgba(255,255,255,0.15)',
                              borderRadius: 5,
                              color: '#f8fafc',
                              padding: '3px 6px',
                              fontSize: 10.5,
                              cursor: lvl.enabled ? 'pointer' : 'not-allowed'
                            }}
                            title="Çizgi Tipi"
                          >
                            <option value="solid">Düz ──</option>
                            <option value="dashed">Kesikli - -</option>
                            <option value="dotted">Noktalı ···</option>
                          </select>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Modal Alt Butonları */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, paddingTop: 12, borderTop: isLight ? '1px solid #e2e8f0' : '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
              <button
                type="button"
                onClick={() => {
                  if (settingsTab === 'fib') {
                    resetFibLevelsToDefault();
                  } else {
                    updateIndicatorSettings({
                      rsiPeriod: 24,
                      rsiMaPeriod: 14,
                      kamaVersion: 3,
                      kamaErPeriod: 10,
                      kamaFastPeriod: 5,
                      kamaSlowPeriod: 30,
                      kamaFilterPeriod: 20,
                      kamaFilterMult: 2,
                      kamaUpColor: '#00e676',
                      kamaDownColor: '#ef4444',
                      costLineColor: '#eab308',
                      avwapColor: '#06b6d4',
                      avwapAnchorMode: 'auto',
                      avwapAnchorTime: null,
                      avwapLookback: 'cycle',
                      pocColor: '#d946ef',
                      trailingStopColor: '#f59e0b',
                      trailingStopPeriod: 14,
                      trailingStopMult: 2.5,
                      ema1Type: 'EMA',
                      ema1Period: 20,
                      ema1Color: '#ef4444',
                      ema2Type: 'SMA',
                      ema2Period: 50,
                      ema2Color: '#3b82f6',
                      ema3Type: 'SMA',
                      ema3Period: 200,
                      ema3Color: '#f97316',
                      trendMaPeriod: 55,
                      trendMaType: 'SMA',
                      trendRsiPeriod: 24,
                      trendRsiMaPeriod: 55,
                      trendConfirmBars: 2,
                      trendUpColor: '#10b981',
                      trendDownColor: '#ef4444',
                      trendShowMarkers: true,
                      bollingerPeriod: 20,
                      bollingerStdDev: 2,
                      fibLookback: 180,
                      srLookback: 90,
                      showLevelTitles: false,
                      fibLevels: DEFAULT_FIB_LEVELS
                    });
                  }
                }}
                className="chip-btn"
                style={{ fontSize: 11, padding: '5px 12px', color: '#f87171', borderColor: 'rgba(239, 68, 68, 0.3)' }}
              >
                {settingsTab === 'fib' ? 'Fib Seviyelerini Sıfırla' : 'Varsayılana Sıfırla'}
              </button>
              <button
                type="button"
                onClick={() => setShowSettingsModal(false)}
                className="chip-btn"
                style={{ fontSize: 11, padding: '5px 18px', background: 'var(--cyan)', color: '#000', fontWeight: 700, border: 'none' }}
              >
                Uygula & Kapat
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
