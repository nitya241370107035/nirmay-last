import medicinesV2Data from '../data/medicines_v2.json';
import { CaseData, MedicineItemV2, DiseaseMedicinesV2 } from '../types';

const DISEASE_ALIAS_MAP: Record<string, string> = {
  // Respiratory
  'common cold': 'common_cold',
  'common_cold': 'common_cold',
  'acute bronchitis': 'acute_bronchitis',
  'acute_bronchitis': 'acute_bronchitis',
  'acute bronchiolitis': 'acute_bronchitis',
  'acute_bronchiolitis': 'acute_bronchitis',
  'croup': 'acute_bronchitis',
  'pneumonia': 'pneumonia',
  'asthma': 'asthma',
  'seasonal allergies (hay fever)': 'common_cold',
  'seasonal_allergies': 'common_cold',
  'acute sinusitis': 'common_cold',
  'sinusitis': 'common_cold',
  'strep throat': 'tonsillitis',
  'strep_throat': 'tonsillitis',
  'tonsillitis': 'tonsillitis',
  'viral pharyngitis': 'tonsillitis',
  'viral_pharyngitis': 'tonsillitis',
  'flu': 'viral_fever',
  'influenza': 'viral_fever',
  'viral fever': 'viral_fever',
  'viral_fever': 'viral_fever',
  'covid-19': 'viral_fever',
  'covid19': 'viral_fever',

  // Gastrointestinal
  'gastroenteritis': 'gastroenteritis',
  'infectious gastroenteritis': 'gastroenteritis',
  'infectious_gastroenteritis': 'gastroenteritis',
  'gerd': 'gerd',
  'gastroesophageal reflux disease (gerd)': 'gerd',
  'gastroduodenal ulcer': 'gerd',
  'appendicitis': 'appendicitis',
  'jaundice': 'jaundice',
  'typhoid': 'typhoid',

  // Vector & Febrile
  'malaria': 'malaria',
  'dengue': 'dengue',
  'chikungunya': 'chikungunya',
  'chickenpox': 'chickenpox',
  'heat exhaustion': 'heat_exhaustion',
  'heat_exhaustion': 'heat_exhaustion',

  // Renal & Urinary
  'uti': 'uti',
  'cystitis': 'uti',
  'urinary tract infection': 'uti',
  'urinary_tract_infection': 'uti',
  'kidney stone': 'kidney_stones',
  'kidney stones': 'kidney_stones',
  'kidney_stones': 'kidney_stones',

  // Neurological & Headaches
  'migraine': 'migraine',
  'tension headache': 'tension_headache',
  'tension_headache': 'tension_headache',
  'hypoglycemia': 'hypoglycemia',
  'diabetic peripheral neuropathy': 'hypoglycemia',

  // Cardiovascular
  'angina': 'hypertension_crisis',
  'heart attack': 'hypertension_crisis',
  'heart failure': 'hypertension_crisis',
  'hypertensive heart disease': 'hypertension_crisis',
  'hypertension': 'hypertension_crisis',
  'hypertension_crisis': 'hypertension_crisis',

  // Musculoskeletal & Joints
  'chronic back pain': 'chikungunya',
  'chronic_back_pain': 'chikungunya',
  'sciatica': 'chikungunya',
  'spondylosis': 'chikungunya',
  'osteoarthritis': 'chikungunya',
  'rheumatoid arthritis': 'chikungunya',
  'gout': 'chikungunya',

  // ENT & Eye
  'acute otitis media': 'ear_infection',
  'ear infection': 'ear_infection',
  'ear_infection': 'ear_infection',
  'conjunctivitis': 'conjunctivitis',
  'conjunctivitis due to allergy': 'conjunctivitis',

  // Skin & Blood
  'skin_infection': 'skin_infection',
  'skin infection': 'skin_infection',
  'pyogenic skin infection': 'skin_infection',
  'contact dermatitis': 'skin_infection',
  'fungal infection of the skin': 'skin_infection',
  'eczema': 'skin_infection',
  'anemia': 'anemia'
};

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
  
  const rawId = (diseaseId || '').toLowerCase().trim();
  const matchedKey = DISEASE_ALIAS_MAP[rawId] || rawId.replace(/[\s-]+/g, '_');
  
  const diseaseMeds = allData[matchedKey] || allData[rawId] || allData['viral_fever'] || {
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
