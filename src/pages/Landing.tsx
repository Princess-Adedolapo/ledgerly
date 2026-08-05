import { useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  KanbanSquare,
  ArrowRight,
  Sparkles,
  Check,
  CheckCircle2,
  CreditCard,
  Clock,
  X,
  Tag,
  Building2,
  Phone,
  ShieldCheck,
  Activity,
  Plus,
  Star,
  XCircle,
  ChevronDown,
} from 'lucide-react';
import { ThemeToggle } from '../components/ThemeToggle';
import { InteractiveFeatureShowcase } from '../components/landing/InteractiveFeatureShowcase';

const howItWorksSteps = [
  {
    step: '01',
    title: 'Import or set up your workspace',
    text: 'Bring over your active projects, client contacts, and invoice templates in under 5 minutes.',
  },
  {
    step: '02',
    title: 'Manage projects & client portal',
    text: 'Track deliverables, communicate, and share progress updates through one clean link.',
  },
  {
    step: '03',
    title: 'Get paid on autopilot',
    text: 'Send professional invoices, track payment status, and automate receipt thank-yous.',
  },
];

const faqItems = [
  {
    q: 'How long does it take to set up Ledgerly?',
    a: 'Most freelancers are fully set up within 5 to 10 minutes. You can import client lists or start from our ready-to-use templates right away.',
  },
  {
    q: 'Can my clients access Ledgerly without creating an account?',
    a: 'Yes. Clients receive custom view-only portal links to review deliverables and invoices, with no login or registration required on their end.',
  },
  {
    q: 'Is there a free trial or credit card required to sign up?',
    a: 'You get a 14-day full-access free trial with zero risk. No credit card is required to start.',
  },
  {
    q: 'How secure is my financial data?',
    a: 'We use enterprise-grade row-level security and encryption. Your financial records, client details, and documents are completely private and protected.',
  },
  {
    q: 'Can I replace my existing invoicing and CRM tools entirely?',
    a: 'Yes. Ledgerly combines CRM, project tracking, invoicing, and client portals into one workspace so you can cancel unnecessary subscription stacks.',
  },
];

const comparisonFeatures = [
  {
    category: 'Invoice Automation',
    ledgerly: 'Auto-mark invoices as Paid upon sending thank-you notes',
    others: 'Manual status updates',
  },
  {
    category: 'Document Sharing',
    ledgerly: 'Permanent PDF share links with no expiring URLs',
    others: 'Links expire or break over time',
  },
  {
    category: 'Flexibility & Customization',
    ledgerly: 'Multi-currency support, dark mode, and per-user preferences',
    others: 'Limited single-currency / strict themes',
  },
  {
    category: 'Data Security',
    ledgerly: 'Row-level data security and enterprise protection',
    others: 'Basic standard database permissions',
  },
];

const testimonials = [
  {
    name: 'Sarah Jenkins',
    role: 'Brand Designer & Strategist',
    company: 'Studio Jenkins',
    avatarBg: 'bg-violet-600',
    avatarInitials: 'SJ',
    rating: 5,
    quote: 'Ledgerly cut my admin time in half and made my client onboarding look 10x more professional. Sending instant payment links right after a kick-off call has been a game-changer.',
    highlight: 'Saved 8 hrs/week',
  },
  {
    name: 'David Chen',
    role: 'Full-Stack Developer',
    company: 'ChenTech Consulting',
    avatarBg: 'bg-indigo-600',
    avatarInitials: 'DC',
    rating: 5,
    quote: 'Having contacts, active project milestones, and invoices under one roof eliminated the chaos of switching between Notion, Stripe, and email threads. I get paid 3x faster now.',
    highlight: '3x Faster Payments',
  },
  {
    name: 'Maya Patel',
    role: 'Content Marketing Lead',
    company: 'Growth Craft Media',
    avatarBg: 'bg-emerald-600',
    avatarInitials: 'MP',
    rating: 5,
    quote: 'My clients constantly compliment the portal transparency. No more "what\'s the status?" emails. Everything they need is live and updated in real-time.',
    highlight: 'Zero Status Emails',
  },
];

const heroPills = ['CRM', 'Projects', 'Client Portal', 'Invoices', 'Contacts', 'WhatsApp'];

// Subtle premium easings
const easeOut = [0.22, 1, 0.36, 1] as const;

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
                  <p className="font-semibold text-ink">Invoice #INV-1042 Sent (₦4,800,000)</p>
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
                <span className="font-bold text-emerald-600 dark:text-emerald-400">₦18,400,000</span>
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
              <span className="font-bold text-accent">₦4,800,000</span>
            </div>
            <div className="p-2.5 rounded-lg border border-hairline bg-panel flex items-center justify-between">
              <div>
                <p className="font-semibold text-ink">Invoice #INV-1020</p>
                <p className="text-[10px] text-muted">Paid on Jul 10 · Design System</p>
              </div>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">₦12,000,000 (Paid)</span>
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
              <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">₦18,400,000</span>
            </div>
            <div className="p-2.5 rounded-xl border border-hairline bg-panel">
              <span className="text-muted block text-[10px]">Pending Invoices</span>
              <span className="text-sm font-bold text-accent">₦4,800,000 (#INV-1042)</span>
            </div>
            <div className="p-2.5 rounded-xl border border-hairline bg-panel">
              <span className="text-muted block text-[10px]">Active Pipeline</span>
              <span className="text-sm font-bold text-ink">Contract Signed (₦12M)</span>
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

export default function Landing() {
  const navigate = useNavigate();
  const [navigating, setNavigating] = useState(false);
  const [modal360Open, setModal360Open] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

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
          <div className="mx-auto max-w-6xl px-6 pb-12 pt-20 text-center md:pt-28">
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: easeOut }}
              className="mb-7 inline-flex flex-wrap items-center justify-center gap-3 rounded-full border border-purple-100 dark:border-purple-900/40 bg-purple-50/60 dark:bg-purple-950/40 px-4 py-1.5 text-xs font-medium text-slate-700 dark:text-purple-200/90 shadow-xs backdrop-blur-sm"
            >
              <div className="flex -space-x-2 overflow-hidden shrink-0">
                <img
                  className="inline-block h-6 w-6 rounded-full ring-2 ring-white dark:ring-slate-900 object-cover"
                  src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=80&q=80"
                  alt="User Avatar"
                />
                <img
                  className="inline-block h-6 w-6 rounded-full ring-2 ring-white dark:ring-slate-900 object-cover"
                  src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=80&q=80"
                  alt="User Avatar"
                />
                <img
                  className="inline-block h-6 w-6 rounded-full ring-2 ring-white dark:ring-slate-900 object-cover"
                  src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=80&q=80"
                  alt="User Avatar"
                />
              </div>
              <div className="flex items-center gap-1.5">
                <div className="flex text-amber-400 gap-0.5">
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                </div>
                <span>
                  Loved by <strong className="font-semibold text-slate-900 dark:text-white">1,000+</strong> freelancers & business owners
                </span>
              </div>
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: easeOut, delay: 0.05 }}
              className="mx-auto max-w-4xl text-balance text-4xl font-extrabold leading-[1.1] tracking-tight text-slate-900 dark:text-white sm:text-5xl md:text-6xl font-['Plus_Jakarta_Sans',sans-serif]"
            >
              Everything you need to run your business in{' '}
              <span className="text-[#6D5FFA] dark:text-[#8174FF]">one Workspace</span>.
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: easeOut, delay: 0.15 }}
              className="mx-auto mt-6 max-w-2xl text-pretty text-base sm:text-lg leading-relaxed text-muted"
            >
              Manage clients, projects, invoices, contacts and communication without switching between five different apps.
            </motion.p>
            {/* Feature pills */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: easeOut, delay: 0.25 }}
              className="mt-7 flex flex-wrap items-center justify-center gap-2.5"
            >
              {heroPills.map((pill) => (
                <span
                  key={pill}
                  className="inline-flex items-center gap-2 rounded-full border border-purple-200/70 dark:border-purple-800/40 bg-white/80 dark:bg-purple-950/30 px-4 py-1.5 text-xs font-semibold text-purple-900 dark:text-purple-200 shadow-xs backdrop-blur-sm"
                >
                  <Check className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400 font-bold" />
                  {pill}
                </span>
              ))}
            </motion.div>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: easeOut, delay: 0.35 }}
              className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row"
            >
              <a
                href="/auth"
                onClick={goToAuth}
                className="group flex items-center gap-2 rounded-full bg-accent px-7 py-3.5 font-semibold text-accent-fg shadow-md transition-all duration-300 hover:bg-accent-hover hover:shadow-lift hover:scale-105"
              >
                Start free
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
              </a>
              <a
                href="#features"
                className="rounded-full border border-hairline-strong bg-panel px-7 py-3.5 font-semibold text-ink-soft shadow-soft transition-all duration-300 hover:border-accent hover:text-ink"
              >
                See what&apos;s inside
              </a>
            </motion.div>

            {/* Below-CTA Friction Reducer */}
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: easeOut, delay: 0.4 }}
              className="mt-3.5 text-xs text-muted font-medium flex items-center justify-center gap-1.5"
            >
              Free 14-day trial • No credit card required
            </motion.p>
          </div>
        </section>

        {/* Problem vs. Solution Comparison Section */}
        <section className="mx-auto max-w-6xl px-6 py-12 sm:py-16">
          <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-14">
            <motion.h2
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, ease: easeOut }}
              className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight font-['Plus_Jakarta_Sans',sans-serif]"
            >
              Stop juggling tools. Start closing deals.
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, ease: easeOut, delay: 0.1 }}
              className="mt-3 text-base sm:text-lg text-muted leading-relaxed"
            >
              Managing a freelance business shouldn&apos;t feel like a full-time administrative job.
            </motion.p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 items-stretch">
            {/* Left Column: The Old Way (Problem) */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, ease: easeOut }}
              className="rounded-3xl border border-red-500/20 bg-red-500/5 dark:bg-red-950/20 p-6 sm:p-8 flex flex-col justify-between relative overflow-hidden"
            >
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10 text-red-600 dark:text-red-400 font-bold">
                    <XCircle className="w-5 h-5" />
                  </span>
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-red-600 dark:text-red-400">The Old Way</span>
                    <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">Fragmented & Stressful</h3>
                  </div>
                </div>

                <ul className="space-y-4">
                  <li className="flex items-start gap-3">
                    <div className="mt-0.5 flex-shrink-0 text-red-500 dark:text-red-400">
                      <XCircle className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Fragmented client communications</p>
                      <p className="text-xs text-muted mt-0.5 leading-relaxed">Scattered conversations across WhatsApp, inbox emails, Instagram DMs, and text messages.</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="mt-0.5 flex-shrink-0 text-red-500 dark:text-red-400">
                      <XCircle className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Lost invoices & unpaid bills</p>
                      <p className="text-xs text-muted mt-0.5 leading-relaxed">Forgetting who owes you money and manually chasing down overdue client payments.</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="mt-0.5 flex-shrink-0 text-red-500 dark:text-red-400">
                      <XCircle className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Scattered project statuses</p>
                      <p className="text-xs text-muted mt-0.5 leading-relaxed">Status updates split across Notion pages, Trello boards, sticky notes, and spreadsheets.</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="mt-0.5 flex-shrink-0 text-red-500 dark:text-red-400">
                      <XCircle className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Wasted administrative hours</p>
                      <p className="text-xs text-muted mt-0.5 leading-relaxed">Spending 10+ hours every week switching between tabs and doing redundant manual work.</p>
                    </div>
                  </li>
                </ul>
              </div>
            </motion.div>

            {/* Right Column: The Ledgerly Way (Solution) */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, ease: easeOut, delay: 0.1 }}
              className="rounded-3xl border border-emerald-500/30 bg-emerald-500/10 dark:bg-emerald-950/30 p-6 sm:p-8 flex flex-col justify-between relative overflow-hidden shadow-lg shadow-emerald-500/5"
            >
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold">
                    <CheckCircle2 className="w-5 h-5" />
                  </span>
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">The Ledgerly Way</span>
                    <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">Unified & Effortless</h3>
                  </div>
                </div>

                <ul className="space-y-4">
                  <li className="flex items-start gap-3">
                    <div className="mt-0.5 flex-shrink-0 text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Central client portal & CRM</p>
                      <p className="text-xs text-muted mt-0.5 leading-relaxed">All contacts, activity history, and client communications organized in one place.</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="mt-0.5 flex-shrink-0 text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Automated invoicing & payment links</p>
                      <p className="text-xs text-muted mt-0.5 leading-relaxed">Send instant shareable payment links, track payment statuses automatically, and get paid faster.</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="mt-0.5 flex-shrink-0 text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Real-time project tracking</p>
                      <p className="text-xs text-muted mt-0.5 leading-relaxed">Interactive Kanban boards, milestones, and deliverables linked directly to client profiles.</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="mt-0.5 flex-shrink-0 text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Focus on billable work & growth</p>
                      <p className="text-xs text-muted mt-0.5 leading-relaxed">Reclaim 10+ hours every week to focus on delivering great client work and scaling your business.</p>
                    </div>
                  </li>
                </ul>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Features Showcase */}
        <div id="features">
          <InteractiveFeatureShowcase />
        </div>

        {/* Spotlight Customer 360 Feature Card */}
        <section className="mx-auto max-w-6xl px-6 py-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.6, ease: easeOut }}
            className="rounded-3xl border border-purple-800/50 bg-gradient-to-br from-[#180E33] via-[#140C2C] to-[#0F0821] p-6 sm:p-10 shadow-2xl relative overflow-hidden text-slate-100"
          >
            {/* Background Ambient Glow */}
            <div className="pointer-events-none absolute -right-20 -top-20 w-80 h-80 rounded-full bg-violet-600/20 blur-3xl" />
            <div className="pointer-events-none absolute -left-20 -bottom-20 w-80 h-80 rounded-full bg-indigo-600/20 blur-3xl" />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
              <div className="lg:col-span-5 space-y-4">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-500/20 border border-purple-500/30 px-3 py-1 text-xs font-bold text-violet-300">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Spotlight Feature
                </span>
                <h3 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-tight">
                  Customer 360 View: Your Client&apos;s Entire Story in One Place
                </h3>
                <p className="text-sm leading-relaxed text-purple-200/80">
                  Stop hunting through email threads or separate tabs. Instantly view total revenue, active deals, invoice statuses, custom tags, and complete activity history for clients like <strong className="text-amber-300 font-bold">Acme Studio</strong>.
                </p>
                <div className="pt-2 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setModal360Open(true)}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-bold text-xs shadow-lg shadow-purple-600/30 transition-all hover:scale-105"
                  >
                    <Sparkles className="w-4 h-4 text-amber-300" /> Try Customer 360 Demo
                  </button>
                  <button
                    type="button"
                    onClick={goToAuth}
                    className="flex items-center gap-1 text-xs font-semibold text-purple-300 hover:text-white transition-colors px-3 py-2"
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
        </section>

        {/* Testimonials Section */}
        <section className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
          <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, ease: easeOut }}
              className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 px-3.5 py-1 text-xs font-bold text-amber-600 dark:text-amber-400 mb-3"
            >
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              Trusted by 1,000+ Creators
            </motion.div>
            <motion.h2
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, ease: easeOut, delay: 0.05 }}
              className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight font-['Plus_Jakarta_Sans',sans-serif]"
            >
              Built for freelancers, trusted by pros
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, ease: easeOut, delay: 0.1 }}
              className="mt-3.5 text-base sm:text-lg text-muted leading-relaxed"
            >
              See how independent creators and consultants saved hours every week.
            </motion.p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 items-stretch">
            {testimonials.map((t, idx) => (
              <motion.div
                key={t.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, ease: easeOut, delay: idx * 0.1 }}
                className="rounded-3xl border border-hairline bg-panel p-6 sm:p-8 shadow-soft flex flex-col justify-between hover:border-accent/40 transition-all duration-300 hover:shadow-lift group"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-1">
                      {[...Array(t.rating)].map((_, i) => (
                        <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                      ))}
                    </div>
                    <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-accent-soft text-accent border border-accent/20">
                      {t.highlight}
                    </span>
                  </div>
                  <p className="text-sm sm:text-base leading-relaxed text-ink-soft dark:text-slate-200 font-normal italic">
                    &ldquo;{t.quote}&rdquo;
                  </p>
                </div>

                <div className="mt-6 pt-6 border-t border-hairline flex items-center gap-3.5">
                  <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${t.avatarBg} text-white font-bold text-sm shadow-md`}>
                    {t.avatarInitials}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-accent transition-colors">
                      {t.name}
                    </h4>
                    <p className="text-xs text-muted font-medium">
                      {t.role} • <span className="text-slate-500 dark:text-slate-400">{t.company}</span>
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Feature Comparison Section */}
        <section className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
          <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
            <motion.h2
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, ease: easeOut }}
              className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight font-['Plus_Jakarta_Sans',sans-serif]"
            >
              The little details other tools skip
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, ease: easeOut, delay: 0.1 }}
              className="mt-3.5 text-base sm:text-lg text-muted leading-relaxed"
            >
              How Ledgerly compares to standard tools on the features that actually matter.
            </motion.p>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.7, ease: easeOut }}
            className="rounded-3xl border border-hairline bg-panel p-4 sm:p-8 shadow-soft overflow-hidden"
          >
            {/* Desktop / Tablet Table Header */}
            <div className="hidden md:grid md:grid-cols-12 gap-4 pb-4 mb-4 border-b border-hairline items-center text-sm font-bold">
              <div className="col-span-4 text-muted uppercase tracking-wider text-xs">Feature / Capability</div>
              <div className="col-span-4 flex items-center gap-2 text-accent font-extrabold text-base px-4 py-2 rounded-xl bg-accent/10 border border-accent/20">
                <Sparkles className="w-4 h-4 text-accent" />
                <span>Ledgerly</span>
                <span className="ml-auto text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-accent text-accent-fg">Built Better</span>
              </div>
              <div className="col-span-4 text-muted font-semibold text-base px-4 py-2">
                Other Tools
              </div>
            </div>

            {/* Feature Comparison Rows */}
            <div className="space-y-4 md:space-y-3">
              {comparisonFeatures.map((f) => (
                <div
                  key={f.category}
                  className="rounded-2xl border border-hairline/60 bg-canvas/40 md:bg-transparent md:border-none p-4 md:p-0 md:grid md:grid-cols-12 md:gap-4 md:items-center transition-all duration-200 hover:bg-canvas/80 md:hover:bg-transparent"
                >
                  {/* Category Name */}
                  <div className="md:col-span-4 font-bold text-slate-900 dark:text-white text-sm sm:text-base mb-3 md:mb-0 flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-accent md:hidden"></span>
                    {f.category}
                  </div>

                  {/* Ledgerly Feature Box */}
                  <div className="md:col-span-4 rounded-xl bg-accent-soft/80 dark:bg-accent/10 border border-accent/25 p-3.5 mb-2.5 md:mb-0 flex items-start gap-3 shadow-xs">
                    <CheckCircle2 className="w-5 h-5 text-accent shrink-0 mt-0.5" />
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-accent md:hidden block mb-0.5">Ledgerly</span>
                      <p className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100 leading-snug">
                        {f.ledgerly}
                      </p>
                    </div>
                  </div>

                  {/* Other Tools Box */}
                  <div className="md:col-span-4 rounded-xl bg-slate-100/80 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-800/60 p-3.5 flex items-start gap-3">
                    <XCircle className="w-5 h-5 text-slate-400 dark:text-slate-500 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 md:hidden block mb-0.5">Other Tools</span>
                      <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-snug">
                        {f.others}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </section>

        {/* How It Works Section */}
        <section className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
          <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
            <motion.h2
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, ease: easeOut }}
              className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight font-['Plus_Jakarta_Sans',sans-serif]"
            >
              Up and running in 3 simple steps
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, ease: easeOut, delay: 0.1 }}
              className="mt-3.5 text-base sm:text-lg text-muted leading-relaxed"
            >
              No complex setup or weeks of learning curves.
            </motion.p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 items-stretch">
            {howItWorksSteps.map((step, idx) => (
              <motion.div
                key={step.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, ease: easeOut, delay: idx * 0.1 }}
                className="rounded-3xl border border-hairline bg-panel p-6 sm:p-8 shadow-soft flex flex-col justify-between hover:border-accent/40 transition-all duration-300 hover:shadow-lift group relative overflow-hidden"
              >
                <div>
                  <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-soft text-accent font-extrabold text-lg sm:text-xl border border-accent/20 mb-6 shadow-xs group-hover:scale-105 transition-transform">
                    {step.step}
                  </span>
                  <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mb-2.5 group-hover:text-accent transition-colors">
                    {step.title}
                  </h3>
                  <p className="text-sm text-muted leading-relaxed">
                    {step.text}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* FAQ Section */}
        <section className="mx-auto max-w-4xl px-6 py-16 sm:py-20">
          <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-14">
            <motion.h2
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, ease: easeOut }}
              className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight font-['Plus_Jakarta_Sans',sans-serif]"
            >
              Frequently Asked Questions
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, ease: easeOut, delay: 0.1 }}
              className="mt-3.5 text-base sm:text-lg text-muted leading-relaxed"
            >
              Everything you need to know about getting started.
            </motion.p>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease: easeOut, delay: 0.15 }}
            className="space-y-3.5"
          >
            {faqItems.map((faq, idx) => {
              const isOpen = openFaqIndex === idx;
              return (
                <div
                  key={faq.q}
                  className="rounded-2xl border border-hairline bg-panel shadow-xs overflow-hidden transition-all duration-200"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                    className="w-full px-6 py-4 sm:py-5 flex items-center justify-between gap-4 text-left font-bold text-slate-900 dark:text-white text-base sm:text-lg hover:text-accent transition-colors"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown
                      className={`w-5 h-5 shrink-0 transition-transform duration-300 ${
                        isOpen ? 'rotate-180 text-accent' : 'text-slate-400'
                      }`}
                    />
                  </button>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        key="content"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.28, ease: easeOut }}
                        className="overflow-hidden"
                      >
                        <div className="px-6 pb-5 pt-1 text-sm sm:text-base leading-relaxed text-muted border-t border-hairline/50">
                          {faq.a}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
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
