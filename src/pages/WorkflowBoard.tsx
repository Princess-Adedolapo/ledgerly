import { useEffect, useState, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useDebounce } from '../hooks/useDebounce';
import {
  supabase,
  type WorkflowCard,
  type Board,
  type BoardColumn,
  type Contact,
  type Invoice,
  CARD_PRIORITIES,
  CONTACT_STATUSES,
} from '../lib/supabase';
import {
  getBoards,
  createBoard,
  renameBoard,
  deleteBoard,
  getBoardColumns,
  saveBoardColumns,
  deleteBoardColumn,
  getCardsForBoard,
  MAX_BOARDS_PER_USER,
  type BoardTemplateKey,
  subscribeToWorkflowUpdates,
  broadcastWorkflowUpdate,
} from '../services/boardService';
import {
  getContacts,
  createWorkflowCard,
  updateWorkflowCard,
  deleteWorkflowCard,
  createContact,
  getInvoicesForContact,
} from '../services/workflowService';
import { PageHeader, Card, Button, Input, Modal } from '../components/ui';
import SearchableContactSelect from '../components/contacts/SearchableContactSelect';
import {
  Plus,
  Users,
  Calendar,
  ChevronDown,
  Trash2,
  Search,
  Mail,
  Phone,
  Building2,
  FileText,
  Send,
  FilePlus,
  MessageSquare,
  ArrowRightLeft,
  Sparkles,
  SlidersHorizontal,
} from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import { useActivityLog } from '../contexts/ActivityLogContext';
import { useNotificationPreferences } from '../contexts/NotificationContext';
import { useUserPreferences } from '../lib/userPreferences';
import { formatCurrency, getCurrencySymbol } from '../lib/currency';
import { ActivityTimeline } from '../components/workflow/ActivityTimeline';
import { GenerateInvoiceModal, type InvoiceData } from '../components/invoices/GenerateInvoiceModal';
import { EmailComposerModal } from '../components/email/EmailComposer';
import { logCardActivity } from '../services/activityService';
import { DealWinProbabilityBadge } from '../components/workflow/DealWinProbabilityBadge';
import { MeetingSummarizerModal } from '../components/ai/MeetingSummarizerModal';
import { getErrorMessage } from '../lib/errorUtils';
import { getInvoices } from '../services/invoiceService';
import { BoardSelector } from '../components/workflow/BoardSelector';
import { NewBoardModal } from '../components/workflow/NewBoardModal';
import { EditBoardModal } from '../components/workflow/EditBoardModal';
import { calculateDealWinProbability } from '../utils/dealAiInsights';

const priorityStyles: Record<'low' | 'medium' | 'high', { border: string; badge: string; label: string }> = {
  high: { border: 'border-l-4 border-red-500', badge: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400', label: 'High' },
  medium: { border: 'border-l-4 border-yellow-400', badge: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/15 dark:text-yellow-400', label: 'Medium' },
  low: { border: 'border-l-4 border-green-500', badge: 'bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400', label: 'Low' },
};

const invoiceStatusStyles: Record<string, string> = {
  paid: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
  pending: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
  overdue: 'bg-red-500/15 text-red-600 dark:text-red-400',
};

const columnColorPills: Record<string, string> = {
  amber: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border-amber-200/80 dark:border-amber-800/60',
  violet: 'bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 border-violet-200/80 dark:border-violet-800/60',
  blue: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border-blue-200/80 dark:border-blue-800/60',
  emerald: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border-emerald-200/80 dark:border-emerald-800/60',
  sky: 'bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300 border-sky-200/80 dark:border-sky-800/60',
  indigo: 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 border-indigo-200/80 dark:border-indigo-800/60',
  rose: 'bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 border-rose-200/80 dark:border-rose-800/60',
  slate: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200/80 dark:border-slate-700',
};

const getCardDealValue = (card: WorkflowCard, contact: Contact | null, allInvoices: Invoice[]): number => {
  if (contact?.name) {
    const matching = allInvoices.filter(
      (i) => i.customer_name?.toLowerCase().trim() === contact.name.toLowerCase().trim()
    );
    if (matching.length > 0) {
      const sum = matching.reduce((acc, inv) => acc + (Number(inv.amount) || 0), 0);
      if (sum > 0) return sum;
    }
  }
  const text = `${card.status_note || ''} ${card.title || ''}`;
  const match = text.match(/[$₦€£]\s*([\d,]+(?:\.\d+)?)|([\d,]+(?:\.\d+)?)\s*(?:USD|NGN|EUR|GBP|m|k)/i);
  if (match) {
    const rawNum = parseFloat((match[1] || match[2]).replace(/,/g, ''));
    if (!isNaN(rawNum) && rawNum > 0) return rawNum;
  }
  // Return 0 when no linked invoices or explicit deal amount exists.
  // Never fabricate arbitrary mock values.
  return 0;
};

type BoardFormState = {
  contact_id: string;
  status_note: string;
  deal_value: string;
  due_date: string;
  priority: 'low' | 'medium' | 'high';
  assignee_name: string;
  column_id: string;
};

const emptyForm = (colId: string): BoardFormState => ({
  contact_id: '',
  status_note: '',
  deal_value: '',
  due_date: '',
  priority: 'medium',
  assignee_name: '',
  column_id: colId,
});

export default function WorkflowBoard() {
  // Boards state
  const [boards, setBoards] = useState<Board[]>([]);
  const [activeBoard, setActiveBoard] = useState<Board | null>(null);
  const [columns, setColumns] = useState<BoardColumn[]>([]);
  const [cards, setCards] = useState<WorkflowCard[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [invoicesList, setInvoicesList] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 250);

  // Drag and drop state
  const [draggedCardId, setDraggedCardId] = useState<string | null>(null);
  const [dragOverColumnId, setDragOverColumnId] = useState<string | null>(null);

  const { addToast } = useToast();
  const { logActivity } = useActivityLog();
  const { preferences } = useNotificationPreferences();
  const { currencyCode, currencyDisplayMode } = useUserPreferences();

  // Board management modals
  const [newBoardModalOpen, setNewBoardModalOpen] = useState(false);
  const [editBoardModalOpen, setEditBoardModalOpen] = useState(false);

  // Add-card modal
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState<BoardFormState>(emptyForm(''));
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Inline new-contact
  const [inlineNew, setInlineNew] = useState(false);
  const [newContact, setNewContact] = useState({ name: '', company: '', email: '', phone: '', status: 'Lead' });

  // Detail modal
  const [detailCardId, setDetailCardId] = useState<string | null>(null);
  const [detailInvoices, setDetailInvoices] = useState<Invoice[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  // Quick Action embedded modals
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [whatsappModalOpen, setWhatsappModalOpen] = useState(false);
  const [moveStageOpen, setMoveStageOpen] = useState(false);
  const [timelineKey, setTimelineKey] = useState(0);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<WorkflowCard | null>(null);

  // AI Meeting Summarizer Modal
  const [summarizerOpen, setSummarizerOpen] = useState(false);
  const [summarizerContactId, setSummarizerContactId] = useState<string | undefined>(undefined);
  const [summarizerContactName, setSummarizerContactName] = useState<string | undefined>(undefined);
  const [summarizerNotes, setSummarizerNotes] = useState<string>('');

  // Move dropdown state
  const [moveMenuId, setMoveMenuId] = useState<string | null>(null);

  // Helper to get active board storage key
  const getActiveBoardStorageKey = () => `workflow_last_selected_board`;

  // Load all boards and initial data
  const loadBoardsAndData = useCallback(async () => {
    try {
      setLoading(true);
      const [fetchedBoards, ctcts, invs] = await Promise.all([
        getBoards(),
        getContacts(),
        getInvoices().catch(() => []),
      ]);

      setBoards(fetchedBoards);
      setContacts(ctcts);
      setInvoicesList(invs);

      // Select active board: check remembered ID or fallback to first board
      const savedBoardId = localStorage.getItem(getActiveBoardStorageKey());
      const currentBoard = fetchedBoards.find((b) => b.id === savedBoardId) || fetchedBoards[0] || null;

      setActiveBoard(currentBoard);

      if (currentBoard) {
        const boardCols = await getBoardColumns(currentBoard.id);
        setColumns(boardCols);
        const boardCards = await getCardsForBoard(
          currentBoard.id,
          boardCols.map((c) => c.id)
        );
        setCards(boardCards);
      } else {
        setColumns([]);
        setCards([]);
      }

      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load workflow boards');
    } finally {
      setLoading(false);
    }
  }, []);

  // Reload board columns and cards when activeBoard changes
  const reloadActiveBoard = useCallback(async (board: Board) => {
    try {
      const boardCols = await getBoardColumns(board.id);
      setColumns(boardCols);
      const boardCards = await getCardsForBoard(
        board.id,
        boardCols.map((c) => c.id)
      );
      setCards(boardCards);
      localStorage.setItem(getActiveBoardStorageKey(), board.id);
    } catch (err) {
      console.error('Error reloading active board:', err);
    }
  }, []);

  useEffect(() => {
    loadBoardsAndData();

    // Live real-time subscription for board & card changes
    const unsubscribe = subscribeToWorkflowUpdates((payload) => {
      getBoards()
        .then((updatedBoards) => {
          setBoards(updatedBoards);
          const targetId = payload?.boardId || localStorage.getItem(getActiveBoardStorageKey());
          const match = updatedBoards.find((b) => b.id === targetId) || updatedBoards[0];
          if (match) {
            reloadActiveBoard(match);
          }
        })
        .catch(() => {});
    });

    return () => {
      unsubscribe();
    };
  }, [loadBoardsAndData, reloadActiveBoard]);

  useEffect(() => {
    if (!moveMenuId) return;
    const h = () => setMoveMenuId(null);
    document.addEventListener('click', h);
    return () => document.removeEventListener('click', h);
  }, [moveMenuId]);

  const contactById = useMemo(() => {
    const m = new Map<string, Contact>();
    contacts.forEach((c) => m.set(c.id, c));
    return m;
  }, [contacts]);

  const columnById = useMemo(() => {
    const m = new Map<string, BoardColumn>();
    columns.forEach((c) => m.set(c.id, c));
    return m;
  }, [columns]);

  const filteredCards = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    if (!q) return cards;
    return cards.filter((card) => {
      const c = card.contact_id ? contactById.get(card.contact_id) : null;
      const name = c?.name?.toLowerCase() ?? '';
      const company = c?.company?.toLowerCase() ?? '';
      return name.includes(q) || company.includes(q);
    });
  }, [cards, contactById, debouncedSearch]);

  // Board switcher handler
  const handleSelectBoard = (board: Board) => {
    setActiveBoard(board);
    localStorage.setItem(getActiveBoardStorageKey(), board.id);
    reloadActiveBoard(board);
    broadcastWorkflowUpdate(board.id);
  };

  // Create new board
  const handleCreateBoard = async (name: string, templateKey: BoardTemplateKey) => {
    const { board: createdBoard } = await createBoard(name, templateKey);
    setBoards((prev) => [...prev, createdBoard]);
    setActiveBoard(createdBoard);
    localStorage.setItem(getActiveBoardStorageKey(), createdBoard.id);
    await reloadActiveBoard(createdBoard);
    broadcastWorkflowUpdate(createdBoard.id);
    logActivity('workflow', `Created new board '${createdBoard.name}'`);
    addToast('workflow', 'Board Created', `Created board '${createdBoard.name}'`);
  };

  // Rename board
  const handleRenameBoard = async (boardId: string, newName: string) => {
    await renameBoard(boardId, newName);
    setBoards((prev) => prev.map((b) => (b.id === boardId ? { ...b, name: newName } : b)));
    if (activeBoard?.id === boardId) {
      setActiveBoard((prev) => (prev ? { ...prev, name: newName } : null));
    }
    broadcastWorkflowUpdate(boardId);
    addToast('workflow', 'Board Renamed', `Board renamed to '${newName}'`);
  };

  // Delete board
  const handleDeleteBoard = async (boardId: string) => {
    const targetBoard = boards.find((b) => b.id === boardId);
    await deleteBoard(boardId);
    const updatedBoards = boards.filter((b) => b.id !== boardId);
    setBoards(updatedBoards);
    if (activeBoard?.id === boardId) {
      const nextBoard = updatedBoards[0] || null;
      setActiveBoard(nextBoard);
      if (nextBoard) {
        localStorage.setItem(getActiveBoardStorageKey(), nextBoard.id);
        await reloadActiveBoard(nextBoard);
      } else {
        setColumns([]);
        setCards([]);
      }
    }
    broadcastWorkflowUpdate();
    logActivity('workflow', `Deleted board '${targetBoard?.name || 'Board'}'`);
    addToast('workflow', 'Board Deleted', `Board '${targetBoard?.name || 'Board'}' was deleted`);
  };

  // Save updated columns from EditBoardModal
  const handleSaveColumns = async (
    editedColumns: Array<{
      id: string;
      name: string;
      description: string;
      color: string;
      column_type: ColumnType;
      position: number;
    }>
  ) => {
    if (!activeBoard) return;
    const updated = await saveBoardColumns(activeBoard.id, editedColumns);
    setColumns(updated);
    // Reload cards for updated columns
    const boardCards = await getCardsForBoard(
      activeBoard.id,
      updated.map((c) => c.id)
    );
    setCards(boardCards);
    broadcastWorkflowUpdate(activeBoard.id);
    addToast('workflow', 'Board Updated', 'Columns and stages saved successfully');
  };

  // Delete column with relocate
  const handleDeleteColumnWithRelocate = async (colId: string, targetColId?: string) => {
    if (!activeBoard) return;
    await deleteBoardColumn(activeBoard.id, colId, targetColId);
    const updatedCols = await getBoardColumns(activeBoard.id);
    setColumns(updatedCols);
    const boardCards = await getCardsForBoard(
      activeBoard.id,
      updatedCols.map((c) => c.id)
    );
    setCards(boardCards);
    broadcastWorkflowUpdate(activeBoard.id);
    addToast('workflow', 'Column Removed', 'Column removed and cards updated');
  };

  const openAdd = (columnId: string) => {
    const targetCol = columnId || columns[0]?.id || '';
    setForm(emptyForm(targetCol));
    setInlineNew(false);
    setNewContact({ name: '', company: '', email: '', phone: '', status: 'Lead' });
    setFormError(null);
    setAddOpen(true);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSaving(true);
    try {
      let contactId = form.contact_id;
      if (inlineNew) {
        if (!newContact.name.trim()) {
          setFormError('New contact name is required');
          setSaving(false);
          return;
        }
        const created = await createContact(newContact);
        contactId = created.id;
        setContacts((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      }
      if (!contactId) {
        setFormError('Please choose a client');
        setSaving(false);
        return;
      }
      const contact = contactById.get(contactId) ?? contacts.find((c) => c.id === contactId);

      let finalNote = form.status_note.trim();
      const rawVal = form.deal_value.trim().replace(/,/g, '');
      if (rawVal && !isNaN(Number(rawVal)) && Number(rawVal) > 0) {
        const sym = getCurrencySymbol(currencyCode, currencyDisplayMode).trim();
        const formattedVal = `${sym} ${Number(rawVal).toLocaleString()}`;
        finalNote = finalNote ? `${formattedVal} • ${finalNote}` : formattedVal;
      }

      await createWorkflowCard({
        column_id: form.column_id,
        board_id: activeBoard?.id || null,
        contact_id: contactId,
        title: contact?.name ?? 'Client',
        status_note: finalNote || null,
        due_date: form.due_date || null,
        assignee_name: form.assignee_name,
        priority: form.priority,
      });
      const targetCol = columns.find((c) => c.id === form.column_id);
      logActivity('workflow', `Added ${contact?.name ?? 'client'} to '${targetCol?.name ?? 'column'}'`, contactId);
      if (preferences.workflowAlerts) {
        addToast('workflow', 'Card Added', `${contact?.name ?? 'Client'} added to ${targetCol?.name ?? 'board'}`);
      }
      setAddOpen(false);
      if (activeBoard) {
        await reloadActiveBoard(activeBoard);
      }
      broadcastWorkflowUpdate(activeBoard?.id);
    } catch (err) {
      setFormError(getErrorMessage(err, 'Failed to add card. Please try again.'));
    } finally {
      setSaving(false);
    }
  };

  const handleMove = async (card: WorkflowCard, targetColumnId: string) => {
    if (card.column_id === targetColumnId) return;
    try {
      await updateWorkflowCard(card.id, { column_id: targetColumnId, moved_at: new Date().toISOString() });
      const targetCol = columns.find((c) => c.id === targetColumnId);
      const contact = card.contact_id ? contactById.get(card.contact_id) : null;
      if (targetCol) {
        logActivity('workflow', `${contact?.name ?? 'Card'} moved to '${targetCol.name}'`, card.contact_id ?? undefined);
        if (preferences.workflowAlerts) {
          addToast('workflow', 'Card Moved', `${contact?.name ?? 'Card'} moved to '${targetCol.name}'`);
        }
      }
      if (activeBoard) {
        await reloadActiveBoard(activeBoard);
      }
      broadcastWorkflowUpdate(activeBoard?.id);
    } catch (err) {
      addToast('error', 'Move failed', getErrorMessage(err, 'Could not move card to selected column.'));
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteWorkflowCard(deleteTarget.id);
      setDeleteTarget(null);
      if (activeBoard) {
        await reloadActiveBoard(activeBoard);
      }
      broadcastWorkflowUpdate(activeBoard?.id);
    } catch (err) {
      addToast('error', 'Delete failed', getErrorMessage(err, 'Could not delete card from workflow.'));
    }
  };

  // ---- Detail modal loader ----
  const detailCard = detailCardId ? cards.find((c) => c.id === detailCardId) ?? null : null;
  const detailContact = detailCard?.contact_id ? contactById.get(detailCard.contact_id) ?? null : null;

  useEffect(() => {
    if (!detailCard || !detailContact) {
      setDetailInvoices([]);
      return;
    }
    let cancelled = false;
    setDetailLoading(true);
    getInvoicesForContact(detailContact)
      .then((inv) => {
        if (cancelled) return;
        setDetailInvoices(inv);
      })
      .catch(() => {})
      .finally(() => !cancelled && setDetailLoading(false));
    return () => {
      cancelled = true;
    };
  }, [detailCard, detailContact]);

  const handleSaveInvoiceFromModal = async (data: InvoiceData) => {
    const { tryGetActiveWorkspaceId } = await import('../lib/activeWorkspace');
    const wsId = tryGetActiveWorkspaceId();
    if (!wsId) return;

    const contact = contacts.find((c) => c.name === data.customerName) || detailContact;
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id ?? null;

    const { error } = await supabase.from('invoices').insert([
      {
        workspace_id: wsId,
        user_id: userId,
        invoice_number: data.invoiceNumber,
        customer_name: data.customerName,
        amount: data.total,
        due_date: data.dueDate || null,
        notes: data.notes || null,
        status: 'pending',
        currency_code: data.currencyCode,
        tax_rate: data.taxRate,
        discount: data.discount,
      },
    ]);

    if (error) throw error;

    await logCardActivity({
      card_id: detailCard?.id,
      contact_id: contact?.id ?? null,
      type: 'invoice_event',
      content: `Invoice #${data.invoiceNumber} created for ${data.customerName} (${data.currencyCode} ${data.total.toFixed(2)})`,
    });

    addToast('invoice', 'Invoice Generated', `Invoice #${data.invoiceNumber} created for ${data.customerName}`);
    setInvoiceModalOpen(false);
    setTimelineKey((k) => k + 1);

    if (detailContact) {
      const invs = await getInvoicesForContact(detailContact.name);
      setDetailInvoices(invs);
    }
  };

  if (loading) {
    return (
      <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
        <PageHeader title="Workflow Board" subtitle="Loading customizable pipelines..." />
        <div className="flex gap-4 overflow-x-auto pb-4">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="w-80 h-96 bg-gray-100 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-800 rounded-2xl animate-pulse shrink-0"
            />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 md:p-8 max-w-7xl mx-auto">
        <PageHeader title="Workflow Board" />
        <Card className="p-6">
          <p className="text-red-600 dark:text-red-400">{error}</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header with Board Selector & Actions */}
      <PageHeader
        title={
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-2xl font-bold text-gray-900 dark:text-slate-100 tracking-tight">
              Workflow Board
            </span>
            <BoardSelector
              boards={boards}
              selectedBoard={activeBoard}
              onSelectBoard={handleSelectBoard}
              onOpenNewBoardModal={() => setNewBoardModalOpen(true)}
              onRenameBoard={handleRenameBoard}
              onDeleteBoard={handleDeleteBoard}
            />
          </div>
        }
        subtitle={`${cards.length} ${cards.length === 1 ? 'client' : 'clients'} across ${columns.length} columns`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setSummarizerContactId(undefined);
                setSummarizerContactName(undefined);
                setSummarizerNotes('');
                setSummarizerOpen(true);
              }}
              className="gap-2 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-800 hover:bg-violet-50 dark:hover:bg-violet-950/40"
            >
              <Sparkles className="w-4 h-4 text-violet-500" /> AI Note Summarizer
            </Button>
            <Button
              variant="outline"
              onClick={() => setEditBoardModalOpen(true)}
              className="gap-2 text-gray-700 dark:text-slate-200 border-gray-200 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800"
            >
              <SlidersHorizontal className="w-4 h-4" /> Edit board
            </Button>
            <Button onClick={() => openAdd(columns[0]?.id ?? '')}>
              <span className="flex items-center gap-2"><Plus className="w-4 h-4" /> Add Card</span>
            </Button>
          </div>
        }
      />

      {/* Search bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by client name or company..."
          className="w-full pl-10 pr-3 py-2 bg-gray-50 dark:bg-[#192237] border border-gray-200 dark:border-slate-700 rounded-lg text-sm text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all"
        />
      </div>

      {/* Columns Horizontal Scroll Container */}
      <div className="flex gap-4 overflow-x-auto pb-6 pt-1 items-start min-w-0 scrollbar-thin">
        {columns.map((col) => {
          const colCards = filteredCards.filter((c) => c.column_id === col.id);
          const colPill = columnColorPills[col.color || 'violet'] || columnColorPills.violet;

          return (
            <div
              key={col.id}
              onDragOver={(e) => {
                e.preventDefault();
                if (dragOverColumnId !== col.id) setDragOverColumnId(col.id);
              }}
              onDragLeave={(e) => {
                if (e.currentTarget.contains(e.relatedTarget as Node)) return;
                setDragOverColumnId(null);
              }}
              onDrop={(e) => {
                e.preventDefault();
                setDragOverColumnId(null);
                const cardId = e.dataTransfer.getData('text/plain');
                const card = cards.find((c) => c.id === cardId);
                if (card && card.column_id !== col.id) {
                  handleMove(card, col.id);
                }
              }}
              className={`w-[300px] sm:w-[320px] shrink-0 bg-purple-50/20 dark:bg-[#111625] border border-purple-100/60 dark:border-slate-800 rounded-2xl p-3 flex flex-col min-h-[460px] transition-all duration-200 ${
                dragOverColumnId === col.id ? 'ring-2 ring-violet-500/50 bg-purple-100/40 dark:bg-slate-800/80' : ''
              }`}
            >
              {/* Column Header */}
              <div className="pb-2 mb-2 border-b border-purple-100/80 dark:border-slate-800 px-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <h3 className="text-xs sm:text-sm font-bold tracking-wider uppercase text-slate-900 dark:text-slate-100 truncate">
                      {col.name}
                    </h3>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border shrink-0 ${colPill}`}>
                      ({colCards.length})
                    </span>
                  </div>
                  <button
                    onClick={() => openAdd(col.id)}
                    aria-label={`Add card to ${col.name}`}
                    className="w-7 h-7 rounded-lg text-purple-600 dark:text-slate-300 hover:bg-purple-100 dark:hover:bg-slate-800 flex items-center justify-center transition-all shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                  {col.description || 'Pipeline stage'}
                </p>
              </div>

              {/* Cards Container */}
              <div className="flex-1 space-y-2.5">
                {colCards.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-12 h-12 rounded-2xl bg-purple-100/50 dark:bg-slate-800/50 flex items-center justify-center mb-3">
                      <Users className="w-6 h-6 text-purple-400 dark:text-slate-500" />
                    </div>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      No deals in {col.name} yet
                    </p>
                    <button
                      onClick={() => openAdd(col.id)}
                      className="mt-2 text-[11px] font-semibold text-violet-600 dark:text-violet-400 hover:underline"
                    >
                      + Add a deal
                    </button>
                  </div>
                ) : (
                  colCards.map((card) => {
                    const contact = card.contact_id ? contactById.get(card.contact_id) : null;
                    const cardValue = getCardDealValue(card, contact, invoicesList);
                    const p = priorityStyles[card.priority];
                    const winProb = calculateDealWinProbability(card, col, columns);
                    const dateStr = card.due_date
                      ? `Due ${new Date(card.due_date).toLocaleDateString()}`
                      : card.moved_at
                      ? `Updated ${new Date(card.moved_at).toLocaleDateString()}`
                      : '';

                    return (
                      <div
                        key={card.id}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData('text/plain', card.id);
                          setDraggedCardId(card.id);
                        }}
                        onDragEnd={() => {
                          setDraggedCardId(null);
                          setDragOverColumnId(null);
                        }}
                        onClick={() => setDetailCardId(card.id)}
                        className={`bg-white dark:bg-[#151C2C] rounded-xl p-3.5 shadow-xs hover:shadow-md cursor-pointer transition-all duration-200 border border-purple-100/90 dark:border-slate-800 space-y-2.5 relative group ${
                          draggedCardId === card.id ? 'opacity-50 scale-95' : ''
                        }`}
                      >
                        {/* Header: Client / Organization Name + Stage/Win Badge */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                              {contact?.name ?? card.title ?? 'Client'}
                            </p>
                            {contact?.company && (
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate">
                                {contact.company}
                              </p>
                            )}
                          </div>
                          <span
                            className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md shrink-0 uppercase tracking-wide border ${winProb.badgeClass}`}
                          >
                            {col.name}
                          </span>
                        </div>

                        {/* Subheading / Title: Deal Name or Project Summary */}
                        <div>
                          <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 line-clamp-1">
                            {card.status_note || card.title || 'Client Project'}
                          </p>
                        </div>

                        {/* Deal Value & Win Probability Badge */}
                        <div className="flex items-center justify-between gap-1 pt-1.5 border-t border-purple-100/60 dark:border-slate-800">
                          <div>
                            <span className="text-[10px] text-slate-400 dark:text-slate-500 block uppercase font-medium">
                              Deal Value
                            </span>
                            <span className="text-xs sm:text-sm font-extrabold text-violet-700 dark:text-violet-400">
                              {cardValue > 0 ? formatCurrency(cardValue, currencyCode, currencyDisplayMode) : '—'}
                            </span>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <span className={`text-[9px] font-semibold px-1.5 py-0.2 rounded ${p.badge}`}>
                              {p.label}
                            </span>
                            <DealWinProbabilityBadge
                              card={card}
                              column={col}
                              allColumns={columns}
                              size="sm"
                            />
                          </div>
                        </div>

                        {/* Progress Bar (Position ÷ Number of Open Columns) */}
                        <div className="space-y-1 pt-0.5">
                          <div className="flex justify-between items-center text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                            <span>Stage Progress</span>
                            <span>{winProb.score}%</span>
                          </div>
                          <div className="w-full bg-purple-100/60 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="bg-gradient-to-r from-violet-500 via-purple-500 to-emerald-400 h-1.5 rounded-full transition-all duration-300"
                              style={{ width: `${winProb.score}%` }}
                            />
                          </div>
                        </div>

                        {/* Card Footer */}
                        <div className="flex items-center justify-between gap-2 pt-1 text-[11px] text-slate-500 dark:text-slate-400">
                          <span className="flex items-center gap-1 truncate text-[10px]">
                            <Calendar className="w-3 h-3 text-purple-400" />
                            {dateStr || '—'}
                          </span>

                          <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                            <div className="relative">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setMoveMenuId(moveMenuId === card.id ? null : card.id);
                                }}
                                className="flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-md border border-purple-200/80 dark:border-slate-700 text-purple-700 dark:text-slate-300 hover:bg-purple-50 dark:hover:bg-slate-800 transition-colors"
                              >
                                Move <ChevronDown className="w-3 h-3" />
                              </button>
                              {moveMenuId === card.id && (
                                <div className="absolute z-20 mt-1 right-0 w-48 bg-white dark:bg-[#151C2C] border border-purple-100 dark:border-slate-800 rounded-xl shadow-lg py-1">
                                  {columns
                                    .filter((c) => c.id !== card.column_id)
                                    .map((target) => (
                                      <button
                                        key={target.id}
                                        onClick={() => {
                                          setMoveMenuId(null);
                                          handleMove(card, target.id);
                                        }}
                                        className="w-full text-left px-3 py-1.5 text-xs text-gray-700 dark:text-slate-200 hover:bg-violet-500/10 hover:text-violet-600 dark:hover:text-violet-400 transition-colors"
                                      >
                                        Move to {target.name}
                                      </button>
                                    ))}
                                </div>
                              )}
                            </div>

                            <button
                              onClick={() => setDeleteTarget(card)}
                              aria-label="Delete card"
                              className="text-gray-400 hover:text-red-500 p-1 rounded"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add card modal */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add card to workflow">
        <form onSubmit={handleAdd} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Client</label>
            {!inlineNew ? (
              <>
                <SearchableContactSelect
                  contacts={contacts}
                  value={form.contact_id}
                  onChange={(val) => setForm({ ...form, contact_id: val })}
                  placeholder="Search or select an existing client..."
                />
                <button
                  type="button"
                  onClick={() => setInlineNew(true)}
                  className="mt-2 text-xs text-violet-600 dark:text-violet-400 hover:underline"
                >
                  + Create new contact
                </button>
              </>
            ) : (
              <div className="space-y-2 border border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-3">
                <Input label="Name" value={newContact.name} onChange={(v) => setNewContact({ ...newContact, name: v })} required />
                <Input label="Company" value={newContact.company} onChange={(v) => setNewContact({ ...newContact, company: v })} />
                <div className="grid grid-cols-2 gap-2">
                  <Input label="Email" value={newContact.email} onChange={(v) => setNewContact({ ...newContact, email: v })} />
                  <Input label="Phone" value={newContact.phone} onChange={(v) => setNewContact({ ...newContact, phone: v })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">Status</label>
                  <select
                    value={newContact.status}
                    onChange={(e) => setNewContact({ ...newContact, status: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-[#192237] border border-gray-200 dark:border-slate-700 rounded-lg text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500"
                  >
                    {CONTACT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <button
                  type="button"
                  onClick={() => setInlineNew(false)}
                  className="text-xs text-gray-500 hover:text-gray-800 dark:hover:text-slate-200"
                >
                  ← Pick from existing contacts instead
                </button>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">Status note / Deal Title</label>
            <input
              value={form.status_note}
              onChange={(e) => setForm({ ...form, status_note: e.target.value })}
              placeholder="e.g. Awaiting contract signature"
              className="w-full px-3 py-2 bg-gray-50 dark:bg-[#192237] border border-gray-200 dark:border-slate-700 rounded-lg text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">
                Estimated Deal Value (optional)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs font-semibold text-gray-400 dark:text-slate-500 pointer-events-none">
                  {getCurrencySymbol(currencyCode, currencyDisplayMode).trim()}
                </span>
                <input
                  type="text"
                  value={form.deal_value}
                  onChange={(e) => setForm({ ...form, deal_value: e.target.value })}
                  placeholder="e.g. 50,000 (leave empty if none)"
                  className="w-full pl-8 pr-3 py-2 bg-gray-50 dark:bg-[#192237] border border-gray-200 dark:border-slate-700 rounded-lg text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">Priority</label>
              <select
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value as 'low' | 'medium' | 'high' })}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-[#192237] border border-gray-200 dark:border-slate-700 rounded-lg text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500"
              >
                {CARD_PRIORITIES.map((p) => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">Due date</label>
              <input
                type="date"
                value={form.due_date}
                onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-[#192237] border border-gray-200 dark:border-slate-700 rounded-lg text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500"
              />
            </div>
            <div>
              <Input label="Assignee" value={form.assignee_name} onChange={(v) => setForm({ ...form, assignee_name: v })} placeholder="Team member name" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">Column</label>
            <select
              value={form.column_id}
              onChange={(e) => setForm({ ...form, column_id: e.target.value })}
              className="w-full px-3 py-2 bg-gray-50 dark:bg-[#192237] border border-gray-200 dark:border-slate-700 rounded-lg text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500"
            >
              {columns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          {formError && <p className="text-sm text-red-600 dark:text-red-400">{formError}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setAddOpen(false)} className="px-4 py-2 text-sm text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-slate-100">Cancel</button>
            <Button type="submit" disabled={saving}>{saving ? 'Adding...' : 'Add Card'}</Button>
          </div>
        </form>
      </Modal>

      {/* Detail modal */}
      <Modal open={!!detailCard} onClose={() => setDetailCardId(null)} title={detailContact?.name ?? 'Client details'}>
        {detailCard && (
          <div className="space-y-5">
            {/* Quick Actions Bar */}
            <div className="flex flex-wrap items-center gap-2 p-3 bg-gray-50 dark:bg-[#111625] rounded-xl border border-gray-200 dark:border-slate-800">
              <span className="text-xs font-semibold text-gray-500 dark:text-slate-400 w-full sm:w-auto mb-1 sm:mb-0">Quick Actions:</span>
              <DealWinProbabilityBadge
                card={detailCard}
                column={columnById.get(detailCard.column_id)}
                allColumns={columns}
                size="md"
              />
              <button
                type="button"
                onClick={() => {
                  setSummarizerContactId(detailContact?.id);
                  setSummarizerContactName(detailContact?.name);
                  setSummarizerNotes(detailCard.status_note || '');
                  setSummarizerOpen(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-purple-600 hover:bg-purple-500 text-white transition-all shadow-sm"
              >
                <Sparkles className="w-3.5 h-3.5" />
                AI Summarize Notes
              </button>
              <button
                type="button"
                onClick={() => setInvoiceModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-violet-600 hover:bg-violet-500 text-white transition-all shadow-sm"
              >
                <FilePlus className="w-3.5 h-3.5" />
                Generate Invoice
              </button>
              <button
                type="button"
                onClick={() => setWhatsappModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-sm"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                Send WhatsApp
              </button>
              <button
                type="button"
                onClick={() => setEmailModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-sm"
              >
                <Send className="w-3.5 h-3.5" />
                Send Email
              </button>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setMoveStageOpen(!moveStageOpen)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-white dark:bg-[#151C2C] hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-700 dark:text-slate-200 transition-all border border-gray-200 dark:border-slate-700 shadow-sm"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5" />
                  Move Stage
                  <ChevronDown className="w-3 h-3" />
                </button>
                {moveStageOpen && (
                  <div className="absolute left-0 sm:right-0 sm:left-auto z-30 mt-1 w-48 bg-white dark:bg-[#151C2C] border border-gray-200 dark:border-slate-800 rounded-lg shadow-lg py-1">
                    {columns.filter((c) => c.id !== detailCard.column_id).map((target) => (
                      <button
                        key={target.id}
                        type="button"
                        onClick={() => {
                          setMoveStageOpen(false);
                          handleMove(detailCard, target.id);
                        }}
                        className="w-full text-left px-3 py-1.5 text-xs text-gray-700 dark:text-slate-200 hover:bg-violet-500/10 hover:text-violet-600 dark:hover:text-violet-400 transition-colors"
                      >
                        Move to {target.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Contact info */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs uppercase tracking-wider text-gray-400 dark:text-slate-500">Contact</h4>
                {detailContact && (
                  <Link
                    to={`/contacts/${detailContact.id}`}
                    className="text-xs text-violet-600 dark:text-violet-400 font-bold hover:underline flex items-center gap-1"
                  >
                    Open 360 Profile →
                  </Link>
                )}
              </div>
              {detailContact ? (
                <div className="space-y-1.5 text-sm">
                  <Link
                    to={`/contacts/${detailContact.id}`}
                    className="font-semibold text-gray-900 dark:text-slate-100 hover:text-violet-600 dark:hover:text-violet-400 hover:underline block"
                  >
                    {detailContact.name}
                  </Link>
                  {detailContact.company && (
                    <p className="flex items-center gap-2 text-gray-600 dark:text-slate-300"><Building2 className="w-3.5 h-3.5" /> {detailContact.company}</p>
                  )}
                  {detailContact.email && (
                    <p className="flex items-center gap-2 text-gray-600 dark:text-slate-300"><Mail className="w-3.5 h-3.5" /> {detailContact.email}</p>
                  )}
                  {detailContact.phone && (
                    <p className="flex items-center gap-2 text-gray-600 dark:text-slate-300"><Phone className="w-3.5 h-3.5" /> {detailContact.phone}</p>
                  )}
                  <p className="text-xs text-gray-500 dark:text-slate-400">Status: <span className="font-medium text-gray-700 dark:text-slate-200">{detailContact.status}</span></p>
                </div>
              ) : (
                <p className="text-sm text-gray-500 dark:text-slate-400">No contact linked.</p>
              )}
            </div>

            {/* Card meta */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div className="bg-gray-50 dark:bg-[#111625] border border-transparent dark:border-slate-800/60 rounded-lg p-2.5">
                <p className="text-gray-400 dark:text-slate-500">Deal Value</p>
                <p className="mt-0.5 text-gray-800 dark:text-slate-200 font-bold">
                  {(() => {
                    const v = getCardDealValue(detailCard, detailContact, detailInvoices);
                    return v > 0 ? formatCurrency(v, currencyCode, currencyDisplayMode) : '—';
                  })()}
                </p>
              </div>
              <div className="bg-gray-50 dark:bg-[#111625] border border-transparent dark:border-slate-800/60 rounded-lg p-2.5">
                <p className="text-gray-400 dark:text-slate-500">Priority</p>
                <p className="mt-0.5"><span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${priorityStyles[detailCard.priority].badge}`}>{priorityStyles[detailCard.priority].label}</span></p>
              </div>
              <div className="bg-gray-50 dark:bg-[#111625] border border-transparent dark:border-slate-800/60 rounded-lg p-2.5">
                <p className="text-gray-400 dark:text-slate-500">Due date</p>
                <p className="mt-0.5 text-gray-800 dark:text-slate-200">{detailCard.due_date ? new Date(detailCard.due_date).toLocaleDateString() : '—'}</p>
              </div>
              <div className="bg-gray-50 dark:bg-[#111625] border border-transparent dark:border-slate-800/60 rounded-lg p-2.5">
                <p className="text-gray-400 dark:text-slate-500">Assignee</p>
                <p className="mt-0.5 text-gray-800 dark:text-slate-200">{detailCard.assignee_name || '—'}</p>
              </div>
              <div className="bg-gray-50 dark:bg-[#111625] border border-transparent dark:border-slate-800/60 rounded-lg p-2.5 col-span-2">
                <p className="text-gray-400 dark:text-slate-500">Status note</p>
                <p className="mt-0.5 text-gray-800 dark:text-slate-200">{detailCard.status_note || '—'}</p>
              </div>
            </div>

            {/* Invoices */}
            <div>
              <h4 className="text-xs uppercase tracking-wider text-gray-400 dark:text-slate-500 mb-2 flex items-center gap-2">
                <FileText className="w-3.5 h-3.5" /> Invoices
              </h4>
              {detailLoading ? (
                <p className="text-sm text-gray-500 dark:text-slate-400">Loading...</p>
              ) : detailInvoices.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-slate-400">No invoices for this client.</p>
              ) : (
                <div className="space-y-1.5">
                  {detailInvoices.map((inv) => (
                    <div key={inv.id} className="flex items-center justify-between text-sm bg-gray-50 dark:bg-[#111625] border border-transparent dark:border-slate-800/60 rounded-lg px-3 py-2">
                      <span className="text-gray-700 dark:text-slate-200 font-medium">
                        {formatCurrency(Number(inv.amount), currencyCode, currencyDisplayMode)}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400 truncate mx-3">{inv.invoice_number ?? inv.id.slice(0, 8)}</span>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${invoiceStatusStyles[inv.status] ?? ''}`}>
                        {inv.status.charAt(0).toUpperCase() + inv.status.slice(1)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Unified Activity Timeline */}
            <ActivityTimeline
              key={timelineKey}
              cardId={detailCard.id}
              contactId={detailCard.contact_id}
              onActivityAdded={() => setTimelineKey((k) => k + 1)}
            />
          </div>
        )}
      </Modal>

      {/* Embedded Action Modals */}
      <GenerateInvoiceModal
        open={invoiceModalOpen}
        onClose={() => setInvoiceModalOpen(false)}
        contacts={contacts}
        initialCustomerName={detailContact?.name}
        onSave={handleSaveInvoiceFromModal}
      />

      <EmailComposerModal
        open={emailModalOpen}
        onClose={() => setEmailModalOpen(false)}
        initialContactId={detailContact?.id}
        initialChannel="email"
        onSent={() => setTimelineKey((k) => k + 1)}
      />

      <EmailComposerModal
        open={whatsappModalOpen}
        onClose={() => setWhatsappModalOpen(false)}
        initialContactId={detailContact?.id}
        initialChannel="whatsapp"
        onSent={() => setTimelineKey((k) => k + 1)}
      />

      <MeetingSummarizerModal
        isOpen={summarizerOpen}
        onClose={() => setSummarizerOpen(false)}
        contactId={summarizerContactId}
        contactName={summarizerContactName}
        initialNotes={summarizerNotes}
      />

      {/* Delete Card Confirmation Modal */}
      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete card?">
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
          This removes the workflow card. The linked contact and their invoices are not affected.
        </p>
        <div className="flex justify-end gap-2">
          <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">Cancel</button>
          <button onClick={handleDelete} className="px-4 py-2 text-sm rounded-lg bg-red-600 hover:bg-red-700 text-white">Delete</button>
        </div>
      </Modal>

      {/* New Board Modal */}
      <NewBoardModal
        isOpen={newBoardModalOpen}
        onClose={() => setNewBoardModalOpen(false)}
        onSubmit={handleCreateBoard}
        boardCount={boards.length}
        maxBoards={MAX_BOARDS_PER_USER}
      />

      {/* Edit Board Modal */}
      {activeBoard && (
        <EditBoardModal
          isOpen={editBoardModalOpen}
          onClose={() => setEditBoardModalOpen(false)}
          board={activeBoard}
          columns={columns}
          cards={cards}
          onSaveColumns={handleSaveColumns}
          onRenameBoard={(newName) => handleRenameBoard(activeBoard.id, newName)}
          onDeleteColumnWithRelocate={handleDeleteColumnWithRelocate}
        />
      )}
    </div>
  );
}
