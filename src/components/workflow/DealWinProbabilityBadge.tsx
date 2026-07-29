import { useState } from 'react';
import { calculateDealWinProbability, fetchDealAiInsights, type WinProbabilityResult } from '../../utils/dealAiInsights';
import type { WorkflowCard, WorkflowColumn } from '../../lib/supabase';
import { TrendingUp, Sparkles, CheckCircle2, ChevronRight, RefreshCw, Layers } from 'lucide-react';
import { Modal, Button } from '../ui';

type Props = {
  card: WorkflowCard;
  column?: WorkflowColumn | null;
  size?: 'sm' | 'md' | 'lg';
  showDetailsOnClick?: boolean;
};

export function DealWinProbabilityBadge({ card, column, size = 'sm', showDetailsOnClick = true }: Props) {
  const result: WinProbabilityResult = calculateDealWinProbability(card, column);
  const [modalOpen, setModalOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiRecommendations, setAiRecommendations] = useState<string[] | null>(null);

  const dealName = card.status_note || 'Sales Deal';

  const handleOpenModal = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!showDetailsOnClick) return;
    setModalOpen(true);
    if (!aiRecommendations) {
      loadAiRecommendations();
    }
  };

  const loadAiRecommendations = async () => {
    setAiLoading(true);
    try {
      const recs = await fetchDealAiInsights(
        dealName,
        column?.name || 'In Pipeline',
        result.ageDays,
        card.priority,
        result.score,
        card.status_note || ''
      );
      setAiRecommendations(recs);
    } catch (err) {
      console.error('Failed to load AI recommendations:', err);
    } finally {
      setAiLoading(false);
    }
  };

  const sizeClasses = {
    sm: 'text-[11px] px-2 py-0.5 rounded-full font-semibold',
    md: 'text-xs px-2.5 py-1 rounded-lg font-semibold',
    lg: 'text-sm px-3.5 py-1.5 rounded-xl font-bold',
  }[size];

  return (
    <>
      <button
        type="button"
        onClick={handleOpenModal}
        className={`inline-flex items-center gap-1.5 border shadow-2xs transition-all hover:scale-105 ${result.badgeClass} ${sizeClasses}`}
        title={`Deal Win Probability: ${result.score}% (${result.label}). Click for AI Insights.`}
      >
        <TrendingUp className="w-3 h-3 opacity-90" />
        <span>{result.score}% Win</span>
      </button>

      {modalOpen && (
        <Modal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          title="Smart AI Deal Win Probability & Insights"
          maxWidth="max-w-xl"
        >
          <div className="space-[#12] space-y-5">
            {/* Probability Score Visual Header */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-violet-500/10 via-purple-500/5 to-indigo-500/10 border border-violet-200/50 dark:border-violet-800/50 relative overflow-hidden">
              <div className="flex items-center justify-between relative z-10">
                <div>
                  <span className="text-xs font-semibold text-violet-600 dark:text-violet-400 uppercase tracking-wider flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" /> AI Predictive Sales Model
                  </span>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mt-1">
                    {dealName}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Stage: <strong className="text-gray-800 dark:text-gray-200">{column?.name || 'In Pipeline'}</strong> • Age in stage:{' '}
                    <strong className="text-gray-800 dark:text-gray-200">{result.ageDays} days</strong>
                  </p>
                </div>

                <div className="text-right flex flex-col items-end">
                  <div className={`text-3xl font-extrabold ${result.colorClass} flex items-center gap-1`}>
                    {result.score}%
                  </div>
                  <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full mt-1 border ${result.badgeClass}`}>
                    {result.label} Likelihood
                  </span>
                </div>
              </div>

              {/* Progress Bar Gauge */}
              <div className="w-full bg-gray-200 dark:bg-gray-800 h-2.5 rounded-full overflow-hidden mt-4">
                <div
                  className={`h-full transition-all duration-500 ${result.bgClass}`}
                  style={{ width: `${result.score}%` }}
                />
              </div>
            </div>

            {/* Score Factors & Drivers */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-violet-500" /> Probability Calculation Drivers
              </h4>
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-gray-900/60 border border-gray-100 dark:border-gray-800">
                  <span className="text-gray-500 dark:text-gray-400 block text-[10px] font-medium">Stage Base</span>
                  <strong className="text-sm font-bold text-gray-900 dark:text-white">{result.stageBase}%</strong>
                </div>
                <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-gray-900/60 border border-gray-100 dark:border-gray-800">
                  <span className="text-gray-500 dark:text-gray-400 block text-[10px] font-medium">Age Factor</span>
                  <strong
                    className={`text-sm font-bold ${
                      result.ageAdjustment < 0
                        ? 'text-rose-600 dark:text-rose-400'
                        : result.ageAdjustment > 0
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {result.ageAdjustment > 0 ? `+${result.ageAdjustment}%` : `${result.ageAdjustment}%`}
                  </strong>
                </div>
                <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-gray-900/60 border border-gray-100 dark:border-gray-800">
                  <span className="text-gray-500 dark:text-gray-400 block text-[10px] font-medium">Priority Boost</span>
                  <strong
                    className={`text-sm font-bold ${
                      result.priorityAdjustment < 0
                        ? 'text-rose-600 dark:text-rose-400'
                        : result.priorityAdjustment > 0
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {result.priorityAdjustment > 0
                      ? `+${result.priorityAdjustment}%`
                      : `${result.priorityAdjustment}%`}
                  </strong>
                </div>
              </div>

              <ul className="space-y-1.5 mt-2">
                {result.factors.map((f, i) => (
                  <li key={i} className="text-xs text-gray-600 dark:text-gray-300 flex items-start gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-violet-500 shrink-0 mt-0.5" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Smart AI Sales Recommendations */}
            <div className="p-4 rounded-xl bg-violet-50/50 dark:bg-violet-950/20 border border-violet-100 dark:border-violet-900/40 space-y-2.5">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-violet-700 dark:text-violet-300 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                  AI Recommended Action Steps
                </h4>
                <button
                  onClick={loadAiRecommendations}
                  disabled={aiLoading}
                  className="text-xs text-violet-600 dark:text-violet-400 hover:underline flex items-center gap-1 disabled:opacity-50"
                >
                  <RefreshCw className={`w-3 h-3 ${aiLoading ? 'animate-spin' : ''}`} /> Re-analyze
                </button>
              </div>

              {aiLoading ? (
                <div className="p-4 text-center text-xs text-gray-500 dark:text-gray-400 flex items-center justify-center gap-2">
                  <Sparkles className="w-4 h-4 animate-spin text-violet-500" />
                  Generating AI insights...
                </div>
              ) : aiRecommendations && aiRecommendations.length > 0 ? (
                <ul className="space-y-2">
                  {aiRecommendations.map((rec, idx) => (
                    <li key={idx} className="text-xs text-gray-800 dark:text-gray-200 flex items-start gap-2 bg-white dark:bg-gray-900 p-2.5 rounded-lg border border-violet-100 dark:border-violet-900/30">
                      <ChevronRight className="w-3.5 h-3.5 text-violet-500 shrink-0 mt-0.5" />
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  No AI recommendations available currently.
                </p>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="outline" onClick={() => setModalOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
