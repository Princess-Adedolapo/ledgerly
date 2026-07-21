import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronsUpDown, Check, Plus, LayoutDashboard, X } from 'lucide-react';
import { useWorkspace } from '../../lib/workspace';

export function WorkspaceSwitcher() {
  const { workspaces, activeWorkspace, switchWorkspace, createWorkspace } = useWorkspace();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newName.trim();
    if (!name) { setError('Business name is required'); return; }
    setCreating(true);
    setError(null);
    try {
      await createWorkspace(name);
      setNewName('');
      setCreateOpen(false);
      setOpen(false);
      navigate('/dashboard');
    } catch (err) {
      console.error('[WorkspaceSwitcher] create failed', err);
      setError(err instanceof Error ? err.message : 'Failed to create workspace');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="relative flex-1 min-w-0" ref={menuRef}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800/60 transition-colors group"
        aria-label="Switch workspace"
      >
        <span className="text-sm font-bold text-gray-900 dark:text-gray-100 tracking-tight truncate flex-1 text-left">
          {activeWorkspace?.name ?? 'My Workspace'}
        </span>
        <ChevronsUpDown className="w-3.5 h-3.5 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 shrink-0" />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg shadow-xl overflow-hidden">
          <div className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 border-b border-gray-100 dark:border-gray-800">
            Workspaces
          </div>
          <div className="max-h-64 overflow-y-auto py-1">
            {workspaces.map((w) => {
              const isActive = w.id === activeWorkspace?.id;
              return (
                <button
                  key={w.id}
                  onClick={() => { switchWorkspace(w.id); setOpen(false); }}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors ${
                    isActive
                      ? 'bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-300'
                      : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800/60'
                  }`}
                >
                  <div className="w-6 h-6 rounded-md bg-gradient-to-br from-violet-600 to-indigo-500 flex items-center justify-center text-[10px] font-bold text-white shrink-0">
                    {w.name[0]?.toUpperCase()}
                  </div>
                  <span className="flex-1 truncate">{w.name}</span>
                  {isActive && <Check className="w-4 h-4 shrink-0" />}
                </button>
              );
            })}
          </div>
          <button
            onClick={() => { setCreateOpen(true); setOpen(false); }}
            className="w-full flex items-center gap-2 px-3 py-2.5 text-sm font-medium text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-500/10 border-t border-gray-100 dark:border-gray-800 transition-colors"
          >
            <Plus className="w-4 h-4" /> Create New Workspace
          </button>
        </div>
      )}

      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => !creating && setCreateOpen(false)}>
          <div className="w-full max-w-md bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-500 flex items-center justify-center shrink-0">
                  <LayoutDashboard className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Create Workspace</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">A fresh space for your business data</p>
                </div>
              </div>
              <button onClick={() => !creating && setCreateOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Business Name</label>
                <input
                  autoFocus
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Acme Studio"
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500"
                />
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setCreateOpen(false)} disabled={creating} className="flex-1 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">Cancel</button>
                <button type="submit" disabled={creating || !newName.trim()} className="flex-1 px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium disabled:opacity-50">
                  {creating ? 'Creating…' : 'Create & Switch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
