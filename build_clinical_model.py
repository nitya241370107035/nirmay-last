import os
import sys
import json
import numpy as np
import xgboost as xgb
from sklearn.model_selection import train_test_split
from sklearn.metrics import top_k_accuracy_score

sys.stdout.reconfigure(encoding='utf-8')

MODEL_JSON = "xgboost_disease_model.json"
META_OUT_SRC = os.path.join("src", "data", "disease_model_data.json")
META_OUT_PUB = os.path.join("public", "data", "disease_model_data.json")
TEMPLATES_JSON = os.path.join("src", "data", "templates.json")

with open(TEMPLATES_JSON, "r", encoding="utf-8") as f:
    templates = json.load(f)

from train_selected_xgboost import SYMPTOM_TRANSLATIONS

disease_translations = {}
for t in templates:
    disease_translations[t["diseaseKey"]] = t.get("name", {
        "en": t["diseaseKey"].title(),
        "hi": t["diseaseKey"].title(),
        "gu": t["diseaseKey"].title()
    })

with open(META_OUT_SRC, "r", encoding="utf-8") as f:
    existing_meta = json.load(f)

features = existing_meta["features"]
feature2idx = {f: i for i, f in enumerate(features)}
num_features = len(features)

diseases = sorted(list(set([t["diseaseKey"] for t in templates])))
disease2idx = {d: i for i, d in enumerate(diseases)}
num_diseases = len(diseases)

print(f"Conditions: {num_diseases}, Features: {num_features}")

# 1. Build High-Precision Clinical Conditional Probability Matrix P(S | D)
# Base unrelated symptom probability = 0.01 (1%)
p_s_given_d = np.full((num_diseases, num_features), 0.01, dtype=np.float32)

# Clinical Gold-Standard Signatures for Outpatient Diseases
anchors = {
    # Respiratory & ENT
    "flu": ["fever", "chills", "ache all over", "fatigue", "headache", "cough", "sore throat", "nasal congestion", "coryza"],
    "common cold": ["nasal congestion", "coryza", "sneezing", "sore throat", "cough", "headache", "fever"],
    "pneumonia": ["fever", "coughing up sputum", "cough", "sharp chest pain", "shortness of breath", "chills", "difficulty breathing", "wheezing", "weakness"],
    "acute bronchitis": ["cough", "coughing up sputum", "congestion in chest", "wheezing", "shortness of breath", "hurts to breath", "fever"],
    "acute bronchiolitis": ["wheezing", "cough", "breathing fast", "difficulty breathing", "nasal congestion", "fever", "irritable infant"],
    "strep throat": ["sore throat", "swollen or red tonsils", "throat redness", "difficulty in swallowing", "fever", "painful sinuses"],
    "tonsillitis": ["swollen or red tonsils", "sore throat", "throat redness", "difficulty in swallowing", "fever"],
    "asthma": ["wheezing", "shortness of breath", "difficulty breathing", "chest tightness", "cough", "breathing fast"],
    "acute sinusitis": ["sinus congestion", "painful sinuses", "nasal congestion", "facial pain", "headache", "fever", "coryza"],
    "seasonal allergies (hay fever)": ["sneezing", "coryza", "nasal congestion", "itchiness of eye", "lacrimation", "eye redness"],
    "acute otitis media": ["ear pain", "fluid in ear", "plugged feeling in ear", "diminished hearing", "fever", "pulling at ears"],
    "conjunctivitis due to allergy": ["eye redness", "itchiness of eye", "lacrimation", "eye burns or stings", "swollen eye"],

    # Cardiovascular
    "heart attack": ["sharp chest pain", "burning chest pain", "chest tightness", "shortness of breath", "sweating", "palpitations", "arm pain", "fainting", "increased heart rate", "irregular heartbeat"],
    "angina": ["sharp chest pain", "chest tightness", "burning chest pain", "shortness of breath", "palpitations", "arm pain", "increased heart rate"],
    "heart failure": ["shortness of breath", "difficulty breathing", "peripheral edema", "leg swelling", "fatigue", "palpitations", "increased heart rate"],
    "hypertensive heart disease": ["palpitations", "headache", "dizziness", "shortness of breath", "chest tightness", "irregular heartbeat"],

    # Neurological
    "migraine": ["frontal headache", "headache", "nausea", "dizziness", "vomiting", "diminished vision", "eye redness"],
    "tension headache": ["headache", "neck stiffness or tightness", "neck pain", "fatigue"],

    # Gastrointestinal & Renal
    "appendicitis": ["sharp abdominal pain", "lower abdominal pain", "vomiting", "nausea", "fever", "decreased appetite", "stomach bloating"],
    "infectious gastroenteritis": ["diarrhea", "vomiting", "nausea", "sharp abdominal pain", "fever", "stomach bloating", "decreased appetite"],
    "gastroesophageal reflux disease (gerd)": ["heartburn", "burning abdominal pain", "regurgitation", "burning chest pain", "nausea", "lump in throat"],
    "gastroduodenal ulcer": ["burning abdominal pain", "upper abdominal pain", "heartburn", "nausea", "vomiting", "decreased appetite"],
    "kidney stone": ["sharp abdominal pain", "side pain", "back pain", "painful urination", "blood in urine", "nausea", "frequent urination"],
    "cystitis": ["painful urination", "frequent urination", "suprapubic pain", "blood in urine", "unusual color or odor to urine", "symptoms of bladder"],

    # Musculoskeletal & Metabolic
    "gout": ["foot or toe pain", "foot or toe swelling", "foot or toe stiffness or tightness", "joint pain", "joint swelling", "knee pain"],
    "osteoarthritis": ["joint pain", "joint swelling", "knee pain", "knee swelling", "back pain", "hip pain", "ankle pain"],
    "rheumatoid arthritis": ["joint pain", "joint swelling", "hand or finger pain", "hand or finger swelling", "wrist pain", "wrist swelling", "ankle swelling"],
    "sciatica": ["sciatica", "low back pain", "leg pain", "paresthesia", "loss of sensation", "leg cramps or spasms"],
    "chronic back pain": ["back pain", "low back pain", "back stiffness or tightness", "back cramps or spasms"],
    "spondylosis": ["neck pain", "neck stiffness or tightness", "shoulder pain", "paresthesia", "headache"],
    "hypoglycemia": ["sweating", "palpitations", "dizziness", "weakness", "anxiety and nervousness", "fainting"],
    "diabetic peripheral neuropathy": ["loss of sensation", "paresthesia", "foot or toe pain", "leg pain", "leg weakness"],

    # Dermatological
    "eczema": ["skin rash", "itching of skin", "skin dryness, peeling, scaliness, or roughness", "skin irritation"],
    "contact dermatitis": ["skin rash", "itching of skin", "skin redness", "skin irritation", "allergic reaction"],
    "fungal infection of the skin": ["itching of skin", "skin rash", "skin lesion", "skin dryness, peeling, scaliness, or roughness"],
    "pyogenic skin infection": ["skin lesion", "acne or pimples", "skin swelling", "fever", "skin irritation"]
}

for d_name, sym_list in anchors.items():
    if d_name in disease2idx:
        d_idx = disease2idx[d_name]
        for rank, sym in enumerate(sym_list):
            if sym in feature2idx:
                idx = feature2idx[sym]
                p_s_given_d[d_idx, idx] = max(0.40, 0.95 - (rank * 0.04))

# 2. Fast Vectorized Generation of Multi-Turn Progressive Data (400 per class = 14,400 samples)
print("Vectorized generation of progressive clinical cases...")
np.random.seed(42)

all_X = []
all_y = []

N_PER_CLASS = 400

for d_idx in range(num_diseases):
    probs = p_s_given_d[d_idx]
    
    # 400 binary full samples
    rand_matrix = np.random.rand(N_PER_CLASS, num_features).astype(np.float32)
    binary_samples = (rand_matrix < probs).astype(np.float32)
    
    # Ensure key symptoms are present
    key_indices = np.where(probs >= 0.50)[0]
    if len(key_indices) > 0:
        for row_i in range(N_PER_CLASS):
            if binary_samples[row_i, key_indices].sum() == 0:
                k_pick = min(2, len(key_indices))
                chosen = np.random.choice(key_indices, size=k_pick, replace=False)
                binary_samples[row_i, chosen] = 1.0
                
    # Masking for progressive active inquiry (Turn 1 to 5)
    # Rows 0-80: Dense (Full vector)
    # Rows 80-400: Sparse (Turn 1, 2, 3, 4, 5)
    sparse_samples = binary_samples.copy()
    
    for row_i in range(80, N_PER_CLASS):
        active_pos = np.where(binary_samples[row_i] == 1.0)[0]
        inactive_neg = np.where(binary_samples[row_i] == 0.0)[0]
        
        row_vec = np.full(num_features, np.nan, dtype=np.float32)
        
        # Turn 1: 1 pos (35%), Turn 2: 2 pos (35%), Turn 3: 3 pos (20%), Turn 4+: 4 pos (10%)
        n_pos = np.random.choice([1, 2, 3, 4], p=[0.35, 0.35, 0.20, 0.10])
        n_neg = np.random.choice([0, 1, 2], p=[0.50, 0.30, 0.20])
        
        if len(active_pos) > 0:
            k = min(n_pos, len(active_pos))
            pos_chosen = np.random.choice(active_pos, size=k, replace=False)
            row_vec[pos_chosen] = 1.0
            
        if len(inactive_neg) > 0 and n_neg > 0:
            k_neg = min(n_neg, len(inactive_neg))
            neg_chosen = np.random.choice(inactive_neg, size=k_neg, replace=False)
            row_vec[neg_chosen] = 0.0
            
        sparse_samples[row_i] = row_vec
        
    all_X.append(sparse_samples)
    all_y.append(np.full(N_PER_CLASS, d_idx, dtype=np.int32))

X_data = np.vstack(all_X)
y_data = np.concatenate(all_y)

print(f"Total dataset: {X_data.shape[0]:,} samples.")

# 3. Train XGBoost Model
X_tr, X_va, y_tr, y_va = train_test_split(X_data, y_data, test_size=0.15, random_state=42, stratify=y_data)

dtr = xgb.DMatrix(X_tr, label=y_tr, missing=np.nan)
dva = xgb.DMatrix(X_va, label=y_va, missing=np.nan)

params = {
    'objective': 'multi:softprob',
    'num_class': num_diseases,
    'tree_method': 'hist',
    'max_depth': 5,
    'learning_rate': 0.1,
    'subsample': 0.85,
    'colsample_bytree': 0.85,
    'eval_metric': 'mlogloss',
    'seed': 42
}

print("Training XGBoost...")
bst = xgb.train(params, dtr, num_boost_round=80, evals=[(dtr, 'train'), (dva, 'val')], verbose_eval=20)

val_preds = bst.predict(dva)
top1_acc = top_k_accuracy_score(y_va, val_preds, k=1) * 100
top3_acc = top_k_accuracy_score(y_va, val_preds, k=3) * 100
top5_acc = top_k_accuracy_score(y_va, val_preds, k=5) * 100

print(f"\nAccuracy: Top-1 = {top1_acc:.2f}%, Top-3 = {top3_acc:.2f}%, Top-5 = {top5_acc:.2f}%")

bst.save_model(MODEL_JSON)

# Export synchronized metadata
p_disease = [1.0 / num_diseases] * num_diseases
meta_data = {
    "num_diseases": num_diseases,
    "num_features": num_features,
    "diseases": diseases,
    "features": features,
    "disease_translations": disease_translations,
    "symptom_translations": SYMPTOM_TRANSLATIONS,
    "p_disease": p_disease,
    "p_s_given_d": p_s_given_d.tolist(),
    "metrics": {
        "top1Accuracy": round(float(top1_acc), 2),
        "top3Accuracy": round(float(top3_acc), 2),
        "top5Accuracy": round(float(top5_acc), 2),
        "sampleSize": len(X_data),
        "totalConditions": num_diseases,
        "totalFeatures": num_features
    }
}

with open(META_OUT_SRC, "w", encoding="utf-8") as f:
    json.dump(meta_data, f, ensure_ascii=False, indent=2)

with open(META_OUT_PUB, "w", encoding="utf-8") as f:
    json.dump(meta_data, f, ensure_ascii=False, indent=2)

print("Exported synchronized metadata to src and public data directories.")
