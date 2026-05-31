'use client';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { FiCheck, FiX } from 'react-icons/fi';

interface Invitation {
  _id: string;
  documentId: string;
  documentType: string;
  documentTitle?: string;
  fromUser: { _id: string; email: string; name: string } | string;
  permission: string;
  createdAt: string;
}

export default function InvitationsList() {
  const [invites, setInvites] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchInvites = async () => {
    try {
      const { data } = await api.get('/invitations/inbox');
      setInvites(data);
    } catch (e) {}
    setLoading(false);
  };

  useEffect(() => { fetchInvites(); }, []);

  const handleAction = async (id: string, action: 'accepted' | 'declined') => {
    try {
      await api.put(`/invitations/${id}`, { status: action });
      fetchInvites();
    } catch (e: any) {
      alert(e.response?.data?.message || 'Ошибка');
    }
  };

  if (loading) return <p className="text-gray-500 dark:text-gray-400">Загрузка приглашений...</p>;
  if (!invites.length) return <p className="text-gray-500 dark:text-gray-400">Нет новых приглашений</p>;

  return (
    <div className="space-y-3">
      {invites.map(inv => (
        <div key={inv._id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <p className="font-medium text-gray-800 dark:text-gray-200">{inv.documentTitle || inv.documentId}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Тип: {inv.documentType === 'document' ? 'Заметка' : 'Ментальная карта'} | Права: {inv.permission}
            </p>
            {typeof inv.fromUser === 'object' && inv.fromUser.name && (
              <p className="text-sm text-gray-500 dark:text-gray-400">От: {inv.fromUser.name} ({inv.fromUser.email})</p>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={() => handleAction(inv._id, 'accepted')} className="flex items-center gap-1 bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded-lg text-sm">
              <FiCheck size={14} /> Принять
            </button>
            <button onClick={() => handleAction(inv._id, 'declined')} className="flex items-center gap-1 bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-lg text-sm">
              <FiX size={14} /> Отклонить
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}