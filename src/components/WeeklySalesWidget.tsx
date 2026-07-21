import { useState, useRef, useEffect } from 'react';
import { useWorkspace } from '../lib/workspace';
import { useUserPreferences } from '../lib/userPreferences';
import { useWeeklySales } from '../hooks/useWeeklySales';
import { formatCurrency } from '../lib/currency';
import { Target, TrendingUp, Check } from 'lucide-react';

export function WeeklySalesWidget() {
  const { weeklySalesTarget, setWeeklySalesTarget, theme } = useWorkspace();
  const { currencyCode, currencyDisplayMode } = useUserPreferences();
  const { actual, loading } = useWeeklySales();
  const [editingTarget, setEditingTarget] = useState(false);
  const [targetInput, setTargetInput] = useState(String(weeklySalesTarget));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTargetInput(String(weeklySalesTarget));
  }, [weeklySalesTarget]);

  useEffect(() => {
    if (editingTarget) inputRef.current?.focus();
  }, [editingTarget]);

  const pct = weeklySalesTarget > 0 ? Math.min((actual / weeklySalesTarget) * 100, 100) : 0;
  const reached = actual >= weeklySalesTarget && weeklySalesTarget > 0;

  const saveTarget = async () => {
    const val = Number(targetInput);
    if (!isNaN(val) && val > 0) {
      await setWeeklySalesTarget(val);
    } else {
      setTargetInput(String(weeklySalesTarget));
    }
    setEditingTarget(false);
  };

  const fillGradient = reached
    ? 'from-green-500 to-emerald-400'
    : theme === 'dark'
      ? 'from-violet-600 to-indigo-500'
      : 'from-indigo-500 to-indigo-400';

  const glowClass = theme === 'dark' && !reached
    ? 'shadow-[0_0_20px_rgba(139,92,246,0.5)]'
    : reached
      ? 'shadow-[0_0_20px_rgba(16,185,129,0.5)]'
      : '';

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-violet-600/10 dark:bg-violet-600/20 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-violet-600 dark:text-violet-400" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Weekly Sales vs. Target</h2>
        </div>
        {reached && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20">
            <Check className="w-3.5 h-3.5" /> Target Reached!
          </span>
        )}
      </div>

      {/* Labels */}
      <div className="flex items-end justify-between mb-3">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Current Progress</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {loading ? '—' : formatCurrency(actual, currencyCode, currencyDisplayMode)}
            <span className="text-base font-normal text-gray-400 dark:text-gray-500"> of </span>
            {editingTarget ? (
              <span className="inline-block">
                <input
                  ref={inputRef}
                  type="number"
                  value={targetInput}
                  onChange={(e) => setTargetInput(e.target.value)}
                  onBlur={saveTarget}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') saveTarget();
                    if (e.key === 'Escape') {
                      setTargetInput(String(weeklySalesTarget));
                      setEditingTarget(false);
                    }
                  }}
                  className="w-24 ml-1 px-1 py-0.5 text-base font-normal bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </span>
            ) : (
              <button
                onClick={() => setEditingTarget(true)}
                className="inline-flex items-center gap-1 text-base font-normal text-gray-400 dark:text-gray-500 hover:text-violet-600 dark:hover:text-violet-400 transition-colors"
                aria-label="Edit weekly sales target"
              >
                {formatCurrency(weeklySalesTarget, currencyCode, currencyDisplayMode)}
                <Target className="w-3.5 h-3.5" />
              </button>
            )}
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-500 dark:text-gray-400">Progress</p>
          <p className={`text-2xl font-bold ${reached ? 'text-green-600 dark:text-green-400' : 'text-violet-600 dark:text-violet-400'}`}>
            {loading ? '—' : `${pct.toFixed(0)}%`}
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="relative h-5 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
        <div
          className={`h-full bg-gradient-to-r ${fillGradient} rounded-full transition-all duration-700 ${glowClass}`}
          style={{ width: `${pct}%` }}
        />
        {/* Milestone marker at 100% */}
        <div className="absolute top-0 right-0 h-full w-0.5 bg-gray-400 dark:bg-gray-500 opacity-50" />
      </div>

      <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
        Auto-refreshes every 60 seconds and on new invoice updates
      </p>
    </div>
  );
}
