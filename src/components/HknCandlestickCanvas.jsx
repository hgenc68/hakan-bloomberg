import React, { useRef, useEffect, useState } from 'react';

/**
 * HknCandlestickCanvas
 * High-performance HTML5 Canvas Candlestick & Technical Analysis Renderer
 * Matches 100% with Hkn Toolkit Fibo (TradingView) specifications:
 * - Japanese Candlesticks (Teal Bullish / Red Bearish wicks & bodies)
 * - Ranked Support & Resistance Transparent Horizontal Boxes (Salmon Resistance & Cyan Support)
 * - Auto Fibonacci Retracement Levels & Golden Zone fill with right-axis ratio labels
 * - VWAP (Royal Blue) & 3 EMA (50 Sky Blue / 100 Orange / 200 Purple)
 * - Interactive Crosshair, Price Scales, and Dynamic Top Info HUD
 */
export default function HknCandlestickCanvas({
  candles = [],
  vwap = [],
  ema50 = [],
  ema100 = [],
  ema200 = [],
  fib = null,
  srZones = [],
  showCandles = true,
  showVwap = true,
  showEma = true,
  showFib = true,
  showSR = true,
  currency = 'USD',
  ticker = ''
}) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const [hoverIndex, setHoverIndex] = useState(null);
  const [mousePos, setMousePos] = useState({ x: null, y: null });

  const fmt = (v, d = 2) => {
    if (v === undefined || v === null || isNaN(v)) return '-';
    const num = Number(v);
    const digs = num < 1 ? Math.min(4, d + 2) : d;
    return num.toLocaleString('tr-TR', { minimumFractionDigits: digs, maximumFractionDigits: digs });
  };

  const symIcon = currency === 'TRY' ? '₺' : '$';

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || !candles || candles.length === 0) return;

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;

    const rect = container.getBoundingClientRect();
    const width = Math.max(300, rect.width);
    const height = Math.max(300, rect.height);

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    ctx.scale(dpr, dpr);

    // Padding configuration
    const paddingTop = 26;
    const paddingBottom = 26;
    const paddingLeft = 14;
    const paddingRight = 78; // Reserved for right Y price axis

    const chartW = width - paddingLeft - paddingRight;
    const chartH = height - paddingTop - paddingBottom;

    const count = candles.length;
    const barWidth = chartW / count;

    // 1. Calculate Min and Max Price for Y Scale
    let minPrice = Infinity;
    let maxPrice = -Infinity;

    for (let i = 0; i < count; i++) {
      const c = candles[i];
      if (c.high && c.high > maxPrice) maxPrice = c.high;
      if (c.low && c.low < minPrice) minPrice = c.low;
      if (c.close && c.close > maxPrice) maxPrice = c.close;
      if (c.close && c.close < minPrice) minPrice = c.close;
    }

    // Include S/R zones and Fib bounds if active
    if (showSR && srZones && srZones.length > 0) {
      for (const z of srZones) {
        if (z.top && z.top > maxPrice) maxPrice = z.top;
        if (z.bottom && z.bottom < minPrice) minPrice = z.bottom;
      }
    }

    if (showFib && fib) {
      if (fib.maxH && fib.maxH > maxPrice) maxPrice = fib.maxH;
      if (fib.minL && fib.minL < minPrice) minPrice = fib.minL;
    }

    // Include VWAP and EMAs if active
    if (showVwap && vwap) {
      for (let i = 0; i < vwap.length; i++) {
        const v = vwap[i];
        if (v && v > maxPrice) maxPrice = v;
        if (v && v < minPrice) minPrice = v;
      }
    }

    if (minPrice === Infinity || maxPrice === -Infinity || minPrice === maxPrice) {
      minPrice = 0;
      maxPrice = 100;
    }

    // 4% Top & Bottom Padding
    const pSpan = maxPrice - minPrice;
    minPrice -= pSpan * 0.04;
    maxPrice += pSpan * 0.04;
    const priceRange = maxPrice - minPrice;

    // Coordinate conversion functions
    const toX = (idx) => paddingLeft + idx * barWidth + barWidth / 2;
    const toY = (val) => paddingTop + (1 - (val - minPrice) / priceRange) * chartH;
    const toPrice = (y) => maxPrice - ((y - paddingTop) / chartH) * priceRange;

    // 2. Clear canvas with dark slate background
    ctx.fillStyle = '#060913';
    ctx.fillRect(0, 0, width, height);

    // 3. Draw Grid Lines (Horizontal Prices & Vertical Dates)
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.fillStyle = '#64748b';
    ctx.font = '10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'left';

    const ySteps = 6;
    for (let s = 0; s <= ySteps; s++) {
      const stepPrice = minPrice + (priceRange / ySteps) * s;
      const stepY = toY(stepPrice);

      ctx.beginPath();
      ctx.moveTo(paddingLeft, stepY);
      ctx.lineTo(width - paddingRight, stepY);
      ctx.stroke();

      // Right axis price text
      ctx.fillText(`${symIcon}${fmt(stepPrice, 2)}`, width - paddingRight + 6, stepY + 3.5);
    }

    // Vertical date marks
    const dateStep = Math.max(5, Math.floor(count / 6));
    ctx.textAlign = 'center';
    for (let i = 0; i < count; i += dateStep) {
      const x = toX(i);
      ctx.beginPath();
      ctx.moveTo(x, paddingTop);
      ctx.lineTo(x, height - paddingBottom);
      ctx.stroke();

      const timeLabel = (candles[i]?.time || '').slice(5); // MM-DD
      ctx.fillText(timeLabel, x, height - paddingBottom + 16);
    }

    // 4. Draw Support & Resistance Transparent Horizontal Boxes (Identical to reference!)
    if (showSR && srZones && srZones.length > 0) {
      for (const z of srZones) {
        const yTop = toY(z.top);
        const yBottom = toY(z.bottom);
        const boxH = Math.max(5, yBottom - yTop);
        const startBar = Math.max(0, z.startIdx !== undefined ? z.startIdx : 0);
        const xLeft = toX(startBar);
        const xRight = width - paddingRight;

        if (z.type === 'resistance') {
          // Peach/Salmon Transparent Box
          ctx.fillStyle = 'rgba(216, 76, 26, 0.20)';
          ctx.strokeStyle = 'rgba(216, 76, 26, 0.75)';
          ctx.fillRect(xLeft, yTop, xRight - xLeft, boxH);
          ctx.strokeRect(xLeft, yTop, xRight - xLeft, boxH);

          // Zone text inside box
          ctx.fillStyle = '#fca5a5';
          ctx.font = 'bold 9px monospace';
          ctx.textAlign = 'left';
          ctx.fillText(`Direnç: ${symIcon}${fmt(z.mid)}`, xLeft + 6, yTop + Math.min(boxH - 2, 11));
        } else {
          // Turquoise/Cyan Transparent Box
          ctx.fillStyle = 'rgba(26, 216, 194, 0.18)';
          ctx.strokeStyle = 'rgba(26, 216, 194, 0.75)';
          ctx.fillRect(xLeft, yTop, xRight - xLeft, boxH);
          ctx.strokeRect(xLeft, yTop, xRight - xLeft, boxH);

          // Zone text inside box
          ctx.fillStyle = '#6ee7b7';
          ctx.font = 'bold 9px monospace';
          ctx.textAlign = 'left';
          ctx.fillText(`Destek: ${symIcon}${fmt(z.mid)}`, xLeft + 6, yTop + Math.min(boxH - 2, 11));
        }
      }
    }

    // 5. Draw Auto Fibonacci Retracement & Golden Zone (Identical to reference!)
    if (showFib && fib && fib.f500 !== undefined && fib.f618 !== undefined) {
      const swingStartBar = Math.min(fib.swingHiIdx || 0, fib.swingLoIdx || 0);
      const xStart = toX(Math.max(0, swingStartBar));
      const xEnd = width - paddingRight;

      // Golden Zone Filled Rectangle (0.500 to 0.618)
      const yGTop = toY(Math.max(fib.f500, fib.f618));
      const yGBottom = toY(Math.min(fib.f500, fib.f618));
      ctx.fillStyle = 'rgba(8, 153, 129, 0.16)';
      ctx.fillRect(xStart, yGTop, xEnd - xStart, yGBottom - yGTop);

      // Swing Trendline (Peak to Trough dashed line)
      if (fib.swingHiIdx !== undefined && fib.swingLoIdx !== undefined) {
        ctx.save();
        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.65)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(toX(fib.swingHiIdx), toY(fib.maxH));
        ctx.lineTo(toX(fib.swingLoIdx), toY(fib.minL));
        ctx.stroke();
        ctx.restore();
      }

      // Fibonacci Horizontal Levels & Tags
      const fibLevels = [
        { r: '1', val: fib.f1000 || fib.maxH, col: '#787b86', w: 1, dash: [4, 4] },
        { r: '0.786', val: fib.f786, col: '#00bcd4', w: 1, dash: [] },
        { r: '0.618', val: fib.f618, col: '#ff9800', w: 1.8, dash: [] }, // Golden Zone upper
        { r: '0.5', val: fib.f500, col: '#ef4444', w: 1.6, dash: [] },   // Golden Zone lower
        { r: '0.382', val: fib.f382, col: '#f59e0b', w: 1, dash: [] },
        { r: '0.236', val: fib.f236, col: '#94a3b8', w: 1, dash: [] },
        { r: '0', val: fib.f0 || fib.minL, col: '#787b86', w: 1, dash: [4, 4] }
      ];

      for (const fl of fibLevels) {
        if (fl.val === undefined || isNaN(fl.val)) continue;
        const ly = toY(fl.val);

        ctx.save();
        if (fl.dash.length > 0) ctx.setLineDash(fl.dash);
        ctx.strokeStyle = fl.col;
        ctx.lineWidth = fl.w;
        ctx.beginPath();
        ctx.moveTo(xStart, ly);
        ctx.lineTo(xEnd, ly);
        ctx.stroke();
        ctx.restore();

        // Level label on right edge
        ctx.fillStyle = fl.col;
        ctx.font = 'bold 9px monospace';
        ctx.textAlign = 'right';
        ctx.fillText(`${fl.r} (${fmt(fl.val, 0)})`, xEnd - 6, ly - 3);
      }
    }

    // 6. Draw Candlesticks (or Line)
    if (showCandles) {
      const cW = Math.max(3, barWidth * 0.72);
      for (let i = 0; i < count; i++) {
        const c = candles[i];
        const x = toX(i);
        const isUp = c.close >= c.open;
        const candleColor = isUp ? '#26a69a' : '#ef5350';

        // High-Low Wick
        ctx.strokeStyle = candleColor;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(x, toY(c.high));
        ctx.lineTo(x, toY(c.low));
        ctx.stroke();

        // Open-Close Body
        const bodyTop = toY(Math.max(c.open, c.close));
        const bodyH = Math.max(1.5, Math.abs(toY(c.open) - toY(c.close)));
        ctx.fillStyle = candleColor;
        ctx.fillRect(x - cW / 2, bodyTop, cW, bodyH);
      }
    } else {
      // Clean Line Chart Fallback
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i < count; i++) {
        const x = toX(i);
        const y = toY(candles[i].close);
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    // 7. Draw VWAP (Royal Blue #2563eb line)
    if (showVwap && vwap && vwap.length > 0) {
      ctx.strokeStyle = '#2563eb';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      let started = false;
      for (let i = 0; i < Math.min(count, vwap.length); i++) {
        const v = vwap[i];
        if (v && !isNaN(v)) {
          const x = toX(i);
          const y = toY(v);
          if (!started) { ctx.moveTo(x, y); started = true; } else ctx.lineTo(x, y);
        }
      }
      ctx.stroke();
    }

    // 8. Draw 3 EMA Lines (50 Sky Blue / 100 Orange / 200 Purple)
    if (showEma) {
      const drawEma = (arr, col, w) => {
        if (!arr || arr.length === 0) return;
        ctx.strokeStyle = col;
        ctx.lineWidth = w;
        ctx.beginPath();
        let s = false;
        for (let i = 0; i < Math.min(count, arr.length); i++) {
          const v = arr[i];
          if (v && !isNaN(v)) {
            const x = toX(i);
            const y = toY(v);
            if (!s) { ctx.moveTo(x, y); s = true; } else ctx.lineTo(x, y);
          }
        }
        ctx.stroke();
      };

      drawEma(ema50, '#38bdf8', 1.6);
      drawEma(ema100, '#fb923c', 1.6);
      drawEma(ema200, '#c084fc', 1.8);
    }

    // 9. Draw Last Price Tag & VWAP Tag on Right Axis
    const lastBar = candles[count - 1];
    if (lastBar) {
      const isUp = count > 1 ? lastBar.close >= candles[count - 2].close : true;
      const tagColor = isUp ? '#10b981' : '#ef4444';
      const lastY = toY(lastBar.close);

      // Horizontal dashed guide line to axis
      ctx.save();
      ctx.setLineDash([3, 3]);
      ctx.strokeStyle = tagColor;
      ctx.beginPath();
      ctx.moveTo(paddingLeft, lastY);
      ctx.lineTo(width - paddingRight, lastY);
      ctx.stroke();
      ctx.restore();

      // Right axis price badge
      ctx.fillStyle = tagColor;
      ctx.fillRect(width - paddingRight + 2, lastY - 9, paddingRight - 4, 18);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`${symIcon}${fmt(lastBar.close, 2)}`, width - paddingRight / 2, lastY + 3.5);

      // VWAP Tag on right axis
      if (showVwap && vwap && vwap[count - 1]) {
        const lastV = vwap[count - 1];
        const vY = toY(lastV);
        ctx.fillStyle = '#1d4ed8';
        ctx.fillRect(width - paddingRight + 2, vY - 8, paddingRight - 4, 16);
        ctx.fillStyle = '#ffffff';
        ctx.font = '9px monospace';
        ctx.fillText(`V:${fmt(lastV, 1)}`, width - paddingRight / 2, vY + 3.5);
      }
    }

    // 10. Draw Interactive Crosshair & Tooltip
    if (hoverIndex !== null && hoverIndex >= 0 && hoverIndex < count && mousePos.x !== null) {
      const hX = toX(hoverIndex);
      const hY = mousePos.y !== null ? Math.min(height - paddingBottom, Math.max(paddingTop, mousePos.y)) : toY(candles[hoverIndex].close);

      // Dashed vertical crosshair
      ctx.save();
      ctx.setLineDash([3, 3]);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.beginPath();
      ctx.moveTo(hX, paddingTop);
      ctx.lineTo(hX, height - paddingBottom);
      ctx.stroke();

      // Dashed horizontal crosshair
      ctx.beginPath();
      ctx.moveTo(paddingLeft, hY);
      ctx.lineTo(width - paddingRight, hY);
      ctx.stroke();
      ctx.restore();

      // Price badge at crosshair
      const curHoverPrice = toPrice(hY);
      ctx.fillStyle = '#334155';
      ctx.fillRect(width - paddingRight + 2, hY - 8, paddingRight - 4, 16);
      ctx.fillStyle = '#f8fafc';
      ctx.font = '9.5px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`${symIcon}${fmt(curHoverPrice, 2)}`, width - paddingRight / 2, hY + 3.5);

      // Date badge at crosshair bottom
      const dateText = candles[hoverIndex].time || '';
      ctx.fillStyle = '#334155';
      ctx.fillRect(hX - 35, height - paddingBottom + 3, 70, 16);
      ctx.fillStyle = '#f8fafc';
      ctx.fillText(dateText, hX, height - paddingBottom + 14);
    }

  }, [candles, vwap, ema50, ema100, ema200, fib, srZones, showCandles, showVwap, showEma, showFib, showSR, currency, hoverIndex, mousePos]);

  // Handle Mouse Hover for Crosshair
  const handleMouseMove = (e) => {
    const canvas = canvasRef.current;
    if (!canvas || !candles || candles.length === 0) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const paddingLeft = 14;
    const paddingRight = 78;
    const chartW = rect.width - paddingLeft - paddingRight;
    const count = candles.length;
    const barWidth = chartW / count;

    const idx = Math.floor((x - paddingLeft) / barWidth);
    if (idx >= 0 && idx < count) {
      setHoverIndex(idx);
      setMousePos({ x, y });
    } else {
      setHoverIndex(null);
      setMousePos({ x: null, y: null });
    }
  };

  const handleMouseLeave = () => {
    setHoverIndex(null);
    setMousePos({ x: null, y: null });
  };

  const activeCandle = hoverIndex !== null && candles[hoverIndex] ? candles[hoverIndex] : (candles[candles.length - 1] || null);
  const activeVwap = hoverIndex !== null && vwap[hoverIndex] ? vwap[hoverIndex] : (vwap[vwap.length - 1] || null);
  const activeEma50 = hoverIndex !== null && ema50[hoverIndex] ? ema50[hoverIndex] : (ema50[ema50.length - 1] || null);

  const dayChg = activeCandle ? ((activeCandle.close - activeCandle.open) / (activeCandle.open || 1)) * 100 : 0;

  return (
    <div 
      ref={containerRef} 
      style={{ 
        width: '100%', 
        height: '100%', 
        position: 'relative', 
        userSelect: 'none', 
        display: 'flex', 
        flexDirection: 'column' 
      }}
    >
      {/* 🌟 Floating Top HUD Info Ribbon */}
      <div 
        style={{ 
          position: 'absolute', 
          top: 6, 
          left: 14, 
          right: 80, 
          zIndex: 10, 
          display: 'flex', 
          alignItems: 'center', 
          gap: 10, 
          fontSize: 10.5, 
          fontFamily: 'monospace',
          pointerEvents: 'none',
          flexWrap: 'wrap'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#f8fafc', fontWeight: 800 }}>
          <span style={{ color: 'var(--cyan)' }}>{ticker || 'GRAFİK'}</span>
          <span>•</span>
          <span style={{ color: '#94a3b8' }}>{activeCandle?.time || ''}</span>
        </div>

        {activeCandle && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>A: <strong style={{ color: '#e2e8f0' }}>{symIcon}{fmt(activeCandle.open)}</strong></span>
            <span>Y: <strong style={{ color: '#34d399' }}>{symIcon}{fmt(activeCandle.high)}</strong></span>
            <span>D: <strong style={{ color: '#f87171' }}>{symIcon}{fmt(activeCandle.low)}</strong></span>
            <span>K: <strong style={{ color: activeCandle.close >= activeCandle.open ? '#34d399' : '#f87171' }}>{symIcon}{fmt(activeCandle.close)}</strong></span>
            <span style={{ color: dayChg >= 0 ? '#34d399' : '#f87171', fontWeight: 700 }}>
              ({dayChg >= 0 ? '+' : ''}{fmt(dayChg, 2)}%)
            </span>
          </div>
        )}

        {showVwap && activeVwap && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#3b82f6' }}>
            <span>VWAP:</span>
            <strong>{symIcon}{fmt(activeVwap)}</strong>
          </div>
        )}

        {showEma && activeEma50 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#38bdf8' }}>
            <span>EMA50:</span>
            <strong>{symIcon}{fmt(activeEma50)}</strong>
          </div>
        )}
      </div>

      <canvas
        ref={canvasRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{ width: '100%', height: '100%', display: 'block', cursor: 'crosshair' }}
      />
    </div>
  );
}
