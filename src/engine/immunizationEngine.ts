import immunizationScheduleRaw from '../data/immunization_schedule.json';
import { MultilingualText, ImmunizationRecord } from '../types';

export interface VaccineScheduleItem {
  id: string;
  vaccine: string;
  name: MultilingualText;
  age_days: number;
  age_label: MultilingualText;
  dose: string;
  description: MultilingualText;
}

export type VaccineStatus = 'completed' | 'overdue' | 'due' | 'upcoming';

export interface CalculatedVaccineItem extends VaccineScheduleItem {
  dueDate: Date;
  dueDateFormatted: string;
  status: VaccineStatus;
  dateGiven?: string;
}

export function getVaccinationStatus(
  childBirthDateInput: string | Date,
  completedRecords: ImmunizationRecord[] = []
): CalculatedVaccineItem[] {
  if (!childBirthDateInput) return [];

  const dob = typeof childBirthDateInput === 'string' ? new Date(childBirthDateInput) : childBirthDateInput;
  const dobStart = new Date(dob.getFullYear(), dob.getMonth(), dob.getDate());

  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  const completedMap: Record<string, string> = {};
  completedRecords.forEach((rec) => {
    completedMap[rec.vaccineId] = rec.dateGiven;
  });

  const schedule = immunizationScheduleRaw as VaccineScheduleItem[];

  return schedule.map((item) => {
    const dueMs = dobStart.getTime() + item.age_days * 24 * 60 * 60 * 1000;
    const dueDate = new Date(dueMs);

    const dueDateFormatted = dueDate.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });

    let status: VaccineStatus = 'upcoming';
    const dateGiven = completedMap[item.id];

    if (dateGiven) {
      status = 'completed';
    } else if (dueDate < todayStart) {
      status = 'overdue';
    } else {
      const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
      if (dueDate.getTime() - todayStart.getTime() <= thirtyDaysMs) {
        status = 'due';
      } else {
        status = 'upcoming';
      }
    }

    return {
      ...item,
      dueDate,
      dueDateFormatted,
      status,
      dateGiven
    };
  });
}
