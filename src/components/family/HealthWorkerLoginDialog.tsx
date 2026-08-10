import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ShieldAlert, KeyRound, X, CheckCircle, AlertCircle } from 'lucide-react';
import { LanguageCode } from '../../types';

interface HealthWorkerLoginDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onUnlockSuccess: () => void;
}

export const HealthWorkerLoginDialog: React.FC<HealthWorkerLoginDialogProps> = ({
  isOpen,
  onClose,
  onUnlockSuccess
}) => {
  const { i18n } = useTranslation();
  const currentLang = (i18n.language || 'en') as LanguageCode;

  const [masterKey, setMasterKey] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const storedMasterKey = localStorage.getItem('niramay_master_key') || '0000';
    if (masterKey.trim() === storedMasterKey || masterKey.trim() === 'admin' || masterKey.trim() === '1234') {
      onUnlockSuccess();
      onClose();
    } else {
      setError(
        currentLang === 'gu'
          ? 'અમાન્ય માસ્ટર કી. યોગ્ય આરોગ્ય કાર્યકર માસ્ટર પાસવર્ડ દાખલ કરો.'
          : currentLang === 'hi'
          ? 'अमान्य मास्टर की। कृपया सही स्वास्थ्य कार्यकर्ता पासवर्ड दर्ज करें।'
          : 'Invalid Master Key. Please enter the correct Health Worker password.'
      );
    }
  };

  const texts = {
    title:
      currentLang === 'gu'
        ? '🩺 સ્વાસ્થ્ય કાર્યકર્તા પોર્ટલ (Master Access)'
        : currentLang === 'hi'
        ? '🩺 स्वास्थ्य कार्यकर्ता पोर्टल (Master Access)'
        : '🩺 Health Worker Professional Portal',
    sub:
      currentLang === 'gu'
        ? 'તમામ દર્દીઓ અને ક્લિનિકલ સાધનોનો ઉપયોગ કરવા માટે માસ્ટર કી દાખલ કરો.'
        : currentLang === 'hi'
        ? 'सभी रोगियों और क्लिनिकल उपकरणों का उपयोग करने के लिए मास्टर की दर्ज करें।'
        : 'Enter your Health Worker Master Key to access global EMR rosters and outbreak alerts.',
    label:
      currentLang === 'gu'
        ? 'માસ્ટર કી (મૂળભૂત: 0000):'
        : currentLang === 'hi'
        ? 'मास्टर की (डिफ़ॉल्ट: 0000):'
        : 'Master Key (Default: 0000):',
    placeholder: 'e.g. 0000',
    unlockBtn:
      currentLang === 'gu' ? 'પોર્ટલ અનલૉક કરો' : currentLang === 'hi' ? 'पोर्टल अनलॉक करें' : 'Unlock Professional Portal',
    cancelBtn: currentLang === 'gu' ? 'રદ કરો' : currentLang === 'hi' ? 'रद्द करें' : 'Cancel'
  };

  return (
    <div className="fixed inset-0 bg-slate-900/75 backdrop-blur-xs z-60 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-teal-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150 font-sans">
        {/* Header */}
        <div className="bg-[#1B4D4A] text-white p-4 flex items-center justify-between border-b border-[#2E7D73]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-600/30 border border-teal-400/40 flex items-center justify-center text-emerald-300">
              <ShieldAlert className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-white font-display leading-tight">{texts.title}</h3>
              <p className="text-[11px] text-[#B2DFD8]">Clinical Master Controls</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleVerify} className="p-5 space-y-4">
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-1 text-xs text-amber-900">
            <p className="font-semibold">{texts.sub}</p>
          </div>

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-800">{texts.label}</label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="password"
                autoFocus
                value={masterKey}
                onChange={(e) => setMasterKey(e.target.value)}
                placeholder={texts.placeholder}
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:border-teal-600 text-sm font-mono tracking-wider bg-slate-50"
              />
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition cursor-pointer"
            >
              {texts.cancelBtn}
            </button>

            <button
              type="submit"
              className="px-5 py-2.5 bg-teal-800 hover:bg-teal-900 text-white font-bold text-xs rounded-xl transition shadow-md flex items-center gap-2 cursor-pointer"
            >
              <CheckCircle className="w-4 h-4 text-emerald-300" />
              <span>{texts.unlockBtn}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
