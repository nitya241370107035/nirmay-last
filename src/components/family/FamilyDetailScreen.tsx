import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Home, User, UserPlus, Stethoscope, ArrowLeft, Phone, MapPin, Plus, Shield, FileText, Edit3, CheckCircle2 } from 'lucide-react';
import { Family, Patient, LanguageCode } from '../../types';
import { addMemberToFamily, updateFamilyDetails } from '../../engine/familyEngine';
import { PatientDetailModal } from './PatientDetailModal';

interface FamilyDetailScreenProps {
  family: Family;
  members: Patient[];
  onStartCaseForMember: (patient: Patient) => void;
  onBackToRoster: () => void;
  onReloadFamily: () => void;
}

export const FamilyDetailScreen: React.FC<FamilyDetailScreenProps> = ({
  family,
  members: initialMembers,
  onStartCaseForMember,
  onBackToRoster,
  onReloadFamily
}) => {
  const { i18n } = useTranslation();
  const currentLang = (i18n.language || 'en') as LanguageCode;

  const [members, setMembers] = useState<Patient[]>(initialMembers);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [showMemberDetailModal, setShowMemberDetailModal] = useState(false);

  // Edit Household Modal
  const [showEditHousehold, setShowEditHousehold] = useState(false);
  const [editName, setEditName] = useState(family.name);
  const [editVillage, setEditVillage] = useState(family.village);
  const [editAddress, setEditAddress] = useState(family.address || '');
  const [editContact, setEditContact] = useState(family.contactNumber || '');

  // Add Member Modal
  const [showAddMember, setShowAddMember] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberAge, setNewMemberAge] = useState<number | ''>('');
  const [newMemberGender, setNewMemberGender] = useState<'Male' | 'Female' | 'Other'>('Female');
  const [newMemberRelation, setNewMemberRelation] = useState('Family Member');
  const [newMemberPregnant, setNewMemberPregnant] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleUpdateFamilySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!family.id) return;

    try {
      await updateFamilyDetails(family.id, {
        name: editName.trim(),
        village: editVillage.trim(),
        address: editAddress.trim(),
        contactNumber: editContact.trim()
      });
      setShowEditHousehold(false);
      onReloadFamily();
    } catch (err) {
      console.error('Failed to update family details', err);
    }
  };

  const handleAddMemberSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberName.trim() || newMemberAge === '' || !family.id) return;

    setIsSaving(true);
    try {
      const added = await addMemberToFamily(family.id, {
        name: newMemberName.trim(),
        age: Number(newMemberAge),
        gender: newMemberGender,
        relationToHead: newMemberRelation,
        isPregnant: newMemberPregnant,
        village: family.village,
        allergies: []
      });

      setMembers([...members, added]);
      setShowAddMember(false);
      setNewMemberName('');
      setNewMemberAge('');
      onReloadFamily();
    } catch (err) {
      console.error('Failed to add member', err);
    } finally {
      setIsSaving(false);
    }
  };

  const texts = {
    backBtn: currentLang === 'gu' ? 'કુટુંબ રજિસ્ટર' : currentLang === 'hi' ? 'परिवार रजिस्टर' : 'Back to Family Directory',
    editHousehold: currentLang === 'gu' ? 'ઘરની માહિતી સુધારો' : currentLang === 'hi' ? 'घर की जानकारी बदलें' : 'Edit Household Details',
    addMemberBtn: currentLang === 'gu' ? '+ નવો સભ્ય ઉમેરો' : currentLang === 'hi' ? '+ नया सदस्य जोड़ें' : '+ Add Household Member',
    membersHeader: currentLang === 'gu' ? 'કુટુંબના સભ્યો' : currentLang === 'hi' ? 'परिवार के सदस्य' : 'Household Members',
    startCaseBtn: currentLang === 'gu' ? 'તપાસ શરૂ કરો' : currentLang === 'hi' ? 'जांच शुरू करें' : 'Start Assessment',
    viewProfileBtn: currentLang === 'gu' ? 'તબીબી પ્રોફાઇલ જુઓ' : currentLang === 'hi' ? 'चिकित्सा प्रोफ़ाइल देखें' : 'View Medical Record'
  };

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-4 font-sans">
      {/* Header Banner */}
      <div className="bg-[#1B4D4A] text-white p-4 sm:p-5 rounded-2xl shadow-sm border border-[#2E7D73] space-y-3">
        <div className="flex items-center justify-between">
          <button
            onClick={onBackToRoster}
            className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{texts.backBtn}</span>
          </button>

          <button
            onClick={() => setShowEditHousehold(true)}
            className="px-3 py-1.5 bg-emerald-600/40 hover:bg-emerald-600/60 text-emerald-200 border border-emerald-400/30 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>{texts.editHousehold}</span>
          </button>
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
                  • Head: <strong className="text-white">{family.headName}</strong>
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

      {/* Household Members Header */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <h3 className="font-extrabold text-slate-800 text-sm sm:text-base font-display flex items-center gap-2">
            <span>{texts.membersHeader}</span>
            <span className="px-2 py-0.5 bg-teal-100 text-teal-800 text-xs rounded-full font-bold">
              {members.length}
            </span>
          </h3>
        </div>

        <button
          onClick={() => setShowAddMember(true)}
          className="px-3.5 py-2 bg-teal-800 hover:bg-teal-900 text-white font-bold text-xs rounded-xl transition shadow-xs flex items-center gap-1.5 cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>{texts.addMemberBtn}</span>
        </button>
      </div>

      {/* Members Cards List */}
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

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={() => onStartCaseForMember(m)}
                className="py-2 bg-teal-800 hover:bg-teal-900 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-1 cursor-pointer shadow-xs"
              >
                <Stethoscope className="w-3.5 h-3.5 text-emerald-300" />
                <span>{texts.startCaseBtn}</span>
              </button>

              <button
                onClick={() => {
                  setSelectedPatient(m);
                  setShowMemberDetailModal(true);
                }}
                className="py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition flex items-center justify-center gap-1 cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5 text-slate-600" />
                <span>Medical Record</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Edit Household Modal */}
      {showEditHousehold && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 max-w-md w-full space-y-4 shadow-xl">
            <h3 className="font-bold text-base text-slate-900">Edit Household Details</h3>

            <form onSubmit={handleUpdateFamilySubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Household Name *</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Village / Location *</label>
                <input
                  type="text"
                  required
                  value={editVillage}
                  onChange={(e) => setEditVillage(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Address / House No.</label>
                <input
                  type="text"
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Contact Phone Number</label>
                <input
                  type="tel"
                  value={editContact}
                  onChange={(e) => setEditContact(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEditHousehold(false)}
                  className="px-3 py-1.5 text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-teal-800 text-white font-bold rounded-xl"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Member Modal */}
      {showAddMember && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 max-w-md w-full space-y-4 shadow-xl">
            <h3 className="font-bold text-base text-slate-900">Add Member to {family.name}</h3>

            <form onSubmit={handleAddMemberSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Radhika Patel"
                  value={newMemberName}
                  onChange={(e) => setNewMemberName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Age (Years) *</label>
                  <input
                    type="number"
                    min="0"
                    max="120"
                    required
                    placeholder="e.g. 28"
                    value={newMemberAge}
                    onChange={(e) => setNewMemberAge(e.target.value ? Number(e.target.value) : '')}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Gender *</label>
                  <select
                    value={newMemberGender}
                    onChange={(e) => setNewMemberGender(e.target.value as any)}
                    className="w-full px-2 py-2 rounded-lg border border-slate-300 bg-white"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Relation to Head</label>
                <select
                  value={newMemberRelation}
                  onChange={(e) => setNewMemberRelation(e.target.value)}
                  className="w-full px-2 py-2 rounded-lg border border-slate-300 bg-white"
                >
                  <option value="Spouse">Spouse</option>
                  <option value="Son">Son</option>
                  <option value="Daughter">Daughter</option>
                  <option value="Parent">Parent</option>
                  <option value="Grandchild">Grandchild</option>
                  <option value="Family Member">Family Member</option>
                </select>
              </div>

              {newMemberGender === 'Female' && Number(newMemberAge) >= 15 && Number(newMemberAge) <= 49 && (
                <label className="flex items-center gap-2 pt-1 font-semibold text-slate-800">
                  <input
                    type="checkbox"
                    checked={newMemberPregnant}
                    onChange={(e) => setNewMemberPregnant(e.target.checked)}
                    className="rounded text-teal-700 w-4 h-4"
                  />
                  <span>Currently Pregnant</span>
                </label>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddMember(false)}
                  className="px-3 py-1.5 text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 bg-teal-800 text-white font-bold rounded-xl"
                >
                  {isSaving ? 'Saving...' : 'Add Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Patient Detail Modal */}
      {selectedPatient && (
        <PatientDetailModal
          isOpen={showMemberDetailModal}
          onClose={() => {
            setShowMemberDetailModal(false);
            setSelectedPatient(null);
          }}
          patient={selectedPatient}
          onStartCaseForPatient={onStartCaseForMember}
          onPatientUpdated={onReloadFamily}
        />
      )}
    </div>
  );
};
