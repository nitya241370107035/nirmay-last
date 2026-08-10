import nutritionDeficienciesData from '../data/nutrition_deficiencies.json';
import { MultilingualText, LanguageCode } from '../types';

export interface NutritionSign {
  id: string;
  label: MultilingualText;
  body_part: 'Eyes' | 'Mouth' | 'Nails/Skin' | 'Neck' | 'Limbs/Bones' | 'General';
}

export interface NutritionDeficiency {
  id: string;
  deficiency_name: MultilingualText;
  signs: NutritionSign[];
  confirmation_threshold: number;
  diet_advice: MultilingualText[];
  supplements: MultilingualText[];
  related_articles: string[];
  severity: 'moderate' | 'severe';
}

export interface ConfirmedDeficiencyResult {
  deficiency: NutritionDeficiency;
  matchedSignCount: number;
  totalSignsCount: number;
  matchedSigns: NutritionSign[];
  severity: 'moderate' | 'severe';
}

export interface NutritionScreeningOutput {
  confirmedDeficiencies: ConfirmedDeficiencyResult[];
  totalSignsChecked: number;
  dateScanned: string;
}

export interface NutritionScreeningRecord {
  id?: string;
  date: string;
  patientId?: number;
  checkedSignIds: string[];
  detectedDeficiencyIds: string[];
  notes?: string;
}

/**
 * Grouped signs for the checklist UI
 */
export interface SignGroup {
  body_part: string;
  title: MultilingualText;
  signs: NutritionSign[];
}

const BODY_PART_TITLES: Record<string, MultilingualText> = {
  Eyes: {
    en: 'Eyes & Vision',
    hi: 'आँखें और दृष्टि',
    gu: 'આંખો અને દ્રષ્ટિ',
  },
  Mouth: {
    en: 'Mouth, Tongue & Lips',
    hi: 'मुँह, जीभ और होंठ',
    gu: 'મોં, જીભ અને હોઠ',
  },
  'Nails/Skin': {
    en: 'Nails & Skin',
    hi: 'नाखून और त्वचा',
    gu: 'નખ અને ચામડી',
  },
  Neck: {
    en: 'Neck & Throat',
    hi: 'गर्दन और गला',
    gu: 'ગરદન અને ગળું',
  },
  'Limbs/Bones': {
    en: 'Limbs, Joints & Bones',
    hi: 'हाथ-पैर, जोड़ और हड्डियाँ',
    gu: 'હાથ-પગ, સાંધા અને હાડકાં',
  },
  General: {
    en: 'General Growth & Energy',
    hi: 'सामान्य विकास व ऊर्जा',
    gu: 'સામાન્ય વિકાસ અને ઉર્જા',
  },
};

/**
 * Screens selected observable sign IDs against deficiency criteria
 */
export function screenNutrition(checkedSignIds: string[]): NutritionScreeningOutput {
  const deficiencies = nutritionDeficienciesData as NutritionDeficiency[];
  const confirmedList: ConfirmedDeficiencyResult[] = [];

  const checkedSet = new Set(checkedSignIds || []);

  for (const def of deficiencies) {
    const matched = def.signs.filter((s) => checkedSet.has(s.id));
    if (matched.length >= def.confirmation_threshold) {
      confirmedList.push({
        deficiency: def,
        matchedSignCount: matched.length,
        totalSignsCount: def.signs.length,
        matchedSigns: matched,
        severity: def.severity,
      });
    }
  }

  // Sort by matchedSignCount desc, then severity 'severe' first
  confirmedList.sort((a, b) => {
    if (b.matchedSignCount !== a.matchedSignCount) {
      return b.matchedSignCount - a.matchedSignCount;
    }
    if (a.severity === 'severe' && b.severity !== 'severe') return -1;
    if (b.severity === 'severe' && a.severity !== 'severe') return 1;
    return 0;
  });

  return {
    confirmedDeficiencies: confirmedList,
    totalSignsChecked: checkedSet.size,
    dateScanned: new Date().toISOString(),
  };
}

/**
 * Get all available signs deduplicated and grouped by body part for checklist view
 */
export function getAllNutritionSignsGrouped(): SignGroup[] {
  const deficiencies = nutritionDeficienciesData as NutritionDeficiency[];
  const signMap = new Map<string, NutritionSign>();

  for (const def of deficiencies) {
    for (const sign of def.signs) {
      if (!signMap.has(sign.id)) {
        signMap.set(sign.id, sign);
      }
    }
  }

  const allSigns = Array.from(signMap.values());
  const groupedMap = new Map<string, NutritionSign[]>();

  const bodyPartOrder = ['Eyes', 'Mouth', 'Nails/Skin', 'Neck', 'Limbs/Bones', 'General'];

  for (const bp of bodyPartOrder) {
    groupedMap.set(bp, []);
  }

  for (const sign of allSigns) {
    const bp = sign.body_part || 'General';
    if (!groupedMap.has(bp)) {
      groupedMap.set(bp, []);
    }
    groupedMap.get(bp)!.push(sign);
  }

  const result: SignGroup[] = [];
  for (const bp of bodyPartOrder) {
    const signs = groupedMap.get(bp) || [];
    if (signs.length > 0) {
      result.push({
        body_part: bp,
        title: BODY_PART_TITLES[bp] || { en: bp, hi: bp, gu: bp },
        signs,
      });
    }
  }

  return result;
}

/**
 * Get full list of deficiency definitions
 */
export function getAllDeficiencies(): NutritionDeficiency[] {
  return nutritionDeficienciesData as NutritionDeficiency[];
}
