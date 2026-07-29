import type { Session } from '@supabase/supabase-js';
import { supabase, type Workspace, type ThemeMode } from '../lib/supabase';
import { setActiveWorkspaceId, tryGetActiveWorkspaceId, getActiveWorkspaceId } from '../lib/activeWorkspace';
import { sanitizeText } from '../lib/validation';

async function requireFreshSession(): Promise<Session> {
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData?.session) {
    throw new Error('No active session — please sign in again.');
  }

  const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession(sessionData.session);
  if (refreshError) {
    console.warn('[workspaceService] session refresh failed, using current session', refreshError);
  }

  const session = refreshed?.session ?? sessionData.session;
  if (!session?.access_token) {
    throw new Error('No active session token — please sign in again.');
  }
  return session;
}

async function getUserId(): Promise<string> {
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData?.session) {
    throw new Error('No active session — please sign in again.');
  }
  const { data } = await supabase.auth.getUser();
  if (!data?.user) throw new Error('Not authenticated');
  return data.user.id;
}

/** Returns every workspace the current user is an active member of. */
export async function listMyWorkspaces(): Promise<Workspace[]> {
  const uid = await getUserId();
  // fetch memberships then workspaces
  const { data: memberships, error: mErr } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', uid)
    .eq('status', 'active');
  if (mErr) throw mErr;
  const ids = (memberships ?? []).map((m) => m.workspace_id as string);
  if (ids.length === 0) return [];
  const { data, error } = await supabase
    .from('workspaces')
    .select('*')
    .in('id', ids)
    .eq('is_deleted', false)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as Workspace[];
}

// Module-level promise cache to handle concurrent calls to ensureAtLeastOneWorkspace
let defaultWorkspacePromise: Promise<Workspace[]> | null = null;

/** Ensures the user has at least one workspace; if not, creates a default one. */
export async function ensureAtLeastOneWorkspace(): Promise<Workspace[]> {
  if (defaultWorkspacePromise) {
    return defaultWorkspacePromise;
  }

  defaultWorkspacePromise = (async () => {
    try {
      const list = await listMyWorkspaces();
      if (list.length > 0) return list;
      
      // Try to seed one from signup metadata
      const { data: userData } = await supabase.auth.getUser();
      const signupName = (userData.user?.user_metadata?.business_name as string | undefined)?.trim();
      
      await createWorkspace(signupName || 'My Workspace');
      return await listMyWorkspaces();
    } finally {
      // Clear the cache when finished so future calls fetch fresh data
      defaultWorkspacePromise = null;
    }
  })();

  return defaultWorkspacePromise;
}

/** Creates a workspace, adds the current user as Owner, and returns it. */
export async function createWorkspace(name: string): Promise<Workspace> {
  const clean = sanitizeText(name) || 'My Workspace';
  await requireFreshSession();

  // 1. Try to invoke the RPC function first
  try {
    const { data: ws, error } = await supabase.rpc('create_user_workspace', { p_name: clean });
    if (!error && ws) {
      return ws as Workspace;
    }
    console.warn('[createWorkspace] RPC failed, trying client-side fallback...', error);
  } catch (rpcErr) {
    console.warn('[createWorkspace] RPC exception, trying client-side fallback...', rpcErr);
  }

  // 2. Client-side fallback: insert workspace and then owner membership directly
  const uid = await getUserId();
  const baseSlug = clean.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-+|-+$)/g, '') || 'workspace';
  const slug = `${baseSlug.substring(0, 48)}-${Math.random().toString(36).substring(2, 10)}`;

  const { data: workspaceData, error: wsErr } = await supabase
    .from('workspaces')
    .insert({
      name: clean,
      slug: slug,
      owner_id: uid
    })
    .select('*')
    .single();

  if (wsErr) {
    console.error('[createWorkspace] client-side workspace insert failed', wsErr);
    throw new Error(wsErr.message || 'Failed to create workspace');
  }

  if (!workspaceData) {
    throw new Error('Workspace was not created. Please try again.');
  }

  // Insert the corresponding owner membership row
  try {
    const { error: memErr } = await supabase
      .from('workspace_members')
      .insert({
        workspace_id: workspaceData.id,
        user_id: uid,
        role: 'owner',
        status: 'active'
      });
    if (memErr && !memErr.message.includes('duplicate key')) {
      console.warn('[createWorkspace] owner membership insert notice:', memErr);
    }
  } catch (memEx) {
    console.warn('[createWorkspace] owner membership insert caught exception:', memEx);
  }

  return workspaceData as Workspace;
}

type WorkspacePatch = Partial<Pick<Workspace, 'name' | 'business_tagline' | 'theme' | 'weekly_sales_target'>>;

async function updateActiveWorkspace(patch: WorkspacePatch): Promise<void> {
  const wsId = getActiveWorkspaceId();
  const { data, error } = await supabase
    .from('workspaces')
    .update(patch)
    .eq('id', wsId)
    .select('id');
  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error("You don't have permission to edit this workspace");
  }
}

export async function updateBusinessName(name: string): Promise<void> {
  const cleanName = sanitizeText(name);
  if (!cleanName) throw new Error('Workspace name cannot be empty');
  await updateActiveWorkspace({ name: cleanName });
}

export async function updateBusinessTagline(tagline: string): Promise<void> {
  await updateActiveWorkspace({ business_tagline: sanitizeText(tagline) });
}

export async function updateTheme(theme: ThemeMode): Promise<void> {
  await updateActiveWorkspace({ theme });
}

export async function updateWeeklySalesTarget(target: number): Promise<void> {
  const validTarget = Math.max(0, Number(target) || 0);
  await updateActiveWorkspace({ weekly_sales_target: validTarget });
}

export async function deleteWorkspace(id: string): Promise<void> {
  const { error } = await supabase.from('workspaces').delete().eq('id', id);
  if (error) throw error;
}

/** Soft-deletes a workspace: sets is_deleted=true and deleted_at=now(). Owner-only (enforced by RLS). */
export async function softDeleteWorkspace(id: string): Promise<void> {
  const { data, error } = await supabase
    .from('workspaces')
    .update({ is_deleted: true, deleted_at: new Date().toISOString() })
    .eq('id', id)
    .select('id');
  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error("You don't have permission to delete this workspace");
  }
}

/** Restores a soft-deleted workspace: clears is_deleted and deleted_at. Owner-only (enforced by RLS). */
export async function restoreWorkspace(id: string): Promise<void> {
  const { data, error } = await supabase
    .from('workspaces')
    .update({ is_deleted: false, deleted_at: null })
    .eq('id', id)
    .select('id');
  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error("You don't have permission to restore this workspace");
  }
}

/** Lists the current user's soft-deleted workspaces still within the 7-day grace window. */
export async function listMyDeletedWorkspaces(): Promise<Workspace[]> {
  const uid = await getUserId();
  const { data, error } = await supabase
    .from('workspaces')
    .select('*')
    .eq('owner_id', uid)
    .eq('is_deleted', true)
    .gt('deleted_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
    .order('deleted_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Workspace[];
}

/** Counts active members of a workspace. */
export async function countActiveMembers(workspaceId: string): Promise<number> {
  const { count, error } = await supabase
    .from('workspace_members')
    .select('id', { count: 'exact', head: true })
    .eq('workspace_id', workspaceId)
    .eq('status', 'active');
  if (error) throw error;
  return count ?? 0;
}

/** Lists workspaces owned by the current user that are not soft-deleted. */
export async function listOwnedActiveWorkspaces(): Promise<Workspace[]> {
  const uid = await getUserId();
  const { data, error } = await supabase
    .from('workspaces')
    .select('*')
    .eq('owner_id', uid)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Workspace[];
}

export { setActiveWorkspaceId, tryGetActiveWorkspaceId, getActiveWorkspaceId };
