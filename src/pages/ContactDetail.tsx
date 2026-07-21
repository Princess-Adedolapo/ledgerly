import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase, type Contact, type Note, type Deal, CONTACT_STATUSES } from '../lib/supabase';
import { Card, StatusBadge, Button, Input, Select, Modal, EmptyState } from '../components/ui';
import { useUserPreferences } from '../lib/userPreferences';
import { formatCurrency } from '../lib/currency';
import { ArrowLeft, Mail, Phone, Building2, Pencil, Trash2, StickyNote, Plus, Clock, KanbanSquare } from 'lucide-react';

export default function ContactDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currencyCode, currencyDisplayMode } = useUserPreferences();
  const [contact, setContact] = useState<Contact | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', company: '', status: 'Lead' });
  const [noteBody, setNoteBody] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    const [c, n, d] = await Promise.all([
      supabase.from('contacts').select('*').eq('id', id).maybeSingle(),
      supabase.from('notes').select('*').eq('contact_id', id).order('created_at', { ascending: false }),
      supabase.from('deals').select('*').eq('contact_id', id).order('created_at', { ascending: false }),
    ]);
    setContact(c.data as Contact | null);
    setNotes(n.data ?? []);
    setDeals(d.data ?? []);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const openEdit = () => {
    if (!contact) return;
    setForm({ name: contact.name, email: contact.email ?? '', phone: contact.phone ?? '', company: contact.company ?? '', status: contact.status });
    setEditOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contact) return;
    await supabase
      .from('contacts')
      .update({ name: form.name.trim(), email: form.email.trim() || null, phone: form.phone.trim() || null, company: form.company.trim() || null, status: form.status })
      .eq('id', contact.id);
    setEditOpen(false);
    load();
  };

  const handleDelete = async () => {
    if (!contact) return;
    if (!confirm(`Delete "${contact.name}" and all associated notes?`)) return;
    await supabase.from('contacts').delete().eq('id', contact.id);
    navigate('/contacts');
  };

  const addNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contact || !noteBody.trim()) return;
    setSavingNote(true);
    await supabase.from('notes').insert({ contact_id: contact.id, body: noteBody.trim(), workspace_id: contact.workspace_id });
    setNoteBody('');
    setSavingNote(false);
    load();
  };

  const deleteNote = async (noteId: string) => {
    await supabase.from('notes').delete().eq('id', noteId);
    load();
  };

  if (loading) {
    return <div className="p-8"><div className="h-40 bg-gray-100 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-800 rounded-xl animate-pulse" /></div>;
  }

  if (!contact) {
    return (
      <div className="p-8">
        <Card className="p-0">
          <EmptyState icon={ArrowLeft} title="Contact not found" />
        </Card>
        <div className="mt-4">
          <Link to="/contacts" className="text-sm text-violet-600 dark:text-violet-400 hover:text-violet-500">← Back to contacts</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto">
      <Link to="/contacts" className="inline-flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors mb-6">
        <ArrowLeft className="w-4 h-4" /> Back to Contacts
      </Link>

      {/* Header */}
      <Card className="p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-500 flex items-center justify-center text-xl font-bold text-white shrink-0">
              {contact.name[0]?.toUpperCase()}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{contact.name}</h1>
              <div className="mt-2"><StatusBadge status={contact.status} /></div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={openEdit}><span className="flex items-center gap-2"><Pencil className="w-4 h-4" /> Edit</span></Button>
            <Button variant="danger" onClick={handleDelete}><span className="flex items-center gap-2"><Trash2 className="w-4 h-4" /></span></Button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6 pt-6 border-t border-gray-200 dark:border-gray-800">
          {contact.email && (
            <a href={`mailto:${contact.email}`} className="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-300 hover:text-violet-600 dark:hover:text-violet-400 transition-colors">
              <Mail className="w-4 h-4 text-gray-400 dark:text-gray-500" /> {contact.email}
            </a>
          )}
          {contact.phone && (
            <div className="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-300">
              <Phone className="w-4 h-4 text-gray-400 dark:text-gray-500" /> {contact.phone}
            </div>
          )}
          {contact.company && (
            <div className="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-300">
              <Building2 className="w-4 h-4 text-gray-400 dark:text-gray-500" /> {contact.company}
            </div>
          )}
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Notes / Activity log */}
        <div className="lg:col-span-2">
          <Card className="p-5">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              <StickyNote className="w-5 h-5 text-violet-600 dark:text-violet-400" /> Notes & Activity
            </h2>

            <form onSubmit={addNote} className="mb-5">
              <textarea
                value={noteBody}
                onChange={(e) => setNoteBody(e.target.value)}
                placeholder="Log a call, meeting, or interaction..."
                rows={3}
                aria-label="Note content"
                className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all resize-none"
              />
              <div className="flex justify-end mt-2">
                <Button type="submit" disabled={savingNote || !noteBody.trim()}>
                  <span className="flex items-center gap-2"><Plus className="w-4 h-4" /> {savingNote ? 'Adding...' : 'Add Note'}</span>
                </Button>
              </div>
            </form>

            {notes.length === 0 ? (
              <EmptyState icon={Clock} title="No notes yet" subtitle="Log interactions to keep track of your relationship" />
            ) : (
              <div className="space-y-3">
                {notes.map((n) => (
                  <div key={n.id} className="group bg-gray-50 dark:bg-gray-800/30 border border-gray-200 dark:border-gray-800 rounded-lg p-4">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm text-gray-700 dark:text-gray-200 whitespace-pre-wrap flex-1">{n.body}</p>
                      <button
                        onClick={() => deleteNote(n.id)}
                        aria-label="Delete note"
                        className="p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                      {n.created_at
                        ? new Date(n.created_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
                        : 'Just now'}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Deals sidebar */}
        <div>
          <Card className="p-5">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              <KanbanSquare className="w-5 h-5 text-violet-600 dark:text-violet-400" /> Linked Deals
            </h2>
            {deals.length === 0 ? (
              <EmptyState icon={KanbanSquare} title="No deals" subtitle="Link deals from the Workflow Board" />
            ) : (
              <div className="space-y-3">
                {deals.map((d) => (
                  <Link
                    key={d.id}
                    to="/workflow"
                    className="block bg-gray-50 dark:bg-gray-800/30 border border-gray-200 dark:border-gray-800 rounded-lg p-3 hover:border-gray-300 dark:hover:border-gray-700 transition-all"
                  >
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{d.title}</p>
                    <div className="flex items-center justify-between mt-2">
                      <StatusBadge status={d.stage} />
                      {Number(d.value) > 0 && <span className="text-sm text-gray-500 dark:text-gray-400">{formatCurrency(Number(d.value), currencyCode, currencyDisplayMode)}</span>}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit Contact">
        <form onSubmit={handleSaveEdit} className="space-y-4">
          <Input label="Name *" value={form.name} onChange={(v) => setForm({ ...form, name: v })} required />
          <Input label="Email" type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
          <Input label="Phone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
          <Input label="Company" value={form.company} onChange={(v) => setForm({ ...form, company: v })} />
          <Select label="Status" value={form.status} onChange={(v) => setForm({ ...form, status: v })} options={CONTACT_STATUSES} />
          <div className="flex gap-3 pt-2">
            <Button type="submit">Save Changes</Button>
            <Button variant="secondary" onClick={() => setEditOpen(false)}>Cancel</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
