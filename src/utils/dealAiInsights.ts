import type { WorkflowCard, WorkflowColumn } from '../lib/supabase';

export type WinProbabilityResult = {
  score: number; // 0 to 100
  label: 'Critical' | 'Low' | 'Moderate' | 'High' | 'Very High' | 'Won' | 'Lost';
  colorClass: string;
  bgClass: string;
  badgeClass: string;
  ageDays: number;
  stageBase: number;
  ageAdjustment: number;
  priorityAdjustment: number;
  factors: string[];
};

export function calculateDealWinProbability(
  card: WorkflowCard,
  column?: (WorkflowColumn & { column_type?: string }) | null,
  allColumns?: Array<{ id: string; position: number; column_type?: string; name?: string }>
): WinProbabilityResult {
  const colType = column?.column_type;
  const colName = (column?.name ?? '').trim().toLowerCase();

  // 1. Handle won column
  if (
    colType === 'won' ||
    colName.includes('resolved') ||
    colName.includes('completed') ||
    colName.includes('won') ||
    colName.includes('closed won') ||
    colName.includes('paid')
  ) {
    return {
      score: 100,
      label: 'Won',
      colorClass: 'text-emerald-600 dark:text-emerald-400',
      bgClass: 'bg-emerald-500',
      badgeClass: 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
      ageDays: 0,
      stageBase: 100,
      ageAdjustment: 0,
      priorityAdjustment: 0,
      factors: ['Deal completed / stage won (100% win rate).'],
    };
  }

  // 2. Handle lost column
  if (
    colType === 'lost' ||
    colName.includes('lost') ||
    colName.includes('cancelled') ||
    colName.includes('declined') ||
    colName.includes('archived')
  ) {
    return {
      score: 0,
      label: 'Lost',
      colorClass: 'text-rose-600 dark:text-rose-400',
      bgClass: 'bg-rose-500',
      badgeClass: 'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800',
      ageDays: 0,
      stageBase: 0,
      ageAdjustment: 0,
      priorityAdjustment: 0,
      factors: ['Deal closed as lost or cancelled.'],
    };
  }

  // 3. Open columns: Auto-calculated scaled by position / number of open columns
  let stageScore = 50;
  if (allColumns && allColumns.length > 0) {
    const openCols = allColumns
      .filter((c) => c.column_type !== 'won' && c.column_type !== 'lost')
      .sort((a, b) => a.position - b.position);
    const numOpen = Math.max(1, openCols.length);
    const colIdx = openCols.findIndex((c) => c.id === column?.id);
    const effectiveIdx = colIdx >= 0 ? colIdx : Math.min(column?.position ?? 0, numOpen - 1);
    // position / (numOpen + 1) scaled so first column starts around 20-25% and last open column nears 75-80%
    stageScore = Math.round(((effectiveIdx + 1) / (numOpen + 1)) * 100);
  } else {
    if (colName.includes('lead') || colName.includes('new') || colName.includes('inquiry')) {
      stageScore = 25;
    } else if (colName.includes('contacted') || colName.includes('proposal') || colName.includes('sent')) {
      stageScore = 50;
    } else if (colName.includes('progress') || colName.includes('negotiation')) {
      stageScore = 75;
    }
  }

  const score = Math.min(95, Math.max(5, stageScore));

  let label: WinProbabilityResult['label'] = 'Moderate';
  let colorClass = 'text-violet-600 dark:text-violet-400';
  let bgClass = 'bg-violet-500';
  let badgeClass = 'bg-violet-100 dark:bg-violet-500/20 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-800';

  if (score < 35) {
    label = 'Low';
    colorClass = 'text-amber-600 dark:text-amber-400';
    bgClass = 'bg-amber-500';
    badgeClass = 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800';
  } else if (score >= 70) {
    label = 'High';
    colorClass = 'text-emerald-600 dark:text-emerald-400';
    bgClass = 'bg-emerald-500';
    badgeClass = 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
  }

  return {
    score,
    label,
    colorClass,
    bgClass,
    badgeClass,
    ageDays: 0,
    stageBase: score,
    ageAdjustment: 0,
    priorityAdjustment: 0,
    factors: [`Position-scaled probability: ${score}% in ${column?.name || 'pipeline stage'}`],
  };
}

export type MeetingSummaryResult = {
  summary: string;
  keyHighlights: string[];
  actionItems: { task: string; owner?: string; dueDate?: string }[];
  sentiment: 'Positive' | 'Neutral' | 'Hesitant' | 'Urgent' | 'Risk';
  suggestedNextStep: string;
};

export async function summarizeMeetingNotes(
  notes: string,
  contactName?: string
): Promise<MeetingSummaryResult> {
  try {
    const res = await fetch('/api/ai/summarize-meeting', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes, contactName }),
    });

    if (!res.ok) {
      throw new Error(`Server returned ${res.status}`);
    }

    const data = await res.json();
    return data;
  } catch (err) {
    console.warn('Falling back to local meeting summarizer heuristic:', err);
    const lines = notes.split('\n').map((l) => l.trim()).filter(Boolean);
    const firstLine = lines[0] || 'Meeting interaction recorded.';
    return {
      summary: `Summary for ${contactName || 'Client'}: ${firstLine.slice(0, 160)}...`,
      keyHighlights: lines.slice(0, 4).map((l) => l.replace(/^[-*•]\s*/, '')),
      actionItems: [
        { task: 'Send follow-up email confirming discussion points', owner: 'Sales Representative' },
        { task: 'Review proposal requirements with account manager', owner: 'Operations' },
      ],
      sentiment: 'Positive',
      suggestedNextStep: 'Schedule a follow-up review call within 3-5 business days.',
    };
  }
}

export async function fetchDealAiInsights(
  dealName: string,
  stage: string,
  ageDays: number,
  priority: string,
  winProbability: number,
  notes?: string
): Promise<string[]> {
  try {
    const res = await fetch('/api/ai/deal-insights', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dealName, stage, ageDays, priority, winProbability, notes }),
    });

    if (!res.ok) {
      throw new Error(`Server returned ${res.status}`);
    }

    const data = await res.json();
    return data.recommendations || [];
  } catch (err) {
    console.warn('Falling back to local deal insight generator:', err);
    const recs: string[] = [];
    if (ageDays > 25) {
      recs.push(`Deal age (${ageDays} days) is slowing velocity. Schedule a decision-maker alignment call.`);
    } else {
      recs.push(`Healthy stage momentum at ${winProbability}% probability. Confirm technical and contract timelines.`);
    }

    if (priority === 'high') {
      recs.push('High priority deal: prepare a tailored pitch outline or ROI summary sheet.');
    } else {
      recs.push('Send a follow-up reminder email with clear call-to-action details.');
    }

    recs.push('Verify budget availability and sign-off authority for next stage transition.');
    return recs;
  }
}
