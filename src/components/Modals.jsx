import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { X, Shield, Plus, DollarSign, ShoppingCart, Edit3, Sparkles, Check, Search } from 'lucide-react';

export function ModalWrapper({ title, icon: Icon, onClose, children }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            {Icon && <Icon size={18} className="modal-title-icon" />}
            <span>{title}</span>
          </div>
          <button type="button" className="modal-close" onClick={onClose}>
            <X size={16} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

// Global Asset Master Directory for Auto-complete & Suggestions
export const POPULAR_ASSETS = [
  // BIST Major
  { ticker: 'THYAO', name: 'Türk Hava Yolları', type: 'Hisse', currency: 'TRY', defaultPrice: 312.0 },
  { ticker: 'TUPRS', name: 'Tüpraş Petrol Rafinerileri', type: 'Hisse', currency: 'TRY', defaultPrice: 148.5 },
  { ticker: 'FROTO', name: 'Ford Otomotiv Sanayi', type: 'Hisse', currency: 'TRY', defaultPrice: 1040.0 },
  { ticker: 'EREGL', name: 'Ereğli Demir ve Çelik', type: 'Hisse', currency: 'TRY', defaultPrice: 48.2 },
  { ticker: 'BYDNR', name: 'Baydöner Restoranları', type: 'Hisse', currency: 'TRY', defaultPrice: 33.64 },
  { ticker: 'ASELS', name: 'Aselsan Elektronik Sanayi', type: 'Hisse', currency: 'TRY', defaultPrice: 62.5 },
  { ticker: 'KCHOL', name: 'Koç Holding', type: 'Hisse', currency: 'TRY', defaultPrice: 220.0 },
  { ticker: 'SAHOL', name: 'Hacı Ömer Sabancı Holding', type: 'Hisse', currency: 'TRY', defaultPrice: 95.0 },
  { ticker: 'SISE', name: 'Şişecam', type: 'Hisse', currency: 'TRY', defaultPrice: 47.0 },
  { ticker: 'BIMAS', name: 'BİM Birleşik Mağazalar', type: 'Hisse', currency: 'TRY', defaultPrice: 520.0 },
  { ticker: 'GARAN', name: 'Garanti BBVA', type: 'Hisse', currency: 'TRY', defaultPrice: 118.0 },
  { ticker: 'AKBNK', name: 'Akbank T.A.Ş.', type: 'Hisse', currency: 'TRY', defaultPrice: 56.0 },
  { ticker: 'YKBNK', name: 'Yapı ve Kredi Bankası', type: 'Hisse', currency: 'TRY', defaultPrice: 29.0 },
  { ticker: 'ISCTR', name: 'Türkiye İş Bankası (C)', type: 'Hisse', currency: 'TRY', defaultPrice: 13.5 },
  { ticker: 'PGSUS', name: 'Pegasus Hava Taşımacılığı', type: 'Hisse', currency: 'TRY', defaultPrice: 235.0 },

  // US Equities
  { ticker: 'NVDA', name: 'NVIDIA Corporation', type: 'Hisse', currency: 'USD', defaultPrice: 135.0 },
  { ticker: 'TSM', name: 'Taiwan Semiconductor (TSMC)', type: 'Hisse', currency: 'USD', defaultPrice: 195.0 },
  { ticker: 'MSFT', name: 'Microsoft Corporation', type: 'Hisse', currency: 'USD', defaultPrice: 430.0 },
  { ticker: 'AAPL', name: 'Apple Inc.', type: 'Hisse', currency: 'USD', defaultPrice: 230.0 },
  { ticker: 'AMZN', name: 'Amazon.com Inc.', type: 'Hisse', currency: 'USD', defaultPrice: 190.0 },
  { ticker: 'GOOGL', name: 'Alphabet Inc. (Google)', type: 'Hisse', currency: 'USD', defaultPrice: 168.0 },
  { ticker: 'META', name: 'Meta Platforms Inc.', type: 'Hisse', currency: 'USD', defaultPrice: 580.0 },
  { ticker: 'TSLA', name: 'Tesla Inc.', type: 'Hisse', currency: 'USD', defaultPrice: 250.0 },
  { ticker: 'ABBV', name: 'AbbVie Inc.', type: 'Hisse', currency: 'USD', defaultPrice: 198.0 },
  { ticker: 'AVGO', name: 'Broadcom Inc.', type: 'Hisse', currency: 'USD', defaultPrice: 175.0 },

  // ETFs
  { ticker: 'QQQ', name: 'Invesco QQQ Trust (Nasdaq 100)', type: 'ETF', currency: 'USD', defaultPrice: 495.0 },
  { ticker: 'SPY', name: 'SPDR S&P 500 ETF Trust', type: 'ETF', currency: 'USD', defaultPrice: 580.0 },
  { ticker: 'SPCX', name: 'S&P 500 Sector Alpha ETF', type: 'ETF', currency: 'USD', defaultPrice: 30.5 },
  { ticker: 'DRAM', name: 'Defiance Semiconductor ETF', type: 'ETF', currency: 'USD', defaultPrice: 27.8 },
  { ticker: 'SMH', name: 'VanEck Semiconductor ETF', type: 'ETF', currency: 'USD', defaultPrice: 260.0 },
  { ticker: 'VOO', name: 'Vanguard S&P 500 ETF', type: 'ETF', currency: 'USD', defaultPrice: 530.0 },

  // Cryptos & Commodities
  { ticker: 'BTC-USD', name: 'Bitcoin (BTC)', type: 'Kripto', currency: 'TRY', defaultPrice: 83400.0 },
  { ticker: 'ETH-USD', name: 'Ethereum (ETH)', type: 'Kripto', currency: 'TRY', defaultPrice: 2680.0 },
  { ticker: 'SOL-USD', name: 'Solana (SOL)', type: 'Kripto', currency: 'USD', defaultPrice: 165.0 },
  { ticker: 'XAUT-USD', name: 'Tether Gold (Ons Altın)', type: 'Altın', currency: 'USD', defaultPrice: 4200.0 },
  { ticker: 'SUI', name: 'Sui Network', type: 'Kripto', currency: 'USD', defaultPrice: 1.95 },
  { ticker: 'OP', name: 'Optimism', type: 'Kripto', currency: 'USD', defaultPrice: 1.25 },
  { ticker: 'ARKM', name: 'Arkham Intelligence', type: 'Kripto', currency: 'USD', defaultPrice: 1.10 },
  { ticker: 'LDO', name: 'Lido DAO', type: 'Kripto', currency: 'USD', defaultPrice: 0.445 },
  { ticker: 'BIO', name: 'Bio Protocol', type: 'Kripto', currency: 'TRY', defaultPrice: 0.03 },
  { ticker: 'DOGE', name: 'Dogecoin', type: 'Kripto', currency: 'USD', defaultPrice: 0.18 }
];

// 1. Yeni Varlık Ekle Modalı (Akıllı Otomatik Tamamlama & İpuçları)
export function AddHoldingModal({ onClose }) {
  const { addHolding, usdtry, marketQuotes } = useApp();
  const [ticker, setTicker] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState('Hisse');
  const [shares, setShares] = useState('');
  const [avgCost, setAvgCost] = useState('');
  const [currency, setCurrency] = useState('TRY');
  const [showSuggestions, setShowSuggestions] = useState(false);

  const suggestions = useMemo(() => {
    const q = ticker.trim().toUpperCase();
    if (!q) return [];
    return POPULAR_ASSETS.filter(a =>
      a.ticker.toUpperCase().includes(q) ||
      a.name.toUpperCase().includes(q)
    ).slice(0, 6);
  }, [ticker]);

  const selectAsset = (asset) => {
    setTicker(asset.ticker);
    setName(asset.name);
    setType(asset.type);
    setCurrency(asset.currency);

    // Auto-fill cost with current live price if available
    const sym = asset.ticker;
    const cleanSym = sym.replace('.IS', '').replace('-USD', '');
    const quote = marketQuotes[sym] || marketQuotes[cleanSym] || marketQuotes[`${sym}.IS`] || {};
    const liveP = quote.price || asset.defaultPrice;
    if (liveP && !avgCost) {
      setAvgCost(String(liveP));
    }
    setShowSuggestions(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!ticker || !shares || !avgCost) return;
    await addHolding({
      ticker: ticker.toUpperCase(),
      clean_ticker: ticker.includes('.') ? ticker : (type === 'Hisse' && currency === 'TRY' ? `${ticker}.IS` : ticker),
      name: name || ticker,
      type,
      shares: parseFloat(shares.replace(',', '.')),
      avg_cost: parseFloat(avgCost.replace(',', '.')),
      currency,
      cost_rate: currency === 'USD' ? (usdtry || 49.03) : 1.0
    });
    onClose();
  };

  return (
    <ModalWrapper title="YENİ VARLIK EKLE" icon={Plus} onClose={onClose}>
      <form onSubmit={handleSubmit} className="modal-form">
        <div className="form-grid-2">
          <div className="form-group" style={{ position: 'relative' }}>
            <label>SEMBOL (TICKER) *</label>
            <input
              type="text"
              required
              placeholder="Örn: TSM, NVDA, THYAO..."
              value={ticker}
              onChange={e => {
                setTicker(e.target.value.toUpperCase());
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              className="quant-input mono"
              style={{ textTransform: 'uppercase' }}
              autoComplete="off"
            />
            {/* Live Autocomplete Suggestions Box */}
            {showSuggestions && suggestions.length > 0 && (
              <div style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                zIndex: 100,
                background: '#070a14',
                border: '1px solid rgba(0, 229, 255, 0.4)',
                borderRadius: 6,
                boxShadow: '0 8px 24px rgba(0,0,0,0.85)',
                marginTop: 4,
                maxHeight: 220,
                overflowY: 'auto'
              }}>
                {suggestions.map((s, idx) => (
                  <div
                    key={idx}
                    onMouseDown={() => selectAsset(s)}
                    style={{
                      padding: '8px 10px',
                      borderBottom: '1px solid rgba(255,255,255,0.06)',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: 11.5,
                      transition: 'background 0.15s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(0, 229, 255, 0.12)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <div>
                      <strong className="mono" style={{ color: 'var(--cyan)' }}>{s.ticker}</strong>
                      <span style={{ color: '#cbd5e1', marginLeft: 8 }}>{s.name}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <span className="nav-badge cyan" style={{ fontSize: 9, padding: '1px 5px' }}>{s.type}</span>
                      <span style={{ color: 'var(--text-muted)', fontSize: 10 }}>{s.currency === 'USD' ? '$' : '₺'}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="form-group">
            <label>VARLIK ADI</label>
            <input
              type="text"
              placeholder="Örn: Türk Hava Yolları"
              value={name}
              onChange={e => setName(e.target.value)}
              className="quant-input"
            />
          </div>
        </div>

        {/* Quick Ticker Preset Chips */}
        <div style={{ marginTop: 2, marginBottom: 12 }}>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
            <Sparkles size={11} style={{ color: 'var(--cyan)' }} />
            <span>HIZLI SEÇİM İPUÇLARI:</span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {['TSM', 'NVDA', 'TUPRS', 'THYAO', 'FROTO', 'QQQ', 'SPY', 'ETH-USD', 'XAUT-USD'].map(sym => (
              <button
                key={sym}
                type="button"
                className="chip-btn"
                onClick={() => {
                  const match = POPULAR_ASSETS.find(a => a.ticker === sym);
                  if (match) selectAsset(match);
                }}
                style={{ fontSize: 9.5, padding: '2px 7px' }}
              >
                +{sym.replace('-USD', '')}
              </button>
            ))}
          </div>
        </div>

        <div className="form-grid-2">
          <div className="form-group">
            <label>TÜR</label>
            <select
              value={type}
              onChange={e => setType(e.target.value)}
              className="quant-input"
              style={{ background: '#0b0f19', color: '#f1f5f9' }}
            >
              <option value="Hisse" style={{ background: '#0b0f19', color: '#f1f5f9' }}>Hisse Senedi (BIST / ABD)</option>
              <option value="ETF" style={{ background: '#0b0f19', color: '#f1f5f9' }}>Borsa Yatırım Fonu (ETF)</option>
              <option value="Kripto" style={{ background: '#0b0f19', color: '#f1f5f9' }}>Kripto Para</option>
              <option value="Altın" style={{ background: '#0b0f19', color: '#f1f5f9' }}>Emtia & Değerli Maden</option>
            </select>
          </div>
          <div className="form-group">
            <label>PARA BİRİMİ</label>
            <select
              value={currency}
              onChange={e => setCurrency(e.target.value)}
              className="quant-input"
              style={{ background: '#0b0f19', color: '#f1f5f9' }}
            >
              <option value="TRY" style={{ background: '#0b0f19', color: '#f1f5f9' }}>₺ TRY</option>
              <option value="USD" style={{ background: '#0b0f19', color: '#f1f5f9' }}>$ USD</option>
            </select>
          </div>
        </div>

        <div className="form-grid-2">
          <div className="form-group">
            <label>ADET / MİKTAR *</label>
            <input
              type="text"
              required
              placeholder="0.00"
              value={shares}
              onChange={e => setShares(e.target.value)}
              className="quant-input mono"
            />
          </div>
          <div className="form-group">
            <label>BİRİM MALİYET *</label>
            <input
              type="text"
              required
              placeholder="0.00"
              value={avgCost}
              onChange={e => setAvgCost(e.target.value)}
              className="quant-input mono"
            />
          </div>
        </div>

        <div className="modal-actions">
          <button type="button" className="btn-secondary" onClick={onClose}>İptal</button>
          <button type="submit" className="btn-primary">Pozisyonu Kaydet</button>
        </div>
      </form>
    </ModalWrapper>
  );
}

// 2. Kısmi Satış Modalı (Akıllı Oran Butonları, Fiyat Doldurma ve Kâr Defteri Entegrasyonu)
export function SellHoldingModal({ holding, onClose }) {
  const { sellHolding, usdtry } = useApp();
  if (!holding) return null;

  const currentShares = Number(holding.shares) || 0;
  const initialCurrency = holding.currency || (holding.isHoldingUSD ? 'USD' : 'TRY');
  const [sellCurrency, setSellCurrency] = useState(initialCurrency);

  const isUSD = sellCurrency === 'USD';
  const sym = isUSD ? '$' : '₺';

  // Smart pre-fill price from live price or cost
  const defaultPrice = isUSD
    ? (holding.livePriceUSD || holding.livePrice || holding.avg_cost || '')
    : (holding.livePriceTRY || holding.livePrice || holding.avg_cost || '');

  const [sharesSold, setSharesSold] = useState('');
  const [sellPrice, setSellPrice] = useState(String(defaultPrice || ''));

  const sharesNum = parseFloat(String(sharesSold).replace(',', '.')) || 0;
  const priceNum = parseFloat(String(sellPrice).replace(',', '.')) || 0;

  // Real-time calculation preview
  const proceeds = sharesNum * priceNum;
  const costRate = Number(holding.cost_rate) > 1.5 ? Number(holding.cost_rate) : (usdtry || 49.03);
  const costBasis = isUSD
    ? (sharesNum * (holding.currency === 'USD' ? (holding.avg_cost || 0) : ((holding.avg_cost || 0) / costRate)))
    : (sharesNum * (holding.currency === 'USD' ? ((holding.avg_cost || 0) * costRate) : (holding.avg_cost || 0)));
  const profit = proceeds - costBasis;
  const returnPct = costBasis > 0 ? (profit / costBasis) * 100 : 0;
  const remainingShares = Math.max(0, currentShares - sharesNum);

  const setPercentage = (pct) => {
    if (!currentShares) return;
    const val = (currentShares * (pct / 100));
    const formatted = val % 1 === 0 ? String(val) : String(Math.round(val * 100000) / 100000);
    setSharesSold(formatted);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (sharesNum <= 0 || priceNum <= 0) {
      alert('Lütfen geçerli bir adet ve birim satış fiyatı girin!');
      return;
    }
    if (sharesNum > currentShares + 0.00001) {
      alert(`Mevcut adetten (${currentShares}) fazla satış yapamazsınız!`);
      return;
    }
    await sellHolding(holding, sharesNum, priceNum, sellCurrency);
    onClose();
  };

  return (
    <ModalWrapper title={`${holding.ticker} - KISMİ SATIŞ & KÂR AL`} icon={ShoppingCart} onClose={onClose}>
      <form onSubmit={handleSubmit} className="modal-form">
        <div className="info-badge-box">
          <div className="info-row">
            <span>Varlık & Tür:</span>
            <strong style={{ color: 'var(--cyan)' }}>{holding.name || holding.ticker} ({holding.type || 'Hisse'})</strong>
          </div>
          <div className="info-row">
            <span>Mevcut Portföy Adedi:</span>
            <strong className="mono">{currentShares.toLocaleString('tr-TR', { maximumFractionDigits: 6 })}</strong>
          </div>
          <div className="info-row">
            <span>Alış Maliyeti:</span>
            <strong className="mono">{holding.currency === 'USD' ? '$' : '₺'}{Number(holding.avg_cost || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</strong>
          </div>
        </div>

        <div className="form-grid-2">
          <div className="form-group">
            <div className="label-between">
              <label>SATILACAK ADET *</label>
              <button
                type="button"
                className="btn-text-link"
                onClick={() => setPercentage(100)}
              >
                Tümünü Sat (Max)
              </button>
            </div>
            <input
              type="text"
              required
              placeholder="0.00"
              value={sharesSold}
              onChange={e => setSharesSold(e.target.value)}
              className="quant-input mono"
            />
            {/* Quick Percentage Chips */}
            <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
              <button type="button" className="chip-btn" onClick={() => setPercentage(25)} style={{ flex: 1, fontSize: 10, padding: '3px 0' }}>%25</button>
              <button type="button" className="chip-btn" onClick={() => setPercentage(50)} style={{ flex: 1, fontSize: 10, padding: '3px 0' }}>%50</button>
              <button type="button" className="chip-btn" onClick={() => setPercentage(75)} style={{ flex: 1, fontSize: 10, padding: '3px 0' }}>%75</button>
              <button type="button" className="chip-btn" onClick={() => setPercentage(100)} style={{ flex: 1, fontSize: 10, padding: '3px 0' }}>%100</button>
            </div>
          </div>

          <div className="form-group">
            <div className="label-between">
              <label>BİRİM SATIŞ FİYATI *</label>
              <select
                value={sellCurrency}
                onChange={e => {
                  const newCur = e.target.value;
                  setSellCurrency(newCur);
                  if (newCur === 'USD' && holding.livePriceUSD) setSellPrice(String(holding.livePriceUSD));
                  else if (newCur === 'TRY' && holding.livePriceTRY) setSellPrice(String(holding.livePriceTRY));
                }}
                className="mini-select"
                style={{ background: '#0b0f19', color: '#f1f5f9' }}
              >
                <option value="TRY" style={{ background: '#0b0f19', color: '#f1f5f9' }}>₺ TRY</option>
                <option value="USD" style={{ background: '#0b0f19', color: '#f1f5f9' }}>$ USD</option>
              </select>
            </div>
            <input
              type="text"
              required
              placeholder="0.00"
              value={sellPrice}
              onChange={e => setSellPrice(e.target.value)}
              className="quant-input mono"
            />
            <div style={{ fontSize: 9.5, color: 'var(--text-muted)', marginTop: 4 }}>
              Anlık Piyasa Fiyatı: {sym}{Number(defaultPrice || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        {/* Real-time Calculation Summary Box */}
        {sharesNum > 0 && priceNum > 0 && (
          <div className="calc-preview-box" style={{ background: '#090d16', border: '1px solid rgba(0, 229, 255, 0.25)', borderRadius: 6, padding: '10px 12px', marginTop: 10 }}>
            <div className="preview-row" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Kasaya Girecek Hasılat:</span>
              <strong className="mono text-cyan">{sym}{proceeds.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
            </div>
            <div className="preview-row" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Gerçekleşecek Net Kâr/Zarar:</span>
              <strong className={`mono ${profit >= 0 ? 'text-up' : 'text-down'}`} style={{ color: profit >= 0 ? 'var(--emerald)' : 'var(--red)' }}>
                {profit >= 0 ? '+' : ''}{sym}{profit.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({returnPct >= 0 ? '+' : ''}{returnPct.toFixed(2)}%)
              </strong>
            </div>
            <div className="preview-row" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Satış Sonrası Kalan Adet:</span>
              <strong className="mono" style={{ color: '#fff' }}>{remainingShares.toLocaleString('tr-TR', { maximumFractionDigits: 6 })}</strong>
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '6px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 6 }}>
              ✓ Satış onaylandığında bu kâr/hasılat anında <strong>Kâr Defterine</strong> kalıcı olarak işlenecektir.
            </div>
          </div>
        )}

        <div className="modal-actions" style={{ marginTop: 14 }}>
          <button type="button" className="btn-secondary" onClick={onClose}>Vazgeç</button>
          <button type="submit" className="btn-primary" style={{ background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none' }}>
            Satışı Tamamla & Kârı Kilitle
          </button>
        </div>
      </form>
    </ModalWrapper>
  );
}

// 3. Varlığı Düzenle Modalı
export function EditHoldingModal({ holding, onClose }) {
  const { updateHolding, usdtry } = useApp();
  const [ticker, setTicker] = useState(holding?.ticker || '');
  const [name, setName] = useState(holding?.name || '');
  const [shares, setShares] = useState(String(holding?.shares || ''));
  const [avgCost, setAvgCost] = useState(String(holding?.avg_cost || ''));
  const [currency, setCurrency] = useState(holding?.currency || 'TRY');
  const [type, setType] = useState(holding?.type || 'Hisse');

  if (!holding) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    await updateHolding(holding.id || holding.ticker, {
      ticker: ticker.toUpperCase(),
      name,
      shares: parseFloat(shares.replace(',', '.')),
      avg_cost: parseFloat(avgCost.replace(',', '.')),
      currency,
      type,
      cost_rate: currency === 'USD' ? (holding.cost_rate && Number(holding.cost_rate) > 1.5 ? Number(holding.cost_rate) : (usdtry || 49.03)) : 1.0
    });
    onClose();
  };

  return (
    <ModalWrapper title={`${holding.ticker} - DÜZENLE`} icon={Edit3} onClose={onClose}>
      <form onSubmit={handleSubmit} className="modal-form">
        <div className="form-grid-2">
          <div className="form-group">
            <label>SEMBOL</label>
            <input type="text" required value={ticker} onChange={e => setTicker(e.target.value.toUpperCase())} className="quant-input mono" />
          </div>
          <div className="form-group">
            <label>VARLIK ADI</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} className="quant-input" />
          </div>
        </div>

        <div className="form-grid-2">
          <div className="form-group">
            <label>ADET</label>
            <input type="text" required value={shares} onChange={e => setShares(e.target.value)} className="quant-input mono" />
          </div>
          <div className="form-group">
            <label>ORTALAMA MALİYET</label>
            <input type="text" required value={avgCost} onChange={e => setAvgCost(e.target.value)} className="quant-input mono" />
          </div>
        </div>

        <div className="form-grid-2">
          <div className="form-group">
            <label>PARA BİRİMİ</label>
            <select
              value={currency}
              onChange={e => setCurrency(e.target.value)}
              className="quant-input"
              style={{ background: '#0b0f19', color: '#f1f5f9' }}
            >
              <option value="TRY" style={{ background: '#0b0f19', color: '#f1f5f9' }}>₺ TRY</option>
              <option value="USD" style={{ background: '#0b0f19', color: '#f1f5f9' }}>$ USD</option>
            </select>
          </div>
          <div className="form-group">
            <label>TÜR</label>
            <select
              value={type}
              onChange={e => setType(e.target.value)}
              className="quant-input"
              style={{ background: '#0b0f19', color: '#f1f5f9' }}
            >
              <option value="Hisse" style={{ background: '#0b0f19', color: '#f1f5f9' }}>Hisse Senedi (BIST / ABD)</option>
              <option value="ETF" style={{ background: '#0b0f19', color: '#f1f5f9' }}>Borsa Yatırım Fonu (ETF)</option>
              <option value="Kripto" style={{ background: '#0b0f19', color: '#f1f5f9' }}>Kripto Para</option>
              <option value="Altın" style={{ background: '#0b0f19', color: '#f1f5f9' }}>Emtia / Altın</option>
            </select>
          </div>
        </div>

        <div className="modal-actions">
          <button type="button" className="btn-secondary" onClick={onClose}>İptal</button>
          <button type="submit" className="btn-primary">Güncelle</button>
        </div>
      </form>
    </ModalWrapper>
  );
}

// 4. Kârı Kur Kalkanına Aktar Modalı
export function TransferToShieldModal({ defaultAmount, onClose }) {
  const { transferToShield, portfolioSummary } = useApp();
  const [destination, setDestination] = useState('ppf');
  const [amount, setAmount] = useState(defaultAmount ? String(Math.round(defaultAmount * 100) / 100) : '7547.95');

  const handleSubmit = async (e) => {
    e.preventDefault();
    const amt = parseFloat(amount.replace(',', '.'));
    if (!amt || amt <= 0) return;
    await transferToShield(amt, destination);
    onClose();
  };

  return (
    <ModalWrapper title="KÂR / HASILATI KUR KALKANINA AKTAR" icon={Shield} onClose={onClose}>
      <form onSubmit={handleSubmit} className="modal-form">
        <div className="info-desc-box">
          Satıştan elde ettiğiniz kesinleşmiş kârı veya satış bedelini <strong>Kur Kalkanı PPF</strong> (TL Likit Fon) veya <strong>Gram Altın</strong> sepetinize ekleyerek portföyünüzün koruma kalkanını güçlendirebilirsiniz.
        </div>

        <div className="form-group">
          <label>HEDEF KALKAN TÜRÜ</label>
          <select value={destination} onChange={e => setDestination(e.target.value)} className="quant-input">
            <option value="ppf">🏢 Para Piyasası Fonu (PPF / TL Likit Kuru Barut)</option>
            <option value="gold">🥇 Gram Altın (Kur Kalkanı Altın Havuzu)</option>
          </select>
        </div>

        <div className="form-group">
          <label>AKTARILACAK TUTAR (₺) *</label>
          <input
            type="text"
            required
            value={amount}
            onChange={e => setAmount(e.target.value)}
            className="quant-input mono text-emerald"
            style={{ fontSize: '15px', fontWeight: 700 }}
          />
        </div>

        <div className="quick-btn-row">
          <button
            type="button"
            className="btn-quick-fill"
            onClick={() => setAmount(String(portfolioSummary.realizedProfitTRY || 7547.95))}
          >
            Toplam Kârı Yaz (₺{portfolioSummary.realizedProfitTRY.toLocaleString('tr-TR', { minimumFractionDigits: 2 })})
          </button>
          <button
            type="button"
            className="btn-quick-fill"
            onClick={() => setAmount(String(portfolioSummary.totalProceedsTRY || 21939.90))}
          >
            Tüm Hasılatı Yaz (₺{portfolioSummary.totalProceedsTRY.toLocaleString('tr-TR', { minimumFractionDigits: 2 })})
          </button>
        </div>

        <div className="modal-actions">
          <button type="button" className="btn-secondary" onClick={onClose}>Vazgeç</button>
          <button type="submit" className="btn-primary" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
            🛡️ Kalkana Aktar & Kaydet
          </button>
        </div>
      </form>
    </ModalWrapper>
  );
}

// 5. Gram Altın Alımı Ekle Modalı
export function AddGoldModal({ onClose }) {
  const { addGoldPurchase, gramGoldPrice } = useApp();
  const [grams, setGrams] = useState('');
  const [price, setPrice] = useState(gramGoldPrice ? String(Math.round(gramGoldPrice)) : '6600');
  const [note, setNote] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!grams || !price) return;
    await addGoldPurchase(
      parseFloat(grams.replace(',', '.')),
      parseFloat(price.replace(',', '.')),
      note
    );
    onClose();
  };

  return (
    <ModalWrapper title="GRAM ALTIN ALIMI EKLE" icon={Shield} onClose={onClose}>
      <form onSubmit={handleSubmit} className="modal-form">
        <div className="form-grid-2">
          <div className="form-group">
            <label>MİKTAR (GRAM) *</label>
            <input
              type="text"
              required
              placeholder="Örn: 0.50 veya 1.0"
              value={grams}
              onChange={e => setGrams(e.target.value)}
              className="quant-input mono"
            />
          </div>
          <div className="form-group">
            <label>BİRİM ALIŞ FİYATI (₺) *</label>
            <input
              type="text"
              required
              placeholder="Örn: 6750"
              value={price}
              onChange={e => setPrice(e.target.value)}
              className="quant-input mono"
            />
          </div>
        </div>

        <div className="form-group">
          <label>NOT / AÇIKLAMA</label>
          <input
            type="text"
            placeholder="Örn: Maaş Günü Altın Alımı"
            value={note}
            onChange={e => setNote(e.target.value)}
            className="quant-input"
          />
        </div>

        <div className="modal-actions">
          <button type="button" className="btn-secondary" onClick={onClose}>İptal</button>
          <button type="submit" className="btn-primary">Altın Alımını Kaydet</button>
        </div>
      </form>
    </ModalWrapper>
  );
}

// 6. PPF Bakiyesi Güncelle Modalı
export function UpdatePpfModal({ onClose }) {
  const { allocation, updatePpfBalance } = useApp();
  const [balance, setBalance] = useState(String(allocation.ppf_balance_try || '0'));

  const handleSubmit = async (e) => {
    e.preventDefault();
    await updatePpfBalance(parseFloat(balance.replace(',', '.')) || 0);
    onClose();
  };

  return (
    <ModalWrapper title="PPF / TL KURU BARUT BAKİYESİ" icon={Shield} onClose={onClose}>
      <form onSubmit={handleSubmit} className="modal-form">
        <div className="form-group">
          <div className="label-between">
            <label>GÜNCEL PPF / NAKİT TUTARI (₺) *</label>
            <button type="button" className="btn-text-link" onClick={() => setBalance('0')}>0 ₺ (Sıfırla)</button>
          </div>
          <input
            type="text"
            required
            value={balance}
            onChange={e => setBalance(e.target.value)}
            className="quant-input mono text-cyan"
            style={{ fontSize: '15px', fontWeight: 700 }}
          />
        </div>

        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '16px' }}>
          Para piyasası fonu veya vadesiz TL kuru barut toplamınız. Bu tutar portföyünüzün güvenlik tamponu olarak kabul edilir.
        </div>

        <div className="modal-actions">
          <button type="button" className="btn-secondary" onClick={onClose}>İptal</button>
          <button type="submit" className="btn-primary">Bakiyeyi Güncelle</button>
        </div>
      </form>
    </ModalWrapper>
  );
}
