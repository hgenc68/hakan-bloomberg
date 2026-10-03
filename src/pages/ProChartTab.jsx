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
  X
} from 'lucide-react';
import { Line, Bar } from 'react-chartjs-2';
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

  // ETFs (Clean symbols or verified exchanges)
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
  const nyseKnown = ['TSM', 'ABBV', 'XOM', 'DIA', 'KO', 'DIS', 'NKE', 'JNJ', 'PFE', 'UNH', 'JPM', 'V', 'MA', 'WMT'];
  if (nyseKnown.includes(clean)) {
    return `NYSE:${clean}`;
  }

  // Default to NASDAQ for US tech / growth equities
  return `NASDAQ:${clean}`;
}

// Preset Watchlists Catalog
const PRESET_WATCHLISTS = {
  us_stocks: [
    { ticker: 'NVDA', name: 'Nvidia Corp', desc: 'AI Çip & Veri Merkezi Lideri', tv: 'NASDAQ:NVDA' },
    { ticker: 'TSM', name: 'TSMC', desc: 'Küresel Çip Dökümhane Tekeli', tv: 'NYSE:TSM' },
    { ticker: 'ABBV', name: 'AbbVie Inc', desc: 'Biyofarma & Temettü Devi', tv: 'NYSE:ABBV' },
    { ticker: 'XOM', name: 'Exxon Mobil', desc: 'Entegre Enerji & Nakit Akışı', tv: 'NYSE:XOM' },
    { ticker: 'AAPL', name: 'Apple Inc', desc: 'Tüketici Elektroniği & Ekosistem', tv: 'NASDAQ:AAPL' },
    { ticker: 'MSFT', name: 'Microsoft Corp', desc: 'Bulut Bilişim & Kurumsal AI', tv: 'NASDAQ:MSFT' },
    { ticker: 'GOOGL', name: 'Alphabet Inc', desc: 'Arama Motoru, Bulut & AI', tv: 'NASDAQ:GOOGL' },
    { ticker: 'AMZN', name: 'Amazon.com', desc: 'E-Ticaret & AWS Bulut Lideri', tv: 'NASDAQ:AMZN' },
    { ticker: 'META', name: 'Meta Platforms', desc: 'Sosyal Ağlar & Llama AI', tv: 'NASDAQ:META' },
    { ticker: 'AMD', name: 'Advanced Micro Devices', desc: 'x86 CPU & MI300 Hızlandırıcı', tv: 'NASDAQ:AMD' },
    { ticker: 'PLTR', name: 'Palantir Technologies', desc: 'Savunma & Kurumsal AI Sistemi', tv: 'NASDAQ:PLTR' },
    { ticker: 'AVGO', name: 'Broadcom Inc', desc: 'Özel AI ASIC & Ağ Donanımları', tv: 'NASDAQ:AVGO' },
    { ticker: 'TSLA', name: 'Tesla Inc', desc: 'Elektrikli Araç, FSD & Otonomi', tv: 'NASDAQ:TSLA' }
  ],
  etf: [
    { ticker: 'SPCX', name: 'CrossingBridge SPAC (CUSD)', desc: 'Nakit Kalkanı & Getiri Sepeti', tv: 'SPCX' },
    { ticker: 'CUSD', name: 'CrossingBridge Ultra-Short', desc: 'SPCX Fonunun Yeni Resmi Tickerı', tv: 'AMEX:CUSD' },
    { ticker: 'DRAM', name: 'Roundhill Memory & Tech ETF', desc: 'Yarı İletken Bellek Endeksi', tv: 'DRAM' },
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
  const [activeCategory, setActiveCategory] = useState('portfolio');
  const [searchQuery, setSearchQuery] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [hideHud, setHideHud] = useState(false);
  const [chartEngineMode, setChartEngineMode] = useState('tv'); // 'tv' (TradingView) | 'native' (Bloomberg Canvas)
  const [customTickers, setCustomTickers] = useState(() => {
    try {
      const saved = localStorage.getItem('custom_watchlist_tickers');
      return saved ? JSON.parse(saved) : ['PLTR', 'THYAO.IS', 'SOXX', 'TOTAL3'];
    } catch {
      return ['PLTR', 'THYAO.IS', 'SOXX', 'TOTAL3'];
    }
  });
  const [newTickerInput, setNewTickerInput] = useState('');

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

  // Synchronize holdings dynamically from portfolio
  const portfolioItems = useMemo(() => {
    const list = portfolioSummary?.enrichedHoldings || [];
    return list.map(h => {
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

  // Check if symbol is a BIST stock
  const isBistStock = useMemo(() => {
    const clean = currentSymbol.toUpperCase();
    return clean.endsWith('.IS') || clean.startsWith('BIST:') || [
      'BYDNR', 'TUPRS', 'THYAO', 'ASELS', 'EREGL', 'KCHOL', 'BIMAS', 'SISE', 
      'FROTO', 'ASTOR', 'SAHOL', 'GARAN', 'AKBNK', 'YKBNK', 'ISCTR', 'PGSUS', 'TCELL'
    ].includes(clean.replace('.IS', '').replace('BIST:', ''));
  }, [currentSymbol]);

  const cleanBistTicker = useMemo(() => {
    return currentSymbol.replace('.IS', '').replace('BIST:', '').toUpperCase();
  }, [currentSymbol]);

  // Native stock data (for Bloomberg canvas fallback)
  const nativeStockData = useMemo(() => {
    const clean = currentSymbol.replace('.IS', '').replace('BIST:', '').toUpperCase();
    return stocksData[clean] || stocksData[currentSymbol] || null;
  }, [currentSymbol]);

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
  }, [currentSymbol, chartEngineMode]);

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
              Çizim Araçları • Sınırsız İndikatör • Portföy Maliyet Çizgileri & Sınırsız İzleme Listeleri
            </div>
          </div>
        </div>

        {/* Quick Shortcuts, Engine Toggle, Fullscreen & Watchlist Buttons */}
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

      {/* 🚀 Active Holding Overlay HUD (Slim, Non-overlapping Strip) */}
      {activeHolding && !hideHud && (
        <div 
          className="card" 
          style={{ 
            padding: '7px 14px', 
            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(6, 78, 59, 0.18))', 
            border: '1px solid rgba(16, 185, 129, 0.4)', 
            borderRadius: 6,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 8,
            marginBottom: 2,
            position: 'relative',
            zIndex: 10
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 14 }}>💼</span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 800 }}>
                PORTFÖYÜNÜZDE MEVCUT:
              </span>
              <strong className="mono text-bright" style={{ fontSize: 12.5 }}>
                {activeHolding.ticker}
              </strong>
              <span className="mono font-bold text-emerald" style={{ fontSize: 11.5 }}>
                {activeHolding.shares} Lot
              </span>
              <span style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>
                Maliyet: <strong className="mono text-bright">{activeHolding.currency === 'TRY' ? '₺' : '$'}{fmt(activeHolding.costTRY ? (activeHolding.costTRY / (activeHolding.shares || 1)) : 0, 2)}</strong>
              </span>
              <span style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>
                Değer: <strong className="mono text-cyan">{sym}{fmt(isTRY ? activeHolding.valTRY : activeHolding.valUSD, 2)}</strong>
              </span>
              <span style={{ fontSize: 10.5, color: (activeHolding.profitTRY || 0) >= 0 ? 'var(--up)' : 'var(--down)', fontWeight: 700 }}>
                K/Z: {(activeHolding.profitTRY || 0) >= 0 ? '+' : ''}{sym}{fmt(isTRY ? activeHolding.profitTRY : activeHolding.profitUSD, 2)} ({fmt(activeHolding.returnPct, 2)}%)
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {activeQuantInfo.quantScore && (
              <span className="nav-badge emerald" style={{ fontSize: 9.5, padding: '2px 7px' }}>
                Quant: {activeQuantInfo.quantScore.toFixed(1)}
              </span>
            )}
            <button
              type="button"
              className="btn-action-row buy"
              onClick={() => onOpenAddModal && onOpenAddModal(activeHolding.ticker)}
              style={{ fontSize: 10, padding: '3px 8px' }}
            >
              + Al
            </button>
            <button
              type="button"
              className="btn-action-row sell"
              onClick={() => onOpenSellModal && onOpenSellModal(activeHolding)}
              style={{ fontSize: 10, padding: '3px 8px' }}
            >
              - Sat
            </button>
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
              href={`https://tr.tradingview.com/chart/?symbol=BIST:${cleanBistTicker}`}
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
          gridTemplateColumns: (!isFullscreen && sidebarOpen) ? '1fr 340px' : '1fr', 
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
            minHeight: isFullscreen ? 'calc(100vh - 30px)' : 720,
            height: isFullscreen ? 'calc(100vh - 30px)' : 'calc(100vh - 210px)',
            display: 'flex',
            flexDirection: 'column',
            position: 'relative'
          }}
        >
          {/* Fullscreen Floating Exit Button */}
          {isFullscreen && (
            <div style={{ position: 'absolute', top: 10, right: 14, zIndex: 9999, display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(8,12,22,0.9)', padding: '4px 10px', borderRadius: 6, border: '1px solid var(--cyan)' }}>
              <span className="mono font-bold text-cyan" style={{ fontSize: 11 }}>{currentSymbol}</span>
              <button
                type="button"
                onClick={toggleFullscreen}
                className="chip-btn"
                style={{ fontSize: 10, padding: '2px 8px', background: '#ef4444', color: '#fff', borderColor: '#ef4444' }}
              >
                ✕ Tam Ekrandan Çık (ESC)
              </button>
            </div>
          )}

          {/* 1. TRADINGVIEW WIDGET ENGINE */}
          {chartEngineMode === 'tv' && (
            <div 
              id={containerId} 
              style={{ width: '100%', height: '100%', minHeight: 700, flex: 1 }} 
            />
          )}

          {/* 2. BLOOMBERG NATIVE CANVAS ENGINE (For BIST / Offline Fallback) */}
          {chartEngineMode === 'native' && nativeChartData && (
            <div style={{ padding: 16, height: '100%', display: 'flex', flexDirection: 'column' }}>
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

        {/* Right: Sınırsız Watchlist Yöneticisi (Hidden when in Fullscreen) */}
        {!isFullscreen && sidebarOpen && (
          <div 
            className="card" 
            style={{ 
              padding: '12px', 
              background: '#080c16', 
              border: '1px solid var(--border)', 
              borderRadius: 8, 
              display: 'flex', 
              flexDirection: 'column',
              minHeight: 720,
              height: 'calc(100vh - 210px)',
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

            {/* 🔽 1. Downward Dropdown Category Selector (Solves Horizontal Cutoff) */}
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
                <option value="portfolio">💼 Portföyüm ({portfolioItems.length} Varlık - Otomatik)</option>
                <option value="us_stocks">📈 ABD Hisse ({PRESET_WATCHLISTS.us_stocks.length} Varlık)</option>
                <option value="etf">🏛️ ETF Sepeti ({PRESET_WATCHLISTS.etf.length} Varlık)</option>
                <option value="bist">🇹🇷 BIST 100 ({PRESET_WATCHLISTS.bist.length} Varlık)</option>
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
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 3, paddingRight: 2 }}>
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
                      padding: '7px 9px',
                      borderRadius: 5,
                      background: isSelected ? 'rgba(0, 229, 255, 0.12)' : 'rgba(255,255,255,0.02)',
                      border: isSelected ? '1px solid var(--cyan)' : '1px solid rgba(255,255,255,0.05)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <strong className="mono" style={{ color: isSelected ? 'var(--cyan)' : '#f8fafc', fontSize: 11.5 }}>
                          {item.ticker}
                        </strong>
                        {isHolding && (
                          <span className="badge-type hisse" style={{ fontSize: 8, padding: '1px 4px' }}>
                            Portföyde
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 9, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 1 }}>
                        {item.name}
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
              <span className="text-cyan font-bold mono">{currentSymbol}</span>
            </div>
          </div>
        )}

      </div>

    </div>
  );
}
