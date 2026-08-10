import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  PhoneCall,
  User,
  Send,
  ClipboardList,
  AlertCircle
} from 'lucide-react';
import { Patient, LanguageCode, RiskLevel, CaseRecord } from '../types';
import { getDangerSigns, DangerSignStage, DangerSignItem } from '../engine/pregnancyEngine';
import { db } from '../db/db';

interface DangerSignChecklistProps {
  patient?: Patient | null;
  initialCategory?: 'antenatal' | 'postnatal';
  initialStage?: 'first_trimester' | 'second_trimester' | 'third_trimester' | 'mother' | 'newborn';
  onCaseSaved?: (newCase: CaseRecord) => void;
}

export const DangerSignChecklist: React.FC<DangerSignChecklistProps> = ({
  patient: initialPatient,
  initialCategory = 'antenatal',
  initialStage = 'first_trimester',
  onCaseSaved
}) => {
  const { i18n } = useTranslation();
  const currentLang = (i18n.language || 'en') as LanguageCode;

  const [category, setCategory] = useState<'antenatal' | 'postnatal'>(initialCategory);
  const [stage, setStage] = useState<
    'first_trimester' | 'second_trimester' | 'third_trimester' | 'mother' | 'newborn'
  >(initialStage);

  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(
    initialPatient?.id || null
  );

  // Selected checkboxes map
  const [selectedSignsMap, setSelectedSignsMap] = useState<Record<string, boolean>>({});
  const [notesInput, setNotesInput] = useState<string>('');

  // Assessment outcome state
  const [assessmentResult, setAssessmentResult] = useState<{
    risk: RiskLevel;
    emergencyCount: number;
    urgentCount: number;
    checkedSigns: DangerSignItem[];
    message: string;
  } | null>(null);

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    db.patients.toArray().then((all) => {
      setPatients(all);
      if (!selectedPatientId && all.length > 0) {
        setSelectedPatientId(all[0].id || null);
      }
    });
  }, []);

  // Update stage dropdown when category changes
  useEffect(() => {
    if (category === 'antenatal') {
      if (stage !== 'first_trimester' && stage !== 'second_trimester' && stage !== 'third_trimester') {
        setStage('first_trimester');
      }
    } else {
      if (stage !== 'mother' && stage !== 'newborn') {
        setStage('mother');
      }
    }
  }, [category]);

  // Load danger sign stage data
  const stageData: DangerSignStage | null = getDangerSigns(category, stage);

  const toggleSign = (signId: string) => {
    setSelectedSignsMap((prev) => ({
      ...prev,
      [signId]: !prev[signId]
    }));
  };

  const handleAssessAndSubmit = async () => {
    if (!stageData) return;

    // Filter checked items
    const checkedSigns = stageData.signs.filter((s) => selectedSignsMap[s.id]);

    let risk: RiskLevel = 'green';
    let emergencyCount = 0;
    let urgentCount = 0;

    checkedSigns.forEach((s) => {
      if (s.action === 'emergency') emergencyCount++;
      if (s.action === 'urgent') urgentCount++;
    });

    if (emergencyCount > 0) {
      risk = 'red';
    } else if (urgentCount > 0) {
      risk = 'orange';
    }

    let message = '';
    if (risk === 'red') {
      message =
        currentLang === 'gu'
          ? 'અત્યંત ગંભીર જોખમ! તાત્કાલિક હોસ્પિટલ ટ્રાન્સફર (108 એમ્બ્યુલન્સ બોલાવો) અથવા નિષ્ણાત ડૉક્ટરનો સંપર્ક કરો.'
          : currentLang === 'hi'
          ? 'अत्यंत गंभीर ख़तरा! तत्काल आपातकालीन अस्पताल रेफरल (108 एम्बुलेंस बुलाएं) का प्रबंध करें।'
          : 'EMERGENCY RISK DETECTED! Arrange immediate referral to higher center / Call 108 ambulance immediately.';
    } else if (risk === 'orange') {
      message =
        currentLang === 'gu'
          ? 'મધ્યમ જોખમ ચિહ્નો મળ્યા. 24 કલાકમાં નજીકના PHC / CHC પર તબીબી તપાસ કરાવો.'
          : currentLang === 'hi'
          ? 'मध्यम ख़तरे के संकेत। 24 घंटे के भीतर निकटतम PHC / CHC में डॉक्टर से परामर्श करें।'
          : 'URGENT RISK DETECTED. Medical evaluation required at PHC/CHC within 24 hours.';
    } else {
      message =
        currentLang === 'gu'
          ? 'કોઈ ગંભીર જોખમ ચિહ્ન નોંધાયું નથી. સામાન્ય સંભાળ અને નિયમિત મુલાકાત ચાલુ રાખો.'
          : currentLang === 'hi'
          ? 'कोई गंभीर ख़तरे का संकेत नहीं मिला। नियमित प्रसवपूर्व / प्रसवोत्तर जांच जारी रखें।'
          : 'No emergency or urgent danger signs recorded. Routine care & follow-up recommended.';
    }

    setAssessmentResult({
      risk,
      emergencyCount,
      urgentCount,
      checkedSigns,
      message
    });

    // Save case to IndexedDB if patient selected
    if (selectedPatientId) {
      setIsSubmitting(true);

      const checkedLabels = checkedSigns.map(
        (s) => s.label[currentLang] || s.label.en
      );

      const stageTitle = stageData.title[currentLang] || stageData.title.en;

      const newCase: CaseRecord = {
        patientId: selectedPatientId,
        date: new Date().toISOString(),
        diagnosisId: `mch_${category}_${stage}`,
        diagnosisName: `MCH ${stageTitle}`,
        risk,
        symptoms: checkedLabels.length > 0 ? checkedLabels : ['Routine MCH Screening - No Danger Signs'],
        medicinesGiven: [],
        caseType: category === 'antenatal' ? 'antenatal' : 'postnatal',
        mchNotes: notesInput || undefined
      };

      try {
        const id = await db.cases.add(newCase);
        const savedRecord = { ...newCase, id };
        if (onCaseSaved) onCaseSaved(savedRecord);
      } catch (e) {
        console.error('Error saving MCH case:', e);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <div className="space-y-5 font-sans">
      {/* CATEGORY & STAGE SELECTOR HEADER */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#DDE3E2] shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-[#1B4D4A] text-white rounded-xl">
              <ShieldAlert className="w-5 h-5 text-[#B2DFD8]" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-[#1B4D4A] font-display">
                {currentLang === 'gu'
                  ? 'ગર્ભાવસ્થા અને પ્રસવ પછીના જોખમ ચિહ્નોની તપાસ'
                  : currentLang === 'hi'
                  ? 'गर्भावस्था एवं प्रसवोत्तर ख़तरे के संकेतों की जाँच'
                  : 'Antenatal & Postnatal Danger Sign Checklist'}
              </h2>
              <p className="text-xs text-[#5F6D6C]">
                Standard WHO / Govt of India Obstetric & Newborn Danger Sign Assessment
              </p>
            </div>
          </div>

          {/* Patient Selection Dropdown */}
          <div className="w-full sm:w-auto flex items-center gap-2">
            <User className="w-4 h-4 text-[#2E7D73] shrink-0" />
            <select
              value={selectedPatientId || ''}
              onChange={(e) => setSelectedPatientId(Number(e.target.value))}
              className="w-full sm:w-60 px-3 py-2 bg-[#F4F7F6] border border-[#DDE3E2] rounded-xl text-xs font-bold text-[#1A2B2B] focus:outline-none focus:border-[#2E7D73]"
            >
              <option value="">-- Select Patient Record --</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.age}y, {p.village || 'Village'})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Category & Stage Tabs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          {/* Category Selector */}
          <div className="flex rounded-xl bg-[#F4F7F6] p-1 border border-[#DDE3E2]">
            <button
              onClick={() => setCategory('antenatal')}
              className={`flex-1 py-2 text-xs font-extrabold rounded-lg transition cursor-pointer ${
                category === 'antenatal'
                  ? 'bg-[#1B4D4A] text-white shadow-xs'
                  : 'text-[#5F6D6C] hover:text-[#1B4D4A]'
              }`}
            >
              Antenatal Care (Pregnancy)
            </button>
            <button
              onClick={() => setCategory('postnatal')}
              className={`flex-1 py-2 text-xs font-extrabold rounded-lg transition cursor-pointer ${
                category === 'postnatal'
                  ? 'bg-[#1B4D4A] text-white shadow-xs'
                  : 'text-[#5F6D6C] hover:text-[#1B4D4A]'
              }`}
            >
              Postnatal & Newborn
            </button>
          </div>

          {/* Stage Selector */}
          <select
            value={stage}
            onChange={(e) => setStage(e.target.value as any)}
            className="w-full px-3.5 py-2 bg-[#F4F7F6] border border-[#DDE3E2] rounded-xl text-xs font-bold text-[#1A2B2B] focus:outline-none focus:border-[#2E7D73]"
          >
            {category === 'antenatal' ? (
              <>
                <option value="first_trimester">First Trimester (0-13 weeks)</option>
                <option value="second_trimester">Second Trimester (14-26 weeks)</option>
                <option value="third_trimester">Third Trimester (27-40+ weeks)</option>
              </>
            ) : (
              <>
                <option value="mother">Postnatal Mother (0-6 weeks postpartum)</option>
                <option value="newborn">Newborn Child (0-28 days)</option>
              </>
            )}
          </select>
        </div>
      </div>

      {/* DANGER SIGN CHECKLIST CONTAINER */}
      {stageData && (
        <div className="bg-white rounded-2xl border border-[#DDE3E2] shadow-card overflow-hidden">
          <div className="bg-[#1B4D4A] text-white p-4 flex items-center justify-between border-b border-[#2E7D73]">
            <div className="flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-[#B2DFD8]" />
              <h3 className="font-extrabold text-sm sm:text-base font-display">
                {stageData.title[currentLang] || stageData.title.en}
              </h3>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider bg-[#2E7D73] px-2.5 py-0.5 rounded-md text-white">
              {stageData.signs.length} Checkpoints
            </span>
          </div>

          <div className="p-4 sm:p-5 space-y-3">
            <p className="text-xs text-[#5F6D6C] font-medium">
              Check all signs reported or observed during this visit. Emergency signs trigger immediate Red Referral status.
            </p>

            <div className="space-y-2.5 pt-2">
              {stageData.signs.map((sign: DangerSignItem) => {
                const isChecked = !!selectedSignsMap[sign.id];
                const label = sign.label[currentLang] || sign.label.en;
                const isEmergency = sign.action === 'emergency';
                const isUrgent = sign.action === 'urgent';

                return (
                  <label
                    key={sign.id}
                    onClick={() => toggleSign(sign.id)}
                    className={`flex items-start gap-3 p-3.5 rounded-xl border transition cursor-pointer font-sans text-xs sm:text-sm ${
                      isChecked
                        ? isEmergency
                          ? 'bg-[#B71C1C]/10 border-[#B71C1C] ring-1 ring-[#B71C1C]/30 text-[#881313]'
                          : isUrgent
                          ? 'bg-[#C46A3A]/10 border-[#C46A3A] ring-1 ring-[#C46A3A]/30 text-[#7A3A18]'
                          : 'bg-[#F4F7F6] border-[#2E7D73] text-[#1A2B2B]'
                        : 'bg-white border-[#DDE3E2] hover:border-[#2E7D73] text-[#1A2B2B]'
                    }`}
                  >
                    {/* Checkbox input */}
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {}} // handled by parent label click
                      className="mt-0.5 h-4 w-4 rounded-md text-[#1B4D4A] focus:ring-[#2E7D73] border-[#DDE3E2]"
                    />

                    <div className="flex-1 flex items-center justify-between gap-2">
                      <span className="font-bold leading-snug">{label}</span>

                      {/* Action Pill Badge */}
                      {isEmergency && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider bg-[#B71C1C] text-white shrink-0">
                          Critical Emergency
                        </span>
                      )}
                      {isUrgent && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider bg-[#C46A3A] text-white shrink-0">
                          Urgent Warning
                        </span>
                      )}
                    </div>
                  </label>
                );
              })}
            </div>

            {/* Optional Notes */}
            <div className="pt-3 space-y-1">
              <label className="block text-xs font-bold text-[#1A2B2B]">
                Clinical Observation / Visit Notes:
              </label>
              <textarea
                value={notesInput}
                onChange={(e) => setNotesInput(e.target.value)}
                placeholder="Enter BP, temperature, or specific field worker notes..."
                rows={2}
                className="w-full p-3 bg-[#F4F7F6] border border-[#DDE3E2] rounded-xl text-xs text-[#1A2B2B] focus:outline-none focus:border-[#2E7D73]"
              />
            </div>

            {/* Submit Action */}
            <div className="pt-2">
              <button
                onClick={handleAssessAndSubmit}
                disabled={isSubmitting}
                className="w-full py-3 bg-[#1B4D4A] hover:bg-[#2E7D73] text-white font-extrabold text-xs sm:text-sm rounded-xl transition cursor-pointer shadow-xs flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4 text-[#B2DFD8]" />
                <span>Submit & Assess Danger Signs</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ASSESSMENT OUTCOME CARD */}
      {assessmentResult && (
        <div
          className={`p-5 rounded-2xl border shadow-card space-y-4 font-sans ${
            assessmentResult.risk === 'RED'
              ? 'bg-[#B71C1C]/10 border-[#B71C1C] text-[#881313]'
              : assessmentResult.risk === 'ORANGE'
              ? 'bg-[#C46A3A]/10 border-[#C46A3A] text-[#7A3A18]'
              : 'bg-[#2E7D73]/10 border-[#2E7D73] text-[#1B4D4A]'
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              {assessmentResult.risk === 'RED' ? (
                <div className="p-2.5 bg-[#B71C1C] text-white rounded-xl">
                  <AlertTriangle className="w-6 h-6" />
                </div>
              ) : assessmentResult.risk === 'ORANGE' ? (
                <div className="p-2.5 bg-[#C46A3A] text-white rounded-xl">
                  <AlertCircle className="w-6 h-6" />
                </div>
              ) : (
                <div className="p-2.5 bg-[#2E7D73] text-white rounded-xl">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
              )}

              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest block font-mono">
                  TRIAGE ASSESSMENT RESULT
                </span>
                <h3 className="text-base sm:text-lg font-black font-display">
                  {assessmentResult.risk === 'RED'
                    ? 'RED ALERT: EMERGENCY REFERRAL REQUIRED'
                    : assessmentResult.risk === 'ORANGE'
                    ? 'ORANGE ALERT: URGENT MEDICAL EVALUATION'
                    : 'GREEN: ROUTINE CARE & FOLLOW-UP'}
                </h3>
              </div>
            </div>
          </div>

          <p className="text-xs sm:text-sm font-bold leading-relaxed">
            {assessmentResult.message}
          </p>

          {/* Emergency Helpline Prompt */}
          {assessmentResult.risk === 'RED' && (
            <div className="p-3.5 bg-[#B71C1C] text-white rounded-xl flex items-center justify-between gap-3 text-xs font-bold shadow-xs">
              <div className="flex items-center gap-2">
                <PhoneCall className="w-4 h-4 text-white animate-pulse" />
                <span>Call 108 Emergency Ambulance Immediately</span>
              </div>
              <a
                href="tel:108"
                className="px-3 py-1.5 bg-white text-[#B71C1C] font-extrabold text-xs rounded-lg hover:bg-gray-100 transition"
              >
                Dial 108
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
