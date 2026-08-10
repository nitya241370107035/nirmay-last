import seasonalAdvisoryData from '../data/seasonal_advisory.json';
import { MultilingualText, RiskLevel, LanguageCode } from '../types';

export interface SeasonalPrecaution {
  en: string;
  hi: string;
  gu: string;
}

export interface SeasonalAdvisoryDisease {
  disease_id: string;
  disease_name: MultilingualText;
  risk_level: RiskLevel | 'moderate' | 'high' | 'low';
  summary: MultilingualText;
  precautions: SeasonalPrecaution[];
}

export interface MonthAdvisory {
  month: number;
  month_name: MultilingualText;
  season: string;
  advisories: SeasonalAdvisoryDisease[];
}

// In-memory cache for same-day queries
let cachedMonth: number | null = null;
let cachedResult: MonthAdvisory | null = null;
let lastCacheDate: string | null = null;

/**
 * Returns the seasonal health advisories for the given month (1-12).
 * Defaults to current calendar month (1-12).
 */
export function getCurrentSeasonalAdvisory(monthOverride?: number): MonthAdvisory {
  const targetMonth = monthOverride !== undefined && monthOverride >= 1 && monthOverride <= 12
    ? monthOverride
    : new Date().getMonth() + 1;

  const todayStr = new Date().toISOString().slice(0, 10);

  // Return cached result if same month and same day (unless overridden)
  if (
    monthOverride === undefined &&
    cachedMonth === targetMonth &&
    lastCacheDate === todayStr &&
    cachedResult
  ) {
    return cachedResult;
  }

  const found = (seasonalAdvisoryData as MonthAdvisory[]).find(
    (item) => item.month === targetMonth
  );

  const fallback: MonthAdvisory = {
    month: targetMonth,
    month_name: {
      en: getEnglishMonthName(targetMonth),
      hi: getHindiMonthName(targetMonth),
      gu: getGujaratiMonthName(targetMonth),
    },
    season: 'General',
    advisories: [],
  };

  const result = found || fallback;

  if (monthOverride === undefined) {
    cachedMonth = targetMonth;
    lastCacheDate = todayStr;
    cachedResult = result;
  }

  return result;
}

/**
 * Get advisories for a specific month (1-12)
 */
export function getSeasonalAdvisoryByMonth(month: number): MonthAdvisory {
  return getCurrentSeasonalAdvisory(month);
}

/**
 * Get all 12 months advisories for calendar view
 */
export function getAllSeasonalAdvisories(): MonthAdvisory[] {
  return seasonalAdvisoryData as MonthAdvisory[];
}

// Helper month name fallbacks
function getEnglishMonthName(m: number): string {
  const names = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  return names[m - 1] || 'Month';
}

function getHindiMonthName(m: number): string {
  const names = ['जनवरी', 'फरवरी', 'मार्च', 'अप्रैल', 'मई', 'जून', 'जुलाई', 'अगस्त', 'सितंबर', 'अक्टूबर', 'नवंबर', 'दिसंबर'];
  return names[m - 1] || 'माह';
}

function getGujaratiMonthName(m: number): string {
  const names = ['જાન્યુઆરી', 'ફેબ્રુઆરી', 'માર્ચ', 'એપ્રિલ', 'મે', 'જૂન', 'જુલાઈ', 'ઑગસ્ટ', 'સપ્ટેમ્બર', 'ઓક્ટોબર', 'નવેમ્બર', 'ડિસેમ્બર'];
  return names[m - 1] || 'મહિનો';
}
