import React, { useState, useEffect } from 'react';
import { Pill, Plus, Clock, Check, BarChart3, TrendingUp, AlertTriangle } from 'lucide-react';
import { Patient, LanguageCode } from '../../types';
import {
  getPatientSchedules,
  markDoseStatus,
  EnrichedSchedule
} from '../../engine/adherenceEngine';
import { AddScheduleModal } from './AddScheduleModal';
import { ScheduleDetailModal } from './ScheduleDetailModal';

interface PatientDetailAdherenceTabProps {
  patient: Patient;
  currentLang: LanguageCode;
}

export const PatientDetailAdherenceTab: React.FC<PatientDetailAdherenceTabProps> = ({
  patient,
  currentLang
}) => {
  const [schedules, setSchedules] = useState<EnrichedSchedule[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [selectedSchedule, setSelectedSchedule] = useState<EnrichedSchedule | null>(null);

  useEffect(() => {
    loadSchedules();
  }, [patient.id]);

  const loadSchedules = async () => {
    if (!patient.id) return;
    setLoading(true);
    const list = await getPatientSchedules(patient.id);
    setSchedules(list);
    setLoading(false);
  };

  const handleMarkDose = async (doseId: number, taken: boolean) => {
    await markDoseStatus(doseId, taken);
    await loadSchedules();
  };

  const labels = {
    title: currentLang === 'gu' ? 'દવા સમયપત્રક અને DOT પાલન' : currentLang === 'hi' ? 'दवा अनुसूची एवं DOT अनुपालन' : 'Medication Schedules & DOT Adherence',
    addBtn: currentLang === 'gu' ? 'સમયપત્રક ઉમેરો' : currentLang === 'hi' ? 'अनुसूची जोड़ें' : 'Add Schedule',
    noSchedules: currentLang === 'gu' ? 'આ દર્દી માટે કોઈ સક્રિય સમયપત્રક નથી.' : currentLang === 'hi' ? 'इस रोगी के लिए कोई सक्रिय अनुसूची नहीं है।' : 'No active medication schedules recorded for this patient.',
    todayTitle: currentLang === 'gu' ? 'આજના ડોઝ:' : currentLang === 'hi' ? 'आज की खुराक:' : "Today's Doses:"
  };

  return (
    <div className="space-y-4 pt-2">
      <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-3">
        <h4 className="font-extrabold text-sm text-slate-900 font-display flex items-center gap-2">
          <Pill className="w-4 h-4 text-emerald-700" />
          <span>{labels.title}</span>
        </h4>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-xs rounded-xl shadow-2xs transition flex items-center gap-1 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{labels.addBtn}</span>
        </button>
      </div>

      {loading ? (
        <p className="text-xs text-slate-400 py-4">Loading medication schedules...</p>
      ) : schedules.length === 0 ? (
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-center space-y-1">
          <p className="text-xs text-slate-600 font-medium">{labels.noSchedules}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {schedules.map((s) => {
            const pct = s.stats?.percentage ?? 100;
            const badgeBg =
              pct >= 80
                ? 'bg-emerald-100 text-emerald-800'
                : pct >= 50
                ? 'bg-amber-100 text-amber-800'
                : 'bg-red-100 text-red-800';

            return (
              <div
                key={s.id}
                className="p-3.5 bg-white border border-slate-200/90 rounded-2xl shadow-2xs space-y-3 hover:border-emerald-300 transition"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="font-extrabold text-xs text-slate-900 block">
                      {s.medicineName}
                    </span>
                    <span className="text-[11px] text-slate-500 font-medium">
                      {s.dosage} ({s.frequency.replace('_', ' ')})
                    </span>
                  </div>

                  <button
                    onClick={() => setSelectedSchedule(s)}
                    className={`px-2.5 py-1 rounded-xl text-[11px] font-black cursor-pointer ${badgeBg}`}
                  >
                    {pct}% Adherence
                  </button>
                </div>

                {/* Today's doses for this schedule */}
                {s.todayDoses && s.todayDoses.length > 0 && (
                  <div className="pt-2 border-t border-slate-100 space-y-1.5 text-xs">
                    <span className="font-bold text-slate-700 text-[11px] block">{labels.todayTitle}</span>
                    {s.todayDoses.map((td) => (
                      <div
                        key={td.id}
                        className="flex items-center justify-between gap-2 p-2 bg-slate-50 rounded-xl"
                      >
                        <span className="font-medium text-slate-800 flex items-center gap-1 text-[11px]">
                          <Clock className="w-3 h-3 text-slate-400" /> At {td.scheduledTime}
                        </span>

                        {td.taken ? (
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold text-[10px] rounded-md flex items-center gap-1">
                            <Check className="w-3 h-3 text-emerald-700" /> Taken
                          </span>
                        ) : (
                          <button
                            onClick={() => td.id && handleMarkDose(td.id, true)}
                            className="px-2.5 py-1 bg-emerald-700 text-white font-bold text-[10px] rounded-md hover:bg-emerald-800 transition cursor-pointer"
                          >
                            Mark Observed
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showAddModal && (
        <AddScheduleModal
          initialPatientId={patient.id}
          currentLang={currentLang}
          onClose={() => setShowAddModal(false)}
          onSaveSuccess={() => {
            setShowAddModal(false);
            loadSchedules();
          }}
        />
      )}

      {selectedSchedule && (
        <ScheduleDetailModal
          schedule={selectedSchedule}
          currentLang={currentLang}
          onClose={() => setSelectedSchedule(null)}
          onUpdate={loadSchedules}
        />
      )}
    </div>
  );
};
