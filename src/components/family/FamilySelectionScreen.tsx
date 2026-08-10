import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Home, Search, Plus, MapPin, Users, Phone, ShieldAlert, HeartPulse, Sparkles, ArrowRight, UserCheck } from 'lucide-react';
import { Family, Patient, LanguageCode } from '../../types';
import { getAllFamiliesWithMembers } from '../../engine/familyEngine';
import { NewFamilyModal } from './NewFamilyModal';
import { HealthWorkerLoginDialog } from './HealthWorkerLoginDialog';

interface FamilySelectionScreenProps {
  onSelectFamily: (family: Family, members: Patient[]) => void;
  onEnterHealthWorkerMode: () => void;
}

export const FamilySelectionScreen: React.FC<FamilySelectionScreenProps> = ({
  onSelectFamily,
  onEnterHealthWorkerMode
}) => {
  const { i18n } = useTranslation();
  const currentLang = (i18n.language || 'en') as LanguageCode;

  const [familiesList, setFamiliesList] = useState<{ family: Family; members: Patient[] }[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showNewFamilyModal, setShowNewFamilyModal] = useState(false);
  const [showHealthWorkerModal, setShowHealthWorkerModal] = useState(false);

  // Logo 5-tap detection for hidden health worker shortcut
  const [tapCount, setTapCount] = useState(0);
  const [lastTapTime, setLastTapTime] = useState(0);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await getAllFamiliesWithMembers();
      setFamiliesList(data);
    } catch (err) {
      console.error('Failed to load families', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogoTap = () => {
    const now = Date.now();
    if (now - lastTapTime < 1000) {
      const newCount = tapCount + 1;
      if (newCount >= 5) {
        setTapCount(0);
        setShowHealthWorkerModal(true);
      } else {
        setTapCount(newCount);
      }
    } else {
      setTapCount(1);
    }
    setLastTapTime(now);
  };

  const handleCardClick = (family: Family, members: Patient[]) => {
    if (family.id) {
      localStorage.setItem('niramay_active_family_id', family.id.toString());
      localStorage.setItem('niramay_user_mode', 'patient');
    }
    onSelectFamily(family, members);
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

  const totalMembers = familiesList.reduce((acc, curr) => acc + curr.members.length, 0);

  const texts = {
    welcome:
      currentLang === 'gu'
        ? 'નિરામય કુટુંબ હેલ્થ પોર્ટલ'
        : currentLang === 'hi'
        ? 'निरामय परिवार हेल्थ पोर्टल'
        : 'Nirāmay Family Health Vault',
    subtitle:
      currentLang === 'gu'
        ? 'તમારા ઘરના વ્યક્તિગત સ્વાસ્થ્ય ડેશબોર્ડમાં પ્રવેશવા માટે તમારું કુટુંબ પસંદ કરો.'
        : currentLang === 'hi'
        ? 'अपने परिवार के व्यक्तिगत स्वास्थ्य डैशबोर्ड में प्रवेश के लिए परिवार चुनें।'
        : 'Select your household family to access personal health records, symptom triage, and adherence.',
    searchPlaceholder:
      currentLang === 'gu'
        ? 'કુટુંબનું નામ, ગામ અથવા સભ્ય શોધો...'
        : currentLang === 'hi'
        ? 'परिवार का नाम, गांव या सदस्य खोजें...'
        : 'Search household name, village, or member...',
    addFamilyBtn:
      currentLang === 'gu'
        ? '+ નવું કુટુંબ નોંધો (Register Household)'
        : currentLang === 'hi'
        ? '+ नया परिवार पंजीकृत करें'
        : '+ Register New Household Family',
    membersCount: (count: number) =>
      currentLang === 'gu'
        ? `${count} સભ્યો`
        : currentLang === 'hi'
        ? `${count} सदस्य`
        : `${count} members`,
    headLabel: currentLang === 'gu' ? 'મોભી' : currentLang === 'hi' ? 'मुखिया' : 'Head',
    noResults:
      currentLang === 'gu'
        ? 'કોઈ કુટુંબ મળ્યું નથી. નવું કુટુંબ નોંધવા માટે નીચે ક્લિક કરો.'
        : currentLang === 'hi'
        ? 'कोई परिवार नहीं मिला। नया परिवार पंजीकृत करने के लिए नीचे क्लिक करें।'
        : 'No matching household found. Register a new family below.',
    healthWorkerLink:
      currentLang === 'gu'
        ? '🩺 આશા / આરોગ્ય કાર્યકર માસ્ટર પોર્ટલ'
        : currentLang === 'hi'
        ? '🩺 आशा / स्वास्थ्य कार्यकर्ता मास्टर पोर्टल'
        : '🩺 Health Worker & Clinical Master Portal'
  };

  return (
    <div className="min-h-[85vh] bg-[#F3F7F6] p-4 sm:p-6 font-sans flex flex-col justify-between max-w-4xl mx-auto space-y-6">
      <div className="space-y-6">
        {/* Header Hero Banner */}
        <div className="bg-gradient-to-r from-[#0F3835] via-[#1B4D4A] to-[#1E6B63] text-white p-6 sm:p-8 rounded-3xl shadow-lg border border-[#2E7D73]/50 flex flex-col sm:flex-row items-center sm:items-start justify-between gap-5 relative overflow-hidden">
          {/* Ambient Glow */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#38A394]/15 rounded-full blur-3xl pointer-events-none" />

          <div className="space-y-2 text-center sm:text-left relative z-10">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/10 text-emerald-200 border border-white/20 text-xs font-bold backdrop-blur-xs">
              <HeartPulse className="w-3.5 h-3.5 text-emerald-300 animate-pulse" />
              <span>Offline Encrypted Household Directory</span>
            </div>
            <h1
              onClick={handleLogoTap}
              className="text-2xl sm:text-3xl lg:text-4xl font-black font-display tracking-tight cursor-pointer select-none text-white"
              title="Welcome to Nirāmay"
            >
              {texts.welcome}
            </h1>
            <p className="text-xs sm:text-sm text-[#B2DFD8] max-w-lg leading-relaxed font-medium">
              {texts.subtitle}
            </p>

            {/* Quick Metrics */}
            <div className="flex items-center gap-3 pt-1 text-xs font-mono text-emerald-200/90">
              <span className="flex items-center gap-1">
                <Home className="w-3.5 h-3.5 text-emerald-300" />
                <strong>{familiesList.length}</strong> Households
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-emerald-300" />
                <strong>{totalMembers}</strong> Individuals
              </span>
            </div>
          </div>

          <div 
            onClick={handleLogoTap}
            className="shrink-0 flex items-center justify-center w-20 h-20 rounded-2xl bg-white/10 border border-white/20 shadow-md p-2 cursor-pointer hover:bg-white/20 transition-all hover:scale-105 relative z-10"
            title="Tap 5 times for Health Worker Master Access"
          >
            <img 
              src="/logo.png" 
              alt="Nirāmay Botanical Heart" 
              className="w-full h-full object-contain filter drop-shadow-[0_4px_10px_rgba(0,0,0,0.35)]" 
            />
          </div>
        </div>

        {/* Search Bar with Glass Glow */}
        <div className="relative">
          <Search className="w-4 h-4 text-[#4A6360] absolute left-4 top-3.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={texts.searchPlaceholder}
            className="w-full pl-11 pr-4 py-3 rounded-2xl border border-[#D5E2DF] bg-white text-sm text-[#112222] focus:outline-none focus:border-[#1E6B63] focus:ring-2 focus:ring-[#1E6B63]/20 shadow-xs font-sans transition-all"
          />
        </div>

        {/* Family Cards Grid */}
        {isLoading ? (
          <div className="py-12 text-center text-[#4A6360] text-sm animate-pulse">
            Loading household families...
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-3xl p-8 text-center border border-[#D5E2DF] space-y-3 shadow-xs">
            <div className="w-12 h-12 rounded-2xl bg-[#E6F6F4] text-[#0F3835] border border-[#B2DFD8] flex items-center justify-center mx-auto">
              <Home className="w-6 h-6 text-[#1E6B63]" />
            </div>
            <p className="text-sm font-bold text-[#112222]">{texts.noResults}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filtered.map(({ family, members }) => (
              <div
                key={family.id}
                onClick={() => handleCardClick(family, members)}
                className="bg-white p-5 rounded-2xl border border-[#D5E2DF] hover:border-[#1E6B63] hover:shadow-md transition cursor-pointer flex flex-col justify-between space-y-3 group shadow-xs interactive-card"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-2xl bg-[#EBF2F0] text-[#0F3835] border border-[#D5E2DF] flex items-center justify-center shrink-0 group-hover:bg-[#0F3835] group-hover:text-white transition-all shadow-2xs">
                        <Home className="w-5 h-5 text-[#1E6B63] group-hover:text-white transition-colors" />
                      </div>
                      <div>
                        <h2 className="font-extrabold text-base text-[#0F3835] group-hover:text-[#1E6B63] transition leading-snug font-display">
                          {family.name}
                        </h2>
                        {(family.village || family.address) && (
                          <p className="text-xs text-[#4A6360] flex items-center gap-1 mt-0.5 font-medium">
                            <MapPin className="w-3.5 h-3.5 text-[#1E6B63] shrink-0" />
                            <span className="truncate max-w-[180px]">{family.village || family.address}</span>
                          </p>
                        )}
                      </div>
                    </div>

                    <span className="px-2.5 py-1 bg-[#E6F6F4] text-[#0F3835] border border-[#B2DFD8] text-xs font-bold rounded-xl shrink-0">
                      {texts.membersCount(members.length)}
                    </span>
                  </div>

                  {/* Head & Contact summary */}
                  {family.headName && (
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-[#4A6360]">
                      <span className="flex items-center gap-1">
                        <UserCheck className="w-3.5 h-3.5 text-[#1E6B63]" />
                        <span>{texts.headLabel}: <strong className="text-[#112222]">{family.headName}</strong></span>
                      </span>
                      {family.contactNumber && (
                        <span className="flex items-center gap-1 text-[#4A6360] font-mono text-[11px]">
                          <Phone className="w-3 h-3 text-[#1E6B63]" />
                          <span>{family.contactNumber}</span>
                        </span>
                      )}
                    </div>
                  )}

                  {/* Members badges */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {members.slice(0, 4).map((m) => (
                      <span
                        key={m.id}
                        className="px-2.5 py-0.5 bg-[#F3F7F6] text-[#0F3835] border border-[#D5E2DF] text-[11px] rounded-lg font-semibold"
                      >
                        {m.name} ({m.age}y)
                      </span>
                    ))}
                    {members.length > 4 && (
                      <span className="px-2 py-0.5 bg-[#EBF2F0] text-[#4A6360] text-[11px] rounded-lg font-bold">
                        +{members.length - 4} more
                      </span>
                    )}
                  </div>
                </div>

                <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-[#1E6B63] group-hover:text-[#0F3835]">
                  <span className="text-[11px] font-bold">Open Dashboard & Case Triage</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Action Area */}
      <div className="pt-4 space-y-3">
        <button
          onClick={() => setShowNewFamilyModal(true)}
          className="w-full py-4 bg-gradient-to-r from-[#1E6B63] to-[#0F3835] hover:opacity-95 text-white font-extrabold text-sm sm:text-base rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer border border-[#38A394]/30 active:scale-[0.99]"
        >
          <Plus className="w-5 h-5 text-emerald-300" />
          <span>{texts.addFamilyBtn}</span>
        </button>

        <div className="text-center pt-1">
          <button
            onClick={() => setShowHealthWorkerModal(true)}
            className="text-xs text-[#4A6360] hover:text-[#0F3835] underline flex items-center justify-center gap-1.5 mx-auto cursor-pointer font-semibold"
          >
            <ShieldAlert className="w-4 h-4 text-[#1E6B63]" />
            <span>{texts.healthWorkerLink}</span>
          </button>
        </div>
      </div>

      {/* New Family Modal */}
      {showNewFamilyModal && (
        <NewFamilyModal
          isOpen={showNewFamilyModal}
          onClose={() => setShowNewFamilyModal(false)}
          onFamilyCreated={async (famId) => {
            setShowNewFamilyModal(false);
            await loadData();
            const refreshed = await getAllFamiliesWithMembers();
            const created = refreshed.find((f) => f.family.id === famId);
            if (created) {
              localStorage.setItem('niramay_active_family_id', famId.toString());
              localStorage.setItem('niramay_user_mode', 'patient');
              onSelectFamily(created.family, created.members);
            }
          }}
        />
      )}

      {/* Health Worker Login Dialog */}
      {showHealthWorkerModal && (
        <HealthWorkerLoginDialog
          isOpen={showHealthWorkerModal}
          onClose={() => setShowHealthWorkerModal(false)}
          onUnlockSuccess={() => {
            onEnterHealthWorkerMode();
          }}
        />
      )}
    </div>
  );
};
