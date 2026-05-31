'use client';
import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import Toast from '@/components/Toast';
import { FiUser, FiMail, FiLock, FiEye, FiEyeOff, FiArrowLeft } from 'react-icons/fi';

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<{ email: string; name: string; _id: string } | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [emailStatus, setEmailStatus] = useState<'checking' | 'free' | 'taken' | null>(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMatch, setPasswordMatch] = useState<boolean | null>(null);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

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
      setToastMessage('Новые пароли не совпадают');
      return;
    }
    try {
      await api.put('/auth/me/password', { currentPassword, newPassword });
      setToastMessage('Пароль изменён');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (e: any) {
      setToastMessage(e.response?.data?.message || 'Ошибка смены пароля');
    }
  };

  if (!user) return <div className="p-4">Загрузка...</div>;

  return (
    <div className="max-w-xl mx-auto p-4 md:p-6">
      <button onClick={() => router.push('/dashboard')} className="flex items-center gap-2 text-blue-600 hover:underline mb-6">
        <FiArrowLeft /> Назад к документам
      </button>
      <h1 className="text-2xl font-bold mb-8 text-gray-800 dark:text-gray-100">Личный кабинет</h1>

      {/* Основные данные */}
      <div className="mb-8 bg-white dark:bg-gray-800 rounded-xl shadow p-6">
        <h2 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-200">Основные данные</h2>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Имя</label>
          <div className="relative">
            <FiUser className="absolute left-3 top-3 text-gray-400" />
            <input
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg pl-10 pr-4 py-2 bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
        </div>
        <div className="mb-4 relative">
          <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Email</label>
          <div className="relative">
            <FiMail className="absolute left-3 top-3 text-gray-400" />
            <input
              type="email"
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg pl-10 pr-16 py-2 bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={email}
              onChange={handleEmailChange}
            />
            {emailStatus === 'checking' && <span className="absolute right-3 top-2 text-gray-400">⏳</span>}
            {emailStatus === 'free' && <span className="absolute right-3 top-2 text-green-500">✔</span>}
            {emailStatus === 'taken' && <span className="absolute right-3 top-2 text-red-500">✖</span>}
          </div>
        </div>
        <button onClick={saveProfile} className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 rounded-lg transition">
          Сохранить изменения
        </button>
      </div>

      {/* Смена пароля */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
        <h2 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-200">Сменить пароль</h2>
        <div className="mb-4 relative">
          <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Текущий пароль</label>
          <div className="relative">
            <FiLock className="absolute left-3 top-3 text-gray-400" />
            <input
              type={showCurrent ? 'text' : 'password'}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg pl-10 pr-10 py-2 bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
            <button type="button" className="absolute right-3 top-3 text-gray-500" onClick={() => setShowCurrent(!showCurrent)}>
              {showCurrent ? <FiEyeOff size={18} /> : <FiEye size={18} />}
            </button>
          </div>
        </div>
        <div className="mb-4 relative">
          <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Новый пароль</label>
          <div className="relative">
            <FiLock className="absolute left-3 top-3 text-gray-400" />
            <input
              type={showNew ? 'text' : 'password'}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg pl-10 pr-10 py-2 bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={newPassword}
              onChange={handleNewPasswordChange}
            />
            <button type="button" className="absolute right-3 top-3 text-gray-500" onClick={() => setShowNew(!showNew)}>
              {showNew ? <FiEyeOff size={18} /> : <FiEye size={18} />}
            </button>
          </div>
        </div>
        <div className="mb-4 relative">
          <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Подтверждение нового пароля</label>
          <div className="relative">
            <FiLock className="absolute left-3 top-3 text-gray-400" />
            <input
              type={showConfirm ? 'text' : 'password'}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg pl-10 pr-10 py-2 bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={confirmPassword}
              onChange={handleConfirmPasswordChange}
            />
            <button type="button" className="absolute right-3 top-3 text-gray-500" onClick={() => setShowConfirm(!showConfirm)}>
              {showConfirm ? <FiEyeOff size={18} /> : <FiEye size={18} />}
            </button>
          </div>
          {confirmPassword && (
            <span className={`text-sm ${passwordMatch ? 'text-green-500' : 'text-red-500'}`}>
              {passwordMatch ? '✔ Пароли совпадают' : '✖ Пароли не совпадают'}
            </span>
          )}
        </div>
        <button
          onClick={changePassword}
          disabled={!currentPassword || !newPassword || !confirmPassword || passwordMatch === false}
          className="w-full bg-red-500 hover:bg-red-600 text-white font-medium py-2 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Изменить пароль
        </button>
      </div>
      <Toast message={toastMessage} onClose={() => setToastMessage(null)} />
    </div>
  );
}