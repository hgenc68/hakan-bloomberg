import React, { useState, useMemo } from 'react';
import { useApp, KNOWN_CRYPTO_SET } from '../context/AppContext';
import { 
  Search, ShoppingCart, Edit3, Trash2, Plus, ArrowUpDown, ArrowUp, ArrowDown, 
  Briefcase, Sparkles, AlertCircle, CheckCircle, ChevronDown, ChevronUp, 
  ArrowRight, ShieldCheck, PieChart, Layers, TrendingUp, BarChart3, Snowflake, Award, Target, Activity, Calendar
} from 'lucide-react';
import { Bar, Radar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import stocksData from '../data/stocksData.json';
import potentialStocksData from '../data/potentialStocksData.json';
import benchmarkData from '../data/benchmarkData.json';
import { getHealthColorTheme } from './RiskRadarTab';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Title,
  Tooltip,
  Legend
);

export default function HoldingsTab({ onOpenSellModal, onOpenEditModal, onOpenAddModal, onOpenCashModal }) {
  const { portfolioSummary, currentCurrency, deleteHolding, gramGoldPrice, usdtry, setActiveTab } = useApp();
  
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
  const [tableSubMode, setTableSubMode] = useState('unified'); // 'unified' | 'financial' | 'rebalance'
  const [expandedRebalanceId, setExpandedRebalanceId] = useState(null);

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
          benchmarkReturns.equity >= 0 ? '#10b981' : '#00e5ff',
          '#3b82f6',
          '#a855f7',
          '#ef4444',
          '#f59e0b'
        ],
        borderRadius: 5,
        borderWidth: 1,
        borderColor: [
          benchmarkReturns.equity >= 0 ? '#34d399' : '#38bdf8',
          '#60a5fa',
          '#c084fc',
          '#f87171',
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

  // Rebalance Assistant List
  const totalValAll = portfolioSummary?.totalValTRY || 1;
  const rebalanceList = useMemo(() => {
    return equityHoldings.map(h => {
      const symTicker = (h.ticker || '').toUpperCase();
      const clean = symTicker.replace('.IS', '').replace('-USD', '');
      const stockInfo = stocksData[clean] || stocksData[symTicker] || {};
      const potInfo = potentialStocksData?.stocks?.find(s => s.ticker === clean);
      const quantScore = stockInfo.analysis?.quant_score || potInfo?.conviction_score || 78.0;
      const isUS = h.currency === 'USD' || h.isHoldingUSD || Number(h.cost_rate) > 1.5;
      const category = h.type === 'ETF' ? 'Tematik ETF' : (isUS ? 'ABD Hisse' : 'BIST 100');
      const weightPct = ((h.valTRY || 0) / totalValAll) * 100;

      let action = 'HOLD';
      let badgeColor = 'cyan';
      let actionTitle = '🛡️ TUT / KORU';
      let reason = 'Mevcut ağırlık dengeli, büyüme ve bilanço yapısı hedeflerle uyumlu.';

      if (weightPct > 15.0) {
        action = 'TRIM';
        badgeColor = 'red';
        actionTitle = '🚪 KISMEN ÇIK / AZALT';
        reason = `Portföyün %${weightPct.toFixed(1)}'ini oluşturuyor. %7.5 tek varlık tavanını aştı; kâr alıp kalkanı güçlendirin.`;
      } else if (weightPct > 7.5) {
        action = 'TRIM_MILD';
        badgeColor = 'amber';
        actionTitle = '⚖️ AĞIRLIK AZALT';
        reason = `Mevcut pay (%${weightPct.toFixed(1)}) üst sınırda. Yeni ekleme yapmayın, kâr realizasyonunu değerlendirin.`;
      } else if (quantScore >= 82.0 && weightPct < 6.0) {
        action = 'ACCUMULATE';
        badgeColor = 'emerald';
        actionTitle = '✨ EKLE / BİRİKTİR';
        reason = `Quant Skoru ${quantScore.toFixed(1)} (A+) ile güçlü boğa trendinde. Ağırlığı düşük (%${weightPct.toFixed(1)}), kademeli eklenebilir.`;
      } else if (quantScore < 65.0) {
        action = 'EXIT';
        badgeColor = 'red';
        actionTitle = '🚪 MODEL DIŞI / ÇIK';
        reason = `Quant skoru ${quantScore.toFixed(1)} seviyesine geriledi. Momentum ve bilanço zayıfladı.`;
      } else {
        action = 'HOLD';
        badgeColor = 'cyan';
        actionTitle = '🛡️ TUT / KORU';
        reason = `Quant Skoru ${quantScore.toFixed(1)} ile istikrarlı. Pozisyon ağırlığı (%${weightPct.toFixed(1)}) makul seviyede.`;
      }

      return {
        ...h,
        clean,
        category,
        quantScore,
        weightPct,
        action,
        badgeColor,
        actionTitle,
        reason
      };
    });
  }, [equityHoldings, totalValAll, isTRY, usdtry]);

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
      {/* 📈 GÖRÜNÜM 1: HİSSE & ETF PORTFÖYÜ (DÖNEMSEL GETİRİ, BENCHMARK, KAR TANESİ) */}
      {/* ========================================================================= */}
      {activeMainTab === 'equity' && (
        <div style={{ animation: 'fadeIn 0.2s ease' }}>
          
          {/* Header & Timeframe Selector Bar */}
          <div className="card" style={{ padding: 14, background: '#080d1a', border: '1px solid rgba(0, 229, 255, 0.25)', borderRadius: 8, marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 14, fontWeight: 900, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <TrendingUp size={17} className="text-cyan" />
                  <span>ÇEKİRDEK HİSSE & ETF DÖNEMSEL GETİRİ & BENCHMARK ANALİZİ</span>
                </h3>
                <p style={{ margin: '3px 0 0 0', fontSize: 11, color: 'var(--text-muted)' }}>
                  Hisse senedi ve ETF sepetinizin S&P 500, Nasdaq 100, BIST 100 ve Altın ile karşılaştırmalı getiri grafiği ve ağırlıklı Kar Tanesi sağlık radarı.
                </p>
              </div>

              {/* Timeframe Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(0,0,0,0.4)', padding: 3, borderRadius: 6, border: '1px solid var(--border)' }}>
                <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, paddingLeft: 6 }}>Dönem:</span>
                {[
                  { id: '1W', label: '1H' },
                  { id: '1M', label: '1A' },
                  { id: '3M', label: '3A' },
                  { id: '6M', label: '6A' },
                  { id: 'YTD', label: 'YTD' },
                  { id: '1Y', label: '1Y' }
                ].map(tf => (
                  <button
                    key={tf.id}
                    type="button"
                    className={`chip-btn ${timeframe === tf.id ? 'active' : ''}`}
                    onClick={() => setTimeframe(tf.id)}
                    style={{ fontSize: 10.5, padding: '3px 9px', fontWeight: 800 }}
                  >
                    {tf.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 4 Key Metric Summary Cards for Equity Basket */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 10, marginBottom: 14 }}>
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

            {/* Card 4: Selected Period Return vs S&P 500 Alpha */}
            <div className="card" style={{ padding: 12, background: 'rgba(245, 158, 11, 0.05)', border: '1px solid rgba(245, 158, 11, 0.25)', borderRadius: 6 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                🎯 {timeframe} SEPET GETİRİSİ & ALFA
              </div>
              <div className="mono font-bold text-gold" style={{ fontSize: 18, marginTop: 4 }}>
                {benchmarkReturns.equity >= 0 ? '+' : ''}%{benchmarkReturns.equity}
              </div>
              <div style={{ fontSize: 10, fontWeight: 700, color: benchmarkReturns.alphaSP >= 0 ? 'var(--emerald)' : 'var(--amber)', marginTop: 2 }}>
                S&P 500'e Karşı: {benchmarkReturns.alphaSP >= 0 ? `+${benchmarkReturns.alphaSP}% Alfa 🏆` : `${benchmarkReturns.alphaSP}%`}
              </div>
            </div>
          </div>

          {/* 2-Column Visual Dashboards: Benchmark Comparison Bar Chart + Snowflake Radar */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: 14, marginBottom: 16 }}>
            
            {/* Left Column: Horizontal Benchmark Comparison Bar Chart */}
            <div className="card" style={{ padding: 16, background: '#090d16', border: '1px solid var(--border)', borderRadius: 8, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <div style={{ fontWeight: 800, fontSize: 12.5, color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: 7 }}>
                    <BarChart3 size={16} className="text-cyan" />
                    <span>BENCHMARK KIYASLAMA BARI ({timeframe})</span>
                  </div>
                  <span className="nav-badge cyan" style={{ fontSize: 9 }}>
                    Hisse Sepeti vs Endeksler
                  </span>
                </div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 12 }}>
                  Seçili zaman aralığında Hisse & ETF sepetinizin küresel ana piyasalara göre net getiri performansı.
                </div>
              </div>

              {/* Bar Chart Container */}
              <div style={{ height: 185, width: '100%', marginBottom: 8 }}>
                <Bar data={benchmarkBarData} options={benchmarkBarOptions} />
              </div>

              {/* Alpha Badges Footer */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, background: 'rgba(0,0,0,0.5)', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--border)', fontSize: 9.5 }}>
                <div style={{ textAlign: 'center' }}>
                  <span style={{ color: 'var(--text-muted)', display: 'block' }}>S&P 500 Alfa</span>
                  <strong className="mono" style={{ color: benchmarkReturns.alphaSP >= 0 ? 'var(--emerald)' : 'var(--amber)' }}>
                    {benchmarkReturns.alphaSP >= 0 ? '+' : ''}{benchmarkReturns.alphaSP}%
                  </strong>
                </div>
                <div style={{ textAlign: 'center', borderLeft: '1px solid var(--border)', borderRight: '1px solid var(--border)' }}>
                  <span style={{ color: 'var(--text-muted)', display: 'block' }}>Nasdaq 100 Alfa</span>
                  <strong className="mono" style={{ color: benchmarkReturns.alphaNDX >= 0 ? 'var(--emerald)' : 'var(--amber)' }}>
                    {benchmarkReturns.alphaNDX >= 0 ? '+' : ''}{benchmarkReturns.alphaNDX}%
                  </strong>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <span style={{ color: 'var(--text-muted)', display: 'block' }}>BIST 100 Alfa</span>
                  <strong className="mono" style={{ color: benchmarkReturns.alphaBIST >= 0 ? 'var(--emerald)' : 'var(--amber)' }}>
                    {benchmarkReturns.alphaBIST >= 0 ? '+' : ''}{benchmarkReturns.alphaBIST}%
                  </strong>
                </div>
              </div>
            </div>

            {/* Right Column: Weighted Portfolio Snowflake Radar */}
            <div 
              className="card" 
              style={{ 
                padding: 16, 
                background: '#090d16', 
                border: `1px solid ${snowflakeTheme.color}50`, 
                boxShadow: `0 0 16px ${snowflakeTheme.color}18`, 
                borderRadius: 8, 
                display: 'flex', 
                flexDirection: 'column', 
                justifyContent: 'space-between',
                transition: 'all 0.3s ease'
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <div style={{ fontWeight: 800, fontSize: 12.5, color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: 7 }}>
                    <Snowflake size={16} style={{ color: snowflakeTheme.color }} />
                    <span>HİSSE & ETF SEPETİ KAR TANESİ RADARI</span>
                  </div>
                  <span 
                    className="nav-badge" 
                    style={{ 
                      fontSize: 9.5, 
                      fontWeight: 800, 
                      background: `${snowflakeTheme.color}22`, 
                      color: snowflakeTheme.color, 
                      border: `1px solid ${snowflakeTheme.color}66`,
                      padding: '3px 8px'
                    }}
                  >
                    {snowflakeTheme.icon} {weightedSnowflake.composite.toFixed(1)} / 100 Puan
                  </span>
                </div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 10 }}>
                  Hisselerinizin ağırlıklı ortalama sağlık profili: <strong style={{ color: snowflakeTheme.color }}>{snowflakeTheme.label}</strong>
                </div>
              </div>

              {/* Radar Chart Container */}
              <div style={{ height: 185, width: '100%', position: 'relative', margin: '2px 0' }}>
                <Radar data={snowflakeChartData} options={snowflakeChartOptions} />
              </div>

              {/* 5 Pillar Mini Scores Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 4, background: 'rgba(0,0,0,0.5)', padding: '6px 8px', borderRadius: 6, border: '1px solid var(--border)', fontSize: 8.5, textAlign: 'center', marginBottom: 6 }}>
                <div>
                  <div style={{ color: 'var(--text-muted)' }}>Temel</div>
                  <strong className="mono" style={{ color: weightedSnowflake.fund >= 70 ? 'var(--cyan)' : 'var(--amber)' }}>{weightedSnowflake.fund}</strong>
                </div>
                <div>
                  <div style={{ color: 'var(--text-muted)' }}>Değerleme</div>
                  <strong className="mono" style={{ color: weightedSnowflake.val >= 70 ? 'var(--emerald)' : 'var(--amber)' }}>{weightedSnowflake.val}</strong>
                </div>
                <div>
                  <div style={{ color: 'var(--text-muted)' }}>Momentum</div>
                  <strong className="mono" style={{ color: weightedSnowflake.mom >= 70 ? 'var(--gold)' : 'var(--red)' }}>{weightedSnowflake.mom}</strong>
                </div>
                <div>
                  <div style={{ color: 'var(--text-muted)' }}>Teknik</div>
                  <strong className="mono" style={{ color: weightedSnowflake.tech >= 70 ? 'var(--cyan)' : 'var(--red)' }}>{weightedSnowflake.tech}</strong>
                </div>
                <div>
                  <div style={{ color: 'var(--text-muted)' }}>Risk</div>
                  <strong className="mono" style={{ color: weightedSnowflake.risk >= 70 ? '#a855f7' : 'var(--red)' }}>{weightedSnowflake.risk}</strong>
                </div>
              </div>

              {/* 4-Tier Color Legend Bar */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 3, background: 'rgba(0,0,0,0.5)', padding: '4px 6px', borderRadius: 4, border: '1px solid var(--border)', fontSize: 8.5, textAlign: 'center' }}>
                <div style={{ color: '#ef4444', fontWeight: snowflakeTheme.status === 'critical' ? 900 : 500, background: snowflakeTheme.status === 'critical' ? 'rgba(239,68,68,0.2)' : 'transparent', borderRadius: 3, padding: '1px 0' }}>
                  🔴 &lt;50 Zayıf
                </div>
                <div style={{ color: '#f59e0b', fontWeight: snowflakeTheme.status === 'warning' ? 900 : 500, background: snowflakeTheme.status === 'warning' ? 'rgba(245,158,11,0.2)' : 'transparent', borderRadius: 3, padding: '1px 0' }}>
                  🟡 50-69 Orta
                </div>
                <div style={{ color: '#00e5ff', fontWeight: snowflakeTheme.status === 'healthy' ? 900 : 500, background: snowflakeTheme.status === 'healthy' ? 'rgba(0,229,255,0.2)' : 'transparent', borderRadius: 3, padding: '1px 0' }}>
                  🔵 70-84 Sağlıklı
                </div>
                <div style={{ color: '#10b981', fontWeight: snowflakeTheme.status === 'excellent' ? 900 : 500, background: snowflakeTheme.status === 'excellent' ? 'rgba(16,185,129,0.2)' : 'transparent', borderRadius: 3, padding: '1px 0' }}>
                  🟢 ≥85 Mükemmel
                </div>
              </div>
            </div>

          </div>

          {/* 🚀 AKILLI REBALANCE & SERBEST ALIM GÜCÜ KONTROL BARI */}
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
            {/* Left: Alım Gücü & Sinyal Özet Rozetleri */}
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
                      title="Nakit Giriş / Çıkış"
                    >
                      + Nakit
                    </button>
                  </div>
                </div>
              </div>

              {/* Model Sinyalleri Rozetleri */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, borderLeft: '1px solid rgba(255,255,255,0.1)', paddingLeft: 10, flexWrap: 'wrap' }}>
                <span 
                  className="nav-badge cyan" 
                  style={{ fontSize: 10, padding: '3px 8px', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                  title="Ağırlık ve risk sınırları içerisinde korunan pozisyonlar"
                >
                  🟢 {rebalanceSummary.holdCount} Dengeli
                </span>

                {rebalanceSummary.trimCount > 0 && (
                  <span 
                    className="nav-badge amber" 
                    style={{ fontSize: 10, padding: '3px 8px', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                    title={`Model Tavanı Aşıldı: ${rebalanceSummary.trimTicker} %${rebalanceSummary.trimWeight.toFixed(1)}`}
                  >
                    ✂️ {rebalanceSummary.trimCount} Kâr Al ({rebalanceSummary.trimTicker})
                  </span>
                )}

                {rebalanceSummary.accumCount > 0 && (
                  <span 
                    className="nav-badge emerald" 
                    style={{ fontSize: 10, padding: '3px 8px', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                    title={`Yüksek Quant Skoru: ${rebalanceSummary.accumTicker} (${rebalanceSummary.accumScore.toFixed(0)})`}
                  >
                    ➕ {rebalanceSummary.accumCount} Biriktir ({rebalanceSummary.accumTicker})
                  </span>
                )}
              </div>
            </div>

            {/* Right: Periyot Seçimi + Tablo Görünüm Modu */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              {/* Period Selector */}
              <div style={{ display: 'inline-flex', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, padding: 2 }}>
                <button
                  type="button"
                  className={`chip-btn ${rebalancePeriod === 'monthly' ? 'active' : ''}`}
                  onClick={() => setRebalancePeriod('monthly')}
                  style={{ fontSize: 9.5, padding: '3px 7px' }}
                  title="Kurumsal standart: Ay başında çeyreklik bilançolara göre dengelenir"
                >
                  📅 Aylık
                </button>
                <button
                  type="button"
                  className={`chip-btn ${rebalancePeriod === 'weekly' ? 'active' : ''}`}
                  onClick={() => setRebalancePeriod('weekly')}
                  style={{ fontSize: 9.5, padding: '3px 7px' }}
                  title="Haftalık momentum ve aşırı alım/satım takibi"
                >
                  ⚡ Haftalık
                </button>
              </div>

              {/* View Sub-Mode Switcher */}
              <div style={{ display: 'inline-flex', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(0, 229, 255, 0.3)', borderRadius: 6, padding: 2 }}>
                <button
                  type="button"
                  className={`chip-btn ${tableSubMode === 'unified' ? 'active' : ''}`}
                  onClick={() => setTableSubMode('unified')}
                  style={{ 
                    fontSize: 10, 
                    padding: '3px 8px',
                    background: tableSubMode === 'unified' ? 'var(--cyan)' : 'transparent',
                    color: tableSubMode === 'unified' ? '#000' : 'var(--text-bright)',
                    fontWeight: 800
                  }}
                  title="Finansal değerler ve Quant/Rebalance sinyallerini tek süper tabloda birleştirir"
                >
                  ✨ Birleşik Süper Tablo
                </button>
                <button
                  type="button"
                  className={`chip-btn ${tableSubMode === 'financial' ? 'active' : ''}`}
                  onClick={() => setTableSubMode('financial')}
                  style={{ 
                    fontSize: 10, 
                    padding: '3px 8px',
                    background: tableSubMode === 'financial' ? 'var(--cyan)' : 'transparent',
                    color: tableSubMode === 'financial' ? '#000' : 'var(--text-bright)',
                    fontWeight: 700
                  }}
                  title="Klasik alım/satım ve kâr/zarar odaklı görünüm"
                >
                  📊 Finansal
                </button>
                <button
                  type="button"
                  className={`chip-btn ${tableSubMode === 'rebalance' ? 'active' : ''}`}
                  onClick={() => setTableSubMode('rebalance')}
                  style={{ 
                    fontSize: 10, 
                    padding: '3px 8px',
                    background: tableSubMode === 'rebalance' ? 'var(--cyan)' : 'transparent',
                    color: tableSubMode === 'rebalance' ? '#000' : 'var(--text-bright)',
                    fontWeight: 700
                  }}
                  title="Model portföy ağırlıkları, quant skorları ve rehberlik metinleri"
                >
                  🤖 Rebalance & Sinyal
                </button>
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

        </div>
      )}

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
                  <th onClick={() => handleSort('price')} className="text-right" style={{ cursor: 'pointer', minWidth: '110px' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', width: '100%' }}>
                      <span>Canlı Fiyat (24s)</span>
                      {renderSortIndicator('price')}
                    </div>
                  </th>
                  <th onClick={() => handleSort('val')} className="text-right" style={{ cursor: 'pointer', minWidth: '105px' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', width: '100%' }}>
                      <span>Piyasa Değeri</span>
                      {renderSortIndicator('val')}
                    </div>
                  </th>
                  <th onClick={() => handleSort('return')} className="text-right" style={{ cursor: 'pointer', minWidth: '110px' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', width: '100%' }}>
                      <span>Net K/Z & Getiri</span>
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
                      <span>Kâr / Zarar</span>
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

                // ==========================================
                // 1. UNIFIED SUPER TABLE VIEW (Hisse-ETF)
                // ==========================================
                if (activeMainTab === 'equity' && tableSubMode === 'unified') {
                  return (
                    <React.Fragment key={h.id}>
                      <tr className="table-row">
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <div className="ticker-cell">
                              <strong className="ticker-symbol mono">{h.ticker}</strong>
                              <span className="ticker-desc">{h.name || h.ticker}</span>
                            </div>
                            <span className={`badge-type ${h.type?.toLowerCase() || 'hisse'}`} style={{ fontSize: 9, padding: '1px 5px' }}>
                              {reb?.category || h.type}
                            </span>
                          </div>
                        </td>
                        <td className="text-right">
                          <div className="mono font-bold" style={{ fontSize: 12, color: weightPct > 15 ? '#ef4444' : (weightPct > 7.5 ? '#f59e0b' : '#f8fafc') }}>
                            %{weightPct.toFixed(1)}
                          </div>
                          <div style={{ width: 55, height: 3.5, background: 'rgba(255,255,255,0.08)', borderRadius: 2, marginLeft: 'auto', marginTop: 3 }}>
                            <div 
                              style={{ 
                                width: `${Math.min(100, weightPct * 5)}%`, 
                                height: '100%', 
                                background: weightPct > 15 ? '#ef4444' : (weightPct > 7.5 ? '#f59e0b' : 'var(--cyan)'), 
                                borderRadius: 2 
                              }} 
                            />
                          </div>
                        </td>
                        <td className="text-right mono">
                          <div className="font-medium" style={{ fontSize: 12 }}>{fmtShares(h.shares)}</div>
                          <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                            {sym}{fmt(displayedCost, 2)}
                          </div>
                        </td>
                        <td className="text-right mono">
                          <div className="font-bold text-bright" style={{ fontSize: 12 }}>
                            {sym}{fmt(displayedPrice, 2)}
                          </div>
                          <div style={{ fontSize: 10, color: changeUp ? 'var(--up)' : 'var(--down)', fontWeight: 600 }}>
                            {changeUp ? '▲ +' : '▼ '}{Math.abs(h.changePct || 0).toFixed(2)}%
                          </div>
                        </td>
                        <td className="text-right mono font-bold text-cyan" style={{ fontSize: 13 }}>
                          {sym}{fmt(totalVal, 2)}
                        </td>
                        <td className="text-right mono">
                          <div style={{ fontSize: 11.5, fontWeight: 700, color: isProfit ? 'var(--up)' : 'var(--down)' }}>
                            {isProfit ? '+' : ''}{sym}{fmt(profitVal, 2)}
                          </div>
                          <span className={`return-badge ${isProfit ? 'up' : 'down'}`} style={{ fontSize: 9.5, padding: '1px 5px' }}>
                            {isProfit ? '+' : ''}{fmt(h.returnPct, 1)}%
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
                                    Kural: Tek varlık tavanı %7.5 (kritik üst sınır %15.0). Quant skoru ≥82 alım, &lt;65 model dışı bölgesidir.
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
                // 2. REBALANCE & SİNYAL TABLO GÖRÜNÜMÜ
                // ==========================================
                if (activeMainTab === 'equity' && tableSubMode === 'rebalance') {
                  return (
                    <tr key={h.id} className="table-row">
                      <td>
                        <div className="ticker-cell">
                          <strong className="ticker-symbol mono">{h.ticker}</strong>
                          <span className="ticker-desc">{h.name || h.ticker}</span>
                        </div>
                      </td>
                      <td>
                        <span className="badge-type hisse" style={{ fontSize: 9.5 }}>{reb?.category || h.type}</span>
                      </td>
                      <td className="text-right mono font-bold" style={{ color: weightPct > 15 ? '#ef4444' : (weightPct > 7.5 ? '#f59e0b' : '#f8fafc') }}>
                        %{weightPct.toFixed(1)}
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
                      <div className="ticker-cell">
                        <strong className="ticker-symbol mono">{h.ticker}</strong>
                        <span className="ticker-desc">{h.name || h.ticker}</span>
                      </div>
                    </td>
                    <td>
                      <span className={`badge-type ${h.type?.toLowerCase() || 'hisse'}`}>
                        {h.type || 'Hisse'}
                      </span>
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
                      <div style={{ fontWeight: 700 }}>
                        {sym}{fmt(displayedPrice, 4)}
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
                  : (selectedSegment === 'all' ? '🎯 GENEL KONSOLİDE PORTFÖY TOPLAMI' : `🎯 ${activeStat.shortLabel} TOPLAMI`);

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

                // 3. Classical Financial Footnote (10 columns)
                return (
                  <tr style={{ background: '#090d16', borderTop: '2px solid rgba(0, 229, 255, 0.4)', fontWeight: 800 }}>
                    <td colSpan={3} style={{ color: activeStat.color, letterSpacing: '0.4px', paddingLeft: 12 }}>
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
                      </div>
                    </td>
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
                    </td>
                    <td className="text-right mono" style={{ fontSize: 12, fontWeight: 800 }}>
                      <span className={`return-badge ${activeStat.returnPct >= 0 ? 'up' : 'down'}`}>
                        {activeStat.returnPct >= 0 ? '+' : ''}{fmt(activeStat.returnPct, 2)}%
                      </span>
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
