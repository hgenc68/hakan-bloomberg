import React, { useState, useMemo } from 'react';
import { useApp, KNOWN_CRYPTO_SET } from '../context/AppContext';
import { Line, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ArcElement
} from 'chart.js';
import { 
  LineChart, 
  BarChart3, 
  Shield, 
  Activity, 
  HelpCircle, 
  CheckCircle2, 
  TrendingUp, 
  TrendingDown, 
  Layers, 
  PieChart, 
  Target, 
  Award, 
  Zap, 
  Sparkles, 
  ArrowRight,
  ShieldCheck,
  Scale,
  Filter,
  Sliders,
  CheckSquare,
  Square,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Check
} from 'lucide-react';
import benchmarkData from '../data/benchmarkData.json';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ArcElement
);

export default function BenchmarkTab() {
  const { currentCurrency, usdtry, portfolioSummary } = useApp();
  const isTRY = currentCurrency === 'try';
  const curKey = isTRY ? 'try' : 'usd';
  const sym = isTRY ? '₺' : '$';

  const fmt = (v, d = 2) => (Number(v) || 0).toLocaleString('tr-TR', { minimumFractionDigits: d, maximumFractionDigits: d });

  const [portfolioScope, setPortfolioScope] = useState('equity'); // 'equity', 'ex_bydnr', 'recent', 'all', 'custom'
  const [chartType, setChartType] = useState('line'); // 'line' or 'bar'
  const [timeframe, setTimeframe] = useState('1Y'); // '1W', '1M', '3M', '6M', '1Y', 'ALL'
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);

  // Available holdings normalized list
  const availableHoldings = useMemo(() => {
    const list = portfolioSummary?.enrichedHoldings?.length > 0
      ? portfolioSummary.enrichedHoldings
      : (benchmarkData?.holdings || []);
    
    return list.map(h => {
      const ticker = (h.ticker || '').toUpperCase();
      const clean = (h.clean_ticker || ticker).toUpperCase();
      const type = h.type || 'Hisse';
      const name = h.name || ticker;
      const valTRY = Number(h.valTRY != null ? h.valTRY : (h.val_try || 0));
      const valUSD = Number(h.valUSD != null ? h.valUSD : (h.val_usd || 0));
      const costTRY = Number(h.costTRY != null ? h.costTRY : (h.cost_try || 0));
      const costUSD = Number(h.costUSD != null ? h.costUSD : (h.cost_usd || 0));
      const profitTRY = Number(h.profitTRY != null ? h.profitTRY : (h.profit_try != null ? h.profit_try : (valTRY - costTRY)));
      const profitUSD = Number(h.profitUSD != null ? h.profitUSD : (h.profit_usd != null ? h.profit_usd : (valUSD - costUSD)));
      const returnPct = Number(h.returnPct != null ? h.returnPct : (h.return_pct != null ? h.return_pct : (costTRY > 0 ? (profitTRY / costTRY) * 100 : 0)));
      const dayPLTRY = Number(h.dayPLTRY != null ? h.dayPLTRY : (h.day_pl_try || 0));
      const dayPLUSD = Number(h.dayPLUSD != null ? h.dayPLUSD : (h.day_pl_usd || 0));
      const dayPLPct = Number(h.dayPLPct != null ? h.dayPLPct : (h.day_change_pct || 0));

      let category = 'equity';
      if (type === 'Altın' || type === 'Altın / Kalkan' || clean.includes('XAUT') || ticker.includes('GOLD') || ticker.includes('ALTIN')) {
        category = 'shield';
      } else if (type === 'Kripto' || KNOWN_CRYPTO_SET?.has(clean) || KNOWN_CRYPTO_SET?.has(ticker)) {
        category = 'crypto';
      }

      return {
        id: ticker,
        ticker,
        clean,
        name,
        type,
        category,
        currency: h.currency || (category === 'equity' && !ticker.endsWith('.IS') ? 'USD' : 'TRY'),
        valTRY,
        valUSD,
        costTRY,
        costUSD,
        profitTRY,
        profitUSD,
        returnPct,
        dayPLTRY,
        dayPLUSD,
        dayPLPct
      };
    });
  }, [portfolioSummary]);

  // Selected tickers state for custom filtering
  const [selectedTickers, setSelectedTickers] = useState(() => {
    return new Set(['BYDNR', 'SPCX', 'DRAM', 'NVDA', 'TSM', 'ABBV']);
  });

  const [activeSeries, setActiveSeries] = useState({
    portfolio: true,
    SP500: true,
    NASDAQ: true,
    BIST100: true,
    GOLD: true,
    BITCOIN: false
  });

  const rawDates = benchmarkData.dates || [];
  let sliceCount = rawDates.length;
  if (timeframe === '1W') sliceCount = Math.min(rawDates.length, 6);
  else if (timeframe === '1M') sliceCount = Math.min(rawDates.length, 22);
  else if (timeframe === '3M') sliceCount = Math.min(rawDates.length, 65);
  else if (timeframe === '6M') sliceCount = Math.min(rawDates.length, 130);
  else if (timeframe === '1Y') sliceCount = Math.min(rawDates.length, 252);

  const startIndex = Math.max(0, rawDates.length - sliceCount);
  const slicedDates = rawDates.slice(startIndex);

  const sampleStep = slicedDates.length > 90 ? Math.max(1, Math.floor(slicedDates.length / 75)) : 1;
  const sampledDates = slicedDates.filter((_, i) => i % sampleStep === 0);

  const series = benchmarkData.normalized_series || {};
  const underwater = benchmarkData.underwater_series || {};
  const metrics = benchmarkData.metrics_by_currency?.[curKey] || {};

  const toggleSeries = (key) => {
    setActiveSeries(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const rebaseSeries = (arr) => {
    if (!arr || arr.length === 0) return [];
    const sliced = arr.slice(startIndex);
    const baseVal = sliced[0] || 1;
    const rebased = sliced.map(v => (v / baseVal) * 100);
    return rebased.filter((_, i) => i % sampleStep === 0);
  };

  const portLabel = useMemo(() => {
    switch (portfolioScope) {
      case 'ex_bydnr':
        return '🛡️ BYDNR HARİÇ HİSSE SEPETİNİZ';
      case 'recent':
        return '🚀 SON DÖNEM YENİ ALIMLARINIZ';
      case 'all':
        return '🌐 TÜM KONSOLİDE PORTFÖYÜNÜZ';
      case 'custom':
        return `⚙️ ÖZEL SEPETİNİZ (${selectedTickers.size} Varlık)`;
      case 'equity':
      default:
        return '📈 ÇEKİRDEK HİSSE & ETF SEPETİNİZ';
    }
  }, [portfolioScope, selectedTickers]);

  const portColor = useMemo(() => {
    switch (portfolioScope) {
      case 'ex_bydnr':
        return '#10b981'; // Emerald
      case 'recent':
        return '#c084fc'; // Purple / Violet
      case 'all':
        return '#ffffff'; // White
      case 'custom':
        return '#f59e0b'; // Amber
      case 'equity':
      default:
        return '#00e5ff'; // Cyan
    }
  }, [portfolioScope]);

  const scopeBadge = useMemo(() => {
    switch (portfolioScope) {
      case 'ex_bydnr': return { label: 'BYDNR Hariç', color: 'emerald' };
      case 'recent': return { label: 'Yeni Alımlar', color: 'purple' };
      case 'custom': return { label: 'Özel Sepet', color: 'amber' };
      case 'all': return { label: 'Tüm Portföy', color: 'gray' };
      case 'equity':
      default: return { label: 'Hisse & ETF', color: 'cyan' };
    }
  }, [portfolioScope]);

  // Selected Basket live KPIs
  const selectedBasketStats = useMemo(() => {
    const active = availableHoldings.filter(h => selectedTickers.has(h.id));
    const totalValTRY = active.reduce((acc, h) => acc + h.valTRY, 0);
    const totalValUSD = active.reduce((acc, h) => acc + h.valUSD, 0);
    const totalCostTRY = active.reduce((acc, h) => acc + h.costTRY, 0);
    const totalCostUSD = active.reduce((acc, h) => acc + h.costUSD, 0);
    const profitTRY = totalValTRY - totalCostTRY;
    const profitUSD = totalValUSD - totalCostUSD;
    const returnPct = totalCostTRY > 0 ? (profitTRY / totalCostTRY) * 100 : 0;
    const dayPLTRY = active.reduce((acc, h) => acc + h.dayPLTRY, 0);
    const dayPLUSD = active.reduce((acc, h) => acc + h.dayPLUSD, 0);
    const prevValTRY = totalValTRY - dayPLTRY;
    const dayPLPct = prevValTRY > 0 ? (dayPLTRY / prevValTRY) * 100 : 0;

    const totalPortfolioTRY = availableHoldings.reduce((acc, h) => acc + h.valTRY, 0) || 1;
    const basketWeightPct = (totalValTRY / totalPortfolioTRY) * 100;

    return {
      count: active.length,
      valTRY: totalValTRY,
      valUSD: totalValUSD,
      costTRY: totalCostTRY,
      costUSD: totalCostUSD,
      profitTRY,
      profitUSD,
      returnPct,
      dayPLTRY,
      dayPLUSD,
      dayPLPct,
      basketWeightPct
    };
  }, [availableHoldings, selectedTickers]);

  // Dynamic blended series for the selected basket
  const dynamicBasketSeries = useMemo(() => {
    const assetSeries = benchmarkData.asset_series || {};

    // Fast path: standard scopes if precalculated series exist
    if (portfolioScope === 'equity' && series[`equity_${curKey}`]) {
      return series[`equity_${curKey}`];
    }
    if (portfolioScope === 'all' && series[`portfolio_${curKey}`]) {
      return series[`portfolio_${curKey}`];
    }

    const active = availableHoldings.filter(h => selectedTickers.has(h.id));
    if (active.length === 0) {
      return series[`portfolio_${curKey}`] || [];
    }

    const totalWeight = active.reduce((sum, h) => sum + (isTRY ? h.valTRY : h.valUSD), 0);
    if (totalWeight <= 0) return series[`portfolio_${curKey}`] || [];

    const blended = new Array(rawDates.length).fill(0);

    active.forEach(h => {
      const w = (isTRY ? h.valTRY : h.valUSD) / totalWeight;
      const s = assetSeries[h.id]?.[curKey] 
             || assetSeries[h.clean]?.[curKey]
             || (h.category === 'shield' ? (series[`GOLD_${curKey}`] || []) : null)
             || (h.category === 'crypto' ? (series[`BITCOIN_${curKey}`] || []) : null)
             || (series[`SP500_${curKey}`] || []);

      for (let i = 0; i < rawDates.length; i++) {
        blended[i] += w * (s[i] != null ? s[i] : 100);
      }
    });

    const startVal = blended[0] || 1;
    return blended.map(v => (v / startVal) * 100);
  }, [portfolioScope, selectedTickers, availableHoldings, isTRY, curKey, series, rawDates.length]);

  // Dynamic Underwater Drawdown Chart series
  const dynamicUnderwater = useMemo(() => {
    const s = dynamicBasketSeries || [];
    if (s.length === 0) return [];
    let peak = s[0] || 1;
    const ddArr = [];
    for (let i = 0; i < s.length; i++) {
      const v = s[i] || 1;
      if (v > peak) peak = v;
      const dd = peak > 0 ? ((v - peak) / peak) * 100 : 0;
      ddArr.push(dd);
    }
    return ddArr;
  }, [dynamicBasketSeries]);

  // Quantitative Risk & Metric Calculations for the active basket
  const customCalculatedMetrics = useMemo(() => {
    if (portfolioScope === 'equity' && metrics['EQUITY']) {
      return metrics['EQUITY'];
    }
    if (portfolioScope === 'all' && metrics['PORTFOLIO']) {
      return metrics['PORTFOLIO'];
    }

    const s = dynamicBasketSeries;
    const sp = series[`SP500_${curKey}`] || [];
    if (!s || s.length < 2) return metrics['EQUITY'] || {};

    const rfRate = isTRY ? 40 : 4.25;
    const returns = [];
    const spReturns = [];
    for (let i = 1; i < s.length; i++) {
      returns.push((s[i] - s[i - 1]) / (s[i - 1] || 1));
      if (sp[i] !== undefined && sp[i - 1] !== undefined) {
        spReturns.push((sp[i] - sp[i - 1]) / (sp[i - 1] || 1));
      }
    }

    const n = returns.length;
    const mean = returns.reduce((a, b) => a + b, 0) / Math.max(1, n);
    const spMean = spReturns.reduce((a, b) => a + b, 0) / Math.max(1, spReturns.length);

    const variance = returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / Math.max(1, n - 1);
    const spVariance = spReturns.reduce((a, b) => a + Math.pow(b - spMean, 2), 0) / Math.max(1, spReturns.length - 1);
    const cov = returns.reduce((a, b, i) => a + (b - mean) * ((spReturns[i] || 0) - spMean), 0) / Math.max(1, n - 1);

    const vol = Math.sqrt(variance) * Math.sqrt(252) * 100;
    const beta = spVariance > 0 ? cov / spVariance : 1.0;
    const periodReturn = s.length > 0 ? ((s[s.length - 1] - s[0]) / (s[0] || 1)) * 100 : 0;
    const cagr = (Math.pow(Math.max(0.01, 1 + periodReturn / 100), 252 / Math.max(1, s.length)) - 1) * 100;
    const sharpe = vol > 0 ? (cagr - rfRate) / vol : 0;
    
    // Downside deviation for Sortino
    const downsideVar = returns.reduce((a, b) => a + (b < 0 ? Math.pow(b, 2) : 0), 0) / Math.max(1, n - 1);
    const downsideVol = Math.sqrt(downsideVar) * Math.sqrt(252) * 100;
    const sortino = downsideVol > 0 ? (cagr - rfRate) / downsideVol : 0;

    // Drawdown
    let peak = s[0];
    let maxDD = 0;
    for (const v of s) {
      if (v > peak) peak = v;
      const dd = (v - peak) / (peak || 1);
      if (dd < maxDD) maxDD = dd;
    }

    const maxDrawdownPct = maxDD * 100;
    const calmar = Math.abs(maxDrawdownPct) > 0.01 ? cagr / Math.abs(maxDrawdownPct) : 0;
    const alpha = cagr - (rfRate + beta * (((metrics['SP500']?.cagr || 15) - rfRate)));

    return {
      period_return: periodReturn,
      cagr: cagr,
      volatility: vol,
      sharpe: sharpe,
      sortino: sortino,
      beta: beta,
      alpha: alpha,
      tracking_error: vol * 0.45,
      max_drawdown: maxDrawdownPct,
      calmar: calmar,
      correlation: Math.max(-1, Math.min(1, cov / (Math.sqrt(variance) * Math.sqrt(spVariance) || 1)))
    };
  }, [dynamicBasketSeries, portfolioScope, metrics, series, curKey, isTRY]);

  // Scope & Filter Presets Handlers
  const handleSelectScope = (scope) => {
    setPortfolioScope(scope);
    if (scope === 'equity') {
      setSelectedTickers(new Set(availableHoldings.filter(h => h.category === 'equity').map(h => h.id)));
    } else if (scope === 'ex_bydnr') {
      setSelectedTickers(new Set(availableHoldings.filter(h => h.category === 'equity' && h.id !== 'BYDNR').map(h => h.id)));
    } else if (scope === 'recent') {
      setSelectedTickers(new Set(['SPCX', 'DRAM', 'NVDA', 'TSM', 'ABBV']));
    } else if (scope === 'all') {
      setSelectedTickers(new Set(availableHoldings.map(h => h.id)));
    } else if (scope === 'custom') {
      setIsSelectorOpen(true);
    }
  };

  const handleSelectAll = () => {
    setSelectedTickers(new Set(availableHoldings.map(h => h.id)));
    setPortfolioScope('all');
  };

  const handleExcludeBydnr = () => {
    const next = new Set(selectedTickers);
    next.delete('BYDNR');
    setSelectedTickers(next);
    setPortfolioScope(next.size > 0 ? 'ex_bydnr' : 'custom');
  };

  const handleSelectRecent = () => {
    setSelectedTickers(new Set(['SPCX', 'DRAM', 'NVDA', 'TSM', 'ABBV']));
    setPortfolioScope('recent');
  };

  const handleSelectEquities = () => {
    const eq = availableHoldings.filter(h => h.category === 'equity').map(h => h.id);
    setSelectedTickers(new Set(eq));
    setPortfolioScope('equity');
  };

  const handleSelectShield = () => {
    const sh = availableHoldings.filter(h => h.category === 'shield').map(h => h.id);
    setSelectedTickers(new Set(sh));
    setPortfolioScope('custom');
  };

  const handleSelectCrypto = () => {
    const cr = availableHoldings.filter(h => h.category === 'crypto').map(h => h.id);
    setSelectedTickers(new Set(cr));
    setPortfolioScope('custom');
  };

  const handleClearAll = () => {
    setSelectedTickers(new Set());
    setPortfolioScope('custom');
  };

  const toggleTicker = (id) => {
    setSelectedTickers(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
    setPortfolioScope('custom');
  };

  // Base-100 Performance Line Chart
  const perfDatasets = [];
  if (activeSeries.portfolio) {
    perfDatasets.push({
      label: portLabel,
      data: rebaseSeries(dynamicBasketSeries),
      borderColor: portColor,
      backgroundColor: `${portColor}15`,
      borderWidth: 2.5,
      pointRadius: 0,
      tension: 0.2
    });
  }
  if (activeSeries.SP500 && series[`SP500_${curKey}`]) {
    perfDatasets.push({
      label: 'S&P 500 (^GSPC)',
      data: rebaseSeries(series[`SP500_${curKey}`]),
      borderColor: '#3b82f6',
      borderWidth: 1.8,
      pointRadius: 0,
      tension: 0.2
    });
  }
  if (activeSeries.NASDAQ && series[`NASDAQ_${curKey}`]) {
    perfDatasets.push({
      label: 'Nasdaq 100 (^NDX)',
      data: rebaseSeries(series[`NASDAQ_${curKey}`]),
      borderColor: '#a855f7',
      borderWidth: 1.8,
      pointRadius: 0,
      tension: 0.2
    });
  }
  if (activeSeries.BIST100 && series[`BIST100_${curKey}`]) {
    perfDatasets.push({
      label: 'BIST 100 (XU100.IS)',
      data: rebaseSeries(series[`BIST100_${curKey}`]),
      borderColor: '#ef4444',
      borderWidth: 1.8,
      pointRadius: 0,
      tension: 0.2
    });
  }
  if (activeSeries.GOLD && series[`GOLD_${curKey}`]) {
    perfDatasets.push({
      label: 'Altın Ons (GC=F)',
      data: rebaseSeries(series[`GOLD_${curKey}`]),
      borderColor: '#eab308',
      borderWidth: 1.8,
      pointRadius: 0,
      tension: 0.2
    });
  }
  if (activeSeries.BITCOIN && series[`BITCOIN_${curKey}`]) {
    perfDatasets.push({
      label: 'Bitcoin (BTC-USD)',
      data: rebaseSeries(series[`BITCOIN_${curKey}`]),
      borderColor: '#f97316',
      borderWidth: 1.8,
      pointRadius: 0,
      tension: 0.2
    });
  }

  const perfChartData = {
    labels: sampledDates,
    datasets: perfDatasets
  };

  const perfChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#0f172a',
        titleColor: '#e2e8f0',
        bodyColor: '#e2e8f0',
        borderColor: '#334155',
        borderWidth: 1,
        padding: 10,
        callbacks: {
          label: (ctx) => `${ctx.dataset.label}: ${Number(ctx.raw).toFixed(2)} (Baz 100)`
        }
      }
    },
    scales: {
      x: {
        grid: { color: 'rgba(255, 255, 255, 0.04)' },
        ticks: { color: '#64748b', maxTicksLimit: 8, font: { size: 10 } }
      },
      y: {
        grid: { color: 'rgba(255, 255, 255, 0.04)' },
        ticks: { color: '#64748b', font: { size: 10 } }
      }
    }
  };

  // Real-time period return & Alpha calculations for the chosen timeframe
  const rebasedPort = rebaseSeries(dynamicBasketSeries);
  const rebasedSP500 = rebaseSeries(series[`SP500_${curKey}`]);
  const rebasedNDX = rebaseSeries(series[`NASDAQ_${curKey}`]);
  const rebasedBIST = rebaseSeries(series[`BIST100_${curKey}`]);

  const portPeriodReturn = rebasedPort.length > 0 ? (rebasedPort[rebasedPort.length - 1] - 100) : 0;
  const sp500PeriodReturn = rebasedSP500.length > 0 ? (rebasedSP500[rebasedSP500.length - 1] - 100) : 0;
  const ndxPeriodReturn = rebasedNDX.length > 0 ? (rebasedNDX[rebasedNDX.length - 1] - 100) : 0;
  const bistPeriodReturn = rebasedBIST.length > 0 ? (rebasedBIST[rebasedBIST.length - 1] - 100) : 0;

  const alphaVsSP500 = portPeriodReturn - sp500PeriodReturn;
  const alphaVsNDX = portPeriodReturn - ndxPeriodReturn;
  const alphaVsBIST = portPeriodReturn - bistPeriodReturn;

  // Comparative Bar Chart Data
  const barLabels = [
    portLabel,
    'S&P 500',
    'Nasdaq 100',
    'BIST 100',
    'Altın (Ons)',
    'Bitcoin'
  ];
  const barColors = [
    portColor,
    '#3b82f6',
    '#a855f7',
    '#ef4444',
    '#eab308',
    '#f97316'
  ];

  const barPeriodReturns = [
    portPeriodReturn,
    sp500PeriodReturn,
    ndxPeriodReturn,
    bistPeriodReturn,
    metrics['GOLD']?.period_return || 0,
    metrics['BITCOIN']?.period_return || 0
  ];
  const barCAGRReturns = [
    customCalculatedMetrics.cagr || 0,
    metrics['SP500']?.cagr || 0,
    metrics['NASDAQ']?.cagr || 0,
    metrics['BIST100']?.cagr || 0,
    metrics['GOLD']?.cagr || 0,
    metrics['BITCOIN']?.cagr || 0
  ];

  const barChartData = {
    labels: barLabels,
    datasets: [
      {
        label: `${timeframe} Kümülatif Getiri (%)`,
        data: barPeriodReturns,
        backgroundColor: barColors,
        borderRadius: 4
      },
      {
        label: 'Yıllıklandırılmış Getiri (CAGR %)',
        data: barCAGRReturns,
        backgroundColor: barColors.map(c => c + '77'), // transparent version
        borderRadius: 4
      }
    ]
  };

  const barChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: { color: '#94a3b8', font: { size: 11 } }
      },
      tooltip: {
        backgroundColor: '#0f172a',
        callbacks: {
          label: (ctx) => `${ctx.dataset.label}: ${Number(ctx.raw).toFixed(2)}%`
        }
      }
    },
    scales: {
      x: { grid: { color: 'rgba(255, 255, 255, 0.04)' }, ticks: { color: '#e2e8f0', font: { size: 11, weight: 'bold' } } },
      y: {
        grid: { color: 'rgba(255, 255, 255, 0.04)' },
        ticks: { color: '#64748b', font: { size: 10 }, callback: (v) => `${v}%` }
      }
    }
  };

  // Underwater Drawdown Chart
  const rawUnderwater = (portfolioScope === 'equity' || portfolioScope === 'all'
    ? (underwater[curKey] || [])
    : dynamicUnderwater).slice(startIndex);
  const sampledUnderwater = rawUnderwater.filter((_, i) => i % sampleStep === 0);

  const underwaterChartData = {
    labels: sampledDates,
    datasets: [
      {
        label: 'Zirveden Düşüş (Drawdown %)',
        data: sampledUnderwater,
        borderColor: '#ef4444',
        backgroundColor: 'rgba(239, 68, 68, 0.15)',
        borderWidth: 1.5,
        fill: true,
        pointRadius: 0,
        tension: 0.2
      }
    ]
  };

  const underwaterChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#0f172a',
        callbacks: {
          label: (ctx) => `Düşüş: ${Number(ctx.raw).toFixed(2)}%`
        }
      }
    },
    scales: {
      x: { display: false },
      y: {
        max: 0,
        grid: { color: 'rgba(255, 255, 255, 0.04)' },
        ticks: { color: '#ef4444', font: { size: 9 }, callback: (v) => `${v}%` }
      }
    }
  };

  // Segments Statistics for Performance Attribution Matrix
  const holdings = portfolioSummary?.enrichedHoldings || [];

  const getHoldingSegment = (h) => {
    const s = (h.ticker || '').toUpperCase();
    const clean = s.replace('.IS', '').replace('-USD', '');
    if (h.type === 'Altın' || clean === 'XAUT') return 'shield';
    if (h.type === 'Kripto' || KNOWN_CRYPTO_SET?.has(clean) || KNOWN_CRYPTO_SET?.has(s)) return 'crypto';
    return 'equity';
  };

  const segmentStats = useMemo(() => {
    const totalValAllTRY = portfolioSummary?.totalValTRY || 1;
    const stats = {
      all: {
        id: 'all',
        label: 'Tüm Konsolide Portföy',
        shortLabel: 'TÜM PORTFÖY',
        icon: '🌐',
        color: '#ffffff',
        count: holdings.length + (((portfolioSummary?.totalGrams) || 0) > 0 ? 1 : 0),
        valTRY: portfolioSummary?.totalValTRY || 0,
        valUSD: portfolioSummary?.totalValUSD || 0,
        costTRY: portfolioSummary?.totalCostTRY || 0,
        costUSD: portfolioSummary?.totalCostUSD || 0,
        profitTRY: portfolioSummary?.unrealizedProfitTRY || 0,
        profitUSD: portfolioSummary?.unrealizedProfitUSD || 0,
        returnPct: portfolioSummary?.unrealizedReturnPct || 0,
        dayPLTRY: portfolioSummary?.dayPLTRY || 0,
        dayPLUSD: portfolioSummary?.dayPLUSD || 0,
        dayPLPct: portfolioSummary?.dayPLPct || 0,
        weightPct: 100,
        benchmarkNote: 'Konsolide Denge & Koruma',
        benchmarkBadge: 'Konsolide'
      },
      equity: {
        id: 'equity',
        label: 'Çekirdek Hisse & ETF Sepeti',
        shortLabel: 'HİSSE & ETF',
        icon: '📈',
        color: '#00e5ff',
        count: 0,
        valTRY: 0,
        valUSD: 0,
        costTRY: 0,
        costUSD: 0,
        profitTRY: 0,
        profitUSD: 0,
        returnPct: 0,
        dayPLTRY: 0,
        dayPLUSD: 0,
        dayPLPct: 0,
        weightPct: 0,
        benchmarkNote: 'S&P 500 & BIST 100 Alfa Odağı',
        benchmarkBadge: 'Alfa Motoru'
      },
      shield: {
        id: 'shield',
        label: 'Kur Kalkanı & Güvence Havuzu',
        shortLabel: 'KUR KALKANI',
        icon: '🛡️',
        color: '#fbbf24',
        count: ((portfolioSummary?.totalGrams) || 0) > 0 ? 1 : 0,
        valTRY: portfolioSummary?.totalGoldValTRY || 0,
        valUSD: (portfolioSummary?.totalGoldValTRY || 0) / (portfolioSummary?.usdtry || usdtry || 1),
        costTRY: portfolioSummary?.totalGoldCostTRY || 0,
        costUSD: (portfolioSummary?.totalGoldCostTRY || 0) / (portfolioSummary?.usdtry || usdtry || 1),
        profitTRY: portfolioSummary?.goldProfitTRY || 0,
        profitUSD: (portfolioSummary?.goldProfitTRY || 0) / (portfolioSummary?.usdtry || usdtry || 1),
        returnPct: portfolioSummary?.goldReturnPct || 0,
        dayPLTRY: 0,
        dayPLUSD: 0,
        dayPLPct: 0,
        weightPct: 0,
        benchmarkNote: 'Enflasyon Kalkanı & Kuru Barut',
        benchmarkBadge: 'Savunma'
      },
      crypto: {
        id: 'crypto',
        label: 'Asimetrik Kripto Varlıklar',
        shortLabel: 'KRİPTO',
        icon: '⚡',
        color: '#c084fc',
        count: 0,
        valTRY: 0,
        valUSD: 0,
        costTRY: 0,
        costUSD: 0,
        profitTRY: 0,
        profitUSD: 0,
        returnPct: 0,
        dayPLTRY: 0,
        dayPLUSD: 0,
        dayPLPct: 0,
        weightPct: 0,
        benchmarkNote: 'Yüksek Beta & Asimetrik Getiri',
        benchmarkBadge: 'Yüksek Beta'
      }
    };

    holdings.forEach(h => {
      const seg = getHoldingSegment(h);
      if (seg === 'shield') {
        stats.shield.count++;
        stats.shield.valTRY += (h.valTRY || 0);
        stats.shield.valUSD += (h.valUSD || 0);
        stats.shield.costTRY += (h.costTRY || 0);
        stats.shield.costUSD += (h.costUSD || 0);
        stats.shield.profitTRY += (h.profitTRY || 0);
        stats.shield.profitUSD += (h.profitUSD || 0);
        stats.shield.dayPLTRY += (h.dayPLTRY || 0);
        stats.shield.dayPLUSD += (h.dayPLUSD || 0);
      } else if (seg === 'crypto') {
        stats.crypto.count++;
        stats.crypto.valTRY += (h.valTRY || 0);
        stats.crypto.valUSD += (h.valUSD || 0);
        stats.crypto.costTRY += (h.costTRY || 0);
        stats.crypto.costUSD += (h.costUSD || 0);
        stats.crypto.profitTRY += (h.profitTRY || 0);
        stats.crypto.profitUSD += (h.profitUSD || 0);
        stats.crypto.dayPLTRY += (h.dayPLTRY || 0);
        stats.crypto.dayPLUSD += (h.dayPLUSD || 0);
      } else {
        stats.equity.count++;
        stats.equity.valTRY += (h.valTRY || 0);
        stats.equity.valUSD += (h.valUSD || 0);
        stats.equity.costTRY += (h.costTRY || 0);
        stats.equity.costUSD += (h.costUSD || 0);
        stats.equity.profitTRY += (h.profitTRY || 0);
        stats.equity.profitUSD += (h.profitUSD || 0);
        stats.equity.dayPLTRY += (h.dayPLTRY || 0);
        stats.equity.dayPLUSD += (h.dayPLUSD || 0);
      }
    });

    ['equity', 'shield', 'crypto'].forEach(k => {
      const s = stats[k];
      s.returnPct = s.costTRY > 0 ? (s.profitTRY / s.costTRY) * 100 : 0;
      s.weightPct = totalValAllTRY > 0 ? (s.valTRY / totalValAllTRY) * 100 : 0;
      const prevVal = s.valTRY - s.dayPLTRY;
      s.dayPLPct = prevVal > 0 ? (s.dayPLTRY / prevVal) * 100 : 0;
    });

    return stats;
  }, [holdings, portfolioSummary, usdtry]);

  const metricRows = [
    { 
      key: 'CUSTOM_BASKET', 
      name: portLabel, 
      code: portfolioScope.toUpperCase(), 
      color: portColor, 
      bold: true,
      customMetrics: customCalculatedMetrics
    },
    { key: 'SP500', name: 'S&P 500', code: '^GSPC', color: '#3b82f6' },
    { key: 'NASDAQ', name: 'Nasdaq 100', code: '^NDX', color: '#a855f7' },
    { key: 'BIST100', name: 'BIST 100', code: 'XU100.IS', color: '#ef4444' },
    { key: 'GOLD', name: 'Altın (Ons)', code: 'GC=F', color: '#eab308' },
    { key: 'BITCOIN', name: 'Bitcoin', code: 'BTC-USD', color: '#f97316' }
  ];

  return (
    <div className="tab-pane-content" style={{ animation: 'fadeIn 0.25s ease' }}>
      {/* Workspace Header */}
      <div className="workspace-header" style={{ marginBottom: 16 }}>
        <div>
          <h2 className="workspace-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <LineChart size={20} className="text-cyan" />
            <span>PORTFÖY & BENCHMARK KARŞILAŞTIRMA (GIPS STANDARDI)</span>
          </h2>
          <p className="workspace-subtitle">
            Çekirdek hisse/ETF, BYDNR hariç sepet, son alımlar veya özel seçtiğiniz varlıklar bazında S&P 500, Nasdaq ve BIST 100 karşılaştırması ve Alfa analizi
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="nav-badge cyan" style={{ padding: '5px 12px', fontSize: 11 }}>
            SEÇİLİ BAZ: {isTRY ? 'TRY NORMALIZE (%40 Rf)' : 'USD NORMALIZE (%4.25 Rf)'}
          </span>
        </div>
      </div>

      {/* Scope Selector Control */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        gap: 12, 
        flexWrap: 'wrap', 
        marginBottom: 12,
        background: 'var(--bg-card)',
        padding: '10px 14px',
        borderRadius: 8,
        border: '1px solid var(--border)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Karşılaştırma Kapsamı:
          </span>
          <div style={{ display: 'inline-flex', background: 'rgba(0,0,0,0.5)', padding: 3, borderRadius: 6, border: '1px solid var(--border)', flexWrap: 'wrap', gap: 2 }}>
            <button
              type="button"
              className={`chip-btn ${portfolioScope === 'equity' ? 'active' : ''}`}
              onClick={() => handleSelectScope('equity')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                padding: '5px 11px',
                fontSize: 11,
                fontWeight: 700,
                color: portfolioScope === 'equity' ? '#00e5ff' : 'var(--text-muted)',
                borderColor: portfolioScope === 'equity' ? '#00e5ff' : 'transparent',
                background: portfolioScope === 'equity' ? 'rgba(0, 229, 255, 0.12)' : 'transparent'
              }}
            >
              <Target size={13} />
              <span>📈 Çekirdek Hisse & ETF (Tümü)</span>
            </button>

            <button
              type="button"
              className={`chip-btn ${portfolioScope === 'ex_bydnr' ? 'active' : ''}`}
              onClick={() => handleSelectScope('ex_bydnr')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                padding: '5px 11px',
                fontSize: 11,
                fontWeight: 700,
                color: portfolioScope === 'ex_bydnr' ? '#10b981' : 'var(--text-muted)',
                borderColor: portfolioScope === 'ex_bydnr' ? '#10b981' : 'transparent',
                background: portfolioScope === 'ex_bydnr' ? 'rgba(16, 185, 129, 0.14)' : 'transparent'
              }}
              title="BYDNR'nin ağırlıklı baskısını hariç tutarak hisselerin saf getirisini görün"
            >
              <ShieldCheck size={13} />
              <span>🛡️ BYDNR Hariç Hisse Sepeti</span>
            </button>

            <button
              type="button"
              className={`chip-btn ${portfolioScope === 'recent' ? 'active' : ''}`}
              onClick={() => handleSelectScope('recent')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                padding: '5px 11px',
                fontSize: 11,
                fontWeight: 700,
                color: portfolioScope === 'recent' ? '#c084fc' : 'var(--text-muted)',
                borderColor: portfolioScope === 'recent' ? '#c084fc' : 'transparent',
                background: portfolioScope === 'recent' ? 'rgba(192, 132, 252, 0.14)' : 'transparent'
              }}
              title="Son dönemde portföye eklenen yeni alımlar: SPCX, DRAM, NVDA, TSM, ABBV"
            >
              <Sparkles size={13} />
              <span>🚀 Son Dönem Yeni Alımlar</span>
            </button>

            <button
              type="button"
              className={`chip-btn ${portfolioScope === 'all' ? 'active' : ''}`}
              onClick={() => handleSelectScope('all')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                padding: '5px 11px',
                fontSize: 11,
                fontWeight: 700,
                color: portfolioScope === 'all' ? '#ffffff' : 'var(--text-muted)',
                borderColor: portfolioScope === 'all' ? '#ffffff' : 'transparent',
                background: portfolioScope === 'all' ? 'rgba(255, 255, 255, 0.12)' : 'transparent'
              }}
            >
              <Layers size={13} />
              <span>🌐 Tüm Portföy</span>
            </button>

            <button
              type="button"
              className={`chip-btn ${portfolioScope === 'custom' ? 'active' : ''}`}
              onClick={() => handleSelectScope('custom')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                padding: '5px 11px',
                fontSize: 11,
                fontWeight: 700,
                color: portfolioScope === 'custom' ? '#f59e0b' : 'var(--text-muted)',
                borderColor: portfolioScope === 'custom' ? '#f59e0b' : 'transparent',
                background: portfolioScope === 'custom' ? 'rgba(245, 158, 11, 0.14)' : 'transparent'
              }}
            >
              <Sliders size={13} />
              <span>⚙️ Özel Seçim ({selectedBasketStats.count})</span>
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            type="button"
            className="chip-btn"
            onClick={() => setIsSelectorOpen(!isSelectorOpen)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 12px',
              fontSize: 11,
              fontWeight: 700,
              color: isSelectorOpen ? '#00e5ff' : 'var(--text-muted)',
              borderColor: isSelectorOpen ? '#00e5ff' : 'var(--border)',
              background: isSelectorOpen ? 'rgba(0, 229, 255, 0.12)' : 'transparent'
            }}
          >
            <Filter size={13} />
            <span>{isSelectorOpen ? '▲ Varlık Listesini Gizle' : '▼ Varlık Seçici & Filtreyi Aç'}</span>
          </button>
        </div>
      </div>

      {/* Varlık Filtresi & Özel Sepet Seçici Paneli */}
      {isSelectorOpen && (
        <div className="card" style={{ 
          padding: '14px 16px', 
          marginBottom: 16, 
          background: 'var(--bg-card)', 
          border: '1px solid rgba(0, 229, 255, 0.3)',
          borderRadius: 8,
          animation: 'fadeIn 0.2s ease'
        }}>
          {/* Header & Quick Action Buttons */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Sliders size={16} className="text-cyan" />
              <div>
                <strong style={{ fontSize: 12.5, color: '#f1f5f9' }}>
                  İNTERAKTİF VARLIK SEÇİCİ & ÖZEL BENCHMARK MOTORU
                </strong>
                <div style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>
                  İstediğiniz varlıkları işaretleyerek veya çıkararak benchmark eğrisini anında yeniden hesaplayın
                </div>
              </div>
              <span className="nav-badge cyan" style={{ fontSize: 10, padding: '2px 8px' }}>
                {selectedBasketStats.count} / {availableHoldings.length} Varlık Seçili
              </span>
            </div>

            {/* Quick Action Presets */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <button
                type="button"
                className="chip-btn"
                onClick={handleSelectAll}
                style={{ fontSize: 10.5, padding: '4px 9px' }}
                title="Tüm portföyü seç"
              >
                ⭐ Tüm Varlıklar
              </button>
              <button
                type="button"
                className="chip-btn"
                onClick={handleExcludeBydnr}
                style={{ fontSize: 10.5, padding: '4px 9px', color: '#10b981', borderColor: 'rgba(16, 185, 129, 0.4)', background: 'rgba(16, 185, 129, 0.08)' }}
                title="BYDNR'yi sepetten hariç tut"
              >
                🚫 BYDNR'siz
              </button>
              <button
                type="button"
                className="chip-btn"
                onClick={handleSelectRecent}
                style={{ fontSize: 10.5, padding: '4px 9px', color: '#c084fc', borderColor: 'rgba(192, 132, 252, 0.4)', background: 'rgba(192, 132, 252, 0.08)' }}
                title="Son dönemde eklenen SPCX, DRAM, NVDA, TSM, ABBV hisselerini seç"
              >
                🚀 Sadece Yeni Alımlar
              </button>
              <button
                type="button"
                className="chip-btn"
                onClick={handleSelectEquities}
                style={{ fontSize: 10.5, padding: '4px 9px', color: '#00e5ff', borderColor: 'rgba(0, 229, 255, 0.4)' }}
              >
                📈 Sadece Hisseler
              </button>
              <button
                type="button"
                className="chip-btn"
                onClick={handleSelectShield}
                style={{ fontSize: 10.5, padding: '4px 9px', color: '#fbbf24', borderColor: 'rgba(251, 191, 36, 0.4)' }}
              >
                🛡️ Altın & Kur
              </button>
              <button
                type="button"
                className="chip-btn"
                onClick={handleSelectCrypto}
                style={{ fontSize: 10.5, padding: '4px 9px', color: '#f97316', borderColor: 'rgba(249, 115, 22, 0.4)' }}
              >
                ⚡ Kriptolar
              </button>
              <button
                type="button"
                className="chip-btn"
                onClick={handleClearAll}
                style={{ fontSize: 10.5, padding: '4px 9px', color: '#ef4444' }}
              >
                🧹 Temizle
              </button>
            </div>
          </div>

          {/* Active Custom Basket Live KPI Banner */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
            gap: 8,
            padding: '8px 12px',
            background: 'rgba(0, 0, 0, 0.4)',
            borderRadius: 6,
            border: '1px solid var(--border)',
            marginBottom: 12,
            fontSize: 11
          }}>
            <div>
              <div style={{ color: 'var(--text-muted)', fontSize: 10 }}>Seçili Sepet Değeri</div>
              <div className="mono font-bold" style={{ color: '#fff', fontSize: 13 }}>
                {sym}{fmt(isTRY ? selectedBasketStats.valTRY : selectedBasketStats.valUSD)}
              </div>
            </div>
            <div>
              <div style={{ color: 'var(--text-muted)', fontSize: 10 }}>Toplam Maliyet</div>
              <div className="mono font-bold" style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                {sym}{fmt(isTRY ? selectedBasketStats.costTRY : selectedBasketStats.costUSD)}
              </div>
            </div>
            <div>
              <div style={{ color: 'var(--text-muted)', fontSize: 10 }}>Net Kâr / Zarar</div>
              <div className="mono font-bold" style={{ color: selectedBasketStats.profitTRY >= 0 ? 'var(--emerald)' : 'var(--red)', fontSize: 13 }}>
                {selectedBasketStats.profitTRY >= 0 ? '+' : ''}{sym}{fmt(isTRY ? selectedBasketStats.profitTRY : selectedBasketStats.profitUSD)}
              </div>
            </div>
            <div>
              <div style={{ color: 'var(--text-muted)', fontSize: 10 }}>Kümülatif Getiri</div>
              <div className="mono font-bold" style={{ color: selectedBasketStats.returnPct >= 0 ? 'var(--emerald)' : 'var(--red)', fontSize: 13 }}>
                {selectedBasketStats.returnPct >= 0 ? '+' : ''}%{fmt(selectedBasketStats.returnPct, 2)}
              </div>
            </div>
            <div>
              <div style={{ color: 'var(--text-muted)', fontSize: 10 }}>Portföy Payı</div>
              <div className="mono font-bold" style={{ color: '#00e5ff', fontSize: 13 }}>
                %{fmt(selectedBasketStats.basketWeightPct, 1)}
              </div>
            </div>
            <div>
              <div style={{ color: 'var(--text-muted)', fontSize: 10 }}>24s Günlük Değişim</div>
              <div className="mono font-bold" style={{ color: selectedBasketStats.dayPLTRY >= 0 ? 'var(--emerald)' : 'var(--red)', fontSize: 13 }}>
                {selectedBasketStats.dayPLTRY >= 0 ? '+' : ''}%{fmt(selectedBasketStats.dayPLPct, 2)}
              </div>
            </div>
          </div>

          {/* Interactive Holding Chips Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))',
            gap: 8,
            maxHeight: 280,
            overflowY: 'auto',
            paddingRight: 4
          }}>
            {availableHoldings.map(h => {
              const isSelected = selectedTickers.has(h.id);
              const icon = h.category === 'equity' ? '📈' : (h.category === 'shield' ? '🛡️' : '⚡');
              const ret = h.returnPct;

              return (
                <div
                  key={h.id}
                  onClick={() => toggleTicker(h.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '7px 10px',
                    borderRadius: 6,
                    cursor: 'pointer',
                    userSelect: 'none',
                    transition: 'all 0.15s ease',
                    background: isSelected ? 'rgba(0, 229, 255, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                    border: isSelected ? '1px solid rgba(0, 229, 255, 0.4)' : '1px solid rgba(255, 255, 255, 0.06)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}>
                    <div style={{ 
                      width: 16, 
                      height: 16, 
                      borderRadius: 3, 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      background: isSelected ? '#00e5ff' : 'rgba(255, 255, 255, 0.1)',
                      color: isSelected ? '#000' : 'transparent',
                      fontSize: 11,
                      fontWeight: 900
                    }}>
                      ✓
                    </div>
                    <span style={{ fontSize: 13 }}>{icon}</span>
                    <div style={{ overflow: 'hidden' }}>
                      <div style={{ fontWeight: 700, fontSize: 11.5, color: isSelected ? '#fff' : 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {h.ticker}
                      </div>
                      <div style={{ fontSize: 9.5, color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 100 }}>
                        {h.name}
                      </div>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div className="mono font-bold" style={{ fontSize: 10.5, color: ret >= 0 ? 'var(--emerald)' : 'var(--red)' }}>
                      {ret >= 0 ? '+' : ''}%{fmt(ret, 1)}
                    </div>
                    <div className="mono" style={{ fontSize: 9.5, color: 'var(--text-muted)' }}>
                      {sym}{fmt(isTRY ? h.valTRY : h.valUSD, 0)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Alpha Spread Executive Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginBottom: 16 }}>
        {/* Basket Return Card */}
        <div className="card" style={{ padding: 14, background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' }}>
              {portLabel} ({timeframe})
            </span>
            <span className={`nav-badge ${scopeBadge.color}`} style={{ fontSize: 9.5, padding: '1px 6px' }}>
              {scopeBadge.label}
            </span>
          </div>
          <div className="mono" style={{ fontSize: 20, fontWeight: 800, color: portPeriodReturn >= 0 ? 'var(--emerald)' : 'var(--red)', margin: '4px 0' }}>
            {portPeriodReturn >= 0 ? '+' : ''}{fmt(portPeriodReturn)}%
          </div>
          <div style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>
            Dönem Başlangıcına Göre Net Değişim
          </div>
        </div>

        {/* Alpha vs S&P 500 */}
        <div className="card" style={{ padding: 14, background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#3b82f6' }}>
              S&P 500 ALFA / SPREAD
            </span>
            <span className={`nav-badge ${alphaVsSP500 >= 0 ? 'emerald' : 'red'}`} style={{ fontSize: 9.5, padding: '1px 6px' }}>
              {alphaVsSP500 >= 0 ? '+Alfa' : 'Gecikme'}
            </span>
          </div>
          <div className="mono" style={{ fontSize: 20, fontWeight: 800, color: alphaVsSP500 >= 0 ? 'var(--emerald)' : 'var(--red)', margin: '4px 0' }}>
            {alphaVsSP500 >= 0 ? '+' : ''}{fmt(alphaVsSP500)}%
          </div>
          <div style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>
            S&P 500 Getirisi: <strong className="mono" style={{ color: '#e2e8f0' }}>{sp500PeriodReturn >= 0 ? '+' : ''}{fmt(sp500PeriodReturn)}%</strong>
          </div>
        </div>

        {/* Alpha vs Nasdaq 100 */}
        <div className="card" style={{ padding: 14, background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#a855f7' }}>
              NASDAQ 100 ALFA / SPREAD
            </span>
            <span className={`nav-badge ${alphaVsNDX >= 0 ? 'emerald' : 'red'}`} style={{ fontSize: 9.5, padding: '1px 6px' }}>
              {alphaVsNDX >= 0 ? '+Alfa' : 'Gecikme'}
            </span>
          </div>
          <div className="mono" style={{ fontSize: 20, fontWeight: 800, color: alphaVsNDX >= 0 ? 'var(--emerald)' : 'var(--red)', margin: '4px 0' }}>
            {alphaVsNDX >= 0 ? '+' : ''}{fmt(alphaVsNDX)}%
          </div>
          <div style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>
            Nasdaq Getirisi: <strong className="mono" style={{ color: '#e2e8f0' }}>{ndxPeriodReturn >= 0 ? '+' : ''}{fmt(ndxPeriodReturn)}%</strong>
          </div>
        </div>

        {/* Alpha vs BIST 100 */}
        <div className="card" style={{ padding: 14, background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#ef4444' }}>
              BIST 100 ALFA / SPREAD
            </span>
            <span className={`nav-badge ${alphaVsBIST >= 0 ? 'emerald' : 'red'}`} style={{ fontSize: 9.5, padding: '1px 6px' }}>
              {alphaVsBIST >= 0 ? '+Alfa' : 'Gecikme'}
            </span>
          </div>
          <div className="mono" style={{ fontSize: 20, fontWeight: 800, color: alphaVsBIST >= 0 ? 'var(--emerald)' : 'var(--red)', margin: '4px 0' }}>
            {alphaVsBIST >= 0 ? '+' : ''}{fmt(alphaVsBIST)}%
          </div>
          <div style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>
            BIST 100 Getirisi: <strong className="mono" style={{ color: '#e2e8f0' }}>{bistPeriodReturn >= 0 ? '+' : ''}{fmt(bistPeriodReturn)}%</strong>
          </div>
        </div>
      </div>

      {/* Main Charts Card */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16, marginBottom: 20 }}>
        
        {/* Performance & Underwater Card */}
        <div className="card" style={{ padding: 18, background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          {/* Chart Header & Mode Toggles */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: 13, color: '#e2e8f0' }}>
                {chartType === 'line' 
                  ? `${portLabel} NORMALİZE PERFORMANS (BAZ 100)` 
                  : 'BENCHMARK GETİRİ KARŞILAŞTIRMA ÇUBUK GRAFİĞİ'}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                {chartType === 'line' ? `${timeframe} dönemi normalize getiri eğrileri (Başlangıç = 100)` : 'Dönem Getirisi ve Yıllıklandırılmış CAGR Karşılaştırması'}
              </div>
            </div>

            {/* Timeframe & View Mode Toggles */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              {/* Timeframe Selectors */}
              <div style={{ display: 'inline-flex', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--border)', borderRadius: 4, padding: 2, gap: 2 }}>
                {[
                  { id: '1W', label: '1H' },
                  { id: '1M', label: '1A' },
                  { id: '3M', label: '3A' },
                  { id: '6M', label: '6A' },
                  { id: '1Y', label: '1Y' },
                  { id: 'ALL', label: 'TÜMÜ' }
                ].map(tf => (
                  <button
                    key={tf.id}
                    type="button"
                    className={`chip-btn ${timeframe === tf.id ? 'active' : ''}`}
                    onClick={() => setTimeframe(tf.id)}
                    style={{ padding: '3px 8px', fontSize: 11, fontWeight: 700 }}
                  >
                    {tf.label}
                  </button>
                ))}
              </div>

              {/* View Mode Toggle: Line vs Bar */}
              <div style={{ display: 'inline-flex', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--border)', borderRadius: 4, padding: 2 }}>
                <button
                  type="button"
                  className={`chip-btn ${chartType === 'line' ? 'active' : ''}`}
                  onClick={() => setChartType('line')}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}
                >
                  <LineChart size={13} />
                  <span>Çizgi Grafik</span>
                </button>
                <button
                  type="button"
                  className={`chip-btn ${chartType === 'bar' ? 'active' : ''}`}
                  onClick={() => setChartType('bar')}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}
                >
                  <BarChart3 size={13} />
                  <span>Çubuk Grafik</span>
                </button>
              </div>
            </div>
          </div>

          {/* Series Toggles (Active for Line Chart) */}
          {chartType === 'line' && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
              <button
                type="button"
                className={`chip-btn ${activeSeries.portfolio ? 'active' : ''}`}
                style={{ 
                  borderColor: activeSeries.portfolio ? portColor : 'transparent', 
                  color: portColor,
                  background: activeSeries.portfolio ? `${portColor}18` : 'transparent' 
                }}
                onClick={() => toggleSeries('portfolio')}
              >
                {portLabel}
              </button>
              <button
                type="button"
                className={`chip-btn ${activeSeries.SP500 ? 'active' : ''}`}
                style={{ borderColor: activeSeries.SP500 ? '#3b82f6' : 'transparent', color: '#3b82f6' }}
                onClick={() => toggleSeries('SP500')}
              >
                🔵 S&P 500
              </button>
              <button
                type="button"
                className={`chip-btn ${activeSeries.NASDAQ ? 'active' : ''}`}
                style={{ borderColor: activeSeries.NASDAQ ? '#a855f7' : 'transparent', color: '#a855f7' }}
                onClick={() => toggleSeries('NASDAQ')}
              >
                🟣 Nasdaq
              </button>
              <button
                type="button"
                className={`chip-btn ${activeSeries.BIST100 ? 'active' : ''}`}
                style={{ borderColor: activeSeries.BIST100 ? '#ef4444' : 'transparent', color: '#ef4444' }}
                onClick={() => toggleSeries('BIST100')}
              >
                🔴 BIST 100
              </button>
              <button
                type="button"
                className={`chip-btn ${activeSeries.GOLD ? 'active' : ''}`}
                style={{ borderColor: activeSeries.GOLD ? '#eab308' : 'transparent', color: '#eab308' }}
                onClick={() => toggleSeries('GOLD')}
              >
                🟡 Altın
              </button>
              <button
                type="button"
                className={`chip-btn ${activeSeries.BITCOIN ? 'active' : ''}`}
                style={{ borderColor: activeSeries.BITCOIN ? '#f97316' : 'transparent', color: '#f97316' }}
                onClick={() => toggleSeries('BITCOIN')}
              >
                🟠 Bitcoin
              </button>
            </div>
          )}

          {/* Chart Display Area */}
          <div style={{ height: 320, width: '100%', marginBottom: 16 }}>
            {chartType === 'line' ? (
              <Line data={perfChartData} options={perfChartOptions} />
            ) : (
              <Bar data={barChartData} options={barChartOptions} />
            )}
          </div>

          {/* Underwater Drawdown Chart Box */}
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#ef4444' }}>
                UNDERWATER DRAWDOWN GRAFİĞİ (Zirveden Düşüş & Toparlanma)
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                Maksimum Kayıp: <strong style={{ color: '#ef4444' }}>
                  {fmt(customCalculatedMetrics.max_drawdown || -38.5)}%
                </strong>
              </div>
            </div>
            <div style={{ height: 100, width: '100%' }}>
              <Line data={underwaterChartData} options={underwaterChartOptions} />
            </div>
          </div>
        </div>

      </div>

      {/* Asset Class Performance & Attribution Matrix Card */}
      <div className="card" style={{ padding: 18, background: 'var(--bg-card)', border: '1px solid var(--border)', marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 13, color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>📐</span>
              <span>VARLIK SINIFI PERFORMANS, KÂR/ZARAR & DAĞILIM MATRİSİ</span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              Her varlık kümesinin portföy ağırlığı, maliyeti, anlık kâr/zararı, 24 saatlik değişimi ve benchmark rolü
            </div>
          </div>
          <span className="nav-badge cyan" style={{ fontSize: 10.5, padding: '4px 10px' }}>
            Portföy Büyüklüğü: <strong className="mono" style={{ color: '#fff' }}>{sym}{fmt(isTRY ? segmentStats.all.valTRY : segmentStats.all.valUSD)}</strong>
          </span>
        </div>

        <div className="table-responsive">
          <table className="terminal-table" style={{ fontSize: 11 }}>
            <thead>
              <tr>
                <th>Varlık Segmenti & Odak</th>
                <th style={{ width: 140 }}>Portföy Payı (%)</th>
                <th className="text-right">Piyasa Değeri</th>
                <th className="text-right">Maliyet</th>
                <th className="text-right">24s Değişim</th>
                <th className="text-right">Toplam Net Kâr / Zarar</th>
                <th className="text-right">Toplam Kâr (%)</th>
                <th className="text-center">Benchmark & Strateji Rolü</th>
              </tr>
            </thead>
            <tbody>
              {[
                segmentStats.equity,
                segmentStats.shield,
                segmentStats.crypto
              ].map(seg => {
                const val = isTRY ? seg.valTRY : seg.valUSD;
                const cost = isTRY ? seg.costTRY : seg.costUSD;
                const profit = isTRY ? seg.profitTRY : seg.profitUSD;
                const dayPL = isTRY ? seg.dayPLTRY : seg.dayPLUSD;

                return (
                  <tr key={seg.id} className="table-row">
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 16 }}>{seg.icon}</span>
                        <div>
                          <strong style={{ color: seg.color, fontSize: 11.5 }}>
                            {seg.label}
                          </strong>
                          <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                            {seg.count} Varlık Pozisyonu
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Weight & Progress Bar */}
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ flex: 1, height: 6, background: 'rgba(255, 255, 255, 0.08)', borderRadius: 3, overflow: 'hidden' }}>
                          <div 
                            style={{ 
                              height: '100%', 
                              width: `${Math.min(100, Math.max(0, seg.weightPct))}%`, 
                              background: seg.color, 
                              borderRadius: 3 
                            }} 
                          />
                        </div>
                        <span className="mono font-bold" style={{ fontSize: 11, minWidth: 42, textAlign: 'right' }}>
                          %{fmt(seg.weightPct, 1)}
                        </span>
                      </div>
                    </td>

                    {/* Market Value */}
                    <td className="text-right mono font-bold" style={{ color: '#f1f5f9' }}>
                      {sym}{fmt(val)}
                    </td>

                    {/* Cost */}
                    <td className="text-right mono text-muted">
                      {sym}{fmt(cost)}
                    </td>

                    {/* 24h P/L & % (Moved to left) */}
                    <td className="text-right mono">
                      <div style={{ color: dayPL >= 0 ? 'var(--emerald)' : 'var(--red)', fontWeight: 700 }}>
                        {dayPL >= 0 ? '+' : ''}{sym}{fmt(dayPL)}
                      </div>
                      <div style={{ fontSize: 9.5, color: seg.dayPLPct >= 0 ? 'var(--emerald)' : 'var(--red)' }}>
                        {seg.dayPLPct >= 0 ? '+' : ''}%{fmt(seg.dayPLPct, 2)}
                      </div>
                    </td>

                    {/* Total Net Profit */}
                    <td className="text-right mono font-bold" style={{ color: profit >= 0 ? 'var(--emerald)' : 'var(--red)' }}>
                      {profit >= 0 ? '+' : ''}{sym}{fmt(profit)}
                    </td>

                    {/* Total Return % */}
                    <td className="text-right mono font-bold" style={{ color: seg.returnPct >= 0 ? 'var(--emerald)' : 'var(--red)' }}>
                      {seg.returnPct >= 0 ? '+' : ''}%{fmt(seg.returnPct, 2)}
                    </td>

                    {/* Role / Benchmark Badge */}
                    <td className="text-center">
                      <span className="nav-badge" style={{ 
                        borderColor: seg.color, 
                        color: seg.color, 
                        background: `${seg.color}15`, 
                        fontSize: 10, 
                        padding: '3px 8px' 
                      }}>
                        {seg.benchmarkNote}
                      </span>
                    </td>
                  </tr>
                );
              })}

              {/* Total Consolidated Row */}
              <tr style={{ background: 'rgba(255, 255, 255, 0.04)', fontWeight: 'bold', borderTop: '2px solid var(--border)' }}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 16 }}>🌐</span>
                    <div>
                      <strong style={{ color: '#ffffff', fontSize: 12 }}>
                        {segmentStats.all.label}
                      </strong>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                        Toplam {segmentStats.all.count} Varlık
                      </div>
                    </div>
                  </div>
                </td>
                <td>
                  <span className="mono font-bold" style={{ color: '#ffffff' }}>%100.0</span>
                </td>
                <td className="text-right mono font-bold" style={{ color: '#ffffff', fontSize: 12 }}>
                  {sym}{fmt(isTRY ? segmentStats.all.valTRY : segmentStats.all.valUSD)}
                </td>
                <td className="text-right mono text-muted">
                  {sym}{fmt(isTRY ? segmentStats.all.costTRY : segmentStats.all.costUSD)}
                </td>
                <td className="text-right mono">
                  <div style={{ color: segmentStats.all.dayPLTRY >= 0 ? 'var(--emerald)' : 'var(--red)', fontWeight: 700 }}>
                    {segmentStats.all.dayPLTRY >= 0 ? '+' : ''}{sym}{fmt(isTRY ? segmentStats.all.dayPLTRY : segmentStats.all.dayPLUSD)}
                  </div>
                  <div style={{ fontSize: 9.5, color: segmentStats.all.dayPLPct >= 0 ? 'var(--emerald)' : 'var(--red)' }}>
                    {segmentStats.all.dayPLPct >= 0 ? '+' : ''}%{fmt(segmentStats.all.dayPLPct, 2)}
                  </div>
                </td>
                <td className="text-right mono font-bold" style={{ color: segmentStats.all.profitTRY >= 0 ? 'var(--emerald)' : 'var(--red)', fontSize: 12 }}>
                  {segmentStats.all.profitTRY >= 0 ? '+' : ''}{sym}{fmt(isTRY ? segmentStats.all.profitTRY : segmentStats.all.profitUSD)}
                </td>
                <td className="text-right mono font-bold" style={{ color: segmentStats.all.returnPct >= 0 ? 'var(--emerald)' : 'var(--red)' }}>
                  {segmentStats.all.returnPct >= 0 ? '+' : ''}%{fmt(segmentStats.all.returnPct, 2)}
                </td>
                <td className="text-center">
                  <span className="nav-badge gray" style={{ fontSize: 10, padding: '3px 8px' }}>
                    Tam Portföy Dengesi
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Quantitative Risk & Benchmark Analytics Matrix Card */}
      <div className="card" style={{ padding: 18, background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ fontWeight: 800, fontSize: 13, color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>📊</span>
            <span>BLOOMBERG KANTİTATİF RİSK & GÖSTERGE ANALİTİK MATRİSİ</span>
          </div>
          <span style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>
            Seçili Kapsam: <strong style={{ color: portfolioScope === 'equity' ? '#00e5ff' : '#fff' }}>
              {portfolioScope === 'equity' ? 'Çekirdek Hisse & ETF' : 'Tüm Konsolide Portföy'}
            </strong> | Baz: <strong style={{ color: 'var(--amber)' }}>{isTRY ? 'TRY' : 'USD'}</strong>
          </span>
        </div>

        <div className="table-responsive">
          <table className="terminal-table" style={{ fontSize: 11 }}>
            <thead>
              <tr>
                <th>Varlık / Gösterge</th>
                <th>Sembol</th>
                <th className="text-right">Dönem Getirisi</th>
                <th className="text-right">Yıllık Getiri (CAGR)</th>
                <th className="text-right">Volatilite (σ)</th>
                <th className="text-right">Sharpe Oranı</th>
                <th className="text-right">Sortino Oranı</th>
                <th className="text-right">Beta (β)</th>
                <th className="text-right">Jensen Alpha (α)</th>
                <th className="text-right">Tracking Error</th>
                <th className="text-right">Max Drawdown</th>
                <th className="text-right">Calmar</th>
                <th className="text-right">Korelasyon</th>
              </tr>
            </thead>
            <tbody>
              {metricRows.map(row => {
                const m = row.customMetrics || metrics[row.key] || {};
                const isSelectedBasket = row.key === 'CUSTOM_BASKET' || row.key === 'EQUITY' || row.key === 'PORTFOLIO';

                return (
                  <tr
                    key={row.key}
                    className="table-row"
                    style={{ background: isSelectedBasket ? `${portColor}10` : 'transparent' }}
                  >
                    <td>
                      <strong style={{ color: row.color, fontWeight: isSelectedBasket ? 900 : 700 }}>
                        {row.name}
                      </strong>
                    </td>
                    <td className="mono text-muted">{row.code}</td>
                    <td className="text-right mono" style={{ fontWeight: 700, color: (m.period_return || 0) >= 0 ? 'var(--emerald)' : 'var(--red)' }}>
                      {(m.period_return || 0) >= 0 ? '+' : ''}{Number(m.period_return || 0).toFixed(2)}%
                    </td>
                    <td className="text-right mono" style={{ color: (m.cagr || 0) >= 0 ? 'var(--emerald)' : 'var(--red)' }}>
                      {(m.cagr || 0) >= 0 ? '+' : ''}{Number(m.cagr || 0).toFixed(2)}%
                    </td>
                    <td className="text-right mono">{Number(m.volatility || 0).toFixed(2)}%</td>
                    <td className="text-right mono font-medium" style={{ color: (m.sharpe || 0) >= 0 ? 'var(--emerald)' : 'var(--red)' }}>
                      {Number(m.sharpe || 0).toFixed(2)}
                    </td>
                    <td className="text-right mono" style={{ color: (m.sortino || 0) >= 0 ? 'var(--emerald)' : 'var(--red)' }}>
                      {Number(m.sortino || 0).toFixed(2)}
                    </td>
                    <td className="text-right mono font-medium">
                      {isSelectedBasket ? Number(m.beta != null ? m.beta : 1.0).toFixed(2) : Number(m.beta || 0).toFixed(2)}
                    </td>
                    <td className="text-right mono" style={{ color: (m.alpha || 0) >= 0 ? 'var(--emerald)' : 'var(--red)' }}>
                      {(m.alpha || 0) >= 0 ? '+' : ''}{Number(m.alpha || 0).toFixed(2)}%
                    </td>
                    <td className="text-right mono">
                      {Number(m.tracking_error || 0).toFixed(2)}%
                    </td>
                    <td className="text-right mono text-down" style={{ color: 'var(--red)' }}>
                      {Number(m.max_drawdown || 0).toFixed(2)}%
                    </td>
                    <td className="text-right mono">
                      {Number(m.calmar || 0).toFixed(2)}
                    </td>
                    <td className="text-right mono">
                      {isSelectedBasket ? '1.00' : Number(m.correlation || 0).toFixed(2)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Quantitative Decision Guide Legend */}
        <div style={{ background: '#0b101b', borderTop: '1px solid var(--border)', padding: '12px 16px', fontSize: 10.5, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginTop: 14, borderRadius: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="nav-badge emerald" style={{ padding: '2px 6px', fontSize: 9 }}>Üstün</span>
            <span style={{ color: 'var(--text-muted)' }}>
              <strong style={{ color: '#fff' }}>Sharpe & Sortino:</strong> Risksiz faiz üzeri birim risk başına getiri kalitesi.
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="nav-badge cyan" style={{ padding: '2px 6px', fontSize: 9 }}>Defansif</span>
            <span style={{ color: 'var(--text-muted)' }}>
              <strong style={{ color: '#fff' }}>Beta (β):</strong> &lt; 0.85 portföyün piyasa çöküşlerine karşı korumalı olduğunu gösterir.
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="nav-badge emerald" style={{ padding: '2px 6px', fontSize: 9 }}>+Alfa</span>
            <span style={{ color: 'var(--text-muted)' }}>
              <strong style={{ color: '#fff' }}>Jensen Alpha (α):</strong> Portföy yöneticisinin piyasaya attığı reel performans farkı.
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="nav-badge cyan" style={{ padding: '2px 6px', fontSize: 9 }}>Eş Koruma</span>
            <span style={{ color: 'var(--text-muted)' }}>
              <strong style={{ color: '#fff' }}>Korelasyon:</strong> 0'a yakın/negatif varlıklar portföy riskini dağıtır.
            </span>
          </div>
        </div>

      </div>
    </div>
  );
}
