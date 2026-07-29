import { supabase } from '../lib/supabase';
import { getActiveWorkspaceId, tryGetActiveWorkspaceId } from '../lib/activeWorkspace';

export type ActivityType = 'stage_change' | 'invoice_event' | 'message_sent' | 'note' | 'field_change';

export interface ActivityEntry {
  id: string;
  card_id?: string | null;
  contact_id?: string | null;
  workspace_id?: string | null;
  type: ActivityType;
  content: string;
  created_by?: string | null; // null or 'System' for automated events, or user display name
  created_at: string;
}

const LOCAL_STORAGE_KEY = 'card_activities_backup';

function getLocalActivities(): ActivityEntry[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as ActivityEntry[];
  } catch {
    return [];
  }
}

function saveLocalActivities(entries: ActivityEntry[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // Ignore storage quota errors
  }
}

export function formatRelativeTime(isoString: string): string {
  if (!isoString) return '';
  const date = new Date(isoString);
  const diffMs = Date.now() - date.getTime();
  if (isNaN(diffMs)) return '';

  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 30) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days}d ago`;

  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `${weeks}w ago`;

  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export async function getCardActivities(cardId?: string | null, contactId?: string | null): Promise<ActivityEntry[]> {
  const wsId = tryGetActiveWorkspaceId();
  const allActivities: ActivityEntry[] = [];
  const seenIds = new Set<string>();

  // 1. Try fetching from Supabase table `card_activities`
  if (wsId) {
    try {
      let query = supabase.from('card_activities').select('*').eq('workspace_id', wsId);
      
      if (cardId && contactId) {
        query = query.or(`card_id.eq.${cardId},contact_id.eq.${contactId}`);
      } else if (cardId) {
        query = query.eq('card_id', cardId);
      } else if (contactId) {
        query = query.eq('contact_id', contactId);
      } else {
        query = query.limit(0);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (!error && data) {
        for (const row of data) {
          const entry: ActivityEntry = {
            id: row.id,
            card_id: row.card_id,
            contact_id: row.contact_id,
            workspace_id: row.workspace_id,
            type: (row.type as ActivityType) || 'note',
            content: row.content || '',
            created_by: row.created_by ?? null,
            created_at: row.created_at || new Date().toISOString(),
          };
          if (!seenIds.has(entry.id)) {
            seenIds.add(entry.id);
            allActivities.push(entry);
          }
        }
      }
    } catch {
      // Table might not exist yet; fall through
    }

    // 2. Fetch existing `notes` table for contact_id to ensure backward compatibility
    if (contactId) {
      try {
        const { data: notesData } = await supabase
          .from('notes')
          .select('*')
          .eq('contact_id', contactId)
          .order('created_at', { ascending: false });

        if (notesData) {
          for (const n of notesData) {
            const noteId = `note-${n.id}`;
            if (!seenIds.has(noteId)) {
              seenIds.add(noteId);
              allActivities.push({
                id: noteId,
                card_id: cardId ?? null,
                contact_id: contactId,
                workspace_id: n.workspace_id,
                type: 'note',
                content: n.body,
                created_by: 'Team Member',
                created_at: n.created_at || new Date().toISOString(),
              });
            }
          }
        }
      } catch {
        // Ignore note fetch errors
      }
    }
  }

  // 3. Merge local backup entries
  const localEntries = getLocalActivities();
  for (const entry of localEntries) {
    const matchesCard = cardId && entry.card_id === cardId;
    const matchesContact = contactId && entry.contact_id === contactId;
    if ((matchesCard || matchesContact) && !seenIds.has(entry.id)) {
      seenIds.add(entry.id);
      allActivities.push(entry);
    }
  }

  // Sort newest first
  return allActivities.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export async function logCardActivity(input: {
  card_id?: string | null;
  contact_id?: string | null;
  type: ActivityType;
  content: string;
  created_by?: string | null;
}): Promise<ActivityEntry> {
  const wsId = tryGetActiveWorkspaceId() || getActiveWorkspaceId();
  let currentUserName: string | null = input.created_by ?? null;

  if (currentUserName === undefined) {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (userData?.user?.email) {
        currentUserName = userData.user.email.split('@')[0];
      }
    } catch {
      currentUserName = null;
    }
  }

  const newEntry: ActivityEntry = {
    id: `act-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    card_id: input.card_id ?? null,
    contact_id: input.contact_id ?? null,
    workspace_id: wsId,
    type: input.type,
    content: input.content.trim(),
    created_by: currentUserName,
    created_at: new Date().toISOString(),
  };

  // 1. Save to local storage backup immediately for instant UI reliability
  const local = getLocalActivities();
  saveLocalActivities([newEntry, ...local]);

  // 2. Try inserting into Supabase `card_activities`
  try {
    const { data: { user } } = await supabase.auth.getUser();
    const payload = {
      id: newEntry.id,
      card_id: newEntry.card_id,
      contact_id: newEntry.contact_id,
      workspace_id: wsId,
      type: newEntry.type,
      activity_type: newEntry.type,
      content: newEntry.content,
      details: newEntry.content,
      created_by: newEntry.created_by,
      created_at: newEntry.created_at,
      user_id: user?.id ?? null,
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('card_activities' as any) as any).insert(payload);
    if (error) {
      console.warn('Supabase card_activities insert error (using fallback):', error.message);
    }
  } catch (err) {
    console.warn('Could not insert to card_activities table directly:', err);
  }

  // 3. If type is 'note' and we have contact_id, also insert into `notes` table for backward compatibility
  if (input.type === 'note' && input.contact_id && wsId) {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (userData?.user) {
        await supabase.from('notes').insert({
          user_id: userData.user.id,
          workspace_id: wsId,
          contact_id: input.contact_id,
          body: input.content.trim(),
        });
      }
    } catch {
      // Ignore note insert errors
    }
  }

  return newEntry;
}
