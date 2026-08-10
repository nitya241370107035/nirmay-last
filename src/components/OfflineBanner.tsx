import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { WifiOff, Wifi, CheckCircle2 } from 'lucide-react';
import { LanguageCode } from '../types';

export const OfflineBanner: React.FC = () => {
  const { i18n } = useTranslation();
  const currentLang = (i18n.language || 'en') as LanguageCode;

  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [showToast, setShowToast] = useState<boolean>(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowToast(true);
      const timer = setTimeout(() => setShowToast(false), 3000);
      return () => clearTimeout(timer);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowToast(true);
      const timer = setTimeout(() => setShowToast(false), 4500);
      return () => clearTimeout(timer);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!showToast) return null;

  const text = isOnline
    ? currentLang === 'gu'
      ? 'તમે પાછા ઓનલાઈન છો'
      : currentLang === 'hi'
      ? 'आप पुनः ऑनलाइन हैं'
      : 'Back online'
    : currentLang === 'gu'
    ? 'તમે ઓફલાઈન છો. નિરામય સંપૂર્ણ ઓફલાઈન કામ કરે છે.'
    : currentLang === 'hi'
    ? 'आप ऑफ़लाइन हैं। निरामय 100% ऑफ़लाइन काम करता है।'
    : 'You are offline. Nirāmay works 100% offline.';

  return (
    <div
      className={`fixed top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full shadow-lg border text-xs font-bold transition-all flex items-center gap-2 animate-bounce-short ${
        isOnline
          ? 'bg-emerald-900 text-emerald-100 border-emerald-700'
          : 'bg-amber-900 text-amber-100 border-amber-700'
      }`}
    >
      {isOnline ? (
        <Wifi className="w-4 h-4 text-emerald-400 shrink-0" />
      ) : (
        <WifiOff className="w-4 h-4 text-amber-400 shrink-0" />
      )}
      <span>{text}</span>
    </div>
  );
};
