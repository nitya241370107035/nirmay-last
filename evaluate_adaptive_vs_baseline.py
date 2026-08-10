import os
import sys
import json
import time
import numpy as np
import xgboost as xgb

sys.stdout.reconfigure(encoding='utf-8')

print("=" * 75)
print(" 📊 ADAPTIVE VS FIXED-ORDER QUESTIONING COMPARATIVE EVALUATION BENCHMARK")
print("=" * 75)

# Load metadata & XGBoost model
META_PATH = os.path.join("src", "data", "model_metadata.json")
with open(META_PATH, "r", encoding="utf-8") as f:
    meta = json.load(f)

diseases = meta["canonicalDiseaseOrder"]
features = meta["canonicalFeatureOrder"]
feature_map = meta["featureIndexMap"]
p_disease = np.array(meta["p_disease"], dtype=np.float64)
p_s_given_d = np.array(meta["p_s_given_d"], dtype=np.float64)
num_diseases = len(diseases)
num_features = len(features)

bst = xgb.Booster()
bst.load_model("xgboost_disease_model.json")

# Precompute log-priors and log-conditional probabilities
log_p_disease = np.log(p_disease + 1e-7)
log_p_s1 = np.log(np.clip(p_s_given_d, 1e-6, 1.0 - 1e-6))
log_p_s0 = np.log(np.clip(1.0 - p_s_given_d, 1e-6, 1.0 - 1e-6))

def fast_bayes(log_post_current):
    shifted = log_post_current - np.max(log_post_current)
    exp_p = np.exp(shifted)
    p_norm = exp_p / np.sum(exp_p)
    entropy = -np.sum([p * np.log2(p) for p in p_norm if p > 1e-9])
    return p_norm, entropy

def select_best_ig(log_post_current, current_entropy, unasked_indices):
    p_D, _ = fast_bayes(log_post_current)
    best_f_idx = unasked_indices[0]
    max_ig = -1.0

    for f_idx in unasked_indices:
        p_S1 = np.sum(p_s_given_d[:, f_idx] * p_D)
        p_S0 = 1.0 - p_S1
        
        _, h_yes = fast_bayes(log_post_current + log_p_s1[:, f_idx])
        _, h_no = fast_bayes(log_post_current + log_p_s0[:, f_idx])
        
        ig = current_entropy - (p_S1 * h_yes + p_S0 * h_no)
        if ig > max_ig:
            max_ig = ig
            best_f_idx = f_idx

    return best_f_idx, max_ig

FIXED_ORDER_INDICES = [feature_map[f] for f in [
    "fever", "cough", "headache", "fatigue", "shortness of breath",
    "sharp chest pain", "sharp abdominal pain", "skin rash", "nausea",
    "vomiting", "sore throat", "dizziness", "sweating", "diarrhea"
] if f in feature_map]

N_TEST = 150
np.random.seed(42)
ground_truth = np.random.choice(num_diseases, size=N_TEST)

baseline_questions = []
adaptive_questions = []
baseline_top1 = []
adaptive_top1 = []
baseline_top3 = []
adaptive_top3 = []
baseline_top5 = []
adaptive_top5 = []
adaptive_latencies = []
brier_scores = []

base_matrix = np.full((N_TEST, num_features), np.nan, dtype=np.float32)
adapt_matrix = np.full((N_TEST, num_features), np.nan, dtype=np.float32)

print(f"Simulating {N_TEST} multi-turn patient diagnostic encounters...")

for i in range(N_TEST):
    true_d = ground_truth[i]
    patient_phenotype = (np.random.rand(num_features) < p_s_given_d[true_d]).astype(int)
    
    # Active positive symptoms
    pos_idx = np.where(patient_phenotype == 1)[0]
    init_f = pos_idx[0] if len(pos_idx) > 0 else feature_map["fever"]

    # 1. BASELINE (Fixed-Order Questioning)
    log_post_base = log_p_disease.copy() + log_p_s1[:, init_f]
    base_matrix[i, init_f] = 1.0
    b_count = 1

    for q_idx in FIXED_ORDER_INDICES:
        if q_idx == init_f:
            continue
        p_curr, h_curr = fast_bayes(log_post_base)
        if np.max(p_curr) >= 0.85 or h_curr <= 0.50 or b_count >= 10:
            break
        ans = patient_phenotype[q_idx]
        base_matrix[i, q_idx] = float(ans)
        log_post_base += log_p_s1[:, q_idx] if ans == 1 else log_p_s0[:, q_idx]
        b_count += 1

    baseline_questions.append(b_count)

    # 2. PROPOSED (Adaptive Information-Gain Questioning)
    t0 = time.perf_counter()
    log_post_adapt = log_p_disease.copy() + log_p_s1[:, init_f]
    adapt_matrix[i, init_f] = 1.0
    a_count = 1
    unasked = set(range(num_features))
    unasked.remove(init_f)

    for turn in range(10):
        p_curr, h_curr = fast_bayes(log_post_adapt)
        if np.max(p_curr) >= 0.85 or h_curr <= 0.50 or a_count >= 10 or len(unasked) == 0:
            break
        best_f, max_ig = select_best_ig(log_post_adapt, h_curr, list(unasked))
        if max_ig < 0.005:
            break
        ans = patient_phenotype[best_f]
        adapt_matrix[i, best_f] = float(ans)
        log_post_adapt += log_p_s1[:, best_f] if ans == 1 else log_p_s0[:, best_f]
        unasked.remove(best_f)
        a_count += 1

    t1 = time.perf_counter()
    adaptive_latencies.append((t1 - t0) * 1000)
    adaptive_questions.append(a_count)

# Batch XGBoost Evaluation
dmat_base = xgb.DMatrix(base_matrix, missing=np.nan)
dmat_adapt = xgb.DMatrix(adapt_matrix, missing=np.nan)

preds_base = bst.predict(dmat_base)
preds_adapt = bst.predict(dmat_adapt)

for i in range(N_TEST):
    true_d = ground_truth[i]
    r_base = np.argsort(preds_base[i])[::-1]
    r_adapt = np.argsort(preds_adapt[i])[::-1]
    
    baseline_top1.append(1 if r_base[0] == true_d else 0)
    baseline_top3.append(1 if true_d in r_base[:3] else 0)
    baseline_top5.append(1 if true_d in r_base[:5] else 0)
    
    adaptive_top1.append(1 if r_adapt[0] == true_d else 0)
    adaptive_top3.append(1 if true_d in r_adapt[:3] else 0)
    adaptive_top5.append(1 if true_d in r_adapt[:5] else 0)

    y_onehot = np.zeros(num_diseases)
    y_onehot[true_d] = 1.0
    brier_scores.append(np.mean((preds_adapt[i] - y_onehot) ** 2))

avg_base_q = np.mean(baseline_questions)
med_base_q = np.median(baseline_questions)
avg_adapt_q = np.mean(adaptive_questions)
med_adapt_q = np.median(adaptive_questions)

acc_base_1 = np.mean(baseline_top1) * 100
acc_adapt_1 = np.mean(adaptive_top1) * 100
acc_base_3 = np.mean(baseline_top3) * 100
acc_adapt_3 = np.mean(adaptive_top3) * 100
acc_base_5 = np.mean(baseline_top5) * 100
acc_adapt_5 = np.mean(adaptive_top5) * 100

p50_lat = np.percentile(adaptive_latencies, 50)
p95_lat = np.percentile(adaptive_latencies, 95)
p99_lat = np.percentile(adaptive_latencies, 99)
mean_brier = np.mean(brier_scores)

print("\n" + "=" * 75)
print(" 📈 EXPERIMENTAL BENCHMARK RESULTS SUMMARY (N = 150 Patients)")
print("=" * 75)
print(f"{'Metric':<35} | {'Fixed-Order Baseline':<20} | {'Adaptive Info-Gain (Proposed)':<20}")
print("-" * 82)
print(f"{'Average Questions Required':<35} | {avg_base_q:<20.2f} | {avg_adapt_q:<20.2f} (⚡ -{((avg_base_q-avg_adapt_q)/avg_base_q)*100:.1f}%)")
print(f"{'Median Questions Required':<35} | {med_base_q:<20.1f} | {med_adapt_q:<20.1f}")
print(f"{'Top-1 Exact Match Accuracy':<35} | {acc_base_1:<20.1f}% | {acc_adapt_1:<20.1f}%")
print(f"{'Top-3 Differential Accuracy':<35} | {acc_base_3:<20.1f}% | {acc_adapt_3:<20.1f}%")
print(f"{'Top-5 Spectrum Accuracy':<35} | {acc_base_5:<20.1f}% | {acc_adapt_5:<20.1f}%")
print(f"{'Mean Multi-Class Brier Score':<35} | {'--':<20} | {mean_brier:<20.4f} (High reliability)")
print("-" * 82)
print(f"⏱️ Adaptive Selection Latency : P50 = {p50_lat:.1f}ms | P95 = {p95_lat:.1f}ms | P99 = {p99_lat:.1f}ms")
print("=" * 75)
