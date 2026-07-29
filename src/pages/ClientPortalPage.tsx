import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import {
  Printer,
  Download,
  Share2,
  Check,
  ShieldCheck,
  FileText,
  Clock,
  CheckCircle,
  Mail,
  Phone,
  Globe,
  MapPin,
  ArrowLeft,
  AlertCircle,
  Sparkles,
  CreditCard,
} from 'lucide-react';
import { getInvoiceByIdOrNumber, saveInvoiceSignature } from '../services/invoiceService';
import { autoResolveWorkflowCardForCustomer } from '../services/workflowService';
import { initiatePaystackCheckout } from '../services/paystackService';
import type { Invoice } from '../lib/supabase';
import { formatCurrency } from '../lib/currency';
import { useUserPreferences } from '../lib/userPreferences';
import { useWorkspace } from '../lib/workspace';
import { SignatureModal } from '../components/invoices/SignatureModal';
import { useToast } from '../contexts/ToastContext';

export default function ClientPortalPage() {
  const params = useParams<{ id?: string; docType?: string }>();
  const [searchParams] = useSearchParams();

  const queryToken =
    searchParams.get('token') ||
    searchParams.get('share_token') ||
    searchParams.get('id') ||
    searchParams.get('invoice_number');

  const knownDocTypes = ['invoice', 'proposal', 'quote', 'share'];
  const isDocTypeParamKnown = params.docType && knownDocTypes.includes(params.docType.toLowerCase());

  const urlDocType = isDocTypeParamKnown ? params.docType?.toLowerCase() : undefined;
  const rawTargetId = params.id || (isDocTypeParamKnown ? undefined : params.docType) || queryToken;
  const targetId = rawTargetId ? decodeURIComponent(rawTargetId).trim() : '';

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [signatureModalOpen, setSignatureModalOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [paying, setPaying] = useState(false);

  const { currencyDisplayMode } = useUserPreferences();
  const { businessName, businessTagline } = useWorkspace();
  const { addToast } = useToast();
  const documentRef = useRef<HTMLDivElement>(null);

  // Load Sender profile from invoice metadata first, then localStorage / workspace defaults
  const senderName = invoice?.sender_info?.name || localStorage.getItem('invoice_sender_name') || businessName || 'Ledgerly Workspace';
  const senderTagline = invoice?.sender_info?.tagline || localStorage.getItem('invoice_sender_tagline') || businessTagline || '';
  const senderAddress = invoice?.sender_info?.address || localStorage.getItem('invoice_sender_address') || '';
  const senderPhone = invoice?.sender_info?.phone || localStorage.getItem('invoice_sender_phone') || '';
  const senderEmail = invoice?.sender_info?.email || localStorage.getItem('invoice_sender_email') || '';
  const senderWebsite = invoice?.sender_info?.website || localStorage.getItem('invoice_sender_website') || '';

  useEffect(() => {
    if (invoice) {
      const docLabel = (invoice.document_type || 'invoice') === 'proposal' ? 'Proposal' : (invoice.document_type || 'invoice') === 'quote' ? 'Quote' : 'Invoice';
      document.title = `${docLabel} #${invoice.invoice_number || invoice.id.slice(0, 8)} | Client Portal`;
    }
  }, [invoice]);

  const fetchInvoice = useCallback(async () => {
    if (!targetId) {
      setError('Invalid share link. No document ID or token provided.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await getInvoiceByIdOrNumber(targetId);

      if (!data) {
        setError('Invoice or Proposal document not found.');
      } else {
        if (urlDocType && urlDocType !== 'share' && (!data.document_type || data.document_type === 'invoice')) {
          data.document_type = urlDocType as 'invoice' | 'proposal' | 'quote';
        }
        setInvoice(data);
      }
    } catch (err) {
      console.error('[ClientPortal] Failed to load document for portal:', { targetId, err });
      setError('Could not load document details.');
    } finally {
      setLoading(false);
    }
  }, [targetId, urlDocType]);

  useEffect(() => {
    fetchInvoice();
  }, [fetchInvoice]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    if (!documentRef.current) return;
    setDownloading(true);
    try {
      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF } = await import('jspdf');

      const canvas = await html2canvas(documentRef.current, {
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
      pdf.save(`${docType}_${invoice?.invoice_number || 'document'}.pdf`);
    } catch (err) {
      console.error('Failed to generate PDF:', err);
      addToast('error', 'PDF Export Error', 'Could not generate PDF download.');
    } finally {
      setDownloading(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    addToast('success', 'Link Copied', 'Public URL copied to clipboard!');
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleConfirmSign = async (data: { signerName: string; signerEmail: string; signatureData: string }) => {
    if (!invoice) return;
    await saveInvoiceSignature(invoice.id, {
      signerName: data.signerName,
      signerEmail: data.signerEmail,
      signatureData: data.signatureData,
      status: 'approved',
      documentType: docType,
    });

    if (invoice.customer_name) {
      await autoResolveWorkflowCardForCustomer(invoice.customer_name);
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('workflow-card-updated'));
      window.dispatchEvent(new CustomEvent('invoice-updated'));
    }

    addToast('success', 'Proposal Approved & Signed', `Thank you ${data.signerName}! Document status updated to Approved.`);
    await fetchInvoice();
  };

  const handlePayNow = async () => {
    if (!invoice) return;
    setPaying(true);
    try {
      await initiatePaystackCheckout({
        invoice,
        customerEmail: senderEmail || invoice.signer_email,
        customerName: invoice.customer_name,
        onSuccess: (ref) => {
          setPaying(false);
          addToast('success', 'Payment Successful!', `Invoice paid online via Paystack! Ref: ${ref}`);
          fetchInvoice();
        },
        onClose: () => {
          setPaying(false);
        },
        onError: (err) => {
          setPaying(false);
          addToast('error', 'Payment Failed', err.message || 'Unable to launch Paystack window.');
        },
      });
    } catch (err) {
      setPaying(false);
      addToast('error', 'Payment Error', err instanceof Error ? err.message : 'Paystack checkout error');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col items-center justify-center p-6">
        <div className="w-12 h-12 rounded-xl bg-violet-600/20 text-violet-600 flex items-center justify-center animate-pulse mb-3">
          <FileText className="w-6 h-6" />
        </div>
        <p className="text-sm text-gray-500 font-medium">Loading Document Portal...</p>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Document Not Found</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mb-6">
          The invoice or proposal you requested could not be found or may have been updated.
        </p>
        <Link
          to="/"
          className="px-4 py-2 bg-violet-600 text-white font-medium text-sm rounded-xl hover:bg-violet-700 transition-colors inline-flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" /> Return to Home
        </Link>
      </div>
    );
  }

  const docType = invoice.document_type || 'invoice';
  const docTypeLabel = docType === 'proposal' ? 'Proposal' : docType === 'quote' ? 'Quote' : 'Invoice';
  const docTypeUpper = docType.toUpperCase();
  const currency = invoice.currency_code || 'USD';
  const amountNum = Number(invoice.amount) || 0;
  const formattedTotal = formatCurrency(amountNum, currency, currencyDisplayMode);
  const taxRate = Number(invoice.tax_rate) || 0;
  const discount = Number(invoice.discount) || 0;

  // Calculate subtotal
  const subtotal = amountNum + discount - (amountNum * (taxRate / 100));

  const isProposal = docType === 'proposal' || docType === 'quote';
  const isSigned = !!invoice.signer_name || !!invoice.signature_data || invoice.status === 'approved';

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-950 py-8 px-4 sm:px-6 font-sans">
      {/* CSS @media print rules for razor-sharp paper printing */}
      <style>{`
        @media print {
          body {
            background: white !important;
            color: black !important;
          }
          .no-print {
            display: none !important;
          }
          .print-card {
            box-shadow: none !important;
            border: none !important;
            padding: 0 !important;
            max-width: 100% !important;
          }
        }
      `}</style>

      <div className="max-w-4xl mx-auto space-y-6">
        {/* Top Floating Control Bar (Hidden on Print) */}
        <div className="no-print bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 shadow-sm flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-600 text-white flex items-center justify-center font-bold text-lg">
              {(senderName || 'L')[0].toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase tracking-wider font-extrabold text-violet-600 dark:text-violet-400">
                  Client Portal
                </span>
                <span className="text-gray-300 dark:text-gray-700">•</span>
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                  {docTypeLabel}
                </span>
              </div>
              <p className="text-sm font-bold text-gray-900 dark:text-white">
                #{invoice.invoice_number || invoice.id.slice(0, 8)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {invoice.status !== 'paid' ? (
              <button
                onClick={handlePayNow}
                disabled={paying}
                className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold rounded-xl shadow-md hover:shadow-lg transition-all flex items-center gap-1.5 animate-pulse"
              >
                <CreditCard className="w-4 h-4" />
                {paying ? 'Connecting to Paystack...' : 'Pay Online (Paystack)'}
              </button>
            ) : (
              <span className="px-3.5 py-2 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-bold rounded-xl flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                Paid Online
              </span>
            )}

            {isProposal && !isSigned && (
              <button
                onClick={() => setSignatureModalOpen(true)}
                className="px-4 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl shadow-md hover:shadow-lg transition-all flex items-center gap-1.5 animate-pulse"
              >
                <ShieldCheck className="w-4 h-4" />
                Approve & Sign
              </button>
            )}

            <button
              onClick={handlePrint}
              className="px-3.5 py-2 bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5"
            >
              <Printer className="w-4 h-4 text-violet-500" />
              Print
            </button>

            <button
              onClick={handleDownloadPDF}
              disabled={downloading}
              className="px-3.5 py-2 bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5"
            >
              <Download className="w-4 h-4 text-violet-500" />
              {downloading ? 'Downloading...' : 'PDF'}
            </button>

            <button
              onClick={handleCopyLink}
              className="px-3.5 py-2 bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5"
            >
              {copiedLink ? <Check className="w-4 h-4 text-emerald-500" /> : <Share2 className="w-4 h-4 text-violet-500" />}
              {copiedLink ? 'Copied' : 'Share'}
            </button>
          </div>
        </div>

        {/* Digital Signature Hero Callout Banner if Proposal / Quote Needs Signing */}
        {isProposal && !isSigned && (
          <div className="no-print p-5 rounded-2xl bg-gradient-to-r from-violet-900 to-indigo-900 text-white shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="space-y-1 text-center sm:text-left">
              <div className="inline-flex items-center gap-1.5 bg-violet-500/30 text-violet-200 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" /> Action Required
              </div>
              <h3 className="text-lg font-bold text-white">Review & Digitally Sign {docTypeLabel}</h3>
              <p className="text-xs text-violet-200 max-w-lg">
                Please review the terms and click below to digitally approve & sign this {docTypeLabel.toLowerCase()} before it is activated into a live invoice.
              </p>
            </div>
            <button
              onClick={() => setSignatureModalOpen(true)}
              className="px-5 py-2.5 bg-white text-violet-950 font-extrabold text-sm rounded-xl shadow-lg hover:bg-violet-50 transition-all shrink-0 flex items-center gap-2"
            >
              <ShieldCheck className="w-4 h-4 text-violet-600" />
              Approve & Sign Now
            </button>
          </div>
        )}

        {/* Primary Document Sheet (Corporate Slate Style) */}
        <div
          ref={documentRef}
          className="print-card bg-white text-slate-900 rounded-2xl border border-gray-200 shadow-xl overflow-hidden"
        >
          {/* Top Accent Bar */}
          <div className="h-3.5 bg-slate-900" />

          <div className="p-8 sm:p-12 space-y-8">
            {/* Header: Sender details + Document Type Title */}
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between pb-8 border-b border-slate-200 gap-6">
              {/* Sender Details */}
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-black text-2xl tracking-wider">
                    {(senderName || 'L')[0].toUpperCase()}
                  </div>
                  <div>
                    <h1 className="text-xl font-bold text-slate-900 leading-tight">
                      {senderName}
                    </h1>
                    {senderTagline && (
                      <p className="text-xs text-slate-500 font-medium mt-0.5">
                        {senderTagline}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-1 text-xs text-slate-500 font-medium">
                  {senderAddress && (
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{senderAddress}</span>
                    </div>
                  )}
                  {(senderPhone || senderEmail) && (
                    <div className="flex flex-wrap gap-x-4 gap-y-1">
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
              <div className="sm:text-right flex flex-row sm:flex-col justify-between sm:justify-start items-center sm:items-end">
                <div>
                  <p className="text-[11px] font-extrabold tracking-[0.25em] text-slate-400 uppercase">
                    {docTypeUpper}
                  </p>
                  <p className="text-lg font-mono font-bold text-slate-900 mt-1 bg-slate-50 px-3 py-1 rounded-lg border border-slate-200">
                    #{invoice.invoice_number || invoice.id.slice(0, 8)}
                  </p>
                </div>

                <div className="mt-3">
                  <span
                    className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                      invoice.status === 'paid'
                        ? 'bg-emerald-100 text-emerald-800'
                        : isSigned
                        ? 'bg-indigo-100 text-indigo-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {invoice.status === 'paid' ? (
                      <>
                        <CheckCircle className="w-3.5 h-3.5" /> Paid
                      </>
                    ) : isSigned ? (
                      <>
                        <ShieldCheck className="w-3.5 h-3.5" /> Approved & Signed
                      </>
                    ) : (
                      <>
                        <Clock className="w-3.5 h-3.5" /> {invoice.status.toUpperCase()}
                      </>
                    )}
                  </span>
                </div>
              </div>
            </div>

            {/* Recipient Billed To + Dates */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pb-8 border-b border-slate-200">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-2">
                  {isProposal ? 'PROPOSAL PREPARED FOR' : 'BILLED TO'}
                </p>
                <div className="border-l-3 border-slate-900 pl-4 py-1">
                  <p className="text-base font-bold text-slate-900">
                    {invoice.customer_name || 'Valued Client'}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">Client account / recipient</p>
                </div>
              </div>

              <div className="sm:text-right flex flex-col justify-between space-y-2">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-1">
                    DATE OF ISSUE
                  </p>
                  <p className="text-xs font-semibold text-slate-800">
                    {new Date(invoice.created_at).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                </div>

                {invoice.due_date && (
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-1">
                      {isProposal ? 'VALID UNTIL' : 'DUE DATE'}
                    </p>
                    <p className="text-xs font-bold text-red-600 bg-red-50 inline-block px-2.5 py-1 rounded border border-red-100">
                      {new Date(invoice.due_date).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Itemized Table */}
            <div className="overflow-hidden rounded-xl border border-slate-200">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-100/80 border-b border-slate-200">
                    <th className="text-left text-[11px] font-bold text-slate-600 uppercase tracking-[0.15em] py-3 px-5">
                      Description
                    </th>
                    <th className="text-right text-[11px] font-bold text-slate-600 uppercase tracking-[0.15em] py-3 px-5 w-20">
                      Qty
                    </th>
                    <th className="text-right text-[11px] font-bold text-slate-600 uppercase tracking-[0.15em] py-3 px-5 w-28">
                      Unit Price
                    </th>
                    <th className="text-right text-[11px] font-bold text-slate-600 uppercase tracking-[0.15em] py-3 px-5 w-32">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {invoice.line_items && invoice.line_items.length > 0 ? (
                    invoice.line_items.map((li) => (
                      <tr key={li.id || li.description} className="hover:bg-slate-50/60">
                        <td className="text-xs text-slate-900 font-semibold py-4 px-5">
                          {li.description}
                        </td>
                        <td className="text-xs text-slate-600 font-mono text-right py-4 px-5">
                          {li.quantity}
                        </td>
                        <td className="text-xs text-slate-600 font-mono text-right py-4 px-5">
                          {formatCurrency(li.unitPrice, currency, currencyDisplayMode)}
                        </td>
                        <td className="text-xs text-slate-900 font-bold font-mono text-right py-4 px-5">
                          {formatCurrency(li.quantity * li.unitPrice, currency, currencyDisplayMode)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr className="hover:bg-slate-50/60">
                      <td className="text-xs text-slate-900 font-semibold py-4 px-5">
                        Professional Services / Scope Deliverable
                      </td>
                      <td className="text-xs text-slate-600 font-mono text-right py-4 px-5">1</td>
                      <td className="text-xs text-slate-600 font-mono text-right py-4 px-5">
                        {formattedTotal}
                      </td>
                      <td className="text-xs text-slate-900 font-bold font-mono text-right py-4 px-5">
                        {formattedTotal}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Summary Totals */}
            <div className="flex justify-end">
              <div className="w-full sm:w-72 space-y-3 bg-slate-50 p-5 rounded-2xl border border-slate-200">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500 font-medium">Subtotal</span>
                  <span className="text-slate-900 font-semibold font-mono">
                    {formatCurrency(subtotal, currency, currencyDisplayMode)}
                  </span>
                </div>

                {discount > 0 && (
                  <div className="flex justify-between text-xs">
                    <span className="text-emerald-600 font-medium">Discount / Incentive</span>
                    <span className="text-emerald-600 font-semibold font-mono">
                      − {formatCurrency(discount, currency, currencyDisplayMode)}
                    </span>
                  </div>
                )}

                {taxRate > 0 && (
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500 font-medium">Tax ({taxRate}%)</span>
                    <span className="text-slate-900 font-semibold font-mono">
                      {formatCurrency(subtotal * (taxRate / 100), currency, currencyDisplayMode)}
                    </span>
                  </div>
                )}

                <div className="flex justify-between items-baseline pt-3 border-t border-slate-300">
                  <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
                    {invoice.status === 'paid' ? 'Total Paid' : `Total ${docTypeLabel} Amount`}
                  </span>
                  <span className="text-xl font-black text-slate-900 font-mono">
                    {formattedTotal}
                  </span>
                </div>

                {invoice.status !== 'paid' && (
                  <div className="pt-2 no-print">
                    <button
                      onClick={handlePayNow}
                      disabled={paying}
                      className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow transition-all flex items-center justify-center gap-2"
                    >
                      <CreditCard className="w-4 h-4" />
                      {paying ? 'Launching Paystack...' : 'Pay Online Now (Paystack)'}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Digital Signature Verified Seal (If signed!) */}
            {isSigned && (
              <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Verified Digital Signature Seal
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Digitally approved and timestamped
                    </p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2 border-t border-slate-200">
                  <div className="text-xs space-y-1">
                    <p className="font-bold text-slate-900">
                      Signer: {invoice.signer_name || invoice.customer_name || 'Authorized Signer'}
                    </p>
                    {invoice.signer_email && (
                      <p className="text-slate-500">Email: {invoice.signer_email}</p>
                    )}
                    <p className="text-slate-500 font-mono text-[11px]">
                      Date: {invoice.signed_at ? new Date(invoice.signed_at).toLocaleString() : new Date().toLocaleString()}
                    </p>
                  </div>

                  {invoice.signature_data && (
                    <div className="p-2 bg-white rounded-xl border border-slate-200 shadow-sm inline-block max-w-[200px]">
                      <img
                        src={invoice.signature_data}
                        alt="Digital Signature"
                        className="max-h-12 max-w-full object-contain mx-auto"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Notes & Terms */}
            {(() => {
              const cleanNotes = (invoice.notes || '')
                .replace(/<!--metadata:.*?-->/gs, '')
                .replace(/\[Tax Rate:.*?\]/gs, '')
                .trim();
              if (!cleanNotes) return null;
              return (
                <div className="pt-6 border-t border-slate-200 space-y-2">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">
                    NOTES & PAYMENT TERMS
                  </p>
                  <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-200 font-medium">
                    {cleanNotes}
                  </p>
                </div>
              );
            })()}

            {/* Document Footer */}
            <div className="text-center pt-8 border-t border-slate-200 text-slate-400 space-y-1">
              <p className="text-xs font-bold italic text-slate-500">
                Thank you for your business!
              </p>
              <p className="text-[10px] font-mono uppercase tracking-widest text-slate-400">
                {senderName} · Secure {docTypeLabel} Portal
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Signature Modal */}
      <SignatureModal
        open={signatureModalOpen}
        onClose={() => setSignatureModalOpen(false)}
        invoiceNumber={invoice.invoice_number || invoice.id.slice(0, 8)}
        documentType={docType}
        customerName={invoice.customer_name || ''}
        totalAmountFormatted={formattedTotal}
        onConfirmSign={handleConfirmSign}
      />
    </div>
  );
}
