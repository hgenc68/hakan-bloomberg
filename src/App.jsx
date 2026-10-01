import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import Header from './components/Header';
import Navigation from './components/Navigation';
import OverviewTab from './pages/OverviewTab';
import HoldingsTab from './pages/HoldingsTab';
import TradeLedgerTab from './pages/TradeLedgerTab';
import ShieldTab from './pages/ShieldTab';
import ManageTab from './pages/ManageTab';
import {
  AddHoldingModal,
  SellHoldingModal,
  EditHoldingModal,
  TransferToShieldModal,
  AddGoldModal,
  UpdatePpfModal
} from './components/Modals';

function MainTerminal() {
  const { activeTab, loading, toast } = useApp();

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedSellHolding, setSelectedSellHolding] = useState(null);
  const [selectedEditHolding, setSelectedEditHolding] = useState(null);
  const [transferModalAmount, setTransferModalAmount] = useState(null);
  const [showAddGoldModal, setShowAddGoldModal] = useState(false);
  const [showPpfModal, setShowPpfModal] = useState(false);

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

      {/* Subnav Pills */}
      <Navigation />

      {/* Main Workspace View */}
      <main className="terminal-main">
        {activeTab === 'overview' && <OverviewTab />}
        
        {activeTab === 'holdings' && (
          <HoldingsTab
            onOpenAddModal={() => setShowAddModal(true)}
            onOpenSellModal={(h) => setSelectedSellHolding(h)}
            onOpenEditModal={(h) => setSelectedEditHolding(h)}
          />
        )}

        {activeTab === 'ledger' && (
          <TradeLedgerTab
            onOpenTransferModal={(amt) => setTransferModalAmount(amt || 7547.95)}
          />
        )}

        {activeTab === 'shield' && (
          <ShieldTab
            onOpenAddGoldModal={() => setShowAddGoldModal(true)}
            onOpenPpfModal={() => setShowPpfModal(true)}
          />
        )}

        {activeTab === 'manage' && (
          <ManageTab
            onOpenAddModal={() => setShowAddModal(true)}
            onOpenSellModal={(h) => setSelectedSellHolding(h)}
            onOpenEditModal={(h) => setSelectedEditHolding(h)}
            onOpenAddGoldModal={() => setShowAddGoldModal(true)}
            onOpenPpfModal={() => setShowPpfModal(true)}
          />
        )}
      </main>

      {/* Modals */}
      {showAddModal && <AddHoldingModal onClose={() => setShowAddModal(false)} />}
      
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
