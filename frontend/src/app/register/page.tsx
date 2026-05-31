'use client';
import { useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

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
    const value = e.target.value;
    setConfirmPassword(value);
    setPasswordMatch(value === password);
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPassword(value);
    if (confirmPassword) {
      setPasswordMatch(value === confirmPassword);
    }
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
    <div className="flex items-center justify-center min-h-screen">
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded shadow-md w-96">
        <h1 className="text-2xl mb-4 font-bold">Регистрация</h1>
        <input
          className="w-full mb-3 p-2 border rounded"
          placeholder="Имя"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <div className="relative mb-3">
          <input
            className="w-full p-2 border rounded"
            type="email"
            placeholder="Email"
            value={email}
            onChange={handleEmailChange}
            required
          />
          {emailStatus === 'checking' && <span className="absolute right-2 top-2 text-gray-400 text-sm">⏳</span>}
          {emailStatus === 'free' && <span className="absolute right-2 top-2 text-green-600 text-sm">✔ свободен</span>}
          {emailStatus === 'taken' && <span className="absolute right-2 top-2 text-red-600 text-sm">✖ занят</span>}
        </div>
        <div className="relative mb-3">
          <input
            type={showPassword ? 'text' : 'password'}
            className="w-full p-2 border rounded pr-10"
            placeholder="Пароль"
            value={password}
            onChange={handlePasswordChange}
            required
          />
          <button
            type="button"
            className="absolute right-2 top-2 text-gray-600"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? '🙈' : '👁️'}
          </button>
        </div>
        <div className="relative mb-3">
          <input
            type={showConfirm ? 'text' : 'password'}
            className="w-full p-2 border rounded pr-10"
            placeholder="Подтвердите пароль"
            value={confirmPassword}
            onChange={handleConfirmChange}
            required
          />
          <button
            type="button"
            className="absolute right-2 top-2 text-gray-600"
            onClick={() => setShowConfirm(!showConfirm)}
          >
            {showConfirm ? '🙈' : '👁️'}
          </button>
          {confirmPassword && (
            <span className={`absolute right-10 top-2 text-sm ${passwordMatch ? 'text-green-600' : 'text-red-600'}`}>
              {passwordMatch ? '✔' : '✖'}
            </span>
          )}
        </div>
        {errorMsg && <p className="text-red-500 text-sm mb-2">{errorMsg}</p>}
        <button
          type="submit"
          className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600 disabled:opacity-50"
          disabled={emailStatus === 'taken'}
        >
          Зарегистрироваться
        </button>
        <p className="mt-3 text-center">
          Уже есть аккаунт? <a href="/login" className="text-blue-500">Войти</a>
        </p>
      </form>
    </div>
  );
}