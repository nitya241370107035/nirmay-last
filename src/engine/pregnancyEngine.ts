import mchDangerSigns from '../data/mch_danger_signs.json';
import { MultilingualText } from '../types';

export interface PregnancyCalculationResult {
  lmpDateStr: string;
  eddDate: Date;
  eddFormatted: string;
  gestationalAgeWeeks: number;
  gestationalAgeDays: number;
  trimester: 'first' | 'second' | 'third';
  isPostTerm: boolean;
  daysRemaining: number;
  progressPercent: number; // 0 to 100%
}

export interface DangerSignItem {
  id: string;
  label: MultilingualText;
  action: 'emergency' | 'urgent' | 'routine';
}

export interface DangerSignStage {
  title: MultilingualText;
  signs: DangerSignItem[];
}

/**
 * Calculates EDD, Gestational Age, Trimester and Post-term status from LMP using Naegele's rule
 */
export function calculatePregnancy(lmpDateInput: string | Date): PregnancyCalculationResult {
  const lmp = typeof lmpDateInput === 'string' ? new Date(lmpDateInput) : lmpDateInput;
  
  // Naegele's rule: EDD = LMP + 280 days (40 weeks)
  const eddTime = lmp.getTime() + 280 * 24 * 60 * 60 * 1000;
  const eddDate = new Date(eddTime);

  const today = new Date();
  // Clear hours for accurate day calculation
  const lmpStart = new Date(lmp.getFullYear(), lmp.getMonth(), lmp.getDate());
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  const diffTime = Math.max(0, todayStart.getTime() - lmpStart.getTime());
  const totalDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  const gestationalAgeWeeks = Math.floor(totalDays / 7);
  const gestationalAgeDays = totalDays % 7;

  let trimester: 'first' | 'second' | 'third' = 'first';
  if (gestationalAgeWeeks >= 27) {
    trimester = 'third';
  } else if (gestationalAgeWeeks >= 14) {
    trimester = 'second';
  }

  const isPostTerm = gestationalAgeWeeks > 40;

  const remainingMs = eddTime - todayStart.getTime();
  const daysRemaining = Math.ceil(remainingMs / (1000 * 60 * 60 * 24));

  // Progress percentage capped at 100%
  const progressPercent = Math.min(100, Math.max(0, Math.round((totalDays / 280) * 100)));

  // Format EDD e.g., "15 Oct 2026"
  const eddFormatted = eddDate.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  const lmpDateStr = lmp.toISOString().split('T')[0];

  return {
    lmpDateStr,
    eddDate,
    eddFormatted,
    gestationalAgeWeeks,
    gestationalAgeDays,
    trimester,
    isPostTerm,
    daysRemaining,
    progressPercent
  };
}

/**
 * Returns danger signs for a given category and stage from mch_danger_signs.json
 */
export function getDangerSigns(
  category: 'antenatal' | 'postnatal',
  stage: 'first_trimester' | 'second_trimester' | 'third_trimester' | 'mother' | 'newborn'
): DangerSignStage | null {
  try {
    const catData = (mchDangerSigns as any)[category];
    if (!catData) return null;
    const stageData = catData[stage];
    if (!stageData) return null;
    return stageData as DangerSignStage;
  } catch {
    return null;
  }
}
