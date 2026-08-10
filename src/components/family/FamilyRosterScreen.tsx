import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Home, Users, Search, Plus, Download, ChevronRight, MapPin, Phone, ArrowLeft, ShieldCheck, Lock } from 'lucide-react';
import { Family, Patient, LanguageCode } from '../../types';
import { getAllFamiliesWithMembers } from '../../engine/familyEngine';
import { exportAllEMRData } from '../../db/db';
import { NewFamilyModal } from './NewFamilyModal';
import { FamilyDetailScreen } from './FamilyDetailScreen';

interface FamilyRosterScreenProps {
  onStartCaseForMember: (patient: Patient) => void;
  onBackToHome: () => void;
}

export const FamilyRosterScreen: React.FC<FamilyRosterScreenProps> = ({
  onStartCaseForMember,
  onBackToHome
}) => {
  const { i18n } = useTranslation();
  const currentLang = (i18n.language || 'en') as LanguageCode;

  const [familiesList, setFamiliesList] = useState<{ family: Family; members: Patient[] }[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Active family detail view state
  const [selectedFamilyData, setSelectedFamilyData] = useState<{ family: Family; members: Patient[] } | null>(null);

  // Verification modal state
  const [selectedForVerification, setSelectedForVerification] = useState<{ family: Family; members: Patient[] } | null>(null);
  const [unlockedFamilyIds, setUnlockedFamilyIds] = useState<number[]>([]);

  // New family modal
  const [showNewFamilyModal, setShowNewFamilyModal] = useState(false);

  // Toast / Export status
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await getAllFamiliesWithMembers();
      setFamiliesList(data);

      // If a family was selected, refresh its data
      if (selectedFamilyData?.family.id) {
        const refreshed = data.find((d) => d.family.id === selectedFamilyData.family.id);
        if (refreshed) setSelectedFamilyData(refreshed);
      }
    } catch (err) {
      console.error('Failed to load families roster', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportEMR = async () => {
    try {
      const jsonStr = await exportAllEMRData();
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Niramay_EMR_Backup_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('EMR Data exported successfully.');
    } catch (err) {
      console.error('Failed to export EMR data', err);
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const filtered = familiesList.filter(({ family, members }) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    const matchName = family.name.toLowerCase().includes(q);
    const matchHead = (family.headName || '').toLowerCase().includes(q);
    const matchVillage = (family.village || '').toLowerCase().includes(q);
    const matchAddress = (family.address || '').toLowerCase().includes(q);
    const matchMember = members.some((m) => m.name.toLowerCase().includes(q));
    return matchName || matchHead || matchVillage || matchAddress || matchMember;
  });

  const totalHouseholds = familiesList.length;
  const totalIndividuals = familiesList.reduce((acc, curr) => acc + curr.members.length, 0);

  const texts = {
    title:
      currentLang === 'gu'
        ? 'કુટુંબ પત્રક (Family Roster)'
        : currentLang === 'hi'
        ? 'परिवार रजिस्टर (Family Roster)'
        : 'Family Roster (Household Directory)',
    subtitle:
      currentLang === 'gu'
        ? 'ગામના તમામ કુટુંબો અને તેમના સભ્યોની માહિતી'
        : currentLang === 'hi'
        ? 'गांव के सभी परिवारों और उनके सदस्यों की जानकारी'
        : 'Village household directory and comprehensive family healthcare records',
    searchPlaceholder:
      currentLang === 'gu'
        ? 'કુટુંબનું નામ, મોભી અથવા ગામ શોધો...'
        : currentLang === 'hi'
        ? 'परिवार का नाम, मुखिया या गांव खोजें...'
        : 'Search household, head name, or village...',
    addFamilyBtn:
      currentLang === 'gu'
        ? '+ નવું કુટુંબ નોધો'
        : currentLang === 'hi'
        ? '+ नया परिवार पंजीकृत करें'
        : '+ Register Household',
    exportBtn:
      currentLang === 'gu' ? 'ડેટા નિકાસ (JSON)' : currentLang === 'hi' ? 'डेटा निर्यात (JSON)' : 'Export Backup',
    householdsStat:
      currentLang === 'gu' ? 'કુલ કુટુંબો' : currentLang === 'hi' ? 'कुल परिवार' : 'Households',
    individualsStat:
      currentLang === 'gu' ? 'કુલ નાગરિકો' : currentLang === 'hi' ? 'कुल नागरिक' : 'Individuals',
    backBtn: currentLang === 'gu' ? 'મુખ્ય પાનું' : currentLang === 'hi' ? 'मुख्य पृष्ठ' : 'Back to Home'
  };

  // If viewing details for a single family
  if (selectedFamilyData) {
    return (
      <FamilyDetailScreen
        family={selectedFamilyData.family}
        members={selectedFamilyData.members}
        onStartCaseForMember={onStartCaseForMember}
        onBackToRoster={() => setSelectedFamilyData(null)}
        onReloadFamily={loadData}
      />
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-4 font-sans">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed top-16 right-4 bg-slate-900 text-white text-xs font-semibold px-4 py-2 rounded-xl shadow-lg z-50 animate-in fade-in">
          {toastMessage}
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-[#1B4D4A] text-white p-4 sm:p-5 rounded-2xl shadow-sm border border-[#2E7D73] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToHome}
            className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer shrink-0"
            title={texts.backBtn}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div>
            <h2 className="font-bold text-lg sm:text-xl font-display">{texts.title}</h2>
            <p className="text-xs text-[#B2DFD8] mt-0.5">{texts.subtitle}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleExportEMR}
            className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-xl transition flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-4 h-4 text-[#B2DFD8]" />
            <span>{texts.exportBtn}</span>
          </button>

          <button
            onClick={() => setShowNewFamilyModal(true)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition shadow-md flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{texts.addFamilyBtn}</span>
          </button>
        </div>
      </div>

      {/* Roster Summary Stats Bar */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-800 flex items-center justify-center border border-teal-100 shrink-0">
            <Home className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider block">
              {texts.householdsStat}
            </span>
            <strong className="text-lg font-bold text-slate-900 font-display">{totalHouseholds}</strong>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center border border-emerald-100 shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider block">
              {texts.individualsStat}
            </span>
            <strong className="text-lg font-bold text-slate-900 font-display">{totalIndividuals}</strong>
          </div>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={texts.searchPlaceholder}
          className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-white shadow-xs focus:outline-none focus:border-teal-600 text-xs sm:text-sm font-medium"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-3 text-xs text-slate-400 hover:text-slate-600"
          >
            Clear
          </button>
        )}
      </div>

      {/* Families Grid */}
      {isLoading ? (
        <div className="p-8 text-center space-y-2">
          <div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-500">Loading household directories...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-8 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-teal-50 text-teal-800 flex items-center justify-center mx-auto">
            <Home className="w-6 h-6" />
          </div>
          <p className="text-xs sm:text-sm font-medium text-slate-600">No matching household families found.</p>
          <button
            onClick={() => setShowNewFamilyModal(true)}
            className="px-4 py-2 bg-teal-800 text-white font-bold text-xs rounded-xl hover:bg-teal-900 transition"
          >
            {texts.addFamilyBtn}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filtered.map((item) => {
            const { family, members } = item;
            return (
              <div
                key={family.id}
                onClick={() => setSelectedFamilyData(item)}
                className="bg-white p-4 rounded-2xl border border-slate-200 hover:border-teal-600 hover:shadow-md transition cursor-pointer flex flex-col justify-between space-y-3 group"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-800 border border-teal-100 flex items-center justify-center shrink-0 group-hover:bg-teal-800 group-hover:text-white transition font-bold">
                        <Home className="w-5 h-5" />
                      </div>

                      <div>
                        <h3 className="font-bold text-sm text-slate-900 group-hover:text-teal-900 transition leading-snug">
                          {family.name}
                        </h3>
                        <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          <span>{family.village}</span>
                          {family.address && <span>({family.address})</span>}
                        </p>
                      </div>
                    </div>

                    <span className="px-2.5 py-0.5 bg-teal-50 text-teal-800 border border-teal-100 text-[10px] font-extrabold rounded-full shrink-0">
                      {members.length} Members
                    </span>
                  </div>

                  {family.headName && (
                    <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                      <span className="text-slate-500 text-[11px]">
                        Head: <strong className="text-slate-800 font-semibold">{family.headName}</strong>
                      </span>
                      {family.contactNumber && (
                        <span className="text-slate-500 text-[11px] flex items-center gap-1">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{family.contactNumber}</span>
                        </span>
                      )}
                    </div>
                  )}

                  <div className="mt-2 flex flex-wrap gap-1">
                    {members.map((m) => (
                      <span
                        key={m.id}
                        className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[10px] font-medium rounded-md"
                      >
                        {m.name} ({m.age}y)
                      </span>
                    ))}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-teal-800 group-hover:text-teal-900">
                  <span className="text-[10px] text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/60 font-semibold flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-amber-600" />
                    <span>Family Confidential</span>
                  </span>
                  <div className="flex items-center gap-1">
                    <span>View Household Directory</span>
                    <ChevronRight className="w-4 h-4 text-teal-700 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* New Family Modal */}
      <NewFamilyModal
        isOpen={showNewFamilyModal}
        onClose={() => setShowNewFamilyModal(false)}
        onFamilyCreated={async (famId) => {
          setShowNewFamilyModal(false);
          await loadData();
          showToast('New household family registered successfully!');
        }}
      />
    </div>
  );
};
