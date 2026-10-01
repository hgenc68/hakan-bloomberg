import React from 'react';
import { useApp } from '../context/AppContext';
import { Shield, Plus, DollarSign, Award, Trash2 } from 'lucide-react';

export default function ShieldTab({ onOpenAddGoldModal, onOpenPpfModal }) {
  const { goldPurchases, portfolioSummary, deleteGoldPurchase } = useApp();

  const totalGrams = portfolioSummary.totalGrams || 0;
  const goldValTRY = portfolioSummary.totalGoldValTRY || 0;
  const goldCostTRY = portfolioSummary.totalGoldCostTRY || 0;
  const goldProfitTRY = portfolioSummary.goldProfitTRY || 0;
  const goldReturnPct = portfolioSummary.goldReturnPct || 0;
  const ppfBalTRY = portfolioSummary.ppfBalanceTRY || 0;

  return (
    <div className="tab-pane-content">
      {/* Top Banner */}
      <div className="ledger-header-row">
        <div>
          <h2 className="section-title">
            <span>🛡️ KUR KALKANI & MAKRO RİSK KORUMA HAVUZU</span>
            <span className="badge-pill gold">Fiziki Altın + PPF</span>
          </h2>
          <p className="section-subtitle">
            Döviz şoklarına ve borsa düzeltmelerine karşı portföyünüzü koruyan Gram Altın ve Para Piyasası Fonu (TL Kuru Barut) varlıklarınız.
          </p>
        </div>

        <div className="action-btns">
          <button
            type="button"
            className="btn-primary-gold"
            onClick={onOpenAddGoldModal}
          >
            <Plus size={14} />
            <span>👑 Gram Altın Alımı Ekle</span>
          </button>
          <button
            type="button"
            className="btn-primary-emerald"
            onClick={onOpenPpfModal}
          >
            <Shield size={14} />
            <span>🏢 PPF Bakiyesi Güncelle</span>
          </button>
        </div>
      </div>

      {/* 4 Shield KPI Cards */}
      <div className="kpi-grid">
        {/* KPI 1: Toplam Gram Altın Değeri */}
        <div className="kpi-card gold">
          <div className="kpi-header">
            <span>Gram Altın Havuzu</span>
            <span className="badge-pill gold">👑 {totalGrams} gr</span>
          </div>
          <div className="kpi-val mono text-gold">
            ₺{goldValTRY.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="kpi-sub mono">
            <span>Maliyet: ₺{goldCostTRY.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</span>
            <span className={goldProfitTRY >= 0 ? 'text-up' : 'text-down'}>
              Net: {goldProfitTRY >= 0 ? '+' : ''}₺{goldProfitTRY.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ({goldReturnPct >= 0 ? '+' : ''}{goldReturnPct.toFixed(2)}%)
            </span>
          </div>
        </div>

        {/* KPI 2: PPF Kuru Barut */}
        <div className="kpi-card cyan">
          <div className="kpi-header">
            <span>PPF / TL Kuru Barut</span>
            <span className="badge-pill cyan">Likit Nakit</span>
          </div>
          <div className="kpi-val mono text-cyan">
            ₺{ppfBalTRY.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="kpi-sub mono">
            <span>Düşüşlerde Alım Gücü:</span>
            <strong style={{ color: '#fff' }}>Aktif</strong>
          </div>
        </div>

        {/* KPI 3: Toplam Kalkan Serveti */}
        <div className="kpi-card green">
          <div className="kpi-header">
            <span>Toplam Kur Kalkanı Serveti</span>
            <span className="badge-pill emerald">Altın + PPF</span>
          </div>
          <div className="kpi-val mono text-emerald">
            ₺{(goldValTRY + ppfBalTRY).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="kpi-sub mono">
            <span>Dolar Karşılığı:</span>
            <strong style={{ color: '#fff' }}>${((goldValTRY + ppfBalTRY) / portfolioSummary.usdtry).toLocaleString('en-US', { minimumFractionDigits: 2 })} USD</strong>
          </div>
        </div>

        {/* KPI 4: Kalkan Oranı */}
        <div className="kpi-card purple">
          <div className="kpi-header">
            <span>Portföy Kalkan Oranı</span>
            <span className="badge-pill purple">Hedef: %35</span>
          </div>
          <div className="kpi-val mono text-bright">
            %{(((goldValTRY + ppfBalTRY) / (portfolioSummary.totalValTRY || 1)) * 100).toFixed(1)}
          </div>
          <div className="kpi-sub mono">
            <span>Minimum Güvenlik: %30</span>
            <span className="text-emerald">Güvenli Bölge</span>
          </div>
        </div>
      </div>

      {/* Gold Purchases Table */}
      <div className="card table-card" style={{ marginTop: '20px' }}>
        <div className="card-header-between">
          <div>
            <span className="card-title">👑 GRAM ALTIN ALIM GEÇMİŞİ (FİZİKİ & BANKA)</span>
            <span className="card-subtitle" style={{ marginLeft: '8px' }}>Tarih Sıralı Birikim Defteri</span>
          </div>
          <button
            type="button"
            className="btn-action-sm"
            onClick={onOpenAddGoldModal}
          >
            + Yeni Alım Ekle
          </button>
        </div>

        <div className="table-responsive">
          <table className="terminal-table">
            <thead>
              <tr>
                <th>Tarih</th>
                <th className="text-right">Miktar (Gram)</th>
                <th className="text-right">Birim Alış Fiyatı</th>
                <th className="text-right">Toplam Alış Maliyeti</th>
                <th className="text-right">Güncel Değer (Canlı)</th>
                <th className="text-right">Kâr / Zarar</th>
                <th>Açıklama / Not</th>
                <th className="text-right">İşlem</th>
              </tr>
            </thead>
            <tbody>
              {goldPurchases.map(g => {
                const cost = (Number(g.grams) || 0) * (Number(g.buy_price_try) || 0);
                const liveVal = (Number(g.grams) || 0) * (portfolioSummary.totalGoldValTRY / (totalGrams || 1));
                const pl = liveVal - cost;
                const isUp = pl >= 0;

                return (
                  <tr key={g.id} className="table-row">
                    <td className="mono text-muted">{g.date || '--'}</td>
                    <td className="text-right mono text-gold" style={{ fontWeight: 700 }}>
                      {Number(g.grams).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} gr
                    </td>
                    <td className="text-right mono text-muted">
                      ₺{Number(g.buy_price_try).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="text-right mono text-bright">
                      ₺{cost.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="text-right mono text-cyan">
                      ₺{liveVal.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="text-right mono">
                      <span className={isUp ? 'text-up' : 'text-down'}>
                        {isUp ? '+' : ''}₺{pl.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                      </span>
                    </td>
                    <td className="note-cell">{g.note || '--'}</td>
                    <td className="text-right">
                      <button
                        type="button"
                        className="btn-action-row delete"
                        onClick={() => {
                          if (window.confirm('Bu altın alım kaydını silmek istediğinize emin misiniz?')) {
                            deleteGoldPurchase(g.id);
                          }
                        }}
                        title="Sil"
                      >
                        <Trash2 size={12} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
