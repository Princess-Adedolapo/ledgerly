import { useEffect, useState, useCallback } from 'react';
import { supabase, type Contact, CONTACT_STATUSES } from '../lib/supabase';
import { PageHeader, Card, StatusBadge, Button, Input, Select, Modal, EmptyState } from '../components/ui';
import { UserPlus, Search, Pencil, Trash2, Users, Mail, Phone, Building2, Download } from 'lucide-react';
import { exportToCSV, formatDateForFilename } from '../utils/csvExport';
import { ContactDetailPanel } from '../components/contacts/ContactDetailPanel';
import { useToast } from '../contexts/ToastContext';
import { useActivityLog } from '../contexts/ActivityLogContext';
import { useNotificationPreferences } from '../contexts/NotificationContext';
import { useActiveWorkspaceId } from '../lib/workspace';

export default function Contacts() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Contact | null>(null);
  const [form, setForm] = useState({ name: '', email: '', phone: '', company: '', status: 'Lead' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [panelContact, setPanelContact] = useState<Contact | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const { addToast } = useToast();
  const { logActivity } = useActivityLog();
  const { preferences } = useNotificationPreferences();
  const workspaceId = useActiveWorkspaceId();

  const load = useCallback(async () => {
    if (!workspaceId) { setContacts([]); setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase.from('contacts').select('*').eq('workspace_id', workspaceId).order('created_at', { ascending: false });
    setContacts(data ?? []);
    setLoading(false);
  }, [workspaceId]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = contacts.filter((c) => {
    const matchesSearch =
      !search ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.email ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (c.company ?? '').toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'All' || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const openAdd = () => {
    setEditing(null);
    setForm({ name: '', email: '', phone: '', company: '', status: 'Lead' });
    setError(null);
    setModalOpen(true);
  };

  const handleExport = () => {
    const data = filtered.map((c) => ({
      Name: c.name,
      Email: c.email ?? '',
      Phone: c.phone ?? '',
      'Business Name': c.company ?? '',
      Status: c.status,
      'Date Added': c.created_at ? new Date(c.created_at).toISOString().split('T')[0] : '',
    }));
    exportToCSV(data, `contacts_export_${formatDateForFilename()}.csv`);
  };

  const openEdit = (c: Contact) => {
    setEditing(c);
    setForm({ name: c.name, email: c.email ?? '', phone: c.phone ?? '', company: c.company ?? '', status: c.status });
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
    if (editing) {
      const { error } = await supabase
        .from('contacts')
        .update({ name: form.name.trim(), email: form.email.trim() || null, phone: form.phone.trim() || null, company: form.company.trim() || null, status: form.status })
        .eq('id', editing.id);
      if (error) setError(error.message);
    } else {
      if (!workspaceId) {
        setError('No active workspace');
        setSaving(false);
        return;
      }
      const { data, error } = await supabase
        .from('contacts')
        .insert({ name: form.name.trim(), email: form.email.trim() || null, phone: form.phone.trim() || null, company: form.company.trim() || null, status: form.status, workspace_id: workspaceId })
        .select('*')
        .maybeSingle();
      if (error) {
        setError(error.message);
      } else if (data) {
        const newContact = data as Contact;
        logActivity('contact', `Contact '${newContact.name}' was registered`, newContact.id);
        if (preferences.contactAlerts) {
          addToast('contact', 'New Contact', `Contact '${newContact.name}' was registered`);
        }
      }
    }
    setSaving(false);
    if (!error) {
      setModalOpen(false);
      load();
    }
  };

  const handleDelete = async (c: Contact) => {
    if (!confirm(`Delete "${c.name}"? This also removes their notes.`)) return;
    await supabase.from('contacts').delete().eq('id', c.id);
    load();
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <PageHeader
        title="Contacts"
        subtitle={`${contacts.length} ${contacts.length === 1 ? 'contact' : 'contacts'} in your CRM`}
        action={
          <div className="flex gap-2">
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
      </div>

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
            subtitle={contacts.length === 0 ? 'Click "Add Contact" to create your first record' : 'Try adjusting your search or filter'}
          />
        </Card>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block">
            <Card className="overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-800">
                    <th className="text-left text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider px-5 py-3">Name</th>
                    <th className="text-left text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider px-5 py-3">Company</th>
                    <th className="text-left text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider px-5 py-3">Email</th>
                    <th className="text-left text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider px-5 py-3">Phone</th>
                    <th className="text-left text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider px-5 py-3">Status</th>
                    <th className="px-5 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c) => (
                    <tr key={c.id} className="border-b border-gray-100 dark:border-gray-800/50 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors group">
                      <td className="px-5 py-3">
                        <button onClick={() => { setPanelContact(c); setPanelOpen(true); }} className="text-sm font-medium text-gray-900 dark:text-gray-100 hover:text-violet-600 dark:hover:text-violet-400 transition-colors text-left">
                          {c.name}
                        </button>
                      </td>
                      <td className="px-5 py-3 text-sm text-gray-500 dark:text-gray-400">{c.company || '—'}</td>
                      <td className="px-5 py-3 text-sm text-gray-500 dark:text-gray-400">{c.email || '—'}</td>
                      <td className="px-5 py-3 text-sm text-gray-500 dark:text-gray-400">{c.phone || '—'}</td>
                      <td className="px-5 py-3"><StatusBadge status={c.status} /></td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => openEdit(c)} aria-label="Edit contact" className="p-1.5 text-gray-400 hover:text-violet-500 hover:bg-gray-100 dark:hover:bg-gray-700/50 rounded-lg transition-all">
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete(c)} aria-label="Delete contact" className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {filtered.map((c) => (
              <Card key={c.id} className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <button onClick={() => { setPanelContact(c); setPanelOpen(true); }} className="text-base font-medium text-gray-900 dark:text-gray-100 hover:text-violet-600 dark:hover:text-violet-400 text-left">
                    {c.name}
                  </button>
                  <StatusBadge status={c.status} />
                </div>
                <div className="space-y-1.5 text-sm text-gray-500 dark:text-gray-400">
                  {c.company && <p className="flex items-center gap-2"><Building2 className="w-3.5 h-3.5" /> {c.company}</p>}
                  {c.email && <p className="flex items-center gap-2"><Mail className="w-3.5 h-3.5" /> {c.email}</p>}
                  {c.phone && <p className="flex items-center gap-2"><Phone className="w-3.5 h-3.5" /> {c.phone}</p>}
                </div>
                <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                  <button onClick={() => openEdit(c)} className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 hover:text-violet-500">
                    <Pencil className="w-3.5 h-3.5" /> Edit
                  </button>
                  <button onClick={() => handleDelete(c)} className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 hover:text-red-500 ml-auto">
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                  </button>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Contact' : 'Add Contact'}>
        <form onSubmit={handleSave} className="space-y-4">
          <Input label="Name *" value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="Jane Doe" required />
          <Input label="Email" type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} placeholder="jane@company.com" />
          <Input label="Phone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} placeholder="+1 555 0100" />
          <Input label="Company" value={form.company} onChange={(v) => setForm({ ...form, company: v })} placeholder="Acme Inc." />
          <Select label="Status" value={form.status} onChange={(v) => setForm({ ...form, status: v })} options={CONTACT_STATUSES} />
          {error && <p className="text-sm text-red-600 dark:text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg p-3">{error}</p>}
          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={saving}>{saving ? 'Saving...' : editing ? 'Save Changes' : 'Add Contact'}</Button>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
          </div>
        </form>
      </Modal>

      <ContactDetailPanel
        contact={panelContact}
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
      />
    </div>
  );
}
