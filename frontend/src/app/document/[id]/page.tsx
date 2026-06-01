'use client';
import { useCallback, useEffect, useState, useRef } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import api from '@/lib/api';
import Modal from '@/components/Modal';
import Toast from '@/components/Toast';
import RichTextEditor from '@/components/RichTextEditor';
import UserSearchInput from '@/components/UserSearchInput';
import CollaboratorsManager from '@/components/CollaboratorsManager';
import DOMPurify from 'dompurify';
import { io, Socket } from 'socket.io-client';
import type { Node, Edge } from '@xyflow/react';

const MindMapEditor = dynamic(() => import('@/components/MindMapEditor'), { ssr: false });

interface Comment {
  _id: string;
  documentId?: string;   // <-- добавить эту строку
  userId: string;
  userName: string;
  text: string;
  createdAt: string;
}

export default function DocumentPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params.id as string;
  const type = searchParams.get('type') || 'document';

  const [doc, setDoc] = useState<any>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [permission, setPermission] = useState<string | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [currentUserName, setCurrentUserName] = useState('Вы');
  const [currentUserId, setCurrentUserId] = useState('');
  const titleInputRef = useRef<HTMLInputElement>(null);

  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareUser, setShareUser] = useState<{ id: string; email: string } | null>(null);
  const [sharePermission, setSharePermission] = useState('view');

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  const [socket, setSocket] = useState<Socket | null>(null);
  const [refreshParticipants, setRefreshParticipants] = useState(0);

  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Флаг для предотвращения повторной отправки событий, полученных по сокету
  const receivingUpdate = useRef(false);

  useEffect(() => {
    if (!id) return;
    loadData();
    loadProfile();
  }, [id, type]);

  useEffect(() => {
    if (!id || !currentUserId) return;
    const newSocket = io('http://localhost:4003', {
      auth: { token: localStorage.getItem('accessToken') },
    });
    setSocket(newSocket);
    newSocket.emit('join_document', id);

    newSocket.on('content_updated', (data: { content?: string; nodes?: Node[]; edges?: Edge[]; userId: string }) => {
      if (data.userId !== currentUserId) {
        receivingUpdate.current = true;
        if (data.content !== undefined) {
          setContent(data.content);
        }
        if (data.nodes && data.edges) {
          setNodes(data.nodes);
          setEdges(data.edges);
        }
        // Через короткое время сбрасываем флаг, чтобы наши собственные изменения снова отправлялись
        setTimeout(() => { receivingUpdate.current = false; }, 100);
      }
    });

    newSocket.on('title_updated', (data: { title: string; userId: string }) => {
      if (data.userId !== currentUserId) {
        setTitle(data.title);
        setDoc((prev: any) => (prev ? { ...prev, title: data.title } : null));
      }
    });

    newSocket.on('participants_updated', () => {
      setRefreshParticipants((p) => p + 1);
      api
        .get(`/shares/check/${id}?type=${type}`)
        .then((res) => {
          const isOwner = doc?.owner === currentUserId;
          if (isOwner) {
            setPermission('edit');
          } else {
            setPermission(res.data.permission);
          }
        })
        .catch(console.error);
    });

    newSocket.on('role_changed', (data: { userId: string; permission: string; documentId: string }) => {
      if (data.userId === currentUserId && data.documentId === id) {
        setPermission(data.permission);
      }
    });

    newSocket.on('kicked_from_document', (data: { userId: string; documentId: string }) => {
      if (data.userId === currentUserId && data.documentId === id) {
        window.location.href = '/dashboard';
      }
    });

    newSocket.on('document_deleted', () => {
      window.location.href = '/dashboard';
    });

    // Слушатель новых комментариев
    newSocket.on('comment_added', (comment: Comment) => {
      if (comment.documentId === id) {
        setComments((prev) => [...prev, comment]);
      }
    });

    return () => {
      newSocket.emit('leave_document', id);
      newSocket.disconnect();
    };
  }, [id, currentUserId]);

  const loadProfile = async () => {
    try {
      const { data } = await api.get('/auth/me');
      setCurrentUserName(data.name);
      setCurrentUserId(data._id);
    } catch (e) {
      console.error('Failed to load profile', e);
    }
  };

  const loadData = async () => {
    try {
      const endpoint = type === 'document' ? `/documents/${id}` : `/mindmaps/${id}`;
      const res = await api.get(endpoint);
      const item = res.data;
      setDoc(item);
      setTitle(item.title);
      if (type === 'document') {
        setContent(DOMPurify.sanitize(item.content || ''));
      } else {
        setNodes(item.nodes || []);
        setEdges(item.edges || []);
      }

      const permRes = await api.get(`/shares/check/${id}?type=${type}`);
      const accessToken = localStorage.getItem('accessToken');
      if (accessToken) {
        const payload = JSON.parse(atob(accessToken.split('.')[1]));
        const isOwner = item.owner === payload.userId;
        setPermission(isOwner ? 'edit' : permRes.data.permission);
        setCurrentUserId(payload.userId);
      }

      const commRes = await api.get(`/comments/${id}`);
      setComments(commRes.data);
    } catch (e) {
      console.error(e);
    }
  };

  // Автосохранение с уменьшенной задержкой (500 мс)
  useEffect(() => {
    if (permission !== 'edit') return;
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      performSave(false);
    }, 1000);
    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    };
  }, [content, nodes, edges, permission]);

  const performSave = async (showToast = true) => {
    if (permission !== 'edit') return;
    try {
      setSaving(true);
      const payload =
        type === 'document'
          ? { content: DOMPurify.sanitize(content) }
          : { nodes, edges };
      const endpoint = type === 'document' ? `/documents/${id}` : `/mindmaps/${id}`;
      await api.put(endpoint, payload);
      if (showToast) setToastMessage('Сохранено');

      // Отправка сокет-события (только если это изменение не было получено по сокету)
      if (socket && !receivingUpdate.current) {
        if (type === 'document') {
          socket.emit('content_updated', {
            documentId: id,
            content: payload.content,
            userId: currentUserId,
          });
        } else {
          socket.emit('content_updated', {
            documentId: id,
            nodes: payload.nodes,
            edges: payload.edges,
            userId: currentUserId,
          });
        }
      }
    } catch (e: any) {
      if (showToast) setToastMessage('Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  const handleSave = () => performSave(true);

  // Мгновенная отправка изменений карты (без ожидания автосохранения)
  const handleMindMapChange = useCallback(
    (newNodes: Node[], newEdges: Edge[]) => {
      setNodes(newNodes);
      setEdges(newEdges);
      // Отправляем событие сразу, чтобы другие участники видели изменения
      if (socket && !receivingUpdate.current) {
        socket.emit('content_updated', {
          documentId: id,
          nodes: newNodes,
          edges: newEdges,
          userId: currentUserId,
        });
      }
    },
    [socket, currentUserId, id, receivingUpdate],
  );

  const confirmDelete = async () => {
    try {
      const endpoint = type === 'document' ? `/documents/${id}` : `/mindmaps/${id}`;
      await api.delete(endpoint);
      window.location.href = '/dashboard';
    } catch (e: any) {
      setToastMessage('Ошибка при удалении');
    }
    setDeleteModalOpen(false);
  };

  const openShareModal = () => {
    setShareUser(null);
    setSharePermission('view');
    setShareModalOpen(true);
  };

  const handleShare = async () => {
    if (!shareUser) return;
    try {
      await api.post('/invitations', {
        documentId: id,
        documentType: type,
        toUser: shareUser.id,
        permission: sharePermission,
      });
      setShareModalOpen(false);
      setToastMessage('Приглашение отправлено');
    } catch (e: any) {
      setToastMessage('Ошибка при отправке приглашения');
    }
  };

  const addComment = async () => {
    if (!newComment.trim()) return;
    try {
      const { data } = await api.post(`/comments/${id}`, { text: newComment, userName: currentUserName });
      // Комментарий будет добавлен в список через сокет (comment_added), но на всякий случай добавим локально
      setComments((prev) => [...prev, data]);
      setNewComment('');
    } catch (e: any) {
      setToastMessage('Ошибка при добавлении комментария');
    }
  };

  const handleBack = async () => {
    await performSave(false);
    window.location.href = '/dashboard';
  };

  const startEditingTitle = () => {
    if (permission === 'edit') setEditingTitle(true);
  };

  const saveTitle = async () => {
    setEditingTitle(false);
    if (permission !== 'edit' || title.trim() === doc.title) return;
    try {
      await api.put(
        type === 'document' ? `/documents/${id}` : `/mindmaps/${id}`,
        { title },
      );
      setDoc({ ...doc, title });
      if (socket) {
        socket.emit('title_updated', { documentId: id, title, userId: currentUserId });
      }
    } catch {
      setTitle(doc.title);
      setToastMessage('Не удалось переименовать');
    }
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') saveTitle();
    if (e.key === 'Escape') {
      setTitle(doc.title);
      setEditingTitle(false);
    }
  };

  useEffect(() => {
    if (editingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [editingTitle]);

  if (!doc) return <div className="p-4">Загрузка...</div>;

  const canView = permission !== null;
  const canComment = permission === 'comment' || permission === 'edit';
  const canEdit = permission === 'edit';

  return (
    <div className="max-w-6xl mx-auto p-4">
      <div className="flex items-center gap-4 mb-4 relative z-20">
        <button onClick={handleBack} className="text-blue-600 hover:underline">
          ← Назад к списку
        </button>
        {canEdit && (
          <button onClick={() => setDeleteModalOpen(true)} className="text-red-600 hover:underline ml-auto">
            Удалить
          </button>
        )}
      </div>
      <div className="mb-4">
        {canEdit ? (
          editingTitle ? (
            <input
              ref={titleInputRef}
              className="text-2xl font-bold w-full border-b-2 border-blue-500 outline-none bg-transparent dark:text-white"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={saveTitle}
              onKeyDown={handleTitleKeyDown}
            />
          ) : (
            <h1
              className="text-2xl font-bold cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 rounded p-1 dark:text-white"
              onClick={startEditingTitle}
            >
              {title}
            </h1>
          )
        ) : (
          <h1 className="text-2xl font-bold dark:text-white">{title}</h1>
        )}
      </div>
      {canView ? (
        <>
          {type === 'document' ? (
            <>
              <RichTextEditor
                content={content}
                onChange={(html) => setContent(html)}
                editable={canEdit}
              />
              {canEdit && (
                <div className="flex items-center gap-2 mt-2">
                  <button onClick={handleSave} className="bg-blue-500 text-white px-4 py-2 rounded">
                    {saving ? 'Сохранение...' : 'Сохранить'}
                  </button>
                </div>
              )}
            </>
          ) : (
            <>
              <MindMapEditor
                initialNodes={nodes}
                initialEdges={edges}
                onChange={handleMindMapChange}
                editable={canEdit}
              />
              {canEdit && (
                <div className="flex gap-2 mt-2">
                  <button onClick={handleSave} className="bg-blue-500 text-white px-4 py-2 rounded">
                    {saving ? 'Сохранение...' : 'Сохранить'}
                  </button>
                </div>
              )}
            </>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            <button onClick={openShareModal} className="bg-green-500 text-white px-4 py-2 rounded">
              Поделиться
            </button>
          </div>

          {canView && (
            <CollaboratorsManager
              documentId={id}
              documentType={type}
              ownerId={doc.owner}
              currentUserId={currentUserId}
              refreshTrigger={refreshParticipants}
            />
          )}

          <div className="mt-6">
            <h2 className="text-xl font-semibold mb-2 dark:text-white">Комментарии</h2>
            {canComment && (
              <div className="flex gap-2 mb-3">
                <input
                  className="flex-1 p-2 border rounded dark:bg-gray-800 dark:border-gray-600 dark:text-gray-200"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Ваш комментарий"
                />
                <button onClick={addComment} className="bg-blue-500 text-white px-4 py-2 rounded">
                  Отправить
                </button>
              </div>
            )}
            <div className="space-y-2">
              {comments.map((c) => (
                <div key={c._id} className="border-b py-1 dark:border-gray-700">
                  <strong className="dark:text-gray-300">{c.userName}</strong> <span className="text-xs text-gray-500 dark:text-gray-400">({new Date(c.createdAt).toLocaleString()})</span>: <span className="dark:text-gray-200">{c.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Модальные окна (без изменений) */}
          <Modal open={shareModalOpen} onClose={() => setShareModalOpen(false)} title="Пригласить пользователя">
            <UserSearchInput onSelect={(user) => setShareUser(user)} />
            {shareUser && <p className="text-sm mb-2 dark:text-gray-300">Выбран: {shareUser.email}</p>}
            <select
              className="w-full border p-2 mb-4 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-200"
              value={sharePermission}
              onChange={(e) => setSharePermission(e.target.value)}
            >
              <option value="view">Просмотр</option>
              <option value="comment">Комментирование</option>
              <option value="edit">Редактирование</option>
            </select>
            <div className="flex gap-2">
              <button onClick={handleShare} disabled={!shareUser} className="flex-1 bg-blue-500 text-white p-2 rounded disabled:opacity-50">
                Отправить приглашение
              </button>
              <button onClick={() => setShareModalOpen(false)} className="flex-1 bg-gray-300 dark:bg-gray-600 p-2 rounded dark:text-white">
                Отмена
              </button>
            </div>
          </Modal>

          <Modal open={deleteModalOpen} onClose={() => setDeleteModalOpen(false)} title="Удалить документ?">
            <p className="mb-4 dark:text-gray-300">Это действие нельзя отменить.</p>
            <div className="flex gap-2">
              <button onClick={confirmDelete} className="flex-1 bg-red-500 text-white p-2 rounded">Удалить</button>
              <button onClick={() => setDeleteModalOpen(false)} className="flex-1 bg-gray-300 dark:bg-gray-600 p-2 rounded dark:text-white">Отмена</button>
            </div>
          </Modal>

          <Toast message={toastMessage} onClose={() => setToastMessage(null)} />
        </>
      ) : (
        <p className="text-red-500">У вас нет доступа к этому документу.</p>
      )}
    </div>
  );
}