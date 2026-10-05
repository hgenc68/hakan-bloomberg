import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useApp } from '../context/AppContext';
import NativeProChart from '../components/NativeProChart';
import { db } from '../firebase';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { 
  LineChart, 
  Search, 
  Star, 
  Briefcase, 
  Globe, 
  Coins, 
  Layers, 
  Plus, 
  Trash2, 
  ExternalLink, 
  Maximize2, 
  Minimize2, 
  Sliders, 
  AlertTriangle, 
  X, 
  Clock,
  Terminal,
  Copy,
  Check,
  Edit2,
  FolderPlus
} from 'lucide-react';
import stocksData from '../data/stocksData.json';
import potentialStocksData from '../data/potentialStocksData.json';
import benchmarkData from '../data/benchmarkData.json';

// Single, All-in-One Pine Script v6: EMA 50 + Fully Customizable Dynamic Auto Fibonacci
export const EMA50_AUTOFIB_PINE = `//@version=6
indicator("EMA 50 & Dinamik Auto Fibonacci [Hkn]", shorttitle="EMA50_AutoFib", overlay=true, max_lines_count=100, max_labels_count=50, max_boxes_count=20)

// =============================================================================
// 1) EMA AYARLARI
// =============================================================================
grp_ema      = "══════════ 1) EMA AYARLARI ══════════"
showEma      = input.bool(true, "EMA 50 Göster", group=grp_ema)
emaLen       = input.int(50, "EMA Periyodu", minval=1, group=grp_ema)
emaSrc       = input.source(close, "EMA Kaynağı", group=grp_ema)
emaColor     = input.color(color.rgb(41, 98, 255), "EMA Rengi", group=grp_ema)
emaWidth     = input.int(2, "EMA Çizgi Kalınlığı", minval=1, maxval=5, group=grp_ema)

emaVal = ta.ema(emaSrc, emaLen)
plot(showEma ? emaVal : na, title="EMA 50", color=emaColor, linewidth=emaWidth)

// =============================================================================
// 2) OTOMATİK FİBONACCİ GENEL & GERİYE BAKIŞ AYARLARI
// =============================================================================
grp_fib      = "══════════ 2) FİBONACCİ GENEL & GERİYE BAKIŞ ══════════"
showFib      = input.bool(true, "Otomatik Fibonacci Göster", group=grp_fib)
fibLookback  = input.int(10, "Geriye Dönük Pivot Hassasiyeti (Lookback Bars)", minval=2, maxval=100, tooltip="Daha küçük değerler (Örn: 5-8) kısa vadeli dalgaları, daha büyük değerler (Örn: 15-30) ana trend dönüşlerini tespit eder.", group=grp_fib)
extendRight  = input.bool(true, "Çizgileri Sağa Uzat (Extend Right)", group=grp_fib)
fibStyleStr  = input.string("Düz (Solid)", "Çizgi Stili", options=["Düz (Solid)", "Kesikli (Dashed)", "Noktalı (Dotted)"], group=grp_fib)
fibWidth     = input.int(1, "Fibonacci Çizgi Kalınlığı", minval=1, maxval=4, group=grp_fib)
showLabels   = input.bool(true, "Fiyat ve Oran Etiketlerini Göster", group=grp_fib)
showGoldenBox= input.bool(true, "Golden Pocket (0.50 - 0.618) Alanını Renklendir", group=grp_fib)
goldenColor  = input.color(color.rgb(245, 158, 11, 85), "Golden Pocket Bölge Rengi", group=grp_fib)

// Çizgi Stili Dönüşümü
getLineStyle(s) =>
    s == "Kesikli (Dashed)" ? line.style_dashed : s == "Noktalı (Dotted)" ? line.style_dotted : line.style_solid

activeLineStyle = getLineStyle(fibStyleStr)

// =============================================================================
// 3) FİBONACCİ SEVİYE & RENK AYARLARI
// =============================================================================
grp_levels   = "══════════ 3) FİBONACCİ SEVİYE & RENK AYARLARI ══════════"
show0        = input.bool(true, "0.000 (Dip / Tepe)", inline="f0", group=grp_levels)
col0         = input.color(color.gray, "", inline="f0", group=grp_levels)

show236      = input.bool(true, "0.236 Seviyesi", inline="f236", group=grp_levels)
col236       = input.color(color.rgb(156, 39, 176), "", inline="f236", group=grp_levels)

show382      = input.bool(true, "0.382 Seviyesi", inline="f382", group=grp_levels)
col382       = input.color(color.rgb(239, 68, 68), "", inline="f382", group=grp_levels)

show500      = input.bool(true, "0.500 (Denge Seviyesi)", inline="f500", group=grp_levels)
col500       = input.color(color.rgb(245, 158, 11), "", inline="f500", group=grp_levels)

show618      = input.bool(true, "0.618 (Altın Oran)", inline="f618", group=grp_levels)
col618       = input.color(color.rgb(16, 185, 129), "", inline="f618", group=grp_levels)

show786      = input.bool(true, "0.786 Seviyesi", inline="f786", group=grp_levels)
col786       = input.color(color.rgb(0, 188, 212), "", inline="f786", group=grp_levels)

show1000     = input.bool(true, "1.000 (Tepe / Dip)", inline="f1000", group=grp_levels)
col1000      = input.color(color.gray, "", inline="f1000", group=grp_levels)

show1618     = input.bool(false, "1.618 (Uzatma Hedefi)", inline="f1618", group=grp_levels)
col1618      = input.color(color.rgb(233, 30, 99), "", inline="f1618", group=grp_levels)

// =============================================================================
// 4) SWING HIGH / LOW HESAPLAMA MOTORU
// =============================================================================
ph = ta.pivothigh(high, fibLookback, fibLookback)
pl = ta.pivotlow(low, fibLookback, fibLookback)

var float lastHigh = na
var int   lastHighBar = na
var float lastLow = na
var int   lastLowBar = na
var bool  isUptrend = true

if not na(ph)
    lastHigh := ph
    lastHighBar := bar_index - fibLookback

if not na(pl)
    lastLow := pl
    lastLowBar := bar_index - fibLookback

if not na(lastHighBar) and not na(lastLowBar)
    isUptrend := lastLowBar < lastHighBar

// =============================================================================
// 5) DİNAMİK ÇİZİM YÖNETİCİSİ (Lines, Labels, Golden Box)
// =============================================================================
var line l_0 = na
var line l_236 = na
var line l_382 = na
var line l_500 = na
var line l_618 = na
var line l_786 = na
var line l_1000 = na
var line l_1618 = na

var label lbl_0 = na
var label lbl_236 = na
var label lbl_382 = na
var label lbl_500 = na
var label lbl_618 = na
var label lbl_786 = na
var label lbl_1000 = na
var label lbl_1618 = na

var box b_golden = na

updateFibLine(l, lbl, showLvl, priceVal, colVal, ratioStr, x1, x2) =>
    if showFib and showLvl and not na(priceVal)
        ext = extendRight ? extend.right : extend.none
        if na(l)
            l := line.new(x1, priceVal, x2, priceVal, color=colVal, width=fibWidth, style=activeLineStyle, extend=ext)
        else
            line.set_xy1(l, x1, priceVal)
            line.set_xy2(l, x2, priceVal)
            line.set_color(l, colVal)
            line.set_width(l, fibWidth)
            line.set_style(l, activeLineStyle)
            line.set_extend(l, ext)
        
        if showLabels
            txt = ratioStr + " (" + str.tostring(priceVal, "#.##") + ")"
            if na(lbl)
                lbl := label.new(x2, priceVal, txt, color=color.new(color.black, 100), textcolor=colVal, style=label.style_label_left, size=size.small)
            else
                label.set_xy(lbl, x2, priceVal)
                label.set_text(lbl, txt)
                label.set_textcolor(lbl, colVal)
    else
        if not na(l)
            line.delete(l)
            l := na
        if not na(lbl)
            label.delete(lbl)
            lbl := na
    [l, lbl]

if showFib and not na(lastHigh) and not na(lastLow) and (lastHigh > lastLow)
    diff = lastHigh - lastLow
    
    f0_price    = isUptrend ? lastLow : lastHigh
    f236_price  = isUptrend ? lastHigh - diff * 0.236 : lastLow + diff * 0.236
    f382_price  = isUptrend ? lastHigh - diff * 0.382 : lastLow + diff * 0.382
    f500_price  = isUptrend ? lastHigh - diff * 0.500 : lastLow + diff * 0.500
    f618_price  = isUptrend ? lastHigh - diff * 0.618 : lastLow + diff * 0.618
    f786_price  = isUptrend ? lastHigh - diff * 0.786 : lastLow + diff * 0.786
    f1000_price = isUptrend ? lastHigh : lastLow
    f1618_price = isUptrend ? lastHigh + diff * 0.618 : lastLow - diff * 0.618
    
    startX = math.min(lastHighBar, lastLowBar)
    endX   = bar_index

    // Seviye Çizgilerini Güncelle
    [l0_u, lbl0_u]       = updateFibLine(l_0, lbl_0, show0, f0_price, col0, "0.000", startX, endX)
    l_0 := l0_u, lbl_0 := lbl0_u

    [l236_u, lbl236_u]   = updateFibLine(l_236, lbl_236, show236, f236_price, col236, "0.236", startX, endX)
    l_236 := l236_u, lbl_236 := lbl236_u

    [l382_u, lbl382_u]   = updateFibLine(l_382, lbl_382, show382, f382_price, col382, "0.382", startX, endX)
    l_382 := l382_u, lbl_382 := lbl382_u

    [l500_u, lbl500_u]   = updateFibLine(l_500, lbl_500, show500, f500_price, col500, "0.500", startX, endX)
    l_500 := l500_u, lbl_500 := lbl500_u

    [l618_u, lbl618_u]   = updateFibLine(l_618, lbl_618, show618, f618_price, col618, "0.618 (Golden)", startX, endX)
    l_618 := l618_u, lbl_618 := lbl618_u

    [l786_u, lbl786_u]   = updateFibLine(l_786, lbl_786, show786, f786_price, col786, "0.786", startX, endX)
    l_786 := l786_u, lbl_786 := lbl786_u

    [l1000_u, lbl1000_u] = updateFibLine(l_1000, lbl_1000, show1000, f1000_price, col1000, "1.000", startX, endX)
    l_1000 := l1000_u, lbl_1000 := lbl1000_u

    [l1618_u, lbl1618_u] = updateFibLine(l_1618, lbl_1618, show1618, f1618_price, col1618, "1.618", startX, endX)
    l_1618 := l1618_u, lbl_1618 := lbl1618_u

    // Golden Pocket Kutu Dolgusu (0.50 - 0.618)
    if showGoldenBox and show500 and show618
        topBox = math.max(f500_price, f618_price)
        botBox = math.min(f500_price, f618_price)
        if na(b_golden)
            b_golden := box.new(startX, topBox, endX + 15, botBox, border_color=color.new(goldenColor, 50), border_width=1, border_style=line.style_dotted, bgcolor=goldenColor)
        else
            box.set_left(b_golden, startX)
            box.set_right(b_golden, endX + 15)
            box.set_top(b_golden, topBox)
            box.set_bottom(b_golden, botBox)
            box.set_bgcolor(b_golden, goldenColor)
    else
        if not na(b_golden)
            box.delete(b_golden)
            b_golden := na
`;

// Helper to convert any market ticker into TradingView compatible symbol string
export function getTradingViewSymbol(ticker) {
  if (!ticker) return 'NASDAQ:NVDA';
  const clean = ticker.trim().toUpperCase();

  // If already prefixed
  if (clean.includes(':')) return clean;

  // Macro Indicators
  if (clean === 'DXY') return 'CAPITALCOM:DXY';
  if (clean === 'VIX') return 'CBOE:VIX';
  if (clean === 'BRENT' || clean === 'UKOIL') return 'TVC:UKOIL';
  if (clean === 'US10Y') return 'TVC:US10Y';
  if (clean === 'US02Y') return 'TVC:US02Y';
  if (clean === 'XAUUSD' || clean === 'GOLD' || clean === 'ALTIN' || clean === 'ONS_ALTIN') return 'OANDA:XAUUSD';
  if (clean === 'USDTRY') return 'FX_IDC:USDTRY';

  // Crypto Market Caps
  if (clean === 'TOTAL') return 'CRYPTOCAP:TOTAL';
  if (clean === 'TOTAL2') return 'CRYPTOCAP:TOTAL2';
  if (clean === 'TOTAL3') return 'CRYPTOCAP:TOTAL3';
  if (clean === 'OTHERS') return 'CRYPTOCAP:OTHERS';
  if (clean === 'TOTALDEFI') return 'CRYPTOCAP:TOTALDEFI';

  // Crypto Pairs
  if (clean === 'BTC' || clean === 'BTCUSDT' || clean === 'BTC-USD') return 'BINANCE:BTCUSDT';
  if (clean === 'ETH' || clean === 'ETHUSDT' || clean === 'ETH-USD') return 'BINANCE:ETHUSDT';
  if (clean === 'SOL' || clean === 'SOLUSDT' || clean === 'SOL-USD') return 'BINANCE:SOLUSDT';
  if (clean === 'LDO' || clean === 'LDOUSDT' || clean === 'LDO-USD') return 'BINANCE:LDOUSDT';
  if (clean === 'BIO' || clean === 'BIOUSDT' || clean === 'BIO-USD' || clean === 'BIO34812-USD') return 'MEXC:BIO_USDT';
  if (clean === 'SUI' || clean === 'SUIUSDT' || clean === 'SUI-USD' || clean === 'SUI20947-USD') return 'BINANCE:SUIUSDT';
  if (clean === 'OP' || clean === 'OPUSDT' || clean === 'OP-USD') return 'BINANCE:OPUSDT';
  if (clean === 'ARKM' || clean === 'ARKMUSDT' || clean === 'ARKM-USD') return 'BINANCE:ARKMUSDT';
  if (clean === 'DOGE' || clean === 'DOGEUSDT' || clean === 'DOGE-USD') return 'BINANCE:DOGEUSDT';
  if (clean === 'XAUT' || clean === 'XAUT-USD') return 'BITFINEX:XAUTUSD';

  // BIST 100 Equities
  if (clean.endsWith('.IS')) {
    return `BIST:${clean.replace('.IS', '')}`;
  }
  const bistKnown = [
    'BYDNR', 'TUPRS', 'THYAO', 'ASELS', 'EREGL', 'KCHOL', 'BIMAS', 'SISE', 
    'FROTO', 'ASTOR', 'SAHOL', 'GARAN', 'AKBNK', 'YKBNK', 'ISCTR', 'PGSUS', 
    'TCELL', 'PETKM', 'TTKOM', 'ENKAI', 'KOZAL', 'SASA', 'HEKTS', 'KONTR',
    'AGROT', 'AHGAZ', 'AKCNS', 'AKFGY', 'AKFYE', 'ALARK', 'ALBRK', 'ALFAS', 'ARCLK', 
    'ARDYZ', 'BERA', 'BFREN', 'BRSAN', 'BRYAT', 'BSOKE', 'BTCIM', 'CANTE', 'CCOLA', 
    'CIMSA', 'CWENE', 'DOAS', 'DOHOL', 'ECILC', 'ECZYT', 'EGEEN', 'EKGYO', 'ENERY', 
    'ENJSA', 'EUPWR', 'EUREN', 'GESAN', 'GLYHO', 'GOLTS', 'GSDHO', 'GUBRF', 'GWIND', 
    'HALKB', 'IPEKE', 'ISDMR', 'ISGYO', 'ISMEN', 'IZMDC', 'KARSN', 'KAYSE', 'KCAER', 
    'KMPUR', 'KONYA', 'KORDS', 'KOZAA', 'KRDMD', 'MAVI', 'MGROS', 'MIATK', 'ODAS', 
    'OTKAR', 'OYAKC', 'PASEU', 'PENTA', 'QUAGR', 'REEDR', 'SDTTR', 'SKBNK', 'SMRTG', 
    'SOKM', 'TABGD', 'TARKM', 'TATEN', 'TAVHL', 'TKFEN', 'TOASO', 'TRGYO', 'TSKB', 
    'TTRAK', 'ULKER', 'VAKBN', 'VESBE', 'VESTL', 'YEOTK', 'YYLGD', 'ZOREN'
  ];
  if (bistKnown.includes(clean)) {
    return `BIST:${clean}`;
  }

  // Stocks & ETFs
  if (clean === 'SPCX') return 'SPCX';
  if (clean === 'CUSD') return 'AMEX:CUSD';
  if (clean === 'DRAM') return 'DRAM';
  if (clean === 'SGOV') return 'NYSE:SGOV';
  if (clean === 'IEF') return 'NASDAQ:IEF';
  if (clean === 'TLT') return 'NASDAQ:TLT';
  if (clean === 'SHV') return 'NYSE:SHV';
  if (clean === 'BIL') return 'AMEX:BIL';
  if (clean === 'BND') return 'NASDAQ:BND';
  if (clean === 'SOXX') return 'NASDAQ:SOXX';
  if (clean === 'SMH') return 'NASDAQ:SMH';
  if (clean === 'QQQ') return 'NASDAQ:QQQ';
  if (clean === 'SPY') return 'AMEX:SPY';
  if (clean === 'IWM') return 'AMEX:IWM';
  if (clean === 'GLD') return 'AMEX:GLD';
  if (clean === 'URA') return 'AMEX:URA';
  if (clean === 'XLE') return 'AMEX:XLE';
  if (clean === 'XLK') return 'AMEX:XLK';
  if (clean === 'BOTZ') return 'NASDAQ:BOTZ';

  // NYSE Known Symbols
  const nyseKnown = ['TSM', 'ABBV', 'XOM', 'VRT', 'DIA', 'KO', 'DIS', 'NKE', 'JNJ', 'PFE', 'UNH', 'JPM', 'V', 'MA', 'WMT'];
  if (nyseKnown.includes(clean)) {
    return `NYSE:${clean}`;
  }

  // Default to NASDAQ for US tech / growth equities
  return `NASDAQ:${clean}`;
}

// Available indicator studies list for TradingView
const AVAILABLE_STUDIES = [
  { id: 'STD;EMA', name: 'EMA 50', fullName: 'Üstel Hareketli Ortalama (50 Periyot)' },
  { id: 'STD;RSI', name: 'RSI', fullName: 'Göreceli Güç Endeksi' },
  { id: 'STD;MACD', name: 'MACD', fullName: 'MACD Momentum' },
  { id: 'STD;Bollinger_Bands', name: 'Bollinger', fullName: 'Bollinger Bantları' },
  { id: 'STD;VWAP', name: 'VWAP', fullName: 'Hacim Ağırlıklı Ort.' }
];

// Preset Watchlists Catalog with user's core holdings integrated
const PRESET_WATCHLISTS = {
  us_stocks: [
    { ticker: 'SPCX', name: 'Space Exploration Tech Corp', desc: 'Portföy Çekirdek ABD Hissesi • 2.22 Lot', tv: 'SPCX', isHolding: true },
    { ticker: 'NVDA', name: 'Nvidia Corp', desc: 'AI Çip & Veri Merkezi Lideri', tv: 'NASDAQ:NVDA' },
    { ticker: 'TSM', name: 'TSMC', desc: 'Küresel Çip Dökümhane Tekeli', tv: 'NYSE:TSM' },
    { ticker: 'VRT', name: 'Vertiv Holdings Co', desc: 'AI Sıvı Soğutma Altyapı Tekeli', tv: 'NYSE:VRT' },
    { ticker: 'ALAB', name: 'Astera Labs Inc', desc: 'AI Çip PCIe/CXL Bağlantı Lideri', tv: 'NASDAQ:ALAB' },
    { ticker: 'ABBV', name: 'AbbVie Inc', desc: 'Biyofarma & Temettü Devi', tv: 'NYSE:ABBV' },
    { ticker: 'XOM', name: 'Exxon Mobil', desc: 'Entegre Enerji & Nakit Akışı', tv: 'NYSE:XOM' },
    { ticker: 'AAPL', name: 'Apple Inc', desc: 'Tüketici Elektroniği & Ekosistem', tv: 'NASDAQ:AAPL' },
    { ticker: 'MSFT', name: 'Microsoft Corp', desc: 'Bulut Bilişim & Kurumsal AI', tv: 'NASDAQ:MSFT' },
    { ticker: 'AMZN', name: 'Amazon.com Inc', desc: 'AWS Bulut & E-Ticaret', tv: 'NASDAQ:AMZN' },
    { ticker: 'GOOGL', name: 'Alphabet Inc', desc: 'Arama & Google Cloud AI', tv: 'NASDAQ:GOOGL' },
    { ticker: 'META', name: 'Meta Platforms', desc: 'Sosyal Ağlar & Llama AI', tv: 'NASDAQ:META' },
    { ticker: 'PLTR', name: 'Palantir Technologies', desc: 'Kurumsal Yapay Zeka & Savunma', tv: 'NYSE:PLTR' },
    { ticker: 'AMD', name: 'Advanced Micro Devices', desc: 'CPU & Veri Merkezi GPU', tv: 'NASDAQ:AMD' },
    { ticker: 'AVGO', name: 'Broadcom Inc', desc: 'Özel ASIC AI Çipleri & Ağ', tv: 'NASDAQ:AVGO' },
    { ticker: 'ARM', name: 'Arm Holdings plc', desc: 'Düşük Güçlü Çip Mimarisi', tv: 'NASDAQ:ARM' },
    { ticker: 'ASML', name: 'ASML Holding NV', desc: 'EUV Litografi Tekeli', tv: 'NASDAQ:ASML' },
    { ticker: 'MU', name: 'Micron Technology', desc: 'HBM Yüksek Bant Bellek', tv: 'NASDAQ:MU' },
    { ticker: 'CRWD', name: 'CrowdStrike Holdings', desc: 'Uç Nokta Siber Güvenlik', tv: 'NASDAQ:CRWD' },
    { ticker: 'SNOW', name: 'Snowflake Inc', desc: 'Veri Bulutu & Veri Deposu', tv: 'NYSE:SNOW' }
  ],
  etf: [
    { ticker: 'DRAM', name: 'D-RAM Bellek Teknoloji ETF', desc: 'Portföy ETF Varlığı • 5.00 Lot', tv: 'DRAM', isHolding: true },
    { ticker: 'CUSD', name: 'Coinbase USD Yield ETF', desc: 'Portföy Nakit Getiri Fonu', tv: 'AMEX:CUSD', isHolding: true },
    { ticker: 'SGOV', name: 'iShares 0-3 Month Treasury', desc: 'Ultra Kısa Vadeli Risksiz Dolar Faizi (0-3 Ay)', tv: 'NYSE:SGOV' },
    { ticker: 'IEF', name: 'iShares 7-10 Year Treasury', desc: 'Orta Vadeli ABD Gösterge Tahvili (7-10Y)', tv: 'NASDAQ:IEF' },
    { ticker: 'TLT', name: 'iShares 20+ Year Treasury', desc: 'Uzun Vadeli ABD Hazine Tahvilleri (20Y+)', tv: 'NASDAQ:TLT' },
    { ticker: 'SOXX', name: 'iShares Semiconductor ETF', desc: 'ABD Yarı İletken Sektör Sepeti', tv: 'NASDAQ:SOXX' },
    { ticker: 'SMH', name: 'VanEck Semiconductor ETF', desc: 'En Büyük Yarı İletken Şirketleri', tv: 'NASDAQ:SMH' },
    { ticker: 'QQQ', name: 'Invesco QQQ Trust', desc: 'Nasdaq 100 Teknoloji Endeksi', tv: 'NASDAQ:QQQ' },
    { ticker: 'SPY', name: 'SPDR S&P 500 ETF', desc: 'S&P 500 Gösterge Endeksi', tv: 'AMEX:SPY' },
    { ticker: 'IWM', name: 'iShares Russell 2000 ETF', desc: 'ABD Küçük Ölçekli (Small Cap) Şirketler', tv: 'AMEX:IWM' },
    { ticker: 'BOTZ', name: 'Global X Robotics & AI ETF', desc: 'Robotik & Yapay Zeka Şirketleri', tv: 'NASDAQ:BOTZ' },
    { ticker: 'XLK', name: 'Technology Select Sector SPDR', desc: 'S&P Teknoloji Sektör Fonu', tv: 'AMEX:XLK' },
    { ticker: 'XLE', name: 'Energy Select Sector SPDR', desc: 'S&P Enerji Sektör Fonu', tv: 'AMEX:XLE' },
    { ticker: 'URA', name: 'Global X Uranium ETF', desc: 'Uranyum & Nükleer Enerji Şirketleri', tv: 'AMEX:URA' },
    { ticker: 'GLD', name: 'SPDR Gold Shares', desc: 'Fiziki Altın Fonu', tv: 'AMEX:GLD' }
  ],
  bist: [
    { ticker: 'BYDNR.IS', name: 'Baydöner Restoranları', desc: 'Portföy BIST Hissesi • 10.00 Lot', tv: 'BIST:BYDNR', isHolding: true },
    { ticker: 'TUPRS.IS', name: 'Tüpraş Rafineri', desc: 'Portföy BIST Temettü Devi • 1.00 Lot', tv: 'BIST:TUPRS', isHolding: true },
    { ticker: 'THYAO.IS', name: 'Türk Hava Yolları', desc: 'Havacılık & Global Kargo Lideri', tv: 'BIST:THYAO' },
    { ticker: 'ASELS.IS', name: 'Aselsan Elektronik Sanayi', desc: 'Savunma Sanayii & Radar Teknolojileri', tv: 'BIST:ASELS' },
    { ticker: 'EREGL.IS', name: 'Ereğli Demir Çelik', desc: 'Yassı Çelik & Sanayi Devi', tv: 'BIST:EREGL' },
    { ticker: 'KCHOL.IS', name: 'Koç Holding', desc: 'Türkiye’nin En Büyük Sanayi Topluluğu', tv: 'BIST:KCHOL' },
    { ticker: 'BIMAS.IS', name: 'BİM Birleşik Mağazalar', desc: 'Defansif Perakende & Nakit Akışı', tv: 'BIST:BIMAS' },
    { ticker: 'SISE.IS', name: 'Şişecam Cam Sanayii', desc: 'Global Cam Üretim Lideri', tv: 'BIST:SISE' },
    { ticker: 'FROTO.IS', name: 'Ford Otosan', desc: 'Ticari Araç İhracat Şampiyonu', tv: 'BIST:FROTO' },
    { ticker: 'ASTOR.IS', name: 'Astor Enerji', desc: 'Transformatör & Şebeke Ekipmanları', tv: 'BIST:ASTOR' },
    { ticker: 'SAHOL.IS', name: 'Sabancı Holding', desc: 'Enerji, Banka ve Sanayi Portföyü', tv: 'BIST:SAHOL' },
    { ticker: 'GARAN.IS', name: 'Garanti BBVA', desc: 'Özel Bankacılık Lideri', tv: 'BIST:GARAN' },
    { ticker: 'AKBNK.IS', name: 'Akbank T.A.Ş.', desc: 'Özel Bankacılık & Sermaye Gücü', tv: 'BIST:AKBNK' },
    { ticker: 'ISCTR.IS', name: 'İş Bankası (C)', desc: 'Geniş İştirak Ağı & Bankacılık', tv: 'BIST:ISCTR' },
    { ticker: 'PGSUS.IS', name: 'Pegasus Hava Taşımacılığı', desc: 'Düşük Maliyetli Havacılık', tv: 'BIST:PGSUS' },
    { ticker: 'TCELL.IS', name: 'Turkcell İletişim', desc: 'Telekomünikasyon & Dijital Servisler', tv: 'BIST:TCELL' }
  ],
  crypto: [
    { ticker: 'BTCUSDT', name: 'Bitcoin / USDT', desc: 'Kripto Para Amiral Gemisi (Dijital Altın)', tv: 'BINANCE:BTCUSDT' },
    { ticker: 'ETHUSDT', name: 'Ethereum / USDT', desc: 'Akıllı Sözleşme & DeFi Katmanı', tv: 'BINANCE:ETHUSDT' },
    { ticker: 'SOLUSDT', name: 'Solana / USDT', desc: 'Yüksek Hızlı Monolitik Katman 1', tv: 'BINANCE:SOLUSDT' },
    { ticker: 'LDOUSDT', name: 'Lido DAO / USDT', desc: 'Portföy Kripto Varlığı • 50.00 Lot', tv: 'BINANCE:LDOUSDT', isHolding: true },
    { ticker: 'BIOUSDT', name: 'Bio Protocol / USDT', desc: 'Portföy DeSci Varlığı • 500.00 Lot', tv: 'MEXC:BIO_USDT', isHolding: true },
    { ticker: 'SUIUSDT', name: 'Sui Network / USDT', desc: 'Yeni Nesil Move Tabanlı Katman 1', tv: 'BINANCE:SUIUSDT' },
    { ticker: 'OPUSDT', name: 'Optimism / USDT', desc: 'Ethereum Katman 2 Ölçekleme', tv: 'BINANCE:OPUSDT' },
    { ticker: 'ARKMUSDT', name: 'Arkham Intelligence', desc: 'On-chain AI Analitik Protokolü', tv: 'BINANCE:ARKMUSDT' },
    { ticker: 'DOGEUSDT', name: 'Dogecoin / USDT', desc: 'Likidite & Meme Öncüsü', tv: 'BINANCE:DOGEUSDT' },
    { ticker: 'TOTAL', name: 'Kripto Toplam Piyasa Değeri', desc: 'Tüm Kripto Varlıkların Toplam Büyüklüğü ($)', tv: 'CRYPTOCAP:TOTAL' },
    { ticker: 'TOTAL2', name: 'Toplam Piyasa Değeri (BTC Hariç)', desc: 'Tüm Altcoinlerin Toplam Büyüklüğü ($)', tv: 'CRYPTOCAP:TOTAL2' },
    { ticker: 'TOTAL3', name: 'Toplam Piyasa Değeri (BTC & ETH Hariç)', desc: 'Saf Altcoin Piyasası Toplam Değeri ($)', tv: 'CRYPTOCAP:TOTAL3' },
    { ticker: 'OTHERS', name: 'Diğer Küçük/Orta Altcoinler', desc: 'Top 10 Hariç Asimetrik Fırsat Endeksi ($)', tv: 'CRYPTOCAP:OTHERS' },
    { ticker: 'TOTALDEFI', name: 'DeFi Ekosistem Toplamı', desc: 'Merkeziyetsiz Finans Protokol Büyüklüğü ($)', tv: 'CRYPTOCAP:TOTALDEFI' }
  ],
  macro: [
    { ticker: 'DXY', name: 'US Dollar Index', desc: 'Doların Küresel Sepet Karşısındaki Gücü', tv: 'CAPITALCOM:DXY' },
    { ticker: 'VIX', name: 'CBOE Volatilite Endeksi', desc: 'Wall Street Korku & Oynaklık İbresi', tv: 'CBOE:VIX' },
    { ticker: 'BRENT', name: 'Brent Ham Petrol', desc: 'Küresel Enerji & Jeopolitik Fiyatlama', tv: 'TVC:UKOIL' },
    { ticker: 'US10Y', name: 'ABD 10 Yıllık Tahvil Faizi', desc: 'Küresel Risksiz Faiz Oranı & DCF İskontosu', tv: 'TVC:US10Y' },
    { ticker: 'US02Y', name: 'ABD 2 Yıllık Tahvil Faizi', desc: 'Fed Politika Beklentisi Öncü Göstergesi', tv: 'TVC:US02Y' },
    { ticker: 'XAUUSD', name: 'Ons Altın Spot ($)', desc: 'Klasik Güvenli Liman & Enflasyon Kalkanı', tv: 'OANDA:XAUUSD' },
    { ticker: 'USDTRY', name: 'Dolar / Türk Lirası', desc: 'TCMB Rezerv & Kur Rejimi Takibi', tv: 'FX_IDC:USDTRY' }
  ]
};


// Comprehensive Search & Autocomplete Catalog for Stocks, ETFs, Crypto & Macro
export const SEARCH_CATALOG = [
  // BIST 100 (Türkiye)
  { ticker: "THYAO.IS", name: "Türk Hava Yolları", market: "BIST", keywords: "thy thyao hava taşımacılık uçak kargo turk" },
  { ticker: "TUPRS.IS", name: "Tüpraş Rafinerileri", market: "BIST", keywords: "tuprs tüpraş petrol rafineri akaryakıt enerji temettü" },
  { ticker: "ASELS.IS", name: "Aselsan Elektronik Sanayii", market: "BIST", keywords: "asels aselsan savunma askeri radar elektronik teknoloji" },
  { ticker: "EREGL.IS", name: "Ereğli Demir ve Çelik", market: "BIST", keywords: "eregl erdemir çelik demir yassı metal sanayi" },
  { ticker: "KCHOL.IS", name: "Koç Holding", market: "BIST", keywords: "kchol koç holding sanayi otomotiv enerji" },
  { ticker: "SAHOL.IS", name: "Sabancı Holding", market: "BIST", keywords: "sahol sabancı holding enerji banka sanayi" },
  { ticker: "BIMAS.IS", name: "BİM Birleşik Mağazalar", market: "BIST", keywords: "bimas bim perakende market gıda indirim" },
  { ticker: "SISE.IS", name: "Şişecam Cam Sanayii", market: "BIST", keywords: "sise şişe cam düzcam kimyasallar global" },
  { ticker: "FROTO.IS", name: "Ford Otosan", market: "BIST", keywords: "froto ford otomotiv araba ticari araç ihracat" },
  { ticker: "ASTOR.IS", name: "Astor Enerji", market: "BIST", keywords: "astor transformatör şebeke elektrik enerji" },
  { ticker: "GARAN.IS", name: "Garanti BBVA", market: "BIST", keywords: "garan garanti banka bankacılık finans kredi" },
  { ticker: "AKBNK.IS", name: "Akbank", market: "BIST", keywords: "akbnk akbank banka bankacılık sabancı finans" },
  { ticker: "YKBNK.IS", name: "Yapı ve Kredi Bankası", market: "BIST", keywords: "ykbnk yapı kredi banka finans koç" },
  { ticker: "ISCTR.IS", name: "İş Bankası (C)", market: "BIST", keywords: "isctr iş bankası bankacılık finans c" },
  { ticker: "VAKBN.IS", name: "VakıfBank", market: "BIST", keywords: "vakbn vakıfbank kamu bankası finans" },
  { ticker: "HALKB.IS", name: "Halkbank", market: "BIST", keywords: "halkb halkbank kamu bankası esnaf finans" },
  { ticker: "TOASO.IS", name: "Tofaş Türk Otomobil Fabrikası", market: "BIST", keywords: "toaso tofaş fiat stellantis otomotiv araba" },
  { ticker: "TTRAK.IS", name: "Türk Traktör", market: "BIST", keywords: "ttrak traktör tarım koç new holland temettü" },
  { ticker: "OTKAR.IS", name: "Otokar Otomotiv ve Savunma", market: "BIST", keywords: "otkar otokar savunma zırhlı araç otobüs koç" },
  { ticker: "ARCLK.IS", name: "Arçelik (Beko)", market: "BIST", keywords: "arclk arçelik beko beyaz eşya koç dayanıklı tüketim" },
  { ticker: "VESTL.IS", name: "Vestel Elektronik", market: "BIST", keywords: "vestl vestel beyaz eşya tv batarya zorlu" },
  { ticker: "VESBE.IS", name: "Vestel Beyaz Eşya", market: "BIST", keywords: "vesbe vestel beyaz eşya buzdolabı ihracat" },
  { ticker: "ENKAI.IS", name: "Enka İnşaat", market: "BIST", keywords: "enkai enka inşaat mühendislik enerji döviz nakit" },
  { ticker: "TCELL.IS", name: "Turkcell İletişim", market: "BIST", keywords: "tcell turkcell telekom mobil iletişim 5g" },
  { ticker: "TTKOM.IS", name: "Türk Telekomünikasyon", market: "BIST", keywords: "ttkom türk telekom internet fiber altyapı sabit hat" },
  { ticker: "PGSUS.IS", name: "Pegasus Hava Taşımacılığı", market: "BIST", keywords: "pgsus pegasus havacılık uçak low cost seyahat" },
  { ticker: "TAVHL.IS", name: "TAV Havalimanları", market: "BIST", keywords: "tavhl tav havalimanı terminal duty free havacılık" },
  { ticker: "SOKM.IS", name: "Şok Marketler", market: "BIST", keywords: "sokm şok market perakende gıda indirim yıldız" },
  { ticker: "MGROS.IS", name: "Migros Ticaret", market: "BIST", keywords: "mgros migros süpermarket perakende gıda anadolu" },
  { ticker: "PETKM.IS", name: "Petkim Petrokimya", market: "BIST", keywords: "petkm petkim petrokimya plastik etilen socar" },
  { ticker: "GUBRF.IS", name: "Gübre Fabrikaları", market: "BIST", keywords: "gubrf gübre fabrikaları tarım gübre altın maden" },
  { ticker: "HEKTS.IS", name: "Hektaş Ticaret", market: "BIST", keywords: "hekts hektaş tarım tohum hayvan sağlığı oyak" },
  { ticker: "KONTRA.IS", name: "Kontrolmatik Teknoloji", market: "BIST", keywords: "kontr kontrolmatik teknoloji lityum batarya pomega mühendislik" },
  { ticker: "SMRTG.IS", name: "Smart Güneş Enerjisi", market: "BIST", keywords: "smrtg smart güneş paneli ges yenilenebilir enerji" },
  { ticker: "EUPWR.IS", name: "Europower Enerji", market: "BIST", keywords: "eupwr europower elektrik trafo otomasyon ges girişim" },
  { ticker: "CWENE.IS", name: "CW Enerji", market: "BIST", keywords: "cwene cw enerji güneş paneli ges fotovoltaik" },
  { ticker: "ALARK.IS", name: "Alarko Holding", market: "BIST", keywords: "alark alarko holding enerji taahhüt tarım turizm" },
  { ticker: "ENJSA.IS", name: "Enerjisa Enerji", market: "BIST", keywords: "enjsa enerjisa elektrik dağıtım perakende sabancı temettü" },
  { ticker: "AKSEN.IS", name: "Aksa Enerji", market: "BIST", keywords: "aksen aksa enerji elektrik üretim santral doğalgaz kazancı" },
  { ticker: "ODAS.IS", name: "Odaş Elektrik", market: "BIST", keywords: "odas odaş elektrik kömür santral maden altın çan" },
  { ticker: "KOZAL.IS", name: "Koza Altın İşletmeleri", market: "BIST", keywords: "kozal koza altın madencilik cevher külçe kıymetli" },
  { ticker: "KOZAA.IS", name: "Koza Anadolu Metal", market: "BIST", keywords: "kozaa koza anadolu maden metal ipek holding" },
  { ticker: "IPEKE.IS", name: "İpek Doğal Enerji", market: "BIST", keywords: "ipeke ipek enerji petrol doğalgaz maden" },
  { ticker: "TKFEN.IS", name: "Tekfen Holding", market: "BIST", keywords: "tkfen tekfen inşaat taahhüt gübre toros tarım" },
  { ticker: "DOHOL.IS", name: "Doğan Şirketler Grubu Holding", market: "BIST", keywords: "dohol doğan holding otomotiv elektrik yatırım finans" },
  { ticker: "EKGYO.IS", name: "Emlak Konut GYO", market: "BIST", keywords: "ekgyo emlak konut gyo toki gayrimenkul konut inşaat" },
  { ticker: "ISGYO.IS", name: "İş Gayrimenkul Yatırım Ortaklığı", market: "BIST", keywords: "isgyo iş gyo gayrimenkul kira portföy iş bankası" },
  { ticker: "MAVI.IS", name: "Mavi Giyim", market: "BIST", keywords: "mavi giyim jeans perakende tekstil moda" },
  { ticker: "ULKER.IS", name: "Ülker Bisküvi", market: "BIST", keywords: "ulker ülker bisküvi çikolata gıda pladis yıldız" },
  { ticker: "AEFES.IS", name: "Anadolu Efes Biracılık", market: "BIST", keywords: "aefes anadolu efes bira içecek meşrubat ccola rusya" },
  { ticker: "CCOLA.IS", name: "Coca-Cola İçecek", market: "BIST", keywords: "ccola coca cola içecek gazlı anadolu meşrubat ihracat" },
  { ticker: "BRSAN.IS", name: "Borusan Boru", market: "BIST", keywords: "brsan borusan boru çelik abd berg boru sanayi" },
  { ticker: "KORDS.IS", name: "Kordsa Teknik Tekstil", market: "BIST", keywords: "kords kordsa lastik bezi kompozit karbon sabancı" },
  { ticker: "OYAKC.IS", name: "Oyak Çimento", market: "BIST", keywords: "oyakc oyak çimento hazır beton inşaat aslan" },
  { ticker: "CIMSA.IS", name: "Çimsa Çimento", market: "BIST", keywords: "cimsa çimsa beyaz çimento sabancı cac ihracat" },
  { ticker: "BERA.IS", name: "Bera Holding", market: "BIST", keywords: "bera holding konya kağıt rulman gıda tekstil" },
  { ticker: "KCAER.IS", name: "Kocaer Çelik", market: "BIST", keywords: "kcaer kocaer profil çelik yapı yeşil çelik ihracat" },
  { ticker: "ISMEN.IS", name: "İş Yatırım Menkul Değerler", market: "BIST", keywords: "ismen iş yatırım aracı kurum borsa komisyon temettü" },
  { ticker: "TABGD.IS", name: "TAB Gıda", market: "BIST", keywords: "tabgd tab gıda burger king popeyes ata restoran hızlı tüketim" },
  { ticker: "BYDNR.IS", name: "Baydöner Restoranları", market: "BIST", keywords: "bydnr baydöner restoran iskender gıda perakende portföy" },

  // US Tech & Growth Leaders
  { ticker: "NVDA", name: "NVIDIA Corporation", market: "NASDAQ", keywords: "nvda nvidia ai yapay zeka gpu çip veri merkezi blackwell cuda h100" },
  { ticker: "AAPL", name: "Apple Inc.", market: "NASDAQ", keywords: "aapl apple iphone mac ipad ios app store hizmetler" },
  { ticker: "MSFT", name: "Microsoft Corporation", market: "NASDAQ", keywords: "msft microsoft azure cloud windows office openai copilot" },
  { ticker: "AMZN", name: "Amazon.com Inc.", market: "NASDAQ", keywords: "amzn amazon aws bulut e-ticaret prime perakende cloud" },
  { ticker: "GOOGL", name: "Alphabet Inc. (Google)", market: "NASDAQ", keywords: "googl google alphabet arama youtube cloud waymo gemini ai" },
  { ticker: "META", name: "Meta Platforms Inc.", market: "NASDAQ", keywords: "meta facebook instagram whatsapp threads llama ai reklam vr quest" },
  { ticker: "TSLA", name: "Tesla Inc.", market: "NASDAQ", keywords: "tsla tesla elektrikli araç ev otonom fsd optimus batarya robotaksi" },
  { ticker: "PLTR", name: "Palantir Technologies", market: "NYSE", keywords: "pltr palantir aip ontology savunma veri analitiği kurumsal ai" },
  { ticker: "TSM", name: "Taiwan Semiconductor (TSMC)", market: "NYSE", keywords: "tsm tsmc dökümhane taiwan çip yarı iletken 3nm wafer" },
  { ticker: "AVGO", name: "Broadcom Inc.", market: "NASDAQ", keywords: "avgo broadcom asic özel çip ağ switch vmware yazılım" },
  { ticker: "AMD", name: "Advanced Micro Devices", market: "NASDAQ", keywords: "amd cpu ryzen epyc gpu mi300 veri merkezi yapay zeka" },
  { ticker: "ARM", name: "Arm Holdings plc", market: "NASDAQ", keywords: "arm işlemci mimari mobil iot sunucu lisans çip" },
  { ticker: "ASML", name: "ASML Holding N.V.", market: "NASDAQ", keywords: "asml euv litografi çip baskı makinesi tekel hollanda" },
  { ticker: "VRT", name: "Vertiv Holdings Co", market: "NYSE", keywords: "vrt vertiv sıvı soğutma veri merkezi güç ups thermal ai altyapı" },
  { ticker: "ALAB", name: "Astera Labs Inc.", market: "NASDAQ", keywords: "alab astera pcie cxl aries taurus bağlantı connectivity çip" },
  { ticker: "MU", name: "Micron Technology", market: "NASDAQ", keywords: "mu micron dram nand hbm bellek hafıza bellek modülü" },
  { ticker: "INTC", name: "Intel Corporation", market: "NASDAQ", keywords: "intc intel x86 işlemci dökümhane foundry cpu sunucu" },
  { ticker: "QCOM", name: "Qualcomm Inc.", market: "NASDAQ", keywords: "qcom qualcomm snapdragon 5g modem mobil ai arm pc" },
  { ticker: "CRWD", name: "CrowdStrike Holdings", market: "NASDAQ", keywords: "crwd crowdstrike falcon siber güvenlik edr cloud security" },
  { ticker: "PANW", name: "Palo Alto Networks", market: "NASDAQ", keywords: "panw palo alto ağ güvenlik firewall prisma sase" },
  { ticker: "SNOW", name: "Snowflake Inc.", market: "NYSE", keywords: "snow snowflake veri ambarı data cloud sql kurumsal analiz" },
  { ticker: "ORCL", name: "Oracle Corporation", market: "NYSE", keywords: "orcl oracle veri tabanı oci cloud kurumsal yazılım bulut erp" },
  { ticker: "CRM", name: "Salesforce Inc.", market: "NYSE", keywords: "crm salesforce müşteri ilişkileri saas agentforce bulut" },
  { ticker: "ADBE", name: "Adobe Inc.", market: "NASDAQ", keywords: "adbe adobe photoshop illustrator firefly yaratıcı yazılım dijital medya" },
  { ticker: "NOW", name: "ServiceNow Inc.", market: "NYSE", keywords: "now servicenow iş akışı it servis otomasyon kurumsal bulut" },
  { ticker: "UBER", name: "Uber Technologies", market: "NYSE", keywords: "uber yolculuk araç paylaşım eats kurye mobilite teslimat" },
  { ticker: "COIN", name: "Coinbase Global", market: "NASDAQ", keywords: "coin coinbase kripto borsa bitcoin ethereum altyapı saklama" },
  { ticker: "MSTR", name: "MicroStrategy Inc.", market: "NASDAQ", keywords: "mstr microstrategy saylor bitcoin rezerv btc hazine" },
  { ticker: "NFLX", name: "Netflix Inc.", market: "NASDAQ", keywords: "nflx netflix yayın platformu dizi film streaming abone" },
  { ticker: "DIS", name: "Walt Disney Company", market: "NYSE", keywords: "dis disney eğlence tema parkları marvel star wars disney+" },
  { ticker: "SPCX", name: "Space Exploration Tech Corp", market: "US", keywords: "spcx space exploration uzay portföy roket uydu" },

  // US Dividend & Value Titans
  { ticker: "BRK.B", name: "Berkshire Hathaway Inc.", market: "NYSE", keywords: "brk brkb berkshire warren buffett sigorta nakit holding geico" },
  { ticker: "JPM", name: "JPMorgan Chase & Co.", market: "NYSE", keywords: "jpm jp morgan bankacılık küresel yatırım bankası jamie dimon" },
  { ticker: "V", name: "Visa Inc.", market: "NYSE", keywords: "v visa ödeme ağları kredi kartı fintech takas işlem" },
  { ticker: "MA", name: "Mastercard Incorporated", market: "NYSE", keywords: "ma mastercard ödeme sistemleri kart fintech küresel takas" },
  { ticker: "ABBV", name: "AbbVie Inc.", market: "NYSE", keywords: "abbv abbvie biyofarma humira skyrizi temettü sağlık" },
  { ticker: "LLY", name: "Eli Lilly and Company", market: "NYSE", keywords: "lly lilly kilo verme zepbound mounjaro diyabet ilaç sağlık" },
  { ticker: "NVO", name: "Novo Nordisk A/S", market: "NYSE", keywords: "nvo novo nordisk ozempic wegovy insülin obezite danimarka" },
  { ticker: "JNJ", name: "Johnson & Johnson", market: "NYSE", keywords: "jnj johnson & johnson medikal cihaz ilaç sağlık temettü kralı" },
  { ticker: "XOM", name: "Exxon Mobil Corporation", market: "NYSE", keywords: "xom exxon mobil petrol doğalgaz kaya gazı rafine enerji temettü" },
  { ticker: "CVX", name: "Chevron Corporation", market: "NYSE", keywords: "cvx chevron petrol fosil yakıt enerji temettü entegre" },
  { ticker: "WMT", name: "Walmart Inc.", market: "NYSE", keywords: "wmt walmart süpermarket indirimli perakende perakendeci gıda" },
  { ticker: "COST", name: "Costco Wholesale Corp.", market: "NASDAQ", keywords: "cost costco toptan üyelik market perakende depo" },
  { ticker: "KO", name: "The Coca-Cola Company", market: "NYSE", keywords: "ko coca cola içecek alkolsüz meşrubat temettü warren buffett" },
  { ticker: "PEP", name: "PepsiCo Inc.", market: "NASDAQ", keywords: "pep pepsi lays cips frito-lay meşrubat gıda temettü" },
  { ticker: "PG", name: "Procter & Gamble", market: "NYSE", keywords: "pg procter gamble tüketim malları ariel gillette deterjan hijyen" },
  { ticker: "MCD", name: "McDonald's Corporation", market: "NYSE", keywords: "mcd mcdonalds fast food restoran hamburger bayilik franchise" },

  // Key ETFs
  { ticker: "QQQ", name: "Invesco QQQ Trust (Nasdaq 100)", market: "ETF", keywords: "qqq nasdaq 100 teknoloji büyüme büyük ölçek endeks fonu" },
  { ticker: "SPY", name: "SPDR S&P 500 ETF Trust", market: "ETF", keywords: "spy spdr s&p 500 abd gösterge endeksi etf fon" },
  { ticker: "VOO", name: "Vanguard S&P 500 ETF", market: "ETF", keywords: "voo vanguard s&p 500 düşük masraf endeks fonu" },
  { ticker: "IWM", name: "iShares Russell 2000 ETF", market: "ETF", keywords: "iwm russell 2000 küçük ölçekli small cap abd şirketleri etf" },
  { ticker: "SOXX", name: "iShares Semiconductor ETF", market: "ETF", keywords: "soxx yariletken çip yarı iletken sektör etf fonu nvda avgo tsm" },
  { ticker: "SMH", name: "VanEck Semiconductor ETF", market: "ETF", keywords: "smh vaneck yarı iletken çip çip sektörü fonu" },
  { ticker: "BOTZ", name: "Global X Robotics & AI ETF", market: "ETF", keywords: "botz robotik yapay zeka otomasyon endüstriyel robot etf" },
  { ticker: "XLK", name: "Technology Select Sector SPDR", market: "ETF", keywords: "xlk teknoloji sektörü fonu s&p tech apple microsoft nvidia" },
  { ticker: "XLE", name: "Energy Select Sector SPDR", market: "ETF", keywords: "xle enerji sektörü petrol doğalgaz exxon chevron etf" },
  { ticker: "XLF", name: "Financial Select Sector SPDR", market: "ETF", keywords: "xlf finans bankacılık jpmorgan berkshire sigorta etf" },
  { ticker: "URA", name: "Global X Uranium ETF", market: "ETF", keywords: "ura uranyum nükleer enerji nükleer yakıt cameco etf" },
  { ticker: "GLD", name: "SPDR Gold Shares (Fiziki Altın)", market: "ETF", keywords: "gld spdr altın ons külçe değerli metal altın fonu" },
  { ticker: "SLV", name: "iShares Silver Trust (Gümüş)", market: "ETF", keywords: "slv ishares gümüş silver ons gümüş fonu metal" },
  { ticker: "TLT", name: "iShares 20+ Year Treasury Bond ETF", market: "ETF", keywords: "tlt abd uzun vadeli tahvil faiz bono sabit getiri 20y" },
  { ticker: "SGOV", name: "iShares 0-3 Month Treasury Bond ETF", market: "ETF", keywords: "sgov ishares 0-3 month treasury abd kisa vadeli hazine tahvil nakit faiz dolar kupon aylik temettu risksiz getiri bono kuru barut" },
  { ticker: "IEF", name: "iShares 7-10 Year Treasury Bond ETF", market: "ETF", keywords: "ief ishares 7-10 year treasury abd orta vadeli hazine tahvili gosterge 10y faiz bono durasyon" },
  { ticker: "SHV", name: "iShares Short Treasury Bond ETF (1Y Altı)", market: "ETF", keywords: "shv ishares short treasury abd kisa vadeli tahvil nakit faiz" },
  { ticker: "BIL", name: "SPDR Bloomberg 1-3 Month T-Bill ETF", market: "ETF", keywords: "bil t-bill hazine bonosu kisa vadeli nakit faiz abd" },
  { ticker: "BND", name: "Vanguard Total Bond Market ETF", market: "ETF", keywords: "bnd vanguard total bond aggregate tahvil piyasasi kupon" },
  { ticker: "DRAM", name: "D-RAM Bellek Teknoloji ETF", market: "ETF", keywords: "dram d-ram bellek teknoloji portföy etf" },
  { ticker: "CUSD", name: "Coinbase USD Yield ETF", market: "ETF", keywords: "cusd coinbase usd nakit getiri fonu portföy" },

  // Crypto Assets
  { ticker: "BTCUSDT", name: "Bitcoin / Tether", market: "KRİPTO", keywords: "btc btcusdt bitcoin dijital altın satoshi blokzincir btc/usdt" },
  { ticker: "ETHUSDT", name: "Ethereum / Tether", market: "KRİPTO", keywords: "eth ethusdt ethereum akıllı sözleşme defi gas ether eth/usdt" },
  { ticker: "SOLUSDT", name: "Solana / Tether", market: "KRİPTO", keywords: "sol solusdt solana l1 hızlı blokzincir nft defi sol/usdt" },
  { ticker: "BNBUSDT", name: "BNB / Tether", market: "KRİPTO", keywords: "bnb bnbusdt binance coin bsc bnb zincir kripto" },
  { ticker: "XRPUSDT", name: "Ripple / Tether", market: "KRİPTO", keywords: "xrp xrpusdt ripple transfer sınır ötesi ödeme token" },
  { ticker: "AVAXUSDT", name: "Avalanche / Tether", market: "KRİPTO", keywords: "avax avaxusdt avalanche subnet emin gün sirer token" },
  { ticker: "ADAUSDT", name: "Cardano / Tether", market: "KRİPTO", keywords: "ada adausdt cardano hoskinson blokzincir token" },
  { ticker: "DOGEUSDT", name: "Dogecoin / Tether", market: "KRİPTO", keywords: "doge dogeusdt meme coin köpek elon musk kripto" },
  { ticker: "NEARUSDT", name: "NEAR Protocol / Tether", market: "KRİPTO", keywords: "near nearusdt sharding yapay zeka user owned ai kripto" },
  { ticker: "TOTAL3", name: "Crypto Market Cap Excl. BTC & ETH", market: "KRİPTO", keywords: "total3 altcoin market cap toplam piyasa değeri btc ve eth hariç" },
  { ticker: "TOTAL", name: "Total Crypto Market Cap", market: "KRİPTO", keywords: "total kripto toplam piyasa değeri tüm kripto paralar" },
  { ticker: "OTHERS", name: "Altcoin Market Cap Excl. Top 10", market: "KRİPTO", keywords: "others altcoin market cap top 10 haric kucuk orta altcoinler asimetrik" },

  // Macro & Commodities
  { ticker: "XAUUSD", name: "Altın Spot (Ons Dolar)", market: "EMTİA", keywords: "xauusd altın ons spot gold sarı metal ons altın emtia" },
  { ticker: "XAGUSD", name: "Gümüş Spot (Ons Dolar)", market: "EMTİA", keywords: "xagusd gümüş ons spot silver metal sanayi gümüş" },
  { ticker: "UKOIL", name: "Brent Petrol (Varil)", market: "EMTİA", keywords: "ukoil brent petrol ham petrol brent oil varil varil petrol opec" },
  { ticker: "USOIL", name: "WTI Ham Petrol (ABD)", market: "EMTİA", keywords: "usoil wti petrol abd ham petrol ham petrol enerji" },
  { ticker: "NATGAS", name: "Doğalgaz (Henry Hub)", market: "EMTİA", keywords: "natgas doğal gaz henry hub lmg enerji kış tüketim" },
  { ticker: "COPPER", name: "Bakır Vadeli", market: "EMTİA", keywords: "copper bakır emtia sanayi doktor bakır ekonomik büyüme" },
  { ticker: "DXY", name: "US Dollar Index (Dolar Endeksi)", market: "MAKRO", keywords: "dxy dolar endeksi usd sepet para gücü majör pariteler fed" },
  { ticker: "VIX", name: "CBOE Volatilite Endeksi", market: "MAKRO", keywords: "vix korku endeksi volatilite oynaklık s&p 500 opsiyon" },
  { ticker: "US10Y", name: "ABD 10 Yıllık Hazine Tahvil Faizi", market: "MAKRO", keywords: "us10y tahvil faizi risksiz getiri dcf iskonto 10y bono" },
  { ticker: "US02Y", name: "ABD 2 Yıllık Tahvil Faizi", market: "MAKRO", keywords: "us02y 2 yıllık tahvil faizi fed faiz beklentisi eğri spread" },
  { ticker: "USDTRY", name: "Dolar / Türk Lirası Paritesi", market: "DÖVİZ", keywords: "usdtry dolar tl kur tcmb döviz parite türk lirası" }
];

export const searchCatalog = (query, limit = 8) => {
  if (!query || typeof query !== 'string') return [];
  const normalize = (str) => {
    return (str || '')
      .toLowerCase()
      .replace(/ğ/g, 'g')
      .replace(/ü/g, 'u')
      .replace(/ş/g, 's')
      .replace(/ı/g, 'i')
      .replace(/ö/g, 'o')
      .replace(/ç/g, 'c')
      .trim();
  };

  const q = normalize(query);
  if (!q) return [];

  const results = [];
  for (const item of SEARCH_CATALOG) {
    const t = normalize(item.ticker);
    const n = normalize(item.name);
    const k = normalize(item.keywords || '');
    let score = 0;

    if (t.startsWith(q) || t.replace('.is', '').startsWith(q)) {
      score = 100;
    } else if (t.includes(q)) {
      score = 75;
    } else if (n.startsWith(q)) {
      score = 60;
    } else if (n.includes(q)) {
      score = 50;
    } else if (k.includes(q)) {
      score = 30;
    }

    if (score > 0) {
      results.push({ score, item });
    }
  }

  results.sort((a, b) => b.score - a.score);
  return results.slice(0, limit).map(r => r.item);
};

export default function ProChartTab({ onOpenAddModal, onOpenSellModal, selectedTicker, onSelectTicker }) {
  const { portfolioSummary, holdings, currentCurrency, usdtry, marketQuotes } = useApp();
  const isTRY = currentCurrency === 'try';
  const sym = isTRY ? '₺' : '$';

  const fmt = (v, d = 2) => (Number(v) || 0).toLocaleString('tr-TR', { minimumFractionDigits: d, maximumFractionDigits: d });

  // Current active symbol on chart
  const [currentSymbol, setCurrentSymbol] = useState(() => {
    return selectedTicker || 'SPCX';
  });

  // Watchlist Active Category
  const [activeCategory, setActiveCategory] = useState('portfolio');
  const [searchQuery, setSearchQuery] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [hideHud, setHideHud] = useState(false);
  const [showFibModal, setShowFibModal] = useState(false);
  const [copiedFib, setCopiedFib] = useState(false);

  // Live Crypto Quotes Polling (Guarantees non-zero % changes for all crypto & indices)
  const [liveCryptoQuotes, setLiveCryptoQuotes] = useState({});

  useEffect(() => {
    let isCancelled = false;
    const fetchCrypto = async () => {
      try {
        const cryptoSyms = 'BTC-USD,ETH-USD,SOL-USD,LDO-USD,BIO34812-USD,SUI20947-USD,OP-USD,ARKM-USD,DOGE-USD,TOTAL,TOTAL2,TOTAL3,OTHERS,TOTALDEFI';
        const res = await fetch(`/api/market?symbols=${encodeURIComponent(cryptoSyms)}`);
        if (res.ok) {
          const json = await res.json();
          if (json.status === 'success' && json.data && !isCancelled) {
            setLiveCryptoQuotes(json.data);
          }
        }
      } catch (e) {}
    };

    fetchCrypto();
    const interval = setInterval(fetchCrypto, 25000);
    return () => {
      isCancelled = true;
      clearInterval(interval);
    };
  }, []);

  const handleCopyFibScript = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(EMA50_AUTOFIB_PINE).then(() => {
        setCopiedFib(true);
        setTimeout(() => setCopiedFib(false), 3500);
      });
    }
  };

  // Chart Timeframe Interval (15, 60, 240, D, W)
  const [chartInterval, setChartInterval] = useState(() => {
    try { return localStorage.getItem('pro_chart_interval') || 'D'; } catch { return 'D'; }
  });

  // Custom User Watchlists (Multiple lists supported)
  const [customWatchlists, setCustomWatchlists] = useState(() => {
    try {
      const saved = localStorage.getItem('pro_chart_custom_watchlists_v2');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
      // Migrate from legacy custom_watchlist_tickers
      const oldSaved = localStorage.getItem('custom_watchlist_tickers');
      const initialTickers = oldSaved ? JSON.parse(oldSaved) : ['VRT', 'ALAB', 'PLTR', 'THYAO.IS', 'TOTAL3'];
      return [
        { id: 'custom_default', name: 'Özel Listem', tickers: Array.isArray(initialTickers) ? initialTickers : ['VRT', 'ALAB', 'PLTR', 'THYAO.IS', 'TOTAL3'] }
      ];
    } catch {
      return [
        { id: 'custom_default', name: 'Özel Listem', tickers: ['VRT', 'ALAB', 'PLTR', 'THYAO.IS', 'TOTAL3'] }
      ];
    }
  });

  // Modal / Inline input states for watchlist management
  const [showNewListModal, setShowNewListModal] = useState(false);
  const [newListNameInput, setNewListNameInput] = useState('');
  const [editingListId, setEditingListId] = useState(null);
  const [editingListName, setEditingListName] = useState('');

  // Autocomplete Suggestions State
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const searchContainerRef = useRef(null);

  // Active custom list detection
  const isCustomActive = customWatchlists.some(cw => cw.id === activeCategory) || activeCategory === 'custom';
  const currentCustomList = isCustomActive 
    ? (customWatchlists.find(cw => cw.id === activeCategory) || customWatchlists[0]) 
    : null;

  // Backward-compatible tickers accessor for active custom list
  const customTickers = useMemo(() => {
    if (currentCustomList) return currentCustomList.tickers;
    return customWatchlists[0]?.tickers || [];
  }, [currentCustomList, customWatchlists]);

  // Manually added tickers specifically to Portfolio watchlist
  const [manualPortfolioTickers, setManualPortfolioTickers] = useState(() => {
    try {
      const saved = localStorage.getItem('pro_chart_manual_portfolio_tickers');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('pro_chart_manual_portfolio_tickers', JSON.stringify(manualPortfolioTickers));
    } catch (e) {}
  }, [manualPortfolioTickers]);

  // Hidden tickers in Portfolio watchlist (if user clicks remove/hide on a holding)
  const [hiddenPortfolioTickers, setHiddenPortfolioTickers] = useState(() => {
    try {
      const saved = localStorage.getItem('pro_chart_hidden_portfolio_tickers');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('pro_chart_hidden_portfolio_tickers', JSON.stringify(hiddenPortfolioTickers));
    } catch (e) {}
  }, [hiddenPortfolioTickers]);

  const [newTickerInput, setNewTickerInput] = useState('');

  // User-Configured Active Indicators for TradingView Embed
  const [activeStudies, setActiveStudies] = useState(() => {
    try {
      const saved = localStorage.getItem('pro_chart_active_studies');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {}
    return [];
  });

  // Toggle study on/off and persist
  const toggleStudy = (studyId) => {
    setActiveStudies(prev => {
      let next;
      if (prev.includes(studyId)) {
        next = prev.filter(s => s !== studyId);
      } else {
        next = [...prev, studyId];
      }
      try {
        localStorage.setItem('pro_chart_active_studies', JSON.stringify(next));
      } catch (e) {}
      return next;
    });
  };

  // Clear all studies to give 100% free quota inside TradingView
  const clearAllStudies = () => {
    setActiveStudies([]);
    try {
      localStorage.setItem('pro_chart_active_studies', JSON.stringify([]));
    } catch (e) {}
  };

  // Fullscreen State & Ref
  const chartWrapperRef = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = () => {
    if (!chartWrapperRef.current) return;
    if (!document.fullscreenElement) {
      chartWrapperRef.current.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch(err => {
        console.warn('Fullscreen error:', err);
      });
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      }).catch(err => {
        console.warn('Exit fullscreen error:', err);
      });
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const isApplyingCloudWatchlistsRef = useRef(false);

  // 1. Subscribe to Firestore custom watchlists in real-time
  useEffect(() => {
    const unsubWatchlists = onSnapshot(doc(db, 'chart_watchlists', 'custom_lists'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data && Array.isArray(data.lists) && data.lists.length > 0) {
          isApplyingCloudWatchlistsRef.current = true;
          setCustomWatchlists(data.lists);
          try {
            localStorage.setItem('pro_chart_custom_watchlists_v2', JSON.stringify(data.lists));
            if (data.lists[0]?.tickers) {
              localStorage.setItem('custom_watchlist_tickers', JSON.stringify(data.lists[0].tickers));
            }
          } catch (e) {}
        }
      } else {
        // If nothing in cloud yet, seed cloud from current state
        try {
          if (customWatchlists && customWatchlists.length > 0) {
            setDoc(doc(db, 'chart_watchlists', 'custom_lists'), {
              lists: customWatchlists,
              updatedAt: Date.now()
            }, { merge: true });
          }
        } catch (e) {}
      }
    }, (err) => {
      console.warn('Firestore watchlists subscription error:', err);
    });

    return () => unsubWatchlists();
  }, []);

  // Persist custom watchlists to local & Firestore
  useEffect(() => {
    try {
      localStorage.setItem('pro_chart_custom_watchlists_v2', JSON.stringify(customWatchlists));
      if (customWatchlists[0]?.tickers) {
        localStorage.setItem('custom_watchlist_tickers', JSON.stringify(customWatchlists[0].tickers));
      }
    } catch (err) {
      console.warn('Could not save custom watchlists', err);
    }

    if (isApplyingCloudWatchlistsRef.current) {
      isApplyingCloudWatchlistsRef.current = false;
      return;
    }

    const timer = setTimeout(() => {
      try {
        setDoc(doc(db, 'chart_watchlists', 'custom_lists'), {
          lists: customWatchlists,
          updatedAt: Date.now()
        }, { merge: true });
      } catch (e) {}
    }, 400);

    return () => clearTimeout(timer);
  }, [customWatchlists]);

  // Autocomplete filtering based on newTickerInput
  const filteredSuggestions = useMemo(() => {
    if (!newTickerInput || !newTickerInput.trim()) return [];
    return searchCatalog(newTickerInput, 8);
  }, [newTickerInput]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setShowSuggestions(false);
        setSelectedSuggestionIndex(-1);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard navigation for suggestions dropdown
  const handleInputKeyDown = (e) => {
    if (!showSuggestions || filteredSuggestions.length === 0) {
      if (e.key === 'Enter') {
        handleAddTicker(e);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedSuggestionIndex(prev => 
        prev < filteredSuggestions.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedSuggestionIndex(prev => 
        prev > 0 ? prev - 1 : filteredSuggestions.length - 1
      );
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedSuggestionIndex >= 0 && selectedSuggestionIndex < filteredSuggestions.length) {
        const item = filteredSuggestions[selectedSuggestionIndex];
        handleAddTicker(e, item.ticker);
      } else {
        handleAddTicker(e);
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      setSelectedSuggestionIndex(-1);
    }
  };

  // Sync when prop selectedTicker changes from outside
  useEffect(() => {
    if (selectedTicker && selectedTicker !== currentSymbol) {
      setCurrentSymbol(selectedTicker);
    }
  }, [selectedTicker]);

  // Create new custom watchlist
  const handleCreateWatchlist = (e) => {
    e?.preventDefault();
    const name = newListNameInput.trim();
    if (!name) return;
    const newId = 'custom_' + Date.now();
    const newList = { id: newId, name, tickers: [] };
    setCustomWatchlists(prev => [...prev, newList]);
    setActiveCategory(newId);
    setNewListNameInput('');
    setShowNewListModal(false);
  };

  // Rename custom watchlist
  const handleRenameWatchlist = (e) => {
    e?.preventDefault();
    const name = editingListName.trim();
    if (!name || !editingListId) return;
    setCustomWatchlists(prev => prev.map(wl => wl.id === editingListId ? { ...wl, name } : wl));
    setEditingListId(null);
    setEditingListName('');
  };

  // Delete custom watchlist
  const handleDeleteWatchlist = (listId) => {
    const target = customWatchlists.find(wl => wl.id === listId);
    if (!target) return;
    if (customWatchlists.length <= 1) {
      alert("En az bir özel izleme listeniz bulunmalıdır.");
      return;
    }
    if (window.confirm(`"${target.name}" izleme listesini silmek istediğinizden emin misiniz?`)) {
      const remaining = customWatchlists.filter(wl => wl.id !== listId);
      setCustomWatchlists(remaining);
      if (activeCategory === listId) {
        setActiveCategory(remaining[0].id);
      }
    }
  };

  // Handle adding ticker to either Portfolio or Custom Watchlist
  const handleAddTicker = (e, explicitTicker) => {
    e?.preventDefault();
    const targetTicker = explicitTicker || newTickerInput;
    if (!targetTicker || !targetTicker.trim()) return;
    const clean = targetTicker.trim().toUpperCase();

    if (activeCategory === 'portfolio') {
      // If was previously hidden, unhide it
      if (hiddenPortfolioTickers.includes(clean)) {
        setHiddenPortfolioTickers(prev => prev.filter(t => t !== clean));
      } else if (!manualPortfolioTickers.includes(clean)) {
        setManualPortfolioTickers(prev => [...prev, clean]);
      }
    } else if (isCustomActive && currentCustomList) {
      if (!currentCustomList.tickers.includes(clean)) {
        setCustomWatchlists(prev => prev.map(wl => 
          wl.id === currentCustomList.id 
            ? { ...wl, tickers: [...wl.tickers, clean] }
            : wl
        ));
      }
    } else {
      // If user is on a preset list (e.g. US, BIST, etc.), add to the first custom list!
      const targetList = customWatchlists[0];
      if (targetList && !targetList.tickers.includes(clean)) {
        setCustomWatchlists(prev => prev.map(wl => 
          wl.id === targetList.id 
            ? { ...wl, tickers: [...wl.tickers, clean] }
            : wl
        ));
      }
    }

    // Automatically navigate chart to this symbol!
    setCurrentSymbol(clean);
    if (onSelectTicker) onSelectTicker(clean);

    setNewTickerInput('');
    setShowSuggestions(false);
    setSelectedSuggestionIndex(-1);
  };

  // Handle removing ticker
  const handleRemoveTicker = (item) => {
    const clean = (item.ticker || '').toUpperCase().trim();
    if (activeCategory === 'portfolio') {
      if (item.isManual) {
        setManualPortfolioTickers(prev => prev.filter(t => t !== clean));
      } else {
        const raw = (item.rawTicker || '').toUpperCase().trim();
        setHiddenPortfolioTickers(prev => [...new Set([...prev, clean, raw])]);
      }
    } else if (isCustomActive && currentCustomList) {
      setCustomWatchlists(prev => prev.map(wl => 
        wl.id === currentCustomList.id 
          ? { ...wl, tickers: wl.tickers.filter(t => t !== clean) }
          : wl
      ));
    }
  };

  // Handle quick-adding ticker from presets (us_stocks, bist, crypto, etf) to Custom Watchlist
  const handleQuickAddTicker = (tickerToAdd) => {
    const clean = (tickerToAdd || '').toUpperCase().trim();
    if (!clean) return;
    const targetCustom = currentCustomList || customWatchlists[0];
    if (targetCustom) {
      if (targetCustom.tickers.includes(clean)) {
        setCustomWatchlists(prev => prev.map(wl => 
          wl.id === targetCustom.id 
            ? { ...wl, tickers: wl.tickers.filter(t => t !== clean) }
            : wl
        ));
      } else {
        setCustomWatchlists(prev => prev.map(wl => 
          wl.id === targetCustom.id 
            ? { ...wl, tickers: [...wl.tickers, clean] }
            : wl
        ));
      }
    }
  };

  // Reset portfolio watchlist (restore hidden holdings)
  const handleResetPortfolioWatchlist = () => {
    setHiddenPortfolioTickers([]);
    setManualPortfolioTickers([]);
  };

  const handleRemoveCustomTicker = (tickerToRemove) => {
    setCustomTickers(prev => prev.filter(t => t !== tickerToRemove));
  };

  // Extract clean ticker
  const cleanActiveTicker = useMemo(() => {
    if (!currentSymbol) return 'SPCX';
    let s = currentSymbol;
    if (s.includes(':')) s = s.split(':')[1];
    return s.trim().toUpperCase();
  }, [currentSymbol]);

  // Check if active symbol is a BIST stock
  const isBistStock = useMemo(() => {
    const rawClean = cleanActiveTicker.replace('.IS', '');
    const bistList = [
      'BYDNR', 'TUPRS', 'THYAO', 'ASELS', 'EREGL', 'KCHOL', 'BIMAS', 'SISE', 
      'FROTO', 'ASTOR', 'SAHOL', 'GARAN', 'AKBNK', 'YKBNK', 'ISCTR', 'PGSUS', 
      'TCELL', 'PETKM', 'TTKOM', 'ENKAI', 'KOZAL', 'SASA', 'HEKTS', 'KONTR',
      'AGROT', 'AHGAZ', 'AKCNS', 'AKFGY', 'AKFYE', 'ALARK', 'ALBRK', 'ALFAS', 'ARCLK', 
      'ARDYZ', 'BERA', 'BFREN', 'BRSAN', 'BRYAT', 'BSOKE', 'BTCIM', 'CANTE', 'CCOLA', 
      'CIMSA', 'CWENE', 'DOAS', 'DOHOL', 'ECILC', 'ECZYT', 'EGEEN', 'EKGYO', 'ENERY', 
      'ENJSA', 'EUPWR', 'EUREN', 'GESAN', 'GLYHO', 'GOLTS', 'GSDHO', 'GUBRF', 'GWIND', 
      'HALKB', 'IPEKE', 'ISDMR', 'ISGYO', 'ISMEN', 'IZMDC', 'KARSN', 'KAYSE', 'KCAER', 
      'KMPUR', 'KONYA', 'KORDS', 'KOZAA', 'KRDMD', 'MAVI', 'MGROS', 'MIATK', 'ODAS', 
      'OTKAR', 'OYAKC', 'PASEU', 'PENTA', 'QUAGR', 'REEDR', 'SDTTR', 'SKBNK', 'SMRTG', 
      'SOKM', 'TABGD', 'TARKM', 'TATEN', 'TAVHL', 'TKFEN', 'TOASO', 'TRGYO', 'TSKB', 
      'TTRAK', 'ULKER', 'VAKBN', 'VESBE', 'VESTL', 'YEOTK', 'YYLGD', 'ZOREN'
    ];
    return cleanActiveTicker.endsWith('.IS') || bistList.includes(rawClean);
  }, [cleanActiveTicker]);

  // Direct TradingView web link (opens symbol with full Pine Editor on tradingview.com)
  const tvExternalUrl = useMemo(() => {
    const sym = getTradingViewSymbol(currentSymbol);
    return `https://www.tradingview.com/chart/?symbol=${encodeURIComponent(sym)}`;
  }, [currentSymbol]);

  // Find portfolio items directly from user's current holdings
  const portfolioItems = useMemo(() => {
    const activeHoldings = (portfolioSummary?.enrichedHoldings && portfolioSummary.enrichedHoldings.length > 0)
      ? portfolioSummary.enrichedHoldings
      : (holdings && holdings.length > 0 ? holdings : []);

    const items = [];

    // 1) Add all active holdings from actual portfolio
    if (activeHoldings.length > 0) {
      activeHoldings.forEach(h => {
        const rawTicker = (h.ticker || '').toUpperCase().trim();
        if (!rawTicker) return;

        // Skip if hidden by user
        if (hiddenPortfolioTickers.includes(rawTicker)) return;

        let clean = rawTicker;
        if (h.clean_ticker) {
          clean = h.clean_ticker.toUpperCase().trim();
        } else if (h.type === 'Hisse' && h.currency === 'TRY' && !clean.endsWith('.IS')) {
          clean = `${clean}.IS`;
        }

        if (hiddenPortfolioTickers.includes(clean)) return;

        const tvSym = getTradingViewSymbol(clean || rawTicker);
        const shares = Number(h.shares || 0);
        const costBasis = Number(h.avg_cost ?? h.costBasis ?? h.avgPrice ?? 0);
        const curr = (h.currency === 'TRY' || clean.endsWith('.IS')) ? '₺' : '$';
        const price = Number(h.livePrice ?? h.currentPrice ?? h.current_price ?? 0);
        const retPct = Number(h.returnPct ?? 0);

        items.push({
          ticker: clean,
          rawTicker,
          name: h.name || clean,
          desc: `${shares > 0 ? fmt(shares, shares < 1 ? 4 : 2) + ' Lot • ' : ''}Maliyet: ${curr}${fmt(costBasis, 2)}`,
          tv: tvSym,
          isHolding: true,
          type: h.type || 'Portföy',
          shares,
          avgPrice: costBasis,
          currentPrice: price,
          returnPct: retPct,
          isManual: false
        });
      });
    }

    // 2) If physical gold is in portfolio (totalGrams > 0)
    if (portfolioSummary?.totalGrams > 0 && !hiddenPortfolioTickers.includes('XAUUSD')) {
      items.push({
        ticker: 'XAUUSD',
        rawTicker: 'XAUUSD',
        name: 'Gram Altın (Fiziki)',
        desc: `${fmt(portfolioSummary.totalGrams, 2)} Gr • Portföy Fiziki Altın`,
        tv: 'OANDA:XAUUSD',
        isHolding: true,
        type: 'Altın',
        shares: portfolioSummary.totalGrams,
        currentPrice: portfolioSummary.gramGoldPrice || 0,
        returnPct: portfolioSummary.goldReturnPct || 0,
        isManual: false
      });
    }

    // 3) Fallback if portfolio is completely empty
    if (items.length === 0 && (!activeHoldings || activeHoldings.length === 0)) {
      items.push(
        { ticker: 'SPCX', rawTicker: 'SPCX', name: 'Space Exploration Tech Corp', desc: 'Portföy ABD Hissesi • 2.22 Lot', tv: 'SPCX', isHolding: true, type: 'ABD Hisse', isManual: false },
        { ticker: 'BYDNR.IS', rawTicker: 'BYDNR', name: 'Baydöner Restoranları', desc: 'Portföy BIST Hissesi • 10.00 Lot', tv: 'BIST:BYDNR', isHolding: true, type: 'BIST 100', isManual: false },
        { ticker: 'DRAM', rawTicker: 'DRAM', name: 'D-RAM Bellek Teknoloji ETF', desc: 'Portföy Fonu • 5.00 Lot', tv: 'DRAM', isHolding: true, type: 'ETF', isManual: false },
        { ticker: 'ETH-USD', rawTicker: 'ETH-USD', name: 'Ethereum', desc: 'Portföy Kripto Varlığı', tv: 'BINANCE:ETHUSDT', isHolding: true, type: 'Kripto', isManual: false },
        { ticker: 'BTC-USD', rawTicker: 'BTC-USD', name: 'Bitcoin', desc: 'Portföy Kripto Varlığı', tv: 'BINANCE:BTCUSDT', isHolding: true, type: 'Kripto', isManual: false },
        { ticker: 'LDO-USD', rawTicker: 'LDO', name: 'Lido DAO Token', desc: 'Portföy Kripto Varlığı', tv: 'BINANCE:LDOUSDT', isHolding: true, type: 'Kripto', isManual: false },
        { ticker: 'BIO34812-USD', rawTicker: 'BIO', name: 'Bio Protocol', desc: 'Portföy Kripto Varlığı', tv: 'MEXC:BIO_USDT', isHolding: true, type: 'Kripto', isManual: false }
      );
    }

    // 4) Add user's manual portfolio tickers
    manualPortfolioTickers.forEach(t => {
      const cleanT = t.toUpperCase().trim();
      if (!items.some(it => it.ticker.toUpperCase() === cleanT || it.rawTicker?.toUpperCase() === cleanT)) {
        const tv = getTradingViewSymbol(cleanT);
        const name = stocksData[cleanT]?.name || potentialStocksData[cleanT]?.name || cleanT;
        items.push({
          ticker: cleanT,
          rawTicker: cleanT,
          name,
          desc: 'Manuel Eklenen Varlık',
          tv,
          isHolding: false,
          type: 'Manuel',
          isManual: true
        });
      }
    });

    return items;
  }, [portfolioSummary, holdings, manualPortfolioTickers, hiddenPortfolioTickers]);

  // Live Price and +/- % Change lookup
  const getItemPriceAndChange = (item) => {
    const rawTicker = (item.ticker || '').toUpperCase().trim();
    const clean = rawTicker.replace('.IS', '').replace('USDT', '').replace('-USD', '');

    // Search order for quotes: liveCryptoQuotes -> marketQuotes
    const allQuotes = { ...marketQuotes, ...liveCryptoQuotes };

    const keysToTry = [
      rawTicker,
      item.ticker,
      clean,
      `${clean}USDT`,
      `${clean}-USD`,
      `${clean}USD`,
      `${clean}.IS`
    ];

    // Special crypto symbol aliases
    if (clean === 'BIO') keysToTry.push('BIO34812-USD', 'BIO-USD');
    if (clean === 'SUI') keysToTry.push('SUI20947-USD', 'SUI-USD');
    if (clean === 'LDO') keysToTry.push('LDO-USD');
    if (clean === 'DOGE') keysToTry.push('DOGE-USD');
    if (clean === 'ARKM') keysToTry.push('ARKM-USD');
    if (clean === 'OP') keysToTry.push('OP-USD');
    if (clean === 'SOL') keysToTry.push('SOL-USD');
    if (clean === 'ETH') keysToTry.push('ETH-USD');
    if (clean === 'BTC') keysToTry.push('BTC-USD');

    const matchKey = keysToTry.find(k => allQuotes[k] && (allQuotes[k].price !== undefined || allQuotes[k].regularMarketPrice !== undefined));

    if (matchKey) {
      const q = allQuotes[matchKey];
      const p = Number(q.price ?? q.regularMarketPrice ?? 0);
      const c = Number(q.changePct ?? q.changePercent ?? q.regularMarketChangePercent ?? 0);
      return { 
        price: p, 
        changePct: c, 
        currency: q.currency || (rawTicker.endsWith('.IS') ? 'TRY' : 'USD'),
        formattedPrice: q.label || (rawTicker.startsWith('TOTAL') ? q.label : undefined)
      };
    }

    // Fallback to user holding currentPrice & returnPct
    if (item.currentPrice) {
      return { 
        price: Number(item.currentPrice), 
        changePct: Number(item.returnPct || 0), 
        currency: item.type?.includes('BIST') ? 'TRY' : 'USD' 
      };
    }

    // Fallback to stocksData
    const s = stocksData[clean] || stocksData[rawTicker];
    if (s && s.price) {
      const liveP = Number(s.price.live ?? s.price.current ?? 0);
      const changeP = Number(s.price.changePercent ?? s.price.dayChangePct ?? 0);
      return { price: liveP, changePct: changeP, currency: s.currency || 'USD' };
    }

    // Fallback to potentialStocksData
    const pStock = potentialStocksData[clean] || potentialStocksData[rawTicker];
    if (pStock && pStock.price) {
      return { 
        price: Number(pStock.price.current ?? 0), 
        changePct: Number(pStock.price.dayChangePct ?? pStock.price.changePercent ?? 0), 
        currency: pStock.currency || 'USD' 
      };
    }

    // Fallback to benchmarkData
    if (benchmarkData && (benchmarkData[clean] || benchmarkData[rawTicker])) {
      const b = benchmarkData[clean] || benchmarkData[rawTicker];
      return { price: Number(b.value || 0), changePct: Number(b.change || 0), currency: 'USD' };
    }

    // Fallbacks for macro indicators
    if (rawTicker === 'DXY') return { price: 104.25, changePct: 0.12, currency: 'USD', formattedPrice: '104.25' };
    if (rawTicker === 'VIX') return { price: 14.80, changePct: -1.35, currency: 'USD', formattedPrice: '14.80' };
    if (rawTicker === 'BRENT') return { price: 78.40, changePct: 0.65, currency: 'USD', formattedPrice: '$78.40' };
    if (rawTicker === 'US10Y') return { price: 4.28, changePct: -0.45, currency: 'USD', formattedPrice: '%4.28' };
    if (rawTicker === 'US02Y') return { price: 4.15, changePct: -0.25, currency: 'USD', formattedPrice: '%4.15' };
    if (rawTicker === 'XAUUSD') return { price: 2740.00, changePct: 0.38, currency: 'USD', formattedPrice: '$2,740' };
    if (rawTicker === 'USDTRY') return { price: 34.25, changePct: 0.15, currency: 'TRY', formattedPrice: '34.25₺' };
    if (rawTicker === 'TOTAL') return { price: 2.84, changePct: 1.45, currency: 'USD', formattedPrice: '$2.84T' };
    if (rawTicker === 'TOTAL2') return { price: 1.26, changePct: 1.82, currency: 'USD', formattedPrice: '$1.26T' };
    if (rawTicker === 'TOTAL3') return { price: 748.5, changePct: 2.65, currency: 'USD', formattedPrice: '$748.5B' };
    if (rawTicker === 'OTHERS') return { price: 298.2, changePct: 3.15, currency: 'USD', formattedPrice: '$298.2B' };
    if (rawTicker === 'TOTALDEFI') return { price: 94.1, changePct: 1.90, currency: 'USD', formattedPrice: '$94.1B' };

    // Crypto static fallbacks with active realistic percentages
    const cryptoFallback = {
      'BTCUSDT': { price: 84629.38, changePct: -1.91 },
      'ETHUSDT': { price: 2684.38, changePct: -2.12 },
      'SOLUSDT': { price: 158.40, changePct: 1.65 },
      'LDOUSDT': { price: 0.445, changePct: -2.10 },
      'BIOUSDT': { price: 0.0306, changePct: -1.20 },
      'SUIUSDT': { price: 1.95, changePct: 0.80 },
      'OPUSDT': { price: 1.25, changePct: -0.50 },
      'ARKMUSDT': { price: 1.10, changePct: 0.30 },
      'DOGEUSDT': { price: 0.182, changePct: 1.10 }
    }[rawTicker];

    if (cryptoFallback) {
      return { price: cryptoFallback.price, changePct: cryptoFallback.changePct, currency: 'USD' };
    }

    return { price: 0, changePct: 0, currency: 'USD' };
  };

  // Active Watchlist Items according to selected category and search
  const currentWatchlistItems = useMemo(() => {
    let list = [];
    if (activeCategory === 'portfolio') {
      list = portfolioItems;
    } else if (activeCategory === 'us_stocks') {
      list = PRESET_WATCHLISTS.us_stocks;
    } else if (activeCategory === 'etf') {
      list = PRESET_WATCHLISTS.etf;
    } else if (activeCategory === 'bist') {
      list = PRESET_WATCHLISTS.bist;
    } else if (activeCategory === 'crypto') {
      list = PRESET_WATCHLISTS.crypto;
    } else if (activeCategory === 'macro') {
      list = PRESET_WATCHLISTS.macro;
    } else if (isCustomActive && currentCustomList) {
      list = currentCustomList.tickers.map(t => {
        const tv = getTradingViewSymbol(t);
        const name = stocksData[t]?.name || potentialStocksData[t]?.name || t;
        return { ticker: t, name, desc: `${currentCustomList.name} Varlığı`, tv };
      });
    }

    if (!searchQuery.trim()) return list;

    const q = searchQuery.toLowerCase().trim();
    return list.filter(item => 
      (item.ticker && item.ticker.toLowerCase().includes(q)) ||
      (item.name && item.name.toLowerCase().includes(q)) ||
      (item.desc && item.desc.toLowerCase().includes(q))
    );
  }, [activeCategory, portfolioItems, isCustomActive, currentCustomList, searchQuery, stocksData, potentialStocksData]);

  // Find user's holding data if they own this stock (robust across BIST, US, and Crypto aliases)
  const activeHolding = useMemo(() => {
    function normalizeTicker(t) {
      if (!t) return '';
      let s = String(t).toUpperCase().trim();
      if (s.includes(':')) s = s.split(':')[1];
      s = s.replace('.IS', '');
      if (s.endsWith('USDT')) s = s.slice(0, -4);
      if (s.endsWith('-USD')) s = s.slice(0, -4);
      if (s.endsWith('USD') && !s.includes('-') && !s.includes('=')) s = s.slice(0, -3);
      return s;
    }

    const baseTarget = normalizeTicker(cleanActiveTicker);
    const all = (portfolioSummary?.enrichedHoldings && portfolioSummary.enrichedHoldings.length > 0)
      ? portfolioSummary.enrichedHoldings
      : (holdings || []);

    const match = all.find(h => {
      const hTicker = (h.ticker || '').toUpperCase().trim();
      const hClean = (h.clean_ticker || hTicker).toUpperCase().trim();
      const hCleanTicker = (h.cleanTicker || '').toUpperCase().trim();
      return normalizeTicker(hTicker) === baseTarget || 
             normalizeTicker(hClean) === baseTarget || 
             normalizeTicker(hCleanTicker) === baseTarget;
    });

    if (!match) return null;

    // Currency normalization for the chart:
    // If isBistStock, chart is quoted in TRY.
    // If Crypto or US, chart is quoted in USD.
    const isTRYChart = isBistStock;
    const rate = Number(match.cost_rate) > 1.5 ? Number(match.cost_rate) : (usdtry || 49.03);

    let unitCostTRY = 0;
    let unitCostUSD = 0;

    if (match.isHoldingUSD || match.currency === 'USD') {
      unitCostUSD = (match.costUSD && match.shares) ? (match.costUSD / match.shares) : (match.avg_cost || match.costBasis || match.avgPrice || 0);
      unitCostTRY = unitCostUSD * rate;
    } else {
      unitCostTRY = (match.costTRY && match.shares) ? (match.costTRY / match.shares) : (match.avg_cost || match.costBasis || match.avgPrice || 0);
      unitCostUSD = rate > 0 ? (unitCostTRY / rate) : 0;
    }

    const chartUnitCost = isTRYChart ? unitCostTRY : unitCostUSD;
    const chartCurrency = isTRYChart ? 'TRY' : 'USD';
    const chartSymMark = isTRYChart ? '₺' : '$';

    return {
      ...match,
      unitCostTRY,
      unitCostUSD,
      chartUnitCost,
      chartCurrency,
      chartSymMark,
      holdingCost: chartUnitCost,
      shares: match.shares || match.quantity || 0,
      returnPct: match.returnPct !== undefined ? match.returnPct : 0
    };
  }, [portfolioSummary, holdings, cleanActiveTicker, isBistStock, usdtry]);

  // Portfolio Buy Zone & Valuation Analysis
  const buyZoneAnalysis = useMemo(() => {
    const rawClean = cleanActiveTicker.replace('.IS', '');
    const sData = stocksData[cleanActiveTicker] || stocksData[rawClean] || potentialStocksData[cleanActiveTicker] || potentialStocksData[rawClean];
    const hasHolding = !!activeHolding;
    const holdingCost = activeHolding ? activeHolding.chartUnitCost : null;
    const holdingCurrency = activeHolding ? activeHolding.chartCurrency : (sData?.currency || (isBistStock ? 'TRY' : 'USD'));
    const symMark = activeHolding ? activeHolding.chartSymMark : (holdingCurrency === 'TRY' ? '₺' : '$');

    const livePrice = activeHolding?.currentPrice || sData?.price?.current || 100;
    const fairValue = sData?.valuation?.targetPrice || sData?.dcfValuation?.fairValue || (livePrice * 1.25);
    const quantScore = sData?.quantScore || sData?.score || null;

    const low52w = sData?.price?.low52 || (livePrice * 0.75);
    const buyZoneMin = sData?.valuation?.supportRange?.min || (low52w * 1.05);
    const buyZoneMax = sData?.valuation?.supportRange?.max || (fairValue * 0.85);

    let zoneStatus = 'neutral';
    let zoneBadge = 'BEKLE / İZLE';
    let zoneColor = '#94a3b8';
    let zoneAdvice = 'Fiyat dengeli bantta işlem görüyor.';

    if (livePrice <= buyZoneMax) {
      zoneStatus = 'strong_buy';
      zoneBadge = '🟢 GÜÇLÜ ALIM BÖLGESİ';
      zoneColor = '#10b981';
      zoneAdvice = `Fiyat adil değerin altında (${symMark}${fmt(buyZoneMin, 2)} - ${symMark}${fmt(buyZoneMax, 2)} aralığında). Kademeli alım için cazip seviyede.`;
    } else if (livePrice > fairValue * 1.1) {
      zoneStatus = 'overvalued';
      zoneBadge = '🔴 HEDEF / DİRENÇ BÖLGESİ';
      zoneColor = '#ef4444';
      zoneAdvice = `Fiyat adil değer seviyesine ulaşmış. Yeni alım için geri çekilmeler beklenebilir.`;
    } else {
      zoneAdvice = 'TradingView göstergeleri ve teknik destek/direnç seviyelerini grafik üzerinden takip edebilirsiniz.';
    }

    return {
      hasHolding,
      holdingCost,
      holdingCurrency,
      symMark,
      livePrice,
      fairValue,
      quantScore,
      low52w,
      buyZoneMin,
      buyZoneMax,
      zoneStatus,
      zoneBadge,
      zoneColor,
      zoneAdvice
    };
  }, [cleanActiveTicker, activeHolding]);

  // Real-Time Session Countdown Timer Hook
  const [sessionTimer, setSessionTimer] = useState({
    status: 'open',
    market: '',
    badge: '',
    text: '',
    timeStr: ''
  });

  useEffect(() => {
    const updateTimer = () => {
      const now = new Date();
      const day = now.getDay(); // 0 Sun, 6 Sat
      const h = now.getHours();
      const m = now.getMinutes();
      const s = now.getSeconds();
      const nowSecs = h * 3600 + m * 60 + s;
      const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;

      const sym = (currentSymbol || '').toUpperCase();
      const isBist = sym.endsWith('.IS') || isBistStock;
      const isCrypto = sym.includes('BTC') || sym.includes('ETH') || sym.includes('TOTAL') || sym.includes('USDT') || ['SOL', 'LDO', 'BIO', 'SUI', 'OP', 'ARKM', 'DOGE'].includes(cleanActiveTicker);

      if (isCrypto) {
        setSessionTimer({
          status: 'open',
          market: 'KRİPTO',
          badge: '🟢 7/24 CANLI SEANS',
          text: `Kesintisiz Piyasa • TSİ ${timeStr}`,
          timeStr
        });
        return;
      }

      const isWeekend = day === 0 || day === 6;

      if (isBist) {
        if (isWeekend) {
          setSessionTimer({
            status: 'closed',
            market: 'BIST',
            badge: '🔴 BORSA KAPALI',
            text: 'Hafta Sonu • Pazartesi 09:55 Açılış',
            timeStr
          });
          return;
        }
        const openSecs = 10 * 3600;
        const closeSecs = 18 * 3600 + 10 * 60;
        if (nowSecs < openSecs) {
          const diff = openSecs - nowSecs;
          const dh = Math.floor(diff / 3600);
          const dm = Math.floor((diff % 3600) / 60);
          const ds = diff % 60;
          setSessionTimer({
            status: 'pre',
            market: 'BIST',
            badge: '🟡 SEANS ÖNCESİ',
            text: `Açılışa: ${String(dh).padStart(2, '0')}:${String(dm).padStart(2, '0')}:${String(ds).padStart(2, '0')}`,
            timeStr
          });
        } else if (nowSecs < closeSecs) {
          const diff = closeSecs - nowSecs;
          const dh = Math.floor(diff / 3600);
          const dm = Math.floor((diff % 3600) / 60);
          const ds = diff % 60;
          setSessionTimer({
            status: 'open',
            market: 'BIST',
            badge: '🟢 SEANS AÇIK',
            text: `Kapanışa (18:10): ${String(dh).padStart(2, '0')}:${String(dm).padStart(2, '0')}:${String(ds).padStart(2, '0')}`,
            timeStr
          });
        } else {
          setSessionTimer({
            status: 'closed',
            market: 'BIST',
            badge: '🔴 SEANS KAPANDI',
            text: 'Yarın 09:55 Seans Başlar',
            timeStr
          });
        }
        return;
      }

      // Default: Wall Street (US NYSE / NASDAQ)
      if (isWeekend) {
        setSessionTimer({
          status: 'closed',
          market: 'WALL STREET',
          badge: '🔴 SEANS KAPALI',
          text: 'Hafta Sonu • Pazartesi 16:30',
          timeStr
        });
        return;
      }
      const openSecs = 16 * 3600 + 30 * 60;
      const closeSecs = 23 * 3600;
      if (nowSecs < openSecs) {
        const diff = openSecs - nowSecs;
        const dh = Math.floor(diff / 3600);
        const dm = Math.floor((diff % 3600) / 60);
        const ds = diff % 60;
        setSessionTimer({
          status: 'pre',
          market: 'WALL STREET',
          badge: '🟡 PRE-MARKET',
          text: `Açılış Çanına (16:30): ${String(dh).padStart(2, '0')}:${String(dm).padStart(2, '0')}:${String(ds).padStart(2, '0')}`,
          timeStr
        });
      } else if (nowSecs < closeSecs) {
        const diff = closeSecs - nowSecs;
        const dh = Math.floor(diff / 3600);
        const dm = Math.floor((diff % 3600) / 60);
        const ds = diff % 60;
        setSessionTimer({
          status: 'open',
          market: 'WALL STREET',
          badge: '🟢 SEANS AÇIK',
          text: `Kapanış Çanına (23:00): ${String(dh).padStart(2, '0')}:${String(dm).padStart(2, '0')}:${String(ds).padStart(2, '0')}`,
          timeStr
        });
      } else {
        setSessionTimer({
          status: 'closed',
          market: 'WALL STREET',
          badge: '🔴 AFTER-HOURS',
          text: 'Yarın Açılış: 16:30',
          timeStr
        });
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [currentSymbol, isBistStock, cleanActiveTicker]);



  return (
    <div className="tab-pane-content" style={{ animation: 'fadeIn 0.25s ease', display: 'flex', flexDirection: 'column', gap: 10 }}>
      
      {/* 🌟 Top Pro Header Bar with Real-Time Session Countdown Timer */}
      <div 
        className="card" 
        style={{ 
          padding: '10px 16px', 
          background: 'linear-gradient(135deg, rgba(8, 12, 22, 0.95), rgba(15, 23, 42, 0.95))', 
          border: '1px solid rgba(0, 229, 255, 0.25)', 
          borderRadius: 8,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 10
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(0, 229, 255, 0.12)', border: '1px solid rgba(0, 229, 255, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--cyan)' }}>
            <LineChart size={18} />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 13, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>PRO GRAFİK & TEKNİK ANALİZ İSTASYONU</span>
              <span className="nav-badge cyan" style={{ fontSize: 9 }}>
                BAĞIMSIZ YEREL MOTOR • KALICI ÇİZİM
              </span>
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
              BIST, ABD, Tahviller & Kriptolar • Sınırsız İndikatörler • Asla Silinmeyen Çizimler • Portföy Maliyet Çizgisi
            </div>
          </div>
        </div>

        {/* ⏱️ LIVE SESSION COUNTDOWN BADGE & QUICK CONTROLS */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          
          {/* Seans Geri Sayacı Rozeti */}
          <div 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 6, 
              background: sessionTimer.status === 'open' 
                ? 'rgba(16, 185, 129, 0.12)' 
                : sessionTimer.status === 'pre' 
                ? 'rgba(245, 158, 11, 0.12)' 
                : 'rgba(239, 68, 68, 0.12)',
              border: `1px solid ${sessionTimer.status === 'open' ? 'rgba(16, 185, 129, 0.35)' : sessionTimer.status === 'pre' ? 'rgba(245, 158, 11, 0.35)' : 'rgba(239, 68, 68, 0.35)'}`,
              borderRadius: 6,
              padding: '4px 10px'
            }}
            title={`${sessionTimer.market} Piyasası Seans Durumu`}
          >
            <Clock size={13} className={sessionTimer.status === 'open' ? 'text-emerald' : sessionTimer.status === 'pre' ? 'text-amber' : 'text-rose'} />
            <span className="mono font-bold" style={{ fontSize: 10.5, color: sessionTimer.status === 'open' ? '#34d399' : sessionTimer.status === 'pre' ? '#fbbf24' : '#f87171' }}>
              {sessionTimer.badge}
            </span>
            <span style={{ fontSize: 10.5, color: '#e2e8f0' }}>
              {sessionTimer.text}
            </span>
          </div>

          {/* 📐 EMA 50 & Auto Fib Pine Script Modal Button */}
          <button
            type="button"
            onClick={() => setShowFibModal(true)}
            className="chip-btn"
            style={{ 
              fontSize: 10, 
              padding: '4px 9px', 
              display: 'flex', 
              alignItems: 'center', 
              gap: 4,
              background: 'rgba(99, 102, 241, 0.15)',
              borderColor: 'rgba(99, 102, 241, 0.5)',
              color: '#c7d2fe',
              fontWeight: 700
            }}
            title="TradingView tek kota kullanan EMA 50 & Ayarlanabilir Otomatik Fibonacci Pine Script Kodunu Al"
          >
            <span>📐 EMA 50 & Auto Fib</span>
          </button>

          {/* 🌐 TradingView Web Site Link (Pine Editor) */}
          <a
            href={tvExternalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="chip-btn"
            style={{ 
              fontSize: 10, 
              padding: '4px 9px', 
              display: 'flex', 
              alignItems: 'center', 
              gap: 4,
              background: 'rgba(59, 130, 246, 0.12)',
              borderColor: 'rgba(59, 130, 246, 0.45)',
              color: '#93c5fd',
              textDecoration: 'none',
              fontWeight: 600
            }}
            title="Çizimlerinizi, trend çizgilerinizi ve grafik düzeninizi kalıcı olarak saklamak için resmi sitede açın (TradingView hesabınızda otomatik kaydedilir)"
          >
            <ExternalLink size={12} />
            <span>TradingView'de Aç</span>
          </a>

          {/* ⛶ Real True Fullscreen Button */}
          <button
            type="button"
            onClick={toggleFullscreen}
            className="chip-btn"
            style={{ 
              fontSize: 10, 
              padding: '4px 9px', 
              display: 'flex', 
              alignItems: 'center', 
              gap: 4,
              background: 'rgba(0, 229, 255, 0.1)',
              borderColor: 'var(--cyan)',
              color: 'var(--cyan)',
              fontWeight: 700
            }}
            title="Grafiği tüm ekrana yay (F11 / Native Fullscreen)"
          >
            {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
            <span>{isFullscreen ? 'Küçült' : '⛶ Tam Ekran'}</span>
          </button>

          {/* Toggle Watchlist Sidebar Button */}
          <button
            type="button"
            onClick={() => setSidebarOpen(prev => !prev)}
            className="chip-btn"
            style={{ 
              fontSize: 10, 
              padding: '4px 8px', 
              display: 'flex', 
              alignItems: 'center', 
              gap: 4,
              background: sidebarOpen ? 'rgba(0, 229, 255, 0.12)' : 'transparent',
              borderColor: sidebarOpen ? 'var(--cyan)' : 'rgba(255,255,255,0.1)'
            }}
            title={sidebarOpen ? 'İzleme Listesini Gizle (Geniş Grafik)' : 'İzleme Listesini Aç'}
          >
            <Layers size={13} className="text-cyan" />
            <span>{sidebarOpen ? 'Listeyi Kapat' : 'İzleme Listesi'}</span>
          </button>
        </div>
      </div>



      {/* 🎯 PORTFÖY ALIM BÖLGESİ HUD'U */}
      {!hideHud && (
        <div 
          className="card" 
          style={{ 
            padding: '8px 14px', 
            background: buyZoneAnalysis.hasHolding
              ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.12), rgba(6, 78, 59, 0.22))' 
              : 'linear-gradient(135deg, rgba(30, 41, 59, 0.7), rgba(15, 23, 42, 0.8))', 
            border: buyZoneAnalysis.hasHolding 
              ? '1px solid rgba(16, 185, 129, 0.45)' 
              : '1px solid rgba(0, 229, 255, 0.25)', 
            borderRadius: 6,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 10,
            marginBottom: 2,
            position: 'relative',
            zIndex: 10
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 16 }}>{buyZoneAnalysis.hasHolding ? '💼' : '🎯'}</span>
            
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
              <strong className="mono text-bright" style={{ fontSize: 13 }}>
                {cleanActiveTicker}
              </strong>
              
              {buyZoneAnalysis.hasHolding && (
                <>
                  <span className="badge-type hisse" style={{ fontSize: 8.5 }}>
                    Portföyde ({buyZoneAnalysis.hasHolding ? `${activeHolding.shares} Lot` : ''})
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    Alım Maliyetiniz: <strong className="mono text-bright">{buyZoneAnalysis.symMark}{fmt(buyZoneAnalysis.holdingCost, 2)}</strong>
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    Canlı: <strong className="mono text-cyan">{buyZoneAnalysis.symMark}{fmt(buyZoneAnalysis.livePrice, 2)}</strong>
                  </span>
                  {activeHolding.returnPct !== undefined && (
                    <span style={{ fontSize: 11, color: activeHolding.returnPct >= 0 ? 'var(--up)' : 'var(--down)', fontWeight: 700 }}>
                      K/Z: {activeHolding.returnPct >= 0 ? '+' : ''}{fmt(activeHolding.returnPct, 2)}%
                    </span>
                  )}
                </>
              )}

              {/* Buy Zone Status Badge */}
              <span 
                className="nav-badge" 
                style={{ 
                  fontSize: 9.5, 
                  padding: '2px 8px', 
                  backgroundColor: `${buyZoneAnalysis.zoneColor}22`,
                  borderColor: buyZoneAnalysis.zoneColor,
                  color: buyZoneAnalysis.zoneColor,
                  fontWeight: 700
                }}
              >
                {buyZoneAnalysis.zoneBadge}
              </span>
            </div>

            {/* Strategic Advice Subtext */}
            <div style={{ width: '100%', fontSize: 10, color: 'var(--text-muted)', marginTop: -2, paddingLeft: 26 }}>
              <span>{buyZoneAnalysis.zoneAdvice}</span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {buyZoneAnalysis.quantScore && (
              <span className="nav-badge emerald" style={{ fontSize: 9.5, padding: '2px 7px' }}>
                Quant: {buyZoneAnalysis.quantScore.toFixed(0)}
              </span>
            )}
            <button
              type="button"
              className="btn-action-row buy"
              onClick={() => onOpenAddModal && onOpenAddModal(cleanActiveTicker)}
              style={{ fontSize: 10, padding: '3px 9px' }}
              title="Bu varlıktan ek alım yap"
            >
              + Alım Yap
            </button>
            {buyZoneAnalysis.hasHolding && (
              <button
                type="button"
                className="btn-action-row sell"
                onClick={() => onOpenSellModal && onOpenSellModal(activeHolding)}
                style={{ fontSize: 10, padding: '3px 9px' }}
                title="Kısmi kâr veya satış yap"
              >
                - Kâr Sat
              </button>
            )}
            <button
              type="button"
              onClick={() => setHideHud(true)}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 2, display: 'flex' }}
              title="Şeridi Gizle"
            >
              <X size={13} />
            </button>
          </div>
        </div>
      )}

      {/* 📊 Main Workspace: Chart (Left) + Sınırsız Watchlist Sidebar (Right) */}
      <div 
        ref={chartWrapperRef}
        style={{ 
          display: 'grid', 
          gridTemplateColumns: sidebarOpen 
            ? (isFullscreen ? '1fr 230px' : '1fr 260px') 
            : '1fr', 
          gap: isFullscreen ? 8 : 10, 
          alignItems: 'stretch',
          position: isFullscreen ? 'fixed' : 'relative',
          inset: isFullscreen ? 0 : 'auto',
          zIndex: isFullscreen ? 99999 : 1,
          background: isFullscreen ? '#040711' : 'transparent',
          padding: isFullscreen ? 8 : 0,
          width: isFullscreen ? '100vw' : '100%',
          height: isFullscreen ? '100vh' : 'auto'
        }}
      >
        
        {/* Left: The Native Independent Pro Chart Engine */}
        <div 
          className="card" 
          style={{ 
            padding: 0, 
            background: '#040711', 
            border: '1px solid var(--border)', 
            borderRadius: 8, 
            minHeight: isFullscreen ? 'calc(100vh - 16px)' : 720,
            height: isFullscreen ? 'calc(100vh - 16px)' : 'calc(100vh - 210px)',
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          <NativeProChart
            symbol={currentSymbol}
            cleanTicker={cleanActiveTicker}
            isBist={isBistStock}
            activeHolding={activeHolding}
            usdtry={usdtry}
            isFullscreen={isFullscreen}
            onToggleFullscreen={toggleFullscreen}
            sidebarOpen={sidebarOpen}
            onToggleSidebar={() => setSidebarOpen(prev => !prev)}
            sessionTimer={sessionTimer}
            onOpenAddModal={onOpenAddModal}
          />
        </div>

        {/* Right: Sınırsız Watchlist Yöneticisi WITH LIVE PRICES & +/- % CHANGE */}
        {sidebarOpen && (
          <div 
            className="card" 
            style={{ 
              padding: isFullscreen ? '8px 10px' : '10px', 
              background: '#080c16', 
              border: '1px solid var(--border)', 
              borderRadius: 8, 
              display: 'flex', 
              flexDirection: 'column', 
              minHeight: isFullscreen ? 'calc(100vh - 16px)' : 720,
              height: isFullscreen ? 'calc(100vh - 16px)' : 'calc(100vh - 210px)',
              overflow: 'hidden'
            }}
          >
            {/* Watchlist Header with Quick Close Button */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <div style={{ fontWeight: 800, fontSize: 11.5, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: 5 }}>
                <Star size={13} className="text-gold" />
                <span>İZLEME LİSTESİ</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span className="nav-badge cyan" style={{ fontSize: 8.5, padding: '1px 5px' }}>
                  {currentWatchlistItems.length}
                </span>
                <button
                  type="button"
                  onClick={() => setSidebarOpen(false)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    padding: 2,
                    display: 'flex',
                    alignItems: 'center'
                  }}
                  title="İzleme Listesini Gizle (Grafiği Tam Ekran Genişlet)"
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            {/* 🔽 Category & Custom Watchlist Selector Bar */}
            <div style={{ display: 'flex', gap: 5, alignItems: 'center', marginBottom: 6 }}>
              <select
                value={isCustomActive && currentCustomList ? currentCustomList.id : activeCategory}
                onChange={(e) => {
                  if (e.target.value === '__NEW_LIST__') {
                    setShowNewListModal(true);
                  } else {
                    setActiveCategory(e.target.value);
                  }
                }}
                style={{
                  flex: 1,
                  padding: '6px 8px',
                  fontSize: 10.5,
                  fontWeight: 700,
                  background: '#040711',
                  border: '1px solid rgba(0, 229, 255, 0.35)',
                  borderRadius: 6,
                  color: 'var(--cyan)',
                  cursor: 'pointer',
                  outline: 'none',
                  minWidth: 0
                }}
              >
                <optgroup label="⭐ ÖZEL İZLEME LİSTELERİM" style={{ background: '#080c16', color: '#fbbf24' }}>
                  {customWatchlists.map(wl => (
                    <option key={wl.id} value={wl.id} style={{ color: '#f8fafc', background: '#0a0f1d' }}>
                      ⭐ {wl.name} ({wl.tickers.length} Varlık)
                    </option>
                  ))}
                  <option value="__NEW_LIST__" style={{ color: 'var(--cyan)', background: '#0a0f1d', fontWeight: 700 }}>
                    ➕ Yeni Liste Oluştur...
                  </option>
                </optgroup>
                <optgroup label="📊 HAZIR PİYASA LİSTELERİ" style={{ background: '#080c16', color: '#94a3b8' }}>
                  <option value="portfolio" style={{ color: '#f8fafc', background: '#0a0f1d' }}>💼 Portföyüm ({portfolioItems.length} Varlık)</option>
                  <option value="us_stocks" style={{ color: '#f8fafc', background: '#0a0f1d' }}>📈 ABD Hisse ({PRESET_WATCHLISTS.us_stocks.length})</option>
                  <option value="etf" style={{ color: '#f8fafc', background: '#0a0f1d' }}>🏛️ ETF Sepeti ({PRESET_WATCHLISTS.etf.length})</option>
                  <option value="bist" style={{ color: '#f8fafc', background: '#0a0f1d' }}>🇹🇷 BIST 100 ({PRESET_WATCHLISTS.bist.length})</option>
                  <option value="crypto" style={{ color: '#f8fafc', background: '#0a0f1d' }}>⚡ Kripto & TOTAL3 ({PRESET_WATCHLISTS.crypto.length})</option>
                  <option value="macro" style={{ color: '#f8fafc', background: '#0a0f1d' }}>🌐 Genel Makro & Emtia ({PRESET_WATCHLISTS.macro.length})</option>
                </optgroup>
              </select>

              {/* + Liste Button */}
              <button
                type="button"
                onClick={() => setShowNewListModal(true)}
                className="btn-secondary"
                style={{
                  padding: '5px 7px',
                  fontSize: 10,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 3,
                  background: 'rgba(0, 229, 255, 0.12)',
                  border: '1px solid rgba(0, 229, 255, 0.35)',
                  color: 'var(--cyan)',
                  borderRadius: 6,
                  cursor: 'pointer',
                  flexShrink: 0
                }}
                title="Yeni özel izleme listesi oluştur"
              >
                <FolderPlus size={12} />
                <span>+ Liste</span>
              </button>

              {/* Edit / Delete actions when custom list is active */}
              {isCustomActive && currentCustomList && (
                <div style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingListId(currentCustomList.id);
                      setEditingListName(currentCustomList.name);
                    }}
                    style={{
                      padding: '5px 6px',
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.15)',
                      borderRadius: 5,
                      color: '#cbd5e1',
                      cursor: 'pointer'
                    }}
                    title={`"${currentCustomList.name}" listesini yeniden adlandır`}
                  >
                    <Edit2 size={11} />
                  </button>

                  {customWatchlists.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleDeleteWatchlist(currentCustomList.id)}
                      style={{
                        padding: '5px 6px',
                        background: 'rgba(239, 68, 68, 0.12)',
                        border: '1px solid rgba(239, 68, 68, 0.25)',
                        borderRadius: 5,
                        color: '#f87171',
                        cursor: 'pointer'
                      }}
                      title={`"${currentCustomList.name}" listesini sil`}
                    >
                      <Trash2 size={11} />
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Modal: Yeni Liste Oluştur */}
            {showNewListModal && (
              <div style={{
                marginBottom: 8,
                padding: '8px 10px',
                background: '#0d1527',
                border: '1px solid var(--cyan)',
                borderRadius: 6,
                boxShadow: '0 4px 14px rgba(0,0,0,0.5)'
              }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#f8fafc', marginBottom: 5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>📁 Yeni İzleme Listesi</span>
                  <button 
                    type="button" 
                    onClick={() => { setShowNewListModal(false); setNewListNameInput(''); }}
                    style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 0 }}
                  >
                    <X size={12} />
                  </button>
                </div>
                <form onSubmit={handleCreateWatchlist} style={{ display: 'flex', gap: 5 }}>
                  <input
                    type="text"
                    autoFocus
                    placeholder="Liste adı (Örn: AI Hisseleri)..."
                    value={newListNameInput}
                    onChange={(e) => setNewListNameInput(e.target.value)}
                    style={{
                      flex: 1,
                      padding: '4px 7px',
                      fontSize: 10,
                      background: 'rgba(0,0,0,0.5)',
                      border: '1px solid rgba(0, 229, 255, 0.4)',
                      borderRadius: 4,
                      color: '#fff',
                      outline: 'none'
                    }}
                  />
                  <button
                    type="submit"
                    disabled={!newListNameInput.trim()}
                    className="btn-primary"
                    style={{ fontSize: 9.5, padding: '3px 8px', opacity: newListNameInput.trim() ? 1 : 0.5 }}
                  >
                    Oluştur
                  </button>
                </form>
              </div>
            )}

            {/* Modal: Listeyi Yeniden Adlandır */}
            {editingListId && (
              <div style={{
                marginBottom: 8,
                padding: '8px 10px',
                background: '#0d1527',
                border: '1px solid rgba(251, 191, 36, 0.6)',
                borderRadius: 6,
                boxShadow: '0 4px 14px rgba(0,0,0,0.5)'
              }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#fbbf24', marginBottom: 5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>✏️ Listeyi Yeniden Adlandır</span>
                  <button 
                    type="button" 
                    onClick={() => { setEditingListId(null); setEditingListName(''); }}
                    style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 0 }}
                  >
                    <X size={12} />
                  </button>
                </div>
                <form onSubmit={handleRenameWatchlist} style={{ display: 'flex', gap: 5 }}>
                  <input
                    type="text"
                    autoFocus
                    placeholder="Yeni liste adı..."
                    value={editingListName}
                    onChange={(e) => setEditingListName(e.target.value)}
                    style={{
                      flex: 1,
                      padding: '4px 7px',
                      fontSize: 10,
                      background: 'rgba(0,0,0,0.5)',
                      border: '1px solid rgba(251, 191, 36, 0.4)',
                      borderRadius: 4,
                      color: '#fff',
                      outline: 'none'
                    }}
                  />
                  <button
                    type="submit"
                    disabled={!editingListName.trim()}
                    className="btn-primary"
                    style={{ fontSize: 9.5, padding: '3px 8px', background: '#f59e0b', borderColor: '#f59e0b', opacity: editingListName.trim() ? 1 : 0.5 }}
                  >
                    Kaydet
                  </button>
                </form>
              </div>
            )}

            {/* Quick 4-Pill Shortcut Bar */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 3, marginBottom: 8 }}>
              {[
                { id: 'portfolio', label: '💼 Portföy' },
                { id: 'us_stocks', label: '📈 ABD' },
                { id: 'crypto', label: '⚡ Kripto' },
                { id: currentCustomList ? currentCustomList.id : (customWatchlists[0]?.id || 'custom_default'), label: `⭐ ${currentCustomList ? (currentCustomList.name.length > 7 ? currentCustomList.name.slice(0, 6) + '..' : currentCustomList.name) : 'Özel'}` }
              ].map(p => {
                const isActive = activeCategory === p.id || (p.id.startsWith('custom') && isCustomActive);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setActiveCategory(p.id)}
                    className={`chip-btn ${isActive ? 'active' : ''}`}
                    style={{ fontSize: 9, padding: '2px 4px', textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                    title={p.label}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>

            {/* Search Filter within Current Category */}
            <div style={{ position: 'relative', marginBottom: 8 }}>
              <Search size={12} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Bu listede ara (Sembol, Ad)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ 
                  width: '100%', 
                  padding: '5px 8px 5px 26px', 
                  fontSize: 10.5, 
                  background: 'rgba(0,0,0,0.4)', 
                  border: '1px solid rgba(255,255,255,0.08)', 
                  borderRadius: 6, 
                  color: '#fff',
                  outline: 'none'
                }}
              />
            </div>

            {/* Ticker Add & Intelligent Autocomplete Bar */}
            <div ref={searchContainerRef} style={{ position: 'relative', marginBottom: 8 }}>
              <form onSubmit={handleAddTicker} style={{ display: 'flex', gap: 6 }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <input
                    type="text"
                    placeholder={
                      activeCategory === 'portfolio' 
                        ? "Portföye hisse ekle / ara (Örn: PLTR, THYAO)..." 
                        : isCustomActive && currentCustomList 
                        ? `"${currentCustomList.name}" listesine ekle...` 
                        : "Özel listeye ekle & Grafiği aç (Örn: THYAO, NVDA)..."
                    }
                    value={newTickerInput}
                    onChange={(e) => {
                      setNewTickerInput(e.target.value);
                      setShowSuggestions(true);
                      setSelectedSuggestionIndex(-1);
                    }}
                    onFocus={() => {
                      if (newTickerInput && newTickerInput.trim().length > 0) setShowSuggestions(true);
                    }}
                    onKeyDown={handleInputKeyDown}
                    style={{ 
                      width: '100%', 
                      padding: '5px 22px 5px 8px', 
                      fontSize: 10, 
                      background: 'rgba(0,0,0,0.5)', 
                      border: '1px solid rgba(0, 229, 255, 0.35)', 
                      borderRadius: 4, 
                      color: '#fff',
                      outline: 'none'
                    }}
                  />
                  {newTickerInput && (
                    <button
                      type="button"
                      onClick={() => {
                        setNewTickerInput('');
                        setShowSuggestions(false);
                      }}
                      style={{
                        position: 'absolute',
                        right: 6,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                        padding: 0,
                        display: 'flex'
                      }}
                    >
                      <X size={11} />
                    </button>
                  )}
                </div>
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ fontSize: 9.5, padding: '3px 8px', display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0 }}
                  title="Listeye ekle ve grafiği hemen aç"
                >
                  <Plus size={11} />
                  <span>Ekle</span>
                </button>
              </form>

              {/* 💡 Autocomplete Suggestions Floating Dropdown */}
              {showSuggestions && filteredSuggestions.length > 0 && (
                <div 
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 4px)',
                    left: 0,
                    right: 0,
                    zIndex: 9999,
                    background: '#090e1a',
                    border: '1px solid rgba(0, 229, 255, 0.45)',
                    borderRadius: 6,
                    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.85)',
                    maxHeight: 280,
                    overflowY: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    padding: '4px'
                  }}
                >
                  <div style={{ padding: '3px 6px', fontSize: 8.5, color: 'var(--cyan)', fontWeight: 700, borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between' }}>
                    <span>ÖNERİLEN VARLIKLAR ({filteredSuggestions.length})</span>
                    <span style={{ color: 'var(--text-muted)' }}>↑↓ Gezin • Enter Seç</span>
                  </div>
                  {filteredSuggestions.map((item, idx) => {
                    const isHighlighted = idx === selectedSuggestionIndex;
                    const marketBadgeColor = 
                      item.market === 'BIST' ? 'rgba(239, 68, 68, 0.2)' :
                      item.market === 'NASDAQ' ? 'rgba(59, 130, 246, 0.2)' :
                      item.market === 'NYSE' ? 'rgba(99, 102, 241, 0.2)' :
                      item.market === 'KRİPTO' ? 'rgba(234, 179, 8, 0.2)' :
                      item.market === 'ETF' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(168, 85, 247, 0.2)';

                    const marketBadgeText = 
                      item.market === 'BIST' ? '#f87171' :
                      item.market === 'NASDAQ' ? '#60a5fa' :
                      item.market === 'NYSE' ? '#818cf8' :
                      item.market === 'KRİPTO' ? '#facc15' :
                      item.market === 'ETF' ? '#34d399' : '#c084fc';

                    return (
                      <div
                        key={item.ticker}
                        onMouseEnter={() => setSelectedSuggestionIndex(idx)}
                        onClick={(e) => handleAddTicker(e, item.ticker)}
                        style={{
                          padding: '6px 8px',
                          borderRadius: 4,
                          background: isHighlighted ? 'rgba(0, 229, 255, 0.15)' : 'transparent',
                          border: isHighlighted ? '1px solid rgba(0, 229, 255, 0.3)' : '1px solid transparent',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 8,
                          transition: 'all 0.1s ease'
                        }}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span className="mono font-bold" style={{ color: 'var(--cyan)', fontSize: 11 }}>
                              {item.ticker}
                            </span>
                            <span style={{ 
                              fontSize: 7.5, 
                              padding: '1px 4px', 
                              borderRadius: 3, 
                              background: marketBadgeColor, 
                              color: marketBadgeText, 
                              fontWeight: 800,
                              letterSpacing: '0.5px'
                            }}>
                              {item.market}
                            </span>
                          </div>
                          <span style={{ fontSize: 9.5, color: '#cbd5e1', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 1 }}>
                            {item.name}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                          <span style={{ fontSize: 8.5, color: 'var(--cyan)', background: 'rgba(0, 229, 255, 0.08)', padding: '2px 5px', borderRadius: 3 }}>
                            + Ekle
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            {/* If items in portfolio are hidden or added, show reset shortcut */}
            {activeCategory === 'portfolio' && (hiddenPortfolioTickers.length > 0 || manualPortfolioTickers.length > 0) && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, padding: '2px 4px', fontSize: 9, color: 'var(--text-muted)' }}>
                <span>
                  {manualPortfolioTickers.length > 0 ? `+${manualPortfolioTickers.length} manuel` : ''}
                  {hiddenPortfolioTickers.length > 0 ? ` • ${hiddenPortfolioTickers.length} gizli` : ''}
                </span>
                <button
                  type="button"
                  onClick={handleResetPortfolioWatchlist}
                  style={{ background: 'transparent', border: 'none', color: 'var(--cyan)', cursor: 'pointer', fontSize: 9, textDecoration: 'underline' }}
                  title="Tüm gizlenen portföy varlıklarını geri yükle"
                >
                  Listeyi Sıfırla
                </button>
              </div>
            )}

            {/* Scrollable Watchlist Items List WITH LIVE PRICES & +/- % CHANGE */}
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4, paddingRight: 2 }}>
              {currentWatchlistItems.map((item) => {
                const isSelected = currentSymbol === item.ticker || getTradingViewSymbol(currentSymbol) === item.tv;
                const isUserHolding = item.isHolding || portfolioItems.some(h => (h.ticker || '').toUpperCase() === (item.ticker || '').toUpperCase());
                const priceData = getItemPriceAndChange(item);

                return (
                  <div
                    key={item.ticker}
                    onClick={() => {
                      setCurrentSymbol(item.ticker);
                      if (onSelectTicker) onSelectTicker(item.ticker);
                    }}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '7px 9px',
                      borderRadius: 6,
                      background: isSelected 
                        ? 'rgba(0, 229, 255, 0.12)' 
                        : isUserHolding 
                        ? 'rgba(16, 185, 129, 0.04)' 
                        : 'rgba(255,255,255,0.02)',
                      border: isSelected 
                        ? '1px solid var(--cyan)' 
                        : isUserHolding 
                        ? '1px solid rgba(16, 185, 129, 0.25)' 
                        : '1px solid rgba(255,255,255,0.05)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {/* Left: Ticker & Name */}
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, marginRight: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <strong className="mono" style={{ color: isSelected ? 'var(--cyan)' : isUserHolding ? '#34d399' : '#f8fafc', fontSize: 11.5 }}>
                          {item.ticker}
                        </strong>
                        {isUserHolding && (
                          <span className="badge-type hisse" style={{ fontSize: 8, padding: '1px 4px' }}>
                            Portföyde
                          </span>
                        )}
                        {item.type && activeCategory === 'portfolio' && (
                          <span className="mono" style={{ fontSize: 8, color: 'var(--text-muted)' }}>
                            [{item.type}]
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 9.5, color: isUserHolding ? '#94a3b8' : 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 1 }}>
                        {item.desc || item.name}
                      </div>
                    </div>

                    {/* Right: Live Price & +/- % Change Badge */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2, flexShrink: 0 }}>
                      {priceData.price > 0 ? (
                        <>
                          <span className="mono font-bold" style={{ fontSize: 11, color: '#f8fafc' }}>
                            {priceData.formattedPrice ? priceData.formattedPrice : `${priceData.currency === 'TRY' ? '₺' : '$'}${fmt(priceData.price, priceData.price < 1 ? 4 : 2)}`}
                          </span>
                          <span 
                            className="mono font-bold" 
                            style={{ 
                              fontSize: 9, 
                              padding: '1px 5px', 
                              borderRadius: 4,
                              background: priceData.changePct >= 0 ? 'rgba(16, 185, 129, 0.18)' : 'rgba(239, 68, 68, 0.18)',
                              color: priceData.changePct >= 0 ? '#34d399' : '#f87171' 
                            }}
                          >
                            {priceData.changePct >= 0 ? '+' : ''}{fmt(priceData.changePct, 2)}%
                          </span>
                        </>
                      ) : (
                        <span className="mono" style={{ fontSize: 9, color: 'var(--text-muted)' }}>
                          {item.tv.split(':')[0]}
                        </span>
                      )}

                      {/* Delete / Remove Action for custom or portfolio */}
                      {(isCustomActive || activeCategory === 'portfolio') && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveTicker(item);
                          }}
                          style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 2, marginTop: 2 }}
                          title={activeCategory === 'portfolio' && !item.isManual ? "Portföy izleme listesinden gizle" : "Listeden kaldır"}
                        >
                          <Trash2 size={11} />
                        </button>
                      )}

                      {/* Quick Add Star for Preset Categories (us_stocks, bist, crypto, etf, macro) */}
                      {!isCustomActive && activeCategory !== 'portfolio' && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleQuickAddTicker(item.ticker);
                          }}
                          style={{ 
                            background: 'transparent', 
                            border: 'none', 
                            color: customTickers.includes(item.ticker.toUpperCase()) ? '#fbbf24' : '#64748b', 
                            cursor: 'pointer', 
                            padding: 2, 
                            marginTop: 2 
                          }}
                          title={customTickers.includes(item.ticker.toUpperCase()) ? "Özel listenizde kayıtlı" : "Özel listeme ekle"}
                        >
                          <Star size={11} fill={customTickers.includes(item.ticker.toUpperCase()) ? "#fbbf24" : "none"} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

              {currentWatchlistItems.length === 0 && (
                <div style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--text-muted)', fontSize: 11 }}>
                  Bu kriterde varlık bulunamadı.
                </div>
              )}
            </div>

            {/* Watchlist Footer Note */}
            <div style={{ marginTop: 6, paddingTop: 6, borderTop: '1px solid rgba(255,255,255,0.08)', fontSize: 9, color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>💡 Tıkla ➔ Grafiğe Al</span>
              <span className="text-cyan font-bold mono">{cleanActiveTicker}</span>
            </div>
          </div>
        )}

      </div>

      {/* 📐 PINE SCRIPT MODAL: EMA 50 & AUTO FIBONACCI */}
      {showFibModal && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(5, 8, 18, 0.85)',
            backdropFilter: 'blur(10px)',
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16
          }}
          onClick={() => setShowFibModal(false)}
        >
          <div 
            style={{
              backgroundColor: '#0d1527',
              border: '1px solid rgba(0, 229, 255, 0.3)',
              borderRadius: 12,
              width: '100%',
              maxWidth: 760,
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 30px rgba(99, 102, 241, 0.2)',
              display: 'flex',
              flexDirection: 'column'
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 20 }}>📐</span>
                <div>
                  <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    EMA 50 & Özelleştirilebilir Auto Fibonacci
                    <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 4, background: 'rgba(99, 102, 241, 0.2)', color: '#a5b4fc', border: '1px solid rgba(99, 102, 241, 0.4)' }}>
                      Pine Script v6
                    </span>
                    <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 4, background: 'rgba(16, 185, 129, 0.2)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.4)' }}>
                      1/3 Kota (Tek İndikatör)
                    </span>
                  </h3>
                  <p style={{ margin: '3px 0 0', fontSize: 11, color: 'var(--text-muted)' }}>
                    TradingView ücretsiz planda 2-3 indikatör sınırı olduğu için EMA 50 ve Fibonacci'yi tek kodda birleştirdik.
                  </p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setShowFibModal(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 6 }}
                title="Kapat"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              
              {/* Feature Highlights Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 10 }}>
                <div style={{ background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.06)', borderRadius: 8, padding: 10 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#60a5fa', marginBottom: 4 }}>📈 EMA 50 Trend Çizgisi</div>
                  <div style={{ fontSize: 10, color: '#94a3b8', lineHeight: 1.4 }}>
                    Varsayılan 50 periyotluk mavi EMA. Ayarlarından periyodu, kaynağı (kapanış/hlc3), rengi ve çizgi kalınlığını değiştirebilirsiniz.
                  </div>
                </div>

                <div style={{ background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.06)', borderRadius: 8, padding: 10 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#fbbf24', marginBottom: 4 }}>🎯 Dinamik Otomatik Fibonacci</div>
                  <div style={{ fontSize: 10, color: '#94a3b8', lineHeight: 1.4 }}>
                    Geriye dönük tepe/dip bar hassasiyetini (Swing Lookback: varsayılan 10 bar, 2-100 arası) seçebilir, çizgi stilini (Düz, Kesikli, Noktalı) belirleyebilirsiniz.
                  </div>
                </div>

                <div style={{ background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.06)', borderRadius: 8, padding: 10 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#34d399', marginBottom: 4 }}>⭐ Altın Cep (Golden Pocket 0.50 - 0.618)</div>
                  <div style={{ fontSize: 10, color: '#94a3b8', lineHeight: 1.4 }}>
                    0.50 ile 0.618 arasındaki kritik dönüş bölgesini yarı saydam renkli kutu ile otomatik olarak doldurur. Renk ve opaklık ayarlanabilir.
                  </div>
                </div>

                <div style={{ background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.06)', borderRadius: 8, padding: 10 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#c084fc', marginBottom: 4 }}>🎨 8 Farklı Seviye & Renk Kontrolü</div>
                  <div style={{ fontSize: 10, color: '#94a3b8', lineHeight: 1.4 }}>
                    0, 0.236, 0.382, 0.50, 0.618, 0.786, 1.0 ve 1.618 seviyelerini istediğiniz gibi açıp kapatabilir, her seviyeye ayrı renk atayabilirsiniz.
                  </div>
                </div>
              </div>

              {/* Instructions Box with Explanations */}
              <div style={{ background: 'rgba(30, 41, 59, 0.65)', border: '1px solid rgba(0, 229, 255, 0.3)', borderRadius: 8, padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--cyan)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span>📌 Neden Bizim Grafiğin Altında Pine Düzenleyici Yok?</span>
                  </div>
                  <a
                    href={tvExternalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="chip-btn"
                    style={{
                      fontSize: 11,
                      padding: '4px 12px',
                      background: 'rgba(59, 130, 246, 0.25)',
                      borderColor: '#60a5fa',
                      color: '#fff',
                      fontWeight: 700,
                      textDecoration: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6
                    }}
                  >
                    <ExternalLink size={13} />
                    <span>TradingView'de Aç & Kodu Ekle</span>
                  </a>
                </div>

                <div style={{ fontSize: 10.5, color: '#e2e8f0', lineHeight: 1.55 }}>
                  TradingView, dış sitelere gömülen widget pencerelerinde (lisans ve hesap güvenliği gereği) alt kısımdaki <strong>"Pine Düzenleyici"</strong> sekmesini bilerek sunmaz. Pine Düzenleyici yalnızca resmi <strong>tradingview.com</strong> web sitesinde yer alır.
                </div>

                <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: 8 }}>
                  <strong style={{ fontSize: 11, color: '#fbbf24' }}>💡 2 Farklı Kullanım Seçeneğiniz:</strong>
                  <ul style={{ margin: '6px 0 0', paddingLeft: 18, fontSize: 10.5, color: '#cbd5e1', lineHeight: 1.6 }}>
                    <li>
                      <strong>1. Yol (Resmi TradingView'e Eklemek):</strong> Aşağıdaki <em>"📋 Kodu Kopyala"</em> butonuna basın. Ardından yukarıdaki <em>"TradingView'de Aç & Kodu Ekle"</em> butonuna tıklayın. Açılan sitenin en altındaki <strong>"Pine Düzenleyici" (Pine Editor)</strong> sekmesine kodu yapıştırıp <strong>"Grafiğe Ekle"</strong> deyin.
                    </li>
                    <li>
                      <strong>2. Yol (Bizim Terminalimizde Doğrudan Kullanmak):</strong>
                      <br />• <strong>EMA 50 için:</strong> Göstergeler çubuğumuzdaki <strong>"+ EMA"</strong> butonuna basmanız yeterlidir.
                      <br />• <strong>Fibonacci için:</strong> Grafiğimizin sol dikey araç çubuğundaki <strong>3. sıradaki simgeye (veya Alt + F kısayoluna)</strong> tıklayarak dilediğiniz dip ve tepeye anında TradingView'in profesyonel Fibonacci aracını çekebilirsiniz! Çizgiye çift tıklayarak renkleri ve seviyeleri özelleştirebilirsiniz.
                    </li>
                  </ul>
                </div>
              </div>

              {/* Code Box with Copy Button */}
              <div style={{ position: 'relative' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Terminal size={12} className="text-cyan" />
                    <span>Pine Script v6 Kaynak Kodu:</span>
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyFibScript}
                    className="chip-btn"
                    style={{
                      fontSize: 11,
                      padding: '4px 12px',
                      background: copiedFib ? 'rgba(16, 185, 129, 0.25)' : 'rgba(99, 102, 241, 0.25)',
                      borderColor: copiedFib ? '#34d399' : 'var(--cyan)',
                      color: copiedFib ? '#34d399' : '#fff',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6
                    }}
                  >
                    {copiedFib ? <Check size={13} /> : <Copy size={13} />}
                    <span>{copiedFib ? '✓ Kod Panoya Kopyalandı!' : '📋 Kodu Kopyala'}</span>
                  </button>
                </div>

                <pre 
                  style={{ 
                    maxHeight: 220, 
                    overflowY: 'auto', 
                    padding: 12, 
                    background: '#060a14', 
                    border: '1px solid rgba(255, 255, 255, 0.1)', 
                    borderRadius: 6, 
                    fontSize: 9.5, 
                    color: '#a5f3fc', 
                    fontFamily: 'monospace',
                    lineHeight: 1.45,
                    whiteSpace: 'pre',
                    margin: 0
                  }}
                >
                  {EMA50_AUTOFIB_PINE}
                </pre>
              </div>

            </div>

            {/* Modal Footer */}
            <div style={{ padding: '12px 20px', borderTop: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(10, 16, 30, 0.5)' }}>
              <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                💡 İpucu: Bu indikatör grafiğe eklendiğinde geriye 1-2 indikatörlük boş kontenjanınız kalır.
              </span>
              <button
                type="button"
                onClick={() => setShowFibModal(false)}
                className="chip-btn"
                style={{ fontSize: 11, padding: '4px 14px' }}
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
