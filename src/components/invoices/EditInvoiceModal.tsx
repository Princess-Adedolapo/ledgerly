import { useEffect, useState } from 'react';
import { X, Percent, Gift, CreditCard } from 'lucide-react';
import type { Invoice } from '../../lib/supabase';
import { Button } from '../ui';
import { useUserPreferences } from '../../lib/userPreferences';
import { formatCurrency } from '../../lib/currency';
import { getErrorMessage } from '../../lib/errorUtils';
import { initiatePaystackCheckout } from '../../services/paystackService';
import { useToast } from '../../contexts/ToastContext';

export interface InvoiceEditData {
  amount: number;
  taxRate: number;
  discount: number;
  status: 'pending' | 'paid' | 'overdue' | 'approved';
  dueDate: string;
  totalLabelOverride: 'due' | 'paid' | '';
  currencyCode: string;
}

export function EditInvoiceModal({
  open,
  invoice,
  onClose,
  onSave,
  onDelete,
}: {
  open: boolean;
  invoice: Invoice | null;
  onClose: () => void;
  onSave: (id: string, data: InvoiceEditData) => Promise<void>;
  onDelete?: (invoice: Invoice) => Promise<void>;
}) {
  const { currencyDisplayMode } = useUserPreferences();
  const [invoiceCurrency, setInvoiceCurrency] = useState<string>('USD');
  const fmt = (v: number) => formatCurrency(v, invoiceCurrency, currencyDisplayMode, 2);

  const [amount, setAmount] = useState<number | string>(0);
  const [taxRate, setTaxRate] = useState<number | string>(0);
  const [discount, setDiscount] = useState<number | string>(0);
  const [status, setStatus] = useState<'pending' | 'paid' | 'overdue' | 'approved'>('pending');
  const [dueDate, setDueDate] = useState('');
  const [totalLabelOverride, setTotalLabelOverride] = useState<'due' | 'paid' | ''>('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { addToast } = useToast();

  const handlePayNow = async () => {
    if (!invoice) return;
    setPaying(true);
    setError(null);
    try {
      await initiatePaystackCheckout({
        invoice,
        customerName: invoice.customer_name,
        onSuccess: (ref) => {
          setPaying(false);
          addToast('success', 'Payment Received', `Invoice paid online via Paystack! Reference: ${ref}`);
          onClose();
        },
        onClose: () => {
          setPaying(false);
        },
        onError: (err) => {
          setPaying(false);
          setError(err.message || 'Paystack payment failed.');
        },
      });
    } catch (err) {
      setPaying(false);
      setError(getErrorMessage(err, 'Payment error.'));
    }
  };

  useEffect(() => {
    if (!invoice) return;
    setAmount(Number(invoice.amount) || 0);
    setTaxRate(Number(invoice.tax_rate) || 0);
    setDiscount(Number(invoice.discount) || 0);
    setStatus((invoice.status as 'pending' | 'paid' | 'overdue' | 'approved') || 'pending');
    setDueDate(invoice.due_date ?? '');
    setTotalLabelOverride(invoice.total_label_override ?? '');
    setInvoiceCurrency(invoice.currency_code ?? 'USD');
    setError(null);
  }, [invoice]);

  useEffect(() => {
    if (!open) return;
    const onEsc = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onEsc);
    return () => document.removeEventListener('keydown', onEsc);
  }, [open, onClose]);

  if (!open || !invoice) return null;

  const numAmount = typeof amount === 'number' ? amount : parseFloat(amount) || 0;
  const numTax = typeof taxRate === 'number' ? taxRate : parseFloat(taxRate) || 0;
  const numDiscount = typeof discount === 'number' ? discount : parseFloat(discount) || 0;

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await onSave(invoice.id, {
        amount: numAmount,
        taxRate: numTax,
        discount: numDiscount,
        status,
        dueDate,
        totalLabelOverride,
        currencyCode: invoiceCurrency,
      });
      onClose();
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to update invoice. Please try again.'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete || !invoice) return;
    setDeleting(true);
    setError(null);
    try {
      await onDelete(invoice);
      onClose();
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to delete invoice. Please try again.'));
    } finally {
      setDeleting(false);
    }
  };

  const inputBase =
    'w-full px-3 py-2 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Edit Invoice</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {invoice.invoice_number ?? invoice.id.slice(0, 8)} · {invoice.customer_name ?? '—'}
            </p>
          </div>
          <button onClick={onClose} aria-label="Close" className="text-gray-400 hover:text-gray-900 dark:hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Amount</label>
              <input
                type="number"
                value={amount}
                min={0}
                step="0.01"
                onChange={(e) => setAmount(e.target.value)}
                onFocus={(e) => e.target.select()}
                className={inputBase}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Currency</label>
              <select
                value={invoiceCurrency}
                onChange={(e) => setInvoiceCurrency(e.target.value)}
                className={inputBase}
              >
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
                <option value="NGN">NGN (₦)</option>
              </select>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-1">Displayed: {fmt(numAmount)}</p>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                <span className="inline-flex items-center gap-1.5"><Percent className="w-3.5 h-3.5" /> Tax Rate (%)</span>
              </label>
              <input
                type="number"
                value={taxRate}
                min={0}
                step="0.1"
                onChange={(e) => setTaxRate(e.target.value)}
                onFocus={(e) => e.target.select()}
                className={inputBase}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                <span className="inline-flex items-center gap-1.5"><Gift className="w-3.5 h-3.5" /> Discount</span>
              </label>
              <input
                type="number"
                value={discount}
                min={0}
                step="0.01"
                onChange={(e) => setDiscount(e.target.value)}
                onFocus={(e) => e.target.select()}
                className={inputBase}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as 'pending' | 'paid' | 'overdue' | 'approved')}
              className={inputBase}
            >
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
              <option value="overdue">Overdue</option>
              <option value="approved">Approved</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Due Date</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className={inputBase}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Total label</label>
            <select
              value={totalLabelOverride}
              onChange={(e) => setTotalLabelOverride(e.target.value as 'due' | 'paid' | '')}
              className={inputBase}
            >
              <option value="">Automatic (based on status)</option>
              <option value="due">Force "Total Due"</option>
              <option value="paid">Force "Total Paid"</option>
            </select>
            <p className="text-xs text-gray-400 mt-1">Controls the label shown on the invoice PDF.</p>
          </div>

          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        </div>

        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-800 flex items-center justify-between">
          <div>
            {onDelete && (
              <Button
                type="button"
                variant="danger"
                onClick={handleDelete}
                disabled={deleting || saving}
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            {invoice.status !== 'paid' && (
              <button
                type="button"
                onClick={handlePayNow}
                disabled={paying || saving || deleting}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow transition-all flex items-center gap-1.5 disabled:opacity-50"
              >
                <CreditCard className="w-3.5 h-3.5" />
                {paying ? 'Loading...' : 'Pay Online'}
              </button>
            )}
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || deleting || paying}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
