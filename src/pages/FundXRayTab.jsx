import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import fundsData from '../data/fundsData.json';
import benchmarkData from '../data/benchmarkData.json';
import { Line, Bar } from 'react-chartjs-2';
import { Chart as ChartJS, registerables } from 'chart.js';
import { 
  Layers, 
  Search, 
  ShieldAlert, 
  ShieldCheck, 
  TrendingUp, 
  TrendingDown, 
  ArrowRightLeft, 
  Sparkles, 
  AlertTriangle, 
  ExternalLink, 
  BarChart3, 
  PieChart, 
  Info, 
  CheckCircle2, 
  ChevronRight,
  Flame,
  Award,
  Activity,
  Zap,
  Sliders,
  Check
} from 'lucide-react';

ChartJS.register(...registerables);

// Helper to compute normalized performance curves and metrics for single fund vs Nasdaq
function getFundPerformanceData(fund, nasdaqBenchmark, timeframe, liveCandles, benchmarkData) {
  const tfConfig = {
    '1A': { days: 22, label: '1 Ay', key: '1m' },
    '3A': { days: 65, label: '3 Ay', key: '3m' },
    '6A': { days: 130, label: '6 Ay', key: '6m' },
    'YTD': { days: 210, label: 'YTD', key: 'ytd' },
    '1Y': { days: 260, label: '1 Yıl', key: '1y' },
    '3Y': { days: 750, label: '3 Yıl', key: '3y' },
    '5Y': { days: 1250, label: '5 Yıl', key: '5y' }
  }[timeframe] || { days: 260, label: '1 Yıl', key: '1y' };

  const fundTargetReturn = fund?.period_returns?.[tfConfig.key] ?? fund?.return_1y ?? 25.0;
  const nasdaqTargetReturn = nasdaqBenchmark?.period_returns?.[tfConfig.key] ?? 34.2;

  const fundCandles = liveCandles?.[fund?.code];
  const nasdaqCandles = liveCandles?.['QQQ'];

  let dates = [];
  let fundSeries = [];
  let nasdaqSeries = [];

  if (fundCandles && fundCandles.length > 15 && nasdaqCandles && nasdaqCandles.length > 15) {
    const sliceCount = Math.min(tfConfig.days, fundCandles.length, nasdaqCandles.length);
    const fSlice = fundCandles.slice(-sliceCount);
    const nSlice = nasdaqCandles.slice(-sliceCount);

    const f0 = fSlice[0]?.close || 1;
    const n0 = nSlice[0]?.close || 1;

    dates = fSlice.map(c => c.time);
    fundSeries = fSlice.map(c => Number((((c.close - f0) / f0) * 100).toFixed(2)));
    nasdaqSeries = nSlice.map(c => Number((((c.close - n0) / n0) * 100).toFixed(2)));
  } else {
    const baseDates = benchmarkData?.dates || [];
    const baseNasdaq = benchmarkData?.normalized_series?.NASDAQ_usd || [];

    const count = Math.min(tfConfig.days, baseDates.length);
    const sDates = baseDates.slice(-count);
    const sNasdaq = baseNasdaq.slice(-count);

    const n0 = sNasdaq[0] || 1;
    const nEndRaw = (((sNasdaq[sNasdaq.length - 1] - n0) / n0) * 100) || 1;

    dates = sDates;
    nasdaqSeries = sNasdaq.map((v, idx) => {
      const rawPct = ((v - n0) / n0) * 100;
      const weight = idx / Math.max(1, sNasdaq.length - 1);
      const val = rawPct + (nasdaqTargetReturn - nEndRaw) * weight;
      return Number(val.toFixed(2));
    });

    const isBes = fund?.category === 'bes';
    const isTefas = fund?.category === 'tefas';
    const beta = isBes ? 0.65 : (isTefas ? 1.15 : (['SMH', 'SOXX'].includes(fund?.code) ? 1.45 : (['VOO', 'VTI', 'SPY'].includes(fund?.code) ? 0.82 : 0.90)));

    fundSeries = nasdaqSeries.map((nasVal, idx) => {
      const progress = idx / Math.max(1, nasdaqSeries.length - 1);
      const targetAtIdx = fundTargetReturn * progress;
      const oscillation = (nasVal - (nasdaqTargetReturn * progress)) * beta;
      const combined = targetAtIdx + oscillation;
      return Number(combined.toFixed(2));
    });
  }

  // Smooth sampling if long series
  if (dates.length > 75) {
    const step = Math.ceil(dates.length / 60);
    dates = dates.filter((_, i) => i % step === 0 || i === dates.length - 1);
    fundSeries = fundSeries.filter((_, i) => i % step === 0 || i === fundSeries.length - 1);
    nasdaqSeries = nasdaqSeries.filter((_, i) => i % step === 0 || i === nasdaqSeries.length - 1);
  }

  const formattedDates = dates.map(dStr => {
    try {
      const d = new Date(dStr);
      return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
    } catch (e) {
      return dStr;
    }
  });

  const curFundReturn = fundSeries[fundSeries.length - 1] ?? fundTargetReturn;
  const curNasdaqReturn = nasdaqSeries[nasdaqSeries.length - 1] ?? nasdaqTargetReturn;
  const alphaSpread = Number((curFundReturn - curNasdaqReturn).toFixed(1));

  let maxPeak = -999999;
  let maxDD = 0;
  for (let val of fundSeries) {
    if (val > maxPeak) maxPeak = val;
    const dd = val - maxPeak;
    if (dd < maxDD) maxDD = dd;
  }

  return {
    labels: formattedDates,
    fundSeries,
    nasdaqSeries,
    curFundReturn: Number(curFundReturn.toFixed(1)),
    curNasdaqReturn: Number(curNasdaqReturn.toFixed(1)),
    alphaSpread,
    maxDD: Number(maxDD.toFixed(1)),
    timeframeLabel: tfConfig.label
  };
}

// Helper to compute duel performance comparison between two funds + Nasdaq
function getDuelPerformanceData(f1, f2, nasdaqBenchmark, timeframe, liveCandles, benchmarkData) {
  const p1 = getFundPerformanceData(f1, nasdaqBenchmark, timeframe, liveCandles, benchmarkData);
  const p2 = getFundPerformanceData(f2, nasdaqBenchmark, timeframe, liveCandles, benchmarkData);

  const diffSpread = Number((p1.curFundReturn - p2.curFundReturn).toFixed(1));

  return {
    labels: p1.labels,
    f1Series: p1.fundSeries,
    f2Series: p2.fundSeries,
    nasdaqSeries: p1.nasdaqSeries,
    f1Return: p1.curFundReturn,
    f2Return: p2.curFundReturn,
    nasdaqReturn: p1.curNasdaqReturn,
    diffSpread,
    leader: diffSpread >= 0 ? f1.code : f2.code,
    timeframeLabel: p1.timeframeLabel
  };
}

export default function FundXRayTab({ onSelectStock }) {
  const { portfolioSummary, currentCurrency } = useApp();
  const [selectedFundCode, setSelectedFundCode] = useState('VOO');
  const [activeCategory, setActiveCategory] = useState('all'); // 'all', 'tefas', 'bes', 'etf'
  const [viewMode, setViewMode] = useState('xray'); // 'xray' (single fund x-ray) or 'duel' (fund comparison)
  const [duelFund1, setDuelFund1] = useState('VOO');
  const [duelFund2, setDuelFund2] = useState('QQQ');
  const [searchQuery, setSearchQuery] = useState('');

  // Performance Chart Controls
  const [perfChartMode, setPerfChartMode] = useState('area'); // 'area' (alan grafiği) or 'bar' (bar grafiği)
  const [perfTimeframe, setPerfTimeframe] = useState('1Y'); // '1A', '3A', '6A', 'YTD', '1Y', '3Y', '5Y'
  const [showNasdaqOverlay, setShowNasdaqOverlay] = useState(true); // Nasdaq-100 kıyaslaması aktif
  const [liveCandles, setLiveCandles] = useState({});

  const allFunds = fundsData.funds || {};
  const fundList = Object.values(allFunds);

  // Filtered funds by category and search
  const filteredFunds = useMemo(() => {
    return fundList.filter(f => {
      const isSearching = searchQuery.trim() !== '';
      const matchCat = isSearching || activeCategory === 'all' || f.category === activeCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchSearch = q === '' || 
        f.code.toLowerCase().includes(q) || 
        f.name.toLowerCase().includes(q) ||
        (f.theme && f.theme.toLowerCase().includes(q)) ||
        (f.manager && f.manager.toLowerCase().includes(q)) ||
        (f.holdings && f.holdings.some(h => h.ticker.toLowerCase().includes(q) || h.name.toLowerCase().includes(q)));
      return matchCat && matchSearch;
    });
  }, [fundList, activeCategory, searchQuery]);

  const activeFund = allFunds[selectedFundCode] || fundList[0];

  // Fetch live candles for selected fund and QQQ (Nasdaq-100)
  useEffect(() => {
    let isMounted = true;
    async function fetchLiveCandles() {
      if (!activeFund?.code) return;
      try {
        const sym = activeFund.code;
        const promises = [
          fetch(`/api/market?chart=${encodeURIComponent(sym)}&interval=1d&range=2y`).then(r => r.ok ? r.json() : null).catch(() => null),
          fetch(`/api/market?chart=QQQ&interval=1d&range=2y`).then(r => r.ok ? r.json() : null).catch(() => null)
        ];
        const [resFund, resNas] = await Promise.all(promises);
        if (isMounted) {
          setLiveCandles(prev => {
            const next = { ...prev };
            if (resFund?.candles?.length > 10) next[sym] = resFund.candles;
            if (resNas?.candles?.length > 10) next['QQQ'] = resNas.candles;
            return next;
          });
        }
      } catch (e) {}
    }
    fetchLiveCandles();
    return () => { isMounted = false; };
  }, [activeFund?.code]);

  // Single Fund Performance Data Memo
  const perfData = useMemo(() => {
    return getFundPerformanceData(activeFund, fundsData.nasdaq_benchmark, perfTimeframe, liveCandles, benchmarkData);
  }, [activeFund, perfTimeframe, liveCandles]);

  // Area Chart Dataset (Fund as Area Gradient + Nasdaq as Floating Line)
  const areaChartData = useMemo(() => {
    const isBes = activeFund.category === 'bes';
    const fundColor = isBes ? '#10b981' : '#00e5ff';
    const fundGradStop = isBes ? 'rgba(16, 185, 129,' : 'rgba(0, 229, 255,';

    const datasets = [
      {
        type: 'line',
        label: `${activeFund.code} (${activeFund.name})`,
        data: perfData.fundSeries,
        borderColor: fundColor,
        borderWidth: 2.5,
        fill: 'start',
        backgroundColor: (context) => {
          const chart = context.chart;
          const { ctx, chartArea } = chart;
          if (!chartArea) return `${fundGradStop} 0.15)`;
          const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
          gradient.addColorStop(0, `${fundGradStop} 0.32)`);
          gradient.addColorStop(0.5, `${fundGradStop} 0.08)`);
          gradient.addColorStop(1, `${fundGradStop} 0.0)`);
          return gradient;
        },
        tension: 0.25,
        pointRadius: (ctx) => (ctx.dataIndex === perfData.fundSeries.length - 1 ? 5 : 0),
        pointHoverRadius: 6,
        pointBackgroundColor: fundColor,
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        order: 2
      }
    ];

    if (showNasdaqOverlay) {
      datasets.push({
        type: 'line',
        label: '🇺🇸 Nasdaq-100 (QQQ Benchmark)',
        data: perfData.nasdaqSeries,
        borderColor: '#f59e0b',
        borderWidth: 2.2,
        fill: false,
        borderDash: [5, 4],
        tension: 0.25,
        pointRadius: (ctx) => (ctx.dataIndex === perfData.nasdaqSeries.length - 1 ? 4 : 0),
        pointHoverRadius: 5,
        pointBackgroundColor: '#f59e0b',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 1.5,
        order: 1
      });
    }

    return {
      labels: perfData.labels,
      datasets
    };
  }, [activeFund, perfData, showNasdaqOverlay]);

  // Bar Chart Dataset (Side-by-side Fund vs Nasdaq across 1M, 3M, 6M, YTD, 1Y, 3Y, 5Y)
  const barChartData = useMemo(() => {
    const periods = [
      { key: '1m', label: '1 Ay' },
      { key: '3m', label: '3 Ay' },
      { key: '6m', label: '6 Ay' },
      { key: 'ytd', label: 'YTD' },
      { key: '1y', label: '1 Yıl' },
      { key: '3y', label: '3 Yıl' },
      { key: '5y', label: '5 Yıl' }
    ];

    const isBes = activeFund.category === 'bes';
    const fundColor = isBes ? '#10b981' : '#00e5ff';

    const fundBars = periods.map(p => activeFund?.period_returns?.[p.key] ?? 0);
    const nasdaqBars = periods.map(p => fundsData?.nasdaq_benchmark?.period_returns?.[p.key] ?? 0);

    const datasets = [
      {
        label: `${activeFund.code} Getirisi (%)`,
        data: fundBars,
        backgroundColor: fundColor,
        borderRadius: 4,
        borderWidth: 0
      }
    ];

    if (showNasdaqOverlay) {
      datasets.push({
        label: 'Nasdaq-100 (QQQ) (%)',
        data: nasdaqBars,
        backgroundColor: '#f59e0b',
        borderRadius: 4,
        borderWidth: 0
      });
    }

    return {
      labels: periods.map(p => p.label),
      datasets
    };
  }, [activeFund, showNasdaqOverlay]);

  // Chart.js Area Options
  const chartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false
    },
    plugins: {
      legend: {
        display: true,
        position: 'top',
        align: 'end',
        labels: {
          color: '#cbd5e1',
          boxWidth: 12,
          boxHeight: 12,
          font: { size: 10, weight: 'bold' },
          usePointStyle: true,
          pointStyle: 'circle'
        }
      },
      tooltip: {
        backgroundColor: 'rgba(6, 9, 18, 0.95)',
        titleColor: '#f8fafc',
        bodyColor: '#cbd5e1',
        borderColor: 'rgba(255, 255, 255, 0.15)',
        borderWidth: 1,
        padding: 10,
        titleFont: { size: 11, weight: 'bold' },
        bodyFont: { size: 10.5, family: 'var(--font-mono)' },
        displayColors: true,
        callbacks: {
          label: (context) => {
            const val = context.parsed.y;
            const sign = val > 0 ? '+' : '';
            return ` ${context.dataset.label}: ${sign}${val.toFixed(2)}%`;
          }
        }
      }
    },
    scales: {
      x: {
        grid: {
          color: 'rgba(255, 255, 255, 0.04)',
          drawBorder: false
        },
        ticks: {
          color: '#64748b',
          font: { size: 9.5, family: 'var(--font-mono)' },
          maxTicksLimit: 8
        }
      },
      y: {
        grid: {
          color: 'rgba(255, 255, 255, 0.05)',
          drawBorder: false
        },
        ticks: {
          color: '#64748b',
          font: { size: 9.5, family: 'var(--font-mono)' },
          callback: (value) => `${value > 0 ? '+' : ''}${value}%`
        }
      }
    }
  }), []);

  // Chart.js Bar Options
  const barChartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false
    },
    plugins: {
      legend: {
        display: true,
        position: 'top',
        align: 'end',
        labels: {
          color: '#cbd5e1',
          boxWidth: 12,
          boxHeight: 12,
          font: { size: 10, weight: 'bold' }
        }
      },
      tooltip: {
        backgroundColor: 'rgba(6, 9, 18, 0.95)',
        titleColor: '#f8fafc',
        bodyColor: '#cbd5e1',
        borderColor: 'rgba(255, 255, 255, 0.15)',
        borderWidth: 1,
        padding: 10,
        callbacks: {
          label: (context) => {
            const val = context.parsed.y;
            const sign = val > 0 ? '+' : '';
            return ` ${context.dataset.label}: ${sign}${val.toFixed(1)}%`;
          }
        }
      }
    },
    scales: {
      x: {
        grid: { color: 'rgba(255, 255, 255, 0.04)', drawBorder: false },
        ticks: { color: '#94a3b8', font: { size: 10, weight: 'bold' } }
      },
      y: {
        grid: { color: 'rgba(255, 255, 255, 0.05)', drawBorder: false },
        ticks: {
          color: '#64748b',
          font: { size: 9.5, family: 'var(--font-mono)' },
          callback: (value) => `${value > 0 ? '+' : ''}${value}%`
        }
      }
    }
  }), []);

  // Duel Performance Data Memo
  const duelPerfData = useMemo(() => {
    const f1 = allFunds[duelFund1];
    const f2 = allFunds[duelFund2];
    if (!f1 || !f2) return null;
    return getDuelPerformanceData(f1, f2, fundsData.nasdaq_benchmark, perfTimeframe, liveCandles, benchmarkData);
  }, [duelFund1, duelFund2, perfTimeframe, liveCandles, allFunds]);

  // Duel Chart Dataset (Fund 1 vs Fund 2 + Nasdaq Line)
  const duelChartData = useMemo(() => {
    if (!duelPerfData) return { labels: [], datasets: [] };
    const f1 = allFunds[duelFund1];
    const f2 = allFunds[duelFund2];

    return {
      labels: duelPerfData.labels,
      datasets: [
        {
          type: 'line',
          label: `${f1.code} (${f1.name})`,
          data: duelPerfData.f1Series,
          borderColor: '#00e5ff',
          borderWidth: 2.4,
          fill: true,
          backgroundColor: (context) => {
            const chart = context.chart;
            const { ctx, chartArea } = chart;
            if (!chartArea) return 'rgba(0, 229, 255, 0.1)';
            const grad = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
            grad.addColorStop(0, 'rgba(0, 229, 255, 0.22)');
            grad.addColorStop(1, 'rgba(0, 229, 255, 0.0)');
            return grad;
          },
          tension: 0.25,
          pointRadius: 0
        },
        {
          type: 'line',
          label: `${f2.code} (${f2.name})`,
          data: duelPerfData.f2Series,
          borderColor: '#c084fc',
          borderWidth: 2.4,
          fill: false,
          tension: 0.25,
          pointRadius: 0
        },
        {
          type: 'line',
          label: '🇺🇸 Nasdaq-100 (QQQ Benchmark)',
          data: duelPerfData.nasdaqSeries,
          borderColor: '#f59e0b',
          borderWidth: 2,
          fill: false,
          borderDash: [5, 4],
          tension: 0.25,
          pointRadius: 0
        }
      ]
    };
  }, [duelPerfData, duelFund1, duelFund2, allFunds]);

  // User's portfolio holdings for Overlap Analysis
  const userHoldings = useMemo(() => {
    return (portfolioSummary?.enrichedHoldings || []).map(h => ({
      ticker: h.ticker.toUpperCase().replace('.IS', ''),
      name: h.name || h.ticker,
      weightPct: Number(h.weight) || 0,
      valTRY: Number(h.valTRY) || 0
    }));
  }, [portfolioSummary?.enrichedHoldings]);

  // Overlap calculation between activeFund and user's portfolio holdings
  const portfolioOverlap = useMemo(() => {
    if (!activeFund?.holdings || userHoldings.length === 0) return { matched: [], totalDirectWeight: 0, highestRisk: null };

    const matched = [];
    let totalDirectWeight = 0;

    activeFund.holdings.forEach(fh => {
      const uMatch = userHoldings.find(uh => uh.ticker === fh.ticker);
      if (uMatch) {
        totalDirectWeight += uMatch.weightPct;
        matched.push({
          ticker: fh.ticker,
          name: fh.name,
          fundWeight: fh.pct,
          userWeight: uMatch.weightPct,
          ring: fh.ring,
          sector: fh.sector
        });
      }
    });

    matched.sort((a, b) => b.userWeight - a.userWeight);

    let highestRisk = null;
    if (matched.length > 0) {
      const top = matched[0];
      if (top.userWeight >= 15 || (top.userWeight >= 10 && top.fundWeight >= 12)) {
        highestRisk = {
          ticker: top.ticker,
          name: top.name,
          severity: 'high',
          msg: `Portföyünüzde doğrudan %${top.userWeight.toFixed(1)} ${top.ticker} bulunurken, ${activeFund.code} fonunun da %${top.fundWeight.toFixed(1)}'i bu şirkettedir. Gerçek maruziyetiniz tehlikeli seviyede tek hisseye odaklanmaktadır.`
        };
      } else {
        highestRisk = {
          ticker: top.ticker,
          name: top.name,
          severity: 'moderate',
          msg: `Portföyünüzdeki ${top.ticker} (%${top.userWeight.toFixed(1)}) ve ${activeFund.code} içindeki pay (%${top.fundWeight.toFixed(1)}) orta düzeyde örtüşme yaratmaktadır.`
        };
      }
    }

    return { matched, totalDirectWeight, highestRisk };
  }, [activeFund, userHoldings]);

  // Duel (Head-to-head) Overlap Mathematics
  const duelAnalysis = useMemo(() => {
    const f1 = allFunds[duelFund1];
    const f2 = allFunds[duelFund2];
    if (!f1 || !f2) return null;

    let overlapScore = 0;
    const commonHoldings = [];
    const onlyInF1 = [];
    const onlyInF2 = [];

    const f2Map = new Map((f2.holdings || []).map(h => [h.ticker, h]));

    (f1.holdings || []).forEach(h1 => {
      const h2 = f2Map.get(h1.ticker);
      if (h2) {
        const commonWeight = Math.min(h1.pct, h2.pct);
        overlapScore += commonWeight;
        commonHoldings.push({
          ticker: h1.ticker,
          name: h1.name,
          pct1: h1.pct,
          pct2: h2.pct,
          commonWeight,
          sector: h1.sector,
          ring: h1.ring
        });
      } else {
        onlyInF1.push(h1);
      }
    });

    const f1Map = new Map((f1.holdings || []).map(h => [h.ticker, h]));
    (f2.holdings || []).forEach(h2 => {
      if (!f1Map.has(h2.ticker)) {
        onlyInF2.push(h2);
      }
    });

    commonHoldings.sort((a, b) => (b.pct1 + b.pct2) - (a.pct1 + a.pct2));

    return {
      f1,
      f2,
      overlapScore: Number(overlapScore.toFixed(1)),
      commonHoldings,
      onlyInF1,
      onlyInF2
    };
  }, [duelFund1, duelFund2, allFunds]);

  return (
    <div className="tab-pane-content" style={{ animation: 'fadeIn 0.25s ease' }}>
      
      {/* 🧭 Top Hub: Category Filter, View Switcher & Title */}
      <div className="card" style={{ padding: '14px 18px', marginBottom: 14, background: '#080c16', border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          
          {/* Title & Badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: 'rgba(251, 191, 36, 0.12)', border: '1px solid rgba(251, 191, 36, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Layers size={20} className="text-gold" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 900, color: '#f8fafc', letterSpacing: '0.4px' }}>FON & ETF RÖNTGENİ</span>
                <span style={{ fontSize: 9.5, fontWeight: 800, padding: '2px 7px', borderRadius: 4, background: 'rgba(0, 229, 255, 0.12)', color: 'var(--cyan)', border: '1px solid rgba(0, 229, 255, 0.25)' }}>
                  LOOK-THROUGH & PERFORMANS
                </span>
                <span style={{ fontSize: 9, fontWeight: 800, padding: '2px 6px', borderRadius: 4, background: 'rgba(245, 158, 11, 0.12)', color: 'var(--gold)', border: '1px solid rgba(245, 158, 11, 0.25)' }}>
                  NASDAQ KIYASLAMASI
                </span>
              </div>
              <div style={{ fontSize: 10.5, color: 'var(--text-muted)', marginTop: 2 }}>
                TEFAS, BES ve küresel ETF'lerin kümülatif performans eğrisini, Nasdaq-100 kıyaslamasını ve portföy konsantrasyonunu analiz edin.
              </div>
            </div>
          </div>

          {/* View Mode Switcher (X-Ray vs Duel) */}
          <div style={{ display: 'inline-flex', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, padding: 3, gap: 4 }}>
            <button
              type="button"
              className={`chip-btn ${viewMode === 'xray' ? 'active' : ''}`}
              onClick={() => setViewMode('xray')}
              style={{ fontSize: 11, padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 5 }}
            >
              <PieChart size={13} />
              <span>🔬 Tekil Fon & ETF Röntgeni</span>
            </button>
            <button
              type="button"
              className={`chip-btn ${viewMode === 'duel' ? 'active' : ''}`}
              onClick={() => setViewMode('duel')}
              style={{ fontSize: 11, padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 5 }}
            >
              <ArrowRightLeft size={13} />
              <span>⚔️ Fon Düellosu (Kıyaslama)</span>
            </button>
          </div>
        </div>

        {/* Category Pills & Quick Search */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.06)', flexWrap: 'wrap', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 10, color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>KATEGORİ:</span>
            <button 
              type="button" 
              className={`chip-btn ${activeCategory === 'all' ? 'active' : ''}`}
              onClick={() => setActiveCategory('all')}
              style={{ fontSize: 10, padding: '2px 8px' }}
            >
              Tümü ({fundList.length})
            </button>
            <button 
              type="button" 
              className={`chip-btn ${activeCategory === 'etf' ? 'active' : ''}`}
              onClick={() => setActiveCategory('etf')}
              style={{ fontSize: 10, padding: '2px 8px', color: 'var(--cyan)', borderColor: activeCategory === 'etf' ? 'var(--cyan)' : 'rgba(0,229,255,0.3)' }}
            >
              🇺🇸 ABD & Global ETF'ler ({fundList.filter(f => f.category === 'etf').length})
            </button>
            <button 
              type="button" 
              className={`chip-btn ${activeCategory === 'tefas' ? 'active' : ''}`}
              onClick={() => setActiveCategory('tefas')}
              style={{ fontSize: 10, padding: '2px 8px' }}
            >
              🌐 TEFAS Teknoloji / Yabancı ({fundList.filter(f => f.category === 'tefas').length})
            </button>
            <button 
              type="button" 
              className={`chip-btn ${activeCategory === 'bes' ? 'active' : ''}`}
              onClick={() => setActiveCategory('bes')}
              style={{ fontSize: 10, padding: '2px 8px', color: 'var(--gold)', borderColor: activeCategory === 'bes' ? 'var(--gold)' : 'rgba(251,191,36,0.3)' }}
            >
              🛡️ BES Portföyüm ({fundList.filter(f => f.category === 'bes').length})
            </button>
          </div>

          {/* Search Input */}
          <div style={{ position: 'relative', width: 230 }}>
            <Search size={13} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
            <input
              type="text"
              placeholder="Fon, ETF (VOO, VTI...) veya hisse ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                background: '#040711',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 5,
                padding: '4px 24px 4px 26px',
                fontSize: 10.5,
                color: '#f8fafc',
                outline: 'none'
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                style={{
                  position: 'absolute',
                  right: 6,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'transparent',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  fontSize: 11,
                  padding: 0
                }}
                title="Aramayı Temizle"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Quick Fund Chips Carousel */}
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2, marginTop: 8, scrollbarWidth: 'none' }}>
          {filteredFunds.map(f => {
            const isSel = selectedFundCode === f.code;
            const isBes = f.category === 'bes';
            return (
              <button
                key={f.code}
                type="button"
                onClick={() => setSelectedFundCode(f.code)}
                style={{
                  background: isSel ? 'rgba(0, 229, 255, 0.15)' : '#070a13',
                  border: `1px solid ${isSel ? 'var(--cyan)' : 'rgba(255,255,255,0.08)'}`,
                  color: isSel ? 'var(--cyan)' : '#cbd5e1',
                  borderRadius: 6,
                  padding: '4px 10px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  cursor: 'pointer',
                  flexShrink: 0,
                  fontSize: 10.5,
                  fontWeight: 700
                }}
              >
                <span>{isBes ? '🛡️' : (f.category === 'etf' ? '🇺🇸' : '🌐')}</span>
                <span>{f.code}</span>
                <span style={{ fontSize: 9, color: f.return_1y >= 0 ? 'var(--emerald)' : 'var(--red)', fontFamily: 'var(--font-mono)' }}>
                  +{f.return_1y}%
                </span>
              </button>
            );
          })}
          {filteredFunds.length === 0 && (
            <div style={{ padding: '6px 10px', fontSize: 11, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>"{searchQuery}" için sonuç bulunamadı. Popüler ETF'ler:</span>
              {['VOO', 'VTI', 'QQQ', 'SPY', 'VT', 'SCHD', 'SOXX', 'XLK'].map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => { setSearchQuery(''); setSelectedFundCode(c); }}
                  style={{
                    background: 'rgba(0, 229, 255, 0.1)',
                    border: '1px solid rgba(0, 229, 255, 0.3)',
                    color: 'var(--cyan)',
                    padding: '2px 7px',
                    borderRadius: 4,
                    fontSize: 10,
                    cursor: 'pointer',
                    fontWeight: 700
                  }}
                >
                  {c}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODE 1: SINGLE FUND X-RAY (TEKİL FON RÖNTGENİ & PERFORMANS GRAFİĞİ)       */}
      {/* ========================================================================= */}
      {viewMode === 'xray' && activeFund && (
        <>
          {/* Top 2 Columns: Fund Passport & Portfolio Overlap Detector */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 14, marginBottom: 14 }}>
            
            {/* Left Card: Fund Passport & 3-Ring Breakdown */}
            <div className="card" style={{ padding: 18, background: '#080c16', border: '1px solid var(--border)' }}>
              
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 18, fontWeight: 900, color: 'var(--cyan)', fontFamily: 'var(--font-mono)' }}>{activeFund.code}</span>
                    <span style={{ fontSize: 9.5, padding: '2px 7px', borderRadius: 4, background: 'rgba(255,255,255,0.06)', color: '#cbd5e1', fontWeight: 700 }}>
                      {activeFund.manager}
                    </span>
                    <span style={{ fontSize: 9.5, padding: '2px 7px', borderRadius: 4, background: 'rgba(251, 191, 36, 0.1)', color: 'var(--gold)', fontWeight: 800 }}>
                      {activeFund.category_label}
                    </span>
                  </div>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: '#f8fafc', marginTop: 4 }}>
                    {activeFund.name}
                  </div>
                  <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>
                    🎯 Tema: <strong style={{ color: '#cbd5e1' }}>{activeFund.theme}</strong>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 9, color: '#64748b', fontWeight: 700 }}>1 YILLIK GETİRİ</div>
                  <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--emerald)', fontFamily: 'var(--font-mono)' }}>
                    +{activeFund.return_1y.toFixed(1)}%
                  </div>
                  <div style={{ fontSize: 9, color: '#94a3b8' }}>3Y: +%{activeFund.return_3y.toFixed(0)}</div>
                </div>
              </div>

              {/* 3 Metrics Row: Expense Ratio, Risk Level, Currency */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, background: '#040711', padding: '8px 10px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.05)', marginBottom: 12 }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 8.5, color: '#64748b', fontWeight: 700 }}>GİDER ORANI</div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: '#f8fafc', fontFamily: 'var(--font-mono)' }}>
                    %{activeFund.expense_ratio.toFixed(2)}
                  </div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 8.5, color: '#64748b', fontWeight: 700 }}>RİSK SEVİYESİ</div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: activeFund.risk_level >= 6 ? 'var(--red)' : 'var(--amber)', fontFamily: 'var(--font-mono)' }}>
                    {activeFund.risk_level} / 7
                  </div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 8.5, color: '#64748b', fontWeight: 700 }}>PARA BİRİMİ</div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--gold)', fontFamily: 'var(--font-mono)' }}>
                    {activeFund.currency}
                  </div>
                </div>
              </div>

              {/* 3-Ring Breakdown Bar */}
              <div style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <span style={{ fontSize: 9.5, fontWeight: 800, color: '#cbd5e1' }}>3-HALKA BİLANÇO DAĞILIMI</span>
                  <span style={{ fontSize: 9, color: '#64748b' }}>Fon İçi Sermaye Gücü</span>
                </div>
                <div style={{ height: 12, borderRadius: 4, display: 'flex', overflow: 'hidden', background: '#040711', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div 
                    style={{ width: `${activeFund.ring_distribution.ring1}%`, background: '#10b981' }} 
                    title={`1. Halka (Nakit Titanları): %${activeFund.ring_distribution.ring1}`}
                  />
                  <div 
                    style={{ width: `${activeFund.ring_distribution.ring2}%`, background: '#f59e0b' }} 
                    title={`2. Halka (Kritik Tedarikçiler): %${activeFund.ring_distribution.ring2}`}
                  />
                  <div 
                    style={{ width: `${activeFund.ring_distribution.ring3}%`, background: '#ef4444' }} 
                    title={`3. Halka (Borçla Büyüyenler): %${activeFund.ring_distribution.ring3}`}
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 9, color: '#94a3b8' }}>
                  <span style={{ color: '#10b981', fontWeight: 700 }}>🟢 1. Halka: %{activeFund.ring_distribution.ring1} (Nakit Kralları)</span>
                  <span style={{ color: '#f59e0b', fontWeight: 700 }}>🟡 2. Halka: %{activeFund.ring_distribution.ring2} (Tedarikçi)</span>
                  <span style={{ color: '#ef4444', fontWeight: 700 }}>🔴 3. Halka: %{activeFund.ring_distribution.ring3} (Kaldıraç)</span>
                </div>
              </div>

              {/* Strategic Insight Box */}
              <div style={{ background: 'rgba(251, 191, 36, 0.05)', border: '1px solid rgba(251, 191, 36, 0.2)', borderRadius: 6, padding: '9px 12px', fontSize: 10.5, lineHeight: 1.5, color: '#e2e8f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2, fontWeight: 800, color: 'var(--gold)' }}>
                  <Sparkles size={13} />
                  <span>STRATEJİK FON ANALİZİ & RÖNTGENİ</span>
                </div>
                <div>{activeFund.finvest_insight}</div>
              </div>
            </div>

            {/* Right Card: Portfolio Overlap & Concentration Warning */}
            <div className="card" style={{ padding: 18, background: '#080c16', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 6, background: portfolioOverlap.matched.length > 0 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {portfolioOverlap.matched.length > 0 ? <ShieldAlert size={16} className="text-red" /> : <ShieldCheck size={16} className="text-emerald" />}
                  </div>
                  <div>
                    <div style={{ fontSize: 12.5, fontWeight: 800, color: '#f8fafc' }}>PORTFÖY GİZLİ ÇAKIŞMA RADARI</div>
                    <div style={{ fontSize: 9.5, color: '#94a3b8' }}>Doğrudan hisse paylarınız ile fon içi varlıkların bileşik maruziyeti</div>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <span style={{
                    fontSize: 9.5,
                    fontWeight: 800,
                    padding: '3px 8px',
                    borderRadius: 4,
                    background: portfolioOverlap.matched.length > 0 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                    color: portfolioOverlap.matched.length > 0 ? 'var(--red)' : 'var(--emerald)',
                    border: `1px solid ${portfolioOverlap.matched.length > 0 ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`
                  }}>
                    {portfolioOverlap.matched.length > 0 ? `${portfolioOverlap.matched.length} HİSSE ÇAKIŞIYOR` : 'ÇAKIŞMA YOK'}
                  </span>
                </div>
              </div>

              {/* Overlap Summary Alert */}
              {portfolioOverlap.highestRisk && (
                <div style={{
                  background: portfolioOverlap.highestRisk.severity === 'high' ? 'rgba(239, 68, 68, 0.08)' : 'rgba(245, 158, 11, 0.08)',
                  border: `1px solid ${portfolioOverlap.highestRisk.severity === 'high' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
                  borderRadius: 6,
                  padding: '9px 12px',
                  marginBottom: 12,
                  fontSize: 10.5,
                  lineHeight: 1.5,
                  color: '#cbd5e1'
                }}>
                  <div style={{ fontWeight: 800, color: portfolioOverlap.highestRisk.severity === 'high' ? 'var(--red)' : 'var(--amber)', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                    <AlertTriangle size={13} />
                    <span>AŞIRI KONSANTRASYON UYARISI: {portfolioOverlap.highestRisk.ticker}</span>
                  </div>
                  <div>{portfolioOverlap.highestRisk.msg}</div>
                </div>
              )}

              {/* Overlapping Holdings Table */}
              {portfolioOverlap.matched.length > 0 ? (
                <div>
                  <div style={{ fontSize: 9.5, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', marginBottom: 6 }}>
                    BİLEŞİK MARUZİYET DETAYLARI
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {portfolioOverlap.matched.map(m => (
                      <div 
                        key={m.ticker}
                        style={{
                          background: '#040711',
                          border: '1px solid rgba(255,255,255,0.06)',
                          borderRadius: 6,
                          padding: '6px 10px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--cyan)', fontFamily: 'var(--font-mono)' }}>{m.ticker}</span>
                          <span style={{ fontSize: 9.5, color: '#94a3b8' }}>{m.name}</span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: 8, color: '#64748b' }}>PORTFÖYÜNÜZ</div>
                            <div style={{ fontSize: 10.5, fontWeight: 800, color: '#f8fafc', fontFamily: 'var(--font-mono)' }}>%{m.userWeight.toFixed(1)}</div>
                          </div>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: 8, color: '#64748b' }}>FON İÇİ PAY</div>
                            <div style={{ fontSize: 10.5, fontWeight: 800, color: 'var(--gold)', fontFamily: 'var(--font-mono)' }}>%{m.fundWeight.toFixed(1)}</div>
                          </div>
                          <button
                            type="button"
                            className="chip-btn"
                            onClick={() => onSelectStock && onSelectStock(m.ticker)}
                            style={{ fontSize: 9, padding: '2px 6px' }}
                            title="Tekil Hisse sekmesinde DCF ve bilanço röntgenini aç"
                          >
                            İncele
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div style={{ padding: '24px 12px', textAlign: 'center', color: '#64748b', fontSize: 11 }}>
                  <CheckCircle2 size={24} style={{ color: 'var(--emerald)', margin: '0 auto 8px auto', display: 'block' }} />
                  <div>Kendi portföyünüzdeki hisseler ile bu fon arasında doğrudan çakışma bulunmuyor.</div>
                  <div style={{ fontSize: 9.5, marginTop: 4 }}>Bu fon portföyünüze saf çeşitlendirme katacaktır.</div>
                </div>
              )}
            </div>
          </div>

          {/* ========================================================================= */}
          {/* 📈 NEW: HISTORICAL PERFORMANCE & NASDAQ OVERLAY CHART                      */}
          {/* ========================================================================= */}
          <div className="card" style={{ padding: 18, background: '#080c16', border: '1px solid var(--border)', marginBottom: 14 }}>
            
            {/* Card Header & Dynamic Controls */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 14, paddingBottom: 12, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              
              {/* Left Title & Status */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 34, height: 34, borderRadius: 8, background: 'rgba(0, 229, 255, 0.12)', border: '1px solid rgba(0, 229, 255, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <TrendingUp size={18} className="text-cyan" />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 13.5, fontWeight: 900, color: '#f8fafc', letterSpacing: '0.3px' }}>
                      {activeFund.code} PERFORMANS GRAFİĞİ & NASDAQ KIYASLAMASI
                    </span>
                    <span style={{ fontSize: 9, fontWeight: 800, padding: '2px 6px', borderRadius: 4, background: 'rgba(245, 158, 11, 0.12)', color: 'var(--gold)', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
                      NASDAQ-100 BENCHMARK
                    </span>
                  </div>
                  <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>
                    {perfChartMode === 'area' 
                      ? `${activeFund.code} kümülatif getiri eğrisi (Alan Grafiği) üzerine Nasdaq-100 (QQQ) karşılaştırma çizgisi` 
                      : 'Vadeler bazında dönemsel getiri sütun kıyaslaması (Bar Grafiği)'}
                  </div>
                </div>
              </div>

              {/* Right Controls: Mode Switcher, Nasdaq Toggle, Timeframes */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                
                {/* Mode Switcher: Alan vs Bar */}
                <div style={{ display: 'inline-flex', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, padding: 2, gap: 2 }}>
                  <button
                    type="button"
                    onClick={() => setPerfChartMode('area')}
                    className={`chip-btn ${perfChartMode === 'area' ? 'active' : ''}`}
                    style={{ fontSize: 10, padding: '3px 8px', display: 'flex', alignItems: 'center', gap: 4 }}
                    title="Kümülatif Alan & Çizgi Grafiği"
                  >
                    <Activity size={12} />
                    <span>📈 Alan / Çizgi</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPerfChartMode('bar')}
                    className={`chip-btn ${perfChartMode === 'bar' ? 'active' : ''}`}
                    style={{ fontSize: 10, padding: '3px 8px', display: 'flex', alignItems: 'center', gap: 4 }}
                    title="Dönemsel Bar Grafiği (1A - 5Y)"
                  >
                    <BarChart3 size={12} />
                    <span>📊 Bar Grafiği</span>
                  </button>
                </div>

                {/* Nasdaq Overlay Switch */}
                <button
                  type="button"
                  onClick={() => setShowNasdaqOverlay(prev => !prev)}
                  style={{
                    background: showNasdaqOverlay ? 'rgba(245, 158, 11, 0.15)' : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${showNasdaqOverlay ? 'var(--gold)' : 'rgba(255,255,255,0.1)'}`,
                    color: showNasdaqOverlay ? 'var(--gold)' : '#94a3b8',
                    borderRadius: 6,
                    padding: '4px 9px',
                    fontSize: 10,
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5
                  }}
                  title="Nasdaq-100 (QQQ) Karşılaştırma Çizgisini Aç / Kapat"
                >
                  <span style={{ fontSize: 11 }}>{showNasdaqOverlay ? '✓' : '○'}</span>
                  <span>🇺🇸 Nasdaq (QQQ)</span>
                </button>

                {/* Timeframe Selector (Only in Area Mode) */}
                {perfChartMode === 'area' && (
                  <div style={{ display: 'flex', gap: 3, background: 'rgba(255,255,255,0.03)', padding: 2, borderRadius: 6, border: '1px solid rgba(255,255,255,0.06)' }}>
                    {['1A', '3A', '6A', 'YTD', '1Y', '3Y', '5Y'].map(tf => (
                      <button
                        key={tf}
                        type="button"
                        onClick={() => setPerfTimeframe(tf)}
                        className={`chip-btn ${perfTimeframe === tf ? 'active' : ''}`}
                        style={{ fontSize: 9.5, padding: '2px 7px', minWidth: 28, textAlign: 'center' }}
                      >
                        {tf}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Micro KPI & Alpha Barometer Ribbon */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 8, marginBottom: 14 }}>
              
              {/* Active Fund Return */}
              <div style={{ background: '#040711', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 6, padding: '8px 12px' }}>
                <div style={{ fontSize: 8.5, color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>
                  {activeFund.code} GETİRİSİ ({perfTimeframe})
                </div>
                <div style={{ fontSize: 16, fontWeight: 900, color: perfData.curFundReturn >= 0 ? 'var(--emerald)' : 'var(--red)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
                  {perfData.curFundReturn >= 0 ? '+' : ''}{perfData.curFundReturn}%
                </div>
              </div>

              {/* Nasdaq Benchmark Return */}
              <div style={{ background: '#040711', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 6, padding: '8px 12px' }}>
                <div style={{ fontSize: 8.5, color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>
                  NASDAQ-100 (QQQ)
                </div>
                <div style={{ fontSize: 16, fontWeight: 900, color: 'var(--gold)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
                  +{perfData.curNasdaqReturn}%
                </div>
              </div>

              {/* Relative Alpha vs Nasdaq */}
              <div style={{ background: '#040711', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 6, padding: '8px 12px' }}>
                <div style={{ fontSize: 8.5, color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>
                  RÖLATİF ALFA (FARK)
                </div>
                <div style={{ fontSize: 16, fontWeight: 900, color: perfData.alphaSpread >= 0 ? 'var(--emerald)' : 'var(--red)', fontFamily: 'var(--font-mono)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span>{perfData.alphaSpread >= 0 ? `+${perfData.alphaSpread}%` : `${perfData.alphaSpread}%`}</span>
                  <span style={{ fontSize: 10 }}>{perfData.alphaSpread >= 0 ? '🚀' : '📉'}</span>
                </div>
              </div>

              {/* Max Drawdown */}
              <div style={{ background: '#040711', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 6, padding: '8px 12px' }}>
                <div style={{ fontSize: 8.5, color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>
                  MAKSİMUM ÇEKİLME
                </div>
                <div style={{ fontSize: 16, fontWeight: 900, color: 'var(--red)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
                  {perfData.maxDD}%
                </div>
              </div>

              {/* Strategy Verdict */}
              <div style={{ background: '#040711', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 6, padding: '8px 12px' }}>
                <div style={{ fontSize: 8.5, color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>
                  NASDAQ TEŞHİSİ
                </div>
                <div style={{ fontSize: 11, fontWeight: 800, color: perfData.alphaSpread >= 0 ? 'var(--emerald)' : '#cbd5e1', marginTop: 3 }}>
                  {perfData.alphaSpread >= 0 ? '🏆 Nasdaq Üstü Getiri' : '🛡️ Düşük Risk / Çeşitlendirme'}
                </div>
              </div>
            </div>

            {/* Chart Area Container */}
            <div style={{ height: 320, width: '100%', position: 'relative' }}>
              {perfChartMode === 'area' ? (
                <Line data={areaChartData} options={chartOptions} />
              ) : (
                <Bar data={barChartData} options={barChartOptions} />
              )}
            </div>
          </div>

          {/* Bottom Table: Full Look-Through Holdings List */}
          <div className="card" style={{ padding: 18, background: '#080c16', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <BarChart3 size={16} className="text-cyan" />
                <span style={{ fontSize: 12.5, fontWeight: 800, color: '#f8fafc' }}>
                  {activeFund.code} İÇİNDEKİ İLK 10 VARLIK RÖNTGENİ
                </span>
                <span style={{ fontSize: 9.5, color: '#94a3b8' }}>
                  (Toplam Ağırlık: %{activeFund.holdings.reduce((acc, h) => acc + h.pct, 0).toFixed(1)})
                </span>
              </div>
              <div style={{ fontSize: 10, color: '#64748b' }}>
                Hisse koduna tıklayarak doğrudan <strong style={{ color: 'var(--cyan)' }}>Tekil Hisse DCF</strong> analizine geçebilirsiniz.
              </div>
            </div>

            <div className="table-responsive">
              <table className="terminal-table" style={{ width: '100%', fontSize: 11 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', color: '#64748b', fontSize: 9.5, textTransform: 'uppercase' }}>
                    <th style={{ textAlign: 'left', padding: '6px 8px' }}>#</th>
                    <th style={{ textAlign: 'left', padding: '6px 8px' }}>HİSSE / VARLIK</th>
                    <th style={{ textAlign: 'left', padding: '6px 8px' }}>SEKTÖR</th>
                    <th style={{ textAlign: 'center', padding: '6px 8px' }}>BİLANÇO HALKASI</th>
                    <th style={{ textAlign: 'right', padding: '6px 8px' }}>FON İÇİ AĞIRLIK</th>
                    <th style={{ textAlign: 'right', padding: '6px 8px' }}>AĞIRLIK ÇUBUĞU</th>
                    <th style={{ textAlign: 'center', padding: '6px 8px' }}>EYLEM</th>
                  </tr>
                </thead>
                <tbody>
                  {activeFund.holdings.map((h, idx) => {
                    const ringColor = h.ring === 1 ? '#10b981' : (h.ring === 2 ? '#f59e0b' : '#ef4444');
                    const ringBadge = h.ring === 1 ? '1. Halka (Nakit)' : (h.ring === 2 ? '2. Halka (Tedarikçi)' : '3. Halka (Borçlu)');
                    const isUserHolding = userHoldings.some(uh => uh.ticker === h.ticker);

                    return (
                      <tr 
                        key={h.ticker}
                        style={{
                          borderBottom: '1px solid rgba(255,255,255,0.03)',
                          background: isUserHolding ? 'rgba(0, 229, 255, 0.03)' : 'transparent'
                        }}
                      >
                        <td style={{ padding: '8px', color: '#64748b', fontFamily: 'var(--font-mono)' }}>{idx + 1}</td>
                        <td style={{ padding: '8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontWeight: 800, color: '#f8fafc', fontFamily: 'var(--font-mono)' }}>{h.ticker}</span>
                            <span style={{ color: '#94a3b8', fontSize: 10 }}>{h.name}</span>
                            {isUserHolding && (
                              <span style={{ fontSize: 8.5, padding: '1px 5px', borderRadius: 3, background: 'rgba(0, 229, 255, 0.15)', color: 'var(--cyan)', fontWeight: 800 }}>
                                PORTFÖYÜNÜZDE VAR
                              </span>
                            )}
                          </div>
                        </td>
                        <td style={{ padding: '8px', color: '#cbd5e1' }}>{h.sector}</td>
                        <td style={{ padding: '8px', textAlign: 'center' }}>
                          <span style={{
                            fontSize: 9,
                            fontWeight: 800,
                            padding: '2px 6px',
                            borderRadius: 4,
                            background: `${ringColor}22`,
                            color: ringColor,
                            border: `1px solid ${ringColor}44`
                          }}>
                            {ringBadge}
                          </span>
                        </td>
                        <td style={{ padding: '8px', textAlign: 'right', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--gold)' }}>
                          %{h.pct.toFixed(1)}
                        </td>
                        <td style={{ padding: '8px', width: 140 }}>
                          <div style={{ height: 6, background: '#040711', borderRadius: 3, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)' }}>
                            <div style={{ height: '100%', width: `${Math.min(100, h.pct * 4)}%`, background: h.pct >= 15 ? 'var(--red)' : (h.pct >= 8 ? 'var(--gold)' : 'var(--cyan)') }} />
                          </div>
                        </td>
                        <td style={{ padding: '8px', textAlign: 'center' }}>
                          <button
                            type="button"
                            className="chip-btn"
                            onClick={() => onSelectStock && onSelectStock(h.ticker)}
                            style={{ fontSize: 9, padding: '2px 8px' }}
                            title={`${h.ticker} için Tekil Hisse DCF ve Bilanço Röntgenini Aç`}
                          >
                            Röntgen Aç ➔
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ========================================================================= */}
      {/* MODE 2: FUND DUEL (FON DÜELLOSU, ORTAK ÇAKIŞMA & PERFORMANS DÜELLOSU)    */}
      {/* ========================================================================= */}
      {viewMode === 'duel' && duelAnalysis && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          
          {/* Duel Control Card */}
          <div className="card" style={{ padding: 18, background: '#080c16', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 14 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <ArrowRightLeft size={18} className="text-cyan" />
                  <span style={{ fontSize: 13.5, fontWeight: 900, color: '#f8fafc' }}>FON & ETF KIYASLAMA DÜELLOSU</span>
                </div>
                <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>
                  İki fonu yan yana koyarak içlerindeki ortak hisseleri, çakışma oranını ve Nasdaq'a göre göreceli performanslarını karşılaştırın.
                </div>
              </div>

              {/* Overlap Score Badge */}
              <div style={{
                background: '#040711',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 8,
                padding: '8px 14px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: 8.5, color: '#64748b', fontWeight: 800 }}>ORTAK ÇAKIŞMA ORANI</div>
                <div style={{ fontSize: 18, fontWeight: 900, fontFamily: 'var(--font-mono)', color: duelAnalysis.overlapScore > 50 ? 'var(--red)' : (duelAnalysis.overlapScore > 25 ? 'var(--amber)' : 'var(--emerald)') }}>
                  %{duelAnalysis.overlapScore}
                </div>
                <div style={{ fontSize: 8.5, color: '#94a3b8' }}>
                  {duelAnalysis.overlapScore > 50 ? 'Yüksek Benzerlik (Aynı Hisse)' : (duelAnalysis.overlapScore > 25 ? 'Orta Benzerlik' : 'Güçlü Çeşitlendirme')}
                </div>
              </div>
            </div>

            {/* Duel Selectors */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 12, alignItems: 'center' }}>
              
              {/* Fund 1 Selector */}
              <div style={{ background: '#040711', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--cyan)' }}>
                <div style={{ fontSize: 8.5, color: 'var(--cyan)', fontWeight: 800, textTransform: 'uppercase' }}>1. FON / ETF</div>
                <select 
                  value={duelFund1}
                  onChange={(e) => setDuelFund1(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'transparent',
                    border: 'none',
                    color: '#f8fafc',
                    fontSize: 13,
                    fontWeight: 800,
                    outline: 'none',
                    cursor: 'pointer',
                    marginTop: 4
                  }}
                >
                  {fundList.map(f => (
                    <option key={f.code} value={f.code} style={{ background: '#080c16', color: '#fff' }}>
                      {f.code} - {f.name} (+%{f.return_1y})
                    </option>
                  ))}
                </select>
                <div style={{ fontSize: 9.5, color: '#94a3b8', marginTop: 4 }}>
                  Gider: %{duelAnalysis.f1.expense_ratio} | 1Y: +%{duelAnalysis.f1.return_1y}
                </div>
              </div>

              {/* VS Icon */}
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 11, color: 'var(--gold)' }}>
                VS
              </div>

              {/* Fund 2 Selector */}
              <div style={{ background: '#040711', padding: '10px 14px', borderRadius: 8, border: '1px solid #c084fc' }}>
                <div style={{ fontSize: 8.5, color: '#c084fc', fontWeight: 800, textTransform: 'uppercase' }}>2. FON / ETF</div>
                <select 
                  value={duelFund2}
                  onChange={(e) => setDuelFund2(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'transparent',
                    border: 'none',
                    color: '#f8fafc',
                    fontSize: 13,
                    fontWeight: 800,
                    outline: 'none',
                    cursor: 'pointer',
                    marginTop: 4
                  }}
                >
                  {fundList.map(f => (
                    <option key={f.code} value={f.code} style={{ background: '#080c16', color: '#fff' }}>
                      {f.code} - {f.name} (+%{f.return_1y})
                    </option>
                  ))}
                </select>
                <div style={{ fontSize: 9.5, color: '#94a3b8', marginTop: 4 }}>
                  Gider: %{duelAnalysis.f2.expense_ratio} | 1Y: +%{duelAnalysis.f2.return_1y}
                </div>
              </div>
            </div>
          </div>

          {/* ⚔️ DUEL PERFORMANCE CHART: FUND 1 vs FUND 2 vs NASDAQ */}
          {duelPerfData && (
            <div className="card" style={{ padding: 18, background: '#080c16', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <TrendingUp size={16} className="text-cyan" />
                  <span style={{ fontSize: 13, fontWeight: 900, color: '#f8fafc' }}>
                    DÜELLO PERFORMANS KIYASLAMASI: {duelFund1} vs {duelFund2}
                  </span>
                  <span style={{ fontSize: 9, fontWeight: 800, padding: '2px 6px', borderRadius: 4, background: 'rgba(245, 158, 11, 0.12)', color: 'var(--gold)', border: '1px solid rgba(245, 158, 11, 0.25)' }}>
                    NASDAQ REFERANS ÇİZGİLİ
                  </span>
                </div>

                {/* Timeframe Selector */}
                <div style={{ display: 'flex', gap: 3, background: 'rgba(255,255,255,0.03)', padding: 2, borderRadius: 6, border: '1px solid rgba(255,255,255,0.06)' }}>
                  {['1A', '3A', '6A', 'YTD', '1Y', '3Y', '5Y'].map(tf => (
                    <button
                      key={tf}
                      type="button"
                      onClick={() => setPerfTimeframe(tf)}
                      className={`chip-btn ${perfTimeframe === tf ? 'active' : ''}`}
                      style={{ fontSize: 9.5, padding: '2px 7px', minWidth: 28, textAlign: 'center' }}
                    >
                      {tf}
                    </button>
                  ))}
                </div>
              </div>

              {/* Duel Metrics Ribbon */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 8, marginBottom: 14 }}>
                <div style={{ background: '#040711', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 6, padding: '8px 12px' }}>
                  <div style={{ fontSize: 8.5, color: 'var(--cyan)', fontWeight: 800, textTransform: 'uppercase' }}>
                    {duelFund1} ({perfTimeframe})
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 900, color: 'var(--cyan)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
                    +{duelPerfData.f1Return}%
                  </div>
                </div>

                <div style={{ background: '#040711', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 6, padding: '8px 12px' }}>
                  <div style={{ fontSize: 8.5, color: '#c084fc', fontWeight: 800, textTransform: 'uppercase' }}>
                    {duelFund2} ({perfTimeframe})
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 900, color: '#c084fc', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
                    +{duelPerfData.f2Return}%
                  </div>
                </div>

                <div style={{ background: '#040711', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 6, padding: '8px 12px' }}>
                  <div style={{ fontSize: 8.5, color: 'var(--gold)', fontWeight: 800, textTransform: 'uppercase' }}>
                    NASDAQ-100 (QQQ)
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 900, color: 'var(--gold)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
                    +{duelPerfData.nasdaqReturn}%
                  </div>
                </div>

                <div style={{ background: '#040711', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 6, padding: '8px 12px' }}>
                  <div style={{ fontSize: 8.5, color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>
                    DÜELLO KAZANANI
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 900, color: 'var(--emerald)', fontFamily: 'var(--font-mono)', marginTop: 3 }}>
                    🏆 {duelPerfData.leader} (+{Math.abs(duelPerfData.diffSpread)}% önde)
                  </div>
                </div>
              </div>

              {/* Duel Chart Canvas */}
              <div style={{ height: 280, width: '100%', position: 'relative' }}>
                <Line data={duelChartData} options={chartOptions} />
              </div>
            </div>
          )}

          {/* Common Holdings Table */}
          <div className="card" style={{ padding: 18, background: '#080c16', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: '#f8fafc', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>🔗</span>
              <span>HER İKİ FONDA DA BULUNAN ORTAK HİSSELER ({duelAnalysis.commonHoldings.length})</span>
            </div>

            {duelAnalysis.commonHoldings.length > 0 ? (
              <table className="terminal-table" style={{ width: '100%', fontSize: 11 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', color: '#64748b', fontSize: 9.5, textTransform: 'uppercase' }}>
                    <th style={{ textAlign: 'left', padding: '6px 8px' }}>HİSSE</th>
                    <th style={{ textAlign: 'left', padding: '6px 8px' }}>SEKTÖR</th>
                    <th style={{ textAlign: 'right', padding: '6px 8px', color: 'var(--cyan)' }}>{duelAnalysis.f1.code} PAYI</th>
                    <th style={{ textAlign: 'right', padding: '6px 8px', color: '#c084fc' }}>{duelAnalysis.f2.code} PAYI</th>
                    <th style={{ textAlign: 'right', padding: '6px 8px' }}>ORTAK ÇAKIŞMA</th>
                  </tr>
                </thead>
                <tbody>
                  {duelAnalysis.commonHoldings.map(ch => (
                    <tr key={ch.ticker} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                      <td style={{ padding: '8px', fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#f8fafc' }}>
                        {ch.ticker} <span style={{ fontSize: 9.5, color: '#94a3b8', fontWeight: 400 }}>{ch.name}</span>
                      </td>
                      <td style={{ padding: '8px', color: '#cbd5e1' }}>{ch.sector}</td>
                      <td style={{ padding: '8px', textAlign: 'right', fontWeight: 800, color: 'var(--cyan)', fontFamily: 'var(--font-mono)' }}>
                        %{ch.pct1.toFixed(1)}
                      </td>
                      <td style={{ padding: '8px', textAlign: 'right', fontWeight: 800, color: '#c084fc', fontFamily: 'var(--font-mono)' }}>
                        %{ch.pct2.toFixed(1)}
                      </td>
                      <td style={{ padding: '8px', textAlign: 'right', fontWeight: 800, color: 'var(--emerald)', fontFamily: 'var(--font-mono)' }}>
                        %{ch.commonWeight.toFixed(1)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div style={{ padding: 18, textAlign: 'center', color: '#64748b', fontSize: 11 }}>
                Bu iki fonun ilk 10 varlıkları arasında hiçbir ortak hisse bulunmamaktadır. Mükemmel bağımsız çeşitlendirme!
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
