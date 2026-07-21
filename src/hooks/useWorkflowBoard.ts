import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { WorkflowColumn, WorkflowCard, Contact } from '../lib/supabase';
import {
  ensureWorkflowColumns,
  getWorkflowCards,
  getContacts,
  createWorkflowCard as svcCreateCard,
  updateWorkflowCard as svcUpdateCard,
  deleteWorkflowCard as svcDeleteCard,
  updateColumnName as svcUpdateColumnName,
  reorderColumns as svcReorderColumns,
  subscribeToWorkflowColumns,
  subscribeToWorkflowCards,
  type WorkflowCardInput,
  type WorkflowCardUpdate,
} from '../services/workflowService';

export function useWorkflowBoard() {
  const [columns, setColumns] = useState<WorkflowColumn[]>([]);
  const [cards, setCards] = useState<WorkflowCard[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [cols, crds, ctcts] = await Promise.all([ensureWorkflowColumns(), getWorkflowCards(), getContacts()]);
      setColumns(cols);
      setCards(crds);
      setContacts(ctcts);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load workflow board');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();

    const colChannel = subscribeToWorkflowColumns(() => {
      ensureWorkflowColumns().then(setColumns).catch(() => {});
    });
    const cardChannel = subscribeToWorkflowCards(() => {
      getWorkflowCards().then(setCards).catch(() => {});
    });

    return () => {
      supabaseRemoveChannel(colChannel);
      supabaseRemoveChannel(cardChannel);
    };
  }, [load]);

  const addCard = useCallback(
    async (input: WorkflowCardInput) => {
      await svcCreateCard(input);
      await load();
    },
    [load]
  );

  const editCard = useCallback(
    async (cardId: string, updates: WorkflowCardUpdate) => {
      await svcUpdateCard(cardId, updates);
      await load();
    },
    [load]
  );

  const removeCard = useCallback(
    async (cardId: string) => {
      await svcDeleteCard(cardId);
      await load();
    },
    [load]
  );

  const renameColumn = useCallback(
    async (columnId: string, name: string) => {
      await svcUpdateColumnName(columnId, name);
      setColumns((prev) =>
        prev.map((c) => (c.id === columnId ? { ...c, name } : c))
      );
    },
    []
  );

  const moveColumn = useCallback(
    async (fromIndex: number, toIndex: number) => {
      const reordered = [...columns];
      const [moved] = reordered.splice(fromIndex, 1);
      reordered.splice(toIndex, 0, moved);
      setColumns(reordered);
      await svcReorderColumns(reordered);
    },
    [columns]
  );

  return {
    columns,
    cards,
    contacts,
    loading,
    error,
    addCard,
    editCard,
    removeCard,
    renameColumn,
    moveColumn,
    reload: load,
  };
}

function supabaseRemoveChannel(channel: ReturnType<typeof supabase.channel>) {
  supabase.removeChannel(channel);
}
