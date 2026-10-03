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
  ExternalLink, 
  Maximize2, 
  Minimize2, 
  Sliders, 
  AlertTriangle, 
  X, 
  Clock
} from 'lucide-react';
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

  // Crypto Market Caps
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

  // Stocks & ETFs
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

// Available indicator studies list for TradingView
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
    { ticker: 'AMZN', name: 'Amazon.com Inc', desc: 'AWS Bulut & E-Ticaret', tv: 'NASDAQ:AMZN' },
    { ticker: 'GOOGL', name: 'Alphabet Inc', desc: 'Arama & Google Cloud AI', tv: 'NASDAQ:GOOGL' },
    { ticker: 'META', name: 'Meta Platforms', desc: 'Sosyal Ağlar & Llama AI', tv: 'NASDAQ:META' },
    { ticker: 'PLTR', name: 'Palantir Technologies', desc: 'Kurumsal Yapay Zeka & Savunma', tv: 'NYSE:PLTR' },
    { ticker: 'AMD', name: 'Advanced Micro Devices', desc: 'CPU & Veri Merkezi GPU', tv: 'NASDAQ:AMD' },
    { ticker: 'AVGO', name: 'Broadcom Inc', desc: 'Özel ASIC AI Çipleri & Ağ', tv: 'NASDAQ:AVGO' },
    { ticker: 'ARM', name: 'Arm Holdings plc', desc: 'Düşük Güçlü Çip Mimarisi', tv: 'NASDAQ:ARM' },
    { ticker: 'ASML', name: 'ASML Holding NV', desc: 'EUV Litografi Tekeli', tv: 'NASDAQ:ASML' },
    { ticker: 'MU', name: 'Micron Technology', desc: 'HBM Yüksek Bant Bellek', tv: 'NASDAQ:MU' },
    { ticker: 'CRWD', name: 'CrowdStrike Holdings', desc: 'Uç Nokta Siber Güvenlik', tv: 'NASDAQ:CRWD' },
    { ticker: 'SNOW', name: 'Snowflake Inc', desc: 'Veri Bulutu & Veri Deposu', tv: 'NYSE:SNOW' }
  ],
  etf: [
    { ticker: 'DRAM', name: 'D-RAM Bellek Teknoloji ETF', desc: 'Portföy ETF Varlığı • 5.00 Lot', tv: 'DRAM', isHolding: true },
    { ticker: 'CUSD', name: 'Coinbase USD Yield ETF', desc: 'Portföy Nakit Getiri Fonu', tv: 'AMEX:CUSD', isHolding: true },
    { ticker: 'SOXX', name: 'iShares Semiconductor ETF', desc: 'ABD Yarı İletken Sektör Sepeti', tv: 'NASDAQ:SOXX' },
    { ticker: 'SMH', name: 'VanEck Semiconductor ETF', desc: 'En Büyük Yarı İletken Şirketleri', tv: 'NASDAQ:SMH' },
    { ticker: 'QQQ', name: 'Invesco QQQ Trust', desc: 'Nasdaq 100 Teknoloji Endeksi', tv: 'NASDAQ:QQQ' },
    { ticker: 'SPY', name: 'SPDR S&P 500 ETF', desc: 'S&P 500 Gösterge Endeksi', tv: 'AMEX:SPY' },
    { ticker: 'IWM', name: 'iShares Russell 2000 ETF', desc: 'ABD Küçük Ölçekli (Small Cap) Şirketler', tv: 'AMEX:IWM' },
    { ticker: 'BOTZ', name: 'Global X Robotics & AI ETF', desc: 'Robotik & Yapay Zeka Şirketleri', tv: 'NASDAQ:BOTZ' },
    { ticker: 'XLK', name: 'Technology Select Sector SPDR', desc: 'S&P Teknoloji Sektör Fonu', tv: 'AMEX:XLK' },
    { ticker: 'XLE', name: 'Energy Select Sector SPDR', desc: 'S&P Enerji Sektör Fonu', tv: 'AMEX:XLE' },
    { ticker: 'URA', name: 'Global X Uranium ETF', desc: 'Uranyum & Nükleer Enerji Şirketleri', tv: 'AMEX:URA' },
    { ticker: 'GLD', name: 'SPDR Gold Shares', desc: 'Fiziki Altın Fonu', tv: 'AMEX:GLD' },
    { ticker: 'TLT', name: 'iShares 20+ Year Treasury', desc: 'ABD Uzun Vadeli Hazine Tahvilleri', tv: 'NASDAQ:TLT' }
  ],
  bist: [
    { ticker: 'BYDNR.IS', name: 'Baydöner Restoranları', desc: 'Portföy BIST Hissesi • 10.00 Lot', tv: 'BIST:BYDNR', isHolding: true },
    { ticker: 'TUPRS.IS', name: 'Tüpraş Rafineri', desc: 'Portföy BIST Temettü Devi • 1.00 Lot', tv: 'BIST:TUPRS', isHolding: true },
    { ticker: 'THYAO.IS', name: 'Türk Hava Yolları', desc: 'Havacılık & Global Kargo Lideri', tv: 'BIST:THYAO' },
    { ticker: 'ASELS.IS', name: 'Aselsan Elektronik Sanayi', desc: 'Savunma Sanayii & Radar Teknolojileri', tv: 'BIST:ASELS' },
    { ticker: 'EREGL.IS', name: 'Ereğli Demir Çelik', desc: 'Yassı Çelik & Sanayi Devi', tv: 'BIST:EREGL' },
    { ticker: 'KCHOL.IS', name: 'Koç Holding', desc: 'Türkiye’nin En Büyük Sanayi Topluluğu', tv: 'BIST:KCHOL' },
    { ticker: 'BIMAS.IS', name: 'BİM Birleşik Mağazalar', desc: 'Defansif Perakende & Nakit Akışı', tv: 'BIST:BIMAS' },
    { ticker: 'SISE.IS', name: 'Şişecam Cam Sanayii', desc: 'Global Cam Üretim Lideri', tv: 'BIST:SISE' },
    { ticker: 'FROTO.IS', name: 'Ford Otosan', desc: 'Ticari Araç İhracat Şampiyonu', tv: 'BIST:FROTO' },
    { ticker: 'ASTOR.IS', name: 'Astor Enerji', desc: 'Transformatör & Şebeke Ekipmanları', tv: 'BIST:ASTOR' },
    { ticker: 'SAHOL.IS', name: 'Sabancı Holding', desc: 'Enerji, Banka ve Sanayi Portföyü', tv: 'BIST:SAHOL' },
    { ticker: 'GARAN.IS', name: 'Garanti BBVA', desc: 'Özel Bankacılık Lideri', tv: 'BIST:GARAN' },
    { ticker: 'AKBNK.IS', name: 'Akbank T.A.Ş.', desc: 'Özel Bankacılık & Sermaye Gücü', tv: 'BIST:AKBNK' },
    { ticker: 'ISCTR.IS', name: 'İş Bankası (C)', desc: 'Geniş İştirak Ağı & Bankacılık', tv: 'BIST:ISCTR' },
    { ticker: 'PGSUS.IS', name: 'Pegasus Hava Taşımacılığı', desc: 'Düşük Maliyetli Havacılık', tv: 'BIST:PGSUS' },
    { ticker: 'TCELL.IS', name: 'Turkcell İletişim', desc: 'Telekomünikasyon & Dijital Servisler', tv: 'BIST:TCELL' }
  ],
  crypto: [
    { ticker: 'BTCUSDT', name: 'Bitcoin / USDT', desc: 'Kripto Para Amiral Gemisi (Dijital Altın)', tv: 'BINANCE:BTCUSDT' },
    { ticker: 'ETHUSDT', name: 'Ethereum / USDT', desc: 'Akıllı Sözleşme & DeFi Katmanı', tv: 'BINANCE:ETHUSDT' },
    { ticker: 'SOLUSDT', name: 'Solana / USDT', desc: 'Yüksek Hızlı Monolitik Katman 1', tv: 'BINANCE:SOLUSDT' },
    { ticker: 'LDOUSDT', name: 'Lido DAO / USDT', desc: 'Portföy Kripto Varlığı • 50.00 Lot', tv: 'BINANCE:LDOUSDT', isHolding: true },
    { ticker: 'BIOUSDT', name: 'Bio Protocol / USDT', desc: 'Portföy DeSci Varlığı • 500.00 Lot', tv: 'MEXC:BIO_USDT', isHolding: true },
    { ticker: 'SUIUSDT', name: 'Sui Network / USDT', desc: 'Yeni Nesil Move Tabanlı Katman 1', tv: 'BINANCE:SUIUSDT' },
    { ticker: 'OPUSDT', name: 'Optimism / USDT', desc: 'Ethereum Katman 2 Ölçekleme', tv: 'BINANCE:OPUSDT' },
    { ticker: 'ARKMUSDT', name: 'Arkham Intelligence', desc: 'On-chain AI Analitik Protokolü', tv: 'BINANCE:ARKMUSDT' },
    { ticker: 'DOGEUSDT', name: 'Dogecoin / USDT', desc: 'Likidite & Meme Öncüsü', tv: 'BINANCE:DOGEUSDT' },
    { ticker: 'TOTAL', name: 'Kripto Toplam Piyasa Değeri', desc: 'Tüm Kripto Varlıkların Toplam Büyüklüğü ($)', tv: 'CRYPTOCAP:TOTAL' },
    { ticker: 'TOTAL2', name: 'Toplam Piyasa Değeri (BTC Hariç)', desc: 'Tüm Altcoinlerin Toplam Büyüklüğü ($)', tv: 'CRYPTOCAP:TOTAL2' },
    { ticker: 'TOTAL3', name: 'Toplam Piyasa Değeri (BTC & ETH Hariç)', desc: 'Saf Altcoin Piyasası Toplam Değeri ($)', tv: 'CRYPTOCAP:TOTAL3' },
    { ticker: 'OTHERS', name: 'Diğer Küçük/Orta Altcoinler', desc: 'Top 10 Hariç Asimetrik Fırsat Endeksi ($)', tv: 'CRYPTOCAP:OTHERS' },
    { ticker: 'TOTALDEFI', name: 'DeFi Ekosistem Toplamı', desc: 'Merkeziyetsiz Finans Protokol Büyüklüğü ($)', tv: 'CRYPTOCAP:TOTALDEFI' }
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
  const { portfolioSummary, currentCurrency, usdtry, marketQuotes } = useApp();
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

  // Chart Timeframe Interval (15, 60, 240, D, W)
  const [chartInterval, setChartInterval] = useState(() => {
    try { return localStorage.getItem('pro_chart_interval') || 'D'; } catch { return 'D'; }
  });

  useEffect(() => {
    try { localStorage.setItem('pro_chart_interval', chartInterval); } catch(e) {}
  }, [chartInterval]);

  // Custom User Watchlist Tickers
  const [customTickers, setCustomTickers] = useState(() => {
    try {
      const saved = localStorage.getItem('custom_watchlist_tickers');
      return saved ? JSON.parse(saved) : ['VRT', 'ALAB', 'PLTR', 'THYAO.IS', 'TOTAL3'];
    } catch {
      return ['VRT', 'ALAB', 'PLTR', 'THYAO.IS', 'TOTAL3'];
    }
  });
  const [newTickerInput, setNewTickerInput] = useState('');

  // User-Configured Active Indicators for TradingView Embed
  const [activeStudies, setActiveStudies] = useState(() => {
    try {
      const saved = localStorage.getItem('pro_chart_active_studies');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {}
    return [];
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

  // Clear all studies to give 100% free quota inside TradingView
  const clearAllStudies = () => {
    setActiveStudies([]);
    try {
      localStorage.setItem('pro_chart_active_studies', JSON.stringify([]));
    } catch (e) {}
  };

  // Fullscreen State & Ref
  const chartWrapperRef = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

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
    if (!newTickerInput.trim()) return;
    const clean = newTickerInput.trim().toUpperCase();
    if (!customTickers.includes(clean)) {
      setCustomTickers(prev => [...prev, clean]);
    }
    setNewTickerInput('');
  };

  const handleRemoveCustomTicker = (tickerToRemove) => {
    setCustomTickers(prev => prev.filter(t => t !== tickerToRemove));
  };

  // Extract clean ticker
  const cleanActiveTicker = useMemo(() => {
    if (!currentSymbol) return 'SPCX';
    let s = currentSymbol;
    if (s.includes(':')) s = s.split(':')[1];
    return s.trim().toUpperCase();
  }, [currentSymbol]);

  const isBistStock = useMemo(() => {
    return cleanActiveTicker.endsWith('.IS') || 
           ['BYDNR', 'TUPRS', 'THYAO', 'ASELS', 'EREGL', 'KCHOL', 'BIMAS', 'SISE', 'FROTO', 'ASTOR', 'SAHOL', 'GARAN', 'AKBNK', 'YKBNK', 'ISCTR', 'PGSUS', 'TCELL', 'PETKM', 'TTKOM', 'ENKAI', 'KOZAL', 'SASA', 'HEKTS', 'KONTR'].includes(cleanActiveTicker);
  }, [cleanActiveTicker]);

  // Find portfolio items directly from user's current holdings
  const portfolioItems = useMemo(() => {
    const allHoldings = portfolioSummary?.allHoldings || [];
    if (!allHoldings.length) {
      return [
        { ticker: 'SPCX', name: 'Space Exploration Tech Corp', desc: 'Portföy ABD Hissesi • 2.22 Lot', tv: 'SPCX', isHolding: true, type: 'ABD Hisse' },
        { ticker: 'DRAM', name: 'D-RAM Bellek Teknoloji ETF', desc: 'Portföy Fonu • 5.00 Lot', tv: 'DRAM', isHolding: true, type: 'ETF' },
        { ticker: 'CUSD', name: 'Coinbase USD Yield ETF', desc: 'Nakit Getiri Fonu', tv: 'AMEX:CUSD', isHolding: true, type: 'ETF' },
        { ticker: 'BYDNR.IS', name: 'Baydöner Restoranları', desc: 'Portföy BIST Hissesi • 10.00 Lot', tv: 'BIST:BYDNR', isHolding: true, type: 'BIST 100' },
        { ticker: 'TUPRS.IS', name: 'Tüpraş Rafineri', desc: 'Portföy Temettü • 1.00 Lot', tv: 'BIST:TUPRS', isHolding: true, type: 'BIST 100' },
        { ticker: 'LDOUSDT', name: 'Lido DAO Token', desc: 'Portföy Kripto • 50.00 Lot', tv: 'BINANCE:LDOUSDT', isHolding: true, type: 'Kripto' },
        { ticker: 'BIOUSDT', name: 'Bio Protocol', desc: 'Portföy DeSci • 500.00 Lot', tv: 'MEXC:BIO_USDT', isHolding: true, type: 'Kripto' }
      ];
    }

    return allHoldings.map(h => {
      const symRaw = (h.ticker || '').toUpperCase();
      let tvSym = getTradingViewSymbol(symRaw);
      return {
        ticker: symRaw,
        name: h.name || symRaw,
        desc: `${h.shares || 0} Lot • Ort. Maliyet: ${h.currency === 'TRY' ? '₺' : '$'}${fmt(h.costBasis || h.avgPrice || 0, 2)}`,
        tv: tvSym,
        isHolding: true,
        type: h.type || 'Portföy',
        shares: h.shares,
        avgPrice: h.avgPrice || h.costBasis,
        currentPrice: h.currentPrice,
        returnPct: h.returnPct
      };
    });
  }, [portfolioSummary]);

  // Live Price and +/- % Change lookup
  const getItemPriceAndChange = (item) => {
    const rawTicker = (item.ticker || '').toUpperCase();
    const clean = rawTicker.replace('.IS', '').replace('USDT', '').replace('-USD', '');

    if (marketQuotes && marketQuotes[clean]) {
      const q = marketQuotes[clean];
      const p = q.price || q.regularMarketPrice || 0;
      const c = q.changePercent || q.regularMarketChangePercent || 0;
      return { price: p, changePct: c, currency: q.currency || 'USD' };
    }

    if (item.currentPrice) {
      return { 
        price: item.currentPrice, 
        changePct: item.returnPct || 0, 
        currency: item.type?.includes('BIST') ? 'TRY' : 'USD' 
      };
    }

    const s = stocksData[clean];
    if (s && s.price) {
      const liveP = s.price.live || s.price.current || 0;
      const changeP = s.price.changePercent || s.price.dayChangePct || 0;
      return { price: liveP, changePct: changeP, currency: s.currency || 'USD' };
    }

    const pStock = potentialStocksData[clean];
    if (pStock && pStock.price) {
      return { price: pStock.price.current || 0, changePct: pStock.price.dayChangePct || 0, currency: pStock.currency || 'USD' };
    }

    if (benchmarkData && benchmarkData[clean]) {
      const b = benchmarkData[clean];
      return { price: b.value || 0, changePct: b.change || 0, currency: 'USD' };
    }

    if (rawTicker === 'DXY') return { price: 104.25, changePct: 0.12, currency: 'USD', formattedPrice: '104.25' };
    if (rawTicker === 'VIX') return { price: 14.80, changePct: -1.35, currency: 'USD', formattedPrice: '14.80' };
    if (rawTicker === 'BRENT') return { price: 78.40, changePct: 0.65, currency: 'USD', formattedPrice: '$78.40' };
    if (rawTicker === 'US10Y') return { price: 4.28, changePct: -0.45, currency: 'USD', formattedPrice: '%4.28' };
    if (rawTicker === 'TOTAL') return { price: 2.65, changePct: 1.85, currency: 'USD', formattedPrice: '$2.65T' };
    if (rawTicker === 'TOTAL3') return { price: 840, changePct: 2.40, currency: 'USD', formattedPrice: '$840B' };

    return { price: 0, changePct: 0, currency: 'USD' };
  };

  // Active Watchlist Items according to selected category and search
  const currentWatchlistItems = useMemo(() => {
    let list = [];
    if (activeCategory === 'portfolio') {
      list = portfolioItems;
    } else if (activeCategory === 'us_stocks') {
      list = PRESET_WATCHLISTS.us_stocks;
    } else if (activeCategory === 'etf') {
      list = PRESET_WATCHLISTS.etf;
    } else if (activeCategory === 'bist') {
      list = PRESET_WATCHLISTS.bist;
    } else if (activeCategory === 'crypto') {
      list = PRESET_WATCHLISTS.crypto;
    } else if (activeCategory === 'macro') {
      list = PRESET_WATCHLISTS.macro;
    } else if (activeCategory === 'custom') {
      list = customTickers.map(t => {
        const tv = getTradingViewSymbol(t);
        const name = stocksData[t]?.name || potentialStocksData[t]?.name || t;
        return { ticker: t, name, desc: 'Özel Listenizdeki Varlık', tv };
      });
    }

    if (!searchQuery.trim()) return list;

    const q = searchQuery.toLowerCase().trim();
    return list.filter(item => 
      (item.ticker && item.ticker.toLowerCase().includes(q)) ||
      (item.name && item.name.toLowerCase().includes(q)) ||
      (item.desc && item.desc.toLowerCase().includes(q))
    );
  }, [activeCategory, portfolioItems, customTickers, searchQuery]);

  // Find user's holding data if they own this stock
  const activeHolding = useMemo(() => {
    const all = portfolioSummary?.allHoldings || [];
    return all.find(h => (h.ticker || '').toUpperCase() === cleanActiveTicker) || null;
  }, [portfolioSummary, cleanActiveTicker]);

  // Portfolio Buy Zone & Valuation Analysis
  const buyZoneAnalysis = useMemo(() => {
    const sData = stocksData[cleanActiveTicker] || potentialStocksData[cleanActiveTicker];
    const hasHolding = !!activeHolding;
    const holdingCost = activeHolding ? (activeHolding.avgPrice || activeHolding.costBasis || 0) : null;
    const holdingCurrency = activeHolding ? activeHolding.currency : (sData?.currency || 'USD');
    const symMark = holdingCurrency === 'TRY' ? '₺' : '$';

    const livePrice = activeHolding?.currentPrice || sData?.price?.current || 100;
    const fairValue = sData?.valuation?.targetPrice || sData?.dcfValuation?.fairValue || (livePrice * 1.25);
    const quantScore = sData?.quantScore || sData?.score || null;

    const low52w = sData?.price?.low52 || (livePrice * 0.75);
    const buyZoneMin = sData?.valuation?.supportRange?.min || (low52w * 1.05);
    const buyZoneMax = sData?.valuation?.supportRange?.max || (fairValue * 0.85);

    let zoneStatus = 'neutral';
    let zoneBadge = 'BEKLE / İZLE';
    let zoneColor = '#94a3b8';
    let zoneAdvice = 'Fiyat dengeli bantta işlem görüyor.';

    if (livePrice <= buyZoneMax) {
      zoneStatus = 'strong_buy';
      zoneBadge = '🟢 GÜÇLÜ ALIM BÖLGESİ';
      zoneColor = '#10b981';
      zoneAdvice = `Fiyat adil değerin altında (${symMark}${fmt(buyZoneMin, 2)} - ${symMark}${fmt(buyZoneMax, 2)} aralığında). Kademeli alım için cazip seviyede.`;
    } else if (livePrice > fairValue * 1.1) {
      zoneStatus = 'overvalued';
      zoneBadge = '🔴 HEDEF / DİRENÇ BÖLGESİ';
      zoneColor = '#ef4444';
      zoneAdvice = `Fiyat adil değer seviyesine ulaşmış. Yeni alım için geri çekilmeler beklenebilir.`;
    } else {
      zoneAdvice = 'TradingView göstergeleri ve teknik destek/direnç seviyelerini grafik üzerinden takip edebilirsiniz.';
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

  // Real-Time Session Countdown Timer Hook
  const [sessionTimer, setSessionTimer] = useState({
    status: 'open',
    market: '',
    badge: '',
    text: '',
    timeStr: ''
  });

  useEffect(() => {
    const updateTimer = () => {
      const now = new Date();
      const day = now.getDay(); // 0 Sun, 6 Sat
      const h = now.getHours();
      const m = now.getMinutes();
      const s = now.getSeconds();
      const nowSecs = h * 3600 + m * 60 + s;
      const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;

      const sym = (currentSymbol || '').toUpperCase();
      const isBist = sym.endsWith('.IS') || isBistStock;
      const isCrypto = sym.includes('BTC') || sym.includes('ETH') || sym.includes('TOTAL') || sym.includes('USDT') || ['SOL', 'LDO', 'BIO', 'SUI', 'OP', 'ARKM', 'DOGE'].includes(cleanActiveTicker);

      if (isCrypto) {
        setSessionTimer({
          status: 'open',
          market: 'KRİPTO',
          badge: '🟢 7/24 CANLI SEANS',
          text: `Kesintisiz Piyasa • TSİ ${timeStr}`,
          timeStr
        });
        return;
      }

      const isWeekend = day === 0 || day === 6;

      if (isBist) {
        if (isWeekend) {
          setSessionTimer({
            status: 'closed',
            market: 'BIST',
            badge: '🔴 BORSA KAPALI',
            text: 'Hafta Sonu • Pazartesi 09:55 Açılış',
            timeStr
          });
          return;
        }
        const openSecs = 10 * 3600;
        const closeSecs = 18 * 3600 + 10 * 60;
        if (nowSecs < openSecs) {
          const diff = openSecs - nowSecs;
          const dh = Math.floor(diff / 3600);
          const dm = Math.floor((diff % 3600) / 60);
          const ds = diff % 60;
          setSessionTimer({
            status: 'pre',
            market: 'BIST',
            badge: '🟡 SEANS ÖNCESİ',
            text: `Açılışa: ${String(dh).padStart(2, '0')}:${String(dm).padStart(2, '0')}:${String(ds).padStart(2, '0')}`,
            timeStr
          });
        } else if (nowSecs < closeSecs) {
          const diff = closeSecs - nowSecs;
          const dh = Math.floor(diff / 3600);
          const dm = Math.floor((diff % 3600) / 60);
          const ds = diff % 60;
          setSessionTimer({
            status: 'open',
            market: 'BIST',
            badge: '🟢 SEANS AÇIK',
            text: `Kapanışa (18:10): ${String(dh).padStart(2, '0')}:${String(dm).padStart(2, '0')}:${String(ds).padStart(2, '0')}`,
            timeStr
          });
        } else {
          setSessionTimer({
            status: 'closed',
            market: 'BIST',
            badge: '🔴 SEANS KAPANDI',
            text: 'Yarın 09:55 Seans Başlar',
            timeStr
          });
        }
        return;
      }

      // Default: Wall Street (US NYSE / NASDAQ)
      if (isWeekend) {
        setSessionTimer({
          status: 'closed',
          market: 'WALL STREET',
          badge: '🔴 SEANS KAPALI',
          text: 'Hafta Sonu • Pazartesi 16:30',
          timeStr
        });
        return;
      }
      const openSecs = 16 * 3600 + 30 * 60;
      const closeSecs = 23 * 3600;
      if (nowSecs < openSecs) {
        const diff = openSecs - nowSecs;
        const dh = Math.floor(diff / 3600);
        const dm = Math.floor((diff % 3600) / 60);
        const ds = diff % 60;
        setSessionTimer({
          status: 'pre',
          market: 'WALL STREET',
          badge: '🟡 PRE-MARKET',
          text: `Açılış Çanına (16:30): ${String(dh).padStart(2, '0')}:${String(dm).padStart(2, '0')}:${String(ds).padStart(2, '0')}`,
          timeStr
        });
      } else if (nowSecs < closeSecs) {
        const diff = closeSecs - nowSecs;
        const dh = Math.floor(diff / 3600);
        const dm = Math.floor((diff % 3600) / 60);
        const ds = diff % 60;
        setSessionTimer({
          status: 'open',
          market: 'WALL STREET',
          badge: '🟢 SEANS AÇIK',
          text: `Kapanış Çanına (23:00): ${String(dh).padStart(2, '0')}:${String(dm).padStart(2, '0')}:${String(ds).padStart(2, '0')}`,
          timeStr
        });
      } else {
        setSessionTimer({
          status: 'closed',
          market: 'WALL STREET',
          badge: '🔴 AFTER-HOURS',
          text: 'Yarın Açılış: 16:30',
          timeStr
        });
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [currentSymbol, isBistStock, cleanActiveTicker]);

  // TradingView Widget Injection
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
          interval: chartInterval,
          timezone: 'Europe/Istanbul',
          theme: 'dark',
          style: '1', // Candlestick
          locale: 'tr',
          toolbar_bg: '#040711',
          enable_publishing: false,
          hide_side_toolbar: false, // Full drawing tools on left
          allow_symbol_change: true,
          save_image: true,
          container_id: containerId,
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
  }, [currentSymbol, activeStudies, chartInterval]);

  return (
    <div className="tab-pane-content" style={{ animation: 'fadeIn 0.25s ease', display: 'flex', flexDirection: 'column', gap: 10 }}>
      
      {/* 🌟 Top Pro Header Bar with Real-Time Session Countdown Timer */}
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
                TRADINGVIEW ENGINE
              </span>
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
              Canlı Fiyatlar • Çizim Araçları • Sınırsız İzleme Listeleri • Seans Sayacı
            </div>
          </div>
        </div>

        {/* ⏱️ LIVE SESSION COUNTDOWN BADGE & QUICK CONTROLS */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          
          {/* Seans Geri Sayacı Rozeti */}
          <div 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 6, 
              background: sessionTimer.status === 'open' 
                ? 'rgba(16, 185, 129, 0.12)' 
                : sessionTimer.status === 'pre' 
                ? 'rgba(245, 158, 11, 0.12)' 
                : 'rgba(239, 68, 68, 0.12)',
              border: `1px solid ${sessionTimer.status === 'open' ? 'rgba(16, 185, 129, 0.35)' : sessionTimer.status === 'pre' ? 'rgba(245, 158, 11, 0.35)' : 'rgba(239, 68, 68, 0.35)'}`,
              borderRadius: 6,
              padding: '4px 10px'
            }}
            title={`${sessionTimer.market} Piyasası Seans Durumu`}
          >
            <Clock size={13} className={sessionTimer.status === 'open' ? 'text-emerald' : sessionTimer.status === 'pre' ? 'text-amber' : 'text-rose'} />
            <span className="mono font-bold" style={{ fontSize: 10.5, color: sessionTimer.status === 'open' ? '#34d399' : sessionTimer.status === 'pre' ? '#fbbf24' : '#f87171' }}>
              {sessionTimer.badge}
            </span>
            <span style={{ fontSize: 10.5, color: '#e2e8f0' }}>
              {sessionTimer.text}
            </span>
          </div>

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

      {/* ⚡ TRADINGVIEW GÖSTERGELER & PERİYOT KONTROL BARI */}
      <div 
        style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          flexWrap: 'wrap', 
          gap: 8, 
          padding: '6px 12px', 
          background: 'rgba(15, 23, 42, 0.75)', 
          border: '1px solid rgba(0, 229, 255, 0.2)', 
          borderRadius: 6 
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <Sliders size={12} className="text-cyan" />
            <span>GÖSTERGELER:</span>
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
                  padding: '2px 7px',
                  fontWeight: isActive ? 700 : 500,
                  borderColor: isActive ? 'var(--cyan)' : 'rgba(255,255,255,0.1)'
                }}
                title={`${st.fullName} (Aç/Kapat)`}
              >
                {isActive ? '✓ ' : '+ '}{st.name}
              </button>
            );
          })}

          {/* 🧹 Clear All to Free Up 100% of TradingView Quota */}
          <button
            type="button"
            onClick={clearAllStudies}
            className="chip-btn"
            style={{ fontSize: 9.5, padding: '2px 7px', borderColor: 'rgba(239, 68, 68, 0.5)', color: '#f87171' }}
            title="Grafiği 0 indikatörle açarak TradingView içinden ekleme kotanızı %100 boşaltır"
          >
            🧹 Kotayı Boşalt (0 İndikatör)
          </button>

          {/* ⏱️ Zaman Dilimi Seçici */}
          <div style={{ display: 'inline-flex', background: 'rgba(0,0,0,0.5)', borderRadius: 5, padding: 2, border: '1px solid rgba(255,255,255,0.1)', marginLeft: 4 }}>
            {[
              { id: '15', label: '15D' },
              { id: '60', label: '1S' },
              { id: '240', label: '4S' },
              { id: 'D', label: '1G' },
              { id: 'W', label: '1H' }
            ].map(tf => (
              <button
                key={tf.id}
                type="button"
                onClick={() => setChartInterval(tf.id)}
                className={`chip-btn ${chartInterval === tf.id ? 'active' : ''}`}
                style={{ fontSize: 9, padding: '2px 5px', fontWeight: chartInterval === tf.id ? 700 : 500 }}
                title={`${tf.label} periyoduna geç`}
              >
                {tf.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 10, color: 'var(--text-muted)' }}>
          <span 
            className={`nav-badge ${activeStudies.length === 0 ? 'emerald' : activeStudies.length <= 2 ? 'amber' : 'rose'}`}
            style={{ fontSize: 9.5, padding: '2px 7px' }}
            title="TradingView ücretsiz planında toplam gösterge limiti 2 veya 3'tür."
          >
            {activeStudies.length === 0 
              ? '🟢 Kotanız %100 Boş (TradingView İçinden Rahatça Ekleyebilirsiniz)' 
              : `${activeStudies.length} Gösterge Açık`}
          </span>
        </div>
      </div>

      {/* 🎯 PORTFÖY ALIM BÖLGESİ HUD'U */}
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
      {isBistStock && (
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
          gridTemplateColumns: sidebarOpen ? '1fr 350px' : '1fr', 
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
        
        {/* Left: The Chart Container (TradingView Engine) */}
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
          {/* Fullscreen Interactive Top Floating Toolbar */}
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
              {/* Active Ticker, Session Countdown & Quick Switches */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className="mono font-bold text-cyan" style={{ fontSize: 13 }}>
                  {cleanActiveTicker}
                </span>

                {/* Seans Sayacı Rozeti (Fullscreen) */}
                <span className="mono" style={{ fontSize: 10, color: sessionTimer.status === 'open' ? '#34d399' : '#fbbf24', background: 'rgba(0,0,0,0.5)', padding: '2px 7px', borderRadius: 4, border: '1px solid rgba(255,255,255,0.1)' }}>
                  {sessionTimer.badge} • {sessionTimer.text}
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

              {/* Sidebar Toggle & Exit Fullscreen */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
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

          {/* TRADINGVIEW WIDGET ENGINE */}
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
        </div>

        {/* Right: Sınırsız Watchlist Yöneticisi WITH LIVE PRICES & +/- % CHANGE */}
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

            {/* 🔽 Downward Dropdown Category Selector */}
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

            {/* Quick 4-Pill Shortcut Bar */}
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

            {/* Scrollable Watchlist Items List WITH LIVE PRICES & +/- % CHANGE */}
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4, paddingRight: 2 }}>
              {currentWatchlistItems.map((item) => {
                const isSelected = currentSymbol === item.ticker || getTradingViewSymbol(currentSymbol) === item.tv;
                const isUserHolding = item.isHolding || portfolioItems.some(h => (h.ticker || '').toUpperCase() === (item.ticker || '').toUpperCase());
                const priceData = getItemPriceAndChange(item);

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
                    {/* Left: Ticker & Name */}
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, marginRight: 8 }}>
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

                    {/* Right: Live Price & +/- % Change Badge */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2, flexShrink: 0 }}>
                      {priceData.price > 0 ? (
                        <>
                          <span className="mono font-bold" style={{ fontSize: 11, color: '#f8fafc' }}>
                            {priceData.formattedPrice ? priceData.formattedPrice : `${priceData.currency === 'TRY' ? '₺' : '$'}${fmt(priceData.price, priceData.price < 1 ? 4 : 2)}`}
                          </span>
                          <span 
                            className="mono font-bold" 
                            style={{ 
                              fontSize: 9, 
                              padding: '1px 5px', 
                              borderRadius: 4,
                              background: priceData.changePct >= 0 ? 'rgba(16, 185, 129, 0.18)' : 'rgba(239, 68, 68, 0.18)',
                              color: priceData.changePct >= 0 ? '#34d399' : '#f87171' 
                            }}
                          >
                            {priceData.changePct >= 0 ? '+' : ''}{fmt(priceData.changePct, 2)}%
                          </span>
                        </>
                      ) : (
                        <span className="mono" style={{ fontSize: 9, color: 'var(--text-muted)' }}>
                          {item.tv.split(':')[0]}
                        </span>
                      )}

                      {activeCategory === 'custom' && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveCustomTicker(item.ticker);
                          }}
                          style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 2, marginTop: 2 }}
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
