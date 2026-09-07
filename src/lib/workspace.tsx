import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';
import { supabase, type Workspace, type ThemeMode } from './supabase';
import { useAuth } from './auth';
import { useTheme as useUserTheme } from './userPreferences';
import {
  listMyWorkspaces,
  ensureAtLeastOneWorkspace,
  createWorkspace as svcCreateWorkspace,
  updateBusinessName as svcUpdateBusinessName,
  updateBusinessTagline as svcUpdateBusinessTagline,
  updateTheme as svcUpdateTheme,
  updateWeeklySalesTarget as svcUpdateWeeklySalesTarget,
  softDeleteWorkspace as svcSoftDeleteWorkspace,
  restoreWorkspace as svcRestoreWorkspace,
  listMyDeletedWorkspaces as svcListDeletedWorkspaces,
} from '../services/workspaceService';
import {
  setActiveWorkspaceId as writeActive,
  tryGetActiveWorkspaceId,
} from './activeWorkspace';

type WorkspaceContextType = {
  workspaces: Workspace[];
  activeWorkspace: Workspace | null;
  activeWorkspaceId: string | null;
  loading: boolean;
  error: string | null;
  // active-workspace convenience fields
  businessName: string;
  businessTagline: string;
  theme: ThemeMode;
  weeklySalesTarget: number;
  // actions
  switchWorkspace: (id: string) => void;
  createWorkspace: (name: string) => Promise<Workspace>;
  refreshWorkspaces: () => Promise<void>;
  setBusinessName: (name: string) => Promise<void>;
  setBusinessTagline: (tagline: string) => Promise<void>;
  setTheme: (theme: ThemeMode) => Promise<void>;
  setWeeklySalesTarget: (target: number) => Promise<void>;
  toggleTheme: () => Promise<void>;
  deletedWorkspaces: Workspace[];
  softDeleteWorkspace: (id: string) => Promise<void>;
  restoreWorkspace: (id: string) => Promise<void>;
  refreshDeletedWorkspaces: () => Promise<void>;
};

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const { theme: currentTheme, setTheme: setUserTheme, toggleTheme: userToggleTheme } = useUserTheme();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeId, setActiveIdState] = useState<string | null>(tryGetActiveWorkspaceId());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletedWorkspaces, setDeletedWorkspaces] = useState<Workspace[]>([]);

  const refreshWorkspaces = useCallback(async () => {
    const list = await listMyWorkspaces();
    setWorkspaces(list);
    return list;
  }, []);

  const refreshDeletedWorkspaces = useCallback(async () => {
    try {
      const list = await svcListDeletedWorkspaces();
      setDeletedWorkspaces(list);
    } catch {
      setDeletedWorkspaces([]);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    async function init() {
      if (!session) {
        if (mounted) {
          setWorkspaces([]);
          setActiveIdState(null);
          writeActive(null);
          setLoading(false);
        }
        return;
      }
      try {
        setLoading(true);
        let list = await listMyWorkspaces();
        if (list.length === 0) {
          list = await ensureAtLeastOneWorkspace();
        }
        if (!mounted) return;
        setWorkspaces(list);
        void refreshDeletedWorkspaces();
        const stored = tryGetActiveWorkspaceId();
        const chosen = list.find((w) => w.id === stored) ?? list[0];
        if (chosen) {
          setActiveIdState(chosen.id);
          writeActive(chosen.id);
        } else {
          setActiveIdState(null);
          writeActive(null);
        }
        setError(null);
      } catch (err) {
        if (mounted) setError(err instanceof Error ? err.message : 'Failed to load workspaces');
      } finally {
        if (mounted) setLoading(false);
      }
    }

    init();
    return () => {
      mounted = false;
    };
  }, [session, refreshDeletedWorkspaces]);

  const activeWorkspace = useMemo(
    () => workspaces.find((w) => w.id === activeId) ?? null,
    [workspaces, activeId]
  );

  // Realtime: refresh workspaces on changes, and re-validate active workspace id
  useEffect(() => {
    if (!session) return;
    const revalidate = () => {
      listMyWorkspaces()
        .then((list) => {
          setWorkspaces(list);
          const cur = tryGetActiveWorkspaceId();
          const stillValid = cur && list.find((w) => w.id === cur);
          if (!stillValid) {
            const next = list[0];
            if (next) {
              writeActive(next.id);
              setActiveIdState(next.id);
            } else {
              writeActive(null);
              setActiveIdState(null);
            }
          }
        })
        .catch(() => {});
    };
    const channel = supabase
      .channel('workspaces_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'workspaces' }, revalidate)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'workspace_members' }, revalidate)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [session]);

  const switchWorkspace = useCallback((id: string) => {
    const target = workspaces.find((w) => w.id === id);
    if (!target) return;
    writeActive(id);
    setActiveIdState(id);
  }, [workspaces]);

  const createWorkspace = useCallback(async (name: string) => {
    const ws = await svcCreateWorkspace(name);
    const list = await listMyWorkspaces();
    setWorkspaces(list);
    writeActive(ws.id);
    setActiveIdState(ws.id);
    return ws;
  }, []);

  const setBusinessName = useCallback(async (name: string) => {
    await svcUpdateBusinessName(name);
    setWorkspaces((prev) => prev.map((w) => (w.id === activeId ? { ...w, name } : w)));
  }, [activeId]);

  const setBusinessTagline = useCallback(async (tagline: string) => {
    await svcUpdateBusinessTagline(tagline);
    setWorkspaces((prev) => prev.map((w) => (w.id === activeId ? { ...w, business_tagline: tagline } : w)));
  }, [activeId]);

  const setTheme = useCallback(async (newTheme: ThemeMode) => {
    await setUserTheme(newTheme);
    setWorkspaces((prev) => prev.map((w) => (w.id === activeId ? { ...w, theme: newTheme } : w)));
    if (activeId) {
      await svcUpdateTheme(newTheme).catch(() => {});
    }
  }, [activeId, setUserTheme]);

  const toggleTheme = useCallback(async () => {
    await userToggleTheme();
  }, [userToggleTheme]);

  const setWeeklySalesTarget = useCallback(async (target: number) => {
    setWorkspaces((prev) => prev.map((w) => (w.id === activeId ? { ...w, weekly_sales_target: target } : w)));
    await svcUpdateWeeklySalesTarget(target);
  }, [activeId]);

  // Soft-deletes a workspace, removes it from the active list, and switches
  // the active workspace to the most recently created owned workspace
  // (excluding the deleted one). Returns the new active workspace id (or null).
  const softDeleteWorkspace = useCallback(async (id: string): Promise<void> => {
    await svcSoftDeleteWorkspace(id);
    let remaining = await listMyWorkspaces();
    if (remaining.length === 0) {
      remaining = await ensureAtLeastOneWorkspace();
    }
    setWorkspaces(remaining);
    const next = remaining[0] ?? null;
    if (next) {
      writeActive(next.id);
      setActiveIdState(next.id);
    } else {
      writeActive(null);
      setActiveIdState(null);
    }
    await refreshDeletedWorkspaces();
  }, [refreshDeletedWorkspaces]);

  // Restores a soft-deleted workspace and adds it back to the active list.
  const restoreWorkspace = useCallback(async (id: string): Promise<void> => {
    await svcRestoreWorkspace(id);
    const list = await listMyWorkspaces();
    setWorkspaces(list);
    await refreshDeletedWorkspaces();
  }, [refreshDeletedWorkspaces]);

  const businessName = activeWorkspace?.name ?? 'My Workspace';
  const businessTagline = activeWorkspace?.business_tagline ?? '';
  const theme: ThemeMode = currentTheme;
  const weeklySalesTarget = Number(activeWorkspace?.weekly_sales_target ?? 20000);

  return (
    <WorkspaceContext.Provider
      value={{
        workspaces,
        activeWorkspace,
        activeWorkspaceId: activeId,
        loading,
        error,
        businessName,
        businessTagline,
        theme,
        weeklySalesTarget,
        switchWorkspace,
        createWorkspace,
        refreshWorkspaces: async () => {
          await refreshWorkspaces();
        },
        setBusinessName,
        setBusinessTagline,
        setTheme,
        setWeeklySalesTarget,
        toggleTheme,
        deletedWorkspaces,
        softDeleteWorkspace,
        restoreWorkspace,
        refreshDeletedWorkspaces,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error('useWorkspace must be used within WorkspaceProvider');
  return ctx;
}

export { useTheme } from './userPreferences';

export function useActiveWorkspaceId() {
  return useContext(WorkspaceContext)?.activeWorkspaceId ?? null;
}
