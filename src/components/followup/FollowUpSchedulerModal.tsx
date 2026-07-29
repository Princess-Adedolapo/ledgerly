import React, { useState, useEffect } from 'react';
import { Modal, Button } from '../ui';
import { Calendar, CheckCircle2, Download, ExternalLink, Trash2, Bell } from 'lucide-react';
import { getPresetDate, getFollowUpStatusInfo, saveContactFollowUp, deleteContactFollowUp, getContactFollowUp } from '../../utils/followUpMeta';
import { updateWorkflowCard } from '../../services/workflowService';
import { downloadICSFile, getGoogleCalendarUrl, getOutlookCalendarUrl } from '../../utils/ics';
import { useToast } from '../../contexts/ToastContext';
import { useActivityLog } from '../../contexts/ActivityLogContext';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  contactId?: string;
  contactName?: string;
  contactEmail?: string;
  workflowCardId?: string;
  title?: string;
  initialDueDate?: string | null;
  initialNote?: string | null;
  initialCompleted?: boolean;
  onSaved?: (updated: { dueDate: string | null; note: string; completed: boolean }) => void;
};

export function FollowUpSchedulerModal({
  isOpen,
  onClose,
  contactId,
  contactName,
  contactEmail,
  workflowCardId,
  title,
  initialDueDate,
  initialNote,
  initialCompleted = false,
  onSaved,
}: Props) {
  const { addToast } = useToast();
  const { logActivity } = useActivityLog();

  const [dueDate, setDueDate] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [completed, setCompleted] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      if (contactId) {
        const stored = getContactFollowUp(contactId);
        if (stored) {
          setDueDate(stored.dueDate ? stored.dueDate.slice(0, 16) : '');
          setNote(stored.note || '');
          setCompleted(stored.completed || false);
          return;
        }
      }
      setDueDate(initialDueDate ? initialDueDate.slice(0, 16) : getPresetDate(3));
      setNote(initialNote || '');
      setCompleted(initialCompleted);
    }
  }, [isOpen, contactId, initialDueDate, initialNote, initialCompleted]);

  if (!isOpen) return null;

  const subjectName = contactName || title || 'Client';
  const statusInfo = getFollowUpStatusInfo(dueDate, completed);

  const applyPreset = (days: number) => {
    setDueDate(getPresetDate(days));
    setCompleted(false);
  };

  const handleSave = async () => {
    if (!dueDate) {
      addToast('error', 'Date required', 'Please select a date and time for the follow-up reminder.');
      return;
    }

    const payload = {
      dueDate,
      note: note.trim(),
      completed,
    };

    if (contactId) {
      saveContactFollowUp(contactId, payload);
    }

    if (workflowCardId) {
      if (completed) {
        localStorage.setItem(`completed_workflow_task_${workflowCardId}`, 'true');
        try {
          await updateWorkflowCard(workflowCardId, { due_date: null });
        } catch (e) {
          console.warn('Failed to update workflow card:', e);
        }
      } else {
        localStorage.removeItem(`completed_workflow_task_${workflowCardId}`);
        try {
          await updateWorkflowCard(workflowCardId, {
            due_date: new Date(dueDate).toISOString(),
            status_note: note.trim() || null,
          });
        } catch (e) {
          console.warn('Failed to update workflow card:', e);
        }
      }
      window.dispatchEvent(new CustomEvent('workflow-card-updated'));
    }

    logActivity('Added Follow-up Reminder', `Set follow-up for ${subjectName} on ${new Date(dueDate).toLocaleString()}`, 'contact');
    addToast('success', 'Follow-up Saved', `Follow-up reminder set for ${subjectName}`);

    if (onSaved) {
      onSaved(payload);
    }
    onClose();
  };

  const handleRemove = async () => {
    if (contactId) {
      deleteContactFollowUp(contactId);
    }

    if (workflowCardId) {
      localStorage.setItem(`completed_workflow_task_${workflowCardId}`, 'true');
      try {
        await updateWorkflowCard(workflowCardId, { due_date: null });
      } catch (e) {
        console.warn('Failed to clear workflow card due_date:', e);
      }
      window.dispatchEvent(new CustomEvent('workflow-card-updated'));
    }

    addToast('info', 'Follow-up Cleared', `Follow-up reminder removed for ${subjectName}`);
    if (onSaved) {
      onSaved({ dueDate: null, note: '', completed: false });
    }
    onClose();
  };

  const handleDownloadICS = () => {
    if (!dueDate) return;
    downloadICSFile({
      title: `Follow up with ${subjectName}`,
      description: note ? `Follow-up note: ${note}` : `Scheduled CRM follow-up with ${subjectName} (${contactEmail || 'No email'})`,
      startDate: new Date(dueDate),
      location: contactEmail || '',
    });
    addToast('success', 'Calendar File Downloaded', '.ics file saved. Open it to add to Apple Calendar, Outlook, or Thunderbird.');
  };

  const handleGoogleCalendar = () => {
    if (!dueDate) return;
    const url = getGoogleCalendarUrl({
      title: `Follow up with ${subjectName}`,
      description: note ? `Follow-up note: ${note}` : `Scheduled CRM follow-up with ${subjectName}`,
      startDate: new Date(dueDate),
      location: contactEmail || '',
    });
    window.open(url, '_blank');
  };

  const handleOutlookCalendar = () => {
    if (!dueDate) return;
    const url = getOutlookCalendarUrl({
      title: `Follow up with ${subjectName}`,
      description: note ? `Follow-up note: ${note}` : `Scheduled CRM follow-up with ${subjectName}`,
      startDate: new Date(dueDate),
      location: contactEmail || '',
    });
    window.open(url, '_blank');
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Schedule Follow-up: ${subjectName}`}>
      <div className="space-y-5 py-1">
        {/* Header Status & Preset Shortcuts */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
            Quick Preset Shortcuts
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button
              type="button"
              onClick={() => applyPreset(1)}
              className="px-3 py-2 text-xs font-medium rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-200 dark:hover:border-indigo-800 transition-colors text-center"
            >
              Tomorrow (+1d)
            </button>
            <button
              type="button"
              onClick={() => applyPreset(3)}
              className="px-3 py-2 text-xs font-medium rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-200 dark:hover:border-indigo-800 transition-colors text-center"
            >
              In 3 Days
            </button>
            <button
              type="button"
              onClick={() => applyPreset(7)}
              className="px-3 py-2 text-xs font-medium rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-200 dark:hover:border-indigo-800 transition-colors text-center"
            >
              In 1 Week
            </button>
            <button
              type="button"
              onClick={() => applyPreset(14)}
              className="px-3 py-2 text-xs font-medium rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-200 dark:hover:border-indigo-800 transition-colors text-center"
            >
              In 2 Weeks
            </button>
          </div>
        </div>

        {/* Date / Time Input */}
        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Follow-up Date & Time
          </label>
          <div className="relative">
            <input
              type="datetime-local"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-3.5 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 text-sm"
            />
          </div>
          {dueDate && (
            <div className="mt-1.5 flex items-center justify-between text-xs">
              <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${statusInfo.badgeClass}`}>
                {statusInfo.label}
              </span>
              <span className="text-gray-500 dark:text-gray-400">
                {new Date(dueDate).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
              </span>
            </div>
          )}
        </div>

        {/* Note / Follow-up Goal */}
        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Follow-up Goal / Reminder Note
          </label>
          <textarea
            rows={3}
            placeholder='e.g., "Call Ruth to discuss revised proposal and check decision timeline"'
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full px-3.5 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 text-sm"
          />
        </div>

        {/* Status Checkbox */}
        <div className="flex items-center gap-2 pt-1">
          <input
            type="checkbox"
            id="followup-completed"
            checked={completed}
            onChange={(e) => setCompleted(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
          />
          <label htmlFor="followup-completed" className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1.5 cursor-pointer">
            <CheckCircle2 className={`w-4 h-4 ${completed ? 'text-emerald-500' : 'text-gray-400'}`} />
            Mark as Completed
          </label>
        </div>

        {/* Calendar Sync Options */}
        {dueDate && (
          <div className="p-3 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/50 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-indigo-900 dark:text-indigo-300 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                Sync with Calendar
              </span>
              <span className="text-[11px] text-indigo-600/80 dark:text-indigo-400/80">Instant export & sync</span>
            </div>
            <div className="grid grid-cols-3 gap-2 pt-1">
              <button
                type="button"
                onClick={handleDownloadICS}
                className="flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/80 transition-colors shadow-xs"
              >
                <Download className="w-3 h-3 text-indigo-600" />
                .ICS File
              </button>
              <button
                type="button"
                onClick={handleGoogleCalendar}
                className="flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/80 transition-colors shadow-xs"
              >
                <ExternalLink className="w-3 h-3 text-blue-600" />
                Google
              </button>
              <button
                type="button"
                onClick={handleOutlookCalendar}
                className="flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/80 transition-colors shadow-xs"
              >
                <ExternalLink className="w-3 h-3 text-sky-600" />
                Outlook
              </button>
            </div>
          </div>
        )}

        {/* Modal Action Buttons */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-800">
          <div>
            {(initialDueDate || contactId) && (
              <Button type="button" variant="ghost" size="sm" onClick={handleRemove} className="text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30">
                <Trash2 className="w-4 h-4 mr-1" />
                Remove
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="button" onClick={handleSave} className="bg-indigo-600 hover:bg-indigo-700 text-white">
              <Bell className="w-4 h-4 mr-1.5" />
              Save Follow-up
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
