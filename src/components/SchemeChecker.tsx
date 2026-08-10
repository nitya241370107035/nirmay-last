import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Building2,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Users,
  ShieldCheck,
  Hospital,
  AlertCircle,
  FileText,
  UserCheck,
  CreditCard,
  Briefcase,
  HeartHandshake,
  Activity,
  ArrowRight,
  Info,
  Sparkles,
  HelpCircle,
  Globe
} from 'lucide-react';
import { db } from '../db/db';
import { Patient, LanguageCode, MultilingualText } from '../types';
import { checkEligibility, EligibleSchemeResult, PatientSchemeProfile } from '../engine/schemeEngine';

interface SchemeCheckerProps {
  initialPatient?: Patient | null;
  initialDiseaseId?: string | null;
  onSelectSchemeEmpanelledHospitals: (empanelmentType: string) => void;
  onBackToHome: () => void;
}

export const SchemeChecker: React.FC<SchemeCheckerProps> = ({
  initialPatient,
  initialDiseaseId,
  onSelectSchemeEmpanelledHospitals,
  onBackToHome
}) => {
  const { i18n } = useTranslation();
  const currentLang = (i18n.language || 'en') as LanguageCode;

  // Wizard Step (1: Patient Profile, 2: Income/Social, 3: Disease, 4: Family Size, 5: Results)
  const [step, setStep] = useState<number>(1);

  // Form State
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(initialPatient || null);
  const [rosterPatients, setRosterPatients] = useState<Patient[]>([]);
  const [showRosterModal, setShowRosterModal] = useState<boolean>(false);

  const [age, setAge] = useState<number>(initialPatient?.age || 35);
  const [gender, setGender] = useState<string>(initialPatient?.gender?.toLowerCase() || 'female');
  const [stateName, setStateName] = useState<string>('Gujarat');

  // Income / Social Category Selection
  const [rationCard, setRationCard] = useState<string>('BPL');
  const [occupation, setOccupation] = useState<string>('landless_labourer');
  const [vulnerableGroup, setVulnerableGroup] = useState<string>('none');

  // Medical Condition
  const [diseaseId, setDiseaseId] = useState<string>(initialDiseaseId || 'none');

  // Household size
  const [familySize, setFamilySize] = useState<number>(4);

  // Results State
  const [eligibleSchemes, setEligibleSchemes] = useState<EligibleSchemeResult[]>([]);

  // Load Dexie Roster patients
  useEffect(() => {
    db.patients
      .toArray()
      .then((p) => setRosterPatients(p))
      .catch((err) => console.error('Failed to load roster:', err));
  }, []);

  // Update fields when initialPatient changes
  useEffect(() => {
    if (initialPatient) {
      setSelectedPatient(initialPatient);
      setAge(initialPatient.age);
      if (initialPatient.gender) {
        setGender(initialPatient.gender.toLowerCase());
      }
    }
  }, [initialPatient]);

  useEffect(() => {
    if (initialDiseaseId) {
      setDiseaseId(initialDiseaseId);
    }
  }, [initialDiseaseId]);

  // Execute eligibility calculation when arriving at results step (Step 5)
  const calculateAndShowResults = () => {
    const profile: PatientSchemeProfile = {
      age,
      gender,
      incomeCriteria: {
        ration_card: rationCard,
        occupation: occupation,
        vulnerable_group: vulnerableGroup !== 'none' ? vulnerableGroup : undefined
      },
      familySize,
      state: stateName
    };

    const results = checkEligibility(profile, diseaseId !== 'none' ? diseaseId : undefined);
    setEligibleSchemes(results);
    setStep(5);
  };

  const handleSelectRosterPatient = (p: Patient) => {
    setSelectedPatient(p);
    setAge(p.age);
    if (p.gender) {
      setGender(p.gender.toLowerCase());
    }
    setShowRosterModal(false);
  };

  const getText = (multi?: MultilingualText | null, fallback = '') => {
    if (!multi) return fallback;
    return multi[currentLang] || multi.en || fallback;
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 bg-[#F4F7F6] min-h-[calc(100vh-80px)] py-6 px-3 sm:px-4 font-sans">
      {/* HEADER BAR */}
      <div className="bg-[#1B4D4A] text-white rounded-2xl p-5 sm:p-6 shadow-card border border-[#2E7D73]/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 font-sans">
        <div className="flex items-center gap-3.5">
          <button
            onClick={onBackToHome}
            className="p-2.5 rounded-xl bg-[#2E7D73] text-white hover:bg-[#1B4D4A] transition cursor-pointer border border-[#B2DFD8]/20 shrink-0 shadow-xs"
            title="Back"
          >
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-[#2E7D73]/50 text-[#B2DFD8] text-[10px] font-mono font-bold uppercase tracking-wider border border-[#B2DFD8]/20">
              <ShieldCheck className="w-3.5 h-3.5 text-white" />
              <span>GOVT AID & SCHEME ENGINE</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-1 font-display">
              {currentLang === 'gu'
                ? 'રાષ્ટ્રીય અને રાજ્ય સ્વાસ્થ્ય યોજના પાત્રતા તપાસ'
                : currentLang === 'hi'
                ? 'राष्ट्रीय एवं राज्य स्वास्थ्य योजना पात्रता जांच'
                : 'National Health Scheme Eligibility Checker'}
            </h1>
          </div>
        </div>

        <span className="px-3.5 py-1.5 bg-white text-[#1B4D4A] rounded-xl text-xs font-bold shrink-0 shadow-xs">
          OFFLINE ENGINE
        </span>
      </div>

      {/* STEP PROGRESS BAR */}
      <div className="bg-white rounded-2xl p-2.5 shadow-card border border-[#DDE3E2] flex items-center justify-between gap-1 overflow-x-auto text-xs font-bold font-sans">
        {[
          { num: 1, label: currentLang === 'gu' ? '૧. પ્રોફાઇલ' : currentLang === 'hi' ? '1. प्रोफ़ाइल' : '1. Profile' },
          { num: 2, label: currentLang === 'gu' ? '૨. આવક / વર્ગ' : currentLang === 'hi' ? '2. આવક' : '2. Income' },
          { num: 3, label: currentLang === 'gu' ? '૩. બીમારી' : currentLang === 'hi' ? '3. बीमारी' : '3. Disease' },
          { num: 4, label: currentLang === 'gu' ? '૪. કુટુંબ' : currentLang === 'hi' ? '4. परिवार' : '4. Family' },
          { num: 5, label: currentLang === 'gu' ? '૫. પાત્રતા યોજના' : currentLang === 'hi' ? '5. परिणाम' : '5. Schemes' }
        ].map((s) => (
          <button
            key={s.num}
            onClick={() => {
              if (s.num < step || step === 5) setStep(s.num);
            }}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl shrink-0 transition cursor-pointer ${
              step === s.num
                ? 'bg-[#2E7D73] text-white shadow-xs'
                : step > s.num
                ? 'bg-[#EDF1F0] text-[#1B4D4A]'
                : 'bg-[#F4F7F6] text-[#5F6D6C]'
            }`}
          >
            <span>{s.label}</span>
            {step > s.num && <CheckCircle2 className="w-3.5 h-3.5 text-[#2E7D73]" />}
          </button>
        ))}
      </div>

      {/* STEP 1: PATIENT PROFILE */}
      {step === 1 && (
        <div className="bg-white rounded-2xl p-6 shadow-card border border-[#DDE3E2] space-y-6 font-sans">
          <div className="flex items-center justify-between border-b border-[#DDE3E2] pb-4">
            <div>
              <h2 className="text-lg font-bold text-[#1B4D4A] flex items-center gap-2 font-display">
                <UserCheck className="w-5 h-5 text-[#2E7D73]" />
                <span>
                  {currentLang === 'gu'
                    ? 'કોના માટે તપાસ કરી રહ્યા છો?'
                    : currentLang === 'hi'
                    ? 'किस लाभार्थी के लिए जाँच कर रहे हैं?'
                    : 'Whom are you checking scheme eligibility for?'}
                </span>
              </h2>
              <p className="text-xs text-[#5F6D6C] mt-1 font-sans">
                Select an existing patient from EMR roster or enter age & gender details.
              </p>
            </div>

            <button
              onClick={() => setShowRosterModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#EDF1F0] hover:bg-[#DDE3E2] text-[#1B4D4A] font-bold text-xs rounded-xl transition cursor-pointer shrink-0 shadow-2xs"
            >
              <Users className="w-4 h-4 text-[#2E7D73]" />
              <span>
                {selectedPatient ? `Selected: ${selectedPatient.name}` : 'ROSTER PATIENTS'}
              </span>
            </button>
          </div>

          {selectedPatient && (
            <div className="p-3 bg-[#EDF1F0] rounded-xl border border-[#DDE3E2] flex items-center justify-between text-xs text-[#1A2B2B] font-bold">
              <span className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#2E7D73]" />
                Loaded Patient: <strong>{selectedPatient.name}</strong> ({selectedPatient.age} yrs, {selectedPatient.gender})
              </span>
              <button
                onClick={() => setSelectedPatient(null)}
                className="text-[#2E7D73] underline"
              >
                Clear Selection
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-sans">
            {/* AGE INPUT */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#1B4D4A] uppercase tracking-wider block">
                Patient Age (ઉંમર / आयु)
              </label>
              <input
                type="number"
                min={0}
                max={120}
                value={age}
                onChange={(e) => setAge(Number(e.target.value))}
                className="w-full px-4 py-3 bg-[#F4F7F6] rounded-xl border border-[#DDE3E2] font-bold text-[#1A2B2B] focus:bg-white focus:border-[#2E7D73] outline-none"
              />
            </div>

            {/* GENDER SELECT */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#1B4D4A] uppercase tracking-wider block">
                Gender (જાતિ / लिंग)
              </label>
              <div className="grid grid-cols-3 gap-2">
                {['female', 'male', 'other'].map((g) => (
                  <button
                    key={g}
                    onClick={() => setGender(g)}
                    className={`py-3 rounded-xl font-bold text-xs capitalize transition cursor-pointer ${
                      gender === g
                        ? 'bg-[#2E7D73] text-white shadow-xs'
                        : 'bg-[#F4F7F6] text-[#1A2B2B] border border-[#DDE3E2] hover:bg-[#EDF1F0]'
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* STATE SELECT */}
          <div className="space-y-1.5 pt-2 font-sans">
            <label className="text-xs font-bold text-[#1B4D4A] uppercase tracking-wider block">
              Domicile State (રાજ્ય / राज्य)
            </label>
            <select
              value={stateName}
              onChange={(e) => setStateName(e.target.value)}
              className="w-full px-4 py-3 bg-[#F4F7F6] rounded-xl border border-[#DDE3E2] font-bold text-[#1A2B2B] focus:bg-white focus:border-[#2E7D73] outline-none"
            >
              <option value="Gujarat">Gujarat (ગુજરાત)</option>
              <option value="Rajasthan">Rajasthan</option>
              <option value="Madhya Pradesh">Madhya Pradesh</option>
              <option value="Maharashtra">Maharashtra</option>
              <option value="All India">Other / All India</option>
            </select>
          </div>

          <div className="pt-4 flex justify-end font-sans">
            <button
              onClick={() => setStep(2)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#1B4D4A] hover:bg-[#2E7D73] text-white font-bold text-xs rounded-xl transition cursor-pointer shadow-xs"
            >
              <span>NEXT: INCOME & SOCIAL CATEGORY</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: INCOME & SOCIAL CATEGORY */}
      {step === 2 && (
        <div className="bg-white rounded-2xl p-6 shadow-card border border-[#DDE3E2] space-y-6 font-sans">
          <div>
            <h2 className="text-lg font-bold text-[#1B4D4A] flex items-center gap-2 font-display">
              <CreditCard className="w-5 h-5 text-[#2E7D73]" />
              <span>
                {currentLang === 'gu'
                  ? 'આવક અને સામાજિક વર્ગની માહિતી'
                  : currentLang === 'hi'
                  ? 'आय एवं सामाजिक वर्ग की जानकारी'
                  : 'Income, Ration Card & Social Category'}
              </span>
            </h2>
            <p className="text-xs text-[#5F6D6C] mt-1 font-sans">
              Select applicable ration card, occupation, or vulnerable group status.
            </p>
          </div>

          {/* RATION CARD SELECT */}
          <div className="space-y-2 font-sans">
            <label className="text-xs font-bold text-[#1B4D4A] uppercase tracking-wider block flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-[#2E7D73]" />
              <span>Ration Card Type (રેશન કાર્ડનો પ્રકાર)</span>
            </label>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'BPL', title: 'BPL Card', desc: 'Below Poverty Line' },
                { id: 'Antyodaya', title: 'Antyodaya (AAY)', desc: 'Poorest of Poor' },
                { id: 'APL', title: 'APL Card', desc: 'Above Poverty Line' },
                { id: 'None', title: 'None / No Card', desc: 'General Household' }
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => setRationCard(item.id)}
                  className={`p-3 rounded-xl text-left border transition cursor-pointer ${
                    rationCard === item.id
                      ? 'bg-[#2E7D73] text-white border-[#2E7D73] shadow-xs'
                      : 'bg-[#F4F7F6] text-[#1A2B2B] border-[#DDE3E2] hover:bg-[#EDF1F0]'
                  }`}
                >
                  <span className="font-bold text-xs block">{item.title}</span>
                  <span
                    className={`text-[10px] block mt-0.5 ${
                      rationCard === item.id ? 'text-[#B2DFD8]' : 'text-[#5F6D6C]'
                    }`}
                  >
                    {item.desc}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* OCCUPATION SELECT */}
          <div className="space-y-2 pt-2 border-t border-[#DDE3E2] font-sans">
            <label className="text-xs font-bold text-[#1B4D4A] uppercase tracking-wider block flex items-center gap-1.5">
              <Briefcase className="w-4 h-4 text-[#2E7D73]" />
              <span>Household Occupation (વ્યવસાય / रोज़गार)</span>
            </label>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[
                { id: 'landless_labourer', label: 'Landless Labourer (ખેતમજૂર)' },
                { id: 'small_farmer', label: 'Small Farmer (સીમાંત ખેડૂત)' },
                { id: 'domestic_worker', label: 'Domestic Worker (ઘરકામ)' },
                { id: 'construction_worker', label: 'Construction Worker (મજૂર)' },
                { id: 'street_vendor', label: 'Street Vendor (ફેરીયો)' },
                { id: 'asha_worker', label: 'ASHA / Anganwadi (આશા બહેન)' },
                { id: 'salaried', label: 'Salaried / Private Job' },
                { id: 'self_employed', label: 'Self-Employed / Business' }
              ].map((occ) => (
                <button
                  key={occ.id}
                  onClick={() => setOccupation(occ.id)}
                  className={`p-2.5 rounded-xl text-left border text-xs font-bold transition cursor-pointer ${
                    occupation === occ.id
                      ? 'bg-[#2E7D73] text-white border-[#2E7D73] shadow-xs'
                      : 'bg-[#F4F7F6] text-[#1A2B2B] border-[#DDE3E2] hover:bg-[#EDF1F0]'
                  }`}
                >
                  {occ.label}
                </button>
              ))}
            </div>
          </div>

          {/* VULNERABLE GROUP SELECT */}
          <div className="space-y-2 pt-2 border-t border-[#DDE3E2] font-sans">
            <label className="text-xs font-bold text-[#1B4D4A] uppercase tracking-wider block flex items-center gap-1.5">
              <HeartHandshake className="w-4 h-4 text-[#2E7D73]" />
              <span>Vulnerable Social Category (સામાજિક સ્થિતિ)</span>
            </label>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[
                { id: 'disabled', label: 'Person with Disability (દિવ્યાંગ)' },
                { id: 'elderly_no_income', label: 'Elderly No Income (વૃદ્ધ)' },
                { id: 'widow', label: 'Widow / Orphan (વિધવા/અનાથ)' },
                { id: 'transgender', label: 'Transgender (ટ્રાન્સજેન્ડર)' },
                { id: 'none', label: 'None / Not Applicable' }
              ].map((vg) => (
                <button
                  key={vg.id}
                  onClick={() => setVulnerableGroup(vg.id)}
                  className={`p-2.5 rounded-xl text-left border text-xs font-bold transition cursor-pointer ${
                    vulnerableGroup === vg.id
                      ? 'bg-[#2E7D73] text-white border-[#2E7D73] shadow-xs'
                      : 'bg-[#F4F7F6] text-[#1A2B2B] border-[#DDE3E2] hover:bg-[#EDF1F0]'
                  }`}
                >
                  {vg.label}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-4 flex items-center justify-between border-t border-[#DDE3E2] font-sans">
            <button
              onClick={() => setStep(1)}
              className="px-4 py-2 bg-[#EDF1F0] hover:bg-[#DDE3E2] text-[#1B4D4A] font-bold text-xs rounded-xl transition cursor-pointer"
            >
              BACK
            </button>

            <button
              onClick={() => setStep(3)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#1B4D4A] hover:bg-[#2E7D73] text-white font-bold text-xs rounded-xl transition cursor-pointer shadow-xs"
            >
              <span>NEXT: SPECIFIC DISEASES</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: MEDICAL CONDITION / DIAGNOSIS */}
      {step === 3 && (
        <div className="bg-white rounded-2xl p-6 shadow-card border border-[#DDE3E2] space-y-6 font-sans">
          <div>
            <h2 className="text-lg font-bold text-[#1B4D4A] flex items-center gap-2 font-display">
              <Activity className="w-5 h-5 text-[#2E7D73]" />
              <span>
                {currentLang === 'gu'
                  ? 'નિદાન થયેલ બીમારી અથવા સર્જરી (મરજિયાત)'
                  : currentLang === 'hi'
                  ? 'निदान की गई बीमारी या सर्जरी (वैकल्पिक)'
                  : 'Diagnosed Disease or Illness (Optional)'}
              </span>
            </h2>
            <p className="text-xs text-[#5F6D6C] mt-1 font-sans">
              Certain major illnesses (Cancer, Dialysis, TB, Heart disease) trigger free treatment irrespective of income level.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-sans">
            {[
              {
                id: 'cancer',
                title: 'Cancer Treatment (કેન્સર)',
                desc: 'Oncology, Chemotherapy, Radiation'
              },
              {
                id: 'kidney_failure',
                title: 'Kidney Failure / Dialysis (કિડની નિષ્ફળતા)',
                desc: 'Renal transplant, free dialysis'
              },
              {
                id: 'heart_disease',
                title: 'Heart Surgery / Cardiac (હૃદયરોગ)',
                desc: 'Angioplasty, bypass, valve replacement'
              },
              {
                id: 'tb',
                title: 'Tuberculosis (TB / ક્ષય રોગ)',
                desc: '100% free DOTS drugs & ₹500/mo nutrition'
              },
              {
                id: 'dengue',
                title: 'Dengue / Malaria / Typhoid',
                desc: 'In-patient fever hospitalization'
              },
              {
                id: 'none',
                title: 'None / General OPD Consultation',
                desc: 'Standard medical treatment'
              }
            ].map((d) => (
              <button
                key={d.id}
                onClick={() => setDiseaseId(d.id)}
                className={`p-4 rounded-xl text-left border transition cursor-pointer flex flex-col justify-between ${
                  diseaseId === d.id
                    ? 'bg-[#2E7D73] text-white border-[#2E7D73] shadow-xs'
                    : 'bg-[#F4F7F6] text-[#1A2B2B] border-[#DDE3E2] hover:bg-[#EDF1F0]'
                }`}
              >
                <span className="font-bold text-sm block font-display">{d.title}</span>
                <span
                  className={`text-xs mt-1 block font-sans ${
                    diseaseId === d.id ? 'text-[#B2DFD8]' : 'text-[#5F6D6C]'
                  }`}
                >
                  {d.desc}
                </span>
              </button>
            ))}
          </div>

          <div className="pt-4 flex items-center justify-between border-t border-[#DDE3E2] font-sans">
            <button
              onClick={() => setStep(2)}
              className="px-4 py-2 bg-[#EDF1F0] hover:bg-[#DDE3E2] text-[#1B4D4A] font-bold text-xs rounded-xl transition cursor-pointer"
            >
              BACK
            </button>

            <button
              onClick={() => setStep(4)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#1B4D4A] hover:bg-[#2E7D73] text-white font-bold text-xs rounded-xl transition cursor-pointer shadow-xs"
            >
              <span>NEXT: FAMILY SIZE</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: FAMILY SIZE */}
      {step === 4 && (
        <div className="bg-white rounded-2xl p-6 shadow-card border border-[#DDE3E2] space-y-6 font-sans">
          <div>
            <h2 className="text-lg font-bold text-[#1B4D4A] flex items-center gap-2 font-display">
              <Users className="w-5 h-5 text-[#2E7D73]" />
              <span>
                {currentLang === 'gu'
                  ? 'કુટુંબના સભ્યોની સંખ્યા'
                  : currentLang === 'hi'
                  ? 'परिवार के सदस्यों की संख्या'
                  : 'Household / Family Size'}
              </span>
            </h2>
            <p className="text-xs text-[#5F6D6C] mt-1 font-sans">
              Enter total number of family members residing together.
            </p>
          </div>

          <div className="space-y-3 max-w-sm font-sans">
            <label className="text-xs font-bold text-[#1B4D4A] uppercase tracking-wider block">
              Total Family Members
            </label>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setFamilySize(Math.max(1, familySize - 1))}
                className="w-12 h-12 bg-[#EDF1F0] hover:bg-[#DDE3E2] font-bold text-xl rounded-xl transition cursor-pointer text-[#1B4D4A]"
              >
                -
              </button>
              <input
                type="number"
                value={familySize}
                onChange={(e) => setFamilySize(Number(e.target.value))}
                className="w-24 text-center py-3 bg-[#F4F7F6] rounded-xl border border-[#DDE3E2] font-bold text-xl text-[#1A2B2B] focus:bg-white focus:border-[#2E7D73] outline-none"
              />
              <button
                onClick={() => setFamilySize(familySize + 1)}
                className="w-12 h-12 bg-[#EDF1F0] hover:bg-[#DDE3E2] font-bold text-xl rounded-xl transition cursor-pointer text-[#1B4D4A]"
              >
                +
              </button>
            </div>
          </div>

          <div className="pt-6 flex items-center justify-between border-t border-[#DDE3E2] font-sans">
            <button
              onClick={() => setStep(3)}
              className="px-4 py-2 bg-[#EDF1F0] hover:bg-[#DDE3E2] text-[#1B4D4A] font-bold text-xs rounded-xl transition cursor-pointer"
            >
              BACK
            </button>

            <button
              onClick={calculateAndShowResults}
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#1B4D4A] hover:bg-[#2E7D73] text-white font-bold text-xs rounded-xl transition cursor-pointer shadow-xs"
            >
              <Sparkles className="w-4 h-4 text-[#B2DFD8]" />
              <span>EVALUATE SCHEME ELIGIBILITY</span>
            </button>
          </div>
        </div>
      )}

      {/* STEP 5: RESULTS SCREEN */}
      {step === 5 && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 shadow-card border border-[#DDE3E2] space-y-4 font-sans">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[#DDE3E2] pb-4">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#2E7D73] text-white text-xs font-bold">
                  <CheckCircle2 className="w-4 h-4 text-[#B2DFD8]" />
                  <span>ELIGIBILITY EVALUATION COMPLETE</span>
                </div>
                <h2 className="text-xl font-black text-[#1B4D4A] mt-1 font-display">
                  {eligibleSchemes.length > 0
                    ? `${eligibleSchemes.length} Government Scheme(s) Matched`
                    : 'No Specific Scheme Matched'}
                </h2>
              </div>

              <button
                onClick={() => setStep(1)}
                className="px-3.5 py-2 bg-[#EDF1F0] hover:bg-[#DDE3E2] text-[#1B4D4A] font-bold text-xs rounded-xl transition cursor-pointer"
              >
                RE-CHECK PROFILE
              </button>
            </div>

            {/* LIST OF ELIGIBLE SCHEMES */}
            {eligibleSchemes.length > 0 ? (
              <div className="space-y-4 font-sans">
                {eligibleSchemes.map((scheme) => (
                  <div
                    key={scheme.schemeId}
                    className="bg-[#F4F7F6] rounded-2xl p-5 border border-[#DDE3E2] shadow-xs space-y-4 relative"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="inline-block px-2.5 py-0.5 rounded-lg bg-[#2E7D73] text-white text-[10px] font-bold uppercase tracking-wider mb-1">
                          Empanelled: {scheme.empanelmentType}
                        </span>
                        <h3 className="text-lg font-bold text-[#1B4D4A] font-display">
                          {getText(scheme.name)}
                        </h3>
                      </div>
                    </div>

                    <p className="text-xs text-[#1A2B2B] font-sans leading-relaxed">
                      {getText(scheme.description)}
                    </p>

                    {/* REASON FOR ELIGIBILITY */}
                    <div className="p-3 bg-white rounded-xl border border-[#DDE3E2] flex items-start gap-2 text-xs text-[#1A2B2B]">
                      <CheckCircle2 className="w-4 h-4 text-[#2E7D73] shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold uppercase text-[10px] text-[#1B4D4A] block font-display">
                          Qualification Reason:
                        </span>
                        <span className="font-sans">{getText(scheme.reasonForEligibility)}</span>
                      </div>
                    </div>

                    {/* BENEFITS BULLETS */}
                    <div className="space-y-2 pt-1 font-sans">
                      <span className="text-xs font-bold text-[#1B4D4A] block uppercase tracking-wider font-display">
                        Key Coverage Benefits:
                      </span>
                      <ul className="space-y-1.5">
                        {scheme.benefits.map((b, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-xs text-[#1A2B2B] font-medium">
                            <span className="w-1.5 h-1.5 bg-[#2E7D73] rounded-full shrink-0 mt-1.5" />
                            <span>{b[currentLang] || b.en}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* ACTION: VIEW HOSPITALS */}
                    <div className="pt-3 border-t border-[#DDE3E2] flex justify-end font-sans">
                      <button
                        onClick={() => onSelectSchemeEmpanelledHospitals(scheme.empanelmentType)}
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#1B4D4A] hover:bg-[#2E7D73] text-white font-bold text-xs rounded-xl transition cursor-pointer shadow-xs"
                      >
                        <Hospital className="w-4 h-4 text-white" />
                        <span>VIEW EMPANELLED HOSPITALS</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* NO SCHEMES MATCHED GUIDANCE */
              <div className="p-5 bg-[#F4F7F6] rounded-2xl border border-[#DDE3E2] space-y-4 text-center font-sans">
                <div className="w-12 h-12 rounded-xl bg-[#1B4D4A] text-white flex items-center justify-center mx-auto">
                  <Info className="w-6 h-6 text-[#B2DFD8]" />
                </div>
                <div>
                  <h3 className="font-bold text-[#1B4D4A] text-base font-display">
                    Universal Healthcare Guarantee
                  </h3>
                  <p className="text-xs text-[#5F6D6C] mt-1 max-w-md mx-auto leading-relaxed font-sans">
                    While no targeted insurance scheme matched this specific profile, all citizens are entitled to free OPD consultation, diagnostic tests, and essential medicines at public Government District Hospitals, CHCs, and PHCs.
                  </p>
                </div>

                <button
                  onClick={() => onSelectSchemeEmpanelledHospitals('all')}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#1B4D4A] hover:bg-[#2E7D73] text-white font-bold text-xs rounded-xl transition cursor-pointer shadow-xs"
                >
                  <Hospital className="w-4 h-4" />
                  <span>VIEW ALL NEARBY PUBLIC HOSPITALS</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ROSTER MODAL */}
      {showRosterModal && (
        <div className="fixed inset-0 z-50 bg-[#1A2B2B]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 max-w-md w-full max-h-[80vh] flex flex-col space-y-4 border border-[#DDE3E2] shadow-2xl font-sans">
            <div className="flex items-center justify-between border-b border-[#DDE3E2] pb-3">
              <h3 className="font-bold text-[#1B4D4A] text-sm uppercase font-display">SELECT PATIENT FROM EMR ROSTER</h3>
              <button
                onClick={() => setShowRosterModal(false)}
                className="text-[#5F6D6C] hover:text-[#1B4D4A] font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <div className="overflow-y-auto space-y-2 flex-1 pr-1 font-sans">
              {rosterPatients.length > 0 ? (
                rosterPatients.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => handleSelectRosterPatient(p)}
                    className="w-full text-left p-3 rounded-xl bg-[#F4F7F6] hover:bg-[#EDF1F0] border border-[#DDE3E2] transition cursor-pointer flex items-center justify-between"
                  >
                    <div>
                      <span className="font-bold text-[#1B4D4A] text-xs block font-display">{p.name}</span>
                      <span className="text-[11px] text-[#5F6D6C] font-mono">
                        {p.age} yrs • {p.gender} • {p.village || 'Sanand'}
                      </span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[#5F6D6C]" />
                  </button>
                ))
              ) : (
                <p className="text-xs text-[#5F6D6C] py-6 text-center italic">
                  No saved patients found in EMR roster yet.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
