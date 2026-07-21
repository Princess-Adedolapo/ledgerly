import { supabase, type WorkspaceMember, type WorkspaceRole } from '../lib/supabase';
import { getActiveWorkspaceId } from '../lib/activeWorkspace';

export type MemberWithEmail = WorkspaceMember & { email: string | null };

/** Lists members of the currently active workspace, with resolved emails when known. */
export async function listMembers(): Promise<MemberWithEmail[]> {
  const wsId = getActiveWorkspaceId();
  const { data, error } = await supabase
    .from('workspace_members')
    .select('*')
    .eq('workspace_id', wsId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  const rows = (data ?? []) as WorkspaceMember[];

  // We can't look up other users' auth emails from the client.
  // For the current user we resolve via auth; for others we show a truncated user id or invited_email.
  const { data: me } = await supabase.auth.getUser();
  const myId = me.user?.id;
  const myEmail = me.user?.email ?? null;

  return rows.map((m) => ({
    ...m,
    email:
      m.invited_email ??
      (m.user_id && m.user_id === myId ? myEmail : m.user_id ? `user-${m.user_id.slice(0, 8)}` : null),
  }));
}

function makeToken() {
  return (
    crypto.randomUUID().replace(/-/g, '') + Math.random().toString(36).slice(2, 10)
  );
}

/** Adds a pending invite for an email. Returns the invite token. */
export async function inviteMember(email: string, role: WorkspaceRole = 'member'): Promise<string> {
  const wsId = getActiveWorkspaceId();
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail) throw new Error('Email is required');
  const token = makeToken();
  const { error } = await supabase.from('workspace_members').insert({
    workspace_id: wsId,
    invited_email: cleanEmail,
    role,
    status: 'pending',
    invite_token: token,
  });
  if (error) throw error;
  return token;
}

export async function removeMember(memberId: string): Promise<void> {
  const { error } = await supabase.from('workspace_members').delete().eq('id', memberId);
  if (error) throw error;
}

export async function updateMemberRole(memberId: string, role: WorkspaceRole): Promise<void> {
  const { error } = await supabase.from('workspace_members').update({ role }).eq('id', memberId);
  if (error) throw error;
}

/** Called from an invite-accept page after the user is logged in. */
export async function acceptInviteByToken(token: string): Promise<string | null> {
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) throw new Error('Must be signed in');
  const { data, error } = await supabase
    .from('workspace_members')
    .update({ user_id: uid, status: 'active', invited_email: null, invite_token: null })
    .eq('invite_token', token)
    .select('workspace_id')
    .maybeSingle();
  if (error) throw error;
  return (data?.workspace_id as string | undefined) ?? null;
}

export function buildInviteLink(token: string): string {
  return `${window.location.origin}/invite/${token}`;
}
