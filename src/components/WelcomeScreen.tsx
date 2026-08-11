import React from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Stethoscope, 
  ArrowRight, 
  Activity, 
  Home, 
  Clock, 
  ShieldCheck, 
  Award, 
  BookOpen, 
  Building2, 
  Baby, 
  Sprout, 
  Calendar,
  Pill,
  Sparkles
} from 'lucide-react';
import { Patient, Family, LanguageCode } from '../types';
import { PulseLine } from './PulseLine';
import { SeasonalAdvisoryCard } from './SeasonalAdvisoryCard';
import { InAppReminderBanner } from './adherence/InAppReminderBanner';

interface WelcomeScreenProps {
  onStartCaseTaking: () => void;
  onOpenClinicPortal?: () => void;
  onOpenAppointments?: () => void;
  onOpenRoster?: () => void;
  onOpenFollowUps?: () => void;
  onOpenMch?: () => void;
  onOpenOutbreaks?: () => void;
  onOpenSchemes?: () => void;
  onOpenStories?: () => void;
  onOpenArticles?: () => void;
  onOpenNutritionScreening?: () => void;
  onOpenAdherenceTracker?: () => void;
  onOpenChronicCare?: () => void;
  onOpenGardenAdvisor?: () => void;
  activeFamily?: Family | null;
  userMode?: 'patient' | 'healthWorker';
  onSwitchFamily?: () => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({
  onStartCaseTaking,
  onOpenClinicPortal,
  onOpenAppointments,
  onOpenRoster,
  onOpenFollowUps,
  onOpenMch,
  onOpenOutbreaks,
  onOpenSchemes,
  onOpenStories,
  onOpenArticles,
  onOpenNutritionScreening,
  onOpenAdherenceTracker,
  onOpenChronicCare,
  onOpenGardenAdvisor,
  activeFamily,
  userMode = 'patient',
  onSwitchFamily
}) => {
  const { i18n } = useTranslation();
  const currentLang = (i18n.language || 'en') as LanguageCode;

  const handleLanguageChange = (code: LanguageCode) => {
    i18n.changeLanguage(code);
  };

  const familyName = activeFamily?.name || '';

  const texts = currentLang === 'gu'
    ? {
        title: activeFamily ? `${activeFamily.name} - ઘરનું સ્વાસ્થ્ય` : 'નિરામય ક્લિનિકલ સિસ્ટમ',
        tagline: 'તમારું સ્માર્ટ ડિજિટલ દવાખાનું, હંમેશા તમારી સાથે.',
        subtitle: activeFamily
          ? `${activeFamily.name} માટે વ્યક્તિગત હેલ્થ વોલ્ટ. લક્ષણ ટ્રાયજ, દવા પાલન અને ફૉલો-અપ લૉગ્સ.`
          : 'ગામ અને પ્રાથમિક આરોગ્ય કેન્દ્રો માટે અદ્યતન ક્લિનિકલ નિર્ણય સહાયક અને ટ્રાયજ પ્રણાલી (CDSS).',
        startButton: activeFamily
          ? `${familyName} માટે તપાસ શરૂ કરો`
          : 'નવી ક્લિનિકલ તપાસ શરૂ કરો (Begin Triage)',
        storiesButton: 'પ્રેરણાત્મક કથાઓ',
        articlesButton: 'આરોગ્ય આદતો',
        rosterButton: 'કુટુંબ રજિસ્ટર',
        followupsButton: 'ફૉલો-અપ ટ્રેકર',
        mchButton: 'માતા-બાળ સંભાળ',
        outbreaksButton: 'રોગચાળા એલર્ટ',
        schemesButton: 'સરકારી યોજનાઓ',
        nutritionButton: 'પોષણ ઉણપ તપાસ',
        gardenButton: 'ઔષધીય બગીચો',
        dotButton: 'દવા પાલન (DOT)',
        badgeOffline: '૧૦૦% ઑફલાઇન ડેટાબેઝ',
        badgeEncrypted: 'સુરક્ષિત લોકલ EMR',
        badgeRules: 'AI + એવિડન્સ રૂલ્સ'
      }
    : currentLang === 'hi'
    ? {
        title: activeFamily ? `${activeFamily.name} - परिवार स्वास्थ्य` : 'निरामय क्लिनिकल सिस्टम',
        tagline: 'आपका स्मार्ट डिजिटल अस्पताल, हमेशा आपके साथ।',
        subtitle: activeFamily
          ? `${activeFamily.name} के लिए व्यक्तिगत हेल्थ वॉल्ट। लक्षण ट्राइएज, दवा पालन और फॉलो-अप रिकॉर्ड।`
          : 'ग्रामीण एवं प्राथमिक स्वास्थ्य केंद्रों के लिए उन्नत क्लिनिकल निर्णय सहायता एवं ट्राइएज प्रणाली (CDSS)।',
        startButton: activeFamily
          ? `${familyName} के लिए जांच शुरू करें`
          : 'नई क्लिनिकल जांच शुरू करें (Begin Triage)',
        storiesButton: 'प्रेरणा की कहानियां',
        articlesButton: 'स्वास्थ्य नियम',
        rosterButton: 'परिवार रजिस्टर',
        followupsButton: 'फॉलो-अप ट्रैकर',
        mchButton: 'मातृ-शिशु देखभाल',
        outbreaksButton: 'प्रकोप अलर्ट',
        schemesButton: 'सरकारी योजनाएं',
        nutritionButton: 'पोषण कमी जांच',
        gardenButton: 'औषधीय बगीचा',
        dotButton: 'दवा पालन (DOT)',
        badgeOffline: '100% ऑफ़लाइन डेटाबेस',
        badgeEncrypted: 'सुरक्षित लोकल EMR',
        badgeRules: 'AI + एविडेंस रूल्स'
      }
    : {
        title: activeFamily ? `${activeFamily.name} Health Vault` : 'Nirāmay Clinical System',
        tagline: 'Your Intelligent Village Hospital & Decision Support.',
        subtitle: activeFamily
          ? `Private Household Health Dashboard for ${activeFamily.name}. Manage family symptoms, adherence, and clinical follow-ups.`
          : 'Clinical Decision Support System (CDSS) & Evidence-Based Triage Protocol for Community Health Workers and Families.',
        startButton: activeFamily
          ? `Begin Assessment for ${familyName}`
          : 'Begin Clinical Assessment (Triage)',
        storiesButton: 'Hope & Recovery Stories',
        articlesButton: 'Daily Health Habits',
        rosterButton: 'Family Directory',
        followupsButton: 'Follow-Up Tracker',
        mchButton: 'MCH Maternal Care',
        outbreaksButton: 'Outbreak Alerts',
        schemesButton: 'Govt Health Schemes',
        nutritionButton: 'Nutrition Screening',
        gardenButton: 'Medicinal Plants',
        dotButton: 'DOT Adherence',
        badgeOffline: '100% Offline Hybrid DB',
        badgeEncrypted: 'Encrypted Local EMR',
        badgeRules: 'Evidence-Based CDSS'
      };

  return (
    <main className="min-h-[calc(100vh-70px)] flex flex-col items-center justify-center p-4 sm:p-6 md:p-8 bg-[#F3F7F6] font-sans relative overflow-hidden">
      {/* Soft Ambient Healing Radial Background */}
      <div className="absolute inset-0 ambient-glow pointer-events-none" />

      <div className="w-full max-w-4xl mx-auto space-y-5 relative z-10">
        
        {/* In-App Medication Overdue Reminder Banner */}
        {onOpenAdherenceTracker && (
          <InAppReminderBanner
            currentLang={currentLang}
            onOpenTracker={onOpenAdherenceTracker}
          />
        )}

        {/* Main Hero Card in Elevated Glass Style */}
        <div className="glass-card p-6 sm:p-10 text-center space-y-6 relative overflow-hidden border border-[#D5E2DF]">
          
          {/* Active Family Header Pill */}
          {activeFamily && (
            <div className="inline-flex items-center gap-2 bg-[#E6F6F4] border border-[#B2DFD8] px-4 py-1.5 rounded-full text-xs font-bold text-[#0F3835] shadow-xs">
              <Home className="w-3.5 h-3.5 text-[#1E6B63]" />
              <span>{activeFamily.name} ({activeFamily.village || 'Household'})</span>
              {onSwitchFamily && (
                <button
                  onClick={onSwitchFamily}
                  className="ml-2 text-[11px] underline text-[#1E6B63] hover:text-[#0F3835] cursor-pointer font-semibold"
                >
                  {currentLang === 'gu' ? 'કુટુંબ બદલો' : currentLang === 'hi' ? 'परिवार बदलें' : 'Switch Family'}
                </button>
              )}
            </div>
          )}

          {/* Project Botanical Heart Logo Motif */}
          <div className="flex justify-center my-1">
            <div className="relative w-28 h-32 sm:w-32 sm:h-36 flex items-center justify-center p-2 group transition-transform duration-300 hover:scale-105">
              <img
                src="/logo.png"
                alt="Nirāmay Project Logo"
                className="w-full h-full object-contain filter drop-shadow-[0_10px_20px_rgba(15,56,53,0.22)]"
              />
            </div>
          </div>

          {/* Title & Pulse Line Motif */}
          <div className="space-y-2">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#0F3835] tracking-tight font-display">
              {texts.title}
            </h1>

            <div className="flex justify-center my-1.5">
              <PulseLine width={110} color="#1E6B63" animated={true} />
            </div>

            <p className="text-base sm:text-lg font-bold text-[#1E6B63] tracking-normal">
              {texts.tagline}
            </p>

            <p className="text-xs sm:text-sm text-[#4A6360] max-w-xl mx-auto leading-relaxed pt-1 font-medium">
              {texts.subtitle}
            </p>
          </div>

          {/* Language Selector Pill Bar */}
          <div className="flex items-center justify-center gap-2 pt-1 font-mono">
            {[
              { code: 'gu', label: 'ગુજરાતી' },
              { code: 'hi', label: 'हिन्दी' },
              { code: 'en', label: 'English' }
            ].map((lang) => (
              <button
                key={lang.code}
                onClick={() => handleLanguageChange(lang.code as LanguageCode)}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer border ${
                  currentLang === lang.code
                    ? 'bg-[#0F3835] text-white border-[#0F3835] shadow-sm'
                    : 'bg-[#EBF2F0] text-[#4A6360] border-[#D5E2DF] hover:bg-[#B2DFD8]/40 hover:text-[#0F3835]'
                }`}
              >
                {lang.label}
              </button>
            ))}
          </div>

          {/* Primary Action Button */}
          <div className="pt-2 space-y-4 font-sans">
            <button
              onClick={onStartCaseTaking}
              className="w-full min-h-[58px] inline-flex items-center justify-center gap-3 bg-gradient-to-r from-[#1E6B63] via-[#1B4D4A] to-[#0F3835] hover:opacity-95 active:scale-[0.99] text-white font-extrabold text-base sm:text-lg px-8 py-4 rounded-2xl border border-[#38A394]/40 transition-all cursor-pointer shadow-[0_8px_24px_rgba(30,107,99,0.35)] group"
              aria-label={texts.startButton}
            >
              <div className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
                <Stethoscope className="w-5 h-5 text-emerald-200" />
              </div>
              <span className="tracking-tight">{texts.startButton}</span>
              <ArrowRight className="w-5 h-5 text-emerald-200 group-hover:translate-x-1.5 transition-transform" />
            </button>

            {/* Quick Online Clinic Appointment Booking Banner */}
            {onOpenAppointments && (
              <button
                onClick={onOpenAppointments}
                className="w-full p-3.5 bg-gradient-to-r from-teal-900 via-teal-800 to-cyan-900 hover:opacity-95 text-white font-bold rounded-2xl border border-teal-500/40 shadow-sm transition flex items-center justify-between gap-3 cursor-pointer group"
              >
                <div className="flex items-center gap-3 text-left">
                  <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center shrink-0 border border-white/20">
                    <Calendar className="w-5 h-5 text-teal-200" />
                  </div>
                  <div>
                    <span className="block font-black text-sm text-white tracking-tight">
                      📅 Book Clinic Appointment & OPD
                    </span>
                    <span className="block text-[11px] text-teal-100/90 font-normal">
                      Reserve consultation slots at Anand PHC, Civil Hospital & CHCs
                    </span>
                  </div>
                </div>
                <div className="p-1.5 rounded-lg bg-white/10 group-hover:bg-white/20 transition shrink-0">
                  <ArrowRight className="w-4 h-4 text-teal-200 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </button>
            )}

            {/* Core Medical & Community Feature Cards Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1 text-left">
              {onOpenAdherenceTracker && (
                <button
                  onClick={onOpenAdherenceTracker}
                  className="p-3.5 bg-white hover:bg-[#F3F7F6] text-[#0F3835] font-bold rounded-2xl transition border border-[#D5E2DF] hover:border-[#1E6B63]/40 shadow-xs flex flex-col justify-between gap-2 cursor-pointer interactive-card group"
                >
                  <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-700 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Pill className="w-4 h-4 text-amber-600" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-[#0F3835]">{texts.dotButton}</h4>
                    <p className="text-[10px] text-[#4A6360] font-normal leading-tight mt-0.5">Daily doses & streaks</p>
                  </div>
                </button>
              )}

              {onOpenRoster && (
                <button
                  onClick={onOpenRoster}
                  className="p-3.5 bg-white hover:bg-[#F3F7F6] text-[#0F3835] font-bold rounded-2xl transition border border-[#D5E2DF] hover:border-[#1E6B63]/40 shadow-xs flex flex-col justify-between gap-2 cursor-pointer interactive-card group"
                >
                  <div className="w-8 h-8 rounded-xl bg-teal-500/10 text-teal-700 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Home className="w-4 h-4 text-teal-600" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-[#0F3835]">{texts.rosterButton}</h4>
                    <p className="text-[10px] text-[#4A6360] font-normal leading-tight mt-0.5">Family & member logs</p>
                  </div>
                </button>
              )}

              {onOpenFollowUps && (
                <button
                  onClick={onOpenFollowUps}
                  className="p-3.5 bg-white hover:bg-[#F3F7F6] text-[#0F3835] font-bold rounded-2xl transition border border-[#D5E2DF] hover:border-[#1E6B63]/40 shadow-xs flex flex-col justify-between gap-2 cursor-pointer interactive-card group"
                >
                  <div className="w-8 h-8 rounded-xl bg-orange-500/10 text-orange-700 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Clock className="w-4 h-4 text-orange-600" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-[#0F3835]">{texts.followupsButton}</h4>
                    <p className="text-[10px] text-[#4A6360] font-normal leading-tight mt-0.5">Scheduled clinical reviews</p>
                  </div>
                </button>
              )}

              {onOpenMch && (
                <button
                  onClick={onOpenMch}
                  className="p-3.5 bg-white hover:bg-[#F3F7F6] text-[#0F3835] font-bold rounded-2xl transition border border-[#D5E2DF] hover:border-[#1E6B63]/40 shadow-xs flex flex-col justify-between gap-2 cursor-pointer interactive-card group"
                >
                  <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-700 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Baby className="w-4 h-4 text-rose-600" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-[#0F3835]">{texts.mchButton}</h4>
                    <p className="text-[10px] text-[#4A6360] font-normal leading-tight mt-0.5">Pregnancy & child care</p>
                  </div>
                </button>
              )}
            </div>

            {/* Secondary Modules Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs">
              {onOpenChronicCare && (
                <button
                  onClick={onOpenChronicCare}
                  className="p-2.5 bg-[#EBF2F0] hover:bg-[#E6F6F4] text-[#0F3835] font-bold rounded-xl transition flex items-center gap-2 cursor-pointer border border-[#D5E2DF]"
                >
                  <Activity className="w-4 h-4 text-teal-600 shrink-0" />
                  <span className="truncate">{currentLang === 'gu' ? 'ક્રોનિક ડાયાબિટીસ' : currentLang === 'hi' ? 'क्रोनिक केयर' : 'Chronic Care'}</span>
                </button>
              )}

              {onOpenGardenAdvisor && (
                <button
                  onClick={onOpenGardenAdvisor}
                  className="p-2.5 bg-[#EBF2F0] hover:bg-[#E6F6F4] text-[#0F3835] font-bold rounded-xl transition flex items-center gap-2 cursor-pointer border border-[#D5E2DF]"
                >
                  <Sprout className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="truncate">{texts.gardenButton}</span>
                </button>
              )}

              {onOpenNutritionScreening && (
                <button
                  onClick={onOpenNutritionScreening}
                  className="p-2.5 bg-[#EBF2F0] hover:bg-[#E6F6F4] text-[#0F3835] font-bold rounded-xl transition flex items-center gap-2 cursor-pointer border border-[#D5E2DF]"
                >
                  <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                  <span className="truncate">{texts.nutritionButton}</span>
                </button>
              )}

              {onOpenStories && (
                <button
                  onClick={onOpenStories}
                  className="p-2.5 bg-[#EBF2F0] hover:bg-[#E6F6F4] text-[#0F3835] font-bold rounded-xl transition flex items-center gap-2 cursor-pointer border border-[#D5E2DF]"
                >
                  <Award className="w-4 h-4 text-teal-600 shrink-0" />
                  <span className="truncate">{texts.storiesButton}</span>
                </button>
              )}

              {onOpenArticles && (
                <button
                  onClick={onOpenArticles}
                  className="p-2.5 bg-[#EBF2F0] hover:bg-[#E6F6F4] text-[#0F3835] font-bold rounded-xl transition flex items-center gap-2 cursor-pointer border border-[#D5E2DF]"
                >
                  <BookOpen className="w-4 h-4 text-cyan-600 shrink-0" />
                  <span className="truncate">{texts.articlesButton}</span>
                </button>
              )}
            </div>
          </div>

          {/* System Security Badges */}
          <div className="pt-4 border-t border-[#D5E2DF] grid grid-cols-3 gap-2 text-center text-[10px] font-mono text-[#4A6360]">
            <div className="p-2 border border-[#D5E2DF] bg-[#EBF2F0]/80 rounded-xl flex items-center justify-center gap-1.5 font-semibold">
              <ShieldCheck className="w-3.5 h-3.5 text-[#1E6B63]" />
              <span>{texts.badgeOffline}</span>
            </div>
            <div className="p-2 border border-[#D5E2DF] bg-[#EBF2F0]/80 rounded-xl flex items-center justify-center gap-1.5 font-semibold">
              <ShieldCheck className="w-3.5 h-3.5 text-[#1E6B63]" />
              <span>{texts.badgeEncrypted}</span>
            </div>
            <div className="p-2 border border-[#D5E2DF] bg-[#EBF2F0]/80 rounded-xl flex items-center justify-center gap-1.5 font-semibold">
              <ShieldCheck className="w-3.5 h-3.5 text-[#1E6B63]" />
              <span>{texts.badgeRules}</span>
            </div>
          </div>

        </div>

        {/* Dynamic Seasonal Health Advisory Card */}
        <SeasonalAdvisoryCard onOpenOutbreaks={onOpenOutbreaks} />
      </div>
    </main>
  );
};
