'use client';
import { useState, useCallback } from 'react';
import api from '@/lib/api';
import { FiSearch } from 'react-icons/fi';

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
    } catch (e) {}
    setLoading(false);
  }, []);

  const handleSelect = (user: User) => {
    onSelect(user);
    setUsers([]);
    setQuery('');
  };

  return (
    <div className="relative mb-4">
      <div className="relative">
        <FiSearch className="absolute left-3 top-3 text-gray-400" />
        <input
          className="w-full border border-gray-300 dark:border-gray-600 rounded-lg pl-10 pr-4 py-2 bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Поиск по email..."
          value={query}
          onChange={(e) => search(e.target.value)}
        />
      </div>
      {loading && <div className="mt-1 text-sm text-gray-500">Поиск...</div>}
      {users.length > 0 && (
        <ul className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-40 overflow-auto">
          {users.map(u => (
            <li
              key={u.id}
              className="px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
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