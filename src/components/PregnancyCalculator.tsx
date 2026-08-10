import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Calendar,
  Sparkles,
  Save,
  ShieldAlert,
  Baby,
  Clock,
  CheckCircle2,
  User,
  HeartHandshake
} from 'lucide-react';
import { Patient, LanguageCode } from '../types';
import { calculatePregnancy, PregnancyCalculationResult } from '../engine/pregnancyEngine';
import { db, updatePatientMchData } from '../db/db';

interface PregnancyCalculatorProps {
  patient?: Patient | null;
  onNavigateDangerSigns?: (stage: 'first_trimester' | 'second_trimester' | 'third_trimester') => void;
  onPatientUpdated?: (patient: Patient) => void;
}

export const PregnancyCalculator: React.FC<PregnancyCalculatorProps> = ({
  patient: initialPatient,
  onNavigateDangerSigns,
  onPatientUpdated
}) => {
  const { i18n } = useTranslation();
  const currentLang = (i18n.language || 'en') as LanguageCode;

  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(
    initialPatient?.id || null
  );
  const [patient, setPatient] = useState<Patient | null>(initialPatient || null);

  // LMP Date State
  const [lmpInput, setLmpInput] = useState<string>(
    initialPatient?.lmpDate || new Date().toISOString().split('T')[0]
  );
  const [calcResult, setCalcResult] = useState<PregnancyCalculationResult | null>(null);
  const [isSaved, setIsSaved] = useState<boolean>(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Fetch female/applicable patients for dropdown
  useEffect(() => {
    db.patients.toArray().then((all) => {
      // Filter female patients or patients without child birth date
      const females = all.filter((p) => p.gender?.toLowerCase() === 'female' || p.gender === 'Unspecified');
      setPatients(females);
      if (!selectedPatientId && females.length > 0) {
        setSelectedPatientId(females[0].id || null);
        setPatient(females[0]);
        if (females[0].lmpDate) {
          setLmpInput(females[0].lmpDate);
        }
      }
    });
  }, []);

  // When selected patient changes
  useEffect(() => {
    if (selectedPatientId) {
      db.patients.get(selectedPatientId).then((p) => {
        if (p) {
          setPatient(p);
          if (p.lmpDate) {
            setLmpInput(p.lmpDate);
          }
        }
      });
    }
  }, [selectedPatientId]);

  // Run calculation whenever lmpInput changes
  useEffect(() => {
    if (lmpInput) {
      try {
        const result = calculatePregnancy(lmpInput);
        setCalcResult(result);
        setIsSaved(false);
      } catch {
        setCalcResult(null);
      }
    }
  }, [lmpInput]);

  const handleSaveToPatient = async () => {
    if (!patient || !patient.id || !calcResult) return;

    const updatedData = {
      isPregnant: true,
      lmpDate: lmpInput,
      edd: calcResult.eddFormatted
    };

    await updatePatientMchData(patient.id, updatedData);
    const updatedPatient = { ...patient, ...updatedData };
    setPatient(updatedPatient);
    if (onPatientUpdated) onPatientUpdated(updatedPatient);

    setIsSaved(true);
    const msg =
      currentLang === 'gu'
        ? `ગર્ભાવસ્થા રેકોર્ડ દર્દી ${patient.name} ના ખાતામાં સફળતાપૂર્વક સાચવવામાં આવ્યો.`
        : currentLang === 'hi'
        ? `गर्भावस्था का विवरण मरीज ${patient.name} के रिकॉर्ड में सहेजा गया।`
        : `Pregnancy record saved successfully to ${patient.name}'s profile.`;
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 4000);
  };

  const getTrimesterBadge = (trimester: 'first' | 'second' | 'third') => {
    if (trimester === 'first') {
      return {
        label:
          currentLang === 'gu'
            ? 'પ્રથમ ત્રિમાસિક (1-13 અઠવાડિયા)'
            : currentLang === 'hi'
            ? 'पहली तिमाही (1-13 सप्ताह)'
            : 'First Trimester (1-13 wks)',
        bg: 'bg-[#B2DFD8] text-[#1B4D4A] border-[#2E7D73]/30',
        stageKey: 'first_trimester' as const
      };
    } else if (trimester === 'second') {
      return {
        label:
          currentLang === 'gu'
            ? 'બીજી ત્રિમાસિક (14-26 અઠવાડિયા)'
            : currentLang === 'hi'
            ? 'दूसरी तिमाही (14-26 सप्ताह)'
            : 'Second Trimester (14-26 wks)',
        bg: 'bg-[#FFF3C4] text-[#7A5200] border-[#D1A000]/30',
        stageKey: 'second_trimester' as const
      };
    } else {
      return {
        label:
          currentLang === 'gu'
            ? 'ત્રીજી ત્રિમાસિક (27-40+ અઠવાડિયા)'
            : currentLang === 'hi'
            ? 'तीसरी तिमाही (27-40+ सप्ताह)'
            : 'Third Trimester (27-40+ wks)',
        bg: 'bg-[#2E7D73] text-white border-[#1B4D4A]',
        stageKey: 'third_trimester' as const
      };
    }
  };

  return (
    <div className="space-y-5 font-sans">
      {/* HEADER CARD */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#DDE3E2] shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-[#1B4D4A] text-white rounded-xl shadow-xs">
            <Baby className="w-6 h-6 text-[#B2DFD8]" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-extrabold text-[#1B4D4A] font-display">
              {currentLang === 'gu'
                ? 'ગર્ભાવસ્થા કેલ્ક્યુલેટર અને EDD ટ્રેકર'
                : currentLang === 'hi'
                ? 'गर्भावस्था कैलकुलेटर एवं EDD ट्रैकर'
                : 'Pregnancy Calculator & EDD Tracker'}
            </h2>
            <p className="text-xs text-[#5F6D6C] mt-0.5">
              Naegele&apos;s Rule Standard Gestational Calculator & Trimester Staging
            </p>
          </div>
        </div>

        {/* Patient Selector */}
        <div className="w-full sm:w-auto flex items-center gap-2">
          <User className="w-4 h-4 text-[#2E7D73] shrink-0" />
          <select
            value={selectedPatientId || ''}
            onChange={(e) => setSelectedPatientId(Number(e.target.value))}
            className="w-full sm:w-60 px-3 py-2 bg-[#F4F7F6] border border-[#DDE3E2] rounded-xl text-xs font-bold text-[#1A2B2B] focus:outline-none focus:border-[#2E7D73]"
          >
            <option value="">-- Select Pregnant Patient --</option>
            {patients.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.age}y, {p.village || 'Village'}) {p.isPregnant ? '• Pregnant' : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {toastMsg && (
        <div className="p-3 bg-[#2E7D73] text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-[#B2DFD8] shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* INPUT FORM & RESULT DISPLAY */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
        {/* LMP INPUT CARD */}
        <div className="md:col-span-5 bg-white p-5 rounded-2xl border border-[#DDE3E2] shadow-card space-y-4">
          <div className="flex items-center gap-2 text-[#1B4D4A]">
            <Calendar className="w-4 h-4 text-[#2E7D73]" />
            <h3 className="font-extrabold text-sm font-display uppercase tracking-wider">
              {currentLang === 'gu'
                ? 'છેલ્લા માસિકની તારીખ (LMP)'
                : currentLang === 'hi'
                ? 'अंतिम मासिक धर्म की तिथि (LMP)'
                : 'Last Menstrual Period (LMP)'}
            </h3>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-[#1A2B2B]">
              Select LMP Date:
            </label>
            <input
              type="date"
              value={lmpInput}
              max={new Date().toISOString().split('T')[0]}
              onChange={(e) => setLmpInput(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[#F4F7F6] border border-[#DDE3E2] rounded-xl text-sm font-bold text-[#1A2B2B] focus:outline-none focus:border-[#2E7D73]"
            />
          </div>

          <p className="text-[11px] text-[#5F6D6C] leading-relaxed">
            Naegele&apos;s formula calculates Estimated Due Date (EDD) by adding 280 days (40 weeks) to the first day of the last menstrual period.
          </p>

          {patient && (
            <div className="pt-2">
              <button
                onClick={handleSaveToPatient}
                disabled={!calcResult || isSaved}
                className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs transition flex items-center justify-center gap-2 cursor-pointer shadow-xs ${
                  isSaved
                    ? 'bg-[#E1EAE8] text-[#5F6D6C] cursor-not-allowed'
                    : 'bg-[#1B4D4A] hover:bg-[#2E7D73] text-white'
                }`}
              >
                {isSaved ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-[#2E7D73]" />
                    <span>Saved to Patient Record</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 text-[#B2DFD8]" />
                    <span>Save LMP & EDD to {patient.name.split(' ')[0]}</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* RESULTS CARD */}
        {calcResult ? (
          <div className="md:col-span-7 bg-gradient-to-br from-[#1B4D4A] to-[#2E7D73] text-white p-5 sm:p-6 rounded-2xl border border-[#2E7D73] shadow-card flex flex-col justify-between space-y-5 relative overflow-hidden">
            {/* Background Decorative Pattern */}
            <div className="absolute -right-10 -bottom-10 opacity-10 pointer-events-none">
              <Baby className="w-48 h-48 text-white" />
            </div>

            <div className="space-y-4 relative z-10">
              <div className="flex items-center justify-between gap-2 border-b border-[#B2DFD8]/20 pb-3">
                <span className="text-[10px] uppercase font-mono font-bold tracking-widest text-[#B2DFD8]">
                  ESTIMATED OBSTETRIC TIMELINE
                </span>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold border shadow-2xs ${
                    getTrimesterBadge(calcResult.trimester).bg
                  }`}
                >
                  {getTrimesterBadge(calcResult.trimester).label}
                </span>
              </div>

              {/* EDD & GESTATIONAL AGE GRID */}
              <div className="grid grid-cols-2 gap-4 pt-1">
                <div className="bg-white/10 backdrop-blur-xs p-3.5 rounded-xl border border-white/10">
                  <span className="text-[11px] text-[#B2DFD8] font-bold block mb-1">
                    {currentLang === 'gu'
                      ? 'અંદાજિત પ્રસૂતિ તારીખ (EDD)'
                      : currentLang === 'hi'
                      ? 'अनुमानित प्रसव तिथि (EDD)'
                      : 'Estimated Due Date (EDD)'}
                  </span>
                  <div className="text-xl sm:text-2xl font-black tracking-tight text-white font-display">
                    {calcResult.eddFormatted}
                  </div>
                  <span className="text-[10px] text-white/80 mt-1 block">
                    {calcResult.daysRemaining > 0
                      ? `${calcResult.daysRemaining} days remaining`
                      : calcResult.isPostTerm
                      ? 'Post-term (> 40 weeks)'
                      : 'Due Today'}
                  </span>
                </div>

                <div className="bg-white/10 backdrop-blur-xs p-3.5 rounded-xl border border-white/10">
                  <span className="text-[11px] text-[#B2DFD8] font-bold block mb-1">
                    {currentLang === 'gu'
                      ? 'ગર્ભાવસ્થાનો સમયગાળો'
                      : currentLang === 'hi'
                      ? 'गर्भावस्था की अवधि'
                      : 'Gestational Age'}
                  </span>
                  <div className="text-xl sm:text-2xl font-black tracking-tight text-white font-display">
                    {calcResult.gestationalAgeWeeks}w {calcResult.gestationalAgeDays}d
                  </div>
                  <span className="text-[10px] text-white/80 mt-1 block">
                    {calcResult.gestationalAgeWeeks} completed weeks
                  </span>
                </div>
              </div>

              {/* TRIMESTER PROGRESS BAR (3 SEGMENTS) */}
              <div className="space-y-1.5 pt-2">
                <div className="flex justify-between text-[10px] font-bold text-[#B2DFD8] font-mono">
                  <span>Trimester 1 (0-13w)</span>
                  <span>Trimester 2 (14-26w)</span>
                  <span>Trimester 3 (27-40w+)</span>
                </div>

                {/* 3-Segment Bar */}
                <div className="grid grid-cols-3 gap-1.5 bg-black/20 p-1 rounded-xl border border-white/10">
                  {/* Segment 1 */}
                  <div
                    className={`h-2.5 rounded-lg transition-all ${
                      calcResult.trimester === 'first'
                        ? 'bg-[#B2DFD8] shadow-xs'
                        : calcResult.gestationalAgeWeeks > 13
                        ? 'bg-[#B2DFD8]/60'
                        : 'bg-white/10'
                    }`}
                  />
                  {/* Segment 2 */}
                  <div
                    className={`h-2.5 rounded-lg transition-all ${
                      calcResult.trimester === 'second'
                        ? 'bg-[#FFF3C4] shadow-xs'
                        : calcResult.gestationalAgeWeeks > 26
                        ? 'bg-[#FFF3C4]/60'
                        : 'bg-white/10'
                    }`}
                  />
                  {/* Segment 3 */}
                  <div
                    className={`h-2.5 rounded-lg transition-all ${
                      calcResult.trimester === 'third'
                        ? 'bg-[#B2DFD8] shadow-xs'
                        : 'bg-white/10'
                    }`}
                  />
                </div>
              </div>
            </div>

            {/* ACTION BUTTON TO CHECK DANGER SIGNS */}
            <div className="pt-3 border-t border-white/15 relative z-10 flex flex-col sm:flex-row items-center justify-between gap-3">
              <span className="text-xs text-[#B2DFD8] flex items-center gap-1.5 font-medium">
                <Clock className="w-3.5 h-3.5" />
                <span>
                  {calcResult.isPostTerm
                    ? 'Caution: Gestational age is post-term (>40 weeks)'
                    : 'Monitor for trimester danger signs regularly'}
                </span>
              </span>

              {onNavigateDangerSigns && (
                <button
                  onClick={() =>
                    onNavigateDangerSigns(
                      getTrimesterBadge(calcResult.trimester).stageKey
                    )
                  }
                  className="w-full sm:w-auto px-4 py-2 bg-white text-[#1B4D4A] hover:bg-[#F4F7F6] font-extrabold text-xs rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shadow-xs shrink-0"
                >
                  <ShieldAlert className="w-4 h-4 text-[#1B4D4A]" />
                  <span>Check Trimester Danger Signs</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="md:col-span-7 bg-[#F4F7F6] p-8 rounded-2xl border border-[#DDE3E2] flex flex-col items-center justify-center text-center space-y-2">
            <HeartHandshake className="w-10 h-10 text-[#2E7D73]/40" />
            <p className="text-xs text-[#5F6D6C]">
              Select a valid LMP date to compute gestational progress and trimester stage.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
