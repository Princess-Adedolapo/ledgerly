import { supabase, type WorkflowColumn, type WorkflowCard, type Contact, type Invoice, type Note, DEFAULT_WORKFLOW_COLUMNS } from '../lib/supabase';
import { getActiveWorkspaceId, tryGetActiveWorkspaceId } from '../lib/activeWorkspace';

const normalize = (s: string) => s.toLowerCase().replace(/[\s/]+/g, '');

export async function getWorkflowColumns(): Promise<WorkflowColumn[]> {
  const wsId = tryGetActiveWorkspaceId();
  if (!wsId) return [];
  const { data, error } = await supabase
    .from('workflow_columns')
    .select('*')
    .eq('workspace_id', wsId)
    .order('position', { ascending: true });
  if (error) throw error;
  return (data ?? []) as WorkflowColumn[];
}

export async function ensureWorkflowColumns(): Promise<WorkflowColumn[]> {
  const wsId = getActiveWorkspaceId();
  const existing = await getWorkflowColumns();
  const required = DEFAULT_WORKFLOW_COLUMNS;
  const usedIds = new Set<string>();
  const finalCols: WorkflowColumn[] = [];

  for (let i = 0; i < required.length; i++) {
    const name = required[i];
    const key = normalize(name);
    const match = existing.find((c) => !usedIds.has(c.id) && normalize(c.name) === key);
    if (match) {
      usedIds.add(match.id);
      if (match.name !== name || match.position !== i) {
        const { data, error } = await supabase
          .from('workflow_columns')
          .update({ name, position: i })
          .eq('id', match.id)
          .select('*')
          .single();
        if (error) throw error;
        finalCols.push(data as WorkflowColumn);
      } else {
        finalCols.push(match);
      }
    } else {
      const { data, error } = await supabase
        .from('workflow_columns')
        .insert({ name, position: i, workspace_id: wsId })
        .select('*')
        .single();
      if (error) throw error;
      finalCols.push(data as WorkflowColumn);
    }
  }

  const orphans = existing.filter((c) => !usedIds.has(c.id));
  if (orphans.length > 0) {
    const fallback = finalCols[0].id;
    for (const o of orphans) {
      await supabase.from('workflow_cards').update({ column_id: fallback }).eq('column_id', o.id);
      await supabase.from('workflow_columns').delete().eq('id', o.id);
    }
  }

  return finalCols.sort((a, b) => a.position - b.position);
}

export async function getWorkflowCards(): Promise<WorkflowCard[]> {
  const wsId = tryGetActiveWorkspaceId();
  if (!wsId) return [];
  const { data, error } = await supabase
    .from('workflow_cards')
    .select('*')
    .eq('workspace_id', wsId)
    .order('position', { ascending: true });
  if (error) throw error;
  return (data ?? []) as WorkflowCard[];
}

export async function getContacts(): Promise<Contact[]> {
  const wsId = tryGetActiveWorkspaceId();
  if (!wsId) return [];
  const { data, error } = await supabase
    .from('contacts')
    .select('*')
    .eq('workspace_id', wsId)
    .order('name', { ascending: true });
  if (error) throw error;
  return (data ?? []) as Contact[];
}

export async function createContact(input: {
  name: string;
  company?: string | null;
  email?: string | null;
  phone?: string | null;
  status?: string;
}): Promise<Contact> {
  const wsId = getActiveWorkspaceId();
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) throw new Error('Not authenticated');
  const { data, error } = await supabase
    .from('contacts')
    .insert({
      user_id: uid,
      workspace_id: wsId,
      name: input.name.trim(),
      company: input.company?.trim() || null,
      email: input.email?.trim() || null,
      phone: input.phone?.trim() || null,
      status: input.status || 'Lead',
    })
    .select('*')
    .single();
  if (error) throw error;
  return data as Contact;
}

export async function getInvoicesForContact(contact: Contact): Promise<Invoice[]> {
  if (!contact.name) return [];
  const wsId = tryGetActiveWorkspaceId();
  if (!wsId) return [];
  const { data, error } = await supabase
    .from('invoices')
    .select('*')
    .eq('workspace_id', wsId)
    .eq('customer_name', contact.name)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Invoice[];
}

export async function getNotesForContact(contactId: string): Promise<Note[]> {
  const { data, error } = await supabase
    .from('notes')
    .select('*')
    .eq('contact_id', contactId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Note[];
}

export async function addNoteForContact(contactId: string, body: string): Promise<Note> {
  const wsId = getActiveWorkspaceId();
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) throw new Error('Not authenticated');
  const { data, error } = await supabase
    .from('notes')
    .insert({ user_id: uid, workspace_id: wsId, contact_id: contactId, body: body.trim() })
    .select('*')
    .single();
  if (error) throw error;
  return data as Note;
}

export type WorkflowCardInput = {
  title?: string;
  contact_id: string;
  status_note?: string | null;
  due_date?: string | null;
  assignee_name?: string | null;
  priority: 'low' | 'medium' | 'high';
  column_id: string;
  moved_at?: string;
};

export async function createWorkflowCard(input: WorkflowCardInput): Promise<void> {
  const wsId = getActiveWorkspaceId();
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) throw new Error('Not authenticated');
  const { data: maxRow } = await supabase
    .from('workflow_cards')
    .select('position')
    .eq('column_id', input.column_id)
    .order('position', { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextPosition = (maxRow?.position ?? -1) + 1;
  const { error } = await supabase.from('workflow_cards').insert({
    user_id: uid,
    workspace_id: wsId,
    column_id: input.column_id,
    title: (input.title ?? '').trim() || 'Client',
    contact_id: input.contact_id,
    status_note: input.status_note?.trim() || null,
    due_date: input.due_date || null,
    assignee_name: input.assignee_name?.trim() || null,
    priority: input.priority,
    position: nextPosition,
    moved_at: input.moved_at ?? new Date().toISOString(),
  });
  if (error) throw error;
}


export type WorkflowCardUpdate = Partial<{
  title: string;
  contact_id: string | null;
  status_note: string | null;
  due_date: string | null;
  assignee_name: string | null;
  priority: 'low' | 'medium' | 'high';
  column_id: string;
  moved_at: string;
}>;

export async function updateWorkflowCard(cardId: string, updates: WorkflowCardUpdate): Promise<void> {
  const { error } = await supabase.from('workflow_cards').update(updates).eq('id', cardId);
  if (error) throw error;
}

export async function deleteWorkflowCard(cardId: string): Promise<void> {
  const { error } = await supabase.from('workflow_cards').delete().eq('id', cardId);
  if (error) throw error;
}

export async function updateColumnName(columnId: string, name: string): Promise<void> {
  const { error } = await supabase.from('workflow_columns').update({ name }).eq('id', columnId);
  if (error) throw error;
}

export async function reorderColumns(columns: WorkflowColumn[]): Promise<void> {
  const updates = columns.map((col, i) =>
    supabase.from('workflow_columns').update({ position: i }).eq('id', col.id)
  );
  const results = await Promise.all(updates);
  for (const r of results) {
    if (r.error) throw r.error;
  }
}

export function subscribeToWorkflowColumns(callback: () => void) {
  return supabase
    .channel('workflow_columns_changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'workflow_columns' }, callback)
    .subscribe();
}

export function subscribeToWorkflowCards(callback: () => void) {
  return supabase
    .channel('workflow_cards_changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'workflow_cards' }, callback)
    .subscribe();
}
