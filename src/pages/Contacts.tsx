import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, type Contact, CONTACT_STATUSES } from '../lib/supabase';

const DESCRIPTION_TYPES = [
  'Other / Uncategorized',
  'General Inquiry',
  'Product/Service Interest',
  'Support & Complaint'
] as const;

function CategoryBadge({ category }: { category: string | null }) {
  const cat = category || 'Other / Uncategorized';
  let classes = 'bg-gray-500/10 text-gray-500 dark:text-gray-400 border-gray-500/20';
  if (cat === 'General Inquiry') {
    classes = 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20';
  } else if (cat === 'Product/Service Interest') {
    classes = 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
  } else if (cat === 'Support & Complaint') {
    classes = 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20';
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${classes}`}>
      {cat}
    </span>
  );
}
import { PageHeader, Card, StatusBadge, Button, Input, Select, Modal, EmptyState } from '../components/ui';
import { UserPlus, Search, Pencil, Trash2, Users, Mail, Phone, Building2, Download, Upload, X, Bell, Calendar, CalendarDays } from 'lucide-react';
import { exportToCSV, formatDateForFilename } from '../utils/csvExport';
import { CSVImportModal } from '../components/contacts/CSVImportModal';
import { createDefaultWorkflowCardForContact, ensureWorkflowColumns } from '../services/workflowService';
import type { WorkflowColumn } from '../lib/supabase';
import { useToast } from '../contexts/ToastContext';
import { useActivityLog } from '../contexts/ActivityLogContext';
import { useNotificationPreferences } from '../contexts/NotificationContext';
import { useActiveWorkspaceId } from '../lib/workspace';
import { getContactTags, getContactCustomFields, DEFAULT_SUGGESTED_TAGS } from '../utils/contactMeta';
import { getContactFollowUp, getFollowUpStatusInfo, getAllContactFollowUps } from '../utils/followUpMeta';
import { downloadBatchICSFile } from '../utils/ics';
import { FollowUpSchedulerModal } from '../components/followup/FollowUpSchedulerModal';

function isMissingColumnError(err: { message?: string; code?: string } | null | undefined): boolean {
  if (!err) return false;
  const msg = String(err.message || '').toLowerCase();
  const code = String(err.code || '');
  return (
    code === 'PGRST204' ||
    code === '42703' ||
    msg.includes('column') ||
    msg.includes('schema cache') ||
    msg.includes('description_type') ||
    msg.includes('description_note')
  );
}

export default function Contacts() {
  const navigate = useNavigate();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [tagFilter, setTagFilter] = useState('All');
  const [followUpFilter, setFollowUpFilter] = useState('All');
  const [schedulerContact, setSchedulerContact] = useState<Contact | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Contact | null>(null);
  const [form, setForm] = useState({ 
    name: '', 
    email: '', 
    phone: '', 
    company: '', 
    status: 'Lead',
    description_type: 'Other / Uncategorized',
    description_note: ''
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteContact, setDeleteContact] = useState<Contact | null>(null);
  const [importModalOpen, setImportModalOpen] = useState(false);

  // Multi-select and bulk actions
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteModalOpen, setBulkDeleteModalOpen] = useState(false);
  const [bulkActioning, setBulkActioning] = useState(false);

  // Workflow prompt after creation
  const [createdContactForCard, setCreatedContactForCard] = useState<Contact | null>(null);
  const [workflowPromptOpen, setWorkflowPromptOpen] = useState(false);
  const [workflowCols, setWorkflowCols] = useState<WorkflowColumn[]>([]);
  const [selectedColId, setSelectedColId] = useState('');
  const [cardPriority, setCardPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [cardNote, setCardNote] = useState('');
  const [creatingCard, setCreatingCard] = useState(false);

  const { addToast } = useToast();
  const { logActivity } = useActivityLog();
  const { preferences } = useNotificationPreferences();
  const workspaceId = useActiveWorkspaceId();

  const load = useCallback(async () => {
    if (!workspaceId) { setContacts([]); setLoading(false); return; }
    setLoading(true);
    try {
      const { data, error: fetchError } = await supabase.from('contacts').select('*').eq('workspace_id', workspaceId).order('created_at', { ascending: false });
      
      if (fetchError) {
        throw new Error(fetchError.message);
      }

      const mergedContacts = (data as Contact[] ?? []).map(contact => {
        try {
          const fallbackData = localStorage.getItem(`contact_fallback_${contact.id}`);
          if (fallbackData) {
            const parsed = JSON.parse(fallbackData);
            return {
              ...contact,
              description_type: contact.description_type || parsed.description_type || null,
              description_note: contact.description_note || parsed.description_note || null
            };
          }
        } catch (e) {
          console.error('Error loading fallback contact info', e);
        }
        return contact;
      });

      setContacts(mergedContacts);
    } catch (err) {
      console.error('Failed to load contacts:', err);
      const message = err instanceof Error ? err.message : String(err);
      const isFetchError = message.toLowerCase().includes('failed to fetch') || message.toLowerCase().includes('load');
      const friendlyMsg = isFetchError 
        ? 'Network error. Please check your internet connection or reload the page.' 
        : message || 'Could not load contacts.';
      addToast('error', 'Error Loading Contacts', friendlyMsg);
    } finally {
      setLoading(false);
    }
  }, [workspaceId, addToast]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = contacts.filter((c) => {
    const contactTags = getContactTags(c.id);
    const customFields = getContactCustomFields(c.id);

    const matchesSearch =
      !search ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.email ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (c.company ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (c.description_type ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (c.description_note ?? '').toLowerCase().includes(search.toLowerCase()) ||
      contactTags.some((t) => t.toLowerCase().includes(search.toLowerCase())) ||
      customFields.some(
        (f) =>
          f.key.toLowerCase().includes(search.toLowerCase()) ||
          f.value.toLowerCase().includes(search.toLowerCase())
      );

    const matchesStatus = statusFilter === 'All' || c.status === statusFilter;
    const matchesTag = tagFilter === 'All' || contactTags.includes(tagFilter);

    let matchesFollowUp = true;
    if (followUpFilter !== 'All') {
      const fu = getContactFollowUp(c.id);
      const info = fu ? getFollowUpStatusInfo(fu.dueDate, fu.completed) : null;
      if (followUpFilter === 'Needs Follow-up') {
        matchesFollowUp = !!fu && !fu.completed;
      } else if (followUpFilter === 'Overdue') {
        matchesFollowUp = info?.status === 'overdue';
      } else if (followUpFilter === 'Upcoming') {
        matchesFollowUp = info?.status === 'today' || info?.status === 'tomorrow' || info?.status === 'upcoming';
      }
    }

    return matchesSearch && matchesStatus && matchesTag && matchesFollowUp;
  });

  const openAdd = () => {
    setEditing(null);
    setForm({ 
      name: '', 
      email: '', 
      phone: '', 
      company: '', 
      status: 'Lead',
      description_type: 'Other / Uncategorized',
      description_note: ''
    });
    setError(null);
    setModalOpen(true);
  };

  const handleExportCalendar = () => {
    const allFollowUps = getAllContactFollowUps().filter((fu) => !fu.completed && fu.dueDate);
    if (!allFollowUps.length) {
      addToast('info', 'No Active Follow-ups', 'There are no active contact follow-ups to export.');
      return;
    }

    const cMap = new Map(contacts.map((c) => [c.id, c]));
    const events = allFollowUps.map((fu) => {
      const contact = cMap.get(fu.contactId);
      const name = contact ? contact.name : 'Contact';
      return {
        title: `Follow up with ${name}`,
        description: fu.note ? `Note: ${fu.note}` : `Scheduled CRM follow-up with ${name}`,
        startDate: fu.dueDate,
        location: contact?.email || '',
      };
    });

    downloadBatchICSFile(events, `contacts_follow_ups_${formatDateForFilename()}.ics`);
    addToast('success', 'Calendar Exported', `Exported ${events.length} follow-up reminders to .ics file.`);
  };

  const handleExport = () => {
    const data = filtered.map((c) => ({
      Name: c.name,
      Email: c.email ?? '',
      Phone: c.phone ?? '',
      'Business Name': c.company ?? '',
      Status: c.status,
      Category: c.description_type ?? 'Other / Uncategorized',
      'Description Note': c.description_note ?? '',
      'Date Added': c.created_at ? new Date(c.created_at).toISOString().split('T')[0] : '',
    }));
    exportToCSV(data, `contacts_export_${formatDateForFilename()}.csv`);
  };

  const openEdit = (c: Contact) => {
    setEditing(c);
    setForm({ 
      name: c.name, 
      email: c.email ?? '', 
      phone: c.phone ?? '', 
      company: c.company ?? '', 
      status: c.status,
      description_type: c.description_type || 'Other / Uncategorized',
      description_note: c.description_note ?? ''
    });
    setError(null);
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError('Name is required');
      return;
    }
    setSaving(true);
    setError(null);
    let currentError: string | null = null;

    if (editing) {
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
        .eq('id', editing.id);

      if (updateError && isMissingColumnError(updateError)) {
        console.warn('Database schema does not support classification columns. Falling back to basic update.', updateError);
        const retryResult = await supabase
          .from('contacts')
          .update({ 
            name: form.name.trim(), 
            email: form.email.trim() || null, 
            phone: form.phone.trim() || null, 
            company: form.company.trim() || null, 
            status: form.status
          })
          .eq('id', editing.id);
        
        updateError = retryResult.error;
        if (!updateError) {
          try {
            const localKey = `contact_fallback_${editing.id}`;
            localStorage.setItem(localKey, JSON.stringify({
              description_type: form.description_type,
              description_note: form.description_note.trim() || null
            }));
          } catch (e) {
            console.error('Failed to save fallback contact classification to localStorage', e);
          }
          addToast('success', 'Contact Updated', 'Category details saved locally (database schema pending sync).');
        }
      }

      if (updateError) {
        currentError = updateError.message;
        setError(updateError.message);
      }
    } else {
      if (!workspaceId) {
        setError('No active workspace');
        setSaving(false);
        return;
      }
      let { data, error: insertError } = await supabase
        .from('contacts')
        .insert({ 
          name: form.name.trim(), 
          email: form.email.trim() || null, 
          phone: form.phone.trim() || null, 
          company: form.company.trim() || null, 
          status: form.status, 
          description_type: form.description_type,
          description_note: form.description_note.trim() || null,
          workspace_id: workspaceId 
        })
        .select('*')
        .maybeSingle();

      if (insertError && isMissingColumnError(insertError)) {
        console.warn('Database schema does not support classification columns. Falling back to basic insert.', insertError);
        const retryResult = await supabase
          .from('contacts')
          .insert({ 
            name: form.name.trim(), 
            email: form.email.trim() || null, 
            phone: form.phone.trim() || null, 
            company: form.company.trim() || null, 
            status: form.status, 
            workspace_id: workspaceId 
          })
          .select('*')
          .maybeSingle();

        data = retryResult.data;
        insertError = retryResult.error;

        if (!insertError && data) {
          try {
            const localKey = `contact_fallback_${data.id}`;
            localStorage.setItem(localKey, JSON.stringify({
              description_type: form.description_type,
              description_note: form.description_note.trim() || null
            }));
          } catch (e) {
            console.error('Failed to save fallback contact classification to localStorage', e);
          }
          addToast('success', 'New Contact Registered', 'Category details saved locally (database schema pending sync).');
        }
      }

      if (insertError) {
        currentError = insertError.message;
        setError(insertError.message);
      } else if (data) {
        const newContact = data as Contact;
        logActivity('contact', `Contact '${newContact.name}' was registered`, newContact.id);
        if (preferences.contactAlerts) {
          addToast('contact', 'New Contact', `Contact '${newContact.name}' was registered`);
        }

        // Prepare auto workflow creation prompt
        try {
          const cols = await ensureWorkflowColumns();
          setWorkflowCols(cols);
          setSelectedColId(cols[0]?.id || '');
          setCardNote(`Initial onboarding workflow for ${newContact.name}`);
          setCreatedContactForCard(newContact);
          setWorkflowPromptOpen(true);
        } catch (colErr) {
          console.error('Failed to prepare workflow columns', colErr);
        }
      }
    }
    
    setSaving(false);
    if (!currentError) {
      setModalOpen(false);
      load();
    }
  };

  const handleCreateWorkflowCardForContact = async () => {
    if (!createdContactForCard) return;
    setCreatingCard(true);
    try {
      await createDefaultWorkflowCardForContact(
        createdContactForCard,
        selectedColId || undefined,
        cardPriority,
        cardNote || undefined
      );
      addToast('success', 'Workflow Card Created', `Created workflow card for "${createdContactForCard.name}".`);
      logActivity('workflow', `Workflow card created for contact '${createdContactForCard.name}'`, createdContactForCard.id);
      setWorkflowPromptOpen(false);
      setCreatedContactForCard(null);
    } catch (err) {
      console.error('Error creating workflow card:', err);
      addToast('error', 'Card Creation Failed', err instanceof Error ? err.message : 'Could not create card.');
    } finally {
      setCreatingCard(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteContact) return;
    try {
      // Delete associated rows first to bypass database foreign key constraints
      await supabase.from('notes').delete().eq('contact_id', deleteContact.id);
      await supabase.from('deals').delete().eq('contact_id', deleteContact.id);
      await supabase.from('workflow_cards').delete().eq('contact_id', deleteContact.id);

      const { error: deleteError } = await supabase.from('contacts').delete().eq('id', deleteContact.id);
      if (deleteError) {
        addToast('error', 'Delete Failed', deleteError.message);
      } else {
        addToast('success', 'Contact Deleted', `"${deleteContact.name}" has been deleted successfully.`);
        // Clean up fallback data
        try {
          localStorage.removeItem(`contact_fallback_${deleteContact.id}`);
        } catch (e) {
          console.error(e);
        }
        setDeleteContact(null);
        load();
      }
    } catch (err) {
      console.error(err);
      addToast('error', 'Delete Failed', 'An unexpected error occurred during deletion.');
    }
  };

  const getContactDisplayName = (c: Contact) => {
    const raw = c.name ? c.name.trim() : '';
    if (raw && raw.toUpperCase() !== 'N/A' && raw !== 'Unnamed Contact') {
      return raw;
    }
    return c.phone || c.email || c.company || 'Unnamed Contact';
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length && filtered.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((c) => c.id)));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    setBulkActioning(true);
    const idsArray = Array.from(selectedIds);
    try {
      // Delete associated items first to prevent FK constraint failures
      await supabase.from('notes').delete().in('contact_id', idsArray);
      await supabase.from('deals').delete().in('contact_id', idsArray);
      await supabase.from('workflow_cards').delete().in('contact_id', idsArray);

      const { error: deleteErr } = await supabase
        .from('contacts')
        .delete()
        .in('id', idsArray);

      if (deleteErr) throw deleteErr;

      // Clean up local storage fallbacks
      idsArray.forEach((id) => {
        try {
          localStorage.removeItem(`contact_fallback_${id}`);
        } catch (e) {
          console.error(e);
        }
      });

      logActivity('contacts', 'deleted', `Batch deleted ${idsArray.length} contacts`);
      addToast('success', 'Contacts Deleted', `Successfully deleted ${idsArray.length} contact${idsArray.length === 1 ? '' : 's'}.`);
      setSelectedIds(new Set());
      setBulkDeleteModalOpen(false);
      load();
    } catch (err) {
      console.error('Bulk delete error:', err);
      const msg = err instanceof Error ? err.message : String(err);
      addToast('error', 'Delete Failed', msg || 'Could not delete selected contacts.');
    } finally {
      setBulkActioning(false);
    }
  };

  const handleBulkUpdateStatus = async (newStatus: string) => {
    if (selectedIds.size === 0 || !workspaceId) return;
    setBulkActioning(true);
    const idsArray = Array.from(selectedIds);
    try {
      const { error: updateErr } = await supabase
        .from('contacts')
        .update({ status: newStatus })
        .eq('workspace_id', workspaceId)
        .in('id', idsArray);

      if (updateErr) throw updateErr;

      // Optimistically update memory state
      setContacts((prev) =>
        prev.map((c) =>
          selectedIds.has(c.id) ? { ...c, status: newStatus } : c
        )
      );

      logActivity('contacts', 'updated', `Updated status to "${newStatus}" for ${idsArray.length} contacts`);
      addToast('success', 'Status Updated', `Updated status to "${newStatus}" for ${idsArray.length} contact${idsArray.length === 1 ? '' : 's'}.`);
      setSelectedIds(new Set());
    } catch (err) {
      console.error('Bulk status update error:', err);
      const msg = err instanceof Error ? err.message : String(err);
      addToast('error', 'Update Failed', msg || 'Could not update contacts status.');
    } finally {
      setBulkActioning(false);
    }
  };

  const handleBulkUpdateCategory = async (newCategory: string) => {
    if (selectedIds.size === 0 || !workspaceId) return;
    setBulkActioning(true);
    const idsArray = Array.from(selectedIds);
    try {
      const { error: updateErr } = await supabase
        .from('contacts')
        .update({ description_type: newCategory })
        .eq('workspace_id', workspaceId)
        .in('id', idsArray);

      if (updateErr) {
        if (isMissingColumnError(updateErr)) {
          console.warn('Database schema does not support description_type column. Saving categories locally for fallback.', updateErr);
          idsArray.forEach((id) => {
            try {
              const localKey = `contact_fallback_${id}`;
              const existingStr = localStorage.getItem(localKey);
              let existing = {};
              if (existingStr) {
                try { existing = JSON.parse(existingStr); } catch { /* ignore */ }
              }
              localStorage.setItem(localKey, JSON.stringify({
                ...existing,
                description_type: newCategory,
              }));
            } catch (e) {
              console.error('Failed to save fallback contact category to localStorage', e);
            }
          });
        } else {
          throw updateErr;
        }
      }

      // Optimistically update memory state
      setContacts((prev) =>
        prev.map((c) =>
          selectedIds.has(c.id) ? { ...c, description_type: newCategory } : c
        )
      );

      logActivity('contacts', 'updated', `Updated category to "${newCategory}" for ${idsArray.length} contacts`);
      addToast('success', 'Category Updated', `Updated category to "${newCategory}" for ${idsArray.length} contact${idsArray.length === 1 ? '' : 's'}.`);
      setSelectedIds(new Set());
    } catch (err) {
      console.error('Bulk category update error:', err);
      const msg = err instanceof Error ? err.message : String(err);
      addToast('error', 'Update Failed', msg || 'Could not update contacts category.');
    } finally {
      setBulkActioning(false);
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <PageHeader
        title="Contacts"
        subtitle={`${contacts.length} ${contacts.length === 1 ? 'contact' : 'contacts'} in your CRM`}
        action={
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleExportCalendar}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border border-indigo-500/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/10 transition-all"
              title="Export all active contact follow-ups to .ics calendar"
            >
              <CalendarDays className="w-4 h-4" /> Calendar (.ics)
            </button>
            <button
              onClick={() => setImportModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 transition-all"
            >
              <Upload className="w-4 h-4" /> Import CSV
            </button>
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-violet-500/30 text-violet-600 dark:text-violet-400 hover:bg-violet-500/10 transition-all"
            >
              <Download className="w-4 h-4" /> Export CSV
            </button>
            <Button onClick={openAdd}><span className="flex items-center gap-2"><UserPlus className="w-4 h-4" /> Add Contact</span></Button>
          </div>
        }
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, or company..."
            aria-label="Search contacts"
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-900/40 border border-gray-200 dark:border-gray-800 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all"
          />
        </div>
        <select
          value={followUpFilter}
          onChange={(e) => setFollowUpFilter(e.target.value)}
          aria-label="Filter by follow-up"
          className="px-3 py-2.5 bg-white dark:bg-gray-900/40 border border-gray-200 dark:border-gray-800 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-all font-medium"
        >
          <option value="All">All Follow-ups</option>
          <option value="Needs Follow-up">Needs Follow-up</option>
          <option value="Overdue">Overdue Only</option>
          <option value="Upcoming">Upcoming Only</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          aria-label="Filter by status"
          className="px-3 py-2.5 bg-white dark:bg-gray-900/40 border border-gray-200 dark:border-gray-800 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-all"
        >
          <option value="All">All Statuses</option>
          {CONTACT_STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select
          value={tagFilter}
          onChange={(e) => setTagFilter(e.target.value)}
          aria-label="Filter by tag"
          className="px-3 py-2.5 bg-white dark:bg-gray-900/40 border border-gray-200 dark:border-gray-800 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-all"
        >
          <option value="All">All Tags</option>
          {DEFAULT_SUGGESTED_TAGS.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      {/* Bulk Actions Bar */}
      {selectedIds.size > 0 && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 p-3.5 bg-violet-600 text-white rounded-xl shadow-lg border border-violet-500 transition-all">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold bg-white/20 px-2.5 py-1 rounded-lg">
              {selectedIds.size} Selected
            </span>
            <span className="text-xs text-violet-100 hidden sm:inline">
              Out of {filtered.length} visible contacts
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Quick Status Change */}
            <select
              onChange={(e) => {
                if (e.target.value) {
                  handleBulkUpdateStatus(e.target.value);
                  e.target.value = '';
                }
              }}
              disabled={bulkActioning}
              className="px-2.5 py-1.5 bg-violet-700 hover:bg-violet-800 text-white border border-violet-500 rounded-lg text-xs font-medium focus:outline-none cursor-pointer"
            >
              <option value="">Set Status...</option>
              {CONTACT_STATUSES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>

            {/* Quick Category Change */}
            <select
              onChange={(e) => {
                if (e.target.value) {
                  handleBulkUpdateCategory(e.target.value);
                  e.target.value = '';
                }
              }}
              disabled={bulkActioning}
              className="px-2.5 py-1.5 bg-violet-700 hover:bg-violet-800 text-white border border-violet-500 rounded-lg text-xs font-medium focus:outline-none cursor-pointer"
            >
              <option value="">Set Category...</option>
              {DESCRIPTION_TYPES.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>

            {/* Delete Selected */}
            <button
              onClick={() => setBulkDeleteModalOpen(true)}
              disabled={bulkActioning}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white text-xs font-semibold rounded-lg shadow transition-all disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete Selected ({selectedIds.size})
            </button>

            {/* Clear Selection */}
            <button
              onClick={() => setSelectedIds(new Set())}
              className="p-1.5 text-violet-200 hover:text-white rounded-lg transition-colors"
              title="Deselect All"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-gray-100 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-800 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-0">
          <EmptyState
            icon={Users}
            title={contacts.length === 0 ? 'No contacts yet' : 'No contacts match your filters'}
            subtitle={contacts.length === 0 ? 'Click "Add Contact" or "Import CSV" to create records' : 'Try adjusting your search or filter'}
          />
        </Card>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block">
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/30">
                      <th className="w-10 px-4 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={filtered.length > 0 && selectedIds.size === filtered.length}
                          onChange={toggleSelectAll}
                          title="Select / Deselect all"
                          className="rounded border-gray-300 dark:border-gray-700 text-violet-600 focus:ring-violet-500 cursor-pointer"
                        />
                      </th>
                      <th className="text-left text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider px-5 py-3">Name</th>
                      <th className="text-left text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider px-5 py-3">Company</th>
                      <th className="text-left text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider px-5 py-3">Email</th>
                      <th className="text-left text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider px-5 py-3">Phone</th>
                      <th className="text-left text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider px-5 py-3">Follow-up</th>
                      <th className="text-left text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider px-5 py-3">Status</th>
                      <th className="text-left text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider px-5 py-3">Category</th>
                      <th className="text-left text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider px-5 py-3">Description Note</th>
                      <th className="px-5 py-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((c) => {
                      const isSelected = selectedIds.has(c.id);
                      const tags = getContactTags(c.id);
                      const followUp = getContactFollowUp(c.id);
                      const fuStatus = followUp ? getFollowUpStatusInfo(followUp.dueDate, followUp.completed) : null;
                      return (
                        <tr
                          key={c.id}
                          onClick={(e) => {
                            const target = e.target as HTMLElement;
                            if (target.closest('input') || target.closest('button') || target.closest('a')) return;
                            navigate(`/contacts/${c.id}`);
                          }}
                          className={`border-b border-gray-100 dark:border-gray-800/50 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors cursor-pointer group ${
                            isSelected ? 'bg-violet-500/5 dark:bg-violet-500/10' : ''
                          }`}
                        >
                          <td className="w-10 px-4 py-3 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelectOne(c.id)}
                              className="rounded border-gray-300 dark:border-gray-700 text-violet-600 focus:ring-violet-500 cursor-pointer"
                            />
                          </td>
                          <td className="px-5 py-3">
                            <button
                              onClick={() => navigate(`/contacts/${c.id}`)}
                              className="text-sm font-semibold text-gray-900 dark:text-gray-100 hover:text-violet-600 dark:hover:text-violet-400 transition-colors text-left block"
                            >
                              {getContactDisplayName(c)}
                            </button>
                            {tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {tags.slice(0, 3).map((t) => (
                                  <span key={t} className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20">
                                    {t}
                                  </span>
                                ))}
                                {tags.length > 3 && (
                                  <span className="text-[10px] text-gray-400 self-center">+{tags.length - 3}</span>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="px-5 py-3 text-sm text-gray-500 dark:text-gray-400">{c.company || '—'}</td>
                          <td className="px-5 py-3 text-sm text-gray-500 dark:text-gray-400">{c.email || '—'}</td>
                          <td className="px-5 py-3 text-sm text-gray-500 dark:text-gray-400">{c.phone || '—'}</td>
                          <td className="px-5 py-3">
                            {fuStatus ? (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSchedulerContact(c);
                                }}
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${fuStatus.badgeClass} hover:opacity-90 transition-opacity`}
                              >
                                <Bell className="w-3 h-3" />
                                {fuStatus.label}
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSchedulerContact(c);
                                }}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 border border-gray-200/80 dark:border-gray-700/80 transition-colors"
                              >
                                <Calendar className="w-3 h-3 text-indigo-500" />
                                Set Follow-up
                              </button>
                            )}
                          </td>
                          <td className="px-5 py-3"><StatusBadge status={c.status} /></td>
                          <td className="px-5 py-3"><CategoryBadge category={c.description_type} /></td>
                          <td className="px-5 py-3 text-sm text-gray-500 dark:text-gray-400 max-w-[240px] truncate" title={c.description_note || undefined}>
                            {c.description_note || '—'}
                          </td>
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => openEdit(c)} aria-label="Edit contact" className="p-1.5 text-gray-400 hover:text-violet-500 hover:bg-gray-100 dark:hover:bg-gray-700/50 rounded-lg transition-all">
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button onClick={() => setDeleteContact(c)} aria-label="Delete contact" className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {filtered.map((c) => {
              const isSelected = selectedIds.has(c.id);
              const tags = getContactTags(c.id);
              return (
                <Card key={c.id} className={`p-4 transition-all ${isSelected ? 'border-violet-500 dark:border-violet-400 bg-violet-500/5 dark:bg-violet-500/10' : ''}`}>
                  <div className="flex items-start justify-between mb-2 gap-2">
                    <div className="flex items-center gap-2.5">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectOne(c.id)}
                        className="rounded border-gray-300 dark:border-gray-700 text-violet-600 focus:ring-violet-500 cursor-pointer"
                      />
                      <div>
                        <button onClick={() => navigate(`/contacts/${c.id}`)} className="text-base font-semibold text-gray-900 dark:text-gray-100 hover:text-violet-600 dark:hover:text-violet-400 text-left">
                          {getContactDisplayName(c)}
                        </button>
                        {tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {tags.map((t) => (
                              <span key={t} className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20">
                                {t}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <StatusBadge status={c.status} />
                      <CategoryBadge category={c.description_type} />
                    </div>
                  </div>
                  <div className="space-y-1.5 text-sm text-gray-500 dark:text-gray-400 pl-6">
                    {c.company && <p className="flex items-center gap-2"><Building2 className="w-3.5 h-3.5" /> {c.company}</p>}
                    {c.email && <p className="flex items-center gap-2"><Mail className="w-3.5 h-3.5" /> {c.email}</p>}
                    {c.phone && <p className="flex items-center gap-2"><Phone className="w-3.5 h-3.5" /> {c.phone}</p>}
                    {c.description_note && (
                      <div className="mt-2 p-2.5 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-150 dark:border-gray-800 text-xs text-gray-600 dark:text-gray-400 italic line-clamp-2">
                        "{c.description_note}"
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 pl-6">
                    <button onClick={() => openEdit(c)} className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 hover:text-violet-500">
                      <Pencil className="w-3.5 h-3.5" /> Edit
                    </button>
                    <button onClick={() => setDeleteContact(c)} className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 hover:text-red-500 ml-auto">
                      <Trash2 className="w-3.5 h-3.5" /> Delete
                    </button>
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Contact' : 'Add Contact'}>
        <form onSubmit={handleSave} className="space-y-4">
          <Input label="Name *" value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="Jane Doe" required />
          <Input label="Email" type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} placeholder="jane@company.com" />
          <Input label="Phone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} placeholder="+1 555 0100" />
          <Input label="Company" value={form.company} onChange={(v) => setForm({ ...form, company: v })} placeholder="Acme Inc." />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select label="Status" value={form.status} onChange={(v) => setForm({ ...form, status: v })} options={CONTACT_STATUSES} />
            <Select label="Category (Description)" value={form.description_type} onChange={(v) => setForm({ ...form, description_type: v })} options={DESCRIPTION_TYPES} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Description Note</label>
            <textarea
              value={form.description_note}
              onChange={(e) => setForm({ ...form, description_note: e.target.value })}
              placeholder="Give a brief note explaining the selected category (e.g. details of their inquiry or feedback)..."
              rows={3}
              className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all text-sm resize-none"
            />
          </div>
          {error && <p className="text-sm text-red-600 dark:text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg p-3">{error}</p>}
          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={saving}>{saving ? 'Saving...' : editing ? 'Save Changes' : 'Add Contact'}</Button>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!deleteContact} onClose={() => setDeleteContact(null)} title="Delete Contact">
        <div className="space-y-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Are you sure you want to delete <span className="font-semibold text-gray-900 dark:text-gray-100">"{deleteContact?.name}"</span>?
          </p>
          <p className="text-sm text-red-500 bg-red-500/10 border border-red-500/20 p-3 rounded-lg font-medium">
            This action is irreversible and will also delete all associated notes, deals, and workflow cards.
          </p>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setDeleteContact(null)}>Cancel</Button>
            <Button variant="danger" onClick={handleDelete}>Delete Contact</Button>
          </div>
        </div>
      </Modal>

      {/* Bulk Delete Modal */}
      <Modal open={bulkDeleteModalOpen} onClose={() => setBulkDeleteModalOpen(false)} title={`Delete ${selectedIds.size} Contacts`}>
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Are you sure you want to permanently delete the <span className="font-bold text-gray-900 dark:text-white">{selectedIds.size}</span> selected contacts?
          </p>
          <p className="text-sm text-red-500 bg-red-500/10 border border-red-500/20 p-3 rounded-lg font-medium">
            This action cannot be undone. All associated notes, deals, and workflow cards for these contacts will also be permanently removed.
          </p>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setBulkDeleteModalOpen(false)} disabled={bulkActioning}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleBulkDelete} disabled={bulkActioning}>
              {bulkActioning ? 'Deleting...' : `Delete ${selectedIds.size} Contacts`}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Auto Create Workflow Card Modal */}
      <Modal open={workflowPromptOpen} onClose={() => setWorkflowPromptOpen(false)} title="Create Workflow Card?">
        <div className="space-y-4">
          <div className="p-3 bg-violet-500/10 border border-violet-500/20 rounded-xl flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-violet-600 text-white flex items-center justify-center font-bold text-lg shrink-0">
              {createdContactForCard?.name?.[0]?.toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                {createdContactForCard?.name}
              </p>
              <p className="text-xs text-violet-600 dark:text-violet-400">
                New contact registered. Would you like to create a workflow card for them?
              </p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Workflow Stage
            </label>
            <select
              value={selectedColId}
              onChange={(e) => setSelectedColId(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
            >
              {workflowCols.map((col) => (
                <option key={col.id} value={col.id}>
                  {col.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Priority
              </label>
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
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Status Note
              </label>
              <input
                type="text"
                value={cardNote}
                onChange={(e) => setCardNote(e.target.value)}
                placeholder="e.g. Lead Qualification"
                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setWorkflowPromptOpen(false)} disabled={creatingCard}>
              Skip for now
            </Button>
            <Button onClick={handleCreateWorkflowCardForContact} disabled={creatingCard}>
              {creatingCard ? 'Creating...' : 'Create Workflow Card'}
            </Button>
          </div>
        </div>
      </Modal>

      <CSVImportModal
        open={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        workspaceId={workspaceId}
        existingContacts={contacts}
        onSuccess={load}
      />

      {schedulerContact && (
        <FollowUpSchedulerModal
          isOpen={!!schedulerContact}
          onClose={() => setSchedulerContact(null)}
          contactId={schedulerContact.id}
          contactName={getContactDisplayName(schedulerContact)}
          contactEmail={schedulerContact.email || undefined}
          onSaved={() => {
            load();
          }}
        />
      )}
    </div>
  );
}
