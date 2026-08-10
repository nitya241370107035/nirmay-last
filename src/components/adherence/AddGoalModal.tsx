import React, { useState } from 'react';
import { X, Plus, Activity, Droplets, Footprints, Check } from 'lucide-react';
import { WellnessGoalType, LanguageCode } from '../../types';
import { createWellnessGoal } from '../../engine/adherenceEngine';

interface AddGoalModalProps {
  patientId?: number;
  currentLang: LanguageCode;
  onClose: () => void;
  onSaveSuccess: () => void;
}

export const AddGoalModal: React.FC<AddGoalModalProps> = ({
  patientId,
  currentLang,
  onClose,
  onSaveSuccess
}) => {
  const [goalType, setGoalType] = useState<WellnessGoalType>('water_intake');
  const [title, setTitle] = useState<string>('');
  const [target, setTarget] = useState<number>(8);
  const [unit, setUnit] = useState<string>('glasses');
  const [frequency, setFrequency] = useState<'daily' | 'weekly'>('daily');

  const [saving, setSaving] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleTypeChange = (type: WellnessGoalType) => {
    setGoalType(type);
    if (type === 'water_intake') {
      setTitle('Daily Water Hydration');
      setTarget(8);
      setUnit('glasses');
    } else if (type === 'walking') {
      setTitle('Daily Physical Walk');
      setTarget(30);
      setUnit('minutes');
    } else if (type === 'medication_generic') {
      setTitle('General Medication Routine');
      setTarget(2);
      setUnit('doses');
    } else {
      setTitle('Custom Health Routine');
      setTarget(1);
      setUnit('times');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (target <= 0) {
      setErrorMsg('Target value must be greater than 0.');
      return;
    }

    setSaving(true);
    setErrorMsg(null);

    try {
      await createWellnessGoal({
        patientId,
        goalType,
        title: title.trim() || 'Health Goal',
        target,
        unit: unit.trim() || 'units',
        frequency,
        active: true
      });

      onSaveSuccess();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save goal.');
    } finally {
      setSaving(false);
    }
  };

  const labels = {
    title: currentLang === 'gu' ? 'નવું સ્વાસ્થ્ય ધ્યેય સેટ કરો' : currentLang === 'hi' ? 'नया स्वास्थ्य लक्ष्य सेट करें' : 'Set New Wellness Goal',
    type: currentLang === 'gu' ? 'ધ્યેય પ્રકાર:' : currentLang === 'hi' ? 'लक्ष्य प्रकार:' : 'Goal Category:',
    goalTitle: currentLang === 'gu' ? 'ધ્યેયનું શીર્ષક:' : currentLang === 'hi' ? 'लक्ष्य शीर्षक:' : 'Goal Title:',
    target: currentLang === 'gu' ? 'દૈનિક લક્ષ્યાંક:' : currentLang === 'hi' ? 'दैनिक लक्ष्य:' : 'Daily Target Amount:',
    unit: currentLang === 'gu' ? 'એકમ:' : currentLang === 'hi' ? 'इकाई:' : 'Unit of Measurement:',
    saveBtn: currentLang === 'gu' ? 'ધ્યેય ઉમેરો' : currentLang === 'hi' ? 'लक्ष्य जोड़ें' : 'Save Wellness Goal'
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-md w-full p-5 sm:p-6 space-y-4 shadow-2xl border border-slate-200 relative my-auto animate-in fade-in zoom-in-95">
        
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-teal-100 text-teal-800 rounded-2xl border border-teal-300">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-extrabold text-base sm:text-lg text-slate-900 font-display">
                {labels.title}
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-medium">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4 text-xs font-sans">
          {/* Category selection */}
          <div>
            <label className="font-bold text-slate-700 block mb-1">{labels.type}</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleTypeChange('water_intake')}
                className={`p-2.5 rounded-xl border flex items-center gap-2 font-bold text-left transition cursor-pointer ${
                  goalType === 'water_intake'
                    ? 'bg-teal-50 border-teal-500 text-teal-900 shadow-xs'
                    : 'bg-slate-50 border-slate-200 text-slate-700'
                }`}
              >
                <Droplets className="w-4 h-4 text-teal-600 shrink-0" />
                <span>Water Hydration</span>
              </button>

              <button
                type="button"
                onClick={() => handleTypeChange('walking')}
                className={`p-2.5 rounded-xl border flex items-center gap-2 font-bold text-left transition cursor-pointer ${
                  goalType === 'walking'
                    ? 'bg-teal-50 border-teal-500 text-teal-900 shadow-xs'
                    : 'bg-slate-50 border-slate-200 text-slate-700'
                }`}
              >
                <Footprints className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Daily Walk</span>
              </button>

              <button
                type="button"
                onClick={() => handleTypeChange('medication_generic')}
                className={`p-2.5 rounded-xl border flex items-center gap-2 font-bold text-left transition cursor-pointer ${
                  goalType === 'medication_generic'
                    ? 'bg-teal-50 border-teal-500 text-teal-900 shadow-xs'
                    : 'bg-slate-50 border-slate-200 text-slate-700'
                }`}
              >
                <Activity className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>Meds / Routine</span>
              </button>

              <button
                type="button"
                onClick={() => handleTypeChange('custom')}
                className={`p-2.5 rounded-xl border flex items-center gap-2 font-bold text-left transition cursor-pointer ${
                  goalType === 'custom'
                    ? 'bg-teal-50 border-teal-500 text-teal-900 shadow-xs'
                    : 'bg-slate-50 border-slate-200 text-slate-700'
                }`}
              >
                <Plus className="w-4 h-4 text-slate-600 shrink-0" />
                <span>Custom Habit</span>
              </button>
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="font-bold text-slate-700 block mb-1">{labels.goalTitle}</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Drink 8 glasses of water daily"
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800 focus:outline-none focus:border-teal-600"
            />
          </div>

          {/* Target & Unit */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">{labels.target}</label>
              <input
                type="number"
                min="1"
                value={target}
                onChange={(e) => setTarget(Number(e.target.value))}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800 focus:outline-none focus:border-teal-600"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">{labels.unit}</label>
              <input
                type="text"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="e.g. glasses, minutes, steps"
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-800 focus:outline-none focus:border-teal-600"
              />
            </div>
          </div>

          {/* Submit */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 bg-teal-700 hover:bg-teal-800 text-white font-extrabold rounded-xl shadow-sm transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>{saving ? 'Saving...' : labels.saveBtn}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
