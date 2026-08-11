import os
import json
import pandas as pd
import numpy as np

RAW_CSV = r"C:\Users\nitya\Downloads\archive (1)\Final_Augmented_dataset_Diseases_and_Symptoms.csv"
OUTPUT_CSV = "processed_clinical_dataset.csv"

# 36 High-prevalence, realistic diseases with abundant sample representation in clinical settings
SELECTED_DISEASES = [
    # 1. Respiratory, Pulmonology & ENT
    "common cold",
    "flu",
    "acute bronchitis",
    "pneumonia",
    "acute sinusitis",
    "strep throat",
    "tonsillitis",
    "asthma",
    "seasonal allergies (hay fever)",
    "acute bronchiolitis",
    "acute otitis media",

    # 2. Gastrointestinal & Abdominal
    "infectious gastroenteritis",
    "gastroesophageal reflux disease (gerd)",
    "gastroduodenal ulcer",
    "appendicitis",

    # 3. Cardiovascular & Hypertension
    "heart attack",
    "angina",
    "heart failure",
    "hypertensive heart disease",

    # 4. Neurological & Headaches
    "migraine",
    "tension headache",

    # 5. Metabolic, Endocrine & Renal
    "hypoglycemia",
    "diabetic peripheral neuropathy",
    "cystitis",
    "kidney stone",

    # 6. Dermatological
    "eczema",
    "contact dermatitis",
    "fungal infection of the skin",
    "pyogenic skin infection",

    # 7. Musculoskeletal, Spine & Joint
    "gout",
    "osteoarthritis",
    "rheumatoid arthritis",
    "sciatica",
    "chronic back pain",
    "spondylosis",

    # 8. Ophthalmic
    "conjunctivitis due to allergy"
]

def preprocess():
    print(f"Reading raw dataset: '{RAW_CSV}'...")
    df = pd.read_csv(RAW_CSV)
    print(f"Raw shape: {df.shape} (Rows: {len(df):,}, Columns: {len(df.columns)})")
    
    disease_col = df.columns[0]
    df[disease_col] = df[disease_col].astype(str).str.lower().str.strip()
    
    # Check match of selected diseases
    available_diseases = set(df[disease_col].unique())
    matched_diseases = [d for d in SELECTED_DISEASES if d in available_diseases]
    print(f"Matched {len(matched_diseases)} out of {len(SELECTED_DISEASES)} target clinical diseases.")
    
    # Filter rows to only matched diseases
    filtered_df = df[df[disease_col].isin(matched_diseases)].copy()
    print(f"Filtered to selected classes: {len(filtered_df):,} rows.")
    
    # Class distribution and balanced sampling (up to 900 samples per disease)
    samples_per_class = 900
    balanced_dfs = []
    
    for dis in matched_diseases:
        sub = filtered_df[filtered_df[disease_col] == dis]
        if len(sub) > samples_per_class:
            sub = sub.sample(n=samples_per_class, random_state=42)
        balanced_dfs.append(sub)
        
    balanced_df = pd.concat(balanced_dfs, ignore_index=True)
    print(f"Balanced dataset rows: {len(balanced_df):,} across {len(matched_diseases)} diseases.")
    
    # Feature reduction: Remove features that have 0 or almost 0 variance in these 35-40 diseases
    feature_cols = [c for c in balanced_df.columns if c != disease_col]
    
    # Calculate feature frequency across selected dataset
    feat_sums = balanced_df[feature_cols].apply(pd.to_numeric, errors='coerce').fillna(0).sum(axis=0)
    
    # Keep features that appear in at least 15 records and not in more than 95% records
    min_count = 15
    max_count = int(len(balanced_df) * 0.95)
    
    selected_features = feat_sums[(feat_sums >= min_count) & (feat_sums <= max_count)].index.tolist()
    print(f"Reduced feature columns from {len(feature_cols)} down to {len(selected_features)} relevant features.")
    
    # Final clean dataframe
    final_cols = [disease_col] + selected_features
    clean_df = balanced_df[final_cols].copy()
    
    # Ensure binary 0/1 integers
    for col in selected_features:
        clean_df[col] = pd.to_numeric(clean_df[col], errors='coerce').fillna(0).astype(int)
        
    clean_df.to_csv(OUTPUT_CSV, index=False)
    print(f"Successfully saved clean processed dataset to '{OUTPUT_CSV}'. Shape: {clean_df.shape}")
    
    # Summary of selected features & diseases
    meta = {
        "num_diseases": len(matched_diseases),
        "diseases": matched_diseases,
        "num_features": len(selected_features),
        "features": selected_features,
        "total_samples": len(clean_df)
    }
    
    with open("processed_metadata.json", "w", encoding="utf-8") as f:
        json.dump(meta, f, indent=2)
    print("Exported processed metadata to 'processed_metadata.json'.")

if __name__ == "__main__":
    preprocess()
