import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';

export type ActivityType = 'contact' | 'invoice' | 'workflow' | 'status';

export interface ActivityEntry {
  id: string;
  contactId?: string;
  type: ActivityType;
  message: string;
  timestamp: string;
}

type ActivityLogContextType = {
  logs: ActivityEntry[];
  logActivity: (type: ActivityType, message: string, contactId?: string) => void;
  getContactActivity: (contactId: string) => ActivityEntry[];
  clearLogs: () => void;
};

const STORAGE_KEY = 'activityLogs';
const ActivityLogContext = createContext<ActivityLogContextType | undefined>(undefined);

let activityIdCounter = 0;

function loadFromStorage(): ActivityEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
    return [];
  } catch {
    return [];
  }
}

export function ActivityLogProvider({ children }: { children: ReactNode }) {
  const [logs, setLogs] = useState<ActivityEntry[]>([]);

  useEffect(() => {
    setLogs(loadFromStorage());
  }, []);

  const persist = useCallback((entries: ActivityEntry[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    } catch {
      // ignore storage errors
    }
  }, []);

  const logActivity = useCallback(
    (type: ActivityType, message: string, contactId?: string) => {
      const entry: ActivityEntry = {
        id: `activity-${++activityIdCounter}-${Date.now()}`,
        type,
        message,
        timestamp: new Date().toISOString(),
        ...(contactId ? { contactId } : {}),
      };
      setLogs((prev) => {
        const next = [entry, ...prev];
        persist(next);
        return next;
      });
    },
    [persist]
  );

  const getContactActivity = useCallback(
    (contactId: string) => logs.filter((l) => l.contactId === contactId).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
    [logs]
  );

  const clearLogs = useCallback(() => {
    setLogs([]);
    persist([]);
  }, [persist]);

  return (
    <ActivityLogContext.Provider value={{ logs, logActivity, getContactActivity, clearLogs }}>
      {children}
    </ActivityLogContext.Provider>
  );
}

export function useActivityLog() {
  const ctx = useContext(ActivityLogContext);
  if (!ctx) throw new Error('useActivityLog must be used within ActivityLogProvider');
  return ctx;
}
