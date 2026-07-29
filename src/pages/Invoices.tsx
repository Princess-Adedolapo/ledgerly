import { useEffect, useState, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useDebounce } from '../hooks/useDebounce';
import { supabase, type Invoice, type Contact } from '../lib/supabase';
import { PageHeader, Card, Button, EmptyState } from '../components/ui';
import { FileText, Download, Plus, Clock, CheckCircle, AlertCircle, Share2, ShieldCheck, Trash2, Search, X, CreditCard } from 'lucide-react';
import { autoResolveWorkflowCardForCustomer } from '../services/workflowService';
import { initiatePaystackCheckout } from '../services/paystackService';
import { exportToCSV, formatDateForFilename } from '../utils/csvExport';
import { GenerateInvoiceModal, type InvoiceData } from '../components/invoices/GenerateInvoiceModal';
import { EditInvoiceModal, type InvoiceEditData } from '../components/invoices/EditInvoiceModal';
import { ShareInvoiceModal } from '../components/invoices/ShareInvoiceModal';
import { getInvoices, updateInvoiceDocumentType, setLocalInvoiceMeta, deleteInvoice } from '../services/invoiceService';
import { InvoiceInputSchema } from '../lib/validation';
import { useToast } from '../contexts/ToastContext';
import { useActivityLog } from '../contexts/ActivityLogContext';
import { useNotificationPreferences } from '../contexts/NotificationContext';
import { useUserPreferences } from '../lib/userPreferences';
import { useActiveWorkspaceId } from '../lib/workspace';
import { formatCurrency, getCurrencySymbol } from '../lib/currency';
import { convertCurrency, aggregateInCurrency } from '../lib/exchangeRates';
import { logCardActivity } from '../services/activityService';

export default function Invoices() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [sharingInvoice, setSharingInvoice] = useState<Invoice | null>(null);
  const [payingInvoiceId, setPayingInvoiceId] = useState<string | null>(null);
  const { addToast } = useToast();
  const { logActivity } = useActivityLog();
  const { preferences } = useNotificationPreferences();
  const { currencyCode, currencyDisplayMode, historicalCurrencyMode } = useUserPreferences();
  const workspaceId = useActiveWorkspaceId();

  const handlePayNow = async (inv: Invoice) => {
    setPayingInvoiceId(inv.id);
    try {
      const contact = contacts.find((c) => c.name?.toLowerCase().trim() === inv.customer_name?.toLowerCase().trim());
      await initiatePaystackCheckout({
        invoice: inv,
        customerEmail: contact?.email || inv.signer_email,
        customerName: inv.customer_name,
        onSuccess: (ref) => {
          setPayingInvoiceId(null);
          addToast('success', 'Payment Received!', `Invoice ${inv.invoice_number || inv.id.slice(0, 8)} paid online via Paystack! Ref: ${ref}`);
          load();
        },
        onClose: () => {
          setPayingInvoiceId(null);
        },
        onError: (err) => {
          setPayingInvoiceId(null);
          addToast('error', 'Payment Failed', err.message || 'Unable to complete Paystack payment.');
        },
      });
    } catch (err) {
      setPayingInvoiceId(null);
      addToast('error', 'Payment Error', err instanceof Error ? err.message : 'Checkout failed');
    }
  };

  const load = useCallback(async () => {
    if (!workspaceId) { setInvoices([]); setContacts([]); setLoading(false); return; }
    setLoading(true);
    try {
      const [invList, ctcts] = await Promise.all([
        getInvoices(),
        supabase.from('contacts').select('id, name, company').eq('workspace_id', workspaceId).order('name', { ascending: true }),
      ]);
      
      if (ctcts.error) throw new Error(ctcts.error.message);

      setInvoices(invList);
      setContacts((ctcts.data ?? []) as Contact[]);
    } catch (err) {
      console.error('Failed to load invoices:', err);
      const message = err instanceof Error ? err.message : String(err);
      const isFetchError = message.toLowerCase().includes('failed to fetch') || message.toLowerCase().includes('load');
      const friendlyMsg = isFetchError 
        ? 'Network error. Please check your internet connection or reload the page.' 
        : message || 'Could not load invoices.';
      addToast('error', 'Error Loading Invoices', friendlyMsg);
    } finally {
      setLoading(false);
    }
  }, [workspaceId, addToast]);

  useEffect(() => {
    load();
  }, [load]);

  const handleExport = () => {
    const data = invoices.map((inv) => ({
      'Invoice ID': inv.invoice_number ?? inv.id.slice(0, 8),
      'Customer Name': inv.customer_name ?? '',
      Amount: Number(inv.amount).toFixed(2),
      Status: inv.status,
      'Due Date': inv.due_date ?? '',
      'Date Created': inv.created_at ? new Date(inv.created_at).toISOString().split('T')[0] : '',
    }));
    exportToCSV(data, `invoices_export_${formatDateForFilename()}.csv`);
  };

  const handleSaveInvoice = async (data: InvoiceData) => {
    if (!workspaceId) throw new Error('No active workspace');

    // Run strict schema validation on incoming form data
    const validated = InvoiceInputSchema.parse({
      invoice_number: data.invoiceNumber,
      customer_name: data.customerName,
      customer_email: data.customerEmail || null,
      customer_phone: data.customerPhone || null,
      amount: data.total,
      currency_code: data.currencyCode,
      document_type: data.documentType || 'invoice',
      due_date: data.dueDate || null,
      notes: data.notes || null,
      tax_rate: data.taxRate || 0,
      discount_rate: data.discount || 0,
      line_items: data.lineItems || [],
    });

    // Get current user ID to explicitly pass it and satisfy Row Level Security
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const senderObj = data.senderInfo || {
      name: localStorage.getItem('invoice_sender_name') || 'Ledgerly Workspace',
      tagline: localStorage.getItem('invoice_sender_tagline') || '',
      address: localStorage.getItem('invoice_sender_address') || '',
      phone: localStorage.getItem('invoice_sender_phone') || '',
      email: localStorage.getItem('invoice_sender_email') || '',
      website: localStorage.getItem('invoice_sender_website') || '',
    };

    const metaObj = {
      document_type: validated.document_type,
      line_items: validated.line_items,
      sender_info: senderObj,
    };

    const metaComment = `<!--metadata:${JSON.stringify(metaObj)}-->`;
    const fullNotes = validated.notes ? `${validated.notes}\n\n${metaComment}` : metaComment;

    const basePayload = {
      amount: validated.amount,
      status: 'pending',
      customer_name: validated.customer_name,
      due_date: validated.due_date || null,
      notes: fullNotes,
      invoice_number: validated.invoice_number,
      workspace_id: workspaceId,
      currency_code: validated.currency_code,
      user_id: user.id, // Explicitly pass the authenticated user_id to satisfy RLS
      document_type: validated.document_type,
    };

    const { data: inserted, error } = await supabase.from('invoices').insert({
      ...basePayload,
      tax_rate: validated.tax_rate,
      discount: validated.discount_rate,
    }).select('*').single();

    let createdId = inserted?.id;

    if (error) {
      const isMissingColumnError = 
        error.code === '42703' || 
        error.message?.includes('discount') || 
        error.message?.includes('tax_rate') ||
        error.message?.includes('document_type') ||
        error.message?.includes('schema cache');

      if (isMissingColumnError) {
        console.warn('Database table "invoices" is missing columns. Retrying insert without optional columns.');
        
        const safePayload = { ...basePayload };
        delete (safePayload as Record<string, unknown>).document_type;

        const { data: retryData, error: retryError } = await supabase.from('invoices').insert({
          ...safePayload,
          notes: fullNotes,
        }).select('*').single();

        if (retryError) throw new Error(retryError.message);
        createdId = retryData?.id;
      } else {
        throw new Error(error.message);
      }
    }

    if (createdId) {
      setLocalInvoiceMeta(createdId, {
        document_type: data.documentType || 'invoice',
        line_items: data.lineItems,
        sender_info: senderObj,
      });

      // Save local copy for share link fallback
      try {
        const existingRaw = localStorage.getItem('ledgerly_created_invoices');
        const existingList = existingRaw ? JSON.parse(existingRaw) : [];
        const newRecord = {
          id: createdId,
          user_id: user.id,
          workspace_id: workspaceId,
          amount: data.total,
          status: 'pending',
          currency_code: data.currencyCode,
          created_at: new Date().toISOString(),
          customer_name: data.customerName,
          due_date: data.dueDate || null,
          notes: fullNotes,
          invoice_number: data.invoiceNumber,
          tax_rate: data.taxRate,
          discount: data.discount,
          total_label_override: null,
          document_type: data.documentType || 'invoice',
          sender_info: senderObj,
          line_items: data.lineItems,
        };
        localStorage.setItem('ledgerly_created_invoices', JSON.stringify([newRecord, ...existingList]));
      } catch (err) {
        console.error('Error saving local fallback invoice:', err);
      }
    }

    const contact = contacts.find((c) => c.name === data.customerName);
    logActivity('invoice', `Invoice #${data.invoiceNumber} created for ${data.customerName}`, contact?.id);
    await logCardActivity({
      contact_id: contact?.id ?? null,
      type: 'invoice_event',
      content: `Invoice #${data.invoiceNumber} created for ${data.customerName} (${data.currencyCode} ${data.total.toFixed(2)})`,
    });
    if (preferences.invoiceAlerts) {
      addToast('invoice', 'Invoice Generated', `Invoice #${data.invoiceNumber} created for ${data.customerName}`);
    }
    setModalOpen(false);
    await load();
  };

  const handleEditInvoice = async (id: string, data: InvoiceEditData) => {
    // Map 'approved' to 'paid' in DB payload to respect DB check constraint
    const dbStatus = data.status === 'approved' ? 'paid' : data.status;
    const basePayload = {
      amount: data.amount,
      status: dbStatus,
      due_date: data.dueDate || null,
      total_label_override: data.totalLabelOverride || null,
      currency_code: data.currencyCode,
    };

    setLocalInvoiceMeta(id, { status: data.status });

    const { error } = await supabase
      .from('invoices')
      .update({
        ...basePayload,
        tax_rate: data.taxRate,
        discount: data.discount,
      })
      .eq('id', id);

    if (error) {
      const isMissingColumnError = 
        error.code === '42703' || 
        error.message?.includes('discount') || 
        error.message?.includes('tax_rate') ||
        error.message?.includes('schema cache');

      if (isMissingColumnError) {
        console.warn('Database table "invoices" is missing tax_rate or discount columns. Retrying update without them.');
        
        const { error: retryError } = await supabase
          .from('invoices')
          .update(basePayload)
          .eq('id', id);

        if (retryError) throw new Error(retryError.message);
      } else {
        throw new Error(error.message);
      }
    }

    if ((data.status === 'paid' || data.status === 'approved') && editingInvoice?.customer_name) {
      const resolved = await autoResolveWorkflowCardForCustomer(editingInvoice.customer_name);
      if (resolved) {
        addToast('workflow', 'Workflow Resolved', `Linked workflow card for ${editingInvoice.customer_name} auto-moved to Resolved/Completed.`);
      }
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('invoice-updated'));
      window.dispatchEvent(new CustomEvent('workflow-card-updated'));
    }

    logActivity('invoice', `Invoice updated`);
    addToast('invoice', 'Invoice Updated', 'Changes saved.');
    await load();
  };

  const handleStatusChange = async (inv: Invoice, newStatus: 'pending' | 'paid' | 'overdue' | 'approved') => {
    if (inv.status === newStatus) return;

    // Supabase check constraint allows 'pending', 'paid', 'overdue', 'cancelled', 'draft'
    const dbStatus = newStatus === 'approved' ? 'paid' : newStatus;

    let { error } = await supabase.from('invoices').update({ status: dbStatus }).eq('id', inv.id);

    if (error && (error.message?.includes('invoices_status_check') || error.code === '23514')) {
      // Fall back to 'paid' in DB if check constraint fails
      const retry = await supabase.from('invoices').update({ status: 'paid' }).eq('id', inv.id);
      error = retry.error;
    }

    if (error) {
      addToast('error', 'Update Failed', error.message);
      return;
    }

    // Persist status in local metadata & local storage cache
    setLocalInvoiceMeta(inv.id, { status: newStatus });
    try {
      const raw = localStorage.getItem('ledgerly_created_invoices');
      if (raw) {
        const list: Invoice[] = JSON.parse(raw);
        if (Array.isArray(list)) {
          const updatedList = list.map((item) =>
            item.id === inv.id ? { ...item, status: newStatus as 'pending' | 'paid' | 'overdue' | 'approved' } : item
          );
          localStorage.setItem('ledgerly_created_invoices', JSON.stringify(updatedList));
        }
      }
    } catch (err) {
      console.warn('Failed updating local invoice cache:', err);
    }

    logActivity('status', `Invoice #${inv.invoice_number ?? inv.id.slice(0, 8)} marked as ${newStatus}`);
    const contact = contacts.find((c) => c.name === inv.customer_name);
    await logCardActivity({
      contact_id: contact?.id ?? null,
      type: 'invoice_event',
      content: `Invoice #${inv.invoice_number ?? inv.id.slice(0, 8)} marked ${newStatus.toUpperCase()}`,
    });

    if (preferences.invoiceAlerts) {
      addToast('invoice', 'Invoice Status Updated', `Invoice #${inv.invoice_number ?? inv.id.slice(0, 8)} marked as ${newStatus}`);
    }

    if ((newStatus === 'paid' || newStatus === 'approved') && inv.customer_name) {
      const resolved = await autoResolveWorkflowCardForCustomer(inv.customer_name);
      if (resolved) {
        addToast('workflow', 'Workflow Card Resolved', `Linked workflow card for ${inv.customer_name} moved to Resolved/Completed.`);
      }
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('invoice-updated'));
      window.dispatchEvent(new CustomEvent('workflow-card-updated'));
    }

    await load();
  };

  const handleDeleteInvoice = async (inv: Invoice) => {
    const docLabel = (inv.document_type || 'invoice') === 'proposal' ? 'proposal' : (inv.document_type || 'invoice') === 'quote' ? 'quote' : 'invoice';
    const numStr = inv.invoice_number || inv.id.slice(0, 8);
    if (!window.confirm(`Are you sure you want to delete this ${docLabel} (#${numStr})? This action cannot be undone.`)) {
      return;
    }

    try {
      await deleteInvoice(inv.id);
      logActivity('invoice', `Deleted ${docLabel} #${numStr}`);
      addToast('invoice', `${docLabel.charAt(0).toUpperCase() + docLabel.slice(1)} Deleted`, `Document #${numStr} was deleted successfully.`);
      if (editingInvoice?.id === inv.id) {
        setEditingInvoice(null);
      }
      await load();
    } catch (err) {
      console.error('Failed to delete invoice:', err);
      addToast('error', 'Delete Failed', err instanceof Error ? err.message : 'Could not delete document.');
    }
  };

  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 250);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'paid' | 'overdue' | 'approved'>('all');

  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      if (statusFilter !== 'all' && inv.status !== statusFilter) {
        return false;
      }

      if (!debouncedSearchQuery.trim()) return true;

      const q = debouncedSearchQuery.toLowerCase().trim();
      const invNum = (inv.invoice_number ?? inv.id.slice(0, 8)).toLowerCase();
      const customer = (inv.customer_name ?? '').toLowerCase();
      const status = (inv.status ?? '').toLowerCase();
      const docType = (inv.document_type ?? 'invoice').toLowerCase();
      const notes = (inv.notes ?? '').toLowerCase();
      const amountStr = String(inv.amount);

      return (
        invNum.includes(q) ||
        customer.includes(q) ||
        status.includes(q) ||
        docType.includes(q) ||
        amountStr.includes(q) ||
        notes.includes(q)
      );
    });
  }, [invoices, debouncedSearchQuery, statusFilter]);

  const stats = {
    total: invoices.length,
    paid: invoices.filter((i) => i.status === 'paid').length,
    pending: invoices.filter((i) => i.status === 'pending').length,
    overdue: invoices.filter((i) => i.status === 'overdue').length,
    totalAmount: aggregateInCurrency(invoices, currencyCode, 'amount'),
  };

  if (loading) {
    return (
      <div className="p-6 md:p-8 max-w-7xl mx-auto">
        <PageHeader title="Invoices" subtitle="Loading..." />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-gray-100 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-800 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <PageHeader
        title="Invoices"
        subtitle={`${stats.total} ${stats.total === 1 ? 'invoice' : 'invoices'} in your ledger`}
        action={
          <div className="flex gap-2">
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-violet-500/30 text-violet-600 dark:text-violet-400 hover:bg-violet-500/10 transition-all"
            >
              <Download className="w-4 h-4" /> Export Ledger
            </button>
            <Button onClick={() => setModalOpen(true)}>
              <span className="flex items-center gap-2"><Plus className="w-4 h-4" /> Generate Invoice</span>
            </Button>
          </div>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-violet-500/10 flex items-center justify-center">
              <span className="text-lg font-bold text-violet-500">{getCurrencySymbol(currencyCode, currencyDisplayMode).trim()}</span>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{formatCurrency(stats.totalAmount, currencyCode, currencyDisplayMode)}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Total Billed</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.paid}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Paid</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.pending}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Pending</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.overdue}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Overdue</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Search and Filters Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 mb-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by client name, invoice #, status..."
            className="w-full pl-10 pr-9 py-2 text-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-all shadow-sm"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-0.5 rounded-full"
              title="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400 hidden sm:inline">Status:</span>
          {(['all', 'pending', 'paid', 'overdue', 'approved'] as const).map((st) => {
            const count = st === 'all' ? invoices.length : invoices.filter((i) => i.status === st).length;
            return (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all whitespace-nowrap flex items-center gap-1.5 ${
                  statusFilter === st
                    ? 'bg-violet-600 text-white shadow-sm'
                    : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                <span>{st}</span>
                <span
                  className={`px-1.5 py-0.2 text-[10px] rounded-full ${
                    statusFilter === st
                      ? 'bg-white/20 text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Invoice table */}
      {invoices.length === 0 ? (
        <Card className="p-0">
          <EmptyState icon={FileText} title="No invoices yet" subtitle="Click 'Generate Invoice' to create your first invoice" />
        </Card>
      ) : filteredInvoices.length === 0 ? (
        <Card className="p-8 text-center">
          <div className="w-12 h-12 rounded-full bg-violet-50 dark:bg-violet-950/50 flex items-center justify-center mx-auto mb-3 text-violet-600 dark:text-violet-400">
            <Search className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-1">No invoices found</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mx-auto mb-4">
            No invoices match "{searchQuery}"{statusFilter !== 'all' ? ` in status "${statusFilter}"` : ''}.
          </p>
          <Button
            variant="outline"
            onClick={() => {
              setSearchQuery('');
              setStatusFilter('all');
            }}
          >
            Clear Filters
          </Button>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-800/80 bg-gray-50/50 dark:bg-gray-900/40 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 font-medium">
            <span>
              Showing <strong className="text-gray-900 dark:text-gray-100">{filteredInvoices.length}</strong> of{' '}
              <strong className="text-gray-900 dark:text-gray-100">{invoices.length}</strong> {invoices.length === 1 ? 'invoice' : 'invoices'}
            </span>
            {(searchQuery || statusFilter !== 'all') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('all');
                }}
                className="text-violet-600 dark:text-violet-400 hover:underline font-semibold"
              >
                Reset search
              </button>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-800">
                  <th className="text-left text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider px-5 py-3">Document / ID</th>
                  <th className="text-left text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider px-5 py-3">Customer</th>
                  <th className="text-left text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider px-5 py-3">Amount</th>
                  <th className="text-left text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider px-5 py-3">Status</th>
                  <th className="text-left text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider px-5 py-3">Due Date</th>
                  <th className="text-left text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider px-5 py-3">Created</th>
                  <th className="text-right text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider px-5 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.map((inv) => (
                  <tr
                    key={inv.id}
                    onClick={() => setEditingInvoice(inv)}
                    className="border-b border-gray-100 dark:border-gray-800/50 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors cursor-pointer"
                  >
                    <td className="px-5 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1.5 font-bold">
                          <span>{inv.invoice_number ?? inv.id.slice(0, 8)}</span>
                          {inv.signer_name && (
                            <span className="inline-flex items-center gap-0.5 text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold px-1.5 py-0.2 rounded-full">
                              <ShieldCheck className="w-3 h-3" /> Signed
                            </span>
                          )}
                        </div>
                        {inv.document_type && inv.document_type !== 'invoice' && (
                          <span className="text-[10px] text-violet-600 dark:text-violet-400 font-semibold uppercase tracking-wider">
                            {inv.document_type}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-500 dark:text-gray-400">
                      {(() => {
                        const matchedContact = contacts.find((c) => c.name?.toLowerCase().trim() === inv.customer_name?.toLowerCase().trim());
                        if (matchedContact) {
                          return (
                            <Link
                              to={`/contacts/${matchedContact.id}`}
                              onClick={(e) => e.stopPropagation()}
                              className="font-medium text-violet-600 dark:text-violet-400 hover:underline flex items-center gap-1"
                            >
                              {inv.customer_name}
                            </Link>
                          );
                        }
                        return inv.customer_name ?? '—';
                      })()}
                    </td>
                    <td className="px-5 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">
                      {(() => {
                        const originalCurrency = inv.currency_code || 'USD';
                        const isConverted = historicalCurrencyMode === 'converted';
                        
                        if (isConverted) {
                          const convertedVal = convertCurrency(Number(inv.amount), originalCurrency, currencyCode);
                          return (
                            <div className="flex flex-col">
                              <span>{formatCurrency(convertedVal, currencyCode, currencyDisplayMode)}</span>
                              {originalCurrency !== currencyCode && (
                                <span className="text-[10px] text-gray-400 dark:text-gray-500 font-normal mt-0.5">
                                  Original: {formatCurrency(Number(inv.amount), originalCurrency, currencyDisplayMode)}
                                </span>
                              )}
                            </div>
                          );
                        } else {
                          const convertedVal = convertCurrency(Number(inv.amount), originalCurrency, currencyCode);
                          return (
                            <div className="flex flex-col">
                              <span>{formatCurrency(Number(inv.amount), originalCurrency, currencyDisplayMode)}</span>
                              {originalCurrency !== currencyCode && (
                                <span className="text-[10px] text-gray-400 dark:text-gray-500 font-normal mt-0.5">
                                  ~{formatCurrency(convertedVal, currencyCode, currencyDisplayMode)}
                                </span>
                              )}
                            </div>
                          );
                        }
                      })()}
                    </td>
                    <td className="px-5 py-3" onClick={(e) => e.stopPropagation()}>
                      <select
                        value={inv.status}
                        onChange={(e) => handleStatusChange(inv, e.target.value as 'pending' | 'paid' | 'overdue' | 'approved')}
                        className="text-xs px-2 py-1 rounded-full border-0 bg-transparent text-gray-900 dark:text-gray-100 cursor-pointer focus:outline-none focus:ring-1 focus:ring-violet-500/50"
                      >
                        <option value="pending">Pending</option>
                        <option value="paid">Paid</option>
                        <option value="overdue">Overdue</option>
                        <option value="approved">Approved</option>
                      </select>
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-500 dark:text-gray-400">{inv.due_date ? new Date(inv.due_date).toLocaleDateString() : '—'}</td>
                    <td className="px-5 py-3 text-sm text-gray-500 dark:text-gray-400">{new Date(inv.created_at).toLocaleDateString()}</td>
                    <td className="px-5 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        {inv.status !== 'paid' && (
                          <button
                            onClick={() => handlePayNow(inv)}
                            disabled={payingInvoiceId === inv.id}
                            title="Pay Online via Paystack Popup"
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-white shadow-xs transition-all disabled:opacity-50"
                          >
                            <CreditCard className="w-3.5 h-3.5" />
                            {payingInvoiceId === inv.id ? 'Loading...' : 'Pay Now'}
                          </button>
                        )}
                        <button
                          onClick={() => setSharingInvoice(inv)}
                          title="Share Client Portal Link"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400 hover:bg-violet-100 dark:hover:bg-violet-900/50 border border-violet-200 dark:border-violet-800/60 transition-all shadow-sm"
                        >
                          <Share2 className="w-3.5 h-3.5" /> Share
                        </button>
                        <button
                          onClick={() => handleDeleteInvoice(inv)}
                          title="Delete Invoice"
                          aria-label="Delete Invoice"
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <GenerateInvoiceModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        contacts={contacts}
        onSave={handleSaveInvoice}
      />
      <EditInvoiceModal
        open={editingInvoice !== null}
        invoice={editingInvoice}
        onClose={() => setEditingInvoice(null)}
        onSave={handleEditInvoice}
        onDelete={handleDeleteInvoice}
      />
      <ShareInvoiceModal
        open={sharingInvoice !== null}
        invoice={sharingInvoice}
        onClose={() => setSharingInvoice(null)}
        onDocumentTypeChange={async (id, type) => {
          await updateInvoiceDocumentType(id, type);
          if (sharingInvoice) {
            setSharingInvoice({ ...sharingInvoice, document_type: type });
          }
          await load();
        }}
      />

    </div>
  );
}
