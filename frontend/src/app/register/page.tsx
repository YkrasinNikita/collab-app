'use client';
import { useState, useCallback, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { FiEye, FiEyeOff } from 'react-icons/fi';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [emailStatus, setEmailStatus] = useState<'checking' | 'free' | 'taken' | null>(null);
  const [passwordMatch, setPasswordMatch] = useState<boolean | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const router = useRouter();

  useEffect(() => {
    document.documentElement.classList.remove('dark');
  }, []);

  const checkEmail = useCallback(async (email: string) => {
    if (!email) { setEmailStatus(null); return; }
    setEmailStatus('checking');
    try {
      const { data } = await api.post('/auth/check-email', { email });
      setEmailStatus(data.exists ? 'taken' : 'free');
    } catch { setEmailStatus(null); }
  }, []);

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

  const handleConfirmChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setConfirmPassword(val);
    setPasswordMatch(val === password);
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setPassword(val);
    if (confirmPassword) setPasswordMatch(val === confirmPassword);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (emailStatus === 'taken') {
      setErrorMsg('Этот email уже занят.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg('Пароли не совпадают.');
      return;
    }
    setErrorMsg('');
    try {
      const { data } = await api.post('/auth/register', { email, password, name });
      localStorage.setItem('accessToken', data.accessToken);
      router.push('/dashboard');
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Ошибка регистрации');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md space-y-4">
        <h1 className="text-3xl font-bold text-center text-gray-800">Регистрация</h1>
        {errorMsg && <p className="text-red-500 text-sm text-center">{errorMsg}</p>}
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">Имя</label>
          <input
            className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div className="relative">
          <label className="block text-sm font-medium text-gray-600 mb-1">Email</label>
          <input
            type="email"
            className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={email}
            onChange={handleEmailChange}
            required
          />
          {emailStatus === 'checking' && <span className="absolute right-2 top-9 text-gray-400 text-sm">⏳</span>}
          {emailStatus === 'free' && <span className="absolute right-2 top-9 text-green-600 text-sm">✔ свободен</span>}
          {emailStatus === 'taken' && <span className="absolute right-2 top-9 text-red-600 text-sm">✖ занят</span>}
        </div>
        <div className="relative">
          <label className="block text-sm font-medium text-gray-600 mb-1">Пароль</label>
          <input
            type={showPassword ? 'text' : 'password'}
            className="w-full border border-gray-300 rounded-lg px-4 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={password}
            onChange={handlePasswordChange}
            required
          />
          <button type="button" className="absolute right-3 top-9 text-gray-500" onClick={() => setShowPassword(!showPassword)}>
            {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
          </button>
        </div>
        <div className="relative">
          <label className="block text-sm font-medium text-gray-600 mb-1">Подтверждение пароля</label>
          <input
            type={showConfirm ? 'text' : 'password'}
            className="w-full border border-gray-300 rounded-lg px-4 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={confirmPassword}
            onChange={handleConfirmChange}
            required
          />
          <button type="button" className="absolute right-3 top-9 text-gray-500" onClick={() => setShowConfirm(!showConfirm)}>
            {showConfirm ? <FiEyeOff size={18} /> : <FiEye size={18} />}
          </button>
          {confirmPassword && (
            <span className={`absolute right-10 top-9 text-sm ${passwordMatch ? 'text-green-600' : 'text-red-600'}`}>
              {passwordMatch ? '✔' : '✖'}
            </span>
          )}
        </div>
        <button
          type="submit"
          className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white py-2 rounded-lg font-semibold hover:shadow-lg transition"
          disabled={emailStatus === 'taken'}
        >
          Зарегистрироваться
        </button>
        <p className="text-center text-sm text-gray-500">
          Уже есть аккаунт? <a href="/login" className="text-blue-600 font-medium hover:underline">Войти</a>
        </p>
      </form>
    </div>
  );
}