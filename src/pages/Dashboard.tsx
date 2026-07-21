import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase, type Contact, type Note, type WorkflowCard, type WorkflowColumn } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { useWorkspace, useActiveWorkspaceId } from '../lib/workspace';
import { useUserPreferences } from '../lib/userPreferences';
import { PageHeader, Card, EmptyState } from '../components/ui';
import { WeeklySalesWidget } from '../components/WeeklySalesWidget';
import { OnboardingChecklist } from '../components/OnboardingChecklist';
import { RevenueForecastWidget } from '../components/RevenueForecastWidget';
import { Users, KanbanSquare, Clock, ArrowRight, UserPlus, TrendingUp } from 'lucide-react';


type Activity = {
  id: string;
  type: 'note' | 'card' | 'contact';
  label: string;
  detail: string;
  created_at: string | null;
};

export default function Dashboard() {
  const { user } = useAuth();
  const { businessName } = useWorkspace();
  const workspaceId = useActiveWorkspaceId();
  const { displayName } = useUserPreferences();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [cards, setCards] = useState<WorkflowCard[]>([]);
  const [columns, setColumns] = useState<WorkflowColumn[]>([]);
  const [invoiceCount, setInvoiceCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!workspaceId) { setLoading(false); return; }
      const [c, n, cols, crds, inv] = await Promise.all([
        supabase.from('contacts').select('*').eq('workspace_id', workspaceId).order('created_at', { ascending: false }),
        supabase.from('notes').select('*').eq('workspace_id', workspaceId).order('created_at', { ascending: false }).limit(20),
        supabase.from('workflow_columns').select('*').eq('workspace_id', workspaceId).order('position', { ascending: true }),
        supabase.from('workflow_cards').select('*').eq('workspace_id', workspaceId).order('created_at', { ascending: false }),
        supabase.from('invoices').select('id', { count: 'exact', head: true }).eq('workspace_id', workspaceId),
      ]);
      setContacts(c.data ?? []);
      setNotes(n.data ?? []);
      setColumns((cols.data ?? []) as WorkflowColumn[]);
      setCards((crds.data ?? []) as WorkflowCard[]);
      setInvoiceCount(inv.count ?? 0);
      setLoading(false);
    }
    load();
  }, [workspaceId]);


  const openCards = cards.filter((card) => {
    const col = columns.find((c) => c.id === card.column_id);
    return col && col.name !== 'Resolved / Completed';
  });

  const activities: Activity[] = [
    ...notes.map((n) => ({
      id: n.id,
      type: 'note' as const,
      label: 'Note added',
      detail: n.body,
      created_at: n.created_at,
    })),
    ...cards.map((card) => ({
      id: card.id,
      type: 'card' as const,
      label: 'Workflow card',
      detail: card.title,
      created_at: card.created_at,
    })),
    ...contacts.map((c) => ({
      id: c.id,
      type: 'contact' as const,
      label: 'Contact created',
      detail: c.name,
      created_at: c.created_at,
    })),
  ]
    .sort((a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime())
    .slice(0, 8);

  const stats = [
    {
      label: 'Total Contacts',
      value: contacts.length,
      icon: Users,
      color: 'from-sky-500 to-cyan-400',
      link: '/contacts',
    },
    {
      label: 'Open Workflow Items',
      value: openCards.length,
      icon: KanbanSquare,
      color: 'from-violet-500 to-fuchsia-400',
      link: '/workflow',
    },
    {
      label: 'Total Workflow Cards',
      value: cards.length,
      icon: TrendingUp,
      color: 'from-emerald-500 to-teal-400',
      link: '/workflow',
    },
  ];

  if (loading) {
    return (
      <div className="p-6 md:p-8 max-w-7xl mx-auto">
        <PageHeader title="Dashboard" subtitle="Loading your overview..." />
        <div className="h-32 bg-gray-100 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-800 rounded-xl animate-pulse mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-32 bg-gray-100 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-800 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <PageHeader
        title="Dashboard"
        subtitle={`Welcome to ${businessName}${displayName ? ', ' + displayName : user?.email ? ', ' + user.email.split('@')[0] : ''}`}
      />

      <OnboardingChecklist
        hasContacts={contacts.length > 0}
        hasCards={cards.length > 0}
        hasInvoices={invoiceCount > 0}
        businessNameSet={!!businessName?.trim()}
      />


      {/* Weekly Sales Hero Widget */}
      <div className="mb-6">
        <WeeklySalesWidget />
      </div>

      {/* Dynamic Revenue Forecasting & Currency Stress Test Simulator */}
      <div className="mb-8">
        <RevenueForecastWidget />
      </div>


      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {stats.map((s) => (
          <Link
            key={s.label}
            to={s.link}
            className="group bg-white dark:bg-gray-900/60 backdrop-blur-xl border border-gray-200 dark:border-gray-800 rounded-xl p-5 hover:border-gray-300 dark:hover:border-gray-700 transition-all"
          >
            <div className="flex items-start justify-between mb-3">
              <div className={`w-11 h-11 rounded-lg bg-gradient-to-br ${s.color} flex items-center justify-center shadow-lg`}>
                <s.icon className="w-5 h-5 text-white" />
              </div>
              <ArrowRight className="w-4 h-4 text-gray-300 dark:text-gray-400 group-hover:text-gray-500 dark:group-hover:text-gray-200 transition-colors" />
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{s.value}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{s.label}</p>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Workflow breakdown */}
        <Card className="p-5">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Workflow by Column</h2>
          {columns.length === 0 ? (
            <EmptyState icon={KanbanSquare} title="No columns" subtitle="Visit the Workflow Board to initialize" />
          ) : (
            <div className="space-y-3">
              {columns.map((col) => {
                const colCards = cards.filter((c) => c.column_id === col.id);
                const pct = cards.length > 0 ? (colCards.length / cards.length) * 100 : 0;
                return (
                  <div key={col.id}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{col.name}</span>
                      <span className="text-sm text-gray-400 dark:text-gray-500">
                        {colCards.length} {colCards.length === 1 ? 'card' : 'cards'}
                      </span>
                    </div>
                    <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-violet-600 to-indigo-500 dark:from-violet-600 dark:to-indigo-500 rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Recent activity */}
        <Card className="p-5">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Recent Activity</h2>
          {activities.length === 0 ? (
            <EmptyState icon={Clock} title="No activity yet" />
          ) : (
            <div className="space-y-3">
              {activities.map((a) => (
                <div key={a.id} className="flex items-start gap-3 py-2 border-b border-gray-100 dark:border-gray-800/50 last:border-0">
                  <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0">
                    {a.type === 'note' && <Clock className="w-4 h-4 text-gray-400 dark:text-gray-500" />}
                    {a.type === 'card' && <KanbanSquare className="w-4 h-4 text-gray-400 dark:text-gray-500" />}
                    {a.type === 'contact' && <UserPlus className="w-4 h-4 text-gray-400 dark:text-gray-500" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-gray-900 dark:text-gray-100 truncate">{a.detail}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">{a.label}</p>
                  </div>
                  <span className="text-xs text-gray-400 dark:text-gray-400 shrink-0">
                    {a.created_at
                      ? new Date(a.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
                      : 'Now'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
