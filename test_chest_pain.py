import urllib.request
import json
import sys

sys.stdout.reconfigure(encoding='utf-8')
BASE_URL = "http://localhost:3000"

req = urllib.request.Request(
    f"{BASE_URL}/api/session/start",
    data=json.dumps({"initialSymptoms": ["sharp chest pain"]}).encode("utf-8"),
    headers={"Content-Type": "application/json"}
)
with urllib.request.urlopen(req) as resp:
    data = json.loads(resp.read().decode("utf-8"))
    
print("🏥 CHEST PAIN PRESENTATION:")
print("  Candidate Diseases:", [d.get('diseaseName', d.get('diseaseId')) for d in data['session']['currentPosterior'][:4]])
print(f"  Turn #1: {data['nextQuestion']['featureName']} ({data['nextQuestion']['featureId']})")
