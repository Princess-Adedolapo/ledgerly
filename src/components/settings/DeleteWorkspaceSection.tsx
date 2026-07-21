import { useState, useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, Trash2, RotateCcw, X, Users } from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { useWorkspace } from '../../lib/workspace';
import { useToast } from '../../contexts/ToastContext';
import {
  listOwnedActiveWorkspaces,
  countActiveMembers,
} from '../../services/workspaceService';
import type { Workspace } from '../../lib/supabase';

const GRACE_DAYS = 7;

function daysRemaining(deletedAt: string | null): number {
  if (!deletedAt) return GRACE_DAYS;
  const deleted = new Date(deletedAt).getTime();
  const expires = deleted + GRACE_DAYS * 24 * 60 * 60 * 1000;
  return Math.max(0, Math.ceil((expires - Date.now()) / (24 * 60 * 60 * 1000)));
}

export function DeleteWorkspaceSection() {
  const { user } = useAuth();
  const {
    workspaces,
    activeWorkspaceId,
    deletedWorkspaces,
    softDeleteWorkspace,
    restoreWorkspace,
    refreshDeletedWorkspaces,
  } = useWorkspace();
  const { addToast } = useToast();

  const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId) ?? null;
  const isOwner = !!activeWorkspace && !!user && activeWorkspace.owner_id === user.id;

  const [memberCount, setMemberCount] = useState<number | null>(null);
  const [ownedCount, setOwnedCount] = useState<number | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [acknowledged, setAcknowledged] = useState(false);
  const [busy, setBusy] = useState(false);
  const [inlineAlert, setInlineAlert] = useState(false);

  const refreshCounts = useCallback(async () => {
    if (!activeWorkspace || !isOwner) return;
    try {
      const [members, owned] = await Promise.all([
        countActiveMembers(activeWorkspace.id),
        listOwnedActiveWorkspaces(),
      ]);
      setMemberCount(members);
      setOwnedCount(owned.length);
    } catch {
      setMemberCount(null);
      setOwnedCount(null);
    }
  }, [activeWorkspace, isOwner]);

  useEffect(() => {
    void refreshCounts();
  }, [refreshCounts]);

  useEffect(() => {
    void refreshDeletedWorkspaces();
  }, [refreshDeletedWorkspaces]);

  if (!activeWorkspace || !isOwner) return null;

  const openModal = async () => {
    setInlineAlert(false);
    let count = ownedCount;
    if (count === null) {
      try {
        count = (await listOwnedActiveWorkspaces()).length;
        setOwnedCount(count);
      } catch {
        count = null;
      }
    }
    if (count !== null && count <= 1) {
      setInlineAlert(true);
      return;
    }
    setStep(1);
    setAcknowledged(false);
    setModalOpen(true);
  };

  const closeModal = () => {
    if (busy) return;
    setModalOpen(false);
    setStep(1);
    setAcknowledged(false);
  };

  const handleSoftDelete = async () => {
    if (!activeWorkspace) return;
    setBusy(true);
    try {
      await softDeleteWorkspace(activeWorkspace.id);
      addToast(
        'success',
        'Workspace scheduled for deletion',
        `Workspace '${activeWorkspace.name}' has been scheduled for deletion. You can restore it within 7 days.`,
      );
      closeModal();
    } catch (err) {
      addToast(
        'error',
        'Failed to delete workspace',
        err instanceof Error ? err.message : 'An unexpected error occurred.',
      );
    } finally {
      setBusy(false);
    }
  };

  const handleRestore = async (ws: Workspace) => {
    setBusy(true);
    try {
      await restoreWorkspace(ws.id);
      addToast('success', 'Workspace restored', `Workspace '${ws.name}' has been restored.`);
    } catch (err) {
      addToast(
        'error',
        'Failed to restore workspace',
        err instanceof Error ? err.message : 'An unexpected error occurred.',
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      {/* Danger Zone */}
      <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-red-500/10 dark:bg-red-500/20 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
          </div>
          <h2 className="text-lg font-semibold text-red-600 dark:text-red-400">Delete Workspace</h2>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Delete "{activeWorkspace.name}"
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" />
              This workspace has {memberCount ?? '…'} active member{(memberCount ?? 0) === 1 ? '' : 's'}.
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              The workspace will be soft-deleted and permanently removed after {GRACE_DAYS} days.
              You can undo this within {GRACE_DAYS} days from this page.
            </p>
          </div>
          <button
            onClick={openModal}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Trash2 className="w-4 h-4" />
            Delete Workspace
          </button>
        </div>

        {inlineAlert && (
          <div className="mt-4 flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-sm text-amber-700 dark:text-amber-300">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>You must have at least one workspace. Create another workspace before deleting this one.</span>
          </div>
        )}
      </div>

      {/* Deleted Workspaces (restore) */}
      {deletedWorkspaces.length > 0 && (
        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/60 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-gray-500/10 dark:bg-gray-500/20 flex items-center justify-center">
              <RotateCcw className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Deleted Workspaces</h2>
          </div>
          <ul className="space-y-3">
            {deletedWorkspaces.map((ws) => {
              const days = daysRemaining(ws.deleted_at);
              return (
                <li
                  key={ws.id}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-lg border border-gray-200 dark:border-gray-800 p-3"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{ws.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      Permanent deletion in {days} day{days === 1 ? '' : 's'}
                    </p>
                  </div>
                  <button
                    onClick={() => handleRestore(ws)}
                    disabled={busy}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Restore
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Confirmation Modal */}
      <AnimatePresence>
        {modalOpen && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeModal}
          >
            <motion.div
              className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl border border-red-500/30 shadow-2xl p-6"
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.18 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-red-500" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    Delete workspace?
                  </h3>
                </div>
                <button
                  onClick={closeModal}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <AnimatePresence mode="wait">
                {step === 1 ? (
                  <motion.div
                    key="step1"
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -8 }}
                    transition={{ duration: 0.15 }}
                  >
                    <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-300 mb-4">
                      <li className="flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 mt-0.5 text-red-500 shrink-0" />
                        <span>Workspace: <strong>{activeWorkspace.name}</strong></span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Users className="w-4 h-4 mt-0.5 text-red-500 shrink-0" />
                        <span>
                          <strong>{memberCount ?? '…'}</strong> active member
                          {(memberCount ?? 0) === 1 ? '' : 's'} will lose access.
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Trash2 className="w-4 h-4 mt-0.5 text-red-500 shrink-0" />
                        <span>
                          The workspace will be soft-deleted and permanently removed after {GRACE_DAYS} days.
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <RotateCcw className="w-4 h-4 mt-0.5 text-emerald-500 shrink-0" />
                        <span>
                          This action can be undone within {GRACE_DAYS} days from the Settings page.
                        </span>
                      </li>
                    </ul>

                    <label className="flex items-start gap-2.5 cursor-pointer mb-4">
                      <input
                        type="checkbox"
                        checked={acknowledged}
                        onChange={(e) => setAcknowledged(e.target.checked)}
                        className="mt-0.5 w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-red-600 focus:ring-red-500"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        I understand that all members will lose access to this workspace
                      </span>
                    </label>

                    <div className="flex gap-2">
                      <button
                        onClick={closeModal}
                        disabled={busy}
                        className="flex-1 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => setStep(2)}
                        disabled={!acknowledged || busy}
                        className="flex-1 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Continue
                      </button>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="step2"
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -8 }}
                    transition={{ duration: 0.15 }}
                  >
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-5">
                      This will schedule <strong>{activeWorkspace.name}</strong> for deletion in {GRACE_DAYS} days.
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={closeModal}
                        disabled={busy}
                        className="flex-1 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSoftDelete}
                        disabled={busy}
                        className="flex-1 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
                      >
                        {busy ? (
                          'Scheduling…'
                        ) : (
                          <>
                            <Trash2 className="w-4 h-4" />
                            Confirm Delete
                          </>
                        )}
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default DeleteWorkspaceSection;
