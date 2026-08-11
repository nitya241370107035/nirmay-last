import diseaseModelData from '../data/disease_model_data.json';
import symptomsData from '../data/symptoms.json';
import diseasesData from '../data/diseases.json';

export type TriState = 1 | 0 | null;

export interface SessionHistoryEntry {
  turn: number;
  featureId: string;
  featureName: string;
  answer: TriState;
  timestamp: number;
}

export interface RedFlagAlert {
  isEmergency: boolean;
  level: 'emergency_red' | 'urgent_orange' | 'standard_green';
  title: { en: string; hi: string; gu: string };
  guidance: { en: string; hi: string; gu: string };
}

export interface DiagnosticSession {
  sessionId: string;
  symptomVector: Record<string, TriState>;
  canonicalVector: (number | null)[];
  askedSymptoms: string[];
  skippedSymptoms: string[];
  questionHistory: SessionHistoryEntry[];
  currentPosterior: { diseaseId: string; diseaseName: string; probability: number }[];
  currentEntropy: number;
  questionCount: number;
  isStoppingCriteriaMet: boolean;
  stoppingReason: { en: string; hi: string; gu: string } | null;
  redFlagAlert: RedFlagAlert | null;
  createdAt: number;
  updatedAt: number;
  modelVersion: string;
}

// In-Memory Session Registry
const sessionStore = new Map<string, DiagnosticSession>();

// Precomputed model matrices
const CANONICAL_FEATURES: string[] = diseaseModelData.features;
const CANONICAL_DISEASES: string[] = diseaseModelData.diseases;
const P_DISEASE: number[] = diseaseModelData.p_disease;
const P_S_GIVEN_D: number[][] = diseaseModelData.p_s_given_d;
const FEATURE_MAP: Record<string, number> = diseaseModelData.features.reduce((acc, feat, idx) => {
  acc[feat.toLowerCase().trim()] = idx;
  return acc;
}, {} as Record<string, number>);

/**
 * Fuzzy / Canonical feature resolver
 */
export function resolveCanonicalFeature(rawFeature: string): string | null {
  if (!rawFeature) return null;
  const lower = rawFeature.toLowerCase().trim().replace(/_/g, ' ');
  if (FEATURE_MAP[lower] !== undefined) return lower;

  for (const feat of CANONICAL_FEATURES) {
    const fLower = feat.toLowerCase().trim();
    if (lower === fLower || lower.includes(fLower) || fLower.includes(lower)) {
      return feat;
    }
  }
  return null;
}

/**
 * Deterministic Red-Flag Safety Checker
 */
export function checkDeterministicRedFlags(vector: Record<string, TriState>): RedFlagAlert | null {
  const isPresent = (feat: string) => vector[feat] === 1;

  // 1. Acute Coronary / Myocardial Infarction Red Flag
  if (isPresent('sharp chest pain') && (isPresent('sweating') || isPresent('shortness of breath') || isPresent('arm pain'))) {
    return {
      isEmergency: true,
      level: 'emergency_red',
      title: {
        en: '🚨 CRITICAL: Possible Acute Cardiac Emergency (Heart Attack / Angina)',
        hi: '🚨 गंभीर चेतावनी: संभावित तीव्र हृदय आपातकाल (हार्ट अटैक)',
        gu: '🚨 ગંભીર ચેતવણી: સંભવિત હાર્ટ એટેક / કાર્ડિયાક ઈમરજન્સી'
      },
      guidance: {
        en: 'Severe chest pain combined with cold sweat or radiating arm pain requires IMMEDIATE emergency medical attention. Call an ambulance (108 / 911) or visit the nearest cardiac emergency room immediately.',
        hi: 'सीने में तेज दर्द के साथ पसीना या हाथ में दर्द होना आपातकालीन स्थिति है। तुरंत एम्बुलेंस (108) को कॉल करें या निकटतम आपातकालीन अस्पताल जाएं।',
        gu: 'છાતીમાં તીવ્ર દુખાવા સાથે પરસેવો કે હાથમાં દુખાવો થવો એ કટોકટીની સ્થિતિ છે. તાત્કાલિક ૧૦૮ એમ્બ્યુલન્સ બોલાવો અથવા નજીકની હોસ્પિટલ પહોંચો.'
      }
    };
  }

  // 2. Severe Respiratory Distress Red Flag
  if (isPresent('difficulty breathing') && isPresent('breathing fast') && (isPresent('wheezing') || isPresent('hurts to breath'))) {
    return {
      isEmergency: true,
      level: 'emergency_red',
      title: {
        en: '🚨 CRITICAL: Acute Severe Respiratory Distress',
        hi: '🚨 गंभीर चेतावनी: सांस लेने में अत्यधिक कठिनाई',
        gu: '🚨 ગંભીર ચેતવણી: શ્વાસ લેવામાં ભારે મુશ્કેલી'
      },
      guidance: {
        en: 'Acute shortness of breath with rapid breathing indicates respiratory compromise. Administer supplemental oxygen or bronchodilator if prescribed, and seek immediate emergency care.',
        hi: 'तेज सांस और सांस फूलना फेफड़ों की गंभीर समस्या दर्शाता है। तुरंत नजदीकी अस्पताल में आपातकालीन सहायता लें।',
        gu: 'ઝડપી શ્વાસોચ્છવાસ અને શ્વાસની તકલીફ ફેફસાંની ગંભીર કટોકટી સૂચવે છે. તાત્કાલિક તબીબી સારવાર મેળવો.'
      }
    };
  }

  // 3. Acute Abdominal Emergency (Peritoneal Signs / Appendicitis)
  if (isPresent('sharp abdominal pain') && isPresent('vomiting') && isPresent('fever') && isPresent('lower abdominal pain')) {
    return {
      isEmergency: true,
      level: 'urgent_orange',
      title: {
        en: '⚠️ URGENT: Acute Abdominal Emergency (Possible Appendicitis)',
        hi: '⚠️ आपातकालीन: पेट का गंभीर संक्रमण (अपेंडिसाइटिस की संभावना)',
        gu: '⚠️ તાકીદનું: પેટનો ગંભીર સોજો / એપેન્ડિસાઈટિસની સંભાવના'
      },
      guidance: {
        en: 'Severe localized abdominal pain with vomiting and fever requires urgent clinical surgical evaluation. Do not consume solid food and visit a hospital emergency department.',
        hi: 'उल्टी और बुखार के साथ पेट में तेज दर्द के लिए तुरंत सर्जन से जांच कराएं। कुछ भी भारी न खाएं और अस्पताल जाएं।',
        gu: 'ઊલટી અને તાવ સાથે પેટના નીચેના ભાગમાં તીવ્ર દુખાવો સર્જિકલ તપાસ માંગી લે છે. તાત્કાલિક હોસ્પિટલ પહોંચો.'
      }
    };
  }

  // 4. Gastrointestinal / Internal Bleeding Red Flag
  if (isPresent('vomiting blood') || isPresent('blood in stool')) {
    return {
      isEmergency: true,
      level: 'emergency_red',
      title: {
        en: '🚨 CRITICAL: Active Gastrointestinal Bleeding',
        hi: '🚨 गंभीर चेतावनी: आंतरिक रक्तस्राव',
        gu: '🚨 ગંભીર ચેતવણી: આંતરિક રક્તસ્ત્રાવ'
      },
      guidance: {
        en: 'Vomiting blood or passing blood in stool is a critical medical sign of gastrointestinal hemorrhage. Immediate emergency hospitalization is necessary.',
        hi: 'उल्टी या शौच में खून आना गंभीर आंतरिक रक्तस्राव का संकेत है। तुरंत अस्पताल में भर्ती हों।',
        gu: 'ઊલટી કે ઝાડામાં લોહી આવવું એ ગંભીર રક્તસ્ત્રાવ દર્શાવે છે. તાત્કાલિક હોસ્પિટલ પહોંચો.'
      }
    };
  }

  return null;
}

/**
 * Stable Log-Space Naïve Bayes Posterior Engine
 */
export function computeBayesianPosterior(vector: Record<string, TriState>): {
  posterior: { diseaseId: string; diseaseName: string; probability: number }[];
  entropy: number;
} {
  const numDiseases = CANONICAL_DISEASES.length;
  const logPosteriors = new Float64Array(numDiseases);

  // Initialize with log priors log(P(D))
  for (let d = 0; d < numDiseases; d++) {
    logPosteriors[d] = Math.log(Math.max(1e-7, P_DISEASE[d] || 1.0 / numDiseases));
  }

  // Multiply likelihoods for answered symptoms ONLY (Ignoring null/unknown)
  for (const [feat, val] of Object.entries(vector)) {
    if (val === null || val === undefined) continue;
    const fIdx = FEATURE_MAP[feat.toLowerCase().trim()];
    if (fIdx === undefined) continue;

    for (let d = 0; d < numDiseases; d++) {
      const pS1 = Math.max(1e-6, Math.min(1.0 - 1e-6, P_S_GIVEN_D[d]?.[fIdx] ?? 0.05));
      if (val === 1) {
        logPosteriors[d] += Math.log(pS1);
      } else if (val === 0) {
        logPosteriors[d] += Math.log(1.0 - pS1);
      }
    }
  }

  // Stable Log-Sum-Exp Normalization
  let maxLog = -Infinity;
  for (let d = 0; d < numDiseases; d++) {
    if (logPosteriors[d] > maxLog) maxLog = logPosteriors[d];
  }

  let sumExp = 0.0;
  const probs = new Float64Array(numDiseases);
  for (let d = 0; d < numDiseases; d++) {
    probs[d] = Math.exp(logPosteriors[d] - maxLog);
    sumExp += probs[d];
  }

  // Normalize and calculate Shannon Entropy H(D)
  let entropy = 0.0;
  const posteriorList = [];
  for (let d = 0; d < numDiseases; d++) {
    const p = probs[d] / (sumExp || 1.0);
    probs[d] = p;
    if (p > 1e-9) {
      entropy -= p * Math.log2(p);
    }
    posteriorList.push({
      diseaseId: CANONICAL_DISEASES[d],
      diseaseName: CANONICAL_DISEASES[d].replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      probability: Math.round(p * 1000) / 1000
    });
  }

  posteriorList.sort((a, b) => b.probability - a.probability);
  return {
    posterior: posteriorList,
    entropy: Math.round(entropy * 100) / 100
  };
}

const SYMPTOM_CATEGORIES: Record<string, string> = {
  // Infectious & General
  'high_fever': 'infectious',
  'mild_fever': 'infectious',
  'chills': 'infectious',
  'shivering': 'infectious',
  'cough': 'infectious',
  'runny_nose': 'infectious',
  'congestion': 'infectious',
  'throat_irritation': 'infectious',
  'sinus_pressure': 'infectious',
  'redness_of_eyes': 'infectious',
  'watering_from_eyes': 'infectious',
  'loss_of_smell': 'infectious',
  'headache': 'infectious',
  'fatigue': 'infectious',
  'malaise': 'infectious',
  'sweating': 'infectious',

  // Cardiorespiratory
  'chest_pain': 'cardio',
  'breathlessness': 'cardio',
  'fast_heart_rate': 'cardio',
  'palpitations': 'cardio',
  'blood_in_sputum': 'cardio',
  'coughing_up_blood': 'cardio',

  // Gastrointestinal
  'vomiting': 'gi',
  'nausea': 'gi',
  'abdominal_pain': 'gi',
  'stomach_pain': 'gi',
  'belly_pain': 'gi',
  'diarrhoea': 'gi',
  'constipation': 'gi',
  'acidity': 'gi',
  'indigestion': 'gi',
  'loss_of_appetite': 'gi',
  'stomach_bleeding': 'gi',
  'distention_of_abdomen': 'gi',

  // Dermatological
  'itching': 'skin',
  'skin_rash': 'skin',
  'nodal_skin_eruptions': 'skin',
  'pus_filled_pimples': 'skin',
  'blackheads': 'skin',
  'scurring': 'skin',
  'skin_peeling': 'skin',
  'blister': 'skin',
  'red_sore_around_nose': 'skin',
  'yellow_crust_ooze': 'skin',
  'silver_like_dusting': 'skin',
  'small_dents_in_nails': 'skin',
  'inflammatory_nails': 'skin',

  // Musculoskeletal
  'joint_pain': 'musculo',
  'muscle_pain': 'musculo',
  'back_pain': 'musculo',
  'neck_pain': 'musculo',
  'knee_pain': 'musculo',
  'hip_joint_pain': 'musculo',
  'muscle_weakness': 'musculo',
  'stiff_neck': 'musculo',
  'swelling_joints': 'musculo',
  'movement_stiffness': 'musculo',
  'painful_walking': 'musculo'
};

function getFeaturesForSymptom(s: string): string[] {
  const norm = s.toLowerCase().trim().replace(/[\s_]+/g, '_');
  if (CANONICAL_FEATURES.includes(norm)) {
    return [norm];
  }
  if (norm === 'fever') {
    return ['high_fever', 'mild_fever'];
  }
  if (norm === 'yellow_eyes' || norm === 'yellowing_of_eyes') {
    return ['yellowing_of_eyes'];
  }
  if (norm === 'neck_stiffness' || norm === 'stiff_neck') {
    return ['stiff_neck'];
  }
  if (norm === 'breathing_difficulty' || norm === 'difficulty_breathing') {
    return ['breathlessness'];
  }
  if (norm === 'appetite_loss' || norm === 'loss_of_appetite') {
    return ['loss_of_appetite'];
  }
  if (norm === 'burning_urination' || norm === 'painful_urination') {
    return ['burning_micturition'];
  }

  const results = CANONICAL_FEATURES.filter(
    (feat) => feat.includes(norm) || norm.includes(feat)
  );
  if (results.length > 0) {
    return results;
  }
  return [norm];
}

/**
 * Calculate Shannon Entropy of a probability distribution
 */
function calculateEntropy(probs: number[]): number {
  let ent = 0.0;
  for (const p of probs) {
    if (p > 1e-9) {
      ent -= p * Math.log2(p);
    }
  }
  return ent;
}

/**
 * STEP 2, 8, 9 — Adaptive Question Engine with Exact Mathematical Formulation:
 * question_score = 0.5 * co_occurrence_score + 0.4 * information_gain + 0.1 * candidate_coverage
 */
export function selectBestAdaptiveQuestion(session: DiagnosticSession): {
  featureId: string;
  featureName: string;
  utility: number;
  informationGain: number;
  question: { en: string; hi: string; gu: string };
  label: { en: string; hi: string; gu: string };
} | null {
  const vector = session.symptomVector;
  const askedSet = new Set((session.askedSymptoms || []).map((s) => s.toLowerCase().trim()));
  const skippedSet = new Set((session.skippedSymptoms || []).map((s) => s.toLowerCase().trim()));

  const confirmedRaw = Object.keys(vector).filter((k) => vector[k] === 1);
  const confirmedSymptoms = confirmedRaw.flatMap(getFeaturesForSymptom);

  const excludedRaw = Object.keys(vector).filter((k) => vector[k] === 0);
  const excludedSymptoms = excludedRaw.flatMap(getFeaturesForSymptom);

  // STEP 6: Soft Candidate Disease Scoring (No blind deletion)
  const candidateScores: number[] = new Array(CANONICAL_DISEASES.length).fill(1.0);

  for (let d = 0; d < CANONICAL_DISEASES.length; d++) {
    const pSList = P_S_GIVEN_D[d] || [];
    
    // Initial chief complaint & confirmed symptoms boost
    for (const cs of confirmedSymptoms) {
      const fIdx = CANONICAL_FEATURES.indexOf(cs);
      if (fIdx !== -1) {
        if ((pSList[fIdx] || 0) >= 0.10) {
          candidateScores[d] += 1.5;
        } else {
          candidateScores[d] = Math.max(0.05, candidateScores[d] * 0.7);
        }
      }
    }

    // Excluded symptoms penalty (soft decrease without deleting)
    for (const es of excludedSymptoms) {
      const fIdx = CANONICAL_FEATURES.indexOf(es);
      if (fIdx !== -1) {
        if ((pSList[fIdx] || 0) >= 0.80) {
          candidateScores[d] = Math.max(0.05, candidateScores[d] * 0.4);
        } else {
          candidateScores[d] += 0.3;
        }
      }
    }
  }

  // Active top candidates for the current round
  const maxScore = Math.max(...candidateScores);
  const topCandidateIndices = candidateScores
    .map((score, idx) => ({ idx, score }))
    .filter((item) => item.score >= Math.max(0.5, maxScore - 2.0))
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)
    .map((item) => item.idx);

  const activeIndices = topCandidateIndices.length > 0
    ? topCandidateIndices
    : Array.from({ length: CANONICAL_DISEASES.length }, (_, i) => i);

  // Calculate Base Entropy across top active candidate diseases
  const topScoreSum = activeIndices.reduce((sum, idx) => sum + candidateScores[idx], 0);
  const topProbs = activeIndices.map((idx) => candidateScores[idx] / Math.max(1e-9, topScoreSum));
  const baseEntropy = calculateEntropy(topProbs);

  // Configuration Weights (STEP 8)
  const W_COOCCUR = 0.5;
  const W_IG = 0.4;
  const W_COVERAGE = 0.1;

  let bestFeatureId: string | null = null;
  let bestScore = -Infinity;
  let bestIG = 0.0;
  let bestCooccur = 0.0;

  for (let fIdx = 0; fIdx < CANONICAL_FEATURES.length; fIdx++) {
    const featId = CANONICAL_FEATURES[fIdx];
    const featLower = featId.toLowerCase().trim();
    if (vector[featId] !== null && vector[featId] !== undefined) continue;
    if (vector[featLower] !== null && vector[featLower] !== undefined) continue;
    if (askedSet.has(featLower) || askedSet.has(featId)) continue;
    if (skippedSet.has(featLower) || skippedSet.has(featId)) continue;

    // A. Symptom Co-occurrence Score & C. Candidate Coverage
    let cooccurCount = 0;
    for (const dIdx of activeIndices) {
      if ((P_S_GIVEN_D[dIdx]?.[fIdx] || 0) >= 0.10) {
        cooccurCount++;
      }
    }

    const cooccurrenceScore = cooccurCount / Math.max(1, activeIndices.length);
    const candidateCoverage = cooccurrenceScore;

    // B. Information Gain Calculation (STEP 9)
    let pS1 = 0.0;
    for (let i = 0; i < activeIndices.length; i++) {
      const dIdx = activeIndices[i];
      if ((P_S_GIVEN_D[dIdx]?.[fIdx] || 0) >= 0.10) {
        pS1 += topProbs[i];
      }
    }
    const pS0 = 1.0 - pS1;

    // Conditional Entropy H(D | S=1)
    let hS1 = 0.0;
    const s1Probs: number[] = [];
    for (let i = 0; i < activeIndices.length; i++) {
      const dIdx = activeIndices[i];
      if ((P_S_GIVEN_D[dIdx]?.[fIdx] || 0) >= 0.10) {
        s1Probs.push(topProbs[i] / Math.max(1e-9, pS1));
      }
    }
    if (s1Probs.length > 0) {
      hS1 = calculateEntropy(s1Probs);
    }

    // Conditional Entropy H(D | S=0)
    let hS0 = 0.0;
    const s0Probs: number[] = [];
    for (let i = 0; i < activeIndices.length; i++) {
      const dIdx = activeIndices[i];
      if ((P_S_GIVEN_D[dIdx]?.[fIdx] || 0) < 0.10) {
        s0Probs.push(topProbs[i] / Math.max(1e-9, pS0));
      }
    }
    if (s0Probs.length > 0) {
      hS0 = calculateEntropy(s0Probs);
    }

    const expectedEntropyAfter = pS1 * hS1 + pS0 * hS0;
    const informationGain = Math.max(0.0, baseEntropy - expectedEntropyAfter);
    const igNorm = baseEntropy > 0 ? informationGain / baseEntropy : 0.0;

    // Question Score Formula (STEP 8)
    const questionScore = W_COOCCUR * cooccurrenceScore + W_IG * igNorm + W_COVERAGE * candidateCoverage;

    if (questionScore > bestScore) {
      bestScore = questionScore;
      bestFeatureId = featId;
      bestIG = igNorm;
      bestCooccur = cooccurrenceScore;
    }
  }

  // Fallback if candidate unasked symptoms are exhausted
  if (!bestFeatureId) {
    for (const featId of CANONICAL_FEATURES) {
      const featLower = featId.toLowerCase().trim();
      if (vector[featId] !== null && vector[featId] !== undefined) continue;
      if (vector[featLower] !== null && vector[featLower] !== undefined) continue;
      if (askedSet.has(featLower) || askedSet.has(featId)) continue;
      if (skippedSet.has(featLower) || skippedSet.has(featId)) continue;

      bestFeatureId = featId;
      bestScore = 0.5;
      bestIG = 0.2;
      bestCooccur = 0.3;
      break;
    }
  }

  if (!bestFeatureId) {
    return null;
  }

  const symMeta = (symptomsData as any[]).find((s) => s.id === bestFeatureId);
  const trans = (diseaseModelData as any).feature_labels?.[bestFeatureId] || symMeta?.label || {
    en: bestFeatureId.replace(/_/g, ' '),
    hi: bestFeatureId.replace(/_/g, ' '),
    gu: bestFeatureId.replace(/_/g, ' ')
  };

  return {
    featureId: bestFeatureId,
    featureName: trans.en || bestFeatureId,
    utility: Math.round(bestCooccur * 100) / 100,
    informationGain: Math.round(bestIG * 100) / 100,
    question: symMeta?.question || {
      en: `Do you have ${trans.en.toLowerCase()}?`,
      hi: `क्या आपको ${trans.hi} की समस्या है?`,
      gu: `શું તમને ${trans.gu} ની તકલીફ છે?`
    },
    label: trans
  };
}

/**
 * STEP 4, 7, 12 — Evaluate Multi-Criteria Stopping Conditions
 * Executes 3 to 4 rounds of 4 follow-up questions (Total 12 to 16 questions).
 */
export function evaluateSessionStopping(session: DiagnosticSession): {
  isStoppingMet: boolean;
  reason: { en: string; hi: string; gu: string } | null;
} {
  const turn = session.questionCount;
  const topProb = session.currentPosterior[0]?.probability ?? 0.0;

  // 1. High Certainty after at least 3 rounds (12 questions)
  if (turn >= 12 && topProb >= 0.96) {
    return {
      isStoppingMet: true,
      reason: {
        en: `✅ 3-Round Deep Clinical Triage Complete (High Diagnostic Certainty: ${Math.round(topProb * 100)}% for ${session.currentPosterior[0]?.diseaseName || 'Primary Match'}). Proceeding to XGBoost Decision Support.`,
        hi: `✅ 3-चरण गहन नैदानिक ट्राइएज पूर्ण (${Math.round(topProb * 100)}% निश्चितता)। XGBoost निर्णय समर्थन पर आगे बढ़ रहे हैं।`,
        gu: `✅ ૩-રાઉન્ડ ઊંડાણપૂર્વક ક્લિનિકલ ટ્રાયેજ પૂર્ણ (${Math.round(topProb * 100)}% ચોકસાઈ). XGBoost નિર્ણય સહાય માટે આગળ વધી રહ્યા છીએ.`
      }
    };
  }

  // 2. Comprehensive 4-Round Maximum (14-16 questions)
  if (turn >= 14) {
    return {
      isStoppingMet: true,
      reason: {
        en: `✅ Multi-Round Comprehensive Triage Complete (${turn} Targeted Questions Answered). Proceeding to XGBoost Decision Support.`,
        hi: `✅ बहु-चरणीय व्यापक ट्राइएज पूर्ण (${turn} प्रश्न उत्तरित)। XGBoost निर्णय समर्थन पर आगे बढ़ रहे हैं।`,
        gu: `✅ બહુ-રાઉન્ડ વ્યાપક ટ્રાયેજ પૂર્ણ (${turn} લક્ષ્યાંકિત પ્રશ્નો પૂર્ણ). XGBoost નિર્ણય સહાય માટે આગળ વધી રહ્યા છીએ.`
      }
    };
  }

  return { isStoppingMet: false, reason: null };
}

/**
 * Session Manager API
 */
export const sessionManager = {
  createSession(initialConfirmed: string[] = []): DiagnosticSession {
    const sessionId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const symptomVector: Record<string, TriState> = {};
    
    // Initialize all 144 canonical features to null
    for (const f of CANONICAL_FEATURES) {
      symptomVector[f] = null;
    }

    // Set initial confirmed symptoms
    for (const s of initialConfirmed) {
      const canonical = s.toLowerCase().trim();
      if (FEATURE_MAP[canonical] !== undefined) {
        symptomVector[canonical] = 1;
      }
    }

    const { posterior, entropy } = computeBayesianPosterior(symptomVector);
    const redFlagAlert = checkDeterministicRedFlags(symptomVector);

    const session: DiagnosticSession = {
      sessionId,
      symptomVector,
      canonicalVector: CANONICAL_FEATURES.map((f) => symptomVector[f]),
      askedSymptoms: [...initialConfirmed],
      skippedSymptoms: [],
      questionHistory: [],
      currentPosterior: posterior,
      currentEntropy: entropy,
      questionCount: 0,
      isStoppingCriteriaMet: false,
      stoppingReason: null,
      redFlagAlert,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      modelVersion: diseaseModelData.model_name
    };

    const stoppingEval = evaluateSessionStopping(session);
    session.isStoppingCriteriaMet = stoppingEval.isStoppingMet;
    session.stoppingReason = stoppingEval.reason;

    sessionStore.set(sessionId, session);
    return session;
  },

  getSession(sessionId: string): DiagnosticSession | null {
    return sessionStore.get(sessionId) || null;
  },

  recordAnswer(sessionId: string, featureId: string, answer: TriState): DiagnosticSession | null {
    const session = sessionStore.get(sessionId);
    if (!session) return null;

    const canonical = resolveCanonicalFeature(featureId) || featureId.toLowerCase().trim();

    // Update vector
    session.symptomVector[canonical] = answer;
    session.symptomVector[featureId] = answer;

    if (!session.askedSymptoms.includes(canonical)) {
      session.askedSymptoms.push(canonical);
    }
    if (!session.askedSymptoms.includes(featureId)) {
      session.askedSymptoms.push(featureId);
    }

    if (answer === null) {
      if (!session.skippedSymptoms.includes(canonical)) {
        session.skippedSymptoms.push(canonical);
      }
      if (!session.skippedSymptoms.includes(featureId)) {
        session.skippedSymptoms.push(featureId);
      }
    }

    session.questionCount += 1;
    session.questionHistory.push({
      turn: session.questionCount,
      featureId: canonical,
      featureName: canonical.replace(/_/g, ' '),
      answer,
      timestamp: Date.now()
    });

    // Recompute state
    const { posterior, entropy } = computeBayesianPosterior(session.symptomVector);
    session.currentPosterior = posterior;
    session.currentEntropy = entropy;
    session.canonicalVector = CANONICAL_FEATURES.map((f) => session.symptomVector[f]);
    session.redFlagAlert = checkDeterministicRedFlags(session.symptomVector);

    const stoppingEval = evaluateSessionStopping(session);
    session.isStoppingCriteriaMet = stoppingEval.isStoppingMet;
    session.stoppingReason = stoppingEval.reason;
    session.updatedAt = Date.now();

    sessionStore.set(sessionId, session);
    return session;
  },

  /**
   * Answer Revision Handler:
   * If user edits turn k, update vector, invalidate all subsequent questions (k+1, k+2, ...),
   * and recompute optimal posterior from that point.
   */
  reviseAnswer(sessionId: string, turnIndex: number, newAnswer: TriState): DiagnosticSession | null {
    const session = sessionStore.get(sessionId);
    if (!session) return null;
    if (turnIndex < 0 || turnIndex >= session.questionHistory.length) return null;

    const targetTurn = session.questionHistory[turnIndex];
    targetTurn.answer = newAnswer;
    targetTurn.timestamp = Date.now();

    // 1. Invalidate subsequent questions in history (Drop everything after turnIndex)
    const invalidatedTurns = session.questionHistory.slice(turnIndex + 1);
    session.questionHistory = session.questionHistory.slice(0, turnIndex + 1);
    session.questionCount = session.questionHistory.length;

    // 2. Reset invalidated features in symptom vector back to null
    for (const inv of invalidatedTurns) {
      session.symptomVector[inv.featureId] = null;
    }

    // 3. Apply target feature's new answer
    session.symptomVector[targetTurn.featureId] = newAnswer;

    // 4. Rebuild asked / skipped sets from valid history
    session.askedSymptoms = session.questionHistory.map((h) => h.featureId);
    session.skippedSymptoms = session.questionHistory.filter((h) => h.answer === null).map((h) => h.featureId);

    // 5. Recompute Bayesian posterior & entropy from revised state
    const { posterior, entropy } = computeBayesianPosterior(session.symptomVector);
    session.currentPosterior = posterior;
    session.currentEntropy = entropy;
    session.canonicalVector = CANONICAL_FEATURES.map((f) => session.symptomVector[f]);
    session.redFlagAlert = checkDeterministicRedFlags(session.symptomVector);

    const stoppingEval = evaluateSessionStopping(session);
    session.isStoppingCriteriaMet = stoppingEval.isStoppingMet;
    session.stoppingReason = stoppingEval.reason;
    session.updatedAt = Date.now();

    sessionStore.set(sessionId, session);
    return session;
  },

  deleteSession(sessionId: string): boolean {
    return sessionStore.delete(sessionId);
  },

  cleanupExpiredSessions(maxAgeMs = 24 * 60 * 60 * 1000): number {
    const now = Date.now();
    let count = 0;
    for (const [id, session] of sessionStore.entries()) {
      if (now - session.updatedAt > maxAgeMs) {
        sessionStore.delete(id);
        count++;
      }
    }
    return count;
  }
};

// Periodic Session Cleanup every 30 minutes in production
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    sessionManager.cleanupExpiredSessions();
  }, 30 * 60 * 1000).unref?.();
}

