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
  RefreshCw,
  X,
  Newspaper,
  Pin,
  PinOff,
  Plus,
  Search,
  Trash2,
  Eye,
  EyeOff
} from 'lucide-react';
import macroPulseData from '../data/macroPulse.json';
import latestQuotesData from '../data/latestQuotes.json';
import { 
  BROADCAST_THEMES, 
  resolveEditionState, 
  generateDailyScript 
} from '../data/broadcastEditionService';

export default function BroadcastStudioTab({ isObsPopout = false }) {
  const { marketQuotes, usdtry, fetchMarketData } = useApp();

  // Cross-window synchronization for OBS Pop-out (4-Way Redundant Engine)
  const syncChannelRef = useRef(null);

  // 3-Way Broadcast Tone State ('analytical', 'youtube', 'defensive')
  const [broadcastTone, setBroadcastTone] = useState(() => {
    try {
      return localStorage.getItem('broadcast_studio_tone') || 'analytical';
    } catch {
      return 'analytical';
    }
  });

  const handleSelectTone = (tone) => {
    setBroadcastTone(tone);
    try {
      localStorage.setItem('broadcast_studio_tone', tone);
      if (syncChannelRef.current) {
        syncChannelRef.current.postMessage({ type: 'CHANGE_TONE', tone });
      }
    } catch {}
  };

  // Active slide index (0 to 9 -> 10 slides)
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

  // Active sub-tab inside Slide 1 ('breaking_news', 'fed', 'seasonality', 'macro', 'matrix')
  const [slide1SubTab, setSlide1SubTab] = useState(() => {
    try { return localStorage.getItem('broadcast_studio_slide1_subtab') || 'breaking_news'; } catch { return 'breaking_news'; }
  });

  // Dynamic Agenda & Live News Director State
  const [liveNewsList, setLiveNewsList] = useState([]);
  const [isRefreshingNews, setIsRefreshingNews] = useState(false);
  const [isNewsDrawerOpen, setIsNewsDrawerOpen] = useState(false);
  const [newsBucketFilter, setNewsBucketFilter] = useState('ALL');
  const [newsSearchQuery, setNewsSearchQuery] = useState('');
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [customNewsForm, setCustomNewsForm] = useState({
    title: '',
    impactNote: '',
    bucket: 'bist30',
    sentiment: 'bull',
    tickers: ''
  });
  const [isAgendaModalOpen, setIsAgendaModalOpen] = useState(false);

  const [showBreakingTicker, setShowBreakingTicker] = useState(() => {
    try {
      const saved = localStorage.getItem('broadcast_studio_breaking_ticker_v1');
      return saved === null ? true : saved === '1';
    } catch {
      return true;
    }
  });

  const [tickerCursor, setTickerCursor] = useState(0);

  const todayDateISO = new Date().toISOString().slice(0, 10);

  const [pinnedNews, setPinnedNews] = useState(() => {
    try {
      const raw = localStorage.getItem('broadcast_studio_pinned_news_v1');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.date === todayDateISO && Array.isArray(parsed.items)) {
          return parsed.items;
        }
      }
    } catch {}
    return [];
  });

  const [hasManualPinOverride, setHasManualPinOverride] = useState(() => {
    try {
      const raw = localStorage.getItem('broadcast_studio_pinned_news_v1');
      if (raw) {
        const parsed = JSON.parse(raw);
        return Boolean(parsed && parsed.date === todayDateISO && parsed.manual);
      }
    } catch {}
    return false;
  });

  const persistPinnedNews = (items, manualFlag = true) => {
    setPinnedNews(items);
    setHasManualPinOverride(manualFlag);
    try {
      localStorage.setItem('broadcast_studio_pinned_news_v1', JSON.stringify({
        date: todayDateISO,
        manual: manualFlag,
        items,
        time: Date.now()
      }));
    } catch {}
    if (syncChannelRef.current) {
      try {
        syncChannelRef.current.postMessage({ type: 'CHANGE_PINNED_NEWS', items, time: Date.now() });
      } catch {}
    }
  };

  const toggleBreakingTicker = () => {
    const next = !showBreakingTicker;
    setShowBreakingTicker(next);
    try {
      localStorage.setItem('broadcast_studio_breaking_ticker_v1', next ? '1' : '0');
    } catch {}
    if (syncChannelRef.current) {
      try {
        syncChannelRef.current.postMessage({ type: 'CHANGE_BREAKING_TICKER', enabled: next, time: Date.now() });
      } catch {}
    }
  };

  const formatRelativeTimeTr = (dateInput) => {
    if (!dateInput) return 'Güncel';
    const time = typeof dateInput === 'number' ? dateInput : new Date(dateInput).getTime();
    if (isNaN(time) || time <= 0) return 'Güncel';
    const diffMin = Math.max(0, Math.floor((Date.now() - time) / 60000));
    if (diffMin < 2) return 'Az önce';
    if (diffMin < 60) return `${diffMin} dk önce`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours} sa önce`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return 'Dün';
    return `${diffDays} gün önce`;
  };

  const getSentimentMeta = (sentiment = 'neutral') => {
    if (sentiment === 'bull') {
      return { label: '▲ POZİTİF', color: '#34d399', bg: 'rgba(16, 185, 129, 0.16)', border: 'rgba(16, 185, 129, 0.38)' };
    }
    if (sentiment === 'bear') {
      return { label: '▼ BASKI', color: '#f87171', bg: 'rgba(239, 68, 68, 0.16)', border: 'rgba(239, 68, 68, 0.38)' };
    }
    return { label: '⚡ İZLEME', color: '#fbbf24', bg: 'rgba(245, 158, 11, 0.16)', border: 'rgba(245, 158, 11, 0.38)' };
  };

  const autoCuratePinnedNews = (newsArray = []) => {
    if (!Array.isArray(newsArray) || newsArray.length === 0) return [];
    const byImpactDesc = [...newsArray].sort((a, b) => ((b.impactScore || 0) - (a.impactScore || 0)) || ((b.timeMs || 0) - (a.timeMs || 0)));

    const picked = [];
    const seen = new Set();
    const pickOne = (pred) => {
      const match = byImpactDesc.find(item => !seen.has(item.id) && !seen.has(item.title) && pred(item));
      if (match) {
        seen.add(match.id);
        seen.add(match.title);
        picked.push(match);
        return true;
      }
      return false;
    };

    // Guarantee balanced representation: BIST30, TR Policy/Macro, US Politics/Fed, Global Tech/Shocks
    pickOne(n => n.broadcastBucket === 'bist30');
    pickOne(n => n.broadcastBucket === 'tr_macro');
    pickOne(n => n.region === 'TR');

    pickOne(n => n.broadcastBucket === 'global_stocks');
    pickOne(n => n.broadcastBucket === 'us_politics');
    pickOne(n => n.region !== 'TR');

    // Fill remaining slots up to 3 TR + 3 Global if any bucket fell short
    let trCount = picked.filter(n => n.region === 'TR').length;
    while (trCount < 3 && pickOne(n => n.region === 'TR')) trCount++;

    let globalCount = picked.filter(n => n.region !== 'TR').length;
    while (globalCount < 3 && pickOne(n => n.region !== 'TR')) globalCount++;

    return picked;
  };

  const defaultAgenda = {
    topic1: {
      title: 'Küresel Likidite, Fed Faiz Duruşu & Doların Gücü',
      desc: 'DXY dolar endeksi, FOMC faiz beklentisi ve ABD Hazine tahvil getirilerindeki hareketlilik.',
      tag: 'Makro & Faiz'
    },
    topic2: {
      title: 'Jeopolitik Riskler, Enerji Koridorları & Petrol',
      desc: 'Hürmüz & Kızıldeniz lojistiği, Brent/WTI petrol fiyatları ve enflasyon geçişkenliği.',
      tag: 'Enerji & Jeopolitik'
    },
    topic3: {
      title: 'Borsa İstanbul & Wall Street Bilanço Dinamikleri',
      desc: 'BIST 100 kurumsal destek seviyeleri ve yapay zeka sermaye harcamaları.',
      tag: 'Hisse & Bilanço'
    },
    fedRate: {
      dominant: 'Faizi Sabit Tutma (Pas)',
      prob: 76,
      pauseProb: 24,
      meetingDate: 'Aralık FOMC',
      note: 'FOMC toplantısında faizin %3.75 - %4.00 bandında sabit tutulması (%76), enflasyon yapışkanlığına bağlı 25 bp şahin duruş riski (%24) fiyatlanmaktadır.'
    },
    macroRates: {
      tcmb: 36.00,
      cpi: 29.73,
      fed: '3.75 - 4.00'
    }
  };

  const [customAgenda, setCustomAgenda] = useState(() => {
    try {
      // Clear legacy/stale agenda caches
      ['broadcast_studio_agenda', 'broadcast_studio_agenda_v4', 'broadcast_studio_agenda_v5', 'broadcast_studio_agenda_v6', 'broadcast_studio_agenda_v7'].forEach(k => {
        try { localStorage.removeItem(k); } catch (e) {}
      });
      const savedStr = localStorage.getItem('broadcast_studio_agenda_v8');
      if (savedStr) {
        const saved = JSON.parse(savedStr);
        return {
          topic1: saved.topic1 || defaultAgenda.topic1,
          topic2: saved.topic2 || defaultAgenda.topic2,
          topic3: saved.topic3 || defaultAgenda.topic3,
          fedRate: saved.fedRate || defaultAgenda.fedRate,
          macroRates: saved.macroRates || defaultAgenda.macroRates
        };
      }
    } catch (e) {}
    return defaultAgenda;
  });

  const [agendaForm, setAgendaForm] = useState(() => customAgenda);

  useEffect(() => {
    if (isAgendaModalOpen) {
      setAgendaForm(customAgenda);
    }
  }, [isAgendaModalOpen, customAgenda]);

  // Fetch live market news on mount & populate auto-curated pinned news if not manually set today
  const refreshLiveNewsFeed = async (force = false) => {
    setIsRefreshingNews(true);
    try {
      const res = await fetch(`/api/market?type=news${force ? '&force=1' : ''}`);
      if (res.ok) {
        const data = await res.json();
        if (data?.status === 'success' && Array.isArray(data.news) && data.news.length > 0) {
          setLiveNewsList(data.news);
          if (!hasManualPinOverride || pinnedNews.length === 0) {
            const curated = autoCuratePinnedNews(data.news);
            if (curated.length > 0) {
              persistPinnedNews(curated, false);
            }
          }
          return data.news;
        }
      }
    } catch {} finally {
      setIsRefreshingNews(false);
    }
    return liveNewsList;
  };

  useEffect(() => {
    refreshLiveNewsFeed(false);
  }, []);

  // Rotate Breaking News bottom strip cleanly every 7 seconds
  useEffect(() => {
    if (!showBreakingTicker || pinnedNews.length <= 1) return;
    const id = setInterval(() => {
      setTickerCursor(prev => (prev + 1) % pinnedNews.length);
    }, 7000);
    return () => clearInterval(id);
  }, [showBreakingTicker, pinnedNews.length]);

  const togglePinNews = (item) => {
    const exists = pinnedNews.some(p => p.id === item.id || p.title === item.title);
    if (exists) {
      persistPinnedNews(pinnedNews.filter(p => p.id !== item.id && p.title !== item.title), true);
    } else {
      persistPinnedNews([item, ...pinnedNews].slice(0, 8), true);
    }
  };

  const updatePinnedImpactNote = (id, note) => {
    const next = pinnedNews.map(p => (p.id === id ? { ...p, impactNote: note } : p));
    persistPinnedNews(next, true);
  };

  const movePinnedItem = (idx, dir) => {
    const target = idx + dir;
    if (target < 0 || target >= pinnedNews.length) return;
    const copy = [...pinnedNews];
    const [moved] = copy.splice(idx, 1);
    copy.splice(target, 0, moved);
    persistPinnedNews(copy, true);
  };

  const handleApplyAutoBalancedNews = async () => {
    const news = liveNewsList.length > 0 ? liveNewsList : await refreshLiveNewsFeed(true);
    const curated = autoCuratePinnedNews(news);
    if (curated.length > 0) {
      persistPinnedNews(curated, false);
    }
  };

  const handleAddCustomBreakingNews = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    const cleanTitle = (customNewsForm.title || '').trim();
    if (!cleanTitle) return;

    const bucketMap = {
      bist30: { region: 'TR', label: '🇹🇷 BIST 30 & Şirketler', tag: 'BIST & KAP' },
      tr_macro: { region: 'TR', label: '🏛️ TR Siyaset & Ekonomi', tag: 'TCMB, Politika & Makro' },
      us_politics: { region: 'GLOBAL', label: '🇺🇸 ABD Politika & Makro', tag: 'Fed, Wall St & Politika' },
      global_stocks: { region: 'GLOBAL', label: '💻 Global Hisse & AI', tag: 'Teknoloji & AI' }
    };
    const meta = bucketMap[customNewsForm.bucket] || bucketMap.bist30;
    const parsedTickers = (customNewsForm.tickers || '')
      .split(/[\s,;]+/)
      .map(s => s.trim().toUpperCase())
      .filter(Boolean)
      .slice(0, 4);

    const newItem = {
      id: `custom-${Date.now()}`,
      title: cleanTitle,
      impactNote: (customNewsForm.impactNote || '').trim(),
      source: 'Stüdyo Özel Notu',
      pubDate: new Date().toUTCString(),
      timeMs: Date.now(),
      region: meta.region,
      broadcastBucket: customNewsForm.bucket,
      bucketLabel: meta.label,
      tag: meta.tag,
      sentiment: customNewsForm.sentiment || 'neutral',
      bull: customNewsForm.sentiment !== 'bear',
      impactScore: 15,
      impactLevel: 'KRİTİK',
      tickers: parsedTickers,
      isCustom: true
    };

    persistPinnedNews([newItem, ...pinnedNews].slice(0, 8), true);
    setCustomNewsForm({ title: '', impactNote: '', bucket: customNewsForm.bucket, sentiment: customNewsForm.sentiment, tickers: '' });
  };

  const updateAgenda = (newAgenda) => {
    setCustomAgenda(newAgenda);
    try {
      localStorage.setItem('broadcast_studio_agenda_v8', JSON.stringify(newAgenda));
    } catch (e) {}
    if (syncChannelRef.current) {
      try {
        syncChannelRef.current.postMessage({ type: 'CHANGE_AGENDA', agenda: newAgenda, time: Date.now() });
      } catch (e) {}
    }
  };

  const handleAutoFillFromNews = () => {
    const sourceList = pinnedNews.length >= 3 ? pinnedNews : liveNewsList;
    if (!sourceList || sourceList.length === 0) return;
    const cleanStr = (s) => (s || '').replace(/<[^>]+>/g, '').replace(/ - .*$/, '').trim();
    const n1 = sourceList[0];
    const n2 = sourceList[1] || sourceList[0];
    const n3 = sourceList[2] || sourceList[0];
    setAgendaForm(prev => ({
      ...prev,
      topic1: {
        title: cleanStr(n1.title) || prev.topic1.title,
        desc: n1.impactNote || (n1.source ? `Kaynak: ${n1.source}` : prev.topic1.desc),
        tag: n1.bucketLabel || n1.tag || 'Sıcak Gündem'
      },
      topic2: {
        title: cleanStr(n2.title) || prev.topic2.title,
        desc: n2.impactNote || (n2.source ? `Kaynak: ${n2.source}` : prev.topic2.desc),
        tag: n2.bucketLabel || n2.tag || 'Makro & Global'
      },
      topic3: {
        title: cleanStr(n3.title) || prev.topic3.title,
        desc: n3.impactNote || (n3.source ? `Kaynak: ${n3.source}` : prev.topic3.desc),
        tag: n3.bucketLabel || n3.tag || 'Hisse & Sektör'
      }
    }));
  };

  const [newsAppliedToast, setNewsAppliedToast] = useState(false);

  const applyLiveNewsDirectly = async () => {
    const news = await refreshLiveNewsFeed(true);

    if (news && news.length > 0) {
      const curated = autoCuratePinnedNews(news);
      if (!hasManualPinOverride && curated.length > 0) {
        persistPinnedNews(curated, false);
      }

      const activeSet = curated.length >= 3 ? curated : news;
      const cleanStr = (s) => (s || '').replace(/<[^>]+>/g, '').replace(/ - .*$/, '').trim();
      const n1 = activeSet[0];
      const n2 = activeSet[1] || activeSet[0];
      const n3 = activeSet[2] || activeSet[0];

      const newAgenda = {
        ...customAgenda,
        topic1: {
          title: cleanStr(n1.title) || customAgenda.topic1.title,
          desc: n1.impactNote || (n1.source ? `Kaynak: ${n1.source}` : customAgenda.topic1.desc),
          tag: n1.bucketLabel || n1.tag || 'Sıcak Gündem'
        },
        topic2: {
          title: cleanStr(n2.title) || customAgenda.topic2.title,
          desc: n2.impactNote || (n2.source ? `Kaynak: ${n2.source}` : customAgenda.topic2.desc),
          tag: n2.bucketLabel || n2.tag || 'Makro & Global'
        },
        topic3: {
          title: cleanStr(n3.title) || customAgenda.topic3.title,
          desc: n3.impactNote || (n3.source ? `Kaynak: ${n3.source}` : customAgenda.topic3.desc),
          tag: n3.bucketLabel || n3.tag || 'Hisse & Sektör'
        }
      };

      updateAgenda(newAgenda);
      setNewsAppliedToast(true);
      setTimeout(() => setNewsAppliedToast(false), 3000);
    }
  };

  const handleResetAgenda = () => {
    setAgendaForm(defaultAgenda);
  };

  const handleSaveAgenda = () => {
    updateAgenda(agendaForm);
    setIsAgendaModalOpen(false);
  };

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
        if (e.data && e.data.type === 'CHANGE_THEME' && e.data.themeId) {
          setSelectedThemeId(e.data.themeId);
        }
        if (e.data && e.data.type === 'CHANGE_EDITION_SHIFT' && typeof e.data.shift === 'number') {
          setCustomShift(e.data.shift);
        }
        if (e.data && e.data.type === 'CHANGE_AGENDA' && e.data.agenda) {
          setCustomAgenda(e.data.agenda);
        }
        if (e.data && e.data.type === 'CHANGE_PINNED_NEWS' && Array.isArray(e.data.items)) {
          setPinnedNews(e.data.items);
        }
        if (e.data && e.data.type === 'CHANGE_BREAKING_TICKER' && typeof e.data.enabled === 'boolean') {
          setShowBreakingTicker(e.data.enabled);
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
      if (e.data && e.data.type === 'CHANGE_THEME' && e.data.themeId) {
        setSelectedThemeId(e.data.themeId);
      }
      if (e.data && e.data.type === 'CHANGE_EDITION_SHIFT' && typeof e.data.shift === 'number') {
        setCustomShift(e.data.shift);
      }
      if (e.data && e.data.type === 'CHANGE_AGENDA' && e.data.agenda) {
        setCustomAgenda(e.data.agenda);
      }
      if (e.data && e.data.type === 'CHANGE_PINNED_NEWS' && Array.isArray(e.data.items)) {
        setPinnedNews(e.data.items);
      }
      if (e.data && e.data.type === 'CHANGE_BREAKING_TICKER' && typeof e.data.enabled === 'boolean') {
        setShowBreakingTicker(e.data.enabled);
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
      if (e.key === 'broadcast_studio_theme_id' && e.newValue) {
        setSelectedThemeId(e.newValue);
      }
      if (e.key === 'broadcast_studio_edition_shift' && e.newValue) {
        setCustomShift(Number(e.newValue) || 0);
      }
      if (e.key === 'broadcast_studio_agenda_v8' && e.newValue) {
        try {
          setCustomAgenda(JSON.parse(e.newValue));
        } catch (e) {}
      }
      if (e.key === 'broadcast_studio_pinned_news_v1' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (parsed && Array.isArray(parsed.items)) setPinnedNews(parsed.items);
        } catch (e) {}
      }
      if (e.key === 'broadcast_studio_breaking_ticker_v1' && e.newValue !== null) {
        setShowBreakingTicker(e.newValue === '1');
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
          const themeRaw = localStorage.getItem('broadcast_studio_theme_id');
          if (themeRaw) setSelectedThemeId(prev => (prev !== themeRaw ? themeRaw : prev));
          const shiftRaw = localStorage.getItem('broadcast_studio_edition_shift');
          if (shiftRaw !== null) setCustomShift(prev => (prev !== Number(shiftRaw) ? Number(shiftRaw) : prev));
          const toneRaw = localStorage.getItem('broadcast_studio_tone');
          if (toneRaw) setBroadcastTone(prev => (prev !== toneRaw ? toneRaw : prev));
          const tickerRaw = localStorage.getItem('broadcast_studio_breaking_ticker_v1');
          if (tickerRaw !== null) setShowBreakingTicker(prev => (prev !== (tickerRaw === '1') ? (tickerRaw === '1') : prev));
          const pinnedRaw = localStorage.getItem('broadcast_studio_pinned_news_v1');
          if (pinnedRaw) {
            const parsedPin = JSON.parse(pinnedRaw);
            if (parsedPin && Array.isArray(parsedPin.items)) {
              setPinnedNews(prev => (JSON.stringify(prev) !== JSON.stringify(parsedPin.items) ? parsedPin.items : prev));
            }
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
      return saved ? parseFloat(saved) : 15.5;
    } catch {
      return 15.5;
    }
  });

  const handleSetFontSize = (size) => {
    setScriptFontSize(size);
    try {
      localStorage.setItem('broadcast_studio_font_size', String(size));
    } catch {}
  };

  // Slide typography zoom scale (persisted)
  const [slideZoom, setSlideZoom] = useState(() => {
    try {
      const saved = localStorage.getItem('broadcast_studio_slide_zoom_v2');
      return saved ? parseFloat(saved) : 1.08;
    } catch {
      return 1.08;
    }
  });

  const handleSetSlideZoom = (nextZoom) => {
    const clamped = Math.round(Math.max(0.85, Math.min(1.45, nextZoom)) * 100) / 100;
    setSlideZoom(clamped);
    try {
      localStorage.setItem('broadcast_studio_slide_zoom_v2', String(clamped));
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

  // Selected Theme ('auto' or specific theme id)
  const [selectedThemeId, setSelectedThemeId] = useState(() => {
    try {
      return localStorage.getItem('broadcast_studio_theme_id') || 'auto';
    } catch {
      return 'auto';
    }
  });

  // Manual Edition Shift offset
  const [customShift, setCustomShift] = useState(() => {
    try {
      return Number(localStorage.getItem('broadcast_studio_edition_shift') || 0);
    } catch {
      return 0;
    }
  });

  // Minute-by-minute timer to auto-roll into the 16:00 edition when 16:00 TSİ strikes
  const [currentTimeTick, setCurrentTimeTick] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTimeTick(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);

  // Compute daily edition state
  const editionState = useMemo(() => {
    return resolveEditionState(selectedThemeId, customShift);
  }, [selectedThemeId, customShift, currentTimeTick]);

  const activeTheme = editionState.activeTheme;
  const variantIndex = editionState.variantIndex;
  const todayFullStr = editionState.todayFullStr;

  const handleSelectTheme = (themeId) => {
    setSelectedThemeId(themeId);
    try {
      localStorage.setItem('broadcast_studio_theme_id', themeId);
      if (syncChannelRef.current) {
        syncChannelRef.current.postMessage({ type: 'CHANGE_THEME', themeId });
      }
    } catch {}
  };

  const handleAdvanceEdition = () => {
    setCustomShift(prev => {
      const next = prev + 1;
      try {
        localStorage.setItem('broadcast_studio_edition_shift', String(next));
        if (syncChannelRef.current) {
          syncChannelRef.current.postMessage({ type: 'CHANGE_EDITION_SHIFT', shift: next });
        }
      } catch {}
      return next;
    });
  };

  // Sync subtab to theme's preferred view
  useEffect(() => {
    if (activeTheme?.slide1SubTab) {
      setSlide1SubTab(activeTheme.slide1SubTab);
    }
  }, [activeTheme?.id]);

  // Custom user overrides for scripts (persisted in localStorage with auto-sanitization against stale rates and private portfolio leaks)
  const [customScripts, setCustomScripts] = useState(() => {
    try {
      // Clear legacy/stale script caches
      ['broadcast_studio_custom_scripts', 'broadcast_studio_custom_scripts_v2', 'broadcast_studio_custom_scripts_v3', 'broadcast_studio_custom_scripts_v4', 'broadcast_studio_custom_scripts_v5', 'broadcast_studio_custom_scripts_v6', 'broadcast_studio_custom_scripts_v7', 'broadcast_studio_custom_scripts_v8'].forEach(k => {
        try { localStorage.removeItem(k); } catch (e) {}
      });
      const saved = localStorage.getItem('broadcast_studio_custom_scripts_v9');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          return parsed;
        }
      }
      return {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('broadcast_studio_custom_scripts_v9', JSON.stringify(customScripts));
    } catch (e) {}
  }, [customScripts]);

  const [freshRegenerateToast, setFreshRegenerateToast] = useState(false);

  // ⚡ 1-Click Fresh Daily Broadcast Generator (Wipes stale localStorage overrides & generates today's script fresh from live quotes)
  const handleGenerateFreshDailyBroadcast = async () => {
    setIsRefreshing(true);
    try {
      try {
        ['broadcast_studio_custom_scripts', 'broadcast_studio_custom_scripts_v2', 'broadcast_studio_custom_scripts_v3', 'broadcast_studio_custom_scripts_v4', 'broadcast_studio_custom_scripts_v5', 'broadcast_studio_custom_scripts_v6', 'broadcast_studio_custom_scripts_v7', 'broadcast_studio_custom_scripts_v8', 'broadcast_studio_custom_scripts_v9', 'broadcast_studio_agenda', 'broadcast_studio_agenda_v4', 'broadcast_studio_agenda_v5', 'broadcast_studio_agenda_v6', 'broadcast_studio_agenda_v7', 'broadcast_studio_agenda_v8'].forEach(k => {
          try { localStorage.removeItem(k); } catch (e) {}
        });
      } catch (e) {}
      setCustomScripts({});
      setCustomAgenda(defaultAgenda);
      setAgendaForm(defaultAgenda);

      await applyLiveNewsDirectly();
      await handleRefreshAll();

      setFreshRegenerateToast(true);
      setTimeout(() => setFreshRegenerateToast(false), 4000);
    } catch (e) {
      console.warn('Fresh broadcast generation error:', e);
    } finally {
      setIsRefreshing(false);
    }
  };

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
          if (j.status === 'success' && (j.fearGreed || j.truflation || j.inflation)) {
            setPulse(prev => ({
              ...prev,
              fear_greed_score: Math.round(j.fearGreed?.score || prev?.fear_greed_score || 35),
              fear_greed_label: (j.fearGreed?.rating || prev?.fear_greed_label || 'neutral').toUpperCase(),
              vix: {
                value: j.vix?.price || prev?.vix?.value || 16.04,
                change_pct: j.vix?.changePct || prev?.vix?.change_pct || 0
              },
              truflation: j.truflation || prev?.truflation,
              equities: Array.isArray(j.equities) && j.equities.length > 0 ? j.equities : prev?.equities,
              inflation: {
                ...(prev?.inflation || {}),
                ...(j.inflation || {}),
                usa: j.truflation?.rate || j.inflation?.usa || prev?.inflation?.usa || 3.09,
                turkey: j.inflation?.turkey || prev?.inflation?.turkey || 29.73
              },
              rates: {
                ...(prev?.rates || {}),
                ...(j.rates || {}),
                tcmb: j.rates?.tcmb || prev?.rates?.tcmb || 36.00,
                fed: j.rates?.fed || prev?.rates?.fed || '3.75 - 4.00'
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
  const usdTryQuote = getVerifiedQuote('USDTRY=X', ['USDTRY'], currentUsdTry, 0.12);
  // Gram gold in TL: (Ons * USDTRY) / 31.1035
  const gramAltinTL = (gold.price * currentUsdTry) / 31.1035;

  // Dynamic Live Derived Market Corridors & Spreads (100% synchronized between Slides & Prompter)
  const oilSpread = Math.abs((brent.price || 0) - (wti.price || 0));
  const yieldSpreadBp = Math.round(((us10y.price || 0) - (us2y.price || 0)) * 100);
  const yieldSpreadStr = `${yieldSpreadBp >= 0 ? '+' : ''}${yieldSpreadBp} bp`;
  const goldSilverRatio = gold.price / (silver.price || 60.96);
  const goldSupport = Math.round((gold.price * 0.975) / 10) * 10;
  const goldResLow = Math.round((gold.price * 1.025) / 10) * 10;
  const goldResHigh = Math.round((gold.price * 1.04) / 10) * 10;
  const btcSupport = Math.floor((btc.price * 0.96) / 500) * 500;
  const btcBreakout = Math.ceil((btc.price * 1.025) / 500) * 500;
  const btcTarget = Math.ceil((btc.price * 1.07) / 1000) * 1000;
  const ethBtcRatio = (eth.price / (btc.price || 86000)).toFixed(4);
  const bistSupport = Math.floor((bist100.price * 0.97) / 100) * 100;
  const bistResistance = Math.ceil((bist100.price * 1.03) / 100) * 100;
  const bistTarget = Math.ceil((bist100.price * 1.08) / 100) * 100;
  const bistUsd = bist100.price / (currentUsdTry || 49.03);

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

  // Equities & Commodities Return Matrix Data (merged with live pulse.equities from Yahoo Finance)
  const equitiesMatrix = useMemo(() => {
    const liveEqMap = {};
    if (Array.isArray(pulse?.equities)) {
      pulse.equities.forEach(item => {
        if (item?.symbol) liveEqMap[item.symbol] = item;
      });
    }
    const baseRows = [
      { name: 'S&P 500', symbol: 'SPY', price: sp500Etf.price, today: sp500Etf.change },
      { name: 'Nasdaq 100', symbol: 'QQQ', price: nasdaqEtf.price, today: nasdaqEtf.change },
      { name: 'Dow Jones', symbol: 'DIA', price: dowEtf.price, today: dowEtf.change },
      { name: 'BIST 100', symbol: 'XU100.IS', price: bist100.price, today: bist100.change },
      { name: 'Altın (Ons)', symbol: 'GC=F', price: gold.price, today: gold.change },
      { name: 'Brent Petrol', symbol: 'BZ=F', price: brent.price, today: brent.change },
      { name: 'ABD 10Y Tahvil', symbol: '^TNX', price: us10y.price, today: us10y.change },
      { name: 'Dolar / TL', symbol: 'USDTRY=X', price: currentUsdTry, today: usdTryQuote.change }
    ];
    return baseRows.map(r => {
      const liveItem = liveEqMap[r.symbol];
      return {
        ...r,
        price: r.price || liveItem?.price || 0,
        today: typeof r.today === 'number' ? r.today : (liveItem?.today ?? 0),
        d5: liveItem?.days_5 ?? null,
        m1: liveItem?.month_1 ?? null,
        ytd: liveItem?.ytd ?? null,
        y1: liveItem?.year_1 ?? null
      };
    });
  }, [pulse?.equities, sp500Etf, nasdaqEtf, dowEtf, bist100, gold, brent, us10y, currentUsdTry, usdTryQuote]);

  // Live quotes & macro parameters memoized for slides, speech scripts & visual cards
  const quotes = useMemo(() => ({
    fmt,
    brent,
    wti,
    gold,
    silver,
    dxy,
    us10y,
    us2y,
    sp500,
    sp500Etf,
    nasdaq,
    nasdaqEtf,
    dow,
    dowEtf,
    bist100,
    btc,
    eth,
    total3,
    currentUsdTry,
    gramAltinTL,
    fgScore,
    fgLabel,
    tcmbRate: Number(customAgenda?.macroRates?.tcmb ?? pulse?.rates?.tcmb ?? 36.00),
    turkeyCPI: Number(customAgenda?.macroRates?.cpi ?? pulse?.inflation?.turkey ?? 29.73),
    fedRate: customAgenda?.macroRates?.fed || pulse?.rates?.fed || '3.75 - 4.00'
  }), [
    brent, wti, gold, silver, dxy, us10y, us2y, sp500, sp500Etf,
    nasdaq, nasdaqEtf, dow, dowEtf, bist100, btc, eth, total3,
    currentUsdTry, gramAltinTL, fgScore, fgLabel, customAgenda, pulse
  ]);

  const pinnedTR = useMemo(() => (pinnedNews || []).filter(n => n.region === 'TR'), [pinnedNews]);
  const pinnedGlobal = useMemo(() => (pinnedNews || []).filter(n => n.region !== 'TR'), [pinnedNews]);
  const newsSentimentPulse = useMemo(() => {
    const bullC = (pinnedNews || []).filter(n => n.sentiment === 'bull').length;
    const bearC = (pinnedNews || []).filter(n => n.sentiment === 'bear').length;
    if (pinnedNews.length === 0) return { label: 'Akış Bekleniyor', note: 'Canlı RSS taranıyor', isUp: true };
    if (bearC > bullC) return { label: 'Satış & Temkin', note: `${bullC} Pozitif / ${bearC} Baskı`, isUp: false };
    if (bullC > bearC) return { label: 'Alıcılı Katalizör', note: `${bullC} Pozitif / ${bearC} Baskı`, isUp: true };
    return { label: 'Karma & Seçici', note: `${bullC} Pozitif / ${bearC} Baskı`, isUp: true };
  }, [pinnedNews]);

  // 10 Television Slides dynamically populated with Edition Theme, Visual Variants, Live News & Live Quotes
  const slides = useMemo(() => {
    return [
      // SLIDE 1: Global Market Pulse (Matching MarketPulseTab + Fed Rates + S&P 500 Seasonality + Fresh Macro Data)
      {
        id: 1,
        badge: activeTheme.badge,
        badgeColor: activeTheme.badgeColor,
        title: activeTheme.title,
        subtitle: activeTheme.description,
        durationEst: '65 sn',
        metrics: [
          { label: 'FED Faiz Beklentisi (CME)', val: customAgenda?.fedRate?.dominant ? `%${customAgenda.fedRate.prob} ${customAgenda.fedRate.dominant}` : '%76 Pas / Sabit', chg: 0, note: customAgenda?.fedRate?.meetingDate || 'Aralık FOMC' },
          { label: 'S&P 500 Endeksi', val: fmt(sp500.price, 2), chg: sp500.change, isUp: sp500.change >= 0, note: 'Canlı Endeks' },
          { label: 'Türkiye TÜFE (Yıllık)', val: `%${fmt(quotes.turkeyCPI, 2)}`, chg: 0, note: `+${fmt(quotes.tcmbRate - quotes.turkeyCPI, 2)} Puan Reel Faiz` },
          { label: 'VIX Oynaklık Endeksi', val: fmt(vix.price, 2), chg: vix.change, isUp: vix.change >= 0, note: 'Küresel Risk Barometresi' }
        ],
        defaultScript: generateDailyScript(1, activeTheme, quotes, editionState.todayFullStr, editionState.slotTitle, customAgenda, broadcastTone, pinnedNews)
      },

      // SLIDE 2 (NEW): Live Market-Moving News & Catalysts (BIST 30, TR Policy, US Politics & Single-Stock Shocks)
      {
        id: 2,
        badge: 'SON DAKİKA & KATALİZÖR MASASI',
        badgeColor: 'rose',
        title: 'Günün Piyasa Haberleri & Katalizör Masası',
        subtitle: '🇹🇷 BIST 30 & Ekonomi Yönetimi • 🇺🇸 ABD Politikası, Makro & Küresel Şirket Şokları',
        durationEst: '65 sn',
        metrics: [
          { label: 'BIST 100 Endeksi', val: fmt(bist100.price, 2), chg: bist100.change, isUp: bist100.change >= 0, note: 'Yurt İçi Ana Endeks' },
          { label: 'Nasdaq 100 Endeksi', val: fmt(nasdaq.price, 2), chg: nasdaq.change, isUp: nasdaq.change >= 0, note: 'Teknoloji & AI Barometresi' },
          { label: 'Yayındaki Manşetler', val: `${pinnedTR.length} TR • ${pinnedGlobal.length} Global`, chg: 0, isUp: true, note: 'Seçili Haber Masası' },
          { label: 'Haber Akışı Nabzı', val: newsSentimentPulse.label, chg: 0, isUp: newsSentimentPulse.isUp, note: newsSentimentPulse.note }
        ],
        defaultScript: generateDailyScript(2, activeTheme, quotes, editionState.todayFullStr, editionState.slotTitle, customAgenda, broadcastTone, pinnedNews)
      },

      // SLIDE 3: Geopolitics & Energy Corridor
      {
        id: 3,
        badge: variantIndex === 1 ? 'OPEC+ & PETROL KOTALARI' : (variantIndex === 2 ? 'JEOPOLİTİK RİSK KATSAYISI' : 'JEOPOLİTİK RADAR & ENERJİ'),
        badgeColor: 'rose',
        title: variantIndex === 1 ? 'OPEC+ Üretim Kotaları & Rafineri Marjları' : (variantIndex === 2 ? 'Jeopolitik Risk Katsayısı & Güvenli Liman' : 'Jeopolitik Riskler & Enerji Koridoru'),
        subtitle: `Brent $${fmt(brent.price, 2)} • WTI $${fmt(wti.price, 2)} • Hürmüz & Kızıldeniz Lojistik Koridoru`,
        durationEst: '55 sn',
        metrics: [
          { label: 'Brent Ham Petrol', val: `$${fmt(brent.price, 2)}`, chg: brent.change, isUp: brent.change >= 0 },
          { label: 'WTI Ham Petrol', val: `$${fmt(wti.price, 2)}`, chg: wti.change, isUp: wti.change >= 0 },
          { label: 'Brent - WTI Makası', val: `$${fmt(oilSpread, 2)} / vrl`, chg: 0, isUp: true, note: 'Canlı Kontrat Farkı' },
          { label: 'Ons Altın (Güvenli Liman)', val: `$${fmt(gold.price, 0)}`, chg: gold.change, isUp: gold.change >= 0 }
        ],
        defaultScript: generateDailyScript(3, activeTheme, quotes, editionState.todayFullStr, editionState.slotTitle, customAgenda, broadcastTone, pinnedNews)
      },

      // SLIDE 4: Central Banks & Real Yield Shield
      {
        id: 4,
        badge: variantIndex === 1 ? 'MERKEZ BANKALARI QT BİLANÇOSU' : (variantIndex === 2 ? 'ENFLASYON KIRILIMI & FAİZ' : 'MERKEZ BANKALARI & REEL GETİRİ'),
        badgeColor: 'amber',
        title: variantIndex === 1 ? 'Bilanço Küçültmesi (QT) & Likidite Daralması' : (variantIndex === 2 ? 'Enflasyonun Anatomisi: Hizmet vs Mal Katılığı' : 'Merkez Bankaları & TL Reel Getiri Kalkanı'),
        subtitle: `TCMB %${fmt(quotes.tcmbRate, 2)} • TÜFE %${fmt(quotes.turkeyCPI, 2)} • Fed %${quotes.fedRate}`,
        durationEst: '55 sn',
        metrics: [
          { 
            label: 'TCMB Politika Faizi', 
            val: `%${fmt(quotes.tcmbRate, 2)}`, 
            chg: 0, 
            isUp: true, 
            note: `+${fmt(quotes.tcmbRate - quotes.turkeyCPI, 2)} Puan Reel Faiz` 
          },
          { 
            label: 'Fed Fonlama Faizi', 
            val: `%${quotes.fedRate}`, 
            chg: 0, 
            isUp: true, 
            note: customAgenda?.fedRate?.meetingDate || 'Aralık FOMC' 
          },
          { 
            label: 'Türkiye TÜFE (Yıllık)', 
            val: `%${fmt(quotes.turkeyCPI, 2)}`, 
            chg: 0, 
            isUp: false, 
            note: 'Dezenflasyon Patikası' 
          },
          { 
            label: 'Dolar / TL Kuru', 
            val: `${fmt(currentUsdTry, 2)} ₺`, 
            chg: usdTryQuote.change, 
            isUp: usdTryQuote.change >= 0, 
            note: 'Canlı Kur' 
          }
        ],
        defaultScript: generateDailyScript(4, activeTheme, quotes, editionState.todayFullStr, editionState.slotTitle, customAgenda, broadcastTone, pinnedNews)
      },

      // SLIDE 5: Wall Street & AI Ecosystem
      {
        id: 5,
        badge: variantIndex === 1 ? 'MAG-7 AI CAPEX YATIRIMI' : (variantIndex === 2 ? 'S&P 500 DEĞERLEME & F/K' : 'WALL STREET & YAPAY ZEKA'),
        badgeColor: 'emerald',
        title: variantIndex === 1 ? 'Mag-7 AI Sermaye Harcamaları & Çip Altyapısı' : (variantIndex === 2 ? 'S&P 500 Değerleme & F/K Çarpan Koridoru' : 'Wall Street: S&P 500 & Yapay Zeka Döngüsü'),
        subtitle: `S&P 500: ${fmt(sp500.price, 2)} • Nasdaq 100: ${fmt(nasdaq.price, 2)} • Dow Jones: ${fmt(dow.price, 2)}`,
        durationEst: '50 sn',
        metrics: [
          { label: 'S&P 500 Endeksi', val: fmt(sp500.price, 2), chg: sp500.change, isUp: sp500.change >= 0 },
          { label: 'Nasdaq 100 Endeksi', val: fmt(nasdaq.price, 2), chg: nasdaq.change, isUp: nasdaq.change >= 0 },
          { label: 'Dow Jones Endeksi', val: fmt(dow.price, 2), chg: dow.change, isUp: dow.change >= 0 },
          { label: 'VIX Oynaklık', val: fmt(vix.price, 2), chg: vix.change, isUp: vix.change >= 0 }
        ],
        defaultScript: generateDailyScript(5, activeTheme, quotes, editionState.todayFullStr, editionState.slotTitle, customAgenda, broadcastTone, pinnedNews)
      },

      // SLIDE 6: Commodities: Gold & Silver
      {
        id: 6,
        badge: variantIndex === 1 ? 'ALTIN / GÜMÜŞ RASYOSU' : (variantIndex === 2 ? 'TIPS REEL FAİZ AYRIŞMASI' : 'EMTİA & KIYMETLİ MADEN'),
        badgeColor: 'amber',
        title: variantIndex === 1 ? 'Altın / Gümüş Rasyosu & Endüstriyel Gümüş' : (variantIndex === 2 ? 'Altın vs Reel Faiz Ayrışması & BRICS Rezervleri' : 'Emtia Masası: Ons Altın & Gümüş'),
        subtitle: `$${fmt(goldSupport, 0)} Kurumsal Destek • Altın/Gümüş Rasyosu ${fmt(goldSilverRatio, 1)}x • Gram Altın ${fmt(gramAltinTL, 0)} ₺`,
        durationEst: '50 sn',
        metrics: [
          { label: 'Ons Altın (XAU/USD)', val: `$${fmt(gold.price, 2)}`, chg: gold.change, isUp: gold.change >= 0 },
          { label: 'Ons Gümüş (XAG/USD)', val: `$${fmt(silver.price, 2)}`, chg: silver.change, isUp: silver.change >= 0 },
          { label: 'Gram Altın (Kapalıçarşı)', val: `${fmt(gramAltinTL, 0)} ₺`, chg: gold.change, isUp: gold.change >= 0 },
          { label: 'Altın / Gümüş Rasyosu', val: `${fmt(goldSilverRatio, 1)}x`, chg: 0, note: 'Canlı Rasyo' }
        ],
        defaultScript: generateDailyScript(6, activeTheme, quotes, editionState.todayFullStr, editionState.slotTitle, customAgenda, broadcastTone, pinnedNews)
      },

      // SLIDE 7: Dollar & Yield Curve
      {
        id: 7,
        badge: variantIndex === 1 ? 'DXY PARA SEPETİ' : (variantIndex === 2 ? 'KÜRESEL LİKİDİTE GÖSTERGELERİ' : 'DÖVİZ & TAHVİL PİYASASI'),
        badgeColor: 'purple',
        title: variantIndex === 1 ? 'DXY Para Sepeti Bileşenleri & Sermaye Akışı' : (variantIndex === 2 ? 'Küresel Likidite Göstergeleri: RRP & TGA' : 'Dolar Endeksi (DXY) & Verim Eğrisi'),
        subtitle: `DXY ${fmt(dxy.price, 2)} • ABD 10Y %${fmt(us10y.price, 2)} • ABD 2Y %${fmt(us2y.price, 2)} (${yieldSpreadStr})`,
        durationEst: '50 sn',
        metrics: [
          { label: 'Dolar Endeksi (DXY)', val: fmt(dxy.price, 3), chg: dxy.change, isUp: dxy.change >= 0 },
          { label: 'ABD 10Y Tahvil Getirisi', val: `%${fmt(us10y.price, 3)}`, chg: us10y.change, isUp: us10y.change >= 0 },
          { label: 'ABD 2Y Tahvil Getirisi', val: `%${fmt(us2y.price, 3)}`, chg: us2y.change, isUp: us2y.change >= 0 },
          { label: '2Y / 10Y Verim Farkı', val: yieldSpreadStr, chg: 0, isUp: yieldSpreadBp >= 0, note: 'Canlı Tahvil Makası' }
        ],
        defaultScript: generateDailyScript(7, activeTheme, quotes, editionState.todayFullStr, editionState.slotTitle, customAgenda, broadcastTone, pinnedNews)
      },

      // SLIDE 8: Crypto & Spot ETF Flows
      {
        id: 8,
        badge: variantIndex === 1 ? 'BITCOIN DOMINANCE & TOTAL3' : (variantIndex === 2 ? 'ON-CHAIN ARZ & MADENCİ' : 'KRİPTO & LİKİDİTE'),
        badgeColor: 'cyan',
        title: variantIndex === 1 ? 'Bitcoin & TOTAL3 Altcoin Ekosistemi' : (variantIndex === 2 ? 'Borsa Rezervleri & Madenci Maliyetleri' : 'Kripto Ekosistemi: Bitcoin & Spot ETF'),
        subtitle: `$${fmt(btcSupport, 0)} Destek • $${fmt(btcBreakout, 0)} Direnç • ETH/BTC ${ethBtcRatio} • TOTAL3 $${fmt(total3.price, 1)}B`,
        durationEst: '45 sn',
        metrics: [
          { label: 'Bitcoin (BTC)', val: `$${fmt(btc.price, 0)}`, chg: btc.change, isUp: btc.change >= 0 },
          { label: 'Ethereum (ETH)', val: `$${fmt(eth.price, 0)}`, chg: eth.change, isUp: eth.change >= 0 },
          { label: 'TOTAL3 Altcoin Hacmi', val: `$${fmt(total3.price, 1)}B`, chg: total3.change, isUp: total3.change >= 0 },
          { label: 'ETH / BTC Paritesi', val: ethBtcRatio, chg: 0, isUp: true, note: 'Canlı Parite' }
        ],
        defaultScript: generateDailyScript(8, activeTheme, quotes, editionState.todayFullStr, editionState.slotTitle, customAgenda, broadcastTone, pinnedNews)
      },

      // SLIDE 9: Borsa Istanbul & Sectors
      {
        id: 9,
        badge: variantIndex === 1 ? 'YABANCI TAKAS & CDS' : (variantIndex === 2 ? 'BIST ÇARPANLARI & KREDİ NOTU' : 'BORSA İSTANBUL & BIST 100'),
        badgeColor: 'emerald',
        title: variantIndex === 1 ? 'Yabancı Takas Oranı & Cari Denge Kalkanı' : (variantIndex === 2 ? 'BIST 100 Küresel Değerleme & Kredi Not Artışı' : 'Borsa İstanbul: BIST 100 & Makro Taban'),
        subtitle: `${fmt(bistSupport, 0)} Destek • ${fmt(bistResistance, 0)} Direnç • Dolar Bazlı BIST 100: $${fmt(bistUsd, 0)}`,
        durationEst: '50 sn',
        metrics: [
          { label: 'BIST 100 Endeksi', val: fmt(bist100.price, 2), chg: bist100.change, isUp: bist100.change >= 0 },
          { label: 'Dolar Bazlı BIST 100', val: `$${fmt(bistUsd, 1)}`, chg: bist100.change, isUp: bist100.change >= 0, note: 'XU100 / USDTRY' },
          { label: 'Teknik Destek Tabanı', val: fmt(bistSupport, 0), chg: 0, isUp: true, note: 'Kurumsal Taban' },
          { label: 'Teknik Direnç & Hedef', val: `${fmt(bistResistance, 0)} - ${fmt(bistTarget, 0)}`, chg: 0, note: 'Hedef Koridoru' }
        ],
        defaultScript: generateDailyScript(9, activeTheme, quotes, editionState.todayFullStr, editionState.slotTitle, customAgenda, broadcastTone, pinnedNews)
      },

      // SLIDE 10: Strategy, Cash & 48h Calendar
      {
        id: 10,
        badge: variantIndex === 1 ? 'MODEL VARLIK DAĞILIMI' : (variantIndex === 2 ? '3 KADEMELİ RİSK YÖNETİMİ' : 'YATIRIMCI PUSULASI & TAKVİM'),
        badgeColor: 'rose',
        title: variantIndex === 1 ? 'Örnek Varlık Dağılım Çerçevesi & Risk Yönetimi' : (variantIndex === 2 ? '3 Kademeli Risk Yönetimi & Disiplin Çerçevesi' : 'Yatırımcı Pusulası & Makro Takvim'),
        subtitle: variantIndex === 1 ? 'Kurumsal Varlık Sınıfları: Nakit Tamponu, Çekirdek Hisse, Kıymetli Maden ve Fırsat Sepeti' : (variantIndex === 2 ? 'Destek Testi (%30), Teyit (%40), Momentum (%30) Kademeli Alım' : 'Yaklaşan Makro Gündem, Likit Nakit Tamponu ve Risk Disiplini'),
        durationEst: '45 sn',
        metrics: [
          { label: 'TCMB Politika Faizi', val: `%${fmt(quotes.tcmbRate, 2)}`, chg: 0, isUp: true, note: 'Sıkı Para Duruşu' },
          { label: 'Fed Fonlama Bandı', val: `%${quotes.fedRate}`, chg: 0, note: customAgenda?.fedRate?.meetingDate || 'Aralık FOMC' },
          { label: 'Model Likit Oranı', val: '%20 - %25', chg: 0, note: 'Örnek Tampon' },
          { label: 'Piyasa Stratejisi', val: 'Seçici & Korumalı', chg: 0, note: 'Hisse Bazlı Ayrışma' }
        ],
        defaultScript: generateDailyScript(10, activeTheme, quotes, editionState.todayFullStr, editionState.slotTitle, customAgenda, broadcastTone, pinnedNews)
      }
    ];
  }, [
    activeTheme,
    variantIndex,
    editionState,
    customAgenda,
    broadcastTone,
    pinnedNews,
    pinnedTR.length,
    pinnedGlobal.length,
    newsSentimentPulse,
    pulse,
    quotes,
    dxy, vix, brent, wti, gold, silver, us10y, us2y, sp500, sp500Etf, nasdaq, nasdaqEtf, dow, dowEtf, bist100, btc, eth, total3, currentUsdTry, usdTryQuote, gramAltinTL, fgScore, fgLabel,
    oilSpread, yieldSpreadStr, yieldSpreadBp, goldSilverRatio, goldSupport, btcSupport, btcBreakout, ethBtcRatio, bistSupport, bistResistance, bistTarget, bistUsd
  ]);

  const activeSlide = slides[currentSlideIndex] || slides[0] || {};

  // Current active script (user override or default)
  const activeScript = (customScripts && activeSlide && activeSlide.id !== undefined)
    ? (customScripts[`${editionState.editionKey}_${broadcastTone}_${activeSlide.id}`] !== undefined 
      ? customScripts[`${editionState.editionKey}_${broadcastTone}_${activeSlide.id}`] 
      : (customScripts[`${editionState.editionKey}_${activeSlide.id}`] !== undefined
        ? customScripts[`${editionState.editionKey}_${activeSlide.id}`]
        : (customScripts[activeSlide.id] !== undefined
          ? customScripts[activeSlide.id]
          : (activeSlide.defaultScript || ''))))
    : (activeSlide?.defaultScript || '');

  // Handle script edit
  const handleScriptChange = (val) => {
    setCustomScripts(prev => ({
      ...prev,
      [`${editionState.editionKey}_${broadcastTone}_${activeSlide.id}`]: val,
      [`${editionState.editionKey}_${activeSlide.id}`]: val,
      [activeSlide.id]: val
    }));
  };

  const handleResetCurrentScript = () => {
    setCustomScripts(prev => {
      const copy = { ...prev };
      delete copy[`${editionState.editionKey}_${broadcastTone}_${activeSlide.id}`];
      delete copy[`${editionState.editionKey}_${activeSlide.id}`];
      delete copy[activeSlide.id];
      return copy;
    });
  };

  // Build clean Word document text formatted ready for pasting
  const fullDocumentText = useMemo(() => {
    let out = `HAKAN GENÇ FİNANS - YOUTUBE YAYIN AKIŞI & PROMPTER KONUŞMA METNİ\n`;
    out += `Yayın Tarihi: ${todayFullStr} | Seans Saati: ${lastRefreshedAt.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })} TSİ | Format: ${slides.length} Slaytlık TV Brifingi (~8.5 - 9 Dakika)\n\n`;
    out += `GÜNCEL CANLI PİYASA KADRANI (SON 24 SAAT):\n`;
    out += `• Brent Ham Petrol: $${fmt(brent.price, 2)} (%${fmt(brent.change, 2)}) | WTI: $${fmt(wti.price, 2)} (%${fmt(wti.change, 2)})\n`;
    out += `• Ons Altın (XAU/USD): $${fmt(gold.price, 2)} (%${fmt(gold.change, 2)})\n`;
    out += `• Ons Gümüş (XAG/USD): $${fmt(silver.price, 2)} (%${fmt(silver.change, 2)})\n`;
    out += `• Borsa İstanbul (BIST 100): ${fmt(bist100.price, 2)} (%${fmt(bist100.change, 2)})\n`;
    out += `• Bitcoin (BTC/USD): $${fmt(btc.price, 0)} (%${fmt(btc.change, 2)})\n`;
    out += `• Dolar Endeksi (DXY): ${fmt(dxy.price, 3)} (%${fmt(dxy.change, 2)})\n`;
    out += `• ABD 10Y Tahvil: %${fmt(us10y.price, 3)} | ABD 2Y Tahvil: %${fmt(us2y.price, 3)} (${yieldSpreadStr})\n`;
    out += `• Dolar / TL: ${fmt(currentUsdTry, 2)} ₺\n`;
    out += `• Gram Altın (Kapalıçarşı): ${fmt(gramAltinTL, 0)} ₺/gr\n\n`;

    if (pinnedNews && pinnedNews.length > 0) {
      out += `YAYINA SEÇİLEN SICAK PİYASA HABERLERİ:\n`;
      pinnedNews.forEach((n, idx) => {
        const dir = n.sentiment === 'bull' ? '[POZİTİF]' : (n.sentiment === 'bear' ? '[BASKI]' : '[İZLEME]');
        out += `${idx + 1}. ${dir} (${n.bucketLabel || n.region}) ${n.title}${n.impactNote ? ` — Not: ${n.impactNote}` : ''}\n`;
      });
      out += `\n`;
    }

    out += `================================================================================\n\n`;

    slides.forEach((s) => {
      const script = customScripts[`${editionState.editionKey}_${broadcastTone}_${s.id}`] !== undefined
        ? customScripts[`${editionState.editionKey}_${broadcastTone}_${s.id}`]
        : (customScripts[`${editionState.editionKey}_${s.id}`] !== undefined
          ? customScripts[`${editionState.editionKey}_${s.id}`]
          : (customScripts[s.id] !== undefined ? customScripts[s.id] : s.defaultScript));
      out += `[SLAYT ${String(s.id).padStart(2, '0')} / ${String(slides.length).padStart(2, '0')}] ${s.title.toUpperCase()}\n`;
      out += `Alt Başlık: ${s.subtitle} • Tahmini Süre: ${s.durationEst}\n`;
      out += `Öne Çıkan Rakamlar: ${s.metrics.map(m => `${m.label}: ${m.val}`).join(' | ')}\n\n`;
      out += `🎙️ PROMPTER KONUŞMA METNİ:\n`;
      out += `"${script}"\n\n`;
      out += `--------------------------------------------------------------------------------\n\n`;
    });

    return out;
  }, [slides, customScripts, pinnedNews, brent, wti, gold, silver, bist100, btc, dxy, us10y, us2y, yieldSpreadStr, currentUsdTry, gramAltinTL, todayFullStr, lastRefreshedAt]);

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
    const pinnedHtmlSection = pinnedNews && pinnedNews.length > 0 ? `
        <h3>YAYINA SEÇİLEN SICAK HABERLER & PİYASA KATALİZÖRLERİ</h3>
        <table class="table-box">
          <tr><th>Bölge / Kategori</th><th>Manşet & Etki Notu</th><th>Hisse / Sembol</th><th>Yön & Kaynak</th></tr>
          ${pinnedNews.map(n => `
            <tr>
              <td><b>${n.bucketLabel || n.region}</b></td>
              <td><b>${n.title}</b>${n.impactNote ? `<br/><span style="color:#4a5568;font-size:9.5pt;">Not: ${n.impactNote}</span>` : ''}</td>
              <td>${(n.tickers || []).join(', ') || 'Genel'}</td>
              <td>${n.sentiment === 'bull' ? 'Pozitif Etki' : (n.sentiment === 'bear' ? 'Negatif Baskı' : 'İzleme')} (${n.source || 'Piyasa'})</td>
            </tr>
          `).join('')}
        </table>` : '';

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
        <div class="meta">Yayın Tarihi: ${todayFullStr} | Seans Saati: ${lastRefreshedAt.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })} TSİ • Format: ${slides.length} Slaytlık TV Brifingi • Doğal Neden-Sonuç Anlatımı (~8-9 Dakika)</div>
        
        <h3>GÜNCEL CANLI PİYASA KADRANI</h3>
        <table class="table-box">
          <tr><th>Gösterge / Varlık</th><th>Son Değer / Fiyat</th><th>Günlük Değişim</th><th>Piyasa Notu</th></tr>
          <tr><td><b>Brent Ham Petrol</b></td><td>$${fmt(brent.price, 2)}</td><td>%${fmt(brent.change, 2)}</td><td>WTI: $${fmt(wti.price, 2)} • Makas: $${fmt(oilSpread, 2)}</td></tr>
          <tr><td><b>Ons Altın (XAU/USD)</b></td><td>$${fmt(gold.price, 2)}</td><td>%${fmt(gold.change, 2)}</td><td>$${fmt(goldSupport, 0)} Destek / $${fmt(goldResLow, 0)} Direnç</td></tr>
          <tr><td><b>Ons Gümüş (XAG/USD)</b></td><td>$${fmt(silver.price, 2)}</td><td>%${fmt(silver.change, 2)}</td><td>Altın/Gümüş Rasyosu: ${fmt(goldSilverRatio, 1)}x</td></tr>
          <tr><td><b>Borsa İstanbul (BIST 100)</b></td><td>${fmt(bist100.price, 2)}</td><td>%${fmt(bist100.change, 2)}</td><td>${fmt(bistSupport, 0)} Destek / ${fmt(bistTarget, 0)} Hedef</td></tr>
          <tr><td><b>Bitcoin (BTC/USD)</b></td><td>$${fmt(btc.price, 0)}</td><td>%${fmt(btc.change, 2)}</td><td>$${fmt(btcSupport, 0)} Destek / $${fmt(btcBreakout, 0)} Direnç</td></tr>
          <tr><td><b>Dolar Endeksi (DXY)</b></td><td>${fmt(dxy.price, 3)}</td><td>%${fmt(dxy.change, 2)}</td><td>Küresel Rezerv Sepeti</td></tr>
          <tr><td><b>ABD 10Y Tahvil</b></td><td>%${fmt(us10y.price, 3)}</td><td>%${fmt(us10y.change, 2)}</td><td>2Y/10Y Getiri Farkı: ${yieldSpreadStr}</td></tr>
          <tr><td><b>Dolar / TL</b></td><td>${fmt(currentUsdTry, 2)} ₺</td><td>%${fmt(usdTryQuote.change, 2)}</td><td>TCMB %${fmt(quotes.tcmbRate, 2)} Politika Faizi</td></tr>
          <tr><td><b>Kapalıçarşı Gram Altın</b></td><td>${fmt(gramAltinTL, 0)} ₺/gr</td><td>%${fmt(gold.change, 2)}</td><td>Çifte Enflasyon Kalkanı</td></tr>
        </table>

        ${pinnedHtmlSection}

        <h3>KRİTİK MAKRO GÖSTERGELER & MERKEZ BANKASI BEKLENTİLERİ</h3>
        <table class="table-box">
          <tr><th>Veri / Gösterge</th><th>Açıklanan / Piyasa Değeri</th><th>Beklenti / Durum</th><th>Piyasa Etkisi & Strateji</th></tr>
          <tr><td><b>FED Faiz Beklentisi (CME FedWatch)</b></td><td><b>%${customAgenda?.fedRate?.prob || 76} (${customAgenda?.fedRate?.dominant || 'Faizi Sabit Tutma / Pas'})</b></td><td>%${customAgenda?.fedRate?.pauseProb || 24} Alternatif Senaryo</td><td>${customAgenda?.fedRate?.note || 'FOMC toplantısında faizin sabit tutulması fiyatlanıyor.'}</td></tr>
          <tr><td><b>S&P 500 & Nasdaq 100</b></td><td><b>S&P: ${fmt(sp500.price, 2)} | NDX: ${fmt(nasdaq.price, 2)}</b></td><td>Günlük: %${fmt(sp500.change, 2)} / %${fmt(nasdaq.change, 2)}</td><td>Bilanço ve sermaye akışı odaklı seçici görünüm.</td></tr>
          <tr><td><b>Türkiye TÜFE Enflasyonu</b></td><td><b>Yıllık %${fmt(quotes.turkeyCPI, 2)}</b></td><td>Reel Faiz: +${fmt(quotes.tcmbRate - quotes.turkeyCPI, 2)} Puan</td><td>TCMB faiz patikasında sıkı ve ihtiyatlı duruşunu sürdürerek dezenflasyon sürecini destekliyor.</td></tr>
        </table>
    `;

    slides.forEach((s) => {
      const script = customScripts[`${editionState.editionKey}_${broadcastTone}_${s.id}`] !== undefined
        ? customScripts[`${editionState.editionKey}_${broadcastTone}_${s.id}`]
        : (customScripts[`${editionState.editionKey}_${s.id}`] !== undefined
          ? customScripts[`${editionState.editionKey}_${s.id}`]
          : (customScripts[s.id] !== undefined ? customScripts[s.id] : s.defaultScript));
      htmlContent += `
        <h2>[SLAYT ${String(s.id).padStart(2, '0')} / ${String(slides.length).padStart(2, '0')}] ${s.title}</h2>
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

  // Keyboard navigation (disabled while typing inside editor, inputs or modals)
  useEffect(() => {
    const handleKeyDown = (e) => {
      const tag = (e.target?.tagName || '').toLowerCase();
      if (isEditingScript || isAgendaModalOpen || tag === 'input' || tag === 'textarea' || tag === 'select') return;
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
  }, [slides.length, isEditingScript, isAgendaModalOpen, currentSlideIndex]);

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

  const activeTickerItem = useMemo(() => {
    if (!pinnedNews || pinnedNews.length === 0) return null;
    return pinnedNews[tickerCursor % pinnedNews.length] || pinnedNews[0];
  }, [pinnedNews, tickerCursor]);

  const filteredNewsPool = useMemo(() => {
    const q = (newsSearchQuery || '').trim().toLowerCase();
    return (liveNewsList || []).filter((item) => {
      if (newsBucketFilter === 'CRITICAL') {
        if ((item.impactScore || 0) < 5.5 && item.impactLevel !== 'KRİTİK') return false;
      } else if (newsBucketFilter !== 'ALL') {
        if (item.broadcastBucket !== newsBucketFilter) return false;
      }
      if (!q) return true;
      const haystack = [
        item.title,
        item.source,
        item.bucketLabel,
        item.tag,
        ...(Array.isArray(item.tickers) ? item.tickers : [])
      ].filter(Boolean).join(' ').toLowerCase();
      return haystack.includes(q);
    });
  }, [liveNewsList, newsBucketFilter, newsSearchQuery]);


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
                alignItems: 'center',
                flexShrink: 0
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="nav-badge rose" style={{ fontSize: 11, fontWeight: 800, padding: '2px 8px' }}>
                  SLAYT {activeSlide.id} / {slides.length}
                </span>
                <span style={{ fontSize: 11.5, color: 'var(--cyan)', fontWeight: 700, letterSpacing: '0.04em' }}>
                  {activeSlide.badge}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {!isPopout && (
                  <div 
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 2, 
                      background: 'rgba(255, 255, 255, 0.06)', 
                      borderRadius: 5, 
                      padding: '2px 5px', 
                      border: '1px solid rgba(255, 255, 255, 0.1)' 
                    }}
                    title="Slayt yazı ve kart boyutunu büyüt / küçült"
                  >
                    <span style={{ fontSize: 10, color: '#94a3b8', marginRight: 3, fontWeight: 600 }}>Slayt Boyutu:</span>
                    <button
                      type="button"
                      onClick={() => handleSetSlideZoom(slideZoom - 0.06)}
                      style={{ background: 'transparent', border: 'none', color: '#cbd5e1', cursor: 'pointer', padding: '1px 5px', fontSize: 11, fontWeight: 800, lineHeight: 1 }}
                      title="Slayt yazılarını küçült"
                    >
                      A-
                    </button>
                    <span style={{ fontSize: 10.5, color: 'var(--cyan)', fontWeight: 800, minWidth: 34, textAlign: 'center', fontFamily: 'var(--font-mono)' }}>
                      %{Math.round(slideZoom * 100)}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleSetSlideZoom(slideZoom + 0.06)}
                      style={{ background: 'transparent', border: 'none', color: '#cbd5e1', cursor: 'pointer', padding: '1px 5px', fontSize: 11, fontWeight: 800, lineHeight: 1 }}
                      title="Slayt yazılarını büyüt"
                    >
                      A+
                    </button>
                  </div>
                )}
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  ⏱️ {activeSlide.durationEst}
                </span>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444' }} className="animate-pulse" title="Canlı Veri Beslemesi" />
                <span style={{ fontSize: 11, fontWeight: 800, color: '#f8fafc', letterSpacing: '0.05em' }}>
                  HAKAN GENÇ FİNANS TV
                </span>
              </div>
            </div>

            {/* Slide Core Content (16:9 Aspect Ratio) */}
            <div style={{ flex: 1, padding: '20px 24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', overflowY: 'auto', zoom: slideZoom }}>
              
              {/* Header Titles */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                  <div>
                    <h1 style={{ fontSize: 'clamp(21px, 2.4vw, 27px)', fontWeight: 900, color: '#ffffff', margin: 0, letterSpacing: '-0.02em', lineHeight: 1.2 }}>
                      {activeSlide.title}
                    </h1>
                    <p style={{ fontSize: 'clamp(13px, 1.3vw, 15px)', color: '#cbd5e1', margin: '5px 0 0 0', lineHeight: 1.4 }}>
                      {activeSlide.subtitle}
                    </p>
                  </div>
                  <span className="nav-badge emerald" style={{ fontSize: 11, padding: '4px 10px', fontWeight: 800 }}>
                    CANLI PİYASA
                  </span>
                </div>

                {/* 4 Big KPI Metric Chips */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
                  {activeSlide.metrics.map((m, idx) => (
                    <div 
                      key={idx}
                      style={{ 
                        padding: '10px 14px', 
                        background: 'rgba(15, 23, 42, 0.8)', 
                        border: '1px solid rgba(255, 255, 255, 0.1)', 
                        borderRadius: 6,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center'
                      }}
                    >
                      <div style={{ fontSize: 11.5, color: '#cbd5e1', fontWeight: 700 }}>
                        {m.label}
                      </div>
                      <div style={{ fontSize: 19, fontWeight: 900, color: '#ffffff', marginTop: 3, fontFamily: 'var(--font-mono)' }}>
                        {m.val}
                      </div>
                      {m.chg !== undefined && m.chg !== 0 ? (
                        <div style={{ fontSize: 11.5, fontWeight: 700, color: m.isUp ? '#34d399' : '#f87171', display: 'flex', alignItems: 'center', gap: 4, marginTop: 3 }}>
                          {m.isUp ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                          <span>{m.isUp ? '+' : ''}{fmt(m.chg, 2)}%</span>
                        </div>
                      ) : m.note ? (
                        <div style={{ fontSize: 11, color: 'var(--cyan)', marginTop: 3, fontWeight: 700 }}>
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
                      <div style={{ fontSize: 12, fontWeight: 800, color: '#e2e8f0', textAlign: 'center', marginBottom: 4 }}>
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
                        <div style={{ fontSize: 28, fontWeight: 900, color: getFgColor(fgScore), lineHeight: 1, fontFamily: 'var(--font-mono)' }}>
                          {fgScore}
                        </div>
                        <div style={{ fontSize: 12.5, fontWeight: 800, color: getFgColor(fgScore), marginTop: 3 }}>
                          {fgLabel}
                        </div>
                      </div>

                      {/* 4 Historical Levels */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4, marginTop: 8, paddingTop: 6, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                        <div style={{ background: 'rgba(255,255,255,0.03)', padding: '4px 3px', borderRadius: 4, textAlign: 'center' }}>
                          <div style={{ color: '#cbd5e1', fontSize: 9.5, fontWeight: 700 }}>DÜN</div>
                          <div style={{ fontWeight: 800, color: getFgColor(hist.yesterday), fontSize: 12, fontFamily: 'var(--font-mono)' }}>{hist.yesterday}</div>
                        </div>
                        <div style={{ background: 'rgba(255,255,255,0.03)', padding: '4px 3px', borderRadius: 4, textAlign: 'center' }}>
                          <div style={{ color: '#cbd5e1', fontSize: 9.5, fontWeight: 700 }}>1 HAFTA</div>
                          <div style={{ fontWeight: 800, color: getFgColor(hist.week_ago), fontSize: 12, fontFamily: 'var(--font-mono)' }}>{hist.week_ago}</div>
                        </div>
                        <div style={{ background: 'rgba(255,255,255,0.03)', padding: '4px 3px', borderRadius: 4, textAlign: 'center' }}>
                          <div style={{ color: '#cbd5e1', fontSize: 9.5, fontWeight: 700 }}>1 AY</div>
                          <div style={{ fontWeight: 800, color: getFgColor(hist.month_ago), fontSize: 12, fontFamily: 'var(--font-mono)' }}>{hist.month_ago}</div>
                        </div>
                        <div style={{ background: 'rgba(255,255,255,0.03)', padding: '4px 3px', borderRadius: 4, textAlign: 'center' }}>
                          <div style={{ color: '#cbd5e1', fontSize: 9.5, fontWeight: 700 }}>1 YIL</div>
                          <div style={{ fontWeight: 800, color: getFgColor(hist.year_ago), fontSize: 12, fontFamily: 'var(--font-mono)' }}>{hist.year_ago}</div>
                        </div>
                      </div>

                      {/* Mini VIX & Truflation row */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginTop: 8 }}>
                        <div style={{ background: '#0b0f19', border: '1px solid var(--border)', borderRadius: 4, padding: '5px 6px', textAlign: 'center' }}>
                          <div style={{ fontSize: 10, color: '#cbd5e1', fontWeight: 700 }}>VIX OYNAKLIK</div>
                          <div style={{ fontSize: 15, fontWeight: 900, color: '#fff', fontFamily: 'var(--font-mono)' }}>{fmt(vix.price, 2)}</div>
                        </div>
                        <div style={{ background: '#0b0f19', border: '1px solid var(--border)', borderRadius: 4, padding: '5px 6px', textAlign: 'center' }}>
                          <div style={{ fontSize: 10, color: '#cbd5e1', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3 }}>
                            <span>TRUFLATION</span>
                            <span className="nav-badge cyan" style={{ fontSize: 8.5, padding: '0 4px' }}>CANLI</span>
                          </div>
                          <div style={{ fontSize: 15, fontWeight: 900, color: '#38bdf8', fontFamily: 'var(--font-mono)' }}>
                            %{fmt(pulse?.truflation?.rate || pulse?.inflation?.usa || macroPulseData?.inflation?.usa || 3.09, 2)}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Right: Sub-Tabbed Multi-Visual Hub (FED CME, S&P Mevsimsellik, Sıcak Makro, Varlık Matrisi) */}
                    <div style={{ background: '#070a12', border: '1px solid var(--border)', borderRadius: 6, padding: '12px 14px', display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
                      {/* Sub-Tab Navigation Header */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, marginBottom: 10, paddingBottom: 8, borderBottom: '1px solid rgba(255,255,255,0.08)', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {[
                            { id: 'breaking_news', label: '🔥 Sıcak Haberler & Gündem', badge: 'Canlı Radar' },
                            { id: 'fed', label: '🏛️ FED Faiz Beklentisi', badge: customAgenda?.fedRate?.dominant ? `%${customAgenda.fedRate.prob} ${customAgenda.fedRate.dominant}` : 'CME Watch' },
                            { id: 'seasonality', label: '📈 S&P 500 Mevsimsellik', badge: 'Q4 +%4.1' },
                            { id: 'macro', label: '⚡ Sıcak Veriler (TÜFE/PMI)', badge: `TÜFE %${pulse?.inflation?.turkey || 29.73}` },
                            { id: 'matrix', label: '📊 Varlık Matrisi', badge: 'Canlı' }
                          ].map((tab) => {
                            const isActive = slide1SubTab === tab.id;
                            return (
                              <button
                                key={tab.id}
                                onClick={() => changeSlide1SubTab(tab.id)}
                                style={{
                                  padding: '5px 10px',
                                  borderRadius: 5,
                                  fontSize: 11.5,
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  background: isActive ? 'rgba(56, 189, 248, 0.16)' : 'rgba(255, 255, 255, 0.03)',
                                  border: isActive ? '1px solid var(--cyan)' : '1px solid rgba(255, 255, 255, 0.08)',
                                  color: isActive ? '#38bdf8' : '#cbd5e1',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 5,
                                  transition: 'all 0.15s ease'
                                }}
                              >
                                <span>{tab.label}</span>
                                <span style={{
                                  fontSize: 10,
                                  padding: '1px 5px',
                                  borderRadius: 3,
                                  background: isActive ? 'rgba(56, 189, 248, 0.25)' : 'rgba(255, 255, 255, 0.06)',
                                  color: isActive ? '#fff' : '#cbd5e1',
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
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1, minWidth: 0 }}>
                          {/* CME FedWatch Header */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <div style={{ fontSize: 13.5, fontWeight: 800, color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span>CME FEDWATCH FAİZ BEKLENTİLERİ</span>
                                <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 3, background: 'rgba(52, 211, 153, 0.15)', color: '#34d399', border: '1px solid rgba(52, 211, 153, 0.3)', fontWeight: 800 }}>
                                  CANLI TABLO
                                </span>
                              </div>
                              <div style={{ fontSize: 11.5, color: '#cbd5e1', marginTop: 3 }}>
                                Mevcut Politika Faizi: <span style={{ color: '#fff', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>%3.75 - %4.00</span> (375-400 bps)
                              </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontSize: 10.5, color: '#cbd5e1' }}>PİYASA KONSENSÜSÜ</div>
                              <div style={{ fontSize: 13, fontWeight: 800, color: '#38bdf8', fontFamily: 'var(--font-mono)' }}>
                                {customAgenda?.fedRate?.dominant || 'Faizi Sabit Tutma (Pas)'} (%{customAgenda?.fedRate?.prob ?? 76})
                              </div>
                            </div>
                          </div>

                          {/* Horizontal Bar Chart for FOMC Probabilities */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, background: 'rgba(0,0,0,0.3)', padding: '10px 12px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.06)' }}>
                            {/* Dominant Expectation Bar */}
                            <div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 700, marginBottom: 3 }}>
                                <span style={{ color: '#ffffff', display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981' }}></span>
                                  {customAgenda?.fedRate?.dominant || 'Faizi Sabit Tutma (Pas)'} ({customAgenda?.fedRate?.meetingDate || 'Aralık FOMC'})
                                </span>
                                <span style={{ color: '#34d399', fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: 13.5 }}>
                                  %{customAgenda?.fedRate?.prob ?? 76}
                                </span>
                              </div>
                              <div style={{ height: 10, background: 'rgba(255,255,255,0.06)', borderRadius: 5, overflow: 'hidden' }}>
                                <div style={{ width: `${customAgenda?.fedRate?.prob ?? 76}%`, height: '100%', background: 'linear-gradient(90deg, #059669, #10b981)', borderRadius: 5 }}></div>
                              </div>
                              <div style={{ fontSize: 11, color: '#cbd5e1', marginTop: 2 }}>{customAgenda?.fedRate?.meetingDate || 'Aralık FOMC'} toplantısında faizin %3.75 - %4.00 bandında sabit tutulması ana senaryosu</div>
                            </div>

                            {/* Alternative Scenario Bar */}
                            <div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 700, marginBottom: 3 }}>
                                <span style={{ color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#f59e0b' }}></span>
                                  {customAgenda?.fedRate?.dominant?.includes('İndirim') ? 'Faizi Sabit Tutma / Pas' : 'Aralık FOMC: 25 bp Faiz Artışı / Şahin Duruş'}
                                </span>
                                <span style={{ color: '#f59e0b', fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: 13.5 }}>
                                  %{customAgenda?.fedRate?.pauseProb ?? (100 - (customAgenda?.fedRate?.prob ?? 76))}
                                </span>
                              </div>
                              <div style={{ height: 8, background: 'rgba(255,255,255,0.06)', borderRadius: 4, overflow: 'hidden' }}>
                                <div style={{ width: `${customAgenda?.fedRate?.pauseProb ?? (100 - (customAgenda?.fedRate?.prob ?? 76))}%`, height: '100%', background: '#f59e0b', borderRadius: 4 }}></div>
                              </div>
                              <div style={{ fontSize: 11, color: '#cbd5e1', marginTop: 2 }}>Enflasyon yapışkanlığına bağlı faiz artışı veya şahin duruş senaryosu</div>
                            </div>
                          </div>

                          {/* Meeting & Scenario Summary Row */}
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '6px 8px', borderRadius: 4, textAlign: 'center' }}>
                              <div style={{ fontSize: 10.5, color: '#cbd5e1', fontWeight: 700 }}>ANA SENARYO</div>
                              <div style={{ fontSize: 12.5, fontWeight: 800, color: '#34d399', fontFamily: 'var(--font-mono)' }}>
                                %{customAgenda?.fedRate?.prob ?? 76} {customAgenda?.fedRate?.dominant || 'Sabit/Pas'}
                              </div>
                            </div>
                            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '6px 8px', borderRadius: 4, textAlign: 'center' }}>
                              <div style={{ fontSize: 10.5, color: '#cbd5e1', fontWeight: 700 }}>ALTERNATİF RİSK</div>
                              <div style={{ fontSize: 12.5, fontWeight: 800, color: '#f59e0b', fontFamily: 'var(--font-mono)' }}>
                                %{customAgenda?.fedRate?.pauseProb ?? (100 - (customAgenda?.fedRate?.prob ?? 76))} 25 bp Artış
                              </div>
                            </div>
                            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '6px 8px', borderRadius: 4, textAlign: 'center' }}>
                              <div style={{ fontSize: 10.5, color: '#cbd5e1', fontWeight: 700 }}>ODAK TOPLANTI</div>
                              <div style={{ fontSize: 12.5, fontWeight: 800, color: '#38bdf8', fontFamily: 'var(--font-mono)' }}>
                                {customAgenda?.fedRate?.meetingDate || 'Aralık FOMC'}
                              </div>
                            </div>
                          </div>

                          {/* Analytical Takeaway Box */}
                          <div style={{ background: 'rgba(56, 189, 248, 0.05)', border: '1px solid rgba(56, 189, 248, 0.2)', borderRadius: 5, padding: '8px 12px', fontSize: 12, color: '#e2e8f0', lineHeight: 1.45 }}>
                            <span style={{ color: '#38bdf8', fontWeight: 800 }}>⚡ PİYASA YORUMU & STRATEJİ: </span>
                            {customAgenda?.fedRate?.note || 'Aralık FOMC toplantısında faizin %3.75 - %4.00 bandında sabit tutulması (%76), enflasyon yapışkanlığına bağlı 25 bp faiz artışı veya şahin duruş riski (%24) fiyatlanmaktadır.'}
                          </div>
                        </div>
                      )}

                      {/* VIEW 2: S&P 500 SEASONALITY CHART */}
                      {slide1SubTab === 'seasonality' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <div style={{ fontSize: 13.5, fontWeight: 800, color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span>S&P 500 TARİHSEL MEVSİMSELLİK (1950 - GÜNÜMÜZ)</span>
                                <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 3, background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', border: '1px solid rgba(245, 158, 11, 0.3)', fontWeight: 800 }}>
                                  SEÇİM YILI DÖNGÜSÜ
                                </span>
                              </div>
                              <div style={{ fontSize: 11.5, color: '#cbd5e1', marginTop: 2 }}>
                                Aylık Tarihsel Getiri Ortalamaları & 4. Çeyrek (Q4) Yıl Sonu Gücü
                              </div>
                            </div>
                            <div style={{ display: 'flex', gap: 6 }}>
                              <div style={{ background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.25)', borderRadius: 4, padding: '4px 9px', textAlign: 'center' }}>
                                <div style={{ fontSize: 9.5, color: '#cbd5e1', fontWeight: 700 }}>SEÇİM Q4 ORT.</div>
                                <div style={{ fontSize: 13, fontWeight: 900, color: '#34d399', fontFamily: 'var(--font-mono)' }}>+%4.1</div>
                              </div>
                              <div style={{ background: 'rgba(56, 189, 248, 0.12)', border: '1px solid rgba(56, 189, 248, 0.25)', borderRadius: 4, padding: '4px 9px', textAlign: 'center' }}>
                                <div style={{ fontSize: 9.5, color: '#cbd5e1', fontWeight: 700 }}>KAS-ARA KAZANMA</div>
                                <div style={{ fontSize: 13, fontWeight: 900, color: '#38bdf8', fontFamily: 'var(--font-mono)' }}>%83.3</div>
                              </div>
                            </div>
                          </div>

                          {/* 12-Month Bar Chart */}
                          <div style={{ background: 'rgba(0,0,0,0.3)', padding: '9px 10px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.06)' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 4, alignItems: 'flex-end', height: 85, paddingBottom: 20, position: 'relative' }}>
                              {/* Baseline 0% line */}
                              <div style={{ position: 'absolute', bottom: 20, left: 0, right: 0, height: 1, background: 'rgba(255,255,255,0.15)' }} />

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
                                { m: 'Eki', ret: 1.4, isQ4: true },
                                { m: 'Kas', ret: 2.8, isQ4: true, active: true },
                                { m: 'Ara', ret: 1.6, isQ4: true }
                              ].map((item) => {
                                const isPos = item.ret >= 0;
                                const barHeight = Math.min(Math.abs(item.ret) * 16, 48);
                                return (
                                  <div key={item.m} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end', position: 'relative' }}>
                                    <span style={{
                                      fontSize: 10.5,
                                      fontWeight: 800,
                                      color: item.active ? '#38bdf8' : isPos ? (item.isQ4 ? '#34d399' : '#cbd5e1') : '#f87171',
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
                                      fontSize: 10.5,
                                      fontWeight: item.isQ4 ? 800 : 600,
                                      color: item.active ? '#38bdf8' : item.isQ4 ? '#e2e8f0' : '#cbd5e1'
                                    }}>
                                      {item.m}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {/* Analytical Takeaway Box */}
                          <div style={{ background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: 5, padding: '8px 12px', fontSize: 12, color: '#e2e8f0', lineHeight: 1.45 }}>
                            <span style={{ color: '#34d399', fontWeight: 800 }}>📈 MEVSİMSELLİK KURALI: </span>
                            Sonbahar aylarındaki jeopolitik risk ve makro çalkantılar, tarihsel olarak yıl sonu rallisi için ideal dip zeminini hazırlar. Kasım ayı (+%2.8 ortalama) S&P 500 için yılın en güçlü ayıdır.
                          </div>
                        </div>
                      )}

                      {/* VIEW 3: HOT MACRO DATA (TURKEY CPI & US PMI / NFP) */}
                      {slide1SubTab === 'macro' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ fontSize: 13.5, fontWeight: 800, color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span>⚡ BUGÜNÜN KRİTİK VERİLERİ & PİYASA ETKİSİ</span>
                            </div>
                            <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 3, background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.3)', fontWeight: 800 }}>
                              CANLI VERİLER
                            </span>
                          </div>

                          {/* 4 Cards Grid (2x2) */}
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, flex: 1 }}>
                            {/* 1. TÜFE & TCMB */}
                            <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 5, padding: '8px 10px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: 11.5, fontWeight: 800, color: 'var(--cyan)' }}>TÜRKİYE TÜFE & REEL FAİZ</span>
                                <span style={{ fontSize: 10.5, color: '#34d399', fontFamily: 'var(--font-mono)', fontWeight: 800 }}>Reel: +%{fmt((quotes?.tcmbRate ?? 36) - (quotes?.turkeyCPI ?? 29.73), 2)}</span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 3 }}>
                                <span style={{ fontSize: 16, fontWeight: 900, color: '#fff', fontFamily: 'var(--font-mono)' }}>%{fmt(quotes?.turkeyCPI ?? 29.73, 2)}</span>
                                <span style={{ fontSize: 11.5, color: '#cbd5e1' }}>Politika Faizi: %{fmt(quotes?.tcmbRate ?? 36, 2)}</span>
                              </div>
                              <div style={{ fontSize: 11.5, color: '#cbd5e1', marginTop: 3, lineHeight: 1.4 }}>
                                Yıllık enflasyonda dezenflasyon patikası takip ediliyor. TCMB pozitif reel faiz kalkanı ve sıkı likidite adımlarıyla TL varlıkları destekliyor.
                              </div>
                            </div>

                            {/* 2. ABD 10Y & 2Y Tahvil Eğrisi */}
                            <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 5, padding: '8px 10px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: 11.5, fontWeight: 800, color: '#38bdf8' }}>ABD 10Y & 2Y TAHVİL EĞRİSİ</span>
                                <span style={{ fontSize: 10.5, color: '#34d399', fontFamily: 'var(--font-mono)', fontWeight: 800 }}>Makas: {yieldSpreadStr}</span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 3 }}>
                                <span style={{ fontSize: 16, fontWeight: 900, color: '#fff', fontFamily: 'var(--font-mono)' }}>%{fmt(us10y.price, 3)}</span>
                                <span style={{ fontSize: 11.5, color: '#38bdf8' }}>(ABD 2Y: %{fmt(us2y.price, 2)})</span>
                              </div>
                              <div style={{ fontSize: 11.5, color: '#cbd5e1', marginTop: 3, lineHeight: 1.4 }}>
                                2Y/10Y getiri eğrisi {yieldSpreadStr} ile pozitif bölgede; tahvil piyasası sert durgunluk yerine dengeli büyüme ve faiz patikasını fiyatlıyor.
                              </div>
                            </div>

                            {/* 3. Küresel Dolar & Kur Dengesi */}
                            <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 5, padding: '8px 10px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: 11.5, fontWeight: 800, color: '#fbbf24' }}>DXY ENDEKSİ & USD/TRY</span>
                                <span style={{ fontSize: 10.5, color: '#fbbf24', fontFamily: 'var(--font-mono)', fontWeight: 800 }}>Kur: ₺{fmt(currentUsdTry, 2)}</span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 3 }}>
                                <span style={{ fontSize: 16, fontWeight: 900, color: '#fff', fontFamily: 'var(--font-mono)' }}>{fmt(dxy.price, 2)}</span>
                                <span style={{ fontSize: 11.5, color: dxy.change >= 0 ? '#34d399' : '#f87171' }}>({dxy.change >= 0 ? '+' : ''}%{fmt(dxy.change, 2)})</span>
                              </div>
                              <div style={{ fontSize: 11.5, color: '#cbd5e1', marginTop: 3, lineHeight: 1.4 }}>
                                DXY {fmt(dxy.price, 2)} seviyesinde küresel likiditeyi yönlendirirken, Ons Altın ${fmt(gold.price, 0)} ve Gram Altın ₺{fmt(gramAltinTL, 0)} seviyesinde işlem görüyor.
                              </div>
                            </div>

                            {/* 4. Petrol & Jeopolitik */}
                            <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 5, padding: '8px 10px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: 11.5, fontWeight: 800, color: '#f87171' }}>BRENT & WTI PETROL</span>
                                <span style={{ fontSize: 10.5, color: brent.change >= 0 ? '#f87171' : '#34d399', fontFamily: 'var(--font-mono)', fontWeight: 800 }}>Günlük {brent.change >= 0 ? '+' : ''}%{fmt(brent.change, 2)}</span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 3 }}>
                                <span style={{ fontSize: 16, fontWeight: 900, color: '#fff', fontFamily: 'var(--font-mono)' }}>${fmt(brent.price, 2)}</span>
                                <span style={{ fontSize: 11.5, color: '#cbd5e1' }}>WTI: ${fmt(wti.price, 2)}</span>
                              </div>
                              <div style={{ fontSize: 11.5, color: '#cbd5e1', marginTop: 3, lineHeight: 1.4 }}>
                                Brent - WTI makası ${fmt(oilSpread, 2)} seviyesinde; enerji ve navlun fiyatlamaları küresel manşet enflasyon geçişkenliği açısından izleniyor.
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* VIEW 4: EQUITIES RETURN MATRIX TABLE */}
                      {slide1SubTab === 'matrix' && (
                        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0, overflow: 'hidden' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                            <span style={{ fontSize: 13.5, fontWeight: 800, color: '#e2e8f0', whiteSpace: 'nowrap' }}>
                              🏛️ KÜRESEL VARLIK PERFORMANS MATRİSİ
                            </span>
                            <span style={{ fontSize: 11, color: '#cbd5e1', whiteSpace: 'nowrap' }}>
                              Canlı Piyasa Fiyatları
                            </span>
                          </div>

                          <div style={{ overflowX: 'auto', flex: 1, minWidth: 0 }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5, tableLayout: 'auto' }}>
                              <thead>
                                <tr style={{ borderBottom: '1px solid var(--border)', color: '#cbd5e1', textAlign: 'left' }}>
                                  <th style={{ padding: '6px 8px', whiteSpace: 'nowrap' }}>Varlık</th>
                                  <th style={{ padding: '6px 8px', textAlign: 'right', whiteSpace: 'nowrap' }}>Son Fiyat</th>
                                  <th style={{ padding: '6px 8px', textAlign: 'right', whiteSpace: 'nowrap' }}>Bugün</th>
                                  <th style={{ padding: '6px 8px', textAlign: 'right', whiteSpace: 'nowrap' }}>5 Gün</th>
                                  <th style={{ padding: '6px 8px', textAlign: 'right', whiteSpace: 'nowrap' }}>1 Ay</th>
                                  <th style={{ padding: '6px 8px', textAlign: 'right', whiteSpace: 'nowrap' }}>YTD</th>
                                </tr>
                              </thead>
                              <tbody>
                                {equitiesMatrix.map((eq, i) => {
                                  const isPositive = (n) => n >= 0;
                                  return (
                                    <tr key={eq.symbol} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)' }}>
                                      <td style={{ padding: '6px 8px', fontWeight: 700, color: '#fff', whiteSpace: 'nowrap' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                          <span>{eq.name}</span>
                                          <span style={{ fontSize: 10.5, color: 'var(--cyan)', fontFamily: 'var(--font-mono)' }}>({eq.symbol})</span>
                                        </div>
                                      </td>
                                      <td style={{ padding: '6px 8px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, whiteSpace: 'nowrap' }}>
                                        {fmt(eq.price, eq.price > 1000 ? 0 : 2)}
                                      </td>
                                      <td style={{ padding: '6px 8px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 800, color: isPositive(eq.today) ? 'var(--emerald)' : 'var(--red)', whiteSpace: 'nowrap' }}>
                                        {isPositive(eq.today) ? '+' : ''}{fmt(eq.today, 2)}%
                                      </td>
                                      <td style={{ padding: '6px 8px', textAlign: 'right', fontFamily: 'var(--font-mono)', color: eq.d5 === null ? 'var(--text-muted)' : (isPositive(eq.d5) ? 'var(--emerald)' : 'var(--red)'), whiteSpace: 'nowrap' }}>
                                        {eq.d5 === null ? '—' : `${isPositive(eq.d5) ? '+' : ''}${fmt(eq.d5, 2)}%`}
                                      </td>
                                      <td style={{ padding: '6px 8px', textAlign: 'right', fontFamily: 'var(--font-mono)', color: eq.m1 === null ? 'var(--text-muted)' : (isPositive(eq.m1) ? 'var(--emerald)' : 'var(--red)'), whiteSpace: 'nowrap' }}>
                                        {eq.m1 === null ? '—' : `${isPositive(eq.m1) ? '+' : ''}${fmt(eq.m1, 2)}%`}
                                      </td>
                                      <td style={{ padding: '6px 8px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color: eq.ytd === null ? 'var(--text-muted)' : (isPositive(eq.ytd) ? 'var(--emerald)' : 'var(--red)'), whiteSpace: 'nowrap' }}>
                                        {eq.ytd === null ? '—' : `${isPositive(eq.ytd) ? '+' : ''}${fmt(eq.ytd, 2)}%`}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* VIEW 5: BREAKING NEWS & MARKET SHOCKS */}
                      {slide1SubTab === 'breaking_news' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1, minWidth: 0, overflowY: 'auto' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ fontSize: 13.5, fontWeight: 800, color: '#f87171', display: 'flex', alignItems: 'center', gap: 6 }}>
                              <Flame size={15} />
                              <span>GÜNÜN SICAK GÜNDEMİ & PİYASA ETKİSİ</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <button
                                type="button"
                                onClick={applyLiveNewsDirectly}
                                style={{
                                  fontSize: 10.5,
                                  padding: '3px 8px',
                                  borderRadius: 4,
                                  background: newsAppliedToast ? 'rgba(16, 185, 129, 0.3)' : 'rgba(16, 185, 129, 0.15)',
                                  color: '#34d399',
                                  border: '1px solid rgba(16, 185, 129, 0.4)',
                                  cursor: 'pointer',
                                  fontWeight: 800,
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 4
                                }}
                                title="Google Finans canlı haber akışını tüm slaytlara tek tıkla uygular"
                              >
                                <Zap size={11} />
                                <span>{newsAppliedToast ? 'Güncellendi!' : '⚡ Canlı Haber Çek'}</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => setIsAgendaModalOpen(true)}
                                style={{
                                  fontSize: 10.5,
                                  padding: '3px 8px',
                                  borderRadius: 4,
                                  background: 'rgba(245, 158, 11, 0.15)',
                                  color: '#fbbf24',
                                  border: '1px solid rgba(245, 158, 11, 0.4)',
                                  cursor: 'pointer',
                                  fontWeight: 800,
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 4
                                }}
                                title="Gündem maddelerini düzenle veya özel başlıklar gir"
                              >
                                <Sparkles size={11} />
                                <span>🎙️ Gündemi Düzenle</span>
                              </button>

                              <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 3, background: 'rgba(239, 68, 68, 0.2)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.4)', fontWeight: 800 }}>
                                CANLI RADAR
                              </span>
                            </div>
                          </div>

                          {/* 1. Topic 1 */}
                          <div style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: 6, padding: '10px 12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontSize: 13, fontWeight: 900, color: '#fca5a5' }}>
                                💥 1. {customAgenda?.topic1?.title || 'Küresel Likidite & Faiz Patikası'}
                              </span>
                              <span style={{ fontSize: 10, color: '#ef4444', fontFamily: 'var(--font-mono)', fontWeight: 800 }}>
                                {customAgenda?.topic1?.tag || 'MAKRO & FAİZ'}
                              </span>
                            </div>
                            <div style={{ fontSize: 12, color: '#e2e8f0', marginTop: 4, lineHeight: 1.45 }}>
                              {customAgenda?.topic1?.desc || 'Faiz beklentileri, tahvil getirileri ve döviz piyasası dengesi.'}
                            </div>
                          </div>

                          {/* 2. Topic 2 */}
                          <div style={{ background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.25)', borderRadius: 6, padding: '10px 12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontSize: 13, fontWeight: 900, color: '#fde047' }}>
                                ⚡ 2. {customAgenda?.topic2?.title || 'Enerji & Jeopolitik Koridor'}
                              </span>
                              <span style={{ fontSize: 10, color: '#fbbf24', fontFamily: 'var(--font-mono)', fontWeight: 800 }}>
                                {customAgenda?.topic2?.tag || 'ENERJİ & JEOPOLİTİK'}
                              </span>
                            </div>
                            <div style={{ fontSize: 12, color: '#e2e8f0', marginTop: 4, lineHeight: 1.45 }}>
                              {customAgenda?.topic2?.desc || 'Hürmüz & Kızıldeniz lojistiği, Brent petrol ve enflasyon geçişkenliği.'}
                            </div>
                          </div>

                          {/* 3. Topic 3 */}
                          <div style={{ background: 'rgba(56, 189, 248, 0.08)', border: '1px solid rgba(56, 189, 248, 0.25)', borderRadius: 6, padding: '10px 12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontSize: 13, fontWeight: 900, color: '#93c5fd' }}>
                                📈 3. {customAgenda?.topic3?.title || 'Borsa & Şirket Bilançoları'}
                              </span>
                              <span style={{ fontSize: 10, color: '#60a5fa', fontFamily: 'var(--font-mono)', fontWeight: 800 }}>
                                {customAgenda?.topic3?.tag || 'HİSSE & BİLANÇO'}
                              </span>
                            </div>
                            <div style={{ fontSize: 12, color: '#e2e8f0', marginTop: 4, lineHeight: 1.45 }}>
                              {customAgenda?.topic3?.desc || 'BIST 100 ana kurumsal taban seviyeleri ve yapay zeka sermaye harcamaları.'}
                            </div>
                          </div>

                          {/* Canlı Akış Haberleri Bölümü (Yayındaki / RSS Seçkisi) */}
                          {(pinnedNews.length > 0 || liveNewsList.length > 0) && (
                            <div style={{ marginTop: 2, background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, padding: '8px 10px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, gap: 6, flexWrap: 'wrap' }}>
                                <span style={{ fontSize: 11, fontWeight: 800, color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: 5 }}>
                                  <Radio size={12} style={{ color: '#10b981' }} />
                                  <span>{pinnedNews.length > 0 ? 'YAYINA SEÇİLEN SICAK HABERLER' : 'CANLI HABER BESLEMESİ'}</span>
                                </span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  {!isPopout && (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => setIsNewsDrawerOpen(true)}
                                        style={{
                                          fontSize: 10,
                                          padding: '2px 7px',
                                          borderRadius: 4,
                                          background: 'rgba(56, 189, 248, 0.14)',
                                          color: '#38bdf8',
                                          border: '1px solid rgba(56, 189, 248, 0.35)',
                                          cursor: 'pointer',
                                          fontWeight: 700
                                        }}
                                      >
                                        📰 Haber Masası
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => changeSlide(1)}
                                        style={{
                                          fontSize: 10,
                                          padding: '2px 7px',
                                          borderRadius: 4,
                                          background: 'rgba(244, 63, 94, 0.16)',
                                          color: '#fda4af',
                                          border: '1px solid rgba(244, 63, 94, 0.38)',
                                          cursor: 'pointer',
                                          fontWeight: 700
                                        }}
                                      >
                                        Slayt 2'ye Git →
                                      </button>
                                    </>
                                  )}
                                  <span style={{ fontSize: 10, color: '#94a3b8' }}>{liveNewsList.length} Akış</span>
                                </div>
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                                {(pinnedNews.length > 0 ? pinnedNews : liveNewsList).slice(0, 3).map((n, idx) => {
                                  const sm = getSentimentMeta(n.sentiment);
                                  return (
                                    <div key={n.id || idx} style={{ fontSize: 11.5, color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: 6, lineHeight: 1.35 }}>
                                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: sm.color, flexShrink: 0 }} />
                                      <span style={{ fontSize: 9.5, fontWeight: 800, color: sm.color, background: sm.bg, padding: '1px 5px', borderRadius: 3, flexShrink: 0 }}>
                                        {n.region === 'TR' ? 'TR' : 'GLOBAL'}
                                      </span>
                                      <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 600 }}>{n.title}</span>
                                      {n.source && <span style={{ color: '#94a3b8', fontSize: 10, flexShrink: 0 }}>({n.source})</span>}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* SLIDE 2 (NEW): Live Market-Moving News & Catalysts Desk */}
                {activeSlide.id === 2 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, alignItems: 'stretch' }}>
                      {/* Left Panel: Turkey BIST 30, Earnings & Economic Policy */}
                      <div style={{ background: '#070a12', border: '1px solid rgba(16, 185, 129, 0.35)', borderRadius: 6, padding: 13, display: 'flex', flexDirection: 'column', gap: 9 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 6, borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                          <div style={{ fontSize: 13, fontWeight: 800, color: '#34d399', display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Newspaper size={15} />
                            <span>🇹🇷 TÜRKİYE: BIST 30, BİLANÇO & POLİTİK GÜNDEM</span>
                          </div>
                          <span style={{ fontSize: 9.5, padding: '2px 7px', borderRadius: 4, background: 'rgba(16, 185, 129, 0.14)', color: '#6ee7b7', border: '1px solid rgba(16, 185, 129, 0.3)', fontWeight: 800 }}>
                            BIST • TCMB • KAP
                          </span>
                        </div>

                        {pinnedTR.length > 0 ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
                            {pinnedTR.slice(0, 3).map((n, idx) => {
                              const sm = getSentimentMeta(n.sentiment);
                              const isCritical = (n.impactScore || 0) >= 5.5 || n.impactLevel === 'KRİTİK';
                              return (
                                <div
                                  key={n.id || idx}
                                  style={{
                                    background: 'rgba(255, 255, 255, 0.03)',
                                    border: `1px solid ${sm.border}`,
                                    borderLeft: `3px solid ${sm.color}`,
                                    borderRadius: 6,
                                    padding: '9px 11px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 5
                                  }}
                                >
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                                      <span style={{ fontSize: 9.5, fontWeight: 800, color: '#cbd5e1', background: 'rgba(255,255,255,0.07)', padding: '1px 6px', borderRadius: 3 }}>
                                        {n.bucketLabel || '🇹🇷 BIST & Ekonomi'}
                                      </span>
                                      {Array.isArray(n.tickers) && n.tickers.slice(0, 3).map(tk => (
                                        <span key={tk} style={{ fontSize: 9.5, fontWeight: 900, color: '#38bdf8', background: 'rgba(56, 189, 248, 0.15)', border: '1px solid rgba(56, 189, 248, 0.3)', padding: '1px 5px', borderRadius: 3, fontFamily: 'var(--font-mono)' }}>
                                          {tk}
                                        </span>
                                      ))}
                                      {isCritical && (
                                        <span style={{ fontSize: 9, fontWeight: 900, color: '#fda4af', background: 'rgba(244, 63, 94, 0.2)', border: '1px solid rgba(244, 63, 94, 0.4)', padding: '1px 5px', borderRadius: 3 }}>
                                          🔥 KRİTİK
                                        </span>
                                      )}
                                    </div>
                                    <span style={{ fontSize: 9.5, fontWeight: 800, color: sm.color, background: sm.bg, border: `1px solid ${sm.border}`, padding: '1px 6px', borderRadius: 3, fontFamily: 'var(--font-mono)' }}>
                                      {sm.label}
                                    </span>
                                  </div>

                                  <div style={{ fontSize: 13, fontWeight: 800, color: '#ffffff', lineHeight: 1.38 }}>
                                    {n.title}
                                  </div>

                                  {n.impactNote && (
                                    <div style={{ fontSize: 11.5, color: '#e2e8f0', background: 'rgba(56, 189, 248, 0.08)', borderLeft: '2px solid #38bdf8', padding: '4px 8px', borderRadius: '0 4px 4px 0', lineHeight: 1.35 }}>
                                      <b style={{ color: '#7dd3fc' }}>Piyasa Etkisi:</b> {n.impactNote}
                                    </div>
                                  )}

                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 10, color: '#94a3b8' }}>
                                    <span>{n.source || 'Yurt İçi Piyasa Akışı'}</span>
                                    <span style={{ fontFamily: 'var(--font-mono)' }}>{formatRelativeTimeTr(n.timeMs || n.pubDate)}</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', padding: '24px 14px', background: 'rgba(255,255,255,0.02)', borderRadius: 6, border: '1px dashed rgba(255,255,255,0.12)', gap: 8 }}>
                            <div style={{ fontSize: 12.5, fontWeight: 700, color: '#cbd5e1' }}>
                              Canlı TR / BIST 30 RSS akışı bekleniyor
                            </div>
                            <div style={{ fontSize: 11, color: '#94a3b8', lineHeight: 1.45 }}>
                              Sağ üstteki <b>"Canlı Haberleri Çek"</b> veya <b>"Haber Masası"</b> üzerinden BIST 30 ve ekonomi başlıklarını tek tıkla yayına alabilirsiniz.
                            </div>
                            {!isPopout && (
                              <button
                                type="button"
                                onClick={() => setIsNewsDrawerOpen(true)}
                                style={{ fontSize: 11, padding: '5px 12px', borderRadius: 5, background: 'rgba(16, 185, 129, 0.18)', border: '1px solid rgba(16, 185, 129, 0.4)', color: '#34d399', fontWeight: 800, cursor: 'pointer' }}
                              >
                                📰 Haber Masasını Aç
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Right Panel: US & Global Politics, Macro & Single-Stock Shocks */}
                      <div style={{ background: '#070a12', border: '1px solid rgba(56, 189, 248, 0.35)', borderRadius: 6, padding: 13, display: 'flex', flexDirection: 'column', gap: 9 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 6, borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                          <div style={{ fontSize: 13, fontWeight: 800, color: '#38bdf8', display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Globe size={15} />
                            <span>🇺🇸 ABD & GLOBAL: POLİTİKA, MAKRO & ŞİRKET ŞOKLARI</span>
                          </div>
                          <span style={{ fontSize: 9.5, padding: '2px 7px', borderRadius: 4, background: 'rgba(56, 189, 248, 0.14)', color: '#7dd3fc', border: '1px solid rgba(56, 189, 248, 0.3)', fontWeight: 800 }}>
                            WALL ST • FED • AI
                          </span>
                        </div>

                        {pinnedGlobal.length > 0 ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
                            {pinnedGlobal.slice(0, 3).map((n, idx) => {
                              const sm = getSentimentMeta(n.sentiment);
                              const isCritical = (n.impactScore || 0) >= 5.5 || n.impactLevel === 'KRİTİK';
                              return (
                                <div
                                  key={n.id || idx}
                                  style={{
                                    background: 'rgba(255, 255, 255, 0.03)',
                                    border: `1px solid ${sm.border}`,
                                    borderLeft: `3px solid ${sm.color}`,
                                    borderRadius: 6,
                                    padding: '9px 11px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 5
                                  }}
                                >
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                                      <span style={{ fontSize: 9.5, fontWeight: 800, color: '#cbd5e1', background: 'rgba(255,255,255,0.07)', padding: '1px 6px', borderRadius: 3 }}>
                                        {n.bucketLabel || '🇺🇸 Global & Wall St'}
                                      </span>
                                      {Array.isArray(n.tickers) && n.tickers.slice(0, 3).map(tk => (
                                        <span key={tk} style={{ fontSize: 9.5, fontWeight: 900, color: '#fbbf24', background: 'rgba(245, 158, 11, 0.16)', border: '1px solid rgba(245, 158, 11, 0.35)', padding: '1px 5px', borderRadius: 3, fontFamily: 'var(--font-mono)' }}>
                                          {tk}
                                        </span>
                                      ))}
                                      {isCritical && (
                                        <span style={{ fontSize: 9, fontWeight: 900, color: '#fda4af', background: 'rgba(244, 63, 94, 0.2)', border: '1px solid rgba(244, 63, 94, 0.4)', padding: '1px 5px', borderRadius: 3 }}>
                                          🔥 KRİTİK
                                        </span>
                                      )}
                                    </div>
                                    <span style={{ fontSize: 9.5, fontWeight: 800, color: sm.color, background: sm.bg, border: `1px solid ${sm.border}`, padding: '1px 6px', borderRadius: 3, fontFamily: 'var(--font-mono)' }}>
                                      {sm.label}
                                    </span>
                                  </div>

                                  <div style={{ fontSize: 13, fontWeight: 800, color: '#ffffff', lineHeight: 1.38 }}>
                                    {n.title}
                                  </div>

                                  {n.impactNote && (
                                    <div style={{ fontSize: 11.5, color: '#e2e8f0', background: 'rgba(244, 63, 94, 0.08)', borderLeft: '2px solid #f43f5e', padding: '4px 8px', borderRadius: '0 4px 4px 0', lineHeight: 1.35 }}>
                                      <b style={{ color: '#fda4af' }}>Piyasa Etkisi:</b> {n.impactNote}
                                    </div>
                                  )}

                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 10, color: '#94a3b8' }}>
                                    <span>{n.source || 'Küresel Haber Akışı'}</span>
                                    <span style={{ fontFamily: 'var(--font-mono)' }}>{formatRelativeTimeTr(n.timeMs || n.pubDate)}</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', padding: '24px 14px', background: 'rgba(255,255,255,0.02)', borderRadius: 6, border: '1px dashed rgba(255,255,255,0.12)', gap: 8 }}>
                            <div style={{ fontSize: 12.5, fontWeight: 700, color: '#cbd5e1' }}>
                              Canlı ABD & Global RSS akışı bekleniyor
                            </div>
                            <div style={{ fontSize: 11, color: '#94a3b8', lineHeight: 1.45 }}>
                              NVDA, Big Tech, Fed veya ABD siyasi gelişmelerini <b>"Haber Masası"</b>ndan ekleyebilir ya da canlı yenileyebilirsiniz.
                            </div>
                            {!isPopout && (
                              <button
                                type="button"
                                onClick={() => setIsNewsDrawerOpen(true)}
                                style={{ fontSize: 11, padding: '5px 12px', borderRadius: 5, background: 'rgba(56, 189, 248, 0.18)', border: '1px solid rgba(56, 189, 248, 0.4)', color: '#38bdf8', fontWeight: 800, cursor: 'pointer' }}
                              >
                                📰 Haber Masasını Aç
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Analytical Framing Strip */}
                    <div style={{ background: 'rgba(244, 63, 94, 0.06)', border: '1px solid rgba(244, 63, 94, 0.22)', borderRadius: 6, padding: '8px 13px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                      <div style={{ fontSize: 11.5, color: '#e2e8f0', lineHeight: 1.4 }}>
                        <span style={{ color: '#fb7185', fontWeight: 900 }}>⚖️ KATALİZÖR OKUMASI: </span>
                        Seçili manşetlerde akış <b style={{ color: '#fff' }}>{newsSentimentPulse.label}</b> ({newsSentimentPulse.note}) dengesinde. Haber şoklarının kalıcılığı şirketin bilanço ve nakit akışına etkisiyle ölçülür; paylaşımlar bilgilendirme amaçlıdır (YTD).
                      </div>
                      {!isPopout && (
                        <button
                          type="button"
                          onClick={() => setIsNewsDrawerOpen(prev => !prev)}
                          style={{
                            flexShrink: 0,
                            fontSize: 10.5,
                            padding: '4px 10px',
                            borderRadius: 4,
                            background: 'rgba(244, 63, 94, 0.16)',
                            border: '1px solid rgba(244, 63, 94, 0.4)',
                            color: '#fda4af',
                            fontWeight: 800,
                            cursor: 'pointer'
                          }}
                        >
                          {isNewsDrawerOpen ? 'Masayı Gizle' : '✏️ Manşetleri Düzenle'}
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* SLIDE 3: Geopolitics & Energy Transmission Chain */}
                {activeSlide.id === 3 && (
                  variantIndex === 1 ? (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                      {/* Left: OPEC+ & Spare Capacity */}
                      <div style={{ background: '#070a12', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: 6, padding: 14 }}>
                        <div style={{ fontSize: 13.5, fontWeight: 800, color: '#fbbf24', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                          <Flame size={15} />
                          <span>OPEC+ KOTALARI & ATIL ÜRETİM KAPASİTESİ</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          <div style={{ background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.2)', borderRadius: 6, padding: '10px 12px' }}>
                            <div style={{ fontWeight: 800, color: '#fff', fontSize: 14 }}>Suudi Arabistan & BAE Atıl Kapasite Kalkanı</div>
                            <div style={{ fontSize: 12.5, color: '#e2e8f0', marginTop: 3, lineHeight: 1.45 }}>Günlük 3.2M varillik anında devreye girebilir atıl kapasite, olası Hürmüz krizlerinde küresel fiyat tavanını sınırlıyor.</div>
                          </div>
                          <div style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: 6, padding: '10px 12px' }}>
                            <div style={{ fontWeight: 800, color: '#fff', fontSize: 14 }}>Rusya & Kazakistan Kota Telafisi</div>
                            <div style={{ fontSize: 12.5, color: '#e2e8f0', marginTop: 3, lineHeight: 1.45 }}>OPEC+ kotalarını aşan üretimler için telafi kesintileri devrede; Rus ham petrolü Asya rafinerilerine indirimli akıyor.</div>
                          </div>
                          <div style={{ background: 'rgba(56, 189, 248, 0.08)', border: '1px solid rgba(56, 189, 248, 0.2)', borderRadius: 6, padding: '10px 12px' }}>
                            <div style={{ fontWeight: 800, color: '#fff', fontSize: 14 }}>Brent - WTI Makası (${fmt(oilSpread, 2)}) & Rafineri Marjları</div>
                            <div style={{ fontSize: 12.5, color: '#e2e8f0', marginTop: 3, lineHeight: 1.45 }}>Brent (${fmt(brent.price, 2)}) ile WTI (${fmt(wti.price, 2)}) arasındaki makas ve yakıt kraking marjları küresel enerji maliyetini belirliyor.</div>
                          </div>
                        </div>
                      </div>

                      {/* Right: Global Reserves & Storage */}
                      <div style={{ background: '#070a12', border: '1px solid rgba(56, 189, 248, 0.3)', borderRadius: 6, padding: 14 }}>
                        <div style={{ fontSize: 13.5, fontWeight: 800, color: '#38bdf8', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                          <Activity size={15} />
                          <span>KÜRESEL STRATEJİK DEPOLAMA & TEDARİK GÜVENCESİ</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 6, padding: '10px 12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontWeight: 800, color: '#fff', fontSize: 13.5 }}>ABD Stratejik Petrol Rezervi (SPR)</span>
                              <span style={{ color: '#38bdf8', fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: 13.5 }}>395M Varil</span>
                            </div>
                            <div style={{ fontSize: 12, color: '#cbd5e1', marginTop: 3, lineHeight: 1.4 }}>Stratejik rezerv tamponları ve kademeli geri alım politikasıyla acil durum arz güvenliği korunuyor.</div>
                          </div>
                          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 6, padding: '10px 12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontWeight: 800, color: '#fff', fontSize: 13.5 }}>Avrupa Doğalgaz Depoları</span>
                              <span style={{ color: '#34d399', fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: 13.5 }}>%94 Doluluk</span>
                            </div>
                            <div style={{ fontSize: 12, color: '#cbd5e1', marginTop: 3, lineHeight: 1.4 }}>Kış sezonu öncesi rekor doluluk; kıtada akut bir enerji krizi riskini bertaraf etti.</div>
                          </div>
                          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 6, padding: '10px 12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontWeight: 800, color: '#fff', fontSize: 13.5 }}>Çin Stratejik Stoklama Hızı</span>
                              <span style={{ color: '#fbbf24', fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: 13.5 }}>+1.1M v/g Net</span>
                            </div>
                            <div style={{ fontSize: 12, color: '#cbd5e1', marginTop: 3, lineHeight: 1.4 }}>Pekin ucuz petrol ortamında depolarını doldurarak küresel fiziki talebe taban oluşturuyor.</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : variantIndex === 2 ? (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                      {/* Left: GPR Geopolitical Risk Index */}
                      <div style={{ background: '#070a12', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 6, padding: 14 }}>
                        <div style={{ fontSize: 13.5, fontWeight: 800, color: '#f87171', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                          <ShieldAlert size={15} />
                          <span>GPR JEOPOLİTİK RİSK ENDEKSİ (142.8 PUAN)</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          <div style={{ background: 'rgba(239, 68, 68, 0.08)', borderRadius: 6, padding: '10px 12px', borderLeft: '3px solid #ef4444' }}>
                            <div style={{ fontWeight: 800, color: '#fff', fontSize: 13.5 }}>Hürmüz Gerilim Katsayısı: Ortalamanın +%38 Üstü</div>
                            <div style={{ fontSize: 12, color: '#e2e8f0', marginTop: 3, lineHeight: 1.4 }}>Navlun ve deniz savaş riski sigorta primleri yakından izleniyor; armatörler alternatif rotaları değerlendiriyor.</div>
                          </div>
                          <div style={{ background: 'rgba(245, 158, 11, 0.08)', borderRadius: 6, padding: '10px 12px', borderLeft: '3px solid #f59e0b' }}>
                            <div style={{ fontWeight: 800, color: '#fff', fontSize: 13.5 }}>Süveyş Geçişlerinde %55 Düşüş</div>
                            <div style={{ fontSize: 12, color: '#e2e8f0', marginTop: 3, lineHeight: 1.4 }}>Kızıldeniz yerine Ümit Burnu'na sapan gemiler sefer başına 12-14 gün ek transit süresi yazıyor.</div>
                          </div>
                          <div style={{ background: 'rgba(56, 189, 248, 0.08)', borderRadius: 6, padding: '10px 12px', borderLeft: '3px solid #38bdf8' }}>
                            <div style={{ fontWeight: 800, color: '#fff', fontSize: 13.5 }}>LNG & Kritik Tedarik Zinciri</div>
                            <div style={{ fontSize: 12, color: '#e2e8f0', marginTop: 3, lineHeight: 1.4 }}>Körfez menşeli sıvılaştırılmış gaz (LNG) sevkiyatı alternatif hatlarla küresel pazarlara taşınıyor.</div>
                          </div>
                        </div>
                      </div>

                      {/* Right: 4-Layer Crisis Transmission */}
                      <div style={{ background: '#070a12', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: 6, padding: 14 }}>
                        <div style={{ fontSize: 13.5, fontWeight: 800, color: '#fbbf24', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                          <Zap size={15} />
                          <span>4 KATMANLI KRİZ SENARYOSU & PİYASA ETKİSİ</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {[
                            { num: '1', title: 'Brent Petrol Fiyat Kalkanı', desc: `$${fmt(brent.price, 2)} seviyesinde tutunma; enflasyon düşüş hızına direnç oluşturuyor`, col: '#ef4444' },
                            { num: '2', title: 'Güvenli Liman Rotasyonu', desc: `Ons altında $${fmt(goldSupport, 0)}+ kurumsal dip desteği ve nakit dolara yönelim`, col: '#f97316' },
                            { num: '3', title: 'ABD Tahvil Faizi Eşiği', desc: `10 yıllık faizin %${fmt(us10y.price, 2)} seviyesinde kalması; küresel faiz indirimlerini dengeleme etkisi`, col: '#eab308' },
                            { num: '4', title: 'Sektörel Ayrışma', desc: 'Savunma ve enerji şirketleri yükselirken, havacılık ve lojistikte yakıt marj baskısı', col: '#10b981' }
                          ].map(item => (
                            <div key={item.num} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.03)', padding: '8px 11px', borderRadius: 4, borderLeft: `3px solid ${item.col}` }}>
                              <span style={{ fontSize: 12, fontWeight: 900, color: item.col, background: `${item.col}20`, width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                {item.num}
                              </span>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 13.5, fontWeight: 700, color: '#fff' }}>{item.title}</div>
                                <div style={{ fontSize: 12, color: '#cbd5e1', marginTop: 1 }}>{item.desc}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                      {/* Left: Strategic Bottlenecks */}
                      <div style={{ background: '#070a12', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 6, padding: 14 }}>
                        <div style={{ fontSize: 13.5, fontWeight: 800, color: '#f87171', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                          <Flame size={15} />
                          <span>STRATEJİK BOĞAZLAR & TEDARİK RİSKLERİ</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                          <div style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: 6, padding: '10px 12px' }}>
                            <div style={{ fontWeight: 800, color: '#ffffff', fontSize: 14 }}>💥 Stratejik Boğazlar & Tedarik Güvenliği</div>
                            <div style={{ fontSize: 12.5, color: '#e2e8f0', marginTop: 3, lineHeight: 1.45 }}>{customAgenda?.topic2?.title || 'Hürmüz ve Kızıldeniz hattındaki arz güvenliği ve lojistik maliyetleri yakından izleniyor.'}</div>
                          </div>
                          <div style={{ background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.2)', borderRadius: 6, padding: '10px 12px' }}>
                            <div style={{ fontWeight: 800, color: '#ffffff', fontSize: 14 }}>🗳️ Küresel Enerji Politikası & Enflasyon Geçişkenliği</div>
                            <div style={{ fontSize: 12.5, color: '#e2e8f0', marginTop: 3, lineHeight: 1.45 }}>Enerji ve akaryakıt maliyetlerindeki yapışkanlık, manşet enflasyonun düşüş hızını sınırlarken merkez bankalarının manevra alanını belirliyor.</div>
                          </div>
                          <div style={{ background: 'rgba(56, 189, 248, 0.08)', border: '1px solid rgba(56, 189, 248, 0.2)', borderRadius: 6, padding: '10px 12px' }}>
                            <div style={{ fontWeight: 800, color: '#ffffff', fontSize: 14 }}>Navlun Maliyetleri & Güvenli Liman Talebi</div>
                            <div style={{ fontSize: 12.5, color: '#e2e8f0', marginTop: 3, lineHeight: 1.45 }}>Uzayan rotalar ve tedarik primleri ham madde fiyatlarını diri tutarken akıllı kurumsal sermaye güvenli liman varlıklarına sığınıyor.</div>
                          </div>
                        </div>
                      </div>

                      {/* Right: Cause-and-Effect Flow Pipeline */}
                      <div style={{ background: '#070a12', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: 6, padding: 14 }}>
                        <div style={{ fontSize: 13.5, fontWeight: 800, color: '#fbbf24', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                          <Zap size={15} />
                          <span>ZİNCİRLEME PİYASA İLETİM MEKANİZMASI</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {[
                            { step: '1', title: 'Stratejik Koridorlar & Tedarik Baskısı', desc: 'Hürmüz ve Kızıldeniz lojistiğinde tedarik ve güvenlik endişeleri', color: '#ef4444' },
                            { step: '2', title: 'Enerji Fiyatları & Rafineri Crack Spread', desc: `Brent petrol $${fmt(brent.price, 2)} bandında dengelenirken rafineri marjları yakından izleniyor`, color: '#f97316' },
                            { step: '3', title: 'Yapışkan Manşet Enflasyon', desc: 'Enerji ve navlun maliyetleri enflasyon düşüş hızına direnç oluşturuyor', color: '#eab308' },
                            { step: '4', title: 'Temkinli Merkez Bankaları', desc: 'Fed ve küresel merkez bankaları faiz indirim adımlarını verilere bağlı tutuyor', color: '#38bdf8' },
                            { step: '5', title: 'Güvenli Limana Kaçış (Altın & Gümüş)', desc: 'Ons altın ve gümüşe tarihi kurumsal taban desteği güçleniyor', color: '#10b981' }
                          ].map((item, idx) => (
                            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.03)', padding: '7px 10px', borderRadius: 4, borderLeft: `3px solid ${item.color}` }}>
                              <span style={{ fontSize: 12, fontWeight: 900, color: item.color, background: `${item.color}20`, width: 22, height: 22, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                {item.step}
                              </span>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{item.title}</div>
                                <div style={{ fontSize: 11.5, color: '#cbd5e1', marginTop: 1 }}>{item.desc}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )
                )}

                {/* SLIDE 4: Central Banks & Real Yield Comparison */}
                {activeSlide.id === 4 && (
                  variantIndex === 1 ? (
                    <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: 14 }}>
                      {/* Left: QT Balance Sheet Reduction */}
                      <div style={{ background: '#070a12', border: '1px solid rgba(56, 189, 248, 0.3)', borderRadius: 6, padding: 14 }}>
                        <div style={{ fontSize: 13.5, fontWeight: 800, color: '#38bdf8', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Activity size={15} />
                          <span>FED BİLANÇO DARALMASI (QT) & KÜRESEL LİKİDİTE</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          <div style={{ background: 'rgba(56, 189, 248, 0.08)', borderRadius: 6, padding: '10px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <div style={{ fontSize: 13.5, fontWeight: 800, color: '#fff' }}>Fed Bilanço Büyüklüğü</div>
                              <div style={{ fontSize: 11.5, color: '#cbd5e1', marginTop: 2 }}>Zirve $8.9 Trilyondan $1.8 Trilyon eritildi</div>
                            </div>
                            <span style={{ fontSize: 17, fontWeight: 900, color: '#38bdf8', fontFamily: 'var(--font-mono)' }}>$7.1 Trilyon</span>
                          </div>
                          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 6, padding: '10px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <div style={{ fontSize: 13.5, fontWeight: 800, color: '#fff' }}>Gecelik Ters Repo (RRP) Bakiyesi</div>
                              <div style={{ fontSize: 11.5, color: '#cbd5e1', marginTop: 2 }}>2T $'dan taban seviyesine indi</div>
                            </div>
                            <span style={{ fontSize: 17, fontWeight: 900, color: '#fbbf24', fontFamily: 'var(--font-mono)' }}>$245 Milyar</span>
                          </div>
                          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 6, padding: '10px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <div style={{ fontSize: 13.5, fontWeight: 800, color: '#fff' }}>Banka Rezervleri (Ample Reserves)</div>
                              <div style={{ fontSize: 11.5, color: '#cbd5e1', marginTop: 2 }}>Konforlu eşiğin güvenli üzerinde</div>
                            </div>
                            <span style={{ fontSize: 17, fontWeight: 900, color: '#34d399', fontFamily: 'var(--font-mono)' }}>$3.2 Trilyon</span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Turkey Disinflation Dynamic */}
                      <div style={{ background: '#070a12', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: 6, padding: 14 }}>
                        <div style={{ fontSize: 13.5, fontWeight: 800, color: '#34d399', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                          <ShieldCheck size={15} />
                          <span>TCMB DEZENFLASYON & REZERV TAHKİMİ</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          <div style={{ background: 'rgba(16, 185, 129, 0.08)', borderRadius: 6, padding: '10px 12px' }}>
                            <div style={{ fontWeight: 800, color: '#fff', fontSize: 13.5 }}>1. Swap Hariç Net Rezervler Artıda</div>
                            <div style={{ fontSize: 12, color: '#e2e8f0', marginTop: 3, lineHeight: 1.4 }}>Tarihi toparlanma süreciyle TCMB'nin döviz kuru üzerindeki manevra alanı en yüksek seviyede.</div>
                          </div>
                          <div style={{ background: 'rgba(56, 189, 248, 0.08)', borderRadius: 6, padding: '10px 12px' }}>
                            <div style={{ fontWeight: 800, color: '#fff', fontSize: 13.5 }}>2. KKM Bakiyesi Düzenli Eriyor</div>
                            <div style={{ fontSize: 12, color: '#e2e8f0', marginTop: 3, lineHeight: 1.4 }}>Tasarruf sahipleri kur garantili sistemden çıkarak doğrudan standart TL mevduata yöneliyor.</div>
                          </div>
                          <div style={{ background: 'rgba(245, 158, 11, 0.08)', borderRadius: 6, padding: '10px 12px' }}>
                            <div style={{ fontWeight: 800, color: '#fff', fontSize: 13.5 }}>3. Yabancı Tahvil ve Swap Girişleri</div>
                            <div style={{ fontSize: 12, color: '#e2e8f0', marginTop: 3, lineHeight: 1.4 }}>Yüksek reel faiz TL varlıkları yabancı fonlar için küresel ölçekte en cazip carry trade kılıyor.</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : variantIndex === 2 ? (
                    <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: 14 }}>
                      {/* Left: Services vs Goods Inflation */}
                      <div style={{ background: '#070a12', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 6, padding: 14 }}>
                        <div style={{ fontSize: 13.5, fontWeight: 800, color: '#f87171', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Flame size={15} />
                          <span>HİZMET vs MAL ENFLASYONU AYRIŞMASI</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          <div style={{ background: 'rgba(239, 68, 68, 0.08)', borderRadius: 6, padding: '10px 12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontWeight: 800, color: '#fff', fontSize: 13.5 }}>ABD Çekirdek Hizmetler (Supercore)</span>
                              <span style={{ color: '#f87171', fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: 13 }}>%3.8 (Yapışkan)</span>
                            </div>
                            <div style={{ fontSize: 12, color: '#e2e8f0', marginTop: 3, lineHeight: 1.4 }}>Kira, sağlık ve işgücü maliyetleri Fed'in aceleci faiz indirimlerine set çekiyor.</div>
                          </div>
                          <div style={{ background: 'rgba(16, 185, 129, 0.08)', borderRadius: 6, padding: '10px 12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontWeight: 800, color: '#fff', fontSize: 13.5 }}>Küresel Dayanıklı Mal Fiyatları</span>
                              <span style={{ color: '#34d399', fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: 13 }}>-%0.6 (Deflasyonist)</span>
                            </div>
                            <div style={{ fontSize: 12, color: '#e2e8f0', marginTop: 3, lineHeight: 1.4 }}>Çin'in ucuz fabrika ihracatı dünya genelinde mal enflasyonunu hızla aşağı çekiyor.</div>
                          </div>
                          <div style={{ background: 'rgba(245, 158, 11, 0.08)', borderRadius: 6, padding: '10px 12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontWeight: 800, color: '#fff', fontSize: 13.5 }}>Türkiye Kira & Hizmet Atalet Eşiği</span>
                              <span style={{ color: '#fbbf24', fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: 13 }}>%55+ Yıllık</span>
                            </div>
                            <div style={{ fontSize: 12, color: '#e2e8f0', marginTop: 3, lineHeight: 1.4 }}>TCMB, dezenflasyonu kalıcı kılmak için iç talebi ve kredi büyümesini kısıtlamaya devam ediyor.</div>
                          </div>
                        </div>
                      </div>

                      {/* Right: Central Banks Rate Cut Roadmap */}
                      <div style={{ background: '#070a12', border: '1px solid rgba(56, 189, 248, 0.3)', borderRadius: 6, padding: 14 }}>
                        <div style={{ fontSize: 13.5, fontWeight: 800, color: '#38bdf8', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                          <Compass size={15} />
                          <span>KÜRESEL MERKEZ BANKALARI İNDİRİM YOL HARİTASI</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 6, padding: '10px 12px', borderLeft: '3px solid #38bdf8' }}>
                            <div style={{ fontWeight: 800, color: '#fff', fontSize: 13.5 }}>🇺🇸 Federal Reserve (Fed)</div>
                            <div style={{ fontSize: 12, color: '#cbd5e1', marginTop: 2, lineHeight: 1.4 }}>{customAgenda?.fedRate?.meetingDate || 'Aralık FOMC'} toplantısında faizin %3.75 - %4.00 bandında sabit kalması (%{customAgenda?.fedRate?.prob ?? 76}); enflasyon yapışkanlığına bağlı 25 bp faiz artışı veya şahin duruş riski (%{customAgenda?.fedRate?.pauseProb ?? 24}).</div>
                          </div>
                          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 6, padding: '10px 12px', borderLeft: '3px solid #fbbf24' }}>
                            <div style={{ fontWeight: 800, color: '#fff', fontSize: 13.5 }}>🇪🇺 Avrupa Merkez Bankası (ECB)</div>
                            <div style={{ fontSize: 12, color: '#cbd5e1', marginTop: 2, lineHeight: 1.4 }}>Zayıflayan imalat PMI verileri sebebiyle Fed'den daha agresif indirim temposu.</div>
                          </div>
                          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 6, padding: '10px 12px', borderLeft: '3px solid #34d399' }}>
                            <div style={{ fontWeight: 800, color: '#fff', fontSize: 13.5 }}>🇹🇷 TCMB (Türkiye)</div>
                            <div style={{ fontSize: 12, color: '#cbd5e1', marginTop: 2, lineHeight: 1.4 }}>Politika faizi %{fmt(quotes?.tcmbRate ?? 36, 2)}; enflasyon ana eğilimi teyit edildikçe ölçülü ve temkinli duruş.</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: 14 }}>
                      {/* Left: Global Central Banks Real Yield Table */}
                      <div style={{ background: '#070a12', border: '1px solid var(--border)', borderRadius: 6, padding: 14 }}>
                        <div style={{ fontSize: 13.5, fontWeight: 800, color: '#e2e8f0', marginBottom: 10 }}>
                          🏛️ KÜRESEL REEL FAİZ KARŞILAŞTIRMASI
                        </div>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                          <thead>
                            <tr style={{ borderBottom: '1px solid var(--border)', color: '#cbd5e1', textAlign: 'left', fontSize: 12 }}>
                              <th style={{ padding: '7px 8px' }}>Merkez Bankası</th>
                              <th style={{ padding: '7px 8px', textAlign: 'right' }}>Faiz</th>
                              <th style={{ padding: '7px 8px', textAlign: 'right' }}>Enflasyon</th>
                              <th style={{ padding: '7px 8px', textAlign: 'right' }}>Net Reel Faiz</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', background: 'rgba(16, 185, 129, 0.08)' }}>
                              <td style={{ padding: '10px 8px', fontWeight: 800, color: '#34d399' }}>🇹🇷 TCMB (Türkiye)</td>
                              <td style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 800, color: '#fff' }}>%{fmt(quotes?.tcmbRate ?? 36, 2)}</td>
                              <td style={{ padding: '10px 8px', textAlign: 'right', color: '#e2e8f0' }}>%{fmt(quotes?.turkeyCPI ?? 29.73, 2)}</td>
                              <td style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 900, color: '#34d399', fontSize: 14 }}>+{fmt((quotes?.tcmbRate ?? 36) - (quotes?.turkeyCPI ?? 29.73), 2)} Puan</td>
                            </tr>
                            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                              <td style={{ padding: '10px 8px', fontWeight: 700, color: '#fff' }}>🇺🇸 Fed (ABD)</td>
                              <td style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 700, color: '#fff' }}>%3.75 - 4.00</td>
                              <td style={{ padding: '10px 8px', textAlign: 'right', color: '#e2e8f0' }}>%{fmt(pulse?.truflation?.rate || pulse?.inflation?.usa || 3.09, 2)}</td>
                              <td style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 700, color: '#38bdf8' }}>+{fmt(Math.max(0, 3.875 - (pulse?.truflation?.rate || pulse?.inflation?.usa || 3.09)), 2)} Puan</td>
                            </tr>
                            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                              <td style={{ padding: '10px 8px', fontWeight: 700, color: '#fff' }}>🇪🇺 ECB (Euro Bölgesi)</td>
                              <td style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 700, color: '#fff' }}>%2.50</td>
                              <td style={{ padding: '10px 8px', textAlign: 'right', color: '#e2e8f0' }}>%2.20</td>
                              <td style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 700, color: '#cbd5e1' }}>+0.30 Puan</td>
                            </tr>
                            <tr>
                              <td style={{ padding: '10px 8px', fontWeight: 700, color: '#fff' }}>🇯🇵 BoJ (Japonya)</td>
                              <td style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 700, color: '#fff' }}>%1.25</td>
                              <td style={{ padding: '10px 8px', textAlign: 'right', color: '#e2e8f0' }}>%2.80</td>
                              <td style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 700, color: '#f87171' }}>-1.55 Puan</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      {/* Right: Turkey 3-Layer Shield */}
                      <div style={{ background: '#070a12', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: 6, padding: 14 }}>
                        <div style={{ fontSize: 13.5, fontWeight: 800, color: '#34d399', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                          <ShieldCheck size={15} />
                          <span>TÜRKİYE'NİN 3 KATMANLI MAKRO KALKANI</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          <div style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: 6, padding: '10px 12px' }}>
                            <div style={{ fontWeight: 800, color: '#fff', fontSize: 14 }}>1. Pozitif Reel Faiz (+%{fmt((quotes?.tcmbRate ?? 36) - (quotes?.turkeyCPI ?? 29.73), 2)})</div>
                            <div style={{ fontSize: 12, color: '#e2e8f0', marginTop: 3, lineHeight: 1.4 }}>TL mevduat getirisi enflasyonu aşarak dolarizasyonu frenliyor ve yerel parayı cazip kılıyor.</div>
                          </div>
                          <div style={{ background: 'rgba(56, 189, 248, 0.08)', border: '1px solid rgba(56, 189, 248, 0.2)', borderRadius: 6, padding: '10px 12px' }}>
                            <div style={{ fontWeight: 800, color: '#fff', fontSize: 14 }}>2. Düşen Ülke Risk Primi (216 bp CDS)</div>
                            <div style={{ fontSize: 12, color: '#e2e8f0', marginTop: 3, lineHeight: 1.4 }}>Tarihi dip seviyelerde seyreden CDS primi yabancı sermaye girişlerini ve tahvil talebini destekliyor.</div>
                          </div>
                          <div style={{ background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.2)', borderRadius: 6, padding: '10px 12px' }}>
                            <div style={{ fontWeight: 800, color: '#fff', fontSize: 14 }}>3. Cari Denge Kalkanı (+$779M Cari Fazla)</div>
                            <div style={{ fontSize: 12, color: '#e2e8f0', marginTop: 3, lineHeight: 1.4 }}>Dış ticaret dengesindeki toparlanma ve turizm gelirleri TCMB rezervlerini tahkim ediyor.</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                )}

                {/* SLIDE 5: Wall Street & AI Ecosystem */}
                {activeSlide.id === 5 && (
                  variantIndex === 1 ? (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                      {/* Left: Big Tech AI Capex */}
                      <div style={{ background: '#070a12', border: '1px solid rgba(56, 189, 248, 0.3)', borderRadius: 6, padding: 14 }}>
                        <div style={{ fontSize: 13.5, fontWeight: 800, color: '#38bdf8', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <BarChart3 size={15} />
                          <span>BİG TECH YAPAY ZEKA CAPEX ($205B YILLIK REKOR)</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {[
                            { sym: 'MICROSOFT', amount: '$58 Milyar', note: 'Azure AI bulut altyapısı & süper küme yatırımları', col: '#38bdf8' },
                            { sym: 'ALPHABET (GOOGLE)', amount: '$52 Milyar', note: 'TPU v5/v6 veri merkezleri & Gemini model mimarisi', col: '#818cf8' },
                            { sym: 'AMAZON (AWS)', amount: '$55 Milyar', note: 'AWS veri merkezleri & Trainium/Inferentia çipleri', col: '#fbbf24' },
                            { sym: 'META', amount: '$40 Milyar', note: 'Llama açık kaynak modelleri & yapay zeka reklam motoru', col: '#ec4899' },
                            { sym: 'ORACLE / TIER-2', amount: '$35 Milyar', note: 'Bulut veri merkezleri & OCI altyapı genişlemesi', col: '#34d399' }
                          ].map((c, i) => (
                            <div key={i} style={{ background: 'rgba(255,255,255,0.025)', border: `1px solid ${c.col}25`, borderRadius: 6, padding: '8px 11px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div>
                                <div style={{ fontSize: 13, fontWeight: 800, color: '#fff' }}>{c.sym}</div>
                                <div style={{ fontSize: 11.5, color: '#cbd5e1', marginTop: 1 }}>{c.note}</div>
                              </div>
                              <span style={{ fontSize: 15, fontWeight: 900, color: c.col, fontFamily: 'var(--font-mono)' }}>{c.amount}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Right: AI Value Chain */}
                      <div style={{ background: '#070a12', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: 6, padding: 14 }}>
                        <div style={{ fontSize: 13.5, fontWeight: 800, color: '#34d399', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Sparkles size={15} />
                          <span>YAPAY ZEKA DEĞER ZİNCİRİ KATMANLARI</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          <div style={{ background: 'rgba(16, 185, 129, 0.08)', borderRadius: 6, padding: '9px 12px', borderLeft: '3px solid #10b981' }}>
                            <div style={{ fontWeight: 800, color: '#fff', fontSize: 13.5 }}>1. Çip & Dökümhane (NVIDIA, TSMC, Broadcom)</div>
                            <div style={{ fontSize: 12, color: '#e2e8f0', marginTop: 2 }}>Yapay zeka modellerinin eğitildiği temel işlemciler; %90+ pazar hâkimiyeti.</div>
                          </div>
                          <div style={{ background: 'rgba(56, 189, 248, 0.08)', borderRadius: 6, padding: '9px 12px', borderLeft: '3px solid #38bdf8' }}>
                            <div style={{ fontWeight: 800, color: '#fff', fontSize: 13.5 }}>2. Optik Ağ & Donanım (Arista Networks, Supermicro)</div>
                            <div style={{ fontSize: 12, color: '#e2e8f0', marginTop: 2 }}>Binlerce GPU'yu birbirine bağlayan ultra hızlı sunucu ve optik anahtar ağı.</div>
                          </div>
                          <div style={{ background: 'rgba(245, 158, 11, 0.08)', borderRadius: 6, padding: '9px 12px', borderLeft: '3px solid #f59e0b' }}>
                            <div style={{ fontWeight: 800, color: '#fff', fontSize: 13.5 }}>3. Temiz Enerji & Nükleer (Constellation, Vistra)</div>
                            <div style={{ fontSize: 12, color: '#e2e8f0', marginTop: 2 }}>Yapay zeka sunucularının devasa 7/24 elektrik ihtiyacı için nükleer enerji anlaşmaları.</div>
                          </div>
                          <div style={{ background: 'rgba(192, 132, 252, 0.08)', borderRadius: 6, padding: '9px 12px', borderLeft: '3px solid #c084fc' }}>
                            <div style={{ fontWeight: 800, color: '#fff', fontSize: 13.5 }}>4. Kurumsal Yazılım (Microsoft Copilot, Palantir)</div>
                            <div style={{ fontSize: 12, color: '#e2e8f0', marginTop: 2 }}>Yapay zekayı doğrudan şirketlerin nakit akışına ve kârlılığına dönüştüren yazılımlar.</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : variantIndex === 2 ? (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                      {/* Left: S&P 500 Valuation & Forward P/E */}
                      <div style={{ background: '#070a12', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: 6, padding: 14 }}>
                        <div style={{ fontSize: 13.5, fontWeight: 800, color: '#fbbf24', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <BarChart3 size={15} />
                          <span>S&P 500 İLERİ F/K ÇARPANLARI & DEĞERLEME</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          <div style={{ background: 'rgba(245, 158, 11, 0.08)', borderRadius: 6, padding: '10px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <div style={{ fontSize: 13.5, fontWeight: 800, color: '#fff' }}>S&P 500 Ağırlıklı F/K</div>
                              <div style={{ fontSize: 11.5, color: '#cbd5e1', marginTop: 2 }}>5 yıllık ortalama 19.2x; teknoloji devlerinin ağırlığı yüksek</div>
                            </div>
                            <span style={{ fontSize: 17, fontWeight: 900, color: '#fbbf24', fontFamily: 'var(--font-mono)' }}>21.4x</span>
                          </div>
                          <div style={{ background: 'rgba(16, 185, 129, 0.08)', borderRadius: 6, padding: '10px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <div style={{ fontSize: 13.5, fontWeight: 800, color: '#fff' }}>Eşit Ağırlıklı S&P 500 (RSP) F/K</div>
                              <div style={{ fontSize: 11.5, color: '#cbd5e1', marginTop: 2 }}>Tarihsel ortalamaya çok daha yakın ve makul değer</div>
                            </div>
                            <span style={{ fontSize: 17, fontWeight: 900, color: '#34d399', fontFamily: 'var(--font-mono)' }}>16.8x</span>
                          </div>
                          <div style={{ background: 'rgba(56, 189, 248, 0.08)', borderRadius: 6, padding: '10px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <div style={{ fontSize: 13.5, fontWeight: 800, color: '#fff' }}>Mag-7 Dışı Kâr Büyümesi</div>
                              <div style={{ fontSize: 11.5, color: '#cbd5e1', marginTop: 2 }}>Geniş tabanlı sektörlerde kârlılık ivmeleniyor</div>
                            </div>
                            <span style={{ fontSize: 17, fontWeight: 900, color: '#38bdf8', fontFamily: 'var(--font-mono)' }}>+%7.4 Yıllık</span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Market Breadth & Rotation */}
                      <div style={{ background: '#070a12', border: '1px solid var(--border)', borderRadius: 6, padding: 14 }}>
                        <div style={{ fontSize: 13.5, fontWeight: 800, color: '#e2e8f0', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Zap size={15} />
                          <span>SERMAYE ROTASYONU & PİYASA DERİNLİĞİ</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 6, padding: '10px 12px' }}>
                            <div style={{ fontWeight: 800, color: '#fff', fontSize: 13.5 }}>Finans & Büyük Bankalar</div>
                            <div style={{ fontSize: 12, color: '#cbd5e1', marginTop: 2 }}>Sağlam kredi portföyleri ve birleşme/satın alma (M&A) gelirleriyle defansif güç.</div>
                          </div>
                          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 6, padding: '10px 12px' }}>
                            <div style={{ fontWeight: 800, color: '#fff', fontSize: 13.5 }}>Russell 2000 Küçük Ölçekli Şirketler</div>
                            <div style={{ fontSize: 12, color: '#cbd5e1', marginTop: 2 }}>Düşen faizlerle birlikte borç maliyetleri rahatlayan KOBİ'lerde toparlanma potansiyeli.</div>
                          </div>
                          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 6, padding: '10px 12px' }}>
                            <div style={{ fontWeight: 800, color: '#fff', fontSize: 13.5 }}>Sanayi & İmalat (Onshoring)</div>
                            <div style={{ fontSize: 12, color: '#cbd5e1', marginTop: 2 }}>Fabrika yatırımlarının ABD'ye dönüşü altyapı ve mühendislik şirketlerini destekliyor.</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                      {/* Left: Sectoral Momentum Barometer */}
                      <div style={{ background: '#070a12', border: '1px solid var(--border)', borderRadius: 6, padding: 14 }}>
                        <div style={{ fontSize: 13.5, fontWeight: 800, color: '#e2e8f0', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <BarChart3 size={15} />
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
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 4 }}>
                                <span style={{ fontWeight: 700, color: '#fff' }}>{sec.name}</span>
                                <span style={{ color: sec.color, fontWeight: 800 }}>{sec.status}</span>
                              </div>
                              <div style={{ height: 7, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
                                <div style={{ width: `${sec.pct}%`, height: '100%', background: sec.color, borderRadius: 3 }} />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Right: Big Tech / AI Ecosystem Leaders */}
                      <div style={{ background: '#070a12', border: '1px solid var(--border)', borderRadius: 6, padding: 14 }}>
                        <div style={{ fontSize: 13.5, fontWeight: 800, color: '#38bdf8', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Sparkles size={15} />
                          <span>YAPAY ZEKA DEVLERİ & TEMATİK DÖNGÜ</span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                          {[
                            { sym: 'NVIDIA', note: 'Blackwell B200 Çip Sevkiyatları', tag: 'AI Lokomotif', color: '#10b981' },
                            { sym: 'TSMC', note: 'Gelişmiş N3/N2 Dökümhane Kapasitesi', tag: 'Dökümhane Tekeli', color: '#38bdf8' },
                            { sym: 'AMAZON', note: 'AWS Bulut Marjları & Nakit Akışı', tag: 'Bulut Gücü', color: '#38bdf8' },
                            { sym: 'ALPHABET', note: 'Gemini AI & 22 F/K Çarpanı', tag: 'Makul Değer', color: '#818cf8' },
                            { sym: 'META', note: 'AI Destekli Reklam Gelirleri', tag: 'Yüksek Marj', color: '#ec4899' },
                            { sym: 'MICROSOFT', note: 'Azure & Copilot Kurumsal Lisans', tag: 'Kurumsal Güç', color: '#60a5fa' }
                          ].map((tech, idx) => (
                            <div key={idx} style={{ background: 'rgba(255,255,255,0.025)', border: `1px solid ${tech.color}30`, borderRadius: 6, padding: '9px 11px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontWeight: 900, color: '#fff', fontSize: 13 }}>{tech.sym}</span>
                                <span style={{ fontSize: 10.5, color: tech.color, fontWeight: 800, background: `${tech.color}15`, padding: '2px 6px', borderRadius: 3 }}>
                                  {tech.tag}
                                </span>
                              </div>
                              <div style={{ fontSize: 11.5, color: '#cbd5e1', marginTop: 4 }}>{tech.note}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )
                )}

                {/* SLIDE 6: Commodities (Gold & Silver Channels) */}
                {activeSlide.id === 6 && (
                  variantIndex === 1 ? (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                      {/* Left: Gold / Silver Ratio */}
                      <div style={{ background: '#070a12', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: 6, padding: 14 }}>
                        <div style={{ fontSize: 13.5, fontWeight: 800, color: '#fbbf24', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                          <Coins size={15} />
                          <span>ALTIN / GÜMÜŞ RASYOSU (GOLD/SILVER RATIO: {fmt(goldSilverRatio, 1)}x)</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          <div style={{ background: 'rgba(245, 158, 11, 0.08)', borderRadius: 6, padding: '10px 12px' }}>
                            <div style={{ fontWeight: 800, color: '#fff', fontSize: 14 }}>Gümüşte Sanayi ve Fotovoltaik Patlaması</div>
                            <div style={{ fontSize: 12, color: '#e2e8f0', marginTop: 3, lineHeight: 1.4 }}>Güneş paneli ve elektrikli araç üretimi gümüş talebini tarihin en yüksek seviyesine çıkardı.</div>
                          </div>
                          <div style={{ background: 'rgba(56, 189, 248, 0.08)', borderRadius: 6, padding: '10px 12px' }}>
                            <div style={{ fontWeight: 800, color: '#fff', fontSize: 14 }}>Arz Açığı: Üst Üste 4. Yıl Açık Veriliyor</div>
                            <div style={{ fontSize: 12, color: '#e2e8f0', marginTop: 3, lineHeight: 1.4 }}>Maden üretimi yeni sanayi talebine yetişemiyor; yer üstü stokları hızla eriyor.</div>
                          </div>
                          <div style={{ background: 'rgba(16, 185, 129, 0.08)', borderRadius: 6, padding: '10px 12px' }}>
                            <div style={{ fontWeight: 800, color: '#34d399', fontSize: 14 }}>Rasyoda Normalleşme Potansiyeli</div>
                            <div style={{ fontSize: 12, color: '#e2e8f0', marginTop: 3, lineHeight: 1.4 }}>Rasyonun 65x seviyelerine çekilmesi durumunda gümüşün altına göre daha yüksek prim yapması bekleniyor.</div>
                          </div>
                        </div>
                      </div>

                      {/* Right: Commodity Supercycle & Strategic Metals */}
                      <div style={{ background: '#070a12', border: '1px solid var(--border)', borderRadius: 6, padding: 14 }}>
                        <div style={{ fontSize: 13.5, fontWeight: 800, color: '#e2e8f0', marginBottom: 10 }}>
                          🏛️ EMTİA SÜPER DÖNGÜSÜ & STRATEJİK METALLER
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 6, padding: '10px 12px' }}>
                            <div style={{ fontWeight: 800, color: '#fbbf24', fontSize: 13.5 }}>Bakır (Dr. Copper): $9.800 / Ton Desteği</div>
                            <div style={{ fontSize: 12, color: '#cbd5e1', marginTop: 3, lineHeight: 1.4 }}>Yapay zeka veri merkezleri ve şebeke modernizasyonu küresel bakır talebini diri tutuyor.</div>
                          </div>
                          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 6, padding: '10px 12px' }}>
                            <div style={{ fontWeight: 800, color: '#38bdf8', fontSize: 13.5 }}>Platin & Paladyum: Katalizör & Hidrojen</div>
                            <div style={{ fontSize: 12, color: '#cbd5e1', marginTop: 3, lineHeight: 1.4 }}>Hibrit araç satışlarının artması paladyum talebini desteklerken arz kısıtları devrede.</div>
                          </div>
                          <div style={{ background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: 6, padding: '9px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <div style={{ fontSize: 13.5, fontWeight: 800, color: '#34d399' }}>Kapalıçarşı Gram Altın</div>
                              <div style={{ fontSize: 11.5, color: '#cbd5e1' }}>Ons ({fmt(gold.price, 0)}$) × USDTRY ({fmt(currentUsdTry, 2)}₺)</div>
                            </div>
                            <div style={{ fontSize: 20, fontWeight: 900, color: '#fff', fontFamily: 'var(--font-mono)' }}>
                              {fmt(gramAltinTL, 0)} ₺
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : variantIndex === 2 ? (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                      {/* Left: Real Yields vs Gold Decoupling */}
                      <div style={{ background: '#070a12', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: 6, padding: 14 }}>
                        <div style={{ fontSize: 13.5, fontWeight: 800, color: '#fbbf24', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                          <Coins size={15} />
                          <span>ALTIN vs REEL FAİZ AYRIŞMASI (YENİ PARADİGMA)</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          <div style={{ background: 'rgba(245, 158, 11, 0.08)', borderRadius: 6, padding: '10px 12px' }}>
                            <div style={{ fontWeight: 800, color: '#fff', fontSize: 14 }}>Tarihsel Kural Yıkıldı</div>
                            <div style={{ fontSize: 12, color: '#e2e8f0', marginTop: 3, lineHeight: 1.4 }}>ABD 10Y Reel Getirisi (TIPS) %1.85 gibi yüksek seviyedeyken normalde düşmesi gereken altın rekor kırıyor.</div>
                          </div>
                          <div style={{ background: 'rgba(56, 189, 248, 0.08)', borderRadius: 6, padding: '10px 12px' }}>
                            <div style={{ fontWeight: 800, color: '#fff', fontSize: 14 }}>Rezerv Güvenliği Kalkanı</div>
                            <div style={{ fontSize: 12, color: '#e2e8f0', marginTop: 3, lineHeight: 1.4 }}>Yaptırım riskleri karşısında merkez bankaları Batı devlet tahvillerini satıp fiziki altına dönüştürüyor.</div>
                          </div>
                          <div style={{ background: 'rgba(16, 185, 129, 0.08)', borderRadius: 6, padding: '10px 12px' }}>
                            <div style={{ fontWeight: 800, color: '#34d399', fontSize: 14 }}>Rezervlerde Dolar Payı Geriliyor</div>
                            <div style={{ fontSize: 12, color: '#e2e8f0', marginTop: 3, lineHeight: 1.4 }}>Küresel rezervlerde dolar payı %71'den %58'e inerken altın payı %18 seviyesine tırmandı.</div>
                          </div>
                        </div>
                      </div>

                      {/* Right: BRICS Gold Accumulation */}
                      <div style={{ background: '#070a12', border: '1px solid var(--border)', borderRadius: 6, padding: 14 }}>
                        <div style={{ fontSize: 13.5, fontWeight: 800, color: '#e2e8f0', marginBottom: 10 }}>
                          🏛️ BRICS FİZİKİ ALTIN AKIŞI & ŞANGHAY PRİMİ
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 6, padding: '10px 12px' }}>
                            <div style={{ fontWeight: 800, color: '#fbbf24', fontSize: 13.5 }}>Şanghay Altın Borsası (SGE) Primi</div>
                            <div style={{ fontSize: 12, color: '#cbd5e1', marginTop: 3, lineHeight: 1.4 }}>Londra ve New York fiyatlarına göre fiziki teslimatlı altın ons başına +$15 - $25 primli işlem görüyor.</div>
                          </div>
                          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 6, padding: '10px 12px' }}>
                            <div style={{ fontWeight: 800, color: '#38bdf8', fontSize: 13.5 }}>İkili Ticarette Altın Teminatı</div>
                            <div style={{ fontSize: 12, color: '#cbd5e1', marginTop: 3, lineHeight: 1.4 }}>Enerji ve hammadde takaslarında yerel paraların karşılığı fiziki altın depolarıyla garanti altına alınıyor.</div>
                          </div>
                          <div style={{ background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: 6, padding: '9px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <div style={{ fontSize: 13.5, fontWeight: 800, color: '#34d399' }}>Kapalıçarşı Gram Altın</div>
                              <div style={{ fontSize: 11.5, color: '#cbd5e1' }}>Ons ({fmt(gold.price, 0)}$) × USDTRY ({fmt(currentUsdTry, 2)}₺)</div>
                            </div>
                            <div style={{ fontSize: 20, fontWeight: 900, color: '#fff', fontFamily: 'var(--font-mono)' }}>
                              {fmt(gramAltinTL, 0)} ₺
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                      {/* Left: Gold Technical Channel */}
                      <div style={{ background: '#070a12', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: 6, padding: 14 }}>
                        <div style={{ fontSize: 13.5, fontWeight: 800, color: '#fbbf24', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                          <Coins size={15} />
                          <span>ONS ALTIN FİYAT KANALI & SEVİYE HARİTASI</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          <div style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: 6, padding: '10px 12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontWeight: 800, color: '#fff', fontSize: 14 }}>${fmt(goldResLow, 0)} - ${fmt(goldResHigh, 0)} Seviyesi</span>
                              <span style={{ fontSize: 11, color: '#f87171', fontWeight: 800, background: 'rgba(239,68,68,0.2)', padding: '2px 7px', borderRadius: 4 }}>DİRENÇ BÖLGESİ</span>
                            </div>
                            <div style={{ fontSize: 12, color: '#e2e8f0', marginTop: 3, lineHeight: 1.4 }}>Kâr realizasyonlarının geldiği kısa vadeli psikolojik tavan.</div>
                          </div>

                          <div style={{ background: 'rgba(56, 189, 248, 0.08)', border: '1px solid rgba(56, 189, 248, 0.2)', borderRadius: 6, padding: '10px 12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontWeight: 800, color: '#fff', fontSize: 14 }}>${fmt(gold.price, 0)} Anlık Denge Seviyesi</span>
                              <span style={{ fontSize: 11, color: '#38bdf8', fontWeight: 800, background: 'rgba(56,189,248,0.2)', padding: '2px 7px', borderRadius: 4 }}>CANLI FİYAT</span>
                            </div>
                            <div style={{ fontSize: 12, color: '#e2e8f0', marginTop: 3, lineHeight: 1.4 }}>İlk tepki ve dengelenme koridoru (Gümüş: ${fmt(silver.price, 2)}).</div>
                          </div>

                          <div style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: 6, padding: '10px 12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontWeight: 800, color: '#34d399', fontSize: 14 }}>${fmt(goldSupport, 0)} Kurumsal Destek Tabanı</span>
                              <span style={{ fontSize: 11, color: '#34d399', fontWeight: 800, background: 'rgba(16,185,129,0.2)', padding: '2px 7px', borderRadius: 4 }}>GÜÇLÜ TABAN</span>
                            </div>
                            <div style={{ fontSize: 12, color: '#e2e8f0', marginTop: 3, lineHeight: 1.4 }}>Merkez bankalarının ve kurumsal fonların fiziki alım yaptığı ana destek tabanı.</div>
                          </div>
                        </div>
                      </div>

                      {/* Right: 2 Giant Pillars */}
                      <div style={{ background: '#070a12', border: '1px solid var(--border)', borderRadius: 6, padding: 14 }}>
                        <div style={{ fontSize: 13.5, fontWeight: 800, color: '#e2e8f0', marginBottom: 10 }}>
                          🏛️ ALTINI AYAKTA TUTAN 2 BÜYÜK MOTOR
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, padding: '10px 12px' }}>
                            <div style={{ fontWeight: 800, color: '#fbbf24', fontSize: 14 }}>1. Merkez Bankaları Fiziki Rezerv Talebi</div>
                            <div style={{ fontSize: 12, color: '#e2e8f0', marginTop: 3, lineHeight: 1.45 }}>Çin (PBoC), Hindistan ve küresel merkez bankaları rezervlerini dolardan bağımsız kılmak için fiyata bakmaksızın fiziki altın topluyor.</div>
                          </div>

                          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, padding: '10px 12px' }}>
                            <div style={{ fontWeight: 800, color: '#38bdf8', fontSize: 14 }}>2. Küresel Jeopolitik & Portföy Sigortası Primi</div>
                            <div style={{ fontSize: 12, color: '#e2e8f0', marginTop: 3, lineHeight: 1.45 }}>Bölgesel gerilimler, ticaret koridoru belirsizlikleri ve küresel borç dinamikleri karşısında akıllı kurumsal sermaye güvenli liman olarak fiziki altın ve gümüşe sığınıyor.</div>
                          </div>

                          <div style={{ background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: 6, padding: '9px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <div style={{ fontSize: 13.5, fontWeight: 800, color: '#34d399' }}>Kapalıçarşı Gram Altın</div>
                              <div style={{ fontSize: 11.5, color: '#cbd5e1' }}>Ons ({fmt(gold.price, 0)}$) × USDTRY ({fmt(currentUsdTry, 2)}₺)</div>
                            </div>
                            <div style={{ fontSize: 20, fontWeight: 900, color: '#fff', fontFamily: 'var(--font-mono)' }}>
                              {fmt(gramAltinTL, 0)} ₺
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                )}

                {/* SLIDE 7: Dollar & Yield Curve Normalization */}
                {activeSlide.id === 7 && (
                  variantIndex === 1 ? (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                      {/* Left: DXY Basket Currencies */}
                      <div style={{ background: '#070a12', border: '1px solid rgba(56, 189, 248, 0.3)', borderRadius: 6, padding: 14 }}>
                        <div style={{ fontSize: 13.5, fontWeight: 800, color: '#38bdf8', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                          <DollarSign size={15} />
                          <span>DXY DOLAR SEPETİ DAĞILIMI & PARİTELER</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 6, padding: '10px 12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span style={{ fontWeight: 800, color: '#fff', fontSize: 13.5 }}>Euro (EUR/USD Sepet Ağırlığı)</span>
                              <span style={{ color: '#38bdf8', fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: 13.5 }}>%57.6 Pay</span>
                            </div>
                            <div style={{ fontSize: 12, color: '#cbd5e1', marginTop: 3, lineHeight: 1.4 }}>Avrupa sanayi yavaşlaması ve ECB indirimleri pariteyi baskılıyor.</div>
                          </div>
                          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 6, padding: '10px 12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span style={{ fontWeight: 800, color: '#fff', fontSize: 13.5 }}>Japon Yeni (USD/JPY Sepet Ağırlığı)</span>
                              <span style={{ color: '#fbbf24', fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: 13.5 }}>%13.6 Pay</span>
                            </div>
                            <div style={{ fontSize: 12, color: '#cbd5e1', marginTop: 3, lineHeight: 1.4 }}>BoJ faiz artışı sinyalleri Carry Trade çözülme hassasiyetini diri tutuyor.</div>
                          </div>
                          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 6, padding: '10px 12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span style={{ fontWeight: 800, color: '#fff', fontSize: 13.5 }}>DXY Endeks Mukavemeti</span>
                              <span style={{ color: 'var(--cyan)', fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: 14 }}>{fmt(dxy.price, 3)}</span>
                            </div>
                            <div style={{ fontSize: 12, color: '#cbd5e1', marginTop: 3, lineHeight: 1.4 }}>Küresel likidite ve majör parite sepetinde doların ağırlığını yansıtıyor.</div>
                          </div>
                        </div>
                      </div>

                      {/* Right: Turkish Lira & Carry Trade */}
                      <div style={{ background: '#070a12', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: 6, padding: 14 }}>
                        <div style={{ fontSize: 13.5, fontWeight: 800, color: '#34d399', marginBottom: 12 }}>
                          🇹🇷 TÜRK LİRASI & CARRY TRADE VERİMİ
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          <div style={{ background: 'rgba(16, 185, 129, 0.08)', borderRadius: 6, padding: '10px 12px' }}>
                            <div style={{ fontWeight: 800, color: '#fff', fontSize: 13.5 }}>Net TL Carry Trade Üstünlüğü</div>
                            <div style={{ fontSize: 12, color: '#e2e8f0', marginTop: 3, lineHeight: 1.4 }}>%{quotes?.tcmbRate ?? 36} politika faizi ve kontrollü kur oynaklığı TL'yi gelişmekte olan piyasalar arasında 1 numara yapıyor.</div>
                          </div>
                          <div style={{ background: 'rgba(56, 189, 248, 0.08)', borderRadius: 6, padding: '10px 12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span style={{ fontWeight: 800, color: '#fff', fontSize: 13.5 }}>USD / TRY Kontrollü Patika</span>
                              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, color: '#34d399', fontSize: 14 }}>{fmt(currentUsdTry, 2)} ₺</span>
                            </div>
                            <div style={{ fontSize: 12, color: '#cbd5e1', marginTop: 3, lineHeight: 1.4 }}>Aylık kur artışının enflasyonun altında kalması yerli ve yabancı yatırımcıyı TL'de tutuyor.</div>
                          </div>
                          <div style={{ background: 'rgba(245, 158, 11, 0.08)', borderRadius: 6, padding: '10px 12px' }}>
                            <div style={{ fontWeight: 800, color: '#fff', fontSize: 13.5 }}>Yıllık Bileşik TL Mevduat Getirisi</div>
                            <div style={{ fontSize: 12, color: '#e2e8f0', marginTop: 3, lineHeight: 1.4 }}>%45 - %48 aralığındaki risksiz getiri dolar talebini tamamen dizginliyor.</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : variantIndex === 2 ? (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                      {/* Left: US Debt & Treasury Auctions */}
                      <div style={{ background: '#070a12', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 6, padding: 14 }}>
                        <div style={{ fontSize: 13.5, fontWeight: 800, color: '#f87171', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                          <Activity size={15} />
                          <span>ABD HAZİNE İHALELERİ & BORÇLANMA TEMPOSU</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          <div style={{ background: 'rgba(239, 68, 68, 0.08)', borderRadius: 6, padding: '10px 12px' }}>
                            <div style={{ fontWeight: 800, color: '#fff', fontSize: 13.5 }}>35 Trilyon Dolar Kamu Borcu</div>
                            <div style={{ fontSize: 12, color: '#e2e8f0', marginTop: 3, lineHeight: 1.4 }}>Yıllık 1 Trilyon Doları aşan faiz ödemeleri ABD bütçesinde yapısal açık oluşturuyor.</div>
                          </div>
                          <div style={{ background: 'rgba(56, 189, 248, 0.08)', borderRadius: 6, padding: '10px 12px' }}>
                            <div style={{ fontWeight: 800, color: '#fff', fontSize: 13.5 }}>Birincil Bayi Talep Oranı (2.52x)</div>
                            <div style={{ fontSize: 12, color: '#e2e8f0', marginTop: 3, lineHeight: 1.4 }}>10 yıllık tahvil ihalelerinde yabancı merkez bankaları ve kurumsal fonların talebi sağlıklı.</div>
                          </div>
                          <div style={{ background: 'rgba(245, 158, 11, 0.08)', borderRadius: 6, padding: '10px 12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span style={{ fontWeight: 800, color: '#fff', fontSize: 13.5 }}>ABD 10 Yıllık Tahvil Faizi</span>
                              <span style={{ color: '#fbbf24', fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: 14 }}>%{fmt(us10y.price, 2)}</span>
                            </div>
                            <div style={{ fontSize: 12, color: '#cbd5e1', marginTop: 3, lineHeight: 1.4 }}>Faizlerin %4 civarında kalması hisse senedi çarpanlarına sınır koyuyor.</div>
                          </div>
                        </div>
                      </div>

                      {/* Right: Turkey Eurobond & CDS */}
                      <div style={{ background: '#070a12', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: 6, padding: 14 }}>
                        <div style={{ fontSize: 13.5, fontWeight: 800, color: '#34d399', marginBottom: 12 }}>
                          🇹🇷 TÜRKİYE EUROBOND & 216 BP CDS
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          <div style={{ background: 'rgba(16, 185, 129, 0.08)', borderRadius: 6, padding: '10px 12px' }}>
                            <div style={{ fontWeight: 800, color: '#fff', fontSize: 13.5 }}>5 Yıllık CDS: 216 Baz Puan</div>
                            <div style={{ fontSize: 12, color: '#e2e8f0', marginTop: 3, lineHeight: 1.4 }}>Son 4 yılın en olumlu risk algısı; Hazine ve bankaların borçlanma maliyeti hızla düşüyor.</div>
                          </div>
                          <div style={{ background: 'rgba(56, 189, 248, 0.08)', borderRadius: 6, padding: '10px 12px' }}>
                            <div style={{ fontWeight: 800, color: '#fff', fontSize: 13.5 }}>Hazine Eurobond İhraçları</div>
                            <div style={{ fontSize: 12, color: '#e2e8f0', marginTop: 3, lineHeight: 1.4 }}>10 yıllık dolar cinsi tahvil faizi %6.80 bandında istikrar kazandı; talep katlanarak artıyor.</div>
                          </div>
                          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 6, padding: '10px 12px' }}>
                            <div style={{ fontWeight: 800, color: '#fff', fontSize: 13.5 }}>Kredi Notu Artış Beklentisi</div>
                            <div style={{ fontSize: 12, color: '#cbd5e1', marginTop: 3, lineHeight: 1.4 }}>Uluslararası derecelendirme kuruluşlarının pozitif görünümü sermaye girişini tetikliyor.</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                      {/* Left: Yield Curve Normalization */}
                      <div style={{ background: '#070a12', border: '1px solid rgba(56, 189, 248, 0.3)', borderRadius: 6, padding: 14 }}>
                        <div style={{ fontSize: 13.5, fontWeight: 800, color: '#38bdf8', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                          <Activity size={15} />
                          <span>ABD GETİRİ EĞRİSİ (YIELD CURVE) NORMALLEŞMESİ</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                          <div style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.25)', borderRadius: 6, padding: '12px 14px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontSize: 14, fontWeight: 800, color: '#34d399' }}>2Y / 10Y Eğri Farkı: {yieldSpreadStr}</span>
                              <span style={{ fontSize: 11, color: '#34d399', fontWeight: 800, background: 'rgba(16,185,129,0.2)', padding: '2px 7px', borderRadius: 4 }}>{yieldSpreadBp >= 0 ? 'POZİTİF BÖLGEDE' : 'TERS EĞRİ'}</span>
                            </div>
                            <div style={{ fontSize: 12.5, color: '#e2e8f0', marginTop: 4, lineHeight: 1.45 }}>
                              2 yıllık faiz (%{fmt(us2y.price, 2)}) ile 10 yıllık faiz (%{fmt(us10y.price, 2)}) arasındaki makas {yieldSpreadStr} seviyesinde işlem görüyor.
                            </div>
                          </div>

                          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 6, padding: '10px 12px' }}>
                            <div style={{ fontSize: 13.5, fontWeight: 700, color: '#fff' }}>Piyasa Ne Anlatıyor?</div>
                            <div style={{ fontSize: 12, color: '#cbd5e1', marginTop: 3, lineHeight: 1.45 }}>
                              Aylardır süren resesyon korkusu gündemden kalktı; piyasa artık sert bir durgunluğu değil, Fed sonrası faizlerin nerede dengeleneceğini fiyatlıyor.
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Right: Currency Dynamics */}
                      <div style={{ background: '#070a12', border: '1px solid var(--border)', borderRadius: 6, padding: 14 }}>
                        <div style={{ fontSize: 13.5, fontWeight: 800, color: '#e2e8f0', marginBottom: 12 }}>
                          💵 DÖVİZ VE LİKİDİTE DENGESİ
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 6, padding: '10px 12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span style={{ fontWeight: 800, color: '#fff', fontSize: 13.5 }}>DXY Dolar Endeksi</span>
                              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, color: 'var(--cyan)', fontSize: 14 }}>{fmt(dxy.price, 3)}</span>
                            </div>
                            <div style={{ fontSize: 12, color: '#cbd5e1', marginTop: 3, lineHeight: 1.4 }}>Küresel likidite endeksi {fmt(dxy.price, 2)} seviyesinde majör paritelere yön veriyor.</div>
                          </div>

                          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 6, padding: '10px 12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span style={{ fontWeight: 800, color: '#fff', fontSize: 13.5 }}>USD / TRY Kontrollü Seyir</span>
                              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, color: '#34d399', fontSize: 14 }}>{fmt(currentUsdTry, 2)} ₺</span>
                            </div>
                            <div style={{ fontSize: 12, color: '#cbd5e1', marginTop: 3, lineHeight: 1.4 }}>TCMB rezervleri ve yüzde {fmt(quotes?.tcmbRate ?? 36, 2)}'lik politika faizi sayesinde kur dengeli seyrediyor.</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                )}

                {/* SLIDE 8: Crypto & Spot ETF */}
                {activeSlide.id === 8 && (
                  variantIndex === 1 ? (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                      {/* Left: BTC Dominance & Altcoins */}
                      <div style={{ background: '#070a12', border: '1px solid rgba(139, 92, 246, 0.3)', borderRadius: 6, padding: 14 }}>
                        <div style={{ fontSize: 13.5, fontWeight: 800, color: '#a78bfa', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                          <Coins size={15} />
                          <span>BTC DOMINANCE (%58.8) & SERMAYE DÖNGÜSÜ</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          <div style={{ background: 'rgba(139, 92, 246, 0.08)', borderRadius: 6, padding: '10px 12px' }}>
                            <div style={{ fontWeight: 800, color: '#fff', fontSize: 13.5 }}>Bitcoin Hakimiyeti (%58.8) Tepe Bölgesinde</div>
                            <div style={{ fontSize: 12, color: '#e2e8f0', marginTop: 3, lineHeight: 1.4 }}>Kurumsal para öncelikle Bitcoin'e girdi; tarihsel döngülerde BTC konsolide olmadan altcoin rallisi başlamaz.</div>
                          </div>
                          <div style={{ background: 'rgba(56, 189, 248, 0.08)', borderRadius: 6, padding: '10px 12px' }}>
                            <div style={{ fontWeight: 800, color: '#fff', fontSize: 13.5 }}>Ethereum / Bitcoin (ETH/BTC: {ethBtcRatio}) Paritesi</div>
                            <div style={{ fontSize: 12, color: '#e2e8f0', marginTop: 3, lineHeight: 1.4 }}>ETH (${fmt(eth.price, 0)}) / BTC (${fmt(btc.price, 0)}) paritesi; kurumsal staking getirisi ve L2 ekosistemi taban arıyor.</div>
                          </div>
                          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 6, padding: '10px 12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span style={{ fontWeight: 800, color: '#fff', fontSize: 13.5 }}>TOTAL3 Altcoin Hacmi</span>
                              <span style={{ color: '#a78bfa', fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: 14 }}>${fmt(total3.price, 1)}B</span>
                            </div>
                            <div style={{ fontSize: 12, color: '#cbd5e1', marginTop: 3, lineHeight: 1.4 }}>Seçici Layer-1 ve yapay zeka projelerinde kurumsal akümülasyon sürüyor.</div>
                          </div>
                        </div>
                      </div>

                      {/* Right: Thematic Crypto Sectors */}
                      <div style={{ background: '#070a12', border: '1px solid var(--border)', borderRadius: 6, padding: 14 }}>
                        <div style={{ fontSize: 13.5, fontWeight: 800, color: '#e2e8f0', marginBottom: 12 }}>
                          🚀 TEMATİK KRİPTO EKOSİSTEMİ & LİDERLERİ
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          <div style={{ background: 'rgba(16, 185, 129, 0.08)', borderRadius: 6, padding: '10px 12px', borderLeft: '3px solid #10b981' }}>
                            <div style={{ fontWeight: 800, color: '#fff', fontSize: 13.5 }}>Yapay Zeka & DePIN (Near, Render, Bittensor)</div>
                            <div style={{ fontSize: 12, color: '#e2e8f0', marginTop: 2, lineHeight: 1.4 }}>Dağıtık GPU işlem gücü ve veri madenciliği sağlayan gerçek kullanım odaklı ağlar.</div>
                          </div>
                          <div style={{ background: 'rgba(56, 189, 248, 0.08)', borderRadius: 6, padding: '10px 12px', borderLeft: '3px solid #38bdf8' }}>
                            <div style={{ fontWeight: 800, color: '#fff', fontSize: 13.5 }}>Gerçek Dünya Varlıkları (RWA - ONDO, BUIDL)</div>
                            <div style={{ fontSize: 12, color: '#e2e8f0', marginTop: 2, lineHeight: 1.4 }}>BlackRock ve Wall Street'in ABD Hazine tahvillerini blokzincir üzerine taşıma hamlesi.</div>
                          </div>
                          <div style={{ background: 'rgba(245, 158, 11, 0.08)', borderRadius: 6, padding: '10px 12px', borderLeft: '3px solid #f59e0b' }}>
                            <div style={{ fontWeight: 800, color: '#fff', fontSize: 13.5 }}>Yüksek Hızlı Katman-1 (Solana, Sui, Aptos)</div>
                            <div style={{ fontSize: 12, color: '#e2e8f0', marginTop: 2, lineHeight: 1.4 }}>Düşük işlem maliyeti ve saniyede binlerce transfer kapasitesiyle perakende liderliği.</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : variantIndex === 2 ? (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                      {/* Left: Exchange Reserves & Miners */}
                      <div style={{ background: '#070a12', border: '1px solid rgba(139, 92, 246, 0.3)', borderRadius: 6, padding: 14 }}>
                        <div style={{ fontSize: 13.5, fontWeight: 800, color: '#a78bfa', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                          <Activity size={15} />
                          <span>BORSALARDAKİ BTC REZERVLERİ (TARİHİ DİP)</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          <div style={{ background: 'rgba(139, 92, 246, 0.08)', borderRadius: 6, padding: '10px 12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span style={{ fontWeight: 800, color: '#fff', fontSize: 13.5 }}>Borsa Rezervi: 2.1M BTC</span>
                              <span style={{ color: '#a78bfa', fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: 13.5 }}>6 Yılın Dibi</span>
                            </div>
                            <div style={{ fontSize: 12, color: '#e2e8f0', marginTop: 3, lineHeight: 1.4 }}>Borsalardan soğuk cüzdanlara çekilen coinler arz şoku zeminini hazırlıyor.</div>
                          </div>
                          <div style={{ background: 'rgba(16, 185, 129, 0.08)', borderRadius: 6, padding: '10px 12px' }}>
                            <div style={{ fontWeight: 800, color: '#fff', fontSize: 13.5 }}>Uzun Vadeli Yatırımcı (LTH) Payı: %74</div>
                            <div style={{ fontSize: 12, color: '#e2e8f0', marginTop: 3, lineHeight: 1.4 }}>Dolaşımdaki arzın dörtte üçü 6 aydan uzun süredir el değiştirmeyerek kilitli duruyor.</div>
                          </div>
                          <div style={{ background: 'rgba(245, 158, 11, 0.08)', borderRadius: 6, padding: '10px 12px' }}>
                            <div style={{ fontWeight: 800, color: '#fff', fontSize: 13.5 }}>Madenci Maliyet Tabanı: $64.000</div>
                            <div style={{ fontSize: 12, color: '#e2e8f0', marginTop: 3, lineHeight: 1.4 }}>Halving sonrası ortalama elektrik maliyeti madencilerin bu seviye altında satışını engelliyor.</div>
                          </div>
                        </div>
                      </div>

                      {/* Right: Macro & Regulatory Catalysts */}
                      <div style={{ background: '#070a12', border: '1px solid var(--border)', borderRadius: 6, padding: 14 }}>
                        <div style={{ fontSize: 13.5, fontWeight: 800, color: '#e2e8f0', marginBottom: 12 }}>
                          🎯 DÜZENLEME & KURUMSAL BİRİKİM RADARI
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 6, padding: '10px 12px' }}>
                            <div style={{ fontWeight: 800, color: '#fff', fontSize: 13.5 }}>ABD Kripto Mevzuatı & SEC Netleşmesi</div>
                            <div style={{ fontSize: 12, color: '#cbd5e1', marginTop: 3, lineHeight: 1.4 }}>Hukuki çerçevenin berraklaşması emeklilik fonları ve sigorta devlerini cesaretlendiriyor.</div>
                          </div>
                          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 6, padding: '10px 12px' }}>
                            <div style={{ fontWeight: 800, color: '#fff', fontSize: 13.5 }}>Kurumsal Şirket Hazine Stratejileri</div>
                            <div style={{ fontSize: 12, color: '#cbd5e1', marginTop: 3, lineHeight: 1.4 }}>MicroStrategy ve benzeri şirketler hisse ve borçlanma yoluyla kesintisiz BTC topluyor.</div>
                          </div>
                          <div style={{ background: 'rgba(16, 185, 129, 0.08)', borderRadius: 6, padding: '10px 12px' }}>
                            <div style={{ fontWeight: 800, color: '#34d399', fontSize: 13.5 }}>Kritik Koridor: ${fmt(btcSupport, 0)} Destek / ${fmt(btcTarget, 0)} Hedef</div>
                            <div style={{ fontSize: 12, color: '#e2e8f0', marginTop: 3, lineHeight: 1.4 }}>${fmt(btcBreakout, 0)} üzerinde haftalık kapanış psikolojik hedef kapısını aralar.</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                      {/* Left: ETF Flows */}
                      <div style={{ background: '#070a12', border: '1px solid rgba(139, 92, 246, 0.3)', borderRadius: 6, padding: 14 }}>
                        <div style={{ fontSize: 13.5, fontWeight: 800, color: '#a78bfa', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                          <Coins size={15} />
                          <span>KURUMSAL SPOT ETF & PİYASA DERİNLİĞİ</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                          <div style={{ background: 'rgba(139, 92, 246, 0.08)', border: '1px solid rgba(139, 92, 246, 0.25)', borderRadius: 6, padding: '12px 14px' }}>
                            <div style={{ fontSize: 13, color: '#e2e8f0', fontWeight: 700 }}>Bitcoin Canlı Fiyat & ETH/BTC Rasyosu</div>
                            <div style={{ fontSize: 24, fontWeight: 900, color: '#a78bfa', fontFamily: 'var(--font-mono)', marginTop: 3 }}>${fmt(btc.price, 0)} <span style={{ fontSize: 13.5, color: '#38bdf8' }}>(ETH/BTC: {ethBtcRatio})</span></div>
                            <div style={{ fontSize: 12, color: '#cbd5e1', marginTop: 3, lineHeight: 1.4 }}>BlackRock (IBIT) ve Fidelity spot fonları üzerinden kurumsal likidite takibi sürüyor.</div>
                          </div>

                          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 6, padding: '10px 12px' }}>
                            <div style={{ fontSize: 13.5, fontWeight: 700, color: '#fff' }}>TOTAL3 Altcoin Hacmi: ${fmt(total3.price, 1)}B</div>
                            <div style={{ fontSize: 12, color: '#cbd5e1', marginTop: 3, lineHeight: 1.4 }}>Sermaye seçici olarak Layer-1 ve yapay zeka projelerinde toplanıyor.</div>
                          </div>
                        </div>
                      </div>

                      {/* Right: Bitcoin Levels Radar */}
                      <div style={{ background: '#070a12', border: '1px solid var(--border)', borderRadius: 6, padding: 14 }}>
                        <div style={{ fontSize: 13.5, fontWeight: 800, color: '#e2e8f0', marginBottom: 12 }}>
                          🎯 BİTCOİN SEVİYE RADARI & YOL HARİTASI
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          <div style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.25)', borderRadius: 6, padding: '10px 12px' }}>
                            <div style={{ fontWeight: 800, color: '#34d399', fontSize: 13.5 }}>${fmt(btcSupport, 0)} Taban Desteği</div>
                            <div style={{ fontSize: 12, color: '#e2e8f0', marginTop: 2, lineHeight: 1.4 }}>Kurumsal maliyetlenme ve ETF alımlarının koruduğu ana destek tabanı.</div>
                          </div>

                          <div style={{ background: 'rgba(56, 189, 248, 0.08)', border: '1px solid rgba(56, 189, 248, 0.25)', borderRadius: 6, padding: '10px 12px' }}>
                            <div style={{ fontWeight: 800, color: '#38bdf8', fontSize: 13.5 }}>${fmt(btcBreakout, 0)} Ara Kırılım Direnci</div>
                            <div style={{ fontSize: 12, color: '#e2e8f0', marginTop: 2, lineHeight: 1.4 }}>Hacimli geçilmesi halinde kısa vadeli satış baskısı tamamen kalkar.</div>
                          </div>

                          <div style={{ background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.25)', borderRadius: 6, padding: '10px 12px' }}>
                            <div style={{ fontWeight: 800, color: '#fbbf24', fontSize: 13.5 }}>${fmt(btcTarget, 0)} Psikolojik Hedef</div>
                            <div style={{ fontSize: 12, color: '#e2e8f0', marginTop: 2, lineHeight: 1.4 }}>${fmt(btcBreakout, 0)} üzerinde kalıcılık sağlandığında doğrudan aralanacak hedef kapısı.</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                )}

                {/* SLIDE 9: BIST 100 & Sectors */}
                {activeSlide.id === 9 && (
                  variantIndex === 1 ? (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                      {/* Left: Foreign Share & CDS */}
                      <div style={{ background: '#070a12', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: 6, padding: 14 }}>
                        <div style={{ fontSize: 13.5, fontWeight: 800, color: '#34d399', marginBottom: 12 }}>
                          📈 YABANCI TAKAS ORANI (%38.6) & SERMAYE GİRİŞİ
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          <div style={{ background: 'rgba(16, 185, 129, 0.08)', borderRadius: 6, padding: '10px 12px' }}>
                            <div style={{ fontWeight: 800, color: '#fff', fontSize: 13.5 }}>Yabancı Takas Payı: %38.6</div>
                            <div style={{ fontSize: 12, color: '#e2e8f0', marginTop: 3, lineHeight: 1.4 }}>2023 dip seviyesi olan %27'ye kıyasla istikrarlı kurumsal giriş gerçekleşti.</div>
                          </div>
                          <div style={{ background: 'rgba(56, 189, 248, 0.08)', borderRadius: 6, padding: '10px 12px' }}>
                            <div style={{ fontWeight: 800, color: '#fff', fontSize: 13.5 }}>216 bp CDS ile Azalan Sermaye Maliyeti</div>
                            <div style={{ fontSize: 12, color: '#e2e8f0', marginTop: 3, lineHeight: 1.4 }}>Düşen ülke riski Türk şirketlerinin yurt dışı borçlanma faizini aşağı çekti.</div>
                          </div>
                          <div style={{ background: 'rgba(245, 158, 11, 0.08)', borderRadius: 6, padding: '10px 12px' }}>
                            <div style={{ fontWeight: 800, color: '#fff', fontSize: 13.5 }}>Girişler BIST 30 Lokomotiflerinde Yoğun</div>
                            <div style={{ fontSize: 12, color: '#e2e8f0', marginTop: 3, lineHeight: 1.4 }}>Yabancı fonlar spekülatif tahtalara değil, derinliği olan büyük hisselere giriyor.</div>
                          </div>
                        </div>
                      </div>

                      {/* Right: Valuation & Discount Advantage */}
                      <div style={{ background: '#070a12', border: '1px solid var(--border)', borderRadius: 6, padding: 14 }}>
                        <div style={{ fontSize: 13.5, fontWeight: 800, color: '#e2e8f0', marginBottom: 12 }}>
                          💎 BIST 100 DEĞERLEME & ÇARPAN AVANTAJI
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 6, padding: '10px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <div style={{ fontSize: 13.5, fontWeight: 800, color: '#fff' }}>BIST 100 İleri F/K Çarpanı</div>
                              <div style={{ fontSize: 11.5, color: '#cbd5e1', marginTop: 2 }}>Gelişmekte olan ülkeler (GOÜ) ortalaması 13.2x</div>
                            </div>
                            <span style={{ fontSize: 16, fontWeight: 900, color: '#34d399', fontFamily: 'var(--font-mono)' }}>7.4x (%44 İskonto)</span>
                          </div>
                          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 6, padding: '10px 12px' }}>
                            <div style={{ fontWeight: 800, color: '#fff', fontSize: 13.5 }}>Dolar Bazlı Endeks (${fmt(bistUsd, 1)} Seviyesi)</div>
                            <div style={{ fontSize: 12, color: '#e2e8f0', marginTop: 3, lineHeight: 1.4 }}>Dolar bazında ${fmt(bistUsd, 1)} seviyesinde dengelenme; tarihsel zirvelere kıyasla iskontolu çarpan yapısı.</div>
                          </div>
                          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 6, padding: '10px 12px' }}>
                            <div style={{ fontWeight: 800, color: '#fff', fontSize: 13.5 }}>Yüksek Nakit Temettü Verimi</div>
                            <div style={{ fontSize: 12, color: '#cbd5e1', marginTop: 3, lineHeight: 1.4 }}>Kâr dağıtan sanayi ve holding şirketleri enflasyona karşı güçlü kalkan sunuyor.</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : variantIndex === 2 ? (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                      {/* Left: TMS 29 Inflation Accounting */}
                      <div style={{ background: '#070a12', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: 6, padding: 14 }}>
                        <div style={{ fontSize: 13.5, fontWeight: 800, color: '#fbbf24', marginBottom: 12 }}>
                          📑 ENFLASYON MUHASEBESİ (TMS 29) & AYRIŞMA
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          <div style={{ background: 'rgba(245, 158, 11, 0.08)', borderRadius: 6, padding: '10px 12px' }}>
                            <div style={{ fontWeight: 800, color: '#fff', fontSize: 13.5 }}>Finans Sektörü Muafiyeti</div>
                            <div style={{ fontSize: 12, color: '#e2e8f0', marginTop: 3, lineHeight: 1.4 }}>Bankalar ve sigortalar TMS 29 dışında kalarak net kâr berraklığını ve cazibesini koruyor.</div>
                          </div>
                          <div style={{ background: 'rgba(56, 189, 248, 0.08)', borderRadius: 6, padding: '10px 12px' }}>
                            <div style={{ fontWeight: 800, color: '#fff', fontSize: 13.5 }}>Duran Varlık Yoğun Şirketler</div>
                            <div style={{ fontSize: 12, color: '#e2e8f0', marginTop: 3, lineHeight: 1.4 }}>Özsermayesi ve gayrimenkul/makine parkı güçlü şirketler bilançolarını tahkim ediyor.</div>
                          </div>
                          <div style={{ background: 'rgba(239, 68, 68, 0.08)', borderRadius: 6, padding: '10px 12px' }}>
                            <div style={{ fontWeight: 800, color: '#fff', fontSize: 13.5 }}>Serbest Nakit Akışı Takibi Şart</div>
                            <div style={{ fontSize: 12, color: '#e2e8f0', marginTop: 3, lineHeight: 1.4 }}>Muhasebesel kâr yerine şirketin kasasına fiilen giren operasyonel nakit izlenmeli.</div>
                          </div>
                        </div>
                      </div>

                      {/* Right: Index Drivers & Heavyweights */}
                      <div style={{ background: '#070a12', border: '1px solid var(--border)', borderRadius: 6, padding: 14 }}>
                        <div style={{ fontSize: 13.5, fontWeight: 800, color: '#e2e8f0', marginBottom: 12 }}>
                          🏢 BIST 100 ENDEKS AĞIRLIKLARI & LOKOMOTİFLER
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 6, padding: '10px 12px' }}>
                            <div style={{ fontWeight: 800, color: '#fff', fontSize: 13.5 }}>Endeks Taşıyıcıları (Big 5)</div>
                            <div style={{ fontSize: 12, color: '#e2e8f0', marginTop: 3, lineHeight: 1.4 }}>THYAO, TUPRS, KCHOL, BIMAS ve AKBNK endeksin toplam ağırlığının %40'tan fazlasını sürüklüyor.</div>
                          </div>
                          <div style={{ background: 'rgba(16, 185, 129, 0.08)', borderRadius: 6, padding: '10px 12px' }}>
                            <div style={{ fontWeight: 800, color: '#34d399', fontSize: 13.5 }}>{fmt(bistSupport, 0)} Kurumsal Taban Desteği</div>
                            <div style={{ fontSize: 12, color: '#e2e8f0', marginTop: 3, lineHeight: 1.4 }}>Kurumsal fonların ve emeklilik şirketlerinin alım iştahının koruduğu ana zemin.</div>
                          </div>
                          <div style={{ background: 'rgba(56, 189, 248, 0.08)', borderRadius: 6, padding: '10px 12px' }}>
                            <div style={{ fontWeight: 800, color: '#38bdf8', fontSize: 13.5 }}>{fmt(bistResistance, 0)} ve {fmt(bistTarget, 0)} Hedef Koridoru</div>
                            <div style={{ fontSize: 12, color: '#e2e8f0', marginTop: 3, lineHeight: 1.4 }}>Hacimli kırılımlarla hedeflenen bilanço rallisi koridoru.</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                      {/* Left: Sectors */}
                      <div style={{ background: '#070a12', border: '1px solid var(--border)', borderRadius: 6, padding: 14 }}>
                        <div style={{ fontSize: 13.5, fontWeight: 800, color: '#e2e8f0', marginBottom: 12 }}>
                          🏢 BIST SEKTÖREL GÜÇ & AYRIŞMA
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          <div style={{ background: 'rgba(56, 189, 248, 0.08)', borderRadius: 6, padding: '10px 12px', borderLeft: '3px solid #38bdf8' }}>
                            <div style={{ fontWeight: 800, color: '#fff', fontSize: 13.5 }}>BIST Banka (XBANK)</div>
                            <div style={{ fontSize: 12, color: '#cbd5e1', marginTop: 2, lineHeight: 1.4 }}>Güçlü sermaye yeterlilik rasyoları ve enflasyon muhasebesi muafiyetiyle tabanı sırtlıyor.</div>
                          </div>

                          <div style={{ background: 'rgba(16, 185, 129, 0.08)', borderRadius: 6, padding: '10px 12px', borderLeft: '3px solid #10b981' }}>
                            <div style={{ fontWeight: 800, color: '#fff', fontSize: 13.5 }}>BIST Sanayi (XUSIN)</div>
                            <div style={{ fontSize: 12, color: '#cbd5e1', marginTop: 2, lineHeight: 1.4 }}>Döviz pozisyonu artıda olan ihracatçı şirketlerde seçici toparlanma emareleri.</div>
                          </div>

                          <div style={{ background: 'rgba(245, 158, 11, 0.08)', borderRadius: 6, padding: '10px 12px', borderLeft: '3px solid #f59e0b' }}>
                            <div style={{ fontWeight: 800, color: '#fff', fontSize: 13.5 }}>BIST Holding (XHOLD)</div>
                            <div style={{ fontSize: 12, color: '#cbd5e1', marginTop: 2, lineHeight: 1.4 }}>Net aktif değer iskonto kapanışı kurumsal yatırımcıların ilgisini çekiyor.</div>
                          </div>
                        </div>
                      </div>

                      {/* Right: Technical Levels Compass */}
                      <div style={{ background: '#070a12', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: 6, padding: 14 }}>
                        <div style={{ fontSize: 13.5, fontWeight: 800, color: '#34d399', marginBottom: 12 }}>
                          🧭 BIST 100 TEKNİK SEVİYE PUSULASI
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          <div style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.25)', borderRadius: 6, padding: '10px 12px' }}>
                            <div style={{ fontWeight: 800, color: '#34d399', fontSize: 14 }}>{fmt(bistSupport, 0)} Destek Tabanı</div>
                            <div style={{ fontSize: 12, color: '#e2e8f0', marginTop: 3, lineHeight: 1.4 }}>Kurumsal talebin ve yabancı girişlerinin yoğunlaştığı kritik ana destek bölgesi.</div>
                          </div>

                          <div style={{ background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.25)', borderRadius: 6, padding: '10px 12px' }}>
                            <div style={{ fontWeight: 800, color: '#fbbf24', fontSize: 14 }}>{fmt(bistResistance, 0)} Ara Tepki Direnci</div>
                            <div style={{ fontSize: 12, color: '#e2e8f0', marginTop: 3, lineHeight: 1.4 }}>İlk rahatlama ve momentum kazanma eşiği.</div>
                          </div>

                          <div style={{ background: 'rgba(56, 189, 248, 0.08)', border: '1px solid rgba(56, 189, 248, 0.25)', borderRadius: 6, padding: '10px 12px' }}>
                            <div style={{ fontWeight: 800, color: '#38bdf8', fontSize: 14 }}>{fmt(bistTarget, 0)} Hedef Koridoru</div>
                            <div style={{ fontSize: 12, color: '#e2e8f0', marginTop: 3, lineHeight: 1.4 }}>Bilanço beklentileri ve yabancı sermaye akışıyla hedeflenen ana bölge.</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                )}

                {/* SLIDE 10: Strategy, Cash & 48h Calendar */}
                {activeSlide.id === 10 && (
                  variantIndex === 1 ? (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                      {/* Left: Pyramid Portfolio Model */}
                      <div style={{ background: '#070a12', border: '1px solid rgba(56, 189, 248, 0.3)', borderRadius: 6, padding: 14 }}>
                        <div style={{ fontSize: 13.5, fontWeight: 800, color: '#38bdf8', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                          <PieChart size={15} />
                          <span>ÖRNEK KURUMSAL VARLIK DAĞILIMI (GENEL STRATEJİ)</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          <div style={{ background: 'rgba(56, 189, 248, 0.08)', borderRadius: 6, padding: '9px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 800, color: '#fff' }}>%40 Hisse Senedi (BIST 30 & Wall St)</div>
                              <div style={{ fontSize: 11.5, color: '#cbd5e1', marginTop: 1 }}>Enflasyon üzeri büyüyen teknoloji ve temettü liderleri</div>
                            </div>
                            <span style={{ fontSize: 13.5, fontWeight: 900, color: '#38bdf8' }}>Büyüme</span>
                          </div>
                          <div style={{ background: 'rgba(16, 185, 129, 0.08)', borderRadius: 6, padding: '9px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 800, color: '#fff' }}>%25 TL Para Piyasası Fonu & Mevduat</div>
                              <div style={{ fontSize: 11.5, color: '#cbd5e1', marginTop: 1 }}>Düşüşlerde kurşun ve risksiz %45+ bileşik getiri</div>
                            </div>
                            <span style={{ fontSize: 13.5, fontWeight: 900, color: '#34d399' }}>Nakit</span>
                          </div>
                          <div style={{ background: 'rgba(245, 158, 11, 0.08)', borderRadius: 6, padding: '9px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 800, color: '#fff' }}>%20 Fiziki Altın & Gümüş</div>
                              <div style={{ fontSize: 11.5, color: '#cbd5e1', marginTop: 1 }}>Jeopolitik krizler ve küresel borç şoklarına sigorta</div>
                            </div>
                            <span style={{ fontSize: 13.5, fontWeight: 900, color: '#fbbf24' }}>Sigorta</span>
                          </div>
                          <div style={{ background: 'rgba(139, 92, 246, 0.08)', borderRadius: 6, padding: '9px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 800, color: '#fff' }}>%15 Kripto & Asimetrik Varlıklar</div>
                              <div style={{ fontSize: 11.5, color: '#cbd5e1', marginTop: 1 }}>Bitcoin ve seçici Layer-1 projeleri ile yüksek alfa</div>
                            </div>
                            <span style={{ fontSize: 13.5, fontWeight: 900, color: '#a78bfa' }}>Alfa</span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Portfolio Discipline Rules */}
                      <div style={{ background: '#070a12', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: 6, padding: 14 }}>
                        <div style={{ fontSize: 13.5, fontWeight: 800, color: '#34d399', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                          <Compass size={15} />
                          <span>GENEL YATIRIMCI VE PORTFÖY YÖNETİM KURALLARI</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          <div style={{ background: 'rgba(16, 185, 129, 0.08)', borderRadius: 6, padding: '10px 12px' }}>
                            <div style={{ fontWeight: 800, color: '#fff', fontSize: 13.5 }}>1. Kademeli Maliyetlenme Disiplini</div>
                            <div style={{ fontSize: 12, color: '#e2e8f0', marginTop: 3, lineHeight: 1.4 }}>Tek tuşla tüm sermayeyi bağlamayın; piyasa düzeltmelerine en az 3 eşit parça ayırın.</div>
                          </div>
                          <div style={{ background: 'rgba(56, 189, 248, 0.08)', borderRadius: 6, padding: '10px 12px' }}>
                            <div style={{ fontWeight: 800, color: '#fff', fontSize: 13.5 }}>2. Kâr Realizasyonu Alışkanlığı</div>
                            <div style={{ fontSize: 12, color: '#e2e8f0', marginTop: 3, lineHeight: 1.4 }}>Direnç hedeflerine ulaşıldığında kârın en az %20'sini nakde veya altına çekmeyi unutmayın.</div>
                          </div>
                          <div style={{ background: 'rgba(245, 158, 11, 0.08)', borderRadius: 6, padding: '10px 12px' }}>
                            <div style={{ fontWeight: 800, color: '#fff', fontSize: 13.5 }}>3. Gerçek Çeşitlendirme (Korelasyon)</div>
                            <div style={{ fontSize: 12, color: '#e2e8f0', marginTop: 3, lineHeight: 1.4 }}>Birbiriyle aynı yönde hareket eden 10 hisse almak riskinizi dağıtmaz, riski yoğunlaştırır.</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : variantIndex === 2 ? (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                      {/* Left: 3-Tier Risk Matrix */}
                      <div style={{ background: '#070a12', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: 6, padding: 14 }}>
                        <div style={{ fontSize: 13.5, fontWeight: 800, color: '#fbbf24', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                          <Activity size={15} />
                          <span>3 KADEMELİ PİYASA VOLATİLİTE VE RİSK MATRİSİ</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          <div style={{ background: 'rgba(16, 185, 129, 0.08)', borderRadius: 6, padding: '10px 12px', borderLeft: '3px solid #10b981' }}>
                            <div style={{ fontWeight: 800, color: '#fff', fontSize: 13.5 }}>🟢 Sakin Dönem (VIX &lt; 15)</div>
                            <div style={{ fontSize: 12, color: '#e2e8f0', marginTop: 3, lineHeight: 1.4 }}>Risk iştahı güçlü; hisse ve teknoloji payını %50 üzerine çıkarın, trendin tadını çıkarın.</div>
                          </div>
                          <div style={{ background: 'rgba(245, 158, 11, 0.08)', borderRadius: 6, padding: '10px 12px', borderLeft: '3px solid #f59e0b' }}>
                            <div style={{ fontWeight: 800, color: '#fff', fontSize: 13.5 }}>🟡 Dalgalı Dönem (VIX 15 - 22)</div>
                            <div style={{ fontSize: 12, color: '#e2e8f0', marginTop: 3, lineHeight: 1.4 }}>Uyarı bölgesi; nakit oranını %25-30 seviyesine yükseltin, kaldıraçlı işlemden kesinlikle kaçının.</div>
                          </div>
                          <div style={{ background: 'rgba(239, 68, 68, 0.08)', borderRadius: 6, padding: '10px 12px', borderLeft: '3px solid #ef4444' }}>
                            <div style={{ fontWeight: 800, color: '#fff', fontSize: 13.5 }}>🔴 Panik / Kriz Dönemi (VIX &gt; 22)</div>
                            <div style={{ fontSize: 12, color: '#e2e8f0', marginTop: 3, lineHeight: 1.4 }}>Panikle satış yapma zamanı değil; likit nakit tamponuyla kurumsal taban seviyelerini toplama zamanı.</div>
                          </div>
                        </div>
                      </div>

                      {/* Right: Investor Philosophy */}
                      <div style={{ background: '#070a12', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: 6, padding: 14 }}>
                        <div style={{ fontSize: 13.5, fontWeight: 800, color: '#34d399', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                          <Compass size={15} />
                          <span>YATIRIMCI FELSEFESİ</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 6, padding: '10px 12px' }}>
                            <div style={{ fontWeight: 800, color: '#fff', fontSize: 13.5 }}>"Fiyat gürültüdür; bilanço ve serbest nakit akışı gerçektir."</div>
                            <div style={{ fontSize: 12, color: '#cbd5e1', marginTop: 3, lineHeight: 1.4 }}>Günlük fiyat dalgalanmaları yatırım pusulanızı saptırmasın.</div>
                          </div>
                          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 6, padding: '10px 12px' }}>
                            <div style={{ fontWeight: 800, color: '#fff', fontSize: 13.5 }}>"Düşüşler servet transferinin gerçekleştiği anlardır."</div>
                            <div style={{ fontSize: 12, color: '#cbd5e1', marginTop: 3, lineHeight: 1.4 }}>Panikleyen zararına satar, hazırlıklı ve nakdi olan yatırımcı kurumsal tabandan toplar.</div>
                          </div>
                          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 6, padding: '10px 12px' }}>
                            <div style={{ fontWeight: 800, color: '#fff', fontSize: 13.5 }}>"Nakit her krizde ve döngüde kraldır."</div>
                            <div style={{ fontSize: 12, color: '#cbd5e1', marginTop: 3, lineHeight: 1.4 }}>Alım gücünüzü ve psikolojik rahatlığınızı sağlayan en güçlü savunma nakdinizdir.</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                      {/* Left: 48h Calendar Timeline */}
                      <div style={{ background: '#070a12', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: 6, padding: 14 }}>
                        <div style={{ fontSize: 13.5, fontWeight: 800, color: '#fbbf24', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                          <Calendar size={15} />
                          <span>KRİTİK MAKRO & BİLANÇO TAKVİMİ</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {[
                            { time: customAgenda?.fedRate?.meetingDate || 'Aralık FOMC', event: 'Fed FOMC Faiz Kararı & Basın Toplantısı', note: `${customAgenda?.fedRate?.dominant || 'Sabit/Pas'} (%${customAgenda?.fedRate?.prob ?? 76}) • Alternatif Risk (%${customAgenda?.fedRate?.pauseProb ?? 24})` },
                            { time: 'Bilanço Dönemi', event: 'Yapay Zeka & Yarı İletken Bilançoları (NVIDIA, Broadcom)', note: 'Veri Merkezi & AI Capex Rehberliği' },
                            { time: 'Her Ayın 3\'ü 10:00', event: 'TÜİK Resmi TÜFE Enflasyon Verisi', note: `Mevcut %${fmt(quotes?.turkeyCPI ?? 29.73, 2)} / Dezenflasyon Patikası` },
                            { time: '10 Aralık Perşembe', event: 'TCMB Para Politikası Kurulu Faiz Kararı', note: `Mevcut %${fmt(quotes?.tcmbRate ?? 36, 2)} / Sıkı Likidite Duruşu` },
                            { time: 'Haftalık Akış', event: 'ABD İşsizlik Maaşı Başvuruları & Küresel PMI Verileri', note: `ABD 10Y: %${fmt(us10y.price, 2)} • DXY: ${fmt(dxy.price, 2)}` }
                          ].map((cal, idx) => (
                            <div key={idx} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 6, padding: '9px 11px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                              <div>
                                <div style={{ fontSize: 11.5, color: 'var(--cyan)', fontWeight: 800 }}>{cal.time}</div>
                                <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginTop: 1 }}>{cal.event}</div>
                              </div>
                              <span style={{ fontSize: 11, color: '#e2e8f0', background: 'rgba(255,255,255,0.08)', padding: '3px 8px', borderRadius: 4, fontWeight: 600, whiteSpace: 'nowrap' }}>
                                {cal.note}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Right: Portfolio Principles */}
                      <div style={{ background: '#070a12', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: 6, padding: 14 }}>
                        <div style={{ fontSize: 13.5, fontWeight: 800, color: '#34d399', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                          <Compass size={15} />
                          <span>YATIRIMCI PUSULASI & TEMEL PRENSİPLER</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          <div style={{ background: 'rgba(16, 185, 129, 0.08)', borderRadius: 6, padding: '10px 12px' }}>
                            <div style={{ fontWeight: 800, color: '#fff', fontSize: 13.5 }}>1. Asla FOMO ile İşlem Yapmayın</div>
                            <div style={{ fontSize: 12, color: '#e2e8f0', marginTop: 3, lineHeight: 1.4 }}>Hızlı yükselen varlıkların peşinden koşmak yerine kurumsal destek seviyelerini bekleyin.</div>
                          </div>

                          <div style={{ background: 'rgba(56, 189, 248, 0.08)', borderRadius: 6, padding: '10px 12px' }}>
                            <div style={{ fontWeight: 800, color: '#fff', fontSize: 13.5 }}>2. %20 - %25 Likit Nakit Tamponunuzu Koruyun</div>
                            <div style={{ fontSize: 12, color: '#e2e8f0', marginTop: 3, lineHeight: 1.4 }}>Portföyde likit nakit bulundurmak piyasa geri çekilmelerini büyük fırsata çevirir.</div>
                          </div>

                          <div style={{ background: 'rgba(245, 158, 11, 0.08)', borderRadius: 6, padding: '10px 12px' }}>
                            <div style={{ fontWeight: 800, color: '#fff', fontSize: 13.5 }}>3. Endeks Tahmini Değil Şirket Seçimi</div>
                            <div style={{ fontSize: 12, color: '#e2e8f0', marginTop: 3, lineHeight: 1.4 }}>Kâr marjlarını ve nakit akışını enflasyonun üzerinde büyüten şirketler her dönem kazandırır.</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                )}
              </div>

              {/* 🔴 Toggleable TV Breaking-News Lower-Third Strip (Synced to OBS) */}
              {showBreakingTicker && activeTickerItem && (
                <div
                  style={{
                    marginTop: 8,
                    padding: '7px 14px',
                    borderRadius: 6,
                    background: 'linear-gradient(90deg, rgba(159, 18, 57, 0.35) 0%, rgba(15, 23, 42, 0.94) 30%, rgba(15, 23, 42, 0.96) 100%)',
                    border: '1px solid rgba(244, 63, 94, 0.38)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 10,
                    flexShrink: 0
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flex: 1 }}>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5,
                        background: '#e11d48',
                        color: '#ffffff',
                        fontSize: 9.5,
                        fontWeight: 900,
                        padding: '2px 7px',
                        borderRadius: 3,
                        letterSpacing: '0.05em',
                        flexShrink: 0
                      }}
                    >
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#ffffff' }} className="animate-pulse" />
                      <span>SON DAKİKA</span>
                    </span>
                    <span style={{ fontSize: 10, fontWeight: 800, color: '#cbd5e1', background: 'rgba(255,255,255,0.08)', padding: '2px 6px', borderRadius: 3, flexShrink: 0 }}>
                      {activeTickerItem.bucketLabel || (activeTickerItem.region === 'TR' ? '🇹🇷 BIST & TR' : '🇺🇸 GLOBAL')}
                    </span>
                    {Array.isArray(activeTickerItem.tickers) && activeTickerItem.tickers.length > 0 && (
                      <span style={{ fontSize: 10, fontWeight: 900, color: '#38bdf8', background: 'rgba(56, 189, 248, 0.16)', border: '1px solid rgba(56, 189, 248, 0.3)', padding: '1px 6px', borderRadius: 3, fontFamily: 'var(--font-mono)', flexShrink: 0 }}>
                        {activeTickerItem.tickers[0]}
                      </span>
                    )}
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 800,
                        color: '#f8fafc',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        flex: 1
                      }}
                      title={activeTickerItem.title}
                    >
                      {activeTickerItem.title}
                      {activeTickerItem.impactNote ? (
                        <span style={{ color: '#fda4af', fontWeight: 700 }}> — {activeTickerItem.impactNote}</span>
                      ) : null}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                    {activeTickerItem.source && (
                      <span style={{ fontSize: 10, color: '#94a3b8' }}>
                        {activeTickerItem.source} • {formatRelativeTimeTr(activeTickerItem.timeMs || activeTickerItem.pubDate)}
                      </span>
                    )}
                    {!isPopout && pinnedNews.length > 1 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <button
                          type="button"
                          onClick={() => setTickerCursor(prev => (prev - 1 + pinnedNews.length) % pinnedNews.length)}
                          style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: '#e2e8f0', borderRadius: 3, padding: '2px 4px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                          title="Önceki haber"
                        >
                          <ChevronLeft size={11} />
                        </button>
                        <span style={{ fontSize: 9.5, fontFamily: 'var(--font-mono)', color: '#cbd5e1', minWidth: 26, textAlign: 'center' }}>
                          {(tickerCursor % pinnedNews.length) + 1}/{pinnedNews.length}
                        </span>
                        <button
                          type="button"
                          onClick={() => setTickerCursor(prev => (prev + 1) % pinnedNews.length)}
                          style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: '#e2e8f0', borderRadius: 3, padding: '2px 4px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                          title="Sonraki haber"
                        >
                          <ChevronRight size={11} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Conditional Footer: Broadcast Watermark for OBS, Presenter Controls for Studio */}
              {isPopout ? (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 14, borderTop: '1px solid rgba(255, 255, 255, 0.06)', fontSize: 12, color: '#94a3b8' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#10b981' }} className="animate-pulse" />
                    <span>CANLI PİYASA AKIŞI • RESMİ KORİDORLAR VE GÖSTERGELER</span>
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#cbd5e1' }}>
                    HAKAN GENÇ FİNANS • OBS CANLI SLAYT (1080p)
                  </div>
                </div>
              ) : (
                <div 
                style={{ 
                  marginTop: 14, 
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
                    style={{ fontSize: 11.5, padding: '6px 12px', opacity: currentSlideIndex === 0 ? 0.4 : 1 }}
                  >
                    <ChevronLeft size={14} style={{ marginRight: 2 }} />
                    <span>Önceki Slayt</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => changeSlide(Math.min(slides.length - 1, currentSlideIndex + 1))}
                    disabled={currentSlideIndex === slides.length - 1}
                    className="chip-btn"
                    style={{ fontSize: 11.5, padding: '6px 12px', opacity: currentSlideIndex === slides.length - 1 ? 0.4 : 1 }}
                  >
                    <span>Sonraki Slayt</span>
                    <ChevronRight size={14} style={{ marginLeft: 2 }} />
                  </button>
                </div>

                <div style={{ fontSize: 11.5, color: '#cbd5e1' }}>
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
              Makrodan Mikroya 10 Slaytlık TV Brifingi • Doğrulanmış Canlı Veriler • Doğal Neden-Sonuç Metni
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

          {/* Direct 1-Click Live News Fetch Button */}
          <button
            type="button"
            onClick={applyLiveNewsDirectly}
            className="chip-btn"
            style={{ 
              fontSize: 10.5, 
              padding: '6px 12px', 
              display: 'flex', 
              alignItems: 'center', 
              gap: 5, 
              background: newsAppliedToast ? 'rgba(16, 185, 129, 0.25)' : 'linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(5, 150, 105, 0.25))',
              borderColor: newsAppliedToast ? '#10b981' : '#34d399', 
              color: '#34d399', 
              fontWeight: 800,
              boxShadow: '0 2px 8px rgba(16, 185, 129, 0.2)'
            }}
            title="Google Finans / BIST canlı haber akışındaki son manşetleri tüm slaytlara ve prompter'a tek tıkla aktarır"
          >
            {newsAppliedToast ? <Check size={13} /> : <Zap size={13} />}
            <span>{newsAppliedToast ? '✓ Canlı Haberler Çekildi!' : '⚡ Canlı Haberleri Çek'}</span>
          </button>

          {/* News Director Drawer Toggle Button */}
          <button
            type="button"
            onClick={() => setIsNewsDrawerOpen(prev => !prev)}
            className={`chip-btn ${isNewsDrawerOpen ? 'active' : ''}`}
            style={{ 
              fontSize: 10.5, 
              padding: '6px 12px', 
              display: 'flex', 
              alignItems: 'center', 
              gap: 5, 
              borderColor: isNewsDrawerOpen ? '#f43f5e' : '#fb7185', 
              color: isNewsDrawerOpen ? '#fff' : '#fda4af', 
              fontWeight: 800,
              background: isNewsDrawerOpen 
                ? 'linear-gradient(135deg, rgba(244, 63, 94, 0.45), rgba(225, 29, 72, 0.4))' 
                : 'linear-gradient(135deg, rgba(244, 63, 94, 0.14), rgba(190, 18, 60, 0.2))',
              boxShadow: isNewsDrawerOpen ? '0 0 12px rgba(244, 63, 94, 0.35)' : '0 2px 8px rgba(244, 63, 94, 0.15)'
            }}
            title="Slayt 2 ve Son Dakika Alt Bandı için BIST 30, siyaset ve ABD/Global haberlerini seçin veya özel başlık ekleyin."
          >
            <Newspaper size={13} />
            <span>📰 Haber Masası ({pinnedNews.length})</span>
          </button>

          {/* Toggleable Breaking News Ticker Strip Button */}
          <button
            type="button"
            onClick={toggleBreakingTicker}
            className="chip-btn"
            style={{ 
              fontSize: 10, 
              padding: '5px 10px', 
              display: 'flex', 
              alignItems: 'center', 
              gap: 4, 
              borderColor: showBreakingTicker ? '#f43f5e' : 'rgba(255,255,255,0.2)', 
              color: showBreakingTicker ? '#fda4af' : '#94a3b8', 
              fontWeight: 700,
              background: showBreakingTicker ? 'rgba(244, 63, 94, 0.12)' : 'rgba(0,0,0,0.25)'
            }}
            title="Slaytların altındaki Son Dakika haber şeridini yayında açıp kapatır (OBS ile senkron)"
          >
            {showBreakingTicker ? <Eye size={12} /> : <EyeOff size={12} />}
            <span>🔴 Alt Bant: {showBreakingTicker ? 'Açık' : 'Kapalı'}</span>
          </button>

          {/* Daily Agenda Editor Button */}
          <button
            type="button"
            onClick={() => setIsAgendaModalOpen(true)}
            className="chip-btn"
            style={{ 
              fontSize: 10.5, 
              padding: '6px 12px', 
              display: 'flex', 
              alignItems: 'center', 
              gap: 5, 
              borderColor: '#f59e0b', 
              color: '#fbbf24', 
              fontWeight: 800,
              background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.18), rgba(217, 119, 6, 0.25))',
              boxShadow: '0 2px 8px rgba(245, 158, 11, 0.2)'
            }}
            title="Günün 3 ana gündem maddesini canlı haberlerden otomatik çekin veya özel başlıklar girin."
          >
            <Sparkles size={13} />
            <span>🎙️ Gündemi Düzenle</span>
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

      {/* 🎙️ YAYIN DİLİ & TONU VE GÜNÜN YAYININI SIFIRDAN ÜRET ÇUBUĞU */}
      <div 
        style={{
          background: 'linear-gradient(90deg, rgba(30, 27, 75, 0.7) 0%, rgba(15, 23, 42, 0.85) 100%)',
          border: '1px solid rgba(139, 92, 246, 0.3)',
          borderRadius: 8,
          padding: '8px 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          flexWrap: 'wrap',
          boxShadow: '0 4px 18px rgba(0,0,0,0.35)'
        }}
      >
        {/* Left: 3-Way Tone Switcher */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11, fontWeight: 800, color: '#c4b5fd', display: 'flex', alignItems: 'center', gap: 5 }}>
            <Mic size={14} style={{ color: '#a78bfa' }} />
            <span>Yayın Dili / Tonu:</span>
          </span>
          <div style={{ display: 'inline-flex', background: 'rgba(0,0,0,0.5)', borderRadius: 6, padding: 2, border: '1px solid rgba(255,255,255,0.1)' }}>
            {[
              { id: 'analytical', label: '🎙️ Analitik / TV Dili', desc: 'Bloomberg & kurumsal finans dili, dengeli neden-sonuç akışı' },
              { id: 'youtube', label: '🚀 YouTube / Samimi & Enerjik', desc: 'Toplulukla konuşur gibi, dinamik ve akıcı YouTube temposu' },
              { id: 'defensive', label: '🛡️ Kriz & Defans Dili', desc: 'Risk kalkanı, nakit yönetimi ve savunma disiplini vurgusu' }
            ].map(t => {
              const isActive = broadcastTone === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => handleSelectTone(t.id)}
                  className={`chip-btn ${isActive ? 'active' : ''}`}
                  style={{
                    fontSize: 10,
                    padding: '4px 10px',
                    fontWeight: isActive ? 800 : 500,
                    background: isActive ? 'linear-gradient(135deg, rgba(139, 92, 246, 0.35), rgba(99, 102, 241, 0.35))' : 'transparent',
                    borderColor: isActive ? '#a78bfa' : 'transparent',
                    color: isActive ? '#f5f3ff' : '#94a3b8'
                  }}
                  title={t.desc}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Fresh Daily Broadcast Regeneration Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            type="button"
            onClick={handleGenerateFreshDailyBroadcast}
            disabled={isRefreshing}
            className="btn-primary"
            style={{
              fontSize: 11,
              padding: '7px 15px',
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              background: freshRegenerateToast 
                ? 'linear-gradient(135deg, #10b981, #059669)' 
                : 'linear-gradient(135deg, #8b5cf6, #ec4899)',
              borderColor: freshRegenerateToast ? '#10b981' : '#a855f7',
              color: '#ffffff',
              fontWeight: 800,
              boxShadow: freshRegenerateToast 
                ? '0 0 16px rgba(16, 185, 129, 0.5)' 
                : '0 4px 14px rgba(139, 92, 246, 0.4)',
              cursor: 'pointer',
              borderRadius: 6,
              transition: 'all 0.2s ease'
            }}
            title="Tüm eski önbellekleri temizler, bugünün canlı borsa fiyatlarını ve güncel haberlerini çekerek tüm 10 slaytın konuşma metnini canlı verilerle sıfırdan üretir."
          >
            {freshRegenerateToast ? <Check size={14} /> : <Zap size={14} className="animate-pulse" />}
            <span>{freshRegenerateToast ? '✓ Günün Yayını Sıfırdan Üretildi!' : '⚡ Günün Yayınını Canlı Verilerle Sıfırdan Üret'}</span>
          </button>
        </div>
      </div>

      {/* 📅 GÜNLÜK YAYIN EDİSYONU & TEMA ÇUBUĞU */}
      <div 
        style={{
          background: 'linear-gradient(90deg, rgba(15, 23, 42, 0.9) 0%, rgba(30, 41, 59, 0.75) 100%)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: 8,
          padding: '8px 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          flexWrap: 'wrap',
          boxShadow: '0 2px 10px rgba(0,0,0,0.25)'
        }}
      >
        {/* Left: Slot & Edition Key */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 7, 
              background: 'rgba(0,0,0,0.4)', 
              border: `1px solid ${activeTheme.accentColor}40`, 
              borderRadius: 6, 
              padding: '4px 10px' 
            }}
          >
            <Clock size={13} style={{ color: activeTheme.accentColor }} />
            <span style={{ fontSize: 11, fontWeight: 900, color: '#f8fafc' }}>
              {editionState.slotTitle}
            </span>
            <span 
              style={{ 
                fontSize: 9, 
                padding: '1px 6px', 
                borderRadius: 4, 
                background: `${activeTheme.accentColor}25`, 
                color: activeTheme.accentColor, 
                border: `1px solid ${activeTheme.accentColor}40`,
                fontFamily: 'var(--font-mono)',
                fontWeight: 800
              }}
            >
              {editionState.isAfter1600 ? '16:00 TSİ Sonrası (ABD & Kapanış)' : '16:00 Öncesi (Sabah/Öğle)'}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, color: '#94a3b8' }}>
            <span>Görsel Çizim Varyantı:</span>
            <span 
              style={{ 
                background: 'rgba(255,255,255,0.06)', 
                color: '#e2e8f0', 
                padding: '2px 8px', 
                borderRadius: 4, 
                fontFamily: 'var(--font-mono)', 
                fontWeight: 800,
                border: '1px solid rgba(255,255,255,0.1)'
              }}
            >
              #{variantIndex + 1} ({['Stratejik Odak', 'Altyapı & Çarpanlar', 'Derinlik & Ayrışma'][variantIndex]})
            </span>
          </div>
        </div>

        {/* Center / Right: Theme Selector Chips & Advance Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700 }}>Yayın Teması:</span>
          
          {/* Auto Chip */}
          <button
            type="button"
            onClick={() => handleSelectTheme('auto')}
            className={`chip-btn ${selectedThemeId === 'auto' ? 'active' : ''}`}
            style={{
              fontSize: 9.5,
              padding: '3px 8px',
              fontWeight: selectedThemeId === 'auto' ? 800 : 500,
              borderColor: selectedThemeId === 'auto' ? '#38bdf8' : 'rgba(255,255,255,0.1)',
              background: selectedThemeId === 'auto' ? 'rgba(56, 189, 248, 0.15)' : 'rgba(0,0,0,0.3)',
              color: selectedThemeId === 'auto' ? '#38bdf8' : '#cbd5e1'
            }}
            title="Her gün 16:00 döngüsüne ve gün sırasına göre temayı otomatik belirler"
          >
            <span>🤖 Otomatik Döngü</span>
          </button>

          {/* Individual Theme Chips */}
          {BROADCAST_THEMES.map(th => {
            const isSelected = selectedThemeId === th.id;
            return (
              <button
                key={th.id}
                type="button"
                onClick={() => handleSelectTheme(th.id)}
                className={`chip-btn ${isSelected ? 'active' : ''}`}
                style={{
                  fontSize: 9.5,
                  padding: '3px 8px',
                  fontWeight: isSelected ? 800 : 500,
                  borderColor: isSelected ? th.accentColor : 'rgba(255,255,255,0.08)',
                  background: isSelected ? `${th.accentColor}20` : 'rgba(0,0,0,0.3)',
                  color: isSelected ? '#ffffff' : '#94a3b8'
                }}
                title={th.desc}
              >
                <span>{th.icon} {th.title}</span>
              </button>
            );
          })}

          {/* Advance Edition Button */}
          <button
            type="button"
            onClick={handleAdvanceEdition}
            className="chip-btn"
            style={{
              fontSize: 9.5,
              padding: '3px 9px',
              fontWeight: 800,
              borderColor: '#f59e0b',
              background: 'rgba(245, 158, 11, 0.12)',
              color: '#fbbf24',
              display: 'flex',
              alignItems: 'center',
              gap: 4
            }}
            title="Bir sonraki görsel grafik varyantına ve güncellenmiş metne geç"
          >
            <Sparkles size={11} />
            <span>Farklı Edisyon Üret</span>
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

      {/* 📰 Broadcast News Director Drawer (Live BIST30, TR Macro, US Politics & Stock Shocks Manager) */}
      {isNewsDrawerOpen && !isFullscreen && (
        <div
          className="card"
          style={{
            padding: 16,
            background: 'linear-gradient(145deg, rgba(9, 13, 24, 0.98), rgba(15, 23, 42, 0.96))',
            border: '1px solid rgba(244, 63, 94, 0.38)',
            borderRadius: 10,
            boxShadow: '0 12px 32px rgba(0, 0, 0, 0.55)',
            display: 'flex',
            flexDirection: 'column',
            gap: 14
          }}
        >
          {/* Drawer Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, paddingBottom: 10, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 7, background: 'rgba(244, 63, 94, 0.16)', border: '1px solid rgba(244, 63, 94, 0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fb7185' }}>
                <Newspaper size={17} />
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 900, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span>CANLI HABER & KATALİZÖR YÖNETİM MASASI</span>
                  <span style={{ fontSize: 9.5, padding: '2px 7px', borderRadius: 4, background: 'rgba(56, 189, 248, 0.16)', color: '#7dd3fc', border: '1px solid rgba(56, 189, 248, 0.35)', fontWeight: 800 }}>
                    SLAYT 2 & SON DAKİKA ALT BANDI
                  </span>
                </div>
                <div style={{ fontSize: 10.5, color: '#94a3b8', marginTop: 2 }}>
                  BIST 30 bilançoları (örn. PGSUS), TR ekonomi/siyaset, ABD politikası ve NVDA/Big Tech şirket şoklarını tek tıkla yayına seçin veya özel manşet ekleyin.
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={handleApplyAutoBalancedNews}
                className="chip-btn"
                style={{ fontSize: 10, padding: '5px 10px', borderColor: '#f59e0b', color: '#fbbf24', background: 'rgba(245, 158, 11, 0.12)', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 5 }}
                title="En yüksek etkili 3 Türkiye + 3 ABD/Global haberi otomatik dengeli seçer"
              >
                <Sparkles size={12} />
                <span>✨ Otomatik Dengeli Seç (3 TR + 3 Global)</span>
              </button>

              <button
                type="button"
                onClick={() => refreshLiveNewsFeed(true)}
                disabled={isRefreshingNews}
                className="chip-btn"
                style={{ fontSize: 10, padding: '5px 10px', borderColor: '#34d399', color: '#34d399', background: 'rgba(16, 185, 129, 0.12)', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 5 }}
                title="Google News RSS akışından taze haberleri çeker"
              >
                <RefreshCw size={12} className={isRefreshingNews ? 'animate-spin' : ''} />
                <span>{isRefreshingNews ? 'Çekiliyor...' : '🔄 Taze RSS Çek'}</span>
              </button>

              <button
                type="button"
                onClick={() => changeSlide(1)}
                className="chip-btn"
                style={{ fontSize: 10, padding: '5px 10px', borderColor: '#38bdf8', color: '#38bdf8', background: 'rgba(56, 189, 248, 0.12)', fontWeight: 800 }}
              >
                📺 Slayt 2'yi Görüntüle
              </button>

              <button
                type="button"
                onClick={() => setIsNewsDrawerOpen(false)}
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: '#cbd5e1', borderRadius: 6, padding: '4px 7px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                title="Haber Masasını Kapat"
              >
                <X size={15} />
              </button>
            </div>
          </div>

          {/* Drawer Body: Left (Pinned + Custom Injector) | Right (Filterable RSS Pool) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.15fr)', gap: 14, alignItems: 'start' }}>
            {/* LEFT COLUMN: Pinned Headlines + Custom Breaking News Form */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* Pinned List */}
              <div style={{ background: '#070a12', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: 11.5, fontWeight: 800, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Pin size={13} style={{ color: '#fb7185' }} />
                    <span>YAYINA SEÇİLEN MANŞETLER ({pinnedNews.length}/8)</span>
                  </span>
                  <span style={{ fontSize: 9.5, color: '#94a3b8' }}>
                    İlk 3 TR + 3 Global Slayt 2'de görünür • Prompter otomatik güncellenir
                  </span>
                </div>

                {pinnedNews.length === 0 ? (
                  <div style={{ padding: '18px 12px', textAlign: 'center', fontSize: 11, color: '#94a3b8', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: 6 }}>
                    Henüz sabitlenmiş haber yok. Sağ taraftaki canlı havuzdan 📌 <b>Yayına Ekle</b> butonuna basın veya aşağıdan özel başlık girin.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 7, maxHeight: 300, overflowY: 'auto', paddingRight: 2 }}>
                    {(() => {
                      let trSeen = 0;
                      let globalSeen = 0;
                      return pinnedNews.map((n, idx) => {
                        const sm = getSentimentMeta(n.sentiment);
                        const isTR = n.region === 'TR';
                        const shownOnSlide2 = isTR ? trSeen < 3 : globalSeen < 3;
                        if (isTR) trSeen += 1;
                        else globalSeen += 1;
                        const isEditingThis = editingNoteId === n.id;

                        return (
                          <div
                            key={n.id || idx}
                            style={{
                              background: 'rgba(255,255,255,0.025)',
                              border: `1px solid ${sm.border}`,
                              borderLeft: `3px solid ${sm.color}`,
                              borderRadius: 6,
                              padding: '8px 10px',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: 5
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                                <span style={{ fontSize: 9, fontWeight: 900, color: shownOnSlide2 ? '#34d399' : '#94a3b8', background: shownOnSlide2 ? 'rgba(16, 185, 129, 0.14)' : 'rgba(255,255,255,0.06)', padding: '1px 5px', borderRadius: 3 }}>
                                  #{idx + 1} {shownOnSlide2 ? '• SLAYT 2' : '• ALT BANT'}
                                </span>
                                <span style={{ fontSize: 9.5, fontWeight: 700, color: '#cbd5e1' }}>
                                  {n.bucketLabel || (isTR ? '🇹🇷 TR' : '🇺🇸 Global')}
                                </span>
                                <span style={{ fontSize: 9, fontWeight: 800, color: sm.color, background: sm.bg, padding: '1px 5px', borderRadius: 3 }}>
                                  {sm.label}
                                </span>
                                {Array.isArray(n.tickers) && n.tickers.slice(0, 2).map(tk => (
                                  <span key={tk} style={{ fontSize: 9, fontWeight: 900, color: '#38bdf8', fontFamily: 'var(--font-mono)' }}>
                                    {tk}
                                  </span>
                                ))}
                              </div>

                              <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                                <button
                                  type="button"
                                  onClick={() => movePinnedItem(idx, -1)}
                                  disabled={idx === 0}
                                  style={{ background: 'rgba(255,255,255,0.06)', border: 'none', color: idx === 0 ? '#475569' : '#cbd5e1', borderRadius: 3, padding: '2px 5px', fontSize: 10, cursor: idx === 0 ? 'default' : 'pointer' }}
                                  title="Yukarı taşı"
                                >
                                  ↑
                                </button>
                                <button
                                  type="button"
                                  onClick={() => movePinnedItem(idx, 1)}
                                  disabled={idx === pinnedNews.length - 1}
                                  style={{ background: 'rgba(255,255,255,0.06)', border: 'none', color: idx === pinnedNews.length - 1 ? '#475569' : '#cbd5e1', borderRadius: 3, padding: '2px 5px', fontSize: 10, cursor: idx === pinnedNews.length - 1 ? 'default' : 'pointer' }}
                                  title="Aşağı taşı"
                                >
                                  ↓
                                </button>
                                <button
                                  type="button"
                                  onClick={() => togglePinNews(n)}
                                  style={{ background: 'rgba(239, 68, 68, 0.15)', border: 'none', color: '#f87171', borderRadius: 3, padding: '2px 5px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                                  title="Yayından kaldır"
                                >
                                  <Trash2 size={11} />
                                </button>
                              </div>
                            </div>

                            <div style={{ fontSize: 11.5, fontWeight: 700, color: '#ffffff', lineHeight: 1.35 }}>
                              {n.title}
                            </div>

                            {isEditingThis ? (
                              <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                                <input
                                  type="text"
                                  value={n.impactNote || ''}
                                  onChange={(e) => updatePinnedImpactNote(n.id, e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === 'Escape') setEditingNoteId(null);
                                  }}
                                  placeholder="Sunucu / piyasa etkisi notu yazın (Enter ile kaydet)..."
                                  autoFocus
                                  style={{ flex: 1, background: 'rgba(0,0,0,0.6)', border: '1px solid #38bdf8', color: '#f8fafc', fontSize: 10.5, padding: '4px 8px', borderRadius: 4 }}
                                />
                                <button
                                  type="button"
                                  onClick={() => setEditingNoteId(null)}
                                  style={{ background: '#0284c7', border: 'none', color: '#fff', fontSize: 10, fontWeight: 700, padding: '4px 8px', borderRadius: 4, cursor: 'pointer' }}
                                >
                                  Tamam
                                </button>
                              </div>
                            ) : (
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                                <span style={{ fontSize: 10, color: n.impactNote ? '#7dd3fc' : '#64748b', fontStyle: n.impactNote ? 'normal' : 'italic' }}>
                                  {n.impactNote ? `💬 Piyasa Etkisi: ${n.impactNote}` : 'Piyasa etkisi notu yok (isteğe bağlı)'}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setEditingNoteId(n.id)}
                                  style={{ background: 'rgba(56, 189, 248, 0.12)', border: '1px solid rgba(56, 189, 248, 0.25)', color: '#7dd3fc', fontSize: 9.5, fontWeight: 700, padding: '2px 7px', borderRadius: 4, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0 }}
                                >
                                  <Edit3 size={10} />
                                  <span>{n.impactNote ? 'Notu Düzenle' : '+ Etki Notu'}</span>
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      });
                    })()}
                  </div>
                )}
              </div>

              {/* Custom Breaking Headline Form */}
              <form
                onSubmit={handleAddCustomBreakingNews}
                style={{ background: '#070a12', border: '1px solid rgba(245, 158, 11, 0.28)', borderRadius: 8, padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}
              >
                <div style={{ fontSize: 11.5, fontWeight: 800, color: '#fbbf24', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Plus size={14} />
                  <span>ÖZEL SON DAKİKA / ŞİRKET ŞOKU / YORUM EKLE</span>
                </div>

                <input
                  type="text"
                  value={customNewsForm.title}
                  onChange={(e) => setCustomNewsForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Manşet (Örn: Pegasus beklenti üstü bilançoyla %6 yükseldi / NVDA haberi...)"
                  style={{ background: 'rgba(0,0,0,0.45)', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', fontSize: 11, fontWeight: 600, padding: '6px 9px', borderRadius: 5, width: '100%' }}
                />

                <input
                  type="text"
                  value={customNewsForm.impactNote}
                  onChange={(e) => setCustomNewsForm(prev => ({ ...prev, impactNote: e.target.value }))}
                  placeholder="Yayın Etkisi Notu *(opsiyonel)* — Örn: Kısa vadeli satış baskısı bilançoyu değiştirmiyor"
                  style={{ background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(255,255,255,0.08)', color: '#cbd5e1', fontSize: 10.5, padding: '5px 9px', borderRadius: 5, width: '100%' }}
                />

                <div style={{ display: 'grid', gridTemplateColumns: '1.15fr 0.9fr 0.85fr auto', gap: 6, alignItems: 'center' }}>
                  <select
                    value={customNewsForm.bucket}
                    onChange={(e) => setCustomNewsForm(prev => ({ ...prev, bucket: e.target.value }))}
                    style={{ background: '#0b1120', border: '1px solid rgba(255,255,255,0.12)', color: '#e2e8f0', fontSize: 10.5, padding: '5px 7px', borderRadius: 5 }}
                  >
                    <option value="bist30">🇹🇷 BIST 30 & Şirketler</option>
                    <option value="tr_macro">🏛️ TR Siyaset & Ekonomi</option>
                    <option value="us_politics">🇺🇸 ABD Politika & Makro</option>
                    <option value="global_stocks">💻 Global Hisse & AI</option>
                  </select>

                  <select
                    value={customNewsForm.sentiment}
                    onChange={(e) => setCustomNewsForm(prev => ({ ...prev, sentiment: e.target.value }))}
                    style={{ background: '#0b1120', border: '1px solid rgba(255,255,255,0.12)', color: '#e2e8f0', fontSize: 10.5, padding: '5px 7px', borderRadius: 5 }}
                  >
                    <option value="bull">▲ Pozitif Etki</option>
                    <option value="bear">▼ Satış Baskısı</option>
                    <option value="neutral">⚡ Nötr / İzleme</option>
                  </select>

                  <input
                    type="text"
                    value={customNewsForm.tickers}
                    onChange={(e) => setCustomNewsForm(prev => ({ ...prev, tickers: e.target.value }))}
                    placeholder="Kod (NVDA, PGSUS)"
                    style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', color: '#38bdf8', fontSize: 10.5, padding: '5px 7px', borderRadius: 5, fontFamily: 'var(--font-mono)' }}
                  />

                  <button
                    type="submit"
                    disabled={!customNewsForm.title.trim()}
                    style={{
                      padding: '6px 12px',
                      borderRadius: 5,
                      background: customNewsForm.title.trim() ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'rgba(255,255,255,0.08)',
                      border: 'none',
                      color: customNewsForm.title.trim() ? '#fff' : '#64748b',
                      fontSize: 10.5,
                      fontWeight: 800,
                      cursor: customNewsForm.title.trim() ? 'pointer' : 'not-allowed',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    + Yayına Al
                  </button>
                </div>
              </form>
            </div>

            {/* RIGHT COLUMN: Live Filterable & Searchable Google News RSS Pool */}
            <div style={{ background: '#070a12', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: 12, display: 'flex', flexDirection: 'column', gap: 9 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                <span style={{ fontSize: 11.5, fontWeight: 800, color: '#38bdf8', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Globe size={14} />
                  <span>CANLI HABER HAVUZU ({filteredNewsPool.length}/{liveNewsList.length})</span>
                </span>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center', flex: 1, maxWidth: 260 }}>
                  <Search size={12} style={{ position: 'absolute', left: 8, color: '#64748b', pointerEvents: 'none' }} />
                  <input
                    type="text"
                    value={newsSearchQuery}
                    onChange={(e) => setNewsSearchQuery(e.target.value)}
                    placeholder="Hisse (NVDA, PGSUS) veya konu ara..."
                    style={{ background: 'rgba(0,0,0,0.45)', border: '1px solid rgba(255,255,255,0.12)', color: '#f8fafc', fontSize: 10.5, padding: '4px 24px 4px 25px', borderRadius: 5, width: '100%' }}
                  />
                  {newsSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setNewsSearchQuery('')}
                      style={{ position: 'absolute', right: 6, background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex' }}
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
              </div>

              {/* Filter Pills */}
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                {[
                  { id: 'ALL', label: `Tümü (${liveNewsList.length})` },
                  { id: 'CRITICAL', label: '🔥 Kritik Etkili' },
                  { id: 'bist30', label: '🇹🇷 BIST 30 & Şirketler' },
                  { id: 'tr_macro', label: '🏛️ TR Siyaset & Ekonomi' },
                  { id: 'us_politics', label: '🇺🇸 ABD Politika & Fed' },
                  { id: 'global_stocks', label: '💻 Global Hisse & AI' }
                ].map(f => {
                  const isAct = newsBucketFilter === f.id;
                  return (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setNewsBucketFilter(f.id)}
                      style={{
                        fontSize: 10,
                        padding: '3px 8px',
                        borderRadius: 4,
                        background: isAct ? 'rgba(56, 189, 248, 0.22)' : 'rgba(255,255,255,0.04)',
                        border: `1px solid ${isAct ? '#38bdf8' : 'rgba(255,255,255,0.1)'}`,
                        color: isAct ? '#fff' : '#cbd5e1',
                        fontWeight: isAct ? 800 : 600,
                        cursor: 'pointer'
                      }}
                    >
                      {f.label}
                    </button>
                  );
                })}
              </div>

              {/* Scrollable RSS Pool */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 420, overflowY: 'auto', paddingRight: 3 }}>
                {filteredNewsPool.length === 0 ? (
                  <div style={{ padding: '28px 14px', textAlign: 'center', fontSize: 11, color: '#94a3b8', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: 6 }}>
                    {liveNewsList.length === 0
                      ? 'Canlı Google News RSS akışı yükleniyor veya ağ bekleniyor...'
                      : 'Seçili kategori veya aramayla eşleşen haber bulunamadı.'}
                  </div>
                ) : (
                  filteredNewsPool.map((n, idx) => {
                    const isPinned = pinnedNews.some(p => p.id === n.id || p.title === n.title);
                    const sm = getSentimentMeta(n.sentiment);
                    const isCritical = (n.impactScore || 0) >= 5.5 || n.impactLevel === 'KRİTİK';
                    return (
                      <div
                        key={n.id || idx}
                        style={{
                          background: isPinned ? 'rgba(16, 185, 129, 0.08)' : 'rgba(255,255,255,0.02)',
                          border: isPinned ? '1px solid rgba(16, 185, 129, 0.35)' : '1px solid rgba(255,255,255,0.07)',
                          borderRadius: 6,
                          padding: '8px 10px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: 10
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                            <span style={{ fontSize: 9.5, fontWeight: 700, color: '#cbd5e1', background: 'rgba(255,255,255,0.07)', padding: '1px 5px', borderRadius: 3 }}>
                              {n.bucketLabel || n.tag}
                            </span>
                            {isCritical && (
                              <span style={{ fontSize: 9, fontWeight: 900, color: '#fda4af', background: 'rgba(244, 63, 94, 0.18)', border: '1px solid rgba(244, 63, 94, 0.35)', padding: '1px 5px', borderRadius: 3 }}>
                                🔥 KRİTİK
                              </span>
                            )}
                            <span style={{ fontSize: 9, fontWeight: 800, color: sm.color, background: sm.bg, padding: '1px 5px', borderRadius: 3 }}>
                              {sm.label}
                            </span>
                            {Array.isArray(n.tickers) && n.tickers.slice(0, 3).map(tk => (
                              <span key={tk} style={{ fontSize: 9, fontWeight: 900, color: '#fbbf24', background: 'rgba(245, 158, 11, 0.15)', padding: '1px 5px', borderRadius: 3, fontFamily: 'var(--font-mono)' }}>
                                {tk}
                              </span>
                            ))}
                          </div>

                          <div style={{ fontSize: 11.5, fontWeight: 700, color: '#f8fafc', lineHeight: 1.35 }}>
                            {n.title}
                          </div>

                          <div style={{ fontSize: 9.5, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span>{n.source || 'Google Finans'}</span>
                            <span>•</span>
                            <span style={{ fontFamily: 'var(--font-mono)' }}>{formatRelativeTimeTr(n.timeMs || n.pubDate)}</span>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
                          {n.link && (
                            <a
                              href={n.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ padding: '5px', borderRadius: 4, background: 'rgba(255,255,255,0.05)', color: '#94a3b8', display: 'flex', alignItems: 'center' }}
                              title="Kaynağa git"
                            >
                              <ExternalLink size={12} />
                            </a>
                          )}
                          <button
                            type="button"
                            onClick={() => togglePinNews(n)}
                            style={{
                              padding: '5px 9px',
                              borderRadius: 5,
                              background: isPinned ? 'rgba(16, 185, 129, 0.2)' : 'rgba(244, 63, 94, 0.16)',
                              border: `1px solid ${isPinned ? '#10b981' : 'rgba(244, 63, 94, 0.45)'}`,
                              color: isPinned ? '#34d399' : '#fda4af',
                              fontSize: 10,
                              fontWeight: 800,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4,
                              whiteSpace: 'nowrap'
                            }}
                          >
                            {isPinned ? <Check size={11} /> : <Pin size={11} />}
                            <span>{isPinned ? 'Yayında' : 'Yayına Ekle'}</span>
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}

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
                <span className="nav-badge purple" style={{ fontSize: 8.5, padding: '1px 6px', background: 'rgba(139, 92, 246, 0.2)', border: '1px solid rgba(139, 92, 246, 0.4)', color: '#c4b5fd' }}>
                  {broadcastTone === 'analytical' ? '🎙️ ANALİTİK TV' : (broadcastTone === 'youtube' ? '🚀 YOUTUBE' : '🛡️ DEFANS & RİSK')}
                </span>
                <button
                  type="button"
                  onClick={() => setIsAgendaModalOpen(true)}
                  style={{
                    background: 'rgba(245, 158, 11, 0.15)',
                    border: '1px solid rgba(245, 158, 11, 0.35)',
                    color: '#fbbf24',
                    fontSize: 9,
                    padding: '2px 7px',
                    borderRadius: 4,
                    cursor: 'pointer',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 3
                  }}
                  title="Günün gündemini ve konuşma metnini düzenleyin"
                >
                  <Sparkles size={10} />
                  <span>Gündemi Düzenle</span>
                </button>
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

                {(customScripts[`${editionState.editionKey}_${broadcastTone}_${activeSlide.id}`] !== undefined || customScripts[`${editionState.editionKey}_${activeSlide.id}`] !== undefined || customScripts[activeSlide.id] !== undefined) && (
                  <button
                    type="button"
                    onClick={handleResetCurrentScript}
                    className="chip-btn"
                    style={{ fontSize: 9.5, padding: '3px 8px', color: 'var(--amber)' }}
                    title="Bu slaytın metnini bugünün orijinal AI metnine sıfırla"
                  >
                    <RotateCcw size={10} style={{ marginRight: 3 }} />
                    <span>Orijinale Dön</span>
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

      {/* 🌟 Daily Agenda & Live News Editor Modal */}
      {isAgendaModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16
          }}
          onClick={() => setIsAgendaModalOpen(false)}
        >
          <div
            style={{
              background: '#090d16',
              border: '1px solid rgba(245, 158, 11, 0.4)',
              borderRadius: 10,
              width: '100%',
              maxWidth: 720,
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: 22,
              boxShadow: '0 25px 60px rgba(0, 0, 0, 0.8)',
              display: 'flex',
              flexDirection: 'column',
              gap: 16
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 34, height: 34, borderRadius: 8, background: 'rgba(245, 158, 11, 0.15)', border: '1px solid rgba(245, 158, 11, 0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fbbf24' }}>
                  <Sparkles size={18} />
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 14, color: '#f8fafc' }}>
                    🎙️ Günün Gündemini Düzenle (Canlı Yayın & Prompter)
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                    Buraya girdiğiniz başlıklar tüm 10 slaytın canlı paneline ve prompter konuşma metnine anında işlenir.
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAgendaModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 4 }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Quick Actions Row */}
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.02)', padding: '10px 12px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ fontSize: 11, color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Radio size={14} style={{ color: '#10b981' }} />
                <span>Otomatik Canlı Haber Akışı: <b>{liveNewsList.length} Güncel Haber Hazır</b></span>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  onClick={handleAutoFillFromNews}
                  disabled={!liveNewsList || liveNewsList.length === 0}
                  style={{
                    fontSize: 10.5,
                    padding: '5px 12px',
                    borderRadius: 5,
                    background: 'linear-gradient(135deg, #10b981, #059669)',
                    border: 'none',
                    color: '#fff',
                    fontWeight: 700,
                    cursor: liveNewsList.length > 0 ? 'pointer' : 'not-allowed',
                    opacity: liveNewsList.length > 0 ? 1 : 0.5,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5
                  }}
                  title="Google News canlı haber akışındaki son manşetleri 3 gündem maddesine otomatik aktarır"
                >
                  <RefreshCw size={12} />
                  <span>⚡ Canlı Haberlerden Doldur</span>
                </button>
                <button
                  type="button"
                  onClick={handleResetAgenda}
                  style={{
                    fontSize: 10.5,
                    padding: '5px 10px',
                    borderRadius: 5,
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    color: '#cbd5e1',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                  title="Kurumsal standart makro temalara geri döner"
                >
                  Varsayılana Sıfırla
                </button>
              </div>
            </div>

            {/* 3 Topics Form */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* Topic 1 */}
              <div style={{ background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: 6, padding: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 800, color: '#fca5a5' }}>
                    💥 1. Gündem Maddesi (Makro / Likidite / Faiz)
                  </span>
                  <input
                    type="text"
                    value={agendaForm?.topic1?.tag || ''}
                    onChange={(e) => setAgendaForm({ ...agendaForm, topic1: { ...agendaForm.topic1, tag: e.target.value } })}
                    placeholder="Etiket (Örn: Makro & Faiz)"
                    style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5', fontSize: 9.5, padding: '2px 8px', borderRadius: 4, width: 140 }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <input
                    type="text"
                    value={agendaForm?.topic1?.title || ''}
                    onChange={(e) => setAgendaForm({ ...agendaForm, topic1: { ...agendaForm.topic1, title: e.target.value } })}
                    placeholder="Başlık"
                    style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: 11.5, fontWeight: 700, padding: '6px 10px', borderRadius: 5, width: '100%' }}
                  />
                  <textarea
                    rows={2}
                    value={agendaForm?.topic1?.desc || ''}
                    onChange={(e) => setAgendaForm({ ...agendaForm, topic1: { ...agendaForm.topic1, desc: e.target.value } })}
                    placeholder="Açıklama / Özet"
                    style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)', color: '#cbd5e1', fontSize: 10.5, padding: '6px 10px', borderRadius: 5, width: '100%', resize: 'vertical' }}
                  />
                </div>
              </div>

              {/* Topic 2 */}
              <div style={{ background: 'rgba(245, 158, 11, 0.05)', border: '1px solid rgba(245, 158, 11, 0.25)', borderRadius: 6, padding: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 800, color: '#fde047' }}>
                    ⚡ 2. Gündem Maddesi (Jeopolitik / Enerji / Koridor)
                  </span>
                  <input
                    type="text"
                    value={agendaForm?.topic2?.tag || ''}
                    onChange={(e) => setAgendaForm({ ...agendaForm, topic2: { ...agendaForm.topic2, tag: e.target.value } })}
                    placeholder="Etiket (Örn: Enerji & Jeopolitik)"
                    style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(245,158,11,0.3)', color: '#fde047', fontSize: 9.5, padding: '2px 8px', borderRadius: 4, width: 140 }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <input
                    type="text"
                    value={agendaForm?.topic2?.title || ''}
                    onChange={(e) => setAgendaForm({ ...agendaForm, topic2: { ...agendaForm.topic2, title: e.target.value } })}
                    placeholder="Başlık"
                    style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: 11.5, fontWeight: 700, padding: '6px 10px', borderRadius: 5, width: '100%' }}
                  />
                  <textarea
                    rows={2}
                    value={agendaForm?.topic2?.desc || ''}
                    onChange={(e) => setAgendaForm({ ...agendaForm, topic2: { ...agendaForm.topic2, desc: e.target.value } })}
                    placeholder="Açıklama / Özet"
                    style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)', color: '#cbd5e1', fontSize: 10.5, padding: '6px 10px', borderRadius: 5, width: '100%', resize: 'vertical' }}
                  />
                </div>
              </div>

              {/* Topic 3 */}
              <div style={{ background: 'rgba(56, 189, 248, 0.05)', border: '1px solid rgba(56, 189, 248, 0.25)', borderRadius: 6, padding: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 800, color: '#93c5fd' }}>
                    📈 3. Gündem Maddesi (Hisse / Bilanço / Borsa İstanbul)
                  </span>
                  <input
                    type="text"
                    value={agendaForm?.topic3?.tag || ''}
                    onChange={(e) => setAgendaForm({ ...agendaForm, topic3: { ...agendaForm.topic3, tag: e.target.value } })}
                    placeholder="Etiket (Örn: Hisse & Bilanço)"
                    style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(56,189,248,0.3)', color: '#93c5fd', fontSize: 9.5, padding: '2px 8px', borderRadius: 4, width: 140 }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <input
                    type="text"
                    value={agendaForm?.topic3?.title || ''}
                    onChange={(e) => setAgendaForm({ ...agendaForm, topic3: { ...agendaForm.topic3, title: e.target.value } })}
                    placeholder="Başlık"
                    style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: 11.5, fontWeight: 700, padding: '6px 10px', borderRadius: 5, width: '100%' }}
                  />
                  <textarea
                    rows={2}
                    value={agendaForm?.topic3?.desc || ''}
                    onChange={(e) => setAgendaForm({ ...agendaForm, topic3: { ...agendaForm.topic3, desc: e.target.value } })}
                    placeholder="Açıklama / Özet"
                    style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)', color: '#cbd5e1', fontSize: 10.5, padding: '6px 10px', borderRadius: 5, width: '100%', resize: 'vertical' }}
                  />
                </div>
              </div>

              {/* Fed CME Expectation Settings */}
              <div style={{ background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.25)', borderRadius: 6, padding: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: '#34d399', marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>🏛️ Fed Faiz Beklentisi (CME FedWatch Modeli)</span>
                  <span style={{ fontSize: 8.5, color: '#a7f3d0' }}>FOMC Toplantı Senaryosu</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr 1fr', gap: 8, marginBottom: 8 }}>
                  <div>
                    <div style={{ fontSize: 9.5, color: 'var(--text-muted)', marginBottom: 3 }}>Ağırlıklı Senaryo</div>
                    <input
                      type="text"
                      value={agendaForm?.fedRate?.dominant || 'Faizi Sabit Tutma (Pas)'}
                      onChange={(e) => setAgendaForm({ ...agendaForm, fedRate: { ...agendaForm.fedRate, dominant: e.target.value } })}
                      style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: 11, fontWeight: 700, padding: '5px 8px', borderRadius: 4, width: '100%' }}
                    />
                  </div>
                  <div>
                    <div style={{ fontSize: 9.5, color: 'var(--text-muted)', marginBottom: 3 }}>Konsensüs Olasılığı (%)</div>
                    <input
                      type="number"
                      value={agendaForm?.fedRate?.prob ?? 76}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setAgendaForm({ ...agendaForm, fedRate: { ...agendaForm.fedRate, prob: val, pauseProb: Math.max(0, 100 - val) } });
                      }}
                      style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', color: '#34d399', fontSize: 11, fontWeight: 800, padding: '5px 8px', borderRadius: 4, width: '100%' }}
                    />
                  </div>
                  <div>
                    <div style={{ fontSize: 9.5, color: 'var(--text-muted)', marginBottom: 3 }}>Alternatif İhtimal (%)</div>
                    <input
                      type="number"
                      value={agendaForm?.fedRate?.pauseProb ?? 24}
                      onChange={(e) => setAgendaForm({ ...agendaForm, fedRate: { ...agendaForm.fedRate, pauseProb: Number(e.target.value) } })}
                      style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', color: '#f59e0b', fontSize: 11, fontWeight: 800, padding: '5px 8px', borderRadius: 4, width: '100%' }}
                    />
                  </div>
                  <div>
                    <div style={{ fontSize: 9.5, color: 'var(--text-muted)', marginBottom: 3 }}>Toplantı / Tarih</div>
                    <input
                      type="text"
                      value={agendaForm?.fedRate?.meetingDate || 'Aralık FOMC'}
                      onChange={(e) => setAgendaForm({ ...agendaForm, fedRate: { ...agendaForm.fedRate, meetingDate: e.target.value } })}
                      style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', color: '#38bdf8', fontSize: 11, fontWeight: 700, padding: '5px 8px', borderRadius: 4, width: '100%' }}
                    />
                  </div>
                </div>
                <textarea
                  rows={2}
                  value={agendaForm?.fedRate?.note || ''}
                  onChange={(e) => setAgendaForm({ ...agendaForm, fedRate: { ...agendaForm.fedRate, note: e.target.value } })}
                  placeholder="Aralık FOMC toplantısında faizin sabit tutulması, alternatif senaryo olarak ise 25 bp artış ihtimali..."
                  style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)', color: '#cbd5e1', fontSize: 10.5, padding: '6px 10px', borderRadius: 5, width: '100%', resize: 'vertical' }}
                />
              </div>

              {/* TCMB & Türkiye Makro & Reel Faiz Ayarları */}
              <div style={{ background: 'rgba(59, 130, 246, 0.05)', border: '1px solid rgba(59, 130, 246, 0.25)', borderRadius: 6, padding: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: '#60a5fa', marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>🇹🇷 Türkiye Makro & Faiz Parametreleri</span>
                  <span style={{ fontSize: 8.5, color: '#93c5fd' }}>Tüm slayt ve prompter metinlerini anında günceller</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                  <div>
                    <div style={{ fontSize: 9.5, color: 'var(--text-muted)', marginBottom: 3 }}>TCMB Politika Faizi (%)</div>
                    <input
                      type="number"
                      step="0.25"
                      value={agendaForm?.macroRates?.tcmb ?? 36.00}
                      onChange={(e) => setAgendaForm({ ...agendaForm, macroRates: { ...(agendaForm.macroRates || {}), tcmb: Number(e.target.value) } })}
                      style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(59,130,246,0.3)', color: '#34d399', fontSize: 11, fontWeight: 800, padding: '5px 8px', borderRadius: 4, width: '100%' }}
                    />
                  </div>
                  <div>
                    <div style={{ fontSize: 9.5, color: 'var(--text-muted)', marginBottom: 3 }}>TÜİK Yıllık TÜFE (%)</div>
                    <input
                      type="number"
                      step="0.01"
                      value={agendaForm?.macroRates?.cpi ?? 29.73}
                      onChange={(e) => setAgendaForm({ ...agendaForm, macroRates: { ...(agendaForm.macroRates || {}), cpi: Number(e.target.value) } })}
                      style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(59,130,246,0.3)', color: '#60a5fa', fontSize: 11, fontWeight: 800, padding: '5px 8px', borderRadius: 4, width: '100%' }}
                    />
                  </div>
                  <div>
                    <div style={{ fontSize: 9.5, color: 'var(--text-muted)', marginBottom: 3 }}>Net Reel Getiri</div>
                    <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.25)', borderRadius: 4, padding: '5px 8px', color: '#34d399', fontSize: 11, fontWeight: 800, textAlign: 'center' }}>
                      +{(Number(agendaForm?.macroRates?.tcmb ?? 36.00) - Number(agendaForm?.macroRates?.cpi ?? 29.73)).toFixed(2)} Puan
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 14 }}>
              <button
                type="button"
                onClick={() => setIsAgendaModalOpen(false)}
                style={{
                  padding: '7px 16px',
                  borderRadius: 6,
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  color: '#e2e8f0',
                  fontSize: 11.5,
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={handleSaveAgenda}
                style={{
                  padding: '7px 20px',
                  borderRadius: 6,
                  background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                  border: 'none',
                  color: '#fff',
                  fontSize: 11.5,
                  fontWeight: 800,
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(245, 158, 11, 0.4)'
                }}
              >
                💾 Kaydet & Slaytlara Uygula
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
