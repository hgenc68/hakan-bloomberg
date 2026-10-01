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
  'SPCX': 'SPCX',
  'DRAM': 'DRAM',
  'ETH-USD': 'ETH-USD',
  'BTC-USD': 'BTC-USD',
  'XAUT-USD': 'XAUT-USD',
  'XAUT': 'XAUT-USD',
  'XAUT-usd': 'XAUT-USD',
  'LDO': 'LDO-USD',
  'BIO-USD': 'BIO34812-USD',
  'BIO': 'BIO34812-USD',
  'SUI': 'SUI20947-USD',
  'SUI-USD': 'SUI20947-USD',
  'OP': 'OP-USD',
  'ARKM': 'ARKM-USD',
  'DOGE': 'DOGE-USD',
  'ABBV': 'ABBV',
  'TSM': 'TSM',
  'NVDA': 'NVDA'
};

export const AppProvider = ({ children }) => {
  // State from Firestore
  const [holdings, setHoldings] = useState([]);
  const [goldPurchases, setGoldPurchases] = useState([]);
  const [allocation, setAllocation] = useState({ ppf_balance_try: 45000, targets: {}, guardrails: {} });
  const [tradeLedger, setTradeLedger] = useState([]);
  const [settings, setSettings] = useState({ currency: 'try', timeframe: '1y' });
  const [loading, setLoading] = useState(true);

  // Market quotes state
  const [marketQuotes, setMarketQuotes] = useState({});
  const [usdtry, setUsdtry] = useState(49.03);
  const [gramGoldPrice, setGramGoldPrice] = useState(6600.0);
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

  // 1. Subscribe to Firestore Collections in Real-Time
  useEffect(() => {
    const unsubHoldings = onSnapshot(collection(db, 'holdings'), (snap) => {
      const list = snap.docs.map(d => ({ ...d.data(), id: d.id }));
      setHoldings(list);
      setLoading(false);
    });

    const unsubGold = onSnapshot(collection(db, 'gold_purchases'), (snap) => {
      const list = snap.docs.map(d => ({ ...d.data(), id: d.id }));
      list.sort((a, b) => (Number(b.id) || 0) - (Number(a.id) || 0));
      setGoldPurchases(list);
    });

    const unsubAlloc = onSnapshot(doc(db, 'allocation', 'current'), (docSnap) => {
      if (docSnap.exists()) {
        setAllocation(docSnap.data());
      }
    });

    const unsubLedger = onSnapshot(collection(db, 'trade_ledger'), (snap) => {
      const list = snap.docs.map(d => ({ ...d.data(), id: d.id }));
      list.sort((a, b) => (Number(b.id) || 0) - (Number(a.id) || 0));
      setTradeLedger(list);
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
      
      holdings.forEach(h => {
        const sym = h.clean_ticker || TICKER_MAP[h.ticker.toUpperCase()] || h.ticker;
        symbolsToFetch.add(sym);
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
            const cleanS = TICKER_MAP[s.toUpperCase()] || s;
            const r = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(cleanS)}?interval=1d&range=2d`);
            if (!r.ok) return;
            const j = await r.json();
            const meta = j?.chart?.result?.[0]?.meta;
            if (meta) {
              const p = meta.regularMarketPrice || meta.chartPreviousClose || 0;
              const prev = meta.previousClose || meta.chartPreviousClose || p;
              const quoteObj = {
                symbol: s,
                price: p,
                previousClose: prev,
                change: p - prev,
                changePct: prev > 0 ? ((p - prev) / prev) * 100 : 0,
                currency: meta.currency || (cleanS.endsWith('.IS') ? 'TRY' : 'USD')
              };
              fetchedQuotes[s] = quoteObj;
              fetchedQuotes[cleanS] = quoteObj;
            }
          } catch (err) {}
        });
        await Promise.all(promises);
      }

      // Extract USDTRY rate
      const usdRate = fetchedQuotes['USDTRY=X']?.price || 49.03;
      setUsdtry(usdRate);

      // Extract Gold Ounce price and calculate Gram Gold TRY
      const goldOunceUSD = fetchedQuotes['GC=F']?.price || 4200.0;
      const calcGramGold = (goldOunceUSD / 31.1034768) * usdRate;
      setGramGoldPrice(calcGramGold > 0 ? calcGramGold : 6600.0);

      setMarketQuotes(fetchedQuotes);
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
      const sym = h.clean_ticker || TICKER_MAP[h.ticker.toUpperCase()] || h.ticker;
      const quote = marketQuotes[sym] || marketQuotes[h.ticker.toUpperCase()] || marketQuotes[h.ticker] || {};
      // User holding tracking currency
      // If cost_rate > 1.5 or currency === 'USD', it was bought in USD (e.g. SPCX, DRAM, NVDA, TSM, ABBV)
      const isHoldingUSD = h.currency === 'USD' || (Number(h.cost_rate) > 1.5);
      const effectiveRate = Number(h.cost_rate) > 1.5 ? Number(h.cost_rate) : usdtry;

      const hasQuote = quote.price !== undefined;
      const livePrice = hasQuote ? quote.price : (h.avg_cost || 0);
      const prevClose = quote.previousClose !== undefined ? quote.previousClose : livePrice;
      const changePct = quote.changePct !== undefined ? quote.changePct : 0;

      // If quote is not yet loaded from network, price is avg_cost whose currency is isHoldingUSD
      const quoteCurrency = hasQuote
        ? (quote.currency || (sym.endsWith('.IS') ? 'TRY' : 'USD'))
        : (isHoldingUSD ? 'USD' : 'TRY');

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
      const prevLivePriceTRY = quoteCurrency === 'USD' ? (prevClose * usdtry) : prevClose;
      const dayPLTRY = (h.shares || 0) * (livePriceTRY - prevLivePriceTRY);
      const dayPLUSD = usdtry > 0 ? (dayPLTRY / usdtry) : 0;

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

    // C) PPF Cash Buffer
    const ppfBalanceTRY = Number(allocation.ppf_balance_try) || 0;
    totalCostTRY += ppfBalanceTRY;
    totalValTRY += ppfBalanceTRY;

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
      usdtry
    };
  }, [holdings, goldPurchases, allocation, tradeLedger, marketQuotes, usdtry, gramGoldPrice]);

  // 4. CRUD Actions interacting with Firestore
  const addHolding = async (holdingData) => {
    const docId = holdingData.ticker.replace(/[\/\.]/g, '_').toUpperCase();
    await setDoc(doc(db, 'holdings', docId), {
      ...holdingData,
      ticker: holdingData.ticker.toUpperCase(),
      shares: Number(holdingData.shares),
      avg_cost: Number(holdingData.avg_cost),
      updated_at: new Date().toISOString()
    });
    showToast(`${holdingData.ticker} başarıyla eklendi!`, '✅');
  };

  const updateHolding = async (docId, holdingData) => {
    await updateDoc(doc(db, 'holdings', docId), {
      ...holdingData,
      shares: Number(holdingData.shares),
      avg_cost: Number(holdingData.avg_cost),
      updated_at: new Date().toISOString()
    });
    showToast(`${holdingData.ticker || docId} güncellendi!`, '✅');
  };

  const deleteHolding = async (docId) => {
    await deleteDoc(doc(db, 'holdings', docId));
    showToast(`Varlık başarıyla silindi!`, '🗑️');
  };

  // Automated Sell Execution: calculates realized P/L and logs to ledger
  const sellHolding = async (holding, sharesSold, sellPrice, sellCurrency = 'TRY') => {
    const qty = parseFloat(sharesSold);
    const p = parseFloat(sellPrice);
    if (!qty || qty <= 0 || !p || p <= 0) {
      showToast('Geçersiz satış adedi veya fiyatı!', '⚠️');
      return;
    }

    const isSellUSD = sellCurrency === 'USD';
    const isCostUSD = holding.currency === 'USD' || (holding.cost_rate && holding.cost_rate > 1.5);
    
    // Total proceeds
    const proceedsTRY = isSellUSD ? (qty * p * usdtry) : (qty * p);
    const proceedsUSD = proceedsTRY / usdtry;

    // Cost basis of sold shares
    const costTRY = isCostUSD ? (qty * (holding.avg_cost || 0) * (holding.cost_rate || usdtry)) : (qty * (holding.avg_cost || 0));
    const costUSD = costTRY / (holding.cost_rate || usdtry);

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
      action: qty >= holding.shares ? 'Tam Satış' : 'Kısmi Satış',
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
      note: `${holding.ticker} ${qty >= holding.shares ? 'Tam' : 'Kısmi'} Satış (${sellCurrency})`
    };

    // 1. Record in trade ledger
    await setDoc(doc(db, 'trade_ledger', String(tradeId)), tradeItem);

    // 2. Update or delete holding
    const remainingShares = holding.shares - qty;
    if (remainingShares <= 0.00001) {
      await deleteDoc(doc(db, 'holdings', holding.id));
      showToast(`${holding.ticker} pozisyonu tamamen kapatıldı ve Kâr Defterine işlendi!`, '📜');
    } else {
      await updateDoc(doc(db, 'holdings', holding.id), {
        shares: remainingShares,
        updated_at: new Date().toISOString()
      });
      showToast(`${holding.ticker} kısmi satışı yapıldı (+₺${tradeItem.realized_pl_try})!`, '✅');
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

  const transferToShield = async (amountTRY, destination = 'ppf') => {
    const amt = parseFloat(amountTRY);
    if (!amt || amt <= 0) return;

    if (destination === 'ppf') {
      const curBal = Number(allocation.ppf_balance_try) || 0;
      await updatePpfBalance(curBal + amt);
      showToast(`₺${amt.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} PPF Kuru Barut tamponuna aktarıldı!`, '🛡️');
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
    transferToShield,
    exportBackup,
    importBackup
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
