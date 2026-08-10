import urllib.request
import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

BASE_URL = "http://localhost:3000"

def test_all_unknown_10_turns():
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
    asked_features = [next_q["featureId"]]
    print(f"✅ Session Started: {session_id}")
    print(f"  Turn #1: {next_q['featureName']} ({next_q['featureId']})")

    for i in range(2, 11):
        current_feat = asked_features[-1]
        req = urllib.request.Request(
            f"{BASE_URL}/api/answer-question",
            data=json.dumps({
                "sessionId": session_id,
                "featureId": current_feat,
                "answer": None # Not Sure / Unknown
            }).encode("utf-8"),
            headers={"Content-Type": "application/json"}
        )
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            
        next_q = data.get("nextQuestion")
        if not next_q:
            print(f"  🛑 Stopping criteria met at turn #{i}: {data['session']['stoppingReason']}")
            break
            
        feat_name = next_q["featureId"]
        print(f"  Turn #{i}: {next_q['featureName']} ({feat_name}) [IG: +{next_q['informationGain']}%]")
        
        if feat_name in asked_features:
            print(f"❌ ERROR: DUPLICATE QUESTION DETECTED AT TURN #{i}: {feat_name}")
            return False
            
        asked_features.append(feat_name)
        
    print(f"\n🎉 10-turn 'Not Sure' inquiry completed: {len(asked_features)} completely unique questions asked.")
    return True

if __name__ == "__main__":
    if not test_all_unknown_10_turns():
        exit(1)
