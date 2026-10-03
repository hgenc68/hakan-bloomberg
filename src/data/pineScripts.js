// Standalone, Modular Pine Script v6 Codes for TradingView
// Each script is tested and ready to paste directly into TradingView's Pine Editor

export const LAZYBEAR_SQUEEZE_MOMENTUM_PINE = `//@version=6
indicator("Squeeze Momentum Indicator [LazyBear]", shorttitle="SQZ_MOM", overlay=false)

// ==========================================
// John Carter / LazyBear Squeeze Momentum
// ==========================================
length = input.int(20, title="Bollinger Bant Uzunluğu (BB)")
mult = input.float(2.0, title="Bollinger Çarpanı")
lengthKC = input.int(20, title="Keltner Kanal Uzunluğu (KC)")
multKC = input.float(1.5, title="Keltner Çarpanı")
useTrueRange = input.bool(true, title="TrueRange Kullan (KC)")

// 1. Bollinger Bantları
source = close
basis = ta.sma(source, length)
dev = mult * ta.stdev(source, length)
upperBB = basis + dev
lowerBB = basis - dev

// 2. Keltner Kanalları
ma = ta.sma(source, lengthKC)
range_1 = useTrueRange ? ta.tr : (high - low)
rangema = ta.sma(range_1, lengthKC)
upperKC = ma + rangema * multKC
lowerKC = ma - rangema * multKC

// 3. Sıkışma (Squeeze) Durumu
sqzOn  = (lowerBB > lowerKC) and (upperBB < upperKC)
sqzOff = (lowerBB < lowerKC) and (upperBB > upperKC)
noSqz  = not sqzOn and not sqzOff

// 4. Doğrusal Regresyon Momentum Değeri
val = ta.linreg(source - math.avg(math.avg(ta.highest(high, lengthKC), ta.lowest(low, lengthKC)), ta.sma(close, lengthKC)), lengthKC, 0)

// 5. 4-Renk Momentum Kuralı
bcolor = val > 0 ? (val > nz(val[1]) ? color.lime : color.green) : (val < nz(val[1]) ? color.red : color.maroon)
scolor = noSqz ? color.blue : (sqzOn ? color.black : color.gray)

// Çizimler
plot(val, color=bcolor, style=plot.style_columns, linewidth=2, title="Momentum Histogramı")
plot(0, color=scolor, style=plot.style_circles, linewidth=2, title="Sıkışma Noktaları (0 Ekseni)")
hline(0, "Sıfır Çizgisi", color=color.gray, linestyle=hline.style_dotted)
`;

export const LONESTAR_WAVETREND_PINE = `//@version=6
indicator("WaveTrend Oscillator [Lonestar]", shorttitle="WT_Lonestar", overlay=false)

// ==========================================
// WaveTrend Oscillator (Lonestar / LazyBear)
// ==========================================
n1 = input.int(10, "Kanal Uzunluğu (Channel Length)")
n2 = input.int(21, "Ortalama Uzunluğu (Average Length)")
obLevel1 = input.int(60, "Aşırı Alım Seviyesi 1")
obLevel2 = input.int(53, "Aşırı Alım Seviyesi 2")
osLevel1 = input.int(-60, "Aşırı Satım Seviyesi 1")
osLevel2 = input.int(-53, "Aşırı Satım Seviyesi 2")

ap = hlc3 
esa = ta.ema(ap, n1)
d = ta.ema(math.abs(ap - esa), n1)
ci = (ap - esa) / (0.015 * d)
tci = ta.ema(ci, n2)
 
wt1 = tci
wt2 = ta.sma(wt1, 4)

// Referans Seviyeleri
hline(0, "Sıfır Denge", color=color.gray, linestyle=hline.style_dotted)
hline(obLevel1, "Aşırı Alım 60", color=color.red, linestyle=hline.style_dashed)
hline(osLevel1, "Aşırı Satım -60", color=color.green, linestyle=hline.style_dashed)
hline(obLevel2, "Aşırı Alım 53", color=color.orange, linestyle=hline.style_dotted)
hline(osLevel2, "Aşırı Satım -53", color=color.lime, linestyle=hline.style_dotted)

// Eğriler
plot(wt1, color=color.lime, title="WT1 (Hızlı)", linewidth=2)
plot(wt2, color=color.red, title="WT2 (Yavaş)", linewidth=2, style=plot.style_dashed)
plot(wt1 - wt2, color=color.new(color.blue, 80), style=plot.style_area, title="WT Fark Bölgesi")

// Kesişim Sinyalleri
cross_up = ta.crossover(wt1, wt2)
cross_dn = ta.crossunder(wt1, wt2)
plot(cross_up ? wt2 : na, title="Dip Kesişim", style=plot.style_circles, color=color.lime, linewidth=3)
plot(cross_dn ? wt2 : na, title="Tepe Kesişim", style=plot.style_circles, color=color.red, linewidth=3)
`;

export const SUPPORT_RESISTANCE_PINE = `//@version=6
indicator("Ayarlanabilir Destek & Direnç Bölgeleri", shorttitle="SR_Zones", overlay=true, max_boxes_count=500)

// ==========================================
// Ranked Support & Resistance Pivot Boxes
// ==========================================
pivotSpan    = input.int(5, "Pivot Çubuk Hassasiyeti (Length)", minval=2, maxval=50)
zoneAtrWidth = input.float(0.40, "Kutu Kalınlığı (ATR Çarpanı)", minval=0.05, maxval=2.0, step=0.05)
visibleLimit = input.int(6, "Gösterilecek Bölge Sayısı", minval=1, maxval=20)
resColor     = input.color(color.rgb(216, 76, 26, 60), "Direnç Kutu Rengi")
supColor     = input.color(color.rgb(26, 216, 194, 60), "Destek Kutu Rengi")

atr = ta.atr(14)
pH = ta.pivothigh(high, pivotSpan, pivotSpan)
pL = ta.pivotlow(low, pivotSpan, pivotSpan)

var box[] rBoxes = array.new<box>()
var box[] sBoxes = array.new<box>()

if not na(pH)
    float topPrice = pH + atr * zoneAtrWidth
    float botPrice = pH - atr * zoneAtrWidth
    box b = box.new(left=bar_index - pivotSpan, top=topPrice, right=bar_index + 30, bottom=botPrice, bgcolor=resColor, border_color=color.rgb(216, 76, 26, 20), text="Direnç", text_color=color.white, text_size=size.tiny)
    array.push(rBoxes, b)
    if array.size(rBoxes) > visibleLimit
        box.delete(array.shift(rBoxes))

if not na(pL)
    float topPrice = pL + atr * zoneAtrWidth
    float botPrice = pL - atr * zoneAtrWidth
    box b = box.new(left=bar_index - pivotSpan, top=topPrice, right=bar_index + 30, bottom=botPrice, bgcolor=supColor, border_color=color.rgb(26, 216, 194, 20), text="Destek", text_color=color.white, text_size=size.tiny)
    array.push(sBoxes, b)
    if array.size(sBoxes) > visibleLimit
        box.delete(array.shift(sBoxes))
`;

export const AUTO_FIBONACCI_PINE = `//@version=6
indicator("Otomatik Fibonacci & Golden Zone", shorttitle="Auto_Fibo", overlay=true, max_lines_count=100, max_boxes_count=100)

// ==========================================
// Otomatik Fibonacci Retracement Engine
// ==========================================
fibLen = input.int(10, "Swing Pivot Uzunluğu", minval=2, maxval=100)
showGolden = input.bool(true, "Golden Zone Dolgusu (0.50 - 0.618)")
showLabels = input.bool(true, "Fiyat Etiketlerini Göster")

pH = ta.pivothigh(high, fibLen, fibLen)
pL = ta.pivotlow(low, fibLen, fibLen)

var float hiPrice = na
var float loPrice = na
var int hiBar = na
var int loBar = na

if not na(pH)
    hiPrice := pH
    hiBar := bar_index - fibLen
if not na(pL)
    loPrice := pL
    loBar := bar_index - fibLen

var line[] lines = array.new<line>()
var box[] boxes = array.new<box>()

if barstate.islast and not na(hiPrice) and not na(loPrice)
    for l in lines
        line.delete(l)
    array.clear(lines)
    for b in boxes
        box.delete(b)
    array.clear(boxes)

    float fRange = hiPrice - loPrice
    int startBar = math.min(hiBar, loBar)

    // Golden Zone (0.500 - 0.618)
    if showGolden
        float gA = loPrice + fRange * 0.500
        float gB = loPrice + fRange * 0.618
        box gz = box.new(left=startBar, top=math.max(gA, gB), right=bar_index + 20, bottom=math.min(gA, gB), bgcolor=color.new(#089981, 80), border_color=na)
        array.push(boxes, gz)

    // Swing Trendline
    line sw = line.new(hiBar, hiPrice, loBar, loPrice, color=color.gray, style=line.style_dashed, width=1)
    array.push(lines, sw)

    // Seviye Çizici Fonksiyon
    drawFib(float r, color c, int w) =>
        float p = loPrice + fRange * r
        line ln = line.new(startBar, p, bar_index + 20, p, color=c, width=w)
        array.push(lines, ln)

    drawFib(1.0, color.gray, 1)
    drawFib(0.786, color.teal, 1)
    drawFib(0.618, color.orange, 2)
    drawFib(0.500, color.red, 2)
    drawFib(0.382, color.orange, 1)
    drawFib(0.236, color.gray, 1)
    drawFib(0.0, color.gray, 1)
`;
