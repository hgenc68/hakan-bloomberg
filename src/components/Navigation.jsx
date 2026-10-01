import React from 'react';
import { useApp } from '../context/AppContext';
import { BarChart3, ListFilter, ScrollText, ShieldAlert, PlusCircle } from 'lucide-react';

export default function Navigation() {
  const { activeTab, setActiveTab, portfolioSummary } = useApp();

  const realizedTRY = portfolioSummary.realizedProfitTRY || 0;
  const realizedBadge = realizedTRY > 0 ? `+₺${Math.round(realizedTRY).toLocaleString('tr-TR')}` : null;

  const tabs = [
    { id: 'overview', label: 'Genel Durum & Qualtrim', icon: BarChart3 },
    { id: 'holdings', label: 'Pozisyonlar & Canlı Fiyatlar', icon: ListFilter },
    { id: 'ledger', label: 'İşlem Geçmişi & Kâr Defteri', icon: ScrollText, badge: realizedBadge, badgeColor: 'emerald' },
    { id: 'shield', label: 'Kur Kalkanı & Risk Radarı', icon: ShieldAlert, badge: 'PPF & Altın', badgeColor: 'gold' },
    { id: 'manage', label: 'Pozisyon Yönetimi', icon: PlusCircle, badge: 'CRUD', badgeColor: 'amber' }
  ];

  return (
    <nav className="terminal-nav">
      <div className="nav-container">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              className={`nav-tab-btn ${isActive ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <Icon size={16} className="nav-icon" />
              <span className="nav-label">{tab.label}</span>
              {tab.badge && (
                <span className={`nav-badge ${tab.badgeColor || 'cyan'}`}>
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
