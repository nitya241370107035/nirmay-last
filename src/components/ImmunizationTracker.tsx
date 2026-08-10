import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Syringe,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Search,
  Baby,
  Calendar,
  Save,
  Check,
  ShieldCheck,
  User,
  Filter
} from 'lucide-react';
import { Patient, LanguageCode, ImmunizationRecord } from '../types';
import {
  getVaccinationStatus,
  CalculatedVaccineItem,
  VaccineStatus
} from '../engine/immunizationEngine';
import { db, recordVaccineGiven, updatePatientMchData } from '../db/db';

interface ImmunizationTrackerProps {
  initialPatientId?: number | null;
  onPatientUpdated?: (patient: Patient) => void;
}

export const ImmunizationTracker: React.FC<ImmunizationTrackerProps> = ({
  initialPatientId,
  onPatientUpdated
}) => {
  const { i18n } = useTranslation();
  const currentLang = (i18n.language || 'en') as LanguageCode;

  const [children, setChildren] = useState<Patient[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedChild, setSelectedChild] = useState<Patient | null>(null);

  // DOB edit input state
  const [dobInput, setDobInput] = useState<string>('');
  const [isEditingDob, setIsEditingDob] = useState<boolean>(false);

  // Status Filter Tab
  const [statusFilter, setStatusFilter] = useState<'all' | 'due_overdue' | 'completed' | 'upcoming'>('all');

  // Vaccine status list
  const [vaccineList, setVaccineList] = useState<CalculatedVaccineItem[]>([]);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Load child patients (< 16 yrs or having childBirthDate)
  useEffect(() => {
    loadChildren();
  }, []);

  const loadChildren = async () => {
    const allPatients = await db.patients.toArray();
    const childList = allPatients.filter(
      (p) => p.age < 16 || p.childBirthDate !== undefined
    );
    setChildren(childList);

    if (initialPatientId) {
      const p = childList.find((c) => c.id === initialPatientId);
      if (p) {
        setSelectedChild(p);
        setDobInput(p.childBirthDate || '');
        return;
      }
    }

    if (childList.length > 0 && !selectedChild) {
      setSelectedChild(childList[0]);
      setDobInput(childList[0].childBirthDate || '');
    }
  };

  // Recalculate vaccine schedule when selected child or dobInput changes
  useEffect(() => {
    if (selectedChild) {
      const birthDate = selectedChild.childBirthDate || dobInput;
      if (birthDate) {
        const schedule = getVaccinationStatus(
          birthDate,
          selectedChild.immunizations || []
        );
        setVaccineList(schedule);
      } else {
        setVaccineList([]);
      }
    }
  }, [selectedChild, dobInput]);

  const handleSelectChild = (child: Patient) => {
    setSelectedChild(child);
    setDobInput(child.childBirthDate || '');
    setIsEditingDob(false);
  };

  const handleSaveDob = async () => {
    if (!selectedChild || !selectedChild.id || !dobInput) return;

    await updatePatientMchData(selectedChild.id, { childBirthDate: dobInput });
    const updated = { ...selectedChild, childBirthDate: dobInput };
    setSelectedChild(updated);
    if (onPatientUpdated) onPatientUpdated(updated);
    setIsEditingDob(false);

    const msg =
      currentLang === 'gu'
        ? `બાળક ની જન્મ તારીખ સફળતાપૂર્વક સાચવવામાં આવી.`
        : currentLang === 'hi'
        ? `बच्चे की जन्म तिथि सफलतापूर्वक सहेजी गई।`
        : `Child DOB saved successfully. Schedule computed.`;
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleRecordGiven = async (vaccineId: string) => {
    if (!selectedChild || !selectedChild.id) return;

    const todayStr = new Date().toISOString().split('T')[0];
    await recordVaccineGiven(selectedChild.id, vaccineId, todayStr);

    // Refresh child record from DB
    const refreshed = await db.patients.get(selectedChild.id);
    if (refreshed) {
      setSelectedChild(refreshed);
      if (onPatientUpdated) onPatientUpdated(refreshed);
    }

    const msg =
      currentLang === 'gu'
        ? `રસી સફળતાપૂર્વક નોંધાઈ ગઈ.`
        : currentLang === 'hi'
        ? `टीकाकरण सफलतापूर्वक दर्ज किया गया।`
        : `Vaccine dose recorded as given today.`;
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  // Filter children by search query
  const filteredChildren = children.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return c.name.toLowerCase().includes(q) || (c.village || '').toLowerCase().includes(q);
  });

  // Filter vaccine list by tab
  const displayedVaccines = vaccineList.filter((item) => {
    if (statusFilter === 'due_overdue') {
      return item.status === 'due' || item.status === 'overdue';
    }
    if (statusFilter === 'completed') {
      return item.status === 'completed';
    }
    if (statusFilter === 'upcoming') {
      return item.status === 'upcoming';
    }
    return true;
  });

  // Calculate summary counts
  const counts = {
    overdue: vaccineList.filter((v) => v.status === 'overdue').length,
    due: vaccineList.filter((v) => v.status === 'due').length,
    completed: vaccineList.filter((v) => v.status === 'completed').length,
    upcoming: vaccineList.filter((v) => v.status === 'upcoming').length
  };

  return (
    <div className="space-y-5 font-sans">
      {/* HEADER CARD */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#DDE3E2] shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-[#1B4D4A] text-white rounded-xl shadow-xs">
            <Syringe className="w-6 h-6 text-[#B2DFD8]" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-extrabold text-[#1B4D4A] font-display">
              {currentLang === 'gu'
                ? 'બાળ સુરક્ષા રસીકરણ ટ્રેકર (National NIS Schedule)'
                : currentLang === 'hi'
                ? 'बाल सुरक्षा टीकाकरण ट्रैकर (National NIS Schedule)'
                : 'Child Immunization Tracker (National NIS Schedule)'}
            </h2>
            <p className="text-xs text-[#5F6D6C] mt-0.5">
              India Universal Immunization Programme (UIP) Automated Schedule & Local Reminders
            </p>
          </div>
        </div>
      </div>

      {toastMsg && (
        <div className="p-3 bg-[#2E7D73] text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-[#B2DFD8] shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* MAIN TWO COLUMN LAYOUT */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
        {/* LEFT COLUMN: CHILD PATIENT LIST & SEARCH */}
        <div className="md:col-span-4 bg-white p-4 rounded-2xl border border-[#DDE3E2] shadow-card space-y-3 flex flex-col max-h-[600px]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[#1B4D4A]">
              <Baby className="w-4 h-4 text-[#2E7D73]" />
              <h3 className="font-extrabold text-xs sm:text-sm font-display uppercase tracking-wider">
                Child Records (&lt;16 yrs)
              </h3>
            </div>
            <span className="text-[10px] font-bold bg-[#F4F7F6] text-[#1B4D4A] px-2 py-0.5 rounded-md border border-[#DDE3E2]">
              {children.length} Children
            </span>
          </div>

          {/* Search input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#5F6D6C] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search child name..."
              className="w-full pl-9 pr-3 py-2 bg-[#F4F7F6] border border-[#DDE3E2] rounded-xl text-xs font-medium text-[#1A2B2B] focus:outline-none focus:border-[#2E7D73]"
            />
          </div>

          {/* Children List */}
          <div className="overflow-y-auto space-y-2 flex-1 pr-1">
            {filteredChildren.length > 0 ? (
              filteredChildren.map((c) => {
                const isSelected = selectedChild?.id === c.id;
                const hasDob = !!c.childBirthDate;

                // Check count of overdue vaccines for child
                let overdueCount = 0;
                if (hasDob) {
                  const items = getVaccinationStatus(c.childBirthDate!, c.immunizations || []);
                  overdueCount = items.filter((i) => i.status === 'overdue').length;
                }

                return (
                  <button
                    key={c.id}
                    onClick={() => handleSelectChild(c)}
                    className={`w-full text-left p-3 rounded-xl border transition cursor-pointer flex items-center justify-between gap-2 font-sans ${
                      isSelected
                        ? 'bg-[#1B4D4A] text-white border-[#1B4D4A] shadow-xs'
                        : 'bg-white hover:bg-[#F4F7F6] border-[#DDE3E2] text-[#1A2B2B]'
                    }`}
                  >
                    <div>
                      <div className="font-extrabold text-xs font-display flex items-center gap-1.5">
                        <span>{c.name}</span>
                        {overdueCount > 0 && (
                          <span className={`px-1.5 py-0.2 rounded text-[9px] font-black uppercase ${isSelected ? 'bg-[#B71C1C] text-white' : 'bg-[#B71C1C]/15 text-[#B71C1C]'}`}>
                            {overdueCount} Overdue
                          </span>
                        )}
                      </div>
                      <span className={`text-[11px] block mt-0.5 ${isSelected ? 'text-[#B2DFD8]' : 'text-[#5F6D6C]'}`}>
                        Age: {c.age} y • {c.village || 'Local Village'}
                      </span>
                    </div>

                    {!hasDob && (
                      <span className={`text-[10px] font-bold underline ${isSelected ? 'text-white' : 'text-[#C46A3A]'}`}>
                        Set DOB
                      </span>
                    )}
                  </button>
                );
              })
            ) : (
              <div className="p-4 text-center text-xs text-[#5F6D6C] italic">
                No child records found matching filter.
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: VACCINATION SCHEDULE & TRACKER */}
        <div className="md:col-span-8 space-y-4">
          {selectedChild ? (
            <>
              {/* CHILD HEADER & DOB CONTROL */}
              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#DDE3E2] shadow-card space-y-3 font-sans">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base sm:text-lg font-black text-[#1B4D4A] font-display">
                        {selectedChild.name}
                      </h3>
                      <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-[#EDF1F0] text-[#1B4D4A] border border-[#DDE3E2]">
                        {selectedChild.gender}, {selectedChild.age} years
                      </span>
                    </div>
                    <p className="text-xs text-[#5F6D6C] mt-0.5">
                      Village: {selectedChild.village || 'Local Village'}
                    </p>
                  </div>

                  {/* DOB Input / Display */}
                  <div className="flex items-center gap-2">
                    {isEditingDob || !selectedChild.childBirthDate ? (
                      <div className="flex items-center gap-1.5">
                        <input
                          type="date"
                          value={dobInput}
                          max={new Date().toISOString().split('T')[0]}
                          onChange={(e) => setDobInput(e.target.value)}
                          className="px-2.5 py-1.5 bg-[#F4F7F6] border border-[#DDE3E2] rounded-xl text-xs font-bold text-[#1A2B2B] focus:outline-none"
                        />
                        <button
                          onClick={handleSaveDob}
                          className="px-3 py-1.5 bg-[#1B4D4A] text-white hover:bg-[#2E7D73] font-bold text-xs rounded-xl transition cursor-pointer flex items-center gap-1"
                        >
                          <Save className="w-3.5 h-3.5 text-[#B2DFD8]" />
                          <span>Save DOB</span>
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 bg-[#F4F7F6] px-3 py-1.5 rounded-xl border border-[#DDE3E2]">
                        <Calendar className="w-3.5 h-3.5 text-[#2E7D73]" />
                        <span className="text-xs font-bold text-[#1A2B2B]">
                          DOB: {selectedChild.childBirthDate}
                        </span>
                        <button
                          onClick={() => setIsEditingDob(true)}
                          className="text-[10px] font-bold text-[#1B4D4A] hover:underline ml-1"
                        >
                          Edit
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* COUNTERS SUMMARY BAR */}
                {selectedChild.childBirthDate && (
                  <div className="grid grid-cols-4 gap-2 pt-2 text-center font-sans">
                    <div className="p-2 bg-[#B71C1C]/10 rounded-xl border border-[#B71C1C]/30 text-[#881313]">
                      <span className="text-base font-black block font-display">{counts.overdue}</span>
                      <span className="text-[10px] font-bold uppercase tracking-wider block">Overdue</span>
                    </div>
                    <div className="p-2 bg-[#FFF3C4] rounded-xl border border-[#D1A000]/30 text-[#7A5200]">
                      <span className="text-base font-black block font-display">{counts.due}</span>
                      <span className="text-[10px] font-bold uppercase tracking-wider block">Due Soon</span>
                    </div>
                    <div className="p-2 bg-[#B2DFD8]/40 rounded-xl border border-[#2E7D73]/30 text-[#1B4D4A]">
                      <span className="text-base font-black block font-display">{counts.completed}</span>
                      <span className="text-[10px] font-bold uppercase tracking-wider block">Completed</span>
                    </div>
                    <div className="p-2 bg-[#F4F7F6] rounded-xl border border-[#DDE3E2] text-[#5F6D6C]">
                      <span className="text-base font-black block font-display">{counts.upcoming}</span>
                      <span className="text-[10px] font-bold uppercase tracking-wider block">Upcoming</span>
                    </div>
                  </div>
                )}
              </div>

              {/* VACCINE SCHEDULE TABS & LIST */}
              {selectedChild.childBirthDate ? (
                <div className="bg-white rounded-2xl border border-[#DDE3E2] shadow-card overflow-hidden">
                  {/* Status Filter Bar */}
                  <div className="bg-[#EDF1F0] p-3 border-b border-[#DDE3E2] flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1 overflow-x-auto">
                      <button
                        onClick={() => setStatusFilter('all')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                          statusFilter === 'all'
                            ? 'bg-[#1B4D4A] text-white shadow-xs'
                            : 'bg-white text-[#1B4D4A] hover:bg-gray-100'
                        }`}
                      >
                        All ({vaccineList.length})
                      </button>
                      <button
                        onClick={() => setStatusFilter('due_overdue')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                          statusFilter === 'due_overdue'
                            ? 'bg-[#B71C1C] text-white shadow-xs'
                            : 'bg-white text-[#B71C1C] hover:bg-gray-100'
                        }`}
                      >
                        Due & Overdue ({counts.overdue + counts.due})
                      </button>
                      <button
                        onClick={() => setStatusFilter('completed')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                          statusFilter === 'completed'
                            ? 'bg-[#2E7D73] text-white shadow-xs'
                            : 'bg-white text-[#2E7D73] hover:bg-gray-100'
                        }`}
                      >
                        Completed ({counts.completed})
                      </button>
                      <button
                        onClick={() => setStatusFilter('upcoming')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                          statusFilter === 'upcoming'
                            ? 'bg-[#5F6D6C] text-white shadow-xs'
                            : 'bg-white text-[#5F6D6C] hover:bg-gray-100'
                        }`}
                      >
                        Upcoming ({counts.upcoming})
                      </button>
                    </div>
                  </div>

                  {/* Vaccine Rows */}
                  <div className="p-4 space-y-3 max-h-[500px] overflow-y-auto">
                    {displayedVaccines.length > 0 ? (
                      displayedVaccines.map((v) => {
                        const vName = v.name[currentLang] || v.name.en;
                        const ageLbl = v.age_label[currentLang] || v.age_label.en;
                        const desc = v.description[currentLang] || v.description.en;

                        return (
                          <div
                            key={v.id}
                            className={`p-3.5 rounded-xl border transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 font-sans ${
                              v.status === 'overdue'
                                ? 'bg-[#B71C1C]/10 border-[#B71C1C] ring-1 ring-[#B71C1C]/20'
                                : v.status === 'due'
                                ? 'bg-[#FFF3C4]/60 border-[#D1A000]'
                                : v.status === 'completed'
                                ? 'bg-[#F4F7F6] border-[#DDE3E2]'
                                : 'bg-white border-[#DDE3E2]'
                            }`}
                          >
                            <div className="space-y-1 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="font-extrabold text-sm text-[#1B4D4A] font-display">
                                  {vName}
                                </h4>
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#EDF1F0] text-[#1B4D4A] border border-[#DDE3E2]">
                                  {v.dose}
                                </span>

                                {/* Status Pill Badge */}
                                {v.status === 'overdue' && (
                                  <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-[#B71C1C] text-white flex items-center gap-1 animate-pulse">
                                    <AlertTriangle className="w-3 h-3" /> Overdue
                                  </span>
                                )}
                                {v.status === 'due' && (
                                  <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-[#D1A000] text-white flex items-center gap-1">
                                    <Clock className="w-3 h-3" /> Due Soon
                                  </span>
                                )}
                                {v.status === 'completed' && (
                                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-[#2E7D73] text-white flex items-center gap-1">
                                    <ShieldCheck className="w-3 h-3 text-[#B2DFD8]" /> Completed ({v.dateGiven})
                                  </span>
                                )}
                                {v.status === 'upcoming' && (
                                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-[#5F6D6C] text-white">
                                    Upcoming
                                  </span>
                                )}
                              </div>

                              <p className="text-xs text-[#5F6D6C]">{desc}</p>

                              <div className="text-[11px] font-semibold text-[#1A2B2B] flex items-center gap-3 pt-0.5">
                                <span>Target Age: <strong>{ageLbl}</strong></span>
                                <span>Scheduled Date: <strong>{v.dueDateFormatted}</strong></span>
                              </div>
                            </div>

                            {/* RECORD AS GIVEN BUTTON */}
                            {v.status !== 'completed' ? (
                              <button
                                onClick={() => handleRecordGiven(v.id)}
                                className={`w-full sm:w-auto px-4 py-2 font-bold text-xs rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 shadow-xs shrink-0 ${
                                  v.status === 'overdue'
                                    ? 'bg-[#B71C1C] hover:bg-[#881313] text-white'
                                    : 'bg-[#1B4D4A] hover:bg-[#2E7D73] text-white'
                                }`}
                              >
                                <Check className="w-4 h-4 text-[#B2DFD8]" />
                                <span>Record as Given</span>
                              </button>
                            ) : (
                              <div className="flex items-center gap-1 text-xs font-bold text-[#2E7D73] shrink-0">
                                <CheckCircle2 className="w-4 h-4 text-[#2E7D73]" />
                                <span>Administered</span>
                              </div>
                            )}
                          </div>
                        );
                      })
                    ) : (
                      <div className="p-8 text-center text-xs text-[#5F6D6C] italic font-sans">
                        No vaccines found under selected status filter.
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-[#F4F7F6] p-8 rounded-2xl border border-[#DDE3E2] text-center space-y-3 font-sans">
                  <Calendar className="w-10 h-10 text-[#2E7D73]/40 mx-auto" />
                  <h4 className="font-bold text-sm text-[#1B4D4A]">
                    Please Enter Child Date of Birth (DOB)
                  </h4>
                  <p className="text-xs text-[#5F6D6C] max-w-sm mx-auto">
                    To generate the automated Universal Immunization Programme (UIP) timeline for {selectedChild.name}, specify the birth date above.
                  </p>
                </div>
              )}
            </>
          ) : (
            <div className="bg-[#F4F7F6] p-12 rounded-2xl border border-[#DDE3E2] text-center space-y-3 font-sans">
              <Baby className="w-12 h-12 text-[#2E7D73]/40 mx-auto" />
              <h4 className="font-bold text-sm text-[#1B4D4A]">
                Select a Child Patient Record
              </h4>
              <p className="text-xs text-[#5F6D6C] max-w-sm mx-auto">
                Choose a child from the roster on the left to track or update vaccination schedules.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
