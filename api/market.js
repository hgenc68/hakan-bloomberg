// Vercel Serverless Function to fetch live market quotes & macro pulse
const SPECIAL_MAP = {
  'SUI': 'SUI20947-USD',
  'SUI-USD': 'SUI20947-USD',
  'BIO': 'BIO34812-USD',
  'BIO-USD': 'BIO34812-USD',
  'XAUT': 'XAUT-USD',
  'XAUT-USD': 'XAUT-USD',
  'LDO': 'LDO-USD',
  'OP': 'OP-USD',
  'ARKM': 'ARKM-USD',
  'DOGE': 'DOGE-USD',
  'BTC': 'BTC-USD',
  'ETH': 'ETH-USD'
};

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
        const resolvedSymbol = SPECIAL_MAP[upper] || upper;
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
        const prevClose = meta.previousClose || meta.chartPreviousClose || currentPrice;
        const change = currentPrice - prevClose;
        const changePct = prevClose > 0 ? (change / prevClose) * 100 : 0;

        const quoteObj = {
          symbol: upper,
          resolvedSymbol: resolvedSymbol,
          price: currentPrice,
          previousClose: prevClose,
          change: change,
          changePct: changePct,
          currency: meta.currency || 'USD',
          regularMarketTime: meta.regularMarketTime
        };

        results[upper] = quoteObj;
        if (resolvedSymbol !== upper) {
          results[resolvedSymbol] = quoteObj;
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
