import { useState, useRef, useEffect } from 'react';
import { X, Plus, Trash2, Download, Percent, Gift, Building2, Mail, Phone, Globe, MapPin } from 'lucide-react';
import type { Contact } from '../../lib/supabase';
import { Button } from '../ui';
import { useWorkspace } from '../../lib/workspace';
import { useUserPreferences } from '../../lib/userPreferences';
import { formatCurrency } from '../../lib/currency';

export interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
}

export interface InvoiceData {
  invoiceNumber: string;
  customerName: string;
  lineItems: LineItem[];
  dueDate: string;
  notes: string;
  subtotal: number;
  tax: number;
  taxRate: number;
  discount: number;
  total: number;
  currencyCode: string;
}

function generateInvoiceNumber(): string {
  return `INV-${Date.now()}`;
}

let lineItemIdCounter = 0;
function makeLineItem(): LineItem {
  return { id: `li-${++lineItemIdCounter}`, description: '', quantity: 1, unitPrice: 0 };
}

export function GenerateInvoiceModal({
  open,
  onClose,
  contacts,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  contacts: Contact[];
  onSave: (data: InvoiceData) => Promise<void>;
}) {
  const { businessName, businessTagline } = useWorkspace();
  const { currencyCode, currencyDisplayMode } = useUserPreferences();
  const [invoiceCurrency, setInvoiceCurrency] = useState<string>(currencyCode);

  const [senderName, setSenderName] = useState(() => localStorage.getItem('invoice_sender_name') || '');
  const [senderTagline, setSenderTagline] = useState(() => localStorage.getItem('invoice_sender_tagline') || '');
  const [senderAddress, setSenderAddress] = useState(() => localStorage.getItem('invoice_sender_address') || '');
  const [senderPhone, setSenderPhone] = useState(() => localStorage.getItem('invoice_sender_phone') || '');
  const [senderEmail, setSenderEmail] = useState(() => localStorage.getItem('invoice_sender_email') || '');
  const [senderWebsite, setSenderWebsite] = useState(() => localStorage.getItem('invoice_sender_website') || '');

  useEffect(() => {
    if (open) {
      setInvoiceCurrency(currencyCode);
      if (!localStorage.getItem('invoice_sender_name') && businessName) {
        setSenderName(businessName);
      }
      if (!localStorage.getItem('invoice_sender_tagline') && businessTagline) {
        setSenderTagline(businessTagline);
      }
    }
  }, [open, currencyCode, businessName, businessTagline]);

  const fmt = (v: number) => formatCurrency(v, invoiceCurrency, currencyDisplayMode, 2);
  const [invoiceNumber] = useState(generateInvoiceNumber());
  const [customerName, setCustomerName] = useState('');
  const [lineItems, setLineItems] = useState<LineItem[]>([makeLineItem()]);
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [taxRate, setTaxRate] = useState<number>(10);
  const [discount, setDiscount] = useState<number>(0);
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [open, onClose]);

  if (!open) return null;

  const subtotal = lineItems.reduce((sum, li) => sum + li.quantity * li.unitPrice, 0);
  const safeTaxRate = Number.isFinite(taxRate) ? Math.max(0, taxRate) : 0;
  const safeDiscount = Number.isFinite(discount) ? Math.max(0, Math.min(discount, subtotal)) : 0;
  const taxableBase = Math.max(0, subtotal - safeDiscount);
  const tax = taxableBase * (safeTaxRate / 100);
  const total = taxableBase + tax;

  const updateLineItem = (id: string, field: keyof LineItem, value: string | number) => {
    setLineItems((prev) =>
      prev.map((li) =>
        li.id === id
          ? { ...li, [field]: field === 'description' ? (value as string) : Number(value) }
          : li
      )
    );
  };

  const addLineItem = () => setLineItems((prev) => [...prev, makeLineItem()]);
  const removeLineItem = (id: string) => setLineItems((prev) => prev.filter((li) => li.id !== id));

  const handleSave = async () => {
    if (!customerName.trim()) {
      setError('Customer name is required');
      return;
    }
    if (lineItems.length === 0 || lineItems.every((li) => !li.description.trim())) {
      setError('At least one line item with a description is required');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave({
        invoiceNumber,
        customerName: customerName.trim(),
        lineItems: lineItems.filter((li) => li.description.trim()),
        dueDate,
        notes: notes.trim(),
        subtotal,
        tax,
        taxRate: safeTaxRate,
        discount: safeDiscount,
        total,
        currencyCode: invoiceCurrency,
      });
      // Reset form
      setCustomerName('');
      setLineItems([makeLineItem()]);
      setDueDate('');
      setNotes('');
      setDiscount(0);
      setTaxRate(10);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save invoice');
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!previewRef.current) return;
    setDownloading(true);
    try {
      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF } = await import('jspdf');

      const canvas = await html2canvas(previewRef.current, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
        logging: false,
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`invoice_${invoiceNumber}.pdf`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate PDF');
    } finally {
      setDownloading(false);
    }
  };

  const inputBase =
    'w-full px-3 py-2 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-5xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl max-h-[92vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800 shrink-0">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Generate Invoice</h2>
          <button onClick={onClose} aria-label="Close modal" className="text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body: two panels */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left panel: Form */}
            <div className="space-y-4">
              {/* Sender Details (User-customizable) */}
              <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                    <h3 className="text-xs font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wider">Sender / Company Details</h3>
                  </div>
                  <span className="text-[9px] uppercase tracking-wider bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 font-bold px-2 py-0.5 rounded-full">Saved</span>
                </div>
                
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-gray-500 dark:text-gray-400 mb-1 font-medium">Business Name</label>
                    <input
                      type="text"
                      value={senderName}
                      onChange={(e) => {
                        setSenderName(e.target.value);
                        localStorage.setItem('invoice_sender_name', e.target.value);
                      }}
                      className="w-full px-2.5 py-1.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-violet-500"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-500 dark:text-gray-400 mb-1 font-medium">Tagline / Subtitle</label>
                    <input
                      type="text"
                      value={senderTagline}
                      onChange={(e) => {
                        setSenderTagline(e.target.value);
                        localStorage.setItem('invoice_sender_tagline', e.target.value);
                      }}
                      className="w-full px-2.5 py-1.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-violet-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-gray-500 dark:text-gray-400 mb-1 font-medium">Email Address</label>
                    <input
                      type="email"
                      value={senderEmail}
                      onChange={(e) => {
                        setSenderEmail(e.target.value);
                        localStorage.setItem('invoice_sender_email', e.target.value);
                      }}
                      placeholder="e.g. billing@mybrand.com"
                      className="w-full px-2.5 py-1.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-violet-500"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-500 dark:text-gray-400 mb-1 font-medium">Phone Number</label>
                    <input
                      type="text"
                      value={senderPhone}
                      onChange={(e) => {
                        setSenderPhone(e.target.value);
                        localStorage.setItem('invoice_sender_phone', e.target.value);
                      }}
                      placeholder="e.g. +1 (555) 123-4567"
                      className="w-full px-2.5 py-1.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-violet-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-gray-500 dark:text-gray-400 mb-1 font-medium">Address</label>
                    <input
                      type="text"
                      value={senderAddress}
                      onChange={(e) => {
                        setSenderAddress(e.target.value);
                        localStorage.setItem('invoice_sender_address', e.target.value);
                      }}
                      placeholder="e.g. Lagos, Nigeria"
                      className="w-full px-2.5 py-1.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-violet-500"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-500 dark:text-gray-400 mb-1 font-medium">Website</label>
                    <input
                      type="text"
                      value={senderWebsite}
                      onChange={(e) => {
                        setSenderWebsite(e.target.value);
                        localStorage.setItem('invoice_sender_website', e.target.value);
                      }}
                      placeholder="e.g. www.mybrand.com"
                      className="w-full px-2.5 py-1.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-violet-500"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Customer Name</label>
                  {contacts.length > 0 ? (
                    <select
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className={inputBase}
                    >
                      <option value="" disabled>Select a customer...</option>
                      {contacts.map((c) => (
                        <option key={c.id} value={c.name}>{c.name}{c.company ? ` — ${c.company}` : ''}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Customer name"
                      className={inputBase}
                    />
                  )}
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

              {/* Line items */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Line Items</label>
                <div className="space-y-2">
                  {lineItems.map((li) => (
                    <div key={li.id} className="flex items-start gap-2">
                      <input
                        type="text"
                        value={li.description}
                        onChange={(e) => updateLineItem(li.id, 'description', e.target.value)}
                        placeholder="Description"
                        className="flex-1 min-w-0 px-2.5 py-2 text-sm bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-violet-500/50"
                      />
                      <input
                        type="number"
                        value={li.quantity}
                        min={1}
                        onChange={(e) => updateLineItem(li.id, 'quantity', e.target.value)}
                        placeholder="Qty"
                        className="w-16 px-2 py-2 text-sm bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-violet-500/50"
                      />
                      <input
                        type="number"
                        value={li.unitPrice}
                        min={0}
                        step="0.01"
                        onChange={(e) => updateLineItem(li.id, 'unitPrice', e.target.value)}
                        placeholder="Price"
                        className="w-20 px-2 py-2 text-sm bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-violet-500/50"
                      />
                      <button
                        onClick={() => removeLineItem(li.id)}
                        aria-label="Remove line item"
                        className="p-2 text-gray-400 hover:text-red-500 transition-colors shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  onClick={addLineItem}
                  className="mt-2 flex items-center gap-1.5 text-sm text-violet-600 dark:text-violet-400 hover:text-violet-500 transition-colors"
                >
                  <Plus className="w-4 h-4" /> Add Line Item
                </button>
              </div>

              {/* Tax + Discount */}
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
                    placeholder="10"
                    className={inputBase}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    <span className="inline-flex items-center gap-1.5"><Gift className="w-3.5 h-3.5" /> Incentive / Discount</span>
                  </label>
                  <input
                    type="number"
                    value={discount}
                    min={0}
                    step="0.01"
                    onChange={(e) => setDiscount(Number(e.target.value))}
                    placeholder="0"
                    className={inputBase}
                  />
                </div>
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
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional notes..."
                  rows={3}
                  className={`${inputBase} resize-none`}
                />
              </div>
            </div>

            {/* Right panel: Live preview — Option A (Corporate Slate) */}
            <div className="flex flex-col">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Live Invoice Preview (Corporate Slate)</label>
              <div
                ref={previewRef}
                className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex-1 flex flex-col"
                style={{ minHeight: '520px' }}
              >
                {/* Accent Top Bar (Corporate Slate #1e293b) */}
                <div className="h-3 bg-slate-800 shrink-0" />

                <div className="p-8 flex-1 flex flex-col justify-between">
                  <div>
                    {/* Header: Sender details + Invoice meta */}
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between border-b border-gray-100 pb-6 mb-6 gap-4">
                      {/* Logo and Sender Profile */}
                      <div className="space-y-3 text-left">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-slate-900 flex items-center justify-center text-white font-extrabold text-xl shrink-0 tracking-wider">
                            {(senderName || businessName || 'S')[0]?.toUpperCase()}
                          </div>
                          <div className="text-left">
                            <p className="text-lg font-bold text-slate-900 leading-tight">{senderName || businessName || 'Sender Name'}</p>
                            {(senderTagline || businessTagline) && (
                              <p className="text-xs text-slate-500 mt-0.5 font-medium">{senderTagline || businessTagline}</p>
                            )}
                          </div>
                        </div>

                        {/* Customizable Company Sender details */}
                        <div className="space-y-1 text-[11px] text-slate-500 font-medium text-left">
                          {senderAddress && (
                            <div className="flex items-center gap-1.5">
                              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span>{senderAddress}</span>
                            </div>
                          )}
                          {(senderPhone || senderEmail) && (
                            <div className="flex flex-wrap gap-x-3 gap-y-1">
                              {senderPhone && (
                                <div className="flex items-center gap-1.5">
                                  <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                  <span>{senderPhone}</span>
                                </div>
                              )}
                              {senderEmail && (
                                <div className="flex items-center gap-1.5">
                                  <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                  <span>{senderEmail}</span>
                                </div>
                              )}
                            </div>
                          )}
                          {senderWebsite && (
                            <div className="flex items-center gap-1.5">
                              <Globe className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span>{senderWebsite}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Invoice Identity */}
                      <div className="md:text-right flex flex-row md:flex-col justify-between md:justify-start items-center md:items-end shrink-0">
                        <div>
                          <p className="text-[10px] font-bold tracking-[0.2em] text-slate-400 uppercase leading-none">INVOICE</p>
                          <p className="text-sm text-slate-700 font-mono font-semibold mt-1 bg-slate-50 px-2 py-1 rounded border border-slate-100">{invoiceNumber}</p>
                        </div>
                      </div>
                    </div>

                    {/* Metadata Section: Billed To + Dates */}
                    <div className="grid grid-cols-2 gap-6 border-b border-gray-100 pb-6 mb-6">
                      <div className="text-left">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em] mb-2">Billed To</p>
                        <div className="border-l-2 border-slate-800 pl-3">
                          <p className="text-sm font-bold text-slate-900">{customerName || 'Customer Name'}</p>
                          <p className="text-xs text-slate-500 mt-1">Client account / recipient</p>
                        </div>
                      </div>
                      <div className="text-right flex flex-col justify-between h-full">
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em] mb-1">Date of Issue</p>
                          <p className="text-xs text-slate-700 font-medium">
                            {new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                          </p>
                        </div>
                        {dueDate && (
                          <div className="mt-3">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em] mb-1">Due Date</p>
                            <p className="text-xs text-red-600 font-semibold bg-red-50 inline-block px-2 py-0.5 rounded border border-red-100">
                              {new Date(dueDate).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Line Items Table */}
                    <div className="overflow-hidden rounded-lg border border-slate-100 mb-6">
                      <table className="w-full">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200">
                            <th className="text-left text-[10px] font-bold text-slate-500 uppercase tracking-[0.15em] py-2.5 px-4">Description</th>
                            <th className="text-right text-[10px] font-bold text-slate-500 uppercase tracking-[0.15em] py-2.5 px-4 w-14">Qty</th>
                            <th className="text-right text-[10px] font-bold text-slate-500 uppercase tracking-[0.15em] py-2.5 px-4 w-24">Unit Price</th>
                            <th className="text-right text-[10px] font-bold text-slate-500 uppercase tracking-[0.15em] py-2.5 px-4 w-28">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {lineItems.filter((li) => li.description.trim()).length === 0 ? (
                            <tr>
                              <td colSpan={4} className="text-center text-xs text-slate-400 py-8">No items added to invoice</td>
                            </tr>
                          ) : (
                            lineItems.filter((li) => li.description.trim()).map((li) => (
                              <tr key={li.id} className="hover:bg-slate-50/50">
                                <td className="text-xs text-slate-800 font-semibold py-3 px-4 text-left">{li.description}</td>
                                <td className="text-xs text-slate-600 font-mono text-right py-3 px-4">{li.quantity}</td>
                                <td className="text-xs text-slate-600 font-mono text-right py-3 px-4">{fmt(li.unitPrice)}</td>
                                <td className="text-xs text-slate-900 font-bold font-mono text-right py-3 px-4">{fmt(li.quantity * li.unitPrice)}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Summary Calculations */}
                    <div className="flex justify-end mb-6">
                      <div className="w-64 space-y-2.5 bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-500 font-medium">Subtotal</span>
                          <span className="text-slate-900 font-semibold font-mono">{fmt(subtotal)}</span>
                        </div>
                        {safeDiscount > 0 && (
                          <div className="flex justify-between text-xs">
                            <span className="text-emerald-600 font-medium flex items-center gap-1">Incentive discount</span>
                            <span className="text-emerald-600 font-semibold font-mono">− {fmt(safeDiscount)}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-500 font-medium">Tax ({safeTaxRate}%)</span>
                          <span className="text-slate-900 font-semibold font-mono">{fmt(tax)}</span>
                        </div>
                        <div className="flex justify-between items-baseline pt-2.5 border-t border-slate-200">
                          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Total Due</span>
                          <span className="text-lg font-extrabold text-slate-900 font-mono">{fmt(total)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    {/* Notes & Terms */}
                    {notes.trim() && (
                      <div className="pt-5 border-t border-slate-100 text-left">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em] mb-1.5">Notes & Payment Terms</p>
                        <p className="text-xs text-slate-600 whitespace-pre-wrap leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100 font-medium">{notes}</p>
                      </div>
                    )}

                    <div className="text-center pt-6 border-t border-slate-100 mt-6">
                      <p className="text-xs font-semibold italic text-slate-400">Thank you for your business!</p>
                      <p className="text-[9px] text-slate-300 font-mono mt-1 uppercase tracking-widest">{senderName || businessName} · Secured Invoice System</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-800 shrink-0">
          {error && <p className="text-sm text-red-600 dark:text-red-400 mb-3">{error}</p>}
          <div className="flex gap-3">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save Invoice'}
            </Button>
            <Button variant="secondary" onClick={handleDownloadPDF} disabled={downloading}>
              <span className="flex items-center gap-2">
                <Download className="w-4 h-4" />
                {downloading ? 'Generating...' : 'Download PDF'}
              </span>
            </Button>
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
