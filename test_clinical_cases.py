import json
import subprocess
import sys

sys.stdout.reconfigure(encoding='utf-8')

test_cases = [
    ("Cardiac Emergency", {"sharp chest pain": 1, "sweating": 1, "shortness of breath": 1}),
    ("Dermatology", {"skin rash": 1, "itching of skin": 1}),
    ("Respiratory Distress", {"fever": 1, "cough": 1, "hurts to breath": 1, "difficulty breathing": 1}),
    ("Urinary Presentation", {"painful urination": 1, "blood in urine": 1}),
    ("Gout / Joint", {"foot or toe pain": 1, "foot or toe swelling": 1})
]

for label, vec in test_cases:
    payload = {"raw_vector_map": vec, "top_k": 5, "temperature": 1.2}
    p = subprocess.run(["python", "predict_disease_xgboost.py", json.dumps(payload)], capture_output=True, text=True, encoding='utf-8')
    data = json.loads(p.stdout)
    print(f"\n🧪 {label}:")
    print(f"  Primary: {data['primaryDisease']} ({data['formattedConfidence']}, {data['riskTier']})")
    print("  Top-3:", [(d['diseaseName'], d['formattedProbability']) for d in data['top5Ranking'][:3]])
