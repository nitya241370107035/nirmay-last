import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Home, User, UserPlus, X, Plus, Trash2, CheckCircle2, Shield, Phone, MapPin } from 'lucide-react';
import { LanguageCode, Patient } from '../../types';
import { createFamilyWithMembers } from '../../engine/familyEngine';

interface NewFamilyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFamilyCreated: (familyId: number, firstMemberId: number) => void;
  initialVillage?: string;
}

export const NewFamilyModal: React.FC<NewFamilyModalProps> = ({
  isOpen,
  onClose,
  onFamilyCreated,
  initialVillage = ''
}) => {
  const { i18n } = useTranslation();
  const currentLang = (i18n.language || 'en') as LanguageCode;

  const [familyName, setFamilyName] = useState('');
  const [village, setVillage] = useState(initialVillage || '');
  const [address, setAddress] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [passcode, setPasscode] = useState('1234');
  const [notes, setNotes] = useState('');

  // Initial members
  const [members, setMembers] = useState<
    {
      name: string;
      age: number | '';
      gender: 'Male' | 'Female' | 'Other';
      relationToHead: string;
      allergiesStr: string;
      isPregnant: boolean;
    }[]
  >([
    {
      name: '',
      age: '',
      gender: 'Male',
      relationToHead: 'Head of Household',
      allergiesStr: '',
      isPregnant: false
    }
  ]);

  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAddMemberRow = () => {
    setMembers([
      ...members,
      {
        name: '',
        age: '',
        gender: 'Female',
        relationToHead: 'Family Member',
        allergiesStr: '',
        isPregnant: false
      }
    ]);
  };

  const handleRemoveMemberRow = (index: number) => {
    if (members.length === 1) return;
    setMembers(members.filter((_, idx) => idx !== index));
  };

  const handleMemberChange = (index: number, field: string, value: any) => {
    const updated = [...members];
    updated[index] = { ...updated[index], [field]: value };
    
    // Auto populate family name if head of household name is typed and family name is empty
    if (index === 0 && field === 'name' && (!familyName || familyName.includes("'s Household") || familyName.includes("કુટુંબ"))) {
      if (value.trim()) {
        const autoName = currentLang === 'gu'
          ? `${value.trim()}નું કુટુંબ`
          : currentLang === 'hi'
          ? `${value.trim()} का परिवार`
          : `${value.trim()}'s Household`;
        setFamilyName(autoName);
      }
    }
    setMembers(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Validations
    if (!familyName.trim()) {
      setErrorMessage(
        currentLang === 'gu'
          ? 'મહેરબાની કરીને કુટુંબનું નામ લખો'
          : currentLang === 'hi'
          ? 'कृपया परिवार का नाम दर्ज करें'
          : 'Please enter a family household name'
      );
      return;
    }

    if (!members[0].name.trim() || members[0].age === '') {
      setErrorMessage(
        currentLang === 'gu'
          ? 'મુખ્ય સભ્યનું નામ અને ઉંમર જરૂરી છે'
          : currentLang === 'hi'
          ? 'मुखिया का नाम और आयु आवश्यक है'
          : 'Head of household name and age are required'
      );
      return;
    }

    // Check all members
    for (let i = 0; i < members.length; i++) {
      const m = members[i];
      if (!m.name.trim() || m.age === '') {
        setErrorMessage(
          currentLang === 'gu'
            ? `સભ્ય #${i + 1} નું નામ અને ઉંમર ભરો`
            : currentLang === 'hi'
            ? `सदस्य #${i + 1} का नाम और आयु भरें`
            : `Please enter name and age for member #${i + 1}`
        );
        return;
      }
    }

    setIsSaving(true);
    try {
      const membersPayload = members.map(m => ({
        name: m.name.trim(),
        age: Number(m.age),
        gender: m.gender,
        relationToHead: m.relationToHead,
        allergies: m.allergiesStr ? m.allergiesStr.split(',').map(s => s.trim()).filter(Boolean) : [],
        isPregnant: m.isPregnant
      }));

      const { familyId, firstMemberId } = await createFamilyWithMembers(
        {
          name: familyName.trim(),
          address: address.trim(),
          village: village.trim() || (currentLang === 'gu' ? 'સ્થાનિક ગામ' : currentLang === 'hi' ? 'स्थानीय गांव' : 'Local Village'),
          contactNumber: contactNumber.trim(),
          passcode: passcode.trim() || '1234',
          notes: notes.trim()
        },
        membersPayload
      );

      onFamilyCreated(familyId, firstMemberId);
      onClose();
    } catch (err) {
      console.error('Failed to create family', err);
      setErrorMessage('Failed to save household records. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const texts = {
    title: currentLang === 'gu' ? 'નવા કુટુંબની નોંધણી' : currentLang === 'hi' ? 'नए परिवार का पंजीकरण' : 'Register New Household Family',
    sub: currentLang === 'gu' ? 'ગામડાના ઘર અને તેના તમામ સભ્યોની માહિતી ઉમેરો' : currentLang === 'hi' ? 'गांव के घर और उसके सभी सदस्यों की जानकारी जोड़ें' : 'Register household address and family members together',
    famNameLabel: currentLang === 'gu' ? 'કુટુંબનું નામ (ઉદા. પટેલ પરિવાર)' : currentLang === 'hi' ? 'परिवार का नाम (उदा. पटेल परिवार)' : 'Household / Family Name *',
    villageLabel: currentLang === 'gu' ? 'ગામ / ફળિયું' : currentLang === 'hi' ? 'गांव / मोहल्ला' : 'Village / Locality *',
    addressLabel: currentLang === 'gu' ? 'ઘરનું સરનામું / હાઉસ નં.' : currentLang === 'hi' ? 'मकान का पता / हाउस नं.' : 'House Address / Landmark',
    contactLabel: currentLang === 'gu' ? 'સંપર્ક ફોન નંબર' : currentLang === 'hi' ? 'संपर्क फ़ोन नंबर' : 'Contact Phone Number',
    membersHeader: currentLang === 'gu' ? 'કુટુંબના સભ્યો' : currentLang === 'hi' ? 'परिवार के सदस्य' : 'Household Family Members',
    addMemberBtn: currentLang === 'gu' ? '+ બીજો સભ્ય ઉમેરો' : currentLang === 'hi' ? '+ अन्य सदस्य जोड़ें' : '+ Add Family Member',
    submitBtn: currentLang === 'gu' ? 'કુટુંબ સાચવો' : currentLang === 'hi' ? 'परिवार सुरक्षित करें' : 'Save Household Family',
    saving: currentLang === 'gu' ? 'સાચવી રહ્યું છે...' : currentLang === 'hi' ? 'सुरक्षित हो रहा है...' : 'Saving Household...',
    male: currentLang === 'gu' ? 'પુરુષ' : currentLang === 'hi' ? 'पुरुष' : 'Male',
    female: currentLang === 'gu' ? 'સ્ત્રી' : currentLang === 'hi' ? 'महिला' : 'Female',
    other: currentLang === 'gu' ? 'અન્ય' : currentLang === 'hi' ? 'अन्य' : 'Other',
    headLabel: currentLang === 'gu' ? 'મોભી (મુખ્ય)' : currentLang === 'hi' ? 'मुखिया' : 'Head of Household',
    spouseLabel: currentLang === 'gu' ? 'પતિ / પત્ની' : currentLang === 'hi' ? 'पति / पत्नी' : 'Spouse',
    childLabel: currentLang === 'gu' ? 'પુત્ર / પુત્રી' : currentLang === 'hi' ? 'पुत्र / पुत्री' : 'Son / Daughter',
    parentLabel: currentLang === 'gu' ? 'માતા / પિતા' : currentLang === 'hi' ? 'माता / पिता' : 'Parent / Elder',
    otherRelLabel: currentLang === 'gu' ? 'અન્ય સભ્ય' : currentLang === 'hi' ? 'अन्य सदस्य' : 'Other Member'
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl border border-teal-100 my-auto overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-[#1B4D4A] text-white px-5 py-4 flex items-center justify-between border-b border-[#2E7D73]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600/30 border border-emerald-400/40 flex items-center justify-center text-emerald-300">
              <Home className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white font-display leading-tight">{texts.title}</h3>
              <p className="text-xs text-[#B2DFD8]">{texts.sub}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-5 max-h-[80vh] overflow-y-auto font-sans">
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Household Info */}
          <div className="bg-teal-50/50 p-4 rounded-xl border border-teal-100 space-y-3">
            <h4 className="text-xs font-bold text-teal-900 uppercase tracking-wider flex items-center gap-1.5">
              <Home className="w-4 h-4 text-teal-700" />
              <span>1. Household Details</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">{texts.famNameLabel}</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Patel's Household"
                  value={familyName}
                  onChange={(e) => setFamilyName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-teal-600 bg-white"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">{texts.villageLabel}</label>
                <div className="relative">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-3" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Anandpur"
                    value={village}
                    onChange={(e) => setVillage(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-teal-600 bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">{texts.contactLabel}</label>
                <div className="relative">
                  <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-3" />
                  <input
                    type="tel"
                    placeholder="e.g. +91 98765 43210"
                    value={contactNumber}
                    onChange={(e) => setContactNumber(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-teal-600 bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">{texts.addressLabel}</label>
                <input
                  type="text"
                  placeholder="e.g. House #42, Near Primary School"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-teal-600 bg-white"
                />
              </div>
            </div>
          </div>

          {/* Family Members Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <User className="w-4 h-4 text-teal-700" />
                <span>2. {texts.membersHeader} ({members.length})</span>
              </h4>

              <button
                type="button"
                onClick={handleAddMemberRow}
                className="px-3 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 text-xs font-bold rounded-lg transition flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{texts.addMemberBtn}</span>
              </button>
            </div>

            <div className="space-y-3">
              {members.map((m, idx) => (
                <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 relative">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <span className="text-xs font-extrabold text-teal-900 flex items-center gap-1">
                      <span className="w-5 h-5 rounded-full bg-teal-800 text-white flex items-center justify-center text-[10px]">
                        {idx + 1}
                      </span>
                      <span>{idx === 0 ? texts.headLabel : `Member #${idx + 1}`}</span>
                    </span>

                    {members.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveMemberRow(idx)}
                        className="text-rose-600 hover:text-rose-800 p-1 rounded-md hover:bg-rose-50 transition cursor-pointer text-xs flex items-center gap-0.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs">
                    <div className="sm:col-span-2">
                      <label className="block text-slate-600 font-medium mb-0.5">Full Name *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Ramesh Patel"
                        value={m.name}
                        onChange={(e) => handleMemberChange(idx, 'name', e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-md border border-slate-300 bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-600 font-medium mb-0.5">Age (Years) *</label>
                      <input
                        type="number"
                        min="0"
                        max="120"
                        required
                        placeholder="e.g. 45"
                        value={m.age}
                        onChange={(e) => handleMemberChange(idx, 'age', e.target.value ? Number(e.target.value) : '')}
                        className="w-full px-2.5 py-1.5 rounded-md border border-slate-300 bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-600 font-medium mb-0.5">Gender *</label>
                      <select
                        value={m.gender}
                        onChange={(e) => handleMemberChange(idx, 'gender', e.target.value)}
                        className="w-full px-2 py-1.5 rounded-md border border-slate-300 bg-white"
                      >
                        <option value="Male">{texts.male}</option>
                        <option value="Female">{texts.female}</option>
                        <option value="Other">{texts.other}</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                    <div>
                      <label className="block text-slate-600 font-medium mb-0.5">Relation to Head</label>
                      <select
                        value={m.relationToHead}
                        onChange={(e) => handleMemberChange(idx, 'relationToHead', e.target.value)}
                        className="w-full px-2 py-1 rounded-md border border-slate-300 bg-white"
                      >
                        <option value="Head of Household">{texts.headLabel}</option>
                        <option value="Spouse">{texts.spouseLabel}</option>
                        <option value="Son">{texts.childLabel} (Son)</option>
                        <option value="Daughter">{texts.childLabel} (Daughter)</option>
                        <option value="Parent">{texts.parentLabel}</option>
                        <option value="Family Member">{texts.otherRelLabel}</option>
                      </select>
                    </div>

                    {m.gender === 'Female' && Number(m.age) >= 15 && Number(m.age) <= 49 && (
                      <div className="flex items-center gap-2 pt-4">
                        <label className="flex items-center gap-1.5 text-teal-900 font-semibold cursor-pointer">
                          <input
                            type="checkbox"
                            checked={m.isPregnant}
                            onChange={(e) => handleMemberChange(idx, 'isPregnant', e.target.checked)}
                            className="rounded text-teal-700 focus:ring-teal-500 w-4 h-4"
                          />
                          <span>Currently Pregnant</span>
                        </label>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Submit Actions */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2.5 bg-teal-800 hover:bg-teal-900 text-white font-bold text-xs rounded-xl transition shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-300" />
              <span>{isSaving ? texts.saving : texts.submitBtn}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
