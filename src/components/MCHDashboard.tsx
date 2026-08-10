import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Baby,
  Calculator,
  ShieldAlert,
  Syringe,
  ArrowLeft,
  HeartHandshake
} from 'lucide-react';
import { Patient, LanguageCode } from '../types';
import { PregnancyCalculator } from './PregnancyCalculator';
import { DangerSignChecklist } from './DangerSignChecklist';
import { ImmunizationTracker } from './ImmunizationTracker';

interface MCHDashboardProps {
  onClose?: () => void;
  patient?: Patient | null;
  initialTab?: 'calculator' | 'danger_signs' | 'immunization';
}

export const MCHDashboard: React.FC<MCHDashboardProps> = ({
  onClose,
  patient: initialPatient,
  initialTab = 'calculator'
}) => {
  const { i18n } = useTranslation();
  const currentLang = (i18n.language || 'en') as LanguageCode;

  const [activeTab, setActiveTab] = useState<'calculator' | 'danger_signs' | 'immunization'>(
    initialTab
  );

  const [patient, setPatient] = useState<Patient | null>(initialPatient || null);

  // Danger signs initial stage navigation state
  const [dangerSignStage, setDangerSignStage] = useState<
    'first_trimester' | 'second_trimester' | 'third_trimester' | 'mother' | 'newborn'
  >('first_trimester');

  const handleNavigateDangerSigns = (
    stage: 'first_trimester' | 'second_trimester' | 'third_trimester'
  ) => {
    setDangerSignStage(stage);
    setActiveTab('danger_signs');
  };

  return (
    <div className="bg-[#EDF1F0] min-h-screen p-3 sm:p-6 font-sans space-y-5">
      {/* MODULE HEADER BAR */}
      <div className="bg-[#1B4D4A] text-white p-4 sm:p-6 rounded-2xl shadow-card border border-[#2E7D73] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-[#2E7D73] hover:bg-[#1B4D4A] text-white transition border border-[#B2DFD8]/20 cursor-pointer shadow-xs"
              title="Return to Main Dashboard"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}

          <div className="p-3 bg-[#2E7D73] text-white rounded-xl shadow-xs">
            <HeartHandshake className="w-7 h-7 text-[#B2DFD8]" />
          </div>

          <div>
            <div className="flex items-center gap-2 font-mono">
              <span className="text-[10px] font-bold uppercase tracking-wider bg-[#2E7D73] px-2.5 py-0.5 rounded-md text-[#B2DFD8]">
                WHO / GOVT OF INDIA PROTOCOLS
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white mt-0.5 font-display tracking-tight">
              {currentLang === 'gu'
                ? 'માતા અને બાળ સ્વાસ્થ્ય મોડ્યુલ (MCH)'
                : currentLang === 'hi'
                ? 'मातृ एवं शिशु स्वास्थ्य मॉड्यूल (MCH)'
                : 'Maternal & Child Health Module (MCH)'}
            </h1>
          </div>
        </div>

        {/* TOP NAVIGATION TABS */}
        <div className="grid grid-cols-3 gap-2 w-full sm:w-auto bg-[#2E7D73]/50 p-1.5 rounded-2xl border border-[#B2DFD8]/20">
          <button
            onClick={() => setActiveTab('calculator')}
            className={`px-3 py-2 rounded-xl font-extrabold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'calculator'
                ? 'bg-white text-[#1B4D4A] shadow-xs'
                : 'text-white hover:bg-[#2E7D73]'
            }`}
          >
            <Calculator className="w-4 h-4 text-[#1B4D4A]" />
            <span className="hidden sm:inline">Pregnancy Calc</span>
          </button>

          <button
            onClick={() => setActiveTab('danger_signs')}
            className={`px-3 py-2 rounded-xl font-extrabold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'danger_signs'
                ? 'bg-white text-[#1B4D4A] shadow-xs'
                : 'text-white hover:bg-[#2E7D73]'
            }`}
          >
            <ShieldAlert className="w-4 h-4 text-[#1B4D4A]" />
            <span className="hidden sm:inline">Danger Signs</span>
          </button>

          <button
            onClick={() => setActiveTab('immunization')}
            className={`px-3 py-2 rounded-xl font-extrabold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'immunization'
                ? 'bg-white text-[#1B4D4A] shadow-xs'
                : 'text-white hover:bg-[#2E7D73]'
            }`}
          >
            <Syringe className="w-4 h-4 text-[#1B4D4A]" />
            <span className="hidden sm:inline">Immunization</span>
          </button>
        </div>
      </div>

      {/* ACTIVE SECTION CONTENT */}
      {activeTab === 'calculator' && (
        <PregnancyCalculator
          patient={patient}
          onNavigateDangerSigns={handleNavigateDangerSigns}
          onPatientUpdated={(p) => setPatient(p)}
        />
      )}

      {activeTab === 'danger_signs' && (
        <DangerSignChecklist
          patient={patient}
          initialStage={dangerSignStage}
        />
      )}

      {activeTab === 'immunization' && (
        <ImmunizationTracker
          initialPatientId={patient?.id}
          onPatientUpdated={(p) => setPatient(p)}
        />
      )}
    </div>
  );
};
