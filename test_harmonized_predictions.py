import sys
from predict_disease_xgboost import predict_disease_risk

sys.stdout.reconfigure(encoding='utf-8')

test_cases = [
    ("Fever only", ["fever"]),
    ("Sharp Chest Pain only", ["sharp chest pain"]),
    ("Skin Rash only", ["skin rash"]),
    ("Sharp Abdominal Pain only", ["sharp abdominal pain"]),
    ("Sore Throat + Fever", ["sore throat", "fever"]),
    ("Chest Pain + Shortness of Breath + Sweating", ["sharp chest pain", "shortness of breath", "sweating"]),
    ("Foot/Toe Pain + Swelling", ["foot or toe pain", "foot or toe swelling"]),
    ("Nasal Congestion + Sneezing + Coryza", ["nasal congestion", "sneezing", "coryza"]),
    ("Painful Urination + Blood in Urine", ["painful urination", "blood in urine"])
]

for title, syms in test_cases:
    res = predict_disease_risk(confirmed_symptoms=syms)
    print(f"=== {title.upper()} ===")
    print(f"Primary: {res['primaryDisease']} ({res['formattedConfidence']})")
    print("Differentials:")
    for d in res['differentials'][:4]:
        print(f"  • {d['diseaseName']}: {d['formattedProbability']} ({d['riskTier']})")
    print()
