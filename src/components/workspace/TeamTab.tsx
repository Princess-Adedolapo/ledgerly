import { useCallback, useEffect, useState } from 'react';
import { Users, UserPlus, Trash2, Mail, Copy, Check, X, Shield } from 'lucide-react';
import { Card, Button } from '../ui';
import {
  listMembers,
  inviteMember,
  removeMember,
  updateMemberRole,
  buildInviteLink,
  type MemberWithEmail,
} from '../../services/workspaceMembersService';
import { useWorkspace } from '../../lib/workspace';
import { useAuth } from '../../lib/auth';
import type { WorkspaceRole } from '../../lib/supabase';

const ROLE_LABEL: Record<WorkspaceRole, string> = {
  owner: 'Owner',
  admin: 'Admin',
  member: 'Team Member',
};

const ROLE_COLOR: Record<WorkspaceRole, string> = {
  owner: 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/30',
  admin: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30',
  member: 'bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/30',
};

export function TeamTab() {
  const { activeWorkspace, activeWorkspaceId } = useWorkspace();
  const { user } = useAuth();
  const [members, setMembers] = useState<MemberWithEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<WorkspaceRole>('member');
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [lastInviteLink, setLastInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!activeWorkspaceId) {
      setMembers([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(null);
    try {
      const list = await listMembers();
      setMembers(list);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load team members');
      setMembers([]);
    } finally {
      setLoading(false);
    }
  }, [activeWorkspaceId]);

  useEffect(() => { load(); }, [load]);

  const myRole: WorkspaceRole | null = members.find((m) => m.user_id === user?.id)?.role ?? null;
  const canManage = myRole === 'owner' || myRole === 'admin';

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteError(null);
    const email = inviteEmail.trim().toLowerCase();
    if (!email || !/^[^@]+@[^@]+\.[^@]+$/.test(email)) {
      setInviteError('Enter a valid email');
      return;
    }
    setInviting(true);
    try {
      const token = await inviteMember(email, inviteRole);
      setLastInviteLink(buildInviteLink(token));
      setInviteEmail('');
      await load();
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : 'Failed to invite');
    } finally {
      setInviting(false);
    }
  };

  const handleCopyLink = async () => {
    if (!lastInviteLink) return;
    try {
      await navigator.clipboard.writeText(lastInviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  };

  const handleRemove = async (id: string, email: string | null) => {
    if (!confirm(`Remove ${email ?? 'this member'} from the workspace?`)) return;
    await removeMember(id);
    await load();
  };

  const handleRoleChange = async (id: string, role: WorkspaceRole) => {
    await updateMemberRole(id, role);
    await load();
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-violet-500/10 dark:bg-violet-500/20 flex items-center justify-center">
            <Users className="w-5 h-5 text-violet-600 dark:text-violet-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Team</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Members of <span className="font-medium">{activeWorkspace?.name ?? '—'}</span>
            </p>
          </div>
        </div>
        {canManage && (
          <Button onClick={() => { setInviteOpen(true); setLastInviteLink(null); }}>
            <span className="flex items-center gap-2"><UserPlus className="w-4 h-4" /> Invite Member</span>
          </Button>
        )}
      </div>

      {loadError ? (
        <div className="p-4 rounded-lg border border-red-500/30 bg-red-500/5 text-sm text-red-600 dark:text-red-400">
          {loadError}
        </div>
      ) : loading ? (
        <div className="space-y-2">
          {[0,1,2].map((i) => <div key={i} className="h-14 bg-gray-100 dark:bg-gray-800/40 rounded-lg animate-pulse" />)}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-800">
                <th className="text-left text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider py-2.5">Member</th>
                <th className="text-left text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider py-2.5">Role</th>
                <th className="text-left text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider py-2.5">Status</th>
                <th className="py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => {
                const isMe = m.user_id === user?.id;
                const isOwner = m.role === 'owner';
                return (
                  <tr key={m.id} className="border-b border-gray-100 dark:border-gray-800/50 last:border-0">
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-500 to-gray-700 flex items-center justify-center text-xs font-medium text-white shrink-0">
                          <Mail className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm text-gray-900 dark:text-gray-100 truncate">
                            {m.email ?? '—'} {isMe && <span className="text-xs text-gray-400">(you)</span>}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3">
                      {canManage && !isOwner && !isMe ? (
                        <select
                          value={m.role}
                          onChange={(e) => handleRoleChange(m.id, e.target.value as WorkspaceRole)}
                          className={`text-xs px-2 py-1 rounded-md border ${ROLE_COLOR[m.role]} bg-transparent`}
                        >
                          <option value="admin">Admin</option>
                          <option value="member">Team Member</option>
                        </select>
                      ) : (
                        <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md border ${ROLE_COLOR[m.role]}`}>
                          {isOwner && <Shield className="w-3 h-3" />} {ROLE_LABEL[m.role]}
                        </span>
                      )}
                    </td>
                    <td className="py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${m.status === 'active' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'}`}>
                        {m.status === 'active' ? 'Active' : 'Pending'}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      {canManage && !isOwner && !isMe && (
                        <button
                          onClick={() => handleRemove(m.id, m.email)}
                          aria-label="Remove member"
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-500/10 rounded-md transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {members.length === 0 && (
                <tr><td colSpan={4} className="py-10 text-center text-sm text-gray-400">No members yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {inviteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setInviteOpen(false)}>
          <div className="w-full max-w-md bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Invite team member</h3>
              <button onClick={() => setInviteOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleInvite} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Email address</label>
                <input
                  autoFocus
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="teammate@company.com"
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Role</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as WorkspaceRole)}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                >
                  <option value="member">Team Member — read & write data</option>
                  <option value="admin">Admin — manage members and settings</option>
                </select>
              </div>
              {inviteError && <p className="text-sm text-red-500">{inviteError}</p>}
              {lastInviteLink && (
                <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3">
                  <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400 mb-1.5">Invite created — share this link:</p>
                  <div className="flex items-center gap-2">
                    <input readOnly value={lastInviteLink} className="flex-1 min-w-0 px-2 py-1.5 text-xs bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-700 rounded font-mono text-gray-700 dark:text-gray-300" />
                    <button type="button" onClick={handleCopyLink} className="p-1.5 text-gray-500 hover:text-violet-500 border border-gray-200 dark:border-gray-700 rounded" aria-label="Copy link">
                      {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setInviteOpen(false)} className="flex-1 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">Close</button>
                <button type="submit" disabled={inviting || !inviteEmail.trim()} className="flex-1 px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium disabled:opacity-50">
                  {inviting ? 'Sending…' : 'Send invite'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Card>
  );
}
