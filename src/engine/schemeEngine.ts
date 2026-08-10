import schemesData from '../data/schemes.json';
import { MultilingualText, LanguageCode } from '../types';

export interface PatientSchemeProfile {
  age: number;
  gender?: 'male' | 'female' | 'other' | string;
  incomeCriteria: {
    ration_card?: string;
    occupation?: string;
    vulnerable_group?: string;
  };
  familySize?: number;
  state?: string;
}

export interface SchemeBenefitItem {
  en: string;
  hi: string;
  gu: string;
}

export interface SchemeData {
  id: string;
  name: MultilingualText;
  description: MultilingualText;
  benefits: SchemeBenefitItem[];
  eligibility: {
    age_min: number;
    age_max: number;
    income_criteria: Array<{
      source: string;
      values: string[];
    }>;
    disease_criteria?: string[];
    family_size_max?: number | null;
  };
  state?: string | null;
  empanelment_type: string;
}

export interface EligibleSchemeResult {
  schemeId: string;
  name: MultilingualText;
  description: MultilingualText;
  benefits: SchemeBenefitItem[];
  empanelmentType: string;
  reasonForEligibility: MultilingualText;
}

export function checkEligibility(
  profile: PatientSchemeProfile,
  diagnosedDiseaseId?: string
): EligibleSchemeResult[] {
  const eligibleResults: EligibleSchemeResult[] = [];
  const schemes = schemesData as unknown as SchemeData[];

  for (const scheme of schemes) {
    // 1. Age check
    if (profile.age < scheme.eligibility.age_min || profile.age > scheme.eligibility.age_max) {
      continue;
    }

    // 2. Family size check
    if (
      scheme.eligibility.family_size_max &&
      profile.familySize &&
      profile.familySize > scheme.eligibility.family_size_max
    ) {
      continue;
    }

    // 3. State check (if scheme is state-specific, default to Gujarat matching)
    if (scheme.state && profile.state && profile.state.toLowerCase() !== scheme.state.toLowerCase()) {
      continue;
    }

    let isIncomeEligible = false;
    let matchedReasonEn = '';
    let matchedReasonHi = '';
    let matchedReasonGu = '';

    // Check income criteria matching
    for (const crit of scheme.eligibility.income_criteria) {
      const sourceKey = crit.source as keyof PatientSchemeProfile['incomeCriteria'];
      const userValue = profile.incomeCriteria[sourceKey];

      if (userValue && userValue !== 'None' && crit.values.includes(userValue)) {
        isIncomeEligible = true;
        const readableVal = userValue.replace(/_/g, ' ');

        matchedReasonEn = `Eligible based on ${readableVal} (${sourceKey.replace(/_/g, ' ')})`;
        matchedReasonHi = `पात्रता श्रेणी: ${readableVal}`;
        matchedReasonGu = `પાત્રતા શ્રેણી: ${readableVal}`;
        break;
      }
    }

    // Check disease criteria matching (disease criteria can grant eligibility even without income match!)
    let isDiseaseEligible = false;
    if (diagnosedDiseaseId && scheme.eligibility.disease_criteria) {
      const normalizedDisease = diagnosedDiseaseId.toLowerCase();
      if (
        scheme.eligibility.disease_criteria.some(
          (d) => d.toLowerCase() === normalizedDisease || normalizedDisease.includes(d.toLowerCase())
        )
      ) {
        isDiseaseEligible = true;
        matchedReasonEn = `Eligible based on diagnosed medical condition (${diagnosedDiseaseId.replace(/_/g, ' ')})`;
        matchedReasonHi = `चिकित्सीय स्थिति/बीमारी निदान के आधार पर पात्र`;
        matchedReasonGu = `નિદાન થયેલ બીમારીના આધારે વિશેષ પાત્રતા`;
      }
    }

    if (isIncomeEligible || isDiseaseEligible) {
      eligibleResults.push({
        schemeId: scheme.id,
        name: scheme.name,
        description: scheme.description,
        benefits: scheme.benefits,
        empanelmentType: scheme.empanelment_type,
        reasonForEligibility: {
          en: matchedReasonEn || 'Eligible based on beneficiary profile',
          hi: matchedReasonHi || 'लाभार्थी प्रोफ़ाइल के आधार पर पात्र',
          gu: matchedReasonGu || 'લાભાર્થી પ્રોફાઇલના આધારે પાત્ર'
        }
      });
    }
  }

  return eligibleResults;
}
