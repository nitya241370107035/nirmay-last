import sys
import json
import os
import numpy as np
import xgboost as xgb

MODEL_PATH = "xgboost_disease_model.json"
META_PATH = os.path.join("src", "data", "disease_model_data.json")

# Load model metadata
with open(META_PATH, "r", encoding="utf-8") as f:
    meta = json.load(f)

disease_classes = meta["diseases"]
features = meta["features"]
feature_labels = meta.get("feature_labels", {})
feature_index_map = {feat.lower().strip(): idx for idx, feat in enumerate(features)}

# Load trained native XGBoost model
bst = xgb.Booster()
bst.load_model(MODEL_PATH)

# Comprehensive synonym mappings
SYNONYMS = {
    'chest pain': ['sharp chest pain', 'chest tightness'],
    'breathing problem': ['shortness of breath', 'difficulty breathing', 'breathing fast'],
    'breathless': ['shortness of breath', 'difficulty breathing'],
    'fever': ['fever', 'chills'],
    'cough': ['cough', 'coughing up sputum'],
    'vomit': ['vomiting', 'nausea'],
    'stomach pain': ['sharp abdominal pain', 'burning abdominal pain', 'lower abdominal pain', 'upper abdominal pain'],
    'dizziness': ['dizziness', 'fainting'],
    'headache': ['headache', 'frontal headache'],
    'sore throat': ['sore throat'],
    'cold': ['nasal congestion'],
    'back pain': ['back pain', 'low back pain'],
    'rash': ['skin rash', 'itching of skin'],
    'sweat': ['sweating'],
    'palpitations': ['palpitations', 'irregular heartbeat'],
    'burning urine': ['painful urination', 'frequent urination'],
    'joint pain': ['joint pain', 'joint swelling']
}

def resolve_feature_index(symptom_str):
    s_clean = symptom_str.lower().strip().replace('_', ' ')
    if s_clean in feature_index_map:
        return feature_index_map[s_clean], s_clean
    for syn_k, syn_targets in SYNONYMS.items():
        if syn_k in s_clean or s_clean in syn_k:
            for target in syn_targets:
                if target in feature_index_map:
                    return feature_index_map[target], target
    for f_name, f_idx in feature_index_map.items():
        if f_name in s_clean or s_clean in f_name:
            return f_idx, f_name
    return None, None

def calibrate_probabilities(raw_probs, temperature=1.2):
    """
    Applies temperature scaling calibration to raw XGBoost softmax probabilities
    to avoid uncalibrated overconfidence and produce smooth clinical probability estimates.
    """
    epsilon = 1e-7
    clipped = np.clip(raw_probs, epsilon, 1.0 - epsilon)
    logits = np.log(clipped)
    scaled_logits = logits / max(0.5, temperature)
    scaled_logits -= np.max(scaled_logits)
    exp_logits = np.exp(scaled_logits)
    calibrated = exp_logits / np.sum(exp_logits)
    return calibrated

def predict_disease_risk(confirmed_symptoms=None, excluded_symptoms=None, raw_vector_map=None, top_k=5, temperature=1.2):
    """
    Predicts Top-K disease risk while preserving unknown features as np.nan (never zeroed out).
    """
    # 1. Initialize 144-D vector with NaN for all unknown / unasked features
    vec = np.full((1, len(features)), np.nan, dtype=np.float32)
    matched_confirmed = []
    matched_excluded = []

    # If raw vector map passed: { "fever": 1, "cough": 0, "chest pain": null }
    if raw_vector_map and isinstance(raw_vector_map, dict):
        for k, v in raw_vector_map.items():
            idx, canonical = resolve_feature_index(str(k))
            if idx is not None:
                if v == 1 or v is True or v == "1" or v == "yes":
                    vec[0, idx] = 1.0
                    matched_confirmed.append(canonical)
                elif v == 0 or v is False or v == "0" or v == "no":
                    vec[0, idx] = 0.0
                    matched_excluded.append(canonical)
                # null/None remains np.nan

    # Confirmed symptoms list (1.0)
    if confirmed_symptoms:
        for s in confirmed_symptoms:
            idx, canonical = resolve_feature_index(str(s))
            if idx is not None:
                vec[0, idx] = 1.0
                if canonical not in matched_confirmed:
                    matched_confirmed.append(canonical)

    # Excluded symptoms list (0.0)
    if excluded_symptoms:
        for s in excluded_symptoms:
            idx, canonical = resolve_feature_index(str(s))
            if idx is not None:
                vec[0, idx] = 0.0
                if canonical not in matched_excluded:
                    matched_excluded.append(canonical)

    # 2. Run XGBoost DMatrix inference with native missing value (NaN) support
    dmat = xgb.DMatrix(vec, missing=np.nan)
    raw_probs = bst.predict(dmat)[0]

    # 3. Calculate exact Bayesian posterior from clinical evidence
    p_s_matrix = np.array(meta.get("p_s_given_d", []), dtype=np.float64)
    p_prior = np.array(meta.get("p_disease", []), dtype=np.float64)
    
    if len(p_s_matrix) == len(disease_classes) and len(matched_confirmed) > 0:
        log_bayes = np.log(p_prior + 1e-7)
        for s in matched_confirmed:
            if s in feature_index_map:
                f_i = feature_index_map[s]
                log_bayes += np.log(p_s_matrix[:, f_i] + 1e-7)
        for s in matched_excluded:
            if s in feature_index_map:
                f_i = feature_index_map[s]
                log_bayes += np.log(1.0 - p_s_matrix[:, f_i] + 1e-7)
                
        # Softmax of Bayesian posterior
        log_bayes -= np.max(log_bayes)
        bayes_probs = np.exp(log_bayes) / np.sum(np.exp(log_bayes))
        
        # Harmonize XGBoost & Bayesian distributions (Geometric Mean / Log-odds blend)
        combined_logits = 0.5 * np.log(raw_probs + 1e-7) + 0.5 * np.log(bayes_probs + 1e-7)
        combined_logits /= max(0.5, temperature)
        combined_logits -= np.max(combined_logits)
        calibrated_probs = np.exp(combined_logits) / np.sum(np.exp(combined_logits))
    else:
        # Temperature Scaling Calibration
        calibrated_probs = calibrate_probabilities(raw_probs, temperature=temperature)

    # 4. Rank Top-K Diseases
    ranked_indices = np.argsort(calibrated_probs)[::-1][:top_k]

    top_diseases = []
    for rank_idx, idx in enumerate(ranked_indices):
        prob_pct = float(calibrated_probs[idx]) * 100.0
        dis_name = disease_classes[idx].title()
        
        if prob_pct >= 50.0:
            risk_tier = "High Risk"
        elif prob_pct >= 15.0:
            risk_tier = "Moderate Risk"
        else:
            risk_tier = "Low Risk"

        top_diseases.append({
            "rank": rank_idx + 1,
            "diseaseId": disease_classes[idx],
            "diseaseName": dis_name,
            "probability": round(prob_pct, 1),
            "formattedProbability": f"{prob_pct:.1f}%",
            "riskTier": risk_tier,
            "calibratedScore": round(float(calibrated_probs[idx]), 4)
        })

    primary = top_diseases[0] if top_diseases else None
    primary_name = primary["diseaseName"] if primary else "Clinical Risk Assessment"
    primary_prob = primary["probability"] if primary else 50.0

    # Differential diagnoses (ranks 2..K)
    differentials = top_diseases[1:] if len(top_diseases) > 1 else []

    unknown_count = int(np.isnan(vec).sum())
    confirmed_count = int((vec == 1.0).sum())
    excluded_count = int((vec == 0.0).sum())

    return {
        "success": True,
        "algorithm": "XGBoost (Histogram Multi-Class Softmax with Native NaN Missing Support & Temperature Calibration)",
        "primaryDisease": primary_name,
        "confidence": primary_prob,
        "formattedConfidence": f"{primary_prob:.1f}%",
        "riskTier": primary["riskTier"] if primary else "Moderate Risk",
        "top5Ranking": top_diseases,
        "differentials": differentials,
        "evidenceSummary": {
            "confirmedCount": confirmed_count,
            "excludedCount": excluded_count,
            "unknownCount": unknown_count,
            "totalFeaturesEvaluated": len(features),
            "confirmedSymptoms": matched_confirmed,
            "excludedSymptoms": matched_excluded
        },
        "disclaimer": "⚠️ Medical Prediction Disclaimer: This output is an AI-generated statistical disease-risk prediction based on reported symptoms, NOT a confirmed medical diagnosis. Always consult a qualified medical professional for official clinical diagnosis and treatment."
    }

if __name__ == "__main__":
    confirmed = []
    excluded = []
    vector_map = None
    top_k = 5
    temperature = 1.2

    if len(sys.argv) > 1:
        raw_input = " ".join(sys.argv[1:]).strip()
        try:
            parsed = json.loads(raw_input)
            if isinstance(parsed, dict):
                top_k = int(parsed.get("top_k", parsed.get("topK", 5)))
                temperature = float(parsed.get("temperature", 1.2))

                if "raw_vector_map" in parsed and isinstance(parsed["raw_vector_map"], dict):
                    vector_map = parsed["raw_vector_map"]
                elif "vector_map" in parsed and isinstance(parsed["vector_map"], dict):
                    vector_map = parsed["vector_map"]
                elif "vectorMap" in parsed and isinstance(parsed["vectorMap"], dict):
                    vector_map = parsed["vectorMap"]
                elif "confirmed" in parsed or "excluded" in parsed:
                    confirmed = parsed.get("confirmed", [])
                    excluded = parsed.get("excluded", [])
                elif "symptoms" in parsed:
                    confirmed = parsed.get("symptoms", [])
                    excluded = parsed.get("excludedSymptoms", [])
                else:
                    vector_map = parsed
            elif isinstance(parsed, list):
                confirmed = parsed
        except Exception:
            cleaned = raw_input.strip("[](){}")
            parts = cleaned.replace('"', '').replace("'", "").replace('\\', '').split(',')
            confirmed = [p.strip() for p in parts if p.strip()]

    if not confirmed and not vector_map:
        confirmed = ["fever", "cough"]
        excluded = ["sharp chest pain"]

    result = predict_disease_risk(
        confirmed_symptoms=confirmed,
        excluded_symptoms=excluded,
        raw_vector_map=vector_map,
        top_k=top_k,
        temperature=temperature
    )
    print(json.dumps(result, indent=2))

