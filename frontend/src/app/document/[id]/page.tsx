'use client';
import { useParams, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import api from '@/lib/api';

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
  const [content, setContent] = useState('');
  const [permission, setPermission] = useState<string | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');

  useEffect(() => {
    if (!id) return;
    loadData();
  }, [id, type]);

  const loadData = async () => {
    try {
      const endpoint = type === 'document' ? `/documents/${id}` : `/mindmaps/${id}`;
      const res = await api.get(endpoint);
      const item = res.data;
      setDoc(item);
      setContent(type === 'document' ? item.content : JSON.stringify(item.nodes));

      // Проверяем права через эндпоинт с типом
      const permRes = await api.get(`/shares/check/${id}?type=${type}`);
      // Если пользователь — владелец, права 'edit'
      const accessToken = localStorage.getItem('accessToken');
      if (accessToken) {
        const payload = JSON.parse(atob(accessToken.split('.')[1]));
        const isOwner = item.owner === payload.userId;
        setPermission(isOwner ? 'edit' : permRes.data.permission);
      }

      const commRes = await api.get(`/comments/${id}`);
      setComments(commRes.data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSave = async () => {
    if (permission !== 'edit') return;
    const payload = type === 'document' ? { content } : { nodes: JSON.parse(content) };
    const endpoint = type === 'document' ? `/documents/${id}` : `/mindmaps/${id}`;
    await api.put(endpoint, payload);
    alert('Сохранено');
  };

  const handleShare = async () => {
    const email = prompt('Email или ID пользователя, которому открыть доступ');
    const perm = prompt('Права (view, comment, edit)');
    if (!email || !perm) return;
    await api.post('/shares', {
      documentId: id,
      documentType: type,
      sharedWithEmail: email,
      permission: perm,
    });
    alert('Доступ предоставлен');
  };

  const addComment = async () => {
    if (!newComment.trim()) return;
    await api.post(`/comments/${id}`, { text: newComment, userName: 'Вы' });
    setNewComment('');
    loadData();
  };

  if (!doc) return <div className="p-4">Загрузка...</div>;

  const canView = permission !== null;
  const canComment = permission === 'comment' || permission === 'edit';
  const canEdit = permission === 'edit';

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">{doc.title}</h1>
      {canView ? (
        <>
          {canEdit ? (
            <div>
              <textarea
                className="w-full h-64 p-3 border rounded"
                value={content}
                onChange={(e) => setContent(e.target.value)}
              />
              <button onClick={handleSave} className="mt-2 bg-blue-500 text-white px-4 py-2 rounded">
                Сохранить
              </button>
            </div>
          ) : (
            <div className="p-3 border rounded bg-gray-100 whitespace-pre-wrap min-h-[10rem]">
              {content}
            </div>
          )}

          <div className="mt-4">
            <button onClick={handleShare} className="bg-green-500 text-white px-4 py-2 rounded">
              Поделиться
            </button>
          </div>

          <div className="mt-6">
            <h2 className="text-xl font-semibold mb-2">Комментарии</h2>
            {canComment && (
              <div className="flex gap-2 mb-3">
                <input
                  className="flex-1 p-2 border rounded"
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
                <div key={c._id} className="border-b py-1">
                  <strong>{c.userName}</strong> ({new Date(c.createdAt).toLocaleString()}): {c.text}
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        <p className="text-red-500">У вас нет доступа к этому документу.</p>
      )}
    </div>
  );
}