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
  'painful_walking': 'musculo',

  // Neurological & Balance
  'dizziness': 'neuro',
  'loss_of_balance': 'neuro',
  'unsteadiness': 'neuro',
  'spinning_movements': 'neuro',
  'slurred_speech': 'neuro',
  'weakness_of_one_body_side': 'neuro',
  'altered_sensorium': 'neuro',
  'lack_of_concentration': 'neuro',
  'visual_disturbances': 'neuro',
  'coma': 'neuro'
};

function areSymptomsInterrelated(confirmed: string[], candidate: string, topProb: number): boolean {
  if (confirmed.length === 0) return true;
  if (topProb >= 0.50) return true;

  const candCat = SYMPTOM_CATEGORIES[candidate.toLowerCase().trim()] || 'general';
  if (candCat === 'infectious' || candCat === 'general') return true;

  for (const cs of confirmed) {
    const csCat = SYMPTOM_CATEGORIES[cs.toLowerCase().trim()] || 'general';
    if (csCat === 'general' || csCat === candCat) {
      return true;
    }
  }

  return false;
}

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
 * Expected Information Gain & Multi-Criteria Question Utility Engine
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

  const { posterior, entropy: currentEntropy } = computeBayesianPosterior(vector);
  const p_D = posterior.reduce((acc, item) => {
    acc[item.diseaseId] = item.probability;
    return acc;
  }, {} as Record<string, number>);

  // Candidate disease differential (top conditions with >= 1.5% probability or top 5)
  const topCandidateList = posterior.filter((d, idx) => d.probability >= 0.015 || idx < 5);
  const topCandidateDiseases = new Set(topCandidateList.map((d) => d.diseaseId));

  let bestQuestion: any = null;
  let maxUtility = -Infinity;

  for (let fIdx = 0; fIdx < CANONICAL_FEATURES.length; fIdx++) {
    const featId = CANONICAL_FEATURES[fIdx];
    const featLower = featId.toLowerCase().trim();
    if (vector[featId] !== null && vector[featId] !== undefined) continue;
    if (vector[featLower] !== null && vector[featLower] !== undefined) continue;
    if (askedSet.has(featLower) || askedSet.has(featId)) continue;
    if (skippedSet.has(featLower) || skippedSet.has(featId)) continue;

    // 0. Clinical Relevance Filter: Symptom MUST be present (P(S|D) >= 0.08) in at least one candidate disease
    let maxCandidateAssociation = 0.0;
    for (const cand of topCandidateList) {
      const dIdx = CANONICAL_DISEASES.indexOf(cand.diseaseId);
      if (dIdx !== -1) {
        const pS = P_S_GIVEN_D[dIdx]?.[fIdx] ?? 0.0;
        if (pS > maxCandidateAssociation) {
          maxCandidateAssociation = pS;
        }
      }
    }

    // Skip symptoms with zero/negligible connection to the active differential pool
    if (maxCandidateAssociation < 0.08) continue;

    // 0.5. Smart Question Relevance Filter: Candidate symptom MUST co-occur (P(S_j | S_i) >= 0.05) with at least one confirmed symptom
    const confirmedRaw = Object.keys(vector).filter((k) => vector[k] === 1);
    const confirmedSymptoms = confirmedRaw.flatMap(getFeaturesForSymptom);
    if (confirmedSymptoms.length > 0) {
      const topProb = topCandidateList[0]?.probability ?? 0.0;
      if (!areSymptomsInterrelated(confirmedSymptoms, featId, topProb)) {
        continue;
      }

      let maxCoOccur = 0.0;
      for (const cs of confirmedSymptoms) {
        const csLower = cs.toLowerCase().trim();
        const matrix = diseaseModelData.symptom_co_occurrence as Record<string, Record<string, number>>;
        const csMatrix = matrix[cs] || matrix[csLower];
        if (csMatrix) {
          const prob = csMatrix[featId] || csMatrix[featLower] || 0.0;
          if (prob > maxCoOccur) maxCoOccur = prob;
        }
      }
      if (maxCoOccur < 0.05) continue;
    }

    // 1. Calculate case-specific P(S_j = 1 | Evidence)
    let p_S1 = 0.0;
    for (let d = 0; d < CANONICAL_DISEASES.length; d++) {
      const disId = CANONICAL_DISEASES[d];
      const pD = p_D[disId] || 0.0;
      const pS_given_D = P_S_GIVEN_D[d]?.[fIdx] ?? 0.05;
      p_S1 += pS_given_D * pD;
    }
    p_S1 = Math.max(0.01, Math.min(0.99, p_S1));
    const p_S0 = 1.0 - p_S1;

    // 2. Expected Entropy if S_j = 1
    const vecYes = { ...vector, [featId]: 1 as TriState };
    const { entropy: h_Yes } = computeBayesianPosterior(vecYes);

    // 3. Expected Entropy if S_j = 0
    const vecNo = { ...vector, [featId]: 0 as TriState };
    const { entropy: h_No } = computeBayesianPosterior(vecNo);

    // Expected Information Gain
    const expectedEntropy = p_S1 * h_Yes + p_S0 * h_No;
    const ig = Math.max(0.0, currentEntropy - expectedEntropy);

    // Metadata lookups
    const symMeta = (symptomsData as any[]).find((s) => s.id === featId);
    const reliability = symMeta?.reliability ?? 0.95;
    const answerability = symMeta?.answerability ?? 0.95;
    
    // Novelty / Skip penalty: If skipped previously ("Not Sure"), lower priority by 50%
    const novelty = skippedSet.has(featId) ? 0.50 : 1.0;

    // Differential Power: How strongly does this symptom split the leading conflicting candidates?
    let maxDiffGap = 0.0;
    if (topCandidateList.length >= 2) {
      const d1Idx = CANONICAL_DISEASES.indexOf(topCandidateList[0].diseaseId);
      const p1 = d1Idx !== -1 ? (P_S_GIVEN_D[d1Idx]?.[fIdx] ?? 0.0) : 0.0;
      for (let k = 1; k < Math.min(4, topCandidateList.length); k++) {
        const dkIdx = CANONICAL_DISEASES.indexOf(topCandidateList[k].diseaseId);
        const pk = dkIdx !== -1 ? (P_S_GIVEN_D[dkIdx]?.[fIdx] ?? 0.0) : 0.0;
        const gap = Math.abs(p1 - pk);
        if (gap > maxDiffGap) maxDiffGap = gap;
      }
    }

    const differentialAffinity = 1.0 + 2.0 * maxDiffGap + 1.2 * maxCandidateAssociation;

    // Utility = IG × Reliability × Answerability × Novelty × DifferentialAffinity
    const utility = ig * reliability * answerability * novelty * differentialAffinity;

    if (utility > maxUtility && ig >= 0.003) {
      maxUtility = utility;
      const trans = (diseaseModelData as any).feature_labels?.[featId] || symMeta?.label || {
        en: featId.replace(/_/g, ' '),
        hi: featId.replace(/_/g, ' '),
        gu: featId.replace(/_/g, ' ')
      };

      bestQuestion = {
        featureId: featId,
        featureName: trans.en || featId,
        utility: Math.round(utility * 1000) / 1000,
        informationGain: Math.round(ig * 100) / 100,
        question: {
          en: `Do you have ${trans.en.toLowerCase()}?`,
          hi: `क्या आपको ${trans.hi} की समस्या है?`,
          gu: `શું તમને ${trans.gu} ની તકલીફ છે?`
        },
        label: trans
      };
    }
  }

  return bestQuestion;
}

/**
 * Evaluate Multi-Criteria Stopping Conditions
 */
export function evaluateSessionStopping(session: DiagnosticSession): {
  isStoppingMet: boolean;
  reason: { en: string; hi: string; gu: string } | null;
} {
  const topProb = session.currentPosterior[0]?.probability ?? 0.0;
  const entropy = session.currentEntropy;
  const turn = session.questionCount;

  // 1. High Certainty: max P(D) >= 0.95
  if (topProb >= 0.95) {
    return {
      isStoppingMet: true,
      reason: {
        en: `🎯 High Diagnostic Certainty Reached (${Math.round(topProb * 100)}% confidence for ${session.currentPosterior[0].diseaseName})`,
        hi: `🎯 उच्च नैदानिक निश्चितता प्राप्त (${session.currentPosterior[0].diseaseName} हेतु ${Math.round(topProb * 100)}% सटीकता)`,
        gu: `🎯 ઉચ્ચ નિદાન ચોકસાઈ પ્રાપ્ત (${session.currentPosterior[0].diseaseName} માટે ${Math.round(topProb * 100)}% ચોકસાઈ)`
      }
    };
  }

  // 2. Low Uncertainty: Shannon Entropy <= 0.25 bits
  if (entropy <= 0.25) {
    return {
      isStoppingMet: true,
      reason: {
        en: `⚡ Diagnostic Uncertainty Minimized (Entropy: ${entropy} bits)`,
        hi: `⚡ नैदानिक अनिश्चितता न्यूनतम (Entropy: ${entropy} bits)`,
        gu: `⚡ નિદાન અનિશ્ચિતતા ન્યૂનતમ (Entropy: ${entropy} bits)`
      }
    };
  }

  // 3. Maximum 14 Questions Limit
  if (turn >= 14) {
    return {
      isStoppingMet: true,
      reason: {
        en: `📋 Target Clinical Question Limit (14 Questions) Reached`,
        hi: `📋 अधिकतम नैदानिक प्रश्न सीमा (14 प्रश्न) पूर्ण`,
        gu: `📋 લક્ષ્યાંકિત તબીબી પ્રશ્ન મર્યાદા (૧૪ પ્રશ્નો) પૂર્ણ`
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

