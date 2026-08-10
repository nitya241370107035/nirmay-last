import os
import json
import time
import pandas as pd
import numpy as np
import xgboost as xgb
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score

PROCESSED_CSV = "processed_clinical_dataset.csv"
MODEL_JSON = "xgboost_disease_model.json"
META_OUT = os.path.join("src", "data", "disease_model_data.json")

# Comprehensive Symptom multilingual translations for UI display across all 144 clinical features
SYMPTOM_TRANSLATIONS = {
    # Cardiovascular & Pulmonology
    "sharp chest pain": {"en": "Sharp chest pain", "hi": "सीने में तेज दर्द / चुभन", "gu": "છાતીમાં તીક્ષ્ણ દુખાવો"},
    "chest tightness": {"en": "Chest tightness", "hi": "छाती में भारीपन / जकड़न", "gu": "છાતીમાં દબાણ અથવા જકડાઈ જવું"},
    "burning chest pain": {"en": "Burning chest pain", "hi": "सीने में जलन / एसिडिटी दर्द", "gu": "છાતીમાં બળતરા"},
    "shortness of breath": {"en": "Shortness of breath", "hi": "सांस फूलना / सांस लेने में तकलीफ", "gu": "શ્વાસ ચઢવો / શ્વાસ લેવામાં તકલીફ"},
    "difficulty breathing": {"en": "Difficulty breathing", "hi": "सांस लेने में भारी कठिनाई", "gu": "શ્વાસ લેવામાં ભારે મુશ્કેલી"},
    "hurts to breath": {"en": "Pain when breathing deeply", "hi": "गहरी सांस लेने पर सीने में दर्द", "gu": "ઊંડો શ્વાસ લેતી વખતે છાતીમાં દુખાવો"},
    "breathing fast": {"en": "Rapid breathing", "hi": "तेज-तेज सांस चलना", "gu": "ઝડપી શ્વાસોચ્છવાસ"},
    "wheezing": {"en": "Wheezing sound in chest", "hi": "सांस में सीटी जैसी आवाज", "gu": "શ્વાસમાં સીટી જેવો અવાજ"},
    "abnormal breathing sounds": {"en": "Abnormal chest breathing sounds", "hi": "सांस लेते समय घरघराहट", "gu": "શ્વાસ લેતી વખતે ઘરઘરાટી"},
    "congestion in chest": {"en": "Chest congestion / Phlegm blockage", "hi": "सीने में भारी बलगम जमा होना", "gu": "છાતીમાં કફ ભરાઈ જવો"},
    "palpitations": {"en": "Heart palpitations", "hi": "दिल की धड़कन तेज होना", "gu": "હૃદયના ધબકારા વધવા"},
    "irregular heartbeat": {"en": "Irregular heartbeat", "hi": "अनियमित धड़कन", "gu": "અનિયમિત ધબકારા"},
    "increased heart rate": {"en": "Fast pulse / Tachycardia", "hi": "नाड़ी की गति तेज होना", "gu": "નાડીના ધબકારા ઝડપી થવા"},
    "sweating": {"en": "Profuse cold sweating", "hi": "अत्यधिक पसीना आना", "gu": "પુષ્કળ પરસેવો વળવો"},
    "dizziness": {"en": "Dizziness / Lightheadedness", "hi": "चक्कर आना", "gu": "ચક્કર આવવા"},
    "fainting": {"en": "Fainting / Loss of consciousness", "hi": "बेहोशी या चक्कर खाकर गिरना", "gu": "બેભાન થવું / ચક્કર આવવા"},

    # Upper Respiratory, ENT & Eyes
    "cough": {"en": "Cough", "hi": "खांसी", "gu": "ઉધરસ"},
    "coughing up sputum": {"en": "Cough with sputum / phlegm", "hi": "बलगम वाली खांसी", "gu": "કફવાળી ઉધરસ"},
    "sore throat": {"en": "Sore throat / Painful throat", "hi": "गले में दर्द या खराश", "gu": "ગળામાં દુખાવો / ખારાશ"},
    "swollen or red tonsils": {"en": "Swollen or red tonsils", "hi": "टॉन्सिल में सूजन व लाली", "gu": "કાકડામાં સોજો અને લાલાશ"},
    "throat redness": {"en": "Redness inside throat", "hi": "गले के अंदर लालिमा", "gu": "ગળામાં લાલાશ"},
    "throat feels tight": {"en": "Throat feels tight / Constricted", "hi": "गला घुटने जैसा महसूस होना", "gu": "ગળું દબાઈ જવું"},
    "lump in throat": {"en": "Sensation of lump in throat", "hi": "गले में कुछ अटका हुआ लगना", "gu": "ગળામાં કંઈક ફસાયેલું લાગવું"},
    "difficulty in swallowing": {"en": "Difficulty or pain swallowing", "hi": "खाना निगलने में दर्द या रुकावट", "gu": "ખોરાક ગળવામાં તકલીફ કે દુખાવો"},
    "hoarse voice": {"en": "Hoarse / Raspy voice", "hi": "आवाज बैठना या भारी होना", "gu": "અવાજ બેસી જવો"},
    "nasal congestion": {"en": "Nasal congestion / Blocked nose", "hi": "नाक बंद होना / जुकाम", "gu": "નાક બંધ થવું / શરદી"},
    "coryza": {"en": "Runny nose / Clear nasal drip", "hi": "नाक से पानी बहना", "gu": "નાકમાંથી પાણી વહેવું"},
    "sneezing": {"en": "Frequent sneezing fits", "hi": "बार-बार छींक आना", "gu": "વારંવાર છીંકો આવવી"},
    "sinus congestion": {"en": "Sinus congestion / Heavy head", "hi": "साइनस में भारीपन", "gu": "સાઇનસમાં ભરાવો"},
    "painful sinuses": {"en": "Pain over cheekbones & forehead", "hi": "गाल व माथे के साइनस में दर्द", "gu": "ગાલ અને કપાળમાં સાઇનસનો દુખાવો"},
    "ear pain": {"en": "Earache / Pain inside ear", "hi": "कान में तेज दर्द", "gu": "કાનમાં દુખાવો"},
    "fluid in ear": {"en": "Fluid or pus discharge from ear", "hi": "कान से पानी या मवाद आना", "gu": "કાનમાંથી પરુ કે પાણી નીકળવું"},
    "plugged feeling in ear": {"en": "Blocked or clogged ear sensation", "hi": "कान बंद या भारी लगना", "gu": "કાન બંધ થઈ ગયો હોય તેવો અહેસાસ"},
    "diminished hearing": {"en": "Reduced hearing acuity", "hi": "कम सुनाई देना", "gu": "ઓછું સંભળાવું"},
    "pulling at ears": {"en": "Ear pulling or tugging sensation", "hi": "कान खींचने का अहसास", "gu": "કાન ખેંચાવાની તકલીફ"},
    "redness in ear": {"en": "Redness around ear canal", "hi": "कान में लाली", "gu": "કાનમાં લાલાશ"},
    "eye redness": {"en": "Redness in eyes (Pink eye)", "hi": "आंखें लाल होना", "gu": "આંખો લાલ થવી"},
    "itchiness of eye": {"en": "Eye itching", "hi": "आंखों में खुजली", "gu": "આંખોમાં ખંજવાળ"},
    "lacrimation": {"en": "Excessive eye tearing", "hi": "आंखों से अत्यधिक पानी आना", "gu": "આંખોમાંથી પાણી વહેવું"},
    "eye burns or stings": {"en": "Burning or stinging sensation in eyes", "hi": "आंखों में जलन व चुभन", "gu": "આંખોમાં બળતરા"},
    "pain in eye": {"en": "Eye pain / Retro-orbital pain", "hi": "आंख में या आंख के पीछे दर्द", "gu": "આંખમાં દુખાવો"},
    "swollen eye": {"en": "Swelling around eyelids", "hi": "पलकों व आंख में सूजन", "gu": "આંખની પાંપણો પર સોજો"},
    "diminished vision": {"en": "Blurred or reduced vision", "hi": "धुंधला दिखाई देना", "gu": "ઝાંખું દેખાવું"},
    "spots or clouds in vision": {"en": "Floaters or clouds in vision", "hi": "आंखों के आगे जाले या धब्बे", "gu": "આંખો સામે કાળા ધાબા દેખાવા"},

    # Gastrointestinal & Abdominal
    "sharp abdominal pain": {"en": "Sharp abdominal pain", "hi": "पेट में तेज दर्द", "gu": "પેટમાં તીવ્ર દુખાવો"},
    "burning abdominal pain": {"en": "Burning stomach pain / Heartburn", "hi": "पेट में जलन या एसिडिटी", "gu": "પેટમાં બળતરા / એસિડિટી"},
    "heartburn": {"en": "Acid reflux / Heartburn", "hi": "सीने में जलन व खट्टी डकार", "gu": "છાતીમાં બળતરા / ખાટા ઓડકાર"},
    "regurgitation": {"en": "Food regurgitation / Acid backflow", "hi": "भोजन का मुंह में वापस आना", "gu": "ખોરાક મોંમાં પાછો આવવો"},
    "lower abdominal pain": {"en": "Lower abdominal / Pelvic pain", "hi": "पेट के निचले हिस्से में दर्द", "gu": "પેડુમાં દુખાવો"},
    "upper abdominal pain": {"en": "Upper abdominal pain", "hi": "पेट के ऊपरी हिस्से में दर्द", "gu": "પેટના ઉપરના ભાગમાં દુખાવો"},
    "stomach bloating": {"en": "Abdominal bloating / Gas fullness", "hi": "पेट में गैस व भारीपन", "gu": "પેટમાં ગેસ અને અફારો"},
    "nausea": {"en": "Nausea / Queasiness", "hi": "जी मिचलाना", "gu": "ઉબકા આવવા"},
    "vomiting": {"en": "Vomiting", "hi": "उल्टी आना", "gu": "ઊલટી થવી"},
    "vomiting blood": {"en": "Vomiting blood (Hematemesis)", "hi": "उल्टी में खून आना", "gu": "ઊલટીમાં લોહી આવવું"},
    "diarrhea": {"en": "Diarrhea / Watery loose motions", "hi": "दस्त / पतले दस्त", "gu": "ઝાડા / પાતળા ઝાડા"},
    "blood in stool": {"en": "Blood in stool", "hi": "शौच में खून आना", "gu": "ઝાડામાં લોહી આવવું"},
    "changes in stool appearance": {"en": "Dark or abnormal stool appearance", "hi": "मल के रंग में असामान्य बदलाव", "gu": "ઝાડાના રંગમાં અસામાન્ય ફેરફાર"},

    # Renal & Urinary
    "painful urination": {"en": "Burning or painful urination (Dysuria)", "hi": "पेशाब में जलन या दर्द", "gu": "પેશાબમાં બળતરા કે દુખાવો"},
    "frequent urination": {"en": "Frequent urination", "hi": "बार-बार पेशाब आना", "gu": "વારંવાર પેશાબ થવો"},
    "blood in urine": {"en": "Blood in urine (Hematuria)", "hi": "पेशाब में खून आना", "gu": "પેશાબમાં લોહી આવવું"},
    "unusual color or odor to urine": {"en": "Cloudy or foul-smelling urine", "hi": "पेशाब का रंग मटमैला या दुर्गंधयुक्त होना", "gu": "પેશાબમાં વાસ અથવા ડહોળો પેશાબ"},
    "retention of urine": {"en": "Inability to pass urine / Retention", "hi": "पेशाब रुक जाना / रुकावट", "gu": "પેશાબ અટકી જવો"},
    "involuntary urination": {"en": "Urinary incontinence / Leakage", "hi": "पेशाब पर नियंत्रण न रहना", "gu": "પેશાબ પર કાબૂ ન રહેવો"},
    "suprapubic pain": {"en": "Bladder / Suprapubic pain", "hi": "मूत्राशय के ऊपर दर्द", "gu": "પેડુના ભાગમાં પેશાબની કોથળીનો દુખાવો"},
    "symptoms of bladder": {"en": "Bladder pressure / Urgency", "hi": "पेशाब की थैली में भारीपन", "gu": "પેશાબની કોથળીમાં દબાણ"},
    "side pain": {"en": "Flank pain radiating from back", "hi": "कमर के बाजू (पसलियों के नीचे) तेज दर्द", "gu": "કમરની એક બાજુએ તીવ્ર દુખાવો (પથરી)"},

    # Systemic, Infectious & Fevers
    "fever": {"en": "Fever / Elevated body temperature", "hi": "बुखार", "gu": "તાવ"},
    "chills": {"en": "Chills & Shivering (Rigors)", "hi": "ठंड लगकर कंपकंपी छूटना", "gu": "ધ્રુજારી સાથે ઠંડી લાગવી"},
    "flu-like syndrome": {"en": "Flu-like body aches & malaise", "hi": "फ्लू जैसे पूरे शरीर में दर्द", "gu": "ફ્લૂ જેવા આખા શરીરમાં કળતર"},
    "feeling ill": {"en": "General malaise / Sickness feeling", "hi": "तबीयत खराब लगना व कमजोरी", "gu": "અસ્વસ્થતા અને અશક્તિ"},
    "ache all over": {"en": "Generalized body aches (Myalgia)", "hi": "सारे बदन में तेज दर्द", "gu": "આખા શરીરમાં કળતર"},
    "fatigue": {"en": "Severe exhaustion & fatigue", "hi": "अत्यधिक थकान व कमजोरी", "gu": "અતિશય થાક"},
    "weakness": {"en": "Physical weakness / Loss of stamina", "hi": "शरीर में भारी कमजोरी", "gu": "શારીરિક નબળાઈ"},
    "decreased appetite": {"en": "Loss of appetite (Anorexia)", "hi": "भूख न लगना", "gu": "ભૂખ ન લાગવી"},
    "hot flashes": {"en": "Sudden hot flashes / Warm sensation", "hi": "अचानक गर्मी या पसीना छूटना", "gu": "અચાનક ગરમી લાગવી"},

    # Neurological, Head & Spine
    "headache": {"en": "Headache", "hi": "सिरदर्द", "gu": "માથાનો દુખાવો"},
    "frontal headache": {"en": "Frontal forehead headache", "hi": "माथे में तेज दर्द", "gu": "કપાળમાં તીવ્ર દુખાવો"},
    "neck stiffness or tightness": {"en": "Stiff neck / Limited neck motion", "hi": "गर्दन में अकड़न", "gu": "ગરદન અકડાઈ જવી"},
    "neck pain": {"en": "Neck pain", "hi": "गर्दन में दर्द", "gu": "ગરદનનો દુખાવો"},
    "back pain": {"en": "Back pain", "hi": "पीठ या कमर में दर्द", "gu": "કમર / પીઠનો દુખાવો"},
    "low back pain": {"en": "Lower back pain", "hi": "कमर के निचले हिस्से में दर्द", "gu": "કમરના નીચેના ભાગમાં દુખાવો"},
    "back stiffness or tightness": {"en": "Morning back stiffness / Spasm", "hi": "कमर में जकड़न", "gu": "કમરમાં જકડાઈ જવું"},
    "back cramps or spasms": {"en": "Back muscle cramps & spasms", "hi": "कमर की मांसपेशियों में खिंचाव", "gu": "કમરના સ્નાયુઓમાં ખેંચાણ"},
    "sciatica": {"en": "Shooting leg pain from back (Sciatica)", "hi": "कमर से पैर में उतरने वाला दर्द", "gu": "કમરથી પગ સુધી ઉતરતો દુખાવો (રાંઝણ)"},
    "loss of sensation": {"en": "Loss of sensation / Numbness", "hi": "अंग सुन्न होना", "gu": "અંગ સુન્ન થઈ જવું"},
    "paresthesia": {"en": "Tingling / Pins & needles sensation", "hi": "हाथ-पैरों में झनझनाहट", "gu": "હાથ-પગમાં ખાલી ચઢવી"},
    "leg pain": {"en": "Leg pain", "hi": "पैरों में दर्द", "gu": "પગમાં દુખાવો"},
    "leg weakness": {"en": "Weakness in legs", "hi": "पैरों में कमजोरी", "gu": "પગમાં નબળાઈ"},
    "leg cramps or spasms": {"en": "Leg muscle cramps (Calf cramps)", "hi": "पिंडलियों में ऐंठन व मरोड़", "gu": "પગની પિંડીઓમાં ગોટલા ચઢવા"},
    "arm pain": {"en": "Arm or shoulder pain", "hi": "हाथ या कंधे में दर्द", "gu": "હાથ કે ખભામાં દુખાવો"},
    "shoulder pain": {"en": "Shoulder pain / Limited motion", "hi": "कंधे में दर्द व अकड़न", "gu": "ખભાનો દુખાવો"},
    "insomnia": {"en": "Difficulty sleeping / Insomnia", "hi": "नींद न आना", "gu": "ઊંઘ ન આવવી"},
    "anxiety and nervousness": {"en": "Anxiety, restlessness & nervousness", "hi": "घबराहट व बेचैनी", "gu": "ગભરામણ અને બેચેની"},

    # Musculoskeletal & Joints
    "joint pain": {"en": "Joint pain (Arthralgia)", "hi": "जोड़ों में दर्द", "gu": "સાંધાનો દુખાવો"},
    "joint swelling": {"en": "Joint swelling & warmth", "hi": "जोड़ों में सूजन व लाली", "gu": "સાંધામાં સોજો"},
    "knee pain": {"en": "Knee pain", "hi": "घुटने में दर्द", "gu": "ઘૂંટણનો દુખાવો"},
    "knee swelling": {"en": "Knee swelling / Fluid buildup", "hi": "घुटने में सूजन", "gu": "ઘૂંટણમાં સોજો"},
    "knee weakness": {"en": "Knee instability / Weakness", "hi": "घुटने कमजोर पड़ना", "gu": "ઘૂંટણ નબળા પડવા"},
    "foot or toe pain": {"en": "Pain in foot or big toe (Gout)", "hi": "पैर या अंगूठे में तेज दर्द", "gu": "પગ અથવા અંગૂઠામાં દુખાવો"},
    "foot or toe swelling": {"en": "Swelling in foot or toe", "hi": "पैर या अंगूठे में सूजन", "gu": "પગ અથવા અંગૂઠામાં સોજો"},
    "foot or toe stiffness or tightness": {"en": "Foot or toe joint stiffness", "hi": "पैर के जोड़ों में अकड़न", "gu": "પગના સાંધા અકડાઈ જવા"},
    "ankle pain": {"en": "Ankle pain", "hi": "टखने में दर्द", "gu": "ઘૂંટીમાં દુખાવો"},
    "ankle swelling": {"en": "Ankle swelling", "hi": "टखने में सूजन", "gu": "ઘૂંટીમાં સોજો"},
    "hand or finger pain": {"en": "Hand or finger joint pain", "hi": "हाथ की उंगलियों में दर्द", "gu": "હાથની આંગળીઓમાં દુખાવો"},
    "hand or finger swelling": {"en": "Hand or finger swelling", "hi": "उंगलियों में सूजन", "gu": "આંગળીઓમાં સોજો"},
    "wrist pain": {"en": "Wrist pain", "hi": "कलाई में दर्द", "gu": "કાંડામાં દુખાવો"},
    "wrist swelling": {"en": "Wrist swelling", "hi": "कलाई में सूजन", "gu": "કાંડામાં સોજો"},
    "elbow pain": {"en": "Elbow pain", "hi": "कोहनी में दर्द", "gu": "કોણીમાં દુખાવો"},
    "elbow swelling": {"en": "Elbow swelling", "hi": "कोहनी में सूजन", "gu": "કોણીમાં સોજો"},
    "hip pain": {"en": "Hip joint pain", "hi": "कूल्हे में दर्द", "gu": "થાપાનો દુખાવો"},
    "groin pain": {"en": "Groin pain", "hi": "जांघ के जोड़ में दर्द", "gu": "સાથળના મૂળમાં દુખાવો"},
    "peripheral edema": {"en": "Swelling in lower legs / Pitting edema", "hi": "पैरों में पानी भरना / सूजन", "gu": "પગમાં સોજો ચઢવો"},
    "leg swelling": {"en": "Swelling in both legs", "hi": "दोनों पैरों में सूजन", "gu": "બંને પગમાં સોજો"},

    # Dermatological & Skin
    "skin rash": {"en": "Skin rash / Red spots", "hi": "त्वचा पर लाल चकत्ते / दाने", "gu": "ચામડી પર લાલ ચકામા / ફોલ્લીઓ"},
    "itching of skin": {"en": "Severe skin itching (Pruritus)", "hi": "त्वचा में तेज खुजली", "gu": "ચામડીમાં તીવ્ર ખંજવાળ"},
    "skin dryness, peeling, scaliness, or roughness": {"en": "Dry, scaly, peeling or rough skin", "hi": "त्वचा का सूखापन, पपड़ी व खुरदरापन", "gu": "ચામડીની શુષ્કતા, પપડી અને રુક્ષતા"},
    "skin irritation": {"en": "Skin burning or irritation", "hi": "त्वचा में जलन व असहजता", "gu": "ચામડીમાં બળતરા"},
    "skin lesion": {"en": "Skin sore, patch or blister", "hi": "त्वचा पर छाले या घाव", "gu": "ચામડી પર ફોલ્લા કે ચાંદા"},
    "skin swelling": {"en": "Localized skin swelling", "hi": "त्वचा में सूजन", "gu": "ચામડી પર સોજો"},
    "acne or pimples": {"en": "Acne / Pus-filled pimples", "hi": "मुंहासे या फुंसियां", "gu": "ખીલ કે ફોલ્લીઓ"},
    "allergic reaction": {"en": "Allergic skin wheals / Hives", "hi": "एलर्जी के चकत्ते व खुजली", "gu": "એલર્જીના ઢીમચા અને ખંજવાળ"},
    "facial pain": {"en": "Facial tenderness or pain", "hi": "चेहरे पर दर्द या छूने पर दर्द", "gu": "ચહેરા પર દુખાવો"}
}

def train():
    print(f"Loading '{PROCESSED_CSV}'...")
    df = pd.read_csv(PROCESSED_CSV)
    
    disease_col = df.columns[0]
    features = [c for c in df.columns if c != disease_col]
    diseases = sorted(df[disease_col].unique().tolist())
    
    print(f"Classes ({len(diseases)}): {diseases[:8]} ...")
    print(f"Features count: {len(features)}")
    
    disease2idx = {d: i for i, d in enumerate(diseases)}
    X = df[features].values.astype(np.float32)
    y = np.array([disease2idx[d] for d in df[disease_col]], dtype=np.int32)
    
    # Generate augmented training sets with missing NaN values (simulating partial active inquiry)
    np.random.seed(42)
    X_train_orig, X_val_orig, y_train, y_val = train_test_split(
        X, y, test_size=0.15, random_state=42, stratify=y
    )

    # Augment training data: copy 1: dense (0/1), copy 2: sparse (masked 0s as NaN), copy 3: partial questions
    X_train_list = [X_train_orig]
    y_train_list = [y_train]

    for mask_ratio in [0.70, 0.85, 0.95]:
        X_masked = X_train_orig.copy()
        # Randomly mask 0s (unasked features) as NaN
        zero_mask = (X_masked == 0.0)
        random_dropout = (np.random.rand(*X_masked.shape) < mask_ratio) & zero_mask
        X_masked[random_dropout] = np.nan
        X_train_list.append(X_masked)
        y_train_list.append(y_train)

    X_train_augmented = np.vstack(X_train_list)
    y_train_augmented = np.concatenate(y_train_list)

    dtrain = xgb.DMatrix(X_train_augmented, label=y_train_augmented, missing=np.nan)
    dval = xgb.DMatrix(X_val_orig, label=y_val, missing=np.nan)
    
    num_classes = len(diseases)
    params = {
        "objective": "multi:softprob",
        "num_class": num_classes,
        "eval_metric": "mlogloss",
        "tree_method": "hist",
        "max_depth": 6,
        "learning_rate": 0.15,
        "subsample": 0.85,
        "colsample_bytree": 0.85,
        "seed": 42
    }
    
    print(f"Training XGBoost Multi-Class Classifier with NaN Missing Support on {len(X_train_augmented)} samples...")
    t0 = time.time()
    evals = [(dtrain, "train"), (dval, "val")]
    bst = xgb.train(params, dtrain, num_boost_round=60, evals=evals, verbose_eval=15)
    train_time = time.time() - t0
    print(f"Training completed in {train_time:.2f}s.")
    
    # Save native model
    bst.save_model(MODEL_JSON)
    print(f"Saved native model to '{MODEL_JSON}'.")
    
    # Predictions & Accuracy
    preds = bst.predict(dval)
    
    top1_correct = 0
    top3_correct = 0
    top5_correct = 0
    total = len(y_val)
    
    for i in range(total):
        ranked = np.argsort(preds[i])[::-1]
        actual = y_val[i]
        if actual == ranked[0]:
            top1_correct += 1
        if actual in ranked[:3]:
            top3_correct += 1
        if actual in ranked[:5]:
            top5_correct += 1
            
    top1_acc = (top1_correct / total) * 100
    top3_acc = (top3_correct / total) * 100
    top5_acc = (top5_correct / total) * 100
    
    print("==========================================")
    print(" MODEL ACCURACY REPORT (Validation Set)")
    print(f" Top-1 Accuracy: {top1_acc:.2f}%")
    print(f" Top-3 Accuracy: {top3_acc:.2f}%")
    print(f" Top-5 Accuracy: {top5_acc:.2f}%")
    print("==========================================")
    
    # Calculate conditional probabilities P(S|D) and prior P(D) for frontend information gain & Bayesian inference
    p_s_given_d = []
    p_disease = []
    
    for d_idx, d_name in enumerate(diseases):
        sub = df[df[disease_col] == d_name]
        p_disease.append(len(sub) / len(df))
        
        # Laplace smoothing on symptom occurrences
        sub_X = sub[features].values
        pos_counts = sub_X.sum(axis=0) + 1.0
        total_sub = len(sub) + 2.0
        p_s = (pos_counts / total_sub).tolist()
        p_s_given_d.append(p_s)
        
    # Feature labels map
    feature_labels = {}
    for feat in features:
        if feat in SYMPTOM_TRANSLATIONS:
            feature_labels[feat] = SYMPTOM_TRANSLATIONS[feat]
        else:
            clean_title = feat.replace("_", " ").title()
            feature_labels[feat] = {
                "en": clean_title,
                "hi": clean_title,
                "gu": clean_title
            }
            
    meta_payload = {
        "model_name": "Niramayy-XGBoost-Triage-Engine",
        "algorithm": "XGBoost Hist Gradient Boosted Trees (multi:softprob)",
        "created_at": time.strftime("%Y-%m-%d %H:%M:%S"),
        "num_diseases": len(diseases),
        "num_features": len(features),
        "diseases": diseases,
        "features": features,
        "feature_labels": feature_labels,
        "p_s_given_d": p_s_given_d,
        "p_disease": p_disease,
        "metrics": {
            "top1Accuracy": round(top1_acc, 2),
            "top3Accuracy": round(top3_acc, 2),
            "top5Accuracy": round(top5_acc, 2)
        }
    }
    
    os.makedirs(os.path.dirname(META_OUT), exist_ok=True)
    with open(META_OUT, "w", encoding="utf-8") as f:
        json.dump(meta_payload, f, indent=2)
    print(f"Exported synchronized model metadata to '{META_OUT}'.")

if __name__ == "__main__":
    train()
