'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Board, BoardMember, Role } from '@/types';
import { updateMemberRole, removeMember, inviteMember } from '@/lib/firestore';

interface MembersModalProps {
  isOpen: boolean;
  onClose: () => void;
  board: Board;
  currentUserId: string;
}

const ROLES: Role[] = ['admin', 'member', 'viewer'];

const ROLE_COLORS: Record<Role, string> = {
  admin: 'bg-purple-100 text-purple-700',
  member: 'bg-blue-100 text-blue-700',
  viewer: 'bg-slate-100 text-slate-600',
};

export default function MembersModal({ isOpen, onClose, board, currentUserId }: MembersModalProps) {
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<Role>('member');
  const [inviteName, setInviteName] = useState('');
  const [inviteUid, setInviteUid] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const members = Object.values(board.members);
  const myRole = board.members[currentUserId]?.role;

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim() || !inviteUid.trim()) {
      setError('Email and UID are required.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const member: BoardMember = {
        uid: inviteUid.trim(),
        email: inviteEmail.trim(),
        displayName: inviteName.trim() || null,
        role: inviteRole,
      };
      await inviteMember(board.id, member);
      setInviteEmail('');
      setInviteName('');
      setInviteUid('');
    } catch {
      setError('Failed to invite member.');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (memberId: string, role: Role) => {
    await updateMemberRole(board.id, memberId, role);
  };

  const handleRemove = async (memberId: string) => {
    if (!confirm('Remove this member from the board?')) return;
    await removeMember(board.id, memberId);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg z-10 overflow-hidden"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-lg font-semibold text-slate-800">Board Members</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-4 max-h-96 overflow-y-auto">
          <ul className="space-y-3">
            {members.map((m) => (
              <li key={m.uid} className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
                  {(m.displayName ?? m.email)[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{m.displayName ?? m.email}</p>
                  <p className="text-xs text-slate-400 truncate">{m.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  {myRole === 'admin' && m.uid !== board.ownerId ? (
                    <select
                      value={m.role}
                      onChange={(e) => handleRoleChange(m.uid, e.target.value as Role)}
                      className={`text-xs font-medium px-2 py-1 rounded-full border-0 focus:ring-2 focus:ring-indigo-500 ${ROLE_COLORS[m.role]}`}
                    >
                      {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                  ) : (
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${ROLE_COLORS[m.role]}`}>{m.role}</span>
                  )}
                  {myRole === 'admin' && m.uid !== currentUserId && m.uid !== board.ownerId && (
                    <button
                      onClick={() => handleRemove(m.uid)}
                      className="p-1 rounded-md hover:bg-red-50 text-slate-300 hover:text-red-500 transition-colors"
                      title="Remove member"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>

        {myRole === 'admin' && (
          <div className="px-6 py-4 border-t border-slate-100 bg-slate-50">
            <p className="text-sm font-medium text-slate-700 mb-3">Invite member</p>
            <form onSubmit={handleInvite} className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={inviteUid}
                  onChange={(e) => setInviteUid(e.target.value)}
                  placeholder="Firebase UID"
                  className="px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="Email address"
                  className="px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  placeholder="Display name (optional)"
                  className="px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as Role)}
                  className="px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                >
                  {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              {error && <p className="text-xs text-red-500">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
              >
                {loading ? 'Inviting…' : 'Invite'}
              </button>
            </form>
          </div>
        )}
      </motion.div>
    </div>
  );
}
