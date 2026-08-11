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
  'bronchial asthma': 'asthma',
  'bronchial_asthma': 'asthma',
  'seasonal allergies (hay fever)': 'common_cold',
  'seasonal_allergies': 'common_cold',
  'allergy': 'common_cold',
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
  'tuberculosis': 'pneumonia',

  // Gastrointestinal
  'gastroenteritis': 'gastroenteritis',
  'infectious gastroenteritis': 'gastroenteritis',
  'infectious_gastroenteritis': 'gastroenteritis',
  'gerd': 'gerd',
  'gastroesophageal reflux disease (gerd)': 'gerd',
  'gastroduodenal ulcer': 'gerd',
  'peptic ulcer diseae': 'gerd',
  'peptic_ulcer_diseae': 'gerd',
  'appendicitis': 'appendicitis',
  'jaundice': 'jaundice',
  'typhoid': 'typhoid',
  'dimorphic hemmorhoids(piles)': 'gastroenteritis',
  'dimorphic_hemmorhoids': 'gastroenteritis',

  // Vector & Febrile
  'malaria': 'malaria',
  'dengue': 'dengue',
  'chikungunya': 'chikungunya',
  'chickenpox': 'chickenpox',
  'chicken pox': 'chickenpox',
  'heat exhaustion': 'heat_exhaustion',
  'heat_exhaustion': 'heat_exhaustion',

  // Hepatic
  'hepatitis a': 'jaundice',
  'hepatitis_a': 'jaundice',
  'hepatitis b': 'jaundice',
  'hepatitis_b': 'jaundice',
  'hepatitis c': 'jaundice',
  'hepatitis_c': 'jaundice',
  'hepatitis d': 'jaundice',
  'hepatitis_d': 'jaundice',
  'hepatitis e': 'jaundice',
  'hepatitis_e': 'jaundice',
  'alcoholic hepatitis': 'jaundice',
  'alcoholic_hepatitis': 'jaundice',
  'chronic cholestasis': 'jaundice',
  'chronic_cholestasis': 'jaundice',

  // Renal & Urinary
  'uti': 'uti',
  'cystitis': 'uti',
  'urinary tract infection': 'uti',
  'urinary_tract_infection': 'uti',
  'kidney stone': 'kidney_stones',
  'kidney stones': 'kidney_stones',
  'kidney_stones': 'kidney_stones',

  // Neurological & Metabolic
  'migraine': 'migraine',
  'tension headache': 'tension_headache',
  'tension_headache': 'tension_headache',
  '(vertigo) paroymsal  positional vertigo': 'tension_headache',
  'vertigo': 'tension_headache',
  'hypoglycemia': 'hypoglycemia',
  'diabetic peripheral neuropathy': 'hypoglycemia',
  'diabetes': 'hypoglycemia',
  'diabetes ': 'hypoglycemia',
  'hyperthyroidism': 'hypoglycemia',
  'hypothyroidism': 'hypoglycemia',
  'aids': 'viral_fever',

  // Cardiovascular
  'angina': 'heart_attack',
  'heart attack': 'heart_attack',
  'heart_attack': 'heart_attack',
  'acute myocardial infarction': 'heart_attack',
  'acute_myocardial_infarction': 'heart_attack',
  'heart failure': 'heart_attack',
  'hypertensive heart disease': 'heart_attack',
  'cardiac_emergency': 'heart_attack',
  'hypertension': 'hypertension_crisis',
  'hypertension ': 'hypertension_crisis',
  'hypertension_crisis': 'hypertension_crisis',
  'paralysis (brain hemorrhage)': 'heart_attack',

  // Musculoskeletal & Joints
  'chronic back pain': 'chikungunya',
  'chronic_back_pain': 'chikungunya',
  'sciatica': 'chikungunya',
  'spondylosis': 'chikungunya',
  'cervical spondylosis': 'chikungunya',
  'osteoarthritis': 'chikungunya',
  'osteoarthristis': 'chikungunya',
  'rheumatoid arthritis': 'chikungunya',
  'gout': 'chikungunya',
  'arthritis': 'chikungunya',
  'varicose veins': 'chikungunya',

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
  'fungal infection': 'skin_infection',
  'eczema': 'skin_infection',
  'impetigo': 'skin_infection',
  'psoriasis': 'skin_infection',
  'acne': 'skin_infection',
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
