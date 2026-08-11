import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { LanguageCode, Family } from '../types';
import { getDueFollowUps } from '../db/db';
import { PulseLine } from './PulseLine';
import { 
  Home, 
  ShieldAlert, 
  RefreshCw, 
  Stethoscope, 
  Users, 
  Clock, 
  Pill, 
  Baby, 
  ChevronDown, 
  Sparkles, 
  BookOpen, 
  Sprout, 
  AlertTriangle, 
  MapPin, 
  Menu, 
  X,
  FileText,
  Activity,
  Hospital,
  Building2,
  Calendar
} from 'lucide-react';

const LANGUAGES: { code: LanguageCode; label: string; script: string }[] = [
  { code: 'gu', label: 'ગુજરાતી', script: 'Gujarati' },
  { code: 'hi', label: 'हिन्दी', script: 'Hindi' },
  { code: 'en', label: 'English', script: 'English' },
];

interface HeaderProps {
  onHomeClick?: () => void;
  onNearbyClick?: () => void;
  onRosterClick?: () => void;
  onFollowUpsClick?: () => void;
  onOutbreakClick?: () => void;
  onMchClick?: () => void;
  onSchemesClick?: () => void;
  onStoriesClick?: () => void;
  onArticlesClick?: () => void;
  onAdherenceTrackerClick?: () => void;
  onChronicCareClick?: () => void;
  onGardenClick?: () => void;
  onAppointmentsClick?: () => void;
  onSwitchPortal?: () => void;
  currentView?: string;
  activeFamily?: Family | null;
  userMode?: 'patient' | 'healthWorker';
  onSwitchFamily?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onHomeClick,
  onNearbyClick,
  onRosterClick,
  onFollowUpsClick,
  onOutbreakClick,
  onMchClick,
  onSchemesClick,
  onStoriesClick,
  onArticlesClick,
  onAdherenceTrackerClick,
  onChronicCareClick,
  onGardenClick,
  onAppointmentsClick,
  onSwitchPortal,
  currentView = 'welcome',
  activeFamily,
  userMode = 'patient',
  onSwitchFamily
}) => {
  const { t, i18n } = useTranslation();
  const [dueCount, setDueCount] = useState<number>(0);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  const currentLang = i18n.language as LanguageCode;

  useEffect(() => {
    checkFollowUps();
  }, [currentView]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
        setShowMoreMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const checkFollowUps = async () => {
    try {
      const items = await getDueFollowUps();
      setDueCount(items.length);
    } catch (err) {
      // ignore
    }
  };

  const handleLanguageChange = (code: LanguageCode) => {
    i18n.changeLanguage(code);
  };

  const labels = {
    triage: currentLang === 'gu' ? 'ક્લિનિકલ ટ્રાયજ' : currentLang === 'hi' ? 'ट्राइएज जांच' : 'Triage',
    roster: currentLang === 'gu' ? 'કુટુંબ રજિસ્ટર' : currentLang === 'hi' ? 'परिवार रजिस्टर' : 'Family Vault',
    followups: currentLang === 'gu' ? 'ફૉલો-અપ' : currentLang === 'hi' ? 'फॉलो-अप' : 'Follow-ups',
    adherence: currentLang === 'gu' ? 'દવા પાલન (DOT)' : currentLang === 'hi' ? 'दवा पालन (DOT)' : 'DOT Adherence',
    chronic: currentLang === 'gu' ? 'ક્રોનિક ડાયાબિટીસ' : currentLang === 'hi' ? 'क्रोनिक केयर' : 'Chronic Care',
    mch: currentLang === 'gu' ? 'માતા-બાળ સંભાળ' : currentLang === 'hi' ? 'માતૃ-શिशु देखभाल' : 'MCH Care',
    schemes: currentLang === 'gu' ? 'સરકારી યોજનાઓ' : currentLang === 'hi' ? 'सरकारी योजनाएं' : 'Govt Schemes',
    stories: currentLang === 'gu' ? 'પ્રેરણા કથાઓ' : currentLang === 'hi' ? 'प्रेरणा कहानियां' : 'Hope Stories',
    articles: currentLang === 'gu' ? 'સ્વાસ્થ્ય આદતો' : currentLang === 'hi' ? 'स्वास्थ्य नियम' : 'Daily Habits',
    garden: currentLang === 'gu' ? 'ઔષધીય બગીચો' : currentLang === 'hi' ? 'औषधीय बगीचा' : 'Plant Garden',
    outbreaks: currentLang === 'gu' ? 'રોગચાળા એલર્ટ' : currentLang === 'hi' ? 'प्रकोप अलर्ट' : 'Outbreak Alert',
    nearby: currentLang === 'gu' ? 'નજીકના કેન્દ્રો' : currentLang === 'hi' ? 'નિકટતમ કેન્દ્ર' : 'Nearby PHC',
    more: currentLang === 'gu' ? 'વધુ સાધનો' : currentLang === 'hi' ? 'अधिक उपकरण' : 'More Modules'
  };

  const isMoreActive = ['chronic_care', 'schemes', 'stories', 'articles', 'garden_advisor', 'outbreak', 'nearby'].includes(currentView);

  return (
    <header className="bg-[#0F3835] text-white border-b border-[#1E6B63]/60 sticky top-0 z-50 font-sans shadow-lg backdrop-blur-md">
      {/* Top Clinical Status Strip */}
      <div className="bg-[#092422] px-3 sm:px-6 py-1 text-[11px] font-mono text-[#B2DFD8] border-b border-[#143B38] flex items-center justify-between overflow-x-auto">
        <div className="flex items-center gap-2.5 shrink-0">
          <span className="font-bold text-white uppercase tracking-widest font-display text-[10px] flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            Nirāmay Clinical Decision Support
          </span>
          <span className="opacity-30">|</span>
          <span className="hidden sm:inline text-[#B2DFD8]/80 text-[10px]">ISSN 2456-8821</span>
          <span className="opacity-30 hidden md:inline">|</span>
          <span className="hidden md:inline text-emerald-300/80 text-[10px]">Encrypted Offline Engine v2026.4</span>
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          <PulseLine width={44} color="#38A394" animated={true} />
          <span className="text-[10px] font-bold text-emerald-200 hidden sm:inline tracking-wider">
            VITAL LINK ACTIVE
          </span>
        </div>
      </div>

      {/* Main Navigation Bar */}
      <div className="w-full px-3 sm:px-6 lg:px-8 py-2 flex items-center justify-between gap-2.5 sm:gap-4">
        {/* Brand Logo & Household Badge */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={onHomeClick}
            className="flex items-center gap-2.5 text-left group bg-[#1E6B63]/25 hover:bg-[#1E6B63]/45 px-2.5 py-1.5 rounded-2xl border border-[#38A394]/30 hover:border-[#38A394]/60 transition-all cursor-pointer shadow-xs"
            aria-label="Niramay Clinical System Home"
          >
            <div className="relative w-9 h-9 flex items-center justify-center shrink-0">
              <img 
                src="/logo.png" 
                alt="Nirāmay Botanical Heart Logo" 
                className="w-full h-full object-contain filter drop-shadow-[0_2px_6px_rgba(0,0,0,0.35)] group-hover:scale-105 transition-transform" 
              />
            </div>
            <div>
              <h1 className="text-sm sm:text-base font-extrabold text-white tracking-tight leading-none font-display flex items-center gap-1.5">
                <span>{t('app.title')}</span>
                <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 font-mono font-medium border border-emerald-400/30 hidden lg:inline">
                  PRO
                </span>
              </h1>
              <p className="text-[10px] text-[#B2DFD8] font-medium leading-tight mt-0.5 hidden sm:block">
                {t('app.tagline')}
              </p>
            </div>
          </button>

          {/* Active Family / Health Worker Badge */}
          {userMode === 'patient' && activeFamily && (
            <div className="hidden 2xl:flex items-center gap-2 px-3 py-1 bg-[#143B38] border border-[#2E7D73] rounded-xl text-xs text-white shadow-inner">
              <div className="flex items-center gap-1.5 font-bold text-emerald-200">
                <Home className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
                <span className="max-w-[130px] truncate">{activeFamily.name}</span>
              </div>
              {onSwitchFamily && (
                <button
                  onClick={onSwitchFamily}
                  className="text-[10px] text-amber-200 hover:text-white underline font-semibold flex items-center gap-1 ml-1 cursor-pointer"
                  title="Switch family household"
                >
                  <RefreshCw className="w-2.5 h-2.5" />
                  <span>Switch</span>
                </button>
              )}
            </div>
          )}

          {userMode === 'healthWorker' && (
            <div className="hidden 2xl:flex items-center gap-2 px-3 py-1 bg-amber-950/70 border border-amber-500/50 rounded-xl text-xs text-amber-200 shadow-inner">
              <div className="flex items-center gap-1.5 font-bold text-amber-300">
                <ShieldAlert className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                <span>Health Worker</span>
              </div>
              {onSwitchFamily && (
                <button
                  onClick={onSwitchFamily}
                  className="text-[10px] text-white hover:underline font-semibold flex items-center gap-1 ml-1 cursor-pointer"
                >
                  <RefreshCw className="w-2.5 h-2.5" />
                  <span>Switch</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Center Primary Navigation Tabs (Desktop) */}
        <nav className="hidden xl:flex items-center gap-1 bg-[#092422]/90 px-1.5 py-1 rounded-2xl border border-[#1E6B63]/60 text-xs shadow-inner shrink-0">
          <button
            onClick={onHomeClick}
            className={`px-2.5 py-1.5 rounded-xl text-xs transition-all cursor-pointer flex items-center gap-1.5 shrink-0 font-medium ${
              currentView === 'welcome' || currentView === 'caseTaking' || currentView === 'result'
                ? 'bg-[#1E6B63] text-white font-bold shadow-sm border border-[#38A394]/50'
                : 'text-[#B2DFD8] hover:text-white hover:bg-[#1E6B63]/30'
            }`}
          >
            <Stethoscope className="w-3.5 h-3.5 text-emerald-300" />
            <span>{labels.triage}</span>
          </button>

          <button
            onClick={onAdherenceTrackerClick}
            className={`px-2.5 py-1.5 rounded-xl text-xs transition-all cursor-pointer flex items-center gap-1.5 shrink-0 font-medium ${
              currentView === 'adherence_tracker'
                ? 'bg-[#1E6B63] text-white font-bold shadow-sm border border-[#38A394]/50'
                : 'text-[#B2DFD8] hover:text-white hover:bg-[#1E6B63]/30'
            }`}
          >
            <Pill className="w-3.5 h-3.5 text-amber-300" />
            <span>{labels.adherence}</span>
          </button>

          <button
            onClick={onRosterClick}
            className={`px-2.5 py-1.5 rounded-xl text-xs transition-all cursor-pointer flex items-center gap-1.5 shrink-0 font-medium ${
              currentView === 'roster'
                ? 'bg-[#1E6B63] text-white font-bold shadow-sm border border-[#38A394]/50'
                : 'text-[#B2DFD8] hover:text-white hover:bg-[#1E6B63]/30'
            }`}
          >
            <Users className="w-3.5 h-3.5 text-teal-300" />
            <span>{labels.roster}</span>
          </button>

          <button
            onClick={onFollowUpsClick}
            className={`px-2.5 py-1.5 rounded-xl text-xs transition-all cursor-pointer flex items-center gap-1.5 shrink-0 relative font-medium ${
              currentView === 'followups'
                ? 'bg-[#1E6B63] text-white font-bold shadow-sm border border-[#38A394]/50'
                : 'text-[#B2DFD8] hover:text-white hover:bg-[#1E6B63]/30'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-orange-300" />
            <span>{labels.followups}</span>
            {dueCount > 0 && (
              <span className="w-4 h-4 bg-[#D9534F] text-white font-mono font-bold text-[10px] rounded-full flex items-center justify-center animate-pulse">
                {dueCount}
              </span>
            )}
          </button>

          <button
            onClick={onMchClick}
            className={`px-2.5 py-1.5 rounded-xl text-xs transition-all cursor-pointer flex items-center gap-1.5 shrink-0 font-medium ${
              currentView === 'mch'
                ? 'bg-[#1E6B63] text-white font-bold shadow-sm border border-[#38A394]/50'
                : 'text-[#B2DFD8] hover:text-white hover:bg-[#1E6B63]/30'
            }`}
          >
            <Baby className="w-3.5 h-3.5 text-rose-300" />
            <span>{labels.mch}</span>
          </button>

          {/* More Modules Dropdown Menu */}
          <div className="relative" ref={moreMenuRef}>
            <button
              onClick={() => setShowMoreMenu(!showMoreMenu)}
              className={`px-2.5 py-1.5 rounded-xl text-xs transition-all cursor-pointer flex items-center gap-1.5 shrink-0 font-medium ${
                isMoreActive
                  ? 'bg-[#1E6B63] text-white font-bold shadow-sm border border-[#38A394]/50'
                  : 'text-[#B2DFD8] hover:text-white hover:bg-[#1E6B63]/30'
              }`}
            >
              <span>{labels.more}</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showMoreMenu ? 'rotate-180' : ''}`} />
            </button>

            {showMoreMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-[#0F3835] border border-[#1E6B63] rounded-2xl shadow-2xl p-1.5 z-50 space-y-1 animate-in fade-in zoom-in-95 duration-150">
                <button
                  onClick={() => { onAppointmentsClick?.(); setShowMoreMenu(false); }}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center gap-2.5 transition-all cursor-pointer ${
                    currentView === 'appointments' ? 'bg-[#1E6B63] text-white font-bold' : 'text-[#B2DFD8] hover:bg-[#1E6B63]/40 hover:text-white'
                  }`}
                >
                  <Calendar className="w-4 h-4 text-teal-300" />
                  <span>OPD Appointments</span>
                </button>

                <button
                  onClick={() => { onChronicCareClick?.(); setShowMoreMenu(false); }}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center gap-2.5 transition-all cursor-pointer ${
                    currentView === 'chronic_care' ? 'bg-[#1E6B63] text-white font-bold' : 'text-[#B2DFD8] hover:bg-[#1E6B63]/40 hover:text-white'
                  }`}
                >
                  <Activity className="w-4 h-4 text-teal-300" />
                  <span>{labels.chronic}</span>
                </button>

                <button
                  onClick={() => { onSchemesClick?.(); setShowMoreMenu(false); }}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center gap-2.5 transition-all cursor-pointer ${
                    currentView === 'schemes' ? 'bg-[#1E6B63] text-white font-bold' : 'text-[#B2DFD8] hover:bg-[#1E6B63]/40 hover:text-white'
                  }`}
                >
                  <FileText className="w-4 h-4 text-emerald-300" />
                  <span>{labels.schemes}</span>
                </button>

                <button
                  onClick={() => { onStoriesClick?.(); setShowMoreMenu(false); }}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center gap-2.5 transition-all cursor-pointer ${
                    currentView === 'stories' ? 'bg-[#1E6B63] text-white font-bold' : 'text-[#B2DFD8] hover:bg-[#1E6B63]/40 hover:text-white'
                  }`}
                >
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>{labels.stories}</span>
                </button>

                <button
                  onClick={() => { onArticlesClick?.(); setShowMoreMenu(false); }}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center gap-2.5 transition-all cursor-pointer ${
                    currentView === 'articles' ? 'bg-[#1E6B63] text-white font-bold' : 'text-[#B2DFD8] hover:bg-[#1E6B63]/40 hover:text-white'
                  }`}
                >
                  <BookOpen className="w-4 h-4 text-cyan-300" />
                  <span>{labels.articles}</span>
                </button>

                <button
                  onClick={() => { onGardenClick?.(); setShowMoreMenu(false); }}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center gap-2.5 transition-all cursor-pointer ${
                    currentView === 'garden_advisor' ? 'bg-[#1E6B63] text-white font-bold' : 'text-[#B2DFD8] hover:bg-[#1E6B63]/40 hover:text-white'
                  }`}
                >
                  <Sprout className="w-4 h-4 text-lime-300" />
                  <span>{labels.garden}</span>
                </button>

                <button
                  onClick={() => { onOutbreakClick?.(); setShowMoreMenu(false); }}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center gap-2.5 transition-all cursor-pointer ${
                    currentView === 'outbreak' ? 'bg-[#1E6B63] text-white font-bold' : 'text-[#B2DFD8] hover:bg-[#1E6B63]/40 hover:text-white'
                  }`}
                >
                  <AlertTriangle className="w-4 h-4 text-orange-400" />
                  <span>{labels.outbreaks}</span>
                </button>

                <button
                  onClick={() => { onNearbyClick?.(); setShowMoreMenu(false); }}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center gap-2.5 transition-all cursor-pointer ${
                    currentView === 'nearby' ? 'bg-[#1E6B63] text-white font-bold' : 'text-[#B2DFD8] hover:bg-[#1E6B63]/40 hover:text-white'
                  }`}
                >
                  <MapPin className="w-4 h-4 text-rose-300" />
                  <span>{labels.nearby}</span>
                </button>
              </div>
            )}
          </div>
        </nav>

        {/* Right Controls: Switch Portal, Language Switcher & Mobile Menu Button */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0 ml-auto xl:ml-0">
          {onSwitchPortal && (
            <button
              onClick={onSwitchPortal}
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-800 to-teal-800 hover:from-emerald-700 hover:to-teal-700 active:scale-95 text-teal-100 hover:text-white border border-teal-500/50 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm shrink-0"
              title="Exit to Portal Selection Screen"
            >
              <Building2 className="w-3.5 h-3.5 text-teal-300" />
              <span>Switch Portal</span>
            </button>
          )}

          <div className="flex items-center gap-0.5 bg-[#092422] p-1 rounded-xl border border-[#1E6B63]/60 text-xs shadow-inner shrink-0">
            {LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                onClick={() => handleLanguageChange(lang.code)}
                className={`min-h-[26px] px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  currentLang === lang.code
                    ? 'bg-[#1E6B63] text-white shadow-xs'
                    : 'text-[#B2DFD8] hover:text-white hover:bg-[#1E6B63]/30'
                }`}
                aria-label={`Switch to ${lang.label}`}
              >
                {lang.code.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Mobile Menu Hamburger (Visible below XL) */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="xl:hidden p-2 rounded-xl bg-[#143B38] border border-[#1E6B63] text-white hover:bg-[#1E6B63] transition-colors cursor-pointer shrink-0"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Dropdown Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="xl:hidden bg-[#092422] border-t border-[#143B38] px-4 py-3 space-y-2 animate-in slide-in-from-top-2 duration-200">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              onClick={() => { onHomeClick?.(); setMobileMenuOpen(false); }}
              className={`p-2.5 rounded-xl flex items-center gap-2 font-semibold transition ${
                currentView === 'welcome' || currentView === 'caseTaking' || currentView === 'result'
                  ? 'bg-[#1E6B63] text-white'
                  : 'bg-[#143B38] text-[#B2DFD8]'
              }`}
            >
              <Stethoscope className="w-4 h-4 text-emerald-300" />
              <span>{labels.triage}</span>
            </button>

            <button
              onClick={() => { onAdherenceTrackerClick?.(); setMobileMenuOpen(false); }}
              className={`p-2.5 rounded-xl flex items-center gap-2 font-semibold transition ${
                currentView === 'adherence_tracker' ? 'bg-[#1E6B63] text-white' : 'bg-[#143B38] text-[#B2DFD8]'
              }`}
            >
              <Pill className="w-4 h-4 text-amber-300" />
              <span>{labels.adherence}</span>
            </button>

            <button
              onClick={() => { onRosterClick?.(); setMobileMenuOpen(false); }}
              className={`p-2.5 rounded-xl flex items-center gap-2 font-semibold transition ${
                currentView === 'roster' ? 'bg-[#1E6B63] text-white' : 'bg-[#143B38] text-[#B2DFD8]'
              }`}
            >
              <Users className="w-4 h-4 text-teal-300" />
              <span>{labels.roster}</span>
            </button>

            <button
              onClick={() => { onFollowUpsClick?.(); setMobileMenuOpen(false); }}
              className={`p-2.5 rounded-xl flex items-center gap-2 font-semibold transition ${
                currentView === 'followups' ? 'bg-[#1E6B63] text-white' : 'bg-[#143B38] text-[#B2DFD8]'
              }`}
            >
              <Clock className="w-4 h-4 text-orange-300" />
              <span>{labels.followups}</span>
            </button>

            <button
              onClick={() => { onMchClick?.(); setMobileMenuOpen(false); }}
              className={`p-2.5 rounded-xl flex items-center gap-2 font-semibold transition ${
                currentView === 'mch' ? 'bg-[#1E6B63] text-white' : 'bg-[#143B38] text-[#B2DFD8]'
              }`}
            >
              <Baby className="w-4 h-4 text-rose-300" />
              <span>{labels.mch}</span>
            </button>

            <button
              onClick={() => { onChronicCareClick?.(); setMobileMenuOpen(false); }}
              className={`p-2.5 rounded-xl flex items-center gap-2 font-semibold transition ${
                currentView === 'chronic_care' ? 'bg-[#1E6B63] text-white' : 'bg-[#143B38] text-[#B2DFD8]'
              }`}
            >
              <Activity className="w-4 h-4 text-teal-300" />
              <span>{labels.chronic}</span>
            </button>

            <button
              onClick={() => { onSchemesClick?.(); setMobileMenuOpen(false); }}
              className={`p-2.5 rounded-xl flex items-center gap-2 font-semibold transition ${
                currentView === 'schemes' ? 'bg-[#1E6B63] text-white' : 'bg-[#143B38] text-[#B2DFD8]'
              }`}
            >
              <FileText className="w-4 h-4 text-emerald-300" />
              <span>{labels.schemes}</span>
            </button>

            <button
              onClick={() => { onGardenClick?.(); setMobileMenuOpen(false); }}
              className={`p-2.5 rounded-xl flex items-center gap-2 font-semibold transition ${
                currentView === 'garden_advisor' ? 'bg-[#1E6B63] text-white' : 'bg-[#143B38] text-[#B2DFD8]'
              }`}
            >
              <Sprout className="w-4 h-4 text-lime-300" />
              <span>{labels.garden}</span>
            </button>
          </div>

          {onSwitchPortal && (
            <div className="pt-2 border-t border-[#143B38]">
              <button
                onClick={() => { onSwitchPortal(); setMobileMenuOpen(false); }}
                className="w-full py-2.5 px-3 bg-gradient-to-r from-emerald-800 to-teal-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow"
              >
                <Building2 className="w-4 h-4 text-teal-300" />
                <span>Switch to Clinic Portal / Main Menu</span>
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
};
