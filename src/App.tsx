import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import {
  Camera,
  Upload,
  Plus,
  Trash2,
  CheckCircle,
  RefreshCw,
  Search,
  Settings,
  X,
  Phone,
  AlertTriangle,
  QrCode,
  Send,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Package,
  Layers,
  Calendar,
  Lock,
  LogOut,
  ChevronDown,
  Sun,
  Moon
} from 'lucide-react';
import { TRANSLATIONS, LangKey } from './translations';

interface StoreProfile {
  shop_name: string;
  owner_name: string;
  phone_number: string;
  upi_id: string;
}

interface KPIMetrics {
  skus: number;
  capital: number;
  dead: number;
  udhar: number;
}

interface InventoryItem {
  id: number;
  store_phone: string;
  item_name: string;
  quantity: number;
  wholesale_rate: number;
  last_restocked: string;
  status: string;
}

interface UdharRecord {
  id: number;
  store_phone: string;
  customer_name: string;
  customer_phone: string;
  amount: number;
  items_note: string;
  credit_date: string;
  due_date: string;
  status: 'Pending' | 'Paid';
}

interface ParsedInvoiceItem {
  'Item Name': string;
  Quantity: number;
  'Rate (₹)': number;
  'Total (₹)': number;
}

interface DemandSignal {
  item_name: string;
  status: 'SURGE' | 'STABLE' | 'DEAD_STOCK';
  reason: string;
  action: string;
}

interface DeadStockStrategy {
  item_name: string;
  tactic: string;
  pitch: string;
  discount_recommendation: string;
}

interface ShelfAudit {
  id: number;
  audit_date: string;
  detected_items: Array<{
    item_name: string;
    estimated_count?: number;
    shelf_observation?: string;
  }>;
  photo_notes: string;
}

export default function App() {
  // --- Theme State (Light / Dark Mode) ---
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem('sm_theme');
    return saved === 'light' || saved === 'dark' ? saved : 'dark';
  });

  useEffect(() => {
    document.body.classList.remove('light', 'dark');
    document.body.classList.add(theme);
    localStorage.setItem('sm_theme', theme);
  }, [theme]);

  const isDark = theme === 'dark';
  const cardCls = isDark
    ? 'bg-[#121E1E] border-white/10 text-white shadow-lg'
    : 'bg-white border-neutral-200 text-slate-800 shadow-md';
  const subCardCls = isDark
    ? 'bg-[#182B2B] border-white/10 text-white'
    : 'bg-slate-50 border-neutral-200 text-slate-800';
  const inputCls = isDark
    ? 'bg-[#182B2B] border-white/10 text-white focus:border-teal-500'
    : 'bg-white border-neutral-300 text-slate-900 focus:border-teal-600 shadow-sm';
  const labelCls = isDark ? 'text-neutral-400' : 'text-slate-600';
  const navInactiveCls = isDark
    ? 'bg-[#121E1E] border border-white/10 text-neutral-300 hover:border-teal-500/50'
    : 'bg-white border border-neutral-200 text-slate-700 hover:border-teal-600 shadow-sm';

  // --- Language State ---
  const [lang, setLang] = useState<LangKey>('en');
  const t = TRANSLATIONS[lang];

  // --- Auth & Session ---
  const [profile, setProfile] = useState<StoreProfile | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(() => localStorage.getItem('sm_token'));
  const [authTab, setAuthTab] = useState<'login' | 'register' | 'forgot'>('login');

  // Auth Inputs
  const [loginPhone, setLoginPhone] = useState('9822012345');
  const [loginPin, setLoginPin] = useState('1234');
  const [regShop, setRegShop] = useState('');
  const [regOwner, setRegOwner] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regUpi, setRegUpi] = useState('');
  const [regPin, setRegPin] = useState('');
  const [regPinConfirm, setRegPinConfirm] = useState('');
  const [regOtpSent, setRegOtpSent] = useState(false);
  const [regOtpExpected, setRegOtpExpected] = useState('');
  const [regOtpInput, setRegOtpInput] = useState('');
  const [forgotPhone, setForgotPhone] = useState('');
  const [forgotOtpSent, setForgotOtpSent] = useState(false);
  const [forgotOtpExpected, setForgotOtpExpected] = useState('');
  const [forgotOtpInput, setForgotOtpInput] = useState('');
  const [forgotNewPin, setForgotNewPin] = useState('');
  const [forgotNewPinConfirm, setForgotNewPinConfirm] = useState('');

  // --- App View & Navigation ---
  const [activeNav, setActiveNav] = useState<'scan' | 'inv' | 'udhar' | 'radar'>('scan');
  const [kpi, setKpi] = useState<KPIMetrics>({ skus: 0, capital: 0, dead: 0, udhar: 0 });
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // --- Modal States ---
  const [showShelfModal, setShowShelfModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [qrModalData, setQrModalData] = useState<{ url: string; qrDataUrl: string; title: string; amount: number } | null>(null);

  // --- View 1: Invoice Scan ---
  const [scanMode, setScanMode] = useState<'camera' | 'upload'>('upload');
  const [isScanningInvoice, setIsScanningInvoice] = useState(false);
  const [parsedItems, setParsedItems] = useState<ParsedInvoiceItem[]>([]);
  const invoiceFileRef = useRef<HTMLInputElement>(null);

  // --- View 2: Inventory ---
  const [inventoryList, setInventoryList] = useState<InventoryItem[]>([]);
  const [invSearch, setInvSearch] = useState('');
  const [manualName, setManualName] = useState('');
  const [manualQty, setManualQty] = useState(10);
  const [manualRate, setManualRate] = useState(25);
  const [showManualForm, setShowManualForm] = useState(false);

  // --- View 3: Udhar ---
  const [udharList, setUdharList] = useState<UdharRecord[]>([]);
  const [showUdharForm, setShowUdharForm] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustAmount, setNewCustAmount] = useState('150');
  const [newCustNote, setNewCustNote] = useState('');
  const [newCustDue, setNewCustDue] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().slice(0, 10);
  });

  // --- View 4: Demand Radar ---
  const [isRunningRadar, setIsRunningRadar] = useState(false);
  const [demandResults, setDemandResults] = useState<DemandSignal[]>([]);
  const [comparisonPair, setComparisonPair] = useState<{ latest: ShelfAudit | null; previous: ShelfAudit | null }>({
    latest: null,
    previous: null,
  });
  const [deadStrategies, setDeadStrategies] = useState<DeadStockStrategy[]>([]);
  const [isLoadingStrategies, setIsLoadingStrategies] = useState(false);

  // --- Shelf Audit Modal ---
  const [shelfAuditImage, setShelfAuditImage] = useState<string | null>(null);
  const [isAuditingShelf, setIsAuditingShelf] = useState(false);
  const shelfInputRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // --- Check initial session ---
  useEffect(() => {
    if (sessionToken) {
      fetch(`/api/auth/session?token=${sessionToken}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.profile) {
            setProfile(data.profile);
          } else {
            localStorage.removeItem('sm_token');
            setSessionToken(null);
          }
        })
        .catch(() => {
          localStorage.removeItem('sm_token');
          setSessionToken(null);
        });
    }
  }, [sessionToken]);

  // --- Fetch dashboard data ---
  const refreshData = async () => {
    if (!profile) return;
    try {
      const [kpiRes, invRes, udharRes, compRes] = await Promise.all([
        fetch(`/api/kpi?phone=${profile.phone_number}`).then((r) => r.json()),
        fetch(`/api/inventory?phone=${profile.phone_number}&search=${encodeURIComponent(invSearch)}`).then((r) => r.json()),
        fetch(`/api/udhar?phone=${profile.phone_number}`).then((r) => r.json()),
        fetch(`/api/shelf-audits/comparison?phone=${profile.phone_number}`).then((r) => r.json()),
      ]);
      setKpi(kpiRes);
      setInventoryList(invRes);
      setUdharList(udharRes);
      setComparisonPair(compRes);
    } catch (e) {
      console.error('Error fetching data', e);
    }
  };

  useEffect(() => {
    if (profile) {
      refreshData();
    }
  }, [profile, invSearch]);

  // --- Auth Handlers ---
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: loginPhone, pin: loginPin }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Login failed');
        return;
      }
      setSessionToken(data.token);
      localStorage.setItem('sm_token', data.token);
      setProfile(data.profile);
      showToast(`${t.welcome_back}, ${data.profile.owner_name}!`);
    } catch (err: any) {
      showToast('Login request failed: ' + err.message);
    }
  };

  const handleSendRegOtp = async () => {
    if (!regShop || !regOwner || !regPhone || !regUpi || !regPin || !regPinConfirm) {
      showToast('Please fill in all store details and PIN.');
      return;
    }
    if (regPin !== regPinConfirm) {
      showToast('PINs do not match.');
      return;
    }
    if (regPin.length !== 4) {
      showToast('PIN must be exactly 4 digits.');
      return;
    }

    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: regPhone }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Failed to send OTP');
        return;
      }
      setRegOtpExpected(data.otp);
      setRegOtpSent(true);
      showToast(`Verification code sent! Demo OTP: ${data.otp}`);
    } catch (err: any) {
      showToast(err.message);
    }
  };

  const handleRegisterConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (regOtpInput.trim() !== regOtpExpected) {
      showToast('Invalid verification code.');
      return;
    }

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shop_name: regShop,
          owner_name: regOwner,
          phone_number: regPhone,
          upi_id: regUpi,
          pin: regPin,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Registration failed');
        return;
      }
      setSessionToken(data.token);
      localStorage.setItem('sm_token', data.token);
      setProfile(data.profile);
      showToast('Store registered & activated successfully!');
    } catch (err: any) {
      showToast(err.message);
    }
  };

  const handleSendForgotOtp = async () => {
    if (!forgotPhone) {
      showToast('Enter your 10-digit mobile number.');
      return;
    }
    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: forgotPhone }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Failed');
        return;
      }
      setForgotOtpExpected(data.otp);
      setForgotOtpSent(true);
      showToast(`Reset code sent! Demo OTP: ${data.otp}`);
    } catch (err: any) {
      showToast(err.message);
    }
  };

  const handleResetPinConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (forgotOtpInput.trim() !== forgotOtpExpected) {
      showToast('Invalid OTP.');
      return;
    }
    if (forgotNewPin !== forgotNewPinConfirm) {
      showToast('PINs do not match.');
      return;
    }

    try {
      const res = await fetch('/api/auth/reset-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: forgotPhone, new_pin: forgotNewPin }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Reset failed');
        return;
      }
      showToast('PIN reset! Please log in with your new PIN.');
      setAuthTab('login');
      setLoginPhone(forgotPhone);
      setLoginPin(forgotNewPin);
    } catch (err: any) {
      showToast(err.message);
    }
  };

  const handleLogout = async () => {
    if (sessionToken) {
      fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: sessionToken }),
      }).catch(() => {});
    }
    localStorage.removeItem('sm_token');
    setSessionToken(null);
    setProfile(null);
    setShowSettingsModal(false);
  };

  // --- Invoice Scanning ---
  const handleInvoiceFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      setIsScanningInvoice(true);
      try {
        const res = await fetch('/api/ocr-invoice', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageBase64: base64, mimeType: file.type || 'image/jpeg' }),
        });
        const items = await res.json();
        if (Array.isArray(items) && items.length > 0) {
          setParsedItems(
            items.map((i: any) => ({
              'Item Name': i['Item Name'] || i.item_name || 'Item',
              Quantity: parseInt(i.Quantity || i.quantity || 1, 10),
              'Rate (₹)': parseFloat(i['Rate (₹)'] || i.rate || 0),
              'Total (₹)': parseFloat(i['Total (₹)'] || (parseInt(i.Quantity || 1, 10)) * (parseFloat(i['Rate (₹)'] || i.rate || 0))),
            }))
          );
          showToast(`Extracted ${items.length} line items from invoice!`);
        } else {
          showToast('Could not find line items on invoice image.');
        }
      } catch (err: any) {
        showToast('Invoice scan notice: ' + (err?.message || 'Processing completed'));
      } finally {
        setIsScanningInvoice(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveScannedStock = async () => {
    if (!profile || parsedItems.length === 0) return;
    try {
      const res = await fetch('/api/inventory/add-or-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: profile.phone_number, items: parsedItems }),
      });
      if (res.ok) {
        showToast(t.stock_updated_toast);
        setParsedItems([]);
        refreshData();
      }
    } catch (e: any) {
      showToast(e.message);
    }
  };

  // --- Manual Stock ---
  const handleAddManualStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !manualName) return;
    try {
      const res = await fetch('/api/inventory/add-or-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: profile.phone_number,
          items: [{ 'Item Name': manualName, Quantity: manualQty, 'Rate (₹)': manualRate }],
        }),
      });
      if (res.ok) {
        showToast(`Added ${manualName} to inventory!`);
        setManualName('');
        setShowManualForm(false);
        refreshData();
      }
    } catch (e: any) {
      showToast(e.message);
    }
  };

  const handleDeleteItem = async (id: number) => {
    try {
      await fetch(`/api/inventory/${id}`, { method: 'DELETE' });
      showToast('Item removed from inventory.');
      refreshData();
    } catch (e: any) {
      showToast(e.message);
    }
  };

  // --- Udhar Management ---
  const handleAddUdhar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !newCustName || !newCustPhone || !newCustAmount) return;
    try {
      const res = await fetch('/api/udhar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          store_phone: profile.phone_number,
          customer_name: newCustName,
          customer_phone: newCustPhone,
          amount: newCustAmount,
          items_note: newCustNote,
          due_date: newCustDue,
        }),
      });
      if (res.ok) {
        showToast('Udhar record saved!');
        setNewCustName('');
        setNewCustPhone('');
        setNewCustNote('');
        setShowUdharForm(false);
        refreshData();
      }
    } catch (e: any) {
      showToast(e.message);
    }
  };

  const handleSettleUdhar = async (id: number, name: string) => {
    try {
      await fetch(`/api/udhar/${id}/settle`, { method: 'POST' });
      showToast(`Settled account for ${name}!`);
      refreshData();
    } catch (e: any) {
      showToast(e.message);
    }
  };

  const openUpiQr = async (record: UdharRecord) => {
    if (!profile) return;
    const upiPayload = `upi://pay?pa=${profile.upi_id}&pn=${encodeURIComponent(
      profile.shop_name
    )}&am=${record.amount}&cu=INR&tn=Udhar_${record.id}`;

    try {
      const dataUrl = await QRCode.toDataURL(upiPayload, { width: 280, margin: 1 });
      setQrModalData({
        url: upiPayload,
        qrDataUrl: dataUrl,
        title: record.customer_name,
        amount: record.amount,
      });
    } catch (err) {
      console.error(err);
    }
  };

  // --- Demand Radar ---
  const handleRunDemandRadar = async () => {
    if (inventoryList.length === 0) {
      showToast(t.radar_no_items);
      return;
    }
    setIsRunningRadar(true);
    try {
      const payload = inventoryList.map((i) => ({
        item_name: i.item_name,
        current_stock: i.quantity,
      }));
      const langChoiceName = lang === 'mr' ? 'Marathi' : lang === 'hi' ? 'Hindi' : 'English';
      const res = await fetch('/api/demand-radar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inventory_items: payload,
          location: 'Maharashtra, India',
          lang_name: langChoiceName,
        }),
      });
      const data = await res.json();
      setDemandResults(data);
      showToast('AI demand sensing complete!');
    } catch (e: any) {
      showToast(e.message);
    } finally {
      setIsRunningRadar(false);
    }
  };

  // --- Dead Stock AI Strategies ---
  const handleGenerateDeadStockCombos = async () => {
    const deadItems = inventoryList.filter((i) => {
      const isDeadStatus = (i.status || '').toLowerCase().includes('dead') || (i.status || '').toLowerCase().includes('stagnant');
      const restockedDate = new Date(i.last_restocked);
      const days = (Date.now() - restockedDate.getTime()) / (1000 * 3600 * 24);
      return (days >= 30 || isDeadStatus) && i.quantity > 0;
    });

    if (deadItems.length === 0) {
      showToast(t.dead_no_items);
      return;
    }

    setIsLoadingStrategies(true);
    try {
      const langChoiceName = lang === 'mr' ? 'Marathi' : lang === 'hi' ? 'Hindi' : 'English';
      const res = await fetch('/api/dead-stock-strategy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dead_items: deadItems.map((d) => ({
            item_name: d.item_name,
            quantity: d.quantity,
            rate: d.wholesale_rate,
            capital_blocked: d.quantity * d.wholesale_rate,
          })),
          lang_name: langChoiceName,
        }),
      });
      const data = await res.json();
      setDeadStrategies(data);
      showToast('Kirana combo & clearance strategies ready!');
    } catch (e: any) {
      showToast(e.message);
    } finally {
      setIsLoadingStrategies(false);
    }
  };

  // --- Shelf Audit Photo Scan ---
  const handleShelfFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setShelfAuditImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleExecuteShelfAudit = async () => {
    if (!profile || !shelfAuditImage) return;
    setIsAuditingShelf(true);
    try {
      const langChoiceName = lang === 'mr' ? 'Marathi' : lang === 'hi' ? 'Hindi' : 'English';
      const res = await fetch('/api/shelf-audit-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: shelfAuditImage,
          phone: profile.phone_number,
          langName: langChoiceName,
        }),
      });
      const data = await res.json();
      showToast(
        t.shelf_audit_success.replace('{count}', (data.detected?.length || 0).toString()) +
          (data.flaggedCount > 0 ? ` Auto-flagged ${data.flaggedCount} stagnant items!` : '')
      );
      setShowShelfModal(false);
      setShelfAuditImage(null);
      refreshData();
    } catch (e: any) {
      showToast('Shelf audit failed: ' + e.message);
    } finally {
      setIsAuditingShelf(false);
    }
  };

  // Filter pending udhar records
  const pendingUdhars = udharList.filter((u) => u.status !== 'Paid');
  const deadStockItems = inventoryList.filter((i) => {
    const isDeadStatus = (i.status || '').toLowerCase().includes('dead') || (i.status || '').toLowerCase().includes('stagnant');
    const restockedDate = new Date(i.last_restocked);
    const days = (Date.now() - restockedDate.getTime()) / (1000 * 3600 * 24);
    return (days >= 30 || isDeadStatus) && i.quantity > 0;
  });
  const totalBlockedCapital = deadStockItems.reduce((acc, i) => acc + i.quantity * i.wholesale_rate, 0);

  return (
    <div className="max-w-2xl mx-auto px-4 py-4 pb-28 min-h-screen">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-[#0F766E] text-white px-5 py-3 rounded-xl shadow-2xl border border-teal-400/40 text-sm font-semibold flex items-center gap-2 animate-bounce">
          <Sparkles className="w-4 h-4 text-amber-300" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Bar: Theme Switcher & Language Switcher */}
      <div className="flex justify-between items-center mb-3 gap-2">
        {/* Light / Dark Mode Toggle Switch */}
        <button
          onClick={() => setTheme(isDark ? 'light' : 'dark')}
          className={`px-3 py-1.5 rounded-xl border flex items-center gap-2 text-xs font-bold transition-all shadow-sm active:scale-95 ${
            isDark
              ? 'bg-[#132222] border-white/10 text-neutral-200 hover:text-white'
              : 'bg-white border-neutral-200 text-slate-700 hover:bg-slate-50'
          }`}
          title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {isDark ? (
            <>
              <Sun className="w-4 h-4 text-amber-400" />
              <span>☀️ Light Mode</span>
            </>
          ) : (
            <>
              <Moon className="w-4 h-4 text-teal-600" />
              <span>🌙 Dark Mode</span>
            </>
          )}
        </button>

        {/* Language selector */}
        <div
          className={`border rounded-xl px-2 py-1 flex items-center gap-1 shadow-sm ${
            isDark ? 'bg-[#132222] border-white/10' : 'bg-white border-neutral-200'
          }`}
        >
          <span className={`text-xs mr-1 ${isDark ? 'text-neutral-400' : 'text-slate-500'}`}>🌐 भाषा:</span>
          {(['en', 'mr', 'hi'] as LangKey[]).map((lKey) => (
            <button
              key={lKey}
              onClick={() => setLang(lKey)}
              className={`text-xs px-2.5 py-1 rounded-lg font-semibold transition-all ${
                lang === lKey
                  ? 'bg-[#0F766E] text-white shadow'
                  : isDark
                  ? 'text-neutral-400 hover:text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {lKey === 'en' ? 'English' : lKey === 'mr' ? 'मराठी' : 'हिंदी'}
            </button>
          ))}
        </div>
      </div>

      {/* If Not Logged In */}
      {!profile ? (
        <div className="space-y-5">
          {/* Header */}
          <div className="bg-gradient-to-br from-[#0F766E] via-[#0B4F49] to-[#072E2B] rounded-2xl p-5 shadow-xl text-white relative overflow-hidden flex items-center justify-between border border-teal-500/20">
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight">{t.app_title}</h1>
              <div className="text-xs text-teal-100/90 mt-1">{t.app_tagline}</div>
            </div>
            <img
              src="/smlogo.png"
              alt="Shelf Mind Logo"
              className="h-16 w-auto object-contain rounded-xl drop-shadow-md"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>

          {/* Auth Tab Pills */}
          <div className={`grid grid-cols-3 gap-2 p-1.5 rounded-xl border ${isDark ? 'bg-[#132222] border-white/10' : 'bg-white border-neutral-200 shadow-sm'}`}>
            <button
              onClick={() => setAuthTab('login')}
              className={`py-2 text-xs font-bold rounded-lg transition-all ${
                authTab === 'login'
                  ? 'bg-[#0F766E] text-white shadow'
                  : isDark
                  ? 'text-neutral-400 hover:text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              🔑 Login
            </button>
            <button
              onClick={() => setAuthTab('register')}
              className={`py-2 text-xs font-bold rounded-lg transition-all ${
                authTab === 'register'
                  ? 'bg-[#0F766E] text-white shadow'
                  : isDark
                  ? 'text-neutral-400 hover:text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              📝 Register
            </button>
            <button
              onClick={() => setAuthTab('forgot')}
              className={`py-2 text-xs font-bold rounded-lg transition-all ${
                authTab === 'forgot'
                  ? 'bg-[#0F766E] text-white shadow'
                  : isDark
                  ? 'text-neutral-400 hover:text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              🔓 Forgot PIN
            </button>
          </div>

          {/* Auth Forms */}
          {authTab === 'login' && (
            <form onSubmit={handleLogin} className={`p-6 rounded-2xl border space-y-4 shadow-lg ${cardCls}`}>
              <h2 className="text-base font-bold flex items-center gap-2">
                <span>🔑</span> Shopkeeper Login
              </h2>
              <div>
                <label className={`text-xs block mb-1 ${labelCls}`}>10-Digit Mobile Number</label>
                <input
                  type="tel"
                  value={loginPhone}
                  onChange={(e) => setLoginPhone(e.target.value)}
                  placeholder="e.g. 9822012345"
                  className={`w-full rounded-xl px-4 py-2.5 text-sm border focus:outline-none ${inputCls}`}
                  required
                />
              </div>
              <div>
                <label className={`text-xs block mb-1 ${labelCls}`}>4-Digit Security PIN</label>
                <input
                  type="password"
                  maxLength={4}
                  value={loginPin}
                  onChange={(e) => setLoginPin(e.target.value)}
                  placeholder="****"
                  className={`w-full rounded-xl px-4 py-2.5 text-sm tracking-widest text-center border focus:outline-none ${inputCls}`}
                  required
                />
              </div>
              <div className={`p-3 rounded-xl text-xs border ${isDark ? 'bg-teal-950/40 border-teal-500/20 text-teal-200' : 'bg-teal-50 border-teal-200 text-teal-800'}`}>
                💡 Demo Credentials: Phone <span className="font-mono font-bold text-teal-600 dark:text-teal-300">9822012345</span> | PIN <span className="font-mono font-bold text-teal-600 dark:text-teal-300">1234</span>
              </div>
              <button
                type="submit"
                className="w-full bg-gradient-to-r from-teal-500 to-[#0F766E] hover:brightness-110 text-white font-bold py-3 rounded-xl transition-all shadow-md active:scale-98"
              >
                Access Dashboard
              </button>
            </form>
          )}

          {authTab === 'register' && (
            <div className={`p-6 rounded-2xl border space-y-4 shadow-lg ${cardCls}`}>
              <h2 className="text-base font-bold flex items-center gap-2">
                <span>📝</span> Register Store Account
              </h2>
              <div>
                <label className={`text-xs block mb-1 ${labelCls}`}>Store Name (दुकानाचे नाव)</label>
                <input
                  type="text"
                  value={regShop}
                  onChange={(e) => setRegShop(e.target.value)}
                  placeholder="e.g. Patil Kirana Stores"
                  className={`w-full rounded-xl px-4 py-2 text-sm border focus:outline-none ${inputCls}`}
                />
              </div>
              <div>
                <label className={`text-xs block mb-1 ${labelCls}`}>Owner Name (दुकानदाराचे नाव)</label>
                <input
                  type="text"
                  value={regOwner}
                  onChange={(e) => setRegOwner(e.target.value)}
                  placeholder="e.g. Aniket Patil"
                  className={`w-full rounded-xl px-4 py-2 text-sm border focus:outline-none ${inputCls}`}
                />
              </div>
              <div>
                <label className={`text-xs block mb-1 ${labelCls}`}>Mobile Number (मोबाईल नंबर)</label>
                <input
                  type="tel"
                  value={regPhone}
                  onChange={(e) => setRegPhone(e.target.value)}
                  placeholder="e.g. 9822012345"
                  className={`w-full rounded-xl px-4 py-2 text-sm border focus:outline-none ${inputCls}`}
                />
              </div>
              <div>
                <label className={`text-xs block mb-1 ${labelCls}`}>Store UPI ID for receiving payments</label>
                <input
                  type="text"
                  value={regUpi}
                  onChange={(e) => setRegUpi(e.target.value)}
                  placeholder="e.g. 9822012345@ybl"
                  className={`w-full rounded-xl px-4 py-2 text-sm border focus:outline-none ${inputCls}`}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`text-xs block mb-1 ${labelCls}`}>Create 4-Digit PIN</label>
                  <input
                    type="password"
                    maxLength={4}
                    value={regPin}
                    onChange={(e) => setRegPin(e.target.value)}
                    placeholder="****"
                    className={`w-full rounded-xl px-4 py-2 text-sm tracking-widest text-center border focus:outline-none ${inputCls}`}
                  />
                </div>
                <div>
                  <label className={`text-xs block mb-1 ${labelCls}`}>Confirm PIN</label>
                  <input
                    type="password"
                    maxLength={4}
                    value={regPinConfirm}
                    onChange={(e) => setRegPinConfirm(e.target.value)}
                    placeholder="****"
                    className={`w-full rounded-xl px-4 py-2 text-sm tracking-widest text-center border focus:outline-none ${inputCls}`}
                  />
                </div>
              </div>

              {!regOtpSent ? (
                <button
                  type="button"
                  onClick={handleSendRegOtp}
                  className="w-full bg-gradient-to-r from-teal-600 to-[#0F766E] hover:brightness-110 text-white font-bold py-3 rounded-xl transition-all shadow-md active:scale-98"
                >
                  📲 Send 4-Digit Verification Code
                </button>
              ) : (
                <form onSubmit={handleRegisterConfirm} className="space-y-3 pt-2 border-t border-inherit">
                  <div className={`p-3 rounded-xl text-xs border ${isDark ? 'bg-amber-950/40 border-amber-500/20 text-amber-200' : 'bg-amber-50 border-amber-200 text-amber-800'}`}>
                    🔑 Enter Verification Code (Test Code: <span className="font-mono font-bold">{regOtpExpected}</span>)
                  </div>
                  <div>
                    <label className={`text-xs block mb-1 ${labelCls}`}>Enter 4-Digit Code</label>
                    <input
                      type="text"
                      maxLength={4}
                      value={regOtpInput}
                      onChange={(e) => setRegOtpInput(e.target.value)}
                      placeholder="****"
                      className={`w-full rounded-xl px-4 py-2.5 text-sm text-center tracking-widest border focus:outline-none ${inputCls}`}
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-gradient-to-r from-emerald-600 to-teal-700 hover:brightness-110 text-white font-bold py-3 rounded-xl transition-all shadow-md active:scale-98"
                  >
                    Verify & Activate Store
                  </button>
                </form>
              )}
            </div>
          )}

          {authTab === 'forgot' && (
            <div className={`p-6 rounded-2xl border space-y-4 shadow-lg ${cardCls}`}>
              <h2 className="text-base font-bold flex items-center gap-2">
                <span>🔓</span> Reset Your PIN
              </h2>
              <div>
                <label className={`text-xs block mb-1 ${labelCls}`}>10-Digit Mobile Number</label>
                <input
                  type="tel"
                  value={forgotPhone}
                  onChange={(e) => setForgotPhone(e.target.value)}
                  placeholder="e.g. 9822012345"
                  className={`w-full rounded-xl px-4 py-2.5 text-sm border focus:outline-none ${inputCls}`}
                />
              </div>

              {!forgotOtpSent ? (
                <button
                  type="button"
                  onClick={handleSendForgotOtp}
                  className="w-full bg-gradient-to-r from-teal-600 to-[#0F766E] hover:brightness-110 text-white font-bold py-3 rounded-xl transition-all shadow-md active:scale-98"
                >
                  📲 Send OTP to Reset PIN
                </button>
              ) : (
                <form onSubmit={handleResetPinConfirm} className="space-y-3 pt-2 border-t border-inherit">
                  <div className={`p-3 rounded-xl text-xs border ${isDark ? 'bg-amber-950/40 border-amber-500/20 text-amber-200' : 'bg-amber-50 border-amber-200 text-amber-800'}`}>
                    🔑 Enter OTP (Test Code: <span className="font-mono font-bold">{forgotOtpExpected}</span>)
                  </div>
                  <div>
                    <label className={`text-xs block mb-1 ${labelCls}`}>Enter OTP</label>
                    <input
                      type="text"
                      maxLength={4}
                      value={forgotOtpInput}
                      onChange={(e) => setForgotOtpInput(e.target.value)}
                      placeholder="****"
                      className={`w-full rounded-xl px-4 py-2 text-center tracking-widest text-sm border focus:outline-none ${inputCls}`}
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={`text-xs block mb-1 ${labelCls}`}>New 4-Digit PIN</label>
                      <input
                        type="password"
                        maxLength={4}
                        value={forgotNewPin}
                        onChange={(e) => setForgotNewPin(e.target.value)}
                        placeholder="****"
                        className={`w-full rounded-xl px-4 py-2 text-center tracking-widest text-sm border focus:outline-none ${inputCls}`}
                        required
                      />
                    </div>
                    <div>
                      <label className={`text-xs block mb-1 ${labelCls}`}>Confirm New PIN</label>
                      <input
                        type="password"
                        maxLength={4}
                        value={forgotNewPinConfirm}
                        onChange={(e) => setForgotNewPinConfirm(e.target.value)}
                        placeholder="****"
                        className={`w-full rounded-xl px-4 py-2 text-center tracking-widest text-sm border focus:outline-none ${inputCls}`}
                        required
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-gradient-to-r from-emerald-600 to-teal-700 hover:brightness-110 text-white font-bold py-3 rounded-xl transition-all shadow-md active:scale-98"
                  >
                    Reset PIN
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      ) : (
        /* Logged In Store Dashboard */
        <div className="space-y-4">
          {/* Dashboard Header */}
          <div className="bg-gradient-to-br from-[#0F766E] via-[#0B4F49] to-[#072E2B] rounded-2xl p-5 shadow-xl text-white relative overflow-hidden flex items-center justify-between border border-teal-500/20">
            <div className="flex-1 pr-3">
              <h1 className="text-xl font-extrabold tracking-tight">🏪 {profile.shop_name}</h1>
              <div className="text-xs text-teal-100/90 mt-1">
                {t.welcome_back}, <b>{profile.owner_name}</b>
                <br />
                📞 +91 {profile.phone_number}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowSettingsModal(true)}
                className="bg-white/10 hover:bg-white/20 p-2.5 rounded-xl border border-white/20 transition-all text-white active:scale-95"
                title="Store Settings"
              >
                <Settings className="w-5 h-5" />
              </button>
              <img
                src="/smlogo.png"
                alt="Shelf Mind Logo"
                className="h-14 w-auto object-contain rounded-xl drop-shadow-md"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>
          </div>

          {/* 4 KPI Metrics */}
          <div className="grid grid-cols-2 gap-3">
            <div className={`p-3.5 rounded-xl border border-l-4 border-l-[#0F766E] shadow-sm flex justify-between items-center ${cardCls}`}>
              <div>
                <div className={`text-xs font-bold ${isDark ? 'text-neutral-200' : 'text-slate-700'}`}>📦 {t.kpi_skus}</div>
                <div className={`text-[10px] mt-0.5 ${labelCls}`}>Active catalog</div>
              </div>
              <div className="text-lg font-black text-teal-500 dark:text-teal-400">
                {kpi.skus} <span className="text-[10px] font-normal opacity-70">Items</span>
              </div>
            </div>

            <div className={`p-3.5 rounded-xl border border-l-4 border-l-[#0F766E] shadow-sm flex justify-between items-center ${cardCls}`}>
              <div>
                <div className={`text-xs font-bold ${isDark ? 'text-neutral-200' : 'text-slate-700'}`}>💼 {t.kpi_capital}</div>
                <div className={`text-[10px] mt-0.5 ${labelCls}`}>Stock purchase value</div>
              </div>
              <div className="text-lg font-black text-teal-500 dark:text-teal-400">₹{kpi.capital.toLocaleString()}</div>
            </div>

            <div className={`p-3.5 rounded-xl border border-l-4 border-l-[#D97706] shadow-sm flex justify-between items-center ${cardCls}`}>
              <div>
                <div className={`text-xs font-bold ${isDark ? 'text-neutral-200' : 'text-slate-700'}`}>⏳ {t.kpi_dead}</div>
                <div className={`text-[10px] mt-0.5 ${labelCls}`}>Slow-moving stock</div>
              </div>
              <div className="text-lg font-black text-amber-500 dark:text-amber-400">₹{kpi.dead.toLocaleString()}</div>
            </div>

            <div className={`p-3.5 rounded-xl border border-l-4 border-l-[#E11D48] shadow-sm flex justify-between items-center ${cardCls}`}>
              <div>
                <div className={`text-xs font-bold ${isDark ? 'text-neutral-200' : 'text-slate-700'}`}>🚨 {t.kpi_udhar}</div>
                <div className={`text-[10px] mt-0.5 ${labelCls}`}>Pending receivables</div>
              </div>
              <div className="text-lg font-black text-rose-500">₹{kpi.udhar.toLocaleString()}</div>
            </div>
          </div>

          {/* 2x2 Segmented Navigation Buttons */}
          <div className="grid grid-cols-2 gap-2.5">
            <button
              onClick={() => setActiveNav('scan')}
              className={`p-3.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                activeNav === 'scan'
                  ? 'bg-gradient-to-r from-teal-500 to-[#0F766E] text-white shadow-lg shadow-teal-900/30 ring-1 ring-teal-400'
                  : navInactiveCls
              }`}
            >
              <span>{t.tab_scan}</span>
            </button>
            <button
              onClick={() => setActiveNav('inv')}
              className={`p-3.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                activeNav === 'inv'
                  ? 'bg-gradient-to-r from-teal-500 to-[#0F766E] text-white shadow-lg shadow-teal-900/30 ring-1 ring-teal-400'
                  : navInactiveCls
              }`}
            >
              <span>{t.tab_inventory}</span>
            </button>
            <button
              onClick={() => setActiveNav('udhar')}
              className={`p-3.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                activeNav === 'udhar'
                  ? 'bg-gradient-to-r from-teal-500 to-[#0F766E] text-white shadow-lg shadow-teal-900/30 ring-1 ring-teal-400'
                  : navInactiveCls
              }`}
            >
              <span>{t.tab_udhar}</span>
            </button>
            <button
              onClick={() => setActiveNav('radar')}
              className={`p-3.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                activeNav === 'radar'
                  ? 'bg-gradient-to-r from-teal-500 to-[#0F766E] text-white shadow-lg shadow-teal-900/30 ring-1 ring-teal-400'
                  : navInactiveCls
              }`}
            >
              <span>{t.tab_demand}</span>
            </button>
          </div>

          {/* VIEW 1: Invoice Scanner */}
          {activeNav === 'scan' && (
            <div className={`p-5 rounded-2xl border space-y-4 shadow-lg ${cardCls}`}>
              <div>
                <h2 className="text-base font-bold">{t.upload_heading}</h2>
                <p className={`text-xs mt-0.5 ${labelCls}`}>{t.upload_sub}</p>
              </div>

              <div className={`grid grid-cols-2 gap-2 p-1 rounded-xl border ${subCardCls}`}>
                <button
                  onClick={() => setScanMode('camera')}
                  className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                    scanMode === 'camera'
                      ? 'bg-[#0F766E] text-white shadow'
                      : isDark
                      ? 'text-neutral-400 hover:text-white'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Camera className="w-3.5 h-3.5" /> 📸 Phone Camera
                </button>
                <button
                  onClick={() => setScanMode('upload')}
                  className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                    scanMode === 'upload'
                      ? 'bg-[#0F766E] text-white shadow'
                      : isDark
                      ? 'text-neutral-400 hover:text-white'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Upload className="w-3.5 h-3.5" /> 📁 Gallery File
                </button>
              </div>

              <div className={`border-2 border-dashed border-teal-500/40 rounded-xl p-6 text-center transition-all cursor-pointer ${
                isDark ? 'bg-[#152424]/50 hover:bg-[#152424]' : 'bg-teal-50/50 hover:bg-teal-50'
              }`}>
                <input
                  type="file"
                  ref={invoiceFileRef}
                  accept="image/*"
                  capture={scanMode === 'camera' ? 'environment' : undefined}
                  onChange={handleInvoiceFileChange}
                  className="hidden"
                  id="invoice_input_field"
                />
                <label htmlFor="invoice_input_field" className="cursor-pointer block space-y-2">
                  <div className="w-12 h-12 bg-teal-500/20 text-teal-600 dark:text-teal-400 rounded-full flex items-center justify-center mx-auto">
                    {scanMode === 'camera' ? <Camera className="w-6 h-6" /> : <Upload className="w-6 h-6" />}
                  </div>
                  <div className="text-sm font-bold">
                    {scanMode === 'camera' ? 'Snap Wholesale Receipt' : 'Upload Invoice Photo'}
                  </div>
                  <div className={`text-[11px] ${labelCls}`}>JPG, PNG, JPEG wholesale paper bills</div>
                </label>
              </div>

              {isScanningInvoice && (
                <div className={`p-4 rounded-xl text-center space-y-2 border ${
                  isDark ? 'bg-teal-950/40 border-teal-500/30 text-teal-200' : 'bg-teal-50 border-teal-200 text-teal-900'
                }`}>
                  <RefreshCw className="w-6 h-6 text-teal-500 animate-spin mx-auto" />
                  <div className="text-xs font-semibold">
                    ⚡ Vision AI is analyzing invoice columns and items...
                  </div>
                </div>
              )}

              {parsedItems.length > 0 && (
                <div className="space-y-3 pt-3 border-t border-inherit">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-500 dark:text-emerald-400">
                      ✅ Extracted {parsedItems.length} line items from receipt
                    </span>
                    <button
                      onClick={() =>
                        setParsedItems([
                          ...parsedItems,
                          { 'Item Name': 'New Item', Quantity: 1, 'Rate (₹)': 0, 'Total (₹)': 0 },
                        ])
                      }
                      className="text-xs text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-1 font-semibold"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Row
                    </button>
                  </div>
                  <div className={`text-[11px] ${labelCls}`}>{t.edit_instruction}</div>

                  <div className={`overflow-x-auto border rounded-xl max-h-80 overflow-y-auto ${isDark ? 'border-white/10' : 'border-neutral-200'}`}>
                    <table className="w-full text-xs text-left">
                      <thead className={`uppercase tracking-wider sticky top-0 border-b ${
                        isDark ? 'bg-[#182B2B] text-neutral-400 border-white/10' : 'bg-slate-100 text-slate-600 border-neutral-200'
                      }`}>
                        <tr>
                          <th className="p-2.5">Product SKU</th>
                          <th className="p-2.5 w-16 text-center">Qty</th>
                          <th className="p-2.5 w-24">Rate (₹)</th>
                          <th className="p-2.5 w-10 text-center"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-inherit">
                        {parsedItems.map((item, idx) => (
                          <tr key={idx} className="hover:bg-teal-500/5">
                            <td className="p-2">
                              <input
                                type="text"
                                value={item['Item Name']}
                                onChange={(e) => {
                                  const updated = [...parsedItems];
                                  updated[idx]['Item Name'] = e.target.value;
                                  setParsedItems(updated);
                                }}
                                className={`w-full rounded px-2 py-1 text-xs border ${inputCls}`}
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="number"
                                min={1}
                                value={item.Quantity}
                                onChange={(e) => {
                                  const updated = [...parsedItems];
                                  updated[idx].Quantity = parseInt(e.target.value, 10) || 1;
                                  setParsedItems(updated);
                                }}
                                className={`w-full rounded px-2 py-1 text-xs text-center border ${inputCls}`}
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="number"
                                step="0.5"
                                min={0}
                                value={item['Rate (₹)']}
                                onChange={(e) => {
                                  const updated = [...parsedItems];
                                  updated[idx]['Rate (₹)'] = parseFloat(e.target.value) || 0;
                                  setParsedItems(updated);
                                }}
                                className={`w-full rounded px-2 py-1 text-xs border ${inputCls}`}
                              />
                            </td>
                            <td className="p-2 text-center">
                              <button
                                onClick={() => setParsedItems(parsedItems.filter((_, i) => i !== idx))}
                                className="text-neutral-400 hover:text-rose-500 p-1"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <button
                    onClick={handleSaveScannedStock}
                    className="w-full bg-gradient-to-r from-teal-500 to-[#0F766E] hover:brightness-110 text-white font-bold py-3 rounded-xl transition-all shadow-md active:scale-98"
                  >
                    ✅ {t.save_stock_btn}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* VIEW 2: Inventory */}
          {activeNav === 'inv' && (
            <div className="space-y-4">
              {/* Expandable Add Manual Stock */}
              <div className={`rounded-2xl border overflow-hidden shadow-lg ${cardCls}`}>
                <button
                  onClick={() => setShowManualForm(!showManualForm)}
                  className="w-full p-4 flex items-center justify-between text-left text-sm font-bold hover:bg-teal-500/5 transition-all"
                >
                  <span className="flex items-center gap-2">
                    <Plus className="w-4 h-4 text-teal-500" /> {t.manual_add_heading}
                  </span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${showManualForm ? 'rotate-180' : ''}`} />
                </button>
                {showManualForm && (
                  <form onSubmit={handleAddManualStock} className="p-4 pt-0 border-t border-inherit space-y-3">
                    <div className="grid grid-cols-3 gap-2">
                      <div className="col-span-2">
                        <label className={`text-xs block mb-1 ${labelCls}`}>Product Name</label>
                        <input
                          type="text"
                          value={manualName}
                          onChange={(e) => setManualName(e.target.value)}
                          placeholder="e.g. Parle-G 100g"
                          className={`w-full rounded-xl px-3 py-2 text-xs border ${inputCls}`}
                          required
                        />
                      </div>
                      <div>
                        <label className={`text-xs block mb-1 ${labelCls}`}>Qty</label>
                        <input
                          type="number"
                          min={1}
                          value={manualQty}
                          onChange={(e) => setManualQty(parseInt(e.target.value, 10) || 1)}
                          className={`w-full rounded-xl px-3 py-2 text-xs text-center border ${inputCls}`}
                          required
                        />
                      </div>
                    </div>
                    <div>
                      <label className={`text-xs block mb-1 ${labelCls}`}>Wholesale Rate (₹)</label>
                      <input
                        type="number"
                        step="0.5"
                        min={1}
                        value={manualRate}
                        onChange={(e) => setManualRate(parseFloat(e.target.value) || 0)}
                        className={`w-full rounded-xl px-3 py-2 text-xs border ${inputCls}`}
                        required
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full bg-[#0F766E] hover:bg-teal-600 text-white font-bold py-2.5 rounded-xl transition-all text-xs"
                    >
                      {t.add_item_btn}
                    </button>
                  </form>
                )}
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className={`w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 ${labelCls}`} />
                <input
                  type="text"
                  value={invSearch}
                  onChange={(e) => setInvSearch(e.target.value)}
                  placeholder={t.search_stock}
                  className={`w-full rounded-xl pl-10 pr-4 py-2.5 text-xs border focus:outline-none ${inputCls}`}
                />
              </div>

              {/* Inventory Table */}
              {inventoryList.length > 0 ? (
                <div className={`rounded-2xl border overflow-hidden shadow-lg ${cardCls}`}>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className={`uppercase tracking-wider text-[11px] border-b ${
                        isDark ? 'bg-[#182B2B] text-neutral-400 border-white/10' : 'bg-slate-100 text-slate-600 border-neutral-200'
                      }`}>
                        <tr>
                          <th className="p-3">Item SKU</th>
                          <th className="p-3 text-center">Stock</th>
                          <th className="p-3">Rate (₹)</th>
                          <th className="p-3">Capital (₹)</th>
                          <th className="p-3 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-inherit">
                        {inventoryList.map((item) => (
                          <tr key={item.id} className="hover:bg-teal-500/5 transition-all">
                            <td className="p-3">
                              <div className="font-bold">{item.item_name}</div>
                              <div className={`text-[10px] flex items-center gap-1.5 mt-0.5 ${labelCls}`}>
                                <span
                                  className={`px-1.5 py-0.2 rounded font-medium ${
                                    item.status.includes('Dead')
                                      ? 'bg-amber-500/20 text-amber-600 dark:text-amber-300'
                                      : 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-300'
                                  }`}
                                >
                                  {item.status}
                                </span>
                                <span>{item.last_restocked}</span>
                              </div>
                            </td>
                            <td className="p-3 text-center font-bold text-teal-600 dark:text-teal-300">{item.quantity}</td>
                            <td className="p-3">₹{item.wholesale_rate.toFixed(2)}</td>
                            <td className="p-3 font-semibold">
                              ₹{(item.quantity * item.wholesale_rate).toFixed(2)}
                            </td>
                            <td className="p-3 text-center">
                              <button
                                onClick={() => handleDeleteItem(item.id)}
                                className="text-neutral-400 hover:text-rose-500 p-1 transition-all"
                                title="Remove item"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className={`p-8 rounded-2xl border text-center text-xs ${cardCls} ${labelCls}`}>
                  {t.no_stock}
                </div>
              )}
            </div>
          )}

          {/* VIEW 3: Udhar Ledger */}
          {activeNav === 'udhar' && (
            <div className="space-y-4">
              {/* Expandable Add Udhar Form */}
              <div className={`rounded-2xl border overflow-hidden shadow-lg ${cardCls}`}>
                <button
                  onClick={() => setShowUdharForm(!showUdharForm)}
                  className="w-full p-4 flex items-center justify-between text-left text-sm font-bold hover:bg-teal-500/5 transition-all"
                >
                  <span className="flex items-center gap-2">
                    <Plus className="w-4 h-4 text-teal-500" /> {t.act_add_udhar}
                  </span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${showUdharForm ? 'rotate-180' : ''}`} />
                </button>
                {showUdharForm && (
                  <form onSubmit={handleAddUdhar} className="p-4 pt-0 border-t border-inherit space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className={`text-xs block mb-1 ${labelCls}`}>{t.customer_name}</label>
                        <input
                          type="text"
                          value={newCustName}
                          onChange={(e) => setNewCustName(e.target.value)}
                          placeholder="e.g. Ramesh Kulkarni"
                          className={`w-full rounded-xl px-3 py-2 text-xs border ${inputCls}`}
                          required
                        />
                      </div>
                      <div>
                        <label className={`text-xs block mb-1 ${labelCls}`}>{t.customer_phone}</label>
                        <input
                          type="tel"
                          value={newCustPhone}
                          onChange={(e) => setNewCustPhone(e.target.value)}
                          placeholder="e.g. 9822123456"
                          className={`w-full rounded-xl px-3 py-2 text-xs border ${inputCls}`}
                          required
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className={`text-xs block mb-1 ${labelCls}`}>{t.udhar_amount}</label>
                        <input
                          type="number"
                          step="10"
                          min={1}
                          value={newCustAmount}
                          onChange={(e) => setNewCustAmount(e.target.value)}
                          className={`w-full rounded-xl px-3 py-2 text-xs border ${inputCls}`}
                          required
                        />
                      </div>
                      <div>
                        <label className={`text-xs block mb-1 ${labelCls}`}>{t.due_date}</label>
                        <input
                          type="date"
                          value={newCustDue}
                          onChange={(e) => setNewCustDue(e.target.value)}
                          className={`w-full rounded-xl px-3 py-2 text-xs border ${inputCls}`}
                          required
                        />
                      </div>
                    </div>
                    <div>
                      <label className={`text-xs block mb-1 ${labelCls}`}>{t.items_note}</label>
                      <input
                        type="text"
                        value={newCustNote}
                        onChange={(e) => setNewCustNote(e.target.value)}
                        placeholder="e.g. 1L Gemini Oil, 1kg Sugar"
                        className={`w-full rounded-xl px-3 py-2 text-xs border ${inputCls}`}
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full bg-gradient-to-r from-teal-500 to-[#0F766E] hover:brightness-110 text-white font-bold py-2.5 rounded-xl transition-all text-xs shadow-md"
                    >
                      {t.save_udhar_btn}
                    </button>
                  </form>
                )}
              </div>

              {/* Pending Udhar Cards */}
              {pendingUdhars.length > 0 ? (
                <div className="space-y-3">
                  {pendingUdhars.map((row) => {
                    const upiPayload = `upi://pay?pa=${profile.upi_id}&pn=${encodeURIComponent(
                      profile.shop_name
                    )}&am=${row.amount}&cu=INR&tn=Udhar_${row.id}`;

                    let waMsg = '';
                    if (lang === 'mr') {
                      waMsg = `नमस्कार ${row.customer_name}जी, ${profile.shop_name} दुकानाची ₹${row.amount} उधारी बाकी आहे (वस्तू: ${row.items_note}). देय तारीख: ${row.due_date}. थेट UPI द्वारे पैसे भरण्यासाठी लिंक: ${upiPayload}`;
                    } else if (lang === 'hi') {
                      waMsg = `नमस्ते ${row.customer_name}जी, ${profile.shop_name} की ₹${row.amount} उधारी बाकी है (सामान: ${row.items_note}). अंतिम तिथि: ${row.due_date}. भुगतान लिंक: ${upiPayload}`;
                    } else {
                      waMsg = `Dear ${row.customer_name}, reminder for pending store credit of ₹${row.amount} at ${profile.shop_name}. Due Date: ${row.due_date}. Pay via UPI: ${upiPayload}`;
                    }

                    const waUrl = `https://wa.me/91${row.customer_phone}?text=${encodeURIComponent(waMsg)}`;

                    return (
                      <div
                        key={row.id}
                        className={`rounded-2xl border border-l-4 border-l-rose-500 p-4 shadow-lg space-y-3 ${cardCls}`}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-bold text-base">👤 {row.customer_name}</div>
                            <div className={`text-xs mt-0.5 ${labelCls}`}>
                              📞 +91 {row.customer_phone} · 📅 Due: <b>{row.due_date}</b>
                            </div>
                            <div className="text-xs mt-1">📦 {row.items_note || 'Grocery Items'}</div>
                          </div>
                          <div className="text-xl font-extrabold text-rose-500">₹{row.amount.toFixed(2)}</div>
                        </div>

                        {/* Action buttons */}
                        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-inherit">
                          <button
                            onClick={() => openUpiQr(row)}
                            className={`border font-semibold py-2 px-2 rounded-xl text-xs flex items-center justify-center gap-1 transition-all ${
                              isDark ? 'bg-[#182B2B] hover:bg-[#1E3636] text-teal-300 border-teal-500/30' : 'bg-teal-50 hover:bg-teal-100 text-teal-700 border-teal-200'
                            }`}
                          >
                            <QrCode className="w-3.5 h-3.5" /> Scan QR
                          </button>
                          <a
                            href={waUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`border font-semibold py-2 px-2 rounded-xl text-xs flex items-center justify-center gap-1 transition-all text-center ${
                              isDark ? 'bg-[#182B2B] hover:bg-[#1E3636] text-emerald-400 border-emerald-500/30' : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
                            }`}
                          >
                            <Send className="w-3.5 h-3.5" /> WhatsApp
                          </a>
                          <button
                            onClick={() => handleSettleUdhar(row.id, row.customer_name)}
                            className="bg-[#0F766E] hover:bg-teal-600 text-white font-semibold py-2 px-2 rounded-xl text-xs flex items-center justify-center gap-1 transition-all"
                          >
                            <CheckCircle className="w-3.5 h-3.5" /> Mark Paid
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className={`p-8 rounded-2xl border text-center text-xs ${cardCls} ${labelCls}`}>
                  {t.no_udhar}
                </div>
              )}
            </div>
          )}

          {/* VIEW 4: Demand Radar & Dead Stock */}
          {activeNav === 'radar' && (
            <div className="space-y-5">
              {/* Radar Heading & Trigger */}
              <div className={`p-5 rounded-2xl border shadow-lg space-y-3 ${cardCls}`}>
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-base font-bold flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-amber-500" /> {t.radar_heading}
                    </h2>
                    <p className={`text-xs mt-1 ${labelCls}`}>{t.radar_sub}</p>
                  </div>
                </div>

                <button
                  onClick={handleRunDemandRadar}
                  disabled={isRunningRadar}
                  className="w-full bg-gradient-to-r from-teal-500 to-[#0F766E] hover:brightness-110 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
                >
                  {isRunningRadar ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" /> {t.radar_analyzing}
                    </>
                  ) : (
                    <>
                      <TrendingUp className="w-4 h-4" /> {t.radar_btn_run}
                    </>
                  )}
                </button>

                {demandResults.length > 0 && (
                  <div className="space-y-3 pt-2">
                    {/* Summary badges */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className={`p-3 rounded-xl border border-rose-500/30 border-l-4 border-l-rose-500 ${subCardCls}`}>
                        <div className={`text-[10px] font-bold uppercase tracking-wider ${labelCls}`}>
                          {t.radar_surge_title}
                        </div>
                        <div className="text-lg font-black text-rose-500 mt-0.5">
                          {demandResults.filter((r) => r.status === 'SURGE').length} {t.radar_items_suffix}
                        </div>
                      </div>
                      <div className={`p-3 rounded-xl border border-amber-500/30 border-l-4 border-l-amber-500 ${subCardCls}`}>
                        <div className={`text-[10px] font-bold uppercase tracking-wider ${labelCls}`}>
                          {t.radar_dead_title}
                        </div>
                        <div className="text-lg font-black text-amber-500 mt-0.5">
                          {demandResults.filter((r) => r.status === 'DEAD_STOCK').length} {t.radar_items_suffix}
                        </div>
                      </div>
                    </div>

                    {/* Results list */}
                    <div className="space-y-2.5">
                      {demandResults.map((item, idx) => {
                        const isSurge = item.status === 'SURGE';
                        const isDead = item.status === 'DEAD_STOCK';
                        const borderColor = isSurge
                          ? 'border-l-rose-500'
                          : isDead
                          ? 'border-l-amber-500'
                          : 'border-l-emerald-500';
                        const badgeBg = isSurge
                          ? 'bg-rose-500/20 text-rose-500 border-rose-500/40'
                          : isDead
                          ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/40'
                          : 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/40';

                        return (
                          <div
                            key={idx}
                            className={`p-3.5 rounded-xl border border-l-4 ${borderColor} space-y-1.5 ${subCardCls}`}
                          >
                            <div className="flex justify-between items-start">
                              <span className="font-bold text-sm">{item.item_name}</span>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badgeBg}`}>
                                {item.status === 'SURGE'
                                  ? t.radar_status_surge
                                  : item.status === 'DEAD_STOCK'
                                  ? t.radar_status_dead
                                  : t.radar_status_stable}
                              </span>
                            </div>
                            <div className="text-xs">
                              <b>{t.radar_signal_label}:</b> {item.reason}
                            </div>
                            <div className="text-xs font-semibold text-teal-600 dark:text-teal-300">💡 {item.action}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Side-by-Side Shelf Audit Visual Proof */}
              <div className={`p-5 rounded-2xl border shadow-lg space-y-3 ${cardCls}`}>
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <span>🖼️</span> {t.shelf_comp_heading}
                </h3>
                <p className={`text-xs ${labelCls}`}>{t.shelf_comp_sub}</p>

                {comparisonPair.latest && comparisonPair.previous ? (
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div className={`p-3 rounded-xl border space-y-2 ${subCardCls}`}>
                      <div className="text-xs font-bold">
                        📅 {t.shelf_comp_prev}: {comparisonPair.previous.audit_date}
                      </div>
                      <div className="text-[11px] text-teal-600 dark:text-teal-400 font-semibold">
                        {comparisonPair.previous.detected_items.length} {t.shelf_comp_items_found}
                      </div>
                      <ul className="text-xs space-y-1">
                        {comparisonPair.previous.detected_items.slice(0, 5).map((itm, i) => (
                          <li key={i} className="truncate">
                            • <b>{itm.item_name}</b> {itm.estimated_count ? `(~${itm.estimated_count} pcs)` : ''}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className={`p-3 rounded-xl border border-teal-500/40 space-y-2 ${subCardCls}`}>
                      <div className="text-xs font-bold">
                        📅 {t.shelf_comp_latest}: {comparisonPair.latest.audit_date}
                      </div>
                      <div className="text-[11px] text-teal-600 dark:text-teal-400 font-semibold">
                        {comparisonPair.latest.detected_items.length} {t.shelf_comp_items_found}
                      </div>
                      <ul className="text-xs space-y-1">
                        {comparisonPair.latest.detected_items.slice(0, 5).map((itm, i) => (
                          <li key={i} className="truncate">
                            • <b>{itm.item_name}</b> {itm.estimated_count ? `(~${itm.estimated_count} pcs)` : ''}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ) : (
                  <div className={`p-4 rounded-xl text-center text-xs ${subCardCls} ${labelCls}`}>
                    {t.shelf_comp_need_two}
                  </div>
                )}
              </div>

              {/* Dead Stock Clearance Radar */}
              <div className={`p-5 rounded-2xl border shadow-lg space-y-4 ${cardCls}`}>
                <div>
                  <h3 className="text-base font-bold">{t.dead_tab_heading}</h3>
                  <p className={`text-xs mt-0.5 ${labelCls}`}>{t.dead_tab_sub}</p>
                </div>

                {deadStockItems.length === 0 ? (
                  <div className={`p-4 rounded-xl text-xs text-center font-semibold border ${
                    isDark ? 'bg-emerald-950/30 border-emerald-500/20 text-emerald-300' : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  }`}>
                    {t.dead_no_items}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className={`p-3.5 rounded-xl border border-amber-500/30 border-l-4 border-l-amber-500 flex justify-between items-center ${subCardCls}`}>
                      <div>
                        <div className="text-xs font-bold text-amber-500">{t.dead_blocked_val}</div>
                        <div className={`text-[11px] mt-0.5 ${labelCls}`}>
                          {deadStockItems.length} slow-moving products
                        </div>
                      </div>
                      <div className="text-xl font-black text-amber-500">₹{totalBlockedCapital.toLocaleString()}</div>
                    </div>

                    <button
                      onClick={handleGenerateDeadStockCombos}
                      disabled={isLoadingStrategies}
                      className="w-full bg-[#D97706] hover:bg-amber-600 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl transition-all text-xs flex items-center justify-center gap-2 shadow-md"
                    >
                      {isLoadingStrategies ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Calculating Kirana clearance pitches...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5" /> {t.dead_action_btn}
                        </>
                      )}
                    </button>

                    <div className="space-y-2.5">
                      {deadStockItems.map((item) => {
                        const strat = deadStrategies.find((s) => s.item_name.toLowerCase().includes(item.item_name.toLowerCase()));
                        return (
                          <div
                            key={item.id}
                            className={`p-3.5 rounded-xl border border-l-4 border-l-amber-500 space-y-2 ${subCardCls}`}
                          >
                            <div className="flex justify-between items-start">
                              <div>
                                <div className="font-bold text-sm">📦 {item.item_name}</div>
                                <div className={`text-xs mt-0.5 ${labelCls}`}>
                                  Qty: <b>{item.quantity}</b> · Blocked: <b>₹{(item.quantity * item.wholesale_rate).toLocaleString()}</b>
                                </div>
                              </div>
                              <span className="text-[10px] font-bold bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/40 px-2 py-0.5 rounded-full">
                                {strat?.discount_recommendation || 'Slow Mover'}
                              </span>
                            </div>
                            <div className="text-xs pt-1 border-t border-dashed border-inherit">
                              <b>{t.dead_pitch_label}:</b>{' '}
                              <em className="opacity-90">
                                "{strat?.pitch || 'Place near checkout counter to prompt daily basket add-on.'}"
                              </em>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Floating Center Shelf Scanner Button (FAB) */}
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40">
            <button
              onClick={() => setShowShelfModal(true)}
              className="bg-gradient-to-r from-amber-500 to-amber-600 hover:brightness-110 active:scale-95 text-white font-extrabold px-6 py-3.5 rounded-full shadow-2xl border-2 border-white/80 flex items-center gap-2 text-sm tracking-wide transition-all drop-shadow-lg"
            >
              <Camera className="w-5 h-5" />
              <span>{t.fab_scan_label}</span>
            </button>
          </div>

          {/* Modal: Shelf Rack Camera Audit */}
          {showShelfModal && (
            <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
              <div className={`border rounded-2xl p-5 max-w-md w-full space-y-4 shadow-2xl ${cardCls}`}>
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-base flex items-center gap-2">
                    <Camera className="w-4 h-4 text-amber-500" /> {t.shelf_dialog_title}
                  </h3>
                  <button
                    onClick={() => {
                      setShowShelfModal(false);
                      setShelfAuditImage(null);
                    }}
                    className={`${labelCls} hover:text-rose-500 p-1`}
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <p className={`text-xs ${labelCls}`}>{t.shelf_dialog_sub}</p>

                <div className={`border-2 border-dashed border-teal-500/40 rounded-xl p-6 text-center ${subCardCls}`}>
                  <input
                    type="file"
                    ref={shelfInputRef}
                    accept="image/*"
                    capture="environment"
                    onChange={handleShelfFileChange}
                    className="hidden"
                    id="shelf_cam_file"
                  />
                  {shelfAuditImage ? (
                    <div className="space-y-3">
                      <img
                        src={shelfAuditImage}
                        alt="Shelf snapshot"
                        className="max-h-48 mx-auto rounded-lg object-cover border border-inherit"
                      />
                      <button
                        onClick={() => setShelfAuditImage(null)}
                        className="text-xs text-rose-500 hover:underline font-semibold"
                      >
                        Retake Photo
                      </button>
                    </div>
                  ) : (
                    <label htmlFor="shelf_cam_file" className="cursor-pointer block space-y-2">
                      <Camera className="w-10 h-10 text-amber-500 mx-auto" />
                      <div className="text-sm font-bold">{t.shelf_dialog_snap}</div>
                      <div className={`text-[11px] ${labelCls}`}>Point at aisle / rack front faces</div>
                    </label>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button
                    onClick={() => {
                      setShowShelfModal(false);
                      setShelfAuditImage(null);
                    }}
                    className={`py-2.5 rounded-xl border text-xs font-semibold hover:bg-neutral-500/10 ${subCardCls}`}
                  >
                    {t.shelf_dialog_cancel}
                  </button>
                  <button
                    onClick={handleExecuteShelfAudit}
                    disabled={!shelfAuditImage || isAuditingShelf}
                    className="bg-gradient-to-r from-amber-500 to-amber-600 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md"
                  >
                    {isAuditingShelf ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Scanning...
                      </>
                    ) : (
                      t.shelf_dialog_btn
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Modal: Live UPI QR Code */}
          {qrModalData && (
            <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
              <div className={`border rounded-2xl p-6 max-w-xs w-full text-center space-y-4 shadow-2xl ${cardCls}`}>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-teal-600 dark:text-teal-400 uppercase tracking-wider">UPI Payment QR</span>
                  <button onClick={() => setQrModalData(null)} className={`${labelCls} hover:text-rose-500`}>
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="bg-white p-3 rounded-2xl shadow-inner inline-block border border-neutral-200">
                  <img src={qrModalData.qrDataUrl} alt="UPI QR" className="w-56 h-56 mx-auto" />
                </div>
                <div>
                  <div className="text-sm font-bold">{qrModalData.title}</div>
                  <div className="text-xl font-black text-rose-500 mt-0.5">₹{qrModalData.amount.toFixed(2)}</div>
                  <div className={`text-[11px] mt-1 ${labelCls}`}>UPI ID: {profile.upi_id}</div>
                </div>
                <button
                  onClick={() => setQrModalData(null)}
                  className="w-full bg-[#0F766E] text-white text-xs font-bold py-2.5 rounded-xl"
                >
                  Done
                </button>
              </div>
            </div>
          )}

          {/* Modal: Store Profile & Settings */}
          {showSettingsModal && (
            <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
              <div className={`border rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-2xl ${cardCls}`}>
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-base flex items-center gap-2">
                    <Settings className="w-4 h-4 text-teal-500" /> Store Profile Settings
                  </h3>
                  <button onClick={() => setShowSettingsModal(false)} className={`${labelCls} hover:text-rose-500`}>
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className={`text-xs block mb-1 ${labelCls}`}>Store Name</label>
                    <input
                      type="text"
                      value={profile.shop_name}
                      onChange={(e) => setProfile({ ...profile, shop_name: e.target.value })}
                      className={`w-full rounded-xl px-3 py-2 text-xs border ${inputCls}`}
                    />
                  </div>
                  <div>
                    <label className={`text-xs block mb-1 ${labelCls}`}>Owner Name</label>
                    <input
                      type="text"
                      value={profile.owner_name}
                      onChange={(e) => setProfile({ ...profile, owner_name: e.target.value })}
                      className={`w-full rounded-xl px-3 py-2 text-xs border ${inputCls}`}
                    />
                  </div>
                  <div>
                    <label className={`text-xs block mb-1 ${labelCls}`}>Store UPI ID</label>
                    <input
                      type="text"
                      value={profile.upi_id}
                      onChange={(e) => setProfile({ ...profile, upi_id: e.target.value })}
                      className={`w-full rounded-xl px-3 py-2 text-xs border ${inputCls}`}
                    />
                  </div>

                  <button
                    onClick={async () => {
                      await fetch('/api/profile/update', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          phone: profile.phone_number,
                          shop_name: profile.shop_name,
                          owner_name: profile.owner_name,
                          upi_id: profile.upi_id,
                        }),
                      });
                      showToast('Profile updated successfully!');
                      setShowSettingsModal(false);
                    }}
                    className="w-full bg-[#0F766E] hover:bg-teal-600 text-white font-bold py-2.5 rounded-xl text-xs transition-all"
                  >
                    💾 Save Profile Changes
                  </button>

                  <div className="pt-2 border-t border-inherit">
                    <button
                      onClick={handleLogout}
                      className="w-full bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-500 font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 transition-all"
                    >
                      <LogOut className="w-4 h-4" /> Logout Store Account
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
