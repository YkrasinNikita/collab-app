'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

interface DocItem {
  _id: string;
  title: string;
}

export default function DashboardPage() {
  const [documents, setDocuments] = useState<DocItem[]>([]);
  const [mindmaps, setMindmaps] = useState<DocItem[]>([]);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      router.push('/login');
      return;
    }
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [docsRes, mapsRes] = await Promise.all([
        api.get('/documents'),
        api.get('/mindmaps'),
      ]);
      setDocuments(docsRes.data);
      setMindmaps(mapsRes.data);
    } catch (e) {
      console.error(e);
    }
  };

  const createDocument = async () => {
    const title = prompt('Название заметки');
    if (!title) return;
    await api.post('/documents', { title });
    fetchData();
  };

  const createMindMap = async () => {
    const title = prompt('Название ментальной карты');
    if (!title) return;
    await api.post('/mindmaps', { title });
    fetchData();
  };

  const handleLogout = async () => {
    await api.post('/auth/logout');
    localStorage.removeItem('accessToken');
    router.push('/login');
  };

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Мои документы</h1>
        <button onClick={handleLogout} className="bg-red-500 text-white px-4 py-2 rounded">
          Выйти
        </button>
      </div>
      <div className="flex gap-2 mb-4">
        <button onClick={createDocument} className="bg-green-500 text-white px-4 py-2 rounded">
          + Заметка
        </button>
        <button onClick={createMindMap} className="bg-purple-500 text-white px-4 py-2 rounded">
          + Ментальная карта
        </button>
      </div>
      <div className="grid grid-cols-2 gap-6">
        <div>
          <h2 className="text-xl mb-2 font-semibold">📝 Заметки</h2>
          {documents.map((d) => (
            <div
              key={d._id}
              className="p-3 border rounded mb-2 cursor-pointer hover:bg-gray-100"
              onClick={() => router.push(`/document/${d._id}?type=document`)}
            >
              {d.title}
            </div>
          ))}
        </div>
        <div>
          <h2 className="text-xl mb-2 font-semibold">🧠 Ментальные карты</h2>
          {mindmaps.map((m) => (
            <div
              key={m._id}
              className="p-3 border rounded mb-2 cursor-pointer hover:bg-gray-100"
              onClick={() => router.push(`/document/${m._id}?type=mindmap`)}
            >
              {m.title}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}