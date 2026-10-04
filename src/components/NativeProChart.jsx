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
  Eye, 
  EyeOff,
  Layers,
  HelpCircle,
  Check,
  X,
  ExternalLink
} from 'lucide-react';

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

export default function NativeProChart({
  symbol,
  cleanTicker,
  isBist = false,
  activeHolding = null,
  isFullscreen = false,
  onToggleFullscreen,
  sessionTimer = { status: 'open', text: '', badge: '' },
  onOpenAddModal
}) {
  const chartContainerRef = useRef(null);
  const rsiContainerRef = useRef(null);
  const svgOverlayRef = useRef(null);

  const chartInstanceRef = useRef(null);
  const rsiChartInstanceRef = useRef(null);
  const candlestickSeriesRef = useRef(null);
  const volumeSeriesRef = useRef(null);
  const costPriceLineRef = useRef(null);

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

  // Drawing Tools State
  // Modes: null, 'horizontal', 'trendline'
  const [activeDrawTool, setActiveDrawTool] = useState(null);
  const [trendStartPoint, setTrendStartPoint] = useState(null); // { time, price, x, y }
  const [mousePreviewPoint, setMousePreviewPoint] = useState(null);
  const [showDrawingsList, setShowDrawingsList] = useState(false);

  // User persistent drawings per symbol
  // { horizontals: [{ id, price, label, color }], trendlines: [{ id, p1: { time, price }, p2: { time, price }, color }] }
  const [drawings, setDrawings] = useState({ horizontals: [], trendlines: [] });

  // Persistent Active Indicators
  const [indicators, setIndicators] = useState(() => {
    try {
      const saved = localStorage.getItem('terminal_chart_indicators');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return {
      ema20: false,
      ema50: true,
      ema200: true,
      bollinger: false,
      volume: true,
      rsi: true,
      costLine: true
    };
  });

  // Save indicator preferences
  useEffect(() => {
    try {
      localStorage.setItem('terminal_chart_indicators', JSON.stringify(indicators));
    } catch (e) {}
  }, [indicators]);

  // Load symbol's drawings from localStorage whenever symbol changes
  const storageKey = `terminal_drawings_${cleanTicker || symbol}`;
  useEffect(() => {
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
  }, [storageKey, cleanTicker, symbol]);

  // Persist drawings to localStorage
  const saveDrawings = useCallback((newDrawings) => {
    setDrawings(newDrawings);
    try {
      localStorage.setItem(storageKey, JSON.stringify(newDrawings));
    } catch (e) {}
  }, [storageKey]);

  // Fetch candle data for current symbol & interval
  const fetchSymbolCandles = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);

    // Resolve symbol for Yahoo Finance
    const rawUpper = (cleanTicker || symbol || '').toUpperCase().trim();
    let querySymbol = rawUpper;
    if (isBist) {
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
      // 1. Try internal backend API first
      let dataCandles = null;
      try {
        const res = await fetch(`/api/market?chart=${encodeURIComponent(querySymbol)}&interval=${yInterval}&range=${yRange}`);
        if (res.ok) {
          const json = await res.json();
          if (json?.status === 'success' && Array.isArray(json.candles) && json.candles.length > 0) {
            dataCandles = json.candles;
          }
        }
      } catch (e) {
        // Fallback to client-side Yahoo fetch if API fails or local Vite dev
      }

      // 2. Direct Yahoo Finance fallback if API did not return data
      if (!dataCandles || dataCandles.length === 0) {
        const directUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(querySymbol)}?interval=${yInterval}&range=${yRange}`;
        const resp = await fetch(directUrl);
        if (!resp.ok) throw new Error(`Veri sunucusundan yanıt alınamadı (${resp.status})`);
        const j = await resp.json();
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
        dataCandles = parsed;
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
    const totalHeight = container.clientHeight || 600;
    const rsiHeight = indicators.rsi ? 110 : 0;
    const mainHeight = totalHeight - rsiHeight;

    // 1. Create Main Candlestick Chart
    const mainChart = createChart(container, {
      width,
      height: mainHeight > 250 ? mainHeight : 450,
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
          top: 0.1,
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

    // Add Candlestick Series
    const candleSeries = mainChart.addSeries(CandlestickSeries, {
      upColor: '#10b981',
      downColor: '#ef4444',
      borderVisible: false,
      wickUpColor: '#10b981',
      wickDownColor: '#ef4444'
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
        lineWidth: 2,
        title: 'EMA 20'
      });
    } else {
      ema20SeriesRef.current = null;
    }

    if (indicators.ema50) {
      ema50SeriesRef.current = mainChart.addSeries(LineSeries, {
        color: '#3b82f6',
        lineWidth: 2,
        title: 'EMA 50'
      });
    } else {
      ema50SeriesRef.current = null;
    }

    if (indicators.ema200) {
      ema200SeriesRef.current = mainChart.addSeries(LineSeries, {
        color: '#f59e0b',
        lineWidth: 2,
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
        title: 'BB Üst'
      });
      bbMiddleSeriesRef.current = mainChart.addSeries(LineSeries, {
        color: '#a855f7',
        lineWidth: 1.5,
        title: 'BB Orta (20)'
      });
      bbLowerSeriesRef.current = mainChart.addSeries(LineSeries, {
        color: '#c084fc',
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        title: 'BB Alt'
      });
    } else {
      bbUpperSeriesRef.current = null;
      bbMiddleSeriesRef.current = null;
      bbLowerSeriesRef.current = null;
    }

    // 2. Create RSI Sub-Chart (if active)
    if (indicators.rsi && rsiContainerRef.current) {
      const rsiContainer = rsiContainerRef.current;
      const rsiChart = createChart(rsiContainer, {
        width,
        height: 110,
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
          scaleMargins: { top: 0.15, bottom: 0.15 }
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
      // Force SVG overlay re-render
      if (svgOverlayRef.current) {
        svgOverlayRef.current.style.opacity = '0.99';
        setTimeout(() => {
          if (svgOverlayRef.current) svgOverlayRef.current.style.opacity = '1';
        }, 10);
      }
    });

    // Resize Observer for auto responsive sizing
    const resizeObserver = new ResizeObserver(entries => {
      if (!entries || !entries[0] || !chartInstanceRef.current) return;
      const { width: newWidth, height: newTotalHeight } = entries[0].contentRect;
      if (newWidth > 0 && newTotalHeight > 0) {
        const curRsiHeight = indicators.rsi ? 110 : 0;
        const curMainHeight = Math.max(250, newTotalHeight - curRsiHeight);
        chartInstanceRef.current.resize(newWidth, curMainHeight);
        if (rsiChartInstanceRef.current) {
          rsiChartInstanceRef.current.resize(newWidth, 110);
        }
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
  }, [indicators, chartInterval]);

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
    if (ema20SeriesRef.current) {
      ema20SeriesRef.current.setData(calcEMA(candles, 20));
    }
    if (ema50SeriesRef.current) {
      ema50SeriesRef.current.setData(calcEMA(candles, 50));
    }
    if (ema200SeriesRef.current) {
      ema200SeriesRef.current.setData(calcEMA(candles, 200));
    }

    // 4. Set Bollinger Bands
    if (bbUpperSeriesRef.current && bbMiddleSeriesRef.current && bbLowerSeriesRef.current) {
      const bb = calcBollinger(candles, 20, 2);
      bbUpperSeriesRef.current.setData(bb.upper);
      bbMiddleSeriesRef.current.setData(bb.middle);
      bbLowerSeriesRef.current.setData(bb.lower);
    }

    // 5. Set RSI Series
    if (rsiSeriesRef.current) {
      rsiSeriesRef.current.setData(calcRSI(candles, 14));
    }

    // 6. Draw / Update Portfolio Cost Line
    if (candlestickSeriesRef.current) {
      if (costPriceLineRef.current) {
        try {
          candlestickSeriesRef.current.removePriceLine(costPriceLineRef.current);
        } catch (e) {}
        costPriceLineRef.current = null;
      }

      const holdingCost = activeHolding ? (activeHolding.avgPrice || activeHolding.costBasis || activeHolding.avg_cost || 0) : 0;
      if (indicators.costLine && holdingCost > 0) {
        const symMark = activeHolding?.currency === 'TRY' || isBist ? '₺' : '$';
        const costLine = candlestickSeriesRef.current.createPriceLine({
          price: Number(holdingCost),
          color: '#eab308', // Gold / Amber
          lineWidth: 2,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: `🏷️ MALİYET (${symMark}${holdingCost.toFixed(2)})`
        });
        costPriceLineRef.current = costLine;
      }
    }

    // Fit content smoothly on initial data load
    if (chartInstanceRef.current) {
      chartInstanceRef.current.timeScale().fitContent();
    }
  }, [candles, indicators, activeHolding, isBist]);

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
    const time = chartInstanceRef.current.timeScale().coordinateToTime(x);

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
        setTrendStartPoint({ time: time || (candles[candles.length - 1]?.time), price: Number(price.toFixed(2)), x, y });
      } else {
        // Second click sets Point B and completes trendline
        const newTrendlines = [
          ...(drawings.trendlines || []),
          {
            id: `t_${Date.now()}`,
            p1: { time: trendStartPoint.time, price: trendStartPoint.price },
            p2: { time: time || (candles[candles.length - 1]?.time), price: Number(price.toFixed(2)) },
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
    if (window.confirm(`${cleanTicker || symbol} hissesine ait TÜM çizimleri temizlemek istediğinize emin misiniz?`)) {
      saveDrawings({ horizontals: [], trendlines: [] });
      setShowDrawingsList(false);
    }
  };

  // Compute SVG trendlines coordinates from chart instance
  const computedTrendlines = useMemo(() => {
    if (!chartInstanceRef.current || !candlestickSeriesRef.current || !drawings.trendlines) return [];
    const timeScale = chartInstanceRef.current.timeScale();
    const series = candlestickSeriesRef.current;

    return drawings.trendlines.map(t => {
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
  }, [drawings.trendlines, candles]);

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
    const cost = activeHolding.avgPrice || activeHolding.costBasis || activeHolding.avg_cost || 0;
    const shares = activeHolding.shares || activeHolding.quantity || 0;
    const currentPrice = displayBar?.close || activeHolding.currentPrice || cost;
    const pnlPct = cost > 0 ? ((currentPrice - cost) / cost) * 100 : 0;
    const pnlVal = (currentPrice - cost) * shares;
    const symMark = activeHolding.currency === 'TRY' || isBist ? '₺' : '$';

    return {
      cost,
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
            onClick={() => setIndicators(prev => ({ ...prev, ema20: !prev.ema20 }))}
            className={`chip-btn ${indicators.ema20 ? 'active' : ''}`}
            style={{ fontSize: 9.5, padding: '2px 7px', color: indicators.ema20 ? '#06b6d4' : 'inherit', borderColor: indicators.ema20 ? '#06b6d4' : 'rgba(255,255,255,0.1)' }}
          >
            EMA 20
          </button>

          <button
            type="button"
            onClick={() => setIndicators(prev => ({ ...prev, ema50: !prev.ema50 }))}
            className={`chip-btn ${indicators.ema50 ? 'active' : ''}`}
            style={{ fontSize: 9.5, padding: '2px 7px', color: indicators.ema50 ? '#3b82f6' : 'inherit', borderColor: indicators.ema50 ? '#3b82f6' : 'rgba(255,255,255,0.1)' }}
          >
            EMA 50
          </button>

          <button
            type="button"
            onClick={() => setIndicators(prev => ({ ...prev, ema200: !prev.ema200 }))}
            className={`chip-btn ${indicators.ema200 ? 'active' : ''}`}
            style={{ fontSize: 9.5, padding: '2px 7px', color: indicators.ema200 ? '#f59e0b' : 'inherit', borderColor: indicators.ema200 ? '#f59e0b' : 'rgba(255,255,255,0.1)' }}
          >
            EMA 200
          </button>

          <button
            type="button"
            onClick={() => setIndicators(prev => ({ ...prev, bollinger: !prev.bollinger }))}
            className={`chip-btn ${indicators.bollinger ? 'active' : ''}`}
            style={{ fontSize: 9.5, padding: '2px 7px', color: indicators.bollinger ? '#c084fc' : 'inherit', borderColor: indicators.bollinger ? '#c084fc' : 'rgba(255,255,255,0.1)' }}
          >
            Bollinger
          </button>

          <button
            type="button"
            onClick={() => setIndicators(prev => ({ ...prev, volume: !prev.volume }))}
            className={`chip-btn ${indicators.volume ? 'active' : ''}`}
            style={{ fontSize: 9.5, padding: '2px 7px', color: indicators.volume ? '#38bdf8' : 'inherit', borderColor: indicators.volume ? '#38bdf8' : 'rgba(255,255,255,0.1)' }}
          >
            Hacim
          </button>

          <button
            type="button"
            onClick={() => setIndicators(prev => ({ ...prev, rsi: !prev.rsi }))}
            className={`chip-btn ${indicators.rsi ? 'active' : ''}`}
            style={{ fontSize: 9.5, padding: '2px 7px', color: indicators.rsi ? '#ec4899' : 'inherit', borderColor: indicators.rsi ? '#ec4899' : 'rgba(255,255,255,0.1)' }}
          >
            RSI (14)
          </button>

          {holdingInfo && (
            <button
              type="button"
              onClick={() => setIndicators(prev => ({ ...prev, costLine: !prev.costLine }))}
              className={`chip-btn ${indicators.costLine ? 'active' : ''}`}
              style={{ fontSize: 9.5, padding: '2px 7px', color: indicators.costLine ? '#eab308' : 'inherit', borderColor: indicators.costLine ? '#eab308' : 'rgba(255,255,255,0.1)' }}
              title="Portföy maliyet çizgisini grafikte göster/gizle"
            >
              🏷️ Maliyet Çizgisi
            </button>
          )}
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
                        <span style={{ color: '#cbd5e1' }}>Yatay Seviye: <strong>{h.price}</strong></span>
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
            <span style={{ color: '#f8fafc' }}>{holdingInfo.shares} Lot / Adet</span>
            <span style={{ color: '#94a3b8' }}>•</span>
            <span style={{ color: '#f8fafc' }}>Ortalama Maliyet: <strong style={{ color: '#eab308' }}>{holdingInfo.symMark}{holdingInfo.cost.toFixed(2)}</strong></span>
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
          <div style={{ color: '#38bdf8', fontSize: 10, display: 'flex', alignItems: 'center', gap: 6, animation: 'pulse 1.5s infinite' }}>
            <span>✏️ Çizim Modu Aktif: {activeDrawTool === 'horizontal' ? 'İstediğiniz seviyeye tıklayın' : '2 nokta belirleyin'}</span>
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
          minHeight: 400, 
          cursor: activeDrawTool ? 'crosshair' : 'default' 
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
          ref={svgOverlayRef}
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
          {computedTrendlines.map(t => {
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

      {/* 📉 RSI SUB-CHART (If active) */}
      {indicators.rsi && (
        <div 
          style={{ 
            height: 110, 
            width: '100%', 
            borderTop: '1px solid rgba(255, 255, 255, 0.08)', 
            background: '#03050c',
            position: 'relative' 
          }}
        >
          <div 
            style={{ 
              position: 'absolute', 
              top: 4, 
              left: 10, 
              fontSize: 9.5, 
              color: '#ec4899', 
              fontWeight: 700, 
              zIndex: 5,
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            <span>RSI (14)</span>
            <span style={{ color: '#64748b' }}>• 70/30 Seviyeleri</span>
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
          alignItems: 'center'
        }}
      >
        <span>
          💡 <strong>Kalıcı Grafik:</strong> Çizdiğiniz tüm trend ve yatay çizgiler hisse bazında tarayıcınızda saklanır. Başka hisseye geçseniz bile asla silinmez.
        </span>
        <span>
          Fare Tekerleği: Yakınlaştır / Uzaklaştır • Sürükle: Geçmişe Kaydır
        </span>
      </div>

    </div>
  );
}
