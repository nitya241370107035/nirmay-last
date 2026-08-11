import urllib.request
import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

BASE_URL = "http://localhost:3000"

def run_multi_turn_test():
    # 1. Start session with Fever
    req = urllib.request.Request(
        f"{BASE_URL}/api/session/start",
        data=json.dumps({"initialSymptoms": ["fever"]}).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode("utf-8"))
    
    session_id = data["session"]["sessionId"]
    next_q = data["nextQuestion"]
    print(f"✅ Session Started: {session_id}")
    print(f"  Turn #1: {next_q['featureName']} (IG: +{next_q['informationGain']}%)")

    asked_features = [next_q["featureId"]]
    
    # 2. Simulate 8 turns of mixed responses: Yes, No, Skip/Unknown
    responses = [1, 0, None, 1, 0, None, 1, 0]
    
    for i, ans in enumerate(responses):
        current_feat = asked_features[-1]
        
        req = urllib.request.Request(
            f"{BASE_URL}/api/answer-question",
            data=json.dumps({
                "sessionId": session_id,
                "featureId": current_feat,
                "answer": ans
            }).encode("utf-8"),
            headers={"Content-Type": "application/json"}
        )
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            
        next_q = data.get("nextQuestion")
        if not next_q:
            print(f"  🛑 Stopping criteria reached at turn #{i+2}: {data['session']['stoppingReason']}")
            break
            
        feat_name = next_q["featureId"]
        ans_str = "Yes (1)" if ans == 1 else "No (0)" if ans == 0 else "Unknown (null)"
        print(f"  Answered '{current_feat}' -> {ans_str} | Next Turn #{i+2}: '{next_q['featureName']}' (IG: +{next_q['informationGain']}%)")
        
        # Verify no duplicate question
        if feat_name in asked_features:
            print(f"❌ ERROR: DUPLICATE QUESTION DETECTED: {feat_name}")
            return False
            
        asked_features.append(feat_name)
        
    print(f"\n🎉 Multi-turn inquiry succeeded with {len(asked_features)} UNIQUE questions!")
    return True

if __name__ == "__main__":
    success = run_multi_turn_test()
    if not success:
        exit(1)
