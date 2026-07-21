import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';

export interface NotificationPreferences {
  contactAlerts: boolean;
  invoiceAlerts: boolean;
  workflowAlerts: boolean;
}

type NotificationContextType = {
  preferences: NotificationPreferences;
  updatePreference: (key: keyof NotificationPreferences, value: boolean) => void;
};

const STORAGE_KEY = 'notificationPreferences';
const defaultPreferences: NotificationPreferences = {
  contactAlerts: true,
  invoiceAlerts: true,
  workflowAlerts: true,
};

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

function loadFromStorage(): NotificationPreferences {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultPreferences;
    const parsed = JSON.parse(raw);
    return { ...defaultPreferences, ...parsed };
  } catch {
    return defaultPreferences;
  }
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState<NotificationPreferences>(defaultPreferences);

  useEffect(() => {
    setPreferences(loadFromStorage());
  }, []);

  const updatePreference = useCallback((key: keyof NotificationPreferences, value: boolean) => {
    setPreferences((prev) => {
      const next = { ...prev, [key]: value };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore storage errors
      }
      return next;
    });
  }, []);

  return (
    <NotificationContext.Provider value={{ preferences, updatePreference }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotificationPreferences() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotificationPreferences must be used within NotificationProvider');
  return ctx;
}
