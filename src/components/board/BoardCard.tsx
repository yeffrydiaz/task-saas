'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { deleteBoard } from '@/lib/firestore';
import { Board } from '@/types';

interface BoardCardProps {
  board: Board;
}

export default function BoardCard({ board }: BoardCardProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [deleting, setDeleting] = useState(false);

  const myRole = board.members[user?.uid ?? '']?.role;
  const memberCount = Object.keys(board.members).length;

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Delete board "${board.title}"? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      await deleteBoard(board.id);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      onClick={() => router.push(`/board/${board.id}`)}
      className={`
        group relative bg-white rounded-2xl border border-slate-200 p-5 shadow-sm
        hover:shadow-md hover:border-indigo-300 cursor-pointer transition-all duration-150
        ${deleting ? 'opacity-50' : ''}
      `}
    >
      <div className="flex items-start justify-between mb-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-lg font-bold"
          style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
        >
          {board.title[0]?.toUpperCase()}
        </div>
        {myRole === 'admin' && (
          <button
            onClick={handleDelete}
            className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-50 text-slate-300 hover:text-red-500 transition-all"
            title="Delete board"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        )}
      </div>

      <h3 className="font-semibold text-slate-800 mb-1 truncate">{board.title}</h3>
      {board.description && (
        <p className="text-sm text-slate-500 mb-3 line-clamp-2">{board.description}</p>
      )}

      <div className="flex items-center justify-between">
        <div className="flex -space-x-1">
          {Object.values(board.members)
            .slice(0, 4)
            .map((m) => (
              <div
                key={m.uid}
                className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 border-2 border-white flex items-center justify-center text-white text-xs font-semibold"
                title={m.displayName ?? m.email}
              >
                {(m.displayName ?? m.email)[0]?.toUpperCase()}
              </div>
            ))}
          {memberCount > 4 && (
            <div className="w-6 h-6 rounded-full bg-slate-200 border-2 border-white flex items-center justify-center text-slate-600 text-xs font-semibold">
              +{memberCount - 4}
            </div>
          )}
        </div>
        <span
          className={`text-xs font-medium px-2 py-0.5 rounded-full ${
            myRole === 'admin' ? 'bg-purple-100 text-purple-700' :
            myRole === 'member' ? 'bg-blue-100 text-blue-700' :
            'bg-slate-100 text-slate-600'
          }`}
        >
          {myRole}
        </span>
      </div>
    </motion.div>
  );
}
