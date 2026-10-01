import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Search, ShoppingCart, Edit3, Trash2, Plus, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

export default function HoldingsTab({ onOpenSellModal, onOpenEditModal, onOpenAddModal }) {
  const { portfolioSummary, currentCurrency, deleteHolding } = useApp();
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState('val'); // default sort by Market Value
  const [sortDir, setSortDir] = useState('desc'); // default highest first

  const isTRY = currentCurrency === 'try';
  const sym = isTRY ? '₺' : '$';

  const holdings = portfolioSummary.enrichedHoldings || [];

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const sortedHoldings = useMemo(() => {
    let list = [...holdings];

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(h =>
        (h.ticker && h.ticker.toLowerCase().includes(q)) ||
        (h.name && h.name.toLowerCase().includes(q)) ||
        (h.type && h.type.toLowerCase().includes(q))
      );
    }

    list.sort((a, b) => {
      let valA, valB;

      switch (sortKey) {
        case 'ticker':
          valA = a.ticker || '';
          valB = b.ticker || '';
          return sortDir === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        case 'type':
          valA = a.type || '';
          valB = b.type || '';
          return sortDir === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        case 'shares':
          valA = Number(a.shares) || 0;
          valB = Number(b.shares) || 0;
          break;
        case 'cost':
          valA = isTRY ? (a.costTRY || 0) : (a.costUSD || 0);
          valB = isTRY ? (b.costTRY || 0) : (b.costUSD || 0);
          break;
        case 'price':
          valA = isTRY ? (a.livePriceTRY || 0) : (a.livePriceUSD || 0);
          valB = isTRY ? (b.livePriceTRY || 0) : (b.livePriceUSD || 0);
          break;
        case 'change':
          valA = a.changePct || 0;
          valB = b.changePct || 0;
          break;
        case 'val':
          valA = isTRY ? (a.valTRY || 0) : (a.valUSD || 0);
          valB = isTRY ? (b.valTRY || 0) : (b.valUSD || 0);
          break;
        case 'profit':
          valA = isTRY ? (a.profitTRY || 0) : (a.profitUSD || 0);
          valB = isTRY ? (b.profitTRY || 0) : (b.profitUSD || 0);
          break;
        case 'return':
          valA = a.returnPct || 0;
          valB = b.returnPct || 0;
          break;
        default:
          valA = isTRY ? (a.valTRY || 0) : (a.valUSD || 0);
          valB = isTRY ? (b.valTRY || 0) : (b.valUSD || 0);
      }

      return sortDir === 'asc' ? valA - valB : valB - valA;
    });

    return list;
  }, [holdings, search, sortKey, sortDir, isTRY]);

  const renderSortIndicator = (key) => {
    if (sortKey !== key) {
      return <ArrowUpDown size={11} style={{ opacity: 0.35, marginLeft: 4 }} />;
    }
    return sortDir === 'asc' ? (
      <ArrowUp size={11} style={{ color: 'var(--cyan)', marginLeft: 4 }} />
    ) : (
      <ArrowDown size={11} style={{ color: 'var(--cyan)', marginLeft: 4 }} />
    );
  };

  return (
    <div className="tab-pane-content" style={{ animation: 'fadeIn 0.25s ease' }}>
      {/* Top Action Bar */}
      <div className="table-action-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div className="search-box" style={{ width: 340 }}>
          <Search size={14} className="search-icon" />
          <input
            type="text"
            placeholder="🔍 Varlık Ara (Sembol, Unvan veya Tür)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="action-btns" style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            Toplam <strong>{sortedHoldings.length}</strong> pozisyon listeleniyor
          </span>
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
      <div className="card table-card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <div className="table-responsive">
          <table className="terminal-table">
            <thead>
              <tr style={{ userSelect: 'none' }}>
                <th onClick={() => handleSort('ticker')} style={{ cursor: 'pointer' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center' }}>
                    <span>Varlık</span>
                    {renderSortIndicator('ticker')}
                  </div>
                </th>
                <th onClick={() => handleSort('type')} style={{ cursor: 'pointer' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center' }}>
                    <span>Tür</span>
                    {renderSortIndicator('type')}
                  </div>
                </th>
                <th onClick={() => handleSort('shares')} className="text-right" style={{ cursor: 'pointer' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', width: '100%' }}>
                    <span>Adet</span>
                    {renderSortIndicator('shares')}
                  </div>
                </th>
                <th onClick={() => handleSort('cost')} className="text-right" style={{ cursor: 'pointer' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', width: '100%' }}>
                    <span>Ort. Maliyet</span>
                    {renderSortIndicator('cost')}
                  </div>
                </th>
                <th onClick={() => handleSort('price')} className="text-right" style={{ cursor: 'pointer' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', width: '100%' }}>
                    <span>Canlı Fiyat</span>
                    {renderSortIndicator('price')}
                  </div>
                </th>
                <th onClick={() => handleSort('change')} className="text-right" style={{ cursor: 'pointer' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', width: '100%' }}>
                    <span>24s Değişim</span>
                    {renderSortIndicator('change')}
                  </div>
                </th>
                <th onClick={() => handleSort('val')} className="text-right" style={{ cursor: 'pointer' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', width: '100%' }}>
                    <span>Piyasa Değeri</span>
                    {renderSortIndicator('val')}
                  </div>
                </th>
                <th onClick={() => handleSort('profit')} className="text-right" style={{ cursor: 'pointer' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', width: '100%' }}>
                    <span>Kâr / Zarar</span>
                    {renderSortIndicator('profit')}
                  </div>
                </th>
                <th onClick={() => handleSort('return')} className="text-right" style={{ cursor: 'pointer' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', width: '100%' }}>
                    <span>Getiri %</span>
                    {renderSortIndicator('return')}
                  </div>
                </th>
                <th className="text-right" style={{ minWidth: '150px' }}>İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {sortedHoldings.map(h => {
                const isProfit = (isTRY ? h.profitTRY : h.profitUSD) >= 0;
                const profitVal = isTRY ? h.profitTRY : h.profitUSD;
                const totalVal = isTRY ? h.valTRY : h.valUSD;
                const changeUp = (h.changePct || 0) >= 0;

                // Price display with native currency note
                const displayedPrice = isTRY ? h.livePriceTRY : h.livePriceUSD;
                const altPrice = isTRY ? h.livePriceUSD : h.livePriceTRY;
                const altSym = isTRY ? '$' : '₺';

                // Cost display
                const displayedCost = isTRY ? (h.costTRY / (h.shares || 1)) : (h.costUSD / (h.shares || 1));

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
                    <td className="text-right mono font-medium">
                      {Number(h.shares).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
                    </td>
                    <td className="text-right mono text-muted">
                      {sym}{Number(displayedCost).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                    </td>
                    <td className="text-right mono text-bright">
                      <div style={{ fontWeight: 700 }}>
                        {sym}{Number(displayedPrice).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                      </div>
                      {h.quoteCurrency === 'USD' && isTRY && (
                        <div style={{ fontSize: 9.5, color: 'var(--text-muted)' }}>
                          (${Number(altPrice).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })})
                        </div>
                      )}
                    </td>
                    <td className="text-right mono">
                      <span className={`change-pill ${changeUp ? 'up' : 'down'}`}>
                        {changeUp ? '▲ +' : '▼ '}{Math.abs(h.changePct || 0).toFixed(2)}%
                      </span>
                    </td>
                    <td className="text-right mono text-cyan" style={{ fontWeight: 800 }}>
                      {sym}{totalVal.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="text-right mono">
                      <span className={isProfit ? 'text-up' : 'text-down'} style={{ fontWeight: 700 }}>
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
                    ₺{portfolioSummary.gramGoldPrice.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="text-right mono"><span className="change-pill up">▲ Kalkan</span></td>
                  <td className="text-right mono text-gold" style={{ fontWeight: 800 }}>
                    {sym}{(isTRY ? portfolioSummary.totalGoldValTRY : portfolioSummary.totalGoldValTRY / portfolioSummary.usdtry).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="text-right mono">
                    <span className={portfolioSummary.goldProfitTRY >= 0 ? 'text-up' : 'text-down'} style={{ fontWeight: 700 }}>
                      {portfolioSummary.goldProfitTRY >= 0 ? '+' : ''}{sym}{(isTRY ? portfolioSummary.goldProfitTRY : portfolioSummary.goldProfitTRY / portfolioSummary.usdtry).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </td>
                  <td className="text-right mono">
                    <span className={`return-badge ${portfolioSummary.goldReturnPct >= 0 ? 'up' : 'down'}`}>
                      {portfolioSummary.goldReturnPct >= 0 ? '+' : ''}{portfolioSummary.goldReturnPct.toFixed(2)}%
                    </span>
                  </td>
                  <td className="text-right">
                    <span className="nav-badge gold" style={{ fontSize: 10, padding: '2px 8px' }}>
                      Kalkan Havuzunda
                    </span>
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
