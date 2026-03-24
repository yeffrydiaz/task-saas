'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { useBoardRealtime } from '@/hooks/useBoardRealtime';
import { updateBoard } from '@/lib/firestore';
import { Role } from '@/types';
import Navbar from '@/components/layout/Navbar';
import KanbanBoard from '@/components/board/KanbanBoard';
import MembersModal from '@/components/board/MembersModal';

export default function BoardPage() {
  const { boardId } = useParams<{ boardId: string }>();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { board, columns, tasks, loading, error, reorderTask } = useBoardRealtime(boardId);
  const [showMembers, setShowMembers] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState('');

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [user, authLoading, router]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!board || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <p className="text-slate-500 mb-4">Board not found or you don&apos;t have access.</p>
          <button onClick={() => router.push('/dashboard')} className="text-indigo-600 hover:underline text-sm">
            Back to dashboard
          </button>
        </div>
      </div>
    );
  }

  const myRole: Role = board.members[user.uid]?.role ?? 'viewer';

  const handleStartEditing = () => {
    setTitleInput(board.title);
    setEditingTitle(true);
  };

  const handleTitleSave = async () => {
    if (titleInput.trim() && titleInput.trim() !== board.title) {
      await updateBoard(boardId, { title: titleInput.trim() });
    }
    setEditingTitle(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />

      {/* Board header */}
      <div className="bg-white border-b border-slate-200 px-4 py-3">
        <div className="max-w-full flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => router.push('/dashboard')}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors flex-shrink-0"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            {editingTitle && myRole === 'admin' ? (
              <input
                autoFocus
                value={titleInput}
                onChange={(e) => setTitleInput(e.target.value)}
                onBlur={handleTitleSave}
                onKeyDown={(e) => { if (e.key === 'Enter') handleTitleSave(); if (e.key === 'Escape') setEditingTitle(false); }}
                className="text-lg font-bold text-slate-800 bg-transparent border-b-2 border-indigo-500 focus:outline-none min-w-0"
              />
            ) : (
              <h1
                className={`text-lg font-bold text-slate-800 truncate ${myRole === 'admin' ? 'cursor-pointer hover:text-indigo-600' : ''}`}
                onClick={myRole === 'admin' ? handleStartEditing : undefined}
                title={myRole === 'admin' ? 'Click to rename' : undefined}
              >
                {board.title}
              </h1>
            )}
          </div>

          <div className="flex items-center gap-3 flex-shrink-0">
            {/* Real-time indicator */}
            <div className="flex items-center gap-1.5 text-xs text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live
            </div>

            {/* Members */}
            <div className="flex -space-x-1">
              {Object.values(board.members)
                .slice(0, 3)
                .map((m) => (
                  <div
                    key={m.uid}
                    className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 border-2 border-white flex items-center justify-center text-white text-xs font-semibold"
                    title={m.displayName ?? m.email}
                  >
                    {(m.displayName ?? m.email)[0]?.toUpperCase()}
                  </div>
                ))}
            </div>

            <button
              onClick={() => setShowMembers(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              Members
            </button>
          </div>
        </div>

        {error && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-xs text-red-600 bg-red-50 px-3 py-1.5 rounded-lg mt-2 max-w-max"
          >
            ⚠️ {error}
          </motion.p>
        )}
      </div>

      {/* Kanban board */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <KanbanBoard
          board={board}
          columns={columns}
          tasks={tasks}
          currentUserId={user.uid}
          currentRole={myRole}
          onTaskMove={reorderTask}
        />
      </div>

      <AnimatePresence>
        {showMembers && (
          <MembersModal
            isOpen={showMembers}
            onClose={() => setShowMembers(false)}
            board={board}
            currentUserId={user.uid}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
