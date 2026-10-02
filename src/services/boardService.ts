import { supabase, type Board, type BoardColumn, type ColumnType, type WorkflowCard } from '../lib/supabase';
import { tryGetActiveWorkspaceId } from '../lib/activeWorkspace';

export const MAX_BOARDS_PER_USER = 10;
export const MAX_COLUMNS_PER_BOARD = 8;
export const MIN_COLUMNS_PER_BOARD = 1;

export const BRAND_COLORS = [
  { id: 'amber', name: 'Amber Gold', hex: '#F59E0B', bg: 'bg-amber-500/15', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-500/30' },
  { id: 'violet', name: 'Royal Violet', hex: '#8B5CF6', bg: 'bg-violet-500/15', text: 'text-violet-600 dark:text-violet-400', border: 'border-violet-500/30' },
  { id: 'blue', name: 'Cobalt Blue', hex: '#3B82F6', bg: 'bg-blue-500/15', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-500/30' },
  { id: 'emerald', name: 'Fresh Emerald', hex: '#10B981', bg: 'bg-emerald-500/15', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-500/30' },
  { id: 'sky', name: 'Sky Cyan', hex: '#0EA5E9', bg: 'bg-sky-500/15', text: 'text-sky-600 dark:text-sky-400', border: 'border-sky-500/30' },
  { id: 'indigo', name: 'Deep Indigo', hex: '#6366F1', bg: 'bg-indigo-500/15', text: 'text-indigo-600 dark:text-indigo-400', border: 'border-indigo-500/30' },
  { id: 'rose', name: 'Crimson Rose', hex: '#F43F5E', bg: 'bg-rose-500/15', text: 'text-rose-600 dark:text-rose-400', border: 'border-rose-500/30' },
  { id: 'slate', name: 'Obsidian Slate', hex: '#64748B', bg: 'bg-slate-500/15', text: 'text-slate-600 dark:text-slate-400', border: 'border-slate-500/30' },
] as const;

export type BoardTemplateKey = 'default' | 'sales' | 'freelance' | 'orders' | 'blank';

export type BoardTemplate = {
  key: BoardTemplateKey;
  name: string;
  description: string;
  columns: Array<{
    name: string;
    description: string;
    color: string;
    column_type: ColumnType;
  }>;
};

export const BOARD_TEMPLATES: Record<BoardTemplateKey, BoardTemplate> = {
  default: {
    key: 'default',
    name: 'Main Pipeline',
    description: 'The standard CRM workflow stages for deals and leads',
    columns: [
      { name: 'Lead Inflow', description: 'New leads & inquiries', color: 'amber', column_type: 'open' },
      { name: 'Proposal Sent', description: 'Quoted / Pending review', color: 'violet', column_type: 'open' },
      { name: 'In Progress', description: 'Active deliverables & ongoing work', color: 'blue', column_type: 'open' },
      { name: 'Paid & Closed', description: 'Settled invoices & completed projects', color: 'emerald', column_type: 'won' },
    ],
  },
  sales: {
    key: 'sales',
    name: 'Sales Pipeline',
    description: 'Lead qualification, negotiation and closing pipeline',
    columns: [
      { name: 'Lead', description: 'New prospective deals', color: 'amber', column_type: 'open' },
      { name: 'Contacted', description: 'Initial outreach & qualification', color: 'sky', column_type: 'open' },
      { name: 'Proposal Sent', description: 'Pitch & estimate submitted', color: 'violet', column_type: 'open' },
      { name: 'Negotiation', description: 'Contract review & pricing discussions', color: 'indigo', column_type: 'open' },
      { name: 'Won', description: 'Deal signed & closed successfully', color: 'emerald', column_type: 'won' },
      { name: 'Lost', description: 'Deal passed or rejected', color: 'rose', column_type: 'lost' },
    ],
  },
  freelance: {
    key: 'freelance',
    name: 'Freelance Projects',
    description: 'Client project flow from initial inquiry to final payment',
    columns: [
      { name: 'Inquiry', description: 'Client request & project scope', color: 'amber', column_type: 'open' },
      { name: 'Quoted', description: 'Proposal & estimate delivered', color: 'violet', column_type: 'open' },
      { name: 'In Progress', description: 'Active project execution', color: 'blue', column_type: 'open' },
      { name: 'Delivered', description: 'Final deliverable under client review', color: 'cyan', column_type: 'open' },
      { name: 'Paid', description: 'Invoice settled & project completed', color: 'emerald', column_type: 'won' },
    ],
  },
  orders: {
    key: 'orders',
    name: 'Order Fulfilment',
    description: 'E-commerce and physical product fulfilment cycle',
    columns: [
      { name: 'New Order', description: 'Order created & payment verified', color: 'amber', column_type: 'open' },
      { name: 'Confirmed', description: 'Order acknowledged & queued', color: 'sky', column_type: 'open' },
      { name: 'Processing', description: 'Packing goods & preparations', color: 'violet', column_type: 'open' },
      { name: 'Shipped', description: 'In transit with delivery carrier', color: 'indigo', column_type: 'open' },
      { name: 'Delivered', description: 'Package safely delivered', color: 'cyan', column_type: 'open' },
      { name: 'Paid', description: 'Payment settled & closed', color: 'emerald', column_type: 'won' },
    ],
  },
  blank: {
    key: 'blank',
    name: 'Blank Board',
    description: 'Start with a clean slate and configure custom columns',
    columns: [
      { name: 'To Do', description: 'Pending queue & items', color: 'violet', column_type: 'open' },
      { name: 'In Progress', description: 'Work underway', color: 'blue', column_type: 'open' },
      { name: 'Done', description: 'Finished and approved', color: 'emerald', column_type: 'won' },
    ],
  },
};

/**
 * Local fallback storage keys if database tables haven't been run yet
 */
function getLocalBoardsKey(userId: string) {
  return `ledgerly_boards_${userId}`;
}
function getLocalColumnsKey(userId: string, boardId: string) {
  return `ledgerly_columns_${userId}_${boardId}`;
}

export function broadcastWorkflowUpdate(boardId?: string) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('workflow_board_updated', {
        detail: { boardId, timestamp: Date.now() },
      })
    );
  }
}

export function subscribeToWorkflowUpdates(
  callback: (payload?: { boardId?: string; timestamp?: number }) => void
): () => void {
  const handleCustomEvent = (e: Event) => {
    callback((e as CustomEvent).detail);
  };
  const handleStorageEvent = (e: StorageEvent) => {
    if (e.key?.includes('workflow') || e.key?.includes('board')) {
      callback();
    }
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('workflow_board_updated', handleCustomEvent);
    window.addEventListener('storage', handleStorageEvent);
  }

  const channel = supabase
    .channel('workflow_realtime_sync')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'workflow_cards' }, () => callback())
    .on('postgres_changes', { event: '*', schema: 'public', table: 'board_columns' }, () => callback())
    .on('postgres_changes', { event: '*', schema: 'public', table: 'boards' }, () => callback())
    .on('postgres_changes', { event: '*', schema: 'public', table: 'workflow_columns' }, () => callback())
    .subscribe();

  return () => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('workflow_board_updated', handleCustomEvent);
      window.removeEventListener('storage', handleStorageEvent);
    }
    supabase.removeChannel(channel);
  };
}

export async function getAuthUserId(): Promise<string> {
  const { data: sessionData } = await supabase.auth.getSession();
  if (sessionData?.session?.user?.id) return sessionData.session.user.id;
  const { data: userData } = await supabase.auth.getUser();
  if (userData?.user?.id) return userData.user.id;
  throw new Error('Not authenticated. Please log in.');
}

/**
 * Fetch all boards for the logged-in user
 */
export async function getBoards(): Promise<Board[]> {
  let userId = '';
  try {
    userId = await getAuthUserId();
  } catch {
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('boards')
      .select('*')
      .eq('user_id', userId)
      .order('position', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) {
      // If table doesn't exist yet, fallback gracefully
      console.warn('boards table query notice:', error.message);
      return getLocalBoardsFallback(userId);
    }

    if (!data || data.length === 0) {
      // First time user: initialize the default "Main Pipeline" board
      const defaultBoard = await initializeDefaultBoard(userId);
      return defaultBoard ? [defaultBoard] : [];
    }

    return data as Board[];
  } catch (err) {
    console.warn('Error reading boards, falling back to local store:', err);
    return getLocalBoardsFallback(userId);
  }
}

/**
 * Initialize the default "Main Pipeline" board with 4 columns
 */
export async function initializeDefaultBoard(userId: string): Promise<Board | null> {
  const defaultTpl = BOARD_TEMPLATES.default;

  try {
    const { data: newBoard, error: boardErr } = await supabase
      .from('boards')
      .insert({
        user_id: userId,
        name: 'Main Pipeline',
        template: 'default',
        position: 0,
      })
      .select('*')
      .single();

    if (boardErr) {
      console.warn('Failed to insert default board into DB:', boardErr.message);
      return createLocalDefaultBoard(userId);
    }

    const board = newBoard as Board;
    const colInserts = defaultTpl.columns.map((c, idx) => ({
      board_id: board.id,
      user_id: userId,
      name: c.name,
      description: c.description,
      color: c.color,
      position: idx,
      column_type: c.column_type,
    }));

    await supabase.from('board_columns').insert(colInserts);
    return board;
  } catch (err) {
    console.warn('Could not initialize default board via DB:', err);
    return createLocalDefaultBoard(userId);
  }
}

/**
 * Create a new board with template
 */
export async function createBoard(
  name: string,
  templateKey: BoardTemplateKey = 'default'
): Promise<{ board: Board; columns: BoardColumn[] }> {
  const trimmedName = name.trim();
  if (trimmedName.length < 1 || trimmedName.length > 40) {
    throw new Error('Board name must be between 1 and 40 characters.');
  }

  const userId = await getAuthUserId();

  const existingBoards = await getBoards();
  if (existingBoards.length >= MAX_BOARDS_PER_USER) {
    throw new Error(`Limit reached: maximum ${MAX_BOARDS_PER_USER} boards allowed per account.`);
  }

  const template = BOARD_TEMPLATES[templateKey] || BOARD_TEMPLATES.default;
  const nextPos = existingBoards.length;

  try {
    const { data: boardData, error: boardErr } = await supabase
      .from('boards')
      .insert({
        user_id: userId,
        name: trimmedName,
        template: templateKey,
        position: nextPos,
      })
      .select('*')
      .single();

    if (boardErr) throw boardErr;
    const board = boardData as Board;

    const colInserts = template.columns.map((c, idx) => ({
      board_id: board.id,
      user_id: userId,
      name: c.name,
      description: c.description,
      color: c.color,
      position: idx,
      column_type: c.column_type,
    }));

    const { data: columnsData, error: colsErr } = await supabase
      .from('board_columns')
      .insert(colInserts)
      .select('*')
      .order('position', { ascending: true });

    if (colsErr) throw colsErr;

    const createdColumns = (columnsData ?? []) as BoardColumn[];
    broadcastWorkflowUpdate(board.id);

    return {
      board,
      columns: createdColumns,
    };
  } catch (err) {
    console.warn('DB createBoard notice, saving locally:', err);
    const newBoard: Board = {
      id: `local-board-${Date.now()}`,
      user_id: userId,
      name: trimmedName,
      template: templateKey,
      position: nextPos,
      created_at: new Date().toISOString(),
    };

    const newCols: BoardColumn[] = template.columns.map((c, idx) => ({
      id: `local-col-${Date.now()}-${idx}`,
      board_id: newBoard.id,
      user_id: userId,
      name: c.name,
      description: c.description,
      color: c.color,
      position: idx,
      column_type: c.column_type,
      created_at: new Date().toISOString(),
    }));

    saveLocalBoard(userId, newBoard, newCols);
    broadcastWorkflowUpdate(newBoard.id);
    return { board: newBoard, columns: newCols };
  }
}

/**
 * Rename board
 */
export async function renameBoard(boardId: string, name: string): Promise<void> {
  const trimmed = name.trim();
  if (trimmed.length < 1 || trimmed.length > 40) {
    throw new Error('Board name must be between 1 and 40 characters.');
  }

  const userId = await getAuthUserId();

  try {
    const { error } = await supabase
      .from('boards')
      .update({ name: trimmed })
      .eq('id', boardId)
      .eq('user_id', userId);

    if (error) throw error;
  } catch {
    renameLocalBoard(userId, boardId, trimmed);
  } finally {
    broadcastWorkflowUpdate(boardId);
  }
}

/**
 * Delete board
 */
export async function deleteBoard(boardId: string): Promise<void> {
  const userId = await getAuthUserId();

  try {
    // Delete cards linked to this board
    await supabase.from('workflow_cards').delete().eq('board_id', boardId);
    await supabase.from('deals').delete().eq('board_id', boardId);

    // Cascade deletes columns and board
    const { error } = await supabase.from('boards').delete().eq('id', boardId).eq('user_id', userId);
    if (error) throw error;
  } catch {
    deleteLocalBoard(userId, boardId);
  } finally {
    broadcastWorkflowUpdate();
  }
}

/**
 * Get columns for a specific board
 */
export async function getBoardColumns(boardId: string): Promise<BoardColumn[]> {
  let userId = '';
  try {
    userId = await getAuthUserId();
  } catch {
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('board_columns')
      .select('*')
      .eq('board_id', boardId)
      .eq('user_id', userId)
      .order('position', { ascending: true });

    if (error) {
      console.warn('board_columns table notice:', error.message);
      return getLocalColumnsFallback(userId, boardId);
    }

    if (!data || data.length === 0) {
      return getLocalColumnsFallback(userId, boardId);
    }

    return data as BoardColumn[];
  } catch (err) {
    console.warn('Error reading board columns:', err);
    return getLocalColumnsFallback(userId, boardId);
  }
}

/**
 * Save / update columns for a board
 */
export async function saveBoardColumns(
  boardId: string,
  columns: Array<{
    id?: string;
    name: string;
    description?: string | null;
    color?: string | null;
    position: number;
    column_type: ColumnType;
  }>
): Promise<BoardColumn[]> {
  if (columns.length < MIN_COLUMNS_PER_BOARD) {
    throw new Error(`A board must have at least ${MIN_COLUMNS_PER_BOARD} column.`);
  }
  if (columns.length > MAX_COLUMNS_PER_BOARD) {
    throw new Error(`Columns limit reached: maximum ${MAX_COLUMNS_PER_BOARD} columns allowed per board.`);
  }

  // Validate column names
  for (const c of columns) {
    const trimmed = c.name.trim();
    if (trimmed.length < 1 || trimmed.length > 40) {
      throw new Error(`Column name "${c.name}" must be between 1 and 40 characters.`);
    }
  }

  // Enforce at least one WON column
  const hasWonColumn = columns.some((c) => c.column_type === 'won');
  if (!hasWonColumn) {
    throw new Error('At least one column on the board must have type "Won".');
  }

  const userId = await getAuthUserId();

  try {
    const existing = await getBoardColumns(boardId);
    const existingMap = new Map(existing.map((c) => [c.id, c]));

    const results: BoardColumn[] = [];

    for (let i = 0; i < columns.length; i++) {
      const col = columns[i];
      if (col.id && existingMap.has(col.id)) {
        const { data, error } = await supabase
          .from('board_columns')
          .update({
            name: col.name.trim(),
            description: col.description?.trim() || null,
            color: col.color || 'violet',
            position: i,
            column_type: col.column_type,
          })
          .eq('id', col.id)
          .select('*')
          .single();

        if (error) throw error;
        results.push(data as BoardColumn);
      } else {
        const { data, error } = await supabase
          .from('board_columns')
          .insert({
            board_id: boardId,
            user_id: userId,
            name: col.name.trim(),
            description: col.description?.trim() || null,
            color: col.color || 'violet',
            position: i,
            column_type: col.column_type,
          })
          .select('*')
          .single();

        if (error) throw error;
        results.push(data as BoardColumn);
      }
    }

    broadcastWorkflowUpdate(boardId);
    return results;
  } catch (err) {
    console.warn('DB saveBoardColumns notice, saving locally:', err);
    const localCols: BoardColumn[] = columns.map((c, i) => ({
      id: c.id || `local-col-${Date.now()}-${i}`,
      board_id: boardId,
      user_id: userId,
      name: c.name.trim(),
      description: c.description?.trim() || null,
      color: c.color || 'violet',
      position: i,
      column_type: c.column_type,
      created_at: new Date().toISOString(),
    }));
    saveLocalColumns(userId, boardId, localCols);
    broadcastWorkflowUpdate(boardId);
    return localCols;
  }
}

/**
 * Delete a column and relocate its cards if any exist
 */
export async function deleteBoardColumn(
  boardId: string,
  columnId: string,
  targetRelocateColumnId?: string
): Promise<void> {
  const currentColumns = await getBoardColumns(boardId);
  if (currentColumns.length <= MIN_COLUMNS_PER_BOARD) {
    throw new Error(`A board must contain at least ${MIN_COLUMNS_PER_BOARD} column.`);
  }

  const deletingCol = currentColumns.find((c) => c.id === columnId);
  if (!deletingCol) return;

  // Check if it's the last Won column
  if (deletingCol.column_type === 'won') {
    const otherWon = currentColumns.filter((c) => c.id !== columnId && c.column_type === 'won');
    if (otherWon.length === 0) {
      throw new Error('Cannot delete the last "Won" column. At least one Won column is required on every board.');
    }
  }

  // Check if cards exist in this column
  const { data: cardsInCol } = await supabase
    .from('workflow_cards')
    .select('id')
    .eq('column_id', columnId);

  const cardCount = cardsInCol?.length ?? 0;
  if (cardCount > 0) {
    if (!targetRelocateColumnId) {
      throw new Error(
        `This column contains ${cardCount} cards. Please select another column to move them into before deleting.`
      );
    }
    // Move cards to the destination column
    await supabase
      .from('workflow_cards')
      .update({ column_id: targetRelocateColumnId, moved_at: new Date().toISOString() })
      .eq('column_id', columnId);

    await supabase
      .from('deals')
      .update({ column_id: targetRelocateColumnId })
      .eq('column_id', columnId);
  }

  // Delete column
  const { error } = await supabase.from('board_columns').delete().eq('id', columnId);
  if (error) {
    console.warn('Error deleting column from DB:', error.message);
  }

  // Re-index remaining columns
  const remaining = currentColumns.filter((c) => c.id !== columnId);
  for (let i = 0; i < remaining.length; i++) {
    await supabase.from('board_columns').update({ position: i }).eq('id', remaining[i].id);
  }
  broadcastWorkflowUpdate(boardId);
}

/**
 * Get cards for a specific board
 */
export async function getCardsForBoard(
  boardId: string,
  boardColumnIds: string[]
): Promise<WorkflowCard[]> {
  const wsId = tryGetActiveWorkspaceId();
  if (boardColumnIds.length === 0) return [];

  try {
    let query = supabase.from('workflow_cards').select('*');
    if (wsId) {
      query = query.eq('workspace_id', wsId);
    }

    // Match either by explicit board_id or by column_ids in this board
    const { data, error } = await query
      .in('column_id', boardColumnIds)
      .order('position', { ascending: true });

    if (error) throw error;
    return (data ?? []) as WorkflowCard[];
  } catch (err) {
    console.error('Error fetching cards for board:', err);
    return [];
  }
}

// ----------------------------------------------------------------------------
// LocalStorage Fallbacks (Guarantees zero-crash if SQL is pending in Supabase)
// ----------------------------------------------------------------------------

function getLocalBoardsFallback(userId: string): Board[] {
  try {
    const raw = localStorage.getItem(getLocalBoardsKey(userId));
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    /* ignore fallback error */
  }
  const defaultBoard: Board = {
    id: `board-main-${(userId || 'user').slice(0, 8)}`,
    user_id: userId,
    name: 'Main Pipeline',
    template: 'default',
    position: 0,
    created_at: new Date().toISOString(),
  };
  const defaultCols: BoardColumn[] = BOARD_TEMPLATES.default.columns.map((c, idx) => ({
    id: `col-main-${idx}`,
    board_id: defaultBoard.id,
    user_id: userId,
    name: c.name,
    description: c.description,
    color: c.color,
    position: idx,
    column_type: c.column_type,
    created_at: new Date().toISOString(),
  }));
  try {
    localStorage.setItem(getLocalBoardsKey(userId), JSON.stringify([defaultBoard]));
    localStorage.setItem(getLocalColumnsKey(userId, defaultBoard.id), JSON.stringify(defaultCols));
  } catch {
    /* ignore */
  }
  return [defaultBoard];
}

function createLocalDefaultBoard(userId: string): Board {
  const boards = getLocalBoardsFallback(userId);
  return boards[0];
}

function saveLocalBoard(userId: string, board: Board, columns: BoardColumn[]) {
  try {
    let boards: Board[] = [];
    const raw = localStorage.getItem(getLocalBoardsKey(userId));
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) boards = parsed;
      } catch {
        boards = [];
      }
    }
    const existingIdx = boards.findIndex((b) => b.id === board.id);
    if (existingIdx >= 0) boards[existingIdx] = board;
    else boards.push(board);
    localStorage.setItem(getLocalBoardsKey(userId), JSON.stringify(boards));
    saveLocalColumns(userId, board.id, columns);
  } catch {
    /* ignore fallback error */
  }
}

function renameLocalBoard(userId: string, boardId: string, name: string) {
  try {
    let boards: Board[] = [];
    const raw = localStorage.getItem(getLocalBoardsKey(userId));
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) boards = parsed;
      } catch {
        boards = [];
      }
    }
    const target = boards.find((b) => b.id === boardId);
    if (target) {
      target.name = name;
      localStorage.setItem(getLocalBoardsKey(userId), JSON.stringify(boards));
    }
  } catch {
    /* ignore fallback error */
  }
}

function deleteLocalBoard(userId: string, boardId: string) {
  try {
    let boards: Board[] = [];
    const raw = localStorage.getItem(getLocalBoardsKey(userId));
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) boards = parsed;
      } catch {
        boards = [];
      }
    }
    const filtered = boards.filter((b) => b.id !== boardId);
    localStorage.setItem(getLocalBoardsKey(userId), JSON.stringify(filtered));
    localStorage.removeItem(getLocalColumnsKey(userId, boardId));
  } catch {
    /* ignore fallback error */
  }
}

function getLocalColumnsFallback(userId: string, boardId: string): BoardColumn[] {
  try {
    const raw = localStorage.getItem(getLocalColumnsKey(userId, boardId));
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    /* ignore fallback error */
  }
  return BOARD_TEMPLATES.default.columns.map((c, idx) => ({
    id: `col-${boardId}-${idx}`,
    board_id: boardId,
    user_id: userId,
    name: c.name,
    description: c.description,
    color: c.color,
    position: idx,
    column_type: c.column_type,
    created_at: new Date().toISOString(),
  }));
}

function saveLocalColumns(userId: string, boardId: string, cols: BoardColumn[]) {
  try {
    localStorage.setItem(getLocalColumnsKey(userId, boardId), JSON.stringify(cols));
  } catch {
    /* ignore fallback error */
  }
}
