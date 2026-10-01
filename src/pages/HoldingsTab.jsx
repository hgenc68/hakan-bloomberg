import React, { useState, useMemo } from 'react';
import { useApp, KNOWN_CRYPTO_SET } from '../context/AppContext';
import { Search, ShoppingCart, Edit3, Trash2, Plus, ArrowUpDown, ArrowUp, ArrowDown, Briefcase, Sparkles, AlertCircle, CheckCircle, ChevronDown, ChevronUp, ArrowRight, ShieldCheck } from 'lucide-react';
import stocksData from '../data/stocksData.json';

export default function HoldingsTab({ onOpenSellModal, onOpenEditModal, onOpenAddModal, onOpenCashModal }) {
  const { portfolioSummary, currentCurrency, deleteHolding, gramGoldPrice, usdtry, setActiveTab } = useApp();
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState('val'); // default sort by Market Value
  const [sortDir, setSortDir] = useState('desc'); // default highest first
  const [showRebalanceAssistant, setShowRebalanceAssistant] = useState(true);
  const [rebalancePeriod, setRebalancePeriod] = useState('monthly'); // 'monthly' or 'weekly'

  const isTRY = currentCurrency === 'try';
  const sym = isTRY ? '₺' : '$';

  const fmt = (v, d = 2) => (Number(v) || 0).toLocaleString('tr-TR', { minimumFractionDigits: d, maximumFractionDigits: d });
  const fmtInt = (v) => (Number(v) || 0).toLocaleString('tr-TR', { maximumFractionDigits: 0 });
  const fmtShares = (v) => {
    const n = Number(v) || 0;
    return n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 6 });
  };

  const holdings = portfolioSummary?.enrichedHoldings || [];

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

  const totalValAll = portfolioSummary?.totalValTRY || 1;
  const equityHoldings = useMemo(() => {
    return holdings.filter(h => {
      const sym = (h.ticker || '').toUpperCase();
      const clean = sym.replace('.IS', '').replace('-USD', '');
      const isCrypto = h.type === 'Kripto' || KNOWN_CRYPTO_SET.has(clean) || KNOWN_CRYPTO_SET.has(sym);
      const isGoldOrCash = h.type === 'Altın' || h.type === 'Emtia' || h.type === 'Nakit' || clean === 'XAUT';
      if (isCrypto || isGoldOrCash) return false;
      return h.type === 'Hisse' || h.type === 'ETF' || h.type === 'Hisse Senedi';
    });
  }, [holdings]);

  const rebalanceList = useMemo(() => {
    return equityHoldings.map(h => {
      const sym = (h.ticker || '').toUpperCase();
      const clean = sym.replace('.IS', '').replace('-USD', '');
      const stockInfo = stocksData[clean] || stocksData[sym] || {};
      const quantScore = stockInfo.analysis?.quant_score || 78.0;
      const isUS = h.currency === 'USD' || h.isHoldingUSD || Number(h.cost_rate) > 1.5;
      const category = h.type === 'ETF' ? 'Tematik ETF' : (isUS ? 'ABD Hisse' : 'BIST 100');
      const weightPct = ((h.valTRY || 0) / totalValAll) * 100;

      let action = 'HOLD';
      let badgeColor = 'cyan';
      let actionTitle = '🛡️ TUT / KORU';
      let reason = 'Mevcut ağırlık dengeli, büyüme ve bilanço yapısı hedeflerle uyumlu.';

      if (weightPct > 15.0) {
        action = 'TRIM';
        badgeColor = 'red';
        actionTitle = '🚪 KISMEN ÇIK / AZALT';
        reason = `Portföyün %${weightPct.toFixed(1)}'ini oluşturuyor. %7.5 tek varlık tavanını aştı; kâr alıp kalkanı güçlendirin.`;
      } else if (weightPct > 7.5) {
        action = 'TRIM_MILD';
        badgeColor = 'amber';
        actionTitle = '⚖️ AĞIRLIK AZALT';
        reason = `Mevcut pay (%${weightPct.toFixed(1)}) üst sınırda. Yeni ekleme yapmayın, kâr realizasyonunu değerlendirin.`;
      } else if (quantScore >= 82.0 && weightPct < 6.0) {
        action = 'ACCUMULATE';
        badgeColor = 'emerald';
        actionTitle = '✨ EKLE / BİRİKTİR';
        reason = `Quant Skoru ${quantScore.toFixed(1)} (A+) ile güçlü boğa trendinde. Ağırlığı düşük (%${weightPct.toFixed(1)}), kademeli eklenebilir.`;
      } else if (quantScore < 65.0) {
        action = 'EXIT';
        badgeColor = 'red';
        actionTitle = '🚪 MODEL DIŞI / ÇIK';
        reason = `Quant skoru ${quantScore.toFixed(1)} seviyesine geriledi. Momentum ve bilanço zayıfladı.`;
      } else {
        action = 'HOLD';
        badgeColor = 'cyan';
        actionTitle = '🛡️ TUT / KORU';
        reason = `Quant Skoru ${quantScore.toFixed(1)} ile istikrarlı. Pozisyon ağırlığı (%${weightPct.toFixed(1)}) makul seviyede.`;
      }

      return {
        ...h,
        clean,
        category,
        quantScore,
        weightPct,
        action,
        badgeColor,
        actionTitle,
        reason
      };
    });
  }, [equityHoldings, totalValAll, isTRY, usdtry]);

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
      {/* 🤖 AY BAŞI KİŞİSEL REBALANCE & DENGELEME ASİSTANI (BIST, ABD & ETF) */}
      <div className="card" style={{ marginBottom: 16, padding: 16, background: '#070a14', border: '1px solid rgba(0, 229, 255, 0.25)', borderRadius: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: showRebalanceAssistant ? 12 : 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 6, background: 'rgba(0, 229, 255, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--cyan)' }}>
              <Briefcase size={18} />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 13, color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>🤖 KİŞİSEL PORTFÖY REBALANCE ASİSTANI (BIST, ABD & ETF)</span>
                <span className="nav-badge emerald" style={{ fontSize: 9.5 }}>
                  📅 {rebalancePeriod === 'monthly' ? 'Ekim 2026 Dengelemesi' : 'Haftalık Momentum'}
                </span>
              </div>
              <div style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>
                Sadece Hisse ve ETF pozisyonlarınız için Quant skoru, risk tavanı ve model portföy kriterlerine göre üretilen net aksiyonlar
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Period Selector */}
            <div style={{ display: 'inline-flex', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, padding: 2 }}>
              <button
                type="button"
                className={`chip-btn ${rebalancePeriod === 'monthly' ? 'active' : ''}`}
                onClick={() => setRebalancePeriod('monthly')}
                style={{ fontSize: 10, padding: '3px 8px' }}
                title="Kurumsal standart: Ay başında çeyreklik bilançolara göre dengelenir"
              >
                📅 Aylık (Önerilen)
              </button>
              <button
                type="button"
                className={`chip-btn ${rebalancePeriod === 'weekly' ? 'active' : ''}`}
                onClick={() => setRebalancePeriod('weekly')}
                style={{ fontSize: 10, padding: '3px 8px' }}
                title="Haftalık momentum ve aşırı alım/satım takibi"
              >
                ⚡ Haftalık
              </button>
            </div>

            <button
              type="button"
              className="chip-btn"
              onClick={() => setShowRebalanceAssistant(prev => !prev)}
              style={{ fontSize: 10, padding: '4px 8px' }}
            >
              {showRebalanceAssistant ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          </div>
        </div>

        {showRebalanceAssistant && (
          <div>
            {/* Neden Aylık Notu */}
            <div style={{ background: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.2)', borderRadius: 6, padding: '8px 12px', fontSize: 10.5, color: '#cbd5e1', marginBottom: 10 }}>
              <strong style={{ color: 'var(--cyan)' }}>💡 Uzman Notu (Aylık vs Haftalık): </strong>
              <span>
                Hisse ve ETF'lerde haftalık al-sat komisyon eritir ve testere piyasasında yanıltır (bilançolar çeyrekliktir). 
                Bu nedenle profesyonel fonlar portföylerini <strong>her ayın 1'inde</strong> yeniden dengeler.
              </span>
            </div>

            {/* Kullanılabilir Alım Gücü (Serbest Nakit) Göstergesi */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.25)', borderRadius: 6, padding: '8px 12px', fontSize: 11, marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 14 }}>💼</span>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Mevcut Kullanılabilir Alım Gücü (Serbest Nakit): </span>
                  <strong className="mono text-emerald" style={{ fontSize: 13 }}>
                    ₺{fmt(portfolioSummary.buyingPowerTRY || 0)}
                  </strong>
                  <span className="mono text-muted" style={{ marginLeft: 6, fontSize: 11 }}>
                    (${fmt(portfolioSummary.buyingPowerUSD || 0)} USD)
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="chip-btn"
                onClick={onOpenCashModal}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', fontSize: 10.5, borderColor: 'rgba(16, 185, 129, 0.4)', color: 'var(--emerald)' }}
              >
                <span>💵 Serbest Nakit Güncelle</span>
              </button>
            </div>

            {/* Rebalance Table */}
            <div className="table-responsive">
              <table className="terminal-table" style={{ fontSize: 11 }}>
                <thead>
                  <tr>
                    <th>Varlık</th>
                    <th>Kategori</th>
                    <th className="text-right">Portföy Payı</th>
                    <th className="text-right">Quant Skor</th>
                    <th style={{ textAlign: 'center' }}>Model Önerisi</th>
                    <th>Model Gerekçesi & Aksiyon Sebebi</th>
                    <th style={{ textAlign: 'center' }}>Hızlı İşlem</th>
                  </tr>
                </thead>
                <tbody>
                  {rebalanceList.map((item, idx) => (
                    <tr key={idx} className="table-row">
                      <td>
                        <strong className="mono" style={{ color: 'var(--cyan)' }}>{item.ticker}</strong>
                        <span style={{ fontSize: 10, color: 'var(--text-muted)', display: 'block' }}>{item.name}</span>
                      </td>
                      <td>
                        <span className={`badge-type ${item.category.includes('BIST') ? 'bist' : item.category.includes('ABD') ? 'us' : 'etf'}`} style={{ fontSize: 9.5 }}>
                          {item.category}
                        </span>
                      </td>
                      <td className="text-right mono font-medium" style={{ color: item.weightPct > 15 ? 'var(--red)' : item.weightPct > 7.5 ? 'var(--amber)' : '#fff' }}>
                        %{item.weightPct.toFixed(1)}
                      </td>
                      <td className="text-right mono font-medium" style={{ color: item.quantScore >= 80 ? 'var(--emerald)' : 'var(--amber)' }}>
                        {item.quantScore.toFixed(1)}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className={`nav-badge ${item.badgeColor}`} style={{ fontSize: 9.5, padding: '3px 8px', fontWeight: 800, whiteSpace: 'nowrap' }}>
                          {item.actionTitle}
                        </span>
                      </td>
                      <td style={{ fontSize: 10.5, color: '#cbd5e1', lineHeight: 1.4 }}>
                        {item.reason}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {item.action === 'TRIM' || item.action === 'TRIM_MILD' || item.action === 'EXIT' ? (
                          <button
                            type="button"
                            className="btn-action-row"
                            onClick={() => onOpenSellModal(item)}
                            style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.4)', padding: '3px 8px', borderRadius: 4, fontSize: 10 }}
                            title="Kısmi satış yaparak kârı kilitle"
                          >
                            Satış Yap ➔
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="btn-action-row"
                            onClick={() => {
                              if (onOpenAddModal) onOpenAddModal(item.ticker);
                            }}
                            style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--emerald)', border: '1px solid rgba(16,185,129,0.4)', padding: '3px 8px', borderRadius: 4, fontSize: 10 }}
                            title="Yeni lot ekle"
                          >
                            Ekleme Yap ➔
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

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
        <div className="table-responsive terminal-table-scroll" style={{ maxHeight: 'calc(100vh - 230px)', minHeight: '380px', overflow: 'auto' }}>
          <table className="terminal-table sticky-header-table">
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
                    <span>24s Değişim & K/Z</span>
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
                const dayPLVal = isTRY ? (h.dayPLTRY || 0) : (h.dayPLUSD || 0);
                const dayPLUp = dayPLVal >= 0;

                // Price display with native currency note
                const displayedPrice = isTRY ? h.livePriceTRY : h.livePriceUSD;
                const altPrice = isTRY ? h.livePriceUSD : h.livePriceTRY;
                const altSym = isTRY ? '$' : '₺';

                // Cost display
                const displayedCost = isTRY ? (h.costTRY / (h.shares || 1)) : (h.costUSD / (h.shares || 1));
                const altCost = isTRY ? (h.costUSD / (h.shares || 1)) : (h.costTRY / (h.shares || 1));

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
                      {fmtShares(h.shares)}
                    </td>
                    <td className="text-right mono text-muted">
                      <div>
                        {sym}{fmt(displayedCost, 4)}
                      </div>
                      {(h.quoteCurrency === 'USD' || h.isHoldingUSD) && isTRY && (
                        <div style={{ fontSize: 9.5, color: 'var(--text-muted)', marginTop: 2 }}>
                          (${fmt(altCost, 4)})
                        </div>
                      )}
                      {!isTRY && (h.quoteCurrency === 'TRY' || !h.isHoldingUSD) && (
                        <div style={{ fontSize: 9.5, color: 'var(--text-muted)', marginTop: 2 }}>
                          (₺{fmt(altCost, 4)})
                        </div>
                      )}
                    </td>
                    <td className="text-right mono text-bright">
                      <div style={{ fontWeight: 700 }}>
                        {sym}{fmt(displayedPrice, 4)}
                      </div>
                      {(h.quoteCurrency === 'USD' || h.isHoldingUSD) && isTRY && (
                        <div style={{ fontSize: 9.5, color: 'var(--text-muted)', marginTop: 2 }}>
                          (${fmt(altPrice, 4)})
                        </div>
                      )}
                      {!isTRY && (h.quoteCurrency === 'TRY' || !h.isHoldingUSD) && (
                        <div style={{ fontSize: 9.5, color: 'var(--text-muted)', marginTop: 2 }}>
                          (₺{fmt(altPrice, 4)})
                        </div>
                      )}
                    </td>
                    <td className="text-right mono">
                      <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                        <span className={`change-pill ${changeUp ? 'up' : 'down'}`}>
                          {changeUp ? '▲ +' : '▼ '}{Math.abs(h.changePct || 0).toFixed(2)}%
                        </span>
                        <span style={{ fontSize: 10.5, fontWeight: 700, color: dayPLUp ? 'var(--up)' : 'var(--down)' }}>
                          {dayPLUp ? '+' : ''}{sym}{fmt(dayPLVal, 2)}
                        </span>
                      </div>
                    </td>
                    <td className="text-right mono text-cyan" style={{ fontWeight: 800 }}>
                      {sym}{fmt(totalVal, 2)}
                    </td>
                    <td className="text-right mono">
                      <span className={isProfit ? 'text-up' : 'text-down'} style={{ fontWeight: 700 }}>
                        {isProfit ? '+' : ''}{sym}{fmt(profitVal, 2)}
                      </span>
                    </td>
                    <td className="text-right mono">
                      <span className={`return-badge ${isProfit ? 'up' : 'down'}`}>
                        {isProfit ? '+' : ''}{fmt(h.returnPct, 2)}%
                      </span>
                    </td>
                    <td className="text-right">
                      <div className="row-actions">
                        <button
                          type="button"
                          className="btn-action-row buy"
                          onClick={() => onOpenAddModal && onOpenAddModal(h.ticker)}
                          title="Bu varlıktan ek alım yap (Ağırlıklı maliyet hesaplanır)"
                          style={{ background: 'rgba(0, 229, 255, 0.12)', color: 'var(--cyan)', border: '1px solid rgba(0, 229, 255, 0.3)', padding: '3px 7px', borderRadius: 4, display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 10.5 }}
                        >
                          <Plus size={11} />
                          <span>Al</span>
                        </button>
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
              {((portfolioSummary?.totalGrams) || 0) > 0 && (
                <tr className="table-row synthetic-gold">
                  <td>
                    <div className="ticker-cell">
                      <strong className="ticker-symbol mono text-gold">GRAM_ALTIN</strong>
                      <span className="ticker-desc">Fiziki / Banka Gram Altın Havuzu (Kur Kalkanı)</span>
                    </div>
                  </td>
                  <td><span className="badge-type altin">👑 Altın / Kalkan</span></td>
                  <td className="text-right mono text-gold">{fmt(portfolioSummary?.totalGrams, 2)} gr</td>
                  <td className="text-right mono text-muted">
                    ₺{fmt(portfolioSummary?.totalGrams > 0 ? (portfolioSummary?.totalGoldCostTRY / portfolioSummary?.totalGrams) : 0, 2)}
                  </td>
                  <td className="text-right mono text-gold">
                    ₺{fmt(portfolioSummary?.gramGoldPrice || gramGoldPrice, 2)}
                  </td>
                  <td className="text-right mono">
                    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                      <span className="change-pill up">▲ Kalkan</span>
                      <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                        Kur Sigortası
                      </span>
                    </div>
                  </td>
                  <td className="text-right mono text-gold" style={{ fontWeight: 800 }}>
                    {sym}{fmt(isTRY ? portfolioSummary?.totalGoldValTRY : (portfolioSummary?.totalGoldValTRY / (portfolioSummary?.usdtry || usdtry || 1)), 2)}
                  </td>
                  <td className="text-right mono">
                    <span className={(portfolioSummary?.goldProfitTRY || 0) >= 0 ? 'text-up' : 'text-down'} style={{ fontWeight: 700 }}>
                      {(portfolioSummary?.goldProfitTRY || 0) >= 0 ? '+' : ''}{sym}{fmt(isTRY ? portfolioSummary?.goldProfitTRY : ((portfolioSummary?.goldProfitTRY || 0) / (portfolioSummary?.usdtry || usdtry || 1)), 2)}
                    </span>
                  </td>
                  <td className="text-right mono">
                    <span className={`return-badge ${(portfolioSummary?.goldReturnPct || 0) >= 0 ? 'up' : 'down'}`}>
                      {(portfolioSummary?.goldReturnPct || 0) >= 0 ? '+' : ''}{fmt(portfolioSummary?.goldReturnPct, 2)}%
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

            {/* Grand Total Summary Row */}
            <tfoot>
              <tr style={{ background: '#090d16', borderTop: '2px solid rgba(0, 229, 255, 0.4)', fontWeight: 800 }}>
                <td style={{ color: 'var(--cyan)', letterSpacing: '0.4px' }}>
                  🎯 GENEL PORTFÖY TOPLAMI
                </td>
                <td>
                  <span className="nav-badge cyan" style={{ fontSize: 9 }}>{sortedHoldings.length} Varlık</span>
                </td>
                <td className="text-right mono text-muted">
                  --
                </td>
                <td className="text-right mono text-muted" style={{ fontWeight: 800 }}>
                  {sym}{fmt(isTRY ? portfolioSummary?.totalCostTRY : portfolioSummary?.totalCostUSD, 2)}
                </td>
                <td className="text-right mono text-muted">
                  --
                </td>
                <td className="text-right mono">
                  <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                    <span className={`change-pill ${(portfolioSummary?.dayPLPct || 0) >= 0 ? 'up' : 'down'}`}>
                      {(portfolioSummary?.dayPLPct || 0) >= 0 ? '▲ +' : '▼ '}{Math.abs(portfolioSummary?.dayPLPct || 0).toFixed(2)}%
                    </span>
                    <span style={{ fontSize: 10.5, fontWeight: 800, color: ((isTRY ? portfolioSummary?.dayPLTRY : portfolioSummary?.dayPLUSD) || 0) >= 0 ? 'var(--up)' : 'var(--down)' }}>
                      {((isTRY ? portfolioSummary?.dayPLTRY : portfolioSummary?.dayPLUSD) || 0) >= 0 ? '+' : ''}{sym}{fmt(isTRY ? portfolioSummary?.dayPLTRY : portfolioSummary?.dayPLUSD, 2)}
                    </span>
                  </div>
                </td>
                <td className="text-right mono text-cyan" style={{ fontSize: 13, fontWeight: 900 }}>
                  {sym}{fmt(isTRY ? portfolioSummary?.totalValTRY : portfolioSummary?.totalValUSD, 2)}
                </td>
                <td className="text-right mono" style={{ fontSize: 12, fontWeight: 800 }}>
                  <span className={((isTRY ? portfolioSummary?.unrealizedProfitTRY : portfolioSummary?.unrealizedProfitUSD) || 0) >= 0 ? 'text-up' : 'text-down'}>
                    {((isTRY ? portfolioSummary?.unrealizedProfitTRY : portfolioSummary?.unrealizedProfitUSD) || 0) >= 0 ? '+' : ''}{sym}{fmt(isTRY ? portfolioSummary?.unrealizedProfitTRY : portfolioSummary?.unrealizedProfitUSD, 2)}
                  </span>
                </td>
                <td className="text-right mono" style={{ fontSize: 12, fontWeight: 800 }}>
                  <span className={`return-badge ${(portfolioSummary?.unrealizedReturnPct || 0) >= 0 ? 'up' : 'down'}`}>
                    {(portfolioSummary?.unrealizedReturnPct || 0) >= 0 ? '+' : ''}{fmt(portfolioSummary?.unrealizedReturnPct, 2)}%
                  </span>
                </td>
                <td className="text-right">
                  <span className="nav-badge emerald" style={{ fontSize: 9.5 }}>Aktif Portföy</span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
