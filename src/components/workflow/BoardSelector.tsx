import { useState, useRef, useEffect } from 'react';
import type { Board } from '../../lib/supabase';
import { MAX_BOARDS_PER_USER } from '../../services/boardService';
import {
  ChevronDown,
  Plus,
  Trash2,
  Edit2,
  Check,
  KanbanSquare,
  AlertTriangle,
} from 'lucide-react';
import { Modal, Button } from '../ui';

type Props = {
  boards: Board[];
  selectedBoard: Board | null;
  onSelectBoard: (board: Board) => void;
  onOpenNewBoardModal: () => void;
  onRenameBoard: (boardId: string, newName: string) => Promise<void>;
  onDeleteBoard: (boardId: string) => Promise<void>;
};

export function BoardSelector({
  boards,
  selectedBoard,
  onSelectBoard,
  onOpenNewBoardModal,
  onRenameBoard,
  onDeleteBoard,
}: Props) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Rename modal
  const [renameTarget, setRenameTarget] = useState<Board | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [renameLoading, setRenameLoading] = useState(false);
  const [renameError, setRenameError] = useState<string | null>(null);

  // Delete modal
  const [deleteTarget, setDeleteTarget] = useState<Board | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [dropdownOpen]);

  const handleOpenRename = (e: React.MouseEvent, b: Board) => {
    e.stopPropagation();
    setRenameTarget(b);
    setRenameValue(b.name);
    setRenameError(null);
    setDropdownOpen(false);
  };

  const handleConfirmRename = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renameTarget) return;
    const trimmed = renameValue.trim();
    if (trimmed.length < 1 || trimmed.length > 40) {
      setRenameError('Board name must be between 1 and 40 characters.');
      return;
    }
    setRenameLoading(true);
    try {
      await onRenameBoard(renameTarget.id, trimmed);
      setRenameTarget(null);
    } catch (err) {
      setRenameError(err instanceof Error ? err.message : 'Failed to rename board');
    } finally {
      setRenameLoading(false);
    }
  };

  const handleOpenDelete = (e: React.MouseEvent, b: Board) => {
    e.stopPropagation();
    setDeleteTarget(b);
    setDropdownOpen(false);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await onDeleteBoard(deleteTarget.id);
      setDeleteTarget(null);
    } catch (err) {
      console.error('Delete board failed:', err);
    } finally {
      setDeleteLoading(false);
    }
  };

  const isAtLimit = boards.length >= MAX_BOARDS_PER_USER;

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      {/* Board Selector Trigger Button */}
      <button
        type="button"
        onClick={() => setDropdownOpen((prev) => !prev)}
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-[#151C2C] text-sm font-bold text-gray-900 dark:text-white shadow-2xs hover:bg-gray-50 dark:hover:bg-slate-800/80 transition-all max-w-[280px]"
      >
        <KanbanSquare className="w-4 h-4 text-violet-500 shrink-0" />
        <span className="truncate">{selectedBoard?.name || 'Main Pipeline'}</span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 shrink-0 ${
            dropdownOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      {dropdownOpen && (
        <div className="absolute left-0 mt-2 w-72 bg-white dark:bg-[#151C2C] border border-gray-200 dark:border-slate-800 rounded-2xl shadow-xl py-2 z-50 animate-in fade-in-50 zoom-in-95">
          <div className="px-3 py-1.5 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-slate-500">
              Workspaces & Boards ({boards.length}/{MAX_BOARDS_PER_USER})
            </span>
          </div>

          <div className="max-h-60 overflow-y-auto py-1">
            {boards.map((b) => {
              const isSelected = selectedBoard?.id === b.id;
              return (
                <div
                  key={b.id}
                  onClick={() => {
                    onSelectBoard(b);
                    setDropdownOpen(false);
                  }}
                  className={`px-3 py-2 flex items-center justify-between cursor-pointer text-xs group transition-colors ${
                    isSelected
                      ? 'bg-violet-500/10 text-violet-700 dark:text-violet-300 font-bold'
                      : 'text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0 pr-2">
                    <span className="truncate">{b.name}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-violet-600 shrink-0" />}
                  </div>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={(e) => handleOpenRename(e, b)}
                      title="Rename board"
                      className="p-1 rounded text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-slate-700"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                    {boards.length > 1 && (
                      <button
                        type="button"
                        onClick={(e) => handleOpenDelete(e, b)}
                        title="Delete board"
                        className="p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-1 border-t border-gray-100 dark:border-slate-800 px-2 mt-1">
            <button
              type="button"
              onClick={() => {
                setDropdownOpen(false);
                onOpenNewBoardModal();
              }}
              disabled={isAtLimit}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-950/40 disabled:opacity-50 disabled:pointer-events-none transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isAtLimit ? 'Max boards reached (10)' : '+ New board'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Rename Board Modal */}
      {renameTarget && (
        <Modal
          isOpen={!!renameTarget}
          onClose={() => setRenameTarget(null)}
          title="Rename Board"
          maxWidth="max-w-md"
        >
          <form onSubmit={handleConfirmRename} className="space-y-4">
            {renameError && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-600 dark:text-red-400">
                {renameError}
              </div>
            )}
            <div>
              <div className="flex justify-between mb-1.5">
                <label className="text-xs font-bold text-gray-700 dark:text-slate-300">
                  Board Name
                </label>
                <span className="text-[11px] text-gray-400">{renameValue.trim().length}/40</span>
              </div>
              <input
                type="text"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value.slice(0, 40))}
                disabled={renameLoading}
                autoFocus
                placeholder="Board Name"
                className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-[#192237] border border-gray-200 dark:border-slate-700 rounded-xl text-sm text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all disabled:opacity-50"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setRenameTarget(null)}
                disabled={renameLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={renameLoading || !renameValue.trim()}>
                {renameLoading ? 'Renaming...' : 'Save Name'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Board Confirmation Modal */}
      {deleteTarget && (
        <Modal
          isOpen={!!deleteTarget}
          onClose={() => setDeleteTarget(null)}
          title="Delete Board"
          maxWidth="max-w-md"
        >
          <div className="space-y-4">
            <div className="p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div className="text-xs text-red-700 dark:text-red-400 space-y-1">
                <p className="font-bold">Permanently delete &ldquo;{deleteTarget.name}&rdquo;?</p>
                <p>
                  Warning: All columns and cards belonging to this board will be deleted. This action cannot be undone.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDeleteTarget(null)}
                disabled={deleteLoading}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleteLoading}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {deleteLoading ? 'Deleting...' : 'Delete Board & Cards'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
