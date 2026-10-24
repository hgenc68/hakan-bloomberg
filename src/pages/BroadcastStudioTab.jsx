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
  X
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

  // Active slide index (0 to 8)
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

  // Active sub-tab inside Slide 1 ('breaking_news', 'fed', 'seasonality', 'macro', 'matrix')
  const [slide1SubTab, setSlide1SubTab] = useState(() => {
    try { return localStorage.getItem('broadcast_studio_slide1_subtab') || 'breaking_news'; } catch { return 'breaking_news'; }
  });

  // Dynamic Agenda & Live News State
  const [liveNewsList, setLiveNewsList] = useState([]);
  const [isAgendaModalOpen, setIsAgendaModalOpen] = useState(false);

  const defaultAgenda = {
    topic1: {
      title: 'Küresel Likidite, Fed Faiz Duruşu & Doların Gücü',
      desc: 'DXY 102 direnci, 28 Ekim FOMC sabit faiz beklentisi ve tahvil faizlerindeki hareketlilik.',
      tag: 'Makro & Faiz'
    },
    topic2: {
      title: 'Jeopolitik Riskler, Enerji Koridorları & Petrol',
      desc: 'Hürmüz & Kızıldeniz lojistiği, Brent petrol ve enflasyon geçişkenliği.',
      tag: 'Enerji & Jeopolitik'
    },
    topic3: {
      title: 'Borsa İstanbul & Wall Street Bilanço Dinamikleri',
      desc: 'BIST 100 ana kurumsal taban seviyeleri ve yapay zeka sermaye harcamaları.',
      tag: 'Hisse & Bilanço'
    },
    fedRate: {
      dominant: 'Faizi Sabit Tutma (Pas)',
      prob: 76,
      pauseProb: 24,
      meetingDate: '28 Ekim FOMC',
      note: '28 Ekim FOMC toplantısında faizin %3.75 - %4.00 bandında sabit tutulması (%76), Aralık toplantısında ise enflasyon yapışkanlığına bağlı 25 bp artış veya şahin duruş riski (%24) fiyatlanmaktadır.'
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
      ['broadcast_studio_agenda', 'broadcast_studio_agenda_v4', 'broadcast_studio_agenda_v5'].forEach(k => {
        try { localStorage.removeItem(k); } catch (e) {}
      });
      const savedStr = localStorage.getItem('broadcast_studio_agenda_v6');
      if (savedStr) {
        if (
          savedStr.includes('Katar') ||
          savedStr.includes('OpenAI') ||
          savedStr.includes('Tanker') ||
          savedStr.includes('25 bp İndirim') ||
          savedStr.includes('50.00') ||
          savedStr.includes('%50') ||
          savedStr.includes('37.00') ||
          savedStr.includes('31.51') ||
          !savedStr.includes('macroRates')
        ) {
          localStorage.removeItem('broadcast_studio_agenda_v6');
          return defaultAgenda;
        }
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

  // Fetch live market news
  useEffect(() => {
    fetch('/api/market?type=news')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.status === 'success' && Array.isArray(data.news) && data.news.length > 0) {
          setLiveNewsList(data.news);
        }
      })
      .catch(() => {});
  }, []);

  const updateAgenda = (newAgenda) => {
    setCustomAgenda(newAgenda);
    try {
      localStorage.setItem('broadcast_studio_agenda_v5', JSON.stringify(newAgenda));
    } catch (e) {}
    if (syncChannelRef.current) {
      try {
        syncChannelRef.current.postMessage({ type: 'CHANGE_AGENDA', agenda: newAgenda, time: Date.now() });
      } catch (e) {}
    }
  };

  const handleAutoFillFromNews = () => {
    if (!liveNewsList || liveNewsList.length === 0) return;
    const cleanStr = (s) => (s || '').replace(/<[^>]+>/g, '').replace(/ - .*$/, '').trim();
    const n1 = liveNewsList[0];
    const n2 = liveNewsList[1] || liveNewsList[0];
    const n3 = liveNewsList[2] || liveNewsList[0];
    setAgendaForm(prev => ({
      ...prev,
      topic1: {
        title: cleanStr(n1.title) || prev.topic1.title,
        desc: cleanStr(n1.summary) || (n1.source ? `Kaynak: ${n1.source}` : prev.topic1.desc),
        tag: n1.category || 'Sıcak Gündem'
      },
      topic2: {
        title: cleanStr(n2.title) || prev.topic2.title,
        desc: cleanStr(n2.summary) || (n2.source ? `Kaynak: ${n2.source}` : prev.topic2.desc),
        tag: n2.category || 'Emtia & Enerji'
      },
      topic3: {
        title: cleanStr(n3.title) || prev.topic3.title,
        desc: cleanStr(n3.summary) || (n3.source ? `Kaynak: ${n3.source}` : prev.topic3.desc),
        tag: n3.category || 'Hisse & Sektör'
      }
    }));
  };

  const [newsAppliedToast, setNewsAppliedToast] = useState(false);

  const applyLiveNewsDirectly = async () => {
    let news = liveNewsList;
    if (!news || news.length === 0) {
      try {
        const res = await fetch('/api/market?type=news');
        const data = await res.json();
        if (data?.status === 'success' && Array.isArray(data.news) && data.news.length > 0) {
          news = data.news;
          setLiveNewsList(news);
        }
      } catch (e) {}
    }

    if (news && news.length > 0) {
      const cleanStr = (s) => (s || '').replace(/<[^>]+>/g, '').replace(/ - .*$/, '').trim();
      const n1 = news[0];
      const n2 = news[1] || news[0];
      const n3 = news[2] || news[0];

      const newAgenda = {
        ...customAgenda,
        topic1: {
          title: cleanStr(n1.title) || customAgenda.topic1.title,
          desc: cleanStr(n1.summary) || (n1.source ? `Kaynak: ${n1.source}` : customAgenda.topic1.desc),
          tag: n1.category || 'Sıcak Gündem'
        },
        topic2: {
          title: cleanStr(n2.title) || customAgenda.topic2.title,
          desc: cleanStr(n2.summary) || (n2.source ? `Kaynak: ${n2.source}` : customAgenda.topic2.desc),
          tag: n2.category || 'Emtia & Enerji'
        },
        topic3: {
          title: cleanStr(n3.title) || customAgenda.topic3.title,
          desc: cleanStr(n3.summary) || (n3.source ? `Kaynak: ${n3.source}` : customAgenda.topic3.desc),
          tag: n3.category || 'Hisse & Sektör'
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
      if (e.key === 'broadcast_studio_agenda' && e.newValue) {
        try {
          setCustomAgenda(JSON.parse(e.newValue));
        } catch (e) {}
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
      ['broadcast_studio_custom_scripts', 'broadcast_studio_custom_scripts_v2', 'broadcast_studio_custom_scripts_v3', 'broadcast_studio_custom_scripts_v4', 'broadcast_studio_custom_scripts_v5', 'broadcast_studio_custom_scripts_v6'].forEach(k => {
        try { localStorage.removeItem(k); } catch (e) {}
      });
      const saved = localStorage.getItem('broadcast_studio_custom_scripts_v7');
      if (saved) {
        if ((saved.includes('50') || saved.includes('37')) && (saved.includes('politika') || saved.includes('TCMB') || saved.includes('faiz'))) {
          localStorage.removeItem('broadcast_studio_custom_scripts_v7');
          return {};
        }
        if (saved.includes('Kendi portföy') || saved.includes('Kur Kalkanı') || saved.includes('portföyümüzde toplam') || saved.includes('tavsiye ederiz')) {
          localStorage.removeItem('broadcast_studio_custom_scripts_v7');
          return {};
        }
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          const cleaned = {};
          for (const [k, v] of Object.entries(parsed)) {
            if (typeof v === 'string') {
              if (v.includes('yüzde 50') || v.includes('%50') || v.includes('50 politika') || v.includes('%37') || v.includes('37 politika') || v.includes('Kendi portföy') || v.includes('Kur Kalkanı') || v.includes('portföyümüzde toplam') || v.includes('tavsiye ederiz')) {
                continue;
              }
            }
            cleaned[k] = v;
          }
          return cleaned;
        }
      }
      return {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('broadcast_studio_custom_scripts_v7', JSON.stringify(customScripts));
    } catch (e) {}
  }, [customScripts]);

  const [freshRegenerateToast, setFreshRegenerateToast] = useState(false);

  // ⚡ 1-Click Fresh Daily Broadcast Generator (Wipes stale localStorage overrides & generates today's script fresh from live quotes)
  const handleGenerateFreshDailyBroadcast = async () => {
    setIsRefreshing(true);
    try {
      try {
        ['broadcast_studio_custom_scripts', 'broadcast_studio_custom_scripts_v2', 'broadcast_studio_custom_scripts_v3', 'broadcast_studio_custom_scripts_v4', 'broadcast_studio_custom_scripts_v5', 'broadcast_studio_custom_scripts_v6', 'broadcast_studio_custom_scripts_v7', 'broadcast_studio_agenda', 'broadcast_studio_agenda_v4', 'broadcast_studio_agenda_v5'].forEach(k => {
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

  // 9 Television Slides dynamically populated with Edition Theme, Visual Variants & Live Quotes
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
          { label: 'FED Faiz Beklentisi (CME)', val: customAgenda?.fedRate?.dominant ? `%${customAgenda.fedRate.prob} ${customAgenda.fedRate.dominant}` : '%76 Pas / Sabit', chg: 0, note: customAgenda?.fedRate?.dominant?.includes('İndirim') ? 'Kademeli Gevşeme' : '28 Ekim Pas / Aralık Artış Riski' },
          { label: 'S&P 500 Mevsimsellik', val: 'Q4 Ralli +%4.1', chg: 1.4, isUp: true, note: 'Seçim Yılı Döngüsü' },
          { label: 'Türkiye TÜFE (Yıllık)', val: `%${pulse?.inflation?.turkey || 31.51}`, chg: 0, note: 'Reel Faiz Dengesi' },
          { label: 'ABD ISM Hizmetler PMI', val: '54.9', chg: 3.2, isUp: true, note: '1.5 Yılın Zirvesi • Güçlü' }
        ],
        defaultScript: generateDailyScript(1, activeTheme, quotes, editionState.todayFullStr, editionState.slotTitle, customAgenda, broadcastTone)
      },

      // SLIDE 2: Geopolitics & Energy Corridor
      {
        id: 2,
        badge: variantIndex === 1 ? 'OPEC+ & PETROL KOTALARI' : (variantIndex === 2 ? 'JEOPOLİTİK RİSK KATSAYISI' : 'JEOPOLİTİK RADAR & ENERJİ'),
        badgeColor: 'rose',
        title: variantIndex === 1 ? 'OPEC+ Üretim Kotaları & Rafineri Marjları' : (variantIndex === 2 ? 'Jeopolitik Risk Katsayısı & Güvenli Liman' : 'Jeopolitik Riskler & Enerji Koridoru'),
        subtitle: variantIndex === 1 ? 'Suudi 9M Kota, ABD SPR 385M Varil ve Crack Spread Açılması' : (variantIndex === 2 ? '142 GPR Risk Puanı, Navlun Primleri ve Enerji Koridorları' : 'Hürmüz & Kızıldeniz Koridoru, Navlun Maliyetleri ve Petrol Arzı'),
        durationEst: '55 sn',
        metrics: [
          { label: 'Brent Ham Petrol', val: `$${fmt(brent.price, 2)}`, chg: brent.change, isUp: brent.change >= 0 },
          { label: 'WTI Ham Petrol', val: `$${fmt(wti.price, 2)}`, chg: wti.change, isUp: wti.change >= 0 },
          { label: variantIndex === 1 ? 'Crack Spread Marjı' : 'Navlun Risk Katsayısı', val: variantIndex === 1 ? '$24.80 / vrl' : '+%14.2', chg: 2.1, isUp: true, note: variantIndex === 1 ? 'Rafineri Baskısı' : 'Kızıldeniz & Ümit Burnu' },
          { label: 'Enerji Enflasyon Riski', val: 'Yüksek Risk', chg: 0, isUp: true }
        ],
        defaultScript: generateDailyScript(2, activeTheme, quotes, editionState.todayFullStr, editionState.slotTitle, customAgenda, broadcastTone)
      },

      // SLIDE 3: Central Banks & Real Yield Shield
      {
        id: 3,
        badge: variantIndex === 1 ? 'MERKEZ BANKALARI QT BİLANÇOSU' : (variantIndex === 2 ? 'ENFLASYON KIRILIMI & FAİZ' : 'MERKEZ BANKALARI & REEL GETİRİ'),
        badgeColor: 'amber',
        title: variantIndex === 1 ? 'Bilanço Küçültmesi (QT) & Likidite Daralması' : (variantIndex === 2 ? 'Enflasyonun Anatomisi: Hizmet vs Mal Katılığı' : 'Merkez Bankaları & TL Reel Getiri Kalkanı'),
        subtitle: variantIndex === 1 ? 'Fed -$60B/Ay Daralma, ECB €6.4T Bilanço ve TCMB Swap Hariç Rezervler' : (variantIndex === 2 ? 'Hizmet vs Temel Mal Katılığı ve Faiz İndirimi Yol Haritası' : 'Fed Faiz Patikası, Dezenflasyon Süreci ve TCMB Politika Faizi'),
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
            note: '28 Ekim Pas / Aralık Artış Riski' 
          },
          { 
            label: 'Türkiye TÜFE (Yıllık)', 
            val: `%${fmt(quotes.turkeyCPI, 2)}`, 
            chg: -0.45, 
            isUp: false, 
            note: 'Dezenflasyon Patikası' 
          },
          { 
            label: '5Y CDS Risk Primi', 
            val: '216 bp', 
            chg: -3.5, 
            isUp: false, 
            note: 'Düşüş Trendi' 
          }
        ],
        defaultScript: generateDailyScript(3, activeTheme, quotes, editionState.todayFullStr, editionState.slotTitle, customAgenda, broadcastTone)
      },

      // SLIDE 4: Wall Street & AI Ecosystem
      {
        id: 4,
        badge: variantIndex === 1 ? 'MAG-7 AI CAPEX YATIRIMI' : (variantIndex === 2 ? 'S&P 500 DEĞERLEME & F/K' : 'WALL STREET & YAPAY ZEKA'),
        badgeColor: 'emerald',
        title: variantIndex === 1 ? 'Mag-7 AI Sermaye Harcamaları & Çip Altyapısı' : (variantIndex === 2 ? 'S&P 500 Değerleme & F/K Çarpan Koridoru' : 'Wall Street: S&P 500 Mevsimsellik & AI Döngüsü'),
        subtitle: variantIndex === 1 ? '205 Milyar Dolarlık AI Capex, Blackwell Teslimatları ve TSMC 3nm' : (variantIndex === 2 ? '21.4x İleri F/K, %10 Kâr Büyümesi ve Eşit Ağırlıklı S&P (RSP) Yayılımı' : 'Seçim Yılı Q4 Rallisi (+%4.1), Güçlü ISM Hizmetler (54.9) ve Büyük Teknoloji'),
        durationEst: '50 sn',
        metrics: [
          { label: 'S&P 500 Endeksi', val: fmt(sp500.price, 2), chg: sp500.change, isUp: sp500.change >= 0 },
          { label: 'Nasdaq 100 Endeksi', val: fmt(nasdaq.price, 2), chg: nasdaq.change, isUp: nasdaq.change >= 0 },
          { label: variantIndex === 1 ? 'Yıllık AI Capex Bütçesi' : 'ISM Hizmetler PMI', val: variantIndex === 1 ? '$205 Milyar' : '54.9', chg: 3.2, isUp: true, note: variantIndex === 1 ? 'Tarihi Zirve' : '1.5 Yılın Zirvesi' },
          { label: 'Tarihsel Q4 Getirisi', val: '+%4.1', chg: 0, isUp: true, note: 'Seçim Yılı Ortalaması' }
        ],
        defaultScript: generateDailyScript(4, activeTheme, quotes, editionState.todayFullStr, editionState.slotTitle, customAgenda, broadcastTone)
      },

      // SLIDE 5: Commodities: Gold & Silver
      {
        id: 5,
        badge: variantIndex === 1 ? 'ALTIN / GÜMÜŞ RASYOSU' : (variantIndex === 2 ? 'TIPS REEL FAİZ AYRIŞMASI' : 'EMTİA & KIYMETLİ MADEN'),
        badgeColor: 'amber',
        title: variantIndex === 1 ? 'Altın / Gümüş Rasyosu & Endüstriyel Gümüş' : (variantIndex === 2 ? 'Altın vs Reel Faiz Ayrışması & BRICS Rezervleri' : 'Emtia Masası: Ons Altın & Gümüş'),
        subtitle: variantIndex === 1 ? '68x Rasyo Kırılımı, Fotovoltaik Güneş Panelleri ve Çip Talebi' : (variantIndex === 2 ? 'Yüksek Faiz Ortamında Kesintisiz Fiziki Merkez Bankası Alımları' : '4.180$ Kurumsal Destek Tabanı, Altın/Gümüş Rasyosu ve Kapalıçarşı Gram Altın'),
        durationEst: '50 sn',
        metrics: [
          { label: 'Ons Altın (XAU/USD)', val: `$${fmt(gold.price, 2)}`, chg: gold.change, isUp: gold.change >= 0 },
          { label: 'Ons Gümüş (XAG/USD)', val: `$${fmt(silver.price, 2)}`, chg: silver.change, isUp: silver.change >= 0 },
          { label: 'Gram Altın (Kapalıçarşı)', val: `${fmt(gramAltinTL, 0)} ₺`, chg: 0.15, isUp: true },
          { label: 'Altın / Gümüş Rasyosu', val: `${fmt(gold.price / (silver.price || 60.96), 1)}x`, chg: 0, note: 'Tarihsel Eşik' }
        ],
        defaultScript: generateDailyScript(5, activeTheme, quotes, editionState.todayFullStr, editionState.slotTitle, customAgenda, broadcastTone)
      },

      // SLIDE 6: Dollar & Yield Curve
      {
        id: 6,
        badge: variantIndex === 1 ? 'DXY PARA SEPETİ' : (variantIndex === 2 ? 'KÜRESEL LİKİDİTE GÖSTERGELERİ' : 'DÖVİZ & TAHVİL PİYASASI'),
        badgeColor: 'purple',
        title: variantIndex === 1 ? 'DXY Para Sepeti Bileşenleri & Sermaye Akışı' : (variantIndex === 2 ? 'Küresel Likidite Göstergeleri: RRP & TGA' : 'Dolar Endeksi (DXY) & Verim Eğrisi'),
        subtitle: variantIndex === 1 ? 'EUR %57.6, JPY %13.6, GBP %11.9 Karşısında Dolar Gücü' : (variantIndex === 2 ? 'Fed RRP $280B, Hazine Hesabı $750B ve Net Rezervler' : 'DXY 102 Eşiği, ABD 10Y ve 2Y Tahvil Farkı ile Yield Curve Normalleşmesi'),
        durationEst: '50 sn',
        metrics: [
          { label: 'Dolar Endeksi (DXY)', val: fmt(dxy.price, 3), chg: dxy.change, isUp: dxy.change >= 0 },
          { label: 'ABD 10Y Tahvil Getirisi', val: `%${fmt(us10y.price, 3)}`, chg: us10y.change, isUp: us10y.change >= 0 },
          { label: 'ABD 2Y Tahvil Getirisi', val: `%${fmt(us2y.price, 3)}`, chg: us2y.change, isUp: us2y.change >= 0 },
          { label: '2Y / 10Y Verim Farkı', val: '+54 bp', chg: 1.2, isUp: true, note: 'Normalleşen Pozitif Eğim' }
        ],
        defaultScript: generateDailyScript(6, activeTheme, quotes, editionState.todayFullStr, editionState.slotTitle, customAgenda, broadcastTone)
      },

      // SLIDE 7: Crypto & Spot ETF Flows
      {
        id: 7,
        badge: variantIndex === 1 ? 'BITCOIN DOMINANCE & TOTAL3' : (variantIndex === 2 ? 'ON-CHAIN ARZ & MADENCİ' : 'KRİPTO & LİKİDİTE'),
        badgeColor: 'cyan',
        title: variantIndex === 1 ? 'Bitcoin Dominansı (%58.8) & TOTAL3 Altcoinler' : (variantIndex === 2 ? 'Borsa Rezervleri (2.1M Dibi) & Madenci Maliyetleri' : 'Kripto Ekosistemi: Bitcoin & Spot ETF'),
        subtitle: variantIndex === 1 ? 'Kurumsal Sermayenin Lider Kriptoda Yoğunlaşması ve Seçici Projeler' : (variantIndex === 2 ? '5 Yılın En Düşük Borsa Arzı, 64K$ Madenci Maliyeti ve Custody' : '85.000$ Tabanı, 87.000$ Direnci, Spot ETF Girişleri ve TOTAL3 Endeksi'),
        durationEst: '45 sn',
        metrics: [
          { label: 'Bitcoin (BTC)', val: `$${fmt(btc.price, 0)}`, chg: btc.change, isUp: btc.change >= 0 },
          { label: 'Ethereum (ETH)', val: `$${fmt(eth.price, 0)}`, chg: eth.change, isUp: eth.change >= 0 },
          { label: 'TOTAL3 Altcoin Hacmi', val: `$${fmt(total3.price, 1)}B`, chg: total3.change, isUp: total3.change >= 0 },
          { label: 'Kurumsal Spot ETF', val: '+$210M / Gün', chg: 3.4, isUp: true, note: 'BlackRock & Fidelity' }
        ],
        defaultScript: generateDailyScript(7, activeTheme, quotes, editionState.todayFullStr, editionState.slotTitle, customAgenda, broadcastTone)
      },

      // SLIDE 8: Borsa Istanbul & Sectors
      {
        id: 8,
        badge: variantIndex === 1 ? 'YABANCI TAKAS & CDS' : (variantIndex === 2 ? 'BIST ÇARPANLARI & KREDİ NOTU' : 'BORSA İSTANBUL & BIST 100'),
        badgeColor: 'emerald',
        title: variantIndex === 1 ? 'Yabancı Takas Oranı & Cari Denge Kalkanı' : (variantIndex === 2 ? 'BIST 100 Küresel Değerleme & Kredi Not Artışı' : 'Borsa İstanbul: BIST 100 & Makro Taban'),
        subtitle: variantIndex === 1 ? '%38.6 Takas Payı, 216 bp CDS ve Güçlü Cari Denge Kalkanı' : (variantIndex === 2 ? '7.4x F/K ile %44 Küresel İskonto, Moody\'s/Fitch Not Patikası' : '12.200 Tabanı, Sektörel Güç Ayrışmaları, Cari Denge ve Kurumsal Talep'),
        durationEst: '50 sn',
        metrics: [
          { label: 'BIST 100 Endeksi', val: fmt(bist100.price, 2), chg: bist100.change, isUp: bist100.change >= 0 },
          { label: 'Cari Denge Desteği', val: '+$779M', chg: 0, isUp: true, note: 'Döviz Rezervi Güvencesi' },
          { label: '5 Yıllık CDS Primi', val: '216 bp', chg: -2.1, isUp: false, note: 'Tarihi Dip' },
          { label: 'Teknik Tepki Bandı', val: '12.200 - 13.500', chg: 0, note: 'Kurumsal Taban' }
        ],
        defaultScript: generateDailyScript(8, activeTheme, quotes, editionState.todayFullStr, editionState.slotTitle, customAgenda, broadcastTone)
      },

      // SLIDE 9: Strategy, Cash & 48h Calendar
      {
        id: 9,
        badge: variantIndex === 1 ? 'MODEL VARLIK DAĞILIMI' : (variantIndex === 2 ? '3 KADEMELİ RİSK YÖNETİMİ' : 'YATIRIMCI PUSULASI & TAKVİM'),
        badgeColor: 'rose',
        title: variantIndex === 1 ? 'Örnek Varlık Dağılım Çerçevesi & Risk Yönetimi' : (variantIndex === 2 ? '3 Kademeli Risk Yönetimi & Disiplin Çerçevesi' : 'Yatırımcı Pusulası & 48 Saatlik Takvim'),
        subtitle: variantIndex === 1 ? 'Kurumsal Varlık Sınıfları: Nakit Tamponu, Çekirdek Hisse, Kıymetli Maden ve Fırsat Sepeti' : (variantIndex === 2 ? 'Destek Testi (%30), Teyit (%40), Momentum (%30) Kademeli Alım' : 'Önümüzdeki 48 Saatin Randevuları, Likit Nakit Tamponu ve Risk Disiplini'),
        durationEst: '45 sn',
        metrics: [
          { label: 'Takip Edilecek Veri', val: 'TÜİK TÜFE & ABD NFP', chg: 0, isUp: true },
          { label: 'Merkez Bankası Kararı', val: 'Gelecek PPK Toplantısı', chg: 0, note: 'Sıkı Para Duruşu' },
          { label: 'Model Likit Oranı', val: '%20 - %25', chg: 0, note: 'Örnek Tampon' },
          { label: 'Piyasa Stratejisi', val: 'Seçici & Korumalı', chg: 0, note: 'Hisse Bazlı Ayrışma' }
        ],
        defaultScript: generateDailyScript(9, activeTheme, quotes, editionState.todayFullStr, editionState.slotTitle, customAgenda, broadcastTone)
      }
    ];
  }, [
    activeTheme,
    variantIndex,
    editionState,
    customAgenda,
    broadcastTone,
    pulse,
    quotes,
    dxy, vix, brent, wti, gold, silver, us10y, us2y, sp500, sp500Etf, nasdaq, nasdaqEtf, dow, dowEtf, bist100, btc, eth, total3, currentUsdTry, gramAltinTL, fgScore, fgLabel
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
      const script = customScripts[`${editionState.editionKey}_${broadcastTone}_${s.id}`] !== undefined
        ? customScripts[`${editionState.editionKey}_${broadcastTone}_${s.id}`]
        : (customScripts[`${editionState.editionKey}_${s.id}`] !== undefined
          ? customScripts[`${editionState.editionKey}_${s.id}`]
          : (customScripts[s.id] !== undefined ? customScripts[s.id] : s.defaultScript));
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
          <tr><td><b>FED Faiz Beklentisi (CME FedWatch)</b></td><td><b>%${customAgenda?.fedRate?.prob || 76} (${customAgenda?.fedRate?.dominant || 'Faizi Sabit Tutma / Pas'})</b></td><td>%${customAgenda?.fedRate?.pauseProb || 24} Aralık 25 bp Artış</td><td>${customAgenda?.fedRate?.note || '28 Ekim toplantısında faizin sabit tutulması, Aralık toplantısı için ise 25 bp artış ihtimali fiyatlanıyor.'}</td></tr>
          <tr><td><b>S&P 500 Seçim Yılı Q4 Mevsimselliği</b></td><td><b>+%4.1 Tarihsel Ortalama</b></td><td>Kasım-Aralık Kazanma: %83.3</td><td>Ekim ayı dalgalanmaları yıl sonu rallisi öncesi dip fırsatı sunuyor.</td></tr>
          <tr><td><b>Türkiye TÜFE Enflasyonu</b></td><td><b>Yıllık %${pulse?.inflation?.turkey || 29.73}</b></td><td>Pozitif Reel Getiri Korunuyor</td><td>TCMB faiz patikasında sıkı ve ihtiyatlı duruşunu sürdürerek dezenflasyon sürecini destekliyor.</td></tr>
          <tr><td><b>ABD ISM Hizmetler PMI</b></td><td><b>54.9 (1.5 Yılın Zirvesi)</b></td><td>Beklenti: 51.7 | Önceki: 51.5</td><td>Resesyon tezini sildi, yeni siparişler fırladı (59.4).</td></tr>
          <tr><td><b>ABD Tarım Dışı İstihdam (NFP)</b></td><td><b>+254.000 Kişi (İşsizlik %4.1)</b></td><td>Beklenti: 140.000 Kişi</td><td>İstihdam patlaması tahvil faizlerini %4.02'ye tırmandırdı.</td></tr>
        </table>
    `;

    slides.forEach((s) => {
      const script = customScripts[`${editionState.editionKey}_${broadcastTone}_${s.id}`] !== undefined
        ? customScripts[`${editionState.editionKey}_${broadcastTone}_${s.id}`]
        : (customScripts[`${editionState.editionKey}_${s.id}`] !== undefined
          ? customScripts[`${editionState.editionKey}_${s.id}`]
          : (customScripts[s.id] !== undefined ? customScripts[s.id] : s.defaultScript));
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
                          <div style={{ fontSize: 8, color: 'var(--text-muted)', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3 }}>
                            <span>TRUFLATION</span>
                            <span className="nav-badge cyan" style={{ fontSize: 7, padding: '0 3px' }}>CANLI</span>
                          </div>
                          <div style={{ fontSize: 13, fontWeight: 900, color: '#38bdf8', fontFamily: 'var(--font-mono)' }}>
                            %{fmt(pulse?.truflation?.rate || pulse?.inflation?.usa || macroPulseData?.inflation?.usa || 3.09, 2)}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Right: Sub-Tabbed Multi-Visual Hub (FED CME, S&P Mevsimsellik, Sıcak Makro, Varlık Matrisi) */}
                    <div style={{ background: '#070a12', border: '1px solid var(--border)', borderRadius: 6, padding: '10px 12px', display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
                      {/* Sub-Tab Navigation Header */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, marginBottom: 8, paddingBottom: 6, borderBottom: '1px solid rgba(255,255,255,0.08)', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
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
                              <div style={{ fontSize: 10.5, fontWeight: 800, color: '#38bdf8', fontFamily: 'var(--font-mono)' }}>
                                {customAgenda?.fedRate?.dominant || 'Faizi Sabit Tutma (Pas)'} (%{customAgenda?.fedRate?.prob ?? 76})
                              </div>
                            </div>
                          </div>

                          {/* Horizontal Bar Chart for FOMC Probabilities */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, background: 'rgba(0,0,0,0.3)', padding: '9px 11px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.06)' }}>
                            {/* Dominant Expectation Bar */}
                            <div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9.5, fontWeight: 700, marginBottom: 2 }}>
                                <span style={{ color: '#ffffff', display: 'flex', alignItems: 'center', gap: 5 }}>
                                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#10b981' }}></span>
                                  {customAgenda?.fedRate?.dominant || 'Faizi Sabit Tutma (Pas)'} (28 Ekim FOMC)
                                </span>
                                <span style={{ color: '#34d399', fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: 11 }}>
                                  %{customAgenda?.fedRate?.prob ?? 76}
                                </span>
                              </div>
                              <div style={{ height: 9, background: 'rgba(255,255,255,0.06)', borderRadius: 5, overflow: 'hidden' }}>
                                <div style={{ width: `${customAgenda?.fedRate?.prob ?? 76}%`, height: '100%', background: 'linear-gradient(90deg, #059669, #10b981)', borderRadius: 5 }}></div>
                              </div>
                              <div style={{ fontSize: 8, color: 'var(--text-muted)', marginTop: 1 }}>28 Ekim toplantısında faizin %3.75 - %4.00 bandında sabit tutulması ana senaryosu</div>
                            </div>

                            {/* Alternative Scenario Bar */}
                            <div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9.5, fontWeight: 700, marginBottom: 2 }}>
                                <span style={{ color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: 5 }}>
                                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#f59e0b' }}></span>
                                  {customAgenda?.fedRate?.dominant?.includes('İndirim') ? 'Faizi Sabit Tutma / Pas' : 'Aralık FOMC: 25 bp Faiz Artışı / Şahin Duruş'}
                                </span>
                                <span style={{ color: '#f59e0b', fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: 11 }}>
                                  %{customAgenda?.fedRate?.pauseProb ?? (100 - (customAgenda?.fedRate?.prob ?? 76))}
                                </span>
                              </div>
                              <div style={{ height: 7, background: 'rgba(255,255,255,0.06)', borderRadius: 4, overflow: 'hidden' }}>
                                <div style={{ width: `${customAgenda?.fedRate?.pauseProb ?? (100 - (customAgenda?.fedRate?.prob ?? 76))}%`, height: '100%', background: '#f59e0b', borderRadius: 4 }}></div>
                              </div>
                              <div style={{ fontSize: 8, color: 'var(--text-muted)', marginTop: 1 }}>Enflasyon yapışkanlığına bağlı Aralık ayı faiz artışı veya şahin duruş senaryosu</div>
                            </div>
                          </div>

                          {/* Meeting & Scenario Summary Row */}
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '5px 6px', borderRadius: 4, textAlign: 'center' }}>
                              <div style={{ fontSize: 7.5, color: 'var(--text-muted)', fontWeight: 700 }}>28 EKİM BEKLENTİSİ</div>
                              <div style={{ fontSize: 9.5, fontWeight: 800, color: '#34d399', fontFamily: 'var(--font-mono)' }}>
                                %{customAgenda?.fedRate?.prob ?? 76} {customAgenda?.fedRate?.dominant || 'Sabit/Pas'}
                              </div>
                            </div>
                            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '5px 6px', borderRadius: 4, textAlign: 'center' }}>
                              <div style={{ fontSize: 7.5, color: 'var(--text-muted)', fontWeight: 700 }}>ARALIK BEKLENTİSİ</div>
                              <div style={{ fontSize: 9.5, fontWeight: 800, color: '#f59e0b', fontFamily: 'var(--font-mono)' }}>
                                %{customAgenda?.fedRate?.pauseProb ?? (100 - (customAgenda?.fedRate?.prob ?? 76))} 25 bp Artış
                              </div>
                            </div>
                            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '5px 6px', borderRadius: 4, textAlign: 'center' }}>
                              <div style={{ fontSize: 7.5, color: 'var(--text-muted)', fontWeight: 700 }}>ODAK TOPLANTI</div>
                              <div style={{ fontSize: 9.5, fontWeight: 800, color: '#38bdf8', fontFamily: 'var(--font-mono)' }}>
                                {customAgenda?.fedRate?.meetingDate || '28 Ekim FOMC'}
                              </div>
                            </div>
                          </div>

                          {/* Analytical Takeaway Box */}
                          <div style={{ background: 'rgba(56, 189, 248, 0.05)', border: '1px solid rgba(56, 189, 248, 0.2)', borderRadius: 5, padding: '7px 10px', fontSize: 9, color: '#cbd5e1', lineHeight: 1.45 }}>
                            <span style={{ color: '#38bdf8', fontWeight: 800 }}>⚡ PİYASA YORUMU & STRATEJİ: </span>
                            {customAgenda?.fedRate?.note || '28 Ekim FOMC toplantısında faizin %3.75 - %4.00 bandında sabit tutulması (%76), Aralık toplantısında ise enflasyon yapışkanlığına bağlı 25 bp faiz artışı veya şahin duruş riski (%24) fiyatlanmaktadır.'}
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
                                <span style={{ fontSize: 8.5, fontWeight: 800, color: 'var(--cyan)' }}>TÜRKİYE TÜFE ENFLASYONU</span>
                                <span style={{ fontSize: 7.5, color: '#34d399', fontFamily: 'var(--font-mono)', fontWeight: 800 }}>Pozitif Reel Getiri</span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 2 }}>
                                <span style={{ fontSize: 13, fontWeight: 900, color: '#fff', fontFamily: 'var(--font-mono)' }}>%{pulse?.inflation?.turkey || 29.73}</span>
                                <span style={{ fontSize: 8.5, color: 'var(--text-muted)' }}>Dezenflasyon Patikası</span>
                              </div>
                              <div style={{ fontSize: 7.5, color: '#94a3b8', marginTop: 2, lineHeight: 1.35 }}>
                                Yıllık enflasyonda dezenflasyon patikası takip ediliyor. TCMB pozitif reel faiz kalkanı ve sıkı likidite adımlarıyla TL varlıkları destekliyor.
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

                      {/* VIEW 5: BREAKING NEWS & MARKET SHOCKS */}
                      {slide1SubTab === 'breaking_news' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 7, flex: 1, minWidth: 0, overflowY: 'auto' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ fontSize: 11, fontWeight: 800, color: '#f87171', display: 'flex', alignItems: 'center', gap: 6 }}>
                              <Flame size={13} />
                              <span>GÜNÜN SICAK GÜNDEMİ & PİYASA ETKİSİ</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <button
                                type="button"
                                onClick={applyLiveNewsDirectly}
                                style={{
                                  fontSize: 8.5,
                                  padding: '2px 7px',
                                  borderRadius: 4,
                                  background: newsAppliedToast ? 'rgba(16, 185, 129, 0.3)' : 'rgba(16, 185, 129, 0.15)',
                                  color: '#34d399',
                                  border: '1px solid rgba(16, 185, 129, 0.4)',
                                  cursor: 'pointer',
                                  fontWeight: 800,
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 3
                                }}
                                title="Google Finans canlı haber akışını tüm slaytlara tek tıkla uygular"
                              >
                                <Zap size={10} />
                                <span>{newsAppliedToast ? 'Güncellendi!' : '⚡ Canlı Haber Çek'}</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => setIsAgendaModalOpen(true)}
                                style={{
                                  fontSize: 8.5,
                                  padding: '2px 7px',
                                  borderRadius: 4,
                                  background: 'rgba(245, 158, 11, 0.15)',
                                  color: '#fbbf24',
                                  border: '1px solid rgba(245, 158, 11, 0.4)',
                                  cursor: 'pointer',
                                  fontWeight: 800,
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 3
                                }}
                                title="Gündem maddelerini düzenle veya özel başlıklar gir"
                              >
                                <Sparkles size={10} />
                                <span>🎙️ Gündemi Düzenle</span>
                              </button>

                              <span style={{ fontSize: 8, padding: '2px 6px', borderRadius: 3, background: 'rgba(239, 68, 68, 0.2)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.4)', fontWeight: 800 }}>
                                CANLI RADAR
                              </span>
                            </div>
                          </div>

                          {/* 1. Topic 1 */}
                          <div style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: 6, padding: '8px 10px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontSize: 10, fontWeight: 900, color: '#fca5a5' }}>
                                💥 1. {customAgenda?.topic1?.title || 'Küresel Likidite & Faiz Patikası'}
                              </span>
                              <span style={{ fontSize: 8, color: '#ef4444', fontFamily: 'var(--font-mono)', fontWeight: 800 }}>
                                {customAgenda?.topic1?.tag || 'MAKRO & FAİZ'}
                              </span>
                            </div>
                            <div style={{ fontSize: 9.5, color: '#e2e8f0', marginTop: 3, lineHeight: 1.4 }}>
                              {customAgenda?.topic1?.desc || 'Faiz beklentileri, tahvil getirileri ve döviz piyasası dengesi.'}
                            </div>
                          </div>

                          {/* 2. Topic 2 */}
                          <div style={{ background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.25)', borderRadius: 6, padding: '8px 10px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontSize: 10, fontWeight: 900, color: '#fde047' }}>
                                ⚡ 2. {customAgenda?.topic2?.title || 'Enerji & Jeopolitik Koridor'}
                              </span>
                              <span style={{ fontSize: 8, color: '#fbbf24', fontFamily: 'var(--font-mono)', fontWeight: 800 }}>
                                {customAgenda?.topic2?.tag || 'ENERJİ & JEOPOLİTİK'}
                              </span>
                            </div>
                            <div style={{ fontSize: 9.5, color: '#e2e8f0', marginTop: 3, lineHeight: 1.4 }}>
                              {customAgenda?.topic2?.desc || 'Hürmüz & Kızıldeniz lojistiği, Brent petrol ve enflasyon geçişkenliği.'}
                            </div>
                          </div>

                          {/* 3. Topic 3 */}
                          <div style={{ background: 'rgba(56, 189, 248, 0.08)', border: '1px solid rgba(56, 189, 248, 0.25)', borderRadius: 6, padding: '8px 10px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontSize: 10, fontWeight: 900, color: '#93c5fd' }}>
                                📈 3. {customAgenda?.topic3?.title || 'Borsa & Şirket Bilançoları'}
                              </span>
                              <span style={{ fontSize: 8, color: '#60a5fa', fontFamily: 'var(--font-mono)', fontWeight: 800 }}>
                                {customAgenda?.topic3?.tag || 'HİSSE & BİLANÇO'}
                              </span>
                            </div>
                            <div style={{ fontSize: 9.5, color: '#e2e8f0', marginTop: 3, lineHeight: 1.4 }}>
                              {customAgenda?.topic3?.desc || 'BIST 100 ana kurumsal taban seviyeleri ve yapay zeka sermaye harcamaları.'}
                            </div>
                          </div>

                          {/* Canlı Akış Haberleri Bölümü (Eğer API'den haber geldiyse) */}
                          {liveNewsList && liveNewsList.length > 0 && (
                            <div style={{ marginTop: 2, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 6, padding: '6px 8px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                <span style={{ fontSize: 8.5, fontWeight: 800, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 4 }}>
                                  <Radio size={10} style={{ color: '#10b981' }} />
                                  CANLI HABER BESLEMESİ
                                </span>
                                <span style={{ fontSize: 7.5, color: '#64748b' }}>{liveNewsList.length} Haber Akışı</span>
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 3.5 }}>
                                {liveNewsList.slice(0, 3).map((n, idx) => (
                                  <div key={idx} style={{ fontSize: 8.5, color: '#cbd5e1', display: 'flex', alignItems: 'baseline', gap: 5, lineHeight: 1.3 }}>
                                    <span style={{ color: 'var(--cyan)', fontSize: 8, fontWeight: 700 }}>•</span>
                                    <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{n.title}</span>
                                    {n.source && <span style={{ color: '#64748b', fontSize: 7.5, flexShrink: 0 }}>({n.source})</span>}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* SLIDE 2: Geopolitics & Energy Transmission Chain */}
                {activeSlide.id === 2 && (
                  variantIndex === 1 ? (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                      {/* Left: OPEC+ & Spare Capacity */}
                      <div style={{ background: '#070a12', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: 6, padding: 14 }}>
                        <div style={{ fontSize: 11, fontWeight: 800, color: '#fbbf24', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                          <Flame size={14} />
                          <span>OPEC+ KOTALARI & ATIL ÜRETİM KAPASİTESİ</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          <div style={{ background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.2)', borderRadius: 6, padding: '10px 12px' }}>
                            <div style={{ fontWeight: 800, color: '#fff', fontSize: 12 }}>Suudi Arabistan & BAE Atıl Kapasite Kalkanı</div>
                            <div style={{ fontSize: 10.5, color: '#cbd5e1', marginTop: 2 }}>Günlük 3.2M varillik anında devreye girebilir atıl kapasite, olası Hürmüz krizlerinde küresel fiyat tavanını sınırlıyor.</div>
                          </div>
                          <div style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: 6, padding: '10px 12px' }}>
                            <div style={{ fontWeight: 800, color: '#fff', fontSize: 12 }}>Rusya & Kazakistan Kota Telafisi</div>
                            <div style={{ fontSize: 10.5, color: '#cbd5e1', marginTop: 2 }}>OPEC+ kotalarını aşan üretimler için telafi kesintileri devrede; Rus ham petrolü Asya rafinerilerine indirimli akıyor.</div>
                          </div>
                          <div style={{ background: 'rgba(56, 189, 248, 0.08)', border: '1px solid rgba(56, 189, 248, 0.2)', borderRadius: 6, padding: '10px 12px' }}>
                            <div style={{ fontWeight: 800, color: '#fff', fontSize: 12 }}>Rafineri Çatlak Marjları (Crack Spread: $18.40)</div>
                            <div style={{ fontSize: 10.5, color: '#cbd5e1', marginTop: 2 }}>Dizel ve jet yakıtı kraking marjları diri; ham petrol fiyatı sakin kalsa bile nihai yakıt maliyeti yapışkan kalıyor.</div>
                          </div>
                        </div>
                      </div>

                      {/* Right: Global Reserves & Storage */}
                      <div style={{ background: '#070a12', border: '1px solid rgba(56, 189, 248, 0.3)', borderRadius: 6, padding: 14 }}>
                        <div style={{ fontSize: 11, fontWeight: 800, color: '#38bdf8', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                          <Activity size={14} />
                          <span>KÜRESEL STRATEJİK DEPOLAMA & TEDARİK GÜVENCESİ</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 6, padding: '9px 11px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontWeight: 800, color: '#fff', fontSize: 11.5 }}>ABD Stratejik Petrol Rezervi (SPR)</span>
                              <span style={{ color: '#38bdf8', fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: 11 }}>395M Varil</span>
                            </div>
                            <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>Beyaz Saray 72$ altındaki geri alımlarla taban örüyor; acil durum arz tamponu korunuyor.</div>
                          </div>
                          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 6, padding: '9px 11px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontWeight: 800, color: '#fff', fontSize: 11.5 }}>Avrupa Doğalgaz Depoları</span>
                              <span style={{ color: '#34d399', fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: 11 }}>%94 Doluluk</span>
                            </div>
                            <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>Kış sezonu öncesi rekor doluluk; kıtada akut bir enerji krizi riskini bertaraf etti.</div>
                          </div>
                          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 6, padding: '9px 11px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontWeight: 800, color: '#fff', fontSize: 11.5 }}>Çin Stratejik Stoklama Hızı</span>
                              <span style={{ color: '#fbbf24', fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: 11 }}>+1.1M v/g Net</span>
                            </div>
                            <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>Pekin ucuz petrol ortamında depolarını doldurarak küresel fiziki talebe taban oluşturuyor.</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : variantIndex === 2 ? (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                      {/* Left: GPR Geopolitical Risk Index */}
                      <div style={{ background: '#070a12', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 6, padding: 14 }}>
                        <div style={{ fontSize: 11, fontWeight: 800, color: '#f87171', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                          <ShieldAlert size={14} />
                          <span>GPR JEOPOLİTİK RİSK ENDEKSİ (142.8 PUAN)</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          <div style={{ background: 'rgba(239, 68, 68, 0.08)', borderRadius: 6, padding: '10px 12px', borderLeft: '3px solid #ef4444' }}>
                            <div style={{ fontWeight: 800, color: '#fff', fontSize: 11.5 }}>Hürmüz Gerilim Katsayısı: Ortalamanın +%38 Üstü</div>
                            <div style={{ fontSize: 10.5, color: '#cbd5e1', marginTop: 2 }}>Navlun ve deniz savaş riski sigorta primleri yakından izleniyor; armatörler alternatif rotaları değerlendiriyor.</div>
                          </div>
                          <div style={{ background: 'rgba(245, 158, 11, 0.08)', borderRadius: 6, padding: '10px 12px', borderLeft: '3px solid #f59e0b' }}>
                            <div style={{ fontWeight: 800, color: '#fff', fontSize: 11.5 }}>Süveyş Geçişlerinde %55 Düşüş</div>
                            <div style={{ fontSize: 10.5, color: '#cbd5e1', marginTop: 2 }}>Kızıldeniz yerine Ümit Burnu'na sapan gemiler sefer başına 12-14 gün ek transit süresi yazıyor.</div>
                          </div>
                          <div style={{ background: 'rgba(56, 189, 248, 0.08)', borderRadius: 6, padding: '10px 12px', borderLeft: '3px solid #38bdf8' }}>
                            <div style={{ fontWeight: 800, color: '#fff', fontSize: 11.5 }}>LNG & Kritik Tedarik Zinciri</div>
                            <div style={{ fontSize: 10.5, color: '#cbd5e1', marginTop: 2 }}>Körfez menşeli sıvılaştırılmış gaz (LNG) sevkiyatı alternatif hatlarla küresel pazarlara taşınıyor.</div>
                          </div>
                        </div>
                      </div>

                      {/* Right: 4-Layer Crisis Transmission */}
                      <div style={{ background: '#070a12', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: 6, padding: 14 }}>
                        <div style={{ fontSize: 11, fontWeight: 800, color: '#fbbf24', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                          <Zap size={14} />
                          <span>4 KATMANLI KRİZ SENARYOSU & PİYASA ETKİSİ</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                          {[
                            { num: '1', title: 'Brent Petrol Fiyat Kalkanı', desc: `$${fmt(brent.price, 2)} seviyesinde tutunma; enflasyon düşüş hızına direnç oluşturuyor`, col: '#ef4444' },
                            { num: '2', title: 'Güvenli Liman Rotasyonu', desc: 'Ons altında $4.180+ kurumsal dip desteği ve nakit dolara yönelim', col: '#f97316' },
                            { num: '3', title: 'ABD Tahvil Faizi Eşiği', desc: '10 yıllık faizin %4.00 üzerinde kalması; küresel faiz indirimlerini erteleme riski', col: '#eab308' },
                            { num: '4', title: 'Sektörel Ayrışma', desc: 'Savunma ve enerji şirketleri yükselirken, havacılık ve lojistikte yakıt marj baskısı', col: '#10b981' }
                          ].map(item => (
                            <div key={item.num} style={{ display: 'flex', alignItems: 'center', gap: 9, background: 'rgba(255,255,255,0.03)', padding: '6px 10px', borderRadius: 4, borderLeft: `3px solid ${item.col}` }}>
                              <span style={{ fontSize: 10, fontWeight: 900, color: item.col, background: `${item.col}20`, width: 20, height: 20, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                {item.num}
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
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                      {/* Left: Strategic Bottlenecks */}
                      <div style={{ background: '#070a12', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 6, padding: 14 }}>
                        <div style={{ fontSize: 11, fontWeight: 800, color: '#f87171', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                          <Flame size={14} />
                          <span>STRATEJİK BOĞAZLAR & TEDARİK RİSKLERİ</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                          <div style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: 6, padding: '10px 12px' }}>
                            <div style={{ fontWeight: 800, color: '#ffffff', fontSize: 12 }}>💥 Stratejik Boğazlar & Tedarik Güvenliği</div>
                            <div style={{ fontSize: 11, color: '#cbd5e1', marginTop: 2 }}>{customAgenda?.topic2?.title || 'Hürmüz ve Kızıldeniz hattındaki arz güvenliği ve lojistik maliyetleri yakından izleniyor.'}</div>
                          </div>
                          <div style={{ background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.2)', borderRadius: 6, padding: '10px 12px' }}>
                            <div style={{ fontWeight: 800, color: '#ffffff', fontSize: 12 }}>🗳️ Küresel Enerji Politikası & Enflasyon Geçişkenliği</div>
                            <div style={{ fontSize: 11, color: '#cbd5e1', marginTop: 2 }}>Enerji ve akaryakıt maliyetlerindeki yapışkanlık, manşet enflasyonun düşüş hızını sınırlarken merkez bankalarının manevra alanını belirliyor.</div>
                          </div>
                          <div style={{ background: 'rgba(56, 189, 248, 0.08)', border: '1px solid rgba(56, 189, 248, 0.2)', borderRadius: 6, padding: '10px 12px' }}>
                            <div style={{ fontWeight: 800, color: '#ffffff', fontSize: 12 }}>Navlun Maliyetleri & Güvenli Liman Talebi</div>
                            <div style={{ fontSize: 11, color: '#cbd5e1', marginTop: 2 }}>Uzayan rotalar ve tedarik primleri ham madde fiyatlarını diri tutarken akıllı kurumsal sermaye güvenli liman varlıklarına sığınıyor.</div>
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
                            { step: '1', title: 'Stratejik Koridorlar & Tedarik Baskısı', desc: 'Hürmüz ve Kızıldeniz lojistiğinde tedarik ve güvenlik endişeleri', color: '#ef4444' },
                            { step: '2', title: 'Enerji Fiyatları & Rafineri Crack Spread', desc: `Brent petrol $${fmt(brent.price, 2)} bandında dengelenirken rafineri marjları yakından izleniyor`, color: '#f97316' },
                            { step: '3', title: 'Yapışkan Manşet Enflasyon', desc: 'Enerji ve navlun maliyetleri enflasyon düşüş hızına direnç oluşturuyor', color: '#eab308' },
                            { step: '4', title: 'Temkinli Merkez Bankaları', desc: 'Fed ve küresel merkez bankaları faiz indirim adımlarını verilere bağlı tutuyor', color: '#38bdf8' },
                            { step: '5', title: 'Güvenli Limana Kaçış (Altın & Gümüş)', desc: 'Ons altın ve gümüşe tarihi kurumsal taban desteği güçleniyor', color: '#10b981' }
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
                  )
                )}

                {/* SLIDE 3: Central Banks & Real Yield Comparison */}
                {activeSlide.id === 3 && (
                  variantIndex === 1 ? (
                    <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: 14 }}>
                      {/* Left: QT Balance Sheet Reduction */}
                      <div style={{ background: '#070a12', border: '1px solid rgba(56, 189, 248, 0.3)', borderRadius: 6, padding: 14 }}>
                        <div style={{ fontSize: 11, fontWeight: 800, color: '#38bdf8', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Activity size={14} />
                          <span>FED BİLANÇO DARALMASI (QT) & KÜRESEL LİKİDİTE</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          <div style={{ background: 'rgba(56, 189, 248, 0.08)', borderRadius: 6, padding: '9px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <div style={{ fontSize: 11.5, fontWeight: 800, color: '#fff' }}>Fed Bilanço Büyüklüğü</div>
                              <div style={{ fontSize: 9.5, color: '#94a3b8' }}>Zirve $8.9 Trilyondan $1.8 Trilyon eritildi</div>
                            </div>
                            <span style={{ fontSize: 15, fontWeight: 900, color: '#38bdf8', fontFamily: 'var(--font-mono)' }}>$7.1 Trilyon</span>
                          </div>
                          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 6, padding: '9px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <div style={{ fontSize: 11.5, fontWeight: 800, color: '#fff' }}>Gecelik Ters Repo (RRP) Bakiyesi</div>
                              <div style={{ fontSize: 9.5, color: '#94a3b8' }}>2T $'dan taban seviyesine indi</div>
                            </div>
                            <span style={{ fontSize: 15, fontWeight: 900, color: '#fbbf24', fontFamily: 'var(--font-mono)' }}>$245 Milyar</span>
                          </div>
                          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 6, padding: '9px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <div style={{ fontSize: 11.5, fontWeight: 800, color: '#fff' }}>Banka Rezervleri (Ample Reserves)</div>
                              <div style={{ fontSize: 9.5, color: '#94a3b8' }}>Konforlu eşiğin güvenli üzerinde</div>
                            </div>
                            <span style={{ fontSize: 15, fontWeight: 900, color: '#34d399', fontFamily: 'var(--font-mono)' }}>$3.2 Trilyon</span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Turkey Disinflation Dynamic */}
                      <div style={{ background: '#070a12', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: 6, padding: 14 }}>
                        <div style={{ fontSize: 11, fontWeight: 800, color: '#34d399', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                          <ShieldCheck size={14} />
                          <span>TCMB DEZENFLASYON & REZERV TAHKİMİ</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          <div style={{ background: 'rgba(16, 185, 129, 0.08)', borderRadius: 6, padding: '9px 12px' }}>
                            <div style={{ fontWeight: 800, color: '#fff', fontSize: 11.5 }}>1. Swap Hariç Net Rezervler Artıda</div>
                            <div style={{ fontSize: 10, color: '#cbd5e1', marginTop: 2 }}>Tarihi toparlanma süreciyle TCMB'nin döviz kuru üzerindeki manevra alanı en yüksek seviyede.</div>
                          </div>
                          <div style={{ background: 'rgba(56, 189, 248, 0.08)', borderRadius: 6, padding: '9px 12px' }}>
                            <div style={{ fontWeight: 800, color: '#fff', fontSize: 11.5 }}>2. KKM Bakiyesi Düzenli Eriyor</div>
                            <div style={{ fontSize: 10, color: '#cbd5e1', marginTop: 2 }}>Tasarruf sahipleri kur garantili sistemden çıkarak doğrudan standart TL mevduata yöneliyor.</div>
                          </div>
                          <div style={{ background: 'rgba(245, 158, 11, 0.08)', borderRadius: 6, padding: '9px 12px' }}>
                            <div style={{ fontWeight: 800, color: '#fff', fontSize: 11.5 }}>3. Yabancı Tahvil ve Swap Girişleri</div>
                            <div style={{ fontSize: 10, color: '#cbd5e1', marginTop: 2 }}>Yüksek reel faiz TL varlıkları yabancı fonlar için küresel ölçekte en cazip carry trade kılıyor.</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : variantIndex === 2 ? (
                    <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: 14 }}>
                      {/* Left: Services vs Goods Inflation */}
                      <div style={{ background: '#070a12', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 6, padding: 14 }}>
                        <div style={{ fontSize: 11, fontWeight: 800, color: '#f87171', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Flame size={14} />
                          <span>HİZMET vs MAL ENFLASYONU AYRIŞMASI</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          <div style={{ background: 'rgba(239, 68, 68, 0.08)', borderRadius: 6, padding: '9px 12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontWeight: 800, color: '#fff', fontSize: 11.5 }}>ABD Çekirdek Hizmetler (Supercore)</span>
                              <span style={{ color: '#f87171', fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: 11 }}>%3.8 (Yapışkan)</span>
                            </div>
                            <div style={{ fontSize: 10, color: '#cbd5e1', marginTop: 2 }}>Kira, sağlık ve işgücü maliyetleri Fed'in aceleci faiz indirimlerine set çekiyor.</div>
                          </div>
                          <div style={{ background: 'rgba(16, 185, 129, 0.08)', borderRadius: 6, padding: '9px 12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontWeight: 800, color: '#fff', fontSize: 11.5 }}>Küresel Dayanıklı Mal Fiyatları</span>
                              <span style={{ color: '#34d399', fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: 11 }}>-%0.6 (Deflasyonist)</span>
                            </div>
                            <div style={{ fontSize: 10, color: '#cbd5e1', marginTop: 2 }}>Çin'in ucuz fabrika ihracatı dünya genelinde mal enflasyonunu hızla aşağı çekiyor.</div>
                          </div>
                          <div style={{ background: 'rgba(245, 158, 11, 0.08)', borderRadius: 6, padding: '9px 12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontWeight: 800, color: '#fff', fontSize: 11.5 }}>Türkiye Kira & Hizmet Atalet Eşiği</span>
                              <span style={{ color: '#fbbf24', fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: 11 }}>%55+ Yıllık</span>
                            </div>
                            <div style={{ fontSize: 10, color: '#cbd5e1', marginTop: 2 }}>TCMB, dezenflasyonu kalıcı kılmak için iç talebi ve kredi büyümesini kısıtlamaya devam ediyor.</div>
                          </div>
                        </div>
                      </div>

                      {/* Right: Central Banks Rate Cut Roadmap */}
                      <div style={{ background: '#070a12', border: '1px solid rgba(56, 189, 248, 0.3)', borderRadius: 6, padding: 14 }}>
                        <div style={{ fontSize: 11, fontWeight: 800, color: '#38bdf8', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                          <Compass size={14} />
                          <span>KÜRESEL MERKEZ BANKALARI İNDİRİM YOL HARİTASI</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 6, padding: '8px 11px', borderLeft: '3px solid #38bdf8' }}>
                            <div style={{ fontWeight: 800, color: '#fff', fontSize: 11 }}>🇺🇸 Federal Reserve (Fed)</div>
                            <div style={{ fontSize: 10, color: '#94a3b8' }}>28 Ekim FOMC'de faizin %3.75 - %4.00 bandında sabit kalması; Aralık toplantısında ise enflasyon yapışkanlığına bağlı 25 bp faiz artışı veya şahin duruş riski.</div>
                          </div>
                          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 6, padding: '8px 11px', borderLeft: '3px solid #fbbf24' }}>
                            <div style={{ fontWeight: 800, color: '#fff', fontSize: 11 }}>🇪🇺 Avrupa Merkez Bankası (ECB)</div>
                            <div style={{ fontSize: 10, color: '#94a3b8' }}>Zayıflayan imalat PMI verileri sebebiyle Fed'den daha agresif indirim temposu.</div>
                          </div>
                          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 6, padding: '8px 11px', borderLeft: '3px solid #34d399' }}>
                            <div style={{ fontWeight: 800, color: '#fff', fontSize: 11 }}>🇹🇷 TCMB (Türkiye)</div>
                            <div style={{ fontSize: 10, color: '#94a3b8' }}>Politika faizi %37; enflasyon ana eğilimi teyit edildikçe ölçülü ve temkinli gevşeme.</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
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
                              <td style={{ padding: '8px 8px', textAlign: 'right', fontWeight: 800, color: '#fff' }}>%{fmt(quotes?.tcmbRate ?? 36, 2)}</td>
                              <td style={{ padding: '8px 8px', textAlign: 'right', color: '#cbd5e1' }}>%{fmt(quotes?.turkeyCPI ?? 29.73, 2)}</td>
                              <td style={{ padding: '8px 8px', textAlign: 'right', fontWeight: 900, color: '#34d399', fontSize: 12 }}>+{fmt((quotes?.tcmbRate ?? 36) - (quotes?.turkeyCPI ?? 29.73), 2)} Puan</td>
                            </tr>
                            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                              <td style={{ padding: '8px 8px', fontWeight: 700, color: '#fff' }}>🇺🇸 Fed (ABD)</td>
                              <td style={{ padding: '8px 8px', textAlign: 'right', fontWeight: 700, color: '#fff' }}>%3.75 - 4.00</td>
                              <td style={{ padding: '8px 8px', textAlign: 'right', color: '#cbd5e1' }}>%{fmt(pulse?.truflation?.rate || pulse?.inflation?.usa || 3.09, 2)}</td>
                              <td style={{ padding: '8px 8px', textAlign: 'right', fontWeight: 700, color: '#38bdf8' }}>+{fmt(Math.max(0, 3.875 - (pulse?.truflation?.rate || pulse?.inflation?.usa || 3.09)), 2)} Puan</td>
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
                  )
                )}

                {/* SLIDE 4: Wall Street & AI Ecosystem */}
                {activeSlide.id === 4 && (
                  variantIndex === 1 ? (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                      {/* Left: Big Tech AI Capex */}
                      <div style={{ background: '#070a12', border: '1px solid rgba(56, 189, 248, 0.3)', borderRadius: 6, padding: 14 }}>
                        <div style={{ fontSize: 11, fontWeight: 800, color: '#38bdf8', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <BarChart3 size={14} />
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
                            <div key={i} style={{ background: 'rgba(255,255,255,0.025)', border: `1px solid ${c.col}25`, borderRadius: 6, padding: '7px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div>
                                <div style={{ fontSize: 11, fontWeight: 800, color: '#fff' }}>{c.sym}</div>
                                <div style={{ fontSize: 9.5, color: '#94a3b8' }}>{c.note}</div>
                              </div>
                              <span style={{ fontSize: 13, fontWeight: 900, color: c.col, fontFamily: 'var(--font-mono)' }}>{c.amount}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Right: AI Value Chain */}
                      <div style={{ background: '#070a12', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: 6, padding: 14 }}>
                        <div style={{ fontSize: 11, fontWeight: 800, color: '#34d399', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Sparkles size={14} />
                          <span>YAPAY ZEKA DEĞER ZİNCİRİ KATMANLARI</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                          <div style={{ background: 'rgba(16, 185, 129, 0.08)', borderRadius: 6, padding: '8px 11px', borderLeft: '3px solid #10b981' }}>
                            <div style={{ fontWeight: 800, color: '#fff', fontSize: 11.5 }}>1. Çip & Dökümhane (NVIDIA, TSMC, Broadcom)</div>
                            <div style={{ fontSize: 10, color: '#cbd5e1' }}>Yapay zeka modellerinin eğitildiği temel işlemciler; %90+ pazar hâkimiyeti.</div>
                          </div>
                          <div style={{ background: 'rgba(56, 189, 248, 0.08)', borderRadius: 6, padding: '8px 11px', borderLeft: '3px solid #38bdf8' }}>
                            <div style={{ fontWeight: 800, color: '#fff', fontSize: 11.5 }}>2. Optik Ağ & Donanım (Arista Networks, Supermicro)</div>
                            <div style={{ fontSize: 10, color: '#cbd5e1' }}>Binlerce GPU'yu birbirine bağlayan ultra hızlı sunucu ve optik anahtar ağı.</div>
                          </div>
                          <div style={{ background: 'rgba(245, 158, 11, 0.08)', borderRadius: 6, padding: '8px 11px', borderLeft: '3px solid #f59e0b' }}>
                            <div style={{ fontWeight: 800, color: '#fff', fontSize: 11.5 }}>3. Temiz Enerji & Nükleer (Constellation, Vistra)</div>
                            <div style={{ fontSize: 10, color: '#cbd5e1' }}>Yapay zeka sunucularının devasa 7/24 elektrik ihtiyacı için nükleer enerji anlaşmaları.</div>
                          </div>
                          <div style={{ background: 'rgba(192, 132, 252, 0.08)', borderRadius: 6, padding: '8px 11px', borderLeft: '3px solid #c084fc' }}>
                            <div style={{ fontWeight: 800, color: '#fff', fontSize: 11.5 }}>4. Kurumsal Yazılım (Microsoft Copilot, Palantir)</div>
                            <div style={{ fontSize: 10, color: '#cbd5e1' }}>Yapay zekayı doğrudan şirketlerin nakit akışına ve kârlılığına dönüştüren yazılımlar.</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : variantIndex === 2 ? (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                      {/* Left: S&P 500 Valuation & Forward P/E */}
                      <div style={{ background: '#070a12', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: 6, padding: 14 }}>
                        <div style={{ fontSize: 11, fontWeight: 800, color: '#fbbf24', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <BarChart3 size={14} />
                          <span>S&P 500 İLERİ F/K ÇARPANLARI & DEĞERLEME</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          <div style={{ background: 'rgba(245, 158, 11, 0.08)', borderRadius: 6, padding: '9px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <div style={{ fontSize: 11.5, fontWeight: 800, color: '#fff' }}>S&P 500 Ağırlıklı F/K</div>
                              <div style={{ fontSize: 9.5, color: '#94a3b8' }}>5 yıllık ortalama 19.2x; teknoloji devlerinin ağırlığı yüksek</div>
                            </div>
                            <span style={{ fontSize: 15, fontWeight: 900, color: '#fbbf24', fontFamily: 'var(--font-mono)' }}>21.4x</span>
                          </div>
                          <div style={{ background: 'rgba(16, 185, 129, 0.08)', borderRadius: 6, padding: '9px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <div style={{ fontSize: 11.5, fontWeight: 800, color: '#fff' }}>Eşit Ağırlıklı S&P 500 (RSP) F/K</div>
                              <div style={{ fontSize: 9.5, color: '#94a3b8' }}>Tarihsel ortalamaya çok daha yakın ve makul değer</div>
                            </div>
                            <span style={{ fontSize: 15, fontWeight: 900, color: '#34d399', fontFamily: 'var(--font-mono)' }}>16.8x</span>
                          </div>
                          <div style={{ background: 'rgba(56, 189, 248, 0.08)', borderRadius: 6, padding: '9px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <div style={{ fontSize: 11.5, fontWeight: 800, color: '#fff' }}>Mag-7 Dışı Kâr Büyümesi</div>
                              <div style={{ fontSize: 9.5, color: '#94a3b8' }}>Geniş tabanlı sektörlerde kârlılık ivmeleniyor</div>
                            </div>
                            <span style={{ fontSize: 15, fontWeight: 900, color: '#38bdf8', fontFamily: 'var(--font-mono)' }}>+%7.4 Yıllık</span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Market Breadth & Rotation */}
                      <div style={{ background: '#070a12', border: '1px solid var(--border)', borderRadius: 6, padding: 14 }}>
                        <div style={{ fontSize: 11, fontWeight: 800, color: '#e2e8f0', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Zap size={14} />
                          <span>SERMAYE ROTASYONU & PİYASA DERİNLİĞİ</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 6, padding: '9px 12px' }}>
                            <div style={{ fontWeight: 800, color: '#fff', fontSize: 11.5 }}>Finans & Büyük Bankalar</div>
                            <div style={{ fontSize: 10, color: '#94a3b8' }}>Sağlam kredi portföyleri ve birleşme/satın alma (M&A) gelirleriyle defansif güç.</div>
                          </div>
                          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 6, padding: '9px 12px' }}>
                            <div style={{ fontWeight: 800, color: '#fff', fontSize: 11.5 }}>Russell 2000 Küçük Ölçekli Şirketler</div>
                            <div style={{ fontSize: 10, color: '#94a3b8' }}>Düşen faizlerle birlikte borç maliyetleri rahatlayan KOBİ'lerde toparlanma potansiyeli.</div>
                          </div>
                          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 6, padding: '9px 12px' }}>
                            <div style={{ fontWeight: 800, color: '#fff', fontSize: 11.5 }}>Sanayi & İmalat (Onshoring)</div>
                            <div style={{ fontSize: 10, color: '#94a3b8' }}>Fabrika yatırımlarının ABD'ye dönüşü altyapı ve mühendislik şirketlerini destekliyor.</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
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
                            { sym: 'TSMC', note: 'Gelişmiş N3/N2 Dökümhane Kapasitesi', tag: 'Dökümhane Tekeli', color: '#38bdf8' },
                            { sym: 'AMAZON', note: 'AWS Bulut Marjları & Nakit Akışı', tag: 'Bulut Gücü', color: '#38bdf8' },
                            { sym: 'ALPHABET', note: 'Gemini AI & 22 F/K Çarpanı', tag: 'Makul Değer', color: '#818cf8' },
                            { sym: 'META', note: 'AI Destekli Reklam Gelirleri', tag: 'Yüksek Marj', color: '#ec4899' },
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
                  )
                )}

                {/* SLIDE 5: Commodities (Gold & Silver Channels) */}
                {activeSlide.id === 5 && (
                  variantIndex === 1 ? (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                      {/* Left: Gold / Silver Ratio */}
                      <div style={{ background: '#070a12', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: 6, padding: 14 }}>
                        <div style={{ fontSize: 11, fontWeight: 800, color: '#fbbf24', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                          <Coins size={14} />
                          <span>ALTIN / GÜMÜŞ RASYOSU (GOLD/SILVER RATIO: ~68.5x)</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          <div style={{ background: 'rgba(245, 158, 11, 0.08)', borderRadius: 6, padding: '10px 12px' }}>
                            <div style={{ fontWeight: 800, color: '#fff', fontSize: 12 }}>Gümüşte Sanayi ve Fotovoltaik Patlaması</div>
                            <div style={{ fontSize: 10.5, color: '#cbd5e1', marginTop: 2 }}>Güneş paneli ve elektrikli araç üretimi gümüş talebini tarihin en yüksek seviyesine çıkardı.</div>
                          </div>
                          <div style={{ background: 'rgba(56, 189, 248, 0.08)', borderRadius: 6, padding: '10px 12px' }}>
                            <div style={{ fontWeight: 800, color: '#fff', fontSize: 12 }}>Arz Açığı: Üst Üste 4. Yıl Açık Veriliyor</div>
                            <div style={{ fontSize: 10.5, color: '#cbd5e1', marginTop: 2 }}>Maden üretimi yeni sanayi talebine yetişemiyor; yer üstü stokları hızla eriyor.</div>
                          </div>
                          <div style={{ background: 'rgba(16, 185, 129, 0.08)', borderRadius: 6, padding: '10px 12px' }}>
                            <div style={{ fontWeight: 800, color: '#34d399', fontSize: 12 }}>Rasyoda Normalleşme Potansiyeli</div>
                            <div style={{ fontSize: 10.5, color: '#cbd5e1', marginTop: 2 }}>Rasyonun 65x seviyelerine çekilmesi durumunda gümüşün altına göre daha yüksek prim yapması bekleniyor.</div>
                          </div>
                        </div>
                      </div>

                      {/* Right: Commodity Supercycle & Strategic Metals */}
                      <div style={{ background: '#070a12', border: '1px solid var(--border)', borderRadius: 6, padding: 14 }}>
                        <div style={{ fontSize: 11, fontWeight: 800, color: '#e2e8f0', marginBottom: 10 }}>
                          🏛️ EMTİA SÜPER DÖNGÜSÜ & STRATEJİK METALLER
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 6, padding: '9px 12px' }}>
                            <div style={{ fontWeight: 800, color: '#fbbf24', fontSize: 11.5 }}>Bakır (Dr. Copper): $9.800 / Ton Desteği</div>
                            <div style={{ fontSize: 10, color: '#cbd5e1', marginTop: 2 }}>Yapay zeka veri merkezleri ve şebeke modernizasyonu küresel bakır talebini diri tutuyor.</div>
                          </div>
                          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 6, padding: '9px 12px' }}>
                            <div style={{ fontWeight: 800, color: '#38bdf8', fontSize: 11.5 }}>Platin & Paladyum: Katalizör & Hidrojen</div>
                            <div style={{ fontSize: 10, color: '#cbd5e1', marginTop: 2 }}>Hibrit araç satışlarının artması paladyum talebini desteklerken arz kısıtları devrede.</div>
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
                  ) : variantIndex === 2 ? (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                      {/* Left: Real Yields vs Gold Decoupling */}
                      <div style={{ background: '#070a12', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: 6, padding: 14 }}>
                        <div style={{ fontSize: 11, fontWeight: 800, color: '#fbbf24', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                          <Coins size={14} />
                          <span>ALTIN vs REEL FAİZ AYRIŞMASI (YENİ PARADİGMA)</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          <div style={{ background: 'rgba(245, 158, 11, 0.08)', borderRadius: 6, padding: '10px 12px' }}>
                            <div style={{ fontWeight: 800, color: '#fff', fontSize: 12 }}>Tarihsel Kural Yıkıldı</div>
                            <div style={{ fontSize: 10.5, color: '#cbd5e1', marginTop: 2 }}>ABD 10Y Reel Getirisi (TIPS) %1.85 gibi yüksek seviyedeyken normalde düşmesi gereken altın rekor kırıyor.</div>
                          </div>
                          <div style={{ background: 'rgba(56, 189, 248, 0.08)', borderRadius: 6, padding: '10px 12px' }}>
                            <div style={{ fontWeight: 800, color: '#fff', fontSize: 12 }}>Rezerv Güvenliği Kalkanı</div>
                            <div style={{ fontSize: 10.5, color: '#cbd5e1', marginTop: 2 }}>Yaptırım riskleri karşısında merkez bankaları Batı devlet tahvillerini satıp fiziki altına dönüştürüyor.</div>
                          </div>
                          <div style={{ background: 'rgba(16, 185, 129, 0.08)', borderRadius: 6, padding: '10px 12px' }}>
                            <div style={{ fontWeight: 800, color: '#34d399', fontSize: 12 }}>Rezervlerde Dolar Payı Geriliyor</div>
                            <div style={{ fontSize: 10.5, color: '#cbd5e1', marginTop: 2 }}>Küresel rezervlerde dolar payı %71'den %58'e inerken altın payı %18 seviyesine tırmandı.</div>
                          </div>
                        </div>
                      </div>

                      {/* Right: BRICS Gold Accumulation */}
                      <div style={{ background: '#070a12', border: '1px solid var(--border)', borderRadius: 6, padding: 14 }}>
                        <div style={{ fontSize: 11, fontWeight: 800, color: '#e2e8f0', marginBottom: 10 }}>
                          🏛️ BRICS FİZİKİ ALTIN AKIŞI & ŞANGHAY PRİMİ
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 6, padding: '9px 12px' }}>
                            <div style={{ fontWeight: 800, color: '#fbbf24', fontSize: 11.5 }}>Şanghay Altın Borsası (SGE) Primi</div>
                            <div style={{ fontSize: 10, color: '#cbd5e1', marginTop: 2 }}>Londra ve New York fiyatlarına göre fiziki teslimatlı altın ons başına +$15 - $25 primli işlem görüyor.</div>
                          </div>
                          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 6, padding: '9px 12px' }}>
                            <div style={{ fontWeight: 800, color: '#38bdf8', fontSize: 11.5 }}>İkili Ticarette Altın Teminatı</div>
                            <div style={{ fontSize: 10, color: '#cbd5e1', marginTop: 2 }}>Enerji ve hammadde takaslarında yerel paraların karşılığı fiziki altın depolarıyla garanti altına alınıyor.</div>
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
                  ) : (
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
                            <div style={{ fontWeight: 800, color: '#38bdf8', fontSize: 12 }}>2. Küresel Jeopolitik & Portföy Sigortası Primi</div>
                            <div style={{ fontSize: 10.5, color: '#cbd5e1', marginTop: 3 }}>Bölgesel gerilimler, ticaret koridoru belirsizlikleri ve küresel borç dinamikleri karşısında akıllı kurumsal sermaye güvenli liman olarak fiziki altın ve gümüşe sığınıyor.</div>
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
                  )
                )}

                {/* SLIDE 6: Dollar & Yield Curve Normalization */}
                {activeSlide.id === 6 && (
                  variantIndex === 1 ? (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                      {/* Left: DXY Basket Currencies */}
                      <div style={{ background: '#070a12', border: '1px solid rgba(56, 189, 248, 0.3)', borderRadius: 6, padding: 14 }}>
                        <div style={{ fontSize: 11, fontWeight: 800, color: '#38bdf8', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                          <DollarSign size={14} />
                          <span>DXY DOLAR SEPETİ DAĞILIMI & PARİTELER</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 6, padding: '9px 12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span style={{ fontWeight: 800, color: '#fff', fontSize: 11.5 }}>Euro (EUR/USD - %57.6 Sepet)</span>
                              <span style={{ color: '#38bdf8', fontFamily: 'var(--font-mono)', fontWeight: 800 }}>1.0820</span>
                            </div>
                            <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>Avrupa sanayi yavaşlaması ve ECB indirimleri pariteyi baskılıyor.</div>
                          </div>
                          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 6, padding: '9px 12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span style={{ fontWeight: 800, color: '#fff', fontSize: 11.5 }}>Japon Yeni (USD/JPY - %13.6 Sepet)</span>
                              <span style={{ color: '#fbbf24', fontFamily: 'var(--font-mono)', fontWeight: 800 }}>148.50</span>
                            </div>
                            <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>BoJ faiz artışı sinyalleri Carry Trade çözülme hassasiyetini diri tutuyor.</div>
                          </div>
                          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 6, padding: '9px 12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span style={{ fontWeight: 800, color: '#fff', fontSize: 11.5 }}>DXY Endeks Mukavemeti</span>
                              <span style={{ color: 'var(--cyan)', fontFamily: 'var(--font-mono)', fontWeight: 800 }}>{fmt(dxy.price, 3)}</span>
                            </div>
                            <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>100 kritik tabanının üzerinde kalarak gelişmekte olan paralara karşı güçlü.</div>
                          </div>
                        </div>
                      </div>

                      {/* Right: Turkish Lira & Carry Trade */}
                      <div style={{ background: '#070a12', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: 6, padding: 14 }}>
                        <div style={{ fontSize: 11, fontWeight: 800, color: '#34d399', marginBottom: 12 }}>
                          🇹🇷 TÜRK LİRASI & CARRY TRADE VERİMİ
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          <div style={{ background: 'rgba(16, 185, 129, 0.08)', borderRadius: 6, padding: '10px 12px' }}>
                            <div style={{ fontWeight: 800, color: '#fff', fontSize: 11.5 }}>Net TL Carry Trade Üstünlüğü</div>
                            <div style={{ fontSize: 10, color: '#cbd5e1', marginTop: 2 }}>%{quotes?.tcmbRate ?? 36} politika faizi ve kontrollü kur oynaklığı TL'yi gelişmekte olan piyasalar arasında 1 numara yapıyor.</div>
                          </div>
                          <div style={{ background: 'rgba(56, 189, 248, 0.08)', borderRadius: 6, padding: '10px 12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span style={{ fontWeight: 800, color: '#fff', fontSize: 11.5 }}>USD / TRY Kontrollü Patika</span>
                              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, color: '#34d399' }}>{fmt(currentUsdTry, 2)} ₺</span>
                            </div>
                            <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>Aylık kur artışının enflasyonun altında kalması yerli ve yabancı yatırımcıyı TL'de tutuyor.</div>
                          </div>
                          <div style={{ background: 'rgba(245, 158, 11, 0.08)', borderRadius: 6, padding: '10px 12px' }}>
                            <div style={{ fontWeight: 800, color: '#fff', fontSize: 11.5 }}>Yıllık Bileşik TL Mevduat Getirisi</div>
                            <div style={{ fontSize: 10, color: '#cbd5e1', marginTop: 2 }}>%45 - %48 aralığındaki risksiz getiri dolar talebini tamamen dizginliyor.</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : variantIndex === 2 ? (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                      {/* Left: US Debt & Treasury Auctions */}
                      <div style={{ background: '#070a12', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 6, padding: 14 }}>
                        <div style={{ fontSize: 11, fontWeight: 800, color: '#f87171', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                          <Activity size={14} />
                          <span>ABD HAZİNE İHALELERİ & BORÇLANMA TEMPOSU</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          <div style={{ background: 'rgba(239, 68, 68, 0.08)', borderRadius: 6, padding: '10px 12px' }}>
                            <div style={{ fontWeight: 800, color: '#fff', fontSize: 11.5 }}>35 Trilyon Dolar Kamu Borcu</div>
                            <div style={{ fontSize: 10, color: '#cbd5e1', marginTop: 2 }}>Yıllık 1 Trilyon Doları aşan faiz ödemeleri ABD bütçesinde yapısal açık oluşturuyor.</div>
                          </div>
                          <div style={{ background: 'rgba(56, 189, 248, 0.08)', borderRadius: 6, padding: '10px 12px' }}>
                            <div style={{ fontWeight: 800, color: '#fff', fontSize: 11.5 }}>Birincil Bayi Talep Oranı (2.52x)</div>
                            <div style={{ fontSize: 10, color: '#cbd5e1', marginTop: 2 }}>10 yıllık tahvil ihalelerinde yabancı merkez bankaları ve kurumsal fonların talebi sağlıklı.</div>
                          </div>
                          <div style={{ background: 'rgba(245, 158, 11, 0.08)', borderRadius: 6, padding: '10px 12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span style={{ fontWeight: 800, color: '#fff', fontSize: 11.5 }}>ABD 10 Yıllık Tahvil Faizi</span>
                              <span style={{ color: '#fbbf24', fontFamily: 'var(--font-mono)', fontWeight: 800 }}>%{fmt(us10y.price, 2)}</span>
                            </div>
                            <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>Faizlerin %4 civarında kalması hisse senedi çarpanlarına sınır koyuyor.</div>
                          </div>
                        </div>
                      </div>

                      {/* Right: Turkey Eurobond & CDS */}
                      <div style={{ background: '#070a12', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: 6, padding: 14 }}>
                        <div style={{ fontSize: 11, fontWeight: 800, color: '#34d399', marginBottom: 12 }}>
                          🇹🇷 TÜRKİYE EUROBOND & 216 BP CDS
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          <div style={{ background: 'rgba(16, 185, 129, 0.08)', borderRadius: 6, padding: '10px 12px' }}>
                            <div style={{ fontWeight: 800, color: '#fff', fontSize: 11.5 }}>5 Yıllık CDS: 216 Baz Puan</div>
                            <div style={{ fontSize: 10, color: '#cbd5e1', marginTop: 2 }}>Son 4 yılın en olumlu risk algısı; Hazine ve bankaların borçlanma maliyeti hızla düşüyor.</div>
                          </div>
                          <div style={{ background: 'rgba(56, 189, 248, 0.08)', borderRadius: 6, padding: '10px 12px' }}>
                            <div style={{ fontWeight: 800, color: '#fff', fontSize: 11.5 }}>Hazine Eurobond İhraçları</div>
                            <div style={{ fontSize: 10, color: '#cbd5e1', marginTop: 2 }}>10 yıllık dolar cinsi tahvil faizi %6.80 bandında istikrar kazandı; talep katlanarak artıyor.</div>
                          </div>
                          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 6, padding: '10px 12px' }}>
                            <div style={{ fontWeight: 800, color: '#fff', fontSize: 11.5 }}>Kredi Notu Artış Beklentisi</div>
                            <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>Uluslararası derecelendirme kuruluşlarının pozitif görünümü sermaye girişini tetikliyor.</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
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
                  )
                )}

                {/* SLIDE 7: Crypto & Spot ETF */}
                {activeSlide.id === 7 && (
                  variantIndex === 1 ? (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                      {/* Left: BTC Dominance & Altcoins */}
                      <div style={{ background: '#070a12', border: '1px solid rgba(139, 92, 246, 0.3)', borderRadius: 6, padding: 14 }}>
                        <div style={{ fontSize: 11, fontWeight: 800, color: '#a78bfa', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                          <Coins size={14} />
                          <span>BTC DOMINANCE (%58.8) & SERMAYE DÖNGÜSÜ</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          <div style={{ background: 'rgba(139, 92, 246, 0.08)', borderRadius: 6, padding: '10px 12px' }}>
                            <div style={{ fontWeight: 800, color: '#fff', fontSize: 11.5 }}>Bitcoin Hakimiyeti (%58.8) Tepe Bölgesinde</div>
                            <div style={{ fontSize: 10, color: '#cbd5e1', marginTop: 2 }}>Kurumsal para öncelikle Bitcoin'e girdi; tarihsel döngülerde BTC konsolide olmadan altcoin rallisi başlamaz.</div>
                          </div>
                          <div style={{ background: 'rgba(56, 189, 248, 0.08)', borderRadius: 6, padding: '10px 12px' }}>
                            <div style={{ fontWeight: 800, color: '#fff', fontSize: 11.5 }}>Ethereum / Bitcoin (ETH/BTC: 0.038) Dibi</div>
                            <div style={{ fontSize: 10, color: '#cbd5e1', marginTop: 2 }}>ETH/BTC paritesi çok yıllık dipte; kurumsal staking getirisi ve L2 ekosistemi taban arıyor.</div>
                          </div>
                          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 6, padding: '10px 12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span style={{ fontWeight: 800, color: '#fff', fontSize: 11.5 }}>TOTAL3 Altcoin Hacmi</span>
                              <span style={{ color: '#a78bfa', fontFamily: 'var(--font-mono)', fontWeight: 800 }}>${fmt(total3.price, 1)}B</span>
                            </div>
                            <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>Seçici Layer-1 ve yapay zeka projelerinde kurumsal akümülasyon sürüyor.</div>
                          </div>
                        </div>
                      </div>

                      {/* Right: Thematic Crypto Sectors */}
                      <div style={{ background: '#070a12', border: '1px solid var(--border)', borderRadius: 6, padding: 14 }}>
                        <div style={{ fontSize: 11, fontWeight: 800, color: '#e2e8f0', marginBottom: 12 }}>
                          🚀 TEMATİK KRİPTO EKOSİSTEMİ & LİDERLERİ
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          <div style={{ background: 'rgba(16, 185, 129, 0.08)', borderRadius: 6, padding: '9px 12px', borderLeft: '3px solid #10b981' }}>
                            <div style={{ fontWeight: 800, color: '#fff', fontSize: 11.5 }}>Yapay Zeka & DePIN (Near, Render, Bittensor)</div>
                            <div style={{ fontSize: 10, color: '#cbd5e1' }}>Dağıtık GPU işlem gücü ve veri madenciliği sağlayan gerçek kullanım odaklı ağlar.</div>
                          </div>
                          <div style={{ background: 'rgba(56, 189, 248, 0.08)', borderRadius: 6, padding: '9px 12px', borderLeft: '3px solid #38bdf8' }}>
                            <div style={{ fontWeight: 800, color: '#fff', fontSize: 11.5 }}>Gerçek Dünya Varlıkları (RWA - ONDO, BUIDL)</div>
                            <div style={{ fontSize: 10, color: '#cbd5e1' }}>BlackRock ve Wall Street'in ABD Hazine tahvillerini blokzincir üzerine taşıma hamlesi.</div>
                          </div>
                          <div style={{ background: 'rgba(245, 158, 11, 0.08)', borderRadius: 6, padding: '9px 12px', borderLeft: '3px solid #f59e0b' }}>
                            <div style={{ fontWeight: 800, color: '#fff', fontSize: 11.5 }}>Yüksek Hızlı Katman-1 (Solana, Sui, Aptos)</div>
                            <div style={{ fontSize: 10, color: '#cbd5e1' }}>Düşük işlem maliyeti ve saniyede binlerce transfer kapasitesiyle perakende liderliği.</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : variantIndex === 2 ? (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                      {/* Left: Exchange Reserves & Miners */}
                      <div style={{ background: '#070a12', border: '1px solid rgba(139, 92, 246, 0.3)', borderRadius: 6, padding: 14 }}>
                        <div style={{ fontSize: 11, fontWeight: 800, color: '#a78bfa', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                          <Activity size={14} />
                          <span>BORSALARDAKİ BTC REZERVLERİ (TARİHİ DİP)</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          <div style={{ background: 'rgba(139, 92, 246, 0.08)', borderRadius: 6, padding: '10px 12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span style={{ fontWeight: 800, color: '#fff', fontSize: 11.5 }}>Borsa Rezervi: 2.1M BTC</span>
                              <span style={{ color: '#a78bfa', fontFamily: 'var(--font-mono)', fontWeight: 800 }}>6 Yılın Dibi</span>
                            </div>
                            <div style={{ fontSize: 10, color: '#cbd5e1', marginTop: 2 }}>Borsalardan soğuk cüzdanlara çekilen coinler arz şoku zeminini hazırlıyor.</div>
                          </div>
                          <div style={{ background: 'rgba(16, 185, 129, 0.08)', borderRadius: 6, padding: '10px 12px' }}>
                            <div style={{ fontWeight: 800, color: '#fff', fontSize: 11.5 }}>Uzun Vadeli Yatırımcı (LTH) Payı: %74</div>
                            <div style={{ fontSize: 10, color: '#cbd5e1', marginTop: 2 }}>Dolaşımdaki arzın dörtte üçü 6 aydan uzun süredir el değiştirmeyerek kilitli duruyor.</div>
                          </div>
                          <div style={{ background: 'rgba(245, 158, 11, 0.08)', borderRadius: 6, padding: '10px 12px' }}>
                            <div style={{ fontWeight: 800, color: '#fff', fontSize: 11.5 }}>Madenci Maliyet Tabanı: $64.000</div>
                            <div style={{ fontSize: 10, color: '#cbd5e1', marginTop: 2 }}>Halving sonrası ortalama elektrik maliyeti madencilerin bu seviye altında satışını engelliyor.</div>
                          </div>
                        </div>
                      </div>

                      {/* Right: Macro & Regulatory Catalysts */}
                      <div style={{ background: '#070a12', border: '1px solid var(--border)', borderRadius: 6, padding: 14 }}>
                        <div style={{ fontSize: 11, fontWeight: 800, color: '#e2e8f0', marginBottom: 12 }}>
                          🎯 DÜZENLEME & KURUMSAL BİRİKİM RADARI
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 6, padding: '9px 12px' }}>
                            <div style={{ fontWeight: 800, color: '#fff', fontSize: 11.5 }}>ABD Kripto Mevzuatı & SEC Netleşmesi</div>
                            <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>Hukuki çerçevenin berraklaşması emeklilik fonları ve sigorta devlerini cesaretlendiriyor.</div>
                          </div>
                          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 6, padding: '9px 12px' }}>
                            <div style={{ fontWeight: 800, color: '#fff', fontSize: 11.5 }}>Kurumsal Şirket Hazine Stratejileri</div>
                            <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>MicroStrategy ve benzeri şirketler hisse ve borçlanma yoluyla kesintisiz BTC topluyor.</div>
                          </div>
                          <div style={{ background: 'rgba(16, 185, 129, 0.08)', borderRadius: 6, padding: '9px 12px' }}>
                            <div style={{ fontWeight: 800, color: '#34d399', fontSize: 11.5 }}>Kritik Koridor: $85.000 Destek / $90.000 Hedef</div>
                            <div style={{ fontSize: 10, color: '#cbd5e1', marginTop: 2 }}>87.500$ üzerinde haftalık kapanış tarihi psikolojik hedef kapısını aralar.</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
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
                  )
                )}

                {/* SLIDE 8: BIST 100 & Sectors */}
                {activeSlide.id === 8 && (
                  variantIndex === 1 ? (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                      {/* Left: Foreign Share & CDS */}
                      <div style={{ background: '#070a12', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: 6, padding: 14 }}>
                        <div style={{ fontSize: 11, fontWeight: 800, color: '#34d399', marginBottom: 12 }}>
                          📈 YABANCI TAKAS ORANI (%38.6) & SERMAYE GİRİŞİ
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          <div style={{ background: 'rgba(16, 185, 129, 0.08)', borderRadius: 6, padding: '9px 12px' }}>
                            <div style={{ fontWeight: 800, color: '#fff', fontSize: 11.5 }}>Yabancı Takas Payı: %38.6</div>
                            <div style={{ fontSize: 10, color: '#cbd5e1', marginTop: 2 }}>2023 dip seviyesi olan %27'ye kıyasla istikrarlı kurumsal giriş gerçekleşti.</div>
                          </div>
                          <div style={{ background: 'rgba(56, 189, 248, 0.08)', borderRadius: 6, padding: '9px 12px' }}>
                            <div style={{ fontWeight: 800, color: '#fff', fontSize: 11.5 }}>216 bp CDS ile Azalan Sermaye Maliyeti</div>
                            <div style={{ fontSize: 10, color: '#cbd5e1', marginTop: 2 }}>Düşen ülke riski Türk şirketlerinin yurt dışı borçlanma faizini aşağı çekti.</div>
                          </div>
                          <div style={{ background: 'rgba(245, 158, 11, 0.08)', borderRadius: 6, padding: '9px 12px' }}>
                            <div style={{ fontWeight: 800, color: '#fff', fontSize: 11.5 }}>Girişler BIST 30 Lokomotiflerinde Yoğun</div>
                            <div style={{ fontSize: 10, color: '#cbd5e1', marginTop: 2 }}>Yabancı fonlar spekülatif tahtalara değil, derinliği olan büyük hisselere giriyor.</div>
                          </div>
                        </div>
                      </div>

                      {/* Right: Valuation & Discount Advantage */}
                      <div style={{ background: '#070a12', border: '1px solid var(--border)', borderRadius: 6, padding: 14 }}>
                        <div style={{ fontSize: 11, fontWeight: 800, color: '#e2e8f0', marginBottom: 12 }}>
                          💎 BIST 100 DEĞERLEME & ÇARPAN AVANTAJI
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 6, padding: '9px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <div style={{ fontSize: 11.5, fontWeight: 800, color: '#fff' }}>BIST 100 İleri F/K Çarpanı</div>
                              <div style={{ fontSize: 9.5, color: '#94a3b8' }}>Gelişmekte olan ülkeler (GOÜ) ortalaması 13.2x</div>
                            </div>
                            <span style={{ fontSize: 15, fontWeight: 900, color: '#34d399', fontFamily: 'var(--font-mono)' }}>7.4x (%44 İskonto)</span>
                          </div>
                          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 6, padding: '9px 12px' }}>
                            <div style={{ fontWeight: 800, color: '#fff', fontSize: 11.5 }}>Dolar Bazlı Endeks (3.20$ Desteği)</div>
                            <div style={{ fontSize: 10, color: '#cbd5e1', marginTop: 2 }}>3.10$ - 3.40$ bandında sağlam akümülasyon; tarihi 5.10$ zirvesine geniş marj var.</div>
                          </div>
                          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 6, padding: '9px 12px' }}>
                            <div style={{ fontWeight: 800, color: '#fff', fontSize: 11.5 }}>Yüksek Nakit Temettü Verimi</div>
                            <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>Kâr dağıtan sanayi ve holding şirketleri enflasyona karşı güçlü kalkan sunuyor.</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : variantIndex === 2 ? (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                      {/* Left: TMS 29 Inflation Accounting */}
                      <div style={{ background: '#070a12', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: 6, padding: 14 }}>
                        <div style={{ fontSize: 11, fontWeight: 800, color: '#fbbf24', marginBottom: 12 }}>
                          📑 ENFLASYON MUHASEBESİ (TMS 29) & AYRIŞMA
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          <div style={{ background: 'rgba(245, 158, 11, 0.08)', borderRadius: 6, padding: '9px 12px' }}>
                            <div style={{ fontWeight: 800, color: '#fff', fontSize: 11.5 }}>Finans Sektörü Muafiyeti</div>
                            <div style={{ fontSize: 10, color: '#cbd5e1', marginTop: 2 }}>Bankalar ve sigortalar TMS 29 dışında kalarak net kâr berraklığını ve cazibesini koruyor.</div>
                          </div>
                          <div style={{ background: 'rgba(56, 189, 248, 0.08)', borderRadius: 6, padding: '9px 12px' }}>
                            <div style={{ fontWeight: 800, color: '#fff', fontSize: 11.5 }}>Duran Varlık Yoğun Şirketler</div>
                            <div style={{ fontSize: 10, color: '#cbd5e1', marginTop: 2 }}>Özsermayesi ve gayrimenkul/makine parkı güçlü şirketler bilançolarını tahkim ediyor.</div>
                          </div>
                          <div style={{ background: 'rgba(239, 68, 68, 0.08)', borderRadius: 6, padding: '9px 12px' }}>
                            <div style={{ fontWeight: 800, color: '#fff', fontSize: 11.5 }}>Serbest Nakit Akışı Takibi Şart</div>
                            <div style={{ fontSize: 10, color: '#cbd5e1', marginTop: 2 }}>Muhasebesel kâr yerine şirketin kasasına fiilen giren operasyonel nakit izlenmeli.</div>
                          </div>
                        </div>
                      </div>

                      {/* Right: Index Drivers & Heavyweights */}
                      <div style={{ background: '#070a12', border: '1px solid var(--border)', borderRadius: 6, padding: 14 }}>
                        <div style={{ fontSize: 11, fontWeight: 800, color: '#e2e8f0', marginBottom: 12 }}>
                          🏢 BIST 100 ENDEKS AĞIRLIKLARI & LOKOMOTİFLER
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 6, padding: '9px 12px' }}>
                            <div style={{ fontWeight: 800, color: '#fff', fontSize: 11.5 }}>Endeks Taşıyıcıları (Big 5)</div>
                            <div style={{ fontSize: 10, color: '#cbd5e1', marginTop: 2 }}>THYAO, TUPRS, KCHOL, BIMAS ve AKBNK endeksin toplam ağırlığının %40'tan fazlasını sürüklüyor.</div>
                          </div>
                          <div style={{ background: 'rgba(16, 185, 129, 0.08)', borderRadius: 6, padding: '9px 12px' }}>
                            <div style={{ fontWeight: 800, color: '#34d399', fontSize: 11.5 }}>12.000 - 12.200 Taban Desteği</div>
                            <div style={{ fontSize: 10, color: '#cbd5e1', marginTop: 2 }}>Kurumsal fonların ve emeklilik şirketlerinin alım iştahının koruduğu ana zemin.</div>
                          </div>
                          <div style={{ background: 'rgba(56, 189, 248, 0.08)', borderRadius: 6, padding: '9px 12px' }}>
                            <div style={{ fontWeight: 800, color: '#38bdf8', fontSize: 11.5 }}>12.800 ve 13.500 Hedef Koridoru</div>
                            <div style={{ fontSize: 10, color: '#cbd5e1', marginTop: 2 }}>Hacimli kırılımlarla hedeflenen son çeyrek bilanço rallisi koridoru.</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
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
                  )
                )}

                {/* SLIDE 9: Strategy, Cash & 48h Calendar */}
                {activeSlide.id === 9 && (
                  variantIndex === 1 ? (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                      {/* Left: Pyramid Portfolio Model */}
                      <div style={{ background: '#070a12', border: '1px solid rgba(56, 189, 248, 0.3)', borderRadius: 6, padding: 14 }}>
                        <div style={{ fontSize: 11, fontWeight: 800, color: '#38bdf8', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                          <PieChart size={14} />
                          <span>ÖRNEK KURUMSAL VARLIK DAĞILIMI (GENEL STRATEJİ)</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          <div style={{ background: 'rgba(56, 189, 248, 0.08)', borderRadius: 6, padding: '8px 11px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <div style={{ fontSize: 11, fontWeight: 800, color: '#fff' }}>%40 Hisse Senedi (BIST 30 & Wall St)</div>
                              <div style={{ fontSize: 9.5, color: '#94a3b8' }}>Enflasyon üzeri büyüyen teknoloji ve temettü liderleri</div>
                            </div>
                            <span style={{ fontSize: 12, fontWeight: 900, color: '#38bdf8' }}>Büyüme</span>
                          </div>
                          <div style={{ background: 'rgba(16, 185, 129, 0.08)', borderRadius: 6, padding: '8px 11px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <div style={{ fontSize: 11, fontWeight: 800, color: '#fff' }}>%25 TL Para Piyasası Fonu & Mevduat</div>
                              <div style={{ fontSize: 9.5, color: '#94a3b8' }}>Düşüşlerde kurşun ve risksiz %45+ bileşik getiri</div>
                            </div>
                            <span style={{ fontSize: 12, fontWeight: 900, color: '#34d399' }}>Nakit</span>
                          </div>
                          <div style={{ background: 'rgba(245, 158, 11, 0.08)', borderRadius: 6, padding: '8px 11px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <div style={{ fontSize: 11, fontWeight: 800, color: '#fff' }}>%20 Fiziki Altın & Gümüş</div>
                              <div style={{ fontSize: 9.5, color: '#94a3b8' }}>Jeopolitik krizler ve küresel borç şoklarına sigorta</div>
                            </div>
                            <span style={{ fontSize: 12, fontWeight: 900, color: '#fbbf24' }}>Sigorta</span>
                          </div>
                          <div style={{ background: 'rgba(139, 92, 246, 0.08)', borderRadius: 6, padding: '8px 11px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <div style={{ fontSize: 11, fontWeight: 800, color: '#fff' }}>%15 Kripto & Asimetrik Varlıklar</div>
                              <div style={{ fontSize: 9.5, color: '#94a3b8' }}>Bitcoin ve seçici Layer-1 projeleri ile yüksek alfa</div>
                            </div>
                            <span style={{ fontSize: 12, fontWeight: 900, color: '#a78bfa' }}>Alfa</span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Portfolio Discipline Rules */}
                      <div style={{ background: '#070a12', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: 6, padding: 14 }}>
                        <div style={{ fontSize: 11, fontWeight: 800, color: '#34d399', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                          <Compass size={14} />
                          <span>GENEL YATIRIMCI VE PORTFÖY YÖNETİM KURALLARI</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          <div style={{ background: 'rgba(16, 185, 129, 0.08)', borderRadius: 6, padding: '9px 12px' }}>
                            <div style={{ fontWeight: 800, color: '#fff', fontSize: 11.5 }}>1. Kademeli Maliyetlenme Disiplini</div>
                            <div style={{ fontSize: 10, color: '#cbd5e1', marginTop: 2 }}>Tek tuşla tüm sermayeyi bağlamayın; piyasa düzeltmelerine en az 3 eşit parça ayırın.</div>
                          </div>
                          <div style={{ background: 'rgba(56, 189, 248, 0.08)', borderRadius: 6, padding: '9px 12px' }}>
                            <div style={{ fontWeight: 800, color: '#fff', fontSize: 11.5 }}>2. Kâr Realizasyonu Alışkanlığı</div>
                            <div style={{ fontSize: 10, color: '#cbd5e1', marginTop: 2 }}>Direnç hedeflerine ulaşıldığında kârın en az %20'sini nakde veya altına çekmeyi unutmayın.</div>
                          </div>
                          <div style={{ background: 'rgba(245, 158, 11, 0.08)', borderRadius: 6, padding: '9px 12px' }}>
                            <div style={{ fontWeight: 800, color: '#fff', fontSize: 11.5 }}>3. Gerçek Çeşitlendirme (Korelasyon)</div>
                            <div style={{ fontSize: 10, color: '#cbd5e1', marginTop: 2 }}>Birbiriyle aynı yönde hareket eden 10 hisse almak riskinizi dağıtmaz, riski yoğunlaştırır.</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : variantIndex === 2 ? (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                      {/* Left: 3-Tier Risk Matrix */}
                      <div style={{ background: '#070a12', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: 6, padding: 14 }}>
                        <div style={{ fontSize: 11, fontWeight: 800, color: '#fbbf24', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                          <Activity size={14} />
                          <span>3 KADEMELİ PİYASA VOLATİLİTE VE RİSK MATRİSİ</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          <div style={{ background: 'rgba(16, 185, 129, 0.08)', borderRadius: 6, padding: '9px 12px', borderLeft: '3px solid #10b981' }}>
                            <div style={{ fontWeight: 800, color: '#fff', fontSize: 11.5 }}>🟢 Sakin Dönem (VIX &lt; 15)</div>
                            <div style={{ fontSize: 10, color: '#cbd5e1', marginTop: 2 }}>Risk iştahı güçlü; hisse ve teknoloji payını %50 üzerine çıkarın, trendin tadını çıkarın.</div>
                          </div>
                          <div style={{ background: 'rgba(245, 158, 11, 0.08)', borderRadius: 6, padding: '9px 12px', borderLeft: '3px solid #f59e0b' }}>
                            <div style={{ fontWeight: 800, color: '#fff', fontSize: 11.5 }}>🟡 Dalgalı Dönem (VIX 15 - 22)</div>
                            <div style={{ fontSize: 10, color: '#cbd5e1', marginTop: 2 }}>Uyarı bölgesi; nakit oranını %25-30 seviyesine yükseltin, kaldıraçlı işlemden kesinlikle kaçının.</div>
                          </div>
                          <div style={{ background: 'rgba(239, 68, 68, 0.08)', borderRadius: 6, padding: '9px 12px', borderLeft: '3px solid #ef4444' }}>
                            <div style={{ fontWeight: 800, color: '#fff', fontSize: 11.5 }}>🔴 Panik / Kriz Dönemi (VIX &gt; 22)</div>
                            <div style={{ fontSize: 10, color: '#cbd5e1', marginTop: 2 }}>Panikle satış yapma zamanı değil; likit nakit tamponuyla kurumsal taban seviyelerini toplama zamanı.</div>
                          </div>
                        </div>
                      </div>

                      {/* Right: Investor Philosophy */}
                      <div style={{ background: '#070a12', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: 6, padding: 14 }}>
                        <div style={{ fontSize: 11, fontWeight: 800, color: '#34d399', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                          <Compass size={14} />
                          <span>YATIRIMCI FELSEFESİ</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 6, padding: '9px 12px' }}>
                            <div style={{ fontWeight: 800, color: '#fff', fontSize: 11.5 }}>"Fiyat gürültüdür; bilanço ve serbest nakit akışı gerçektir."</div>
                            <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>Günlük fiyat dalgalanmaları yatırım pusulanızı saptırmasın.</div>
                          </div>
                          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 6, padding: '9px 12px' }}>
                            <div style={{ fontWeight: 800, color: '#fff', fontSize: 11.5 }}>"Düşüşler servet transferinin gerçekleştiği anlardır."</div>
                            <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>Panikleyen zararına satar, hazırlıklı ve nakdi olan yatırımcı kurumsal tabandan toplar.</div>
                          </div>
                          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 6, padding: '9px 12px' }}>
                            <div style={{ fontWeight: 800, color: '#fff', fontSize: 11.5 }}>"Nakit her krizde ve döngüde kraldır."</div>
                            <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>Alım gücünüzü ve psikolojik rahatlığınızı sağlayan en güçlü savunma nakdinizdir.</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                      {/* Left: 48h Calendar Timeline */}
                      <div style={{ background: '#070a12', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: 6, padding: 14 }}>
                        <div style={{ fontSize: 11, fontWeight: 800, color: '#fbbf24', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                          <Calendar size={14} />
                          <span>48 SAATLİK KRİTİK EKONOMİK TAKVİM</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {[
                            { time: 'Pazartesi 10:00', event: 'TÜİK Yıllık ve Aylık TÜFE Enflasyonu', note: 'Önceki %29.73 / Beklenti Kritik' },
                            { time: 'Çarşamba 21:00', event: 'Fed FOMC Tutanakları & Yetkili Mesajları', note: 'Warsh Şahin Faiz Yönlendirmesi' },
                            { time: 'Cuma 15:30', event: 'ABD Tarım Dışı İstihdam (NFP) & İşsizlik', note: 'Küresel Risk İştahı Barometresi' },
                            { time: 'Gelecek PPK Toplantısı', event: 'TCMB Para Politikası Kurulu Faiz Kararı', note: 'Sıkı Para Politikası & Likidite Kararı' }
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
                          <span>YATIRIMCI PUSULASI & TEMEL PRENSİPLER</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          <div style={{ background: 'rgba(16, 185, 129, 0.08)', borderRadius: 6, padding: '10px 12px' }}>
                            <div style={{ fontWeight: 800, color: '#fff', fontSize: 11.5 }}>1. Asla FOMO ile İşlem Yapmayın</div>
                            <div style={{ fontSize: 10.5, color: '#cbd5e1', marginTop: 2 }}>Hızlı yükselen varlıkların peşinden koşmak yerine kurumsal destek seviyelerini bekleyin.</div>
                          </div>

                          <div style={{ background: 'rgba(56, 189, 248, 0.08)', borderRadius: 6, padding: '10px 12px' }}>
                            <div style={{ fontWeight: 800, color: '#fff', fontSize: 11.5 }}>2. %20 - %25 Likit Nakit Tamponunuzu Koruyun</div>
                            <div style={{ fontSize: 10.5, color: '#cbd5e1', marginTop: 2 }}>Portföyde likit nakit bulundurmak piyasa geri çekilmelerini büyük fırsata çevirir.</div>
                          </div>

                          <div style={{ background: 'rgba(245, 158, 11, 0.08)', borderRadius: 6, padding: '10px 12px' }}>
                            <div style={{ fontWeight: 800, color: '#fff', fontSize: 11.5 }}>3. Endeks Tahmini Değil Şirket Seçimi</div>
                            <div style={{ fontSize: 10.5, color: '#cbd5e1', marginTop: 2 }}>Kâr marjlarını ve nakit akışını enflasyonun üzerinde büyüten şirketler her dönem kazandırır.</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
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
            title="Tüm eski önbellekleri temizler, bugünün canlı borsa fiyatlarını ve güncel haberlerini çekerek tüm 9 slaytın konuşma metnini canlı verilerle sıfırdan üretir."
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
                    Buraya girdiğiniz başlıklar tüm 9 slaytın canlı paneline ve prompter konuşma metnine anında işlenir.
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
                  <span style={{ fontSize: 8.5, color: '#a7f3d0' }}>28 Ekim & Aralık Toplantı Senaryosu</span>
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
                      value={agendaForm?.fedRate?.meetingDate || '28 Ekim FOMC'}
                      onChange={(e) => setAgendaForm({ ...agendaForm, fedRate: { ...agendaForm.fedRate, meetingDate: e.target.value } })}
                      style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', color: '#38bdf8', fontSize: 11, fontWeight: 700, padding: '5px 8px', borderRadius: 4, width: '100%' }}
                    />
                  </div>
                </div>
                <textarea
                  rows={2}
                  value={agendaForm?.fedRate?.note || ''}
                  onChange={(e) => setAgendaForm({ ...agendaForm, fedRate: { ...agendaForm.fedRate, note: e.target.value } })}
                  placeholder="28 Ekim FOMC toplantısında faizin sabit tutulması, Aralık toplantısı için ise 25 bp artış ihtimali..."
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
