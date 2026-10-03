// Vercel Serverless Function to fetch live market quotes & macro pulse
const SPECIAL_MAP = {
  // SUI
  'SUI': 'SUI20947-USD',
  'SUI-USD': 'SUI20947-USD',
  'SUIUSD': 'SUI20947-USD',
  // BIO Protocol
  'BIO': 'BIO34812-USD',
  'BIO-USD': 'BIO34812-USD',
  'BIOUSD': 'BIO34812-USD',
  // Tether Gold
  'XAUT': 'XAUT-USD',
  'XAUT-USD': 'XAUT-USD',
  'XAUTUSD': 'XAUT-USD',
  // Lido DAO
  'LDO': 'LDO-USD',
  'LDO-USD': 'LDO-USD',
  'LDOUSD': 'LDO-USD',
  // Optimism
  'OP': 'OP-USD',
  'OP-USD': 'OP-USD',
  'OPUSD': 'OP-USD',
  // Arkham
  'ARKM': 'ARKM-USD',
  'ARKM-USD': 'ARKM-USD',
  'ARKMUSD': 'ARKM-USD',
  // Dogecoin
  'DOGE': 'DOGE-USD',
  'DOGE-USD': 'DOGE-USD',
  'DOGEUSD': 'DOGE-USD',
  // Bitcoin
  'BTC': 'BTC-USD',
  'BTC-USD': 'BTC-USD',
  'BTCUSD': 'BTC-USD',
  // Ethereum
  'ETH': 'ETH-USD',
  'ETH-USD': 'ETH-USD',
  'ETHUSD': 'ETH-USD',
  // Solana
  'SOL': 'SOL-USD',
  'SOL-USD': 'SOL-USD',
  'SOLUSD': 'SOL-USD',
  // Avalanche
  'AVAX': 'AVAX-USD',
  'AVAX-USD': 'AVAX-USD',
  'AVAXUSD': 'AVAX-USD',
  // XRP
  'XRP': 'XRP-USD',
  'XRP-USD': 'XRP-USD',
  'XRPUSD': 'XRP-USD',
  // Chainlink
  'LINK': 'LINK-USD',
  'LINK-USD': 'LINK-USD',
  'LINKUSD': 'LINK-USD',
  // Binance Coin
  'BNB': 'BNB-USD',
  'BNB-USD': 'BNB-USD',
  'BNBUSD': 'BNB-USD',
  // BIST Stocks
  'TUPRS': 'TUPRS.IS',
  'TUPRS.IS': 'TUPRS.IS',
  'BYDNR': 'BYDNR.IS',
  'BYDNR.IS': 'BYDNR.IS'
};

function resolveSymbol(raw) {
  if (!raw) return raw;
  const upper = raw.toUpperCase().trim();
  if (SPECIAL_MAP[upper]) return SPECIAL_MAP[upper];
  
  // Handle USDT suffixes from Binance/TradingView
  if (upper.endsWith('USDT')) {
    const base = upper.slice(0, -4);
    const withHyphen = `${base}-USD`;
    if (SPECIAL_MAP[withHyphen]) return SPECIAL_MAP[withHyphen];
    if (SPECIAL_MAP[base]) return SPECIAL_MAP[base];
    return withHyphen;
  }

  if (upper.endsWith('USD') && !upper.includes('-') && !upper.includes('=') && !upper.includes('.')) {
    const base = upper.slice(0, -3);
    const withHyphen = `${base}-USD`;
    if (SPECIAL_MAP[withHyphen]) return SPECIAL_MAP[withHyphen];
    if (SPECIAL_MAP[base]) return SPECIAL_MAP[base];
    return withHyphen;
  }
  return upper;
}

const CAP_BENCHMARKS = {
  'TOTAL': { price: 2840000000000, changePct: 1.45, label: '$2.84T', currency: 'USD' },
  'TOTAL2': { price: 1260000000000, changePct: 1.82, label: '$1.26T', currency: 'USD' },
  'TOTAL3': { price: 748500000000, changePct: 2.65, label: '$748.5B', currency: 'USD' },
  'OTHERS': { price: 298200000000, changePct: 3.15, label: '$298.2B', currency: 'USD' },
  'TOTALDEFI': { price: 94100000000, changePct: 1.90, label: '$94.1B', currency: 'USD' }
};

async function fetchMarketNews() {
  try {
    const trPromise = fetch('https://news.google.com/rss/search?q=(BIST+OR+TCMB+OR+borsa+OR+enflasyon)+when:3d&hl=tr&gl=TR&ceid=TR:tr', {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    }).then(r => r.text()).catch(() => '');

    const globalPromise = fetch('https://news.google.com/rss/search?q=(Fed+OR+Nvidia+OR+stocks+OR+crypto)+when:2d&hl=en-US&gl=US&ceid=US:en', {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    }).then(r => r.text()).catch(() => '');

    const [trXml, globalXml] = await Promise.all([trPromise, globalPromise]);

    function parseXmlItems(xml, defaultCategory) {
      if (!xml) return [];
      const itemMatches = xml.match(/<item>[\s\S]*?<\/item>/g) || [];
      return itemMatches.slice(0, 10).map((item, idx) => {
        let title = (item.match(/<title>(.*?)<\/title>/)?.[1] || '').replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').trim();
        const link = (item.match(/<link>(.*?)<\/link>/)?.[1] || '').replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').trim();
        const pubDate = (item.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] || '').trim();
        let source = (item.match(/<source[^>]*>(.*?)<\/source>/)?.[1] || '').replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').trim();

        const dashIdx = title.lastIndexOf(' - ');
        if (dashIdx > 0) {
          if (!source) source = title.substring(dashIdx + 3).trim();
          title = title.substring(0, dashIdx).trim();
        }

        const lower = (title + ' ' + (source || '')).toLowerCase();
        let tag = defaultCategory;
        if (lower.includes('bist') || lower.includes('borsa') || lower.includes('thyao') || lower.includes('eregl') || lower.includes('asels') || lower.includes('kap')) {
          tag = 'BIST & KAP';
        } else if (lower.includes('tcmb') || lower.includes('merkez bank') || lower.includes('faiz') || lower.includes('enflasyon') || lower.includes('şimşek') || lower.includes('tüik')) {
          tag = 'TCMB & Makro';
        } else if (lower.includes('nvidia') || lower.includes('chip') || lower.includes('çip') || lower.includes('ai') || lower.includes('yapay zeka') || lower.includes('tsmc') || lower.includes('semiconductor')) {
          tag = 'Teknoloji & AI';
        } else if (lower.includes('bitcoin') || lower.includes('kripto') || lower.includes('crypto') || lower.includes('altın') || lower.includes('gold') || lower.includes('petrol')) {
          tag = 'Kripto & Emtia';
        } else if (lower.includes('fed') || lower.includes('fomc') || lower.includes('powell') || lower.includes('wall st') || lower.includes('s&p')) {
          tag = 'Fed & Wall St';
        }

        const bearishWords = ['düştü', 'geriledi', 'kayıp', 'baskı', 'satıcılı', 'risk', 'çöktü', 'alarm', 'slump', 'falls', 'tumbles', 'drop', 'warning'];
        const bull = !bearishWords.some(w => lower.includes(w));

        return {
          id: `${defaultCategory.replace(/\s+/g, '')}-${idx}-${Date.now()}`,
          title,
          link,
          source: source || 'Piyasa',
          pubDate,
          tag,
          bull
        };
      }).filter(n => n.title.length > 5);
    }

    const trItems = parseXmlItems(trXml, 'BIST & TCMB');
    const globalItems = parseXmlItems(globalXml, 'Fed & Küresel');

    const combined = [];
    const maxLen = Math.max(trItems.length, globalItems.length);
    for (let i = 0; i < maxLen; i++) {
      if (trItems[i]) combined.push(trItems[i]);
      if (globalItems[i]) combined.push(globalItems[i]);
    }
    return combined;
  } catch (err) {
    return [];
  }
}

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { symbols, type, chart } = req.query;

  // Handle dedicated candle chart history request for any stock/crypto
  if (chart) {
    try {
      const sym = chart.trim().toUpperCase();
      const resolved = resolveSymbol(sym);
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(resolved)}?interval=1d&range=3mo`;
      const resp = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
      });
      if (resp.ok) {
        const j = await resp.json();
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
              open: Number((opens[i] || c).toFixed(2)),
              high: Number((highs[i] || c).toFixed(2)),
              low: Number((lows[i] || c).toFixed(2)),
              close: Number(c.toFixed(2)),
              volume: Number((vols[i] || 0).toFixed(0))
            });
          }
        }
        res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120');
        return res.status(200).json({ status: 'success', symbol: sym, resolved, candles });
      }
    } catch (e) {
      return res.status(500).json({ status: 'error', message: e.message });
    }
  }

  // Handle dedicated news request
  if (type === 'news') {
    try {
      const news = await fetchMarketNews();
      return res.status(200).json({
        status: 'success',
        news,
        timestamp: Date.now()
      });
    } catch (err) {
      return res.status(500).json({ status: 'error', message: err.message });
    }
  }

  // Handle pulse request (Fear & Greed, VIX, news, etc.)
  if (type === 'pulse') {
    try {
      let fearGreed = { score: 35, rating: 'fear', previousClose: 33 };
      try {
        const fgResp = await fetch('https://production.dataviz.cnn.io/index/fearandgreed/graphdata', {
          headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        if (fgResp.ok) {
          const fgJson = await fgResp.json();
          fearGreed = fgJson?.fear_and_greed || fearGreed;
        }
      } catch (e) {}

      // Fetch VIX & TNX
      let vix = { price: 16.5, changePct: 0.5 };
      try {
        const vixResp = await fetch('https://query1.finance.yahoo.com/v8/finance/chart/%5EVIX?interval=1d&range=2d');
        if (vixResp.ok) {
          const j = await vixResp.json();
          const meta = j?.chart?.result?.[0]?.meta;
          if (meta) {
            const cur = meta.regularMarketPrice || meta.chartPreviousClose || 16.5;
            const prev = meta.previousClose || meta.chartPreviousClose || cur;
            vix = { price: cur, changePct: prev > 0 ? ((cur - prev) / prev) * 100 : 0 };
          }
        }
      } catch (e) {}

      // Fetch fresh news in parallel or background
      let news = [];
      try {
        news = await fetchMarketNews();
      } catch (e) {}

      return res.status(200).json({
        status: 'success',
        fearGreed,
        vix,
        news,
        timestamp: Date.now()
      });
    } catch (err) {
      return res.status(500).json({ status: 'error', message: err.message });
    }
  // Handle candles request for Native Pro Chart
  if (type === 'candles') {
    const rawSymbol = req.query.symbol || 'SPCX';
    const interval = req.query.interval || '1d';
    const resolvedSymbol = resolveSymbol(rawSymbol.toUpperCase().trim());
    
    let range = '1y';
    if (interval === '15m') range = '5d';
    else if (interval === '1h' || interval === '60m') range = '1mo';
    else if (interval === '4h') range = '3mo';

    try {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(resolvedSymbol)}?interval=${interval}&range=${range}`;
      const resp = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
      });
      if (resp.ok) {
        const json = await resp.json();
        const result = json?.chart?.result?.[0];
        const timestamps = result?.timestamp || [];
        const quote = result?.indicators?.quote?.[0] || {};
        const opens = quote.open || [];
        const highs = quote.high || [];
        const lows = quote.low || [];
        const closes = quote.close || [];
        const volumes = quote.volume || [];

        const candles = [];
        for (let i = 0; i < timestamps.length; i++) {
          const c = closes[i];
          const o = opens[i];
          const h = highs[i];
          const l = lows[i];
          if (c !== null && c !== undefined && !isNaN(c) && o !== null && h !== null && l !== null) {
            const dateStr = new Date(timestamps[i] * 1000).toISOString().split('T')[0];
            candles.push({
              time: interval === '1d' ? dateStr : timestamps[i],
              open: Number(Number(o).toFixed(2)),
              high: Number(Number(h).toFixed(2)),
              low: Number(Number(l).toFixed(2)),
              close: Number(Number(c).toFixed(2)),
              volume: Number((volumes[i] || 0).toFixed(0))
            });
          }
        }

        if (candles.length > 0) {
          res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120');
          return res.status(200).json({
            status: 'success',
            symbol: rawSymbol,
            resolvedSymbol,
            candles,
            meta: result?.meta
          });
        }
      }
    } catch (e) {
      console.warn('Candle fetch error in api/market.js:', e.message);
    }
    return res.status(200).json({ status: 'fallback', symbol: rawSymbol, candles: [] });
  }

  if (!symbols) {
    return res.status(400).json({ status: 'error', message: 'Symbols parameter required' });
  }

  const symbolList = symbols.split(',').map(s => s.trim()).filter(Boolean);

  try {
    const results = {};
    const fetchPromises = symbolList.map(async (rawSymbol) => {
      try {
        const upper = rawSymbol.toUpperCase();
        const resolvedSymbol = resolveSymbol(upper);
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(resolvedSymbol)}?interval=1d&range=5d`;
        const resp = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });
        if (!resp.ok) return null;
        const json = await resp.json();
        const meta = json?.chart?.result?.[0]?.meta;
        if (!meta) return null;

        const currentPrice = meta.regularMarketPrice || meta.chartPreviousClose || 0;
        
        // Extract closes array from quote indicators
        const closes = (json?.chart?.result?.[0]?.indicators?.quote?.[0]?.close || [])
          .filter(c => typeof c === 'number' && !isNaN(c));
        
        // Prioritize Yahoo Finance's official regularMarketChangePercent
        let changePct = (meta.regularMarketChangePercent !== undefined && meta.regularMarketChangePercent !== null)
          ? Number(meta.regularMarketChangePercent)
          : null;

        let prevClose = meta.previousClose;

        if (changePct !== null && !isNaN(changePct)) {
          // If official changePct is provided, derive or verify prevClose strictly matching it
          if (!prevClose && currentPrice > 0) {
            prevClose = currentPrice / (1 + changePct / 100);
          }
        } else if (prevClose) {
          changePct = prevClose > 0 ? ((currentPrice - prevClose) / prevClose) * 100 : 0;
        } else if (closes.length >= 2) {
          prevClose = closes[closes.length - 2];
          changePct = prevClose > 0 ? ((currentPrice - prevClose) / prevClose) * 100 : 0;
        } else {
          prevClose = currentPrice;
          changePct = 0;
        }

        let change = currentPrice - prevClose;

        // Safety Invariant: The signs of change and changePct must never diverge!
        if (changePct > 0 && change < 0) {
          change = Math.abs(change);
          prevClose = currentPrice - change;
        } else if (changePct < 0 && change > 0) {
          change = -Math.abs(change);
          prevClose = currentPrice - change;
        }

        const quoteObj = {
          symbol: upper,
          resolvedSymbol: resolvedSymbol,
          price: currentPrice,
          previousClose: prevClose,
          change: change,
          changePct: changePct,
          currency: meta.currency || (resolvedSymbol.endsWith('.IS') ? 'TRY' : 'USD'),
          regularMarketTime: meta.regularMarketTime
        };

        results[upper] = quoteObj;
        if (resolvedSymbol !== upper) {
          results[resolvedSymbol] = quoteObj;
        }

        // Store under common aliases so any frontend lookup succeeds
        if (upper.endsWith('-USD')) {
          results[upper.replace('-USD', 'USD')] = quoteObj;
          results[upper.replace('-USD', 'USDT')] = quoteObj;
          results[upper.replace('-USD', '')] = quoteObj;
        } else if (upper.endsWith('USDT')) {
          const b = upper.slice(0, -4);
          results[b + '-USD'] = quoteObj;
          results[b + 'USD'] = quoteObj;
          results[b] = quoteObj;
        } else if (upper.endsWith('USD') && !upper.includes('-')) {
          results[upper.slice(0, -3) + '-USD'] = quoteObj;
          results[upper.slice(0, -3) + 'USDT'] = quoteObj;
          results[upper.slice(0, -3)] = quoteObj;
        } else if (upper.endsWith('.IS')) {
          results[upper.replace('.IS', '')] = quoteObj;
        }
      } catch (err) {
        console.warn(`Error fetching ${rawSymbol}:`, err.message);
      }
    });

    await Promise.all(fetchPromises);

    res.setHeader('Cache-Control', 's-maxage=15, stale-while-revalidate=30');
    return res.status(200).json({ status: 'success', data: results });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
}
