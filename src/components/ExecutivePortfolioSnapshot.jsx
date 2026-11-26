import React, { useMemo, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { 
  TrendingUp, 
  TrendingDown, 
  Layers, 
  ShieldAlert, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle,
  Calendar,
  Maximize2,
  ExternalLink,
  DollarSign,
  Palette
} from 'lucide-react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

// Curated brand metadata & monograms for sleek capsule bars
const BRAND_DATA = {
  NVDA: { name: 'NVIDIA Corporation', color: '#76b900', text: '#000', icon: '🟢', moat: 'CUDA yazılım ekosistemi ve GPU pazar hakimiyeti' },
  ANT: { name: 'Anthropic, PBC', color: '#d97757', text: '#fff', icon: '🤖', moat: 'Claude frontier modelleri ve kurumsal yapay zekâ entegrasyonu' },
  BYDNR: { name: 'Baydöner Restoranları', color: '#e11d48', text: '#fff', icon: '🍽️', moat: 'Türkiye geneli şube ağı ve doğrudan tüketici nakit akışı' },
  BIMAS: { name: 'BİM Birleşik Mağazalar', color: '#2563eb', text: '#fff', icon: '🛒', moat: 'Defansif gıda perakendesi ve yüksek stok devir hızı' },
  DRAM: { name: 'Roundhill Memory ETF', color: '#8b5cf6', text: '#fff', icon: '💾', moat: 'Yüksek bant genişlikli bellek (HBM) ve küresel çip talebi' },
  MU: { name: 'Micron Technology, Inc.', color: '#00539b', text: '#fff', icon: '⚡', moat: 'HBM3E bellek tedarikçisi ve veri merkezi bellek kapasitesi' },
  AVGO: { name: 'Broadcom Inc.', color: '#cc092f', text: '#fff', icon: '📶', moat: 'Özel yapay zekâ ASIC çipleri ve VMWare yazılım lisansları' },
  TSM: { name: 'Taiwan Semiconductor (TSMC)', color: '#e4002b', text: '#fff', icon: '⚙️', moat: '3nm ve 2nm gelişmiş çip üretim tekeli ve dökümhane liderliği' },
  VRT: { name: 'Vertiv Holdings Co', color: '#f15a24', text: '#fff', icon: '❄️', moat: 'Yapay zekâ veri merkezleri için sıvı soğutma ve güç yönetimi' },
  CAMT: { name: 'Camtek Ltd.', color: '#0ea5e9', text: '#fff', icon: '🔬', moat: 'İleri paketleme ve çip muayene cihazları liderliği' },
  ALAB: { name: 'Astera Labs, Inc.', color: '#6366f1', text: '#fff', icon: '🔌', moat: 'PCIe & CXL yapay zekâ bağlantı (interconnect) çipleri' },
  GRAM_ALTIN: { name: 'Gram Altın (Kur Kalkanı)', color: '#eab308', text: '#000', icon: '🟡', moat: 'Jeopolitik risklere ve devalüasyona karşı nihai rezerv kalkan' },
  XAUT: { name: 'Tether Gold (XAUT)', color: '#eab308', text: '#000', icon: '🥇', moat: 'Fiziki altın destekli dijital likit kur kalkanı' },
  LDO: { name: 'Lido DAO (Ethereum Staking)', color: '#00a3ff', text: '#fff', icon: '🌊', moat: 'Ethereum likit staking pazarının en büyük protokolü' },
  SUI: { name: 'Sui Network (Layer-1)', color: '#4da2ff', text: '#fff', icon: '💧', moat: 'Move dili ve yüksek paralelleştirilmiş blokzincir mimarisi' },
  BIO: { name: 'Bio Protocol', color: '#10b981', text: '#fff', icon: '🧬', moat: 'Merkeziyetsiz bilim (DeSci) araştırma finansman ağı' },
  'BIO-USD': { name: 'Bio Protocol', color: '#10b981', text: '#fff', icon: '🧬', moat: 'Merkeziyetsiz bilim (DeSci) araştırma finansman ağı' },
  DOGE: { name: 'Dogecoin', color: '#c2a633', text: '#000', icon: '🐕', moat: 'Yüksek likidite ve küresel perakende kripto topluluk gücü' },
  OP: { name: 'Optimism (Layer-2)', color: '#ff0420', text: '#fff', icon: '🔴', moat: 'Superchain ekosistemi ve Ethereum ölçekleme altyapısı' },
  ARKM: { name: 'Arkham Intelligence', color: '#94a3b8', text: '#000', icon: '🔍', moat: 'Blokzincir on-chain istihbarat ve veri analiz motoru' },
  ETH: { name: 'Ethereum', color: '#627eea', text: '#fff', icon: '⟠', moat: 'Küresel akıllı sözleşme ve DeFi rezerv katmanı' },
  'ETH-USD': { name: 'Ethereum', color: '#627eea', text: '#fff', icon: '⟠', moat: 'Küresel akıllı sözleşme ve DeFi rezerv katmanı' }
};

export default function ExecutivePortfolioSnapshot({
  portfolioSummary,
  currentCurrency = 'usd',
  onSelectStockForChart,
  onSelectStockForAnalysis
}) {
  const [selectedBasket, setSelectedBasket] = useState('all'); // 'all' (Tüm Portföy) | 'equity' (Yalnızca Hisse & ETF)
  const [themeStyle, setThemeStyle] = useState('pastel'); // 'pastel' (Görseldeki Orijinal Kartlar) | 'dark' (Koyu Cam Terminal)
  const [currencyMode, setCurrencyMode] = useState(currentCurrency === 'try' ? 'TRY' : 'USD');

  const isTRY = currencyMode === 'TRY';
  const sym = isTRY ? '₺' : '$';

  // Number formatters
  const fmt = (v, d = 2) => (Number(v) || 0).toLocaleString('tr-TR', { minimumFractionDigits: d, maximumFractionDigits: d });
  const fmtK = (v) => {
    const n = Number(v) || 0;
    if (Math.abs(n) >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (Math.abs(n) >= 1000) return `${(n / 1000).toFixed(1)}k`;
    return n.toFixed(0);
  };

  // Base raw holdings
  const rawHoldings = portfolioSummary?.enrichedHoldings || [];
  const usdtry = portfolioSummary?.usdtry || 50.62;

  // Filtered holdings list by basket
  const activeHoldings = useMemo(() => {
    let list = [...rawHoldings];
    if (selectedBasket === 'equity') {
      list = list.filter(h => {
        const symUpper = (h.ticker || '').toUpperCase();
        const clean = symUpper.replace('-USD', '').replace('.IS', '');
        const isGold = h.type === 'Altın' || h.type === 'Emtia' || symUpper.includes('XAUT') || symUpper.includes('GOLD') || clean === 'GRAM_ALTIN';
        const isCrypto = h.type === 'Kripto' || ['BTC', 'ETH', 'SOL', 'LDO', 'BIO', 'SUI', 'DOGE', 'OP', 'ARKM'].includes(clean);
        return !isGold && !isCrypto;
      });
    }

    // Map and calculate normalized weights and P/L
    const totalVal = list.reduce((acc, h) => acc + ((isTRY ? h.valTRY : h.valUSD) || 0), 0) || 1;

    return list.map(h => {
      const val = (isTRY ? h.valTRY : h.valUSD) || 0;
      const cost = (isTRY ? h.costTRY : h.costUSD) || 0;
      const profit = (isTRY ? h.profitTRY : h.profitUSD) || 0;
      const weight = (val / totalVal) * 100;
      const returnPct = Number(h.returnPct || (cost > 0 ? (profit / cost) * 100 : 0));
      const symUpper = (h.ticker || '').toUpperCase();
      const clean = symUpper.replace('-USD', '').replace('.IS', '');

      const brand = BRAND_DATA[clean] || BRAND_DATA[symUpper] || {
        name: h.name || h.ticker,
        color: '#38bdf8',
        text: '#fff',
        icon: '📊',
        moat: `${h.ticker} operasyonel büyüme ve sektör payı`
      };

      return {
        ...h,
        cleanTicker: clean,
        displayName: brand.name || h.name || h.ticker,
        brandColor: brand.color,
        brandIcon: brand.icon,
        moatDesc: brand.moat,
        weight,
        val,
        cost,
        profit,
        returnPct
      };
    }).sort((a, b) => b.weight - a.weight);
  }, [rawHoldings, selectedBasket, isTRY]);

  // Aggregate stats for top banner
  const bannerStats = useMemo(() => {
    if (selectedBasket === 'all') {
      const totalVal = isTRY ? (portfolioSummary?.totalValTRY || 0) : (portfolioSummary?.totalValUSD || 0);
      const totalCost = isTRY ? (portfolioSummary?.totalCostTRY || 0) : (portfolioSummary?.totalCostUSD || 0);
      const profit = isTRY ? (portfolioSummary?.unrealizedProfitTRY || 0) : (portfolioSummary?.unrealizedProfitUSD || 0);
      const returnPct = portfolioSummary?.unrealizedReturnPct || (totalCost > 0 ? (profit / totalCost) * 100 : 0);
      return { totalVal, profit, returnPct };
    }

    // Equity only aggregate
    const totalVal = activeHoldings.reduce((sum, h) => sum + h.val, 0);
    const totalCost = activeHoldings.reduce((sum, h) => sum + h.cost, 0);
    const profit = totalVal - totalCost;
    const returnPct = totalCost > 0 ? (profit / totalCost) * 100 : 0;
    return { totalVal, profit, returnPct };
  }, [selectedBasket, activeHoldings, portfolioSummary, isTRY]);

  // Dynamic Strategic Analysis Engine (Matches the 2 cards in the screenshot)
  const strategicInsights = useMemo(() => {
    const topHoldings = activeHoldings.slice(0, 6);
    const topTickers = topHoldings.map(h => h.cleanTicker);

    // 1. Rekabet Üstünlükleri (Moats & Durability)
    const moatPoints = [];
    if (topTickers.includes('NVDA') || topTickers.includes('ANT') || topTickers.includes('TSM')) {
      const aiNames = [];
      if (topTickers.includes('NVDA')) aiNames.push('Nvidia (CUDA ekosistemi ve GPU pazar hakimiyeti)');
      if (topTickers.includes('ANT')) aiNames.push('Anthropic (Claude kurumsal modelleri & entegrasyon gücü)');
      if (topTickers.includes('TSM')) aiNames.push('TSMC (gelişmiş dökümhane tekeli)');
      moatPoints.push(
        `${aiNames.join(' ve ')} ile yapay zekâ altyapısındaki rekabet üstünlüğünü ve fiyatlama gücünü elinde tutuyor.`
      );
    }

    if (topTickers.includes('BIMAS') || topTickers.includes('BYDNR')) {
      const retail = [];
      if (topTickers.includes('BIMAS')) retail.push('BİM organize perakende gücü');
      if (topTickers.includes('BYDNR')) retail.push('Baydöner yaygın restoran zinciri');
      moatPoints.push(
        `${retail.join(' ve ')}, enflasyonist dönemde doğrudan tüketiciye ulaşarak nakit akışı sürekliliği ve defansif tampon sağlıyor.`
      );
    }

    if (topTickers.includes('GRAM_ALTIN') || topTickers.includes('XAUT') || topTickers.includes('DRAM')) {
      moatPoints.push(
        `Altın varlıkları makro şoklara ve jeopolitik gerilimlere karşı sermaye kalkanı görevi görürken, HBM bellek yatırımları teknoloji dışı döngüsel büyüme fırsatı sunuyor.`
      );
    }

    if (moatPoints.length === 0) {
      moatPoints.push('Portföydeki lider varlıklar güçlü pazar payı ve ölçek ekonomisiyle sektörlerinde fiyat belirleme gücüne sahiptir.');
      moatPoints.push('Farklı varlık sınıfları (teknoloji, perakende ve kıymetli madenler) dalgalı piyasa koşullarında nakit akışı çeşitliliği sunmaktadır.');
    }

    // 2. Riskler & Yoğunlaşma (Concentration & Systemic Headwinds)
    const riskPoints = [];
    const techTickers = ['NVDA', 'ANT', 'MU', 'AVGO', 'TSM', 'VRT', 'ALAB', 'CAMT', 'DRAM'];
    const heldTech = topHoldings.filter(h => techTickers.includes(h.cleanTicker));
    const techWeight = heldTech.reduce((sum, h) => sum + h.weight, 0);

    if (techWeight >= 35) {
      const names = heldTech.map(h => h.cleanTicker).join(', ');
      riskPoints.push(
        `${names}'in küresel yapay zekâ capex döngüsüne ve yarı iletken harcamalarına ortak bağımlılığı, finansman maliyetleri ve teknoloji değerleme hassasiyeti durumunda portföyün beta/sistematik riskini artırıyor.`
      );
    }

    if (topTickers.includes('BYDNR')) {
      const bWeight = activeHoldings.find(h => h.cleanTicker === 'BYDNR')?.weight || 0;
      if (bWeight >= 20) {
        riskPoints.push(
          `Baydöner hissesindeki yüksek portföy ağırlığı (%${bWeight.toFixed(1)}), yerel piyasa oynaklığı ve restoran sektörü maliyet baskılarına karşı konsantrasyon riski yaratmaktadır.`
        );
      }
    }

    const cryptoTickers = ['LDO', 'SUI', 'BIO', 'DOGE', 'OP', 'ARKM', 'ETH'];
    const heldCrypto = activeHoldings.filter(h => cryptoTickers.includes(h.cleanTicker));
    const cryptoWeight = heldCrypto.reduce((sum, h) => sum + h.weight, 0);
    if (cryptoWeight >= 10) {
      riskPoints.push(
        `Kripto varlık sepetindeki (%${cryptoWeight.toFixed(1)}) yüksek getiri volatilitesi ve likidite dalgalanmaları, sermaye düşüş riskini genişletebilir.`
      );
    }

    if (riskPoints.length === 0) {
      riskPoints.push('Küresel faiz patikası ve FED kararları büyüme hisseleri ile altın fiyatları üzerinde dalgalanma yaratabilir.');
      riskPoints.push('Teknoloji ağırlıklı portföylerde sektör rotasyonları kâr realizasyonlarını tetikleyebilir.');
    }

    return { moatPoints, riskPoints };
  }, [activeHoldings]);

  // Waterfall / Sorted Bar Chart Data (Gain/Loss for Holdings)
  const chartData = useMemo(() => {
    // Sort from worst performing (most negative) to best performing (most positive)
    const sorted = [...activeHoldings].sort((a, b) => a.returnPct - b.returnPct);

    const labels = sorted.map(h => h.cleanTicker);
    const returnValues = sorted.map(h => Number(h.returnPct.toFixed(2)));
    
    // Red for negative, Green for positive
    const backgroundColors = returnValues.map(val => val >= 0 ? '#10b981' : '#ef4444');
    const borderColors = returnValues.map(val => val >= 0 ? '#34d399' : '#f87171');

    return {
      sortedHoldings: sorted,
      chartPayload: {
        labels,
        datasets: [
          {
            label: 'Getiri / Zarar %',
            data: returnValues,
            backgroundColor: backgroundColors,
            borderColor: borderColors,
            borderWidth: 1.5,
            borderRadius: 4,
            barThickness: Math.max(12, Math.min(32, Math.floor(580 / (labels.length || 1))))
          }
        ]
      }
    };
  }, [activeHoldings]);

  // Chart.js Options for Gain/Loss for Holdings
  const barChartOptions = useMemo(() => {
    return {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 600 },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(10, 15, 26, 0.95)',
          titleColor: '#f8fafc',
          bodyColor: '#cbd5e1',
          borderColor: 'rgba(56, 189, 248, 0.4)',
          borderWidth: 1,
          padding: 12,
          displayColors: false,
          callbacks: {
            title: (items) => {
              const idx = items[0]?.dataIndex;
              const h = chartData.sortedHoldings[idx];
              return `${h?.displayName || items[0]?.label} (${items[0]?.label})`;
            },
            label: (item) => {
              const idx = item.dataIndex;
              const h = chartData.sortedHoldings[idx];
              const p = Number(item.raw);
              const isP = p >= 0;
              const plVal = h?.profit != null ? `${isP ? '+' : ''}${sym}${fmt(h.profit, 2)}` : '';
              return [
                `Toplam Getiri: ${isP ? '+' : ''}%${fmt(p, 2)}`,
                plVal ? `Açık Kâr/Zarar: ${plVal}` : '',
                `Güncel Değer: ${sym}${fmt(h?.val, 2)}`,
                `Portföy Ağırlığı: %${fmt(h?.weight, 1)}`
              ].filter(Boolean);
            }
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: {
            color: '#cbd5e1',
            font: { family: 'monospace', size: 10, weight: '700' },
            maxRotation: 45,
            minRotation: 0
          }
        },
        y: {
          grid: {
            color: 'rgba(255, 255, 255, 0.08)',
            borderDash: [3, 3]
          },
          ticks: {
            color: '#94a3b8',
            font: { family: 'monospace', size: 10 },
            callback: (v) => `${v >= 0 ? '+' : ''}${v}%`
          }
        }
      }
    };
  }, [chartData, sym]);

  // Current formatted date matching screenshot e.g. 26/11/2026
  const currentDateStr = useMemo(() => {
    const d = new Date();
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  }, []);

  return (
    <div 
      className="executive-portfolio-snapshot-container"
      style={{
        background: '#0a0e17',
        borderRadius: '16px',
        padding: '24px',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6)',
        color: '#f8fafc',
        fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
        marginBottom: '24px'
      }}
    >
      {/* ========================================================================= */}
      {/* 1. TOP EXECUTIVE BANNER (METRIC PILLS + DATE & CONTROLS)                   */}
      {/* ========================================================================= */}
      <div 
        style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          flexWrap: 'wrap', 
          gap: '16px',
          marginBottom: '22px',
          paddingBottom: '18px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)'
        }}
      >
        {/* 3 Metric Pill Boxes (Exact Layout from Screenshot) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {/* Box 1: Total Portfolio Value (Green Box) */}
          <div 
            style={{
              background: '#0d1522',
              border: '2px solid #10b981',
              borderRadius: '8px',
              padding: '8px 18px',
              display: 'flex',
              alignItems: 'center',
              boxShadow: '0 4px 15px rgba(16, 185, 129, 0.15)'
            }}
          >
            <span 
              style={{ 
                color: '#10b981', 
                fontSize: '1.45rem', 
                fontWeight: 900, 
                fontFamily: 'monospace',
                letterSpacing: '0.5px'
              }}
            >
              {sym} {fmt(bannerStats.totalVal, 2)}
            </span>
          </div>

          {/* Box 2: Total Unrealized P/L (Red / Green Box) */}
          <div 
            style={{
              background: '#0d1522',
              border: `2px solid ${bannerStats.profit >= 0 ? '#10b981' : '#ef4444'}`,
              borderRadius: '8px',
              padding: '8px 18px',
              display: 'flex',
              alignItems: 'center',
              boxShadow: `0 4px 15px ${bannerStats.profit >= 0 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)'}`
            }}
          >
            <span 
              style={{ 
                color: bannerStats.profit >= 0 ? '#10b981' : '#ef4444', 
                fontSize: '1.45rem', 
                fontWeight: 900, 
                fontFamily: 'monospace',
                letterSpacing: '0.5px'
              }}
            >
              {bannerStats.profit >= 0 ? '+' : '-'} {sym}{fmt(Math.abs(bannerStats.profit), 2)}
            </span>
          </div>

          {/* Box 3: Total Return Percentage (Red / Green Box) */}
          <div 
            style={{
              background: '#0d1522',
              border: `2px solid ${bannerStats.returnPct >= 0 ? '#10b981' : '#ef4444'}`,
              borderRadius: '8px',
              padding: '8px 18px',
              display: 'flex',
              alignItems: 'center',
              boxShadow: `0 4px 15px ${bannerStats.returnPct >= 0 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)'}`
            }}
          >
            <span 
              style={{ 
                color: bannerStats.returnPct >= 0 ? '#10b981' : '#ef4444', 
                fontSize: '1.45rem', 
                fontWeight: 900, 
                fontFamily: 'monospace',
                letterSpacing: '0.5px'
              }}
            >
              {bannerStats.returnPct >= 0 ? '+' : '-'} % {fmt(Math.abs(bannerStats.returnPct), 2)}
            </span>
          </div>
        </div>

        {/* Top Right: Date Stamp & Switchers */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
          {/* Segment Filter (Tüm Portföy vs Hisse) */}
          <div style={{ display: 'flex', background: 'rgba(255,255,255,0.06)', borderRadius: '8px', padding: '3px', border: '1px solid rgba(255,255,255,0.1)' }}>
            <button
              type="button"
              onClick={() => setSelectedBasket('all')}
              style={{
                background: selectedBasket === 'all' ? 'var(--cyan)' : 'transparent',
                color: selectedBasket === 'all' ? '#000' : '#cbd5e1',
                border: 'none',
                borderRadius: '6px',
                padding: '4px 10px',
                fontSize: '0.75rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <Layers size={12} />
              <span>TÜM VARLIKLAR</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedBasket('equity')}
              style={{
                background: selectedBasket === 'equity' ? 'var(--cyan)' : 'transparent',
                color: selectedBasket === 'equity' ? '#000' : '#cbd5e1',
                border: 'none',
                borderRadius: '6px',
                padding: '4px 10px',
                fontSize: '0.75rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <TrendingUp size={12} />
              <span>HİSSE & ETF</span>
            </button>
          </div>

          {/* Currency Switcher ($ vs ₺) */}
          <div style={{ display: 'flex', background: 'rgba(255,255,255,0.06)', borderRadius: '8px', padding: '3px', border: '1px solid rgba(255,255,255,0.1)' }}>
            <button
              type="button"
              onClick={() => setCurrencyMode('USD')}
              style={{
                background: currencyMode === 'USD' ? '#10b981' : 'transparent',
                color: currencyMode === 'USD' ? '#000' : '#cbd5e1',
                border: 'none',
                borderRadius: '6px',
                padding: '4px 8px',
                fontSize: '0.75rem',
                fontWeight: 900,
                cursor: 'pointer'
              }}
            >
              $ USD
            </button>
            <button
              type="button"
              onClick={() => setCurrencyMode('TRY')}
              style={{
                background: currencyMode === 'TRY' ? '#10b981' : 'transparent',
                color: currencyMode === 'TRY' ? '#000' : '#cbd5e1',
                border: 'none',
                borderRadius: '6px',
                padding: '4px 8px',
                fontSize: '0.75rem',
                fontWeight: 900,
                cursor: 'pointer'
              }}
            >
              ₺ TRY
            </button>
          </div>

          {/* Card Theme Switcher */}
          <button
            type="button"
            onClick={() => setThemeStyle(themeStyle === 'pastel' ? 'dark' : 'pastel')}
            title="Kart renk stilini değiştir (Pastel Görsel vs Koyu Cam)"
            style={{
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '8px',
              padding: '6px 10px',
              color: '#38bdf8',
              fontSize: '0.75rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Palette size={13} />
            <span>{themeStyle === 'pastel' ? 'Pastel Kartlar' : 'Koyu Cam'}</span>
          </button>

          {/* Big Bold Red Date Stamp (Matches Photo) */}
          <div 
            style={{ 
              color: '#ef4444', 
              fontSize: '1.35rem', 
              fontWeight: 900, 
              fontFamily: 'monospace',
              letterSpacing: '0.8px',
              paddingLeft: '6px'
            }}
          >
            {currentDateStr}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. MAIN 2-COLUMN WORKSPACE (HOLDINGS TABLE + ANALYSIS & CHART)             */}
      {/* ========================================================================= */}
      <div 
        style={{ 
          display: 'grid', 
          gridTemplateColumns: 'minmax(340px, 46%) 1fr', 
          gap: '24px',
          alignItems: 'start'
        }}
      >
        {/* ======================================================================= */}
        {/* LEFT PANEL: SLEEK CAPSULE / PILL BARS TABLE                            */}
        {/* ======================================================================= */}
        <div 
          style={{ 
            background: '#0d131f', 
            borderRadius: '14px', 
            padding: '16px 14px',
            border: '1px solid rgba(255, 255, 255, 0.08)'
          }}
        >
          {/* Table Header */}
          <div 
            style={{ 
              display: 'grid', 
              gridTemplateColumns: '1fr 75px 95px', 
              padding: '0 8px 10px 8px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              color: '#94a3b8',
              fontSize: '0.82rem',
              fontWeight: 800,
              letterSpacing: '0.3px'
            }}
          >
            <div>Stock</div>
            <div style={{ textAlign: 'center' }}>Weight</div>
            <div style={{ textAlign: 'right' }}>Gain/Loss</div>
          </div>

          {/* Holdings Capsule Rows */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px', maxHeight: '590px', overflowY: 'auto', paddingRight: '4px' }}>
            {activeHoldings.map((h, idx) => {
              const isProfit = h.profit >= 0;
              // Capsule length or relative fullness based on weight
              const maxWeight = activeHoldings[0]?.weight || 10;
              const relativeFill = Math.min(100, Math.max(25, (h.weight / maxWeight) * 100));

              return (
                <div 
                  key={h.id || h.ticker || idx}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 75px 95px',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '2px 0'
                  }}
                >
                  {/* Stock Pill Bar */}
                  <div 
                    onClick={() => {
                      if (onSelectStockForChart) onSelectStockForChart(h.cleanTicker);
                      else if (onSelectStockForAnalysis) onSelectStockForAnalysis(h.cleanTicker);
                    }}
                    title={`${h.displayName} (${h.cleanTicker}) • Tıkla & İncele`}
                    style={{
                      background: 'linear-gradient(90deg, #182235 0%, #151c2c 100%)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: '9999px',
                      padding: '5px 12px 5px 6px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      width: `${relativeFill}%`,
                      minWidth: '210px',
                      maxWidth: '100%',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      boxShadow: '0 2px 6px rgba(0, 0, 0, 0.3)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(56, 189, 248, 0.4)';
                      e.currentTarget.style.transform = 'translateX(2px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                      e.currentTarget.style.transform = 'translateX(0)';
                    }}
                  >
                    {/* Circle Monogram / Logo */}
                    <div 
                      style={{
                        width: '26px',
                        height: '26px',
                        borderRadius: '50%',
                        background: h.brandColor || '#38bdf8',
                        color: h.brandText || '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.7rem',
                        fontWeight: 900,
                        flexShrink: 0,
                        boxShadow: '0 2px 6px rgba(0,0,0,0.4)'
                      }}
                    >
                      {h.cleanTicker.slice(0, 3)}
                    </div>

                    {/* Company Name */}
                    <span 
                      style={{ 
                        color: '#f8fafc', 
                        fontSize: '0.82rem', 
                        fontWeight: 700, 
                        whiteSpace: 'nowrap', 
                        overflow: 'hidden', 
                        textOverflow: 'ellipsis' 
                      }}
                    >
                      {h.displayName}
                    </span>
                  </div>

                  {/* Weight Column */}
                  <div 
                    style={{ 
                      textAlign: 'center', 
                      fontFamily: 'monospace', 
                      fontWeight: 800, 
                      fontSize: '0.86rem', 
                      color: '#f8fafc' 
                    }}
                  >
                    {fmt(h.weight, 2)}%
                  </div>

                  {/* Gain/Loss Column (with Arrow & Color) */}
                  <div 
                    style={{ 
                      textAlign: 'right', 
                      fontFamily: 'monospace', 
                      fontWeight: 800, 
                      fontSize: '0.86rem',
                      color: isProfit ? '#10b981' : '#ef4444',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'flex-end',
                      gap: '4px'
                    }}
                  >
                    <span>{isProfit ? '↑' : '↓'}</span>
                    <span>{isProfit ? '' : '-'}{sym}{fmt(Math.abs(h.profit), 2)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ======================================================================= */}
        {/* RIGHT PANEL: 2 STRATEGIC ANALYSIS CARDS + GAIN/LOSS FOR HOLDINGS CHART */}
        {/* ======================================================================= */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* ------------------------------------------------------------------- */}
          {/* Card 1: Rekabet Üstünlükleri & Güçlü Moat Bacakları (Yeşil Kart)     */}
          {/* ------------------------------------------------------------------- */}
          <div 
            style={{
              background: themeStyle === 'pastel' ? '#dcfce7' : 'rgba(16, 185, 129, 0.08)',
              border: `1.5px solid ${themeStyle === 'pastel' ? '#86efac' : 'rgba(16, 185, 129, 0.35)'}`,
              borderRadius: '14px',
              padding: '14px 18px',
              color: themeStyle === 'pastel' ? '#0f172a' : '#f8fafc',
              boxShadow: '0 4px 15px rgba(0, 0, 0, 0.15)',
              position: 'relative'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <div 
                style={{ 
                  width: '8px', 
                  height: '8px', 
                  borderRadius: '50%', 
                  background: '#10b981',
                  boxShadow: '0 0 8px #10b981' 
                }} 
              />
              <span 
                style={{ 
                  fontSize: '0.78rem', 
                  fontWeight: 900, 
                  textTransform: 'uppercase', 
                  letterSpacing: '0.5px',
                  color: themeStyle === 'pastel' ? '#166534' : '#34d399'
                }}
              >
                REKABET ÜSTÜNLÜKLERİ, MOAT VE KURUMSAL DİNAMİKLER
              </span>
            </div>

            <ul style={{ margin: 0, paddingLeft: '16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {strategicInsights.moatPoints.map((point, i) => (
                <li 
                  key={i} 
                  style={{ 
                    fontSize: '0.82rem', 
                    lineHeight: '1.45', 
                    fontWeight: 600,
                    color: themeStyle === 'pastel' ? '#1e293b' : '#e2e8f0'
                  }}
                >
                  {point}
                </li>
              ))}
            </ul>
          </div>

          {/* ------------------------------------------------------------------- */}
          {/* Card 2: Yoğunlaşma & Sistematik Riskler (Mercan / Kırmızı Kart)       */}
          {/* ------------------------------------------------------------------- */}
          <div 
            style={{
              background: themeStyle === 'pastel' ? '#fee2e2' : 'rgba(239, 68, 68, 0.08)',
              border: `1.5px solid ${themeStyle === 'pastel' ? '#fca5a5' : 'rgba(239, 68, 68, 0.35)'}`,
              borderRadius: '14px',
              padding: '14px 18px',
              color: themeStyle === 'pastel' ? '#0f172a' : '#f8fafc',
              boxShadow: '0 4px 15px rgba(0, 0, 0, 0.15)',
              position: 'relative'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <div 
                style={{ 
                  width: '8px', 
                  height: '8px', 
                  borderRadius: '50%', 
                  background: '#ef4444',
                  boxShadow: '0 0 8px #ef4444' 
                }} 
              />
              <span 
                style={{ 
                  fontSize: '0.78rem', 
                  fontWeight: 900, 
                  textTransform: 'uppercase', 
                  letterSpacing: '0.5px',
                  color: themeStyle === 'pastel' ? '#991b1b' : '#f87171'
                }}
              >
                YOĞUNLAŞMA, MAKRO HASSASİYETLER & SİSTEMATİK RİSKLER
              </span>
            </div>

            <ul style={{ margin: 0, paddingLeft: '16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {strategicInsights.riskPoints.map((point, i) => (
                <li 
                  key={i} 
                  style={{ 
                    fontSize: '0.82rem', 
                    lineHeight: '1.45', 
                    fontWeight: 600,
                    color: themeStyle === 'pastel' ? '#1e293b' : '#e2e8f0'
                  }}
                >
                  {point}
                </li>
              ))}
            </ul>
          </div>

          {/* ------------------------------------------------------------------- */}
          {/* Bottom Card: Gain/Loss for Holdings Waterfall / Bar Chart           */}
          {/* ------------------------------------------------------------------- */}
          <div 
            style={{
              background: '#0d131f',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '14px',
              padding: '16px 18px 12px 18px',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)'
            }}
          >
            {/* Title */}
            <div 
              style={{ 
                textAlign: 'center', 
                fontSize: '0.92rem', 
                fontWeight: 900, 
                color: '#f8fafc',
                letterSpacing: '0.4px',
                marginBottom: '10px'
              }}
            >
              Gain/Loss for Holdings
            </div>

            {/* Bar Chart Canvas */}
            <div style={{ height: '240px', width: '100%', position: 'relative' }}>
              <Bar data={chartData.chartPayload} options={barChartOptions} />
            </div>

            {/* Watermark / Brand Footer */}
            <div 
              style={{ 
                display: 'flex', 
                justifyContent: 'flex-end', 
                alignItems: 'center', 
                gap: '6px',
                marginTop: '10px',
                fontSize: '0.68rem',
                color: '#64748b',
                fontWeight: 800,
                letterSpacing: '0.5px'
              }}
            >
              <span>POWERED BY</span>
              <strong style={{ color: '#38bdf8' }}>BLOOMBERG TERMINAL • EXECUTIVE RÖNTGEN</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
