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
  column?: WorkflowColumn | null
): WinProbabilityResult {
  const colName = (column?.name ?? '').trim().toLowerCase();

  // Handle closed won or closed lost
  if (
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

  if (
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

  // 1. Base stage probability
  let stageBase = 35;
  if (colName.includes('lead') || colName.includes('new') || colName.includes('inquiry')) {
    stageBase = 20;
  } else if (colName.includes('contacted') || colName.includes('outreach') || colName.includes('qualification')) {
    stageBase = 35;
  } else if (colName.includes('proposal') || colName.includes('pitch') || colName.includes('demo') || colName.includes('estimate')) {
    stageBase = 55;
  } else if (colName.includes('negotiation') || colName.includes('contract') || colName.includes('review')) {
    stageBase = 75;
  } else if (colName.includes('closing') || colName.includes('verbal') || colName.includes('signing')) {
    stageBase = 90;
  }

  // 2. Deal age calculation
  const referenceTime = card.moved_at ? new Date(card.moved_at).getTime() : new Date(card.created_at).getTime();
  const now = Date.now();
  const ageDays = Math.max(0, Math.floor((now - referenceTime) / (1000 * 60 * 60 * 24)));

  let ageAdjustment = 0;
  const factors: string[] = [];

  if (ageDays <= 5) {
    ageAdjustment = 5;
    factors.push('Fresh deal momentum (+5% age boost)');
  } else if (ageDays <= 21) {
    ageAdjustment = 0;
    factors.push('Optimal stage cycle duration');
  } else if (ageDays <= 45) {
    ageAdjustment = -10;
    factors.push(`Aging deal (${ageDays} days in stage, -10% penalty)`);
  } else {
    ageAdjustment = -25;
    factors.push(`Stale deal (${ageDays} days in stage, -25% penalty)`);
  }

  // 3. Priority adjustment
  let priorityAdjustment = 0;
  if (card.priority === 'high') {
    priorityAdjustment = 5;
    factors.push('High priority deal (+5%)');
  } else if (card.priority === 'low') {
    priorityAdjustment = -5;
    factors.push('Low priority attention (-5%)');
  }

  // 4. Calculate total & clamp (5% - 95%)
  let score = Math.round(stageBase + ageAdjustment + priorityAdjustment);
  score = Math.max(5, Math.min(95, score));

  // Determine badge styling & label
  let label: WinProbabilityResult['label'] = 'Moderate';
  let colorClass = 'text-amber-600 dark:text-amber-400';
  let bgClass = 'bg-amber-500';
  let badgeClass = 'bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800';

  if (score >= 80) {
    label = 'Very High';
    colorClass = 'text-emerald-600 dark:text-emerald-400';
    bgClass = 'bg-emerald-500';
    badgeClass = 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
  } else if (score >= 60) {
    label = 'High';
    colorClass = 'text-teal-600 dark:text-teal-400';
    bgClass = 'bg-teal-500';
    badgeClass = 'bg-teal-50 dark:bg-teal-500/15 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800';
  } else if (score >= 40) {
    label = 'Moderate';
    colorClass = 'text-amber-600 dark:text-amber-400';
    bgClass = 'bg-amber-500';
    badgeClass = 'bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800';
  } else if (score >= 25) {
    label = 'Low';
    colorClass = 'text-orange-600 dark:text-orange-400';
    bgClass = 'bg-orange-500';
    badgeClass = 'bg-orange-50 dark:bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800';
  } else {
    label = 'Critical';
    colorClass = 'text-rose-600 dark:text-rose-400';
    bgClass = 'bg-rose-500';
    badgeClass = 'bg-rose-50 dark:bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800';
  }

  return {
    score,
    label,
    colorClass,
    bgClass,
    badgeClass,
    ageDays,
    stageBase,
    ageAdjustment,
    priorityAdjustment,
    factors,
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
