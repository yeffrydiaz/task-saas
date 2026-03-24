export type Role = 'admin' | 'member' | 'viewer';

export type Priority = 'low' | 'medium' | 'high' | 'urgent';

export interface User {
  uid: string;
  email: string;
  displayName: string | null;
  photoURL: string | null;
}

export interface BoardMember {
  uid: string;
  email: string;
  displayName: string | null;
  role: Role;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  priority: Priority;
  assigneeId: string | null;
  columnId: string;
  boardId: string;
  order: number;
  createdAt: number;
  updatedAt: number;
  createdBy: string;
  tags: string[];
}

export interface Column {
  id: string;
  title: string;
  boardId: string;
  order: number;
  color: string;
  taskIds: string[];
}

export interface Board {
  id: string;
  title: string;
  description: string;
  ownerId: string;
  members: Record<string, BoardMember>;
  createdAt: number;
  updatedAt: number;
  columnOrder: string[];
}

export interface BoardWithColumns extends Board {
  columns: Record<string, Column>;
  tasks: Record<string, Task>;
}
