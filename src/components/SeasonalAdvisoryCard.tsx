import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ShieldAlert, ChevronDown, ChevronUp, Calendar, Activity, Check, CheckCircle2, Sun, CloudRain, Snowflake, Leaf, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db } from '../db/db';
import { LanguageCode } from '../types';
import { getCurrentSeasonalAdvisory, MonthAdvisory, SeasonalAdvisoryDisease } from '../engine/seasonalEngine';
import { SeasonalCalendarModal } from './SeasonalCalendarModal';

interface SeasonalAdvisoryCardProps {
  onOpenOutbreaks?: () => void;
}

export const SeasonalAdvisoryCard: React.FC<SeasonalAdvisoryCardProps> = ({
  onOpenOutbreaks,
}) => {
  const { i18n } = useTranslation();
  const currentLang = (i18n.language || 'en') as LanguageCode;

  const [monthlyAdvisory, setMonthlyAdvisory] = useState<MonthAdvisory | null>(null);
  const [activeOutbreakDiseaseIds, setActiveOutbreakDiseaseIds] = useState<string[]>([]);
  const [expandedPrecautionIds, setExpandedPrecautionIds] = useState<Record<string, boolean>>({});
  const [showAllAdvisories, setShowAllAdvisories] = useState<boolean>(false);
  const [showCalendarModal, setShowCalendarModal] = useState<boolean>(false);

  useEffect(() => {
    loadAdvisoryData();
  }, [currentLang]);

  const loadAdvisoryData = async () => {
    try {
      // 1. Get current month's seasonal advisory
      const currentData = getCurrentSeasonalAdvisory();
      setMonthlyAdvisory(currentData);

      // 2. Query active outbreak alerts in IndexedDB
      const activeAlerts = await db.alerts.where('status').equals('active').toArray();
      const diseaseIds = activeAlerts.map((a) => a.diseaseId);
      setActiveOutbreakDiseaseIds(diseaseIds);
    } catch (err) {
      console.error('Error loading seasonal advisory or outbreak alerts:', err);
    }
  };

  if (!monthlyAdvisory || !monthlyAdvisory.advisories || monthlyAdvisory.advisories.length === 0) {
    return null; // Hidden if no advisory data exists
  }

  // Determine overall highest risk level for card accent border
  const hasHighRisk = monthlyAdvisory.advisories.some((a) => a.risk_level === 'high');
  const hasModerateRisk = monthlyAdvisory.advisories.some((a) => a.risk_level === 'moderate');

  const borderAccentColor = hasHighRisk
    ? 'border-l-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.08)]'
    : hasModerateRisk
    ? 'border-l-[#2E7D73] shadow-[0_0_15px_rgba(46,125,115,0.08)]'
    : 'border-l-slate-400';

  const season = monthlyAdvisory.season;
  const SeasonIcon = season.toLowerCase().includes('summer') || season.toLowerCase().includes('peak')
    ? Sun
    : season.toLowerCase().includes('monsoon') || season.toLowerCase().includes('rain')
    ? CloudRain
    : season.toLowerCase().includes('winter')
    ? Snowflake
    : Leaf;

  const labels = {
    cardTitle: currentLang === 'gu' ? 'મોસમી આરોગ્ય માર્ગદર્શિકા' : currentLang === 'hi' ? 'मौसमी स्वास्थ्य परामर्श' : 'Seasonal Health Advisory',
    precautionsBtn: currentLang === 'gu' ? 'નિવારક પગલાં' : currentLang === 'hi' ? 'बचाव के उपाय' : 'Precautions',
    liveAlert: currentLang === 'gu' ? 'સક્રિય રોગચાળો' : currentLang === 'hi' ? 'प्रकोप की पुष्टि' : 'Outbreak Confirmed',
    viewCalendar: currentLang === 'gu' ? '૧૨ મહિનાનું કેલેન્ડર જુઓ' : currentLang === 'hi' ? '12-महीने का कैलेंडर देखें' : 'View Full Calendar',
    viewMore: (count: number) =>
      currentLang === 'gu'
        ? `તમામ ${count} માર્ગદર્શિકાઓ જુઓ`
        : currentLang === 'hi'
        ? `सभी ${count} सलाह देखें`
        : `View all ${count} advisories`,
    showLess: currentLang === 'gu' ? 'ઓછું જુઓ' : currentLang === 'hi' ? 'कम देखें' : 'Show less',
    highRisk: currentLang === 'gu' ? 'ઉચ્ચ જોખમ' : currentLang === 'hi' ? 'उच्च जोखिम' : 'High Risk',
    modRisk: currentLang === 'gu' ? 'મધ્યમ જોખમ' : currentLang === 'hi' ? 'मध्यम जोखिम' : 'Moderate Risk',
  };

  const visibleAdvisories = showAllAdvisories
    ? monthlyAdvisory.advisories
    : monthlyAdvisory.advisories.slice(0, 2);

  const togglePrecaution = (diseaseId: string) => {
    setExpandedPrecautionIds((prev) => ({
      ...prev,
      [diseaseId]: !prev[diseaseId],
    }));
  };

  return (
    <>
      <div
        className={`glass-card p-5 sm:p-6 border-l-4 ${borderAccentColor} bg-white/95 backdrop-blur-xs rounded-2xl border border-[#DDE3E2] space-y-4 font-sans relative overflow-hidden transition-all hover:shadow-md`}
      >
        {/* Soft Ambient Pulse Glow Background */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-[radial-gradient(circle_at_100%_0%,rgba(178,223,216,0.15),transparent_70%)] pointer-events-none" />

        {/* Card Header Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-[#DDE3E2] pb-3.5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#EDF1F0] rounded-xl text-[#1B4D4A] border border-[#DDE3E2] flex items-center justify-center">
              <SeasonIcon className="w-5 h-5 text-[#2E7D73]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-extrabold text-[#1B4D4A] font-display">
                  {labels.cardTitle}
                </h3>
                <span className="text-[10px] uppercase font-mono font-bold tracking-wider px-2 py-0.5 bg-[#EDF1F0] text-[#2E7D73] rounded-md border border-[#DDE3E2]">
                  {monthlyAdvisory.month_name[currentLang] || monthlyAdvisory.month_name.en} • {season}
                </span>
              </div>
              <p className="text-xs text-[#5F6D6C] mt-0.5">
                {currentLang === 'gu'
                  ? 'ચાલુ મહિનામાં ગામમાં અપેક્ષિત રોગો અને બચાવની માર્ગદર્શિકા'
                  : currentLang === 'hi'
                  ? 'वर्तमान माह में संभावित बीमारियों एवं बचाव के उपाय'
                  : 'Anticipated disease patterns & prevention protocol for this month'}
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowCalendarModal(true)}
            className="self-start sm:self-center px-3 py-1.5 bg-white hover:bg-[#EDF1F0] text-[#1B4D4A] font-bold text-xs rounded-xl border border-[#DDE3E2] transition cursor-pointer flex items-center gap-1.5 shadow-2xs hover:border-[#2E7D73]"
          >
            <Calendar className="w-3.5 h-3.5 text-[#2E7D73]" />
            <span>{labels.viewCalendar}</span>
          </button>
        </div>

        {/* Advisory Items */}
        <div className="space-y-3">
          {visibleAdvisories.map((advisory) => {
            const hasLiveAlert = activeOutbreakDiseaseIds.includes(advisory.disease_id);
            const isPrecautionExpanded = !!expandedPrecautionIds[advisory.disease_id];

            return (
              <div
                key={advisory.disease_id}
                className={`p-3.5 sm:p-4 rounded-xl border transition-all ${
                  hasLiveAlert
                    ? 'bg-amber-50/80 border-amber-300 ring-1 ring-amber-200'
                    : 'bg-[#F4F7F6] border-[#DDE3E2] hover:bg-[#EDF1F0]/80'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-bold text-[#1B4D4A]">
                        {advisory.disease_name[currentLang] || advisory.disease_name.en}
                      </span>

                      {advisory.risk_level === 'high' ? (
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-800 border border-amber-200 text-[10px] font-bold rounded-md">
                          {labels.highRisk}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-[#B2DFD8]/40 text-[#1B4D4A] border border-[#2E7D73]/30 text-[10px] font-bold rounded-md">
                          {labels.modRisk}
                        </span>
                      )}

                      {/* Live Outbreak Alert Badge */}
                      {hasLiveAlert && (
                        <button
                          onClick={onOpenOutbreaks}
                          className="px-2.5 py-0.5 bg-red-600 hover:bg-red-700 text-white font-bold text-[10px] rounded-md flex items-center gap-1 shadow-2xs cursor-pointer transition animate-pulse"
                          title="Click to view live outbreak details"
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

                  {/* Precautions Expand Accordion Button */}
                  <button
                    onClick={() => togglePrecaution(advisory.disease_id)}
                    className="self-start sm:self-center px-3 py-1.5 bg-white hover:bg-[#EDF1F0] text-[#1B4D4A] font-bold text-xs rounded-lg border border-[#DDE3E2] transition cursor-pointer flex items-center gap-1.5 shrink-0"
                  >
                    <span>{labels.precautionsBtn}</span>
                    {isPrecautionExpanded ? (
                      <ChevronUp className="w-3.5 h-3.5 text-[#2E7D73]" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5 text-[#2E7D73]" />
                    )}
                  </button>
                </div>

                {/* Expanded Precautions List */}
                <AnimatePresence>
                  {isPrecautionExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="mt-3 pt-3 border-t border-[#DDE3E2] space-y-2 text-xs"
                    >
                      <span className="font-bold text-[#1B4D4A] block">
                        {labels.precautionsBtn}:
                      </span>
                      <ul className="space-y-1.5 pl-1">
                        {advisory.precautions.map((p, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-[#1A2B2B]">
                            <CheckCircle2 className="w-3.5 h-3.5 text-[#2E7D73] shrink-0 mt-0.5" />
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

        {/* View All Expansion Footer */}
        {monthlyAdvisory.advisories.length > 2 && (
          <div className="pt-1 text-center">
            <button
              onClick={() => setShowAllAdvisories(!showAllAdvisories)}
              className="px-4 py-2 bg-[#EDF1F0] hover:bg-[#DDE3E2] text-[#1B4D4A] font-bold text-xs rounded-xl border border-[#DDE3E2] transition cursor-pointer inline-flex items-center gap-1.5"
            >
              <span>
                {showAllAdvisories
                  ? labels.showLess
                  : labels.viewMore(monthlyAdvisory.advisories.length)}
              </span>
              {showAllAdvisories ? (
                <ChevronUp className="w-4 h-4 text-[#2E7D73]" />
              ) : (
                <ChevronDown className="w-4 h-4 text-[#2E7D73]" />
              )}
            </button>
          </div>
        )}
      </div>

      {/* Seasonal Calendar 12-Month Modal */}
      {showCalendarModal && (
        <SeasonalCalendarModal
          onClose={() => setShowCalendarModal(false)}
          onOpenOutbreaks={onOpenOutbreaks}
          activeOutbreakDiseaseIds={activeOutbreakDiseaseIds}
        />
      )}
    </>
  );
};
