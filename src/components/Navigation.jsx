import React from 'react';
import { useApp } from '../context/AppContext';
import { 
  Globe, 
  Rocket, 
  Trophy, 
  Target, 
  Briefcase,
  Compass,
  Sparkles,
  LineChart,
  Radio
} from 'lucide-react';

export default function Navigation() {
  const { activeTab, setActiveTab } = useApp();

  const researchTabs = [
    { id: 'pro_chart', label: 'Pro Grafik', icon: LineChart, badge: 'TV', badgeColor: 'cyan', highlight: false },
    { id: 'broadcast_studio', label: 'Yayın Stüdyosu', icon: Radio, badge: 'Prompter', badgeColor: 'rose', highlight: true },
    { id: 'market', label: 'Piyasa Nabzı', icon: Globe, badge: 'Canlı', badgeColor: 'cyan' },
    { id: 'model', label: 'Model Portföy', icon: Briefcase, badge: 'Aylık', badgeColor: 'purple' },
    { id: 'potential', label: 'Potansiyel', icon: Rocket, badge: '8 Fırsat', badgeColor: 'gold' },
    { id: 'top10', label: 'En Güçlü 10', icon: Trophy, badge: 'Quant', badgeColor: 'emerald' },
    { id: 'single_stock', label: 'Tekil Hisse', icon: Target, badge: 'DCF', badgeColor: 'cyan' }
  ];

  return (
    <nav className="terminal-nav" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 12px', background: '#080c16', borderBottom: '1px solid var(--border)', flexWrap: 'nowrap', gap: 6, overflowX: 'auto' }}>
      {/* Left indicator */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
        <Compass size={14} style={{ color: 'var(--cyan)' }} />
        <span style={{ fontSize: 10, fontWeight: 800, color: '#94a3b8', letterSpacing: '0.06em' }}>
          RADAR
        </span>
      </div>

      {/* Tabs list */}
      <div className="nav-container" style={{ display: 'flex', gap: 5, overflowX: 'auto', scrollbarWidth: 'none', alignItems: 'center', flexWrap: 'nowrap' }}>
        {researchTabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              className={`nav-tab-btn ${isActive ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
              style={{ 
                whiteSpace: 'nowrap',
                background: isActive 
                  ? (tab.highlight ? 'rgba(245, 158, 11, 0.18)' : 'rgba(0, 229, 255, 0.12)') 
                  : (tab.highlight ? 'rgba(245, 158, 11, 0.05)' : 'transparent'),
                borderColor: isActive 
                  ? (tab.highlight ? 'var(--gold)' : 'var(--cyan)') 
                  : (tab.highlight ? 'rgba(245, 158, 11, 0.25)' : 'transparent'),
                color: isActive 
                  ? (tab.highlight ? 'var(--gold)' : 'var(--cyan)') 
                  : (tab.highlight ? '#fef3c7' : 'var(--text-muted)')
              }}
            >
              <Icon size={14} className="nav-icon" style={{ color: tab.highlight && !isActive ? 'var(--gold)' : 'inherit' }} />
              <span className="nav-label" style={{ fontWeight: tab.highlight ? 800 : 700 }}>
                {tab.label}
              </span>
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
