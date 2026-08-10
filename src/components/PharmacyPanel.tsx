import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Pill,
  Leaf,
  Sparkles,
  FlaskConical,
  Search,
  X,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Clock,
  Ban,
  Info,
  ShieldCheck,
  CheckCircle2,
  Baby,
  User,
  ShieldAlert,
  ArrowRightLeft,
  Check,
  Edit3
} from 'lucide-react';
import {
  CaseData,
  LanguageCode,
  MedicineItemV2,
  DiseaseMedicinesV2,
  Patient,
  SafetyConflict
} from '../types';
import { getMedicines } from '../engine/medicineEngine';
import { checkSafety, findSafeAlternatives } from '../engine/safetyEngine';
import { db } from '../db/db';
import { MedicalProfileEditor } from './MedicalProfileEditor';
import { HomeRemedyCard } from './garden/HomeRemedyCard';


interface PharmacyPanelProps {
  diseaseId: string;
  diseaseName: string;
  caseData: CaseData;
  onClose?: () => void;
  patient?: Patient | null;
}

export const PharmacyPanel: React.FC<PharmacyPanelProps> = ({
  diseaseId,
  diseaseName,
  caseData,
  onClose,
  patient: initialPatient
}) => {
  const { t, i18n } = useTranslation();
  const currentLang = (i18n.language || 'en') as LanguageCode;

  const [patient, setPatient] = useState<Patient | null>(initialPatient || null);
  const [activeTab, setActiveTab] = useState<'allopathy' | 'ayurveda' | 'homeopathy'>('allopathy');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});

  // Safety & Alternatives State
  const [showProfileEditor, setShowProfileEditor] = useState<boolean>(false);
  const [selectedConflictMed, setSelectedConflictMed] = useState<MedicineItemV2 | null>(null);
  const [safeAlternativesList, setSafeAlternativesList] = useState<MedicineItemV2[]>([]);
  
  // Switch confirmation state
  const [switchTarget, setSwitchTarget] = useState<{
    original: MedicineItemV2;
    alternative: MedicineItemV2;
  } | null>(null);
  const [switchedSuccessMsg, setSwitchedSuccessMsg] = useState<string | null>(null);

  // Replaced / Switched Medicines map (conflictMedId -> safeAlternativeMed)
  const [switchedMedsMap, setSwitchedMedsMap] = useState<Record<string, MedicineItemV2>>({});

  // Load patient from Dexie DB if not provided
  useEffect(() => {
    if (!patient && caseData.patientId) {
      db.patients.get(caseData.patientId).then((p) => {
        if (p) setPatient(p);
      });
    }
  }, [caseData.patientId, patient]);

  // Fetch filtered medicines for patient age profile
  const diseaseMeds: DiseaseMedicinesV2 = getMedicines(diseaseId, caseData);

  const toggleExpand = (id: string) => {
    setExpandedCards((prev) => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // Base list for active tab
  const rawActiveList = diseaseMeds[activeTab] || [];

  // Replace any switched medicines in active list
  const activeList = rawActiveList.map((m) => {
    if (switchedMedsMap[m.id]) {
      return switchedMedsMap[m.id];
    }
    return m;
  });

  // Filter active list by search query
  const filteredList = activeList.filter((med) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const name = (med.name[currentLang] || med.name.en).toLowerCase();
    const benefit = (med.benefit[currentLang] || med.benefit.en).toLowerCase();
    return name.includes(q) || benefit.includes(q);
  });

  // Run Safety Engine checks on active list
  const activeConflicts: SafetyConflict[] = checkSafety(patient, activeList, currentLang);

  // Group conflicts by medId
  const conflictsByMedId: Record<string, SafetyConflict[]> = {};
  activeConflicts.forEach((conf) => {
    if (!conflictsByMedId[conf.medId]) {
      conflictsByMedId[conf.medId] = [];
    }
    conflictsByMedId[conf.medId].push(conf);
  });

  // Calculate counts for tab badges
  const counts = {
    allopathy: diseaseMeds.allopathy.length,
    ayurveda: diseaseMeds.ayurveda.length,
    homeopathy: diseaseMeds.homeopathy.length
  };

  const isFemale = caseData.gender?.toLowerCase() === 'female';

  // Open Safe Alternatives View
  const handleViewAlternatives = (med: MedicineItemV2) => {
    setSelectedConflictMed(med);
    const alts = findSafeAlternatives(med.id, activeTab, diseaseMeds, patient, currentLang);
    setSafeAlternativesList(alts);
  };

  // Handle Switch Request
  const handleInitiateSwitch = (original: MedicineItemV2, alternative: MedicineItemV2) => {
    setSwitchTarget({ original, alternative });
  };

  // Confirm Switch Action
  const handleConfirmSwitch = () => {
    if (!switchTarget) return;

    const { original, alternative } = switchTarget;

    setSwitchedMedsMap((prev) => ({
      ...prev,
      [original.id]: alternative
    }));

    const altName = alternative.name[currentLang] || alternative.name.en;
    const origName = original.name[currentLang] || original.name.en;

    const msg =
      currentLang === 'gu'
        ? `સફળતાપૂર્વક બદલાયું: ${origName} ના બદલે ${altName} પસંદ કરાઈ.`
        : currentLang === 'hi'
        ? `सफलतापूर्वक बदला गया: ${origName} के स्थान पर ${altName} चुनी गई।`
        : `Switched successfully: ${origName} replaced with safe alternative ${altName}.`;

    setSwitchedSuccessMsg(msg);
    setSwitchTarget(null);
    setSelectedConflictMed(null);

    setTimeout(() => {
      setSwitchedSuccessMsg(null);
    }, 4000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#1A2B2B]/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto font-sans">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-[#DDE3E2] overflow-hidden flex flex-col max-h-[92vh]">
        {/* HEADER BAR */}
        <div className="bg-[#1B4D4A] text-white p-4 sm:p-5 shrink-0 relative flex items-center justify-between border-b border-[#2E7D73]/30 font-sans">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#2E7D73] rounded-xl text-white shadow-xs">
              <FlaskConical className="w-6 h-6 text-[#B2DFD8]" />
            </div>
            <div>
              <div className="flex items-center gap-2 font-mono">
                <span className="text-[10px] font-bold uppercase tracking-wider bg-[#2E7D73]/50 px-2.5 py-0.5 rounded-md text-[#B2DFD8]">
                  CLINICAL FORMULARY & SAFETY CHECKER
                </span>
              </div>
              <h2 className="text-lg sm:text-2xl font-extrabold tracking-tight mt-0.5 text-white font-display">
                {diseaseName || 'Suggested Medicines'}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowProfileEditor(true)}
              className="px-3 py-2 bg-[#2E7D73] hover:bg-[#1B4D4A] text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer border border-[#B2DFD8]/30 shadow-xs"
              title="View/Edit Patient Medical & Allergy Profile"
            >
              <ShieldAlert className="w-4 h-4 text-[#B2DFD8]" />
              <span className="hidden sm:inline">Medical Safety Profile</span>
            </button>

            {onClose && (
              <button
                onClick={onClose}
                className="p-2 rounded-xl bg-[#2E7D73] hover:bg-[#1B4D4A] transition text-white border border-[#B2DFD8]/20 cursor-pointer shadow-xs"
                title="Close Pharmacy"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* TOP SAFETY ALERT BANNER (IF CONFLICTS DETECTED) */}
        {activeConflicts.length > 0 && (
          <div className="bg-[#B71C1C]/10 border-b-2 border-[#B71C1C] p-3 sm:px-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs shrink-0 font-sans">
            <div className="flex items-center gap-2 text-[#B71C1C] font-bold">
              <AlertTriangle className="w-5 h-5 text-[#B71C1C] shrink-0" />
              <span>
                Safety Alert: {activeConflicts.length} suggested medicine(s) conflict with patient
                allergies or current medications.
              </span>
            </div>

            <button
              onClick={() => setShowProfileEditor(true)}
              className="px-3 py-1.5 bg-[#B71C1C] text-white font-bold rounded-lg hover:bg-[#881313] transition cursor-pointer text-[11px] shrink-0 flex items-center gap-1"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Review Patient Profile</span>
            </button>
          </div>
        )}

        {/* SWITCH SUCCESS TOAST */}
        {switchedSuccessMsg && (
          <div className="bg-[#2E7D73] text-white px-4 py-2.5 text-xs font-bold flex items-center justify-between gap-2 shrink-0 font-sans">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#B2DFD8]" />
              <span>{switchedSuccessMsg}</span>
            </div>
            <button onClick={() => setSwitchedSuccessMsg(null)} className="text-[#B2DFD8]">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* DISCLAIMER & PATIENT PROFILE BAR */}
        <div className="bg-[#EDF1F0] border-b border-[#DDE3E2] p-3 sm:px-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs leading-relaxed shrink-0 font-sans">
          <div className="flex items-start gap-2 text-[#1B4D4A]">
            <Info className="w-4 h-4 text-[#2E7D73] shrink-0 mt-0.5" />
            <span className="font-medium text-[#1A2B2B]">
              <strong>DISCLAIMER:</strong> {t('result.medicineDisclaimer')}
            </span>
          </div>

          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-[#DDE3E2] shrink-0 text-[#1B4D4A] font-bold shadow-2xs">
            <User className="w-3.5 h-3.5 text-[#2E7D73]" />
            <span>
              {patient?.name || 'Walk-in Patient'} • Allergies: {patient?.allergies?.length || 0}
            </span>
          </div>
        </div>

        {/* SEARCH & SYSTEM TABS */}
        <div className="p-4 sm:p-5 bg-[#F4F7F6] border-b border-[#DDE3E2] shrink-0 space-y-4 font-sans">
          {/* Search Bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-[#5F6D6C] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search medicine name, formula or benefits..."
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#DDE3E2] rounded-xl text-xs sm:text-sm text-[#1A2B2B] placeholder-[#5F6D6C] focus:outline-none focus:border-[#2E7D73] shadow-2xs"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5F6D6C] hover:text-[#1B4D4A]"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* System Tabs */}
          <div className="grid grid-cols-3 gap-3">
            {/* Allopathy Tab */}
            <button
              onClick={() => setActiveTab('allopathy')}
              className={`flex items-center justify-center gap-2 p-2.5 rounded-xl font-bold text-xs sm:text-sm transition cursor-pointer ${
                activeTab === 'allopathy'
                  ? 'bg-[#2E7D73] text-white shadow-xs'
                  : 'bg-white text-[#1B4D4A] hover:bg-[#EDF1F0] border border-[#DDE3E2]'
              }`}
            >
              <Pill className="w-4 h-4" />
              <span>Allopathy</span>
              <span
                className={`px-2 py-0.5 text-[10px] rounded-lg font-bold ${
                  activeTab === 'allopathy' ? 'bg-[#1B4D4A] text-white' : 'bg-[#EDF1F0] text-[#1B4D4A]'
                }`}
              >
                {counts.allopathy}
              </span>
            </button>

            {/* Ayurveda Tab */}
            <button
              onClick={() => setActiveTab('ayurveda')}
              className={`flex items-center justify-center gap-2 p-2.5 rounded-xl font-bold text-xs sm:text-sm transition cursor-pointer ${
                activeTab === 'ayurveda'
                  ? 'bg-[#2E7D73] text-white shadow-xs'
                  : 'bg-white text-[#1B4D4A] hover:bg-[#EDF1F0] border border-[#DDE3E2]'
              }`}
            >
              <Leaf className="w-4 h-4" />
              <span>Ayurveda</span>
              <span
                className={`px-2 py-0.5 text-[10px] rounded-lg font-bold ${
                  activeTab === 'ayurveda' ? 'bg-[#1B4D4A] text-white' : 'bg-[#EDF1F0] text-[#1B4D4A]'
                }`}
              >
                {counts.ayurveda}
              </span>
            </button>

            {/* Homeopathy Tab */}
            <button
              onClick={() => setActiveTab('homeopathy')}
              className={`flex items-center justify-center gap-2 p-2.5 rounded-xl font-bold text-xs sm:text-sm transition cursor-pointer ${
                activeTab === 'homeopathy'
                  ? 'bg-[#2E7D73] text-white shadow-xs'
                  : 'bg-white text-[#1B4D4A] hover:bg-[#EDF1F0] border border-[#DDE3E2]'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>Homeopathy</span>
              <span
                className={`px-2 py-0.5 text-[10px] rounded-lg font-bold ${
                  activeTab === 'homeopathy' ? 'bg-[#1B4D4A] text-white' : 'bg-[#EDF1F0] text-[#1B4D4A]'
                }`}
              >
                {counts.homeopathy}
              </span>
            </button>
          </div>
        </div>

        {/* MEDICINE CARDS CONTAINER */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4 bg-[#EDF1F0]">
          {filteredList.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-sans">
              {filteredList.map((med: MedicineItemV2) => {
                const isExpanded = expandedCards[med.id] ?? true;
                const medName = med.name[currentLang] || med.name.en;
                const benefitText = med.benefit[currentLang] || med.benefit.en;
                const sideText = med.sideEffects[currentLang] || med.sideEffects.en;
                const howText = med.howToTake[currentLang] || med.howToTake.en;
                const contraText = med.contraindications[currentLang] || med.contraindications.en;

                const medConflicts = conflictsByMedId[med.id] || [];
                const hasConflicts = medConflicts.length > 0;
                const isSevere = medConflicts.some((c) => c.severity === 'severe');

                return (
                  <div
                    key={med.id}
                    className={`bg-white rounded-2xl p-4 sm:p-5 shadow-card transition flex flex-col justify-between border ${
                      hasConflicts
                        ? isSevere
                          ? 'border-[#B71C1C] ring-1 ring-[#B71C1C]/30'
                          : 'border-[#C46A3A] ring-1 ring-[#C46A3A]/30'
                        : 'border-[#DDE3E2] hover:border-[#2E7D73]'
                    }`}
                  >
                    <div>
                      {/* CONFLICT WARNING BANNER (Phase 10 Compliant Layout) */}
                      {hasConflicts && (
                        <div
                          className={`mb-3 p-3 rounded-xl border-l-4 font-sans text-xs space-y-2 ${
                            isSevere
                              ? 'bg-[#B71C1C]/10 border-[#B71C1C] text-[#881313]'
                              : 'bg-[#C46A3A]/10 border-[#C46A3A] text-[#7A3A18]'
                          }`}
                        >
                          {medConflicts.map((conf, idx) => (
                            <div key={idx} className="flex items-start gap-2">
                              <AlertTriangle
                                className={`w-4 h-4 shrink-0 mt-0.5 ${
                                  isSevere ? 'text-[#B71C1C]' : 'text-[#C46A3A]'
                                }`}
                              />
                              <div className="space-y-0.5">
                                <span className="font-bold uppercase text-[10px] tracking-wider block">
                                  {conf.type === 'allergy'
                                    ? 'ALLERGY CONTRAINDICATION'
                                    : 'DRUG INTERACTION WARNING'}
                                </span>
                                <p className="font-semibold leading-relaxed">
                                  {typeof conf.message === 'string'
                                    ? conf.message
                                    : conf.message[currentLang] || conf.message.en}
                                </p>
                              </div>
                            </div>
                          ))}

                          <div className="pt-1.5 flex justify-end">
                            <button
                              onClick={() => handleViewAlternatives(med)}
                              className="px-3 py-1.5 rounded-lg bg-[#1B4D4A] hover:bg-[#2E7D73] text-white font-bold text-[11px] transition cursor-pointer flex items-center gap-1 shadow-2xs"
                            >
                              <ShieldAlert className="w-3.5 h-3.5 text-[#B2DFD8]" />
                              <span>See Safe Alternatives</span>
                            </button>
                          </div>
                        </div>
                      )}

                      {/* CARD HEADER */}
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="font-extrabold text-[#1B4D4A] text-base sm:text-lg leading-snug font-display">
                            {medName}
                          </h3>
                        </div>

                        <button
                          onClick={() => toggleExpand(med.id)}
                          className="p-1.5 rounded-lg bg-[#EDF1F0] hover:bg-[#B2DFD8]/40 text-[#1B4D4A] shrink-0 transition border border-[#DDE3E2]"
                          title="Toggle details"
                        >
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </button>
                      </div>

                      {/* BADGES ROW */}
                      <div className="flex flex-wrap items-center gap-1.5 mt-2.5 font-sans text-[10px]">
                        {/* OTC Badge */}
                        {med.isOTC && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-[#2E7D73] text-white font-bold">
                            <Pill className="w-3 h-3 text-[#B2DFD8]" /> OTC Remedy
                          </span>
                        )}

                        {/* Age Restriction Badge */}
                        {med.ageRestriction ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#EDF1F0] text-[#1B4D4A] border border-[#DDE3E2] font-bold">
                            <Baby className="w-3 h-3 text-[#2E7D73]" />
                            <span className="capitalize">{med.ageRestriction} Only</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#EDF1F0] text-[#1B4D4A] border border-[#DDE3E2] font-semibold">
                            <ShieldCheck className="w-3 h-3 text-[#2E7D73]" /> All Ages
                          </span>
                        )}

                        {/* Pregnancy / Lactation Alert */}
                        {!med.pregnancySafe ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#C46A3A] text-white font-bold">
                            <AlertTriangle className="w-3 h-3 text-white" />
                            <span>Pregnancy Caution</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#EDF1F0] text-[#1B4D4A] border border-[#DDE3E2] font-semibold">
                            <CheckCircle2 className="w-3 h-3 text-[#2E7D73]" /> Pregnancy Safe
                          </span>
                        )}
                      </div>

                      {/* SHORT BENEFIT PREVIEW */}
                      <p className="text-xs sm:text-sm font-sans text-[#5F6D6C] mt-3 font-medium leading-relaxed">
                        {benefitText}
                      </p>
                    </div>

                    {/* EXPANDABLE DETAILS SECTION */}
                    {isExpanded && (
                      <div className="mt-4 pt-3 border-t border-[#DDE3E2] space-y-2.5 text-xs font-sans">
                        {/* How to Take */}
                        <div className="p-2.5 rounded-xl bg-[#F4F7F6] border border-[#DDE3E2] space-y-1">
                          <div className="flex items-center gap-1.5 font-bold text-[#1B4D4A]">
                            <Clock className="w-3.5 h-3.5 text-[#2E7D73] shrink-0" />
                            <span>How to Take / Dosage:</span>
                          </div>
                          <p className="text-[#1A2B2B] pl-5 leading-relaxed">{howText}</p>
                        </div>

                        {/* Side Effects */}
                        <div className="p-2.5 rounded-xl bg-[#F4F7F6] border border-[#DDE3E2] space-y-1">
                          <div className="flex items-center gap-1.5 font-bold text-[#1B4D4A]">
                            <AlertTriangle className="w-3.5 h-3.5 text-[#2E7D73] shrink-0" />
                            <span>Side Effects:</span>
                          </div>
                          <p className="text-[#1A2B2B] pl-5 leading-relaxed">{sideText}</p>
                        </div>

                        {/* Contraindications */}
                        {contraText &&
                          contraText !== 'None' &&
                          contraText !== 'કોઈ નહીં।' &&
                          contraText !== 'कोई नहीं।' && (
                            <div className="p-2.5 rounded-xl bg-[#EDF1F0] border border-[#DDE3E2] space-y-1">
                              <div className="flex items-center gap-1.5 font-bold text-[#1B4D4A]">
                                <Ban className="w-3.5 h-3.5 text-[#C46A3A] shrink-0" />
                                <span>Contraindications & Safety:</span>
                              </div>
                              <p className="text-[#1A2B2B] pl-5 leading-relaxed">{contraText}</p>
                            </div>
                          )}

                        {/* Special Pregnancy Note */}
                        {isFemale && !med.pregnancySafe && (
                          <div className="p-2.5 rounded-xl bg-[#C46A3A] text-white text-[11px] font-semibold flex items-center gap-1.5">
                            <Info className="w-3.5 h-3.5 text-white shrink-0" />
                            <span>If pregnant or breastfeeding, consult a doctor before use.</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Sustainable Garden Home Remedy Alternative */}
                    {(activeTab === 'ayurveda' || med.system === 'ayurveda') && (
                      <HomeRemedyCard medicineId={med.id} patientId={caseData.patientId} />
                    )}
                  </div>
                );

              })}
            </div>
          ) : (
            <div className="text-center py-12 px-4 bg-white rounded-2xl border border-[#DDE3E2] space-y-3 font-sans">
              <FlaskConical className="w-12 h-12 text-[#2E7D73]/40 mx-auto" />
              <h3 className="font-bold text-[#1B4D4A] text-base font-display">
                No medicines found
              </h3>
              <p className="text-xs text-[#5F6D6C] max-w-sm mx-auto">
                No medicine suggestions matched your query or patient age filter for this category.
              </p>
            </div>
          )}
        </div>

        {/* FOOTER ACTION */}
        <div className="p-4 bg-white border-t border-[#DDE3E2] shrink-0 flex items-center justify-between text-xs text-[#5F6D6C] font-sans">
          <span>Nirāmay Health System • Offline Database & Safety Engine</span>
          {onClose && (
            <button
              onClick={onClose}
              className="px-5 py-2.5 bg-[#1B4D4A] hover:bg-[#2E7D73] text-white font-bold rounded-xl transition cursor-pointer shadow-xs"
            >
              Return to Diagnosis
            </button>
          )}
        </div>
      </div>

      {/* MEDICAL PROFILE EDITOR OVERLAY MODAL */}
      {showProfileEditor && patient && (
        <div className="fixed inset-0 bg-[#1A2B2B]/70 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto font-sans">
          <div className="max-w-xl w-full my-auto">
            <MedicalProfileEditor
              patient={patient}
              onSave={(updatedPatient) => {
                setPatient(updatedPatient);
              }}
              onClose={() => setShowProfileEditor(false)}
            />
          </div>
        </div>
      )}

      {/* SAFE ALTERNATIVES DRAWER / MODAL */}
      {selectedConflictMed && (
        <div className="fixed inset-0 bg-[#1A2B2B]/70 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto font-sans">
          <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden border border-[#DDE3E2] shadow-2xl my-auto">
            <div className="bg-[#1B4D4A] text-white p-4.5 flex items-center justify-between border-b border-[#2E7D73]/30">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-5 h-5 text-[#B2DFD8]" />
                <h3 className="font-extrabold text-base sm:text-lg font-display">
                  Safe Alternative Medicines
                </h3>
              </div>
              <button
                onClick={() => setSelectedConflictMed(null)}
                className="text-[#B2DFD8] hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs font-sans">
              <div className="p-3 rounded-xl bg-[#B71C1C]/10 border-l-4 border-[#B71C1C] text-[#881313] space-y-1">
                <span className="font-bold text-[10px] uppercase tracking-wider block">
                  CONFLICTING MEDICINE:
                </span>
                <p className="font-bold text-sm">
                  {selectedConflictMed.name[currentLang] || selectedConflictMed.name.en}
                </p>
                <p className="text-[11px]">
                  This medicine produces safety conflicts with the patient&apos;s allergy or current medication profile. Choose a verified safe alternative below:
                </p>
              </div>

              {safeAlternativesList.length > 0 ? (
                <div className="space-y-3">
                  <span className="font-bold text-[#1B4D4A] uppercase text-[10px] tracking-wider block">
                    RECOMMENDED SAFE ALTERNATIVES (0 CONFLICTS):
                  </span>

                  {safeAlternativesList.map((alt) => {
                    const altName = alt.name[currentLang] || alt.name.en;
                    const altBenefit = alt.benefit[currentLang] || alt.benefit.en;

                    return (
                      <div
                        key={alt.id}
                        className="p-3.5 rounded-xl border border-[#DDE3E2] bg-[#F4F7F6] hover:border-[#2E7D73] transition space-y-2"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-bold text-[#1B4D4A] text-sm font-display">
                                {altName}
                              </h4>
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-[#2E7D73] text-white">
                                {alt.system}
                              </span>
                            </div>
                            <p className="text-[#5F6D6C] text-xs mt-1">{altBenefit}</p>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-[#DDE3E2] flex items-center justify-between">
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#2E7D73]">
                            <ShieldCheck className="w-3.5 h-3.5" /> 100% Safe Choice
                          </span>

                          <button
                            onClick={() => handleInitiateSwitch(selectedConflictMed, alt)}
                            className="px-3.5 py-1.5 bg-[#1B4D4A] hover:bg-[#2E7D73] text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                          >
                            <ArrowRightLeft className="w-3.5 h-3.5 text-[#B2DFD8]" />
                            <span>Switch to {altName.split(' ')[0]}</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-6 text-center text-[#5F6D6C] bg-[#F4F7F6] rounded-xl border border-[#DDE3E2] italic">
                  No direct same-category safe alternative found for this specific system. Consider non-pharmacological supportive therapy or referral.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM SWITCH MODAL */}
      {switchTarget && (
        <div className="fixed inset-0 bg-[#1A2B2B]/80 backdrop-blur-xs z-50 flex items-center justify-center p-4 font-sans">
          <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden border border-[#DDE3E2] shadow-2xl p-5 space-y-4 my-auto">
            <div className="flex items-center gap-3 text-[#1B4D4A]">
              <div className="p-2.5 bg-[#2E7D73] text-white rounded-xl">
                <ArrowRightLeft className="w-5 h-5 text-[#B2DFD8]" />
              </div>
              <h3 className="font-extrabold text-base text-[#1B4D4A] font-display">
                Confirm Medicine Replacement
              </h3>
            </div>

            <p className="text-xs text-[#5F6D6C] leading-relaxed">
              Are you sure you want to replace the conflicting medicine with the safe alternative choice?
            </p>

            <div className="p-3 bg-[#F4F7F6] rounded-xl border border-[#DDE3E2] space-y-2 text-xs">
              <div className="flex items-center justify-between text-[#B71C1C] font-semibold">
                <span>Remove:</span>
                <span className="line-through font-bold">
                  {switchTarget.original.name[currentLang] || switchTarget.original.name.en}
                </span>
              </div>
              <div className="flex items-center justify-between text-[#2E7D73] font-bold">
                <span>Add Safe Choice:</span>
                <span>
                  {switchTarget.alternative.name[currentLang] || switchTarget.alternative.name.en}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setSwitchTarget(null)}
                className="flex-1 py-2.5 bg-[#EDF1F0] text-[#1B4D4A] font-bold text-xs rounded-xl hover:bg-[#DDE3E2] transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmSwitch}
                className="flex-1 py-2.5 bg-[#1B4D4A] hover:bg-[#2E7D73] text-white font-bold text-xs rounded-xl transition cursor-pointer shadow-xs flex items-center justify-center gap-1.5"
              >
                <Check className="w-4 h-4 text-[#B2DFD8]" />
                <span>Confirm Switch</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
