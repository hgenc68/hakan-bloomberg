import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Search, 
  Shield, 
  Trash2, 
  ArrowUpRight, 
  Award, 
  DollarSign, 
  Wallet, 
  TrendingUp, 
  TrendingDown, 
  Percent, 
  Clock, 
  Zap, 
  AlertTriangle, 
  CheckCircle2, 
  BarChart2, 
  Activity, 
  Layers, 
  Info,
  SlidersHorizontal,
  Flame
} from 'lucide-react';

// Mini SVG Equity Curve Sparkline Component with Zero Baseline and Dual Color Fill
function EquityCurveSparkline({ data, height = 75 }) {
  if (!data || data.length < 2) {
    return (
      <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 11 }}>
        Grafik için en az 2 kapalı işlem gereklidir
      </div>
    );
  }

  // Prepend genesis zero point if first trade doesn't start at 0
  const normalizedData = (data[0] && data[0].val !== 0)
    ? [{ step: 0, ticker: 'BAŞLANGIÇ', val: 0 }, ...data]
    : data;

  const vals = normalizedData.map(d => d.val);
  const minVal = Math.min(...vals, 0);
  const maxVal = Math.max(...vals, 0);

  // Add 12% vertical padding so curve doesn't clamp hard to SVG border
  const rangeRaw = maxVal - minVal;
  const pad = rangeRaw > 0 ? rangeRaw * 0.12 : 500;
  const yMin = minVal - pad;
  const yMax = maxVal + pad;
  const range = (yMax - yMin) || 1;

  const w = 460;
  const h = height;

  const points = normalizedData.map((d, i) => {
    const x = (i / (normalizedData.length - 1)) * (w - 24) + 12;
    const y = h - ((d.val - yMin) / range) * (h - 22) - 11;
    return `${x},${y}`;
  }).join(' ');

  const firstX = 12;
  const lastX = w - 12;
  const zeroY = h - ((0 - yMin) / range) * (h - 22) - 11;

  // Closed area polygon anchored along the 0 baseline
  const areaPoints = `${firstX},${zeroY} ${points} ${lastX},${zeroY}`;

  // Percentage offset of the 0 baseline from top (0%) to bottom (100%)
  const zeroOffsetPct = Math.max(0, Math.min(100, ((yMax - 0) / range) * 100));

  const lastPoint = normalizedData[normalizedData.length - 1];
  const lastXCoord = w - 12;
  const lastYCoord = h - ((lastPoint.val - yMin) / range) * (h - 22) - 11;
  const isCurrentProfitable = (lastPoint.val >= 0);
  const lastNodeColor = isCurrentProfitable ? '#10b981' : '#ef4444';

  return (
    <div style={{ width: '100%', position: 'relative' }}>
      <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height, overflow: 'visible' }}>
        <defs>
          {/* Dual-color stroke: Green above 0 line, Red below 0 line */}
          <linearGradient id="equityDualStroke" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset={`${Math.max(0, zeroOffsetPct - 0.5)}%`} stopColor="#10b981" />
            <stop offset={`${Math.min(100, zeroOffsetPct + 0.5)}%`} stopColor="#ef4444" />
            <stop offset="100%" stopColor="#ef4444" />
          </linearGradient>

          {/* Dual-color area fill: Green glow above 0 line, Red glow below 0 line */}
          <linearGradient id="equityDualArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.40" />
            <stop offset={`${Math.max(0, zeroOffsetPct - 2)}%`} stopColor="#10b981" stopOpacity="0.04" />
            <stop offset={`${zeroOffsetPct}%`} stopColor="rgba(255,255,255,0)" stopOpacity="0" />
            <stop offset={`${Math.min(100, zeroOffsetPct + 2)}%`} stopColor="#ef4444" stopOpacity="0.04" />
            <stop offset="100%" stopColor="#ef4444" stopOpacity="0.38" />
          </linearGradient>
        </defs>

        {/* 0 ₺ Başabaş Referans Çizgisi */}
        <line 
          x1="8" 
          y1={zeroY} 
          x2={w - 8} 
          y2={zeroY} 
          stroke="rgba(255, 255, 255, 0.30)" 
          strokeDasharray="4 3" 
          strokeWidth="1.2"
        />

        {/* 0 ₺ Başabaş Rozeti */}
        <g transform={`translate(8, ${Math.min(h - 12, Math.max(12, zeroY))})`}>
          <rect x="0" y="-8" width="76" height="15" rx="3" fill="#0f172a" stroke="rgba(255,255,255,0.22)" strokeWidth="0.8" />
          <text x="38" y="2.5" fill="#94a3b8" fontSize="8" fontFamily="monospace" fontWeight="700" textAnchor="middle">
            0 ₺ (Başabaş)
          </text>
        </g>

        {/* Çift Renkli Gölgeli Alan */}
        <polygon points={areaPoints} fill="url(#equityDualArea)" />

        {/* Çift Renkli Kümülatif Kâr Trend Çizgisi */}
        <polyline 
          points={points} 
          fill="none" 
          stroke="url(#equityDualStroke)" 
          strokeWidth="2.5" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
        />

        {/* Güncel Son İşlem Düğümü */}
        <circle cx={lastXCoord} cy={lastYCoord} r="4.5" fill={lastNodeColor} stroke="#ffffff" strokeWidth="1.8" />
      </svg>
    </div>
  );
}

// Calculate holding duration in days safely
function getTradeHoldingDays(t) {
  if (t.holding_days && Number(t.holding_days) > 0) return Number(t.holding_days);
  if (t.buy_date && t.date) {
    try {
      const d1 = new Date(t.buy_date).getTime();
      const d2 = new Date(t.date).getTime();
      if (Number.isFinite(d1) && Number.isFinite(d2)) {
        return Math.max(1, Math.round(Math.abs(d2 - d1) / (1000 * 60 * 60 * 24)));
      }
    } catch (e) {}
  }
  // Smart contextual fallback based on asset type
  if (t.currency === 'USD' || (t.ticker && !t.ticker.endsWith('.IS'))) return 21; // ~3 weeks for US swing
  return 14; // 2 weeks for BIST
}

// Calculate Inflation & PPF Hurdle Rate (Time Value of Money)
function calcTradeInflationMetrics(t) {
  const days = getTradeHoldingDays(t);
  const annualPpfRate = 0.45; // %45 TCMB / PPF risksiz getiri eşiği
  // Compound Hurdle Rate: (1 + r)^(days/365) - 1
  const ppfHurdlePct = (Math.pow(1 + annualPpfRate, days / 365) - 1) * 100;
  const nominalPct = Number(t.realized_return_pct || t.return_pct || 0);
  
  // Real Alpha = nominal % minus PPF hurdle %
  const realAlphaPct = nominalPct - ppfHurdlePct;

  // Exact opportunity cost in TRY
  const costTRY = Number(t.avg_cost || 0) * Number(t.shares || 0) * (t.currency === 'USD' ? (Number(t.exchange_rate) || 49.03) : 1);
  const ppfOpportunityCostTRY = costTRY * (ppfHurdlePct / 100);
  const realNetProfitTRY = (Number(t.realized_pl_try) || 0) - ppfOpportunityCostTRY;

  return {
    days,
    ppfHurdlePct,
    nominalPct,
    realAlphaPct,
    ppfOpportunityCostTRY,
    realNetProfitTRY,
    beatPPF: (Number(t.realized_pl_try) || 0) > ppfOpportunityCostTRY
  };
}

export default function TradeLedgerTab({ onOpenTransferModal }) {
  const { tradeLedger, portfolioSummary, currentCurrency, deleteTrade } = useApp();
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('all'); // 'all' | 'bist' | 'us' | 'crypto' | 'winning' | 'losing'
  const [viewMode, setViewMode] = useState('standard'); // 'standard' | 'inflation' | 'commissions'
  
  const isTRY = currentCurrency === 'try';
  const sym = isTRY ? '₺' : '$';

  const totalRealizedTRY = Number(portfolioSummary?.realizedProfitTRY) || 0;
  const totalRealizedUSD = Number(portfolioSummary?.realizedProfitUSD) || 0;
  const isNetProfit = totalRealizedTRY >= 0;

  // 1. Comprehensive Trade Performance & Analytics Engine (with Portfolio Time-Weighted PPF Hurdle)
  const analytics = useMemo(() => {
    if (!tradeLedger || tradeLedger.length === 0) {
      return {
        grossProfitTRY: 0,
        grossLossTRY: 0,
        grossProfitUSD: 0,
        grossLossUSD: 0,
        profitFactor: 0,
        profitFactorLabel: 'N/A',
        profitFactorColor: '#94a3b8',
        winningCount: 0,
        losingCount: 0,
        avgWinTRY: 0,
        avgLossTRY: 0,
        payoffRatio: 0,
        totalCommissionsTRY: 0,
        totalCommissionsUSD: 0,
        bestTrade: null,
        worstTrade: null,
        equityCurve: [],
        avgHoldingDays: 0,
        beatPpfCount: 0,
        beatPpfWinRatePct: 0,
        totalInvestedCostTRY: 0,
        totalRealizedProfitTRY: 0,
        totalPpfOpportunityTRY: 0,
        netPortfolioAlphaTRY: 0,
        isPortfolioAlphaPositive: true,
        weightedNominalPct: 0,
        weightedPpfPct: 0,
        netPortfolioAlphaPct: 0,
        equityMax: 0,
        equityMin: 0
      };
    }

    let grossProfitTRY = 0;
    let grossLossTRY = 0;
    let grossProfitUSD = 0;
    let grossLossUSD = 0;
    let winningCount = 0;
    let losingCount = 0;
    let totalCommissionsTRY = 0;
    let totalCommissionsUSD = 0;
    let totalHoldingDays = 0;
    let beatPpfCount = 0;

    let totalInvestedCostTRY = 0;
    let totalRealizedProfitTRY = 0;
    let totalPpfOpportunityTRY = 0;

    let bestTrade = null;
    let worstTrade = null;

    // Equity Curve: oldest to newest
    const chronological = [...tradeLedger].reverse();
    let cumPLTRY = 0;
    const equityCurve = [];

    chronological.forEach((t, idx) => {
      const plTRY = Number(t.realized_pl_try) || 0;
      const plUSD = Number(t.realized_pl_usd) || 0;
      const commTRY = Number(t.commission_try) || (t.commission ? Number(t.commission) * (Number(t.exchange_rate) || 49.03) : 0);
      const commUSD = Number(t.commission_usd) || (t.commission && t.currency === 'USD' ? Number(t.commission) : 0);

      totalCommissionsTRY += commTRY;
      totalCommissionsUSD += commUSD;

      if (plTRY > 0.01) {
        grossProfitTRY += plTRY;
        grossProfitUSD += plUSD;
        winningCount++;
      } else if (plTRY < -0.01) {
        grossLossTRY += Math.abs(plTRY);
        grossLossUSD += Math.abs(plUSD);
        losingCount++;
      }

      if (!bestTrade || plTRY > (Number(bestTrade.realized_pl_try) || -Infinity)) {
        bestTrade = t;
      }
      if (!worstTrade || plTRY < (Number(worstTrade.realized_pl_try) || Infinity)) {
        worstTrade = t;
      }

      const days = getTradeHoldingDays(t);
      totalHoldingDays += days;

      // Actual invested cost for this trade in TRY
      const shares = Number(t.shares || 0);
      const avgCost = Number(t.avg_cost || t.buy_price || 0);
      const rate = t.currency === 'USD' ? (Number(t.exchange_rate) || 49.03) : 1;
      const tradeCostTRY = shares * avgCost * rate;
      totalInvestedCostTRY += tradeCostTRY;

      totalRealizedProfitTRY += plTRY;

      // Compounded PPF yield if this trade's cost stayed in PPF during these exact 'days'
      const ppfHurdlePct = Math.pow(1 + 0.45, days / 365) - 1;
      const tradePpfYieldTRY = tradeCostTRY * ppfHurdlePct;
      totalPpfOpportunityTRY += tradePpfYieldTRY;

      const inf = calcTradeInflationMetrics(t);
      if (inf.beatPPF) {
        beatPpfCount++;
      }

      cumPLTRY += plTRY;
      equityCurve.push({
        step: idx + 1,
        ticker: t.ticker,
        date: t.date,
        val: cumPLTRY
      });
    });

    const profitFactor = grossLossTRY > 0 ? (grossProfitTRY / grossLossTRY) : grossProfitTRY > 0 ? 99.9 : 0;
    let profitFactorLabel = 'Dengeli';
    let profitFactorColor = '#f59e0b';
    if (profitFactor >= 2.0) {
      profitFactorLabel = 'Kurumsal Elit (2.0+)';
      profitFactorColor = '#10b981';
    } else if (profitFactor >= 1.5) {
      profitFactorLabel = 'Güçlü Sistem (1.5+)';
      profitFactorColor = '#06b6d4';
    } else if (profitFactor < 1.0 && grossLossTRY > 0) {
      profitFactorLabel = 'Riskli / Geliştirilmeli';
      profitFactorColor = '#ef4444';
    }

    const avgWinTRY = winningCount > 0 ? grossProfitTRY / winningCount : 0;
    const avgLossTRY = losingCount > 0 ? grossLossTRY / losingCount : 0;
    const payoffRatio = avgLossTRY > 0 ? avgWinTRY / avgLossTRY : avgWinTRY > 0 ? 99.9 : 0;
    const avgHoldingDays = tradeLedger.length > 0 ? Math.round(totalHoldingDays / tradeLedger.length) : 0;
    const beatPpfWinRatePct = tradeLedger.length > 0 ? (beatPpfCount / tradeLedger.length) * 100 : 0;

    const netPortfolioAlphaTRY = totalRealizedProfitTRY - totalPpfOpportunityTRY;
    const isPortfolioAlphaPositive = netPortfolioAlphaTRY >= 0;

    const weightedNominalPct = totalInvestedCostTRY > 0 ? (totalRealizedProfitTRY / totalInvestedCostTRY) * 100 : 0;
    const weightedPpfPct = totalInvestedCostTRY > 0 ? (totalPpfOpportunityTRY / totalInvestedCostTRY) * 100 : 0;
    const netPortfolioAlphaPct = weightedNominalPct - weightedPpfPct;

    const equityVals = equityCurve.map(e => e.val);
    const equityMax = equityVals.length > 0 ? Math.max(...equityVals) : 0;
    const equityMin = equityVals.length > 0 ? Math.min(...equityVals) : 0;

    return {
      grossProfitTRY,
      grossLossTRY,
      grossProfitUSD,
      grossLossUSD,
      profitFactor,
      profitFactorLabel,
      profitFactorColor,
      winningCount,
      losingCount,
      avgWinTRY,
      avgLossTRY,
      payoffRatio,
      totalCommissionsTRY,
      totalCommissionsUSD,
      bestTrade,
      worstTrade,
      equityCurve,
      avgHoldingDays,
      beatPpfCount,
      beatPpfWinRatePct,
      totalInvestedCostTRY,
      totalRealizedProfitTRY,
      totalPpfOpportunityTRY,
      netPortfolioAlphaTRY,
      isPortfolioAlphaPositive,
      weightedNominalPct,
      weightedPpfPct,
      netPortfolioAlphaPct,
      equityMax,
      equityMin
    };
  }, [tradeLedger]);

  // Filtered trades by search & asset type
  const filteredTrades = useMemo(() => {
    return tradeLedger.filter(t => {
      const q = search.toLowerCase().trim();
      const matchesSearch = !q || (
        (t.ticker && t.ticker.toLowerCase().includes(q)) ||
        (t.name && t.name.toLowerCase().includes(q)) ||
        (t.note && t.note.toLowerCase().includes(q))
      );

      if (!matchesSearch) return false;

      if (activeFilter === 'bist') {
        return (t.currency === 'TRY' && (!t.type || t.type.toLowerCase().includes('hisse') || t.ticker.endsWith('.IS')));
      }
      if (activeFilter === 'us') {
        return (t.currency === 'USD' || (t.ticker && !t.ticker.endsWith('.IS') && !['BTC', 'ETH', 'SOL', 'LDO', 'BIO'].some(c => t.ticker.includes(c))));
      }
      if (activeFilter === 'crypto') {
        return ['BTC', 'ETH', 'SOL', 'LDO', 'BIO', 'CRYPTO'].some(c => (t.ticker || '').toUpperCase().includes(c));
      }
      if (activeFilter === 'winning') {
        return (Number(t.realized_pl_try) || 0) > 0.01;
      }
      if (activeFilter === 'losing') {
        return (Number(t.realized_pl_try) || 0) < -0.01;
      }
      return true;
    });
  }, [tradeLedger, search, activeFilter]);

  const totalVolTRY = (analytics.grossProfitTRY + analytics.grossLossTRY) || 1;
  const winVolPct = Math.round((analytics.grossProfitTRY / totalVolTRY) * 100);
  const lossVolPct = 100 - winVolPct;

  return (
    <div className="tab-pane-content">
      {/* Header Banner */}
      <div className="ledger-header-row">
        <div>
          <h2 className="section-title">
            <span>📜 GERÇEKLEŞEN KÂR DEFTERİ & STRATEJİK TRADE KOKPİTİ</span>
            <span className="badge-pill emerald">Kurumsal Performans</span>
          </h2>
          <p className="section-subtitle">
            Kapanan pozisyonların cebe giren net kazançları, enflasyon & PPF zaman maliyeti analizi, ABD komisyon dökümü ve kümülatif kasa eğrisi.
          </p>
        </div>

        <button
          type="button"
          className="btn-primary-emerald"
          onClick={() => onOpenTransferModal(portfolioSummary.realizedProfitTRY)}
        >
          <Shield size={14} />
          <span>🛡️ Kârı Kur Kalkanına Aktar</span>
        </button>
      </div>

      {/* 4 Ana Finansal Özet Kartı */}
      <div className="kpi-grid">
        {/* KPI 1: Toplam Gerçekleşen Net Kâr / Zarar */}
        <div className={`kpi-card ${isNetProfit ? 'green' : 'red'}`}>
          <div className="kpi-header">
            <span>{isNetProfit ? 'Toplam Gerçekleşen Net Kâr' : 'Toplam Gerçekleşen Net Zarar'}</span>
            <span className={`badge-pill ${isNetProfit ? 'emerald' : 'red'}`}>
              {isNetProfit ? 'Cebe Giren' : 'Net Zarar'}
            </span>
          </div>
          <div className={`kpi-val mono ${isNetProfit ? 'text-emerald' : 'text-down'}`}>
            {isNetProfit ? '+' : '-'}₺{Math.abs(totalRealizedTRY).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="kpi-sub mono">
            <span>Dolar Karşılığı:</span>
            <strong style={{ color: isNetProfit ? '#10b981' : '#ef4444' }}>
              {isNetProfit ? '+' : '-'}${Math.abs(totalRealizedUSD).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
            </strong>
          </div>
        </div>

        {/* KPI 2: Toplam Satış Hasılatı */}
        <div className="kpi-card cyan">
          <div className="kpi-header">
            <span>Toplam Satış Hasılatı</span>
            <span className="badge-pill cyan">Nakit Likidite</span>
          </div>
          <div className="kpi-val mono text-cyan">
            ₺{(Number(portfolioSummary?.totalProceedsTRY) || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="kpi-sub mono">
            <span>Dolar Karşılığı:</span>
            <strong style={{ color: '#fff' }}>${(Number(portfolioSummary?.totalProceedsUSD) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD</strong>
          </div>
        </div>

        {/* KPI 3: Win Rate */}
        <div className="kpi-card gold">
          <div className="kpi-header">
            <span>İşlem Başarı Oranı (Win Rate)</span>
            <span className="badge-pill gold">Kapanan Pozisyon</span>
          </div>
          <div className="kpi-val mono text-gold">
            %{(Number(portfolioSummary?.winRatePct) || 100).toFixed(1)}
          </div>
          <div className="kpi-sub mono">
            <span>Tamamlanan İşlem:</span>
            <strong style={{ color: '#fff' }}>{portfolioSummary?.tradesCount || 0} İşlem ({portfolioSummary?.winningTrades || 0} Kârlı)</strong>
          </div>
        </div>

        {/* KPI 4: Kalkan Güvence Stratejisi */}
        <div className="kpi-card purple">
          <div className="kpi-header">
            <span>Kâr Realizasyon & Koruma</span>
            <span className="badge-pill purple">Kuru Barut</span>
          </div>
          <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', lineHeight: '1.4', margin: '4px 0 10px 0' }}>
            Elde ettiğiniz kârı PPF veya Gram Altın kalkanına aktarabilir ya da Serbest Nakit Alım Gücünüze ekleyebilirsiniz.
          </div>
          <button
            type="button"
            className="btn-action-shield"
            onClick={() => onOpenTransferModal(portfolioSummary.realizedProfitTRY)}
          >
            🛡️ 1-Tıkla Kalkana Aktar
          </button>
        </div>
      </div>

      {/* 🚀 STRATEJİK HEDGE-FUND TRADE KOKPİTİ (ADIM 2) */}
      <div 
        style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', 
          gap: 12, 
          margin: '16px 0' 
        }}
      >
        {/* Kokpit Kart 1: Kâr Faktörü (Profit Factor) & Asimetrik R:R */}
        <div 
          style={{ 
            background: 'rgba(15, 23, 42, 0.75)', 
            border: '1px solid rgba(255, 255, 255, 0.08)', 
            borderRadius: 10, 
            padding: 14, 
            display: 'flex', 
            flexDirection: 'column', 
            justifyContent: 'space-between',
            backdropFilter: 'blur(8px)',
            boxShadow: '0 4px 16px rgba(0,0,0,0.2)'
          }}
        >
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Activity size={14} style={{ color: analytics.profitFactorColor }} />
                <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.5px', color: '#cbd5e1' }}>
                  KÂR FAKTÖRÜ & ASİMETRİK R:R
                </span>
              </div>
              <span 
                style={{ 
                  fontSize: 9.5, 
                  fontWeight: 800, 
                  padding: '2px 8px', 
                  borderRadius: 4, 
                  background: `${analytics.profitFactorColor}22`, 
                  color: analytics.profitFactorColor,
                  border: `1px solid ${analytics.profitFactorColor}55`
                }}
              >
                {analytics.profitFactorLabel}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 24, fontWeight: 800, fontFamily: 'monospace', color: analytics.profitFactorColor }}>
                {analytics.profitFactor > 50 ? '∞' : `${analytics.profitFactor.toFixed(2)}x`}
              </span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                (Brüt Kazanç / Brüt Kayıp)
              </span>
            </div>

            {/* Segmented Volume Progress Bar */}
            <div style={{ margin: '8px 0' }}>
              <div style={{ height: 6, width: '100%', background: 'rgba(239,68,68,0.25)', borderRadius: 3, overflow: 'hidden', display: 'flex' }}>
                <div style={{ width: `${winVolPct}%`, background: 'linear-gradient(90deg, #10b981, #059669)', transition: 'width 0.4s' }} />
                <div style={{ width: `${lossVolPct}%`, background: 'linear-gradient(90deg, #dc2626, #ef4444)', transition: 'width 0.4s' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, fontFamily: 'monospace', marginTop: 4 }}>
                <span style={{ color: '#10b981', fontWeight: 700 }}>+₺{analytics.grossProfitTRY.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} (%{winVolPct})</span>
                <span style={{ color: '#ef4444', fontWeight: 700 }}>-₺{analytics.grossLossTRY.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} (%{lossVolPct})</span>
              </div>
            </div>
          </div>

          <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 8, marginTop: 6, display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
            <span style={{ color: 'var(--text-muted)' }}>Asimetrik Payoff (Ort. Kâr / Ort. Stop):</span>
            <strong className="mono" style={{ color: '#38bdf8' }}>
              {analytics.payoffRatio > 50 ? '∞' : `${analytics.payoffRatio.toFixed(2)}x`}
            </strong>
          </div>
        </div>

        {/* Kokpit Kart 2: Kümülatif Kâr Eğrisi (Equity Curve) */}
        <div 
          style={{ 
            background: 'rgba(15, 23, 42, 0.75)', 
            border: '1px solid rgba(255, 255, 255, 0.08)', 
            borderRadius: 10, 
            padding: 14, 
            display: 'flex', 
            flexDirection: 'column', 
            justifyContent: 'space-between',
            backdropFilter: 'blur(8px)',
            boxShadow: '0 4px 16px rgba(0,0,0,0.2)'
          }}
        >
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <TrendingUp size={14} className="text-cyan" />
                <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.5px', color: '#cbd5e1' }}>
                  KÜMÜLATİF KÂR EĞRİSİ (EQUITY CURVE)
                </span>
              </div>
              <span className="badge-pill cyan" style={{ fontSize: 9.5 }}>
                {analytics.equityCurve.length} İşlem
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
              <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                {isNetProfit ? '🟢 0 ₺ Üzeri Net Kâr Bölgesi' : '🔴 0 ₺ Altı Zarar Bölgesi'}
              </span>
              <strong className="mono" style={{ color: isNetProfit ? '#10b981' : '#ef4444', fontSize: 13 }}>
                {isNetProfit ? '+' : '-'}₺{Math.abs(totalRealizedTRY).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </strong>
            </div>

            <EquityCurveSparkline data={analytics.equityCurve} height={64} />
          </div>

          <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 6, marginTop: 4, display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-muted)' }}>
            <span>
              Zirve: <strong className="mono" style={{ color: '#10b981' }}>+₺{analytics.equityMax.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}</strong>
              {' '}• Dip: <strong className="mono" style={{ color: analytics.equityMin < 0 ? '#ef4444' : '#94a3b8' }}>{analytics.equityMin < 0 ? '-' : ''}₺{Math.abs(analytics.equityMin).toLocaleString('tr-TR', { maximumFractionDigits: 0 })}</strong>
            </span>
            <span style={{ color: isNetProfit ? '#10b981' : '#ef4444', fontWeight: 700 }}>
              {isNetProfit ? '↗ Başabaş Üstü (Yeşil)' : '↘ Başabaş Altı (Kırmızı)'}
            </span>
          </div>
        </div>

        {/* Kokpit Kart 3: Zaman Maliyeti & Portföy PPF Performansı */}
        <div 
          style={{ 
            background: 'rgba(15, 23, 42, 0.75)', 
            border: '1px solid rgba(255, 255, 255, 0.08)', 
            borderRadius: 10, 
            padding: 14, 
            display: 'flex', 
            flexDirection: 'column', 
            justifyContent: 'space-between',
            backdropFilter: 'blur(8px)',
            boxShadow: '0 4px 16px rgba(0,0,0,0.2)'
          }}
        >
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Clock size={14} className="text-gold" />
                <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.5px', color: '#cbd5e1' }}>
                  ZAMAN MALİYETİ & PPF REEL ALFA
                </span>
              </div>
              <span 
                style={{ 
                  fontSize: 9.5, 
                  fontWeight: 800, 
                  padding: '2px 8px', 
                  borderRadius: 4, 
                  background: 'rgba(245, 158, 11, 0.16)', 
                  color: '#fbbf24',
                  border: '1px solid rgba(245, 158, 11, 0.35)'
                }}
              >
                Eşik: %45 Yıllık PPF
              </span>
            </div>

            {/* Portföy Seviyesinde Net Reel Alfa */}
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
              <span 
                style={{ 
                  fontSize: 22, 
                  fontWeight: 800, 
                  fontFamily: 'monospace', 
                  color: analytics.isPortfolioAlphaPositive ? '#10b981' : '#f59e0b' 
                }}
              >
                {analytics.isPortfolioAlphaPositive ? '+' : '-'}₺{Math.abs(analytics.netPortfolioAlphaTRY).toLocaleString('tr-TR', { maximumFractionDigits: 0 })}
              </span>
              <span 
                style={{ 
                  fontSize: 11.5, 
                  fontWeight: 700, 
                  fontFamily: 'monospace',
                  color: analytics.isPortfolioAlphaPositive ? '#10b981' : '#f59e0b'
                }}
              >
                ({analytics.isPortfolioAlphaPositive ? '+' : ''}{analytics.netPortfolioAlphaPct.toFixed(1)}% {analytics.isPortfolioAlphaPositive ? 'Net Alfa' : 'Fırsat Farkı'})
              </span>
            </div>

            <div style={{ fontSize: 10, color: analytics.isPortfolioAlphaPositive ? '#34d399' : '#fbbf24', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
              {analytics.isPortfolioAlphaPositive ? (
                <>
                  <CheckCircle2 size={11} className="text-emerald" />
                  <span>İşlemleriniz paranın bağlı kaldığı sürede risksiz faizin üzerinde getiri sağladı.</span>
                </>
              ) : (
                <>
                  <AlertTriangle size={11} style={{ color: '#fbbf24' }} />
                  <span>Nominal kâr, aynı sürede risksiz PPF'de kalacak getirinin gerisinde kaldı.</span>
                </>
              )}
            </div>

            {/* Konsolide Portföy İşlem vs PPF Karşılaştırması */}
            <div style={{ background: 'rgba(0,0,0,0.28)', borderRadius: 6, padding: '7px 10px', margin: '4px 0', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, marginBottom: 3 }}>
                <span style={{ color: 'var(--text-muted)' }}>Gerçekleşen Trade Kârı:</span>
                <strong className="mono" style={{ color: analytics.totalRealizedProfitTRY >= 0 ? '#10b981' : '#ef4444' }}>
                  {analytics.totalRealizedProfitTRY >= 0 ? '+' : ''}₺{analytics.totalRealizedProfitTRY.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} (%{analytics.weightedNominalPct.toFixed(1)})
                </strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, marginBottom: 3 }}>
                <span style={{ color: 'var(--text-muted)' }}>Aynı Günlerde PPF Getirisi:</span>
                <strong className="mono" style={{ color: '#fbbf24' }}>
                  +₺{analytics.totalPpfOpportunityTRY.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} (%{analytics.weightedPpfPct.toFixed(1)})
                </strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, paddingTop: 3, borderTop: '1px dashed rgba(255,255,255,0.08)' }}>
                <span style={{ color: 'var(--text-muted)' }}>PPF'yi Aşan İşlemler:</span>
                <strong className="mono" style={{ color: '#38bdf8' }}>
                  {analytics.beatPpfCount} / {tradeLedger.length} İşlem (%{analytics.beatPpfWinRatePct.toFixed(0)}) • ~{analytics.avgHoldingDays} Gün
                </strong>
              </div>
            </div>
          </div>

          <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 6, marginTop: 4, display: 'flex', justifyContent: 'space-between', fontSize: 10.5 }}>
            <span style={{ color: 'var(--text-muted)' }}>Toplam Kesilen Komisyon:</span>
            <strong className="mono" style={{ color: analytics.totalCommissionsUSD > 0 ? '#f59e0b' : '#94a3b8' }}>
              -${analytics.totalCommissionsUSD.toFixed(2)} USD (-₺{analytics.totalCommissionsTRY.toFixed(0)})
            </strong>
          </div>
        </div>
      </div>

      {/* Info Callout */}
      <div className="info-callout-box">
        <div className="callout-text">
          <strong className="text-cyan">💡 Profesyonel Portföy Kuralı (Zaman ve Sürtünme Maliyeti):</strong>{' '}
          1) ABD hisselerinde satış başına düşülen <strong>$1.50 komisyon</strong> net kârı kuruşu kuruşuna cebe giren nakde eşitler.{' '}
          2) Türkiye'deki yüksek faiz/enflasyon ortamında hissede aylarca yatay beklemek fırsat maliyetidir; risksiz PPF eşiğini aşamayan işlemler sarı <em>"Zaman Kaybı"</em> uyarısıyla işaretlenir.
        </div>
        <span className="live-status-pill">
          ✓ Firebase Bulut Aktif
        </span>
      </div>

      {/* Trade Ledger Table Card */}
      <div className="card table-card" style={{ marginTop: 14 }}>
        <div className="card-header-between" style={{ flexWrap: 'wrap', gap: 10 }}>
          {/* Görünüm Modu Değiştirici */}
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <SlidersHorizontal size={12} className="text-cyan" />
              <span>GÖRÜNÜM:</span>
            </span>
            <button
              type="button"
              onClick={() => setViewMode('standard')}
              className="chip-btn"
              style={{
                fontSize: 10,
                padding: '3px 8px',
                fontWeight: viewMode === 'standard' ? 700 : 500,
                background: viewMode === 'standard' ? 'rgba(0, 229, 255, 0.2)' : 'transparent',
                borderColor: viewMode === 'standard' ? 'var(--cyan)' : 'rgba(255,255,255,0.1)',
                color: viewMode === 'standard' ? 'var(--cyan)' : 'inherit'
              }}
            >
              📋 Standart Defter
            </button>
            <button
              type="button"
              onClick={() => setViewMode('inflation')}
              className="chip-btn"
              style={{
                fontSize: 10,
                padding: '3px 8px',
                fontWeight: viewMode === 'inflation' ? 700 : 500,
                background: viewMode === 'inflation' ? 'rgba(245, 158, 11, 0.2)' : 'transparent',
                borderColor: viewMode === 'inflation' ? '#f59e0b' : 'rgba(255,255,255,0.1)',
                color: viewMode === 'inflation' ? '#fbbf24' : 'inherit'
              }}
            >
              ⏱️ Zaman & Enflasyon (Reel Alfa)
            </button>
            <button
              type="button"
              onClick={() => setViewMode('commissions')}
              className="chip-btn"
              style={{
                fontSize: 10,
                padding: '3px 8px',
                fontWeight: viewMode === 'commissions' ? 700 : 500,
                background: viewMode === 'commissions' ? 'rgba(16, 185, 129, 0.2)' : 'transparent',
                borderColor: viewMode === 'commissions' ? '#10b981' : 'rgba(255,255,255,0.1)',
                color: viewMode === 'commissions' ? '#10b981' : 'inherit'
              }}
            >
              💳 Komisyon & Net Hasılat
            </button>
          </div>

          {/* Search Box */}
          <div className="search-box-sm">
            <Search size={12} className="search-icon" />
            <input
              type="text"
              placeholder="🔍 Sembol veya Not Ara..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="search-input-sm"
            />
          </div>
        </div>

        {/* Hızlı Filtre Butonları */}
        <div style={{ display: 'flex', gap: 6, padding: '8px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)', flexWrap: 'wrap', background: 'rgba(4,7,17,0.4)' }}>
          {[
            { id: 'all', label: `Tümü (${tradeLedger.length})` },
            { id: 'bist', label: '🇹🇷 BIST Hisseleri' },
            { id: 'us', label: '🇺🇸 ABD Hisseleri ($)' },
            { id: 'crypto', label: '🪙 Kripto Varlıklar' },
            { id: 'winning', label: '🟢 Kârlı İşlemler' },
            { id: 'losing', label: '🔴 Zararlı / Stoplar' }
          ].map(f => (
            <button
              key={f.id}
              type="button"
              onClick={() => setActiveFilter(f.id)}
              className="chip-btn"
              style={{
                fontSize: 9.5,
                padding: '2px 7px',
                fontWeight: activeFilter === f.id ? 700 : 500,
                background: activeFilter === f.id ? 'rgba(255,255,255,0.12)' : 'transparent',
                borderColor: activeFilter === f.id ? '#fff' : 'rgba(255,255,255,0.1)',
                color: activeFilter === f.id ? '#fff' : 'var(--text-muted)'
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="table-responsive">
          <table className="terminal-table">
            <thead>
              {viewMode === 'standard' && (
                <tr>
                  <th>Tarih / Saat</th>
                  <th>Varlık</th>
                  <th>İşlem</th>
                  <th className="text-right">Satılan Adet</th>
                  <th className="text-right">Alış / Maliyet</th>
                  <th className="text-right">Satış Fiyatı</th>
                  <th className="text-right">Satış Hasılatı</th>
                  <th className="text-right">Gerçekleşen Kâr (₺)</th>
                  <th className="text-right">Getiri %</th>
                  <th>Açıklama / Not</th>
                  <th className="text-right" style={{ minWidth: '130px' }}>İşlem</th>
                </tr>
              )}

              {viewMode === 'inflation' && (
                <tr>
                  <th>Tarih / Saat</th>
                  <th>Varlık</th>
                  <th className="text-center">Elde Tutma</th>
                  <th className="text-right">Alış Fiyatı</th>
                  <th className="text-right">Satış Fiyatı</th>
                  <th className="text-right">Nominal Getiri</th>
                  <th className="text-right" title="TCMB %45 faizinde bu paranın risksiz kalkan getirisi">PPF Hurdle Eşiği</th>
                  <th className="text-right">Reel Alfa (Enflasyon Üzeri)</th>
                  <th className="text-right">Reel Net Sonuç (₺)</th>
                  <th>Teşhis & Karar</th>
                  <th className="text-right">İşlem</th>
                </tr>
              )}

              {viewMode === 'commissions' && (
                <tr>
                  <th>Tarih / Saat</th>
                  <th>Varlık</th>
                  <th className="text-right">Satılan Adet</th>
                  <th className="text-right">Satış Fiyatı</th>
                  <th className="text-right">Brüt Hasılat</th>
                  <th className="text-right" style={{ color: '#f59e0b' }}>Kesilen Komisyon</th>
                  <th className="text-right">Net Kasaya Giren</th>
                  <th className="text-right">Net Realize Kâr (₺)</th>
                  <th className="text-right">Dolar Kârı ($)</th>
                  <th>Açıklama / Not</th>
                  <th className="text-right">İşlem</th>
                </tr>
              )}
            </thead>
            <tbody>
              {filteredTrades.map(t => {
                const isProfit = (t.realized_pl_try || 0) >= 0;
                const curSign = t.currency === 'TRY' ? '₺' : '$';
                const inf = calcTradeInflationMetrics(t);
                const commTRY = Number(t.commission_try) || (t.commission ? Number(t.commission) * (Number(t.exchange_rate) || 49.03) : 0);
                const commUSD = Number(t.commission_usd) || (t.commission && t.currency === 'USD' ? Number(t.commission) : 0);

                return (
                  <tr key={t.id} className="table-row">
                    {/* Standart Defter Görünümü */}
                    {viewMode === 'standard' && (
                      <>
                        <td className="mono text-muted text-nowrap" style={{ fontSize: '11px' }}>
                          {t.date || '--'}
                        </td>
                        <td>
                          <div className="ticker-cell">
                            <strong className="ticker-symbol mono">{t.ticker}</strong>
                            <span className="ticker-desc">{t.name || t.ticker}</span>
                          </div>
                        </td>
                        <td>
                          <span className="action-pill">{t.action || 'Satış'}</span>
                        </td>
                        <td className="text-right mono text-bright">
                          {Number(t.shares).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
                        </td>
                        <td className="text-right mono text-muted">
                          {curSign}{Number(t.avg_cost).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="text-right mono text-bright">
                          {curSign}{Number(t.sell_price).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="text-right mono">
                          <div className="text-cyan" style={{ fontWeight: 700 }}>
                            ₺{Number(t.total_proceeds_try || t.proceeds_try || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                          <div className="text-muted" style={{ fontSize: '10px' }}>
                            ${Number(t.total_proceeds_usd || t.proceeds_usd || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                        </td>
                        <td className="text-right mono">
                          <div className={isProfit ? 'text-up' : 'text-down'} style={{ fontWeight: 800 }}>
                            {isProfit ? '+' : ''}₺{Number(t.realized_pl_try || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                          <div className={isProfit ? 'text-up' : 'text-down'} style={{ fontSize: '10px', opacity: 0.85 }}>
                            ({isProfit ? '+' : ''}${Number(t.realized_pl_usd || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                          </div>
                          {commUSD > 0 && (
                            <div style={{ fontSize: 9, color: '#f59e0b', marginTop: 1 }}>
                              (Komisyon: -${commUSD.toFixed(2)})
                            </div>
                          )}
                        </td>
                        <td className="text-right mono">
                          <span className={`return-badge ${isProfit ? 'up' : 'down'}`}>
                            {isProfit ? '+' : ''}{Number(t.realized_return_pct || t.return_pct || 0).toFixed(2)}%
                          </span>
                        </td>
                        <td className="note-cell" title={t.note || ''}>
                          {t.note || '--'}
                        </td>
                      </>
                    )}

                    {/* Zaman & Enflasyon Röntgeni Görünümü */}
                    {viewMode === 'inflation' && (
                      <>
                        <td className="mono text-muted text-nowrap" style={{ fontSize: '11px' }}>
                          {t.date || '--'}
                        </td>
                        <td>
                          <div className="ticker-cell">
                            <strong className="ticker-symbol mono">{t.ticker}</strong>
                            <span className="ticker-desc">{t.name || t.ticker}</span>
                          </div>
                        </td>
                        <td className="text-center mono">
                          <span 
                            style={{ 
                              fontSize: 10, 
                              padding: '2px 6px', 
                              borderRadius: 4, 
                              background: 'rgba(255,255,255,0.06)', 
                              color: '#fff',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 3
                            }}
                          >
                            <Clock size={10} className="text-gold" />
                            <span>{inf.days} Gün</span>
                          </span>
                        </td>
                        <td className="text-right mono text-muted">
                          {curSign}{Number(t.avg_cost).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="text-right mono text-bright">
                          {curSign}{Number(t.sell_price).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="text-right mono">
                          <span style={{ color: inf.nominalPct >= 0 ? '#10b981' : '#ef4444', fontWeight: 700 }}>
                            {inf.nominalPct >= 0 ? '+' : ''}{inf.nominalPct.toFixed(2)}%
                          </span>
                        </td>
                        <td className="text-right mono" style={{ color: '#fbbf24' }}>
                          +%{inf.ppfHurdlePct.toFixed(2)}
                        </td>
                        <td className="text-right mono">
                          <span 
                            style={{ 
                              fontWeight: 800,
                              color: inf.beatPPF ? '#10b981' : inf.nominalPct > 0 ? '#f59e0b' : '#ef4444',
                              fontSize: 12
                            }}
                          >
                            {inf.realAlphaPct >= 0 ? '+' : ''}{inf.realAlphaPct.toFixed(2)}%
                          </span>
                        </td>
                        <td className="text-right mono">
                          <span style={{ color: inf.realNetProfitTRY >= 0 ? '#10b981' : '#ef4444', fontWeight: 700 }}>
                            {inf.realNetProfitTRY >= 0 ? '+' : ''}₺{inf.realNetProfitTRY.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}
                          </span>
                        </td>
                        <td>
                          {inf.beatPPF ? (
                            <span className="badge-pill emerald" style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                              <CheckCircle2 size={10} /> PPF'yi Yendi (Alfa)
                            </span>
                          ) : inf.nominalPct > 0 ? (
                            <span className="badge-pill gold" style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                              <AlertTriangle size={10} /> Zaman Kaybı (PPF Altı)
                            </span>
                          ) : (
                            <span className="badge-pill red">
                              Reel & Nominal Zarar
                            </span>
                          )}
                        </td>
                      </>
                    )}

                    {/* Komisyon & Net Hasılat Görünümü */}
                    {viewMode === 'commissions' && (
                      <>
                        <td className="mono text-muted text-nowrap" style={{ fontSize: '11px' }}>
                          {t.date || '--'}
                        </td>
                        <td>
                          <div className="ticker-cell">
                            <strong className="ticker-symbol mono">{t.ticker}</strong>
                            <span className="ticker-desc">{t.name || t.ticker}</span>
                          </div>
                        </td>
                        <td className="text-right mono text-bright">
                          {Number(t.shares).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
                        </td>
                        <td className="text-right mono text-muted">
                          {curSign}{Number(t.sell_price).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="text-right mono text-bright">
                          ₺{Number(t.gross_proceeds_try || t.total_proceeds_try || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          {t.currency === 'USD' && (
                            <div style={{ fontSize: 9.5, color: 'var(--text-muted)' }}>
                              (${Number(t.gross_proceeds_usd || t.total_proceeds_usd || 0).toFixed(2)})
                            </div>
                          )}
                        </td>
                        <td className="text-right mono" style={{ color: commUSD > 0 ? '#f59e0b' : '#94a3b8' }}>
                          {commUSD > 0 ? `-$${commUSD.toFixed(2)} (-₺${commTRY.toFixed(1)})` : '₺0.00'}
                        </td>
                        <td className="text-right mono">
                          <strong className="text-cyan">
                            ₺{Number(t.total_proceeds_try || t.proceeds_try || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </strong>
                          {t.currency === 'USD' && (
                            <div style={{ fontSize: 9.5, color: '#06b6d4' }}>
                              (${Number(t.total_proceeds_usd || t.proceeds_usd || 0).toFixed(2)})
                            </div>
                          )}
                        </td>
                        <td className="text-right mono">
                          <strong className={isProfit ? 'text-up' : 'text-down'}>
                            {isProfit ? '+' : ''}₺{Number(t.realized_pl_try || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </strong>
                        </td>
                        <td className="text-right mono">
                          <span className={isProfit ? 'text-up' : 'text-down'}>
                            {isProfit ? '+' : ''}${Number(t.realized_pl_usd || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </td>
                        <td className="note-cell" title={t.note || ''}>
                          {t.note || '--'}
                        </td>
                      </>
                    )}

                    {/* Satır İşlem Butonları */}
                    <td className="text-right">
                      <div className="row-actions">
                        <button
                          type="button"
                          className="btn-action-row shield"
                          onClick={() => onOpenTransferModal(t.total_proceeds_try || t.proceeds_try)}
                          title="Hasılatı Kur Kalkanına Aktar"
                        >
                          <Shield size={11} />
                          <span>Kalkana Aktar</span>
                        </button>
                        <button
                          type="button"
                          className="btn-action-row delete"
                          onClick={() => {
                            if (window.confirm('Bu kapalı işlem kaydını silmek istediğinize emin misiniz?')) {
                              deleteTrade(t.id);
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
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
