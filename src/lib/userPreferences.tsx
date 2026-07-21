import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import { supabase, type UserPreferences, type CurrencyCode, type CurrencyDisplayMode, type HistoricalCurrencyMode, type ThemeMode } from './supabase';
import { useAuth } from './auth';
import {
  ensureUserPreferences,
  updateUserPreferences as svcUpdate,
  subscribeToUserPreferences,
} from '../services/userPreferencesService';

const DEFAULTS: Omit<UserPreferences, 'id' | 'updated_at'> = {
  display_name: null,
  currency_code: 'USD',
  currency_display_mode: 'symbol',
  historical_currency_mode: 'original',
  theme: 'dark',
};

const THEME_STORAGE_KEY = 'theme';

function readStoredTheme(): ThemeMode {
  try {
    const v = typeof window !== 'undefined' ? localStorage.getItem(THEME_STORAGE_KEY) : null;
    if (v === 'light' || v === 'dark') return v;
  } catch { /* ignore */ }
  return 'dark';
}

function applyThemeToDom(theme: ThemeMode) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (theme === 'dark') root.classList.add('dark');
  else root.classList.remove('dark');
  try { localStorage.setItem(THEME_STORAGE_KEY, theme); } catch { /* ignore */ }
}

type UpdatablePrefs = Partial<Pick<UserPreferences, 'display_name' | 'currency_code' | 'currency_display_mode' | 'historical_currency_mode' | 'theme'>>;

type UserPreferencesContextType = {
  preferences: UserPreferences | null;
  loading: boolean;
  displayName: string | null;
  currencyCode: CurrencyCode;
  currencyDisplayMode: CurrencyDisplayMode;
  historicalCurrencyMode: HistoricalCurrencyMode;
  theme: ThemeMode;
  updatePreferences: (patch: UpdatablePrefs) => Promise<{ error: string | null }>;
  setTheme: (theme: ThemeMode) => Promise<{ error: string | null }>;
  toggleTheme: () => Promise<{ error: string | null }>;
};

const UserPreferencesContext = createContext<UserPreferencesContextType | undefined>(undefined);

export function UserPreferencesProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [localTheme, setLocalTheme] = useState<ThemeMode>(() => readStoredTheme());

  // Apply theme immediately on mount + whenever it changes
  useEffect(() => {
    applyThemeToDom(localTheme);
  }, [localTheme]);

  useEffect(() => {
    let mounted = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    async function init() {
      if (!session) {
        if (mounted) {
          setPreferences(null);
          setLoading(false);
        }
        return;
      }
      try {
        const prefs = await ensureUserPreferences();
        if (!mounted) return;
        setPreferences(prefs);
        setLocalTheme(prefs.theme ?? 'dark');
      } catch {
        if (mounted) setPreferences(null);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    init();

    if (session) {
      channel = subscribeToUserPreferences(() => {
        ensureUserPreferences()
          .then((p) => {
            setPreferences(p);
            setLocalTheme(p.theme ?? 'dark');
          })
          .catch(() => {});
      });
    }

    return () => {
      mounted = false;
      if (channel) supabase.removeChannel(channel);
    };
  }, [session]);

  const updatePreferences = useCallback(
    async (patch: UpdatablePrefs): Promise<{ error: string | null }> => {
      const prev = preferences;
      if (prev) setPreferences({ ...prev, ...patch });
      if (patch.theme) setLocalTheme(patch.theme);

      try {
        const updated = await svcUpdate(patch);
        if (updated) {
          setPreferences(updated);
          setLocalTheme(updated.theme ?? 'dark');
        }
        return { error: null };
      } catch (err) {
        if (prev) setPreferences(prev);
        if (prev?.theme) setLocalTheme(prev.theme);
        return { error: err instanceof Error ? err.message : 'Failed to update preferences' };
      }
    },
    [preferences]
  );

  const setTheme = useCallback(
    async (theme: ThemeMode) => {
      // Apply visually right away, even before the DB call resolves
      setLocalTheme(theme);
      return await updatePreferences({ theme });
    },
    [updatePreferences]
  );

  const toggleTheme = useCallback(async () => {
    return await setTheme(localTheme === 'dark' ? 'light' : 'dark');
  }, [localTheme, setTheme]);

  const value: UserPreferencesContextType = {
    preferences,
    loading,
    displayName: preferences?.display_name ?? null,
    currencyCode: preferences?.currency_code ?? DEFAULTS.currency_code,
    currencyDisplayMode: preferences?.currency_display_mode ?? DEFAULTS.currency_display_mode,
    historicalCurrencyMode: preferences?.historical_currency_mode ?? DEFAULTS.historical_currency_mode,
    theme: localTheme,
    updatePreferences,
    setTheme,
    toggleTheme,
  };

  return (
    <UserPreferencesContext.Provider value={value}>
      {children}
    </UserPreferencesContext.Provider>
  );
}

export function useUserPreferences() {
  const ctx = useContext(UserPreferencesContext);
  if (!ctx) throw new Error('useUserPreferences must be used within UserPreferencesProvider');
  return ctx;
}

export function useTheme() {
  const ctx = useContext(UserPreferencesContext);
  if (!ctx) throw new Error('useTheme must be used within UserPreferencesProvider');
  return { theme: ctx.theme, setTheme: ctx.setTheme, toggleTheme: ctx.toggleTheme };
}
