import sys
import json
import os
import numpy as np
import xgboost as xgb

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "clinic_risk_xgboost_model.json")
META_PATH = os.path.join(BASE_DIR, "src", "data", "clinic_model_metadata.json")

# Load model metadata
if not os.path.exists(META_PATH):
    print(json.dumps({"success": False, "error": f"Metadata file not found at {META_PATH}"}))
    sys.exit(1)

with open(META_PATH, "r", encoding="utf-8") as f:
    meta = json.load(f)

# Load trained XGBoost model
bst = xgb.Booster()
if not os.path.exists(MODEL_PATH):
    print(json.dumps({"success": False, "error": f"Model file not found at {MODEL_PATH}"}))
    sys.exit(1)

bst.load_model(MODEL_PATH)

CLASSES = meta["classes"]
VITALS_NUMERICAL = meta["vitalsNumerical"]
SYMPTOM_COLS = meta["symptomColumns"]
FEATURE_NAMES = meta["featureNames"]
SYMPTOM_DETAILS = meta.get("symptomDetails", {})

def predict_risk(payload):
    """
    payload structure:
    {
      "vitals": {
        "heartRate": 85,
        "respiratoryRate": 16,
        "bodyTemperature": 37.0,
        "oxygenSaturation": 98,
        "systolicBp": 120,
        "diastolicBp": 80,
        "age": 45,
        "gender": "Male" | "Female",
        "derivedBmi": 24.2
      },
      "symptoms": {
        "cc_chestpain": 1,
        "cc_shortnessofbreath": 0,
        ...
      },
      "temperature": 1.0
    }
    """
    vitals_input = payload.get("vitals", {})
    symptoms_input = payload.get("symptoms", {})
    temp_scale = float(payload.get("temperature", 1.0))
    
    # 1. Parse Numerical Vitals with clinical defaults
    hr = float(vitals_input.get("heartRate", 80.0) or 80.0)
    rr = float(vitals_input.get("respiratoryRate", 16.0) or 16.0)
    temp = float(vitals_input.get("bodyTemperature", 36.8) or 36.8)
    spo2 = float(vitals_input.get("oxygenSaturation", 98.0) or 98.0)
    sbp = float(vitals_input.get("systolicBp", 120.0) or 120.0)
    dbp = float(vitals_input.get("diastolicBp", 80.0) or 80.0)
    age = float(vitals_input.get("age", 40.0) or 40.0)
    
    # Derived BMI
    bmi = vitals_input.get("derivedBmi")
    if bmi is None or float(bmi) <= 0:
        weight = vitals_input.get("weightKg")
        height_cm = vitals_input.get("heightCm")
        if weight and height_cm and float(height_cm) > 0:
            h_m = float(height_cm) / 100.0
            bmi = float(weight) / (h_m * h_m)
        else:
            bmi = 24.5
    else:
        bmi = float(bmi)
        
    # Gender (Male=1, Female=0)
    gender_str = str(vitals_input.get("gender", "Female")).strip().lower()
    gender_male = 1 if gender_str in ["male", "m", "1"] else 0

    vitals_vector = [hr, rr, temp, spo2, sbp, dbp, age, bmi, gender_male]

    # 2. Parse Symptoms (0, 1, or default 0 if missing/null)
    symptoms_vector = []
    active_symptoms = []
    for s_name in SYMPTOM_COLS:
        val = symptoms_input.get(s_name)
        if val is None or val == "null":
            # Also check without 'cc_' prefix
            val = symptoms_input.get(s_name.replace("cc_", ""))
        
        num_val = 1 if val in [1, "1", True, "true"] else 0
        symptoms_vector.append(num_val)
        if num_val == 1:
            active_symptoms.append(s_name)

    # 3. Construct 48-feature single-row input matrix
    full_vector = np.array(vitals_vector + symptoms_vector, dtype=np.float32).reshape(1, -1)
    dmat = xgb.DMatrix(full_vector, feature_names=FEATURE_NAMES)

    # 4. Predict raw softmax probabilities
    raw_probs = bst.predict(dmat)[0]

    # Optional Temperature Softmax Scaling
    if temp_scale != 1.0 and temp_scale > 0:
        logits = np.log(np.clip(raw_probs, 1e-7, 1.0)) / temp_scale
        exp_logits = np.exp(logits - np.max(logits))
        calibrated_probs = exp_logits / np.sum(exp_logits)
    else:
        calibrated_probs = raw_probs

    prob_dict = {
        CLASSES[i]: round(float(calibrated_probs[i]), 4)
        for i in range(len(CLASSES))
    }

    predicted_class_idx = int(np.argmax(calibrated_probs))
    predicted_risk = CLASSES[predicted_class_idx]
    confidence = float(calibrated_probs[predicted_class_idx])

    # 5. Deterministic Clinical Red Flags Check
    clinical_flags = []
    if spo2 < 90.0:
        clinical_flags.append({"level": "CRITICAL", "message": "Severe Hypoxemia (SpO2 < 90%) - High risk for respiratory compromise"})
    elif spo2 < 94.0:
        clinical_flags.append({"level": "WARNING", "message": "Sub-optimal Oxygen Saturation (SpO2 90-93%)"})

    if sbp < 90.0 or dbp < 50.0:
        clinical_flags.append({"level": "CRITICAL", "message": "Severe Hypotension / Shock state (SBP < 90 mmHg)"})
    elif sbp >= 180.0 or dbp >= 110.0:
        clinical_flags.append({"level": "CRITICAL", "message": "Hypertensive Crisis (BP >= 180/110 mmHg)"})

    if hr > 120.0:
        clinical_flags.append({"level": "WARNING", "message": "Marked Tachycardia (Heart Rate > 120 bpm)"})
    elif hr < 50.0:
        clinical_flags.append({"level": "WARNING", "message": "Severe Bradycardia (Heart Rate < 50 bpm)"})

    if temp >= 39.0:
        clinical_flags.append({"level": "WARNING", "message": "High-Grade Pyrexia (Temp >= 39.0°C / 102.2°F)"})

    if "cc_alteredmentalstatus" in active_symptoms or "cc_syncope" in active_symptoms:
        clinical_flags.append({"level": "CRITICAL", "message": "Neurological compromise / Altered conscious state reported"})

    # If critical red flag present and predicted as Low, escalate to High/Medium
    if any(f["level"] == "CRITICAL" for f in clinical_flags) and predicted_risk == "Low":
        predicted_risk = "High" if spo2 < 90 or sbp < 90 else "Medium"

    # 6. Clinical Guidance & Disposition
    disposition_map = {
        "High": {
            "urgency": "Immediate / Emergency Priority (Level 1-2)",
            "action": "Immediate clinical resuscitation / Tertiary hospital or ICU emergency transfer.",
            "color": "red",
            "timeframe": "Within 15 minutes"
        },
        "Medium": {
            "urgency": "Urgent Clinic Care (Level 3)",
            "action": "Urgent medical review by physician, diagnostic workup (ECG/Blood labs/Chest X-Ray), close vital monitoring.",
            "color": "amber",
            "timeframe": "Within 1 to 2 hours"
        },
        "Low": {
            "urgency": "Routine Outpatient Care (Level 4-5)",
            "action": "Standard outpatient consultation, symptomatic management, home care advisory and scheduled follow-up.",
            "color": "emerald",
            "timeframe": "Routine clinic appointment"
        }
    }

    # 7. Identify Top Contributing Symptom Factors
    top_symptoms_present = []
    for s in active_symptoms:
        s_info = SYMPTOM_DETAILS.get(s, {})
        top_symptoms_present.append({
            "id": s,
            "name": s_info.get("name", s.replace("cc_", "").title()),
            "category": s_info.get("category", "general"),
            "is_red_flag": s_info.get("is_red_flag", False)
        })

    return {
        "success": True,
        "riskCategory": predicted_risk,
        "confidence": round(confidence, 4),
        "probabilities": prob_dict,
        "clinicalFlags": clinical_flags,
        "disposition": disposition_map[predicted_risk],
        "vitalsEvaluated": {
            "heartRate": hr,
            "respiratoryRate": rr,
            "bodyTemperature": temp,
            "oxygenSaturation": spo2,
            "systolicBp": sbp,
            "diastolicBp": dbp,
            "age": age,
            "derivedBmi": round(bmi, 1),
            "gender": "Male" if gender_male == 1 else "Female"
        },
        "activeSymptomsCount": len(active_symptoms),
        "activeSymptoms": top_symptoms_present
    }

if __name__ == "__main__":
    if len(sys.argv) < 2:
        # Run test case
        sample_payload = {
            "vitals": {
                "heartRate": 115,
                "respiratoryRate": 24,
                "bodyTemperature": 38.8,
                "oxygenSaturation": 91.0,
                "systolicBp": 145,
                "diastolicBp": 92,
                "age": 62,
                "gender": "Male",
                "derivedBmi": 28.4
            },
            "symptoms": {
                "cc_chestpain": 1,
                "cc_shortnessofbreath": 1,
                "cc_dyspnea": 1,
                "cc_tachycardia": 1
            }
        }
        res = predict_risk(sample_payload)
        print(json.dumps(res, indent=2))
    else:
        try:
            input_data = json.loads(sys.argv[1])
            res = predict_risk(input_data)
            print(json.dumps(res))
        except Exception as e:
            print(json.dumps({"success": False, "error": str(e)}))
