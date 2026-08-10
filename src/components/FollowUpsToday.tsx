import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Calendar,
  CheckCircle2,
  Clock,
  User,
  AlertCircle,
  Stethoscope,
  X,
  FileText,
  Activity
} from 'lucide-react';
import { db, getDueFollowUps } from '../db/db';
import { CaseRecord, Patient, CaseOutcome, LanguageCode } from '../types';

interface FollowUpsTodayProps {
  onStartNewTriageForPatient: (patient: Patient) => void;
  onBackToHome: () => void;
  activeFamilyId?: number;
}

export const FollowUpsToday: React.FC<FollowUpsTodayProps> = ({
  onStartNewTriageForPatient,
  onBackToHome,
  activeFamilyId
}) => {
  const { i18n } = useTranslation();
  const currentLang = (i18n.language || 'en') as LanguageCode;

  const [dueList, setDueList] = useState<{ caseRecord: CaseRecord; patient?: Patient }[]>([]);
  const [selectedCase, setSelectedCase] = useState<{
    caseRecord: CaseRecord;
    patient?: Patient;
  } | null>(null);

  const [outcome, setOutcome] = useState<CaseOutcome>('improved');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadDueFollowUps();
  }, [activeFamilyId]);

  const loadDueFollowUps = async () => {
    try {
      const items = await getDueFollowUps();
      if (activeFamilyId) {
        const filtered = items.filter((item) => item.patient?.familyId === activeFamilyId);
        setDueList(filtered);
      } else {
        setDueList(items);
      }
    } catch (err) {
      console.error('Failed to load due followups', err);
    }
  };

  const handleCompleteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCase || !selectedCase.caseRecord.id) return;

    setIsSubmitting(true);
    try {
      await db.cases.update(selectedCase.caseRecord.id, {
        followUpDone: true,
        outcome,
        outcomeNotes: notes
      });

      const updatedPatient = selectedCase.patient;
      const wasWorsened = outcome === 'worsened';

      setSelectedCase(null);
      setNotes('');
      await loadDueFollowUps();

      if (wasWorsened && updatedPatient) {
        if (
          confirm(
            currentLang === 'gu'
              ? 'દર્દીની તબિયતમાં ઘટાડો થયો છે. શું તમે આ દર્દી માટે નવું ટ્રાયજ શરૂ કરવા માંગો છો?'
              : currentLang === 'hi'
              ? 'रोगी की स्थिति बिगड़ी है। क्या आप इस रोगी के लिए नया ट्राइएज शुरू करना चाहते हैं?'
              : 'Patient condition worsened. Would you like to launch a new triage for this patient now?'
          )
        ) {
          onStartNewTriageForPatient(updatedPatient);
        }
      }
    } catch (err) {
      console.error('Error completing follow-up', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const texts = {
    title:
      currentLang === 'gu'
        ? 'આજના ફૉલો-અપ'
        : currentLang === 'hi'
        ? 'आज के फॉलो-अप'
        : "Today's Follow-up Reminders",
    subtitle:
      currentLang === 'gu'
        ? 'રિમાઇન્ડર્સ અને દર્દીની રિકવરી ટ્રૅકિંગ'
        : currentLang === 'hi'
        ? 'रिमाइंडर एवं रोगी रिकवरी ट्रैकिंग'
        : 'Patient status checks due today or past due',
    emptyTitle:
      currentLang === 'gu'
        ? 'આજે કોઈ ફૉલો-અપ બાકી નથી'
        : currentLang === 'hi'
        ? 'आज कोई फॉलो-अप बकाया नहीं है'
        : 'No follow-ups due today!',
    emptyDesc:
      currentLang === 'gu'
        ? 'બધા શેડ્યૂલ કરેલા ફૉલો-અપ પૂર્ણ થયા છે અથવા કોઈ નવું કાર્ય નથી.'
        : currentLang === 'hi'
        ? 'सभी निर्धारित फॉलो-अप पूर्ण हो चुके हैं या कोई नया कार्य नहीं है।'
        : 'All scheduled patient follow-ups are completed.',
    completeBtn:
      currentLang === 'gu' ? 'ફૉલો-અપ પૂર્ણ કરો' : currentLang === 'hi' ? 'फॉलो-अप पूर्ण करें' : 'Complete Follow-up',
    modalTitle:
      currentLang === 'gu'
        ? 'ફૉલો-અપ પરિણામ નોંધો'
        : currentLang === 'hi'
        ? 'फॉलो-अप परिणाम दर्ज करें'
        : 'Record Follow-up Outcome',
    question:
      currentLang === 'gu'
        ? 'દર્દીની હાલની તબિયત કેવી છે?'
        : currentLang === 'hi'
        ? 'रोगी की वर्तमान स्थिति कैसी है?'
        : 'How is the patient feeling now?',
    improved: currentLang === 'gu' ? 'સુધારો થયો (Improved)' : currentLang === 'hi' ? 'सुधार हुआ (Improved)' : 'Improved',
    recovered: currentLang === 'gu' ? 'સંપૂર્ણ સાજા થયા (Recovered)' : currentLang === 'hi' ? 'पूर्ण स्वस्थ (Recovered)' : 'Recovered',
    noChange: currentLang === 'gu' ? 'કોઈ ફેરફાર નથી (No Change)' : currentLang === 'hi' ? 'कोई बदलाव नहीं (No Change)' : 'No Change',
    worsened: currentLang === 'gu' ? 'સ્થિતિ બગડી (Worsened)' : currentLang === 'hi' ? 'स्थिति बिगड़ी (Worsened)' : 'Worsened',
    notesLabel: currentLang === 'gu' ? 'ક્લિનિકલ ટિપ્પણી / નોંધ' : currentLang === 'hi' ? 'नैदानिक टिप्पणी / नोट' : 'Clinical Notes / Observation',
    saveBtn: currentLang === 'gu' ? 'પરિણામ સાચવો' : currentLang === 'hi' ? 'परिणाम सहेजें' : 'Save Outcome',
  };

  return (
    <div className="max-w-3xl mx-auto px-3 sm:px-4 py-6 space-y-6 bg-[#F4F7F6] min-h-[calc(100vh-80px)] font-sans">
      {/* Header Banner */}
      <div className="bg-[#1B4D4A] text-white rounded-2xl p-5 sm:p-6 shadow-card border border-[#2E7D73]/30 flex items-center justify-between font-sans">
        <div className="flex items-center gap-3.5">
          <button
            onClick={onBackToHome}
            className="p-2.5 rounded-xl bg-[#2E7D73] text-white hover:bg-[#1B4D4A] transition cursor-pointer border border-[#B2DFD8]/20 shadow-xs"
            title="Return to Dispensary Entrance"
          >
            <Clock className="w-5 h-5 text-white" />
          </button>
          <div>
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#B2DFD8] block">
              LONGITUDINAL FOLLOW-UP MONITORING
            </span>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight font-display">{texts.title}</h2>
          </div>
        </div>

        <span className="px-3.5 py-1.5 bg-white text-[#1B4D4A] rounded-xl font-bold text-xs shadow-xs">
          {dueList.length} QUEUED
        </span>
      </div>

      {/* Due Followup List */}
      {dueList.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 text-center text-[#5F6D6C] border border-[#DDE3E2] space-y-3 font-sans shadow-card">
          <CheckCircle2 className="w-12 h-12 mx-auto text-[#2E7D73]" />
          <h3 className="font-bold text-[#1B4D4A] text-base font-display">{texts.emptyTitle}</h3>
          <p className="text-xs italic">{texts.emptyDesc}</p>
        </div>
      ) : (
        <div className="space-y-4 font-sans">
          {/* Group followups by family */}
          {Array.from(
            dueList.reduce((acc, item) => {
              const key = item.patient?.familyId ? `family-${item.patient.familyId}` : `patient-${item.patient?.id || Math.random()}`;
              if (!acc.has(key)) {
                acc.set(key, {
                  familyTitle: item.patient?.familyId ? `${item.patient.village || 'Local Village'} Household` : 'Individual Patient',
                  items: []
                });
              }
              acc.get(key)!.items.push(item);
              return acc;
            }, new Map<string, { familyTitle: string; items: { caseRecord: CaseRecord; patient?: Patient }[] }>()).values()
          ).map((group: { familyTitle: string; items: { caseRecord: CaseRecord; patient?: Patient }[] }, gIdx) => (
            <div key={gIdx} className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-2xs space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <span className="w-7 h-7 rounded-lg bg-teal-50 text-teal-800 border border-teal-100 flex items-center justify-center font-bold text-xs">
                  <User className="w-4 h-4 text-teal-800" />
                </span>
                <div>
                  <h4 className="font-bold text-sm text-slate-900 font-display">
                    {group.items[0]?.patient?.name ? `${group.items[0].patient.name}'s Family Household` : group.familyTitle}
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    {group.items[0]?.patient?.village || 'Local Village'} • {group.items.length} Due Follow-up(s)
                  </p>
                </div>
              </div>

              <div className="space-y-3 pt-1">
                {group.items.map(({ caseRecord: c, patient: p }) => (
                  <div
                    key={c.id}
                    className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2 hover:border-teal-600 transition"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="font-bold text-sm text-teal-900 leading-tight block">
                          {p ? p.name : 'Unknown Patient'}
                        </span>
                        <span className="text-[11px] text-slate-500">
                          {p ? `${p.age} YRS • ${p.gender} • ${p.relationToHead || 'Member'}` : ''}
                        </span>
                      </div>

                      <span className="text-[10px] font-bold text-teal-900 bg-teal-100/70 px-2.5 py-1 rounded-md border border-teal-200 flex items-center gap-1 shrink-0">
                        <Calendar className="w-3 h-3 text-teal-700" />
                        DUE: {c.followUpDate}
                      </span>
                    </div>

                    <div className="p-2.5 bg-white rounded-lg border border-slate-200 text-slate-700 space-y-1 text-xs">
                      <p>
                        <strong className="text-slate-900">Diagnosis:</strong> {c.diagnosisName}
                      </p>
                      {c.chiefComplaint && (
                        <p>
                          <strong className="text-slate-900">Chief Complaint:</strong> {c.chiefComplaint}
                        </p>
                      )}
                      {c.medicinesGiven && c.medicinesGiven.length > 0 && (
                        <p>
                          <strong className="text-slate-900">Prescribed:</strong> {c.medicinesGiven.join(', ')}
                        </p>
                      )}
                    </div>

                    <button
                      onClick={() => setSelectedCase({ caseRecord: c, patient: p })}
                      className="w-full py-2 bg-teal-800 hover:bg-teal-900 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                      <span>{texts.completeBtn}</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Outcome Recording Modal */}
      {selectedCase && (
        <div className="fixed inset-0 bg-[#1A2B2B]/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-[#DDE3E2] font-sans">
            <div className="bg-[#1B4D4A] text-white p-4.5 flex items-center justify-between border-b border-[#2E7D73]/30">
              <h3 className="font-bold text-base sm:text-lg font-display">{texts.modalTitle}</h3>
              <button
                onClick={() => setSelectedCase(null)}
                className="text-[#B2DFD8] hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCompleteSubmit} className="p-5 space-y-4 font-sans text-xs">
              <div className="font-bold text-[#1B4D4A]">
                Patient: <span className="underline">{selectedCase.patient?.name}</span> ({selectedCase.caseRecord.diagnosisName})
              </div>

              <div>
                <label className="block font-bold text-[#1B4D4A] mb-2 font-display">
                  EVALUATE CLINICAL STATUS:
                </label>
                <div className="space-y-2 font-sans">
                  {[
                    { key: 'improved', label: texts.improved },
                    { key: 'recovered', label: texts.recovered },
                    { key: 'no_change', label: texts.noChange },
                    { key: 'worsened', label: texts.worsened },
                  ].map((item) => (
                    <label
                      key={item.key}
                      className={`flex items-center gap-3 p-2.5 rounded-xl border text-xs font-bold cursor-pointer transition ${
                        outcome === item.key ? 'bg-[#2E7D73] text-white border-[#2E7D73] shadow-xs' : 'border-[#DDE3E2] bg-[#F4F7F6] text-[#1A2B2B] hover:bg-[#EDF1F0]'
                      }`}
                    >
                      <input
                        type="radio"
                        name="outcome"
                        value={item.key}
                        checked={outcome === item.key}
                        onChange={() => setOutcome(item.key as any)}
                        className="accent-[#1B4D4A]"
                      />
                      <span>{item.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#1B4D4A] mb-1">
                  OBSERVATIONS & CLINICAL NOTES
                </label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Fever resolved, appetite restored..."
                  className="w-full p-2.5 bg-[#F4F7F6] border border-[#DDE3E2] rounded-xl text-xs text-[#1A2B2B] focus:border-[#2E7D73] focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 bg-[#1B4D4A] hover:bg-[#2E7D73] text-white font-bold text-xs rounded-xl transition cursor-pointer shadow-xs"
              >
                SAVE OUTCOME TO EMR
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
