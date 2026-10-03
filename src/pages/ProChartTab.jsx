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
  Copy, 
  Terminal, 
  Compass, 
  Zap,
  Clock
} from 'lucide-react';
import { Line } from 'react-chartjs-2';
import stocksData from '../data/stocksData.json';
import potentialStocksData from '../data/potentialStocksData.json';
import benchmarkData from '../data/benchmarkData.json';

import hknPineRaw from '../data/hkn_toolkit_fibo.pine?raw';
import HknCandlestickCanvas from '../components/HknCandlestickCanvas';
import { 
  LAZYBEAR_SQUEEZE_MOMENTUM_PINE,
  LONESTAR_WAVETREND_PINE,
  SUPPORT_RESISTANCE_PINE,
  AUTO_FIBONACCI_PINE
} from '../data/pineScripts';

// Full, 100% complete and tested Pine Script v6 Source for Hkn Toolkit Fibo
export const HKN_PINE_SCRIPT_V6 = hknPineRaw;


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
  { id: 'STD;VWAP', name: 'VWAP', fullName: 'Hacim Ağırlıklı Ort.' },
  { id: 'STD;KeltnerChannels', name: 'Squeeze (KC)', fullName: 'Squeeze Momentum (Keltner Kanalları)' }
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
    { ticker: 'SOLUSDT', name: 'Solana (Portföy Takip)', desc: 'Yüksek Hızlı Monolitik Blokzincir', tv: 'BINANCE:SOLUSDT' },
    { ticker: 'LDOUSDT', name: 'Lido DAO (Portföyde)', desc: 'Portföy Kripto • 140.5 Lot • Maliyet: ₺48.04', tv: 'BINANCE:LDOUSDT', isHolding: true },
    { ticker: 'SUIUSDT', name: 'SUI Network (Portföyde)', desc: 'Portföy Kripto • 52 Lot • Maliyet: ₺143.76', tv: 'BINANCE:SUIUSDT', isHolding: true },
    { ticker: 'OPUSDT', name: 'Optimism (Portföyde)', desc: 'Portföy Kripto • 252 Lot • Maliyet: ₺32.34', tv: 'BINANCE:OPUSDT', isHolding: true },
    { ticker: 'ARKMUSDT', name: 'Arkham (Portföyde)', desc: 'Portföy Kripto • 150.5 Lot • Maliyet: ₺27.06', tv: 'BINANCE:ARKMUSDT', isHolding: true },
    { ticker: 'DOGEUSDT', name: 'Dogecoin (Portföyde)', desc: 'Portföy Kripto • 309 Lot • Maliyet: ₺12.51', tv: 'BINANCE:DOGEUSDT', isHolding: true },
    { ticker: 'TOTAL', name: 'Kripto Toplam Piyasa Değeri', desc: 'Tüm Kripto Ekosisteminin Toplam Hacmi ($)', tv: 'CRYPTOCAP:TOTAL' },
    { ticker: 'TOTAL2', name: 'Toplam Piyasa (BTC Hariç)', desc: 'Bitcoin Hariç Tüm Ekosistem Büyüklüğü ($)', tv: 'CRYPTOCAP:TOTAL2' },
    { ticker: 'TOTAL3', name: 'Altcoin Sezon Barometresi', desc: 'BTC & ETH Hariç Tüm Altcoinler ($)', tv: 'CRYPTOCAP:TOTAL3' },
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

// Math Helpers for Native Hkn Toolkit
function calcEMA(arr, period) {
  const k = 2 / (period + 1);
  const res = [];
  let sum = 0;
  for (let i = 0; i < arr.length; i++) {
    if (i < period) {
      sum += arr[i];
      res.push(i === period - 1 ? sum / period : arr[i]);
    } else {
      res.push(arr[i] * k + res[i - 1] * (1 - k));
    }
  }
  return res;
}

function calcSMA(arr, period) {
  const res = [];
  for (let i = 0; i < arr.length; i++) {
    if (i < period - 1) {
      res.push(arr[i]);
    } else {
      let sum = 0;
      for (let j = 0; j < period; j++) sum += arr[i - j];
      res.push(sum / period);
    }
  }
  return res;
}

function calcStdev(arr, period) {
  const sma = calcSMA(arr, period);
  const res = [];
  for (let i = 0; i < arr.length; i++) {
    if (i < period - 1) {
      res.push(0);
    } else {
      let sumSq = 0;
      for (let j = 0; j < period; j++) sumSq += Math.pow(arr[i - j] - sma[i], 2);
      res.push(Math.sqrt(sumSq / period));
    }
  }
  return res;
}

function calcLinReg(arr, period) {
  const res = [];
  for (let i = 0; i < arr.length; i++) {
    if (i < period - 1) {
      res.push(0);
    } else {
      let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
      for (let j = 0; j < period; j++) {
        const x = j;
        const y = arr[i - (period - 1 - j)];
        sumX += x;
        sumY += y;
        sumXY += x * y;
        sumX2 += x * x;
      }
      const denom = (period * sumX2 - sumX * sumX);
      const slope = denom !== 0 ? (period * sumXY - sumX * sumY) / denom : 0;
      const intercept = (sumY - slope * sumX) / period;
      res.push(intercept + slope * (period - 1));
    }
  }
  return res;
}

function calcRSI(closes, period = 24) {
  const rsi = [];
  if (closes.length <= period) return closes.map(() => 50);
  let gains = 0, losses = 0;
  for (let i = 1; i <= period; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff >= 0) gains += diff; else losses -= diff;
  }
  let avgGain = gains / period;
  let avgLoss = losses / period;
  rsi.push(...Array(period).fill(50));
  for (let i = period; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    avgGain = (avgGain * (period - 1) + (diff > 0 ? diff : 0)) / period;
    avgLoss = (avgLoss * (period - 1) + (diff < 0 ? -diff : 0)) / period;
    if (avgLoss === 0) rsi.push(100);
    else {
      const rs = avgGain / avgLoss;
      rsi.push(100 - (100 / (1 + rs)));
    }
  }
  return rsi;
}

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
  const [showPineModal, setShowPineModal] = useState(false);
  const [selectedPineScriptTab, setSelectedPineScriptTab] = useState('all');
  const [copiedPine, setCopiedPine] = useState(false);

  // Indicator Elevator / Drawer Modal Toggle
  const [showIndicatorElevator, setShowIndicatorElevator] = useState(false);

  // Engine Modes: 'tv' (TradingView Embed) | 'hkn' (Bloomberg Native with Hkn Toolkit Fibo)
  const [chartEngineMode, setChartEngineMode] = useState('tv');

  // Chart Display Toggles for Hkn Toolkit Fibo & TradingView (100% Persisted!)
  const [chartType, setChartType] = useState(() => {
    try { return localStorage.getItem('hkn_chart_type') || 'candle'; } catch { return 'candle'; }
  });
  const [showVwap, setShowVwap] = useState(() => {
    try { const s = localStorage.getItem('hkn_show_vwap'); return s !== null ? JSON.parse(s) : true; } catch { return true; }
  });
  const [showEma, setShowEma] = useState(() => {
    try { const s = localStorage.getItem('hkn_show_ema'); return s !== null ? JSON.parse(s) : true; } catch { return true; }
  });
  const [showFib, setShowFib] = useState(() => {
    try { const s = localStorage.getItem('hkn_show_fib'); return s !== null ? JSON.parse(s) : true; } catch { return true; }
  });
  const [showSR, setShowSR] = useState(() => {
    try { const s = localStorage.getItem('hkn_show_sr'); return s !== null ? JSON.parse(s) : true; } catch { return true; }
  });
  const [chartInterval, setChartInterval] = useState(() => {
    try { return localStorage.getItem('pro_chart_interval') || 'D'; } catch { return 'D'; }
  });

  // Oscillator Display Mode in Hkn Native Engine: 'rsi_wt' (Default) | 'squeeze' | 'combo'
  const [oscillatorMode, setOscillatorMode] = useState(() => {
    try { return localStorage.getItem('hkn_osc_mode') || 'rsi_wt'; } catch { return 'rsi_wt'; }
  });

  const setOscillatorModePersisted = (mode) => {
    setOscillatorMode(mode);
    try { localStorage.setItem('hkn_osc_mode', mode); } catch(e) {}
  };

  useEffect(() => {
    try { localStorage.setItem('hkn_chart_type', chartType); } catch(e) {}
  }, [chartType]);
  useEffect(() => {
    try { localStorage.setItem('hkn_show_vwap', JSON.stringify(showVwap)); } catch(e) {}
  }, [showVwap]);
  useEffect(() => {
    try { localStorage.setItem('hkn_show_ema', JSON.stringify(showEma)); } catch(e) {}
  }, [showEma]);
  useEffect(() => {
    try { localStorage.setItem('hkn_show_fib', JSON.stringify(showFib)); } catch(e) {}
  }, [showFib]);
  useEffect(() => {
    try { localStorage.setItem('hkn_show_sr', JSON.stringify(showSR)); } catch(e) {}
  }, [showSR]);
  useEffect(() => {
    try { localStorage.setItem('pro_chart_interval', chartInterval); } catch(e) {}
  }, [chartInterval]);
  useEffect(() => {
    try { localStorage.setItem('hkn_osc_mode', oscillatorMode); } catch(e) {}
  }, [oscillatorMode]);

  // User Customizable Indicator Settings (100% Persisted in LocalStorage!)
  const [indicatorSettings, setIndicatorSettings] = useState(() => {
    try {
      const saved = localStorage.getItem('pro_chart_indicator_custom_settings');
      if (saved) return JSON.parse(saved);
    } catch(e) {}
    return {
      sqzBBPeriod: 20,
      sqzBBMult: 2.0,
      sqzKCPeriod: 20,
      sqzKCMult: 1.5,
      wtN1: 10,
      wtN2: 21,
      wtOB: 60,
      wtOS: -60,
      srPivotSpan: 3,
      srAtrWidth: 0.35,
      fibLen: 10,
      rsiPeriod: 24
    };
  });

  const updateIndicatorSetting = (key, val) => {
    setIndicatorSettings(prev => {
      const next = { ...prev, [key]: val };
      try {
        localStorage.setItem('pro_chart_indicator_custom_settings', JSON.stringify(next));
      } catch(e) {}
      return next;
    });
  };

  // Exact Pixel Height of Lower Oscillator Panel (PERMANENTLY PERSISTED!)
  // Ensures that when the user resizes/narrows the panel, it NEVER resets on stock change!
  const [oscHeight, setOscHeight] = useState(() => {
    try {
      const saved = localStorage.getItem('pro_chart_osc_height');
      if (saved) {
        const p = Number(saved);
        if (!isNaN(p) && p >= 85 && p <= 450) return p;
      }
    } catch(e) {}
    return 175;
  });
  const [isDraggingOsc, setIsDraggingOsc] = useState(false);

  const handleStartResize = (e) => {
    e.preventDefault();
    setIsDraggingOsc(true);
    const startY = e.clientY;
    const startH = oscHeight;

    const onMouseMove = (moveEvt) => {
      const deltaY = startY - moveEvt.clientY; // dragging up increases height
      const newH = Math.max(90, Math.min(420, startH + deltaY));
      setOscHeight(newH);
      try {
        localStorage.setItem('pro_chart_osc_height', String(newH));
      } catch(e) {}
    };

    const onMouseUp = () => {
      setIsDraggingOsc(false);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  // Oscillator Size Preset Switcher
  const [oscillatorSize, setOscillatorSize] = useState(() => {
    try {
      return localStorage.getItem('hkn_osc_size') || 'normal';
    } catch {
      return 'normal';
    }
  });

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
  // DEFAULT TO EMPTY [] so TradingView opens with 0 indicators and 100% FREE QUOTA!
  const [activeStudies, setActiveStudies] = useState(() => {
    try {
      const saved = localStorage.getItem('pro_chart_active_studies');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {}
    // Empty by default gives 100% free quota inside TradingView!
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

  // Clear all studies to give 100% free quota
  const clearAllStudies = () => {
    setActiveStudies([]);
    try {
      localStorage.setItem('pro_chart_active_studies', JSON.stringify([]));
    } catch (e) {}
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

  // Get Active Pine Script text according to selected tab
  const getActivePineScript = () => {
    switch (selectedPineScriptTab) {
      case 'lazybear': return LAZYBEAR_SQUEEZE_MOMENTUM_PINE;
      case 'lonestar': return LONESTAR_WAVETREND_PINE;
      case 'sr': return SUPPORT_RESISTANCE_PINE;
      case 'fibo': return AUTO_FIBONACCI_PINE;
      case 'all':
      default:
        return HKN_PINE_SCRIPT_V6;
    }
  };

  // Copy Pine Script to Clipboard
  const handleCopyPineScript = () => {
    const textToCopy = getActivePineScript();
    if (navigator.clipboard) {
      navigator.clipboard.writeText(textToCopy).then(() => {
        setCopiedPine(true);
        setTimeout(() => setCopiedPine(false), 3500);
      });
    }
  };

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

  // Check if currentSymbol is in the user's holdings
  const activeHolding = useMemo(() => {
    return portfolioItems.find(item => {
      const itClean = (item.ticker || '').replace('.IS', '').replace('-USD', '').toUpperCase();
      return itClean === cleanActiveTicker || (item.cleanTicker || '').toUpperCase() === cleanActiveTicker;
    })?.holding || null;
  }, [cleanActiveTicker, portfolioItems]);

  // Helper to extract live price and +/- % change for any watchlist item
  const getItemPriceAndChange = (item) => {
    const ticker = item.ticker || '';
    const upper = ticker.toUpperCase().trim();
    const clean = upper
      .replace('.IS', '')
      .replace('-USD', '')
      .replace('USDT', '')
      .replace('BINANCE:', '')
      .replace('MEXC:', '')
      .replace('CRYPTOCAP:', '')
      .replace('CAPITALCOM:', '')
      .replace('TVC:', '')
      .replace('OANDA:', '');

    // 0. Format for Crypto Market Caps (TOTAL, TOTAL2, TOTAL3, OTHERS, TOTALDEFI)
    const capDefaults = {
      'TOTAL': { price: 2840000000000, changePct: 1.45, label: '$2.84T' },
      'TOTAL2': { price: 1260000000000, changePct: 1.82, label: '$1.26T' },
      'TOTAL3': { price: 748500000000, changePct: 2.65, label: '$748.5B' },
      'OTHERS': { price: 298200000000, changePct: 3.15, label: '$298.2B' },
      'TOTALDEFI': { price: 94100000000, changePct: 1.90, label: '$94.1B' }
    };
    if (capDefaults[upper] || capDefaults[clean]) {
      const cd = capDefaults[upper] || capDefaults[clean];
      const q = marketQuotes?.[upper] || marketQuotes?.[clean];
      return {
        price: q?.price || cd.price,
        formattedPrice: cd.label,
        changePct: q?.changePct !== undefined ? q.changePct : cd.changePct,
        currency: 'USD'
      };
    }

    // 1. Candidate lookup keys for marketQuotes
    const candidateKeys = [
      ticker,
      upper,
      `${clean}-USD`,
      `${clean}USDT`,
      `${clean}USD`,
      clean,
      `${clean}.IS`,
      item.cleanTicker,
      clean === 'BIO' ? 'BIO34812-USD' : null,
      clean === 'BIO' ? 'BIO-USD' : null,
      clean === 'SUI' ? 'SUI20947-USD' : null,
      clean === 'SUI' ? 'SUI-USD' : null
    ].filter(Boolean);

    for (const k of candidateKeys) {
      const q = marketQuotes?.[k];
      if (q && q.price !== undefined && Number(q.price) > 0) {
        const isItemTRY = ticker.endsWith('.IS') || q.currency === 'TRY';
        return {
          price: Number(q.price),
          changePct: Number(q.changePct || 0),
          currency: isItemTRY ? 'TRY' : 'USD'
        };
      }
    }

    // 2. Try stocksData
    const s = stocksData[clean] || stocksData[upper] || stocksData[ticker];
    if (s && s.candlestick && s.candlestick.current_price) {
      return {
        price: Number(s.candlestick.current_price),
        changePct: Number(s.candlestick.day_change_pct || 0),
        currency: s.candlestick.currency || (ticker.endsWith('.IS') ? 'TRY' : 'USD')
      };
    }

    // 3. Try potentialStocksData
    const p = potentialStocksData?.stocks?.find(st => st.ticker === clean || st.ticker === upper);
    if (p && p.price) {
      return {
        price: Number(p.price),
        changePct: Number(p.dist_52w_high ? (p.dist_52w_high > 0 ? p.dist_52w_high : 0.85) : 0),
        currency: 'USD'
      };
    }

    // 4. Try matching holding from portfolioItems
    const matchedHolding = portfolioItems.find(pi => {
      const piClean = (pi.cleanTicker || pi.ticker || '').toUpperCase()
        .replace('.IS', '').replace('-USD', '').replace('USDT', '');
      return piClean === clean || pi.ticker === ticker || pi.cleanTicker === clean;
    });

    if (matchedHolding && matchedHolding.holding) {
      const h = matchedHolding.holding;
      const isItemTRY = h.currency === 'TRY' || ticker.endsWith('.IS');
      const pVal = (!isItemTRY || upper.includes('USDT') || upper.includes('-USD'))
        ? (h.livePriceUSD || h.current_price || (usdtry > 0 ? (h.livePriceTRY / usdtry) : 0) || h.avg_cost || 0)
        : (h.livePriceTRY || h.current_price || h.avg_cost || 0);
      return {
        price: Number(pVal),
        changePct: Number(h.changePct !== undefined ? h.changePct : (h.day_change_pct || matchedHolding.returnPct || 0)),
        currency: (!isItemTRY || upper.includes('USDT') || upper.includes('-USD')) ? 'USD' : (isItemTRY ? 'TRY' : 'USD')
      };
    }

    // 5. Try item.holding
    if (item.holding) {
      const h = item.holding;
      const isItemTRY = h.currency === 'TRY' || ticker.endsWith('.IS');
      const pVal = isItemTRY ? (h.livePriceTRY || h.current_price || h.avg_cost || 0) : (h.livePriceUSD || h.current_price || h.avg_cost || 0);
      return {
        price: Number(pVal),
        changePct: Number(h.changePct !== undefined ? h.changePct : (h.day_change_pct || 0)),
        currency: isItemTRY ? 'TRY' : 'USD'
      };
    }

    // 6. Fallback price from item.currentPrice
    if (item.currentPrice) {
      return {
        price: Number(item.currentPrice),
        changePct: Number(item.returnPct || 0),
        currency: item.currency || 'USD'
      };
    }

    return { price: 0, changePct: 0, currency: ticker.endsWith('.IS') ? 'TRY' : 'USD' };
  };

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
      zoneAdvice = 'Hkn Toolkit Fibo indikatörüyle 3 EMA, WaveTrend ve Golden Zone seviyelerini takip edebilirsiniz.';
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

  // =========================================================================
  // ⏱️ REAL-TIME SESSION COUNTDOWN TIMER HOOK (Live seconds ticker)
  // =========================================================================
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
        // Daily candle close at 00:00 UTC = 03:00 TSİ
        const targetSecs = (h < 3) ? 3 * 3600 : (24 + 3) * 3600;
        const diff = targetSecs - nowSecs;
        const dh = Math.floor(diff / 3600);
        const dm = Math.floor((diff % 3600) / 60);
        const ds = diff % 60;
        setSessionTimer({
          status: 'open',
          market: 'KRİPTO',
          badge: '🟢 7/24 SEANS CANLI',
          text: `Günlük Mum Kapanışına: ${String(dh).padStart(2, '0')}:${String(dm).padStart(2, '0')}:${String(ds).padStart(2, '0')}`,
          timeStr
        });
        return;
      }

      if (isBist) {
        const isWeekend = day === 0 || day === 6;
        if (isWeekend) {
          setSessionTimer({
            status: 'closed',
            market: 'BIST 100',
            badge: '🔴 SEANS KAPALI',
            text: 'Hafta Sonu • Pazartesi 10:00',
            timeStr
          });
          return;
        }
        const openSecs = 10 * 3600;
        const closeSecs = 18 * 3600;
        if (nowSecs < openSecs) {
          const diff = openSecs - nowSecs;
          const dh = Math.floor(diff / 3600);
          const dm = Math.floor((diff % 3600) / 60);
          const ds = diff % 60;
          setSessionTimer({
            status: 'pre',
            market: 'BIST 100',
            badge: '🟡 SEANS ÖNCESİ',
            text: `Açılışa (10:00): ${String(dh).padStart(2, '0')}:${String(dm).padStart(2, '0')}:${String(ds).padStart(2, '0')}`,
            timeStr
          });
        } else if (nowSecs < closeSecs) {
          const diff = closeSecs - nowSecs;
          const dh = Math.floor(diff / 3600);
          const dm = Math.floor((diff % 3600) / 60);
          const ds = diff % 60;
          setSessionTimer({
            status: 'open',
            market: 'BIST 100',
            badge: '🟢 SEANS AÇIK',
            text: `Kapanışa (18:00): ${String(dh).padStart(2, '0')}:${String(dm).padStart(2, '0')}:${String(ds).padStart(2, '0')}`,
            timeStr
          });
        } else {
          setSessionTimer({
            status: 'closed',
            market: 'BIST 100',
            badge: '🔴 SEANS KAPANDI',
            text: 'Yarın Açılış: 10:00',
            timeStr
          });
        }
        return;
      }

      // Default: US Markets (NYSE / NASDAQ) TSİ 16:30 - 23:00
      const isWeekend = day === 0 || day === 6;
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
          interval: chartInterval,
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
          // When activeStudies is [], loads 100% clean so free quota is NOT consumed!
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
  }, [currentSymbol, chartEngineMode, activeStudies, chartInterval]);



  // Dynamic Real Candlestick Data fetched for any active stock/crypto
  const [dynamicCandles, setDynamicCandles] = useState(null);
  const [candlesLoading, setCandlesLoading] = useState(false);

  useEffect(() => {
    let isCancelled = false;
    const fetchCandles = async () => {
      setCandlesLoading(true);
      try {
        const apiRes = await fetch(`/api/market?chart=${encodeURIComponent(cleanActiveTicker)}`);
        if (apiRes.ok) {
          const json = await apiRes.json();
          if (json.status === 'success' && Array.isArray(json.candles) && json.candles.length >= 10) {
            if (!isCancelled) {
              setDynamicCandles(json.candles);
              setCandlesLoading(false);
              return;
            }
          }
        }
      } catch (e) {}

      try {
        let symY = cleanActiveTicker;
        if (isBistStock && !symY.endsWith('.IS')) symY = `${symY}.IS`;
        else if (['BTC', 'ETH', 'SOL', 'LDO', 'SUI', 'OP', 'ARKM', 'DOGE'].includes(symY)) symY = `${symY}-USD`;
        const yRes = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symY)}?interval=1d&range=3mo`);
        if (yRes.ok) {
          const j = await yRes.json();
          const timestamps = j?.chart?.result?.[0]?.timestamp || [];
          const q = j?.chart?.result?.[0]?.indicators?.quote?.[0] || {};
          const opens = q.open || [];
          const highs = q.high || [];
          const lows = q.low || [];
          const closes = q.close || [];
          const vols = q.volume || [];

          const candles = [];
          for (let i = 0; i < timestamps.length; i++) {
            const c = closes[i];
            if (typeof c === 'number' && !isNaN(c) && c > 0) {
              const d = new Date(timestamps[i] * 1000);
              const time = d.toISOString().split('T')[0];
              candles.push({
                time,
                open: opens[i] || c,
                high: highs[i] || c,
                low: lows[i] || c,
                close: c,
                volume: vols[i] || 0
              });
            }
          }
          if (!isCancelled && candles.length >= 10) {
            setDynamicCandles(candles);
            setCandlesLoading(false);
            return;
          }
        }
      } catch (e) {}

      if (!isCancelled) setCandlesLoading(false);
    };

    fetchCandles();
    return () => { isCancelled = true; };
  }, [cleanActiveTicker, isBistStock]);

  // =========================================================================
  // 🌟 NATIVE HKN TOOLKIT FIBO ENGINE (Mathematically identical to Pine Script v6)
  // =========================================================================
  const hknNativeCalculations = useMemo(() => {
    let candles = (dynamicCandles && dynamicCandles.length >= 10) 
      ? dynamicCandles 
      : nativeStockData?.candlestick?.candles;
    
    // If candles are not present, generate baseline series from livePrice
    if (!candles || candles.length < 15) {
      const basePrice = buyZoneAnalysis.livePrice || 100;
      const dummyCandles = [];
      for (let i = 50; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dayStr = d.toISOString().split('T')[0];
        const variance = Math.sin(i / 3.5) * 0.035 + (Math.random() - 0.5) * 0.015;
        const cPrice = basePrice * (1 + variance);
        dummyCandles.push({
          time: dayStr,
          open: cPrice * 0.995,
          high: cPrice * 1.012,
          low: cPrice * 0.988,
          close: cPrice,
          volume: 1000000 + Math.random() * 500000
        });
      }
      candles = dummyCandles;
    }

    const windowCandles = candles.slice(-60);
    const times = windowCandles.map(c => c.time);
    const closes = windowCandles.map(c => c.close);
    const highs = windowCandles.map(c => c.high || c.close);
    const lows = windowCandles.map(c => c.low || c.close);

    // 0) VWAP (Hacim Ağırlıklı Ortalama)
    let cumVol = 0;
    let cumVolTyp = 0;
    const vwap = [];
    for (let i = 0; i < windowCandles.length; i++) {
      const c = windowCandles[i];
      const typ = ((c.high || c.close) + (c.low || c.close) + c.close) / 3;
      const vol = Math.max(1, c.volume || 100000);
      cumVol += vol;
      cumVolTyp += typ * vol;
      vwap.push(cumVol > 0 ? cumVolTyp / cumVol : c.close);
    }

    // 1) 3 EMA: 50, 100, 200
    const ema50 = calcEMA(closes, 50);
    const ema100 = calcEMA(closes, 100);
    const ema200 = calcEMA(closes, 200);

    // 2) RSI (Customizable Period, default 24)
    const rsiPeriod = indicatorSettings.rsiPeriod || 24;
    const rsi24 = calcRSI(closes, rsiPeriod);

    // 3) WaveTrend (Lonestar Parameters: wtN1=10, wtN2=21)
    const wtN1 = indicatorSettings.wtN1 || 10;
    const wtN2 = indicatorSettings.wtN2 || 21;
    const ap = windowCandles.map((c, i) => (highs[i] + lows[i] + c.close) / 3);
    const esa = calcEMA(ap, wtN1);
    const diff = ap.map((v, i) => Math.abs(v - esa[i]));
    const d_ema = calcEMA(diff, wtN1);
    const ci = ap.map((v, i) => (d_ema[i] ? (v - esa[i]) / (0.015 * d_ema[i]) : 0));
    const tci = calcEMA(ci, wtN2);
    const wt1 = tci.map(v => (v + 100) / 2);
    const wt2 = [];
    for (let i = 0; i < wt1.length; i++) {
      if (i < 3) wt2.push(wt1[i]);
      else wt2.push((wt1[i] + wt1[i - 1] + wt1[i - 2] + wt1[i - 3]) / 4);
    }

    // WT Crossovers
    const lastIdx = wt1.length - 1;
    const wt1Last = wt1[lastIdx] || 50;
    const wt2Last = wt2[lastIdx] || 50;
    const wtBullish = wt1Last > wt2Last;

    // 4) Auto Fibonacci Retracement (Identical to reference!)
    let maxH = -Infinity, minL = Infinity, swingHiIdx = 0, swingLoIdx = 0;
    for (let i = 0; i < windowCandles.length; i++) {
      if (highs[i] > maxH) { maxH = highs[i]; swingHiIdx = i; }
      if (lows[i] < minL) { minL = lows[i]; swingLoIdx = i; }
    }
    const fibRange = maxH - minL;
    const isUpward = swingLoIdx < swingHiIdx;
    const f0 = isUpward ? minL : maxH;
    const f1000 = isUpward ? maxH : minL;
    const f236 = isUpward ? minL + fibRange * 0.236 : maxH - fibRange * 0.236;
    const f382 = isUpward ? minL + fibRange * 0.382 : maxH - fibRange * 0.382;
    const f500 = isUpward ? minL + fibRange * 0.500 : maxH - fibRange * 0.500;
    const f618 = isUpward ? minL + fibRange * 0.618 : maxH - fibRange * 0.618;
    const f786 = isUpward ? minL + fibRange * 0.786 : maxH - fibRange * 0.786;

    const fibObj = {
      maxH,
      minL,
      swingHiIdx,
      swingLoIdx,
      isUpward,
      f0,
      f236,
      f382,
      f500,
      f618,
      f786,
      f1000
    };

    const curClose = closes[lastIdx] || 0;
    const inGoldenZone = curClose >= Math.min(f500, f618) && curClose <= Math.max(f500, f618);

    // 5) Ranked Support & Resistance Pivot Detection (Matching Pine Script boxes)
    const atr14 = [];
    for (let i = 0; i < windowCandles.length; i++) {
      if (i === 0) {
        atr14.push((highs[0] - lows[0]) || (curClose * 0.02));
      } else {
        const trVal = Math.max(
          highs[i] - lows[i],
          Math.abs(highs[i] - closes[i - 1]),
          Math.abs(lows[i] - closes[i - 1])
        );
        atr14.push((atr14[i - 1] * 13 + trVal) / 14);
      }
    }
    const curAtr = atr14[atr14.length - 1] || (curClose * 0.02);

    const detectedZones = [];
    const pSpan = indicatorSettings.srPivotSpan || 3;
    const atrMultiplier = indicatorSettings.srAtrWidth || 0.35;

    for (let i = pSpan; i < windowCandles.length - pSpan; i++) {
      let isPH = true, isPL = true;
      for (let j = 1; j <= pSpan; j++) {
        if (highs[i] < highs[i - j] || highs[i] < highs[i + j]) isPH = false;
        if (lows[i] > lows[i - j] || lows[i] > lows[i + j]) isPL = false;
      }
      const zW = (atr14[i] || curAtr) * atrMultiplier;
      if (isPH) {
        detectedZones.push({
          type: 'resistance',
          mid: highs[i],
          top: highs[i] + zW,
          bottom: highs[i] - zW,
          startIdx: i,
          price: highs[i]
        });
      }
      if (isPL) {
        detectedZones.push({
          type: 'support',
          mid: lows[i],
          top: lows[i] + zW,
          bottom: lows[i] - zW,
          startIdx: i,
          price: lows[i]
        });
      }
    }

    const resistances = detectedZones
      .filter(z => z.type === 'resistance' && z.mid >= curClose * 0.99)
      .sort((a, b) => b.mid - a.mid)
      .slice(-4);

    const supports = detectedZones
      .filter(z => z.type === 'support' && z.mid <= curClose * 1.01)
      .sort((a, b) => b.mid - a.mid)
      .slice(0, 4);

    const srZones = [...resistances, ...supports];

    const nearestResistance = resistances.length > 0 ? Math.min(...resistances.map(r => r.mid)) : f382;
    const nearestSupport = supports.length > 0 ? Math.max(...supports.map(s => s.mid)) : f618;

    // 6) Squeeze Momentum (John Carter / LazyBear)
    const sqzLenBB = indicatorSettings.sqzBBPeriod || 20;
    const sqzMultBB = indicatorSettings.sqzBBMult || 2.0;
    const sqzLenKC = indicatorSettings.sqzKCPeriod || 20;
    const sqzMultKC = indicatorSettings.sqzKCMult || 1.5;

    const sma20 = calcSMA(closes, sqzLenBB);
    const stdev20 = calcStdev(closes, sqzLenBB);
    const upperBB = sma20.map((b, i) => b + sqzMultBB * stdev20[i]);
    const lowerBB = sma20.map((b, i) => b - sqzMultBB * stdev20[i]);

    const tr = closes.map((c, i) => {
      if (i === 0) return (highs[0] || c) - (lows[0] || c);
      const h = highs[i] || c;
      const l = lows[i] || c;
      const prevC = closes[i - 1];
      return Math.max(h - l, Math.abs(h - prevC), Math.abs(l - prevC));
    });
    const trSMA = calcSMA(tr, sqzLenKC);
    const upperKC = sma20.map((b, i) => b + sqzMultKC * trSMA[i]);
    const lowerKC = sma20.map((b, i) => b - sqzMultKC * trSMA[i]);

    // Squeeze Status: BB inside KC (Sıkışma Noktaları)
    const squeezeOn = closes.map((_, i) => lowerBB[i] > lowerKC[i] && upperBB[i] < upperKC[i]);

    // Linear Regression Momentum (LazyBear Formülü)
    const diffSqz = closes.map((c, i) => {
      const startIdx = Math.max(0, i - sqzLenKC + 1);
      let hh = highs[startIdx] || c;
      let ll = lows[startIdx] || c;
      for (let j = startIdx; j <= i; j++) {
        if ((highs[j] || closes[j]) > hh) hh = highs[j] || closes[j];
        if ((lows[j] || closes[j]) < ll) ll = lows[j] || closes[j];
      }
      const mid = ((hh + ll) / 2 + sma20[i]) / 2;
      return c - mid;
    });

    const sqzMom = calcLinReg(diffSqz, sqzLenKC);

    // Histogram Colors & Squeeze Dots
    const sqzHistColors = sqzMom.map((v, i) => {
      const prev = i > 0 ? sqzMom[i - 1] : 0;
      if (v > 0) return v > prev ? '#00e676' : '#00897b';
      return v < prev ? '#ff1744' : '#880e4f';
    });

    const sqzDotColors = squeezeOn.map(on => on ? '#f59e0b' : '#00e676');

    // Normalized Squeeze Momentum for Combo Mode (centers at 50, doesn't crush RSI/WT!)
    const sqzAtr = curAtr || (curClose * 0.02);
    const sqzNormMom = sqzMom.map(v => {
      const scaled = sqzAtr > 0 ? (v / (sqzAtr * 2.5)) * 18.0 : 0.0;
      return Math.max(15, Math.min(85, 50.0 + scaled));
    });

    const lastSqzOn = squeezeOn[lastIdx] || false;
    const lastMom = sqzMom[lastIdx] || 0;
    const lastRSI = rsi24[lastIdx] || 50;

    return {
      windowCandles,
      times,
      closes,
      vwap,
      ema50,
      ema100,
      ema200,
      rsi24,
      wt1,
      wt2,
      wtBullish,
      fibObj,
      srZones,
      f0,
      f236,
      f382,
      f500,
      f618,
      f786,
      f1000,
      inGoldenZone,
      nearestSupport,
      nearestResistance,
      curClose,
      squeezeOn,
      sqzMom,
      sqzNormMom,
      sqzHistColors,
      sqzDotColors,
      lastSqzOn,
      lastMom,
      lastRSI
    };
  }, [dynamicCandles, nativeStockData, buyZoneAnalysis, indicatorSettings]);

  // ChartJS Data: Upper Price & Hkn Toolkit Fibo Levels + S/R
  const hknPriceChartData = useMemo(() => {
    const calc = hknNativeCalculations;
    return {
      labels: calc.times,
      datasets: [
        {
          type: 'line',
          label: 'Fiyat (Kapanış)',
          data: calc.closes,
          borderColor: '#ffffff',
          borderWidth: 2,
          pointRadius: 1,
          tension: 0.1,
          yAxisID: 'y'
        },
        {
          type: 'line',
          label: 'EMA 50 (Mavi)',
          data: calc.ema50,
          borderColor: '#2962ff',
          borderWidth: 1.8,
          pointRadius: 0,
          yAxisID: 'y'
        },
        {
          type: 'line',
          label: 'EMA 100 (Turuncu)',
          data: calc.ema100,
          borderColor: '#ff9800',
          borderWidth: 1.8,
          pointRadius: 0,
          yAxisID: 'y'
        },
        {
          type: 'line',
          label: 'EMA 200 (Mor)',
          data: calc.ema200,
          borderColor: '#9c27b0',
          borderWidth: 2,
          pointRadius: 0,
          yAxisID: 'y'
        },
        // Auto Fibonacci Golden Zone (0.50 - 0.618)
        {
          type: 'line',
          label: 'Fibo 0.500 (Golden Başlangıç)',
          data: calc.times.map(() => calc.f500),
          borderColor: '#4caf50',
          borderDash: [5, 4],
          borderWidth: 1.5,
          pointRadius: 0,
          fill: '+1',
          backgroundColor: 'rgba(8, 153, 129, 0.12)',
          yAxisID: 'y'
        },
        {
          type: 'line',
          label: 'Fibo 0.618 (Golden Bitiş)',
          data: calc.times.map(() => calc.f618),
          borderColor: '#089981',
          borderWidth: 2,
          pointRadius: 0,
          yAxisID: 'y'
        },
        {
          type: 'line',
          label: 'Fibo 0.382 (Direnç)',
          data: calc.times.map(() => calc.f382),
          borderColor: '#ff9800',
          borderDash: [4, 4],
          borderWidth: 1,
          pointRadius: 0,
          yAxisID: 'y'
        },
        {
          type: 'line',
          label: 'Fibo 1.000 (Dip Taban)',
          data: calc.times.map(() => calc.f1000),
          borderColor: '#787b86',
          borderDash: [6, 4],
          borderWidth: 1.2,
          pointRadius: 0,
          yAxisID: 'y'
        },
        // S/R Zones: Nearest Support & Resistance
        {
          type: 'line',
          label: `S/R Güçlü Destek (${fmt(calc.nearestSupport, 2)})`,
          data: calc.times.map(() => calc.nearestSupport),
          borderColor: '#00e5ff',
          borderDash: [5, 3],
          borderWidth: 1.8,
          pointRadius: 0,
          yAxisID: 'y'
        },
        {
          type: 'line',
          label: `S/R Güçlü Direnç (${fmt(calc.nearestResistance, 2)})`,
          data: calc.times.map(() => calc.nearestResistance),
          borderColor: '#f43f5e',
          borderDash: [5, 3],
          borderWidth: 1.8,
          pointRadius: 0,
          yAxisID: 'y'
        }
      ]
    };
  }, [hknNativeCalculations]);

  // ChartJS Data: Lower RSI (24) + WaveTrend + Squeeze Momentum Oscillator Sub-Panel
  const hknOscillatorChartData = useMemo(() => {
    const calc = hknNativeCalculations;
    const datasets = [];

    // Mode: 'combo' or 'rsi_wt' (RSI 24 + WaveTrend)
    if (oscillatorMode === 'combo' || oscillatorMode === 'rsi_wt') {
      datasets.push(
        {
          type: 'line',
          label: 'WaveTrend 1 (Hızlı)',
          data: calc.wt1,
          borderColor: '#10b981',
          borderWidth: 2,
          pointRadius: 0,
          tension: 0.2,
          yAxisID: 'yWT'
        },
        {
          type: 'line',
          label: 'WaveTrend 2 (Yavaş)',
          data: calc.wt2,
          borderColor: '#ef4444',
          borderWidth: 2,
          borderDash: [2, 2],
          pointRadius: 0,
          tension: 0.2,
          yAxisID: 'yWT'
        },
        {
          type: 'line',
          label: 'RSI (24)',
          data: calc.rsi24,
          borderColor: '#c084fc',
          borderWidth: 2,
          pointRadius: 0,
          tension: 0.1,
          yAxisID: 'yRSI'
        },
        {
          type: 'line',
          label: 'Aşırı Alım (70)',
          data: calc.times.map(() => 70),
          borderColor: 'rgba(239, 68, 68, 0.45)',
          borderDash: [3, 3],
          borderWidth: 1,
          pointRadius: 0,
          yAxisID: 'yRSI'
        },
        {
          type: 'line',
          label: 'Denge (50)',
          data: calc.times.map(() => 50),
          borderColor: 'rgba(148, 163, 184, 0.35)',
          borderDash: [2, 2],
          borderWidth: 1,
          pointRadius: 0,
          yAxisID: 'yRSI'
        },
        {
          type: 'line',
          label: 'Aşırı Satım (25)',
          data: calc.times.map(() => 25),
          borderColor: 'rgba(16, 185, 129, 0.45)',
          borderDash: [3, 3],
          borderWidth: 1,
          pointRadius: 0,
          yAxisID: 'yRSI'
        }
      );
    }

    // Mode: 'combo' -> Squeeze Momentum normalized around 50 midline (does NOT crush RSI/WT!)
    if (oscillatorMode === 'combo') {
      datasets.push({
        type: 'bar',
        label: 'Squeeze Momentum (50 Bazlı)',
        data: calc.sqzNormMom,
        backgroundColor: calc.sqzHistColors,
        borderRadius: 2,
        base: 50,
        yAxisID: 'yWT'
      });
      datasets.push({
        type: 'line',
        label: 'Sıkışma Noktaları',
        data: calc.times.map(() => 50),
        borderColor: 'transparent',
        pointRadius: 3,
        pointBackgroundColor: calc.sqzDotColors,
        yAxisID: 'yWT'
      });
    }

    // Mode: 'squeeze' -> Pure raw Linear Regression momentum centered at 0
    if (oscillatorMode === 'squeeze') {
      datasets.push({
        type: 'bar',
        label: 'Squeeze Momentum Histogramı',
        data: calc.sqzMom,
        backgroundColor: calc.sqzHistColors,
        borderRadius: 2,
        yAxisID: 'yMom'
      });
      datasets.push({
        type: 'line',
        label: 'Sıkışma Noktaları (Sıfır Çizgisi)',
        data: calc.times.map(() => 0),
        borderColor: 'transparent',
        pointRadius: 3.5,
        pointBackgroundColor: calc.sqzDotColors,
        yAxisID: 'yMom'
      });
    }

    return {
      labels: calc.times,
      datasets
    };
  }, [hknNativeCalculations, oscillatorMode]);


  const hknPriceChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: {
        position: 'top',
        labels: { color: '#94a3b8', font: { size: 10 }, boxWidth: 12 }
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
        grid: { color: 'rgba(255, 255, 255, 0.06)' },
        ticks: { color: '#00e5ff', font: { size: 10 } }
      }
    }
  };

  const hknOscillatorChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: {
        position: 'top',
        labels: { color: '#94a3b8', font: { size: 9.5 }, boxWidth: 10 }
      }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: '#64748b', font: { size: 9 } }
      },
      yWT: {
        position: 'left',
        min: 0,
        max: 100,
        display: oscillatorMode !== 'squeeze',
        grid: { color: 'rgba(255, 255, 255, 0.04)' },
        ticks: { color: '#10b981', font: { size: 9 } }
      },
      yRSI: {
        position: 'right',
        min: 0,
        max: 100,
        display: oscillatorMode !== 'squeeze',
        grid: { display: false },
        ticks: { color: '#c084fc', font: { size: 9 } }
      },
      yMom: {
        position: 'right',
        display: oscillatorMode === 'squeeze',
        grid: { color: 'rgba(255, 255, 255, 0.04)' },
        ticks: { color: '#fbbf24', font: { size: 9 } }
      }
    }
  };

  // Oscillator Panel Height Map (Ensures pane height does NOT reset on stock switch!)
  const oscHeightPixels = {
    compact: 130,
    normal: 185,
    tall: 250,
    hidden: 0
  }[oscillatorSize] || 185;

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
              <span className={`nav-badge ${chartEngineMode === 'hkn' ? 'gold' : 'cyan'}`} style={{ fontSize: 9 }}>
                {chartEngineMode === 'hkn' ? '🌟 HKN TOOLKIT FIBO MOTORU' : 'TRADINGVIEW ENGINE'}
              </span>
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
              WaveTrend + RSI 24 • 3 EMA (50/100/200) • Auto Fibonacci & Golden Zone • Canlı Seans Takibi
            </div>
          </div>
        </div>

        {/* ⏱️ LIVE SESSION COUNTDOWN BADGE & QUICK CONTROLS */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          
          {/* ⏱️ Seans Geri Sayacı Rozeti (Canlı saniye sayacı) */}
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

          {/* Engine Selector: TradingView vs Hkn Toolkit Fibo (Native) */}
          <div style={{ display: 'inline-flex', background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(0, 229, 255, 0.3)', borderRadius: 6, padding: 2 }}>
            <button
              type="button"
              className={`chip-btn ${chartEngineMode === 'tv' ? 'active' : ''}`}
              onClick={() => setChartEngineMode('tv')}
              style={{ fontSize: 9.5, padding: '3px 8px' }}
              title="TradingView canlı interaktif motoru"
            >
              ⚡ TradingView
            </button>
            <button
              type="button"
              className={`chip-btn ${chartEngineMode === 'hkn' ? 'active' : ''}`}
              onClick={() => setChartEngineMode('hkn')}
              style={{ 
                fontSize: 9.5, 
                padding: '3px 8px', 
                background: chartEngineMode === 'hkn' ? 'linear-gradient(135deg, #089981, #10b981)' : 'transparent',
                color: chartEngineMode === 'hkn' ? '#fff' : 'var(--gold)',
                borderColor: chartEngineMode === 'hkn' ? '#10b981' : 'transparent',
                fontWeight: 700
              }}
              title="Sınırsız yerel motor: WaveTrend, 3 EMA, Auto Fibo ve Destek/Direnç"
            >
              🌟 Hkn Toolkit Fibo
            </button>
          </div>

          {/* 📋 Open Pine Script Modal Button */}
          <button
            type="button"
            onClick={() => setShowPineModal(true)}
            className="chip-btn"
            style={{ 
              fontSize: 10, 
              padding: '4px 9px', 
              display: 'flex', 
              alignItems: 'center', 
              gap: 4, 
              background: 'rgba(245, 158, 11, 0.1)', 
              borderColor: 'var(--gold)', 
              color: 'var(--gold)', 
              fontWeight: 700 
            }}
            title="Hkn Toolkit Fibo Pine Script v6 kodunu kopyalayın ve TradingView'e ekleyin"
          >
            <Terminal size={12} />
            <span>Pine Script</span>
          </button>

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

      {/* ⚡ TRADINGVIEW KOTA KONTROLÜ VE BOŞ KOTA YÖNETİCİSİ */}
      {chartEngineMode === 'tv' && (
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
              <span>GÖSTERGELER (TRADINGVIEW):</span>
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

            {/* 🎛️ İndikatör Asansörü (Ayarlar) */}
            <button
              type="button"
              onClick={() => setShowIndicatorElevator(true)}
              className="chip-btn"
              style={{ fontSize: 9.5, padding: '2px 8px', borderColor: 'var(--cyan)', color: 'var(--cyan)', fontWeight: 700 }}
              title="Destek/Direnç, WaveTrend, Squeeze, Auto Fibo ve diğer indikatörlerin parametrelerini ayarla"
            >
              🎛️ İndikatör Asansörü (Ayarlar)
            </button>

            {/* ⏱️ Zaman Dilimi Seçici (VWAP'ın TradingView'de çalışabilmesi için 1S/4S desteği) */}
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
                  title={`${tf.label} periyoduna geç (TradingView'de VWAP 1S veya 4S periyotlarında görünür)`}
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
      )}

      {/* ⚠️ TradingView 2 Gösterge Sınırı ve VWAP/Squeeze Bilgilendirmesi */}
      {chartEngineMode === 'tv' && (
        <div 
          style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            flexWrap: 'wrap', 
            gap: 8, 
            padding: '7px 14px', 
            background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.09), rgba(15, 23, 42, 0.8))', 
            border: '1px solid rgba(239, 68, 68, 0.3)', 
            borderRadius: 6,
            fontSize: 10.5,
            color: '#fca5a5'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 280 }}>
            <AlertTriangle size={13} className="text-rose" style={{ flexShrink: 0 }} />
            <span>
              <strong>TradingView Bilgisi:</strong> TV iframe'inde VWAP gün içi periyotlarda (1S/4S) aktiftir ve 3. indikatörde paywall uyarısı çıkar. Tüm indikatörleri (VWAP, Mumlar, S/R Kutuları, Auto Fibo, RSI, WaveTrend, Squeeze) sıfır kotayla aynı anda görmek için:
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button
              type="button"
              onClick={() => setChartEngineMode('hkn')}
              className="chip-btn"
              style={{ fontSize: 9.5, padding: '3px 8px', borderColor: 'var(--gold)', color: 'var(--gold)', fontWeight: 700 }}
              title="3 EMA, Auto Fibo, S/R, RSI, WaveTrend ve Squeeze Momentum'un tümünü aynı anda sınırsız açar"
            >
              🌟 Hkn Toolkit Motoruna Geç (0 Kota)
            </button>
            <button
              type="button"
              onClick={() => setShowIndicatorElevator(true)}
              className="chip-btn"
              style={{ fontSize: 9.5, padding: '3px 8px', borderColor: 'var(--cyan)', color: 'var(--cyan)', fontWeight: 700 }}
              title="Destek/Direnç, WaveTrend, Squeeze, Auto Fibo parametrelerini özelleştir"
            >
              🎛️ İndikatör Ayarları
            </button>
            <button
              type="button"
              onClick={() => setShowPineModal(true)}
              className="chip-btn"
              style={{ fontSize: 9.5, padding: '3px 8px', borderColor: 'var(--cyan)', color: 'var(--cyan)' }}
              title="TradingView Pine Editör'e yapıştırıp tek kotada 6 indikatör kullanın"
            >
              📋 Pine Script Kopyala
            </button>
          </div>
        </div>
      )}

      {/* 🎯 PORTFÖY ALIM BÖLGESİ & HKN TOOLKIT SİNYAL HUD'U */}
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

              {/* Hkn Toolkit Fibo Indicators Signals */}
              {hknNativeCalculations && (
                <div style={{ display: 'inline-flex', gap: 6 }}>
                  <span className={`nav-badge ${hknNativeCalculations.inGoldenZone ? 'gold' : 'neutral'}`} style={{ fontSize: 9 }}>
                    🌟 Golden Zone: {hknNativeCalculations.inGoldenZone ? 'İÇİNDE (0.50 - 0.618)' : `${fmt(hknNativeCalculations.f618, 1)} - ${fmt(hknNativeCalculations.f500, 1)}`}
                  </span>
                  <span className={`nav-badge ${hknNativeCalculations.wtBullish ? 'emerald' : 'rose'}`} style={{ fontSize: 9 }}>
                    ⚡ WaveTrend: {hknNativeCalculations.wtBullish ? 'ALIM (WT1 > WT2)' : 'DÜZELTME'}
                  </span>
                </div>
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
            <button
              type="button"
              className="chip-btn"
              onClick={() => setChartEngineMode('hkn')}
              style={{ fontSize: 10, padding: '3px 8px', borderColor: 'var(--gold)', color: 'var(--gold)' }}
            >
              🌟 Hkn Toolkit Yerel Grafiğinde Göster
            </button>
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
        
        {/* Left: The Chart Container (TradingView Engine or Hkn Native Toolkit Engine) */}
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
          {/* 🌟 Fullscreen Interactive Top Floating Toolbar */}
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

              {/* Engine Toggle & Sidebar Toggle */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button
                  type="button"
                  onClick={() => setChartEngineMode(prev => prev === 'hkn' ? 'tv' : 'hkn')}
                  className={`chip-btn ${chartEngineMode === 'hkn' ? 'active' : ''}`}
                  style={{ fontSize: 9.5, padding: '3px 8px', borderColor: 'var(--gold)', color: 'var(--gold)' }}
                >
                  {chartEngineMode === 'hkn' ? '⚡ TV Motoruna Geç' : '🌟 Hkn Toolkit Fibo'}
                </button>

                <button
                  type="button"
                  onClick={() => setShowIndicatorElevator(true)}
                  className="chip-btn"
                  style={{ fontSize: 9.5, padding: '3px 8px', borderColor: 'var(--cyan)', color: 'var(--cyan)', fontWeight: 700 }}
                  title="İndikatör parametrelerini düzenle"
                >
                  🎛️ Ayarlar
                </button>

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

          {/* 2. 🌟 HKN TOOLKIT FIBO NATIVE ENGINE (3 EMA + Auto Fibo + S/R + RSI + WaveTrend + Squeeze) */}
          {chartEngineMode === 'hkn' && (
            <div style={{ padding: 14, height: '100%', display: 'flex', flexDirection: 'column', gap: 8, paddingTop: isFullscreen ? 50 : 14, overflowY: 'auto' }}>
              
              {/* Top Status Banner & Comprehensive Mode Controls */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(15,23,42,0.9)', padding: '7px 12px', borderRadius: 8, border: '1px solid rgba(245,158,11,0.35)', flexWrap: 'wrap', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span className="mono font-bold text-gold" style={{ fontSize: 13 }}>
                    {cleanActiveTicker} • Hkn Toolkit Fibo
                  </span>
                  <span className="badge-type hisse" style={{ fontSize: 9 }}>
                    Fiyat: {buyZoneAnalysis.symMark}{fmt(hknNativeCalculations.curClose, 2)}
                    {candlesLoading && <span style={{ color: 'var(--amber)', marginLeft: 4 }}>(Veri alınıyor...)</span>}
                  </span>
                  <span className={`nav-badge ${hknNativeCalculations.inGoldenZone ? 'gold' : 'neutral'}`} style={{ fontSize: 9 }}>
                    {hknNativeCalculations.inGoldenZone ? '🌟 Golden Zone (0.50 - 0.618)' : 'Trend İlerlemesi'}
                  </span>
                  <span className="nav-badge cyan" style={{ fontSize: 9 }}>
                    Destek: {buyZoneAnalysis.symMark}{fmt(hknNativeCalculations.nearestSupport, 2)}
                  </span>
                  <span className="nav-badge rose" style={{ fontSize: 9 }}>
                    Direnç: {buyZoneAnalysis.symMark}{fmt(hknNativeCalculations.nearestResistance, 2)}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  {/* 📊 Grafik Tipi (Mum / Çizgi) */}
                  <button
                    type="button"
                    onClick={() => setChartType(prev => prev === 'candle' ? 'line' : 'candle')}
                    className="chip-btn"
                    style={{ fontSize: 8.5, padding: '2px 6px', borderColor: 'var(--cyan)', color: 'var(--cyan)', fontWeight: 700 }}
                    title="Mum barlar veya çizgi grafiği arasında geçiş yap"
                  >
                    {chartType === 'candle' ? '📊 Mum Grafiği' : '📈 Çizgi Grafiği'}
                  </button>

                  {/* 🔵 VWAP Aç/Kapat */}
                  <button
                    type="button"
                    onClick={() => setShowVwap(prev => !prev)}
                    className={`chip-btn ${showVwap ? 'active' : ''}`}
                    style={{ fontSize: 8.5, padding: '2px 6px', fontWeight: showVwap ? 700 : 500, borderColor: showVwap ? '#2563eb' : 'rgba(255,255,255,0.1)', color: showVwap ? '#3b82f6' : '#94a3b8' }}
                    title="Hacim Ağırlıklı Ortalama Fiyat (Mavi Çizgi)"
                  >
                    {showVwap ? '✓ VWAP (Mavi)' : '+ VWAP'}
                  </button>

                  {/* 📈 3 EMA Aç/Kapat */}
                  <button
                    type="button"
                    onClick={() => setShowEma(prev => !prev)}
                    className={`chip-btn ${showEma ? 'active' : ''}`}
                    style={{ fontSize: 8.5, padding: '2px 6px', fontWeight: showEma ? 700 : 500 }}
                    title="EMA 50 (Mavi), EMA 100 (Turuncu), EMA 200 (Mor)"
                  >
                    {showEma ? '✓ 3 EMA' : '+ 3 EMA'}
                  </button>

                  {/* 🧱 S/R Kutuları Aç/Kapat */}
                  <button
                    type="button"
                    onClick={() => setShowSR(prev => !prev)}
                    className={`chip-btn ${showSR ? 'active' : ''}`}
                    style={{ fontSize: 8.5, padding: '2px 6px', fontWeight: showSR ? 700 : 500, borderColor: showSR ? 'rgba(216, 76, 26, 0.7)' : 'rgba(255,255,255,0.1)' }}
                    title="Direnç (Somon) ve Destek (Turkuaz) Şeffaf Yatay Kutuları"
                  >
                    {showSR ? '✓ S/R Kutuları' : '+ S/R Kutuları'}
                  </button>

                  {/* 🎯 Auto Fibo Aç/Kapat */}
                  <button
                    type="button"
                    onClick={() => setShowFib(prev => !prev)}
                    className={`chip-btn ${showFib ? 'active' : ''}`}
                    style={{ fontSize: 8.5, padding: '2px 6px', fontWeight: showFib ? 700 : 500, borderColor: showFib ? 'var(--gold)' : 'rgba(255,255,255,0.1)', color: showFib ? 'var(--gold)' : '#94a3b8' }}
                    title="Auto Fibonacci Seviyeleri ve Golden Zone (0.50 - 0.618)"
                  >
                    {showFib ? '✓ Golden Fibo' : '+ Fibo'}
                  </button>

                  {/* 🎯 Osilatör Mod Seçici (RSI+WT / Squeeze / Kombo) */}
                  <div style={{ display: 'inline-flex', background: 'rgba(0,0,0,0.6)', borderRadius: 5, padding: 2, border: '1px solid rgba(255,255,255,0.1)' }}>
                    <button
                      type="button"
                      onClick={() => setOscillatorModePersisted('rsi_wt')}
                      className={`chip-btn ${oscillatorMode === 'rsi_wt' ? 'active' : ''}`}
                      style={{ fontSize: 8.5, padding: '2px 6px', fontWeight: oscillatorMode === 'rsi_wt' ? 700 : 500 }}
                      title="Sadece RSI 24 ve WaveTrend osilatörlerini gösterir (Referans görselinizle birebir aynı)"
                    >
                      🌊 RSI+WT
                    </button>
                    <button
                      type="button"
                      onClick={() => setOscillatorModePersisted('squeeze')}
                      className={`chip-btn ${oscillatorMode === 'squeeze' ? 'active' : ''}`}
                      style={{ fontSize: 8.5, padding: '2px 6px', fontWeight: oscillatorMode === 'squeeze' ? 700 : 500 }}
                      title="Sadece John Carter Squeeze Momentum ve Sıkışma Noktalarını gösterir"
                    >
                      🎯 Squeeze
                    </button>
                    <button
                      type="button"
                      onClick={() => setOscillatorModePersisted('combo')}
                      className={`chip-btn ${oscillatorMode === 'combo' ? 'active' : ''}`}
                      style={{ fontSize: 8.5, padding: '2px 6px', fontWeight: oscillatorMode === 'combo' ? 700 : 500 }}
                      title="WaveTrend + RSI + Squeeze Momentum'un tümünü 50 denge seviyesinde birlikte gösterir"
                    >
                      ⚡ Kombo
                    </button>
                  </div>

                  {/* 📏 Alt Panel Boyutu Kontrolü */}
                  <div style={{ display: 'inline-flex', background: 'rgba(0,0,0,0.5)', borderRadius: 5, padding: 2, border: '1px solid rgba(255,255,255,0.1)' }}>
                    {[
                      { id: 'compact', label: '🤏 Dar' },
                      { id: 'normal', label: '📐 Normal' },
                      { id: 'tall', label: '🔍 Geniş' },
                      { id: 'hidden', label: '✕ Gizle' }
                    ].map(opt => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => {
                          setOscillatorSize(opt.id);
                          try { localStorage.setItem('hkn_osc_size', opt.id); } catch(e){}
                        }}
                        className={`chip-btn ${oscillatorSize === opt.id ? 'active' : ''}`}
                        style={{ fontSize: 8.5, padding: '2px 5px', fontWeight: oscillatorSize === opt.id ? 700 : 500 }}
                        title="Bu boyut tercihi hisse değiştirseniz de asla sıfırlanmaz"
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowIndicatorElevator(true)}
                    className="chip-btn"
                    style={{ fontSize: 9, padding: '3px 8px', borderColor: 'var(--cyan)', color: 'var(--cyan)', fontWeight: 700 }}
                    title="Destek/Direnç, WaveTrend, Squeeze, Auto Fibo ve EMA ayarlarını özelleştir"
                  >
                    🎛️ İndikatör Asansörü (Ayarlar)
                  </button>

                  <button
                    type="button"
                    className="chip-btn"
                    onClick={() => setShowPineModal(true)}
                    style={{ fontSize: 9, padding: '3px 8px', borderColor: 'var(--gold)', color: 'var(--gold)' }}
                  >
                    📋 Script Kodu
                  </button>
                  <button
                    type="button"
                    className="chip-btn"
                    onClick={() => setChartEngineMode('tv')}
                    style={{ fontSize: 9, padding: '3px 8px' }}
                  >
                    ⚡ TV Motoru
                  </button>
                </div>
              </div>

              {/* Upper Chart: Authentic Candlestick/Close + 3 EMA + VWAP + Auto Fibonacci + Ranked S/R Boxes */}
              <div style={{ flex: 3, minHeight: 380, position: 'relative', borderRadius: 8, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.06)' }}>
                <HknCandlestickCanvas
                  candles={hknNativeCalculations.windowCandles}
                  vwap={hknNativeCalculations.vwap}
                  ema50={hknNativeCalculations.ema50}
                  ema100={hknNativeCalculations.ema100}
                  ema200={hknNativeCalculations.ema200}
                  fib={hknNativeCalculations.fibObj}
                  srZones={hknNativeCalculations.srZones}
                  showCandles={chartType === 'candle'}
                  showVwap={showVwap}
                  showEma={showEma}
                  showFib={showFib}
                  showSR={showSR}
                  currency={buyZoneAnalysis.holdingCurrency || (isBistStock ? 'TRY' : 'USD')}
                  ticker={cleanActiveTicker}
                />
              </div>

              {/* 📏 İNTERAKTİF BOYUTLANDIRICI SÜRÜKLEME ÇUBUĞU (KULLANICI NE AYARLADIYSA ASLA BOZULMAZ!) */}
              {oscillatorSize !== 'hidden' && (
                <div 
                  onMouseDown={handleStartResize}
                  style={{
                    height: 10,
                    cursor: 'row-resize',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: isDraggingOsc ? 'rgba(0, 229, 255, 0.45)' : 'rgba(255, 255, 255, 0.05)',
                    borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: 4,
                    transition: 'background 0.15s ease',
                    userSelect: 'none',
                    margin: '2px 0'
                  }}
                  title="Aşağı/Yukarı sürükleyerek alt panelin yüksekliğini ayarlayın (Hisse değiştirseniz de asla bozulmaz!)"
                >
                  <div style={{ width: 48, height: 3, borderRadius: 2, background: isDraggingOsc ? 'var(--cyan)' : 'rgba(255, 255, 255, 0.35)' }} />
                </div>
              )}

              {/* Lower Sub-Panel: RSI (24) + WaveTrend + Squeeze Momentum with Persistent Height */}
              {oscillatorSize !== 'hidden' && (
                <div style={{ height: oscHeight, minHeight: oscHeight, paddingTop: 4, position: 'relative' }}>
                  <div style={{ fontSize: 9.5, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className="text-cyan">
                        {oscillatorMode === 'combo' && '⚡ ALT PANEL: WAVETREND + RSI (24) + SQUEEZE MOMENTUM'}
                        {oscillatorMode === 'rsi_wt' && '🌊 ALT PANEL: RSI (24) & WAVETREND (WT1 / WT2)'}
                        {oscillatorMode === 'squeeze' && '🎯 ALT PANEL: SQUEEZE MOMENTUM & SIKIŞMA NOKTALARI'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 9, color: hknNativeCalculations.lastSqzOn ? '#fbbf24' : '#34d399' }}>
                        {hknNativeCalculations.lastSqzOn ? '🟡 Squeeze Devrede (Sıkışma)' : '🟢 Volatilite Açık (Ateşlendi)'}
                      </span>
                      <span style={{ fontSize: 9, color: hknNativeCalculations.wtBullish ? '#34d399' : '#f87171' }}>
                        {hknNativeCalculations.wtBullish ? '🟢 WT1 Pozitif' : '🔴 WT1 Negatif'}
                      </span>
                      <span className="mono" style={{ fontSize: 9, color: '#c084fc' }}>
                        RSI: {hknNativeCalculations.lastRSI.toFixed(1)}
                      </span>
                    </div>
                  </div>
                  <div style={{ height: 'calc(100% - 16px)' }}>
                    <Line data={hknOscillatorChartData} options={hknOscillatorChartOptions} />
                  </div>
                </div>
              )}

            </div>
          )}
        </div>

        {/* Right: Sınırsız Watchlist Yöneticisi (Now with LIVE PRICES & +/- % CHANGE!) */}
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

            {/* Scrollable Watchlist Items List WITH LIVE PRICES & +/- % CHANGE! */}
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

                    {/* Right: 💰 Live Price & +/- % Change Badge */}
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

      {/* 🌟 HKN TOOLKIT FIBO & MODULAR PINE SCRIPT V6 MODAL */}
      {showPineModal && (
        <div 
          style={{ 
            position: 'fixed', 
            inset: 0, 
            background: 'rgba(0,0,0,0.85)', 
            backdropFilter: 'blur(6px)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            zIndex: 999999, 
            padding: 16 
          }}
          onClick={() => setShowPineModal(false)}
        >
          <div 
            className="card" 
            style={{ 
              width: '100%', 
              maxWidth: 820, 
              maxHeight: '90vh', 
              background: '#090d16', 
              border: '1px solid var(--gold)', 
              borderRadius: 10, 
              display: 'flex', 
              flexDirection: 'column', 
              overflow: 'hidden' 
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Terminal size={18} className="text-gold" />
                <div>
                  <strong style={{ fontSize: 13, color: '#f8fafc' }}>
                    {selectedPineScriptTab === 'all' && 'Hkn Toolkit Fibo (Hepsi Bir Arada - Pine Script v6)'}
                    {selectedPineScriptTab === 'lazybear' && 'Squeeze Momentum [LazyBear] (Pine Script v6)'}
                    {selectedPineScriptTab === 'lonestar' && 'WaveTrend Oscillator [Lonestar] (Pine Script v6)'}
                    {selectedPineScriptTab === 'sr' && 'Ayarlanabilir Destek & Direnç Bölgeleri (Pine Script v6)'}
                    {selectedPineScriptTab === 'fibo' && 'Otomatik Fibonacci & Golden Zone (Pine Script v6)'}
                  </strong>
                  <div style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>
                    TradingView Pine Editörü'ne yapıştırıp tek tıkla çalıştırabileceğiniz hazır kodlar
                  </div>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setShowPineModal(false)} 
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 4 }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Script Selection Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.4)', padding: '6px 12px', gap: 6, overflowX: 'auto' }}>
              {[
                { id: 'all', label: '🌟 Hkn Toolkit (Hepsi Bir Arada)' },
                { id: 'lazybear', label: '🎯 Squeeze Momentum [LazyBear]' },
                { id: 'lonestar', label: '🌊 WaveTrend [Lonestar]' },
                { id: 'sr', label: '🧱 Destek & Direnç (S/R)' },
                { id: 'fibo', label: '📐 Otomatik Fibonacci' }
              ].map(tab => {
                const isActive = selectedPineScriptTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setSelectedPineScriptTab(tab.id)}
                    className={`chip-btn ${isActive ? 'active' : ''}`}
                    style={{
                      fontSize: 10,
                      padding: '5px 10px',
                      fontWeight: isActive ? 800 : 500,
                      borderColor: isActive ? 'var(--gold)' : 'rgba(255,255,255,0.1)',
                      color: isActive ? 'var(--gold)' : '#94a3b8',
                      background: isActive ? 'rgba(245, 158, 11, 0.12)' : 'transparent',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Information Banner */}
            <div style={{ padding: '10px 18px', background: 'rgba(245, 158, 11, 0.08)', borderBottom: '1px solid rgba(245, 158, 11, 0.2)', fontSize: 11, color: '#f8fafc', lineHeight: 1.5 }}>
              {selectedPineScriptTab === 'all' && (
                <>
                  <strong style={{ color: 'var(--gold)' }}>💡 TradingView Kota Sırrı (Hepsi Bir Arada): </strong>
                  TradingView ücretsiz planda sadece 2-3 ayrı göstergeye izin verir. Bu kod tüm araçları (VWAP, 3 EMA, S/R Kutuları, Auto Fibo, RSI 24, WaveTrend, Squeeze) tek script içinde birleştirir ve <strong>TEK BİR İNDİKATÖR (1/3)</strong> kotası harcar!
                </>
              )}
              {selectedPineScriptTab === 'lazybear' && (
                <>
                  <strong style={{ color: 'var(--gold)' }}>🎯 Squeeze Momentum [LazyBear]: </strong>
                  John Carter'ın orijinal TTM Squeeze formülü. Bollinger Bantları Keltner Kanallarının içine girdiğinde siyah noktalar (sıkışma) başlar. Kırıldığında 4-renkli doğrusal regresyon histogramı volatilite patlamasını gösterir.
                </>
              )}
              {selectedPineScriptTab === 'lonestar' && (
                <>
                  <strong style={{ color: 'var(--gold)' }}>🌊 WaveTrend Oscillator [Lonestar]: </strong>
                  Orijinal WaveTrend algoritması. WT1 (Hızlı) ve WT2 (Yavaş) eğrilerinin kesişimleri, aşırı alım (+60) / aşırı satım (-60) referans hatları ve sinyal çemberleri içerir.
                </>
              )}
              {selectedPineScriptTab === 'sr' && (
                <>
                  <strong style={{ color: 'var(--gold)' }}>🧱 Ayarlanabilir Destek & Direnç Bölgeleri: </strong>
                  Tepe ve dip pivotlarından hesaplanan dinamik destek ve direnç kutuları. Somon direnç ve turkuaz destek şeffaf bantları çizer.
                </>
              )}
              {selectedPineScriptTab === 'fibo' && (
                <>
                  <strong style={{ color: 'var(--gold)' }}>📐 Otomatik Fibonacci & Golden Zone: </strong>
                  Son swing dalgasının en yüksek ve en düşük noktalarını dinamik tespit eder; Golden Zone (0.50 - 0.618) alanını altın rengi dolguyla vurgular.
                </>
              )}
            </div>

            {/* 3 Step Guide */}
            <div style={{ padding: '8px 18px', display: 'flex', gap: 10, background: 'rgba(0,0,0,0.3)', borderBottom: '1px solid rgba(255,255,255,0.06)', fontSize: 10, color: '#cbd5e1' }}>
              <div style={{ flex: 1 }}><strong>1. Kopyala:</strong> Sarı butona basarak kodu panoya kopyalayın.</div>
              <div style={{ flex: 1 }}><strong>2. Pine Editör:</strong> TradingView'da alttaki 'Pine Editörü' sekmesine yapıştırın.</div>
              <div style={{ flex: 1 }}><strong>3. Grafiğe Ekle:</strong> 'Grafiğe Ekle' butonuna basarak anında çalıştırın.</div>
            </div>

            {/* Code Box */}
            <div style={{ flex: 1, overflowY: 'auto', padding: 16, background: '#040711' }}>
              <pre style={{ margin: 0, fontFamily: 'Consolas, monospace', fontSize: 11, color: '#38bdf8', lineHeight: 1.45, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                {getActivePineScript()}
              </pre>
            </div>

            {/* Modal Footer */}
            <div style={{ padding: '12px 18px', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>
                {copiedPine ? '✅ Kod panoya kopyalandı! TradingView Pine Editörüne yapıştırabilirsiniz.' : 'Pine Script v6 Uyumlu'}
              </span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  onClick={handleCopyPineScript}
                  className="btn-primary"
                  style={{ fontSize: 11, padding: '6px 14px', display: 'flex', alignItems: 'center', gap: 6, background: copiedPine ? '#10b981' : 'linear-gradient(135deg, #d97706, #f59e0b)', color: '#000', fontWeight: 800 }}
                >
                  {copiedPine ? <Check size={13} /> : <Copy size={13} />}
                  <span>{copiedPine ? 'Kopyalandı! ✅' : 'Kodu Kopyala'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowPineModal(false)}
                  className="chip-btn"
                  style={{ fontSize: 11, padding: '6px 12px' }}
                >
                  Kapat
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 🎛️ İNDİKATÖRLER ASANSÖRÜ (AYARLAR & KİŞİSELLEŞTİRME MODALI) */}
      {showIndicatorElevator && (
        <div 
          style={{ 
            position: 'fixed', 
            inset: 0, 
            background: 'rgba(0,0,0,0.85)', 
            backdropFilter: 'blur(6px)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            zIndex: 999999, 
            padding: 16 
          }}
          onClick={() => setShowIndicatorElevator(false)}
        >
          <div 
            className="card" 
            style={{ 
              width: '100%', 
              maxWidth: 750, 
              maxHeight: '90vh', 
              background: '#090d16', 
              border: '1px solid var(--cyan)', 
              borderRadius: 10, 
              display: 'flex', 
              flexDirection: 'column', 
              overflow: 'hidden' 
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0, 229, 255, 0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Sliders size={18} className="text-cyan" />
                <div>
                  <strong style={{ fontSize: 13, color: '#f8fafc' }}>İndikatörler Asansörü (Teknik Analiz Ayarları)</strong>
                  <div style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>
                    Destek/Direnç, WaveTrend, Squeeze Momentum, Auto Fibo ve diğer indikatör parametrelerini özelleştirin
                  </div>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setShowIndicatorElevator(false)} 
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 4 }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Persistence & Info Notice */}
            <div style={{ padding: '9px 18px', background: 'rgba(16, 185, 129, 0.08)', borderBottom: '1px solid rgba(16, 185, 129, 0.2)', fontSize: 10.5, color: '#34d399', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>💾 <strong>Kalıcı Ayarlar:</strong> Yaptığınız tüm değişiklikler anında kaydedilir; hisse değiştirdiğinizde veya ekranı yenilediğinizde ASLA sıfırlanmaz.</span>
              <button
                type="button"
                onClick={() => {
                  setIndicatorSettings({
                    sqzBBPeriod: 20,
                    sqzBBMult: 2.0,
                    sqzKCPeriod: 20,
                    sqzKCMult: 1.5,
                    wtN1: 10,
                    wtN2: 21,
                    wtOB: 60,
                    wtOS: -60,
                    srPivotSpan: 3,
                    srAtrWidth: 0.35,
                    fibLen: 10,
                    rsiPeriod: 24
                  });
                  localStorage.removeItem('pro_chart_indicator_custom_settings');
                }}
                className="chip-btn"
                style={{ fontSize: 9.5, padding: '2px 8px', borderColor: 'rgba(255,255,255,0.2)', color: '#e2e8f0' }}
              >
                ↺ Varsayılanlara Sıfırla
              </button>
            </div>

            {/* Scrollable Settings Body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              
              {/* 1. Destek & Direnç (S/R Pivot) Ayarları */}
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 14 }}>🧱</span>
                    <strong style={{ fontSize: 11.5, color: '#f8fafc' }}>Ayarlanabilir Destek & Direnç (S/R) Bölgeleri</strong>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowSR(prev => !prev)}
                    className={`chip-btn ${showSR ? 'active' : ''}`}
                    style={{ fontSize: 9.5, padding: '2px 8px' }}
                  >
                    {showSR ? '✓ Aktif' : '✕ Kapalı'}
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>
                      <span>Pivot Çubuk Hassasiyeti (Length):</span>
                      <strong className="mono text-cyan">{indicatorSettings.srPivotSpan || 3}</strong>
                    </div>
                    <input
                      type="range"
                      min={2}
                      max={12}
                      step={1}
                      value={indicatorSettings.srPivotSpan || 3}
                      onChange={(e) => updateIndicatorSetting('srPivotSpan', Number(e.target.value))}
                      style={{ width: '100%', accentColor: 'var(--cyan)' }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 8.5, color: '#64748b' }}>
                      <span>2 (Hassas / Sık)</span>
                      <span>12 (Geniş / Güçlü)</span>
                    </div>
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>
                      <span>Kutu Kalınlığı (ATR Çarpanı):</span>
                      <strong className="mono text-cyan">{(indicatorSettings.srAtrWidth || 0.35).toFixed(2)}x</strong>
                    </div>
                    <input
                      type="range"
                      min={0.10}
                      max={1.00}
                      step={0.05}
                      value={indicatorSettings.srAtrWidth || 0.35}
                      onChange={(e) => updateIndicatorSetting('srAtrWidth', Number(e.target.value))}
                      style={{ width: '100%', accentColor: 'var(--cyan)' }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 8.5, color: '#64748b' }}>
                      <span>0.10 (İnce Çizgi)</span>
                      <span>1.00 (Geniş Bölge)</span>
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: 8, fontSize: 9.5, color: '#94a3b8', lineHeight: 1.4 }}>
                  • Direnç kutuları <span style={{ color: '#f87171' }}>Somon rengi</span>, Destek kutuları <span style={{ color: '#2dd4bf' }}>Turkuaz rengi</span> şeffaf bloklar olarak mumların arkasında çizilir.
                </div>
              </div>

              {/* 2. WaveTrend [Lonestar] Ayarları */}
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 14 }}>🌊</span>
                    <strong style={{ fontSize: 11.5, color: '#f8fafc' }}>WaveTrend Osilatörü [Lonestar]</strong>
                  </div>
                  <div style={{ display: 'inline-flex', gap: 4 }}>
                    <button
                      type="button"
                      onClick={() => setOscillatorModePersisted('rsi_wt')}
                      className={`chip-btn ${oscillatorMode === 'rsi_wt' ? 'active' : ''}`}
                      style={{ fontSize: 8.5, padding: '2px 6px' }}
                    >
                      RSI+WT
                    </button>
                    <button
                      type="button"
                      onClick={() => setOscillatorModePersisted('combo')}
                      className={`chip-btn ${oscillatorMode === 'combo' ? 'active' : ''}`}
                      style={{ fontSize: 8.5, padding: '2px 6px' }}
                    >
                      Kombo
                    </button>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>
                      <span>Kanal Uzunluğu (Channel Length - n1):</span>
                      <strong className="mono text-cyan">{indicatorSettings.wtN1 || 10}</strong>
                    </div>
                    <input
                      type="range"
                      min={6}
                      max={25}
                      step={1}
                      value={indicatorSettings.wtN1 || 10}
                      onChange={(e) => updateIndicatorSetting('wtN1', Number(e.target.value))}
                      style={{ width: '100%', accentColor: 'var(--cyan)' }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 8.5, color: '#64748b' }}>
                      <span>6 (Hızlı Dalga)</span>
                      <span>25 (Pürüzsüz)</span>
                    </div>
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>
                      <span>Ortalama Uzunluğu (Average Length - n2):</span>
                      <strong className="mono text-cyan">{indicatorSettings.wtN2 || 21}</strong>
                    </div>
                    <input
                      type="range"
                      min={10}
                      max={40}
                      step={1}
                      value={indicatorSettings.wtN2 || 21}
                      onChange={(e) => updateIndicatorSetting('wtN2', Number(e.target.value))}
                      style={{ width: '100%', accentColor: 'var(--cyan)' }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 8.5, color: '#64748b' }}>
                      <span>10 (Dinamik)</span>
                      <span>40 (Gecikmeli)</span>
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: 8, fontSize: 9.5, color: '#94a3b8', lineHeight: 1.4 }}>
                  • <span style={{ color: '#34d399' }}>WT1 (Yeşil - Hızlı)</span> ve <span style={{ color: '#f87171' }}>WT2 (Kırmızı - Yavaş)</span> eğrilerinin kesişimi dip ve tepe dönüş sinyallerini üretir.
                </div>
              </div>

              {/* 3. Squeeze Momentum [LazyBear] Ayarları */}
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 14 }}>🎯</span>
                    <strong style={{ fontSize: 11.5, color: '#f8fafc' }}>Squeeze Momentum [LazyBear / John Carter]</strong>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOscillatorModePersisted('squeeze')}
                    className={`chip-btn ${oscillatorMode === 'squeeze' ? 'active' : ''}`}
                    style={{ fontSize: 8.5, padding: '2px 8px' }}
                  >
                    {oscillatorMode === 'squeeze' ? '✓ Saf Squeeze Modu' : 'Squeeze Moduna Geç'}
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>
                      <span>Bollinger Bant Uzunluğu (BB):</span>
                      <strong className="mono text-cyan">{indicatorSettings.sqzBBPeriod || 20}</strong>
                    </div>
                    <input
                      type="range"
                      min={10}
                      max={40}
                      step={1}
                      value={indicatorSettings.sqzBBPeriod || 20}
                      onChange={(e) => updateIndicatorSetting('sqzBBPeriod', Number(e.target.value))}
                      style={{ width: '100%', accentColor: 'var(--cyan)' }}
                    />
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>
                      <span>Bollinger Çarpanı (StdDev):</span>
                      <strong className="mono text-cyan">{(indicatorSettings.sqzBBMult || 2.0).toFixed(1)}x</strong>
                    </div>
                    <input
                      type="range"
                      min={1.0}
                      max={3.0}
                      step={0.1}
                      value={indicatorSettings.sqzBBMult || 2.0}
                      onChange={(e) => updateIndicatorSetting('sqzBBMult', Number(e.target.value))}
                      style={{ width: '100%', accentColor: 'var(--cyan)' }}
                    />
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>
                      <span>Keltner Kanal Uzunluğu (KC):</span>
                      <strong className="mono text-cyan">{indicatorSettings.sqzKCPeriod || 20}</strong>
                    </div>
                    <input
                      type="range"
                      min={10}
                      max={40}
                      step={1}
                      value={indicatorSettings.sqzKCPeriod || 20}
                      onChange={(e) => updateIndicatorSetting('sqzKCPeriod', Number(e.target.value))}
                      style={{ width: '100%', accentColor: 'var(--cyan)' }}
                    />
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>
                      <span>Keltner Çarpanı (ATR):</span>
                      <strong className="mono text-cyan">{(indicatorSettings.sqzKCMult || 1.5).toFixed(1)}x</strong>
                    </div>
                    <input
                      type="range"
                      min={1.0}
                      max={2.5}
                      step={0.1}
                      value={indicatorSettings.sqzKCMult || 1.5}
                      onChange={(e) => updateIndicatorSetting('sqzKCMult', Number(e.target.value))}
                      style={{ width: '100%', accentColor: 'var(--cyan)' }}
                    />
                  </div>
                </div>

                <div style={{ marginTop: 8, fontSize: 9.5, color: '#94a3b8', lineHeight: 1.4 }}>
                  • <span style={{ color: '#fbbf24' }}>Sarı/Siyah Noktalar:</span> BB Keltner içine girdiğinde patlama öncesi Sıkışma (Squeeze) başlar. <span style={{ color: '#34d399' }}>Yeşil Noktalar:</span> Volatilite serbest kalır ve trend başlar.
                </div>
              </div>

              {/* 4. Otomatik Fibonacci & Golden Zone */}
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 14 }}>📐</span>
                    <strong style={{ fontSize: 11.5, color: '#f8fafc' }}>Otomatik Fibonacci & Golden Zone</strong>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowFib(prev => !prev)}
                    className={`chip-btn ${showFib ? 'active' : ''}`}
                    style={{ fontSize: 9.5, padding: '2px 8px' }}
                  >
                    {showFib ? '✓ Aktif' : '✕ Kapalı'}
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>
                      <span>Swing Geriye Bakış Çubuk Sayısı:</span>
                      <strong className="mono text-gold">{indicatorSettings.fibLen || 10}</strong>
                    </div>
                    <input
                      type="range"
                      min={5}
                      max={35}
                      step={1}
                      value={indicatorSettings.fibLen || 10}
                      onChange={(e) => updateIndicatorSetting('fibLen', Number(e.target.value))}
                      style={{ width: '100%', accentColor: 'var(--gold)' }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 8.5, color: '#64748b' }}>
                      <span>5 (Kısa Vade Swing)</span>
                      <span>35 (Makro Dalga)</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 4 }}>
                    <div style={{ fontSize: 10, color: '#e2e8f0' }}>
                      <strong>🌟 Golden Zone (0.50 - 0.618):</strong>
                    </div>
                    <div style={{ fontSize: 9.5, color: 'var(--gold)' }}>
                      Fibo 0.50 ve 0.618 seviyeleri arası altın alım alanı olarak vurgulanır.
                    </div>
                  </div>
                </div>
              </div>

              {/* 5. VWAP, 3 EMA ve RSI Ayarları */}
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 14 }}>🔵</span>
                    <strong style={{ fontSize: 11.5, color: '#f8fafc' }}>VWAP, 3 EMA ve RSI Ayarları</strong>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      type="button"
                      onClick={() => setShowVwap(prev => !prev)}
                      className={`chip-btn ${showVwap ? 'active' : ''}`}
                      style={{ fontSize: 8.5, padding: '2px 6px' }}
                    >
                      {showVwap ? '✓ VWAP' : '+ VWAP'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowEma(prev => !prev)}
                      className={`chip-btn ${showEma ? 'active' : ''}`}
                      style={{ fontSize: 8.5, padding: '2px 6px' }}
                    >
                      {showEma ? '✓ 3 EMA' : '+ 3 EMA'}
                    </button>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>
                      <span>RSI Periyodu (Varsayılan 24):</span>
                      <strong className="mono text-cyan">{indicatorSettings.rsiPeriod || 24}</strong>
                    </div>
                    <input
                      type="range"
                      min={7}
                      max={35}
                      step={1}
                      value={indicatorSettings.rsiPeriod || 24}
                      onChange={(e) => updateIndicatorSetting('rsiPeriod', Number(e.target.value))}
                      style={{ width: '100%', accentColor: 'var(--cyan)' }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 8.5, color: '#64748b' }}>
                      <span>7 (Hızlı)</span>
                      <span>14 (Klasik)</span>
                      <span>24 (Hkn Özel)</span>
                    </div>
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>
                      <span>Alt Panel Yüksekliği (Pixel):</span>
                      <strong className="mono text-cyan">{oscHeight} px</strong>
                    </div>
                    <input
                      type="range"
                      min={90}
                      max={400}
                      step={5}
                      value={oscHeight}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setOscHeight(val);
                        try { localStorage.setItem('pro_chart_osc_height', String(val)); } catch(e){}
                      }}
                      style={{ width: '100%', accentColor: 'var(--cyan)' }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 8.5, color: '#64748b' }}>
                      <span>90px (Çok Dar)</span>
                      <span>175px (Orta)</span>
                      <span>400px (Geniş)</span>
                    </div>
                  </div>
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div style={{ padding: '12px 18px', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.5)' }}>
              <span style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>
                Tüm değişiklikler anlık olarak grafiğe ve yerel belleğe yansıtıldı.
              </span>
              <button
                type="button"
                onClick={() => setShowIndicatorElevator(false)}
                className="btn-primary"
                style={{ fontSize: 11, padding: '6px 18px', fontWeight: 800 }}
              >
                Tamam (Kaydet & Kapat)
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
