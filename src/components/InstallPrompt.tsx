import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Download, X, Smartphone, CheckCircle2 } from 'lucide-react';
import { LanguageCode } from '../types';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export const InstallPrompt: React.FC = () => {
  const { i18n } = useTranslation();
  const currentLang = (i18n.language || 'en') as LanguageCode;

  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent standard browser info bar
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      
      // Check if user previously dismissed in this session
      const isDismissed = sessionStorage.getItem('niramay_install_dismissed');
      if (!isDismissed) {
        setIsVisible(true);
      }
    };

    const handleAppInstalled = () => {
      setIsVisible(false);
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
    setIsVisible(false);
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setIsVisible(false);
    sessionStorage.setItem('niramay_install_dismissed', 'true');
  };

  if (!isVisible || !deferredPrompt) return null;

  const strings = {
    title:
      currentLang === 'gu'
        ? 'નિરામય એપ ઇન્સ્ટોલ કરો'
        : currentLang === 'hi'
        ? 'निरामय ऐप इंस्टॉल करें'
        : 'Install Nirāmay App',
    desc:
      currentLang === 'gu'
        ? 'કોઈપણ ઈન્ટરનેટ વગર ૧૦૦% ઓફલાઈન હોમ સ્ક્રીન પરથી વાપરો.'
        : currentLang === 'hi'
        ? 'बिना इंटरनेट 100% ऑफ़लाइन होम स्क्रीन से उपयोग करें।'
        : 'Access full triage & medical directory offline right from your home screen.',
    btnInstall:
      currentLang === 'gu'
        ? 'ઇન્સ્ટોલ કરો'
        : currentLang === 'hi'
        ? 'इंस्टॉल करें'
        : 'Install App',
    btnDismiss:
      currentLang === 'gu' ? 'પછીથી' : currentLang === 'hi' ? 'बाद में' : 'Later'
  };

  return (
    <div className="fixed bottom-20 sm:bottom-6 left-4 right-4 max-w-md mx-auto bg-slate-900 text-white p-4 rounded-2xl shadow-2xl border border-teal-500/30 z-50 animate-slide-up flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-slate-800 text-white flex items-center justify-center shrink-0 shadow-sm border border-teal-400/30 overflow-hidden p-1">
            <img src="/logo.png" alt="Nirāmay" className="w-full h-full object-contain" />
          </div>
          <div>
            <h4 className="font-extrabold text-sm sm:text-base text-teal-300">
              {strings.title}
            </h4>
            <p className="text-xs text-slate-300 font-medium leading-snug mt-0.5">
              {strings.desc}
            </p>
          </div>
        </div>

        <button
          onClick={handleDismiss}
          className="text-slate-400 hover:text-white p-1 rounded-lg transition"
          aria-label="Close install prompt"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex items-center gap-2 pt-1 border-t border-slate-800">
        <button
          onClick={handleInstallClick}
          className="flex-1 bg-teal-500 hover:bg-teal-400 active:bg-teal-600 text-slate-950 font-black text-xs sm:text-sm py-2.5 px-4 rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
        >
          <Download className="w-4 h-4" />
          <span>{strings.btnInstall}</span>
        </button>

        <button
          onClick={handleDismiss}
          className="px-3 py-2.5 rounded-xl text-xs font-bold text-slate-300 hover:bg-slate-800 transition cursor-pointer"
        >
          {strings.btnDismiss}
        </button>
      </div>
    </div>
  );
};
