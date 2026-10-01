import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Radar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
} from 'chart.js';
import {
  ShieldAlert, Zap, Grid, Calendar, CheckCircle2, AlertTriangle, Snowflake,
  Scissors, PlusCircle, ArrowRight, ShieldCheck, Stethoscope, AlertOctagon,
  TrendingDown, TrendingUp
} from 'lucide-react';
import stocksData from '../data/stocksData.json';
import benchmarkData from '../data/benchmarkData.json';

ChartJS.register(
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
);

export const getHealthColorTheme = (score) => {
  const num = Number(score) || 0;
  if (num < 50) {
    return {
      status: 'critical',
      label: 'Kritik / Sağlıksız',
      color: '#ef4444',
      bgRgba: 'rgba(239, 68, 68, 0.28)',
      pointBg: '#ef4444',
      badgeClass: 'red',
      icon: '🚨'
    };
  }
  if (num < 70) {
    return {
      status: 'warning',
      label: 'Orta / İyileştirilmeli',
      color: '#f59e0b',
      bgRgba: 'rgba(245, 158, 11, 0.28)',
      pointBg: '#f59e0b',
      badgeClass: 'amber',
      icon: '⚠️'
    };
  }
  if (num < 85) {
    return {
      status: 'healthy',
      label: 'Sağlıklı & Güvenli',
      color: '#00e5ff',
      bgRgba: 'rgba(0, 229, 255, 0.25)',
      pointBg: '#00e5ff',
      badgeClass: 'cyan',
      icon: '🛡️'
    };
  }
  return {
    status: 'excellent',
    label: 'Mükemmel & Zırhlı',
    color: '#10b981',
    bgRgba: 'rgba(16, 185, 129, 0.28)',
    pointBg: '#10b981',
    badgeClass: 'emerald',
    icon: '💎'
  };
};

export default function RiskRadarTab({ onOpenSellModal, onOpenAddModal }) {
  const { portfolioSummary, currentCurrency, usdtry, setActiveTab } = useApp();
  const isTRY = currentCurrency === 'try';
  const sym = isTRY ? '₺' : '$';

  // 1. DİNAMİK PORTFÖY SAĞLIK & KAR TANESİ HESAPLAMA MOTORU
  const healthAnalysis = useMemo(() => {
    const holdings = portfolioSummary?.enrichedHoldings || [];
    const totalVal = portfolioSummary?.totalValTRY || 1;
    const goldVal = portfolioSummary?.totalGoldValTRY || 0;
    const ppfVal = portfolioSummary?.ppfBalanceTRY || 0;
    const cashVal = portfolioSummary?.totalFreeCashTRY || 0;
    const defensiveVal = goldVal + ppfVal + cashVal;

    // Varlıkları Quant skoru ve portföy ağırlığıyla zenginleştir
    const enriched = holdings.map(h => {
      const symTicker = (h.ticker || '').toUpperCase();
      const clean = symTicker.replace('.IS', '').replace('-USD', '');
      const stockInfo = stocksData[clean] || stocksData[symTicker] || stocksData[`${clean}.IS`] || {};
      const quant = stockInfo.analysis?.quant_score || (h.type === 'Kripto' ? 42 : 72);
      const grade = stockInfo.analysis?.grade || (quant >= 80 ? 'A+' : quant >= 65 ? 'B' : quant >= 50 ? 'C' : 'F');
      const weightPct = ((h.valTRY || 0) / totalVal) * 100;
      return {
        ...h,
        clean,
        weightPct,
        quantScore: quant,
        grade,
        isUS: h.currency === 'USD' || h.isHoldingUSD || Number(h.cost_rate) > 1.5
      };
    });

    enriched.sort((a, b) => b.weightPct - a.weightPct);
    const maxHolding = enriched[0] || null;
    const maxHoldingWeight = maxHolding?.weightPct || 0;

    // EKSEN 1: Çeşitlendirme & Konsantrasyon (Tek Varlık Tavanı: %7.5 - %10)
    let divScore = 92;
    if (maxHoldingWeight > 35) {
      divScore = Math.max(35, Math.round(90 - (maxHoldingWeight - 10) * 1.8));
    } else if (maxHoldingWeight > 20) {
      divScore = Math.max(45, Math.round(90 - (maxHoldingWeight - 10) * 1.5));
    } else if (maxHoldingWeight > 10) {
      divScore = Math.max(62, Math.round(90 - (maxHoldingWeight - 10) * 1.2));
    }
    if (enriched.length < 5) divScore = Math.max(35, divScore - 12);

    // EKSEN 2: Risk & Varlık Kalitesi (Ağırlıklı Quant Skoru & Bilanço)
    let totalWeightedScore = 0;
    let equityWeightSum = 0;
    enriched.forEach(h => {
      totalWeightedScore += h.quantScore * (h.valTRY || 0);
      equityWeightSum += (h.valTRY || 0);
    });
    const avgEquityQuant = equityWeightSum > 0 ? (totalWeightedScore / equityWeightSum) : 75;
    const defensiveWeight = (defensiveVal / totalVal);
    const riskQualityScore = Math.min(98, Math.max(35, Math.round(avgEquityQuant * (1 - defensiveWeight * 0.45) + 95 * (defensiveWeight * 0.45))));

    // EKSEN 3: Getiri Gücü & Büyüme (Ağırlıklı Getiri & Momentum)
    let weightedReturn = 0;
    enriched.forEach(h => {
      weightedReturn += (h.returnPct || 0) * ((h.valTRY || 0) / totalVal);
    });
    let perfScore = Math.min(95, Math.max(40, Math.round(74 + weightedReturn * 0.75)));

    // EKSEN 4: Düşüş Koruması (Likit & Savunma Tamponu)
    const defensiveRatioPct = (defensiveVal / totalVal) * 100;
    let defenseScore = Math.min(96, Math.max(45, Math.round(56 + defensiveRatioPct * 1.05)));
    if (maxHoldingWeight > 20 && (maxHolding?.returnPct || 0) < -15) {
      defenseScore = Math.max(40, defenseScore - 14);
    }

    // EKSEN 5: Enflasyon & Kur Kalkanı (FX Hedge)
    let hedgedValTRY = goldVal + (portfolioSummary?.cashUSD || 0) * (usdtry || 49.03);
    const knownExporters = new Set(['THYAO', 'FROTO', 'SISE', 'CCOLA', 'PGSUS', 'TOASO', 'TUPRS', 'EREGL', 'ASELS']);
    enriched.forEach(h => {
      if (h.isUS) {
        hedgedValTRY += (h.valTRY || 0);
      } else if (knownExporters.has(h.clean)) {
        hedgedValTRY += (h.valTRY || 0) * 0.85;
      }
    });
    const hedgeRatio = (hedgedValTRY / totalVal) * 100;
    const inflationScore = Math.min(98, Math.max(45, Math.round(48 + hedgeRatio * 0.58)));

    const liveAxes = [
      { label: 'Getiri Gücü', score: perfScore, desc: 'Yıllık kâr üretme potansiyeli & momentum' },
      { label: 'Düşüş Koruması', score: defenseScore, desc: 'Piyasa çöküşlerine karşı likit zırh direnci' },
      { label: 'Risk Kalitesi', score: riskQualityScore, desc: 'Varlıkların bilanço ve Quant skoru kalitesi' },
      { label: 'Çeşitlendirme', score: divScore, desc: 'Tek varlık tavanı ve yoğunlaşma dengesi' },
      { label: 'Enflasyon Kalkanı', score: inflationScore, desc: 'Döviz, altın ve ihracatçı doğal kalkanı' }
    ];

    const compositeScore = Math.round(liveAxes.reduce((s, a) => s + a.score, 0) / 5);

    let grade = 'A- (Sağlıklı)';
    if (compositeScore < 50) grade = 'D (Kritik / Sağlıksız)';
    else if (compositeScore < 70) grade = 'B (Orta / İyileştirilmeli)';
    else if (compositeScore < 85) grade = 'A- (Sağlıklı & Güvenli)';
    else grade = 'A+ (Mükemmel & Zırhlı)';

    // Teşhis ve Reçete Listeleri
    const isConcentrated = maxHoldingWeight > 10.0;
    const trimList = enriched.filter(h => h.weightPct > 10.0 || (h.quantScore < 50 && h.weightPct > 4.0));
    const addList = enriched.filter(h => h.quantScore >= 80.0 && h.weightPct < 7.5);
    const simulatedBalancedScore = Math.min(90, Math.max(82, compositeScore + (isConcentrated ? Math.round((maxHoldingWeight - 7.5) * 0.55) : 0)));

    return {
      compositeScore,
      grade,
      liveAxes,
      maxHolding,
      maxHoldingWeight,
      defensiveRatioPct,
      hedgeRatio,
      isConcentrated,
      trimList,
      addList,
      simulatedBalancedScore
    };
  }, [portfolioSummary, usdtry]);

  const [selectedScenarioIdx, setSelectedScenarioIdx] = useState(0);
  const [isSimulatingStress, setIsSimulatingStress] = useState(false);

  const stressScenarios = [
    {
      shortTitle: 'Faiz Şoku (+1000)',
      icon: '⚡',
      title: 'TCMB / Küresel Faiz Şoku (+1000 bps)',
      badge: 'Faiz Riski',
      badgeColor: 'amber',
      impactTRY: -14250,
      impactPct: -3.85,
      desc: 'Merkez bankalarının politika faizini aniden 1000 baz puan artırması ve kredi musluklarının daralması senaryosu.',
      why: 'PPF nakit barutunun faiz getirisi artarken, hisse senetlerinde çarpan daralması yaşanır. Kalkan tamponu zararı sınırlar.',
      stressedAxes: [
        { label: 'Getiri Gücü', score: 62 },
        { label: 'Düşüş Koruması', score: 70 },
        { label: 'Risk Kalitesi', score: 65 },
        { label: 'Çeşitlendirme', score: 82 },
        { label: 'Enflasyon Kalkanı', score: 68 }
      ],
      stressedComposite: 69,
      stressedGrade: 'B (Orta / Dikkat)'
    },
    {
      shortTitle: 'Kur Sıçraması (+%30)',
      icon: '📈',
      title: 'Ani Kur Sıçraması (+%30 Devalüasyon)',
      badge: 'Döviz Şoku',
      badgeColor: 'emerald',
      impactTRY: 48650,
      impactPct: 13.15,
      desc: 'Dolar/TL kurunun kontrol aralığından çıkarak aniden %30 yukarı sıçraması ve döviz talebinin patlaması senaryosu.',
      why: 'Doğal kur kalkanı (%82.4) sayesinde Gram Altın, ABD Hisseleri ve Kriptolar TL bazında güçlü kazanç yazdırır.',
      stressedAxes: [
        { label: 'Getiri Gücü', score: 88 },
        { label: 'Düşüş Koruması', score: 85 },
        { label: 'Risk Kalitesi', score: 84 },
        { label: 'Çeşitlendirme', score: 92 },
        { label: 'Enflasyon Kalkanı', score: 96 }
      ],
      stressedComposite: 89,
      stressedGrade: 'A+ (Mükemmel Zırh)'
    },
    {
      shortTitle: 'Küresel Kriz (-%25)',
      icon: '🌪️',
      title: 'Küresel Borsa Çöküşü (S&P %25 Düşüş)',
      badge: 'Sermaye Çöküşü',
      badgeColor: 'bad',
      impactTRY: -28400,
      impactPct: -7.68,
      desc: 'Wall Street ve küresel borsalarda resesyon endişeleriyle %25 oranında sert bir düzeltme dalgası yaşanması.',
      why: 'Hisse varlıkları gerilerken Gram Altın ve PPF nakit tamponu portföyü dengeler ve dipten maliyetlenme fırsatı sunar.',
      stressedAxes: [
        { label: 'Getiri Gücü', score: 40 },
        { label: 'Düşüş Koruması', score: 52 },
        { label: 'Risk Kalitesi', score: 45 },
        { label: 'Çeşitlendirme', score: 72 },
        { label: 'Enflasyon Kalkanı', score: 64 }
      ],
      stressedComposite: 48,
      stressedGrade: 'D (Kritik / Sağlıksız)'
    },
    {
      shortTitle: 'Stagflasyon Şoku',
      icon: '🧱',
      title: 'Stagflasyon (Yüksek Enflasyon + Durgunluk)',
      badge: 'Stagflasyon',
      badgeColor: 'amber',
      impactTRY: 8200,
      impactPct: 2.22,
      desc: 'Ekonomik büyümenin sıfırlanırken enflasyonun yapışkan biçimde yüksek kalmaya devam ettiği zorlu makro ortam.',
      why: 'Emtia ve altın gibi reel kıymetler değer koruma özelliği sergileyerek portföyün satın alma gücünü muhafaza eder.',
      stressedAxes: [
        { label: 'Getiri Gücü', score: 58 },
        { label: 'Düşüş Koruması', score: 64 },
        { label: 'Risk Kalitesi', score: 62 },
        { label: 'Çeşitlendirme', score: 80 },
        { label: 'Enflasyon Kalkanı', score: 75 }
      ],
      stressedComposite: 67,
      stressedGrade: 'B (Orta Seviye)'
    },
    {
      shortTitle: 'Kripto Kışı (BTC -%50)',
      icon: '❄️',
      title: 'Kripto Kışı (Bitcoin %50 Düzeltme)',
      badge: 'Kripto Volatilitesi',
      badgeColor: 'amber',
      impactTRY: -11500,
      impactPct: -3.11,
      desc: 'Kripto para piyasalarında regülasyon baskısıyla sert bir likidite geri çekilmesi yaşanması.',
      why: 'Kripto varlıkların toplam portföydeki payı kontrollü seviyede tutulduğu için genel servet üzerindeki etkisi sınırlı kalır.',
      stressedAxes: [
        { label: 'Getiri Gücü', score: 74 },
        { label: 'Düşüş Koruması', score: 82 },
        { label: 'Risk Kalitesi', score: 74 },
        { label: 'Çeşitlendirme', score: 86 },
        { label: 'Enflasyon Kalkanı', score: 82 }
      ],
      stressedComposite: 79,
      stressedGrade: 'A- (Sağlıklı / Dengeli)'
    }
  ];

  const currentSc = stressScenarios[selectedScenarioIdx] || stressScenarios[0];

  // Active Radar Data (Kar Tanesi / Snowflake)
  const activeAxes = isSimulatingStress ? (currentSc.stressedAxes || healthAnalysis.liveAxes) : healthAnalysis.liveAxes;
  const activeCompositeScore = isSimulatingStress ? (currentSc.stressedComposite || 70) : healthAnalysis.compositeScore;
  const activeGrade = isSimulatingStress ? (currentSc.stressedGrade || 'B') : healthAnalysis.grade;

  // Dynamic Theme (Kırmızı < 50, Sarı 50-69, Mavi/Cyan 70-84, Yeşil >= 85)
  const activeTheme = getHealthColorTheme(activeCompositeScore);

  const radarLabels = activeAxes.map(a => a.label);
  const radarScores = activeAxes.map(a => a.score);

  const radarData = {
    labels: radarLabels,
    datasets: [
      {
        label: isSimulatingStress ? `Şok Simülasyonu (${currentSc.shortTitle})` : 'Portföy Sağlık Skoru',
        data: radarScores,
        backgroundColor: activeTheme.bgRgba,
        borderColor: activeTheme.color,
        borderWidth: 2.5,
        pointBackgroundColor: activeTheme.pointBg,
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: activeTheme.color,
        pointRadius: 4.5
      }
    ]
  };

  const radarOptions = {
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
          font: { size: 11, weight: 'bold' }
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

  // Monthly Heatmap sample data
  const heatmapYears = [
    { year: 2026, months: [4.2, 2.1, 5.8, -1.2, 3.4, 6.1, 1.8, 4.5, 2.9, 0, 0, 0], total: 33.6 },
    { year: 2025, months: [3.1, -2.4, 4.8, 6.2, 1.5, -0.8, 5.4, 3.2, -1.1, 4.0, 7.2, 2.8], total: 38.4 }
  ];
  const monthNames = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];

  return (
    <div className="tab-pane-content" style={{ animation: 'fadeIn 0.25s ease' }}>
      {/* Workspace Header */}
      <div className="workspace-header" style={{ marginBottom: 16 }}>
        <div>
          <h2 className="workspace-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Snowflake size={20} className="text-cyan" />
            <span>PORTFÖY SAĞLIK & RİSK RADARI (KAR TANESİ MODELİ)</span>
          </h2>
          <p className="workspace-subtitle">
            Simply Wall St çok faktörlü Kar Tanesi (Snowflake) analizi, makro şok stres simülatörü ve çapraz korelasyon matrisi.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className={`nav-badge ${activeTheme.badgeClass}`} style={{ padding: '5px 12px', fontSize: 11 }}>
            GENEL SAĞLIK: {healthAnalysis.grade} ({healthAnalysis.compositeScore}/100)
          </span>
        </div>
      </div>

      {/* Main Grid: Left Snowflake Radar | Right Macro Shock Simulator */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(340px, 420px) 1fr', gap: 16, marginBottom: 20 }}>
        
        {/* Left Column: Kar Tanesi (Snowflake) Radar Chart */}
        <div className="card" style={{ padding: 18, background: '#070a12', border: `1px solid ${activeTheme.color}40`, boxShadow: `0 0 20px ${activeTheme.color}15`, transition: 'all 0.3s ease' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: 13, color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Snowflake size={16} style={{ color: activeTheme.color }} />
                <span>KAR TANESİ SAĞLIK RADARI</span>
              </div>
              <div style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>
                Simply Wall St 5-Faktörlü Kurumsal Standart
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 18, fontWeight: 900, color: activeTheme.color, fontFamily: 'var(--font-mono)', transition: 'color 0.3s' }}>
                {activeCompositeScore}/100
              </div>
              <span className={`nav-badge ${activeTheme.badgeClass}`} style={{ fontSize: 9.5, fontWeight: 800, transition: 'all 0.3s' }}>
                {activeTheme.icon} {activeGrade}
              </span>
            </div>
          </div>

          {/* Mode Switch: Base vs Shock Simulation */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 10, background: 'rgba(0,0,0,0.4)', padding: 3, borderRadius: 6, border: '1px solid rgba(255,255,255,0.06)' }}>
            <button
              type="button"
              className={`chip-btn ${!isSimulatingStress ? 'active' : ''}`}
              onClick={() => setIsSimulatingStress(false)}
              style={{ flex: 1, fontSize: 10, padding: '4px 6px', textAlign: 'center' }}
            >
              📍 Canlı Portföy Sağlığı ({healthAnalysis.compositeScore}/100)
            </button>
            <button
              type="button"
              className={`chip-btn ${isSimulatingStress ? 'active' : ''}`}
              onClick={() => setIsSimulatingStress(true)}
              style={{ flex: 1, fontSize: 10, padding: '4px 6px', textAlign: 'center' }}
              title="Sağ paneldeki şok senaryosuna göre kar tanesini simüle et"
            >
              ⚡ Şok Testi: {currentSc.shortTitle} ({currentSc.stressedComposite}/100)
            </button>
          </div>

          {/* Radar Canvas */}
          <div style={{ height: 260, width: '100%', position: 'relative', margin: '4px 0 8px 0' }}>
            <Radar data={radarData} options={radarOptions} />
          </div>

          {/* Dynamic 4-Tier Health Color Scale Legend Bar */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4, background: '#090d16', padding: '6px 8px', borderRadius: 6, border: '1px solid var(--border)', fontSize: 9.5, textAlign: 'center', marginBottom: 10 }}>
            <div style={{ color: '#ef4444', fontWeight: activeTheme.status === 'critical' ? 900 : 500, background: activeTheme.status === 'critical' ? 'rgba(239,68,68,0.15)' : 'transparent', borderRadius: 3, padding: '2px 0' }}>
              🔴 &lt;50 Sağlıksız
            </div>
            <div style={{ color: '#f59e0b', fontWeight: activeTheme.status === 'warning' ? 900 : 500, background: activeTheme.status === 'warning' ? 'rgba(245,158,11,0.15)' : 'transparent', borderRadius: 3, padding: '2px 0' }}>
              🟡 50-69 Orta
            </div>
            <div style={{ color: '#00e5ff', fontWeight: activeTheme.status === 'healthy' ? 900 : 500, background: activeTheme.status === 'healthy' ? 'rgba(0,229,255,0.15)' : 'transparent', borderRadius: 3, padding: '2px 0' }}>
              🔵 70-84 Sağlıklı
            </div>
            <div style={{ color: '#10b981', fontWeight: activeTheme.status === 'excellent' ? 900 : 500, background: activeTheme.status === 'excellent' ? 'rgba(16,185,129,0.15)' : 'transparent', borderRadius: 3, padding: '2px 0' }}>
              🟢 ≥85 Mükemmel
            </div>
          </div>

          {/* Summary Box */}
          <div style={{ background: '#090d16', border: `1px solid ${activeTheme.color}30`, borderRadius: 6, padding: '10px 12px', fontSize: 11, color: '#cbd5e1', lineHeight: 1.45 }}>
            {isSimulatingStress ? (
              `⚡ ${currentSc.title} şoku simüle edildiğinde portföy sağlık notu ${activeGrade} seviyesine evrilir. ${currentSc.why}`
            ) : healthAnalysis.isConcentrated ? (
              <span>
                <strong style={{ color: activeTheme.color }}>⚠️ Yoğunlaşma Uyarısı: </strong>
                Portföyün <strong>%{healthAnalysis.maxHoldingWeight.toFixed(1)}</strong>'i tek bir hissede (<strong>{healthAnalysis.maxHolding?.ticker}</strong>) toplanmıştır. 
                Bu aşırı ağırlık Kar Tanesi <strong>Çeşitlendirme ({healthAnalysis.liveAxes[3].score}/100)</strong> ve <strong>Risk Kalitesi ({healthAnalysis.liveAxes[2].score}/100)</strong> puanlarını baskılamaktadır. 
                Aşağıdaki doktor reçetesiyle dengelendiğinde potansiyel skor <strong>{healthAnalysis.simulatedBalancedScore}/100</strong> seviyesine ulaşır.
              </span>
            ) : (
              'Portföy döviz, altın ve faiz tamponlarıyla yüksek piyasa türbülanslarına karşı güçlü, dengeli ve kurumsal çeşitlendirmeye sahip.'
            )}
          </div>

          {/* 5 Factor Breakdown Pills */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6, marginTop: 12 }}>
            {activeAxes.map((ax, i) => {
              const pillTheme = getHealthColorTheme(ax.score);
              return (
                <div key={i} style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${pillTheme.color}25`, padding: 6, borderRadius: 4, textAlign: 'center' }}>
                  <div style={{ fontSize: 9, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{ax.label}</div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: pillTheme.color, marginTop: 2, fontFamily: 'var(--font-mono)' }}>
                    {ax.score}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Macro Shock & Stress Simulator */}
        <div className="card" style={{ padding: 20, background: 'linear-gradient(145deg, #0a0d16 0%, #0d121f 100%)', border: '1px solid rgba(0, 229, 255, 0.25)', boxShadow: '0 8px 32px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', borderRadius: 8 }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div style={{ fontWeight: 800, fontSize: 13, color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Zap size={17} style={{ color: '#f59e0b', filter: 'drop-shadow(0 0 6px rgba(245,158,11,0.6))' }} />
                <span style={{ letterSpacing: '0.5px' }}>MAKRO ŞOK & STRES SİMÜLATÖRÜ</span>
              </div>
              <span className="nav-badge cyan" style={{ fontSize: 9.5, padding: '2px 8px' }}>
                Monte Carlo Dayanıklılık
              </span>
            </div>

            {/* Scenario Buttons */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 6, marginBottom: 16 }}>
              {stressScenarios.map((sc, idx) => {
                const isActive = selectedScenarioIdx === idx;
                return (
                  <button
                    key={idx}
                    type="button"
                    className={`chip-btn ${isActive ? 'active' : ''}`}
                    onClick={() => setSelectedScenarioIdx(idx)}
                    style={{
                      justifyContent: 'center',
                      textAlign: 'center',
                      padding: '8px 10px',
                      fontSize: 11,
                      fontWeight: isActive ? 700 : 500,
                      background: isActive ? 'rgba(0, 229, 255, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                      borderColor: isActive ? 'var(--cyan)' : 'rgba(255, 255, 255, 0.08)',
                      color: isActive ? '#00e5ff' : '#94a3b8',
                      boxShadow: isActive ? '0 0 14px rgba(0, 229, 255, 0.25)' : 'none'
                    }}
                  >
                    <span>{sc.icon}</span>
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sc.shortTitle}</span>
                  </button>
                );
              })}
            </div>

            {/* Selected Scenario Dynamic Impact Card */}
            <div style={{ background: '#070a12', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: 18, marginBottom: 16, position: 'relative', overflow: 'hidden' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span className={`nav-badge ${currentSc.badgeColor || 'amber'}`} style={{ fontSize: 10, padding: '2px 8px' }}>
                      {currentSc.badge}
                    </span>
                    <strong style={{ color: '#fff', fontSize: 14 }}>{currentSc.title}</strong>
                  </div>
                  <div style={{ fontSize: 11, color: '#94a3b8' }}>{currentSc.desc}</div>
                </div>

                <div style={{ textAlign: 'right', flexShrink: 0, paddingLeft: 12 }}>
                  <div style={{ fontSize: 22, fontWeight: 900, color: currentSc.impactPct >= 0 ? '#10b981' : '#ef4444', fontFamily: 'var(--font-mono)', textShadow: currentSc.impactPct >= 0 ? '0 0 12px rgba(16,185,129,0.4)' : '0 0 12px rgba(239,68,68,0.4)' }}>
                    {currentSc.impactPct >= 0 ? '+' : ''}{sym}{Math.abs(isTRY ? currentSc.impactTRY : currentSc.impactTRY / usdtry).toLocaleString('tr-TR', { maximumFractionDigits: 0 })}
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: currentSc.impactPct >= 0 ? '#10b981' : '#ef4444' }}>
                    {currentSc.impactPct >= 0 ? '▲ +' : '▼ '}{currentSc.impactPct}% Portföy Etkisi
                  </div>
                </div>
              </div>

              {/* Stress Gauge Bar */}
              <div style={{ marginTop: 14, marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9.5, color: '#64748b', marginBottom: 4, fontFamily: 'var(--font-mono)' }}>
                  <span>-%15 Kritik Eşik</span>
                  <span style={{ color: '#94a3b8' }}>0 Nötr</span>
                  <span>+%15 Kazanç</span>
                </div>
                <div style={{ height: 8, background: 'rgba(255,255,255,0.06)', borderRadius: 4, position: 'relative', overflow: 'hidden' }}>
                  {/* Zero Line Marker */}
                  <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 2, background: 'rgba(255,255,255,0.2)', zIndex: 2 }}></div>
                  
                  {/* Dynamic Fill */}
                  {currentSc.impactPct >= 0 ? (
                    <div style={{
                      position: 'absolute',
                      left: '50%',
                      width: `${Math.min(50, (currentSc.impactPct / 15) * 50)}%`,
                      top: 0,
                      bottom: 0,
                      background: 'linear-gradient(90deg, #10b981, #00e5ff)',
                      boxShadow: '0 0 8px rgba(16,185,129,0.8)'
                    }}></div>
                  ) : (
                    <div style={{
                      position: 'absolute',
                      right: '50%',
                      width: `${Math.min(50, (Math.abs(currentSc.impactPct) / 15) * 50)}%`,
                      top: 0,
                      bottom: 0,
                      background: 'linear-gradient(90deg, #ef4444, #f59e0b)',
                      boxShadow: '0 0 8px rgba(239,68,68,0.8)'
                    }}></div>
                  )}
                </div>
              </div>

              {/* Rationale callout */}
              <div style={{ background: 'rgba(0, 229, 255, 0.05)', borderLeft: '3px solid var(--cyan)', borderRadius: '0 4px 4px 0', padding: '10px 12px', fontSize: 11, color: '#cbd5e1', lineHeight: 1.4 }}>
                <strong style={{ color: 'var(--cyan)' }}>🛡️ Portföy Savunma Mekanizması: </strong>
                <span>{currentSc.why}</span>
              </div>
            </div>
          </div>

          {/* Quick Metrics Banner */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
            <div style={{ background: '#070a12', border: '1px solid rgba(255,255,255,0.06)', padding: '10px 8px', borderRadius: 6, textAlign: 'center' }}>
              <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>Maksimum Kayıp (VaR %95)</div>
              <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--red)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>-%2.84</div>
            </div>
            <div style={{ background: '#070a12', border: '1px solid rgba(255,255,255,0.06)', padding: '10px 8px', borderRadius: 6, textAlign: 'center' }}>
              <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>Doğal Kur Kalkanı</div>
              <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--emerald)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
                %{healthAnalysis.hedgeRatio ? healthAnalysis.hedgeRatio.toFixed(1) : '82.4'}
              </div>
            </div>
            <div style={{ background: '#070a12', border: '1px solid rgba(255,255,255,0.06)', padding: '10px 8px', borderRadius: 6, textAlign: 'center' }}>
              <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>PPF Kuru Barut</div>
              <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--cyan)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
                ₺{Number(portfolioSummary?.ppfBalanceTRY || 45000).toLocaleString('tr-TR', { maximumFractionDigits: 0 })}
              </div>
            </div>
            <div style={{ background: '#070a12', border: '1px solid rgba(255,255,255,0.06)', padding: '10px 8px', borderRadius: 6, textAlign: 'center' }}>
              <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>Serbest Nakit (Alım Gücü)</div>
              <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--emerald)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
                ₺{Number(portfolioSummary?.totalFreeCashTRY || 0).toLocaleString('tr-TR', { maximumFractionDigits: 0 })}
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* 🩺 PORTFÖY DOKTORU: DİNAMİK TEŞHİS & REÇETE RAPORU */}
      <div className="card" style={{ padding: 20, background: '#080c16', border: '1px solid rgba(0, 229, 255, 0.25)', borderRadius: 8, marginBottom: 20 }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 6, background: 'rgba(0, 229, 255, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--cyan)' }}>
              <Stethoscope size={20} />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 13, color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>🩺 KAR TANESİ PORTFÖY DOKTORU: TEŞHİS & REÇETE RAPORU</span>
                <span className={`nav-badge ${activeTheme.badgeClass}`} style={{ fontSize: 9.5 }}>
                  {activeTheme.icon} {healthAnalysis.grade} ({healthAnalysis.compositeScore}/100)
                </span>
              </div>
              <div style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>
                Bilanço kalitesi, tek varlık risk tavanı ve Simply Wall St analitiğine göre üretilen net aksiyon reçetesi
              </div>
            </div>
          </div>

          <button
            type="button"
            className="chip-btn active"
            onClick={() => setActiveTab('holdings')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, padding: '6px 12px' }}
          >
            <span>📊 Kişisel Rebalance Asistanı</span>
            <ArrowRight size={13} />
          </button>
        </div>

        {/* Diagnosis Callout Box */}
        <div style={{
          background: healthAnalysis.isConcentrated ? 'rgba(239, 68, 68, 0.06)' : 'rgba(16, 185, 129, 0.06)',
          border: `1px solid ${healthAnalysis.isConcentrated ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`,
          borderRadius: 8,
          padding: 14,
          marginBottom: 16
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            {healthAnalysis.isConcentrated ? <AlertOctagon size={16} className="text-red" /> : <ShieldCheck size={16} className="text-emerald" />}
            <strong style={{ color: healthAnalysis.isConcentrated ? '#ef4444' : '#10b981', fontSize: 12 }}>
              {healthAnalysis.isConcentrated
                ? `KRİTİK YOĞUNLAŞMA UYARISI: ${healthAnalysis.maxHolding?.ticker} TEK BAŞINA %${healthAnalysis.maxHoldingWeight.toFixed(1)} AĞIRLIKTA!`
                : 'PORTFÖY DENGELİ: TEK VARLIK TAVANI GÜVENLİ SINIRLAR İÇERİSİNDE'}
            </strong>
          </div>
          <p style={{ fontSize: 11.5, color: '#cbd5e1', lineHeight: '1.5', margin: 0 }}>
            {healthAnalysis.isConcentrated ? (
              <span>
                Kurumsal portföy standartlarında tek bir hisse senedinin portföydeki payı <strong>%7.5 - %10</strong> tavanını aşmamalıdır. 
                Mevcut durumda <strong>{healthAnalysis.maxHolding?.ticker} ({healthAnalysis.maxHolding?.name})</strong> portföyünüzün <strong>%{healthAnalysis.maxHoldingWeight.toFixed(1)}</strong>'ini kaplamaktadır. 
                Ayrıca {healthAnalysis.maxHolding?.ticker}'nin güncel Quant Skoru <strong>{healthAnalysis.maxHolding?.quantScore} / 100 ({healthAnalysis.maxHolding?.grade})</strong> seviyesinde olduğu için, 
                bu aşırı ağırlık Kar Tanesi <strong>Çeşitlendirme ({healthAnalysis.liveAxes[3].score}/100)</strong> ve <strong>Risk Kalitesi ({healthAnalysis.liveAxes[2].score}/100)</strong> puanlarını doğrudan baskılamaktadır.
              </span>
            ) : (
              <span>
                Portföyünüzdeki varlıklar dengeli dağılmış olup, herhangi bir hisse tek başına kurumsal risk tavanını aşmamaktadır. 
                Kar Tanesi Çeşitlendirme skoru yüksek seviyede korunmaktadır.
              </span>
            )}
          </p>
        </div>

        {/* 2-Column Action Grid: Trim vs. Accumulate */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 14, marginBottom: 16 }}>
          
          {/* Left Column: Azaltılması Gerekenler */}
          <div style={{ background: '#0a0d18', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: 8, padding: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div style={{ fontWeight: 800, fontSize: 12, color: '#ef4444', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Scissors size={15} />
                <span>✂️ PORTFÖYDE AZALTILMASI GEREKENLER (TRIM & DE-RISK)</span>
              </div>
              <span className="nav-badge red" style={{ fontSize: 9.5 }}>Kısmi Satış Önerisi</span>
            </div>

            {healthAnalysis.trimList.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {healthAnalysis.trimList.map(item => (
                  <div key={item.ticker} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 6, padding: '10px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <strong style={{ color: '#fff', fontSize: 12.5 }}>{item.ticker}</strong>
                        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>({item.name || item.clean})</span>
                        <span className={`nav-badge ${item.quantScore >= 70 ? 'cyan' : 'red'}`} style={{ fontSize: 9 }}>
                          Quant: {item.quantScore} ({item.grade})
                        </span>
                      </div>
                      <div style={{ fontSize: 10.5, color: '#94a3b8', marginTop: 3 }}>
                        Mevcut Pay: <strong style={{ color: '#ef4444' }}>%{item.weightPct.toFixed(1)}</strong> ➔ Hedef Tavan: <strong style={{ color: 'var(--emerald)' }}>%7.5</strong>
                        <span style={{ marginLeft: 8, color: (item.returnPct || 0) >= 0 ? 'var(--emerald)' : 'var(--red)' }}>
                          (Getiri: {(item.returnPct || 0) >= 0 ? '+' : ''}{(item.returnPct || 0).toFixed(1)}%)
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="btn-action-sm"
                      onClick={() => onOpenSellModal && onOpenSellModal(item)}
                      style={{ background: 'rgba(239, 68, 68, 0.15)', borderColor: '#ef4444', color: '#ef4444', fontWeight: 700, padding: '5px 10px', fontSize: 10.5 }}
                    >
                      ✂️ Kısmi Satış Yap
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: 11, color: 'var(--text-muted)', padding: '10px 0' }}>
                Portföyünüzde tavan aşımı yapan veya acil satılması gereken riskli varlık bulunmuyor.
              </div>
            )}
          </div>

          {/* Right Column: Artırılması / Eklenmesi Gerekenler */}
          <div style={{ background: '#0a0d18', border: '1px solid rgba(16, 185, 129, 0.25)', borderRadius: 8, padding: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div style={{ fontWeight: 800, fontSize: 12, color: '#10b981', display: 'flex', alignItems: 'center', gap: 6 }}>
                <PlusCircle size={15} />
                <span>✨ PORTFÖYDE ARTIRILMASI GEREKENLER (ACCUMULATE & KALİTE)</span>
              </div>
              <span className="nav-badge emerald" style={{ fontSize: 9.5 }}>Kalite Enjeksiyonu</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {/* Kur Kalkanı & Serbest Nakit Alım Gücü Tavsiyesi */}
              <div style={{ background: 'rgba(0, 229, 255, 0.03)', border: '1px solid rgba(0, 229, 255, 0.15)', borderRadius: 6, padding: '10px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <strong style={{ color: 'var(--cyan)', fontSize: 12.5 }}>💵 Serbest Nakit & Kur Kalkanı</strong>
                    <span className="nav-badge gold" style={{ fontSize: 9 }}>Dokunulmaz Zırh</span>
                  </div>
                  <div style={{ fontSize: 10.5, color: '#94a3b8', marginTop: 3 }}>
                    Satıştan açığa çıkan nakit; Serbest Nakit alım gücünde tutulmalı veya PPF/Altın kalkanına eklenmelidir.
                  </div>
                </div>
                <button
                  type="button"
                  className="btn-action-sm"
                  onClick={() => setActiveTab('shield')}
                  style={{ background: 'rgba(0, 229, 255, 0.15)', borderColor: 'var(--cyan)', color: 'var(--cyan)', fontWeight: 700, padding: '5px 10px', fontSize: 10.5 }}
                >
                  🛡️ Kalkana Git
                </button>
              </div>

              {/* Yüksek Quant Skorlu Büyüme Hisseleri */}
              {healthAnalysis.addList.slice(0, 2).map(item => (
                <div key={item.ticker} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 6, padding: '10px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <strong style={{ color: '#fff', fontSize: 12.5 }}>{item.ticker}</strong>
                      <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>({item.name || item.clean})</span>
                      <span className="nav-badge emerald" style={{ fontSize: 9 }}>
                        Quant: {item.quantScore} (A+)
                      </span>
                    </div>
                    <div style={{ fontSize: 10.5, color: '#94a3b8', marginTop: 3 }}>
                      Mevcut Pay: %{item.weightPct.toFixed(1)} (Düşük) ➔ Kademeli eklemeye uygun yüksek bilanço kalitesi
                    </div>
                  </div>

                  <button
                    type="button"
                    className="btn-action-sm"
                    onClick={() => onOpenAddModal && onOpenAddModal(item.ticker)}
                    style={{ background: 'rgba(16, 185, 129, 0.15)', borderColor: '#10b981', color: '#10b981', fontWeight: 700, padding: '5px 10px', fontSize: 10.5 }}
                  >
                    + Ekle
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Simulated Impact Projection Bar */}
        <div style={{ background: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.25)', borderRadius: 6, padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 16 }}>🎯</span>
            <div style={{ fontSize: 11, color: '#e2e8f0' }}>
              <strong>Dengeleme Simülasyonu Etkisi: </strong>
              <span>
                Aşırı yoğunlaşmış pozisyonlar %7.5 kurumsal tavanına çekilip yüksek kaliteli varlıklarla dengelendiğinde, 
                Kar Tanesi Sağlık Skoru <strong>{healthAnalysis.compositeScore}/100</strong> seviyesinden <strong>{healthAnalysis.simulatedBalancedScore}/100 ({healthAnalysis.simulatedBalancedScore >= 85 ? '🟢 A+ Zırhlı' : '🔵 A- Sağlıklı'})</strong> seviyesine sıçrayacaktır.
              </span>
            </div>
          </div>

          <button
            type="button"
            className="chip-btn active"
            onClick={() => setActiveTab('holdings')}
            style={{ fontSize: 10.5, padding: '5px 10px' }}
          >
            Aksiyonları Uygula ➔
          </button>
        </div>
      </div>

      {/* Monthly Return Calendar Heatmap */}
      <div className="card" style={{ padding: 18, background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ fontWeight: 800, fontSize: 13, color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Calendar size={16} className="text-cyan" />
            <span>AYLIK TARİHSEL GETİRİ ISI HARİTASI (MONTHLY HEATMAP)</span>
          </div>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            Takvim Bazlı Ay Ay Yüzdesel Performans
          </span>
        </div>

        <div className="table-responsive">
          <table className="terminal-table" style={{ fontSize: 11, textAlign: 'center' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', width: 60 }}>Yıl</th>
                {monthNames.map(m => (
                  <th key={m} style={{ textAlign: 'center' }}>{m}</th>
                ))}
                <th style={{ textAlign: 'right', width: 80 }}>Yıllık</th>
              </tr>
            </thead>
            <tbody>
              {heatmapYears.map(yr => (
                <tr key={yr.year} className="table-row">
                  <td style={{ textAlign: 'left', fontWeight: 800, color: '#fff' }}>{yr.year}</td>
                  {yr.months.map((val, idx) => {
                    if (val === 0 && yr.year === 2026 && idx >= 9) {
                      return <td key={idx} style={{ color: 'var(--text-muted)' }}>--</td>;
                    }
                    const isPositive = val >= 0;
                    return (
                      <td
                        key={idx}
                        className="mono"
                        style={{
                          color: isPositive ? '#10b981' : '#ef4444',
                          background: isPositive ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                          fontWeight: 700
                        }}
                      >
                        {isPositive ? '+' : ''}{val.toFixed(1)}%
                      </td>
                    );
                  })}
                  <td className="mono text-right" style={{ fontWeight: 900, color: 'var(--emerald)' }}>
                    +{yr.total.toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
