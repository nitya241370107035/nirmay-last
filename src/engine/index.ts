import questionsData from '../data/questions.json';
import symptomMap from '../data/symptom_map.json';
import diseasesData from '../data/diseases.json';
import medicinesData from '../data/medicines.json';
import { extractSymptoms as extractSymptomsNLP, extractDuration as extractDurationNLP } from './nlp';
import { diseaseModelService, DiseasePredictionResult } from '../services/diseaseModelService';
import {
  CaseData,
  DiseaseDefinition,
  DiagnosisResult,
  DifferentialDiagnosis,
  DiseaseMedicines,
  RiskLevel,
  TriageAssessment,
  LanguageCode
} from '../types';

/**
 * Extract canonical symptom IDs from free text and checklist selections using Phase 2 NLP
 */
export function extractSymptoms(text: string = '', checklist: string[] = [], lang?: string): string[] {
  const found = new Set<string>();

  // 1. Add checklist selections directly
  checklist.forEach((sym) => found.add(sym));

  // 2. Extract symptoms using NLP engine (transliteration + Fuse.js fuzzy lexicon search + negation)
  if (text && text.trim()) {
    const nlpRes = extractSymptomsNLP(text, lang);
    nlpRes.symptoms.forEach((sym) => found.add(sym));
  }

  // 3. Fallback check on symptom_map.json for backward compatibility
  const lowerText = text.toLowerCase();
  Object.entries(symptomMap).forEach(([symptomId, keywords]) => {
    for (const kw of keywords as string[]) {
      if (lowerText.includes(kw.toLowerCase())) {
        found.add(symptomId);
        break;
      }
    }
  });

  return Array.from(found);
}

/**
 * Run diagnostic inference engine on patient case data
 */
export function evaluateCase(caseData: CaseData, currentLang: LanguageCode = 'en'): TriageAssessment {
  const chiefText = caseData.chief_complaint || '';
  const checklist = [
    ...(caseData.additional_symptoms || []),
    ...(caseData.associated_signs || []),
    ...(caseData.vitals || []),
    ...(caseData.medical_history || []),
    ...(caseData.exposure_history || []),
    ...(caseData.extraSymptoms || []),
  ];

  // Dynamic question mappings to clinical symptoms
  const dynamicSymptomMap: Record<string, string[]> = {
    radiating_pain: ['chest_pain'],
    associated_cold_sweat: ['sweating', 'dizziness'],
    chills_rigors: ['chills'],
    rash_or_bleeding: ['skin_rash', 'bleeding'],
    fever_above_104: ['high_fever'],
    stiff_neck: ['neck_stiffness'],
    unable_to_speak_sentences: ['breathing_difficulty'],
    bluish_lips_cyanosis: ['low_spo2'],
    rebound_tenderness: ['abdominal_pain'],
    blood_in_stool_vomit: ['blood_stool', 'vomiting'],
    dehydration_signs: ['dehydration'],
    burning_urination: ['burning_urination'],
    jaundice_yellow: ['yellow_eyes'],
    joint_swelling: ['joint_swelling'],
    sputum_thick: ['sputum'],
    loss_of_appetite: ['appetite_loss'],
  };

  // Add dynamic answers to checklist
  if (caseData.dynamicAnswers && typeof caseData.dynamicAnswers === 'object') {
    Object.entries(caseData.dynamicAnswers).forEach(([qId, ans]: [string, any]) => {
      const val = typeof ans === 'object' && ans !== null ? ans.value : ans;
      if (val === true || val === 'yes' || (typeof val === 'string' && val.includes('severe'))) {
        const syms = dynamicSymptomMap[qId] || [qId];
        syms.forEach((s) => checklist.push(s));
      }
    });
  }

  // Parse duration - use NLP extractDuration if available, otherwise numeric fallback
  let durationDays = parseInt(caseData.duration || '1', 10) || 1;
  const nlpDuration = extractDurationNLP(chiefText);
  if (nlpDuration && nlpDuration > 0) {
    durationDays = nlpDuration;
  }

  const severity = caseData.severity || 'mild';

  // 1. Extract symptoms via NLP + Checklist
  const extractedSymptoms = extractSymptoms(chiefText, checklist, currentLang);

  // 2. Score each disease safely
  const severityMultiplier = severity === 'severe' ? 1.5 : severity === 'moderate' ? 1.25 : 1.0;

  const scoredDiseases = (diseasesData as any[]).map((disease) => {
    let rawScore = 0;

    // Sum matching symptom weights safely
    if (disease.symptoms && typeof disease.symptoms === 'object') {
      Object.entries(disease.symptoms).forEach(([symptomId, weight]) => {
        if (extractedSymptoms.includes(symptomId)) {
          rawScore += (typeof weight === 'number' ? weight : 1);
        }
      });
    }

    // Check exclusion criteria safely
    let exclusionPenalized = false;
    if (Array.isArray(disease.exclusions)) {
      disease.exclusions.forEach((exSym: string) => {
        if (extractedSymptoms.includes(exSym)) {
          exclusionPenalized = true;
        }
      });
    }

    if (exclusionPenalized) {
      rawScore = Math.max(0, rawScore - 6);
    }

    // Check minimum duration
    const minDur = typeof disease.min_duration_days === 'number' ? disease.min_duration_days : 0;
    if (durationDays < minDur && rawScore > 0) {
      rawScore = Math.max(1, rawScore - 2);
    }

    const finalScore = Math.round(rawScore * severityMultiplier);

    const displayName = typeof disease.name === 'object'
      ? (disease.name[currentLang] || disease.name.en || disease.id)
      : (disease.displayName?.[currentLang] || disease.displayName?.en || disease.name || disease.id);

    return {
      disease: {
        ...disease,
        name: typeof disease.name === 'object' ? disease.name : { en: displayName, hi: displayName, gu: displayName }
      },
      displayName,
      score: finalScore,
    };
  });

  // Sort descending by score
  scoredDiseases.sort((a, b) => b.score - a.score);

  const topMatch = scoredDiseases[0] || {
    disease: (diseasesData[0] || { id: 'general_condition', name: { en: 'General Condition', hi: 'सामान्य स्थिति', gu: 'સામાન્ય સ્થિતિ' }, base_urgency: 'green' }) as any,
    displayName: 'General Condition',
    score: 0,
  };

  // Check if Calibrated XGBoost Prediction exists on caseData
  const mlDiseasePrediction = caseData.diseasePrediction || caseData.mlPrediction;
  const primaryName = mlDiseasePrediction?.primaryDisease || topMatch.displayName;
  const mlConfidence = mlDiseasePrediction?.confidence || (topMatch.score >= 12 ? 85 : topMatch.score >= 6 ? 65 : 45);

  // Determine confidence string
  let confidence: 'High' | 'Medium' | 'Low' = 'Low';
  if (mlConfidence >= 75 || topMatch.score >= 12) {
    confidence = 'High';
  } else if (mlConfidence >= 45 || topMatch.score >= 6) {
    confidence = 'Medium';
  }

  // Find differential diagnoses
  let differentials: DifferentialDiagnosis[] = [];
  if (mlDiseasePrediction?.differentials && Array.isArray(mlDiseasePrediction.differentials)) {
    differentials = mlDiseasePrediction.differentials.slice(0, 4).map((d: any, idx: number) => ({
      id: d.diseaseId || d.name?.toLowerCase() || `diff_${idx}`,
      disease: { id: d.diseaseId || d.name?.toLowerCase(), name: { en: d.diseaseName || d.name, hi: d.diseaseName || d.name, gu: d.diseaseName || d.name } } as any,
      name: d.diseaseName || d.name,
      score: d.probability || d.confidence || 30,
    }));
  } else {
    differentials = scoredDiseases
      .slice(1)
      .filter((d) => d.score >= 4 && topMatch.score - d.score <= 6)
      .slice(0, 3)
      .map((d) => ({
        id: d.disease.id,
        disease: d.disease,
        name: d.displayName,
        score: d.score,
      }));
  }

  const primaryDiseaseId = mlDiseasePrediction?.diseaseId || 
    (mlDiseasePrediction?.primaryDisease ? mlDiseasePrediction.primaryDisease.toLowerCase().trim() : topMatch.disease.id);

  const diagnosis: DiagnosisResult = {
    primaryDiseaseId,
    primaryDisease: {
      ...topMatch.disease,
      id: primaryDiseaseId,
      name: {
        en: primaryName,
        hi: primaryName,
        gu: primaryName
      }
    } as any,
    primaryName,
    score: topMatch.score,
    confidence,
    differentialDiagnoses: differentials,
    mlPrediction: mlDiseasePrediction,
  } as any;

  // 3. Determine Triage Risk Level
  let risk: RiskLevel = 'green';
  let emergencyTrigger: string | undefined;

  // Red Flags
  const redFlagSymptoms = ['unconscious', 'seizure', 'bleeding', 'chest_pain', 'breathing_difficulty', 'low_spo2', 'neck_stiffness', 'blood_stool', 'sharp chest pain', 'sweating', 'difficulty breathing', 'vomiting blood', 'blood in stool'];
  const hasRedFlag = extractedSymptoms.some((s) => redFlagSymptoms.includes(s)) ||
    (caseData.symptoms || []).some((s: string) => redFlagSymptoms.includes(s.toLowerCase().trim()));

  const emergencyDiseases = ['heart attack', 'angina', 'pneumonia', 'appendicitis', 'pyelonephritis', 'acute pancreatitis', 'cholecystitis'];
  const isEmergencyDisease = emergencyDiseases.includes((primaryName || '').toLowerCase().trim()) ||
    emergencyDiseases.includes((mlDiseasePrediction?.primaryDisease || '').toLowerCase().trim());

  if (hasRedFlag || isEmergencyDisease || mlDiseasePrediction?.urgency === 'red' || topMatch.disease.base_urgency === 'red') {
    risk = 'red';
    emergencyTrigger = isEmergencyDisease
      ? `Critical condition risk identified: ${primaryName}`
      : hasRedFlag
      ? `Red flag symptom detected (${(caseData.symptoms || extractedSymptoms).filter((s: string) => redFlagSymptoms.includes(s)).join(', ') || 'Critical Symptoms'})`
      : 'High urgency medical condition';
  } else if (
    mlDiseasePrediction?.urgency === 'orange' ||
    topMatch.disease.base_urgency === 'orange' ||
    severity === 'severe' ||
    durationDays >= 7
  ) {
    risk = 'orange';
  } else {
    risk = 'green';
  }

  return {
    risk,
    emergencyTrigger,
    diagnosis,
    extractedSymptoms,
  };
}

export { getMedicines, filterMedicines } from './medicineEngine';
export { getDiet, getLocalizedArray, getLocalizedText } from './dietEngine';
export { calculateHaversineDistance, getUserLocation, getSortedFacilities } from './location';

/**
 * Get medicines for a given disease ID (Legacy wrapper)
 */
export function getMedicinesForDisease(diseaseId: string): DiseaseMedicines | null {
  const allMeds = medicinesData as unknown as Record<string, DiseaseMedicines>;
  const meds = allMeds[diseaseId];
  if (!meds) {
    // Fallback default response
    return allMeds['viral_fever'] || null;
  }
  return meds;
}
