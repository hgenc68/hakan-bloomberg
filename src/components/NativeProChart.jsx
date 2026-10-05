import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { 
  createChart, 
  CandlestickSeries, 
  LineSeries, 
  HistogramSeries, 
  LineStyle, 
  CrosshairMode 
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
  ExternalLink,
  Cloud,
  List
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
  if (!data || data.length <= period) return [];
  const rsi = [];
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

// Universal ticker normalizer across aliases (e.g. BTCUSDT -> BTC, BTC-USD -> BTC, THYAO.IS -> THYAO)
export function normalizeTicker(t) {
  if (!t) return '';
  let s = String(t).toUpperCase().trim();
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
  '^GSPC': '^GSPC',
  'NDX': '^IXIC',
  'NASDAQ': '^IXIC',
  '^IXIC': '^IXIC',
  'DJI': '^DJI',
  'DOW': '^DJI',
  '^DJI': '^DJI',
  'XU100': 'XU100.IS',
  'BIST100': 'XU100.IS',
  'XU030': 'XU030.IS',
  'BIST30': 'XU030.IS',
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

// Otomatik Dinamik Fibonacci Geri Çekilme (Genişletilmiş Makro Döngü Lookback)
export function calcAutoFib(data, lookback = 180) {
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

  const levels = [
    { ratio: '0.000', label: '0.000', price: isUptrend ? maxHigh : minLow, color: 'rgba(148, 163, 184, 0.35)' },
    { ratio: '0.236', label: '0.236', price: isUptrend ? maxHigh - 0.236 * diff : minLow + 0.236 * diff, color: 'rgba(192, 132, 252, 0.45)' },
    { ratio: '0.382', label: '0.382', price: isUptrend ? maxHigh - 0.382 * diff : minLow + 0.382 * diff, color: 'rgba(244, 114, 182, 0.45)' },
    { ratio: '0.500', label: '0.500', price: isUptrend ? maxHigh - 0.500 * diff : minLow + 0.500 * diff, color: '#ef4444' }, // 0.50 Kırmızı & Kalın
    { ratio: '0.618', label: '0.618', price: isUptrend ? maxHigh - 0.618 * diff : minLow + 0.618 * diff, color: '#f97316' }, // 0.618 Turuncu
    { ratio: '0.786', label: '0.786', price: isUptrend ? maxHigh - 0.786 * diff : minLow + 0.786 * diff, color: 'rgba(6, 182, 212, 0.45)' },
    { ratio: '1.000', label: '1.000', price: isUptrend ? minLow : maxHigh, color: 'rgba(148, 163, 184, 0.35)' }
  ];

  return { isUptrend, maxHigh, minLow, levels };
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

  const chartInstanceRef = useRef(null);
  const rsiChartInstanceRef = useRef(null);
  const candlestickSeriesRef = useRef(null);
  const volumeSeriesRef = useRef(null);
  const costPriceLineRef = useRef(null);

  // Auto Analysis Price Lines Refs
  const autoSRLinesRef = useRef([]);
  const autoFibLinesRef = useRef([]);

  // Indicator series refs
  const ema20SeriesRef = useRef(null);
  const ema50SeriesRef = useRef(null);
  const ema200SeriesRef = useRef(null);
  const bbUpperSeriesRef = useRef(null);
  const bbMiddleSeriesRef = useRef(null);
  const bbLowerSeriesRef = useRef(null);
  const rsiSeriesRef = useRef(null);

  // Horizontal price lines refs mapping
  const horizontalPriceLinesMapRef = useRef(new Map());

  // Component state
  const [chartInterval, setChartInterval] = useState('1G'); // '1G', '1H', '4S', '2S', '1S'
  const [candles, setCandles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [hoverData, setHoverData] = useState(null);

  // Dynamic SVG Trendline Coordinates state
  const [svgTrendlines, setSvgTrendlines] = useState([]);

  // Drawing Tools State
  // Modes: null, 'horizontal', 'trendline'
  const [activeDrawTool, setActiveDrawTool] = useState(null);
  const [trendStartPoint, setTrendStartPoint] = useState(null); // { time, price, x, y }
  const [mousePreviewPoint, setMousePreviewPoint] = useState(null);
  const [showDrawingsList, setShowDrawingsList] = useState(false);

  // Modal for Indicator Settings
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // Flags to avoid feedback loop between Firestore subscription and local state updates
  const isApplyingCloudPreferencesRef = useRef(false);
  const isApplyingCloudSettingsRef = useRef(false);
  const isApplyingCloudDrawingsRef = useRef(false);

  // User persistent indicator parameters
  const [indicatorSettings, setIndicatorSettings] = useState(() => {
    try {
      const saved = localStorage.getItem('terminal_indicator_settings');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return {
      rsiPeriod: 24,
      ema1Period: 20,
      ema2Period: 50,
      ema3Period: 200,
      bollingerPeriod: 20,
      bollingerStdDev: 2,
      fibLookback: 180,
      srLookback: 90,
      showLevelTitles: false
    };
  });

  // Persistent Active Indicators (Default matches user preferences: EMA 50, RSI, Fib active; CostLine off)
  const [indicators, setIndicators] = useState(() => {
    try {
      const saved = localStorage.getItem('terminal_chart_indicators');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return {
      ema20: false,
      ema50: true,
      ema200: false,
      bollinger: false,
      volume: true,
      rsi: true,
      costLine: false,
      autoSR: false,
      autoFib: true
    };
  });

  // 1. Subscribe to Firebase Firestore Cloud Preferences (Real-Time Sync between PC & Mobile)
  useEffect(() => {
    const unsubPrefs = onSnapshot(doc(db, 'chart_preferences', 'settings'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data && data.indicators) {
          isApplyingCloudPreferencesRef.current = true;
          setIndicators(prev => {
            if (JSON.stringify(prev) !== JSON.stringify(data.indicators)) {
              return data.indicators;
            }
            return prev;
          });
          try {
            localStorage.setItem('terminal_chart_indicators', JSON.stringify(data.indicators));
          } catch (e) {}
        }
        if (data && data.indicatorSettings) {
          isApplyingCloudSettingsRef.current = true;
          setIndicatorSettings(prev => {
            if (JSON.stringify(prev) !== JSON.stringify(data.indicatorSettings)) {
              return data.indicatorSettings;
            }
            return prev;
          });
          try {
            localStorage.setItem('terminal_indicator_settings', JSON.stringify(data.indicatorSettings));
          } catch (e) {}
        }
      }
    }, (err) => {
      console.warn('Firestore preferences subscription error:', err);
    });

    return () => unsubPrefs();
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

  // User persistent drawings per base symbol
  // { horizontals: [{ id, price, label, color }], trendlines: [{ id, p1: { time, price }, p2: { time, price }, color }] }
  const [drawings, setDrawings] = useState({ horizontals: [], trendlines: [] });

  // Load symbol's drawings from localStorage & Firebase Cloud whenever symbol changes
  // Uses normalized base symbol (e.g. 'BTC' whether ticker is BTCUSDT, BTC-USD, or BTC)
  const baseSymbol = normalizeTicker(cleanTicker || symbol);
  const storageKey = `terminal_drawings_${baseSymbol}`;

  useEffect(() => {
    // 1. Immediate local cache load (0ms latency)
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        setDrawings(JSON.parse(saved));
      } else {
        setDrawings({ horizontals: [], trendlines: [] });
      }
    } catch (e) {
      setDrawings({ horizontals: [], trendlines: [] });
    }
    setActiveDrawTool(null);
    setTrendStartPoint(null);
    setMousePreviewPoint(null);

    if (!baseSymbol) return;

    // 2. Real-Time Cloud Firestore Sync for Drawings
    const unsubDrawings = onSnapshot(doc(db, 'chart_drawings', baseSymbol), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data && (Array.isArray(data.horizontals) || Array.isArray(data.trendlines))) {
          const cloudDrawings = {
            horizontals: Array.isArray(data.horizontals) ? data.horizontals : [],
            trendlines: Array.isArray(data.trendlines) ? data.trendlines : []
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
            if ((parsed.horizontals && parsed.horizontals.length > 0) || (parsed.trendlines && parsed.trendlines.length > 0)) {
              setDoc(doc(db, 'chart_drawings', baseSymbol), {
                horizontals: parsed.horizontals || [],
                trendlines: parsed.trendlines || [],
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
          updatedAt: Date.now()
        }, { merge: true });
      } catch (err) {
        console.warn('Firestore saveDrawings error:', err);
      }
    }
  }, [storageKey, baseSymbol]);

  // Re-calculate SVG trendline pixel coordinates from timeScale and priceScale
  const recalcSvgLines = useCallback(() => {
    if (!chartInstanceRef.current || !candlestickSeriesRef.current) return;
    const timeScale = chartInstanceRef.current.timeScale();
    const series = candlestickSeriesRef.current;

    const lines = (drawings.trendlines || []).map(t => {
      const x1 = timeScale.timeToCoordinate(t.p1.time);
      const y1 = series.priceToCoordinate(t.p1.price);
      const x2 = timeScale.timeToCoordinate(t.p2.time);
      const y2 = series.priceToCoordinate(t.p2.price);
      return {
        ...t,
        x1, y1, x2, y2,
        valid: x1 !== null && y1 !== null && x2 !== null && y2 !== null
      };
    });
    setSvgTrendlines(lines);
  }, [drawings.trendlines]);

  // Trigger SVG lines recalculation on drawings or candle change
  useEffect(() => {
    recalcSvgLines();
    const rId = requestAnimationFrame(() => recalcSvgLines());
    const tId = setTimeout(() => recalcSvgLines(), 150);
    return () => {
      cancelAnimationFrame(rId);
      clearTimeout(tId);
    };
  }, [recalcSvgLines, candles]);

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

    if (chartInterval === '1H') {
      yInterval = '1wk';
      yRange = '5y';
    } else if (chartInterval === '4S') {
      yInterval = '1h';
      yRange = '3mo';
      resampleGroup = 4;
    } else if (chartInterval === '2S') {
      yInterval = '1h';
      yRange = '1mo';
      resampleGroup = 2;
    } else if (chartInterval === '1S') {
      yInterval = '1h';
      yRange = '1mo';
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
        const isIntraday = yInterval.includes('m') || yInterval.includes('h');
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

      if (!dataCandles || dataCandles.length === 0) {
        throw new Error(`${cleanTicker || symbol} için mum verisi bulunamadı.`);
      }

      // Resample if 2S or 4S requested
      if (resampleGroup > 1) {
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
      layout: {
        background: { type: 'solid', color: '#040711' },
        textColor: '#94a3b8',
        fontSize: 11,
        fontFamily: 'Inter, system-ui, sans-serif'
      },
      grid: {
        vertLines: { color: 'rgba(255, 255, 255, 0.04)' },
        horzLines: { color: 'rgba(255, 255, 255, 0.04)' }
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: 'rgba(0, 229, 255, 0.4)',
          width: 1,
          style: LineStyle.Dotted
        },
        horzLine: {
          color: 'rgba(0, 229, 255, 0.4)',
          width: 1,
          style: LineStyle.Dotted
        }
      },
      rightPriceScale: {
        borderColor: 'rgba(255, 255, 255, 0.1)',
        autoScale: true,
        scaleMargins: {
          top: 0.08,
          bottom: indicators.volume ? 0.22 : 0.05
        }
      },
      timeScale: {
        borderColor: 'rgba(255, 255, 255, 0.1)',
        timeVisible: chartInterval.includes('S'),
        secondsVisible: false
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

    // Add Overlay Indicators
    if (indicators.ema20) {
      ema20SeriesRef.current = mainChart.addSeries(LineSeries, {
        color: '#06b6d4',
        lineWidth: 1.5,
        priceLineVisible: false,
        lastValueVisible: true,
        title: 'EMA 20'
      });
    } else {
      ema20SeriesRef.current = null;
    }

    // EMA 50: Trend eğrisi aktif (lineVisible: true), yatay kesikli fiyat çizgisi kapalı (priceLineVisible: false), sağ eksende mavi fiyat etiketi aktif
    if (indicators.ema50) {
      ema50SeriesRef.current = mainChart.addSeries(LineSeries, {
        color: '#3b82f6',
        lineWidth: 1.5,
        lineVisible: true,
        priceLineVisible: false,
        lastValueVisible: true,
        title: 'EMA 50'
      });
    } else {
      ema50SeriesRef.current = null;
    }

    if (indicators.ema200) {
      ema200SeriesRef.current = mainChart.addSeries(LineSeries, {
        color: '#f59e0b',
        lineWidth: 2,
        priceLineVisible: false,
        lastValueVisible: true,
        title: 'EMA 200'
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
        title: 'BB Üst'
      });
      bbMiddleSeriesRef.current = mainChart.addSeries(LineSeries, {
        color: '#a855f7',
        lineWidth: 1.5,
        priceLineVisible: false,
        lastValueVisible: true,
        title: 'BB Orta (20)'
      });
      bbLowerSeriesRef.current = mainChart.addSeries(LineSeries, {
        color: '#c084fc',
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        priceLineVisible: false,
        lastValueVisible: true,
        title: 'BB Alt'
      });
    } else {
      bbUpperSeriesRef.current = null;
      bbMiddleSeriesRef.current = null;
      bbLowerSeriesRef.current = null;
    }

    // 2. Create RSI Sub-Chart (if active, height: 95px, tight against main chart)
    if (indicators.rsi && rsiContainerRef.current) {
      const rsiContainer = rsiContainerRef.current;
      const rsiChart = createChart(rsiContainer, {
        width,
        height: 95,
        layout: {
          background: { type: 'solid', color: '#03050c' },
          textColor: '#64748b',
          fontSize: 10
        },
        grid: {
          vertLines: { color: 'rgba(255, 255, 255, 0.02)' },
          horzLines: { color: 'rgba(255, 255, 255, 0.04)' }
        },
        rightPriceScale: {
          borderColor: 'rgba(255, 255, 255, 0.08)',
          scaleMargins: { top: 0.12, bottom: 0.12 }
        },
        timeScale: {
          visible: false,
          borderColor: 'transparent'
        }
      });
      rsiChartInstanceRef.current = rsiChart;

      const rsiSeries = rsiChart.addSeries(LineSeries, {
        color: '#ec4899',
        lineWidth: 2,
        title: 'RSI (14)'
      });
      rsiSeriesRef.current = rsiSeries;

      // Add 70 (Overbought) and 30 (Oversold) lines
      rsiSeries.createPriceLine({
        price: 70,
        color: '#ef4444',
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        title: 'Aşırı Alım (70)'
      });
      rsiSeries.createPriceLine({
        price: 30,
        color: '#10b981',
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        title: 'Aşırı Satım (30)'
      });

      // Synchronize visible time range between Main and RSI Chart
      mainChart.timeScale().subscribeVisibleLogicalRangeChange(range => {
        if (range && rsiChartInstanceRef.current) {
          rsiChartInstanceRef.current.timeScale().setVisibleLogicalRange(range);
        }
      });
    } else {
      rsiSeriesRef.current = null;
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
          rsiChartInstanceRef.current.resize(newWidth, 95);
        }
        recalcSvgLines();
      }
    });

    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      if (chartInstanceRef.current) {
        chartInstanceRef.current.remove();
        chartInstanceRef.current = null;
      }
      if (rsiChartInstanceRef.current) {
        rsiChartInstanceRef.current.remove();
        rsiChartInstanceRef.current = null;
      }
    };
  }, [indicators, chartInterval, recalcSvgLines]);

  // Push candle data & indicators to series whenever candles update
  useEffect(() => {
    if (!candles || candles.length === 0 || !candlestickSeriesRef.current) return;

    // 1. Set Candlestick Data
    candlestickSeriesRef.current.setData(candles);

    // 2. Set Volume Data
    if (volumeSeriesRef.current) {
      const volData = candles.map(c => ({
        time: c.time,
        value: c.volume || 0,
        color: c.close >= c.open ? 'rgba(16, 185, 129, 0.45)' : 'rgba(239, 68, 68, 0.45)'
      }));
      volumeSeriesRef.current.setData(volData);
    }

    // 3. Set EMA Series
    // 3. Set EMA Series with user customizable periods
    if (ema20SeriesRef.current) {
      ema20SeriesRef.current.setData(calcEMA(candles, indicatorSettings.ema1Period || 20));
    }
    if (ema50SeriesRef.current) {
      ema50SeriesRef.current.setData(calcEMA(candles, indicatorSettings.ema2Period || 50));
    }
    if (ema200SeriesRef.current) {
      ema200SeriesRef.current.setData(calcEMA(candles, indicatorSettings.ema3Period || 200));
    }

    // 4. Set Bollinger Bands with user customizable period & std dev
    if (bbUpperSeriesRef.current && bbMiddleSeriesRef.current && bbLowerSeriesRef.current) {
      const bb = calcBollinger(candles, indicatorSettings.bollingerPeriod || 20, indicatorSettings.bollingerStdDev || 2);
      bbUpperSeriesRef.current.setData(bb.upper);
      bbMiddleSeriesRef.current.setData(bb.middle);
      bbLowerSeriesRef.current.setData(bb.lower);
    }

    // 5. Set RSI Series with user customizable period (e.g. 14 or 24)
    if (rsiSeriesRef.current) {
      rsiSeriesRef.current.setData(calcRSI(candles, indicatorSettings.rsiPeriod || 14));
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
          color: '#eab308', // Gold / Amber
          lineWidth: 2,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: `🏷️ MALİYET (${symMark}${holdingCost.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`
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

      // 8. Auto Fibonacci Retracement Lines (Makro Döngü, Mumları Kapatmayan Sade Çizgiler)
      try {
        autoFibLinesRef.current.forEach(line => {
          try { candlestickSeriesRef.current.removePriceLine(line); } catch (e) {}
        });
        autoFibLinesRef.current = [];

        if (indicators.autoFib && candles.length > 10) {
          const fibData = calcAutoFib(candles, indicatorSettings.fibLookback || 180);
          if (fibData && fibData.levels) {
            fibData.levels.forEach(lvl => {
              const isHalf = lvl.ratio === '0.500';
              const isGolden = lvl.ratio === '0.618';
              const fibLine = candlestickSeriesRef.current.createPriceLine({
                price: lvl.price,
                color: lvl.color,
                lineWidth: isHalf ? 2 : 1, // 0.500 kırmızı ve daha kalın (2px), 0.618 ve diğerleri 1px
                lineStyle: isHalf ? LineStyle.Solid : isGolden ? LineStyle.Dashed : LineStyle.Dotted,
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
    }

    // Fit content smoothly on initial data load and recalculate SVG lines
    if (chartInstanceRef.current) {
      chartInstanceRef.current.timeScale().fitContent();
    }
    requestAnimationFrame(() => recalcSvgLines());
    setTimeout(() => recalcSvgLines(), 150);
  }, [candles, indicators, indicatorSettings, activeHolding, isBist, recalcSvgLines]);

  // Synchronize Horizontal Drawings on Price Scale
  useEffect(() => {
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
    (drawings.horizontals || []).forEach(h => {
      try {
        const line = series.createPriceLine({
          price: h.price,
          color: h.color || '#38bdf8',
          lineWidth: 2,
          lineStyle: LineStyle.Solid,
          axisLabelVisible: true,
          title: h.label || `Seviye: ${h.price}`
        });
        horizontalPriceLinesMapRef.current.set(h.id, line);
      } catch (e) {}
    });
  }, [drawings.horizontals]);

  // Click & Drawing handler on Chart Container
  const handleChartClick = (e) => {
    if (!activeDrawTool || !chartInstanceRef.current || !candlestickSeriesRef.current) return;

    const rect = chartContainerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const price = candlestickSeriesRef.current.coordinateToPrice(y);
    const rawTime = chartInstanceRef.current.timeScale().coordinateToTime(x);
    const clickedTime = normalizeChartTime(rawTime) || (candles[candles.length - 1]?.time);

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
    } else if (activeDrawTool === 'trendline') {
      if (!trendStartPoint) {
        // First click sets Point A
        setTrendStartPoint({ time: clickedTime, price: Number(price.toFixed(2)), x, y });
      } else {
        // Second click sets Point B and completes trendline
        const newTrendlines = [
          ...(drawings.trendlines || []),
          {
            id: `t_${Date.now()}`,
            p1: { time: trendStartPoint.time, price: trendStartPoint.price },
            p2: { time: clickedTime, price: Number(price.toFixed(2)) },
            color: '#38bdf8'
          }
        ];
        saveDrawings({ ...drawings, trendlines: newTrendlines });
        setActiveDrawTool(null);
        setTrendStartPoint(null);
        setMousePreviewPoint(null);
      }
    }
  };

  const handleMouseMove = (e) => {
    if (activeDrawTool === 'trendline' && trendStartPoint && chartContainerRef.current) {
      const rect = chartContainerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      setMousePreviewPoint({ x, y });
    }
  };

  // Delete specific drawing
  const deleteHorizontal = (id) => {
    const updated = (drawings.horizontals || []).filter(h => h.id !== id);
    saveDrawings({ ...drawings, horizontals: updated });
  };

  const deleteTrendline = (id) => {
    const updated = (drawings.trendlines || []).filter(t => t.id !== id);
    saveDrawings({ ...drawings, trendlines: updated });
  };

  const clearAllDrawings = () => {
    if (window.confirm(`${cleanTicker || symbol} varlığına ait TÜM çizimleri temizlemek istediğinize emin misiniz?`)) {
      saveDrawings({ horizontals: [], trendlines: [] });
      setShowDrawingsList(false);
    }
  };

  // Last Candle Details for HUD
  const lastBar = useMemo(() => {
    if (!candles || candles.length === 0) return null;
    return candles[candles.length - 1];
  }, [candles]);

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

  const totalDrawingsCount = (drawings.horizontals?.length || 0) + (drawings.trendlines?.length || 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', background: '#040711', borderRadius: 8, overflow: 'hidden' }}>
      
      {/* 🌟 TOP TOOLBAR: INDICATORS, TIMEFRAMES & DRAWING CONTROLS */}
      <div 
        style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          flexWrap: 'wrap', 
          gap: 8, 
          padding: '8px 14px', 
          background: 'rgba(11, 17, 32, 0.95)', 
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          zIndex: 10
        }}
      >
        {/* Left: Timeframes & Indicators */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          
          {/* ⏱️ Zaman Dilimi Seçici */}
          <div style={{ display: 'inline-flex', background: 'rgba(0,0,0,0.6)', borderRadius: 5, padding: 2, border: '1px solid rgba(255,255,255,0.1)' }}>
            {[
              { id: '1G', label: '1G (Günlük)' },
              { id: '1H', label: '1H (Haftalık)' },
              { id: '4S', label: '4S' },
              { id: '2S', label: '2S' },
              { id: '1S', label: '1S' }
            ].map(tf => (
              <button
                key={tf.id}
                type="button"
                onClick={() => setChartInterval(tf.id)}
                className={`chip-btn ${chartInterval === tf.id ? 'active' : ''}`}
                style={{ 
                  fontSize: 10, 
                  padding: '3px 8px', 
                  fontWeight: chartInterval === tf.id ? 700 : 500,
                  background: chartInterval === tf.id ? 'rgba(0, 229, 255, 0.2)' : 'transparent',
                  borderColor: chartInterval === tf.id ? 'var(--cyan)' : 'transparent',
                  color: chartInterval === tf.id ? 'var(--cyan)' : 'var(--text-muted)'
                }}
                title={`${tf.label} periyoduna geç`}
              >
                {tf.id}
              </button>
            ))}
          </div>

          <div style={{ width: 1, height: 18, background: 'rgba(255,255,255,0.1)', margin: '0 4px' }} />

          {/* 📊 İndikatör Toggle Butonları */}
          <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 3 }}>
            <Sliders size={12} className="text-cyan" />
            <span>İNDİKATÖRLER:</span>
          </span>

          <button
            type="button"
            onClick={() => toggleIndicator('ema20')}
            className={`chip-btn ${indicators.ema20 ? 'active' : ''}`}
            style={{ fontSize: 9.5, padding: '2px 7px', color: indicators.ema20 ? '#06b6d4' : 'inherit', borderColor: indicators.ema20 ? '#06b6d4' : 'rgba(255,255,255,0.1)' }}
          >
            EMA {indicatorSettings.ema1Period || 20}
          </button>

          <button
            type="button"
            onClick={() => toggleIndicator('ema50')}
            className={`chip-btn ${indicators.ema50 ? 'active' : ''}`}
            style={{ fontSize: 9.5, padding: '2px 7px', color: indicators.ema50 ? '#3b82f6' : 'inherit', borderColor: indicators.ema50 ? '#3b82f6' : 'rgba(255,255,255,0.1)' }}
            title="EMA 50 hareketli ortalama trend eğrisi (kesikli yatay fiyat çizgisi kapalı, sade görünüm)"
          >
            EMA {indicatorSettings.ema2Period || 50}
          </button>

          <button
            type="button"
            onClick={() => toggleIndicator('ema200')}
            className={`chip-btn ${indicators.ema200 ? 'active' : ''}`}
            style={{ fontSize: 9.5, padding: '2px 7px', color: indicators.ema200 ? '#f59e0b' : 'inherit', borderColor: indicators.ema200 ? '#f59e0b' : 'rgba(255,255,255,0.1)' }}
          >
            EMA {indicatorSettings.ema3Period || 200}
          </button>

          <button
            type="button"
            onClick={() => toggleIndicator('bollinger')}
            className={`chip-btn ${indicators.bollinger ? 'active' : ''}`}
            style={{ fontSize: 9.5, padding: '2px 7px', color: indicators.bollinger ? '#c084fc' : 'inherit', borderColor: indicators.bollinger ? '#c084fc' : 'rgba(255,255,255,0.1)' }}
          >
            Bollinger
          </button>

          <button
            type="button"
            onClick={() => toggleIndicator('volume')}
            className={`chip-btn ${indicators.volume ? 'active' : ''}`}
            style={{ fontSize: 9.5, padding: '2px 7px', color: indicators.volume ? '#38bdf8' : 'inherit', borderColor: indicators.volume ? '#38bdf8' : 'rgba(255,255,255,0.1)' }}
          >
            Hacim
          </button>

          <button
            type="button"
            onClick={() => toggleIndicator('rsi')}
            className={`chip-btn ${indicators.rsi ? 'active' : ''}`}
            style={{ fontSize: 9.5, padding: '2px 7px', color: indicators.rsi ? '#ec4899' : 'inherit', borderColor: indicators.rsi ? '#ec4899' : 'rgba(255,255,255,0.1)' }}
          >
            RSI ({indicatorSettings.rsiPeriod || 14})
          </button>

          {/* Otomatik Destek - Direnç Toggle */}
          <button
            type="button"
            onClick={() => toggleIndicator('autoSR')}
            className={`chip-btn ${indicators.autoSR ? 'active' : ''}`}
            style={{ 
              fontSize: 9.5, 
              padding: '2px 7px', 
              color: indicators.autoSR ? '#10b981' : 'inherit', 
              borderColor: indicators.autoSR ? '#10b981' : 'rgba(255,255,255,0.1)',
              background: indicators.autoSR ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
              fontWeight: indicators.autoSR ? 700 : 500
            }}
            title="Otomatik Destek ve Direnç Seviyeleri (Pivot Kümeleri)"
          >
            🎯 Destek/Direnç
          </button>

          {/* Dinamik Otomatik Fibonacci Toggle */}
          <button
            type="button"
            onClick={() => toggleIndicator('autoFib')}
            className={`chip-btn ${indicators.autoFib ? 'active' : ''}`}
            style={{ 
              fontSize: 9.5, 
              padding: '2px 7px', 
              color: indicators.autoFib ? '#38bdf8' : 'inherit', 
              borderColor: indicators.autoFib ? '#38bdf8' : 'rgba(255,255,255,0.1)',
              background: indicators.autoFib ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
              fontWeight: indicators.autoFib ? 700 : 500
            }}
            title="Otomatik Dinamik Fibonacci Geri Çekilme (0.618 Altın Oran Dahil)"
          >
            📐 Dinamik Fib
          </button>

          {holdingInfo && (
            <button
              type="button"
              onClick={() => toggleIndicator('costLine')}
              className={`chip-btn ${indicators.costLine ? 'active' : ''}`}
              style={{ fontSize: 9.5, padding: '2px 7px', color: indicators.costLine ? '#eab308' : 'inherit', borderColor: indicators.costLine ? '#eab308' : 'rgba(255,255,255,0.1)' }}
              title="Portföy maliyet çizgisini grafikte göster/gizle"
            >
              🏷️ Maliyet Çizgisi
            </button>
          )}

          {/* ⚙️ İndikatör Ayarları Butonu */}
          <button
            type="button"
            onClick={() => setShowSettingsModal(true)}
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          
          {/* Yatay Seviye Ekle */}
          <button
            type="button"
            onClick={() => {
              setActiveDrawTool(prev => prev === 'horizontal' ? null : 'horizontal');
              setTrendStartPoint(null);
            }}
            className={`chip-btn ${activeDrawTool === 'horizontal' ? 'active' : ''}`}
            style={{ 
              fontSize: 10, 
              padding: '3px 9px', 
              display: 'flex', 
              alignItems: 'center', 
              gap: 4,
              background: activeDrawTool === 'horizontal' ? 'rgba(56, 189, 248, 0.25)' : 'rgba(255,255,255,0.03)',
              borderColor: activeDrawTool === 'horizontal' ? '#38bdf8' : 'rgba(255,255,255,0.15)',
              color: activeDrawTool === 'horizontal' ? '#38bdf8' : '#e2e8f0',
              fontWeight: 600
            }}
            title="Grafik üzerine tıkla ve kalıcı Destek / Direnç seviyesi yerleştir"
          >
            <Minus size={12} />
            <span>{activeDrawTool === 'horizontal' ? 'Grafiğe Tıklayın...' : '+ Yatay Seviye'}</span>
          </button>

          {/* Trend Çizgisi */}
          <button
            type="button"
            onClick={() => {
              setActiveDrawTool(prev => prev === 'trendline' ? null : 'trendline');
              setTrendStartPoint(null);
            }}
            className={`chip-btn ${activeDrawTool === 'trendline' ? 'active' : ''}`}
            style={{ 
              fontSize: 10, 
              padding: '3px 9px', 
              display: 'flex', 
              alignItems: 'center', 
              gap: 4,
              background: activeDrawTool === 'trendline' ? 'rgba(56, 189, 248, 0.25)' : 'rgba(255,255,255,0.03)',
              borderColor: activeDrawTool === 'trendline' ? '#38bdf8' : 'rgba(255,255,255,0.15)',
              color: activeDrawTool === 'trendline' ? '#38bdf8' : '#e2e8f0',
              fontWeight: 600
            }}
            title="İki noktaya tıklayarak kalıcı trend çizgisi çizin"
          >
            <TrendingUp size={12} />
            <span>
              {activeDrawTool === 'trendline' 
                ? (trendStartPoint ? 'Bitiş Noktasına Tıklayın' : 'Başlangıç Noktasına Tıklayın') 
                : '+ Trend Çizgisi'}
            </span>
          </button>

          {/* Çizimlerim Listesi & Temizle */}
          {totalDrawingsCount > 0 && (
            <div style={{ position: 'relative' }}>
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
                  background: 'rgba(56, 189, 248, 0.1)', 
                  borderColor: '#38bdf8', 
                  color: '#38bdf8',
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
                    width: 240, 
                    background: '#090d1a', 
                    border: '1px solid rgba(56, 189, 248, 0.35)', 
                    borderRadius: 8, 
                    padding: 8, 
                    zIndex: 9999,
                    boxShadow: '0 10px 25px rgba(0,0,0,0.8)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, paddingBottom: 4, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    <span style={{ fontSize: 10.5, fontWeight: 700, color: '#38bdf8' }}>Kayıtlı Çizimler</span>
                    <button 
                      type="button" 
                      onClick={clearAllDrawings}
                      style={{ background: 'transparent', border: 'none', color: '#f87171', fontSize: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3 }}
                    >
                      <Trash2 size={11} />
                      <span>Tümünü Sil</span>
                    </button>
                  </div>

                  <div style={{ maxHeight: 180, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {drawings.horizontals.map(h => (
                      <div key={h.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.03)', padding: '4px 6px', borderRadius: 4, fontSize: 10 }}>
                        <span style={{ color: '#cbd5e1' }}>Yatay: <strong>{h.price}</strong></span>
                        <button type="button" onClick={() => deleteHorizontal(h.id)} style={{ background: 'transparent', border: 'none', color: '#f87171', cursor: 'pointer' }}>
                          <X size={12} />
                        </button>
                      </div>
                    ))}

                    {drawings.trendlines.map(t => (
                      <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.03)', padding: '4px 6px', borderRadius: 4, fontSize: 10 }}>
                        <span style={{ color: '#cbd5e1' }}>Trend: {t.p1.price} ➔ {t.p2.price}</span>
                        <button type="button" onClick={() => deleteTrendline(t.id)} style={{ background: 'transparent', border: 'none', color: '#f87171', cursor: 'pointer' }}>
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* İzleme Listesi Göster / Gizle Toggle Butonu */}
          {onToggleSidebar && (
            <button
              type="button"
              onClick={onToggleSidebar}
              className={`chip-btn ${sidebarOpen ? 'active' : ''}`}
              style={{ 
                fontSize: 10, 
                padding: '3px 8px', 
                color: sidebarOpen ? 'var(--cyan)' : 'var(--text-muted)', 
                borderColor: sidebarOpen ? 'var(--cyan)' : 'rgba(255,255,255,0.1)',
                background: sidebarOpen ? 'rgba(0, 229, 255, 0.12)' : 'transparent',
                display: 'flex',
                alignItems: 'center',
                gap: 4
              }}
              title={sidebarOpen ? 'İzleme Listesini Gizle (Tam Boy Grafik)' : 'İzleme Listesini Aç'}
            >
              <List size={12} />
              <span>{sidebarOpen ? 'Liste' : 'Liste'}</span>
            </button>
          )}

          {/* Tam Ekran Toggle */}
          {onToggleFullscreen && (
            <button
              type="button"
              onClick={onToggleFullscreen}
              className="chip-btn"
              style={{ fontSize: 10, padding: '3px 8px', color: 'var(--cyan)', borderColor: 'var(--cyan)' }}
              title={isFullscreen ? 'Tam Ekrandan Çık' : 'Tam Ekrana Geç'}
            >
              {isFullscreen ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
            </button>
          )}

          {/* Harici TradingView Linki */}
          <a
            href={`https://www.tradingview.com/chart/?symbol=${encodeURIComponent(isBist ? `BIST:${cleanTicker}` : cleanTicker)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="chip-btn"
            style={{ fontSize: 10, padding: '3px 8px', color: '#93c5fd', borderColor: 'rgba(59, 130, 246, 0.4)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 3 }}
            title="TradingView resmi sitesinde aç"
          >
            <ExternalLink size={11} />
            <span>TV ↗</span>
          </a>
        </div>
      </div>

      {/* 🏷️ PORTFOLIO POSITION BANNER (If stock is held in user portfolio) */}
      {holdingInfo && indicators.costLine && (
        <div 
          style={{ 
            background: holdingInfo.isProfit ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)', 
            borderBottom: `1px solid ${holdingInfo.isProfit ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
            padding: '5px 14px', 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            fontSize: 11,
            fontWeight: 600
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ color: '#eab308' }}>💼 PORTFÖYÜNÜZDE:</span>
            <span style={{ color: '#f8fafc' }}>{holdingInfo.shares} Adet / Lot</span>
            <span style={{ color: '#94a3b8' }}>•</span>
            <span style={{ color: '#f8fafc' }}>
              Maliyet: <strong style={{ color: '#eab308' }}>{holdingInfo.symMark}{holdingInfo.cost.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
              {holdingInfo.symMark === '$' && holdingInfo.altCostTRY > 0 && (
                <span style={{ fontSize: 9.5, color: '#94a3b8', marginLeft: 4 }}>
                  ({holdingInfo.altCostTRY.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} ₺)
                </span>
              )}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ color: holdingInfo.isProfit ? '#34d399' : '#f87171' }}>
              Pozisyon K/Z: <strong>{holdingInfo.isProfit ? '+' : ''}{holdingInfo.pnlPct.toFixed(2)}%</strong> ({holdingInfo.symMark}{holdingInfo.pnlVal.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
            </span>
            {onOpenAddModal && (
              <button
                type="button"
                onClick={() => onOpenAddModal(cleanTicker)}
                className="chip-btn"
                style={{ fontSize: 9.5, padding: '2px 8px', background: 'rgba(255,255,255,0.06)' }}
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
          background: 'rgba(4, 7, 17, 0.98)', 
          borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
          fontSize: 11,
          fontFamily: 'monospace'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 800, color: 'var(--cyan)', fontSize: 13 }}>
            {cleanTicker || symbol}
          </span>

          {displayBar && (
            <>
              <span style={{ color: '#94a3b8' }}>A: <strong style={{ color: '#e2e8f0' }}>{displayBar.open?.toFixed(2)}</strong></span>
              <span style={{ color: '#94a3b8' }}>Y: <strong style={{ color: '#34d399' }}>{displayBar.high?.toFixed(2)}</strong></span>
              <span style={{ color: '#94a3b8' }}>D: <strong style={{ color: '#f87171' }}>{displayBar.low?.toFixed(2)}</strong></span>
              <span style={{ color: '#94a3b8' }}>K: <strong style={{ color: barChangePct >= 0 ? '#34d399' : '#f87171' }}>{displayBar.close?.toFixed(2)}</strong></span>
              <span style={{ color: barChangePct >= 0 ? '#34d399' : '#f87171', fontWeight: 700 }}>
                {barChangePct >= 0 ? '+' : ''}{barChangePct.toFixed(2)}%
              </span>
              {displayBar.volume > 0 && (
                <span style={{ color: '#94a3b8' }}>Hacim: <strong style={{ color: '#38bdf8' }}>{displayBar.volume.toLocaleString('tr-TR')}</strong></span>
              )}
            </>
          )}
        </div>

        {/* Drawing Mode Hint */}
        {activeDrawTool && (
          <div style={{ color: '#38bdf8', fontSize: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>✏️ Çizim Modu: {activeDrawTool === 'horizontal' ? 'İstediğiniz seviyeye tıklayın' : (trendStartPoint ? 'Bitiş noktasına tıklayın' : 'Başlangıç noktasına tıklayın')}</span>
            <button 
              type="button" 
              onClick={() => { setActiveDrawTool(null); setTrendStartPoint(null); }}
              style={{ background: 'transparent', border: 'none', color: '#f87171', cursor: 'pointer', padding: 0 }}
            >
              (İptal)
            </button>
          </div>
        )}
      </div>

      {/* 📊 MAIN CHART CANVAS WRAPPER + SVG OVERLAY */}
      <div 
        style={{ 
          position: 'relative', 
          flex: 1, 
          width: '100%', 
          minHeight: 350, 
          cursor: activeDrawTool ? 'crosshair' : 'default',
          overflow: 'hidden'
        }}
        onClick={handleChartClick}
        onMouseMove={handleMouseMove}
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
            pointerEvents: 'none',
            zIndex: 15
          }}
        >
          {/* Render Persistent Trendlines */}
          {svgTrendlines.map(t => {
            if (!t.valid) return null;
            return (
              <g key={t.id}>
                <line
                  x1={t.x1}
                  y1={t.y1}
                  x2={t.x2}
                  y2={t.y2}
                  stroke={t.color || '#38bdf8'}
                  strokeWidth={2}
                  strokeLinecap="round"
                />
                <circle cx={t.x1} cy={t.y1} r={4} fill={t.color || '#38bdf8'} />
                <circle cx={t.x2} cy={t.y2} r={4} fill={t.color || '#38bdf8'} />
              </g>
            );
          })}

          {/* Mouse Preview for Active Trendline Drawing */}
          {activeDrawTool === 'trendline' && trendStartPoint && mousePreviewPoint && (
            <line
              x1={trendStartPoint.x}
              y1={trendStartPoint.y}
              x2={mousePreviewPoint.x}
              y2={mousePreviewPoint.y}
              stroke="#38bdf8"
              strokeWidth={2}
              strokeDasharray="4 4"
            />
          )}
        </svg>
      </div>

      {/* 📉 RSI SUB-CHART (Height 95px, tight against the main chart time scale) */}
      {indicators.rsi && (
        <div 
          style={{ 
            height: 95, 
            width: '100%', 
            borderTop: '1px solid rgba(255, 255, 255, 0.1)', 
            background: '#03050c',
            position: 'relative',
            flexShrink: 0
          }}
        >
          <div 
            style={{ 
              position: 'absolute', 
              top: 3, 
              left: 10, 
              fontSize: 9, 
              color: '#ec4899', 
              fontWeight: 700, 
              zIndex: 5,
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            <span>RSI ({indicatorSettings.rsiPeriod || 14})</span>
            <span style={{ color: '#64748b' }}>• 70 / 30 Seviyeleri</span>
          </div>
          <div ref={rsiContainerRef} style={{ width: '100%', height: '100%' }} />
        </div>
      )}

      {/* ℹ️ FOOTER HINT BAR */}
      <div 
        style={{ 
          padding: '4px 12px', 
          background: '#020308', 
          borderTop: '1px solid rgba(255, 255, 255, 0.05)', 
          fontSize: 9.5, 
          color: 'var(--text-muted)',
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
              background: '#090d1a',
              border: '1px solid rgba(56, 189, 248, 0.35)',
              borderRadius: 12,
              padding: '20px 24px',
              width: 440,
              maxWidth: '92vw',
              boxShadow: '0 25px 60px rgba(0,0,0,0.95)',
              color: '#f8fafc'
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Başlık */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Sliders size={18} style={{ color: 'var(--cyan)' }} />
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#f8fafc' }}>
                  İndikatör & Analiz Ayarları
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowSettingsModal(false)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 4 }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 13, fontSize: 12 }}>
              {/* RSI Periyodu */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 8px', background: 'rgba(236, 72, 153, 0.05)', borderRadius: 6 }}>
                <div>
                  <div style={{ fontWeight: 600, color: '#ec4899' }}>RSI Periyodu</div>
                  <div style={{ fontSize: 10, color: '#94a3b8' }}>Varsayılan 14 • Uzun vade ve trend için 24 idealdir</div>
                </div>
                <input
                  type="number"
                  min={2}
                  max={100}
                  value={indicatorSettings.rsiPeriod}
                  onChange={e => updateIndicatorSettings(prev => ({ ...prev, rsiPeriod: Math.max(2, parseInt(e.target.value) || 14) }))}
                  style={{ width: 65, padding: '4px 8px', background: '#03050c', border: '1px solid rgba(236, 72, 153, 0.5)', borderRadius: 6, color: '#fff', textAlign: 'center', fontFamily: 'monospace', fontWeight: 700 }}
                />
              </div>

              {/* EMA 1 Periyodu */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 8px', background: 'rgba(6, 182, 212, 0.05)', borderRadius: 6 }}>
                <div>
                  <div style={{ fontWeight: 600, color: '#06b6d4' }}>EMA 1 (Hızlı)</div>
                  <div style={{ fontSize: 10, color: '#94a3b8' }}>Kısa vadeli momentum (Varsayılan: 20)</div>
                </div>
                <input
                  type="number"
                  min={2}
                  max={500}
                  value={indicatorSettings.ema1Period}
                  onChange={e => updateIndicatorSettings(prev => ({ ...prev, ema1Period: Math.max(2, parseInt(e.target.value) || 20) }))}
                  style={{ width: 65, padding: '4px 8px', background: '#03050c', border: '1px solid rgba(6, 182, 212, 0.5)', borderRadius: 6, color: '#fff', textAlign: 'center', fontFamily: 'monospace', fontWeight: 700 }}
                />
              </div>

              {/* EMA 2 Periyodu */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 8px', background: 'rgba(59, 130, 246, 0.05)', borderRadius: 6 }}>
                <div>
                  <div style={{ fontWeight: 600, color: '#3b82f6' }}>EMA 2 (Orta Vade)</div>
                  <div style={{ fontSize: 10, color: '#94a3b8' }}>Trend omurgası (Varsayılan: 50)</div>
                </div>
                <input
                  type="number"
                  min={2}
                  max={500}
                  value={indicatorSettings.ema2Period}
                  onChange={e => updateIndicatorSettings(prev => ({ ...prev, ema2Period: Math.max(2, parseInt(e.target.value) || 50) }))}
                  style={{ width: 65, padding: '4px 8px', background: '#03050c', border: '1px solid rgba(59, 130, 246, 0.5)', borderRadius: 6, color: '#fff', textAlign: 'center', fontFamily: 'monospace', fontWeight: 700 }}
                />
              </div>

              {/* EMA 3 Periyodu */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 8px', background: 'rgba(245, 158, 11, 0.05)', borderRadius: 6 }}>
                <div>
                  <div style={{ fontWeight: 600, color: '#f59e0b' }}>EMA 3 (Ana Trend)</div>
                  <div style={{ fontSize: 10, color: '#94a3b8' }}>Boğa/Ayı sınırı (Varsayılan: 200)</div>
                </div>
                <input
                  type="number"
                  min={2}
                  max={500}
                  value={indicatorSettings.ema3Period}
                  onChange={e => updateIndicatorSettings(prev => ({ ...prev, ema3Period: Math.max(2, parseInt(e.target.value) || 200) }))}
                  style={{ width: 65, padding: '4px 8px', background: '#03050c', border: '1px solid rgba(245, 158, 11, 0.5)', borderRadius: 6, color: '#fff', textAlign: 'center', fontFamily: 'monospace', fontWeight: 700 }}
                />
              </div>

              {/* Bollinger Ayarları */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 8px', background: 'rgba(192, 132, 252, 0.05)', borderRadius: 6 }}>
                <div>
                  <div style={{ fontWeight: 600, color: '#c084fc' }}>Bollinger Bantları</div>
                  <div style={{ fontSize: 10, color: '#94a3b8' }}>Periyot & Sapma (Varsayılan: 20, 2σ)</div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <input
                    type="number"
                    min={5}
                    max={100}
                    value={indicatorSettings.bollingerPeriod}
                    onChange={e => updateIndicatorSettings(prev => ({ ...prev, bollingerPeriod: Math.max(5, parseInt(e.target.value) || 20) }))}
                    style={{ width: 45, padding: '4px 6px', background: '#03050c', border: '1px solid rgba(192, 132, 252, 0.5)', borderRadius: 6, color: '#fff', textAlign: 'center', fontFamily: 'monospace', fontWeight: 700 }}
                    title="Periyot"
                  />
                  <input
                    type="number"
                    min={1}
                    max={5}
                    step={0.5}
                    value={indicatorSettings.bollingerStdDev}
                    onChange={e => updateIndicatorSettings(prev => ({ ...prev, bollingerStdDev: Math.max(1, parseFloat(e.target.value) || 2) }))}
                    style={{ width: 45, padding: '4px 6px', background: '#03050c', border: '1px solid rgba(192, 132, 252, 0.5)', borderRadius: 6, color: '#fff', textAlign: 'center', fontFamily: 'monospace', fontWeight: 700 }}
                    title="Sapma Çarpanı (StdDev)"
                  />
                </div>
              </div>

              {/* Otomatik Fibonacci Lookback */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 8px', background: 'rgba(56, 189, 248, 0.05)', borderRadius: 6 }}>
                <div>
                  <div style={{ fontWeight: 600, color: '#38bdf8' }}>Dinamik Fibonacci Lookback</div>
                  <div style={{ fontSize: 10, color: '#94a3b8' }}>Makro döngü tepe/dip aralığı (Varsayılan: 180 bar ~9 ay)</div>
                </div>
                <input
                  type="number"
                  min={20}
                  max={1000}
                  value={indicatorSettings.fibLookback}
                  onChange={e => updateIndicatorSettings(prev => ({ ...prev, fibLookback: Math.max(20, parseInt(e.target.value) || 180) }))}
                  style={{ width: 65, padding: '4px 8px', background: '#03050c', border: '1px solid rgba(56, 189, 248, 0.5)', borderRadius: 6, color: '#fff', textAlign: 'center', fontFamily: 'monospace', fontWeight: 700 }}
                />
              </div>

              {/* Otomatik Destek-Direnç Hassasiyeti */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 8px', background: 'rgba(16, 185, 129, 0.05)', borderRadius: 6 }}>
                <div>
                  <div style={{ fontWeight: 600, color: '#10b981' }}>Destek / Direnç Lookback</div>
                  <div style={{ fontSize: 10, color: '#94a3b8' }}>Majör pivot aralığı (Varsayılan: 90 bar ~4.5 ay)</div>
                </div>
                <input
                  type="number"
                  min={20}
                  max={500}
                  value={indicatorSettings.srLookback}
                  onChange={e => updateIndicatorSettings(prev => ({ ...prev, srLookback: Math.max(20, parseInt(e.target.value) || 90) }))}
                  style={{ width: 65, padding: '4px 8px', background: '#03050c', border: '1px solid rgba(16, 185, 129, 0.5)', borderRadius: 6, color: '#fff', textAlign: 'center', fontFamily: 'monospace', fontWeight: 700 }}
                />
              </div>

              {/* Grafik İçi Seviye Metinleri (Sadelik Ayarı) */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 8px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: 6 }}>
                <div>
                  <div style={{ fontWeight: 600, color: '#f8fafc' }}>Çizgi Üstü Metin Etiketleri</div>
                  <div style={{ fontSize: 10, color: '#94a3b8' }}>Kapalıyken mumları kapatmaz, seviyeler sağ eksende görünür</div>
                </div>
                <button
                  type="button"
                  onClick={() => updateIndicatorSettings(prev => ({ ...prev, showLevelTitles: !prev.showLevelTitles }))}
                  className="chip-btn"
                  style={{
                    fontSize: 10,
                    padding: '3px 10px',
                    fontWeight: 700,
                    color: indicatorSettings.showLevelTitles ? '#38bdf8' : '#10b981',
                    borderColor: indicatorSettings.showLevelTitles ? '#38bdf8' : '#10b981',
                    background: indicatorSettings.showLevelTitles ? 'rgba(56, 189, 248, 0.15)' : 'rgba(16, 185, 129, 0.15)'
                  }}
                >
                  {indicatorSettings.showLevelTitles ? 'Yazılar Açık' : '✓ Sade / Minimal'}
                </button>
              </div>
            </div>

            {/* Modal Alt Butonları */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 18, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
              <button
                type="button"
                onClick={() => updateIndicatorSettings({
                  rsiPeriod: 24,
                  ema1Period: 20,
                  ema2Period: 50,
                  ema3Period: 200,
                  bollingerPeriod: 20,
                  bollingerStdDev: 2,
                  fibLookback: 180,
                  srLookback: 90,
                  showLevelTitles: false
                })}
                className="chip-btn"
                style={{ fontSize: 11, padding: '5px 12px', color: '#f87171', borderColor: 'rgba(239, 68, 68, 0.3)' }}
              >
                Varsayılana Sıfırla
              </button>
              <button
                type="button"
                onClick={() => setShowSettingsModal(false)}
                className="chip-btn"
                style={{ fontSize: 11, padding: '5px 16px', background: 'var(--cyan)', color: '#000', fontWeight: 700, border: 'none' }}
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
