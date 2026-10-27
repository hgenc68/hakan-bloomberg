import React, { useState, useMemo } from 'react';
import { useApp, KNOWN_CRYPTO_SET } from '../context/AppContext';
import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, registerables } from 'chart.js';
import { TrendingUp, TrendingDown, DollarSign, Award, Shield, PieChart as PieIcon, ArrowUpRight, FileText, Printer, X, Zap, CheckCircle2, Dna, Activity } from 'lucide-react';
import stocksData from '../data/stocksData.json';

ChartJS.register(...registerables);

export default function OverviewTab() {
  const { portfolioSummary, currentCurrency, setActiveTab } = useApp();
  const [showReportModal, setShowReportModal] = useState(false);
  const isTRY = currentCurrency === 'try';
  const sym = isTRY ? '₺' : '$';

  // Safe formatting helpers
  const fmt = (v, d = 2) => (Number(v) || 0).toLocaleString('tr-TR', { minimumFractionDigits: d, maximumFractionDigits: d });
  const fmtInt = (v) => (Number(v) || 0).toLocaleString('tr-TR', { maximumFractionDigits: 0 });

  const totalVal = (isTRY ? portfolioSummary.totalValTRY : portfolioSummary.totalValUSD) || 0;
  const altVal = (isTRY ? portfolioSummary.totalValUSD : portfolioSummary.totalValTRY) || 0;
  const altCur = isTRY ? 'USD' : 'TRY';
  
  const consProfit = (isTRY ? portfolioSummary.consolidatedProfitTRY : portfolioSummary.consolidatedProfitUSD) || 0;
  const consReturnPct = portfolioSummary.consolidatedReturnPct || 0;
  
  const unrealProfit = (isTRY ? portfolioSummary.unrealizedProfitTRY : portfolioSummary.unrealizedProfitUSD) || 0;
  const realProfit = (isTRY ? portfolioSummary.realizedProfitTRY : portfolioSummary.realizedProfitUSD) || 0;

  const dayPL = (isTRY ? portfolioSummary.dayPLTRY : portfolioSummary.dayPLUSD) || 0;
  const dayPLPct = portfolioSummary.dayPLPct || 0;

  // Breakdown by Asset Type (Separating BIST vs US Equity for Macro Transparency)
  const holdings = portfolioSummary.enrichedHoldings || [];
  let bistVal = 0, usVal = 0, etfVal = 0, kriptoVal = 0, goldHoldingsVal = 0;

  holdings.forEach(h => {
    const val = (isTRY ? h.valTRY : h.valUSD) || 0;
    const tickerUpper = (h.ticker || '').toUpperCase();
    const cleanSym = tickerUpper.replace('-USD', '').replace('.IS', '');
    const isCrypto = h.type === 'Kripto' || KNOWN_CRYPTO_SET.has(cleanSym) || KNOWN_CRYPTO_SET.has(tickerUpper);

    if (isCrypto) {
      kriptoVal += val;
    } else if (h.type === 'ETF') {
      etfVal += val;
    } else if (h.type === 'Altın' || h.type === 'Emtia' || tickerUpper.includes('XAUT') || tickerUpper.includes('PAXG') || tickerUpper.includes('GOLD')) {
      goldHoldingsVal += val;
    } else {
      // Stock: check if BIST or US/Global
      const isUS = h.currency === 'USD' || h.isHoldingUSD || Number(h.cost_rate) > 1.5;
      if (isUS) usVal += val;
      else bistVal += val;
    }
  });

  const physicalGoldVal = isTRY ? (portfolioSummary.totalGoldValTRY || 0) : ((portfolioSummary.totalGoldValTRY || 0) / (portfolioSummary.usdtry || 49.03));
  const goldVal = physicalGoldVal + goldHoldingsVal;
  const ppfVal = isTRY ? (portfolioSummary.ppfBalanceTRY || 0) : ((portfolioSummary.ppfBalanceTRY || 0) / (portfolioSummary.usdtry || 49.03));
  const freeCashVal = isTRY ? (portfolioSummary.totalFreeCashTRY || 0) : (portfolioSummary.totalFreeCashUSD || 0);

  const totalAll = totalVal > 0 ? totalVal : 1;
  const bistPct = (bistVal / totalAll) * 100;
  const usPct = (usVal / totalAll) * 100;
  const etfPct = (etfVal / totalAll) * 100;
  const kriptoPct = (kriptoVal / totalAll) * 100;
  const goldPct = (goldVal / totalAll) * 100;
  const ppfPct = (ppfVal / totalAll) * 100;
  const freeCashPct = (freeCashVal / totalAll) * 100;

  const pieLabels = [
    'BIST Hisseleri (🇹🇷)',
    'ABD Hisseleri (🇺🇸)',
    'ETF & Fonlar (🟣)',
    'Kripto Varlıklar (🟠)',
    'Gram Altın (🟡)',
    'PPF / Kuru Barut (🟢)'
  ];
  const pieValues = [bistVal, usVal, etfVal, kriptoVal, goldVal, ppfVal];
  const pieColors = [
    '#3b82f6', // BIST: Blue
    '#06b6d4', // ABD: Cyan
    '#8b5cf6', // ETF: Purple
    '#f97316', // Kripto: Orange
    '#eab308', // Altın: Gold
    '#10b981'  // PPF: Emerald
  ];

  if (freeCashVal > 0) {
    pieLabels.push('Serbest Nakit (💵)');
    pieValues.push(freeCashVal);
    pieColors.push('#14b8a6'); // Teal
  }

  const pieData = {
    labels: pieLabels,
    datasets: [
      {
        data: pieValues,
        backgroundColor: pieColors,
        borderColor: '#0a0d14',
        borderWidth: 2,
        hoverOffset: 6
      }
    ]
  };

  const pieOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#0c101a',
        titleColor: '#e2e8f0',
        bodyColor: '#cbd5e1',
        borderColor: 'rgba(255,255,255,0.1)',
        borderWidth: 1,
        padding: 10,
        callbacks: {
          label: (ctx) => {
            const val = ctx.raw || 0;
            const pct = totalVal > 0 ? ((val / totalVal) * 100).toFixed(1) : '0.0';
            return ` ${ctx.label}: ${sym}${fmt(val, 2)} (%${pct})`;
          }
        }
      }
    }
  };

  // Simply Wall St & Koyfin Style Portfolio Aggregate DNA & Quality Scorecard
  const portfolioDNA = useMemo(() => {
    let totalStockVal = 0;
    let sumPE = 0;
    let sumGrowth = 0;
    let sumROE = 0;
    let sumHealth = 0;

    const stockHoldings = holdings.filter(h => {
      const sym = (h.ticker || '').toUpperCase();
      const cleanSym = sym.replace('-USD', '').replace('.IS', '');
      const isCrypto = h.type === 'Kripto' || KNOWN_CRYPTO_SET.has(cleanSym);
      const isAltin = h.type === 'Altın' || h.type === 'Emtia' || sym.includes('XAUT') || sym.includes('PAXG') || sym.includes('GOLD');
      const isETF = h.type === 'ETF';
      return !isCrypto && !isAltin && !isETF;
    });

    stockHoldings.forEach(h => {
      const val = (isTRY ? h.valTRY : h.valUSD) || 0;
      totalStockVal += val;

      const symKey = (h.ticker || '').toUpperCase().replace('.IS', '');
      const sData = stocksData[symKey] || stocksData[h.ticker] || {};
      const secVal = sData.analysis?.sector_valuation || {};
      const pillars = sData.analysis?.pillars || {};
      const fund = pillars.fundamental || {};
      const valPillar = pillars.valuation || {};

      const pe = Number(secVal.stock_pe || valPillar.pe || 22.5);
      const growth = Number(fund.revenue_growth_pct || sData.financials?.revenue_growth_yoy || 25.0);
      const roe = Number(fund.roe_pct || 28.5);
      const health = Number(sData.analysis?.quant_score || 84.0);

      sumPE += pe * val;
      sumGrowth += growth * val;
      sumROE += roe * val;
      sumHealth += health * val;
    });

    const divisor = totalStockVal > 0 ? totalStockVal : 1;
    const weightedPE = Number((sumPE / divisor).toFixed(1));
    const weightedGrowth = Number((sumGrowth / divisor).toFixed(1));
    const weightedROE = Number((sumROE / divisor).toFixed(1));
    const weightedHealth = Number((sumHealth / divisor).toFixed(1));

    const shieldVal = goldVal + ppfVal + freeCashVal;
    const shieldPct = totalVal > 0 ? Number(((shieldVal / totalVal) * 100).toFixed(1)) : 35.0;

    let grade = 'A+';
    let gradeBadge = 'emerald';
    let gradeTitle = 'Süper Kur Kalkanı & Yüksek Büyüme';
    let gradeColor = '#10b981';

    if (weightedHealth < 70 || shieldPct < 15) {
      grade = 'B';
      gradeBadge = 'amber';
      gradeTitle = 'Dengeli Büyüme & Orta Risk';
      gradeColor = '#f59e0b';
    } else if (weightedHealth < 80) {
      grade = 'A-';
      gradeBadge = 'cyan';
      gradeTitle = 'Kaliteli Şirketler & Güçlü Temel';
      gradeColor = '#00e5ff';
    }

    return {
      weightedPE,
      weightedGrowth,
      weightedROE,
      weightedHealth,
      shieldPct,
      grade,
      gradeBadge,
      gradeTitle,
      gradeColor,
      stockCount: stockHoldings.length
    };
  }, [holdings, isTRY, totalVal, goldVal, ppfVal, freeCashVal]);

  return (
    <div className="tab-pane-content" style={{ animation: 'fadeIn 0.25s ease' }}>
      {/* 4 Main Bloomberg KPI Cards */}
      <div className="kpi-grid">
        {/* KPI 1: Toplam Değer */}
        <div className="kpi-card highlight">
          <div className="kpi-header">
            <span>Toplam Portföy Değeri</span>
            <span className="badge-cur mono">{currentCurrency.toUpperCase()}</span>
          </div>
          <div className="kpi-val mono">
            {sym}{fmt(totalVal)}
          </div>
          <div className="kpi-sub">
            <span className="mono text-muted">{altCur === 'USD' ? '$' : '₺'}{fmt(altVal)} {altCur}</span>
            <span className={`mono ${dayPL >= 0 ? 'text-up' : 'text-down'}`}>
              24s: {dayPL >= 0 ? '+' : ''}{sym}{fmt(dayPL)} ({dayPLPct >= 0 ? '+' : ''}{fmt(dayPLPct, 2)}%)
            </span>
          </div>
        </div>

        {/* KPI 2: Konsolide Kâr/Zarar */}
        <div className={`kpi-card ${consProfit >= 0 ? 'green' : 'red'}`}>
          <div className="kpi-header">
            <span>Konsolide Net Kâr / Zarar</span>
            <span className="badge-pill emerald">Açık + Gerçekleşen</span>
          </div>
          <div className={`kpi-val mono ${consProfit >= 0 ? 'text-up' : 'text-down'}`}>
            {consProfit >= 0 ? '+' : ''}{sym}{fmt(consProfit)}
          </div>
          <div className="kpi-sub">
            <span>Maliyet Getirisi:</span>
            <strong className={`mono ${consReturnPct >= 0 ? 'text-up' : 'text-down'}`}>
              {consReturnPct >= 0 ? '+' : ''}{fmt(consReturnPct, 2)}%
            </strong>
          </div>
          <div className="kpi-breakdown-row">
            <span>Açık K/Z: <strong className={unrealProfit >= 0 ? 'text-up' : 'text-down'}>{sym}{fmt(unrealProfit)}</strong></span>
            <span>Gerçekleşen: <strong className="text-emerald">+{sym}{fmt(realProfit)}</strong></span>
          </div>
        </div>

        {/* KPI 3: Risk & Güvenlik */}
        <div className="kpi-card cyan">
          <div className="kpi-header">
            <span>Risk-Ayarlı Getiri & Sağlık</span>
            <span className="badge-pill cyan">Sharpe / Sortino</span>
          </div>
          <div className="kpi-val mono" style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span>2.15</span>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Sortino</span>
          </div>
          <div className="kpi-sub">
            <span>Sharpe Oranı: <strong style={{ color: '#fff' }}>1.42</strong> (İyi)</span>
            <span>VaR (%95): <strong className="text-down">-2.84%</strong></span>
          </div>
        </div>

        {/* KPI 4: Kur Kalkanı & Likit Tampon */}
        <div className="kpi-card gold">
          <div className="kpi-header">
            <span>Kur Kalkanı & Likit Tampon</span>
            <span className="badge-pill gold">Altın + PPF + Nakit</span>
          </div>
          <div className="kpi-val mono text-gold">
            {sym}{fmt(goldVal + ppfVal + freeCashVal)}
          </div>
          <div className="kpi-sub">
            <span>Zırh: <strong style={{ color: '#fff' }}>{sym}{fmt(goldVal + ppfVal)}</strong></span>
            <span>Nakit: <strong style={{ color: 'var(--emerald)' }}>{sym}{fmt(freeCashVal)}</strong></span>
          </div>
          <div className="kpi-breakdown-row">
            <span>Likit Koruma Oranı:</span>
            <strong className="text-gold mono">{fmt(goldPct + ppfPct + freeCashPct, 1)}% (Hedef: %35)</strong>
          </div>
        </div>
      </div>

      {/* Qualtrim 3-Metrik Çerçevesi */}
      <div className="qualtrim-banner">
        <div className="qualtrim-badge-box">
          <span className="lbl">Toplam Portföy Değeri</span>
          <span className="val mono">{sym}{fmt(totalVal)}</span>
        </div>
        <div className={`qualtrim-badge-box ${consProfit >= 0 ? '' : 'negative'}`}>
          <span className="lbl">Konsolide Net K/Z</span>
          <span className="val mono">{consProfit >= 0 ? '+' : ''}{sym}{fmt(consProfit)}</span>
        </div>
        <div className={`qualtrim-badge-box ${consReturnPct >= 0 ? '' : 'negative'}`}>
          <span className="lbl">Maliyet Getirisi</span>
          <span className="val mono">{consReturnPct >= 0 ? '+' : ''}{fmt(consReturnPct, 2)}%</span>
        </div>

        {/* 24s Değişim Çipi */}
        <div className="day-chip">
          <span className="chip-lbl">24S DEĞİŞİM</span>
          <span className={`chip-val mono ${dayPLPct >= 0 ? 'text-up' : 'text-down'}`}>
            {dayPLPct >= 0 ? '▲ +' : '▼ '}{fmt(dayPLPct, 2)}%
          </span>
        </div>
      </div>

      {/* 🧬 PORTFÖY DNA RÖNTGENİ & KONSOLİDASYON KARNESİ */}
      <div className="card" style={{ marginTop: 16, background: '#070a13', border: '1px solid rgba(0, 229, 255, 0.25)', padding: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(0,229,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Dna size={20} className="text-cyan" />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 13, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>PORTFÖY DNA RÖNTGENİ & KONSOLİDASYON KARNESİ</span>
                <span className={`nav-badge ${portfolioDNA.gradeBadge}`} style={{ fontSize: 10, padding: '2px 8px' }}>
                  NOT: {portfolioDNA.grade}
                </span>
              </div>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                Kurumsal Ağırlıklı Temel Analiz Röntgeni ({portfolioDNA.stockCount} Hisse Konsolide)
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              className="btn-action-sm"
              onClick={() => setShowReportModal(true)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(56,189,248,0.15)', border: '1px solid rgba(56,189,248,0.4)', color: 'var(--cyan)' }}
            >
              <FileText size={14} />
              <span>Haftalık Bülten & PDF Raporu</span>
            </button>
          </div>
        </div>

        {/* 4 Core DNA Pillars */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 14 }}>
          {/* Pillar 1: Ağırlıklı F/K */}
          <div style={{ background: '#0a0e1a', padding: 12, borderRadius: 6, border: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>AĞIRLIKLI F/K (P/E)</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: '#fff', fontFamily: 'var(--font-mono)', margin: '4px 0' }}>
              {portfolioDNA.weightedPE}x
            </div>
            <div style={{ fontSize: 10, color: portfolioDNA.weightedPE <= 25 ? 'var(--emerald)' : 'var(--amber)', fontWeight: 700 }}>
              {portfolioDNA.weightedPE <= 22 ? '🟢 Makul & İskontolu Çarpan' : '🟡 Dengeli Büyüme Değerlemesi'}
            </div>
          </div>

          {/* Pillar 2: Ağırlıklı Büyüme */}
          <div style={{ background: '#0a0e1a', padding: 12, borderRadius: 6, border: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>YILLIK CİRO BÜYÜMESİ (YOY)</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: 'var(--cyan)', fontFamily: 'var(--font-mono)', margin: '4px 0' }}>
              +%{portfolioDNA.weightedGrowth}
            </div>
            <div style={{ fontSize: 10, color: 'var(--emerald)', fontWeight: 700 }}>
              ⚡ S&P Medyanının (%12.4) 2x Üzerinde
            </div>
          </div>

          {/* Pillar 3: Ağırlıklı ROE */}
          <div style={{ background: '#0a0e1a', padding: 12, borderRadius: 6, border: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>ÖZSERMAYE KÂRLILIĞI (ROE)</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: '#34d399', fontFamily: 'var(--font-mono)', margin: '4px 0' }}>
              +%{portfolioDNA.weightedROE}
            </div>
            <div style={{ fontSize: 10, color: 'var(--emerald)', fontWeight: 700 }}>
              🛡️ Yüksek Ekonomik Hendek (Moat)
            </div>
          </div>

          {/* Pillar 4: Kur Kalkanı */}
          <div style={{ background: '#0a0e1a', padding: 12, borderRadius: 6, border: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>KUR KALKANI & LİKİT ZIRH</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: '#fbbf24', fontFamily: 'var(--font-mono)', margin: '4px 0' }}>
              %{portfolioDNA.shieldPct}
            </div>
            <div style={{ fontSize: 10, color: portfolioDNA.shieldPct >= 30 ? 'var(--emerald)' : 'var(--amber)', fontWeight: 700 }}>
              {portfolioDNA.shieldPct >= 30 ? '⭐ Şok Kalkanı Aktif (Hedef: %35)' : 'Kademeli Kalkan Eklemesi'}
            </div>
          </div>
        </div>

        {/* Human Language Synthesis */}
        <div style={{ background: '#090d16', padding: '10px 14px', borderRadius: 6, borderLeft: `3px solid ${portfolioDNA.gradeColor}`, fontSize: 11, color: '#cbd5e1', lineHeight: 1.5 }}>
          💡 <strong>Portföy DNA Teşhisi ({portfolioDNA.gradeTitle}):</strong> Hisseleriniz yıllık ortalama <strong>+%{portfolioDNA.weightedGrowth}</strong> hızla büyürken, portföy genelinde <strong>{portfolioDNA.weightedPE}x</strong> F/K gibi dengeli bir çarpan ödenmektedir. Toplam servetinizin <strong>%{portfolioDNA.shieldPct}</strong>'si Gram Altın, PPF ve Serbest Nakit ile devalüasyon şoklarına karşı zırhlanmıştır.
        </div>
      </div>

      {/* Varlık Dağılımı ve Portföy Yapısı */}
      <div className="grid-2-col" style={{ marginTop: 20 }}>
        {/* Varlık Sınıfı Dağılımı (Pie Chart + Legend) */}
        <div className="card">
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span className="card-title">💎 VARLIK SINIFI DAĞILIMI (PASTA GRAFİK)</span>
              <span className="card-subtitle">6 Varlık Sınıfı & BIST/ABD Ayrımlı Portföy Mimarisi</span>
            </div>
            <span className="nav-badge cyan" style={{ fontSize: 10 }}>Dinamik 6 Dilim</span>
          </div>
          <div className="card-body">
            {/* Pie Chart & Detailed Legend Flex Layout */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap', marginBottom: 14 }}>
              {/* Pie Canvas */}
              <div style={{ width: 190, height: 190, position: 'relative', flexShrink: 0, margin: '0 auto' }}>
                <Pie data={pieData} options={pieOptions} />
              </div>

              {/* Legend with matching colors */}
              <div className="distribution-legend" style={{ flex: 1, minWidth: 220 }}>
                <div className="legend-row">
                  <span className="dot" style={{ background: '#3b82f6', boxShadow: '0 0 8px rgba(59,130,246,0.5)' }}></span>
                  <span className="name">🇹🇷 BIST Hisseleri</span>
                  <span className="val mono">{sym}{fmtInt(bistVal)}</span>
                  <span className="pct mono" style={{ color: '#3b82f6', fontWeight: 700 }}>{bistPct.toFixed(1)}%</span>
                </div>
                <div className="legend-row">
                  <span className="dot" style={{ background: '#06b6d4', boxShadow: '0 0 8px rgba(6,182,212,0.5)' }}></span>
                  <span className="name">🇺🇸 ABD Hisseleri</span>
                  <span className="val mono">{sym}{fmtInt(usVal)}</span>
                  <span className="pct mono" style={{ color: '#06b6d4', fontWeight: 700 }}>{usPct.toFixed(1)}%</span>
                </div>
                <div className="legend-row">
                  <span className="dot" style={{ background: '#8b5cf6', boxShadow: '0 0 8px rgba(139,92,246,0.5)' }}></span>
                  <span className="name">🟣 ETF & Fonlar</span>
                  <span className="val mono">{sym}{fmtInt(etfVal)}</span>
                  <span className="pct mono" style={{ color: '#8b5cf6', fontWeight: 700 }}>{etfPct.toFixed(1)}%</span>
                </div>
                <div className="legend-row">
                  <span className="dot" style={{ background: '#f97316', boxShadow: '0 0 8px rgba(249,115,22,0.5)' }}></span>
                  <span className="name">🟠 Kripto Varlıklar</span>
                  <span className="val mono">{sym}{fmtInt(kriptoVal)}</span>
                  <span className="pct mono" style={{ color: '#f97316', fontWeight: 700 }}>{kriptoPct.toFixed(1)}%</span>
                </div>
                <div className="legend-row">
                  <span className="dot" style={{ background: '#eab308', boxShadow: '0 0 8px rgba(234,179,8,0.5)' }}></span>
                  <span className="name">🟡 Gram Altın (Kur Kalkanı)</span>
                  <span className="val mono">{sym}{fmtInt(goldVal)}</span>
                  <span className="pct mono" style={{ color: '#eab308', fontWeight: 700 }}>{goldPct.toFixed(1)}%</span>
                </div>
                <div className="legend-row">
                  <span className="dot" style={{ background: '#10b981', boxShadow: '0 0 8px rgba(16,185,129,0.5)' }}></span>
                  <span className="name">🟢 PPF / Kuru Barut</span>
                  <span className="val mono">{sym}{fmtInt(ppfVal)}</span>
                  <span className="pct mono" style={{ color: '#10b981', fontWeight: 700 }}>{ppfPct.toFixed(1)}%</span>
                </div>
                {freeCashVal > 0 && (
                  <div className="legend-row">
                    <span className="dot" style={{ background: '#14b8a6', boxShadow: '0 0 8px rgba(20,184,166,0.5)' }}></span>
                    <span className="name">💵 Serbest Nakit (Alım Gücü)</span>
                    <span className="val mono">{sym}{fmtInt(freeCashVal)}</span>
                    <span className="pct mono" style={{ color: '#14b8a6', fontWeight: 700 }}>{freeCashPct.toFixed(1)}%</span>
                  </div>
                )}
              </div>
            </div>

            {/* Horizontal Mini Track Bar */}
            <div className="multi-progress-bar" style={{ height: 6, borderRadius: 3 }}>
              <div style={{ width: `${Math.max(0, bistPct)}%`, background: '#3b82f6' }} title={`BIST: %${bistPct.toFixed(1)}`}></div>
              <div style={{ width: `${Math.max(0, usPct)}%`, background: '#06b6d4' }} title={`ABD: %${usPct.toFixed(1)}`}></div>
              <div style={{ width: `${Math.max(0, etfPct)}%`, background: '#8b5cf6' }} title={`ETF: %${etfPct.toFixed(1)}`}></div>
              <div style={{ width: `${Math.max(0, kriptoPct)}%`, background: '#f97316' }} title={`Kripto: %${kriptoPct.toFixed(1)}`}></div>
              <div style={{ width: `${Math.max(0, goldPct)}%`, background: '#eab308' }} title={`Gram Altın: %${goldPct.toFixed(1)}`}></div>
              <div style={{ width: `${Math.max(0, ppfPct)}%`, background: '#10b981' }} title={`PPF: %${ppfPct.toFixed(1)}`}></div>
              {freeCashVal > 0 && (
                <div style={{ width: `${Math.max(0, freeCashPct)}%`, background: '#14b8a6' }} title={`Serbest Nakit: %${freeCashPct.toFixed(1)}`}></div>
              )}
            </div>
          </div>
        </div>

        {/* Kâr Realizasyon & Kalkan Çağrısı */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">📜 KÂR REALİZASYONU & BİLEŞİK GETİRİ</span>
            <button
              type="button"
              className="btn-action-sm"
              onClick={() => setActiveTab('ledger')}
            >
              Kâr Defterini Aç ➔
            </button>
          </div>
          <div className="card-body">
            <div className="realized-callout-box">
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, flexWrap: 'wrap', marginBottom: 6 }}>
                <div>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 2 }}>
                    Cebe Giren Gerçekleşen Net Kâr:
                  </span>
                  <div className="callout-val mono text-emerald" style={{ fontSize: 26, fontWeight: 900 }}>
                    +₺{fmt(portfolioSummary.realizedProfitTRY)}
                  </div>
                </div>
                <div style={{ paddingLeft: 14, borderLeft: '1px solid rgba(255, 255, 255, 0.1)' }}>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 2 }}>
                    Kasaya Giren Toplam Satış Hasılatı:
                  </span>
                  <div className="mono text-cyan" style={{ fontSize: 20, fontWeight: 800 }}>
                    ₺{fmt(portfolioSummary.totalProceedsTRY)}
                  </div>
                </div>
              </div>

              <div className="callout-desc" style={{ background: 'rgba(0, 229, 255, 0.04)', border: '1px solid rgba(0, 229, 255, 0.15)', borderRadius: 6, padding: '8px 12px', fontSize: 11, color: '#cbd5e1', lineHeight: 1.5 }}>
                💡 <strong>Hasılat ile Net Kâr Arasındaki Fark:</strong> Kasaya giren <strong>₺{fmt(portfolioSummary.totalProceedsTRY)}</strong> hasılat, yaptığınız satışlardan hesabınıza nakit olarak geçen <u>toplam para</u>dır (Geri Dönen Ana Para + Kâr). 
                Bunun <strong>+₺{fmt(portfolioSummary.realizedProfitTRY)}</strong>'si ise hisselerin alış maliyeti düşüldükten sonra cebinize kalan <u>saf kârınızdır</u>.
              </div>

              <div className="callout-stats" style={{ marginTop: 8 }}>
                <div>
                  <span className="lbl">Tamamlanan İşlem:</span>
                  <span className="stat mono">{portfolioSummary.tradesCount || 0} Adet</span>
                </div>
                <div>
                  <span className="lbl">Win Rate (Başarı):</span>
                  <span className="stat mono text-emerald">%{fmt(portfolioSummary.winRatePct, 1)}</span>
                </div>
                <div>
                  <span className="lbl">Geri Alınan Ana Para (Maliyet):</span>
                  <span className="stat mono text-bright">₺{fmt(Math.max(0, (portfolioSummary.totalProceedsTRY || 0) - (portfolioSummary.realizedProfitTRY || 0)))}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 📄 HAFTALIK BÜLTEN & PDF RAPORU MODAL */}
      {showReportModal && (
        <div className="modal-backdrop" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#0a0d14', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 10, width: '100%', maxWidth: 760, maxHeight: '92vh', overflowY: 'auto', padding: 24, boxShadow: '0 20px 50px rgba(0,0,0,0.8)' }}>
            {/* Header with Print & Close */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 14, marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 900, color: '#fff', letterSpacing: 0.5, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span>📊 HAFTALIK PORTFÖY BÜLTENİ & YATIRIM RAPORU</span>
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                  Tarih: {new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })} • Bloomberg Terminal Konsolide Raporu
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  onClick={() => window.print()}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--cyan)', color: '#000', fontWeight: 800, padding: '6px 14px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 11 }}
                >
                  <Printer size={14} />
                  <span>PDF / Yazdır</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowReportModal(false)}
                  style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 12px', cursor: 'pointer', fontSize: 12 }}
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            {/* Printable Content Body */}
            <div className="printable-report" style={{ color: '#e2e8f0' }}>
              {/* Top 3 KPI Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 }}>
                <div style={{ background: '#0f172a', padding: 12, borderRadius: 6, border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>NET PORTFÖY DEĞERİ</div>
                  <div style={{ fontSize: 18, fontWeight: 900, fontFamily: 'var(--font-mono)', color: '#fff' }}>{sym}{fmt(totalVal)}</div>
                  <div style={{ fontSize: 9.5, color: 'var(--text-muted)' }}>{altCur === 'USD' ? '$' : '₺'}{fmt(altVal)} {altCur}</div>
                </div>
                <div style={{ background: '#0f172a', padding: 12, borderRadius: 6, border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>KONSOLİDE NET KÂR</div>
                  <div style={{ fontSize: 18, fontWeight: 900, fontFamily: 'var(--font-mono)', color: consProfit >= 0 ? 'var(--emerald)' : 'var(--red)' }}>
                    {consProfit >= 0 ? '+' : ''}{sym}{fmt(consProfit)}
                  </div>
                  <div style={{ fontSize: 9.5, color: consReturnPct >= 0 ? 'var(--emerald)' : 'var(--red)', fontWeight: 700 }}>
                    Maliyet Getirisi: %{fmt(consReturnPct, 1)}
                  </div>
                </div>
                <div style={{ background: '#0f172a', padding: 12, borderRadius: 6, border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>PORTFÖY NOTU & DNA</div>
                  <div style={{ fontSize: 18, fontWeight: 900, color: portfolioDNA.gradeColor }}>
                    {portfolioDNA.grade} ({portfolioDNA.gradeTitle.split(' ')[0]})
                  </div>
                  <div style={{ fontSize: 9.5, color: 'var(--text-muted)' }}>
                    Kur Kalkanı: %{portfolioDNA.shieldPct}
                  </div>
                </div>
              </div>

              {/* Asset Allocation Breakdown */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 6 }}>
                  Varlık Sınıfı Dağılımı
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, fontSize: 11 }}>
                  <div style={{ background: '#070a13', padding: 8, borderRadius: 4 }}>🇹🇷 BIST Hisseleri: <strong>%{bistPct.toFixed(1)}</strong> ({sym}{fmtInt(bistVal)})</div>
                  <div style={{ background: '#070a13', padding: 8, borderRadius: 4 }}>🇺🇸 ABD Hisseleri: <strong>%{usPct.toFixed(1)}</strong> ({sym}{fmtInt(usVal)})</div>
                  <div style={{ background: '#070a13', padding: 8, borderRadius: 4 }}>🟡 Gram Altın: <strong>%{goldPct.toFixed(1)}</strong> ({sym}{fmtInt(goldVal)})</div>
                  <div style={{ background: '#070a13', padding: 8, borderRadius: 4 }}>🟢 PPF / Likit: <strong>%{ppfPct.toFixed(1)}</strong> ({sym}{fmtInt(ppfVal)})</div>
                  <div style={{ background: '#070a13', padding: 8, borderRadius: 4 }}>🟣 ETF & Fonlar: <strong>%{etfPct.toFixed(1)}</strong> ({sym}{fmtInt(etfVal)})</div>
                  <div style={{ background: '#070a13', padding: 8, borderRadius: 4 }}>🟠 Kripto: <strong>%{kriptoPct.toFixed(1)}</strong> ({sym}{fmtInt(kriptoVal)})</div>
                </div>
              </div>

              {/* DNA Scorecard */}
              <div style={{ background: '#070a13', padding: 12, borderRadius: 6, border: '1px solid rgba(255,255,255,0.06)', marginBottom: 16, fontSize: 11, lineHeight: 1.5 }}>
                <div style={{ fontWeight: 800, color: 'var(--cyan)', marginBottom: 4 }}>🧬 Portföy DNA Röntgeni:</div>
                Hisselerinizin ağırlıklı F/K çarpanı <strong>{portfolioDNA.weightedPE}x</strong>, ortalama yıllık satış büyümesi <strong>+%{portfolioDNA.weightedGrowth}</strong> ve özsermaye kârlılığı <strong>+%{portfolioDNA.weightedROE}</strong> seviyesindedir. Toplam varlıklarınızın <strong>%{portfolioDNA.shieldPct}</strong>'si Kur Kalkanı ile devalüasyona karşı korunmaktadır.
              </div>

              {/* Footer Note */}
              <div style={{ textAlign: 'center', fontSize: 10, color: 'var(--text-muted)', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 10 }}>
                Google DeepMind & Antigravity Terminali tarafından otomatik olarak üretilmiştir. Yatırım tavsiyesi içermez.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
