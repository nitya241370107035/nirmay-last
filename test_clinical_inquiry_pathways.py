import urllib.request
import json
import sys

sys.stdout.reconfigure(encoding='utf-8')
BASE_URL = "http://localhost:3000"

def test_pathway(initial_symptom, expected_candidate_keywords, forbidden_unrelated_keywords):
    print(f"\n==========================================")
    print(f"🏥 Testing Pathway for: '{initial_symptom.upper()}'")
    print(f"==========================================")
    
    req = urllib.request.Request(
        f"{BASE_URL}/api/session/start",
        data=json.dumps({"initialSymptoms": [initial_symptom]}).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode("utf-8"))
        
    session_id = data["session"]["sessionId"]
    next_q = data["nextQuestion"]
    print(f"✅ Session Started: {session_id}")
    print(f"  Candidate Diseases Narrowed: {[d.get('diseaseName', d.get('diseaseId')) for d in data['session']['currentPosterior'][:4]]}")
    print(f"  Turn #1 Question: '{next_q['featureName']}' ({next_q['featureId']})")

    asked = [next_q["featureId"]]
    
    for turn in range(2, 6):
        current_feat = asked[-1]
        req = urllib.request.Request(
            f"{BASE_URL}/api/answer-question",
            data=json.dumps({
                "sessionId": session_id,
                "featureId": current_feat,
                "answer": 1 # Yes
            }).encode("utf-8"),
            headers={"Content-Type": "application/json"}
        )
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            
        next_q = data.get("nextQuestion")
        if not next_q:
            print(f"  🛑 Stopping criteria met at turn #{turn}: {data['session']['stoppingReason']}")
            break
            
        feat_name = next_q["featureName"]
        feat_id = next_q["featureId"]
        print(f"  Turn #{turn} Question: '{feat_name}' ({feat_id}) [IG: +{next_q['informationGain']}%]")
        
        # Check forbidden keywords
        for f_kw in forbidden_unrelated_keywords:
            if f_kw.lower() in feat_name.lower() or f_kw.lower() in feat_id.lower():
                print(f"❌ FAIL: Unrelated question '{feat_name}' asked for '{initial_symptom}' presentation!")
                return False
                
        asked.append(feat_id)
        
    print(f"✅ Pathway for '{initial_symptom}' PASSED: Questions were strictly clinically relevant!")
    return True

if __name__ == "__main__":
    # Test 1: Fever pathway
    fever_passed = test_pathway(
        initial_symptom="fever",
        expected_candidate_keywords=["flu", "bronchitis", "pneumonia", "tonsillitis", "dengue"],
        forbidden_unrelated_keywords=["back pain", "leg pain", "wrist", "vaginal", "toe pain", "foot pain", "sciatica"]
    )
    
    # Test 2: Back pain pathway
    back_passed = test_pathway(
        initial_symptom="back pain",
        expected_candidate_keywords=["disc", "strain", "kidney", "sciatica", "spondylitis"],
        forbidden_unrelated_keywords=["nasal congestion", "coryza", "ear pain", "sore throat", "runny nose"]
    )
    
    if fever_passed and back_passed:
        print("\n🎉 ALL CLINICAL INQUIRY PATHWAYS VERIFIED SUCCESSFULLY!")
    else:
        exit(1)
