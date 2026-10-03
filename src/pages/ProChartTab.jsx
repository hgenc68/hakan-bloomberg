import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { 
  LineChart, 
  Search, 
  Star, 
  Briefcase, 
  Globe, 
  Coins, 
  Layers, 
  Plus, 
  Trash2, 
  ChevronRight, 
  ChevronLeft, 
  ExternalLink, 
  ShieldCheck, 
  Activity, 
  Sparkles, 
  TrendingUp,
  TrendingDown,
  Info,
  Maximize2
} from 'lucide-react';
import stocksData from '../data/stocksData.json';
import potentialStocksData from '../data/potentialStocksData.json';

// Helper to convert any market ticker into TradingView compatible symbol string
export function getTradingViewSymbol(ticker) {
  if (!ticker) return 'NASDAQ:NVDA';
  const clean = ticker.trim().toUpperCase();

  // If already prefixed
  if (clean.includes(':')) return clean;

  // Macro Indicators
  if (clean === 'DXY') return 'CAPITALCOM:DXY';
  if (clean === 'VIX') return 'CBOE:VIX';
  if (clean === 'BRENT' || clean === 'UKOIL') return 'TVC:UKOIL';
  if (clean === 'US10Y') return 'TVC:US10Y';
  if (clean === 'US02Y') return 'TVC:US02Y';
  if (clean === 'XAUUSD' || clean === 'GOLD' || clean === 'ALTIN' || clean === 'ONS_ALTIN') return 'OANDA:XAUUSD';
  if (clean === 'USDTRY') return 'FX_IDC:USDTRY';

  // Crypto Market Caps (Total market aggregates)
  if (clean === 'TOTAL') return 'CRYPTOCAP:TOTAL';
  if (clean === 'TOTAL2') return 'CRYPTOCAP:TOTAL2';
  if (clean === 'TOTAL3') return 'CRYPTOCAP:TOTAL3';
  if (clean === 'OTHERS') return 'CRYPTOCAP:OTHERS';
  if (clean === 'TOTALDEFI') return 'CRYPTOCAP:TOTALDEFI';

  // Crypto Pairs
  if (clean === 'BTC' || clean === 'BTCUSDT' || clean === 'BTC-USD') return 'BINANCE:BTCUSDT';
  if (clean === 'ETH' || clean === 'ETHUSDT' || clean === 'ETH-USD') return 'BINANCE:ETHUSDT';
  if (clean === 'SOL' || clean === 'SOLUSDT' || clean === 'SOL-USD') return 'BINANCE:SOLUSDT';

  // BIST 100 Equities
  if (clean.endsWith('.IS')) {
    return `BIST:${clean.replace('.IS', '')}`;
  }
  const bistKnown = [
    'BYDNR', 'TUPRS', 'THYAO', 'ASELS', 'EREGL', 'KCHOL', 'BIMAS', 'SISE', 
    'FROTO', 'ASTOR', 'SAHOL', 'GARAN', 'AKBNK', 'YKBNK', 'ISCTR', 'PGSUS', 
    'TCELL', 'PETKM', 'TTKOM', 'ENKAI', 'KOZAL', 'SASA', 'HEKTS', 'KONTR'
  ];
  if (bistKnown.includes(clean)) {
    return `BIST:${clean}`;
  }

  // NYSE / AMEX Known Symbols
  const nyseKnown = ['TSM', 'ABBV', 'XOM', 'SPY', 'DIA', 'KO', 'DIS', 'NKE', 'JNJ', 'PFE', 'UNH', 'JPM', 'V', 'MA', 'WMT'];
  if (nyseKnown.includes(clean)) {
    return `NYSE:${clean}`;
  }

  const amexKnown = ['SPCX', 'SPY', 'IVV', 'VOO', 'GLD', 'SLV', 'GDX', 'XLE', 'XLF', 'XLK', 'URA'];
  if (amexKnown.includes(clean)) {
    return `AMEX:${clean}`;
  }

  // Default to NASDAQ for US tech / growth equities
  return `NASDAQ:${clean}`;
}

// Preset Watchlists Catalog
const PRESET_WATCHLISTS = {
  us_stocks: [
    { ticker: 'NVDA', name: 'Nvidia Corp', desc: 'AI Çip & Veri Merkezi Mimarı', tv: 'NASDAQ:NVDA' },
    { ticker: 'TSM', name: 'TSMC', desc: 'Küresel Çip Dökümhane Tekeli', tv: 'NYSE:TSM' },
    { ticker: 'ABBV', name: 'AbbVie Inc', desc: 'Biyofarma & Sağlam Temettü', tv: 'NYSE:ABBV' },
    { ticker: 'XOM', name: 'Exxon Mobil', desc: 'Entegre Enerji & Nakit Akışı', tv: 'NYSE:XOM' },
    { ticker: 'AAPL', name: 'Apple Inc', desc: 'Tüketici Elektroniği & Ekosistem', tv: 'NASDAQ:AAPL' },
    { ticker: 'MSFT', name: 'Microsoft Corp', desc: 'Bulut Bilişim & Kurumsal AI', tv: 'NASDAQ:MSFT' },
    { ticker: 'GOOGL', name: 'Alphabet Inc', desc: 'Arama Motoru, Bulut & Yapay Zeka', tv: 'NASDAQ:GOOGL' },
    { ticker: 'AMZN', name: 'Amazon.com', desc: 'E-Ticaret & AWS Bulut Lideri', tv: 'NASDAQ:AMZN' },
    { ticker: 'META', name: 'Meta Platforms', desc: 'Sosyal Ağlar & Llama AI', tv: 'NASDAQ:META' },
    { ticker: 'AMD', name: 'Advanced Micro Devices', desc: 'x86 CPU & MI300 AI Hızlandırıcı', tv: 'NASDAQ:AMD' },
    { ticker: 'PLTR', name: 'Palantir Technologies', desc: 'Savunma & Kurumsal AI İşletim Sistemi', tv: 'NASDAQ:PLTR' },
    { ticker: 'AVGO', name: 'Broadcom Inc', desc: 'Özel AI ASIC & Ağ Donanımları', tv: 'NASDAQ:AVGO' },
    { ticker: 'TSLA', name: 'Tesla Inc', desc: 'Elektrikli Araç, FSD & Otonomi', tv: 'NASDAQ:TSLA' }
  ],
  etf: [
    { ticker: 'SPCX', name: 'CrossingBridge Pre-Merger SPAC', desc: 'Doğal Nakit Kalkanı & Getiri Sepeti', tv: 'AMEX:SPCX' },
    { ticker: 'DRAM', name: 'First Trust SkyBridge Crypto & Tech', desc: 'Yüksek Beta Kripto & Teknoloji', tv: 'NASDAQ:DRAM' },
    { ticker: 'SOXX', name: 'iShares Semiconductor ETF', desc: 'ABD Yarı İletken Sanayi Endeksi', tv: 'NASDAQ:SOXX' },
    { ticker: 'SMH', name: 'VanEck Semiconductor ETF', desc: 'Ağırlıklı Yarı İletken Sepeti', tv: 'NASDAQ:SMH' },
    { ticker: 'QQQ', name: 'Invesco QQQ Trust', desc: 'Nasdaq 100 Teknoloji Devleri', tv: 'NASDAQ:QQQ' },
    { ticker: 'SPY', name: 'SPDR S&P 500 ETF Trust', desc: 'ABD Gösterge Piyasa Endeksi', tv: 'AMEX:SPY' },
    { ticker: 'IWM', name: 'iShares Russell 2000 ETF', desc: 'ABD Küçük Ölçekli Şirketler (Small Cap)', tv: 'AMEX:IWM' },
    { ticker: 'TLT', name: 'iShares 20+ Year Treasury Bond', desc: 'ABD Uzun Vadeli Hazine Tahvilleri', tv: 'NASDAQ:TLT' },
    { ticker: 'GLD', name: 'SPDR Gold Shares', desc: 'Fiziki Karşılıklı Altın Fonu', tv: 'AMEX:GLD' },
    { ticker: 'URA', name: 'Global X Uranium ETF', desc: 'Uranyum & Nükleer Enerji Madencileri', tv: 'AMEX:URA' },
    { ticker: 'XLE', name: 'Energy Select Sector SPDR', desc: 'ABD Petrol & Doğalgaz Şirketleri', tv: 'AMEX:XLE' },
    { ticker: 'XLK', name: 'Technology Select Sector SPDR', desc: 'S&P 500 Teknoloji Sektörü', tv: 'AMEX:XLK' }
  ],
  bist: [
    { ticker: 'BYDNR.IS', name: 'Baydöner Restoranları', desc: 'Gıda & Hızlı Tüketim Zinciri', tv: 'BIST:BYDNR' },
    { ticker: 'TUPRS.IS', name: 'Tüpraş Rafinerileri', desc: 'Stratejik Rafinaj & Temettü Devi', tv: 'BIST:TUPRS' },
    { ticker: 'THYAO.IS', name: 'Türk Hava Yolları', desc: 'Küresel Havacılık & Yolcu Büyümesi', tv: 'BIST:THYAO' },
    { ticker: 'ASELS.IS', name: 'Aselsan Savunma', desc: 'Savunma Sanayi & İleri Teknoloji', tv: 'BIST:ASELS' },
    { ticker: 'EREGL.IS', name: 'Ereğli Demir Çelik', desc: 'Sanayi Lokomotifi Çelik Üreticisi', tv: 'BIST:EREGL' },
    { ticker: 'KCHOL.IS', name: 'Koç Holding', desc: 'Sanayi, Enerji, Finans & Otomotiv', tv: 'BIST:KCHOL' },
    { ticker: 'BIMAS.IS', name: 'BİM Birleşik Mağazalar', desc: 'Perakende Market Lideri', tv: 'BIST:BIMAS' },
    { ticker: 'SISE.IS', name: 'Şişecam Fabrikaları', desc: 'Küresel Düzcam & Ambalaj Üreticisi', tv: 'BIST:SISE' },
    { ticker: 'FROTO.IS', name: 'Ford Otosan', desc: 'Ticari Araç İhracat Şampiyonu', tv: 'BIST:FROTO' },
    { ticker: 'ASTOR.IS', name: 'Astor Enerji', desc: 'Transformatör & Şebeke Ekipmanları', tv: 'BIST:ASTOR' },
    { ticker: 'SAHOL.IS', name: 'Sabancı Holding', desc: 'Enerji, Sanayi & Finans Grubu', tv: 'BIST:SAHOL' },
    { ticker: 'GARAN.IS', name: 'Garanti BBVA', desc: 'Bankacılık Sektörü Öncüsü', tv: 'BIST:GARAN' },
    { ticker: 'PGSUS.IS', name: 'Pegasus Hava Taşımacılığı', desc: 'Düşük Maliyetli Havacılık Modeli', tv: 'BIST:PGSUS' },
    { ticker: 'TCELL.IS', name: 'Turkcell İletişim', desc: 'Telekomünikasyon & Dijital Servisler', tv: 'BIST:TCELL' }
  ],
  crypto: [
    { ticker: 'TOTAL', name: 'Kripto Toplam Piyasa Değeri', desc: 'Tüm Kripto Ekosisteminin Toplam Hacmi', tv: 'CRYPTOCAP:TOTAL' },
    { ticker: 'TOTAL2', name: 'Toplam Piyasa (BTC Hariç)', desc: 'Bitcoin Hariç Tüm Ekosistem Büyüklüğü', tv: 'CRYPTOCAP:TOTAL2' },
    { ticker: 'TOTAL3', name: 'Altcoin Sezon Barometresi', desc: 'BTC & ETH Hariç Tüm Altcoinler', tv: 'CRYPTOCAP:TOTAL3' },
    { ticker: 'OTHERS', name: 'Diğer Küçük/Orta Altcoinler', desc: 'Top 10 Hariç Asimetrik Fırsat Endeksi', tv: 'CRYPTOCAP:OTHERS' },
    { ticker: 'TOTALDEFI', name: 'DeFi Ekosistem Toplamı', desc: 'Merkeziyetsiz Finans Protokol Büyüklüğü', tv: 'CRYPTOCAP:TOTALDEFI' },
    { ticker: 'BTCUSDT', name: 'Bitcoin / Tether', desc: 'Dijital Altın & Rezerv Varlık', tv: 'BINANCE:BTCUSDT' },
    { ticker: 'ETHUSDT', name: 'Ethereum / Tether', desc: 'Akıllı Kontratlar & L2 Ana Ağı', tv: 'BINANCE:ETHUSDT' },
    { ticker: 'SOLUSDT', name: 'Solana / Tether', desc: 'Yüksek Hızlı Monolitik Blokzincir', tv: 'BINANCE:SOLUSDT' }
  ],
  macro: [
    { ticker: 'DXY', name: 'US Dollar Index', desc: 'Doların Küresel Sepet Karşısındaki Gücü', tv: 'CAPITALCOM:DXY' },
    { ticker: 'VIX', name: 'CBOE Volatilite Endeksi', desc: 'Wall Street Korku & Oynaklık İbresi', tv: 'CBOE:VIX' },
    { ticker: 'BRENT', name: 'Brent Ham Petrol', desc: 'Küresel Enerji & Jeopolitik Fiyatlama', tv: 'TVC:UKOIL' },
    { ticker: 'US10Y', name: 'ABD 10 Yıllık Tahvil Faizi', desc: 'Küresel Risksiz Faiz Oranı & DCF İskontosu', tv: 'TVC:US10Y' },
    { ticker: 'US02Y', name: 'ABD 2 Yıllık Tahvil Faizi', desc: 'Fed Politika Beklentisi Öncü Göstergesi', tv: 'TVC:US02Y' },
    { ticker: 'XAUUSD', name: 'Ons Altın Spot ($)', desc: 'Klasik Güvenli Liman & Enflasyon Kalkanı', tv: 'OANDA:XAUUSD' },
    { ticker: 'USDTRY', name: 'Dolar / Türk Lirası', desc: 'TCMB Rezerv & Kur Rejimi Takibi', tv: 'FX_IDC:USDTRY' }
  ]
};

export default function ProChartTab({ onOpenAddModal, onOpenSellModal, selectedTicker, onSelectTicker }) {
  const { portfolioSummary, currentCurrency } = useApp();
  const isTRY = currentCurrency === 'try';
  const sym = isTRY ? '₺' : '$';

  const fmt = (v, d = 2) => (Number(v) || 0).toLocaleString('tr-TR', { minimumFractionDigits: d, maximumFractionDigits: d });

  // Current active symbol on chart
  const [currentSymbol, setCurrentSymbol] = useState(() => {
    return selectedTicker || 'NVDA';
  });

  // Watchlist Active Category
  const [activeCategory, setActiveCategory] = useState('portfolio'); // 'portfolio', 'us_stocks', 'etf', 'bist', 'crypto', 'macro', 'custom'
  const [searchQuery, setSearchQuery] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [customTickers, setCustomTickers] = useState(() => {
    try {
      const saved = localStorage.getItem('custom_watchlist_tickers');
      return saved ? JSON.parse(saved) : ['PLTR', 'THYAO.IS', 'SOXX', 'TOTAL3'];
    } catch {
      return ['PLTR', 'THYAO.IS', 'SOXX', 'TOTAL3'];
    }
  });
  const [newTickerInput, setNewTickerInput] = useState('');

  // Persist custom tickers
  useEffect(() => {
    try {
      localStorage.setItem('custom_watchlist_tickers', JSON.stringify(customTickers));
    } catch (err) {
      console.warn('Could not save custom watchlist', err);
    }
  }, [customTickers]);

  // Sync when prop selectedTicker changes from outside
  useEffect(() => {
    if (selectedTicker && selectedTicker !== currentSymbol) {
      setCurrentSymbol(selectedTicker);
    }
  }, [selectedTicker]);

  // Handle adding custom ticker
  const handleAddCustomTicker = (e) => {
    e?.preventDefault();
    const clean = newTickerInput.trim().toUpperCase();
    if (!clean) return;
    if (!customTickers.includes(clean)) {
      setCustomTickers(prev => [clean, ...prev]);
    }
    setCurrentSymbol(clean);
    setNewTickerInput('');
  };

  const handleRemoveCustomTicker = (tickerToRemove) => {
    setCustomTickers(prev => prev.filter(t => t !== tickerToRemove));
  };

  // Synchronize holdings dynamically from portfolio
  const portfolioItems = useMemo(() => {
    const list = portfolioSummary?.enrichedHoldings || [];
    return list.map(h => {
      const isUS = h.currency === 'USD' || h.isHoldingUSD || Number(h.cost_rate) > 1.5;
      const clean = (h.ticker || '').toUpperCase();
      return {
        ticker: h.ticker,
        name: h.name || h.ticker,
        desc: `${h.shares} Lot • Maliyet: ${h.currency === 'TRY' ? '₺' : '$'}${fmt(h.costTRY ? (h.costTRY / (h.shares || 1)) : 0, 2)}`,
        tv: getTradingViewSymbol(h.ticker),
        holding: h
      };
    });
  }, [portfolioSummary?.enrichedHoldings]);

  // Calculate Active Watchlist Items
  const currentWatchlistItems = useMemo(() => {
    let items = [];
    if (activeCategory === 'portfolio') {
      items = portfolioItems;
    } else if (activeCategory === 'custom') {
      items = customTickers.map(t => ({
        ticker: t,
        name: t,
        desc: 'Özel Eklenen Varlık',
        tv: getTradingViewSymbol(t)
      }));
    } else {
      items = PRESET_WATCHLISTS[activeCategory] || [];
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter(it => 
        it.ticker.toLowerCase().includes(q) || 
        it.name.toLowerCase().includes(q) || 
        (it.desc && it.desc.toLowerCase().includes(q))
      );
    }

    return items;
  }, [activeCategory, portfolioItems, customTickers, searchQuery]);

  // Check if currentSymbol is in the user's holdings
  const activeHolding = useMemo(() => {
    const cleanCurrent = currentSymbol.replace('.IS', '').replace('BIST:', '').replace('NASDAQ:', '').replace('NYSE:', '').replace('AMEX:', '').replace('BINANCE:', '').replace('CRYPTOCAP:', '').replace('CAPITALCOM:', '').replace('CBOE:', '').replace('TVC:', '').replace('OANDA:', '').replace('FX_IDC:', '').toUpperCase();
    return portfolioSummary?.enrichedHoldings?.find(h => {
      const hTicker = (h.ticker || '').toUpperCase().replace('.IS', '');
      return hTicker === cleanCurrent;
    });
  }, [currentSymbol, portfolioSummary?.enrichedHoldings]);

  // Quant score lookup for the active symbol
  const activeQuantInfo = useMemo(() => {
    const cleanCurrent = currentSymbol.replace('.IS', '').replace('BIST:', '').replace('NASDAQ:', '').replace('NYSE:', '').replace('AMEX:', '').replace('BINANCE:', '').replace('CRYPTOCAP:', '').replace('CAPITALCOM:', '').replace('CBOE:', '').replace('TVC:', '').replace('OANDA:', '').replace('FX_IDC:', '').toUpperCase();
    const sData = stocksData[cleanCurrent];
    const potData = potentialStocksData?.stocks?.find(s => s.ticker === cleanCurrent);
    return {
      quantScore: sData?.analysis?.quant_score || potData?.conviction_score || null,
      fairValue: potData?.target_price || null,
      notes: potData?.catalysts?.[0] || sData?.company?.sector || null
    };
  }, [currentSymbol]);

  // TradingView Widget Injection in container
  const containerId = 'tradingview_pro_chart_embed';
  const scriptId = 'tradingview-widget-script';

  useEffect(() => {
    let isMounted = true;

    const initWidget = () => {
      if (!window.TradingView) return;
      const el = document.getElementById(containerId);
      if (!el) return;
      el.innerHTML = '';

      const tvSymbol = getTradingViewSymbol(currentSymbol);

      try {
        new window.TradingView.widget({
          autosize: true,
          symbol: tvSymbol,
          interval: 'D',
          timezone: 'Europe/Istanbul',
          theme: 'dark',
          style: '1', // Candlestick
          locale: 'tr',
          toolbar_bg: '#080c16',
          enable_publishing: false,
          hide_side_toolbar: false, // FULL DRAWING TOOLS on left!
          allow_symbol_change: true,
          save_image: true,
          container_id: containerId,
          studies: [
            'STD;EMA',
            'STD;RSI',
            'STD;MACD',
            'STD;Bollinger_Bands'
          ]
        });
      } catch (err) {
        console.warn('TradingView widget initialization error:', err);
      }
    };

    if (!document.getElementById(scriptId)) {
      const script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://s3.tradingview.com/tv.js';
      script.async = true;
      script.onload = () => {
        if (isMounted) initWidget();
      };
      document.head.appendChild(script);
    } else {
      initWidget();
    }

    return () => {
      isMounted = false;
    };
  }, [currentSymbol]);

  return (
    <div className="tab-pane-content" style={{ animation: 'fadeIn 0.25s ease', display: 'flex', flexDirection: 'column', gap: 12 }}>
      
      {/* 🌟 Top Pro Header Bar */}
      <div 
        className="card" 
        style={{ 
          padding: '12px 18px', 
          background: 'linear-gradient(135deg, rgba(8, 12, 22, 0.95), rgba(15, 23, 42, 0.95))', 
          border: '1px solid rgba(0, 229, 255, 0.25)', 
          borderRadius: 8,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 34, height: 34, borderRadius: 8, background: 'rgba(0, 229, 255, 0.12)', border: '1px solid rgba(0, 229, 255, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--cyan)' }}>
            <LineChart size={19} />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 13.5, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>PRO GRAFİK & TEKNİK ANALİZ İSTASYONU</span>
              <span className="nav-badge cyan" style={{ fontSize: 9.5 }}>
                CANLI TRADINGVIEW ENGINE
              </span>
            </div>
            <div style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>
              Tam Teşekküllü Çizim Araçları • Sınırsız İndikatörler • Otomatik Portföy Entegrasyonu & Sınırsız İzleme Listeleri
            </div>
          </div>
        </div>

        {/* Quick Ticker Chips & Watchlist Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {/* Quick Shortcuts */}
          <div style={{ display: 'inline-flex', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, padding: 2 }}>
            {[
              { label: 'NVDA', sym: 'NVDA' },
              { label: 'SPCX', sym: 'SPCX' },
              { label: 'BYDNR', sym: 'BYDNR.IS' },
              { label: 'BTC', sym: 'BTCUSDT' },
              { label: 'TOTAL3', sym: 'TOTAL3' },
              { label: 'DXY', sym: 'DXY' },
              { label: 'BRENT', sym: 'BRENT' },
              { label: 'US10Y', sym: 'US10Y' }
            ].map(item => (
              <button
                key={item.sym}
                type="button"
                onClick={() => {
                  setCurrentSymbol(item.sym);
                  if (onSelectTicker) onSelectTicker(item.sym);
                }}
                className={`chip-btn ${currentSymbol === item.sym ? 'active' : ''}`}
                style={{ 
                  fontSize: 10, 
                  padding: '3px 8px',
                  fontWeight: currentSymbol === item.sym ? 800 : 600
                }}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Toggle Watchlist Sidebar Button */}
          <button
            type="button"
            onClick={() => setSidebarOpen(prev => !prev)}
            className="chip-btn"
            style={{ 
              fontSize: 10.5, 
              padding: '5px 10px', 
              display: 'flex', 
              alignItems: 'center', 
              gap: 5,
              background: sidebarOpen ? 'rgba(0, 229, 255, 0.12)' : 'transparent',
              borderColor: sidebarOpen ? 'var(--cyan)' : 'rgba(255,255,255,0.1)'
            }}
            title={sidebarOpen ? 'İzleme Listesini Gizle (Tam Ekran Grafik)' : 'İzleme Listesini Aç'}
          >
            <Layers size={13} className="text-cyan" />
            <span>{sidebarOpen ? 'Listeyi Gizle' : 'İzleme Listesi (Watchlist)'}</span>
          </button>
        </div>
      </div>

      {/* 🚀 Active Holding Overlay HUD (If selected ticker is in portfolio) */}
      {activeHolding && (
        <div 
          className="card" 
          style={{ 
            padding: '10px 16px', 
            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08), rgba(6, 78, 59, 0.15))', 
            border: '1px solid rgba(16, 185, 129, 0.35)', 
            borderRadius: 8,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 12
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 18 }}>💼</span>
            <div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.4px' }}>
                BU VARLIK PORTFÖYÜNÜZDE MEVCUT
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
                <strong className="mono text-bright" style={{ fontSize: 13.5 }}>
                  {activeHolding.ticker}
                </strong>
                <span className="mono font-bold text-emerald" style={{ fontSize: 12 }}>
                  {activeHolding.shares} Lot
                </span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  Ort. Maliyet: <strong className="mono text-bright">{activeHolding.currency === 'TRY' ? '₺' : '$'}{fmt(activeHolding.costTRY ? (activeHolding.costTRY / (activeHolding.shares || 1)) : 0, 2)}</strong>
                </span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  Piyasa Değeri: <strong className="mono text-cyan">{sym}{fmt(isTRY ? activeHolding.valTRY : activeHolding.valUSD, 2)}</strong>
                </span>
                <span style={{ fontSize: 11, color: (activeHolding.profitTRY || 0) >= 0 ? 'var(--up)' : 'var(--down)', fontWeight: 700 }}>
                  Net K/Z: {(activeHolding.profitTRY || 0) >= 0 ? '+' : ''}{sym}{fmt(isTRY ? activeHolding.profitTRY : activeHolding.profitUSD, 2)} ({fmt(activeHolding.returnPct, 2)}%)
                </span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {activeQuantInfo.quantScore && (
              <span className="nav-badge emerald" style={{ fontSize: 10, padding: '3px 8px' }}>
                Quant Skoru: {activeQuantInfo.quantScore.toFixed(1)} / 100
              </span>
            )}
            <button
              type="button"
              className="btn-action-row buy"
              onClick={() => onOpenAddModal && onOpenAddModal(activeHolding.ticker)}
              style={{ fontSize: 11, padding: '4px 10px' }}
            >
              + Ek Alım Yap
            </button>
            <button
              type="button"
              className="btn-action-row sell"
              onClick={() => onOpenSellModal && onOpenSellModal(activeHolding)}
              style={{ fontSize: 11, padding: '4px 10px' }}
            >
              - Kısmi Satış Yap
            </button>
          </div>
        </div>
      )}

      {/* 📊 Main Workspace: Chart (Left) + Sınırsız Watchlist Sidebar (Right) */}
      <div style={{ display: 'grid', gridTemplateColumns: sidebarOpen ? '1fr 340px' : '1fr', gap: 12, alignItems: 'stretch' }}>
        
        {/* Left: The Official TradingView Advanced Real-Time Chart Container */}
        <div 
          className="card" 
          style={{ 
            padding: 0, 
            background: '#040711', 
            border: '1px solid var(--border)', 
            borderRadius: 8, 
            overflow: 'hidden',
            minHeight: 'calc(100vh - 270px)',
            height: 'calc(100vh - 270px)',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          <div 
            id={containerId} 
            style={{ width: '100%', height: '100%', minHeight: 620, flex: 1 }} 
          />
        </div>

        {/* Right: Sınırsız Watchlist Yöneticisi */}
        {sidebarOpen && (
          <div 
            className="card" 
            style={{ 
              padding: '14px', 
              background: '#080c16', 
              border: '1px solid var(--border)', 
              borderRadius: 8, 
              display: 'flex', 
              flexDirection: 'column',
              maxHeight: 'calc(100vh - 270px)',
              overflow: 'hidden'
            }}
          >
            {/* Watchlist Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div style={{ fontWeight: 800, fontSize: 12.5, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Star size={15} className="text-gold" />
                <span>İZLEME LİSTELERİ</span>
              </div>
              <span className="nav-badge cyan" style={{ fontSize: 9.5 }}>
                {currentWatchlistItems.length} Varlık
              </span>
            </div>

            {/* Category Segmented Buttons Bar */}
            <div style={{ display: 'flex', gap: 4, overflowX: 'auto', paddingBottom: 6, marginBottom: 8, scrollbarWidth: 'none' }}>
              {[
                { id: 'portfolio', label: '💼 Portföyüm', count: portfolioItems.length },
                { id: 'us_stocks', label: '📈 ABD Hisse', count: PRESET_WATCHLISTS.us_stocks.length },
                { id: 'etf', label: '🏛️ ETF', count: PRESET_WATCHLISTS.etf.length },
                { id: 'bist', label: '🇹🇷 BIST 100', count: PRESET_WATCHLISTS.bist.length },
                { id: 'crypto', label: '⚡ Kripto & TOTAL3', count: PRESET_WATCHLISTS.crypto.length },
                { id: 'macro', label: '🌐 Makro & Emtia', count: PRESET_WATCHLISTS.macro.length },
                { id: 'custom', label: '⭐ Özel Listem', count: customTickers.length }
              ].map(cat => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveCategory(cat.id)}
                  className={`chip-btn ${activeCategory === cat.id ? 'active' : ''}`}
                  style={{ 
                    fontSize: 10, 
                    padding: '3px 7px', 
                    whiteSpace: 'nowrap',
                    fontWeight: activeCategory === cat.id ? 800 : 500
                  }}
                >
                  {cat.label} ({cat.count})
                </button>
              ))}
            </div>

            {/* Search Filter within Category */}
            <div style={{ position: 'relative', marginBottom: 8 }}>
              <Search size={13} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Bu listede ara (Sembol, Ad)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ 
                  width: '100%', 
                  padding: '6px 8px 6px 28px', 
                  fontSize: 11, 
                  background: 'rgba(0,0,0,0.4)', 
                  border: '1px solid rgba(255,255,255,0.08)', 
                  borderRadius: 6,
                  color: '#fff'
                }}
              />
            </div>

            {/* Custom Ticker Add Bar (Only when 'custom' is active) */}
            {activeCategory === 'custom' && (
              <form onSubmit={handleAddCustomTicker} style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                <input
                  type="text"
                  placeholder="Sembol ekle (Örn: PLTR, THYAO.IS)..."
                  value={newTickerInput}
                  onChange={(e) => setNewTickerInput(e.target.value)}
                  style={{ 
                    flex: 1, 
                    padding: '5px 8px', 
                    fontSize: 10.5, 
                    background: 'rgba(0,0,0,0.5)', 
                    border: '1px solid rgba(0, 229, 255, 0.3)', 
                    borderRadius: 4, 
                    color: '#fff' 
                  }}
                />
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ fontSize: 10, padding: '4px 8px', display: 'flex', alignItems: 'center', gap: 3 }}
                >
                  <Plus size={12} />
                  <span>Ekle</span>
                </button>
              </form>
            )}

            {/* Scrollable Watchlist Items List */}
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4, paddingRight: 2 }}>
              {currentWatchlistItems.map((item) => {
                const isSelected = currentSymbol === item.ticker || getTradingViewSymbol(currentSymbol) === item.tv;
                const isHolding = portfolioSummary?.enrichedHoldings?.some(h => (h.ticker || '').toUpperCase() === item.ticker.toUpperCase());

                return (
                  <div
                    key={item.ticker}
                    onClick={() => {
                      setCurrentSymbol(item.ticker);
                      if (onSelectTicker) onSelectTicker(item.ticker);
                    }}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '8px 10px',
                      borderRadius: 6,
                      background: isSelected ? 'rgba(0, 229, 255, 0.12)' : 'rgba(255,255,255,0.02)',
                      border: isSelected ? '1px solid var(--cyan)' : '1px solid rgba(255,255,255,0.05)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <strong className="mono" style={{ color: isSelected ? 'var(--cyan)' : '#f8fafc', fontSize: 12 }}>
                          {item.ticker}
                        </strong>
                        {isHolding && (
                          <span className="badge-type hisse" style={{ fontSize: 8.5, padding: '1px 5px' }}>
                            Portföyde
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 9.5, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 1 }}>
                        {item.name}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                      <span className="mono" style={{ fontSize: 9, color: 'var(--text-muted)' }}>
                        {item.tv.split(':')[0]}
                      </span>
                      {activeCategory === 'custom' && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveCustomTicker(item.ticker);
                          }}
                          style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 2 }}
                          title="Listeden Kaldır"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

              {currentWatchlistItems.length === 0 && (
                <div style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--text-muted)', fontSize: 11 }}>
                  Bu kriterde varlık bulunamadı.
                </div>
              )}
            </div>

            {/* Watchlist Footer Note */}
            <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.08)', fontSize: 9.5, color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>💡 Tıklayarak grafiğe aktarın</span>
              <span className="text-cyan font-bold">{currentSymbol}</span>
            </div>
          </div>
        )}

      </div>

    </div>
  );
}
