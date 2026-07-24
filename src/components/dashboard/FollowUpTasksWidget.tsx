import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Card, Button } from '../ui';
import { Calendar, CheckCircle2, Bell, CalendarDays } from 'lucide-react';
import { getAllContactFollowUps, getFollowUpStatusInfo, saveContactFollowUp } from '../../utils/followUpMeta';
import { getWorkflowCards, getContacts } from '../../services/workflowService';
import { downloadBatchICSFile } from '../../utils/ics';
import { FollowUpSchedulerModal } from '../followup/FollowUpSchedulerModal';
import { useToast } from '../../contexts/ToastContext';
import type { Contact, WorkflowCard } from '../../lib/supabase';

type TaskItem = {
  id: string;
  source: 'contact' | 'workflow';
  contactId?: string;
  workflowCardId?: string;
  title: string;
  subtitle?: string;
  dueDate: string;
  note?: string;
  completed: boolean;
};

export function FollowUpTasksWidget() {
  const { addToast } = useToast();
  const [items, setItems] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'overdue' | 'today' | 'upcoming'>('all');

  // Scheduler modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);

  const loadTasks = useCallback(async () => {
    setLoading(true);
    try {
      const [contactsList, workflowCardsList] = await Promise.all([
        getContacts().catch(() => [] as Contact[]),
        getWorkflowCards().catch(() => [] as WorkflowCard[]),
      ]);

      const cMap = new Map<string, Contact>();
      contactsList.forEach((c) => cMap.set(c.id, c));

      const aggregated: TaskItem[] = [];

      // 1. Contact follow-ups
      const contactFollowUps = getAllContactFollowUps();
      contactFollowUps.forEach((fu) => {
        if (!fu.dueDate || fu.completed) return;
        const contact = cMap.get(fu.contactId);
        aggregated.push({
          id: `contact_${fu.contactId}`,
          source: 'contact',
          contactId: fu.contactId,
          title: contact ? contact.name : 'Client Follow-up',
          subtitle: contact?.company || contact?.email || 'Contact',
          dueDate: fu.dueDate,
          note: fu.note,
          completed: fu.completed,
        });
      });

      // 2. Workflow card due dates
      workflowCardsList.forEach((card) => {
        if (!card.due_date) return;
        const contact = card.contact_id ? cMap.get(card.contact_id) : null;
        aggregated.push({
          id: `workflow_${card.id}`,
          source: 'workflow',
          workflowCardId: card.id,
          contactId: card.contact_id || undefined,
          title: card.title || (contact ? contact.name : 'Deal / Task'),
          subtitle: card.assignee_name ? `Assigned to ${card.assignee_name}` : contact?.name || 'Workflow Task',
          dueDate: card.due_date,
          note: card.status_note || card.description || '',
          completed: false,
        });
      });

      // Sort by due date ascending
      aggregated.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
      setItems(aggregated);
    } catch (e) {
      console.error('Failed to load follow-up tasks', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const info = getFollowUpStatusInfo(item.dueDate, item.completed);
      if (filter === 'overdue') return info.status === 'overdue';
      if (filter === 'today') return info.status === 'today';
      if (filter === 'upcoming') return info.status === 'upcoming' || info.status === 'tomorrow';
      return true;
    });
  }, [items, filter]);

  const counts = useMemo(() => {
    let overdue = 0;
    let today = 0;
    let upcoming = 0;

    items.forEach((item) => {
      const info = getFollowUpStatusInfo(item.dueDate, item.completed);
      if (info.status === 'overdue') overdue++;
      else if (info.status === 'today') today++;
      else if (info.status === 'upcoming' || info.status === 'tomorrow') upcoming++;
    });

    return { total: items.length, overdue, today, upcoming };
  }, [items]);

  const handleToggleComplete = (item: TaskItem) => {
    if (item.source === 'contact' && item.contactId) {
      saveContactFollowUp(item.contactId, {
        dueDate: item.dueDate,
        note: item.note,
        completed: true,
      });
      addToast('success', 'Follow-up Completed', `Marked follow-up for ${item.title} as completed.`);
      loadTasks();
    }
  };

  const handleSyncAllCalendar = () => {
    if (!items.length) {
      addToast('info', 'No Active Follow-ups', 'There are no active follow-ups to export.');
      return;
    }

    const events = items.map((item) => ({
      title: `CRM Follow-up: ${item.title}`,
      description: item.note ? `Note: ${item.note}` : `Follow-up reminder for ${item.title}`,
      startDate: item.dueDate,
      location: item.subtitle || '',
    }));

    downloadBatchICSFile(events, `crm_follow_ups_${new Date().toISOString().slice(0, 10)}.ics`);
    addToast('success', 'Calendar Exported', `Exported ${items.length} follow-up reminders to .ics file.`);
  };

  const openRescheduleModal = (item: TaskItem) => {
    setSelectedTask(item);
    setModalOpen(true);
  };

  return (
    <>
      <Card className="p-5 border border-gray-200/80 dark:border-gray-800 shadow-xs hover:shadow-md transition-shadow">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                Task & Follow-up Reminders
                {counts.overdue > 0 && (
                  <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400">
                    {counts.overdue} Overdue
                  </span>
                )}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Scheduled client touchpoints & deal deadlines
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSyncAllCalendar}
              className="text-xs gap-1.5 border-gray-200 dark:border-gray-700"
              title="Download calendar file with all follow-ups"
            >
              <CalendarDays className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              Sync Calendar (.ics)
            </Button>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 my-3.5 overflow-x-auto pb-1 text-xs">
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              filter === 'all'
                ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            All ({counts.total})
          </button>
          <button
            type="button"
            onClick={() => setFilter('overdue')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              filter === 'overdue'
                ? 'bg-rose-600 text-white'
                : 'text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30'
            }`}
          >
            Overdue ({counts.overdue})
          </button>
          <button
            type="button"
            onClick={() => setFilter('today')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              filter === 'today'
                ? 'bg-amber-600 text-white'
                : 'text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30'
            }`}
          >
            Due Today ({counts.today})
          </button>
          <button
            type="button"
            onClick={() => setFilter('upcoming')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              filter === 'upcoming'
                ? 'bg-indigo-600 text-white'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            Upcoming ({counts.upcoming})
          </button>
        </div>

        {/* List Content */}
        {loading ? (
          <div className="py-8 text-center text-xs text-gray-500 animate-pulse">
            Loading follow-ups & due dates...
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="py-8 text-center bg-gray-50/50 dark:bg-gray-800/30 rounded-xl border border-dashed border-gray-200 dark:border-gray-800">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
            <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
              {filter === 'all'
                ? 'No pending follow-ups'
                : filter === 'overdue'
                ? 'No overdue follow-ups! Great job 🎉'
                : 'No follow-ups for this filter.'}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-xs mx-auto">
              Set follow-up reminders on contacts or deal cards to ensure seamless client relationship management.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
            {filteredItems.map((item) => {
              const statusInfo = getFollowUpStatusInfo(item.dueDate, item.completed);
              return (
                <div
                  key={item.id}
                  className="p-3.5 rounded-xl border border-gray-200/60 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/60 hover:bg-gray-100/80 dark:hover:bg-gray-800 transition-colors flex items-start justify-between gap-3 group"
                >
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2 py-0.5 text-[11px] font-medium rounded-md ${statusInfo.badgeClass}`}>
                        {statusInfo.label}
                      </span>

                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(item.dueDate).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                      </span>
                    </div>

                    <div className="font-semibold text-sm text-gray-900 dark:text-white truncate flex items-center gap-1.5">
                      {item.contactId ? (
                        <Link
                          to={`/contacts/${item.contactId}`}
                          className="hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline"
                        >
                          {item.title}
                        </Link>
                      ) : (
                        <span>{item.title}</span>
                      )}
                    </div>

                    {item.note && (
                      <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-1 italic bg-white/80 dark:bg-gray-900/60 px-2.5 py-1 rounded-md border border-gray-200/50 dark:border-gray-700/50 mt-1">
                        "{item.note}"
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 pt-1 opacity-90 group-hover:opacity-100">
                    <button
                      type="button"
                      onClick={() => handleToggleComplete(item)}
                      className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded-lg transition-colors"
                      title="Mark as Completed"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => openRescheduleModal(item)}
                      className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 rounded-lg transition-colors"
                      title="Edit / Reschedule / Calendar"
                    >
                      <Calendar className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Scheduler Modal */}
      {selectedTask && (
        <FollowUpSchedulerModal
          isOpen={modalOpen}
          onClose={() => {
            setModalOpen(false);
            setSelectedTask(null);
          }}
          contactId={selectedTask.contactId}
          contactName={selectedTask.title}
          initialDueDate={selectedTask.dueDate}
          initialNote={selectedTask.note}
          initialCompleted={selectedTask.completed}
          onSaved={() => {
            loadTasks();
          }}
        />
      )}
    </>
  );
}
