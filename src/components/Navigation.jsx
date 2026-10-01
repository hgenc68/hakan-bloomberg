import React from 'react';
import { useApp } from '../context/AppContext';
import { 
  Globe, 
  BarChart3, 
  ListFilter, 
  LineChart, 
  ShieldCheck, 
  Target, 
  Trophy, 
  Briefcase, 
  ScrollText, 
  PlusCircle 
} from 'lucide-react';

export default function Navigation() {
  const { activeTab, setActiveTab, portfolioSummary } = useApp();

  const realizedTRY = portfolioSummary.realizedProfitTRY || 0;
  const realizedBadge = realizedTRY > 0 ? `+₺${Math.round(realizedTRY).toLocaleString('tr-TR')}` : null;

  const tabs = [
    { id: 'market', label: 'Piyasa Özeti', icon: Globe, badge: 'CANLI', badgeColor: 'cyan' },
    { id: 'overview', label: 'Genel Durum', icon: BarChart3 },
    { id: 'holdings', label: 'Pozisyonlar', icon: ListFilter, badge: `${portfolioSummary.enrichedHoldings?.length || 0}`, badgeColor: 'amber' },
    { id: 'benchmark', label: 'Benchmark', icon: LineChart, badge: 'GIPS', badgeColor: 'cyan' },
    { id: 'shield', label: 'Kur Kalkanı', icon: ShieldCheck, badge: 'Zırh', badgeColor: 'gold' },
    { id: 'single_stock', label: 'Tekil Hisse Radarı', icon: Target, badge: 'DCF', badgeColor: 'emerald' },
    { id: 'top10', label: 'En Güçlü 10 Hisse', icon: Trophy, badge: 'Quant', badgeColor: 'emerald' },
    { id: 'model', label: 'Model Portföy', icon: Briefcase, badge: 'Hibrit', badgeColor: 'cyan' },
    { id: 'ledger', label: 'Kâr Defteri', icon: ScrollText, badge: realizedBadge, badgeColor: 'emerald' },
    { id: 'manage', label: 'Yönetim', icon: PlusCircle, badge: 'CRUD', badgeColor: 'amber' }
  ];

  return (
    <nav className="terminal-nav">
      <div className="nav-container" style={{ overflowX: 'auto', scrollbarWidth: 'none' }}>
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              className={`nav-tab-btn ${isActive ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
              style={{ whiteSpace: 'nowrap' }}
            >
              <Icon size={15} className="nav-icon" />
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
