'use client';
import { useEffect } from 'react';
import { FiCheckCircle, FiXCircle } from 'react-icons/fi';

interface ToastProps {
  message: string | null;
  onClose: () => void;
  duration?: number;
}

export default function Toast({ message, onClose, duration = 3000 }: ToastProps) {
  useEffect(() => {
    if (message) {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
  }, [message, onClose, duration]);

  if (!message) return null;

  // Можно определять тип уведомления по наличию слова "Ошибка" и т.п., для простоты всегда успех
  const isError = message.includes('Ошибка');
  return (
    <div
      className={`fixed bottom-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-white ${
        isError ? 'bg-red-500' : 'bg-green-500'
      }`}
    >
      {isError ? <FiXCircle size={20} /> : <FiCheckCircle size={20} />}
      {message}
    </div>
  );
}