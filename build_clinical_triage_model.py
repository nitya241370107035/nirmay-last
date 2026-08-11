import json
import os
import numpy as np
import pandas as pd
import xgboost as xgb
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, accuracy_score

def build_model():
    np.random.seed(42)
    n_samples = 5000

    # Clinical features for Triage:
    age_groups = ['pediatric', 'young_adult', 'middle_aged', 'elderly']
    genders = ['male', 'female', 'other']
    severities = ['mild', 'moderate', 'severe']
    durations = [1, 2, 3, 5, 7, 14, 30]
    
    chief_complaints = [
        'chest_pain', 'acute_fever', 'breathing_difficulty', 'severe_headache',
        'acute_abdomen', 'diarrhea_vomiting', 'pediatric_fever_cough',
        'pregnancy_complications', 'hypertensive_crisis', 'trauma_wound',
        'skin_rash_infection', 'urinary_symptoms', 'jaundice_liver',
        'altered_mental_status', 'joint_swelling', 'eye_vision_changes',
        'ear_throat_infection', 'heat_stroke', 'animal_bite', 'chronic_fatigue_weakness'
    ]

    data = []
    
    for _ in range(n_samples):
        # Target balanced distribution: ~35% Home Care, ~35% Consult 48h, ~30% Immediate
        target_urgency = int(np.random.choice([0, 1, 2], p=[0.35, 0.35, 0.30]))
        age_grp = np.random.choice(age_groups, p=[0.2, 0.35, 0.25, 0.2])
        gender = np.random.choice(genders, p=[0.48, 0.5, 0.02])

        if target_urgency == 2:
            # Immediate / Emergency
            cc = np.random.choice(['chest_pain', 'breathing_difficulty', 'altered_mental_status', 'hypertensive_crisis', 'trauma_wound', 'acute_abdomen'])
            duration = int(np.random.choice([1, 2, 3]))
            severity = 'severe'
            has_red_flag = 1
            if cc == 'breathing_difficulty':
                spo2 = float(np.clip(np.random.normal(87.0, 3.0), 70.0, 92.0))
            else:
                spo2 = float(np.clip(np.random.normal(94.0, 4.0), 80.0, 99.0))
            if cc == 'hypertensive_crisis':
                systolic_bp = float(np.clip(np.random.normal(190.0, 15.0), 180.0, 230.0))
            else:
                systolic_bp = float(np.clip(np.random.normal(140.0, 25.0), 90.0, 195.0))
            temp = float(np.random.normal(100.2, 2.0))
            heart_rate = float(np.clip(np.random.normal(108.0, 18.0), 60.0, 160.0))
            comorbidities_count = int(np.random.choice([0, 1, 2, 3], p=[0.2, 0.3, 0.3, 0.2]))
        elif target_urgency == 1:
            # Consult within 48h
            cc = np.random.choice(['acute_fever', 'jaundice_liver', 'urinary_symptoms', 'joint_swelling', 'ear_throat_infection', 'diarrhea_vomiting', 'pediatric_fever_cough', 'skin_rash_infection'])
            duration = int(np.random.choice([2, 3, 4, 5, 7]))
            severity = 'moderate'
            has_red_flag = 0
            spo2 = float(np.clip(np.random.normal(96.5, 1.5), 94.0, 99.0))
            systolic_bp = float(np.clip(np.random.normal(132.0, 12.0), 105.0, 155.0))
            temp = float(np.clip(np.random.normal(101.8, 1.2), 99.5, 103.5))
            heart_rate = float(np.clip(np.random.normal(88.0, 12.0), 65.0, 120.0))
            comorbidities_count = int(np.random.choice([0, 1, 2], p=[0.5, 0.35, 0.15]))
        else:
            # Home Care (Green)
            cc = np.random.choice(['pediatric_fever_cough', 'skin_rash_infection', 'diarrhea_vomiting', 'chronic_fatigue_weakness', 'ear_throat_infection'])
            duration = int(np.random.choice([1, 2]))
            severity = 'mild'
            has_red_flag = 0
            spo2 = float(np.clip(np.random.normal(98.5, 0.8), 97.0, 100.0))
            systolic_bp = float(np.clip(np.random.normal(118.0, 8.0), 100.0, 130.0))
            temp = float(np.clip(np.random.normal(98.8, 0.8), 97.5, 99.8))
            heart_rate = float(np.clip(np.random.normal(76.0, 8.0), 60.0, 90.0))
            comorbidities_count = 0

        data.append({
            'chief_complaint': cc,
            'age_group': age_grp,
            'gender': gender,
            'duration_days': duration,
            'severity': severity,
            'body_temperature': round(temp, 1),
            'spo2_percent': round(spo2, 1),
            'systolic_bp': round(systolic_bp, 1),
            'heart_rate': round(heart_rate, 1),
            'has_red_flag': has_red_flag,
            'comorbidities_count': comorbidities_count,
            'triage_urgency': target_urgency
        })

    df = pd.DataFrame(data)
    df.to_csv("triage_dataset.csv", index=False)
    print("Exported triage_dataset.csv with", len(df), "rows.")

    categorical_cols = ['chief_complaint', 'age_group', 'gender', 'severity']
    numeric_cols = ['duration_days', 'body_temperature', 'spo2_percent', 'systolic_bp', 'heart_rate', 'has_red_flag', 'comorbidities_count']

    imputations = {
        'duration_days': 1.0,
        'body_temperature': 98.6,
        'spo2_percent': 98.0,
        'systolic_bp': 120.0,
        'heart_rate': 75.0,
        'has_red_flag': 0,
        'comorbidities_count': 0,
        'chief_complaint': 'acute_fever',
        'age_group': 'young_adult',
        'gender': 'female',
        'severity': 'moderate'
    }

    X_encoded = pd.get_dummies(df.drop(columns=['triage_urgency']), columns=categorical_cols, drop_first=False)
    feature_names = X_encoded.columns.tolist()

    X = X_encoded.astype(np.float32)
    y = df['triage_urgency'].values

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)

    model = xgb.XGBClassifier(
        n_estimators=120,
        max_depth=5,
        learning_rate=0.08,
        objective='multi:softprob',
        num_class=3,
        random_state=42,
        eval_metric='mlogloss'
    )
    model.fit(X_train, y_train)

    preds = model.predict(X_test)
    acc = accuracy_score(y_test, preds)
    print(f"Model Test Accuracy: {acc:.4f}")
    print(classification_report(y_test, preds, target_names=['Home Care', 'Consult 48h', 'Immediate']))

    importances = model.feature_importances_
    feat_imp = sorted(zip(feature_names, [float(x) for x in importances]), key=lambda x: x[1], reverse=True)

    # Save model as native JSON
    os.makedirs("public/models", exist_ok=True)
    os.makedirs("src/data", exist_ok=True)

    model.save_model("public/models/xgboost_triage.json")
    model.save_model("src/data/xgboost_triage.json")

    # Export dumped trees structure for ultra-fast zero-dependency client inference
    trees_dump = model.get_booster().get_dump(dump_format='json')
    trees_json = [json.loads(t) for t in trees_dump]
    
    with open("public/models/xgboost_trees.json", "w", encoding="utf-8") as f:
        json.dump(trees_json, f)
    with open("src/data/xgboost_trees.json", "w", encoding="utf-8") as f:
        json.dump(trees_json, f)

    metadata = {
        "model_type": "xgboost_multiclass",
        "num_classes": 3,
        "classes": ["Home Care", "Consult within 48 Hours", "Immediate Medical Attention"],
        "class_colors": ["green", "orange", "red"],
        "risk_levels": ["green", "orange", "red"],
        "accuracy": float(acc),
        "feature_names": feature_names,
        "categorical_cols": categorical_cols,
        "numeric_cols": numeric_cols,
        "imputations": imputations,
        "top_features": feat_imp[:15]
    }

    with open("public/models/model_metadata.json", "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)
    with open("src/data/model_metadata.json", "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)

    print("SUCCESS: XGBoost triage model & metadata exported cleanly!")

if __name__ == '__main__':
    build_model()
