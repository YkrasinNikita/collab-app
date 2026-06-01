'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import Modal from '@/components/Modal';
import Toast from '@/components/Toast';
import InvitationsList from '@/components/InvitationsList';
import ThemeToggle from '@/components/ThemeToggle';
import {
  FiFileText,
  FiUser,
  FiLogOut,
  FiPlus,
  FiTrash2,
  FiClock,
} from 'react-icons/fi';

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
  const [invitationCount, setInvitationCount] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'document' | 'mindmap'>('document');
  const [newTitle, setNewTitle] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{
    id: string;
    type: 'document' | 'mindmap';
  } | null>(null);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      router.push('/login');
      return;
    }
    fetchData();
    fetchInvitationCount();
  }, []);

  const fetchData = async () => {
    try {
      const [ownDocsRes, ownMapsRes, sharesRes] = await Promise.all([
        api.get('/documents'),
        api.get('/mindmaps'),
        api.get('/shares/my'),
      ]);
      const ownDocs = ownDocsRes.data.map((d: any) => ({
        ...d,
        isShared: false,
      }));
      const ownMaps = ownMapsRes.data.map((m: any) => ({
        ...m,
        isShared: false,
      }));
      const shares = sharesRes.data || [];
      const sharedDocIds = shares
        .filter((s: any) => s.documentType === 'document')
        .map((s: any) => s.documentId);
      const sharedMapIds = shares
        .filter((s: any) => s.documentType === 'mindmap')
        .map((s: any) => s.documentId);

      let sharedDocs: DocItem[] = [];
      let sharedMaps: DocItem[] = [];
      if (sharedDocIds.length > 0) {
        const { data } = await api.post('/documents/batch', {
          ids: sharedDocIds,
        });
        sharedDocs = data.map((d: any) => ({ ...d, isShared: true }));
      }
      if (sharedMapIds.length > 0) {
        const { data } = await api.post('/mindmaps/batch', {
          ids: sharedMapIds,
        });
        sharedMaps = data.map((m: any) => ({ ...m, isShared: true }));
      }

      const allDocs = [...ownDocs, ...sharedDocs].sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
      const allMaps = [...ownMaps, ...sharedMaps].sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );

      setDocuments(allDocs);
      setMindmaps(allMaps);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchInvitationCount = async () => {
    try {
      const { data } = await api.get('/invitations/inbox');
      setInvitationCount(data.length);
    } catch (e) {
      console.error(e);
    }
  };

  const handleInvitationAccepted = () => {
    fetchData();
    fetchInvitationCount();
  };

  const openCreateModal = (type: 'document' | 'mindmap') => {
    setModalType(type);
    setNewTitle('');
    setModalOpen(true);
  };

  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    try {
      const endpoint =
        modalType === 'document' ? '/documents' : '/mindmaps';
      await api.post(endpoint, { title: newTitle });
      setModalOpen(false);
      setToastMessage(
        `${modalType === 'document' ? 'Заметка' : 'Ментальная карта'} создана`
      );
      fetchData();
    } catch (e: any) {
      setToastMessage(
        `Ошибка: ${e.response?.data?.message || 'Не удалось создать'}`
      );
    }
  };

  const handleDeleteClick = (id: string, type: 'document' | 'mindmap') => {
    setItemToDelete({ id, type });
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    try {
      const endpoint =
        itemToDelete.type === 'document'
          ? `/documents/${itemToDelete.id}`
          : `/mindmaps/${itemToDelete.id}`;
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

  const DocumentCard = ({
    item,
    type,
  }: {
    item: DocItem;
    type: 'document' | 'mindmap';
  }) => (
    <div
      className="group p-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md transition-all cursor-pointer border border-gray-100 dark:border-gray-700"
      onClick={() => router.push(`/document/${item._id}?type=${type}`)}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <FiFileText className="text-blue-500 dark:text-blue-400 flex-shrink-0" size={18} />
          <div>
            <p className="font-medium text-gray-800 dark:text-gray-200">
              {item.title}
            </p>
            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mt-1">
              <FiClock size={12} />
              <span>{formatDate(item.updatedAt)}</span>
              {item.isShared && (
                <span className="bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded-full text-xs font-medium">
                  совместный
                </span>
              )}
            </div>
          </div>
        </div>
        {!item.isShared && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDeleteClick(item._id, type);
            }}
            className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 transition"
          >
            <FiTrash2 size={16} />
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6">
      {/* Верхняя панель */}
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-gray-100">
          Мои документы
        </h1>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <button
            onClick={() => router.push('/profile')}
            className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition"
          >
            <FiUser size={18} />
          </button>
          <button
            onClick={handleLogout}
            className="p-2 rounded-full hover:bg-red-50 dark:hover:bg-red-900/30 text-red-500 transition"
          >
            <FiLogOut size={18} />
          </button>
        </div>
      </div>

      {/* Табы */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setTab('documents')}
          className={`px-4 py-2 rounded-lg font-medium transition ${
            tab === 'documents'
              ? 'bg-blue-500 text-white shadow-md'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
          }`}
        >
          Мои документы
        </button>
        <button
          onClick={() => setTab('invitations')}
          className={`relative px-4 py-2 rounded-lg font-medium transition ${
            tab === 'invitations'
              ? 'bg-blue-500 text-white shadow-md'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
          }`}
        >
          Приглашения
          {invitationCount > 0 && (
            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
              {invitationCount}
            </span>
          )}
        </button>
      </div>

      {tab === 'documents' ? (
        <>
          <div className="flex flex-wrap gap-2 mb-6">
            <button
              onClick={() => openCreateModal('document')}
              className="flex items-center gap-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white px-4 py-2 rounded-lg shadow hover:shadow-md transition"
            >
              <FiPlus /> Заметка
            </button>
            <button
              onClick={() => openCreateModal('mindmap')}
              className="flex items-center gap-2 bg-gradient-to-r from-purple-500 to-pink-600 text-white px-4 py-2 rounded-lg shadow hover:shadow-md transition"
            >
              <FiPlus /> Ментальная карта
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h2 className="text-lg font-semibold mb-3 text-gray-700 dark:text-gray-300">
                Заметки
              </h2>
              {documents.length === 0 && (
                <p className="text-gray-500 dark:text-gray-400">Нет заметок</p>
              )}
              {documents.map((d) => (
                <DocumentCard key={d._id} item={d} type="document" />
              ))}
            </div>
            <div>
              <h2 className="text-lg font-semibold mb-3 text-gray-700 dark:text-gray-300">
                Ментальные карты
              </h2>
              {mindmaps.length === 0 && (
                <p className="text-gray-500 dark:text-gray-400">
                  Нет ментальных карт
                </p>
              )}
              {mindmaps.map((m) => (
                <DocumentCard key={m._id} item={m} type="mindmap" />
              ))}
            </div>
          </div>

          {/* Модальное окно создания */}
          <Modal
            open={modalOpen}
            onClose={() => setModalOpen(false)}
            title="Создать новый документ"
          >
            <input
              className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-lg px-4 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Название"
            />
            <div className="flex gap-2">
              <button
                onClick={handleCreate}
                className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-lg font-medium"
              >
                Создать
              </button>
              <button
                onClick={() => setModalOpen(false)}
                className="flex-1 bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500 py-2 rounded-lg font-medium"
              >
                Отмена
              </button>
            </div>
          </Modal>

          {/* Модальное окно удаления */}
          <Modal
            open={deleteModalOpen}
            onClose={() => setDeleteModalOpen(false)}
            title="Удалить элемент?"
          >
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Это действие нельзя отменить.
            </p>
            <div className="flex gap-2">
              <button
                onClick={confirmDelete}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white py-2 rounded-lg font-medium"
              >
                Удалить
              </button>
              <button
                onClick={() => setDeleteModalOpen(false)}
                className="flex-1 bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500 py-2 rounded-lg font-medium"
              >
                Отмена
              </button>
            </div>
          </Modal>
        </>
      ) : (
        <InvitationsList onAccepted={handleInvitationAccepted} />
      )}
      <Toast message={toastMessage} onClose={() => setToastMessage(null)} />
    </div>
  );
}