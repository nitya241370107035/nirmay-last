import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Check, ArrowLeft, BookOpen, AlertTriangle, ShieldCheck, User, Save, FileText } from 'lucide-react';
import {
  screenNutrition,
  getAllNutritionSignsGrouped,
  NutritionScreeningOutput,
  ConfirmedDeficiencyResult,
  SignGroup,
  NutritionSign,
} from '../engine/nutritionEngine';
import { Patient, LanguageCode, MultilingualText } from '../types';
import { savePatientNutritionScreening, db } from '../db/db';

interface NutritionScreeningModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient?: Patient | null;
  onSelectPatient?: (patient: Patient) => void;
  onApplyDietAdvice?: (dietItems: { eat: string[]; avoid: string[] }) => void;
  onOpenArticle?: (articleId: string) => void;
}

export const NutritionScreeningModal: React.FC<NutritionScreeningModalProps> = ({
  isOpen,
  onClose,
  patient: initialPatient,
  onSelectPatient,
  onApplyDietAdvice,
  onOpenArticle,
}) => {
  const { t, i18n } = useTranslation();
  const currentLang = (i18n.language || 'en') as LanguageCode;

  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(initialPatient || null);
  const [showPatientSelectModal, setShowPatientSelectModal] = useState<boolean>(false);
  const [patientList, setPatientList] = useState<Patient[]>([]);
  const [checkedSignIds, setCheckedSignIds] = useState<string[]>([]);

  useEffect(() => {
    if (showPatientSelectModal) {
      db.patients.toArray().then((pts) => setPatientList(pts));
    }
  }, [showPatientSelectModal]);
  const [step, setStep] = useState<'checklist' | 'results'>('checklist');
  const [screeningResult, setScreeningResult] = useState<NutritionScreeningOutput | null>(null);
  const [savedSuccessMsg, setSavedSuccessMsg] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  useEffect(() => {
    setSelectedPatient(initialPatient || null);
  }, [initialPatient]);

  useEffect(() => {
    if (isOpen) {
      setCheckedSignIds([]);
      setStep('checklist');
      setScreeningResult(null);
      setSavedSuccessMsg(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const signGroups = getAllNutritionSignsGrouped();

  const handleToggleSign = (signId: string) => {
    setCheckedSignIds((prev) =>
      prev.includes(signId) ? prev.filter((id) => id !== signId) : [...prev, signId]
    );
  };

  const handleClearAll = () => {
    setCheckedSignIds([]);
  };

  const handleSubmitChecklist = () => {
    const result = screenNutrition(checkedSignIds);
    setScreeningResult(result);
    setStep('results');
    setSavedSuccessMsg(null);
  };

  const handleSaveAndApply = async () => {
    if (!screeningResult) return;
    setIsSaving(true);

    try {
      // 1. Gather diet advice items
      const eatFoods: string[] = [];
      const detectedIds: string[] = [];
      const summaryNames: { en: string; hi: string; gu: string }[] = [];

      screeningResult.confirmedDeficiencies.forEach((res) => {
        detectedIds.push(res.deficiency.id);
        summaryNames.push({
          en: res.deficiency.deficiency_name.en || '',
          hi: res.deficiency.deficiency_name.hi || '',
          gu: res.deficiency.deficiency_name.gu || '',
        });

        res.deficiency.diet_advice.forEach((adv) => {
          const text = adv[currentLang] || adv.en || '';
          if (text && !eatFoods.includes(text)) {
            eatFoods.push(text);
          }
        });
      });

      // 2. Save to patient record if patient is selected
      if (selectedPatient?.id) {
        await savePatientNutritionScreening(selectedPatient.id, {
          date: new Date().toISOString(),
          checkedSignIds,
          detectedDeficiencyIds: detectedIds,
          summaryNames,
          dietAdviceAdded: eatFoods,
        });
      } else {
        // Ensure default patient or prompt selection
        const defaultPatientId = await db.patients.toCollection().first().then((p) => p?.id);
        if (defaultPatientId) {
          await savePatientNutritionScreening(defaultPatientId, {
            date: new Date().toISOString(),
            checkedSignIds,
            detectedDeficiencyIds: detectedIds,
            summaryNames,
            dietAdviceAdded: eatFoods,
          });
        }
      }

      // 3. Merge with active case diet advice if callback provided
      if (onApplyDietAdvice && eatFoods.length > 0) {
        onApplyDietAdvice({
          eat: eatFoods,
          avoid: [],
        });
      }

      setSavedSuccessMsg(t('nutrition.screeningSaved') || 'Screening saved successfully to patient history!');
    } catch (err) {
      console.error('Error saving nutrition screening:', err);
      setSavedSuccessMsg('Screening recorded.');
    } finally {
      setIsSaving(false);
    }
  };

  const getText = (textObj?: MultilingualText | string): string => {
    if (!textObj) return '';
    if (typeof textObj === 'string') return textObj;
    return textObj[currentLang] || textObj.en || textObj.hi || textObj.gu || '';
  };

  return (
    <div className="fixed inset-0 bg-[#1A2B2B]/80 backdrop-blur-sm z-[100] overflow-y-auto p-3 sm:p-5 flex items-center justify-center font-sans">
      <div className="bg-white rounded-3xl max-w-4xl w-full border border-[#DDE3E2] shadow-2xl overflow-hidden flex flex-col max-h-[92vh] my-auto">
        {/* Modal Header */}
        <div className="bg-[#1B4D4A] text-white p-4 sm:p-5 border-b border-[#2E7D73] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 rounded-2xl border border-white/15 text-emerald-200">
              {/* Custom Plate / Leaf SVG Icon */}
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 20A9 9 0 0 0 20 11V3h-8a9 9 0 0 0-9 9 9 9 0 0 0 8 8z" />
                <path d="M11 20v-9a3 3 0 0 1 3-3h6" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white">
                {t('nutrition.title') || 'Nutrition Deficiency Screening'}
              </h2>
              <p className="text-xs sm:text-sm text-emerald-100/80 font-normal">
                {selectedPatient
                  ? `Patient: ${selectedPatient.name} (${selectedPatient.age} yrs, ${selectedPatient.gender})`
                  : 'Nirāmay Physical Sign Assessment Tool'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!selectedPatient && (
              <button
                type="button"
                onClick={() => setShowPatientSelectModal(true)}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700/60 hover:bg-emerald-700 text-xs font-medium rounded-xl text-white transition-colors border border-emerald-500/30"
              >
                <User className="w-3.5 h-3.5" />
                <span>Select Patient</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-emerald-100 hover:text-white hover:bg-white/10 transition-colors"
              aria-label="Close"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#F8FAFA]">
          {step === 'checklist' ? (
            <div className="space-y-6">
              {/* Patient Banner Bar */}
              <div className="bg-emerald-50/80 border border-emerald-200/80 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-base">
                    {selectedPatient ? selectedPatient.name.charAt(0).toUpperCase() : <User className="w-5 h-5" />}
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-[#1B4D4A]">
                      {selectedPatient ? selectedPatient.name : 'Walk-in / General Patient'}
                    </h4>
                    <p className="text-xs text-slate-600">
                      {selectedPatient
                        ? `${selectedPatient.age} Y / ${selectedPatient.gender} ${selectedPatient.village ? `• ${selectedPatient.village}` : ''}`
                        : 'Tap button to link this screening to a patient record'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowPatientSelectModal(true)}
                    className="px-3 py-1.5 bg-white text-[#1B4D4A] border border-emerald-300 rounded-xl text-xs font-semibold hover:bg-emerald-50 transition-colors flex items-center gap-1.5 shadow-xs"
                  >
                    <User className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{selectedPatient ? 'Change Patient' : 'Select Patient'}</span>
                  </button>
                  {checkedSignIds.length > 0 && (
                    <button
                      type="button"
                      onClick={handleClearAll}
                      className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-800 underline font-medium"
                    >
                      Clear All ({checkedSignIds.length})
                    </button>
                  )}
                </div>
              </div>

              {/* Subtitle instructions */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                <p className="text-xs sm:text-sm font-medium text-slate-700">
                  {t('nutrition.subtitle') || 'Check all signs observed during physical examination of the patient.'}
                </p>
                <div className="mt-2 flex items-center gap-2 text-xs text-[#2E7D73]">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>Select any positive physical signs to generate diagnostic advice & supplements</span>
                </div>
              </div>

              {/* Signs Grouped by Body System */}
              <div className="space-y-6">
                {signGroups.map((group: SignGroup) => (
                  <div key={group.body_part} className="bg-white rounded-2xl border border-[#DDE3E2] p-4 sm:p-5 shadow-xs">
                    {/* Group Header */}
                    <div className="flex items-center gap-2 pb-3 mb-4 border-b border-slate-100">
                      <div className="w-2.5 h-6 bg-[#1B4D4A] rounded-full"></div>
                      <h3 className="text-base font-semibold text-[#1B4D4A] tracking-tight">
                        {getText(group.title)}
                      </h3>
                      <span className="ml-auto text-xs font-semibold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">
                        {group.signs.length} signs
                      </span>
                    </div>

                    {/* Signs Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {group.signs.map((sign: NutritionSign) => {
                        const isChecked = checkedSignIds.includes(sign.id);
                        return (
                          <div
                            key={sign.id}
                            onClick={() => handleToggleSign(sign.id)}
                            className={`group relative flex items-start gap-3.5 p-3.5 rounded-2xl border cursor-pointer transition-all duration-150 select-none ${
                              isChecked
                                ? 'bg-emerald-50/90 border-emerald-500 shadow-xs ring-1 ring-emerald-500/30'
                                : 'bg-slate-50/60 border-slate-200/80 hover:bg-slate-100/70 hover:border-slate-300'
                            }`}
                          >
                            {/* Custom Checkbox */}
                            <div
                              className={`mt-0.5 shrink-0 w-5 h-5 rounded-lg border flex items-center justify-center transition-all ${
                                isChecked
                                  ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs'
                                  : 'bg-white border-slate-300 group-hover:border-emerald-500'
                              }`}
                            >
                              {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                            </div>

                            <span className={`text-xs sm:text-sm font-medium leading-snug transition-colors ${
                              isChecked ? 'text-emerald-950 font-semibold' : 'text-slate-800'
                            }`}>
                              {getText(sign.label)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* Results Screen */
            <div className="space-y-6 animate-fadeIn">
              {/* Results Top Header */}
              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setStep('checklist')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4 text-slate-500" />
                  <span>Edit Observations</span>
                </button>

                <span className="text-xs font-semibold text-slate-500 bg-slate-200/70 px-3 py-1 rounded-full">
                  {checkedSignIds.length} signs observed
                </span>
              </div>

              {savedSuccessMsg && (
                <div className="bg-emerald-600 text-white p-4 rounded-2xl flex items-center gap-3 shadow-md border border-emerald-500">
                  <ShieldCheck className="w-5 h-5 shrink-0" />
                  <span className="text-xs sm:text-sm font-medium">{savedSuccessMsg}</span>
                </div>
              )}

              {screeningResult && screeningResult.confirmedDeficiencies.length > 0 ? (
                <div className="space-y-5">
                  <div className="bg-[#1B4D4A]/10 border border-[#1B4D4A]/20 rounded-2xl p-4">
                    <h3 className="text-sm font-bold text-[#1B4D4A]">
                      {t('nutrition.resultsTitle') || 'Nutrition Screening Results'}
                    </h3>
                    <p className="text-xs text-slate-600 mt-1">
                      {t('nutrition.resultsSubtitle') ||
                        'Based on physical examination signs, the following nutritional deficiencies may be present:'}
                    </p>
                  </div>

                  {/* Confirmed Deficiencies Cards */}
                  {screeningResult.confirmedDeficiencies.map((item: ConfirmedDeficiencyResult) => {
                    const isSevere = item.severity === 'severe';
                    return (
                      <div
                        key={item.deficiency.id}
                        className={`bg-white rounded-3xl border shadow-sm overflow-hidden border-l-8 ${
                          isSevere ? 'border-l-rose-500 border-rose-200' : 'border-l-emerald-600 border-emerald-200'
                        }`}
                      >
                        {/* Card Header */}
                        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2 bg-slate-50/50">
                          <div>
                            <span
                              className={`inline-block text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full mb-1 ${
                                isSevere ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                              }`}
                            >
                              {isSevere ? 'Severe Urgency' : 'Moderate Deficiency'}
                            </span>
                            <h4 className="text-base sm:text-lg font-bold text-slate-900">
                              {getText(item.deficiency.deficiency_name)}
                            </h4>
                          </div>

                          <div className="px-3 py-1 bg-white border border-slate-200 rounded-full text-xs font-semibold text-slate-700 shadow-2xs">
                            {t('nutrition.matchedSigns', {
                              matched: item.matchedSignCount,
                              total: item.totalSignsCount,
                            }) || `${item.matchedSignCount} of ${item.totalSignsCount} signs matched`}
                          </div>
                        </div>

                        <div className="p-4 sm:p-5 space-y-4 text-xs sm:text-sm">
                          {/* Matched Signs Bullet List */}
                          <div>
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                              Observed Physical Signs
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {item.matchedSigns.map((s) => (
                                <span
                                  key={s.id}
                                  className="inline-flex items-center gap-1 bg-amber-50 text-amber-900 border border-amber-200 px-2.5 py-1 rounded-xl text-xs font-medium"
                                >
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                                  {getText(s.label)}
                                </span>
                              ))}
                            </div>
                          </div>

                          {/* Dietary Advice */}
                          <div className="bg-emerald-50/60 rounded-2xl p-3.5 border border-emerald-100">
                            <div className="flex items-center gap-2 mb-2 text-[#1B4D4A] font-bold text-xs uppercase tracking-wider">
                              {/* Custom Leaf Icon */}
                              <svg className="w-4 h-4 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <path d="M11 20A9 9 0 0 0 20 11V3h-8a9 9 0 0 0-9 9 9 9 0 0 0 8 8z" />
                                <path d="M11 20v-9a3 3 0 0 1 3-3h6" />
                              </svg>
                              <span>{t('nutrition.dietAdvice') || 'Dietary Advice & Local Food Recommendations'}</span>
                            </div>
                            <ul className="space-y-1.5 text-slate-800 pl-1">
                              {item.deficiency.diet_advice.map((advice, idx) => (
                                <li key={idx} className="flex items-start gap-2">
                                  <span className="text-emerald-600 font-bold">•</span>
                                  <span>{getText(advice)}</span>
                                </li>
                              ))}
                            </ul>
                          </div>

                          {/* Suggested Supplements */}
                          <div className="bg-blue-50/60 rounded-2xl p-3.5 border border-blue-100">
                            <div className="flex items-center gap-2 mb-2 text-blue-900 font-bold text-xs uppercase tracking-wider">
                              {/* Custom Capsule Icon */}
                              <svg className="w-4 h-4 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <path d="M10.5 20.5l-7-7a5 5 0 0 1 7.07-7.07l7 7a5 5 0 0 1-7.07 7.07z" />
                                <line x1="8.5" y1="8.5" x2="15.5" y2="15.5" />
                              </svg>
                              <span>{t('nutrition.suggestedSupplements') || 'Suggested Supplements'}</span>
                            </div>
                            <ul className="space-y-1 text-slate-800 pl-1">
                              {item.deficiency.supplements.map((supp, idx) => (
                                <li key={idx} className="flex items-start gap-2">
                                  <span className="text-blue-600 font-bold">•</span>
                                  <span>{getText(supp)}</span>
                                </li>
                              ))}
                            </ul>
                            <p className="mt-2 text-[11px] text-blue-700 italic border-t border-blue-200/60 pt-1.5">
                              {t('nutrition.supplementDisclaimer') ||
                                'Supplements are suggestions only and should be administered under medical supervision as per national protocols.'}
                            </p>
                          </div>

                          {/* Health Library Article Links */}
                          {item.deficiency.related_articles && item.deficiency.related_articles.length > 0 && (
                            <div className="pt-2 border-t border-slate-100 flex flex-wrap gap-2 items-center">
                              <span className="text-xs font-semibold text-slate-500">Deep Reading:</span>
                              {item.deficiency.related_articles.map((artId) => (
                                <button
                                  key={artId}
                                  type="button"
                                  onClick={() => onOpenArticle?.(artId)}
                                  className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 hover:bg-emerald-100 hover:text-emerald-900 text-slate-700 rounded-xl text-xs font-medium transition-colors border border-slate-200"
                                >
                                  <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>{artId.replace(/_/g, ' ')}</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* Clean Empty Result Card */
                <div className="bg-white rounded-3xl border border-emerald-200 border-l-8 border-l-emerald-500 p-6 sm:p-8 text-center space-y-3 shadow-xs">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                    <ShieldCheck className="w-7 h-7" />
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900">
                    {t('nutrition.noDeficiencyTitle') || 'No Deficiency Signs Identified'}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto">
                    {t('nutrition.noDeficiencyMsg') ||
                      'No nutritional deficiency signs selected. Continue routine care and balanced diet.'}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer Bar */}
        <div className="bg-white p-4 border-t border-[#DDE3E2] flex flex-wrap items-center justify-between gap-3 shrink-0">
          {step === 'checklist' ? (
            <>
              <div className="text-xs text-slate-500">
                <span className="font-bold text-slate-800">{checkedSignIds.length}</span> signs selected
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-2xl text-slate-600 hover:bg-slate-100 text-xs font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSubmitChecklist}
                  className="px-6 py-2.5 rounded-2xl bg-[#1B4D4A] hover:bg-[#143B38] text-white text-xs font-bold transition-all shadow-md flex items-center gap-2"
                >
                  <span>{t('nutrition.submit') || 'Submit Screening'}</span>
                </button>
              </div>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setStep('checklist')}
                className="px-4 py-2.5 rounded-2xl text-slate-700 bg-slate-100 hover:bg-slate-200 text-xs font-semibold transition-colors"
              >
                Back to Signs
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSaveAndApply}
                  disabled={isSaving}
                  className="px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-md flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSaving ? 'Saving...' : t('nutrition.saveAndApply') || 'Save Screening & Add to Diet Advice'}</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Patient Select Sub-Dialog */}
      {showPatientSelectModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-5 space-y-4 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm">Select Patient for Screening</h3>
              <button
                onClick={() => setShowPatientSelectModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="max-h-60 overflow-y-auto space-y-2">
              {patientList.length === 0 ? (
                <p className="text-xs text-slate-500 py-4 text-center">No patient records found in local database.</p>
              ) : (
                patientList.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      setSelectedPatient(p);
                      setShowPatientSelectModal(false);
                      if (onSelectPatient) onSelectPatient(p);
                    }}
                    className="w-full text-left p-3 rounded-xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/50 transition flex items-center justify-between"
                  >
                    <div>
                      <div className="font-bold text-xs text-slate-900">{p.name}</div>
                      <div className="text-[11px] text-slate-500">{p.age} yrs • {p.gender} • {p.village}</div>
                    </div>
                    <User className="w-4 h-4 text-emerald-600" />
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
