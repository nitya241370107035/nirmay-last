import React, { useState, useEffect } from 'react';
import {
  FileText,
  Search,
  PlusCircle,
  User,
  Activity,
  Heart,
  Thermometer,
  Percent,
  Edit3,
  CheckCircle2,
  Clock,
  Trash2,
  Building2,
  RefreshCw,
  Eye,
  ArrowRight,
  Filter,
  X
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { db, saveClinicRecord, updateClinicRecord, searchClinicRecords } from '../../db/db';
import { ClinicRecord, ClinicRecordVitals, LanguageCode } from '../../types';
import { getTranslations } from '../../utils/translations';
import { ClinicProfile } from './ClinicLogin';

interface EMRRecordsStationProps {
  clinicProfile: ClinicProfile;
  onSendToDoctorConsultation?: (record: ClinicRecord) => void;
}

export function EMRRecordsStation({
  clinicProfile,
  onSendToDoctorConsultation
}: EMRRecordsStationProps) {
  const { i18n } = useTranslation();
  const currentLang = (i18n.language || 'en') as LanguageCode;
  const t = getTranslations(currentLang);

  const [records, setRecords] = useState<ClinicRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterSource, setFilterSource] = useState<string>('all');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Modal States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [selectedRecord, setSelectedRecord] = useState<ClinicRecord | null>(null);

  // Form State for EMR Entry
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
    status: 'Waiting Doctor',
    attendingDoctor: clinicProfile.doctorInCharge,
    doctorDegree: clinicProfile.doctorDegree,
    entrySource: 'manual_entry'
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
      console.error('Error loading EMR records:', err);
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

  const openNewRecordModal = () => {
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
      status: 'Waiting Doctor',
      attendingDoctor: clinicProfile.doctorInCharge,
      doctorDegree: clinicProfile.doctorDegree,
      entrySource: 'manual_entry',
      encounterDate: new Date().toISOString(),
      prescriptions: [],
      labInvestigations: []
    });
    setIsCreateModalOpen(true);
  };

  const openEditRecordModal = (rec: ClinicRecord) => {
    setSelectedRecord(rec);
    setFormData({ ...rec });
    setIsEditModalOpen(true);
  };

  const handleVitalsChange = (field: keyof ClinicRecordVitals, value: number) => {
    const currentVitals = (formData.vitals || {}) as ClinicRecordVitals;
    const updated = { ...currentVitals, [field]: value };
    
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

  const handleSaveEMR = async (e: React.FormEvent) => {
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
      chiefComplaint: formData.chiefComplaint || 'General OPD Consultation',
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
      status: formData.status || 'Waiting Doctor',
      attendingDoctor: formData.attendingDoctor || clinicProfile.doctorInCharge,
      doctorDegree: formData.doctorDegree || clinicProfile.doctorDegree,
      createdAt: formData.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (isEditModalOpen && selectedRecord?.id) {
      await updateClinicRecord(selectedRecord.id, payload);
    } else {
      await saveClinicRecord(payload);
    }

    setIsCreateModalOpen(false);
    setIsEditModalOpen(false);
    setSelectedRecord(null);
    await loadRecords();
  };

  const filteredRecords = records.filter((rec) => {
    if (filterSource === 'all') return true;
    if (filterSource === 'manual') return rec.entrySource === 'manual_entry';
    if (filterSource === 'triage') return rec.entrySource === 'triage_ml';
    if (filterSource === 'appointment') return rec.entrySource === 'appointment';
    return true;
  });

  return (
    <div className="space-y-6 font-sans text-slate-800">
      {/* Top Banner */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase font-extrabold tracking-widest text-teal-800 bg-teal-100/80 px-2.5 py-0.5 rounded-full">
              EMR Intake & Registry
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs font-semibold text-slate-600 font-mono">
              {clinicProfile.clinicName} ({clinicProfile.facilityCode})
            </span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
            {t.emrIntakeTitle}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {t.emrIntakeSubtitle}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={openNewRecordModal}
            className="px-4 py-2.5 bg-gradient-to-r from-teal-700 to-teal-800 hover:from-teal-600 hover:to-teal-700 text-white rounded-2xl text-xs sm:text-sm font-bold shadow-md transition flex items-center gap-2 cursor-pointer active:scale-95"
          >
            <PlusCircle className="w-4 h-4" />
            <span>{t.addPatientRecordManual}</span>
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
            placeholder={t.searchRecordsPlaceholder}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium focus:ring-2 focus:ring-teal-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
          {[
            { id: 'all', label: `${t.allRecords} (${records.length})` },
            { id: 'manual', label: t.sourceManual },
            { id: 'triage', label: t.sourceMLTriage },
            { id: 'appointment', label: t.sourceOnlineBooking }
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFilterSource(f.id)}
              className={`px-3 py-1.5 rounded-xl font-bold transition shrink-0 cursor-pointer ${
                filterSource === f.id
                  ? 'bg-teal-800 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* EMR Records List Table */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-slate-400 text-xs space-y-2">
            <Activity className="w-8 h-8 text-teal-600 animate-spin mx-auto" />
            <p>Loading digital EMR records...</p>
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="p-12 text-center text-slate-500 space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-teal-50 text-teal-700 border border-teal-200 flex items-center justify-center mx-auto">
              <FileText className="w-7 h-7" />
            </div>
            <div>
              <h4 className="font-bold text-slate-800 text-base">No EMR Records Found</h4>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                No patient clinical records match your search or filter.
              </p>
            </div>
            <button
              onClick={openNewRecordModal}
              className="px-4 py-2 bg-teal-800 text-white rounded-xl text-xs font-bold shadow hover:bg-teal-700 transition"
            >
              + Create First EMR Record
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50/80 text-slate-500 uppercase tracking-wider text-[10px] font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-4">Patient Demographics</th>
                  <th className="py-3.5 px-4">Source & Date</th>
                  <th className="py-3.5 px-4">Chief Complaint & Vitals</th>
                  <th className="py-3.5 px-4">Doctor Status</th>
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
                        {rec.uhid} • {rec.age}y / {rec.gender} • {rec.phone || 'No phone'}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="text-slate-600 font-medium">
                        {new Date(rec.encounterDate).toLocaleDateString()}
                      </div>
                      <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full border mt-1 bg-slate-100 text-slate-700 border-slate-200">
                        {rec.entrySource === 'triage_ml' ? 'ML Triage' : rec.entrySource === 'appointment' ? 'Online Booking' : 'Manual Intake'}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-800">
                        {rec.chiefComplaint}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono flex items-center gap-2 mt-0.5">
                        <span>BP: <strong>{rec.vitals?.systolicBp}/{rec.vitals?.diastolicBp}</strong></span>
                        <span>SpO2: <strong>{rec.vitals?.oxygenSaturation}%</strong></span>
                        <span>HR: <strong>{rec.vitals?.heartRate}</strong></span>
                        <span>BMI: <strong>{rec.vitals?.derivedBmi}</strong></span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full ${
                        rec.status === 'Completed'
                          ? 'bg-emerald-100 text-emerald-800'
                          : rec.status === 'In Consultation'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {rec.status === 'Completed' && <CheckCircle2 className="w-3 h-3" />}
                        {rec.status === 'Waiting Doctor' && <Clock className="w-3 h-3" />}
                        {rec.status}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditRecordModal(rec)}
                          className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
                          title="Edit Clinical Intake / Vitals"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>

                        {onSendToDoctorConsultation && (
                          <button
                            onClick={() => onSendToDoctorConsultation(rec)}
                            className="px-3 py-1.5 bg-teal-800 hover:bg-teal-700 text-white rounded-lg text-xs font-bold shadow-xs flex items-center gap-1 transition cursor-pointer"
                            title="Open in Doctor Consultation Room"
                          >
                            <span>Send to Doctor</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CREATE & EDIT EMR RECORD MODAL */}
      {(isCreateModalOpen || isEditModalOpen) && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto font-sans">
          <div className="bg-white w-full max-w-3xl rounded-3xl border border-slate-200 shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col text-slate-800">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-teal-900 via-teal-800 to-cyan-900 text-white p-5 sm:p-6 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-white/15 rounded-xl border border-white/20">
                  <FileText className="w-6 h-6 text-teal-200" />
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-black">
                    {isCreateModalOpen ? 'Add Digital Clinical Record (EMR)' : `Edit Clinical Record: ${formData.patientName}`}
                  </h3>
                  <p className="text-xs text-teal-100">
                    {clinicProfile.clinicName} • Intake & Vitals Station
                  </p>
                </div>
              </div>

              <button
                onClick={() => { setIsCreateModalOpen(false); setIsEditModalOpen(false); }}
                className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveEMR} className="p-5 sm:p-6 overflow-y-auto space-y-5 text-xs sm:text-sm">
              {/* 1. Patient Info */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 pb-1.5 border-b border-slate-100">
                  <User className="w-4 h-4 text-teal-600" />
                  1. Patient Demographics
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1">Patient Full Name *</label>
                    <input
                      type="text"
                      required
                      value={formData.patientName || ''}
                      onChange={(e) => setFormData({ ...formData, patientName: e.target.value })}
                      placeholder="e.g. Anandbhai Patel"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Age *</label>
                    <input
                      type="number"
                      required
                      min={1}
                      max={120}
                      value={formData.age || 40}
                      onChange={(e) => setFormData({ ...formData, age: parseInt(e.target.value) || 40 })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Gender *</label>
                    <select
                      value={formData.gender || 'Male'}
                      onChange={(e) => setFormData({ ...formData, gender: e.target.value as any })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium text-xs"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">UHID / Hospital ID</label>
                    <input
                      type="text"
                      value={formData.uhid || ''}
                      onChange={(e) => setFormData({ ...formData, uhid: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number</label>
                    <input
                      type="tel"
                      value={formData.phone || ''}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+91 98765 43210"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Village / District</label>
                    <input
                      type="text"
                      value={formData.villageCity || ''}
                      onChange={(e) => setFormData({ ...formData, villageCity: e.target.value })}
                      placeholder="e.g. Anand"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* 2. Mandatory Vitals */}
              <div className="space-y-3 pt-1">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 pb-1.5 border-b border-slate-100">
                  <Activity className="w-4 h-4 text-teal-600" />
                  2. Mandatory Clinical Vitals & Physical Signs
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
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">BP (SBP / DBP mmHg)</label>
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
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Body Temp (°C)</label>
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

              {/* 3. Chief Complaint & Symptoms */}
              <div className="space-y-3 pt-1">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 pb-1.5 border-b border-slate-100">
                  <FileText className="w-4 h-4 text-teal-600" />
                  3. Chief Complaint & Presenting Symptoms
                </h4>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Chief Complaint *</label>
                  <input
                    type="text"
                    required
                    value={formData.chiefComplaint || ''}
                    onChange={(e) => setFormData({ ...formData, chiefComplaint: e.target.value })}
                    placeholder="e.g. High fever with chills, body ache and severe cough for 3 days"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Confirmed Symptoms</label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={symptomInput}
                      onChange={(e) => setSymptomInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddSymptom(); }}}
                      placeholder="Type symptom (e.g. Dizziness, Chest tight) and click Add..."
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

              {/* Submit Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => { setIsCreateModalOpen(false); setIsEditModalOpen(false); }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-teal-800 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-md transition cursor-pointer flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Save to Digital EMR</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
