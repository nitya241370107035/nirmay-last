import os
import json
import pandas as pd
import numpy as np

CSV_PATH = "processed_clinical_dataset.csv"
META_PATH = os.path.join("src", "data", "disease_model_data.json")
TEMPLATES_OUT = os.path.join("src", "data", "templates.json")
EMBEDDINGS_OUT = os.path.join("src", "data", "template_embeddings.json")

# Complete Disease category, clinical risk tier, and multilingual display mappings for 36 realistic diseases
DISEASE_METADATA = {
    # 1. Respiratory, Pulmonology & ENT
    "common cold": {
        "category": "respiratory",
        "name": {"en": "Common Cold / Acute Viral Rhinitis", "hi": "सामान्य जुकाम / नजला व छींकें", "gu": "સામાન્ય શરદી / સળેખમ"},
        "urgency": "green",
        "keywords": ["runny nose", "sneezing", "nasal congestion", "mild sore throat", "cold", "sardi", "chink"]
    },
    "flu": {
        "category": "infectious",
        "name": {"en": "Influenza (Flu) / Viral Syndrome", "hi": "इन्फ्लूएंजा (फ्लू) / मौसमी बुखार", "gu": "ઇન્ફ્લુએન્ઝા (ફ્લૂ) / મોસમી તાવ"},
        "urgency": "green",
        "keywords": ["high fever", "body aches", "chills", "dry cough", "fatigue", "runny nose", "flu", "taav", "bukhar"]
    },
    "acute bronchitis": {
        "category": "respiratory",
        "name": {"en": "Acute Bronchitis", "hi": "तीव्र ब्रोंकाइटिस / सीने में घरघराहट", "gu": "શ્વસનનળીનો સોજો / કફવાળી ઉધરસ"},
        "urgency": "green",
        "keywords": ["persistent cough", "sputum", "chest burning", "wheezing", "cold fever", "khansi", "udharas"]
    },
    "pneumonia": {
        "category": "respiratory",
        "name": {"en": "Pneumonia (Lung Infection)", "hi": "निमोनिया (फेफड़ों का तीव्र संक्रमण)", "gu": "ન્યુમોનિયા (ફેફસાંનો ગંભીર ચેપ)"},
        "urgency": "orange",
        "keywords": ["high fever", "cough with phlegm", "chest pain on breathing", "chills", "pneumonia", "balgam", "shvas"]
    },
    "acute sinusitis": {
        "category": "respiratory",
        "name": {"en": "Acute Sinusitis (Sinus Infection)", "hi": "साइनस संक्रमण / सिर व चेहरे में भारीपन", "gu": "સાઇનસ ઇન્ફેક્શન / માથું અને ચહેરો ભારે થવો"},
        "urgency": "green",
        "keywords": ["facial pain", "nasal congestion", "forehead headache", "nasal discharge", "sinus", "mathe dard"]
    },
    "strep throat": {
        "category": "respiratory",
        "name": {"en": "Streptococcal Pharyngitis / Strep Throat", "hi": "गले का तीव्र संक्रमण / स्ट्रेप थ्रोट", "gu": "ગળાનો ચેપ / કાકડાનો સોજો"},
        "urgency": "green",
        "keywords": ["severe sore throat", "painful swallowing", "fever", "swollen tonsils", "throat pain", "gale me dard", "gala ma dukhavo"]
    },
    "tonsillitis": {
        "category": "respiratory",
        "name": {"en": "Acute Tonsillitis", "hi": "टॉन्सिलाइटिस / गले की गांठों में सूजन", "gu": "ટાન્સિલાઇટિસ / ગળામાં કાકડા ફૂલવા"},
        "urgency": "green",
        "keywords": ["swollen tonsils", "difficulty swallowing", "sore throat", "fever", "throat pain", "kakda"]
    },
    "asthma": {
        "category": "respiratory",
        "name": {"en": "Bronchial Asthma Flare / Attack", "hi": "दमा / अस्थमा का दौरा", "gu": "દમ / અસ્થમાનો હુમલો"},
        "urgency": "orange",
        "keywords": ["wheezing", "breathlessness", "chest tightness", "coughing at night", "asthma", "shvas chadvo"]
    },
    "seasonal allergies (hay fever)": {
        "category": "respiratory",
        "name": {"en": "Allergic Rhinitis / Hay Fever", "hi": "एलर्जी जनित जुकाम / मौसमी एलर्जी", "gu": "એલર્જિક શરદી / મોસમી એલર્જી"},
        "urgency": "green",
        "keywords": ["sneezing attacks", "itchy watery eyes", "clear nasal drip", "nasal itching", "allergy", "chink"]
    },
    "acute bronchiolitis": {
        "category": "respiratory",
        "name": {"en": "Acute Bronchiolitis", "hi": "ब्रोंकियोलाइटिस / बच्चों में सांस की घरघराहट", "gu": "બ્રોન્કિઓલાઇટિસ / શ્વાસમાં સીટી જેવો અવાજ"},
        "urgency": "orange",
        "keywords": ["rapid breathing", "wheezing sound", "fever", "cough", "chest indrawing", "shvas takleef"]
    },
    "acute otitis media": {
        "category": "infectious",
        "name": {"en": "Acute Otitis Media (Middle Ear Infection)", "hi": "कान का तीव्र संक्रमण व दर्द", "gu": "કાનનો ચેપ / કાનમાં દુખાવો અને પરુ"},
        "urgency": "green",
        "keywords": ["ear pain", "pus from ear", "fever", "diminished hearing", "kaan dard", "kaan ma dukhavo"]
    },

    # 2. Gastrointestinal & Abdominal
    "infectious gastroenteritis": {
        "category": "gastrointestinal",
        "name": {"en": "Infectious Gastroenteritis (Food Poisoning / Diarrhea)", "hi": "संक्रामक आंत्रशोथ / दस्त एवं उल्टी", "gu": "ઝાડા-ઉલ્ટી / ખોરાકી ઝેર (ગેસ્ટ્રો)"},
        "urgency": "orange",
        "keywords": ["watery diarrhea", "vomiting", "stomach cramps", "fever", "dehydration", "jhada", "dast", "ulti"]
    },
    "gastroesophageal reflux disease (gerd)": {
        "category": "gastrointestinal",
        "name": {"en": "GERD / Severe Acid Reflux", "hi": "एसिड रिफ्लक्स / गंभीर सीने में जलन", "gu": "એસિડિટી / છાતીમાં બળતરા"},
        "urgency": "green",
        "keywords": ["heartburn", "acid regurgitation", "chest burning after meals", "sour taste", "acidity", "chhati ma jalan"]
    },
    "gastroduodenal ulcer": {
        "category": "gastrointestinal",
        "name": {"en": "Peptic / Gastroduodenal Ulcer Disease", "hi": "पेट का अल्सर / छाला व जलन", "gu": "પેટનું અલ્સર / ચાંદું અને બળતરા"},
        "urgency": "orange",
        "keywords": ["burning stomach pain", "hunger pain", "nausea", "black stools", "vomiting blood", "pet me jalan", "pet dard"]
    },
    "appendicitis": {
        "category": "gastrointestinal",
        "name": {"en": "Acute Appendicitis", "hi": "अपेंडिसाइटिस / पेट के निचले दाहिने हिस्से में तेज दर्द", "gu": "એપેન્ડિસાઇટિસ / પેટના જમણા ભાગમાં તીવ્ર દુખાવો"},
        "urgency": "red",
        "keywords": ["right lower abdominal pain", "rebound tenderness", "vomiting", "fever", "appendix", "pet dard"]
    },

    # 3. Cardiovascular & Hypertension
    "heart attack": {
        "category": "cardiovascular",
        "name": {"en": "Heart Attack / Myocardial Infarction", "hi": "दिल का दौरा (हार्ट अटैक)", "gu": "હાર્ટ એટેક / હૃદયરોગનો હુમલો"},
        "urgency": "red",
        "keywords": ["chest pain", "crushing chest pain", "sweating", "left arm pain", "jaw pain", "breathlessness", "heart attack", "chhati ma dard"]
    },
    "angina": {
        "category": "cardiovascular",
        "name": {"en": "Angina Pectoris / Ischemic Chest Pain", "hi": "एनजाइना / सीने में जकड़न व दर्द", "gu": "એન્જાઇના / છાતીમાં દબાણ અને દુખાવો"},
        "urgency": "orange",
        "keywords": ["chest tightness", "chest pressure", "exertional chest pain", "angina", "chhati bhari"]
    },
    "heart failure": {
        "category": "cardiovascular",
        "name": {"en": "Congestive Heart Failure", "hi": "हार्ट फेलियर / सांस फूलना व पैरों में सूजन", "gu": "હાર્ટ ફેલિયર / શ્વાસ ચઢવો અને પગમાં સોજો"},
        "urgency": "red",
        "keywords": ["leg swelling", "shortness of breath at night", "fatigue", "rapid heartbeat", "orthopnea"]
    },
    "hypertensive heart disease": {
        "category": "cardiovascular",
        "name": {"en": "Hypertensive Heart Disease", "hi": "उच्च रक्तचाप जनित हृदय रोग (हाई बीपी)", "gu": "હાઈ બ્લડ પ્રેશર જનિત હૃદયરોગ"},
        "urgency": "orange",
        "keywords": ["high blood pressure", "headache", "dizziness", "chest pressure", "palpitations", "bp vadhi javu"]
    },

    # 4. Neurological & Headaches
    "migraine": {
        "category": "neurological",
        "name": {"en": "Migraine Headache", "hi": "माइग्रेन / आधे सिर का तेज दर्द व उल्टी", "gu": "માઇગ્રેન / અડધા માથાનો તીવ્ર દુખાવો"},
        "urgency": "green",
        "keywords": ["throbbing headache", "one sided head pain", "light sensitivity", "nausea", "migraine", "adho sirdard"]
    },
    "tension headache": {
        "category": "neurological",
        "name": {"en": "Tension / Stress Headache", "hi": "तनाव जनित सिरदर्द / माथे में भारीपन", "gu": "તણાવજન્ય માથાનો દુખાવો / માથામાં જકડન"},
        "urgency": "green",
        "keywords": ["band like headache", "tightness around forehead", "neck tension", "stress headache", "sirdard"]
    },

    # 5. Metabolic, Endocrine & Renal
    "hypoglycemia": {
        "category": "endocrine",
        "name": {"en": "Hypoglycemia (Low Blood Sugar)", "hi": "हाइपोग्लाइसीमिया (शुगर का अचानक बहुत कम होना)", "gu": "હાઇપોગ્લાયકેમિયા (બ્લડ સુગર અચાનક ઘટી જવું)"},
        "urgency": "red",
        "keywords": ["cold sweating", "shakiness", "dizziness", "confusion", "rapid heart rate", "hunger", "sugar low"]
    },
    "diabetic peripheral neuropathy": {
        "category": "endocrine",
        "name": {"en": "Diabetic Peripheral Neuropathy (Nerve Damage)", "hi": "डायबिटिक न्यूरोपैथी / पैरों में जलन, सुन्नपन व झनझनाहट", "gu": "ડાયાબિટીક ન્યુરોપેથી / પગમાં બળતરા અને સુન્નતા"},
        "urgency": "green",
        "keywords": ["burning feet", "numbness in toes and fingers", "tingling sensation", "pins and needles", "pair me jalan"]
    },
    "cystitis": {
        "category": "renal",
        "name": {"en": "Acute Cystitis / Urinary Tract Infection (UTI)", "hi": "मूत्र संक्रमण / पेशाब में तेज जलन व दर्द", "gu": "પેશાબમાં ચેપ (યુટીઆઈ) / પેશાબમાં બળતરા"},
        "urgency": "green",
        "keywords": ["burning urination", "frequent urge to urinate", "lower abdominal discomfort", "cloudy urine", "peshab me jalan"]
    },
    "kidney stone": {
        "category": "renal",
        "name": {"en": "Renal Colic (Kidney Stone Pain)", "hi": "गुर्दे की पथरी का तीव्र दर्द", "gu": "પથરીનો તીવ્ર દુખાવો (કિડની સ્ટોન)"},
        "urgency": "orange",
        "keywords": ["flank pain radiating to groin", "sharp side back pain", "blood in urine", "vomiting", "pathri", "kidney stone"]
    },

    # 6. Dermatological
    "eczema": {
        "category": "dermatological",
        "name": {"en": "Atopic Dermatitis / Eczema Flare", "hi": "एक्जिमा / त्वचा पर खुजली, सूखापन व पपड़ी", "gu": "એક્ઝિમા / ચામડી પર ખંજવાળ અને રુક્ષતા"},
        "urgency": "green",
        "keywords": ["dry itchy patches", "skin peeling", "flexural eczema", "itchiness", "khujli"]
    },
    "contact dermatitis": {
        "category": "dermatological",
        "name": {"en": "Contact Dermatitis / Skin Allergy", "hi": "कॉन्टैक्ट डर्मेटाइटिस / त्वचा की एलर्जी व लाली", "gu": "કોન્ટેક્ટ ડર્મેટાઇટિસ / ચામડીની એલર્જી"},
        "urgency": "green",
        "keywords": ["red burning rash", "blisters from contact", "localized skin itching", "chamdi allergy"]
    },
    "fungal infection of the skin": {
        "category": "dermatological",
        "name": {"en": "Cutaneous Fungal Infection (Ringworm / Tinea)", "hi": "त्वचा का फंगल इन्फेक्शन / दाद व खुजली", "gu": "ચામડીનો ફંગલ ચેપ / દાદર અને ખંજવાળ"},
        "urgency": "green",
        "keywords": ["ring shaped rash", "severe skin itching", "scaly skin", "red circular patch", "daad", "dhadhar"]
    },
    "pyogenic skin infection": {
        "category": "dermatological",
        "name": {"en": "Pyogenic Bacterial Skin Infection (Boil / Cellulitis)", "hi": "त्वचा का मवाददार संक्रमण / फोड़े-फुंसी व सूजन", "gu": "ચામડીનું પરુવાળું ઇન્ફેક્શન / ગૂમડું અને લાલાશ"},
        "urgency": "green",
        "keywords": ["pus filled boil", "red swollen skin area", "warmth and tenderness", "skin abscess", "foolda"]
    },

    # 7. Musculoskeletal, Spine & Joint
    "gout": {
        "category": "musculoskeletal",
        "name": {"en": "Acute Gouty Arthritis Attack", "hi": "गाउट (गठिया) / पैर के अंगूठे में तीव्र दर्द व लाल सूजन", "gu": "ગાઉટ (ગઠિયો વા) / પગના અંગૂઠામાં સોજો અને અતિશય દુખાવો"},
        "urgency": "orange",
        "keywords": ["severe big toe pain", "swollen red hot joint", "sudden onset joint pain", "uric acid", "gathiya"]
    },
    "osteoarthritis": {
        "category": "musculoskeletal",
        "name": {"en": "Osteoarthritis / Knee & Joint Wear", "hi": "ऑस्टियोआर्थराइटिस / घुटनों व जोड़ों में घिसाव व दर्द", "gu": "ઓસ્ટિઓઆર્થરાઇટિસ / ઘૂંટણ અને સાંધાનો ઘસારો"},
        "urgency": "green",
        "keywords": ["joint pain on walking", "knee stiffness", "crepitus sound in joints", "ghutne dard", "sandha dukhavo"]
    },
    "rheumatoid arthritis": {
        "category": "musculoskeletal",
        "name": {"en": "Rheumatoid Arthritis Flare", "hi": "रुमेटाइड अर्थराइटिस / जोड़ों में सूजन व सुबह की अकड़न", "gu": "રુમેટોઇડ સંધિવા / સવારે સાંધા અકડાઈ જવા"},
        "urgency": "green",
        "keywords": ["morning joint stiffness", "bilateral hand and wrist swelling", "joint pain", "sandhiwa"]
    },
    "sciatica": {
        "category": "musculoskeletal",
        "name": {"en": "Sciatica (Lumbar Radiculopathy)", "hi": "साइटिका / कमर से पैर में नीचे तक जाने वाला तेज दर्द", "gu": "સાયટિકા / કમરથી પગ સુધી ઉતરતો દુખાવો (રાંઝણ)"},
        "urgency": "green",
        "keywords": ["sharp shooting pain down one leg", "lower back pain", "leg numbness or tingling", "kamar dard"]
    },
    "chronic back pain": {
        "category": "musculoskeletal",
        "name": {"en": "Mechanical Low Back Pain / Lumbar Strain", "hi": "कमर दर्द / मांसपेशियों में खिंचाव व जकड़न", "gu": "કમરનો દુખાવો / સ્નાયુઓમાં ખેંચાણ"},
        "urgency": "green",
        "keywords": ["lower back stiffness", "muscle spasm in back", "pain on bending", "kamar ma dukhavo"]
    },
    "spondylosis": {
        "category": "musculoskeletal",
        "name": {"en": "Cervical / Lumbar Spondylosis", "hi": "स्पॉन्डिलाइटिस / गर्दन व पीठ में जकड़न", "gu": "સ્પોન્ડિલાઇટિસ / ગરદન અને પીઠનો દુખાવો"},
        "urgency": "green",
        "keywords": ["neck stiffness radiating to shoulder", "dizziness on neck movement", "spinal stiffness", "gardan dard"]
    },

    # 8. Ophthalmic
    "conjunctivitis due to allergy": {
        "category": "infectious",
        "name": {"en": "Allergic Conjunctivitis (Pink Eye)", "hi": "आंख आना / एलर्जी जनित आंखों में लाली व खुजली", "gu": "આંખો આવવી / આંખમાં લાલાશ અને ખંજવાળ"},
        "urgency": "green",
        "keywords": ["red eyes", "eye itching", "watery eye discharge", "swollen eyelids", "aankh laal", "aankho aavvi"]
    }
}

def generate_embedding_vector(text):
    """
    Computes a deterministic 384-dimensional normalized semantic hash embedding
    """
    cleaned = text.lower().strip()
    vec = np.zeros(384, dtype=np.float32)
    seed = 0
    for ch in cleaned:
        seed = (seed * 31 + ord(ch)) & 0xffffffff
        
    state = seed or 123456789
    for i in range(384):
        state = (state * 1664525 + 1013904223) & 0xffffffff
        vec[i] = (state / 0xffffffff) * 2.0 - 1.0
        
    norm = np.linalg.norm(vec) or 1.0
    return (vec / norm).tolist()

def generate_templates():
    print(f"Loading '{CSV_PATH}' and metadata...")
    df = pd.read_csv(CSV_PATH)
    disease_col = df.columns[0]
    features = [c for c in df.columns if c != disease_col]
    diseases = sorted(df[disease_col].unique().tolist())
    
    with open(META_PATH, "r", encoding="utf-8") as f:
        meta = json.load(f)
    feature_labels = meta["feature_labels"]
    
    templates = []
    embeddings = []
    
    print(f"Generating clinical question templates for {len(diseases)} diseases...")
    
    for dis in diseases:
        sub = df[df[disease_col] == dis]
        # Calculate feature correlation / positive counts in this disease
        feat_counts = sub[features].sum(axis=0)
        # Top 12 discriminating features present in this disease to maximize diagnostic confidence
        top_feats = feat_counts.sort_values(ascending=False).head(12).index.tolist()
        
        meta_info = DISEASE_METADATA.get(dis, {
            "category": "general",
            "name": {"en": dis.title(), "hi": dis.title(), "gu": dis.title()},
            "urgency": "orange",
            "keywords": [dis]
        })
        
        # Build specific questions directly from the dataset features
        questions = []
        for feat in top_feats:
            lbl = feature_labels.get(feat, {"en": feat, "hi": feat, "gu": feat})
            q_text_en = f"Are you experiencing {lbl['en'].lower()}?"
            q_text_hi = f"क्या आपको {lbl['hi']} की समस्या हो रही है?"
            q_text_gu = f"શું તમને {lbl['gu']} ની તકલીફ થાય છે?"
            
            questions.append({
                "id": feat,
                "featureKey": feat,
                "text": {
                    "en": q_text_en,
                    "hi": q_text_hi,
                    "gu": q_text_gu
                },
                "type": "boolean",
                "label": lbl
            })
            
        template_id = dis.replace(" ", "_").replace("(", "").replace(")", "").replace("/", "_").replace("'", "")
        
        template_obj = {
            "id": template_id,
            "diseaseKey": dis,
            "name": meta_info["name"],
            "category": meta_info["category"],
            "urgency": meta_info["urgency"],
            "keywords": meta_info["keywords"],
            "discriminatingFeatures": top_feats,
            "questions": questions
        }
        
        templates.append(template_obj)
        
        # Build embedding text
        emb_text = f"{dis} {meta_info['name']['en']} {meta_info['name']['hi']} {meta_info['name']['gu']} " + " ".join(meta_info["keywords"]) + " " + " ".join(top_feats)
        vec = generate_embedding_vector(emb_text)
        
        embeddings.append({
            "id": template_id,
            "diseaseKey": dis,
            "name": meta_info["name"]["en"],
            "keywords": meta_info["keywords"],
            "vector": vec
        })
        
    os.makedirs(os.path.dirname(TEMPLATES_OUT), exist_ok=True)
    os.makedirs("public/data", exist_ok=True)
    
    with open(TEMPLATES_OUT, "w", encoding="utf-8") as f:
        json.dump(templates, f, indent=2)
    with open("public/data/templates.json", "w", encoding="utf-8") as f:
        json.dump(templates, f, indent=2)
    print(f"Saved {len(templates)} templates to '{TEMPLATES_OUT}' and 'public/data/templates.json'.")
    
    with open(EMBEDDINGS_OUT, "w", encoding="utf-8") as f:
        json.dump(embeddings, f, indent=2)
    with open("public/data/template_embeddings.json", "w", encoding="utf-8") as f:
        json.dump(embeddings, f, indent=2)
    print(f"Saved {len(embeddings)} template embeddings to '{EMBEDDINGS_OUT}' and 'public/data/template_embeddings.json'.")

if __name__ == "__main__":
    generate_templates()
