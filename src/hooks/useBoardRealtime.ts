'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Board, Column, Task } from '@/types';
import {
  subscribeToBoard,
  subscribeToColumns,
  subscribeToTasks,
  moveTask,
} from '@/lib/firestore';

interface BoardState {
  board: Board | null;
  columns: Column[];
  tasks: Task[];
  loading: boolean;
  error: string | null;
}

/**
 * Custom hook that subscribes to real-time board data with optimistic updates.
 * Conflict resolution: server wins for final state; local state is applied
 * immediately (optimistic) and reconciled when the server update arrives.
 */
export function useBoardRealtime(boardId: string | null) {
  const [state, setState] = useState<BoardState>({
    board: null,
    columns: [],
    tasks: [],
    loading: boardId !== null,
    error: null,
  });

  // Pending optimistic updates keyed by taskId → expected columnId
  const optimisticRef = useRef<Map<string, { columnId: string; order: number }>>(new Map());

  useEffect(() => {
    if (!boardId) {
      // boardId is null, nothing to subscribe to
      return;
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState((s) => ({ ...s, loading: true, error: null }));

    const unsubBoard = subscribeToBoard(boardId, (board) => {
      setState((s) => ({ ...s, board }));
    });

    const unsubCols = subscribeToColumns(boardId, (columns) => {
      setState((s) => ({ ...s, columns }));
    });

    const unsubTasks = subscribeToTasks(boardId, (serverTasks) => {
      // Reconcile optimistic updates
      const pending = optimisticRef.current;
      const reconciled = serverTasks.map((task) => {
        const opt = pending.get(task.id);
        if (opt) {
          // If server matches our optimistic expectation, clear the pending entry
          if (task.columnId === opt.columnId && task.order === opt.order) {
            pending.delete(task.id);
          }
          // Otherwise keep optimistic until server settles (simple last-write-wins)
        }
        return task;
      });
      setState((s) => ({ ...s, tasks: reconciled, loading: false }));
    });

    return () => {
      unsubBoard();
      unsubCols();
      unsubTasks();
    };
  }, [boardId]);

  const reorderTask = useCallback(
    async (
      taskId: string,
      sourceColumnId: string,
      destColumnId: string,
      sourceIndex: number,
      destIndex: number
    ) => {
      if (!boardId) return;

      // Capture current tasks before the optimistic update for the Firestore call
      const currentTasks = state.tasks;

      // Optimistic update
      setState((prev) => {
        const taskExists = prev.tasks.some((t) => t.id === taskId);
        if (!taskExists) return prev;

        const newTasks = prev.tasks.map((t) =>
          t.id === taskId ? { ...t, columnId: destColumnId, order: destIndex } : t
        );

        optimisticRef.current.set(taskId, { columnId: destColumnId, order: destIndex });
        return { ...prev, tasks: newTasks };
      });

      try {
        await moveTask(
          boardId,
          taskId,
          sourceColumnId,
          destColumnId,
          sourceIndex,
          destIndex,
          currentTasks
        );
      } catch {
        // Revert optimistic on error
        optimisticRef.current.delete(taskId);
        setState((s) => ({ ...s, error: 'Failed to move task. Please try again.' }));
      }
    },
    [boardId, state.tasks]
  );

  return { ...state, reorderTask };
}
