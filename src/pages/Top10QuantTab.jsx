import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Trophy, Search, Filter, ShieldCheck, Flame, TrendingUp, Sparkles, ChevronRight } from 'lucide-react';
import quantData from '../data/quantLeaderboard.json';

export default function Top10QuantTab({ onSelectStock }) {
  const { setActiveTab, marketQuotes } = useApp();
  const [marketFilter, setMarketFilter] = useState('all'); // 'all', 'bist', 'us'
  const [styleFilter, setStyleFilter] = useState('all'); // 'all', 'value', 'growth'
  const [search, setSearch] = useState('');
  const [limit, setLimit] = useState(10); // 10, 25, 100

  const allItems = useMemo(() => {
    const bist = quantData.bist || [];
    const us = quantData.us || [];
    let combined = [];

    if (marketFilter === 'all') {
      combined = [...bist, ...us];
    } else if (marketFilter === 'bist') {
      combined = [...bist];
    } else {
      combined = [...us];
    }

    if (styleFilter !== 'all') {
      combined = combined.filter(item => {
        if (styleFilter === 'value') return (item.style_label || '').toLowerCase().includes('değer');
        if (styleFilter === 'growth') return (item.style_label || '').toLowerCase().includes('büyüme');
        return true;
      });
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      combined = combined.filter(item =>
        item.ticker.toLowerCase().includes(q) ||
        (item.style_label || '').toLowerCase().includes(q) ||
        (item.catalyst || '').toLowerCase().includes(q)
      );
    }

    combined.sort((a, b) => (b.quant_score || 0) - (a.quant_score || 0));
    return combined.slice(0, limit);
  }, [marketFilter, styleFilter, search, limit]);

  return (
    <div className="tab-pane-content" style={{ animation: 'fadeIn 0.25s ease' }}>
      {/* Workspace Header */}
      <div className="workspace-header" style={{ marginBottom: 16 }}>
        <div>
          <h2 className="workspace-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Trophy size={20} className="text-emerald" />
            <span>EN GÜÇLÜ HİSSELER & QUANT FIRSAT RADARI</span>
            <span className="nav-badge emerald" style={{ fontSize: 11, padding: '3px 8px' }}>
              Seeking Alpha 5-Pillar Modeli
            </span>
          </h2>
          <p className="workspace-subtitle">
            BIST 100 ve Wall Street piyasalarında temel kârlılık, büyüme ivmesi, iskonto çarpanları ve revizyon gücüne göre filtrelenmiş kurumsal fırsatlar.
          </p>
        </div>
      </div>

      {/* Filter and Action Bar */}
      <div className="card" style={{ padding: 14, background: '#090d16', border: '1px solid var(--border)', marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
          {/* Search Box */}
          <div className="search-box" style={{ width: 260 }}>
            <Search size={14} className="search-icon" />
            <input
              type="text"
              placeholder="🔍 Hisselerde ara (THYAO, NVDA...)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="search-input"
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            {/* Market Filter */}
            <div style={{ display: 'inline-flex', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, padding: 3, gap: 3 }}>
              <button
                type="button"
                className={`chip-btn ${marketFilter === 'all' ? 'active' : ''}`}
                onClick={() => setMarketFilter('all')}
                style={{ padding: '4px 10px', fontSize: 11 }}
              >
                🌐 Tümü
              </button>
              <button
                type="button"
                className={`chip-btn ${marketFilter === 'bist' ? 'active' : ''}`}
                onClick={() => setMarketFilter('bist')}
                style={{ padding: '4px 10px', fontSize: 11 }}
              >
                🇹🇷 BIST 100
              </button>
              <button
                type="button"
                className={`chip-btn ${marketFilter === 'us' ? 'active' : ''}`}
                onClick={() => setMarketFilter('us')}
                style={{ padding: '4px 10px', fontSize: 11 }}
              >
                🇺🇸 Wall Street
              </button>
            </div>

            {/* Style Filter */}
            <div style={{ display: 'inline-flex', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, padding: 3, gap: 3 }}>
              <button
                type="button"
                className={`chip-btn ${styleFilter === 'all' ? 'active' : ''}`}
                onClick={() => setStyleFilter('all')}
                style={{ padding: '4px 10px', fontSize: 11 }}
              >
                💎 Tüm Stiller
              </button>
              <button
                type="button"
                className={`chip-btn ${styleFilter === 'value' ? 'active' : ''}`}
                onClick={() => setStyleFilter('value')}
                style={{ padding: '4px 10px', fontSize: 11 }}
              >
                🛡️ Derin Değer
              </button>
              <button
                type="button"
                className={`chip-btn ${styleFilter === 'growth' ? 'active' : ''}`}
                onClick={() => setStyleFilter('growth')}
                style={{ padding: '4px 10px', fontSize: 11 }}
              >
                🚀 Büyüme & Tekel
              </button>
            </div>

            {/* Limit Filter */}
            <div style={{ display: 'inline-flex', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, padding: 3, gap: 3 }}>
              <button
                type="button"
                className={`chip-btn ${limit === 10 ? 'active' : ''}`}
                onClick={() => setLimit(10)}
                style={{ padding: '4px 10px', fontSize: 11 }}
              >
                İlk 10
              </button>
              <button
                type="button"
                className={`chip-btn ${limit === 25 ? 'active' : ''}`}
                onClick={() => setLimit(25)}
                style={{ padding: '4px 10px', fontSize: 11 }}
              >
                İlk 25
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Quant Leaderboard Table */}
      <div className="card table-card" style={{ padding: 18, background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <div className="table-responsive">
          <table className="terminal-table" style={{ fontSize: 11.5 }}>
            <thead>
              <tr>
                <th style={{ width: 45, textAlign: 'center' }}>Sıra</th>
                <th style={{ width: 140 }}>Varlık</th>
                <th style={{ width: 90, textAlign: 'center' }}>Piyasa</th>
                <th style={{ width: 130 }}>Yatırım Stili</th>
                <th style={{ width: 90, textAlign: 'right' }}>Fiyat</th>
                <th style={{ textAlign: 'center', width: 220 }}>5 Sütun Faktör Notları</th>
                <th style={{ width: 85, textAlign: 'center' }}>Quant Skor</th>
                <th style={{ width: 100, textAlign: 'center' }}>Sinyal</th>
                <th>Yükseliş Katalizörü & Temel Bilanço Yapısı</th>
                <th style={{ width: 90, textAlign: 'center' }}>İşlem</th>
              </tr>
            </thead>
            <tbody>
              {allItems.map((item, idx) => {
                const isBist = item.market === 'BIST';
                const p = item.pillars || {};
                const livePrice = Number(
                  marketQuotes[item.ticker]?.price || 
                  marketQuotes[`${item.ticker}.IS`]?.price || 
                  item.price || 
                  0
                );

                return (
                  <tr key={`${item.ticker}-${idx}`} className="table-row">
                    <td style={{ textAlign: 'center', fontWeight: 800, color: idx < 3 ? 'var(--gold)' : 'var(--text-muted)' }}>
                      #{idx + 1}
                    </td>
                    <td>
                      <div className="ticker-cell">
                        <strong className="ticker-symbol mono" style={{ color: 'var(--cyan)' }}>
                          {item.ticker}
                        </strong>
                      </div>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span className={`nav-badge ${isBist ? 'amber' : 'cyan'}`} style={{ fontSize: 9.5 }}>
                        {isBist ? 'BIST 100' : 'U.S.'}
                      </span>
                    </td>
                    <td>
                      <span className="nav-badge emerald" style={{ fontSize: 9.5 }}>
                        {item.style_label || 'Derin Değer'}
                      </span>
                    </td>
                    <td className="text-right mono font-medium">
                      {isBist ? '₺' : '$'}{livePrice.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    {/* 5-Pillar Scores */}
                    <td>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 4, fontSize: 8.5, textAlign: 'center' }}>
                        <div style={{ background: 'rgba(255,255,255,0.03)', padding: '2px', borderRadius: 2 }}>
                          <div style={{ color: 'var(--text-muted)' }}>Değer</div>
                          <strong style={{ color: '#10b981' }}>{p.value || 88}</strong>
                        </div>
                        <div style={{ background: 'rgba(255,255,255,0.03)', padding: '2px', borderRadius: 2 }}>
                          <div style={{ color: 'var(--text-muted)' }}>Büyüme</div>
                          <strong style={{ color: '#00e5ff' }}>{p.growth || 85}</strong>
                        </div>
                        <div style={{ background: 'rgba(255,255,255,0.03)', padding: '2px', borderRadius: 2 }}>
                          <div style={{ color: 'var(--text-muted)' }}>Kâr</div>
                          <strong style={{ color: '#10b981' }}>{p.profitability || 92}</strong>
                        </div>
                        <div style={{ background: 'rgba(255,255,255,0.03)', padding: '2px', borderRadius: 2 }}>
                          <div style={{ color: 'var(--text-muted)' }}>Mom</div>
                          <strong style={{ color: '#a855f7' }}>{p.momentum || 86}</strong>
                        </div>
                        <div style={{ background: 'rgba(255,255,255,0.03)', padding: '2px', borderRadius: 2 }}>
                          <div style={{ color: 'var(--text-muted)' }}>Rev</div>
                          <strong style={{ color: '#eab308' }}>{p.revisions || 84}</strong>
                        </div>
                      </div>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 13, fontWeight: 900, color: 'var(--emerald)', fontFamily: 'var(--font-mono)' }}>
                        {item.quant_score || 85.0}
                      </div>
                      <div style={{ fontSize: 9.5, color: 'var(--text-muted)' }}>Not: {item.grade || 'A'}</div>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span className="nav-badge emerald" style={{ fontSize: 10, padding: '2px 8px', fontWeight: 800 }}>
                        {item.signal || 'GÜÇLÜ AL'}
                      </span>
                    </td>
                    <td style={{ fontSize: 11, color: '#cbd5e1', lineHeight: 1.4 }}>
                      {item.catalyst || 'Yüksek kârlılık & güçlü bilanço + MA200 üzerinde boğa trendi'}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        type="button"
                        className="btn-action-row"
                        style={{ background: 'rgba(0, 229, 255, 0.1)', color: 'var(--cyan)', border: '1px solid var(--cyan)', padding: '4px 8px', borderRadius: 4, fontSize: 10 }}
                        onClick={() => {
                          if (onSelectStock) onSelectStock(item.ticker);
                          setActiveTab('single_stock');
                        }}
                      >
                        Analiz Et ➔
                      </button>
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
