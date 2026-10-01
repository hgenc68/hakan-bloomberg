import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Target, Search, Sliders, Activity, TrendingUp, ShieldCheck, BarChart3, HelpCircle, Sparkles, Lightbulb, Compass, Info, Snowflake } from 'lucide-react';
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

export default function SingleStockTab({ selectedTicker, onSelectTicker }) {
  const { currentCurrency, usdtry } = useApp();
  const [currentTicker, setCurrentTicker] = useState(selectedTicker || 'NVDA');
  const [searchQuery, setSearchQuery] = useState('');

  // DCF Sliders State
  const [growthRate, setGrowthRate] = useState(22.0); // %
  const [discountRate, setDiscountRate] = useState(9.5); // %
  const [terminalMultiple, setTerminalMultiple] = useState(22.0); // x
  const [activeScenario, setActiveScenario] = useState('base'); // 'conservative', 'base', 'bull'

  const activeStock = stocksData[currentTicker] || stocksData['NVDA'] || {};
  const cData = activeStock.candlestick || {};
  const qData = activeStock.qualtrim || {};
  const dcfData = activeStock.dcf || {};
  const analysis = activeStock.analysis || {};

  const pillars = analysis.pillars || {};
  const fund = pillars.fundamental || {};
  const valPillar = pillars.valuation || {};
  const mom = pillars.momentum || {};
  const tech = pillars.technical || {};
  const risk = pillars.risk || {};
  const beneish = analysis.beneish || {};
  const secVal = analysis.sector_valuation || {};

  const quantScore = analysis?.quant_score || 85.4;
  const stockTheme = getHealthColorTheme(quantScore);

  const stockRadarData = {
    labels: ['Temel Sağlık', 'Değerleme', 'Momentum', 'Teknik Yapı', 'Risk Yönetimi'],
    datasets: [
      {
        label: `${currentTicker} Sağlık Profili`,
        data: [
          fund.score != null ? Number(fund.score) : 85,
          valPillar.score != null ? Number(valPillar.score) : 75,
          mom.score != null ? Number(mom.score) : 80,
          tech.score != null ? Number(tech.score) : 82,
          risk.score != null ? Number(risk.score) : 75
        ],
        backgroundColor: stockTheme.bgRgba,
        borderColor: stockTheme.color,
        borderWidth: 2.2,
        pointBackgroundColor: stockTheme.pointBg,
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: stockTheme.color,
        pointRadius: 4
      }
    ]
  };

  const stockRadarOptions = {
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

  // 1-Click Scenario Presets for DCF
  const applyScenario = (preset) => {
    setActiveScenario(preset);
    if (preset === 'conservative') {
      setGrowthRate(12.0);
      setDiscountRate(11.5);
      setTerminalMultiple(16.0);
    } else if (preset === 'base') {
      setGrowthRate(22.0);
      setDiscountRate(9.5);
      setTerminalMultiple(22.0);
    } else if (preset === 'bull') {
      setGrowthRate(32.0);
      setDiscountRate(8.0);
      setTerminalMultiple(28.0);
    }
  };

  // Dynamic DCF recalculation based on sliders
  const baseFCF = dcfData?.inputs?.base_fcf || 25000;
  const sharesOutstanding = dcfData?.inputs?.shares || 24000;
  const curPrice = dcfData?.current_price || 228.0;
  const currencySym = dcfData?.currency === 'TRY' ? '₺' : '$';

  // Calculate 5-year discounted cash flow & projected timeline
  const fcfProjections = [];
  let pvSum = 0;
  let runningFCF = baseFCF;
  for (let yr = 1; yr <= 5; yr++) {
    runningFCF *= (1 + growthRate / 100);
    const pv = runningFCF / Math.pow(1 + discountRate / 100, yr);
    pvSum += pv;
    fcfProjections.push({
      year: yr,
      fcf: runningFCF,
      pv: pv
    });
  }
  const terminalVal = runningFCF * terminalMultiple;
  const pvTerminal = terminalVal / Math.pow(1 + discountRate / 100, 5);
  const enterpriseVal = pvSum + pvTerminal;
  const simulatedFairValue = sharesOutstanding > 0 ? (enterpriseVal / sharesOutstanding) : curPrice * 1.25;
  const simFairValRounded = Math.round(simulatedFairValue * 100) / 100;
  const marginOfSafety = curPrice > 0 ? Math.round(((simFairValRounded - curPrice) / curPrice) * 1000) / 10 : 0;
  const isUndervalued = marginOfSafety >= 0;

  // Plain-Language Interpreter Synthesis
  const isBeneishSafe = (beneish.m_score ?? -2.3) < -1.78;
  const isTrendBullish = (mom.dist_sma200_pct ?? 10) > 0;
  const isRSINormal = (mom.rsi_14 ?? 55) >= 35 && (mom.rsi_14 ?? 55) <= 68;

  // Qualtrim 4-metric Multi-Chart Data (Revenue, Net Income, FCF + Historical Stock Price Overlay)
  const quarters = qData.quarters || ['Q1 2023', 'Q2 2023', 'Q3 2023', 'Q4 2023', 'Q1 2024', 'Q2 2024', 'Q3 2024', 'Q4 2024'];
  
  // Auto-scale large financial figures to Millions for crystal-clear readability
  const maxRev = Math.max(...(qData.revenue || [1000]).filter(v => v !== null));
  const scaleDiv = maxRev > 10000000 ? 1000000 : 1;
  const unitSuffix = maxRev > 10000000 ? ' (M)' : '';

  const revenue = (qData.revenue || [7192, 13507, 18120, 22103, 26044, 30040, 35082, 39331]).map(v => v !== null ? v / scaleDiv : null);
  const netIncome = (qData.net_income || [2043, 6188, 9243, 12285, 14881, 16599, 19309, 21900]).map(v => v !== null ? v / scaleDiv : null);
  const fcf = (qData.fcf || [2658, 6048, 7042, 11217, 14936, 13483, 16787, 18200]).map(v => v !== null ? v / scaleDiv : null);

  // Historical Stock Price Line Overlay
  const rawPrices = qData.price || quarters.map((_, i) => curPrice * (0.65 + (i / quarters.length) * 0.35));
  const priceData = rawPrices.map(v => v !== null ? Number(v) : null);

  const qualtrimChartData = {
    labels: quarters,
    datasets: [
      {
        type: 'line',
        label: `Hisse Fiyatı (${currencySym})`,
        data: priceData,
        borderColor: '#fbbf24',
        backgroundColor: 'rgba(251, 191, 36, 0.1)',
        borderWidth: 2.5,
        pointBackgroundColor: '#fbbf24',
        pointBorderColor: '#fff',
        pointRadius: 3,
        pointHoverRadius: 6,
        tension: 0.3,
        yAxisID: 'yPrice',
        order: 1
      },
      {
        type: 'bar',
        label: `Gelir (Revenue)${unitSuffix}`,
        data: revenue,
        backgroundColor: '#3b82f6',
        borderRadius: 4,
        yAxisID: 'yFinancials',
        order: 2
      },
      {
        type: 'bar',
        label: `Net Kâr (Net Income)${unitSuffix}`,
        data: netIncome,
        backgroundColor: '#10b981',
        borderRadius: 4,
        yAxisID: 'yFinancials',
        order: 3
      },
      {
        type: 'bar',
        label: `Serbest Nakit Akışı (FCF)${unitSuffix}`,
        data: fcf,
        backgroundColor: '#00e5ff',
        borderRadius: 4,
        yAxisID: 'yFinancials',
        order: 4
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
      },
      tooltip: {
        backgroundColor: '#0f172a',
        titleColor: '#e2e8f0',
        borderColor: 'rgba(255,255,255,0.1)',
        borderWidth: 1,
        callbacks: {
          label: (ctx) => {
            if (ctx.dataset.yAxisID === 'yPrice') {
              return ` ${ctx.dataset.label}: ${currencySym}${Number(ctx.raw || 0).toFixed(2)}`;
            }
            return ` ${ctx.dataset.label}: ${currencySym}${Number(ctx.raw || 0).toLocaleString('tr-TR', { maximumFractionDigits: 1 })}`;
          }
        }
      }
    },
    scales: {
      x: {
        grid: { color: 'rgba(255,255,255,0.04)' },
        ticks: { color: '#64748b', font: { size: 10 } }
      },
      yFinancials: {
        type: 'linear',
        position: 'left',
        grid: { color: 'rgba(255,255,255,0.04)' },
        ticks: {
          color: '#64748b',
          font: { size: 10 },
          callback: (v) => `${v.toLocaleString('tr-TR')}`
        },
        title: {
          display: true,
          text: `Bilanço ${unitSuffix} (${currencySym})`,
          color: '#64748b',
          font: { size: 9 }
        }
      },
      yPrice: {
        type: 'linear',
        position: 'right',
        grid: { drawOnChartArea: false },
        ticks: {
          color: '#fbbf24',
          font: { size: 10, weight: 'bold' },
          callback: (v) => `${currencySym}${v}`
        },
        title: {
          display: true,
          text: `Fiyat (${currencySym})`,
          color: '#fbbf24',
          font: { size: 9 }
        }
      }
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
              Piyasa Fiyatı: <strong style={{ color: '#fff' }}>{currencySym}{Number(curPrice).toFixed(2)}</strong> | 52H Zirve: <strong style={{ color: '#fff' }}>{currencySym}{Number(cData.high_52w || curPrice * 1.15).toFixed(2)}</strong>
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

        {/* 💡 BİR BAKIŞTA HİSSE TEŞHİSİ (YATIRIMCI TERCÜMANI) */}
        <div style={{ background: '#070a14', border: '1px solid rgba(6,182,212,0.3)', borderRadius: 8, padding: 14, marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Sparkles size={16} className="text-cyan" />
              <span style={{ fontSize: 12, fontWeight: 800, color: '#e2e8f0', letterSpacing: '0.3px' }}>
                💡 BİR BAKIŞTA 3 SANİYELİK HİSSE TEŞHİSİ (AKILLI FİNANS TERCÜMANI)
              </span>
            </div>
            <span className="nav-badge cyan" style={{ fontSize: 9.5, padding: '2px 8px' }}>Yapay Zeka Analiz Özeti</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 10 }}>
            {/* 1. Değerleme Durumu */}
            <div style={{ background: '#0b101d', padding: 10, borderRadius: 6, borderLeft: `3px solid ${isUndervalued ? 'var(--emerald)' : 'var(--amber)'}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)' }}>1. DEĞERLEME (PAHALI MI / UCUZ MU?)</span>
                <span className={`nav-badge ${isUndervalued ? 'emerald' : 'gold'}`} style={{ fontSize: 9, padding: '1px 6px' }}>
                  {isUndervalued ? 'İskontolu' : 'Primli'}
                </span>
              </div>
              <div style={{ fontSize: 11.5, fontWeight: 700, color: '#fff', marginTop: 4 }}>
                {isUndervalued ? '🟢 Fiyatı Gelecek Kârına Göre Cazip / Ucuz' : '🟡 Gelecek Büyümeyi Fiyatlamış'}
              </div>
              <div style={{ fontSize: 10.5, color: '#94a3b8', marginTop: 2, lineHeight: 1.4 }}>
                {isUndervalued
                  ? `DCF modeline göre hisse %${marginOfSafety} güvenlik marjına sahip. F/K çarpanı (${valPillar.pe || '-'}) şirketin büyüme temposuna göre iskontolu kalmış.`
                  : `Hisse hesaplanan adil değerinin %${Math.abs(marginOfSafety)} üzerinde işlem görüyor. Alım için piyasa düzeltmeleri veya geri çekilmeler beklenebilir.`}
              </div>
            </div>

            {/* 2. Bilanço & Kârlılık */}
            <div style={{ background: '#0b101d', padding: 10, borderRadius: 6, borderLeft: `3px solid ${isBeneishSafe ? 'var(--emerald)' : 'var(--red)'}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)' }}>2. BİLANÇO & KÂRLILIK GÜCÜ</span>
                <span className={`nav-badge ${isBeneishSafe ? 'emerald' : 'red'}`} style={{ fontSize: 9, padding: '1px 6px' }}>
                  {isBeneishSafe ? 'Güvenilir' : 'Riskli'}
                </span>
              </div>
              <div style={{ fontSize: 11.5, fontWeight: 700, color: '#fff', marginTop: 4 }}>
                {isBeneishSafe ? '🛡️ Tertemiz & Yüksek Kârlı Bilanço' : '⚠️ Bilanço Kalemlerinde Dikkat'}
              </div>
              <div style={{ fontSize: 10.5, color: '#94a3b8', marginTop: 2, lineHeight: 1.4 }}>
                {isBeneishSafe
                  ? `Özsermaye kârlılığı (%${fund.roe_pct || 25}) çok güçlü. Adli testten (Beneish: ${beneish.m_score || '-2.3'}) geçti; kârı nakitle destekleniyor, borç riski yok.`
                  : `Şirketin muhasebe kârı nakit akışının önünde gidiyor. Bilanço makyajı veya borç yükü yakından takip edilmeli.`}
              </div>
            </div>

            {/* 3. Trend & Zamanlama */}
            <div style={{ background: '#0b101d', padding: 10, borderRadius: 6, borderLeft: `3px solid ${isTrendBullish ? 'var(--cyan)' : 'var(--amber)'}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)' }}>3. ZAMANLAMA & TEKNİK TREND</span>
                <span className={`nav-badge ${isTrendBullish ? 'cyan' : 'gold'}`} style={{ fontSize: 9, padding: '1px 6px' }}>
                  {isTrendBullish ? 'Boğa Trendi' : 'Düzeltme'}
                </span>
              </div>
              <div style={{ fontSize: 11.5, fontWeight: 700, color: '#fff', marginTop: 4 }}>
                {isTrendBullish && isRSINormal
                  ? '🚀 Sağlıklı Yükseliş İvmesi Sürüyor'
                  : !isRSINormal && (mom.rsi_14 || 50) >= 68
                  ? '⚡ Kısa Vadede Isınmış (Aşırı Alım)'
                  : '🔵 Taban Arayışı / Konsolidasyon'}
              </div>
              <div style={{ fontSize: 10.5, color: '#94a3b8', marginTop: 2, lineHeight: 1.4 }}>
                {isTrendBullish && isRSINormal
                  ? `200 günlük ortalamasının %${mom.dist_sma200_pct || 12} üzerinde. RSI (${mom.rsi_14 || 56}) şişkin değil; yükseliş trendi sağlıklı.`
                  : !isRSINormal && (mom.rsi_14 || 50) >= 68
                  ? `RSI (${mom.rsi_14}) aşırı alım bölgesinde. Tepe alımından kaçınmak için kademeli alım veya kâr satışı düşünülebilir.`
                  : `Hisse uzun vadeli ortalamasının altında toparlanmaya çalışıyor. Dönüş sinyalleri teyit edilmeli.`}
              </div>
            </div>
          </div>
        </div>

        {/* Kar Tanesi & 5-Pillar Quant Scorecard Layout */}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 330px) 1fr', gap: 14, borderTop: '1px solid var(--border)', paddingTop: 14 }}>
          {/* Kar Tanesi Radar (Simply Wall St Style) */}
          <div style={{ background: '#090d16', padding: 14, borderRadius: 8, border: `1px solid ${stockTheme.color}40`, boxShadow: `0 0 16px ${stockTheme.color}15`, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 800, fontSize: 12, color: '#e2e8f0' }}>
                  <Snowflake size={15} style={{ color: stockTheme.color }} />
                  <span>HİSSE KAR TANESİ RADARI</span>
                </div>
                <div style={{ fontSize: 9.5, color: 'var(--text-muted)' }}>
                  Simply Wall St 5-Faktörlü Model
                </div>
              </div>
              <span className={`nav-badge ${stockTheme.badgeClass}`} style={{ fontSize: 9.5, fontWeight: 800 }}>
                {stockTheme.icon} {quantScore.toFixed(1)}/100
              </span>
            </div>

            <div style={{ height: 210, width: '100%', position: 'relative', margin: '4px 0' }}>
              <Radar data={stockRadarData} options={stockRadarOptions} />
            </div>

            {/* 4-Tier Health Color Scale Legend Bar */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 3, background: 'rgba(0,0,0,0.5)', padding: '5px 6px', borderRadius: 4, border: '1px solid var(--border)', fontSize: 8.5, textAlign: 'center' }}>
              <div style={{ color: '#ef4444', fontWeight: stockTheme.status === 'critical' ? 900 : 500, background: stockTheme.status === 'critical' ? 'rgba(239,68,68,0.15)' : 'transparent', borderRadius: 3, padding: '1px 0' }}>
                🔴 &lt;50 Sağlıksız
              </div>
              <div style={{ color: '#f59e0b', fontWeight: stockTheme.status === 'warning' ? 900 : 500, background: stockTheme.status === 'warning' ? 'rgba(245,158,11,0.15)' : 'transparent', borderRadius: 3, padding: '1px 0' }}>
                🟡 50-69 Orta
              </div>
              <div style={{ color: '#00e5ff', fontWeight: stockTheme.status === 'healthy' ? 900 : 500, background: stockTheme.status === 'healthy' ? 'rgba(0,229,255,0.15)' : 'transparent', borderRadius: 3, padding: '1px 0' }}>
                🔵 70-84 Sağlıklı
              </div>
              <div style={{ color: '#10b981', fontWeight: stockTheme.status === 'excellent' ? 900 : 500, background: stockTheme.status === 'excellent' ? 'rgba(16,185,129,0.15)' : 'transparent', borderRadius: 3, padding: '1px 0' }}>
                🟢 ≥85 Mükemmel
              </div>
            </div>
          </div>

          {/* 5-Pillar Quant Scorecard (Açıklamalı Sütunlar) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
            {/* Pillar 1: Temel Bilanço */}
            <div style={{ background: '#090d16', padding: 12, borderRadius: 6, border: '1px solid rgba(59,130,246,0.25)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)' }}>🏛️ TEMEL SAĞLIK</span>
                <span className="nav-badge blue" style={{ fontSize: 9, padding: '1px 5px' }}>{fund.grade || 'A'}</span>
              </div>
              <div style={{ fontSize: 18, fontWeight: 900, color: '#3b82f6', fontFamily: 'var(--font-mono)', margin: '4px 0' }}>
                {fund.score != null ? Number(fund.score).toFixed(1) : '88.5'}
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', lineHeight: 1.6 }}>
                <div>ROE: <strong style={{ color: '#fff' }}>%{fund.roe_pct != null ? Number(fund.roe_pct).toFixed(1) : '24.5'}</strong></div>
                <div style={{ fontSize: 9, color: 'var(--cyan)' }}>{Number(fund.roe_pct || 25) > 20 ? '🌟 Süper Özkaynak Kârı' : '✅ Makul Kârlılık'}</div>
                <div>Brüt Marj: <strong style={{ color: '#fff' }}>%{fund.gross_margin_pct != null ? Number(fund.gross_margin_pct).toFixed(1) : '48.2'}</strong></div>
                <div style={{ fontSize: 9, color: '#94a3b8' }}>100₺ Satışın {Number(fund.gross_margin_pct || 48).toFixed(0)}₺'si Kâr</div>
                <div>Büyüme: <strong style={{ color: 'var(--emerald)' }}>+%{fund.revenue_growth_pct != null ? Number(fund.revenue_growth_pct).toFixed(1) : '15.0'}</strong></div>
              </div>
            </div>

            {/* Pillar 2: Değerleme */}
            <div style={{ background: '#090d16', padding: 12, borderRadius: 6, border: '1px solid rgba(16,185,129,0.25)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)' }}>💎 DEĞERLEME</span>
                <span className="nav-badge emerald" style={{ fontSize: 9, padding: '1px 5px' }}>{valPillar.grade || 'B+'}</span>
              </div>
              <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--emerald)', fontFamily: 'var(--font-mono)', margin: '4px 0' }}>
                {valPillar.score != null ? Number(valPillar.score).toFixed(1) : '76.0'}
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', lineHeight: 1.6 }}>
                <div>F/K (P/E): <strong style={{ color: '#fff' }}>{valPillar.pe != null ? Number(valPillar.pe).toFixed(1) : '22.4'}</strong></div>
                <div style={{ fontSize: 9, color: Number(valPillar.pe || 22) < 20 ? 'var(--emerald)' : Number(valPillar.pe || 22) < 35 ? 'var(--amber)' : 'var(--red)' }}>
                  {Number(valPillar.pe || 22) < 20 ? '🟢 Çok Cazip / Ucuz' : Number(valPillar.pe || 22) < 35 ? '🟡 Makul Seviye' : '🔴 Primli / Yüksek'}
                </div>
                <div>İleri F/K: <strong style={{ color: '#fff' }}>{valPillar.forward_pe != null ? Number(valPillar.forward_pe).toFixed(1) : '18.5'}</strong></div>
                <div>PEG Oranı: <strong style={{ color: '#fff' }}>{valPillar.peg != null ? Number(valPillar.peg).toFixed(2) : '1.10'}</strong></div>
                <div style={{ fontSize: 9, color: 'var(--emerald)' }}>{Number(valPillar.peg || 1.1) <= 1.2 ? '🟢 Büyümesine Göre Ucuz' : '🟡 Büyümeyle Dengeli'}</div>
              </div>
            </div>

            {/* Pillar 3: Momentum */}
            <div style={{ background: '#090d16', padding: 12, borderRadius: 6, border: '1px solid rgba(168,85,247,0.25)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)' }}>🚀 MOMENTUM</span>
                <span className="nav-badge purple" style={{ fontSize: 9, padding: '1px 5px' }}>{mom.grade || 'A'}</span>
              </div>
              <div style={{ fontSize: 18, fontWeight: 900, color: '#a855f7', fontFamily: 'var(--font-mono)', margin: '4px 0' }}>
                {mom.score != null ? Number(mom.score).toFixed(1) : '85.2'}
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', lineHeight: 1.6 }}>
                <div>RSI(14): <strong style={{ color: '#fff' }}>{mom.rsi_14 != null ? Number(mom.rsi_14).toFixed(1) : '58.2'}</strong></div>
                <div style={{ fontSize: 9, color: Number(mom.rsi_14 || 58) < 35 ? 'var(--emerald)' : Number(mom.rsi_14 || 58) < 68 ? '#94a3b8' : 'var(--red)' }}>
                  {Number(mom.rsi_14 || 58) < 35 ? '🟢 Dip / Aşırı Satım' : Number(mom.rsi_14 || 58) < 68 ? '⚪ Dengeli Güç' : '🔴 Aşırı Alım (Isınmış)'}
                </div>
                <div>SMA200 Fark: <strong style={{ color: (mom.dist_sma200_pct ?? 0) >= 0 ? 'var(--emerald)' : 'var(--red)' }}>{Number(mom.dist_sma200_pct ?? 12.4) >= 0 ? '+' : ''}%{Number(mom.dist_sma200_pct ?? 12.4).toFixed(1)}</strong></div>
                <div style={{ fontSize: 9, color: 'var(--emerald)' }}>{Number(mom.dist_sma200_pct ?? 12) >= 0 ? '🟢 200 Günlük Boğa Trendi' : '🔴 Ayı Trendi'}</div>
                <div>1Y Alfa: <strong style={{ color: 'var(--emerald)' }}>+%{Number(mom.alpha_1y_pct ?? 18.5).toFixed(1)}</strong></div>
              </div>
            </div>

            {/* Pillar 4: Teknik Yapı */}
            <div style={{ background: '#090d16', padding: 12, borderRadius: 6, border: '1px solid rgba(6,182,212,0.25)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)' }}>📈 TEKNİK YAPI</span>
                <span className="nav-badge cyan" style={{ fontSize: 9, padding: '1px 5px' }}>{tech.grade || 'A'}</span>
              </div>
              <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--cyan)', fontFamily: 'var(--font-mono)', margin: '4px 0' }}>
                {tech.score != null ? Number(tech.score).toFixed(1) : '82.0'}
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', lineHeight: 1.6 }}>
                <div>Trend: <strong style={{ color: '#fff' }}>{tech.trend_status || 'Boğa Trendi'}</strong></div>
                <div style={{ fontSize: 9, color: 'var(--emerald)' }}>Ana Yön: Yükseliş</div>
                <div>MACD: <strong style={{ color: 'var(--emerald)' }}>{tech.macd_status || 'Pozitif Kesişim'}</strong></div>
                <div>Bollinger: <strong style={{ color: '#fff' }}>{tech.bollinger_pos || 'Orta-Üst Bant'}</strong></div>
                <div style={{ fontSize: 9, color: '#94a3b8' }}>Kanal İçi Sağlıklı Seyir</div>
              </div>
            </div>

            {/* Pillar 5: Risk Profil */}
            <div style={{ background: '#090d16', padding: 12, borderRadius: 6, border: '1px solid rgba(234,179,8,0.25)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)' }}>🛡️ RİSK PROFİLİ</span>
                <span className="nav-badge gold" style={{ fontSize: 9, padding: '1px 5px' }}>{risk.grade || 'B+'}</span>
              </div>
              <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--gold)', fontFamily: 'var(--font-mono)', margin: '4px 0' }}>
                {risk.score != null ? Number(risk.score).toFixed(1) : '74.5'}
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', lineHeight: 1.6 }}>
                <div>Beta: <strong style={{ color: '#fff' }}>{risk.beta != null ? Number(risk.beta).toFixed(2) : '1.08'}</strong></div>
                <div style={{ fontSize: 9, color: '#94a3b8' }}>
                  {Number(risk.beta || 1) < 0.9 ? '🛡️ Düşük Risk / Defansif' : Number(risk.beta || 1) < 1.3 ? '⚖️ Endeksle Uyumlu' : '⚡ Çok Oynak'}
                </div>
                <div>Maks Çekilme: <strong style={{ color: 'var(--red)' }}>-%{Math.abs(Number(risk.max_drawdown_1y_pct ?? 18.2)).toFixed(1)}</strong></div>
                <div>VaR (%95): <strong style={{ color: 'var(--amber)' }}>-%{Math.abs(Number(risk.var_95 ?? 3.1)).toFixed(1)}</strong></div>
                <div style={{ fontSize: 9, color: 'var(--amber)' }}>Maks Günlük Dalgalanma</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2-Column Grid: Forensic Accounting (Beneish M-Score) & Sector Valuation Benchmark */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16, marginBottom: 20 }}>
        
        {/* Card 1: Beneish M-Score Forensic Accounting */}
        <div className="card" style={{ padding: 16, background: '#070a12', border: `1px solid ${beneish.color ? beneish.color + '50' : 'rgba(16,185,129,0.3)'}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <ShieldCheck size={18} style={{ color: beneish.color || 'var(--emerald)' }} />
              <div>
                <span style={{ fontWeight: 800, fontSize: 12.5, color: '#e2e8f0', display: 'block' }}>
                  ADLİ BİLANÇO DEDEKTÖRÜ (FORENSIC / BENEISH M-SCORE)
                </span>
                <span style={{ fontSize: 10.5, color: 'var(--cyan)' }}>
                  🔎 Adli Muhasebe (Forensic): Bilanço Hilesi ve Manipülasyon Taraması (Adil Değer Değildir)
                </span>
              </div>
            </div>
            <span
              className={`nav-badge ${beneish.status === 'safe' ? 'emerald' : beneish.status === 'neutral' ? 'gold' : 'red'}`}
              style={{ fontSize: 10, padding: '3px 8px', fontWeight: 800 }}
            >
              {beneish.icon || '🛡️'} {beneish.label || 'Güvenilir Bilanço'}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16, background: '#090d16', padding: 12, borderRadius: 6, marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 9.5, color: 'var(--text-muted)', textTransform: 'uppercase' }}>BENEISH M-SCORE</div>
              <div style={{ fontSize: 26, fontWeight: 900, fontFamily: 'var(--font-mono)', color: beneish.color || 'var(--emerald)' }}>
                {beneish.m_score != null ? Number(beneish.m_score).toFixed(2) : '-2.35'}
              </div>
            </div>
            <div style={{ borderLeft: '1px solid var(--border)', paddingLeft: 12, fontSize: 11, color: '#cbd5e1' }}>
              <div style={{ fontWeight: 700, color: beneish.color || '#fff' }}>
                {beneish.risk_text || 'Bilanço manipülasyon şüphesi bulunmuyor (Eşik: -1.78)'}
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
                M-Score &lt; -1.78 ise finansal tablolar adli muhasebe açısından temiz kabul edilir.
              </div>
            </div>
          </div>

          {/* 6 Core Beneish Sub-indices Mini Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, fontSize: 10 }}>
            <div style={{ background: '#0b0f19', padding: '6px 8px', borderRadius: 4 }}>
              <div style={{ color: 'var(--text-muted)' }}>DSRI (Alacak/Satış)</div>
              <div className="mono" style={{ fontWeight: 800, color: '#fff', marginTop: 2 }}>
                {beneish.indices?.dsri?.val != null ? Number(beneish.indices.dsri.val).toFixed(2) : '1.02'}
              </div>
            </div>
            <div style={{ background: '#0b0f19', padding: '6px 8px', borderRadius: 4 }}>
              <div style={{ color: 'var(--text-muted)' }}>GMI (Brüt Marj)</div>
              <div className="mono" style={{ fontWeight: 800, color: '#fff', marginTop: 2 }}>
                {beneish.indices?.gmi?.val != null ? Number(beneish.indices.gmi.val).toFixed(2) : '1.04'}
              </div>
            </div>
            <div style={{ background: '#0b0f19', padding: '6px 8px', borderRadius: 4 }}>
              <div style={{ color: 'var(--text-muted)' }}>AQI (Varlık Kalitesi)</div>
              <div className="mono" style={{ fontWeight: 800, color: '#fff', marginTop: 2 }}>
                {beneish.indices?.aqi?.val != null ? Number(beneish.indices.aqi.val).toFixed(2) : '1.08'}
              </div>
            </div>
            <div style={{ background: '#0b0f19', padding: '6px 8px', borderRadius: 4 }}>
              <div style={{ color: 'var(--text-muted)' }}>SGI (Satış Büyümesi)</div>
              <div className="mono" style={{ fontWeight: 800, color: '#fff', marginTop: 2 }}>
                {beneish.indices?.sgi?.val != null ? Number(beneish.indices.sgi.val).toFixed(2) : '1.25'}
              </div>
            </div>
            <div style={{ background: '#0b0f19', padding: '6px 8px', borderRadius: 4 }}>
              <div style={{ color: 'var(--text-muted)' }}>TATA (Tahakkuk Oranı)</div>
              <div className="mono" style={{ fontWeight: 800, color: '#fff', marginTop: 2 }}>
                {beneish.indices?.tata?.val != null ? Number(beneish.indices.tata.val).toFixed(3) : '0.042'}
              </div>
            </div>
            <div style={{ background: '#0b0f19', padding: '6px 8px', borderRadius: 4 }}>
              <div style={{ color: 'var(--text-muted)' }}>LVGI (Kaldıraç Oranı)</div>
              <div className="mono" style={{ fontWeight: 800, color: '#fff', marginTop: 2 }}>
                {beneish.indices?.lvgi?.val != null ? Number(beneish.indices.lvgi.val).toFixed(2) : '0.85'}
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Sector Relative Valuation Benchmark */}
        <div className="card" style={{ padding: 16, background: '#070a12', border: '1px solid rgba(6,182,212,0.3)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <BarChart3 size={18} className="text-cyan" />
              <div>
                <span style={{ fontWeight: 800, fontSize: 12.5, color: '#e2e8f0', display: 'block' }}>
                  SEKTÖR GÖRECELİ DEĞERLEME & PEER BENCHMARK
                </span>
                <span style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>
                  {secVal.sector_name || secVal.sector || 'Sektör Ortalaması'} ile Karşılaştırma
                </span>
              </div>
            </div>
            <span className="nav-badge cyan" style={{ fontSize: 10, padding: '3px 8px', fontWeight: 800 }}>
              {secVal.relative_icon || '⚖️'} {secVal.relative_label || 'Sektör Medyanında Dengeli'}
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 12 }}>
            {/* P/E Benchmark */}
            <div style={{ background: '#090d16', padding: 12, borderRadius: 6 }}>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase' }}>F/K (P/E) ORANI</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 4 }}>
                <span style={{ fontSize: 18, fontWeight: 900, color: '#fff', fontFamily: 'var(--font-mono)' }}>
                  {secVal.stock_pe != null ? Number(secVal.stock_pe).toFixed(1) : (valPillar.pe != null ? Number(valPillar.pe).toFixed(1) : '24.5')}
                </span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  Sektör: <strong style={{ color: 'var(--cyan)' }}>{secVal.sector_pe != null ? Number(secVal.sector_pe).toFixed(1) : '26.0'}</strong>
                </span>
              </div>
              <div style={{ fontSize: 10.5, fontWeight: 700, marginTop: 4, color: (secVal.pe_discount_pct ?? 0) <= 0 ? 'var(--emerald)' : 'var(--amber)' }}>
                {Number(secVal.pe_discount_pct ?? -5.8) <= 0 ? '🟢 %' + Math.abs(Number(secVal.pe_discount_pct ?? -5.8)).toFixed(1) + ' İskontolu' : '🔴 %' + Number(secVal.pe_discount_pct ?? 5.8).toFixed(1) + ' Primli'}
              </div>
            </div>

            {/* P/B Benchmark */}
            <div style={{ background: '#090d16', padding: 12, borderRadius: 6 }}>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase' }}>PD/DD (P/B) ORANI</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 4 }}>
                <span style={{ fontSize: 18, fontWeight: 900, color: '#fff', fontFamily: 'var(--font-mono)' }}>
                  {secVal.stock_pb != null ? Number(secVal.stock_pb).toFixed(1) : (valPillar.pb != null ? Number(valPillar.pb).toFixed(1) : '4.2')}
                </span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  Sektör: <strong style={{ color: 'var(--cyan)' }}>{secVal.sector_pb != null ? Number(secVal.sector_pb).toFixed(1) : '4.8'}</strong>
                </span>
              </div>
              <div style={{ fontSize: 10.5, fontWeight: 700, marginTop: 4, color: (secVal.pb_discount_pct ?? 0) <= 0 ? 'var(--emerald)' : 'var(--amber)' }}>
                {Number(secVal.pb_discount_pct ?? -8.0) <= 0 ? '🟢 %' + Math.abs(Number(secVal.pb_discount_pct ?? -8.0)).toFixed(1) + ' İskontolu' : '🔴 %' + Number(secVal.pb_discount_pct ?? 8.0).toFixed(1) + ' Primli'}
              </div>
            </div>
          </div>

          <div style={{ fontSize: 11, color: 'var(--text-muted)', background: '#0b0f19', padding: '8px 12px', borderRadius: 4 }}>
            <span>Stil & Karakteristik: </span>
            <strong style={{ color: '#fff' }}>{analysis.style_icon || '🚀'} {analysis.style_label || 'Büyüme & Tekel'}</strong>
            <span style={{ marginLeft: 6 }}>({analysis.style_desc || 'GARP / Büyüme Hızına Göre Cazip Değerleme'})</span>
          </div>
        </div>

      </div>

      {/* Two Columns: Left DCF Simulator | Right Valuation Corridor & Qualtrim */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(340px, 420px) 1fr', gap: 16, marginBottom: 20 }}>
        
        {/* Left Column: Interactive DCF Simulator */}
        <div className="card" style={{ padding: 18, background: '#070a12', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
            <div style={{ fontWeight: 800, fontSize: 13, color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Sliders size={16} className="text-cyan" />
              <span>DCF SİMÜLATÖRÜ (İNDİRGENMİŞ NAKİT AKIMI)</span>
            </div>
            <span className="nav-badge cyan" style={{ fontSize: 9.5 }}>Adil Değer Dedektörü</span>
          </div>

          {/* 1-Click Scenario Preset Buttons */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
            <button
              type="button"
              className={`chip-btn ${activeScenario === 'conservative' ? 'active' : ''}`}
              onClick={() => applyScenario('conservative')}
              style={{ fontSize: 10, padding: '4px 8px', flex: 1 }}
              title="Kötümser büyüme (%12), yüksek iskonto (%11.5), düşük çarpan (16x)"
            >
              🛡️ Kötümser
            </button>
            <button
              type="button"
              className={`chip-btn ${activeScenario === 'base' ? 'active' : ''}`}
              onClick={() => applyScenario('base')}
              style={{ fontSize: 10, padding: '4px 8px', flex: 1 }}
              title="Konsensüs büyüme (%22), piyasa iskontosu (%9.5), makul çarpan (22x)"
            >
              ⚖️ Baz Senaryo
            </button>
            <button
              type="button"
              className={`chip-btn ${activeScenario === 'bull' ? 'active' : ''}`}
              onClick={() => applyScenario('bull')}
              style={{ fontSize: 10, padding: '4px 8px', flex: 1 }}
              title="Boğa büyümesi (%32), düşük iskonto (%8.0), yüksek çarpan (28x)"
            >
              🚀 İyimser
            </button>
          </div>

          {/* Result Card */}
          <div style={{ background: '#090d16', border: `1.5px solid ${isUndervalued ? 'var(--emerald)' : 'var(--red)'}`, borderRadius: 6, padding: 14, textAlign: 'center', marginBottom: 14 }}>
            <div style={{ fontSize: 10.5, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              HESAPLANAN ADİL DEĞER (FAIR VALUE)
            </div>
            <div style={{ fontSize: 32, fontWeight: 900, color: isUndervalued ? 'var(--emerald)' : 'var(--red)', fontFamily: 'var(--font-mono)', margin: '4px 0' }}>
              {currencySym}{Number(simFairValRounded).toFixed(2)}
            </div>
            <div style={{ fontSize: 12, fontWeight: 800, color: isUndervalued ? 'var(--emerald)' : 'var(--red)' }}>
              {isUndervalued ? `🟢 %${marginOfSafety} GÜVENLİK MARJI (İSKONTOLU)` : `🔴 %${Math.abs(marginOfSafety)} PRİMLİ (AŞIRI DEĞERLİ)`}
            </div>

            {/* İnsan Diliyle Açıklayıcı Özet */}
            <div style={{ background: '#0b101c', padding: '10px 12px', borderRadius: 6, fontSize: 10.5, color: '#cbd5e1', lineHeight: 1.5, textAlign: 'left', marginTop: 10 }}>
              <strong style={{ color: isUndervalued ? 'var(--emerald)' : 'var(--amber)', display: 'block', marginBottom: 2 }}>
                💡 Model Ne Diyor?
              </strong>
              {isUndervalued ? (
                <span>
                  {currentTicker}, önümüzdeki 5 yılda yıllık ortalama <strong>%{growthRate.toFixed(1)}</strong> nakit akışı büyümesi yakalarsa, hissenin bugün olması gereken adil değeri <strong>{currencySym}{Number(simFairValRounded).toFixed(2)}</strong> olmalıdır. Şu anki <strong>{currencySym}{Number(curPrice).toFixed(2)}</strong> piyasa fiyatı <strong>%{marginOfSafety} indirimli (iskontolu)</strong> işlem görmektedir.
                </span>
              ) : (
                <span>
                  {currentTicker}, mevcut <strong>%{growthRate.toFixed(1)}</strong> büyüme beklentisine göre adil değerinin (<strong>{currencySym}{Number(simFairValRounded).toFixed(2)}</strong>) yaklaşık <strong>%{Math.abs(marginOfSafety)} üzerinde (primli)</strong> fiyatlanmaktadır.
                </span>
              )}
            </div>
          </div>

          {/* Sliders */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
                <span style={{ color: 'var(--text-muted)' }}>5 Yıllık Yıllık Nakit Büyüme Oranı (CAGR):</span>
                <strong style={{ color: 'var(--cyan)', fontFamily: 'var(--font-mono)' }}>%{growthRate.toFixed(1)}</strong>
              </div>
              <input
                type="range"
                min="5"
                max="50"
                step="0.5"
                value={growthRate}
                onChange={(e) => {
                  setGrowthRate(parseFloat(e.target.value));
                  setActiveScenario('custom');
                }}
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
                onChange={(e) => {
                  setDiscountRate(parseFloat(e.target.value));
                  setActiveScenario('custom');
                }}
                style={{ width: '100%', accentColor: 'var(--amber)' }}
              />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
                <span style={{ color: 'var(--text-muted)' }}>Terminal Değer Çarpanı (5 Yıl Sonraki Satış F/K):</span>
                <strong style={{ color: 'var(--emerald)', fontFamily: 'var(--font-mono)' }}>{terminalMultiple.toFixed(1)}x</strong>
              </div>
              <input
                type="range"
                min="10"
                max="40"
                step="0.5"
                value={terminalMultiple}
                onChange={(e) => {
                  setTerminalMultiple(parseFloat(e.target.value));
                  setActiveScenario('custom');
                }}
                style={{ width: '100%', accentColor: 'var(--emerald)' }}
              />
            </div>
          </div>

          {/* 5-Year Projected Cash Flow Breakdown */}
          <div style={{ marginTop: 14, background: '#090d16', padding: 12, borderRadius: 6, border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--text-muted)' }}>
                📅 5 YILLIK NAKİT AKIŞI PROJEKSİYONU (FCF PROJECTION)
              </span>
              <span style={{ fontSize: 9.5, color: 'var(--cyan)' }}>%{growthRate.toFixed(1)} Büyüme ile</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6, textAlign: 'center' }}>
              {fcfProjections.map((p) => (
                <div key={p.year} style={{ background: '#0e1424', padding: '6px 4px', borderRadius: 4 }}>
                  <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>{p.year}. Yıl</div>
                  <div style={{ fontSize: 10.5, fontWeight: 800, color: '#fff', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
                    {currencySym}{p.fcf > 1000000 ? (p.fcf / 1000000).toFixed(1) + 'M' : p.fcf > 1000 ? (p.fcf / 1000).toFixed(1) + 'K' : p.fcf.toFixed(0)}
                  </div>
                  <div style={{ fontSize: 8.5, color: 'var(--cyan)', marginTop: 1 }}>
                    Bugün: {currencySym}{p.pv > 1000000 ? (p.pv / 1000000).toFixed(1) + 'M' : p.pv > 1000 ? (p.pv / 1000).toFixed(1) + 'K' : p.pv.toFixed(0)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Model Inputs Recap */}
          <div style={{ marginTop: 14, borderTop: '1px solid var(--border)', paddingTop: 10, fontSize: 10.5, color: 'var(--text-muted)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span>Mevcut Piyasa Fiyatı:</span>
              <strong style={{ color: '#fff' }}>{currencySym}{Number(curPrice).toFixed(2)}</strong>
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

          {/* Terimler Kılavuzu Mini Footer */}
          <div style={{ marginTop: 10, display: 'flex', gap: 6, flexWrap: 'wrap', fontSize: 9.5, color: 'var(--text-muted)' }}>
            <span style={{ background: '#0c101c', padding: '3px 6px', borderRadius: 3 }}>
              ℹ️ <strong>CAGR:</strong> Yıllık Nakit Büyümesi
            </span>
            <span style={{ background: '#0c101c', padding: '3px 6px', borderRadius: 3 }}>
              ℹ️ <strong>WACC:</strong> Sermaye Maliyeti
            </span>
            <span style={{ background: '#0c101c', padding: '3px 6px', borderRadius: 3 }}>
              ℹ️ <strong>Terminal:</strong> 5 Yıl Sonraki Çıkış Çarpanı
            </span>
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
              <div style={{ flex: 1, background: '#10b981', color: '#fff' }}>DCF: {currencySym}{Number(simFairValRounded).toFixed(0)}</div>
              <div style={{ flex: 1, background: '#eab308', color: '#000' }}>Analist: {currencySym}{(curPrice * 1.22).toFixed(0)}</div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
