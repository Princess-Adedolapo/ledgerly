import { useEffect, useState, useCallback, useMemo } from 'react';
import { supabase, type WorkflowCard, type WorkflowColumn, type Contact, type Invoice, type Note, CARD_PRIORITIES, CONTACT_STATUSES } from '../lib/supabase';
import {
  ensureWorkflowColumns,
  getWorkflowCards,
  getContacts,
  createWorkflowCard,
  updateWorkflowCard,
  deleteWorkflowCard,
  createContact,
  getInvoicesForContact,
  getNotesForContact,
  addNoteForContact,
  subscribeToWorkflowCards,
  subscribeToWorkflowColumns,
} from '../services/workflowService';
import { PageHeader, Card, Button, Input, Modal } from '../components/ui';
import { Plus, Users, Calendar, ChevronDown, Trash2, Search, Mail, Phone, Building2, StickyNote, FileText, User as UserIcon } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import { useActivityLog } from '../contexts/ActivityLogContext';
import { useNotificationPreferences } from '../contexts/NotificationContext';
import { useUserPreferences } from '../lib/userPreferences';
import { formatCurrency } from '../lib/currency';

const priorityStyles: Record<'low' | 'medium' | 'high', { border: string; badge: string; label: string }> = {
  high: { border: 'border-l-4 border-red-500', badge: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400', label: 'High' },
  medium: { border: 'border-l-4 border-yellow-400', badge: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/15 dark:text-yellow-400', label: 'Medium' },
  low: { border: 'border-l-4 border-green-500', badge: 'bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400', label: 'Low' },
};

const invoiceStatusStyles: Record<string, string> = {
  paid: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
  pending: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
  overdue: 'bg-red-500/15 text-red-600 dark:text-red-400',
};

type BoardFormState = {
  contact_id: string;
  status_note: string;
  due_date: string;
  priority: 'low' | 'medium' | 'high';
  assignee_name: string;
  column_id: string;
};

const emptyForm = (colId: string): BoardFormState => ({
  contact_id: '',
  status_note: '',
  due_date: '',
  priority: 'medium',
  assignee_name: '',
  column_id: colId,
});

export default function WorkflowBoard() {
  const [columns, setColumns] = useState<WorkflowColumn[]>([]);
  const [cards, setCards] = useState<WorkflowCard[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const { addToast } = useToast();
  const { logActivity } = useActivityLog();
  const { preferences } = useNotificationPreferences();
  const { currencyCode, currencyDisplayMode } = useUserPreferences();

  // Add-card modal
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState<BoardFormState>(emptyForm(''));
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Inline new-contact
  const [inlineNew, setInlineNew] = useState(false);
  const [newContact, setNewContact] = useState({ name: '', company: '', email: '', phone: '', status: 'Lead' });

  // Detail modal
  const [detailCardId, setDetailCardId] = useState<string | null>(null);
  const [detailInvoices, setDetailInvoices] = useState<Invoice[]>([]);
  const [detailNotes, setDetailNotes] = useState<Note[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [noteDraft, setNoteDraft] = useState('');
  const [addingNote, setAddingNote] = useState(false);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<WorkflowCard | null>(null);

  // Move dropdown state
  const [moveMenuId, setMoveMenuId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [cols, crds, ctcts] = await Promise.all([ensureWorkflowColumns(), getWorkflowCards(), getContacts()]);
      setColumns(cols);
      setCards(crds);
      setContacts(ctcts);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load workflow board');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const c1 = subscribeToWorkflowColumns(() => {
      ensureWorkflowColumns().then(setColumns).catch(() => {});
    });
    const c2 = subscribeToWorkflowCards(() => {
      getWorkflowCards().then(setCards).catch(() => {});
    });
    return () => {
      supabase.removeChannel(c1);
      supabase.removeChannel(c2);
    };
  }, [load]);

  useEffect(() => {
    if (!moveMenuId) return;
    const h = () => setMoveMenuId(null);
    document.addEventListener('click', h);
    return () => document.removeEventListener('click', h);
  }, [moveMenuId]);

  const contactById = useMemo(() => {
    const m = new Map<string, Contact>();
    contacts.forEach((c) => m.set(c.id, c));
    return m;
  }, [contacts]);

  const filteredCards = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return cards;
    return cards.filter((card) => {
      const c = card.contact_id ? contactById.get(card.contact_id) : null;
      const name = c?.name?.toLowerCase() ?? '';
      const company = c?.company?.toLowerCase() ?? '';
      return name.includes(q) || company.includes(q);
    });
  }, [cards, contactById, search]);

  const openAdd = (columnId: string) => {
    setForm(emptyForm(columnId));
    setInlineNew(false);
    setNewContact({ name: '', company: '', email: '', phone: '', status: 'Lead' });
    setFormError(null);
    setAddOpen(true);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSaving(true);
    try {
      let contactId = form.contact_id;
      if (inlineNew) {
        if (!newContact.name.trim()) {
          setFormError('New contact name is required');
          setSaving(false);
          return;
        }
        const created = await createContact(newContact);
        contactId = created.id;
        setContacts((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      }
      if (!contactId) {
        setFormError('Please choose a client');
        setSaving(false);
        return;
      }
      const contact = contactById.get(contactId) ?? contacts.find((c) => c.id === contactId);
      await createWorkflowCard({
        column_id: form.column_id,
        contact_id: contactId,
        title: contact?.name ?? 'Client',
        status_note: form.status_note,
        due_date: form.due_date || null,
        assignee_name: form.assignee_name,
        priority: form.priority,
      });
      const targetCol = columns.find((c) => c.id === form.column_id);
      logActivity('workflow', `Added ${contact?.name ?? 'client'} to '${targetCol?.name ?? 'column'}'`, contactId);
      if (preferences.workflowAlerts) {
        addToast('workflow', 'Card Added', `${contact?.name ?? 'Client'} added to ${targetCol?.name ?? 'board'}`);
      }
      setAddOpen(false);
      await load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to add card');
    } finally {
      setSaving(false);
    }
  };

  const handleMove = async (card: WorkflowCard, targetColumnId: string) => {
    if (card.column_id === targetColumnId) return;
    try {
      await updateWorkflowCard(card.id, { column_id: targetColumnId, moved_at: new Date().toISOString() });
      const targetCol = columns.find((c) => c.id === targetColumnId);
      const contact = card.contact_id ? contactById.get(card.contact_id) : null;
      if (targetCol) {
        logActivity('workflow', `${contact?.name ?? 'Card'} moved to '${targetCol.name}'`, card.contact_id ?? undefined);
        if (preferences.workflowAlerts) {
          addToast('workflow', 'Card Moved', `${contact?.name ?? 'Card'} moved to '${targetCol.name}'`);
        }
      }
      await load();
    } catch (err) {
      addToast('error', 'Move failed', err instanceof Error ? err.message : 'Could not move card');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteWorkflowCard(deleteTarget.id);
      setDeleteTarget(null);
      await load();
    } catch (err) {
      addToast('error', 'Delete failed', err instanceof Error ? err.message : 'Could not delete card');
    }
  };

  // ---- Detail modal loader ----
  const detailCard = detailCardId ? cards.find((c) => c.id === detailCardId) ?? null : null;
  const detailContact = detailCard?.contact_id ? contactById.get(detailCard.contact_id) ?? null : null;

  useEffect(() => {
    if (!detailCard || !detailContact) {
      setDetailInvoices([]);
      setDetailNotes([]);
      return;
    }
    let cancelled = false;
    setDetailLoading(true);
    Promise.all([getInvoicesForContact(detailContact), getNotesForContact(detailContact.id)])
      .then(([inv, notes]) => {
        if (cancelled) return;
        setDetailInvoices(inv);
        setDetailNotes(notes);
      })
      .catch(() => {})
      .finally(() => !cancelled && setDetailLoading(false));
    return () => {
      cancelled = true;
    };
  }, [detailCard, detailContact]);

  const handleAddNote = async () => {
    if (!detailContact || !noteDraft.trim()) return;
    setAddingNote(true);
    try {
      const created = await addNoteForContact(detailContact.id, noteDraft);
      setDetailNotes((prev) => [created, ...prev]);
      setNoteDraft('');
    } catch (err) {
      addToast('error', 'Note failed', err instanceof Error ? err.message : 'Could not add note');
    } finally {
      setAddingNote(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 md:p-8 max-w-7xl mx-auto">
        <PageHeader title="Workflow Board" subtitle="Loading..." />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-64 bg-gray-100 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-800 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 md:p-8 max-w-7xl mx-auto">
        <PageHeader title="Workflow Board" />
        <Card className="p-6">
          <p className="text-red-600 dark:text-red-400">{error}</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <PageHeader
        title="Workflow Board"
        subtitle={`${cards.length} ${cards.length === 1 ? 'client' : 'clients'} across ${columns.length} columns`}
        action={
          <Button onClick={() => openAdd(columns[0]?.id ?? '')}>
            <span className="flex items-center gap-2"><Plus className="w-4 h-4" /> Add Card</span>
          </Button>
        }
      />

      {/* Search bar */}
      <div className="mb-5 relative">
        <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by client name or company..."
          className="w-full pl-10 pr-3 py-2 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {columns.map((col) => {
          const colCards = filteredCards.filter((c) => c.column_id === col.id);
          return (
            <div key={col.id} className="bg-gray-50 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-800 rounded-xl p-3 flex flex-col min-h-[400px]">
              <div className="flex items-center justify-between mb-3 px-1">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{col.name}</h3>
                  <p className="text-xs text-gray-400 dark:text-gray-500">{colCards.length} {colCards.length === 1 ? 'client' : 'clients'}</p>
                </div>
                <button
                  onClick={() => openAdd(col.id)}
                  aria-label={`Add card to ${col.name}`}
                  className="w-7 h-7 rounded-md text-gray-400 hover:text-violet-600 hover:bg-violet-500/10 flex items-center justify-center transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 space-y-2">
                {colCards.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-gray-800/60 flex items-center justify-center mb-3">
                      <Users className="w-6 h-6 text-gray-400 dark:text-gray-500" />
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">No clients in {col.name} yet</p>
                  </div>
                ) : (
                  colCards.map((card) => {
                    const contact = card.contact_id ? contactById.get(card.contact_id) : null;
                    const p = priorityStyles[card.priority];
                    const dateStr = card.due_date
                      ? `Due ${new Date(card.due_date).toLocaleDateString()}`
                      : card.moved_at
                      ? `Updated ${new Date(card.moved_at).toLocaleDateString()}`
                      : '';
                    return (
                      <div
                        key={card.id}
                        onClick={() => setDetailCardId(card.id)}
                        className={`bg-white dark:bg-gray-800/60 rounded-lg p-3 shadow-sm hover:shadow-md cursor-pointer transition-all ${p.border}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                              {contact?.name ?? 'Unknown client'}
                            </p>
                            {contact?.company && (
                              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{contact.company}</p>
                            )}
                          </div>
                          <span className={`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full ${p.badge}`}>{p.label}</span>
                        </div>

                        {card.status_note && (
                          <p className="mt-2 text-xs text-gray-600 dark:text-gray-300 line-clamp-1">{card.status_note}</p>
                        )}

                        <div className="mt-3 flex items-center justify-between gap-2 text-[11px] text-gray-500 dark:text-gray-400">
                          <span className="flex items-center gap-1 truncate">
                            <Calendar className="w-3 h-3" />
                            {dateStr || '—'}
                          </span>
                          {card.assignee_name && (
                            <span className="flex items-center gap-1 truncate">
                              <UserIcon className="w-3 h-3" />
                              <span className="truncate">{card.assignee_name}</span>
                            </span>
                          )}
                        </div>

                        <div className="mt-3 flex items-center justify-between gap-2" onClick={(e) => e.stopPropagation()}>
                          <div className="relative">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setMoveMenuId(moveMenuId === card.id ? null : card.id);
                              }}
                              className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-md border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/60 transition-colors"
                            >
                              Move <ChevronDown className="w-3 h-3" />
                            </button>
                            {moveMenuId === card.id && (
                              <div className="absolute z-20 mt-1 left-0 w-48 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1">
                                {columns.filter((c) => c.id !== card.column_id).map((target) => (
                                  <button
                                    key={target.id}
                                    onClick={() => {
                                      setMoveMenuId(null);
                                      handleMove(card, target.id);
                                    }}
                                    className="w-full text-left px-3 py-1.5 text-xs text-gray-700 dark:text-gray-200 hover:bg-violet-500/10 hover:text-violet-600 dark:hover:text-violet-400 transition-colors"
                                  >
                                    Move to {target.name}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => setDeleteTarget(card)}
                            aria-label="Delete card"
                            className="text-gray-400 hover:text-red-500 p-1 rounded"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add card modal */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add client to workflow">
        <form onSubmit={handleAdd} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Client</label>
            {!inlineNew ? (
              <>
                <select
                  value={form.contact_id}
                  onChange={(e) => setForm({ ...form, contact_id: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500"
                >
                  <option value="">Select an existing client...</option>
                  {contacts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}{c.company ? ` — ${c.company}` : ''}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setInlineNew(true)}
                  className="mt-2 text-xs text-violet-600 dark:text-violet-400 hover:underline"
                >
                  + Create new contact
                </button>
              </>
            ) : (
              <div className="space-y-2 border border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-3">
                <Input label="Name" value={newContact.name} onChange={(v) => setNewContact({ ...newContact, name: v })} required />
                <Input label="Company" value={newContact.company} onChange={(v) => setNewContact({ ...newContact, company: v })} />
                <div className="grid grid-cols-2 gap-2">
                  <Input label="Email" value={newContact.email} onChange={(v) => setNewContact({ ...newContact, email: v })} />
                  <Input label="Phone" value={newContact.phone} onChange={(v) => setNewContact({ ...newContact, phone: v })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Status</label>
                  <select
                    value={newContact.status}
                    onChange={(e) => setNewContact({ ...newContact, status: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500"
                  >
                    {CONTACT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <button
                  type="button"
                  onClick={() => setInlineNew(false)}
                  className="text-xs text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
                >
                  ← Pick from existing contacts instead
                </button>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Status note</label>
            <input
              value={form.status_note}
              onChange={(e) => setForm({ ...form, status_note: e.target.value })}
              placeholder="e.g. Awaiting contract signature"
              className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Due date</label>
              <input
                type="date"
                value={form.due_date}
                onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Priority</label>
              <select
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value as 'low' | 'medium' | 'high' })}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500"
              >
                {CARD_PRIORITIES.map((p) => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
              </select>
            </div>
          </div>

          <Input label="Assignee" value={form.assignee_name} onChange={(v) => setForm({ ...form, assignee_name: v })} placeholder="Team member name" />

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Column</label>
            <select
              value={form.column_id}
              onChange={(e) => setForm({ ...form, column_id: e.target.value })}
              className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500"
            >
              {columns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          {formError && <p className="text-sm text-red-600 dark:text-red-400">{formError}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setAddOpen(false)} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">Cancel</button>
            <Button type="submit" disabled={saving}>{saving ? 'Adding...' : 'Add Card'}</Button>
          </div>
        </form>
      </Modal>

      {/* Detail modal */}
      <Modal open={!!detailCard} onClose={() => setDetailCardId(null)} title={detailContact?.name ?? 'Client details'}>
        {detailCard && (
          <div className="space-y-5">
            {/* Contact info */}
            <div>
              <h4 className="text-xs uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2">Contact</h4>
              {detailContact ? (
                <div className="space-y-1.5 text-sm">
                  <p className="font-medium text-gray-900 dark:text-gray-100">{detailContact.name}</p>
                  {detailContact.company && (
                    <p className="flex items-center gap-2 text-gray-600 dark:text-gray-300"><Building2 className="w-3.5 h-3.5" /> {detailContact.company}</p>
                  )}
                  {detailContact.email && (
                    <p className="flex items-center gap-2 text-gray-600 dark:text-gray-300"><Mail className="w-3.5 h-3.5" /> {detailContact.email}</p>
                  )}
                  {detailContact.phone && (
                    <p className="flex items-center gap-2 text-gray-600 dark:text-gray-300"><Phone className="w-3.5 h-3.5" /> {detailContact.phone}</p>
                  )}
                  <p className="text-xs text-gray-500 dark:text-gray-400">Status: <span className="font-medium text-gray-700 dark:text-gray-200">{detailContact.status}</span></p>
                </div>
              ) : (
                <p className="text-sm text-gray-500">No contact linked.</p>
              )}
            </div>

            {/* Card meta */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-2.5">
                <p className="text-gray-400">Priority</p>
                <p className="mt-0.5"><span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${priorityStyles[detailCard.priority].badge}`}>{priorityStyles[detailCard.priority].label}</span></p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-2.5">
                <p className="text-gray-400">Due date</p>
                <p className="mt-0.5 text-gray-800 dark:text-gray-200">{detailCard.due_date ? new Date(detailCard.due_date).toLocaleDateString() : '—'}</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-2.5">
                <p className="text-gray-400">Assignee</p>
                <p className="mt-0.5 text-gray-800 dark:text-gray-200">{detailCard.assignee_name || '—'}</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-2.5">
                <p className="text-gray-400">Status note</p>
                <p className="mt-0.5 text-gray-800 dark:text-gray-200">{detailCard.status_note || '—'}</p>
              </div>
            </div>

            {/* Invoices */}
            <div>
              <h4 className="text-xs uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2 flex items-center gap-2">
                <FileText className="w-3.5 h-3.5" /> Invoices
              </h4>
              {detailLoading ? (
                <p className="text-sm text-gray-500">Loading...</p>
              ) : detailInvoices.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">No invoices for this client.</p>
              ) : (
                <div className="space-y-1.5">
                  {detailInvoices.map((inv) => (
                    <div key={inv.id} className="flex items-center justify-between text-sm bg-gray-50 dark:bg-gray-800/50 rounded-lg px-3 py-2">
                      <span className="text-gray-700 dark:text-gray-200 font-medium">
                        {formatCurrency(Number(inv.amount), currencyCode, currencyDisplayMode)}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400 truncate mx-3">{inv.invoice_number ?? inv.id.slice(0, 8)}</span>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${invoiceStatusStyles[inv.status] ?? ''}`}>
                        {inv.status.charAt(0).toUpperCase() + inv.status.slice(1)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Notes */}
            <div>
              <h4 className="text-xs uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2 flex items-center gap-2">
                <StickyNote className="w-3.5 h-3.5" /> Notes history
              </h4>
              <div className="space-y-2 mb-3 max-h-48 overflow-y-auto">
                {detailLoading ? (
                  <p className="text-sm text-gray-500">Loading...</p>
                ) : detailNotes.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400">No notes yet.</p>
                ) : (
                  detailNotes.map((n) => (
                    <div key={n.id} className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-2.5">
                      <p className="text-sm text-gray-800 dark:text-gray-100 whitespace-pre-wrap">{n.body}</p>
                      <p className="text-[10px] text-gray-400 mt-1">{n.created_at ? new Date(n.created_at).toLocaleString() : ''}</p>
                    </div>
                  ))
                )}
              </div>
              <div className="flex gap-2">
                <input
                  value={noteDraft}
                  onChange={(e) => setNoteDraft(e.target.value)}
                  placeholder="Add a note..."
                  disabled={!detailContact}
                  className="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500"
                />
                <Button type="button" onClick={handleAddNote} disabled={addingNote || !noteDraft.trim() || !detailContact}>
                  {addingNote ? 'Saving...' : 'Add'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete confirmation */}
      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete card?">
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
          This removes the workflow card. The linked contact and their invoices are not affected.
        </p>
        <div className="flex justify-end gap-2">
          <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">Cancel</button>
          <button onClick={handleDelete} className="px-4 py-2 text-sm rounded-lg bg-red-600 hover:bg-red-700 text-white">Delete</button>
        </div>
      </Modal>
    </div>
  );
}
