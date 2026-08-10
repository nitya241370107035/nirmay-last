import allergyMapData from '../data/allergy_medicine_map.json';
import interactionsData from '../data/drug_interactions.json';
import medicinesV2Data from '../data/medicines_v2.json';
import {
  Patient,
  MedicineItemV2,
  SafetyConflict,
  LanguageCode,
  DiseaseMedicinesV2,
  MultilingualText
} from '../types';

interface AllergyDefinition {
  allergy_name: MultilingualText;
  contraindicated_medicines: string[];
}

interface InteractionDefinition {
  id: string;
  medA: string;
  medB: string;
  severity: 'severe' | 'moderate' | 'mild';
  description: MultilingualText;
  contraindicated?: string[];
}

const ALLERGY_MAP = allergyMapData as Record<string, AllergyDefinition>;
const INTERACTIONS = interactionsData as InteractionDefinition[];

/**
 * Get localized string from MultilingualText or plain string
 */
function getLoc(text: MultilingualText | string | undefined, lang: LanguageCode = 'en'): string {
  if (!text) return '';
  if (typeof text === 'string') return text;
  return text[lang] || text['en'] || Object.values(text)[0] || '';
}

/**
 * Check safety of suggested medicines against patient allergies, current medications, and cross-interactions
 */
export function checkSafety(
  patient: Patient | null | undefined,
  suggestedMedicines: MedicineItemV2[],
  lang: LanguageCode = 'en'
): SafetyConflict[] {
  if (!suggestedMedicines || suggestedMedicines.length === 0) {
    return [];
  }

  const conflicts: SafetyConflict[] = [];

  const patientAllergies = patient?.allergies || [];
  const patientCurrentMeds = patient?.currentMeds || [];

  // 1. ALLERGY CHECKS
  patientAllergies.forEach((allergyId) => {
    const mapEntry = ALLERGY_MAP[allergyId];
    if (mapEntry && mapEntry.contraindicated_medicines) {
      suggestedMedicines.forEach((med) => {
        if (mapEntry.contraindicated_medicines.includes(med.id)) {
          const allergyNameStr = getLoc(mapEntry.allergy_name, lang);
          const medNameStr = getLoc(med.name, lang);

          const defaultMsg: MultilingualText = {
            en: `Allergy Alert: ${medNameStr} is contraindicated for patients with ${allergyNameStr}.`,
            hi: `एलर्जी चेतावनी: ${allergyNameStr} वाले रोगियों के लिए ${medNameStr} वर्जित है।`,
            gu: `એલર્જી ચેતવણી: ${allergyNameStr} ધરાવતા દર્દીઓ માટે ${medNameStr} વાપરવી મનાઇ છે.`
          };

          conflicts.push({
            medId: med.id,
            type: 'allergy',
            severity: 'severe',
            allergyId,
            allergyName: allergyNameStr,
            message: getLoc(defaultMsg, lang)
          });
        }
      });
    }
  });

  // Helper to map medicine ID to display name
  const getAllMedicineNamesMap = (): Record<string, string> => {
    const map: Record<string, string> = {};
    const allData = medicinesV2Data as unknown as Record<string, DiseaseMedicinesV2>;
    Object.values(allData).forEach((disease) => {
      ['allopathy', 'ayurveda', 'homeopathy'].forEach((sys) => {
        const list = disease[sys as keyof DiseaseMedicinesV2] || [];
        list.forEach((m) => {
          map[m.id] = getLoc(m.name, lang);
        });
      });
    });
    return map;
  };

  const medNamesMap = getAllMedicineNamesMap();

  // 2. DRUG-TO-DRUG INTERACTION CHECKS (Suggested Med vs Patient's Current Meds)
  suggestedMedicines.forEach((sugMed) => {
    patientCurrentMeds.forEach((curMed) => {
      INTERACTIONS.forEach((rule) => {
        const isMatch =
          (rule.medA === sugMed.id && rule.medB === curMed.medId) ||
          (rule.medB === sugMed.id && rule.medA === curMed.medId);

        if (isMatch) {
          const curMedName = curMed.name || medNamesMap[curMed.medId] || curMed.medId;
          const ruleDesc = getLoc(rule.description, lang);

          conflicts.push({
            medId: sugMed.id,
            type: 'interaction',
            severity: rule.severity,
            interactingMedId: curMed.medId,
            interactingMedName: curMedName,
            message: ruleDesc
          });
        }
      });
    });
  });

  // 3. CROSS INTERACTION CHECKS (Between Suggested Medicines themselves)
  for (let i = 0; i < suggestedMedicines.length; i++) {
    for (let j = i + 1; j < suggestedMedicines.length; j++) {
      const med1 = suggestedMedicines[i];
      const med2 = suggestedMedicines[j];

      INTERACTIONS.forEach((rule) => {
        const isMatch =
          (rule.medA === med1.id && rule.medB === med2.id) ||
          (rule.medB === med1.id && rule.medA === med2.id);

        if (isMatch) {
          const ruleDesc = getLoc(rule.description, lang);
          const med2Name = getLoc(med2.name, lang);

          conflicts.push({
            medId: med1.id,
            type: 'interaction',
            severity: rule.severity,
            interactingMedId: med2.id,
            interactingMedName: med2Name,
            message: ruleDesc
          });
        }
      });
    }
  }

  return conflicts;
}

/**
 * Find safe alternative medicines from same system (or cross-system if none in same system)
 * that produce 0 safety conflicts for the patient.
 */
export function findSafeAlternatives(
  conflictMedId: string,
  preferredSystem: 'allopathy' | 'ayurveda' | 'homeopathy',
  diseaseMedicinesOrList: DiseaseMedicinesV2 | MedicineItemV2[],
  patient: Patient | null | undefined,
  lang: LanguageCode = 'en'
): MedicineItemV2[] {
  // Extract all available medicines across systems or list
  let candidatePool: MedicineItemV2[] = [];

  if (Array.isArray(diseaseMedicinesOrList)) {
    candidatePool = diseaseMedicinesOrList;
  } else if (diseaseMedicinesOrList) {
    candidatePool = [
      ...(diseaseMedicinesOrList.allopathy || []),
      ...(diseaseMedicinesOrList.ayurveda || []),
      ...(diseaseMedicinesOrList.homeopathy || [])
    ];
  }

  // Also include general safe OTC fallback medicines if pool is small
  if (candidatePool.length < 5) {
    const allData = medicinesV2Data as unknown as Record<string, DiseaseMedicinesV2>;
    Object.values(allData).forEach((disease) => {
      ['allopathy', 'ayurveda', 'homeopathy'].forEach((sys) => {
        const list = disease[sys as keyof DiseaseMedicinesV2] || [];
        list.forEach((m) => {
          if (!candidatePool.some((c) => c.id === m.id)) {
            candidatePool.push(m);
          }
        });
      });
    });
  }

  // Filter out the conflict medicine itself
  const candidates = candidatePool.filter((m) => m.id !== conflictMedId);

  // First pass: try candidates in the same system
  const sameSystemCandidates = candidates.filter((m) => m.system === preferredSystem);

  const safeSameSystem: MedicineItemV2[] = [];

  sameSystemCandidates.forEach((cand) => {
    const candConflicts = checkSafety(patient, [cand], lang);
    if (candConflicts.length === 0) {
      safeSameSystem.push(cand);
    }
  });

  if (safeSameSystem.length > 0) {
    return safeSameSystem.slice(0, 3);
  }

  // Second pass: cross-system candidates if no same-system alternatives exist
  const safeOtherSystem: MedicineItemV2[] = [];
  const otherSystemCandidates = candidates.filter((m) => m.system !== preferredSystem);

  otherSystemCandidates.forEach((cand) => {
    const candConflicts = checkSafety(patient, [cand], lang);
    if (candConflicts.length === 0) {
      safeOtherSystem.push(cand);
    }
  });

  return safeOtherSystem.slice(0, 3);
}
