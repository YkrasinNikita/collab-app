'use client';
import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import Toast from '@/components/Toast';
import { FiEye, FiEyeOff } from 'react-icons/fi';

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<{ email: string; name: string; _id: string } | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [emailStatus, setEmailStatus] = useState<'checking' | 'free' | 'taken' | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMatch, setPasswordMatch] = useState<boolean | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState('');

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const { data } = await api.get('/auth/me');
      setUser(data);
      setName(data.name);
      setEmail(data.email);
    } catch (e) {
      router.push('/login');
    }
  };

  const checkEmail = useCallback(async (email: string) => {
    if (!email || email === user?.email) {
      setEmailStatus(null);
      return;
    }
    setEmailStatus('checking');
    try {
      const { data } = await api.post('/auth/check-email', { email, excludeUserId: user?._id });
      setEmailStatus(data.exists ? 'taken' : 'free');
    } catch {
      setEmailStatus(null);
    }
  }, [user]);

  const debouncedCheckEmail = useMemo(() => {
    let timer: ReturnType<typeof setTimeout>;
    return (email: string) => {
      clearTimeout(timer);
      timer = setTimeout(() => checkEmail(email), 500);
    };
  }, [checkEmail]);

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEmail(value);
    debouncedCheckEmail(value);
  };

  const handleConfirmPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setConfirmPassword(val);
    setPasswordMatch(val === newPassword);
  };

  const handleNewPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setNewPassword(val);
    if (confirmPassword) setPasswordMatch(val === confirmPassword);
  };

  const saveProfile = async () => {
    try {
      await api.put('/auth/me', { name, email });
      setToastMessage('Профиль обновлён');
      fetchProfile();
    } catch (e: any) {
      setToastMessage(e.response?.data?.message || 'Ошибка');
    }
  };

  const changePassword = async () => {
    if (newPassword !== confirmPassword) {
      setPasswordError('Пароли не совпадают');
      return;
    }
    if (!newPassword) {
      setPasswordError('Введите новый пароль');
      return;
    }
    setPasswordError('');
    try {
      await api.put('/auth/me/password', { newPassword });
      setToastMessage('Пароль изменён');
      setNewPassword('');
      setConfirmPassword('');
    } catch (e: any) {
      setToastMessage(e.response?.data?.message || 'Ошибка смены пароля');
    }
  };

  if (!user) return <div className="p-4">Загрузка...</div>;

  return (
    <div className="max-w-xl mx-auto p-4">
      <button onClick={() => router.push('/dashboard')} className="text-blue-600 hover:underline mb-4">
        ← Назад к документам
      </button>
      <h1 className="text-2xl font-bold mb-6">Личный кабинет</h1>

      <div className="mb-8 border p-4 rounded">
        <h2 className="text-lg font-semibold mb-3">Основные данные</h2>
        <div className="mb-3">
          <label className="block text-sm text-gray-600">Имя</label>
          <input
            className="w-full border p-2 rounded"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="mb-3 relative">
          <label className="block text-sm text-gray-600">Email</label>
          <input
            className="w-full border p-2 rounded"
            type="email"
            value={email}
            onChange={handleEmailChange}
          />
          {emailStatus === 'checking' && <span className="absolute right-2 top-8 text-gray-400">⏳</span>}
          {emailStatus === 'free' && <span className="absolute right-2 top-8 text-green-600">✔</span>}
          {emailStatus === 'taken' && <span className="absolute right-2 top-8 text-red-600">✖ занят</span>}
        </div>
        <button
          onClick={saveProfile}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Сохранить изменения
        </button>
      </div>

      <div className="border p-4 rounded">
        <h2 className="text-lg font-semibold mb-3">Сменить пароль</h2>
        <div className="relative mb-3">
          <label className="block text-sm text-gray-600">Новый пароль</label>
          <input
            type={showNew ? 'text' : 'password'}
            className="w-full border p-2 rounded pr-10"
            value={newPassword}
            onChange={handleNewPasswordChange}
          />
          <button
            type="button"
            className="absolute right-2 top-7 text-gray-600"
            onClick={() => setShowNew(!showNew)}
          >
            {showNew ? <FiEyeOff size={18} /> : <FiEye size={18} />}
          </button>
        </div>
        <div className="relative mb-3">
          <label className="block text-sm text-gray-600">Подтверждение нового пароля</label>
          <input
            type={showConfirm ? 'text' : 'password'}
            className="w-full border p-2 rounded pr-10"
            value={confirmPassword}
            onChange={handleConfirmPasswordChange}
          />
          <button
            type="button"
            className="absolute right-2 top-7 text-gray-600"
            onClick={() => setShowConfirm(!showConfirm)}
          >
            {showConfirm ? <FiEyeOff size={18} /> : <FiEye size={18} />}
          </button>
          {confirmPassword && (
            <span className={`absolute right-10 top-7 text-sm ${passwordMatch ? 'text-green-600' : 'text-red-600'}`}>
              {passwordMatch ? '✔' : '✖'}
            </span>
          )}
        </div>
        {passwordError && <p className="text-red-500 text-sm mb-2">{passwordError}</p>}
        <button
          onClick={changePassword}
          className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
          disabled={!newPassword || !confirmPassword || passwordMatch === false}
        >
          Изменить пароль
        </button>
      </div>
      <Toast message={toastMessage} onClose={() => setToastMessage(null)} />
    </div>
  );
}