import dietDataRaw from '../data/diet.json';
import {
  CaseData,
  DiseaseDietData,
  LanguageCode,
  MultilingualList,
  MultilingualText,
  ResolvedDiet,
  ResolvedDietSection
} from '../types';

const dietData = dietDataRaw as unknown as Record<string, DiseaseDietData>;

/**
 * Safely extracts localized array of items from a MultilingualList
 */
export function getLocalizedArray(
  listObj?: MultilingualList,
  lang: LanguageCode = 'en'
): string[] {
  if (!listObj) return [];
  return listObj[lang] || listObj.en || [];
}

/**
 * Safely extracts localized string from a MultilingualText
 */
export function getLocalizedText(
  textObj?: MultilingualText,
  lang: LanguageCode = 'en'
): string {
  if (!textObj) return '';
  return textObj[lang] || textObj.en || '';
}

/**
 * Retrieve resolved dietary recommendations for a disease and patient profile
 */
export function getDiet(
  diseaseId: string,
  caseData: CaseData,
  lang: LanguageCode = 'en'
): ResolvedDiet {
  // Fallback to viral_fever if diseaseId is missing or unknown
  const diseaseDiet: DiseaseDietData =
    dietData[diseaseId] || dietData['viral_fever'];

  const ageGroup = (caseData.age_group || '').toLowerCase();
  let isAgeOverridden = false;
  let ageOverrideNote = '';

  // Start with default modern and ayurveda sections
  let modernSection = diseaseDiet.modern;
  let ayurvedaSection = diseaseDiet.ayurveda;

  // Check for age group overrides
  if (diseaseDiet.age_overrides) {
    if (ageGroup === 'infant' && diseaseDiet.age_overrides.infant) {
      const override = diseaseDiet.age_overrides.infant;
      if (override.modern) {
        modernSection = {
          eat: override.modern.eat || modernSection.eat,
          avoid: override.modern.avoid || modernSection.avoid,
          reason: override.modern.reason || modernSection.reason
        };
        isAgeOverridden = true;
        ageOverrideNote =
          lang === 'gu'
            ? 'શિશુઓ માટે ખાસ ગોઠવેલ આહાર'
            : lang === 'hi'
            ? 'शिशुओं के लिए विशेष आहार'
            : 'Specially adapted diet for Infants';
      }
      if (override.ayurveda && ayurvedaSection) {
        ayurvedaSection = {
          eat: override.ayurveda.eat || ayurvedaSection.eat,
          avoid: override.ayurveda.avoid || ayurvedaSection.avoid,
          reason: override.ayurveda.reason || ayurvedaSection.reason
        };
      }
    } else if (ageGroup === 'child' && diseaseDiet.age_overrides.child) {
      const override = diseaseDiet.age_overrides.child;
      if (override.modern) {
        modernSection = {
          eat: override.modern.eat || modernSection.eat,
          avoid: override.modern.avoid || modernSection.avoid,
          reason: override.modern.reason || modernSection.reason
        };
        isAgeOverridden = true;
        ageOverrideNote =
          lang === 'gu'
            ? 'બાળકો માટે અનુકૂળ આહાર'
            : lang === 'hi'
            ? 'बच्चों के लिए अनुकूलित आहार'
            : 'Child-adapted dietary guidance';
      }
    } else if (ageGroup === 'elderly' && diseaseDiet.age_overrides.elderly) {
      const override = diseaseDiet.age_overrides.elderly;
      if (override.modern) {
        modernSection = {
          eat: override.modern.eat || modernSection.eat,
          avoid: override.modern.avoid || modernSection.avoid,
          reason: override.modern.reason || modernSection.reason
        };
        isAgeOverridden = true;
        ageOverrideNote =
          lang === 'gu'
            ? 'વૃદ્ધો માટે સુપાચ્ય આહાર'
            : lang === 'hi'
            ? 'वरिष्ठ नागरिकों के लिए सुपाच्य आहार'
            : 'Easy-to-digest diet for Elderly';
      }
    }
  }

  // Resolve Modern section
  const resolvedModern: ResolvedDietSection = {
    eat: getLocalizedArray(modernSection?.eat, lang),
    avoid: getLocalizedArray(modernSection?.avoid, lang),
    reason: getLocalizedText(modernSection?.reason, lang)
  };

  // Resolve Ayurveda section if present
  let resolvedAyurveda: ResolvedDietSection | undefined = undefined;
  if (ayurvedaSection) {
    resolvedAyurveda = {
      eat: getLocalizedArray(ayurvedaSection.eat, lang),
      avoid: getLocalizedArray(ayurvedaSection.avoid, lang),
      reason: getLocalizedText(ayurvedaSection.reason, lang)
    };
  }

  return {
    modern: resolvedModern,
    ayurveda: resolvedAyurveda,
    isAgeOverridden,
    ageOverrideNote
  };
}
