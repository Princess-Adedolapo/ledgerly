import { useState, useEffect, useMemo, useRef } from 'react';
import { Mail, Copy, Send, Check, Paperclip, Loader2 } from 'lucide-react';
import { supabase, type Contact, type Invoice } from '../../lib/supabase';
import { useWorkspace } from '../../lib/workspace';
import { PageHeader, Card, EmptyState } from '../ui';
import { useToast } from '../../contexts/ToastContext';
import { useUserPreferences } from '../../lib/userPreferences';
import { formatCurrency } from '../../lib/currency';

type TemplateKey = 'welcome' | 'payment' | 'support' | 'thankyou';

const templates: Record<TemplateKey, { label: string; subject: string; body: string }> = {
  welcome: {
    label: 'Welcome Onboarding',
    subject: 'Welcome to [BusinessName]',
    body: `Hi [CustomerName],

Thanks for choosing [BusinessName]. We're glad to have you with us.

Over the next few days we'll help you get set up. If you have any questions in the meantime, just reply to this note and we'll get back to you.

Best,
The [BusinessName] team

—
You're receiving this because you signed up with [BusinessName]. Reply STOP if you'd prefer not to hear from us.`,
  },
  payment: {
    label: 'Payment Reminder',
    subject: 'Quick reminder about your balance',
    body: `Hi [CustomerName],

Just a friendly note that your account with [BusinessName] currently shows an outstanding balance of [OutstandingBalance]. Whenever it's convenient, please settle it at your earliest opportunity.

If you've already sent payment, please disregard this message and accept our thanks.

Best,
The [BusinessName] team

—
Reply to this email if you have any questions. Reply STOP to opt out.`,
  },
  support: {
    label: 'Support Update',
    subject: 'Update on your support request',
    body: `Hi [CustomerName],

A quick update on your recent request: our team is actively working on it and we wanted to keep you in the loop on our progress.

We'll write again as soon as we have more to share.

Best,
The [BusinessName] team

—
Reply to this email if you have any questions.`,
  },
  thankyou: {
    label: 'Thank You for Your Purchase',
    subject: 'Thanks for your purchase',
    body: `Hi [CustomerName],

Thanks so much for your purchase. We really appreciate your trust in [BusinessName].

Your invoice [InvoiceNumber] for [InvoiceAmount] is ready:
[InvoiceLink]

If you have any questions about it, just reply to this note.

Warm regards,
The [BusinessName] team

—
You're receiving this because you made a purchase with [BusinessName]. Reply STOP to opt out.`,
  },
};

const templateOptions: { value: TemplateKey; label: string }[] = [
  { value: 'welcome', label: 'Welcome Onboarding' },
  { value: 'payment', label: 'Payment Reminder' },
  { value: 'support', label: 'Support Update' },
  { value: 'thankyou', label: 'Thank You for Your Purchase' },
];

export default function EmailComposer() {
  const { businessName } = useWorkspace();
  const { addToast } = useToast();
  const { currencyCode, currencyDisplayMode } = useUserPreferences();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateKey>('welcome');
  const [selectedContactId, setSelectedContactId] = useState('');
  const [selectedInvoiceId, setSelectedInvoiceId] = useState('');
  const [invoiceLink, setInvoiceLink] = useState('');
  const [attaching, setAttaching] = useState(false);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const invoicePreviewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function load() {
      // Import inside effect to avoid a top-level cycle
      const { tryGetActiveWorkspaceId } = await import('../../lib/activeWorkspace');
      const wsId = tryGetActiveWorkspaceId();
      if (!wsId) { setLoading(false); return; }
      const [c, i] = await Promise.all([
        supabase.from('contacts').select('*').eq('workspace_id', wsId).order('name', { ascending: true }),
        supabase.from('invoices').select('*').eq('workspace_id', wsId).order('created_at', { ascending: false }),
      ]);
      setContacts((c.data ?? []) as Contact[]);
      setInvoices((i.data ?? []) as Invoice[]);
      setLoading(false);
    }
    load();
  }, []);

  const selectedContact = contacts.find((c) => c.id === selectedContactId);
  const selectedInvoice = invoices.find((inv) => inv.id === selectedInvoiceId);

  // Reset invoice link when invoice or template changes
  useEffect(() => {
    setInvoiceLink('');
  }, [selectedInvoiceId, selectedTemplate]);

  const composedEmail = useMemo(() => {
    const tmpl = templates[selectedTemplate];
    const customerName = selectedContact?.name ?? '[CustomerName]';
    const bizName = businessName ?? '[BusinessName]';
    const outstandingBalance = selectedInvoice
      ? formatCurrency(Number(selectedInvoice.amount), currencyCode, currencyDisplayMode)
      : '0.00';
    const invoiceNumber = selectedInvoice?.invoice_number ?? '[InvoiceNumber]';
    const invoiceAmount = selectedInvoice
      ? formatCurrency(Number(selectedInvoice.amount), currencyCode, currencyDisplayMode)
      : '[InvoiceAmount]';
    const linkText = invoiceLink
      ? `Download your invoice PDF: ${invoiceLink}`
      : selectedInvoice
        ? '(Click "Generate & attach invoice PDF" below to include the download link.)'
        : '[InvoiceLink]';

    const replace = (s: string) =>
      s
        .replace(/\[CustomerName\]/g, customerName)
        .replace(/\[BusinessName\]/g, bizName)
        .replace(/\[OutstandingBalance\]/g, outstandingBalance)
        .replace(/\[InvoiceNumber\]/g, invoiceNumber)
        .replace(/\[InvoiceAmount\]/g, invoiceAmount)
        .replace(/\[InvoiceLink\]/g, linkText);

    return { subject: replace(tmpl.subject), body: replace(tmpl.body) };
  }, [selectedTemplate, selectedContact, businessName, selectedInvoice, invoiceLink, currencyCode, currencyDisplayMode]);

  const fullEmailText = `Subject: ${composedEmail.subject}\n\n${composedEmail.body}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(fullEmailText);
      setCopied(true);
      addToast('success', 'Copied!', 'Email text copied to clipboard.');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      addToast('error', 'Copy Failed', 'Could not copy to clipboard.');
    }
  };

  const handleSendEmail = async () => {
    if (!selectedContact?.email) {
      addToast('error', 'No Email', 'Selected contact has no email address.');
      return;
    }
    // Auto-mark invoice as Paid when sending a Thank You email
    if (selectedTemplate === 'thankyou' && selectedInvoice && selectedInvoice.status !== 'paid') {
      const { error } = await supabase
        .from('invoices')
        .update({ status: 'paid' })
        .eq('id', selectedInvoice.id);
      if (!error) {
        setInvoices((prev) =>
          prev.map((i) => (i.id === selectedInvoice.id ? { ...i, status: 'paid' } : i)),
        );
        addToast('success', 'Invoice marked as Paid', `Invoice ${selectedInvoice.invoice_number ?? ''} updated.`);
      }
    }
    const subject = encodeURIComponent(composedEmail.subject);
    const body = encodeURIComponent(composedEmail.body);
    window.location.href = `mailto:${selectedContact.email}?subject=${subject}&body=${body}`;
  };


  const handleAttachInvoice = async () => {
    if (!selectedInvoice || !invoicePreviewRef.current) return;
    setAttaching(true);
    try {
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr || !userData.user) throw userErr ?? new Error('Not authenticated');
      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF } = await import('jspdf');
      const canvas = await html2canvas(invoicePreviewRef.current, { scale: 2, backgroundColor: '#ffffff', logging: false });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      const blob = pdf.output('blob');
      const fileName = `${selectedInvoice.invoice_number ?? selectedInvoice.id}.pdf`;
      // Scope path by user_id so storage RLS can enforce per-user ownership.
      const path = `${userData.user.id}/${selectedInvoice.id}/${fileName}`;
      const { error: upErr } = await supabase.storage.from('invoices').upload(path, blob, {
        contentType: 'application/pdf',
        upsert: true,
      });
      if (upErr) throw upErr;
      const { data: signed, error: signErr } = await supabase.storage
        .from('invoices')
        .createSignedUrl(path, 60 * 60 * 24 * 365 * 100); // ~100 years (permanent)
      if (signErr) throw signErr;
      setInvoiceLink(signed.signedUrl);
      addToast('success', 'Invoice attached', 'A permanent download link was added to the email body.');

    } catch (err) {
      addToast('error', 'Attach Failed', err instanceof Error ? err.message : 'Could not attach invoice.');
    } finally {
      setAttaching(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 md:p-8 max-w-4xl mx-auto">
        <PageHeader title="Email Composer" subtitle="Loading..." />
        <div className="h-64 bg-gray-100 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-800 rounded-xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto">
      <PageHeader
        title="Email Composer"
        subtitle="Compose professional emails from pre-built templates"
      />

      {contacts.length === 0 ? (
        <Card className="p-0">
          <EmptyState icon={Mail} title="No contacts available" subtitle="Add contacts first to use the email composer" />
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Controls */}
          <div className="lg:col-span-1 space-y-4">
            <Card className="p-5 space-y-4">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Configuration</h3>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Template</label>
                <select
                  value={selectedTemplate}
                  onChange={(e) => setSelectedTemplate(e.target.value as TemplateKey)}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all"
                >
                  {templateOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Customer</label>
                <select
                  value={selectedContactId}
                  onChange={(e) => setSelectedContactId(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all"
                >
                  <option value="" disabled>Select a customer...</option>
                  {contacts.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}{c.company ? ` — ${c.company}` : ''}</option>
                  ))}
                </select>
              </div>

              {selectedTemplate === 'thankyou' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Invoice to attach</label>
                  <select
                    value={selectedInvoiceId}
                    onChange={(e) => setSelectedInvoiceId(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all"
                  >
                    <option value="">Select an invoice...</option>
                    {invoices
                      .filter((inv) => !selectedContact || inv.customer_name === selectedContact.name)
                      .map((inv) => (
                        <option key={inv.id} value={inv.id}>
                          {inv.invoice_number ?? inv.id.slice(0, 8)} — {formatCurrency(Number(inv.amount), currencyCode, currencyDisplayMode)}
                        </option>
                      ))}
                  </select>
                  <button
                    onClick={handleAttachInvoice}
                    disabled={!selectedInvoice || attaching}
                    className="mt-2 w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-violet-500/30 text-violet-600 dark:text-violet-400 hover:bg-violet-500/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {attaching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Paperclip className="w-3.5 h-3.5" />}
                    {attaching ? 'Generating PDF...' : invoiceLink ? 'Re-generate link' : 'Generate & attach invoice PDF'}
                  </button>
                  {invoiceLink && (
                    <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1.5">✓ Link added to email (valid 30 days).</p>
                  )}
                </div>
              )}

              {selectedContact && (
                <div className="pt-3 border-t border-gray-100 dark:border-gray-800 space-y-1.5">
                  <p className="text-xs text-gray-400 dark:text-gray-500">Selected Contact</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{selectedContact.name}</p>
                  {selectedContact.email && <p className="text-xs text-gray-500 dark:text-gray-400">{selectedContact.email}</p>}
                  {selectedContact.company && <p className="text-xs text-gray-500 dark:text-gray-400">{selectedContact.company}</p>}
                </div>
              )}
            </Card>
          </div>

          {/* Email preview */}
          <div className="lg:col-span-2">
            <Card className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Email Preview</h3>
                <div className="flex gap-2">
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? 'Copied!' : 'Copy to Clipboard'}
                  </button>
                  <button
                    onClick={handleSendEmail}
                    disabled={!selectedContact}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-violet-600 text-white hover:bg-violet-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send className="w-3.5 h-3.5" /> Send Email
                  </button>
                </div>
              </div>

              <textarea
                readOnly
                value={fullEmailText}
                rows={20}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-200 font-mono leading-relaxed resize-none focus:outline-none"
              />
            </Card>
          </div>
        </div>
      )}

      {/* Hidden invoice preview used for PDF generation */}
      {selectedInvoice && (
        <div style={{ position: 'fixed', left: '-10000px', top: 0, width: '760px', pointerEvents: 'none' }}>
          <div ref={invoicePreviewRef} className="overflow-hidden" style={{ width: '760px', background: '#faf9ff' }}>
            {/* Violet gradient banner */}
            <div
              style={{
                background: 'linear-gradient(135deg, #4c1d95 0%, #7c3aed 55%, #a78bfa 100%)',
                padding: '36px 40px 44px',
                color: '#ffffff',
                position: 'relative',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <p style={{ fontSize: 11, letterSpacing: 4, textTransform: 'uppercase', margin: 0, opacity: 0.8 }}>Invoice</p>
                  <p style={{ fontSize: 26, fontWeight: 700, margin: '6px 0 0', letterSpacing: -0.5 }}>{businessName}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', margin: 0, opacity: 0.7 }}>Reference</p>
                  <p style={{ fontFamily: 'monospace', fontSize: 15, marginTop: 4, fontWeight: 600 }}>
                    {selectedInvoice.invoice_number ?? selectedInvoice.id.slice(0, 8)}
                  </p>
                </div>
              </div>
              {/* Decorative accent bars */}
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 4, background: 'linear-gradient(90deg,#f0abfc,#a78bfa,#6366f1)' }} />
            </div>

            <div style={{ padding: '32px 40px 40px', fontFamily: 'Arial, sans-serif', color: '#1e1b4b', background: '#ffffff' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 28 }}>
                <div style={{ padding: 16, background: '#f5f3ff', borderRadius: 10, borderLeft: '3px solid #7c3aed' }}>
                  <p style={{ fontSize: 10, color: '#7c3aed', textTransform: 'uppercase', letterSpacing: 2, margin: 0, fontWeight: 600 }}>Billed To</p>
                  <p style={{ fontSize: 15, fontWeight: 600, margin: '6px 0 0', color: '#1e1b4b' }}>{selectedInvoice.customer_name ?? '—'}</p>
                </div>
                <div style={{ padding: 16, background: '#f5f3ff', borderRadius: 10, borderLeft: '3px solid #7c3aed' }}>
                  <p style={{ fontSize: 10, color: '#7c3aed', textTransform: 'uppercase', letterSpacing: 2, margin: 0, fontWeight: 600 }}>Issued</p>
                  <p style={{ fontSize: 14, color: '#1e1b4b', margin: '6px 0 0' }}>
                    {new Date(selectedInvoice.created_at).toLocaleDateString()}
                  </p>
                  {selectedInvoice.due_date && (
                    <>
                      <p style={{ fontSize: 10, color: '#7c3aed', textTransform: 'uppercase', letterSpacing: 2, marginTop: 10, marginBottom: 0, fontWeight: 600 }}>Due</p>
                      <p style={{ fontSize: 14, color: '#1e1b4b', margin: '4px 0 0' }}>{new Date(selectedInvoice.due_date).toLocaleDateString()}</p>
                    </>
                  )}
                </div>
              </div>

              {/* Total block */}
              {(() => {
                const override = selectedInvoice.total_label_override;
                const label = override
                  ? (override === 'paid' ? 'Total Paid' : 'Total Due')
                  : (selectedInvoice.status === 'paid' ? 'Total Paid' : 'Total Due');
                const isPaid = label === 'Total Paid';
                return (
                  <div
                    style={{
                      marginTop: 8,
                      padding: '20px 24px',
                      background: isPaid
                        ? 'linear-gradient(135deg,#065f46,#10b981)'
                        : 'linear-gradient(135deg,#4c1d95,#7c3aed)',
                      borderRadius: 12,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      color: '#ffffff',
                    }}
                  >
                    <span style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 2, opacity: 0.9 }}>{label}</span>
                    <span style={{ fontSize: 28, fontWeight: 700, letterSpacing: -0.5 }}>
                      {formatCurrency(Number(selectedInvoice.amount), currencyCode, currencyDisplayMode)}
                    </span>
                  </div>
                );
              })()}

              {selectedInvoice.notes && (
                <div style={{ marginTop: 24, padding: 16, background: '#faf5ff', borderRadius: 10 }}>
                  <p style={{ fontSize: 10, color: '#7c3aed', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 6, fontWeight: 600 }}>Notes</p>
                  <p style={{ fontSize: 13, color: '#4b5563', whiteSpace: 'pre-wrap', margin: 0 }}>{selectedInvoice.notes}</p>
                </div>
              )}
              <p style={{ fontSize: 12, color: '#a78bfa', marginTop: 32, textAlign: 'center', fontWeight: 500, letterSpacing: 1 }}>
                Thank you for your business
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
