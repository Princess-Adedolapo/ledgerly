import { useEffect } from 'react';
import { X, Mail, Phone, Building2, UserPlus, FileText, KanbanSquare, RefreshCw, Clock } from 'lucide-react';
import type { Contact } from '../../lib/supabase';
import { StatusBadge } from '../ui';
import { useActivityLog, type ActivityType } from '../../contexts/ActivityLogContext';

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
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  return `${months} month${months === 1 ? '' : 's'} ago`;
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
  const { getContactActivity } = useActivityLog();

  useEffect(() => {
    if (!open) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [open, onClose]);

  if (!contact) return null;

  const activities = getContactActivity(contact.id);

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
        className={`fixed top-0 right-0 z-50 h-full w-full sm:w-[420px] bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800 shadow-2xl transition-transform duration-300 ease-out ${
          open ? 'translate-x-0' : 'translate-x-full'
        } flex flex-col`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-800 shrink-0">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Contact Details</h2>
          <button onClick={onClose} aria-label="Close panel" className="text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Contact info */}
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-500 flex items-center justify-center text-xl font-bold text-white shrink-0">
              {contact.name[0]?.toUpperCase()}
            </div>
            <div className="min-w-0">
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">{contact.name}</h3>
              <div className="mt-1.5"><StatusBadge status={contact.status} /></div>
            </div>
          </div>

          <div className="space-y-3">
            {contact.email && (
              <a href={`mailto:${contact.email}`} className="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-300 hover:text-violet-600 dark:hover:text-violet-400 transition-colors">
                <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0">
                  <Mail className="w-4 h-4 text-gray-400" />
                </div>
                {contact.email}
              </a>
            )}
            {contact.phone && (
              <div className="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-300">
                <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0">
                  <Phone className="w-4 h-4 text-gray-400" />
                </div>
                {contact.phone}
              </div>
            )}
            {contact.company && (
              <div className="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-300">
                <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0">
                  <Building2 className="w-4 h-4 text-gray-400" />
                </div>
                {contact.company}
              </div>
            )}
          </div>

          {/* Recent activity timeline */}
          <div>
            <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              <Clock className="w-4 h-4 text-violet-500" />
              Recent Activity
            </h4>

            {activities.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-800/50 flex items-center justify-center mb-3">
                  <Clock className="w-6 h-6 text-gray-400 dark:text-gray-500" />
                </div>
                <p className="text-sm text-gray-400 dark:text-gray-500">No activity recorded yet.</p>
              </div>
            ) : (
              <div className="relative space-y-4 pl-2">
                {activities.map((entry, i) => {
                  const Icon = typeIcon[entry.type] ?? Clock;
                  return (
                    <div key={entry.id} className="flex gap-3">
                      {/* Timeline line */}
                      {i < activities.length - 1 && (
                        <div className="absolute left-[22px] top-10 bottom-0 w-px bg-gray-200 dark:bg-gray-800" style={{ height: `calc(100% - ${i * 60}px)` }} />
                      )}
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${typeColor[entry.type]}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0 pt-1">
                        <p className="text-sm text-gray-700 dark:text-gray-200 break-words">{entry.message}</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{relativeTime(entry.timestamp)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
