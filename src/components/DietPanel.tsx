import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Apple,
  Leaf,
  CheckCircle2,
  XCircle,
  Info,
  ChevronUp,
  ChevronDown,
  Sparkles,
  Baby,
  UserCheck,
  Utensils
} from 'lucide-react';
import { CaseData, LanguageCode, ResolvedDiet } from '../types';
import { getDiet } from '../engine/dietEngine';

interface DietPanelProps {
  diseaseId: string;
  diseaseName: string;
  caseData: CaseData;
  defaultExpanded?: boolean;
  mergedDeficiencyDiet?: { eat: string[]; avoid: string[] };
  onOpenNutritionScreening?: () => void;
}

export const DietPanel: React.FC<DietPanelProps> = ({
  diseaseId,
  diseaseName,
  caseData,
  defaultExpanded = true,
  mergedDeficiencyDiet,
  onOpenNutritionScreening,
}) => {
  const { i18n } = useTranslation();
  const currentLang = (i18n.language || 'en') as LanguageCode;

  const [isExpanded, setIsExpanded] = useState<boolean>(defaultExpanded);
  const [activeTab, setActiveTab] = useState<'modern' | 'ayurveda'>('modern');

  // Compute resolved localized diet for disease and patient profile
  const dietAdvice: ResolvedDiet = getDiet(diseaseId, caseData, currentLang);

  const baseSection =
    activeTab === 'modern' ? dietAdvice.modern : dietAdvice.ayurveda || dietAdvice.modern;

  // Merge deficiency screening dietary items if present
  const mergedEat = [
    ...(baseSection.eat || []),
    ...(mergedDeficiencyDiet?.eat || []),
  ].filter((item, index, self) => self.indexOf(item) === index);

  const mergedAvoid = [
    ...(baseSection.avoid || []),
    ...(mergedDeficiencyDiet?.avoid || []),
  ].filter((item, index, self) => self.indexOf(item) === index);

  const activeSection = {
    ...baseSection,
    eat: mergedEat,
    avoid: mergedAvoid,
  };

  // Localized Labels for UI
  const labels = {
    title:
      currentLang === 'gu'
        ? 'આહાર અને પથ્યાપથ્ય સલાહ'
        : currentLang === 'hi'
        ? 'आहार एवं पथ्य-अपथ्य सलाह'
        : 'Dietary & Pathya-Apathya Advice',
    subtitle:
      currentLang === 'gu'
        ? 'રોગ મુક્તિ માટે પોષણ અને આયુર્વેદિક માર્ગદર્શન'
        : currentLang === 'hi'
        ? 'रोग निवारण हेतु पोषण व आयुर्वेदिक मार्गदर्शन'
        : 'Evidence-based modern nutrition & traditional Ayurvedic pathya-apathya',
    modernTab:
      currentLang === 'gu'
        ? 'આધુનિક પોષણ'
        : currentLang === 'hi'
        ? 'आधुनिक आहार'
        : 'Modern Diet',
    ayurvedaTab:
      currentLang === 'gu'
        ? 'આયુર્વેદિક પથ્ય'
        : currentLang === 'hi'
        ? 'आयुर्वेदिक पथ्य'
        : 'Ayurvedic Pathya',
    eatTitle:
      currentLang === 'gu'
        ? 'સેવન કરવા યોગ્ય ખોરાક (Pathya)'
        : currentLang === 'hi'
        ? 'खाद्य पदार्थ (पथ्य - Foods to Eat)'
        : 'Foods to Eat',
    avoidTitle:
      currentLang === 'gu'
        ? 'ટાળવા યોગ્ય ખોરાક (Apathya)'
        : currentLang === 'hi'
        ? 'वर्जित पदार्थ (अपथ्य - Foods to Avoid)'
        : 'Foods to Avoid',
    noItems:
      currentLang === 'gu'
        ? 'કોઈ ચોક્કસ માહિતી નથી'
        : currentLang === 'hi'
        ? 'कोई विशेष जानकारी उपलब्ध नहीं'
        : 'No specific recommendations recorded'
  };

  return (
    <div className="bg-white rounded-2xl border border-[#DDE3E2] shadow-card overflow-hidden transition-all font-sans">
      {/* HEADER BAR */}
      <div className="flex items-center justify-between p-4 sm:p-5 bg-[#1B4D4A] text-white border-b border-[#2E7D73]/30">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-3 text-left flex-1 cursor-pointer"
        >
          <div className="p-2.5 rounded-xl bg-[#2E7D73] text-white shrink-0 shadow-xs">
            <Utensils className="w-5 h-5 text-[#B2DFD8]" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-extrabold text-white text-base sm:text-lg font-display">
                {labels.title}
              </h3>
              {dietAdvice.isAgeOverridden && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-[#2E7D73]/50 text-[#B2DFD8] text-[10px] font-bold border border-[#B2DFD8]/20">
                  <Baby className="w-3 h-3 text-white" />
                  <span>{dietAdvice.ageOverrideNote}</span>
                </span>
              )}
            </div>
            <p className="text-xs text-[#B2DFD8]/90 font-sans mt-0.5">{labels.subtitle}</p>
          </div>
        </button>

        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-2 text-[#B2DFD8] hover:text-white rounded-xl transition-colors cursor-pointer"
          title="Toggle Diet Panel"
        >
          {isExpanded ? (
            <ChevronUp className="w-5 h-5" />
          ) : (
            <ChevronDown className="w-5 h-5" />
          )}
        </button>
      </div>

      {/* CONTENT WHEN EXPANDED */}
      {isExpanded && (
        <div className="p-4 sm:p-6 border-t border-[#DDE3E2] space-y-5 bg-[#F4F7F6]">
          {/* TABS SELECTOR & SCREENING BUTTON */}
          <div className="flex flex-wrap items-center justify-between gap-3 font-sans text-xs">
            <div className="flex items-center gap-2 flex-1 max-w-md">
              <button
                onClick={() => setActiveTab('modern')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-3.5 rounded-xl font-bold transition cursor-pointer ${
                  activeTab === 'modern'
                    ? 'bg-[#2E7D73] text-white shadow-xs'
                    : 'bg-white text-[#1B4D4A] border border-[#DDE3E2] hover:bg-[#EDF1F0]'
                }`}
              >
                <Apple className="w-4 h-4" />
                <span>{labels.modernTab}</span>
              </button>

              {dietAdvice.ayurveda && (
                <button
                  onClick={() => setActiveTab('ayurveda')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 px-3.5 rounded-xl font-bold transition cursor-pointer ${
                    activeTab === 'ayurveda'
                      ? 'bg-[#2E7D73] text-white shadow-xs'
                      : 'bg-white text-[#1B4D4A] border border-[#DDE3E2] hover:bg-[#EDF1F0]'
                  }`}
                >
                  <Leaf className="w-4 h-4" />
                  <span>{labels.ayurvedaTab}</span>
                </button>
              )}
            </div>

            {onOpenNutritionScreening && (
              <button
                type="button"
                onClick={onOpenNutritionScreening}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition shadow-xs text-xs"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M11 20A9 9 0 0 0 20 11V3h-8a9 9 0 0 0-9 9 9 9 0 0 0 8 8z" />
                  <path d="M11 20v-9a3 3 0 0 1 3-3h6" />
                </svg>
                <span>Screen Nutrition Deficiency</span>
              </button>
            )}
          </div>

          {/* REASON / CLINICAL RATIONALE BANNER */}
          {activeSection.reason && (
            <div className="p-4 rounded-xl bg-[#EDF1F0] border border-[#DDE3E2] flex items-start gap-2.5 text-xs sm:text-sm text-[#1A2B2B] leading-relaxed font-sans">
              <Info className="w-4 h-4 text-[#2E7D73] shrink-0 mt-0.5" />
              <div className="text-sm font-medium">
                <strong className="font-extrabold text-[#1B4D4A] block mb-0.5 font-display">
                  {activeTab === 'modern' ? 'NUTRITIONAL RATIONALE:' : 'AYURVEDIC PRINCIPLES (SIDDHANTA):'}
                </strong>
                <span>"{activeSection.reason}"</span>
              </div>
            </div>
          )}

          {/* EAT vs AVOID CARDS GRID */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-sans">
            {/* FOODS TO EAT */}
            <div className="bg-white border border-[#DDE3E2] rounded-2xl p-5 shadow-card flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-[#1B4D4A] border-b border-[#DDE3E2] pb-2.5 mb-3 font-display">
                  <CheckCircle2 className="w-5 h-5 text-[#2E7D73] shrink-0" />
                  <h4 className="font-bold text-[#1B4D4A] text-base">
                    {labels.eatTitle}
                  </h4>
                </div>

                {activeSection.eat && activeSection.eat.length > 0 ? (
                  <ul className="space-y-2.5 text-xs sm:text-sm text-[#1A2B2B] font-medium font-sans">
                    {activeSection.eat.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2 leading-snug">
                        <span className="w-2 h-2 rounded-full bg-[#2E7D73] mt-1.5 shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-[#5F6D6C] italic">{labels.noItems}</p>
                )}
              </div>

              <div className="mt-4 pt-2.5 border-t border-[#DDE3E2] text-[11px] font-bold flex items-center justify-between text-[#5F6D6C]">
                <span>Wholesome • Pathya</span>
                <span className="bg-[#2E7D73] text-white px-2.5 py-0.5 rounded-lg font-bold">
                  RECOMMENDED
                </span>
              </div>
            </div>

            {/* FOODS TO AVOID */}
            <div className="bg-white border border-[#DDE3E2] rounded-2xl p-5 shadow-card flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-[#1B4D4A] border-b border-[#DDE3E2] pb-2.5 mb-3 font-display">
                  <XCircle className="w-5 h-5 text-[#C46A3A] shrink-0" />
                  <h4 className="font-bold text-[#1B4D4A] text-base">
                    {labels.avoidTitle}
                  </h4>
                </div>

                {activeSection.avoid && activeSection.avoid.length > 0 ? (
                  <ul className="space-y-2.5 text-xs sm:text-sm text-[#1A2B2B] font-medium font-sans">
                    {activeSection.avoid.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2 leading-snug">
                        <span className="w-2 h-2 rounded-full bg-[#C46A3A] mt-1.5 shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-[#5F6D6C] italic">{labels.noItems}</p>
                )}
              </div>

              <div className="mt-4 pt-2.5 border-t border-[#DDE3E2] text-[11px] font-bold flex items-center justify-between text-[#5F6D6C]">
                <span>Unwholesome • Apathya</span>
                <span className="bg-[#C46A3A] text-white px-2.5 py-0.5 rounded-lg font-bold">
                  STRICTLY AVOID
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
