import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { db } from '../firebase';
import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  deleteDoc,
  updateDoc
} from 'firebase/firestore';

const AppContext = createContext();

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};

// Normalized ticker map for BIST, US, and Cryptos
const TICKER_MAP = {
  'BYDNR': 'BYDNR.IS',
  'BYDNR.IS': 'BYDNR.IS',
  'TUPRS': 'TUPRS.IS',
  'TUPRS.IS': 'TUPRS.IS',
  'SPCX': 'SPCX',
  'DRAM': 'DRAM',
  'ETH-USD': 'ETH-USD',
  'ETHUSD': 'ETH-USD',
  'ETH': 'ETH-USD',
  'BTC-USD': 'BTC-USD',
  'BTCUSD': 'BTC-USD',
  'BTC': 'BTC-USD',
  'XAUT-USD': 'XAUT-USD',
  'XAUTUSD': 'XAUT-USD',
  'XAUT': 'XAUT-USD',
  'XAUT-usd': 'XAUT-USD',
  'LDO': 'LDO-USD',
  'LDO-USD': 'LDO-USD',
  'LDOUSD': 'LDO-USD',
  'BIO-USD': 'BIO34812-USD',
  'BIO': 'BIO34812-USD',
  'BIOUSD': 'BIO34812-USD',
  'SUI': 'SUI20947-USD',
  'SUI-USD': 'SUI20947-USD',
  'SUIUSD': 'SUI20947-USD',
  'OP': 'OP-USD',
  'OP-USD': 'OP-USD',
  'OPUSD': 'OP-USD',
  'ARKM': 'ARKM-USD',
  'ARKM-USD': 'ARKM-USD',
  'ARKMUSD': 'ARKM-USD',
  'DOGE': 'DOGE-USD',
  'DOGE-USD': 'DOGE-USD',
  'DOGEUSD': 'DOGE-USD',
  'SOL': 'SOL-USD',
  'SOL-USD': 'SOL-USD',
  'SOLUSD': 'SOL-USD',
  'AVAX': 'AVAX-USD',
  'AVAX-USD': 'AVAX-USD',
  'AVAXUSD': 'AVAX-USD',
  'XRP': 'XRP-USD',
  'XRP-USD': 'XRP-USD',
  'XRPUSD': 'XRP-USD',
  'LINK': 'LINK-USD',
  'LINK-USD': 'LINK-USD',
  'LINKUSD': 'LINK-USD',
  'BNB': 'BNB-USD',
  'BNB-USD': 'BNB-USD',
  'BNBUSD': 'BNB-USD',
  'ABBV': 'ABBV',
  'TSM': 'TSM',
  'NVDA': 'NVDA',
  'XOM': 'XOM'
};

// Known crypto tickers to ensure classification consistency
export const KNOWN_CRYPTO_SET = new Set([
  'BTC', 'BTC-USD', 'BTCUSD', 'ETH', 'ETH-USD', 'ETHUSD', 'LDO', 'LDO-USD', 'LDOUSD',
  'BIO', 'BIO-USD', 'BIOUSD', 'BIO34812-USD', 'SUI', 'SUI-USD', 'SUIUSD', 'SUI20947-USD',
  'OP', 'OP-USD', 'OPUSD', 'ARKM', 'ARKM-USD', 'ARKMUSD', 'DOGE', 'DOGE-USD', 'DOGEUSD',
  'SOL', 'SOL-USD', 'SOLUSD', 'AVAX', 'AVAX-USD', 'AVAXUSD', 'XRP', 'XRP-USD', 'XRPUSD',
  'LINK', 'LINK-USD', 'LINKUSD', 'BNB', 'BNB-USD', 'BNBUSD'
]);

// Initial quotes fallback so portfolio calculation is instant without cold-start delay
const DEFAULT_INITIAL_QUOTES = {
  'USDTRY=X': { symbol: 'USDTRY=X', price: 49.03, currency: 'TRY', changePct: 0.12 },
  'GC=F': { symbol: 'GC=F', price: 4200.0, currency: 'USD', changePct: 0.38 },
  'BYDNR.IS': { symbol: 'BYDNR.IS', price: 33.64, currency: 'TRY', changePct: 0.5 },
  'SPCX': { symbol: 'SPCX', price: 30.50, currency: 'USD', changePct: 0.2 },
  'DRAM': { symbol: 'DRAM', price: 27.80, currency: 'USD', changePct: -0.3 },
  'ETH-USD': { symbol: 'ETH-USD', price: 2680.0, currency: 'USD', changePct: 1.2 },
  'BTC-USD': { symbol: 'BTC-USD', price: 83400.0, currency: 'USD', changePct: 1.5 },
  'XAUT-USD': { symbol: 'XAUT-USD', price: 4190.0, currency: 'USD', changePct: 0.4 },
  'LDO-USD': { symbol: 'LDO-USD', price: 0.445, currency: 'USD', changePct: -2.1 },
  'BIO34812-USD': { symbol: 'BIO34812-USD', price: 0.0306, currency: 'USD', changePct: -1.2 },
  'SUI20947-USD': { symbol: 'SUI20947-USD', price: 1.95, currency: 'USD', changePct: 0.8 },
  'OP-USD': { symbol: 'OP-USD', price: 1.25, currency: 'USD', changePct: -0.5 },
  'ARKM-USD': { symbol: 'ARKM-USD', price: 1.10, currency: 'USD', changePct: 0.3 },
  'DOGE-USD': { symbol: 'DOGE-USD', price: 0.18, currency: 'USD', changePct: 1.1 },
  'TSM': { symbol: 'TSM', price: 195.0, currency: 'USD', changePct: 1.8 },
  'NVDA': { symbol: 'NVDA', price: 135.0, currency: 'USD', changePct: 1.4 },
  'ABBV': { symbol: 'ABBV', price: 198.0, currency: 'USD', changePct: 0.2 },
  'TUPRS.IS': { symbol: 'TUPRS.IS', price: 148.5, currency: 'TRY', changePct: 0.8 },
  'FROTO.IS': { symbol: 'FROTO.IS', price: 1040.0, currency: 'TRY', changePct: 0.4 },
  'THYAO.IS': { symbol: 'THYAO.IS', price: 312.0, currency: 'TRY', changePct: 0.6 },
  'QQQ': { symbol: 'QQQ', price: 495.0, currency: 'USD', changePct: 0.5 },
  'SPY': { symbol: 'SPY', price: 580.0, currency: 'USD', changePct: 0.3 }
};

export const AppProvider = ({ children }) => {
  // 1. Instant Rehydration State from localStorage SWR Cache to eliminate startup jump on Fn+F5
  const [holdings, setHoldings] = useState(() => {
    try {
      const cached = localStorage.getItem('bloomberg_cached_holdings');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return [];
  });

  const [goldPurchases, setGoldPurchases] = useState(() => {
    try {
      const cached = localStorage.getItem('bloomberg_cached_gold');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return [];
  });

  const [allocation, setAllocation] = useState(() => {
    try {
      const cached = localStorage.getItem('bloomberg_cached_alloc');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed) return { cash_try: 0, cash_usd: 0, ...parsed };
      }
    } catch (e) {}
    return { ppf_balance_try: 45000, cash_try: 0, cash_usd: 0, targets: {}, guardrails: {} };
  });

  const [tradeLedger, setTradeLedger] = useState(() => {
    try {
      const cached = localStorage.getItem('bloomberg_cached_ledger');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return [];
  });

  const [settings, setSettings] = useState({ currency: 'try', timeframe: '1y' });
  const [loading, setLoading] = useState(false);

  // Market quotes state with SWR (Stale-While-Revalidate) localStorage caching to eliminate startup jump
  const [marketQuotes, setMarketQuotes] = useState(() => {
    try {
      const cached = localStorage.getItem('bloomberg_market_quotes');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && Object.keys(parsed).length > 0) return parsed;
      }
    } catch (e) {}
    return DEFAULT_INITIAL_QUOTES;
  });

  const [usdtry, setUsdtry] = useState(() => {
    try {
      const cached = localStorage.getItem('bloomberg_usdtry');
      if (cached && Number(cached) > 0) return Number(cached);
    } catch (e) {}
    return 49.03;
  });

  const [gramGoldPrice, setGramGoldPrice] = useState(() => {
    try {
      const cached = localStorage.getItem('bloomberg_gram_gold');
      if (cached && Number(cached) > 0) return Number(cached);
    } catch (e) {}
    return 6600.0;
  });

  const [lastMarketUpdate, setLastMarketUpdate] = useState(null);
  const [isUpdatingMarket, setIsUpdatingMarket] = useState(false);

  // Active UI tab & Currency
  // Default to 'market' (Global Piyasa Nabzı / Piyasa Özeti) as in original terminal
  const [activeTab, setActiveTab] = useState('market'); 
  const [currentCurrency, setCurrentCurrency] = useState('try'); // 'try' or 'usd'
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, icon = 'ℹ️', duration = 3500) => {
    setToast({ message, icon, id: Date.now() });
    setTimeout(() => setToast(null), duration);
  }, []);

  // 1. Subscribe to Firestore Collections in Real-Time & sync to local cache
  useEffect(() => {
    const unsubHoldings = onSnapshot(collection(db, 'holdings'), (snap) => {
      const list = snap.docs.map(d => {
        const item = d.data();
        const sym = (item.ticker || '').toUpperCase();
        const clean = sym.replace('.IS', '').replace('-USD', '');
        let type = item.type;
        // Auto-fix misclassified cryptos (such as LDO, BIO, SUI, etc.)
        if (KNOWN_CRYPTO_SET.has(clean) || KNOWN_CRYPTO_SET.has(sym)) {
          if (type !== 'Kripto') {
            type = 'Kripto';
            try {
              updateDoc(doc(db, 'holdings', d.id), { type: 'Kripto' });
            } catch (err) {}
          }
        }
        return { ...item, type, id: d.id };
      });
      setHoldings(list);
      setLoading(false);
      try {
        localStorage.setItem('bloomberg_cached_holdings', JSON.stringify(list));
      } catch (e) {}
    });

    const unsubGold = onSnapshot(collection(db, 'gold_purchases'), (snap) => {
      const list = snap.docs.map(d => ({ ...d.data(), id: d.id }));
      list.sort((a, b) => (Number(b.id) || 0) - (Number(a.id) || 0));
      setGoldPurchases(list);
      try {
        localStorage.setItem('bloomberg_cached_gold', JSON.stringify(list));
      } catch (e) {}
    });

    const unsubAlloc = onSnapshot(doc(db, 'allocation', 'current'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setAllocation(data);
        try {
          localStorage.setItem('bloomberg_cached_alloc', JSON.stringify(data));
        } catch (e) {}
      }
    });

    const unsubLedger = onSnapshot(collection(db, 'trade_ledger'), (snap) => {
      const list = snap.docs.map(d => ({ ...d.data(), id: d.id }));
      list.sort((a, b) => (Number(b.id) || 0) - (Number(a.id) || 0));
      setTradeLedger(list);
      try {
        localStorage.setItem('bloomberg_cached_ledger', JSON.stringify(list));
      } catch (e) {}
    });

    const unsubSettings = onSnapshot(doc(db, 'settings', 'preferences'), (docSnap) => {
      if (docSnap.exists()) {
        const s = docSnap.data();
        setSettings(s);
        if (s.currency) setCurrentCurrency(s.currency);
      }
    });

    return () => {
      unsubHoldings();
      unsubGold();
      unsubAlloc();
      unsubLedger();
      unsubSettings();
    };
  }, []);

  // 2. Live Market Data Fetcher
  const fetchMarketData = useCallback(async () => {
    setIsUpdatingMarket(true);
    try {
      const symbolsToFetch = new Set([
        'USDTRY=X', 'GC=F', '^GSPC', 'XU100.IS', 'BTC-USD', 'ETH-USD',
        'SPY', 'QQQ', 'DIA', 'MDY', 'IJR', '^TNX', '^VIX', 'BZ=F'
      ]);
      
      const currentHoldings = holdings.length > 0 ? holdings : (() => {
        try {
          return JSON.parse(localStorage.getItem('bloomberg_cached_holdings') || '[]');
        } catch (e) {
          return [];
        }
      })();

      currentHoldings.forEach(h => {
        const rawUpper = (h.ticker || '').toUpperCase();
        let sym = h.clean_ticker || TICKER_MAP[rawUpper];
        if (!sym) {
          if (h.type === 'Hisse' && h.currency === 'TRY' && !rawUpper.endsWith('.IS')) {
            sym = `${rawUpper}.IS`;
          } else if (rawUpper.endsWith('USD') && !rawUpper.includes('-')) {
            const base = rawUpper.slice(0, -3);
            sym = TICKER_MAP[`${base}-USD`] || TICKER_MAP[base] || `${base}-USD`;
          } else {
            sym = h.ticker;
          }
        }
        if (sym) symbolsToFetch.add(sym);
      });

      const symList = Array.from(symbolsToFetch).join(',');
      
      // Try local/vercel API route first
      let fetchedQuotes = {};
      try {
        const res = await fetch(`/api/market?symbols=${encodeURIComponent(symList)}`);
        if (res.ok) {
          const json = await res.json();
          if (json.status === 'success') {
            fetchedQuotes = json.data;
          }
        }
      } catch (e) {
        // Fallback
      }

      // If API empty or failed, fetch individually
      if (Object.keys(fetchedQuotes).length === 0) {
        const promises = Array.from(symbolsToFetch).map(async (s) => {
          try {
            const rawUpper = s.toUpperCase();
            let cleanS = TICKER_MAP[rawUpper];
            if (!cleanS) {
              if (rawUpper.endsWith('USD') && !rawUpper.includes('-')) {
                const base = rawUpper.slice(0, -3);
                cleanS = TICKER_MAP[`${base}-USD`] || TICKER_MAP[base] || `${base}-USD`;
              } else {
                cleanS = s;
              }
            }
            const r = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(cleanS)}?interval=1d&range=5d`);
            if (!r.ok) return;
            const j = await r.json();
            const meta = j?.chart?.result?.[0]?.meta;
            if (meta) {
              const p = meta.regularMarketPrice || meta.chartPreviousClose || 0;
              const closes = (j?.chart?.result?.[0]?.indicators?.quote?.[0]?.close || [])
                .filter(c => typeof c === 'number' && !isNaN(c));

              let changePct = (meta.regularMarketChangePercent !== undefined && meta.regularMarketChangePercent !== null)
                ? Number(meta.regularMarketChangePercent)
                : null;

              let prev = meta.previousClose;
              if (!prev && closes.length >= 2) {
                prev = closes[closes.length - 2];
              }

              if (changePct === null) {
                changePct = prev > 0 ? ((p - prev) / prev) * 100 : 0;
              } else if (!prev && changePct !== 0 && p) {
                prev = p / (1 + changePct / 100);
              } else if (!prev) {
                prev = p;
              }

              const quoteObj = {
                symbol: s,
                resolvedSymbol: cleanS,
                price: p,
                previousClose: prev,
                change: p - prev,
                changePct: changePct,
                currency: meta.currency || (cleanS.endsWith('.IS') ? 'TRY' : 'USD')
              };
              fetchedQuotes[s] = quoteObj;
              fetchedQuotes[cleanS] = quoteObj;
              if (s.endsWith('-USD')) {
                fetchedQuotes[s.replace('-USD', 'USD')] = quoteObj;
                fetchedQuotes[s.replace('-USD', '')] = quoteObj;
              }
            }
          } catch (err) {}
        });
        await Promise.all(promises);
      }

      // Extract USDTRY rate
      const usdRate = fetchedQuotes['USDTRY=X']?.price || (marketQuotes['USDTRY=X']?.price) || 49.03;
      setUsdtry(usdRate);

      // Extract Gold Ounce price and calculate Gram Gold TRY
      const goldOunceUSD = fetchedQuotes['GC=F']?.price || (marketQuotes['GC=F']?.price) || 4200.0;
      const calcGramGold = (goldOunceUSD / 31.1034768) * usdRate;
      const finalGramGold = calcGramGold > 0 ? calcGramGold : (gramGoldPrice || 6600.0);
      setGramGoldPrice(finalGramGold);

      if (Object.keys(fetchedQuotes).length > 0) {
        setMarketQuotes(prev => {
          const merged = { ...prev, ...fetchedQuotes };
          try {
            localStorage.setItem('bloomberg_market_quotes', JSON.stringify(merged));
            localStorage.setItem('bloomberg_usdtry', String(usdRate));
            localStorage.setItem('bloomberg_gram_gold', String(finalGramGold));
          } catch (err) {}
          return merged;
        });
      }
      setLastMarketUpdate(new Date());
    } catch (err) {
      console.warn('Market data fetch error:', err);
    } finally {
      setIsUpdatingMarket(false);
    }
  }, [holdings]);

  // Initial and periodic market refresh
  useEffect(() => {
    fetchMarketData();
    const interval = setInterval(fetchMarketData, 45000); // 45s refresh
    return () => clearInterval(interval);
  }, [fetchMarketData]);

  // 3. Robust Portfolio Mathematical Aggregations
  const portfolioSummary = useMemo(() => {
    let totalCostTRY = 0;
    let totalValTRY = 0;
    let dayPLTRYTotal = 0;

    // A) Holdings Calculation with currency normalization
    const enrichedHoldings = holdings.map(h => {
      const rawUpper = (h.ticker || '').toUpperCase();
      let sym = h.clean_ticker || TICKER_MAP[rawUpper];
      if (!sym) {
        if (h.type === 'Hisse' && h.currency === 'TRY' && !rawUpper.endsWith('.IS')) {
          sym = `${rawUpper}.IS`;
        } else if (rawUpper.endsWith('USD') && !rawUpper.includes('-')) {
          const base = rawUpper.slice(0, -3);
          sym = TICKER_MAP[`${base}-USD`] || TICKER_MAP[base] || `${base}-USD`;
        } else {
          sym = h.ticker;
        }
      }
      const quote = marketQuotes[sym] 
        || marketQuotes[rawUpper] 
        || marketQuotes[rawUpper.replace('-USD', 'USD')]
        || marketQuotes[rawUpper.replace('-USD', '')]
        || marketQuotes[h.ticker] 
        || {};
      // User holding tracking currency
      // If cost_rate > 1.5 or currency === 'USD', it was bought in USD (e.g. SPCX, DRAM, NVDA, TSM, ABBV)
      const isHoldingUSD = h.currency === 'USD' || (Number(h.cost_rate) > 1.5);
      const effectiveRate = Number(h.cost_rate) > 1.5 ? Number(h.cost_rate) : usdtry;

      const hasQuote = quote.price !== undefined && quote.price !== null && Number(quote.price) > 0;
      // If live quote is not found, use last recorded/persisted price from database before falling back to avg_cost
      const lastRecordedPrice = Number(h.current_price) || Number(h.currentPrice) || Number(h.last_price) || 0;
      const livePrice = hasQuote ? quote.price : (lastRecordedPrice > 0 ? lastRecordedPrice : (h.avg_cost || 0));
      const prevClose = quote.previousClose !== undefined ? quote.previousClose : livePrice;
      const changePct = quote.changePct !== undefined ? quote.changePct : 0;

      // Clean check if sym is BIST
      const isBIST = sym.endsWith('.IS') || (h.type === 'Hisse' && h.currency === 'TRY' && !isHoldingUSD && !sym.includes('-USD'));

      // If quote is not yet loaded from network, price is avg_cost whose currency is isHoldingUSD
      const quoteCurrency = hasQuote
        ? (quote.currency || (sym.endsWith('.IS') ? 'TRY' : 'USD'))
        : (isHoldingUSD ? 'USD' : (isBIST ? 'TRY' : (h.currency || 'TRY')));

      let costTRY = 0;
      let costUSD = 0;
      let valTRY = 0;
      let valUSD = 0;
      let livePriceTRY = 0;
      let livePriceUSD = 0;

      // Normalize live price into both currencies
      if (quoteCurrency === 'USD') {
        livePriceUSD = livePrice;
        livePriceTRY = livePrice * usdtry;
      } else {
        livePriceTRY = livePrice;
        livePriceUSD = usdtry > 0 ? (livePrice / usdtry) : 0;
      }

      if (isHoldingUSD) {
        costUSD = (h.shares || 0) * (h.avg_cost || 0);
        costTRY = costUSD * effectiveRate;
        valUSD = (h.shares || 0) * livePriceUSD;
        valTRY = valUSD * usdtry;
      } else {
        // Holding is bought/tracked in TRY (e.g. BYDNR, or Cryptos bought in TRY)
        costTRY = (h.shares || 0) * (h.avg_cost || 0);
        costUSD = effectiveRate > 0 ? (costTRY / effectiveRate) : 0;
        valTRY = (h.shares || 0) * livePriceTRY;
        valUSD = usdtry > 0 ? (valTRY / usdtry) : 0;
      }

      const profitTRY = valTRY - costTRY;
      const profitUSD = valUSD - costUSD;
      const returnPct = costTRY > 0 ? (profitTRY / costTRY) * 100 : 0;

      // True 24-hour day change
      let dayPLTRY = 0;
      let dayPLUSD = 0;
      if (prevClose > 0 && livePrice > 0) {
        if (quoteCurrency === 'USD') {
          dayPLUSD = (h.shares || 0) * (livePrice - prevClose);
          dayPLTRY = dayPLUSD * usdtry;
        } else {
          dayPLTRY = (h.shares || 0) * (livePrice - prevClose);
          dayPLUSD = usdtry > 0 ? (dayPLTRY / usdtry) : 0;
        }
      }

      totalCostTRY += costTRY;
      totalValTRY += valTRY;
      dayPLTRYTotal += dayPLTRY;

      return {
        ...h,
        cleanTicker: sym,
        livePrice,
        livePriceTRY,
        livePriceUSD,
        prevClose,
        changePct,
        quoteCurrency,
        costTRY,
        valTRY,
        costUSD,
        valUSD,
        profitTRY,
        profitUSD,
        returnPct,
        dayPLTRY,
        dayPLUSD,
        isHoldingUSD
      };
    });

    // B) Gram Gold Calculation (Kur Kalkanı)
    const totalGrams = goldPurchases.reduce((acc, g) => acc + (Number(g.grams) || 0), 0);
    const totalGoldCostTRY = goldPurchases.reduce((acc, g) => acc + ((Number(g.grams) || 0) * (Number(g.buy_price_try) || 0)), 0);
    const totalGoldValTRY = totalGrams * gramGoldPrice;
    const goldProfitTRY = totalGoldValTRY - totalGoldCostTRY;
    const goldReturnPct = totalGoldCostTRY > 0 ? (goldProfitTRY / totalGoldCostTRY) * 100 : 0;

    totalCostTRY += totalGoldCostTRY;
    totalValTRY += totalGoldValTRY;

    // C) PPF & Serbest Nakit Tamponu (Kuru Barut & Alım Gücü)
    const ppfBalanceTRY = Number(allocation.ppf_balance_try) || 0;
    const cashTRY = Number(allocation.cash_try) || 0;
    const cashUSD = Number(allocation.cash_usd) || 0;
    const cashUSDinTRY = cashUSD * usdtry;
    const totalFreeCashTRY = cashTRY + cashUSDinTRY;
    const totalFreeCashUSD = usdtry > 0 ? (totalFreeCashTRY / usdtry) : 0;

    // Both PPF and Serbest Nakit are liquid cash assets (cost basis = current value)
    totalCostTRY += ppfBalanceTRY + totalFreeCashTRY;
    totalValTRY += ppfBalanceTRY + totalFreeCashTRY;

    // D) Realized P&L from Trade Ledger
    const totalRealizedPL_TRY = tradeLedger.reduce((acc, t) => acc + (Number(t.realized_pl_try) || 0), 0);
    const totalRealizedPL_USD = tradeLedger.reduce((acc, t) => acc + (Number(t.realized_pl_usd) || 0), 0);
    const totalProceedsTRY = tradeLedger.reduce((acc, t) => acc + (Number(t.total_proceeds_try || t.proceeds_try) || 0), 0);
    const totalProceedsUSD = tradeLedger.reduce((acc, t) => acc + (Number(t.total_proceeds_usd || t.proceeds_usd) || 0), 0);

    const winningTrades = tradeLedger.filter(t => (Number(t.realized_pl_try) || 0) > 0.01).length;
    const losingTrades = tradeLedger.filter(t => (Number(t.realized_pl_try) || 0) < -0.01).length;
    const winRatePct = tradeLedger.length > 0 ? (winningTrades / tradeLedger.length) * 100 : 100;

    // E) Consolidated Figures
    const unrealizedProfitTRY = totalValTRY - totalCostTRY;
    const unrealizedProfitUSD = unrealizedProfitTRY / usdtry;
    const unrealizedReturnPct = totalCostTRY > 0 ? (unrealizedProfitTRY / totalCostTRY) * 100 : 0;

    const consolidatedProfitTRY = unrealizedProfitTRY + totalRealizedPL_TRY;
    const consolidatedProfitUSD = unrealizedProfitUSD + totalRealizedPL_USD;
    const consolidatedReturnPct = totalCostTRY > 0 ? (consolidatedProfitTRY / totalCostTRY) * 100 : 0;

    const dayPLUSD = dayPLTRYTotal / usdtry;
    const dayPLPct = (totalValTRY - dayPLTRYTotal) > 0 ? (dayPLTRYTotal / (totalValTRY - dayPLTRYTotal)) * 100 : 0;

    return {
      totalValTRY,
      totalValUSD: totalValTRY / usdtry,
      totalCostTRY,
      totalCostUSD: totalCostTRY / usdtry,
      unrealizedProfitTRY,
      unrealizedProfitUSD,
      unrealizedReturnPct,
      realizedProfitTRY: totalRealizedPL_TRY,
      realizedProfitUSD: totalRealizedPL_USD,
      totalProceedsTRY,
      totalProceedsUSD,
      consolidatedProfitTRY,
      consolidatedProfitUSD,
      consolidatedReturnPct,
      dayPLTRY: dayPLTRYTotal,
      dayPLUSD,
      dayPLPct,
      tradesCount: tradeLedger.length,
      winningTrades,
      losingTrades,
      winRatePct,
      enrichedHoldings,
      totalGrams,
      totalGoldValTRY,
      totalGoldCostTRY,
      goldProfitTRY,
      goldReturnPct,
      gramGoldPrice,
      ppfBalanceTRY,
      cashTRY,
      cashUSD,
      cashUSDinTRY,
      totalFreeCashTRY,
      totalFreeCashUSD,
      buyingPowerTRY: totalFreeCashTRY,
      buyingPowerUSD: totalFreeCashUSD,
      totalCashAndPPF_TRY: ppfBalanceTRY + totalFreeCashTRY,
      totalCashAndPPF_USD: usdtry > 0 ? (ppfBalanceTRY + totalFreeCashTRY) / usdtry : 0,
      totalShieldValTRY: totalGoldValTRY + ppfBalanceTRY, // Stratejik Zırh (Altın + PPF)
      totalLiquidTRY: totalGoldValTRY + ppfBalanceTRY + totalFreeCashTRY, // Toplam Likit Servet
      usdtry
    };
  }, [holdings, goldPurchases, allocation, tradeLedger, marketQuotes, usdtry, gramGoldPrice]);

  // 4. CRUD Actions interacting with Firestore
  const addHolding = async (holdingData) => {
    try {
      const inputTicker = (holdingData.ticker || '').toUpperCase().trim();
      const cleanInput = inputTicker.replace('.IS', '').replace('-USD', '');
      const docId = inputTicker.replace(/[\/\.]/g, '_');

      // Check if this holding already exists in the portfolio (matching ticker or clean ticker)
      const existing = holdings.find(h => {
        const hTicker = (h.ticker || '').toUpperCase();
        const hClean = hTicker.replace('.IS', '').replace('-USD', '');
        return hTicker === inputTicker || hClean === cleanInput;
      });

      const addedShares = parseFloat(String(holdingData.shares).replace(',', '.')) || 0;
      const addedPrice = parseFloat(String(holdingData.avg_cost).replace(',', '.')) || 0;

      if (addedShares <= 0 || addedPrice <= 0) {
        showToast('Geçersiz adet veya maliyet!', '⚠️');
        return;
      }

      if (existing) {
        // Position Accumulation: Calculate weighted average cost
        const existingShares = Number(existing.shares) || 0;
        const existingCost = Number(existing.avg_cost) || 0;
        const newTotalShares = existingShares + addedShares;
        const newWeightedCost = newTotalShares > 0
          ? ((existingShares * existingCost) + (addedShares * addedPrice)) / newTotalShares
          : addedPrice;

        const targetId = existing.id || docId;
        await setDoc(doc(db, 'holdings', targetId), {
          ...existing,
          ...holdingData,
          id: targetId,
          shares: newTotalShares,
          avg_cost: Math.round(newWeightedCost * 10000) / 10000,
          updated_at: new Date().toISOString()
        }, { merge: true });

        const sym = holdingData.currency === 'USD' ? '$' : '₺';
        showToast(`${inputTicker} alımı işlendi! Yeni Toplam: ${newTotalShares.toLocaleString('tr-TR', { maximumFractionDigits: 6 })} adet (Yeni Ort. Maliyet: ${sym}${newWeightedCost.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 4 })})`, '📈', 5000);
      } else {
        // Brand new asset
        await setDoc(doc(db, 'holdings', docId), {
          ...holdingData,
          ticker: inputTicker,
          shares: addedShares,
          avg_cost: addedPrice,
          updated_at: new Date().toISOString()
        });
        showToast(`${inputTicker} portföye başarıyla eklendi!`, '✅');
      }
    } catch (err) {
      console.error('addHolding error:', err);
      showToast(`Pozisyon eklenirken hata: ${err.message}`, '⚠️');
    }
  };

  const updateHolding = async (docId, holdingData) => {
    try {
      const shares = parseFloat(String(holdingData.shares).replace(',', '.'));
      const avg_cost = parseFloat(String(holdingData.avg_cost).replace(',', '.'));
      await setDoc(doc(db, 'holdings', docId), {
        ...holdingData,
        shares,
        avg_cost,
        updated_at: new Date().toISOString()
      }, { merge: true });
      showToast(`${holdingData.ticker || docId} güncellendi!`, '✅');
    } catch (err) {
      console.error('updateHolding error:', err);
      showToast(`Güncelleme hatası: ${err.message}`, '⚠️');
    }
  };

  const deleteHolding = async (docId) => {
    try {
      await deleteDoc(doc(db, 'holdings', docId));
      showToast(`Varlık başarıyla silindi!`, '🗑️');
    } catch (err) {
      console.error('deleteHolding error:', err);
      showToast(`Silme hatası: ${err.message}`, '⚠️');
    }
  };

  // Automated Sell Execution: calculates realized P/L and logs to ledger
  const sellHolding = async (holding, sharesSold, sellPrice, sellCurrency = 'TRY') => {
    const qty = parseFloat(String(sharesSold).replace(',', '.'));
    const p = parseFloat(String(sellPrice).replace(',', '.'));
    if (!qty || qty <= 0 || !p || p <= 0) {
      showToast('Geçersiz satış adedi veya fiyatı!', '⚠️');
      return;
    }

    try {
      const isSellUSD = sellCurrency === 'USD';
      const isCostUSD = holding.currency === 'USD' || (holding.cost_rate && Number(holding.cost_rate) > 1.5) || holding.isHoldingUSD;
      
      // Total proceeds
      const proceedsTRY = isSellUSD ? (qty * p * usdtry) : (qty * p);
      const proceedsUSD = proceedsTRY / usdtry;

      // Cost basis of sold shares
      const costRate = Number(holding.cost_rate) > 1.5 ? Number(holding.cost_rate) : usdtry;
      const costTRY = isCostUSD ? (qty * (holding.avg_cost || 0) * costRate) : (qty * (holding.avg_cost || 0));
      const costUSD = costTRY / costRate;

      // Realized Profit
      const realizedPL_TRY = proceedsTRY - costTRY;
      const realizedPL_USD = proceedsUSD - costUSD;
      const returnPct = costTRY > 0 ? (realizedPL_TRY / costTRY) * 100 : 0;

      const tradeId = Date.now();
      const tradeItem = {
        id: tradeId,
        date: new Date().toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
        ticker: holding.ticker,
        name: holding.name || holding.ticker,
        type: holding.type || 'Hisse',
        action: qty >= (holding.shares || 0) ? 'Tam Satış' : 'Kısmi Satış',
        shares: qty,
        avg_cost: holding.avg_cost,
        sell_price: p,
        currency: sellCurrency,
        holding_currency: holding.currency || 'TRY',
        exchange_rate: usdtry,
        total_proceeds_try: Math.round(proceedsTRY * 100) / 100,
        total_proceeds_usd: Math.round(proceedsUSD * 100) / 100,
        realized_pl_try: Math.round(realizedPL_TRY * 100) / 100,
        realized_pl_usd: Math.round(realizedPL_USD * 100) / 100,
        realized_return_pct: Math.round(returnPct * 100) / 100,
        note: `${holding.ticker} ${qty >= (holding.shares || 0) ? 'Tam' : 'Kısmi'} Satış (${sellCurrency})`
      };

      // 1. Record in trade ledger
      await setDoc(doc(db, 'trade_ledger', String(tradeId)), tradeItem);

      // 2. Identify the holding document safely and update
      const targetDocId = holding.id || (holding.ticker ? holding.ticker.replace(/[\/\.]/g, '_').toUpperCase() : null);
      if (targetDocId) {
        const remainingShares = Math.max(0, (holding.shares || 0) - qty);
        if (remainingShares <= 0.00001) {
          try {
            await deleteDoc(doc(db, 'holdings', targetDocId));
          } catch (e) {}
          showToast(`${holding.ticker} pozisyonu tamamen kapatıldı ve Kâr Defterine işlendi!`, '📜');
        } else {
          await setDoc(doc(db, 'holdings', targetDocId), {
            shares: remainingShares,
            updated_at: new Date().toISOString()
          }, { merge: true });
          showToast(`${holding.ticker} kısmi satışı yapıldı (+₺${tradeItem.realized_pl_try.toLocaleString('tr-TR')})!`, '✅');
        }
      }
    } catch (err) {
      console.error('SellHolding error:', err);
      showToast(`Satış kaydedilirken hata oluştu: ${err.message}`, '⚠️');
    }
  };

  const deleteTrade = async (tradeId) => {
    await deleteDoc(doc(db, 'trade_ledger', String(tradeId)));
    showToast('İşlem kaydı silindi!', '🗑️');
  };

  // Gold & PPF Actions
  const addGoldPurchase = async (grams, buyPriceTRY, note = '') => {
    const id = Date.now();
    await setDoc(doc(db, 'gold_purchases', String(id)), {
      id,
      date: new Date().toLocaleDateString('tr-TR'),
      grams: Number(grams),
      buy_price_try: Number(buyPriceTRY),
      note: note || `${grams}g Gram Altın Alımı`
    });
    showToast(`${grams}g Gram Altın kaydı eklendi!`, '👑');
  };

  const deleteGoldPurchase = async (id) => {
    await deleteDoc(doc(db, 'gold_purchases', String(id)));
    showToast('Altın alım kaydı silindi!', '🗑️');
  };

  const updatePpfBalance = async (balanceTRY) => {
    await setDoc(doc(db, 'allocation', 'current'), {
      ...allocation,
      ppf_balance_try: Number(balanceTRY),
      last_updated: new Date().toISOString()
    }, { merge: true });
    showToast(`PPF bakiyesi ₺${Number(balanceTRY).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} olarak güncellendi!`, '🛡️');
  };

  const updateCashBalance = async (tryAmt, usdAmt) => {
    const cleanTRY = Math.max(0, parseFloat(String(tryAmt).replace(',', '.')) || 0);
    const cleanUSD = Math.max(0, parseFloat(String(usdAmt).replace(',', '.')) || 0);
    await setDoc(doc(db, 'allocation', 'current'), {
      ...allocation,
      cash_try: cleanTRY,
      cash_usd: cleanUSD,
      last_updated: new Date().toISOString()
    }, { merge: true });
    showToast(`Serbest Nakit güncellendi: ₺${cleanTRY.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} / $${cleanUSD.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`, '💵');
  };

  const transferToShield = async (amountTRY, destination = 'ppf') => {
    const amt = parseFloat(amountTRY);
    if (!amt || amt <= 0) return;

    if (destination === 'ppf') {
      const curBal = Number(allocation.ppf_balance_try) || 0;
      await updatePpfBalance(curBal + amt);
      showToast(`₺${amt.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} PPF Kuru Barut tamponuna aktarıldı!`, '🛡️');
    } else if (destination === 'cash_try' || destination === 'cash') {
      const curTRY = Number(allocation.cash_try) || 0;
      const curUSD = Number(allocation.cash_usd) || 0;
      await updateCashBalance(curTRY + amt, curUSD);
      showToast(`₺${amt.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} Serbest Nakit (TL) alım gücüne aktarıldı!`, '💵');
    } else if (destination === 'cash_usd') {
      const curTRY = Number(allocation.cash_try) || 0;
      const curUSD = Number(allocation.cash_usd) || 0;
      const amtUSD = usdtry > 0 ? (amt / usdtry) : 0;
      await updateCashBalance(curTRY, curUSD + amtUSD);
      showToast(`$${amtUSD.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} Serbest Nakit (USD) alım gücüne aktarıldı!`, '💵');
    } else {
      const pGold = gramGoldPrice > 0 ? gramGoldPrice : 6600.0;
      const grams = Math.round((amt / pGold) * 100) / 100;
      await addGoldPurchase(grams, pGold, 'Kâr Realizasyonundan Altına Aktarım');
      showToast(`₺${amt.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ile ${grams}g Altın portföye eklendi!`, '🥇');
    }
  };

  // 100% Cloud Standalone JSON Backup Export & Import (Zero Excel Dependency)
  const exportBackup = () => {
    try {
      const backupData = {
        app: 'Hakan Genç Bloomberg Terminal',
        version: '2.0.0',
        exported_at: new Date().toISOString(),
        holdings,
        goldPurchases,
        allocation,
        tradeLedger,
        settings
      };

      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backupData, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      const dateStr = new Date().toISOString().slice(0, 10);
      downloadAnchor.setAttribute('download', `Bloomberg_Terminal_Yedek_${dateStr}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      showToast('Portföy yedeği JSON olarak başarıyla indirildi!', '💾');
    } catch (err) {
      showToast(`Yedekleme hatası: ${err.message}`, '⚠️');
    }
  };

  const importBackup = async (jsonData) => {
    try {
      if (!jsonData || typeof jsonData !== 'object') throw new Error('Geçersiz JSON dosyası');

      // 1. Restore holdings
      if (Array.isArray(jsonData.holdings)) {
        for (const h of jsonData.holdings) {
          const docId = (h.ticker || h.id).replace(/[\/\.]/g, '_').toUpperCase();
          await setDoc(doc(db, 'holdings', docId), {
            ...h,
            ticker: (h.ticker || docId).toUpperCase(),
            shares: Number(h.shares),
            avg_cost: Number(h.avg_cost),
            updated_at: new Date().toISOString()
          });
        }
      }

      // 2. Restore gold purchases
      if (Array.isArray(jsonData.goldPurchases)) {
        for (const g of jsonData.goldPurchases) {
          await setDoc(doc(db, 'gold_purchases', String(g.id || Date.now())), g);
        }
      }

      // 3. Restore allocation
      if (jsonData.allocation) {
        await setDoc(doc(db, 'allocation', 'current'), jsonData.allocation);
      }

      // 4. Restore trade ledger
      if (Array.isArray(jsonData.tradeLedger)) {
        for (const t of jsonData.tradeLedger) {
          await setDoc(doc(db, 'trade_ledger', String(t.id || Date.now())), t);
        }
      }

      showToast('Yedek başarıyla Firestore bulut veritabanına geri yüklendi!', '✅');
    } catch (err) {
      showToast(`Geri yükleme hatası: ${err.message}`, '⚠️');
    }
  };

  const value = {
    holdings,
    goldPurchases,
    allocation,
    tradeLedger,
    settings,
    loading,
    marketQuotes,
    usdtry,
    gramGoldPrice,
    lastMarketUpdate,
    isUpdatingMarket,
    fetchMarketData,
    activeTab,
    setActiveTab,
    currentCurrency,
    setCurrentCurrency,
    toast,
    showToast,
    portfolioSummary,
    // Actions
    addHolding,
    updateHolding,
    deleteHolding,
    sellHolding,
    deleteTrade,
    addGoldPurchase,
    deleteGoldPurchase,
    updatePpfBalance,
    updateCashBalance,
    transferToShield,
    exportBackup,
    importBackup
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
