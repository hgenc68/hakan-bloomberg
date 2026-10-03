import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import Header from './components/Header';
import Navigation from './components/Navigation';
import Sidebar from './components/Sidebar';
import MarketPulseTab from './pages/MarketPulseTab';
import OverviewTab from './pages/OverviewTab';
import HoldingsTab from './pages/HoldingsTab';
import BenchmarkTab from './pages/BenchmarkTab';
import RiskRadarTab from './pages/RiskRadarTab';
import ShieldTab from './pages/ShieldTab';
import SingleStockTab from './pages/SingleStockTab';
import Top10QuantTab from './pages/Top10QuantTab';
import ModelPortfolioTab from './pages/ModelPortfolioTab';
import TradeLedgerTab from './pages/TradeLedgerTab';
import ManageTab from './pages/ManageTab';
import PotentialStocksTab from './pages/PotentialStocksTab';
import ProChartTab from './pages/ProChartTab';
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
  const { activeTab, setActiveTab, loading, toast } = useApp();

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
          {activeTab === 'pro_chart' && (
            <ProChartTab
              onOpenAddModal={(ticker) => setShowAddModal(ticker || true)}
              onOpenSellModal={(h) => setSelectedSellHolding(h)}
              selectedTicker={selectedStockTicker}
              onSelectTicker={(t) => setSelectedStockTicker(t)}
            />
          )}

          {activeTab === 'market' && <MarketPulseTab />}

          {activeTab === 'potential' && (
            <PotentialStocksTab
              onOpenAddModal={(ticker) => setShowAddModal(ticker || true)}
              onSelectStockForAnalysis={(ticker) => {
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
              onSelectStockForChart={(ticker) => {
                setSelectedStockTicker(ticker);
                setActiveTab('pro_chart');
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

          {activeTab === 'model' && <ModelPortfolioTab />}

          {activeTab === 'ledger' && (
            <TradeLedgerTab
              onOpenTransferModal={(amt) => setTransferModalAmount(amt || 7547.95)}
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
