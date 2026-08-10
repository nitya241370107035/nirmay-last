import { db } from '../db/db';
import {
  MedicationSchedule,
  DoseLog,
  WellnessGoal,
  WellnessLog,
  MedicationFrequency,
  WellnessGoalType,
  Patient
} from '../types';

export interface EnrichedDoseLog extends DoseLog {
  schedule?: MedicationSchedule;
  patient?: Patient;
  isOverdue?: boolean;
}

export interface AdherenceStats {
  percentage: number;
  takenCount: number;
  totalCount: number;
  skippedCount: number;
  status: 'high' | 'moderate' | 'low';
  last7Days: { date: string; label: string; taken: number; total: number; allTaken: boolean }[];
}

export interface EnrichedSchedule extends MedicationSchedule {
  patientName?: string;
  stats?: AdherenceStats;
  todayDoses?: DoseLog[];
}

export interface WellnessGoalWithProgress {
  goal: WellnessGoal;
  todayValue: number;
  percentage: number;
}

// Utility: Format Date YYYY-MM-DD in local time
export function getLocalDateString(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Pre-generates dose logs for a schedule up to specified days ahead
 */
export async function generateDoses(
  schedule: MedicationSchedule,
  daysAhead: number = 30
): Promise<void> {
  if (!schedule.id) return;

  const startDate = new Date(schedule.startDate);
  const today = new Date();
  const maxEnd = new Date(today);
  maxEnd.setDate(maxEnd.getDate() + daysAhead);

  let endDate = maxEnd;
  if (schedule.endDate) {
    const scheduledEnd = new Date(schedule.endDate);
    if (scheduledEnd < maxEnd) {
      endDate = scheduledEnd;
    }
  }

  // Determine times based on frequency
  let times: string[] = ['08:00'];
  if (schedule.frequency === 'twice_daily') {
    times = schedule.customTimes && schedule.customTimes.length >= 2 ? schedule.customTimes : ['08:00', '20:00'];
  } else if (schedule.customTimes && schedule.customTimes.length > 0) {
    times = schedule.customTimes;
  }

  // Get existing logs for this schedule to avoid duplicates
  const existingLogs = await db.doseLogs.where('scheduleId').equals(schedule.id).toArray();
  const existingMap = new Set(existingLogs.map((l) => `${l.scheduledDate}_${l.scheduledTime}`));

  const newLogs: Omit<DoseLog, 'id'>[] = [];
  const curr = new Date(startDate);

  let dayStep = 1;
  if (schedule.frequency === 'every_other_day') {
    dayStep = 2;
  } else if (schedule.frequency === 'weekly') {
    dayStep = 7;
  }

  while (curr <= endDate) {
    const dateStr = getLocalDateString(curr);

    for (const timeStr of times) {
      const key = `${dateStr}_${timeStr}`;
      if (!existingMap.has(key)) {
        newLogs.push({
          scheduleId: schedule.id,
          scheduledDate: dateStr,
          scheduledTime: timeStr,
          taken: false,
          skipped: false
        });
      }
    }

    curr.setDate(curr.getDate() + dayStep);
  }

  if (newLogs.length > 0) {
    await db.doseLogs.bulkAdd(newLogs as DoseLog[]);
  }
}

/**
 * Ensure doses are generated for all active schedules
 */
export async function ensureActiveSchedulesGenerated(): Promise<void> {
  const activeSchedules = await db.medicationSchedules.filter((s) => s.active).toArray();
  for (const schedule of activeSchedules) {
    await generateDoses(schedule, 30);
  }
}

/**
 * Create a new medication schedule and pre-generate dose logs
 */
export async function createSchedule(
  scheduleData: Omit<MedicationSchedule, 'id' | 'createdAt'>
): Promise<number> {
  const newSchedule: Omit<MedicationSchedule, 'id'> = {
    ...scheduleData,
    createdAt: new Date().toISOString()
  };

  const id = await db.medicationSchedules.add(newSchedule as MedicationSchedule);
  const savedSchedule = await db.medicationSchedules.get(id);

  if (savedSchedule) {
    await generateDoses(savedSchedule, 30);
  }

  return id;
}

/**
 * Fetch today's doses for all active schedules
 */
export async function getTodayDoses(): Promise<EnrichedDoseLog[]> {
  await ensureActiveSchedulesGenerated();
  const todayStr = getLocalDateString();

  const todayLogs = await db.doseLogs.where('scheduledDate').equals(todayStr).toArray();
  const enriched: EnrichedDoseLog[] = [];

  for (const log of todayLogs) {
    const schedule = await db.medicationSchedules.get(log.scheduleId);
    if (!schedule || !schedule.active) continue;

    const patient = await db.patients.get(schedule.patientId);
    enriched.push({
      ...log,
      schedule,
      patient
    });
  }

  // Sort by time ascending
  return enriched.sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime));
}

/**
 * Fetch overdue doses (past scheduled dates that were neither taken nor skipped)
 */
export async function getOverdueDoses(): Promise<EnrichedDoseLog[]> {
  const todayStr = getLocalDateString();
  const allLogs = await db.doseLogs
    .filter((l) => l.scheduledDate < todayStr && !l.taken && !l.skipped)
    .toArray();

  const enriched: EnrichedDoseLog[] = [];
  for (const log of allLogs) {
    const schedule = await db.medicationSchedules.get(log.scheduleId);
    if (!schedule || !schedule.active) continue;

    const patient = await db.patients.get(schedule.patientId);
    enriched.push({
      ...log,
      schedule,
      patient,
      isOverdue: true
    });
  }

  return enriched.sort((a, b) => {
    if (a.scheduledDate !== b.scheduledDate) {
      return a.scheduledDate.localeCompare(b.scheduledDate);
    }
    return a.scheduledTime.localeCompare(b.scheduledTime);
  });
}

/**
 * Mark a dose as taken or skipped
 */
export async function markDoseStatus(
  doseId: number,
  taken: boolean,
  skipped: boolean = false,
  notes?: string
): Promise<void> {
  const updateData: Partial<DoseLog> = {
    taken,
    skipped,
    takenAt: taken ? new Date().toISOString() : undefined,
    notes
  };

  await db.doseLogs.update(doseId, updateData);
}

/**
 * Calculate 30-day adherence statistics for a schedule
 */
export async function calculateAdherence(
  scheduleId: number,
  days = 30
): Promise<AdherenceStats> {
  const today = new Date();
  const todayStr = getLocalDateString(today);

  const pastDate = new Date(today);
  pastDate.setDate(pastDate.getDate() - days);
  const pastDateStr = getLocalDateString(pastDate);

  const logs = await db.doseLogs
    .where('scheduleId')
    .equals(scheduleId)
    .filter((l) => l.scheduledDate >= pastDateStr && l.scheduledDate <= todayStr)
    .toArray();

  const totalCount = logs.length;
  const takenCount = logs.filter((l) => l.taken).length;
  const skippedCount = logs.filter((l) => l.skipped).length;

  const percentage = totalCount === 0 ? 100 : Math.round((takenCount / totalCount) * 100);
  const status: 'high' | 'moderate' | 'low' = percentage >= 80 ? 'high' : percentage >= 50 ? 'moderate' : 'low';

  // Last 7 days breakdown for bar chart
  const last7Days: { date: string; label: string; taken: number; total: number; allTaken: boolean }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dStr = getLocalDateString(d);
    const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });

    const dayLogs = logs.filter((l) => l.scheduledDate === dStr);
    const dayTotal = dayLogs.length;
    const dayTaken = dayLogs.filter((l) => l.taken).length;

    last7Days.push({
      date: dStr,
      label: dayName,
      taken: dayTaken,
      total: dayTotal,
      allTaken: dayTotal > 0 && dayTaken === dayTotal
    });
  }

  return {
    percentage,
    takenCount,
    totalCount,
    skippedCount,
    status,
    last7Days
  };
}

/**
 * Get dose logs history for a schedule
 */
export async function getScheduleDoseHistory(scheduleId: number): Promise<DoseLog[]> {
  const logs = await db.doseLogs.where('scheduleId').equals(scheduleId).toArray();
  return logs.sort((a, b) => {
    if (a.scheduledDate !== b.scheduledDate) {
      return b.scheduledDate.localeCompare(a.scheduledDate);
    }
    return b.scheduledTime.localeCompare(a.scheduledTime);
  });
}

/**
 * Get all schedules for a specific patient with stats
 */
export async function getPatientSchedules(patientId: number): Promise<EnrichedSchedule[]> {
  const schedules = await db.medicationSchedules.where('patientId').equals(patientId).toArray();
  const patient = await db.patients.get(patientId);

  const enriched: EnrichedSchedule[] = [];
  const todayStr = getLocalDateString();

  for (const schedule of schedules) {
    if (!schedule.id) continue;
    const stats = await calculateAdherence(schedule.id, 30);
    const todayDoses = await db.doseLogs
      .where('scheduleId')
      .equals(schedule.id)
      .filter((l) => l.scheduledDate === todayStr)
      .toArray();

    enriched.push({
      ...schedule,
      patientName: patient?.name || 'Unknown Patient',
      stats,
      todayDoses
    });
  }

  return enriched;
}

/**
 * Toggle active/paused state of a schedule
 */
export async function toggleScheduleActive(scheduleId: number, active: boolean): Promise<void> {
  await db.medicationSchedules.update(scheduleId, { active });
}

/**
 * Update the custom dosage times for an existing schedule
 */
export async function updateScheduleTimes(
  scheduleId: number,
  customTimes: string[]
): Promise<void> {
  const schedule = await db.medicationSchedules.get(scheduleId);
  if (!schedule) return;

  const frequency: MedicationFrequency = customTimes.length > 2 ? 'custom' : schedule.frequency;
  await db.medicationSchedules.update(scheduleId, { customTimes, frequency });

  // Regenerate doses with updated times
  const updatedSchedule = await db.medicationSchedules.get(scheduleId);
  if (updatedSchedule) {
    await generateDoses(updatedSchedule, 30);
  }
}

// ---------------------------------------------------
// WELLNESS GOALS & LOGS
// ---------------------------------------------------

export async function ensureDefaultWellnessGoals(patientId?: number): Promise<void> {
  const count = await db.wellnessGoals.count();
  if (count === 0) {
    const defaults: Omit<WellnessGoal, 'id'>[] = [
      {
        patientId,
        goalType: 'water_intake',
        title: 'Daily Water Hydration',
        target: 8,
        unit: 'glasses',
        frequency: 'daily',
        active: true,
        createdAt: new Date().toISOString()
      },
      {
        patientId,
        goalType: 'walking',
        title: 'Daily Physical Walk',
        target: 30,
        unit: 'minutes',
        frequency: 'daily',
        active: true,
        createdAt: new Date().toISOString()
      }
    ];

    await db.wellnessGoals.bulkAdd(defaults as WellnessGoal[]);
  }
}

export async function getWellnessGoals(patientId?: number): Promise<WellnessGoalWithProgress[]> {
  await ensureDefaultWellnessGoals(patientId);
  const todayStr = getLocalDateString();

  let goals: WellnessGoal[] = [];
  if (patientId) {
    goals = await db.wellnessGoals.where('patientId').equals(patientId).filter((g) => g.active).toArray();
    // Also include general goals with no patientId
    const general = await db.wellnessGoals.filter((g) => g.active && !g.patientId).toArray();
    goals = [...goals, ...general];
  } else {
    goals = await db.wellnessGoals.filter((g) => g.active).toArray();
  }

  const results: WellnessGoalWithProgress[] = [];

  for (const goal of goals) {
    if (!goal.id) continue;
    const logs = await db.wellnessLogs
      .where('goalId')
      .equals(goal.id)
      .filter((l) => l.date === todayStr)
      .toArray();

    const todayValue = logs.reduce((sum, l) => sum + l.value, 0);
    const percentage = goal.target > 0 ? Math.min(100, Math.round((todayValue / goal.target) * 100)) : 0;

    results.push({
      goal,
      todayValue,
      percentage
    });
  }

  return results;
}

export async function createWellnessGoal(
  goalData: Omit<WellnessGoal, 'id' | 'createdAt'>
): Promise<number> {
  const newGoal: Omit<WellnessGoal, 'id'> = {
    ...goalData,
    createdAt: new Date().toISOString()
  };
  return await db.wellnessGoals.add(newGoal as WellnessGoal);
}

export async function logWellnessProgress(
  goalId: number,
  amount: number,
  dateStr?: string
): Promise<void> {
  const date = dateStr || getLocalDateString();
  await db.wellnessLogs.add({
    goalId,
    date,
    value: amount,
    loggedAt: new Date().toISOString()
  });
}

/**
 * Check summary count for reminders and home page badges
 */
export async function checkAdherenceReminders(): Promise<{
  overdueCount: number;
  todayPendingCount: number;
  topOverduePatientName?: string;
}> {
  const overdue = await getOverdueDoses();
  const today = await getTodayDoses();
  const todayPending = today.filter((d) => !d.taken && !d.skipped);

  return {
    overdueCount: overdue.length,
    todayPendingCount: todayPending.length,
    topOverduePatientName: overdue.length > 0 ? overdue[0].patient?.name : undefined
  };
}
