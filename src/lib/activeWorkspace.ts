const KEY = 'active_workspace_id';
let cached: string | null = null;
const listeners = new Set<(id: string | null) => void>();

export function setActiveWorkspaceId(id: string | null) {
  cached = id;
  try {
    if (id) localStorage.setItem(KEY, id);
    else localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l(id));
}

export function tryGetActiveWorkspaceId(): string | null {
  if (cached) return cached;
  try {
    const v = typeof window !== 'undefined' ? localStorage.getItem(KEY) : null;
    if (v) {
      cached = v;
      return v;
    }
  } catch {
    /* ignore */
  }
  return null;
}

export function getActiveWorkspaceId(): string {
  const v = tryGetActiveWorkspaceId();
  if (!v) throw new Error('No active workspace selected');
  return v;
}

export function onActiveWorkspaceChange(cb: (id: string | null) => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
