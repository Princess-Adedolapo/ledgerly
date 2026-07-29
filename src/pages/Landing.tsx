import { useState, useCallback, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Users,
  KanbanSquare,
  FileText,
  Mail,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  Check,
  CreditCard,
  Clock,
  Send,
  X,
  Tag,
  Building2,
  Phone,
  ShieldCheck,
  Activity,
  Plus,
} from 'lucide-react';
import { ThemeToggle } from '../components/ThemeToggle';

const features = [
  {
    icon: Users,
    title: 'Contacts that stay organized',
    desc: 'Every client, lead, and note in one searchable place — no more scattered spreadsheets.',
  },
  {
    icon: KanbanSquare,
    title: 'A workflow board you\'ll actually use',
    desc: 'Drag deals through stages with priorities, due dates, and status notes built in.',
  },
  {
    icon: FileText,
    title: 'Invoices in seconds',
    desc: 'Generate branded PDFs, share a permanent download link, and track paid vs overdue at a glance.',
  },
  {
    icon: Mail,
    title: 'Thoughtful email templates',
    desc: 'Welcome, reminders, thank-you notes — auto-fill customer + invoice details and send in one click.',
  },
];

const benefits = [
  'Auto-mark invoices as Paid when you send a thank-you',
  'Permanent PDF share links — no expiring URLs',
  'Multi-currency, dark mode, and per-user preferences',
  'Your data, protected with row-level security',
];

const heroPills = ['CRM & Invoicing', 'Customer 360 View', 'Automated Follow-ups', 'Instant Payment Links'];

// Subtle premium easings
const easeOut = [0.22, 1, 0.36, 1] as const;

/* ------------------------------------------------------------------ */
/* Status tag                                                          */
/* ------------------------------------------------------------------ */

type Tone = 'paid' | 'sent' | 'overdue' | 'scheduled' | 'auto';

function StatusTag({ label, tone }: { label: string; tone: Tone }) {
  const toneMap: Record<Tone, string> = {
    paid: 'bg-emerald-500/12 text-emerald-600 dark:text-emerald-400',
    sent: 'bg-accent-soft text-accent',
    overdue: 'bg-amber-500/14 text-amber-600 dark:text-amber-400',
    scheduled: 'bg-accent-soft text-accent',
    auto: 'bg-emerald-500/12 text-emerald-600 dark:text-emerald-400',
  };
  return (
    <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${toneMap[tone]}`}>
      {label}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Customer 360 Live Mockup & Modal                                   */
/* ------------------------------------------------------------------ */

function Customer360Mockup({ onOpenDemo }: { onOpenDemo?: () => void }) {
  const [activeTab, setActiveTab] = useState<'timeline' | 'tags' | 'invoices'>('timeline');

  return (
    <div className="space-y-3.5">
      {/* Header Profile Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl border border-hairline bg-canvas/60">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 font-bold text-white shadow-soft text-sm">
            AS
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold text-ink">Acme Studio</h4>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/12 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                Active Client
              </span>
            </div>
            <p className="text-[11px] text-muted">hello@acmestudio.com · Brand & Digital Agency</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden sm:inline-flex px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20">
            Stage: Retainer Signed
          </span>
          {onOpenDemo && (
            <button
              type="button"
              onClick={onOpenDemo}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-accent text-accent-fg shadow-soft hover:bg-accent-hover transition-all"
            >
              <Sparkles className="h-3.5 w-3.5" /> Demo 360
            </button>
          )}
        </div>
      </div>

      {/* Internal Tabs */}
      <div className="flex items-center gap-1 border-b border-hairline pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('timeline')}
          className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'timeline'
              ? 'bg-accent text-accent-fg shadow-soft'
              : 'text-muted hover:text-ink hover:bg-panel'
          }`}
        >
          Timeline & Logs (3)
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('tags')}
          className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'tags'
              ? 'bg-accent text-accent-fg shadow-soft'
              : 'text-muted hover:text-ink hover:bg-panel'
          }`}
        >
          Tags & Fields
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('invoices')}
          className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'invoices'
              ? 'bg-accent text-accent-fg shadow-soft'
              : 'text-muted hover:text-ink hover:bg-panel'
          }`}
        >
          Invoices & Deals
        </button>
      </div>

      {/* Tab Content */}
      <div className="min-h-[140px]">
        {activeTab === 'timeline' && (
          <div className="space-y-2">
            <div className="p-2.5 rounded-lg border border-hairline bg-panel flex items-start justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <div className="p-1 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <CreditCard className="h-3.5 w-3.5" />
                </div>
                <div>
                  <p className="font-semibold text-ink">Invoice #INV-1042 Sent ($4,800)</p>
                  <p className="text-[10px] text-muted">Sent via automated sequence · 2 hours ago</p>
                </div>
              </div>
              <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">Sent</span>
            </div>
            <div className="p-2.5 rounded-lg border border-hairline bg-panel flex items-start justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <div className="p-1 rounded-md bg-violet-500/10 text-violet-600 dark:text-violet-400">
                  <Clock className="h-3.5 w-3.5" />
                </div>
                <div>
                  <p className="font-semibold text-ink">Onboarding Call Completed</p>
                  <p className="text-[10px] text-muted">Key takeaway: Q3 brand refresh deliverable approved · Yesterday</p>
                </div>
              </div>
              <span className="text-[10px] text-muted">Logged</span>
            </div>
          </div>
        )}

        {activeTab === 'tags' && (
          <div className="space-y-2 text-xs">
            <div className="flex flex-wrap gap-1.5 p-2.5 rounded-lg border border-hairline bg-panel">
              <span className="px-2 py-0.5 rounded bg-violet-500/15 text-violet-600 dark:text-violet-400 font-bold text-[11px]">VIP Client</span>
              <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold text-[11px]">High Value</span>
              <span className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold text-[11px]">Q3 Campaign</span>
              <span className="px-2 py-0.5 rounded bg-sky-500/15 text-sky-600 dark:text-sky-400 font-bold text-[11px]">Annual Retainer</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="p-2 rounded-lg border border-hairline bg-canvas/40">
                <span className="text-muted block text-[10px]">Account Manager</span>
                <span className="font-semibold text-ink">Sarah Chen</span>
              </div>
              <div className="p-2 rounded-lg border border-hairline bg-canvas/40">
                <span className="text-muted block text-[10px]">Lifetime Value</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">$18,400</span>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'invoices' && (
          <div className="space-y-2 text-xs">
            <div className="p-2.5 rounded-lg border border-hairline bg-panel flex items-center justify-between">
              <div>
                <p className="font-semibold text-ink">Invoice #INV-1042</p>
                <p className="text-[10px] text-muted">Due in 14 days · Brand Strategy</p>
              </div>
              <span className="font-bold text-accent">$4,800</span>
            </div>
            <div className="p-2.5 rounded-lg border border-hairline bg-panel flex items-center justify-between">
              <div>
                <p className="font-semibold text-ink">Invoice #INV-1020</p>
                <p className="text-[10px] text-muted">Paid on Jul 10 · Design System</p>
              </div>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">$12,000 (Paid)</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Customer360Modal({
  open,
  onClose,
  onGoToAuth,
}: {
  open: boolean;
  onClose: () => void;
  onGoToAuth: (e: React.MouseEvent) => void;
}) {
  const [activeTab, setActiveTab] = useState<'timeline' | 'invoices' | 'deals' | 'notes'>('timeline');
  const [demoNote, setDemoNote] = useState('');
  const [notesList, setNotesList] = useState([
    { id: 1, text: 'Discussed Q4 brand refresh timeline with Alex Morgan. Approved budget of $18,400.', time: '2 hours ago' },
    { id: 2, text: 'Sent updated retainer proposal via email.', time: 'Yesterday' },
  ]);

  if (!open) return null;

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!demoNote.trim()) return;
    setNotesList([{ id: Date.now(), text: demoNote, time: 'Just now' }, ...notesList]);
    setDemoNote('');
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.25 }}
          className="relative w-full max-w-3xl max-h-[90vh] flex flex-col rounded-2xl border border-hairline bg-panel shadow-lift overflow-hidden text-ink"
        >
          {/* Modal Header */}
          <div className="flex items-center justify-between p-4 sm:p-5 border-b border-hairline bg-canvas/60">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white font-bold text-base shadow-soft">
                AS
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-ink">Acme Studio</h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    Active Retainer
                  </span>
                </div>
                <p className="text-xs text-muted flex items-center gap-2 mt-0.5">
                  <Building2 className="w-3.5 h-3.5 text-muted" /> hello@acmestudio.com · <Phone className="w-3.5 h-3.5 text-muted" /> +1 (555) 234-5678
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onGoToAuth}
                className="hidden sm:flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-accent text-accent-fg font-medium text-xs shadow-soft hover:bg-accent-hover transition-all"
              >
                Try In Workspace <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg text-muted hover:text-ink hover:bg-canvas transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 border-b border-hairline bg-canvas/30 text-xs">
            <div className="p-2.5 rounded-xl border border-hairline bg-panel">
              <span className="text-muted block text-[10px]">Total Revenue</span>
              <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">$18,400</span>
            </div>
            <div className="p-2.5 rounded-xl border border-hairline bg-panel">
              <span className="text-muted block text-[10px]">Pending Invoices</span>
              <span className="text-sm font-bold text-accent">$4,800 (#INV-1042)</span>
            </div>
            <div className="p-2.5 rounded-xl border border-hairline bg-panel">
              <span className="text-muted block text-[10px]">Active Pipeline</span>
              <span className="text-sm font-bold text-ink">Contract Signed ($12k)</span>
            </div>
            <div className="p-2.5 rounded-xl border border-hairline bg-panel">
              <span className="text-muted block text-[10px]">Account Health</span>
              <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> 98% (Excellent)
              </span>
            </div>
          </div>

          {/* Modal Tabs Navigation */}
          <div className="flex items-center gap-2 px-5 pt-3 border-b border-hairline bg-panel">
            <button
              type="button"
              onClick={() => setActiveTab('timeline')}
              className={`pb-2.5 px-2 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
                activeTab === 'timeline'
                  ? 'border-accent text-accent'
                  : 'border-transparent text-muted hover:text-ink'
              }`}
            >
              <Activity className="w-3.5 h-3.5" /> Timeline & Activity Logs
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('invoices')}
              className={`pb-2.5 px-2 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
                activeTab === 'invoices'
                  ? 'border-accent text-accent'
                  : 'border-transparent text-muted hover:text-ink'
              }`}
            >
              <CreditCard className="w-3.5 h-3.5" /> Invoices & Billing
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('deals')}
              className={`pb-2.5 px-2 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
                activeTab === 'deals'
                  ? 'border-accent text-accent'
                  : 'border-transparent text-muted hover:text-ink'
              }`}
            >
              <KanbanSquare className="w-3.5 h-3.5" /> Pipeline Deals
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('notes')}
              className={`pb-2.5 px-2 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
                activeTab === 'notes'
                  ? 'border-accent text-accent'
                  : 'border-transparent text-muted hover:text-ink'
              }`}
            >
              <Tag className="w-3.5 h-3.5" /> Tags & Notes
            </button>
          </div>

          {/* Modal Body */}
          <div className="p-5 overflow-y-auto flex-1 min-h-[260px] space-y-4">
            {activeTab === 'timeline' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-muted uppercase tracking-wider">Customer Activity Feed</h4>
                  <span className="text-[11px] text-muted">Real-time synchronized across all modules</span>
                </div>
                <div className="space-y-2.5">
                  <div className="p-3 rounded-xl border border-hairline bg-canvas/40 flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
                      <CreditCard className="w-4 h-4" />
                    </div>
                    <div className="flex-1 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-ink">Invoice #INV-1042 Issued</span>
                        <span className="text-[10px] text-muted">2 hours ago</span>
                      </div>
                      <p className="text-muted mt-0.5">$4,800 for Q3 Brand Refresh deliverables</p>
                    </div>
                  </div>
                  <div className="p-3 rounded-xl border border-hairline bg-canvas/40 flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400 shrink-0">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div className="flex-1 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-ink">Onboarding Strategy Session Logged</span>
                        <span className="text-[10px] text-muted">Yesterday</span>
                      </div>
                      <p className="text-muted mt-0.5">Alex Morgan confirmed scope boundaries and design guidelines</p>
                    </div>
                  </div>
                  <div className="p-3 rounded-xl border border-hairline bg-canvas/40 flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0">
                      <KanbanSquare className="w-4 h-4" />
                    </div>
                    <div className="flex-1 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-ink">Pipeline Stage Updated</span>
                        <span className="text-[10px] text-muted">3 days ago</span>
                      </div>
                      <p className="text-muted mt-0.5">Moved from "Proposal Sent" → "Contract Signed"</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'invoices' && (
              <div className="space-y-3 text-xs">
                <div className="p-3 rounded-xl border border-hairline bg-canvas/40 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-ink text-sm block">Invoice #INV-1042</span>
                    <span className="text-muted">Issued Jul 22, 2026 · Due in 14 days</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-accent text-sm block">$4,800</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-accent-soft text-accent">Sent</span>
                  </div>
                </div>
                <div className="p-3 rounded-xl border border-hairline bg-canvas/40 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-ink text-sm block">Invoice #INV-1020</span>
                    <span className="text-muted">Paid on Jul 10, 2026</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm block">$12,000</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">Paid</span>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'deals' && (
              <div className="space-y-3 text-xs">
                <div className="p-3.5 rounded-xl border border-hairline bg-canvas/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-ink text-sm">Q3 Brand Strategy Retainer</span>
                    <span className="font-bold text-accent">$12,000</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted">
                    <span className="px-2 py-0.5 rounded bg-violet-500/10 text-violet-600 dark:text-violet-400 text-[10px] font-semibold">
                      Stage: Contract Signed
                    </span>
                    <span>Priority: High</span>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'notes' && (
              <div className="space-y-3 text-xs">
                <form onSubmit={handleAddNote} className="flex gap-2">
                  <input
                    type="text"
                    value={demoNote}
                    onChange={(e) => setDemoNote(e.target.value)}
                    placeholder="Type a sample note for Acme Studio..."
                    className="flex-1 px-3 py-2 rounded-xl border border-hairline bg-canvas text-ink text-xs focus:outline-none focus:border-accent"
                  />
                  <button
                    type="submit"
                    className="px-3 py-2 rounded-xl bg-accent text-accent-fg font-semibold text-xs shadow-soft hover:bg-accent-hover flex items-center gap-1 shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Note
                  </button>
                </form>

                <div className="space-y-2 pt-2">
                  {notesList.map((n) => (
                    <div key={n.id} className="p-3 rounded-xl border border-hairline bg-canvas/40 flex items-start justify-between gap-2">
                      <p className="text-ink font-medium">{n.text}</p>
                      <span className="text-[10px] text-muted shrink-0">{n.time}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Modal Footer CTA */}
          <div className="p-4 border-t border-hairline bg-canvas/80 flex flex-wrap items-center justify-between gap-3 text-xs">
            <span className="text-muted">
              ✨ Customer 360 aggregates contacts, activity logs, workflow stages, and invoices into one screen.
            </span>
            <button
              type="button"
              onClick={onGoToAuth}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-accent text-accent-fg font-semibold text-xs shadow-soft hover:bg-accent-hover transition-all"
            >
              Start Free Workspace <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

/* ------------------------------------------------------------------ */
/* Carousel slides — high-fidelity product mockups                     */
/* ------------------------------------------------------------------ */

function InvoicingMockup() {
  const rows = [
    { name: 'Acme Studio', id: '#INV-1042', amount: '$4,800', tone: 'paid' as Tone, label: 'Paid' },
    { name: 'Rivera & Co', id: '#INV-1041', amount: '$2,150', tone: 'sent' as Tone, label: 'Sent' },
    { name: 'Northwind LLC', id: '#INV-1039', amount: '$960', tone: 'overdue' as Tone, label: 'Overdue' },
    { name: 'Blue Harbor', id: '#INV-1038', amount: '$3,400', tone: 'paid' as Tone, label: 'Paid' },
  ];
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold text-ink">
          <CreditCard className="h-4 w-4 text-accent" />
          Invoices
        </div>
        <span className="text-xs text-muted">4 this month · $11,310</span>
      </div>
      <div className="overflow-hidden rounded-xl border border-hairline">
        {rows.map((r, i) => (
          <div
            key={r.id}
            className={`flex items-center justify-between px-4 py-3 ${
              i !== rows.length - 1 ? 'border-b border-hairline' : ''
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-soft text-[11px] font-semibold text-accent">
                {r.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="leading-tight">
                <p className="text-sm font-medium text-ink">{r.name}</p>
                <p className="text-[11px] text-muted">{r.id}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-ink tabular-nums">{r.amount}</span>
              <StatusTag label={r.label} tone={r.tone} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PipelineMockup() {
  const columns = [
    {
      title: 'Lead',
      cards: [
        { name: 'Halcyon Media', tag: '$6,200' },
        { name: 'Peak Fitness', tag: '$1,800' },
      ],
    },
    {
      title: 'In progress',
      cards: [
        { name: 'Rivera & Co', tag: '$2,150' },
        { name: 'Orbit Labs', tag: '$4,000' },
      ],
    },
    {
      title: 'Won',
      cards: [{ name: 'Acme Studio', tag: '$4,800' }],
    },
  ];
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-semibold text-ink">
        <KanbanSquare className="h-4 w-4 text-accent" />
        Client pipeline
      </div>
      <div className="grid grid-cols-3 gap-2.5">
        {columns.map((col) => (
          <div key={col.title} className="rounded-xl border border-hairline bg-canvas/50 p-2.5">
            <div className="mb-2 flex items-center justify-between px-1">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                {col.title}
              </span>
              <span className="text-[10px] text-muted">{col.cards.length}</span>
            </div>
            <div className="space-y-2">
              {col.cards.map((c) => (
                <div
                  key={c.name}
                  className="rounded-lg border border-hairline bg-panel p-2.5 shadow-soft"
                >
                  <p className="text-[12px] font-medium leading-tight text-ink">{c.name}</p>
                  <p className="mt-1 text-[11px] font-semibold text-accent tabular-nums">{c.tag}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FollowUpMockup() {
  const steps = [
    { icon: Send, title: 'Welcome email', when: 'Day 0', tone: 'auto' as Tone, label: 'Sent' },
    { icon: Clock, title: 'Invoice reminder', when: 'Day 3', tone: 'scheduled' as Tone, label: 'Scheduled' },
    { icon: Mail, title: 'Thank-you note', when: 'Day 7', tone: 'auto' as Tone, label: 'Auto' },
  ];
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-semibold text-ink">
        <Mail className="h-4 w-4 text-accent" />
        Follow-up sequence · Rivera &amp; Co
      </div>
      <div className="space-y-2.5">
        {steps.map((s, i) => (
          <div
            key={s.title}
            className="flex items-center gap-3 rounded-xl border border-hairline bg-canvas/40 px-4 py-3"
          >
            <div className="relative flex flex-col items-center">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent-soft text-accent">
                <s.icon className="h-4 w-4" />
              </div>
              {i !== steps.length - 1 && (
                <span className="absolute top-9 h-3 w-px bg-hairline-strong" />
              )}
            </div>
            <div className="flex-1 leading-tight">
              <p className="text-sm font-medium text-ink">{s.title}</p>
              <p className="text-[11px] text-muted">{s.when}</p>
            </div>
            <StatusTag label={s.label} tone={s.tone} />
          </div>
        ))}
      </div>
    </div>
  );
}

const slides = [
  {
    tab: 'CRM',
    badge: 'CRM',
    title: 'CRM & client pipelines',
    Mockup: PipelineMockup,
  },
  {
    tab: 'Invoicing',
    badge: 'Invoicing',
    title: 'Invoicing & payment tracking',
    Mockup: InvoicingMockup,
  },
  {
    tab: 'Customer 360',
    badge: '360 View',
    title: 'Customer 360: All client history in 1 view',
    Mockup: Customer360Mockup,
  },
  {
    tab: 'Follow-ups',
    badge: 'Automation',
    title: 'Automated email follow-ups',
    Mockup: FollowUpMockup,
  },
];

function FeatureCarousel({ onOpen360Demo }: { onOpen360Demo: () => void }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const timer = window.setInterval(() => {
      setIndex((i) => (i + 1) % slides.length);
    }, 4200);
    return () => window.clearInterval(timer);
  }, [paused]);

  const active = slides[index];
  const ActiveMockup = active.Mockup;

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.7, ease: easeOut }}
      className="relative mx-auto mt-16 max-w-3xl md:mt-20"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* dotted grid backdrop + soft glow */}
      <div className="grid-guides pointer-events-none absolute inset-x-0 -top-10 bottom-0 -z-10 rounded-3xl opacity-70" />
      <div className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/10 blur-3xl" />

      {/* Tabs */}
      <div className="mb-5 flex flex-wrap items-center justify-center gap-2">
        {slides.map((s, i) => (
          <button
            key={s.badge}
            type="button"
            onClick={() => setIndex(i)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-all duration-300 ${
              i === index
                ? 'bg-accent text-accent-fg shadow-soft'
                : 'border border-hairline bg-panel text-muted hover:border-accent hover:text-ink'
            }`}
          >
            {s.tab}
          </button>
        ))}
      </div>

      {/* Stage */}
      <div className="relative overflow-hidden rounded-2xl border border-hairline bg-panel p-6 shadow-lift md:p-8">
        <div className="mb-5 flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-accent">
            <Sparkles className="h-3 w-3" />
            {active.badge}
          </span>
          <span className="text-sm font-medium text-muted">{active.title}</span>
        </div>

        <div className="relative min-h-[248px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.45, ease: easeOut }}
            >
              <ActiveMockup onOpenDemo={onOpen360Demo} />
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Progress dots */}
        <div className="mt-6 flex items-center justify-center gap-2">
          {slides.map((s, i) => (
            <button
              key={s.badge}
              type="button"
              aria-label={`Show ${s.title}`}
              onClick={() => setIndex(i)}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === index ? 'w-6 bg-accent' : 'w-1.5 bg-hairline-strong hover:bg-accent/50'
              }`}
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
}

export default function Landing() {
  const navigate = useNavigate();
  const [navigating, setNavigating] = useState(false);
  const [modal360Open, setModal360Open] = useState(false);

  const goToAuth = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      if (navigating) return;
      setNavigating(true);
      // Let the fade play, then route
      window.setTimeout(() => navigate('/auth'), 320);
    },
    [navigate, navigating],
  );

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: navigating ? 0 : 1 }}
        transition={{ duration: 0.35, ease: easeOut }}
        className="min-h-screen bg-canvas text-ink"
      >
        {/* Nav */}
        <header className="sticky top-0 z-40 border-b border-hairline bg-canvas/80 backdrop-blur-xl">
          <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent shadow-soft">
                <LayoutDashboard className="h-5 w-5 text-accent-fg" />
              </div>
              <span className="text-lg font-semibold tracking-tight">Ledgerly</span>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <a
                href="#features"
                className="hidden text-sm font-medium text-muted transition-colors duration-300 hover:text-ink sm:block"
              >
                Features
              </a>
              <ThemeToggle />
              <a
                href="/auth"
                onClick={goToAuth}
                className="text-sm font-medium text-muted transition-colors duration-300 hover:text-ink"
              >
                Sign in
              </a>
              <a
                href="/auth"
                onClick={goToAuth}
                className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-fg shadow-soft transition-all duration-300 hover:bg-accent-hover hover:shadow-lift"
              >
                Get started
              </a>
            </div>
          </div>
        </header>

        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="mx-auto max-w-6xl px-6 pb-16 pt-20 text-center md:pt-28">
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: easeOut }}
              className="mb-7 inline-flex items-center gap-2 rounded-full border border-hairline bg-panel px-3.5 py-1.5 text-xs font-medium text-muted shadow-soft"
            >
              <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Used by 1,000+ small businesses
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: easeOut, delay: 0.05 }}
              className="mx-auto max-w-4xl text-balance text-4xl font-bold leading-[1.1] tracking-tight text-ink sm:text-5xl md:text-6xl"
            >
              Run your client work like a{' '}
              <span className="text-accent">proper business</span>.
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: easeOut, delay: 0.15 }}
              className="mx-auto mt-6 max-w-2xl text-pretty text-lg leading-relaxed text-muted"
            >
              Contacts, deals, invoices, and follow-up emails — one focused workspace,
              zero spreadsheet chaos.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: easeOut, delay: 0.25 }}
              className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row"
            >
              <a
                href="/auth"
                onClick={goToAuth}
                className="group flex items-center gap-2 rounded-full bg-accent px-7 py-3.5 font-medium text-accent-fg shadow-soft transition-all duration-300 hover:bg-accent-hover hover:shadow-lift"
              >
                Start free
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
              </a>
              <a
                href="#features"
                className="rounded-full border border-hairline-strong bg-panel px-7 py-3.5 font-medium text-ink-soft shadow-soft transition-all duration-300 hover:border-accent hover:text-ink"
              >
                See what&apos;s inside
              </a>
            </motion.div>

            {/* Feature pills */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: easeOut, delay: 0.35 }}
              className="mt-7 flex flex-wrap items-center justify-center gap-2.5"
            >
              {heroPills.map((pill) => (
                <span
                  key={pill}
                  className="inline-flex items-center gap-1.5 rounded-full border border-hairline bg-panel/60 px-3.5 py-1.5 text-sm font-medium text-ink-soft"
                >
                  <Check className="h-3.5 w-3.5 text-accent" />
                  {pill}
                </span>
              ))}
            </motion.div>

            <FeatureCarousel onOpen360Demo={() => setModal360Open(true)} />
          </div>
        </section>

        {/* Features */}
        <section id="features" className="mx-auto max-w-6xl px-6 py-24">
          <div className="mx-auto mb-16 max-w-2xl text-center">
            <h2 className="text-balance text-3xl font-bold tracking-tight text-ink md:text-4xl">
              Everything a small operation needs.
            </h2>
            <p className="mt-5 text-pretty text-muted">
              No bloat. No 40-tab settings menu. Just the tools that move client work
              forward.
            </p>
          </div>

          {/* Spotlight Customer 360 Feature Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.6, ease: easeOut }}
            className="mb-12 rounded-3xl border border-violet-500/30 bg-gradient-to-br from-violet-500/5 via-panel to-panel p-6 sm:p-8 shadow-lift relative overflow-hidden"
          >
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-5 space-y-4">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-500/15 border border-violet-500/25 px-3 py-1 text-xs font-bold text-violet-600 dark:text-violet-400">
                  <Sparkles className="w-3.5 h-3.5" /> Spotlight Feature
                </span>
                <h3 className="text-2xl font-bold text-ink tracking-tight">
                  Customer 360 View: Your Client&apos;s Entire Story in One Place
                </h3>
                <p className="text-sm leading-relaxed text-muted">
                  Stop hunting through email threads or separate tabs. Instantly view total revenue, active deals, invoice statuses, custom tags, and complete activity history for clients like <strong className="text-ink font-semibold">Acme Studio</strong>.
                </p>
                <div className="pt-2 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setModal360Open(true)}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-accent text-accent-fg font-semibold text-xs shadow-soft hover:bg-accent-hover transition-all"
                  >
                    <Sparkles className="w-4 h-4" /> Try Customer 360 Demo
                  </button>
                  <button
                    type="button"
                    onClick={goToAuth}
                    className="flex items-center gap-1 text-xs font-semibold text-muted hover:text-ink transition-colors px-3 py-2"
                  >
                    Explore Workspace →
                  </button>
                </div>
              </div>

              <div className="lg:col-span-7">
                <Customer360Mockup onOpenDemo={() => setModal360Open(true)} />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.2 }}
            variants={{
              hidden: {},
              show: { transition: { staggerChildren: 0.09, delayChildren: 0.05 } },
            }}
            className="grid gap-5 md:grid-cols-2"
          >
            {features.map((f) => (
              <motion.div
                key={f.title}
                variants={{
                  hidden: { opacity: 0, y: 18 },
                  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: easeOut } },
                }}
                className="group rounded-2xl border border-hairline bg-panel p-7 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:border-accent hover:shadow-lift"
              >
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-accent-soft text-accent transition-transform duration-300 group-hover:scale-110">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-semibold">{f.title}</h3>
                <p className="mt-2.5 text-sm leading-relaxed text-muted">{f.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </section>

        {/* Benefits strip */}
        <section className="mx-auto max-w-6xl px-6 py-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.7, ease: easeOut }}
            className="grid-guides overflow-hidden rounded-3xl border border-hairline bg-panel p-10 shadow-soft md:p-14"
          >
            <div className="grid items-center gap-10 md:grid-cols-2">
              <div>
                <h2 className="text-balance text-3xl font-bold tracking-tight text-ink md:text-4xl">
                  The little details other tools skip.
                </h2>
                <p className="mt-5 leading-relaxed text-muted">
                  We obsess over the workflow so you don&apos;t have to.
                </p>
              </div>
              <motion.ul
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, amount: 0.3 }}
                variants={{
                  hidden: {},
                  show: { transition: { staggerChildren: 0.08, delayChildren: 0.15 } },
                }}
                className="space-y-3"
              >
                {benefits.map((b) => (
                  <motion.li
                    key={b}
                    variants={{
                      hidden: { opacity: 0, x: 12 },
                      show: { opacity: 1, x: 0, transition: { duration: 0.5, ease: easeOut } },
                    }}
                    className="flex items-start gap-3 rounded-xl border border-transparent bg-canvas/60 px-4 py-3 transition-all duration-300 hover:border-accent hover:bg-accent-soft"
                  >
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
                    <span className="text-ink-soft">{b}</span>
                  </motion.li>
                ))}
              </motion.ul>
            </div>
          </motion.div>
        </section>

        {/* CTA */}
        <section className="mx-auto max-w-4xl px-6 py-24 text-center">
          <motion.h2
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: 0.6, ease: easeOut }}
            className="text-balance text-3xl font-bold tracking-tight text-ink md:text-5xl"
          >
            Ready to tidy up your business?
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: 0.6, ease: easeOut, delay: 0.1 }}
            className="mt-5 text-lg text-muted"
          >
            Create your workspace in under a minute.
          </motion.p>
          <motion.a
            href="/auth"
            onClick={goToAuth}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: 0.6, ease: easeOut, delay: 0.2 }}
            className="group mt-9 inline-flex items-center gap-2 rounded-full bg-accent px-8 py-4 text-lg font-medium text-accent-fg shadow-soft transition-all duration-300 hover:bg-accent-hover hover:shadow-lift"
          >
            Get started free
            <ArrowRight className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-0.5" />
          </motion.a>
        </section>

        {/* Footer */}
        <footer className="border-t border-hairline py-8">
          <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 text-sm text-muted md:flex-row">
            <p>© {new Date().getFullYear()} Ledgerly. Built for tiny teams.</p>
            <div className="flex items-center gap-5">
              <Link to="/privacy" className="transition-colors duration-300 hover:text-ink font-medium">
                Privacy Policy
              </Link>
              <Link to="/auth" className="transition-colors duration-300 hover:text-ink">
                Sign in
              </Link>
              <a href="#features" className="transition-colors duration-300 hover:text-ink">
                Features
              </a>
            </div>
          </div>
        </footer>
      </motion.div>

      {/* Customer 360 Interactive Demo Modal */}
      <Customer360Modal
        open={modal360Open}
        onClose={() => setModal360Open(false)}
        onGoToAuth={goToAuth}
      />

      {/* Fade-to-auth overlay */}
      <AnimatePresence>
        {navigating && (
          <motion.div
            key="page-fade"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.32, ease: easeOut }}
            className="pointer-events-none fixed inset-0 z-[100] bg-canvas"
          />
        )}
      </AnimatePresence>
    </>
  );
}
