import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Video, 
  Mic, 
  Radio, 
  FileText, 
  Copy, 
  Check, 
  Maximize2, 
  Minimize2, 
  ChevronLeft, 
  ChevronRight, 
  Play, 
  Pause, 
  RotateCcw, 
  Sparkles, 
  Flame, 
  Globe, 
  ShieldAlert, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Coins, 
  Briefcase, 
  Layers, 
  Clock,
  ExternalLink,
  Edit3,
  Sliders,
  Calendar,
  Zap,
  Award,
  Compass,
  ShieldCheck,
  Download,
  Activity,
  BarChart3,
  PieChart,
  ArrowRight,
  RefreshCw
} from 'lucide-react';
import macroPulseData from '../data/macroPulse.json';
import latestQuotesData from '../data/latestQuotes.json';

export default function BroadcastStudioTab({ isObsPopout = false }) {
  const { marketQuotes, usdtry, fetchMarketData } = useApp();

  // Active slide index (0 to 8)
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

  // Active sub-tab inside Slide 1 ('fed': FED Faiz Tahmini, 'seasonality': S&P 500 Mevsimsellik, 'macro': TÜFE & PMI, 'matrix': Varlık Matrisi)
  const [slide1SubTab, setSlide1SubTab] = useState(() => {
    try { return localStorage.getItem('broadcast_studio_slide1_subtab') || 'fed'; } catch { return 'fed'; }
  });

  // Cross-window synchronization for OBS Pop-out (4-Way Redundant Engine)
  const syncChannelRef = useRef(null);

  const changeSlide1SubTab = (tab) => {
    setSlide1SubTab(tab);
    if (syncChannelRef.current) {
      try {
        syncChannelRef.current.postMessage({ type: 'CHANGE_SLIDE1_SUBTAB', subTab: tab, time: Date.now() });
      } catch (e) {}
    }
    try {
      localStorage.setItem('broadcast_studio_slide1_subtab', tab);
    } catch (e) {}
  };

  useEffect(() => {
    // 1. BroadcastChannel Listener
    let bc = null;
    try {
      bc = new BroadcastChannel('broadcast_studio_obs_sync');
      syncChannelRef.current = bc;
      bc.onmessage = (e) => {
        if (e.data && e.data.type === 'CHANGE_SLIDE' && typeof e.data.slideIndex === 'number') {
          setCurrentSlideIndex(e.data.slideIndex);
        }
        if (e.data && e.data.type === 'CHANGE_SLIDE1_SUBTAB' && e.data.subTab) {
          setSlide1SubTab(e.data.subTab);
        }
      };
    } catch (e) {}

    // 2. Direct Window Message Listener
    const handleWindowMsg = (e) => {
      if (e.data && e.data.type === 'CHANGE_SLIDE' && typeof e.data.slideIndex === 'number') {
        setCurrentSlideIndex(e.data.slideIndex);
      }
      if (e.data && e.data.type === 'CHANGE_SLIDE1_SUBTAB' && e.data.subTab) {
        setSlide1SubTab(e.data.subTab);
      }
    };
    window.addEventListener('message', handleWindowMsg);

    // 3. Storage Event Listener with timestamp payload
    const handleStorage = (e) => {
      if (e.key === 'broadcast_studio_synced_slide' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (typeof parsed.slideIndex === 'number') {
            setCurrentSlideIndex(parsed.slideIndex);
          }
        } catch {
          const idx = parseInt(e.newValue, 10);
          if (!isNaN(idx)) setCurrentSlideIndex(idx);
        }
      }
      if (e.key === 'broadcast_studio_slide1_subtab' && e.newValue) {
        setSlide1SubTab(e.newValue);
      }
    };
    window.addEventListener('storage', handleStorage);

    // 4. Background Heartbeat Polling (Solves Chrome background tab throttling / occlusion freezing)
    let heartbeat = null;
    if (isObsPopout) {
      document.title = 'Hakan Genç Finans - OBS Canlı Slayt (1080p)';
      heartbeat = setInterval(() => {
        try {
          const raw = localStorage.getItem('broadcast_studio_synced_slide');
          if (raw) {
            const parsed = JSON.parse(raw);
            if (typeof parsed.slideIndex === 'number' && parsed.slideIndex !== currentSlideIndex) {
              setCurrentSlideIndex(parsed.slideIndex);
            }
          }
          const subRaw = localStorage.getItem('broadcast_studio_slide1_subtab');
          if (subRaw) {
            setSlide1SubTab(prev => (prev !== subRaw ? subRaw : prev));
          }
        } catch (e) {}
      }, 200);
    }

    return () => {
      if (bc) bc.close();
      window.removeEventListener('message', handleWindowMsg);
      window.removeEventListener('storage', handleStorage);
      if (heartbeat) clearInterval(heartbeat);
    };
  }, [isObsPopout, currentSlideIndex]);

  const changeSlide = (idx) => {
    setCurrentSlideIndex(idx);

    // 1. Direct window communication (if popup reference exists)
    try {
      if (window.obsPopoutWindow && !window.obsPopoutWindow.closed) {
        window.obsPopoutWindow.postMessage({ type: 'CHANGE_SLIDE', slideIndex: idx }, '*');
      }
    } catch (e) {}

    // 2. BroadcastChannel broadcast
    try {
      if (syncChannelRef.current) {
        syncChannelRef.current.postMessage({ type: 'CHANGE_SLIDE', slideIndex: idx, time: Date.now() });
      } else {
        const bc = new BroadcastChannel('broadcast_studio_obs_sync');
        bc.postMessage({ type: 'CHANGE_SLIDE', slideIndex: idx, time: Date.now() });
      }
    } catch (e) {}

    // 3. LocalStorage persistence with timestamp guaranteeing new event
    try {
      localStorage.setItem('broadcast_studio_synced_slide', JSON.stringify({ slideIndex: idx, time: Date.now() }));
    } catch (e) {}
  };

  // View Mode: 'split' (Slide + Prompter), 'slides_only' (16:9 Presentation for recording), 'prompter_only' (Teleprompter)
  const [viewMode, setViewMode] = useState('split');

  // Fullscreen state
  const [isFullscreen, setIsFullscreen] = useState(false);
  const presentationContainerRef = useRef(null);
  const prompterScrollRef = useRef(null);

  // Prompter font size state (persisted)
  const [scriptFontSize, setScriptFontSize] = useState(() => {
    try {
      const saved = localStorage.getItem('broadcast_studio_font_size');
      return saved ? parseFloat(saved) : 14.5;
    } catch {
      return 14.5;
    }
  });

  const handleSetFontSize = (size) => {
    setScriptFontSize(size);
    try {
      localStorage.setItem('broadcast_studio_font_size', String(size));
    } catch {}
  };

  // Auto-reset prompter scroll to top when slide changes
  useEffect(() => {
    if (prompterScrollRef.current) {
      prompterScrollRef.current.scrollTop = 0;
    }
  }, [currentSlideIndex]);

  // Auto-play / Presentation Timer state
  const [isPlaying, setIsPlaying] = useState(false);
  const [slideTimerSec, setSlideTimerSec] = useState(0);
  const [copiedAll, setCopiedAll] = useState(false);
  const [copiedCurrent, setCopiedCurrent] = useState(false);
  const [isEditingScript, setIsEditingScript] = useState(false);

  // Live Pulse state (Fear & Greed, Truflation, VIX)
  const [pulse, setPulse] = useState(macroPulseData);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState(() => new Date());

  // Dynamic Date calculation
  const todayDateObj = new Date();
  const dayNames = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];
  const dayName = dayNames[todayDateObj.getDay()];
  const todayFullStr = `${todayDateObj.getDate()} ${todayDateObj.toLocaleDateString('tr-TR', { month: 'long' })} ${todayDateObj.getFullYear()} ${dayName}`;
  const isMonday = todayDateObj.getDay() === 1;

  // Custom user overrides for scripts (persisted in localStorage)
  const [customScripts, setCustomScripts] = useState(() => {
    try {
      const saved = localStorage.getItem('broadcast_studio_custom_scripts_v2');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('broadcast_studio_custom_scripts_v2', JSON.stringify(customScripts));
    } catch (e) {}
  }, [customScripts]);

  // Live data refresh handler (polls Yahoo Finance + Terminal Engine + Pulse API)
  const handleRefreshAll = async () => {
    setIsRefreshing(true);
    try {
      if (typeof fetchMarketData === 'function') {
        await fetchMarketData();
      }
      try {
        const res = await fetch('/api/market?type=pulse');
        if (res.ok) {
          const j = await res.json();
          if (j.status === 'success' && j.fearGreed) {
            setPulse(prev => ({
              ...prev,
              fear_greed_score: Math.round(j.fearGreed.score || prev.fear_greed_score),
              fear_greed_label: (j.fearGreed.rating || prev.fear_greed_label).toUpperCase(),
              vix: {
                value: j.vix?.price || prev.vix?.value || 16.04,
                change_pct: j.vix?.changePct || prev.vix?.change_pct || 0
              }
            }));
          }
        }
      } catch (e) {}

      try {
        await fetch('/api/refresh', { method: 'POST' });
      } catch (e) {}

      setLastRefreshedAt(new Date());
    } catch (err) {
      console.warn('Live refresh error:', err);
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  // Run automatically as soon as the user opens this tab!
  useEffect(() => {
    handleRefreshAll();
  }, []);

  // Robust Live Quote Resolver: AppContext marketQuotes -> latestQuotes.json -> fallback
  const getVerifiedQuote = (key, altKeys = [], fallbackPrice = 0, fallbackChange = 0) => {
    const allKeys = [key, ...altKeys];
    for (const k of allKeys) {
      if (marketQuotes && marketQuotes[k] && marketQuotes[k].price !== undefined && marketQuotes[k].price > 0) {
        return {
          price: Number(marketQuotes[k].price),
          change: Number(marketQuotes[k].changePct ?? marketQuotes[k].regularMarketChangePercent ?? 0),
          source: 'live'
        };
      }
    }
    for (const k of allKeys) {
      if (latestQuotesData && latestQuotesData[k] && latestQuotesData[k].price !== undefined) {
        return {
          price: Number(latestQuotesData[k].price),
          change: Number(latestQuotesData[k].chg_pct ?? 0),
          source: 'verified'
        };
      }
    }
    return { price: fallbackPrice, change: fallbackChange, source: 'default' };
  };

  const fmt = (v, d = 2) => (Number(v) || 0).toLocaleString('tr-TR', { minimumFractionDigits: d, maximumFractionDigits: d });

  // 1. Live & Verified Quotes for All Key Assets
  const dxy = getVerifiedQuote('DXY', ['DX-Y.NYB', 'DX=F'], 102.02, -0.08);
  const vix = getVerifiedQuote('VIX', ['^VIX'], macroPulseData?.vix?.value || 16.04, macroPulseData?.vix?.change_pct || -2.13);
  const brent = getVerifiedQuote('BRENT', ['BZ=F'], 99.78, -2.36);
  const wti = getVerifiedQuote('WTI', ['CL=F'], 89.39, -3.75);
  const gold = getVerifiedQuote('GOLD', ['GC=F', 'XAUUSD'], 4180.73, 0.08);
  const silver = getVerifiedQuote('SILVER', ['SI=F', 'XAGUSD'], 60.96, -0.03);
  const us10y = getVerifiedQuote('US10Y', ['^TNX'], 5.237, -1.06);
  const us2y = getVerifiedQuote('US2Y', ['2YY=F'], 4.422, -2.77);
  const sp500 = getVerifiedQuote('SP500', ['^GSPC'], 7666.45, 0.19);
  const sp500Etf = getVerifiedQuote('SPY', [], 762.63, -0.20);
  const nasdaq = getVerifiedQuote('NASDAQ', ['^NDX'], 30501.56, 0.31);
  const nasdaqEtf = getVerifiedQuote('QQQ', [], 739.77, 0.25);
  const dow = getVerifiedQuote('DOW', ['^DJI'], 50926.56, 0.04);
  const dowEtf = getVerifiedQuote('DIA', [], 508.55, -0.84);
  const bist100 = getVerifiedQuote('BIST100', ['XU100.IS'], 12203.80, 2.15);
  const btc = getVerifiedQuote('BTC', ['BTC-USD', 'BTCUSDT'], 86490.00, 1.88);
  const eth = getVerifiedQuote('ETH', ['ETH-USD', 'ETHUSDT'], 2684.00, 2.26);
  const total3 = getVerifiedQuote('TOTAL3', [], 748.5, 2.65);

  // Exact USD/TRY rate
  const currentUsdTry = usdtry > 0 ? usdtry : (latestQuotesData['USDTRY']?.price || 48.78);
  // Gram gold in TL: (Ons * USDTRY) / 31.1035
  const gramAltinTL = (gold.price * currentUsdTry) / 31.1035;

  // Fear & Greed Index
  const fgScore = pulse?.fear_greed_score || macroPulseData?.fear_greed_score || 31;
  const fgLabel = pulse?.fear_greed_label || macroPulseData?.fear_greed_label || 'KORKU';
  const needleRotation = -90 + (fgScore / 100) * 180;
  const hist = pulse?.fear_greed_history || macroPulseData?.fear_greed_history || {
    yesterday: 30.8,
    week_ago: 35.7,
    month_ago: 44.9,
    year_ago: 52.5
  };

  const getFgColor = (score) => {
    if (score < 25) return '#ef4444';
    if (score < 45) return '#f97316';
    if (score <= 55) return '#eab308';
    if (score <= 75) return '#34d399';
    return '#10b981';
  };

  const getFgLevelLabel = (score) => {
    if (score < 25) return 'AŞIRI KORKU';
    if (score < 45) return 'KORKU';
    if (score <= 55) return 'NÖTR';
    if (score <= 75) return 'AÇGÖZLÜLÜK';
    return 'AŞIRI AÇGÖZLÜLÜK';
  };

  // Equities & Commodities Return Matrix Data (identical to MarketPulseTab but with verified live numbers)
  const equitiesMatrix = [
    { name: 'S&P 500', symbol: 'SPY', price: sp500Etf.price || 762.63, today: sp500Etf.change || -0.20, d5: -0.67, m1: -0.58, ytd: 11.63, y1: 14.09 },
    { name: 'Nasdaq 100', symbol: 'QQQ', price: nasdaqEtf.price || 739.77, today: nasdaqEtf.change || 0.25, d5: -0.19, m1: 3.21, ytd: 20.66, y1: 22.63 },
    { name: 'Dow Jones', symbol: 'DIA', price: dowEtf.price || 508.55, today: dowEtf.change || -0.84, d5: -1.12, m1: -4.33, ytd: 5.15, y1: 9.54 },
    { name: 'BIST 100', symbol: 'XU100.IS', price: bist100.price || 12203.80, today: bist100.change || 2.15, d5: -5.31, m1: -13.14, ytd: 6.13, y1: 8.77 },
    { name: 'Altın (Ons)', symbol: 'GC=F', price: gold.price || 4180.73, today: gold.change || 0.08, d5: 0.85, m1: 3.40, ytd: 28.50, y1: 36.20 },
    { name: 'Brent Petrol', symbol: 'BZ=F', price: brent.price || 99.78, today: brent.change || -2.36, d5: -1.80, m1: -3.10, ytd: -2.40, y1: -5.10 },
    { name: 'ABD 10Y Tahvil', symbol: '^TNX', price: us10y.price || 5.237, today: us10y.change || -1.06, d5: 0.12, m1: -0.85, ytd: -1.20, y1: -2.50 },
    { name: 'Dolar / TL', symbol: 'USDTRY=X', price: currentUsdTry, today: 0.13, d5: 0.45, m1: 1.85, ytd: 18.40, y1: 32.10 }
  ];

  // 9 Complete Television Slides (Macro to Micro)
  const slides = useMemo(() => [
    // SLIDE 1: Global Market Pulse (Matching MarketPulseTab + Fed Rates + S&P 500 Seasonality + Fresh Macro Data)
    {
      id: 1,
      badge: 'GLOBAL MAKRO RADAR',
      badgeColor: 'cyan',
      title: 'Global Piyasa Nabzı & Makro Radar',
      subtitle: 'FED Faiz Tahmini (CME), S&P 500 Mevsimsellik Döngüsü ve Sıcak Makro Veriler (TÜFE & PMI)',
      durationEst: '65 sn',
      metrics: [
        { label: 'FED Faiz Beklentisi (CME)', val: '%78.4 Sabit', chg: 0, note: 'İndirim %0 • Pas/Sabit' },
        { label: 'S&P 500 Mevsimsellik', val: 'Q4 Ralli +%4.1', chg: 1.4, isUp: true, note: 'Seçim Yılı Döngüsü' },
        { label: 'Türkiye TÜFE (Yıllık)', val: '%49.38', chg: 0, note: 'Aylık %2.97 • Reel Faiz +' },
        { label: 'ABD ISM Hizmetler PMI', val: '54.9', chg: 3.2, isUp: true, note: '1.5 Yılın Zirvesi • Güçlü' }
      ],
      defaultScript: `Değerli dostlar, ekran başına ve bugünkü piyasa yayınımıza hepiniz hoş geldiniz. Bugün ${todayFullStr}. Hem küresel piyasalar hem de Borsa İstanbul açısından son derece kritik ve yön tayin edici verilerin açıklandığı bir gündeyiz.

İlk olarak sunumumuzun ilk sayfasındaki en kritik göstergeye, yani canlı CME FedWatch ekranına bakalım: Piyasa aylardır 'FED faiz indirecek' söylemiyle meşgul edilirken, ekranda gördüğünüz resmi veriler bambaşka bir gerçeği haykırıyor! Şu an yüzde 3.75 - 4.00 bandındaki mevcut faizin sabit bırakılma, yani pas geçilme olasılığı tam yüzde 78.4! Faiz indirimi ihtimali ise tam olarak yüzde 0'a çakılmış durumda. Hatta masada yüzde 21.6'lık bir faiz artışı riski bile fiyatlanıyor! Cuma günü gelen 254 bin kişilik bomba istihdam ve 54.9 seviyesindeki güçlü ISM Hizmetler PMI verisi, FED'in faiz indirimlerini neden tamamen dondurduğunu açıkça kanıtlıyor. Bu tablo ABD 10 yıllık tahvil faizini yeniden yüzde 4'ün üzerine taşırken, dolar endeksi DXY 102.50 seviyesinde güçleniyor.

İkinci kritik grafiğimiz olan S&P 500 mevsimsellik eğrisine baktığımızda ise tam bir döngü eşiğindeyiz. Tarihsel olarak ABD Başkanlık Seçimi yıllarında Ekim ayının ilk iki haftası seçim belirsizliği ve kâr realizasyonlarıyla dalgalı geçer. Ancak geçmiş 70 yıllık veri gösteriyor ki, seçimlerin tamamlanmasıyla birlikte Kasım ve Aralık aylarında S&P 500 ortalama yüzde 4.1'lik muazzam bir yıl sonu rallisine imza atıyor. Yani Ekim'deki bu silkelemeler ve dalgalanmalar aslında kurumsal fonlar için bir alım fırsatı tabanı oluşturuyor.

Yurtiçine döndüğümüzde ise masamızda Türkiye'nin son TÜFE enflasyon karnesi var: Eylül ayı aylık TÜFE yüzde 2.97 gelirken, yıllık enflasyonumuz yüzde 49.38'e geriledi. Bu verinin piyasa açısından iki büyük anlamı var: Birincisi, TCMB'nin yüzde 50'lik politika faizi ilk kez resmi enflasyonun üzerine çıktı ve Türkiye net pozitif reel faiz bölgesine yerleşti. Ancak ikincisi, hizmet enflasyonundaki katılık nedeniyle Merkez Bankası'nın faiz indirimi beklentisi Kasım'dan Aralık veya Ocak ayına ötelendi. Borsa İstanbul'un 12.200 desteğinde bekleme moduna geçmesinin ana nedeni budur. 

Orta Doğu gerilimiyle 78 dolar sınırında dalgalanan Brent petrolü ve 4.180 dolar tabanındaki ons altını da hesaba katarak şimdi 9 slaytlık profesyonel analizimize adım adım başlayalım.`
    },

    // SLIDE 2: Geopolitics & Energy Corridor
    {
      id: 2,
      badge: 'JEOPOLİTİK RADAR & ENERJİ',
      badgeColor: 'rose',
      title: 'Jeopolitik Riskler & Enerji Koridoru',
      subtitle: 'Hürmüz & Kızıldeniz Koridoru, Navlun Maliyetleri ve Petrol Arzı',
      durationEst: '55 sn',
      metrics: [
        { label: 'Brent Ham Petrol', val: `$${fmt(brent.price, 2)}`, chg: brent.change, isUp: brent.change >= 0 },
        { label: 'WTI Ham Petrol', val: `$${fmt(wti.price, 2)}`, chg: wti.change, isUp: wti.change >= 0 },
        { label: 'Navlun Risk Katsayısı', val: '+%14.2', chg: 2.1, isUp: true, note: 'Kızıldeniz & Ümit Burnu' },
        { label: 'Enerji Enflasyon Riski', val: 'Yüksek Risk', chg: 0, isUp: true }
      ],
      defaultScript: `İkinci durağımız olan jeopolitik ve enerji koridoruna baktığımızda, piyasanın sinir uçlarının nerede olduğunu çok net görüyoruz. Hürmüz Boğazı ve Kızıldeniz hattındaki tansiyon, küresel navlun ve sigorta primlerini diri tutmaya devam ediyor. Günlük 21 milyon varillik petrol trafiğinin geçtiği Hürmüz hattında Suudi Arabistan'ın Doğu-Batı boru hattı bypass kapasitesini devreye almasıyla Brent petrol yüzde 2,36 gerileyerek ${fmt(brent.price, 2)} dolar seviyesine, yani 100 dolar sınırının hemen altına indi. Burada dikkat etmemiz gereken neden-sonuç zinciri şu: Süveyş yerine Ümit Burnu'ndan dolaşan gemilerin sefer sürelerini 12 gün uzatması taşımacılık maliyetlerini artırıyor; bu durum petrol gevşese bile manşet enflasyonun düşüş hızını yavaşlatıyor ve merkez bankalarının faiz indirimlerini geciktirerek hisse senetleri üzerinde değerleme baskısı oluşturuyor.`
    },

    // SLIDE 3: Central Banks & Real Yield Shield
    {
      id: 3,
      badge: 'MERKEZ BANKALARI & REEL GETİRİ',
      badgeColor: 'amber',
      title: 'Merkez Bankaları & TL Reel Getiri Kalkanı',
      subtitle: 'Fed 25 Bp Patikası, TÜİK %49.38 TÜFE ve TCMB %50 Politika Faizi',
      durationEst: '55 sn',
      metrics: [
        { label: 'TCMB Politika Faizi', val: '%50.00', chg: 0, isUp: true, note: '+%0.62 Net Reel Faiz' },
        { label: 'Fed Fonlama Faizi', val: '%4.75 - %5.00', chg: 0, isUp: true, note: 'Kasım: 25 Bp İndirim' },
        { label: 'Türkiye TÜFE (Yıllık)', val: '%49.38', chg: -2.59, isUp: false, note: 'Aylık TÜFE: %2.97' },
        { label: '5Y CDS Risk Primi', val: '265 bp', chg: -3.5, isUp: false, note: 'Düşüş Trendi' }
      ],
      defaultScript: `Buradan merkez bankaları masamıza geçiyoruz. Küresel tarafta Fed, 254 bin kişilik istihdam ve 54.9'luk ISM PMI sonrası faiz indirim hızını yavaşlatıyor ve Kasım'da 25 baz puanlık ölçülü adıma hazırlanıyor. Peki Türkiye cephesinde ne oluyor? İşte en taze veri: TÜİK'in açıkladığı Eylül TÜFE'si aylık yüzde 2.97 geldi, yıllık enflasyon ise yüzde 49.38'e indi. Bu kritik bir dönüm noktası; çünkü TCMB'nin yüzde 50'lik politika faizi aylardır ilk defa yıllık enflasyonun üzerine çıktı ve Türkiye net pozitif reel faiz bölgesine girdi. Ancak eğitim ve kiralardaki katılık nedeniyle Merkez Bankası'nın faiz indirimine başlama tarihi Kasım'dan Aralık veya 2025 başına kaydı. Bu gecikme borsada bir miktar kâr realizasyonu yaratsa da, yüzde 50 faiz kuru baskılayarak dolar/TL üzerinde kur kalkanı görevini sürdürüyor.`
    },

    // SLIDE 4: Wall Street & AI Ecosystem
    {
      id: 4,
      badge: 'WALL STREET & YAPAY ZEKA',
      badgeColor: 'emerald',
      title: 'Wall Street: S&P 500 Mevsimsellik & AI Döngüsü',
      subtitle: 'Seçim Yılı Q4 Rallisi (+%4.1), Güçlü ISM Hizmetler (54.9) ve Büyük Teknoloji',
      durationEst: '50 sn',
      metrics: [
        { label: 'S&P 500 Endeksi', val: fmt(sp500.price, 2), chg: sp500.change, isUp: sp500.change >= 0 },
        { label: 'Nasdaq 100 Endeksi', val: fmt(nasdaq.price, 2), chg: nasdaq.change, isUp: nasdaq.change >= 0 },
        { label: 'ISM Hizmetler PMI', val: '54.9', chg: 3.2, isUp: true, note: '1.5 Yılın Zirvesi' },
        { label: 'Tarihsel Q4 Getirisi', val: '+%4.1', chg: 0, isUp: true, note: 'Seçim Yılı Ortalaması' }
      ],
      defaultScript: `Okyanusun ötesine, Wall Street'e baktığımızda ise yüksek tahvil faizine rağmen direnen güçlü bir Amerikan ekonomisi görüyoruz. ISM Hizmetler PMI'nın 54.9 ile son 1.5 yılın zirvesine çıkması ve 254 binlik tarım dışı istihdam, resesyon ihtimalini tamamen ortadan kaldırdı. S&P 500 endeksinde tarihsel mevsimsellik eğrimiz çok açık: ABD seçim yıllarında Ekim ayının ilk yarısı piyasada bir silkeleme ve düzeltme dönemi yaratır. Ancak seçim sonrasında Kasım ve Aralık aylarında endeks ortalama yüzde 4.1 yükselerek yılı tarihi zirvelerde tamamlama eğilimindedir. Nvidia'nın Blackwell çip teslimatları, kurumsal yapay zeka harcamaları ve güçlü şirket kârları bu rallinin en büyük yakıtı olmaya devam ediyor.`
    },

    // SLIDE 5: Commodities: Gold & Silver
    {
      id: 5,
      badge: 'EMTİA & KIYMETLİ MADEN',
      badgeColor: 'amber',
      title: 'Emtia Masası: Ons Altın & Gümüş',
      subtitle: '4.180$ Kurumsal Destek Tabanı, Altın/Gümüş Rasyosu ve Kapalıçarşı Gram Altın',
      durationEst: '50 sn',
      metrics: [
        { label: 'Ons Altın (XAU/USD)', val: `$${fmt(gold.price, 2)}`, chg: gold.change, isUp: gold.change >= 0 },
        { label: 'Ons Gümüş (XAG/USD)', val: `$${fmt(silver.price, 2)}`, chg: silver.change, isUp: silver.change >= 0 },
        { label: 'Gram Altın (Kapalıçarşı)', val: `${fmt(gramAltinTL, 0)} ₺`, chg: 0.15, isUp: true },
        { label: 'Altın / Gümüş Rasyosu', val: `${fmt(gold.price / (silver.price || 60.96), 1)}x`, chg: 0, note: 'Tarihsel Eşik' }
      ],
      defaultScript: `Emtia masamıza geldiğimizde ise en çok merak edilen soru altındaki fiyat dengesi. Ons altın şu an ${fmt(gold.price, 0)} dolar seviyesinde işlem görüyor ve 4.180 dolar bölgesinde çok sağlam bir kurumsal taban inşa etmiş durumda. Faizlerin yüksek kaldığı bir ortamda altının neden düşmediğinin iki somut nedeni var: Birincisi Çin başta olmak üzere gelişmekte olan merkez bankalarının dolardan bağımsız kesintisiz fiziki altın biriktirmesi; ikincisi ise jeopolitik sıcak noktaların tetiklediği güvenli liman talebi. Yurtiçinde ise dolar kuruyla birleştiğinde gram altının ${fmt(gramAltinTL, 0)} lira seviyelerinde seyretmesi yatırımcısına güçlü bir enflasyon kalkanı sunuyor. Gümüş tarafında ise ${fmt(silver.price, 2)} dolarda hem çip üretimi hem de sanayi talebi destek olmaya devam ediyor.`
    },

    // SLIDE 6: Dollar & Yield Curve
    {
      id: 6,
      badge: 'DÖVİZ & TAHVİL PİYASASI',
      badgeColor: 'purple',
      title: 'Dolar Endeksi (DXY) & Verim Eğrisi',
      subtitle: 'DXY 102 Eşiği, ABD 10Y ve 2Y Tahvil Farkı ile Yield Curve Normalleşmesi',
      durationEst: '50 sn',
      metrics: [
        { label: 'Dolar Endeksi (DXY)', val: fmt(dxy.price, 3), chg: dxy.change, isUp: dxy.change >= 0 },
        { label: 'ABD 10Y Tahvil Getirisi', val: `%${fmt(us10y.price, 3)}`, chg: us10y.change, isUp: us10y.change >= 0 },
        { label: 'ABD 2Y Tahvil Getirisi', val: `%${fmt(us2y.price, 3)}`, chg: us2y.change, isUp: us2y.change >= 0 },
        { label: '2Y / 10Y Verim Farkı', val: '+54 bp', chg: 1.2, isUp: true, note: 'Normalleşen Pozitif Eğim' }
      ],
      defaultScript: `Tahvil ve dolar cephesine geçtiğimizde piyasaları en çok rahatlatan teknik gelişmeyle karşılaşıyoruz. Dolar endeksi DXY, ${fmt(dxy.price, 2)} seviyesinde sağlam duruyor. ABD 10 yıllık tahvil getirisi ise yüzde ${fmt(us10y.price, 2)} seviyesinde dengeleniyor. Ancak asıl kritik gösterge ekranınızdaki getiri eğrisidir. 2 yıllık ve 10 yıllık tahviller arasındaki fark artı 54 baz puana yükselerek pozitif bölgeye yerleşti. Bu normalleşme şu anlama geliyor: Aylardır piyasayı tedirgin eden derin resesyon korkusu masadan tamamen kalktı. Dolar/TL tarafında ise yüzde 37'lik cazip mevduat faizi ve güçlü rezervler sayesinde kur ${fmt(currentUsdTry, 2)} seviyesinde oldukça kontrollü ve ılımlı bir bantta hareket ediyor.`
    },

    // SLIDE 7: Crypto & Spot ETF Flows
    {
      id: 7,
      badge: 'KRİPTO & LİKİDİTE',
      badgeColor: 'cyan',
      title: 'Kripto Ekosistemi: Bitcoin & Spot ETF',
      subtitle: '85.000$ Tabanı, 87.000$ Direnci, Spot ETF Girişleri ve TOTAL3 Endeksi',
      durationEst: '45 sn',
      metrics: [
        { label: 'Bitcoin (BTC)', val: `$${fmt(btc.price, 0)}`, chg: btc.change, isUp: btc.change >= 0 },
        { label: 'Ethereum (ETH)', val: `$${fmt(eth.price, 0)}`, chg: eth.change, isUp: eth.change >= 0 },
        { label: 'TOTAL3 Altcoin Hacmi', val: `$${fmt(total3.price, 1)}B`, chg: total3.change, isUp: total3.change >= 0 },
        { label: 'Kurumsal Spot ETF', val: '+$210M / Gün', chg: 3.4, isUp: true, note: 'BlackRock & Fidelity' }
      ],
      defaultScript: `Kripto para masamızda ise kurumsal para girişlerinin ivme kazandırdığı güçlü bir tablo izliyoruz. Bitcoin ${fmt(btc.price, 0)} dolar seviyesinde hareket ederek 85.000 dolar tabanını sağlama aldı ve 87.000 dolar direncini sınıyor. Bu yükselişin arkasında bireysel heyecandan ziyade doğrudan BlackRock ve Fidelity spot ETF'lerine gelen günlük 210 milyon dolarlık net kurumsal sermaye girişi yatıyor. TOTAL3 altcoin hacmimiz 748 milyar dolar seviyesinde; yani likidite henüz körü körüne her coine yayılmıyor, daha çok gerçek kullanım alanı olan büyük projelere akıyor. 85.000 dolar tabanı korunduğu sürece bir sonraki psikolojik durağımız 90.000 dolar kapısı olacaktır.`
    },

    // SLIDE 8: Borsa Istanbul & Sectors
    {
      id: 8,
      badge: 'BORSA İSTANBUL & BIST 100',
      badgeColor: 'emerald',
      title: 'Borsa İstanbul: BIST 100 & Makro Taban',
      subtitle: '12.200 Tabanı, Sektörel Güç Ayrışmaları, Cari Fazla ve Kurumsal Talep',
      durationEst: '50 sn',
      metrics: [
        { label: 'BIST 100 Endeksi', val: fmt(bist100.price, 2), chg: bist100.change, isUp: bist100.change >= 0 },
        { label: 'Temmuz Cari Fazlası', val: '+$779M', chg: 0, isUp: true, note: 'Döviz Desteği' },
        { label: '5 Yıllık CDS Primi', val: '216 bp', chg: -2.1, isUp: false, note: 'Tarihi Dip' },
        { label: 'Teknik Tepki Bandı', val: '12.200 - 13.500', chg: 0, note: 'Kurumsal Taban' }
      ],
      defaultScript: `Kendi evimize, Borsa İstanbul'a döndüğümüzde ise endeksin ${fmt(bist100.price, 0)} puanda 12.200 ana taban bölgesinden kurumsal tepki alımlarıyla karşılaştığını görüyoruz. BIST 100 endeksinde panik satışlarının önünü kesen üç temel makro çıpa var: Birincisi TCMB'nin yüzde 37'lik faiz politikası, ikincisi 779 milyon dolarlık cari fazla ve üçüncüsü 216 baz puana gerileyen CDS risk primimiz. Sektörel tarafta sermaye yeterliliği güçlü bankacılık ve döviz pozisyonu kuvvetli ihracatçı sanayi şirketleri endeksi sırtlıyor. 12.200 tabanı korunduğu müddetçe kademeli alımlarla yukarıda ilk tepki hedefimiz 12.800 ve ardından 13.500 direnci olacaktır.`
    },

    // SLIDE 9: Strategy, Cash & 48h Calendar
    {
      id: 9,
      badge: 'YATIRIMCI PUSULASI & TAKVİM',
      badgeColor: 'rose',
      title: 'Yatırımcı Pusulası & 48 Saatlik Takvim',
      subtitle: 'Önümüzdeki 48 Saatin Randevuları, Nakit Kalkanı ve Portföy Disiplini',
      durationEst: '45 sn',
      metrics: [
        { label: 'Takip Edilecek Veri', val: 'TÜİK TÜFE & ABD NFP', chg: 0, isUp: true },
        { label: 'Merkez Bankası Kararı', val: '22 Ekim PPK', chg: 0, note: '%37 Politika Faizi' },
        { label: 'Tavsiye Nakit Oranı', val: '%20 - %25', chg: 0, note: 'Likit Kalkan' },
        { label: 'Piyasa Stratejisi', val: 'Seçici & Korumalı', chg: 0, note: 'Hisse Bazlı Ayrışma' }
      ],
      defaultScript: `Yayınımızı toparlarken önümüzdeki 48 saatin kritik yol haritasına bakalım. Önümüzdeki günlerde TÜİK resmi enflasyon rakamları ve ABD tarafından gelecek istihdam verileri yakından izlenecek. Piyasalarda dalgalanmalar sürerken bizim yatırımcı olarak izlememiz gereken altın kural son derece net: Asla FOMO'ya kapılıp yükselen varlıkların peşinden koşmamak, portföyde mutlaka yüzde 20 ile 25 aralığında nakit kalkan bulundurmak ve endeks tahmininden ziyade bilançosu ve kâr marjı güçlü şirketlerde disiplinli kalmaktır. Gelişmeleri adım adım takip edip aktarmaya devam edeceğiz. Kanalımıza abone olmayı ve görüşlerinizi yorumlarda paylaşmayı unutmayın, bir sonraki yayınımızda görüşmek üzere!`
    }
  ], [
    dxy, vix, brent, wti, gold, silver, us10y, us2y, sp500, sp500Etf, nasdaq, nasdaqEtf, dow, dowEtf, bist100, btc, eth, total3, currentUsdTry, gramAltinTL, fgScore, fgLabel
  ]);

  const activeSlide = slides[currentSlideIndex];

  // Current active script (user override or default)
  const activeScript = customScripts[activeSlide.id] !== undefined 
    ? customScripts[activeSlide.id] 
    : activeSlide.defaultScript;

  // Handle script edit
  const handleScriptChange = (val) => {
    setCustomScripts(prev => ({
      ...prev,
      [activeSlide.id]: val
    }));
  };

  const handleResetCurrentScript = () => {
    setCustomScripts(prev => {
      const copy = { ...prev };
      delete copy[activeSlide.id];
      return copy;
    });
  };

  // Build clean Word document text formatted ready for pasting
  const fullDocumentText = useMemo(() => {
    let out = `HAKAN GENÇ FİNANS - YOUTUBE YAYIN AKIŞI & PROMPTER KONUŞMA METNİ\n`;
    out += `Yayın Tarihi: ${todayFullStr} | Seans Saati: ${lastRefreshedAt.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })} TSİ | Format: 9 Slaytlık TV Brifingi (~7.5 - 8 Dakika)\n\n`;
    out += `GÜNCEL CANLI PİYASA KADRANI (SON 24 SAAT):\n`;
    out += `• Brent Ham Petrol: $${fmt(brent.price, 2)} (%${fmt(brent.change, 2)})\n`;
    out += `• Ons Altın (XAU/USD): $${fmt(gold.price, 2)} (%${fmt(gold.change, 2)})\n`;
    out += `• Ons Gümüş (XAG/USD): $${fmt(silver.price, 2)} (%${fmt(silver.change, 2)})\n`;
    out += `• Borsa İstanbul (BIST 100): ${fmt(bist100.price, 2)} (%${fmt(bist100.change, 2)})\n`;
    out += `• Bitcoin (BTC/USD): $${fmt(btc.price, 0)} (%${fmt(btc.change, 2)})\n`;
    out += `• Dolar Endeksi (DXY): ${fmt(dxy.price, 3)} (%${fmt(dxy.change, 2)})\n`;
    out += `• ABD 10Y Tahvil: %${fmt(us10y.price, 3)}\n`;
    out += `• Dolar / TL: ${fmt(currentUsdTry, 2)} ₺\n`;
    out += `• Gram Altın (Kapalıçarşı): ${fmt(gramAltinTL, 0)} ₺/gr\n\n`;
    out += `================================================================================\n\n`;

    slides.forEach((s) => {
      const script = customScripts[s.id] !== undefined ? customScripts[s.id] : s.defaultScript;
      out += `[SLAYT 0${s.id} / 09] ${s.title.toUpperCase()}\n`;
      out += `Alt Başlık: ${s.subtitle} • Tahmini Süre: ${s.durationEst}\n`;
      out += `Öne Çıkan Rakamlar: ${s.metrics.map(m => `${m.label}: ${m.val}`).join(' | ')}\n\n`;
      out += `🎙️ PROMPTER KONUŞMA METNİ:\n`;
      out += `"${script}"\n\n`;
      out += `--------------------------------------------------------------------------------\n\n`;
    });

    return out;
  }, [slides, customScripts, brent, gold, silver, bist100, btc, dxy, us10y, currentUsdTry, gramAltinTL, todayFullStr, lastRefreshedAt]);

  const handleCopyAll = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(fullDocumentText).then(() => {
        setCopiedAll(true);
        setTimeout(() => setCopiedAll(false), 3000);
      });
    }
  };

  const handleCopyCurrent = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(activeScript).then(() => {
        setCopiedCurrent(true);
        setTimeout(() => setCopiedCurrent(false), 2500);
      });
    }
  };

  // Download directly as Microsoft Word .doc file
  const handleDownloadWordDoc = () => {
    const todayStr = new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
    let htmlContent = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset='utf-8'>
        <title>Hakan Genç Finans - YouTube Yayın Metni</title>
        <style>
          body { font-family: 'Calibri', 'Arial', sans-serif; font-size: 11pt; color: #2d3748; line-height: 1.5; }
          h1 { color: #1a365d; font-size: 18pt; margin-bottom: 4px; }
          h2 { color: #2b6cb0; font-size: 13pt; margin-top: 18px; margin-bottom: 4px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; }
          .meta { color: #718096; font-size: 9.5pt; font-style: italic; margin-bottom: 16px; }
          .table-box { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 10pt; }
          .table-box th { background-color: #1a365d; color: #ffffff; padding: 6px 10px; border: 1px solid #cbd5e0; }
          .table-box td { padding: 6px 10px; border: 1px solid #e2e8f0; }
          .script-box { background-color: #f7fafc; border-left: 4px solid #2b6cb0; padding: 12px 16px; margin: 10px 0 20px 0; font-size: 11.5pt; line-height: 1.6; }
          .badge { font-weight: bold; color: #2b6cb0; }
        </style>
      </head>
      <body>
        <h1>HAKAN GENÇ FİNANS</h1>
        <div style="font-size: 13pt; font-weight: bold; color: #2b6cb0; margin-bottom: 4px;">YOUTUBE YAYIN AKIŞI & PROMPTER KONUŞMA METNİ</div>
        <div class="meta">Yayın Tarihi: ${todayFullStr} | Seans Saati: ${lastRefreshedAt.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })} TSİ • Format: 9 Slaytlık TV Brifingi • Doğal Neden-Sonuç Anlatımı (~7-8 Dakika)</div>
        
        <h3>GÜNCEL CANLI PİYASA KADRANI</h3>
        <table class="table-box">
          <tr><th>Gösterge / Varlık</th><th>Son Değer / Fiyat</th><th>Günlük Değişim</th><th>Piyasa Notu</th></tr>
          <tr><td><b>Brent Ham Petrol</b></td><td>$${fmt(brent.price, 2)}</td><td>%${fmt(brent.change, 2)}</td><td>100$ Altında Dengelenme</td></tr>
          <tr><td><b>Ons Altın (XAU/USD)</b></td><td>$${fmt(gold.price, 2)}</td><td>%${fmt(gold.change, 2)}</td><td>4.180$ Taban / 4.300$ Direnç</td></tr>
          <tr><td><b>Ons Gümüş (XAG/USD)</b></td><td>$${fmt(silver.price, 2)}</td><td>%${fmt(silver.change, 2)}</td><td>Sanayi ve Yeşil Enerji Talebi</td></tr>
          <tr><td><b>Borsa İstanbul (BIST 100)</b></td><td>${fmt(bist100.price, 2)}</td><td>%${fmt(bist100.change, 2)}</td><td>12.200 Tabanı / 13.500 Hedef</td></tr>
          <tr><td><b>Bitcoin (BTC/USD)</b></td><td>$${fmt(btc.price, 0)}</td><td>%${fmt(btc.change, 2)}</td><td>85.000$ Taban / 87.000$ Direnç</td></tr>
          <tr><td><b>Dolar Endeksi (DXY)</b></td><td>${fmt(dxy.price, 3)}</td><td>%${fmt(dxy.change, 2)}</td><td>102 Direncinde Sağlam Duruş</td></tr>
          <tr><td><b>ABD 10Y Tahvil</b></td><td>%${fmt(us10y.price, 3)}</td><td>%${fmt(us10y.change, 2)}</td><td>Getiri Eğrisi Normalleşiyor (+54 bp)</td></tr>
          <tr><td><b>Dolar / TL</b></td><td>${fmt(currentUsdTry, 2)} ₺</td><td>+%0.13</td><td>%37 Reel Faiz Kalkanı Devrede</td></tr>
          <tr><td><b>Kapalıçarşı Gram Altın</b></td><td>${fmt(gramAltinTL, 0)} ₺/gr</td><td>+%0.15</td><td>Çifte Enflasyon Kalkanı</td></tr>
        </table>

        <h3>KRİTİK MAKRO GÖSTERGELER & MERKEZ BANKASI BEKLENTİLERİ</h3>
        <table class="table-box">
          <tr><th>Veri / Gösterge</th><th>Açıklanan / Piyasa Değeri</th><th>Beklenti / Durum</th><th>Piyasa Etkisi & Strateji</th></tr>
          <tr><td><b>FED CME Faiz İndirimi (7 Kasım)</b></td><td><b>%88.2 (25 bp İndirim)</b></td><td>%11.8 Pas / %0.0 (50 bp)</td><td>50 bp indirim masadan kalktı; yumuşak iniş ve DXY güçlenişi teyit edildi.</td></tr>
          <tr><td><b>S&P 500 Seçim Yılı Q4 Mevsimselliği</b></td><td><b>+%4.1 Tarihsel Ortalama</b></td><td>Kasım-Aralık Kazanma: %83.3</td><td>Ekim ayı dalgalanmaları yıl sonu rallisi öncesi dip fırsatı sunuyor.</td></tr>
          <tr><td><b>Türkiye TÜFE (Eylül 2024)</b></td><td><b>Aylık %2.97 | Yıllık %49.38</b></td><td>Beklenti: %48.2 (Pozitif Reel Faiz: +%0.62)</td><td>TCMB faizi (%50) altında ilk yıllık enflasyon, indirimler Aralık/Ocak'a ötelendi.</td></tr>
          <tr><td><b>ABD ISM Hizmetler PMI</b></td><td><b>54.9 (1.5 Yılın Zirvesi)</b></td><td>Beklenti: 51.7 | Önceki: 51.5</td><td>Resesyon tezini sildi, yeni siparişler fırladı (59.4).</td></tr>
          <tr><td><b>ABD Tarım Dışı İstihdam (NFP)</b></td><td><b>+254.000 Kişi (İşsizlik %4.1)</b></td><td>Beklenti: 140.000 Kişi</td><td>İstihdam patlaması tahvil faizlerini %4.02'ye tırmandırdı.</td></tr>
        </table>
    `;

    slides.forEach((s) => {
      const script = customScripts[s.id] !== undefined ? customScripts[s.id] : s.defaultScript;
      htmlContent += `
        <h2>[SLAYT 0${s.id} / 09] ${s.title}</h2>
        <div class="meta">${s.subtitle} • Tahmini Süre: ${s.durationEst}</div>
        <div style="font-size: 9.5pt; color: #4a5568; margin-bottom: 6px;"><b>Öne Çıkan Rakamlar:</b> ${s.metrics.map(m => `${m.label}: ${m.val}`).join(' | ')}</div>
        <div class="script-box">
          <p>${script}</p>
        </div>
      `;
    });

    htmlContent += `</body></html>`;

    const blob = new Blob([htmlContent], { type: 'application/msword;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Hakan_Genc_Finans_YouTube_Yayini_${new Date().toISOString().slice(0, 10)}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (isEditingScript) return;
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        changeSlide(currentSlideIndex < slides.length - 1 ? currentSlideIndex + 1 : 0);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        changeSlide(currentSlideIndex > 0 ? currentSlideIndex - 1 : slides.length - 1);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [slides.length, isEditingScript, currentSlideIndex]);

  // Fullscreen Presentation Mode
  const togglePresentationFullscreen = () => {
    if (!presentationContainerRef.current) return;
    if (!document.fullscreenElement) {
      presentationContainerRef.current.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch(err => {
        console.warn('Fullscreen request failed:', err);
      });
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      }).catch(err => {
        console.warn('Exit fullscreen failed:', err);
      });
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);


  // Reusable 16:9 Slide Presentation Renderer (Shared between tab view & standalone OBS pop-out)
  const renderSlideContent = (isPopout = false) => (
    <>
            {/* Slide Top TV Watermark Bar */}
            <div 
              style={{ 
                padding: '10px 18px', 
                background: 'rgba(4, 7, 17, 0.85)', 
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center' 
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="nav-badge rose" style={{ fontSize: 9.5, fontWeight: 800 }}>
                  SLAYT {activeSlide.id} / {slides.length}
                </span>
                <span style={{ fontSize: 10, color: 'var(--cyan)', fontWeight: 700, letterSpacing: '0.04em' }}>
                  {activeSlide.badge}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                  ⏱️ {activeSlide.durationEst}
                </span>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444' }} className="animate-pulse" title="Canlı Veri Beslemesi" />
                <span style={{ fontSize: 10, fontWeight: 800, color: '#f8fafc', letterSpacing: '0.05em' }}>
                  HAKAN GENÇ FİNANS TV
                </span>
              </div>
            </div>

            {/* Slide Core Content (16:9 Aspect Ratio) */}
            <div style={{ flex: 1, padding: '20px 24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              
              {/* Header Titles */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div>
                    <h1 style={{ fontSize: 'clamp(18px, 2.2vw, 24px)', fontWeight: 900, color: '#ffffff', margin: 0, letterSpacing: '-0.02em', lineHeight: 1.2 }}>
                      {activeSlide.title}
                    </h1>
                    <p style={{ fontSize: 'clamp(11px, 1.1vw, 13px)', color: '#94a3b8', margin: '4px 0 0 0' }}>
                      {activeSlide.subtitle}
                    </p>
                  </div>
                  <span className="nav-badge emerald" style={{ fontSize: 9.5, padding: '3px 8px' }}>
                    CANLI PİYASA
                  </span>
                </div>

                {/* 4 Big KPI Metric Chips */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 16 }}>
                  {activeSlide.metrics.map((m, idx) => (
                    <div 
                      key={idx}
                      style={{ 
                        padding: '8px 12px', 
                        background: 'rgba(15, 23, 42, 0.75)', 
                        border: '1px solid rgba(255, 255, 255, 0.08)', 
                        borderRadius: 6,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center'
                      }}
                    >
                      <div style={{ fontSize: 9.5, color: '#94a3b8', fontWeight: 600 }}>
                        {m.label}
                      </div>
                      <div style={{ fontSize: 16, fontWeight: 800, color: '#ffffff', marginTop: 2, fontFamily: 'var(--font-mono)' }}>
                        {m.val}
                      </div>
                      {m.chg !== undefined && m.chg !== 0 ? (
                        <div style={{ fontSize: 9.5, fontWeight: 700, color: m.isUp ? '#34d399' : '#f87171', display: 'flex', alignItems: 'center', gap: 3, marginTop: 2 }}>
                          {m.isUp ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                          <span>{m.isUp ? '+' : ''}{fmt(m.chg, 2)}%</span>
                        </div>
                      ) : m.note ? (
                        <div style={{ fontSize: 9, color: 'var(--cyan)', marginTop: 2, fontWeight: 600 }}>
                          {m.note}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>

                {/* =============================================================== */}
                {/* DYNAMIC VISUAL BODY ACCORDING TO SLIDE NUMBER                  */}
                {/* =============================================================== */}

                {/* SLIDE 1: Global Market Pulse (Matching MarketPulseTab) */}
                {activeSlide.id === 1 && (
                  <div style={{ display: 'grid', gridTemplateColumns: isPopout ? '290px minmax(0, 1fr)' : 'minmax(240px, 270px) minmax(0, 1fr)', gap: 12, alignItems: 'stretch' }}>
                    {/* Left: Fear & Greed Speedometer */}
                    <div style={{ background: '#070a12', border: '1px solid var(--border)', borderRadius: 6, padding: '12px 14px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                      <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-muted)', textAlign: 'center', marginBottom: 4 }}>
                        KORKU & AÇGÖZLÜLÜK ENDEKSİ
                      </div>

                      {/* SVG Gauge */}
                      <div style={{ position: 'relative', width: 200, height: 100, margin: '0 auto' }}>
                        <svg viewBox="0 0 280 140" style={{ width: '100%', height: '100%' }}>
                          <path d="M 20 130 A 120 120 0 0 1 55 45" fill="none" stroke="#ef4444" strokeWidth="20" strokeLinecap="round" />
                          <path d="M 60 40 A 120 120 0 0 1 120 15" fill="none" stroke="#f97316" strokeWidth="20" />
                          <path d="M 125 15 A 120 120 0 0 1 155 15" fill="none" stroke="#eab308" strokeWidth="20" />
                          <path d="M 160 15 A 120 120 0 0 1 220 40" fill="none" stroke="#34d399" strokeWidth="20" />
                          <path d="M 225 45 A 120 120 0 0 1 260 130" fill="none" stroke="#10b981" strokeWidth="20" strokeLinecap="round" />
                        </svg>
                        <div
                          style={{
                            position: 'absolute',
                            bottom: 8,
                            left: '50%',
                            width: 3,
                            height: 72,
                            background: '#fff',
                            transformOrigin: 'bottom center',
                            transform: `translateX(-50%) rotate(${needleRotation}deg)`,
                            transition: 'transform 1s cubic-bezier(0.34, 1.56, 0.64, 1)',
                            boxShadow: '0 0 8px rgba(255,255,255,0.8)',
                            borderRadius: '2px 2px 0 0',
                            zIndex: 2
                          }}
                        />
                        <div
                          style={{
                            position: 'absolute',
                            bottom: 2,
                            left: '50%',
                            transform: 'translateX(-50%)',
                            width: 14,
                            height: 14,
                            background: '#fff',
                            borderRadius: '50%',
                            border: '3px solid #000',
                            zIndex: 3
                          }}
                        />
                      </div>

                      <div style={{ textAlign: 'center', marginTop: 4 }}>
                        <div style={{ fontSize: 26, fontWeight: 900, color: getFgColor(fgScore), lineHeight: 1, fontFamily: 'var(--font-mono)' }}>
                          {fgScore}
                        </div>
                        <div style={{ fontSize: 10.5, fontWeight: 800, color: getFgColor(fgScore), marginTop: 2 }}>
                          {fgLabel}
                        </div>
                      </div>

                      {/* 4 Historical Levels */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 3, marginTop: 8, paddingTop: 6, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                        <div style={{ background: 'rgba(255,255,255,0.03)', padding: '3px 2px', borderRadius: 4, textAlign: 'center' }}>
                          <div style={{ color: 'var(--text-muted)', fontSize: 7, fontWeight: 700 }}>DÜN</div>
                          <div style={{ fontWeight: 800, color: getFgColor(hist.yesterday), fontSize: 9.5, fontFamily: 'var(--font-mono)' }}>{hist.yesterday}</div>
                        </div>
                        <div style={{ background: 'rgba(255,255,255,0.03)', padding: '3px 2px', borderRadius: 4, textAlign: 'center' }}>
                          <div style={{ color: 'var(--text-muted)', fontSize: 7, fontWeight: 700 }}>1 HAFTA</div>
                          <div style={{ fontWeight: 800, color: getFgColor(hist.week_ago), fontSize: 9.5, fontFamily: 'var(--font-mono)' }}>{hist.week_ago}</div>
                        </div>
                        <div style={{ background: 'rgba(255,255,255,0.03)', padding: '3px 2px', borderRadius: 4, textAlign: 'center' }}>
                          <div style={{ color: 'var(--text-muted)', fontSize: 7, fontWeight: 700 }}>1 AY</div>
                          <div style={{ fontWeight: 800, color: getFgColor(hist.month_ago), fontSize: 9.5, fontFamily: 'var(--font-mono)' }}>{hist.month_ago}</div>
                        </div>
                        <div style={{ background: 'rgba(255,255,255,0.03)', padding: '3px 2px', borderRadius: 4, textAlign: 'center' }}>
                          <div style={{ color: 'var(--text-muted)', fontSize: 7, fontWeight: 700 }}>1 YIL</div>
                          <div style={{ fontWeight: 800, color: getFgColor(hist.year_ago), fontSize: 9.5, fontFamily: 'var(--font-mono)' }}>{hist.year_ago}</div>
                        </div>
                      </div>

                      {/* Mini VIX & Truflation row */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginTop: 8 }}>
                        <div style={{ background: '#0b0f19', border: '1px solid var(--border)', borderRadius: 4, padding: '4px 6px', textAlign: 'center' }}>
                          <div style={{ fontSize: 8, color: 'var(--text-muted)', fontWeight: 700 }}>VIX OYNAKLIK</div>
                          <div style={{ fontSize: 13, fontWeight: 900, color: '#fff', fontFamily: 'var(--font-mono)' }}>{fmt(vix.price, 2)}</div>
                        </div>
                        <div style={{ background: '#0b0f19', border: '1px solid var(--border)', borderRadius: 4, padding: '4px 6px', textAlign: 'center' }}>
                          <div style={{ fontSize: 8, color: 'var(--text-muted)', fontWeight: 700 }}>TRUFLATION</div>
                          <div style={{ fontSize: 13, fontWeight: 900, color: '#38bdf8', fontFamily: 'var(--font-mono)' }}>%{fmt(macroPulseData?.inflation?.usa || 2.77, 2)}</div>
                        </div>
                      </div>
                    </div>

                    {/* Right: Sub-Tabbed Multi-Visual Hub (FED CME, S&P Mevsimsellik, Sıcak Makro, Varlık Matrisi) */}
                    <div style={{ background: '#070a12', border: '1px solid var(--border)', borderRadius: 6, padding: '10px 12px', display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
                      {/* Sub-Tab Navigation Header */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, marginBottom: 8, paddingBottom: 6, borderBottom: '1px solid rgba(255,255,255,0.08)', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                          {[
                            { id: 'fed', label: '🏛️ FED Faiz Beklentisi', badge: '%78.4 Pas/Sabit' },
                            { id: 'seasonality', label: '📈 S&P 500 Mevsimsellik', badge: 'Q4 +%4.1' },
                            { id: 'macro', label: '⚡ Sıcak Veriler (TÜFE/PMI)', badge: 'TÜFE 49.38%' },
                            { id: 'matrix', label: '📊 Varlık Matrisi', badge: 'Canlı' }
                          ].map((tab) => {
                            const isActive = slide1SubTab === tab.id;
                            return (
                              <button
                                key={tab.id}
                                onClick={() => changeSlide1SubTab(tab.id)}
                                style={{
                                  padding: '4px 8px',
                                  borderRadius: 4,
                                  fontSize: 9.5,
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  background: isActive ? 'rgba(56, 189, 248, 0.16)' : 'rgba(255, 255, 255, 0.03)',
                                  border: isActive ? '1px solid var(--cyan)' : '1px solid rgba(255, 255, 255, 0.08)',
                                  color: isActive ? '#38bdf8' : 'var(--text-muted)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 5,
                                  transition: 'all 0.15s ease'
                                }}
                              >
                                <span>{tab.label}</span>
                                <span style={{
                                  fontSize: 8,
                                  padding: '1px 4px',
                                  borderRadius: 3,
                                  background: isActive ? 'rgba(56, 189, 248, 0.25)' : 'rgba(255, 255, 255, 0.06)',
                                  color: isActive ? '#fff' : 'var(--text-muted)',
                                  fontFamily: 'var(--font-mono)'
                                }}>
                                  {tab.badge}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* VIEW 1: FED INTEREST RATE FORECAST (CME FedWatch) */}
                      {slide1SubTab === 'fed' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1, minWidth: 0 }}>
                          {/* CME FedWatch Header */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <div style={{ fontSize: 11, fontWeight: 800, color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span>CME FEDWATCH FAİZ BEKLENTİLERİ</span>
                                <span style={{ fontSize: 8, padding: '1px 6px', borderRadius: 3, background: 'rgba(52, 211, 153, 0.15)', color: '#34d399', border: '1px solid rgba(52, 211, 153, 0.3)', fontWeight: 800 }}>
                                  CANLI TABLO
                                </span>
                              </div>
                              <div style={{ fontSize: 8.5, color: 'var(--text-muted)', marginTop: 2 }}>
                                Mevcut Politika Faizi: <span style={{ color: '#fff', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>%3.75 - %4.00</span> (375-400 bps)
                              </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontSize: 8, color: 'var(--text-muted)' }}>PİYASA KONSENSÜSÜ</div>
                              <div style={{ fontSize: 10.5, fontWeight: 800, color: '#38bdf8', fontFamily: 'var(--font-mono)' }}>Faizi Sabit Tutma (%78.4)</div>
                            </div>
                          </div>

                          {/* Horizontal Bar Chart for FOMC Probabilities */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, background: 'rgba(0,0,0,0.3)', padding: '9px 11px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.06)' }}>
                            {/* 375-400 (Current / Pause) */}
                            <div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9.5, fontWeight: 700, marginBottom: 2 }}>
                                <span style={{ color: '#ffffff', display: 'flex', alignItems: 'center', gap: 5 }}>
                                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#10b981' }}></span>
                                  375-400 bps (Mevcut Faizi Koruma / Pas Geçme)
                                </span>
                                <span style={{ color: '#34d399', fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: 11 }}>%78.4</span>
                              </div>
                              <div style={{ height: 9, background: 'rgba(255,255,255,0.06)', borderRadius: 5, overflow: 'hidden' }}>
                                <div style={{ width: '78.4%', height: '100%', background: 'linear-gradient(90deg, #059669, #10b981)', borderRadius: 5 }}></div>
                              </div>
                              <div style={{ fontSize: 8, color: 'var(--text-muted)', marginTop: 1 }}>Ezici piyasa beklentisi — 1 ay önce %54.4 iken istihdam verisiyle zirveye çıktı</div>
                            </div>

                            {/* 400-425 (Upper / Tightening) */}
                            <div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9.5, fontWeight: 700, marginBottom: 2 }}>
                                <span style={{ color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: 5 }}>
                                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#f59e0b' }}></span>
                                  400-425 bps (Üst Bant / Faiz Artışı Riski)
                                </span>
                                <span style={{ color: '#f59e0b', fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: 11 }}>%21.6</span>
                              </div>
                              <div style={{ height: 7, background: 'rgba(255,255,255,0.06)', borderRadius: 4, overflow: 'hidden' }}>
                                <div style={{ width: '21.6%', height: '100%', background: '#f59e0b', borderRadius: 4 }}></div>
                              </div>
                              <div style={{ fontSize: 8, color: 'var(--text-muted)', marginTop: 1 }}>1 hafta önce %70.9 idi; güçlü büyüme ve petrol şokuyla masada kalan risk</div>
                            </div>

                            {/* 350-375 (Rate Cut) */}
                            <div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9.5, fontWeight: 700, marginBottom: 2 }}>
                                <span style={{ color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 5 }}>
                                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#ef4444' }}></span>
                                  350-375 bps (25 bp Faiz İndirimi)
                                </span>
                                <span style={{ color: '#ef4444', fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: 11 }}>%0.0</span>
                              </div>
                              <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
                                <div style={{ width: '0%', height: '100%', background: '#ef4444' }}></div>
                              </div>
                              <div style={{ fontSize: 8, color: '#f87171', marginTop: 1 }}>1 ay önce %29.8 iken son 254K istihdam ve 54.9 PMI sonrası tamamen SIFIRLANDI!</div>
                            </div>
                          </div>

                          {/* Historical Shift Summary Row */}
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4 }}>
                            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '3px 4px', borderRadius: 4, textAlign: 'center' }}>
                              <div style={{ fontSize: 7, color: 'var(--text-muted)', fontWeight: 700 }}>ŞİMDİ</div>
                              <div style={{ fontSize: 9, fontWeight: 800, color: '#34d399', fontFamily: 'var(--font-mono)' }}>%78.4 Pas</div>
                            </div>
                            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '3px 4px', borderRadius: 4, textAlign: 'center' }}>
                              <div style={{ fontSize: 7, color: 'var(--text-muted)', fontWeight: 700 }}>1 GÜN ÖNCE</div>
                              <div style={{ fontSize: 9, fontWeight: 800, color: '#cbd5e1', fontFamily: 'var(--font-mono)' }}>%77.9 Pas</div>
                            </div>
                            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '3px 4px', borderRadius: 4, textAlign: 'center' }}>
                              <div style={{ fontSize: 7, color: 'var(--text-muted)', fontWeight: 700 }}>1 HAFTA ÖNCE</div>
                              <div style={{ fontSize: 9, fontWeight: 800, color: '#f59e0b', fontFamily: 'var(--font-mono)' }}>%29.1 Pas</div>
                            </div>
                            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '3px 4px', borderRadius: 4, textAlign: 'center' }}>
                              <div style={{ fontSize: 7, color: 'var(--text-muted)', fontWeight: 700 }}>1 AY ÖNCE</div>
                              <div style={{ fontSize: 9, fontWeight: 800, color: '#38bdf8', fontFamily: 'var(--font-mono)' }}>%29.8 İndirim</div>
                            </div>
                          </div>

                          {/* Analytical Takeaway Box */}
                          <div style={{ background: 'rgba(56, 189, 248, 0.05)', border: '1px solid rgba(56, 189, 248, 0.2)', borderRadius: 5, padding: '6px 9px', fontSize: 8.5, color: '#cbd5e1', lineHeight: 1.4 }}>
                            <span style={{ color: '#38bdf8', fontWeight: 800 }}>⚡ PİYASA YORUMU: </span>
                            CME FedWatch verisi faiz indirimlerinin dondurulduğunu (%0.0) ve FED'in "bekle-gör" moduna geçtiğini (%78.4) resmileştirdi. Piyasada indirim bekleyenlerin aksine FED, sağlam istihdam ve canlı PMI verileriyle faizleri yüksek tutmaya devam ediyor.
                          </div>
                        </div>
                      )}

                      {/* VIEW 2: S&P 500 SEASONALITY CHART */}
                      {slide1SubTab === 'seasonality' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <div style={{ fontSize: 11, fontWeight: 800, color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span>S&P 500 TARİHSEL MEVSİMSELLİK (1950 - GÜNÜMÜZ)</span>
                                <span style={{ fontSize: 8, padding: '1px 6px', borderRadius: 3, background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', border: '1px solid rgba(245, 158, 11, 0.3)', fontWeight: 800 }}>
                                  SEÇİM YILI DÖNGÜSÜ
                                </span>
                              </div>
                              <div style={{ fontSize: 8.5, color: 'var(--text-muted)', marginTop: 2 }}>
                                Aylık Tarihsel Getiri Ortalamaları & 4. Çeyrek (Q4) Yıl Sonu Gücü
                              </div>
                            </div>
                            <div style={{ display: 'flex', gap: 6 }}>
                              <div style={{ background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.25)', borderRadius: 4, padding: '2px 7px', textAlign: 'center' }}>
                                <div style={{ fontSize: 7, color: 'var(--text-muted)', fontWeight: 700 }}>SEÇİM Q4 ORT.</div>
                                <div style={{ fontSize: 10.5, fontWeight: 900, color: '#34d399', fontFamily: 'var(--font-mono)' }}>+%4.1</div>
                              </div>
                              <div style={{ background: 'rgba(56, 189, 248, 0.12)', border: '1px solid rgba(56, 189, 248, 0.25)', borderRadius: 4, padding: '2px 7px', textAlign: 'center' }}>
                                <div style={{ fontSize: 7, color: 'var(--text-muted)', fontWeight: 700 }}>KAS-ARA KAZANMA</div>
                                <div style={{ fontSize: 10.5, fontWeight: 900, color: '#38bdf8', fontFamily: 'var(--font-mono)' }}>%83.3</div>
                              </div>
                            </div>
                          </div>

                          {/* 12-Month Bar Chart */}
                          <div style={{ background: 'rgba(0,0,0,0.3)', padding: '7px 8px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.06)' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 3, alignItems: 'flex-end', height: 75, paddingBottom: 17, position: 'relative' }}>
                              {/* Baseline 0% line */}
                              <div style={{ position: 'absolute', bottom: 17, left: 0, right: 0, height: 1, background: 'rgba(255,255,255,0.15)' }} />

                              {[
                                { m: 'Oca', ret: 1.2, isQ4: false },
                                { m: 'Şub', ret: -0.1, isQ4: false },
                                { m: 'Mar', ret: 1.1, isQ4: false },
                                { m: 'Nis', ret: 1.5, isQ4: false },
                                { m: 'May', ret: 0.3, isQ4: false },
                                { m: 'Haz', ret: 0.2, isQ4: false },
                                { m: 'Tem', ret: 1.7, isQ4: false },
                                { m: 'Ağu', ret: -0.2, isQ4: false },
                                { m: 'Eyl', ret: -1.2, isQ4: false },
                                { m: 'Eki', ret: 1.4, isQ4: true, active: true },
                                { m: 'Kas', ret: 2.8, isQ4: true },
                                { m: 'Ara', ret: 1.6, isQ4: true }
                              ].map((item) => {
                                const isPos = item.ret >= 0;
                                const barHeight = Math.min(Math.abs(item.ret) * 16, 46);
                                return (
                                  <div key={item.m} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end', position: 'relative' }}>
                                    <span style={{
                                      fontSize: 7.5,
                                      fontWeight: 800,
                                      color: item.active ? '#38bdf8' : isPos ? (item.isQ4 ? '#34d399' : '#94a3b8') : '#f87171',
                                      fontFamily: 'var(--font-mono)',
                                      marginBottom: 2
                                    }}>
                                      {isPos ? '+' : ''}{item.ret}%
                                    </span>
                                    <div style={{
                                      width: '75%',
                                      height: `${barHeight}px`,
                                      background: item.active 
                                        ? 'linear-gradient(180deg, #38bdf8, #0284c7)'
                                        : item.isQ4 
                                          ? 'linear-gradient(180deg, #10b981, #059669)'
                                          : isPos ? '#475569' : '#ef4444',
                                      borderRadius: '3px 3px 0 0',
                                      border: item.active ? '1px solid #7dd3fc' : 'none',
                                      boxShadow: item.active ? '0 0 8px rgba(56, 189, 248, 0.4)' : 'none'
                                    }} />
                                    <span style={{
                                      position: 'absolute',
                                      bottom: 0,
                                      fontSize: 7.5,
                                      fontWeight: item.isQ4 ? 800 : 600,
                                      color: item.active ? '#38bdf8' : item.isQ4 ? '#e2e8f0' : 'var(--text-muted)'
                                    }}>
                                      {item.m}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {/* Analytical Takeaway Box */}
                          <div style={{ background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: 5, padding: '7px 10px', fontSize: 8.5, color: '#cbd5e1', lineHeight: 1.45 }}>
                            <span style={{ color: '#34d399', fontWeight: 800 }}>📈 MEVSİMSELLİK KURALI: </span>
                            Ekim ayı başındaki jeopolitik risk ve seçim gerginliği çalkantıları, tarihsel olarak yıl sonu rallisi için ideal dip zeminini hazırlar. Kasım ayı (+%2.8 ortalama) S&P 500 için yılın en güçlü ayıdır; seçim sonrasında piyasa belirsizliği bittiğinde ralli hızlanır.
                          </div>
                        </div>
                      )}

                      {/* VIEW 3: HOT MACRO DATA (TURKEY CPI & US PMI / NFP) */}
                      {slide1SubTab === 'macro' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 7, flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ fontSize: 11, fontWeight: 800, color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span>⚡ BUGÜNÜN KRİTİK VERİLERİ & PİYASA ETKİSİ</span>
                            </div>
                            <span style={{ fontSize: 8, padding: '1px 6px', borderRadius: 3, background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.3)', fontWeight: 800 }}>
                              RESMİ VERİLER
                            </span>
                          </div>

                          {/* 4 Cards Grid (2x2) */}
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, flex: 1 }}>
                            {/* 1. TÜFE */}
                            <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 5, padding: '6px 8px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: 8.5, fontWeight: 800, color: 'var(--cyan)' }}>TÜRKİYE TÜFE (EYLÜL)</span>
                                <span style={{ fontSize: 7.5, color: '#34d399', fontFamily: 'var(--font-mono)', fontWeight: 800 }}>Pozitif Reel Faiz</span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 2 }}>
                                <span style={{ fontSize: 13, fontWeight: 900, color: '#fff', fontFamily: 'var(--font-mono)' }}>%49.38</span>
                                <span style={{ fontSize: 8.5, color: 'var(--text-muted)' }}>Aylık: %2.97</span>
                              </div>
                              <div style={{ fontSize: 7.5, color: '#94a3b8', marginTop: 2, lineHeight: 1.35 }}>
                                Yıllık enflasyon TCMB politika faizinin (%50.0) altına indi (+%0.62 reel getiri). Ancak hizmet katılığından dolayı faiz indirimi Aralık/Ocak'a ötelendi.
                              </div>
                            </div>

                            {/* 2. ABD ISM Hizmetler PMI */}
                            <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 5, padding: '6px 8px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: 8.5, fontWeight: 800, color: '#38bdf8' }}>ABD ISM HİZMETLER PMI</span>
                                <span style={{ fontSize: 7.5, color: '#34d399', fontFamily: 'var(--font-mono)', fontWeight: 800 }}>1.5 Yılın Zirvesi</span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 2 }}>
                                <span style={{ fontSize: 13, fontWeight: 900, color: '#fff', fontFamily: 'var(--font-mono)' }}>54.9</span>
                                <span style={{ fontSize: 8.5, color: '#34d399' }}>(Beklenti: 51.7)</span>
                              </div>
                              <div style={{ fontSize: 7.5, color: '#94a3b8', marginTop: 2, lineHeight: 1.35 }}>
                                Yeni siparişler 59.4 ile patladı. ABD ekonomisinde resesyon tezini sildi; yumuşak iniş değil, doğrudan güçlü büyümeyi teyit etti.
                              </div>
                            </div>

                            {/* 3. Tarım Dışı İstihdam */}
                            <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 5, padding: '6px 8px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: 8.5, fontWeight: 800, color: '#fbbf24' }}>ABD TARIM DIŞI İSTİHDAM</span>
                                <span style={{ fontSize: 7.5, color: '#fbbf24', fontFamily: 'var(--font-mono)', fontWeight: 800 }}>İşsizlik: %4.1</span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 2 }}>
                                <span style={{ fontSize: 13, fontWeight: 900, color: '#fff', fontFamily: 'var(--font-mono)' }}>+254K</span>
                                <span style={{ fontSize: 8.5, color: '#34d399' }}>(Beklenti: 140K)</span>
                              </div>
                              <div style={{ fontSize: 7.5, color: '#94a3b8', marginTop: 2, lineHeight: 1.35 }}>
                                50 bp faiz indirimini tamamen bitirdi. ABD 10 yıllık tahvilini %4.02'ye, DXY'yi 102.50'ye fırlattı; altında kâr satışlarını tetikledi.
                              </div>
                            </div>

                            {/* 4. Petrol & Jeopolitik */}
                            <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 5, padding: '6px 8px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: 8.5, fontWeight: 800, color: '#f87171' }}>BRENT & JEOPOLİTİK</span>
                                <span style={{ fontSize: 7.5, color: '#f87171', fontFamily: 'var(--font-mono)', fontWeight: 800 }}>Haftalık +%8.5</span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 2 }}>
                                <span style={{ fontSize: 13, fontWeight: 900, color: '#fff', fontFamily: 'var(--font-mono)' }}>$78.20</span>
                                <span style={{ fontSize: 8.5, color: 'var(--text-muted)' }}>Bant: 75$ - 82$</span>
                              </div>
                              <div style={{ fontSize: 7.5, color: '#94a3b8', marginTop: 2, lineHeight: 1.35 }}>
                                İsrail-İran gerilimi risk primi ekledi ancak OPEC+ atıl üretim kapasitesi şok dalgasını 80$ altında dizginlemeyi sürdürüyor.
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* VIEW 4: EQUITIES RETURN MATRIX TABLE */}
                      {slide1SubTab === 'matrix' && (
                        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0, overflow: 'hidden' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                            <span style={{ fontSize: 10, fontWeight: 800, color: '#e2e8f0', whiteSpace: 'nowrap' }}>
                              🏛️ KÜRESEL VARLIK PERFORMANS MATRİSİ
                            </span>
                            <span style={{ fontSize: 8, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                              Resmi Kapanış Fiyatları
                            </span>
                          </div>

                          <div style={{ overflowX: 'auto', flex: 1, minWidth: 0 }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 9, tableLayout: 'auto' }}>
                              <thead>
                                <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', textAlign: 'left' }}>
                                  <th style={{ padding: '3px 5px', whiteSpace: 'nowrap' }}>Varlık</th>
                                  <th style={{ padding: '3px 5px', textAlign: 'right', whiteSpace: 'nowrap' }}>Son Fiyat</th>
                                  <th style={{ padding: '3px 5px', textAlign: 'right', whiteSpace: 'nowrap' }}>Bugün</th>
                                  <th style={{ padding: '3px 5px', textAlign: 'right', whiteSpace: 'nowrap' }}>5 Gün</th>
                                  <th style={{ padding: '3px 5px', textAlign: 'right', whiteSpace: 'nowrap' }}>1 Ay</th>
                                  <th style={{ padding: '3px 5px', textAlign: 'right', whiteSpace: 'nowrap' }}>YTD</th>
                                </tr>
                              </thead>
                              <tbody>
                                {equitiesMatrix.map((eq, i) => {
                                  const isPositive = (n) => n >= 0;
                                  return (
                                    <tr key={eq.symbol} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)' }}>
                                      <td style={{ padding: '3px 5px', fontWeight: 700, color: '#fff', whiteSpace: 'nowrap' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                          <span>{eq.name}</span>
                                          <span style={{ fontSize: 7.5, color: 'var(--cyan)', fontFamily: 'var(--font-mono)' }}>({eq.symbol})</span>
                                        </div>
                                      </td>
                                      <td style={{ padding: '3px 5px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, whiteSpace: 'nowrap' }}>
                                        {fmt(eq.price, eq.price > 1000 ? 0 : 2)}
                                      </td>
                                      <td style={{ padding: '3px 5px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 800, color: isPositive(eq.today) ? 'var(--emerald)' : 'var(--red)', whiteSpace: 'nowrap' }}>
                                        {isPositive(eq.today) ? '+' : ''}{fmt(eq.today, 2)}%
                                      </td>
                                      <td style={{ padding: '3px 5px', textAlign: 'right', fontFamily: 'var(--font-mono)', color: isPositive(eq.d5) ? 'var(--emerald)' : 'var(--red)', whiteSpace: 'nowrap' }}>
                                        {isPositive(eq.d5) ? '+' : ''}{fmt(eq.d5, 2)}%
                                      </td>
                                      <td style={{ padding: '3px 5px', textAlign: 'right', fontFamily: 'var(--font-mono)', color: isPositive(eq.m1) ? 'var(--emerald)' : 'var(--red)', whiteSpace: 'nowrap' }}>
                                        {isPositive(eq.m1) ? '+' : ''}{fmt(eq.m1, 2)}%
                                      </td>
                                      <td style={{ padding: '3px 5px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color: isPositive(eq.ytd) ? 'var(--emerald)' : 'var(--red)', whiteSpace: 'nowrap' }}>
                                        {isPositive(eq.ytd) ? '+' : ''}{fmt(eq.ytd, 2)}%
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
                  </div>
                )}

                {/* SLIDE 2: Geopolitics & Energy Transmission Chain */}
                {activeSlide.id === 2 && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    {/* Left: Strategic Bottlenecks */}
                    <div style={{ background: '#070a12', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 6, padding: 14 }}>
                      <div style={{ fontSize: 11, fontWeight: 800, color: '#f87171', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                        <Flame size={14} />
                        <span>STRATEJİK BOĞAZLAR & TEDARİK RİSKLERİ</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <div style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: 6, padding: '10px 12px' }}>
                          <div style={{ fontWeight: 800, color: '#ffffff', fontSize: 12 }}>Hürmüz Boğazı & Petrol Akışı</div>
                          <div style={{ fontSize: 11, color: '#cbd5e1', marginTop: 2 }}>Günlük 21M varil küresel petrol sevkiyatı; Suudi Doğu-Batı hattı bypass kapasitesi devrede.</div>
                        </div>
                        <div style={{ background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.2)', borderRadius: 6, padding: '10px 12px' }}>
                          <div style={{ fontWeight: 800, color: '#ffffff', fontSize: 12 }}>Kızıldeniz & Ümit Burnu Rotası</div>
                          <div style={{ fontSize: 11, color: '#cbd5e1', marginTop: 2 }}>Süveyş geçişlerinde aksama: Gemiler Ümit Burnu'ndan dolaşıyor, sefer süreleri +12 gün uzadı.</div>
                        </div>
                        <div style={{ background: 'rgba(56, 189, 248, 0.08)', border: '1px solid rgba(56, 189, 248, 0.2)', borderRadius: 6, padding: '10px 12px' }}>
                          <div style={{ fontWeight: 800, color: '#ffffff', fontSize: 12 }}>Navlun ve Sigorta Primleri</div>
                          <div style={{ fontSize: 11, color: '#cbd5e1', marginTop: 2 }}>Taşımacılık navlun maliyetlerinde +%14 artış; ham madde maliyetlerini diri tutuyor.</div>
                        </div>
                      </div>
                    </div>

                    {/* Right: Cause-and-Effect Flow Pipeline */}
                    <div style={{ background: '#070a12', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: 6, padding: 14 }}>
                      <div style={{ fontSize: 11, fontWeight: 800, color: '#fbbf24', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                        <Zap size={14} />
                        <span>ZİNCİRLEME PİYASA İLETİM MEKANİZMASI</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {[
                          { step: '1', title: 'Sıcak Bölge Gerilimi', desc: 'Hürmüz ve Kızıldeniz ekseninde tanker güvenlik riskleri', color: '#ef4444' },
                          { step: '2', title: 'Navlun & Petrol Sıçraması', desc: `Brent petrol $${fmt(brent.price, 2)} bandında tutunarak 100$ tabanını zorluyor`, color: '#f97316' },
                          { step: '3', title: 'Yapışkan Manşet Enflasyon', desc: 'Enerji ve lojistik maliyetleri enflasyon düşüş hızını yavaşlatıyor', color: '#eab308' },
                          { step: '4', title: 'Geciken Faiz İndirimleri', desc: 'Merkez bankaları faiz indirim adımlarını ötelemek zorunda kalıyor', color: '#38bdf8' },
                          { step: '5', title: 'Güvenli Liman Talebi', desc: 'Ons altın ve nakit dolara kurumsal taban desteği oluşuyor', color: '#10b981' }
                        ].map((item, idx) => (
                          <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.03)', padding: '6px 10px', borderRadius: 4, borderLeft: `3px solid ${item.color}` }}>
                            <span style={{ fontSize: 10, fontWeight: 900, color: item.color, background: `${item.color}20`, width: 20, height: 20, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              {item.step}
                            </span>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 11, fontWeight: 700, color: '#fff' }}>{item.title}</div>
                              <div style={{ fontSize: 10, color: '#94a3b8' }}>{item.desc}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* SLIDE 3: Central Banks & Real Yield Comparison */}
                {activeSlide.id === 3 && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: 14 }}>
                    {/* Left: Global Central Banks Real Yield Table */}
                    <div style={{ background: '#070a12', border: '1px solid var(--border)', borderRadius: 6, padding: 14 }}>
                      <div style={{ fontSize: 11, fontWeight: 800, color: '#e2e8f0', marginBottom: 10 }}>
                        🏛️ KÜRESEL REEL FAİZ KARŞILAŞTIRMASI
                      </div>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', textAlign: 'left' }}>
                            <th style={{ padding: '6px 8px' }}>Merkez Bankası</th>
                            <th style={{ padding: '6px 8px', textAlign: 'right' }}>Faiz</th>
                            <th style={{ padding: '6px 8px', textAlign: 'right' }}>Enflasyon</th>
                            <th style={{ padding: '6px 8px', textAlign: 'right' }}>Net Reel Faiz</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', background: 'rgba(16, 185, 129, 0.08)' }}>
                            <td style={{ padding: '8px 8px', fontWeight: 800, color: '#34d399' }}>🇹🇷 TCMB (Türkiye)</td>
                            <td style={{ padding: '8px 8px', textAlign: 'right', fontWeight: 800, color: '#fff' }}>%37.00</td>
                            <td style={{ padding: '8px 8px', textAlign: 'right', color: '#cbd5e1' }}>%31.51</td>
                            <td style={{ padding: '8px 8px', textAlign: 'right', fontWeight: 900, color: '#34d399', fontSize: 12 }}>+5.49 Puan</td>
                          </tr>
                          <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                            <td style={{ padding: '8px 8px', fontWeight: 700, color: '#fff' }}>🇺🇸 Fed (ABD)</td>
                            <td style={{ padding: '8px 8px', textAlign: 'right', fontWeight: 700, color: '#fff' }}>%3.75 - 4.00</td>
                            <td style={{ padding: '8px 8px', textAlign: 'right', color: '#cbd5e1' }}>%2.77</td>
                            <td style={{ padding: '8px 8px', textAlign: 'right', fontWeight: 700, color: '#38bdf8' }}>+1.10 Puan</td>
                          </tr>
                          <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                            <td style={{ padding: '8px 8px', fontWeight: 700, color: '#fff' }}>🇪🇺 ECB (Euro Bölgesi)</td>
                            <td style={{ padding: '8px 8px', textAlign: 'right', fontWeight: 700, color: '#fff' }}>%2.50</td>
                            <td style={{ padding: '8px 8px', textAlign: 'right', color: '#cbd5e1' }}>%2.20</td>
                            <td style={{ padding: '8px 8px', textAlign: 'right', fontWeight: 700, color: '#94a3b8' }}>+0.30 Puan</td>
                          </tr>
                          <tr>
                            <td style={{ padding: '8px 8px', fontWeight: 700, color: '#fff' }}>🇯🇵 BoJ (Japonya)</td>
                            <td style={{ padding: '8px 8px', textAlign: 'right', fontWeight: 700, color: '#fff' }}>%1.25</td>
                            <td style={{ padding: '8px 8px', textAlign: 'right', color: '#cbd5e1' }}>%2.80</td>
                            <td style={{ padding: '8px 8px', textAlign: 'right', fontWeight: 700, color: '#f87171' }}>-1.55 Puan</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {/* Right: Turkey 3-Layer Shield */}
                    <div style={{ background: '#070a12', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: 6, padding: 14 }}>
                      <div style={{ fontSize: 11, fontWeight: 800, color: '#34d399', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                        <ShieldCheck size={14} />
                        <span>TÜRKİYE'NİN 3 KATMANLI MAKRO KALKANI</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <div style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: 6, padding: '10px 12px' }}>
                          <div style={{ fontWeight: 800, color: '#fff', fontSize: 12 }}>1. Pozitif Reel Faiz (+%5.5)</div>
                          <div style={{ fontSize: 10.5, color: '#cbd5e1', marginTop: 2 }}>TL mevduat getirisi enflasyonu aşarak dolarizasyonu frenliyor ve yerel parayı cazip kılıyor.</div>
                        </div>
                        <div style={{ background: 'rgba(56, 189, 248, 0.08)', border: '1px solid rgba(56, 189, 248, 0.2)', borderRadius: 6, padding: '10px 12px' }}>
                          <div style={{ fontWeight: 800, color: '#fff', fontSize: 12 }}>2. Düşen Ülke Risk Primi (216 bp CDS)</div>
                          <div style={{ fontSize: 10.5, color: '#cbd5e1', marginTop: 2 }}>Tarihi dip seviyelerde seyreden CDS primi yabancı sermaye girişlerini ve tahvil talebini destekliyor.</div>
                        </div>
                        <div style={{ background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.2)', borderRadius: 6, padding: '10px 12px' }}>
                          <div style={{ fontWeight: 800, color: '#fff', fontSize: 12 }}>3. Cari Denge Kalkanı (+$779M Cari Fazla)</div>
                          <div style={{ fontSize: 10.5, color: '#cbd5e1', marginTop: 2 }}>Dış ticaret dengesindeki toparlanma ve turizm gelirleri TCMB rezervlerini tahkim ediyor.</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* SLIDE 4: Wall Street & AI Ecosystem (No numbers clutter!) */}
                {activeSlide.id === 4 && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    {/* Left: Sectoral Momentum Barometer */}
                    <div style={{ background: '#070a12', border: '1px solid var(--border)', borderRadius: 6, padding: 14 }}>
                      <div style={{ fontSize: 11, fontWeight: 800, color: '#e2e8f0', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <BarChart3 size={14} />
                        <span>SEKTÖREL SERMAYE & LİKİDİTE GÜCÜ</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {[
                          { name: 'Yapay Zeka & Yarı İletkenler (Semi)', pct: 94, status: 'Lider / Çok Güçlü', color: '#10b981' },
                          { name: 'Bulut Bilişim & Kurumsal Yazılım', pct: 82, status: 'Güçlü Nakit Akışı', color: '#38bdf8' },
                          { name: 'Büyük Bankacılık & Finans', pct: 76, status: 'Dengeli / Dayanıklı', color: '#818cf8' },
                          { name: 'Geleneksel Sanayi & Üretim', pct: 58, status: 'Temkinli / Seçici', color: '#f59e0b' },
                          { name: 'Tüketici & Perakende', pct: 48, status: 'Yüksek Faiz Baskısı', color: '#ef4444' }
                        ].map((sec, idx) => (
                          <div key={idx}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, marginBottom: 3 }}>
                              <span style={{ fontWeight: 700, color: '#fff' }}>{sec.name}</span>
                              <span style={{ color: sec.color, fontWeight: 800 }}>{sec.status}</span>
                            </div>
                            <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
                              <div style={{ width: `${sec.pct}%`, height: '100%', background: sec.color, borderRadius: 3 }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Right: Big Tech / AI Ecosystem Leaders */}
                    <div style={{ background: '#070a12', border: '1px solid var(--border)', borderRadius: 6, padding: 14 }}>
                      <div style={{ fontSize: 11, fontWeight: 800, color: '#38bdf8', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Sparkles size={14} />
                        <span>YAPAY ZEKA DEVLERİ & TEMATİK DÖNGÜ</span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                        {[
                          { sym: 'NVIDIA', note: 'Blackwell B200 Çip Sevkiyatları', tag: 'AI Lokomotif', color: '#10b981' },
                          { sym: 'AMAZON', note: 'AWS Bulut Marjları & Nakit Akışı', tag: 'Bulut Gücü', color: '#38bdf8' },
                          { sym: 'ALPHABET', note: 'Gemini AI & 22 F/K Çarpanı', tag: 'Makul Değer', color: '#818cf8' },
                          { sym: 'META', note: 'AI Destekli Reklam Gelirleri', tag: 'Yüksek Marj', color: '#ec4899' },
                          { sym: 'TESLA', note: 'Robotaxi & Otonom Sürüş Ölçeği', tag: 'Vizyon Primi', color: '#f59e0b' },
                          { sym: 'MICROSOFT', note: 'Azure & Copilot Kurumsal Lisans', tag: 'Kurumsal Güç', color: '#60a5fa' }
                        ].map((tech, idx) => (
                          <div key={idx} style={{ background: 'rgba(255,255,255,0.025)', border: `1px solid ${tech.color}30`, borderRadius: 6, padding: '8px 10px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontWeight: 900, color: '#fff', fontSize: 11 }}>{tech.sym}</span>
                              <span style={{ fontSize: 8.5, color: tech.color, fontWeight: 800, background: `${tech.color}15`, padding: '1px 5px', borderRadius: 3 }}>
                                {tech.tag}
                              </span>
                            </div>
                            <div style={{ fontSize: 9.5, color: '#94a3b8', marginTop: 3 }}>{tech.note}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* SLIDE 5: Commodities (Gold & Silver Channels) */}
                {activeSlide.id === 5 && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    {/* Left: Gold Technical Channel */}
                    <div style={{ background: '#070a12', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: 6, padding: 14 }}>
                      <div style={{ fontSize: 11, fontWeight: 800, color: '#fbbf24', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                        <Coins size={14} />
                        <span>ONS ALTIN FİYAT KANALI & SEVİYE HARİTASI</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <div style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: 6, padding: '10px 12px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontWeight: 800, color: '#fff', fontSize: 12 }}>4.300$ - 4.360$ Seviyesi</span>
                            <span style={{ fontSize: 9, color: '#f87171', fontWeight: 800, background: 'rgba(239,68,68,0.2)', padding: '2px 6px', borderRadius: 4 }}>DİRENÇ BÖLGESİ</span>
                          </div>
                          <div style={{ fontSize: 10.5, color: '#cbd5e1', marginTop: 2 }}>Kâr realizasyonlarının geldiği kısa vadeli psikolojik tavan.</div>
                        </div>

                        <div style={{ background: 'rgba(56, 189, 248, 0.08)', border: '1px solid rgba(56, 189, 248, 0.2)', borderRadius: 6, padding: '10px 12px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontWeight: 800, color: '#fff', fontSize: 12 }}>4.250$ Seviyesi</span>
                            <span style={{ fontSize: 9, color: '#38bdf8', fontWeight: 800, background: 'rgba(56,189,248,0.2)', padding: '2px 6px', borderRadius: 4 }}>ARA DENGE</span>
                          </div>
                          <div style={{ fontSize: 10.5, color: '#cbd5e1', marginTop: 2 }}>İlk tepki ve dengelenme koridoru.</div>
                        </div>

                        <div style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: 6, padding: '10px 12px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontWeight: 800, color: '#34d399', fontSize: 12 }}>4.180$ Kurumsal Destek Tabanı</span>
                            <span style={{ fontSize: 9, color: '#34d399', fontWeight: 800, background: 'rgba(16,185,129,0.2)', padding: '2px 6px', borderRadius: 4 }}>GÜÇLÜ TABAN</span>
                          </div>
                          <div style={{ fontSize: 10.5, color: '#cbd5e1', marginTop: 2 }}>Merkez bankalarının ve kurumsal fonların fiziki alım yaptığı ana destek tabanı.</div>
                        </div>
                      </div>
                    </div>

                    {/* Right: 2 Giant Pillars */}
                    <div style={{ background: '#070a12', border: '1px solid var(--border)', borderRadius: 6, padding: 14 }}>
                      <div style={{ fontSize: 11, fontWeight: 800, color: '#e2e8f0', marginBottom: 10 }}>
                        🏛️ ALTINI AYAKTA TUTAN 2 BÜYÜK MOTOR
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, padding: '10px 12px' }}>
                          <div style={{ fontWeight: 800, color: '#fbbf24', fontSize: 12 }}>1. Merkez Bankaları Fiziki Rezerv Talebi</div>
                          <div style={{ fontSize: 10.5, color: '#cbd5e1', marginTop: 3 }}>Çin (PBoC), Hindistan ve küresel merkez bankaları rezervlerini dolardan bağımsız kılmak için fiyata bakmaksızın fiziki altın topluyor.</div>
                        </div>

                        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, padding: '10px 12px' }}>
                          <div style={{ fontWeight: 800, color: '#38bdf8', fontSize: 12 }}>2. Jeopolitik Güvenli Liman Primi</div>
                          <div style={{ fontSize: 10.5, color: '#cbd5e1', marginTop: 3 }}>Hürmüz ve Orta Doğu gerilimleri altına taban desteği oluşturarak olası satış dalgalarını anında emiyor.</div>
                        </div>

                        <div style={{ background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: 6, padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <div style={{ fontSize: 11, fontWeight: 800, color: '#34d399' }}>Kapalıçarşı Gram Altın</div>
                            <div style={{ fontSize: 9.5, color: '#94a3b8' }}>Ons ({fmt(gold.price, 0)}$) × USDTRY ({fmt(currentUsdTry, 2)}₺)</div>
                          </div>
                          <div style={{ fontSize: 18, fontWeight: 900, color: '#fff', fontFamily: 'var(--font-mono)' }}>
                            {fmt(gramAltinTL, 0)} ₺
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* SLIDE 6: Dollar & Yield Curve Normalization */}
                {activeSlide.id === 6 && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    {/* Left: Yield Curve Normalization */}
                    <div style={{ background: '#070a12', border: '1px solid rgba(56, 189, 248, 0.3)', borderRadius: 6, padding: 14 }}>
                      <div style={{ fontSize: 11, fontWeight: 800, color: '#38bdf8', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                        <Activity size={14} />
                        <span>ABD GETİRİ EĞRİSİ (YIELD CURVE) NORMALLEŞMESİ</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <div style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.25)', borderRadius: 6, padding: '12px 14px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: 12, fontWeight: 800, color: '#34d399' }}>2Y / 10Y Eğri Farkı: +54 bp</span>
                            <span style={{ fontSize: 9, color: '#34d399', fontWeight: 800, background: 'rgba(16,185,129,0.2)', padding: '2px 6px', borderRadius: 4 }}>POZİTİF BÖLGEDE</span>
                          </div>
                          <div style={{ fontSize: 11, color: '#cbd5e1', marginTop: 4 }}>
                            2 yıllık faiz (%{fmt(us2y.price, 2)}) 10 yıllık faizin (%{fmt(us10y.price, 2)}) altına indi. Ters getiri eğrisi tamamen sona erdi.
                          </div>
                        </div>

                        <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 6, padding: '10px 12px' }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: '#fff' }}>Piyasa Ne Anlatıyor?</div>
                          <div style={{ fontSize: 10.5, color: '#94a3b8', marginTop: 2 }}>
                            Aylardır süren resesyon korkusu gündemden kalktı; piyasa artık sert bir durgunluğu değil, Fed sonrası faizlerin nerede dengeleneceğini fiyatlıyor.
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Right: Currency Dynamics */}
                    <div style={{ background: '#070a12', border: '1px solid var(--border)', borderRadius: 6, padding: 14 }}>
                      <div style={{ fontSize: 11, fontWeight: 800, color: '#e2e8f0', marginBottom: 12 }}>
                        💵 DÖVİZ VE LİKİDİTE DENGESİ
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 6, padding: '10px 12px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ fontWeight: 800, color: '#fff', fontSize: 11.5 }}>DXY Dolar Endeksi</span>
                            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, color: 'var(--cyan)' }}>{fmt(dxy.price, 3)}</span>
                          </div>
                          <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>100 kritik eşiğinin üzerinde sağlam kalmaya devam ederek majör paritelere baskı uyguluyor.</div>
                        </div>

                        <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 6, padding: '10px 12px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ fontWeight: 800, color: '#fff', fontSize: 11.5 }}>USD / TRY Kontrollü Seyir</span>
                            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, color: '#34d399' }}>{fmt(currentUsdTry, 2)} ₺</span>
                          </div>
                          <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>TCMB rezervleri ve yüzde 37'lik yüksek TL mevduat getirisi sayesinde kur son derece sakin seyrediyor.</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* SLIDE 7: Crypto & Spot ETF */}
                {activeSlide.id === 7 && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    {/* Left: ETF Flows */}
                    <div style={{ background: '#070a12', border: '1px solid rgba(139, 92, 246, 0.3)', borderRadius: 6, padding: 14 }}>
                      <div style={{ fontSize: 11, fontWeight: 800, color: '#a78bfa', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                        <Coins size={14} />
                        <span>KURUMSAL SPOT ETF GİRİŞLERİ</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <div style={{ background: 'rgba(139, 92, 246, 0.08)', border: '1px solid rgba(139, 92, 246, 0.25)', borderRadius: 6, padding: '12px 14px' }}>
                          <div style={{ fontSize: 11, color: '#cbd5e1' }}>Son Seans Net Kurumsal Giriş</div>
                          <div style={{ fontSize: 24, fontWeight: 900, color: '#a78bfa', fontFamily: 'var(--font-mono)', marginTop: 2 }}>+$210.000.000</div>
                          <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>BlackRock (IBIT) ve Fidelity spot fonlarına kurumsal talep kesintisiz sürüyor.</div>
                        </div>

                        <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 6, padding: '10px 12px' }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: '#fff' }}>TOTAL3 Altcoin Hacmi: ${fmt(total3.price, 1)}B</div>
                          <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>Sermaye henüz genele yayılmadı; Layer-1 ve yapay zeka projelerinde toplanıyor.</div>
                        </div>
                      </div>
                    </div>

                    {/* Right: Bitcoin Levels Radar */}
                    <div style={{ background: '#070a12', border: '1px solid var(--border)', borderRadius: 6, padding: 14 }}>
                      <div style={{ fontSize: 11, fontWeight: 800, color: '#e2e8f0', marginBottom: 12 }}>
                        🎯 BİTCOİN SEVİYE RADARI & YOL HARİTASI
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <div style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.25)', borderRadius: 6, padding: '8px 12px' }}>
                          <div style={{ fontWeight: 800, color: '#34d399', fontSize: 11.5 }}>85.000$ Taban Desteği</div>
                          <div style={{ fontSize: 10, color: '#cbd5e1' }}>Kurumsal maliyetlenme ve ETF alımlarının koruduğu ana destek tabanı.</div>
                        </div>

                        <div style={{ background: 'rgba(56, 189, 248, 0.08)', border: '1px solid rgba(56, 189, 248, 0.25)', borderRadius: 6, padding: '8px 12px' }}>
                          <div style={{ fontWeight: 800, color: '#38bdf8', fontSize: 11.5 }}>87.000$ Ara Kırılım Direnci</div>
                          <div style={{ fontSize: 10, color: '#cbd5e1' }}>Hacimli geçilmesi halinde kısa vadeli satış baskısı tamamen kalkar.</div>
                        </div>

                        <div style={{ background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.25)', borderRadius: 6, padding: '8px 12px' }}>
                          <div style={{ fontWeight: 800, color: '#fbbf24', fontSize: 11.5 }}>90.000$ Tarihi Psikolojik Hedef</div>
                          <div style={{ fontSize: 10, color: '#cbd5e1' }}>87.500$ üzerinde kalıcılık sağlandığında doğrudan aralanacak büyük hedef kapısı.</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* SLIDE 8: BIST 100 & Sectors */}
                {activeSlide.id === 8 && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    {/* Left: Sectors */}
                    <div style={{ background: '#070a12', border: '1px solid var(--border)', borderRadius: 6, padding: 14 }}>
                      <div style={{ fontSize: 11, fontWeight: 800, color: '#e2e8f0', marginBottom: 12 }}>
                        🏢 BIST SEKTÖREL GÜÇ & AYRIŞMA
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <div style={{ background: 'rgba(56, 189, 248, 0.08)', borderRadius: 6, padding: '8px 12px', borderLeft: '3px solid #38bdf8' }}>
                          <div style={{ fontWeight: 800, color: '#fff', fontSize: 11.5 }}>BIST Banka (XBANK)</div>
                          <div style={{ fontSize: 10, color: '#94a3b8' }}>Güçlü sermaye yeterlilik rasyoları ve enflasyon muhasebesi muafiyetiyle tabanı sırtlıyor.</div>
                        </div>

                        <div style={{ background: 'rgba(16, 185, 129, 0.08)', borderRadius: 6, padding: '8px 12px', borderLeft: '3px solid #10b981' }}>
                          <div style={{ fontWeight: 800, color: '#fff', fontSize: 11.5 }}>BIST Sanayi (XUSIN)</div>
                          <div style={{ fontSize: 10, color: '#94a3b8' }}>Döviz pozisyonu artıda olan ihracatçı şirketlerde seçici toparlanma emareleri.</div>
                        </div>

                        <div style={{ background: 'rgba(245, 158, 11, 0.08)', borderRadius: 6, padding: '8px 12px', borderLeft: '3px solid #f59e0b' }}>
                          <div style={{ fontWeight: 800, color: '#fff', fontSize: 11.5 }}>BIST Holding (XHOLD)</div>
                          <div style={{ fontSize: 10, color: '#94a3b8' }}>Net aktif değer iskonto kapanışı kurumsal yatırımcıların ilgisini çekiyor.</div>
                        </div>
                      </div>
                    </div>

                    {/* Right: Technical Levels Compass */}
                    <div style={{ background: '#070a12', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: 6, padding: 14 }}>
                      <div style={{ fontSize: 11, fontWeight: 800, color: '#34d399', marginBottom: 12 }}>
                        🧭 BIST 100 TEKNİK SEVİYE PUSULASI
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <div style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.25)', borderRadius: 6, padding: '10px 12px' }}>
                          <div style={{ fontWeight: 800, color: '#34d399', fontSize: 12 }}>12.200 - 12.000 Destek Tabanı</div>
                          <div style={{ fontSize: 10.5, color: '#cbd5e1', marginTop: 2 }}>Kurumsal talebin ve yabancı girişlerinin yoğunlaştığı kritik ana destek bölgesi.</div>
                        </div>

                        <div style={{ background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.25)', borderRadius: 6, padding: '10px 12px' }}>
                          <div style={{ fontWeight: 800, color: '#fbbf24', fontSize: 12 }}>12.800 Ara Tepki Direnci</div>
                          <div style={{ fontSize: 10.5, color: '#cbd5e1', marginTop: 2 }}>İlk rahatlama ve momentum kazanma eşiği.</div>
                        </div>

                        <div style={{ background: 'rgba(56, 189, 248, 0.08)', border: '1px solid rgba(56, 189, 248, 0.25)', borderRadius: 6, padding: '10px 12px' }}>
                          <div style={{ fontWeight: 800, color: '#38bdf8', fontSize: 12 }}>13.500 Hedef Koridoru</div>
                          <div style={{ fontSize: 10.5, color: '#cbd5e1', marginTop: 2 }}>Son çeyrek bilançoları ve kredi derecelendirme beklentileriyle hedeflenen ana bölge.</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* SLIDE 9: Strategy, Cash & 48h Calendar */}
                {activeSlide.id === 9 && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    {/* Left: 48h Calendar Timeline */}
                    <div style={{ background: '#070a12', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: 6, padding: 14 }}>
                      <div style={{ fontSize: 11, fontWeight: 800, color: '#fbbf24', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                        <Calendar size={14} />
                        <span>48 SAATLİK KRİTİK EKONOMİK TAKVİM</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {[
                          { time: 'Pazartesi 10:00', event: 'TÜİK Yıllık ve Aylık TÜFE Enflasyonu', note: 'Önceki %31.51 / Beklenti Kritik' },
                          { time: 'Çarşamba 21:00', event: 'Fed FOMC Tutanakları & Yetkili Mesajları', note: 'Warsh Şahin Faiz Yönlendirmesi' },
                          { time: 'Cuma 15:30', event: 'ABD Tarım Dışı İstihdam (NFP) & İşsizlik', note: 'Küresel Risk İştahı Barometresi' },
                          { time: '22 Ekim PPK', event: 'TCMB Para Politikası Kurulu Faiz Kararı', note: '%37 Politika Faizi Kararı' }
                        ].map((cal, idx) => (
                          <div key={idx} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 6, padding: '8px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <div style={{ fontSize: 10, color: 'var(--cyan)', fontWeight: 800 }}>{cal.time}</div>
                              <div style={{ fontSize: 11, fontWeight: 700, color: '#fff' }}>{cal.event}</div>
                            </div>
                            <span style={{ fontSize: 8.5, color: '#cbd5e1', background: 'rgba(255,255,255,0.06)', padding: '2px 6px', borderRadius: 4 }}>
                              {cal.note}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Right: Portfolio Principles */}
                    <div style={{ background: '#070a12', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: 6, padding: 14 }}>
                      <div style={{ fontSize: 11, fontWeight: 800, color: '#34d399', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                        <Compass size={14} />
                        <span>HAKAN GENÇ FİNANS - SAĞLIKLI PORTFÖY PUSULASI</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <div style={{ background: 'rgba(16, 185, 129, 0.08)', borderRadius: 6, padding: '10px 12px' }}>
                          <div style={{ fontWeight: 800, color: '#fff', fontSize: 11.5 }}>1. Asla FOMO ile İşlem Yapmayın</div>
                          <div style={{ fontSize: 10.5, color: '#cbd5e1', marginTop: 2 }}>Hızlı yükselen varlıkların peşinden koşmak yerine kurumsal destek seviyelerini bekleyin.</div>
                        </div>

                        <div style={{ background: 'rgba(56, 189, 248, 0.08)', borderRadius: 6, padding: '10px 12px' }}>
                          <div style={{ fontWeight: 800, color: '#fff', fontSize: 11.5 }}>2. %20 - %25 Nakit Kalkanınızı Koruyun</div>
                          <div style={{ fontSize: 10.5, color: '#cbd5e1', marginTop: 2 }}>Portföyde likit nakit bulundurmak piyasa geri çekilmelerini büyük fırsata çevirir.</div>
                        </div>

                        <div style={{ background: 'rgba(245, 158, 11, 0.08)', borderRadius: 6, padding: '10px 12px' }}>
                          <div style={{ fontWeight: 800, color: '#fff', fontSize: 11.5 }}>3. Endeks Tahmini Değil Şirket Seçimi</div>
                          <div style={{ fontSize: 10.5, color: '#cbd5e1', marginTop: 2 }}>Kâr marjlarını ve nakit akışını enflasyonun üzerinde büyüten şirketler her dönem kazandırır.</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Conditional Footer: Broadcast Watermark for OBS, Presenter Controls for Studio */}
              {isPopout ? (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 14, borderTop: '1px solid rgba(255, 255, 255, 0.06)', fontSize: 11, color: '#64748b' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#10b981' }} className="animate-pulse" />
                    <span>CANLI PİYASA AKIŞI • RESMİ KORİDORLAR VE GÖSTERGELER</span>
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#94a3b8' }}>
                    HAKAN GENÇ FİNANS • OBS CANLI SLAYT (1080p)
                  </div>
                </div>
              ) : (
                <div 
                style={{ 
                  marginTop: 18, 
                  paddingTop: 12, 
                  borderTop: '1px solid rgba(255, 255, 255, 0.08)', 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center' 
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <button
                    type="button"
                    onClick={() => changeSlide(Math.max(0, currentSlideIndex - 1))}
                    disabled={currentSlideIndex === 0}
                    className="chip-btn"
                    style={{ fontSize: 10, padding: '5px 10px', opacity: currentSlideIndex === 0 ? 0.4 : 1 }}
                  >
                    <ChevronLeft size={13} style={{ marginRight: 2 }} />
                    <span>Önceki Slayt</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => changeSlide(Math.min(slides.length - 1, currentSlideIndex + 1))}
                    disabled={currentSlideIndex === slides.length - 1}
                    className="chip-btn"
                    style={{ fontSize: 10, padding: '5px 10px', opacity: currentSlideIndex === slides.length - 1 ? 0.4 : 1 }}
                  >
                    <span>Sonraki Slayt</span>
                    <ChevronRight size={13} style={{ marginLeft: 2 }} />
                  </button>
                </div>

                <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                  Klavye: <kbd style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 5px', borderRadius: 3 }}>←</kbd> <kbd style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 5px', borderRadius: 3 }}>→</kbd> veya <kbd style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 5px', borderRadius: 3 }}>Boşluk</kbd> ile geçiş yapabilirsiniz.
                </div>
              </div>

              )}

            </div>
    </>
  );

  // Standalone OBS Pop-out Window (Clean 1080p 16:9 Slide Display with ZERO UI clutter)
  if (isObsPopout) {
    return (
      <div 
        style={{ 
          width: '100vw', 
          height: '100vh', 
          background: '#040711', 
          display: 'flex', 
          flexDirection: 'column', 
          overflow: 'hidden', 
          padding: 0, 
          margin: 0 
        }}
      >
        <div 
          style={{ 
            flex: 1, 
            display: 'flex', 
            flexDirection: 'column', 
            background: 'linear-gradient(145deg, #070c18, #0b1329)', 
            border: 'none', 
            borderRadius: 0, 
            overflow: 'hidden', 
            position: 'relative' 
          }}
        >
          {renderSlideContent(true)}
        </div>
      </div>
    );
  }

  return (
    <div className="tab-pane-content" style={{ animation: 'fadeIn 0.25s ease', display: 'flex', flexDirection: 'column', gap: 12 }}>
      
      {/* 🌟 Top Studio Header Bar */}
      <div 
        className="card" 
        style={{ 
          padding: '12px 18px', 
          background: 'linear-gradient(135deg, rgba(8, 12, 22, 0.98), rgba(15, 23, 42, 0.95))', 
          border: '1px solid rgba(244, 63, 94, 0.35)', 
          borderRadius: 8,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(244, 63, 94, 0.15)', border: '1px solid rgba(244, 63, 94, 0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fb7185' }}>
            <Radio size={20} className="animate-pulse" />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 13.5, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>YAYIN & BRİFİNG STÜDYOSU</span>
              <span className="nav-badge rose" style={{ fontSize: 9.5, padding: '2px 7px', background: 'rgba(244, 63, 94, 0.2)', color: '#fda4af', border: '1px solid rgba(244, 63, 94, 0.4)' }}>
                YOUTUBE PROMPTER • 16:9 GRAFİK SLAYT
              </span>
            </div>
            <div style={{ fontSize: 10.5, color: 'var(--text-muted)', marginTop: 1 }}>
              Makrodan Mikroya 9 Slaytlık TV Brifingi • Doğrulanmış Canlı Veriler • Doğal Neden-Sonuç Metni
            </div>
          </div>
        </div>

        {/* Studio Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          
          {/* View Mode Switcher */}
          <div style={{ display: 'inline-flex', background: 'rgba(0,0,0,0.6)', borderRadius: 6, padding: 2, border: '1px solid rgba(255,255,255,0.1)' }}>
            <button
              type="button"
              onClick={() => setViewMode('split')}
              className={`chip-btn ${viewMode === 'split' ? 'active' : ''}`}
              style={{ fontSize: 10, padding: '4px 9px', fontWeight: viewMode === 'split' ? 700 : 500 }}
              title="Sol panelde görsel slayt, sağ panelde prompter metni"
            >
              <Layers size={11} style={{ marginRight: 4 }} />
              <span>Bölünmüş Mod</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('slides_only')}
              className={`chip-btn ${viewMode === 'slides_only' ? 'active' : ''}`}
              style={{ fontSize: 10, padding: '4px 9px', fontWeight: viewMode === 'slides_only' ? 700 : 500 }}
              title="Yalnızca 16:9 görsel slaytları göster (Ekran kaydı için)"
            >
              <Video size={11} style={{ marginRight: 4 }} />
              <span>Sadece Slayt</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('prompter_only')}
              className={`chip-btn ${viewMode === 'prompter_only' ? 'active' : ''}`}
              style={{ fontSize: 10, padding: '4px 9px', fontWeight: viewMode === 'prompter_only' ? 700 : 500 }}
              title="Yalnızca büyük konuşma metnini göster"
            >
              <Mic size={11} style={{ marginRight: 4 }} />
              <span>Prompter Ekranı</span>
            </button>
          </div>

          {/* Refresh Button */}
          <button
            type="button"
            onClick={handleRefreshAll}
            disabled={isRefreshing}
            className="chip-btn"
            style={{ 
              fontSize: 10, 
              padding: '5px 11px', 
              display: 'flex', 
              alignItems: 'center', 
              gap: 5, 
              borderColor: isRefreshing ? 'var(--cyan)' : 'rgba(255,255,255,0.2)', 
              color: isRefreshing ? 'var(--cyan)' : '#f8fafc', 
              fontWeight: 700 
            }}
            title="Tüm piyasa verilerini ve göstergelerini canlı olarak yeniler"
          >
            <RefreshCw size={12} className={isRefreshing ? 'animate-spin' : ''} />
            <span>{isRefreshing ? 'Yenileniyor...' : 'Verileri Yenile'}</span>
          </button>

          {/* Live Timestamp Badge */}
          <span style={{ fontSize: 9.5, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 4, padding: '0 4px' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981' }} className="animate-pulse" />
            <span>{lastRefreshedAt.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })} TSİ</span>
          </span>

          {/* OBS Clean Window Pop-out Button */}
          <button
            type="button"
            onClick={() => {
              const popoutUrl = `${window.location.origin}${window.location.pathname}?obs_popout=1`;
              const win = window.open(popoutUrl, 'HakanGencFinans_OBS_Window', 'width=1920,height=1080,menubar=no,toolbar=no,location=no,status=no');
              if (win) {
                window.obsPopoutWindow = win;
              }
            }}
            className="chip-btn"
            style={{ 
              fontSize: 10, 
              padding: '5px 11px', 
              display: 'flex', 
              alignItems: 'center', 
              gap: 5, 
              borderColor: '#c084fc', 
              color: '#c084fc', 
              fontWeight: 700,
              background: 'rgba(192, 132, 252, 0.1)'
            }}
            title="OBS için tam netlikte (1080p) temiz yayın penceresi açar. Ana ekranınızda prompter metnini okurken slaytlar OBS ile eşzamanlı değişir."
          >
            <Video size={12} />
            <span>🎥 OBS Temiz Pencere</span>
          </button>

          {/* Copy Full Word Document Button */}
          <button
            type="button"
            onClick={handleCopyAll}
            className="btn-primary"
            style={{ 
              fontSize: 10.5, 
              padding: '5px 12px', 
              display: 'flex', 
              alignItems: 'center', 
              gap: 5,
              background: copiedAll ? '#10b981' : 'linear-gradient(135deg, #e11d48, #be123c)',
              borderColor: copiedAll ? '#10b981' : '#f43f5e',
              fontWeight: 700,
              boxShadow: '0 2px 8px rgba(225, 29, 72, 0.3)'
            }}
            title="Tüm slaytların konuşma metnini başlıklarıyla birlikte panoya kopyalar"
          >
            {copiedAll ? <Check size={13} /> : <Copy size={13} />}
            <span>{copiedAll ? 'Word Metni Kopyalandı!' : 'Word Metnini Kopyala'}</span>
          </button>

          {/* Direct Word .doc Download Button */}
          <button
            type="button"
            onClick={handleDownloadWordDoc}
            className="chip-btn"
            style={{ fontSize: 10, padding: '5px 10px', display: 'flex', alignItems: 'center', gap: 4, borderColor: '#38bdf8', color: '#38bdf8', fontWeight: 700 }}
            title="Tüm yayını Microsoft Word (.doc) belgesi olarak bilgisayarınıza indirir"
          >
            <Download size={12} />
            <span>Word İndir (.doc)</span>
          </button>

          {/* Fullscreen Button */}
          <button
            type="button"
            onClick={togglePresentationFullscreen}
            className="chip-btn"
            style={{ fontSize: 10, padding: '5px 10px', display: 'flex', alignItems: 'center', gap: 4, borderColor: 'var(--cyan)', color: 'var(--cyan)', fontWeight: 700 }}
            title="Slaytları 16:9 tam ekran sunum moduna al"
          >
            {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
            <span>{isFullscreen ? 'Küçült' : '⛶ Tam Ekran'}</span>
          </button>
        </div>
      </div>

      {/* 🧭 Slide Selector Navigation Pills */}
      <div 
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 6, 
          overflowX: 'auto', 
          padding: '6px 2px',
          scrollbarWidth: 'none'
        }}
      >
        {slides.map((s, idx) => {
          const isActive = currentSlideIndex === idx;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => changeSlide(idx)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 12px',
                borderRadius: 6,
                background: isActive ? 'rgba(244, 63, 94, 0.2)' : 'rgba(15, 23, 42, 0.6)',
                border: `1px solid ${isActive ? '#f43f5e' : 'rgba(255, 255, 255, 0.08)'}`,
                color: isActive ? '#fecdd3' : '#94a3b8',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease'
              }}
            >
              <span 
                style={{ 
                  width: 18, 
                  height: 18, 
                  borderRadius: '50%', 
                  background: isActive ? '#f43f5e' : 'rgba(255,255,255,0.1)', 
                  color: isActive ? '#fff' : '#cbd5e1',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 10,
                  fontWeight: 800
                }}
              >
                {s.id}
              </span>
              <span style={{ fontSize: 10.5, fontWeight: isActive ? 800 : 600 }}>
                {s.title.split('&')[0].trim()}
              </span>
              <span style={{ fontSize: 8.5, color: isActive ? '#fda4af' : '#64748b' }}>
                ({s.durationEst})
              </span>
            </button>
          );
        })}
      </div>

      {/* 🎬 Main Workspace Layout (Slide + Prompter) */}
      <div 
        ref={presentationContainerRef}
        style={{ 
          display: 'grid', 
          gridTemplateColumns: viewMode === 'split' ? 'minmax(0, 1.45fr) minmax(320px, 1fr)' : '1fr', 
          gap: 14,
          alignItems: 'stretch',
          background: isFullscreen ? '#040711' : 'transparent',
          padding: isFullscreen ? 16 : 0,
          borderRadius: 8,
          boxSizing: 'border-box',
          height: isFullscreen ? '100vh' : (viewMode === 'split' ? 'calc(100vh - 185px)' : 'auto'),
          minHeight: isFullscreen ? '100vh' : 640,
          maxHeight: isFullscreen ? '100vh' : (viewMode === 'split' ? 'calc(100vh - 185px)' : 'none'),
          overflow: isFullscreen ? 'hidden' : 'visible'
        }}
      >
        
        {/* ========================================================================= */}
        {/* 📺 LEFT: 16:9 PRESENTATION SLIDE DISPLAY                                  */}
        {/* ========================================================================= */}
        {viewMode !== 'prompter_only' && (
          <div 
            style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              background: 'linear-gradient(145deg, #070c18, #0b1329)', 
              border: '1px solid rgba(255, 255, 255, 0.1)', 
              borderRadius: 10, 
              overflow: 'hidden',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.45)',
              position: viewMode === 'split' ? 'sticky' : 'relative',
              top: isFullscreen ? 16 : 8,
              height: viewMode === 'split' ? '100%' : 'auto',
              maxHeight: viewMode === 'split' ? '100%' : 'none',
              minHeight: isFullscreen ? 'calc(100vh - 32px)' : (viewMode === 'split' ? 0 : 640)
            }}
          >
            {renderSlideContent(false)}
          </div>
        )}

        {/* ========================================================================= */}
        {/* 🎙️ RIGHT: TELEPROMPTER SPEECH SCRIPT (NATURAL SPOKEN TURKISH)            */}
        {/* ========================================================================= */}
        {viewMode !== 'slides_only' && (
          <div 
            style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              background: '#040711', 
              border: '1px solid rgba(255, 255, 255, 0.1)', 
              borderRadius: 10, 
              overflow: 'hidden',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.45)',
              height: viewMode === 'split' ? '100%' : (viewMode === 'prompter_only' ? 'calc(100vh - 185px)' : 'auto'),
              maxHeight: viewMode === 'split' ? '100%' : (viewMode === 'prompter_only' ? 'calc(100vh - 185px)' : 'none'),
              minHeight: viewMode === 'split' ? 0 : 640
            }}
          >
            {/* Prompter Top Toolbar */}
            <div 
              style={{ 
                padding: '10px 16px', 
                background: 'rgba(15, 23, 42, 0.85)', 
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                flexShrink: 0
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Mic size={15} style={{ color: '#fb7185' }} />
                <span style={{ fontSize: 11, fontWeight: 800, color: '#f8fafc' }}>
                  PROMPTER METNİ (SLAYT {activeSlide.id})
                </span>
                <span className="nav-badge rose" style={{ fontSize: 8.5, padding: '1px 5px' }}>
                  DOĞAL AKIŞ
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {/* Font Size Adjuster Controls */}
                <div 
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 2, 
                    background: 'rgba(255, 255, 255, 0.05)', 
                    borderRadius: 5, 
                    padding: '2px 4px', 
                    border: '1px solid rgba(255, 255, 255, 0.08)' 
                  }}
                  title="Prompter yazı boyutunu ayarla"
                >
                  <button
                    type="button"
                    onClick={() => handleSetFontSize(Math.max(12, scriptFontSize - 1.5))}
                    style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '1px 5px', fontSize: 10, fontWeight: 800, lineHeight: 1 }}
                    title="Yazıyı küçült"
                  >
                    A-
                  </button>
                  <span style={{ fontSize: 9.5, color: 'var(--cyan)', fontWeight: 700, minWidth: 26, textAlign: 'center', fontFamily: 'var(--font-mono)' }}>
                    {Math.round(scriptFontSize)}px
                  </span>
                  <button
                    type="button"
                    onClick={() => handleSetFontSize(Math.min(24, scriptFontSize + 1.5))}
                    style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '1px 5px', fontSize: 10, fontWeight: 800, lineHeight: 1 }}
                    title="Yazıyı büyüt"
                  >
                    A+
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setIsEditingScript(!isEditingScript)}
                  className="chip-btn"
                  style={{ fontSize: 9.5, padding: '3px 8px', color: isEditingScript ? 'var(--cyan)' : 'var(--text-muted)' }}
                  title="Metni kendi konuşma tarzınıza göre düzenleyin"
                >
                  <Edit3 size={11} style={{ marginRight: 3 }} />
                  <span>{isEditingScript ? 'Kaydet' : 'Düzenle'}</span>
                </button>

                {customScripts[activeSlide.id] !== undefined && (
                  <button
                    type="button"
                    onClick={handleResetCurrentScript}
                    className="chip-btn"
                    style={{ fontSize: 9.5, padding: '3px 8px', color: 'var(--amber)' }}
                    title="Varsayılan metne geri dön"
                  >
                    <RotateCcw size={10} style={{ marginRight: 3 }} />
                    <span>Sıfırla</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleCopyCurrent}
                  className="chip-btn"
                  style={{ fontSize: 9.5, padding: '3px 8px', borderColor: copiedCurrent ? '#10b981' : 'var(--border)' }}
                  title="Bu slaytın metnini panoya kopyala"
                >
                  {copiedCurrent ? <Check size={11} style={{ color: '#10b981', marginRight: 3 }} /> : <Copy size={11} style={{ marginRight: 3 }} />}
                  <span>{copiedCurrent ? 'Kopyalandı' : 'Kopyala'}</span>
                </button>
              </div>
            </div>

            {/* Script Display / Editor Box (Independent Scrollable Container) */}
            <div 
              ref={prompterScrollRef}
              className="prompter-scroll-container"
              style={{ 
                flex: 1, 
                minHeight: 0,
                padding: '16px 20px', 
                display: 'flex', 
                flexDirection: 'column', 
                overflowY: 'auto',
                overscrollBehavior: 'contain'
              }}
            >
              <div style={{ flexShrink: 0, fontSize: 10, color: 'var(--text-muted)', marginBottom: 8, fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: 5 }}>
                <span>💡 Hakan Genç'in doğal ekran diline göre hazırlanmıştır. Neden-sonuç bağlantıları konuşmanın organik akışındadır.</span>
              </div>

              {isEditingScript ? (
                <textarea
                  value={activeScript}
                  onChange={(e) => handleScriptChange(e.target.value)}
                  style={{
                    flex: 1,
                    minHeight: 280,
                    background: '#090d16',
                    color: '#f8fafc',
                    border: '1px solid var(--cyan)',
                    borderRadius: 6,
                    padding: 14,
                    fontSize: `${scriptFontSize}px`,
                    lineHeight: 1.6,
                    fontFamily: 'inherit',
                    resize: 'none'
                  }}
                  placeholder="Kendi konuşma metninizi buraya yazabilirsiniz..."
                />
              ) : (
                <div 
                  style={{ 
                    flex: 1, 
                    fontSize: `${scriptFontSize}px`, 
                    color: '#f1f5f9', 
                    lineHeight: 1.75, 
                    background: 'rgba(255, 255, 255, 0.02)', 
                    padding: '18px 20px', 
                    borderRadius: 8, 
                    border: '1px solid rgba(255, 255, 255, 0.05)', 
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    letterSpacing: '0.01em'
                  }}
                >
                  {activeScript}
                </div>
              )}
            </div>

            {/* Bottom Prompter Stats (Fixed Bar) */}
            <div 
              style={{ 
                flexShrink: 0,
                padding: '10px 16px', 
                background: 'rgba(15, 23, 42, 0.85)', 
                borderTop: '1px solid rgba(255, 255, 255, 0.08)', 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                fontSize: 10, 
                color: 'var(--text-muted)' 
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <FileText size={11} style={{ color: 'var(--cyan)' }} />
                  <span>Kelime: ~{activeScript.split(/\s+/).filter(Boolean).length}</span>
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Clock size={11} style={{ color: '#fb7185' }} />
                  <span>Tahmini Süre: ~{Math.round(activeScript.split(/\s+/).filter(Boolean).length / 2.3)} sn</span>
                </span>
              </div>
              <span style={{ fontSize: 9, color: '#34d399', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600 }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#10b981' }}></span>
                Bağımsız Prompter Kaydırma Aktif
              </span>
            </div>

          </div>
        )}

      </div>

    </div>
  );
}
