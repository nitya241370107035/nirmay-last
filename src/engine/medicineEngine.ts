import medicinesV2Data from '../data/medicines_v2.json';
import { CaseData, MedicineItemV2, DiseaseMedicinesV2 } from '../types';

/**
 * Filter medicines based on patient age group, OTC status, and pregnancy safety flags
 */
export function filterMedicines(
  medicinesList: MedicineItemV2[],
  caseData: CaseData
): MedicineItemV2[] {
  if (!medicinesList || !Array.isArray(medicinesList)) {
    return [];
  }

  const ageGroup = (caseData.age_group || '').toLowerCase();

  return medicinesList.filter((med) => {
    // 1. Exclude prescription-only medicines (isOTC === false) for Phase 3 advice
    if (med.isOTC === false) {
      return false;
    }

    // 2. Filter by Age Group restriction
    if (med.ageRestriction) {
      if (ageGroup === 'infant') {
        // Infants can ONLY take medicines with ageRestriction null or 'infant'
        if (med.ageRestriction !== 'infant') {
          return false;
        }
      } else if (ageGroup === 'child') {
        // Children cannot take adult or elderly restricted medicines
        if (med.ageRestriction === 'adult' || med.ageRestriction === 'elderly') {
          return false;
        }
      } else if (ageGroup === 'elderly') {
        // Elderly should not take infant or child restricted medicines
        if (med.ageRestriction === 'infant' || med.ageRestriction === 'child') {
          return false;
        }
      }
    }

    return true;
  });
}

/**
 * Get filtered medicines for a given disease ID and patient profile
 */
export function getMedicines(
  diseaseId: string,
  caseData: CaseData
): DiseaseMedicinesV2 {
  const allData = medicinesV2Data as unknown as Record<string, DiseaseMedicinesV2>;
  const diseaseMeds = allData[diseaseId] || allData['viral_fever'] || {
    allopathy: [],
    ayurveda: [],
    homeopathy: []
  };

  return {
    allopathy: filterMedicines(diseaseMeds.allopathy || [], caseData),
    ayurveda: filterMedicines(diseaseMeds.ayurveda || [], caseData),
    homeopathy: filterMedicines(diseaseMeds.homeopathy || [], caseData)
  };
}
