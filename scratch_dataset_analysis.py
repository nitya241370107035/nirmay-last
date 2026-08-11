import pandas as pd
import numpy as np
import json

df = pd.read_csv("final_vitals_symptoms_dataset (1).csv")
print("Dataset Shape:", df.shape)
print("\nColumns:", list(df.columns))

vitals_cols = ['Heart Rate', 'Respiratory Rate', 'Body Temperature', 'Oxygen Saturation', 
               'Systolic Blood Pressure', 'Diastolic Blood Pressure', 'Age', 'Gender', 'Derived_BMI']
target_col = 'Risk Category'
symptom_cols = [c for c in df.columns if c not in vitals_cols and c != target_col]

print(f"\nNumber of vitals/demographic cols ({len(vitals_cols)}):", vitals_cols)
print(f"Number of symptom cols ({len(symptom_cols)}):", symptom_cols)

print("\nRisk Category value counts:")
print(df[target_col].value_counts(dropna=False, normalize=True))
print(df[target_col].value_counts(dropna=False))

print("\nGender value counts:")
print(df['Gender'].value_counts(dropna=False))

print("\nVitals Summary Statistics:")
print(df[vitals_cols].describe())

# Check symptom frequencies
symptom_freq = df[symptom_cols].sum().sort_values(ascending=False)
print("\nSymptom frequencies (sum of 1s):")
print(symptom_freq)

# Analyze symptom correlation / conditional co-occurrence for smart question pathways
# For each symptom, top 5 co-occurring symptoms
co_occurrence = {}
for s in symptom_cols:
    subset = df[df[s] == 1]
    if len(subset) > 0:
        other_counts = subset[symptom_cols].drop(columns=[s]).sum()
        top_correlated = other_counts.sort_values(ascending=False).head(8).to_dict()
        co_occurrence[s] = {
            "total_with_symptom": int(len(subset)),
            "top_co_occurring": top_correlated
        }

with open("scratch_analysis.json", "w") as f:
    json.dump({
        "vitals": vitals_cols,
        "symptoms": symptom_cols,
        "target_distribution": df[target_col].value_counts().to_dict(),
        "co_occurrence_sample": {k: co_occurrence[k] for k in list(co_occurrence.keys())[:5]}
    }, f, indent=2)

print("\nCo-occurrence for 'cc_fever':")
print(co_occurrence.get('cc_fever'))

print("\nCo-occurrence for 'cc_chestpain':")
print(co_occurrence.get('cc_chestpain'))
