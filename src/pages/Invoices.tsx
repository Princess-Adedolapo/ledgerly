import { useEffect, useState, useCallback } from 'react';
import { supabase, type Invoice, type Contact } from '../lib/supabase';
import { PageHeader, Card, Button, EmptyState, StatusBadge } from '../components/ui';
import { FileText, Download, Plus, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { exportToCSV, formatDateForFilename } from '../utils/csvExport';
import { GenerateInvoiceModal, type InvoiceData } from '../components/invoices/GenerateInvoiceModal';
import { EditInvoiceModal, type InvoiceEditData } from '../components/invoices/EditInvoiceModal';
import { useToast } from '../contexts/ToastContext';
import { useActivityLog } from '../contexts/ActivityLogContext';
import { useNotificationPreferences } from '../contexts/NotificationContext';
import { useUserPreferences } from '../lib/userPreferences';
import { useActiveWorkspaceId } from '../lib/workspace';
import { formatCurrency, getCurrencySymbol } from '../lib/currency';
import { convertCurrency, aggregateInCurrency } from '../lib/exchangeRates';

export default function Invoices() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const { addToast } = useToast();
  const { logActivity } = useActivityLog();
  const { preferences } = useNotificationPreferences();
  const { currencyCode, currencyDisplayMode, historicalCurrencyMode } = useUserPreferences();
  const workspaceId = useActiveWorkspaceId();

  const load = useCallback(async () => {
    if (!workspaceId) { setInvoices([]); setContacts([]); setLoading(false); return; }
    const [inv, ctcts] = await Promise.all([
      supabase.from('invoices').select('*').eq('workspace_id', workspaceId).order('created_at', { ascending: false }),
      supabase.from('contacts').select('id, name, company').eq('workspace_id', workspaceId).order('name', { ascending: true }),
    ]);
    setInvoices((inv.data ?? []) as Invoice[]);
    setContacts((ctcts.data ?? []) as Contact[]);
    setLoading(false);
  }, [workspaceId]);

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

    // Get current user ID to explicitly pass it and satisfy Row Level Security
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const basePayload = {
      amount: data.total,
      status: 'pending',
      customer_name: data.customerName,
      due_date: data.dueDate || null,
      notes: data.notes || null,
      invoice_number: data.invoiceNumber,
      workspace_id: workspaceId,
      currency_code: data.currencyCode,
      user_id: user.id, // Explicitly pass the authenticated user_id to satisfy RLS
    };

    const { error } = await supabase.from('invoices').insert({
      ...basePayload,
      tax_rate: data.taxRate,
      discount: data.discount,
    });

    if (error) {
      const isMissingColumnError = 
        error.code === '42703' || 
        error.message?.includes('discount') || 
        error.message?.includes('tax_rate') ||
        error.message?.includes('schema cache');

      if (isMissingColumnError) {
        console.warn('Database table "invoices" is missing tax_rate or discount columns. Retrying insert without them.');
        
        let enhancedNotes = data.notes || '';
        const taxDetails = `[Tax Rate: ${data.taxRate}%, Discount: ${data.discount}]`;
        if (enhancedNotes) {
          enhancedNotes = `${enhancedNotes}\n\n${taxDetails}`;
        } else {
          enhancedNotes = taxDetails;
        }

        const { error: retryError } = await supabase.from('invoices').insert({
          ...basePayload,
          notes: enhancedNotes,
        });

        if (retryError) throw new Error(retryError.message);
      } else {
        throw new Error(error.message);
      }
    }

    const contact = contacts.find((c) => c.name === data.customerName);
    logActivity('invoice', `Invoice #${data.invoiceNumber} created for ${data.customerName}`, contact?.id);
    if (preferences.invoiceAlerts) {
      addToast('invoice', 'Invoice Generated', `Invoice #${data.invoiceNumber} created for ${data.customerName}`);
    }
    setModalOpen(false);
    await load();
  };

  const handleEditInvoice = async (id: string, data: InvoiceEditData) => {
    const basePayload = {
      amount: data.amount,
      status: data.status,
      due_date: data.dueDate || null,
      total_label_override: data.totalLabelOverride || null,
      currency_code: data.currencyCode,
    };

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

    logActivity('invoice', `Invoice updated`);
    addToast('invoice', 'Invoice Updated', 'Changes saved.');
    await load();
  };


  const handleStatusChange = async (inv: Invoice, newStatus: 'pending' | 'paid' | 'overdue') => {
    if (inv.status === newStatus) return;
    const { error } = await supabase.from('invoices').update({ status: newStatus }).eq('id', inv.id);
    if (error) {
      addToast('error', 'Update Failed', error.message);
      return;
    }
    logActivity('status', `Invoice #${inv.invoice_number ?? inv.id.slice(0, 8)} marked as ${newStatus}`);
    if (preferences.invoiceAlerts) {
      addToast('invoice', 'Invoice Status Updated', `Invoice #${inv.invoice_number ?? inv.id.slice(0, 8)} marked as ${newStatus}`);
    }
    await load();
  };

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

      {/* Invoice table */}
      {invoices.length === 0 ? (
        <Card className="p-0">
          <EmptyState icon={FileText} title="No invoices yet" subtitle="Click 'Generate Invoice' to create your first invoice" />
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-800">
                  <th className="text-left text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider px-5 py-3">Invoice ID</th>
                  <th className="text-left text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider px-5 py-3">Customer</th>
                  <th className="text-left text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider px-5 py-3">Amount</th>
                  <th className="text-left text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider px-5 py-3">Status</th>
                  <th className="text-left text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider px-5 py-3">Due Date</th>
                  <th className="text-left text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider px-5 py-3">Created</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr
                    key={inv.id}
                    onClick={() => setEditingInvoice(inv)}
                    className="border-b border-gray-100 dark:border-gray-800/50 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors cursor-pointer"
                  >
                    <td className="px-5 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">{inv.invoice_number ?? inv.id.slice(0, 8)}</td>
                    <td className="px-5 py-3 text-sm text-gray-500 dark:text-gray-400">{inv.customer_name ?? '—'}</td>
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
                        onChange={(e) => handleStatusChange(inv, e.target.value as 'pending' | 'paid' | 'overdue')}
                        className="text-xs px-2 py-1 rounded-full border-0 bg-transparent text-gray-900 dark:text-gray-100 cursor-pointer focus:outline-none focus:ring-1 focus:ring-violet-500/50"
                      >
                        <option value="pending">Pending</option>
                        <option value="paid">Paid</option>
                        <option value="overdue">Overdue</option>
                      </select>
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-500 dark:text-gray-400">{inv.due_date ? new Date(inv.due_date).toLocaleDateString() : '—'}</td>
                    <td className="px-5 py-3 text-sm text-gray-500 dark:text-gray-400">{new Date(inv.created_at).toLocaleDateString()}</td>
                    <td className="px-5 py-3"><StatusBadge status={inv.status} /></td>
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
      />

    </div>
  );
}
