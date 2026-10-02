import { useState, useEffect, useRef } from 'react';
import { Modal, Button } from '../ui';
import { BOARD_TEMPLATES, type BoardTemplateKey } from '../../services/boardService';
import { Check, AlertCircle, Sparkles } from 'lucide-react';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (name: string, templateKey: BoardTemplateKey) => Promise<void>;
  boardCount: number;
  maxBoards: number;
};

export function NewBoardModal({ isOpen, onClose, onSubmit, boardCount, maxBoards }: Props) {
  const [selectedTemplate, setSelectedTemplate] = useState<BoardTemplateKey>('sales');
  const [name, setName] = useState('Sales Pipeline');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isAtLimit = boardCount >= maxBoards;

  // Whenever modal opens, reset state and ensure input is pre-filled and focused
  useEffect(() => {
    if (isOpen) {
      setSelectedTemplate('sales');
      setName(BOARD_TEMPLATES.sales.name);
      setError(null);
      setLoading(false);
      const timer = setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.select();
        }
      }, 60);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handleSelectTemplate = (key: BoardTemplateKey) => {
    if (loading) return;
    setSelectedTemplate(key);
    // Auto-update board name if name matches another template name or is blank
    const matchesAnyTemplate = Object.values(BOARD_TEMPLATES).some((t) => t.name === name.trim());
    if (!name.trim() || matchesAnyTemplate) {
      setName(BOARD_TEMPLATES[key].name);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const trimmed = name.trim();
    if (trimmed.length < 1 || trimmed.length > 40) {
      setError('Board name must be between 1 and 40 characters.');
      return;
    }
    if (isAtLimit) {
      setError(`Maximum limit of ${maxBoards} boards reached. Delete an existing board to create a new one.`);
      return;
    }

    setLoading(true);
    try {
      await onSubmit(trimmed, selectedTemplate);
      setName('');
      setSelectedTemplate('sales');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create board');
    } finally {
      setLoading(false);
    }
  };

  const templatesList: BoardTemplateKey[] = ['sales', 'freelance', 'orders', 'blank'];
  const suggestedNames = ['Sales Pipeline', 'Enterprise Deals', 'Client Retainers', 'Project Deliverables'];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create New Board" maxWidth="max-w-xl">
      <form onSubmit={handleSubmit} className="space-y-5">
        {isAtLimit && (
          <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center gap-2.5 text-xs text-amber-700 dark:text-amber-400">
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
            <span>You have reached the maximum limit of {maxBoards} boards. Delete an existing board to create a new one.</span>
          </div>
        )}

        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        {/* Board Name Input */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="new-board-name-input" className="text-xs font-bold text-gray-700 dark:text-slate-300">
              Board Name <span className="text-red-500">*</span>
            </label>
            <span className="text-[11px] text-gray-400">
              {name.trim().length}/40
            </span>
          </div>
          <input
            id="new-board-name-input"
            ref={inputRef}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value.slice(0, 40))}
            placeholder="e.g. Enterprise Deals, Q4 Client Retainers..."
            disabled={loading}
            required
            autoComplete="off"
            className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-[#192237] border border-gray-200 dark:border-slate-700 rounded-xl text-sm text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all disabled:opacity-50"
          />

          {/* Quick Name Suggestions */}
          <div className="flex flex-wrap items-center gap-1.5 mt-2">
            <span className="text-[10px] text-gray-400 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-violet-500" /> Quick names:
            </span>
            {suggestedNames.map((sug) => (
              <button
                key={sug}
                type="button"
                onClick={() => setName(sug)}
                className={`text-[11px] px-2 py-0.5 rounded-lg border transition-all ${
                  name === sug
                    ? 'bg-violet-500/15 border-violet-500 text-violet-700 dark:text-violet-300 font-semibold'
                    : 'bg-gray-100 dark:bg-slate-800/80 border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-300 hover:border-gray-300'
                }`}
              >
                {sug}
              </button>
            ))}
          </div>
        </div>

        {/* Templates Picker */}
        <div>
          <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-2">
            Choose a Template
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {templatesList.map((key) => {
              const tpl = BOARD_TEMPLATES[key];
              const isSelected = selectedTemplate === key;
              return (
                <div
                  key={key}
                  onClick={() => handleSelectTemplate(key)}
                  className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all ${
                    isSelected
                      ? 'border-violet-500 bg-violet-500/10 ring-2 ring-violet-500/30'
                      : 'border-gray-200 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-900/40 hover:border-gray-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-bold text-gray-900 dark:text-white">
                      {tpl.name}
                    </span>
                    {isSelected && (
                      <span className="w-5 h-5 rounded-full bg-violet-600 text-white flex items-center justify-center shrink-0">
                        <Check className="w-3 h-3" />
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-gray-500 dark:text-slate-400 line-clamp-1 mb-2">
                    {tpl.description}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {tpl.columns.map((c) => (
                      <span
                        key={c.name}
                        className={`text-[9px] font-semibold px-1.5 py-0.5 rounded ${
                          c.column_type === 'won'
                            ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                            : c.column_type === 'lost'
                            ? 'bg-rose-500/20 text-rose-700 dark:text-rose-300'
                            : 'bg-gray-200 dark:bg-slate-800 text-gray-700 dark:text-slate-300'
                        }`}
                      >
                        {c.name}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100 dark:border-slate-800">
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading || !name.trim() || isAtLimit}>
            {loading ? 'Creating...' : 'Create Board'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
