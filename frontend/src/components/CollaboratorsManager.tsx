'use client';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { FiUser } from 'react-icons/fi';

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
}

export default function CollaboratorsManager({
  documentId,
  documentType,
  ownerId,
  currentUserId,
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
        } catch (e) {}
      })
    );
    setUsers(userMap);
  };

  const fetchOwner = async () => {
    try {
      const { data } = await api.get(`/auth/${ownerId}`);
      setOwner(data as UserInfo);
    } catch (e) {}
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await Promise.all([fetchShares(), fetchOwner()]);
      setLoading(false);
    };
    load();
  }, [documentId]);

  if (loading) return <p className="text-gray-500 dark:text-gray-400 text-sm">Загрузка участников...</p>;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm bg-gray-50 dark:bg-gray-800 p-2 rounded-lg">
        <FiUser className="text-blue-500" size={14} />
        <span className="font-medium">{owner ? `${owner.name} (${owner.email})` : 'Владелец'}</span>
        <span className="text-gray-500 dark:text-gray-400">(владелец)</span>
      </div>
      {shares.map((share) => {
        const user = users.get(share.sharedWith);
        return (
          <div key={share._id} className="flex items-center justify-between bg-white dark:bg-gray-800 p-2 rounded-lg text-sm">
            <div className="flex items-center gap-2">
              <FiUser className="text-gray-400" size={14} />
              <span>{user ? `${user.name} (${user.email})` : share.sharedWith.substring(0, 8) + '...'}</span>
            </div>
            {isOwner ? (
              <div className="flex items-center gap-2">
                <select
                  value={share.permission}
                  onChange={(e) => {
                    api.put(`/shares/${share._id}`, { permission: e.target.value }).then(fetchShares);
                  }}
                  className="border border-gray-300 dark:border-gray-600 rounded px-2 py-0.5 text-xs bg-transparent"
                >
                  <option value="view">Просмотр</option>
                  <option value="comment">Комментирование</option>
                  <option value="edit">Редактирование</option>
                </select>
                <button
                  onClick={() => {
                    api.delete(`/shares/${share._id}`).then(fetchShares);
                  }}
                  className="text-red-600 hover:underline text-xs"
                >
                  Удалить
                </button>
              </div>
            ) : (
              <span className="text-xs text-gray-500 dark:text-gray-400">({share.permission})</span>
            )}
          </div>
        );
      })}
    </div>
  );
}