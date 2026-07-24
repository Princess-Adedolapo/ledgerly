import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  X, Mail, Phone, Building2, UserPlus, FileText, KanbanSquare, RefreshCw, Clock, Tag, Plus,
  PhoneCall, ExternalLink, Trash2, MessageSquare
} from 'lucide-react';
import { supabase, type Contact } from '../../lib/supabase';
import { StatusBadge, Button } from '../ui';
import { useActivityLog, type ActivityType } from '../../contexts/ActivityLogContext';
import {
  getContactTags,
  saveContactTags,
  getContactCustomFields,
  saveContactCustomFields,
  DEFAULT_SUGGESTED_TAGS,
  type CustomField,
} from '../../utils/contactMeta';
import { useToast } from '../../contexts/ToastContext';

const typeIcon: Record<ActivityType, typeof UserPlus> = {
  contact: UserPlus,
  invoice: FileText,
  workflow: KanbanSquare,
  status: RefreshCw,
};

const typeColor: Record<ActivityType, string> = {
  contact: 'text-sky-500 bg-sky-500/10',
  invoice: 'text-violet-500 bg-violet-500/10',
  workflow: 'text-amber-500 bg-amber-500/10',
  status: 'text-emerald-500 bg-emerald-500/10',
};

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

export function ContactDetailPanel({
  contact,
  open,
  onClose,
}: {
  contact: Contact | null;
  open: boolean;
  onClose: () => void;
}) {
  const { getContactActivity, logActivity } = useActivityLog();
  const { addToast } = useToast();

  const [activeTab, setActiveTab] = useState<'details' | 'timeline'>('details');

  // Tags & Custom fields state
  const [tags, setTags] = useState<string[]>([]);
  const [newTagInput, setNewTagInput] = useState('');
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  
  // New field modal/form state
  const [isAddingField, setIsAddingField] = useState(false);
  const [newFieldKey, setNewFieldKey] = useState('');
  const [newFieldValue, setNewFieldValue] = useState('');

  // Workflow stage state
  const [workflowColName, setWorkflowColName] = useState<string | null>(null);

  // Timeline Filter & Actions
  const [timelineFilter, setTimelineFilter] = useState<'all' | 'notes' | 'emails' | 'calls' | 'workflow'>('all');
  
  // Quick Log Actions
  const [logAction, setLogAction] = useState<'none' | 'note' | 'call' | 'email'>('none');
  const [logText, setLogText] = useState('');
  const [callOutcome, setCallOutcome] = useState('Completed');
  const [savingLog, setSavingLog] = useState(false);

  const loadExtraData = useCallback(async () => {
    if (!contact) return;

    // Load Tags and Custom Fields
    setTags(getContactTags(contact.id));
    setCustomFields(getContactCustomFields(contact.id));

    // Load Workflow stage
    try {
      const { data: cards } = await supabase
        .from('workflow_cards')
        .select('*')
        .eq('contact_id', contact.id)
        .order('moved_at', { ascending: false });

      if (cards && cards.length > 0) {
        const topCard = cards[0];

        const { data: col } = await supabase
          .from('workflow_columns')
          .select('name')
          .eq('id', topCard.column_id)
          .maybeSingle();

        if (col) {
          setWorkflowColName(col.name);
        }
      } else {
        setWorkflowColName(null);
      }
    } catch (e) {
      console.error('Failed to load workflow stage for drawer', e);
    }
  }, [contact]);

  useEffect(() => {
    if (open && contact) {
      loadExtraData();
    }
  }, [open, contact, loadExtraData]);

  useEffect(() => {
    if (!open) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [open, onClose]);

  if (!contact) return null;

  // Tag Handlers
  const handleAddTag = (tagName: string) => {
    const trimmed = tagName.trim();
    if (!trimmed || tags.includes(trimmed)) return;
    const updated = [...tags, trimmed];
    setTags(updated);
    saveContactTags(contact.id, updated);
    setNewTagInput('');
    addToast('success', 'Tag Added', `Tag "${trimmed}" added.`);
  };

  const handleRemoveTag = (tagName: string) => {
    const updated = tags.filter((t) => t !== tagName);
    setTags(updated);
    saveContactTags(contact.id, updated);
  };

  // Custom Field Handlers
  const handleSaveCustomField = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFieldKey.trim() || !newFieldValue.trim()) return;
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

  const handleDeleteCustomField = (id: string) => {
    const updated = customFields.filter((f) => f.id !== id);
    setCustomFields(updated);
    saveContactCustomFields(contact.id, updated);
  };

  // Quick Log Action Handler
  const handleSubmitQuickLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!logText.trim()) return;
    setSavingLog(true);

    try {
      if (logAction === 'note') {
        await supabase.from('notes').insert({
          contact_id: contact.id,
          body: logText.trim(),
          workspace_id: contact.workspace_id,
        });
        logActivity('contact', `[Note] ${logText.trim()}`, contact.id);
        addToast('success', 'Note Logged', 'Interaction note added.');
      } else if (logAction === 'call') {
        const msg = `[Phone Call - ${callOutcome}] ${logText.trim()}`;
        await supabase.from('notes').insert({
          contact_id: contact.id,
          body: msg,
          workspace_id: contact.workspace_id,
        });
        logActivity('contact', msg, contact.id);
        addToast('success', 'Call Logged', `Phone call outcome recorded.`);
      } else if (logAction === 'email') {
        const msg = `[Email Logged] ${logText.trim()}`;
        await supabase.from('notes').insert({
          contact_id: contact.id,
          body: msg,
          workspace_id: contact.workspace_id,
        });
        logActivity('contact', msg, contact.id);
        addToast('success', 'Email Logged', 'Email record saved to timeline.');
      }

      setLogText('');
      setLogAction('none');
    } catch (err) {
      console.error(err);
      addToast('error', 'Error Logging Activity', 'Could not save log.');
    } finally {
      setSavingLog(false);
    }
  };

  // Activities & Filters
  const rawActivities = getContactActivity(contact.id);
  const filteredActivities = rawActivities.filter((act) => {
    if (timelineFilter === 'all') return true;
    if (timelineFilter === 'notes') return act.message.toLowerCase().includes('[note]') || act.type === 'contact';
    if (timelineFilter === 'calls') return act.message.toLowerCase().includes('call') || act.message.toLowerCase().includes('phone');
    if (timelineFilter === 'emails') return act.message.toLowerCase().includes('email');
    if (timelineFilter === 'workflow') return act.type === 'workflow' || act.message.toLowerCase().includes('stage') || act.message.toLowerCase().includes('card');
    return true;
  });

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${
          open ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Sliding panel */}
      <div
        className={`fixed top-0 right-0 z-50 h-full w-full sm:w-[500px] bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800 shadow-2xl transition-transform duration-300 ease-out ${
          open ? 'translate-x-0' : 'translate-x-full'
        } flex flex-col`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-800 shrink-0 bg-gray-50/50 dark:bg-gray-900/50">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">Contact Profile</h2>
            <Link
              to={`/contacts/${contact.id}`}
              onClick={onClose}
              className="text-xs bg-violet-600 hover:bg-violet-700 text-white px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1 shadow-sm transition-all"
            >
              Open 360 <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
          <button onClick={onClose} aria-label="Close panel" className="text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contact High Level Card */}
        <div className="p-5 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shrink-0">
          <div className="flex items-start gap-4">
            <Link
              to={`/contacts/${contact.id}`}
              onClick={onClose}
              className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-xl font-bold text-white shrink-0 shadow-md hover:opacity-90 transition-opacity"
            >
              {contact.name[0]?.toUpperCase()}
            </Link>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <Link
                  to={`/contacts/${contact.id}`}
                  onClick={onClose}
                  className="text-lg font-bold text-gray-900 dark:text-gray-100 hover:text-violet-600 dark:hover:text-violet-400 hover:underline truncate block"
                >
                  {contact.name}
                </Link>
                <StatusBadge status={contact.status} />
              </div>

              {/* Deal / Workflow Stage Badge */}
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {workflowColName ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20">
                    <KanbanSquare className="w-3 h-3" /> Stage: {workflowColName}
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-500/10 text-gray-500 border border-gray-500/20">
                    No Stage Assigned
                  </span>
                )}

                {contact.description_type && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                    {contact.description_type}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Contact Methods */}
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-gray-600 dark:text-gray-300">
            {contact.email && (
              <a href={`mailto:${contact.email}`} className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 dark:bg-gray-800/40 hover:bg-violet-500/10 transition-colors truncate">
                <Mail className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                <span className="truncate">{contact.email}</span>
              </a>
            )}
            {contact.phone && (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 dark:bg-gray-800/40">
                <Phone className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                <span>{contact.phone}</span>
              </div>
            )}
            {contact.company && (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 dark:bg-gray-800/40 sm:col-span-2">
                <Building2 className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                <span>{contact.company}</span>
              </div>
            )}
          </div>
        </div>

        {/* Drawer Navigation Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-800 bg-gray-50/30 dark:bg-gray-900/30 px-5 pt-2 shrink-0">
          <button
            onClick={() => setActiveTab('details')}
            className={`pb-2.5 px-4 text-xs font-bold border-b-2 transition-colors ${
              activeTab === 'details'
                ? 'border-violet-600 text-violet-600 dark:text-violet-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
            }`}
          >
            Tags & Custom Fields
          </button>
          <button
            onClick={() => setActiveTab('timeline')}
            className={`pb-2.5 px-4 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'timeline'
                ? 'border-violet-600 text-violet-600 dark:text-violet-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
            }`}
          >
            <Clock className="w-3.5 h-3.5" /> Timeline & Logs ({rawActivities.length})
          </button>
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {activeTab === 'details' && (
            <div className="space-y-6">
              {/* SECTION 1: TAGS SYSTEM */}
              <div className="bg-gray-50/70 dark:bg-gray-800/30 border border-gray-200 dark:border-gray-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wider flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" /> Contact Tags
                  </h4>
                  <span className="text-[10px] text-gray-400">{tags.length} assigned</span>
                </div>

                {/* Display Current Tags */}
                <div className="flex flex-wrap gap-1.5">
                  {tags.length === 0 ? (
                    <p className="text-xs text-gray-400 italic">No tags assigned yet. Click a suggestion below to add.</p>
                  ) : (
                    tags.map((t) => (
                      <span
                        key={t}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-violet-600 text-white shadow-sm"
                      >
                        {t}
                        <button
                          onClick={() => handleRemoveTag(t)}
                          className="hover:bg-white/20 rounded p-0.5 transition-colors"
                          title="Remove tag"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))
                  )}
                </div>

                {/* Tag Quick Suggestions */}
                <div className="pt-2 border-t border-gray-200 dark:border-gray-800/60">
                  <span className="text-[10px] font-semibold text-gray-400 uppercase block mb-1.5">Quick Add Tags:</span>
                  <div className="flex flex-wrap gap-1">
                    {DEFAULT_SUGGESTED_TAGS.filter((st) => !tags.includes(st)).map((st) => (
                      <button
                        key={st}
                        onClick={() => handleAddTag(st)}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-violet-500 hover:text-white transition-all"
                      >
                        <Plus className="w-3 h-3" /> {st}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom Tag Input */}
                <div className="flex gap-2 pt-1">
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
                    className="flex-1 px-3 py-1.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                  <button
                    onClick={() => handleAddTag(newTagInput)}
                    disabled={!newTagInput.trim()}
                    className="px-3 py-1.5 bg-violet-600 text-white rounded-lg text-xs font-semibold hover:bg-violet-700 disabled:opacity-50 transition-colors"
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* SECTION 2: CUSTOM KEY-VALUE FIELDS */}
              <div className="bg-gray-50/70 dark:bg-gray-800/30 border border-gray-200 dark:border-gray-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wider flex items-center gap-1.5">
                    Custom Metadata Fields
                  </h4>
                  <button
                    onClick={() => setIsAddingField(!isAddingField)}
                    className="text-xs text-violet-600 dark:text-violet-400 font-semibold hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Field
                  </button>
                </div>

                {/* Inline Add Custom Field Form */}
                {isAddingField && (
                  <form onSubmit={handleSaveCustomField} className="p-3 bg-white dark:bg-gray-900 border border-violet-500/30 rounded-lg space-y-2">
                    <p className="text-xs font-semibold text-violet-600 dark:text-violet-400">New Custom Metadata</p>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="Key (e.g. Budget)"
                        value={newFieldKey}
                        onChange={(e) => setNewFieldKey(e.target.value)}
                        className="px-2.5 py-1.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                        required
                      />
                      <input
                        type="text"
                        placeholder="Value (e.g. $50k)"
                        value={newFieldValue}
                        onChange={(e) => setNewFieldValue(e.target.value)}
                        className="px-2.5 py-1.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                        required
                      />
                    </div>
                    <div className="flex justify-end gap-2 pt-1">
                      <Button size="sm" variant="secondary" type="button" onClick={() => setIsAddingField(false)}>
                        Cancel
                      </Button>
                      <Button size="sm" type="submit">
                        Save Field
                      </Button>
                    </div>
                  </form>
                )}

                {/* Custom Fields List */}
                {customFields.length === 0 ? (
                  <p className="text-xs text-gray-400 italic">No custom fields defined. Add key-value data like Referral Source or Budget.</p>
                ) : (
                  <div className="space-y-2">
                    {customFields.map((cf) => (
                      <div key={cf.id} className="flex items-center justify-between p-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg text-xs">
                        <div className="min-w-0 pr-2">
                          <span className="font-semibold text-gray-500 dark:text-gray-400 block text-[10px] uppercase">{cf.key}</span>
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

              {/* Remarks Note */}
              {contact.description_note && (
                <div className="p-4 bg-gray-50 dark:bg-gray-800/30 border border-gray-200 dark:border-gray-800 rounded-xl space-y-1">
                  <h4 className="text-xs font-bold text-gray-400 uppercase">Remarks & Description</h4>
                  <p className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{contact.description_note}</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'timeline' && (
            <div className="space-y-4">
              {/* Quick Action Toolbar */}
              <div className="flex flex-wrap gap-2 pb-2 border-b border-gray-200 dark:border-gray-800">
                <button
                  onClick={() => setLogAction(logAction === 'call' ? 'none' : 'call')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                    logAction === 'call' ? 'bg-violet-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-violet-500/10'
                  }`}
                >
                  <PhoneCall className="w-3.5 h-3.5" /> Log Call
                </button>
                <button
                  onClick={() => setLogAction(logAction === 'note' ? 'none' : 'note')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                    logAction === 'note' ? 'bg-violet-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-violet-500/10'
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5" /> Add Note
                </button>
                <button
                  onClick={() => setLogAction(logAction === 'email' ? 'none' : 'email')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                    logAction === 'email' ? 'bg-violet-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-violet-500/10'
                  }`}
                >
                  <Mail className="w-3.5 h-3.5" /> Log Email
                </button>
              </div>

              {/* Quick Action Form */}
              {logAction !== 'none' && (
                <form onSubmit={handleSubmitQuickLog} className="p-3 bg-violet-500/5 border border-violet-500/20 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-violet-600 dark:text-violet-400 capitalize">
                      Log {logAction}
                    </span>
                    <button type="button" onClick={() => setLogAction('none')} className="text-gray-400 hover:text-gray-600">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {logAction === 'call' && (
                    <div>
                      <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">Call Outcome</label>
                      <select
                        value={callOutcome}
                        onChange={(e) => setCallOutcome(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded text-xs text-gray-900 dark:text-white"
                      >
                        <option value="Completed">Completed / Spoke with contact</option>
                        <option value="Left Voicemail">Left Voicemail</option>
                        <option value="No Answer">No Answer</option>
                        <option value="Scheduled Follow-up">Scheduled Follow-up Call</option>
                      </select>
                    </div>
                  )}

                  <textarea
                    value={logText}
                    onChange={(e) => setLogText(e.target.value)}
                    placeholder={`Enter ${logAction} details or notes...`}
                    rows={2}
                    className="w-full px-2.5 py-1.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
                    required
                  />

                  <div className="flex justify-end gap-2">
                    <Button size="sm" variant="secondary" type="button" onClick={() => setLogAction('none')}>Cancel</Button>
                    <Button size="sm" type="submit" disabled={savingLog}>{savingLog ? 'Saving...' : 'Save Record'}</Button>
                  </div>
                </form>
              )}

              {/* Timeline Filters */}
              <div className="flex gap-1 overflow-x-auto pb-1 text-[11px]">
                {(['all', 'notes', 'calls', 'emails', 'workflow'] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setTimelineFilter(filter)}
                    className={`px-2.5 py-1 rounded-full capitalize font-semibold whitespace-nowrap transition-all ${
                      timelineFilter === filter
                        ? 'bg-violet-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:text-gray-900'
                    }`}
                  >
                    {filter}
                  </button>
                ))}
              </div>

              {/* Filtered Timeline List */}
              {filteredActivities.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 dark:bg-gray-800/30 rounded-xl border border-dashed border-gray-200 dark:border-gray-800">
                  <Clock className="w-6 h-6 text-gray-400 mx-auto mb-2" />
                  <p className="text-xs text-gray-400">No activity records match this filter.</p>
                </div>
              ) : (
                <div className="relative space-y-3 pl-2">
                  {filteredActivities.map((entry) => {
                    const Icon = typeIcon[entry.type] ?? Clock;
                    return (
                      <div key={entry.id} className="flex gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${typeColor[entry.type]}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0 pt-0.5">
                          <p className="text-xs text-gray-800 dark:text-gray-200 break-words font-medium">{entry.message}</p>
                          <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">{relativeTime(entry.timestamp)}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
