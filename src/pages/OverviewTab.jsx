import React from 'react';
import { useApp, KNOWN_CRYPTO_SET } from '../context/AppContext';
import { Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend
} from 'chart.js';
import { TrendingUp, TrendingDown, DollarSign, Award, Shield, PieChart as PieIcon, ArrowUpRight } from 'lucide-react';

ChartJS.register(ArcElement, Tooltip, Legend);

export default function OverviewTab() {
  const { portfolioSummary, currentCurrency, setActiveTab } = useApp();
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
    </div>
  );
}
