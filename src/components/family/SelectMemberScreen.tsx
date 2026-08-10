import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Home, UserPlus, Stethoscope, ArrowLeft, Phone, MapPin, User, Plus, CheckCircle2, ShieldAlert } from 'lucide-react';
import { Family, Patient, LanguageCode } from '../../types';
import { addMemberToFamily } from '../../engine/familyEngine';

interface SelectMemberScreenProps {
  family: Family;
  members: Patient[];
  onSelectMember: (patient: Patient) => void;
  onBackToFamilySelect: () => void;
  onMemberAdded?: () => void;
}

export const SelectMemberScreen: React.FC<SelectMemberScreenProps> = ({
  family,
  members: initialMembers,
  onSelectMember,
  onBackToFamilySelect,
  onMemberAdded
}) => {
  const { i18n } = useTranslation();
  const currentLang = (i18n.language || 'en') as LanguageCode;

  const [members, setMembers] = useState<Patient[]>(initialMembers);
  const [showAddMemberForm, setShowAddMemberForm] = useState(false);

  // New member form
  const [name, setName] = useState('');
  const [age, setAge] = useState<number | ''>('');
  const [gender, setGender] = useState<'Male' | 'Female' | 'Other'>('Female');
  const [relationToHead, setRelationToHead] = useState('Family Member');
  const [isPregnant, setIsPregnant] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleAddMemberSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || age === '' || !family.id) return;

    setIsSaving(true);
    try {
      const newPatient = await addMemberToFamily(family.id, {
        name: name.trim(),
        age: Number(age),
        gender,
        relationToHead,
        isPregnant,
        village: family.village,
        allergies: []
      });

      setMembers([...members, newPatient]);
      setShowAddMemberForm(false);
      setName('');
      setAge('');
      if (onMemberAdded) onMemberAdded();
    } catch (err) {
      console.error('Error adding member to family', err);
    } finally {
      setIsSaving(false);
    }
  };

  const texts = {
    title:
      currentLang === 'gu'
        ? '૨. દર્દી પસંદ કરો (તપાસ માટે)'
        : currentLang === 'hi'
        ? '2. रोगी का चयन करें (जांच के लिए)'
        : '2. Select Patient Member',
    subtitle:
      currentLang === 'gu'
        ? 'કુટુંબના કયા સભ્યની તપાસ કરવાની છે તે પસંદ કરો'
        : currentLang === 'hi'
        ? 'परिवार के किस सदस्य की जांच करनी है उसे चुनें'
        : 'Select the household family member undergoing clinical assessment',
    addMemberBtn:
      currentLang === 'gu'
        ? '+ આ કુટુંબમાં સભ્ય ઉમેરો'
        : currentLang === 'hi'
        ? '+ इस परिवार में सदस्य जोड़ें'
        : '+ Add Member to Family',
    startCaseBtn:
      currentLang === 'gu' ? 'તપાસ શરૂ કરો' : currentLang === 'hi' ? 'जांच शुरू करें' : 'Start Assessment',
    backBtn:
      currentLang === 'gu' ? 'બીજું કુટુંબ પસંદ કરો' : currentLang === 'hi' ? 'दूसरा परिवार चुनें' : 'Change Family',
    headLabel: currentLang === 'gu' ? 'મોભી (મુખ્ય)' : currentLang === 'hi' ? 'मुखिया' : 'Head of Household',
    male: currentLang === 'gu' ? 'પુરુષ' : currentLang === 'hi' ? 'पुरुष' : 'Male',
    female: currentLang === 'gu' ? 'સ્ત્રી' : currentLang === 'hi' ? 'महिला' : 'Female',
    other: currentLang === 'gu' ? 'અન્ય' : currentLang === 'hi' ? 'अन्य' : 'Other'
  };

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-4 font-sans">
      {/* Top Navigation & Selected Family Header Banner */}
      <div className="bg-[#1B4D4A] text-white p-4 sm:p-5 rounded-2xl shadow-sm border border-[#2E7D73] space-y-3">
        <div className="flex items-center justify-between">
          <button
            onClick={onBackToFamilySelect}
            className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{texts.backBtn}</span>
          </button>

          <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[10px] font-bold uppercase tracking-wider">
            Step 2 of 2
          </span>
        </div>

        <div className="flex items-start gap-3 pt-1">
          <div className="w-12 h-12 rounded-2xl bg-emerald-600/30 border border-emerald-400/30 flex items-center justify-center text-emerald-300 shrink-0">
            <Home className="w-6 h-6" />
          </div>

          <div className="space-y-1">
            <h2 className="font-bold text-lg sm:text-xl text-white font-display leading-tight">
              {family.name}
            </h2>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#B2DFD8]">
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-emerald-300" />
                <span>{family.village}</span>
                {family.address && <span>({family.address})</span>}
              </span>

              {family.headName && (
                <span>
                  • {texts.headLabel}: <strong className="text-white">{family.headName}</strong>
                </span>
              )}

              {family.contactNumber && (
                <span className="flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-emerald-300" />
                  <span>{family.contactNumber}</span>
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <h3 className="font-extrabold text-slate-800 text-sm sm:text-base font-display">
            {texts.title}
          </h3>
          <p className="text-xs text-slate-500">{texts.subtitle}</p>
        </div>

        <button
          onClick={() => setShowAddMemberForm(!showAddMemberForm)}
          className="px-3.5 py-2 bg-teal-800 hover:bg-teal-900 text-white font-bold text-xs rounded-xl transition shadow-xs flex items-center gap-1.5 cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>{texts.addMemberBtn}</span>
        </button>
      </div>

      {/* Add Member inline form */}
      {showAddMemberForm && (
        <form
          onSubmit={handleAddMemberSubmit}
          className="bg-teal-50/70 p-4 rounded-2xl border border-teal-200 space-y-3 font-sans animate-in fade-in duration-150"
        >
          <h4 className="text-xs font-bold text-teal-900 uppercase tracking-wider flex items-center gap-1.5">
            <UserPlus className="w-4 h-4 text-teal-700" />
            <span>Add New Member to {family.name}</span>
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs">
            <div className="sm:col-span-2">
              <label className="block text-slate-700 font-semibold mb-0.5">Member Full Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Radhika Patel"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-0.5">Age (Years) *</label>
              <input
                type="number"
                min="0"
                max="120"
                required
                placeholder="e.g. 28"
                value={age}
                onChange={(e) => setAge(e.target.value ? Number(e.target.value) : '')}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-0.5">Gender *</label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value as any)}
                className="w-full px-2 py-1.5 rounded-lg border border-slate-300 bg-white"
              >
                <option value="Male">{texts.male}</option>
                <option value="Female">{texts.female}</option>
                <option value="Other">{texts.other}</option>
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
            <div className="flex items-center gap-3">
              <label className="text-slate-700 font-semibold">Relation to Head:</label>
              <select
                value={relationToHead}
                onChange={(e) => setRelationToHead(e.target.value)}
                className="px-2 py-1 rounded-lg border border-slate-300 bg-white text-xs"
              >
                <option value="Spouse">Spouse</option>
                <option value="Son">Son</option>
                <option value="Daughter">Daughter</option>
                <option value="Parent">Parent</option>
                <option value="Grandchild">Grandchild</option>
                <option value="Family Member">Family Member</option>
              </select>

              {gender === 'Female' && Number(age) >= 15 && Number(age) <= 49 && (
                <label className="flex items-center gap-1.5 text-teal-900 font-semibold cursor-pointer ml-2">
                  <input
                    type="checkbox"
                    checked={isPregnant}
                    onChange={(e) => setIsPregnant(e.target.checked)}
                    className="rounded text-teal-700 focus:ring-teal-500 w-4 h-4"
                  />
                  <span>Pregnant</span>
                </label>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowAddMemberForm(false)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-4 py-1.5 bg-teal-800 hover:bg-teal-900 text-white font-bold rounded-lg text-xs"
              >
                {isSaving ? 'Saving...' : 'Save & Select'}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* List of Family Members */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {members.map((m) => (
          <div
            key={m.id}
            className="bg-white p-4 rounded-2xl border border-slate-200 hover:border-teal-600 shadow-2xs hover:shadow-md transition flex flex-col justify-between space-y-3"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-100 text-teal-800 border border-slate-200 flex items-center justify-center font-bold text-sm shrink-0">
                  <User className="w-5 h-5 text-teal-800" />
                </div>

                <div>
                  <h4 className="font-bold text-sm text-slate-900 leading-snug">{m.name}</h4>
                  <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                    <span>
                      {m.age} yrs • {m.gender}
                    </span>
                    {m.relationToHead && (
                      <span className="px-1.5 py-0.5 bg-teal-50 text-teal-800 font-semibold text-[10px] rounded-md border border-teal-100">
                        {m.relationToHead}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {m.isPregnant && (
                <span className="px-2 py-0.5 bg-pink-50 text-pink-700 border border-pink-200 text-[10px] font-bold rounded-full">
                  Pregnant
                </span>
              )}
            </div>

            {/* Allergies / Medical Flags */}
            {m.allergies && m.allergies.length > 0 && (
              <div className="text-[11px] bg-amber-50 text-amber-800 p-2 rounded-lg border border-amber-200 flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>Allergies: {m.allergies.join(', ')}</span>
              </div>
            )}

            <button
              onClick={() => onSelectMember(m)}
              className="w-full py-2.5 bg-teal-800 hover:bg-teal-900 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shadow-xs"
            >
              <Stethoscope className="w-4 h-4 text-emerald-300" />
              <span>{texts.startCaseBtn}</span>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
