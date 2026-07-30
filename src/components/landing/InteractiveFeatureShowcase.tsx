import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  CreditCard,
  KanbanSquare,
  Send,
  Check,
  Sparkles,
  Lock,
  Globe,
  TrendingUp,
  ArrowRight,
  MessageSquare,
  ChevronRight,
  ShieldCheck,
  Search,
  Plus,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/* Types & Data Definitions                                           */
/* ------------------------------------------------------------------ */

interface FeatureTab {
  id: 'crm' | 'invoicing' | 'kanban' | 'outreach';
  icon: typeof Users;
  title: string;
  subtitle: string;
  badge: string;
  accentColor: string;
}

const FEATURE_TABS: FeatureTab[] = [
  {
    id: 'crm',
    icon: Users,
    title: 'Client CRM & Contacts',
    subtitle: 'Unified client profiles, history, and engagement tracking',
    badge: 'Customer 360',
    accentColor: 'from-violet-600 to-indigo-600',
  },
  {
    id: 'invoicing',
    icon: CreditCard,
    title: 'Multi-Currency Invoicing',
    subtitle: 'Instantly invoice in NGN, USD, EUR, GBP',
    badge: 'Multi-Currency',
    accentColor: 'from-purple-600 to-amber-500',
  },
  {
    id: 'kanban',
    icon: KanbanSquare,
    title: 'Visual Workflow Kanban',
    subtitle: 'Track deals from onboarding to payment',
    badge: 'Pipeline',
    accentColor: 'from-indigo-600 to-violet-500',
  },
  {
    id: 'outreach',
    icon: Send,
    title: 'WhatsApp & Email Outreach',
    subtitle: 'One-click direct messaging',
    badge: 'Smart Messaging',
    accentColor: 'from-emerald-600 to-teal-500',
  },
];

/* ------------------------------------------------------------------ */
/* Sparkline SVG Helper                                                */
/* ------------------------------------------------------------------ */
function Sparkline({ data, color = '#6D5FFA' }: { data: number[]; color?: string }) {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const width = 64;
  const height = 20;

  const points = data
    .map((val, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((val - min) / range) * (height - 4) - 2;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <svg width={width} height={height} className="overflow-visible">
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Visual Mockup 1: Client CRM & Contacts                              */
/* ------------------------------------------------------------------ */
function CrmMockup() {
  const [selectedContact, setSelectedContact] = useState('Acme Studio');

  const contacts = [
    {
      name: 'Acme Studio',
      email: 'alex@acmestudio.com',
      status: 'Active',
      statusColor: 'bg-[#2ECC71]/15 text-[#2ECC71] border-[#2ECC71]/30',
      statusDot: 'bg-[#2ECC71]',
      spend: '₦18,400,000',
      currency: 'NGN',
      activity: 'Invoice #INV-1042 Paid',
      trend: [12, 18, 14, 22, 28, 35, 42],
      sparkColor: '#2ECC71',
    },
    {
      name: 'Nexus Tech Ltd',
      email: 'billing@nexustech.io',
      status: 'Lead',
      statusColor: 'bg-[#FFD700]/15 text-[#D4A017] dark:text-[#FFD700] border-[#FFD700]/40',
      statusDot: 'bg-[#FFD700]',
      spend: '₦9,200,000',
      currency: 'NGN',
      activity: 'Discovery Call Completed',
      trend: [5, 9, 12, 11, 19, 24, 28],
      sparkColor: '#FFD700',
    },
    {
      name: 'Vortex Global',
      email: 'contact@vortex.ng',
      status: 'Active',
      statusColor: 'bg-[#2ECC71]/15 text-[#2ECC71] border-[#2ECC71]/30',
      statusDot: 'bg-[#2ECC71]',
      spend: '₦14.5M',
      currency: 'NGN',
      activity: 'Retainer Signed (24h ago)',
      trend: [10, 15, 20, 25, 30, 45, 60],
      sparkColor: '#2ECC71',
    },
    {
      name: 'Halcyon Media',
      email: 'team@halcyon.co.uk',
      status: 'Lead',
      statusColor: 'bg-[#FFD700]/15 text-[#D4A017] dark:text-[#FFD700] border-[#FFD700]/40',
      statusDot: 'bg-[#FFD700]',
      spend: '₦6,500,000',
      currency: 'NGN',
      activity: 'Proposal Sent via Email',
      trend: [4, 6, 8, 12, 10, 16, 20],
      sparkColor: '#FFD700',
    },
  ];

  return (
    <div className="space-y-3.5 text-slate-100 text-xs font-sans">
      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        <div className="p-2.5 rounded-xl bg-purple-950/40 border border-purple-500/20 backdrop-blur-md">
          <span className="text-[10px] text-purple-300/70 font-medium block">Total Managed Clients</span>
          <span className="text-sm font-bold text-white flex items-center gap-1 mt-0.5">
            142 <span className="text-[10px] text-emerald-400 font-normal">+12% mo</span>
          </span>
        </div>
        <div className="p-2.5 rounded-xl bg-purple-950/40 border border-purple-500/20 backdrop-blur-md">
          <span className="text-[10px] text-purple-300/70 font-medium block">Active Pipeline</span>
          <span className="text-sm font-bold text-amber-300 mt-0.5 block">₦48,600,000</span>
        </div>
        <div className="p-2.5 rounded-xl bg-purple-950/40 border border-purple-500/20 backdrop-blur-md">
          <span className="text-[10px] text-purple-300/70 font-medium block">Engagement Rate</span>
          <span className="text-sm font-bold text-emerald-400 flex items-center gap-1 mt-0.5">
            98.4% <ShieldCheck className="w-3 h-3 text-emerald-400" />
          </span>
        </div>
      </div>

      {/* Control / Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 p-2 rounded-xl bg-purple-900/30 border border-purple-500/20">
        <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-purple-950/60 text-purple-200 border border-purple-500/30 flex-1">
          <Search className="w-3.5 h-3.5 text-purple-400 shrink-0" />
          <span className="text-[11px] text-purple-300/70 truncate">Search contacts, tags or history...</span>
        </div>
        <div className="flex items-center gap-1 justify-between sm:justify-end">
          <span className="px-2 py-1 rounded-md bg-purple-600/30 text-purple-200 text-[10px] font-semibold border border-purple-500/40">
            Filter: All
          </span>
          <span className="px-2.5 py-1 rounded-md bg-violet-600 text-white text-[10px] font-bold flex items-center gap-1 shadow-sm">
            <Plus className="w-3 h-3" /> New Client
          </span>
        </div>
      </div>

      {/* Contacts List Table */}
      <div className="rounded-xl border border-purple-500/20 bg-purple-950/30 overflow-hidden divide-y divide-purple-500/10">
        {contacts.map((c) => (
          <div
            key={c.name}
            onClick={() => setSelectedContact(c.name)}
            className={`p-2.5 flex items-center justify-between gap-3 cursor-pointer transition-all ${
              selectedContact === c.name
                ? 'bg-purple-800/40 border-l-4 border-l-violet-400'
                : 'hover:bg-purple-900/20'
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-700 text-white font-bold flex items-center justify-center text-xs shrink-0 shadow-sm">
                {c.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-white text-xs truncate">{c.name}</span>
                  <span
                    className={`px-1.5 py-0.5 rounded-md text-[9px] font-bold border flex items-center gap-1 shrink-0 ${c.statusColor}`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${c.statusDot}`} />
                    {c.status}
                  </span>
                </div>
                <p className="text-[10px] text-purple-300/60 truncate">{c.activity}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <div className="text-right">
                <span className="font-bold text-white text-xs block">{c.spend}</span>
                <span className="text-[9px] text-purple-300/60">{c.currency} Volume</span>
              </div>
              <div className="hidden md:block">
                <Sparkline data={c.trend} color={c.sparkColor} />
              </div>
              <ChevronRight className="w-4 h-4 text-purple-400/60" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Visual Mockup 2: Multi-Currency Invoicing                           */
/* ------------------------------------------------------------------ */
function InvoicingMockup() {
  const [selectedCurrency, setSelectedCurrency] = useState<'NGN' | 'USD' | 'EUR' | 'GBP'>('NGN');

  const currencyConfig = {
    NGN: { symbol: '₦', rate: '1,550.00', color: 'text-emerald-400', sample: '₦7,440,000.00' },
    USD: { symbol: '$', rate: '1.00', color: 'text-violet-400', sample: '$4,800.00' },
    EUR: { symbol: '€', rate: '0.92', color: 'text-sky-400', sample: '€4,416.00' },
    GBP: { symbol: '£', rate: '0.78', color: 'text-amber-400', sample: '£3,744.00' },
  };

  return (
    <div className="space-y-3.5 text-slate-100 text-xs font-sans">
      {/* Currency Selector Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 p-2.5 rounded-xl bg-purple-950/40 border border-purple-500/20 backdrop-blur-md">
        <div className="flex items-center gap-1.5">
          <Globe className="w-4 h-4 text-purple-400" />
          <span className="text-[11px] font-semibold text-purple-200">Select Billing Currency:</span>
        </div>
        <div className="flex items-center gap-1 bg-purple-900/60 p-1 rounded-lg border border-purple-500/30 overflow-x-auto">
          {(['NGN', 'USD', 'EUR', 'GBP'] as const).map((curr) => (
            <button
              key={curr}
              type="button"
              onClick={() => setSelectedCurrency(curr)}
              className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-all shrink-0 ${
                selectedCurrency === curr
                  ? 'bg-violet-600 text-white shadow-sm'
                  : 'text-purple-300/70 hover:text-white'
              }`}
            >
              {curr} ({currencyConfig[curr].symbol})
            </button>
          ))}
        </div>
      </div>

      {/* Invoice Card Container */}
      <div className="p-3.5 rounded-xl bg-purple-950/50 border border-purple-500/30 space-y-3">
        {/* Invoice Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-purple-500/20 pb-2.5">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-white text-sm">Invoice #INV-2026-08</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#2ECC71]/15 text-[#2ECC71] border border-[#2ECC71]/30">
                PAID IN FULL
              </span>
            </div>
            <p className="text-[10px] text-purple-300/70 mt-0.5">Customer: Acme Studio Inc. · Issued: Jul 29, 2026</p>
          </div>
          <div className="text-left sm:text-right">
            <span className="text-[10px] text-purple-300/60 block">Total Amount</span>
            <span className={`text-base font-extrabold ${currencyConfig[selectedCurrency].color}`}>
              {currencyConfig[selectedCurrency].sample}
            </span>
          </div>
        </div>

        {/* Invoice Line Items */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between p-2 rounded-lg bg-purple-900/30 text-[11px]">
            <span className="text-purple-200 font-medium">Brand Strategy & Systems Design</span>
            <span className="font-bold text-white">
              {selectedCurrency === 'NGN' ? '₦4,960,000' : selectedCurrency === 'USD' ? '$3,200.00' : selectedCurrency === 'EUR' ? '€2,944.00' : '£2,496.00'}
            </span>
          </div>
          <div className="flex items-center justify-between p-2 rounded-lg bg-purple-900/30 text-[11px]">
            <span className="text-purple-200 font-medium">UI/UX Prototype & Development</span>
            <span className="font-bold text-white">
              {selectedCurrency === 'NGN' ? '₦2,480,000' : selectedCurrency === 'USD' ? '$1,600.00' : selectedCurrency === 'EUR' ? '€1,472.00' : '£1,248.00'}
            </span>
          </div>
        </div>

        {/* Currency Summary & Paystack Badge */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1.5 pt-1.5 text-[10px] text-purple-300/80 border-t border-purple-500/20">
          <span className="flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-emerald-400" /> Auto FX conversion at official exchange rates
          </span>
          <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-semibold">
            ✓ Paystack Online Checkout Enabled
          </span>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Visual Mockup 3: Visual Workflow Kanban                            */
/* ------------------------------------------------------------------ */
function KanbanMockup() {
  const columns = [
    {
      title: 'Lead Inflow',
      color: 'border-amber-500/30 text-amber-300',
      count: 2,
      cards: [
        { title: 'Halcyon Media Rebrand', value: '₦6,500,000', client: 'Halcyon UK', tag: 'Lead' },
        { title: 'Peak Fitness Portal', value: '₦1,800,000', client: 'Peak Fit', tag: 'Lead' },
      ],
    },
    {
      title: 'Proposal Sent',
      color: 'border-violet-500/30 text-violet-300',
      count: 1,
      cards: [
        { title: 'Nexus Mobile App Phase 1', value: '₦9,200,000', client: 'Nexus Tech', tag: 'Pending' },
      ],
    },
    {
      title: 'In Progress',
      color: 'border-purple-500/30 text-purple-300',
      count: 2,
      cards: [
        { title: 'Acme Studio Web System', value: '₦18,400,000', client: 'Acme Studio', tag: 'Active', progress: 75 },
        { title: 'Vortex Annual Retainer', value: '₦14.5M', client: 'Vortex', tag: 'Active', progress: 40 },
      ],
    },
    {
      title: 'Paid & Closed',
      color: 'border-emerald-500/30 text-emerald-300',
      count: 1,
      cards: [
        { title: 'Blue Harbor Analytics', value: '₦15,000,000', client: 'Blue Harbor', tag: 'Paid', progress: 100 },
      ],
    },
  ];

  return (
    <div className="space-y-3 text-slate-100 text-xs font-sans">
      <div className="flex gap-2.5 overflow-x-auto pb-2 sm:grid sm:grid-cols-4 scrollbar-none">
        {columns.map((col) => (
          <div key={col.title} className="p-2.5 rounded-xl bg-purple-950/40 border border-purple-500/20 flex flex-col min-h-[170px] min-w-[140px] sm:min-w-0 shrink-0 sm:shrink">
            <div className={`flex items-center justify-between pb-2 border-b border-purple-500/20 px-1 ${col.color}`}>
              <span className="font-bold text-[10px] sm:text-[11px] uppercase tracking-wider truncate">{col.title}</span>
              <span className="w-4 h-4 rounded-full bg-purple-900/80 text-[10px] font-bold text-center flex items-center justify-center shrink-0">
                {col.count}
              </span>
            </div>

            <div className="space-y-2 mt-2 flex-1">
              {col.cards.map((card) => (
                <div
                  key={card.title}
                  className="p-2.5 rounded-lg bg-purple-900/40 border border-purple-500/30 hover:border-violet-400 transition-all shadow-sm space-y-1.5"
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[9px] font-bold text-purple-300/80 truncate max-w-[80px]">{card.client}</span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[8px] font-extrabold shrink-0 ${
                        card.tag === 'Paid'
                          ? 'bg-[#2ECC71]/20 text-[#2ECC71]'
                          : card.tag === 'Lead'
                          ? 'bg-[#FFD700]/20 text-[#FFD700]'
                          : 'bg-violet-400/20 text-violet-300'
                      }`}
                    >
                      {card.tag}
                    </span>
                  </div>
                  <p className="font-semibold text-white text-[11px] leading-tight truncate">{card.title}</p>
                  <div className="flex items-center justify-between gap-1 pt-1 border-t border-purple-500/20">
                    <span className="font-bold text-amber-300 text-[10px] sm:text-[11px] truncate">{card.value}</span>
                    {card.progress !== undefined && (
                      <div className="w-10 bg-purple-950 rounded-full h-1.5 overflow-hidden shrink-0">
                        <div className="bg-gradient-to-r from-violet-500 to-emerald-400 h-1.5 rounded-full" style={{ width: `${card.progress}%` }} />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Visual Mockup 4: WhatsApp & Email Outreach                          */
/* ------------------------------------------------------------------ */
function OutreachMockup() {
  const [channel, setChannel] = useState<'whatsapp' | 'email'>('whatsapp');

  return (
    <div className="space-y-3 text-slate-100 text-xs font-sans">
      {/* Channel Switcher */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 p-2 rounded-xl bg-purple-950/40 border border-purple-500/20">
        <div className="flex items-center gap-1.5">
          <MessageSquare className="w-4 h-4 text-emerald-400" />
          <span className="text-[11px] font-semibold text-purple-200">Outreach Mode:</span>
        </div>
        <div className="flex items-center gap-1 bg-purple-900/60 p-1 rounded-lg border border-purple-500/30">
          <button
            type="button"
            onClick={() => setChannel('whatsapp')}
            className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all flex items-center gap-1.5 flex-1 sm:flex-initial justify-center ${
              channel === 'whatsapp' ? 'bg-emerald-600 text-white shadow-sm' : 'text-purple-300/70 hover:text-white'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-300" /> WhatsApp Direct
          </button>
          <button
            type="button"
            onClick={() => setChannel('email')}
            className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all flex items-center gap-1.5 flex-1 sm:flex-initial justify-center ${
              channel === 'email' ? 'bg-violet-600 text-white shadow-sm' : 'text-purple-300/70 hover:text-white'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-violet-300" /> Email Templates
          </button>
        </div>
      </div>

      {/* Interactive Preview Pane */}
      {channel === 'whatsapp' ? (
        <div className="p-3.5 rounded-xl bg-[#0B141A] border border-emerald-500/30 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-emerald-900/40">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-emerald-600 text-white font-bold text-[10px] flex items-center justify-center">
                AS
              </div>
              <div>
                <p className="font-bold text-emerald-400 text-[11px]">Acme Studio (+234 803 123 4567)</p>
                <p className="text-[9px] text-emerald-600">Online · Template Auto-Filled</p>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
              One-Click Send Ready
            </span>
          </div>

          <div className="p-3 rounded-xl bg-[#111B21] border border-emerald-900/50 text-emerald-100 text-[11px] space-y-2 max-w-[95%] sm:max-w-[90%] font-mono">
            <p>Hi Alex,</p>
            <p>
              Just a friendly note that your account currently shows an outstanding balance of <strong className="text-amber-300">₦4,800,000.00</strong> for Invoice #INV-1042.
            </p>
            <div className="p-2 rounded bg-[#202C33] border border-emerald-500/30 text-[10px] space-y-1 font-sans">
              <p className="font-bold text-white flex items-center gap-1">
                💳 Pay Online Securely via Paystack:
              </p>
              <p className="text-emerald-400 underline break-all text-[9.5px]">
                https://app.ledgerly.io/portal/invoice/inv-1042
              </p>
            </div>
            <p className="text-[9px] text-emerald-500 text-right pt-1">10:42 AM ✓✓</p>
          </div>
        </div>
      ) : (
        <div className="p-3.5 rounded-xl bg-purple-950/60 border border-purple-500/30 space-y-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1 pb-2 border-b border-purple-500/20 text-[11px]">
            <span className="text-purple-300 font-semibold truncate">Subject: Payment Reminder for Invoice #INV-1042</span>
            <span className="px-2 py-0.5 rounded bg-violet-600/30 text-violet-300 font-bold text-[9px] shrink-0">PDF Attached</span>
          </div>
          <div className="p-3 rounded-lg bg-purple-900/30 border border-purple-500/20 text-[11px] text-purple-200 space-y-2">
            <p>Dear Acme Studio,</p>
            <p>Please find attached your invoice PDF (#INV-1042) for ₦4,800,000. You can review or settle payment directly using the link below.</p>
            <div className="p-2 rounded bg-purple-950/80 border border-purple-500/40 text-[10px] text-emerald-300 flex items-center justify-between">
              <span>📄 Invoice_INV-1042.pdf (142 KB)</span>
              <span className="font-bold hover:underline cursor-pointer">View PDF →</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Main Interactive Feature Showcase Component                        */
/* ------------------------------------------------------------------ */
export function InteractiveFeatureShowcase() {
  const [activeTabId, setActiveTabId] = useState<'crm' | 'invoicing' | 'kanban' | 'outreach'>('crm');
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const sectionRef = useRef<HTMLDivElement>(null);
  const [scrollPercentage, setScrollPercentage] = useState(0);

  // 6-second auto-advance interval
  const DURATION_MS = 6000;

  useEffect(() => {
    if (isPaused) return;

    const intervalTime = 50;
    const step = (intervalTime / DURATION_MS) * 100;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          setActiveTabId((current) => {
            const currentIndex = FEATURE_TABS.findIndex((t) => t.id === current);
            const nextIndex = (currentIndex + 1) % FEATURE_TABS.length;
            return FEATURE_TABS[nextIndex].id;
          });
          return 0;
        }
        return prev + step;
      });
    }, intervalTime);

    return () => clearInterval(timer);
  }, [isPaused, activeTabId]);

  // Handle manual tab click
  const handleTabClick = (id: 'crm' | 'invoicing' | 'kanban' | 'outreach') => {
    setActiveTabId(id);
    setProgress(0);
  };

  // Undulating scroll effect calculation
  useEffect(() => {
    const handleScroll = () => {
      if (!sectionRef.current) return;
      const rect = sectionRef.current.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      const totalHeight = rect.height;
      const currentPos = windowHeight - rect.top;
      const percentage = Math.max(0, Math.min(100, (currentPos / (totalHeight + windowHeight)) * 100));
      setScrollPercentage(percentage);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const activeTab = FEATURE_TABS.find((t) => t.id === activeTabId) || FEATURE_TABS[0];

  return (
    <section
      ref={sectionRef}
      className="relative w-full py-16 md:py-24 overflow-hidden bg-gradient-to-b from-[#F8F7FF] via-[#F3EFFF] to-[#FAF5FF] dark:from-[#0E0C1B] dark:via-[#140F28] dark:to-[#0F0D1E] transition-colors duration-300"
    >
      {/* Undulating Gradient Scroll Flow Line - Harmonious Violet Palette */}
      <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-purple-200 via-violet-500 to-indigo-400 opacity-60 dark:opacity-40">
        <div
          className="w-full bg-gradient-to-b from-violet-600 via-purple-500 to-indigo-500 shadow-[0_0_12px_rgba(109,95,250,0.8)] transition-all duration-150"
          style={{ height: `${scrollPercentage}%` }}
        />
      </div>

      {/* Section Background Soft Ambient Glow Orbs - Harmonized Lavender & Purple */}
      <div className="pointer-events-none absolute -left-20 top-1/4 w-96 h-96 rounded-full bg-violet-400/15 dark:bg-violet-600/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 bottom-1/4 w-96 h-96 rounded-full bg-indigo-400/15 dark:bg-purple-600/15 blur-3xl" />

      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        {/* Section Header */}
        <div className="mx-auto max-w-2xl text-center mb-12 md:mb-16">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-violet-500/15 via-purple-500/20 to-indigo-500/15 border border-purple-300/60 dark:border-purple-600/50 text-purple-900 dark:text-purple-200 text-xs font-bold shadow-sm backdrop-blur-md mb-3"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-pulse" /> Interactive Feature Suite
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white"
          >
            Interactive Workspace <span className="text-violet-600 dark:text-violet-400">Flow</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mt-3 text-base sm:text-lg text-slate-600 dark:text-purple-200/80"
          >
            Explore how Ledgerly simplifies every phase of client operations, from lead acquisition to instant payment settlement.
          </motion.p>
        </div>

        {/* 2-Column Main Showcase Grid */}
        <div
          className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-stretch"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          {/* LEFT COLUMN: Vertical Interactive Tabs Stack (5 cols on lg) */}
          <div className="lg:col-span-5 flex flex-col justify-center space-y-3.5">
            {FEATURE_TABS.map((tab) => {
              const isActive = tab.id === activeTabId;
              const TabIcon = tab.icon;

              return (
                <div
                  key={tab.id}
                  onClick={() => handleTabClick(tab.id)}
                  className={`relative cursor-pointer rounded-2xl p-4 sm:p-5 transition-all duration-300 border overflow-hidden ${
                    isActive
                      ? 'bg-white dark:bg-[#1C1236] border-purple-400 dark:border-purple-500/80 shadow-xl shadow-purple-500/10 translate-x-1 sm:translate-x-2 ring-1 ring-purple-400/20'
                      : 'bg-white/70 dark:bg-[#140D2B]/60 backdrop-blur-md border-purple-100/90 dark:border-purple-900/40 hover:bg-white dark:hover:bg-[#180F33] hover:border-purple-300/80 dark:hover:border-purple-700 hover:shadow-md'
                  }`}
                >
                  {/* Deep purple active sidebar accent bar */}
                  {isActive && (
                    <motion.div
                      layoutId="activeAccentBar"
                      className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-violet-600 via-purple-600 to-amber-400 shadow-[0_0_10px_rgba(147,51,234,0.5)]"
                    />
                  )}

                  <div className="flex items-start gap-4">
                    {/* Unique Icon container with glowing theme halo */}
                    <div
                      className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300 ${
                        isActive
                          ? `bg-gradient-to-br ${tab.accentColor} text-white shadow-lg shadow-violet-500/30 ring-2 ring-violet-400/30 scale-105`
                          : 'bg-purple-100/80 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200/50 dark:border-purple-800/50'
                      }`}
                    >
                      <TabIcon className="w-5.5 h-5.5" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-bold text-[#2B1B4D] dark:text-white text-base sm:text-lg leading-snug truncate">
                          {tab.title}
                        </h3>
                        {isActive ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-400/20 to-purple-400/20 text-amber-700 dark:text-amber-300 border border-amber-400/40 text-[10px] font-extrabold shrink-0 shadow-xs">
                            <Check className="w-3 h-3 text-amber-500" /> Active
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold text-purple-600/70 dark:text-purple-400/60 bg-purple-50 dark:bg-purple-900/30 px-2 py-0.5 rounded-md border border-purple-100 dark:border-purple-800/40 shrink-0">
                            {tab.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-xs sm:text-sm text-slate-600 dark:text-purple-200/70 mt-1 leading-relaxed">
                        {tab.subtitle}
                      </p>
                    </div>
                  </div>

                  {/* Progress bar countdown line on active card */}
                  {isActive && (
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-purple-200/50 dark:bg-purple-900/50 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-violet-600 via-purple-500 to-amber-400 transition-all duration-75 ease-linear"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* RIGHT COLUMN: Stylized Dark-Violet Browser Stage Box (7 cols on lg) */}
          <div className="lg:col-span-7 flex flex-col justify-center">
            <div className="rounded-2xl border border-purple-900/40 bg-[#160D2E] shadow-2xl overflow-hidden text-slate-100 flex flex-col">
              {/* Browser Window Header & Address Bar */}
              <div className="flex items-center justify-between px-4 py-3 bg-[#0F0821] border-b border-purple-900/50 text-xs">
                {/* Mac Dots */}
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-red-500/80" />
                  <span className="w-3 h-3 rounded-full bg-yellow-500/80" />
                  <span className="w-3 h-3 rounded-full bg-green-500/80" />
                </div>

                {/* Simulated URL Bar - Clean app.ledgerly.io */}
                <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-purple-950/80 border border-purple-500/30 text-[11px] text-purple-200/80 max-w-sm w-full mx-2 justify-center font-mono truncate">
                  <Lock className="w-3 h-3 text-emerald-400 shrink-0" />
                  <span className="truncate">https://app.ledgerly.io/workspace/{activeTabId}</span>
                </div>

                {/* Status Indicator */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[10px] text-emerald-400 font-semibold hidden sm:inline">Live Sync</span>
                </div>
              </div>

              {/* Browser Stage Content Body */}
              <div className="p-4 sm:p-6 bg-gradient-to-b from-[#180E33] to-[#120A27] min-h-[380px] flex flex-col justify-between">
                {/* Stage Title Header */}
                <div className="flex items-center justify-between pb-3 border-b border-purple-500/20 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-violet-500/20 text-violet-300 border border-violet-500/30 uppercase tracking-wide">
                      {activeTab.badge}
                    </span>
                    <h4 className="font-bold text-white text-sm sm:text-base">{activeTab.title}</h4>
                  </div>
                  <span className="text-[11px] text-purple-300/60 hidden sm:inline">Ledgerly Engine v2.4</span>
                </div>

                {/* Animated Mock Content */}
                <div className="flex-1 flex flex-col justify-center">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={activeTabId}
                      initial={{ opacity: 0, y: 14 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -14 }}
                      transition={{ duration: 0.3 }}
                    >
                      {activeTabId === 'crm' && <CrmMockup />}
                      {activeTabId === 'invoicing' && <InvoicingMockup />}
                      {activeTabId === 'kanban' && <KanbanMockup />}
                      {activeTabId === 'outreach' && <OutreachMockup />}
                    </motion.div>
                  </AnimatePresence>
                </div>

                {/* Browser Stage Footer Bar */}
                <div className="pt-3 border-t border-purple-500/20 mt-4 flex items-center justify-between text-[11px] text-purple-300/70">
                  <span>💡 Tip: Click tabs on the left to inspect live workspace views</span>
                  <a
                    href="/auth"
                    className="font-bold text-violet-300 hover:text-white flex items-center gap-1 transition-colors"
                  >
                    Open Live Demo <ArrowRight className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

