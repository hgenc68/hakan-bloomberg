import React from 'react';
import { useApp } from '../context/AppContext';
import { Plus, ShoppingCart, Shield, Edit3, Trash2, ScrollText } from 'lucide-react';

export default function ManageTab({ onOpenAddModal, onOpenSellModal, onOpenEditModal, onOpenAddGoldModal, onOpenPpfModal }) {
  const { holdings, deleteHolding, setActiveTab } = useApp();

  return (
    <div className="tab-pane-content">
      {/* Header */}
      <div className="ledger-header-row">
        <div>
          <h2 className="section-title">
            <span>➕ PORTFÖY & POZİSYON YÖNETİM MERKEZİ</span>
            <span className="badge-pill amber">CRUD & Kâr Realizasyonu</span>
          </h2>
          <p className="section-subtitle">
            Hisse/kripto/fon ekleyin, kısmi satış yaparak kârınızı deftere kilitleyin veya varlıklarınızı düzenleyin.
          </p>
        </div>
      </div>

      {/* Quick Action Tiles */}
      <div className="kpi-grid">
        <button
          type="button"
          className="manage-tile"
          onClick={onOpenAddModal}
        >
          <div className="tile-icon cyan"><Plus size={24} /></div>
          <div className="tile-title">Yeni Varlık Ekle</div>
          <div className="tile-desc">BIST, ABD Hisse, Kripto veya ETF portföyünüze ekleyin</div>
        </button>

        <button
          type="button"
          className="manage-tile"
          onClick={() => {
            if (holdings.length > 0) onOpenSellModal(holdings[0]);
            else alert('Portföyde satılacak varlık bulunmuyor.');
          }}
        >
          <div className="tile-icon emerald"><ShoppingCart size={24} /></div>
          <div className="tile-title">Kısmi Satış & Kâr Realizasyonu</div>
          <div className="tile-desc">Pozisyondan kâr alıp otomatik Kâr Defterine kaydedin</div>
        </button>

        <button
          type="button"
          className="manage-tile"
          onClick={onOpenAddGoldModal}
        >
          <div className="tile-icon gold"><Shield size={24} /></div>
          <div className="tile-title">Gram Altın Ekle</div>
          <div className="tile-desc">Fiziki veya banka gram altın alımını Kur Kalkanına işleyin</div>
        </button>

        <button
          type="button"
          className="manage-tile"
          onClick={onOpenPpfModal}
        >
          <div className="tile-icon purple"><Shield size={24} /></div>
          <div className="tile-title">PPF Kuru Barut Güncelle</div>
          <div className="tile-desc">Likit Para Piyasası Fonu / TL nakit tamponunuzu güncelleyin</div>
        </button>
      </div>

      {/* Active Positions Management List */}
      <div className="card table-card" style={{ marginTop: '20px' }}>
        <div className="card-header-between">
          <span className="card-title">MEVCUT POZİSYON LİSTESİ & HIZLI DÜZENLEME</span>
          <button
            type="button"
            className="btn-action-sm"
            onClick={() => setActiveTab('ledger')}
          >
            <ScrollText size={12} />
            <span>Kâr Defterini Görüntüle</span>
          </button>
        </div>

        <div className="table-responsive">
          <table className="terminal-table">
            <thead>
              <tr>
                <th>Sembol</th>
                <th>Varlık Adı</th>
                <th>Tür</th>
                <th className="text-right">Adet</th>
                <th className="text-right">Alış Maliyeti</th>
                <th className="text-right">Para Birimi</th>
                <th className="text-right">İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {holdings.map(h => (
                <tr key={h.id} className="table-row">
                  <td><strong className="ticker-symbol mono">{h.ticker}</strong></td>
                  <td className="text-muted">{h.name || h.ticker}</td>
                  <td><span className={`badge-type ${h.type?.toLowerCase() || 'hisse'}`}>{h.type || 'Hisse'}</span></td>
                  <td className="text-right mono text-bright">{Number(h.shares).toLocaleString('tr-TR', { maximumFractionDigits: 6 })}</td>
                  <td className="text-right mono">{h.currency === 'USD' ? '$' : '₺'}{Number(h.avg_cost).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</td>
                  <td className="text-right mono">{h.currency || 'TRY'}</td>
                  <td className="text-right">
                    <div className="row-actions">
                      <button
                        type="button"
                        className="btn-action-row sell"
                        onClick={() => onOpenSellModal(h)}
                        title="Kısmi Satış Yap"
                      >
                        <ShoppingCart size={12} />
                        <span>Kâr Al / Sat</span>
                      </button>
                      <button
                        type="button"
                        className="btn-action-row edit"
                        onClick={() => onOpenEditModal(h)}
                        title="Düzenle"
                      >
                        <Edit3 size={12} />
                        <span>Düzenle</span>
                      </button>
                      <button
                        type="button"
                        className="btn-action-row delete"
                        onClick={() => {
                          if (window.confirm(`${h.ticker} pozisyonunu silmek istediğinize emin misiniz?`)) {
                            deleteHolding(h.id);
                          }
                        }}
                        title="Sil"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
