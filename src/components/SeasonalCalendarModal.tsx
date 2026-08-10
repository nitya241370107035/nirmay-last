import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Calendar, ShieldAlert, ChevronRight, CheckCircle, Info, ChevronDown, ChevronUp, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { LanguageCode, RiskLevel } from '../types';
import { getAllSeasonalAdvisories, MonthAdvisory, SeasonalAdvisoryDisease } from '../engine/seasonalEngine';

interface SeasonalCalendarModalProps {
  onClose: () => void;
  onOpenOutbreaks?: () => void;
  activeOutbreakDiseaseIds?: string[];
}

export const SeasonalCalendarModal: React.FC<SeasonalCalendarModalProps> = ({
  onClose,
  onOpenOutbreaks,
  activeOutbreakDiseaseIds = [],
}) => {
  const { i18n } = useTranslation();
  const currentLang = (i18n.language || 'en') as LanguageCode;

  const currentMonthNum = new Date().getMonth() + 1; // 1-12
  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonthNum);
  const [expandedDiseaseId, setExpandedDiseaseId] = useState<string | null>(null);

  const allMonthsData = getAllSeasonalAdvisories();
  const activeMonthData: MonthAdvisory = allMonthsData.find((m) => m.month === selectedMonth) || {
    month: selectedMonth,
    month_name: { en: 'Month', hi: 'माह', gu: 'મહિનો' },
    season: 'General',
    advisories: [],
  };

  const labels = {
    title: currentLang === 'gu' ? '૧૨ મહિનાનું મોસમી આરોગ્ય કેલેન્ડર' : currentLang === 'hi' ? '12-महीने का मौसमी स्वास्थ्य कैलेंडर' : '12-Month Seasonal Health Calendar',
    subtitle: currentLang === 'gu'
      ? 'સમગ્ર વર્ષ દરમિયાન ગામડાઓમાં અપેક્ષિત રોગો અને નિવારક પગલાંની માર્ગદર્શિકા'
      : currentLang === 'hi'
      ? 'वर्ष भर ग्रामीण क्षेत्रों में संभावित रोगों एवं बचाव उपायों की मार्गदर्शिका'
      : 'Year-round guide to anticipated disease risks and preventative measures for health workers',
    currentBadge: currentLang === 'gu' ? 'ચાલુ મહિનો' : currentLang === 'hi' ? 'वर्तमान माह' : 'Current Month',
    precautions: currentLang === 'gu' ? 'નિવારક પગલાં' : currentLang === 'hi' ? 'बचाव के उपाय' : 'Precautions',
    liveAlert: currentLang === 'gu' ? 'સક્રિય એલર્ટ' : currentLang === 'hi' ? 'सक्रिय अलर्ट' : 'Live Alert',
    noAdvisories: currentLang === 'gu' ? 'આ મહિના માટે કોઈ ખાસ મોસમી જોખમ નોંધાયેલ નથી.' : currentLang === 'hi' ? 'इस महीने के लिए कोई विशेष मौसमी जोखिम दर्ज नहीं है।' : 'No specific seasonal risks flagged for this month.',
  };

  const getRiskBadge = (risk: string) => {
    if (risk === 'high') {
      return (
        <span className="px-2 py-0.5 bg-red-100 text-red-800 border border-red-200 text-[10px] font-bold rounded-md">
          {currentLang === 'gu' ? 'ઉચ્ચ જોખમ' : currentLang === 'hi' ? 'उच्च जोखिम' : 'High Risk'}
        </span>
      );
    }
    if (risk === 'moderate') {
      return (
        <span className="px-2 py-0.5 bg-amber-100 text-amber-800 border border-amber-200 text-[10px] font-bold rounded-md">
          {currentLang === 'gu' ? 'મધ્યમ જોખમ' : currentLang === 'hi' ? 'मध्यम जोखिम' : 'Moderate Risk'}
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10px] font-bold rounded-md">
        {currentLang === 'gu' ? 'સામાન્ય જોખમ' : currentLang === 'hi' ? 'सामान्य जोखिम' : 'Low Risk'}
      </span>
    );
  };

  return (
    <div className="fixed inset-0 bg-[#1A2B2B]/80 backdrop-blur-sm z-[100] overflow-y-auto p-3 sm:p-5 flex items-center justify-center font-sans">
      <div className="bg-white rounded-3xl max-w-4xl w-full border border-[#DDE3E2] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] my-auto">
        {/* Header */}
        <div className="bg-[#1B4D4A] text-white p-5 border-b border-[#2E7D73] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#2E7D73] rounded-xl text-white">
              <Calendar className="w-6 h-6 text-[#B2DFD8]" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold font-display leading-tight">
                {labels.title}
              </h2>
              <p className="text-xs text-[#B2DFD8] mt-0.5">
                {labels.subtitle}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 bg-[#F4F7F6] flex-1">
          {/* Month Selector Grid (12 Months) */}
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
            {allMonthsData.map((m) => {
              const isSelected = m.month === selectedMonth;
              const isCurrent = m.month === currentMonthNum;
              const hasHighRisk = m.advisories.some((a) => a.risk_level === 'high');

              return (
                <button
                  key={m.month}
                  onClick={() => {
                    setSelectedMonth(m.month);
                    setExpandedDiseaseId(null);
                  }}
                  className={`p-2.5 rounded-2xl border transition text-left relative flex flex-col justify-between min-h-[76px] cursor-pointer ${
                    isSelected
                      ? 'bg-[#1B4D4A] text-white border-[#1B4D4A] shadow-md ring-2 ring-[#2E7D73]'
                      : isCurrent
                      ? 'bg-white text-[#1B4D4A] border-[#2E7D73] shadow-xs'
                      : 'bg-white text-[#1A2B2B] border-[#DDE3E2] hover:bg-[#EDF1F0]'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className={`text-xs font-bold ${isSelected ? 'text-white' : 'text-[#1B4D4A]'}`}>
                      {m.month_name[currentLang] || m.month_name.en}
                    </span>
                    {isCurrent && (
                      <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-[#B2DFD8]' : 'bg-[#2E7D73]'}`} title={labels.currentBadge} />
                    )}
                  </div>

                  <div className="mt-2 flex items-center justify-between text-[10px]">
                    <span className={`font-medium ${isSelected ? 'text-[#B2DFD8]' : 'text-[#5F6D6C]'}`}>
                      {m.season}
                    </span>
                    <span
                      className={`px-1.5 py-0.5 rounded-full font-bold ${
                        isSelected
                          ? 'bg-[#2E7D73] text-white'
                          : hasHighRisk
                          ? 'bg-red-100 text-red-800'
                          : 'bg-[#EDF1F0] text-[#5F6D6C]'
                      }`}
                    >
                      {m.advisories.length}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Active Selected Month Panel */}
          <div className="bg-white rounded-2xl border border-[#DDE3E2] p-5 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#DDE3E2] pb-3">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-[#1B4D4A] font-display">
                  {activeMonthData.month_name[currentLang] || activeMonthData.month_name.en}
                </h3>
                <span className="px-2.5 py-1 bg-[#EDF1F0] text-[#1B4D4A] text-xs font-semibold rounded-lg border border-[#DDE3E2]">
                  {activeMonthData.season}
                </span>
                {activeMonthData.month === currentMonthNum && (
                  <span className="px-2.5 py-1 bg-[#2E7D73] text-white text-xs font-bold rounded-lg shadow-2xs">
                    {labels.currentBadge}
                  </span>
                )}
              </div>

              <span className="text-xs text-[#5F6D6C] font-mono">
                {activeMonthData.advisories.length}{' '}
                {currentLang === 'gu' ? 'અપેક્ષિત જોખમો' : currentLang === 'hi' ? 'संभावित जोखिम' : 'Anticipated Risks'}
              </span>
            </div>

            {/* List of Advisories for Selected Month */}
            {activeMonthData.advisories.length === 0 ? (
              <p className="text-xs text-[#5F6D6C] italic py-4 text-center">
                {labels.noAdvisories}
              </p>
            ) : (
              <div className="space-y-3">
                {activeMonthData.advisories.map((advisory) => {
                  const hasLiveAlert = activeOutbreakDiseaseIds.includes(advisory.disease_id);
                  const isExpanded = expandedDiseaseId === advisory.disease_id;

                  return (
                    <div
                      key={advisory.disease_id}
                      className={`rounded-xl border transition-all overflow-hidden ${
                        hasLiveAlert
                          ? 'bg-red-50/70 border-red-300 ring-1 ring-red-200'
                          : 'bg-[#F4F7F6] border-[#DDE3E2]'
                      }`}
                    >
                      {/* Item Header Row */}
                      <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-bold text-[#1B4D4A]">
                              {advisory.disease_name[currentLang] || advisory.disease_name.en}
                            </span>
                            {getRiskBadge(advisory.risk_level)}

                            {hasLiveAlert && (
                              <button
                                onClick={onOpenOutbreaks}
                                className="px-2 py-0.5 bg-red-600 text-white font-bold text-[10px] rounded-md flex items-center gap-1 shadow-2xs animate-pulse cursor-pointer hover:bg-red-700 transition"
                              >
                                <Activity className="w-3 h-3 text-white" />
                                <span>{labels.liveAlert}</span>
                              </button>
                            )}
                          </div>

                          <p className="text-xs text-[#5F6D6C] leading-relaxed">
                            {advisory.summary[currentLang] || advisory.summary.en}
                          </p>
                        </div>

                        {/* Accordion Toggle */}
                        <button
                          onClick={() => setExpandedDiseaseId(isExpanded ? null : advisory.disease_id)}
                          className="self-start sm:self-center px-3 py-1.5 bg-white hover:bg-[#EDF1F0] text-[#1B4D4A] font-bold text-xs rounded-lg border border-[#DDE3E2] transition cursor-pointer flex items-center gap-1.5 shrink-0"
                        >
                          <span>{labels.precautions}</span>
                          {isExpanded ? <ChevronUp className="w-4 h-4 text-[#2E7D73]" /> : <ChevronDown className="w-4 h-4 text-[#2E7D73]" />}
                        </button>
                      </div>

                      {/* Expanded Precautions List */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="border-t border-[#DDE3E2] bg-white p-4 space-y-2 text-xs"
                          >
                            <span className="font-bold text-[#1B4D4A] block">
                              {labels.precautions}:
                            </span>
                            <ul className="space-y-1.5 pl-1">
                              {advisory.precautions.map((p, idx) => (
                                <li key={idx} className="flex items-start gap-2 text-[#1A2B2B]">
                                  <CheckCircle className="w-3.5 h-3.5 text-[#2E7D73] shrink-0 mt-0.5" />
                                  <span>{p[currentLang] || p.en}</span>
                                </li>
                              ))}
                            </ul>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="p-4 bg-white border-t border-[#DDE3E2] flex items-center justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-[#1B4D4A] hover:bg-[#143B39] text-white font-bold text-xs rounded-xl cursor-pointer transition shadow-xs"
          >
            {currentLang === 'gu' ? 'બંધ કરો' : currentLang === 'hi' ? 'बंद करें' : 'Close Calendar'}
          </button>
        </div>
      </div>
    </div>
  );
};
