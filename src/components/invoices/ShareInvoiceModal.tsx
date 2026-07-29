import { useState, useEffect } from 'react';
import { X, Copy, ExternalLink, Mail, Check, FileText, Sparkles, ShieldCheck } from 'lucide-react';
import type { Invoice } from '../../lib/supabase';
import { Button } from '../ui';
import { useToast } from '../../contexts/ToastContext';
import { formatCurrency } from '../../lib/currency';
import { useUserPreferences } from '../../lib/userPreferences';
import { cacheInvoicesLocally, setLocalInvoiceMeta } from '../../services/invoiceService';

interface ShareInvoiceModalProps {
  open: boolean;
  onClose: () => void;
  invoice: Invoice | null;
  onDocumentTypeChange?: (id: string, type: 'invoice' | 'proposal' | 'quote') => Promise<void>;
}

export function ShareInvoiceModal({
  open,
  onClose,
  invoice,
  onDocumentTypeChange,
}: ShareInvoiceModalProps) {
  const { addToast } = useToast();
  const { currencyDisplayMode } = useUserPreferences();
  const [copied, setCopied] = useState(false);
  const [docType, setDocType] = useState<'invoice' | 'proposal' | 'quote'>('invoice');
  const [changingType, setChangingType] = useState(false);

  useEffect(() => {
    if (invoice) {
      const type = invoice.document_type || 'invoice';
      setDocType(type);
      setCopied(false);
      try {
        cacheInvoicesLocally([{ ...invoice, document_type: type }]);
        setLocalInvoiceMeta(invoice.id, { document_type: type });
      } catch (err) {
        console.warn('Error caching invoice in ShareInvoiceModal:', err);
      }
    }
  }, [invoice]);

  if (!open || !invoice) return null;

  const publicUrl = `${window.location.origin}/portal/${docType}/${invoice.id}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    addToast('success', 'Link Copied', 'Client portal share link copied to clipboard!');
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDocTypeToggle = async (newType: 'invoice' | 'proposal' | 'quote') => {
    if (newType === docType) return;
    setDocType(newType);
    if (onDocumentTypeChange) {
      setChangingType(true);
      try {
        await onDocumentTypeChange(invoice.id, newType);
        addToast('invoice', 'Document Type Updated', `Set to ${newType.toUpperCase()}`);
      } catch (err) {
        console.error('Failed to change document type:', err);
      } finally {
        setChangingType(false);
      }
    }
  };

  const formattedAmount = formatCurrency(
    Number(invoice.amount) || 0,
    invoice.currency_code || 'USD',
    currencyDisplayMode
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/40">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-violet-600/10 dark:bg-violet-500/20 text-violet-600 dark:text-violet-400 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white">
                Client Portal & Public Share Link
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {invoice.invoice_number || invoice.id.slice(0, 8)} · {invoice.customer_name || 'Client'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-1 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Document Summary Pill */}
          <div className="p-4 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-800/30 flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400 font-medium">Recipient / Customer</p>
              <p className="text-sm font-bold text-gray-900 dark:text-white mt-0.5">
                {invoice.customer_name || 'Unassigned'}
              </p>
              <p className="text-xs text-violet-600 dark:text-violet-400 font-medium mt-1">
                {formattedAmount}
              </p>
            </div>

            <div className="text-right">
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                  invoice.signer_name || invoice.status === 'approved'
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                    : 'bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300'
                }`}
              >
                {invoice.signer_name ? (
                  <>
                    <ShieldCheck className="w-3.5 h-3.5" /> Digitally Signed
                  </>
                ) : (
                  <>
                    <FileText className="w-3.5 h-3.5" /> {docType.toUpperCase()}
                  </>
                )}
              </span>
            </div>
          </div>

          {/* Document Mode Selector */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
              Document Mode
            </label>
            <div className="grid grid-cols-3 gap-2 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl text-xs font-medium">
              <button
                type="button"
                onClick={() => handleDocTypeToggle('invoice')}
                disabled={changingType}
                className={`py-2 px-3 rounded-lg text-center transition-all ${
                  docType === 'invoice'
                    ? 'bg-white dark:bg-gray-900 text-violet-600 dark:text-violet-400 shadow-sm font-bold'
                    : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                Invoice
              </button>
              <button
                type="button"
                onClick={() => handleDocTypeToggle('proposal')}
                disabled={changingType}
                className={`py-2 px-3 rounded-lg text-center transition-all ${
                  docType === 'proposal'
                    ? 'bg-white dark:bg-gray-900 text-violet-600 dark:text-violet-400 shadow-sm font-bold'
                    : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                Proposal
              </button>
              <button
                type="button"
                onClick={() => handleDocTypeToggle('quote')}
                disabled={changingType}
                className={`py-2 px-3 rounded-lg text-center transition-all ${
                  docType === 'quote'
                    ? 'bg-white dark:bg-gray-900 text-violet-600 dark:text-violet-400 shadow-sm font-bold'
                    : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                Quote
              </button>
            </div>
            <p className="text-[11px] text-gray-400 mt-1">
              Proposals and quotes include interactive <strong className="text-gray-600 dark:text-gray-300">"Approve & Sign"</strong> digital confirmation buttons for clients.
            </p>
          </div>

          {/* Unique Link Input + Action */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
              Unique Read-Only Client Portal URL
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={publicUrl}
                className="flex-1 px-3 py-2 text-xs font-mono bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-800 dark:text-gray-200 focus:outline-none"
              />
              <button
                onClick={handleCopyLink}
                className="px-3.5 py-2 rounded-xl text-xs font-medium bg-violet-600 text-white hover:bg-violet-700 transition-colors flex items-center gap-1.5 shrink-0 shadow-sm"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <a
              href={publicUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all text-center"
            >
              <ExternalLink className="w-4 h-4 text-violet-500" />
              Preview Client View
            </a>

            <a
              href={`mailto:?subject=${encodeURIComponent(
                `${docType === 'proposal' ? 'Proposal' : docType === 'quote' ? 'Quote' : 'Invoice'} #${invoice.invoice_number || invoice.id.slice(0, 8)} for ${invoice.customer_name || 'you'}`
              )}&body=${encodeURIComponent(
                `Hello ${invoice.customer_name || ''},\n\nPlease find your ${docType} ready for review and printing at the following secure URL:\n\n${publicUrl}\n\nThank you!`
              )}`}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all text-center"
            >
              <Mail className="w-4 h-4 text-violet-500" />
              Email Link to Client
            </a>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 flex justify-end bg-gray-50/30 dark:bg-gray-800/20">
          <Button variant="secondary" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </div>
  );
}
