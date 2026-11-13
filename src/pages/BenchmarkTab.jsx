import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, registerables } from 'chart.js';
import { LineChart, RefreshCw } from 'lucide-react';

ChartJS.register(...registerables);

const BENCHMARKS = [
  { id: 'SP500', symbol: 'SPY', label: 'S&P 500 (SPY)', color: '#38bdf8' },
  { id: 'NASDAQ', symbol: 'QQQ', label: 'Nasdaq 100 (QQQ)', color: '#a78bfa' },
  { id: 'BIST100', symbol: 'XU100.IS', label: 'BIST 100 (XU100)', color: '#ef4444' },
  { id: 'GOLD', symbol: 'GC=F', label: 'Ons Altın (XAU/USD)', color: '#fbbf24' },
  { id: 'BITCOIN', symbol: 'BTC-USD', label: 'Bitcoin (BTC)', color: '#f97316' }
];

const TIMEFRAMES = [
  { id: '1W', label: '1 Hafta', days: 5 },
  { id: '1M', label: '1 Ay', days: 22 },
  { id: '3M', label: '3 Ay', days: 65 },
  { id: '6M', label: '6 Ay', days: 130 },
  { id: '1Y', label: '1 Yıl', days: 252 }
];

// Align an asset's daily candle array to a reference date list using latest close on or before each date
function alignCandlesToDates(candles, dateList, fallbackSliceLen) {
  if (!Array.isArray(candles) || candles.length === 0 || !Array.isArray(dateList) || dateList.length === 0) {
    return null;
  }
  const sorted = [...candles].filter(c => typeof c.close === 'number' && c.close > 0 && c.time);
  if (sorted.length === 0) return null;

  const alignedCloses = [];
  let ptr = 0;
  let lastKnownClose = null;

  for (const targetDate of dateList) {
    while (ptr < sorted.length && String(sorted[ptr].time) <= String(targetDate)) {
      lastKnownClose = sorted[ptr].close;
      ptr++;
    }
    if (lastKnownClose !== null) {
      alignedCloses.push(lastKnownClose);
    } else {
      // Target date is slightly before first available candle in range; use earliest candle
      alignedCloses.push(sorted[0].close);
    }
  }

  if (alignedCloses.length === 0) {
    const tail = sorted.slice(-fallbackSliceLen);
    return tail.map(c => c.close);
  }
  return alignedCloses;
}

export default function BenchmarkTab() {
  const { currentCurrency, portfolioSummary } = useApp();
  const isTRY = currentCurrency === 'try';
  const sym = isTRY ? '₺' : '$';

  const [timeframe, setTimeframe] = useState('1Y');
  const [candleMap, setCandleMap] = useState({});
  const [holdingCandleMap, setHoldingCandleMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeSeries, setActiveSeries] = useState({
    PORTFOLIO: true,
    SP500: true,
    NASDAQ: false,
    BIST100: false,
    GOLD: false,
    BITCOIN: false
  });

  // Extract unique holding tickers from the user's real Firestore portfolio
  const portfolioTickers = useMemo(() => {
    const list = portfolioSummary?.enrichedHoldings || [];
    const set = new Set();
    list.forEach(h => {
      const t = String(h.ticker || '').trim().toUpperCase();
      if (t) set.add(t);
    });
    return Array.from(set);
  }, [portfolioSummary?.enrichedHoldings]);

  const fetchAllCandles = useCallback(async () => {
    setLoading(true);
    try {
      const bmResults = {};
      await Promise.all(
        BENCHMARKS.map(async (bm) => {
          try {
            const res = await fetch(`/api/market?type=candles&symbol=${encodeURIComponent(bm.symbol)}&interval=1d`);
            if (res.ok) {
              const json = await res.json();
              if (Array.isArray(json.candles) && json.candles.length > 0) {
                bmResults[bm.id] = json.candles;
              }
            }
          } catch (e) {}
        })
      );
      setCandleMap(bmResults);

      // Fetch real historical daily candles for each asset in the user's portfolio in batches of 8
      const hResults = {};
      const batchSize = 8;
      for (let i = 0; i < portfolioTickers.length; i += batchSize) {
        const batch = portfolioTickers.slice(i, i + batchSize);
        await Promise.all(
          batch.map(async (ticker) => {
            try {
              const res = await fetch(`/api/market?type=candles&symbol=${encodeURIComponent(ticker)}&interval=1d`);
              if (res.ok) {
                const json = await res.json();
                if (Array.isArray(json.candles) && json.candles.length > 0) {
                  hResults[ticker] = json.candles;
                }
              }
            } catch (e) {}
          })
        );
      }
      setHoldingCandleMap(hResults);
    } finally {
      setLoading(false);
    }
  }, [portfolioTickers]);

  useEffect(() => {
    fetchAllCandles();
  }, [fetchAllCandles]);

  const tfDays = useMemo(() => {
    return TIMEFRAMES.find(t => t.id === timeframe)?.days || 65;
  }, [timeframe]);

  // Compute real percentage return curves for Benchmarks + User's Real Weighted Portfolio
  const { dates, normalizedCurves, periodReturns, holdingPeriodReturns } = useMemo(() => {
    const spCandles = candleMap.SP500 || [];
    const slice = spCandles.slice(-tfDays);
    const dateList = slice.map(c => c.time);

    const curves = {};
    const returns = {};

    // 1. Compute Benchmark Curves
    for (const bm of BENCHMARKS) {
      const raw = candleMap[bm.id] || [];
      if (raw.length === 0 || dateList.length === 0) {
        curves[bm.id] = [];
        returns[bm.id] = null;
        continue;
      }
      const aligned = alignCandlesToDates(raw, dateList, tfDays);
      if (!aligned || aligned.length === 0) {
        curves[bm.id] = [];
        returns[bm.id] = null;
        continue;
      }
      const baseClose = aligned[0] || 1;
      const pctSeries = aligned.map(close => Number((((close - baseClose) / baseClose) * 100).toFixed(2)));
      curves[bm.id] = pctSeries;
      returns[bm.id] = pctSeries.length > 0 ? pctSeries[pctSeries.length - 1] : null;
    }

    // 2. Compute User's Real Weighted Portfolio Curve from real daily candles of their holdings
    const holdings = portfolioSummary?.enrichedHoldings || [];
    const perHoldingRet = {};
    const weightedSums = new Array(dateList.length).fill(0);
    let totalTrackedWeight = 0;

    for (const h of holdings) {
      const ticker = String(h.ticker || '').trim().toUpperCase();
      const weightVal = Number(isTRY ? h.valTRY : h.valUSD) || 0;
      const rawCandles = holdingCandleMap[ticker];
      if (!rawCandles || rawCandles.length === 0 || dateList.length === 0) {
        perHoldingRet[ticker] = null;
        continue;
      }

      const aligned = alignCandlesToDates(rawCandles, dateList, tfDays);
      if (!aligned || aligned.length === 0 || !aligned[0]) {
        perHoldingRet[ticker] = null;
        continue;
      }

      const baseClose = aligned[0];
      const hSeries = aligned.map(c => ((c - baseClose) / baseClose) * 100);
      perHoldingRet[ticker] = Number(hSeries[hSeries.length - 1].toFixed(2));

      if (weightVal > 0) {
        for (let i = 0; i < dateList.length; i++) {
          weightedSums[i] += weightVal * hSeries[i];
        }
        totalTrackedWeight += weightVal;
      }
    }

    // Also include physical gold (Gram Altın) if present in portfolioSummary
    const physGoldVal = isTRY
      ? (Number(portfolioSummary?.totalGoldValTRY) || 0)
      : ((Number(portfolioSummary?.totalGoldValTRY) || 0) / (portfolioSummary?.usdtry || 49.03));

    if (physGoldVal > 0 && curves.GOLD && curves.GOLD.length === dateList.length) {
      for (let i = 0; i < dateList.length; i++) {
        weightedSums[i] += physGoldVal * curves.GOLD[i];
      }
      totalTrackedWeight += physGoldVal;
    }

    if (totalTrackedWeight > 0 && dateList.length > 0) {
      const portSeries = weightedSums.map(sum => Number((sum / totalTrackedWeight).toFixed(2)));
      curves.PORTFOLIO = portSeries;
      returns.PORTFOLIO = portSeries[portSeries.length - 1];
    } else {
      curves.PORTFOLIO = [];
      returns.PORTFOLIO = null;
    }

    return {
      dates: dateList,
      normalizedCurves: curves,
      periodReturns: returns,
      holdingPeriodReturns: perHoldingRet
    };
  }, [candleMap, holdingCandleMap, tfDays, portfolioSummary, isTRY]);

  const chartData = useMemo(() => {
    const datasets = [];

    // Primary Line: User's Real Portfolio
    if (activeSeries.PORTFOLIO && normalizedCurves.PORTFOLIO?.length > 0) {
      datasets.push({
        label: 'PORTFÖYÜM (Gerçek Ağırlıklı Sepet)',
        data: normalizedCurves.PORTFOLIO,
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.12)',
        borderWidth: 3.2,
        pointRadius: 0,
        pointHoverRadius: 5,
        fill: true,
        tension: 0.25
      });
    }

    // Benchmark Lines
    BENCHMARKS.forEach(bm => {
      if (activeSeries[bm.id] && normalizedCurves[bm.id]?.length > 0) {
        datasets.push({
          label: bm.label,
          data: normalizedCurves[bm.id],
          borderColor: bm.color,
          backgroundColor: 'transparent',
          borderWidth: 2.1,
          pointRadius: 0,
          pointHoverRadius: 4,
          tension: 0.25
        });
      }
    });

    return {
      labels: dates,
      datasets
    };
  }, [dates, normalizedCurves, activeSeries]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: {
        labels: { color: '#cbd5e1', font: { size: 11, weight: 'bold' } }
      },
      tooltip: {
        callbacks: {
          label: (ctx) => `${ctx.dataset.label}: ${ctx.parsed.y >= 0 ? '+' : ''}${ctx.parsed.y.toFixed(2)}%`
        }
      }
    },
    scales: {
      x: {
        ticks: { color: '#64748b', maxTicksLimit: 10 },
        grid: { color: 'rgba(255,255,255,0.04)' }
      },
      y: {
        ticks: {
          color: '#94a3b8',
          callback: (v) => `${v >= 0 ? '+' : ''}${v}%`
        },
        grid: { color: 'rgba(255,255,255,0.06)' }
      }
    }
  };

  const [sortConfig, setSortConfig] = useState({
    key: 'dayPct',
    direction: 'desc'
  });

  const handleSort = (key) => {
    setSortConfig(prev => {
      if (prev.key === key) {
        return {
          key,
          direction: prev.direction === 'desc' ? 'asc' : 'desc'
        };
      }
      return {
        key,
        direction: key === 'ticker' ? 'asc' : 'desc'
      };
    });
  };

  const renderSortIndicator = (key) => {
    if (sortConfig.key !== key) {
      return (
        <span style={{ color: '#475569', fontSize: '0.72rem', opacity: 0.6, userSelect: 'none' }}>
          ⇅
        </span>
      );
    }
    return (
      <span style={{ color: '#38bdf8', fontSize: '0.75rem', fontWeight: 900, userSelect: 'none' }}>
        {sortConfig.direction === 'asc' ? '▲' : '▼'}
      </span>
    );
  };

  // Pre-calculate computed row metrics for fast & robust column sorting
  const enrichedHoldingsList = useMemo(() => {
    const list = portfolioSummary?.enrichedHoldings || [];
    return list.map(h => {
      const ticker = String(h.ticker || '').trim().toUpperCase();
      const val = isTRY ? Number(h.valTRY || 0) : Number(h.valUSD || 0);
      const prof = isTRY ? Number(h.profitTRY || 0) : Number(h.profitUSD || 0);
      const periodRet = holdingPeriodReturns[ticker] != null ? Number(holdingPeriodReturns[ticker]) : null;
      const retPct = Number(h.returnPct || 0);
      const rawCandles = holdingCandleMap[ticker] || [];
      const candleDayPct = rawCandles.length >= 2 && rawCandles[rawCandles.length - 2]?.close > 0
        ? ((rawCandles[rawCandles.length - 1].close - rawCandles[rawCandles.length - 2].close) / rawCandles[rawCandles.length - 2].close) * 100
        : null;
      const dayPct = (typeof h.changePct === 'number' && h.changePct !== 0)
        ? Number(h.changePct)
        : (candleDayPct !== null ? Number(candleDayPct) : Number(h.changePct || 0));

      return {
        ...h,
        calculatedTicker: ticker,
        calculatedVal: val,
        calculatedProf: prof,
        calculatedPeriodRet: periodRet,
        calculatedRetPct: retPct,
        calculatedDayPct: dayPct
      };
    });
  }, [portfolioSummary?.enrichedHoldings, isTRY, holdingPeriodReturns, holdingCandleMap]);

  const sortedHoldings = useMemo(() => {
    const list = [...enrichedHoldingsList];
    const { key, direction } = sortConfig;
    const isAsc = direction === 'asc';

    list.sort((a, b) => {
      if (key === 'ticker') {
        const valA = String(a.ticker || a.calculatedTicker || '').toUpperCase();
        const valB = String(b.ticker || b.calculatedTicker || '').toUpperCase();
        return isAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }

      let valA, valB;
      if (key === 'dayPct') {
        valA = a.calculatedDayPct;
        valB = b.calculatedDayPct;
      } else if (key === 'val') {
        valA = a.calculatedVal;
        valB = b.calculatedVal;
      } else if (key === 'retPct') {
        valA = a.calculatedRetPct;
        valB = b.calculatedRetPct;
      } else if (key === 'prof') {
        valA = a.calculatedProf;
        valB = b.calculatedProf;
      } else if (key === 'periodRet') {
        valA = a.calculatedPeriodRet;
        valB = b.calculatedPeriodRet;
      } else {
        valA = a.calculatedDayPct;
        valB = b.calculatedDayPct;
      }

      if (valA == null && valB == null) return 0;
      if (valA == null) return 1;
      if (valB == null) return -1;

      return isAsc ? (valA - valB) : (valB - valA);
    });

    return list;
  }, [enrichedHoldingsList, sortConfig]);

  const portfolioCostReturnPct = portfolioSummary?.unrealizedReturnPct ?? 0;
  const portfolioPeriodRet = periodReturns.PORTFOLIO;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', paddingBottom: '40px' }}>
      {/* HEADER */}
      <div style={{
        background: 'rgba(15, 23, 42, 0.9)',
        border: '1px solid rgba(56, 189, 248, 0.3)',
        borderRadius: '14px',
        padding: '20px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '14px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <span style={{
              background: 'rgba(16, 185, 129, 0.2)',
              color: '#34d399',
              border: '1px solid rgba(16, 185, 129, 0.4)',
              fontSize: '0.7rem',
              fontWeight: 800,
              padding: '3px 9px',
              borderRadius: '6px'
            }}>
              %100 CANLI YAHOO FINANCE GÜNLÜK MUM VERİSİ (PORTFÖY + BENCHMARK)
            </span>
          </div>
          <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 900, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <LineChart size={20} style={{ color: '#38bdf8' }} />
            <span>Küresel Benchmark & Gerçek Portföy Kıyaslaması</span>
          </h2>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', color: '#94a3b8' }}>
            Portföyünüzdeki gerçek varlıkların güncel ağırlıklarıyla hesaplanan tarihsel getiri eğrisi ile S&P 500, Nasdaq 100, BIST 100, Altın ve Bitcoin kıyaslaması.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', background: 'rgba(2, 6, 23, 0.8)', padding: '4px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)' }}>
            {TIMEFRAMES.map(tf => (
              <button
                key={tf.id}
                onClick={() => setTimeframe(tf.id)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: 'none',
                  background: timeframe === tf.id ? '#2563eb' : 'transparent',
                  color: timeframe === tf.id ? '#fff' : '#94a3b8',
                  fontWeight: 800,
                  fontSize: '0.76rem',
                  cursor: 'pointer'
                }}
              >
                {tf.label}
              </button>
            ))}
          </div>

          <button
            onClick={fetchAllCandles}
            style={{
              padding: '7px 12px',
              borderRadius: '8px',
              border: '1px solid rgba(56, 189, 248, 0.4)',
              background: 'rgba(56, 189, 248, 0.15)',
              color: '#38bdf8',
              fontSize: '0.76rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <RefreshCw size={13} /> Yenile
          </button>
        </div>
      </div>

      {/* KPI CARDS FOR REAL PORTFOLIO + REAL BENCHMARKS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
        {/* USER'S REAL WEIGHTED PORTFOLIO CARD (CLICKABLE FOR CHART TOGGLE) */}
        <div
          onClick={() => setActiveSeries(prev => ({ ...prev, PORTFOLIO: !prev.PORTFOLIO }))}
          style={{
            background: activeSeries.PORTFOLIO ? 'rgba(16, 185, 129, 0.14)' : 'rgba(15, 23, 42, 0.45)',
            border: `1.5px solid ${activeSeries.PORTFOLIO ? '#10b981' : 'rgba(255,255,255,0.08)'}`,
            borderRadius: '12px',
            padding: '14px',
            cursor: 'pointer',
            opacity: activeSeries.PORTFOLIO ? 1 : 0.65
          }}
        >
          <div style={{ fontSize: '0.7rem', color: '#d1fae5', fontWeight: 800 }}>
            PORTFÖYÜM ({timeframe})
          </div>
          <div style={{
            fontSize: '1.35rem',
            fontWeight: 900,
            fontFamily: 'monospace',
            color: portfolioPeriodRet == null ? '#94a3b8' : portfolioPeriodRet >= 0 ? '#10b981' : '#ef4444',
            marginTop: '4px'
          }}>
            {portfolioPeriodRet == null ? '—' : `${portfolioPeriodRet >= 0 ? '+' : ''}${portfolioPeriodRet.toFixed(2)}%`}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.67rem', color: '#6ee7b7', marginTop: '3px' }}>
            <span>{activeSeries.PORTFOLIO ? '✓ Grafikte Aktif' : 'Grafiğe Ekle'}</span>
            <span style={{ color: '#94a3b8' }}>
              Maliyet K/Z: {portfolioCostReturnPct >= 0 ? '+' : ''}{portfolioCostReturnPct.toFixed(1)}%
            </span>
          </div>
        </div>

        {BENCHMARKS.map(bm => {
          const ret = periodReturns[bm.id];
          const isSelected = activeSeries[bm.id];
          return (
            <div
              key={bm.id}
              onClick={() => setActiveSeries(prev => ({ ...prev, [bm.id]: !prev[bm.id] }))}
              style={{
                background: isSelected ? 'rgba(15, 23, 42, 0.9)' : 'rgba(15, 23, 42, 0.45)',
                border: `1px solid ${isSelected ? bm.color : 'rgba(255,255,255,0.07)'}`,
                borderRadius: '12px',
                padding: '14px',
                cursor: 'pointer',
                opacity: isSelected ? 1 : 0.6
              }}
            >
              <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 700 }}>{bm.label} ({timeframe})</div>
              <div style={{
                fontSize: '1.3rem',
                fontWeight: 900,
                fontFamily: 'monospace',
                color: ret == null ? '#64748b' : ret >= 0 ? '#10b981' : '#ef4444',
                marginTop: '4px'
              }}>
                {ret == null ? '—' : `${ret >= 0 ? '+' : ''}${ret.toFixed(2)}%`}
              </div>
              <div style={{ fontSize: '0.68rem', color: bm.color, marginTop: '2px' }}>
                {isSelected ? '✓ Grafikte Aktif' : 'Grafiğe Eklemek İçin Tıkla'}
              </div>
            </div>
          );
        })}
      </div>

      {/* LIVE NORMALIZED CHART */}
      <div style={{
        background: 'rgba(15, 23, 42, 0.88)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '14px',
        padding: '20px'
      }}>
        <h3 style={{ margin: '0 0 14px 0', fontSize: '0.95rem', fontWeight: 800, color: '#f8fafc' }}>
          📈 Canlı Normalize Yüzdesel Getiri Grafiği ({timeframe}) — Portföyüm vs Küresel Endeksler
        </h3>
        <div style={{ height: '360px' }}>
          {loading ? (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
              ⏳ Portföy Varlıkları ve Küresel Benchmark Mum Serileri Çekiliyor...
            </div>
          ) : (
            <Line data={chartData} options={chartOptions} />
          )}
        </div>
      </div>

      {/* REAL PORTFOLIO HOLDINGS PERFORMANCE TABLE */}
      <div style={{
        background: 'rgba(15, 23, 42, 0.88)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '14px',
        padding: '20px',
        overflowX: 'auto'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
          <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#f8fafc' }}>
            💼 Portföyünüzdeki Gerçek Pozisyonların Dönemsel ({timeframe}) ve Maliyet Bazlı Performansı
          </h3>
          <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
            💡 Sıralamak için sütun başlıklarına tıklayabilirsiniz
          </span>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', textAlign: 'left', userSelect: 'none' }}>
              {/* 1. GÜNLÜK DEĞİŞİM (EN SOLDA) */}
              <th
                onClick={() => handleSort('dayPct')}
                style={{ padding: '10px 8px', cursor: 'pointer', textAlign: 'left', minWidth: '130px' }}
                title="Günlük değişime göre sırala"
              >
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ color: sortConfig.key === 'dayPct' ? '#38bdf8' : '#94a3b8' }}>Günlük Değişim %</span>
                  {renderSortIndicator('dayPct')}
                </div>
              </th>

              {/* 2. VARLIK */}
              <th
                onClick={() => handleSort('ticker')}
                style={{ padding: '10px 8px', cursor: 'pointer', textAlign: 'left', minWidth: '140px' }}
                title="Varlık sembolüne göre sırala"
              >
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ color: sortConfig.key === 'ticker' ? '#38bdf8' : '#94a3b8' }}>Varlık</span>
                  {renderSortIndicator('ticker')}
                </div>
              </th>

              {/* 3. GÜNCEL DEĞER */}
              <th
                onClick={() => handleSort('val')}
                style={{ padding: '10px 8px', cursor: 'pointer', textAlign: 'right', minWidth: '120px' }}
                title="Güncel portföy değerine göre sırala"
              >
                <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', width: '100%', gap: '4px' }}>
                  <span style={{ color: sortConfig.key === 'val' ? '#38bdf8' : '#94a3b8' }}>Güncel Değer</span>
                  {renderSortIndicator('val')}
                </div>
              </th>

              {/* 4. MALİYET BAZLI K/Z % */}
              <th
                onClick={() => handleSort('retPct')}
                style={{ padding: '10px 8px', cursor: 'pointer', textAlign: 'right', minWidth: '130px' }}
                title="Maliyet bazlı kâr/zarar oranına göre sırala"
              >
                <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', width: '100%', gap: '4px' }}>
                  <span style={{ color: sortConfig.key === 'retPct' ? '#38bdf8' : '#94a3b8' }}>Maliyet Bazlı K/Z %</span>
                  {renderSortIndicator('retPct')}
                </div>
              </th>

              {/* 5. NET KÂR / ZARAR */}
              <th
                onClick={() => handleSort('prof')}
                style={{ padding: '10px 8px', cursor: 'pointer', textAlign: 'right', minWidth: '120px' }}
                title="Açık net kâr/zarar tutarına göre sırala"
              >
                <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', width: '100%', gap: '4px' }}>
                  <span style={{ color: sortConfig.key === 'prof' ? '#38bdf8' : '#94a3b8' }}>Net Kâr / Zarar</span>
                  {renderSortIndicator('prof')}
                </div>
              </th>

              {/* 6. DÖNEM GETİRİSİ (EN SAĞDA) */}
              <th
                onClick={() => handleSort('periodRet')}
                style={{ padding: '10px 8px', cursor: 'pointer', textAlign: 'right', minWidth: '150px' }}
                title="Dönemsel benchmark getirisine göre sırala"
              >
                <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', width: '100%', gap: '4px' }}>
                  <span style={{ color: sortConfig.key === 'periodRet' ? '#38bdf8' : '#94a3b8' }}>Dönem Getirisi ({timeframe})</span>
                  {renderSortIndicator('periodRet')}
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedHoldings.map((h) => {
              const val = h.calculatedVal;
              const prof = h.calculatedProf;
              const periodRet = h.calculatedPeriodRet;
              const retPct = h.calculatedRetPct;
              const dayPct = h.calculatedDayPct;

              return (
                <tr key={h.id || h.ticker} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', transition: 'background 0.15s' }}>
                  {/* 1. GÜNLÜK DEĞİŞİM (EN SOLDA) */}
                  <td style={{ padding: '10px 8px', textAlign: 'left' }}>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '3px',
                      padding: '3px 8px',
                      borderRadius: '6px',
                      fontFamily: 'monospace',
                      fontWeight: 800,
                      fontSize: '0.78rem',
                      background: dayPct >= 0 ? 'rgba(16, 185, 129, 0.14)' : 'rgba(239, 68, 68, 0.14)',
                      color: dayPct >= 0 ? '#10b981' : '#ef4444',
                      border: `1px solid ${dayPct >= 0 ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
                    }}>
                      {dayPct >= 0 ? '▲ +' : '▼ '}{dayPct.toFixed(2)}%
                    </span>
                  </td>

                  {/* 2. VARLIK */}
                  <td style={{ padding: '10px 8px', fontWeight: 800, color: '#f8fafc' }}>
                    <span style={{ color: '#38bdf8' }}>{h.ticker}</span>{' '}
                    <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 500 }}>{h.name}</span>
                  </td>

                  {/* 3. GÜNCEL DEĞER */}
                  <td style={{ padding: '10px 8px', textAlign: 'right', fontFamily: 'monospace', color: '#e2e8f0', fontWeight: 700 }}>
                    {sym}{val.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>

                  {/* 4. MALİYET BAZLI K/Z % */}
                  <td style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 800, color: retPct >= 0 ? '#10b981' : '#ef4444' }}>
                    {retPct >= 0 ? '+' : ''}{retPct.toFixed(2)}%
                  </td>

                  {/* 5. NET KÂR / ZARAR */}
                  <td style={{ padding: '10px 8px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 800, color: prof >= 0 ? '#10b981' : '#ef4444' }}>
                    {prof >= 0 ? '+' : ''}{sym}{prof.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>

                  {/* 6. DÖNEM GETİRİSİ (EN SAĞDA) */}
                  <td style={{
                    padding: '10px 8px',
                    textAlign: 'right',
                    fontFamily: 'monospace',
                    fontWeight: 900,
                    fontSize: '0.84rem',
                    color: periodRet == null ? '#64748b' : periodRet >= 0 ? '#10b981' : '#ef4444'
                  }}>
                    {periodRet == null ? '—' : `${periodRet >= 0 ? '+' : ''}${periodRet.toFixed(2)}%`}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
