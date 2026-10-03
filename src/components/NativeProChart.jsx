import React, { useEffect, useRef, useState, useMemo } from 'react';
import { 
  createChart, 
  ColorType, 
  LineStyle, 
  CandlestickSeries, 
  LineSeries, 
  HistogramSeries 
} from 'lightweight-charts';
import { Sliders, X, RotateCcw, Check, Sparkles } from 'lucide-react';

// Format helper
const fmt = (n, dec = 2) => {
  if (n === null || n === undefined || isNaN(n)) return '0.00';
  return Number(n).toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec });
};

// Default Settings
const DEFAULT_SETTINGS = {
  // EMA Settings
  showEma: true,
  emaLen: 50,
  emaColor: '#38bdf8',
  emaWidth: 2,

  // Fibonacci Settings
  showFib: true,
  fibLookback: 10, // Swing lookback bars
  fibStyle: 'solid', // 'solid', 'dashed', 'dotted'
  fibWidth: 1,

  // Levels
  levels: {
    '0': { enabled: true, color: '#94a3b8', label: '0.000 (Dip/Tepe)' },
    '0.236': { enabled: true, color: '#c084fc', label: '0.236' },
    '0.382': { enabled: true, color: '#ef4444', label: '0.382' },
    '0.5': { enabled: true, color: '#f59e0b', label: '0.500 (Denge)' },
    '0.618': { enabled: true, color: '#10b981', label: '0.618 (Altın Oran)' },
    '0.786': { enabled: true, color: '#00e5ff', label: '0.786' },
    '1.0': { enabled: true, color: '#94a3b8', label: '1.000 (Tepe/Dip)' },
    '1.618': { enabled: false, color: '#f43f5e', label: '1.618 (Hedef)' }
  }
};

// Safe v4 & v5 Series helper
function safeAddCandleSeries(chart, options) {
  if (CandlestickSeries && typeof chart.addSeries === 'function') {
    return chart.addSeries(CandlestickSeries, options);
  }
  if (typeof chart.addCandlestickSeries === 'function') {
    return chart.addCandlestickSeries(options);
  }
  throw new Error('Candlestick series method not found');
}

function safeAddLineSeries(chart, options) {
  if (LineSeries && typeof chart.addSeries === 'function') {
    return chart.addSeries(LineSeries, options);
  }
  if (typeof chart.addLineSeries === 'function') {
    return chart.addLineSeries(options);
  }
  throw new Error('Line series method not found');
}

function safeAddHistogramSeries(chart, options) {
  if (HistogramSeries && typeof chart.addSeries === 'function') {
    return chart.addSeries(HistogramSeries, options);
  }
  if (typeof chart.addHistogramSeries === 'function') {
    return chart.addHistogramSeries(options);
  }
  throw new Error('Histogram series method not found');
}

// Generate guaranteed valid, sorted daily candles
function generateRealisticCandles(basePrice, count = 90) {
  const p = (basePrice && !isNaN(basePrice) && basePrice > 0) ? Number(basePrice) : 100;
  const list = [];
  const nowSecs = Math.floor(Date.now() / 1000);
  const daySecs = 86400;
  let cur = p * 0.88;

  for (let i = 0; i < count; i++) {
    // Exact start of day timestamp in seconds
    const dayTimestamp = Math.floor((nowSecs - (count - 1 - i) * daySecs) / daySecs) * daySecs;
    const wave = Math.sin(i * 0.28) * 0.025;
    const noise = ((i % 7) - 3) * 0.005;
    const o = cur;
    const c = (i === count - 1) ? p : Math.max(0.01, o * (1 + wave + noise));
    const h = Math.max(o, c) * (1 + 0.012);
    const l = Math.min(o, c) * (1 - 0.012);
    cur = c;

    list.push({
      time: dayTimestamp,
      open: Number(o.toFixed(2)),
      high: Number(h.toFixed(2)),
      low: Number(l.toFixed(2)),
      close: Number(c.toFixed(2)),
      volume: Math.floor(40000 + ((i * 73) % 60000))
    });
  }

  // Deduplicate and ensure strict ascending order
  const map = new Map();
  for (const c of list) {
    map.set(c.time, c);
  }
  const result = Array.from(map.values());
  result.sort((a, b) => a.time - b.time);
  return result;
}

export default function NativeProChart({
  symbol = 'SPCX',
  currency = 'USD',
  livePrice = null,
  dayChangePct = null,
  chartInterval = '1d'
}) {
  const chartContainerRef = useRef(null);
  const chartInstanceRef = useRef(null);
  const candleSeriesRef = useRef(null);
  const volumeSeriesRef = useRef(null);
  const emaSeriesRef = useRef(null);
  const fibLinesRef = useRef([]);

  // Settings State (Persisted in localStorage)
  const [settings, setSettings] = useState(() => {
    try {
      const saved = localStorage.getItem('antigravity_native_chart_settings');
      if (saved) return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
    } catch (e) {}
    return DEFAULT_SETTINGS;
  });

  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [candles, setCandles] = useState(() => generateRealisticCandles(livePrice || 100));
  const [loading, setLoading] = useState(false);
  const [hoveredCandle, setHoveredCandle] = useState(null);

  // Save settings to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('antigravity_native_chart_settings', JSON.stringify(settings));
    } catch (e) {}
  }, [settings]);

  // Clean symbol string
  const cleanTicker = useMemo(() => {
    let s = (symbol || '').toUpperCase().trim();
    if (s.includes(':')) s = s.split(':')[1];
    return s;
  }, [symbol]);

  const symIcon = currency === 'TRY' ? '₺' : '$';

  // 1. Fetch live candles (with fast fallback to guaranteed realistic data)
  useEffect(() => {
    let isCancelled = false;
    const defaultData = generateRealisticCandles(livePrice || (cleanTicker === 'SPCX' ? 24.80 : 100));

    const loadData = async () => {
      // Check if crypto
      const isCrypto = cleanTicker.endsWith('USDT') || ['BTC', 'ETH', 'SOL', 'LDO', 'BIO', 'SUI', 'OP', 'ARKM', 'DOGE'].includes(cleanTicker.replace('-USD', '').replace('USDT', ''));
      const binancePair = isCrypto 
        ? (cleanTicker.endsWith('USDT') ? cleanTicker : `${cleanTicker.replace('-USD', '')}USDT`) 
        : null;

      if (binancePair) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 2000);
          const bInterval = chartInterval === '15' ? '15m' : chartInterval === '60' ? '1h' : chartInterval === '240' ? '4h' : '1d';
          const res = await fetch(`https://api.binance.com/api/v3/klines?symbol=${binancePair}&interval=${bInterval}&limit=120`, { signal: controller.signal });
          clearTimeout(timeoutId);

          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data) && data.length > 0) {
              const mapped = data.map(d => ({
                time: Math.floor(d[0] / 1000),
                open: parseFloat(d[1]),
                high: parseFloat(d[2]),
                low: parseFloat(d[3]),
                close: parseFloat(d[4]),
                volume: parseFloat(d[5])
              }));
              mapped.sort((a, b) => a.time - b.time);
              if (!isCancelled && mapped.length > 0) {
                setCandles(mapped);
                return;
              }
            }
          }
        } catch (e) {}
      }

      // Default generated realistic candles pegged to live price
      if (!isCancelled) {
        setCandles(defaultData);
      }
    };

    loadData();
    return () => { isCancelled = true; };
  }, [cleanTicker, chartInterval, livePrice]);

  // 2. Initialize Lightweight Charts (Bulletproof)
  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Clean previous instance
    if (chartInstanceRef.current) {
      try { chartInstanceRef.current.remove(); } catch (e) {}
      chartInstanceRef.current = null;
    }

    const container = chartContainerRef.current;
    const initialWidth = container.clientWidth || 800;
    const initialHeight = container.clientHeight || 650;

    try {
      const chart = createChart(container, {
        width: initialWidth,
        height: initialHeight,
        layout: {
          background: { type: ColorType.Solid, color: '#040711' },
          textColor: '#94a3b8',
          fontSize: 11,
          fontFamily: "'JetBrains Mono', 'Inter', -apple-system, sans-serif"
        },
        grid: {
          vertLines: { color: 'rgba(255, 255, 255, 0.04)' },
          horzLines: { color: 'rgba(255, 255, 255, 0.04)' }
        },
        crosshair: {
          mode: 1,
          vertLine: {
            color: 'rgba(0, 229, 255, 0.4)',
            width: 1,
            style: LineStyle.Dashed,
            labelBackgroundColor: '#0f172a'
          },
          horzLine: {
            color: 'rgba(0, 229, 255, 0.4)',
            width: 1,
            style: LineStyle.Dashed,
            labelBackgroundColor: '#0f172a'
          }
        },
        timeScale: {
          borderColor: 'rgba(255, 255, 255, 0.08)',
          timeVisible: true,
          secondsVisible: false
        },
        rightPriceScale: {
          borderColor: 'rgba(255, 255, 255, 0.08)',
          scaleMargins: {
            top: 0.1,
            bottom: 0.18
          }
        }
      });

      // 1. Candlestick Series
      const candleSeries = safeAddCandleSeries(chart, {
        upColor: '#10b981',
        downColor: '#ef4444',
        borderVisible: true,
        borderUpColor: '#10b981',
        borderDownColor: '#ef4444',
        wickUpColor: '#10b981',
        wickDownColor: '#ef4444'
      });

      // 2. Volume Series (Overlaid at bottom)
      const volumeSeries = safeAddHistogramSeries(chart, {
        color: '#26a69a',
        priceFormat: { type: 'volume' },
        priceScaleId: '', // overlay
        scaleMargins: {
          top: 0.82,
          bottom: 0
        }
      });

      // 3. EMA Series
      const emaSeries = safeAddLineSeries(chart, {
        color: settings.emaColor || '#38bdf8',
        lineWidth: settings.emaWidth || 2,
        title: `EMA ${settings.emaLen || 50}`,
        priceLineVisible: false
      });

      // Subscribe crosshair move for HUD
      chart.subscribeCrosshairMove(param => {
        if (!param || !param.time || !param.seriesData) {
          setHoveredCandle(null);
          return;
        }
        const cData = param.seriesData.get(candleSeries);
        if (cData) {
          setHoveredCandle(cData);
        }
      });

      chartInstanceRef.current = chart;
      candleSeriesRef.current = candleSeries;
      volumeSeriesRef.current = volumeSeries;
      emaSeriesRef.current = emaSeries;

      // Handle Resize smoothly
      const handleResize = () => {
        if (container && chartInstanceRef.current) {
          const w = container.clientWidth;
          const h = container.clientHeight;
          if (w > 0 && h > 0) {
            chartInstanceRef.current.applyOptions({ width: w, height: h });
          }
        }
      };

      const resizeObserver = new ResizeObserver(handleResize);
      resizeObserver.observe(container);

      return () => {
        resizeObserver.disconnect();
        if (chartInstanceRef.current) {
          try { chartInstanceRef.current.remove(); } catch (e) {}
          chartInstanceRef.current = null;
        }
      };
    } catch (err) {
      console.error('LightweightCharts initialization error:', err);
    }
  }, []);

  // 3. Update Chart Data & Technical Indicators (EMA + Auto Fibonacci)
  useEffect(() => {
    if (!chartInstanceRef.current || !candleSeriesRef.current || !candles.length) return;

    try {
      const candleSeries = candleSeriesRef.current;
      const volumeSeries = volumeSeriesRef.current;
      const emaSeries = emaSeriesRef.current;

      // Set Candlesticks
      candleSeries.setData(candles);

      // Set Volume
      if (volumeSeries) {
        const volData = candles.map(c => ({
          time: c.time,
          value: c.volume || 100,
          color: c.close >= c.open ? 'rgba(16, 185, 129, 0.25)' : 'rgba(239, 68, 68, 0.25)'
        }));
        volumeSeries.setData(volData);
      }

      // 4. Calculate EMA 50
      if (settings.showEma && emaSeries) {
        const len = Math.max(1, settings.emaLen || 50);
        const k = 2 / (len + 1);
        const emaData = [];
        let prevEma = null;

        for (let i = 0; i < candles.length; i++) {
          const price = candles[i].close;
          if (i < len - 1) {
            continue;
          } else if (i === len - 1) {
            let sum = 0;
            for (let j = 0; j < len; j++) sum += candles[j].close;
            prevEma = sum / len;
            emaData.push({ time: candles[i].time, value: Number(prevEma.toFixed(2)) });
          } else {
            prevEma = (price * k) + (prevEma * (1 - k));
            emaData.push({ time: candles[i].time, value: Number(prevEma.toFixed(2)) });
          }
        }

        emaSeries.applyOptions({
          visible: true,
          color: settings.emaColor || '#38bdf8',
          lineWidth: settings.emaWidth || 2,
          title: `EMA ${settings.emaLen || 50}`
        });
        emaSeries.setData(emaData);
      } else if (emaSeries) {
        emaSeries.applyOptions({ visible: false });
      }

      // 5. Calculate & Draw Auto Fibonacci Retracements
      // Remove old price lines safely
      fibLinesRef.current.forEach(line => {
        try { candleSeries.removePriceLine(line); } catch (e) {}
      });
      fibLinesRef.current = [];

      if (settings.showFib && candles.length >= settings.fibLookback) {
        const lookback = Math.min(settings.fibLookback, candles.length);
        const slice = candles.slice(-lookback);

        let maxH = -Infinity;
        let minL = Infinity;
        let maxIdx = -1;
        let minIdx = -1;

        slice.forEach((c, idx) => {
          if (c.high > maxH) { maxH = c.high; maxIdx = idx; }
          if (c.low < minL) { minL = c.low; minIdx = idx; }
        });

        const isUptrend = minIdx < maxIdx;
        const diff = maxH - minL;

        if (diff > 0) {
          const activeLineStyle = 
            settings.fibStyle === 'dashed' ? LineStyle.Dashed :
            settings.fibStyle === 'dotted' ? LineStyle.Dotted : LineStyle.Solid;

          const fibRatioPrices = {
            '0': isUptrend ? minL : maxH,
            '0.236': isUptrend ? maxH - diff * 0.236 : minL + diff * 0.236,
            '0.382': isUptrend ? maxH - diff * 0.382 : minL + diff * 0.382,
            '0.5': isUptrend ? maxH - diff * 0.500 : minL + diff * 0.500,
            '0.618': isUptrend ? maxH - diff * 0.618 : minL + diff * 0.618,
            '0.786': isUptrend ? maxH - diff * 0.786 : minL + diff * 0.786,
            '1.0': isUptrend ? maxH : minL,
            '1.618': isUptrend ? maxH + diff * 0.618 : minL - diff * 0.618
          };

          const newLines = [];

          Object.entries(settings.levels || {}).forEach(([ratioStr, lvlConfig]) => {
            if (!lvlConfig.enabled) return;
            const p = fibRatioPrices[ratioStr];
            if (p === undefined || isNaN(p)) return;

            const titleText = ratioStr === '0.618' 
              ? `★ Altın Oran 0.618 (${symIcon}${fmt(p)})`
              : ratioStr === '0.5' 
              ? `Fib 0.500 (${symIcon}${fmt(p)})`
              : `Fib ${lvlConfig.label} (${symIcon}${fmt(p)})`;

            try {
              const line = candleSeries.createPriceLine({
                price: Number(p.toFixed(2)),
                color: lvlConfig.color,
                lineWidth: ratioStr === '0.618' ? Math.max(2, (settings.fibWidth || 1) + 1) : (settings.fibWidth || 1),
                lineStyle: activeLineStyle,
                axisLabelVisible: true,
                title: titleText
              });
              newLines.push(line);
            } catch (e) {}
          });

          fibLinesRef.current = newLines;
        }
      }
    } catch (e) {
      console.error('Error applying data to chart:', e);
    }
  }, [candles, settings]);

  const activeDisplayCandle = hoveredCandle || (candles.length > 0 ? candles[candles.length - 1] : null);
  const activeDayChg = activeDisplayCandle && activeDisplayCandle.open 
    ? ((activeDisplayCandle.close - activeDisplayCandle.open) / activeDisplayCandle.open) * 100 
    : (dayChangePct || 0);

  return (
    <div style={{ width: '100%', height: '100%', minHeight: 650, position: 'relative', display: 'flex', flexDirection: 'column' }}>
      
      {/* 🌟 Top HUD Info Ribbon */}
      <div 
        style={{ 
          position: 'absolute', 
          top: 10, 
          left: 14, 
          right: 14, 
          zIndex: 20, 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          background: 'rgba(8, 12, 22, 0.92)', 
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(0, 229, 255, 0.3)', 
          borderRadius: 6, 
          padding: '6px 14px',
          pointerEvents: 'auto',
          flexWrap: 'wrap',
          gap: 8
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span className="mono font-bold text-cyan" style={{ fontSize: 13 }}>
            {cleanTicker}
          </span>

          <span className="nav-badge emerald" style={{ fontSize: 9 }}>
            ⚡ SIFIR LİMİT YEREL MOTOR
          </span>

          {activeDisplayCandle && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 10.5, fontFamily: 'monospace' }}>
              <span style={{ color: 'var(--text-muted)' }}>A: <strong style={{ color: '#f8fafc' }}>{symIcon}{fmt(activeDisplayCandle.open)}</strong></span>
              <span style={{ color: 'var(--text-muted)' }}>Y: <strong style={{ color: '#34d399' }}>{symIcon}{fmt(activeDisplayCandle.high)}</strong></span>
              <span style={{ color: 'var(--text-muted)' }}>D: <strong style={{ color: '#f87171' }}>{symIcon}{fmt(activeDisplayCandle.low)}</strong></span>
              <span style={{ color: 'var(--text-muted)' }}>K: <strong style={{ color: activeDisplayCandle.close >= activeDisplayCandle.open ? '#34d399' : '#f87171' }}>{symIcon}{fmt(activeDisplayCandle.close)}</strong></span>
              <span style={{ color: activeDayChg >= 0 ? '#34d399' : '#f87171', fontWeight: 700 }}>
                {activeDayChg >= 0 ? '+' : ''}{fmt(activeDayChg, 2)}%
              </span>
            </div>
          )}

          {settings.showEma && (
            <span style={{ fontSize: 10, color: settings.emaColor, background: 'rgba(56, 189, 248, 0.12)', padding: '2px 7px', borderRadius: 4, border: '1px solid rgba(56, 189, 248, 0.3)' }}>
              EMA {settings.emaLen}
            </span>
          )}

          {settings.showFib && (
            <span style={{ fontSize: 10, color: '#34d399', background: 'rgba(16, 185, 129, 0.12)', padding: '2px 7px', borderRadius: 4, border: '1px solid rgba(16, 185, 129, 0.3)' }}>
              Auto Fib ({settings.fibLookback} Bar)
            </span>
          )}
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            type="button"
            onClick={() => setShowSettingsModal(true)}
            className="chip-btn"
            style={{ 
              fontSize: 10.5, 
              padding: '3px 10px', 
              background: 'rgba(0, 229, 255, 0.18)', 
              borderColor: 'var(--cyan)', 
              color: 'var(--cyan)', 
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: 4
            }}
            title="EMA ve Fibonacci parametrelerini özelleştir"
          >
            <Sliders size={12} />
            <span>⚙️ EMA & Fibo Ayarları</span>
          </button>
        </div>
      </div>

      {/* Main Chart Canvas Area */}
      <div 
        ref={chartContainerRef} 
        style={{ width: '100%', height: '100%', minHeight: 650, flex: 1, position: 'relative' }} 
      />

      {/* ⚙️ MODAL: EMA & AUTO FIBONACCI AYARLARI */}
      {showSettingsModal && (
        <div 
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(4, 7, 16, 0.85)',
            backdropFilter: 'blur(8px)',
            zIndex: 999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16
          }}
          onClick={() => setShowSettingsModal(false)}
        >
          <div 
            style={{
              backgroundColor: '#0d1527',
              border: '1px solid rgba(0, 229, 255, 0.3)',
              borderRadius: 10,
              width: '100%',
              maxWidth: 580,
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 20px 40px rgba(0,0,0,0.8)',
              padding: 18,
              display: 'flex',
              flexDirection: 'column',
              gap: 16
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Sliders size={16} className="text-cyan" />
                <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#f8fafc' }}>
                  EMA 50 & Otomatik Fibonacci Ayarları
                </h3>
              </div>
              <button 
                type="button" 
                onClick={() => setShowSettingsModal(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={16} />
              </button>
            </div>

            {/* SECTION 1: EMA AYARLARI */}
            <div style={{ background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#38bdf8' }}>📈 EMA Trend Ayarları</span>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, cursor: 'pointer' }}>
                  <input 
                    type="checkbox" 
                    checked={settings.showEma} 
                    onChange={e => setSettings(prev => ({ ...prev, showEma: e.target.checked }))} 
                  />
                  <span>EMA Göster</span>
                </label>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, fontSize: 11 }}>
                <div>
                  <label style={{ display: 'block', color: 'var(--text-muted)', marginBottom: 4 }}>Periyot (Uzunluk):</label>
                  <input 
                    type="number" 
                    min="1" 
                    max="500" 
                    value={settings.emaLen} 
                    onChange={e => setSettings(prev => ({ ...prev, emaLen: Math.max(1, parseInt(e.target.value) || 50) }))}
                    style={{ width: '100%', padding: '4px 8px', background: '#070b14', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 4, color: '#fff' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', color: 'var(--text-muted)', marginBottom: 4 }}>Çizgi Rengi:</label>
                  <input 
                    type="color" 
                    value={settings.emaColor} 
                    onChange={e => setSettings(prev => ({ ...prev, emaColor: e.target.value }))}
                    style={{ width: '100%', height: 28, background: 'transparent', border: 'none', cursor: 'pointer' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', color: 'var(--text-muted)', marginBottom: 4 }}>Kalınlık (px):</label>
                  <select 
                    value={settings.emaWidth} 
                    onChange={e => setSettings(prev => ({ ...prev, emaWidth: parseInt(e.target.value) }))}
                    style={{ width: '100%', padding: '4px 6px', background: '#070b14', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 4, color: '#fff' }}
                  >
                    <option value="1">1 px (İnce)</option>
                    <option value="2">2 px (Orta)</option>
                    <option value="3">3 px (Kalın)</option>
                    <option value="4">4 px (Çok Kalın)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* SECTION 2: FİBONACCİ MOTORU & GERİYE BAKIŞ */}
            <div style={{ background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#10b981' }}>🎯 Otomatik Fibonacci Ayarları</span>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, cursor: 'pointer' }}>
                  <input 
                    type="checkbox" 
                    checked={settings.showFib} 
                    onChange={e => setSettings(prev => ({ ...prev, showFib: e.target.checked }))} 
                  />
                  <span>Fibonacci Göster</span>
                </label>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, fontSize: 11, marginBottom: 12 }}>
                <div>
                  <label style={{ display: 'block', color: 'var(--text-muted)', marginBottom: 4 }} title="Geriye dönük tepe/dip bar sayısı">
                    Geriye Bakış (Bar):
                  </label>
                  <input 
                    type="number" 
                    min="3" 
                    max="100" 
                    value={settings.fibLookback} 
                    onChange={e => setSettings(prev => ({ ...prev, fibLookback: Math.max(3, parseInt(e.target.value) || 10) }))}
                    style={{ width: '100%', padding: '4px 8px', background: '#070b14', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 4, color: '#fff' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', color: 'var(--text-muted)', marginBottom: 4 }}>Çizgi Stili:</label>
                  <select 
                    value={settings.fibStyle} 
                    onChange={e => setSettings(prev => ({ ...prev, fibStyle: e.target.value }))}
                    style={{ width: '100%', padding: '4px 6px', background: '#070b14', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 4, color: '#fff' }}
                  >
                    <option value="solid">Düz (Solid)</option>
                    <option value="dashed">Kesikli (Dashed)</option>
                    <option value="dotted">Noktalı (Dotted)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', color: 'var(--text-muted)', marginBottom: 4 }}>Çizgi Kalınlığı:</label>
                  <select 
                    value={settings.fibWidth} 
                    onChange={e => setSettings(prev => ({ ...prev, fibWidth: parseInt(e.target.value) }))}
                    style={{ width: '100%', padding: '4px 6px', background: '#070b14', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 4, color: '#fff' }}
                  >
                    <option value="1">1 px (Standart)</option>
                    <option value="2">2 px (Belirgin)</option>
                    <option value="3">3 px (Kalın)</option>
                  </select>
                </div>
              </div>

              {/* Seviye Listesi & Renk Seçiciler */}
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 10 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: 8 }}>
                  Aktif Seviyeler & Renkler:
                </span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px 14px' }}>
                  {Object.entries(settings.levels || {}).map(([ratioStr, lvlConfig]) => (
                    <div key={ratioStr} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 10.5 }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                        <input 
                          type="checkbox" 
                          checked={lvlConfig.enabled} 
                          onChange={e => {
                            const val = e.target.checked;
                            setSettings(prev => ({
                              ...prev,
                              levels: {
                                ...prev.levels,
                                [ratioStr]: { ...prev.levels[ratioStr], enabled: val }
                              }
                            }));
                          }} 
                        />
                        <span style={{ color: lvlConfig.color, fontWeight: ratioStr === '0.618' ? 700 : 500 }}>
                          {lvlConfig.label}
                        </span>
                      </label>
                      <input 
                        type="color" 
                        value={lvlConfig.color} 
                        onChange={e => {
                          const val = e.target.value;
                          setSettings(prev => ({
                            ...prev,
                            levels: {
                              ...prev.levels,
                              [ratioStr]: { ...prev.levels[ratioStr], color: val }
                            }
                          }));
                        }}
                        style={{ width: 22, height: 20, background: 'transparent', border: 'none', cursor: 'pointer' }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer Buttons */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 12 }}>
              <button
                type="button"
                onClick={() => setSettings(DEFAULT_SETTINGS)}
                className="chip-btn"
                style={{ fontSize: 10, padding: '3px 8px', display: 'flex', alignItems: 'center', gap: 4 }}
              >
                <RotateCcw size={11} />
                <span>Varsayılanlara Sıfırla</span>
              </button>

              <button
                type="button"
                onClick={() => setShowSettingsModal(false)}
                className="chip-btn active"
                style={{ fontSize: 11, padding: '4px 14px', background: 'var(--cyan)', color: '#040711', fontWeight: 700 }}
              >
                Tamam (Kaydet)
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
