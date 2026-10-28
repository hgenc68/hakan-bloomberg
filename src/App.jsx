import React, { useState, Suspense, lazy } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import Header from './components/Header';
import Navigation from './components/Navigation';
import Sidebar from './components/Sidebar';
import ErrorBoundary from './components/ErrorBoundary';

import { Chart as ChartJS, registerables } from 'chart.js';
ChartJS.register(...registerables);

// Static imports for core interconnected tabs (SingleStock, Top10, ModelPortfolio, RiskRadar, ProChart)
import SingleStockTab from './pages/SingleStockTab';
import Top10QuantTab from './pages/Top10QuantTab';
import ModelPortfolioTab from './pages/ModelPortfolioTab';
import RiskRadarTab from './pages/RiskRadarTab';
import ProChartTab from './pages/ProChartTab';

// Safe lazy loader that auto-reloads on deployment chunk hash mismatches
function safeLazy(importFn) {
  return lazy(() =>
    importFn().catch((err) => {
      console.warn('Dynamic chunk load failed, retrying page reload...', err);
      if (typeof window !== 'undefined') {
        const lastReload = Number(sessionStorage.getItem('last_chunk_reload') || 0);
        if (Date.now() - lastReload > 10000) {
          sessionStorage.setItem('last_chunk_reload', String(Date.now()));
          window.location.reload();
        }
      }
      throw err;
    })
  );
}

// Code-split other tabs via safeLazy
const MarketPulseTab = safeLazy(() => import('./pages/MarketPulseTab'));
const OverviewTab = safeLazy(() => import('./pages/OverviewTab'));
const HoldingsTab = safeLazy(() => import('./pages/HoldingsTab'));
const BenchmarkTab = safeLazy(() => import('./pages/BenchmarkTab'));
const ShieldTab = safeLazy(() => import('./pages/ShieldTab'));
const TradeLedgerTab = safeLazy(() => import('./pages/TradeLedgerTab'));
const ManageTab = safeLazy(() => import('./pages/ManageTab'));
const PotentialStocksTab = safeLazy(() => import('./pages/PotentialStocksTab'));
const BroadcastStudioTab = safeLazy(() => import('./pages/BroadcastStudioTab'));
const FundXRayTab = safeLazy(() => import('./pages/FundXRayTab'));

import {
  AddHoldingModal,
  SellHoldingModal,
  EditHoldingModal,
  TransferToShieldModal,
  AddGoldModal,
  UpdatePpfModal,
  UpdateCashModal
} from './components/Modals';

function MainTerminal() {
  const { activeTab, setActiveTab, setLastNavigatedFrom, loading, toast } = useApp();

  // Standalone OBS Pop-out Mode (Clean 16:9 Presentation for OBS Window Capture)
  const isObsPopout = typeof window !== 'undefined' && window.location.search.includes('obs_popout=1');

  if (isObsPopout) {
    return (
      <div style={{ width: '100vw', height: '100vh', margin: 0, padding: 0, background: '#040711', overflow: 'hidden' }}>
        <Suspense fallback={<div style={{ color: '#fff', padding: 20 }}>Yayın Stüdyosu Yükleniyor...</div>}>
          <BroadcastStudioTab isObsPopout={true} />
        </Suspense>
      </div>
    );
  }

  // Sidebar collapse state
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem('bloomberg_sidebar_collapsed') === 'true';
    } catch (e) {
      return false;
    }
  });

  const handleToggleSidebar = () => {
    setSidebarCollapsed(prev => {
      const next = !prev;
      try {
        localStorage.setItem('bloomberg_sidebar_collapsed', String(next));
      } catch (e) {}
      return next;
    });
  };

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedSellHolding, setSelectedSellHolding] = useState(null);
  const [selectedEditHolding, setSelectedEditHolding] = useState(null);
  const [transferModalAmount, setTransferModalAmount] = useState(null);
  const [showAddGoldModal, setShowAddGoldModal] = useState(false);
  const [showPpfModal, setShowPpfModal] = useState(false);
  const [showCashModal, setShowCashModal] = useState(false);

  // Selected stock for SingleStockTab
  const [selectedStockTicker, setSelectedStockTicker] = useState('NVDA');

  if (loading) {
    return (
      <div className="terminal-loading">
        <div className="loading-spinner"></div>
        <div className="loading-text mono">BLOOMBERG TERMINAL CLOUD BAĞLANIYOR...</div>
      </div>
    );
  }

  return (
    <div className="terminal-container">
      {/* Toast Notification */}
      {toast && (
        <div className="terminal-toast">
          <span className="toast-icon">{toast.icon}</span>
          <span className="toast-msg">{toast.message}</span>
        </div>
      )}

      {/* Header with Ticker Tape */}
      <Header />

      {/* Top Command Hub: Piyasa & Araştırma Radarı */}
      <Navigation />

      {/* Main Terminal Layout: Sol Portföy Sütunu + Dinamik Çalışma Alanı */}
      <div className="terminal-body-layout">
        <Sidebar 
          collapsed={sidebarCollapsed} 
          onToggle={handleToggleSidebar} 
        />

        <main className="terminal-main">
          <ErrorBoundary key={activeTab}>
            <Suspense fallback={
              <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--cyan)', fontFamily: 'var(--font-mono)', fontSize: '11px' }}>
                <div className="loading-spinner" style={{ margin: '0 auto 12px auto' }}></div>
                <span>MODÜL YÜKLENİYOR...</span>
              </div>
            }>
            {activeTab === 'pro_chart' && (
              <ProChartTab
                onOpenAddModal={(ticker) => setShowAddModal(ticker || true)}
                onOpenSellModal={(h) => setSelectedSellHolding(h)}
                selectedTicker={selectedStockTicker}
                onSelectTicker={(t) => setSelectedStockTicker(t)}
              />
            )}

            {activeTab === 'broadcast_studio' && <BroadcastStudioTab />}

            {activeTab === 'fund_xray' && (
              <FundXRayTab 
                onSelectStock={(t) => {
                  if (setLastNavigatedFrom) {
                    setLastNavigatedFrom({
                      tab: 'fund_xray',
                      label: 'Fon & ETF Röntgeni'
                    });
                  }
                  setSelectedStockTicker(t);
                  setActiveTab('single_stock');
                }}
              />
            )}

            {activeTab === 'market' && (
              <MarketPulseTab 
                onSelectStock={(ticker) => {
                  if (setLastNavigatedFrom) {
                    setLastNavigatedFrom({
                      tab: 'market',
                      label: 'Piyasa Nabzı'
                    });
                  }
                  setSelectedStockTicker(ticker);
                  setActiveTab('single_stock');
                }}
              />
            )}

            {activeTab === 'potential' && (
              <PotentialStocksTab
                onOpenAddModal={(ticker) => setShowAddModal(ticker || true)}
                onSelectStockForAnalysis={(ticker) => {
                  if (setLastNavigatedFrom) {
                    setLastNavigatedFrom({
                      tab: 'potential',
                      label: 'Potansiyel Hisseler'
                    });
                  }
                  setSelectedStockTicker(ticker);
                  setActiveTab('single_stock');
                }}
              />
            )}

            {activeTab === 'overview' && <OverviewTab />}
            
            {activeTab === 'holdings' && (
              <HoldingsTab
                onOpenAddModal={(ticker) => setShowAddModal(ticker || true)}
                onOpenSellModal={(h) => setSelectedSellHolding(h)}
                onOpenEditModal={(h) => setSelectedEditHolding(h)}
                onOpenCashModal={() => setShowCashModal(true)}
                onOpenPpfModal={() => setShowPpfModal(true)}
                onSelectStockForChart={(t) => {
                  const ticker = typeof t === 'object' && t !== null ? (t.clean_ticker || t.ticker || '') : (t || '');
                  if (setLastNavigatedFrom) {
                    setLastNavigatedFrom({
                      tab: 'holdings',
                      label: 'Pozisyonlar & Varlıklar'
                    });
                  }
                  setSelectedStockTicker(ticker);
                  setActiveTab('pro_chart');
                }}
                onSelectStockForAnalysis={(t) => {
                  const ticker = typeof t === 'object' && t !== null ? (t.clean_ticker || t.ticker || '') : (t || '');
                  if (setLastNavigatedFrom) {
                    setLastNavigatedFrom({
                      tab: 'holdings',
                      label: 'Pozisyonlar & Varlıklar'
                    });
                  }
                  setSelectedStockTicker(ticker);
                  setActiveTab('single_stock');
                }}
              />
            )}

            {activeTab === 'benchmark' && <BenchmarkTab />}

            {activeTab === 'health' && (
              <RiskRadarTab
                onOpenSellModal={(h) => setSelectedSellHolding(h)}
                onOpenAddModal={(ticker) => setShowAddModal(ticker || true)}
              />
            )}

            {activeTab === 'shield' && (
              <ShieldTab
                onOpenAddGoldModal={() => setShowAddGoldModal(true)}
                onOpenPpfModal={() => setShowPpfModal(true)}
                onOpenCashModal={() => setShowCashModal(true)}
              />
            )}

            {activeTab === 'single_stock' && (
              <SingleStockTab
                selectedTicker={selectedStockTicker}
                onSelectTicker={(t) => setSelectedStockTicker(t)}
              />
            )}

            {activeTab === 'top10' && (
              <Top10QuantTab
                onSelectStock={(t) => {
                  setSelectedStockTicker(t);
                  setActiveTab('single_stock');
                }}
              />
            )}

            {activeTab === 'model' && (
              <ModelPortfolioTab 
                onSelectStock={(t) => {
                  setSelectedStockTicker(t);
                  setActiveTab('single_stock');
                }}
              />
            )}

            {activeTab === 'ledger' && (
              <TradeLedgerTab
                onOpenTransferModal={(amt) => setTransferModalAmount(typeof amt === 'number' ? Math.max(0, amt) : 0)}
              />
            )}

            {activeTab === 'manage' && (
              <ManageTab
                onOpenAddModal={() => setShowAddModal(true)}
                onOpenSellModal={(h) => setSelectedSellHolding(h)}
                onOpenEditModal={(h) => setSelectedEditHolding(h)}
                onOpenAddGoldModal={() => setShowAddGoldModal(true)}
                onOpenPpfModal={() => setShowPpfModal(true)}
                onOpenCashModal={() => setShowCashModal(true)}
              />
            )}
          </Suspense>
        </ErrorBoundary>
      </main>
      </div>

      {/* Modals */}
      {showAddModal && (
        <AddHoldingModal
          initialTicker={typeof showAddModal === 'string' ? showAddModal : ''}
          onClose={() => setShowAddModal(false)}
        />
      )}
      
      {selectedSellHolding && (
        <SellHoldingModal
          holding={selectedSellHolding}
          onClose={() => setSelectedSellHolding(null)}
        />
      )}

      {selectedEditHolding && (
        <EditHoldingModal
          holding={selectedEditHolding}
          onClose={() => setSelectedEditHolding(null)}
        />
      )}

      {transferModalAmount !== null && (
        <TransferToShieldModal
          defaultAmount={transferModalAmount}
          onClose={() => setTransferModalAmount(null)}
        />
      )}

      {showAddGoldModal && <AddGoldModal onClose={() => setShowAddGoldModal(false)} />}
      {showPpfModal && <UpdatePpfModal onClose={() => setShowPpfModal(false)} />}
      {showCashModal && <UpdateCashModal onClose={() => setShowCashModal(false)} />}
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <MainTerminal />
    </AppProvider>
  );
}
