'use client';
import { useEffect, useState } from 'react';
import api from '@/lib/api';

interface UserInfo {
  _id: string;
  email: string;
  name: string;
}

interface ShareEntry {
  _id: string;
  sharedWith: string;
  permission: string;
}

interface CollaboratorsManagerProps {
  documentId: string;
  documentType: string;
  ownerId: string;
  currentUserId: string;
  refreshTrigger?: number;
}

const permissionLabels: Record<string, string> = {
  view: 'Просмотр',
  comment: 'Комментирование',
  edit: 'Редактирование',
};

export default function CollaboratorsManager({
  documentId,
  documentType,
  ownerId,
  currentUserId,
  refreshTrigger = 0,
}: CollaboratorsManagerProps) {
  const [shares, setShares] = useState<ShareEntry[]>([]);
  const [users, setUsers] = useState<Map<string, UserInfo>>(new Map());
  const [owner, setOwner] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const isOwner = currentUserId === ownerId;

  const fetchShares = async () => {
    const { data } = await api.get(`/shares/document/${documentId}`);
    const sharesData: ShareEntry[] = data;
    setShares(sharesData);
    const ids: string[] = sharesData.map((s) => s.sharedWith);
    const uniqueIds = Array.from(new Set(ids));
    const userMap = new Map<string, UserInfo>();
    await Promise.all(
      uniqueIds.map(async (userId: string) => {
        try {
          const { data: user } = await api.get(`/auth/${userId}`);
          userMap.set(userId, user as UserInfo);
        } catch (e) {
          console.error(`Failed to load user ${userId}`, e);
        }
      })
    );
    setUsers(userMap);
  };

  const fetchOwner = async () => {
    try {
      const { data } = await api.get(`/auth/${ownerId}`);
      setOwner(data as UserInfo);
    } catch (e) {
      console.error('Failed to load owner', e);
    }
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await Promise.all([fetchShares(), fetchOwner()]);
      setLoading(false);
    };
    load();
  }, [documentId, refreshTrigger]); // добавлена зависимость refreshTrigger

  const handleRoleChange = async (shareId: string, newPermission: string) => {
    if (!isOwner) return;
    await api.put(`/shares/${shareId}`, { permission: newPermission });
    fetchShares(); // локально обновим, но также сокет обновит всех
  };

  const handleRemove = async (shareId: string) => {
    if (!isOwner) return;
    await api.delete(`/shares/${shareId}`);
    fetchShares();
  };

  if (loading) return <p className="text-gray-500">Загрузка участников...</p>;

  return (
    <div className="mt-4 border p-4 rounded">
      <h3 className="font-semibold mb-2">Участники</h3>
      <div className="flex items-center gap-2 mb-2 py-1 border-b">
        <span className="text-sm font-medium">
          {owner ? `${owner.name} (${owner.email})` : 'Владелец'}
        </span>
        <span className="text-sm text-gray-500">(владелец)</span>
      </div>
      {shares.length === 0 && <p className="text-gray-500 text-sm">Нет других участников</p>}
      {shares.map((share) => {
        const user = users.get(share.sharedWith);
        const permLabel = permissionLabels[share.permission] || share.permission;
        return (
          <div key={share._id} className="flex items-center gap-2 mb-2">
            <span className="text-sm font-medium">
              {user ? `${user.name} (${user.email})` : share.sharedWith.substring(0, 8) + '...'}
            </span>
            {isOwner ? (
              <>
                <select
                  value={share.permission}
                  onChange={(e) => handleRoleChange(share._id, e.target.value)}
                  className="border p-1 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 border-gray-300 dark:border-gray-600"
                >
                  <option value="view">Просмотр</option>
                  <option value="comment">Комментирование</option>
                  <option value="edit">Редактирование</option>
                </select>
                <button onClick={() => handleRemove(share._id)} className="text-red-600 hover:underline text-sm">
                  Удалить
                </button>
              </>
            ) : (
              <span className="text-sm text-gray-500 ml-1">({permLabel})</span>
            )}
          </div>
        );
      })}
    </div>
  );
}