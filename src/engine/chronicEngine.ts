import { ChronicLog, LanguageCode } from '../types';
import { getChronicLogsForPatient } from '../db/db';
import nudgesData from '../data/nudges.json';

export interface ChronicTrendAnalysis {
  patientId: number;
  totalLogs: number;
  morningGlucoseAvg7d: number | null;
  eveningGlucoseAvg7d: number | null;
  morningGlucoseAvg30d: number | null;
  eveningGlucoseAvg30d: number | null;
  glucoseSlope: number; // OLS linear regression slope in mg/dL per day
  trendDirection: 'rising' | 'falling' | 'stable';
  adherenceRatePercent: number; // 0 to 100
  avgExerciseMinutes: number;
  avgWaterIntakeGlasses: number;
  riskLevel: 'low' | 'medium' | 'high';
  matchedNudges: { key: string; text: string }[];
  recentLogs: ChronicLog[];
}

export async function analyzeChronicPatientTrends(
  patientId: number,
  language: LanguageCode = 'en'
): Promise<ChronicTrendAnalysis> {
  const logs = await getChronicLogsForPatient(patientId, 30);
  
  if (!logs || logs.length === 0) {
    return {
      patientId,
      totalLogs: 0,
      morningGlucoseAvg7d: null,
      eveningGlucoseAvg7d: null,
      morningGlucoseAvg30d: null,
      eveningGlucoseAvg30d: null,
      glucoseSlope: 0,
      trendDirection: 'stable',
      adherenceRatePercent: 100,
      avgExerciseMinutes: 0,
      avgWaterIntakeGlasses: 8,
      riskLevel: 'low',
      matchedNudges: [
        {
          key: 'good_control',
          text: (nudgesData as any).good_control[language] || (nudgesData as any).good_control.en
        }
      ],
      recentLogs: []
    };
  }

  // 1. Moving Averages (7 days & 30 days)
  const last7Logs = logs.slice(-7);
  
  const m7 = last7Logs.filter((l) => l.morningGlucose !== undefined && l.morningGlucose > 0);
  const morningAvg7d = m7.length > 0
    ? Math.round(m7.reduce((sum, l) => sum + (l.morningGlucose || 0), 0) / m7.length)
    : null;

  const e7 = last7Logs.filter((l) => l.eveningGlucose !== undefined && l.eveningGlucose > 0);
  const eveningAvg7d = e7.length > 0
    ? Math.round(e7.reduce((sum, l) => sum + (l.eveningGlucose || 0), 0) / e7.length)
    : null;

  const m30 = logs.filter((l) => l.morningGlucose !== undefined && l.morningGlucose > 0);
  const morningAvg30d = m30.length > 0
    ? Math.round(m30.reduce((sum, l) => sum + (l.morningGlucose || 0), 0) / m30.length)
    : null;

  const e30 = logs.filter((l) => l.eveningGlucose !== undefined && l.eveningGlucose > 0);
  const eveningAvg30d = e30.length > 0
    ? Math.round(e30.reduce((sum, l) => sum + (l.eveningGlucose || 0), 0) / e30.length)
    : null;

  // 2. Ordinary Least Squares (OLS) Linear Regression for Glucose Trend Slope
  const validGlucosePoints = logs
    .map((l, idx) => ({
      x: idx,
      y: l.morningGlucose || l.eveningGlucose || 0
    }))
    .filter((p) => p.y > 0);

  let slope = 0;
  if (validGlucosePoints.length >= 2) {
    const n = validGlucosePoints.length;
    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumX2 = 0;

    for (const p of validGlucosePoints) {
      sumX += p.x;
      sumY += p.y;
      sumXY += p.x * p.y;
      sumX2 += p.x * p.x;
    }

    const denominator = n * sumX2 - sumX * sumX;
    if (denominator !== 0) {
      slope = Number(((n * sumXY - sumX * sumY) / denominator).toFixed(2));
    }
  }

  let trendDirection: 'rising' | 'falling' | 'stable' = 'stable';
  if (slope > 1.5) {
    trendDirection = 'rising';
  } else if (slope < -1.5) {
    trendDirection = 'falling';
  }

  // 3. Medication Adherence Rate
  const adherenceCount = logs.filter((l) => l.medicationAdherence).length;
  const adherenceRatePercent = Math.round((adherenceCount / logs.length) * 100);

  // 4. Averages for Activity and Water
  const avgExerciseMinutes = Math.round(
    logs.reduce((acc, curr) => acc + (curr.exerciseMinutes || 0), 0) / logs.length
  );
  const avgWaterIntakeGlasses = Number(
    (logs.reduce((acc, curr) => acc + (curr.waterIntake || 0), 0) / logs.length).toFixed(1)
  );

  // 5. Combined Clinical Risk Evaluation
  let riskLevel: 'low' | 'medium' | 'high' = 'low';

  const effectiveMorning = morningAvg7d || morningAvg30d || 120;
  if (effectiveMorning >= 180 || slope >= 3.0 || (morningAvg7d !== null && morningAvg7d >= 200)) {
    riskLevel = 'high';
  } else if (effectiveMorning >= 140 || trendDirection === 'rising' || adherenceRatePercent < 60) {
    riskLevel = 'medium';
  }

  if (adherenceRatePercent < 50 && riskLevel === 'low') {
    riskLevel = 'medium';
  }

  // 6. Matched Personalized Nudges
  const matchedNudges: { key: string; text: string }[] = [];
  const getNudgeText = (key: string) => {
    return (nudgesData as any)[key]?.[language] || (nudgesData as any)[key]?.en || '';
  };

  if (trendDirection === 'rising') {
    matchedNudges.push({ key: 'glucose_rising', text: getNudgeText('glucose_rising') });
  }
  if (effectiveMorning >= 180) {
    matchedNudges.push({ key: 'glucose_high', text: getNudgeText('glucose_high') });
  }
  if (adherenceRatePercent < 70) {
    matchedNudges.push({ key: 'adherence_low', text: getNudgeText('adherence_low') });
  }
  if (avgExerciseMinutes < 20) {
    matchedNudges.push({ key: 'low_activity', text: getNudgeText('low_activity') });
  }
  if (avgWaterIntakeGlasses < 6) {
    matchedNudges.push({ key: 'low_water', text: getNudgeText('low_water') });
  }
  if (matchedNudges.length === 0) {
    matchedNudges.push({ key: 'good_control', text: getNudgeText('good_control') });
  }

  return {
    patientId,
    totalLogs: logs.length,
    morningGlucoseAvg7d: morningAvg7d,
    eveningGlucoseAvg7d: eveningAvg7d,
    morningGlucoseAvg30d: morningAvg30d,
    eveningGlucoseAvg30d: eveningAvg30d,
    glucoseSlope: slope,
    trendDirection,
    adherenceRatePercent,
    avgExerciseMinutes,
    avgWaterIntakeGlasses,
    riskLevel,
    matchedNudges,
    recentLogs: logs
  };
}
