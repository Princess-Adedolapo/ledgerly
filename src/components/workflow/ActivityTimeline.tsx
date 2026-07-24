import { useEffect, useState, useCallback } from 'react';
import {
  Clock,
  MessageSquare,
  FileText,
  User,
  Flag,
  Calendar,
  StickyNote,
  ArrowRightLeft,
  Send,
  Loader2,
} from 'lucide-react';
import {
  getCardActivities,
  logCardActivity,
  type CardActivity,
  type ActivityType,
} from '../../services/activityService';
import { Button } from '../ui';

interface ActivityTimelineProps {
  cardId?: string;
  contactId?: string | null;
  onActivityAdded?: () => void;
}

const activityConfig: Record<
  ActivityType,
  { icon: typeof Clock; color: string; badge: string; label: string }
> = {
  stage_change: {
    icon: ArrowRightLeft,
    color: 'text-violet-500 bg-violet-500/10 border-violet-500/20',
    badge: 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300',
    label: 'Stage Change',
  },
  invoice_event: {
    icon: FileText,
    color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
    badge: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300',
    label: 'Invoice Event',
  },
  message_sent: {
    icon: MessageSquare,
    color: 'text-sky-500 bg-sky-500/10 border-sky-500/20',
    badge: 'bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300',
    label: 'Message Sent',
  },
  assignee_change: {
    icon: User,
    color: 'text-indigo-500 bg-indigo-500/10 border-indigo-500/20',
    badge: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300',
    label: 'Assignee Updated',
  },
  priority_change: {
    icon: Flag,
    color: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
    badge: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
    label: 'Priority Updated',
  },
  due_date_change: {
    icon: Calendar,
    color: 'text-rose-500 bg-rose-500/10 border-rose-500/20',
    badge: 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300',
    label: 'Due Date Updated',
  },
  note: {
    icon: StickyNote,
    color: 'text-gray-500 bg-gray-500/10 border-gray-500/20',
    badge: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300',
    label: 'Manual Note',
  },
};

export function ActivityTimeline({ cardId, contactId, onActivityAdded }: ActivityTimelineProps) {
  const [activities, setActivities] = useState<CardActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [noteDraft, setNoteDraft] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadActivities = useCallback(async () => {
    if (!cardId && !contactId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const data = await getCardActivities({ cardId, contactId });
    setActivities(data);
    setLoading(false);
  }, [cardId, contactId]);

  useEffect(() => {
    loadActivities();
  }, [loadActivities]);

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteDraft.trim()) return;

    setSubmitting(true);
    const text = noteDraft.trim();

    // Optimistic update
    const tempId = `temp-${Date.now()}`;
    const newAct: CardActivity = {
      id: tempId,
      card_id: cardId || null,
      contact_id: contactId || null,
      type: 'note',
      content: text,
      created_at: new Date().toISOString(),
    };

    setActivities((prev) => [newAct, ...prev]);
    setNoteDraft('');

    try {
      await logCardActivity({
        card_id: cardId,
        contact_id: contactId,
        type: 'note',
        content: text,
      });
      onActivityAdded?.();
      await loadActivities();
    } catch (err) {
      console.error('Failed to log note:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const formatTimeAgo = (isoString?: string) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffSec < 60) return 'Just now';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    if (diffSec < 604800) return `${Math.floor(diffSec / 86400)}d ago`;

    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 flex items-center gap-2">
          <Clock className="w-3.5 h-3.5" />
          Unified Activity Timeline
        </h4>
        <span className="text-[11px] text-gray-400 dark:text-gray-500">
          {activities.length} {activities.length === 1 ? 'event' : 'events'}
        </span>
      </div>

      {/* Manual Note Input */}
      <form onSubmit={handleAddNote} className="flex gap-2">
        <input
          type="text"
          value={noteDraft}
          onChange={(e) => setNoteDraft(e.target.value)}
          placeholder="Type a note to log in timeline..."
          className="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg text-xs text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all"
        />
        <Button
          type="submit"
          disabled={submitting || !noteDraft.trim()}
          className="px-3 py-2 text-xs font-semibold shrink-0"
        >
          {submitting ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <span className="flex items-center gap-1">
              <Send className="w-3 h-3" /> Note
            </span>
          )}
        </Button>
      </form>

      {/* Timeline Feed */}
      <div className="relative pl-4 space-y-3 before:absolute before:left-1.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-200 dark:before:bg-gray-800 max-h-72 overflow-y-auto pr-1">
        {loading ? (
          <div className="py-6 text-center text-xs text-gray-400 flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-violet-500" />
            Loading timeline...
          </div>
        ) : activities.length === 0 ? (
          <div className="py-8 text-center text-xs text-gray-400 dark:text-gray-500">
            No activity history yet. Stage changes, notes, and messages will appear here.
          </div>
        ) : (
          activities.map((act) => {
            const conf = activityConfig[act.type] || activityConfig.note;
            const Icon = conf.icon;

            return (
              <div key={act.id} className="relative group flex items-start gap-3">
                {/* Bullet Node */}
                <div
                  className={`absolute -left-[19px] top-0.5 w-6 h-6 rounded-full border flex items-center justify-center bg-white dark:bg-gray-900 transition-all ${conf.color}`}
                >
                  <Icon className="w-3 h-3" />
                </div>

                {/* Content Box */}
                <div className="flex-1 bg-gray-50 dark:bg-gray-800/40 border border-gray-200/80 dark:border-gray-700/60 rounded-xl p-2.5 transition-all hover:border-gray-300 dark:hover:border-gray-600">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${conf.badge}`}
                    >
                      {conf.label}
                    </span>
                    <span className="text-[10px] font-medium text-gray-400 dark:text-gray-500">
                      {formatTimeAgo(act.created_at)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed font-medium">
                    {act.content}
                  </p>
                  {act.actor_name && (
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">
                      By {act.actor_name}
                    </p>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
