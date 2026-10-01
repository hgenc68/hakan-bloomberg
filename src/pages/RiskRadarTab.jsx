import React, { useState } from 'react';
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
import { ShieldAlert, Zap, Grid, Calendar, CheckCircle2, AlertTriangle, Snowflake } from 'lucide-react';
import benchmarkData from '../data/benchmarkData.json';

ChartJS.register(
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
);

export default function RiskRadarTab() {
  const { portfolioSummary, currentCurrency, usdtry } = useApp();
  const isTRY = currentCurrency === 'try';
  const sym = isTRY ? '₺' : '$';

  const healthScore = benchmarkData.health_score || {
    composite_score: 84,
    grade: 'A- (Güvenli Büyüme)',
    summary_comment: 'Portföy döviz, altın ve faiz tamponlarıyla yüksek piyasa türbülanslarına karşı güçlü bir dengeye sahip.',
    axes: [
      { label: 'Getiri Gücü', score: 78, desc: 'Yıllık kâr üretme potansiyeli' },
      { label: 'Düşüş Koruması', score: 86, desc: 'Dip noktalara karşı direnç' },
      { label: 'Risk Kalitesi', score: 82, desc: 'Sharpe & Sortino verimi' },
      { label: 'Çeşitlendirme', score: 88, desc: 'Düşük korelasyon sigortası' },
      { label: 'Enflasyon Kalkanı', score: 85, desc: 'Döviz ve altın koruması' }
    ]
  };

  const [selectedScenarioIdx, setSelectedScenarioIdx] = useState(0);

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
      why: 'PPF nakit barutunun faiz getirisi artarken, hisse senetlerinde çarpan daralması yaşanır. Kalkan tamponu zararı sınırlar.'
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
      why: 'Doğal kur kalkanı (%82.4) sayesinde Gram Altın, ABD Hisseleri ve Kriptolar TL bazında güçlü kazanç yazdırır.'
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
      why: 'Hisse varlıkları gerilerken Gram Altın ve PPF nakit tamponu portföyü dengeler ve dipten maliyetlenme fırsatı sunar.'
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
      why: 'Emtia ve altın gibi reel kıymetler değer koruma özelliği sergileyerek portföyün satın alma gücünü muhafaza eder.'
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
      why: 'Kripto varlıkların toplam portföydeki payı kontrollü seviyede tutulduğu için genel servet üzerindeki etkisi sınırlı kalır.'
    }
  ];

  const currentSc = stressScenarios[selectedScenarioIdx] || stressScenarios[0];

  // Radar Chart Data (Kar Tanesi / Snowflake)
  const radarLabels = (healthScore.axes || []).map(a => a.label);
  const radarScores = (healthScore.axes || []).map(a => a.score);

  const radarData = {
    labels: radarLabels,
    datasets: [
      {
        label: 'Portföy Sağlık Skoru',
        data: radarScores,
        backgroundColor: 'rgba(0, 229, 255, 0.25)',
        borderColor: '#00e5ff',
        borderWidth: 2,
        pointBackgroundColor: '#10b981',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: '#00e5ff',
        pointRadius: 4
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
          <span className="nav-badge emerald" style={{ padding: '5px 12px', fontSize: 11 }}>
            GENEL SAĞLIK: {healthScore.grade || 'A- Seviye'}
          </span>
        </div>
      </div>

      {/* Main Grid: Left Snowflake Radar | Right Macro Shock Simulator */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(340px, 420px) 1fr', gap: 16, marginBottom: 20 }}>
        
        {/* Left Column: Kar Tanesi (Snowflake) Radar Chart */}
        <div className="card" style={{ padding: 18, background: '#070a12', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: 13, color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Snowflake size={15} className="text-cyan" />
                <span>KAR TANESİ SAĞLIK RADARI</span>
              </div>
              <div style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>
                Simply Wall St 5-Faktörlü Kurumsal Standart
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--cyan)', fontFamily: 'var(--font-mono)' }}>
                {healthScore.composite_score || 84}/100
              </div>
              <span className="nav-badge emerald" style={{ fontSize: 9.5 }}>
                {healthScore.grade || 'A-'}
              </span>
            </div>
          </div>

          {/* Radar Canvas */}
          <div style={{ height: 260, width: '100%', position: 'relative', margin: '4px 0 12px 0' }}>
            <Radar data={radarData} options={radarOptions} />
          </div>

          {/* Summary Box */}
          <div style={{ background: '#090d16', border: '1px solid var(--border)', borderRadius: 6, padding: '10px 12px', fontSize: 11, color: '#cbd5e1', lineHeight: 1.4 }}>
            {healthScore.summary_comment || 'Portföy döviz, altın ve faiz tamponlarıyla yüksek piyasa türbülanslarına karşı güçlü bir dengeye sahip.'}
          </div>

          {/* 5 Factor Breakdown Pills */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6, marginTop: 12 }}>
            {(healthScore.axes || []).map((ax, i) => (
              <div key={i} style={{ background: 'rgba(255,255,255,0.03)', padding: 6, borderRadius: 4, textAlign: 'center' }}>
                <div style={{ fontSize: 9, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{ax.label}</div>
                <div style={{ fontSize: 13, fontWeight: 800, color: ax.score >= 80 ? 'var(--emerald)' : (ax.score >= 60 ? 'var(--cyan)' : 'var(--amber)'), marginTop: 2, fontFamily: 'var(--font-mono)' }}>
                  {ax.score}
                </div>
              </div>
            ))}
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            <div style={{ background: '#070a12', border: '1px solid rgba(255,255,255,0.06)', padding: '10px 12px', borderRadius: 6, textAlign: 'center' }}>
              <div style={{ fontSize: 9.5, color: 'var(--text-muted)' }}>Maksimum Kayıp (VaR %95)</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--red)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>-%2.84</div>
            </div>
            <div style={{ background: '#070a12', border: '1px solid rgba(255,255,255,0.06)', padding: '10px 12px', borderRadius: 6, textAlign: 'center' }}>
              <div style={{ fontSize: 9.5, color: 'var(--text-muted)' }}>Doğal Kur Kalkanı</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--emerald)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>%82.4</div>
            </div>
            <div style={{ background: '#070a12', border: '1px solid rgba(255,255,255,0.06)', padding: '10px 12px', borderRadius: 6, textAlign: 'center' }}>
              <div style={{ fontSize: 9.5, color: 'var(--text-muted)' }}>PPF Kuru Barut Gücü</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--cyan)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>₺45.000</div>
            </div>
          </div>
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
