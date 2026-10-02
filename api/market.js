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
  
  if (upper.endsWith('USD') && !upper.includes('-') && !upper.includes('=') && !upper.includes('.')) {
    const base = upper.slice(0, -3);
    const withHyphen = `${base}-USD`;
    if (SPECIAL_MAP[withHyphen]) return SPECIAL_MAP[withHyphen];
    if (SPECIAL_MAP[base]) return SPECIAL_MAP[base];
    return withHyphen;
  }
  return upper;
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

  const { symbols, type } = req.query;

  // Handle pulse request (Fear & Greed, VIX, etc.)
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

      return res.status(200).json({
        status: 'success',
        fearGreed,
        vix,
        timestamp: Date.now()
      });
    } catch (err) {
      return res.status(500).json({ status: 'error', message: err.message });
    }
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
          results[upper.replace('-USD', '')] = quoteObj;
        } else if (upper.endsWith('USD') && !upper.includes('-')) {
          results[upper.slice(0, -3) + '-USD'] = quoteObj;
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
