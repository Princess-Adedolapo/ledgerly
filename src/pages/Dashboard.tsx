import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase, type Contact, type Note, type WorkflowCard, type WorkflowColumn, type Invoice } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { useWorkspace, useActiveWorkspaceId } from '../lib/workspace';
import { useUserPreferences } from '../lib/userPreferences';
import { useToast } from '../contexts/ToastContext';
import { useActivityLog } from '../contexts/ActivityLogContext';
import { PageHeader, Card, EmptyState, Button } from '../components/ui';
import { OnboardingChecklist } from '../components/OnboardingChecklist';
import { FollowUpTasksWidget } from '../components/dashboard/FollowUpTasksWidget';
import { formatCurrency } from '../lib/currency';
import {
  Users, KanbanSquare, Clock, ArrowRight, UserPlus, AlertTriangle, ShieldAlert,
  Send, CheckCircle2, ChevronRight, Filter, X, Receipt, MessageSquare
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  LabelList,
} from 'recharts';

type Activity = {
  id: string;
  type: 'note' | 'card' | 'contact' | 'invoice';
  label: string;
  detail: string;
  created_at: string | null;
  contactId?: string;
  contactName?: string;
  link?: string;
};

function formatRelativeTime(dateString: string | null | undefined): string {
  if (!dateString) return 'Just now';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return 'Just now';
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 30) return 'Just now';
  if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 30) return `${diffInDays}d ago`;
  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) return `${diffInMonths}mo ago`;
  return `${Math.floor(diffInDays / 365)}y ago`;
}

function getAvatarInitial(name: string | null | undefined): string {
  if (!name || !name.trim()) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.trim().slice(0, 2).toUpperCase();
}

const BRAND_AVATAR_COLORS = [
  { bg: 'bg-violet-500/15 dark:bg-violet-500/25', text: 'text-violet-700 dark:text-violet-300' },
  { bg: 'bg-indigo-500/15 dark:bg-indigo-500/25', text: 'text-indigo-700 dark:text-indigo-300' },
  { bg: 'bg-emerald-500/15 dark:bg-emerald-500/25', text: 'text-emerald-700 dark:text-emerald-300' },
  { bg: 'bg-sky-500/15 dark:bg-sky-500/25', text: 'text-sky-700 dark:text-sky-300' },
  { bg: 'bg-slate-500/15 dark:bg-slate-500/25', text: 'text-slate-700 dark:text-slate-300' },
  { bg: 'bg-amber-500/15 dark:bg-amber-500/25', text: 'text-amber-700 dark:text-amber-300' },
];

function getAvatarColor(name: string | null | undefined) {
  if (!name) return BRAND_AVATAR_COLORS[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % BRAND_AVATAR_COLORS.length;
  return BRAND_AVATAR_COLORS[index];
}

function getTimeOfDayGreeting(name: string): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) {
    return `Good morning, ${name}`;
  } else if (hour >= 12 && hour < 17) {
    return `Good afternoon, ${name}`;
  } else if (hour >= 17 && hour < 22) {
    return `Good evening, ${name}`;
  } else {
    return `Working late, ${name}?`;
  }
}

type TooltipPayloadItem = {
  payload: {
    id: string;
    name: string;
    count: number;
    pct: number;
  };
};

const CustomTooltip = ({
  active,
  payload,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
}) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700 p-2.5 rounded-xl shadow-xl text-white text-xs">
        <p className="font-bold text-violet-400 mb-0.5">{data.name}</p>
        <p className="font-semibold text-slate-200">
          {data.count} {data.count === 1 ? 'card' : 'cards'} ({data.pct}% of pipeline)
        </p>
        <p className="text-[10px] text-slate-400 mt-1">Click bar to filter activity feed</p>
      </div>
    );
  }
  return null;
};

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { businessName } = useWorkspace();
  const workspaceId = useActiveWorkspaceId();
  const { displayName, currencyCode, currencyDisplayMode } = useUserPreferences();
  const { addToast } = useToast();
  const { logs, logActivity } = useActivityLog();

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [cards, setCards] = useState<WorkflowCard[]>([]);
  const [columns, setColumns] = useState<WorkflowColumn[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStageId, setSelectedStageId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!workspaceId) { setLoading(false); return; }
      setLoading(true);
      try {
        const [c, n, cols, crds, inv] = await Promise.all([
          supabase.from('contacts').select('*').eq('workspace_id', workspaceId).order('created_at', { ascending: false }),
          supabase.from('notes').select('*').eq('workspace_id', workspaceId).order('created_at', { ascending: false }).limit(15),
          supabase.from('workflow_columns').select('*').eq('workspace_id', workspaceId).order('position', { ascending: true }),
          supabase.from('workflow_cards').select('*').eq('workspace_id', workspaceId).order('moved_at', { ascending: false }),
          supabase.from('invoices').select('*').eq('workspace_id', workspaceId).order('created_at', { ascending: false }),
        ]);

        if (c.error) throw new Error(c.error.message);
        if (n.error) throw new Error(n.error.message);
        if (cols.error) throw new Error(cols.error.message);
        if (crds.error) throw new Error(crds.error.message);
        if (inv.error) throw new Error(inv.error.message);

        setContacts((c.data ?? []) as Contact[]);
        setNotes((n.data ?? []) as Note[]);
        setColumns((cols.data ?? []) as WorkflowColumn[]);
        setCards((crds.data ?? []) as WorkflowCard[]);
        setInvoices((inv.data ?? []) as Invoice[]);
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
        const message = err instanceof Error ? err.message : String(err);
        const isFetchError = message.toLowerCase().includes('failed to fetch') || message.toLowerCase().includes('load');
        const friendlyMsg = isFetchError
          ? 'Network error. Please check your connection or reload the page.'
          : message || 'Could not load dashboard data.';
        addToast('error', 'Error Loading Dashboard', friendlyMsg);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [workspaceId, addToast]);

  const resolvedCol = columns.find((c) => c.name === 'Resolved / Completed');
  const openCards = cards.filter((card) => !resolvedCol || card.column_id !== resolvedCol.id);

  // SLA Computations (7 Days Threshold)
  const now = Date.now();
  const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

  // 1. Overdue Invoices > 7 Days
  const overdueInvoices = invoices.filter((inv) => {
    if (inv.status === 'paid') return false;
    if (inv.status === 'overdue') return true;
    if (inv.due_date) {
      const dueDateMs = new Date(inv.due_date).getTime();
      return (now - dueDateMs) > SEVEN_DAYS_MS;
    }
    return false;
  });

  // 2. Stalled Workflow Cards > 7 Days in current stage
  const stalledCards = openCards.filter((card) => {
    const movedMs = card.moved_at ? new Date(card.moved_at).getTime() : (card.created_at ? new Date(card.created_at).getTime() : now);
    return (now - movedMs) > SEVEN_DAYS_MS;
  });

  const handleSendReminder = (inv: Invoice) => {
    const contactMatch = contacts.find((c) => c.name.toLowerCase().trim() === (inv.customer_name || '').toLowerCase().trim());
    logActivity('invoice', `Sent payment reminder for Invoice #${inv.invoice_number || inv.id.slice(0, 8)} (${formatCurrency(Number(inv.amount), inv.currency || currencyCode, currencyDisplayMode)})`, contactMatch?.id);
    addToast('success', 'Reminder Logged', `Payment reminder recorded for ${inv.customer_name}.`);
  };

  const rawActivities: Activity[] = [
    ...notes.map((n) => {
      const contactMatch = contacts.find((c) => c.id === n.contact_id);
      return {
        id: `note-${n.id}`,
        type: 'note' as const,
        label: 'Message / Note',
        detail: n.body,
        created_at: n.created_at,
        contactId: n.contact_id,
        contactName: contactMatch?.name,
        link: n.contact_id ? `/contacts/${n.contact_id}` : undefined,
      };
    }),
    ...cards.map((card) => {
      const contactMatch = contacts.find((c) => c.id === card.contact_id);
      return {
        id: `card-${card.id}`,
        type: 'card' as const,
        label: 'Workflow update',
        detail: card.title,
        created_at: card.moved_at || card.created_at,
        contactId: card.contact_id,
        contactName: contactMatch?.name,
        link: '/workflow',
      };
    }),
    ...invoices.map((inv) => {
      const contactMatch = contacts.find((c) => c.name.toLowerCase().trim() === (inv.customer_name || '').toLowerCase().trim());
      return {
        id: `inv-${inv.id}`,
        type: 'invoice' as const,
        label: inv.status === 'paid' ? 'Invoice paid' : `Invoice #${inv.invoice_number || inv.id.slice(0, 8)}`,
        detail: `${inv.customer_name || 'Customer'} · ${formatCurrency(Number(inv.amount), inv.currency_code || currencyCode, currencyDisplayMode)}`,
        created_at: inv.created_at,
        contactId: contactMatch?.id,
        contactName: inv.customer_name || contactMatch?.name,
        link: '/invoices',
      };
    }),
    ...contacts.map((c) => ({
      id: `contact-${c.id}`,
      type: 'contact' as const,
      label: 'New contact registered',
      detail: c.name,
      created_at: c.created_at,
      contactId: c.id,
      contactName: c.name,
      link: `/contacts/${c.id}`,
    })),
    ...logs.map((log) => {
      const contactMatch = contacts.find((c) => c.id === log.contactId);
      return {
        id: log.id,
        type: (log.type === 'workflow' || log.type === 'status' ? 'card' : log.type) as Activity['type'],
        label: log.type === 'invoice' ? 'Invoice activity' : log.type === 'workflow' ? 'Stage change' : 'Communication',
        detail: log.message,
        created_at: log.timestamp,
        contactId: log.contactId,
        contactName: contactMatch?.name,
        link: log.contactId ? `/contacts/${log.contactId}` : log.type === 'invoice' ? '/invoices' : '/workflow',
      };
    }),
  ].sort((a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime());

  const selectedColumn = columns.find((c) => c.id === selectedStageId);

  const stageCards = selectedStageId ? cards.filter((c) => c.column_id === selectedStageId) : [];
  const stageCardIds = new Set(stageCards.map((c) => c.id));
  const stageContactIds = new Set(stageCards.map((c) => c.contact_id).filter(Boolean) as string[]);

  const filteredActivities = rawActivities
    .filter((a) => {
      if (!selectedStageId) return true;
      if (a.type === 'card' && stageCardIds.has(a.id)) return true;
      if (a.contactId && stageContactIds.has(a.contactId)) return true;
      return false;
    })
    .slice(0, 6);

  const funnelData = columns.map((col) => {
    const colCards = cards.filter((c) => c.column_id === col.id);
    const pct = cards.length > 0 ? (colCards.length / cards.length) * 100 : 0;
    return {
      id: col.id,
      name: col.name,
      count: colCards.length,
      pct: Math.round(pct),
      label: `${colCards.length} (${Math.round(pct)}%)`,
    };
  });

  // Dynamic Risk Color Logic
  const getRiskStyle = (count: number) => {
    if (count === 0) {
      return {
        gradient: 'from-slate-500 to-slate-600',
        border: 'border-gray-200 dark:border-gray-800',
        iconBg: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
        slaBorder: 'border-l-4 border-l-slate-300 dark:border-l-slate-700',
        badge: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20',
        badgeText: '0 Action Needed',
        stalledBadgeText: '0 Stalled',
        ping: false,
        pingColor: '',
        statusNote: 'Optimal SLA',
      };
    }
    if (count <= 2) {
      return {
        gradient: 'from-amber-500 to-orange-500',
        border: 'border-amber-500/40 dark:border-amber-500/30 ring-1 ring-amber-500/20',
        iconBg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
        slaBorder: 'border-l-4 border-l-amber-500',
        badge: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20',
        badgeText: `${count} Action Needed`,
        stalledBadgeText: `${count} Stalled`,
        ping: true,
        pingColor: 'bg-amber-500',
        statusNote: 'Low SLA Warning',
      };
    }
    return {
      gradient: 'from-rose-500 to-red-600',
      border: 'border-rose-500/40 dark:border-rose-500/30 ring-1 ring-rose-500/20',
      iconBg: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
      slaBorder: 'border-l-4 border-l-rose-500',
      badge: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20',
      badgeText: `${count} Action Needed`,
      stalledBadgeText: `${count} Stalled`,
      ping: true,
      pingColor: 'bg-rose-500',
      statusNote: 'High SLA Risk',
    };
  };

  const overdueRisk = getRiskStyle(overdueInvoices.length);
  const stalledRisk = getRiskStyle(stalledCards.length);

  const stats = [
    {
      label: 'Total Contacts',
      value: contacts.length,
      icon: Users,
      color: 'from-sky-500 to-cyan-500',
      border: 'border-gray-200 dark:border-gray-800',
      link: '/contacts',
      badge: 'Operational',
      badgeStyle: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20',
      ping: false,
    },
    {
      label: 'Active Workflow Items',
      value: openCards.length,
      icon: KanbanSquare,
      color: 'from-violet-600 to-indigo-500',
      border: 'border-gray-200 dark:border-gray-800',
      link: '/workflow',
      badge: 'Active',
      badgeStyle: 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20',
      ping: false,
    },
  ];

  const userFirstName =
    displayName?.trim() ||
    user?.user_metadata?.full_name?.split(' ')[0] ||
    (user?.email ? user.email.split('@')[0] : 'there');

  const formattedName =
    userFirstName.charAt(0).toUpperCase() + userFirstName.slice(1);

  const greeting = getTimeOfDayGreeting(formattedName);

  if (loading) {
    return (
      <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
        <PageHeader title="Dashboard" subtitle="Loading CRM overview..." />
        <div className="h-28 bg-gray-100 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-800 rounded-2xl animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[0, 1].map((i) => (
            <div key={i} className="h-32 bg-gray-100 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-800 rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
      <PageHeader
        title={greeting}
        subtitle={`Here's what's happening across ${businessName || 'your workspace'} today`}
      />

      <OnboardingChecklist
        hasContacts={contacts.length > 0}
        hasCards={cards.length > 0}
        hasInvoices={invoices.length > 0}
        businessNameSet={!!businessName?.trim()}
      />

      {/* OVERVIEW SECTION */}
      <div>
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3 block">
          OVERVIEW
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {stats.map((s) => (
            <Link
              key={s.label}
              to={s.link}
              className={`group relative bg-white dark:bg-gray-900/60 backdrop-blur-xl border ${s.border} rounded-2xl p-5 hover:shadow-lg transition-all`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center text-white shadow-md`}>
                  <s.icon className="w-5 h-5" />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${s.badgeStyle}`}>
                    {s.badge}
                  </span>
                  <ArrowRight className="w-4 h-4 text-gray-300 dark:text-gray-500 group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors" />
                </div>
              </div>
              <p className="text-3xl font-extrabold text-gray-900 dark:text-white">{s.value}</p>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1">
                {s.label}
                {s.ping && <span className={`w-2 h-2 rounded-full ${s.pingColor} animate-ping inline-block ml-1`} />}
              </p>
            </Link>
          ))}
        </div>
      </div>

      {/* TASK & FOLLOW-UP ENGINE */}
      <FollowUpTasksWidget />

      {/* RISK & SLA SECTION */}
      <div>
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3 block">
          RISK & SLA
        </span>

        {overdueInvoices.length === 0 && stalledCards.length === 0 ? (
          <div className="p-4 bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/20 rounded-2xl flex items-center justify-between gap-3 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900 dark:text-white">
                  ✓ All clear — no overdue invoices, no stalled cards.
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  All payments and workflow pipelines are operating within healthy SLA bounds.
                </p>
              </div>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 shrink-0 hidden sm:inline-block">
              Optimal SLA
            </span>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* ALERT 1: Overdue Invoices (>7 days) */}
            <Card className={`p-5 ${overdueRisk.slaBorder}`}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className={`p-2 rounded-lg ${overdueRisk.iconBg}`}>
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-gray-900 dark:text-white">Overdue Invoices SLA</h2>
                    <p className="text-xs text-gray-500">Invoices overdue by more than 7 days</p>
                  </div>
                </div>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${overdueRisk.badge}`}>
                  {overdueRisk.badgeText}
                </span>
              </div>

              {overdueInvoices.length === 0 ? (
                <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-xl flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                  <p className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">
                    All customer invoices are up to date! No overdue payment reminders required.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {overdueInvoices.slice(0, 4).map((inv) => {
                    const dueDateMs = inv.due_date ? new Date(inv.due_date).getTime() : now;
                    const daysOverdue = Math.max(1, Math.floor((now - dueDateMs) / (1000 * 60 * 60 * 24)));
                    return (
                      <div key={inv.id} className="p-3.5 bg-gray-50 dark:bg-gray-800/40 border border-gray-200 dark:border-gray-800 rounded-xl flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-bold text-gray-900 dark:text-white">
                            {inv.customer_name}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            Invoice #{inv.invoice_number || inv.id.slice(0, 8)} · <span className="text-rose-600 font-semibold">{daysOverdue} days overdue</span>
                          </p>
                        </div>

                        <div className="text-right shrink-0">
                          <p className="text-sm font-bold text-gray-900 dark:text-white mb-1">
                            {formatCurrency(Number(inv.amount), inv.currency || currencyCode, currencyDisplayMode)}
                          </p>
                          <Button size="sm" onClick={() => handleSendReminder(inv)}>
                            <Send className="w-3 h-3 mr-1" /> Remind
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>

            {/* ALERT 2: Stalled Workflow Cards (>7 days in stage) */}
            <Card className={`p-5 ${stalledRisk.slaBorder}`}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className={`p-2 rounded-lg ${stalledRisk.iconBg}`}>
                    <ShieldAlert className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-gray-900 dark:text-white">Stalled Workflow SLA</h2>
                    <p className="text-xs text-gray-500">Cards unmoved in a column for over 7 days</p>
                  </div>
                </div>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${stalledRisk.badge}`}>
                  {stalledRisk.stalledBadgeText}
                </span>
              </div>

              {stalledCards.length === 0 ? (
                <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-xl flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                  <p className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">
                    Workflow momentum is high! All cards have been updated or progressed within the last 7 days.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {stalledCards.slice(0, 4).map((card) => {
                    const col = columns.find((c) => c.id === card.column_id);
                    const movedMs = card.moved_at ? new Date(card.moved_at).getTime() : (card.created_at ? new Date(card.created_at).getTime() : now);
                    const daysStalled = Math.max(1, Math.floor((now - movedMs) / (1000 * 60 * 60 * 24)));
                    return (
                      <div key={card.id} className="p-3.5 bg-gray-50 dark:bg-gray-800/40 border border-gray-200 dark:border-gray-800 rounded-xl flex items-center justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20">
                              {col ? col.name : 'Pipeline'}
                            </span>
                            <span className="text-xs text-amber-600 dark:text-amber-400 font-semibold">{daysStalled}d in stage</span>
                          </div>
                          <p className="text-sm font-bold text-gray-900 dark:text-white mt-1">
                            {card.title}
                          </p>
                        </div>

                        <Button size="sm" variant="secondary" onClick={() => navigate('/workflow')}>
                          View Board
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          </div>
        )}
      </div>

      {/* PIPELINE & RECENT ACTIVITY SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* PIPELINE SECTION */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              PIPELINE
            </span>
            {selectedStageId && (
              <button
                type="button"
                onClick={() => setSelectedStageId(null)}
                className="text-xs font-bold text-violet-600 dark:text-violet-400 hover:underline"
              >
                Clear Stage Filter
              </button>
            )}
          </div>
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  <KanbanSquare className="w-5 h-5 text-violet-600" /> Pipeline Conversion Funnel
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Click any stage bar to filter Customer 360 activity feed
                </p>
              </div>
              <Link to="/workflow" className="text-xs text-violet-600 dark:text-violet-400 font-semibold hover:underline shrink-0">
                Open Board →
              </Link>
            </div>

            {columns.length === 0 ? (
              <EmptyState icon={KanbanSquare} title="No columns" subtitle="Visit the Workflow Board to initialize" />
            ) : (
              <div className="space-y-3">
                {/* Recharts Conversion Funnel */}
                <div className="w-full h-56 pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      layout="vertical"
                      data={funnelData}
                      margin={{ top: 5, right: 65, left: 0, bottom: 5 }}
                    >
                      <defs>
                        <linearGradient id="funnelActiveGrad" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor="#7c3aed" />
                          <stop offset="100%" stopColor="#4f46e5" />
                        </linearGradient>
                        <linearGradient id="funnelSelectedGrad" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor="#a855f7" />
                          <stop offset="100%" stopColor="#ec4899" />
                        </linearGradient>
                        <linearGradient id="funnelMutedGrad" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor="#475569" />
                          <stop offset="100%" stopColor="#334155" />
                        </linearGradient>
                      </defs>
                      <XAxis type="number" hide />
                      <YAxis
                        type="category"
                        dataKey="name"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }}
                        width={110}
                      />
                      <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }} />
                      <Bar
                        dataKey="count"
                        radius={[0, 8, 8, 0]}
                        barSize={20}
                        className="cursor-pointer"
                        onClick={(data: { id?: string; payload?: { id?: string } }) => {
                          const id = data?.id || data?.payload?.id;
                          if (id) {
                            setSelectedStageId((prev) => (prev === id ? null : id));
                          }
                        }}
                      >
                        {funnelData.map((entry) => {
                          const isSelected = selectedStageId === entry.id;
                          const isDimmed = selectedStageId && !isSelected;
                          let fill = 'url(#funnelActiveGrad)';
                          if (isSelected) fill = 'url(#funnelSelectedGrad)';
                          else if (isDimmed) fill = 'url(#funnelMutedGrad)';
                          return (
                            <Cell
                              key={entry.id}
                              fill={fill}
                              className="transition-all duration-300 cursor-pointer hover:opacity-80"
                            />
                          );
                        })}
                        <LabelList
                          dataKey="label"
                          position="right"
                          fill="#94a3b8"
                          fontSize={11}
                          fontWeight={600}
                        />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Quick Filter Buttons */}
                <div className="flex flex-wrap items-center gap-1.5 pt-3 border-t border-gray-100 dark:border-gray-800">
                  <span className="text-[11px] font-semibold text-gray-400 mr-1">Filter by stage:</span>
                  {funnelData.map((stage) => {
                    const isSelected = selectedStageId === stage.id;
                    return (
                      <button
                        key={stage.id}
                        type="button"
                        onClick={() => setSelectedStageId((prev) => (prev === stage.id ? null : stage.id))}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                          isSelected
                            ? 'bg-violet-600 text-white shadow-sm ring-2 ring-violet-400/50'
                            : 'bg-gray-100 dark:bg-gray-800/80 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                        }`}
                      >
                        {stage.name} ({stage.count})
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* RECENT ACTIVITY SECTION */}
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3 block">
            RECENT ACTIVITY
          </span>
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <Clock className="w-5 h-5 text-violet-600" /> Customer 360 Activity Feed
              </h2>
              <Link to="/contacts" className="text-xs text-violet-600 dark:text-violet-400 font-semibold hover:underline">
                View All Contacts →
              </Link>
            </div>

            {/* Active Filter Pill */}
            {selectedColumn && (
              <div className="flex items-center justify-between px-3 py-2 mb-3 bg-violet-500/10 dark:bg-violet-900/20 border border-violet-500/30 rounded-xl text-xs">
                <span className="text-gray-700 dark:text-gray-200 flex items-center gap-1.5 font-medium">
                  <Filter className="w-3.5 h-3.5 text-violet-500 animate-pulse shrink-0" />
                  Filtered by: <strong className="font-bold text-violet-600 dark:text-violet-400">{selectedColumn.name}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedStageId(null)}
                  className="text-xs font-bold text-violet-600 dark:text-violet-400 hover:text-violet-800 dark:hover:text-violet-200 hover:underline flex items-center gap-1 ml-2 shrink-0"
                >
                  <X className="w-3 h-3" /> Clear Filter
                </button>
              </div>
            )}

            {filteredActivities.length === 0 ? (
              <EmptyState
                icon={Clock}
                title={selectedColumn ? `No activity in "${selectedColumn.name}"` : 'No recent activity'}
                subtitle={selectedColumn ? 'Click Clear Filter to view all activities' : undefined}
              />
            ) : (
              <div className="space-y-2.5">
                {filteredActivities.map((a) => (
                  <div
                    key={a.id}
                    onClick={() => {
                      if (a.link) navigate(a.link);
                      else if (a.contactId) navigate(`/contacts/${a.contactId}`);
                    }}
                    className="group flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-xl transition-all border-b border-gray-100 dark:border-gray-800/50 last:border-0 cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {/* Differentiated Event Icon by Type */}
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-xs transition-transform group-hover:scale-105 ${
                          a.type === 'invoice'
                            ? 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400'
                            : a.type === 'note'
                            ? 'bg-sky-500/10 text-sky-600 dark:bg-sky-500/20 dark:text-sky-400'
                            : a.type === 'card'
                            ? 'bg-violet-500/10 text-violet-600 dark:bg-violet-500/20 dark:text-violet-400'
                            : 'bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400'
                        }`}
                      >
                        {a.type === 'invoice' && <Receipt className="w-4 h-4" />}
                        {a.type === 'note' && <MessageSquare className="w-4 h-4" />}
                        {a.type === 'card' && <KanbanSquare className="w-4 h-4" />}
                        {a.type === 'contact' && <UserPlus className="w-4 h-4" />}
                      </div>

                      {/* Event Detail & Sleek Contact Avatar */}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors truncate">
                          {a.detail}
                        </p>

                        <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500 dark:text-gray-400 flex-wrap">
                          <span className="font-medium">{a.label}</span>
                          {a.contactName && (
                            <>
                              <span>•</span>
                              <div className="inline-flex items-center gap-1.5 bg-gray-100 dark:bg-gray-800/80 px-2 py-0.5 rounded-full text-[11px] font-medium text-gray-700 dark:text-gray-300">
                                <span
                                  className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 ${
                                    getAvatarColor(a.contactName).bg
                                  } ${getAvatarColor(a.contactName).text}`}
                                >
                                  {getAvatarInitial(a.contactName)}
                                </span>
                                <span className="truncate max-w-[120px]">{a.contactName}</span>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Relative Timestamp & Navigation Chevron */}
                    <div className="flex items-center gap-2.5 shrink-0 ml-3">
                      <span className="text-xs font-semibold text-gray-400 dark:text-gray-500">
                        {formatRelativeTime(a.created_at)}
                      </span>
                      <ChevronRight className="w-4 h-4 text-gray-300 dark:text-gray-600 group-hover:text-violet-500 transition-colors" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
