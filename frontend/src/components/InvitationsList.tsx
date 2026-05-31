'use client';
import { useEffect, useState } from 'react';
import api from '@/lib/api';

interface Invitation {
  _id: string;
  documentId: string;
  documentType: string;
  fromUser: { _id: string; email: string; name: string } | string; // может быть строкой или объектом
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
    } catch (e) { console.error(e); }
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

  if (loading) return <p className="text-gray-500">Загрузка приглашений...</p>;
  if (!invites.length) return <p className="text-gray-500">Нет новых приглашений</p>;

  return (
    <div className="space-y-3">
      {invites.map(inv => (
        <div key={inv._id} className="border p-3 rounded flex justify-between items-center">
          <div>
            <p className="font-medium">Документ: {inv.documentId}</p>
            <p className="text-sm text-gray-600">
              Тип: {inv.documentType === 'document' ? 'Заметка' : 'Ментальная карта'} | Права: {inv.permission}
            </p>
            {typeof inv.fromUser === 'object' && inv.fromUser.name && (
              <p className="text-sm">От: {inv.fromUser.name} ({inv.fromUser.email})</p>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={() => handleAction(inv._id, 'accepted')} className="bg-green-500 text-white px-3 py-1 rounded">
              Принять
            </button>
            <button onClick={() => handleAction(inv._id, 'declined')} className="bg-red-500 text-white px-3 py-1 rounded">
              Отклонить
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}