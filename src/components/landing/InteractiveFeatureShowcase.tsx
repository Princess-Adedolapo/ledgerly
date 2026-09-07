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
}

const FEATURE_TABS: FeatureTab[] = [
  {
    id: 'crm',
    icon: Users,
    title: 'Client CRM & Contacts',
    subtitle: 'Unified client profiles, complete transaction history, and engagement tracking',
    badge: 'Client CRM',
  },
  {
    id: 'invoicing',
    icon: CreditCard,
    title: 'Multi-Currency Invoicing',
    subtitle: 'Instant global invoices in NGN, USD, EUR, GBP with auto FX conversion',
    badge: 'Smart Invoicing',
  },
  {
    id: 'kanban',
    icon: KanbanSquare,
    title: 'Visual Workflow',
    subtitle: 'Track deals and deliverables effortlessly from lead inflow to final payout',
    badge: 'Visual Pipeline',
  },
  {
    id: 'outreach',
    icon: Send,
    title: 'Deals Outreach',
    subtitle: 'Send instant payment links and invoice reminders via WhatsApp & Email',
    badge: 'Direct Outreach',
  },
];

/* ------------------------------------------------------------------ */
/* Sparkline SVG Helper                                                */
/* ------------------------------------------------------------------ */
function Sparkline({ data, color = '#2ECC71' }: { data: number[]; color?: string }) {
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
      statusColor: 'bg-teal-500/10 text-teal-400 border-teal-500/30',
      statusDot: 'bg-teal-400',
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
      statusColor: 'border-[#2A2A36] text-[#9CA3AF]',
      statusDot: 'bg-amber-400',
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
      statusColor: 'bg-teal-500/10 text-teal-400 border-teal-500/30',
      statusDot: 'bg-teal-400',
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
      statusColor: 'border-[#2A2A36] text-[#9CA3AF]',
      statusDot: 'bg-amber-400',
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
        <div className="p-3.5 rounded-2xl bg-[#18181F] border border-[#2A2A36] shadow-sm">
          <span className="text-xs text-[#9CA3AF] font-medium block">Total Managed Clients</span>
          <span className="text-base sm:text-lg font-extrabold text-white flex items-center gap-1.5 mt-0.5">
            142 <span className="text-xs text-teal-400 font-semibold">+12% mo</span>
          </span>
        </div>
        <div className="p-3.5 rounded-2xl bg-[#18181F] border border-[#2A2A36] shadow-sm">
          <span className="text-xs text-[#9CA3AF] font-medium block">Active Pipeline</span>
          <span className="text-base sm:text-lg font-extrabold text-amber-300 mt-0.5 block">₦48,600,000</span>
        </div>
        <div className="p-3.5 rounded-2xl bg-[#18181F] border border-[#2A2A36] shadow-sm">
          <span className="text-xs text-[#9CA3AF] font-medium block">Engagement Rate</span>
          <span className="text-base sm:text-lg font-extrabold text-teal-400 flex items-center gap-1.5 mt-0.5">
            98.4% <ShieldCheck className="w-4 h-4 text-teal-400" />
          </span>
        </div>
      </div>

      {/* Control / Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 p-2.5 rounded-2xl bg-[#18181F] border border-[#2A2A36]">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#121217] text-slate-200 border border-[#2A2A36] flex-1">
          <Search className="w-4 h-4 text-[#9CA3AF] shrink-0" />
          <span className="text-xs text-[#9CA3AF] truncate">Search contacts, tags or history...</span>
        </div>
        <div className="flex items-center gap-2 justify-between sm:justify-end">
          <span className="px-2.5 py-1 rounded-lg border border-[#2A2A36] bg-transparent text-[#9CA3AF] text-xs font-semibold">
            Filter: All
          </span>
          <span className="px-3 py-1.5 rounded-lg bg-[#21212B] hover:bg-[#2A2A36] text-slate-200 border border-[#2A2A36] text-xs font-semibold flex items-center gap-1.5 shadow-sm">
            <Plus className="w-3.5 h-3.5" /> New Client
          </span>
        </div>
      </div>

      {/* Contacts List Table */}
      <div className="rounded-2xl border border-[#2A2A36] bg-[#18181F] overflow-hidden divide-y divide-[#2A2A36]">
        {contacts.map((c) => (
          <div
            key={c.name}
            onClick={() => setSelectedContact(c.name)}
            className={`p-3 sm:p-3.5 flex items-center justify-between gap-3 cursor-pointer transition-all ${
              selectedContact === c.name
                ? 'bg-[#222030] border-l-2 border-l-[#7C5CFC]'
                : 'hover:bg-[#1F1F28]'
            }`}
          >
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="w-9 h-9 rounded-xl bg-[#221F33] text-[#A29BFE] font-bold flex items-center justify-center text-xs shrink-0 shadow-sm border border-[#2A2A36]">
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
                <p className="text-xs text-[#9CA3AF] truncate mt-0.5">{c.activity}</p>
              </div>
            </div>

            <div className="flex items-center gap-4 shrink-0">
              <div className="text-right">
                <span className="font-extrabold text-white text-xs sm:text-sm block">{c.spend}</span>
                <span className="text-[10px] text-[#9CA3AF]">{c.currency} Volume</span>
              </div>
              <div className="hidden sm:block">
                <Sparkline data={c.trend} color={c.sparkColor} />
              </div>
              <ChevronRight className="w-4 h-4 text-[#9CA3AF]" />
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
    NGN: { symbol: '₦', rate: '1,550.00', color: 'text-teal-400', sample: '₦7,440,000.00' },
    USD: { symbol: '$', rate: '1.00', color: 'text-slate-100', sample: '$4,800.00' },
    EUR: { symbol: '€', rate: '0.92', color: 'text-slate-100', sample: '€4,416.00' },
    GBP: { symbol: '£', rate: '0.78', color: 'text-slate-100', sample: '£3,744.00' },
  };

  return (
    <div className="space-y-4 text-slate-100 text-xs sm:text-sm font-sans">
      {/* Currency Selector Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 p-3 rounded-2xl bg-[#18181F] border border-[#2A2A36]">
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-[#9CA3AF]" />
          <span className="text-xs font-semibold text-slate-300">Select Billing Currency:</span>
        </div>
        <div className="flex items-center gap-1.5 bg-[#121217] p-1.5 rounded-xl border border-[#2A2A36] overflow-x-auto">
          {(['NGN', 'USD', 'EUR', 'GBP'] as const).map((curr) => (
            <button
              key={curr}
              type="button"
              onClick={() => setSelectedCurrency(curr)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
                selectedCurrency === curr
                  ? 'bg-[#7C5CFC] text-white shadow-sm'
                  : 'text-[#9CA3AF] hover:text-white'
              }`}
            >
              {curr} ({currencyConfig[curr].symbol})
            </button>
          ))}
        </div>
      </div>

      {/* Invoice Card Container */}
      <div className="p-4 sm:p-5 rounded-2xl bg-[#18181F] border border-[#2A2A36] space-y-4 shadow-lg">
        {/* Invoice Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-[#2A2A36] pb-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-extrabold text-white text-base">Invoice #INV-2026-08</span>
              <span className="px-2.5 py-0.5 rounded-md text-xs font-bold bg-teal-500/10 text-teal-400 border border-teal-500/30">
                PAID IN FULL
              </span>
            </div>
            <p className="text-xs text-[#9CA3AF] mt-1">Customer: Acme Studio Inc. · Issued: Jul 29, 2026</p>
          </div>
          <div className="text-left sm:text-right">
            <span className="text-xs text-[#9CA3AF] block">Total Amount</span>
            <span className={`text-lg sm:text-xl font-extrabold ${currencyConfig[selectedCurrency].color}`}>
              {currencyConfig[selectedCurrency].sample}
            </span>
          </div>
        </div>

        {/* Invoice Line Items */}
        <div className="space-y-2">
          <div className="flex items-center justify-between p-3 rounded-xl bg-[#121217] border border-[#2A2A36]/60 text-xs sm:text-sm">
            <span className="text-slate-300 font-medium">Brand Strategy & Systems Design</span>
            <span className="font-bold text-white">
              {selectedCurrency === 'NGN' ? '₦4,960,000' : selectedCurrency === 'USD' ? '$3,200.00' : selectedCurrency === 'EUR' ? '€2,944.00' : '£2,496.00'}
            </span>
          </div>
          <div className="flex items-center justify-between p-3 rounded-xl bg-[#121217] border border-[#2A2A36]/60 text-xs sm:text-sm">
            <span className="text-slate-300 font-medium">UI/UX Prototype & Development</span>
            <span className="font-bold text-white">
              {selectedCurrency === 'NGN' ? '₦2,480,000' : selectedCurrency === 'USD' ? '$1,600.00' : selectedCurrency === 'EUR' ? '€1,472.00' : '£1,248.00'}
            </span>
          </div>
        </div>

        {/* Currency Summary & Paystack Badge */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pt-2 text-xs text-[#9CA3AF] border-t border-[#2A2A36]">
          <span className="flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-teal-400" /> Auto FX conversion at official exchange rates
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-teal-500/10 text-teal-300 border border-teal-500/30 font-semibold">
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
      color: 'border-b border-[#2A2A36] text-amber-300',
      count: 2,
      cards: [
        { title: 'Halcyon Media Rebrand', value: '₦6,500,000', client: 'Halcyon UK', tag: 'Lead' },
        { title: 'Peak Fitness Portal', value: '₦1,800,000', client: 'Peak Fit', tag: 'Lead' },
      ],
    },
    {
      title: 'Proposal Sent',
      color: 'border-b border-[#2A2A36] text-slate-300',
      count: 1,
      cards: [
        { title: 'Nexus Mobile App Phase 1', value: '₦9,200,000', client: 'Nexus Tech', tag: 'Pending' },
      ],
    },
    {
      title: 'In Progress',
      color: 'border-b border-[#2A2A36] text-slate-300',
      count: 2,
      cards: [
        { title: 'Acme Studio Web System', value: '₦18,400,000', client: 'Acme Studio', tag: 'Active', progress: 75 },
        { title: 'Vortex Annual Retainer', value: '₦14.5M', client: 'Vortex', tag: 'Active', progress: 40 },
      ],
    },
    {
      title: 'Paid & Closed',
      color: 'border-b border-[#2A2A36] text-teal-400',
      count: 1,
      cards: [
        { title: 'Blue Harbor Analytics', value: '₦15,000,000', client: 'Blue Harbor', tag: 'Paid', progress: 100 },
      ],
    },
  ];

  return (
    <div className="space-y-4 text-slate-100 text-xs sm:text-sm font-sans">
      <div className="flex gap-3 overflow-x-auto pb-2 sm:grid sm:grid-cols-4">
        {columns.map((col) => (
          <div key={col.title} className="p-3 rounded-2xl bg-[#18181F] border border-[#2A2A36] flex flex-col min-h-[200px] min-w-[160px] sm:min-w-0 shrink-0 sm:shrink">
            <div className={`flex items-center justify-between pb-2.5 px-1 ${col.color}`}>
              <span className="font-extrabold text-xs uppercase tracking-wider truncate">{col.title}</span>
              <span className="w-5 h-5 rounded-full bg-[#121217] text-xs font-bold text-center flex items-center justify-center shrink-0 text-[#9CA3AF]">
                {col.count}
              </span>
            </div>

            <div className="space-y-2.5 mt-2.5 flex-1">
              {col.cards.map((card) => (
                <div
                  key={card.title}
                  className="p-3 rounded-xl bg-[#121217] border border-[#2A2A36] hover:border-[#383846] transition-all shadow-sm space-y-2"
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-bold text-[#9CA3AF] truncate max-w-[90px]">{card.client}</span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-extrabold shrink-0 ${
                        card.tag === 'Paid'
                          ? 'bg-teal-500/10 text-teal-400 border border-teal-500/30'
                          : card.tag === 'Active'
                          ? 'bg-teal-500/10 text-teal-400 border border-teal-500/30'
                          : card.tag === 'Lead'
                          ? 'border border-amber-500/40 text-amber-300'
                          : 'border border-[#2A2A36] text-[#9CA3AF]'
                      }`}
                    >
                      {card.tag}
                    </span>
                  </div>
                  <p className="font-bold text-white text-xs sm:text-sm leading-tight truncate">{card.title}</p>
                  <div className="flex items-center justify-between gap-1 pt-1.5 border-t border-[#2A2A36]">
                    <span className={`text-xs sm:text-sm truncate font-extrabold ${card.tag === 'Paid' ? 'text-teal-400' : 'text-slate-200'}`}>{card.value}</span>
                    {card.progress !== undefined && (
                      <div className="w-12 bg-[#18181F] rounded-full h-2 overflow-hidden shrink-0">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${card.progress}%` }}
                          transition={{ duration: 0.8, ease: 'easeOut' }}
                          className="bg-teal-400 h-2 rounded-full"
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
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 p-2.5 rounded-2xl bg-[#18181F] border border-[#2A2A36]">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-teal-400" />
          <span className="text-xs font-semibold text-slate-300">Outreach Mode:</span>
        </div>
        <div className="flex items-center gap-1.5 bg-[#121217] p-1 rounded-xl border border-[#2A2A36]">
          <button
            type="button"
            onClick={() => setChannel('whatsapp')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 flex-1 sm:flex-initial justify-center ${
              channel === 'whatsapp' ? 'bg-teal-600 text-white shadow-sm' : 'text-[#9CA3AF] hover:text-white'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-teal-300" /> WhatsApp Direct
          </button>
          <button
            type="button"
            onClick={() => setChannel('email')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 flex-1 sm:flex-initial justify-center ${
              channel === 'email' ? 'bg-[#221F33] text-[#A29BFE] shadow-sm border border-[#2A2A36]' : 'text-[#9CA3AF] hover:text-white'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-[#A29BFE]" /> Email Templates
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
        <div className="p-4 sm:p-5 rounded-2xl bg-[#18181F] border border-[#2A2A36] space-y-4 shadow-xl">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1 pb-2.5 border-b border-[#2A2A36] text-xs sm:text-sm">
            <span className="text-slate-300 font-semibold truncate">Subject: Payment Reminder for Invoice #INV-1042</span>
            <span className="px-2.5 py-1 rounded border border-[#2A2A36] text-slate-300 font-bold text-[10px] shrink-0">PDF Attached</span>
          </div>
          <div className="p-3.5 rounded-xl bg-[#121217] border border-[#2A2A36] text-xs sm:text-sm text-slate-300 space-y-2.5 leading-relaxed">
            <p>Dear Acme Studio,</p>
            <p>Please find attached your invoice PDF (#INV-1042) for ₦4,800,000. You can review or settle payment directly using the link below.</p>
            <div className="p-2.5 rounded-lg bg-[#18181F] border border-[#2A2A36] text-xs text-slate-300 flex items-center justify-between">
              <span>📄 Invoice_INV-1042.pdf (142 KB)</span>
              <span className="font-bold text-[#7C5CFC] hover:text-[#9D8CFF] cursor-pointer">View PDF →</span>
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

  const activeTab = FEATURE_TABS.find((t) => t.id === activeTabId) || FEATURE_TABS[0];

  return (
    <section
      ref={sectionRef}
      className="relative w-full py-16 md:py-24 overflow-hidden bg-[#0F0F12] transition-colors duration-300"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header with Reframed Outcome Title */}
        <div className="mx-auto max-w-3xl text-center mb-12 md:mb-16">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#2A2A36] bg-transparent text-[#9CA3AF] text-xs font-semibold mb-3"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Interactive Workspace Flow
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white font-['Plus_Jakarta_Sans',sans-serif]"
          >
            Never lose track of a <span className="text-white">client or payment</span> again
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mt-3.5 text-base sm:text-lg text-[#9CA3AF] leading-relaxed"
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
                  className="relative cursor-pointer rounded-2xl p-4 sm:p-5 transition-all duration-300 border border-[#2A2A36] bg-[#18181F] hover:bg-[#202029] hover:border-[#383846] shadow-sm select-none"
                >
                  {/* Animated Active State Card Overlay */}
                  {isActive && (
                    <motion.div
                      layoutId="activeTabHighlight"
                      transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                      className="absolute inset-0 rounded-2xl bg-[#201E2E] border-2 border-[#7C5CFC] shadow-lg shadow-[#7C5CFC]/20 pointer-events-none z-0"
                    >
                      {/* Left Accent Stripe inside active card */}
                      <div className="absolute left-0 top-0 bottom-0 w-1.5 rounded-l-2xl bg-[#7C5CFC]" />

                      {/* Bottom Progress Bar inside active card */}
                      <div className="absolute bottom-0 left-0 right-0 h-1 rounded-b-2xl bg-[#2A2A36] overflow-hidden">
                        <div
                          className="h-full bg-[#7C5CFC] transition-all duration-75 ease-linear"
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
                          ? 'bg-[#7C5CFC] text-white shadow-md'
                          : 'bg-[#21212B] text-slate-300 border border-[#2A2A36]'
                      }`}
                    >
                      <TabIcon className="w-5.5 h-5.5" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-bold text-white text-sm sm:text-base leading-snug truncate">
                          {tab.title}
                        </h3>
                        {isActive ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-teal-500/10 text-teal-400 border border-teal-500/30 text-[10px] font-bold shrink-0">
                            <Check className="w-3 h-3 text-teal-400" /> Active
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold text-[#9CA3AF] border border-[#2A2A36] bg-transparent px-2 py-0.5 rounded-md shrink-0">
                            {tab.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#9CA3AF] mt-1 leading-relaxed">
                        {tab.subtitle}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* RIGHT COLUMN: Stylized Wide Dark Browser Stage Box (8 cols on lg) */}
          <div className="lg:col-span-8 flex flex-col justify-center">
            <div className="rounded-2xl border border-[#2A2A36] bg-[#18181F] shadow-2xl overflow-hidden text-slate-100 flex flex-col min-h-[440px] sm:min-h-[480px]">
              {/* Browser Window Header & Address Bar */}
              <div className="flex items-center justify-between px-4 py-3 bg-[#121217] border-b border-[#2A2A36] text-xs">
                {/* Mac Dots */}
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-red-500/80" />
                  <span className="w-3 h-3 rounded-full bg-yellow-500/80" />
                  <span className="w-3 h-3 rounded-full bg-green-500/80" />
                </div>

                {/* Simulated URL Bar */}
                <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-[#0F0F12] border border-[#2A2A36] text-xs text-[#9CA3AF] max-w-md w-full mx-2 justify-center font-mono truncate">
                  <Lock className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                  <span className="truncate">https://app.ledgerly.io/workspace/{activeTabId}</span>
                </div>

                {/* Status Indicator */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
                  <span className="text-[10px] text-teal-400 font-semibold hidden sm:inline">Live Sync</span>
                </div>
              </div>

              {/* Browser Stage Content Body */}
              <div className="p-5 sm:p-7 bg-[#18181F] flex-1 flex flex-col justify-between">
                {/* Stage Title Header */}
                <div className="flex items-center justify-between pb-3.5 border-b border-[#2A2A36] mb-4">
                  <div className="flex items-center gap-2.5">
                    <span className="px-3 py-1 rounded-full text-xs font-semibold border border-[#2A2A36] bg-transparent text-slate-300 uppercase tracking-wide">
                      {activeTab.badge}
                    </span>
                    <h4 className="font-bold text-white text-sm sm:text-base md:text-lg">{activeTab.title}</h4>
                  </div>
                  <span className="text-xs text-[#9CA3AF] hidden sm:inline font-mono">Ledgerly Engine v2.4</span>
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
                <div className="pt-3.5 border-t border-[#2A2A36] mt-4 flex items-center justify-between text-xs text-[#9CA3AF]">
                  <span>💡 Tip: Click tabs on the left to inspect live workspace views</span>
                  <a
                    href="/auth"
                    className="font-semibold text-[#7C5CFC] hover:text-[#9D8CFF] flex items-center gap-1.5 transition-colors"
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

