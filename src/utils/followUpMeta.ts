export type ContactFollowUp = {
  contactId: string;
  dueDate: string; // ISO string or YYYY-MM-DD
  note: string;
  completed: boolean;
  createdAt: string;
  updatedAt?: string;
};

export function getContactFollowUp(contactId: string): ContactFollowUp | null {
  try {
    const raw = localStorage.getItem(`contact_followup_${contactId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && parsed.dueDate) {
        return parsed as ContactFollowUp;
      }
    }
  } catch (e) {
    console.error('Failed to parse contact follow-up', e);
  }
  return null;
}

export function saveContactFollowUp(
  contactId: string,
  followUp: { dueDate: string | null; note?: string; completed?: boolean }
): void {
  try {
    if (!followUp.dueDate) {
      localStorage.removeItem(`contact_followup_${contactId}`);
      return;
    }
    const existing = getContactFollowUp(contactId);
    const updated: ContactFollowUp = {
      contactId,
      dueDate: followUp.dueDate,
      note: followUp.note ?? existing?.note ?? '',
      completed: followUp.completed ?? existing?.completed ?? false,
      createdAt: existing?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(`contact_followup_${contactId}`, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to save contact follow-up', e);
  }
}

export function deleteContactFollowUp(contactId: string): void {
  try {
    localStorage.removeItem(`contact_followup_${contactId}`);
  } catch (e) {
    console.error('Failed to delete contact follow-up', e);
  }
}

export function getAllContactFollowUps(): ContactFollowUp[] {
  const result: ContactFollowUp[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('contact_followup_')) {
        const raw = localStorage.getItem(key);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && parsed.dueDate) {
            result.push(parsed);
          }
        }
      }
    }
  } catch (e) {
    console.error('Failed to get all contact follow-ups', e);
  }
  return result;
}

export type FollowUpStatusInfo = {
  status: 'overdue' | 'today' | 'tomorrow' | 'upcoming' | 'completed' | 'none';
  label: string;
  badgeClass: string;
  daysDiff: number;
};

export function getFollowUpStatusInfo(dueDateStr: string | null, completed = false): FollowUpStatusInfo {
  if (!dueDateStr) {
    return {
      status: 'none',
      label: 'No follow-up',
      badgeClass: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
      daysDiff: 999,
    };
  }

  if (completed) {
    return {
      status: 'completed',
      label: 'Completed',
      badgeClass: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400',
      daysDiff: 0,
    };
  }

  const due = new Date(dueDateStr);
  const now = new Date();

  // Reset time portions for pure date comparison
  const dueZero = new Date(due.getFullYear(), due.getMonth(), due.getDate()).getTime();
  const nowZero = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

  const diffMs = dueZero - nowZero;
  const daysDiff = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (daysDiff < 0) {
    const daysOver = Math.abs(daysDiff);
    return {
      status: 'overdue',
      label: daysOver === 1 ? 'Overdue (1 day)' : `Overdue (${daysOver} days)`,
      badgeClass: 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400 font-semibold border border-rose-300 dark:border-rose-800',
      daysDiff,
    };
  }

  if (daysDiff === 0) {
    return {
      status: 'today',
      label: 'Due Today',
      badgeClass: 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-400 font-semibold border border-amber-300 dark:border-amber-800',
      daysDiff: 0,
    };
  }

  if (daysDiff === 1) {
    return {
      status: 'tomorrow',
      label: 'Due Tomorrow',
      badgeClass: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400',
      daysDiff: 1,
    };
  }

  return {
    status: 'upcoming',
    label: `Due in ${daysDiff} days`,
    badgeClass: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300',
    daysDiff,
  };
}

/**
 * Helper to compute preset dates
 */
export function getPresetDate(daysFromNow: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  // Default to 09:00 AM
  d.setHours(9, 0, 0, 0);
  const pad = (n: number) => (n < 10 ? '0' + n : '' + n);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T09:00`;
}
