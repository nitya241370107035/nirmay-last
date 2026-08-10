import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ShieldAlert,
  AlertTriangle,
  Pill,
  Plus,
  X,
  CheckCircle2,
  Save,
  User,
  Info
} from 'lucide-react';
import { Patient, PatientCurrentMed, LanguageCode } from '../types';
import allergyMapData from '../data/allergy_medicine_map.json';
import medicinesV2Data from '../data/medicines_v2.json';
import { updatePatientMedicalProfile } from '../db/db';

interface MedicalProfileEditorProps {
  patient: Patient;
  onSave?: (updatedPatient: Patient) => void;
  onClose?: () => void;
}

const ALLERGY_MAP = allergyMapData as Record<
  string,
  {
    allergy_name: Record<string, string>;
    contraindicated_medicines: string[];
  }
>;

// Common medications patients might currently be taking
const COMMON_PRESET_MEDS = [
  { id: 'metformin_500', name: 'Metformin 500mg (Diabetes)', defaultFreq: 'Twice daily' },
  { id: 'alcohol', name: 'Alcohol / Substance Use', defaultFreq: 'Regular' },
  { id: 'warfarin', name: 'Warfarin (Blood Thinner)', defaultFreq: 'Once daily' },
  { id: 'enalapril', name: 'Enalapril / BP Meds', defaultFreq: 'Once daily' },
  { id: 'insulin', name: 'Insulin Therapy', defaultFreq: 'Before meals' },
  { id: 'glimepiride', name: 'Glimepiride (Sugar)', defaultFreq: 'Morning' },
  { id: 'aspirin_75', name: 'Aspirin 75mg (Low Dose)', defaultFreq: 'Once daily' },
  { id: 'codeine_syrup', name: 'Codeine Cough Syrup', defaultFreq: 'As needed' },
  { id: 'allopurinol', name: 'Allopurinol (Gout)', defaultFreq: 'Once daily' },
  { id: 'furosemide', name: 'Furosemide (Water Pill)', defaultFreq: 'Morning' },
  { id: 'ibuprofen_400', name: 'Ibuprofen 400mg', defaultFreq: 'As needed' },
  { id: 'paracetamol_500', name: 'Paracetamol 500mg', defaultFreq: '3 times daily' }
];

export const MedicalProfileEditor: React.FC<MedicalProfileEditorProps> = ({
  patient,
  onSave,
  onClose
}) => {
  const { i18n } = useTranslation();
  const currentLang = (i18n.language || 'en') as LanguageCode;

  const [allergies, setAllergies] = useState<string[]>(patient.allergies || []);
  const [currentMeds, setCurrentMeds] = useState<PatientCurrentMed[]>(patient.currentMeds || []);

  const [customMedName, setCustomMedName] = useState('');
  const [customMedFreq, setCustomMedFreq] = useState('Once daily');

  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const toggleAllergy = (allergyKey: string) => {
    if (allergies.includes(allergyKey)) {
      setAllergies(allergies.filter((a) => a !== allergyKey));
    } else {
      setAllergies([...allergies, allergyKey]);
    }
  };

  const handleAddCurrentMed = (medId: string, name: string, freq: string = 'Once daily') => {
    if (currentMeds.some((m) => m.medId === medId)) return;
    const newMed: PatientCurrentMed = {
      medId,
      name,
      frequency: freq
    };
    setCurrentMeds([...currentMeds, newMed]);
  };

  const handleAddCustomMed = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customMedName.trim()) return;
    const cleanId = customMedName.trim().toLowerCase().replace(/\s+/g, '_');
    handleAddCurrentMed(cleanId, customMedName.trim(), customMedFreq);
    setCustomMedName('');
  };

  const handleRemoveCurrentMed = (medId: string) => {
    setCurrentMeds(currentMeds.filter((m) => m.medId !== medId));
  };

  const handleSave = async () => {
    if (!patient.id) return;
    setIsSaving(true);
    try {
      await updatePatientMedicalProfile(patient.id, allergies, currentMeds);
      const updatedPatient: Patient = {
        ...patient,
        allergies,
        currentMeds
      };
      setSavedSuccess(true);
      setTimeout(() => {
        setSavedSuccess(false);
        if (onSave) onSave(updatedPatient);
        if (onClose) onClose();
      }, 1000);
    } catch (err) {
      console.error('Failed to update medical profile', err);
    } finally {
      setIsSaving(false);
    }
  };

  const titles = {
    header:
      currentLang === 'gu'
        ? 'દર્દી સુરક્ષા અને મેડિકલ પ્રોફાઇલ'
        : currentLang === 'hi'
        ? 'रोगी सुरक्षा एवं मेडिकल प्रोफाइल'
        : 'Patient Safety & Medical Profile',
    subHeader:
      currentLang === 'gu'
        ? 'એલર્જી અને વર્તમાન દવાઓની નોંધણી'
        : currentLang === 'hi'
        ? 'एलर्जी और वर्तमान दवाओं का विवरण'
        : 'Record Known Allergies & Active Current Medications',
    allergiesTitle:
      currentLang === 'gu'
        ? 'જાણીતી એલર્જી (Known Allergies)'
        : currentLang === 'hi'
        ? 'ज्ञात एलर्जी (Known Allergies)'
        : 'Known Allergies & Hypersensitivities',
    currentMedsTitle:
      currentLang === 'gu'
        ? 'વર્તમાન દવાઓ (Current Medications)'
        : currentLang === 'hi'
        ? 'वर्तमान दवाएं (Current Medications)'
        : 'Current Medications & Substances Taken',
    addMedLabel:
      currentLang === 'gu'
        ? 'અન્ય દવા ઉમેરો'
        : currentLang === 'hi'
        ? 'अन्य दवा जोड़ें'
        : 'Add Custom Medicine / Substance',
    saveBtn:
      currentLang === 'gu'
        ? 'પ્રોફાઇલ સાચવો (IndexedDB)'
        : currentLang === 'hi'
        ? 'प्रोफाइल सहेजें (IndexedDB)'
        : 'SAVE SAFETY PROFILE TO EMR'
  };

  return (
    <div className="bg-white rounded-2xl border border-[#DDE3E2] shadow-card overflow-hidden font-sans">
      {/* HEADER */}
      <div className="bg-[#1B4D4A] text-white p-4 sm:p-5 flex items-center justify-between border-b border-[#2E7D73]/30">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#2E7D73] rounded-xl text-[#B2DFD8]">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-base sm:text-lg text-white font-display">
              {titles.header}
            </h3>
            <p className="text-xs text-[#B2DFD8] font-mono">
              Patient: {patient.name} ({patient.age} Yrs, {patient.gender})
            </p>
          </div>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#B2DFD8] hover:text-white hover:bg-[#2E7D73]"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      <div className="p-4 sm:p-6 space-y-6 font-sans">
        {/* SECTION 1: ALLERGIES */}
        <div className="space-y-3">
          <div className="flex items-center justify-between border-b border-[#DDE3E2] pb-2">
            <h4 className="font-bold text-sm text-[#1B4D4A] flex items-center gap-2 font-display">
              <AlertTriangle className="w-4 h-4 text-[#C46A3A]" />
              <span>{titles.allergiesTitle}</span>
            </h4>
            <span className="text-[10px] font-mono font-bold text-[#5F6D6C] uppercase bg-[#EDF1F0] px-2 py-0.5 rounded-md">
              {allergies.length} Selected
            </span>
          </div>

          <p className="text-xs text-[#5F6D6C] leading-relaxed">
            Tap standard allergy flags to toggle safety restrictions for this patient:
          </p>

          <div className="flex flex-wrap gap-2">
            {Object.entries(ALLERGY_MAP).map(([key, item]) => {
              const isSelected = allergies.includes(key);
              const allergyName = item.allergy_name[currentLang] || item.allergy_name['en'];

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => toggleAllergy(key)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    isSelected
                      ? 'bg-[#C46A3A] text-white shadow-xs border border-[#C46A3A]'
                      : 'bg-[#F4F7F6] text-[#1B4D4A] hover:bg-[#EDF1F0] border border-[#DDE3E2]'
                  }`}
                >
                  {isSelected ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                  ) : (
                    <Plus className="w-3.5 h-3.5 text-[#2E7D73]" />
                  )}
                  <span>{allergyName}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* SECTION 2: CURRENT MEDICATIONS */}
        <div className="space-y-3">
          <div className="flex items-center justify-between border-b border-[#DDE3E2] pb-2">
            <h4 className="font-bold text-sm text-[#1B4D4A] flex items-center gap-2 font-display">
              <Pill className="w-4 h-4 text-[#2E7D73]" />
              <span>{titles.currentMedsTitle}</span>
            </h4>
            <span className="text-[10px] font-mono font-bold text-[#5F6D6C] uppercase bg-[#EDF1F0] px-2 py-0.5 rounded-md">
              {currentMeds.length} Active
            </span>
          </div>

          {/* ACTIVE CURRENT MEDS BADGES */}
          {currentMeds.length > 0 ? (
            <div className="space-y-2">
              {currentMeds.map((m) => (
                <div
                  key={m.medId}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-[#F4F7F6] border border-[#DDE3E2] text-xs"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[#2E7D73]" />
                    <span className="font-bold text-[#1B4D4A]">{m.name || m.medId}</span>
                    {m.frequency && (
                      <span className="text-[10px] bg-white border border-[#DDE3E2] text-[#5F6D6C] px-2 py-0.5 rounded-md font-mono">
                        {m.frequency}
                      </span>
                    )}
                  </div>

                  <button
                    onClick={() => handleRemoveCurrentMed(m.medId)}
                    className="p-1 text-[#5F6D6C] hover:text-[#B71C1C] rounded-lg transition"
                    title="Remove medicine"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-[#F4F7F6] border border-[#DDE3E2] text-xs text-[#5F6D6C] italic text-center">
              No current medications recorded for this patient.
            </div>
          )}

          {/* QUICK ADD PRESETS */}
          <div className="space-y-2 pt-2">
            <p className="text-[11px] font-bold text-[#1B4D4A] uppercase tracking-wider">
              Quick Add Common Medications:
            </p>
            <div className="flex flex-wrap gap-1.5">
              {COMMON_PRESET_MEDS.map((preset) => {
                const isAdded = currentMeds.some((m) => m.medId === preset.id);
                if (isAdded) return null;

                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleAddCurrentMed(preset.id, preset.name, preset.defaultFreq)}
                    className="px-2.5 py-1 rounded-lg bg-white hover:bg-[#EDF1F0] text-[#1B4D4A] border border-[#DDE3E2] text-[11px] font-medium flex items-center gap-1 transition cursor-pointer shadow-2xs"
                  >
                    <Plus className="w-3 h-3 text-[#2E7D73]" />
                    <span>{preset.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ADD CUSTOM MEDICATION FORM */}
          <form onSubmit={handleAddCustomMed} className="pt-2 flex items-center gap-2">
            <input
              type="text"
              value={customMedName}
              onChange={(e) => setCustomMedName(e.target.value)}
              placeholder="e.g. Ciprofloxacin or Herbal Remedy"
              className="flex-1 p-2 bg-[#F4F7F6] border border-[#DDE3E2] rounded-xl text-xs font-medium text-[#1A2B2B] focus:border-[#2E7D73] focus:outline-none"
            />
            <select
              value={customMedFreq}
              onChange={(e) => setCustomMedFreq(e.target.value)}
              className="p-2 bg-[#F4F7F6] border border-[#DDE3E2] rounded-xl text-xs font-medium text-[#1A2B2B] focus:border-[#2E7D73] focus:outline-none"
            >
              <option value="Once daily">Once daily</option>
              <option value="Twice daily">Twice daily</option>
              <option value="3 times daily">3 times daily</option>
              <option value="At bedtime">At bedtime</option>
              <option value="As needed">As needed</option>
            </select>
            <button
              type="submit"
              className="px-3 py-2 bg-[#2E7D73] hover:bg-[#1B4D4A] text-white font-bold text-xs rounded-xl transition flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add</span>
            </button>
          </form>
        </div>

        {/* SAVE BUTTON */}
        <div className="pt-2 border-t border-[#DDE3E2]">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className={`w-full py-3 rounded-xl font-bold text-xs transition flex items-center justify-center gap-2 cursor-pointer shadow-xs ${
              savedSuccess
                ? 'bg-[#2E7D73] text-white'
                : 'bg-[#1B4D4A] hover:bg-[#2E7D73] text-white'
            }`}
          >
            {savedSuccess ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-[#B2DFD8]" />
                <span>Profile Saved Successfully!</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>{titles.saveBtn}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
