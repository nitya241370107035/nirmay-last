import os
import json
import pyreadr
import pandas as pd
import numpy as np
import xgboost as xgb
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, accuracy_score

def main():
    rdata_path = r"C:\Users\nitya\Downloads\OriginalDataset.RData"
    print(f"Reading {rdata_path}...")
    result = pyreadr.read_r(rdata_path)
    
    key = list(result.keys())[0]
    df = result[key]
    print(f"Loaded DataFrame key: '{key}', shape: {df.shape}")
    
    # Save CSV
    csv_path = "triage_dataset.csv"
    df.to_csv(csv_path, index=False)
    print(f"Saved CSV to {csv_path}")
    
    print("\nColumns and Data Types:")
    for col in df.columns:
        print(f" - {col}: {df[col].dtype} ({df[col].nunique()} unique)")
        
    print("\nFirst 5 rows:")
    print(df.head())
    
    # Target column determination
    # Look for triage_urgency or urgency or triage or similar
    possible_targets = [c for c in df.columns if any(k in c.lower() for k in ['triage', 'urgency', 'acuity', 'target', 'disposition', 'risk', 'esi'])]
    print(f"\nPossible target columns: {possible_targets}")
    
    target_col = None
    if 'triage_urgency' in df.columns:
        target_col = 'triage_urgency'
    elif len(possible_targets) > 0:
        target_col = possible_targets[0]
    else:
        # Fallback to last column
        target_col = df.columns[-1]
        
    print(f"Using Target Column: '{target_col}'")
    print("Target Value Distribution:")
    print(df[target_col].value_counts(dropna=False))

    # Standardize target categories:
    # 0: "Home Care" (green)
    # 1: "Consult within 48 Hours" (orange)
    # 2: "Immediate Medical Attention" (red)
    
    target_mapping = {}
    unique_targets = df[target_col].dropna().unique()
    
    for val in unique_targets:
        s = str(val).lower()
        if any(w in s for w in ['immediate', 'emergency', 'urgent_critical', 'red', 'high', '1', 'level 1', 'level 2']):
            target_mapping[val] = 2
        elif any(w in s for w in ['48', 'consult', 'moderate', 'orange', 'yellow', '2', 'level 3']):
            target_mapping[val] = 1
        else:
            target_mapping[val] = 0

    print("\nTarget Class Mapping:", target_mapping)
    y_raw = df[target_col].map(target_mapping).fillna(0).astype(int)

    # Feature preparation
    feature_df = df.drop(columns=[target_col])
    
    # Drop identifier columns like id, patient_id, timestamp if present
    id_cols = [c for c in feature_df.columns if any(k in c.lower() for k in ['id', 'uuid', 'timestamp', 'date', 'name'])]
    print(f"Excluding identifier columns: {id_cols}")
    feature_df = feature_df.drop(columns=id_cols, errors='ignore')

    # One-hot encode categoricals & handle numerics
    categorical_cols = feature_df.select_dtypes(include=['object', 'category']).columns.tolist()
    numeric_cols = feature_df.select_dtypes(include=[np.number]).columns.tolist()

    print(f"Categorical features ({len(categorical_cols)}): {categorical_cols}")
    print(f"Numeric features ({len(numeric_cols)}): {numeric_cols}")

    imputations = {}
    for col in numeric_cols:
        med = float(feature_df[col].median() if not np.isnan(feature_df[col].median()) else 0.0)
        imputations[col] = med
        feature_df[col] = feature_df[col].fillna(med)

    for col in categorical_cols:
        mode = str(feature_df[col].mode()[0]) if len(feature_df[col].mode()) > 0 else 'unknown'
        imputations[col] = mode
        feature_df[col] = feature_df[col].fillna(mode).astype(str)

    # Perform One-Hot Encoding
    X_encoded = pd.get_dummies(feature_df, columns=categorical_cols, drop_first=False)
    feature_names = X_encoded.columns.tolist()
    print(f"\nTotal encoded features: {len(feature_names)}")

    X = X_encoded.astype(np.float32).values
    y = y_raw.values

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)

    print("\nTraining XGBoost Classifier...")
    model = xgb.XGBClassifier(
        n_estimators=100,
        max_depth=5,
        learning_rate=0.1,
        objective='multi:softprob',
        num_class=3,
        random_state=42,
        eval_metric='mlogloss'
    )
    model.fit(X_train, y_train)

    preds = model.predict(X_test)
    acc = accuracy_score(y_test, preds)
    print(f"\nModel Test Accuracy: {acc:.4f}")
    print("Classification Report:")
    print(classification_report(y_test, preds, target_names=['Home Care', 'Consult 48h', 'Immediate']))

    # Feature Importance
    importances = model.feature_importances_
    feat_imp = sorted(zip(feature_names, [float(x) for x in importances]), key=lambda x: x[1], reverse=True)
    print("\nTop 10 Influential Features:")
    for fn, score in feat_imp[:10]:
        print(f" - {fn}: {score:.4f}")

    # Export XGBoost trees & metadata
    os.makedirs("public/models", exist_ok=True)
    os.makedirs("src/data", exist_ok=True)

    # Save model as native JSON and dump format
    xgb_json_path = "public/models/xgboost_triage.json"
    model.save_model(xgb_json_path)
    print(f"\nSaved XGBoost native JSON model to {xgb_json_path}")

    # Save metadata
    metadata = {
        "model_type": "xgboost_multiclass",
        "num_classes": 3,
        "classes": ["Home Care", "Consult within 48 Hours", "Immediate Medical Attention"],
        "class_colors": ["green", "orange", "red"],
        "accuracy": float(acc),
        "feature_names": feature_names,
        "categorical_cols": categorical_cols,
        "numeric_cols": numeric_cols,
        "imputations": imputations,
        "top_features": feat_imp[:15]
    }

    with open("public/models/model_metadata.json", "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)
    with open("src/data/model_metadata.json", "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)

    print("Saved model_metadata.json successfully!")

if __name__ == "__main__":
    main()
