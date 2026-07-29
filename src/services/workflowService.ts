import { supabase, type WorkflowColumn, type WorkflowCard, type Contact, type Invoice, type Note, DEFAULT_WORKFLOW_COLUMNS } from '../lib/supabase';
import { getActiveWorkspaceId, tryGetActiveWorkspaceId } from '../lib/activeWorkspace';
import { logCardActivity } from './activityService';
import { ContactSchema, NoteSchema, WorkflowCardSchema, sanitizeText } from '../lib/validation';

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
  const validated = ContactSchema.parse(input);
  const wsId = getActiveWorkspaceId();
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData?.user?.id;
  if (!uid) throw new Error('Not authenticated');
  const { data, error } = await supabase
    .from('contacts')
    .insert({
      user_id: uid,
      workspace_id: wsId,
      name: validated.name,
      company: validated.company || null,
      email: validated.email || null,
      phone: validated.phone || null,
      status: validated.status || 'Lead',
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
  const validated = NoteSchema.parse({ contact_id: contactId, body });
  const wsId = getActiveWorkspaceId();
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData?.user?.id;
  if (!uid) throw new Error('Not authenticated');
  const { data, error } = await supabase
    .from('notes')
    .insert({ user_id: uid, workspace_id: wsId, contact_id: contactId, body: validated.body })
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
  const validated = WorkflowCardSchema.parse({
    title: input.title || 'Client',
    contact_id: input.contact_id,
    column_id: input.column_id,
    priority: input.priority || 'medium',
    status_note: input.status_note || null,
    due_date: input.due_date || null,
    assignee_name: input.assignee_name || null,
  });

  const wsId = getActiveWorkspaceId();
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData?.user?.id;
  if (!uid) throw new Error('Not authenticated');
  const { data: maxRow } = await supabase
    .from('workflow_cards')
    .select('position')
    .eq('column_id', validated.column_id)
    .order('position', { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextPosition = (maxRow?.position ?? -1) + 1;
  const { data: inserted, error } = await supabase.from('workflow_cards').insert({
    user_id: uid,
    workspace_id: wsId,
    column_id: validated.column_id,
    title: validated.title,
    contact_id: validated.contact_id,
    status_note: validated.status_note || null,
    due_date: validated.due_date || null,
    assignee_name: validated.assignee_name || null,
    priority: validated.priority,
    position: nextPosition,
    moved_at: input.moved_at ?? new Date().toISOString(),
  }).select('*').single();

  if (error) throw error;

  if (inserted) {
    await logCardActivity({
      card_id: inserted.id,
      contact_id: inserted.contact_id,
      type: 'stage_change',
      content: 'Card created in workflow',
    });
  }
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
  const sanitizedUpdates: WorkflowCardUpdate = { ...updates };
  if (sanitizedUpdates.title !== undefined) sanitizedUpdates.title = sanitizeText(sanitizedUpdates.title);
  if (sanitizedUpdates.status_note !== undefined && sanitizedUpdates.status_note !== null) {
    sanitizedUpdates.status_note = sanitizeText(sanitizedUpdates.status_note);
  }
  if (sanitizedUpdates.assignee_name !== undefined && sanitizedUpdates.assignee_name !== null) {
    sanitizedUpdates.assignee_name = sanitizeText(sanitizedUpdates.assignee_name);
  }

  // Fetch old card info to log specific field changes
  const { data: oldCard } = await supabase.from('workflow_cards').select('*').eq('id', cardId).maybeSingle();

  const { error } = await supabase.from('workflow_cards').update(sanitizedUpdates).eq('id', cardId);
  if (error) throw error;

  if (oldCard) {
    const contactId = updates.contact_id !== undefined ? updates.contact_id : oldCard.contact_id;

    if (updates.column_id && updates.column_id !== oldCard.column_id) {
      try {
        const columns = await getWorkflowColumns();
        const oldCol = columns.find((c) => c.id === oldCard.column_id)?.name || 'Previous Stage';
        const newCol = columns.find((c) => c.id === updates.column_id)?.name || 'New Stage';
        await logCardActivity({
          card_id: cardId,
          contact_id: contactId,
          type: 'stage_change',
          content: `Moved from ${oldCol} to ${newCol}`,
        });
      } catch {
        await logCardActivity({
          card_id: cardId,
          contact_id: contactId,
          type: 'stage_change',
          content: 'Moved to a new workflow stage',
        });
      }
    }

    if (updates.assignee_name !== undefined && updates.assignee_name !== oldCard.assignee_name) {
      const newAssignee = updates.assignee_name ? updates.assignee_name : 'Unassigned';
      await logCardActivity({
        card_id: cardId,
        contact_id: contactId,
        type: 'field_change',
        content: `Assignee changed to ${newAssignee}`,
      });
    }

    if (updates.priority !== undefined && updates.priority !== oldCard.priority) {
      await logCardActivity({
        card_id: cardId,
        contact_id: contactId,
        type: 'field_change',
        content: `Priority changed to ${updates.priority.toUpperCase()}`,
      });
    }

    if (updates.due_date !== undefined && updates.due_date !== oldCard.due_date) {
      const dateText = updates.due_date ? new Date(updates.due_date).toLocaleDateString() : 'No due date';
      await logCardActivity({
        card_id: cardId,
        contact_id: contactId,
        type: 'field_change',
        content: `Due date set to ${dateText}`,
      });
    }
  }
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

export async function autoResolveWorkflowCardForCustomer(customerNameOrId: string): Promise<boolean> {
  const wsId = tryGetActiveWorkspaceId();
  if (!wsId || !customerNameOrId) return false;

  try {
    const cols = await ensureWorkflowColumns();
    const resolvedCol = cols.find((c) => normalize(c.name) === 'resolvedcompleted' || normalize(c.name).includes('resolved'));
    if (!resolvedCol) return false;

    let targetContactId = customerNameOrId;
    const { data: contacts } = await supabase
      .from('contacts')
      .select('id, name')
      .eq('workspace_id', wsId);

    if (contacts && contacts.length > 0) {
      const match = contacts.find(
        (c) => c.id === customerNameOrId || c.name.toLowerCase().trim() === customerNameOrId.toLowerCase().trim()
      );
      if (match) {
        targetContactId = match.id;
      }
    }

    const { data: openCards } = await supabase
      .from('workflow_cards')
      .select('*')
      .eq('workspace_id', wsId)
      .eq('contact_id', targetContactId)
      .neq('column_id', resolvedCol.id)
      .order('moved_at', { ascending: false });

    if (!openCards || openCards.length === 0) return false;

    const targetCard = openCards[0];
    await updateWorkflowCard(targetCard.id, {
      column_id: resolvedCol.id,
      moved_at: new Date().toISOString(),
      status_note: targetCard.status_note
        ? `${targetCard.status_note} · Auto-resolved (Invoice Paid)`
        : 'Auto-resolved (Invoice Paid)',
    });

    return true;
  } catch (err) {
    console.error('Failed to auto-resolve workflow card:', err);
    return false;
  }
}

export async function createDefaultWorkflowCardForContact(
  contact: { id: string; name: string; company?: string | null },
  columnId?: string,
  priority: 'low' | 'medium' | 'high' = 'medium',
  statusNote?: string
): Promise<void> {
  const cols = await ensureWorkflowColumns();
  const targetColId = columnId || cols[0]?.id;
  if (!targetColId) return;

  const title = contact.company ? `${contact.name} (${contact.company})` : contact.name;
  await createWorkflowCard({
    title,
    contact_id: contact.id,
    priority,
    column_id: targetColId,
    status_note: statusNote || 'New lead registered in CRM',
    moved_at: new Date().toISOString(),
  });
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
