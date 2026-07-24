import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase, type Contact, type Note, type Invoice, type WorkflowCard, type WorkflowColumn, CONTACT_STATUSES } from '../lib/supabase';
import { useToast } from '../contexts/ToastContext';
import { Card, StatusBadge, Button, Input, Select, Modal, EmptyState } from '../components/ui';
import { useUserPreferences } from '../lib/userPreferences';
import { formatCurrency } from '../lib/currency';
import { useActivityLog } from '../contexts/ActivityLogContext';
import { useActiveWorkspaceId } from '../lib/workspace';
import { createWorkflowCard, ensureWorkflowColumns } from '../services/workflowService';
import { GenerateInvoiceModal, type InvoiceData } from '../components/invoices/GenerateInvoiceModal';
import {
  ArrowLeft, Mail, Phone, Building2, Pencil, Trash2, Plus, Clock, KanbanSquare,
  FileText, Send, MessageSquare, Tag, X, Bell, Calendar, CalendarDays, CheckSquare, ExternalLink
} from 'lucide-react';
import {
  getContactTags,
  saveContactTags,
  getContactCustomFields,
  saveContactCustomFields,
  DEFAULT_SUGGESTED_TAGS,
  type CustomField,
} from '../utils/contactMeta';
import {
  getContactFollowUp,
  saveContactFollowUp,
  getFollowUpStatusInfo,
  type FollowUpMeta,
} from '../utils/followUpMeta';
import {
  getGoogleCalendarUrl,
  getOutlookCalendarUrl,
  downloadICSFile,
} from '../utils/ics';
import { FollowUpSchedulerModal } from '../components/followup/FollowUpSchedulerModal';

export default function ContactDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const workspaceId = useActiveWorkspaceId();
  const { currencyCode, currencyDisplayMode } = useUserPreferences();
  const { addToast } = useToast();
  const { getContactActivity, logActivity } = useActivityLog();

  const [contact, setContact] = useState<Contact | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [workflowCards, setWorkflowCards] = useState<WorkflowCard[]>([]);
  const [workflowCols, setWorkflowCols] = useState<WorkflowColumn[]>([]);
  const [loading, setLoading] = useState(true);

  // Active Tab
  const [activeTab, setActiveTab] = useState<'overview' | 'invoices' | 'workflow' | 'messages' | 'notes'>('overview');

  // Edit contact modal
  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState({ 
    name: '', 
    email: '', 
    phone: '', 
    company: '', 
    status: 'Lead',
    description_type: 'Other / Uncategorized',
    description_note: ''
  });
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  // Note form
  const [noteBody, setNoteBody] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  // New Invoice Modal
  const [generateInvoiceOpen, setGenerateInvoiceOpen] = useState(false);

  // New Workflow Card Modal
  const [addCardOpen, setAddCardOpen] = useState(false);
  const [cardColId, setCardColId] = useState('');
  const [cardPriority, setCardPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [cardStatusNote, setCardStatusNote] = useState('');
  const [cardDueDate, setCardDueDate] = useState('');
  const [cardAssignee, setCardAssignee] = useState('');
  const [savingCard, setSavingCard] = useState(false);

  // Quick Message state
  const [quickMessage, setQuickMessage] = useState('');
  const [sendingMsg, setSendingMsg] = useState(false);

  // Tags and Custom Fields
  const [tags, setTags] = useState<string[]>([]);
  const [newTagInput, setNewTagInput] = useState('');
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [isAddingField, setIsAddingField] = useState(false);
  const [newFieldKey, setNewFieldKey] = useState('');
  const [newFieldValue, setNewFieldValue] = useState('');

  // Follow-up state
  const [followUp, setFollowUp] = useState<FollowUpMeta | null>(null);
  const [schedulerOpen, setSchedulerOpen] = useState(false);

  const DESCRIPTION_TYPES = [
    'Other / Uncategorized',
    'General Inquiry',
    'Product/Service Interest',
    'Support & Complaint'
  ];

  const load = useCallback(async () => {
    if (!id || !workspaceId) return;
    setLoading(true);
    try {
      // Load tags, custom fields, and follow-up
      setTags(getContactTags(id));
      setCustomFields(getContactCustomFields(id));
      setFollowUp(getContactFollowUp(id));

      const [c, n, wc] = await Promise.all([
        supabase.from('contacts').select('*').eq('id', id).maybeSingle(),
        supabase.from('notes').select('*').eq('contact_id', id).order('created_at', { ascending: false }),
        supabase.from('workflow_cards').select('*').eq('contact_id', id).order('moved_at', { ascending: false }),
      ]);
      
      if (c.error) throw new Error(c.error.message);

      let loadedContact = c.data as Contact | null;
      if (loadedContact) {
        try {
          const fallbackData = localStorage.getItem(`contact_fallback_${loadedContact.id}`);
          if (fallbackData) {
            const parsed = JSON.parse(fallbackData);
            loadedContact = {
              ...loadedContact,
              description_type: loadedContact.description_type || parsed.description_type || null,
              description_note: loadedContact.description_note || parsed.description_note || null
            };
          }
        } catch (e) {
          console.error('Error loading fallback contact info', e);
        }

        // Fetch invoices for this contact name
        const invRes = await supabase
          .from('invoices')
          .select('*')
          .eq('workspace_id', workspaceId)
          .eq('customer_name', loadedContact.name)
          .order('created_at', { ascending: false });

        if (!invRes.error) {
          setInvoices((invRes.data ?? []) as Invoice[]);
        }
      }

      setContact(loadedContact);
      setNotes((n.data ?? []) as Note[]);
      setWorkflowCards((wc.data ?? []) as WorkflowCard[]);

      // Load workflow columns
      const cols = await ensureWorkflowColumns();
      setWorkflowCols(cols);
      if (cols.length > 0) setCardColId(cols[0].id);

    } catch (err) {
      console.error('Failed to load contact details:', err);
      const message = err instanceof Error ? err.message : String(err);
      const isFetchError = message.toLowerCase().includes('failed to fetch') || message.toLowerCase().includes('load');
      const friendlyMsg = isFetchError
        ? 'Network error. Please check your connection or reload the page.'
        : message || 'Could not load contact details.';
      addToast('error', 'Error Loading Details', friendlyMsg);
    } finally {
      setLoading(false);
    }
  }, [id, workspaceId, addToast]);

  useEffect(() => {
    load();
  }, [load]);

  const openEdit = () => {
    if (!contact) return;
    setForm({ 
      name: contact.name, 
      email: contact.email ?? '', 
      phone: contact.phone ?? '', 
      company: contact.company ?? '', 
      status: contact.status,
      description_type: contact.description_type || 'Other / Uncategorized',
      description_note: contact.description_note ?? ''
    });
    setError(null);
    setEditOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contact) return;
    setError(null);
    
    let { error: updateError } = await supabase
      .from('contacts')
      .update({ 
        name: form.name.trim(), 
        email: form.email.trim() || null, 
        phone: form.phone.trim() || null, 
        company: form.company.trim() || null, 
        status: form.status,
        description_type: form.description_type,
        description_note: form.description_note.trim() || null
      })
      .eq('id', contact.id);

    if (updateError && (updateError.message.includes('column') || updateError.code === '42703')) {
      const retryResult = await supabase
        .from('contacts')
        .update({ 
          name: form.name.trim(), 
          email: form.email.trim() || null, 
          phone: form.phone.trim() || null, 
          company: form.company.trim() || null, 
          status: form.status
        })
        .eq('id', contact.id);
      
      updateError = retryResult.error;
      if (!updateError) {
        try {
          const localKey = `contact_fallback_${contact.id}`;
          localStorage.setItem(localKey, JSON.stringify({
            description_type: form.description_type,
            description_note: form.description_note.trim() || null
          }));
        } catch (e) {
          console.error(e);
        }
        addToast('success', 'Contact Updated', 'Details saved.');
      }
    }

    if (updateError) {
      setError(updateError.message);
    } else {
      setEditOpen(false);
      load();
    }
  };

  const handleDelete = async () => {
    if (!contact) return;
    try {
      await supabase.from('notes').delete().eq('contact_id', contact.id);
      await supabase.from('deals').delete().eq('contact_id', contact.id);
      await supabase.from('workflow_cards').delete().eq('contact_id', contact.id);

      const { error: deleteError } = await supabase.from('contacts').delete().eq('id', contact.id);
      if (deleteError) {
        addToast('error', 'Delete Failed', deleteError.message);
      } else {
        addToast('success', 'Contact Deleted', `"${contact.name}" has been deleted.`);
        try {
          localStorage.removeItem(`contact_fallback_${contact.id}`);
        } catch (e) {
          console.error(e);
        }
        setDeleteConfirmOpen(false);
        navigate('/contacts');
      }
    } catch (err) {
      console.error(err);
      addToast('error', 'Delete Failed', 'Could not delete contact.');
    }
  };

  const addNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contact || !noteBody.trim()) return;
    setSavingNote(true);
    await supabase.from('notes').insert({ contact_id: contact.id, body: noteBody.trim(), workspace_id: contact.workspace_id });
    logActivity('contact', `Added note to contact '${contact.name}'`, contact.id);
    setNoteBody('');
    setSavingNote(false);
    load();
  };

  const deleteNote = async (noteId: string) => {
    await supabase.from('notes').delete().eq('id', noteId);
    load();
  };

  const handleSaveInvoice = async (data: InvoiceData) => {
    if (!workspaceId || !contact) return;
    const { error: err } = await supabase.from('invoices').insert({
      workspace_id: workspaceId,
      invoice_number: data.invoiceNumber,
      customer_name: contact.name,
      amount: data.total,
      currency: data.currencyCode,
      status: 'pending',
      due_date: data.dueDate,
      line_items: data.lineItems,
      notes: data.notes,
    });
    if (err) {
      addToast('error', 'Failed to Create Invoice', err.message);
      return;
    }
    logActivity('invoice', `Generated Invoice #${data.invoiceNumber} for ${contact.name}`, contact.id);
    addToast('success', 'Invoice Created', `Invoice #${data.invoiceNumber} created for ${contact.name}`);
    setGenerateInvoiceOpen(false);
    load();
  };

  const handleAddCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contact || !cardColId) return;
    setSavingCard(true);
    try {
      await createWorkflowCard({
        contact_id: contact.id,
        column_id: cardColId,
        title: contact.company ? `${contact.name} (${contact.company})` : contact.name,
        priority: cardPriority,
        status_note: cardStatusNote.trim() || null,
        due_date: cardDueDate || null,
        assignee_name: cardAssignee.trim() || null,
      });
      addToast('success', 'Workflow Card Added', `Card added to workflow for ${contact.name}`);
      logActivity('workflow', `Created workflow card for '${contact.name}'`, contact.id);
      setAddCardOpen(false);
      setCardStatusNote('');
      setCardDueDate('');
      setCardAssignee('');
      load();
    } catch (err) {
      addToast('error', 'Card Error', err instanceof Error ? err.message : 'Could not add card');
    } finally {
      setSavingCard(false);
    }
  };

  const handleSendQuickMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contact || !quickMessage.trim()) return;
    setSendingMsg(true);
    logActivity('contact', `Sent communication message: "${quickMessage.trim()}"`, contact.id);
    addToast('success', 'Message Logged', `Message logged to ${contact.name}'s Customer 360 timeline.`);
    setQuickMessage('');
    setSendingMsg(false);
  };

  const handleQuickPresetFollowUp = (daysAhead: number) => {
    if (!contact) return;
    const target = new Date();
    target.setDate(target.getDate() + daysAhead);
    target.setHours(10, 0, 0, 0);
    const isoString = target.toISOString();

    const label = daysAhead === 1 ? '1 day' : daysAhead === 3 ? '3 days' : daysAhead === 7 ? '1 week' : `${daysAhead} days`;
    saveContactFollowUp(contact.id, {
      dueDate: isoString,
      note: `Scheduled follow-up in ${label}`,
      completed: false,
    });
    setFollowUp(getContactFollowUp(contact.id));
    logActivity('contact', `Set follow-up reminder for '${contact.name}' in ${label}`, contact.id);
    addToast('success', 'Follow-up Set', `Follow-up set for ${target.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}.`);
  };

  const handleToggleFollowUpComplete = () => {
    if (!contact || !followUp) return;
    const updated = { ...followUp, completed: !followUp.completed };
    saveContactFollowUp(contact.id, updated);
    setFollowUp(updated);
    addToast(
      updated.completed ? 'success' : 'info',
      updated.completed ? 'Follow-up Completed' : 'Follow-up Reopened',
      updated.completed ? `Marked follow-up as completed.` : `Reopened follow-up reminder.`
    );
  };

  // Tag Handlers
  const handleAddTag = (tagName: string) => {
    if (!contact) return;
    const trimmed = tagName.trim();
    if (!trimmed || tags.includes(trimmed)) return;
    const updated = [...tags, trimmed];
    setTags(updated);
    saveContactTags(contact.id, updated);
    setNewTagInput('');
    addToast('success', 'Tag Added', `Tag "${trimmed}" added.`);
  };

  const handleRemoveTag = (tagName: string) => {
    if (!contact) return;
    const updated = tags.filter((t) => t !== tagName);
    setTags(updated);
    saveContactTags(contact.id, updated);
  };

  // Custom Field Handlers
  const handleSaveCustomField = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contact || !newFieldKey.trim() || !newFieldValue.trim()) return;
    const newField: CustomField = {
      id: Date.now().toString(),
      key: newFieldKey.trim(),
      value: newFieldValue.trim(),
    };
    const updated = [...customFields, newField];
    setCustomFields(updated);
    saveContactCustomFields(contact.id, updated);
    setNewFieldKey('');
    setNewFieldValue('');
    setIsAddingField(false);
    addToast('success', 'Custom Field Added', `${newField.key} saved.`);
  };

  const handleDeleteCustomField = (cfId: string) => {
    if (!contact) return;
    const updated = customFields.filter((f) => f.id !== cfId);
    setCustomFields(updated);
    saveContactCustomFields(contact.id, updated);
  };

  // Computations
  const totalInvoiced = invoices.reduce((sum, inv) => sum + Number(inv.amount || 0), 0);
  const outstandingInvoiced = invoices
    .filter((inv) => inv.status !== 'paid')
    .reduce((sum, inv) => sum + Number(inv.amount || 0), 0);
  
  // Most recent open card
  const mostRecentCard = workflowCards[0];
  const currentColumn = workflowCols.find((c) => c.id === mostRecentCard?.column_id);

  const contactLogs = contact ? getContactActivity(contact.id) : [];

  if (loading) {
    return <div className="p-8 max-w-6xl mx-auto"><div className="h-48 bg-gray-100 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-800 rounded-xl animate-pulse" /></div>;
  }

  if (!contact) {
    return (
      <div className="p-8 max-w-6xl mx-auto">
        <Card className="p-6">
          <EmptyState icon={ArrowLeft} title="Contact not found" />
        </Card>
        <div className="mt-4">
          <Link to="/contacts" className="text-sm text-violet-600 dark:text-violet-400 hover:text-violet-500">← Back to contacts</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-6">
      <Link to="/contacts" className="inline-flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Contacts
      </Link>

      {/* Customer 360 Header Card */}
      <Card className="p-6">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-2xl font-bold text-white shadow-lg shrink-0">
              {contact.name[0]?.toUpperCase()}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{contact.name}</h1>
                <StatusBadge status={contact.status} />
                {contact.description_type && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20">
                    {contact.description_type}
                  </span>
                )}
              </div>
              
              <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-300">
                {contact.company && (
                  <span className="flex items-center gap-1.5"><Building2 className="w-4 h-4 text-gray-400" /> {contact.company}</span>
                )}
                {contact.email && (
                  <a href={`mailto:${contact.email}`} className="flex items-center gap-1.5 hover:text-violet-600 transition-colors">
                    <Mail className="w-4 h-4 text-gray-400" /> {contact.email}
                  </a>
                )}
                {contact.phone && (
                  <span className="flex items-center gap-1.5"><Phone className="w-4 h-4 text-gray-400" /> {contact.phone}</span>
                )}
              </div>
            </div>
          </div>

          {/* Customer Quick Action Buttons */}
          <div className="flex flex-wrap gap-2 shrink-0">
            <Button onClick={() => setGenerateInvoiceOpen(true)}>
              <span className="flex items-center gap-1.5"><FileText className="w-4 h-4" /> New Invoice</span>
            </Button>
            <Button variant="secondary" onClick={() => setAddCardOpen(true)}>
              <span className="flex items-center gap-1.5"><KanbanSquare className="w-4 h-4" /> Add Workflow</span>
            </Button>
            <Button variant="secondary" onClick={() => navigate('/email')}>
              <span className="flex items-center gap-1.5"><Send className="w-4 h-4" /> Email / Message</span>
            </Button>
            <Button variant="secondary" onClick={openEdit}>
              <Pencil className="w-4 h-4" />
            </Button>
            <Button variant="danger" onClick={() => setDeleteConfirmOpen(true)}>
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* 360 High Level Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-gray-200 dark:border-gray-800">
          <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800">
            <span className="text-xs text-gray-400 dark:text-gray-500 uppercase font-semibold block">Total Invoiced</span>
            <span className="text-lg font-bold text-gray-900 dark:text-white mt-1 block">
              {formatCurrency(totalInvoiced, currencyCode, currencyDisplayMode)}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800">
            <span className="text-xs text-gray-400 dark:text-gray-500 uppercase font-semibold block">Outstanding</span>
            <span className={`text-lg font-bold mt-1 block ${outstandingInvoiced > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
              {formatCurrency(outstandingInvoiced, currencyCode, currencyDisplayMode)}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800">
            <span className="text-xs text-gray-400 dark:text-gray-500 uppercase font-semibold block">Workflow Stage</span>
            <span className="text-sm font-semibold text-violet-600 dark:text-violet-400 mt-1 block truncate">
              {currentColumn ? currentColumn.name : 'No Active Card'}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800">
            <span className="text-xs text-gray-400 dark:text-gray-500 uppercase font-semibold block">Notes & Activity</span>
            <span className="text-lg font-bold text-gray-900 dark:text-white mt-1 block">
              {notes.length + contactLogs.length} Entries
            </span>
          </div>
        </div>
      </Card>

      {/* Tabs Bar */}
      <div className="flex border-b border-gray-200 dark:border-gray-800 space-x-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('overview')}
          className={`pb-3 px-4 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
            activeTab === 'overview'
              ? 'border-violet-600 text-violet-600 dark:text-violet-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
          }`}
        >
          Overview 360
        </button>
        <button
          onClick={() => setActiveTab('invoices')}
          className={`pb-3 px-4 text-sm font-medium border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 ${
            activeTab === 'invoices'
              ? 'border-violet-600 text-violet-600 dark:text-violet-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
          }`}
        >
          Invoices ({invoices.length})
        </button>
        <button
          onClick={() => setActiveTab('workflow')}
          className={`pb-3 px-4 text-sm font-medium border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 ${
            activeTab === 'workflow'
              ? 'border-violet-600 text-violet-600 dark:text-violet-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
          }`}
        >
          Workflow Cards ({workflowCards.length})
        </button>
        <button
          onClick={() => setActiveTab('messages')}
          className={`pb-3 px-4 text-sm font-medium border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 ${
            activeTab === 'messages'
              ? 'border-violet-600 text-violet-600 dark:text-violet-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
          }`}
        >
          Messages & Logs
        </button>
        <button
          onClick={() => setActiveTab('notes')}
          className={`pb-3 px-4 text-sm font-medium border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 ${
            activeTab === 'notes'
              ? 'border-violet-600 text-violet-600 dark:text-violet-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
          }`}
        >
          Notes ({notes.length})
        </button>
      </div>

      {/* TAB CONTENT: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Active Workflow Summary */}
            <Card className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  <KanbanSquare className="w-5 h-5 text-violet-600 dark:text-violet-400" /> Active Workflow Status
                </h2>
                <Button variant="secondary" onClick={() => setAddCardOpen(true)}>+ New Card</Button>
              </div>

              {workflowCards.length === 0 ? (
                <EmptyState icon={KanbanSquare} title="No workflow cards" subtitle="Create a workflow card to track onboarding or sales progress." />
              ) : (
                <div className="space-y-3">
                  {workflowCards.map((card) => {
                    const col = workflowCols.find((c) => c.id === card.column_id);
                    return (
                      <div key={card.id} className="p-4 bg-gray-50 dark:bg-gray-800/40 border border-gray-200 dark:border-gray-800 rounded-xl">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20 mb-2">
                              {col ? col.name : 'Pipeline Stage'}
                            </span>
                            <h3 className="text-sm font-bold text-gray-900 dark:text-white">{card.title}</h3>
                            {card.status_note && (
                              <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">{card.status_note}</p>
                            )}
                          </div>
                          <div className="text-right shrink-0">
                            <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold uppercase ${
                              card.priority === 'high' ? 'bg-rose-500/10 text-rose-600' : card.priority === 'medium' ? 'bg-amber-500/10 text-amber-600' : 'bg-blue-500/10 text-blue-600'
                            }`}>
                              {card.priority} Priority
                            </span>
                            {card.assignee_name && (
                              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Assignee: {card.assignee_name}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>

            {/* Tags & Custom Metadata Fields Card */}
            <Card className="p-5 space-y-5">
              {/* Tags Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    <Tag className="w-5 h-5 text-violet-600 dark:text-violet-400" /> Contact Tags
                  </h2>
                  <span className="text-xs text-gray-400">{tags.length} assigned</span>
                </div>

                <div className="flex flex-wrap gap-2">
                  {tags.length === 0 ? (
                    <p className="text-xs text-gray-400 italic">No tags assigned yet. Select a suggestion below.</p>
                  ) : (
                    tags.map((t) => (
                      <span
                        key={t}
                        className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-semibold bg-violet-600 text-white shadow-sm"
                      >
                        {t}
                        <button
                          onClick={() => handleRemoveTag(t)}
                          className="hover:bg-white/20 rounded p-0.5 transition-colors"
                          title="Remove tag"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </span>
                    ))
                  )}
                </div>

                {/* Suggestions & Input */}
                <div className="pt-2 border-t border-gray-100 dark:border-gray-800 space-y-2">
                  <span className="text-xs font-medium text-gray-400 block">Quick Suggestions:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {DEFAULT_SUGGESTED_TAGS.filter((st) => !tags.includes(st)).map((st) => (
                      <button
                        key={st}
                        onClick={() => handleAddTag(st)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-violet-500 hover:text-white transition-all"
                      >
                        <Plus className="w-3 h-3" /> {st}
                      </button>
                    ))}
                  </div>

                  <div className="flex gap-2 pt-1 max-w-sm">
                    <input
                      type="text"
                      value={newTagInput}
                      onChange={(e) => setNewTagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddTag(newTagInput);
                        }
                      }}
                      placeholder="Type custom tag name..."
                      className="flex-1 px-3 py-1.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                    />
                    <Button size="sm" onClick={() => handleAddTag(newTagInput)} disabled={!newTagInput.trim()}>
                      Add Tag
                    </Button>
                  </div>
                </div>
              </div>

              {/* Custom Fields Section */}
              <div className="pt-4 border-t border-gray-200 dark:border-gray-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wider">
                    Custom Metadata Fields
                  </h3>
                  <button
                    onClick={() => setIsAddingField(!isAddingField)}
                    className="text-xs text-violet-600 dark:text-violet-400 font-semibold hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Field
                  </button>
                </div>

                {isAddingField && (
                  <form onSubmit={handleSaveCustomField} className="p-3 bg-gray-50 dark:bg-gray-800/50 border border-violet-500/30 rounded-lg space-y-2">
                    <p className="text-xs font-semibold text-violet-600 dark:text-violet-400">Add Metadata Pair</p>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="Key (e.g. Referral Source)"
                        value={newFieldKey}
                        onChange={(e) => setNewFieldKey(e.target.value)}
                        className="px-2.5 py-1.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                        required
                      />
                      <input
                        type="text"
                        placeholder="Value (e.g. LinkedIn)"
                        value={newFieldValue}
                        onChange={(e) => setNewFieldValue(e.target.value)}
                        className="px-2.5 py-1.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                        required
                      />
                    </div>
                    <div className="flex justify-end gap-2 pt-1">
                      <Button size="sm" variant="secondary" type="button" onClick={() => setIsAddingField(false)}>
                        Cancel
                      </Button>
                      <Button size="sm" type="submit">Save</Button>
                    </div>
                  </form>
                )}

                {customFields.length === 0 ? (
                  <p className="text-xs text-gray-400 italic">No custom fields defined yet.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {customFields.map((cf) => (
                      <div key={cf.id} className="flex items-center justify-between p-2.5 bg-gray-50 dark:bg-gray-800/40 border border-gray-200 dark:border-gray-800 rounded-lg text-xs">
                        <div className="min-w-0 pr-2">
                          <span className="font-semibold text-gray-400 block text-[10px] uppercase">{cf.key}</span>
                          <span className="font-medium text-gray-900 dark:text-white">{cf.value}</span>
                        </div>
                        <button
                          onClick={() => handleDeleteCustomField(cf.id)}
                          className="p-1 text-gray-400 hover:text-rose-500 rounded transition-colors shrink-0"
                          title="Delete field"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>

            {/* Invoices Summary */}
            <Card className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-violet-600 dark:text-violet-400" /> Linked Invoices
                </h2>
                <Button variant="secondary" onClick={() => setGenerateInvoiceOpen(true)}>+ New Invoice</Button>
              </div>

              {invoices.length === 0 ? (
                <EmptyState icon={FileText} title="No invoices yet" subtitle="Generate an invoice for this contact." />
              ) : (
                <div className="space-y-3">
                  {invoices.slice(0, 3).map((inv) => (
                    <div key={inv.id} className="flex items-center justify-between p-3.5 bg-gray-50 dark:bg-gray-800/40 border border-gray-200 dark:border-gray-800 rounded-xl">
                      <div>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">#{inv.invoice_number || inv.id.slice(0, 8)}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Due: {inv.due_date || 'N/A'}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-gray-900 dark:text-white">
                          {formatCurrency(Number(inv.amount), inv.currency || currencyCode, currencyDisplayMode)}
                        </p>
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${
                          inv.status === 'paid' ? 'bg-emerald-500/10 text-emerald-600' : inv.status === 'overdue' ? 'bg-rose-500/10 text-rose-600' : 'bg-amber-500/10 text-amber-600'
                        }`}>
                          {inv.status.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  ))}
                  {invoices.length > 3 && (
                    <button onClick={() => setActiveTab('invoices')} className="text-xs text-violet-600 dark:text-violet-400 font-semibold hover:underline block pt-1">
                      View all {invoices.length} invoices →
                    </button>
                  )}
                </div>
              )}
            </Card>
          </div>

          {/* Activity Timeline Sidebar */}
          <div className="space-y-6">
            {/* Follow-up Reminders & Calendar Sync Card */}
            <Card className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  <Bell className="w-5 h-5 text-indigo-600 dark:text-indigo-400" /> Follow-up Engine
                </h2>
                <button
                  type="button"
                  onClick={() => setSchedulerOpen(true)}
                  className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                >
                  <Calendar className="w-3.5 h-3.5" /> Schedule
                </button>
              </div>

              {followUp ? (
                (() => {
                  const statusInfo = getFollowUpStatusInfo(followUp.dueDate, followUp.completed);
                  const title = `Follow up with ${contact.name}`;
                  const description = followUp.note || `Scheduled pitch/follow-up call with ${contact.name}`;
                  const googleUrl = getGoogleCalendarUrl(title, description, followUp.dueDate, contact.email || undefined);
                  const outlookUrl = getOutlookCalendarUrl(title, description, followUp.dueDate, contact.email || undefined);

                  return (
                    <div className="p-3.5 bg-gray-50 dark:bg-gray-800/40 border border-gray-200 dark:border-gray-800 rounded-xl space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={handleToggleFollowUpComplete}
                            title={followUp.completed ? "Reopen follow-up" : "Mark completed"}
                            className="text-gray-400 hover:text-emerald-500 transition-colors"
                          >
                            <CheckSquare className={`w-5 h-5 ${followUp.completed ? 'text-emerald-500 fill-emerald-500/20' : ''}`} />
                          </button>
                          <div>
                            <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${statusInfo.badgeClass}`}>
                              {statusInfo.label}
                            </span>
                            <p className="text-xs font-semibold text-gray-900 dark:text-white mt-1">
                              Due: {new Date(followUp.dueDate).toLocaleString(undefined, { dateStyle: 'full', timeStyle: 'short' })}
                            </p>
                          </div>
                        </div>
                      </div>

                      {followUp.note && (
                        <p className="text-xs text-gray-600 dark:text-gray-300 italic bg-white dark:bg-gray-900/50 p-2 rounded-lg border border-gray-100 dark:border-gray-800">
                          "{followUp.note}"
                        </p>
                      )}

                      {/* Calendar Integration Links */}
                      {!followUp.completed && (
                        <div className="pt-2 border-t border-gray-200 dark:border-gray-800 space-y-1.5">
                          <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block">
                            Sync to Calendar
                          </span>
                          <div className="flex flex-wrap items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => downloadICSFile(title, description, followUp.dueDate, `${contact.name.replace(/\s+/g, '_')}_followup.ics`, contact.email || undefined)}
                              className="px-2 py-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-[11px] font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700/80 flex items-center gap-1"
                            >
                              <CalendarDays className="w-3.5 h-3.5 text-indigo-500" /> Apple/iCal (.ics)
                            </button>
                            <a
                              href={googleUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="px-2 py-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-[11px] font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700/80 flex items-center gap-1"
                            >
                              <ExternalLink className="w-3 h-3 text-emerald-500" /> Google
                            </a>
                            <a
                              href={outlookUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="px-2 py-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-[11px] font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700/80 flex items-center gap-1"
                            >
                              <ExternalLink className="w-3 h-3 text-blue-500" /> Outlook
                            </a>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()
              ) : (
                <div className="p-3 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200/60 dark:border-indigo-800/40 rounded-xl text-center space-y-1">
                  <p className="text-xs text-gray-600 dark:text-gray-300 font-medium">
                    No follow-up scheduled.
                  </p>
                  <p className="text-[11px] text-gray-400">
                    Schedule reminders so pitches never get lost.
                  </p>
                </div>
              )}

              {/* Quick Presets */}
              <div className="space-y-1.5 pt-1">
                <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block">
                  Quick Schedule
                </span>
                <div className="grid grid-cols-4 gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleQuickPresetFollowUp(1)}
                    className="py-1.5 px-1 bg-gray-100 dark:bg-gray-800 hover:bg-indigo-600 hover:text-white rounded-lg text-xs font-semibold text-gray-700 dark:text-gray-300 transition-colors text-center"
                  >
                    +1 Day
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickPresetFollowUp(3)}
                    className="py-1.5 px-1 bg-gray-100 dark:bg-gray-800 hover:bg-indigo-600 hover:text-white rounded-lg text-xs font-semibold text-gray-700 dark:text-gray-300 transition-colors text-center"
                  >
                    +3 Days
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickPresetFollowUp(7)}
                    className="py-1.5 px-1 bg-gray-100 dark:bg-gray-800 hover:bg-indigo-600 hover:text-white rounded-lg text-xs font-semibold text-gray-700 dark:text-gray-300 transition-colors text-center"
                  >
                    +1 Wk
                  </button>
                  <button
                    type="button"
                    onClick={() => setSchedulerOpen(true)}
                    className="py-1.5 px-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-600 hover:text-white rounded-lg text-xs font-semibold transition-colors text-center"
                  >
                    Custom
                  </button>
                </div>
              </div>
            </Card>

            <Card className="p-5">
              <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-violet-600 dark:text-violet-400" /> Recent Timeline
              </h2>

              {contactLogs.length === 0 && notes.length === 0 ? (
                <EmptyState icon={Clock} title="No activity recorded" />
              ) : (
                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                  {contactLogs.map((log) => (
                    <div key={log.id} className="p-3 bg-gray-50 dark:bg-gray-800/30 border border-gray-100 dark:border-gray-800/60 rounded-lg">
                      <p className="text-xs font-medium text-gray-800 dark:text-gray-200">{log.message}</p>
                      <span className="text-[10px] text-gray-400 block mt-1">
                        {new Date(log.timestamp).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}
                      </span>
                    </div>
                  ))}
                  {notes.map((n) => (
                    <div key={n.id} className="p-3 bg-violet-500/5 border border-violet-500/10 rounded-lg">
                      <p className="text-xs text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{n.body}</p>
                      <span className="text-[10px] text-violet-500 block mt-1">
                        {n.created_at ? new Date(n.created_at).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' }) : 'Note'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>
      )}

      {/* TAB CONTENT: INVOICES */}
      {activeTab === 'invoices' && (
        <Card className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Customer Invoices</h2>
              <p className="text-xs text-gray-500">Manage, generate, and view payment records for {contact.name}.</p>
            </div>
            <Button onClick={() => setGenerateInvoiceOpen(true)}>+ Generate Invoice</Button>
          </div>

          {invoices.length === 0 ? (
            <EmptyState icon={FileText} title="No Invoices Found" subtitle="Click above to create an invoice pre-filled for this customer." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400 text-xs uppercase font-semibold">
                  <tr>
                    <th className="p-3">Invoice #</th>
                    <th className="p-3">Amount</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Due Date</th>
                    <th className="p-3">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30">
                      <td className="p-3 font-semibold text-gray-900 dark:text-white">#{inv.invoice_number || inv.id.slice(0, 8)}</td>
                      <td className="p-3 font-bold text-gray-900 dark:text-white">
                        {formatCurrency(Number(inv.amount), inv.currency || currencyCode, currencyDisplayMode)}
                      </td>
                      <td className="p-3">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          inv.status === 'paid' ? 'bg-emerald-500/10 text-emerald-600' : inv.status === 'overdue' ? 'bg-rose-500/10 text-rose-600' : 'bg-amber-500/10 text-amber-600'
                        }`}>
                          {inv.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="p-3 text-gray-500">{inv.due_date || 'N/A'}</td>
                      <td className="p-3 text-gray-500 max-w-xs truncate">{inv.notes || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* TAB CONTENT: WORKFLOW */}
      {activeTab === 'workflow' && (
        <Card className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Workflow Pipeline Cards</h2>
              <p className="text-xs text-gray-500">Track active onboarding and sales cards for {contact.name}.</p>
            </div>
            <Button onClick={() => setAddCardOpen(true)}>+ Add Workflow Card</Button>
          </div>

          {workflowCards.length === 0 ? (
            <EmptyState icon={KanbanSquare} title="No Workflow Cards" subtitle="Create a workflow card to move this contact through your pipeline." />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {workflowCards.map((card) => {
                const col = workflowCols.find((c) => c.id === card.column_id);
                return (
                  <div key={card.id} className="p-4 bg-gray-50 dark:bg-gray-800/40 border border-gray-200 dark:border-gray-800 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20">
                        {col ? col.name : 'Stage'}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold uppercase ${
                        card.priority === 'high' ? 'bg-rose-500/10 text-rose-600' : card.priority === 'medium' ? 'bg-amber-500/10 text-amber-600' : 'bg-blue-500/10 text-blue-600'
                      }`}>
                        {card.priority}
                      </span>
                    </div>

                    <h3 className="font-bold text-gray-900 dark:text-white">{card.title}</h3>
                    {card.status_note && <p className="text-xs text-gray-600 dark:text-gray-300">{card.status_note}</p>}

                    <div className="pt-2 border-t border-gray-200 dark:border-gray-800 flex justify-between text-xs text-gray-400">
                      <span>Assignee: {card.assignee_name || 'Unassigned'}</span>
                      <span>Updated: {card.moved_at ? new Date(card.moved_at).toLocaleDateString() : 'Recent'}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}

      {/* TAB CONTENT: MESSAGES & LOGS */}
      {activeTab === 'messages' && (
        <Card className="p-5 space-y-4">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Communication & Message Log</h2>
          <p className="text-xs text-gray-500">Record emails, WhatsApp messages, or customer support notes.</p>

          <form onSubmit={handleSendQuickMessage} className="space-y-3 bg-gray-50 dark:bg-gray-800/30 p-4 rounded-xl border border-gray-200 dark:border-gray-800">
            <textarea
              value={quickMessage}
              onChange={(e) => setQuickMessage(e.target.value)}
              placeholder="Type a communication note or record a sent email/WhatsApp message..."
              rows={3}
              className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
            />
            <div className="flex justify-between items-center">
              <Button type="button" variant="secondary" onClick={() => navigate('/email')}>
                Open Full Email Composer
              </Button>
              <Button type="submit" disabled={sendingMsg || !quickMessage.trim()}>
                {sendingMsg ? 'Logging...' : 'Log Communication'}
              </Button>
            </div>
          </form>

          {contactLogs.length === 0 ? (
            <EmptyState icon={MessageSquare} title="No Messages Logged" subtitle="Logged messages and emails sent will appear here." />
          ) : (
            <div className="space-y-2">
              {contactLogs.map((log) => (
                <div key={log.id} className="p-3 bg-gray-50 dark:bg-gray-800/40 border border-gray-200 dark:border-gray-800 rounded-xl">
                  <p className="text-sm text-gray-800 dark:text-gray-200">{log.message}</p>
                  <span className="text-xs text-gray-400 mt-1 block">
                    {new Date(log.timestamp).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* TAB CONTENT: NOTES */}
      {activeTab === 'notes' && (
        <Card className="p-5 space-y-4">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Interaction Notes</h2>

          <form onSubmit={addNote} className="space-y-2">
            <textarea
              value={noteBody}
              onChange={(e) => setNoteBody(e.target.value)}
              placeholder="Log a call, meeting, or internal note..."
              rows={3}
              className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
            />
            <div className="flex justify-end">
              <Button type="submit" disabled={savingNote || !noteBody.trim()}>
                <Plus className="w-4 h-4 mr-1" /> {savingNote ? 'Adding...' : 'Add Note'}
              </Button>
            </div>
          </form>

          {notes.length === 0 ? (
            <EmptyState icon={Clock} title="No notes recorded" subtitle="Add notes to keep detailed interaction records." />
          ) : (
            <div className="space-y-3">
              {notes.map((n) => (
                <div key={n.id} className="group bg-gray-50 dark:bg-gray-800/30 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm text-gray-700 dark:text-gray-200 whitespace-pre-wrap flex-1">{n.body}</p>
                    <button
                      onClick={() => deleteNote(n.id)}
                      className="p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                    {n.created_at ? new Date(n.created_at).toLocaleString() : 'Just now'}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* MODALS */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit Contact Profile">
        <form onSubmit={handleSaveEdit} className="space-y-4">
          <Input label="Name *" value={form.name} onChange={(v) => setForm({ ...form, name: v })} required />
          <Input label="Email" type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
          <Input label="Phone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
          <Input label="Company" value={form.company} onChange={(v) => setForm({ ...form, company: v })} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select label="Status" value={form.status} onChange={(v) => setForm({ ...form, status: v })} options={CONTACT_STATUSES} />
            <Select label="Category (Description)" value={form.description_type} onChange={(v) => setForm({ ...form, description_type: v })} options={DESCRIPTION_TYPES} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Description Note</label>
            <textarea
              value={form.description_note}
              onChange={(e) => setForm({ ...form, description_note: e.target.value })}
              placeholder="Note explaining the inquiry or interest..."
              rows={3}
              className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
            />
          </div>
          {error && <p className="text-sm text-red-600 bg-red-500/10 border border-red-500/30 rounded-lg p-3">{error}</p>}
          <div className="flex gap-3 pt-2">
            <Button type="submit">Save Changes</Button>
            <Button variant="secondary" onClick={() => setEditOpen(false)}>Cancel</Button>
          </div>
        </form>
      </Modal>

      <Modal open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)} title="Delete Contact">
        <div className="space-y-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Are you sure you want to delete <span className="font-semibold text-gray-900 dark:text-gray-100">"{contact.name}"</span>?
          </p>
          <p className="text-sm text-red-500 bg-red-500/10 border border-red-500/20 p-3 rounded-lg font-medium">
            This action will also delete all associated notes, workflow cards, and local logs for this contact.
          </p>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
            <Button variant="danger" onClick={handleDelete}>Delete Contact</Button>
          </div>
        </div>
      </Modal>

      {/* Add Workflow Card Modal */}
      <Modal open={addCardOpen} onClose={() => setAddCardOpen(false)} title={`New Workflow Card for ${contact.name}`}>
        <form onSubmit={handleAddCard} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Workflow Column</label>
            <select
              value={cardColId}
              onChange={(e) => setCardColId(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
            >
              {workflowCols.map((col) => (
                <option key={col.id} value={col.id}>{col.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Priority</label>
              <select
                value={cardPriority}
                onChange={(e) => setCardPriority(e.target.value as 'low' | 'medium' | 'high')}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Assignee</label>
              <input
                type="text"
                value={cardAssignee}
                onChange={(e) => setCardAssignee(e.target.value)}
                placeholder="Assignee name"
                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Due Date</label>
            <input
              type="date"
              value={cardDueDate}
              onChange={(e) => setCardDueDate(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status Note</label>
            <textarea
              value={cardStatusNote}
              onChange={(e) => setCardStatusNote(e.target.value)}
              placeholder="e.g. Initial discussion ongoing..."
              rows={2}
              className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setAddCardOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={savingCard}>{savingCard ? 'Adding...' : 'Add Workflow Card'}</Button>
          </div>
        </form>
      </Modal>

      {/* Generate Invoice Modal pre-filled for this contact */}
      <GenerateInvoiceModal
        open={generateInvoiceOpen}
        onClose={() => setGenerateInvoiceOpen(false)}
        contacts={[contact]}
        onSave={handleSaveInvoice}
      />

      {/* Follow-up Scheduler Modal */}
      {contact && (
        <FollowUpSchedulerModal
          isOpen={schedulerOpen}
          onClose={() => setSchedulerOpen(false)}
          contactId={contact.id}
          contactName={contact.name || contact.company || contact.phone || contact.email || 'Contact'}
          contactEmail={contact.email || undefined}
          onSaved={() => {
            load();
          }}
        />
      )}
    </div>
  );
}
