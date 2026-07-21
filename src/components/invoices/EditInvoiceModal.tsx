import { useEffect, useState } from 'react';
import { X, Percent, Gift } from 'lucide-react';
import type { Invoice } from '../../lib/supabase';
import { Button } from '../ui';
import { useUserPreferences } from '../../lib/userPreferences';
import { formatCurrency } from '../../lib/currency';

export interface InvoiceEditData {
  amount: number;
  taxRate: number;
  discount: number;
  status: 'pending' | 'paid' | 'overdue';
  dueDate: string;
  totalLabelOverride: 'due' | 'paid' | '';
  currencyCode: string;
}

export function EditInvoiceModal({
  open,
  invoice,
  onClose,
  onSave,
}: {
  open: boolean;
  invoice: Invoice | null;
  onClose: () => void;
  onSave: (id: string, data: InvoiceEditData) => Promise<void>;
}) {
  const { currencyDisplayMode } = useUserPreferences();
  const [invoiceCurrency, setInvoiceCurrency] = useState<string>('USD');
  const fmt = (v: number) => formatCurrency(v, invoiceCurrency, currencyDisplayMode, 2);

  const [amount, setAmount] = useState(0);
  const [taxRate, setTaxRate] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [status, setStatus] = useState<'pending' | 'paid' | 'overdue'>('pending');
  const [dueDate, setDueDate] = useState('');
  const [totalLabelOverride, setTotalLabelOverride] = useState<'due' | 'paid' | ''>('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!invoice) return;
    setAmount(Number(invoice.amount) || 0);
    setTaxRate(Number(invoice.tax_rate) || 0);
    setDiscount(Number(invoice.discount) || 0);
    setStatus(invoice.status);
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

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await onSave(invoice.id, { amount, taxRate, discount, status, dueDate, totalLabelOverride, currencyCode: invoiceCurrency });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update invoice');
    } finally {
      setSaving(false);
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
                onChange={(e) => setAmount(Number(e.target.value))}
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
          <p className="text-xs text-gray-400 mt-1">Displayed: {fmt(amount)}</p>

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
                onChange={(e) => setTaxRate(Number(e.target.value))}
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
                onChange={(e) => setDiscount(Number(e.target.value))}
                className={inputBase}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as 'pending' | 'paid' | 'overdue')}
              className={inputBase}
            >
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
              <option value="overdue">Overdue</option>
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

        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-800 flex gap-3 justify-end">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </div>
  );
}
