import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Search, Shield, Trash2, ArrowUpRight, Award, DollarSign, Wallet } from 'lucide-react';

export default function TradeLedgerTab({ onOpenTransferModal }) {
  const { tradeLedger, portfolioSummary, currentCurrency, deleteTrade } = useApp();
  const [search, setSearch] = useState('');
  const isTRY = currentCurrency === 'try';
  const sym = isTRY ? '₺' : '$';

  const filteredTrades = tradeLedger.filter(t => {
    const q = search.toLowerCase();
    return (
      (t.ticker && t.ticker.toLowerCase().includes(q)) ||
      (t.name && t.name.toLowerCase().includes(q)) ||
      (t.note && t.note.toLowerCase().includes(q))
    );
  });

  return (
    <div className="tab-pane-content">
      {/* Header Banner */}
      <div className="ledger-header-row">
        <div>
          <h2 className="section-title">
            <span>📜 GERÇEKLEŞEN KÂR DEFTERİ & İŞLEM GEÇMİŞİ</span>
            <span className="badge-pill emerald">Kesinleşmiş Kâr</span>
          </h2>
          <p className="section-subtitle">
            Kısmi veya tam satış yapılan pozisyonların cebe giren net kazançları, toplam satış hasılatı ve Kur Kalkanı tamponuna aktarım merkezi.
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

      {/* 4 KPI Cards for Trade Ledger */}
      <div className="kpi-grid">
        {/* KPI 1: Toplam Gerçekleşen Kâr */}
        <div className="kpi-card green">
          <div className="kpi-header">
            <span>Toplam Gerçekleşen Net Kâr</span>
            <span className="badge-pill emerald">Cebe Giren</span>
          </div>
          <div className="kpi-val mono text-emerald">
            +₺{portfolioSummary.realizedProfitTRY.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="kpi-sub mono">
            <span>Dolar Karşılığı:</span>
            <strong style={{ color: '#fff' }}>+${portfolioSummary.realizedProfitUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD</strong>
          </div>
        </div>

        {/* KPI 2: Toplam Satış Hasılatı */}
        <div className="kpi-card cyan">
          <div className="kpi-header">
            <span>Toplam Satış Hasılatı</span>
            <span className="badge-pill cyan">Nakit Likidite</span>
          </div>
          <div className="kpi-val mono text-cyan">
            ₺{portfolioSummary.totalProceedsTRY.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="kpi-sub mono">
            <span>Dolar Karşılığı:</span>
            <strong style={{ color: '#fff' }}>${portfolioSummary.totalProceedsUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD</strong>
          </div>
        </div>

        {/* KPI 3: Win Rate */}
        <div className="kpi-card gold">
          <div className="kpi-header">
            <span>İşlem Başarı Oranı (Win Rate)</span>
            <span className="badge-pill gold">Kapanan Pozisyon</span>
          </div>
          <div className="kpi-val mono text-gold">
            %{portfolioSummary.winRatePct.toFixed(1)}
          </div>
          <div className="kpi-sub mono">
            <span>Tamamlanan İşlem:</span>
            <strong style={{ color: '#fff' }}>{portfolioSummary.tradesCount} İşlem ({portfolioSummary.winningTrades} Kârlı)</strong>
          </div>
        </div>

        {/* KPI 4: Kalkan Güvence Stratejisi */}
        <div className="kpi-card purple">
          <div className="kpi-header">
            <span>Kâr Realizasyon & Koruma</span>
            <span className="badge-pill purple">Kuru Barut</span>
          </div>
          <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', lineHeight: '1.4', margin: '4px 0 10px 0' }}>
            Elde ettiğiniz kârı Para Piyasası Fonu'na (PPF) aktararak koruyabilir veya Gram Altın'a çevirebilirsiniz.
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

      {/* Info Callout */}
      <div className="info-callout-box">
        <div className="callout-text">
          <strong className="text-cyan">💡 Portföy Kuralı (Açık Kâr vs Gerçekleşen Kâr):</strong>{' '}
          Hisselerinizi elinizde tutarken gördüğünüz kâr <em>"potansiyel/açık"</em> kârdır ve piyasa dalgalandığında eriyebilir.{' '}
          <strong>Kısmi veya tam satış</strong> yaptığınız an kazanç <strong>"Gerçekleşen Kâr"</strong> defterine işlenir, kesinleşir ve ana portföy maliyetinizden bağımsız hale gelir.
        </div>
        <span className="live-status-pill">
          ✓ Firebase Bulut Aktif
        </span>
      </div>

      {/* Trade Ledger Table Card */}
      <div className="card table-card">
        <div className="card-header-between">
          <span className="card-title">KAPALI İŞLEMLER VE KÂR REALİZASYONLARI</span>
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

        <div className="table-responsive">
          <table className="terminal-table">
            <thead>
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
            </thead>
            <tbody>
              {filteredTrades.map(t => {
                const isProfit = (t.realized_pl_try || 0) >= 0;
                const curSign = t.currency === 'TRY' ? '₺' : '$';

                return (
                  <tr key={t.id} className="table-row">
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
                    </td>
                    <td className="text-right mono">
                      <span className={`return-badge ${isProfit ? 'up' : 'down'}`}>
                        {isProfit ? '+' : ''}{Number(t.realized_return_pct || t.return_pct || 0).toFixed(2)}%
                      </span>
                    </td>
                    <td className="note-cell" title={t.note || ''}>
                      {t.note || '--'}
                    </td>
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
