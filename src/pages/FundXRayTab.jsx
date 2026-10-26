import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import fundsData from '../data/fundsData.json';
import { 
  Layers, 
  Search, 
  ShieldAlert, 
  ShieldCheck, 
  TrendingUp, 
  ArrowRightLeft, 
  Sparkles, 
  AlertTriangle, 
  ExternalLink, 
  BarChart3, 
  PieChart, 
  Info, 
  CheckCircle2, 
  ChevronRight,
  Flame,
  Award
} from 'lucide-react';

export default function FundXRayTab({ onSelectStock }) {
  const { portfolioSummary, currentCurrency } = useApp();
  const [selectedFundCode, setSelectedFundCode] = useState('AFT');
  const [activeCategory, setActiveCategory] = useState('all'); // 'all', 'tefas', 'bes', 'etf'
  const [viewMode, setViewMode] = useState('xray'); // 'xray' (single fund x-ray) or 'duel' (fund comparison)
  const [duelFund1, setDuelFund1] = useState('AFT');
  const [duelFund2, setDuelFund2] = useState('QQQ');
  const [searchQuery, setSearchQuery] = useState('');

  const allFunds = fundsData.funds || {};
  const fundList = Object.values(allFunds);

  // Filtered funds by category and search
  const filteredFunds = useMemo(() => {
    return fundList.filter(f => {
      const matchCat = activeCategory === 'all' || f.category === activeCategory;
      const matchSearch = searchQuery.trim() === '' || 
        f.code.toLowerCase().includes(searchQuery.toLowerCase()) || 
        f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.theme.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [fundList, activeCategory, searchQuery]);

  const activeFund = allFunds[selectedFundCode] || fundList[0];

  // User's portfolio holdings for Overlap Analysis
  const userHoldings = useMemo(() => {
    return (portfolioSummary?.enrichedHoldings || []).map(h => ({
      ticker: h.ticker.toUpperCase().replace('.IS', ''),
      name: h.name || h.ticker,
      weightPct: Number(h.weight) || 0,
      valTRY: Number(h.valTRY) || 0
    }));
  }, [portfolioSummary?.enrichedHoldings]);

  // Overlap calculation between activeFund and user's portfolio holdings
  const portfolioOverlap = useMemo(() => {
    if (!activeFund?.holdings || userHoldings.length === 0) return { matched: [], totalDirectWeight: 0, highestRisk: null };

    const matched = [];
    let totalDirectWeight = 0;

    activeFund.holdings.forEach(fh => {
      const uMatch = userHoldings.find(uh => uh.ticker === fh.ticker);
      if (uMatch) {
        totalDirectWeight += uMatch.weightPct;
        matched.push({
          ticker: fh.ticker,
          name: fh.name,
          fundWeight: fh.pct,
          userWeight: uMatch.weightPct,
          ring: fh.ring,
          sector: fh.sector
        });
      }
    });

    // Sort matched by direct user weight
    matched.sort((a, b) => b.userWeight - a.userWeight);

    let highestRisk = null;
    if (matched.length > 0) {
      const top = matched[0];
      if (top.userWeight >= 15 || (top.userWeight >= 10 && top.fundWeight >= 12)) {
        highestRisk = {
          ticker: top.ticker,
          name: top.name,
          severity: 'high',
          msg: `Portföyünüzde doğrudan %${top.userWeight.toFixed(1)} ${top.ticker} bulunurken, ${activeFund.code} fonunun da %${top.fundWeight.toFixed(1)}'i bu şirkettedir. Gerçek maruziyetiniz tehlikeli seviyede tek hisseye odaklanmaktadır.`
        };
      } else {
        highestRisk = {
          ticker: top.ticker,
          name: top.name,
          severity: 'moderate',
          msg: `Portföyünüzdeki ${top.ticker} (%${top.userWeight.toFixed(1)}) ve ${activeFund.code} içindeki pay (%${top.fundWeight.toFixed(1)}) orta düzeyde örtüşme yaratmaktadır.`
        };
      }
    }

    return { matched, totalDirectWeight, highestRisk };
  }, [activeFund, userHoldings]);

  // Duel (Head-to-head) Overlap Mathematics
  const duelAnalysis = useMemo(() => {
    const f1 = allFunds[duelFund1];
    const f2 = allFunds[duelFund2];
    if (!f1 || !f2) return null;

    let overlapScore = 0;
    const commonHoldings = [];
    const onlyInF1 = [];
    const onlyInF2 = [];

    const f2Map = new Map((f2.holdings || []).map(h => [h.ticker, h]));

    (f1.holdings || []).forEach(h1 => {
      const h2 = f2Map.get(h1.ticker);
      if (h2) {
        const commonWeight = Math.min(h1.pct, h2.pct);
        overlapScore += commonWeight;
        commonHoldings.push({
          ticker: h1.ticker,
          name: h1.name,
          pct1: h1.pct,
          pct2: h2.pct,
          commonWeight,
          sector: h1.sector,
          ring: h1.ring
        });
      } else {
        onlyInF1.push(h1);
      }
    });

    const f1Map = new Map((f1.holdings || []).map(h => [h.ticker, h]));
    (f2.holdings || []).forEach(h2 => {
      if (!f1Map.has(h2.ticker)) {
        onlyInF2.push(h2);
      }
    });

    commonHoldings.sort((a, b) => (b.pct1 + b.pct2) - (a.pct1 + a.pct2));

    return {
      f1,
      f2,
      overlapScore: Number(overlapScore.toFixed(1)),
      commonHoldings,
      onlyInF1,
      onlyInF2
    };
  }, [duelFund1, duelFund2, allFunds]);

  return (
    <div className="tab-pane-content" style={{ animation: 'fadeIn 0.25s ease' }}>
      
      {/* 🧭 Top Hub: Category Filter, View Switcher & Title */}
      <div className="card" style={{ padding: '14px 18px', marginBottom: 14, background: '#080c16', border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          
          {/* Title & Badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: 'rgba(251, 191, 36, 0.12)', border: '1px solid rgba(251, 191, 36, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Layers size={20} className="text-gold" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 900, color: '#f8fafc', letterSpacing: '0.4px' }}>FON & ETF RÖNTGENİ</span>
                <span style={{ fontSize: 9.5, fontWeight: 800, padding: '2px 7px', borderRadius: 4, background: 'rgba(0, 229, 255, 0.12)', color: 'var(--cyan)', border: '1px solid rgba(0, 229, 255, 0.25)' }}>
                  LOOK-THROUGH & ÇAKIŞMA
                </span>
                <span style={{ fontSize: 9, fontWeight: 800, padding: '2px 6px', borderRadius: 4, background: 'rgba(16, 185, 129, 0.12)', color: 'var(--emerald)', border: '1px solid rgba(16, 185, 129, 0.25)' }}>
                  FINVEST STANDARDI
                </span>
              </div>
              <div style={{ fontSize: 10.5, color: 'var(--text-muted)', marginTop: 2 }}>
                TEFAS, BES ve küresel ETF'lerin içindeki hisseleri, 3-Halka borçluluk dağılımını ve portföyünüzdeki gizli konsantrasyon riskini analiz edin.
              </div>
            </div>
          </div>

          {/* View Mode Switcher (X-Ray vs Duel) */}
          <div style={{ display: 'inline-flex', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, padding: 3, gap: 4 }}>
            <button
              type="button"
              className={`chip-btn ${viewMode === 'xray' ? 'active' : ''}`}
              onClick={() => setViewMode('xray')}
              style={{ fontSize: 11, padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 5 }}
            >
              <PieChart size={13} />
              <span>🔬 Tekil Fon Röntgeni</span>
            </button>
            <button
              type="button"
              className={`chip-btn ${viewMode === 'duel' ? 'active' : ''}`}
              onClick={() => setViewMode('duel')}
              style={{ fontSize: 11, padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 5 }}
            >
              <ArrowRightLeft size={13} />
              <span>⚔️ Fon Düellosu (Kıyaslama)</span>
            </button>
          </div>
        </div>

        {/* Category Pills & Quick Search */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.06)', flexWrap: 'wrap', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 10, color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>KATEGORİ:</span>
            <button 
              type="button" 
              className={`chip-btn ${activeCategory === 'all' ? 'active' : ''}`}
              onClick={() => setActiveCategory('all')}
              style={{ fontSize: 10, padding: '2px 8px' }}
            >
              Tümü ({fundList.length})
            </button>
            <button 
              type="button" 
              className={`chip-btn ${activeCategory === 'tefas' ? 'active' : ''}`}
              onClick={() => setActiveCategory('tefas')}
              style={{ fontSize: 10, padding: '2px 8px' }}
            >
              🌐 TEFAS Teknoloji / Yabancı
            </button>
            <button 
              type="button" 
              className={`chip-btn ${activeCategory === 'bes' ? 'active' : ''}`}
              onClick={() => setActiveCategory('bes')}
              style={{ fontSize: 10, padding: '2px 8px', color: 'var(--gold)', borderColor: activeCategory === 'bes' ? 'var(--gold)' : 'rgba(251,191,36,0.3)' }}
            >
              🛡️ BES Portföyüm ({fundList.filter(f => f.category === 'bes').length})
            </button>
            <button 
              type="button" 
              className={`chip-btn ${activeCategory === 'etf' ? 'active' : ''}`}
              onClick={() => setActiveCategory('etf')}
              style={{ fontSize: 10, padding: '2px 8px' }}
            >
              🇺🇸 ABD & Global ETF'ler
            </button>
          </div>

          {/* Search Input */}
          <div style={{ position: 'relative', width: 200 }}>
            <Search size={13} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
            <input
              type="text"
              placeholder="Fon veya hisse ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                background: '#040711',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 5,
                padding: '4px 8px 4px 26px',
                fontSize: 10.5,
                color: '#f8fafc',
                outline: 'none'
              }}
            />
          </div>
        </div>

        {/* Quick Fund Chips Carousel */}
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2, marginTop: 8, scrollbarWidth: 'none' }}>
          {filteredFunds.map(f => {
            const isSel = selectedFundCode === f.code;
            const isBes = f.category === 'bes';
            return (
              <button
                key={f.code}
                type="button"
                onClick={() => setSelectedFundCode(f.code)}
                style={{
                  background: isSel ? 'rgba(0, 229, 255, 0.15)' : '#070a13',
                  border: `1px solid ${isSel ? 'var(--cyan)' : 'rgba(255,255,255,0.08)'}`,
                  color: isSel ? 'var(--cyan)' : '#cbd5e1',
                  borderRadius: 6,
                  padding: '4px 10px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  cursor: 'pointer',
                  flexShrink: 0,
                  fontSize: 10.5,
                  fontWeight: 700
                }}
              >
                <span>{isBes ? '🛡️' : (f.category === 'etf' ? '🇺🇸' : '🌐')}</span>
                <span>{f.code}</span>
                <span style={{ fontSize: 9, color: f.return_1y >= 0 ? 'var(--emerald)' : 'var(--red)', fontFamily: 'var(--font-mono)' }}>
                  +{f.return_1y}%
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODE 1: SINGLE FUND X-RAY (TEKİL FON RÖNTGENİ & ÇAKIŞMA ANALİZİ)          */}
      {/* ========================================================================= */}
      {viewMode === 'xray' && activeFund && (
        <>
          {/* Top 2 Columns: Fund Passport & Portfolio Overlap Detector */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 14, marginBottom: 14 }}>
            
            {/* Left Card: Fund Passport & 3-Ring Breakdown */}
            <div className="card" style={{ padding: 18, background: '#080c16', border: '1px solid var(--border)' }}>
              
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 18, fontWeight: 900, color: 'var(--cyan)', fontFamily: 'var(--font-mono)' }}>{activeFund.code}</span>
                    <span style={{ fontSize: 9.5, padding: '2px 7px', borderRadius: 4, background: 'rgba(255,255,255,0.06)', color: '#cbd5e1', fontWeight: 700 }}>
                      {activeFund.manager}
                    </span>
                    <span style={{ fontSize: 9.5, padding: '2px 7px', borderRadius: 4, background: 'rgba(251, 191, 36, 0.1)', color: 'var(--gold)', fontWeight: 800 }}>
                      {activeFund.category_label}
                    </span>
                  </div>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: '#f8fafc', marginTop: 4 }}>
                    {activeFund.name}
                  </div>
                  <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>
                    🎯 Tema: <strong style={{ color: '#cbd5e1' }}>{activeFund.theme}</strong>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 9, color: '#64748b', fontWeight: 700 }}>1 YILLIK GETİRİ</div>
                  <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--emerald)', fontFamily: 'var(--font-mono)' }}>
                    +{activeFund.return_1y.toFixed(1)}%
                  </div>
                  <div style={{ fontSize: 9, color: '#94a3b8' }}>3Y: +%{activeFund.return_3y.toFixed(0)}</div>
                </div>
              </div>

              {/* 3 Metrics Row: Expense Ratio, Risk Level, Currency */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, background: '#040711', padding: '8px 10px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.05)', marginBottom: 12 }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 8.5, color: '#64748b', fontWeight: 700 }}>GİDER ORANI</div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: '#f8fafc', fontFamily: 'var(--font-mono)' }}>
                    %{activeFund.expense_ratio.toFixed(2)}
                  </div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 8.5, color: '#64748b', fontWeight: 700 }}>RİSK SEVİYESİ</div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: activeFund.risk_level >= 6 ? 'var(--red)' : 'var(--amber)', fontFamily: 'var(--font-mono)' }}>
                    {activeFund.risk_level} / 7
                  </div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 8.5, color: '#64748b', fontWeight: 700 }}>PARA BİRİMİ</div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--gold)', fontFamily: 'var(--font-mono)' }}>
                    {activeFund.currency}
                  </div>
                </div>
              </div>

              {/* Finvest 3-Ring Breakdown Bar */}
              <div style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <span style={{ fontSize: 9.5, fontWeight: 800, color: '#cbd5e1' }}>FİNVEST 3-HALKA BİLANÇO DAĞILIMI</span>
                  <span style={{ fontSize: 9, color: '#64748b' }}>Fon İçi Sermaye Gücü</span>
                </div>
                <div style={{ height: 12, borderRadius: 4, display: 'flex', overflow: 'hidden', background: '#040711', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div 
                    style={{ width: `${activeFund.ring_distribution.ring1}%`, background: '#10b981' }} 
                    title={`1. Halka (Nakit Titanları): %${activeFund.ring_distribution.ring1}`}
                  />
                  <div 
                    style={{ width: `${activeFund.ring_distribution.ring2}%`, background: '#f59e0b' }} 
                    title={`2. Halka (Kritik Tedarikçiler): %${activeFund.ring_distribution.ring2}`}
                  />
                  <div 
                    style={{ width: `${activeFund.ring_distribution.ring3}%`, background: '#ef4444' }} 
                    title={`3. Halka (Borçla Büyüyenler): %${activeFund.ring_distribution.ring3}`}
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 9, color: '#94a3b8' }}>
                  <span style={{ color: '#10b981', fontWeight: 700 }}>🟢 1. Halka: %{activeFund.ring_distribution.ring1} (Nakit Kralları)</span>
                  <span style={{ color: '#f59e0b', fontWeight: 700 }}>🟡 2. Halka: %{activeFund.ring_distribution.ring2} (Tedarikçi)</span>
                  <span style={{ color: '#ef4444', fontWeight: 700 }}>🔴 3. Halka: %{activeFund.ring_distribution.ring3} (Kaldıraç)</span>
                </div>
              </div>

              {/* Finvest Strategic Insight Box */}
              <div style={{ background: 'rgba(251, 191, 36, 0.05)', border: '1px solid rgba(251, 191, 36, 0.2)', borderRadius: 6, padding: '9px 12px', fontSize: 10.5, lineHeight: 1.5, color: '#e2e8f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2, fontWeight: 800, color: 'var(--gold)' }}>
                  <Sparkles size={13} />
                  <span>FİNVEST VİDEO ANALİZİ & RÖNTGENİ</span>
                </div>
                <div>{activeFund.finvest_insight}</div>
              </div>
            </div>

            {/* Right Card: Portfolio Overlap & Concentration Warning */}
            <div className="card" style={{ padding: 18, background: '#080c16', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 6, background: portfolioOverlap.matched.length > 0 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {portfolioOverlap.matched.length > 0 ? <ShieldAlert size={16} className="text-red" /> : <ShieldCheck size={16} className="text-emerald" />}
                  </div>
                  <div>
                    <div style={{ fontSize: 12.5, fontWeight: 800, color: '#f8fafc' }}>PORTFÖY GİZLİ ÇAKIŞMA RADARI</div>
                    <div style={{ fontSize: 9.5, color: '#94a3b8' }}>Doğrudan hisse paylarınız ile fon içi varlıkların bileşik maruziyeti</div>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <span style={{
                    fontSize: 9.5,
                    fontWeight: 800,
                    padding: '3px 8px',
                    borderRadius: 4,
                    background: portfolioOverlap.matched.length > 0 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                    color: portfolioOverlap.matched.length > 0 ? 'var(--red)' : 'var(--emerald)',
                    border: `1px solid ${portfolioOverlap.matched.length > 0 ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`
                  }}>
                    {portfolioOverlap.matched.length > 0 ? `${portfolioOverlap.matched.length} HİSSE ÇAKIŞIYOR` : 'ÇAKIŞMA YOK'}
                  </span>
                </div>
              </div>

              {/* Overlap Summary Alert */}
              {portfolioOverlap.highestRisk && (
                <div style={{
                  background: portfolioOverlap.highestRisk.severity === 'high' ? 'rgba(239, 68, 68, 0.08)' : 'rgba(245, 158, 11, 0.08)',
                  border: `1px solid ${portfolioOverlap.highestRisk.severity === 'high' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
                  borderRadius: 6,
                  padding: '9px 12px',
                  marginBottom: 12,
                  fontSize: 10.5,
                  lineHeight: 1.5,
                  color: '#cbd5e1'
                }}>
                  <div style={{ fontWeight: 800, color: portfolioOverlap.highestRisk.severity === 'high' ? 'var(--red)' : 'var(--amber)', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                    <AlertTriangle size={13} />
                    <span>AŞIRI KONSANTRASYON UYARISI: {portfolioOverlap.highestRisk.ticker}</span>
                  </div>
                  <div>{portfolioOverlap.highestRisk.msg}</div>
                </div>
              )}

              {/* Overlapping Holdings Table */}
              {portfolioOverlap.matched.length > 0 ? (
                <div>
                  <div style={{ fontSize: 9.5, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', marginBottom: 6 }}>
                    BİLEŞİK MARUZİYET DETAYLARI
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {portfolioOverlap.matched.map(m => (
                      <div 
                        key={m.ticker}
                        style={{
                          background: '#040711',
                          border: '1px solid rgba(255,255,255,0.06)',
                          borderRadius: 6,
                          padding: '6px 10px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--cyan)', fontFamily: 'var(--font-mono)' }}>{m.ticker}</span>
                          <span style={{ fontSize: 9.5, color: '#94a3b8' }}>{m.name}</span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: 8, color: '#64748b' }}>PORTFÖYÜNÜZ</div>
                            <div style={{ fontSize: 10.5, fontWeight: 800, color: '#f8fafc', fontFamily: 'var(--font-mono)' }}>%{m.userWeight.toFixed(1)}</div>
                          </div>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: 8, color: '#64748b' }}>FON İÇİ PAY</div>
                            <div style={{ fontSize: 10.5, fontWeight: 800, color: 'var(--gold)', fontFamily: 'var(--font-mono)' }}>%{m.fundWeight.toFixed(1)}</div>
                          </div>
                          <button
                            type="button"
                            className="chip-btn"
                            onClick={() => onSelectStock && onSelectStock(m.ticker)}
                            style={{ fontSize: 9, padding: '2px 6px' }}
                            title="Tekil Hisse sekmesinde DCF ve bilanço röntgenini aç"
                          >
                            İncele
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div style={{ padding: '24px 12px', textAlign: 'center', color: '#64748b', fontSize: 11 }}>
                  <CheckCircle2 size={24} style={{ color: 'var(--emerald)', margin: '0 auto 8px auto', display: 'block' }} />
                  <div>Kendi portföyünüzdeki hisseler ile bu fon arasında doğrudan çakışma bulunmuyor.</div>
                  <div style={{ fontSize: 9.5, marginTop: 4 }}>Bu fon portföyünüze saf çeşitlendirme katacaktır.</div>
                </div>
              )}
            </div>
          </div>

          {/* Bottom Table: Full Look-Through Holdings List */}
          <div className="card" style={{ padding: 18, background: '#080c16', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <BarChart3 size={16} className="text-cyan" />
                <span style={{ fontSize: 12.5, fontWeight: 800, color: '#f8fafc' }}>
                  {activeFund.code} İÇİNDEKİ İLK 10 VARLIK RÖNTGENİ
                </span>
                <span style={{ fontSize: 9.5, color: '#94a3b8' }}>
                  (Toplam Ağırlık: %{activeFund.holdings.reduce((acc, h) => acc + h.pct, 0).toFixed(1)})
                </span>
              </div>
              <div style={{ fontSize: 10, color: '#64748b' }}>
                Hisse koduna tıklayarak doğrudan <strong style={{ color: 'var(--cyan)' }}>Tekil Hisse DCF</strong> analizine geçebilirsiniz.
              </div>
            </div>

            <div className="table-responsive">
              <table className="terminal-table" style={{ width: '100%', fontSize: 11 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', color: '#64748b', fontSize: 9.5, textTransform: 'uppercase' }}>
                    <th style={{ textAlign: 'left', padding: '6px 8px' }}>#</th>
                    <th style={{ textAlign: 'left', padding: '6px 8px' }}>HİSSE / VARLIK</th>
                    <th style={{ textAlign: 'left', padding: '6px 8px' }}>SEKTÖR</th>
                    <th style={{ textAlign: 'center', padding: '6px 8px' }}>HALKA (FİNVEST)</th>
                    <th style={{ textAlign: 'right', padding: '6px 8px' }}>FON İÇİ AĞIRLIK</th>
                    <th style={{ textAlign: 'right', padding: '6px 8px' }}>AĞIRLIK ÇUBUĞU</th>
                    <th style={{ textAlign: 'center', padding: '6px 8px' }}>EYLEM</th>
                  </tr>
                </thead>
                <tbody>
                  {activeFund.holdings.map((h, idx) => {
                    const ringColor = h.ring === 1 ? '#10b981' : (h.ring === 2 ? '#f59e0b' : '#ef4444');
                    const ringBadge = h.ring === 1 ? '1. Halka (Nakit)' : (h.ring === 2 ? '2. Halka (Tedarikçi)' : '3. Halka (Borçlu)');
                    const isUserHolding = userHoldings.some(uh => uh.ticker === h.ticker);

                    return (
                      <tr 
                        key={h.ticker}
                        style={{
                          borderBottom: '1px solid rgba(255,255,255,0.03)',
                          background: isUserHolding ? 'rgba(0, 229, 255, 0.03)' : 'transparent'
                        }}
                      >
                        <td style={{ padding: '8px', color: '#64748b', fontFamily: 'var(--font-mono)' }}>{idx + 1}</td>
                        <td style={{ padding: '8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontWeight: 800, color: '#f8fafc', fontFamily: 'var(--font-mono)' }}>{h.ticker}</span>
                            <span style={{ color: '#94a3b8', fontSize: 10 }}>{h.name}</span>
                            {isUserHolding && (
                              <span style={{ fontSize: 8.5, padding: '1px 5px', borderRadius: 3, background: 'rgba(0, 229, 255, 0.15)', color: 'var(--cyan)', fontWeight: 800 }}>
                                PORTFÖYÜNÜZDE VAR
                              </span>
                            )}
                          </div>
                        </td>
                        <td style={{ padding: '8px', color: '#cbd5e1' }}>{h.sector}</td>
                        <td style={{ padding: '8px', textAlign: 'center' }}>
                          <span style={{
                            fontSize: 9,
                            fontWeight: 800,
                            padding: '2px 6px',
                            borderRadius: 4,
                            background: `${ringColor}22`,
                            color: ringColor,
                            border: `1px solid ${ringColor}44`
                          }}>
                            {ringBadge}
                          </span>
                        </td>
                        <td style={{ padding: '8px', textAlign: 'right', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--gold)' }}>
                          %{h.pct.toFixed(1)}
                        </td>
                        <td style={{ padding: '8px', width: 140 }}>
                          <div style={{ height: 6, background: '#040711', borderRadius: 3, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)' }}>
                            <div style={{ height: '100%', width: `${Math.min(100, h.pct * 4)}%`, background: h.pct >= 15 ? 'var(--red)' : (h.pct >= 8 ? 'var(--gold)' : 'var(--cyan)') }} />
                          </div>
                        </td>
                        <td style={{ padding: '8px', textAlign: 'center' }}>
                          <button
                            type="button"
                            className="chip-btn"
                            onClick={() => onSelectStock && onSelectStock(h.ticker)}
                            style={{ fontSize: 9, padding: '2px 8px' }}
                            title={`${h.ticker} için Tekil Hisse DCF ve Bilanço Röntgenini Aç`}
                          >
                            Röntgen Aç ➔
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ========================================================================= */}
      {/* MODE 2: FUND DUEL (FON DÜELLOSU & ÇAKIŞMA ORANI)                          */}
      {/* ========================================================================= */}
      {viewMode === 'duel' && duelAnalysis && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          
          {/* Duel Control Card */}
          <div className="card" style={{ padding: 18, background: '#080c16', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 14 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <ArrowRightLeft size={18} className="text-cyan" />
                  <span style={{ fontSize: 13.5, fontWeight: 900, color: '#f8fafc' }}>FON & ETF KIYASLAMA DÜELLOSU</span>
                </div>
                <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>
                  İki fonu yan yana koyarak içlerindeki ortak hisseleri, çakışma oranını ve stratejik farkları karşılaştırın.
                </div>
              </div>

              {/* Overlap Score Badge */}
              <div style={{
                background: '#040711',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 8,
                padding: '8px 14px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: 8.5, color: '#64748b', fontWeight: 800 }}>ORTAK ÇAKIŞMA ORANI</div>
                <div style={{ fontSize: 18, fontWeight: 900, fontFamily: 'var(--font-mono)', color: duelAnalysis.overlapScore > 50 ? 'var(--red)' : (duelAnalysis.overlapScore > 25 ? 'var(--amber)' : 'var(--emerald)') }}>
                  %{duelAnalysis.overlapScore}
                </div>
                <div style={{ fontSize: 8.5, color: '#94a3b8' }}>
                  {duelAnalysis.overlapScore > 50 ? 'Yüksek Benzerlik (Aynı Hisse)' : (duelAnalysis.overlapScore > 25 ? 'Orta Benzerlik' : 'Güçlü Çeşitlendirme')}
                </div>
              </div>
            </div>

            {/* Duel Selectors */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 12, alignItems: 'center' }}>
              
              {/* Fund 1 Selector */}
              <div style={{ background: '#040711', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--cyan)' }}>
                <div style={{ fontSize: 8.5, color: 'var(--cyan)', fontWeight: 800, textTransform: 'uppercase' }}>1. FON / ETF</div>
                <select 
                  value={duelFund1}
                  onChange={(e) => setDuelFund1(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'transparent',
                    border: 'none',
                    color: '#f8fafc',
                    fontSize: 13,
                    fontWeight: 800,
                    outline: 'none',
                    cursor: 'pointer',
                    marginTop: 4
                  }}
                >
                  {fundList.map(f => (
                    <option key={f.code} value={f.code} style={{ background: '#080c16', color: '#fff' }}>
                      {f.code} - {f.name} (+%{f.return_1y})
                    </option>
                  ))}
                </select>
                <div style={{ fontSize: 9.5, color: '#94a3b8', marginTop: 4 }}>
                  Gider: %{duelAnalysis.f1.expense_ratio} | 1Y: +%{duelAnalysis.f1.return_1y}
                </div>
              </div>

              {/* VS Icon */}
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 11, color: 'var(--gold)' }}>
                VS
              </div>

              {/* Fund 2 Selector */}
              <div style={{ background: '#040711', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--gold)' }}>
                <div style={{ fontSize: 8.5, color: 'var(--gold)', fontWeight: 800, textTransform: 'uppercase' }}>2. FON / ETF</div>
                <select 
                  value={duelFund2}
                  onChange={(e) => setDuelFund2(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'transparent',
                    border: 'none',
                    color: '#f8fafc',
                    fontSize: 13,
                    fontWeight: 800,
                    outline: 'none',
                    cursor: 'pointer',
                    marginTop: 4
                  }}
                >
                  {fundList.map(f => (
                    <option key={f.code} value={f.code} style={{ background: '#080c16', color: '#fff' }}>
                      {f.code} - {f.name} (+%{f.return_1y})
                    </option>
                  ))}
                </select>
                <div style={{ fontSize: 9.5, color: '#94a3b8', marginTop: 4 }}>
                  Gider: %{duelAnalysis.f2.expense_ratio} | 1Y: +%{duelAnalysis.f2.return_1y}
                </div>
              </div>
            </div>
          </div>

          {/* Common Holdings Table */}
          <div className="card" style={{ padding: 18, background: '#080c16', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: '#f8fafc', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>🔗</span>
              <span>HER İKİ FONDA DA BULUNAN ORTAK HİSSELER ({duelAnalysis.commonHoldings.length})</span>
            </div>

            {duelAnalysis.commonHoldings.length > 0 ? (
              <table className="terminal-table" style={{ width: '100%', fontSize: 11 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', color: '#64748b', fontSize: 9.5, textTransform: 'uppercase' }}>
                    <th style={{ textAlign: 'left', padding: '6px 8px' }}>HİSSE</th>
                    <th style={{ textAlign: 'left', padding: '6px 8px' }}>SEKTÖR</th>
                    <th style={{ textAlign: 'right', padding: '6px 8px', color: 'var(--cyan)' }}>{duelAnalysis.f1.code} PAYI</th>
                    <th style={{ textAlign: 'right', padding: '6px 8px', color: 'var(--gold)' }}>{duelAnalysis.f2.code} PAYI</th>
                    <th style={{ textAlign: 'right', padding: '6px 8px' }}>ORTAK ÇAKIŞMA</th>
                  </tr>
                </thead>
                <tbody>
                  {duelAnalysis.commonHoldings.map(ch => (
                    <tr key={ch.ticker} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                      <td style={{ padding: '8px', fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#f8fafc' }}>
                        {ch.ticker} <span style={{ fontSize: 9.5, color: '#94a3b8', fontWeight: 400 }}>{ch.name}</span>
                      </td>
                      <td style={{ padding: '8px', color: '#cbd5e1' }}>{ch.sector}</td>
                      <td style={{ padding: '8px', textAlign: 'right', fontWeight: 800, color: 'var(--cyan)', fontFamily: 'var(--font-mono)' }}>
                        %{ch.pct1.toFixed(1)}
                      </td>
                      <td style={{ padding: '8px', textAlign: 'right', fontWeight: 800, color: 'var(--gold)', fontFamily: 'var(--font-mono)' }}>
                        %{ch.pct2.toFixed(1)}
                      </td>
                      <td style={{ padding: '8px', textAlign: 'right', fontWeight: 800, color: 'var(--emerald)', fontFamily: 'var(--font-mono)' }}>
                        %{ch.commonWeight.toFixed(1)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div style={{ padding: 18, textAlign: 'center', color: '#64748b', fontSize: 11 }}>
                Bu iki fonun ilk 10 varlıkları arasında hiçbir ortak hisse bulunmamaktadır. Mükemmel bağımsız çeşitlendirme!
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
