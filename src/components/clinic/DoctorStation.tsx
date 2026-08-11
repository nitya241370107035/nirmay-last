import React, { useState, useEffect } from 'react';
import {
  Stethoscope,
  Search,
  PlusCircle,
  FileText,
  User,
  Activity,
  Heart,
  Thermometer,
  Wind,
  Percent,
  Pill,
  Printer,
  Edit3,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Trash2,
  Share2,
  Building2,
  Sparkles,
  ArrowRight,
  Filter,
  X,
  ChevronDown,
  ShieldCheck,
  Zap
} from 'lucide-react';
import { db, saveClinicRecord, updateClinicRecord, searchClinicRecords } from '../../db/db';
import { ClinicRecord, DoctorPrescription, ClinicRecordVitals } from '../../types';
import { ClinicProfile } from './ClinicLogin';

interface DoctorStationProps {
  clinicProfile: ClinicProfile;
  onOpenTriageForPatient?: (patientName: string, uhid: string, complaint: string) => void;
}

const COMMON_MEDICINES = [
  { name: 'Paracetamol 500mg Tab', generic: 'Acetaminophen', defaultDosage: '1 Tab', timing: '1-0-1' as const, food: 'After Food' as const },
  { name: 'Amoxicillin 500mg Cap', generic: 'Amoxicillin Trihydrate', defaultDosage: '1 Cap', timing: '1-0-1' as const, food: 'After Food' as const },
  { name: 'Azithromycin 500mg Tab', generic: 'Azithromycin', defaultDosage: '1 Tab', timing: '1-0-0' as const, food: 'Before Food' as const },
  { name: 'Cetirizine 10mg Tab', generic: 'Cetirizine Hydrochloride', defaultDosage: '1 Tab', timing: '0-0-1' as const, food: 'After Food' as const },
  { name: 'Pantoprazole 40mg Tab', generic: 'Pantoprazole Sodium', defaultDosage: '1 Tab', timing: '1-0-0' as const, food: 'Empty Stomach' as const },
  { name: 'Metformin 500mg Tab', generic: 'Metformin Hydrochloride', defaultDosage: '1 Tab', timing: '1-0-1' as const, food: 'With Food' as const },
  { name: 'Amlodipine 5mg Tab', generic: 'Amlodipine Besylate', defaultDosage: '1 Tab', timing: '1-0-0' as const, food: 'After Food' as const },
  { name: 'ORS Sachet (Oral Electrolytes)', generic: 'Oral Rehydration Salts', defaultDosage: '1 Sachet in 1L Water', timing: 'SOS' as const, food: 'After Food' as const },
  { name: 'Cough Syrup (Dextromethorphan)', generic: 'Antitussive / Expectorant', defaultDosage: '10 ml', timing: '1-1-1' as const, food: 'After Food' as const },
  { name: 'Diclofenac 50mg Tab', generic: 'Diclofenac Sodium', defaultDosage: '1 Tab', timing: '1-0-1' as const, food: 'After Food' as const }
];

const LAB_INVESTIGATIONS_LIST = [
  'Complete Blood Count (CBC)',
  'Blood Glucose Fasting & PP',
  'HbA1c Glycated Hemoglobin',
  'Serum Creatinine & Urea (RFT)',
  'Lipid Profile (Cholesterol)',
  'Liver Function Test (LFT)',
  'Urine Routine & Microscopic',
  '12-Lead ECG',
  'Chest X-Ray (PA View)',
  'Serum Electrolytes (Na+, K+, Cl-)',
  'Dengue NS1 / IgM Rapid Test',
  'Malaria Antigen Card (Pv/Pf)'
];

export function DoctorStation({ clinicProfile }: DoctorStationProps) {
  const [records, setRecords] = useState<ClinicRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Active View & Modals
  const [activeModal, setActiveModal] = useState<'none' | 'manual_create' | 'edit_consultation' | 'print_slip'>('none');
  const [selectedRecord, setSelectedRecord] = useState<ClinicRecord | null>(null);

  // Form State for Manual Creation / Editing
  const [formData, setFormData] = useState<Partial<ClinicRecord>>({
    uhid: `CLN-${Math.floor(100000 + Math.random() * 900000)}`,
    patientName: '',
    age: 40,
    gender: 'Male',
    phone: '',
    villageCity: clinicProfile.cityDistrict || 'Local',
    chiefComplaint: '',
    symptomsSummary: [],
    vitals: {
      heartRate: 76,
      respiratoryRate: 16,
      bodyTemperature: 37.0,
      oxygenSaturation: 98,
      systolicBp: 120,
      diastolicBp: 80,
      derivedBmi: 22.5,
      heightCm: 165,
      weightKg: 62
    },
    provisionalDiagnosis: '',
    finalDiagnosis: '',
    clinicalImpression: '',
    doctorNotes: '',
    prescriptions: [],
    labInvestigations: [],
    status: 'Waiting Doctor',
    attendingDoctor: clinicProfile.doctorInCharge,
    doctorDegree: clinicProfile.doctorDegree,
    entrySource: 'manual_entry'
  });

  // Current Medicine Row in Rx Builder
  const [newRx, setNewRx] = useState<DoctorPrescription>({
    medicineName: '',
    dosage: '1 Tab',
    timing: '1-0-1',
    durationDays: 5,
    foodInstruction: 'After Food',
    specialNotes: ''
  });

  const [symptomInput, setSymptomInput] = useState<string>('');

  useEffect(() => {
    loadRecords();
  }, [clinicProfile.facilityCode]);

  const loadRecords = async () => {
    setIsLoading(true);
    try {
      const results = await searchClinicRecords(searchQuery, clinicProfile.facilityCode);
      setRecords(results);
    } catch (err) {
      console.error('Error loading clinic records:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = async (q: string) => {
    setSearchQuery(q);
    try {
      const results = await searchClinicRecords(q, clinicProfile.facilityCode);
      setRecords(results);
    } catch (err) {
      console.error('Error searching records:', err);
    }
  };

  const openManualCreateModal = () => {
    setFormData({
      uhid: `CLN-${Math.floor(100000 + Math.random() * 900000)}`,
      patientName: '',
      age: 38,
      gender: 'Male',
      phone: '',
      villageCity: clinicProfile.cityDistrict || 'Local',
      chiefComplaint: '',
      symptomsSummary: [],
      vitals: {
        heartRate: 76,
        respiratoryRate: 16,
        bodyTemperature: 37.0,
        oxygenSaturation: 98,
        systolicBp: 120,
        diastolicBp: 80,
        derivedBmi: 22.5,
        heightCm: 165,
        weightKg: 62
      },
      provisionalDiagnosis: '',
      finalDiagnosis: '',
      clinicalImpression: '',
      doctorNotes: '',
      prescriptions: [],
      labInvestigations: [],
      status: 'In Consultation',
      attendingDoctor: clinicProfile.doctorInCharge,
      doctorDegree: clinicProfile.doctorDegree,
      entrySource: 'manual_entry',
      encounterDate: new Date().toISOString()
    });
    setActiveModal('manual_create');
  };

  const openEditModal = (rec: ClinicRecord) => {
    setSelectedRecord(rec);
    setFormData({
      ...rec,
      prescriptions: rec.prescriptions ? [...rec.prescriptions] : [],
      labInvestigations: rec.labInvestigations ? [...rec.labInvestigations] : []
    });
    setActiveModal('edit_consultation');
  };

  const openPrintSlip = (rec: ClinicRecord) => {
    setSelectedRecord(rec);
    setActiveModal('print_slip');
  };

  const handleVitalsChange = (field: keyof ClinicRecordVitals, value: number) => {
    const currentVitals = (formData.vitals || {}) as ClinicRecordVitals;
    const updated = { ...currentVitals, [field]: value };
    
    // Auto-calculate BMI if height and weight exist
    if (field === 'heightCm' || field === 'weightKg') {
      const h = (field === 'heightCm' ? value : updated.heightCm || 165) / 100;
      const w = field === 'weightKg' ? value : updated.weightKg || 60;
      if (h > 0 && w > 0) {
        updated.derivedBmi = parseFloat((w / (h * h)).toFixed(1));
      }
    }
    setFormData({ ...formData, vitals: updated });
  };

  const handleAddSymptom = () => {
    if (!symptomInput.trim()) return;
    const current = formData.symptomsSummary || [];
    if (!current.includes(symptomInput.trim())) {
      setFormData({ ...formData, symptomsSummary: [...current, symptomInput.trim()] });
    }
    setSymptomInput('');
  };

  const handleRemoveSymptom = (sym: string) => {
    const current = formData.symptomsSummary || [];
    setFormData({ ...formData, symptomsSummary: current.filter((s) => s !== sym) });
  };

  const handleAddPrescription = () => {
    if (!newRx.medicineName.trim()) return;
    const current = formData.prescriptions || [];
    setFormData({
      ...formData,
      prescriptions: [...current, { ...newRx, id: `rx_${Date.now()}` }]
    });
    setNewRx({
      medicineName: '',
      dosage: '1 Tab',
      timing: '1-0-1',
      durationDays: 5,
      foodInstruction: 'After Food',
      specialNotes: ''
    });
  };

  const handleRemovePrescription = (index: number) => {
    const current = formData.prescriptions || [];
    setFormData({
      ...formData,
      prescriptions: current.filter((_, i) => i !== index)
    });
  };

  const handleToggleLab = (lab: string) => {
    const current = formData.labInvestigations || [];
    if (current.includes(lab)) {
      setFormData({ ...formData, labInvestigations: current.filter((l) => l !== lab) });
    } else {
      setFormData({ ...formData, labInvestigations: [...current, lab] });
    }
  };

  const handleSaveRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.patientName?.trim()) {
      alert('Please enter patient name.');
      return;
    }

    const payload: Omit<ClinicRecord, 'id'> = {
      uhid: formData.uhid || `CLN-${Math.floor(100000 + Math.random() * 900000)}`,
      patientName: formData.patientName || 'Anonymous',
      age: formData.age || 40,
      gender: formData.gender || 'Male',
      phone: formData.phone || '',
      villageCity: formData.villageCity || clinicProfile.cityDistrict || 'Local',
      clinicFacilityCode: clinicProfile.facilityCode,
      clinicName: clinicProfile.clinicName,
      department: clinicProfile.department,
      encounterDate: formData.encounterDate || new Date().toISOString(),
      entrySource: formData.entrySource || 'manual_entry',
      chiefComplaint: formData.chiefComplaint || 'General Consultation',
      symptomsSummary: formData.symptomsSummary || [],
      vitals: (formData.vitals || {
        heartRate: 76,
        respiratoryRate: 16,
        bodyTemperature: 37.0,
        oxygenSaturation: 98,
        systolicBp: 120,
        diastolicBp: 80,
        derivedBmi: 22.5
      }) as ClinicRecordVitals,
      triageResult: formData.triageResult,
      clinicalImpression: formData.clinicalImpression || '',
      provisionalDiagnosis: formData.provisionalDiagnosis || '',
      finalDiagnosis: formData.finalDiagnosis || '',
      doctorNotes: formData.doctorNotes || '',
      prescriptions: formData.prescriptions || [],
      labInvestigations: formData.labInvestigations || [],
      status: (formData.status as any) || 'Completed',
      attendingDoctor: formData.attendingDoctor || clinicProfile.doctorInCharge,
      doctorDegree: formData.doctorDegree || clinicProfile.doctorDegree,
      referralFacility: formData.referralFacility || '',
      referralReason: formData.referralReason || '',
      createdAt: formData.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (activeModal === 'edit_consultation' && selectedRecord?.id) {
      await updateClinicRecord(selectedRecord.id, payload);
    } else {
      await saveClinicRecord(payload);
    }

    setActiveModal('none');
    setSelectedRecord(null);
    await loadRecords();
  };

  // Filtered List
  const filteredRecords = records.filter((rec) => {
    if (filterStatus === 'all') return true;
    if (filterStatus === 'waiting') return rec.status === 'Waiting Doctor' || rec.status === 'Triage Completed';
    if (filterStatus === 'in_consultation') return rec.status === 'In Consultation';
    if (filterStatus === 'completed') return rec.status === 'Completed';
    if (filterStatus === 'high_risk') return rec.triageResult?.riskCategory === 'High';
    return true;
  });

  return (
    <div className="space-y-6 font-sans text-slate-800">
      {/* Top Action & Stats Bar */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase font-extrabold tracking-widest text-teal-800 bg-teal-100/80 px-2.5 py-0.5 rounded-full">
              EMR & Consultation Desk
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs font-semibold text-slate-600 font-mono">
              Dr. {clinicProfile.doctorInCharge} ({clinicProfile.doctorDegree})
            </span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
            Paperless Digital Clinical Records
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Search, edit, manage patient encounters, order lab investigations, and write digital prescriptions.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={openManualCreateModal}
            className="px-4 py-2.5 bg-gradient-to-r from-teal-700 to-teal-800 hover:from-teal-600 hover:to-teal-700 active:scale-95 text-white text-xs sm:text-sm font-bold rounded-2xl shadow-md transition flex items-center gap-2 cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>+ New Clinical Record (Manual Entry)</span>
          </button>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search clinical records by Patient Name, UHID, Phone, or Diagnosis..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium focus:ring-2 focus:ring-teal-500 focus:outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => handleSearch('')}
              className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-slate-600"
            >
              Clear
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 text-xs">
          {[
            { id: 'all', label: `All (${records.length})` },
            { id: 'waiting', label: 'Waiting Doctor' },
            { id: 'in_consultation', label: 'In Consultation' },
            { id: 'completed', label: 'Completed' },
            { id: 'high_risk', label: '🚨 High Risk Flagged' }
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFilterStatus(f.id)}
              className={`px-3 py-1.5 rounded-xl font-bold transition shrink-0 cursor-pointer ${
                filterStatus === f.id
                  ? 'bg-teal-800 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Records Table / List */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-slate-400 text-xs space-y-2">
            <Activity className="w-8 h-8 text-teal-600 animate-spin mx-auto" />
            <p>Loading digital clinical records...</p>
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="p-12 text-center text-slate-500 space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-teal-50 text-teal-700 border border-teal-200 flex items-center justify-center mx-auto">
              <FileText className="w-7 h-7" />
            </div>
            <div>
              <h4 className="font-bold text-slate-800 text-base">No Clinical Records Found</h4>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                {searchQuery
                  ? `No encounters match your search query "${searchQuery}".`
                  : 'No clinical encounters have been recorded yet in this facility.'}
              </p>
            </div>
            <button
              onClick={openManualCreateModal}
              className="px-4 py-2 bg-teal-800 text-white rounded-xl text-xs font-bold shadow hover:bg-teal-700 transition"
            >
              + Create First Clinical Record
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50/80 text-slate-500 uppercase tracking-wider text-[10px] font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-4">Patient & UHID</th>
                  <th className="py-3.5 px-4">Encounter / Source</th>
                  <th className="py-3.5 px-4">Chief Complaint & Vitals</th>
                  <th className="py-3.5 px-4">Risk & Diagnosis</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRecords.map((rec) => (
                  <tr key={rec.id || rec.uhid} className="hover:bg-teal-50/40 transition">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-teal-600" />
                        {rec.patientName}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                        {rec.uhid} • {rec.age}y / {rec.gender}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="text-slate-600 font-medium">
                        {new Date(rec.encounterDate).toLocaleDateString()}
                      </div>
                      <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border mt-1 ${
                        rec.entrySource === 'triage_ml'
                          ? 'bg-teal-50 text-teal-800 border-teal-200'
                          : rec.entrySource === 'appointment'
                          ? 'bg-purple-50 text-purple-800 border-purple-200'
                          : 'bg-slate-100 text-slate-700 border-slate-200'
                      }`}>
                        {rec.entrySource === 'triage_ml' && '🤖 ML Triage'}
                        {rec.entrySource === 'manual_entry' && '✍️ Manual Entry'}
                        {rec.entrySource === 'appointment' && '📅 Online Booking'}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-800">
                        {rec.chiefComplaint.replace('cc_', '').toUpperCase()}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono flex items-center gap-2 mt-0.5">
                        <span>SpO2: <strong>{rec.vitals?.oxygenSaturation}%</strong></span>
                        <span>BP: <strong>{rec.vitals?.systolicBp}/{rec.vitals?.diastolicBp}</strong></span>
                        <span>HR: <strong>{rec.vitals?.heartRate}</strong></span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      {rec.triageResult?.riskCategory ? (
                        <span className={`inline-block px-2 py-0.5 rounded font-black text-[10px] uppercase border ${
                          rec.triageResult.riskCategory === 'High'
                            ? 'bg-red-100 text-red-800 border-red-300'
                            : rec.triageResult.riskCategory === 'Medium'
                            ? 'bg-amber-100 text-amber-800 border-amber-300'
                            : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                        }`}>
                          {rec.triageResult.riskCategory} Risk
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400 italic">Routine Evaluation</span>
                      )}
                      <div className="text-[11px] text-slate-700 font-semibold mt-1">
                        {rec.finalDiagnosis || rec.provisionalDiagnosis || 'Diagnosis Pending'}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full ${
                        rec.status === 'Completed'
                          ? 'bg-emerald-100 text-emerald-800'
                          : rec.status === 'In Consultation'
                          ? 'bg-blue-100 text-blue-800'
                          : rec.status === 'Referred'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {rec.status === 'Completed' && <CheckCircle2 className="w-3 h-3" />}
                        {rec.status === 'Waiting Doctor' && <Clock className="w-3 h-3" />}
                        {rec.status}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEditModal(rec)}
                          className="p-1.5 bg-slate-100 hover:bg-teal-100 text-slate-700 hover:text-teal-800 rounded-lg transition"
                          title="Edit Clinical Record & Prescriptions"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openPrintSlip(rec)}
                          className="p-1.5 bg-slate-100 hover:bg-slate-800 text-slate-700 hover:text-white rounded-lg transition"
                          title="Print Doctor Prescription Slip"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL 1: Create Manual Record / Edit Consultation Record */}
      {(activeModal === 'manual_create' || activeModal === 'edit_consultation') && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-white w-full max-w-4xl rounded-3xl border border-slate-200 shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-teal-900 via-teal-800 to-cyan-900 text-white p-5 sm:p-6 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-white/15 rounded-xl border border-white/20">
                  <Stethoscope className="w-6 h-6 text-teal-200" />
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-black">
                    {activeModal === 'manual_create'
                      ? '✍️ Add Digital Clinical Record (Manual Intake)'
                      : `🩺 Doctor Consultation & EMR Edit: ${formData.patientName}`}
                  </h3>
                  <p className="text-xs text-teal-100">
                    {clinicProfile.clinicName} • Attending: Dr. {clinicProfile.doctorInCharge}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setActiveModal('none')}
                className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form Body */}
            <form onSubmit={handleSaveRecord} className="p-5 sm:p-6 overflow-y-auto space-y-6 text-xs sm:text-sm">
              {/* Section 1: Patient Demographics */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 pb-1.5 border-b border-slate-100">
                  <User className="w-4 h-4 text-teal-600" />
                  1. Patient Demographics & UHID
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1">Full Patient Name *</label>
                    <input
                      type="text"
                      required
                      value={formData.patientName || ''}
                      onChange={(e) => setFormData({ ...formData, patientName: e.target.value })}
                      placeholder="e.g. Ramesh Patel"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 text-xs font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Age (Years) *</label>
                    <input
                      type="number"
                      required
                      min={1}
                      max={120}
                      value={formData.age || 40}
                      onChange={(e) => setFormData({ ...formData, age: parseInt(e.target.value) || 40 })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 text-xs font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Gender *</label>
                    <select
                      value={formData.gender || 'Male'}
                      onChange={(e) => setFormData({ ...formData, gender: e.target.value as any })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 text-xs font-medium"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">UHID / Hospital No.</label>
                    <input
                      type="text"
                      value={formData.uhid || ''}
                      onChange={(e) => setFormData({ ...formData, uhid: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 text-xs font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number</label>
                    <input
                      type="text"
                      value={formData.phone || ''}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="e.g. +91 98765 43210"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 text-xs font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Village / City</label>
                    <input
                      type="text"
                      value={formData.villageCity || ''}
                      onChange={(e) => setFormData({ ...formData, villageCity: e.target.value })}
                      placeholder="e.g. Anand"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 text-xs font-medium"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Clinical Vitals */}
              <div className="space-y-3 pt-1">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 pb-1.5 border-b border-slate-100">
                  <Activity className="w-4 h-4 text-teal-600" />
                  2. Vital Signs & Measurements
                </h4>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Heart Rate (bpm)</label>
                    <input
                      type="number"
                      value={formData.vitals?.heartRate || 76}
                      onChange={(e) => handleVitalsChange('heartRate', parseInt(e.target.value) || 76)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">SpO2 Oxygen (%)</label>
                    <input
                      type="number"
                      value={formData.vitals?.oxygenSaturation || 98}
                      onChange={(e) => handleVitalsChange('oxygenSaturation', parseInt(e.target.value) || 98)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Blood Pressure (SBP/DBP)</label>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        placeholder="Sys"
                        value={formData.vitals?.systolicBp || 120}
                        onChange={(e) => handleVitalsChange('systolicBp', parseInt(e.target.value) || 120)}
                        className="w-1/2 px-2 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-xs"
                      />
                      <span className="text-slate-400 font-bold">/</span>
                      <input
                        type="number"
                        placeholder="Dia"
                        value={formData.vitals?.diastolicBp || 80}
                        onChange={(e) => handleVitalsChange('diastolicBp', parseInt(e.target.value) || 80)}
                        className="w-1/2 px-2 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Temperature (°C)</label>
                    <input
                      type="number"
                      step={0.1}
                      value={formData.vitals?.bodyTemperature || 37.0}
                      onChange={(e) => handleVitalsChange('bodyTemperature', parseFloat(e.target.value) || 37.0)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Height (cm)</label>
                    <input
                      type="number"
                      value={formData.vitals?.heightCm || 165}
                      onChange={(e) => handleVitalsChange('heightCm', parseInt(e.target.value) || 165)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Weight (kg)</label>
                    <input
                      type="number"
                      value={formData.vitals?.weightKg || 62}
                      onChange={(e) => handleVitalsChange('weightKg', parseInt(e.target.value) || 62)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Derived BMI</label>
                    <div className="px-3 py-2 bg-teal-50 border border-teal-200 rounded-xl font-black text-teal-800 text-xs">
                      {formData.vitals?.derivedBmi || 22.5} kg/m²
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 3: Chief Complaints & Symptoms */}
              <div className="space-y-3 pt-1">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 pb-1.5 border-b border-slate-100">
                  <FileText className="w-4 h-4 text-teal-600" />
                  3. Chief Complaint & Clinical Presentation
                </h4>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Chief Complaint *</label>
                  <input
                    type="text"
                    required
                    value={formData.chiefComplaint || ''}
                    onChange={(e) => setFormData({ ...formData, chiefComplaint: e.target.value })}
                    placeholder="e.g. Acute chest discomfort and shortness of breath for 2 days"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 text-xs font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Symptoms Checklist</label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={symptomInput}
                      onChange={(e) => setSymptomInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddSymptom(); }}}
                      placeholder="Type symptom (e.g. Dizziness, Chills) and click Add..."
                      className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                    />
                    <button
                      type="button"
                      onClick={handleAddSymptom}
                      className="px-3 py-1.5 bg-teal-800 text-white rounded-xl text-xs font-bold"
                    >
                      + Add Symptom
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {(formData.symptomsSummary || []).map((sym) => (
                      <span
                        key={sym}
                        className="bg-teal-50 text-teal-800 border border-teal-200 px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1"
                      >
                        {sym}
                        <button
                          type="button"
                          onClick={() => handleRemoveSymptom(sym)}
                          className="text-teal-600 hover:text-red-600 ml-1"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Section 4: Doctor's Assessment & Diagnosis */}
              <div className="space-y-3 pt-1">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 pb-1.5 border-b border-slate-100">
                  <Stethoscope className="w-4 h-4 text-teal-600" />
                  4. Doctor's Clinical Impression & Diagnosis
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Provisional Diagnosis</label>
                    <input
                      type="text"
                      value={formData.provisionalDiagnosis || ''}
                      onChange={(e) => setFormData({ ...formData, provisionalDiagnosis: e.target.value })}
                      placeholder="e.g. Upper Respiratory Tract Infection"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 text-xs font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Final Diagnosis</label>
                    <input
                      type="text"
                      value={formData.finalDiagnosis || ''}
                      onChange={(e) => setFormData({ ...formData, finalDiagnosis: e.target.value })}
                      placeholder="e.g. Acute Viral Bronchitis"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 text-xs font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Doctor's Clinical Notes / Examination Findings</label>
                  <textarea
                    rows={2}
                    value={formData.doctorNotes || ''}
                    onChange={(e) => setFormData({ ...formData, doctorNotes: e.target.value })}
                    placeholder="e.g. Chest clear on auscultation. Throat congested. Advised rest and hydration."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 text-xs font-medium"
                  />
                </div>
              </div>

              {/* Section 5: Digital Prescription Builder (Rx) */}
              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <Pill className="w-4 h-4 text-amber-600" />
                    5. Digital Prescription (Rx)
                  </h4>
                  <span className="text-[11px] text-slate-500 font-medium">Quick Template Presets</span>
                </div>

                {/* Quick Add Medicine Row */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                    <div className="sm:col-span-2">
                      <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Medicine Name</label>
                      <input
                        type="text"
                        value={newRx.medicineName}
                        onChange={(e) => setNewRx({ ...newRx, medicineName: e.target.value })}
                        placeholder="e.g. Paracetamol 500mg"
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Dosage / Form</label>
                      <input
                        type="text"
                        value={newRx.dosage}
                        onChange={(e) => setNewRx({ ...newRx, dosage: e.target.value })}
                        placeholder="e.g. 1 Tab"
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Timing</label>
                      <select
                        value={newRx.timing}
                        onChange={(e) => setNewRx({ ...newRx, timing: e.target.value as any })}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium"
                      >
                        <option value="1-0-1">1-0-1 (Morning-Night)</option>
                        <option value="1-1-1">1-1-1 (TID)</option>
                        <option value="1-0-0">1-0-0 (Morning)</option>
                        <option value="0-0-1">0-0-1 (Night)</option>
                        <option value="SOS">SOS (As needed)</option>
                        <option value="Once Daily">Once Daily</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-end">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Duration (Days)</label>
                      <input
                        type="number"
                        min={1}
                        max={90}
                        value={newRx.durationDays}
                        onChange={(e) => setNewRx({ ...newRx, durationDays: parseInt(e.target.value) || 5 })}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Food Instruction</label>
                      <select
                        value={newRx.foodInstruction}
                        onChange={(e) => setNewRx({ ...newRx, foodInstruction: e.target.value as any })}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium"
                      >
                        <option value="After Food">After Food</option>
                        <option value="Before Food">Before Food</option>
                        <option value="With Food">With Food</option>
                        <option value="Empty Stomach">Empty Stomach</option>
                      </select>
                    </div>

                    <button
                      type="button"
                      onClick={handleAddPrescription}
                      className="w-full py-1.5 bg-teal-800 hover:bg-teal-700 text-white font-bold rounded-lg text-xs transition"
                    >
                      + Add to Rx
                    </button>
                  </div>

                  {/* Common Medicine Quick Chips */}
                  <div className="flex flex-wrap gap-1.5 pt-1.5 border-t border-slate-200/60">
                    <span className="text-[10px] text-slate-500 font-bold self-center">Quick Add:</span>
                    {COMMON_MEDICINES.slice(0, 5).map((med) => (
                      <button
                        key={med.name}
                        type="button"
                        onClick={() => setNewRx({ ...newRx, medicineName: med.name, dosage: med.defaultDosage, timing: med.timing, foodInstruction: med.food })}
                        className="px-2 py-0.5 bg-white hover:bg-teal-50 border border-slate-200 hover:border-teal-300 rounded text-[10px] font-medium text-slate-700"
                      >
                        {med.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Prescriptions List Table */}
                {(formData.prescriptions || []).length > 0 && (
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 text-slate-600 text-[10px] font-bold">
                        <tr>
                          <th className="p-2">Medicine</th>
                          <th className="p-2">Dosage</th>
                          <th className="p-2">Timing</th>
                          <th className="p-2">Days</th>
                          <th className="p-2">Instruction</th>
                          <th className="p-2 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {formData.prescriptions?.map((rx, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="p-2 font-bold text-slate-800">{rx.medicineName}</td>
                            <td className="p-2">{rx.dosage}</td>
                            <td className="p-2 font-mono font-bold text-teal-800">{rx.timing}</td>
                            <td className="p-2">{rx.durationDays} days</td>
                            <td className="p-2 text-slate-600">{rx.foodInstruction}</td>
                            <td className="p-2 text-right">
                              <button
                                type="button"
                                onClick={() => handleRemovePrescription(idx)}
                                className="text-red-500 hover:text-red-700 p-1"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Section 6: Lab Investigations Ordered */}
              <div className="space-y-2 pt-1">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 pb-1.5 border-b border-slate-100">
                  <Activity className="w-4 h-4 text-cyan-600" />
                  6. Ordered Diagnostic & Lab Investigations
                </h4>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {LAB_INVESTIGATIONS_LIST.map((lab) => {
                    const isSelected = (formData.labInvestigations || []).includes(lab);
                    return (
                      <button
                        key={lab}
                        type="button"
                        onClick={() => handleToggleLab(lab)}
                        className={`px-3 py-2 rounded-xl text-xs font-medium text-left border transition flex items-center justify-between ${
                          isSelected
                            ? 'bg-teal-50 border-teal-500 text-teal-900 font-bold'
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        <span className="truncate">{lab}</span>
                        {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-teal-700 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Section 7: Encounter Status */}
              <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <label className="text-xs font-bold text-slate-700">Encounter Status:</label>
                  <select
                    value={formData.status || 'Completed'}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800"
                  >
                    <option value="Waiting Doctor">Waiting Doctor</option>
                    <option value="In Consultation">In Consultation</option>
                    <option value="Completed">Completed Consultation</option>
                    <option value="Referred">Referred to Higher Center</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveModal('none')}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 bg-teal-800 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-md transition cursor-pointer flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Save Digital Clinical Record</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Official Doctor Prescription Slip & Print View */}
      {activeModal === 'print_slip' && selectedRecord && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-white w-full max-w-2xl rounded-3xl border border-slate-200 shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
            {/* Action Bar */}
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2 text-xs font-bold">
                <Printer className="w-4 h-4 text-teal-300" />
                <span>Official Digital Clinical Slip Preview</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1.5 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-xl text-xs transition"
                >
                  Print Slip
                </button>
                <button
                  onClick={() => setActiveModal('none')}
                  className="p-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Printable Prescription Body */}
            <div className="p-6 sm:p-8 space-y-5 overflow-y-auto text-xs font-sans text-slate-800">
              {/* Header */}
              <div className="text-center pb-4 border-b-2 border-teal-800">
                <h3 className="text-lg font-black uppercase text-teal-900 tracking-tight">
                  {clinicProfile.clinicName}
                </h3>
                <p className="text-xs text-slate-600 font-medium mt-0.5">
                  {clinicProfile.address}, {clinicProfile.cityDistrict}, {clinicProfile.state} - {clinicProfile.pincode}
                </p>
                <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                  Reg No: <strong>{clinicProfile.facilityCode}</strong> • Dept: {clinicProfile.department} • Helpline: {clinicProfile.phone}
                </p>
              </div>

              {/* Patient Details Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px]">
                <div><strong>Patient:</strong> {selectedRecord.patientName}</div>
                <div><strong>Age/Sex:</strong> {selectedRecord.age}y / {selectedRecord.gender}</div>
                <div><strong>UHID:</strong> <span className="font-mono">{selectedRecord.uhid}</span></div>
                <div><strong>Date:</strong> {new Date(selectedRecord.encounterDate).toLocaleDateString()}</div>
              </div>

              {/* Vitals Summary */}
              <div className="flex flex-wrap items-center justify-between p-2.5 bg-teal-50/70 border border-teal-200 rounded-xl text-[11px]">
                <span><strong>Pulse:</strong> {selectedRecord.vitals?.heartRate} bpm</span>
                <span><strong>BP:</strong> {selectedRecord.vitals?.systolicBp}/{selectedRecord.vitals?.diastolicBp} mmHg</span>
                <span><strong>SpO2:</strong> {selectedRecord.vitals?.oxygenSaturation}%</span>
                <span><strong>Temp:</strong> {selectedRecord.vitals?.bodyTemperature} °C</span>
                <span><strong>BMI:</strong> {selectedRecord.vitals?.derivedBmi} kg/m²</span>
              </div>

              {/* Clinical Presentation & Diagnosis */}
              <div className="space-y-1.5">
                <p><strong>Chief Complaint:</strong> {selectedRecord.chiefComplaint}</p>
                {selectedRecord.finalDiagnosis && (
                  <p><strong>Final Diagnosis:</strong> <span className="font-bold text-teal-900">{selectedRecord.finalDiagnosis}</span></p>
                )}
                {selectedRecord.doctorNotes && (
                  <p><strong>Clinical Notes:</strong> {selectedRecord.doctorNotes}</p>
                )}
              </div>

              {/* Rx Prescription Table */}
              {(selectedRecord.prescriptions || []).length > 0 && (
                <div className="space-y-2 pt-2">
                  <h4 className="font-black text-slate-900 text-sm flex items-center gap-1.5 border-b pb-1">
                    <span>Rx (Prescriptions)</span>
                  </h4>
                  <table className="w-full text-left text-xs border border-slate-200 rounded-lg overflow-hidden">
                    <thead className="bg-slate-100 text-slate-700 text-[10px] uppercase font-bold">
                      <tr>
                        <th className="p-2">#</th>
                        <th className="p-2">Medicine Name</th>
                        <th className="p-2">Dosage</th>
                        <th className="p-2">Timing</th>
                        <th className="p-2">Days</th>
                        <th className="p-2">Instructions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedRecord.prescriptions.map((rx, idx) => (
                        <tr key={idx}>
                          <td className="p-2 font-mono text-slate-400">{idx + 1}</td>
                          <td className="p-2 font-bold text-slate-900">{rx.medicineName}</td>
                          <td className="p-2">{rx.dosage}</td>
                          <td className="p-2 font-mono font-bold text-teal-900">{rx.timing}</td>
                          <td className="p-2">{rx.durationDays} d</td>
                          <td className="p-2 text-slate-600">{rx.foodInstruction}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Ordered Lab Investigations */}
              {(selectedRecord.labInvestigations || []).length > 0 && (
                <div className="space-y-1 pt-1">
                  <h4 className="font-bold text-slate-800 text-xs">Advised Lab Tests:</h4>
                  <p className="text-slate-600">{selectedRecord.labInvestigations.join(', ')}</p>
                </div>
              )}

              {/* Signature Footer */}
              <div className="pt-8 flex justify-between items-end border-t border-slate-200 text-xs">
                <div>
                  <p className="font-bold text-slate-900">Dr. {clinicProfile.doctorInCharge}</p>
                  <p className="text-[10px] text-slate-500">{clinicProfile.doctorDegree}</p>
                  <p className="text-[10px] text-slate-400">Medical Officer In-Charge</p>
                </div>
                <div className="text-right">
                  <div className="w-28 h-10 border border-dashed border-slate-300 rounded mb-1 flex items-center justify-center text-[9px] text-slate-400">
                    Official Stamp
                  </div>
                  <span className="text-[10px] text-slate-500">Doctor's Signature & Seal</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
