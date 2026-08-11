import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Hospital,
  Users,
  Stethoscope,
  ShieldAlert,
  ArrowRight,
  Activity,
  Heart,
  Pill,
  Sparkles,
  Baby,
  FileText,
  Lock,
  Building2
} from 'lucide-react';
import { LanguageCode } from '../types';
import { getTranslations } from '../utils/translations';
import { PulseLine } from './PulseLine';

interface PortalSelectionScreenProps {
  onSelectPortal: (portal: 'clinic' | 'user') => void;
}

export function PortalSelectionScreen({ onSelectPortal }: PortalSelectionScreenProps) {
  const { i18n } = useTranslation();
  const currentLang = (i18n.language || 'en') as LanguageCode;
  const t = getTranslations(currentLang);

  const handleLanguageChange = (code: LanguageCode) => {
    i18n.changeLanguage(code);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#092422] via-[#0F3835] to-[#164E48] text-white flex flex-col justify-between font-sans p-4 sm:p-6 md:p-10 relative overflow-hidden">
      {/* Ambient background glows */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header Strip */}
      <div className="max-w-6xl w-full mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 pb-6 border-b border-teal-700/40 relative z-10">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-2xl p-2 border border-teal-300/30 flex items-center justify-center shadow-lg">
            <img src="/logo.png" alt="Nirāmay Logo" className="w-full h-full object-contain filter drop-shadow" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight font-display text-white">Nirāmay Health Suite</h1>
              <span className="bg-emerald-400/20 text-emerald-300 text-[10px] uppercase font-bold tracking-widest px-2.5 py-0.5 rounded-full border border-emerald-400/30">
                v2026.4
              </span>
            </div>
            <p className="text-teal-200/80 text-xs mt-0.5">
              Dual-Channel Healthcare Architecture • AI Decision Support & Community EMR
            </p>
          </div>
        </div>

        {/* Language Selector */}
        <div className="flex items-center gap-1.5 bg-[#092422]/90 p-1 rounded-2xl border border-teal-600/40">
          {[
            { code: 'gu', label: 'ગુજરાતી' },
            { code: 'hi', label: 'हिन्दी' },
            { code: 'en', label: 'English' }
          ].map((lang) => (
            <button
              key={lang.code}
              onClick={() => handleLanguageChange(lang.code as LanguageCode)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                currentLang === lang.code
                  ? 'bg-teal-700 text-white shadow-sm border border-teal-400/50'
                  : 'text-teal-200 hover:text-white hover:bg-white/10'
              }`}
            >
              {lang.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Selection Area */}
      <div className="max-w-5xl w-full mx-auto my-auto py-10 relative z-10 space-y-8">
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-teal-800/60 border border-teal-500/40 px-3.5 py-1.5 rounded-full text-xs font-bold text-teal-200 shadow-inner">
            <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
            <span>Select Your Operating Portal</span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight font-display">
            Welcome to Nirāmay
          </h2>

          <div className="flex justify-center my-1">
            <PulseLine width={100} color="#38A394" animated={true} />
          </div>

          <p className="text-teal-100/90 text-sm sm:text-base leading-relaxed">
            Please choose the appropriate portal to continue. Clinical triage and community family modules operate independently with separate security contexts.
          </p>
        </div>

        {/* Two Independent Portal Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 pt-4">
          {/* Card 1: Clinic Triage Portal */}
          <div
            onClick={() => onSelectPortal('clinic')}
            className="group relative bg-gradient-to-br from-teal-900/90 via-teal-800/80 to-[#0A2A26] border-2 border-teal-500/50 hover:border-teal-300 rounded-3xl p-7 sm:p-8 transition-all duration-300 hover:shadow-[0_16px_40px_rgba(20,184,166,0.3)] hover:-translate-y-1.5 cursor-pointer flex flex-col justify-between"
          >
            <div className="absolute top-5 right-5 bg-teal-400/20 text-teal-200 text-xs px-3 py-1 rounded-full font-bold border border-teal-300/30 flex items-center gap-1.5">
              <Activity className="w-3 h-3 text-teal-300" />
              150k ML Model
            </div>

            <div className="space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-teal-500/20 border border-teal-300/40 flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner">
                <Hospital className="w-7 h-7 text-teal-200" />
              </div>

              <div>
                <h3 className="text-2xl font-black text-white tracking-tight group-hover:text-teal-200 transition-colors">
                  {t.clinicPortalCardTitle}
                </h3>
                <p className="text-xs uppercase tracking-wider font-bold text-teal-300 mt-1">
                  For Medical Officers, Triage Nurses & PHC Staff
                </p>
              </div>

              <p className="text-xs sm:text-sm text-teal-100/80 leading-relaxed">
                {t.clinicPortalCardDesc}
              </p>

              <div className="space-y-2 pt-2 border-t border-teal-700/40 text-xs text-teal-200 font-medium">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
                  <span>Facility Registration & Doctor Verification</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
                  <span>Mandatory Vitals (SpO2, BP, HR, Temp, Auto-BMI)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
                  <span>Chief Complaint Dynamic Inquiries & Printable Slips</span>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-4">
              <button
                type="button"
                className="w-full py-3.5 bg-gradient-to-r from-teal-600 to-teal-500 hover:from-teal-500 hover:to-teal-400 text-white font-extrabold rounded-2xl transition shadow-md flex items-center justify-center gap-2 text-sm sm:text-base group-hover:shadow-lg cursor-pointer"
              >
                <span>{t.enterClinicPortal}</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1.5 transition-transform" />
              </button>
            </div>
          </div>

          {/* Card 2: Community & Family Health Portal */}
          <div
            onClick={() => onSelectPortal('user')}
            className="group relative bg-gradient-to-br from-[#123E3A]/90 via-[#0F3531]/80 to-[#0A2421] border-2 border-[#1E6B63]/60 hover:border-emerald-400 rounded-3xl p-7 sm:p-8 transition-all duration-300 hover:shadow-[0_16px_40px_rgba(16,185,129,0.25)] hover:-translate-y-1.5 cursor-pointer flex flex-col justify-between"
          >
            <div className="absolute top-5 right-5 bg-emerald-400/20 text-emerald-300 text-xs px-3 py-1 rounded-full font-bold border border-emerald-400/30 flex items-center gap-1.5">
              <Users className="w-3 h-3 text-emerald-300" />
              Family Vault
            </div>

            <div className="space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner">
                <Users className="w-7 h-7 text-emerald-200" />
              </div>

              <div>
                <h3 className="text-2xl font-black text-white tracking-tight group-hover:text-emerald-300 transition-colors">
                  {t.communityPortalCardTitle}
                </h3>
                <p className="text-xs uppercase tracking-wider font-bold text-emerald-300 mt-1">
                  For Citizens, Families & Community Health Workers
                </p>
              </div>

              <p className="text-xs sm:text-sm text-teal-100/80 leading-relaxed">
                {t.communityPortalCardDesc}
              </p>

              <div className="space-y-2 pt-2 border-t border-teal-800/50 text-xs text-teal-200 font-medium">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>Family Directory & Personal Member EMR</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>DOT Medication Adherence & Streak Tracker</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>MCH Care, Ayushman Schemes & Plant Garden</span>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-4">
              <button
                type="button"
                className="w-full py-3.5 bg-gradient-to-r from-emerald-700 to-teal-600 hover:from-emerald-600 hover:to-teal-500 text-white font-extrabold rounded-2xl transition shadow-md flex items-center justify-center gap-2 text-sm sm:text-base group-hover:shadow-lg cursor-pointer"
              >
                <span>{t.enterCommunityPortal}</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1.5 transition-transform" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Strip */}
      <div className="max-w-6xl w-full mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 pt-6 border-t border-teal-800/40 text-xs text-teal-300/70 relative z-10">
        <div className="flex items-center gap-2">
          <Lock className="w-3.5 h-3.5 text-emerald-400" />
          <span>Local Encrypted Database • Independent Operating Contexts</span>
        </div>
        <p>© 2026 Nirāmay Virtual Hospital • AI-Powered Clinical Decision Support</p>
      </div>
    </div>
  );
}
