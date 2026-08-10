import React, { useState, useEffect } from 'react';
import {
  Pill,
  Clock,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  Droplets,
  Footprints,
  Plus,
  ChevronRight,
  Calendar,
  Bell,
  User,
  Filter,
  Activity,
  BarChart3,
  Search,
  Check,
  X,
  ArrowLeft,
  Sliders
} from 'lucide-react';
import {
  getTodayDoses,
  getOverdueDoses,
  markDoseStatus,
  getPatientSchedules,
  getWellnessGoals,
  logWellnessProgress,
  EnrichedDoseLog,
  EnrichedSchedule,
  WellnessGoalWithProgress,
  getLocalDateString
} from '../../engine/adherenceEngine';
import { db } from '../../db/db';
import { LanguageCode, Patient } from '../../types';
import { ScheduleDetailModal } from './ScheduleDetailModal';
import { AddScheduleModal } from './AddScheduleModal';
import { AddGoalModal } from './AddGoalModal';

interface AdherenceDashboardProps {
  initialPatient?: Patient | null;
  currentLang: LanguageCode;
  onBackToHome: () => void;
  activeFamilyId?: number;
}

type TabType = 'today' | 'schedules' | 'wellness';
type StatusFilter = 'all' | 'pending' | 'overdue' | 'completed';

export const AdherenceDashboard: React.FC<AdherenceDashboardProps> = ({
  initialPatient,
  currentLang,
  onBackToHome,
  activeFamilyId
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('today');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Data states
  const [todayDoses, setTodayDoses] = useState<EnrichedDoseLog[]>([]);
  const [overdueDoses, setOverdueDoses] = useState<EnrichedDoseLog[]>([]);
  const [allSchedules, setAllSchedules] = useState<EnrichedSchedule[]>([]);
  const [wellnessGoals, setWellnessGoals] = useState<WellnessGoalWithProgress[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Modals state
  const [selectedSchedule, setSelectedSchedule] = useState<EnrichedSchedule | null>(null);
  const [showAddSchedule, setShowAddSchedule] = useState<boolean>(false);
  const [showAddGoal, setShowAddGoal] = useState<boolean>(false);

  // Reminders state
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(false);

  useEffect(() => {
    loadAllData();
    checkNotificationPermission();
  }, [initialPatient]);

  const checkNotificationPermission = () => {
    if ('Notification' in window && Notification.permission === 'granted') {
      setNotificationsEnabled(true);
    }
  };

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) return;
    const res = await Notification.requestPermission();
    if (res === 'granted') {
      setNotificationsEnabled(true);
    }
  };

  const loadAllData = async () => {
    setLoading(true);
    try {
      const today = await getTodayDoses();
      const overdue = await getOverdueDoses();

      let filteredToday = today;
      let filteredOverdue = overdue;
      if (activeFamilyId) {
        filteredToday = today.filter((d) => d.patient?.familyId === activeFamilyId);
        filteredOverdue = overdue.filter((d) => d.patient?.familyId === activeFamilyId);
      }

      // Load all schedules for family members or all patients
      const patients = activeFamilyId
        ? await db.patients.where('familyId').equals(activeFamilyId).toArray()
        : await db.patients.toArray();

      let scheduleList: EnrichedSchedule[] = [];
      for (const p of patients) {
        if (p.id) {
          const pSchedules = await getPatientSchedules(p.id);
          scheduleList = [...scheduleList, ...pSchedules];
        }
      }

      // Load wellness goals
      const goals = await getWellnessGoals(initialPatient?.id);

      setTodayDoses(filteredToday);
      setOverdueDoses(filteredOverdue);
      setAllSchedules(scheduleList);
      setWellnessGoals(goals);
    } catch (err) {
      console.error('Failed to load adherence data', err);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkDose = async (doseId: number, taken: boolean) => {
    await markDoseStatus(doseId, taken);
    await loadAllData();
  };

  const handleLogWellness = async (goalId: number, incrementAmount: number) => {
    await logWellnessProgress(goalId, incrementAmount);
    await loadAllData();
  };

  // Combine today & overdue doses based on filter
  let combinedDoses: (EnrichedDoseLog & { isOverdueDose?: boolean })[] = [];

  if (statusFilter === 'overdue') {
    combinedDoses = overdueDoses.map((d) => ({ ...d, isOverdueDose: true }));
  } else if (statusFilter === 'pending') {
    combinedDoses = todayDoses
      .filter((d) => !d.taken && !d.skipped)
      .map((d) => ({ ...d, isOverdueDose: false }));
  } else if (statusFilter === 'completed') {
    combinedDoses = todayDoses
      .filter((d) => d.taken)
      .map((d) => ({ ...d, isOverdueDose: false }));
  } else {
    // 'all': overdue first, then today's pending, then completed
    const overdueWrapped = overdueDoses.map((d) => ({ ...d, isOverdueDose: true }));
    const todayWrapped = todayDoses.map((d) => ({ ...d, isOverdueDose: false }));
    combinedDoses = [...overdueWrapped, ...todayWrapped];
  }

  // Filter by search term
  if (searchTerm.trim()) {
    const st = searchTerm.toLowerCase();
    combinedDoses = combinedDoses.filter(
      (d) =>
        d.patient?.name?.toLowerCase().includes(st) ||
        d.schedule?.medicineName?.toLowerCase().includes(st)
    );
  }

  // Filter schedules by search term
  const filteredSchedules = allSchedules.filter(
    (s) =>
      s.patientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.medicineName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const texts = currentLang === 'gu'
    ? {
        title: 'દવા પાલન અને દૈનિક સ્વાસ્થ્ય ટ્રેકર',
        subtitle: 'પ્રત્યક્ષ અવલોકિત ઉપચાર (DOT) અને દૈનિક સ્વાસ્થ્ય ટેવ મોનિટર',
        tabToday: 'આજના ડોઝ',
        tabSchedules: 'દવા સમયપત્રક અને પાલન',
        tabWellness: 'સ્વાસ્થ્ય ધ્યેયો',
        addSchedule: 'નવું સમયપત્રક સેટ કરો',
        addGoal: 'નવું ધ્યેય ઉમેરો',
        searchPlaceholder: 'દર્દીનું નામ અથવા દવાનું નામ શોધો...',
        overdueBanner: 'વિલંબિત (ઓવરડ્યુ) ડોઝ',
        noDoses: 'કોઈ ડોઝ બાકી નથી.',
        allTaken: 'આજના તમામ ડોઝ પૂર્ણ થયા છે.',
        enableReminders: 'નોટિફિકેશન ચાલુ કરો',
        remindersEnabled: 'નોટિફિકેશન સક્રિય'
      }
    : currentLang === 'hi'
    ? {
        title: 'दवा अनुपालन एवं दैनिक स्वास्थ्य ट्रैकर',
        subtitle: 'प्रत्यक्ष प्रेक्षित उपचार (DOT) साथी एवं दैनिक स्वास्थ्य आदत मॉनिटर',
        tabToday: 'आज की खुराक',
        tabSchedules: 'दवा अनुसूची एवं अनुपालन',
        tabWellness: 'स्वास्थ्य लक्ष्य',
        addSchedule: 'नई अनुसूची सेट करें',
        addGoal: 'नया लक्ष्य जोड़ें',
        searchPlaceholder: 'रोगी का नाम या दवा का नाम खोजें...',
        overdueBanner: 'अतिदेय (ओवरड्यू) खुराक',
        noDoses: 'कोई खुराक लंबित नहीं है।',
        allTaken: 'आज की सभी खुराकें पूर्ण हो चुकी हैं।',
        enableReminders: 'सूचनाएं चालू करें',
        remindersEnabled: 'सूचनाएं सक्रिय'
      }
    : {
        title: 'Medication Adherence & Wellness Tracker',
        subtitle: 'Directly Observed Treatment (DOT) Companion & Personal Wellness Habits',
        tabToday: "Today's Doses",
        tabSchedules: 'Schedules & Adherence',
        tabWellness: 'Wellness Goals',
        addSchedule: 'Add Medication Schedule',
        addGoal: 'Add Wellness Goal',
        searchPlaceholder: 'Search by patient or medicine name...',
        overdueBanner: 'Overdue Doses',
        noDoses: 'No doses pending in this view.',
        allTaken: 'All doses for today have been completed.',
        enableReminders: 'Enable Dose Reminders',
        remindersEnabled: 'Dose Reminders Active'
      };

  return (
    <div className="min-h-screen bg-[#F4F7F6] text-slate-800 font-sans p-3 sm:p-6 md:p-8 space-y-6">
      
      {/* Top Header Card */}
      <div className="bg-white rounded-3xl p-4 sm:p-6 shadow-sm border border-slate-200/80 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={onBackToHome}
              className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl transition cursor-pointer"
              title="Back to Home"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 font-display flex items-center gap-2">
                <Pill className="w-6 h-6 text-emerald-700" />
                <span>{texts.title}</span>
              </h1>
              <p className="text-xs text-slate-500 font-medium">{texts.subtitle}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
            <button
              onClick={requestNotificationPermission}
              className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer border ${
                notificationsEnabled
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
              }`}
            >
              <Bell className="w-3.5 h-3.5 text-amber-600" />
              <span>{notificationsEnabled ? texts.remindersEnabled : texts.enableReminders}</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 border-b border-slate-200 pt-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('today')}
            className={`px-4 py-2.5 text-xs font-extrabold rounded-t-xl transition cursor-pointer border-b-2 flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'today'
                ? 'border-emerald-700 text-emerald-900 bg-emerald-50/60'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Clock className="w-4 h-4 text-emerald-700" />
            <span>{texts.tabToday}</span>
            {overdueDoses.length > 0 && (
              <span className="px-2 py-0.5 bg-amber-500 text-white text-[10px] font-bold rounded-full animate-pulse">
                {overdueDoses.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('schedules')}
            className={`px-4 py-2.5 text-xs font-extrabold rounded-t-xl transition cursor-pointer border-b-2 flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'schedules'
                ? 'border-emerald-700 text-emerald-900 bg-emerald-50/60'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <TrendingUp className="w-4 h-4 text-emerald-700" />
            <span>{texts.tabSchedules}</span>
            <span className="px-2 py-0.5 bg-slate-200 text-slate-700 text-[10px] font-bold rounded-full">
              {allSchedules.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('wellness')}
            className={`px-4 py-2.5 text-xs font-extrabold rounded-t-xl transition cursor-pointer border-b-2 flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'wellness'
                ? 'border-teal-700 text-teal-900 bg-teal-50/60'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Activity className="w-4 h-4 text-teal-700" />
            <span>{texts.tabWellness}</span>
          </button>
        </div>
      </div>

      {/* Main Tab Content */}
      <div className="space-y-4">
        
        {/* TAB 1: TODAY'S DOSES */}
        {activeTab === 'today' && (
          <div className="space-y-4">
            
            {/* Filter & Action Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-2xs">
              <div className="flex items-center gap-1.5 overflow-x-auto">
                <button
                  onClick={() => setStatusFilter('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    statusFilter === 'all'
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  All Doses
                </button>
                <button
                  onClick={() => setStatusFilter('overdue')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                    statusFilter === 'overdue'
                      ? 'bg-amber-600 text-white'
                      : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
                  }`}
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Overdue ({overdueDoses.length})</span>
                </button>
                <button
                  onClick={() => setStatusFilter('pending')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    statusFilter === 'pending'
                      ? 'bg-emerald-700 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Pending
                </button>
                <button
                  onClick={() => setStatusFilter('completed')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    statusFilter === 'completed'
                      ? 'bg-emerald-700 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Completed
                </button>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative flex-1 sm:w-64">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder={texts.searchPlaceholder}
                    className="w-full px-3 py-2 pl-8 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-emerald-600"
                  />
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                </div>

                <button
                  onClick={() => setShowAddSchedule(true)}
                  className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>{texts.addSchedule}</span>
                </button>
              </div>
            </div>

            {/* Doses List */}
            {combinedDoses.length === 0 ? (
              <div className="bg-white rounded-3xl p-8 text-center space-y-2 border border-slate-200">
                <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
                <h3 className="font-extrabold text-slate-800 text-sm font-display">
                  {texts.allTaken}
                </h3>
                <p className="text-xs text-slate-500 font-medium">{texts.noDoses}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {combinedDoses.map((item) => {
                  const isOverdue = item.isOverdueDose;

                  return (
                    <div
                      key={item.id}
                      className={`bg-white rounded-2xl p-4 shadow-2xs border transition-all flex items-start justify-between gap-3 ${
                        isOverdue
                          ? 'border-l-4 border-l-amber-500 border-amber-200 bg-amber-50/30'
                          : item.taken
                          ? 'border-slate-200 bg-slate-50/60 opacity-80'
                          : 'border-slate-200 hover:border-emerald-300'
                      }`}
                    >
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-sm text-slate-900">
                            {item.patient?.name || 'Patient'}
                          </span>
                          {item.patient?.village && (
                            <span className="text-[10px] font-bold text-slate-500 px-2 py-0.5 bg-slate-100 rounded-md">
                              {item.patient.village}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-xs font-bold text-emerald-900">
                          <Pill className="w-3.5 h-3.5 text-emerald-700" />
                          <span>{item.schedule?.medicineName}</span>
                          <span className="text-slate-500 font-medium">({item.schedule?.dosage})</span>
                        </div>

                        <div className="flex items-center gap-2 text-[11px] text-slate-600">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span className="font-bold">
                            {isOverdue ? `Scheduled: ${item.scheduledDate} at ${item.scheduledTime}` : `Today at ${item.scheduledTime}`}
                          </span>
                        </div>

                        {isOverdue && (
                          <div className="text-[11px] font-bold text-amber-800 flex items-center gap-1 pt-0.5">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                            <span>Overdue DOT Dose Observation</span>
                          </div>
                        )}
                      </div>

                      {/* Interactive Circular Checkbox */}
                      <div className="shrink-0 pt-1">
                        {item.taken ? (
                          <button
                            onClick={() => item.id && handleMarkDose(item.id, false)}
                            className="px-3 py-1.5 bg-emerald-100 text-emerald-800 rounded-xl text-xs font-extrabold flex items-center gap-1 hover:bg-emerald-200 transition cursor-pointer"
                          >
                            <Check className="w-4 h-4 text-emerald-700 stroke-[3]" />
                            <span>Taken</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => item.id && handleMarkDose(item.id, true)}
                            className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-extrabold shadow-2xs transition flex items-center gap-1.5 cursor-pointer active:scale-95"
                          >
                            <Check className="w-4 h-4 text-white" />
                            <span>Mark Observed</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: SCHEDULES & ADHERENCE STATS */}
        {activeTab === 'schedules' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3 bg-white p-3 sm:p-4 rounded-2xl border border-slate-200">
              <div className="relative flex-1 max-w-sm">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={texts.searchPlaceholder}
                  className="w-full px-3 py-2 pl-8 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-emerald-600"
                />
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              </div>

              <button
                onClick={() => setShowAddSchedule(true)}
                className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>{texts.addSchedule}</span>
              </button>
            </div>

            {filteredSchedules.length === 0 ? (
              <div className="bg-white rounded-3xl p-8 text-center space-y-2 border border-slate-200">
                <Pill className="w-10 h-10 text-slate-400 mx-auto" />
                <h3 className="font-extrabold text-slate-800 text-sm">No Medication Schedules Found</h3>
                <p className="text-xs text-slate-500">Tap 'Add Medication Schedule' to create a new DOT schedule.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredSchedules.map((schedule) => {
                  const percentage = schedule.stats?.percentage ?? 100;
                  const statusBg =
                    percentage >= 80
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      : percentage >= 50
                      ? 'bg-amber-100 text-amber-800 border-amber-300'
                      : 'bg-red-100 text-red-800 border-red-300';

                  return (
                    <div
                      key={schedule.id}
                      onClick={() => setSelectedSchedule(schedule)}
                      className="bg-white rounded-2xl p-4 shadow-2xs border border-slate-200 hover:border-emerald-400 transition-all cursor-pointer space-y-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="font-extrabold text-sm text-slate-900 block">
                            {schedule.medicineName}
                          </span>
                          <span className="text-xs text-slate-500 font-medium flex items-center gap-1 pt-0.5">
                            <User className="w-3.5 h-3.5 text-slate-400" />
                            <span>{schedule.patientName}</span>
                          </span>
                        </div>

                        {/* Adherence Badge */}
                        <div className={`px-2.5 py-1 rounded-xl text-xs font-black border ${statusBg}`}>
                          {percentage}% Adherence
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
                        <div>
                          <span className="text-slate-400 font-bold block">Dosage:</span>
                          <span className="font-bold text-slate-800">{schedule.dosage}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 font-bold block">Frequency:</span>
                          <span className="font-bold text-slate-800 capitalize">
                            {schedule.frequency.replace('_', ' ')}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs font-bold text-emerald-800 pt-1">
                        <span className="flex items-center gap-1">
                          <BarChart3 className="w-3.5 h-3.5" />
                          <span>View Adherence Ring & History</span>
                        </span>
                        <ChevronRight className="w-4 h-4" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: WELLNESS GOALS */}
        {activeTab === 'wellness' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3 bg-white p-3 sm:p-4 rounded-2xl border border-slate-200">
              <div>
                <h3 className="font-extrabold text-sm text-slate-900 font-display">
                  Daily Wellness & Preventive Health Goals
                </h3>
                <p className="text-xs text-slate-500">Track water hydration, physical exercise, and healthy habits.</p>
              </div>

              <button
                onClick={() => setShowAddGoal(true)}
                className="px-3.5 py-2 bg-teal-700 hover:bg-teal-800 text-white font-extrabold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>{texts.addGoal}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {wellnessGoals.map((item) => {
                const { goal, todayValue, percentage } = item;
                const radius = 32;
                const circumference = 2 * Math.PI * radius;
                const strokeDashoffset = circumference - (percentage / 100) * circumference;

                return (
                  <div
                    key={goal.id}
                    className="bg-white rounded-3xl p-5 shadow-2xs border border-slate-200/80 flex items-center justify-between gap-4"
                  >
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2">
                        {goal.goalType === 'water_intake' ? (
                          <div className="p-2 bg-teal-50 text-teal-700 rounded-xl">
                            <Droplets className="w-5 h-5" />
                          </div>
                        ) : goal.goalType === 'walking' ? (
                          <div className="p-2 bg-emerald-50 text-emerald-700 rounded-xl">
                            <Footprints className="w-5 h-5" />
                          </div>
                        ) : (
                          <div className="p-2 bg-slate-100 text-slate-700 rounded-xl">
                            <Activity className="w-5 h-5" />
                          </div>
                        )}
                        <div>
                          <h4 className="font-extrabold text-sm text-slate-900">{goal.title}</h4>
                          <p className="text-xs text-slate-500 font-medium">
                            Target: {goal.target} {goal.unit} / {goal.frequency}
                          </p>
                        </div>
                      </div>

                      <div className="pt-1">
                        <span className="text-xs font-bold text-slate-700 block">
                          Today's Progress: {todayValue} / {goal.target} {goal.unit}
                        </span>
                      </div>

                      {/* Quick increment buttons */}
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          onClick={() => goal.id && handleLogWellness(goal.id, 1)}
                          className="px-3 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-800 font-extrabold text-xs rounded-xl border border-teal-200 transition cursor-pointer flex items-center gap-1 active:scale-95"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>+1 {goal.unit.slice(0, 6)}</span>
                        </button>
                        {goal.goalType === 'walking' && (
                          <button
                            onClick={() => goal.id && handleLogWellness(goal.id, 10)}
                            className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-extrabold text-xs rounded-xl border border-emerald-200 transition cursor-pointer flex items-center gap-1 active:scale-95"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>+10 mins</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Circular SVG Progress Ring */}
                    <div className="relative w-20 h-20 flex items-center justify-center shrink-0">
                      <svg className="w-20 h-20 transform -rotate-90">
                        <circle
                          cx="40"
                          cy="40"
                          r={radius}
                          className="stroke-slate-100"
                          strokeWidth="6"
                          fill="transparent"
                        />
                        <circle
                          cx="40"
                          cy="40"
                          r={radius}
                          stroke="#0D9488"
                          strokeWidth="6"
                          strokeDasharray={circumference}
                          strokeDashoffset={strokeDashoffset}
                          strokeLinecap="round"
                          fill="transparent"
                          className="transition-all duration-500 ease-out"
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                        <span className="text-sm font-black text-slate-900 font-display">
                          {percentage}%
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* MODALS */}
      {selectedSchedule && (
        <ScheduleDetailModal
          schedule={selectedSchedule}
          currentLang={currentLang}
          onClose={() => setSelectedSchedule(null)}
          onUpdate={loadAllData}
        />
      )}

      {showAddSchedule && (
        <AddScheduleModal
          initialPatientId={initialPatient?.id}
          currentLang={currentLang}
          onClose={() => setShowAddSchedule(false)}
          onSaveSuccess={() => {
            setShowAddSchedule(false);
            loadAllData();
          }}
        />
      )}

      {showAddGoal && (
        <AddGoalModal
          patientId={initialPatient?.id}
          currentLang={currentLang}
          onClose={() => setShowAddGoal(false)}
          onSaveSuccess={() => {
            setShowAddGoal(false);
            loadAllData();
          }}
        />
      )}
    </div>
  );
};
