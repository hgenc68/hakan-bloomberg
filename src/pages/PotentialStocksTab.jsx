import React, { useState, useMemo } from 'react';
import { 
  Rocket, 
  Search, 
  Sparkles, 
  TrendingUp, 
  ShieldAlert, 
  CheckCircle2, 
  Zap, 
  Target, 
  Cpu, 
  Dna, 
  Activity, 
  Layers, 
  DollarSign, 
  ExternalLink, 
  Plus, 
  HelpCircle, 
  ChevronDown, 
  ChevronUp, 
  Award, 
  Flame, 
  SlidersHorizontal,
  Table,
  LayoutGrid,
  Info
} from 'lucide-react';
import potentialData from '../data/potentialStocksData.json';
import { useApp } from '../context/AppContext';

export default function PotentialStocksTab({ onOpenAddModal, onSelectStockForAnalysis }) {
  const { currentCurrency, usdtry } = useApp();
  const isTRY = currentCurrency === 'try';
  const sym = isTRY ? '₺' : '$';

  const fmt = (v, d = 2) => (Number(v) || 0).toLocaleString('tr-TR', { minimumFractionDigits: d, maximumFractionDigits: d });

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all'); // 'all', 'ai_hardware', 'semiconductor', 'biotech', 'photonics', 'quantum'
  const [selectedConviction, setSelectedConviction] = useState('all'); // 'all', 'MUTLAKA AL', 'GÜÇLÜ AL', 'KADEMELİ BİRİKTİR'
  const [viewMode, setViewMode] = useState('cards'); // 'cards' or 'table'
  const [expandedStock, setExpandedStock] = useState(null); // Ticker of expanded card in detail
  const [showMethodology, setShowMethodology] = useState(true);

  const stocks = potentialData.stocks || [];

  // Filter logic
  const filteredStocks = useMemo(() => {
    return stocks.filter(s => {
      // Search
      const q = search.toLowerCase().trim();
      const matchSearch = !q || 
        s.ticker.toLowerCase().includes(q) || 
        s.name.toLowerCase().includes(q) || 
        s.sector.toLowerCase().includes(q) || 
        s.thesis.toLowerCase().includes(q);

      // Category
      const matchCat = selectedCategory === 'all' || s.category === selectedCategory;

      // Conviction
      const matchConv = selectedConviction === 'all' || s.conviction === selectedConviction;

      return matchSearch && matchCat && matchConv;
    });
  }, [stocks, search, selectedCategory, selectedConviction]);

  const categories = [
    { id: 'all', label: 'Tüm Potansiyeller', count: stocks.length, icon: '🌐' },
    { id: 'ai_hardware', label: 'AI Altyapı & Soğutma', count: stocks.filter(s => s.category === 'ai_hardware').length, icon: '⚡' },
    { id: 'semiconductor', label: 'Çip & HBM Ekipmanı', count: stocks.filter(s => s.category === 'semiconductor').length, icon: '🔬' },
    { id: 'biotech', label: 'Biyoteknoloji & AI İlaç', count: stocks.filter(s => s.category === 'biotech').length, icon: '🧬' },
    { id: 'photonics', label: 'Silikon Fotonik & Işık', count: stocks.filter(s => s.category === 'photonics').length, icon: '💡' },
    { id: 'quantum', label: 'Kuantum Hesaplama', count: stocks.filter(s => s.category === 'quantum').length, icon: '🔮' }
  ];

  const getConvictionStyle = (conv) => {
    switch (conv) {
      case 'MUTLAKA AL':
        return {
          bg: 'rgba(239, 68, 68, 0.15)',
          color: '#f87171',
          border: 'rgba(239, 68, 68, 0.4)',
          icon: '🎯'
        };
      case 'GÜÇLÜ AL':
        return {
          bg: 'rgba(16, 185, 129, 0.15)',
          color: '#34d399',
          border: 'rgba(16, 185, 129, 0.4)',
          icon: '🔥'
        };
      case 'KADEMELİ BİRİKTİR':
      default:
        return {
          bg: 'rgba(0, 229, 255, 0.15)',
          color: '#38bdf8',
          border: 'rgba(0, 229, 255, 0.4)',
          icon: '⚡'
        };
    }
  };

  return (
    <div className="tab-pane-content" style={{ animation: 'fadeIn 0.25s ease' }}>
      {/* Workspace Header */}
      <div className="workspace-header" style={{ marginBottom: 16 }}>
        <div>
          <h2 className="workspace-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Rocket size={22} className="text-cyan" />
            <span>POTANSİYEL HİSSELER & ASİMETRİK BÜYÜME RADARI (MULTI-BAGGER HUNTER)</span>
          </h2>
          <p className="workspace-subtitle">
            Erken dönem Micron (MU) ve Nvidia (NVDA) benzeri kritik teknoloji darboğazlarını çözen, patlama öncesi yüksek asimetrik potansiyele (5x - 20x) sahip ABD hisseleri
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="nav-badge emerald" style={{ padding: '5px 12px', fontSize: 11 }}>
            ABD PİYASASI SEÇKİSİ
          </span>
          <button
            type="button"
            className="chip-btn"
            onClick={() => setShowMethodology(!showMethodology)}
            style={{ padding: '5px 10px', fontSize: 11 }}
          >
            <Info size={13} />
            <span>{showMethodology ? 'Kriterleri Gizle' : 'Seçim Kriterleri'}</span>
          </button>
        </div>
      </div>

      {/* Top Strategic KPI Banners */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 12, marginBottom: 16 }}>
        <div className="card" style={{ padding: 14, background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' }}>RADARDAKİ ŞİRKETLER</span>
            <span className="nav-badge cyan" style={{ fontSize: 9.5 }}>ABD Only</span>
          </div>
          <div className="mono" style={{ fontSize: 22, fontWeight: 800, color: '#f8fafc', margin: '4px 0' }}>
            {stocks.length} Yüksek Potansiyel
          </div>
          <div style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>
            4 Sektörel Megatrendde Filtrelenmiş
          </div>
        </div>

        <div className="card" style={{ padding: 14, background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--emerald)' }}>ORTALAMA YUKARI POTANSİYEL</span>
            <span className="nav-badge emerald" style={{ fontSize: 9.5 }}>Konsensüs</span>
          </div>
          <div className="mono" style={{ fontSize: 22, fontWeight: 800, color: 'var(--emerald)', margin: '4px 0' }}>
            +127.4%
          </div>
          <div style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>
            Hedef Fiyatlara Göre Ağırlıklı Ort.
          </div>
        </div>

        <div className="card" style={{ padding: 14, background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--gold)' }}>PİYASA DEĞERİ TATLI NOKTASI</span>
            <span className="nav-badge gold" style={{ fontSize: 9.5 }}>Mid/Small-Cap</span>
          </div>
          <div className="mono" style={{ fontSize: 22, fontWeight: 800, color: 'var(--gold)', margin: '4px 0' }}>
            $450M - $35B
          </div>
          <div style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>
            Multi-Bagger Doğum Alanı
          </div>
        </div>

        <div className="card" style={{ padding: 14, background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#38bdf8' }}>ÖNERİLEN ASİMETRİK TAHSİS</span>
            <span className="nav-badge cyan" style={{ fontSize: 9.5 }}>Venture Risk</span>
          </div>
          <div className="mono" style={{ fontSize: 22, fontWeight: 800, color: '#38bdf8', margin: '4px 0' }}>
            %1.0 - %3.0 / Hisse
          </div>
          <div style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>
            Düşük Risk, Devasa Çarpan Hedefi
          </div>
        </div>
      </div>

      {/* Methodology Collapsible Box */}
      {showMethodology && (
        <div className="card" style={{ padding: 16, background: '#090d16', border: '1px solid rgba(0, 229, 255, 0.25)', borderRadius: 8, marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <Sparkles size={16} className="text-cyan" />
            <span style={{ fontWeight: 800, fontSize: 12.5, color: 'var(--cyan)', letterSpacing: '0.04em' }}>
              KURUMSAL SEÇİM METODOLOJİSİ: HİSSELER LİSTEYE NASIL GİRER?
            </span>
          </div>
          <p style={{ fontSize: 11, color: '#cbd5e1', lineHeight: 1.5, marginBottom: 12 }}>
            Bu listedeki hisseler sıradan "ucuz F/K" hisseleri değildir. Amaç, <strong>Micron'un 2015-2016 veya Nvidia'nın 2017-2019</strong> dönemlerinde olduğu gibi; henüz genel kamuoyu ve fonlar tarafından tam keşfedilmemişken, teknolojik darboğazı çözen şirketleri yakalamaktır.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 10 }}>
            {potentialData.methodology.rules.map((rule, idx) => (
              <div key={idx} style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border)', borderRadius: 6, padding: '10px 12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <strong style={{ fontSize: 11, color: '#fff' }}>{rule.name}</strong>
                  <span className="nav-badge cyan" style={{ fontSize: 9 }}>{rule.condition}</span>
                </div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', lineHeight: 1.4 }}>
                  {rule.rationale}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter and Control Bar */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        flexWrap: 'wrap', 
        gap: 12, 
        marginBottom: 16,
        background: 'var(--bg-card)',
        padding: '12px 16px',
        borderRadius: 8,
        border: '1px solid var(--border)'
      }}>
        {/* Search Input */}
        <div className="search-box" style={{ width: 280 }}>
          <Search size={14} className="search-icon" />
          <input
            type="text"
            placeholder="🔍 Hisse, sektör, hikaye ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="search-input"
          />
        </div>

        {/* Conviction Filter Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700 }}>Tavsiye:</span>
          {[
            { id: 'all', label: 'Tümü' },
            { id: 'MUTLAKA AL', label: '🎯 MUTLAKA AL' },
            { id: 'GÜÇLÜ AL', label: '🔥 GÜÇLÜ AL' },
            { id: 'KADEMELİ BİRİKTİR', label: '⚡ KADEMELİ' }
          ].map(c => (
            <button
              key={c.id}
              type="button"
              className={`chip-btn ${selectedConviction === c.id ? 'active' : ''}`}
              onClick={() => setSelectedConviction(c.id)}
              style={{ padding: '4px 9px', fontSize: 11 }}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* View Mode Switcher: Cards vs Table */}
        <div style={{ display: 'inline-flex', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--border)', borderRadius: 5, padding: 2 }}>
          <button
            type="button"
            className={`chip-btn ${viewMode === 'cards' ? 'active' : ''}`}
            onClick={() => setViewMode('cards')}
            style={{ padding: '4px 10px', fontSize: 11 }}
            title="Detaylı Tez & Kart Görünümü"
          >
            <LayoutGrid size={13} />
            <span>Kartlar</span>
          </button>
          <button
            type="button"
            className={`chip-btn ${viewMode === 'table' ? 'active' : ''}`}
            onClick={() => setViewMode('table')}
            style={{ padding: '4px 10px', fontSize: 11 }}
            title="Kompakt Karşılaştırma Tablosu"
          >
            <Table size={13} />
            <span>Tablo</span>
          </button>
        </div>
      </div>

      {/* Sektörel Kategori Çipleri */}
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 10, marginBottom: 14 }}>
        {categories.map(cat => (
          <button
            key={cat.id}
            type="button"
            className={`chip-btn ${selectedCategory === cat.id ? 'active' : ''}`}
            onClick={() => setSelectedCategory(cat.id)}
            style={{ padding: '6px 14px', fontSize: 11.5, display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <span>{cat.icon}</span>
            <span>{cat.label}</span>
            <span style={{ fontSize: 10, opacity: 0.7 }}>({cat.count})</span>
          </button>
        ))}
      </div>

      {/* MAIN CONTENT AREA */}
      {viewMode === 'cards' ? (
        /* ================= CARDS VIEW ================= */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(440px, 1fr))', gap: 16 }}>
          {filteredStocks.map(stock => {
            const isExpanded = expandedStock === stock.ticker;
            const convStyle = getConvictionStyle(stock.conviction);

            return (
              <div 
                key={stock.ticker}
                className="card"
                style={{ 
                  background: 'var(--bg-card)', 
                  border: isExpanded ? '1px solid var(--cyan)' : '1px solid var(--border)', 
                  borderRadius: 8,
                  padding: 16,
                  transition: 'all 0.2s ease',
                  boxShadow: isExpanded ? '0 0 20px rgba(0, 229, 255, 0.1)' : 'none'
                }}
              >
                {/* Card Top Row: Ticker, Name, Price, Conviction */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ 
                      width: 44, 
                      height: 44, 
                      borderRadius: 8, 
                      background: 'rgba(255, 255, 255, 0.05)', 
                      border: '1px solid var(--border)', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      fontWeight: 900,
                      fontSize: 14,
                      color: 'var(--cyan)'
                    }}>
                      {stock.ticker}
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <strong className="mono" style={{ fontSize: 15, color: '#f8fafc' }}>
                          {stock.name}
                        </strong>
                        <span className="badge-type us" style={{ fontSize: 9 }}>
                          NASDAQ / NYSE
                        </span>
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        {stock.sector} • Piyasa Değeri: <strong className="mono" style={{ color: '#e2e8f0' }}>{stock.market_cap}</strong>
                      </div>
                    </div>
                  </div>

                  {/* Conviction Badge */}
                  <span 
                    className="nav-badge" 
                    style={{ 
                      background: convStyle.bg, 
                      color: convStyle.color, 
                      borderColor: convStyle.border,
                      borderWidth: 1,
                      borderStyle: 'solid',
                      padding: '4px 10px',
                      fontSize: 10.5,
                      fontWeight: 800,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4
                    }}
                  >
                    <span>{convStyle.icon}</span>
                    <span>{stock.conviction}</span>
                  </span>
                </div>

                {/* Price, Target & Upside Pill Row */}
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between', 
                  background: 'rgba(0,0,0,0.4)', 
                  border: '1px solid rgba(255,255,255,0.05)', 
                  padding: '8px 12px', 
                  borderRadius: 6, 
                  marginBottom: 12 
                }}>
                  <div>
                    <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Canlı Fiyat: </span>
                    <strong className="mono" style={{ fontSize: 14, color: '#fff' }}>${fmt(stock.price)}</strong>
                    {isTRY && (
                      <span className="mono text-muted" style={{ fontSize: 10.5, marginLeft: 4 }}>
                        (₺{fmt(stock.price * (usdtry || 49.03), 0)})
                      </span>
                    )}
                  </div>

                  <div style={{ textAlign: 'center' }}>
                    <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Konsensüs Hedef: </span>
                    <strong className="mono text-emerald" style={{ fontSize: 13 }}>${fmt(stock.target_price)}</strong>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span className="change-pill up" style={{ fontSize: 11, fontWeight: 800 }}>
                      ▲ {stock.potential_upside}
                    </span>
                    <span className="nav-badge gold" style={{ fontSize: 9.5 }}>
                      🎯 {stock.bagger_potential}
                    </span>
                  </div>
                </div>

                {/* NVDA / MU Analogy Highlight Callout */}
                <div style={{ 
                  background: 'rgba(245, 158, 11, 0.08)', 
                  borderLeft: '3px solid var(--gold)', 
                  padding: '8px 12px', 
                  borderRadius: '0 6px 6px 0', 
                  marginBottom: 12,
                  fontSize: 11,
                  color: '#fef3c7'
                }}>
                  <strong style={{ color: 'var(--gold)' }}>💡 Neden Yeni NVDA / MU Olabilir? </strong>
                  <span>{stock.analogy}</span>
                </div>

                {/* Core Thesis & Moat Preview */}
                <div style={{ fontSize: 11.5, color: '#cbd5e1', lineHeight: 1.45, marginBottom: 10 }}>
                  <strong>Giriş Tezi: </strong>
                  <span>{stock.thesis}</span>
                </div>

                <div style={{ fontSize: 11, color: '#94a3b8', lineHeight: 1.4, marginBottom: 12 }}>
                  <strong style={{ color: 'var(--cyan)' }}>Hendek (Moat): </strong>
                  <span>{stock.moat}</span>
                </div>

                {/* Key Financial Health Metrics Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginBottom: 14, background: 'rgba(255,255,255,0.02)', padding: 8, borderRadius: 6, border: '1px solid rgba(255,255,255,0.04)' }}>
                  <div>
                    <span style={{ fontSize: 9.5, color: 'var(--text-muted)', display: 'block' }}>Gelir Büyümesi</span>
                    <strong className="mono text-emerald" style={{ fontSize: 11.5 }}>{stock.financials.revenue_growth_yoy}</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: 9.5, color: 'var(--text-muted)', display: 'block' }}>Brüt Marj</span>
                    <strong className="mono" style={{ fontSize: 11.5, color: '#e2e8f0' }}>{stock.financials.gross_margin}</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: 9.5, color: 'var(--text-muted)', display: 'block' }}>Nakit & Borç</span>
                    <strong className="mono text-cyan" style={{ fontSize: 10.5 }}>{stock.financials.fcf_runway}</strong>
                  </div>
                </div>

                {/* Expanded Deep Details (Catalysts, Risks, Strategy) */}
                {isExpanded && (
                  <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12, marginTop: 10, animation: 'fadeIn 0.2s ease' }}>
                    {/* Catalysts */}
                    <div style={{ marginBottom: 10 }}>
                      <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--emerald)', display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
                        <CheckCircle2 size={13} />
                        <span>Kısa & Orta Vadeli Katalizörler (Tetikleyiciler)</span>
                      </span>
                      <ul style={{ paddingLeft: 18, fontSize: 10.5, color: '#cbd5e1', lineHeight: 1.45 }}>
                        {stock.catalysts.map((cat, idx) => (
                          <li key={idx} style={{ marginBottom: 3 }}>{cat}</li>
                        ))}
                      </ul>
                    </div>

                    {/* Risks */}
                    <div style={{ marginBottom: 12 }}>
                      <span style={{ fontSize: 11, fontWeight: 800, color: '#f87171', display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
                        <ShieldAlert size={13} />
                        <span>İzlenmesi Gereken Riskler</span>
                      </span>
                      <ul style={{ paddingLeft: 18, fontSize: 10.5, color: '#94a3b8', lineHeight: 1.45 }}>
                        {stock.risks.map((risk, idx) => (
                          <li key={idx} style={{ marginBottom: 3 }}>{risk}</li>
                        ))}
                      </ul>
                    </div>

                    {/* Recommended Allocation Callout */}
                    <div style={{ background: 'rgba(0, 229, 255, 0.08)', border: '1px solid rgba(0, 229, 255, 0.3)', borderRadius: 6, padding: '8px 12px', fontSize: 11, color: '#e2e8f0', marginBottom: 12 }}>
                      <strong style={{ color: 'var(--cyan)' }}>🎯 Pozisyon Boyutu & Giriş Stratejisi: </strong>
                      <span>{stock.recommended_alloc}</span>
                    </div>
                  </div>
                )}

                {/* Card Action Footer */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 10, marginTop: 6 }}>
                  <button
                    type="button"
                    onClick={() => setExpandedStock(isExpanded ? null : stock.ticker)}
                    style={{ fontSize: 11, color: 'var(--cyan)', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 700 }}
                  >
                    <span>{isExpanded ? 'Detayları Daralt' : 'Katalizörler & Riskleri Gör'}</span>
                    {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                  </button>

                  <div style={{ display: 'flex', gap: 8 }}>
                    {onSelectStockForAnalysis && (
                      <button
                        type="button"
                        className="chip-btn"
                        onClick={() => onSelectStockForAnalysis(stock.ticker)}
                        style={{ padding: '4px 10px', fontSize: 10.5 }}
                        title="Tekil Hisse DCF & Değerleme Sekmesinde İncele"
                      >
                        <ExternalLink size={12} />
                        <span>DCF Analizi</span>
                      </button>
                    )}

                    <button
                      type="button"
                      className="btn-primary"
                      onClick={() => onOpenAddModal && onOpenAddModal(stock.ticker)}
                      style={{ padding: '5px 12px', fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                    >
                      <Plus size={13} />
                      <span>Portföye Ekle</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ================= COMPACT TABLE VIEW ================= */
        <div className="card" style={{ padding: 16, background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <div className="table-responsive">
            <table className="terminal-table" style={{ fontSize: 11 }}>
              <thead>
                <tr>
                  <th>Hisse / Şirket</th>
                  <th>Sektör / Tema</th>
                  <th className="text-right">Piyasa Değeri</th>
                  <th className="text-right">Canlı Fiyat</th>
                  <th className="text-right">Hedef Fiyat</th>
                  <th className="text-right">Potansiyel</th>
                  <th className="text-center">Tavsiye</th>
                  <th className="text-center">Çarpan Hedefi</th>
                  <th>Büyüme & Marj</th>
                  <th className="text-center">Önerilen Tahsis</th>
                  <th className="text-right">Hızlı İşlem</th>
                </tr>
              </thead>
              <tbody>
                {filteredStocks.map(stock => {
                  const convStyle = getConvictionStyle(stock.conviction);

                  return (
                    <tr key={stock.ticker} className="table-row">
                      <td>
                        <strong className="mono" style={{ color: 'var(--cyan)', fontSize: 12 }}>
                          {stock.ticker}
                        </strong>
                        <span style={{ fontSize: 10, color: 'var(--text-muted)', display: 'block' }}>
                          {stock.name}
                        </span>
                      </td>

                      <td>
                        <span className="badge-type us" style={{ fontSize: 9.5 }}>
                          {stock.sector}
                        </span>
                      </td>

                      <td className="text-right mono font-bold" style={{ color: '#f8fafc' }}>
                        {stock.market_cap}
                      </td>

                      <td className="text-right mono font-bold">
                        ${fmt(stock.price)}
                      </td>

                      <td className="text-right mono font-bold text-emerald">
                        ${fmt(stock.target_price)}
                      </td>

                      <td className="text-right mono font-bold text-emerald">
                        {stock.potential_upside}
                      </td>

                      <td className="text-center">
                        <span 
                          className="nav-badge" 
                          style={{ 
                            background: convStyle.bg, 
                            color: convStyle.color, 
                            borderColor: convStyle.border,
                            fontSize: 9.5, 
                            padding: '2px 7px',
                            fontWeight: 800 
                          }}
                        >
                          {stock.conviction}
                        </span>
                      </td>

                      <td className="text-center">
                        <span className="nav-badge gold" style={{ fontSize: 9.5, padding: '2px 6px' }}>
                          {stock.bagger_potential}
                        </span>
                      </td>

                      <td style={{ fontSize: 10.5 }}>
                        <span className="mono text-emerald">{stock.financials.revenue_growth_yoy}</span>
                        <span style={{ color: 'var(--text-muted)', marginLeft: 4 }}>({stock.financials.gross_margin} Marj)</span>
                      </td>

                      <td className="text-center" style={{ fontSize: 10, color: 'var(--cyan)' }}>
                        {stock.recommended_alloc.split('(')[0]}
                      </td>

                      <td className="text-right">
                        <button
                          type="button"
                          className="btn-action-row"
                          onClick={() => onOpenAddModal && onOpenAddModal(stock.ticker)}
                          style={{ 
                            background: 'rgba(0, 229, 255, 0.12)', 
                            color: 'var(--cyan)', 
                            border: '1px solid rgba(0, 229, 255, 0.4)', 
                            padding: '3px 8px', 
                            borderRadius: 4, 
                            fontSize: 10 
                          }}
                        >
                          Ekle ➔
                        </button>
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
