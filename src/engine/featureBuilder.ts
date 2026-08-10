import modelMetadata from '../data/model_metadata.json';
import { Patient } from '../types';
import { TriageTemplate } from '../services/triageModelService';

export interface VitalsInput {
  temperature?: number;
  spo2?: number;
  systolicBp?: number;
  heartRate?: number;
}

export interface FeatureBuilderResult {
  featureVector: number[];
  featureNames: string[];
  hasRedFlag: boolean;
  severity: 'mild' | 'moderate' | 'severe';
  comorbiditiesCount: number;
}

export function buildFeatureVector(
  patientProfile: Partial<Patient> | null | undefined,
  template: TriageTemplate,
  templateAnswers: Record<string, any> = {},
  vitals?: VitalsInput,
  durationDays = 1,
  userSeverity?: string
): FeatureBuilderResult {
  const meta = modelMetadata as any;
  const featureNames = meta.feature_names || meta.canonicalFeatureOrder || [];
  const vector = new Array(featureNames.length).fill(0.0);

  // 1. Vitals and durations with clinical imputations
  const duration = durationDays || 1;
  const imputations = meta.imputations || { body_temperature: 37.0, spo2_percent: 98, systolic_bp: 120, heart_rate: 75 };
  const temp = vitals?.temperature || imputations.body_temperature || 37.0;
  const spo2 = vitals?.spo2 || imputations.spo2_percent || 98;
  const sBp = vitals?.systolicBp || imputations.systolic_bp || 120;
  const hr = vitals?.heartRate || imputations.heart_rate || 75;

  // 2. Check for Red-Flag triggers
  let hasRedFlag = false;
  
  // Check template redFlags list
  if (template?.redFlags) {
    for (const flag of template.redFlags) {
      if (templateAnswers[flag] === true || templateAnswers[flag] === 'yes') {
        hasRedFlag = true;
        break;
      }
    }
  }

  // Check answers for severe options or boolean red flag question keys
  for (const [qId, ans] of Object.entries(templateAnswers)) {
    const val = typeof ans === 'object' && ans !== null ? ans.value : ans;
    if (val === true && (qId.includes('red_flag') || qId.includes('radiating') || qId.includes('cyanosis') || qId.includes('unconscious') || qId.includes('bleeding'))) {
      hasRedFlag = true;
    }
    if (typeof val === 'string' && (val.includes('severe') || val.includes('crushing') || val.includes('unable_to_speak'))) {
      hasRedFlag = true;
    }
  }

  // Physiological vital red flags
  if (spo2 < 90 || sBp >= 180 || temp >= 104) {
    hasRedFlag = true;
  }

  const comorbiditiesCount =
    (patientProfile?.allergies?.length || 0) +
    ((patientProfile as any)?.chronicConditions?.length || (patientProfile as any)?.medicalHistory?.length || 0);

  const setFeature = (name: string, val: number) => {
    const idx = featureNames.indexOf(name);
    if (idx !== -1) {
      vector[idx] = val;
    }
  };

  setFeature('duration_days', duration);
  setFeature('body_temperature', temp);
  setFeature('spo2_percent', spo2);
  setFeature('systolic_bp', sBp);
  setFeature('heart_rate', hr);
  setFeature('has_red_flag', hasRedFlag ? 1.0 : 0.0);
  setFeature('comorbidities_count', comorbiditiesCount);

  // 3. Chief Complaint one-hot
  const ccCol = `chief_complaint_${template.id}`;
  setFeature(ccCol, 1.0);

  // 4. Age Group one-hot
  const age = patientProfile?.age || 30;
  let ageGroup = 'young_adult';
  if (age <= 12) ageGroup = 'pediatric';
  else if (age <= 45) ageGroup = 'young_adult';
  else if (age <= 65) ageGroup = 'middle_aged';
  else ageGroup = 'elderly';

  setFeature(`age_group_${ageGroup}`, 1.0);

  // 5. Gender one-hot
  const gender = (patientProfile?.gender || 'female').toLowerCase();
  setFeature(`gender_${gender === 'male' ? 'male' : gender === 'female' ? 'female' : 'other'}`, 1.0);

  // 6. Severity one-hot
  let severity: 'mild' | 'moderate' | 'severe' = (userSeverity as any) || 'mild';
  if (hasRedFlag) {
    severity = 'severe';
  } else if (!userSeverity) {
    const answeredCount = Object.keys(templateAnswers).length;
    if (answeredCount >= 2 || duration > 3 || temp > 101.5 || sBp > 140) {
      severity = 'moderate';
    }
  }

  setFeature(`severity_${severity}`, 1.0);

  return {
    featureVector: vector,
    featureNames,
    hasRedFlag,
    severity,
    comorbiditiesCount
  };
}
