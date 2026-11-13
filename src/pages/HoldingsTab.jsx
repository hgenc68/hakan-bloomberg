import React, { useState, useMemo } from 'react';
import { useApp, KNOWN_CRYPTO_SET } from '../context/AppContext';
import { 
  Search, ShoppingCart, Edit3, Trash2, Plus, ArrowUpDown, ArrowUp, ArrowDown, 
  Briefcase, Sparkles, AlertCircle, CheckCircle, ChevronDown, ChevronUp, 
  ArrowRight, ShieldCheck, PieChart, Layers, TrendingUp, BarChart3, Snowflake, Award, Target, Activity, Calendar, LineChart, RefreshCw,
  Repeat, ShieldAlert, Cpu, CircleDollarSign
} from 'lucide-react';
import { Bar, Radar } from 'react-chartjs-2';
import { Chart as ChartJS, registerables } from 'chart.js';
import stocksData from '../data/stocksData.json';
import potentialStocksData from '../data/potentialStocksData.json';
import benchmarkData from '../data/benchmarkData.json';
import { getHealthColorTheme } from './RiskRadarTab';
import { getTickerSector, SECTOR_DEFINITIONS, DEFAULT_CONCENTRATION_LIMITS } from '../data/sectorConfig';

ChartJS.register(...registerables);

export default function HoldingsTab({ onOpenSellModal, onOpenEditModal, onOpenAddModal, onOpenCashModal, onOpenPpfModal, onSelectStockForChart, onSelectStockForAnalysis }) {
  const { portfolioSummary, currentCurrency, deleteHolding, gramGoldPrice, usdtry, setActiveTab, fetchMarketData, isUpdatingMarket, lastMarketUpdate } = useApp();
  
  // 🌟 Main Sub-View: 'equity' (HİSSE - ETF) or 'all' (TÜM PORTFÖY)
  const [activeMainTab, setActiveMainTab] = useState('equity'); 

  // Timeframe selector for Benchmark & Performance
  const [timeframe, setTimeframe] = useState('1M'); // '1W', '1M', '3M', '6M', 'YTD', '1Y'

  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState('val'); // default sort by Market Value
  const [sortDir, setSortDir] = useState('desc'); // default highest first
  const [showRebalanceAssistant, setShowRebalanceAssistant] = useState(true);
  const [rebalancePeriod, setRebalancePeriod] = useState('monthly'); // 'monthly' or 'weekly'
  const [selectedSegment, setSelectedSegment] = useState('all'); // for 'all' mode: 'all', 'equity', 'shield', 'crypto'
  const [tableSubMode, setTableSubMode] = useState('financial'); // 100% real financial view
  const [expandedRebalanceId, setExpandedRebalanceId] = useState(null);
  const [showFinvestCard, setShowFinvestCard] = useState(true);

  const isTRY = currentCurrency === 'try';
  const sym = isTRY ? '₺' : '$';

  const fmt = (v, d = 2) => (Number(v) || 0).toLocaleString('tr-TR', { minimumFractionDigits: d, maximumFractionDigits: d });
  const fmtInt = (v) => (Number(v) || 0).toLocaleString('tr-TR', { maximumFractionDigits: 0 });
  const fmtShares = (v) => {
    const n = Number(v) || 0;
    return n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 6 });
  };

  const holdings = portfolioSummary?.enrichedHoldings || [];

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const getHoldingSegment = (h) => {
    const symTicker = (h.ticker || '').toUpperCase();
    const clean = symTicker.replace('.IS', '').replace('-USD', '');
    if (h.type === 'Altın' || clean === 'XAUT') return 'shield';
    if (h.type === 'Kripto' || KNOWN_CRYPTO_SET.has(clean) || KNOWN_CRYPTO_SET.has(symTicker)) return 'crypto';
    return 'equity';
  };

  // Pure Stock and ETF holdings list
  const equityHoldings = useMemo(() => {
    return holdings.filter(h => {
      const symTicker = (h.ticker || '').toUpperCase();
      const clean = symTicker.replace('.IS', '').replace('-USD', '');
      const isCrypto = h.type === 'Kripto' || KNOWN_CRYPTO_SET.has(clean) || KNOWN_CRYPTO_SET.has(symTicker);
      const isGoldOrCash = h.type === 'Altın' || h.type === 'Emtia' || h.type === 'Nakit' || clean === 'XAUT';
      if (isCrypto || isGoldOrCash) return false;
      return h.type === 'Hisse' || h.type === 'ETF' || h.type === 'Hisse Senedi';
    });
  }, [holdings]);

  // Segment statistics
  const segmentStats = useMemo(() => {
    const totalValAllTRY = portfolioSummary?.totalValTRY || 1;
    const stats = {
      all: {
        id: 'all',
        label: 'Tüm Konsolide Portföy',
        shortLabel: 'TÜMÜ',
        icon: '🌐',
        color: '#00e5ff',
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
        weightPct: 100
      },
      equity: {
        id: 'equity',
        label: 'Çekirdek Hisse & ETF Sepeti',
        shortLabel: 'HİSSE & ETF',
        icon: '📈',
        color: '#38bdf8',
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
        weightPct: 0
      },
      shield: {
        id: 'shield',
        label: 'Kur Kalkanı & Güvence Havuzu',
        shortLabel: 'KUR KALKANI',
        icon: '🛡️',
        color: '#fbbf24',
        count: (((portfolioSummary?.totalGrams) || 0) > 0 ? 1 : 0) +
               (((portfolioSummary?.ppfBalanceTRY) || 0) > 0 ? 1 : 0) +
               (((portfolioSummary?.totalFreeCashTRY) || 0) > 0 ? 1 : 0),
        valTRY: (portfolioSummary?.totalGoldValTRY || 0) + (portfolioSummary?.ppfBalanceTRY || 0) + (portfolioSummary?.totalFreeCashTRY || 0),
        valUSD: ((portfolioSummary?.totalGoldValTRY || 0) + (portfolioSummary?.ppfBalanceTRY || 0) + (portfolioSummary?.totalFreeCashTRY || 0)) / (portfolioSummary?.usdtry || usdtry || 1),
        costTRY: (portfolioSummary?.totalGoldCostTRY || 0) + (portfolioSummary?.ppfBalanceTRY || 0) + (portfolioSummary?.totalFreeCashTRY || 0),
        costUSD: ((portfolioSummary?.totalGoldCostTRY || 0) + (portfolioSummary?.ppfBalanceTRY || 0) + (portfolioSummary?.totalFreeCashTRY || 0)) / (portfolioSummary?.usdtry || usdtry || 1),
        profitTRY: portfolioSummary?.goldProfitTRY || 0,
        profitUSD: (portfolioSummary?.goldProfitTRY || 0) / (portfolioSummary?.usdtry || usdtry || 1),
        returnPct: (portfolioSummary?.totalGoldCostTRY || 0) > 0 ? ((portfolioSummary?.goldProfitTRY || 0) / portfolioSummary.totalGoldCostTRY) * 100 : 0,
        dayPLTRY: 0,
        dayPLUSD: 0,
        dayPLPct: 0,
        weightPct: 0
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
        weightPct: 0
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

  // Dynamic Timeframe Performance & Benchmark Calculations
  const timeframeDays = {
    '1W': 5,
    '1M': 21,
    '3M': 63,
    '6M': 126,
    'YTD': 180,
    '1Y': 252
  };

  const benchmarkReturns = useMemo(() => {
    const days = timeframeDays[timeframe] || 21;
    const cur = isTRY ? 'try' : 'usd';
    const s = benchmarkData?.normalized_series || {};

    const calcReturn = (key) => {
      const arr = s[`${key}_${cur}`] || s[key];
      if (!arr || arr.length <= days) return 0;
      const start = arr[arr.length - 1 - days];
      const end = arr[arr.length - 1];
      if (!start || start === 0) return 0;
      return Number(((end - start) / start * 100).toFixed(2));
    };

    const equityRet = calcReturn('equity');
    const spRet = calcReturn('SP500');
    const ndxRet = calcReturn('NASDAQ');
    const bistRet = calcReturn('BIST100');
    const goldRet = calcReturn('GOLD');

    return {
      equity: equityRet,
      sp500: spRet,
      nasdaq: ndxRet,
      bist: bistRet,
      gold: goldRet,
      alphaSP: Number((equityRet - spRet).toFixed(2)),
      alphaBIST: Number((equityRet - bistRet).toFixed(2)),
      alphaNDX: Number((equityRet - ndxRet).toFixed(2))
    };
  }, [timeframe, isTRY]);

  // Horizontal Comparative Benchmark Bar Chart
  const benchmarkBarData = {
    labels: [
      'Hisse & ETF Sepetiniz',
      'S&P 500 (^GSPC)',
      'Nasdaq 100 (^NDX)',
      'BIST 100 (XU100)',
      'Altın Ons (GC=F)'
    ],
    datasets: [
      {
        label: `Getiri (${timeframe})`,
        data: [
          benchmarkReturns.equity,
          benchmarkReturns.sp500,
          benchmarkReturns.nasdaq,
          benchmarkReturns.bist,
          benchmarkReturns.gold
        ],
        backgroundColor: [
          '#ef4444',
          '#3b82f6',
          '#a855f7',
          '#06b6d4',
          '#f59e0b'
        ],
        borderRadius: 5,
        borderWidth: [2, 1, 1, 1, 1],
        borderColor: [
          '#ff7878',
          '#60a5fa',
          '#c084fc',
          '#22d3ee',
          '#fbbf24'
        ]
      }
    ]
  };

  const benchmarkBarOptions = {
    indexAxis: 'y', // Horizontal bars for clean text labeling
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#0f172a',
        titleColor: '#e2e8f0',
        borderColor: 'rgba(255,255,255,0.1)',
        borderWidth: 1,
        callbacks: {
          label: (ctx) => ` Getiri: ${ctx.raw >= 0 ? '+' : ''}${ctx.raw}%`
        }
      }
    },
    scales: {
      x: {
        grid: { color: 'rgba(255, 255, 255, 0.05)' },
        ticks: {
          color: '#94a3b8',
          font: { size: 10 },
          callback: (v) => `${v}%`
        }
      },
      y: {
        grid: { display: false },
        ticks: {
          color: '#e2e8f0',
          font: { size: 11, weight: 'bold' }
        }
      }
    }
  };

  // Portfolio-Weighted Snowflake (Kar Tanesi) Radar Calculation
  const weightedSnowflake = useMemo(() => {
    let totalVal = 0;
    let sumFund = 0, sumVal = 0, sumMom = 0, sumTech = 0, sumRisk = 0;

    equityHoldings.forEach(h => {
      const symTicker = (h.ticker || '').toUpperCase();
      const clean = symTicker.replace('.IS', '').replace('-USD', '');
      const sData = stocksData[clean] || stocksData[symTicker];
      const potData = potentialStocksData?.stocks?.find(s => s.ticker === clean);

      const val = isTRY ? (h.valTRY || 0) : (h.valUSD || 0);
      if (val <= 0) return;
      totalVal += val;

      let fund = 82, valP = 75, mom = 80, tech = 78, risk = 76;

      if (sData?.analysis?.pillars) {
        const p = sData.analysis.pillars;
        fund = p.fundamental?.score ?? 82;
        valP = p.valuation?.score ?? 75;
        mom = p.momentum?.score ?? 80;
        tech = p.technical?.score ?? 78;
        risk = p.risk?.score ?? 76;
      } else if (potData) {
        fund = potData.conviction_score >= 90 ? 94 : 88;
        valP = potData.price < potData.target_price * 0.85 ? 84 : 74;
        mom = 88;
        tech = 85;
        risk = 78;
      }

      sumFund += fund * val;
      sumVal += valP * val;
      sumMom += mom * val;
      sumTech += tech * val;
      sumRisk += risk * val;
    });

    if (totalVal <= 0) {
      return {
        fund: 84.0, val: 76.5, mom: 82.0, tech: 80.5, risk: 78.0,
        composite: 80.2
      };
    }

    const fund = Math.round((sumFund / totalVal) * 10) / 10;
    const val = Math.round((sumVal / totalVal) * 10) / 10;
    const mom = Math.round((sumMom / totalVal) * 10) / 10;
    const tech = Math.round((sumTech / totalVal) * 10) / 10;
    const risk = Math.round((sumRisk / totalVal) * 10) / 10;
    const composite = Math.round(((fund + val + mom + tech + risk) / 5) * 10) / 10;

    return { fund, val, mom, tech, risk, composite };
  }, [equityHoldings, isTRY]);

  const snowflakeTheme = getHealthColorTheme(weightedSnowflake.composite);

  const snowflakeChartData = {
    labels: ['Temel Bilanço', 'Değerleme', 'Momentum', 'Teknik Yapı', 'Risk Profil'],
    datasets: [
      {
        label: 'Hisse-ETF Sepet Profili',
        data: [
          weightedSnowflake.fund,
          weightedSnowflake.val,
          weightedSnowflake.mom,
          weightedSnowflake.tech,
          weightedSnowflake.risk
        ],
        backgroundColor: snowflakeTheme.bgRgba,
        borderColor: snowflakeTheme.color,
        borderWidth: 2.2,
        pointBackgroundColor: snowflakeTheme.pointBg,
        pointBorderColor: '#ffffff',
        pointHoverBackgroundColor: '#ffffff',
        pointHoverBorderColor: snowflakeTheme.color,
        pointRadius: 4
      }
    ]
  };

  const snowflakeChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#0f172a',
        callbacks: {
          label: (ctx) => `${ctx.label}: ${ctx.raw} / 100 Puan`
        }
      }
    },
    scales: {
      r: {
        angleLines: { color: 'rgba(255, 255, 255, 0.08)' },
        grid: { color: 'rgba(255, 255, 255, 0.08)' },
        pointLabels: {
          color: '#e2e8f0',
          font: { size: 9.5, weight: 'bold' }
        },
        ticks: {
          display: false,
          min: 0,
          max: 100,
          stepSize: 20
        },
        suggestedMin: 0,
        suggestedMax: 100
      }
    }
  };

  // Consolidated Total Portfolio Snowflake (Tüm Portföy Kar Tanesi) Calculation
  const totalSnowflake = useMemo(() => {
    const totalVal = portfolioSummary?.totalValTRY || 1;
    const eqVal = segmentStats.equity.valTRY || 0;
    const goldVal = portfolioSummary?.totalGoldValTRY || 0;
    const ppfVal = portfolioSummary?.ppfBalanceTRY || 0;
    const cashVal = portfolioSummary?.totalFreeCashTRY || 0;
    const shieldTotalVal = goldVal + ppfVal + cashVal; // Total defensive liquidity & gold
    const cryptoVal = segmentStats.crypto.valTRY || 0;

    const eqPct = totalVal > 0 ? (eqVal / totalVal) * 100 : 0;
    const goldPct = totalVal > 0 ? (goldVal / totalVal) * 100 : 0;
    const cashPpfPct = totalVal > 0 ? ((ppfVal + cashVal) / totalVal) * 100 : 0;
    const totalDefensivePct = totalVal > 0 ? (shieldTotalVal / totalVal) * 100 : 0;
    const cryptoPct = totalVal > 0 ? (cryptoVal / totalVal) * 100 : 0;

    // 1. Varlık Dağılımı & Çeşitlendirme (Asset Diversification)
    let allocScore = 85;
    if (eqPct >= 40 && eqPct <= 75 && totalDefensivePct >= 15 && totalDefensivePct <= 45) {
      allocScore = 95;
    } else if (eqPct > 85) {
      allocScore = Math.max(55, 90 - (eqPct - 85) * 2.2);
    } else if (totalDefensivePct > 65) {
      allocScore = Math.max(65, 88 - (totalDefensivePct - 65) * 1.5);
    } else if (cryptoPct > 25) {
      allocScore = Math.max(50, 85 - (cryptoPct - 25) * 2.5);
    } else {
      allocScore = 82;
    }

    // 2. Kalkan & Likidite Güvencesi (Defensive Shield & Cash Cushion)
    let shieldScore = 80;
    if (totalDefensivePct >= 20 && totalDefensivePct <= 35) {
      shieldScore = 96;
    } else if (totalDefensivePct >= 15 && totalDefensivePct < 20) {
      shieldScore = 88;
    } else if (totalDefensivePct >= 10 && totalDefensivePct < 15) {
      shieldScore = 78;
    } else if (totalDefensivePct < 10) {
      shieldScore = Math.max(45, 52 + totalDefensivePct * 2.5);
    } else {
      shieldScore = Math.max(75, 96 - (totalDefensivePct - 35) * 0.7);
    }

    // 3. Varlık Kalitesi (Consolidated Asset Quality & Quant Balance)
    const eqQuality = weightedSnowflake.composite || 80;
    const goldQuality = 94; // Sovereign hedge & capital preservation
    const cashQuality = 92; // Liquid risk-free yield
    const cryptoQuality = 72; // Volatility discount
    const sumWeightedQuality = (eqVal * eqQuality) + (goldVal * goldQuality) + ((ppfVal + cashVal) * cashQuality) + (cryptoVal * cryptoQuality);
    const qualityScore = totalVal > 0 ? Math.round((sumWeightedQuality / totalVal) * 10) / 10 : 85;

    // 4. Düşüş Direnci & Risk Koruması (Crash & Drawdown Protection)
    const eqRisk = weightedSnowflake.risk || 75;
    const defensiveBoost = Math.min(20, totalDefensivePct * 0.65);
    const riskScore = Math.min(97, Math.round((eqRisk * 0.72 + 22 + defensiveBoost) * 10) / 10);

    // 5. Getiri & Büyüme İvmesi (Consolidated Return Momentum)
    const totalReturn = portfolioSummary?.unrealizedReturnPct || 0;
    const dayPLPct = portfolioSummary?.dayPLPct || 0;
    let returnScore = 78;
    if (totalReturn >= 35) returnScore = 95;
    else if (totalReturn >= 20) returnScore = 89;
    else if (totalReturn >= 10) returnScore = 84;
    else if (totalReturn >= 0) returnScore = 78;
    else if (totalReturn >= -10) returnScore = 68;
    else returnScore = Math.max(45, 60 + totalReturn);

    if (dayPLPct > 0.5) returnScore = Math.min(98, returnScore + 3);
    else if (dayPLPct < -1.0) returnScore = Math.max(45, returnScore - 3);

    const composite = Math.round(((allocScore + shieldScore + qualityScore + riskScore + returnScore) / 5) * 10) / 10;

    return {
      alloc: Math.round(allocScore * 10) / 10,
      shield: Math.round(shieldScore * 10) / 10,
      quality: Math.round(qualityScore * 10) / 10,
      risk: Math.round(riskScore * 10) / 10,
      return: Math.round(returnScore * 10) / 10,
      composite,
      eqPct: Math.round(eqPct * 10) / 10,
      goldPct: Math.round(goldPct * 10) / 10,
      cashPpfPct: Math.round(cashPpfPct * 10) / 10,
      totalDefensivePct: Math.round(totalDefensivePct * 10) / 10,
      shieldTotalVal: isTRY ? shieldTotalVal : (usdtry > 0 ? shieldTotalVal / usdtry : 0),
      eqVal: isTRY ? eqVal : (usdtry > 0 ? eqVal / usdtry : 0),
      liquidCashVal: isTRY ? (ppfVal + cashVal) : (usdtry > 0 ? (ppfVal + cashVal) / usdtry : 0),
      goldVal: isTRY ? goldVal : (usdtry > 0 ? goldVal / usdtry : 0)
    };
  }, [portfolioSummary, segmentStats, weightedSnowflake, isTRY, usdtry]);

  const totalSnowflakeTheme = getHealthColorTheme(totalSnowflake.composite);

  const totalSnowflakeChartData = {
    labels: ['Varlık Dağılımı', 'Zırh & Likidite', 'Varlık Kalitesi', 'Düşüş Koruması', 'Getiri İvmesi'],
    datasets: [
      {
        label: 'Tüm Portföy Konsolide Profili',
        data: [
          totalSnowflake.alloc,
          totalSnowflake.shield,
          totalSnowflake.quality,
          totalSnowflake.risk,
          totalSnowflake.return
        ],
        backgroundColor: totalSnowflakeTheme.bgRgba,
        borderColor: totalSnowflakeTheme.color,
        borderWidth: 2.2,
        pointBackgroundColor: totalSnowflakeTheme.pointBg,
        pointBorderColor: '#ffffff',
        pointHoverBackgroundColor: '#ffffff',
        pointHoverBorderColor: totalSnowflakeTheme.color,
        pointRadius: 4
      }
    ]
  };

  // =========================================================================
  // 🛡️ FİNVEST KURUMSAL RÖNTGENİ: 3-HALKA, BUYBACK & SERMAYE KALKANI PROFİLLERİ
  // =========================================================================
  const FINVEST_PROFILES = {
    AAPL: {
      ring: 1,
      ringLabel: '1. Halka: Nakit Kalesi',
      ringBadge: 'emerald',
      netBuybackYield: 2.85,
      dividendYield: 0.50,
      totalShareholderYield: 3.35,
      solvencyScore: 94,
      debtToEquity: 167.7,
      diagnosis: 'Yıllık $100B+ FCF üreten nakit devi; hisse adedini her yıl eriterek yatırımcı kâr payını bileşik artırır.'
    },
    GOOGL: {
      ring: 1,
      ringLabel: '1. Halka: Nakit Kalesi',
      ringBadge: 'emerald',
      netBuybackYield: 2.40,
      dividendYield: 0.45,
      totalShareholderYield: 2.85,
      solvencyScore: 98,
      debtToEquity: 9.1,
      diagnosis: 'Arama ve bulut nakit akışıyla $50B+ AI Capex harcamasını borçsuz finanse ederken $60B+ hisse geri alımı yapar.'
    },
    NVDA: {
      ring: 1,
      ringLabel: '1. Halka: Nakit Kalesi',
      ringBadge: 'emerald',
      netBuybackYield: 1.30,
      dividendYield: 0.06,
      totalShareholderYield: 1.36,
      solvencyScore: 96,
      debtToEquity: 14.3,
      diagnosis: 'Yapay zeka çip tekelinin rekor FCF nakit akışı; borçsuz bilanço ve $50B onaylı dev hisse geri alım programı.'
    },
    MSFT: {
      ring: 1,
      ringLabel: '1. Halka: Nakit Kalesi',
      ringBadge: 'emerald',
      netBuybackYield: 1.05,
      dividendYield: 0.75,
      totalShareholderYield: 1.80,
      solvencyScore: 95,
      debtToEquity: 27.9,
      diagnosis: 'Azure ve kurumsal yazılım kârlılığıyla sıfır likidite riski; düzenli temettü artışı ve $60B yeni geri alım yetkisi.'
    },
    AMZN: {
      ring: 1,
      ringLabel: '1. Halka: Nakit Kalesi',
      ringBadge: 'emerald',
      netBuybackYield: -0.40,
      dividendYield: 0.00,
      totalShareholderYield: -0.40,
      solvencyScore: 92,
      debtToEquity: 33.5,
      diagnosis: 'AWS ve lojistikten gelen $110B OCF ile yatırımlarını rahatlıkla karşılar; kâr dağıtımı yerine yeniden yatırım öncelikli.'
    },
    TUPRS: {
      ring: 1,
      ringLabel: '1. Halka: Nakit & Temettü Kalesi',
      ringBadge: 'emerald',
      netBuybackYield: 0.00,
      dividendYield: 7.80,
      totalShareholderYield: 7.80,
      solvencyScore: 95,
      debtToEquity: 28.4,
      diagnosis: 'BIST rafineri devi; net nakit pozisyonu, sıfır seyrelme ve %7.8 rekor nakit temettü güvencesi.'
    },
    FROTO: {
      ring: 1,
      ringLabel: '1. Halka: Nakit & Temettü Kalesi',
      ringBadge: 'emerald',
      netBuybackYield: 0.00,
      dividendYield: 5.60,
      totalShareholderYield: 5.60,
      solvencyScore: 88,
      debtToEquity: 76.3,
      diagnosis: 'Yüksek ihracat gelirleri ve güçlü operasyonel nakit üretimiyle hissedarına %5.6 nakit temettü getirisi sunar.'
    },
    VRT: {
      ring: 2,
      ringLabel: '2. Halka: Kritik Tedarikçi',
      ringBadge: 'amber',
      netBuybackYield: 0.25,
      dividendYield: 0.15,
      totalShareholderYield: 0.40,
      solvencyScore: 82,
      debtToEquity: 110.5,
      diagnosis: 'Veri merkezlerinin kritik soğutma lideri; 1. Halka devlerinin harcadığı Capex doğrudan Vertiv cirosuna dönüşür.'
    },
    TSM: {
      ring: 2,
      ringLabel: '2. Halka: Kritik Altyapı Dökümhanesi',
      ringBadge: 'amber',
      netBuybackYield: 0.00,
      dividendYield: 1.40,
      totalShareholderYield: 1.40,
      solvencyScore: 94,
      debtToEquity: 25.4,
      diagnosis: 'Dünyanın en kritik çip dökümhanesi; $30B+ Capex harcamasına rağmen net nakit pozisyonunu koruyan kilit tekel.'
    },
    THYAO: {
      ring: 2,
      ringLabel: '2. Halka: Stratejik Büyüme & Filo',
      ringBadge: 'amber',
      netBuybackYield: 0.00,
      dividendYield: 0.00,
      totalShareholderYield: 0.00,
      solvencyScore: 78,
      debtToEquity: 69.6,
      diagnosis: 'Sabit hisse sermayesiyle sulandırmadan kaçınmış, filo genişlemesini operasyonel döviz nakit akışıyla fonlayan havacılık devi.'
    },
    EREGL: {
      ring: 2,
      ringLabel: '2. Halka: Yüksek Capex Döngüsü',
      ringBadge: 'amber',
      netBuybackYield: 0.00,
      dividendYield: 2.20,
      totalShareholderYield: 2.20,
      solvencyScore: 75,
      debtToEquity: 45.1,
      diagnosis: 'Yeşil çelik yatırımları nedeniyle yoğun Capex döneminde; sağlam özkaynak tabanı kaldıraç riskini dengeliyor.'
    },
    ABBV: {
      ring: 2,
      ringLabel: '2. Halka: Temettü Aristokratı',
      ringBadge: 'amber',
      netBuybackYield: 0.80,
      dividendYield: 3.45,
      totalShareholderYield: 4.25,
      solvencyScore: 85,
      debtToEquity: 180.0,
      diagnosis: 'Biyofarma nakit devi; düzenli hisse geri alımı ve %3.45 temettüyle kurumsal hissedar dostu sermaye tahsisi.'
    },
    DRAM: {
      ring: 2,
      ringLabel: '2. Halka: Bellek & Altyapı ETF',
      ringBadge: 'amber',
      netBuybackYield: 0.50,
      dividendYield: 1.20,
      totalShareholderYield: 1.70,
      solvencyScore: 90,
      debtToEquity: 35.0,
      diagnosis: 'AI donanım ve yarı iletken altyapı fonu; bileşen şirketlerin güçlü bilançolarından beslenir.'
    },
    SPCX: {
      ring: 2,
      ringLabel: '2. Halka: Uzay & İleri Altyapı ETF',
      ringBadge: 'amber',
      netBuybackYield: 0.00,
      dividendYield: 0.00,
      totalShareholderYield: 0.00,
      solvencyScore: 75,
      debtToEquity: 60.0,
      diagnosis: 'Yeni nesil uzay teknolojisi ve uydu altyapısı fonu; sermaye büyümesi odaklı büyüme sepeti.'
    },
    QQQ: {
      ring: 1,
      ringLabel: '1. Halka: Nasdaq 100 Titanları',
      ringBadge: 'emerald',
      netBuybackYield: 1.85,
      dividendYield: 0.55,
      totalShareholderYield: 2.40,
      solvencyScore: 95,
      debtToEquity: 30.0,
      diagnosis: 'Ağırlığı %50+ 1. Halka nakit zenginlerinden (MSFT, NVDA, AAPL, GOOGL, AMZN) oluşan mega teknoloji fonu.'
    },
    SPY: {
      ring: 1,
      ringLabel: '1. Halka: S&P 500 Çekirdek',
      ringBadge: 'emerald',
      netBuybackYield: 1.60,
      dividendYield: 1.25,
      totalShareholderYield: 2.85,
      solvencyScore: 92,
      debtToEquity: 40.0,
      diagnosis: 'ABD kurumsal kârlılığının amiral gemisi; hisse geri alımları ve temettü ile düzenli hissedar getirisi üretir.'
    },
    AFT: {
      ring: 1,
      ringLabel: '1. Halka: Teknoloji Titanları Fonu',
      ringBadge: 'emerald',
      netBuybackYield: 1.50,
      dividendYield: 0.00,
      totalShareholderYield: 1.50,
      solvencyScore: 94,
      debtToEquity: 30.0,
      diagnosis: 'Ak Portföy Yeni Teknolojiler; portföyünün %80+ kısmı 1. Halka mega-cap nakit titanlarında toplanmıştır.'
    },
    YAY: {
      ring: 1,
      ringLabel: '1. Halka: Yabancı Teknoloji Fonu',
      ringBadge: 'emerald',
      netBuybackYield: 1.50,
      dividendYield: 0.00,
      totalShareholderYield: 1.50,
      solvencyScore: 94,
      debtToEquity: 30.0,
      diagnosis: 'Yapı Kredi Yabancı Teknoloji; küresel nakit akışı zengini lider teknoloji şirketlerine yatırım yapar.'
    },
    ORCL: {
      ring: 3,
      ringLabel: '3. Halka: Borçla Büyüyenler',
      ringBadge: 'red',
      netBuybackYield: -0.65,
      dividendYield: 1.15,
      totalShareholderYield: 0.50,
      solvencyScore: 48,
      debtToEquity: 697.5,
      diagnosis: 'Stratejik Borç İncelemesi: AI veri merkezi Capex harcamaları nakit akışını aşıyor; $86B borç ve hisse basımıyla hissedar seyreltildi.'
    },
    SOFI: {
      ring: 3,
      ringLabel: '3. Halka: Yüksek Seyrelme (SBC)',
      ringBadge: 'red',
      netBuybackYield: -2.90,
      dividendYield: 0.00,
      totalShareholderYield: -2.90,
      solvencyScore: 60,
      debtToEquity: 85.0,
      diagnosis: 'Büyüme primleri nedeniyle yüksek hisse seyreltmesi (SBC); hissedarın ortaklık payını sulandıran sermaye yapısı.'
    },
    BYDNR: {
      ring: 3,
      ringLabel: '3. Halka: Büyüme & Borç Kaldıracı',
      ringBadge: 'red',
      netBuybackYield: 0.00,
      dividendYield: 0.00,
      totalShareholderYield: 0.00,
      solvencyScore: 65,
      debtToEquity: 145.0,
      diagnosis: 'Gıda ve perakende restoran genişlemesini işletme sermayesi ve kredi kaldıracıyla sürdüren büyüme şirketi.'
    },
    ALAB: {
      ring: 2,
      ringLabel: '2. Halka: Kritik AI Altyapısı',
      ringBadge: 'amber',
      netBuybackYield: -1.20,
      dividendYield: 0.00,
      totalShareholderYield: -1.20,
      solvencyScore: 88,
      debtToEquity: 8.2,
      diagnosis: 'AI PCIe & Retimer bağlantı tekel adayı; borçsuz bilanço ve yüksek nakit rezerviyle güçlü büyüme.'
    },
    CAMT: {
      ring: 2,
      ringLabel: '2. Halka: İleri Paketleme & Muayene',
      ringBadge: 'amber',
      netBuybackYield: 0.80,
      dividendYield: 1.10,
      totalShareholderYield: 1.90,
      solvencyScore: 94,
      debtToEquity: 2.4,
      diagnosis: 'Yüksek bant genişlikli bellek (HBM) ve gelişmiş çip paketleme muayenesi; net nakit zengini, borçsuz bilanço.'
    },
    XOM: {
      ring: 1,
      ringLabel: '1. Halka: Nakit & Temettü Kalesi',
      ringBadge: 'emerald',
      netBuybackYield: 2.90,
      dividendYield: 3.40,
      totalShareholderYield: 6.30,
      solvencyScore: 94,
      debtToEquity: 18.2,
      diagnosis: 'Küresel petrol ve rafinaj devi; rekor serbest nakit akışı, güçlü temettü ve dev hisse geri alımı.'
    },
    BTC: {
      ring: 1,
      ringLabel: '1. Halka: Dijital Rezerv Varlık',
      ringBadge: 'emerald',
      netBuybackYield: 0.00,
      dividendYield: 0.00,
      totalShareholderYield: 0.00,
      solvencyScore: 98,
      debtToEquity: 0.0,
      diagnosis: 'Sıfır karşı taraf riski ve 21M sabit arz; borçsuz, küresel likidite ve enflasyon kalkanı.'
    },
    ETH: {
      ring: 1,
      ringLabel: '1. Halka: Akıllı Sözleşme Rezervi',
      ringBadge: 'emerald',
      netBuybackYield: 0.50,
      dividendYield: 3.20,
      totalShareholderYield: 3.70,
      solvencyScore: 95,
      debtToEquity: 0.0,
      diagnosis: 'Proof-of-Stake staking getirisi ve yakım mekanizmasıyla deflasyonist dijital sermaye kalkanı.'
    },
    XAUT: {
      ring: 1,
      ringLabel: '1. Halka: İsviçre Kasası Altın Zırhı',
      ringBadge: 'emerald',
      netBuybackYield: 0.00,
      dividendYield: 0.00,
      totalShareholderYield: 0.00,
      solvencyScore: 99,
      debtToEquity: 0.0,
      diagnosis: 'İsviçre kasalarında saklanan 1:1 fiziksel külçe altın teminatlı, sıfır borçlu dokunulmaz kriz kalkanı.'
    },
    GRAM_ALTIN: {
      ring: 1,
      ringLabel: '1. Halka: Dokunulmaz Kur Kalkanı',
      ringBadge: 'emerald',
      netBuybackYield: 0.00,
      dividendYield: 0.00,
      totalShareholderYield: 0.00,
      solvencyScore: 100,
      debtToEquity: 0.0,
      diagnosis: 'Fiziki / Banka gram altın; sıfır borç riski ve Türk Lirası değer kaybına karşı tam korumalı güvenli liman.'
    },
    ARKM: {
      ring: 3,
      ringLabel: '3. Halka: On-Chain İstihbarat',
      ringBadge: 'red',
      netBuybackYield: -4.50,
      dividendYield: 0.00,
      totalShareholderYield: -4.50,
      solvencyScore: 62,
      debtToEquity: 0.0,
      diagnosis: 'Blokzincir analitiği ve istihbarat platformu; token kilit açılımları nedeniyle seyrelme riski taşır.'
    },
    BIO: {
      ring: 3,
      ringLabel: '3. Halka: DeSci Biyoteknoloji',
      ringBadge: 'red',
      netBuybackYield: -5.00,
      dividendYield: 0.00,
      totalShareholderYield: -5.00,
      solvencyScore: 58,
      debtToEquity: 0.0,
      diagnosis: 'Merkeziyetsiz bilim (DeSci) biyofarma hızlandırıcısı; erken aşama Ar-Ge token ekonomisi.'
    },
    DOGE: {
      ring: 3,
      ringLabel: '3. Halka: Topluluk & Likidite',
      ringBadge: 'red',
      netBuybackYield: -3.80,
      dividendYield: 0.00,
      totalShareholderYield: -3.80,
      solvencyScore: 50,
      debtToEquity: 0.0,
      diagnosis: 'Yıllık 5 milyar yeni coin arzı ile sürekli enflasyonist seyrelme yapısına sahip topluluk varlığı.'
    },
    OP: {
      ring: 3,
      ringLabel: '3. Halka: Katman-2 Altyapı',
      ringBadge: 'red',
      netBuybackYield: -4.00,
      dividendYield: 0.00,
      totalShareholderYield: -4.00,
      solvencyScore: 68,
      debtToEquity: 0.0,
      diagnosis: 'Optimism rollup altyapısı; token teşvikleri ve kilit açılışları nedeniyle arz artışı izlenmelidir.'
    },
    SUI: {
      ring: 3,
      ringLabel: '3. Halka: Katman-1 Büyüme',
      ringBadge: 'red',
      netBuybackYield: -6.50,
      dividendYield: 0.00,
      totalShareholderYield: -6.50,
      solvencyScore: 66,
      debtToEquity: 0.0,
      diagnosis: 'Yeni nesil yüksek TPS blokzincir; erken dönem token ihraçları ve ekosistem sübvansiyonları yüksektir.'
    }
  };

  const getFinvestHoldingData = (ticker, holding, sData, potData) => {
    const rawClean = (ticker || '').toUpperCase().trim();
    const clean = rawClean.replace('.IS', '').replace('-USD', '').replace('USDT', '');
    if (FINVEST_PROFILES[clean]) return { ...FINVEST_PROFILES[clean], clean, isVerified: true };
    if (FINVEST_PROFILES[rawClean]) return { ...FINVEST_PROFILES[rawClean], clean: rawClean, isVerified: true };

    const fundScore = sData?.analysis?.pillars?.fundamental?.score ?? 78;
    const dToE = Number(sData?.analysis?.pillars?.fundamental?.debt_to_equity) || 55;

    let ring = 2;
    let ringLabel = '2. Halka: Kritik Tedarikçi / Dengeli';
    let ringBadge = 'amber';
    let diagnosis = 'Dengeli bilanço yapısıyla sektör talebini nakde çeviren ve makul borçlulukla büyüyen şirket.';

    if (fundScore >= 82 && dToE < 50) {
      ring = 1;
      ringLabel = '1. Halka: Nakit Kalesi';
      ringBadge = 'emerald';
      diagnosis = 'Düşük borçluluk ve güçlü özkaynak yapısıyla kendi organik nakit akışıyla büyüyen nakit kalesi.';
    } else if (fundScore < 65 || dToE > 160) {
      ring = 3;
      ringLabel = '3. Halka: Borçla Büyüyenler';
      ringBadge = 'red';
      diagnosis = 'Yüksek kaldıraçlı bilanço veya hisse seyrelmesi; yatırımlar borçlanmayla finanse edilmekte.';
    }

    const netBuybackYield = ring === 1 ? 1.20 : (ring === 3 ? -1.10 : 0.00);
    const dividendYield = sData?.metrics?.dividend_yield ? Number(sData.metrics.dividend_yield) : (holding?.currency === 'TRY' ? 2.50 : 0.80);
    const totalShareholderYield = Number((netBuybackYield + dividendYield).toFixed(2));
    const solvencyScore = Math.min(98, Math.max(40, Math.round(fundScore * 0.95 + (ring === 1 ? 12 : (ring === 3 ? -15 : 0)))));

    return {
      clean,
      ring,
      ringLabel,
      ringBadge,
      netBuybackYield,
      dividendYield,
      totalShareholderYield,
      solvencyScore,
      debtToEquity: dToE,
      diagnosis
    };
  };

  // Portfolio-Weighted Finvest Analysis
  const portfolioFinvestAnalysis = useMemo(() => {
    let totalEquityVal = 0;
    let ring1Val = 0, ring2Val = 0, ring3Val = 0;
    let sumShareholderYield = 0;
    let sumBuybackYield = 0;
    let sumDividendYield = 0;
    let sumSolvency = 0;
    let sumDebtToEquity = 0;

    const itemMap = {};
    const ring1Tickers = [];
    const ring2Tickers = [];
    const ring3Tickers = [];

    equityHoldings.forEach(h => {
      const sym = (h.ticker || '').toUpperCase();
      const clean = sym.replace('.IS', '').replace('-USD', '');
      const sData = stocksData[clean] || stocksData[sym];
      const potData = potentialStocksData?.stocks?.find(s => s.ticker === clean);

      const fData = getFinvestHoldingData(clean, h, sData, potData);
      itemMap[h.id || clean] = fData;
      itemMap[clean] = fData;
      itemMap[sym] = fData;

      const val = isTRY ? (h.valTRY || 0) : (h.valUSD || 0);
      if (val <= 0) return;
      totalEquityVal += val;

      if (fData.ring === 1) {
        ring1Val += val;
        ring1Tickers.push(clean);
      } else if (fData.ring === 2) {
        ring2Val += val;
        ring2Tickers.push(clean);
      } else {
        ring3Val += val;
        ring3Tickers.push(clean);
      }

      sumShareholderYield += fData.totalShareholderYield * val;
      sumBuybackYield += fData.netBuybackYield * val;
      sumDividendYield += fData.dividendYield * val;
      sumSolvency += fData.solvencyScore * val;
      sumDebtToEquity += fData.debtToEquity * val;
    });

    const divisor = totalEquityVal > 0 ? totalEquityVal : 1;
    const ring1Weight = totalEquityVal > 0 ? (ring1Val / divisor) * 100 : 65.0;
    const ring2Weight = totalEquityVal > 0 ? (ring2Val / divisor) * 100 : 25.0;
    const ring3Weight = totalEquityVal > 0 ? (ring3Val / divisor) * 100 : 10.0;

    const weightedShareholderYield = totalEquityVal > 0 ? Math.round((sumShareholderYield / divisor) * 100) / 100 : 2.45;
    const weightedBuybackYield = totalEquityVal > 0 ? Math.round((sumBuybackYield / divisor) * 100) / 100 : 1.35;
    const weightedDividendYield = totalEquityVal > 0 ? Math.round((sumDividendYield / divisor) * 100) / 100 : 1.10;
    const weightedSolvencyScore = totalEquityVal > 0 ? Math.round(sumSolvency / divisor) : 91;
    const weightedDebtToEquity = totalEquityVal > 0 ? Math.round((sumDebtToEquity / divisor) * 10) / 10 : 38.5;

    let ringSummaryBadge = 'emerald';
    let ringSummaryTitle = 'TAM KORUMALI NAKİT KALESİ';
    let ringSummaryDesc = `Portföyünüzün %${ring1Weight.toFixed(1)}'i devasa serbest nakit akışıyla (FCF) kendi yatırımlarını borçsuz finanse eden 1. Halka titanlarından oluşuyor. Yapay zeka borç balonu ve yüksek faiz riskine karşı en dayanıklı zırha sahipsiniz.`;

    if (ring3Weight > 25.0) {
      ringSummaryBadge = 'red';
      ringSummaryTitle = 'BORÇ BALONU DUYARLILIĞI UYARISI';
      ringSummaryDesc = `Portföyünüzün %${ring3Weight.toFixed(1)}'i yüksek kaldıraç veya hisse seyrelmesi (SBC) taşıyan 3. Halka şirketlerinde bulunmaktadır. Faiz indirimi gecikmelerine karşı temkinli olunmalıdır.`;
    } else if (ring2Weight > 45.0) {
      ringSummaryBadge = 'amber';
      ringSummaryTitle = 'KRİTİK ALTYAPI & CAPEX DÖNGÜSÜ';
      ringSummaryDesc = `Portföyünüz %${ring2Weight.toFixed(1)} ile büyük oranda veri merkezi ve çip altyapı tedarikçilerinden besleniyor; büyük titanların Capex harcamaları doğrudan cironuza katkı sağlıyor.`;
    }

    return {
      itemMap,
      totalEquityVal,
      ring1Val,
      ring2Val,
      ring3Val,
      ring1Weight,
      ring2Weight,
      ring3Weight,
      ring1Tickers: [...new Set(ring1Tickers)],
      ring2Tickers: [...new Set(ring2Tickers)],
      ring3Tickers: [...new Set(ring3Tickers)],
      weightedShareholderYield,
      weightedBuybackYield,
      weightedDividendYield,
      weightedSolvencyScore,
      weightedDebtToEquity,
      ringSummaryBadge,
      ringSummaryTitle,
      ringSummaryDesc
    };
  }, [equityHoldings, isTRY]);

  // Akıllı Rotasyon Pusulası & Varlık Sayısı Disiplini (Pairs Rotation: 1-Çıkar ➔ 1-Ekle)
  const rotationAnalysis = useMemo(() => {
    const equityCount = equityHoldings.length;
    const maxCeiling = 16;
    const isAtLimit = equityCount >= 14;
    const isOverLimit = equityCount >= 18;

    // 1. Zayıf hisseyi tespit et (Düşük Solvency, 3. Halka veya en zayıf PnL)
    const scoredList = [...equityHoldings].map(h => {
      const sym = (h.ticker || '').toUpperCase();
      const clean = sym.replace('.IS', '').replace('-USD', '');
      const fData = portfolioFinvestAnalysis.itemMap[h.id || clean] || { ring: 2, solvencyScore: 70, totalShareholderYield: 0 };
      const pnl = h.returnPct || 0;
      const compositeScore = (fData.solvencyScore || 70) * 0.4 + (fData.ring === 1 ? 40 : (fData.ring === 2 ? 20 : 0)) + Math.min(20, Math.max(-20, pnl));
      return {
        ...h,
        clean,
        ring: fData.ring,
        solvencyScore: fData.solvencyScore,
        yieldTotal: fData.totalShareholderYield,
        pnl,
        compositeScore
      };
    }).sort((a, b) => a.compositeScore - b.compositeScore);

    const weakestStock = scoredList.length > 0 ? scoredList[0] : null;

    // 2. Portföyde bulunmayan en güçlü 1. Halka titanını bul
    const heldCleanSet = new Set(equityHoldings.map(h => (h.ticker || '').toUpperCase().replace('.IS', '').replace('-USD', '')));
    
    const titanPool = [
      { ticker: 'GOOGL', name: 'Alphabet (Google)', market: 'US', ring: 1, solvency: 98, reason: '1. Halka Nakit Titanı, $130M+ net nakit rezervi, yüksek FCF büyümesi' },
      { ticker: 'NVDA', name: 'Nvidia Corp.', market: 'US', ring: 1, solvency: 96, reason: 'Yapay zeka pazar lideri, %55+ serbest nakit akışı marjı' },
      { ticker: 'MSFT', name: 'Microsoft Corp.', market: 'US', ring: 1, solvency: 97, reason: 'Bulut tekeli, AAA kredi notu ve düzenli temettü/buyback' },
      { ticker: 'TUPRS', name: 'Tüpraş', market: 'BIST', ring: 1, solvency: 94, reason: 'Yüksek temettü verimi, ihracat kalkanı ve güçlü operasyonel nakit' },
      { ticker: 'THYAO', name: 'Türk Hava Yolları', market: 'BIST', ring: 2, solvency: 88, reason: 'Küresel kargo ve yolcu lideri, 4.5x F/K iskontolu değerleme' },
      { ticker: 'FROTO', name: 'Ford Otosan', market: 'BIST', ring: 1, solvency: 92, reason: 'Avrupa ticari araç lideri, düzenli temettü & FCF üretimi' },
      { ticker: 'SMH', name: 'VanEck Semiconductor ETF', market: 'ETF', ring: 2, solvency: 92, reason: 'Küresel çip devleri sepeti' },
      { ticker: 'QQQ', name: 'Invesco QQQ Trust', market: 'ETF', ring: 1, solvency: 95, reason: 'Nasdaq 100 teknoloji kaleleri' }
    ];

    const bestTarget = titanPool.find(t => !heldCleanSet.has(t.ticker)) || titanPool[0];

    return {
      equityCount,
      maxCeiling,
      isAtLimit,
      isOverLimit,
      weakestStock,
      bestTarget,
      statusBadge: isOverLimit ? '🔴 Aşırı Dağılma' : (isAtLimit ? '🟡 Tavan Sınırı (Rotasyon Önerilir)' : '🟢 Optimal Sweet Spot'),
      statusBadgeClass: isOverLimit ? 'red' : (isAtLimit ? 'amber' : 'emerald'),
      adviceText: isOverLimit 
        ? `${equityCount} Hisse/ETF ile portföy getirisi seyreltilmektedir. En zayıf halkayı satıp 12-16 aralığına konsolide olun.`
        : isAtLimit
        ? `${equityCount} Hisse/ETF ile tavan sınırına (14-16) ulaşıldı. Yeni nakit eklemek yerine zayıfı güçlüyle değiştirin.`
        : `${equityCount} Hisse/ETF ile odaklanma ve takip edilebilirlik mükemmel seviyededir. (Kripto ve Altın hariçtir)`
    };
  }, [equityHoldings, portfolioFinvestAnalysis]);

  // Sector & Thematic Concentration Analysis
  const sectorConcentration = useMemo(() => {
    const totalVal = portfolioSummary?.totalValTRY || 1;
    const totals = {};

    Object.keys(SECTOR_DEFINITIONS).forEach(k => {
      totals[k] = {
        ...SECTOR_DEFINITIONS[k],
        valTRY: 0,
        valUSD: 0,
        tickers: []
      };
    });

    holdings.forEach(h => {
      const sym = (h.ticker || '').toUpperCase();
      const clean = sym.replace('.IS', '').replace('-USD', '');
      const sec = getTickerSector(sym, h.type);
      const val = h.valTRY || 0;
      if (totals[sec.id]) {
        totals[sec.id].valTRY += val;
        totals[sec.id].valUSD += (usdtry > 0 ? val / usdtry : 0);
        totals[sec.id].tickers.push(clean);
      }
    });

    const physicalGoldValTRY = portfolioSummary?.totalGoldValTRY || 0;
    if (physicalGoldValTRY > 0 && totals.gold_shield) {
      totals.gold_shield.valTRY += physicalGoldValTRY;
      totals.gold_shield.valUSD += (usdtry > 0 ? physicalGoldValTRY / usdtry : 0);
      totals.gold_shield.tickers.push('Fiziki Gram');
    }

    const ppfAndCashTRY = (portfolioSummary?.ppfBalanceTRY || 0) + (portfolioSummary?.totalFreeCashTRY || 0);
    if (ppfAndCashTRY > 0 && totals.cash_liquid) {
      totals.cash_liquid.valTRY += ppfAndCashTRY;
      totals.cash_liquid.valUSD += (usdtry > 0 ? ppfAndCashTRY / usdtry : 0);
      totals.cash_liquid.tickers.push('PPF & Nakit');
    }

    return Object.values(totals)
      .filter(s => s.valTRY > 0)
      .map(s => {
        const weight = totalVal > 0 ? (s.valTRY / totalVal) * 100 : 0;
        const delta = weight - s.targetCapPct;
        const targetPct = s.targetCapPct || 1;
        const progressRatio = Math.round((weight / targetPct) * 100);
        const isBreached = delta > 0.5;
        const isWarning = delta > -1.5 && delta <= 0.5;
        return {
          ...s,
          weight,
          delta,
          progressRatio,
          isBreached,
          isWarning
        };
      })
      .sort((a, b) => b.weight - a.weight);
  }, [holdings, portfolioSummary, usdtry]);

  // Rebalance Assistant List with Single Stock Cap & Sector Cap Rules
  const totalValAll = portfolioSummary?.totalValTRY || 1;
  const rebalanceList = useMemo(() => {
    const sectorWeightMap = {};
    sectorConcentration.forEach(s => {
      sectorWeightMap[s.id] = s.weight;
    });

    const softCap = DEFAULT_CONCENTRATION_LIMITS.SINGLE_STOCK_SOFT_CAP_PCT; // 7.5%
    const hardCap = DEFAULT_CONCENTRATION_LIMITS.SINGLE_STOCK_HARD_CAP_PCT; // 10.0%

    return equityHoldings.map(h => {
      const symTicker = (h.ticker || '').toUpperCase();
      const clean = symTicker.replace('.IS', '').replace('-USD', '');
      const stockInfo = stocksData[clean] || stocksData[symTicker] || {};
      const potInfo = potentialStocksData?.stocks?.find(s => s.ticker === clean);
      const quantScore = stockInfo.analysis?.quant_score || potInfo?.conviction_score || 78.0;
      const isUS = h.currency === 'USD' || h.isHoldingUSD || Number(h.cost_rate) > 1.5;
      const category = h.type === 'ETF' ? 'Tematik ETF' : (isUS ? 'ABD Hisse' : 'BIST 100');
      const weightPct = ((h.valTRY || 0) / totalValAll) * 100;

      const sector = getTickerSector(symTicker, h.type);
      const sectorWeight = sectorWeightMap[sector.id] || 0;
      const isSectorBreached = sectorWeight > sector.targetCapPct;

      // Sub-class internal share (share within US bucket or BIST bucket)
      const subBucketVal = isUS ? (segmentStats.equity.valTRY * 0.65 || 1) : (segmentStats.equity.valTRY * 0.35 || 1);
      const internalSharePct = subBucketVal > 0 ? ((h.valTRY || 0) / subBucketVal) * 100 : 0;

      let action = 'HOLD';
      let badgeColor = 'cyan';
      let actionTitle = '🛡️ TUT / KORU';
      let reason = 'Mevcut ağırlık dengeli, büyüme ve bilanço yapısı hedeflerle uyumlu.';

      if (weightPct > hardCap) {
        action = 'TRIM_HARD';
        badgeColor = 'red';
        actionTitle = `🚨 SERT TAVAN AŞIMI (%${hardCap}+)`;
        reason = `Portföyün %${weightPct.toFixed(1)}'ini kaplıyor (%${hardCap} sert tavan aşıldı). Aşırı konsantrasyon riski var; kâr alıp kalkanı (altın/nakit) besleyin.`;
      } else if (weightPct > softCap) {
        action = 'TRIM_SOFT';
        badgeColor = 'amber';
        actionTitle = `⚖️ İDEAL TAVAN ÜSTÜ (%${softCap}+)`;
        reason = `Mevcut pay (%${weightPct.toFixed(1)}) ideal risk tavanının (%${softCap}) üzerinde. Yeni alım yapmayın, kademeli kâr realizasyonunu değerlendirin.`;
      } else if (isSectorBreached && weightPct >= 4.0) {
        action = 'SECTOR_CAP';
        badgeColor = 'amber';
        actionTitle = `⚠️ SEKTÖR TAVANI AŞILDI`;
        reason = `${sector.shortName} sektörü toplamda %${sectorWeight.toFixed(1)} oldu (Sektör Tavanı: %${sector.targetCapPct}). Bu sektöre yeni ekleme yapmayın.`;
      } else if (quantScore >= 82.0 && weightPct < 5.0 && !isSectorBreached) {
        action = 'ACCUMULATE';
        badgeColor = 'emerald';
        actionTitle = '✨ EKLE / BİRİKTİR';
        reason = `Quant Skoru ${quantScore.toFixed(1)} (A+) güçlü trendde ve pozisyon payı (%${weightPct.toFixed(1)}) tavanın altında. Kademeli biriktirilebilir.`;
      } else if (quantScore < 65.0) {
        action = 'EXIT';
        badgeColor = 'red';
        actionTitle = '🚪 MODEL DIŞI / ÇIK';
        reason = `Quant skoru ${quantScore.toFixed(1)} seviyesine geriledi. Bilanço ve teknik ivme zayıfladı.`;
      } else {
        action = 'HOLD';
        badgeColor = 'cyan';
        actionTitle = '🛡️ TUT / KORU';
        reason = `Quant Skoru ${quantScore.toFixed(1)} ile istikrarlı. Pozisyon ağırlığı (%${weightPct.toFixed(1)}) ve ${sector.shortName} sektörü tavan dahilinde.`;
      }

      return {
        ...h,
        clean,
        category,
        sector,
        quantScore,
        weightPct,
        softCap,
        hardCap,
        internalSharePct,
        isSectorBreached,
        action,
        badgeColor,
        actionTitle,
        reason
      };
    });
  }, [equityHoldings, totalValAll, sectorConcentration, segmentStats]);

  // Lookup map for fast O(1) rebalance item access
  const rebalanceMap = useMemo(() => {
    const map = {};
    rebalanceList.forEach(item => {
      map[item.id] = item;
      if (item.ticker) map[item.ticker.toUpperCase()] = item;
    });
    return map;
  }, [rebalanceList]);

  // Model Rebalance Summary metrics for header strip
  const rebalanceSummary = useMemo(() => {
    let trimCount = 0;
    let trimTicker = '';
    let trimWeight = 0;
    let accumCount = 0;
    let accumTicker = '';
    let accumScore = 0;
    let holdCount = 0;

    rebalanceList.forEach(item => {
      if (item.action.startsWith('TRIM') || item.action === 'EXIT') {
        trimCount++;
        if (!trimTicker || item.weightPct > trimWeight) {
          trimTicker = item.ticker;
          trimWeight = item.weightPct;
        }
      } else if (item.action === 'ACCUMULATE') {
        accumCount++;
        if (!accumTicker || item.quantScore > accumScore) {
          accumTicker = item.ticker;
          accumScore = item.quantScore;
        }
      } else {
        holdCount++;
      }
    });

    return { trimCount, trimTicker, trimWeight, accumCount, accumTicker, accumScore, holdCount };
  }, [rebalanceList]);

  // 🎯 Tekil Enstrüman Konsantrasyon & Tavan Analiz Motoru (UCITS 5/10/40 Kuralı)
  const concentrationAnalysis = useMemo(() => {
    const totalVal = portfolioSummary?.totalValTRY || 1;

    const list = holdings.map(h => {
      const valTRY = Number(h.valTRY) || 0;
      const weightPct = totalVal > 0 ? (valTRY / totalVal) * 100 : 0;
      const sym = (h.ticker || '').toUpperCase();
      const clean = sym.replace('.IS', '').replace('-USD', '');
      const isGold = h.type === 'Altın' || h.type === 'Emtia' || clean === 'XAUT' || clean.includes('GOLD');
      const isCrypto = h.type === 'Kripto' || KNOWN_CRYPTO_SET.has(clean);

      let softCap = 7.5;
      let hardCap = 10.0;
      if (isGold) {
        softCap = 20.0;
        hardCap = 25.0;
      } else if (isCrypto) {
        softCap = 5.0;
        hardCap = 7.5;
      }

      const isBreached = !isGold && (weightPct > hardCap);
      const isWarning = !isGold && (weightPct > softCap && !isBreached);
      const excessWeightPct = Math.max(0, weightPct - hardCap);
      const excessTRY = (excessWeightPct / 100) * totalVal;

      return {
        ...h,
        clean,
        isGold,
        isCrypto,
        valTRY,
        weightPct,
        softCap,
        hardCap,
        isBreached,
        isWarning,
        excessWeightPct,
        excessTRY
      };
    });

    list.sort((a, b) => b.weightPct - a.weightPct);

    const top1 = list[0] || null;
    const top3 = list.slice(0, 3);
    const top5 = list.slice(0, 5);

    const top3Weight = top3.reduce((acc, x) => acc + x.weightPct, 0);
    const top5Weight = top5.reduce((acc, x) => acc + x.weightPct, 0);

    // Herfindahl-Hirschman Index (HHI)
    const hhi = Math.round(list.reduce((acc, x) => acc + Math.pow(x.weightPct, 2), 0));
    let hhiLabel = 'İyi Çeşitlendirilmiş';
    let hhiColor = '#10b981';
    if (hhi > 2500) {
      hhiLabel = 'Aşırı Konsantrasyon (Yüksek Risk)';
      hhiColor = '#ef4444';
    } else if (hhi > 1500) {
      hhiLabel = 'Orta Konsantrasyon (Tek Varlık Baskısı)';
      hhiColor = '#f59e0b';
    }

    const breachedList = list.filter(x => x.isBreached);
    const warningList = list.filter(x => x.isWarning);
    const totalExcessTRY = breachedList.reduce((acc, x) => acc + x.excessTRY, 0);

    return {
      list,
      top1,
      top3,
      top5,
      top3Weight,
      top5Weight,
      hhi,
      hhiLabel,
      hhiColor,
      breachedList,
      warningList,
      totalExcessTRY
    };
  }, [holdings, portfolioSummary]);

  // Sorted and Filtered Holdings based on active main tab
  const sortedHoldings = useMemo(() => {
    let list = [...holdings];

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(h =>
        (h.ticker && h.ticker.toLowerCase().includes(q)) ||
        (h.name && h.name.toLowerCase().includes(q)) ||
        (h.type && h.type.toLowerCase().includes(q))
      );
    }

    list.sort((a, b) => {
      let valA, valB;

      switch (sortKey) {
        case 'ticker':
          valA = a.ticker || '';
          valB = b.ticker || '';
          return sortDir === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        case 'type':
          valA = a.type || '';
          valB = b.type || '';
          return sortDir === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        case 'shares':
          valA = Number(a.shares) || 0;
          valB = Number(b.shares) || 0;
          break;
        case 'cost':
          valA = isTRY ? (a.costTRY || 0) : (a.costUSD || 0);
          valB = isTRY ? (b.costTRY || 0) : (b.costUSD || 0);
          break;
        case 'price':
          valA = isTRY ? (a.livePriceTRY || 0) : (a.livePriceUSD || 0);
          valB = isTRY ? (b.livePriceTRY || 0) : (b.livePriceUSD || 0);
          break;
        case 'change':
          valA = a.changePct || 0;
          valB = b.changePct || 0;
          break;
        case 'val':
        case 'weight':
          valA = isTRY ? (a.valTRY || 0) : (a.valUSD || 0);
          valB = isTRY ? (b.valTRY || 0) : (b.valUSD || 0);
          break;
        case 'ring': {
          const fA = portfolioFinvestAnalysis.itemMap[a.id] || portfolioFinvestAnalysis.itemMap[(a.ticker || '').toUpperCase()];
          const fB = portfolioFinvestAnalysis.itemMap[b.id] || portfolioFinvestAnalysis.itemMap[(b.ticker || '').toUpperCase()];
          valA = fA?.ring || 2;
          valB = fB?.ring || 2;
          break;
        }
        case 'buyback': {
          const fA = portfolioFinvestAnalysis.itemMap[a.id] || portfolioFinvestAnalysis.itemMap[(a.ticker || '').toUpperCase()];
          const fB = portfolioFinvestAnalysis.itemMap[b.id] || portfolioFinvestAnalysis.itemMap[(b.ticker || '').toUpperCase()];
          valA = fA?.netBuybackYield || 0;
          valB = fB?.netBuybackYield || 0;
          break;
        }
        case 'dividend': {
          const fA = portfolioFinvestAnalysis.itemMap[a.id] || portfolioFinvestAnalysis.itemMap[(a.ticker || '').toUpperCase()];
          const fB = portfolioFinvestAnalysis.itemMap[b.id] || portfolioFinvestAnalysis.itemMap[(b.ticker || '').toUpperCase()];
          valA = fA?.dividendYield || 0;
          valB = fB?.dividendYield || 0;
          break;
        }
        case 'yield': {
          const fA = portfolioFinvestAnalysis.itemMap[a.id] || portfolioFinvestAnalysis.itemMap[(a.ticker || '').toUpperCase()];
          const fB = portfolioFinvestAnalysis.itemMap[b.id] || portfolioFinvestAnalysis.itemMap[(b.ticker || '').toUpperCase()];
          valA = fA?.totalShareholderYield || 0;
          valB = fB?.totalShareholderYield || 0;
          break;
        }
        case 'solvency': {
          const fA = portfolioFinvestAnalysis.itemMap[a.id] || portfolioFinvestAnalysis.itemMap[(a.ticker || '').toUpperCase()];
          const fB = portfolioFinvestAnalysis.itemMap[b.id] || portfolioFinvestAnalysis.itemMap[(b.ticker || '').toUpperCase()];
          valA = fA?.solvencyScore || 75;
          valB = fB?.solvencyScore || 75;
          break;
        }
        case 'quant': {
          const rA = rebalanceMap[a.id] || rebalanceMap[(a.ticker || '').toUpperCase()];
          const rB = rebalanceMap[b.id] || rebalanceMap[(b.ticker || '').toUpperCase()];
          valA = rA?.quantScore || 78;
          valB = rB?.quantScore || 78;
          break;
        }
        case 'profit':
          valA = isTRY ? (a.profitTRY || 0) : (a.profitUSD || 0);
          valB = isTRY ? (b.profitTRY || 0) : (b.profitUSD || 0);
          break;
        case 'return':
          valA = a.returnPct || 0;
          valB = b.returnPct || 0;
          break;
        default:
          valA = isTRY ? (a.valTRY || 0) : (a.valUSD || 0);
          valB = isTRY ? (b.valTRY || 0) : (b.valUSD || 0);
      }

      return sortDir === 'asc' ? valA - valB : valB - valA;
    });

    return list;
  }, [holdings, search, sortKey, sortDir, isTRY]);

  const displayedHoldings = useMemo(() => {
    let list = sortedHoldings;
    if (activeMainTab === 'equity') {
      list = list.filter(h => {
        const symTicker = (h.ticker || '').toUpperCase();
        const clean = symTicker.replace('.IS', '').replace('-USD', '');
        const isCrypto = h.type === 'Kripto' || KNOWN_CRYPTO_SET.has(clean) || KNOWN_CRYPTO_SET.has(symTicker);
        const isGoldOrCash = h.type === 'Altın' || h.type === 'Emtia' || h.type === 'Nakit' || clean === 'XAUT';
        if (isCrypto || isGoldOrCash) return false;
        return h.type === 'Hisse' || h.type === 'ETF' || h.type === 'Hisse Senedi';
      });
    } else {
      if (selectedSegment !== 'all') {
        list = list.filter(h => getHoldingSegment(h) === selectedSegment);
      }
    }
    return list;
  }, [sortedHoldings, activeMainTab, selectedSegment]);

  const renderSortIndicator = (key) => {
    if (sortKey !== key) {
      return <ArrowUpDown size={11} style={{ opacity: 0.35, marginLeft: 4 }} />;
    }
    return sortDir === 'asc' ? (
      <ArrowUp size={11} style={{ color: 'var(--cyan)', marginLeft: 4 }} />
    ) : (
      <ArrowDown size={11} style={{ color: 'var(--cyan)', marginLeft: 4 }} />
    );
  };

  return (
    <div className="tab-pane-content" style={{ animation: 'fadeIn 0.25s ease' }}>
      
      {/* 🌟 2-Tier Sub-Header: HİSSE - ETF vs TÜM PORTFÖY */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 16, borderBottom: '1px solid var(--border)', paddingBottom: 14 }}>
        <div style={{ display: 'flex', gap: 8, background: 'rgba(0,0,0,0.4)', padding: 4, borderRadius: 8, border: '1px solid var(--border)' }}>
          <button
            type="button"
            className={`chip-btn ${activeMainTab === 'equity' ? 'active' : ''}`}
            onClick={() => setActiveMainTab('equity')}
            style={{ 
              padding: '8px 18px', 
              fontSize: 12, 
              fontWeight: 800, 
              display: 'flex', 
              alignItems: 'center', 
              gap: 8,
              background: activeMainTab === 'equity' ? 'linear-gradient(135deg, rgba(0, 229, 255, 0.2), rgba(56, 189, 248, 0.1))' : 'transparent',
              borderColor: activeMainTab === 'equity' ? 'var(--cyan)' : 'transparent',
              color: activeMainTab === 'equity' ? '#ffffff' : 'var(--text-muted)'
            }}
          >
            <TrendingUp size={16} className={activeMainTab === 'equity' ? 'text-cyan' : ''} />
            <span>📈 HİSSE & ETF PORTFÖYÜ</span>
            <span className="nav-badge cyan" style={{ fontSize: 10, padding: '2px 7px' }}>
              {equityHoldings.length} Varlık
            </span>
          </button>

          <button
            type="button"
            className={`chip-btn ${activeMainTab === 'all' ? 'active' : ''}`}
            onClick={() => setActiveMainTab('all')}
            style={{ 
              padding: '8px 18px', 
              fontSize: 12, 
              fontWeight: 800, 
              display: 'flex', 
              alignItems: 'center', 
              gap: 8,
              background: activeMainTab === 'all' ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(251, 191, 36, 0.1))' : 'transparent',
              borderColor: activeMainTab === 'all' ? 'var(--gold)' : 'transparent',
              color: activeMainTab === 'all' ? '#ffffff' : 'var(--text-muted)'
            }}
          >
            <Layers size={16} className={activeMainTab === 'all' ? 'text-gold' : ''} />
            <span>🌐 TÜM PORTFÖY (KONSOLİDE)</span>
            <span className="nav-badge gold" style={{ fontSize: 10, padding: '2px 7px' }}>
              {holdings.length + (((portfolioSummary?.totalGrams) || 0) > 0 ? 1 : 0)} Varlık
            </span>
          </button>
        </div>

        {/* Currency & Modal Action Buttons */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {onOpenCashModal && (
            <button
              type="button"
              className="chip-btn"
              onClick={onOpenCashModal}
              style={{ padding: '6px 11px', fontSize: 11, borderColor: 'rgba(6, 182, 212, 0.4)', color: 'var(--cyan)' }}
              title="Serbest Nakit (TRY/USD) Alım Gücünü Düzenle"
            >
              💵 Serbest Nakit
            </button>
          )}
          {onOpenPpfModal && (
            <button
              type="button"
              className="chip-btn"
              onClick={onOpenPpfModal}
              style={{ padding: '6px 11px', fontSize: 11, borderColor: 'rgba(16, 185, 129, 0.4)', color: '#10b981' }}
              title="Likit Para Piyasası Fonu / Kuru Barut Bakiyesini Güncelle veya Sıfırla"
            >
              🛡️ PPF Kuru Barut
            </button>
          )}
          <button
            type="button"
            className="btn-primary"
            onClick={onOpenAddModal}
            style={{ padding: '7px 14px', fontSize: 11.5 }}
          >
            <Plus size={14} />
            <span>{activeMainTab === 'equity' ? 'Yeni Hisse / ETF Ekle' : 'Yeni Pozisyon Ekle'}</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 📈 GÖRÜNÜM 1: HİSSE & ETF PORTFÖYÜ (%100 GERÇEK PORTFÖY VERİLERİ)         */}
      {/* ========================================================================= */}
      {activeMainTab === 'equity' && (
        <div style={{ animation: 'fadeIn 0.2s ease' }}>
          {/* 3 Key Metric Summary Cards for Equity Basket */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10, marginBottom: 14 }}>
            {/* Card 1: Market Value */}
            <div className="card" style={{ padding: 12, background: 'rgba(56, 189, 248, 0.05)', border: '1px solid rgba(56, 189, 248, 0.25)', borderRadius: 6 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                💼 HİSSE & ETF PİYASA DEĞERİ
              </div>
              <div className="mono font-bold" style={{ fontSize: 18, color: '#fff', marginTop: 4 }}>
                {sym}{fmt(isTRY ? segmentStats.equity.valTRY : segmentStats.equity.valUSD, 0)}
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
                Toplam Portföyün <strong>%{segmentStats.equity.weightPct.toFixed(1)}</strong>'i ({segmentStats.equity.count} Pozisyon)
              </div>
            </div>

            {/* Card 2: Total Profit / Loss */}
            <div className="card" style={{ padding: 12, background: segmentStats.equity.profitTRY >= 0 ? 'rgba(16, 185, 129, 0.05)' : 'rgba(239, 68, 68, 0.05)', border: `1px solid ${segmentStats.equity.profitTRY >= 0 ? 'rgba(16, 185, 129, 0.25)' : 'rgba(239, 68, 68, 0.25)'}`, borderRadius: 6 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                💰 TOPLAM KÂR / ZARAR
              </div>
              <div className="mono font-bold" style={{ fontSize: 18, color: segmentStats.equity.profitTRY >= 0 ? 'var(--up)' : 'var(--down)', marginTop: 4 }}>
                {segmentStats.equity.profitTRY >= 0 ? '+' : ''}{sym}{fmt(isTRY ? segmentStats.equity.profitTRY : segmentStats.equity.profitUSD, 0)}
              </div>
              <div style={{ fontSize: 10, fontWeight: 700, color: segmentStats.equity.profitTRY >= 0 ? 'var(--up)' : 'var(--down)', marginTop: 2 }}>
                Net Getiri: %{fmt(segmentStats.equity.returnPct, 1)}
              </div>
            </div>

            {/* Card 3: 24h Change */}
            <div className="card" style={{ padding: 12, background: segmentStats.equity.dayPLTRY >= 0 ? 'rgba(16, 185, 129, 0.05)' : 'rgba(239, 68, 68, 0.05)', border: `1px solid ${segmentStats.equity.dayPLTRY >= 0 ? 'rgba(16, 185, 129, 0.25)' : 'rgba(239, 68, 68, 0.25)'}`, borderRadius: 6 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                ⚡ 24 SAATLİK GÜNLÜK DEĞİŞİM
              </div>
              <div className="mono font-bold" style={{ fontSize: 18, color: segmentStats.equity.dayPLTRY >= 0 ? 'var(--up)' : 'var(--down)', marginTop: 4 }}>
                {segmentStats.equity.dayPLTRY >= 0 ? '+' : ''}{sym}{fmt(isTRY ? segmentStats.equity.dayPLTRY : segmentStats.equity.dayPLUSD, 0)}
              </div>
              <div style={{ fontSize: 10, fontWeight: 700, color: segmentStats.equity.dayPLPct >= 0 ? 'var(--up)' : 'var(--down)', marginTop: 2 }}>
                Günlük %{fmt(segmentStats.equity.dayPLPct, 2)}
              </div>
            </div>
          </div>

          {/* 🚀 SERBEST ALIM GÜCÜ KONTROL BARI */}
          <div 
            className="card rebalance-control-strip" 
            style={{ 
              marginBottom: 12, 
              padding: '10px 14px', 
              background: 'linear-gradient(135deg, rgba(7, 10, 20, 0.95), rgba(15, 23, 42, 0.95))', 
              border: '1px solid rgba(0, 229, 255, 0.25)', 
              borderRadius: 8,
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 10
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <div style={{ width: 28, height: 28, borderRadius: 6, background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--emerald)' }}>
                  <Briefcase size={15} />
                </div>
                <div>
                  <div style={{ fontSize: 9.5, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px', fontWeight: 700 }}>
                    SERBEST ALIM GÜCÜ
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
                    <strong className="mono text-emerald" style={{ fontSize: 13, fontWeight: 800 }}>
                      ₺{fmt(portfolioSummary.buyingPowerTRY || 0)}
                    </strong>
                    <span className="mono text-muted" style={{ fontSize: 10 }}>
                      (${fmt(portfolioSummary.buyingPowerUSD || 0)} USD)
                    </span>
                    <button
                      type="button"
                      onClick={onOpenCashModal}
                      className="chip-btn"
                      style={{ fontSize: 9.5, padding: '1px 6px', marginLeft: 4, height: 18, color: 'var(--emerald)', borderColor: 'rgba(16,185,129,0.4)', background: 'rgba(16,185,129,0.1)' }}
                    >
                      + Nakit
                    </button>
                    {onOpenPpfModal && (
                      <button
                        type="button"
                        onClick={onOpenPpfModal}
                        className="chip-btn"
                        style={{ fontSize: 9.5, padding: '1px 6px', marginLeft: 4, height: 18, color: '#10b981', borderColor: 'rgba(16,185,129,0.4)', background: 'rgba(16,185,129,0.1)' }}
                      >
                        🛡️ PPF Barut
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 🌐 GÖRÜNÜM 2: TÜM PORTFÖY (KONSOLİDE, SEGMENTLER & TAHSİS ÇUBUĞU)          */}
      {/* ========================================================================= */}
      {activeMainTab === 'all' && (
        <div style={{ animation: 'fadeIn 0.2s ease' }}>
          
          {/* 📊 Portföy Varlık Segmentleri & Dinamik Tahsis Paneli */}
          <div className="card segment-selector-card" style={{ background: '#080d1a', border: '1px solid rgba(0, 229, 255, 0.22)', borderRadius: 8, padding: '14px 16px', marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-bright)', letterSpacing: '0.4px', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <PieChart size={15} style={{ color: 'var(--cyan)' }} />
                  PORTFÖY VARLIK SEGMENTLERİ & DAĞILIM
                </span>
                <span style={{ fontSize: 10, background: 'rgba(0, 229, 255, 0.12)', color: 'var(--cyan)', border: '1px solid rgba(0, 229, 255, 0.3)', padding: '2px 7px', borderRadius: 4, fontWeight: 700 }}>
                  DİNAMİK FİLTRE
                </span>
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                Seçili Görünüm: <strong style={{ color: segmentStats[selectedSegment]?.color || 'var(--cyan)' }}>{segmentStats[selectedSegment]?.label}</strong>
              </div>
            </div>

            {/* Görsel Katmanlı Tahsis Çubuğu (Allocation Bar) */}
            <div style={{ width: '100%', height: 10, background: '#040711', borderRadius: 5, overflow: 'hidden', display: 'flex', marginBottom: 12, border: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <div
                title={`Çekirdek Hisse & ETF: %${segmentStats.equity.weightPct.toFixed(1)}`}
                onClick={() => setSelectedSegment(selectedSegment === 'equity' ? 'all' : 'equity')}
                style={{ width: `${Math.max(2, segmentStats.equity.weightPct)}%`, background: 'linear-gradient(90deg, #0284c7, #38bdf8)', cursor: 'pointer', transition: 'all 0.3s ease' }}
              />
              <div
                title={`Kur Kalkanı & Nakit: %${segmentStats.shield.weightPct.toFixed(1)}`}
                onClick={() => setSelectedSegment(selectedSegment === 'shield' ? 'all' : 'shield')}
                style={{ width: `${Math.max(2, segmentStats.shield.weightPct)}%`, background: 'linear-gradient(90deg, #d97706, #fbbf24)', cursor: 'pointer', transition: 'all 0.3s ease' }}
              />
              <div
                title={`Kripto Varlıklar: %${segmentStats.crypto.weightPct.toFixed(1)}`}
                onClick={() => setSelectedSegment(selectedSegment === 'crypto' ? 'all' : 'crypto')}
                style={{ width: `${Math.max(2, segmentStats.crypto.weightPct)}%`, background: 'linear-gradient(90deg, #7c3aed, #c084fc)', cursor: 'pointer', transition: 'all 0.3s ease' }}
              />
            </div>

            {/* 4 İnteraktif Segment Seçim Kartı */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 10 }}>
              {[
                { id: 'all', stat: segmentStats.all, desc: 'Tüm hisse, fon, kalkan ve kriptolar' },
                { id: 'equity', stat: segmentStats.equity, desc: 'ABD, BIST ve Tematik ETF sepeti' },
                { id: 'shield', stat: segmentStats.shield, desc: 'Fiziki/Banka altın ve nakit tamponu' },
                { id: 'crypto', stat: segmentStats.crypto, desc: 'Yüksek beta asimetrik fırsatlar' }
              ].map(({ id, stat, desc }) => {
                const isSel = selectedSegment === id;
                const val = isTRY ? stat.valTRY : stat.valUSD;
                const profit = isTRY ? stat.profitTRY : stat.profitUSD;
                const dayPL = isTRY ? stat.dayPLTRY : stat.dayPLUSD;

                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setSelectedSegment(id)}
                    style={{
                      textAlign: 'left',
                      background: isSel ? 'rgba(0, 229, 255, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                      border: isSel ? `1.5px solid ${stat.color}` : '1px solid rgba(255, 255, 255, 0.07)',
                      borderRadius: 6,
                      padding: '10px 12px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      boxShadow: isSel ? `0 0 14px ${stat.color}33` : 'none',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 4
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 11.5, fontWeight: 800, color: isSel ? stat.color : 'var(--text-bright)', display: 'flex', alignItems: 'center', gap: 5 }}>
                        <span>{stat.icon}</span>
                        <span>{stat.shortLabel}</span>
                        <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 500 }}>({stat.count})</span>
                      </span>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 5px', borderRadius: 3, background: isSel ? `${stat.color}25` : 'rgba(255,255,255,0.05)', color: stat.color }}>
                        %{stat.weightPct.toFixed(1)}
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 2 }}>
                      <span className="mono" style={{ fontSize: 13, fontWeight: 800, color: '#f8fafc' }}>
                        {sym}{fmt(val, 0)}
                      </span>
                      {id !== 'all' ? (
                        <span className="mono" style={{ fontSize: 10, fontWeight: 700, color: profit >= 0 ? 'var(--up)' : 'var(--down)' }}>
                          {profit >= 0 ? '+' : ''}{sym}{fmt(profit, 0)} ({fmt(stat.returnPct, 1)}%)
                        </span>
                      ) : (
                        <span className="mono" style={{ fontSize: 10, fontWeight: 700, color: dayPL >= 0 ? 'var(--up)' : 'var(--down)' }}>
                          24s: {dayPL >= 0 ? '+' : ''}{sym}{fmt(dayPL, 0)}
                        </span>
                      )}
                    </div>

                    <div style={{ fontSize: 9.5, color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {desc}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 🌟 Konsolide Sermaye Yapısı & Koruma Dağılımı */}
          <div style={{ marginBottom: 16 }}>
            <div 
              className="card" 
              style={{ 
                padding: 16, 
                background: '#090d16', 
                border: '1px solid var(--border)', 
                borderRadius: 8, 
                display: 'flex', 
                flexDirection: 'column', 
                justifyContent: 'space-between' 
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <div style={{ fontWeight: 800, fontSize: 12.5, color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: 7 }}>
                    <ShieldCheck size={16} className="text-amber" />
                    <span>SERMAYE DAĞILIMI & ZIRH DENGESİ</span>
                  </div>
                  <span className="nav-badge gold" style={{ fontSize: 9 }}>
                    Gerçek Portföy Dağılımı
                  </span>
                </div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 12 }}>
                  Büyüme varlıklarınız (Hisse & Kripto) ile kriz tamponlarınız (Altın, PPF & Nakit) arasındaki gerçek bakiye dağılımı.
                </div>
              </div>

              {/* 3 Katmanlı Dağılım İlerleme Çubuğu */}
              <div style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, fontWeight: 700, marginBottom: 5 }}>
                  <span style={{ color: '#38bdf8' }}>📈 Çekirdek Büyüme (%{totalSnowflake.eqPct})</span>
                  <span style={{ color: '#fbbf24' }}>🛡️ Kur Kalkanı & Nakit (%{totalSnowflake.totalDefensivePct})</span>
                </div>
                <div style={{ width: '100%', height: 12, background: '#040711', borderRadius: 6, overflow: 'hidden', display: 'flex', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                  <div 
                    title={`Hisse & ETF: %${totalSnowflake.eqPct}`} 
                    style={{ width: `${Math.max(2, totalSnowflake.eqPct)}%`, background: 'linear-gradient(90deg, #0284c7, #38bdf8)', transition: 'all 0.3s ease' }} 
                  />
                  <div 
                    title={`Altın Kalkanı: %${totalSnowflake.goldPct}`} 
                    style={{ width: `${Math.max(2, totalSnowflake.goldPct)}%`, background: 'linear-gradient(90deg, #d97706, #fbbf24)', transition: 'all 0.3s ease' }} 
                  />
                  <div 
                    title={`PPF & Serbest Nakit: %${totalSnowflake.cashPpfPct}`} 
                    style={{ width: `${Math.max(2, totalSnowflake.cashPpfPct)}%`, background: 'linear-gradient(90deg, #059669, #10b981)', transition: 'all 0.3s ease' }} 
                  />
                  {segmentStats.crypto.weightPct > 0 && (
                    <div 
                      title={`Kripto: %${segmentStats.crypto.weightPct.toFixed(1)}`} 
                      style={{ width: `${Math.max(2, segmentStats.crypto.weightPct)}%`, background: 'linear-gradient(90deg, #7c3aed, #c084fc)', transition: 'all 0.3s ease' }} 
                    />
                  )}
                </div>
              </div>

              {/* 3-Sütunlu Sermaye Özet Paneli */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, background: 'rgba(0,0,0,0.5)', padding: '10px 12px', borderRadius: 6, border: '1px solid var(--border)', fontSize: 10 }}>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: 9 }}>Büyüme Motoru</span>
                  <strong className="mono" style={{ fontSize: 12.5, color: '#38bdf8' }}>
                    {sym}{fmt(totalSnowflake.eqVal, 0)}
                  </strong>
                  <div style={{ fontSize: 9, color: '#94a3b8', marginTop: 1 }}>
                    %{totalSnowflake.eqPct} Portföy
                  </div>
                </div>

                <div style={{ borderLeft: '1px solid var(--border)', borderRight: '1px solid var(--border)', paddingLeft: 8, paddingRight: 8 }}>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: 9 }}>Altın Zırhı</span>
                  <strong className="mono" style={{ fontSize: 12.5, color: '#fbbf24' }}>
                    {sym}{fmt(totalSnowflake.goldVal, 0)}
                  </strong>
                  <div style={{ fontSize: 9, color: '#94a3b8', marginTop: 1 }}>
                    %{totalSnowflake.goldPct} Kalkan
                  </div>
                </div>

                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: 9 }}>Nakit & PPF (Barut)</span>
                  <strong className="mono" style={{ fontSize: 12.5, color: '#10b981' }}>
                    {sym}{fmt(totalSnowflake.liquidCashVal, 0)}
                  </strong>
                  <div style={{ fontSize: 9, color: '#94a3b8', marginTop: 1 }}>
                    %{totalSnowflake.cashPpfPct} Likidite
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* 🎯 TEKİL ENSTRÜMAN TAVANI & KONSANTRASYON RÖNTGENİ (UCITS 5/10/40 KURALI) */}
      <div 
        className="card" 
        style={{ 
          marginBottom: 16, 
          padding: 16, 
          background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.85), rgba(9, 13, 22, 0.95))', 
          border: '1px solid rgba(255, 255, 255, 0.1)', 
          borderRadius: 10,
          boxShadow: '0 8px 24px rgba(0,0,0,0.3)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Activity size={16} className="text-cyan" />
            <span style={{ fontSize: 13, fontWeight: 900, letterSpacing: '0.4px', color: '#f8fafc' }}>
              🎯 TEKİL ENSTRÜMAN TAVANI & KONSANTRASYON RÖNTGENİ
            </span>
          </div>
          <span 
            className="nav-badge" 
            style={{ 
              fontSize: 10, 
              padding: '3px 9px', 
              background: 'rgba(0, 229, 255, 0.12)', 
              color: 'var(--cyan)', 
              border: '1px solid rgba(0, 229, 255, 0.3)',
              fontWeight: 800
            }}
          >
            UCITS 5/10/40 Kuralı • Tekil Sert Tavan: %10.0
          </span>
        </div>

        {/* 4 Konsantrasyon KPI Kartı */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10, marginBottom: 12 }}>
          {/* KPI 1: En Büyük Varlık ve Tavan */}
          <div style={{ background: 'rgba(0,0,0,0.35)', padding: 12, borderRadius: 8, border: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
              EN YÜKSEK TEKİL VARLIK
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 4 }}>
              <span className="mono font-bold" style={{ fontSize: 18, color: concentrationAnalysis.top1?.isBreached ? '#ef4444' : (concentrationAnalysis.top1?.isWarning ? '#f59e0b' : '#38bdf8') }}>
                {concentrationAnalysis.top1?.ticker || '--'}
              </span>
              <span className="mono" style={{ fontSize: 14, fontWeight: 800, color: concentrationAnalysis.top1?.isBreached ? '#ef4444' : '#f8fafc' }}>
                (%{concentrationAnalysis.top1?.weightPct.toFixed(1) || '0.0'})
              </span>
            </div>
            <div style={{ fontSize: 10, marginTop: 3 }}>
              {concentrationAnalysis.top1?.isBreached ? (
                <span style={{ color: '#ef4444', fontWeight: 700 }}>
                  🚨 Sert Tavan %{concentrationAnalysis.top1?.hardCap} (+%{concentrationAnalysis.top1?.excessWeightPct.toFixed(1)} Aşım)
                </span>
              ) : (
                <span style={{ color: '#10b981' }}>✓ Tavan Dahilinde</span>
              )}
            </div>
          </div>

          {/* KPI 2: Top 3 Varlık Konsantrasyonu */}
          <div style={{ background: 'rgba(0,0,0,0.35)', padding: 12, borderRadius: 8, border: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
              İLK 3 VARLIK PAYI (TOP 3)
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 4 }}>
              <span className="mono font-bold" style={{ fontSize: 18, color: concentrationAnalysis.top3Weight > 45 ? '#f59e0b' : '#10b981' }}>
                %{concentrationAnalysis.top3Weight.toFixed(1)}
              </span>
              <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                (Eşik: &lt;%40)
              </span>
            </div>
            <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {concentrationAnalysis.top3.map(x => x.ticker).join(', ')}
            </div>
          </div>

          {/* KPI 3: HHI Konsantrasyon Endeksi */}
          <div style={{ background: 'rgba(0,0,0,0.35)', padding: 12, borderRadius: 8, border: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
              HHI RİSK SKORU
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 4 }}>
              <span className="mono font-bold" style={{ fontSize: 18, color: concentrationAnalysis.hhiColor }}>
                {concentrationAnalysis.hhi}
              </span>
              <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                / 10.000
              </span>
            </div>
            <div style={{ fontSize: 10, color: concentrationAnalysis.hhiColor, fontWeight: 700, marginTop: 3 }}>
              {concentrationAnalysis.hhiLabel}
            </div>
          </div>

          {/* KPI 4: Dengeleme & Açığa Çıkacak Nakit */}
          <div style={{ background: 'rgba(0,0,0,0.35)', padding: 12, borderRadius: 8, border: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
              TAVAN REBALANCE POTANSİYELİ
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 4 }}>
              <span className="mono font-bold" style={{ fontSize: 18, color: concentrationAnalysis.totalExcessTRY > 0 ? '#fbbf24' : '#10b981' }}>
                ₺{fmt(concentrationAnalysis.totalExcessTRY, 0)}
              </span>
            </div>
            <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 3 }}>
              {concentrationAnalysis.totalExcessTRY > 0 ? (
                <span>Tavan aşanları %10'a çekince serbest kalacak nakit</span>
              ) : (
                <span style={{ color: '#10b981' }}>Tüm hisseler tavan koridorunda</span>
              )}
            </div>
          </div>
        </div>

        {/* İlk 5 Varlık ve Tavan Çubuğu */}
        <div style={{ background: 'rgba(0,0,0,0.25)', padding: '10px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ fontSize: 10.5, fontWeight: 700, color: '#cbd5e1', marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>EN BÜYÜK 5 VARLIK & TAVAN ÇİZGİLERİ (İdeal: %7.5 • Sert Tavan: %10.0)</span>
            <span style={{ fontSize: 9.5, color: 'var(--text-muted)' }}>İlk 5 Toplamı: %{concentrationAnalysis.top5Weight.toFixed(1)}</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {concentrationAnalysis.top5.map(item => {
              const capHard = item.hardCap || 10.0;
              const capSoft = item.softCap || 7.5;
              const isOver = item.weightPct > capHard;
              const isWarn = item.weightPct > capSoft && !isOver;
              const barColor = item.isGold ? '#eab308' : (isOver ? '#ef4444' : (isWarn ? '#f59e0b' : '#06b6d4'));

              return (
                <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 85, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <strong className="mono" style={{ fontSize: 11, color: '#fff' }}>{item.ticker}</strong>
                    <span style={{ fontSize: 8.5, color: 'var(--text-muted)' }}>({item.type})</span>
                  </div>

                  <div style={{ flex: 1, position: 'relative', height: 8, background: 'rgba(255,255,255,0.06)', borderRadius: 4, overflow: 'hidden' }}>
                    <div 
                      style={{ 
                        width: `${Math.min(100, (item.weightPct / 35.0) * 100)}%`, 
                        height: '100%', 
                        background: barColor, 
                        borderRadius: 4, 
                        transition: 'width 0.4s' 
                      }} 
                    />
                  </div>

                  <div style={{ width: 60, textAlign: 'right' }}>
                    <span className="mono font-bold" style={{ fontSize: 11, color: barColor }}>
                      %{item.weightPct.toFixed(1)}
                    </span>
                  </div>

                  <div style={{ width: 115, textAlign: 'right' }}>
                    {item.isGold ? (
                      <span className="nav-badge gold" style={{ fontSize: 9, padding: '1px 6px' }}>🟡 Kalkan</span>
                    ) : isOver ? (
                      <span className="nav-badge red" style={{ fontSize: 9, padding: '1px 6px' }}>🚨 &gt;%{capHard} Aşım</span>
                    ) : isWarn ? (
                      <span className="nav-badge amber" style={{ fontSize: 9, padding: '1px 6px' }}>⚖️ &gt;%{capSoft} Tavan</span>
                    ) : (
                      <span className="nav-badge cyan" style={{ fontSize: 9, padding: '1px 6px' }}>🟢 Dengeli</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 📋 ORTAK TABLO BÖLÜMÜ: ARAMA & POZİSYON LİSTESİ                            */}
      {/* ========================================================================= */}
      
      {/* Top Action Bar */}
      <div className="table-action-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div className="search-box" style={{ width: 340 }}>
          <Search size={14} className="search-icon" />
          <input
            type="text"
            placeholder={activeMainTab === 'equity' ? "🔍 Hisse veya ETF Ara (NVDA, BYDNR...)" : "🔍 Varlık Ara (Sembol, Unvan veya Tür)..."}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="action-btns" style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button
            type="button"
            className="chip-btn"
            onClick={() => fetchMarketData && fetchMarketData()}
            disabled={isUpdatingMarket}
            title="Tüm hisse canlı fiyatlarını ve kurları Yahoo Finance üzerinden derhal tazele"
            style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: 6, 
              fontSize: 11, 
              padding: '6px 12px',
              borderRadius: 6,
              background: isUpdatingMarket ? 'rgba(0, 229, 255, 0.15)' : 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(0, 229, 255, 0.3)',
              color: 'var(--cyan)',
              cursor: isUpdatingMarket ? 'wait' : 'pointer'
            }}
          >
            <RefreshCw size={12} className={isUpdatingMarket ? 'spin-icon' : ''} style={{ animation: isUpdatingMarket ? 'spin 1s linear infinite' : 'none' }} />
            <span>{isUpdatingMarket ? 'Fiyatlar Alınıyor...' : 'Canlı Fiyatları Yenile'}</span>
          </button>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            <strong>{displayedHoldings.length}</strong> pozisyon listeleniyor {activeMainTab === 'equity' ? '(Hisse & ETF)' : (selectedSegment !== 'all' && `(${segmentStats[selectedSegment]?.shortLabel})`)}
          </span>
          <button
            type="button"
            className="btn-primary"
            onClick={onOpenAddModal}
          >
            <Plus size={14} />
            <span>{activeMainTab === 'equity' ? 'Yeni Hisse / ETF Ekle' : 'Yeni Pozisyon Ekle'}</span>
          </button>
        </div>
      </div>

      {/* Holdings Table */}
      <div className="card table-card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <div className="table-responsive terminal-table-scroll" style={{ maxHeight: 'calc(100vh - 230px)', minHeight: '380px', overflow: 'auto' }}>
          <table className="terminal-table sticky-header-table">
            <thead>
              {activeMainTab === 'equity' && tableSubMode === 'unified' && (
                <tr style={{ userSelect: 'none' }}>
                  <th onClick={() => handleSort('ticker')} style={{ cursor: 'pointer', minWidth: '150px' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center' }}>
                      <span>Varlık & Tür</span>
                      {renderSortIndicator('ticker')}
                    </div>
                  </th>
                  <th onClick={() => handleSort('weight')} className="text-right" style={{ cursor: 'pointer', minWidth: '95px' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', width: '100%' }}>
                      <span>Sepet Payı</span>
                      {renderSortIndicator('weight')}
                    </div>
                  </th>
                  <th onClick={() => handleSort('shares')} className="text-right" style={{ cursor: 'pointer', minWidth: '115px' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', width: '100%' }}>
                      <span>Adet & Ort. Maliyet</span>
                      {renderSortIndicator('shares')}
                    </div>
                  </th>
                  <th onClick={() => handleSort('price')} className="text-right" style={{ cursor: 'pointer', minWidth: '115px' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', width: '100%' }}>
                      <span>Canlı Fiyat • 24s</span>
                      {renderSortIndicator('price')}
                    </div>
                  </th>
                  <th onClick={() => handleSort('val')} className="text-right" style={{ cursor: 'pointer', minWidth: '105px' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', width: '100%' }}>
                      <span>Piyasa Değeri</span>
                      {renderSortIndicator('val')}
                    </div>
                  </th>
                  <th onClick={() => handleSort('return')} className="text-right" style={{ cursor: 'pointer', minWidth: '115px' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', width: '100%' }}>
                      <span>Net K/Z • Toplam %</span>
                      {renderSortIndicator('return')}
                    </div>
                  </th>
                  <th onClick={() => handleSort('quant')} style={{ cursor: 'pointer', textAlign: 'center', minWidth: '160px' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
                      <span>Quant & Model Sinyali</span>
                      {renderSortIndicator('quant')}
                    </div>
                  </th>
                  <th className="text-right" style={{ minWidth: '120px' }}>Hızlı İşlem</th>
                </tr>
              )}

              {activeMainTab === 'equity' && tableSubMode === 'rebalance' && (
                <tr style={{ userSelect: 'none' }}>
                  <th onClick={() => handleSort('ticker')} style={{ cursor: 'pointer' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center' }}>
                      <span>Hisse / ETF</span>
                      {renderSortIndicator('ticker')}
                    </div>
                  </th>
                  <th>Kategori</th>
                  <th onClick={() => handleSort('weight')} className="text-right" style={{ cursor: 'pointer' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', width: '100%' }}>
                      <span>Portföy Payı</span>
                      {renderSortIndicator('weight')}
                    </div>
                  </th>
                  <th onClick={() => handleSort('quant')} className="text-center" style={{ cursor: 'pointer' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
                      <span>Quant Skoru</span>
                      {renderSortIndicator('quant')}
                    </div>
                  </th>
                  <th className="text-center">Önerilen Aksiyon</th>
                  <th>Gerekçe & Portföy Rehberliği</th>
                  <th className="text-right" style={{ minWidth: '110px' }}>Hızlı İşlem</th>
                </tr>
              )}

              {activeMainTab === 'equity' && tableSubMode === 'finvest' && (
                <tr style={{ userSelect: 'none' }}>
                  <th onClick={() => handleSort('ticker')} style={{ cursor: 'pointer', minWidth: '150px' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center' }}>
                      <span>Varlık & Şirket</span>
                      {renderSortIndicator('ticker')}
                    </div>
                  </th>
                  <th onClick={() => handleSort('ring')} style={{ cursor: 'pointer', minWidth: '170px' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center' }}>
                      <span>3-Halka Bilanço Sınıfı</span>
                      {renderSortIndicator('ring')}
                    </div>
                  </th>
                  <th onClick={() => handleSort('weight')} className="text-right" style={{ cursor: 'pointer', minWidth: '95px' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', width: '100%' }}>
                      <span>Sepet Payı</span>
                      {renderSortIndicator('weight')}
                    </div>
                  </th>
                  <th onClick={() => handleSort('buyback')} className="text-right" style={{ cursor: 'pointer', minWidth: '120px' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', width: '100%' }}>
                      <span>Net Buyback Verimi</span>
                      {renderSortIndicator('buyback')}
                    </div>
                  </th>
                  <th onClick={() => handleSort('dividend')} className="text-right" style={{ cursor: 'pointer', minWidth: '105px' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', width: '100%' }}>
                      <span>Temettü Verimi</span>
                      {renderSortIndicator('dividend')}
                    </div>
                  </th>
                  <th onClick={() => handleSort('yield')} className="text-right" style={{ cursor: 'pointer', minWidth: '130px' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', width: '100%' }}>
                      <span>Toplam Hissedar Getirisi</span>
                      {renderSortIndicator('yield')}
                    </div>
                  </th>
                  <th onClick={() => handleSort('solvency')} className="text-center" style={{ cursor: 'pointer', minWidth: '130px' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
                      <span>Bilanço & Solvency</span>
                      {renderSortIndicator('solvency')}
                    </div>
                  </th>
                  <th className="text-right" style={{ minWidth: '110px' }}>Hızlı İşlem</th>
                </tr>
              )}

              {(activeMainTab === 'all' || (activeMainTab === 'equity' && tableSubMode === 'financial')) && (
                <tr style={{ userSelect: 'none' }}>
                  <th onClick={() => handleSort('ticker')} style={{ cursor: 'pointer' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center' }}>
                      <span>Varlık</span>
                      {renderSortIndicator('ticker')}
                    </div>
                  </th>
                  <th onClick={() => handleSort('type')} style={{ cursor: 'pointer' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center' }}>
                      <span>Tür</span>
                      {renderSortIndicator('type')}
                    </div>
                  </th>
                  <th onClick={() => handleSort('weight')} className="text-right" style={{ cursor: 'pointer', minWidth: '95px' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', width: '100%' }}>
                      <span>Sepet Payı</span>
                      {renderSortIndicator('weight')}
                    </div>
                  </th>
                  <th onClick={() => handleSort('shares')} className="text-right" style={{ cursor: 'pointer' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', width: '100%' }}>
                      <span>Adet</span>
                      {renderSortIndicator('shares')}
                    </div>
                  </th>
                  <th onClick={() => handleSort('cost')} className="text-right" style={{ cursor: 'pointer' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', width: '100%' }}>
                      <span>Ort. Maliyet</span>
                      {renderSortIndicator('cost')}
                    </div>
                  </th>
                  <th onClick={() => handleSort('price')} className="text-right" style={{ cursor: 'pointer' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', width: '100%' }}>
                      <span>Canlı Fiyat</span>
                      {renderSortIndicator('price')}
                    </div>
                  </th>
                  <th onClick={() => handleSort('change')} className="text-right" style={{ cursor: 'pointer' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', width: '100%' }}>
                      <span>24s Değişim & K/Z</span>
                      {renderSortIndicator('change')}
                    </div>
                  </th>
                  <th onClick={() => handleSort('val')} className="text-right" style={{ cursor: 'pointer' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', width: '100%' }}>
                      <span>Piyasa Değeri</span>
                      {renderSortIndicator('val')}
                    </div>
                  </th>
                  <th onClick={() => handleSort('profit')} className="text-right" style={{ cursor: 'pointer' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', width: '100%' }}>
                      <span>Açık Kâr / Zarar</span>
                      {renderSortIndicator('profit')}
                    </div>
                  </th>
                  <th onClick={() => handleSort('return')} className="text-right" style={{ cursor: 'pointer' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', width: '100%' }}>
                      <span>Getiri %</span>
                      {renderSortIndicator('return')}
                    </div>
                  </th>
                  <th className="text-right" style={{ minWidth: '150px' }}>İşlemler</th>
                </tr>
              )}
            </thead>
            <tbody>
              {displayedHoldings.map(h => {
                const isProfit = (isTRY ? h.profitTRY : h.profitUSD) >= 0;
                const profitVal = isTRY ? h.profitTRY : h.profitUSD;
                const totalVal = isTRY ? h.valTRY : h.valUSD;
                const changeUp = (h.changePct || 0) >= 0;
                const dayPLVal = isTRY ? (h.dayPLTRY || 0) : (h.dayPLUSD || 0);
                const dayPLUp = dayPLVal >= 0;

                // Price display with native currency note
                const displayedPrice = isTRY ? h.livePriceTRY : h.livePriceUSD;
                const altPrice = isTRY ? h.livePriceUSD : h.livePriceTRY;

                // Cost display
                const displayedCost = isTRY ? (h.costTRY / (h.shares || 1)) : (h.costUSD / (h.shares || 1));
                const altCost = isTRY ? (h.costUSD / (h.shares || 1)) : (h.costTRY / (h.shares || 1));

                const reb = rebalanceMap[h.id] || rebalanceMap[(h.ticker || '').toUpperCase()];
                const weightPct = reb?.weightPct || (((h.valTRY || 0) / totalValAll) * 100);

                const cleanSym = (h.ticker || '').toUpperCase().replace('.IS', '').replace('-USD', '');
                const isGold = h.type === 'Altın' || h.type === 'Emtia' || cleanSym === 'XAUT' || cleanSym.includes('GOLD');
                const isCrypto = h.type === 'Kripto' || KNOWN_CRYPTO_SET.has(cleanSym);

                const capSoft = isGold ? 20.0 : (isCrypto ? 5.0 : 7.5);
                const capHard = isGold ? 25.0 : (isCrypto ? 7.5 : 10.0);

                // ==========================================
                // 1. UNIFIED SUPER TABLE VIEW (Hisse-ETF)
                // ==========================================
                if (activeMainTab === 'equity' && tableSubMode === 'unified') {
                  return (
                    <React.Fragment key={h.id}>
                      <tr className="table-row">
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            <div className="ticker-cell">
                              <strong className="ticker-symbol mono">{h.ticker}</strong>
                              <span className="ticker-desc">{h.name || h.ticker}</span>
                            </div>
                            <span className={`badge-type ${h.type?.toLowerCase() || 'hisse'}`} style={{ fontSize: 9, padding: '1px 5px' }}>
                              {reb?.category || h.type}
                            </span>
                            {reb?.sector && (
                              <span 
                                className="nav-badge" 
                                style={{ 
                                  fontSize: 8.5, 
                                  padding: '1px 5px', 
                                  background: `${reb.sector.color}18`, 
                                  color: reb.sector.color, 
                                  border: `1px solid ${reb.sector.color}40`,
                                  fontWeight: 700 
                                }}
                                title={`${reb.sector.name} (Sektör Tavanı: %${reb.sector.targetCapPct})`}
                              >
                                {reb.sector.icon} {reb.sector.shortName}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="text-right">
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                            <div className="mono font-bold" style={{ fontSize: 12, color: weightPct > 10.0 ? '#ef4444' : (weightPct > 7.5 ? '#f59e0b' : '#f8fafc') }}>
                              %{weightPct.toFixed(1)}
                            </div>
                            <div 
                              style={{ width: 62, height: 4.5, background: 'rgba(255,255,255,0.08)', borderRadius: 2, position: 'relative', overflow: 'hidden' }}
                              title={`Sepet Payı: %${weightPct.toFixed(1)} • İdeal Tavan: %7.5 • Sert Tavan: %10.0 • Sınıf İçi Payı: %${(reb?.internalSharePct || 0).toFixed(1)}`}
                            >
                              <div 
                                style={{ 
                                  width: `${Math.min(100, (weightPct / 10.0) * 100)}%`, 
                                  height: '100%', 
                                  background: weightPct > 10.0 ? '#ef4444' : (weightPct > 7.5 ? '#f59e0b' : 'var(--cyan)'), 
                                  borderRadius: 2 
                                }} 
                              />
                            </div>
                            <div style={{ fontSize: 8.5, fontWeight: 700, marginTop: 1 }}>
                              {weightPct > 10.0 ? (
                                <span style={{ color: '#ef4444' }}>⚠️ &gt;%10 Aşım</span>
                              ) : weightPct > 7.5 ? (
                                <span style={{ color: '#f59e0b' }}>⚖️ &gt;%7.5 Tavan</span>
                              ) : (
                                <span style={{ color: 'var(--text-muted)' }}>Max %7.5</span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="text-right mono">
                          <div className="font-medium" style={{ fontSize: 12 }}>{fmtShares(h.shares)}</div>
                          <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                            {sym}{fmt(displayedCost, 2)}
                          </div>
                          {(h.quoteCurrency === 'USD' || h.isHoldingUSD) && isTRY && (
                            <div style={{ fontSize: 9, color: 'var(--text-muted)', opacity: 0.85 }}>
                              (${fmt(altCost, 2)})
                            </div>
                          )}
                          {!isTRY && (h.quoteCurrency === 'TRY' || !h.isHoldingUSD) && (
                            <div style={{ fontSize: 9, color: 'var(--text-muted)', opacity: 0.85 }}>
                              (₺{fmt(altCost, 2)})
                            </div>
                          )}
                        </td>
                        <td className="text-right mono">
                          <div className="font-bold text-bright" style={{ fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            {h.isManualPrice && (
                              <span 
                                title={`Manuel Kilitli Fiyat (${h.manual_price} ${h.currency || 'TRY'}). Düzenle modalından canlı API'ye dönebilirsiniz.`} 
                                style={{ fontSize: 8.5, padding: '1px 4px', borderRadius: 3, background: 'rgba(245, 158, 11, 0.2)', color: '#fbbf24', border: '1px solid rgba(245, 158, 11, 0.4)' }}
                              >
                                🔒 Kilitli
                              </span>
                            )}
                            <span>{sym}{fmt(displayedPrice, 2)}</span>
                          </div>
                          {(h.quoteCurrency === 'USD' || h.isHoldingUSD) && isTRY && (
                            <div style={{ fontSize: 9.5, color: 'var(--cyan)', fontWeight: 600 }}>
                              (${fmt(altPrice, 2)})
                            </div>
                          )}
                          {!isTRY && (h.quoteCurrency === 'TRY' || !h.isHoldingUSD) && (
                            <div style={{ fontSize: 9.5, color: 'var(--cyan)', fontWeight: 600 }}>
                              (₺{fmt(altPrice, 2)})
                            </div>
                          )}
                          <div style={{ fontSize: 10, color: changeUp ? 'var(--up)' : 'var(--down)', fontWeight: 700, marginTop: 1 }}>
                            {changeUp ? '24s ▲ +' : '24s ▼ '}{Math.abs(h.changePct || 0).toFixed(2)}%
                          </div>
                        </td>
                        <td className="text-right mono font-bold text-cyan" style={{ fontSize: 13 }}>
                          {sym}{fmt(totalVal, 2)}
                        </td>
                        <td className="text-right mono">
                          <div style={{ fontSize: 11.5, fontWeight: 700, color: isProfit ? 'var(--up)' : 'var(--down)' }}>
                            {isProfit ? '+' : ''}{sym}{fmt(profitVal, 2)}
                          </div>
                          <span className={`return-badge ${isProfit ? 'up' : 'down'}`} style={{ fontSize: 9.5, padding: '1px 5px' }} title="Alış maliyetine göre toplam portföy kâr/zararı">
                            Toplam {isProfit ? '+' : ''}%{fmt(h.returnPct, 1)}
                          </span>
                        </td>
                        <td className="text-center">
                          <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                            <button
                              type="button"
                              onClick={() => setExpandedRebalanceId(expandedRebalanceId === h.id ? null : h.id)}
                              className={`nav-badge ${reb?.badgeColor || 'cyan'}`}
                              style={{ 
                                fontSize: 10, 
                                padding: '3px 8px', 
                                cursor: 'pointer', 
                                border: '1px solid currentColor',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4
                              }}
                              title="Gerekçeyi ve rehberliği görmek için tıklayın"
                            >
                              <span>{reb?.actionTitle || '🛡️ TUT / KORU'}</span>
                              <span style={{ opacity: 0.65, fontSize: 8.5 }}>{expandedRebalanceId === h.id ? '▲' : '▼'}</span>
                            </button>
                            <div style={{ fontSize: 9.5, color: 'var(--text-muted)' }}>
                              Quant: <strong className="mono text-cyan">{reb?.quantScore?.toFixed(1) || '78.0'}</strong>
                            </div>
                          </div>
                        </td>
                        <td className="text-right">
                          <div className="row-actions">
                            <button
                              type="button"
                              className="chip-btn"
                              onClick={() => {
                                if (onSelectStockForChart) onSelectStockForChart(h.ticker);
                                else if (setActiveTab) setActiveTab('pro_chart');
                              }}
                              title="Pro Canlı TradingView Grafiğini Aç"
                              style={{ background: 'rgba(0, 229, 255, 0.1)', color: 'var(--cyan)', border: '1px solid rgba(0, 229, 255, 0.3)', padding: '3px 6px', borderRadius: 4, display: 'inline-flex', alignItems: 'center', gap: 2, fontSize: 10 }}
                            >
                              <LineChart size={11} />
                              <span>Grafik</span>
                            </button>
                            <button
                              type="button"
                              className="btn-action-row buy"
                              onClick={() => onOpenAddModal && onOpenAddModal(h.ticker)}
                              title="Ek alım yap"
                              style={{ background: 'rgba(0, 229, 255, 0.12)', color: 'var(--cyan)', border: '1px solid rgba(0, 229, 255, 0.3)', padding: '3px 6px', borderRadius: 4, display: 'inline-flex', alignItems: 'center', gap: 2, fontSize: 10 }}
                            >
                              <Plus size={11} />
                              <span>Al</span>
                            </button>
                            <button
                              type="button"
                              className="btn-action-row sell"
                              onClick={() => onOpenSellModal(h)}
                              title="Kısmi Satış Yap (Kârı Deftere İşle)"
                              style={{ padding: '3px 6px', fontSize: 10 }}
                            >
                              <ShoppingCart size={11} />
                              <span>Sat</span>
                            </button>
                            <button
                              type="button"
                              className="btn-action-row edit"
                              onClick={() => onOpenEditModal(h)}
                              title="Düzenle"
                              style={{ padding: '3px 5px' }}
                            >
                              <Edit3 size={11} />
                            </button>
                            <button
                              type="button"
                              className="btn-action-row delete"
                              onClick={() => {
                                if (window.confirm(`${h.ticker} pozisyonunu silmek istediğinize emin misiniz?`)) {
                                  deleteHolding(h.id);
                                }
                              }}
                              title="Sil"
                              style={{ padding: '3px 5px' }}
                            >
                              <Trash2 size={11} />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Expandable Rebalance Rationale Row */}
                      {expandedRebalanceId === h.id && (
                        <tr style={{ background: 'rgba(0, 229, 255, 0.04)', borderBottom: '1px solid rgba(0, 229, 255, 0.2)' }}>
                          <td colSpan={8} style={{ padding: '10px 16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, maxWidth: '80%' }}>
                                <span style={{ fontSize: 14 }}>💡</span>
                                <div>
                                  <div style={{ fontSize: 11, fontWeight: 700, color: '#e2e8f0' }}>
                                    <strong style={{ color: 'var(--cyan)' }}>Model Analizi ({reb?.actionTitle}): </strong>
                                    {reb?.reason}
                                  </div>
                                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
                                    Kural: Tek hisse ideal tavanı %7.5 (sert üst sınır %10.0, kurumsal UCITS kuralı). Sektör tavanı aşıldığında yeni alım kilitlenir. Quant skoru ≥82 alım, &lt;65 model dışı bölgesidir.
                                  </div>
                                </div>
                              </div>

                              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                                {reb?.action?.startsWith('TRIM') && (
                                  <button
                                    type="button"
                                    className="btn-action-row sell"
                                    onClick={() => onOpenSellModal(h)}
                                    style={{ padding: '3px 9px', fontSize: 10.5 }}
                                  >
                                    Kâr Al / Satış Yap ➔
                                  </button>
                                )}
                                {reb?.action === 'ACCUMULATE' && (
                                  <button
                                    type="button"
                                    className="chip-btn"
                                    onClick={() => onOpenAddModal && onOpenAddModal(h.ticker)}
                                    style={{ background: 'rgba(16,185,129,0.15)', color: 'var(--emerald)', borderColor: 'var(--emerald)', padding: '3px 9px', fontSize: 10.5 }}
                                  >
                                    Yeni Lot Ekle ➔
                                  </button>
                                )}
                                <button
                                  type="button"
                                  className="chip-btn"
                                  onClick={() => setExpandedRebalanceId(null)}
                                  style={{ fontSize: 10, padding: '3px 8px' }}
                                >
                                  ✕ Kapat
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                }

                // ==========================================
                // 3. FİNVEST RÖNTGENİ TABLO GÖRÜNÜMÜ
                // ==========================================
                if (activeMainTab === 'equity' && tableSubMode === 'finvest') {
                  const fData = portfolioFinvestAnalysis.itemMap[h.id] || portfolioFinvestAnalysis.itemMap[clean] || portfolioFinvestAnalysis.itemMap[symUpper] || {
                    ring: 2,
                    ringLabel: '2. Halka: Kritik Tedarikçi',
                    ringBadge: 'amber',
                    netBuybackYield: 0,
                    dividendYield: 0,
                    totalShareholderYield: 0,
                    solvencyScore: 78,
                    debtToEquity: 50,
                    diagnosis: 'Dengeli bilanço'
                  };

                  return (
                    <tr key={h.id} className="table-row">
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <div className="ticker-cell">
                            <strong className="ticker-symbol mono">{h.ticker}</strong>
                            <span className="ticker-desc">{h.name || h.ticker}</span>
                          </div>
                          <span className={`badge-type ${h.type?.toLowerCase() || 'hisse'}`} style={{ fontSize: 9, padding: '1px 5px' }}>
                            {reb?.category || h.type}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          <span 
                            className={`nav-badge ${fData.ringBadge}`} 
                            style={{ fontSize: 9.5, padding: '2px 7px', fontWeight: 800, width: 'fit-content' }}
                          >
                            {fData.ring === 1 ? '🟢 1. Halka: Nakit Kalesi' : (fData.ring === 2 ? '🟡 2. Halka: Kritik Altyapı' : '🔴 3. Halka: Borçla Büyüyen')}
                          </span>
                          <span style={{ fontSize: 9, color: 'var(--text-muted)', lineHeight: 1.25, maxWidth: 220 }}>
                            {fData.diagnosis}
                          </span>
                        </div>
                      </td>
                      <td className="text-right">
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                          <div className="mono font-bold" style={{ fontSize: 12, color: weightPct > 10.0 ? '#ef4444' : (weightPct > 7.5 ? '#f59e0b' : '#f8fafc') }}>
                            %{weightPct.toFixed(1)}
                          </div>
                          <div 
                            style={{ width: 54, height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden' }}
                            title={`Sepet Payı: %${weightPct.toFixed(1)}`}
                          >
                            <div 
                              style={{ 
                                width: `${Math.min(100, (weightPct / 10.0) * 100)}%`, 
                                height: '100%', 
                                background: fData.ring === 1 ? 'var(--emerald)' : (fData.ring === 2 ? 'var(--amber)' : 'var(--red)'), 
                                borderRadius: 2 
                              }} 
                            />
                          </div>
                        </div>
                      </td>
                      <td className="text-right mono">
                        <strong style={{ color: fData.netBuybackYield > 0 ? 'var(--emerald)' : (fData.netBuybackYield < 0 ? 'var(--red)' : 'var(--text-muted)'), fontSize: 12 }}>
                          {fData.netBuybackYield > 0 ? '+' : ''}{fData.netBuybackYield.toFixed(2)}%
                        </strong>
                        <div style={{ fontSize: 8.5, color: 'var(--text-muted)' }}>
                          {fData.netBuybackYield > 0 ? 'İtfa / Alım' : (fData.netBuybackYield < 0 ? 'Seyrelme (SBC)' : 'Sabit Lot')}
                        </div>
                      </td>
                      <td className="text-right mono">
                        <strong style={{ color: fData.dividendYield > 0 ? 'var(--gold)' : 'var(--text-muted)', fontSize: 12 }}>
                          %{fData.dividendYield.toFixed(2)}
                        </strong>
                        <div style={{ fontSize: 8.5, color: 'var(--text-muted)' }}>
                          {fData.dividendYield >= 4.0 ? 'Yüksek Nakit' : (fData.dividendYield > 0 ? 'Düzenli' : 'Temettüsüz')}
                        </div>
                      </td>
                      <td className="text-right mono">
                        <span 
                          className="nav-badge" 
                          style={{ 
                            fontSize: 10.5, 
                            fontWeight: 800, 
                            padding: '3px 8px',
                            background: fData.totalShareholderYield >= 2.0 ? 'rgba(16, 185, 129, 0.15)' : (fData.totalShareholderYield < 0 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(0, 229, 255, 0.12)'),
                            color: fData.totalShareholderYield >= 2.0 ? 'var(--emerald)' : (fData.totalShareholderYield < 0 ? 'var(--red)' : 'var(--cyan)'),
                            border: `1px solid ${fData.totalShareholderYield >= 2.0 ? 'rgba(16, 185, 129, 0.4)' : (fData.totalShareholderYield < 0 ? 'rgba(239, 68, 68, 0.4)' : 'rgba(0, 229, 255, 0.3)')}`
                          }}
                        >
                          {fData.totalShareholderYield >= 0 ? '+' : ''}{fData.totalShareholderYield.toFixed(2)}% / Yıl
                        </span>
                        <div style={{ fontSize: 8.5, color: 'var(--text-muted)', marginTop: 2 }}>
                          Buyback + Temettü
                        </div>
                      </td>
                      <td className="text-center">
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                          <strong className="mono" style={{ fontSize: 12, color: fData.solvencyScore >= 85 ? 'var(--emerald)' : (fData.solvencyScore >= 70 ? 'var(--cyan)' : 'var(--red)') }}>
                            {fData.solvencyScore} / 100
                          </strong>
                        </div>
                        <div style={{ fontSize: 8.5, color: 'var(--text-muted)' }}>
                          Borç/Özkaynak: %{fData.debtToEquity.toFixed(0)}
                        </div>
                      </td>
                      <td className="text-right">
                        <div style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}>
                          {(onSelectStockForAnalysis || onSelectStockForChart) && (
                            <button
                              type="button"
                              className="chip-btn"
                              onClick={() => {
                                const t = h.clean_ticker || h.ticker;
                                if (onSelectStockForAnalysis) onSelectStockForAnalysis(t);
                                else if (onSelectStockForChart) onSelectStockForChart(t);
                                else if (setActiveTab) setActiveTab('single_stock');
                              }}
                              style={{ padding: '3px 6px', fontSize: 10, color: 'var(--cyan)', borderColor: 'rgba(0,229,255,0.3)' }}
                              title="Tekil Hisse Analizinde Aç (Bilanço & Solvency Röntgeni)"
                            >
                              🔍 Röntgen
                            </button>
                          )}
                          <button
                            type="button"
                            className="chip-btn"
                            onClick={() => onOpenSellModal(h)}
                            style={{ padding: '3px 6px', fontSize: 10 }}
                            title="Pozisyonu Sat / Azalt"
                          >
                            <ShoppingCart size={11} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                }

                // ==========================================
                // 2. REBALANCE & SİNYAL TABLO GÖRÜNÜMÜ
                // ==========================================
                if (activeMainTab === 'equity' && tableSubMode === 'rebalance') {
                  return (
                    <tr key={h.id} className="table-row">
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <div className="ticker-cell">
                            <strong className="ticker-symbol mono">{h.ticker}</strong>
                            <span className="ticker-desc">{h.name || h.ticker}</span>
                          </div>
                          {reb?.sector && (
                            <span 
                              className="nav-badge" 
                              style={{ 
                                fontSize: 8.5, 
                                padding: '1px 5px', 
                                background: `${reb.sector.color}18`, 
                                color: reb.sector.color, 
                                border: `1px solid ${reb.sector.color}40`,
                                fontWeight: 700 
                              }}
                              title={`${reb.sector.name} (Sektör Tavanı: %${reb.sector.targetCapPct})`}
                            >
                              {reb.sector.icon} {reb.sector.shortName}
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        <span className="badge-type hisse" style={{ fontSize: 9.5 }}>{reb?.category || h.type}</span>
                      </td>
                      <td className="text-right">
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                          <div className="mono font-bold" style={{ fontSize: 11.5, color: weightPct > 10.0 ? '#ef4444' : (weightPct > 7.5 ? '#f59e0b' : '#f8fafc') }}>
                            %{weightPct.toFixed(1)}
                          </div>
                          <div 
                            style={{ width: 54, height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden' }}
                            title={`Sepet Payı: %${weightPct.toFixed(1)} • İdeal Tavan: %7.5 • Sert Tavan: %10.0 • Sektör: %${(reb?.sectorWeight || 0).toFixed(1)}`}
                          >
                            <div 
                              style={{ 
                                width: `${Math.min(100, (weightPct / 10.0) * 100)}%`, 
                                height: '100%', 
                                background: weightPct > 10.0 ? '#ef4444' : (weightPct > 7.5 ? '#f59e0b' : 'var(--cyan)'), 
                                borderRadius: 2 
                              }} 
                            />
                          </div>
                          <div style={{ fontSize: 8.5, fontWeight: 700 }}>
                            {weightPct > 10.0 ? (
                              <span style={{ color: '#ef4444' }}>⚠️ &gt;%10 Aşım</span>
                            ) : weightPct > 7.5 ? (
                              <span style={{ color: '#f59e0b' }}>⚖️ &gt;%7.5 Tavan</span>
                            ) : (
                              <span style={{ color: 'var(--text-muted)' }}>Max %7.5</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="text-center mono font-bold text-cyan">
                        {reb?.quantScore?.toFixed(1) || '78.0'}
                      </td>
                      <td className="text-center">
                        <span className={`nav-badge ${reb?.badgeColor || 'cyan'}`} style={{ fontSize: 9.5, padding: '2px 8px' }}>
                          {reb?.actionTitle || '🛡️ TUT / KORU'}
                        </span>
                      </td>
                      <td style={{ fontSize: 10.5, color: '#cbd5e1', maxWidth: 320, lineHeight: 1.4 }}>
                        {reb?.reason}
                      </td>
                      <td className="text-right">
                        {reb?.action?.startsWith('TRIM') && (
                          <button
                            type="button"
                            className="btn-action-row sell"
                            onClick={() => onOpenSellModal(h)}
                            style={{ padding: '3px 8px', fontSize: 10 }}
                          >
                            Satış Yap ➔
                          </button>
                        )}
                        {reb?.action === 'ACCUMULATE' && (
                          <button
                            type="button"
                            className="chip-btn"
                            onClick={() => onOpenAddModal && onOpenAddModal(h.ticker)}
                            style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--emerald)', border: '1px solid rgba(16,185,129,0.4)', padding: '3px 8px', borderRadius: 4, fontSize: 10 }}
                          >
                            Ekleme Yap ➔
                          </button>
                        )}
                        {reb?.action === 'HOLD' && (
                          <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Dengeli</span>
                        )}
                      </td>
                    </tr>
                  );
                }

                // ==========================================
                // 3. KLASİK FİNANSAL TABLO GÖRÜNÜMÜ (10 Sütun)
                // ==========================================
                return (
                  <tr key={h.id} className="table-row">
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <div className="ticker-cell">
                          <strong className="ticker-symbol mono">{h.ticker}</strong>
                          <span className="ticker-desc">{h.name || h.ticker}</span>
                        </div>
                        {reb?.sector && (
                          <span 
                            className="nav-badge" 
                            style={{ 
                              fontSize: 8.5, 
                              padding: '1px 5px', 
                              background: `${reb.sector.color}18`, 
                              color: reb.sector.color, 
                              border: `1px solid ${reb.sector.color}40`,
                              fontWeight: 700 
                            }}
                            title={`${reb.sector.name} (Sektör Tavanı: %${reb.sector.targetCapPct})`}
                          >
                            {reb.sector.icon} {reb.sector.shortName}
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className={`badge-type ${h.type?.toLowerCase() || 'hisse'}`}>
                        {h.type || 'Hisse'}
                      </span>
                    </td>
                    <td className="text-right">
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                        <div 
                          className="mono font-bold" 
                          style={{ 
                            fontSize: 12, 
                            color: isGold 
                              ? '#fbbf24' 
                              : (weightPct > capHard ? '#ef4444' : (weightPct > capSoft ? '#f59e0b' : '#f8fafc')) 
                          }}
                        >
                          %{weightPct.toFixed(1)}
                        </div>
                        <div 
                          style={{ width: 62, height: 4.5, background: 'rgba(255,255,255,0.08)', borderRadius: 2, position: 'relative', overflow: 'hidden' }}
                          title={`Sepet Payı: %${weightPct.toFixed(1)} • İdeal Tavan: %${capSoft} • Sert Tavan: %${capHard}`}
                        >
                          <div 
                            style={{ 
                              width: `${Math.min(100, (weightPct / capHard) * 100)}%`, 
                              height: '100%', 
                              background: isGold 
                                ? '#eab308' 
                                : (weightPct > capHard ? '#ef4444' : (weightPct > capSoft ? '#f59e0b' : 'var(--cyan)')), 
                              borderRadius: 2 
                            }} 
                          />
                        </div>
                        <div style={{ fontSize: 8.5, fontWeight: 700, marginTop: 1 }}>
                          {isGold ? (
                            <span style={{ color: '#fbbf24' }}>🛡️ Kalkan</span>
                          ) : weightPct > capHard ? (
                            <span style={{ color: '#ef4444' }}>⚠️ &gt;%{capHard} Aşım</span>
                          ) : weightPct > capSoft ? (
                            <span style={{ color: '#f59e0b' }}>⚖️ &gt;%{capSoft} Tavan</span>
                          ) : (
                            <span style={{ color: 'var(--text-muted)' }}>Max %{capSoft}</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="text-right mono font-medium">
                      {fmtShares(h.shares)}
                    </td>
                    <td className="text-right mono text-muted">
                      <div>
                        {sym}{fmt(displayedCost, 4)}
                      </div>
                      {(h.quoteCurrency === 'USD' || h.isHoldingUSD) && isTRY && (
                        <div style={{ fontSize: 9.5, color: 'var(--text-muted)', marginTop: 2 }}>
                          (${fmt(altCost, 4)})
                        </div>
                      )}
                      {!isTRY && (h.quoteCurrency === 'TRY' || !h.isHoldingUSD) && (
                        <div style={{ fontSize: 9.5, color: 'var(--text-muted)', marginTop: 2 }}>
                          (₺{fmt(altCost, 4)})
                        </div>
                      )}
                    </td>
                    <td className="text-right mono text-bright">
                      <div style={{ fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        {h.isManualPrice && (
                          <span 
                            title={`Manuel Kilitli Fiyat (${h.manual_price} ${h.currency || 'TRY'}). Düzenle modalından canlı API'ye dönebilirsiniz.`} 
                            style={{ fontSize: 8.5, padding: '1px 4px', borderRadius: 3, background: 'rgba(245, 158, 11, 0.2)', color: '#fbbf24', border: '1px solid rgba(245, 158, 11, 0.4)' }}
                          >
                            🔒 Kilitli
                          </span>
                        )}
                        <span>{sym}{fmt(displayedPrice, 4)}</span>
                      </div>
                      {(h.quoteCurrency === 'USD' || h.isHoldingUSD) && isTRY && (
                        <div style={{ fontSize: 9.5, color: 'var(--text-muted)', marginTop: 2 }}>
                          (${fmt(altPrice, 4)})
                        </div>
                      )}
                      {!isTRY && (h.quoteCurrency === 'TRY' || !h.isHoldingUSD) && (
                        <div style={{ fontSize: 9.5, color: 'var(--text-muted)', marginTop: 2 }}>
                          (₺{fmt(altPrice, 4)})
                        </div>
                      )}
                    </td>
                    <td className="text-right mono">
                      <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                        <span className={`change-pill ${changeUp ? 'up' : 'down'}`}>
                          {changeUp ? '▲ +' : '▼ '}{Math.abs(h.changePct || 0).toFixed(2)}%
                        </span>
                        <span style={{ fontSize: 10.5, fontWeight: 700, color: dayPLUp ? 'var(--up)' : 'var(--down)' }}>
                          {dayPLUp ? '+' : ''}{sym}{fmt(dayPLVal, 2)}
                        </span>
                      </div>
                    </td>
                    <td className="text-right mono text-cyan" style={{ fontWeight: 800 }}>
                      {sym}{fmt(totalVal, 2)}
                    </td>
                    <td className="text-right mono">
                      <span className={isProfit ? 'text-up' : 'text-down'} style={{ fontWeight: 700 }}>
                        {isProfit ? '+' : ''}{sym}{fmt(profitVal, 2)}
                      </span>
                    </td>
                    <td className="text-right mono">
                      <span className={`return-badge ${isProfit ? 'up' : 'down'}`}>
                        {isProfit ? '+' : ''}{fmt(h.returnPct, 2)}%
                      </span>
                    </td>
                    <td className="text-right">
                      <div className="row-actions">
                        <button
                          type="button"
                          className="btn-action-row buy"
                          onClick={() => onOpenAddModal && onOpenAddModal(h.ticker)}
                          title="Bu varlıktan ek alım yap (Ağırlıklı maliyet hesaplanır)"
                          style={{ background: 'rgba(0, 229, 255, 0.12)', color: 'var(--cyan)', border: '1px solid rgba(0, 229, 255, 0.3)', padding: '3px 7px', borderRadius: 4, display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 10.5 }}
                        >
                          <Plus size={11} />
                          <span>Al</span>
                        </button>
                        <button
                          type="button"
                          className="btn-action-row sell"
                          onClick={() => onOpenSellModal(h)}
                          title="Kısmi Satış Yap (Kârı Deftere İşle)"
                        >
                          <ShoppingCart size={12} />
                          <span>Sat</span>
                        </button>
                        <button
                          type="button"
                          className="btn-action-row edit"
                          onClick={() => onOpenEditModal(h)}
                          title="Pozisyonu Düzenle"
                        >
                          <Edit3 size={12} />
                        </button>
                        <button
                          type="button"
                          className="btn-action-row delete"
                          onClick={() => {
                            if (window.confirm(`${h.ticker} pozisyonunu silmek istediğinize emin misiniz?`)) {
                              deleteHolding(h.id);
                            }
                          }}
                          title="Sil"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {/* Sentetik Gram Altın Satırı (Yalnızca TÜM PORTFÖY modunda gösterilir) */}
              {activeMainTab === 'all' && ((portfolioSummary?.totalGrams) || 0) > 0 && (selectedSegment === 'all' || selectedSegment === 'shield') && (
                <tr className="table-row synthetic-gold">
                  <td>
                    <div className="ticker-cell">
                      <strong className="ticker-symbol mono text-gold">GRAM_ALTIN</strong>
                      <span className="ticker-desc">Fiziki / Banka Gram Altın Havuzu (Kur Kalkanı)</span>
                    </div>
                  </td>
                  <td><span className="badge-type altin">👑 Altın / Kalkan</span></td>
                  <td className="text-right mono text-gold">{fmt(portfolioSummary?.totalGrams, 2)} gr</td>
                  <td className="text-right mono text-muted">
                    ₺{fmt(portfolioSummary?.totalGrams > 0 ? (portfolioSummary?.totalGoldCostTRY / portfolioSummary?.totalGrams) : 0, 2)}
                  </td>
                  <td className="text-right mono text-gold">
                    ₺{fmt(portfolioSummary?.gramGoldPrice || gramGoldPrice, 2)}
                  </td>
                  <td className="text-right mono">
                    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                      <span className="change-pill up">▲ Kalkan</span>
                      <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                        Kur Sigortası
                      </span>
                    </div>
                  </td>
                  <td className="text-right mono text-gold" style={{ fontWeight: 800 }}>
                    {sym}{fmt(isTRY ? portfolioSummary?.totalGoldValTRY : (portfolioSummary?.totalGoldValTRY / (portfolioSummary?.usdtry || usdtry || 1)), 2)}
                  </td>
                  <td className="text-right mono">
                    <span className={(portfolioSummary?.goldProfitTRY || 0) >= 0 ? 'text-up' : 'text-down'} style={{ fontWeight: 700 }}>
                      {(portfolioSummary?.goldProfitTRY || 0) >= 0 ? '+' : ''}{sym}{fmt(isTRY ? portfolioSummary?.goldProfitTRY : ((portfolioSummary?.goldProfitTRY || 0) / (portfolioSummary?.usdtry || usdtry || 1)), 2)}
                    </span>
                  </td>
                  <td className="text-right mono">
                    <span className={`return-badge ${(portfolioSummary?.goldReturnPct || 0) >= 0 ? 'up' : 'down'}`}>
                      {(portfolioSummary?.goldReturnPct || 0) >= 0 ? '+' : ''}{fmt(portfolioSummary?.goldReturnPct, 2)}%
                    </span>
                  </td>
                  <td className="text-right">
                    <span className="nav-badge gold" style={{ fontSize: 10, padding: '2px 8px' }}>
                      Kalkan Havuzunda
                    </span>
                  </td>
                </tr>
              )}

              {/* Sentetik PPF Satırı (Yalnızca TÜM PORTFÖY modunda gösterilir) */}
              {activeMainTab === 'all' && ((portfolioSummary?.ppfBalanceTRY) || 0) > 0 && (selectedSegment === 'all' || selectedSegment === 'shield') && (
                <tr className="table-row synthetic-ppf">
                  <td>
                    <div className="ticker-cell">
                      <strong className="ticker-symbol mono text-emerald">PPF_FON</strong>
                      <span className="ticker-desc">Para Piyasası Fonları (Bileşik Faiz & Kuru Barut)</span>
                    </div>
                  </td>
                  <td><span className="badge-type ppf" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)' }}>🟢 PPF / Likit</span></td>
                  <td className="text-right mono text-emerald">1 Havuz</td>
                  <td className="text-right mono text-muted">
                    {sym}{fmt(isTRY ? portfolioSummary?.ppfBalanceTRY : ((portfolioSummary?.ppfBalanceTRY || 0) / (portfolioSummary?.usdtry || usdtry || 1)), 2)}
                  </td>
                  <td className="text-right mono text-emerald">
                    {sym}{fmt(isTRY ? portfolioSummary?.ppfBalanceTRY : ((portfolioSummary?.ppfBalanceTRY || 0) / (portfolioSummary?.usdtry || usdtry || 1)), 2)}
                  </td>
                  <td className="text-right mono">
                    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                      <span className="change-pill up">▲ Likit Getiri</span>
                      <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                        Risksiz Faiz
                      </span>
                    </div>
                  </td>
                  <td className="text-right mono text-emerald" style={{ fontWeight: 800 }}>
                    {sym}{fmt(isTRY ? portfolioSummary?.ppfBalanceTRY : ((portfolioSummary?.ppfBalanceTRY || 0) / (portfolioSummary?.usdtry || usdtry || 1)), 2)}
                  </td>
                  <td className="text-right mono">
                    <span className="text-up" style={{ fontWeight: 700 }}>
                      +{sym}0.00
                    </span>
                  </td>
                  <td className="text-right mono">
                    <span className="return-badge up">
                      +0.00%
                    </span>
                  </td>
                  <td className="text-right">
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end' }}>
                      <span className="nav-badge emerald" style={{ fontSize: 10, padding: '2px 8px' }}>
                        Kuru Barut
                      </span>
                      {onOpenPpfModal && (
                        <button
                          type="button"
                          className="btn-action-row edit"
                          onClick={onOpenPpfModal}
                          title="PPF Kuru Barut Bakiyesini Güncelle veya Sıfırla"
                          style={{ padding: '3px 8px', fontSize: 10.5, display: 'inline-flex', alignItems: 'center', gap: 4, background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.35)', borderRadius: 4 }}
                        >
                          <Edit3 size={11} />
                          <span>Düzenle / Sıfırla</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}

              {/* Sentetik Serbest Nakit Satırı (Yalnızca TÜM PORTFÖY modunda gösterilir) */}
              {activeMainTab === 'all' && ((portfolioSummary?.totalFreeCashTRY) || 0) > 0 && (selectedSegment === 'all' || selectedSegment === 'shield') && (
                <tr className="table-row synthetic-cash">
                  <td>
                    <div className="ticker-cell">
                      <strong className="ticker-symbol mono text-cyan">SERBEST_NAKİT</strong>
                      <span className="ticker-desc">Kullanılabilir Alım Gücü (TRY & USD Serbest Bakiye)</span>
                    </div>
                  </td>
                  <td><span className="badge-type nakit" style={{ background: 'rgba(6, 182, 212, 0.15)', color: '#06b6d4', border: '1px solid rgba(6, 182, 212, 0.3)' }}>💵 Serbest Nakit</span></td>
                  <td className="text-right mono text-cyan">Alım Gücü</td>
                  <td className="text-right mono text-muted">
                    {sym}{fmt(isTRY ? portfolioSummary?.totalFreeCashTRY : ((portfolioSummary?.totalFreeCashUSD) || 0), 2)}
                  </td>
                  <td className="text-right mono text-cyan">
                    {sym}{fmt(isTRY ? portfolioSummary?.totalFreeCashTRY : ((portfolioSummary?.totalFreeCashUSD) || 0), 2)}
                  </td>
                  <td className="text-right mono">
                    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                      <span className="change-pill up">● Hazır Nakit</span>
                      <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                        Dip Fırsatı
                      </span>
                    </div>
                  </td>
                  <td className="text-right mono text-cyan" style={{ fontWeight: 800 }}>
                    {sym}{fmt(isTRY ? portfolioSummary?.totalFreeCashTRY : ((portfolioSummary?.totalFreeCashUSD) || 0), 2)}
                  </td>
                  <td className="text-right mono">
                    <span className="text-muted" style={{ fontWeight: 700 }}>
                      {sym}0.00
                    </span>
                  </td>
                  <td className="text-right mono">
                    <span className="return-badge flat" style={{ background: 'rgba(148, 163, 184, 0.12)', color: '#94a3b8' }}>
                      0.00%
                    </span>
                  </td>
                  <td className="text-right">
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end' }}>
                      <span className="nav-badge cyan" style={{ fontSize: 10, padding: '2px 8px' }}>
                        Alıma Hazır
                      </span>
                      {onOpenCashModal && (
                        <button
                          type="button"
                          className="btn-action-row edit"
                          onClick={onOpenCashModal}
                          title="Serbest Nakit (TRY/USD) Bakiyesini Güncelle"
                          style={{ padding: '3px 8px', fontSize: 10.5, display: 'inline-flex', alignItems: 'center', gap: 4, background: 'rgba(6, 182, 212, 0.15)', color: 'var(--cyan)', border: '1px solid rgba(6, 182, 212, 0.35)', borderRadius: 4 }}
                        >
                          <Edit3 size={11} />
                          <span>Düzenle</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>

            {/* Grand Total Summary Row */}
            <tfoot>
              {(() => {
                const isEqMode = activeMainTab === 'equity';
                const activeStat = isEqMode ? segmentStats.equity : (segmentStats[selectedSegment] || segmentStats.all);
                const costVal = isTRY ? activeStat.costTRY : activeStat.costUSD;
                const totalVal = isTRY ? activeStat.valTRY : activeStat.valUSD;
                const profitVal = isTRY ? activeStat.profitTRY : activeStat.profitUSD;
                const dayPLVal = isTRY ? activeStat.dayPLTRY : activeStat.dayPLUSD;
                const isProf = profitVal >= 0;
                const isDayUp = dayPLVal >= 0;

                const label = isEqMode 
                  ? '🎯 ÇEKİRDEK HİSSE & ETF TOPLAMI' 
                  : (selectedSegment === 'all' ? '🎯 TÜM AÇIK PORTFÖY TOPLAMI' : `🎯 ${activeStat.shortLabel} TOPLAMI`);

                // 1. Unified Footnote (8 columns)
                if (isEqMode && tableSubMode === 'unified') {
                  return (
                    <tr style={{ background: '#090d16', borderTop: '2px solid rgba(0, 229, 255, 0.4)', fontWeight: 800 }}>
                      <td style={{ color: activeStat.color, paddingLeft: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap' }}>
                          <span style={{ fontWeight: 900, fontSize: 12 }}>{label}</span>
                          <span className="nav-badge cyan" style={{ fontSize: 9.5, padding: '2px 7px', fontWeight: 800 }}>
                            {displayedHoldings.length} Varlık
                          </span>
                        </div>
                      </td>
                      <td className="text-right mono text-bright" style={{ fontWeight: 800 }}>
                        %{activeStat.weightPct.toFixed(1)}
                      </td>
                      <td className="text-right mono text-muted" style={{ fontWeight: 800 }}>
                        <div>{sym}{fmt(costVal, 2)}</div>
                        <div style={{ fontSize: 8.5, color: 'var(--text-muted)', fontWeight: 500 }}>Maliyet</div>
                      </td>
                      <td className="text-right mono">
                        <span className={`change-pill ${activeStat.dayPLPct >= 0 ? 'up' : 'down'}`} style={{ fontSize: 9.5 }}>
                          {activeStat.dayPLPct >= 0 ? '▲ +' : '▼ '}{Math.abs(activeStat.dayPLPct || 0).toFixed(2)}%
                        </span>
                      </td>
                      <td className="text-right mono text-cyan" style={{ fontSize: 13, fontWeight: 900 }}>
                        {sym}{fmt(totalVal, 2)}
                      </td>
                      <td className="text-right mono" style={{ fontSize: 12, fontWeight: 800 }}>
                        <span className={isProf ? 'text-up' : 'text-down'}>
                          {isProf ? '+' : ''}{sym}{fmt(profitVal, 2)}
                        </span>
                        <div style={{ fontSize: 8.5, color: 'var(--text-muted)', fontWeight: 600, marginTop: 1 }}>
                          Açık K/Z
                        </div>
                        <div style={{ marginTop: 2 }}>
                          <span className={`return-badge ${activeStat.returnPct >= 0 ? 'up' : 'down'}`} style={{ fontSize: 9 }}>
                            {activeStat.returnPct >= 0 ? '+' : ''}{fmt(activeStat.returnPct, 1)}%
                          </span>
                        </div>
                      </td>
                      <td className="text-center">
                        <span className="nav-badge emerald" style={{ fontSize: 9.5, padding: '2px 8px' }}>
                          Quant: {weightedSnowflake.composite.toFixed(1)}
                        </span>
                      </td>
                      <td className="text-right">
                        <span className="nav-badge cyan" style={{ fontSize: 9.5 }}>
                          HİSSE & ETF
                        </span>
                      </td>
                    </tr>
                  );
                }

                // 2. Rebalance Footnote (7 columns)
                if (isEqMode && tableSubMode === 'rebalance') {
                  return (
                    <tr style={{ background: '#090d16', borderTop: '2px solid rgba(0, 229, 255, 0.4)', fontWeight: 800 }}>
                      <td colSpan={2} style={{ color: activeStat.color, paddingLeft: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontWeight: 900, fontSize: 12 }}>{label}</span>
                          <span className="nav-badge cyan" style={{ fontSize: 9.5, padding: '2px 7px' }}>
                            {displayedHoldings.length} Varlık
                          </span>
                        </div>
                      </td>
                      <td className="text-right mono text-bright">
                        %{activeStat.weightPct.toFixed(1)}
                      </td>
                      <td className="text-center mono text-cyan">
                        {weightedSnowflake.composite.toFixed(1)}
                      </td>
                      <td className="text-center">
                        <span className="nav-badge cyan" style={{ fontSize: 9.5, padding: '2px 7px' }}>
                          Dengelenmiş
                        </span>
                      </td>
                      <td style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                        {rebalanceSummary.trimCount} kâr alım, {rebalanceSummary.accumCount} biriktirme adayı
                      </td>
                      <td className="text-right">
                        <span className="nav-badge cyan" style={{ fontSize: 9.5 }}>Model Portföy</span>
                      </td>
                    </tr>
                  );
                }

                // Finvest Footnote (8 columns)
                if (isEqMode && tableSubMode === 'finvest') {
                  return (
                    <tr style={{ background: '#090d16', borderTop: '2px solid rgba(0, 229, 255, 0.4)', fontWeight: 800 }}>
                      <td style={{ color: activeStat.color, paddingLeft: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontWeight: 900, fontSize: 12 }}>{label}</span>
                          <span className="nav-badge cyan" style={{ fontSize: 9.5, padding: '2px 7px' }}>
                            {displayedHoldings.length} Varlık
                          </span>
                        </div>
                      </td>
                      <td>
                        <div style={{ fontSize: 9.5, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          <span style={{ color: 'var(--emerald)' }}>1. Halka: %{portfolioFinvestAnalysis.ring1Weight.toFixed(1)}</span>
                          <span style={{ color: 'var(--amber)' }}>2. Halka: %{portfolioFinvestAnalysis.ring2Weight.toFixed(1)}</span>
                          <span style={{ color: 'var(--red)' }}>3. Halka: %{portfolioFinvestAnalysis.ring3Weight.toFixed(1)}</span>
                        </div>
                      </td>
                      <td className="text-right mono text-bright">
                        %{activeStat.weightPct.toFixed(1)}
                      </td>
                      <td className="text-right mono text-emerald">
                        {portfolioFinvestAnalysis.weightedBuybackYield >= 0 ? '+' : ''}%{portfolioFinvestAnalysis.weightedBuybackYield.toFixed(2)}
                      </td>
                      <td className="text-right mono text-gold">
                        %{portfolioFinvestAnalysis.weightedDividendYield.toFixed(2)}
                      </td>
                      <td className="text-right mono text-cyan" style={{ fontSize: 12 }}>
                        %{portfolioFinvestAnalysis.weightedShareholderYield.toFixed(2)} / Yıl
                      </td>
                      <td className="text-center mono text-emerald">
                        {portfolioFinvestAnalysis.weightedSolvencyScore} / 100
                      </td>
                      <td className="text-right">
                        <span className="nav-badge cyan" style={{ fontSize: 9.5 }}>Solvency Röntgeni</span>
                      </td>
                    </tr>
                  );
                }

                // 3. Classical Financial Footnote (11 columns)
                const realProfitForFooter = (isTRY ? portfolioSummary?.realizedProfitTRY : portfolioSummary?.realizedProfitUSD) || 0;
                return (
                  <tr style={{ background: '#090d16', borderTop: '2px solid rgba(0, 229, 255, 0.4)', fontWeight: 800 }}>
                    <td colSpan={2} style={{ color: activeStat.color, letterSpacing: '0.4px', paddingLeft: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, whiteSpace: 'nowrap' }}>
                        <span style={{ fontWeight: 900, fontSize: 12 }}>{label}</span>
                        <span 
                          className="nav-badge" 
                          style={{ 
                            fontSize: 9.5, 
                            background: `${activeStat.color}22`, 
                            color: activeStat.color, 
                            border: `1px solid ${activeStat.color}55`,
                            padding: '2px 8px',
                            fontWeight: 800
                          }}
                        >
                          {displayedHoldings.length + (!isEqMode && (selectedSegment === 'all' || selectedSegment === 'shield') && ((portfolioSummary?.totalGrams) || 0) > 0 ? 1 : 0)} Varlık
                        </span>
                        {!isEqMode && selectedSegment === 'all' && (
                          <span 
                            className="nav-badge" 
                            style={{ 
                              fontSize: 9.5, 
                              background: `${totalSnowflakeTheme.color}22`, 
                              color: totalSnowflakeTheme.color, 
                              border: `1px solid ${totalSnowflakeTheme.color}55`,
                              padding: '2px 8px',
                              fontWeight: 800
                            }}
                          >
                            ❄️ Kar Tanesi: {totalSnowflake.composite.toFixed(1)}/100
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="text-right mono text-bright" style={{ fontWeight: 800 }}>
                      %{activeStat.weightPct.toFixed(1)}
                    </td>
                    <td className="text-right mono font-medium">--</td>
                    <td className="text-right mono text-muted" style={{ fontWeight: 800 }}>
                      <div>{sym}{fmt(costVal, 2)}</div>
                      <div style={{ fontSize: 8.5, color: 'var(--text-muted)', fontWeight: 500 }}>Top. Maliyet</div>
                    </td>
                    <td className="text-right mono text-muted">
                      --
                    </td>
                    <td className="text-right mono">
                      <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                        <span className={`change-pill ${activeStat.dayPLPct >= 0 ? 'up' : 'down'}`}>
                          {activeStat.dayPLPct >= 0 ? '▲ +' : '▼ '}{Math.abs(activeStat.dayPLPct || 0).toFixed(2)}%
                        </span>
                        <span style={{ fontSize: 10.5, fontWeight: 800, color: isDayUp ? 'var(--up)' : 'var(--down)' }}>
                          {isDayUp ? '+' : ''}{sym}{fmt(dayPLVal, 2)}
                        </span>
                      </div>
                    </td>
                    <td className="text-right mono text-cyan" style={{ fontSize: 13, fontWeight: 900 }}>
                      {sym}{fmt(totalVal, 2)}
                    </td>
                    <td className="text-right mono" style={{ fontSize: 12, fontWeight: 800 }}>
                      <span className={isProf ? 'text-up' : 'text-down'}>
                        {isProf ? '+' : ''}{sym}{fmt(profitVal, 2)}
                      </span>
                      <div style={{ fontSize: 8.5, color: 'var(--text-muted)', fontWeight: 600, marginTop: 1 }}>
                        Açık K/Z (Mevcut)
                      </div>
                      {selectedSegment === 'all' && !isEqMode && realProfitForFooter !== 0 && (
                        <div style={{ fontSize: 8.5, color: 'var(--emerald)', marginTop: 2, whiteSpace: 'nowrap' }} title="Daha önce satılan işlemlerden cebe giren realize kâr">
                          +{sym}{fmt(realProfitForFooter, 0)} Realize
                        </div>
                      )}
                    </td>
                    <td className="text-right mono" style={{ fontSize: 12, fontWeight: 800 }}>
                      <span className={`return-badge ${activeStat.returnPct >= 0 ? 'up' : 'down'}`}>
                        {activeStat.returnPct >= 0 ? '+' : ''}{fmt(activeStat.returnPct, 2)}%
                      </span>
                      {selectedSegment === 'all' && !isEqMode && (portfolioSummary?.consolidatedReturnPct || 0) !== 0 && (
                        <div style={{ fontSize: 8.5, color: 'var(--cyan)', marginTop: 2, whiteSpace: 'nowrap' }} title="Açık + Realize toplam konsolide getiri">
                          Konsolide: %{fmt(portfolioSummary?.consolidatedReturnPct, 1)}
                        </div>
                      )}
                    </td>
                    <td className="text-right">
                      <span className="nav-badge" style={{ fontSize: 9.5, background: `${activeStat.color}22`, color: activeStat.color, border: `1px solid ${activeStat.color}55` }}>
                        {isEqMode ? 'HİSSE & ETF' : activeStat.shortLabel}
                      </span>
                    </td>
                  </tr>
                );
              })()}
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
