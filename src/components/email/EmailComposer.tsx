import { useState, useEffect, useMemo, useRef } from 'react';
import { Mail, Copy, Send, Check, Paperclip, Loader2, MessageSquare, X } from 'lucide-react';
import { supabase, type Contact, type Invoice } from '../../lib/supabase';
import SearchableContactSelect from '../contacts/SearchableContactSelect';
import { useWorkspace } from '../../lib/workspace';
import { PageHeader, Card, EmptyState } from '../ui';
import { useToast } from '../../contexts/ToastContext';
import { useUserPreferences } from '../../lib/userPreferences';
import { formatCurrency } from '../../lib/currency';
import { logCardActivity } from '../../services/activityService';

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
    subject: 'Quick reminder about your balance ([InvoiceNumber])',
    body: `Hi [CustomerName],

Just a friendly note that your account with [BusinessName] currently shows an outstanding balance of [OutstandingBalance] for Invoice [InvoiceNumber].

💳 Pay Online Securely:
[PaymentLink]

📄 Download Invoice PDF:
[InvoiceLink]

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

export default function EmailComposer({
  initialContactId,
  initialChannel = 'email',
  onSent,
}: {
  initialContactId?: string;
  initialChannel?: 'email' | 'whatsapp';
  onSent?: () => void;
} = {}) {
  const { businessName, businessTagline } = useWorkspace();
  const { addToast } = useToast();
  const { currencyCode, currencyDisplayMode } = useUserPreferences();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateKey>('welcome');
  const [selectedContactId, setSelectedContactId] = useState(initialContactId || '');
  const [selectedInvoiceId, setSelectedInvoiceId] = useState('');
  const [invoiceLink, setInvoiceLink] = useState('');
  const [attaching, setAttaching] = useState(false);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [composerMode, setComposerMode] = useState<'email' | 'whatsapp'>(initialChannel);
  const [whatsappPhone, setWhatsappPhone] = useState('');
  const [savingPhone, setSavingPhone] = useState(false);
  const invoicePreviewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (initialContactId) setSelectedContactId(initialContactId);
  }, [initialContactId]);

  useEffect(() => {
    if (initialChannel) setComposerMode(initialChannel);
  }, [initialChannel]);

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

  // Auto-select invoice for selected customer when template is payment or thankyou
  useEffect(() => {
    if (selectedContact && (selectedTemplate === 'payment' || selectedTemplate === 'thankyou')) {
      const contactInvoices = invoices.filter(
        (inv) => inv.customer_name?.toLowerCase().trim() === selectedContact.name?.toLowerCase().trim()
      );
      if (contactInvoices.length > 0) {
        const unpaid = contactInvoices.find((inv) => inv.status !== 'paid');
        const target = unpaid || contactInvoices[0];
        if (target && target.id !== selectedInvoiceId) {
          setSelectedInvoiceId(target.id);
        }
      }
    }
  }, [selectedContact, selectedTemplate, invoices, selectedInvoiceId]);

  // Sync WhatsApp phone state when selected customer changes
  useEffect(() => {
    if (selectedContact) {
      setWhatsappPhone(selectedContact.phone || '');
    } else {
      setWhatsappPhone('');
    }
  }, [selectedContactId, selectedContact]);

  const handleUpdatePhone = async () => {
    if (!selectedContact) return;
    setSavingPhone(true);
    try {
      const { error } = await supabase
        .from('contacts')
        .update({ phone: whatsappPhone.trim() })
        .eq('id', selectedContact.id);

      if (error) throw error;

      // Update local contacts list so change propagates
      setContacts((prev) =>
        prev.map((c) => (c.id === selectedContact.id ? { ...c, phone: whatsappPhone.trim() } : c)),
      );
      addToast('success', 'Phone Updated', 'WhatsApp contact number saved successfully.');
    } catch (err) {
      console.error('Error saving phone:', err);
      const message = err instanceof Error ? err.message : String(err);
      addToast('error', 'Update Failed', message || 'Could not save phone number.');
    } finally {
      setSavingPhone(false);
    }
  };

  const composedEmail = useMemo(() => {
    const tmpl = templates[selectedTemplate];
    const customerName = selectedContact?.name ?? '[CustomerName]';
    const bizName = businessName ?? '[BusinessName]';
    const outstandingBalance = selectedInvoice
      ? formatCurrency(Number(selectedInvoice.amount), selectedInvoice.currency_code || currencyCode, currencyDisplayMode)
      : '[OutstandingBalance]';
    const invoiceNumber = selectedInvoice?.invoice_number ?? (selectedInvoice ? selectedInvoice.id.slice(0, 8) : '[InvoiceNumber]');
    const invoiceAmount = selectedInvoice
      ? formatCurrency(Number(selectedInvoice.amount), selectedInvoice.currency_code || currencyCode, currencyDisplayMode)
      : '[InvoiceAmount]';

    const portalUrl = selectedInvoice
      ? `${window.location.origin}/portal/${selectedInvoice.document_type || 'invoice'}/${selectedInvoice.id}`
      : '[PaymentLink]';

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
        .replace(/\[PaymentLink\]/g, portalUrl)
        .replace(/\[InvoiceLink\]/g, linkText);

    return { subject: replace(tmpl.subject), body: replace(tmpl.body) };
  }, [selectedTemplate, selectedContact, businessName, selectedInvoice, invoiceLink, currencyCode, currencyDisplayMode]);

  const composedWhatsApp = useMemo(() => {
    const subjectText = composedEmail.subject;
    let bodyText = composedEmail.body;

    // Remove the long placeholder instruction about PDF if present
    bodyText = bodyText.replace(/\(Click "Generate & attach invoice PDF" below to include the download link\.\)/g, '');

    // Format beautifully for WhatsApp (Bold title, clean body)
    return `*${subjectText}*\n\n${bodyText}`;
  }, [composedEmail]);

  const fullEmailText = `Subject: ${composedEmail.subject}\n\n${composedEmail.body}`;

  const handleCopy = async () => {
    try {
      const textToCopy = composerMode === 'whatsapp' ? composedWhatsApp : fullEmailText;
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      addToast('success', 'Copied!', `${composerMode === 'whatsapp' ? 'WhatsApp message' : 'Email text'} copied to clipboard.`);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      addToast('error', 'Copy Failed', 'Could not copy to clipboard.');
    }
  };

  const handleSendWhatsApp = async () => {
    if (!selectedContact) return;
    const phoneToUse = whatsappPhone.trim();
    if (!phoneToUse) {
      addToast('error', 'No Phone Number', 'Please enter a WhatsApp phone number.');
      return;
    }

    const cleanPhone = phoneToUse.replace(/\D/g, '');
    if (cleanPhone.length < 7) {
      addToast('error', 'Invalid Phone', 'Please enter a valid phone number with country code (e.g., 2348133852353).');
      return;
    }

    // Auto-mark invoice as Paid when sending a Thank You whatsapp message
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

    const text = encodeURIComponent(composedWhatsApp);
    const url = `https://wa.me/${cleanPhone}?text=${text}`;
    window.open(url, '_blank', 'noopener,noreferrer');
    addToast('success', 'Opening WhatsApp', 'Redirecting to WhatsApp web or app...');

    await logCardActivity({
      contact_id: selectedContact.id,
      type: 'message_sent',
      content: `WhatsApp sent (${templates[selectedTemplate].label})`,
    });
    onSent?.();
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

    await logCardActivity({
      contact_id: selectedContact.id,
      type: 'message_sent',
      content: `Email sent: ${composedEmail.subject}`,
    });
    onSent?.();
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
          <div className="lg:col-span-1 space-y-4 relative z-30">
            <Card className="p-5 space-y-4 relative z-30">
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

              <SearchableContactSelect
                label="Customer"
                contacts={contacts}
                value={selectedContactId}
                onChange={(val) => setSelectedContactId(val)}
                placeholder="Search or select a customer..."
              />

              {(selectedTemplate === 'thankyou' || selectedTemplate === 'payment') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    {selectedTemplate === 'payment' ? 'Invoice to attach & remind' : 'Invoice to attach'}
                  </label>
                  <select
                    value={selectedInvoiceId}
                    onChange={(e) => setSelectedInvoiceId(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all text-sm"
                  >
                    <option value="">Select an invoice...</option>
                    {invoices
                      .filter((inv) => !selectedContact || inv.customer_name?.toLowerCase().trim() === selectedContact.name?.toLowerCase().trim())
                      .map((inv) => (
                        <option key={inv.id} value={inv.id}>
                          {inv.invoice_number ?? inv.id.slice(0, 8)} — {formatCurrency(Number(inv.amount), inv.currency_code || currencyCode, currencyDisplayMode)} ({inv.status.toUpperCase()})
                        </option>
                      ))}
                  </select>
                  <button
                    onClick={handleAttachInvoice}
                    disabled={!selectedInvoice || attaching}
                    className="mt-2 w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-violet-500/30 text-violet-600 dark:text-violet-400 hover:bg-violet-500/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {attaching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Paperclip className="w-3.5 h-3.5" />}
                    {attaching ? 'Generating PDF...' : invoiceLink ? 'Re-generate PDF link' : 'Generate & attach invoice PDF'}
                  </button>
                  {invoiceLink && (
                    <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1.5 font-medium">✓ Permanent invoice PDF link generated and added.</p>
                  )}
                </div>
              )}

              {selectedContact && (
                <div className="pt-3 border-t border-gray-100 dark:border-gray-800 space-y-3">
                  <div className="space-y-1">
                    <p className="text-xs text-gray-400 dark:text-gray-500">Selected Contact</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{selectedContact.name}</p>
                    {selectedContact.email && <p className="text-xs text-gray-500 dark:text-gray-400">{selectedContact.email}</p>}
                    {selectedContact.company && <p className="text-xs text-gray-500 dark:text-gray-400">{selectedContact.company}</p>}
                  </div>

                  <div className="pt-2 border-t border-gray-100 dark:border-gray-800 space-y-1.5">
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1">
                      <MessageSquare className="w-3 h-3 text-emerald-500" /> WhatsApp Phone
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={whatsappPhone}
                        onChange={(e) => setWhatsappPhone(e.target.value)}
                        placeholder="e.g. 2348133852353"
                        className="flex-1 px-2.5 py-1.5 text-xs bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 transition-all"
                      />
                      {whatsappPhone.trim() !== (selectedContact.phone || '') && (
                        <button
                          onClick={handleUpdatePhone}
                          disabled={savingPhone}
                          className="px-2.5 py-1.5 bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold rounded-lg transition-all disabled:opacity-50"
                        >
                          {savingPhone ? '...' : 'Save'}
                        </button>
                      )}
                    </div>
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 leading-normal">
                      Include country code, omit spaces/symbols (e.g. 2348133852353).
                    </p>
                  </div>
                </div>
              )}
            </Card>
          </div>

          {/* Message Preview Tabbed Card */}
          <div className="lg:col-span-2 relative z-10">
            <Card className="p-5 flex flex-col h-full justify-between relative z-10">
              <div>
                {/* Channel Selector Tabs */}
                <div className="flex border-b border-gray-200 dark:border-gray-800 mb-4">
                  <button
                    onClick={() => setComposerMode('email')}
                    className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all ${
                      composerMode === 'email'
                        ? 'border-violet-600 text-violet-600 dark:text-violet-400 font-semibold'
                        : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                    }`}
                  >
                    <Mail className="w-4 h-4" />
                    Email Channel
                  </button>
                  <button
                    onClick={() => setComposerMode('whatsapp')}
                    className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all ${
                      composerMode === 'whatsapp'
                        ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 font-semibold'
                        : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                    }`}
                  >
                    <MessageSquare className="w-4 h-4" />
                    WhatsApp Channel
                  </button>
                </div>

                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {composerMode === 'email' ? 'Email Preview' : 'WhatsApp Preview'}
                  </h3>
                  <div className="flex gap-2">
                    <button
                      onClick={handleCopy}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                      {copied ? 'Copied!' : 'Copy Message'}
                    </button>
                    {composerMode === 'email' ? (
                      <button
                        onClick={handleSendEmail}
                        disabled={!selectedContact}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-violet-600 text-white hover:bg-violet-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Send className="w-3.5 h-3.5" /> Send Email
                      </button>
                    ) : (
                      <button
                        onClick={handleSendWhatsApp}
                        disabled={!selectedContact || !whatsappPhone.trim()}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <MessageSquare className="w-3.5 h-3.5" /> Send WhatsApp
                      </button>
                    )}
                  </div>
                </div>

                {composerMode === 'email' ? (
                  <textarea
                    readOnly
                    value={fullEmailText}
                    rows={20}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-200 font-mono leading-relaxed resize-none focus:outline-none"
                  />
                ) : (
                  <div className="rounded-xl overflow-hidden border border-gray-200 dark:border-gray-800 bg-[#efeae2] dark:bg-[#0b141a] p-4 flex flex-col h-[460px]">
                    {/* Mock WhatsApp Header */}
                    <div className="flex items-center gap-3 bg-[#f0f2f5] dark:bg-[#1f2c34] p-3 -mx-4 -mt-4 mb-4 border-b border-[#e9edef] dark:border-[#222e35]">
                      <div className="w-9 h-9 rounded-full bg-emerald-600 dark:bg-emerald-500 text-white flex items-center justify-center font-bold text-xs shadow-sm">
                        {selectedContact?.name ? selectedContact.name[0].toUpperCase() : 'C'}
                      </div>
                      <div className="text-left">
                        <p className="text-xs font-semibold text-gray-800 dark:text-gray-100 leading-tight">
                          {selectedContact?.name || 'Customer'}
                        </p>
                        <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">WhatsApp Contact</p>
                      </div>
                    </div>

                    {/* Bubble Container */}
                    <div className="flex-1 overflow-y-auto space-y-4 px-2 py-1 flex flex-col justify-end">
                      <div className="flex justify-end">
                        <div className="relative max-w-[85%] bg-[#d9fdd3] dark:bg-[#005c4b] text-gray-800 dark:text-gray-100 rounded-lg rounded-tr-none px-4 py-3 shadow-sm border border-[#e1f7d5] dark:border-[#025042] text-xs leading-relaxed text-left whitespace-pre-wrap">
                          {(() => {
                            // Render simple WhatsApp markdown formatting (*bold*)
                            const lines = composedWhatsApp.split('\n').map((line, idx) => {
                              const parts = line.split(/(\*[^*]+\*)/g);
                              const renderedLine = parts.map((part, pIdx) => {
                                if (part.startsWith('*') && part.endsWith('*')) {
                                  return <strong key={pIdx} className="font-bold">{part.slice(1, -1)}</strong>;
                                }
                                return part;
                              });
                              return (
                                <span key={idx}>
                                  {renderedLine}
                                  {idx < composedWhatsApp.split('\n').length - 1 && <br />}
                                </span>
                              );
                            });
                            return lines;
                          })()}
                          <div className="flex justify-end items-center gap-1 mt-1.5 text-[9px] text-gray-500 dark:text-gray-300">
                            <span>{new Date().toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}</span>
                            <span className="text-sky-500">✓✓</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Hidden invoice preview used for PDF generation */}
      {selectedInvoice && (() => {
        const senderName = localStorage.getItem('invoice_sender_name') || businessName || 'Sender Name';
        const senderTagline = localStorage.getItem('invoice_sender_tagline') || businessTagline || '';
        const senderAddress = localStorage.getItem('invoice_sender_address') || '';
        const senderPhone = localStorage.getItem('invoice_sender_phone') || '';
        const senderEmail = localStorage.getItem('invoice_sender_email') || '';
        const senderWebsite = localStorage.getItem('invoice_sender_website') || '';

        // Calculate pricing backwards if we have total, tax_rate, and discount
        const taxRate = Number(selectedInvoice.tax_rate) || 0;
        const discount = Number(selectedInvoice.discount) || 0;
        const total = Number(selectedInvoice.amount);
        const taxableBase = total / (1 + taxRate / 100);
        const subtotal = taxableBase + discount;
        const tax = taxableBase * (taxRate / 100);

        // Filter notes to remove the fallback bracketed text if it exists
        let cleanNotes = selectedInvoice.notes || '';
        if (cleanNotes.includes('[Tax Rate:')) {
          cleanNotes = cleanNotes.replace(/\[Tax Rate:.*Discount:.*\]/, '').trim();
        }

        const fmt = (v: number) => formatCurrency(v, selectedInvoice.currency_code || currencyCode, currencyDisplayMode, 2);

        const override = selectedInvoice.total_label_override;
        const label = override
          ? (override === 'paid' ? 'Total Paid' : 'Total Due')
          : (selectedInvoice.status === 'paid' ? 'Total Paid' : 'Total Due');

        return (
          <div style={{ position: 'fixed', left: '-10000px', top: 0, width: '760px', pointerEvents: 'none' }}>
            <div ref={invoicePreviewRef} className="overflow-hidden" style={{ width: '760px', background: '#ffffff' }}>
              {/* Accent Top Bar (Corporate Slate #1e293b) */}
              <div style={{ height: '12px', backgroundColor: '#1e293b', flexShrink: 0 }} />

              <div style={{ padding: '36px 40px 40px', fontFamily: 'Arial, sans-serif', color: '#1e1b4b', background: '#ffffff' }}>
                {/* Header: Sender details + Invoice meta */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #f1f5f9', paddingBottom: '24px', marginBottom: '24px' }}>
                  {/* Logo and Sender Profile */}
                  <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                    <div style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '12px',
                      backgroundColor: '#0f172a',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#ffffff',
                      fontWeight: '800',
                      fontSize: '20px',
                      letterSpacing: '0.05em'
                    }}>
                      {senderName[0]?.toUpperCase()}
                    </div>
                    <div style={{ textAlign: 'left' }}>
                      <p style={{ fontSize: '18px', fontWeight: '700', color: '#0f172a', margin: '0 0 2px', lineHeight: '1.2' }}>{senderName}</p>
                      {senderTagline && (
                        <p style={{ fontSize: '12px', color: '#64748b', margin: 0, fontWeight: '500' }}>{senderTagline}</p>
                      )}
                    </div>
                  </div>

                  {/* Invoice Identity */}
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: '10px', fontWeight: '700', letterSpacing: '0.2em', color: '#94a3b8', textTransform: 'uppercase', margin: '0 0 6px' }}>INVOICE</p>
                    <p style={{ fontFamily: 'monospace', fontSize: '14px', fontWeight: '600', color: '#334155', backgroundColor: '#f8fafc', padding: '4px 8px', borderRadius: '4px', border: '1px solid #f1f5f9', margin: 0, display: 'inline-block' }}>
                      {selectedInvoice.invoice_number ?? selectedInvoice.id.slice(0, 8)}
                    </p>
                  </div>
                </div>

                {/* Sender Address & contact info */}
                {(senderAddress || senderPhone || senderEmail || senderWebsite) && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', fontSize: '11px', color: '#64748b', backgroundColor: '#f8fafc', padding: '12px 16px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '24px', textAlign: 'left' }}>
                    {senderAddress && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ color: '#7c3aed', fontWeight: 'bold' }}>📍</span>
                        <span>{senderAddress}</span>
                      </div>
                    )}
                    {senderPhone && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ color: '#7c3aed', fontWeight: 'bold' }}>📞</span>
                        <span>{senderPhone}</span>
                      </div>
                    )}
                    {senderEmail && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ color: '#7c3aed', fontWeight: 'bold' }}>✉️</span>
                        <span>{senderEmail}</span>
                      </div>
                    )}
                    {senderWebsite && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ color: '#7c3aed', fontWeight: 'bold' }}>🌐</span>
                        <span>{senderWebsite}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Metadata Section: Billed To + Dates */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', borderBottom: '1px solid #f1f5f9', paddingBottom: '24px', marginBottom: '24px' }}>
                  <div style={{ textAlign: 'left' }}>
                    <p style={{ fontSize: '10px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.15em', margin: '0 0 8px' }}>Billed To</p>
                    <div style={{ borderLeft: '2px solid #0f172a', paddingLeft: '12px' }}>
                      <p style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a', margin: 0 }}>{selectedInvoice.customer_name ?? '—'}</p>
                      <p style={{ fontSize: '12px', color: '#64748b', marginTop: '4px', margin: 0 }}>Client account / recipient</p>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%' }}>
                    <div>
                      <p style={{ fontSize: '10px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.15em', margin: '0 0 4px' }}>Date of Issue</p>
                      <p style={{ fontSize: '12px', color: '#334155', fontWeight: '500', margin: 0 }}>
                        {new Date(selectedInvoice.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                      </p>
                    </div>
                    {selectedInvoice.due_date && (
                      <div style={{ marginTop: '12px' }}>
                        <p style={{ fontSize: '10px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.15em', margin: '0 0 4px' }}>Due Date</p>
                        <p style={{ fontSize: '12px', color: '#b91c1c', fontWeight: '600', backgroundColor: '#fef2f2', display: 'inline-block', padding: '2px 8px', borderRadius: '4px', border: '1px solid #fee2e2', margin: 0 }}>
                          {new Date(selectedInvoice.due_date).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Line Items Table */}
                <div style={{ overflow: 'hidden', borderRadius: '8px', border: '1px solid #f1f5f9', marginBottom: '24px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                        <th style={{ textAlign: 'left', fontSize: '10px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.15em', padding: '10px 16px' }}>Description</th>
                        <th style={{ textAlign: 'right', fontSize: '10px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.15em', padding: '10px 16px', width: '56px' }}>Qty</th>
                        <th style={{ textAlign: 'right', fontSize: '10px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.15em', padding: '10px 16px', width: '96px' }}>Unit Price</th>
                        <th style={{ textAlign: 'right', fontSize: '10px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.15em', padding: '10px 16px', width: '112px' }}>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ fontSize: '12px', color: '#1e293b', fontWeight: '600', padding: '12px 16px', textAlign: 'left' }}>Professional Services & Deliverables</td>
                        <td style={{ fontSize: '12px', color: '#475569', fontFamily: 'monospace', padding: '12px 16px', textAlign: 'right' }}>1</td>
                        <td style={{ fontSize: '12px', color: '#475569', fontFamily: 'monospace', padding: '12px 16px', textAlign: 'right' }}>{fmt(subtotal)}</td>
                        <td style={{ fontSize: '12px', color: '#0f172a', fontWeight: '700', fontFamily: 'monospace', padding: '12px 16px', textAlign: 'right' }}>{fmt(subtotal)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Summary Calculations */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '24px' }}>
                  <div style={{ width: '256px', backgroundColor: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                      <span style={{ color: '#475569', fontWeight: '500' }}>Subtotal</span>
                      <span style={{ color: '#0f172a', fontWeight: '600', fontFamily: 'monospace' }}>{fmt(subtotal)}</span>
                    </div>
                    {discount > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                        <span style={{ color: '#10b981', fontWeight: '500' }}>Incentive discount</span>
                        <span style={{ color: '#10b981', fontWeight: '600', fontFamily: 'monospace' }}>− {fmt(discount)}</span>
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                      <span style={{ color: '#475569', fontWeight: '500' }}>Tax ({taxRate}%)</span>
                      <span style={{ color: '#0f172a', fontWeight: '600', fontFamily: 'monospace' }}>{fmt(tax)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', paddingTop: '10px', borderTop: '1px solid #e2e8f0', marginTop: '4px' }}>
                      <span style={{ fontSize: '12px', fontWeight: '700', color: '#334155', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
                      <span style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', fontFamily: 'monospace' }}>{fmt(total)}</span>
                    </div>
                  </div>
                </div>

                {/* Notes & Terms */}
                {cleanNotes.trim() && (
                  <div style={{ paddingTop: '20px', borderTop: '1px solid #f1f5f9', textAlign: 'left' }}>
                    <p style={{ fontSize: '10px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.15em', margin: '0 0 6px' }}>Notes & Payment Terms</p>
                    <p style={{ fontSize: '12px', color: '#475569', whiteSpace: 'pre-wrap', lineHeight: '1.6', backgroundColor: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #f1f5f9', margin: 0, fontWeight: '500' }}>{cleanNotes}</p>
                  </div>
                )}

                <div style={{ textAlign: 'center', paddingTop: '24px', borderTop: '1px solid #f1f5f9', marginTop: '24px' }}>
                  <p style={{ fontSize: '12px', fontWeight: '600', fontStyle: 'italic', color: '#94a3b8', margin: '0 0 4px' }}>Thank you for your business!</p>
                  <p style={{ fontSize: '9px', color: '#cbd5e1', fontFamily: 'monospace', margin: 0, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{senderName} · Secured Invoice System</p>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

export function EmailComposerModal({
  open,
  onClose,
  initialContactId,
  initialChannel = 'email',
  onSent,
}: {
  open: boolean;
  onClose: () => void;
  initialContactId?: string;
  initialChannel?: 'email' | 'whatsapp';
  onSent?: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-4xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl max-h-[92vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800 shrink-0">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            {initialChannel === 'whatsapp' ? (
              <>
                <MessageSquare className="w-5 h-5 text-emerald-500" />
                Send WhatsApp Message
              </>
            ) : (
              <>
                <Mail className="w-5 h-5 text-violet-500" />
                Send Email
              </>
            )}
          </h2>
          <button onClick={onClose} aria-label="Close modal" className="text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          <EmailComposer
            initialContactId={initialContactId}
            initialChannel={initialChannel}
            onSent={() => {
              onSent?.();
              onClose();
            }}
          />
        </div>
      </div>
    </div>
  );
}
