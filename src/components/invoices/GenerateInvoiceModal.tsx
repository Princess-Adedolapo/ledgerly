import { useState, useRef, useEffect } from 'react';
import { X, Plus, Trash2, Download, Percent, Gift, Building2, Mail, Phone, Globe, MapPin, Palette, Upload, AlertCircle } from 'lucide-react';
import type { Contact } from '../../lib/supabase';
import SearchableContactSelect from '../contacts/SearchableContactSelect';
import { Button } from '../ui';
import { useWorkspace } from '../../lib/workspace';
import { useUserPreferences } from '../../lib/userPreferences';
import { formatCurrency } from '../../lib/currency';
import { getErrorMessage } from '../../lib/errorUtils';
import { DEFAULT_BRAND_COLOR, getBrandSettings, saveBrandSettings, processLogoImageFile, getContrastTextColor, BRAND_COLOR_PRESETS } from '../../lib/branding';
import { exportElementToPdf } from '../../lib/pdfExport';

export interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
}

export interface RawLineItem {
  id: string;
  description: string;
  quantity: number | string;
  unitPrice: number | string;
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
  documentType: 'invoice' | 'proposal' | 'quote';
  senderInfo?: Record<string, string>;
}

function generateInvoiceNumber(): string {
  return `INV-${Date.now()}`;
}

let lineItemIdCounter = 0;
function makeLineItem(): RawLineItem {
  return { id: `li-${++lineItemIdCounter}`, description: '', quantity: 1, unitPrice: 0 };
}

export function GenerateInvoiceModal({
  open,
  onClose,
  contacts,
  onSave,
  initialCustomerName,
}: {
  open: boolean;
  onClose: () => void;
  contacts: Contact[];
  onSave: (data: InvoiceData) => Promise<void>;
  initialCustomerName?: string;
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
  const [senderLogo, setSenderLogo] = useState(() => localStorage.getItem('invoice_brand_logo') || '');
  const [brandColor, setBrandColor] = useState(() => localStorage.getItem('invoice_brand_color') || DEFAULT_BRAND_COLOR);
  const [uploadingModalLogo, setUploadingModalLogo] = useState(false);
  const modalLogoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setInvoiceCurrency(currencyCode);
      const currentBrand = getBrandSettings();
      setSenderLogo(currentBrand.logoUrl);
      setBrandColor(currentBrand.brandColor || DEFAULT_BRAND_COLOR);
      if (initialCustomerName) {
        setCustomerName(initialCustomerName);
      }
      if (!localStorage.getItem('invoice_sender_name') && businessName) {
        setSenderName(businessName);
      }
      if (!localStorage.getItem('invoice_sender_tagline') && businessTagline) {
        setSenderTagline(businessTagline);
      }
    }
  }, [open, currencyCode, businessName, businessTagline, initialCustomerName]);

  const fmt = (v: number) => formatCurrency(v, invoiceCurrency, currencyDisplayMode, 2);
  const currencySymbol = invoiceCurrency === 'NGN' ? '₦' : invoiceCurrency === 'EUR' ? '€' : invoiceCurrency === 'GBP' ? '£' : '$';
  const [documentType, setDocumentType] = useState<'invoice' | 'proposal' | 'quote'>('invoice');
  const [invoiceNumber] = useState(generateInvoiceNumber());
  const [customerName, setCustomerName] = useState('');
  const [lineItems, setLineItems] = useState<RawLineItem[]>([makeLineItem()]);
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [taxRate, setTaxRate] = useState<number | string>(10);
  const [discount, setDiscount] = useState<number | string>(0);
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

  const getItemQty = (li: RawLineItem) => {
    const q = typeof li.quantity === 'number' ? li.quantity : parseFloat(li.quantity as string);
    return Number.isFinite(q) && q > 0 ? q : 1;
  };
  const getItemPrice = (li: RawLineItem) => {
    const p = typeof li.unitPrice === 'number' ? li.unitPrice : parseFloat(li.unitPrice as string);
    return Number.isFinite(p) && p >= 0 ? p : 0;
  };

  const subtotal = lineItems.reduce((sum, li) => sum + getItemQty(li) * getItemPrice(li), 0);
  const numTaxRate = typeof taxRate === 'number' ? taxRate : parseFloat(taxRate as string) || 0;
  const numDiscount = typeof discount === 'number' ? discount : parseFloat(discount as string) || 0;

  const safeTaxRate = Number.isFinite(numTaxRate) ? Math.max(0, numTaxRate) : 0;
  const safeDiscount = Number.isFinite(numDiscount) ? Math.max(0, Math.min(numDiscount, subtotal)) : 0;
  const taxableBase = Math.max(0, subtotal - safeDiscount);
  const tax = taxableBase * (safeTaxRate / 100);
  const total = taxableBase + tax;

  const updateLineItem = (id: string, field: keyof RawLineItem, value: string | number) => {
    setLineItems((prev) =>
      prev.map((li) => {
        if (li.id !== id) return li;
        if (field === 'description') {
          return { ...li, description: value as string };
        }
        return { ...li, [field]: value };
      })
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
    if (numDiscount > subtotal && subtotal > 0) {
      setError(`Discount (${fmt(numDiscount)}) cannot exceed the subtotal amount (${fmt(subtotal)}).`);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave({
        invoiceNumber,
        customerName: customerName.trim(),
        lineItems: lineItems
          .filter((li) => li.description.trim())
          .map((li) => ({
            id: li.id,
            description: li.description,
            quantity: getItemQty(li),
            unitPrice: getItemPrice(li),
          })),
        dueDate,
        notes: notes.trim(),
        subtotal,
        tax,
        taxRate: safeTaxRate,
        discount: safeDiscount,
        total,
        currencyCode: invoiceCurrency,
        documentType,
        senderInfo: {
          name: senderName || businessName || 'Ledgerly Workspace',
          tagline: senderTagline || businessTagline || '',
          address: senderAddress || '',
          phone: senderPhone || '',
          email: senderEmail || '',
          website: senderWebsite || '',
          logo_url: senderLogo,
          brand_color: brandColor,
        },
      });
      // Reset form
      setCustomerName('');
      setLineItems([makeLineItem()]);
      setDueDate('');
      setNotes('');
      setDiscount(0);
      setTaxRate(10);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to save document. Please verify your input details and try again.'));
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!previewRef.current) return;
    setDownloading(true);
    try {
      await exportElementToPdf(previewRef.current, `${documentType}_${invoiceNumber}.pdf`, {
        scale: 1.5,
        quality: 0.85,
        backgroundColor: '#ffffff',
      });
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to generate PDF document.'));
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
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Generate {documentType === 'proposal' ? 'Proposal' : documentType === 'quote' ? 'Quote' : 'Invoice'}
          </h2>
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

                {/* Brand Logo & Accent Color Row */}
                <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700/60 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <input
                      type="file"
                      ref={modalLogoInputRef}
                      accept="image/png,image/jpeg,image/webp,image/svg+xml"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setUploadingModalLogo(true);
                          try {
                            const optimized = await processLogoImageFile(file);
                            setSenderLogo(optimized);
                            saveBrandSettings({ logoUrl: optimized, brandColor });
                          } catch (err) {
                            console.error(err);
                          } finally {
                            setUploadingModalLogo(false);
                          }
                        }
                        if (modalLogoInputRef.current) modalLogoInputRef.current.value = '';
                      }}
                    />
                    {senderLogo ? (
                      <div className="flex items-center gap-2">
                        <div className="w-12 h-8 rounded-lg bg-white border border-gray-200 dark:border-gray-700 p-1 flex items-center justify-center">
                          <img src={senderLogo} alt="Logo" className="max-h-full max-w-full object-contain" />
                        </div>
                        <button
                          type="button"
                          onClick={() => modalLogoInputRef.current?.click()}
                          className="text-[11px] text-violet-600 dark:text-violet-400 font-semibold hover:underline"
                        >
                          Change Logo
                        </button>
                        <span className="text-gray-300 dark:text-gray-600">•</span>
                        <button
                          type="button"
                          onClick={() => {
                            setSenderLogo('');
                            saveBrandSettings({ logoUrl: '', brandColor });
                          }}
                          className="text-[11px] text-rose-500 font-semibold hover:underline"
                        >
                          Remove
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => modalLogoInputRef.current?.click()}
                        disabled={uploadingModalLogo}
                        className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-dashed border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-violet-500 flex items-center gap-1.5 transition-colors"
                      >
                        <Upload className="w-3.5 h-3.5 text-violet-500" />
                        {uploadingModalLogo ? 'Processing...' : 'Upload Business Logo'}
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">Brand Color:</span>
                    <div className="flex items-center gap-1">
                      {BRAND_COLOR_PRESETS.slice(0, 5).map((p) => (
                        <button
                          key={p.hex}
                          type="button"
                          title={p.name}
                          onClick={() => {
                            setBrandColor(p.hex);
                            saveBrandSettings({ logoUrl: senderLogo, brandColor: p.hex });
                          }}
                          className={`w-5 h-5 rounded-md transition-transform ${brandColor.toLowerCase() === p.hex.toLowerCase() ? 'ring-2 ring-violet-500 scale-110' : 'opacity-80 hover:opacity-100'}`}
                          style={{ backgroundColor: p.hex }}
                        />
                      ))}
                      <label className="relative cursor-pointer ml-1">
                        <input
                          type="color"
                          value={brandColor.startsWith('#') && brandColor.length === 7 ? brandColor : DEFAULT_BRAND_COLOR}
                          onChange={(e) => {
                            setBrandColor(e.target.value);
                            saveBrandSettings({ logoUrl: senderLogo, brandColor: e.target.value });
                          }}
                          className="sr-only"
                        />
                        <div
                          className="w-5 h-5 rounded-md border border-gray-300 dark:border-gray-600 cursor-pointer flex items-center justify-center shadow-xs"
                          style={{ backgroundColor: brandColor }}
                        >
                          <Palette className="w-2.5 h-2.5 text-white opacity-80" />
                        </div>
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Customer Name</label>
                  {contacts.length > 0 ? (
                    <SearchableContactSelect
                      contacts={contacts}
                      value={customerName}
                      valueType="name"
                      onChange={(val) => setCustomerName(val)}
                      placeholder="Search or select a customer..."
                    />
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
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Doc Type</label>
                  <select
                    value={documentType}
                    onChange={(e) => setDocumentType(e.target.value as 'invoice' | 'proposal' | 'quote')}
                    className={inputBase}
                  >
                    <option value="invoice">Invoice</option>
                    <option value="proposal">Proposal</option>
                    <option value="quote">Quote</option>
                  </select>
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
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200">
                    Line Items
                  </label>
                  <span className="text-xs text-gray-400 font-medium">
                    {lineItems.length} {lineItems.length === 1 ? 'item' : 'items'}
                  </span>
                </div>

                {/* Column Header Tags */}
                <div className="flex items-center gap-2 px-1 mb-1.5 text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  <div className="flex-1 min-w-0">Item Description</div>
                  <div className="w-20 text-center">
                    <span className="inline-block bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 px-2 py-0.5 rounded border border-violet-200/60 dark:border-violet-800/50 text-[10px] font-bold">
                      Qty
                    </span>
                  </div>
                  <div className="w-28 text-right">
                    <span className="inline-block bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 px-2 py-0.5 rounded border border-violet-200/60 dark:border-violet-800/50 text-[10px] font-bold">
                      Price ({currencySymbol})
                    </span>
                  </div>
                  <div className="w-8 shrink-0" />
                </div>

                <div className="space-y-2">
                  {lineItems.map((li, index) => (
                    <div key={li.id} className="flex items-center gap-2">
                      <div className="flex-1 min-w-0 relative">
                        <input
                          type="text"
                          value={li.description}
                          onChange={(e) => updateLineItem(li.id, 'description', e.target.value)}
                          placeholder={`Item #${index + 1} description`}
                          aria-label={`Item #${index + 1} description`}
                          className="w-full px-2.5 py-2 text-sm bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-violet-500/50"
                        />
                      </div>
                      <div className="w-20 relative">
                        <input
                          type="number"
                          value={li.quantity}
                          min={1}
                          step="1"
                          onChange={(e) => updateLineItem(li.id, 'quantity', e.target.value)}
                          onFocus={(e) => e.target.select()}
                          placeholder="Qty"
                          aria-label={`Item #${index + 1} quantity`}
                          className="w-full px-2 py-2 text-center text-sm font-semibold bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-violet-500/50"
                        />
                      </div>
                      <div className="w-28 relative">
                        <div className="relative flex items-center">
                          <span className="absolute left-2.5 text-xs text-gray-400 select-none font-bold pointer-events-none">
                            {currencySymbol}
                          </span>
                          <input
                            type="number"
                            value={li.unitPrice}
                            min={0}
                            step="1"
                            onChange={(e) => updateLineItem(li.id, 'unitPrice', e.target.value)}
                            onFocus={(e) => e.target.select()}
                            placeholder="0"
                            aria-label={`Item #${index + 1} unit price in ${invoiceCurrency}`}
                            className="w-full pl-6 pr-2 py-2 text-right text-sm font-mono font-medium bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-violet-500/50"
                          />
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeLineItem(li.id)}
                        disabled={lineItems.length === 1}
                        aria-label={`Remove item #${index + 1}`}
                        title={lineItems.length === 1 ? 'At least one line item is required' : 'Remove item'}
                        className={`p-2 transition-colors shrink-0 rounded-lg ${
                          lineItems.length === 1
                            ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                            : 'text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30'
                        }`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={addLineItem}
                  className="mt-2.5 inline-flex items-center gap-1.5 text-sm font-medium text-violet-600 dark:text-violet-400 hover:text-violet-500 transition-colors"
                >
                  <Plus className="w-4 h-4" /> Add Line Item
                </button>
              </div>

              {/* Tax + Discount */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    <span className="inline-flex items-center gap-1.5"><Percent className="w-3.5 h-3.5 text-violet-500" /> Tax Rate (%)</span>
                  </label>
                  <input
                    type="number"
                    value={taxRate}
                    min={0}
                    max={100}
                    step="1"
                    onChange={(e) => setTaxRate(e.target.value)}
                    onFocus={(e) => e.target.select()}
                    placeholder="10"
                    className={inputBase}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    <span className="inline-flex items-center gap-1.5">
                      <Gift className="w-3.5 h-3.5 text-emerald-500" /> Incentive / Discount ({currencySymbol})
                    </span>
                  </label>
                  <div className="relative flex items-center">
                    <span className="absolute left-3 text-sm text-gray-400 select-none font-bold pointer-events-none">
                      {currencySymbol}
                    </span>
                    <input
                      type="number"
                      value={discount}
                      min={0}
                      step="1"
                      onChange={(e) => {
                        setDiscount(e.target.value);
                        if (error) setError(null);
                      }}
                      onFocus={(e) => e.target.select()}
                      placeholder="0"
                      className={`${inputBase} pl-7 font-mono font-medium`}
                    />
                  </div>
                  {numDiscount > 0 && (
                    <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 font-medium">
                      {numDiscount > subtotal && subtotal > 0
                        ? `Capped at subtotal: − ${fmt(safeDiscount)}`
                        : `Deducts − ${fmt(safeDiscount)} from subtotal`}
                    </p>
                  )}
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
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Live {documentType === 'proposal' ? 'Proposal' : documentType === 'quote' ? 'Quote' : 'Invoice'} Preview (Corporate Slate)
              </label>
              <div
                ref={previewRef}
                className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex-1 flex flex-col"
                style={{ minHeight: '520px' }}
              >
                {/* Accent Top Bar */}
                <div className="h-3 shrink-0 transition-colors duration-200" style={{ backgroundColor: brandColor }} />

                <div className="p-8 flex-1 flex flex-col justify-between">
                  <div>
                    {/* Header: Sender details + Invoice meta */}
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between border-b border-gray-100 pb-6 mb-6 gap-4">
                      {/* Logo and Sender Profile */}
                      <div className="space-y-3 text-left">
                        <div className="flex items-center gap-3">
                          {senderLogo ? (
                            <div className="p-1 rounded-xl bg-white border border-gray-200 shadow-2xs flex items-center justify-center max-h-12 max-w-[120px] shrink-0">
                              <img
                                src={senderLogo}
                                alt="Logo"
                                className="max-h-10 max-w-full object-contain"
                              />
                            </div>
                          ) : (
                            <div
                              className="w-12 h-12 rounded-xl flex items-center justify-center font-extrabold text-xl shrink-0 tracking-wider shadow-xs"
                              style={{
                                backgroundColor: brandColor,
                                color: getContrastTextColor(brandColor),
                              }}
                            >
                              {(senderName || businessName || 'S')[0]?.toUpperCase()}
                            </div>
                          )}
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

                      {/* Document Identity */}
                      <div className="md:text-right flex flex-row md:flex-col justify-between md:justify-start items-center md:items-end shrink-0">
                        <div>
                          <p className="text-[10px] font-bold tracking-[0.2em] text-slate-400 uppercase leading-none">{documentType.toUpperCase()}</p>
                          <p className="text-sm text-slate-700 font-mono font-semibold mt-1 bg-slate-50 px-2 py-1 rounded border border-slate-100">{invoiceNumber}</p>
                        </div>
                      </div>
                    </div>

                    {/* Metadata Section: Billed To + Dates */}
                    <div className="grid grid-cols-2 gap-6 border-b border-gray-100 pb-6 mb-6">
                      <div className="text-left">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em] mb-2">Billed To</p>
                        <div className="border-l-3 pl-3" style={{ borderColor: brandColor }}>
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
                      <p className="text-[9px] text-slate-300 font-mono mt-1 uppercase tracking-widest">{senderName || businessName} · Secured {documentType === 'proposal' ? 'Proposal' : documentType === 'quote' ? 'Quote' : 'Invoice'} System</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-800 shrink-0">
          {error && (
            <div className="mb-3.5 p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 rounded-xl flex items-start gap-2.5 text-xs sm:text-sm text-red-700 dark:text-red-300 animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium leading-relaxed">{error}</div>
            </div>
          )}
          <div className="flex gap-3">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : `Save ${documentType === 'proposal' ? 'Proposal' : documentType === 'quote' ? 'Quote' : 'Invoice'}`}
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
