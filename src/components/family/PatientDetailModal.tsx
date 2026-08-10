import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { User, X, FileText, Calendar, Shield, Edit3, Activity, Clock, Stethoscope, AlertTriangle } from 'lucide-react';
import { Patient, CaseRecord, LanguageCode } from '../../types';
import { db } from '../../db/db';
import { MedicalProfileEditor } from '../MedicalProfileEditor';
import { PatientDetailAdherenceTab } from '../adherence/PatientDetailAdherenceTab';

interface PatientDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient: Patient | null;
  onStartCaseForPatient?: (patient: Patient) => void;
  onPatientUpdated?: () => void;
}

export const PatientDetailModal: React.FC<PatientDetailModalProps> = ({
  isOpen,
  onClose,
  patient,
  onStartCaseForPatient,
  onPatientUpdated
}) => {
  const { i18n } = useTranslation();
  const currentLang = (i18n.language || 'en') as LanguageCode;

  const [activeTab, setActiveTab] = useState<'cases' | 'profile' | 'adherence'>('cases');
  const [patientCases, setPatientCases] = useState<CaseRecord[]>([]);
  const [showMedicalProfileModal, setShowMedicalProfileModal] = useState(false);
  const [currentPatient, setCurrentPatient] = useState<Patient | null>(patient);

  useEffect(() => {
    setCurrentPatient(patient);
    if (patient && patient.id) {
      loadCases(patient.id);
    }
  }, [patient]);

  const loadCases = async (patientId: number) => {
    try {
      const cases = await db.cases.where('patientId').equals(patientId).reverse().sortBy('date');
      setPatientCases(cases);
    } catch (err) {
      console.error('Failed to load cases for patient', err);
    }
  };

  if (!isOpen || !currentPatient) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto font-sans">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl border border-teal-100 my-auto overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-[#1B4D4A] text-white p-4 sm:p-5 flex items-start justify-between border-b border-[#2E7D73]">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-600/30 border border-emerald-400/30 flex items-center justify-center text-emerald-300 shrink-0 font-bold text-lg">
              <User className="w-6 h-6" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base sm:text-lg text-white font-display leading-snug">
                  {currentPatient.name}
                </h3>
                {currentPatient.relationToHead && (
                  <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[10px] font-bold rounded-full">
                    {currentPatient.relationToHead}
                  </span>
                )}
              </div>
              <p className="text-xs text-[#B2DFD8] mt-0.5">
                {currentPatient.age} yrs • {currentPatient.gender} • {currentPatient.village || 'Local Village'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onStartCaseForPatient && (
              <button
                onClick={() => {
                  onClose();
                  onStartCaseForPatient(currentPatient);
                }}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Stethoscope className="w-3.5 h-3.5" />
                <span>Start Case</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-slate-100 px-4 py-2 flex items-center gap-2 border-b border-slate-200 text-xs font-bold">
          <button
            onClick={() => setActiveTab('cases')}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'cases' ? 'bg-teal-800 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Past Cases ({patientCases.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('profile')}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'profile' ? 'bg-teal-800 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Medical Profile & Safety</span>
          </button>

          <button
            onClick={() => setActiveTab('adherence')}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'adherence' ? 'bg-teal-800 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Pill Tracker & Goals</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-4 sm:p-6 max-h-[65vh] overflow-y-auto">
          {activeTab === 'cases' && (
            <div className="space-y-3">
              {patientCases.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                  <p className="text-xs text-slate-500 font-medium">No past clinical case records found for this member.</p>
                </div>
              ) : (
                patientCases.map((c) => (
                  <div key={c.id} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-teal-900">{c.diagnosisName}</span>
                      <span className="text-slate-500 font-normal">{c.date}</span>
                    </div>

                    <div className="text-xs text-slate-600 space-y-1">
                      {c.chiefComplaint && <p><strong>Chief Complaint:</strong> {c.chiefComplaint}</p>}
                      {c.symptoms && c.symptoms.length > 0 && <p><strong>Symptoms:</strong> {c.symptoms.join(', ')}</p>}
                      {c.medicinesGiven && c.medicinesGiven.length > 0 && (
                        <p><strong>Medicines Prescribed:</strong> {c.medicinesGiven.join(', ')}</p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'profile' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-teal-50 p-4 rounded-2xl border border-teal-100">
                <div>
                  <h4 className="font-bold text-sm text-teal-900">Allergies & Active Medications</h4>
                  <p className="text-xs text-teal-700">Safety checks evaluate these against prescribed treatments.</p>
                </div>

                <button
                  onClick={() => setShowMedicalProfileModal(true)}
                  className="px-3 py-1.5 bg-teal-800 text-white text-xs font-bold rounded-xl hover:bg-teal-900 transition flex items-center gap-1 cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit Medical Profile</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <strong className="block text-slate-800 font-bold mb-1">Known Allergies:</strong>
                  {currentPatient.allergies && currentPatient.allergies.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {currentPatient.allergies.map((alg) => (
                        <span key={alg} className="px-2 py-0.5 bg-rose-100 text-rose-800 font-bold rounded-md text-[10px]">
                          {alg}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-slate-500 italic">No allergies recorded</span>
                  )}
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <strong className="block text-slate-800 font-bold mb-1">Current Medications:</strong>
                  {currentPatient.currentMeds && currentPatient.currentMeds.length > 0 ? (
                    <div className="space-y-1">
                      {currentPatient.currentMeds.map((med) => (
                        <div key={med.medId} className="text-slate-700 font-medium">
                          • {med.name || med.medId} {med.frequency && `(${med.frequency})`}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-slate-500 italic">No active medications recorded</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'adherence' && (
            <PatientDetailAdherenceTab patient={currentPatient} />
          )}
        </div>

        {/* Medical Profile Editor Modal */}
        {showMedicalProfileModal && currentPatient.id && (
          <MedicalProfileEditor
            patientId={currentPatient.id}
            initialAllergies={currentPatient.allergies || []}
            initialMeds={currentPatient.currentMeds || []}
            onClose={() => setShowMedicalProfileModal(false)}
            onSave={async () => {
              setShowMedicalProfileModal(false);
              const updated = await db.patients.get(currentPatient.id!);
              if (updated) setCurrentPatient(updated);
              if (onPatientUpdated) onPatientUpdated();
            }}
          />
        )}
      </div>
    </div>
  );
};
