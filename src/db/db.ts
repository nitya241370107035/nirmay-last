import Dexie, { Table } from 'dexie';
import {
  Patient,
  Family,
  CaseRecord,
  SyncQueueItem,
  OutbreakAlert,
  MedicationSchedule,
  DoseLog,
  WellnessGoal,
  WellnessLog,
  GardenInventoryItem
} from '../types';

export class NiramayDatabase extends Dexie {
  families!: Table<Family, number>;
  patients!: Table<Patient, number>;
  cases!: Table<CaseRecord, number>;
  syncQueue!: Table<SyncQueueItem, number>;
  alerts!: Table<OutbreakAlert, string>;
  medicationSchedules!: Table<MedicationSchedule, number>;
  doseLogs!: Table<DoseLog, number>;
  wellnessGoals!: Table<WellnessGoal, number>;
  wellnessLogs!: Table<WellnessLog, number>;
  gardenInventory!: Table<GardenInventoryItem, number>;
  chronicLogs!: Table<import('../types').ChronicLog, number>;

  constructor() {
    super('NiramayDB');
    this.version(1).stores({
      patients: '++id, name, age, gender, village, createdAt',
      cases: '++id, patientId, date, diagnosisId, risk, followUpDate, followUpDone'
    });

    this.version(2).stores({
      patients: '++id, name, age, gender, village, createdAt',
      cases: '++id, patientId, date, diagnosisId, risk, followUpDate, followUpDone',
      syncQueue: '++id, diseaseId, timestamp, synced',
      alerts: 'id, diseaseId, status, lastReported'
    });

    this.version(3).stores({
      patients: '++id, name, age, gender, village, createdAt, *allergies',
      cases: '++id, patientId, date, diagnosisId, risk, followUpDate, followUpDone',
      syncQueue: '++id, diseaseId, timestamp, synced',
      alerts: 'id, diseaseId, status, lastReported'
    });

    this.version(4).stores({
      patients: '++id, name, age, gender, village, createdAt, *allergies, isPregnant, childBirthDate',
      cases: '++id, patientId, date, diagnosisId, risk, followUpDate, followUpDone, caseType',
      syncQueue: '++id, diseaseId, timestamp, synced',
      alerts: 'id, diseaseId, status, lastReported'
    });

    this.version(5).stores({
      patients: '++id, name, age, gender, village, createdAt, *allergies, isPregnant, childBirthDate',
      cases: '++id, patientId, date, diagnosisId, risk, followUpDate, followUpDone, caseType',
      syncQueue: '++id, diseaseId, timestamp, synced',
      alerts: 'id, diseaseId, status, lastReported'
    });

    this.version(6).stores({
      patients: '++id, name, age, gender, village, createdAt, *allergies, isPregnant, childBirthDate',
      cases: '++id, patientId, date, diagnosisId, risk, followUpDate, followUpDone, caseType',
      syncQueue: '++id, diseaseId, timestamp, synced',
      alerts: 'id, diseaseId, status, lastReported',
      medicationSchedules: '++id, patientId, medicineName, active, startDate, endDate',
      doseLogs: '++id, scheduleId, scheduledDate, scheduledTime, taken, skipped',
      wellnessGoals: '++id, patientId, goalType, active, createdAt',
      wellnessLogs: '++id, goalId, date'
    });

    this.version(7).stores({
      patients: '++id, name, age, gender, village, createdAt, *allergies, isPregnant, childBirthDate',
      cases: '++id, patientId, date, diagnosisId, risk, followUpDate, followUpDone, caseType',
      syncQueue: '++id, diseaseId, timestamp, synced',
      alerts: 'id, diseaseId, status, lastReported',
      medicationSchedules: '++id, patientId, medicineName, active, startDate, endDate',
      doseLogs: '++id, scheduleId, scheduledDate, scheduledTime, taken, skipped',
      wellnessGoals: '++id, patientId, goalType, active, createdAt',
      wellnessLogs: '++id, goalId, date',
      gardenInventory: '++id, &plantId, quantity, notes, lastUpdated'
    });

    this.version(8).stores({
      families: '++id, name, village, contactNumber, createdAt',
      patients: '++id, familyId, name, age, gender, village, createdAt, *allergies, isPregnant, childBirthDate',
      cases: '++id, patientId, date, diagnosisId, risk, followUpDate, followUpDone, caseType',
      syncQueue: '++id, diseaseId, timestamp, synced',
      alerts: 'id, diseaseId, status, lastReported',
      medicationSchedules: '++id, patientId, medicineName, active, startDate, endDate',
      doseLogs: '++id, scheduleId, scheduledDate, scheduledTime, taken, skipped',
      wellnessGoals: '++id, patientId, goalType, active, createdAt',
      wellnessLogs: '++id, goalId, date',
      gardenInventory: '++id, &plantId, quantity, notes, lastUpdated'
    }).upgrade(async (tx) => {
      const patientsTable = tx.table('patients');
      const familiesTable = tx.table('families');
      const allPatients = await patientsTable.toArray();
      for (const p of allPatients) {
        if (!p.familyId) {
          const familyName = p.name && p.name !== 'Walk-in / Anonymous Patient'
            ? `${p.name}'s Household`
            : 'Walk-in Household';
          const newFamId = await familiesTable.add({
            name: familyName,
            headName: p.name,
            village: p.village || 'Local Village',
            createdAt: p.createdAt || new Date().toISOString()
          });
          await patientsTable.update(p.id, {
            familyId: newFamId,
            relationToHead: 'Head of Household'
          });
        }
      }
    });

    this.version(9).stores({
      families: '++id, name, village, contactNumber, createdAt',
      patients: '++id, familyId, name, age, gender, village, createdAt, *allergies, isPregnant, childBirthDate',
      cases: '++id, patientId, date, diagnosisId, risk, followUpDate, followUpDone, caseType',
      syncQueue: '++id, diseaseId, timestamp, synced',
      alerts: 'id, diseaseId, status, lastReported',
      medicationSchedules: '++id, patientId, medicineName, active, startDate, endDate',
      doseLogs: '++id, scheduleId, scheduledDate, scheduledTime, taken, skipped',
      wellnessGoals: '++id, patientId, goalType, active, createdAt',
      wellnessLogs: '++id, goalId, date',
      gardenInventory: '++id, &plantId, quantity, notes, lastUpdated',
      chronicLogs: '++id, patientId, date, medicationAdherence'
    });
  }
}

export const db = new NiramayDatabase();

// Save patient nutrition screening record
export async function savePatientNutritionScreening(
  patientId: number,
  record: Omit<import('../types').NutritionScreeningRecord, 'id'>
): Promise<void> {
  const patient = await db.patients.get(patientId);
  if (!patient) return;

  const currentScreenings = patient.nutritionScreenings || [];
  const newScreening = {
    ...record,
    id: `nutr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
  };

  const updatedScreenings = [newScreening, ...currentScreenings];

  await db.patients.update(patientId, {
    nutritionScreenings: updatedScreenings,
  });
}

// Update patient MCH data (LMP, pregnancy status, DOB, etc.)
export async function updatePatientMchData(
  patientId: number,
  data: Partial<Patient>
): Promise<void> {
  await db.patients.update(patientId, data);
}

// Record vaccine as given for a child patient
export async function recordVaccineGiven(
  patientId: number,
  vaccineId: string,
  dateGiven: string = new Date().toISOString().split('T')[0]
): Promise<void> {
  const patient = await db.patients.get(patientId);
  if (!patient) return;

  const currentImmunizations = patient.immunizations || [];
  // Remove existing record if present and append updated one
  const filtered = currentImmunizations.filter((i) => i.vaccineId !== vaccineId);
  filtered.push({ vaccineId, dateGiven });

  await db.patients.update(patientId, {
    immunizations: filtered
  });
}

// Update patient medical profile (allergies and current medications)
export async function updatePatientMedicalProfile(
  patientId: number,
  allergies: string[],
  currentMeds: { medId: string; name?: string; frequency?: string }[]
): Promise<void> {
  await db.patients.update(patientId, {
    allergies,
    currentMeds
  });
}

// Seed initial default patient if DB is empty
export async function ensureDefaultPatient(): Promise<number> {
  const count = await db.patients.count();
  if (count === 0) {
    const id = await db.patients.add({
      name: 'Walk-in / Anonymous Patient',
      age: 30,
      gender: 'Unspecified',
      village: 'Local Village',
      createdAt: new Date().toISOString()
    });
    return id;
  }
  const first = await db.patients.toCollection().first();
  return first?.id || 1;
}

// Get past cases for smart medicine recall
export async function getPreviousCasesForDisease(
  patientId: number,
  diagnosisId: string
): Promise<CaseRecord[]> {
  return await db.cases
    .where({ patientId, diagnosisId })
    .reverse()
    .sortBy('date');
}

// Get follow-up cases due today or past due
export async function getDueFollowUps(): Promise<{ caseRecord: CaseRecord; patient?: Patient }[]> {
  const todayStr = new Date().toISOString().split('T')[0];
  const dueCases = await db.cases
    .where('followUpDone')
    .equals(0) // false in Dexie indexed store
    .filter((c) => c.followUpDate !== null && c.followUpDate !== undefined && c.followUpDate <= todayStr)
    .toArray();

  const results = await Promise.all(
    dueCases.map(async (c) => {
      const patient = await db.patients.get(c.patientId);
      return { caseRecord: c, patient };
    })
  );

  return results;
}

// Export all EMR data as JSON
export async function exportAllEMRData(): Promise<string> {
  const patients = await db.patients.toArray();
  const cases = await db.cases.toArray();
  const exportPayload = {
    appName: 'Nirāmay – Virtual Hospital EMR',
    exportedAt: new Date().toISOString(),
    patientCount: patients.length,
    caseCount: cases.length,
    patients,
    cases
  };
  return JSON.stringify(exportPayload, null, 2);
}

// Chronic Log Operations
export async function saveChronicLog(log: import('../types').ChronicLog): Promise<number> {
  const existing = await db.chronicLogs
    .where({ patientId: log.patientId, date: log.date })
    .first();

  if (existing && existing.id) {
    await db.chronicLogs.update(existing.id, {
      ...log,
      loggedAt: new Date().toISOString()
    });
    return existing.id;
  } else {
    return await db.chronicLogs.add({
      ...log,
      loggedAt: new Date().toISOString()
    });
  }
}

export async function getChronicLogsForPatient(
  patientId: number,
  daysLimit = 30
): Promise<import('../types').ChronicLog[]> {
  const logs = await db.chronicLogs
    .where('patientId')
    .equals(patientId)
    .sortBy('date');

  return logs.slice(-daysLimit);
}

export async function getTodayChronicLog(
  patientId: number
): Promise<import('../types').ChronicLog | undefined> {
  const todayStr = new Date().toISOString().split('T')[0];
  return await db.chronicLogs
    .where({ patientId, date: todayStr })
    .first();
}

