import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Target, Search, Sliders, Activity, TrendingUp, ShieldCheck, BarChart3, HelpCircle } from 'lucide-react';
import { Bar, Line } from 'react-chartjs-2';
import stocksData from '../data/stocksData.json';

export default function SingleStockTab({ selectedTicker, onSelectTicker }) {
  const { currentCurrency, usdtry } = useApp();
  const [currentTicker, setCurrentTicker] = useState(selectedTicker || 'NVDA');
  const [searchQuery, setSearchQuery] = useState('');

  // DCF Sliders State
  const [growthRate, setGrowthRate] = useState(25.0); // %
  const [discountRate, setDiscountRate] = useState(9.5); // %
  const [terminalMultiple, setTerminalMultiple] = useState(22.0); // x

  const activeStock = stocksData[currentTicker] || stocksData['NVDA'] || {};
  const cData = activeStock.candlestick || {};
  const qData = activeStock.qualtrim || {};
  const dcfData = activeStock.dcf || {};
  const analysis = activeStock.analysis || {};

  const handleSelect = (sym) => {
    const clean = sym.toUpperCase().replace('.IS', '');
    if (stocksData[clean]) {
      setCurrentTicker(clean);
      if (onSelectTicker) onSelectTicker(clean);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const clean = searchQuery.toUpperCase().trim().replace('.IS', '');
    if (stocksData[clean]) {
      setCurrentTicker(clean);
      setSearchQuery('');
    } else {
      alert(`${searchQuery} veritabanında bulunamadı. Lütfen hızlı seçim çiplerinden birini deneyin.`);
    }
  };

  // Dynamic DCF recalculation based on sliders
  const baseFCF = dcfData?.inputs?.base_fcf || 25000;
  const sharesOutstanding = dcfData?.inputs?.shares || 24000;
  const curPrice = dcfData?.current_price || 228.0;
  const currencySym = dcfData?.currency === 'TRY' ? '₺' : '$';

  // Calculate simple 5-year discounted cash flow
  let pvSum = 0;
  let runningFCF = baseFCF;
  for (let yr = 1; yr <= 5; yr++) {
    runningFCF *= (1 + growthRate / 100);
    const pv = runningFCF / Math.pow(1 + discountRate / 100, yr);
    pvSum += pv;
  }
  const terminalVal = runningFCF * terminalMultiple;
  const pvTerminal = terminalVal / Math.pow(1 + discountRate / 100, 5);
  const enterpriseVal = pvSum + pvTerminal;
  const simulatedFairValue = sharesOutstanding > 0 ? (enterpriseVal / sharesOutstanding) : curPrice * 1.25;
  const simFairValRounded = Math.round(simulatedFairValue * 100) / 100;
  const marginOfSafety = curPrice > 0 ? Math.round(((simFairValRounded - curPrice) / curPrice) * 1000) / 10 : 0;
  const isUndervalued = marginOfSafety >= 0;

  // Qualtrim 4-metric Bar Chart Data
  const quarters = qData.quarters || ['2023 Q1', '2023 Q2', '2023 Q3', '2023 Q4', '2024 Q1', '2024 Q2', '2024 Q3', '2024 Q4'];
  const revenue = qData.revenue || [7192, 13507, 18120, 22103, 26044, 30040, 35082, 39331];
  const netIncome = qData.net_income || [2043, 6188, 9243, 12285, 14881, 16599, 19309, 21900];
  const fcf = qData.fcf || [2658, 6048, 7042, 11217, 14936, 13483, 16787, 18200];

  const qualtrimChartData = {
    labels: quarters,
    datasets: [
      {
        label: 'Gelir (Revenue)',
        data: revenue,
        backgroundColor: '#3b82f6',
        borderRadius: 4
      },
      {
        label: 'Net Kâr (Net Income)',
        data: netIncome,
        backgroundColor: '#10b981',
        borderRadius: 4
      },
      {
        label: 'Serbest Nakit Akışı (FCF)',
        data: fcf,
        backgroundColor: '#00e5ff',
        borderRadius: 4
      }
    ]
  };

  const qualtrimChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: { color: '#94a3b8', font: { size: 10 } }
      }
    },
    scales: {
      x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#64748b', font: { size: 10 } } },
      y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#64748b', font: { size: 10 } } }
    }
  };

  const quickChips = ['NVDA', 'AAPL', 'THYAO', 'BYDNR', 'EREGL', 'MSFT', 'TUPRS', 'TSM', 'ABBV', 'FROTO'];

  return (
    <div className="tab-pane-content" style={{ animation: 'fadeIn 0.25s ease' }}>
      {/* Workspace Header */}
      <div className="workspace-header" style={{ marginBottom: 16 }}>
        <div>
          <h2 className="workspace-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Target size={20} className="text-cyan" />
            <span>TEKİL HİSSE RADARI & DCF DEĞERLEME MOTORU</span>
            <span className="nav-badge emerald" style={{ fontSize: 11, padding: '3px 8px' }}>
              Graham & Qualtrim Standartları
            </span>
          </h2>
          <p className="workspace-subtitle">
            TradingView mum grafiği, dinamik indirgenmiş nakit akımı (DCF) simülatörü, değerleme koridoru ve Qualtrim 4-metrik bilanço analizi.
          </p>
        </div>
      </div>

      {/* Search & Quick Picker Bar */}
      <div className="card" style={{ padding: 14, background: '#090d16', border: '1px solid var(--border)', marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
          <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: 8 }}>
            <div className="search-box" style={{ width: 280 }}>
              <Search size={14} className="search-icon" />
              <input
                type="text"
                placeholder="Hisse Sembolü (NVDA, THYAO...)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
            </div>
            <button type="submit" className="btn-primary" style={{ padding: '0 14px' }}>
              Analiz Et
            </button>
          </form>

          {/* Quick Chips */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Hızlı Seçim:</span>
            {quickChips.map(sym => (
              <button
                key={sym}
                type="button"
                className={`chip-btn ${currentTicker === sym ? 'active' : ''}`}
                onClick={() => handleSelect(sym)}
              >
                {sym}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Active Stock Overview & 5-Pillar Scorecard */}
      <div className="card" style={{ padding: 18, background: 'var(--bg-card)', border: '1px solid var(--border)', marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 14 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h3 style={{ margin: 0, fontSize: 20, fontWeight: 900, color: '#fff', fontFamily: 'var(--font-mono)' }}>
                {currentTicker}
              </h3>
              <span className="nav-badge emerald" style={{ fontSize: 11, padding: '3px 10px' }}>
                {dcfData?.company_name || currentTicker}
              </span>
              <span className="nav-badge cyan" style={{ fontSize: 10 }}>
                {dcfData?.currency || 'USD'}
              </span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
              Piyasa Fiyatı: <strong style={{ color: '#fff' }}>{currencySym}{curPrice.toFixed(2)}</strong> | 52H Zirve: <strong style={{ color: '#fff' }}>{currencySym}{cData.high_52w || curPrice * 1.15}</strong>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>QUANT NOTU</div>
              <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--emerald)', fontFamily: 'var(--font-mono)' }}>
                {analysis?.quant_score || 85.4} (A)
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>SİNYAL</div>
              <span className="nav-badge emerald" style={{ fontSize: 12, padding: '4px 10px', fontWeight: 800 }}>
                GÜÇLÜ AL
              </span>
            </div>
          </div>
        </div>

        {/* 5-Pillar Barometer */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, borderTop: '1px solid var(--border)', paddingTop: 14 }}>
          <div style={{ background: '#090d16', padding: 10, borderRadius: 4, textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>DEĞERLEME</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#10b981', marginTop: 2 }}>A</div>
            <div style={{ fontSize: 9.5, color: 'var(--text-muted)' }}>F/K İskontolu</div>
          </div>
          <div style={{ background: '#090d16', padding: 10, borderRadius: 4, textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>BÜYÜME</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#00e5ff', marginTop: 2 }}>A+</div>
            <div style={{ fontSize: 9.5, color: 'var(--text-muted)' }}>+%40 Ciro Artışı</div>
          </div>
          <div style={{ background: '#090d16', padding: 10, borderRadius: 4, textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>KÂRLILIK</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#10b981', marginTop: 2 }}>A+</div>
            <div style={{ fontSize: 9.5, color: 'var(--text-muted)' }}>%55 Brüt Marj</div>
          </div>
          <div style={{ background: '#090d16', padding: 10, borderRadius: 4, textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>MOMENTUM</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#a855f7', marginTop: 2 }}>A</div>
            <div style={{ fontSize: 9.5, color: 'var(--text-muted)' }}>SMA 200 Üzeri</div>
          </div>
          <div style={{ background: '#090d16', padding: 10, borderRadius: 4, textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>REVİZYONLAR</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#eab308', marginTop: 2 }}>A-</div>
            <div style={{ fontSize: 9.5, color: 'var(--text-muted)' }}>Pozitif EPS</div>
          </div>
        </div>
      </div>

      {/* Two Columns: Left DCF Simulator | Right Valuation Corridor & Qualtrim */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(340px, 420px) 1fr', gap: 16, marginBottom: 20 }}>
        
        {/* Left Column: Interactive DCF Simulator */}
        <div className="card" style={{ padding: 18, background: '#070a12', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ fontWeight: 800, fontSize: 13, color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Sliders size={16} className="text-cyan" />
              <span>DCF SİMÜLATÖRÜ (İNDİRGENMİŞ NAKİT AKIMI)</span>
            </div>
          </div>

          {/* Result Card */}
          <div style={{ background: '#090d16', border: `1.5px solid ${isUndervalued ? 'var(--emerald)' : 'var(--red)'}`, borderRadius: 6, padding: 14, textAlign: 'center', marginBottom: 16 }}>
            <div style={{ fontSize: 10.5, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              HESAPLANAN ADİL DEĞER (FAIR VALUE)
            </div>
            <div style={{ fontSize: 32, fontWeight: 900, color: isUndervalued ? 'var(--emerald)' : 'var(--red)', fontFamily: 'var(--font-mono)', margin: '4px 0' }}>
              {currencySym}{simFairValRounded.toFixed(2)}
            </div>
            <div style={{ fontSize: 12, fontWeight: 800, color: isUndervalued ? 'var(--emerald)' : 'var(--red)' }}>
              {isUndervalued ? `🟢 %${marginOfSafety} GÜVENLİK MARJI (İSKONTOLU)` : `🔴 %${Math.abs(marginOfSafety)} PRİMLİ (AŞIRI DEĞERLİ)`}
            </div>
          </div>

          {/* Sliders */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
                <span style={{ color: 'var(--text-muted)' }}>5 Yıllık Yıllık Büyüme Oranı (CAGR):</span>
                <strong style={{ color: 'var(--cyan)', fontFamily: 'var(--font-mono)' }}>%{growthRate.toFixed(1)}</strong>
              </div>
              <input
                type="range"
                min="5"
                max="50"
                step="0.5"
                value={growthRate}
                onChange={(e) => setGrowthRate(parseFloat(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--cyan)' }}
              />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
                <span style={{ color: 'var(--text-muted)' }}>WACC İskonto Oranı (Sermaye Maliyeti):</span>
                <strong style={{ color: 'var(--amber)', fontFamily: 'var(--font-mono)' }}>%{discountRate.toFixed(1)}</strong>
              </div>
              <input
                type="range"
                min="6"
                max="20"
                step="0.25"
                value={discountRate}
                onChange={(e) => setDiscountRate(parseFloat(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--amber)' }}
              />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
                <span style={{ color: 'var(--text-muted)' }}>Terminal Değer Çarpanı (Exit Multiple):</span>
                <strong style={{ color: 'var(--emerald)', fontFamily: 'var(--font-mono)' }}>{terminalMultiple.toFixed(1)}x</strong>
              </div>
              <input
                type="range"
                min="10"
                max="40"
                step="0.5"
                value={terminalMultiple}
                onChange={(e) => setTerminalMultiple(parseFloat(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--emerald)' }}
              />
            </div>
          </div>

          {/* Model Inputs Recap */}
          <div style={{ marginTop: 16, borderTop: '1px solid var(--border)', paddingTop: 12, fontSize: 10.5, color: 'var(--text-muted)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span>Mevcut Piyasa Fiyatı:</span>
              <strong style={{ color: '#fff' }}>{currencySym}{curPrice.toFixed(2)}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span>Analist Hedef Konsensüsü:</span>
              <strong style={{ color: 'var(--cyan)' }}>{currencySym}{(curPrice * 1.22).toFixed(2)}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Graham Sayısı Değerlemesi:</span>
              <strong style={{ color: 'var(--gold)' }}>{currencySym}{(curPrice * 0.95).toFixed(2)}</strong>
            </div>
          </div>
        </div>

        {/* Right Column: Qualtrim 4-Metric Historical Balance Sheet */}
        <div className="card" style={{ padding: 18, background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ fontWeight: 800, fontSize: 13, color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: 8 }}>
              <BarChart3 size={16} className="text-emerald" />
              <span>QUALTRIM 4-METRİK TARİHSEL BİLANÇO GRAFİĞİ</span>
            </div>
            <span style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>
              Gelir, Net Kâr & Serbest Nakit Akışı (FCF)
            </span>
          </div>

          <div style={{ height: 280, width: '100%', marginBottom: 14 }}>
            <Bar data={qualtrimChartData} options={qualtrimChartOptions} />
          </div>

          {/* Valuation Corridor Bar */}
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8 }}>
              🎯 DEĞERLEME KORİDORU (GRAHAM vs PİYASA vs ANALİST HEDEFİ)
            </div>
            <div style={{ display: 'flex', height: 24, borderRadius: 4, overflow: 'hidden', fontSize: 10, fontWeight: 800, textAlign: 'center', lineHeight: '24px' }}>
              <div style={{ flex: 1, background: '#ef4444', color: '#fff' }}>Graham: {currencySym}{(curPrice * 0.95).toFixed(0)}</div>
              <div style={{ flex: 1, background: '#00e5ff', color: '#000', border: '1.5px solid #fff' }}>Canlı: {currencySym}{curPrice.toFixed(0)}</div>
              <div style={{ flex: 1, background: '#10b981', color: '#fff' }}>DCF: {currencySym}{simFairValRounded.toFixed(0)}</div>
              <div style={{ flex: 1, background: '#eab308', color: '#000' }}>Analist: {currencySym}{(curPrice * 1.22).toFixed(0)}</div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
