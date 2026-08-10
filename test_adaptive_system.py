import json
import numpy as np
from predict_disease_xgboost import predict_disease_risk, calibrate_probabilities

def run_tests():
    print("=== TEST 1: Tri-State Vector & NaN Preservation in XGBoost ===")
    res1 = predict_disease_risk(confirmed_symptoms=["fever", "cough"], excluded_symptoms=["sharp chest pain"])
    assert res1["success"] is True
    assert "top5Ranking" in res1
    assert len(res1["top5Ranking"]) == 5
    assert res1["evidenceSummary"]["confirmedCount"] >= 2
    assert res1["evidenceSummary"]["excludedCount"] >= 1
    assert res1["evidenceSummary"]["unknownCount"] > 100
    print(f"PASS: Primary Disease: {res1['primaryDisease']} ({res1['formattedConfidence']})")
    print(f"Evidence: Confirmed={res1['evidenceSummary']['confirmedCount']}, Excluded={res1['evidenceSummary']['excludedCount']}, Unknown={res1['evidenceSummary']['unknownCount']}")

    print("\n=== TEST 2: Temperature-Scaled Probability Calibration ===")
    raw_probs = np.array([0.98, 0.01, 0.005, 0.003, 0.002] + [0.0]*31)
    calibrated = calibrate_probabilities(raw_probs, temperature=1.2)
    assert np.isclose(np.sum(calibrated), 1.0)
    assert calibrated[0] < 0.98  # Calibration softens extreme overconfidence
    print(f"PASS: Raw Top Prob={raw_probs[0]:.4f} -> Calibrated Top Prob={calibrated[0]:.4f}")

    print("\n=== TEST 3: Distinct Symptoms Vector Differentiation ===")
    # Chest pain presentation
    res_cardio = predict_disease_risk(confirmed_symptoms=["sharp chest pain", "shortness of breath", "sweating"])
    # Skin presentation
    res_derm = predict_disease_risk(confirmed_symptoms=["skin rash", "itching of skin", "skin dryness, peeling, scaliness, or roughness"])
    
    assert res_cardio["primaryDisease"] != res_derm["primaryDisease"]
    print(f"Cardio Presentation Top Match: {res_cardio['primaryDisease']}")
    print(f"Derm Presentation Top Match: {res_derm['primaryDisease']}")

    print("\nALL BACKEND & XGBOOST TESTS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    run_tests()
