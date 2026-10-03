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
  Maximize2,
  Minimize2,
  Sliders,
  AlertTriangle,
  BarChart3,
  X,
  Target,
  Check,
  Percent
} from 'lucide-react';
import { Line, Bar } from 'react-chartjs-2';
import stocksData from '../data/stocksData.json';
import potentialStocksData from '../data/potentialStocksData.json';
import benchmarkData from '../data/benchmarkData.json';

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
  if (clean === 'LDO' || clean === 'LDOUSDT' || clean === 'LDO-USD') return 'BINANCE:LDOUSDT';
  if (clean === 'BIO' || clean === 'BIOUSDT' || clean === 'BIO-USD' || clean === 'BIO34812-USD') return 'MEXC:BIO_USDT';
  if (clean === 'SUI' || clean === 'SUIUSDT' || clean === 'SUI-USD' || clean === 'SUI20947-USD') return 'BINANCE:SUIUSDT';
  if (clean === 'OP' || clean === 'OPUSDT' || clean === 'OP-USD') return 'BINANCE:OPUSDT';
  if (clean === 'ARKM' || clean === 'ARKMUSDT' || clean === 'ARKM-USD') return 'BINANCE:ARKMUSDT';
  if (clean === 'DOGE' || clean === 'DOGEUSDT' || clean === 'DOGE-USD') return 'BINANCE:DOGEUSDT';
  if (clean === 'XAUT' || clean === 'XAUT-USD') return 'BITFINEX:XAUTUSD';

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

  // Stocks & ETFs with clean symbols or verified exchanges
  if (clean === 'SPCX') return 'SPCX';
  if (clean === 'CUSD') return 'AMEX:CUSD';
  if (clean === 'DRAM') return 'DRAM';
  if (clean === 'SOXX') return 'NASDAQ:SOXX';
  if (clean === 'SMH') return 'NASDAQ:SMH';
  if (clean === 'QQQ') return 'NASDAQ:QQQ';
  if (clean === 'SPY') return 'AMEX:SPY';
  if (clean === 'IWM') return 'AMEX:IWM';
  if (clean === 'TLT') return 'NASDAQ:TLT';
  if (clean === 'GLD') return 'AMEX:GLD';
  if (clean === 'URA') return 'AMEX:URA';
  if (clean === 'XLE') return 'AMEX:XLE';
  if (clean === 'XLK') return 'AMEX:XLK';
  if (clean === 'BOTZ') return 'NASDAQ:BOTZ';

  // NYSE Known Symbols
  const nyseKnown = ['TSM', 'ABBV', 'XOM', 'VRT', 'DIA', 'KO', 'DIS', 'NKE', 'JNJ', 'PFE', 'UNH', 'JPM', 'V', 'MA', 'WMT'];
  if (nyseKnown.includes(clean)) {
    return `NYSE:${clean}`;
  }

  // Default to NASDAQ for US tech / growth equities
  return `NASDAQ:${clean}`;
}

// Available indicator studies list
const AVAILABLE_STUDIES = [
  { id: 'STD;EMA', name: 'EMA', fullName: 'Üstel Hareketli Ortalama' },
  { id: 'STD;RSI', name: 'RSI', fullName: 'Göreceli Güç Endeksi' },
  { id: 'STD;MACD', name: 'MACD', fullName: 'MACD Momentum' },
  { id: 'STD;Bollinger_Bands', name: 'Bollinger', fullName: 'Bollinger Bantları' },
  { id: 'STD;VWAP', name: 'VWAP', fullName: 'Hacim Ağırlıklı Ort.' }
];

// Preset Watchlists Catalog with user's core holdings integrated
const PRESET_WATCHLISTS = {
  us_stocks: [
    { ticker: 'SPCX', name: 'Space Exploration Tech Corp', desc: 'Portföy Çekirdek ABD Hissesi • 2.22 Lot', tv: 'SPCX', isHolding: true },
    { ticker: 'NVDA', name: 'Nvidia Corp', desc: 'AI Çip & Veri Merkezi Lideri', tv: 'NASDAQ:NVDA' },
    { ticker: 'TSM', name: 'TSMC', desc: 'Küresel Çip Dökümhane Tekeli', tv: 'NYSE:TSM' },
    { ticker: 'VRT', name: 'Vertiv Holdings Co', desc: 'AI Sıvı Soğutma Altyapı Tekeli', tv: 'NYSE:VRT' },
    { ticker: 'ALAB', name: 'Astera Labs Inc', desc: 'AI Çip PCIe/CXL Bağlantı Lideri', tv: 'NASDAQ:ALAB' },
    { ticker: 'ABBV', name: 'AbbVie Inc', desc: 'Biyofarma & Temettü Devi', tv: 'NYSE:ABBV' },
    { ticker: 'XOM', name: 'Exxon Mobil', desc: 'Entegre Enerji & Nakit Akışı', tv: 'NYSE:XOM' },
    { ticker: 'AAPL', name: 'Apple Inc', desc: 'Tüketici Elektroniği & Ekosistem', tv: 'NASDAQ:AAPL' },
    { ticker: 'MSFT', name: 'Microsoft Corp', desc: 'Bulut Bilişim & Kurumsal AI', tv: 'NASDAQ:MSFT' },
    { ticker: 'GOOGL', name: 'Alphabet Inc', desc: 'Arama Motoru, Bulut & AI', tv: 'NASDAQ:GOOGL' },
    { ticker: 'AMZN', name: 'Amazon.com', desc: 'E-Ticaret & AWS Bulut Lideri', tv: 'NASDAQ:AMZN' },
    { ticker: 'META', name: 'Meta Platforms', desc: 'Sosyal Ağlar & Llama AI', tv: 'NASDAQ:META' },
    { ticker: 'AMD', name: 'Advanced Micro Devices', desc: 'x86 CPU & MI300 Hızlandırıcı', tv: 'NASDAQ:AMD' },
    { ticker: 'PLTR', name: 'Palantir Technologies', desc: 'Savunma & Kurumsal AI Sistemi', tv: 'NASDAQ:PLTR' },
    { ticker: 'TSLA', name: 'Tesla Inc', desc: 'Elektrikli Araç, FSD & Otonomi', tv: 'NASDAQ:TSLA' }
  ],
  etf: [
    { ticker: 'DRAM', name: 'Roundhill Memory & Tech ETF', desc: 'Portföyünüzün ETF Varlığı • 3.50 Lot', tv: 'DRAM', isHolding: true },
    { ticker: 'CUSD', name: 'CrossingBridge Ultra-Short', desc: 'Ultra Kısa Vadeli Tahvil & Getiri Sepeti', tv: 'AMEX:CUSD' },
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
    { ticker: 'BYDNR.IS', name: 'Baydöner Restoranları', desc: 'Portföy BIST Hisseniz • 5,358 Lot • Maliyet: ₺37.63', tv: 'BIST:BYDNR', isHolding: true },
    { ticker: 'TUPRS.IS', name: 'Tüpraş Rafinerileri', desc: 'Stratejik Rafinaj & Temettü Devi', tv: 'BIST:TUPRS' },
    { ticker: 'THYAO.IS', name: 'Türk Hava Yolları', desc: 'Küresel Havacılık & Yolcu Lideri', tv: 'BIST:THYAO' },
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
    { ticker: 'BTCUSDT', name: 'Bitcoin (Portföyde)', desc: 'Portföy Kripto • 0.0039 Lot • Maliyet: ₺2.77M', tv: 'BINANCE:BTCUSDT', isHolding: true },
    { ticker: 'ETHUSDT', name: 'Ethereum (Portföyde)', desc: 'Portföy Kripto • 0.143 Lot • Maliyet: ₺82.75K', tv: 'BINANCE:ETHUSDT', isHolding: true },
    { ticker: 'LDOUSDT', name: 'Lido DAO (Portföyde)', desc: 'Portföy Kripto • 140.5 Lot • Maliyet: ₺48.04', tv: 'BINANCE:LDOUSDT', isHolding: true },
    { ticker: 'SUIUSDT', name: 'SUI Network (Portföyde)', desc: 'Portföy Kripto • 52 Lot • Maliyet: ₺143.76', tv: 'BINANCE:SUIUSDT', isHolding: true },
    { ticker: 'OPUSDT', name: 'Optimism (Portföyde)', desc: 'Portföy Kripto • 252 Lot • Maliyet: ₺32.34', tv: 'BINANCE:OPUSDT', isHolding: true },
    { ticker: 'ARKMUSDT', name: 'Arkham (Portföyde)', desc: 'Portföy Kripto • 150.5 Lot • Maliyet: ₺27.06', tv: 'BINANCE:ARKMUSDT', isHolding: true },
    { ticker: 'DOGEUSDT', name: 'Dogecoin (Portföyde)', desc: 'Portföy Kripto • 309 Lot • Maliyet: ₺12.51', tv: 'BINANCE:DOGEUSDT', isHolding: true },
    { ticker: 'TOTAL', name: 'Kripto Toplam Piyasa Değeri', desc: 'Tüm Kripto Ekosisteminin Toplam Hacmi', tv: 'CRYPTOCAP:TOTAL' },
    { ticker: 'TOTAL2', name: 'Toplam Piyasa (BTC Hariç)', desc: 'Bitcoin Hariç Tüm Ekosistem Büyüklüğü', tv: 'CRYPTOCAP:TOTAL2' },
    { ticker: 'TOTAL3', name: 'Altcoin Sezon Barometresi', desc: 'BTC & ETH Hariç Tüm Altcoinler', tv: 'CRYPTOCAP:TOTAL3' },
    { ticker: 'OTHERS', name: 'Diğer Küçük/Orta Altcoinler', desc: 'Top 10 Hariç Asimetrik Fırsat Endeksi', tv: 'CRYPTOCAP:OTHERS' },
    { ticker: 'TOTALDEFI', name: 'DeFi Ekosistem Toplamı', desc: 'Merkeziyetsiz Finans Protokol Büyüklüğü', tv: 'CRYPTOCAP:TOTALDEFI' },
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
  const { portfolioSummary, currentCurrency, usdtry } = useApp();
  const isTRY = currentCurrency === 'try';
  const sym = isTRY ? '₺' : '$';

  const fmt = (v, d = 2) => (Number(v) || 0).toLocaleString('tr-TR', { minimumFractionDigits: d, maximumFractionDigits: d });

  // Current active symbol on chart
  const [currentSymbol, setCurrentSymbol] = useState(() => {
    return selectedTicker || 'SPCX';
  });

  // Watchlist Active Category
  const [activeCategory, setActiveCategory] = useState('portfolio');
  const [searchQuery, setSearchQuery] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [hideHud, setHideHud] = useState(false);
  const [chartEngineMode, setChartEngineMode] = useState('tv'); // 'tv' (TradingView) | 'native' (Bloomberg Canvas)
  const [customTickers, setCustomTickers] = useState(() => {
    try {
      const saved = localStorage.getItem('custom_watchlist_tickers');
      return saved ? JSON.parse(saved) : ['VRT', 'ALAB', 'PLTR', 'THYAO.IS', 'TOTAL3'];
    } catch {
      return ['VRT', 'ALAB', 'PLTR', 'THYAO.IS', 'TOTAL3'];
    }
  });
  const [newTickerInput, setNewTickerInput] = useState('');

  // User-Configured Active Indicators (Studies) with LocalStorage persistence
  // Default to ONLY 2 indicators (EMA and RSI) to leave free quota room for user in TradingView!
  const [activeStudies, setActiveStudies] = useState(() => {
    try {
      const saved = localStorage.getItem('pro_chart_active_studies');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {}
    return ['STD;EMA', 'STD;RSI'];
  });

  // Toggle study on/off and persist
  const toggleStudy = (studyId) => {
    setActiveStudies(prev => {
      let next;
      if (prev.includes(studyId)) {
        next = prev.filter(s => s !== studyId);
      } else {
        next = [...prev, studyId];
      }
      try {
        localStorage.setItem('pro_chart_active_studies', JSON.stringify(next));
      } catch (e) {}
      return next;
    });
  };

  // Fullscreen State & Ref
  const chartWrapperRef = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Toggle true browser fullscreen
  const toggleFullscreen = () => {
    if (!chartWrapperRef.current) return;
    if (!document.fullscreenElement) {
      chartWrapperRef.current.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch(err => {
        console.warn('Fullscreen error:', err);
      });
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      }).catch(err => {
        console.warn('Exit fullscreen error:', err);
      });
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

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

  // Robust Portfolio Items: Merges active Firestore holdings with benchmarkData fallback
  const portfolioItems = useMemo(() => {
    const list = (portfolioSummary?.enrichedHoldings && portfolioSummary.enrichedHoldings.length > 0)
      ? portfolioSummary.enrichedHoldings
      : (benchmarkData?.holdings || []);

    return list.map(h => {
      const symIcon = h.currency === 'TRY' ? '₺' : '$';
      const costPerShare = Number(h.avg_cost) || (h.costTRY ? (h.costTRY / (Number(h.shares) || 1)) : 0);
      const isHoldingTRY = h.currency === 'TRY';
      const currentPr = isHoldingTRY ? (h.livePriceTRY || h.current_price || 0) : (h.livePriceUSD || h.current_price || 0);
      const retPct = h.returnPct !== undefined ? h.returnPct : (costPerShare > 0 ? ((currentPr - costPerShare) / costPerShare * 100) : 0);

      let typeBadge = 'Hisse';
      if (h.type === 'ETF' || h.ticker === 'DRAM') typeBadge = 'ETF';
      else if (h.type === 'Kripto' || h.ticker.includes('-USD') || ['BTC', 'ETH', 'LDO', 'BIO', 'SUI', 'OP', 'ARKM', 'DOGE'].includes(h.ticker.replace('-USD', ''))) typeBadge = 'Kripto';
      else if (h.type === 'Altın' || h.ticker.includes('XAUT')) typeBadge = 'Altın';
      else if (h.ticker.endsWith('.IS') || h.ticker === 'BYDNR') typeBadge = 'BIST';

      return {
        ticker: h.ticker,
        cleanTicker: h.clean_ticker || h.ticker,
        name: h.name || (h.ticker === 'SPCX' ? 'Space Exploration Tech Corp' : h.ticker),
        type: typeBadge,
        shares: Number(h.shares) || 0,
        avgCost: costPerShare,
        currentPrice: currentPr,
        returnPct: retPct,
        currency: h.currency || (h.ticker.endsWith('.IS') ? 'TRY' : 'USD'),
        desc: `${h.shares} Lot • Maliyet: ${symIcon}${fmt(costPerShare, 2)} • K/Z: ${retPct >= 0 ? '+' : ''}${fmt(retPct, 2)}%`,
        tv: getTradingViewSymbol(h.ticker),
        holding: h,
        isHolding: true
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

  // Clean identifier for active symbol
  const cleanActiveTicker = useMemo(() => {
    return currentSymbol
      .replace('.IS', '')
      .replace('BIST:', '')
      .replace('NASDAQ:', '')
      .replace('NYSE:', '')
      .replace('AMEX:', '')
      .replace('BINANCE:', '')
      .replace('CRYPTOCAP:', '')
      .replace('CAPITALCOM:', '')
      .replace('CBOE:', '')
      .replace('TVC:', '')
      .replace('OANDA:', '')
      .replace('FX_IDC:', '')
      .replace('-USD', '')
      .toUpperCase();
  }, [currentSymbol]);

  // Check if currentSymbol is in the user's holdings
  const activeHolding = useMemo(() => {
    return portfolioItems.find(item => {
      const itClean = (item.ticker || '').replace('.IS', '').replace('-USD', '').toUpperCase();
      return itClean === cleanActiveTicker || (item.cleanTicker || '').toUpperCase() === cleanActiveTicker;
    })?.holding || null;
  }, [cleanActiveTicker, portfolioItems]);

  // Check if symbol is a BIST stock
  const isBistStock = useMemo(() => {
    const clean = currentSymbol.toUpperCase();
    return clean.endsWith('.IS') || clean.startsWith('BIST:') || [
      'BYDNR', 'TUPRS', 'THYAO', 'ASELS', 'EREGL', 'KCHOL', 'BIMAS', 'SISE', 
      'FROTO', 'ASTOR', 'SAHOL', 'GARAN', 'AKBNK', 'YKBNK', 'ISCTR', 'PGSUS', 'TCELL'
    ].includes(cleanActiveTicker);
  }, [currentSymbol, cleanActiveTicker]);

  // Native stock data (for Bloomberg canvas fallback)
  const nativeStockData = useMemo(() => {
    return stocksData[cleanActiveTicker] || stocksData[currentSymbol] || null;
  }, [cleanActiveTicker, currentSymbol]);

  // Comprehensive Buy Zone & Valuation Analysis for Current Symbol
  const buyZoneAnalysis = useMemo(() => {
    const sData = stocksData[cleanActiveTicker];
    const potData = potentialStocksData?.stocks?.find(s => s.ticker === cleanActiveTicker);

    const hasHolding = !!activeHolding;
    const holdingCost = hasHolding ? (activeHolding.avg_cost || (activeHolding.costTRY ? (activeHolding.costTRY / (activeHolding.shares || 1)) : 0)) : null;
    const holdingCurrency = activeHolding ? (activeHolding.currency || (activeHolding.ticker.endsWith('.IS') ? 'TRY' : 'USD')) : null;
    const symMark = holdingCurrency === 'TRY' ? '₺' : '$';

    const fairValue = potData?.target_price || sData?.dcf?.fair_value || sData?.analysis?.pillars?.valuation?.target_price || null;
    const quantScore = sData?.analysis?.quant_score || potData?.conviction_score || null;
    const low52w = potData?.low_52w || sData?.candlestick?.low_52w || null;

    let livePrice = 0;
    if (activeHolding) {
      livePrice = holdingCurrency === 'TRY' 
        ? (activeHolding.livePriceTRY || activeHolding.current_price || holdingCost || 0)
        : (activeHolding.livePriceUSD || activeHolding.current_price || holdingCost || 0);
    } else if (potData) {
      livePrice = potData.price || 0;
    } else if (sData) {
      livePrice = sData.candlestick?.current_price || 0;
    }

    // Determine Ideal Buy Zone bounds
    let buyZoneMin = 0;
    let buyZoneMax = 0;
    let zoneStatus = 'neutral';
    let zoneBadge = '🟡 İNCELEME BÖLGESİ';
    let zoneColor = '#f59e0b';
    let zoneAdvice = '';

    if (hasHolding && holdingCost > 0) {
      // For existing holdings, ideal buy zone is under cost or within accumulation range
      buyZoneMin = holdingCost * 0.88;
      buyZoneMax = holdingCost * 1.05;

      const diffPct = ((livePrice - holdingCost) / holdingCost) * 100;
      if (diffPct < -5) {
        zoneStatus = 'discount_buy';
        zoneBadge = '🟢 İSKONTOLU ALIM BÖLGESİ';
        zoneColor = '#10b981';
        zoneAdvice = `Maliyetinizin %${Math.abs(diffPct).toFixed(1)} altında iskontolu işlem görüyor. Ortalama düşürmek ve pozisyon artırmak için cazip bölge.`;
      } else if (diffPct <= 10) {
        zoneStatus = 'accumulation';
        zoneBadge = '🟡 AKÜMÜLASYON / BİRİKTİRME BÖLGESİ';
        zoneColor = '#00e5ff';
        zoneAdvice = `Maliyetinize yakın (%${diffPct.toFixed(1)}) seyrediyor. Kademeli biriktirme veya pozisyon koruma bölgesi.`;
      } else {
        zoneStatus = 'profit_run';
        zoneBadge = '🔵 KÂR TAŞIMA / REBALANCE BÖLGESİ';
        zoneColor = '#38bdf8';
        zoneAdvice = `Maliyetinizin %${diffPct.toFixed(1)} üzerinde kârda seyrediyor. Kâr koruma veya hedef rebalance satışı düşünülebilir.`;
      }
    } else if (fairValue > 0) {
      buyZoneMin = low52w || (fairValue * 0.70);
      buyZoneMax = fairValue * 0.95;

      if (livePrice > 0 && livePrice < fairValue) {
        const upside = ((fairValue - livePrice) / livePrice) * 100;
        zoneStatus = 'undervalued';
        zoneBadge = '🟢 ADİL DEĞER ALTI ALIM FIRSATI';
        zoneColor = '#10b981';
        zoneAdvice = `Hedef/Adil değerin (%${upside.toFixed(1)} potansiyel) altında. Güçlü değerleme koridorunda.`;
      } else {
        zoneStatus = 'fair';
        zoneBadge = '🔴 HEDEF / DİRENÇ BÖLGESİ';
        zoneColor = '#ef4444';
        zoneAdvice = `Fiyat adil değer seviyesine ulaşmış. Yeni alım için geri çekilmeler beklenebilir.`;
      }
    } else {
      zoneAdvice = 'Teknik analiz göstergeleri ve destek direnç çizgileriyle alım seviyeleri takip edilebilir.';
    }

    return {
      hasHolding,
      holdingCost,
      holdingCurrency,
      symMark,
      livePrice,
      fairValue,
      quantScore,
      low52w,
      buyZoneMin,
      buyZoneMax,
      zoneStatus,
      zoneBadge,
      zoneColor,
      zoneAdvice
    };
  }, [cleanActiveTicker, activeHolding]);

  // TradingView Widget Injection
  const containerId = 'tradingview_pro_chart_embed';
  const scriptId = 'tradingview-widget-script';

  useEffect(() => {
    if (chartEngineMode !== 'tv') return;

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
          toolbar_bg: '#040711',
          enable_publishing: false,
          hide_side_toolbar: false, // FULL DRAWING TOOLS on left
          allow_symbol_change: true,
          save_image: true,
          container_id: containerId,
          // Respect user-configured active studies!
          studies: activeStudies
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
  }, [currentSymbol, chartEngineMode, activeStudies]);

  // Native Candlestick/Bar Chart Data for BIST / Local Fallback
  const nativeChartData = useMemo(() => {
    if (!nativeStockData?.candlestick?.candles) return null;
    const candles = nativeStockData.candlestick.candles.slice(-60); // Last 60 days
    return {
      labels: candles.map(c => c.time),
      datasets: [
        {
          type: 'line',
          label: 'Kapanış Fiyatı',
          data: candles.map(c => c.close),
          borderColor: '#00e5ff',
          backgroundColor: 'rgba(0, 229, 255, 0.08)',
          borderWidth: 2,
          pointRadius: 1,
          tension: 0.1,
          yAxisID: 'y'
        },
        {
          type: 'line',
          label: 'SMA 20',
          data: candles.map(c => c.sma20),
          borderColor: '#f59e0b',
          borderWidth: 1.5,
          borderDash: [4, 4],
          pointRadius: 0,
          yAxisID: 'y'
        },
        {
          type: 'line',
          label: 'SMA 50',
          data: candles.map(c => c.sma50),
          borderColor: '#a855f7',
          borderWidth: 1.5,
          borderDash: [6, 4],
          pointRadius: 0,
          yAxisID: 'y'
        },
        {
          type: 'bar',
          label: 'Hacim',
          data: candles.map(c => c.volume),
          backgroundColor: candles.map(c => c.close >= c.open ? 'rgba(16, 185, 129, 0.25)' : 'rgba(239, 68, 68, 0.25)'),
          yAxisID: 'yVolume'
        }
      ]
    };
  }, [nativeStockData]);

  const nativeChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: {
        position: 'top',
        labels: { color: '#94a3b8', font: { size: 10.5 } }
      },
      tooltip: {
        backgroundColor: '#0f172a',
        titleColor: '#e2e8f0',
        borderColor: 'rgba(255,255,255,0.1)',
        borderWidth: 1
      }
    },
    scales: {
      x: {
        grid: { color: 'rgba(255, 255, 255, 0.05)' },
        ticks: { color: '#94a3b8', font: { size: 9.5 } }
      },
      y: {
        position: 'right',
        grid: { color: 'rgba(255, 255, 255, 0.05)' },
        ticks: { color: '#00e5ff', font: { size: 10 } }
      },
      yVolume: {
        position: 'left',
        grid: { display: false },
        ticks: { display: false },
        min: 0
      }
    }
  };

  return (
    <div className="tab-pane-content" style={{ animation: 'fadeIn 0.25s ease', display: 'flex', flexDirection: 'column', gap: 10 }}>
      
      {/* 🌟 Top Pro Header Bar */}
      <div 
        className="card" 
        style={{ 
          padding: '10px 16px', 
          background: 'linear-gradient(135deg, rgba(8, 12, 22, 0.95), rgba(15, 23, 42, 0.95))', 
          border: '1px solid rgba(0, 229, 255, 0.25)', 
          borderRadius: 8,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 10
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(0, 229, 255, 0.12)', border: '1px solid rgba(0, 229, 255, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--cyan)' }}>
            <LineChart size={18} />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 13, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>PRO GRAFİK & TEKNİK ANALİZ İSTASYONU</span>
              <span className="nav-badge cyan" style={{ fontSize: 9 }}>
                {chartEngineMode === 'tv' ? 'TRADINGVIEW ENGINE' : 'BLOOMBERG NATIVE'}
              </span>
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
              Çizim Araçları • Sınırsız İndikatör & Kota Kontrolü • Alım Bölgeleri & Entegre Portföy
            </div>
          </div>
        </div>

        {/* Quick Shortcuts, Indicators, Fullscreen & Watchlist Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          
          {/* Quick Shortcuts */}
          <div style={{ display: 'inline-flex', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, padding: 2 }}>
            {[
              { label: 'SPCX', sym: 'SPCX' },
              { label: 'NVDA', sym: 'NVDA' },
              { label: 'DRAM', sym: 'DRAM' },
              { label: 'BYDNR', sym: 'BYDNR.IS' },
              { label: 'BTC', sym: 'BTCUSDT' },
              { label: 'TOTAL3', sym: 'TOTAL3' },
              { label: 'DXY', sym: 'DXY' },
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
                  fontSize: 9.5, 
                  padding: '3px 7px',
                  fontWeight: currentSymbol === item.sym ? 800 : 600
                }}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Engine Mode Toggle (If native data available) */}
          {nativeStockData && (
            <div style={{ display: 'inline-flex', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(0, 229, 255, 0.3)', borderRadius: 6, padding: 2 }}>
              <button
                type="button"
                className={`chip-btn ${chartEngineMode === 'tv' ? 'active' : ''}`}
                onClick={() => setChartEngineMode('tv')}
                style={{ fontSize: 9.5, padding: '3px 7px' }}
                title="TradingView canlı motoru"
              >
                ⚡ TV
              </button>
              <button
                type="button"
                className={`chip-btn ${chartEngineMode === 'native' ? 'active' : ''}`}
                onClick={() => setChartEngineMode('native')}
                style={{ fontSize: 9.5, padding: '3px 7px' }}
                title="Bloomberg terminali dahili mum grafiği"
              >
                📈 Yerel
              </button>
            </div>
          )}

          {/* ⛶ Real True Fullscreen Button */}
          <button
            type="button"
            onClick={toggleFullscreen}
            className="chip-btn"
            style={{ 
              fontSize: 10, 
              padding: '4px 9px', 
              display: 'flex', 
              alignItems: 'center', 
              gap: 4,
              background: 'rgba(0, 229, 255, 0.1)',
              borderColor: 'var(--cyan)',
              color: 'var(--cyan)',
              fontWeight: 700
            }}
            title="Grafiği tüm ekrana yay (F11 / Native Fullscreen)"
          >
            {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
            <span>{isFullscreen ? 'Küçült' : '⛶ Tam Ekran'}</span>
          </button>

          {/* Toggle Watchlist Sidebar Button */}
          <button
            type="button"
            onClick={() => setSidebarOpen(prev => !prev)}
            className="chip-btn"
            style={{ 
              fontSize: 10, 
              padding: '4px 8px', 
              display: 'flex', 
              alignItems: 'center', 
              gap: 4,
              background: sidebarOpen ? 'rgba(0, 229, 255, 0.12)' : 'transparent',
              borderColor: sidebarOpen ? 'var(--cyan)' : 'rgba(255,255,255,0.1)'
            }}
            title={sidebarOpen ? 'İzleme Listesini Gizle (Geniş Grafik)' : 'İzleme Listesini Aç'}
          >
            <Layers size={13} className="text-cyan" />
            <span>{sidebarOpen ? 'Listeyi Kapat' : 'İzleme Listesi'}</span>
          </button>
        </div>
      </div>

      {/* ⚡ Interactive Indicator Manager Bar (Fixes Bollingers Re-opening & Free Plan Quota) */}
      <div 
        style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          flexWrap: 'wrap', 
          gap: 8, 
          padding: '6px 14px', 
          background: 'rgba(15, 23, 42, 0.65)', 
          border: '1px solid rgba(255,255,255,0.08)', 
          borderRadius: 6 
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <Sliders size={12} className="text-cyan" />
            <span>AKTİF İNDİKATÖRLER:</span>
          </span>
          {AVAILABLE_STUDIES.map(st => {
            const isActive = activeStudies.includes(st.id);
            return (
              <button
                key={st.id}
                type="button"
                onClick={() => toggleStudy(st.id)}
                className={`chip-btn ${isActive ? 'active' : ''}`}
                style={{ 
                  fontSize: 10, 
                  padding: '3px 8px',
                  fontWeight: isActive ? 700 : 500,
                  borderColor: isActive ? 'var(--cyan)' : 'rgba(255,255,255,0.1)'
                }}
                title={`${st.fullName} (Aç/Kapat)`}
              >
                {isActive ? '✓ ' : '+ '}{st.name}
              </button>
            );
          })}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 10, color: 'var(--text-muted)' }}>
          <span 
            className={`nav-badge ${activeStudies.length <= 2 ? 'emerald' : activeStudies.length === 3 ? 'amber' : 'rose'}`}
            style={{ fontSize: 9.5, padding: '2px 7px' }}
            title="TradingView ücretsiz kotası genelde 3 göstergedir. 2 gösterge açıkken manuel 1 gösterge daha ekleyebilirsiniz."
          >
            {activeStudies.length}/3 Kotası ({Math.max(0, 3 - activeStudies.length)} Boş Slot)
          </span>
          <span style={{ fontSize: 9.5 }}>💡 İndikatör tercihiniz tüm hisse geçişlerinde korunur.</span>
        </div>
      </div>

      {/* 🎯 PORTFÖY ALIM BÖLGESİ & MALİYET ANALİZİ HUD */}
      {!hideHud && (
        <div 
          className="card" 
          style={{ 
            padding: '8px 14px', 
            background: buyZoneAnalysis.hasHolding
              ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.12), rgba(6, 78, 59, 0.22))' 
              : 'linear-gradient(135deg, rgba(30, 41, 59, 0.7), rgba(15, 23, 42, 0.8))', 
            border: buyZoneAnalysis.hasHolding 
              ? '1px solid rgba(16, 185, 129, 0.45)' 
              : '1px solid rgba(0, 229, 255, 0.25)', 
            borderRadius: 6,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 10,
            marginBottom: 2,
            position: 'relative',
            zIndex: 10
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 16 }}>{buyZoneAnalysis.hasHolding ? '💼' : '🎯'}</span>
            
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
              <strong className="mono text-bright" style={{ fontSize: 13 }}>
                {cleanActiveTicker}
              </strong>
              
              {buyZoneAnalysis.hasHolding && (
                <>
                  <span className="badge-type hisse" style={{ fontSize: 8.5 }}>
                    Portföyde ({buyZoneAnalysis.hasHolding ? `${activeHolding.shares} Lot` : ''})
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    Alım Maliyetiniz: <strong className="mono text-bright">{buyZoneAnalysis.symMark}{fmt(buyZoneAnalysis.holdingCost, 2)}</strong>
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    Canlı: <strong className="mono text-cyan">{buyZoneAnalysis.symMark}{fmt(buyZoneAnalysis.livePrice, 2)}</strong>
                  </span>
                  {activeHolding.returnPct !== undefined && (
                    <span style={{ fontSize: 11, color: activeHolding.returnPct >= 0 ? 'var(--up)' : 'var(--down)', fontWeight: 700 }}>
                      K/Z: {activeHolding.returnPct >= 0 ? '+' : ''}{fmt(activeHolding.returnPct, 2)}%
                    </span>
                  )}
                </>
              )}

              {/* Buy Zone Status Badge */}
              <span 
                className="nav-badge" 
                style={{ 
                  fontSize: 9.5, 
                  padding: '2px 8px', 
                  backgroundColor: `${buyZoneAnalysis.zoneColor}22`,
                  borderColor: buyZoneAnalysis.zoneColor,
                  color: buyZoneAnalysis.zoneColor,
                  fontWeight: 700
                }}
              >
                {buyZoneAnalysis.zoneBadge}
              </span>

              {/* Fair Value or Target Price if present */}
              {buyZoneAnalysis.fairValue && (
                <span style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>
                  Hedef/Adil Değer: <strong className="mono text-gold">{buyZoneAnalysis.symMark}{fmt(buyZoneAnalysis.fairValue, 2)}</strong>
                </span>
              )}
            </div>

            {/* Strategic Advice Subtext */}
            <div style={{ width: '100%', fontSize: 10, color: 'var(--text-muted)', marginTop: -2, paddingLeft: 26 }}>
              <span>{buyZoneAnalysis.zoneAdvice}</span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {buyZoneAnalysis.quantScore && (
              <span className="nav-badge emerald" style={{ fontSize: 9.5, padding: '2px 7px' }}>
                Quant: {buyZoneAnalysis.quantScore.toFixed(0)}
              </span>
            )}
            <button
              type="button"
              className="btn-action-row buy"
              onClick={() => onOpenAddModal && onOpenAddModal(cleanActiveTicker)}
              style={{ fontSize: 10, padding: '3px 9px' }}
              title="Bu varlıktan ek alım yap"
            >
              + Alım Yap
            </button>
            {buyZoneAnalysis.hasHolding && (
              <button
                type="button"
                className="btn-action-row sell"
                onClick={() => onOpenSellModal && onOpenSellModal(activeHolding)}
                style={{ fontSize: 10, padding: '3px 9px' }}
                title="Kısmi kâr veya satış yap"
              >
                - Kâr Sat
              </button>
            )}
            <button
              type="button"
              onClick={() => setHideHud(true)}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 2, display: 'flex' }}
              title="Şeridi Gizle"
            >
              <X size={13} />
            </button>
          </div>
        </div>
      )}

      {/* 🇹🇷 BIST Symbol Warning & 1-Click Launch Bar */}
      {isBistStock && chartEngineMode === 'tv' && (
        <div 
          style={{ 
            background: 'rgba(245, 158, 11, 0.1)', 
            border: '1px solid rgba(245, 158, 11, 0.35)', 
            borderRadius: 6, 
            padding: '7px 12px', 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            flexWrap: 'wrap', 
            gap: 8,
            marginBottom: 2
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 14 }}>🇹🇷</span>
            <div>
              <strong style={{ color: 'var(--amber)', fontSize: 11 }}>BIST Resmi Veri Bildirimi: </strong>
              <span style={{ fontSize: 10.5, color: '#e2e8f0' }}>
                Borsa İstanbul lisans kuralı gereği, TradingView harici sitelerde BIST grafiklerini sınırlandırır.
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {nativeStockData && (
              <button
                type="button"
                className="chip-btn"
                onClick={() => setChartEngineMode('native')}
                style={{ fontSize: 10, padding: '3px 8px', borderColor: 'var(--cyan)', color: 'var(--cyan)' }}
              >
                📈 Terminal Yerel Grafiğinde Göster
              </button>
            )}
            <a
              href={`https://tr.tradingview.com/chart/?symbol=BIST:${cleanActiveTicker}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary"
              style={{
                fontSize: 10,
                padding: '3px 10px',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                background: 'linear-gradient(135deg, #d97706, #f59e0b)',
                color: '#000',
                fontWeight: 800
              }}
            >
              <ExternalLink size={11} />
              <span>TradingView'da Tam Aç ➔</span>
            </a>
          </div>
        </div>
      )}

      {/* 📊 Main Workspace: Chart (Left) + Sınırsız Watchlist Sidebar (Right) */}
      <div 
        ref={chartWrapperRef}
        style={{ 
          display: 'grid', 
          gridTemplateColumns: sidebarOpen ? '1fr 340px' : '1fr', 
          gap: 12, 
          alignItems: 'stretch',
          position: isFullscreen ? 'fixed' : 'relative',
          inset: isFullscreen ? 0 : 'auto',
          zIndex: isFullscreen ? 99999 : 1,
          background: isFullscreen ? '#040711' : 'transparent',
          padding: isFullscreen ? 14 : 0,
          width: isFullscreen ? '100vw' : '100%',
          height: isFullscreen ? '100vh' : 'auto'
        }}
      >
        
        {/* Left: The Official TradingView Advanced Chart / Native Canvas Container */}
        <div 
          className="card" 
          style={{ 
            padding: 0, 
            background: '#040711', 
            border: '1px solid var(--border)', 
            borderRadius: 8, 
            minHeight: isFullscreen ? 'calc(100vh - 28px)' : 720,
            height: isFullscreen ? 'calc(100vh - 28px)' : 'calc(100vh - 210px)',
            display: 'flex',
            flexDirection: 'column',
            position: 'relative'
          }}
        >
          {/* 🌟 Fullscreen Interactive Top Floating Toolbar (Enables Stock & Indicator Switching without exiting fullscreen) */}
          {isFullscreen && (
            <div 
              style={{ 
                position: 'absolute', 
                top: 10, 
                left: 14, 
                right: 14, 
                zIndex: 9999, 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                background: 'rgba(8, 12, 22, 0.95)', 
                padding: '6px 12px', 
                borderRadius: 8, 
                border: '1px solid rgba(0, 229, 255, 0.35)',
                backdropFilter: 'blur(8px)',
                flexWrap: 'wrap',
                gap: 8
              }}
            >
              {/* Active Ticker & Quick Switches */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className="mono font-bold text-cyan" style={{ fontSize: 13 }}>
                  {cleanActiveTicker}
                </span>
                {buyZoneAnalysis.hasHolding && (
                  <span className="badge-type hisse" style={{ fontSize: 9 }}>
                    Maliyet: {buyZoneAnalysis.symMark}{fmt(buyZoneAnalysis.holdingCost, 2)} ({activeHolding.shares} Lot)
                  </span>
                )}
                <div style={{ display: 'inline-flex', gap: 4 }}>
                  {['SPCX', 'NVDA', 'BYDNR.IS', 'DRAM', 'BTCUSDT', 'TOTAL3'].map(symCode => (
                    <button
                      key={symCode}
                      type="button"
                      onClick={() => {
                        setCurrentSymbol(symCode);
                        if (onSelectTicker) onSelectTicker(symCode);
                      }}
                      className={`chip-btn ${currentSymbol === symCode ? 'active' : ''}`}
                      style={{ fontSize: 9, padding: '2px 6px' }}
                    >
                      {symCode.replace('.IS', '').replace('USDT', '')}
                    </button>
                  ))}
                </div>
              </div>

              {/* Indicator Controls & Exit Controls */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ display: 'inline-flex', gap: 4 }}>
                  {AVAILABLE_STUDIES.map(st => {
                    const isActive = activeStudies.includes(st.id);
                    return (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() => toggleStudy(st.id)}
                        className={`chip-btn ${isActive ? 'active' : ''}`}
                        style={{ fontSize: 9, padding: '2px 6px' }}
                      >
                        {isActive ? '✓ ' : '+ '}{st.name}
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={() => setSidebarOpen(prev => !prev)}
                  className="chip-btn"
                  style={{ 
                    fontSize: 9.5, 
                    padding: '3px 8px', 
                    background: sidebarOpen ? 'rgba(0, 229, 255, 0.15)' : 'transparent',
                    borderColor: 'var(--cyan)',
                    color: 'var(--cyan)'
                  }}
                  title="Tam ekranda yan paneldeki tüm hisseleri açıp kapatın"
                >
                  <Layers size={11} style={{ marginRight: 3 }} />
                  <span>{sidebarOpen ? 'Listeyi Gizle' : 'Listeyi Aç'}</span>
                </button>

                <button
                  type="button"
                  onClick={toggleFullscreen}
                  className="chip-btn"
                  style={{ fontSize: 9.5, padding: '3px 9px', background: '#ef4444', color: '#fff', borderColor: '#ef4444', fontWeight: 700 }}
                  title="Tam Ekrandan Çık (ESC)"
                >
                  ✕ Çık (ESC)
                </button>
              </div>
            </div>
          )}

          {/* 1. TRADINGVIEW WIDGET ENGINE */}
          {chartEngineMode === 'tv' && (
            <div 
              id={containerId} 
              style={{ 
                width: '100%', 
                height: '100%', 
                minHeight: 700, 
                flex: 1, 
                paddingTop: isFullscreen ? 44 : 0 
              }} 
            />
          )}

          {/* 2. BLOOMBERG NATIVE CANVAS ENGINE (For BIST / Offline Fallback) */}
          {chartEngineMode === 'native' && nativeChartData && (
            <div style={{ padding: 16, height: '100%', display: 'flex', flexDirection: 'column', paddingTop: isFullscreen ? 50 : 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div>
                  <strong className="mono" style={{ fontSize: 16, color: 'var(--cyan)' }}>
                    {nativeStockData.ticker} - {nativeStockData.candlestick?.name}
                  </strong>
                  <span style={{ marginLeft: 10, fontSize: 12, color: 'var(--text-muted)' }}>
                    Canlı Fiyat: <strong>₺{fmt(nativeStockData.candlestick?.current_price, 2)}</strong> ({fmt(nativeStockData.candlestick?.day_change_pct, 2)}%)
                  </span>
                </div>
                <button
                  type="button"
                  className="chip-btn"
                  onClick={() => setChartEngineMode('tv')}
                  style={{ fontSize: 10, padding: '3px 8px' }}
                >
                  ⚡ TradingView Motoruna Dön
                </button>
              </div>
              <div style={{ flex: 1, minHeight: 600 }}>
                <Line data={nativeChartData} options={nativeChartOptions} />
              </div>
            </div>
          )}
        </div>

        {/* Right: Sınırsız Watchlist Yöneticisi (Works in BOTH Fullscreen and Normal modes) */}
        {sidebarOpen && (
          <div 
            className="card" 
            style={{ 
              padding: '12px', 
              background: '#080c16', 
              border: '1px solid var(--border)', 
              borderRadius: 8, 
              display: 'flex', 
              flexDirection: 'column',
              minHeight: isFullscreen ? 'calc(100vh - 28px)' : 720,
              height: isFullscreen ? 'calc(100vh - 28px)' : 'calc(100vh - 210px)',
              overflow: 'hidden'
            }}
          >
            {/* Watchlist Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div style={{ fontWeight: 800, fontSize: 12, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Star size={14} className="text-gold" />
                <span>İZLEME LİSTELERİ</span>
              </div>
              <span className="nav-badge cyan" style={{ fontSize: 9 }}>
                {currentWatchlistItems.length} Varlık
              </span>
            </div>

            {/* 🔽 1. Downward Dropdown Category Selector */}
            <div style={{ marginBottom: 6 }}>
              <select
                value={activeCategory}
                onChange={(e) => setActiveCategory(e.target.value)}
                style={{
                  width: '100%',
                  padding: '6px 10px',
                  fontSize: 11,
                  fontWeight: 700,
                  background: '#040711',
                  border: '1px solid rgba(0, 229, 255, 0.35)',
                  borderRadius: 6,
                  color: 'var(--cyan)',
                  cursor: 'pointer',
                  outline: 'none'
                }}
              >
                <option value="portfolio">💼 Portföyüm ({portfolioItems.length} Varlık - Tam Liste)</option>
                <option value="us_stocks">📈 ABD Hisse (SPCX, NVDA, TSM, VRT... {PRESET_WATCHLISTS.us_stocks.length})</option>
                <option value="etf">🏛️ ETF Sepeti (DRAM, SOXX, QQQ... {PRESET_WATCHLISTS.etf.length})</option>
                <option value="bist">🇹🇷 BIST 100 (BYDNR, TUPRS, THYAO... {PRESET_WATCHLISTS.bist.length})</option>
                <option value="crypto">⚡ Kripto & TOTAL3 ({PRESET_WATCHLISTS.crypto.length} Varlık)</option>
                <option value="macro">🌐 Genel Makro & Emtia ({PRESET_WATCHLISTS.macro.length} Varlık)</option>
                <option value="custom">⭐ Özel Listem ({customTickers.length} Varlık)</option>
              </select>
            </div>

            {/* 🔽 2. Quick 4-Pill Shortcut Bar */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 3, marginBottom: 8 }}>
              {[
                { id: 'portfolio', label: '💼 Portföy' },
                { id: 'us_stocks', label: '📈 ABD' },
                { id: 'crypto', label: '⚡ Kripto' },
                { id: 'custom', label: '⭐ Özel' }
              ].map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setActiveCategory(p.id)}
                  className={`chip-btn ${activeCategory === p.id ? 'active' : ''}`}
                  style={{ fontSize: 9, padding: '2px 4px', textAlign: 'center' }}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Search Filter within Category */}
            <div style={{ position: 'relative', marginBottom: 8 }}>
              <Search size={12} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Bu listede ara (Sembol, Ad)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ 
                  width: '100%', 
                  padding: '5px 8px 5px 26px', 
                  fontSize: 10.5, 
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
                    fontSize: 10, 
                    background: 'rgba(0,0,0,0.5)', 
                    border: '1px solid rgba(0, 229, 255, 0.3)', 
                    borderRadius: 4, 
                    color: '#fff' 
                  }}
                />
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ fontSize: 9.5, padding: '3px 8px', display: 'flex', alignItems: 'center', gap: 3 }}
                >
                  <Plus size={11} />
                  <span>Ekle</span>
                </button>
              </form>
            )}

            {/* Scrollable Watchlist Items List */}
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4, paddingRight: 2 }}>
              {currentWatchlistItems.map((item) => {
                const isSelected = currentSymbol === item.ticker || getTradingViewSymbol(currentSymbol) === item.tv;
                const isUserHolding = item.isHolding || portfolioItems.some(h => (h.ticker || '').toUpperCase() === (item.ticker || '').toUpperCase());

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
                      padding: '7px 9px',
                      borderRadius: 6,
                      background: isSelected 
                        ? 'rgba(0, 229, 255, 0.12)' 
                        : isUserHolding 
                        ? 'rgba(16, 185, 129, 0.04)' 
                        : 'rgba(255,255,255,0.02)',
                      border: isSelected 
                        ? '1px solid var(--cyan)' 
                        : isUserHolding 
                        ? '1px solid rgba(16, 185, 129, 0.25)' 
                        : '1px solid rgba(255,255,255,0.05)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <strong className="mono" style={{ color: isSelected ? 'var(--cyan)' : isUserHolding ? '#34d399' : '#f8fafc', fontSize: 11.5 }}>
                          {item.ticker}
                        </strong>
                        {isUserHolding && (
                          <span className="badge-type hisse" style={{ fontSize: 8, padding: '1px 4px' }}>
                            Portföyde
                          </span>
                        )}
                        {item.type && activeCategory === 'portfolio' && (
                          <span className="mono" style={{ fontSize: 8, color: 'var(--text-muted)' }}>
                            [{item.type}]
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 9.5, color: isUserHolding ? '#94a3b8' : 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 1 }}>
                        {item.desc || item.name}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
                      <span className="mono" style={{ fontSize: 8.5, color: 'var(--text-muted)' }}>
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
                          <Trash2 size={11} />
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
            <div style={{ marginTop: 6, paddingTop: 6, borderTop: '1px solid rgba(255,255,255,0.08)', fontSize: 9, color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>💡 Tıkla ➔ Grafiğe Al</span>
              <span className="text-cyan font-bold mono">{cleanActiveTicker}</span>
            </div>
          </div>
        )}

      </div>

    </div>
  );
}
