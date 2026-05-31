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
import { FiArrowLeft, FiTrash2, FiShare2, FiSend, FiUsers } from 'react-icons/fi';
import type { Node, Edge } from '@xyflow/react';

const MindMapEditor = dynamic(() => import('@/components/MindMapEditor'), { ssr: false });

interface Comment {
  _id: string;
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

  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!id) return;
    loadData();
    loadProfile();
  }, [id, type]);

  const loadProfile = async () => {
    try {
      const { data } = await api.get('/auth/me');
      setCurrentUserName(data.name);
      setCurrentUserId(data._id);
    } catch (e) { console.error('Failed to load profile', e); }
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

  useEffect(() => {
    if (permission !== 'edit') return;
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      performSave(false);
    }, 3000);
    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    };
  }, [content, nodes, edges, permission]);

  const performSave = async (showToast = true) => {
    if (permission !== 'edit') return;
    try {
      setSaving(true);
      const payload = type === 'document' ? { content: DOMPurify.sanitize(content) } : { nodes, edges };
      const endpoint = type === 'document' ? `/documents/${id}` : `/mindmaps/${id}`;
      await api.put(endpoint, payload);
      if (showToast) setToastMessage('Сохранено');
    } catch (e: any) {
      if (showToast) setToastMessage('Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  const handleSave = () => performSave(true);

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
    await api.post(`/comments/${id}`, { text: newComment, userName: currentUserName });
    setNewComment('');
    loadData();
  };

  const handleMindMapChange = useCallback((newNodes: Node[], newEdges: Edge[]) => {
    setNodes(newNodes);
    setEdges(newEdges);
  }, []);

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
      await api.put(type === 'document' ? `/documents/${id}` : `/mindmaps/${id}`, { title });
      setDoc({ ...doc, title });
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
    <div className="max-w-6xl mx-auto p-4 md:p-6">
      <div className="flex items-center gap-4 mb-6 relative z-20">
        <button onClick={handleBack} className="flex items-center gap-1 text-blue-600 hover:underline">
          <FiArrowLeft /> Назад
        </button>
        {canEdit && (
          <button onClick={() => setDeleteModalOpen(true)} className="flex items-center gap-1 text-red-600 hover:underline ml-auto">
            <FiTrash2 size={14} /> Удалить
          </button>
        )}
      </div>

      {/* Заголовок */}
      <div className="mb-4">
        {canEdit ? (
          editingTitle ? (
            <input
              ref={titleInputRef}
              className="text-2xl font-bold w-full border-b-2 border-blue-500 outline-none bg-transparent dark:text-gray-100"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={saveTitle}
              onKeyDown={handleTitleKeyDown}
            />
          ) : (
            <h1
              className="text-2xl font-bold cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 rounded p-1"
              onClick={startEditingTitle}
            >
              {title}
            </h1>
          )
        ) : (
          <h1 className="text-2xl font-bold">{title}</h1>
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
                <div className="mt-3">
                  <button onClick={handleSave} className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg">
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
                <div className="mt-3">
                  <button onClick={handleSave} className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg">
                    {saving ? 'Сохранение...' : 'Сохранить'}
                  </button>
                </div>
              )}
            </>
          )}

          <div className="mt-6 flex flex-wrap gap-3">
            <button onClick={openShareModal} className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg">
              <FiShare2 size={16} /> Поделиться
            </button>
          </div>

          {canView && (
            <div className="mt-6">
              <h3 className="flex items-center gap-2 text-lg font-semibold mb-3">
                <FiUsers /> Участники
              </h3>
              <CollaboratorsManager
                documentId={id}
                documentType={type}
                ownerId={doc.owner}
                currentUserId={currentUserId}
              />
            </div>
          )}

          {/* Комментарии */}
          <div className="mt-8">
            <h2 className="text-lg font-semibold mb-3">Комментарии</h2>
            {canComment && (
              <div className="flex gap-2 mb-4">
                <input
                  className="flex-1 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Ваш комментарий..."
                />
                <button onClick={addComment} className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2">
                  <FiSend size={16} />
                </button>
              </div>
            )}
            <div className="space-y-3">
              {comments.map((c) => (
                <div key={c._id} className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium text-gray-700 dark:text-gray-300">{c.userName}</span>
                    <span className="text-gray-400 dark:text-gray-500 text-xs">
                      {new Date(c.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-gray-600 dark:text-gray-400 mt-1">{c.text}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Модальные окна */}
          <Modal open={shareModalOpen} onClose={() => setShareModalOpen(false)} title="Пригласить пользователя">
            <UserSearchInput onSelect={(user) => setShareUser(user)} />
            {shareUser && <p className="text-sm mb-2">Выбран: {shareUser.email}</p>}
            <select
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 mb-4 bg-transparent"
              value={sharePermission}
              onChange={(e) => setSharePermission(e.target.value)}
            >
              <option value="view">Просмотр</option>
              <option value="comment">Комментирование</option>
              <option value="edit">Редактирование</option>
            </select>
            <div className="flex gap-2">
              <button onClick={handleShare} disabled={!shareUser} className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-lg disabled:opacity-50">Отправить приглашение</button>
              <button onClick={() => setShareModalOpen(false)} className="flex-1 bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500 py-2 rounded-lg">Отмена</button>
            </div>
          </Modal>

          <Modal open={deleteModalOpen} onClose={() => setDeleteModalOpen(false)} title="Удалить документ?">
            <p className="text-gray-600 dark:text-gray-300 mb-4">Это действие нельзя отменить.</p>
            <div className="flex gap-2">
              <button onClick={confirmDelete} className="flex-1 bg-red-500 hover:bg-red-600 text-white py-2 rounded-lg">Удалить</button>
              <button onClick={() => setDeleteModalOpen(false)} className="flex-1 bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500 py-2 rounded-lg">Отмена</button>
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