import clinicMetadata from '../data/clinic_model_metadata.json';

export type SymptomAnswer = 1 | 0 | null;

export interface PatientVitals {
  heartRate: number;
  respiratoryRate: number;
  bodyTemperature: number;
  oxygenSaturation: number;
  systolicBp: number;
  diastolicBp: number;
  age: number;
  gender: 'Male' | 'Female';
  derivedBmi: number;
  heightCm?: number;
  weightKg?: number;
}

export interface PatientInfo {
  patientId?: string;
  name?: string;
  age: number;
  gender: 'Male' | 'Female';
  phone?: string;
  chiefComplaintText?: string;
}

export interface QuestionHistoryItem {
  turn: number;
  symptomId: string;
  symptomName: string;
  answer: SymptomAnswer;
  timestamp: number;
}

export interface AdaptiveQuestion {
  symptomId: string;
  symptomName: string;
  category: string;
  isRedFlag: boolean;
  question: {
    en: string;
    hi: string;
    gu: string;
  };
  relevanceScore: number;
  clinicalReason: string;
}

export interface ClinicSession {
  sessionId: string;
  patientInfo: PatientInfo;
  vitals: PatientVitals;
  chiefComplaint: string;
  activeCluster: string;
  symptomVector: Record<string, SymptomAnswer>;
  askedSymptoms: string[];
  skippedSymptoms: string[];
  questionHistory: QuestionHistoryItem[];
  questionCount: number;
  maxQuestions: number;
  isStoppingCriteriaMet: boolean;
  stoppingReason: string | null;
  createdAt: number;
  updatedAt: number;
}

// In-Memory Clinic Session Store
const clinicSessions = new Map<string, ClinicSession>();

const SYMPTOM_DETAILS = clinicMetadata.symptomDetails as Record<string, any>;
const CLINICAL_CLUSTERS = clinicMetadata.clinicalClusters as Record<string, string[]>;
const CO_OCCURRENCE = clinicMetadata.symptomCoOccurrence as Record<string, Record<string, number>>;
const ALL_SYMPTOMS = clinicMetadata.symptomColumns as string[];

/**
 * Identify the best matching clinical cluster for a given chief complaint
 */
export function findClusterForComplaint(complaintId: string): string {
  for (const [clusterKey, symptoms] of Object.entries(CLINICAL_CLUSTERS)) {
    if (symptoms.includes(complaintId)) {
      return clusterKey;
    }
  }
  return 'general';
}

/**
 * Resolves a natural string chief complaint to a canonical cc_* column
 */
export function resolveChiefComplaintId(rawInput: string): string {
  if (!rawInput) return 'cc_fever';
  const clean = rawInput.toLowerCase().trim().replace(/[\s-]+/g, '');

  // Exact match
  if (ALL_SYMPTOMS.includes(rawInput)) return rawInput;
  if (ALL_SYMPTOMS.includes(`cc_${clean}`)) return `cc_${clean}`;

  // Substring match
  for (const sym of ALL_SYMPTOMS) {
    const sClean = sym.replace('cc_', '').toLowerCase();
    if (clean.includes(sClean) || sClean.includes(clean)) {
      return sym;
    }
  }

  // Synonym dictionary mapping
  const commonMap: Record<string, string> = {
    fever: 'cc_fever',
    temperature: 'cc_fever',
    cold: 'cc_coldlikesymptoms',
    cough: 'cc_cough',
    sorethroat: 'cc_sorethroat',
    throat: 'cc_sorethroat',
    chestpain: 'cc_chestpain',
    chest: 'cc_chestpain',
    angina: 'cc_chestpain',
    breathless: 'cc_shortnessofbreath',
    breath: 'cc_shortnessofbreath',
    breathing: 'cc_breathingdifficulty',
    dyspnea: 'cc_dyspnea',
    palpitations: 'cc_palpitations',
    heartracing: 'cc_tachycardia',
    pulse: 'cc_tachycardia',
    stomachpain: 'cc_abdominalpain',
    stomach: 'cc_abdominalpain',
    abdomen: 'cc_abdominalpain',
    belly: 'cc_abdominalpain',
    vomit: 'cc_vomiting',
    vomiting: 'cc_vomiting',
    emesis: 'cc_emesis',
    nausea: 'cc_nausea',
    diarrhea: 'cc_diarrhea',
    loosemotions: 'cc_diarrhea',
    headache: 'cc_headache',
    head: 'cc_headache',
    dizziness: 'cc_dizziness',
    giddiness: 'cc_dizziness',
    spinning: 'cc_dizziness',
    faint: 'cc_syncope',
    unconscious: 'cc_syncope',
    blackout: 'cc_syncope',
    weakness: 'cc_weakness',
    fatigue: 'cc_fatigue',
    tired: 'cc_fatigue',
    urination: 'cc_dysuria',
    urine: 'cc_dysuria',
    burningurine: 'cc_dysuria',
    backpain: 'cc_backpain',
    back: 'cc_backpain',
    swelling: 'cc_edema',
    edema: 'cc_edema',
    rash: 'cc_skinproblem',
    skin: 'cc_skinproblem',
    cut: 'cc_laceration',
    wound: 'cc_laceration',
    sugar: 'cc_decreasedbloodsugar-symptomatic',
    hypoglycemia: 'cc_decreasedbloodsugar-symptomatic',
    highsugar: 'cc_elevatedbloodsugar-symptomatic',
    hyperglycemia: 'cc_elevatedbloodsugar-symptomatic',
    bleeding: 'cc_bleeding/bruising',
    bruising: 'cc_bleeding/bruising',
    earpain: 'cc_earpain',
    ear: 'cc_earpain',
    flank: 'cc_flankpain',
    sidepain: 'cc_flankpain'
  };

  for (const [key, target] of Object.entries(commonMap)) {
    if (clean.includes(key)) {
      return target;
    }
  }

  return 'cc_fever';
}

/**
 * Clinic Session Manager
 */
export const clinicSessionManager = {
  createSession(params: {
    patientInfo: PatientInfo;
    vitals: PatientVitals;
    chiefComplaint: string;
    maxQuestions?: number;
  }): ClinicSession {
    const sessionId = `clinic_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const resolvedCC = resolveChiefComplaintId(params.chiefComplaint);
    const cluster = findClusterForComplaint(resolvedCC);

    // Initialize symptom vector with nulls
    const symptomVector: Record<string, SymptomAnswer> = {};
    for (const sym of ALL_SYMPTOMS) {
      symptomVector[sym] = null;
    }

    // Mark the chief complaint as confirmed (1)
    symptomVector[resolvedCC] = 1;

    const session: ClinicSession = {
      sessionId,
      patientInfo: params.patientInfo,
      vitals: params.vitals,
      chiefComplaint: resolvedCC,
      activeCluster: cluster,
      symptomVector,
      askedSymptoms: [resolvedCC],
      skippedSymptoms: [],
      questionHistory: [
        {
          turn: 0,
          symptomId: resolvedCC,
          symptomName: SYMPTOM_DETAILS[resolvedCC]?.name || resolvedCC,
          answer: 1,
          timestamp: Date.now()
        }
      ],
      questionCount: 0,
      maxQuestions: params.maxQuestions || 5,
      isStoppingCriteriaMet: false,
      stoppingReason: null,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    clinicSessions.set(sessionId, session);
    return session;
  },

  getSession(sessionId: string): ClinicSession | null {
    return clinicSessions.get(sessionId) || null;
  },

  recordAnswer(sessionId: string, symptomId: string, answer: SymptomAnswer): ClinicSession | null {
    const session = clinicSessions.get(sessionId);
    if (!session) return null;

    session.symptomVector[symptomId] = answer;
    if (!session.askedSymptoms.includes(symptomId)) {
      session.askedSymptoms.push(symptomId);
    }

    session.questionCount += 1;
    session.questionHistory.push({
      turn: session.questionCount,
      symptomId,
      symptomName: SYMPTOM_DETAILS[symptomId]?.name || symptomId,
      answer,
      timestamp: Date.now()
    });

    session.updatedAt = Date.now();

    // Check stopping criteria
    if (session.questionCount >= session.maxQuestions) {
      session.isStoppingCriteriaMet = true;
      session.stoppingReason = 'Clinical question limit reached for intake session.';
    }

    return session;
  }
};

/**
 * Intelligent Context-Aware Question Selection
 * Prioritizes symptoms that:
 * 1. Belong to the active clinical cluster of the chief complaint.
 * 2. Have the highest empirical co-occurrence probability with the confirmed symptoms.
 * 3. Have not been asked or confirmed yet.
 */
export function selectNextClinicQuestion(session: ClinicSession): AdaptiveQuestion | null {
  if (session.isStoppingCriteriaMet || session.questionCount >= session.maxQuestions) {
    return null;
  }

  const confirmedSymptoms = Object.entries(session.symptomVector)
    .filter(([_, val]) => val === 1)
    .map(([id]) => id);

  const clusterSymptoms = CLINICAL_CLUSTERS[session.activeCluster] || [];

  // Calculate composite relevance score for each unasked symptom
  const candidateScores: Array<{ symptomId: string; score: number; reason: string }> = [];

  for (const sym of ALL_SYMPTOMS) {
    // Skip if already asked or resolved
    if (session.askedSymptoms.includes(sym) || session.symptomVector[sym] !== null) {
      continue;
    }

    const symInfo = SYMPTOM_DETAILS[sym];
    if (!symInfo) continue;

    let score = 0;
    let reason = '';

    // 1. Cluster membership bonus
    const isInCluster = clusterSymptoms.includes(sym);
    if (isInCluster) {
      score += 50.0;
      reason = `Clinically grouped under ${session.activeCluster.replace('_', ' ')}`;
    }

    // 2. Statistical co-occurrence with chief complaint & confirmed symptoms
    let coOccurSum = 0;
    for (const conf of confirmedSymptoms) {
      const p = CO_OCCURRENCE[conf]?.[sym] || 0;
      coOccurSum += p;
    }

    if (confirmedSymptoms.length > 0) {
      const avgCoOccur = coOccurSum / confirmedSymptoms.length;
      score += avgCoOccur * 100.0; // Scaled 0 to 100
      if (avgCoOccur > 0.25) {
        reason += reason ? ` and highly correlated (${Math.round(avgCoOccur * 100)}% co-occurrence)` : `Co-occurs in ${Math.round(avgCoOccur * 100)}% of matching clinical cases`;
      }
    }

    // 3. Red flag weight boost
    if (symInfo.is_red_flag) {
      score += 15.0;
    }

    candidateScores.push({
      symptomId: sym,
      score,
      reason: reason || 'Standard differential inquiry'
    });
  }

  if (candidateScores.length === 0) {
    session.isStoppingCriteriaMet = true;
    session.stoppingReason = 'All relevant clinical symptom inquiries completed.';
    return null;
  }

  // Sort descending by relevance score
  candidateScores.sort((a, b) => b.score - a.score);
  const bestCandidate = candidateScores[0];
  const symInfo = SYMPTOM_DETAILS[bestCandidate.symptomId];

  return {
    symptomId: bestCandidate.symptomId,
    symptomName: symInfo.name,
    category: symInfo.category,
    isRedFlag: symInfo.is_red_flag,
    question: symInfo.question,
    relevanceScore: Math.round(bestCandidate.score),
    clinicalReason: bestCandidate.reason
  };
}
