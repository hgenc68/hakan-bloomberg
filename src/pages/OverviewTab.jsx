import React from 'react';
import { useApp } from '../context/AppContext';
import { TrendingUp, TrendingDown, DollarSign, Award, Shield, PieChart } from 'lucide-react';

export default function OverviewTab() {
  const { portfolioSummary, currentCurrency, setActiveTab } = useApp();
  const isTRY = currentCurrency === 'try';
  const sym = isTRY ? '₺' : '$';

  const totalVal = isTRY ? portfolioSummary.totalValTRY : portfolioSummary.totalValUSD;
  const altVal = isTRY ? portfolioSummary.totalValUSD : portfolioSummary.totalValTRY;
  const altCur = isTRY ? 'USD' : 'TRY';
  
  const consProfit = isTRY ? portfolioSummary.consolidatedProfitTRY : portfolioSummary.consolidatedProfitUSD;
  const consReturnPct = portfolioSummary.consolidatedReturnPct || 0;
  
  const unrealProfit = isTRY ? portfolioSummary.unrealizedProfitTRY : portfolioSummary.unrealizedProfitUSD;
  const realProfit = isTRY ? portfolioSummary.realizedProfitTRY : portfolioSummary.realizedProfitUSD;

  const dayPL = isTRY ? portfolioSummary.dayPLTRY : portfolioSummary.dayPLUSD;
  const dayPLPct = portfolioSummary.dayPLPct || 0;

  // Breakdown by Asset Type
  const holdings = portfolioSummary.enrichedHoldings || [];
  let hisseVal = 0, etfVal = 0, kriptoVal = 0;

  holdings.forEach(h => {
    const val = isTRY ? h.valTRY : h.valUSD;
    if (h.type === 'Kripto') kriptoVal += val;
    else if (h.type === 'ETF') etfVal += val;
    else hisseVal += val;
  });

  const goldVal = isTRY ? portfolioSummary.totalGoldValTRY : (portfolioSummary.totalGoldValTRY / portfolioSummary.usdtry);
  const ppfVal = isTRY ? portfolioSummary.ppfBalanceTRY : (portfolioSummary.ppfBalanceTRY / portfolioSummary.usdtry);

  const totalAll = totalVal > 0 ? totalVal : 1;
  const hissePct = (hisseVal / totalAll) * 100;
  const etfPct = (etfVal / totalAll) * 100;
  const kriptoPct = (kriptoVal / totalAll) * 100;
  const goldPct = (goldVal / totalAll) * 100;
  const ppfPct = (ppfVal / totalAll) * 100;

  return (
    <div className="tab-pane-content">
      {/* 4 Main Bloomberg KPI Cards */}
      <div className="kpi-grid">
        {/* KPI 1: Toplam Değer */}
        <div className="kpi-card highlight">
          <div className="kpi-header">
            <span>Toplam Portföy Değeri</span>
            <span className="badge-cur mono">{currentCurrency.toUpperCase()}</span>
          </div>
          <div className="kpi-val mono">
            {sym}{totalVal.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="kpi-sub">
            <span className="mono text-muted">{altCur === 'USD' ? '$' : '₺'}{altVal.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {altCur}</span>
            <span className={`mono ${dayPL >= 0 ? 'text-up' : 'text-down'}`}>
              24s: {dayPL >= 0 ? '+' : ''}{sym}{dayPL.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({dayPLPct >= 0 ? '+' : ''}{dayPLPct.toFixed(2)}%)
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
            {consProfit >= 0 ? '+' : ''}{sym}{consProfit.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="kpi-sub">
            <span>Maliyet Getirisi:</span>
            <strong className={`mono ${consReturnPct >= 0 ? 'text-up' : 'text-down'}`}>
              {consReturnPct >= 0 ? '+' : ''}{consReturnPct.toFixed(2)}%
            </strong>
          </div>
          <div className="kpi-breakdown-row">
            <span>Açık K/Z: <strong className={unrealProfit >= 0 ? 'text-up' : 'text-down'}>{sym}{unrealProfit.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></span>
            <span>Gerçekleşen: <strong className="text-emerald">+{sym}{realProfit.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></span>
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

        {/* KPI 4: Kur Kalkanı */}
        <div className="kpi-card gold">
          <div className="kpi-header">
            <span>Kur Kalkanı & Kuru Barut</span>
            <span className="badge-pill gold">Altın + PPF</span>
          </div>
          <div className="kpi-val mono text-gold">
            {sym}{(goldVal + ppfVal).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="kpi-sub">
            <span>Gram Altın: <strong style={{ color: '#fff' }}>{portfolioSummary.totalGrams} gr</strong></span>
            <span>PPF: <strong style={{ color: '#fff' }}>₺{portfolioSummary.ppfBalanceTRY.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</strong></span>
          </div>
          <div className="kpi-breakdown-row">
            <span>Kalkan Koruma Oranı:</span>
            <strong className="text-gold mono">{(goldPct + ppfPct).toFixed(1)}% (Hedef: %35)</strong>
          </div>
        </div>
      </div>

      {/* Qualtrim 3-Metrik Çerçevesi */}
      <div className="qualtrim-banner">
        <div className="qualtrim-badge-box">
          <span className="lbl">Toplam Portföy Değeri</span>
          <span className="val mono">{sym}{totalVal.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
        <div className={`qualtrim-badge-box ${consProfit >= 0 ? '' : 'negative'}`}>
          <span className="lbl">Konsolide Net K/Z</span>
          <span className="val mono">{consProfit >= 0 ? '+' : ''}{sym}{consProfit.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
        <div className={`qualtrim-badge-box ${consReturnPct >= 0 ? '' : 'negative'}`}>
          <span className="lbl">Maliyet Getirisi</span>
          <span className="val mono">{consReturnPct >= 0 ? '+' : ''}{consReturnPct.toFixed(2)}%</span>
        </div>

        {/* 24s Değişim Çipi */}
        <div className="day-chip">
          <span className="chip-lbl">24S DEĞİŞİM</span>
          <span className={`chip-val mono ${dayPLPct >= 0 ? 'text-up' : 'text-down'}`}>
            {dayPLPct >= 0 ? '▲ +' : '▼ '}{dayPLPct.toFixed(2)}%
          </span>
        </div>
      </div>

      {/* Varlık Dağılımı ve Portföy Yapısı */}
      <div className="grid-2-col">
        {/* Varlık Sınıfı Dağılımı */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">💎 VARLIK SINIFI DAĞILIMI (ASSET ALLOCATION)</span>
            <span className="card-subtitle">Portföy Ağırlık Dağılımı</span>
          </div>
          <div className="card-body">
            {/* Progress bar */}
            <div className="multi-progress-bar">
              <div className="bar-segment hisse" style={{ width: `${hissePct}%` }} title={`Hisse: %${hissePct.toFixed(1)}`}></div>
              <div className="bar-segment etf" style={{ width: `${etfPct}%` }} title={`ETF: %${etfPct.toFixed(1)}`}></div>
              <div className="bar-segment kripto" style={{ width: `${kriptoPct}%` }} title={`Kripto: %${kriptoPct.toFixed(1)}`}></div>
              <div className="bar-segment altin" style={{ width: `${goldPct}%` }} title={`Gram Altın: %${goldPct.toFixed(1)}`}></div>
              <div className="bar-segment ppf" style={{ width: `${ppfPct}%` }} title={`PPF: %${ppfPct.toFixed(1)}`}></div>
            </div>

            {/* Legend list */}
            <div className="distribution-legend">
              <div className="legend-row">
                <span className="dot hisse"></span>
                <span className="name">Hisse Senedi (BIST & ABD)</span>
                <span className="val mono">{sym}{hisseVal.toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                <span className="pct mono">{hissePct.toFixed(1)}%</span>
              </div>
              <div className="legend-row">
                <span className="dot etf"></span>
                <span className="name">ETF & Fonlar</span>
                <span className="val mono">{sym}{etfVal.toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                <span className="pct mono">{etfPct.toFixed(1)}%</span>
              </div>
              <div className="legend-row">
                <span className="dot kripto"></span>
                <span className="name">Kripto Varlıklar</span>
                <span className="val mono">{sym}{kriptoVal.toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                <span className="pct mono">{kriptoPct.toFixed(1)}%</span>
              </div>
              <div className="legend-row">
                <span className="dot altin"></span>
                <span className="name">Gram Altın (Kur Kalkanı)</span>
                <span className="val mono">{sym}{goldVal.toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                <span className="pct mono">{goldPct.toFixed(1)}%</span>
              </div>
              <div className="legend-row">
                <span className="dot ppf"></span>
                <span className="name">PPF / TL Likit Kuru Barut</span>
                <span className="val mono">{sym}{ppfVal.toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                <span className="pct mono">{ppfPct.toFixed(1)}%</span>
              </div>
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
              <div className="callout-val mono text-emerald">
                +₺{portfolioSummary.realizedProfitTRY.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="callout-desc">
                Kısmi veya tam satış yaparak cebinize koyduğunuz kesinleşmiş net kazançtır.
                Piyasa çökse veya hisseleriniz düşse dahi bu kâr kesinleşmiştir ve riskten korunmaktadır.
              </div>
              <div className="callout-stats">
                <div>
                  <span className="lbl">Tamamlanan İşlem:</span>
                  <span className="stat mono">{portfolioSummary.tradesCount} Adet</span>
                </div>
                <div>
                  <span className="lbl">Win Rate (Başarı):</span>
                  <span className="stat mono text-emerald">%{portfolioSummary.winRatePct.toFixed(1)}</span>
                </div>
                <div>
                  <span className="lbl">Kasaya Giren Hasılat:</span>
                  <span className="stat mono text-cyan">₺{portfolioSummary.totalProceedsTRY.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
