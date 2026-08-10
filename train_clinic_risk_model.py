import os
import json
import time
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix
import xgboost as xgb

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CSV_PATH = os.path.join(BASE_DIR, "final_vitals_symptoms_dataset (1).csv")
MODEL_OUTPUT_PATH = os.path.join(BASE_DIR, "clinic_risk_xgboost_model.json")
METADATA_OUTPUT_PATH = os.path.join(BASE_DIR, "src", "data", "clinic_model_metadata.json")

# Ensure output directory exists
os.makedirs(os.path.join("src", "data"), exist_ok=True)

print(f"Loading dataset from {CSV_PATH}...")
start_time = time.time()
df = pd.read_csv(CSV_PATH)
print(f"Loaded {len(df):,} rows and {len(df.columns)} columns in {time.time() - start_time:.2f}s")

# Define columns
vitals_numerical = [
    'Heart Rate',
    'Respiratory Rate',
    'Body Temperature',
    'Oxygen Saturation',
    'Systolic Blood Pressure',
    'Diastolic Blood Pressure',
    'Age',
    'Derived_BMI'
]

demographic_categorical = ['Gender']

target_col = 'Risk Category'

symptom_cols = [c for c in df.columns if c not in vitals_numerical and c not in demographic_categorical and c != target_col]

print(f"Numerical Vitals ({len(vitals_numerical)}): {vitals_numerical}")
print(f"Demographics ({len(demographic_categorical)}): {demographic_categorical}")
print(f"Symptoms ({len(symptom_cols)}): {symptom_cols}")

# Target Encoding
label_mapping = {'Low': 0, 'Medium': 1, 'High': 2}
inverse_label_mapping = {0: 'Low', 1: 'Medium', 2: 'High'}
y = df[target_col].map(label_mapping).values

# Feature Preprocessing
# Gender: Female -> 0, Male -> 1
gender_encoded = (df['Gender'].str.strip().str.lower() == 'male').astype(int).values

# Construct Feature Matrix
feature_names = vitals_numerical + ['Gender_Male'] + symptom_cols
X_vitals = df[vitals_numerical].values
X_gender = gender_encoded.reshape(-1, 1)
X_symptoms = df[symptom_cols].values

X = np.hstack([X_vitals, X_gender, X_symptoms])
print(f"Constructed Feature Matrix X with shape {X.shape}")

# Train-Test Split (80/20 Stratified)
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.20, random_state=42, stratify=y
)
print(f"Training set: {X_train.shape[0]:,} samples | Test set: {X_test.shape[0]:,} samples")

# Train XGBoost Classifier
print("Training XGBoost Classifier...")
model = xgb.XGBClassifier(
    n_estimators=180,
    max_depth=6,
    learning_rate=0.08,
    subsample=0.85,
    colsample_bytree=0.85,
    tree_method='hist',
    objective='multi:softprob',
    num_class=3,
    eval_metric=['mlogloss', 'merror'],
    random_state=42,
    n_jobs=-1
)

model.fit(
    X_train, y_train,
    eval_set=[(X_train, y_train), (X_test, y_test)],
    verbose=30
)

# Evaluation
y_pred = model.predict(X_test)
y_prob = model.predict_proba(X_test)

acc = accuracy_score(y_test, y_pred)
print(f"\n==========================================")
print(f"[RESULT] Test Set Accuracy: {acc * 100:.2f}%")
print(f"==========================================")
print("\nClassification Report:")
print(classification_report(y_test, y_pred, target_names=['Low', 'Medium', 'High']))

cm = confusion_matrix(y_test, y_pred)
print("Confusion Matrix:")
print(cm)

# Feature Importances
importances = model.feature_importances_
top_feature_indices = np.argsort(importances)[::-1]
print("\nTop 15 Most Important Features:")
for rank, idx in enumerate(top_feature_indices[:15], 1):
    print(f" {rank:2d}. {feature_names[idx]:<35}: {importances[idx]:.4f}")

# Save Native XGBoost Model
print(f"\nSaving model to {MODEL_OUTPUT_PATH}...")
model.save_model(MODEL_OUTPUT_PATH)

# Compute Symptom Co-occurrence Matrix & Conditional Probabilities
print("\nComputing statistical symptom co-occurrence matrix...")
symptom_df = df[symptom_cols]
co_occurrence_matrix = {}
symptom_freqs = {}

for s in symptom_cols:
    s_count = int((symptom_df[s] == 1).sum())
    symptom_freqs[s] = s_count
    
    # Conditional probability P(other | s == 1)
    subset = symptom_df[symptom_df[s] == 1]
    if len(subset) > 0:
        other_counts = subset.drop(columns=[s]).sum()
        co_occurrence_matrix[s] = {
            col: round(float(count / len(subset)), 4)
            for col, count in other_counts.sort_values(ascending=False).items()
        }
    else:
        co_occurrence_matrix[s] = {}

# Clinical Symptom Metadata (Multilingual labels & questions)
symptom_details = {
    "cc_chestpain": {
        "id": "cc_chestpain",
        "name": "Chest Pain",
        "category": "cardiopulmonary",
        "question": {
            "en": "Are you experiencing pain, tightness, or pressure in your chest?",
            "hi": "क्या आपको सीने में दर्द, जकड़न या भारीपन महसूस हो रहा है?",
            "gu": "શું તમને છાતીમાં દુખાવો, ભીંસ કે ભારેપણું લાગે છે?"
        },
        "is_red_flag": True
    },
    "cc_shortnessofbreath": {
        "id": "cc_shortnessofbreath",
        "name": "Shortness of Breath",
        "category": "cardiopulmonary",
        "question": {
            "en": "Are you feeling short of breath or breathless when talking or resting?",
            "hi": "क्या आपकी सांस फूल रही है या बात करते समय सांस लेने में तकलीफ हो रही है?",
            "gu": "શું તમને શ્વાસ ચઢે છે અથવા શ્વાસ લેવામાં મુશ્કેલી પડે છે?"
        },
        "is_red_flag": True
    },
    "cc_breathingdifficulty": {
        "id": "cc_breathingdifficulty",
        "name": "Breathing Difficulty",
        "category": "cardiopulmonary",
        "question": {
            "en": "Is it visibly difficult or painful for you to take a breath?",
            "hi": "क्या आपको सांस खींचने में अत्यधिक कठिनाई या तकलीफ हो रही है?",
            "gu": "શું તમને શ્વાસ ખેંચવામાં ભારે તકલીફ થઈ રહી છે?"
        },
        "is_red_flag": True
    },
    "cc_dyspnea": {
        "id": "cc_dyspnea",
        "name": "Dyspnea / Labored Breathing",
        "category": "cardiopulmonary",
        "question": {
            "en": "Are you experiencing labored or rapid struggling breathing?",
            "hi": "क्या आपकी सांस बहुत तेज और भारी चल रही है?",
            "gu": "શું તમારા શ્વાસોચ્છવાસ ખૂબ જ ઝડપી અને ભારે ચાલે છે?"
        },
        "is_red_flag": True
    },
    "cc_palpitations": {
        "id": "cc_palpitations",
        "name": "Palpitations / Fast Heartbeat",
        "category": "cardiopulmonary",
        "question": {
            "en": "Do you feel fluttering, racing, or pounding heartbeats?",
            "hi": "क्या आपके दिल की धड़कन असामान्य रूप से तेज या धड़कती हुई महसूस हो रही है?",
            "gu": "શું તમારા હૃદયના ધબકારા અસામાન્ય રીતે ઝડપી કે અનિયમિત લાગે છે?"
        },
        "is_red_flag": False
    },
    "cc_tachycardia": {
        "id": "cc_tachycardia",
        "name": "Tachycardia (Rapid Heart Rate)",
        "category": "cardiopulmonary",
        "question": {
            "en": "Has your pulse or heart rate been consistently racing high (>100 bpm)?",
            "hi": "क्या आपकी नाड़ी या पल्स की गति 100 से अधिक चल रही है?",
            "gu": "શું તમારી નાડીના ધબકારા ૧૦૦ થી વધુ ઝડપી રહે છે?"
        },
        "is_red_flag": True
    },
    "cc_alteredmentalstatus": {
        "id": "cc_alteredmentalstatus",
        "name": "Altered Mental Status",
        "category": "neurological",
        "question": {
            "en": "Is the patient drowsy, unresponsive, disoriented, or acting abnormally?",
            "hi": "क्या मरीज सुस्त, बेहोश जैसा, दिशाहीन या असामान्य व्यवहार कर रहा है?",
            "gu": "શું દર્દી સુસ્ત, અર્ધ-બેભાન કે અસંબદ્ધ વર્તન કરે છે?"
        },
        "is_red_flag": True
    },
    "cc_confusion": {
        "id": "cc_confusion",
        "name": "Confusion / Memory Lapse",
        "category": "neurological",
        "question": {
            "en": "Are you having sudden confusion, forgetfulness, or trouble understanding?",
            "hi": "क्या आपको अचानक भ्रम, समझने में कठिनाई या उलझन महसूस हो रही है?",
            "gu": "શું તમને અચાનક મૂંઝવણ કે સમજવામાં તકલીફ થાય છે?"
        },
        "is_red_flag": True
    },
    "cc_syncope": {
        "id": "cc_syncope",
        "name": "Syncope (Fainting / Blackouts)",
        "category": "neurological",
        "question": {
            "en": "Did you faint, lose consciousness, or have sudden blackouts?",
            "hi": "क्या आप बेहोश हुए या चक्कर खाकर गिर पड़े?",
            "gu": "શું તમે બેભાન થઈ ગયા કે ચક્કર આવીને પડી ગયા હતા?"
        },
        "is_red_flag": True
    },
    "cc_weakness": {
        "id": "cc_weakness",
        "name": "Generalized Weakness",
        "category": "neurological",
        "question": {
            "en": "Do you feel extreme body weakness or inability to stand up?",
            "hi": "क्या आपको अत्यधिक कमजोरी या खड़े होने में असमर्थता महसूस हो रही है?",
            "gu": "શું તમને શરીરમાં અત્યંત નબળાઈ કે ઊભા રહેવામાં તકલીફ થાય છે?"
        },
        "is_red_flag": False
    },
    "cc_hypotension": {
        "id": "cc_hypotension",
        "name": "Hypotension Symptoms (Low Blood Pressure)",
        "category": "cardiopulmonary",
        "question": {
            "en": "Are you feeling lightheaded, cold and clammy, or known to have low BP?",
            "hi": "क्या आपका ब्लड प्रेशर कम लग रहा है या हाथ-पैर ठंडे पड़ रहे हैं?",
            "gu": "શું તમારું બ્લડ પ્રેશર ઓછું લાગે છે અથવા હાથ-પગ ઠંડા પડી રહ્યા છે?"
        },
        "is_red_flag": True
    },
    "cc_hypertension": {
        "id": "cc_hypertension",
        "name": "Hypertension Symptoms (High Blood Pressure)",
        "category": "cardiopulmonary",
        "question": {
            "en": "Are you experiencing severe head throbbing or known very high BP?",
            "hi": "क्या आपका ब्लड प्रेशर बहुत अधिक बढ़ा हुआ है या सिर में तेज धड़कन है?",
            "gu": "શું તમારું બ્લડ પ્રેશર ખૂબ વધારે રહે છે કે માથામાં ભારે દબાણ છે?"
        },
        "is_red_flag": False
    },
    "cc_gibleeding": {
        "id": "cc_gibleeding",
        "name": "Gastrointestinal Bleeding",
        "category": "gastrointestinal",
        "question": {
            "en": "Have you noticed blood in vomit, black tarry stool, or rectal bleeding?",
            "hi": "क्या उल्टी में खून, काला मल या शौच में खून आ रहा है?",
            "gu": "શું ઉલ્ટીમાં લોહી, કાળો મળ કે ઝાડામાં લોહી જોવા મળ્યું છે?"
        },
        "is_red_flag": True
    },
    "cc_abdominalpain": {
        "id": "cc_abdominalpain",
        "name": "Abdominal Pain",
        "category": "gastrointestinal",
        "question": {
            "en": "Are you experiencing pain, cramps, or tenderness in your stomach or abdomen?",
            "hi": "क्या आपके पेट में दर्द, मरोड़ या भारीपन हो रहा है?",
            "gu": "શું તમારા પેટમાં દુખાવો, ચૂક કે સોજો છે?"
        },
        "is_red_flag": False
    },
    "cc_nausea": {
        "id": "cc_nausea",
        "name": "Nausea",
        "category": "gastrointestinal",
        "question": {
            "en": "Are you feeling nauseous or having the urge to vomit?",
            "hi": "क्या आपको मतली या उल्टी जैसा महसूस हो रहा है?",
            "gu": "શું તમને ઉબકા કે ઉલ્ટી જેવું લાગે છે?"
        },
        "is_red_flag": False
    },
    "cc_emesis": {
        "id": "cc_emesis",
        "name": "Emesis (Vomiting Episodes)",
        "category": "gastrointestinal",
        "question": {
            "en": "Have you had repeated vomiting episodes in the last 24 hours?",
            "hi": "क्या आपको पिछले 24 घंटों में बार-बार उल्टियां हुई हैं?",
            "gu": "શું તમને છેલ્લા ૨૪ કલાકમાં વારંવાર ઉલ્ટીઓ થઈ છે?"
        },
        "is_red_flag": False
    },
    "cc_fever": {
        "id": "cc_fever",
        "name": "Fever",
        "category": "infectious",
        "question": {
            "en": "Do you have an elevated body temperature or feel hot to touch?",
            "hi": "क्या आपको बुखार या शरीर में तेज गर्मी महसूस हो रही है?",
            "gu": "શું તમને તાવ કે શરીરમાં ગરમીનો અનુભવ થાય છે?"
        },
        "is_red_flag": False
    },
    "cc_chills": {
        "id": "cc_chills",
        "name": "Chills & Shivering",
        "category": "infectious",
        "question": {
            "en": "Are you experiencing cold shivering or shaking chills?",
            "hi": "क्या आपको ठंड लगकर कंपकंपी हो रही है?",
            "gu": "શું તમને ઠંડી લાગીને ધ્રુજારી આવે છે?"
        },
        "is_red_flag": False
    },
    "cc_dehydration": {
        "id": "cc_dehydration",
        "name": "Dehydration",
        "category": "gastrointestinal",
        "question": {
            "en": "Do you have extreme thirst, dry mouth, sunken eyes, or very low urine output?",
            "hi": "क्या अत्यधिक प्यास, सूखा मुंह, या पेशाब बहुत कम आ रहा है?",
            "gu": "શું ખૂબ જ તરસ, સૂકું મોં કે પેશાબ ખૂબ ઓછો આવે છે?"
        },
        "is_red_flag": True
    },
    "cc_dizziness": {
        "id": "cc_dizziness",
        "name": "Dizziness / Lightheadedness",
        "category": "neurological",
        "question": {
            "en": "Are you feeling dizzy, unsteady, or that the room is spinning?",
            "hi": "क्या आपको चक्कर या सिर घूमने जैसा महसूस हो रहा है?",
            "gu": "શું તમને ચક્કર આવે છે કે માથું ઘૂમતું લાગે છે?"
        },
        "is_red_flag": False
    },
    "cc_headache": {
        "id": "cc_headache",
        "name": "Headache",
        "category": "neurological",
        "question": {
            "en": "Do you have a throbbing, aching, or severe headache?",
            "hi": "क्या आपके सिर में तेज या लगातार दर्द हो रहा है?",
            "gu": "શું તમારા માથામાં તીવ્ર કે સતત દુખાવો થાય છે?"
        },
        "is_red_flag": False
    },
    "cc_backpain": {
        "id": "cc_backpain",
        "name": "Back Pain",
        "category": "musculoskeletal",
        "question": {
            "en": "Do you have pain or stiffness in your upper or lower back?",
            "hi": "क्या आपकी पीठ या कमर में दर्द है?",
            "gu": "શું તમારી પીઠ કે કમરમાં દુખાવો છે?"
        },
        "is_red_flag": False
    },
    "cc_chesttightness": {
        "id": "cc_chesttightness",
        "name": "Chest Tightness",
        "category": "cardiopulmonary",
        "question": {
            "en": "Do you feel a squeezing, band-like tightness around your chest?",
            "hi": "क्या छाती पर भारी दबाव या कसाव महसूस हो रहा है?",
            "gu": "શું છાતી પર ભારે દબાણ કે કસાવ અનુભવાય છે?"
        },
        "is_red_flag": True
    },
    "cc_cough": {
        "id": "cc_cough",
        "name": "Cough",
        "category": "infectious",
        "question": {
            "en": "Do you have a persistent dry or phlegm-producing cough?",
            "hi": "क्या आपको लगातार सूखी या बलगम वाली खांसी आ रही है?",
            "gu": "શું તમને સતત સૂકી કે કફવાળી ખાંસી આવે છે?"
        },
        "is_red_flag": False
    },
    "cc_coldlikesymptoms": {
        "id": "cc_coldlikesymptoms",
        "name": "Cold-like Symptoms (Runny Nose / Sneezing)",
        "category": "infectious",
        "question": {
            "en": "Do you have a runny or blocked nose, sneezing, or mild cold?",
            "hi": "क्या नाक बहना, छींक आना या जुकाम के लक्षण हैं?",
            "gu": "શું નાક વહેવું, છીંક આવવી કે શરદીના લક્ષણો છે?"
        },
        "is_red_flag": False
    },
    "cc_sorethroat": {
        "id": "cc_sorethroat",
        "name": "Sore Throat",
        "category": "infectious",
        "question": {
            "en": "Is your throat painful, scratchy, or hurting when swallowing?",
            "hi": "क्या गले में खराश, दर्द या निगलने में तकलीफ है?",
            "gu": "શું ગળામાં ખરાશ, દુખાવો કે ગળવામાં તકલીફ થાય છે?"
        },
        "is_red_flag": False
    },
    "cc_dysuria": {
        "id": "cc_dysuria",
        "name": "Dysuria (Painful Urination)",
        "category": "genitourinary",
        "question": {
            "en": "Do you experience burning, stinging, or pain while urinating?",
            "hi": "क्या पेशाब करते समय जलन, चुभन या दर्द होता है?",
            "gu": "શું પેશાબ કરતી વખતે બળતરા કે દુખાવો થાય છે?"
        },
        "is_red_flag": False
    },
    "cc_edema": {
        "id": "cc_edema",
        "name": "Edema (Swelling in Legs/Feet)",
        "category": "cardiopulmonary",
        "question": {
            "en": "Do you have noticeable swelling or fluid buildup in your feet, ankles, or legs?",
            "hi": "क्या आपके पैरों, टखनों या चेहरे पर सूजन है?",
            "gu": "શું તમારા પગ, ઘૂંટી કે ચહેરા પર સોજો આવેલો છે?"
        },
        "is_red_flag": False
    },
    "cc_numbness": {
        "id": "cc_numbness",
        "name": "Numbness / Tingling",
        "category": "neurological",
        "question": {
            "en": "Do you feel numbness, pins-and-needles, or loss of sensation in limbs?",
            "hi": "क्या हाथ-पैरों में सुन्नपन या झुनझुनी महसूस हो रही है?",
            "gu": "શું હાથ-પગમાં ખાલી ચડવી કે સુન્નપણું લાગે છે?"
        },
        "is_red_flag": False
    },
    "cc_fatigue": {
        "id": "cc_fatigue",
        "name": "Severe Fatigue",
        "category": "systemic",
        "question": {
            "en": "Are you feeling completely drained, exhausted, or lack energy for simple tasks?",
            "hi": "क्या आपको अत्यधिक थकान और ऊर्जा की कमी महसूस हो रही है?",
            "gu": "શું તમને ભારે થાક કે અશક્તિ લાગે છે?"
        },
        "is_red_flag": False
    },
    "cc_diarrhea": {
        "id": "cc_diarrhea",
        "name": "Diarrhea (Loose Stools)",
        "category": "gastrointestinal",
        "question": {
            "en": "Have you had 3 or more loose or watery stools today?",
            "hi": "क्या आपको बार-बार पतले दस्त या लूज मोशन हो रहे हैं?",
            "gu": "શું તમને વારંવાર પાતળા ઝાડા કે લૂઝ મોશન થાય છે?"
        },
        "is_red_flag": False
    },
    "cc_earpain": {
        "id": "cc_earpain",
        "name": "Ear Pain / Discharge",
        "category": "infectious",
        "question": {
            "en": "Do you have pain, fullness, or fluid discharge from your ear?",
            "hi": "क्या कान में दर्द या मवाद/पानी जैसा स्राव हो रहा है?",
            "gu": "શું કાનમાં દુખાવો કે પરુ/પાણી નીકળે છે?"
        },
        "is_red_flag": False
    },
    "cc_flankpain": {
        "id": "cc_flankpain",
        "name": "Flank Pain (Kidney / Side Pain)",
        "category": "genitourinary",
        "question": {
            "en": "Do you have sharp pain in your side or back near your ribs?",
            "hi": "क्या पसलियों के नीचे कमर या बाजू में तेज दर्द हो रहा है?",
            "gu": "શું પાંસળીઓની નીચે પડખામાં કે કમરમાં તીવ્ર દુખાવો થાય છે?"
        },
        "is_red_flag": False
    },
    "cc_laceration": {
        "id": "cc_laceration",
        "name": "Laceration / Deep Cut",
        "category": "trauma",
        "question": {
            "en": "Do you have an open wound, deep cut, or laceration requiring dressing?",
            "hi": "क्या कोई खुला घाव या गहरा कट लगा है?",
            "gu": "શું કોઈ ખુલ્લો ઘા કે ઊંડો ઘસરકો પડેલો છે?"
        },
        "is_red_flag": False
    },
    "cc_skinproblem": {
        "id": "cc_skinproblem",
        "name": "Skin Rash / Problem",
        "category": "dermatological",
        "question": {
            "en": "Do you have a skin rash, redness, itching, or skin lesion?",
            "hi": "क्या त्वचा पर दाने, खुजली, लालिमा या छाले हैं?",
            "gu": "શું ચામડી પર ફોલ્લીઓ, ખંજવાળ કે લાલાશ છે?"
        },
        "is_red_flag": False
    },
    "cc_bleeding/bruising": {
        "id": "cc_bleeding/bruising",
        "name": "Abnormal Bleeding / Bruising",
        "category": "hematological",
        "question": {
            "en": "Have you noticed unexplained bruises, bleeding gums, or prolonged bleeding?",
            "hi": "क्या बिना चोट के नीले निशान, मसूड़ों से खून या रक्तस्राव हो रहा है?",
            "gu": "શું અસામાન્ય વાદળી ડાઘા કે પેઢામાંથી લોહી નીકળે છે?"
        },
        "is_red_flag": True
    },
    "cc_decreasedbloodsugar-symptomatic": {
        "id": "cc_decreasedbloodsugar-symptomatic",
        "name": "Hypoglycemia (Low Blood Sugar Symptoms)",
        "category": "metabolic",
        "question": {
            "en": "Are you experiencing sudden sweating, tremors, intense hunger, or shaking?",
            "hi": "क्या अचानक पसीना, हाथ कांपना, घबराहट या शुगर कम होने के लक्षण हैं?",
            "gu": "શું અચાનક પરસેવો, હાથ ધ્રૂજવા કે ખાંડ ઘટી જવાના લક્ષણો છે?"
        },
        "is_red_flag": True
    },
    "cc_elevatedbloodsugar-symptomatic": {
        "id": "cc_elevatedbloodsugar-symptomatic",
        "name": "Hyperglycemia (High Blood Sugar Symptoms)",
        "category": "metabolic",
        "question": {
            "en": "Do you have excessive thirst, frequent urination, and sweet/fruity breath?",
            "hi": "क्या अत्यधिक प्यास, बार-बार पेशाब आना और शुगर बढ़ने के लक्षण हैं?",
            "gu": "શું અતિશય તરસ, વારંવાર પેશાબ અને સુગર વધવાના લક્ષણો છે?"
        },
        "is_red_flag": False
    },
    "cc_vomiting": {
        "id": "cc_vomiting",
        "name": "Vomiting",
        "category": "gastrointestinal",
        "question": {
            "en": "Are you actively throwing up or unable to keep liquids down?",
            "hi": "क्या आपको उल्टी हो रही है या पानी भी पेट में नहीं रुक रहा?",
            "gu": "શું તમને ઉલ્ટી થઈ રહી છે કે પ્રવાહી પણ ટકી નથી શકતું?"
        },
        "is_red_flag": False
    }
}

# Clinical Clusters definition for grouping
clinical_clusters = {
    "infectious_respiratory": [
        "cc_fever", "cc_chills", "cc_cough", "cc_coldlikesymptoms", 
        "cc_sorethroat", "cc_earpain", "cc_shortnessofbreath", "cc_dyspnea"
    ],
    "cardiopulmonary": [
        "cc_chestpain", "cc_chesttightness", "cc_palpitations", "cc_tachycardia",
        "cc_shortnessofbreath", "cc_dyspnea", "cc_breathingdifficulty", 
        "cc_syncope", "cc_hypotension", "cc_hypertension", "cc_edema"
    ],
    "gastrointestinal": [
        "cc_abdominalpain", "cc_nausea", "cc_vomiting", "cc_emesis", 
        "cc_diarrhea", "cc_gibleeding", "cc_dehydration"
    ],
    "neurological": [
        "cc_headache", "cc_dizziness", "cc_confusion", "cc_alteredmentalstatus",
        "cc_syncope", "cc_weakness", "cc_numbness", "cc_fatigue"
    ],
    "metabolic": [
        "cc_decreasedbloodsugar-symptomatic", "cc_elevatedbloodsugar-symptomatic",
        "cc_weakness", "cc_dizziness", "cc_confusion", "cc_dehydration"
    ],
    "genitourinary": [
        "cc_dysuria", "cc_flankpain", "cc_backpain", "cc_fever"
    ],
    "trauma_dermatology": [
        "cc_laceration", "cc_skinproblem", "cc_bleeding/bruising", "cc_edema"
    ]
}

# Assemble Metadata JSON
metadata = {
    "modelVersion": "1.0.0-clinic-xgboost",
    "dataset": "final_vitals_symptoms_dataset (1).csv",
    "totalSamples": len(df),
    "accuracy": round(float(acc), 4),
    "classes": ["Low", "Medium", "High"],
    "classMapping": label_mapping,
    "vitalsNumerical": vitals_numerical,
    "demographicCategorical": demographic_categorical,
    "featureNames": feature_names,
    "symptomColumns": symptom_cols,
    "symptomDetails": symptom_details,
    "clinicalClusters": clinical_clusters,
    "symptomFrequencies": symptom_freqs,
    "symptomCoOccurrence": co_occurrence_matrix,
    "featureImportances": {
        feature_names[i]: round(float(importances[i]), 5) for i in top_feature_indices
    },
    "vitalsNormalRanges": {
        "Heart Rate": {"min": 60, "max": 100, "unit": "bpm"},
        "Respiratory Rate": {"min": 12, "max": 20, "unit": "/min"},
        "Body Temperature": {"min": 36.5, "max": 37.5, "unit": "°C"},
        "Oxygen Saturation": {"min": 95, "max": 100, "unit": "%"},
        "Systolic Blood Pressure": {"min": 90, "max": 120, "unit": "mmHg"},
        "Diastolic Blood Pressure": {"min": 60, "max": 80, "unit": "mmHg"},
        "Age": {"min": 18, "max": 89, "unit": "years"},
        "Derived_BMI": {"min": 18.5, "max": 24.9, "unit": "kg/m²"}
    }
}

print(f"\nWriting model metadata to {METADATA_OUTPUT_PATH}...")
with open(METADATA_OUTPUT_PATH, "w", encoding="utf-8") as f:
    json.dump(metadata, f, indent=2, ensure_ascii=False)

print("\n Training & Metadata generation completed successfully!")
