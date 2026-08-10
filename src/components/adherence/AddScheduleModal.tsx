import React, { useState, useEffect } from 'react';
import { X, Plus, Pill, Calendar, Clock, User, Check, Search } from 'lucide-react';
import { db } from '../../db/db';
import { Patient, MedicationFrequency, LanguageCode } from '../../types';
import { createSchedule, getLocalDateString } from '../../engine/adherenceEngine';
import medicinesV2Data from '../../data/medicines_v2.json';

interface AddScheduleModalProps {
  initialPatientId?: number;
  initialMedicineName?: string;
  initialDosage?: string;
  currentLang: LanguageCode;
  onClose: () => void;
  onSaveSuccess: () => void;
}

export const AddScheduleModal: React.FC<AddScheduleModalProps> = ({
  initialPatientId,
  initialMedicineName = '',
  initialDosage = '1 tablet',
  currentLang,
  onClose,
  onSaveSuccess
}) => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<number | ''>(initialPatientId || '');
  const [medicineName, setMedicineName] = useState<string>(initialMedicineName);
  const [dosage, setDosage] = useState<string>(initialDosage);
  const [frequency, setFrequency] = useState<MedicationFrequency>('once_daily');
  const [customTimes, setCustomTimes] = useState<string[]>(['08:00']);
  const [startDate, setStartDate] = useState<string>(getLocalDateString());
  const [endDate, setEndDate] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  const [saving, setSaving] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Extract catalog of medicines from medicines_v2.json
  const [medicineCatalog, setMedicineCatalog] = useState<string[]>([]);
  const [medicineSearchTerm, setMedicineSearchTerm] = useState<string>(initialMedicineName);
  const [showMedDropdown, setShowMedDropdown] = useState<boolean>(false);

  useEffect(() => {
    loadPatientsAndMeds();
  }, []);

  const loadPatientsAndMeds = async () => {
    const list = await db.patients.toArray();
    setPatients(list);
    if (!selectedPatientId && list.length > 0) {
      setSelectedPatientId(list[0].id!);
    }

    // Process unique medicine names
    const namesSet = new Set<string>();
    const allData = medicinesV2Data as Record<string, any>;
    Object.values(allData).forEach((diseaseMeds: any) => {
      ['allopathy', 'ayurveda', 'homeopathy'].forEach((sys) => {
        if (Array.isArray(diseaseMeds[sys])) {
          diseaseMeds[sys].forEach((m: any) => {
            if (m.name?.en) namesSet.add(m.name.en);
            if (m.name?.hi) namesSet.add(m.name.hi);
            if (m.name?.gu) namesSet.add(m.name.gu);
          });
        }
      });
    });

    // Add common chronic illness DOT medicines (TB, Hypertension, Diabetes)
    const chronicMeds = [
      'Rifampicin + Isoniazid (DOTS TB)',
      'Ethambutol + Pyrazinamide (TB Phase)',
      'Amlodipine 5mg (Hypertension)',
      'Telmisartan 40mg (Hypertension)',
      'Metformin 500mg (Diabetes)',
      'Glibenclamide 5mg (Diabetes)',
      'Sodium Valproate (Epilepsy)',
      'Iron + Folic Acid (Anemia)'
    ];
    chronicMeds.forEach((m) => namesSet.add(m));

    setMedicineCatalog(Array.from(namesSet));
  };

  const handleFrequencyChange = (freq: MedicationFrequency) => {
    setFrequency(freq);
    if (freq === 'twice_daily') {
      setCustomTimes(['08:00', '20:00']);
    } else if (freq === 'custom') {
      setCustomTimes(['08:00', '14:00', '20:00']);
    } else {
      setCustomTimes(['08:00']);
    }
  };

  const handleTimeChange = (idx: number, val: string) => {
    const updated = [...customTimes];
    updated[idx] = val;
    setCustomTimes(updated);
  };

  const handleAddTime = () => {
    setCustomTimes([...customTimes, '12:00']);
  };

  const handleRemoveTime = (idx: number) => {
    if (customTimes.length <= 1) return;
    setCustomTimes(customTimes.filter((_, i) => i !== idx));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatientId) {
      setErrorMsg('Please select a patient.');
      return;
    }
    const finalMedName = medicineName.trim() || medicineSearchTerm.trim();
    if (!finalMedName) {
      setErrorMsg('Please specify or select a medicine name.');
      return;
    }

    setSaving(true);
    setErrorMsg(null);

    try {
      await createSchedule({
        patientId: Number(selectedPatientId),
        medicineName: finalMedName,
        dosage: dosage.trim() || '1 tablet',
        frequency,
        customTimes,
        startDate,
        endDate: endDate ? endDate : null,
        notes: notes.trim(),
        active: true
      });

      onSaveSuccess();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save medication schedule.');
    } finally {
      setSaving(false);
    }
  };

  const filteredMeds = medicineCatalog.filter((m) =>
    m.toLowerCase().includes(medicineSearchTerm.toLowerCase())
  );

  const labels = {
    title: currentLang === 'gu' ? 'નવું સમયપત્રક ઉમેરો (DOT)' : currentLang === 'hi' ? 'नई दवा अनुसूची जोड़ें (DOT)' : 'Setup DOT Medication Schedule',
    subtitle: currentLang === 'gu' ? 'દીર્ઘકાલીન રોગો અને દવા પાલન માટે સમયપત્રક ગોઠવો' : currentLang === 'hi' ? 'पुराणी बीमारियों और खुराक के लिए समय सारिणी' : 'Set up dosage schedules for chronic conditions (TB, BP, Diabetes, Epilepsy)',
    patient: currentLang === 'gu' ? 'દર્દી પસંદ કરો:' : currentLang === 'hi' ? 'रोगी चुनें:' : 'Select Patient:',
    medicine: currentLang === 'gu' ? 'દવાનું નામ:' : currentLang === 'hi' ? 'दवा का नाम:' : 'Medicine Name:',
    dosage: currentLang === 'gu' ? 'ડોઝ / પ્રમાણ:' : currentLang === 'hi' ? 'खुराक / मात्रा:' : 'Dosage Amount:',
    frequency: currentLang === 'gu' ? 'સમયપત્રક આવૃત્તિ:' : currentLang === 'hi' ? 'खुराक आवृत्ति:' : 'Dosing Frequency:',
    times: currentLang === 'gu' ? 'દવા લેવાનો સમય:' : currentLang === 'hi' ? 'दवा लेने का समय:' : 'Scheduled Dose Times:',
    startDate: currentLang === 'gu' ? 'શરૂઆત તારીખ:' : currentLang === 'hi' ? 'प्रारंभ तिथि:' : 'Start Date:',
    endDate: currentLang === 'gu' ? 'અંતિમ તારીખ (વૈકલ્પિક):' : currentLang === 'hi' ? 'समाप्ति तिथि (वैकल्पिक):' : 'End Date (Optional):',
    notes: currentLang === 'gu' ? 'નોંધ / સૂચના:' : currentLang === 'hi' ? 'नोट्स / निर्देश:' : 'Notes / Instructions:',
    saveBtn: currentLang === 'gu' ? 'સમયપત્રક સાચવો' : currentLang === 'hi' ? 'अनुसूची सहेजें' : 'Save Schedule & Generate Doses'
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-6 space-y-5 shadow-2xl border border-slate-200 relative my-auto animate-in fade-in zoom-in-95">
        
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-emerald-100 text-emerald-800 rounded-2xl border border-emerald-300">
              <Pill className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-extrabold text-base sm:text-lg text-slate-900 font-display">
                {labels.title}
              </h3>
              <p className="text-xs text-slate-500 font-medium">{labels.subtitle}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-medium">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4 text-xs font-sans">
          {/* Patient Selection */}
          <div>
            <label className="font-bold text-slate-700 block mb-1">{labels.patient}</label>
            <select
              value={selectedPatientId}
              onChange={(e) => setSelectedPatientId(Number(e.target.value))}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800 focus:outline-none focus:border-emerald-600"
            >
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.age} yrs, {p.gender}, {p.village || 'Local Village'})
                </option>
              ))}
            </select>
          </div>

          {/* Medicine Searchable Dropdown */}
          <div className="relative">
            <label className="font-bold text-slate-700 block mb-1">{labels.medicine}</label>
            <div className="relative">
              <input
                type="text"
                value={medicineSearchTerm}
                onChange={(e) => {
                  setMedicineSearchTerm(e.target.value);
                  setMedicineName(e.target.value);
                  setShowMedDropdown(true);
                }}
                onFocus={() => setShowMedDropdown(true)}
                placeholder="Type or search medicine e.g. Rifampicin, Metformin..."
                className="w-full px-3 py-2.5 pr-8 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-emerald-600"
              />
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
            </div>

            {showMedDropdown && filteredMeds.length > 0 && (
              <div className="absolute z-20 left-0 right-0 mt-1 max-h-40 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-lg divide-y divide-slate-100">
                {filteredMeds.slice(0, 10).map((m, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setMedicineName(m);
                      setMedicineSearchTerm(m);
                      setShowMedDropdown(false);
                    }}
                    className="w-full text-left px-3 py-2 text-xs text-slate-800 hover:bg-emerald-50 hover:text-emerald-900 transition font-medium"
                  >
                    {m}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Dosage & Frequency */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">{labels.dosage}</label>
              <input
                type="text"
                value={dosage}
                onChange={(e) => setDosage(e.target.value)}
                placeholder="e.g. 1 tablet, 5 ml, 2 capsules"
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-800 focus:outline-none focus:border-emerald-600"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">{labels.frequency}</label>
              <select
                value={frequency}
                onChange={(e) => handleFrequencyChange(e.target.value as MedicationFrequency)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800 focus:outline-none focus:border-emerald-600"
              >
                <option value="once_daily">Once Daily (08:00)</option>
                <option value="twice_daily">Twice Daily (08:00, 20:00)</option>
                <option value="every_other_day">Every Other Day</option>
                <option value="weekly">Weekly</option>
                <option value="custom">Custom Schedule</option>
              </select>
            </div>
          </div>

          {/* Times */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-bold text-slate-700 block">{labels.times}</label>
              <span className="text-[10px] text-slate-500 font-medium">
                {currentLang === 'gu'
                  ? 'દર્દીની અનુકૂળતા મુજબ સમય બદલો અથવા ઉમેરો'
                  : currentLang === 'hi'
                  ? 'रोगी की पसंद के अनुसार समय बदलें या जोड़ें'
                  : 'Adjust or add dosage times according to preference'}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2 mb-2">
              {customTimes.map((tm, idx) => (
                <div key={idx} className="flex items-center gap-1.5 bg-slate-100 p-2 rounded-xl border border-slate-200">
                  <Clock className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                  <input
                    type="time"
                    value={tm}
                    onChange={(e) => handleTimeChange(idx, e.target.value)}
                    className="bg-transparent font-bold text-slate-900 focus:outline-none text-xs cursor-pointer"
                  />
                  {customTimes.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveTime(idx)}
                      className="text-slate-400 hover:text-red-600 p-0.5 cursor-pointer rounded-md hover:bg-slate-200 transition"
                      title="Remove time"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}

              <button
                type="button"
                onClick={() => {
                  handleAddTime();
                  if (frequency !== 'custom' && customTimes.length >= 2) {
                    setFrequency('custom');
                  }
                }}
                className="px-3 py-2 bg-emerald-50 text-emerald-800 font-extrabold border border-emerald-200 rounded-xl text-xs hover:bg-emerald-100 transition cursor-pointer flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>
                  {currentLang === 'gu' ? '+ બીજો સમય ઉમેરો' : currentLang === 'hi' ? '+ नया समय जोड़ें' : '+ Add Dose Time'}
                </span>
              </button>
            </div>

            {/* Quick Time Presets */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                {currentLang === 'gu' ? 'ઝડપી સમય:' : currentLang === 'hi' ? 'त्वरित समय:' : 'Quick Time:'}
              </span>
              {[
                { label: currentLang === 'gu' ? 'સવાર (08:00 AM)' : currentLang === 'hi' ? 'सुबह (08:00 AM)' : 'Morning (08:00 AM)', time: '08:00' },
                { label: currentLang === 'gu' ? 'બપોર (01:00 PM)' : currentLang === 'hi' ? 'दोपहर (01:00 PM)' : 'Afternoon (01:00 PM)', time: '13:00' },
                { label: currentLang === 'gu' ? 'સાંજ (06:00 PM)' : currentLang === 'hi' ? 'शाम (06:00 PM)' : 'Evening (06:00 PM)', time: '18:00' },
                { label: currentLang === 'gu' ? 'રાત (09:00 PM)' : currentLang === 'hi' ? 'रात (09:00 PM)' : 'Night (09:00 PM)', time: '21:00' }
              ].map((p, pIdx) => (
                <button
                  key={pIdx}
                  type="button"
                  onClick={() => {
                    if (!customTimes.includes(p.time)) {
                      const updated = [...customTimes, p.time].sort();
                      setCustomTimes(updated);
                      if (updated.length > 2) setFrequency('custom');
                    }
                  }}
                  className="px-2 py-0.5 bg-slate-100 hover:bg-emerald-100 text-slate-700 hover:text-emerald-900 rounded-md text-[10px] font-bold transition cursor-pointer"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">{labels.startDate}</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-800 focus:outline-none focus:border-emerald-600"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">{labels.endDate}</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-800 focus:outline-none focus:border-emerald-600"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="font-bold text-slate-700 block mb-1">{labels.notes}</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Take after food with warm water"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-800 focus:outline-none focus:border-emerald-600"
            />
          </div>

          {/* Submit */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold rounded-xl shadow-sm transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>{saving ? 'Saving...' : labels.saveBtn}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
