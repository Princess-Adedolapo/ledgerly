import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { useWorkspace } from '../lib/workspace';
import { acceptInviteByToken } from '../services/workspaceMembersService';
import { LayoutDashboard, CheckCircle2, AlertCircle } from 'lucide-react';

export default function AcceptInvitePage() {
  const { token } = useParams<{ token: string }>();
  const { session, loading: authLoading } = useAuth();
  const { switchWorkspace, refreshWorkspaces } = useWorkspace();
  const navigate = useNavigate();
  const [state, setState] = useState<'idle' | 'accepting' | 'done' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!token) { setState('error'); setError('Missing invite token'); return; }
    if (!session) {
      // Preserve intent, bounce to auth
      try { sessionStorage.setItem('post_login_redirect', `/invite/${token}`); } catch { /* ignore */ }
      navigate('/auth');
      return;
    }
    (async () => {
      try {
        setState('accepting');
        const wsId = await acceptInviteByToken(token);
        await refreshWorkspaces();
        if (wsId) switchWorkspace(wsId);
        setState('done');
        setTimeout(() => navigate('/dashboard'), 800);
      } catch (err) {
        setState('error');
        setError(err instanceof Error ? err.message : 'Failed to accept invite');
      }
    })();
  }, [token, session, authLoading, navigate, switchWorkspace, refreshWorkspaces]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-xl p-8 text-center">
        <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-500 flex items-center justify-center">
          <LayoutDashboard className="w-7 h-7 text-white" />
        </div>
        {state === 'accepting' || state === 'idle' ? (
          <>
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-1">Joining workspace…</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Hang tight, verifying your invite.</p>
          </>
        ) : state === 'done' ? (
          <>
            <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-500 mb-2" />
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-1">You're in!</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Redirecting to your dashboard…</p>
          </>
        ) : (
          <>
            <AlertCircle className="w-10 h-10 mx-auto text-red-500 mb-2" />
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-1">Invite couldn't be accepted</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{error ?? 'The link may be invalid or already used.'}</p>
            <Link to="/dashboard" className="text-sm text-violet-600 dark:text-violet-400 hover:underline">Go to dashboard</Link>
          </>
        )}
      </div>
    </div>
  );
}
