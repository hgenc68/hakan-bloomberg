import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Search, ShoppingCart, Edit3, Trash2, Plus, ArrowUpRight, ArrowDownRight } from 'lucide-react';

export default function HoldingsTab({ onOpenSellModal, onOpenEditModal, onOpenAddModal }) {
  const { portfolioSummary, currentCurrency, deleteHolding } = useApp();
  const [search, setSearch] = useState('');
  const isTRY = currentCurrency === 'try';
  const sym = isTRY ? '₺' : '$';

  const holdings = portfolioSummary.enrichedHoldings || [];

  const filteredHoldings = holdings.filter(h => {
    const q = search.toLowerCase();
    return (
      (h.ticker && h.ticker.toLowerCase().includes(q)) ||
      (h.name && h.name.toLowerCase().includes(q)) ||
      (h.type && h.type.toLowerCase().includes(q))
    );
  });

  return (
    <div className="tab-pane-content">
      {/* Top Action Bar */}
      <div className="table-action-bar">
        <div className="search-box">
          <Search size={14} className="search-icon" />
          <input
            type="text"
            placeholder="🔍 Varlık Ara (Sembol, Unvan veya Tür)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="action-btns">
          <button
            type="button"
            className="btn-primary"
            onClick={onOpenAddModal}
          >
            <Plus size={14} />
            <span>Yeni Pozisyon Ekle</span>
          </button>
        </div>
      </div>

      {/* Holdings Table */}
      <div className="card table-card">
        <div className="table-responsive">
          <table className="terminal-table">
            <thead>
              <tr>
                <th>Varlık</th>
                <th>Tür</th>
                <th className="text-right">Adet</th>
                <th className="text-right">Ort. Maliyet</th>
                <th className="text-right">Canlı Fiyat</th>
                <th className="text-right">24s Değişim</th>
                <th className="text-right">Piyasa Değeri</th>
                <th className="text-right">Kâr / Zarar</th>
                <th className="text-right">Getiri %</th>
                <th className="text-right" style={{ minWidth: '160px' }}>İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {filteredHoldings.map(h => {
                const isProfit = (isTRY ? h.profitTRY : h.profitUSD) >= 0;
                const profitVal = isTRY ? h.profitTRY : h.profitUSD;
                const totalVal = isTRY ? h.valTRY : h.valUSD;
                const changeUp = (h.changePct || 0) >= 0;
                const assetCurrencySym = h.isAssetUSD ? '$' : '₺';

                return (
                  <tr key={h.id} className="table-row">
                    <td>
                      <div className="ticker-cell">
                        <strong className="ticker-symbol mono">{h.ticker}</strong>
                        <span className="ticker-desc">{h.name || h.ticker}</span>
                      </div>
                    </td>
                    <td>
                      <span className={`badge-type ${h.type?.toLowerCase() || 'hisse'}`}>
                        {h.type || 'Hisse'}
                      </span>
                    </td>
                    <td className="text-right mono">
                      {Number(h.shares).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
                    </td>
                    <td className="text-right mono text-muted">
                      {assetCurrencySym}{Number(h.avg_cost).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="text-right mono text-bright">
                      {assetCurrencySym}{Number(h.livePrice).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="text-right mono">
                      <span className={`change-pill ${changeUp ? 'up' : 'down'}`}>
                        {changeUp ? '▲ +' : '▼ '}{Math.abs(h.changePct || 0).toFixed(2)}%
                      </span>
                    </td>
                    <td className="text-right mono text-cyan">
                      {sym}{totalVal.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="text-right mono">
                      <span className={isProfit ? 'text-up' : 'text-down'}>
                        {isProfit ? '+' : ''}{sym}{profitVal.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </td>
                    <td className="text-right mono">
                      <span className={`return-badge ${isProfit ? 'up' : 'down'}`}>
                        {isProfit ? '+' : ''}{(h.returnPct || 0).toFixed(2)}%
                      </span>
                    </td>
                    <td className="text-right">
                      <div className="row-actions">
                        <button
                          type="button"
                          className="btn-action-row sell"
                          onClick={() => onOpenSellModal(h)}
                          title="Kısmi Satış Yap (Kârı Deftere İşle)"
                        >
                          <ShoppingCart size={12} />
                          <span>Sat</span>
                        </button>
                        <button
                          type="button"
                          className="btn-action-row edit"
                          onClick={() => onOpenEditModal(h)}
                          title="Pozisyonu Düzenle"
                        >
                          <Edit3 size={12} />
                        </button>
                        <button
                          type="button"
                          className="btn-action-row delete"
                          onClick={() => {
                            if (window.confirm(`${h.ticker} pozisyonunu silmek istediğinize emin misiniz?`)) {
                              deleteHolding(h.id);
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

              {/* Sentetik Gram Altın Satırı */}
              {portfolioSummary.totalGrams > 0 && (
                <tr className="table-row synthetic-gold">
                  <td>
                    <div className="ticker-cell">
                      <strong className="ticker-symbol mono text-gold">GRAM_ALTIN</strong>
                      <span className="ticker-desc">Fiziki / Banka Gram Altın Havuzu (Kur Kalkanı)</span>
                    </div>
                  </td>
                  <td><span className="badge-type altin">👑 Altın / Kalkan</span></td>
                  <td className="text-right mono text-gold">{portfolioSummary.totalGrams} gr</td>
                  <td className="text-right mono text-muted">
                    ₺{(portfolioSummary.totalGoldCostTRY / portfolioSummary.totalGrams).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="text-right mono text-gold">
                    ₺{portfolioSummary.enrichedHoldings?.[0]?.livePrice ? (portfolioSummary.totalGoldValTRY / portfolioSummary.totalGrams).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '6.600,00'}
                  </td>
                  <td className="text-right mono"><span className="change-pill up">▲ Kalkan</span></td>
                  <td className="text-right mono text-gold">
                    {sym}{(isTRY ? portfolioSummary.totalGoldValTRY : portfolioSummary.totalGoldValTRY / portfolioSummary.usdtry).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="text-right mono">
                    <span className={portfolioSummary.goldProfitTRY >= 0 ? 'text-up' : 'text-down'}>
                      {portfolioSummary.goldProfitTRY >= 0 ? '+' : ''}{sym}{(isTRY ? portfolioSummary.goldProfitTRY : portfolioSummary.goldProfitTRY / portfolioSummary.usdtry).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </td>
                  <td className="text-right mono">
                    <span className={`return-badge ${portfolioSummary.goldReturnPct >= 0 ? 'up' : 'down'}`}>
                      {portfolioSummary.goldReturnPct >= 0 ? '+' : ''}{portfolioSummary.goldReturnPct.toFixed(2)}%
                    </span>
                  </td>
                  <td className="text-right">
                    <span className="badge-pill gold">Kalkan Havuzunda</span>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
