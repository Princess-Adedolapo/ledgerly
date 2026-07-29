import { useState } from 'react';
import { Modal, Button } from '../ui';
import { summarizeMeetingNotes, type MeetingSummaryResult } from '../../utils/dealAiInsights';
import { Sparkles, FileText, CheckCircle2, ChevronRight, Copy, Check, Calendar, ArrowRight } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import { saveContactFollowUp } from '../../utils/followUpMeta';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  contactId?: string;
  contactName?: string;
  initialNotes?: string;
  onSummaryGenerated?: (summary: MeetingSummaryResult) => void;
};

export function MeetingSummarizerModal({
  isOpen,
  onClose,
  contactId,
  contactName,
  initialNotes = '',
  onSummaryGenerated,
}: Props) {
  const [notesInput, setNotesInput] = useState(initialNotes);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<MeetingSummaryResult | null>(null);
  const [copied, setCopied] = useState(false);
  const { addToast } = useToast();

  const handleSummarize = async () => {
    if (!notesInput.trim()) {
      addToast('error', 'Text required', 'Please paste or type contact notes or meeting records to summarize.');
      return;
    }

    setLoading(true);
    try {
      const summaryResult = await summarizeMeetingNotes(notesInput, contactName);
      setResult(summaryResult);
      if (onSummaryGenerated) {
        onSummaryGenerated(summaryResult);
      }
      addToast('success', 'AI Summary Generated', 'Meeting highlights and key action items extracted!');
    } catch (err) {
      console.error('Failed to summarize meeting:', err);
      addToast('error', 'Summarization Error', 'Could not generate summary.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopySummary = () => {
    if (!result) return;
    const textToCopy = `📌 MEETING SUMMARY (${contactName || 'Client'})\n\nExecutive Summary:\n${result.summary}\n\nKey Highlights:\n${result.keyHighlights.map((h) => `• ${h}`).join('\n')}\n\nAction Items:\n${result.actionItems.map((a) => `• [ ] ${a.task}`).join('\n')}\n\nSuggested Next Step: ${result.suggestedNextStep}`;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    addToast('info', 'Copied to Clipboard', 'AI meeting summary ready to share or paste.');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAddActionAsFollowUp = (actionTask: string) => {
    if (!contactId) {
      addToast('info', 'Follow-up Task', 'Action item noted!');
      return;
    }
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 2);
    saveContactFollowUp(contactId, {
      dueDate: tomorrow.toISOString(),
      note: `AI Action Item: ${actionTask}`,
      completed: false,
    });
    window.dispatchEvent(new CustomEvent('workflow-card-updated'));
    addToast('success', 'Task Saved', `Created follow-up reminder for "${actionTask.slice(0, 30)}..."`);
  };

  const sentimentStyles: Record<string, string> = {
    Positive: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800',
    Neutral: 'bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300 border-blue-300 dark:border-blue-800',
    Hesitant: 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300 border-amber-300 dark:border-amber-800',
    Urgent: 'bg-purple-100 text-purple-800 dark:bg-purple-500/20 dark:text-purple-300 border-purple-300 dark:border-purple-800',
    Risk: 'bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-300 border-rose-300 dark:border-rose-800',
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Smart AI Meeting & Note Summarizer" maxWidth="max-w-2xl">
      <div className="space-y-4">
        {/* Top Intro */}
        <div className="p-3.5 rounded-xl bg-violet-500/10 border border-violet-200/60 dark:border-violet-800/50 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-violet-600 text-white flex items-center justify-center shrink-0 shadow-sm">
            <Sparkles className="w-5 h-5" />
          </div>
          <div className="text-xs">
            <h4 className="font-bold text-gray-900 dark:text-white">AI Note Highlights & Action Item Extractor</h4>
            <p className="text-gray-500 dark:text-gray-400">
              Instantly turn meeting transcripts, phone call logs, or long client notes into structured summaries.
            </p>
          </div>
        </div>

        {/* Input Text Area */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center justify-between">
            <span>Meeting Notes / Call Transcript text {contactName ? `for ${contactName}` : ''}:</span>
            {notesInput && (
              <button
                onClick={() => setNotesInput('')}
                className="text-violet-600 dark:text-violet-400 hover:underline text-[11px]"
              >
                Clear text
              </button>
            )}
          </label>
          <textarea
            rows={5}
            value={notesInput}
            onChange={(e) => setNotesInput(e.target.value)}
            placeholder="Paste meeting transcript, call notes, or client discussion details here... (e.g., 'Met with Sarah from Acme. She wants 20 licenses by next month, requested a 10% volume discount, and asked us to send a revised invoice by Friday.')"
            className="w-full p-3 text-xs bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 shadow-sm"
          />
        </div>

        <div className="flex justify-end">
          <Button
            onClick={handleSummarize}
            disabled={loading || !notesInput.trim()}
            className="bg-violet-600 hover:bg-violet-700 text-white gap-2 text-xs"
          >
            {loading ? (
              <>
                <Sparkles className="w-4 h-4 animate-spin" /> Analyzing notes...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" /> Generate AI Highlights
              </>
            )}
          </Button>
        </div>

        {/* Generated Summary Results */}
        {result && (
          <div className="pt-3 border-t border-gray-100 dark:border-gray-800 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                  AI Summary Output
                </span>
                <span
                  className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                    sentimentStyles[result.sentiment] || sentimentStyles.Positive
                  }`}
                >
                  Sentiment: {result.sentiment}
                </span>
              </div>
              <Button size="sm" variant="outline" onClick={handleCopySummary} className="gap-1.5 text-xs">
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied' : 'Copy Summary'}
              </Button>
            </div>

            {/* Executive Summary */}
            <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-gray-900/80 border border-gray-100 dark:border-gray-800">
              <h5 className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-violet-500" /> Executive Overview
              </h5>
              <p className="text-xs text-gray-800 dark:text-gray-200 leading-relaxed">{result.summary}</p>
            </div>

            {/* Key Highlights */}
            {result.keyHighlights && result.keyHighlights.length > 0 && (
              <div className="space-y-1.5">
                <h5 className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Discussion Highlights
                </h5>
                <ul className="space-y-1">
                  {result.keyHighlights.map((hl, i) => (
                    <li key={i} className="text-xs text-gray-700 dark:text-gray-300 flex items-start gap-2 bg-white dark:bg-gray-900 p-2 rounded-lg border border-gray-100 dark:border-gray-800">
                      <ChevronRight className="w-3.5 h-3.5 text-violet-500 shrink-0 mt-0.5" />
                      <span>{hl}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Action Items */}
            {result.actionItems && result.actionItems.length > 0 && (
              <div className="space-y-1.5">
                <h5 className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-amber-500" /> Extracted Action Items
                </h5>
                <div className="space-y-1.5">
                  {result.actionItems.map((act, i) => (
                    <div
                      key={i}
                      className="p-2.5 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 flex items-center justify-between gap-3"
                    >
                      <div className="text-xs space-y-0.5">
                        <p className="font-semibold text-gray-900 dark:text-white">{act.task}</p>
                        {act.owner && (
                          <span className="text-[10px] text-gray-500 dark:text-gray-400 block">
                            Assignee: {act.owner}
                          </span>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleAddActionAsFollowUp(act.task)}
                        className="text-[11px] h-7 px-2 shrink-0 gap-1 border-violet-200 dark:border-violet-800 text-violet-700 dark:text-violet-300 hover:bg-violet-50 dark:hover:bg-violet-950/40"
                      >
                        <Calendar className="w-3 h-3" /> Create Task
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Suggested Next Step */}
            {result.suggestedNextStep && (
              <div className="p-3 rounded-xl bg-violet-50/50 dark:bg-violet-950/30 border border-violet-200/50 dark:border-violet-800/40 text-xs flex items-center gap-2">
                <ArrowRight className="w-4 h-4 text-violet-600 shrink-0" />
                <div>
                  <strong className="text-violet-900 dark:text-violet-200 block">Recommended Next Step:</strong>
                  <span className="text-gray-700 dark:text-gray-300">{result.suggestedNextStep}</span>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end pt-2">
          <Button variant="outline" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </Modal>
  );
}
