import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Video, 
  Mic, 
  Radio, 
  FileText, 
  Copy, 
  Check, 
  Maximize2, 
  Minimize2, 
  ChevronLeft, 
  ChevronRight, 
  Play, 
  Pause, 
  RotateCcw, 
  Sparkles, 
  Flame, 
  Globe, 
  ShieldAlert, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Coins, 
  Briefcase, 
  Layers, 
  Clock,
  ExternalLink,
  Edit3,
  Sliders,
  Calendar,
  Zap,
  Award
} from 'lucide-react';
import stocksData from '../data/stocksData.json';
import potentialStocksData from '../data/potentialStocksData.json';
import benchmarkData from '../data/benchmarkData.json';

export default function BroadcastStudioTab() {
  const { marketQuotes, portfolioSummary, usdtry } = useApp();

  // Active slide index (0 to 8)
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

  // View Mode: 'split' (Slide + Prompter), 'slides_only' (16:9 Presentation for recording), 'prompter_only' (Teleprompter)
  const [viewMode, setViewMode] = useState('split');

  // Fullscreen state
  const [isFullscreen, setIsFullscreen] = useState(false);
  const presentationContainerRef = useRef(null);

  // Auto-play / Presentation Timer state
  const [isPlaying, setIsPlaying] = useState(false);
  const [slideTimerSec, setSlideTimerSec] = useState(0);
  const [copiedAll, setCopiedAll] = useState(false);
  const [copiedCurrent, setCopiedCurrent] = useState(false);
  const [isEditingScript, setIsEditingScript] = useState(false);

  // Custom user overrides for scripts (persisted in localStorage)
  const [customScripts, setCustomScripts] = useState(() => {
    try {
      const saved = localStorage.getItem('broadcast_studio_custom_scripts');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('broadcast_studio_custom_scripts', JSON.stringify(customScripts));
    } catch (e) {}
  }, [customScripts]);

  // Extract live quotes with robust fallbacks
  const getQ = (key, fallbackPrice, fallbackChange) => {
    const q = marketQuotes[key] || {};
    const price = Number(q.price ?? q.regularMarketPrice ?? fallbackPrice);
    const change = Number(q.changePct ?? q.changePercent ?? q.regularMarketChangePercent ?? fallbackChange);
    return { price, change };
  };

  const dxy = getQ('DXY', 104.25, -0.12);
  const vix = getQ('VIX', 14.80, -1.35);
  const brent = getQ('BRENT', 78.40, 0.65);
  const us10y = getQ('US10Y', 4.28, -0.45);
  const gold = getQ('XAUUSD', 2740.00, 0.38);
  const usdTryRate = usdtry > 0 ? usdtry : 34.25;
  const btc = getQ('BTC-USD', 84620, -1.90);
  const eth = getQ('ETH-USD', 2685, -2.10);
  const total3 = getQ('TOTAL3', 748.5, 2.65);
  const sp500 = getQ('^GSPC', 5860, 0.45);
  const nasdaq = getQ('^IXIC', 18510, 0.62);

  const fmt = (v, d = 2) => (Number(v) || 0).toLocaleString('tr-TR', { minimumFractionDigits: d, maximumFractionDigits: d });

  // 9 Comprehensive Slide Definitions (Macro to Micro)
  const slides = useMemo(() => [
    {
      id: 1,
      badge: 'KÜRESEL MAKRO RADAR',
      badgeColor: 'cyan',
      title: 'Global Piyasa Nabzı & Risk İştahı',
      subtitle: 'Dolar Endeksi, Tahvil Faizleri ve Wall Street Volatilitesi',
      durationEst: '50 sn',
      metrics: [
        { label: 'DXY Dolar Endeksi', val: fmt(dxy.price, 2), chg: dxy.change, isUp: dxy.change >= 0 },
        { label: 'VIX Volatilite (Korku)', val: fmt(vix.price, 2), chg: vix.change, isUp: vix.change >= 0, note: 'Sakin / <15' },
        { label: 'ABD 10Y Tahvil Faizi', val: `%${fmt(us10y.price, 2)}`, chg: us10y.change, isUp: us10y.change >= 0 },
        { label: 'Brent Ham Petrol', val: `$${fmt(brent.price, 2)}`, chg: brent.change, isUp: brent.change >= 0 }
      ],
      infographics: [
        {
          title: '🌐 Likidite & Piyasa Rejimi',
          badge: 'TEMKİNLİ İYİMSER',
          color: '#10b981',
          items: [
            'Dolar endeksi (DXY) 104 bandında dengelenerek riskli varlıklar üzerindeki baskıyı hafifletti.',
            'ABD 10 yıllık tahvil faizlerinin %4.30 altında sakinleşmesi teknoloji hisselerine nefes alanı açtı.',
            'VIX endeksinin 15 eşiğinin altında seyretmesi kurumsal tarafta panik satışının olmadığını doğruluyor.'
          ]
        },
        {
          title: '⚖️ Küresel Çıkarım & Yön',
          badge: 'SERMAYE AKIŞI',
          color: '#38bdf8',
          items: [
            'Sermaye agresif risk almak yerine kaliteli ve nakit akışı güçlü şirketlerde pozisyon koruyor.',
            'Gelişmekte olan ülke piyasalarına (EM) yönelik baskı doların durulmasıyla hafifliyor.'
          ]
        }
      ],
      defaultScript: `Herkese merhaba, piyasalarda son 24 saatin özetine küresel tarafla başlıyoruz. Dolar endeksi tarafında 104 bandı etrafında göreceli bir yataylaşma ve sakinleşme görüyoruz; çünkü piyasa Fed'in faiz patikasında daha temkinli ve temkinli adımlarla ilerleyeceğini büyük oranda fiyatlamış durumda. Bu durulmanın doğrudan bir yansıması olarak ABD 10 yıllık tahvil faizlerinin %4.28 seviyelerinde sakin kalması, küresel hisse senedi piyasalarına ve değerlemelere çok ihtiyaç duyulan bir nefes aldırdı. Nitekim VIX korku endeksinin de 15 seviyesinin hemen altında seyretmesi, kurumsal fonların panik satışı yapmak yerine seçici alımlarla pozisyonlarını koruduğunu gösteriyor.`
    },

    {
      id: 2,
      badge: 'JEOPOLİTİK RADAR & ENERJİ',
      badgeColor: 'rose',
      title: 'Jeopolitik Riskler & Küresel Yayılma Etkisi',
      subtitle: 'Hürmüz & Kızıldeniz Koridoru, Navlun Maliyetleri ve Petrol Arzı',
      durationEst: '60 sn',
      metrics: [
        { label: 'Brent Petrol', val: `$${fmt(brent.price, 2)}`, chg: brent.change, isUp: brent.change >= 0 },
        { label: 'Ons Altın Risk Primi', val: `$${fmt(gold.price, 0)}`, chg: gold.change, isUp: gold.change >= 0 },
        { label: 'Navlun Risk Katsayısı', val: '+14.2%', chg: 2.1, isUp: true, note: 'Kızıldeniz' },
        { label: 'Enerji Enflasyon Riski', val: 'Orta / Yüksek', chg: 0, isUp: true }
      ],
      infographics: [
        {
          title: '⚡ Sıcak Bölgeler & Tedarik Hatları',
          badge: 'YAYILMA RİSKİ',
          color: '#ef4444',
          items: [
            'Ortadoğu ve Kızıldeniz eksenindeki gerilimler navlun ve sigorta maliyetlerini canlı tutuyor.',
            'Petrol fiyatlarındaki 75-80 dolar tabanı, manşet enflasyonun düşüş hızını yavaşlatma riski taşıyor.',
            'Tedarik zincirindeki gecikmeler özellikle Avrupa sanayisinde marj baskısını sürdürüyor.'
          ]
        },
        {
          title: '🔄 Zincirleme Piyasa Mekanizması',
          badge: 'NEDEN - SONUÇ',
          color: '#f59e0b',
          items: [
            'Jeopolitik Gerilim ➔ Petrol/Navlun Artışı ➔ Yapışkan Enflasyon ➔ Geciken Faiz İndirimleri ➔ Değerleme Baskısı.',
            'Bu zincirleme etki güvenli liman olan ons altın ve dolara taban desteği oluşturmaya devam ediyor.'
          ]
        }
      ],
      defaultScript: `Tabii küresel tabloyu değerlendirirken jeopolitik riskleri ve bunların piyasaya yayılma etkisini göz ardı etmek imkansız. Özellikle Ortadoğu ve Kızıldeniz hattındaki gerilimler, navlun ve deniz sigorta primlerini diri tuttuğu için brent petrolün 75 doların altına kalıcı inmesine izin vermiyor. Bu durumun piyasalar açısından kritik sonucu şu: Enerji maliyetleri canlı kaldığı sürece manşet enflasyonun düşüş hızı yavaşlıyor ve merkez bankaları faizleri beklenenden daha uzun süre yüksek tutmak zorunda kalıyor. Dolayısıyla jeopolitikteki her tansiyon artışı, dolaylı yoldan tahvil faizlerini yukarı çekerek hisse senedi çarpanları üzerinde otomatik bir fren mekanizması oluşturuyor.`
    },

    {
      id: 3,
      badge: 'MERKEZ BANKALARI & LİKİDİTE',
      badgeColor: 'amber',
      title: 'Merkez Bankaları & Küresel Likidite Dengesi',
      subtitle: 'Fed Faiz İndirim Beklentisi, Enflasyon Patikası ve TCMB Duruşu',
      durationEst: '55 sn',
      metrics: [
        { label: 'Fed 25 Bp İndirim Olasılığı', val: '%88.5', chg: 1.2, isUp: true },
        { label: 'ABD Çekirdek TÜFE Beklenti', val: '%2.7', chg: -0.1, isUp: false },
        { label: 'ECB Faiz Politikası', val: 'Gevşeme', chg: -0.25, isUp: false },
        { label: 'TCMB Politika Duruşu', val: 'Sıkı / Kararlı', chg: 0, isUp: true }
      ],
      infographics: [
        {
          title: '🏦 Fed & Küresel Gevşeme Senaryosu',
          badge: 'SOFT LANDING',
          color: '#34d399',
          items: [
            'Fed yetkilileri "aceleci olmayacağız" mesajıyla yumuşak iniş (Soft Landing) senaryosunu koruyor.',
            'Avrupa Merkez Bankası (ECB) zayıflayan sanayi üretimi nedeniyle daha agresif faiz indirimine zorlanıyor.',
            'Piyasa artık faiz indirimlerinin miktarından ziyade ne kadar süreye yayılacağına odaklanmış durumda.'
          ]
        },
        {
          title: '🇹🇷 TCMB & Türk Lirası Dengesi',
          badge: 'POZİTİF REEL GETİRİ',
          color: '#06b6d4',
          items: [
            'TCMB sıkı para politikasını sürdürerek TL varlıklardaki pozitif reel getiri cazibesini koruyor.',
            'Rezerv birikimi ve cari dengedeki toparlanma kur tarafındaki oynaklığı sınırlı tutuyor.'
          ]
        }
      ],
      defaultScript: `Merkez bankaları cephesine geçtiğimizde ise likidite dengelerinin çok hassas bir dengede ilerlediğini görüyoruz. Fed yetkililerinden gelen son mesajlar, istihdam piyasası çökmedikçe aceleci ve agresif faiz indirimlerine gitmeyeceklerine işaret ediyor. Nitekim piyasanın bu 'daha yüksek faiz, daha uzun süre' duruşunu sindirmesiyle birlikte, küresel para akışının son derece seçici davrandığını ve özellikle borçluluğu düşük, serbest nakit akışı kuvvetli şirketlere sığındığını gözlemliyoruz. TCMB tarafında ise sıkı duruşun kararlılıkla korunması, TL cinsi mevduat ve enstrümanlardaki reel getiri avantajını canlı tutmaya devam ediyor.`
    },

    {
      id: 4,
      badge: 'WALL STREET & TEKNOLOJİ',
      badgeColor: 'emerald',
      title: 'Wall Street & ABD Teknoloji Borsaları',
      subtitle: 'S&P 500, Nasdaq, Yarı İletken Sektörü ve Mega-Cap Hisseler',
      durationEst: '55 sn',
      metrics: [
        { label: 'S&P 500 (SPY)', val: fmt(sp500.price, 0), chg: sp500.change, isUp: sp500.change >= 0 },
        { label: 'Nasdaq 100 (QQQ)', val: fmt(nasdaq.price, 0), chg: nasdaq.change, isUp: nasdaq.change >= 0 },
        { label: 'Yarı İletken (SOXX)', val: '$224.5', chg: 1.15, isUp: true },
        { label: 'Piyasa Genişliği (Breadth)', val: 'Pozitif', chg: 0.8, isUp: true }
      ],
      infographics: [
        {
          title: '🤖 Yapay Zeka & Çip Omurgası',
          badge: 'CAPEX PATLAMASI',
          color: '#10b981',
          items: [
            'Nvidia, TSMC ve Broadcom liderliğindeki veri merkezi harcamaları yavaşlama belirtisi göstermiyor.',
            'Teknoloji devlerinde yaşanan geri çekilmeler temel zafiyetten değil, kâr realizasyonundan kaynaklanıyor.',
            'Sıvı soğutma ve elektrik altyapısı (Vertiv, Astera Labs) yapay zekanın yeni kazananı konumunda.'
          ]
        },
        {
          title: '📊 Sektörel Rotasyon Dinamiği',
          badge: 'KÂR REALİZASYONU',
          color: '#a855f7',
          items: [
            'Büyük 7\'liden çıkan likiditenin bir kısmı defansif sağlık ve temettü devlerine (AbbVie, Exxon) kayıyor.',
            'Bu rotasyon rallinin çökmesi değil, piyasanın tabana yayılarak olgunlaşması anlamına geliyor.'
          ]
        }
      ],
      defaultScript: `Wall Street tarafına baktığımızda ise teknoloji liderliğinde sağlıklı bir konsolidasyon süreci izliyoruz. S&P 500 ve Nasdaq'ta son günlerde yaşanan dalgalanmanın arkasında temel bir çöküş yok; asıl neden, çip rallisi sonrasında aşırı yükselen değerlemelerin tahvil faizleriyle test edilmesi ve kurumsal kâr realizasyonlarıdır. Nitekim Nvidia ve TSMC gibi omurga şirketlerin sipariş defterleri dolup taşarken, piyasanın artık sadece çip üreticilerini değil; sıvı soğutma, enerji altyapısı ve bağlantı çiplerini de radarına aldığını görüyoruz. Bu sektörel rotasyon, rallinin tek bir hisseye bağımlı kalmayıp tabana yayılması açısından oldukça sağlıklı bir gelişme.`
    },

    {
      id: 5,
      badge: 'BORSA İSTANBUL & BIST 100',
      badgeColor: 'cyan',
      title: 'Borsa İstanbul (BIST 100) & Sektörel Ayrışma',
      subtitle: 'XU100 Endeks Seviyeleri, Para Girişi ve Ayrışan Sektörler',
      durationEst: '55 sn',
      metrics: [
        { label: 'BIST 100 (XU100)', val: '9,850 - 10,200', chg: 0.65, isUp: true },
        { label: 'Dolar Bazlı BIST', val: '$2.88', chg: 0.45, isUp: true },
        { label: 'USD/TRY Kuru', val: `${fmt(usdTryRate, 2)}₺`, chg: 0.15, isUp: true },
        { label: 'Öne Çıkan Sektör', val: 'Ulaştırma & Havacılık', chg: 1.8, isUp: true }
      ],
      infographics: [
        {
          title: '🇹🇷 BIST 100 İtici Güçleri',
          badge: 'SEÇİCİ PİYASA',
          color: '#06b6d4',
          items: [
            'Endeks genelinde yatay-dalgalı bir bant görülürken, hisse bazında çok ciddi ayrışmalar yaşanıyor.',
            'Yüksek faiz nedeniyle borçlu sanayi şirketleri baskılanırken, nakit zengini şirketler öne çıkıyor.',
            'Ulaştırma (THYAO), perakende (BIMAS) ve savunma (ASELS) defansif güçleriyle endeksi tutuyor.'
          ]
        },
        {
          title: '🎯 Kritik Seviyeler & Yabancı İştahı',
          badge: 'STRATEJİ',
          color: '#f59e0b',
          items: [
            'BIST 100\'de 9.600 - 9.800 bölgesi ana destek; 10.200 - 10.400 bandı ise ilk güçlü direnç olarak izleniyor.',
            'Yabancı sermaye girişi öncelikle derinliği yüksek likit BIST 30 hisselerine yoğunlaşıyor.'
          ]
        }
      ],
      defaultScript: `Yurtiçine, Borsa İstanbul tarafına döndüğümüzde ise endekste seçici bir piyasa yapısının öne çıktığını görüyoruz. BIST 100'de genel endeks yatay veya dalgalı görünse bile, hisse bazında çok ciddi bir ayrışma var. Çünkü yüksek faiz ve parasal sıkılaşma ortamında borçluluğu yüksek sanayi şirketleri finansman maliyeti baskısı hissederken; kasasında net nakit bulunan, döviz geliri yaratan ve ulaştırma ya da savunma gibi defansif hikayesi olan şirketler güçlü kalmayı başarıyor. Dolayısıyla endeksin genel yönünden ziyade doğru şirkette olmanın kazandırdığı, hisse seçiciliğinin en kritik olduğu bir dönemden geçiyoruz.`
    },

    {
      id: 6,
      badge: 'DEĞERLİ METALLER & EMTİA',
      badgeColor: 'amber',
      title: 'Değerli Metaller: Altın & Gümüş Dinamikleri',
      subtitle: 'Ons Altın, Fiziki Gram ve Altın/Gümüş Rasyosu',
      durationEst: '50 sn',
      metrics: [
        { label: 'Ons Altın Spot ($)', val: `$${fmt(gold.price, 2)}`, chg: gold.change, isUp: gold.change >= 0 },
        { label: 'Gram Altın (Kapalıçarşı)', val: `${fmt(gold.price * (usdTryRate / 31.1035), 0)}₺`, chg: 0.45, isUp: true },
        { label: 'Ons Gümüş (XAG)', val: '$33.40', chg: 0.85, isUp: true },
        { label: 'Altın / Gümüş Rasyosu', val: '82.0', chg: -0.4, isUp: false, note: 'Gümüş lehine' }
      ],
      infographics: [
        {
          title: '🥇 Altının Çift Motorlu Gücü',
          badge: 'GÜVENLİ LİMAN',
          color: '#f59e0b',
          items: [
            'Doların güçlü kaldığı günlerde dahi ons altının dirençli kalmasının sebebi merkez bankası alımlarıdır.',
            'Çin, Hindistan ve gelişmekte olan merkez bankaları dolardan bağımsız rezerv inşasını sürdürüyor.',
            'Gram altın yatırımcısı hem ons artışından hem de kurdan dolayı çifte enflasyon kalkanına sahip.'
          ]
        },
        {
          title: '🥈 Gümüş & Sanayi Talebi',
          badge: 'ASİMETRİK FIRSAT',
          color: '#94a3b8',
          items: [
            'Gümüş sadece bir kıymetli metal değil; güneş paneli ve elektrikli araç elektroniğinde vazgeçilmez girdi.',
            'Altın/Gümüş rasyosunun 80 üzerine çıkması geçmişte hep gümüşte sert telafi yükselişlerini tetikledi.'
          ]
        }
      ],
      defaultScript: `Emtia ve değerli metaller tarafında ise altının neden bu kadar dirençli durduğunu iyi okumak gerekiyor. Ons altın, doların güçlü kaldığı günlerde bile sert satış yemiyor; çünkü arkasında sadece bireysel yatırımcı değil, rezervlerini dolardan arındırmak isteyen küresel merkez bankalarının kesintisiz alım dalgası var. Buna bir de jeopolitik risk primi eklendiğinde, geri çekilmeler kurumsal alıcılar tarafından hemen değerlendiriliyor. Gümüş tarafında ise altına kıyasla hem sanayi hem de yeşil enerji talebinin devreye girmesiyle rasyonun gümüş lehine dönebileceği bir süreci takip ediyoruz.`
    },

    {
      id: 7,
      badge: 'KRİPTO VARLIKLAR & LİKİDİTE',
      badgeColor: 'purple',
      title: 'Kripto Varlıklar & Altcoin Likidite Döngüsü',
      subtitle: 'Bitcoin ETF Girişleri, Dominans ve TOTAL3 Altcoin Endeksi',
      durationEst: '50 sn',
      metrics: [
        { label: 'Bitcoin (BTC)', val: `$${fmt(btc.price, 0)}`, chg: btc.change, isUp: btc.change >= 0 },
        { label: 'Ethereum (ETH)', val: `$${fmt(eth.price, 0)}`, chg: eth.change, isUp: eth.change >= 0 },
        { label: 'TOTAL3 Altcoin Hacmi', val: `$${fmt(total3.price, 1)}B`, chg: total3.change, isUp: total3.change >= 0 },
        { label: 'BTC Dominans', val: '%57.8', chg: -0.2, isUp: false }
      ],
      infographics: [
        {
          title: '⚡ Kurumsal ETF Musluğu',
          badge: 'DİJİTAL ALTIN',
          color: '#8b5cf6',
          items: [
            'Spot ETF girişleri Bitcoin\'i geleneksel portföylerin standart bir parçası haline getirdi.',
            'Kurumsal rezerv stratejileri Bitcoin taban fiyatını geçmiş döngülere göre çok daha sağlam kılıyor.'
          ]
        },
        {
          title: '🔮 Altcoin Piyasası (TOTAL3)',
          badge: 'SEÇİCİ YÜKSELİŞ',
          color: '#ec4899',
          items: [
            'Sermaye henüz tüm altcoinlere yayılmış değil; hacimler Layer 1 (Sui, Solana) ve DeSci projelerinde.',
            'Küresel faiz indirimleri hızlandıkça likiditenin altcoinlere taşması döngüsel olarak bekleniyor.'
          ]
        }
      ],
      defaultScript: `Kripto varlıklar tarafına baktığımızda ise sahada iki farklı dinamiğin çalıştığını görüyoruz. Bir yanda kurumsal spot ETF'lerin sağladığı düzenli girişlerle dijital altın anlatısını güçlendiren bir Bitcoin var; diğer yanda ise küresel likiditeyi sabırla bekleyen bir altcoin piyasası. TOTAL3 grafiği bize sermayenin henüz genele yayılmadığını, daha çok gerçek kullanım alanı olan yapay zeka, DeSci ve yeni nesil ekosistemlerde toplandığını gösteriyor. Küresel merkez bankaları faiz indirimlerini hızlandırdıkça, risk iştahının ilk adreslerinden birinin kripto olacağını unutmamak lazım.`
    },

    {
      id: 8,
      badge: 'ŞİRKET & SEKTÖR MANŞETLERİ',
      badgeColor: 'cyan',
      title: 'Öne Çıkan Şirket Haberleri & Temel Fırsatlar',
      subtitle: 'Son 24 Saatin Kritik Bilanço, Sipariş ve Değerleme Manşetleri',
      durationEst: '55 sn',
      metrics: [
        { label: 'Nvidia (NVDA)', val: '$141.2', chg: 1.85, isUp: true, note: 'Blackwell Talep' },
        { label: 'TSMC (TSM)', val: '$198.4', chg: 2.10, isUp: true, note: '3nm Kapasite' },
        { label: 'THYAO (BIST)', val: '₺298.5', chg: 1.45, isUp: true, note: 'Kargo & Yolcu' },
        { label: 'Palantir (PLTR)', val: '$44.8', chg: 3.20, isUp: true, note: 'Kurumsal AIP' }
      ],
      infographics: [
        {
          title: '📈 Mikro Şirket Hikayeleri',
          badge: 'BÜYÜME & MARJ',
          color: '#10b981',
          items: [
            'Şirket seçerken sadece ciro büyümesi değil; FAVÖK marjını koruyabilen iş modelleri öne çıkıyor.',
            'Yapay zeka altyapısına doğrudan donanım satan şirketler en güçlü serbest nakit akışını üretiyor.',
            'BIST tarafında ihracat oranı yüksek ve kur riski taşımayan şirketler güvenli liman işlevi görüyor.'
          ]
        },
        {
          title: '💎 Değerleme & DCF İskontosu',
          badge: 'FIRSAT RADARI',
          color: '#38bdf8',
          items: [
            'Piyasanın aşırı cezalandırdığı kaliteli şirketlerde orta vadeli güvenlik marjları (Margin of Safety) oluşuyor.',
            'Doğru hisse seçimi, endeksin yatay gittiği dönemlerde bile asimetrik getiri sunabiliyor.'
          ]
        }
      ],
      defaultScript: `Şirket haberleri ve sektörel gelişmelere odaklandığımızda ise hikayenin mikro detaylarda gizli olduğunu görüyoruz. Piyasada genel bir ralli beklemek yerine, kendi özel hikayesini yazan ve kâr marjlarını enflasyonun üzerinde büyüten şirketlere odaklanmak gerekiyor. Nitekim son 24 saatte açıklanan kurumsal adımlara baktığımızda, sadece teknoloji tarafında değil; enerji verimliliği sağlayan sanayi şirketlerinde ve stratejik altyapı oyuncularında çok ciddi kurumsal alımların sürdüğünü görüyoruz. Bu da bize doğru hisse seçiminin neden endeks tahmininden çok daha kıymetli olduğunu bir kez daha kanıtlıyor.`
    },

    {
      id: 9,
      badge: 'STRATEJİ & TAKVİM',
      badgeColor: 'rose',
      title: 'Kapanış & Takip Edilecek Kritik Takvim',
      subtitle: 'Önümüzdeki 48 Saatin Manşetleri, Risk Yönetimi ve Portföy Duruşu',
      durationEst: '45 sn',
      metrics: [
        { label: 'Takip Edilecek Veri', val: 'ABD İstihdam & TÜFE', chg: 0, isUp: true },
        { label: 'Fed Konuşmacıları', val: '4 Üye', chg: 0, isUp: true },
        { label: 'Portföy Duruşu', val: 'Dengeli & Korumalı', chg: 0, isUp: true },
        { label: 'Nakit Gücü Oranı', val: '%20 - %25', chg: 0, isUp: true }
      ],
      infographics: [
        {
          title: '📅 48 Saatlik Kritik Ekonomik Takvim',
          badge: 'VOLATİLİTE UYARISI',
          color: '#f59e0b',
          items: [
            'ABD istihdam ve enflasyon verileri piyasada kısa vadeli sert dalgalanmalara zemin hazırlayabilir.',
            'TCMB Para Politikası Kurulu tutanakları ve sektörel kredi büyüme verileri yakından izlenecek.',
            'Büyük teknoloji bilançoları öncesinde volatiliteye karşı kâr koruma stop-loss seviyeleri güncellenmeli.'
          ]
        },
        {
          title: '🛡️ Portföy Pusulası & Mesaj',
          badge: 'RİSK YÖNETİMİ',
          color: '#10b981',
          items: [
            'Kademeli alım disiplinini koruyun; panik veya FOMO ile yapılan işlemlerden kesinlikle kaçının.',
            'Portföyde nakit ve likit kalkan bulundurmak, olası geri çekilmelerde en büyük gücünüz olacaktır.'
          ]
        }
      ],
      defaultScript: `Toparlayacak olursak; önümüzdeki günlerde piyasaların gözü kulağı açıklanacak olan enflasyon ve istihdam verilerinde olacak. Bu kritik veriler gelene kadar gün içi dalgalanmaların ve kâr realizasyonlarının sürmesi son derece doğal. Bu nedenle her zaman altını çizdiğimiz gibi, ani fiyat hareketlerine kapılmadan, portföydeki nakit dengesini ve risk dağılımını koruyarak ilerlemek en sağlıklı strateji olacaktır. Gelişmeleri adım adım takip edip analiz etmeye devam edeceğiz. Kanalımıza abone olmayı ve görüşlerinizi yorumlarda paylaşmayı unutmayın, bir sonraki yayında görüşmek üzere!`
    }
  ], [dxy, vix, us10y, brent, gold, usdTryRate, btc, eth, total3, sp500, nasdaq]);

  const activeSlide = slides[currentSlideIndex];

  // Current active script (either custom user edited or default generated)
  const activeScript = customScripts[activeSlide.id] !== undefined 
    ? customScripts[activeSlide.id] 
    : activeSlide.defaultScript;

  // Handle script edit
  const handleScriptChange = (val) => {
    setCustomScripts(prev => ({
      ...prev,
      [activeSlide.id]: val
    }));
  };

  const handleResetCurrentScript = () => {
    setCustomScripts(prev => {
      const copy = { ...prev };
      delete copy[activeSlide.id];
      return copy;
    });
  };

  // Build full clean Word/prompter document text
  const fullDocumentText = useMemo(() => {
    let out = `# YOUTUBE PİYASA BRİFİNGİ & YAYIN METNİ\n`;
    out += `Tarih: ${new Date().toLocaleDateString('tr-TR')} • Tahmini Toplam Süre: ~7.5 - 8 Dakika\n`;
    out += `Format: Makrodan Mikroya 9 Slayt • Doğal Akışlı Neden-Sonuç Anlatımı\n\n`;
    out += `================================================================================\n\n`;

    slides.forEach((s, idx) => {
      const script = customScripts[s.id] !== undefined ? customScripts[s.id] : s.defaultScript;
      out += `SLAYT ${s.id}: ${s.title.toUpperCase()}\n`;
      out += `Alt Başlık: ${s.subtitle} • Tahmini Süre: ${s.durationEst}\n`;
      out += `Öne Çıkan Rakamlar: ${s.metrics.map(m => `${m.label}: ${m.val}`).join(' | ')}\n\n`;
      out += `🎙️ KONUŞMA METNİ:\n`;
      out += `"${script}"\n\n`;
      out += `--------------------------------------------------------------------------------\n\n`;
    });

    return out;
  }, [slides, customScripts]);

  const handleCopyAll = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(fullDocumentText).then(() => {
        setCopiedAll(true);
        setTimeout(() => setCopiedAll(false), 3000);
      });
    }
  };

  const handleCopyCurrent = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(activeScript).then(() => {
        setCopiedCurrent(true);
        setTimeout(() => setCopiedCurrent(false), 2500);
      });
    }
  };

  // Keyboard Navigation: ArrowLeft / ArrowRight / Space
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (isEditingScript) return; // Don't hijack keyboard while typing

      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        setCurrentSlideIndex(prev => (prev < slides.length - 1 ? prev + 1 : 0));
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setCurrentSlideIndex(prev => (prev > 0 ? prev - 1 : slides.length - 1));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [slides.length, isEditingScript]);

  // Fullscreen Presentation Mode
  const togglePresentationFullscreen = () => {
    if (!presentationContainerRef.current) return;
    if (!document.fullscreenElement) {
      presentationContainerRef.current.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch(err => {
        console.warn('Fullscreen request failed:', err);
      });
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      }).catch(err => {
        console.warn('Exit fullscreen failed:', err);
      });
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  return (
    <div className="tab-pane-content" style={{ animation: 'fadeIn 0.25s ease', display: 'flex', flexDirection: 'column', gap: 12 }}>
      
      {/* 🌟 Top Studio Header Bar */}
      <div 
        className="card" 
        style={{ 
          padding: '12px 18px', 
          background: 'linear-gradient(135deg, rgba(8, 12, 22, 0.98), rgba(15, 23, 42, 0.95))', 
          border: '1px solid rgba(244, 63, 94, 0.35)', 
          borderRadius: 8,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(244, 63, 94, 0.15)', border: '1px solid rgba(244, 63, 94, 0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fb7185' }}>
            <Radio size={20} className="animate-pulse" />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 13.5, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>YAYIN & BRİFİNG STÜDYOSU</span>
              <span className="nav-badge rose" style={{ fontSize: 9.5, padding: '2px 7px', background: 'rgba(244, 63, 94, 0.2)', color: '#fda4af', border: '1px solid rgba(244, 63, 94, 0.4)' }}>
                YOUTUBE PROMPTER • 16:9 SLAYT
              </span>
            </div>
            <div style={{ fontSize: 10.5, color: 'var(--text-muted)', marginTop: 1 }}>
              Makrodan Mikroya 9 Slaytlık TV Sunumu • Doğal Neden-Sonuç Konuşma Metni • ~7-8 Dakika
            </div>
          </div>
        </div>

        {/* Studio Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          
          {/* View Mode Switcher */}
          <div style={{ display: 'inline-flex', background: 'rgba(0,0,0,0.6)', borderRadius: 6, padding: 2, border: '1px solid rgba(255,255,255,0.1)' }}>
            <button
              type="button"
              onClick={() => setViewMode('split')}
              className={`chip-btn ${viewMode === 'split' ? 'active' : ''}`}
              style={{ fontSize: 10, padding: '4px 9px', fontWeight: viewMode === 'split' ? 700 : 500 }}
              title="Sol panelde slayt, sağ panelde prompter metni"
            >
              <Layers size={11} style={{ marginRight: 4 }} />
              <span>Bölünmüş Mod</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('slides_only')}
              className={`chip-btn ${viewMode === 'slides_only' ? 'active' : ''}`}
              style={{ fontSize: 10, padding: '4px 9px', fontWeight: viewMode === 'slides_only' ? 700 : 500 }}
              title="Yalnızca 16:9 slaytları göster (Ekran kaydı için ideal)"
            >
              <Video size={11} style={{ marginRight: 4 }} />
              <span>Sadece Slayt</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('prompter_only')}
              className={`chip-btn ${viewMode === 'prompter_only' ? 'active' : ''}`}
              style={{ fontSize: 10, padding: '4px 9px', fontWeight: viewMode === 'prompter_only' ? 700 : 500 }}
              title="Yalnızca büyük konuşma metnini göster (İkinci ekran prompterı)"
            >
              <Mic size={11} style={{ marginRight: 4 }} />
              <span>Prompter Ekranı</span>
            </button>
          </div>

          {/* Copy Full Word Document Button */}
          <button
            type="button"
            onClick={handleCopyAll}
            className="btn-primary"
            style={{ 
              fontSize: 10.5, 
              padding: '5px 12px', 
              display: 'flex', 
              alignItems: 'center', 
              gap: 5,
              background: copiedAll ? '#10b981' : 'linear-gradient(135deg, #e11d48, #be123c)',
              borderColor: copiedAll ? '#10b981' : '#f43f5e',
              fontWeight: 700,
              boxShadow: '0 2px 8px rgba(225, 29, 72, 0.3)'
            }}
            title="Tüm slaytların konuşma metnini başlıklarıyla birlikte kopyalar (Word'e yapıştırmaya hazır)"
          >
            {copiedAll ? <Check size={13} /> : <Copy size={13} />}
            <span>{copiedAll ? 'Word Metni Kopyalandı!' : 'Tüm Metni Kopyala (Word)'}</span>
          </button>

          {/* Fullscreen Button */}
          <button
            type="button"
            onClick={togglePresentationFullscreen}
            className="chip-btn"
            style={{ fontSize: 10, padding: '5px 10px', display: 'flex', alignItems: 'center', gap: 4, borderColor: 'var(--cyan)', color: 'var(--cyan)', fontWeight: 700 }}
            title="Slaytları 16:9 tam ekran sunum moduna al (F11 / Native Fullscreen)"
          >
            {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
            <span>{isFullscreen ? 'Küçült' : '⛶ Tam Ekran'}</span>
          </button>
        </div>
      </div>

      {/* 🧭 Slide Selector Navigation Pills */}
      <div 
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 6, 
          overflowX: 'auto', 
          padding: '6px 2px',
          scrollbarWidth: 'none'
        }}
      >
        {slides.map((s, idx) => {
          const isActive = currentSlideIndex === idx;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => setCurrentSlideIndex(idx)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 12px',
                borderRadius: 6,
                background: isActive ? 'rgba(244, 63, 94, 0.2)' : 'rgba(15, 23, 42, 0.6)',
                border: `1px solid ${isActive ? '#f43f5e' : 'rgba(255, 255, 255, 0.08)'}`,
                color: isActive ? '#fecdd3' : '#94a3b8',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease'
              }}
            >
              <span 
                style={{ 
                  width: 18, 
                  height: 18, 
                  borderRadius: '50%', 
                  background: isActive ? '#f43f5e' : 'rgba(255,255,255,0.1)', 
                  color: isActive ? '#fff' : '#cbd5e1',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 10,
                  fontWeight: 800
                }}
              >
                {s.id}
              </span>
              <span style={{ fontSize: 10.5, fontWeight: isActive ? 800 : 600 }}>
                {s.title.split('&')[0].trim()}
              </span>
              <span style={{ fontSize: 8.5, color: isActive ? '#fda4af' : '#64748b' }}>
                ({s.durationEst})
              </span>
            </button>
          );
        })}
      </div>

      {/* 🎬 Main Workspace Layout (Slide + Prompter) */}
      <div 
        ref={presentationContainerRef}
        style={{ 
          display: 'grid', 
          gridTemplateColumns: viewMode === 'split' ? 'minmax(560px, 1.35fr) minmax(380px, 1fr)' : '1fr', 
          gap: 14,
          alignItems: 'stretch',
          background: isFullscreen ? '#040711' : 'transparent',
          padding: isFullscreen ? 16 : 0,
          borderRadius: 8
        }}
      >
        
        {/* ========================================================================= */}
        {/* 📺 LEFT: 16:9 PRESENTATION SLIDE DISPLAY                                  */}
        {/* ========================================================================= */}
        {viewMode !== 'prompter_only' && (
          <div 
            style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              background: 'linear-gradient(145deg, #070c18, #0b1329)', 
              border: '1px solid rgba(255, 255, 255, 0.1)', 
              borderRadius: 10, 
              overflow: 'hidden',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.45)',
              position: 'relative',
              minHeight: isFullscreen ? 'calc(100vh - 32px)' : 600
            }}
          >
            {/* Slide Top TV Watermark Bar */}
            <div 
              style={{ 
                padding: '10px 18px', 
                background: 'rgba(4, 7, 17, 0.85)', 
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center' 
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="nav-badge rose" style={{ fontSize: 9.5, fontWeight: 800 }}>
                  SLAYT {activeSlide.id} / {slides.length}
                </span>
                <span style={{ fontSize: 10, color: 'var(--cyan)', fontWeight: 700, letterSpacing: '0.04em' }}>
                  {activeSlide.badge}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                  ⏱️ {activeSlide.durationEst}
                </span>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444' }} className="animate-pulse" title="Canlı Veri Beslemesi" />
                <span style={{ fontSize: 10, fontWeight: 800, color: '#f8fafc', letterSpacing: '0.05em' }}>
                  MARKET RADAR TV
                </span>
              </div>
            </div>

            {/* Slide Core Content (16:9 Aspect Ratio Look) */}
            <div style={{ flex: 1, padding: '24px 28px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              
              {/* Header Titles */}
              <div>
                <h1 style={{ fontSize: 'clamp(20px, 2.4vw, 28px)', fontWeight: 900, color: '#ffffff', margin: 0, letterSpacing: '-0.02em', lineHeight: 1.2 }}>
                  {activeSlide.title}
                </h1>
                <p style={{ fontSize: 'clamp(12px, 1.2vw, 14px)', color: '#94a3b8', margin: '6px 0 18px 0' }}>
                  {activeSlide.subtitle}
                </p>

                {/* 4 Big KPI Metric Chips */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10, marginBottom: 20 }}>
                  {activeSlide.metrics.map((m, idx) => (
                    <div 
                      key={idx}
                      style={{ 
                        padding: '10px 14px', 
                        background: 'rgba(15, 23, 42, 0.75)', 
                        border: '1px solid rgba(255, 255, 255, 0.08)', 
                        borderRadius: 8,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center'
                      }}
                    >
                      <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600 }}>
                        {m.label}
                      </div>
                      <div style={{ fontSize: 17, fontWeight: 800, color: '#ffffff', marginTop: 2, fontFamily: 'monospace' }}>
                        {m.val}
                      </div>
                      {m.chg !== undefined && m.chg !== 0 && (
                        <div style={{ fontSize: 10, fontWeight: 700, color: m.isUp ? '#34d399' : '#f87171', display: 'flex', alignItems: 'center', gap: 3, marginTop: 2 }}>
                          {m.isUp ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                          <span>{m.isUp ? '+' : ''}{fmt(m.chg, 2)}%</span>
                        </div>
                      )}
                      {m.note && (
                        <div style={{ fontSize: 9, color: 'var(--cyan)', marginTop: 2, fontWeight: 600 }}>
                          {m.note}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Visual Blocks & Infographic Bullets */}
                <div style={{ display: 'grid', gridTemplateColumns: activeSlide.infographics.length > 1 ? 'repeat(2, 1fr)' : '1fr', gap: 14 }}>
                  {activeSlide.infographics.map((info, idx) => (
                    <div 
                      key={idx}
                      style={{ 
                        padding: '16px 18px', 
                        background: 'rgba(6, 11, 23, 0.65)', 
                        border: `1px solid ${info.color}35`, 
                        borderRadius: 8,
                        display: 'flex',
                        flexDirection: 'column'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <span style={{ fontSize: 12, fontWeight: 800, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: 6 }}>
                          {info.title}
                        </span>
                        <span style={{ fontSize: 9, fontWeight: 800, padding: '2px 7px', borderRadius: 4, background: `${info.color}20`, color: info.color, border: `1px solid ${info.color}50` }}>
                          {info.badge}
                        </span>
                      </div>

                      <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {info.items.map((item, iIdx) => (
                          <li key={iIdx} style={{ fontSize: 'clamp(11.5px, 1.1vw, 13px)', color: '#cbd5e1', lineHeight: 1.45 }}>
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>

              {/* Slide Bottom Bar with Presenter Controls */}
              <div 
                style={{ 
                  marginTop: 20, 
                  paddingTop: 14, 
                  borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center' 
                }}
              >
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    type="button"
                    onClick={() => setCurrentSlideIndex(prev => (prev > 0 ? prev - 1 : slides.length - 1))}
                    className="chip-btn"
                    style={{ fontSize: 11, padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 4 }}
                    title="Önceki Slayt (Sol Ok)"
                  >
                    <ChevronLeft size={14} />
                    <span>Önceki Slayt</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentSlideIndex(prev => (prev < slides.length - 1 ? prev + 1 : 0))}
                    className="chip-btn active"
                    style={{ fontSize: 11, padding: '6px 14px', display: 'flex', alignItems: 'center', gap: 4, background: '#f43f5e', borderColor: '#f43f5e', color: '#fff', fontWeight: 700 }}
                    title="Sonraki Slayt (Sağ Ok veya Boşluk)"
                  >
                    <span>Sonraki Slayt</span>
                    <ChevronRight size={14} />
                  </button>
                </div>

                <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                  💡 Klavye Kısayolu: <strong>[Sağ Ok]</strong> İleri / <strong>[Sol Ok]</strong> Geri
                </div>
              </div>

            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 🎙️ RIGHT: TELEPROMPTER / SPEECH SCRIPT PANEL                              */}
        {/* ========================================================================= */}
        {viewMode !== 'slides_only' && (
          <div 
            className="card" 
            style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              background: '#070c18', 
              border: '1px solid rgba(244, 63, 94, 0.3)', 
              borderRadius: 10, 
              padding: 16,
              minHeight: isFullscreen ? 'calc(100vh - 32px)' : 600,
              overflow: 'hidden'
            }}
          >
            {/* Prompter Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, paddingBottom: 10, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 800, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Mic size={14} style={{ color: '#f43f5e' }} />
                  <span>PROMPTER KONUŞMA METNİ</span>
                  <span className="badge-type hisse" style={{ fontSize: 8.5, padding: '1px 5px' }}>
                    Slayt {activeSlide.id}
                  </span>
                </div>
                <div style={{ fontSize: 9.5, color: '#94a3b8', marginTop: 2 }}>
                  Doğal sohbet dili • Akışa gömülü neden-sonuç kurgusu • ~{activeSlide.durationEst}
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  type="button"
                  onClick={() => setIsEditingScript(prev => !prev)}
                  className={`chip-btn ${isEditingScript ? 'active' : ''}`}
                  style={{ fontSize: 9.5, padding: '3px 8px', display: 'flex', alignItems: 'center', gap: 4 }}
                  title="Metni kendi cümlelerinize göre düzenleyin veya not ekleyin"
                >
                  <Edit3 size={11} />
                  <span>{isEditingScript ? 'Tamamla' : 'Düzenle'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyCurrent}
                  className="chip-btn"
                  style={{ fontSize: 9.5, padding: '3px 8px', display: 'flex', alignItems: 'center', gap: 4, borderColor: '#f43f5e', color: '#fca5a5' }}
                  title="Sadece bu slaytın metnini panoya kopyala"
                >
                  {copiedCurrent ? <Check size={11} /> : <Copy size={11} />}
                  <span>{copiedCurrent ? 'Kopyalandı' : 'Kopyala'}</span>
                </button>
              </div>
            </div>

            {/* Prompter Body Content */}
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12, paddingRight: 4 }}>
              
              {/* Slide Context Cue Banner */}
              <div style={{ padding: '8px 12px', background: 'rgba(15, 23, 42, 0.7)', borderRadius: 6, border: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ fontSize: 10, color: 'var(--cyan)', fontWeight: 700 }}>
                  🎬 Konuşma Rejisi & Vurgular:
                </div>
                <div style={{ fontSize: 10.5, color: '#e2e8f0', marginTop: 2 }}>
                  {activeSlide.title} • {activeSlide.subtitle}
                </div>
              </div>

              {/* Editable or Reading Prompter Box */}
              {isEditingScript ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
                  <textarea
                    value={activeScript}
                    onChange={(e) => handleScriptChange(e.target.value)}
                    style={{
                      width: '100%',
                      flex: 1,
                      minHeight: 280,
                      background: 'rgba(0,0,0,0.6)',
                      border: '1px solid rgba(244, 63, 94, 0.4)',
                      borderRadius: 6,
                      color: '#ffffff',
                      padding: '12px 14px',
                      fontSize: 13,
                      lineHeight: 1.6,
                      fontFamily: 'inherit',
                      resize: 'none',
                      outline: 'none'
                    }}
                    placeholder="Bu slayt için konuşma metninizi veya notlarınızı yazın..."
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <button
                      type="button"
                      onClick={handleResetCurrentScript}
                      style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: 10, cursor: 'pointer', textDecoration: 'underline' }}
                    >
                      Varsayılan Metne Geri Dön
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditingScript(false)}
                      className="btn-primary"
                      style={{ fontSize: 10, padding: '4px 10px' }}
                    >
                      Kaydet & Oku
                    </button>
                  </div>
                </div>
              ) : (
                <div 
                  style={{ 
                    padding: '16px 18px', 
                    background: 'rgba(4, 7, 17, 0.65)', 
                    border: '1px solid rgba(255, 255, 255, 0.08)', 
                    borderRadius: 8,
                    fontSize: 'clamp(14px, 1.25vw, 16px)',
                    lineHeight: 1.7,
                    color: '#f8fafc',
                    fontFamily: 'system-ui, -apple-system, sans-serif',
                    letterSpacing: '0.01em',
                    boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.5)'
                  }}
                >
                  <p style={{ margin: 0 }}>
                    "{activeScript}"
                  </p>
                </div>
              )}

              {/* Natural Cause-Effect Flow Breakdown Cue */}
              <div style={{ padding: '10px 14px', background: 'rgba(244, 63, 94, 0.08)', border: '1px solid rgba(244, 63, 94, 0.2)', borderRadius: 6 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#f43f5e', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Zap size={11} />
                  <span>Akıştaki Neden - Sonuç Bağı:</span>
                </div>
                <div style={{ fontSize: 10.5, color: '#fca5a5', marginTop: 3, lineHeight: 1.4 }}>
                  Metin; rakamları kuru kuruya okumak yerine, jeopolitik ve makro gelişmelerin piyasaları nasıl zincirleme etkilediğini dinleyiciye doğal bir sohbet kıvamında hissettirir.
                </div>
              </div>

            </div>

            {/* Prompter Bottom Bar */}
            <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 9.5, color: 'var(--text-muted)' }}>
                Sözcük Sayısı: ~{activeScript.split(' ').length} kelime
              </div>
              <button
                type="button"
                onClick={handleCopyAll}
                className="chip-btn"
                style={{ fontSize: 9.5, padding: '3px 9px', display: 'flex', alignItems: 'center', gap: 4 }}
                title="Tüm slaytların konuşma metnini tek parça olarak kopyalar"
              >
                <FileText size={11} />
                <span>Tüm Bülteni Kopyala</span>
              </button>
            </div>

          </div>
        )}

      </div>

    </div>
  );
}
