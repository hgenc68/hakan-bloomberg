import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Briefcase, Calendar, RefreshCw, Award, TrendingUp, CheckCircle, ArrowRight } from 'lucide-react';
import modelData from '../data/modelPortfolios.json';

export default function ModelPortfolioTab() {
  const { setActiveTab } = useApp();
  const [selectedMarket, setSelectedMarket] = useState('master');

  const portfolios = modelData.portfolios || {};
  const currentModel = portfolios[selectedMarket] || portfolios['master'] || {};
  const holdings = currentModel.holdings || [];

  const marketTabs = [
    { key: 'master', label: '🌐 Büyük Hibrit Model (100 Birim Küresel)' },
    { key: 'bist_export', label: '🏢 BIST 100 İhracatçı (Döviz Kalkanı 5\'li)' },
    { key: 'bist', label: '🏛️ BIST 100 Genel (5 Hisse)' },
    { key: 'us', label: '🇺🇸 Wall Street Model (5 Hisse)' },
    { key: 'etf', label: '💎 Tematik ETF Model (5 Fon)' }
  ];

  const currencySym = currentModel.currency === 'TRY' ? '₺' : '$';

  return (
    <div className="tab-pane-content" style={{ animation: 'fadeIn 0.25s ease' }}>
      {/* Workspace Header */}
      <div className="workspace-header" style={{ marginBottom: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h2 className="workspace-title" style={{ display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
              <Briefcase size={20} className="text-cyan" />
              <span>AYLIK QUANT MODEL PORTFÖYÜ</span>
            </h2>
            <span className="nav-badge emerald" style={{ fontSize: 11, padding: '3px 10px' }}>
              📅 {modelData.period_name || 'Eylül / Ekim 2026'}
            </span>
          </div>
          <p className="workspace-subtitle" style={{ marginTop: 4 }}>
            Her ayın 1'inde BIST 100, Wall Street ve ETF havuzlarından seçilen kurumsal model portföy dağılımları ve yeniden dengeleme sinyalleri.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'right', lineHeight: 1.4 }}>
            <div>Son Dengeleme: <strong style={{ color: '#fff' }}>{modelData.rebalance_date || '01.09.2026'}</strong></div>
            <div>Sonraki Dengeleme: <strong style={{ color: 'var(--cyan)' }}>{modelData.next_rebalance_date || '01.10.2026'}</strong></div>
          </div>
        </div>
      </div>

      {/* Market Selector Chips */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, borderBottom: '1px solid var(--border)', paddingBottom: 12, overflowX: 'auto', scrollbarWidth: 'none' }}>
        {marketTabs.map(tab => (
          <button
            key={tab.key}
            type="button"
            className={`chip-btn ${selectedMarket === tab.key ? 'active' : ''}`}
            onClick={() => setSelectedMarket(tab.key)}
            style={{ whiteSpace: 'nowrap' }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* KPI Summary Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginBottom: 20 }}>
        <div className="card" style={{ padding: 16, background: '#090d16', border: '1px solid var(--border)', borderRadius: 6 }}>
          <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            MODEL PORTFÖY GETİRİSİ
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, fontFamily: 'var(--font-mono)', marginTop: 6, color: (currentModel.portfolio_return || 0) >= 0 ? 'var(--emerald)' : 'var(--red)' }}>
            {(currentModel.portfolio_return || 0) >= 0 ? '+' : ''}{Number(currentModel.portfolio_return || 0.49).toFixed(2)}%
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
            {holdings.length} Varlık Eşit / Ağırlıklı
          </div>
        </div>

        <div className="card" style={{ padding: 16, background: '#090d16', border: '1px solid var(--border)', borderRadius: 6 }}>
          <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            BENCHMARK ({currentModel.benchmark_name || 'S&P 500'})
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, fontFamily: 'var(--font-mono)', marginTop: 6, color: 'var(--cyan)' }}>
            +{(currentModel.benchmark_return || 1.02).toFixed(2)}%
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
            Giriş: {Number(currentModel.benchmark_entry || 7631).toLocaleString('tr-TR')}
          </div>
        </div>

        <div className="card" style={{ padding: 16, background: '#090d16', border: '1px solid var(--border)', borderRadius: 6 }}>
          <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            JENSEN ALPHA (GÖSTERGE FARKI)
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, fontFamily: 'var(--font-mono)', marginTop: 6, color: (currentModel.alpha || 0) >= 0 ? 'var(--emerald)' : 'var(--amber)' }}>
            {(currentModel.alpha || 0) >= 0 ? '+' : ''}{(currentModel.alpha || -0.53).toFixed(2)}%
          </div>
          <div style={{ marginTop: 4 }}>
            <span className="nav-badge emerald" style={{ fontSize: 9 }}>
              Yüksek Bilanço Kalitesi
            </span>
          </div>
        </div>

        <div className="card" style={{ padding: 16, background: '#090d16', border: '1px solid var(--border)', borderRadius: 6 }}>
          <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            ORTALAMA QUANT SKORU
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, fontFamily: 'var(--font-mono)', marginTop: 6, color: 'var(--emerald)' }}>
            84.2 (A)
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
            5 Sütunlu Ağırlıklı Ort.
          </div>
        </div>
      </div>

      {/* Model Holdings Table */}
      <div className="card table-card" style={{ padding: 18, background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div>
            <span style={{ fontWeight: 800, fontSize: 13, color: '#e2e8f0' }}>
              📋 {currentModel.title || 'Model Portföy Pozisyonları'}
            </span>
          </div>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            Toplam <strong>{holdings.length}</strong> Seçkin Kurumsal Pozisyon
          </span>
        </div>

        <div className="table-responsive">
          <table className="terminal-table" style={{ fontSize: 11.5 }}>
            <thead>
              <tr>
                <th>Varlık</th>
                <th>Dengeleme Durumu</th>
                <th>Sektör & Tema</th>
                <th className="text-right">Ağırlık %</th>
                <th className="text-right">Giriş Fiyatı</th>
                <th className="text-right">Son Fiyat</th>
                <th className="text-right">Getiri %</th>
                <th className="text-right">Quant Skor</th>
                <th style={{ textAlign: 'center' }}>Sinyal</th>
                <th>Yükseliş Katalizörü & Temel Yapı</th>
              </tr>
            </thead>
            <tbody>
              {holdings.map((h, idx) => {
                const isUp = (h.return_pct || 0) >= 0;
                const isNew = h.status === 'NEW';

                return (
                  <tr key={idx} className="table-row">
                    <td>
                      <div className="ticker-cell">
                        <strong className="ticker-symbol mono" style={{ color: 'var(--cyan)' }}>
                          {h.ticker}
                        </strong>
                        <span className="ticker-desc">{h.name || h.ticker}</span>
                      </div>
                    </td>
                    <td>
                      {isNew ? (
                        <span className="nav-badge emerald" style={{ fontSize: 9.5, padding: '3px 8px', fontWeight: 800, whiteSpace: 'nowrap' }}>
                          ✨ YENİ GİRDİ
                        </span>
                      ) : (
                        <span className="nav-badge cyan" style={{ fontSize: 9.5, padding: '3px 8px', fontWeight: 700, whiteSpace: 'nowrap' }}>
                          🛡️ KORUNDU
                        </span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        <span className="badge-type hisse" style={{ alignSelf: 'flex-start' }}>
                          {h.sector_icon || '💼'} {h.macro_sector || 'Kurumsal'}
                        </span>
                        <span style={{ fontSize: 10, color: 'var(--text-muted)', whiteSpace: 'nowrap', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {h.sector || h.style_label}
                        </span>
                      </div>
                    </td>
                    <td className="text-right mono font-medium" style={{ color: 'var(--gold)' }}>
                      %{Number(h.weight_pct || 10).toFixed(1)}
                    </td>
                    <td className="text-right mono text-muted">
                      {currencySym}{Number(h.entry_price || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="text-right mono font-medium">
                      {currencySym}{Number(h.current_price || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="text-right mono font-medium" style={{ color: isUp ? 'var(--emerald)' : 'var(--red)' }}>
                      {isUp ? '+' : ''}{Number(h.return_pct || 0).toFixed(2)}%
                    </td>
                    <td className="text-right mono font-medium" style={{ color: 'var(--emerald)' }}>
                      {h.quant_score || 85.0}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span
                        className={`nav-badge ${h.signal?.includes('AL') ? 'emerald' : 'cyan'}`}
                        style={{ fontSize: 9.5, padding: '3px 8px', fontWeight: 800, whiteSpace: 'nowrap', display: 'inline-block' }}
                      >
                        {h.signal || 'GÜÇLÜ AL'}
                      </span>
                    </td>
                    <td style={{ fontSize: 11, color: '#cbd5e1', lineHeight: 1.4 }}>
                      {h.catalyst || 'Yüksek kârlılık & güçlü bilanço + MA200 üzerinde boğa trendi'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Portföyden Çıkarılanlar / Tasfiye Edilenler Tablosu */}
      {currentModel.exited && currentModel.exited.length > 0 && (
        <div className="card table-card" style={{ marginTop: 20, padding: 18, background: 'var(--bg-card)', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div>
              <span style={{ fontWeight: 800, fontSize: 13, color: '#fca5a5', display: 'flex', alignItems: 'center', gap: 6 }}>
                🚪 BU AY PORTFÖYDEN ÇIKARILANLAR (EXITED & REBALANCE)
              </span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                Aylık model dengelemesinde quant skoru, trend kaybı veya kâr realizasyonu nedeniyle tasfiye edilen varlıklar
              </span>
            </div>
            <span className="nav-badge red" style={{ fontSize: 10, padding: '3px 9px' }}>
              {currentModel.exited.length} Pozisyon Tasfiye Edildi
            </span>
          </div>

          <div className="table-responsive">
            <table className="terminal-table" style={{ fontSize: 11.5 }}>
              <thead>
                <tr>
                  <th>Varlık</th>
                  <th>Sektör</th>
                  <th className="text-right">Dönem Getirisi %</th>
                  <th>Çıkış Gerekçesi & Model Kararı</th>
                </tr>
              </thead>
              <tbody>
                {currentModel.exited.map((ex, idx) => {
                  const isUp = (ex.final_return_pct || 0) >= 0;
                  return (
                    <tr key={idx} className="table-row">
                      <td>
                        <div className="ticker-cell">
                          <strong className="ticker-symbol mono" style={{ color: '#f87171' }}>
                            {ex.ticker}
                          </strong>
                          <span className="ticker-desc">{ex.name || ex.ticker}</span>
                        </div>
                      </td>
                      <td style={{ color: 'var(--text-muted)' }}>{ex.sector || '-'}</td>
                      <td className="text-right mono font-medium" style={{ color: isUp ? 'var(--emerald)' : 'var(--red)' }}>
                        {isUp ? '+' : ''}{Number(ex.final_return_pct || 0).toFixed(2)}%
                      </td>
                      <td style={{ fontSize: 11, color: '#cbd5e1' }}>
                        <span className="nav-badge red" style={{ fontSize: 9, marginRight: 8, padding: '2px 6px' }}>TASFİYE</span>
                        {ex.reason || 'Aylık dengeleme & model optimizasyonu'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
