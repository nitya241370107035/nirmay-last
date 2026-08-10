import json
import subprocess
import sys

sys.stdout.reconfigure(encoding='utf-8')

payload = {
    "raw_vector_map": {
        "sharp chest pain": 1,
        "sweating": 1,
        "shortness of breath": 1
    },
    "top_k": 5,
    "temperature": 1.2
}

p = subprocess.run(["python", "predict_disease_xgboost.py", json.dumps(payload)], capture_output=True, text=True, encoding='utf-8')
data = json.loads(p.stdout)
print("PRIMARY:", data["primaryDisease"])
print("CONFIDENCE:", data["formattedConfidence"])
print("TOP5 RANKING:")
for d in data["top5Ranking"]:
    print(f"  #{d['rank']}: {d['diseaseName']} ({d['formattedProbability']}, {d['riskTier']})")
