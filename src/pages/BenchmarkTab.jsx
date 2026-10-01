import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Line, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ArcElement
} from 'chart.js';
import { LineChart, BarChart3, Shield, Activity, HelpCircle, CheckCircle2 } from 'lucide-react';
import benchmarkData from '../data/benchmarkData.json';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ArcElement
);

export default function BenchmarkTab() {
  const { currentCurrency, usdtry } = useApp();
  const isTRY = currentCurrency === 'try';
  const curKey = isTRY ? 'try' : 'usd';

  const [chartType, setChartType] = useState('line'); // 'line' or 'bar'
  const [timeframe, setTimeframe] = useState('1Y'); // '1W', '1M', '3M', '6M', '1Y', 'ALL'
  const [activeSeries, setActiveSeries] = useState({
    portfolio: true,
    SP500: true,
    NASDAQ: true,
    BIST100: true,
    GOLD: true,
    BITCOIN: false
  });

  const rawDates = benchmarkData.dates || [];
  let sliceCount = rawDates.length;
  if (timeframe === '1W') sliceCount = Math.min(rawDates.length, 6);
  else if (timeframe === '1M') sliceCount = Math.min(rawDates.length, 22);
  else if (timeframe === '3M') sliceCount = Math.min(rawDates.length, 65);
  else if (timeframe === '6M') sliceCount = Math.min(rawDates.length, 130);
  else if (timeframe === '1Y') sliceCount = Math.min(rawDates.length, 252);

  const startIndex = Math.max(0, rawDates.length - sliceCount);
  const slicedDates = rawDates.slice(startIndex);

  const sampleStep = slicedDates.length > 90 ? Math.max(1, Math.floor(slicedDates.length / 75)) : 1;
  const sampledDates = slicedDates.filter((_, i) => i % sampleStep === 0);

  const series = benchmarkData.normalized_series || {};
  const underwater = benchmarkData.underwater_series || {};
  const metrics = benchmarkData.metrics_by_currency?.[curKey] || {};

  const toggleSeries = (key) => {
    setActiveSeries(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const rebaseSeries = (arr) => {
    if (!arr || arr.length === 0) return [];
    const sliced = arr.slice(startIndex);
    const baseVal = sliced[0] || 1;
    const rebased = sliced.map(v => (v / baseVal) * 100);
    return rebased.filter((_, i) => i % sampleStep === 0);
  };

  // Base-100 Performance Line Chart
  const perfDatasets = [];
  if (activeSeries.portfolio && series[`portfolio_${curKey}`]) {
    perfDatasets.push({
      label: 'PORTFÖYÜNÜZ',
      data: rebaseSeries(series[`portfolio_${curKey}`]),
      borderColor: '#ffffff',
      backgroundColor: 'rgba(255, 255, 255, 0.08)',
      borderWidth: 2.5,
      pointRadius: 0,
      tension: 0.2
    });
  }
  if (activeSeries.SP500 && series[`SP500_${curKey}`]) {
    perfDatasets.push({
      label: 'S&P 500 (^GSPC)',
      data: rebaseSeries(series[`SP500_${curKey}`]),
      borderColor: '#3b82f6',
      borderWidth: 1.8,
      pointRadius: 0,
      tension: 0.2
    });
  }
  if (activeSeries.NASDAQ && series[`NASDAQ_${curKey}`]) {
    perfDatasets.push({
      label: 'Nasdaq 100 (^NDX)',
      data: rebaseSeries(series[`NASDAQ_${curKey}`]),
      borderColor: '#a855f7',
      borderWidth: 1.8,
      pointRadius: 0,
      tension: 0.2
    });
  }
  if (activeSeries.BIST100 && series[`BIST100_${curKey}`]) {
    perfDatasets.push({
      label: 'BIST 100 (XU100.IS)',
      data: rebaseSeries(series[`BIST100_${curKey}`]),
      borderColor: '#ef4444',
      borderWidth: 1.8,
      pointRadius: 0,
      tension: 0.2
    });
  }
  if (activeSeries.GOLD && series[`GOLD_${curKey}`]) {
    perfDatasets.push({
      label: 'Altın Ons (GC=F)',
      data: rebaseSeries(series[`GOLD_${curKey}`]),
      borderColor: '#eab308',
      borderWidth: 1.8,
      pointRadius: 0,
      tension: 0.2
    });
  }
  if (activeSeries.BITCOIN && series[`BITCOIN_${curKey}`]) {
    perfDatasets.push({
      label: 'Bitcoin (BTC-USD)',
      data: rebaseSeries(series[`BITCOIN_${curKey}`]),
      borderColor: '#f97316',
      borderWidth: 1.8,
      pointRadius: 0,
      tension: 0.2
    });
  }

  const perfChartData = {
    labels: sampledDates,
    datasets: perfDatasets
  };

  const perfChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#0f172a',
        titleColor: '#e2e8f0',
        bodyColor: '#e2e8f0',
        borderColor: '#334155',
        borderWidth: 1,
        padding: 10,
        callbacks: {
          label: (ctx) => `${ctx.dataset.label}: ${Number(ctx.raw).toFixed(2)} (Baz 100)`
        }
      }
    },
    scales: {
      x: {
        grid: { color: 'rgba(255, 255, 255, 0.04)' },
        ticks: { color: '#64748b', maxTicksLimit: 8, font: { size: 10 } }
      },
      y: {
        grid: { color: 'rgba(255, 255, 255, 0.04)' },
        ticks: { color: '#64748b', font: { size: 10 } }
      }
    }
  };

  // Comparative Bar Chart Data
  const barBenchmarkKeys = ['PORTFOLIO', 'SP500', 'NASDAQ', 'BIST100', 'GOLD', 'BITCOIN'];
  const barLabels = ['PORTFÖYÜNÜZ', 'S&P 500', 'Nasdaq 100', 'BIST 100', 'Altın (Ons)', 'Bitcoin'];
  const barColors = ['#ffffff', '#3b82f6', '#a855f7', '#ef4444', '#eab308', '#f97316'];

  const barPeriodReturns = barBenchmarkKeys.map(k => metrics[k]?.period_return || 0);
  const barCAGRReturns = barBenchmarkKeys.map(k => metrics[k]?.cagr || 0);

  const barChartData = {
    labels: barLabels,
    datasets: [
      {
        label: '1 Yıllık Kümülatif Getiri (%)',
        data: barPeriodReturns,
        backgroundColor: barColors,
        borderRadius: 4
      },
      {
        label: 'Yıllıklandırılmış Getiri (CAGR %)',
        data: barCAGRReturns,
        backgroundColor: barColors.map(c => c + '77'), // transparent version
        borderRadius: 4
      }
    ]
  };

  const barChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: { color: '#94a3b8', font: { size: 11 } }
      },
      tooltip: {
        backgroundColor: '#0f172a',
        callbacks: {
          label: (ctx) => `${ctx.dataset.label}: ${Number(ctx.raw).toFixed(2)}%`
        }
      }
    },
    scales: {
      x: { grid: { color: 'rgba(255, 255, 255, 0.04)' }, ticks: { color: '#e2e8f0', font: { size: 11, weight: 'bold' } } },
      y: {
        grid: { color: 'rgba(255, 255, 255, 0.04)' },
        ticks: { color: '#64748b', font: { size: 10 }, callback: (v) => `${v}%` }
      }
    }
  };

  // Underwater Drawdown Chart
  const rawUnderwater = (underwater[curKey] || []).slice(startIndex);
  const sampledUnderwater = rawUnderwater.filter((_, i) => i % sampleStep === 0);

  const underwaterChartData = {
    labels: sampledDates,
    datasets: [
      {
        label: 'Zirveden Düşüş (Drawdown %)',
        data: sampledUnderwater,
        borderColor: '#ef4444',
        backgroundColor: 'rgba(239, 68, 68, 0.15)',
        borderWidth: 1.5,
        fill: true,
        pointRadius: 0,
        tension: 0.2
      }
    ]
  };

  const underwaterChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#0f172a',
        callbacks: {
          label: (ctx) => `Düşüş: ${Number(ctx.raw).toFixed(2)}%`
        }
      }
    },
    scales: {
      x: { display: false },
      y: {
        max: 0,
        grid: { color: 'rgba(255, 255, 255, 0.04)' },
        ticks: { color: '#ef4444', font: { size: 9 }, callback: (v) => `${v}%` }
      }
    }
  };

  const metricRows = [
    { key: 'PORTFOLIO', name: 'PORTFÖYÜNÜZ', code: 'PORTFOLIO', color: '#fff', bold: true },
    { key: 'SP500', name: 'S&P 500', code: '^GSPC', color: '#3b82f6' },
    { key: 'NASDAQ', name: 'Nasdaq 100', code: '^NDX', color: '#a855f7' },
    { key: 'BIST100', name: 'BIST 100', code: 'XU100.IS', color: '#ef4444' },
    { key: 'GOLD', name: 'Altın (Ons)', code: 'GC=F', color: '#eab308' },
    { key: 'BITCOIN', name: 'Bitcoin', code: 'BTC-USD', color: '#f97316' }
  ];

  return (
    <div className="tab-pane-content" style={{ animation: 'fadeIn 0.25s ease' }}>
      {/* Header */}
      <div className="workspace-header" style={{ marginBottom: 16 }}>
        <div>
          <h2 className="workspace-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <LineChart size={20} className="text-cyan" />
            <span>PORTFÖY & BENCHMARK KARŞILAŞTIRMA (GIPS KURUMSAL STANDARDI)</span>
          </h2>
          <p className="workspace-subtitle">
            Çizgi ve Çubuk grafik seçenekleriyle normalize getiri eğrisi, Underwater Drawdown ve Çoklu Gösterge Risk Matrisi (Alpha, Beta, Sharpe, Sortino, Calmar)
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="nav-badge cyan" style={{ padding: '5px 12px', fontSize: 11 }}>
            SEÇİLİ BAZ: {isTRY ? 'TRY NORMALIZE (%40 Rf)' : 'USD NORMALIZE (%4.25 Rf)'}
          </span>
        </div>
      </div>

      {/* Main Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16, marginBottom: 20 }}>
        
        {/* Performance & Underwater Card */}
        <div className="card" style={{ padding: 18, background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          {/* Chart Header & Mode Toggles */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: 13, color: '#e2e8f0' }}>
                {chartType === 'line' ? 'GÖSTERGELERE GÖRE NORMALİZE PERFORMANS (BAZ 100)' : 'BENCHMARK GETİRİ KARŞILAŞTIRMA ÇUBUK GRAFİĞİ'}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                {chartType === 'line' ? `${timeframe} dönemi normalize getiri eğrileri (Başlangıç = 100)` : 'Dönem Getirisi ve Yıllıklandırılmış CAGR Karşılaştırması'}
              </div>
            </div>

            {/* Timeframe & View Mode Toggles */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              {/* Timeframe Selectors */}
              <div style={{ display: 'inline-flex', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--border)', borderRadius: 4, padding: 2, gap: 2 }}>
                {[
                  { id: '1W', label: '1H' },
                  { id: '1M', label: '1A' },
                  { id: '3M', label: '3A' },
                  { id: '6M', label: '6A' },
                  { id: '1Y', label: '1Y' },
                  { id: 'ALL', label: 'TÜMÜ' }
                ].map(tf => (
                  <button
                    key={tf.id}
                    type="button"
                    className={`chip-btn ${timeframe === tf.id ? 'active' : ''}`}
                    onClick={() => setTimeframe(tf.id)}
                    style={{ padding: '3px 8px', fontSize: 11, fontWeight: 700 }}
                  >
                    {tf.label}
                  </button>
                ))}
              </div>

              {/* View Mode Toggle: Line vs Bar */}
              <div style={{ display: 'inline-flex', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--border)', borderRadius: 4, padding: 2 }}>
                <button
                  type="button"
                  className={`chip-btn ${chartType === 'line' ? 'active' : ''}`}
                  onClick={() => setChartType('line')}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}
                >
                  <LineChart size={13} />
                  <span>Çizgi Grafik</span>
                </button>
                <button
                  type="button"
                  className={`chip-btn ${chartType === 'bar' ? 'active' : ''}`}
                  onClick={() => setChartType('bar')}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}
                >
                  <BarChart3 size={13} />
                  <span>Çubuk Grafik</span>
                </button>
              </div>
            </div>
          </div>

          {/* Series Toggles (Active for Line Chart) */}
          {chartType === 'line' && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
              <button
                type="button"
                className={`chip-btn ${activeSeries.portfolio ? 'active' : ''}`}
                style={{ borderColor: activeSeries.portfolio ? '#fff' : 'transparent', color: '#fff' }}
                onClick={() => toggleSeries('portfolio')}
              >
                ⚪ Portföy
              </button>
              <button
                type="button"
                className={`chip-btn ${activeSeries.SP500 ? 'active' : ''}`}
                style={{ borderColor: activeSeries.SP500 ? '#3b82f6' : 'transparent', color: '#3b82f6' }}
                onClick={() => toggleSeries('SP500')}
              >
                🔵 S&P 500
              </button>
              <button
                type="button"
                className={`chip-btn ${activeSeries.NASDAQ ? 'active' : ''}`}
                style={{ borderColor: activeSeries.NASDAQ ? '#a855f7' : 'transparent', color: '#a855f7' }}
                onClick={() => toggleSeries('NASDAQ')}
              >
                🟣 Nasdaq
              </button>
              <button
                type="button"
                className={`chip-btn ${activeSeries.BIST100 ? 'active' : ''}`}
                style={{ borderColor: activeSeries.BIST100 ? '#ef4444' : 'transparent', color: '#ef4444' }}
                onClick={() => toggleSeries('BIST100')}
              >
                🔴 BIST 100
              </button>
              <button
                type="button"
                className={`chip-btn ${activeSeries.GOLD ? 'active' : ''}`}
                style={{ borderColor: activeSeries.GOLD ? '#eab308' : 'transparent', color: '#eab308' }}
                onClick={() => toggleSeries('GOLD')}
              >
                🟡 Altın
              </button>
              <button
                type="button"
                className={`chip-btn ${activeSeries.BITCOIN ? 'active' : ''}`}
                style={{ borderColor: activeSeries.BITCOIN ? '#f97316' : 'transparent', color: '#f97316' }}
                onClick={() => toggleSeries('BITCOIN')}
              >
                🟠 Bitcoin
              </button>
            </div>
          )}

          {/* Chart Display Area */}
          <div style={{ height: 320, width: '100%', marginBottom: 16 }}>
            {chartType === 'line' ? (
              <Line data={perfChartData} options={perfChartOptions} />
            ) : (
              <Bar data={barChartData} options={barChartOptions} />
            )}
          </div>

          {/* Underwater Drawdown Chart Box */}
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#ef4444' }}>
                UNDERWATER DRAWDOWN GRAFİĞİ (Zirveden Düşüş & Toparlanma)
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                Maksimum Kayıp: <strong style={{ color: '#ef4444' }}>{metrics['PORTFOLIO']?.max_drawdown || -37.38}%</strong>
              </div>
            </div>
            <div style={{ height: 100, width: '100%' }}>
              <Line data={underwaterChartData} options={underwaterChartOptions} />
            </div>
          </div>
        </div>

      </div>

      {/* Quantitative Risk & Benchmark Analytics Matrix Card */}
      <div className="card" style={{ padding: 18, background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ fontWeight: 800, fontSize: 13, color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>📊</span>
            <span>BLOOMBERG KANTİTATİF RİSK & GÖSTERGE ANALİTİK MATRİSİ</span>
          </div>
          <span style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>
            Seçili Baz: <strong style={{ color: 'var(--amber)' }}>{isTRY ? 'TRY' : 'USD'}</strong>
          </span>
        </div>

        <div className="table-responsive">
          <table className="terminal-table" style={{ fontSize: 11 }}>
            <thead>
              <tr>
                <th>Varlık / Gösterge</th>
                <th>Sembol</th>
                <th className="text-right">Dönem Getirisi</th>
                <th className="text-right">Yıllık Getiri (CAGR)</th>
                <th className="text-right">Volatilite (σ)</th>
                <th className="text-right">Sharpe Oranı</th>
                <th className="text-right">Sortino Oranı</th>
                <th className="text-right">Beta (β)</th>
                <th className="text-right">Jensen Alpha (α)</th>
                <th className="text-right">Tracking Error</th>
                <th className="text-right">Max Drawdown</th>
                <th className="text-right">Calmar</th>
                <th className="text-right">Korelasyon</th>
              </tr>
            </thead>
            <tbody>
              {metricRows.map(row => {
                const m = metrics[row.key] || {};
                const isPort = row.key === 'PORTFOLIO';

                return (
                  <tr
                    key={row.key}
                    className="table-row"
                    style={{ background: isPort ? 'rgba(255, 255, 255, 0.03)' : 'transparent' }}
                  >
                    <td>
                      <strong style={{ color: row.color, fontWeight: isPort ? 900 : 700 }}>
                        {row.name}
                      </strong>
                    </td>
                    <td className="mono text-muted">{row.code}</td>
                    <td className="text-right mono" style={{ fontWeight: 700, color: (m.period_return || 0) >= 0 ? 'var(--emerald)' : 'var(--red)' }}>
                      {(m.period_return || 0) >= 0 ? '+' : ''}{Number(m.period_return || 0).toFixed(2)}%
                    </td>
                    <td className="text-right mono" style={{ color: (m.cagr || 0) >= 0 ? 'var(--emerald)' : 'var(--red)' }}>
                      {(m.cagr || 0) >= 0 ? '+' : ''}{Number(m.cagr || 0).toFixed(2)}%
                    </td>
                    <td className="text-right mono">{Number(m.volatility || 0).toFixed(2)}%</td>
                    <td className="text-right mono font-medium" style={{ color: (m.sharpe || 0) >= 0 ? 'var(--emerald)' : 'var(--red)' }}>
                      {Number(m.sharpe || 0).toFixed(2)}
                    </td>
                    <td className="text-right mono" style={{ color: (m.sortino || 0) >= 0 ? 'var(--emerald)' : 'var(--red)' }}>
                      {Number(m.sortino || 0).toFixed(2)}
                    </td>
                    <td className="text-right mono font-medium">
                      {isPort ? '1.00' : Number(m.beta || 0).toFixed(2)}
                    </td>
                    <td className="text-right mono" style={{ color: (m.alpha || 0) >= 0 ? 'var(--emerald)' : 'var(--red)' }}>
                      {isPort ? '0.00%' : `${(m.alpha || 0) >= 0 ? '+' : ''}${Number(m.alpha || 0).toFixed(2)}%`}
                    </td>
                    <td className="text-right mono">
                      {isPort ? '0.00%' : `${Number(m.tracking_error || 0).toFixed(2)}%`}
                    </td>
                    <td className="text-right mono text-down" style={{ color: 'var(--red)' }}>
                      {Number(m.max_drawdown || 0).toFixed(2)}%
                    </td>
                    <td className="text-right mono">
                      {Number(m.calmar || 0).toFixed(2)}
                    </td>
                    <td className="text-right mono">
                      {isPort ? '1.00' : Number(m.correlation || 0).toFixed(2)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Quantitative Decision Guide Legend */}
        <div style={{ background: '#0b101b', borderTop: '1px solid var(--border)', padding: '12px 16px', fontSize: 10.5, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginTop: 14, borderRadius: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="nav-badge emerald" style={{ padding: '2px 6px', fontSize: 9 }}>Üstün</span>
            <span style={{ color: 'var(--text-muted)' }}>
              <strong style={{ color: '#fff' }}>Sharpe & Sortino:</strong> Risksiz faiz üzeri birim risk başına getiri kalitesi.
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="nav-badge cyan" style={{ padding: '2px 6px', fontSize: 9 }}>Defansif</span>
            <span style={{ color: 'var(--text-muted)' }}>
              <strong style={{ color: '#fff' }}>Beta (β):</strong> &lt; 0.85 portföyün piyasa çöküşlerine karşı korumalı olduğunu gösterir.
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="nav-badge emerald" style={{ padding: '2px 6px', fontSize: 9 }}>+Alfa</span>
            <span style={{ color: 'var(--text-muted)' }}>
              <strong style={{ color: '#fff' }}>Jensen Alpha (α):</strong> Portföy yöneticisinin piyasaya attığı reel performans farkı.
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="nav-badge cyan" style={{ padding: '2px 6px', fontSize: 9 }}>Eş Koruma</span>
            <span style={{ color: 'var(--text-muted)' }}>
              <strong style={{ color: '#fff' }}>Korelasyon:</strong> 0'a yakın/negatif varlıklar portföy riskini dağıtır.
            </span>
          </div>
        </div>

      </div>
    </div>
  );
}
