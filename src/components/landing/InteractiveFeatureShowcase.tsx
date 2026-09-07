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
    subtitle: 'Unified client profiles, complete transaction history, and engagement tracking',
    badge: 'Client CRM',
    accentColor: 'from-violet-600 to-indigo-600',
  },
  {
    id: 'invoicing',
    icon: CreditCard,
    title: 'Multi-Currency Invoicing',
    subtitle: 'Instant global invoices in NGN, USD, EUR, GBP with auto FX conversion',
    badge: 'Smart Invoicing',
    accentColor: 'from-purple-600 to-amber-500',
  },
  {
    id: 'kanban',
    icon: KanbanSquare,
    title: 'Visual Workflow',
    subtitle: 'Track deals and deliverables effortlessly from lead inflow to final payout',
    badge: 'Visual Pipeline',
    accentColor: 'from-indigo-600 to-violet-500',
  },
  {
    id: 'outreach',
    icon: Send,
    title: 'Deals Outreach',
    subtitle: 'Send instant payment links and invoice reminders via WhatsApp & Email',
    badge: 'Direct Outreach',
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
  const width = 84;
  const height = 26;

  const points = data
    .map((val, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((val - min) / range) * (height - 6) - 3;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <svg width={width} height={height} className="overflow-visible">
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2.5"
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
      activity: 'Invoice #INV-1042 Paid in full',
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
      spend: '₦14,500,000',
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
    <div className="space-y-4 text-slate-100 text-xs sm:text-sm font-sans">
      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3.5 rounded-2xl bg-purple-950/50 border border-purple-500/30 backdrop-blur-md shadow-sm">
          <span className="text-xs text-purple-300/80 font-medium block">Total Managed Clients</span>
          <span className="text-base sm:text-lg font-extrabold text-white flex items-center gap-1.5 mt-0.5">
            142 <span className="text-xs text-emerald-400 font-semibold">+12% mo</span>
          </span>
        </div>
        <div className="p-3.5 rounded-2xl bg-purple-950/50 border border-purple-500/30 backdrop-blur-md shadow-sm">
          <span className="text-xs text-purple-300/80 font-medium block">Active Pipeline</span>
          <span className="text-base sm:text-lg font-extrabold text-amber-300 mt-0.5 block">₦48,600,000</span>
        </div>
        <div className="p-3.5 rounded-2xl bg-purple-950/50 border border-purple-500/30 backdrop-blur-md shadow-sm">
          <span className="text-xs text-purple-300/80 font-medium block">Engagement Rate</span>
          <span className="text-base sm:text-lg font-extrabold text-emerald-400 flex items-center gap-1.5 mt-0.5">
            98.4% <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </span>
        </div>
      </div>

      {/* Control / Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 p-2.5 rounded-2xl bg-purple-900/30 border border-purple-500/25">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-purple-950/70 text-purple-200 border border-purple-500/30 flex-1">
          <Search className="w-4 h-4 text-purple-400 shrink-0" />
          <span className="text-xs text-purple-300/80 truncate">Search contacts, tags or history...</span>
        </div>
        <div className="flex items-center gap-2 justify-between sm:justify-end">
          <span className="px-2.5 py-1 rounded-lg bg-purple-600/30 text-purple-200 text-xs font-semibold border border-purple-500/40">
            Filter: All
          </span>
          <span className="px-3 py-1.5 rounded-lg bg-violet-600 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm">
            <Plus className="w-3.5 h-3.5" /> New Client
          </span>
        </div>
      </div>

      {/* Contacts List Table */}
      <div className="rounded-2xl border border-purple-500/25 bg-purple-950/40 overflow-hidden divide-y divide-purple-500/15">
        {contacts.map((c) => (
          <div
            key={c.name}
            onClick={() => setSelectedContact(c.name)}
            className={`p-3 sm:p-3.5 flex items-center justify-between gap-3 cursor-pointer transition-all ${
              selectedContact === c.name
                ? 'bg-purple-800/50 border-l-4 border-l-violet-400'
                : 'hover:bg-purple-900/30'
            }`}
          >
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-700 text-white font-bold flex items-center justify-center text-xs shrink-0 shadow-md">
                {c.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white text-xs sm:text-sm truncate">{c.name}</span>
                  <span
                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold border flex items-center gap-1 shrink-0 ${c.statusColor}`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${c.statusDot}`} />
                    {c.status}
                  </span>
                </div>
                <p className="text-xs text-purple-300/70 truncate mt-0.5">{c.activity}</p>
              </div>
            </div>

            <div className="flex items-center gap-4 shrink-0">
              <div className="text-right">
                <span className="font-extrabold text-white text-xs sm:text-sm block">{c.spend}</span>
                <span className="text-[10px] text-purple-300/70">{c.currency} Volume</span>
              </div>
              <div className="hidden sm:block">
                <Sparkline data={c.trend} color={c.sparkColor} />
              </div>
              <ChevronRight className="w-4 h-4 text-purple-400/70" />
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
    <div className="space-y-4 text-slate-100 text-xs sm:text-sm font-sans">
      {/* Currency Selector Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 p-3 rounded-2xl bg-purple-950/50 border border-purple-500/25 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-purple-400" />
          <span className="text-xs font-semibold text-purple-200">Select Billing Currency:</span>
        </div>
        <div className="flex items-center gap-1.5 bg-purple-900/60 p-1.5 rounded-xl border border-purple-500/30 overflow-x-auto">
          {(['NGN', 'USD', 'EUR', 'GBP'] as const).map((curr) => (
            <button
              key={curr}
              type="button"
              onClick={() => setSelectedCurrency(curr)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
                selectedCurrency === curr
                  ? 'bg-violet-600 text-white shadow-md'
                  : 'text-purple-300/70 hover:text-white'
              }`}
            >
              {curr} ({currencyConfig[curr].symbol})
            </button>
          ))}
        </div>
      </div>

      {/* Invoice Card Container */}
      <div className="p-4 sm:p-5 rounded-2xl bg-purple-950/60 border border-purple-500/30 space-y-4 shadow-lg">
        {/* Invoice Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-purple-500/20 pb-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-extrabold text-white text-base">Invoice #INV-2026-08</span>
              <span className="px-2.5 py-0.5 rounded-md text-xs font-bold bg-[#2ECC71]/20 text-[#2ECC71] border border-[#2ECC71]/35">
                PAID IN FULL
              </span>
            </div>
            <p className="text-xs text-purple-300/70 mt-1">Customer: Acme Studio Inc. · Issued: Jul 29, 2026</p>
          </div>
          <div className="text-left sm:text-right">
            <span className="text-xs text-purple-300/70 block">Total Amount</span>
            <span className={`text-lg sm:text-xl font-extrabold ${currencyConfig[selectedCurrency].color}`}>
              {currencyConfig[selectedCurrency].sample}
            </span>
          </div>
        </div>

        {/* Invoice Line Items */}
        <div className="space-y-2">
          <div className="flex items-center justify-between p-3 rounded-xl bg-purple-900/40 text-xs sm:text-sm">
            <span className="text-purple-200 font-medium">Brand Strategy & Systems Design</span>
            <span className="font-bold text-white">
              {selectedCurrency === 'NGN' ? '₦4,960,000' : selectedCurrency === 'USD' ? '$3,200.00' : selectedCurrency === 'EUR' ? '€2,944.00' : '£2,496.00'}
            </span>
          </div>
          <div className="flex items-center justify-between p-3 rounded-xl bg-purple-900/40 text-xs sm:text-sm">
            <span className="text-purple-200 font-medium">UI/UX Prototype & Development</span>
            <span className="font-bold text-white">
              {selectedCurrency === 'NGN' ? '₦2,480,000' : selectedCurrency === 'USD' ? '$1,600.00' : selectedCurrency === 'EUR' ? '€1,472.00' : '£1,248.00'}
            </span>
          </div>
        </div>

        {/* Currency Summary & Paystack Badge */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pt-2 text-xs text-purple-300/80 border-t border-purple-500/20">
          <span className="flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-emerald-400" /> Auto FX conversion at official exchange rates
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-semibold">
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
      color: 'border-amber-500/40 text-amber-300',
      count: 2,
      cards: [
        { title: 'Halcyon Media Rebrand', value: '₦6,500,000', client: 'Halcyon UK', tag: 'Lead' },
        { title: 'Peak Fitness Portal', value: '₦1,800,000', client: 'Peak Fit', tag: 'Lead' },
      ],
    },
    {
      title: 'Proposal Sent',
      color: 'border-violet-500/40 text-violet-300',
      count: 1,
      cards: [
        { title: 'Nexus Mobile App Phase 1', value: '₦9,200,000', client: 'Nexus Tech', tag: 'Pending' },
      ],
    },
    {
      title: 'In Progress',
      color: 'border-purple-500/40 text-purple-300',
      count: 2,
      cards: [
        { title: 'Acme Studio Web System', value: '₦18,400,000', client: 'Acme Studio', tag: 'Active', progress: 75 },
        { title: 'Vortex Annual Retainer', value: '₦14.5M', client: 'Vortex', tag: 'Active', progress: 40 },
      ],
    },
    {
      title: 'Paid & Closed',
      color: 'border-emerald-500/40 text-emerald-300',
      count: 1,
      cards: [
        { title: 'Blue Harbor Analytics', value: '₦15,000,000', client: 'Blue Harbor', tag: 'Paid', progress: 100 },
      ],
    },
  ];

  return (
    <div className="space-y-4 text-slate-100 text-xs sm:text-sm font-sans">
      <div className="flex gap-3 overflow-x-auto pb-2 sm:grid sm:grid-cols-4 scrollbar-thin scrollbar-thumb-purple-800">
        {columns.map((col) => (
          <div key={col.title} className="p-3 rounded-2xl bg-purple-950/50 border border-purple-500/25 flex flex-col min-h-[200px] min-w-[160px] sm:min-w-0 shrink-0 sm:shrink">
            <div className={`flex items-center justify-between pb-2.5 border-b border-purple-500/20 px-1 ${col.color}`}>
              <span className="font-extrabold text-xs uppercase tracking-wider truncate">{col.title}</span>
              <span className="w-5 h-5 rounded-full bg-purple-900/80 text-xs font-bold text-center flex items-center justify-center shrink-0">
                {col.count}
              </span>
            </div>

            <div className="space-y-2.5 mt-2.5 flex-1">
              {col.cards.map((card) => (
                <div
                  key={card.title}
                  className="p-3 rounded-xl bg-purple-900/40 border border-purple-500/30 hover:border-violet-400 transition-all shadow-sm space-y-2"
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-bold text-purple-300/80 truncate max-w-[90px]">{card.client}</span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-extrabold shrink-0 ${
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
                  <p className="font-bold text-white text-xs sm:text-sm leading-tight truncate">{card.title}</p>
                  <div className="flex items-center justify-between gap-1 pt-1.5 border-t border-purple-500/20">
                    <span className="font-extrabold text-amber-300 text-xs sm:text-sm truncate">{card.value}</span>
                    {card.progress !== undefined && (
                      <div className="w-12 bg-purple-950 rounded-full h-2 overflow-hidden shrink-0">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${card.progress}%` }}
                          transition={{ duration: 0.8, ease: 'easeOut' }}
                          className="bg-gradient-to-r from-violet-500 to-emerald-400 h-2 rounded-full"
                        />
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
    <div className="space-y-4 text-slate-100 text-xs sm:text-sm font-sans">
      {/* Channel Switcher */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 p-2.5 rounded-2xl bg-purple-950/50 border border-purple-500/25">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-semibold text-purple-200">Outreach Mode:</span>
        </div>
        <div className="flex items-center gap-1.5 bg-purple-900/60 p-1 rounded-xl border border-purple-500/30">
          <button
            type="button"
            onClick={() => setChannel('whatsapp')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 flex-1 sm:flex-initial justify-center ${
              channel === 'whatsapp' ? 'bg-emerald-600 text-white shadow-md' : 'text-purple-300/70 hover:text-white'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-300" /> WhatsApp Direct
          </button>
          <button
            type="button"
            onClick={() => setChannel('email')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 flex-1 sm:flex-initial justify-center ${
              channel === 'email' ? 'bg-violet-600 text-white shadow-md' : 'text-purple-300/70 hover:text-white'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-violet-300" /> Email Templates
          </button>
        </div>
      </div>

      {/* Interactive Preview Pane */}
      {channel === 'whatsapp' ? (
        <div className="p-4 sm:p-5 rounded-2xl bg-[#0B141A] border border-emerald-500/40 space-y-4 shadow-xl">
          <div className="flex items-center justify-between pb-2.5 border-b border-emerald-900/50">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center">
                AS
              </div>
              <div>
                <p className="font-bold text-emerald-400 text-xs sm:text-sm">Acme Studio (+234 803 123 4567)</p>
                <p className="text-[10px] text-emerald-600">Online · Template Auto-Filled</p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
              One-Click Send Ready
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-[#111B21] border border-emerald-900/60 text-emerald-100 text-xs sm:text-sm space-y-2.5 max-w-[95%] sm:max-w-[90%] font-mono leading-relaxed">
            <p>Hi Alex,</p>
            <p>
              Just a friendly note that your account currently shows an outstanding balance of <strong className="text-amber-300">₦4,800,000.00</strong> for Invoice #INV-1042.
            </p>
            <div className="p-2.5 rounded-lg bg-[#202C33] border border-emerald-500/35 text-xs space-y-1 font-sans">
              <p className="font-bold text-white flex items-center gap-1.5">
                💳 Pay Online Securely via Paystack:
              </p>
              <p className="text-emerald-400 underline break-all text-xs">
                https://app.ledgerly.io/portal/invoice/inv-1042
              </p>
            </div>
            <p className="text-[10px] text-emerald-500 text-right pt-1">10:42 AM ✓✓</p>
          </div>
        </div>
      ) : (
        <div className="p-4 sm:p-5 rounded-2xl bg-purple-950/70 border border-purple-500/30 space-y-4 shadow-xl">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1 pb-2.5 border-b border-purple-500/25 text-xs sm:text-sm">
            <span className="text-purple-200 font-semibold truncate">Subject: Payment Reminder for Invoice #INV-1042</span>
            <span className="px-2.5 py-1 rounded bg-violet-600/30 text-violet-300 font-bold text-[10px] shrink-0">PDF Attached</span>
          </div>
          <div className="p-3.5 rounded-xl bg-purple-900/40 border border-purple-500/25 text-xs sm:text-sm text-purple-200 space-y-2.5 leading-relaxed">
            <p>Dear Acme Studio,</p>
            <p>Please find attached your invoice PDF (#INV-1042) for ₦4,800,000. You can review or settle payment directly using the link below.</p>
            <div className="p-2.5 rounded-lg bg-purple-950/80 border border-purple-500/40 text-xs text-emerald-300 flex items-center justify-between">
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
      {/* Undulating Gradient Scroll Flow Line */}
      <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-purple-200 via-violet-500 to-indigo-400 opacity-60 dark:opacity-40">
        <div
          className="w-full bg-gradient-to-b from-violet-600 via-purple-500 to-indigo-500 shadow-[0_0_12px_rgba(109,95,250,0.8)] transition-all duration-150"
          style={{ height: `${scrollPercentage}%` }}
        />
      </div>

      {/* Section Background Soft Ambient Glow Orbs */}
      <div className="pointer-events-none absolute -left-20 top-1/4 w-96 h-96 rounded-full bg-violet-400/15 dark:bg-violet-600/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 bottom-1/4 w-96 h-96 rounded-full bg-indigo-400/15 dark:bg-purple-600/15 blur-3xl" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header with Reframed Outcome Title */}
        <div className="mx-auto max-w-3xl text-center mb-12 md:mb-16">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-violet-500/15 via-purple-500/20 to-indigo-500/15 border border-purple-300/60 dark:border-purple-600/50 text-purple-900 dark:text-purple-200 text-xs font-bold shadow-sm backdrop-blur-md mb-3"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-pulse" /> Interactive Workspace Flow
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white font-['Plus_Jakarta_Sans',sans-serif]"
          >
            Never lose track of a <span className="text-violet-600 dark:text-violet-400">client or payment</span> again
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mt-3.5 text-base sm:text-lg text-slate-600 dark:text-purple-200/80 leading-relaxed"
          >
            Experience how Ledgerly unifies client management, multi-currency invoicing, project tracking, and direct outreach in one automated workspace.
          </motion.p>
        </div>

        {/* 2-Column Main Showcase Grid - Expanded UI Stage Column */}
        <div
          className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-stretch"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          {/* LEFT COLUMN: Vertical Interactive Tabs Stack (4 cols on lg) */}
          <div className="lg:col-span-4 flex flex-col justify-center space-y-3.5 p-2 -m-2 overflow-visible">
            {FEATURE_TABS.map((tab) => {
              const isActive = tab.id === activeTabId;
              const TabIcon = tab.icon;

              return (
                <div
                  key={tab.id}
                  onClick={() => handleTabClick(tab.id)}
                  className="relative cursor-pointer rounded-2xl p-4 sm:p-5 transition-all duration-300 border border-purple-100/90 dark:border-purple-900/40 bg-white/70 dark:bg-[#140D2B]/60 backdrop-blur-md hover:bg-white dark:hover:bg-[#180F33] hover:border-purple-300/80 dark:hover:border-purple-700 shadow-sm hover:shadow-md [will-change:transform,opacity] [transform:translateZ(0)] select-none"
                >
                  {/* Animated Active State Card Overlay */}
                  {isActive && (
                    <motion.div
                      layoutId="activeTabHighlight"
                      transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                      className="absolute inset-0 rounded-2xl bg-white dark:bg-[#1C1236] border-2 border-purple-400 dark:border-purple-500/90 shadow-xl shadow-purple-500/15 pointer-events-none z-0"
                    >
                      {/* Left Accent Stripe inside active card */}
                      <div className="absolute left-0 top-0 bottom-0 w-1.5 rounded-l-2xl bg-gradient-to-b from-violet-600 via-purple-600 to-amber-400 shadow-[0_0_10px_rgba(147,51,234,0.5)]" />

                      {/* Bottom Progress Bar inside active card */}
                      <div className="absolute bottom-0 left-0 right-0 h-1 rounded-b-2xl bg-purple-200/50 dark:bg-purple-900/50 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-violet-600 via-purple-500 to-amber-400 transition-all duration-75 ease-linear"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </motion.div>
                  )}

                  <div className="relative z-10 flex items-start gap-3.5">
                    {/* Icon container */}
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
                        <h3 className="font-bold text-[#2B1B4D] dark:text-white text-sm sm:text-base leading-snug truncate">
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
                      <p className="text-xs text-slate-600 dark:text-purple-200/70 mt-1 leading-relaxed">
                        {tab.subtitle}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* RIGHT COLUMN: Stylized Wide Dark-Violet Browser Stage Box (8 cols on lg) */}
          <div className="lg:col-span-8 flex flex-col justify-center">
            <div className="rounded-2xl border border-purple-900/40 bg-[#160D2E] shadow-2xl overflow-hidden text-slate-100 flex flex-col min-h-[440px] sm:min-h-[480px]">
              {/* Browser Window Header & Address Bar */}
              <div className="flex items-center justify-between px-4 py-3 bg-[#0F0821] border-b border-purple-900/50 text-xs">
                {/* Mac Dots */}
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-red-500/80" />
                  <span className="w-3 h-3 rounded-full bg-yellow-500/80" />
                  <span className="w-3 h-3 rounded-full bg-green-500/80" />
                </div>

                {/* Simulated URL Bar */}
                <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-purple-950/80 border border-purple-500/30 text-xs text-purple-200/90 max-w-md w-full mx-2 justify-center font-mono truncate shadow-xs">
                  <Lock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span className="truncate">https://app.ledgerly.io/workspace/{activeTabId}</span>
                </div>

                {/* Status Indicator */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[10px] text-emerald-400 font-semibold hidden sm:inline">Live Sync</span>
                </div>
              </div>

              {/* Browser Stage Content Body */}
              <div className="p-5 sm:p-7 bg-gradient-to-b from-[#180E33] to-[#120A27] flex-1 flex flex-col justify-between">
                {/* Stage Title Header */}
                <div className="flex items-center justify-between pb-3.5 border-b border-purple-500/20 mb-4">
                  <div className="flex items-center gap-2.5">
                    <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-violet-500/20 text-violet-300 border border-violet-500/30 uppercase tracking-wide">
                      {activeTab.badge}
                    </span>
                    <h4 className="font-bold text-white text-sm sm:text-base md:text-lg">{activeTab.title}</h4>
                  </div>
                  <span className="text-xs text-purple-300/70 hidden sm:inline font-mono">Ledgerly Engine v2.4</span>
                </div>

                {/* Animated Mock Content with Smooth Spring Transition */}
                <div className="flex-1 flex flex-col justify-center my-2">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={activeTabId}
                      initial={{ opacity: 0, y: 16, scale: 0.99 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -16, scale: 0.99 }}
                      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                    >
                      {activeTabId === 'crm' && <CrmMockup />}
                      {activeTabId === 'invoicing' && <InvoicingMockup />}
                      {activeTabId === 'kanban' && <KanbanMockup />}
                      {activeTabId === 'outreach' && <OutreachMockup />}
                    </motion.div>
                  </AnimatePresence>
                </div>

                {/* Browser Stage Footer Bar */}
                <div className="pt-3.5 border-t border-purple-500/20 mt-4 flex items-center justify-between text-xs text-purple-300/80">
                  <span>💡 Tip: Click tabs on the left to inspect live workspace views</span>
                  <a
                    href="/auth"
                    className="font-bold text-violet-300 hover:text-white flex items-center gap-1.5 transition-colors"
                  >
                    Open Live Demo <ArrowRight className="w-3.5 h-3.5" />
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

