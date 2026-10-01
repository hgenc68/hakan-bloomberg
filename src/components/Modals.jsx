import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { X, Shield, Plus, DollarSign, ShoppingCart, Edit3 } from 'lucide-react';

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

// 1. Yeni Varlık Ekle Modalı
export function AddHoldingModal({ onClose }) {
  const { addHolding, usdtry } = useApp();
  const [ticker, setTicker] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState('Hisse');
  const [shares, setShares] = useState('');
  const [avgCost, setAvgCost] = useState('');
  const [currency, setCurrency] = useState('TRY');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!ticker || !shares || !avgCost) return;
    await addHolding({
      ticker,
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
          <div className="form-group">
            <label>SEMBOL (TICKER) *</label>
            <input
              type="text"
              required
              placeholder="Örn: THYAO veya AAPL"
              value={ticker}
              onChange={e => setTicker(e.target.value.toUpperCase())}
              className="quant-input"
            />
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

        <div className="form-grid-2">
          <div className="form-group">
            <label>TÜR</label>
            <select value={type} onChange={e => setType(e.target.value)} className="quant-input">
              <option value="Hisse">Hisse Senedi</option>
              <option value="Kripto">Kripto Para</option>
              <option value="ETF">ETF / Fon</option>
              <option value="Altın">Emtia / Altın</option>
              <option value="Emtia">Emtia</option>
            </select>
          </div>
          <div className="form-group">
            <label>PARA BİRİMİ</label>
            <select value={currency} onChange={e => setCurrency(e.target.value)} className="quant-input">
              <option value="TRY">₺ TRY</option>
              <option value="USD">$ USD</option>
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

// 2. Kısmi Satış Modalı (Otomatik Kâr Defterine Yazar!)
export function SellHoldingModal({ holding, onClose }) {
  const { sellHolding, usdtry } = useApp();
  const [sharesSold, setSharesSold] = useState('');
  const [sellPrice, setSellPrice] = useState(holding?.livePrice ? String(holding.livePrice) : '');
  const [sellCurrency, setSellCurrency] = useState(holding?.currency || 'TRY');

  if (!holding) return null;

  const currentShares = holding.shares || 0;
  const isUSD = sellCurrency === 'USD';
  const sym = isUSD ? '$' : '₺';

  const sharesNum = parseFloat(sharesSold.replace(',', '.')) || 0;
  const priceNum = parseFloat(sellPrice.replace(',', '.')) || 0;

  // Real-time calculation preview
  const proceeds = sharesNum * priceNum;
  const costBasis = sharesNum * (holding.avg_cost || 0);
  const profit = proceeds - costBasis;
  const returnPct = costBasis > 0 ? (profit / costBasis) * 100 : 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (sharesNum <= 0 || priceNum <= 0) return;
    if (sharesNum > currentShares) {
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
            <span>Mevcut Adet:</span>
            <strong className="mono">{currentShares}</strong>
          </div>
          <div className="info-row">
            <span>Alış Maliyeti:</span>
            <strong className="mono">{holding.currency === 'USD' ? '$' : '₺'}{holding.avg_cost}</strong>
          </div>
        </div>

        <div className="form-grid-2">
          <div className="form-group">
            <div className="label-between">
              <label>SATILACAK ADET *</label>
              <button
                type="button"
                className="btn-text-link"
                onClick={() => setSharesSold(String(currentShares))}
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
          </div>

          <div className="form-group">
            <div className="label-between">
              <label>BİRİM SATIŞ FİYATI *</label>
              <select
                value={sellCurrency}
                onChange={e => setSellCurrency(e.target.value)}
                className="mini-select"
              >
                <option value="TRY">₺ TRY</option>
                <option value="USD">$ USD</option>
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
          </div>
        </div>

        {/* Real-time Calculation Summary Box */}
        {sharesNum > 0 && priceNum > 0 && (
          <div className="calc-preview-box">
            <div className="preview-row">
              <span>Kasaya Girecek Hasılat:</span>
              <strong className="mono text-cyan">{sym}{proceeds.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
            </div>
            <div className="preview-row">
              <span>Gerçekleşecek Net Kâr/Zarar:</span>
              <strong className={`mono ${profit >= 0 ? 'text-up' : 'text-down'}`}>
                {profit >= 0 ? '+' : ''}{sym}{profit.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({returnPct >= 0 ? '+' : ''}{returnPct.toFixed(2)}%)
              </strong>
            </div>
            <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', marginTop: '6px' }}>
              ✓ Satış tamamlandığında bu kâr otomatik olarak <strong>Kâr Defterine</strong> kalıcı kaydedilecektir.
            </div>
          </div>
        )}

        <div className="modal-actions">
          <button type="button" className="btn-secondary" onClick={onClose}>Vazgeç</button>
          <button type="submit" className="btn-primary" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
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
    await updateHolding(holding.id, {
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
            <select value={currency} onChange={e => setCurrency(e.target.value)} className="quant-input">
              <option value="TRY">₺ TRY</option>
              <option value="USD">$ USD</option>
            </select>
          </div>
          <div className="form-group">
            <label>TÜR</label>
            <select value={type} onChange={e => setType(e.target.value)} className="quant-input">
              <option value="Hisse">Hisse Senedi</option>
              <option value="Kripto">Kripto Para</option>
              <option value="ETF">ETF / Fon</option>
              <option value="Altın">Emtia / Altın</option>
              <option value="Emtia">Emtia</option>
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
