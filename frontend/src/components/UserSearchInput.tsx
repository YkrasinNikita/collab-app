'use client';
import { useState, useCallback } from 'react';
import api from '@/lib/api';

interface User {
  id: string;
  email: string;
  name: string;
}

interface Props {
  onSelect: (user: User) => void;
}

export default function UserSearchInput({ onSelect }: Props) {
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);

  const search = useCallback(async (q: string) => {
    setQuery(q);
    if (q.length < 2) { setUsers([]); return; }
    setLoading(true);
    try {
      const { data } = await api.get(`/auth/search-users?q=${encodeURIComponent(q)}`);
      setUsers(data);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  const handleSelect = (user: User) => {
    onSelect(user);
    setUsers([]);
    setQuery('');
  };

  return (
    <div className="relative">
      <input
        className="w-full border p-2 mb-2"
        placeholder="Поиск по email..."
        value={query}
        onChange={(e) => search(e.target.value)}
      />
      {loading && <span className="text-sm text-gray-500">Поиск...</span>}
      {users.length > 0 && (
        <ul className="absolute z-10 bg-white border w-full max-h-40 overflow-auto">
          {users.map(u => (
            <li key={u.id}
              className="p-2 hover:bg-gray-100 cursor-pointer"
              onClick={() => handleSelect(u)}
            >
              {u.name} ({u.email})
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}