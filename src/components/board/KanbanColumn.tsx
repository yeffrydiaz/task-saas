'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Droppable, Draggable } from '@hello-pangea/dnd';
import { Column, Task, Role } from '@/types';
import TaskCard from './TaskCard';

interface KanbanColumnProps {
  column: Column;
  tasks: Task[];
  role: Role;
  memberNames: Record<string, string>;
  onAddTask: (columnId: string) => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (task: Task) => void;
  onEditColumn: (column: Column) => void;
  onDeleteColumn: (column: Column) => void;
}

export default function KanbanColumn({
  column,
  tasks,
  role,
  memberNames,
  onAddTask,
  onEditTask,
  onDeleteTask,
  onEditColumn,
  onDeleteColumn,
}: KanbanColumnProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const canEdit = role === 'admin' || role === 'member';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex flex-col w-72 flex-shrink-0"
    >
      {/* Column header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <span
            className="w-3 h-3 rounded-full flex-shrink-0"
            style={{ backgroundColor: column.color }}
          />
          <h3 className="text-sm font-semibold text-slate-700 truncate max-w-[160px]">
            {column.title}
          </h3>
          <span className="text-xs font-medium text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full">
            {tasks.length}
          </span>
        </div>

        {role === 'admin' && (
          <div className="relative">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="p-1 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 5a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm0 7a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm0 7a1.5 1.5 0 110-3 1.5 1.5 0 010 3z" />
              </svg>
            </button>
            <AnimatePresence>
              {menuOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -4 }}
                  transition={{ duration: 0.1 }}
                  className="absolute right-0 top-7 z-20 bg-white rounded-lg shadow-lg border border-slate-200 py-1 w-36"
                >
                  <button
                    onClick={() => { setMenuOpen(false); onEditColumn(column); }}
                    className="w-full text-left px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    Rename
                  </button>
                  <button
                    onClick={() => { setMenuOpen(false); onDeleteColumn(column); }}
                    className="w-full text-left px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    Delete column
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Droppable area */}
      <Droppable droppableId={column.id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`
              flex-1 min-h-[120px] rounded-xl p-2 transition-colors duration-150
              ${snapshot.isDraggingOver ? 'bg-indigo-50 border-2 border-dashed border-indigo-300' : 'bg-slate-50 border-2 border-transparent'}
            `}
          >
            <AnimatePresence>
              {tasks.map((task, index) => (
                <Draggable
                  key={task.id}
                  draggableId={task.id}
                  index={index}
                  isDragDisabled={!canEdit}
                >
                  {(dragProvided, dragSnapshot) => (
                    <div
                      ref={dragProvided.innerRef}
                      {...dragProvided.draggableProps}
                      {...dragProvided.dragHandleProps}
                      className="mb-2 last:mb-0"
                    >
                      <TaskCard
                        task={task}
                        role={role}
                        memberNames={memberNames}
                        onEdit={onEditTask}
                        onDelete={onDeleteTask}
                        isDragging={dragSnapshot.isDragging}
                      />
                    </div>
                  )}
                </Draggable>
              ))}
            </AnimatePresence>
            {provided.placeholder}
          </div>
        )}
      </Droppable>

      {/* Add task button */}
      {canEdit && (
        <button
          onClick={() => onAddTask(column.id)}
          className="mt-2 flex items-center gap-1.5 w-full px-3 py-2 text-sm text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add task
        </button>
      )}
    </motion.div>
  );
}
