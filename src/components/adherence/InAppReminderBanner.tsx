import React, { useState, useEffect } from 'react';
import { AlertTriangle, Clock, ChevronRight, Pill } from 'lucide-react';
import { checkAdherenceReminders } from '../../engine/adherenceEngine';
import { LanguageCode } from '../../types';

interface InAppReminderBannerProps {
  currentLang: LanguageCode;
  onOpenTracker: () => void;
}

export const InAppReminderBanner: React.FC<InAppReminderBannerProps> = ({
  currentLang,
  onOpenTracker
}) => {
  const [overdueCount, setOverdueCount] = useState<number>(0);
  const [topPatientName, setTopPatientName] = useState<string | undefined>(undefined);

  useEffect(() => {
    loadReminders();
  }, []);

  const loadReminders = async () => {
    try {
      const res = await checkAdherenceReminders();
      setOverdueCount(res.overdueCount);
      setTopPatientName(res.topOverduePatientName);
    } catch (err) {
      // ignore
    }
  };

  if (overdueCount === 0) return null;

  const text =
    currentLang === 'gu'
      ? `તમારી પાસે ${topPatientName ? `દર્દી ${topPatientName} અને અન્ય ` : ''}${overdueCount} વિલંબિત (ઓવરડ્યુ) દવાની માત્રા છે.`
      : currentLang === 'hi'
      ? `आपके पास ${topPatientName ? `रोगी ${topPatientName} और अन्य ` : ''}${overdueCount} अतिदेय (ओवरड्यू) खुराक हैं।`
      : `You have ${overdueCount} overdue medication ${overdueCount === 1 ? 'dose' : 'doses'}${
          topPatientName ? ` for ${topPatientName}` : ''
        }.`;

  const btnLabel = currentLang === 'gu' ? 'દવા ડેશબોર્ડ જુઓ' : currentLang === 'hi' ? 'दवा डैशबोर्ड देखें' : 'View DOT Dashboard';

  return (
    <div className="w-full bg-gradient-to-r from-amber-500 via-amber-600 to-orange-600 text-white p-3 px-4 rounded-2xl shadow-md border border-amber-400/40 flex items-center justify-between gap-3 animate-in slide-in-from-top duration-300 font-sans my-3">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-white/20 rounded-xl shrink-0">
          <AlertTriangle className="w-5 h-5 text-amber-100 animate-pulse" />
        </div>
        <div>
          <span className="font-extrabold text-xs sm:text-sm block leading-snug">
            {text}
          </span>
          <span className="text-[11px] text-amber-100 font-medium block">
            Directly Observed Treatment (DOT) Reminder
          </span>
        </div>
      </div>

      <button
        onClick={onOpenTracker}
        className="px-3.5 py-2 bg-white text-amber-900 font-extrabold text-xs rounded-xl shadow-xs hover:bg-amber-50 transition shrink-0 flex items-center gap-1 cursor-pointer"
      >
        <span>{btnLabel}</span>
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
};
