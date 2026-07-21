import { supabase, type Invoice } from '../lib/supabase';
import { getActiveWorkspaceId, tryGetActiveWorkspaceId } from '../lib/activeWorkspace';

import { convertCurrency } from '../lib/exchangeRates';

export async function getInvoices(): Promise<Invoice[]> {
  const wsId = getActiveWorkspaceId();
  const { data, error } = await supabase
    .from('invoices')
    .select('*')
    .eq('workspace_id', wsId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as Invoice[];
}

export function getISOWeekRange(date = new Date()): { start: Date; end: Date } {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const start = new Date(d.setDate(diff));
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

export async function getPaidInvoicesThisWeek(): Promise<Invoice[]> {
  const wsId = tryGetActiveWorkspaceId();
  if (!wsId) return [];
  const { start, end } = getISOWeekRange();
  const { data, error } = await supabase
    .from('invoices')
    .select('*')
    .eq('workspace_id', wsId)
    .eq('status', 'paid')
    .gte('created_at', start.toISOString())
    .lte('created_at', end.toISOString());
  if (error) throw new Error(error.message);
  return (data ?? []) as Invoice[];
}

export async function getWeeklySalesActual(targetCurrency = 'USD'): Promise<number> {
  const invoices = await getPaidInvoicesThisWeek();
  return invoices.reduce((sum, inv) => {
    const originalCurrency = inv.currency_code || 'USD';
    return sum + convertCurrency(Number(inv.amount), originalCurrency, targetCurrency);
  }, 0);
}

export function subscribeToInvoices(callback: () => void) {
  return supabase
    .channel('invoices_changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'invoices' }, callback)
    .subscribe();
}
