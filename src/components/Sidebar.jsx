import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  BarChart3, 
  ListFilter, 
  ShieldCheck, 
  LineChart, 
  Snowflake, 
  ScrollText, 
  PlusCircle,
  ChevronLeft,
  ChevronRight,
  Briefcase,
  Wallet,
  TrendingUp,
  TrendingDown,
  Radio
} from 'lucide-react';

export default function Sidebar({ collapsed, onToggle }) {
  const { activeTab, setActiveTab, portfolioSummary, currentCurrency } = useApp();
  const isTRY = currentCurrency === 'try';
  const sym = isTRY ? '₺' : '$';

  const fmt = (v, d = 0) => (Number(v) || 0).toLocaleString('tr-TR', { maximumFractionDigits: d });

  const realizedTRY = portfolioSummary.realizedProfitTRY || 0;
  const realizedBadge = realizedTRY > 0 ? `+₺${Math.round(realizedTRY).toLocaleString('tr-TR')}` : null;
  const holdingsCount = portfolioSummary.enrichedHoldings?.length || 0;

  const portfolioTabs = [
    { id: 'overview', label: 'Portföy (Özet)', icon: BarChart3, category: 'Varlık' },
    { id: 'holdings', label: 'Pozisyonlar', icon: ListFilter, badge: `${holdingsCount}`, badgeColor: 'amber', category: 'Varlık' },
    { id: 'model', label: 'Model Portföy', icon: Briefcase, badge: 'Aylık', badgeColor: 'purple', category: 'Strateji' },
    { id: 'broadcast_studio', label: 'Yayın Stüdyosu', icon: Radio, badge: 'PROMPTER', badgeColor: 'rose', category: 'Medya' },
    { id: 'pro_chart', label: 'Teknik Pro Grafik', icon: LineChart, badge: 'TV', badgeColor: 'cyan', category: 'Analiz' },
    { id: 'shield', label: 'Kur Kalkanı', icon: ShieldCheck, badge: 'Zırh', badgeColor: 'gold', category: 'Koruma' },
    { id: 'benchmark', label: 'Benchmark', icon: LineChart, badge: 'GIPS', badgeColor: 'cyan', category: 'Analiz' },
    { id: 'health', label: 'Sağlık (Kar Tanesi)', icon: Snowflake, badge: '84', badgeColor: 'emerald', category: 'Analiz' },
    { id: 'ledger', label: 'Kâr Defteri', icon: ScrollText, badge: realizedBadge, badgeColor: 'emerald', category: 'Finansal' },
    { id: 'manage', label: 'Veri Yönetimi', icon: PlusCircle, badge: 'CRUD', badgeColor: 'amber', category: 'Sistem' }
  ];

  const totalVal = isTRY ? portfolioSummary.totalValTRY : portfolioSummary.totalValUSD;
  const dayPL = isTRY ? portfolioSummary.dayPLTRY : portfolioSummary.dayPLUSD;
  const buyingPower = isTRY ? portfolioSummary.buyingPowerTRY : portfolioSummary.buyingPowerUSD;
  const isDayUp = (dayPL || 0) >= 0;

  return (
    <aside 
      className={`portfolio-sidebar ${collapsed ? 'collapsed' : ''}`}
      style={{
        width: collapsed ? 64 : 224,
        minWidth: collapsed ? 64 : 224,
        background: '#070a13',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        transition: 'all 0.22s ease-in-out',
        userSelect: 'none',
        zIndex: 90
      }}
    >
      {/* Top: Section Header & Collapse Toggle */}
      <div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'space-between',
          padding: collapsed ? '12px 0' : '14px 16px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.06)'
        }}>
          {!collapsed && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <Briefcase size={15} style={{ color: 'var(--cyan)' }} />
              <span style={{ fontSize: 11.5, fontWeight: 800, color: '#f8fafc', letterSpacing: '0.05em' }}>
                PORTFÖY YÖNETİMİ
              </span>
            </div>
          )}

          <button
            type="button"
            onClick={onToggle}
            className="chip-btn"
            style={{ 
              padding: collapsed ? '6px' : '4px 7px', 
              fontSize: 10,
              borderRadius: 4,
              borderColor: 'rgba(255,255,255,0.08)'
            }}
            title={collapsed ? 'Sol Menüyü Genişlet' : 'Sol Menüyü Daralt (Tam Ekran Tablo)'}
          >
            {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        </div>

        {/* Tab Items List */}
        <div style={{ padding: '8px 8px', display: 'flex', flexDirection: 'column', gap: 3 }}>
          {portfolioTabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                type="button"
                className={`sidebar-tab-btn ${isActive ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
                title={collapsed ? `${tab.label} ${tab.badge ? `(${tab.badge})` : ''}` : undefined}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: collapsed ? 'center' : 'space-between',
                  padding: collapsed ? '10px 0' : '9px 12px',
                  borderRadius: 6,
                  background: isActive ? 'rgba(0, 229, 255, 0.12)' : 'transparent',
                  border: isActive ? '1px solid rgba(0, 229, 255, 0.35)' : '1px solid transparent',
                  color: isActive ? 'var(--cyan)' : 'var(--text-muted)',
                  cursor: 'pointer',
                  transition: 'all 0.16s ease',
                  textAlign: 'left',
                  width: '100%'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Icon size={16} style={{ color: isActive ? 'var(--cyan)' : 'inherit', flexShrink: 0 }} />
                  {!collapsed && (
                    <span style={{ fontSize: 12, fontWeight: isActive ? 700 : 600, color: isActive ? '#fff' : 'inherit' }}>
                      {tab.label}
                    </span>
                  )}
                </div>

                {!collapsed && tab.badge && (
                  <span className={`nav-badge ${tab.badgeColor || 'cyan'}`} style={{ fontSize: 9.5, padding: '1px 6px' }}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Bottom: Quick Portfolio Status Pill Card (Expanded only) */}
      {!collapsed ? (
        <div style={{ 
          margin: 10, 
          padding: '10px 12px', 
          background: 'rgba(255, 255, 255, 0.02)', 
          border: '1px solid rgba(255, 255, 255, 0.06)', 
          borderRadius: 6 
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Portföy Değeri</span>
            <strong className="mono text-cyan" style={{ fontSize: 12.5, fontWeight: 800 }}>
              {sym}{fmt(totalVal)}
            </strong>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>24s Kâr/Zarar</span>
            <strong className="mono" style={{ fontSize: 11, fontWeight: 700, color: isDayUp ? 'var(--emerald)' : 'var(--red)' }}>
              {isDayUp ? '+' : ''}{sym}{fmt(dayPL)}
            </strong>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderTop: '1px dashed rgba(255,255,255,0.08)', paddingTop: 4 }}>
            <span style={{ fontSize: 9.5, color: 'var(--text-muted)' }}>Kullanılabilir Nakit</span>
            <strong className="mono" style={{ fontSize: 10.5, color: '#e2e8f0' }}>
              {sym}{fmt(buyingPower)}
            </strong>
          </div>
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '12px 0', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <Wallet size={16} className="text-cyan" style={{ margin: '0 auto', display: 'block' }} title={`Portföy: ${sym}${fmt(totalVal)}`} />
        </div>
      )}
    </aside>
  );
}
