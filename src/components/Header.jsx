import React from 'react';
import { useApp } from '../context/AppContext';
import { RefreshCw, CloudCheck, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';

export default function Header() {
  const {
    marketQuotes,
    usdtry,
    isUpdatingMarket,
    fetchMarketData,
    currentCurrency,
    setCurrentCurrency,
    lastMarketUpdate,
    portfolioSummary
  } = useApp();

  const tickers = [
    { label: 'USD/TRY', key: 'USDTRY=X', fallback: usdtry, suffix: '₺' },
    { label: 'BIST 100', key: 'XU100.IS', fallback: 9850, suffix: '' },
    { label: 'S&P 500', key: '^GSPC', fallback: 5800, suffix: '$' },
    { label: 'ALTIN (ONS)', key: 'GC=F', fallback: 2680, suffix: '$' },
    { label: 'BITCOIN', key: 'BTC-USD', fallback: 64500, suffix: '$' },
    { label: 'ETHEREUM', key: 'ETH-USD', fallback: 2650, suffix: '$' }
  ];

  return (
    <header className="terminal-header">
      {/* Ticker Tape Marquee */}
      <div className="ticker-tape">
        <div className="ticker-tape-track">
          {tickers.map(t => {
            const q = marketQuotes[t.key] || {};
            const price = q.price !== undefined ? q.price : t.fallback;
            const changePct = q.changePct || 0;
            const isUp = changePct >= 0;

            return (
              <div key={t.label} className="ticker-item">
                <span className="ticker-name">{t.label}:</span>
                <span className="ticker-val mono">
                  {t.suffix === '$' ? '$' : ''}{Number(price).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{t.suffix === '₺' ? ' ₺' : ''}
                </span>
                <span className={`ticker-change mono ${isUp ? 'up' : 'down'}`}>
                  {isUp ? '▲' : '▼'} {isUp ? '+' : ''}{changePct.toFixed(2)}%
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Terminal Bar */}
      <div className="terminal-bar">
        <div className="brand-section">
          <div className="brand-badge">PRO</div>
          <div>
            <h1 className="terminal-title">HAKAN GENÇ BLOOMBERG TERMINAL</h1>
            <p className="terminal-subtitle">
              PORTFOLIO, REALIZED P&L LEDGER & QUANT VALUATION HUB
            </p>
          </div>
        </div>

        <div className="controls-section">
          {/* Cloud Sync Status */}
          <div className="sync-badge">
            <span className="pulse-dot"></span>
            <span className="sync-text">FIREBASE CLOUD SENKRON</span>
          </div>

          {/* Currency Toggle */}
          <div className="btn-group">
            <button
              type="button"
              className={`btn-toggle ${currentCurrency === 'try' ? 'active' : ''}`}
              onClick={() => setCurrentCurrency('try')}
            >
              ₺ TRY
            </button>
            <button
              type="button"
              className={`btn-toggle ${currentCurrency === 'usd' ? 'active' : ''}`}
              onClick={() => setCurrentCurrency('usd')}
            >
              $ USD
            </button>
          </div>

          {/* Refresh Button */}
          <button
            type="button"
            className="btn-refresh"
            onClick={fetchMarketData}
            disabled={isUpdatingMarket}
            title="Canlı piyasa fiyatlarını güncelle"
          >
            <RefreshCw className={`icon ${isUpdatingMarket ? 'spin' : ''}`} size={14} />
            <span>{isUpdatingMarket ? 'GÜNCELLENİYOR...' : 'CANLI YENİLE'}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
