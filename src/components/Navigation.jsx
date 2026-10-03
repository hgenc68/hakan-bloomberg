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
    { id: 'pro_chart', label: 'PRO GRAFİK & TEKNİK', icon: LineChart, badge: 'CANLI TV', badgeColor: 'cyan', highlight: false },
    { id: 'broadcast_studio', label: 'YAYIN & BRİFİNG STÜDYOSU', icon: Radio, badge: 'PROMPTER', badgeColor: 'rose', highlight: true },
    { id: 'market', label: 'Piyasa Özeti (Canlı Nabız)', icon: Globe, badge: 'CANLI', badgeColor: 'cyan' },
    { id: 'potential', label: 'POTANSİYEL HİSSELER', icon: Rocket, badge: '8 FIRSAT', badgeColor: 'gold' },
    { id: 'top10', label: 'En Güçlü 10', icon: Trophy, badge: 'Quant', badgeColor: 'emerald' },
    { id: 'single_stock', label: 'Tekil Hisse & DCF', icon: Target, badge: 'Değerleme', badgeColor: 'cyan' },
    { id: 'model', label: 'Model Portföy', icon: Briefcase, badge: 'Hibrit', badgeColor: 'purple' }
  ];

  return (
    <nav className="terminal-nav" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 20px', background: '#080c16', borderBottom: '1px solid var(--border)', flexWrap: 'wrap', gap: 10 }}>
      {/* Left indicator */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Compass size={15} style={{ color: 'var(--cyan)' }} />
        <span style={{ fontSize: 11, fontWeight: 800, color: '#94a3b8', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          PİYASA & ARAŞTIRMA RADARI
        </span>
      </div>

      {/* Tabs list */}
      <div className="nav-container" style={{ display: 'flex', gap: 8, overflowX: 'auto', scrollbarWidth: 'none' }}>
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
