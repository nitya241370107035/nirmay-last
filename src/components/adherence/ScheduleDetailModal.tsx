import React, { useState, useEffect } from 'react';
import {
  X,
  Pill,
  Calendar,
  Clock,
  User,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  BarChart3,
  Pause,
  Play,
  RotateCcw,
  Check,
  Edit3,
  Plus,
  Save
} from 'lucide-react';
import {
  EnrichedSchedule,
  getScheduleDoseHistory,
  toggleScheduleActive,
  markDoseStatus,
  calculateAdherence,
  updateScheduleTimes
} from '../../engine/adherenceEngine';
import { LanguageCode, DoseLog } from '../../types';

interface ScheduleDetailModalProps {
  schedule: EnrichedSchedule;
  currentLang: LanguageCode;
  onClose: () => void;
  onUpdate: () => void;
}

export const ScheduleDetailModal: React.FC<ScheduleDetailModalProps> = ({
  schedule,
  currentLang,
  onClose,
  onUpdate
}) => {
  const [history, setHistory] = useState<DoseLog[]>([]);
  const [stats, setStats] = useState(schedule.stats);
  const [isActive, setIsActive] = useState<boolean>(schedule.active);
  const [loading, setLoading] = useState<boolean>(true);
  const [showHistory, setShowHistory] = useState<boolean>(false);

  // Editable dose times state
  const [isEditingTimes, setIsEditingTimes] = useState<boolean>(false);
  const [editableTimes, setEditableTimes] = useState<string[]>(
    schedule.customTimes && schedule.customTimes.length > 0
      ? schedule.customTimes
      : ['08:00']
  );
  const [savingTimes, setSavingTimes] = useState<boolean>(false);

  useEffect(() => {
    loadData();
  }, [schedule.id]);

  const loadData = async () => {
    if (!schedule.id) return;
    setLoading(true);
    const logs = await getScheduleDoseHistory(schedule.id);
    const updatedStats = await calculateAdherence(schedule.id, 30);
    setHistory(logs);
    setStats(updatedStats);
    setLoading(false);
  };

  const handleToggleActive = async () => {
    if (!schedule.id) return;
    const newStatus = !isActive;
    await toggleScheduleActive(schedule.id, newStatus);
    setIsActive(newStatus);
    onUpdate();
  };

  const handleMarkDose = async (doseId: number, taken: boolean) => {
    await markDoseStatus(doseId, taken);
    await loadData();
    onUpdate();
  };

  const handleSaveTimes = async () => {
    if (!schedule.id) return;
    setSavingTimes(true);
    await updateScheduleTimes(schedule.id, editableTimes);
    setSavingTimes(false);
    setIsEditingTimes(false);
    await loadData();
    onUpdate();
  };

  const percentage = stats?.percentage ?? 100;
  const statusColor =
    percentage >= 80
      ? 'text-emerald-700 stroke-emerald-600 bg-emerald-50 border-emerald-200'
      : percentage >= 50
      ? 'text-amber-700 stroke-amber-500 bg-amber-50 border-amber-200'
      : 'text-red-700 stroke-red-500 bg-red-50 border-red-200';

  const ringStrokeColor = percentage >= 80 ? '#2E7D73' : percentage >= 50 ? '#D97706' : '#DC2626';

  // SVG progress ring calculation
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const labels = {
    title: currentLang === 'gu' ? 'દવાના સમયપત્રકની વિગતો' : currentLang === 'hi' ? 'दवा अनुसूची विवरण' : 'Medication Schedule & DOT Details',
    patient: currentLang === 'gu' ? 'દર્દી:' : currentLang === 'hi' ? 'रोगी:' : 'Patient:',
    dosage: currentLang === 'gu' ? 'માત્રા (ડોઝ):' : currentLang === 'hi' ? 'मात्रा (खुराक):' : 'Dosage:',
    frequency: currentLang === 'gu' ? 'આવૃત્તિ:' : currentLang === 'hi' ? 'आवृत्ति:' : 'Frequency:',
    startDate: currentLang === 'gu' ? 'શરૂઆત તારીખ:' : currentLang === 'hi' ? 'प्रारंभ तिथि:' : 'Start Date:',
    adherence30Days: currentLang === 'gu' ? '૩૦ દિવસ પાલન દર' : currentLang === 'hi' ? '30 दिवसीय अनुपालन दर' : '30-Day Adherence Rate',
    summary: currentLang === 'gu'
      ? `${stats?.takenCount || 0} માંથી ${stats?.totalCount || 0} ડોઝ લીધા છે.`
      : currentLang === 'hi'
      ? `${stats?.totalCount || 0} में से ${stats?.takenCount || 0} खुराक ली गई हैं।`
      : `${stats?.takenCount || 0} out of ${stats?.totalCount || 0} doses taken in last 30 days.`,
    chartTitle: currentLang === 'gu' ? 'છેલ્લા ૭ દિવસનો ઇતિહાસ' : currentLang === 'hi' ? 'पिछले 7 दिनों का इतिहास' : 'Last 7 Days Compliance Breakdown',
    viewHistory: currentLang === 'gu' ? 'સંપૂર્ણ ઇતિહાસ જુઓ' : currentLang === 'hi' ? 'पूरा इतिहास देखें' : 'View Full Dose History',
    hideHistory: currentLang === 'gu' ? 'ઇતિહાસ સંતાડો' : currentLang === 'hi' ? 'इतिहास छिपाएं' : 'Hide Dose History',
    pause: currentLang === 'gu' ? 'સમયપત્રક સ્થગિત કરો' : currentLang === 'hi' ? 'अनुसूची रोकें' : 'Pause Schedule',
    resume: currentLang === 'gu' ? 'સમયપત્રક ફરી શરૂ કરો' : currentLang === 'hi' ? 'अनुसूची पुनः शुरू करें' : 'Resume Schedule'
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-6 space-y-5 shadow-2xl border border-slate-200 relative my-auto animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-emerald-50 text-emerald-800 rounded-2xl border border-emerald-200">
              <Pill className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-extrabold text-base sm:text-lg text-slate-900 font-display">
                {schedule.medicineName}
              </h3>
              <p className="text-xs text-slate-500 font-medium flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span>{schedule.patientName || 'Patient'}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Schedule Key Specs */}
        <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-3 rounded-2xl border border-slate-200/80">
          <div>
            <span className="text-slate-400 font-bold block">{labels.dosage}</span>
            <span className="font-bold text-slate-800">{schedule.dosage}</span>
          </div>
          <div>
            <span className="text-slate-400 font-bold block">{labels.frequency}</span>
            <span className="font-bold text-slate-800 capitalize">
              {schedule.frequency.replace('_', ' ')}
            </span>
          </div>
          <div>
            <span className="text-slate-400 font-bold block">{labels.startDate}</span>
            <span className="font-bold text-slate-800">{schedule.startDate}</span>
          </div>
          <div>
            <span className="text-slate-400 font-bold block">Status:</span>
            <span
              className={`inline-flex items-center gap-1 font-extrabold text-[11px] px-2 py-0.5 rounded-md ${
                isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
              }`}
            >
              {isActive ? 'Active Schedule' : 'Paused'}
            </span>
          </div>
        </div>

        {/* Managed Dose Times Card */}
        <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/80 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-700 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-emerald-700" />
              <span>
                {currentLang === 'gu'
                  ? 'દવા લેવાનો સમય (તમારી અનુકૂળતા મુજબ):'
                  : currentLang === 'hi'
                  ? 'दवा लेने का समय (आपकी पसंद अनुसार):'
                  : 'Scheduled Dose Times (Custom Preference):'}
              </span>
            </span>

            {!isEditingTimes ? (
              <button
                type="button"
                onClick={() => setIsEditingTimes(true)}
                className="px-2.5 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-extrabold rounded-lg transition text-[11px] flex items-center gap-1 cursor-pointer"
              >
                <Edit3 className="w-3 h-3" />
                <span>{currentLang === 'gu' ? 'સમય બદલો' : currentLang === 'hi' ? 'समय बदलें' : 'Edit Times'}</span>
              </button>
            ) : (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setIsEditingTimes(false)}
                  className="px-2 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-lg text-[11px] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveTimes}
                  disabled={savingTimes}
                  className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold rounded-lg text-[11px] flex items-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-3 h-3" />
                  <span>{savingTimes ? 'Saving...' : 'Save'}</span>
                </button>
              </div>
            )}
          </div>

          {!isEditingTimes ? (
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {(schedule.customTimes && schedule.customTimes.length > 0 ? schedule.customTimes : ['08:00']).map((tStr, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-1 bg-white text-slate-900 border border-slate-300 font-black rounded-xl text-xs flex items-center gap-1 shadow-2xs"
                >
                  <Clock className="w-3 h-3 text-emerald-700" />
                  {tStr}
                </span>
              ))}
            </div>
          ) : (
            <div className="space-y-2 pt-1">
              <div className="flex flex-wrap items-center gap-2">
                {editableTimes.map((tVal, idx) => (
                  <div key={idx} className="flex items-center gap-1 bg-white p-1.5 rounded-xl border border-slate-300 shadow-2xs">
                    <input
                      type="time"
                      value={tVal}
                      onChange={(e) => {
                        const updated = [...editableTimes];
                        updated[idx] = e.target.value;
                        setEditableTimes(updated);
                      }}
                      className="bg-transparent font-bold text-slate-900 focus:outline-none text-xs cursor-pointer"
                    />
                    {editableTimes.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setEditableTimes(editableTimes.filter((_, i) => i !== idx))}
                        className="text-slate-400 hover:text-red-600 p-0.5 rounded-md cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}

                <button
                  type="button"
                  onClick={() => setEditableTimes([...editableTimes, '12:00'])}
                  className="px-2.5 py-1.5 bg-emerald-50 text-emerald-800 font-extrabold border border-emerald-200 rounded-xl text-xs hover:bg-emerald-100 transition cursor-pointer flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Time
                </button>
              </div>

              {/* Quick presets in edit mode */}
              <div className="flex flex-wrap items-center gap-1">
                <span className="text-[10px] text-slate-400 font-bold">Quick Presets:</span>
                {[
                  { label: 'Morning (08:00)', val: '08:00' },
                  { label: 'Afternoon (13:00)', val: '13:00' },
                  { label: 'Evening (18:00)', val: '18:00' },
                  { label: 'Night (21:00)', val: '21:00' }
                ].map((qp, qpIdx) => (
                  <button
                    key={qpIdx}
                    type="button"
                    onClick={() => {
                      if (!editableTimes.includes(qp.val)) {
                        setEditableTimes([...editableTimes, qp.val].sort());
                      }
                    }}
                    className="px-2 py-0.5 bg-slate-200 hover:bg-emerald-200 text-slate-800 font-bold rounded-md text-[10px] cursor-pointer"
                  >
                    + {qp.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Adherence Circular Progress Ring */}
        <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row items-center gap-4 ${statusColor}`}>
          <div className="relative w-24 h-24 flex items-center justify-center shrink-0">
            <svg className="w-24 h-24 transform -rotate-90">
              <circle
                cx="48"
                cy="48"
                r={radius}
                className="stroke-slate-200"
                strokeWidth="8"
                fill="transparent"
              />
              <circle
                cx="48"
                cy="48"
                r={radius}
                stroke={ringStrokeColor}
                strokeWidth="8"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="transparent"
                className="transition-all duration-700 ease-out"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-xl font-black font-display tracking-tight text-slate-900">
                {percentage}%
              </span>
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                Adherence
              </span>
            </div>
          </div>

          <div className="space-y-1 text-center sm:text-left">
            <h4 className="font-extrabold text-sm text-slate-900">{labels.adherence30Days}</h4>
            <p className="text-xs text-slate-700 font-medium">{labels.summary}</p>
            <div className="text-[11px] font-bold pt-1">
              {percentage >= 80 ? (
                <span className="text-emerald-700 flex items-center gap-1 justify-center sm:justify-start">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Optimal Adherence Level
                </span>
              ) : percentage >= 50 ? (
                <span className="text-amber-700 flex items-center gap-1 justify-center sm:justify-start">
                  <AlertTriangle className="w-3.5 h-3.5" /> Moderate Adherence – Health Worker Counselling Recommended
                </span>
              ) : (
                <span className="text-red-700 flex items-center gap-1 justify-center sm:justify-start">
                  <AlertTriangle className="w-3.5 h-3.5" /> Critical Non-Adherence Risk – Urgent DOT Supervision Needed
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 7-Day Horizontal Bar Breakdown */}
        {stats?.last7Days && (
          <div className="space-y-2 pt-1">
            <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <BarChart3 className="w-4 h-4 text-emerald-700" />
              <span>{labels.chartTitle}</span>
            </h4>

            <div className="grid grid-cols-7 gap-1.5 pt-1 text-center">
              {stats.last7Days.map((day, idx) => (
                <div key={idx} className="space-y-1 flex flex-col items-center">
                  <div className="w-full bg-slate-100 rounded-lg h-14 flex flex-col justify-end p-0.5 relative overflow-hidden border border-slate-200">
                    <div
                      className={`w-full rounded-md transition-all ${
                        day.total === 0
                          ? 'bg-slate-200'
                          : day.allTaken
                          ? 'bg-emerald-600'
                          : day.taken > 0
                          ? 'bg-amber-500'
                          : 'bg-red-500'
                      }`}
                      style={{
                        height: day.total > 0 ? `${(day.taken / day.total) * 100}%` : '10%'
                      }}
                    />
                  </div>
                  <span className="text-[10px] font-bold text-slate-600 block">{day.label}</span>
                  <span className="text-[9px] font-mono font-semibold text-slate-500">
                    {day.total > 0 ? `${day.taken}/${day.total}` : '-'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Controls */}
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={handleToggleActive}
            className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
              isActive
                ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
            }`}
          >
            {isActive ? (
              <>
                <Pause className="w-3.5 h-3.5" />
                <span>{labels.pause}</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" />
                <span>{labels.resume}</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => setShowHistory(!showHistory)}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
          >
            <Clock className="w-3.5 h-3.5 text-emerald-400" />
            <span>{showHistory ? labels.hideHistory : labels.viewHistory}</span>
          </button>
        </div>

        {/* Scrollable Dose History Drawer */}
        {showHistory && (
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl max-h-52 overflow-y-auto space-y-2 text-xs">
            <h5 className="font-bold text-slate-800 text-[11px] uppercase font-mono tracking-wider">
              Dose Observation History
            </h5>
            {history.length === 0 ? (
              <p className="text-slate-500 italic py-2">No past dose logs available.</p>
            ) : (
              <div className="space-y-1.5">
                {history.map((item) => (
                  <div
                    key={item.id}
                    className="p-2 bg-white rounded-xl border border-slate-200 flex items-center justify-between gap-2"
                  >
                    <div>
                      <span className="font-bold text-slate-800 block">
                        {item.scheduledDate} at {item.scheduledTime}
                      </span>
                      {item.takenAt && (
                        <span className="text-[10px] text-slate-500 block">
                          Observed at {new Date(item.takenAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      {item.taken ? (
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-extrabold text-[10px] rounded-md flex items-center gap-1">
                          <Check className="w-3 h-3 text-emerald-700" /> Taken
                        </span>
                      ) : item.skipped ? (
                        <span className="px-2 py-0.5 bg-slate-200 text-slate-700 font-extrabold text-[10px] rounded-md">
                          Skipped
                        </span>
                      ) : (
                        <button
                          onClick={() => item.id && handleMarkDose(item.id, true)}
                          className="px-2.5 py-1 bg-emerald-600 text-white font-bold text-[10px] rounded-md hover:bg-emerald-700 transition cursor-pointer"
                        >
                          Mark Observed
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
