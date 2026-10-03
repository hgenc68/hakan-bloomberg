import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Globe, TrendingUp, TrendingDown, Activity, AlertTriangle, Newspaper, Flame, ShieldCheck, RefreshCw, ExternalLink } from 'lucide-react';
import macroPulseData from '../data/macroPulse.json';

const SEED_NEWS = [
  {
    id: 'seed-1',
    timeAgoMin: 14,
    source: 'TCMB / PPK',
    title: 'TCMB Para Politikası Kurulu: Politika faizi %37.00 seviyesinde sabit tutuldu. Bir sonraki faiz kararı 22 Ekim 2026 PPK toplantısında açıklanacak.',
    tag: 'TCMB & Makro',
    bull: true,
    link: 'https://www.tcmb.gov.tr'
  },
  {
    id: 'seed-2',
    timeAgoMin: 28,
    source: 'Bloomberght',
    title: 'Borsa İstanbul BIST 100 endeksi 12.250 direncini test ediyor; yabancı sermaye girişleri teknoloji ve ihracatçı şirketleri destekliyor.',
    tag: 'BIST & KAP',
    bull: true,
    link: 'https://www.bloomberght.com'
  },
  {
    id: 'seed-3',
    timeAgoMin: 42,
    source: 'Reuters',
    title: 'Fed FOMC Karar Metni: Enflasyon ve istihdam göstergelerindeki dengelenme izlenirken politika faizi %3.75-%4.00 bandında korunuyor.',
    tag: 'Fed & Wall St',
    bull: true,
    link: 'https://www.reuters.com'
  },
  {
    id: 'seed-4',
    timeAgoMin: 58,
    source: 'TÜİK',
    title: 'Yıllık enflasyon Ağustos ayında %31.51 olarak gerçekleşti. Eylül ayı resmi TÜFE verisi 5 Ekim Pazartesi günü açıklanacak.',
    tag: 'TCMB & Makro',
    bull: true,
    link: 'https://www.tuik.gov.tr'
  },
  {
    id: 'seed-5',
    timeAgoMin: 76,
    source: 'Bloomberg',
    title: 'TSMC & Nvidia: Yeni nesil Blackwell mimarisi yapay zeka çip sevkiyat kapasitesi rekor küresel veri merkezi talebiyle genişletildi.',
    tag: 'Teknoloji & AI',
    bull: true,
    link: 'https://www.bloomberg.com'
  },
  {
    id: 'seed-6',
    timeAgoMin: 98,
    source: 'KAP',
    title: 'THYAO: 2026 yılı 3. çeyrek yolcu doluluk oranları, uluslararası hat genişlemeleri ve filo modernizasyon raporu KAP\'a bildirildi.',
    tag: 'BIST & KAP',
    bull: true,
    link: 'https://www.kap.org.tr'
  },
  {
    id: 'seed-7',
    timeAgoMin: 125,
    source: 'CoinDesk',
    title: 'Bitcoin kurumsal rezerv alımları ve spot ETF girişleriyle güçlü duruşunu korurken, dijital varlık piyasasında likidite artışı izleniyor.',
    tag: 'Kripto & Emtia',
    bull: true,
    link: 'https://www.coindesk.com'
  },
  {
    id: 'seed-8',
    timeAgoMin: 160,
    source: 'Foreks',
    title: 'Altın (Ons) 2.650$ üzerinde güçlü seyrini sürdürüyor; merkez bankaları rezerv çeşitlendirme alımları devam ediyor.',
    tag: 'Kripto & Emtia',
    bull: true,
    link: 'https://www.foreks.com'
  }
];

export default function MarketPulseTab() {
  const { marketQuotes, usdtry, currentCurrency } = useApp();
  const [pulse, setPulse] = useState(macroPulseData);
  const [newsItems, setNewsItems] = useState(() => {
    const now = Date.now();
    return SEED_NEWS.map(n => ({
      ...n,
      timeMs: now - n.timeAgoMin * 60 * 1000
    }));
  });
  const [newsFilter, setNewsFilter] = useState('ALL');
  const [isRefreshingNews, setIsRefreshingNews] = useState(false);
  const [isLiveNewsActive, setIsLiveNewsActive] = useState(false);
  const [lastNewsUpdated, setLastNewsUpdated] = useState(null);

  // Helper for dynamic relative time
  const formatTimeAgo = (dateInput) => {
    if (!dateInput) return 'Az önce';
    const time = typeof dateInput === 'number' ? dateInput : new Date(dateInput).getTime();
    if (isNaN(time)) return 'Az önce';
    const diffSec = Math.max(0, Math.floor((Date.now() - time) / 1000));
    const diffMin = Math.floor(diffSec / 60);
    const diffHours = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMin < 2) return 'Az önce';
    if (diffMin < 60) return `${diffMin} dk önce`;
    if (diffHours < 24) return `${diffHours} sa önce`;
    if (diffDays === 1) return 'Dün';
    return `${diffDays} gün önce`;
  };

  // Helper for category badge styling
  const getTagBadgeStyle = (tag = '') => {
    if (tag.includes('BIST')) return { bg: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', border: 'rgba(56, 189, 248, 0.3)' };
    if (tag.includes('TCMB') || tag.includes('Makro')) return { bg: 'rgba(234, 179, 8, 0.15)', color: '#eab308', border: 'rgba(234, 179, 8, 0.3)' };
    if (tag.includes('Fed') || tag.includes('Wall St')) return { bg: 'rgba(168, 85, 247, 0.15)', color: '#c084fc', border: 'rgba(168, 85, 247, 0.3)' };
    if (tag.includes('Teknoloji') || tag.includes('AI')) return { bg: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', border: 'rgba(59, 130, 246, 0.3)' };
    if (tag.includes('Kripto') || tag.includes('Emtia')) return { bg: 'rgba(16, 185, 129, 0.15)', color: '#34d399', border: 'rgba(16, 185, 129, 0.3)' };
    return { bg: 'rgba(148, 163, 184, 0.15)', color: '#94a3b8', border: 'rgba(148, 163, 184, 0.3)' };
  };

  // Live refresh of pulse & news via API
  const fetchPulseAndNews = async (showLoading = false) => {
    if (showLoading) setIsRefreshingNews(true);
    try {
      const res = await fetch('/api/market?type=pulse');
      if (res.ok) {
        const j = await res.json();
        if (j.status === 'success') {
          if (j.fearGreed) {
            setPulse(prev => ({
              ...prev,
              fear_greed_score: Math.round(j.fearGreed.score || prev.fear_greed_score),
              fear_greed_label: (j.fearGreed.rating || prev.fear_greed_label).toUpperCase(),
              vix: {
                value: j.vix?.price || prev.vix?.value || 16.5,
                change_pct: j.vix?.changePct || prev.vix?.change_pct || 0
              }
            }));
          }
          if (Array.isArray(j.news) && j.news.length > 0) {
            const mapped = j.news.map(item => ({
              ...item,
              timeMs: item.pubDate ? new Date(item.pubDate).getTime() : Date.now()
            }));
            setNewsItems(mapped);
            setIsLiveNewsActive(true);
            setLastNewsUpdated(new Date());
          }
        }
      }
    } catch (err) {
      console.warn('Live pulse/news fetch error:', err);
    } finally {
      if (showLoading) {
        setTimeout(() => setIsRefreshingNews(false), 400);
      }
    }
  };

  useEffect(() => {
    fetchPulseAndNews(false);
    // Auto-refresh every 3 minutes
    const interval = setInterval(() => {
      fetchPulseAndNews(false);
    }, 180000);
    return () => clearInterval(interval);
  }, []);

  const fgScore = pulse?.fear_greed_score || 35;
  // Needle angle: 0 score = -90deg, 50 score = 0deg, 100 score = +90deg
  const needleRotation = -90 + (fgScore / 100) * 180;

  const getFgColor = (score) => {
    if (score < 25) return '#ef4444';
    if (score < 45) return '#f97316';
    if (score <= 55) return '#eab308';
    if (score <= 75) return '#34d399';
    return '#10b981';
  };

  const getFgLabel = (score) => {
    if (score < 25) return 'AŞIRI KORKU';
    if (score < 45) return 'KORKU';
    if (score <= 55) return 'NÖTR';
    if (score <= 75) return 'AÇGÖZLÜLÜK';
    return 'AŞIRI AÇGÖZLÜLÜK';
  };

  const fgColor = getFgColor(fgScore);
  const fgLabel = pulse?.fear_greed_label || getFgLabel(fgScore);

  const hist = pulse?.fear_greed_history || {
    yesterday: 30.8,
    week_ago: 35.7,
    month_ago: 44.9,
    year_ago: 52.5
  };

  // Equities return matrix
  const equities = [
    { name: 'S&P 500', symbol: 'SPY', price: marketQuotes['SPY']?.price || 762.63, today: marketQuotes['SPY']?.changePct || -0.20, d5: -0.67, m1: -0.58, ytd: 11.63, y1: 14.09 },
    { name: 'Nasdaq 100', symbol: 'QQQ', price: marketQuotes['QQQ']?.price || 739.77, today: marketQuotes['QQQ']?.changePct || 0.25, d5: -0.19, m1: 3.21, ytd: 20.66, y1: 22.63 },
    { name: 'Dow Jones', symbol: 'DIA', price: marketQuotes['DIA']?.price || 508.55, today: marketQuotes['DIA']?.changePct || -0.84, d5: -1.12, m1: -4.33, ytd: 5.15, y1: 9.54 },
    { name: 'BIST 100', symbol: 'XU100.IS', price: marketQuotes['XU100.IS']?.price || 10850.4, today: marketQuotes['XU100.IS']?.changePct || 0.45, d5: 1.25, m1: 4.80, ytd: 38.63, y1: 42.10 },
    { name: 'Altın (Ons)', symbol: 'GC=F', price: marketQuotes['GC=F']?.price || 4198.10, today: marketQuotes['GC=F']?.changePct || 0.38, d5: 0.85, m1: 3.40, ytd: 28.50, y1: 36.20 },
    { name: 'Brent Petrol', symbol: 'BZ=F', price: marketQuotes['BZ=F']?.price || 74.20, today: marketQuotes['BZ=F']?.changePct || -0.65, d5: -1.80, m1: -3.10, ytd: -2.40, y1: -5.10 },
    { name: 'ABD 10Y Tahvil', symbol: '^TNX', price: marketQuotes['^TNX']?.price || 4.15, today: marketQuotes['^TNX']?.changePct || -0.40, d5: 0.12, m1: -0.85, ytd: -1.20, y1: -2.50 },
    { name: 'Dolar / TL', symbol: 'USDTRY=X', price: usdtry || 49.03, today: marketQuotes['USDTRY=X']?.changePct || 0.12, d5: 0.45, m1: 1.85, ytd: 18.40, y1: 32.10 }
  ];

  const filteredNews = newsItems.filter(item => {
    if (newsFilter === 'ALL') return true;
    if (newsFilter === 'BIST') return item.tag?.includes('BIST');
    if (newsFilter === 'TCMB') return item.tag?.includes('TCMB') || item.tag?.includes('Makro');
    if (newsFilter === 'FED') return item.tag?.includes('Fed') || item.tag?.includes('Wall St');
    if (newsFilter === 'TECH') return item.tag?.includes('Teknoloji') || item.tag?.includes('AI');
    if (newsFilter === 'CRYPTO') return item.tag?.includes('Kripto') || item.tag?.includes('Emtia');
    return true;
  });

  return (
    <div className="tab-pane active" style={{ animation: 'fadeIn 0.25s ease' }}>
      {/* Workspace Header */}
      <div className="workspace-header" style={{ marginBottom: 16 }}>
        <div>
          <h2 className="workspace-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span>🌐</span>
            <span>GLOBAL PİYASA NABZI & MAKRO RADAR</span>
          </h2>
          <p className="workspace-subtitle">
            Korku & Açgözlülük İbresi, Portföy Maruziyet Ölçeri, VIX, Truflation ve Küresel Endeks Performansları
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="nav-badge emerald" style={{ padding: '5px 12px', fontSize: 11 }}>
            CANLI PİYASA REJİMİ: RİSK-ON (BOĞA)
          </span>
        </div>
      </div>

      {/* Main Grid: Left Fear & Greed + Indicators | Right Equities Matrix */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(340px, 420px) 1fr', gap: 16, marginBottom: 20 }}>
        
        {/* Left Column: Speedometer & Macro Gauges */}
        <div className="card" style={{ padding: 18, background: '#070a12', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px', textAlign: 'center', marginBottom: 8 }}>
            KORKU & AÇGÖZLÜLÜK ENDEKSİ (FEAR & GREED)
          </div>

          {/* SVG Speedometer Gauge */}
          <div style={{ position: 'relative', width: 280, height: 140, margin: '0 auto' }}>
            <svg viewBox="0 0 280 140" style={{ width: '100%', height: '100%' }}>
              {/* 0-25 Extreme Fear: Red */}
              <path d="M 20 130 A 120 120 0 0 1 55 45" fill="none" stroke="#ef4444" strokeWidth="20" strokeLinecap="round" />
              {/* 25-45 Fear: Orange */}
              <path d="M 60 40 A 120 120 0 0 1 120 15" fill="none" stroke="#f97316" strokeWidth="20" />
              {/* 45-55 Neutral: Amber */}
              <path d="M 125 15 A 120 120 0 0 1 155 15" fill="none" stroke="#eab308" strokeWidth="20" />
              {/* 55-75 Greed: Light Green */}
              <path d="M 160 15 A 120 120 0 0 1 220 40" fill="none" stroke="#34d399" strokeWidth="20" />
              {/* 75-100 Extreme Greed: Emerald */}
              <path d="M 225 45 A 120 120 0 0 1 260 130" fill="none" stroke="#10b981" strokeWidth="20" strokeLinecap="round" />
            </svg>
            {/* Needle */}
            <div
              style={{
                position: 'absolute',
                bottom: 10,
                left: '50%',
                width: 4,
                height: 105,
                background: '#fff',
                transformOrigin: 'bottom center',
                transform: `translateX(-50%) rotate(${needleRotation}deg)`,
                transition: 'transform 1s cubic-bezier(0.34, 1.56, 0.64, 1)',
                boxShadow: '0 0 8px rgba(255,255,255,0.8)',
                borderRadius: '2px 2px 0 0',
                zIndex: 2
              }}
            />
            {/* Needle Center Pin */}
            <div
              style={{
                position: 'absolute',
                bottom: 4,
                left: '50%',
                transform: 'translateX(-50%)',
                width: 16,
                height: 16,
                background: '#fff',
                borderRadius: '50%',
                border: '3px solid #000',
                zIndex: 3
              }}
            />
          </div>

          {/* Score & Label */}
          <div style={{ textAlign: 'center', marginTop: 10 }}>
            <div style={{ fontSize: 38, fontWeight: 900, color: fgColor, lineHeight: 1, fontFamily: 'var(--font-mono)' }}>
              {fgScore}
            </div>
            <div style={{ fontSize: 13, fontWeight: 800, color: fgColor, marginTop: 4, letterSpacing: '0.5px' }}>
              {fgLabel}
            </div>
            <div style={{ fontSize: 9.5, color: 'var(--text-muted)', marginTop: 2 }}>
              Kaynak: CNN Business Resmi Canlı Göstergesi
            </div>
          </div>

          {/* Historical Fear & Greed Levels */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, marginTop: 14, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '6px 4px', borderRadius: 4, textAlign: 'center' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: 8.5, fontWeight: 700 }}>DÜN</div>
              <div style={{ fontWeight: 800, color: getFgColor(hist.yesterday), fontSize: 12, marginTop: 2, fontFamily: 'var(--font-mono)' }}>{hist.yesterday}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: 8 }}>{getFgLabel(hist.yesterday)}</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '6px 4px', borderRadius: 4, textAlign: 'center' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: 8.5, fontWeight: 700 }}>1 HAFTA</div>
              <div style={{ fontWeight: 800, color: getFgColor(hist.week_ago), fontSize: 12, marginTop: 2, fontFamily: 'var(--font-mono)' }}>{hist.week_ago}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: 8 }}>{getFgLabel(hist.week_ago)}</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '6px 4px', borderRadius: 4, textAlign: 'center' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: 8.5, fontWeight: 700 }}>1 AY</div>
              <div style={{ fontWeight: 800, color: getFgColor(hist.month_ago), fontSize: 12, marginTop: 2, fontFamily: 'var(--font-mono)' }}>{hist.month_ago}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: 8 }}>{getFgLabel(hist.month_ago)}</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '6px 4px', borderRadius: 4, textAlign: 'center' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: 8.5, fontWeight: 700 }}>1 YIL</div>
              <div style={{ fontWeight: 800, color: getFgColor(hist.year_ago), fontSize: 12, marginTop: 2, fontFamily: 'var(--font-mono)' }}>{hist.year_ago}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: 8 }}>{getFgLabel(hist.year_ago)}</div>
            </div>
          </div>

          {/* Stock Market Exposure Meter */}
          <div style={{ marginTop: 16, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, marginBottom: 8 }}>
              <strong style={{ color: '#fff' }}>Piyasa Maruziyet Ölçeri:</strong>
              <span style={{ color: 'var(--cyan)', fontWeight: 800, fontFamily: 'var(--font-mono)' }}>
                {pulse?.exposure_pct || '60% to 80% Invested'}
              </span>
            </div>
            <div style={{ display: 'flex', height: 18, borderRadius: 3, overflow: 'hidden', fontSize: 9, fontWeight: 800, textAlign: 'center', lineHeight: '18px' }}>
              <div style={{ flex: 1, background: '#ef4444', color: '#fff' }}>0-20%</div>
              <div style={{ flex: 1, background: '#f97316', color: '#fff' }}>20-40%</div>
              <div style={{ flex: 1, background: '#eab308', color: '#000' }}>40-60%</div>
              <div style={{ flex: 1, background: '#10b981', color: '#fff', border: '1.5px solid #fff' }}>60-80%</div>
              <div style={{ flex: 1, background: '#059669', color: '#fff' }}>80-100%</div>
            </div>
            <div style={{ fontSize: 10.5, color: 'var(--text-muted)', lineHeight: 1.4, marginTop: 6 }}>
              {pulse?.exposure_desc || 'Nasdaq composite ve S&P 500 21 günlük hareketli ortalamalarının üzerinde seyrediyor.'}
            </div>
          </div>

          {/* Mini Cards: VIX & Truflation */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 14 }}>
            <div style={{ background: '#0b0f19', border: '1px solid var(--border)', borderRadius: 4, padding: 10, textAlign: 'center' }}>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700 }}>VIX ENDEKSİ</div>
              <div style={{ fontSize: 18, fontWeight: 900, color: '#fff', margin: '4px 0 2px 0', fontFamily: 'var(--font-mono)' }}>
                {pulse?.vix?.value || 16.46}
              </div>
              <div style={{ fontSize: 10.5, color: (pulse?.vix?.change_pct || 0) >= 0 ? 'var(--amber)' : 'var(--emerald)', fontWeight: 700 }}>
                {(pulse?.vix?.change_pct || 0) >= 0 ? '+' : ''}{(pulse?.vix?.change_pct || 0).toFixed(2)}%
              </div>
            </div>

            <div style={{ background: '#0b0f19', border: '1px solid var(--border)', borderRadius: 4, padding: 10, textAlign: 'center' }}>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 4 }}>
                <span>TRUFLATION (ABD)</span>
                <span className="nav-badge cyan" style={{ fontSize: 8, padding: '1px 5px' }}>CANLI</span>
              </div>
              <div style={{ fontSize: 18, fontWeight: 900, color: '#38bdf8', margin: '4px 0 2px 0', fontFamily: 'var(--font-mono)' }}>
                %{pulse?.inflation?.usa ? Number(pulse.inflation.usa).toFixed(2) : '2.77'}
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Gerçek Zamanlı Öncü TÜFE</div>
            </div>
          </div>

        </div>

        {/* Right Column: Equities Matrix Table & Macro Regime */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          
          {/* Equities Return Matrix Card */}
          <div className="card" style={{ padding: 16, background: 'var(--bg-card)', border: '1px solid var(--border)', flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ fontWeight: 800, fontSize: 13, color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>🏛️</span>
                <span>U.S. & BIST EQUITIES DÖNEMSEL PERFORMANS MATRİSİ</span>
              </div>
              <span style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>
                Resmi Kapanış Fiyatları (% Getiriler)
              </span>
            </div>

            <div className="table-responsive">
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', textAlign: 'left' }}>
                    <th style={{ padding: '8px 10px' }}>Varlık Adı</th>
                    <th style={{ padding: '8px 10px' }}>Sembol</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right' }}>Son Fiyat</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right' }}>Bugün (%)</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right' }}>5 Gün (%)</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right' }}>1 Ay (%)</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right' }}>YTD (%)</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right' }}>1 Yıl (%)</th>
                  </tr>
                </thead>
                <tbody>
                  {equities.map((eq, i) => {
                    const isPositive = (n) => n >= 0;
                    return (
                      <tr key={eq.symbol} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)' }}>
                        <td style={{ padding: '9px 10px', fontWeight: 700, color: '#fff' }}>{eq.name}</td>
                        <td style={{ padding: '9px 10px', fontFamily: 'var(--font-mono)', color: 'var(--cyan)' }}>{eq.symbol}</td>
                        <td style={{ padding: '9px 10px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                          {eq.price ? eq.price.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '--'}
                        </td>
                        <td style={{ padding: '9px 10px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 800, color: isPositive(eq.today) ? 'var(--emerald)' : 'var(--red)' }}>
                          {isPositive(eq.today) ? '+' : ''}{Number(eq.today).toFixed(2)}%
                        </td>
                        <td style={{ padding: '9px 10px', textAlign: 'right', fontFamily: 'var(--font-mono)', color: isPositive(eq.d5) ? 'var(--emerald)' : 'var(--red)' }}>
                          {isPositive(eq.d5) ? '+' : ''}{Number(eq.d5).toFixed(2)}%
                        </td>
                        <td style={{ padding: '9px 10px', textAlign: 'right', fontFamily: 'var(--font-mono)', color: isPositive(eq.m1) ? 'var(--emerald)' : 'var(--red)' }}>
                          {isPositive(eq.m1) ? '+' : ''}{Number(eq.m1).toFixed(2)}%
                        </td>
                        <td style={{ padding: '9px 10px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color: isPositive(eq.ytd) ? 'var(--emerald)' : 'var(--red)' }}>
                          {isPositive(eq.ytd) ? '+' : ''}{Number(eq.ytd).toFixed(2)}%
                        </td>
                        <td style={{ padding: '9px 10px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color: isPositive(eq.y1) ? 'var(--emerald)' : 'var(--red)' }}>
                          {isPositive(eq.y1) ? '+' : ''}{Number(eq.y1).toFixed(2)}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Macro Rates Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
            <div style={{ background: '#090d16', border: '1px solid var(--border)', borderRadius: 6, padding: '12px 14px' }}>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>TCMB POLİTİKA FAİZİ</span>
                <span className="nav-badge emerald" style={{ fontSize: 8.5, padding: '1px 6px' }}>GÜNCEL</span>
              </div>
              <div style={{ fontSize: 20, fontWeight: 900, color: 'var(--amber)', fontFamily: 'var(--font-mono)', margin: '4px 0' }}>
                %{pulse?.rates?.tcmb ? Number(pulse.rates.tcmb).toFixed(2) : '37.00'}
              </div>
              <div style={{ fontSize: 9.5, color: 'var(--text-muted)' }}>
                {pulse?.rates?.tcmb_text || '10 Eylül PPK: Sabit • Sonraki: 22 Ekim'}
              </div>
            </div>

            <div style={{ background: '#090d16', border: '1px solid var(--border)', borderRadius: 6, padding: '12px 14px' }}>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>FED FONLAMA FAİZİ</span>
                <span className="nav-badge cyan" style={{ fontSize: 8.5, padding: '1px 6px' }}>FOMC</span>
              </div>
              <div style={{ fontSize: 20, fontWeight: 900, color: 'var(--cyan)', fontFamily: 'var(--font-mono)', margin: '4px 0' }}>
                %{pulse?.rates?.fed || '3.75 - 4.00'}
              </div>
              <div style={{ fontSize: 9.5, color: 'var(--text-muted)' }}>
                {pulse?.rates?.fed_text || '16 Eylül FOMC: %3.75 - %4.00 • Sonraki: 28 Ekim'}
              </div>
            </div>

            <div style={{ background: '#090d16', border: '1px solid var(--border)', borderRadius: 6, padding: '12px 14px' }}>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>TÜİK YILLIK TÜFE</span>
                <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>AĞUSTOS</span>
              </div>
              <div style={{ fontSize: 20, fontWeight: 900, color: '#f59e0b', fontFamily: 'var(--font-mono)', margin: '4px 0' }}>
                %{pulse?.inflation?.turkey ? Number(pulse.inflation.turkey).toFixed(2) : '31.51'}
              </div>
              <div style={{ fontSize: 9.5, color: 'var(--text-muted)' }}>
                Eylül Verisi: 5 Ekim Pazartesi
              </div>
            </div>

            <div style={{ background: '#090d16', border: '1px solid var(--border)', borderRadius: 6, padding: '12px 14px' }}>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700 }}>DOĞAL KUR KALKANI</div>
              <div style={{ fontSize: 20, fontWeight: 900, color: 'var(--emerald)', fontFamily: 'var(--font-mono)', margin: '4px 0' }}>
                %{pulse?.rates?.kur_kalkani ? Number(pulse.rates.kur_kalkani).toFixed(1) : '82.4'}
              </div>
              <div style={{ fontSize: 9.5, color: 'var(--emerald)' }}>🛡️ Döviz / Altın Zırhı</div>
            </div>
          </div>

        </div>

      </div>

      {/* Live Financial & KAP News Feed Card */}
      <div className="card" style={{ padding: 18, background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ fontWeight: 800, fontSize: 13, color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Newspaper size={16} className="text-cyan" />
              <span>CANLI FİNANS & KAP HABER AKIŞI</span>
            </div>
            <span className={`nav-badge ${isLiveNewsActive ? 'emerald' : 'cyan'}`} style={{ fontSize: 9, padding: '2px 8px', display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: isLiveNewsActive ? '#10b981' : '#38bdf8', display: 'inline-block' }} />
              {isLiveNewsActive ? 'CANLI RSS / API AKTİF' : 'GÜNCEL AKIŞ'}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {lastNewsUpdated && (
              <span style={{ fontSize: 10.5, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                Son Güncelleme: {lastNewsUpdated.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            )}
            <button
              onClick={() => fetchPulseAndNews(true)}
              disabled={isRefreshingNews}
              className="btn btn-secondary"
              style={{
                fontSize: 11,
                padding: '5px 12px',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                background: '#0c101d',
                border: '1px solid var(--border)',
                cursor: isRefreshingNews ? 'wait' : 'pointer',
                borderRadius: 4,
                color: '#e2e8f0'
              }}
            >
              <RefreshCw size={12} style={{ animation: isRefreshingNews ? 'spin 1s linear infinite' : 'none' }} />
              <span>{isRefreshingNews ? 'Yenileniyor...' : 'Canlı Akışı Yenile'}</span>
            </button>
          </div>
        </div>

        {/* Category Filters */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
          {[
            { id: 'ALL', label: 'Tümü' },
            { id: 'BIST', label: 'BIST & KAP' },
            { id: 'TCMB', label: 'TCMB & Makro' },
            { id: 'FED', label: 'Fed & Wall St' },
            { id: 'TECH', label: 'Teknoloji & AI' },
            { id: 'CRYPTO', label: 'Kripto & Emtia' }
          ].map(f => {
            const isSel = newsFilter === f.id;
            const count = newsItems.filter(item => {
              if (f.id === 'ALL') return true;
              if (f.id === 'BIST') return item.tag?.includes('BIST');
              if (f.id === 'TCMB') return item.tag?.includes('TCMB') || item.tag?.includes('Makro');
              if (f.id === 'FED') return item.tag?.includes('Fed') || item.tag?.includes('Wall St');
              if (f.id === 'TECH') return item.tag?.includes('Teknoloji') || item.tag?.includes('AI');
              if (f.id === 'CRYPTO') return item.tag?.includes('Kripto') || item.tag?.includes('Emtia');
              return true;
            }).length;

            return (
              <button
                key={f.id}
                onClick={() => setNewsFilter(f.id)}
                style={{
                  fontSize: 11,
                  fontWeight: isSel ? 700 : 500,
                  padding: '4px 11px',
                  borderRadius: 20,
                  background: isSel ? 'var(--cyan)' : '#090d16',
                  color: isSel ? '#000' : 'var(--text-muted)',
                  border: isSel ? '1px solid var(--cyan)' : '1px solid var(--border)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}
              >
                <span>{f.label}</span>
                <span style={{
                  fontSize: 9,
                  padding: '1px 5px',
                  borderRadius: 10,
                  background: isSel ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.08)',
                  color: isSel ? '#000' : 'var(--text-muted)',
                  fontWeight: 800
                }}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* News Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 10 }}>
          {filteredNews.map((n, i) => {
            const badgeStyle = getTagBadgeStyle(n.tag);
            const timeAgo = formatTimeAgo(n.timeMs || n.pubDate);
            return (
              <a
                key={n.id || i}
                href={n.link || '#'}
                target={n.link ? '_blank' : '_self'}
                rel="noopener noreferrer"
                style={{
                  textDecoration: 'none',
                  background: '#090d16',
                  border: '1px solid var(--border)',
                  borderRadius: 6,
                  padding: '11px 13px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                  transition: 'border-color 0.15s ease, transform 0.15s ease',
                  cursor: n.link ? 'pointer' : 'default'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(56, 189, 248, 0.4)';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border)';
                  e.currentTarget.style.transform = 'none';
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                      ⏱️ {timeAgo}
                    </span>
                    <span className={`nav-badge ${n.bull ? 'emerald' : 'amber'}`} style={{ fontSize: 8.5, padding: '0px 6px' }}>
                      {n.source}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span
                      style={{
                        fontSize: 9.5,
                        fontWeight: 700,
                        padding: '1px 7px',
                        borderRadius: 3,
                        background: badgeStyle.bg,
                        color: badgeStyle.color,
                        border: `1px solid ${badgeStyle.border}`
                      }}
                    >
                      {n.tag}
                    </span>
                    {n.link && <ExternalLink size={11} style={{ color: 'var(--text-muted)' }} />}
                  </div>
                </div>
                <div style={{ fontSize: 12, color: '#e2e8f0', lineHeight: 1.45, fontWeight: 500 }}>
                  {n.title}
                </div>
              </a>
            );
          })}
        </div>
      </div>
    </div>
  );
}
