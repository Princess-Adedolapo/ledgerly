import { useState, useEffect } from 'react';
import { Modal, Button, Input } from '../ui';
import {
  BRAND_COLORS,
  MAX_COLUMNS_PER_BOARD,
  MIN_COLUMNS_PER_BOARD,
} from '../../services/boardService';
import type { Board, BoardColumn, ColumnType, WorkflowCard } from '../../lib/supabase';
import {
  ArrowUp,
  ArrowDown,
  Trash2,
  Plus,
  AlertTriangle,
} from 'lucide-react';

type EditableCol = {
  id: string;
  name: string;
  description: string;
  color: string;
  column_type: ColumnType;
  position: number;
  isNew?: boolean;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  board: Board;
  columns: BoardColumn[];
  cards: WorkflowCard[];
  onSaveColumns: (columns: EditableCol[]) => Promise<void>;
  onRenameBoard: (newName: string) => Promise<void>;
  onDeleteColumnWithRelocate: (colId: string, targetColId?: string) => Promise<void>;
};

export function EditBoardModal({
  isOpen,
  onClose,
  board,
  columns,
  cards,
  onSaveColumns,
  onRenameBoard,
  onDeleteColumnWithRelocate,
}: Props) {
  const [boardName, setBoardName] = useState(board.name);
  const [items, setItems] = useState<EditableCol[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Column deletion prompt state
  const [deletingCol, setDeletingCol] = useState<EditableCol | null>(null);
  const [targetRelocateId, setTargetRelocateId] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      setBoardName(board.name);
      setItems(
        columns.map((c, idx) => ({
          id: c.id,
          name: c.name,
          description: c.description || '',
          color: c.color || 'violet',
          column_type: c.column_type || 'open',
          position: idx,
        }))
      );
      setError(null);
      setDeletingCol(null);
      setTargetRelocateId('');
    }
  }, [isOpen, board, columns]);

  const cardsCountByCol = (colId: string) => {
    return cards.filter((c) => c.column_id === colId).length;
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const next = [...items];
    const temp = next[index - 1];
    next[index - 1] = next[index];
    next[index] = temp;
    next.forEach((item, idx) => (item.position = idx));
    setItems(next);
  };

  const handleMoveDown = (index: number) => {
    if (index === items.length - 1) return;
    const next = [...items];
    const temp = next[index + 1];
    next[index + 1] = next[index];
    next[index] = temp;
    next.forEach((item, idx) => (item.position = idx));
    setItems(next);
  };

  const handleAddColumn = () => {
    if (items.length >= MAX_COLUMNS_PER_BOARD) {
      setError(`Columns limit reached: maximum ${MAX_COLUMNS_PER_BOARD} columns allowed per board.`);
      return;
    }
    setError(null);
    const newCol: EditableCol = {
      id: `temp-${Date.now()}`,
      name: `Stage ${items.length + 1}`,
      description: 'Pipeline stage',
      color: 'violet',
      column_type: 'open',
      position: items.length,
      isNew: true,
    };
    setItems([...items, newCol]);
  };

  const handleRequestDelete = (col: EditableCol) => {
    setError(null);
    if (items.length <= MIN_COLUMNS_PER_BOARD) {
      setError(`A board must contain at least ${MIN_COLUMNS_PER_BOARD} column.`);
      return;
    }

    // Check if it's the last won column
    if (col.column_type === 'won') {
      const remainingWon = items.filter((c) => c.id !== col.id && c.column_type === 'won');
      if (remainingWon.length === 0) {
        setError('At least one column on the board must have type "Won". You cannot delete the last Won column.');
        return;
      }
    }

    const cardCount = cardsCountByCol(col.id);
    if (cardCount > 0) {
      // Must choose destination column
      const otherCols = items.filter((c) => c.id !== col.id);
      setDeletingCol(col);
      setTargetRelocateId(otherCols[0]?.id || '');
      return;
    }

    // No cards in column, safe to remove directly
    if (col.isNew) {
      setItems(items.filter((c) => c.id !== col.id).map((c, i) => ({ ...c, position: i })));
    } else {
      executeDelete(col.id);
    }
  };

  const executeDelete = async (colId: string, relocateId?: string) => {
    setSaving(true);
    try {
      await onDeleteColumnWithRelocate(colId, relocateId);
      setItems((prev) => prev.filter((c) => c.id !== colId).map((c, i) => ({ ...c, position: i })));
      setDeletingCol(null);
      setTargetRelocateId('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete column');
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedBoard = boardName.trim();
    if (trimmedBoard.length < 1 || trimmedBoard.length > 40) {
      setError('Board name must be between 1 and 40 characters.');
      return;
    }

    if (items.length < MIN_COLUMNS_PER_BOARD) {
      setError(`A board must have at least ${MIN_COLUMNS_PER_BOARD} column.`);
      return;
    }

    // Validate column names
    for (const c of items) {
      const trimmed = c.name.trim();
      if (trimmed.length < 1 || trimmed.length > 40) {
        setError('All column names must be between 1 and 40 characters.');
        return;
      }
    }

    // Validate at least one won column
    const hasWon = items.some((c) => c.column_type === 'won');
    if (!hasWon) {
      setError('At least one column must be configured as "Won".');
      return;
    }

    setSaving(true);
    try {
      if (trimmedBoard !== board.name) {
        await onRenameBoard(trimmedBoard);
      }
      await onSaveColumns(items);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Board & Columns" maxWidth="max-w-3xl">
      <form onSubmit={handleSave} className="space-y-6">
        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        {/* Board Name */}
        <div className="bg-gray-50/60 dark:bg-slate-900/40 border border-gray-200 dark:border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-bold text-gray-700 dark:text-slate-300">
              Board Name
            </label>
            <span className="text-[11px] text-gray-400">{boardName.trim().length}/40</span>
          </div>
          <Input
            value={boardName}
            onChange={(e) => setBoardName(e.target.value.slice(0, 40))}
            placeholder="Board Name"
            disabled={saving}
          />
        </div>

        {/* Columns Editor */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Pipeline Columns ({items.length}/{MAX_COLUMNS_PER_BOARD})
              </h4>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                Reorder stages, customize titles, assign colors, and configure column types (Open, Won, Lost).
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddColumn}
              disabled={items.length >= MAX_COLUMNS_PER_BOARD || saving}
              className="gap-1 text-xs"
            >
              <Plus className="w-3.5 h-3.5" /> Add Column
            </Button>
          </div>

          <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
            {items.map((col, index) => {
              const cardCount = cardsCountByCol(col.id);
              const isOnlyWon = col.column_type === 'won' && items.filter((c) => c.column_type === 'won').length === 1;

              return (
                <div
                  key={col.id}
                  className="bg-white dark:bg-[#151C2C] border border-gray-200 dark:border-slate-800 rounded-xl p-3.5 shadow-2xs space-y-3 transition-all"
                >
                  <div className="flex items-center justify-between gap-2">
                    {/* Reorder and Title */}
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleMoveUp(index)}
                        disabled={index === 0 || saving}
                        aria-label="Move column left/up"
                        className="w-7 h-7 rounded-md border border-gray-200 dark:border-slate-700 flex items-center justify-center text-gray-500 hover:text-gray-900 dark:hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-colors"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveDown(index)}
                        disabled={index === items.length - 1 || saving}
                        aria-label="Move column right/down"
                        className="w-7 h-7 rounded-md border border-gray-200 dark:border-slate-700 flex items-center justify-center text-gray-500 hover:text-gray-900 dark:hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-colors"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-xs font-bold text-gray-400 dark:text-slate-500 px-1">
                        #{index + 1}
                      </span>
                    </div>

                    {/* Column Type Picker */}
                    <div className="flex items-center gap-1 bg-gray-100 dark:bg-slate-800/80 p-0.5 rounded-lg border border-gray-200/80 dark:border-slate-700">
                      <button
                        type="button"
                        onClick={() => {
                          if (isOnlyWon) {
                            setError('At least one Won column is required on the board.');
                            return;
                          }
                          const next = [...items];
                          next[index].column_type = 'open';
                          setItems(next);
                        }}
                        className={`text-[10px] font-bold px-2 py-1 rounded-md transition-all ${
                          col.column_type === 'open'
                            ? 'bg-violet-600 text-white shadow-xs'
                            : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'
                        }`}
                      >
                        Open
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const next = [...items];
                          next[index].column_type = 'won';
                          setItems(next);
                        }}
                        className={`text-[10px] font-bold px-2 py-1 rounded-md transition-all ${
                          col.column_type === 'won'
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'
                        }`}
                      >
                        Won
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (isOnlyWon) {
                            setError('At least one Won column is required on the board.');
                            return;
                          }
                          const next = [...items];
                          next[index].column_type = 'lost';
                          setItems(next);
                        }}
                        className={`text-[10px] font-bold px-2 py-1 rounded-md transition-all ${
                          col.column_type === 'lost'
                            ? 'bg-rose-600 text-white shadow-xs'
                            : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'
                        }`}
                      >
                        Lost
                      </button>
                    </div>

                    {/* Delete Column Button */}
                    <button
                      type="button"
                      onClick={() => handleRequestDelete(col)}
                      disabled={saving || items.length <= MIN_COLUMNS_PER_BOARD}
                      aria-label="Delete column"
                      className="w-7 h-7 rounded-md text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 flex items-center justify-center disabled:opacity-30 disabled:pointer-events-none transition-colors shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Inputs: Title & Subtitle */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <input
                        type="text"
                        value={col.name}
                        maxLength={40}
                        onChange={(e) => {
                          const next = [...items];
                          next[index].name = e.target.value.slice(0, 40);
                          setItems(next);
                        }}
                        placeholder="Column Title (e.g. In Review)"
                        className="w-full text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/50 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-violet-500"
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        value={col.description}
                        maxLength={80}
                        onChange={(e) => {
                          const next = [...items];
                          next[index].description = e.target.value;
                          setItems(next);
                        }}
                        placeholder="Subtitle / description (e.g. Quoted / Pending)"
                        className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/50 text-gray-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-violet-500"
                      />
                    </div>
                  </div>

                  {/* Color Swatch Selector & Card count */}
                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-gray-400 font-medium">Color:</span>
                      <div className="flex items-center gap-1">
                        {BRAND_COLORS.map((b) => (
                          <button
                            key={b.id}
                            type="button"
                            onClick={() => {
                              const next = [...items];
                              next[index].color = b.id;
                              setItems(next);
                            }}
                            title={b.name}
                            className={`w-4 h-4 rounded-full border transition-all ${
                              col.color === b.id
                                ? 'ring-2 ring-violet-500 ring-offset-1 dark:ring-offset-slate-900 scale-110'
                                : 'opacity-70 hover:opacity-100 border-transparent'
                            }`}
                            style={{ backgroundColor: b.hex }}
                          />
                        ))}
                      </div>
                    </div>

                    <div className="text-[11px] text-gray-400 font-medium">
                      {cardCount} {cardCount === 1 ? 'card' : 'cards'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100 dark:border-slate-800">
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>

      {/* Relocate Cards Modal on Column Deletion */}
      {deletingCol && (
        <Modal
          isOpen={!!deletingCol}
          onClose={() => setDeletingCol(null)}
          title="Move Cards Before Deleting Column"
          maxWidth="max-w-md"
        >
          <div className="space-y-4">
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-800 dark:text-amber-300">
                <p className="font-bold">Column contains {cardsCountByCol(deletingCol.id)} cards</p>
                <p className="mt-0.5 text-amber-700/90 dark:text-amber-400">
                  Please choose another column to move these cards into before deleting &ldquo;{deletingCol.name}&rdquo;. No cards will be lost.
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1.5">
                Move {cardsCountByCol(deletingCol.id)} cards to:
              </label>
              <select
                value={targetRelocateId}
                onChange={(e) => setTargetRelocateId(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
              >
                {items
                  .filter((c) => c.id !== deletingCol.id)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.column_type.toUpperCase()})
                    </option>
                  ))}
              </select>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDeletingCol(null)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() => executeDelete(deletingCol.id, targetRelocateId)}
                disabled={saving || !targetRelocateId}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {saving ? 'Moving...' : 'Move Cards & Delete Column'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </Modal>
  );
}
