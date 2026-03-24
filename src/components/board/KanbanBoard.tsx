'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { DragDropContext, DropResult } from '@hello-pangea/dnd';
import { Board, Column, Task, Role } from '@/types';
import KanbanColumn from './KanbanColumn';
import TaskModal from './TaskModal';
import { createTask, updateTask, deleteTask, createColumn, updateColumn, deleteColumn } from '@/lib/firestore';

interface KanbanBoardProps {
  board: Board;
  columns: Column[];
  tasks: Task[];
  currentUserId: string;
  currentRole: Role;
  onTaskMove: (
    taskId: string,
    sourceColId: string,
    destColId: string,
    sourceIdx: number,
    destIdx: number
  ) => void;
}

export default function KanbanBoard({
  board,
  columns,
  tasks,
  currentUserId,
  currentRole,
  onTaskMove,
}: KanbanBoardProps) {
  const [addingToColumn, setAddingToColumn] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [addingColumn, setAddingColumn] = useState(false);
  const [newColumnTitle, setNewColumnTitle] = useState('');
  const [editingColumn, setEditingColumn] = useState<Column | null>(null);
  const [editColumnTitle, setEditColumnTitle] = useState('');

  const memberNames: Record<string, string> = {};
  Object.values(board.members).forEach((m) => {
    memberNames[m.uid] = m.displayName ?? m.email;
  });

  const sortedColumns = [...columns].sort((a, b) => a.order - b.order);

  const getColumnTasks = (colId: string) =>
    tasks
      .filter((t) => t.columnId === colId)
      .sort((a, b) => a.order - b.order);

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const { source, destination, draggableId } = result;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    onTaskMove(
      draggableId,
      source.droppableId,
      destination.droppableId,
      source.index,
      destination.index
    );
  };

  const handleAddTask = async (data: {
    title: string;
    description: string;
    priority: Task['priority'];
    assigneeId: string | null;
    tags: string[];
  }) => {
    if (!addingToColumn) return;
    const colTasks = getColumnTasks(addingToColumn);
    await createTask(
      board.id,
      addingToColumn,
      currentUserId,
      data.title,
      data.description,
      data.priority,
      data.assigneeId,
      data.tags,
      colTasks.length
    );
  };

  const handleEditTask = async (data: {
    title: string;
    description: string;
    priority: Task['priority'];
    assigneeId: string | null;
    tags: string[];
  }) => {
    if (!editingTask) return;
    await updateTask(board.id, editingTask.id, data);
  };

  const handleDeleteTask = async (task: Task) => {
    if (!confirm(`Delete task "${task.title}"?`)) return;
    await deleteTask(board.id, task.id, task.columnId);
  };

  const handleAddColumn = async () => {
    const title = newColumnTitle.trim();
    if (!title) return;
    await createColumn(board.id, title, columns.length);
    setNewColumnTitle('');
    setAddingColumn(false);
  };

  const handleRenameColumn = async () => {
    if (!editingColumn || !editColumnTitle.trim()) return;
    await updateColumn(board.id, editingColumn.id, { title: editColumnTitle.trim() });
    setEditingColumn(null);
    setEditColumnTitle('');
  };

  const handleDeleteColumn = async (col: Column) => {
    if (!confirm(`Delete column "${col.title}" and all its tasks?`)) return;
    await deleteColumn(board.id, col.id);
  };

  return (
    <div className="flex-1 overflow-x-auto">
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex gap-4 p-4 min-w-max">
          {sortedColumns.map((col) => (
            <KanbanColumn
              key={col.id}
              column={col}
              tasks={getColumnTasks(col.id)}
              role={currentRole}
              memberNames={memberNames}
              onAddTask={setAddingToColumn}
              onEditTask={setEditingTask}
              onDeleteTask={handleDeleteTask}
              onEditColumn={(c) => { setEditingColumn(c); setEditColumnTitle(c.title); }}
              onDeleteColumn={handleDeleteColumn}
            />
          ))}

          {/* Add column */}
          {currentRole === 'admin' && (
            <div className="w-72 flex-shrink-0">
              {addingColumn ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-white rounded-xl border border-slate-200 p-3 shadow-sm"
                >
                  <input
                    autoFocus
                    type="text"
                    value={newColumnTitle}
                    onChange={(e) => setNewColumnTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddColumn();
                      if (e.key === 'Escape') { setAddingColumn(false); setNewColumnTitle(''); }
                    }}
                    placeholder="Column title…"
                    className="w-full px-2 py-1.5 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-2"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleAddColumn}
                      className="flex-1 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
                    >
                      Add
                    </button>
                    <button
                      onClick={() => { setAddingColumn(false); setNewColumnTitle(''); }}
                      className="px-3 py-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </motion.div>
              ) : (
                <button
                  onClick={() => setAddingColumn(true)}
                  className="flex items-center gap-2 w-full px-4 py-3 rounded-xl border-2 border-dashed border-slate-200 text-slate-400 hover:text-indigo-600 hover:border-indigo-300 transition-colors text-sm font-medium"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add column
                </button>
              )}
            </div>
          )}
        </div>
      </DragDropContext>

      {/* Task modals */}
      {addingToColumn && (
        <TaskModal
          isOpen
          onClose={() => setAddingToColumn(null)}
          onSubmit={handleAddTask}
          board={board}
          title="New Task"
        />
      )}

      {editingTask && (
        <TaskModal
          isOpen
          onClose={() => setEditingTask(null)}
          onSubmit={handleEditTask}
          initialData={editingTask}
          board={board}
          title="Edit Task"
        />
      )}

      {/* Column rename modal */}
      {editingColumn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setEditingColumn(null)} />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm z-10 p-6"
          >
            <h2 className="text-lg font-semibold text-slate-800 mb-4">Rename Column</h2>
            <input
              autoFocus
              type="text"
              value={editColumnTitle}
              onChange={(e) => setEditColumnTitle(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleRenameColumn(); if (e.key === 'Escape') setEditingColumn(null); }}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-4"
            />
            <div className="flex justify-end gap-3">
              <button onClick={() => setEditingColumn(null)} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800">Cancel</button>
              <button onClick={handleRenameColumn} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors">Rename</button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
