'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import Modal from '@/components/Modal';
import Toast from '@/components/Toast';
import InvitationsList from '@/components/InvitationsList';

interface DocItem {
  _id: string;
  title: string;
  updatedAt: string;
  isShared?: boolean;
}

export default function DashboardPage() {
  const [tab, setTab] = useState<'documents' | 'invitations'>('documents');
  const [documents, setDocuments] = useState<DocItem[]>([]);
  const [mindmaps, setMindmaps] = useState<DocItem[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'document' | 'mindmap'>('document');
  const [newTitle, setNewTitle] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ id: string; type: 'document' | 'mindmap' } | null>(null);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) { router.push('/login'); return; }
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [ownDocsRes, ownMapsRes, sharesRes] = await Promise.all([
        api.get('/documents'),
        api.get('/mindmaps'),
        api.get('/shares/my'),
      ]);
      const ownDocs = ownDocsRes.data.map((d: any) => ({ ...d, isShared: false }));
      const ownMaps = ownMapsRes.data.map((m: any) => ({ ...m, isShared: false }));

      const shares = sharesRes.data || [];
      const sharedDocIds = shares.filter((s: any) => s.documentType === 'document').map((s: any) => s.documentId);
      const sharedMapIds = shares.filter((s: any) => s.documentType === 'mindmap').map((s: any) => s.documentId);

      let sharedDocs: DocItem[] = [];
      let sharedMaps: DocItem[] = [];
      if (sharedDocIds.length > 0) {
        const { data } = await api.post('/documents/batch', { ids: sharedDocIds });
        sharedDocs = data.map((d: any) => ({ ...d, isShared: true }));
      }
      if (sharedMapIds.length > 0) {
        const { data } = await api.post('/mindmaps/batch', { ids: sharedMapIds });
        sharedMaps = data.map((m: any) => ({ ...m, isShared: true }));
      }

      const allDocs = [...ownDocs, ...sharedDocs].sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
      const allMaps = [...ownMaps, ...sharedMaps].sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );

      setDocuments(allDocs);
      setMindmaps(allMaps);
    } catch (e) { console.error(e); }
  };

  const openCreateModal = (type: 'document' | 'mindmap') => {
    setModalType(type);
    setNewTitle('');
    setModalOpen(true);
  };

  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    try {
      const endpoint = modalType === 'document' ? '/documents' : '/mindmaps';
      await api.post(endpoint, { title: newTitle });
      setModalOpen(false);
      setToastMessage(`${modalType === 'document' ? 'Заметка' : 'Ментальная карта'} создана`);
      fetchData();
    } catch (e: any) {
      setToastMessage(`Ошибка: ${e.response?.data?.message || 'Не удалось создать'}`);
    }
  };

  const handleDeleteClick = (id: string, type: 'document' | 'mindmap') => {
    setItemToDelete({ id, type });
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    try {
      const endpoint = itemToDelete.type === 'document' ? `/documents/${itemToDelete.id}` : `/mindmaps/${itemToDelete.id}`;
      await api.delete(endpoint);
      setToastMessage('Элемент удалён');
      fetchData();
    } catch (e: any) {
      setToastMessage('Ошибка при удалении');
    } finally {
      setDeleteModalOpen(false);
      setItemToDelete(null);
    }
  };

  const handleLogout = async () => {
    await api.post('/auth/logout');
    localStorage.removeItem('accessToken');
    router.push('/login');
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleString();
  };

  const DocumentCard = ({ item, type }: { item: DocItem; type: 'document' | 'mindmap' }) => (
    <div
      className="p-3 border rounded mb-2 flex justify-between items-center cursor-pointer hover:bg-gray-50"
      onClick={() => router.push(`/document/${item._id}?type=${type}`)}
    >
      <div className="flex items-center gap-2 flex-1">
        <span>{item.title}</span>
        {item.isShared && <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">совместный</span>}
      </div>
      <div className="flex items-center gap-2 text-xs text-gray-500">
        {formatDate(item.updatedAt)}
        {!item.isShared && (
          <button
            onClick={(e) => { e.stopPropagation(); handleDeleteClick(item._id, type); }}
            className="text-red-600 hover:text-red-800 ml-2"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Мои документы</h1>
        <div className="flex gap-2">
          <button onClick={() => router.push('/profile')} className="text-blue-600 hover:underline">
            Личный кабинет
          </button>
          <button onClick={handleLogout} className="bg-red-500 text-white px-4 py-2 rounded">
            Выйти
          </button>
        </div>
      </div>
      <div className="flex gap-4 mb-4">
        <button
          onClick={() => setTab('documents')}
          className={`px-4 py-2 rounded ${tab === 'documents' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
        >
          Мои документы
        </button>
        <button
          onClick={() => setTab('invitations')}
          className={`px-4 py-2 rounded ${tab === 'invitations' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
        >
          Приглашения
        </button>
      </div>
      {tab === 'documents' ? (
        <>
          <div className="flex gap-2 mb-4">
            <button onClick={() => openCreateModal('document')} className="bg-green-500 text-white px-4 py-2 rounded">
              + Заметка
            </button>
            <button onClick={() => openCreateModal('mindmap')} className="bg-purple-500 text-white px-4 py-2 rounded">
              + Ментальная карта
            </button>
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <h2 className="text-xl mb-2 font-semibold">📝 Заметки</h2>
              {documents.length === 0 && <p className="text-gray-500">Нет заметок</p>}
              {documents.map(d => <DocumentCard key={d._id} item={d} type="document" />)}
            </div>
            <div>
              <h2 className="text-xl mb-2 font-semibold">🧠 Ментальные карты</h2>
              {mindmaps.length === 0 && <p className="text-gray-500">Нет ментальных карт</p>}
              {mindmaps.map(m => <DocumentCard key={m._id} item={m} type="mindmap" />)}
            </div>
          </div>
          <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Создать новый документ">
            <input
              className="w-full border p-2 mb-4"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Название"
            />
            <div className="flex gap-2">
              <button onClick={handleCreate} className="flex-1 bg-blue-500 text-white p-2 rounded">Создать</button>
              <button onClick={() => setModalOpen(false)} className="flex-1 bg-gray-300 p-2 rounded">Отмена</button>
            </div>
          </Modal>
          <Modal open={deleteModalOpen} onClose={() => setDeleteModalOpen(false)} title="Удалить элемент?">
            <p className="mb-4">Это действие нельзя отменить.</p>
            <div className="flex gap-2">
              <button onClick={confirmDelete} className="flex-1 bg-red-500 text-white p-2 rounded">Удалить</button>
              <button onClick={() => setDeleteModalOpen(false)} className="flex-1 bg-gray-300 p-2 rounded">Отмена</button>
            </div>
          </Modal>
        </>
      ) : (
        <InvitationsList />
      )}
      <Toast message={toastMessage} onClose={() => setToastMessage(null)} />
    </div>
  );
}