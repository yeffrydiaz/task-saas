import {
  collection,
  doc,
  updateDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  getDoc,
  getDocs,
  writeBatch,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from './firebase';
import { Board, Column, Task, BoardMember, Role } from '@/types';
import { v4 as uuidv4 } from 'uuid';

// ─── Boards ────────────────────────────────────────────────────────────────

export async function createBoard(
  ownerId: string,
  ownerEmail: string,
  ownerDisplayName: string | null,
  title: string,
  description: string
): Promise<string> {
  const boardId = uuidv4();
  const now = Date.now();

  const defaultColumns: Column[] = [
    { id: uuidv4(), title: 'To Do', boardId, order: 0, color: '#6366f1', taskIds: [] },
    { id: uuidv4(), title: 'In Progress', boardId, order: 1, color: '#f59e0b', taskIds: [] },
    { id: uuidv4(), title: 'Review', boardId, order: 2, color: '#8b5cf6', taskIds: [] },
    { id: uuidv4(), title: 'Done', boardId, order: 3, color: '#10b981', taskIds: [] },
  ];

  const batch = writeBatch(db);

  const board: Board = {
    id: boardId,
    title,
    description,
    ownerId,
    members: {
      [ownerId]: {
        uid: ownerId,
        email: ownerEmail,
        displayName: ownerDisplayName,
        role: 'admin',
      },
    },
    createdAt: now,
    updatedAt: now,
    columnOrder: defaultColumns.map((c) => c.id),
  };

  batch.set(doc(db, 'boards', boardId), board);

  for (const col of defaultColumns) {
    batch.set(doc(db, 'boards', boardId, 'columns', col.id), col);
  }

  await batch.commit();
  return boardId;
}

export function subscribeToBoard(
  boardId: string,
  callback: (board: Board | null) => void
): Unsubscribe {
  return onSnapshot(doc(db, 'boards', boardId), (snap) => {
    callback(snap.exists() ? (snap.data() as Board) : null);
  });
}

export function subscribeToUserBoards(
  userId: string,
  callback: (boards: Board[]) => void
): Unsubscribe {
  const q = query(
    collection(db, 'boards'),
    where(`members.${userId}.uid`, '==', userId)
  );
  return onSnapshot(q, (snap) => {
    const boards = snap.docs.map((d) => d.data() as Board);
    callback(boards);
  });
}

export async function updateBoard(
  boardId: string,
  updates: Partial<Pick<Board, 'title' | 'description'>>
): Promise<void> {
  await updateDoc(doc(db, 'boards', boardId), { ...updates, updatedAt: Date.now() });
}

export async function deleteBoard(boardId: string): Promise<void> {
  // Delete sub-collections
  const colSnap = await getDocs(collection(db, 'boards', boardId, 'columns'));
  const taskSnap = await getDocs(collection(db, 'boards', boardId, 'tasks'));

  const batch = writeBatch(db);
  colSnap.docs.forEach((d) => batch.delete(d.ref));
  taskSnap.docs.forEach((d) => batch.delete(d.ref));
  batch.delete(doc(db, 'boards', boardId));
  await batch.commit();
}

export async function inviteMember(
  boardId: string,
  member: BoardMember
): Promise<void> {
  await updateDoc(doc(db, 'boards', boardId), {
    [`members.${member.uid}`]: member,
    updatedAt: Date.now(),
  });
}

export async function updateMemberRole(
  boardId: string,
  memberId: string,
  role: Role
): Promise<void> {
  await updateDoc(doc(db, 'boards', boardId), {
    [`members.${memberId}.role`]: role,
    updatedAt: Date.now(),
  });
}

export async function removeMember(
  boardId: string,
  memberId: string
): Promise<void> {
  const boardRef = doc(db, 'boards', boardId);
  const boardSnap = await getDoc(boardRef);
  if (!boardSnap.exists()) return;

  const board = boardSnap.data() as Board;
  const remainingMembers = Object.fromEntries(
    Object.entries(board.members).filter(([key]) => key !== memberId)
  );
  await updateDoc(boardRef, { members: remainingMembers, updatedAt: Date.now() });
}

// ─── Columns ───────────────────────────────────────────────────────────────

export function subscribeToColumns(
  boardId: string,
  callback: (columns: Column[]) => void
): Unsubscribe {
  const q = query(
    collection(db, 'boards', boardId, 'columns'),
    orderBy('order', 'asc')
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => d.data() as Column));
  });
}

export async function createColumn(
  boardId: string,
  title: string,
  order: number
): Promise<string> {
  const colId = uuidv4();
  const col: Column = {
    id: colId,
    title,
    boardId,
    order,
    color: '#6366f1',
    taskIds: [],
  };

  const batch = writeBatch(db);
  batch.set(doc(db, 'boards', boardId, 'columns', colId), col);
  batch.update(doc(db, 'boards', boardId), {
    columnOrder: [...(await getColumnOrder(boardId)), colId],
    updatedAt: Date.now(),
  });
  await batch.commit();
  return colId;
}

async function getColumnOrder(boardId: string): Promise<string[]> {
  const snap = await getDoc(doc(db, 'boards', boardId));
  return snap.exists() ? (snap.data() as Board).columnOrder : [];
}

export async function updateColumn(
  boardId: string,
  colId: string,
  updates: Partial<Pick<Column, 'title' | 'color' | 'order'>>
): Promise<void> {
  await updateDoc(doc(db, 'boards', boardId, 'columns', colId), updates);
}

export async function deleteColumn(boardId: string, colId: string): Promise<void> {
  // Move tasks to first column or delete them
  const taskSnap = await getDocs(
    query(collection(db, 'boards', boardId, 'tasks'), where('columnId', '==', colId))
  );
  const boardSnap = await getDoc(doc(db, 'boards', boardId));
  const board = boardSnap.data() as Board;
  const newOrder = board.columnOrder.filter((id) => id !== colId);

  const batch = writeBatch(db);
  taskSnap.docs.forEach((d) => batch.delete(d.ref));
  batch.delete(doc(db, 'boards', boardId, 'columns', colId));
  batch.update(doc(db, 'boards', boardId), { columnOrder: newOrder, updatedAt: Date.now() });
  await batch.commit();
}

// ─── Tasks ─────────────────────────────────────────────────────────────────

export function subscribeToTasks(
  boardId: string,
  callback: (tasks: Task[]) => void
): Unsubscribe {
  const q = query(
    collection(db, 'boards', boardId, 'tasks'),
    orderBy('order', 'asc')
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => d.data() as Task));
  });
}

export async function createTask(
  boardId: string,
  columnId: string,
  createdBy: string,
  title: string,
  description: string,
  priority: Task['priority'],
  assigneeId: string | null,
  tags: string[],
  order: number
): Promise<string> {
  const taskId = uuidv4();
  const now = Date.now();
  const task: Task = {
    id: taskId,
    title,
    description,
    priority,
    assigneeId,
    columnId,
    boardId,
    order,
    createdAt: now,
    updatedAt: now,
    createdBy,
    tags,
  };

  const batch = writeBatch(db);
  batch.set(doc(db, 'boards', boardId, 'tasks', taskId), task);
  batch.update(doc(db, 'boards', boardId, 'columns', columnId), {
    taskIds: [...(await getColumnTaskIds(boardId, columnId)), taskId],
  });
  await batch.commit();
  return taskId;
}

async function getColumnTaskIds(boardId: string, colId: string): Promise<string[]> {
  const snap = await getDoc(doc(db, 'boards', boardId, 'columns', colId));
  return snap.exists() ? (snap.data() as Column).taskIds : [];
}

export async function updateTask(
  boardId: string,
  taskId: string,
  updates: Partial<Omit<Task, 'id' | 'boardId' | 'createdAt' | 'createdBy'>>
): Promise<void> {
  await updateDoc(doc(db, 'boards', boardId, 'tasks', taskId), {
    ...updates,
    updatedAt: Date.now(),
  });
}

export async function deleteTask(
  boardId: string,
  taskId: string,
  columnId: string
): Promise<void> {
  const colRef = doc(db, 'boards', boardId, 'columns', columnId);
  const colSnap = await getDoc(colRef);
  const col = colSnap.data() as Column;
  const newTaskIds = col.taskIds.filter((id) => id !== taskId);

  const batch = writeBatch(db);
  batch.delete(doc(db, 'boards', boardId, 'tasks', taskId));
  batch.update(colRef, { taskIds: newTaskIds });
  await batch.commit();
}

export async function moveTask(
  boardId: string,
  taskId: string,
  sourceColumnId: string,
  destColumnId: string,
  sourceIndex: number,
  destIndex: number,
  allTasks: Task[]
): Promise<void> {
  const batch = writeBatch(db);

  if (sourceColumnId === destColumnId) {
    // Reorder within same column
    const colTasks = allTasks
      .filter((t) => t.columnId === sourceColumnId)
      .sort((a, b) => a.order - b.order);

    const reordered = Array.from(colTasks);
    const [moved] = reordered.splice(sourceIndex, 1);
    reordered.splice(destIndex, 0, moved);

    reordered.forEach((task, idx) => {
      batch.update(doc(db, 'boards', boardId, 'tasks', task.id), {
        order: idx,
        updatedAt: Date.now(),
      });
    });

    const newTaskIds = reordered.map((t) => t.id);
    batch.update(doc(db, 'boards', boardId, 'columns', sourceColumnId), {
      taskIds: newTaskIds,
    });
  } else {
    // Move between columns
    const sourceTasks = allTasks
      .filter((t) => t.columnId === sourceColumnId)
      .sort((a, b) => a.order - b.order);
    const destTasks = allTasks
      .filter((t) => t.columnId === destColumnId)
      .sort((a, b) => a.order - b.order);

    const sourceReordered = Array.from(sourceTasks);
    const [moved] = sourceReordered.splice(sourceIndex, 1);
    const destReordered = Array.from(destTasks);
    destReordered.splice(destIndex, 0, moved);

    // Reorder dest column — update ALL tasks including the moved one
    destReordered.forEach((task, idx) => {
      batch.update(doc(db, 'boards', boardId, 'tasks', task.id), {
        columnId: destColumnId,
        order: idx,
        updatedAt: Date.now(),
      });
    });

    // Reorder source column
    sourceReordered.forEach((task, idx) => {
      batch.update(doc(db, 'boards', boardId, 'tasks', task.id), {
        order: idx,
        updatedAt: Date.now(),
      });
    });

    batch.update(doc(db, 'boards', boardId, 'columns', sourceColumnId), {
      taskIds: sourceReordered.map((t) => t.id),
    });
    batch.update(doc(db, 'boards', boardId, 'columns', destColumnId), {
      taskIds: destReordered.map((t) => t.id),
    });
  }

  await batch.commit();
}
