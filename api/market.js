// Vercel Serverless Function to fetch live market quotes from Yahoo Finance
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

  const { symbols } = req.query;
  if (!symbols) {
    return res.status(400).json({ status: 'error', message: 'Symbols parameter required' });
  }

  const symbolList = symbols.split(',').map(s => s.trim()).filter(Boolean);

  try {
    const results = {};
    const fetchPromises = symbolList.map(async (symbol) => {
      try {
        const cleanSym = symbol.toUpperCase();
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(cleanSym)}?interval=1d&range=5d`;
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

        results[cleanSym] = {
          symbol: cleanSym,
          price: currentPrice,
          previousClose: prevClose,
          change: change,
          changePct: changePct,
          currency: meta.currency || 'USD',
          regularMarketTime: meta.regularMarketTime
        };
      } catch (err) {
        console.warn(`Error fetching ${symbol}:`, err.message);
      }
    });

    await Promise.all(fetchPromises);

    res.setHeader('Cache-Control', 's-maxage=15, stale-while-revalidate=30');
    return res.status(200).json({ status: 'success', data: results });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
}
