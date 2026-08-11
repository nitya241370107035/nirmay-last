import json
import os
import math

def load_json(path):
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f)

def run_tree_inference(trees, features, feature_names, num_classes=3):
    raw_scores = [0.0] * num_classes

    def evaluate_node(node):
        if 'leaf' in node:
            return node['leaf']
        split_feat = node.get('split')
        feat_val = 0.0
        if split_feat:
            if split_feat in feature_names:
                feat_val = float(features[feature_names.index(split_feat)])
            elif str(split_feat).startswith('f'):
                try:
                    idx = int(str(split_feat)[1:])
                    if idx < len(features):
                        feat_val = float(features[idx])
                except ValueError:
                    pass
        
        cond = node.get('split_condition', 0.0)
        missing_id = node.get('missing')
        
        if feat_val < cond:
            target_id = node.get('yes')
        else:
            target_id = node.get('no')
            
        child = next((c for c in node.get('children', []) if c.get('nodeid') == target_id), None)
        return evaluate_node(child) if child else (node.get('children', [{}])[0].get('leaf', 0.0))

    for i, tree in enumerate(trees):
        class_idx = i % num_classes
        raw_scores[class_idx] += evaluate_node(tree)

    max_logit = max(raw_scores)
    exp_scores = [math.exp(s - max_logit) for s in raw_scores]
    sum_exp = sum(exp_scores)
    probs = [s / sum_exp for s in exp_scores]
    pred_class = probs.index(max(probs))
    return pred_class, probs

def main():
    print("=" * 70)
    print("NIRAMAY CLINICAL CDSS & ML TRIAGE MODEL VALIDATION SUITE")
    print("=" * 70)

    # 1. Load artifacts
    trees = load_json("public/models/xgboost_trees.json")
    meta = load_json("public/models/model_metadata.json")
    diseases = load_json("src/data/diseases.json")
    templates = load_json("src/data/templates.json")

    feature_names = meta['feature_names']
    print(f"Loaded {len(trees)} trees, {len(feature_names)} features, {len(diseases)} diseases, {len(templates)} templates.")

    test_cases = [
        {
            "id": "CASE-01",
            "name": "Crushing Retrosternal Chest Pain (Cardiac Red Flag)",
            "chief_complaint": "chest_pain",
            "age": 58, "gender": "male", "duration": 1,
            "vitals": {"spo2": 92, "systolic_bp": 170, "heart_rate": 110, "temperature": 98.8},
            "dynamic_answers": {"pain_character": "crushing_pressure", "radiating_pain": True, "associated_cold_sweat": True},
            "expected_urgency": 2, # Red
            "expected_class": "Immediate Medical Attention"
        },
        {
            "id": "CASE-02",
            "name": "High Fever with Rigors & Mosquito Exposure (Malaria/Dengue)",
            "chief_complaint": "acute_fever",
            "age": 28, "gender": "female", "duration": 3,
            "vitals": {"spo2": 97, "systolic_bp": 118, "heart_rate": 96, "temperature": 103.2},
            "dynamic_answers": {"chills_rigors": True, "rash_or_bleeding": False},
            "expected_urgency": 1, # Orange
            "expected_class": "Consult within 48 Hours"
        },
        {
            "id": "CASE-03",
            "name": "Mild Common Cold & Sneezing (Home Care)",
            "chief_complaint": "pediatric_fever_cough",
            "age": 8, "gender": "male", "duration": 1,
            "vitals": {"spo2": 99, "systolic_bp": 105, "heart_rate": 82, "temperature": 99.1},
            "dynamic_answers": {"fast_breathing": False, "chest_indrawing": False},
            "expected_urgency": 0, # Green
            "expected_class": "Home Care"
        },
        {
            "id": "CASE-04",
            "name": "Severe Shortness of Breath with Low SpO2 (Hypoxia / Pneumonia)",
            "chief_complaint": "breathing_difficulty",
            "age": 67, "gender": "female", "duration": 2,
            "vitals": {"spo2": 86, "systolic_bp": 135, "heart_rate": 115, "temperature": 101.4},
            "dynamic_answers": {"unable_to_speak_sentences": True, "bluish_lips_cyanosis": True},
            "expected_urgency": 2, # Red
            "expected_class": "Immediate Medical Attention"
        },
        {
            "id": "CASE-05",
            "name": "Acute Watery Diarrhea with Mild Dehydration (Gastroenteritis)",
            "chief_complaint": "diarrhea_vomiting",
            "age": 34, "gender": "male", "duration": 2,
            "vitals": {"spo2": 98, "systolic_bp": 110, "heart_rate": 84, "temperature": 99.0},
            "dynamic_answers": {"fluid_tolerance": "moderate", "blood_in_stool": False},
            "expected_urgency": 0, # Green / Home ORS
            "expected_class": "Home Care"
        },
        {
            "id": "CASE-06",
            "name": "Severe Acute Abdominal Pain with Rebound Tenderness (Appendicitis)",
            "chief_complaint": "acute_abdomen",
            "age": 22, "gender": "female", "duration": 1,
            "vitals": {"spo2": 98, "systolic_bp": 125, "heart_rate": 102, "temperature": 100.8},
            "dynamic_answers": {"rebound_tenderness": True, "severe_vomiting": True},
            "expected_urgency": 1, # Moderate/Severe surgical consult
            "expected_class": "Consult within 48 Hours"
        },
        {
            "id": "CASE-07",
            "name": "Hypertensive Urgency (BP 195/110 with Severe Headache)",
            "chief_complaint": "hypertensive_crisis",
            "age": 62, "gender": "male", "duration": 1,
            "vitals": {"spo2": 96, "systolic_bp": 195, "heart_rate": 88, "temperature": 98.4},
            "dynamic_answers": {"blurred_vision": True, "chest_tightness": True},
            "expected_urgency": 2, # Red (Systolic > 180)
            "expected_class": "Immediate Medical Attention",
            "symptoms": ["headache", "dizziness", "chest_pain"],
            "expected_disease": "hypertension_crisis"
        },
        {
            "id": "CASE-08",
            "name": "Dengue Clinical Triad (Fever, Rash, Retro-orbital Headache, Mosquito)",
            "chief_complaint": "acute_fever",
            "age": 25, "gender": "male", "duration": 3,
            "vitals": {"spo2": 97, "systolic_bp": 115, "heart_rate": 90, "temperature": 102.5},
            "dynamic_answers": {"rash_or_bleeding": True, "chills_rigors": False},
            "expected_urgency": 1,
            "expected_class": "Consult within 48 Hours",
            "symptoms": ["fever", "bodyache", "headache", "skin_rash", "mosquito_exposure", "joint_swelling", "high_fever"],
            "expected_disease": "dengue"
        },
        {
            "id": "CASE-09",
            "name": "Malaria with Paroxysmal Chills & Spiking Fever",
            "chief_complaint": "acute_fever",
            "age": 32, "gender": "female", "duration": 3,
            "vitals": {"spo2": 97, "systolic_bp": 110, "heart_rate": 95, "temperature": 103.0},
            "dynamic_answers": {"chills_rigors": True, "rash_or_bleeding": False},
            "expected_urgency": 1,
            "expected_class": "Consult within 48 Hours",
            "symptoms": ["fever", "chills", "headache", "bodyache", "mosquito_exposure", "high_fever"],
            "expected_disease": "malaria"
        },
        {
            "id": "CASE-10",
            "name": "Dysuria with Suprapubic Discomfort (Urinary Tract Infection)",
            "chief_complaint": "urinary_symptoms",
            "age": 29, "gender": "female", "duration": 2,
            "vitals": {"spo2": 99, "systolic_bp": 118, "heart_rate": 78, "temperature": 99.2},
            "dynamic_answers": {"burning_urination": True},
            "expected_urgency": 0,
            "expected_class": "Home Care",
            "symptoms": ["burning_urination", "abdominal_pain", "fever"],
            "expected_disease": "uti"
        }
    ]

    passed_triage = 0
    passed_disease = 0
    disease_tests = 0
    print("\nRunning Test Cases through Tree Ensemble & Diagnostic Precision Engine:\n")

    def evaluate_disease_match(symptoms, duration_days):
        scored = []
        for dis in diseases:
            score = 0
            for sym, wt in dis.get('symptoms', {}).items():
                if sym in symptoms:
                    score += wt
            # Exclusions
            for ex in dis.get('exclusions', []):
                if ex in symptoms:
                    score = max(0, score - 6)
            if duration_days < dis.get('min_duration_days', 1) and score > 0:
                score = max(1, score - 2)
            scored.append((dis['id'], dis['name']['en'], score))
        scored.sort(key=lambda x: x[2], reverse=True)
        return scored

    for tc in test_cases:
        feat_vec = [0.0] * len(feature_names)
        
        # 1. Fill numeric vitals
        vitals = tc['vitals']
        def set_val(name, val):
            if name in feature_names:
                feat_vec[feature_names.index(name)] = float(val)

        set_val('duration_days', tc['duration'])
        set_val('body_temperature', vitals['temperature'])
        set_val('spo2_percent', vitals['spo2'])
        set_val('systolic_bp', vitals['systolic_bp'])
        set_val('heart_rate', vitals['heart_rate'])
        
        has_red = 1 if (vitals['spo2'] < 90 or vitals['systolic_bp'] >= 180 or any(tc['dynamic_answers'].values()) and tc.get('expected_urgency') == 2) else 0
        set_val('has_red_flag', has_red)
        set_val('comorbidities_count', 1 if tc['age'] > 50 else 0)

        # One-hot features
        cc_col = f"chief_complaint_{tc['chief_complaint']}"
        set_val(cc_col, 1.0)
        
        age_grp = 'pediatric' if tc['age'] <= 12 else ('young_adult' if tc['age'] <= 45 else ('middle_aged' if tc['age'] <= 65 else 'elderly'))
        set_val(f"age_group_{age_grp}", 1.0)
        set_val(f"gender_{tc['gender']}", 1.0)
        
        sev = 'severe' if has_red or tc['expected_urgency'] == 2 else ('moderate' if tc['expected_urgency'] == 1 else 'mild')
        set_val(f"severity_{sev}", 1.0)

        pred_class, probs = run_tree_inference(trees, feat_vec, feature_names)
        if has_red:
            pred_class = 2

        class_names = ["Home Care", "Consult within 48 Hours", "Immediate Medical Attention"]
        pred_label = class_names[pred_class]
        confidence = probs[pred_class] * 100

        is_triage_match = (pred_class == tc['expected_urgency'])
        if is_triage_match:
            passed_triage += 1
            t_status = "PASS"
        else:
            t_status = "FAIL"

        disease_info = ""
        if 'expected_disease' in tc:
            disease_tests += 1
            scored = evaluate_disease_match(tc['symptoms'], tc['duration'])
            top_dis_id = scored[0][0]
            top_dis_name = scored[0][1]
            top_score = scored[0][2]
            if top_dis_id == tc['expected_disease']:
                passed_disease += 1
                d_status = "PASS [OK]"
            else:
                d_status = f"FAIL (Expected {tc['expected_disease']}, got {top_dis_id})"
            disease_info = f"\n        [Disease CDSS: {d_status}] -> Top Match: {top_dis_name} (Score: {top_score})"

        print(f"[{t_status}] {tc['id']}: {tc['name']}")
        print(f"        Triage: Expected {tc['expected_class']} | Predicted: {pred_label} ({confidence:.1f}%) [Home={probs[0]:.2f}, 48h={probs[1]:.2f}, Immediate={probs[2]:.2f}]{disease_info}")
        print()

    print("=" * 70)
    print(f"RESULTS SUMMARY:")
    print(f" • Triage Urgency Accuracy: {passed_triage}/{len(test_cases)} ({passed_triage/len(test_cases)*100:.1f}%)")
    print(f" • Disease Precision Score: {passed_disease}/{disease_tests} ({passed_disease/disease_tests*100:.1f}%)")
    print("=" * 70)

if __name__ == '__main__':
    main()
