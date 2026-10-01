import React from 'react';
import { useApp } from '../context/AppContext';
import { Shield, Plus, DollarSign, Award, Trash2, AlertTriangle, ShieldCheck, TrendingUp, Zap } from 'lucide-react';

export default function ShieldTab({ onOpenAddGoldModal, onOpenPpfModal }) {
  const { goldPurchases, portfolioSummary, deleteGoldPurchase, usdtry } = useApp();

  const totalGrams = portfolioSummary.totalGrams || 0;
  const goldValTRY = portfolioSummary.totalGoldValTRY || 0;
  const goldCostTRY = portfolioSummary.totalGoldCostTRY || 0;
  const goldProfitTRY = portfolioSummary.goldProfitTRY || 0;
  const goldReturnPct = portfolioSummary.goldReturnPct || 0;
  const ppfBalTRY = portfolioSummary.ppfBalanceTRY || 0;
  const totalValTRY = portfolioSummary.totalValTRY || 1;
  const totalValUSD = portfolioSummary.totalValUSD || 1;

  const holdings = portfolioSummary.enrichedHoldings || [];

  // Categorize holdings into 6 macro asset classes
  let catTotalsTRY = {
    us_equities_etf: 0,
    bist_export: 0,
    gold_metals: goldValTRY,
    cash_ppf: ppfBalTRY,
    bist_domestic: 0,
    crypto: 0
  };

  const knownExporters = new Set(['THYAO', 'FROTO', 'SISE', 'CCOLA', 'PGSUS', 'TOASO', 'TUPRS', 'EREGL', 'ASELS']);

  holdings.forEach(h => {
    const sym = (h.ticker || '').toUpperCase();
    const clean = sym.replace('.IS', '').replace('-USD', '');
    const val = h.valTRY || 0;

    if (h.type === 'Kripto' || ['BTC', 'ETH', 'SUI', 'OP', 'ARKM', 'DOGE', 'BIO', 'LDO'].includes(clean)) {
      catTotalsTRY.crypto += val;
    } else if (h.type === 'Altın' || clean.includes('XAUT') || clean.includes('GOLD')) {
      catTotalsTRY.gold_metals += val;
    } else if (h.isHoldingUSD || ['SPCX', 'DRAM', 'NVDA', 'TSM', 'ABBV', 'AAPL', 'MSFT'].includes(clean)) {
      catTotalsTRY.us_equities_etf += val;
    } else if (knownExporters.has(clean)) {
      catTotalsTRY.bist_export += val;
    } else {
      catTotalsTRY.bist_domestic += val;
    }
  });

  const catConfig = [
    { key: 'us_equities_etf', label: 'ABD Hisse & Global ETF', color: '#00e5ff', target: 35.0, coef: 1.0 },
    { key: 'bist_export', label: 'BIST 100 İhracatçı', color: '#10b981', target: 20.0, coef: 0.85 },
    { key: 'gold_metals', label: 'Gram Altın & Emtia', color: '#eab308', target: 20.0, coef: 1.0 },
    { key: 'cash_ppf', label: 'Para Piyasası Fonu (PPF)', color: '#3b82f6', target: 15.0, coef: 0.0 },
    { key: 'bist_domestic', label: 'BIST İç Pazar', color: '#f59e0b', target: 5.0, coef: 0.15 },
    { key: 'crypto', label: 'Kripto Varlıklar', color: '#8b5cf6', target: 5.0, coef: 1.0 }
  ];

  // Natural FX Hedge Ratio
  let hedgedValTRY = 0;
  catConfig.forEach(c => {
    hedgedValTRY += (catTotalsTRY[c.key] || 0) * c.coef;
  });

  const fxHedgeRatioPct = Math.round((hedgedValTRY / totalValTRY) * 1000) / 10;

  // 4 Devaluation Shock Scenarios
  const scenarios = [
    { name: '+%15 Kontrollü Artış', shock: 0.15, desc: 'Yıllık enflasyon paralelinde kademeli kur düzeltmesi' },
    { name: '+%30 Sıçrama Şoku', shock: 0.30, desc: 'Sıkışan kurun piyasa faizine ani sıçrama tepkisi' },
    { name: '+%50 Devalüasyon Şoku', shock: 0.50, desc: 'Ani döviz kuru serbest bırakma ve likidite krizi' },
    { name: '+%100 Hiper-Devalüasyon', shock: 1.00, desc: 'Ekstrem makro kur şoku ve devalüasyon sarmalı' }
  ];

  const stressResults = scenarios.map(sc => {
    const newRate = usdtry * (1 + sc.shock);
    let simValTRY = 0;
    catConfig.forEach(c => {
      const v = catTotalsTRY[c.key] || 0;
      simValTRY += v * (1 + sc.shock * c.coef);
    });

    const gainTRY = simValTRY - totalValTRY;
    const gainPct = (gainTRY / totalValTRY) * 100;
    const simValUSD = simValTRY / newRate;
    const usdPurchasingChangePct = ((simValUSD - totalValUSD) / totalValUSD) * 100;

    const unhedgedUSD = totalValTRY / newRate;
    const unhedgedLossPct = ((unhedgedUSD - totalValUSD) / totalValUSD) * 100;
    const alphaVsUnhedged = usdPurchasingChangePct - unhedgedLossPct;

    return {
      ...sc,
      newRate,
      simValTRY,
      gainTRY,
      gainPct,
      simValUSD,
      usdPurchasingChangePct,
      alphaVsUnhedged
    };
  });

  return (
    <div className="tab-pane-content" style={{ animation: 'fadeIn 0.25s ease' }}>
      {/* Top Banner */}
      <div className="ledger-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <h2 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span>🛡️</span>
            <span>KUR KALKANI & MAKRO VARLIK DAĞILIMI</span>
            <span className="nav-badge gold" style={{ fontSize: 11, padding: '3px 8px' }}>
              6 Sınıflı Barbell Modeli
            </span>
          </h2>
          <p className="section-subtitle">
            Döviz şoklarına, faiz dalgalanmalarına ve devalüasyon krizlerine karşı portföyünüzü koruyan Doğal Kur Kalkanı ve Stres Testi Analitiği.
          </p>
        </div>

        <div className="action-btns" style={{ display: 'flex', gap: 10 }}>
          <button
            type="button"
            className="btn-primary-gold"
            onClick={onOpenAddGoldModal}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#eab308', color: '#000', fontWeight: 700, padding: '7px 14px', borderRadius: 4 }}
          >
            <Plus size={14} />
            <span>👑 Gram Altın Alımı Ekle</span>
          </button>
          <button
            type="button"
            className="btn-primary-emerald"
            onClick={onOpenPpfModal}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#10b981', color: '#000', fontWeight: 700, padding: '7px 14px', borderRadius: 4 }}
          >
            <Shield size={14} />
            <span>🏢 PPF Bakiyesi Güncelle</span>
          </button>
        </div>
      </div>

      {/* 4 Shield KPI Cards */}
      <div className="kpi-grid" style={{ marginBottom: 20 }}>
        {/* KPI 1: Toplam Doğal Kur Kalkanı */}
        <div className="kpi-card green" style={{ padding: 16 }}>
          <div className="kpi-header" style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' }}>Doğal Kur Kalkanı Oranı</span>
            <span className="nav-badge emerald" style={{ fontSize: 10 }}>Hedef: %70+</span>
          </div>
          <div className="kpi-val mono text-emerald" style={{ fontSize: 26, fontWeight: 800, margin: '6px 0' }}>
            %{fxHedgeRatioPct}
          </div>
          <div className="kpi-sub mono" style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            <span>Korunan Servet: </span>
            <strong style={{ color: '#fff' }}>₺{hedgedValTRY.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}</strong>
          </div>
        </div>

        {/* KPI 2: Gram Altın Havuzu */}
        <div className="kpi-card gold" style={{ padding: 16 }}>
          <div className="kpi-header" style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' }}>Fiziki / Banka Altın</span>
            <span className="nav-badge gold" style={{ fontSize: 10 }}>👑 {totalGrams.toFixed(2)} gr</span>
          </div>
          <div className="kpi-val mono text-gold" style={{ fontSize: 26, fontWeight: 800, margin: '6px 0' }}>
            ₺{goldValTRY.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="kpi-sub mono" style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            <span>Kâr: </span>
            <span className={goldProfitTRY >= 0 ? 'text-up' : 'text-down'} style={{ fontWeight: 700 }}>
              {goldProfitTRY >= 0 ? '+' : ''}₺{goldProfitTRY.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} ({goldReturnPct.toFixed(1)}%)
            </span>
          </div>
        </div>

        {/* KPI 3: PPF Kuru Barut */}
        <div className="kpi-card cyan" style={{ padding: 16 }}>
          <div className="kpi-header" style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' }}>PPF / TL Kuru Barut</span>
            <span className="nav-badge cyan" style={{ fontSize: 10 }}>Likit Tampon</span>
          </div>
          <div className="kpi-val mono text-cyan" style={{ fontSize: 26, fontWeight: 800, margin: '6px 0' }}>
            ₺{ppfBalTRY.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="kpi-sub mono" style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            <span>Düşüşlerde Alım Gücü: </span>
            <strong style={{ color: 'var(--emerald)' }}>Aktif Hazır</strong>
          </div>
        </div>

        {/* KPI 4: Toplam Kalkan Serveti */}
        <div className="kpi-card purple" style={{ padding: 16 }}>
          <div className="kpi-header" style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' }}>Kalkan Serveti (Altın + PPF)</span>
            <span className="nav-badge purple" style={{ fontSize: 10 }}>Defansif</span>
          </div>
          <div className="kpi-val mono text-bright" style={{ fontSize: 26, fontWeight: 800, margin: '6px 0' }}>
            ₺{(goldValTRY + ppfBalTRY).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="kpi-sub mono" style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            <span>Dolar Karşılığı: </span>
            <strong style={{ color: '#fff' }}>${((goldValTRY + ppfBalTRY) / usdtry).toLocaleString('en-US', { maximumFractionDigits: 0 })}</strong>
          </div>
        </div>
      </div>

      {/* 6-Asset Class Allocation & Target Comparison Table */}
      <div className="card" style={{ padding: 18, background: 'var(--bg-card)', border: '1px solid var(--border)', marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ fontWeight: 800, fontSize: 13, color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>📊</span>
            <span>6 VARLIK SINIFI KURUMSAL DAĞILIM VE HEDEF İLERLEMESİ</span>
          </div>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            Barbell Portföy Mimarisi
          </span>
        </div>

        <div className="table-responsive">
          <table className="terminal-table" style={{ fontSize: 11.5 }}>
            <thead>
              <tr>
                <th>Varlık Sınıfı</th>
                <th className="text-right">Mevcut Değer (TRY)</th>
                <th className="text-right">Mevcut Değer (USD)</th>
                <th className="text-right">Mevcut Pay (%)</th>
                <th className="text-right">Hedef Pay (%)</th>
                <th className="text-right">Sapma (Delta)</th>
                <th style={{ width: 190 }}>Hedef İlerlemesi (Durum Çubuğu)</th>
              </tr>
            </thead>
            <tbody>
              {catConfig.map(cat => {
                const val = catTotalsTRY[cat.key] || 0;
                const weight = (val / totalValTRY) * 100;
                const delta = weight - cat.target;
                const targetPct = cat.target || 1;
                const progressRatio = Math.round((weight / targetPct) * 100);
                const barFillWidth = Math.min(100, progressRatio);

                let progressColor = '#00e5ff'; // cyan
                let statusLabel = `%${progressRatio} Tamamlandı`;
                if (progressRatio >= 90 && progressRatio <= 115) {
                  progressColor = '#10b981'; // emerald
                  statusLabel = `%${progressRatio} (Tam Dengede)`;
                } else if (progressRatio > 115) {
                  progressColor = '#eab308'; // amber / gold
                  statusLabel = `%${progressRatio} (Aşırı Ağırlık +)`;
                } else if (progressRatio < 60) {
                  progressColor = '#f97316'; // orange
                  statusLabel = `%${progressRatio} (Eksik Kalan -)`;
                }

                return (
                  <tr key={cat.key} className="table-row">
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: cat.color }} />
                        <strong style={{ color: '#fff' }}>{cat.label}</strong>
                      </div>
                    </td>
                    <td className="text-right mono font-medium">
                      ₺{val.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="text-right mono text-muted">
                      ${(val / usdtry).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="text-right mono font-medium" style={{ color: cat.color }}>
                      %{weight.toFixed(2)}
                    </td>
                    <td className="text-right mono text-muted">
                      %{cat.target.toFixed(1)}
                    </td>
                    <td className="text-right mono" style={{ color: delta >= 0 ? 'var(--emerald)' : 'var(--amber)' }}>
                      {delta >= 0 ? '+' : ''}{delta.toFixed(2)}%
                    </td>
                    {/* Visual Horizontal Progress Bar */}
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10 }}>
                          <span style={{ color: progressColor, fontWeight: 800 }}>
                            {statusLabel}
                          </span>
                          <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                            %{weight.toFixed(1)} / %{cat.target.toFixed(0)}
                          </span>
                        </div>
                        {/* Track & Bar */}
                        <div style={{ width: '100%', height: 7, background: 'rgba(255, 255, 255, 0.08)', borderRadius: 4, overflow: 'hidden' }}>
                          <div
                            style={{
                              width: `${barFillWidth}%`,
                              height: '100%',
                              background: progressColor,
                              borderRadius: 4,
                              transition: 'width 0.6s ease'
                            }}
                          />
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4 Devaluation Shock Scenarios Matrix Card */}
      <div className="card" style={{ padding: 18, background: 'var(--bg-card)', border: '1px solid var(--border)', marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ fontWeight: 800, fontSize: 13, color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Zap size={16} className="text-amber" />
            <span>MAKRO DEVALÜASYON STRES TESTİ MATRİSİ (4 ŞOK SENARYOSU)</span>
          </div>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            Doğal Kur Kalkanı Simülatörü
          </span>
        </div>

        <div className="table-responsive">
          <table className="terminal-table" style={{ fontSize: 11.5 }}>
            <thead>
              <tr>
                <th>Senaryo Adı</th>
                <th>Açıklama</th>
                <th className="text-right">Simüle USD/TRY</th>
                <th className="text-right">Simüle Portföy (TRY)</th>
                <th className="text-right">Nominal Kazanç (TRY)</th>
                <th className="text-right">USD Satın Alma Gücü</th>
                <th className="text-right">TL Mevduata Göre Koruma Primi (Alfa)</th>
              </tr>
            </thead>
            <tbody>
              {stressResults.map((st, i) => (
                <tr key={i} className="table-row">
                  <td style={{ fontWeight: 800, color: '#fff' }}>{st.name}</td>
                  <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>{st.desc}</td>
                  <td className="text-right mono text-amber" style={{ fontWeight: 700 }}>
                    ₺{st.newRate.toFixed(2)}
                  </td>
                  <td className="text-right mono font-medium">
                    ₺{st.simValTRY.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}
                  </td>
                  <td className="text-right mono text-emerald" style={{ fontWeight: 700 }}>
                    +₺{st.gainTRY.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} (+{st.gainPct.toFixed(1)}%)
                  </td>
                  <td className="text-right mono font-medium" style={{ color: st.usdPurchasingChangePct >= 0 ? 'var(--emerald)' : 'var(--amber)' }}>
                    {st.usdPurchasingChangePct >= 0 ? '+' : ''}{st.usdPurchasingChangePct.toFixed(1)}%
                  </td>
                  <td className="text-right mono text-emerald" style={{ fontWeight: 800 }}>
                    +{st.alphaVsUnhedged.toFixed(1)}% Kalkan Primi
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Gold Purchases Table */}
      <div className="card table-card" style={{ padding: 18, background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div>
            <span style={{ fontWeight: 800, fontSize: 13, color: '#e2e8f0' }}>👑 GRAM ALTIN ALIM GEÇMİŞİ (FİZİKİ & BANKA)</span>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 8 }}>Tarih Sıralı Birikim Defteri</span>
          </div>
          <button
            type="button"
            className="btn-action-sm"
            onClick={onOpenAddGoldModal}
            style={{ padding: '4px 10px', fontSize: 11, background: 'rgba(234, 179, 8, 0.15)', color: '#eab308', border: '1px solid #eab308', borderRadius: 4 }}
          >
            + Yeni Alım Ekle
          </button>
        </div>

        <div className="table-responsive">
          <table className="terminal-table" style={{ fontSize: 11.5 }}>
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
                const liveVal = (Number(g.grams) || 0) * (portfolioSummary.gramGoldPrice || 6600);
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
                      <span className={isUp ? 'text-up' : 'text-down'} style={{ fontWeight: 700 }}>
                        {isUp ? '+' : ''}₺{pl.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                      </span>
                    </td>
                    <td className="note-cell" style={{ color: 'var(--text-muted)' }}>{g.note || '--'}</td>
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
